import {z} from 'zod';
import {trainingWriteRequest} from '../original-contracts/training-write-request';
import type {GymAccess} from './gym-access';
const uuid=z.string().uuid(),timestamp=z.string().datetime({offset:true});
const version=z.union([z.string().regex(/^[1-9][0-9]*$/),z.number().int().positive().safe()]);
const timezone=z.string().min(1).max(100).refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value}).format(0);return true;}catch{return false;}});
const score=z.number().int().min(1).max(5).nullable();
export const originalReadinessInput=z.object({localDate:z.string().date(),timezone,sleepFeeling:score,stress:score,painOrDiscomfort:score,motivation:score,voluntaryNotes:z.string().max(2000)}).strict().refine(value=>[value.sleepFeeling,value.stress,value.painOrDiscomfort,value.motivation].some(value=>value!==null));
export const originalFreeWorkoutInput=z.object({idempotencyKey:z.string().min(8).max(160),timezone,readinessSnapshotId:uuid.nullable(),notes:z.string().max(2000)}).strict();
const savedReadiness=z.object({contract:z.literal('crays.train-readiness-self-report.v1'),state:z.literal('READY'),report:z.object({readinessId:uuid,state:z.literal('ACTIVE'),createdAt:timestamp}).passthrough()}).passthrough();
const withdrawnReadiness=z.object({contract:z.literal('crays.train-readiness-self-report.v1'),state:z.literal('READY'),report:z.object({readinessId:uuid,state:z.literal('WITHDRAWN'),withdrawnAt:timestamp}).passthrough()}).passthrough();
const startedWorkout=z.object({contract:z.literal('crays.train-workout-session.v1'),state:z.literal('READY'),session:z.object({sessionId:uuid,state:z.enum(['ACTIVE','PAUSED','COMPLETED','ABORTED']),sessionVersion:version,sourceKind:z.literal('FREE'),sourceId:z.null(),sourceVersion:z.null()}).passthrough()}).passthrough();
export type HomeCommandResult<T> =
 |{state:'CONFIRMED';receipt:T;readbackRequired:true}
 |{state:'CONFLICT';readbackRequired:true}
 |{state:'OFFLINE'|'INVALID'|'SESSION'|'PERMISSION'|'OWNER_CHANGED'|'BLOCKED';readbackRequired:boolean}
 |{state:'UNCONFIRMED';readbackRequired:true};
export type HomeCommandPorts={access:()=>GymAccess|null;online:()=>boolean;send:typeof fetch;onAccessInvalidated:()=>void};
/** Original commands only, prepared separately from the read-only live mount.
 * This client supplies no identity header and grants no server write rights.
 * Each explicit call attempts the original command at most once. The caller
 * must retain a recovery lock for UNCONFIRMED/CONFLICT, perform authoritative
 * readback and obtain an explicit user decision before any further mutation.
 * No optimistic records, offline queue, retries or replacement idempotency key.
 */
export function createTrainingHomeCommands(ports:HomeCommandPorts){
 const sameOwner=(owner:string)=>{const access=ports.access();return access?.kind==='ready'&&access.ownerKey===owner;};
 async function execute<T>(owner:string,path:string,init:RequestInit,schema:z.ZodType<T>,matches:(receipt:T)=>boolean=()=>true):Promise<HomeCommandResult<T>>{
  if(!sameOwner(owner))return {state:'OWNER_CHANGED',readbackRequired:false};
  const result=await trainingWriteRequest((url,options)=>{
   // Recheck immediately before dispatch; owner keys are never sent as auth.
   if(!sameOwner(owner))throw new Error('OWNER_CHANGED_BEFORE_SEND');
   return ports.send(url,{...options,credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'content-type':'application/json'}});
  },'/api/crays/member/train/'+path,init,ports.online());
  if(!sameOwner(owner))return {state:'OWNER_CHANGED',readbackRequired:true};
  if(result.p.state==='OFFLINE')return {state:'OFFLINE',readbackRequired:false};
  if(result.p.state==='UNCONFIRMED')return {state:'UNCONFIRMED',readbackRequired:true};
  if(result.r.status===401){ports.onAccessInvalidated();return {state:'SESSION',readbackRequired:false};}
  if(result.r.status===403)return {state:'PERMISSION',readbackRequired:false};
  if(result.r.status===400)return {state:'INVALID',readbackRequired:false};
  if(result.r.status===409)return {state:'CONFLICT',readbackRequired:true};
  if(result.r.status===423)return {state:'BLOCKED',readbackRequired:false};
  if(!result.r.ok)return {state:'UNCONFIRMED',readbackRequired:true};
  const parsed=schema.safeParse(result.p);
  if(!parsed.success||!matches(parsed.data))return {state:'UNCONFIRMED',readbackRequired:true};
  return {state:'CONFIRMED',receipt:parsed.data,readbackRequired:true};
 }
 return {
  saveReadiness(owner:string,input:unknown){const value=originalReadinessInput.safeParse(input);if(!value.success)return Promise.resolve<HomeCommandResult<z.infer<typeof savedReadiness>>>({state:'INVALID',readbackRequired:false});return execute(owner,'readiness',{method:'POST',body:JSON.stringify(value.data)},savedReadiness);},
  withdrawReadiness(owner:string,readinessId:string){if(!uuid.safeParse(readinessId).success)return Promise.resolve<HomeCommandResult<z.infer<typeof withdrawnReadiness>>>({state:'INVALID',readbackRequired:false});return execute(owner,'readiness/'+encodeURIComponent(readinessId),{method:'DELETE'},withdrawnReadiness,receipt=>receipt.report.readinessId.toLowerCase()===readinessId.toLowerCase());},
  startFreeWorkout(owner:string,input:unknown){const value=originalFreeWorkoutInput.safeParse(input);if(!value.success)return Promise.resolve<HomeCommandResult<z.infer<typeof startedWorkout>>>({state:'INVALID',readbackRequired:false});return execute(owner,'sessions',{method:'POST',body:JSON.stringify({...value.data,sourceKind:'FREE',sourceId:null,sourceVersion:null})},startedWorkout);},
 };
}
