import {createWorkspaceReader} from './workspace-reader.mjs';
const empty=()=>({phase:'idle',records:[],detail:null,hasMore:false,nextAfter:null,problem:null});
/** One current Core account, shared by all Chuck workspace entries. No records
 * are stored in localStorage or copied from the prototype's world. */
export class PersonalChuckWorkspaceController{
 #reader;#listeners=new Set();#generation=0;#abort=null;#disposed=false;#snapshot=Object.freeze(empty());#seedRequested;#seedAttempted=false;
 constructor({seedTestDataRequested=false,...options}){this.#reader=createWorkspaceReader(options);this.#seedRequested=seedTestDataRequested===true;}
 getSnapshot=()=>this.#snapshot;
 subscribe=fn=>{this.#listeners.add(fn);return()=>this.#listeners.delete(fn);};
 #emit(value){this.#snapshot=Object.freeze(value);for(const fn of this.#listeners)fn();}
 async #run(work){
  if(this.#disposed)return null;const token=++this.#generation;this.#abort?.abort();const abort=this.#abort=new AbortController();
  // Re-checking invalidates previous visible payload until current rights return.
  this.#emit({...empty(),phase:'loading'});
  try{const result=await work(abort.signal);if(this.#disposed||token!==this.#generation)return null;this.#emit({...result,phase:'ready',problem:null});return result;}
  catch(error){if(!this.#disposed&&token===this.#generation)this.#emit({...empty(),phase:'unavailable',problem:error?.code??'unavailable'});return null;}
 }
 load({more=false}={}){
  const previous=this.#snapshot;
  if(more&&(previous.phase!=='ready'||!previous.hasMore||!previous.nextAfter))return Promise.resolve(null);
  return this.#run(async signal=>{
   if(!more){
    // Existing records are authoritative on their own. An optional test-data
    // mutation must not sit in front of a current, authorized nonempty read.
    // A denied/invalid read still fails closed and never triggers a seed.
    let page=await this.#reader.page({signal});
    if(!page.records.length&&!page.hasMore&&this.#seedRequested&&!this.#seedAttempted){
     this.#seedAttempted=true;
     // Only the explicitly requested isolated Core namespace may be seeded.
     // Preserve original deterministic receipts and all admission denials.
     try{await this.#reader.seed({signal});}catch(error){if(signal.aborted||['access-denied','context-changed'].includes(error?.code))throw error;}
     // No mutation response is display data. Read current Core state again,
     // also after an uncertain acknowledgement; never invent another key.
     page=await this.#reader.page({signal});
    }
    return {...empty(),records:page.records,hasMore:page.hasMore,nextAfter:page.nextAfter};
   }
   // Extending the list must not re-display retained private payloads. Re-read
   // the loaded prefix through Core before reading its next page. Each page
   // retains the original source/purpose and canonical-context checks.
   // Only the previous opaque cursor is reused; none of its old records are.
   const currentSignal=AbortSignal.any([signal,AbortSignal.timeout(20000)]);
   const target=previous.nextAfter,records=[],seen=new Set();
   let after=null,reached=false;
   for(;;){
    const page=await this.#reader.page({after,signal:currentSignal});
    for(const record of page.records){
     if(seen.has(record.id)||records.length&&records[records.length-1].id>=record.id)throw Object.assign(Error('CURSOR_CHANGED'),{code:'cursor-changed'});
     seen.add(record.id);records.push(record);
    }
    if(reached||!page.hasMore)return {...empty(),records:Object.freeze(records),hasMore:page.hasMore,nextAfter:page.nextAfter};
    if(page.nextAfter.id>=target.id){
     // Insertions, removals or an updated anchor can move the old boundary.
     // Require a fresh first page rather than guessing a new continuation.
     if(page.nextAfter.id!==target.id||page.nextAfter.version!==target.version)throw Object.assign(Error('CURSOR_CHANGED'),{code:'cursor-changed'});
     reached=true;
    }
    after=page.nextAfter;
   }
  });
 }
 open(id){return this.#run(async signal=>{
  // Keep a freshly authorized list for the return path, including when the
  // navigation stack retains the overview mounted behind this detail view.
  // These two original reads have no input dependency. Admit both through
  // their original current-context checks, then reconcile before displaying
  // either result. A failed read cancels its sibling; no partial payload is
  // published and no previous recommendation is used as a fallback.
  const siblings=new AbortController(),currentSignal=AbortSignal.any([signal,siblings.signal]);
  try{
   const [page,detail]=await Promise.all([this.#reader.page({signal:currentSignal}),this.#reader.detail(id,{signal:currentSignal})]);
   const listed=page.records.find(row=>row.id===id);
   if(listed&&(listed.version!==detail.version||listed.contentSHA256!==detail.contentSHA256))throw Object.assign(Error('RECORD_CHANGED'),{code:'record-changed'});
   return {...empty(),records:page.records,hasMore:page.hasMore,nextAfter:page.nextAfter,detail};
  }finally{siblings.abort();}
 });}
 invalidateAccess(){if(this.#disposed)return;++this.#generation;this.#abort?.abort();this.#emit({...empty(),phase:'unavailable',problem:'access-denied'});}
 dispose(){if(this.#disposed)return;this.invalidateAccess();this.#disposed=true;this.#listeners.clear();}
}
