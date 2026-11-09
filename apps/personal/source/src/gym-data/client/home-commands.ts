import {z} from 'zod';
import {createTrainingHomeCommands,originalReadinessInput,originalFreeWorkoutInput,type HomeCommandPorts} from './original-home-commands';
import {createTrainingApi,type TrainingDetail,type TrainingSessions} from './training-api';
import {createPlanningApi,type PlanningResponse} from './planning-api';

const uuid=z.string().uuid();
const pendingSchema=z.object({kind:z.enum(['start','save','withdraw']),recordId:uuid.nullable(),verified:z.boolean(),conflict:z.boolean().default(false),targetState:z.enum(['ACTIVE','PAUSED','COMPLETED','ABORTED','WITHDRAWN']).nullable()}).strict();
type Pending=z.infer<typeof pendingSchema>;
export type HomeResult={state:'CONFIRMED'|'CONFLICT'|'OFFLINE'|'INVALID'|'SESSION'|'PERMISSION'|'OWNER_CHANGED'|'BLOCKED'|'UNCONFIRMED'|'BUSY'|'RECOVERY_REQUIRED'};
export type HomeReadback={kind:'sessions';models:TrainingSessions[]}|{kind:'session';detail:TrainingDetail}|{kind:'readiness';model:PlanningResponse<'readiness'>;recordId:string};

/** Restore original Home commands without losing ambiguous-write protection
 * on unmount/reload. Storage contains minimal receipt metadata, never answers,
 * notes, tokens, request bodies or reusable idempotency keys. */
export function createHomeCommands(ports:HomeCommandPorts){
 const original=createTrainingHomeCommands(ports);
 const memory=new Map<string,Pending>(),verifiedReadbacks=new Map<string,Pending>();
 let busy=false;
 const sameOwner=(owner:string)=>{const a=ports.access();return a?.kind==='ready'&&a.ownerKey===owner;};
 const key=(owner:string)=>'crays.gym.home.recovery.v1:'+encodeURIComponent(owner);
 function pending(owner:string):Pending|null{
  if(memory.has(owner))return memory.get(owner)!;
  if(typeof window==='undefined')return null;
  try{const raw=window.sessionStorage.getItem(key(owner));if(raw===null)return null;const parsed=pendingSchema.safeParse(JSON.parse(raw));if(!parsed.success)return null;memory.set(owner,parsed.data);return parsed.data;}catch{return null;}
 }
 function locked(owner:string){if(memory.has(owner))return true;if(typeof window==='undefined')return false;try{return window.sessionStorage.getItem(key(owner))!==null;}catch{return true;}}
 function store(owner:string,value:Pending){verifiedReadbacks.delete(owner);if(typeof window!=='undefined'){try{window.sessionStorage.setItem(key(owner),JSON.stringify(value));}catch{return false;}}memory.set(owner,value);return true;}
 function clear(owner:string){if(typeof window!=='undefined'){try{window.sessionStorage.removeItem(key(owner));}catch{return false;}}memory.delete(owner);verifiedReadbacks.delete(owner);return true;}
 async function execute(owner:string,entry:Pending,task:()=>Promise<{state:string;receipt?:unknown}>):Promise<HomeResult>{
  if(!sameOwner(owner))return{state:'OWNER_CHANGED'};
  if(busy)return{state:'BUSY'};
  if(locked(owner))return{state:'RECOVERY_REQUIRED'};
  if(!ports.online())return{state:'OFFLINE'};
  if(!store(owner,entry))return{state:'BLOCKED'};
  busy=true;
  try{
   const result=await task();
   if(!sameOwner(owner))return{state:'OWNER_CHANGED'};
   if(result.state==='CONFIRMED'){
    const receipt=result.receipt as {session?:{sessionId:string;state:Pending['targetState']};report?:{readinessId:string;state:Pending['targetState']}};
    const recordId=entry.kind==='start'?receipt.session?.sessionId:receipt.report?.readinessId;
    const targetState=entry.kind==='start'?receipt.session?.state:receipt.report?.state;
    if(!recordId||!uuid.safeParse(recordId).success||!targetState)return{state:'UNCONFIRMED'};
    if(!store(owner,{...entry,recordId,targetState,verified:true}))return{state:'UNCONFIRMED'};
    return{state:'CONFIRMED'};
   }
   // The original handlers return these before committing a successful write.
   // A conflict requires a fresh original read in the UI, never write replay.
   if(result.state==='CONFLICT'){
    if(entry.kind==='save')return{state:'UNCONFIRMED'};
    if(!store(owner,{...entry,conflict:true,verified:true}))return{state:'UNCONFIRMED'};
    return{state:'CONFLICT'};
   }
   if(['INVALID','OFFLINE','SESSION','PERMISSION','BLOCKED'].includes(result.state)){
    if(!clear(owner))return{state:'UNCONFIRMED'};
    return{state:result.state as HomeResult['state']};
   }
   return{state:result.state==='OWNER_CHANGED'?'OWNER_CHANGED':'UNCONFIRMED'};
  }catch{return{state:'UNCONFIRMED'};}finally{busy=false;}
 }
 async function reconcileReadback(owner:string,signal:AbortSignal):Promise<HomeReadback>{
  const p=pending(owner);
  if(!sameOwner(owner)||!p?.verified||(!p.recordId&&!p.conflict))throw Error('UNKNOWN_HOME_OUTCOME');
  signal.throwIfAborted();let readback:HomeReadback;
  if(p.kind==='start'&&p.conflict){
   const api=createTrainingApi(ports.onAccessInvalidated,ports.send),models=[];
   for(const state of ['ACTIVE','PAUSED']){signal.throwIfAborted();models.push(await api.sessions(new URLSearchParams({state,take:'100'}),signal));}
   readback={kind:'sessions',models};
  }else if(p.kind==='start'){
   if(!p.recordId)throw Error('MISSING_ORIGINAL_SESSION_ID');
   const detail=await createTrainingApi(ports.onAccessInvalidated,ports.send).detail(p.recordId,signal);
   if(detail.state!=='READY'||detail.session.sessionId!==p.recordId||detail.session.sourceKind!=='FREE'||detail.session.state!==p.targetState)throw Error('HOME_SESSION_READBACK_MISMATCH');
   readback={kind:'session',detail};
  }else{
   const model=await createPlanningApi(ports.onAccessInvalidated,ports.send).read('readiness',new URLSearchParams(),signal);
   const report=model.reports.find(row=>row.readinessId===p.recordId);
   if(!report||!p.conflict&&report.state!==p.targetState||p.kind==='withdraw'&&report.state==='WITHDRAWN'&&(report.voluntaryNotes!==''||report.withdrawnAt===null))throw Error('READINESS_READBACK_MISMATCH');
   readback={kind:'readiness',model,recordId:report.readinessId};
  }
  signal.throwIfAborted();if(!sameOwner(owner)||pending(owner)!==p)throw Error('HOME_READBACK_OWNER_CHANGED');
  verifiedReadbacks.set(owner,p);return readback;
 }
 return{isBusy:()=>busy,isLocked:locked,pendingKind:(owner:string)=>pending(owner)?.kind??null,reconcileReadback,
  acknowledgeReadback(owner:string){const p=pending(owner);return sameOwner(owner)&&p!==null&&verifiedReadbacks.get(owner)===p?clear(owner):false;},
  saveReadiness(owner:string,input:unknown){const value=originalReadinessInput.safeParse(input);return value.success?execute(owner,{kind:'save',recordId:null,verified:false,conflict:false,targetState:null},()=>original.saveReadiness(owner,value.data)):Promise.resolve<HomeResult>({state:'INVALID'});},
  withdrawReadiness(owner:string,recordId:string){return uuid.safeParse(recordId).success?execute(owner,{kind:'withdraw',recordId,verified:false,conflict:false,targetState:null},()=>original.withdrawReadiness(owner,recordId)):Promise.resolve<HomeResult>({state:'INVALID'});},
  startFreeWorkout(owner:string,input:unknown){const value=originalFreeWorkoutInput.safeParse(input);return value.success?execute(owner,{kind:'start',recordId:null,verified:false,conflict:false,targetState:null},()=>original.startFreeWorkout(owner,value.data)):Promise.resolve<HomeResult>({state:'INVALID'});},
 };
}
