import {TrainingReadError,type TrainingApi} from './training-api';
import type {GymAccess} from './gym-access';

export type TrainingSelection=
 |{domain:'sessions';query:string}
 |{domain:'profile'}
 |{domain:'progress'}
 |{domain:'detail';sessionId:string}
 |{domain:'timers';sessionId:string};
type Domain=TrainingSelection['domain'];
export type TrainingLoadedView={ [K in Domain]:Readonly<{domain:K;model:Awaited<ReturnType<TrainingApi[K]>>}> }[Domain];
export type TrainingViewSnapshot=Readonly<{phase:'idle'|'access'|'loading'|'ready'|'error';ownerKey:string|null;selectionKey:string;accessKind:GymAccess['kind']|'loading'|null;view:TrainingLoadedView|null;error:TrainingReadError['kind']|null}>;
const empty:TrainingViewSnapshot={phase:'idle',ownerKey:null,selectionKey:'',accessKind:null,view:null,error:null};
function key(selection:TrainingSelection){return JSON.stringify(selection.domain==='sessions'?[selection.domain,selection.query]:selection.domain==='detail'||selection.domain==='timers'?[selection.domain,selection.sessionId]:[selection.domain]);}
/** This guard runs during render before effects can update the subscription.
 * Identity is display isolation only; it never becomes an API identity header. */
export function selectTrainingViewSnapshot(snapshot:TrainingViewSnapshot,access:GymAccess|null,selection:TrainingSelection):TrainingViewSnapshot{
 if(access?.kind!=='ready')return {...empty,phase:'access',accessKind:access?.kind??'loading'};
 const selectionKey=key(selection);
 return snapshot.ownerKey===access.ownerKey&&snapshot.selectionKey===selectionKey?snapshot:{...empty,phase:'loading',ownerKey:access.ownerKey,selectionKey,accessKind:'ready'};
}
/** Original read client only. No command authority, cross-account cache,
 * automatic retries, provider writes or joining separate session responses. */
export function createTrainingView(api:TrainingApi){
 let snapshot=empty,epoch=0,pending:AbortController|null=null,disposed=false;
 const listeners=new Set<()=>void>();
 const publish=(next:TrainingViewSnapshot)=>{snapshot=next;for(const listener of [...listeners])listener();};
 const cancel=()=>{epoch++;pending?.abort();pending=null;};
 async function start(access:GymAccess|null,selection:TrainingSelection){
  if(disposed)return;
  cancel();const generation=epoch;
  if(access?.kind!=='ready'){publish({...empty,phase:'access',accessKind:access?.kind??'loading'});return;}
  const controller=new AbortController();pending=controller;
  const context={ownerKey:access.ownerKey,selectionKey:key(selection),accessKind:'ready' as const};
  publish({...empty,...context,phase:'loading'});
  if(disposed||generation!==epoch||controller.signal.aborted)return;
  try{
   const signal=controller.signal;
   const model=selection.domain==='sessions'?await api.sessions(new URLSearchParams(selection.query),signal):selection.domain==='profile'?await api.profile(signal):selection.domain==='progress'?await api.progress(signal):selection.domain==='detail'?await api.detail(selection.sessionId,signal):await api.timers(selection.sessionId,signal);
   if(disposed||generation!==epoch||signal.aborted)return;
   pending=null;publish({...empty,...context,phase:'ready',view:{domain:selection.domain,model} as TrainingLoadedView});
  }catch(error){
   if(disposed||generation!==epoch||controller.signal.aborted)return;
   pending=null;publish({...empty,...context,phase:'error',error:error instanceof TrainingReadError?error.kind:'UNAVAILABLE'});
  }
 }
 function clear(){if(disposed)return;cancel();publish(empty);}
 function dispose(){if(disposed)return;cancel();snapshot=empty;disposed=true;listeners.clear();}
 return {start,clear,dispose,getSnapshot:()=>snapshot,getServerSnapshot:()=>empty,subscribe:(listener:()=>void)=>{if(disposed)return()=>{};listeners.add(listener);return()=>{listeners.delete(listener);};}};
}
