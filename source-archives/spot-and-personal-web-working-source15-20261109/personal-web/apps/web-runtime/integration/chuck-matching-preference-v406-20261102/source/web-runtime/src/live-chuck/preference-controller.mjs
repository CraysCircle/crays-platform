import {capturePreferenceRequest,createPreferenceReader} from './preference-reader.mjs';
import {resolveChuckWebContext} from './context.mjs';
const fail=code=>{throw Object.assign(Error('PREFERENCE_'+code),{code});};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const initial=()=>({phase:'idle',records:[],heldRecords:[],hasMore:false,nextAfter:null,record:null,receipt:null,pending:null,problem:null,blockedOriginalKey:null});
const names={save:'SaveNativePersonalMatchingPreference',grant:'GrantNativePersonalMatchingPreference',revoke:'RevokeNativePersonalMatchingPreference',forget:'ForgetNativePersonalMatchingPreference'};
/** Original-key command lifecycle, local encrypted custody only. Current context
 * is refreshed before every read/write/retry; only authoritative Core replies
 * create a saved state. The browser index is never a permission source.
 */
export class PersonalPreferenceController{
 #scope;#assert;#fetch;#journal;#reader;#uuid;#listeners=new Set();#state=freeze(initial());#generation=0;#busy=false;#writing=false;#queuedRead=null;#abort;#disposed=false;#pending=null;#contact=null;
 constructor({accountScope,assertCurrent,fetch:fetcher=globalThis.fetch,journal,randomUUID=()=>crypto.randomUUID()}){
  if(typeof assertCurrent!=='function'||typeof fetcher!=='function'||!journal||['read','prepare','confirm','reject'].some(name=>typeof journal[name]!=='function')||typeof randomUUID!=='function')fail('invalid-context');
  this.#scope=accountScope;this.#assert=assertCurrent;this.#fetch=fetcher;this.#journal=journal;this.#uuid=randomUUID;this.#reader=createPreferenceReader({accountScope,assertCurrent,fetch:fetcher});
 }
 subscribe=listener=>{this.#listeners.add(listener);return()=>this.#listeners.delete(listener);};getSnapshot=()=>this.#state;
 #emit(change){this.#state=freeze({...this.#state,...change});for(const listener of this.#listeners)listener();}
 #check(token){this.#assert();if(this.#disposed||token.generation!==this.#generation||token.signal.aborted)fail('context-changed');}
 async #setup(token){this.#check(token);const context=await resolveChuckWebContext({fetch:this.#fetch,signal:token.signal});this.#check(token);if(context.accountScope!==this.#scope)fail('context-changed');const s=context.setup;if(!s.accountMapped||s.emailVerificationRequired||typeof s.contactRevision!=='string'||!/^[1-9][0-9]{0,17}$/.test(s.contactRevision))fail('contact-required');if(this.#contact!==null&&this.#contact!==s.contactRevision)fail('context-changed');this.#contact=s.contactRevision;token.contactRevision=s.contactRevision;return s;}
 async #readPending(token){const saved=await this.#journal.read(this.#scope);this.#check(token);if(!saved||saved.record===null&&saved.token!==null||saved.record!==null&&typeof saved.token!=='string')fail('pending-storage');this.#pending=saved.record?saved:null;
  if(this.#pending){const record=this.#pending.record;if(!['prepared','unknown'].includes(record.status)||!Object.values(names).includes(record.operation))fail('pending-storage');capturePreferenceRequest(record.operation,record.variables);if(record.variables.input.expectedContactRevision!==token.contactRevision)fail('original-contact-changed');}
 }
 async #run(work,{write=false}={}){if(this.#disposed||this.#busy)return false;const abort=this.#abort=new AbortController(),token={generation:this.#generation,signal:abort.signal};this.#busy=true;this.#writing=write;this.#emit({phase:'checking',records:[],heldRecords:[],hasMore:false,nextAfter:null,record:null,receipt:null,pending:null,problem:null});try{this.#check(token);await work(token);return true;}catch(error){try{this.#check(token);}catch{return false;}
  const denied=['access-denied','context-changed','contact-required','original-contact-changed'].includes(error?.code);const confirmed=this.#state.receipt!==null&&this.#pending===null;
  this.#emit({records:[],heldRecords:[],hasMore:false,nextAfter:null,phase:denied?'unavailable':confirmed?'stored':this.#pending?'outcome-unknown':'unavailable',record:null,pending:denied?null:this.#pending?.record??null,receipt:denied?null:this.#state.receipt,problem:error?.code??'unavailable',blockedOriginalKey:error?.code==='original-contact-changed'?this.#pending?.record.variables.input.idempotencyKey??null:null});return false;
 }finally{if(token.generation===this.#generation){this.#busy=false;this.#writing=false;this.#abort=null;const queued=this.#queuedRead;this.#queuedRead=null;if(queued&&!this.#disposed&&!['access-denied','context-changed','contact-required'].includes(this.#state.problem))queueMicrotask(()=>void this.load(queued.id));}}}
 async #readRecord(token,id){const row=await this.#reader.read(id,{signal:token.signal});this.#check(token);await this.#setup(token);this.#check(token);return row;}
 load(id=null){if(this.#busy){if(this.#writing){this.#queuedRead={id};return Promise.resolve(false);}++this.#generation;this.#abort?.abort();this.#busy=false;this.#abort=null;}return this.#run(async token=>{await this.#setup(token);await this.#readPending(token);if(this.#pending){this.#emit({phase:'outcome-unknown',record:null,receipt:null,pending:this.#pending.record,problem:'receipt-unconfirmed'});return;}if(id){const record=await this.#readRecord(token,id);this.#emit({...initial(),phase:'ready',record});}else{const page=await this.#reader.page({signal:token.signal});this.#check(token);await this.#setup(token);this.#emit({...initial(),...page,phase:'ready'});}});}
 loadMore(){const previous=this.#state;if(previous.phase!=='ready'||!previous.hasMore||!previous.nextAfter)return Promise.resolve(false);return this.#run(async token=>{
  await this.#setup(token);await this.#readPending(token);if(this.#pending)fail('reconcile-required');
  const page=await this.#reader.page({after:previous.nextAfter,signal:token.signal});this.#check(token);await this.#setup(token);
  const records=[...previous.records,...page.records],heldRecords=[...previous.heldRecords,...page.heldRecords];
  if(new Set([...records,...heldRecords].map(r=>r.id)).size!==records.length+heldRecords.length)fail('cursor-changed');
  this.#emit({...initial(),...page,records,heldRecords,phase:'ready'});
 });}
 open(id){return this.load(id);}
 mutate(kind,{draft,reviewed=null,suggestionConfirmed=false,grantExpiresAt}={}){return this.#run(async token=>{
  const operation=names[kind];if(!operation)fail('invalid-operation');await this.#setup(token);await this.#readPending(token);if(this.#pending)fail('reconcile-required');
  let current=null;
  if(reviewed){
   // A fresh read is required before changing wording or enabling/disabling use.
   // Forget can use exact previously reviewed metadata after contact changes;
   // Core still verifies the actual original record and compare-and-swap tuple.
   if(kind!=='forget'){current=await this.#readRecord(token,reviewed.id);if(['id','version','accessVersion','contentSHA256'].some(k=>current[k]!==reviewed[k]))fail('version-conflict');}
   else current=reviewed;
  }
  if(kind!=='save'&&!current)fail('review-required');
  const base={id:current?.id??null,expectedVersion:current?.version??null,expectedAccessVersion:current?.accessVersion??null,expectedContentSHA256:current?.contentSHA256??null,expectedContactRevision:token.contactRevision,idempotencyKey:this.#uuid()};let input;
  if(kind==='save')input={...base,draft:{...draft,expiresAt:draft?.expiresAt==null?null:String(draft.expiresAt)},suggestionConfirmed};
  else if(kind==='grant')input={...base,purpose:current.draft.purpose,expiresAt:String(grantExpiresAt)};
  else input=base;
  const variables=capturePreferenceRequest(operation,{input});await this.#setup(token);this.#check(token);
  const saved=await this.#journal.prepare(this.#scope,{status:'prepared',operation,variables},null);this.#check(token);if(!saved)fail('pending-storage');this.#pending=saved;this.#emit({phase:'sending',pending:saved.record,receipt:null,record:null});await this.#post(token);
 },{write:true});}
 async #post(token){const original=this.#pending;this.#check(token);let acknowledged;
  try{
   const method=Object.keys(names).find(key=>names[key]===original.record.operation);acknowledged=await this.#reader[method](original.record.variables.input,{signal:token.signal});this.#check(token);
   if(!await this.#journal.confirm(this.#scope,original,acknowledged))fail('pending-storage');this.#check(token);this.#pending=null;
  }catch(error){this.#check(token);
   // These exact original-Core errors occur before commit; the original Core
   // boundary converts any post-commit return failure to OUTCOME_UNKNOWN.
   // A conflict with an existing idempotency key is deliberately NOT cleared.
   if(['invalid-input','expired','version-conflict'].includes(error?.code)){
    if(!await this.#journal.reject(this.#scope,original,error.code))fail('pending-storage');this.#check(token);this.#pending=null;this.#emit({pending:null,record:null,receipt:null});throw error;
   }
   if(this.#pending?.token===original.token){const saved=await this.#journal.prepare(this.#scope,{...original.record,status:'unknown'},original.token);this.#check(token);if(!saved)fail('pending-storage');this.#pending=saved;}throw error;}
  this.#emit({phase:acknowledged.operation==='forget'?'forgotten':'stored',receipt:acknowledged,pending:null,record:null,problem:null,blockedOriginalKey:null});
  if(acknowledged.operation!=='forget'){const record=await this.#readRecord(token,acknowledged.id);this.#emit({phase:'ready',record});}
 }
 retryOriginal(){return this.#run(async token=>{await this.#setup(token);await this.#readPending(token);if(!this.#pending)fail('reconcile-required');this.#emit({phase:'sending',pending:this.#pending.record,receipt:null,record:null});await this.#post(token);},{write:true});}
 invalidateAccess(){if(this.#disposed)return;++this.#generation;this.#abort?.abort();this.#busy=false;this.#writing=false;this.#queuedRead=null;this.#pending=null;this.#emit({...initial(),phase:'unavailable',problem:'access-denied'});}
 dispose(){this.invalidateAccess();this.#disposed=true;this.#listeners.clear();}
}
