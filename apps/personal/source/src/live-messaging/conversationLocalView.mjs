import {validBoundGroupId} from './groupStorageFormat.mjs';
import {reviewConversationExport} from './conversationExport.mjs';
import {validReplyId} from './conversationReply.mjs';

export function validateConversationLocalViewRecord(value,binding){
 const scope=['kind','accountId','conversationId','groupId','pubkey','membershipId'].map(key=>binding[key]);
  if(value==null)return{schema:1,scope,revision:0,operationId:null,hiddenIds:[]};
  if(value.schema!==1||JSON.stringify(value.scope)!==JSON.stringify(scope)||!Number.isSafeInteger(value.revision)||value.revision<0||value.revision>=Number.MAX_SAFE_INTEGER||value.revision===0&&value.operationId!==null||value.revision>0&&(typeof value.operationId!=='string'||!value.operationId||value.operationId.length>200)||!Array.isArray(value.hiddenIds)||value.hiddenIds.length>10000||value.hiddenIds.some(id=>!validReplyId(id))||new Set(value.hiddenIds).size!==value.hiddenIds.length)throw Error('Stored local view needs review.');
  return{schema:1,scope,revision:value.revision,operationId:value.operationId,hiddenIds:[...value.hiddenIds]};
 }

/** Own readable projection only: never deletes originals or publishes Nostr events.
 * journal MUST be the current encrypted account/membership journal; exclusive
 * MUST serialize the full read/compare/write across instances of that scope. */
export async function openConversationLocalView({binding,client,journal,exclusive,authorize,signal,newId=()=>globalThis.crypto.randomUUID()}){
 const fields=['kind','accountId','conversationId','groupId','pubkey','membershipId'];
 if(!binding||!['person','spot','circle'].includes(binding.kind)||fields.slice(1,3).some(key=>typeof binding[key]!=='string'||!binding[key]||binding[key].length>200)||!validBoundGroupId(binding)||fields.slice(4).some(key=>!validReplyId(binding[key]))||!client?.getSnapshot||!client.subscribe||!journal?.getItem||!journal.setItem||typeof exclusive!=='function'||typeof authorize!=='function'||!signal?.addEventListener)throw Error('Admitted encrypted local-view scope required');
 binding=Object.freeze({...binding});
 const scope=Object.freeze(fields.map(key=>binding[key])),address='local-view:v1:'+JSON.stringify(scope);
 let closed=false,busy=false,broken=false,problem=null,queue=Promise.resolve(),saved={schema:1,scope,revision:0,operationId:null,hiddenIds:[]},hidden=new Set(),snapshot,metadata,unsubscribe;
 const lifetime=new AbortController(),abortScope=()=>lifetime.abort();signal.addEventListener('abort',abortScope,{once:true});if(signal.aborted)lifetime.abort();
 const listeners=new Set(),reviews=new WeakMap();
 const unavailable=Object.freeze({state:'unavailable',available:false,messages:[],sending:false,problem:null}),closedSnapshot=Object.freeze({...unavailable,state:'closed'}),unavailableMetadata=Object.freeze({available:false,hiddenCount:0,busy:false,problem:null});
 const admitted=()=>!closed&&!signal.aborted&&!lifetime.signal.aborted&&authorize(binding)===true;
 const visible=()=>admitted()&&!broken&&client.getSnapshot().available===true;
 const check=()=>{if(!admitted())throw Error('This local conversation view is no longer available.');};
 const validate=value=>validateConversationLocalViewRecord(value,binding);
 const emit=()=>{const base=client.getSnapshot(),available=admitted()&&!broken&&base.available;snapshot=Object.freeze({...base,state:closed?'closed':available?base.state:'unavailable',available,messages:available?base.messages.filter(row=>!hidden.has(row.id)):[],pinnedReply:available&&base.pinnedReply&&!hidden.has(base.pinnedReply.id)?base.pinnedReply:null});metadata=Object.freeze({available,hiddenCount:available?hidden.size:0,busy,problem:available?problem:null});for(const fn of listeners)fn();};
 const adopt=value=>{saved=value;hidden=new Set(value.hiddenIds);broken=false;};
 const read=async()=>{check();const value=validate(await journal.getItem(address));check();return value;};
 const serial=operation=>{const work=queue.then(operation);queue=work.catch(()=>{});return work;};
 const sameMarkers=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
 const selectedReview=ids=>{if(!Array.isArray(ids))return null;const base=snapshot,review=reviewConversationExport(base,ids);return review&&ids.length&&ids.length<=500&&ids.every(id=>validReplyId(id)&&base.messages.some(row=>row.id===id&&['received','sent-to-relay'].includes(row.status)))?review:null;};
 const currentReview=review=>{const entry=reviews.get(review);if(!entry||!admitted()||broken||!visible()||entry.revision!==saved.revision||!sameMarkers(entry.before,saved.hiddenIds))return false;return entry.type==='restore'||selectedReview(entry.ids)?.fingerprint===entry.fingerprint;};
 const prepare=(type,ids)=>{check();if(busy||!visible())throw Error('The current local view is unavailable.');const selected=type==='remove'&&selectedReview(ids);if(type==='remove'&&!selected||type==='restore'&&!hidden.size)throw Error('Choose current confirmed messages or a hidden local view to restore.');const operationId=newId();if(typeof operationId!=='string'||!operationId||operationId.length>200)throw Error('Local review identity unavailable');const review=Object.freeze({type,count:type==='remove'?ids.length:hidden.size,ids:Object.freeze(type==='remove'?[...ids]:[...hidden]),operationId});reviews.set(review,{type,ids:[...review.ids],operationId,revision:saved.revision,before:[...saved.hiddenIds],fingerprint:selected?.fingerprint,result:null});return review;};
 try{await exclusive(address,async()=>adopt(await read()),lifetime.signal);check();emit();}catch(error){signal.removeEventListener('abort',abortScope);lifetime.abort();throw error;}
 unsubscribe=client.subscribe(emit);
 const close=()=>{if(closed)return;closed=true;lifetime.abort();signal.removeEventListener('abort',abortScope);signal.removeEventListener('abort',close);unsubscribe?.();hidden.clear();emit();listeners.clear();client.close();};
 signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();
 const confirm=review=>serial(async()=>{
  check();if(!visible())throw Error('This local view is unavailable.');const entry=reviews.get(review);if(!entry)throw Error('Review this exact local change first.');if(entry.result)return entry.result;
  busy=true;problem=null;emit();
  try{return await exclusive(address,async()=>{
   const fresh=await read(),nextIds=entry.type==='restore'?[]:[...new Set([...entry.before,...entry.ids])];
   if(nextIds.length>10000)throw Error('This local view is too large. Restore it before hiding more messages.');
   if(fresh.operationId===entry.operationId&&fresh.revision===entry.revision+1&&sameMarkers(fresh.hiddenIds,nextIds)){adopt(fresh);entry.result=Object.freeze({status:'applied',type:entry.type,count:entry.ids.length});return entry.result;}
   if(fresh.revision!==entry.revision||!sameMarkers(fresh.hiddenIds,entry.before)){adopt(fresh);throw Error('Your local view changed. Review it again.');}
   adopt(fresh);emit();if(!currentReview(review))throw Error('The selected originals or access changed. Review them again.');
   if(entry.revision>=Number.MAX_SAFE_INTEGER-1)throw Error('Local-view revision limit reached.');
   const next={schema:1,scope,revision:entry.revision+1,operationId:entry.operationId,hiddenIds:nextIds};
   await journal.setItem(address,next);check();const verified=await read();
   if(verified.operationId!==next.operationId||verified.revision!==next.revision||!sameMarkers(verified.hiddenIds,nextIds))throw Error('The local update could not be confirmed. Reopen the view before trying again.');
   adopt(verified);entry.result=Object.freeze({status:'applied',type:entry.type,count:entry.ids.length});return entry.result;
  },lifetime.signal);}catch(error){problem='The local change could not be confirmed. Check this view before trying again.';throw error;}finally{busy=false;if(!closed)emit();}
 });
 const localView=Object.freeze({getHiddenIds:()=>visible()?Object.freeze([...hidden]):Object.freeze([]),getSnapshot:()=>visible()?metadata:unavailableMetadata,subscribe(fn){if(closed)return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},prepareRemove:ids=>prepare('remove',ids),prepareRestore:()=>prepare('restore',[]),isReviewCurrent:currentReview,confirm});
 return Object.freeze({localView,...(client.getAdmission?{getAdmission:()=>admitted()?client.getAdmission():null}:{}),...(client.markRead?{markRead:()=>{if(visible())client.markRead();}}:{}),getSnapshot:()=>visible()?snapshot:closed?closedSnapshot:unavailable,subscribe(fn){if(closed)return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},
  async refresh(){await client.refresh();return serial(()=>exclusive(address,async()=>{try{adopt(await read());problem=null;}catch(error){broken=true;throw error;}finally{if(!closed)emit();}},lifetime.signal));},
  ...(client.loadOlder?{loadOlder:async()=>{check();await client.loadOlder();check();}}:{}),
  ...(client.showLatest?{showLatest:async()=>{check();await client.showLatest();check();}}:{}),
  ...(client.pinReplyOriginal?{pinReplyOriginal:id=>{check();if(hidden.has(id)||!snapshot.messages.some(row=>row.id===id))throw Error('Choose a visible original');client.pinReplyOriginal(id);},clearReplyOriginal:()=>client.clearReplyOriginal?.(),isPinnedReplyOriginal:id=>visible()&&!hidden.has(id)&&client.isPinnedReplyOriginal?.(id)===true}:{}),
  prepareAttempt(text,replyTo=null){check();if(replyTo&&!snapshot.messages.some(row=>row.id===replyTo)&&!(client.isPinnedReplyOriginal?.(replyTo)&&!hidden.has(replyTo)))throw Error('Choose a visible reply original.');return client.prepareAttempt(text,replyTo);},
  acknowledgeAttempt:id=>client.acknowledgeAttempt(id),
  send(value){check();if(value.replyTo&&!snapshot.messages.some(row=>row.id===value.replyTo)&&!(client.isPinnedReplyOriginal?.(value.replyTo)&&!hidden.has(value.replyTo)))throw Error('Choose a visible reply original.');return client.send(value);},
  flushLocalView:()=>queue,close,
 });
}
