import {createWorkspaceReader,workspaceRecommendation} from './workspace-reader.mjs';
import {captureWorkspaceWrite} from './workspace-input.mjs';
import {resolveChuckWebContext} from './context.mjs';
const fail=code=>{throw Object.assign(Error('WORKSPACE_ACTION_'+code),{code});};
const empty=()=>({phase:'idle',pending:null,current:null,receipt:null,problem:null,blockedOriginalKey:null,archive:[],archiveHasMore:false,archiveAfter:null});
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const serial=cmd=>JSON.stringify({kind:cmd.kind,provenance:cmd.provenance,sources:cmd.sources,payload:cmd.payload,archived:false});
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
async function receipt(value,command){
 if(!value||Object.keys(value).sort().join(',')!=='contentSHA256,createdAt,id,receiptId,replayed,version'||value.id!==command.id||value.version!==(BigInt(command.expectedVersion)+1n).toString()||value.contentSHA256!==await hash(serial(command))||typeof value.replayed!=='boolean'||typeof value.createdAt!=='string'||!Number.isFinite(Date.parse(value.createdAt))||!/^personal-workspace-receipt-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.receiptId??''))fail('invalid-receipt');
 return freeze(structuredClone(value));
}
async function capturePending(value){
 if(value===null)return null;
 if(!value||Object.keys(value).sort().join(',')!=='command,receipt,status'||!['prepared','unknown','stored'].includes(value.status))fail('pending-storage');
 let command;try{command=captureWorkspaceWrite(value.command);}catch{fail('pending-storage');}
 if(!command.id||!command.expectedVersion)fail('pending-storage');
 const saved=value.status==='stored'?await receipt(value.receipt,command):null;
 if(value.status!=='stored'&&value.receipt!==null)fail('pending-storage');
 return freeze({status:value.status,command,receipt:saved});
}
/** Real Core commands only. A local row never proves a Core commit. No new
 * people, introductions, model/tool grants or provider actions are created.
 * One unresolved original command per canonical account, retained across reload.
 */
export class PersonalWorkspaceActionController{
 #scope;#assert;#fetch;#reader;#journal;#uuid;#listeners=new Set();#snapshot=freeze(empty());#generation=0;#abort;#disposed=false;#busy=false;#pending=null;#contactRevision=null;
 constructor({accountScope,assertCurrent,fetch:fetcher=globalThis.fetch,journal,randomUUID=()=>crypto.randomUUID()}){
  if(typeof accountScope!=='string'||typeof assertCurrent!=='function'||!journal||['read','save','archive'].some(k=>typeof journal[k]!=='function')||typeof randomUUID!=='function')fail('invalid-context');
  this.#scope=accountScope;this.#assert=assertCurrent;this.#fetch=fetcher;this.#reader=createWorkspaceReader({accountScope,assertCurrent,fetch:fetcher});this.#journal=journal;this.#uuid=randomUUID;
 }
 subscribe=listener=>{this.#listeners.add(listener);return()=>this.#listeners.delete(listener);};getSnapshot=()=>this.#snapshot;
 #emit(patch){this.#snapshot=freeze({...this.#snapshot,...patch});for(const listener of this.#listeners)listener();}
 #check(token){this.#assert();if(this.#disposed||token.generation!==this.#generation||token.signal.aborted)fail('cancelled');}
 async #run(operation){
  if(this.#disposed||this.#busy)return;const abort=this.#abort=new AbortController(),token={generation:this.#generation,signal:abort.signal};this.#busy=true;this.#emit({phase:'checking',problem:null,current:null});
  try{this.#check(token);return await operation(token);}catch(error){
   try{this.#check(token);}catch{return;}
   const hardDenied=['access-denied','context-changed','contact-required','contact-changed'].includes(error?.code);
   const revision=token.contactRevision??this.#contactRevision,localEpoch=!hardDenied&&(error?.code==='original-contact-changed'||!!this.#pending&&!!revision&&this.#pending.command.expectedContactRevision!==revision),denied=hardDenied||localEpoch;
   this.#emit({phase:localEpoch?'review-original':denied?'unavailable':this.#pending&&this.#pending.status!=='stored'?'outcome-unknown':error?.code==='pending-storage'?'storage-error':'unavailable',pending:denied?null:this.#pending,...(denied?{archive:[],archiveHasMore:false,archiveAfter:null}:{}),current:null,receipt:denied?null:this.#pending?.receipt??null,blockedOriginalKey:localEpoch&&this.#pending?.command.expectedContactRevision!==token.contactRevision?this.#pending?.command.idempotencyKey??null:null,problem:error?.code??'unavailable'});
  }finally{if(token.generation===this.#generation){this.#busy=false;this.#abort=null;}}
 }
 async #setup(token){
  this.#check(token);const current=await resolveChuckWebContext({fetch:this.#fetch,signal:token.signal});this.#check(token);
  if(current.accountScope!==this.#scope)fail('context-changed');if(!current.setup.accountMapped||current.setup.emailVerificationRequired)fail('contact-required');token.contactRevision=current.setup.contactRevision;const previous=this.#contactRevision;this.#contactRevision=token.contactRevision;if(previous!==null&&previous!==token.contactRevision)fail('contact-changed');return current.setup;
 }
 async #read(token,allowContactMismatch=false){let value;try{value=await this.#journal.read(this.#scope);this.#pending=await capturePending(value);}catch{fail('pending-storage');}this.#check(token);if(!allowContactMismatch&&this.#pending&&this.#pending.command.expectedContactRevision!==token.contactRevision)fail('original-contact-changed');}
 async #save(token,value){this.#check(token);let saved;try{saved=await this.#journal.save(this.#scope,value,this.#pending);}catch{fail('pending-storage');}if(!saved)fail('pending-storage');this.#check(token);this.#pending=value;}
 async #refresh(token){
  const current=await this.#reader.detail(this.#pending.command.id,{signal:token.signal});this.#check(token);const after=await this.#setup(token);
  if(after.contactRevision!==this.#pending.command.expectedContactRevision)fail('contact-changed');
  const saved=this.#pending.receipt;
  if(BigInt(current.version)<BigInt(saved.version)||current.version===saved.version&&current.contentSHA256!==saved.contentSHA256)fail('record-changed');
  this.#emit({phase:'stored',pending:this.#pending,receipt:saved,current,problem:null});return saved;
 }
 async #archivePage(token,more=false){
  const page=await this.#journal.readArchivePage(this.#scope,more&&this.#snapshot.archiveAfter?{afterId:this.#snapshot.archiveAfter}:{});this.#check(token);
  const rows=[];for(const row of page.records){if(row?.coreActionCancelled!==false)fail('pending-storage');const record=await capturePending(row.record);if(record.command.expectedContactRevision===token.contactRevision)rows.push(freeze({...row,record}));}this.#check(token);
  this.#emit({archive:more?[...this.#snapshot.archive.filter(v=>v.record.command.expectedContactRevision===token.contactRevision),...rows]:rows,archiveHasMore:page.hasMore,archiveAfter:page.nextAfterId});
 }
 async earlierChanges(){return this.#run(async token=>{await this.#setup(token);if(this.#snapshot.archiveHasMore)await this.#archivePage(token,true);this.#emit({phase:this.#pending?.status==='stored'?'stored':this.#pending?'outcome-unknown':'idle'});});}
 async restoreOriginal(expectedArchive){return this.#run(async token=>{
  const setup=await this.#setup(token),saved=await capturePending(expectedArchive?.record);if(!saved||saved.status==='stored'||expectedArchive?.coreActionCancelled!==false||setup.contactRevision!==saved.command.expectedContactRevision)fail('review-required');
  const restored=await this.#journal.restoreArchived(this.#scope,expectedArchive);this.#check(token);if(restored!=='restored')fail('pending-storage');await this.#read(token);await this.#archivePage(token);this.#emit({phase:'outcome-unknown',pending:this.#pending,receipt:null,current:null});
 });}
 async load(){return this.#run(async token=>{await this.#setup(token);await this.#read(token);await this.#archivePage(token);if(!this.#pending){this.#emit({phase:'idle',pending:null,current:null,receipt:null,problem:null,blockedOriginalKey:null});return;}if(this.#pending.status==='stored')return this.#refresh(token);this.#emit({phase:'outcome-unknown',pending:this.#pending,receipt:null,current:null,problem:'receipt-unconfirmed'});});}
 async choose({reviewedRecord,state}){return this.#run(async token=>{
  if(!['saved','dismissed','suggested'].includes(state))fail('invalid-state');
  const before=await this.#setup(token);await this.#read(token);if(this.#pending&&this.#pending.status!=='stored')fail('reconcile-required');
  const reviewed=workspaceRecommendation(reviewedRecord),current=await this.#reader.detail(reviewed.id,{signal:token.signal});this.#check(token);const after=await this.#setup(token);
  if(before.contactRevision!==after.contactRevision)fail('contact-changed');
  if(current.version!==reviewed.version||current.contentSHA256!==reviewed.contentSHA256)fail('record-changed');
  const command=captureWorkspaceWrite({id:reviewed.id,kind:reviewed.kind,expectedVersion:reviewed.version,expectedContactRevision:after.contactRevision,idempotencyKey:this.#uuid(),provenance:reviewed.provenance,sources:reviewed.sources,payload:{...reviewed.payload,state}});
  await this.#save(token,freeze({status:'prepared',command,receipt:null}));this.#emit({phase:'sending',pending:this.#pending,receipt:null,current:null});return this.#post(token);
 });}
 async #post(token){
  const original=this.#pending.command;
  try{
   this.#check(token);const value=await this.#reader.write(original,{signal:token.signal});this.#check(token);const saved=await receipt(value,original);this.#check(token);
   await this.#save(token,freeze({status:'stored',command:original,receipt:saved}));
  }catch(error){
   this.#check(token);
   if(this.#pending?.status==='prepared')await this.#save(token,freeze({status:'unknown',command:original,receipt:null}));
   throw error;
  }
  // A stored receipt does not imply the latest record still has that state.
  return this.#refresh(token);
 }
 async retryOriginal(){return this.#run(async token=>{
  const setup=await this.#setup(token);await this.#read(token);const previous=this.#pending;
  if(!previous||previous.status==='stored')fail('reconcile-required');
  if(setup.contactRevision!==previous.command.expectedContactRevision)fail('contact-changed');
  // Core checks ORIGINAL idempotency before expectedVersion: this same command
  // recovers a lost acknowledgement even if the head advanced. No new key.
  await this.#save(token,freeze({status:'prepared',command:previous.command,receipt:null}));this.#emit({phase:'sending',pending:this.#pending,receipt:null,current:null});return this.#post(token);
 });}
 async setAsideIncompatible({understandOriginalMayStillCommit=false,expectedKey}={}){return this.#run(async token=>{
  if(!understandOriginalMayStillCommit||typeof expectedKey!=='string')fail('review-required');const setup=await this.#setup(token);await this.#read(token,true);
  if(!this.#pending||this.#pending.command.idempotencyKey!==expectedKey||this.#pending.command.expectedContactRevision===setup.contactRevision)fail('review-required');
  let saved;try{saved=await this.#journal.archive(this.#scope,this.#pending);}catch{fail('pending-storage');}this.#check(token);if(!saved)fail('pending-storage');this.#pending=null;
  await this.#archivePage(token);this.#emit({phase:'idle',pending:null,current:null,receipt:null,problem:null,blockedOriginalKey:null});
 });}
 async setAsideOriginal({understandOriginalMayStillCommit=false,expectedOriginal}={}){return this.#run(async token=>{
  if(!understandOriginalMayStillCommit||!expectedOriginal)fail('review-required');await this.#setup(token);await this.#read(token);
  if(JSON.stringify(this.#pending)!==JSON.stringify(expectedOriginal)||!this.#pending)fail('review-required');
  let saved;try{saved=await this.#journal.archive(this.#scope,this.#pending);}catch{fail('pending-storage');}this.#check(token);if(!saved)fail('pending-storage');this.#pending=null;await this.#archivePage(token);this.#emit({phase:'idle',pending:null,current:null,receipt:null,problem:null,blockedOriginalKey:null});
 });}
 invalidateAccess(){if(this.#disposed)return;++this.#generation;this.#abort?.abort();this.#busy=false;this.#pending=null;this.#emit({...empty(),phase:'unavailable',problem:'access-denied'});}
 dispose(){this.invalidateAccess();this.#disposed=true;this.#listeners.clear();}
}
