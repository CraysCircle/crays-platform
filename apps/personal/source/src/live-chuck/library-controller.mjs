import {contactSetup,fail,immutable} from './protocol.mjs';
import {originalRequestPage,originalTranscript} from './originals.mjs';
const empty=()=>({phase:'idle',items:[],hasMore:false,problem:null,checkedAt:null});
const identity=value=>JSON.stringify([value.bindingId,value.revision,value.conversationId]);
const sameSetup=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
/** Reads actual original request/attachment projections through the existing
 * authenticated Core operations. This is a source library, never a memory,
 * project, completed tool result or permission-to-use projection. */
export class PersonalChuckLibraryController{
 #execute;#scope=null;#generation=0;#abort=null;#busy=false;#disposed=false;#context=null;#cursor=null;#requests=[];#state=immutable(empty());#listeners=new Set();
 constructor({execute}){if(typeof execute!=='function')throw fail('invalid-transport');this.#execute=execute;}
 subscribe=listener=>{this.#listeners.add(listener);return()=>this.#listeners.delete(listener);};
 getSnapshot=()=>this.#state;
 #emit(value){this.#state=immutable(value);for(const listener of this.#listeners)listener();}
 #reset(){this.#generation++;this.#abort?.abort();this.#abort=null;this.#busy=false;this.#context=null;this.#cursor=null;this.#requests=[];}
 setContext(scope){if(this.#disposed||typeof scope!=='string'||!scope.length||scope.length>200)throw fail('invalid-context');this.#reset();this.#scope=scope;this.#emit(empty());}
 invalidateAccess(){if(this.#disposed)return;this.#reset();this.#emit({...empty(),phase:'unavailable',problem:'access-denied'});}
 #check(t){if(this.#disposed||t.generation!==this.#generation||t.scope!==this.#scope||t.signal.aborted)throw fail('cancelled');}
 async #call(t,name,variables={}){this.#check(t);const value=await this.#execute(name,variables,{signal:t.signal});this.#check(t);return value;}
 async #current(t){const setup=contactSetup(await this.#call(t,'NativeEmailSetup'));if(!setup.accountMapped||setup.emailVerificationRequired)throw fail('contact-required');const binding=originalTranscript(await this.#call(t,'NativePersonalTranscriptOriginals'));return {setup,binding:identity(binding)};}
 async load({more=false}={}){
  if(this.#disposed||!this.#scope)throw fail('invalid-context');if(this.#busy||more&&!this.#state.hasMore)return;
  const abort=new AbortController(),t={generation:this.#generation,scope:this.#scope,signal:abort.signal},previous=this.#requests,cursor=this.#cursor,priorContext=this.#context;
  this.#abort=abort;this.#busy=true;this.#emit({...empty(),phase:more?'loading-older':'loading'});
  try{
   const before=await this.#current(t);if(more&&(!priorContext||before.binding!==priorContext.binding||!sameSetup(before.setup,priorContext.setup)))throw fail('binding-changed');
   const page=originalRequestPage(await this.#call(t,'NativePersonalRequestsOriginals',more?{beforeMessageId:cursor}:{}));
   const after=await this.#current(t);if(before.binding!==after.binding||identity(page)!==after.binding||!sameSetup(before.setup,after.setup))throw fail('binding-changed');
   if(more&&(page.requests.some(row=>previous.some(old=>old.messageId===row.messageId))||page.requests.length&&page.requests.at(-1).createdAt>previous[0].createdAt||page.nextBeforeMessageId===cursor))throw fail('cursor-changed');
   const rows=page.requests.map(({messageId,receiptId,createdAt,originals})=>({messageId,receiptId,createdAt,originals}));
   const requests=more?[...rows,...previous]:rows,attachments=requests.flatMap(row=>row.originals.map(reference=>({key:reference.attachmentId+':'+reference.version+':'+reference.sha256,sourceMessageId:row.messageId,sourceReceiptId:row.receiptId,requestedAt:row.createdAt,reference})));
   if(new Set(attachments.map(item=>item.reference.attachmentId)).size!==attachments.length)throw fail('original-changed');
   this.#check(t);this.#context=after;this.#cursor=page.nextBeforeMessageId;this.#requests=requests;
   this.#emit({phase:'ready',items:attachments.toReversed(),hasMore:page.hasOlderRequests,problem:null,checkedAt:new Date().toISOString()});
  }catch(error){try{this.#check(t);}catch{return;}this.#context=null;this.#cursor=null;this.#requests=[];this.#emit({...empty(),phase:'unavailable',problem:error.code??'unavailable'});}
  finally{if(t.generation===this.#generation){this.#busy=false;this.#abort=null;}}
 }
 dispose(){if(this.#disposed)return;this.#reset();this.#scope=null;this.#disposed=true;this.#emit(empty());this.#listeners.clear();}
}
