import {restTimerListResponse} from '../original-contracts/rest-timer-response';
import {z} from 'zod';
// Original PostgreSQL bigint versions remain decimal strings when sent that way.
// Never coerce them to an unsafe JS number or rewrite an original record ID.
const version=z.union([z.string().regex(/^[1-9][0-9]*$/),z.number().int().positive().safe()]);
const uuid=z.string().uuid(),timestamp=z.string().datetime({offset:true});
const metric=z.number().finite().nonnegative().nullable();
const timezone=z.string().min(1).refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value}).format(0);return true;}catch{return false;}});
export const trainingSessionSchema=z.object({sessionId:uuid,sourceKind:z.enum(['PLAN','TEMPLATE','FREE']),sourceId:uuid.nullable(),sourceVersion:version.nullable(),state:z.enum(['ACTIVE','PAUSED','ABORTED','COMPLETED']),sessionVersion:version,startedAt:timestamp,pausedAt:timestamp.nullable(),completedAt:timestamp.nullable(),abortedAt:timestamp.nullable(),timezone,notes:z.string()});
const filters=z.object({state:z.enum(['ACTIVE','PAUSED','ABORTED','COMPLETED']).optional(),from:z.string().date().optional(),to:z.string().date().optional(),take:z.number().int().min(1).max(100)});
export const trainingSessionsSchema=z.object({contract:z.literal('crays.train-workout-sessions.v2'),state:z.enum(['READY','EMPTY']),sessions:z.array(trainingSessionSchema),filters}).refine(value=>(value.state==='READY')===(value.sessions.length>0));
const exercise=z.object({sessionExerciseId:uuid,craysExerciseId:uuid,position:z.number().int().positive(),originKind:z.enum(['PLAN','TEMPLATE','FREE','SUBSTITUTION']),notes:z.string(),name:z.string(),catalogueState:z.string()});
const set=z.object({setId:uuid,sessionExerciseId:uuid,setType:z.enum(['STRAIGHT','WARMUP','DROP','SUPERSET','GIANT_SET','AMRAP','EMOM','TIME']),position:z.number().int().positive(),loadKg:metric,reps:z.number().int().nonnegative().nullable(),rir:metric,rpe:metric,durationSeconds:metric,distanceMeters:metric,tempo:z.string().nullable(),notes:z.string(),state:z.enum(['ACTIVE','DELETED']),setVersion:version,performedAt:timestamp,deletedAt:timestamp.nullable(),deleteReason:z.string().nullable()});
const personalRecord=z.object({craysExerciseId:uuid,name:z.string().nullable(),loadPr:z.boolean().nullable(),loadKg:metric,repsPr:z.boolean().nullable(),reps:z.number().int().nonnegative().nullable()});
const fulfillment=z.discriminatedUnion('state',[z.object({state:z.literal('UNKNOWN'),reason:z.string()}),z.object({state:z.literal('VALUE'),targetSets:z.number().int().positive(),completedSets:z.number().int().nonnegative(),ratio:z.number().finite().min(0).max(1)})]);
export const trainingDetailSchema=z.object({contract:z.literal('crays.train-workout-session-detail.v2'),state:z.literal('READY'),session:trainingSessionSchema,exercises:z.array(exercise),sets:z.array(set),summary:z.object({exerciseCount:z.number().int().nonnegative(),setCount:z.number().int().nonnegative(),volumeKg:z.number().finite().nonnegative(),averageRpe:metric,averageRir:metric,durationSeconds:z.number().int().nonnegative(),personalRecords:z.array(personalRecord),planFulfillment:fulfillment,authority:z.literal('CRAYS_MEMBER_LOG'),wearableSets:z.literal('PROHIBITED')})}).refine(value=>{
 const ids=new Set(value.exercises.map(item=>item.sessionExerciseId));
 return ids.size===value.exercises.length&&value.sets.every(item=>ids.has(item.sessionExerciseId));
});
export const trainingProgressSchema=z.object({contract:z.literal('crays.train-progress.v1'),state:z.enum(['READY','EMPTY']),records:z.array(z.object({craysExerciseId:uuid,name:z.string(),maxLoadKg:metric,maxReps:z.number().int().nonnegative().nullable(),maxSetVolumeKg:metric,setCount:z.number().int().nonnegative(),lastPerformedAt:timestamp})),history:z.array(z.object({sessionId:uuid,startedAt:timestamp,completedAt:timestamp,timezone,exerciseCount:z.number().int().nonnegative(),setCount:z.number().int().nonnegative(),volumeKg:metric})),authority:z.literal('CRAYS_MEMBER_LOG'),wearableSets:z.literal('PROHIBITED')});
export const trainingProfileSchema=z.object({contract:z.literal('crays.train-member-profile.v1'),state:z.enum(['READY','EMPTY']),profile:z.object({goals:z.array(z.string()),experience:z.enum(['BEGINNER','INTERMEDIATE','ADVANCED','UNKNOWN']),availableDays:z.array(z.number().int().min(1).max(7)),minutesPerSession:z.number().int().positive().nullable(),equipment:z.array(z.string()),preferences:z.record(z.string(),z.json()),voluntaryLimitations:z.record(z.string(),z.json()),units:z.enum(['METRIC','IMPERIAL']),timezone,profileVersion:version,updatedAt:timestamp}).nullable()}).refine(value=>(value.state==='READY')===(value.profile!==null));
export type TrainingTimers=z.infer<typeof restTimerListResponse>;
export type TrainingSessions=z.infer<typeof trainingSessionsSchema>;
export type TrainingDetail=z.infer<typeof trainingDetailSchema>;
export type TrainingProgress=z.infer<typeof trainingProgressSchema>;
export type TrainingProfile=z.infer<typeof trainingProfileSchema>;
export class TrainingReadError extends Error{constructor(public readonly kind:'SESSION'|'PERMISSION'|'INVALID'|'UNAVAILABLE'){super(kind);}}
export type TrainingApi={timers(sessionId:string,signal:AbortSignal):Promise<TrainingTimers>;sessions(params:URLSearchParams,signal:AbortSignal):Promise<TrainingSessions>;detail(sessionId:string,signal:AbortSignal):Promise<TrainingDetail|{state:'NOT_FOUND'}>;progress(signal:AbortSignal):Promise<TrainingProgress>;profile(signal:AbortSignal):Promise<TrainingProfile>};
export function createTrainingApi(onAccessInvalidated:()=>void,transport:typeof fetch=fetch):TrainingApi{
 async function request(path:string,signal:AbortSignal,allowNotFound=false){
  signal.throwIfAborted();
  const response=await transport('/api/crays/member/train/'+path,{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal});
  signal.throwIfAborted();
  if(response.status===401){if(!signal.aborted)onAccessInvalidated();throw new TrainingReadError('SESSION');}
  if(response.status===403){const body=await response.clone().json().catch(()=>null)as{reason?:unknown}|null;signal.throwIfAborted();const required=typeof body?.reason==='string'&&/\b(sign in|log in|verified own-member session|required member session)\b/i.test(body.reason);if(required&&!signal.aborted)onAccessInvalidated();throw new TrainingReadError(required?'SESSION':'PERMISSION');}
  if(response.status===400)throw new TrainingReadError('INVALID');
  if(!response.ok&&!(allowNotFound&&response.status===404))throw new TrainingReadError('UNAVAILABLE');return response;
 }
 async function readJson(response:Response,signal:AbortSignal){const value:unknown=await response.json();signal.throwIfAborted();return value;}
 async function read<T>(path:string,signal:AbortSignal,schema:z.ZodType<T>){try{const value=await readJson(await request(path,signal),signal),parsed=schema.parse(value);signal.throwIfAborted();return parsed;}catch(error){if(error instanceof TrainingReadError||signal.aborted)throw error;throw new TrainingReadError('UNAVAILABLE');}}
 return {
  timers:(id,signal)=>{if(!uuid.safeParse(id).success)return Promise.reject(new TrainingReadError('INVALID'));return read('sessions/'+encodeURIComponent(id)+'/timers',signal,restTimerListResponse);},
  sessions:(params,signal)=>read('sessions?'+params,signal,trainingSessionsSchema),
  progress:signal=>read('progress',signal,trainingProgressSchema),
  profile:signal=>read('profile',signal,trainingProfileSchema),
  async detail(sessionId,signal){
   if(!uuid.safeParse(sessionId).success)throw new TrainingReadError('INVALID');
   try{const response=await request('sessions/'+encodeURIComponent(sessionId),signal,true);if(response.status===404)return z.object({state:z.literal('NOT_FOUND')}).parse(await readJson(response,signal));const result=trainingDetailSchema.parse(await readJson(response,signal));signal.throwIfAborted();if(result.session.sessionId.toLowerCase()!==sessionId.toLowerCase())throw new TrainingReadError('UNAVAILABLE');return result;}
   catch(error){if(error instanceof TrainingReadError||signal.aborted)throw error;throw new TrainingReadError('UNAVAILABLE');}
  },
 };
}
