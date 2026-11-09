import {HealthReadError,type HealthApi,type HealthDomain,type HealthResponse} from './health-api';
import type {GymAccess} from './gym-access';

export type HealthLoadedView={ [K in HealthDomain]:Readonly<{domain:K;model:HealthResponse<K>}> }[HealthDomain];
export type HealthViewSnapshot=Readonly<{
 phase:'idle'|'access'|'loading'|'ready'|'error';
 ownerKey:string|null;domain:HealthDomain|null;query:string;
 accessKind:GymAccess['kind']|'loading'|null;
 view:HealthLoadedView|null;error:HealthReadError['kind']|null;
}>;
const empty:HealthViewSnapshot={phase:'idle',ownerKey:null,domain:null,query:'',accessKind:null,view:null,error:null};
/** Render-time selection guard: a React effect may not have run yet when the
 * shared account or URL changes. Never return the old model for that render.
 * getSnapshot itself stays stable for useSyncExternalStore subscriptions.
 */
export function selectHealthViewSnapshot(snapshot:HealthViewSnapshot,access:GymAccess|null,domain:HealthDomain,params:URLSearchParams):HealthViewSnapshot{
 if(access?.kind!=='ready')return {...empty,phase:'access',accessKind:access?.kind??'loading'};
 const query=params.toString();
 if(snapshot.ownerKey===access.ownerKey&&snapshot.domain===domain&&snapshot.query===query)return snapshot;
 return {...empty,phase:'loading',ownerKey:access.ownerKey,domain,query,accessKind:'ready'};
}
/** Prepared display lifecycle, never an authorization source. GymAccess comes
 * from the existing global/native session reader. Its ownerKey is local display
 * isolation only and is never sent as an identity header or request parameter.
 * Each selection replaces the entire displayed snapshot: no cross-account,
 * source, range or tab cache; no automatic retry, merge or provider command.
 */
export function createHealthView(api:HealthApi){
 let state:HealthViewSnapshot=empty,epoch=0,pending:AbortController|null=null,disposed=false;
 const listeners=new Set<()=>void>();
 const publish=(next:HealthViewSnapshot)=>{state=next;for(const listener of [...listeners])listener();};
 const cancel=()=>{epoch++;pending?.abort();pending=null;};
 async function start(access:GymAccess|null,domain:HealthDomain,params:URLSearchParams){
  if(disposed)return;
  cancel();const generation=epoch;
  if(access?.kind!=='ready'){
   publish({...empty,phase:'access',accessKind:access?.kind??'loading'});return;
  }
  const query=new URLSearchParams(params),ownerKey=access.ownerKey,controller=new AbortController();pending=controller;
  const selection={ownerKey,domain,query:query.toString(),accessKind:'ready' as const};
  // Clear the previous model synchronously, before transport or any await.
  publish({...empty,...selection,phase:'loading'});
  if(disposed||generation!==epoch||controller.signal.aborted)return;
  try{
   const model=await api.read(domain,query,controller.signal);
   if(disposed||generation!==epoch||controller.signal.aborted)return;
   const view={domain,model} as HealthLoadedView; // Same selected domain supplied to the typed API above.
   pending=null;publish({...empty,...selection,phase:'ready',view});
  }catch(error){
   if(disposed||generation!==epoch||controller.signal.aborted)return;
   pending=null;publish({...empty,...selection,phase:'error',error:error instanceof HealthReadError?error.kind:'UNAVAILABLE'});
  }
 }
 function clear(){if(disposed)return;cancel();publish(empty);}
 function dispose(){if(disposed)return;cancel();state=empty;disposed=true;listeners.clear();}
 return {start,clear,dispose,getSnapshot:()=>state,getServerSnapshot:()=>empty,subscribe:(listener:()=>void)=>{if(disposed)return()=>{};listeners.add(listener);return()=>{listeners.delete(listener);};}};
}
