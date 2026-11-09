import type {ExerciseSearchReadModel} from '../original-contracts/exercise-catalog-contract';
import {ExerciseReadError,type ExerciseApi} from './exercise-api';
export type ExerciseFilters={query:string;muscle:string;equipment:string;movement:string;goal:string;level:string;limitation:string;media:'ANY'|'EXACT'|'NONE'};
export const emptyExerciseFilters:ExerciseFilters={query:'',muscle:'',equipment:'',movement:'',goal:'',level:'',limitation:'',media:'ANY'};
export function exerciseParams(filters:ExerciseFilters,cursor?:string|null){
 const p=new URLSearchParams({take:'24',media:filters.media});
 for(const [key,value]of Object.entries(filters))if(key!=='media'&&value.trim()&&(key!=='query'||value.trim().length>=2))p.set(key==='query'?'q':key,value.trim());
 if(cursor)p.set('cursor',cursor);return p;
}
export function exerciseFiltersFromQuery(query:string):ExerciseFilters{
 const p=new URLSearchParams(query),result={...emptyExerciseFilters};
 for(const key of Object.keys(result)as (keyof ExerciseFilters)[]){const value=p.get(key==='query'?'q':key);if(value!==null)Object.assign(result,{[key]:value});}
 if(!['ANY','EXACT','NONE'].includes(result.media))result.media='ANY';return result;
}
export type CatalogueState={ownerKey:string;filters:ExerciseFilters;phase:'idle'|'loading'|'ready'|'typing'|'error';model:ExerciseSearchReadModel|null;pages:readonly ExerciseSearchReadModel[];pageError:'SESSION'|'PERMISSION'|'CURSOR'|'UNAVAILABLE'|null;loadingMore:boolean;availableLimitations:readonly string[]};
const blank:CatalogueState={ownerKey:'',filters:emptyExerciseFilters,phase:'idle',model:null,pages:[],pageError:null,loadingMore:false,availableLimitations:[]};
function filterKey(filters:ExerciseFilters){return JSON.stringify([filters.query,filters.muscle,filters.equipment,filters.movement,filters.goal,filters.level,filters.limitation,filters.media]);}
/** Apply after the stable subscription snapshot, before React effects. */
export function selectExerciseCatalogueSnapshot(snapshot:CatalogueState,ownerKey:string,filters:ExerciseFilters):CatalogueState{
 if(!ownerKey)return {...blank,filters:{...filters}};
 if(snapshot.ownerKey===ownerKey&&filterKey(snapshot.filters)===filterKey(filters))return snapshot;
 return {...blank,ownerKey,filters:{...filters},phase:filters.query.trim().length===1?'typing':'loading'};
}
/** Original pages retain their own response/publication receipt. Never relabel
 * earlier pages with the receipt or cursor of a later response. */
export function createExerciseCatalogue(api:ExerciseApi){
 let state:CatalogueState=blank,epoch=0,disposed=false,pending:AbortController|null=null,more:AbortController|null=null,timer:ReturnType<typeof setTimeout>|null=null;
 const listeners=new Set<()=>void>();
 const emit=(patch:Partial<CatalogueState>)=>{state={...state,...patch};for(const f of [...listeners])f();};
 function cancel(){epoch++;pending?.abort();more?.abort();pending=null;more=null;if(timer!==null)clearTimeout(timer);timer=null;}
 function checkPage(model:ExerciseSearchReadModel,seen=new Set<string>()){
  if((model.state==='READY')!==(model.items.length>0))throw new ExerciseReadError('UNAVAILABLE');
  for(const item of model.items){if(seen.has(item.craysExerciseId))throw new ExerciseReadError('UNAVAILABLE');seen.add(item.craysExerciseId);}
 }
 function start(ownerKey:string,filters:ExerciseFilters,delay=250){
  if(disposed)return;
  cancel();const generation=epoch,selected={...filters};
  emit({...blank,ownerKey,filters:selected,phase:!ownerKey?'idle':selected.query.trim().length===1?'typing':'loading'});
  if(disposed||generation!==epoch||!ownerKey||state.phase==='typing')return;
  pending=new AbortController();const controller=pending;
  timer=setTimeout(async()=>{timer=null;try{
   const model=await api.search(exerciseParams(selected),controller.signal);
   if(disposed||controller.signal.aborted||generation!==epoch)return;
   checkPage(model);pending=null;
   emit({model,pages:[model],phase:'ready',availableLimitations:model.availableLimitations});
  }catch(error){if(disposed||controller.signal.aborted||generation!==epoch)return;pending=null;emit({model:null,pages:[],availableLimitations:[],phase:'error',pageError:error instanceof ExerciseReadError?error.kind:'UNAVAILABLE'});}},delay);
 }
 async function loadMore(){
  if(disposed)return;
  const current=state,model=current.model,cursor=model?.nextCursor;
  if(!cursor||current.loadingMore||current.phase!=='ready'||current.pageError==='SESSION'||current.pageError==='CURSOR')return;
  const generation=epoch;more=new AbortController();const controller=more;emit({loadingMore:true,pageError:null});
  try{
   if(disposed||controller.signal.aborted||generation!==epoch)return;
   const next=await api.search(exerciseParams(current.filters,cursor),controller.signal);
   if(disposed||controller.signal.aborted||generation!==epoch)return;
   if(!['READY','NO_RESULTS','EMPTY'].includes(next.state))throw new ExerciseReadError('UNAVAILABLE');
   if(next.nextCursor===cursor)throw new ExerciseReadError('CURSOR');
   checkPage(next,new Set(current.pages.flatMap(page=>page.items.map(item=>item.craysExerciseId))));more=null;
   emit({model:next,pages:[...current.pages,next],availableLimitations:next.availableLimitations,loadingMore:false});
  }catch(error){if(disposed||controller.signal.aborted||generation!==epoch)return;more=null;const kind=error instanceof ExerciseReadError?error.kind:'UNAVAILABLE';emit({pageError:kind,loadingMore:false,...(kind==='SESSION'||kind==='PERMISSION'?{model:null,pages:[],availableLimitations:[],phase:'error' as const}:{})});}
 }
 function clear(){if(disposed)return;cancel();state=blank;for(const f of [...listeners])f();}
 function dispose(){if(disposed)return;cancel();state=blank;disposed=true;listeners.clear();}
 return {getSnapshot:()=>state,getServerSnapshot:()=>blank,subscribe:(fn:()=>void)=>{if(disposed)return()=>{};listeners.add(fn);return()=>{listeners.delete(fn);};},start,loadMore,retry:()=>start(state.ownerKey,state.filters,0),clear,dispose};
}
