import {captureOwnPurchaseListCommand,captureOwnPurchaseOriginalCommand,validOwnPurchasePage,validOwnPurchaseOriginal} from './own-purchase-read-contract.mjs';
const clone=v=>JSON.parse(JSON.stringify(v));
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const idleDetail=()=>({phase:'idle',selector:null,result:null});
const message='Your purchase information is unavailable. Reopen it under your current account.';
export function captureOwnPurchaseCheckpoint(value){
 const legacy=value?.schema==='crays.own-purchase-ui-checkpoint.v1';
 const keys=['schema','scope','generation','view','query','limit','visible','listLoaded','detail',...(legacy?[]:['format'])];
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||Object.keys(value).some(k=>!keys.includes(k))||!['crays.own-purchase-ui-checkpoint.v1','crays.own-purchase-ui-checkpoint.v2'].includes(value.schema)||![value.scope,value.generation].every(v=>typeof v==='string'&&v.length>0&&v.length<=512)||!Number.isSafeInteger(value.visible)||value.visible<0||value.visible>30000||!['all','library','needs-review'].includes(value.view)||typeof value.query!=='string'||!legacy&&typeof value.format!=='string'||typeof value.limit!=='number'||typeof value.listLoaded!=='boolean'||!value.listLoaded&&value.visible!==0)throw Error('Invalid own purchase return state');
 const{before,...command}=captureOwnPurchaseListCommand({view:value.view,query:value.query,format:legacy?'all':value.format,limit:value.limit}),detail=value.detail===null?null:captureOwnPurchaseOriginalCommand(value.detail);
 if(!value.listLoaded&&!detail)throw Error('No own purchase view to restore');
 return freeze({schema:'crays.own-purchase-ui-checkpoint.v2',scope:value.scope,generation:value.generation,...command,visible:value.visible,listLoaded:value.listLoaded,detail});
}
/** Account-local read state, not a transport or a permission grant. The host
 * supplies existing account-bound Core/GraphQL read ports and scope events.
 * No construction/mount fetch, browser persistence, payment or key operation.
 */
export function createOwnPurchaseController({readList,readOriginal,getScope,subscribeScope}){
 for(const fn of [readList,readOriginal,getScope,subscribeScope])if(typeof fn!=='function')throw Error('Current own purchase ports and scope subscription required');
 let active=null,epoch=0,listPending=null,detailPending=null,detailVersion=0,scopeLost=false,disposed=false;
 const listeners=new Set();
 const empty=phase=>({phase,selection:active,clientGeneration:epoch,entries:[],page:null,detail:idleDetail(),error:null});
 let snapshot=freeze(empty('idle'));const withheld=freeze({...empty('withheld'),selection:null});
 function scope(){const c=getScope();if(!c||Object.keys(c).some(k=>!['scope','generation'].includes(k))||![c.scope,c.generation].every(v=>typeof v==='string'&&v.length>0&&v.length<=512))throw Error('Current purchase account required');return{scope:c.scope,generation:c.generation};}
 function live(){if(disposed)return false;if(!active)return true;if(scopeLost)return false;try{const c=scope();if(c.scope===active.scope&&c.generation===active.generation)return true;}catch{}scopeLost=true;return false;}
 const emit=value=>{snapshot=freeze(value);for(const listener of listeners)listener();};
 function invalidate(){epoch++;detailVersion++;listPending?.abort();detailPending?.abort();listPending=null;detailPending=null;}
 function reset(phase='idle'){invalidate();active=null;scopeLost=false;emit(empty(phase));}
 function failed(){invalidate();emit({...empty('error'),error:message});}
 function clearIfLost(version){if(!disposed&&epoch===version&&scopeLost)reset();}
 async function page(append){
  if(disposed||!active||!live()){clearIfLost(epoch);return;}if(listPending||append&&!snapshot.page?.hasMore)return;
  const version=epoch,previous=snapshot,abort=new AbortController(),command=captureOwnPurchaseListCommand({...active.command,before:append?previous.page.nextCursor:null});listPending=abort;
  emit(append?{...snapshot,phase:'loading-more',error:null}:{...empty('loading')});
  const current=()=>!disposed&&version===epoch&&listPending===abort&&!abort.signal.aborted&&live();
  try{
   const value=await readList(command,{signal:abort.signal});if(!current()){clearIfLost(version);return;}
   if(!validOwnPurchasePage(value,command))throw Error('Invalid private page');
   const entries=[...(append?previous.entries:[]),...clone(value.entries)];
   if(new Set(entries.map(r=>r.orderId)).size!==entries.length||entries.length>30000||value.hasMore!==(value.visibleCount>entries.length))throw Error('Private page completeness differs');
   emit({...snapshot,phase:'loaded',selection:active,clientGeneration:epoch,entries,page:clone(value),error:null});
  }catch{if(current())failed();else clearIfLost(version);}
  finally{if(listPending===abort)listPending=null;}
 }
 async function startForScope(input={},expectedScope=null){
  if(disposed)return;reset();
  try{const command=captureOwnPurchaseListCommand(input);if(command.before)throw Error('Start from the current first page');const{before,...query}=command,c=scope();if(expectedScope&&(c.scope!==expectedScope.scope||c.generation!==expectedScope.generation))throw Error('Purchase account changed');active=freeze({...c,command:query});}
  catch{failed();throw Error(message);}
  return page(false);
 }
 const start=(input={})=>startForScope(input);
 async function openOriginal(input){
  if(disposed)return;let selector;try{selector=captureOwnPurchaseOriginalCommand(input);}catch{failed();throw Error(message);}
  if(!active){try{active=freeze({...scope(),command:{view:'all',query:'',format:'all',limit:30}});}catch{failed();throw Error(message);}}
  if(!live()){clearIfLost(epoch);return;}
  detailPending?.abort();const abort=new AbortController(),version=epoch,request=++detailVersion;detailPending=abort;
  emit({...snapshot,selection:active,detail:{phase:'loading',selector,result:null},error:null});
  const current=()=>!disposed&&version===epoch&&request===detailVersion&&detailPending===abort&&!abort.signal.aborted&&live();
  try{const result=await readOriginal(selector,{signal:abort.signal});if(!current()){clearIfLost(version);return;}if(!validOwnPurchaseOriginal(result,selector))throw Error('Invalid private original');emit({...snapshot,detail:{phase:result.state==='available'?'loaded':'unavailable',selector,result:clone(result)},error:null});}
  catch{if(current())failed();else clearIfLost(version);}
  finally{if(detailPending===abort)detailPending=null;}
 }
 function checkpoint(){
  if(disposed||!active||!live()||!(['loaded','loading-more'].includes(snapshot.phase)||['loaded','unavailable'].includes(snapshot.detail.phase)))throw Error(message);
  return captureOwnPurchaseCheckpoint({schema:'crays.own-purchase-ui-checkpoint.v2',scope:active.scope,generation:active.generation,...active.command,visible:snapshot.entries.length,listLoaded:snapshot.page!==null,detail:snapshot.detail.selector?clone(snapshot.detail.selector):null});
 }
 async function restore(input){
  if(disposed)return;reset();let saved;
  try{saved=captureOwnPurchaseCheckpoint(input);const c=scope();if(saved.scope!==c.scope||saved.generation!==c.generation)throw Error('Return account differs');}
  catch{failed();throw Error(message);}
  const command={view:saved.view,query:saved.query,format:saved.format,limit:saved.limit};let version;
  if(saved.listLoaded){const first=startForScope(command,{scope:saved.scope,generation:saved.generation});version=epoch;await first;}
  else{active=freeze({scope:saved.scope,generation:saved.generation,command});version=epoch;emit(empty('idle'));}
  const current=()=>!disposed&&version===epoch&&live();
  while(current()&&saved.listLoaded&&snapshot.phase==='loaded'&&snapshot.entries.length<saved.visible&&snapshot.page?.hasMore){
   const before=snapshot.entries.length;await page(true);if(!current()||snapshot.entries.length<=before)break;
  }
  if(!current()){clearIfLost(version);return;}
  if(saved.detail&&(!saved.listLoaded||snapshot.phase==='loaded'))await openOriginal(saved.detail);
 }
 const unsubscribe=subscribeScope(()=>{if(!disposed)reset();});if(typeof unsubscribe!=='function')throw Error('Own purchase scope unsubscribe required');
 return Object.freeze({subscribe(listener){if(disposed)return()=>{};listeners.add(listener);return()=>listeners.delete(listener);},
  getSnapshot:()=>disposed?snapshot:live()?snapshot:withheld,
  isCurrent:value=>!disposed&&live()&&value===snapshot,
  checkpoint,restore,start,refresh:()=>{if(!active||!live()){clearIfLost(epoch);return Promise.resolve();}return startForScope(active.command,{scope:active.scope,generation:active.generation});},loadMore:()=>page(true),openOriginal,
  closeOriginal(){if(disposed)return;if(!live()){clearIfLost(epoch);return;}detailVersion++;detailPending?.abort();detailPending=null;emit({...snapshot,detail:idleDetail()});},
  cancel(){if(!disposed)reset();},
  dispose(){if(!disposed){disposed=true;try{unsubscribe();}finally{reset('disposed');listeners.clear();}}},
 });
}
