import {z} from 'zod';
import {trainingWriteRequest} from '../original-contracts/training-write-request';
import {createTrainingApi,type TrainingDetail,type TrainingTimers} from './training-api';
import type {GymAccess} from './gym-access';
import {workoutStateInput,workoutExerciseInput,workoutSetInput,workoutSetChangeInput,workoutTimerInput,workoutTimerChangeInput} from './workout-command-contracts';
const uuid=z.string().uuid(),version=z.union([z.number().int().positive().safe(),z.string().regex(/^[1-9][0-9]*$/)]);
const pendingSchema=z.object({sessionId:uuid,kind:z.enum(['session','exercise','set','timer']),recordId:uuid.nullable(),recordVersion:version.nullable(),verified:z.boolean(),state:z.string().nullable()}).strict();
type Pending=z.infer<typeof pendingSchema>;
export type WorkoutResult={state:'CONFIRMED'|'CONFLICT'|'UNCONFIRMED'|'INVALID'|'OFFLINE'|'SESSION'|'PERMISSION'|'BLOCKED'|'BUSY'|'RECOVERY_REQUIRED'|'OWNER_CHANGED'};
export type WorkoutReadback={detail:TrainingDetail;timers:TrainingTimers|null};
export type WorkoutPorts={access:()=>GymAccess|null;online:()=>boolean;send:typeof fetch;onAccessInvalidated:()=>void};
/** Original workout commands. Unknown writes survive remount/reload as a lock;
 * never infer a commit from a generic GET and never automatically replay. */
export function createWorkoutCommands(ports:WorkoutPorts){
 let busy=false;const memory=new Map<string,Pending>(),verifiedReadbacks=new Map<string,Pending>();
 const ownerMatches=(owner:string)=>{const a=ports.access();return a?.kind==='ready'&&a.ownerKey===owner;};
 const key=(owner:string)=>'crays.gym.workout.recovery.v1:'+encodeURIComponent(owner);
 function pending(owner:string):Pending|null{if(memory.has(owner))return memory.get(owner)!;if(typeof window==='undefined')return null;try{const raw=window.sessionStorage.getItem(key(owner));if(raw===null)return null;const p=pendingSchema.safeParse(JSON.parse(raw));if(!p.success)return null;memory.set(owner,p.data);return p.data;}catch{return null;}}
 function locked(owner:string){if(memory.has(owner))return true;if(typeof window==='undefined')return false;try{return window.sessionStorage.getItem(key(owner))!==null;}catch{return true;}}
 function store(owner:string,p:Pending){verifiedReadbacks.delete(owner);if(typeof window!=='undefined'){try{window.sessionStorage.setItem(key(owner),JSON.stringify(p));}catch{return false;}}memory.set(owner,p);return true;}
 function clear(owner:string){if(typeof window!=='undefined'){try{window.sessionStorage.removeItem(key(owner));}catch{return false;}}memory.delete(owner);verifiedReadbacks.delete(owner);return true;}
 function acknowledge(owner:string,sessionId:string){const p=pending(owner);return ownerMatches(owner)&&p?.sessionId===sessionId&&verifiedReadbacks.get(owner)===p?clear(owner):false;}
 async function execute(owner:string,sessionId:string,kind:Pending['kind'],suffix:string,input:unknown,schema:z.ZodType,contract:string,receiptKey:string,receiptSchema:z.ZodType,match:(r:Record<string,unknown>,input:Record<string,unknown>)=>boolean,recordId:string|null=null):Promise<WorkoutResult>{
  if(!ownerMatches(owner))return{state:'OWNER_CHANGED'};if(busy)return{state:'BUSY'};if(locked(owner))return{state:'RECOVERY_REQUIRED'};
  const parsed=schema.safeParse(input);if(!uuid.safeParse(sessionId).success||!parsed.success||recordId!==null&&!uuid.safeParse(recordId).success)return{state:'INVALID'};
  if(!ports.online())return{state:'OFFLINE'};
  const body=JSON.stringify(parsed.data),entry:Pending={sessionId,kind,recordId,recordVersion:null,verified:false,state:null};
  if(!store(owner,entry))return{state:'BLOCKED'};busy=true;
  try{
   let dispatched=false;
   const result=await trainingWriteRequest((url,options)=>{if(!ownerMatches(owner))throw Error('OWNER_CHANGED');dispatched=true;return ports.send(url,{...options,credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'content-type':'application/json'}});},'/api/crays/member/train/sessions/'+encodeURIComponent(sessionId)+'/'+suffix,{method:kind==='session'||recordId!==null?'PATCH':'POST',body},true);
   if(!ownerMatches(owner)){if(!dispatched)clear(owner);return{state:'OWNER_CHANGED'};}
   if(result.p.state==='UNCONFIRMED'||result.r.status>=500)return{state:'UNCONFIRMED'};
   if(result.r.status===401){clear(owner);ports.onAccessInvalidated();return{state:'SESSION'};}
   if(result.r.status===403){clear(owner);return{state:'PERMISSION'};}
   // Original 400/409/423 handlers are transaction rollbacks. Reload the live
   // session before another attempt; no write is retried here.
   if([400,409,423].includes(result.r.status)){clear(owner);return{state:result.r.status===400?'INVALID':result.r.status===409?'CONFLICT':'BLOCKED'};}
   if(!result.r.ok)return{state:'UNCONFIRMED'};
   const envelope=z.object({contract:z.literal(contract),state:z.literal('READY'),[receiptKey]:receiptSchema}).passthrough().safeParse(result.p);
   const receipt=envelope.success?envelope.data[receiptKey]as Record<string,unknown>:null;
   if(!receipt||!match(receipt,parsed.data as Record<string,unknown>))return{state:'UNCONFIRMED'};
   const id=receipt[kind==='exercise'?'sessionExerciseId':kind==='set'?'setId':kind==='timer'?'timerId':'sessionId'];
   const recordVersion=receipt[kind==='set'?'setVersion':kind==='timer'?'timerVersion':'sessionVersion'];
   if(typeof id!=='string'||!uuid.safeParse(id).success)return{state:'UNCONFIRMED'};
   if(!store(owner,{...entry,recordId:id,recordVersion:kind==='exercise'?null:version.parse(recordVersion),verified:true,state:typeof receipt.state==='string'?receipt.state:null}))return{state:'UNCONFIRMED'};
   return{state:'CONFIRMED'};
  }catch{return{state:'UNCONFIRMED'};}finally{busy=false;}
 }
 async function reconcile(owner:string,sessionId:string,signal:AbortSignal):Promise<WorkoutReadback>{
  const p=pending(owner);if(!ownerMatches(owner)||!p?.verified||!p.recordId||p.sessionId!==sessionId)throw Error('UNKNOWN_OUTCOME_REQUIRES_RECONCILIATION');
  signal.throwIfAborted();const api=createTrainingApi(ports.onAccessInvalidated,ports.send),detail=await api.detail(p.sessionId,signal);
  if(detail.state!=='READY'||!ownerMatches(owner)||pending(owner)!==p)throw Error('WORKOUT_READBACK_NOT_CURRENT');
  let timers:TrainingTimers|null=null;
  const row=p.kind==='session'?detail.session:p.kind==='exercise'?detail.exercises.find(x=>x.sessionExerciseId===p.recordId):p.kind==='set'?detail.sets.find(x=>x.setId===p.recordId):null;
  let actual:Record<string,unknown>|null=row as Record<string,unknown>|null;
  if(p.kind==='timer'){timers=await api.timers(p.sessionId,signal);actual=timers.timers.find(x=>x.timerId===p.recordId)as Record<string,unknown>??null;}
  signal.throwIfAborted();if(!ownerMatches(owner)||pending(owner)!==p||!actual)throw Error('WORKOUT_READBACK_NOT_CURRENT');
  const actualVersion=actual[p.kind==='set'?'setVersion':p.kind==='timer'?'timerVersion':'sessionVersion'];
  if(p.recordVersion!==null&&(!version.safeParse(actualVersion).success||BigInt(actualVersion as string|number)<BigInt(p.recordVersion)))throw Error('WORKOUT_READBACK_STALE');
  if(p.state!==null&&actual.state!==p.state)throw Error('WORKOUT_CHANGED_ELSEWHERE');
  verifiedReadbacks.set(owner,p);return{detail,timers};
 }
 const sessionReceipt=z.object({sessionId:uuid,state:z.enum(['ACTIVE','PAUSED','ABORTED','COMPLETED']),sessionVersion:version}).passthrough();
 const setReceipt=z.object({setId:uuid,setVersion:version}).passthrough();
 const timerReceipt=z.object({timerId:uuid,timerVersion:version,state:z.enum(['RUNNING','PAUSED','COMPLETED','CANCELLED']),durationSeconds:z.number().int().min(1).max(3600),notificationRequested:z.boolean()}).passthrough();
 const stateTarget={PAUSE:'PAUSED',RESUME:'ACTIVE',ABORT:'ABORTED',COMPLETE:'COMPLETED'};
 const incrementMatches=(actual:unknown,expected:unknown)=>version.safeParse(actual).success&&typeof expected==='number'&&BigInt(actual as string|number)===BigInt(expected)+1n;
 return{pendingSessionId:(owner:string)=>ownerMatches(owner)?pending(owner)?.sessionId??null:null,isLocked:locked,isBusy:()=>busy,acknowledgeReadback:acknowledge,reconcileReadback:reconcile,
  transition:(o:string,s:string,input:unknown)=>execute(o,s,'session','state',input,workoutStateInput,'crays.train-workout-session-state.v1','session',sessionReceipt,(r,x)=>r.sessionId===s&&r.state===stateTarget[x.action as keyof typeof stateTarget]&&incrementMatches(r.sessionVersion,x.expectedVersion),s),
  addExercise:(o:string,s:string,input:unknown)=>execute(o,s,'exercise','exercises',input,workoutExerciseInput,'crays.train-session-exercise.v1','exercise',z.object({sessionExerciseId:uuid,craysExerciseId:uuid,position:z.number().int().positive()}).passthrough(),(r,x)=>r.craysExerciseId===x.craysExerciseId&&r.position===x.position),
  addSet:(o:string,s:string,input:unknown)=>execute(o,s,'set','sets',input,workoutSetInput,'crays.train-set-log.v1','set',setReceipt.extend({setType:z.string(),position:z.number().int().positive()}),(r,x)=>r.setType===x.setType&&r.position===x.position&&BigInt(r.setVersion as string|number)===1n),
  changeSet:(o:string,s:string,id:string,input:unknown)=>execute(o,s,'set','sets/'+encodeURIComponent(id),input,workoutSetChangeInput,'crays.train-set-log.v1','set',setReceipt.extend({state:z.enum(['ACTIVE','DELETED'])}),(r,x)=>r.setId===id&&r.state===(x.action==='DELETE'?'DELETED':'ACTIVE')&&incrementMatches(r.setVersion,x.expectedVersion),id),
  startTimer:(o:string,s:string,input:unknown)=>execute(o,s,'timer','timers',input,workoutTimerInput,'crays.train-rest-timer.v1','timer',timerReceipt,(r,x)=>r.state==='RUNNING'&&r.durationSeconds===x.durationSeconds&&BigInt(r.timerVersion as string|number)===1n),
  changeTimer:(o:string,s:string,id:string,input:unknown)=>execute(o,s,'timer','timers/'+encodeURIComponent(id),input,workoutTimerChangeInput,'crays.train-rest-timer.v1','timer',timerReceipt,(r,x)=>r.timerId===id&&r.state===({PAUSE:'PAUSED',RESUME:'RUNNING',COMPLETE:'COMPLETED',CANCEL:'CANCELLED'}[x.action as 'PAUSE'|'RESUME'|'COMPLETE'|'CANCEL'])&&incrementMatches(r.timerVersion,x.expectedVersion),id),
 };
}
