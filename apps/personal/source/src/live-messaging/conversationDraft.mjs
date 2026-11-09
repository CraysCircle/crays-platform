import {validBoundGroupId} from './groupStorageFormat.mjs';
import {validMessageText} from './messageLimits.mjs';
import {validReplyId} from './conversationReply.mjs';

export function isConversationDraftForWorkspace(controller,workspace){
 try{const b=controller?.binding,w=workspace?.binding;return !!b&&!!w&&['kind','accountId','conversationId','groupId','pubkey'].every(key=>b[key]===w[key])&&validReplyId(b.membershipId)&&!controller.signal.aborted&&!workspace.signal.aborted&&controller.getSnapshot().available===true;}catch{return false;}
}

/** Parent-owned composer state. journal must encrypt at rest; exclusive must span
 * the complete cross-instance read/compare/write. This controller never sends. */
export async function openConversationDraft({binding,journal,exclusive,authorize,signal,newId=()=>crypto.randomUUID()}) {
 const fields=['kind','accountId','conversationId','groupId','pubkey','membershipId'];
 if(!binding||!['person','spot','circle'].includes(binding.kind)||fields.slice(1,3).some(k=>typeof binding[k]!=='string'||!binding[k]||binding[k].length>200)||!validBoundGroupId(binding)||fields.slice(4).some(k=>!validReplyId(binding[k]))||!journal?.getItem||!journal.setItem||typeof exclusive!=='function'||typeof authorize!=='function'||!signal?.addEventListener)throw Error('Admitted encrypted composer scope required');
 binding=Object.freeze({...binding});
 const scope=Object.freeze(fields.map(k=>binding[k])),address='draft:v1:'+JSON.stringify(scope);
 const lifetime=new AbortController(),listeners=new Set();
 let closed=false,sequence=0,saved,latest,problem=null,conflict=null,snapshot,lastAttempt=null,queue=Promise.resolve();
 const admitted=()=>!closed&&!signal.aborted&&!lifetime.signal.aborted&&authorize(binding)===true;
 const check=()=>{if(!admitted())throw Error('This composer is no longer available.');};
 const value=input=>{
  if(!input||!validMessageText(input.text)||input.replyTo!==null&&!validReplyId(input.replyTo))throw Error('Bounded text and an original reply reference required');
  return Object.freeze({text:input.text,replyTo:input.replyTo});
 };
 const empty=()=>({schema:1,scope,revision:0,operationId:null,text:'',replyTo:null});
 const record=input=>{
  if(input===null)return empty();
  if(input?.schema!==1||JSON.stringify(input.scope)!==JSON.stringify(scope)||!Number.isSafeInteger(input.revision)||input.revision<1||input.revision>=Number.MAX_SAFE_INTEGER||typeof input.operationId!=='string'||!input.operationId||input.operationId.length>200)throw Error('Stored composer needs review.');
  return {...input,...value(input)};
 };
 const same=(a,b)=>a.text===b.text&&a.replyTo===b.replyTo;
 const unavailable=Object.freeze({available:false,text:'',replyTo:null,version:0,saving:false,problem:null,conflict:null});
 const emit=()=>{snapshot=Object.freeze({available:admitted(),...latest,version:sequence,saving:!!latest&&(!same(latest,saved)||!!problem),problem,conflict});for(const fn of listeners)fn();};
 const read=async()=>{check();const result=record(await journal.getItem(address));check();return result;};
 const lock=operation=>exclusive(address,operation,lifetime.signal);
 const abort=()=>close();
 signal.addEventListener('abort',abort,{once:true});
 if(signal.aborted)lifetime.abort();
 try{saved=await lock(read);check();latest=value(saved);emit();}catch(error){signal.removeEventListener('abort',abort);lifetime.abort();throw error;}
 async function persist(captured,attempt){
  check();if(conflict||captured!==sequence)return;
  await lock(async()=>{
   check();if(conflict||captured!==sequence)return;
   const fresh=await read();
   // Reconcile a lost local acknowledgement, never replay a different write.
   if(fresh.operationId===attempt.operationId&&fresh.revision===attempt.revision&&same(fresh,attempt)){saved=fresh;problem=null;return;}
   if(fresh.revision!==saved.revision||fresh.operationId!==saved.operationId){
    conflict=Object.freeze({revision:fresh.revision,operationId:fresh.operationId,text:fresh.text,replyTo:fresh.replyTo});
    throw Error('The draft changed in another window. Your current text has been kept.');
   }
   if(captured!==sequence)return;
   if(saved.revision>=Number.MAX_SAFE_INTEGER-1)throw Error('Composer revision limit reached');
   await journal.setItem(address,attempt);check();
   const verified=await read();
   if(verified.operationId!==attempt.operationId||verified.revision!==attempt.revision||!same(verified,attempt))throw Error('Draft save could not be confirmed.');
   saved=verified;problem=null;
  });
 }
 function schedule(){
  const captured=sequence;
  const task=queue.then(async()=>{
   if(captured!==sequence||!admitted()||conflict)return;
   if(lastAttempt){await lock(async()=>{
    const fresh=await read(),previous=lastAttempt.attempt;
    if(fresh.operationId===previous.operationId&&fresh.revision===previous.revision&&same(fresh,previous))saved=fresh;
   });}
   const operationId=newId();
   if(typeof operationId!=='string'||!operationId||operationId.length>200)throw Error('Composer save identity unavailable');
   const attempt={schema:1,scope,revision:saved.revision+1,operationId,...latest};lastAttempt={captured,attempt};
   await persist(captured,attempt);
  });
  queue=task.catch(()=>{problem=conflict?'The draft changed in another window. Your current text has been kept.':'Your draft could not be saved. Keep this conversation open and try again.';}).then(()=>{if(!closed)emit();});
 }
 function close(){if(closed)return;closed=true;lifetime.abort();signal.removeEventListener('abort',abort);latest={text:'',replyTo:null};saved=empty();lastAttempt=null;snapshot=unavailable;for(const fn of listeners)fn();listeners.clear();}
 return Object.freeze({
  binding,signal:lifetime.signal,
  getSnapshot:()=>admitted()?snapshot:unavailable,
  subscribe(fn){if(closed)return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},
  set(input){check();const next=value(input);if(same(next,latest))return snapshot.version;latest=next;sequence++;problem=null;emit();schedule();return sequence;},
  clearConfirmed(expected){check();const next=value(expected);if(!same(latest,next))return false;latest=value({text:'',replyTo:null});sequence++;emit();schedule();return true;},
  async flush(){await queue;check();if(problem||conflict||!same(latest,saved))throw Error('Draft save is not confirmed.');},
  async retry(){check();await queue;if(conflict)throw Error('Review the other-window draft conflict first.');if(lastAttempt&&lastAttempt.captured===sequence){try{await persist(lastAttempt.captured,lastAttempt.attempt);}catch{problem='Draft save could not be confirmed.';emit();throw Error(problem);}emit();}if(!same(latest,saved)){schedule();await queue;}check();if(problem||conflict)throw Error('Draft save could not be confirmed.');},
  // Caller must explicitly review its current text and the conflict token. No
  // automatic merge, replacement, recovery-send or cross-account restoration.
  async keepCurrent(expectedVersion,expectedConflict){check();await queue;if(expectedVersion!==sequence||!conflict||expectedConflict!==conflict)throw Error('Review the current draft conflict again.');await lock(async()=>{const fresh=await read();if(expectedVersion!==sequence||conflict!==expectedConflict)throw Error('Review the current draft conflict again.');if(fresh.revision!==conflict.revision||fresh.operationId!==conflict.operationId){conflict=Object.freeze({revision:fresh.revision,operationId:fresh.operationId,text:fresh.text,replyTo:fresh.replyTo});emit();throw Error('The other draft changed again.');}saved=fresh;conflict=null;problem=null;});schedule();await queue;check();if(problem||conflict)throw Error('Draft save could not be confirmed.');},
  async useSaved(expectedVersion,expectedConflict){check();await queue;if(expectedVersion!==sequence||!conflict||expectedConflict!==conflict)throw Error('Review the current draft conflict again.');await lock(async()=>{const fresh=await read();if(expectedVersion!==sequence||conflict!==expectedConflict)throw Error('Review the current draft conflict again.');if(fresh.revision!==conflict.revision||fresh.operationId!==conflict.operationId){conflict=Object.freeze({revision:fresh.revision,operationId:fresh.operationId,text:fresh.text,replyTo:fresh.replyTo});emit();throw Error('The other draft changed again.');}saved=fresh;latest=value(fresh);sequence++;lastAttempt=null;conflict=null;problem=null;emit();});},
  close,
 });
}
