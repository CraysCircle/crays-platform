import {validMessageText} from './messageLimits.mjs';
import {replyToFromTags,validReplyId} from './conversationReply.mjs';
/** Conversation state for the existing CRAYS reader; does not grant identity or membership. */
export function createConversationSession({binding,authorize,client,group,makeIntent,decode,journal,initialState,supportsReplies=false,resolveHistoryReply}) {
 const scope=Object.freeze({...binding});
 if(!['person','circle','spot'].includes(scope.kind)||!scope.accountId||!scope.conversationId||!scope.pubkey||scope.groupId!==group.idStr)throw Error('Explicit human conversation binding required');
 if(resolveHistoryReply!==undefined&&typeof resolveHistoryReply!=='function')throw Error('Current SDK reply resolver required');
 const listeners=new Set(),messages=new Map(),requests=new Map(),pendingRequests=new Map();let closed=false,hasEarlierMessages=false,persistenceWarning=false,persistQueue=Promise.resolve();
 const retain=(id,row)=>{messages.set(id,row);while(messages.size>1000){messages.delete(messages.keys().next().value);hasEarlierMessages=true;}};
 const admitted=()=>!closed&&authorize(scope)===true&&group.status==='active'&&!group.closedSignal?.aborted&&group.snapshot.members.includes(scope.pubkey);
 function snapshot(){return Object.freeze({available:admitted(),supportsReplies:supportsReplies===true,hasEarlierMessages,loadedMessageLimit:1000,persistenceWarning,messages:admitted()?[...messages.values()].map(m=>Object.freeze({...m})):[]});}
 function notify(){for(const fn of listeners)fn();}
 function save(){
  if(!journal)return Promise.resolve();
  const record={schema:'crays.private-conversation.v1',binding:scope,hasEarlierMessages,messages:[...messages.values()],requests:[...requests].map(([requestId,entry])=>({requestId,text:entry.text,replyTo:entry.replyTo??null,messageId:entry.messageId,result:entry.result||{status:'unconfirmed',eventIds:[],messageId:entry.messageId}}))};
  const work=persistQueue.then(()=>journal.setItem('conversation:'+scope.conversationId,record));persistQueue=work.catch(()=>{persistenceWarning=true;notify();});return work;
 }
 if(initialState){
  if(initialState.schema!=='crays.private-conversation.v1'||JSON.stringify(initialState.binding)!==JSON.stringify(scope)||!Array.isArray(initialState.messages)||initialState.messages.length>1000||!Array.isArray(initialState.requests)||initialState.requests.length>1000)throw Error('Stored conversation scope mismatch');
  hasEarlierMessages=initialState.hasEarlierMessages===true;
  for(const row of initialState.messages){if(!row||typeof row.id!=='string'||!validMessageText(row.text)||typeof row.author!=='string'||row.replyTo!=null&&!validReplyId(row.replyTo)||!['sending','received','sent-to-relay','unconfirmed'].includes(row.status))throw Error('Invalid stored conversation record');retain(row.id,{...row,status:row.status==='sending'?'unconfirmed':row.status});}
  for(const row of initialState.requests){if(!row||typeof row.requestId!=='string'||!row.requestId||typeof row.messageId!=='string'||!validMessageText(row.text)||row.replyTo!=null&&!validReplyId(row.replyTo)||!['sent-to-relay','unconfirmed'].includes(row.result?.status))throw Error('Invalid stored message attempt');requests.set(row.requestId,{text:row.text,replyTo:row.replyTo??null,messageId:row.messageId,result:row.result,promise:Promise.resolve(row.result)});}
 }
 const receive=data=>{
  if(!admitted())return;const message=decode(data);
  if(!message||message.kind!==9||typeof message.id!=='string'||!validMessageText(message.content)||!group.snapshot.members.includes(message.pubkey))return;
  // The original rumor ID is immutable. Reconnect duplicates must not replace
  // its first observation time or move it around same-second messages.
  if(messages.has(message.id))return;
  retain(message.id,{id:message.id,text:message.content,author:message.pubkey,status:'received',...(replyToFromTags(message.tags)?{replyTo:replyToFromTags(message.tags)}:{}),createdAt:Number.isSafeInteger(message.created_at)&&message.created_at>=0?message.created_at:Math.floor(Date.now()/1000),observedAt:Date.now()});notify();void save().catch(()=>{});
 };
 const close=()=>{if(closed)return;closed=true;group.off('applicationMessage',receive);group.off('changed',membershipChanged);group.off('removed',membershipChanged);group.off('disposed',close);group.off('destroyed',close);group.closedSignal?.removeEventListener('abort',close);messages.clear();requests.clear();pendingRequests.clear();notify();listeners.clear();};
 const membershipChanged=()=>{if(!admitted())close();else notify();};
 group.on('applicationMessage',receive);group.on('changed',membershipChanged);group.on('removed',membershipChanged);group.on('disposed',close);group.on('destroyed',close);group.closedSignal?.addEventListener('abort',close,{once:true});if(group.closedSignal?.aborted)close();
 return {
  getSnapshot:snapshot,
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  async send({requestId,text,replyTo=null}){
   if(!admitted())throw Error('Conversation is no longer authorized');
   if(typeof requestId!=='string'||!requestId||requestId.length>200||!validMessageText(text)||!text.trim())throw Error('Invalid message draft');
   const existing=requests.get(requestId);if(existing){if(existing.text!==text||(existing.replyTo??null)!==replyTo)throw Error('Message request changed');return existing.promise;}
   // Reserve before asynchronous history/source validation. Concurrent retries
   // must share the same attempt, never prepare a second immutable original.
   const pending=pendingRequests.get(requestId);if(pending){if(pending.text!==text||pending.replyTo!==replyTo)throw Error('Message request changed');return pending.promise;}
   if(pendingRequests.size>=1000)throw Error('Conversation pending validation window exceeded');
   const reservation={text,replyTo,promise:null};pendingRequests.set(requestId,reservation);
   const operation=Promise.resolve().then(async()=>{
   if(!admitted())throw Error('Conversation is no longer authorized');
   const checkReply=async()=>{if(replyTo!==null){
    if(!supportsReplies||!validReplyId(replyTo))throw Error('Current loaded reply original required');
    // A retained summary or pinned preview is not current SDK source proof.
    // Resolve loaded originals too, and repeat after durable attempt storage.
    let original=messages.get(replyTo);if(typeof resolveHistoryReply==='function'){original=await resolveHistoryReply(replyTo,{ownTextConfirmed:[...requests.values()].some(entry=>entry.messageId===replyTo&&entry.result?.status==='sent-to-relay'&&entry.result.eventIds?.length>0&&entry.result.eventIds.every(id=>/^[a-f0-9]{64}$/.test(id)))});if(!admitted())throw Error('Conversation is no longer authorized');}
    if(!original||original.id!==replyTo||!['received','sent-to-relay'].includes(original.status))throw Error('Current loaded reply original required');
   }};await checkReply();if(!admitted())throw Error('Conversation is no longer authorized');
   if(requests.size>=1000)throw Error('Conversation send window exceeded');
   const prepared=makeIntent({pubkey:scope.pubkey,content:text,replyTo});if(replyTo!==null&&prepared?.replyTo!==replyTo)throw Error('Reply reference was not preserved by the transport');if(!prepared?.intent||typeof prepared.messageId!=='string'||!prepared.messageId)throw Error('Original message identity required');
   const observedAt=Date.now(),createdAt=Number.isSafeInteger(prepared.createdAt)&&prepared.createdAt>=0?prepared.createdAt:Math.floor(observedAt/1000);
   const id=prepared.messageId,row={id,requestId,text,...(replyTo?{replyTo}:{}),author:scope.pubkey,status:'sending',createdAt,observedAt},entry={text,replyTo,messageId:id,result:null,promise:null};retain(id,row);requests.set(requestId,entry);
   const promise=(async()=>{
    try{
     // Persist the exact pending attempt before irreversible SDK publication. A restored unknown attempt is never republished.
     await save();if(!admitted())throw Error('Conversation is no longer authorized');
     await checkReply();if(!admitted())throw Error('Conversation is no longer authorized');
     const results=await client.groups.send(group.id,prepared.intent),responses=results.flatMap(r=>Object.values(r.response||{}));
     const status=responses.some(r=>r.ok===true)?'sent-to-relay':'unconfirmed',eventIds=results.map(r=>r.work?.envelope?.id).filter(Boolean);
     entry.result={status,eventIds,messageId:id};
     if(admitted()){retain(id,{...row,status,eventIds,persistenceWarning:results.some(r=>r.persistence?.kind==='failed')});notify();await save().catch(()=>{});}
     return {...entry.result,persistenceWarning};
    }catch(error){entry.result={status:'unconfirmed',eventIds:[],messageId:id};if(admitted()){retain(id,{...row,status:'unconfirmed'});notify();await save().catch(()=>{});}throw error;}
   })();entry.promise=promise;notify();return promise;
   }).finally(()=>{if(pendingRequests.get(requestId)===reservation)pendingRequests.delete(requestId);});reservation.promise=operation;return operation;
  },
  async flush(){await persistQueue;},
  close,
 };
}
export async function openPersistedConversationSession(options){
 if(!options.journal||typeof options.journal.getItem!=='function'||typeof options.journal.setItem!=='function')throw Error('Admitted encrypted conversation journal required');
 const initialState=await options.journal.getItem('conversation:'+options.binding.conversationId);
 return createConversationSession({...options,initialState});
}
