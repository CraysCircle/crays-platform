import{captureCommand,contactSetup,receipt,transcript,identifier,immutable,fail}from'./protocol.mjs';
import{originalTranscript}from'./originals.mjs';
import{captureChuckPendingRecord}from'./pending-record.mjs';
const empty=()=>({phase:'idle',records:[],hasMore:false,nextAfterId:null,checked:null,problem:null});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function record(value){
 if(!value||Object.keys(value).sort().join(',')!=='archivedAt,coreActionCancelled,record'||value.coreActionCancelled!==false||typeof value.archivedAt!=='string'||!Number.isFinite(Date.parse(value.archivedAt))||new Date(value.archivedAt).toISOString()!==value.archivedAt)throw fail('pending-storage');
 const p=value.record;if(!p||Object.keys(p).sort().join(',')!=='command,receipt,status'||!['prepared','unknown','stored'].includes(p.status)||(p.status==='stored')!==(p.receipt!=null))throw fail('pending-storage');
 return immutable({archivedAt:value.archivedAt,coreActionCancelled:false,record:captureChuckPendingRecord(p)});
}
const retainedContext=current=>immutable({setup:current.setup,conversation:Object.fromEntries(['bindingId','revision','conversationId'].map(key=>[key,current.conversation[key]]))});
const matching=(row,current)=>{const c=row.record.command;return c.bindingId===current.conversation.bindingId&&c.expectedBindingRevision===current.conversation.revision&&c.expectedContactRevision===current.setup.contactRevision;};
/** Core read-only review of local retained originals. Every page and receipt check is
 * guarded by actual current Core setup/transcript. Explicit local restore only;
 * no send/bind/cancel;
 * a local copy is never proof of authoritative message contents or execution. */
export class PersonalChuckArchiveController{
 #execute;#journal;#scope=null;#version=0;#abort;#busy=false;#disposed=false;#state=immutable(empty());#listeners=new Set();#context=null;#records=[];#cursor=null;#includeOriginals;
 constructor({execute,journal,includeOriginals=false}){if(typeof execute!=='function'||typeof journal?.readArchivePage!=='function'||typeof includeOriginals!=='boolean')throw fail('invalid-transport');this.#execute=execute;this.#journal=journal;this.#includeOriginals=includeOriginals;}
 subscribe=fn=>{this.#listeners.add(fn);return()=>this.#listeners.delete(fn);};getSnapshot=()=>this.#state;
 #emit(patch){this.#state=immutable({...this.#state,...patch});for(const fn of this.#listeners)fn();}
 setContext(scope){this.#version++;this.#abort?.abort();this.#busy=false;this.#scope=null;this.#context=null;this.#records=[];this.#cursor=null;this.#state=immutable(empty());for(const fn of this.#listeners)fn();if(this.#disposed||typeof scope!=='string'||!scope.length||scope.length>200)throw fail('invalid-context');this.#scope=scope;}
 #check(t){if(this.#disposed||t.version!==this.#version||t.scope!==this.#scope||t.signal.aborted)throw fail('cancelled');}
 async #call(t,name,variables={}){this.#check(t);const result=await this.#execute(name,variables,{signal:t.signal});this.#check(t);return result;}
 async #current(t){const setup=contactSetup(await this.#call(t,'NativeEmailSetup'));if(!setup.accountMapped||setup.emailVerificationRequired)throw fail('contact-required');const conversation=(this.#includeOriginals?originalTranscript:transcript)(await this.#call(t,this.#includeOriginals?'NativePersonalTranscriptOriginals':'NativePersonalTranscript'));const after=contactSetup(await this.#call(t,'NativeEmailSetup'));if(!same(setup,after))throw fail('contact-changed');return{setup,conversation};}
 #sameContext(a,b){return a&&b&&same(a.setup,b.setup)&&a.conversation.bindingId===b.conversation.bindingId&&a.conversation.revision===b.conversation.revision&&a.conversation.conversationId===b.conversation.conversationId;}
 async #run(phase,operation){if(this.#disposed||!this.#scope)throw fail('invalid-context');if(this.#busy)return;const abort=new AbortController(),t={version:this.#version,scope:this.#scope,signal:abort.signal};this.#abort=abort;this.#busy=true;this.#emit({phase,records:[],hasMore:false,nextAfterId:null,checked:null,problem:null});try{return await operation(t);}catch(error){try{this.#check(t);}catch{return;}this.#context=null;this.#records=[];this.#cursor=null;this.#emit({...empty(),phase:'unavailable',problem:error.code??'unavailable'});}finally{if(t.version===this.#version){this.#busy=false;this.#abort=null;}}}
 clear(){if(this.#scope&&!this.#disposed)this.setContext(this.#scope);}
 async load({more=false}={}){if(more&&!this.#state.hasMore)return;return this.#run('loading',async t=>{
  const before=await this.#current(t);if(more&&!this.#sameContext(this.#context,before))throw fail('binding-changed');
  let page;try{page=await this.#journal.readArchivePage(t.scope,more?{afterId:this.#cursor}:{});}catch{throw fail('pending-storage');}this.#check(t);
  if(!page||!Array.isArray(page.records)||page.records.length>50||typeof page.hasMore!=='boolean')throw fail('pending-storage');const rows=page.records.map(record),keys=rows.map(row=>row.record.command.idempotencyKey);
  if(new Set(keys).size!==keys.length||keys.some((key,i)=>i&&keys[i-1]>=key)||more&&keys.some(key=>key<=this.#cursor)||(page.hasMore?(rows.length!==50||page.nextAfterId!==keys.at(-1)):page.nextAfterId!==null))throw fail('pending-storage');
  const after=await this.#current(t);if(!this.#sameContext(before,after))throw fail('binding-changed');const visible=rows.filter(row=>matching(row,after)),records=more?[...this.#records,...visible]:visible;
  if(new Set(records.map(row=>row.record.command.idempotencyKey)).size!==records.length)throw fail('pending-storage');this.#context=retainedContext(after);this.#records=records;this.#cursor=page.nextAfterId;this.#emit({phase:'ready',records,hasMore:page.hasMore,nextAfterId:page.nextAfterId,checked:null,problem:null});
 });}
 async checkRequest(key){return this.#run('checking',async t=>{
  if(!identifier(key))throw fail('invalid-command');const row=this.#records.find(row=>row.record.command.idempotencyKey===key);if(!row)throw fail('pending-storage');const before=await this.#current(t);if(!this.#sameContext(this.#context,before)||!matching(row,before))throw fail('binding-changed');
  let found;try{found=receipt(await this.#call(t,'GetAgentDeliveryReceipt',{idempotencyKey:key}));}catch(error){if(error.code!=='receipt-unavailable')throw error;found=null;}
  const after=await this.#current(t);if(!this.#sameContext(before,after)||!matching(row,after))throw fail('binding-changed');
  const old=row.record.receipt;if(found&&old&&['receiptId','messageId','outcome','createdAt'].some(field=>found[field]!==old[field]))throw fail('original-changed');
  this.#context=retainedContext(after);this.#emit({phase:'ready',records:this.#records,hasMore:this.#cursor!==null,nextAfterId:this.#cursor,checked:{key,receipt:found,replyInLoadedPage:!!found&&after.conversation.messages.some(m=>m.authorKind==='CHUCK'&&m.inReplyToMessageId===found.messageId)},problem:null});
 });}
 /** Atomic local move only. Existing pending custody must be empty; original
  * command bytes/key survive unchanged. Core status review remains mandatory. */
 async restoreRequest(key){return this.#run('restoring',async t=>{
  if(!identifier(key))throw fail('invalid-command');const row=this.#records.find(row=>row.record.command.idempotencyKey===key);if(!row||row.record.status==='stored')throw fail('review-required');
  const before=await this.#current(t);if(!this.#sameContext(this.#context,before)||!matching(row,before))throw fail('binding-changed');
  let result;try{result=await this.#journal.restoreArchived(t.scope,row);}catch{throw fail('pending-storage');}this.#check(t);
  if(result!=='restored')throw fail(result==='active-request'?'active-request':'pending-storage');
  // The local move may already be committed. Later loss of rights never undoes
  // custody and never permits another command to overwrite this original.
  const after=await this.#current(t);if(!this.#sameContext(before,after)||!matching(row,after))throw fail('binding-changed');
  this.#context=null;this.#records=[];this.#cursor=null;this.#emit({...empty(),phase:'restored'});return true;
 });}
 dispose(){this.#version++;this.#abort?.abort();this.#scope=null;this.#context=null;this.#records=[];this.#cursor=null;this.#disposed=true;this.#state=immutable(empty());for(const fn of this.#listeners)fn();this.#listeners.clear();}
}
