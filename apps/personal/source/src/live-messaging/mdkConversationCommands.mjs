import {validMessageText} from './messageLimits.mjs';
const format='crays-original-mdk-current-v1';
const fields=['accountId','conversationId','groupId','membershipId','pubkey','kind'];
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const failure=()=>Error('The admitted group conversation is unavailable');

/** Normal desktop command client for the explicitly admitted original backend.
 * The timeline adapter retains original canonical ordering/pagination. This
 * client supplies actual durable publication receipts and local pending rows;
 * a persisted outgoing SQL row alone never becomes a sent receipt.
 */
export async function openMdkConversationCommands({binding:input,runtime,publisher,getAdmission,authorize,signal}){
 const binding=Object.freeze({...input});
 if(runtime?.storageFormat!==format||publisher?.storageFormat!==format||runtime.accountPubkey!==binding.pubkey||typeof getAdmission!=='function'||typeof authorize!=='function'||!signal?.addEventListener||['readTimeline','subscribeTimeline'].some(key=>typeof runtime[key]!=='function')||['prepareAttempt','acknowledgeAttempt','readReceipt','send','close'].some(key=>typeof publisher[key]!=='function'))throw failure();
 const listeners=new Set(),rows=new Map(),pending=new Map(),requests=new Map();
 let closed=false,verified=false,sending=0,problem=null,inFlight=null,generation=0,unsubscribe;
 let snapshot=Object.freeze({state:'loading',available:false,messages:Object.freeze([]),sending:false,problem:null});
 const admitted=()=>{try{const actual=getAdmission();return !closed&&!signal.aborted&&actual?.storageFormat===format&&fields.every(key=>actual[key]===binding[key])&&authorize(binding,'read')===true;}catch{return false;}};
 function check(action='read'){if(!admitted()||authorize(binding,action)!==true)throw failure();}
 const notify=()=>{for(const listener of listeners)try{listener();}catch{}};
 function close(){if(closed)return;closed=true;generation++;signal.removeEventListener('abort',close);unsubscribe?.();publisher.close();rows.clear();pending.clear();requests.clear();snapshot=Object.freeze({state:'closed',available:false,messages:Object.freeze([]),sending:false,problem:null});notify();listeners.clear();}
 function emit(){
  if(!admitted()){close();return;}
  snapshot=Object.freeze({state:problem?'offline':'ready',available:true,canSend:verified&&authorize(binding,'send')===true,supportsReplies:true,supportsAttachments:false,messages:Object.freeze([...rows.values(),...pending.values()]),sending:sending>0,problem});notify();
 }
 function refresh(){
  if(inFlight)return inFlight;
  try{check();}catch(error){close();return Promise.reject(error);}
  const token=++generation;
  const work=(async()=>{try{
   const page=await runtime.readTimeline(binding.groupId,{limit:200});check();if(token!==generation)return;
   if(!Array.isArray(page?.messages)||page.messages.length>200)throw failure();
   if(typeof publisher.observeTimeline==='function'){await publisher.observeTimeline(page);check();if(token!==generation)return;}
   const next=new Map(),confirmedRequests=new Set();
   for(const row of page.messages){
    if(row.group_id_hex!==binding.groupId||!hex(row.message_id_hex)||typeof row.plaintext!=='string')throw failure();
    if(row.kind!==9||row.sender!==binding.pubkey||row.deleted||row.invalidation_status!==null||row.retention_expires_at!=null&&row.retention_expires_at<=Date.now()/1000)continue;
    const id=row.tags?.find(tag=>tag[0]==='crays-request')?.[1];if(!id)continue;
    const receipt=await publisher.readReceipt(id);check();if(token!==generation)return;
    const known=receipt?.messageId===row.message_id_hex&&receipt.requestId===id;
    const message=Object.freeze({id:row.message_id_hex,requestId:id,text:row.plaintext,author:binding.pubkey,createdAt:row.timeline_at,status:known&&receipt.status==='sent-to-relay'?'sent-to-relay':'unconfirmed',...(hex(row.reply_to_message_id_hex)?{replyTo:row.reply_to_message_id_hex}:{}),...(known?{eventIds:[...receipt.eventIds]}:{})});
    next.set(message.id,message);const local=pending.get(id);if(local&&local.text===message.text&&(local.replyTo??null)===(message.replyTo??null))confirmedRequests.add(id);
   }
   if(token!==generation)return;rows.clear();for(const entry of next)rows.set(...entry);for(const id of confirmedRequests)pending.delete(id);verified=true;problem=null;
  }catch(error){if(!admitted())close();else if(token===generation){verified=false;problem='Group history could not be verified. Try again.';rows.clear();}throw error;}
  finally{if(!closed)emit();}})();
  inFlight=work;void work.finally(()=>{if(inFlight===work)inFlight=null;}).catch(()=>{});return work;
 }
 const changed=change=>{
  if(change?.kind==='closed'||!admitted()){close();return;}
  generation++;if(change?.kind!=='append'){verified=false;rows.clear();pending.clear();}emit();
  const prior=inFlight??Promise.resolve();void prior.catch(()=>{}).then(()=>refresh()).catch(()=>{});
 };
 signal.addEventListener('abort',close,{once:true});
 try{check();unsubscribe=runtime.subscribeTimeline(changed);await refresh();check();}catch(error){close();throw error;}
 return Object.freeze({storageFormat:format,getAdmission:()=>admitted()?binding:null,
  getSnapshot(){if(!admitted())close();return snapshot;},subscribe(listener){if(closed)return()=>{};listeners.add(listener);return()=>listeners.delete(listener);},refresh,
  async prepareAttempt(text,replyTo=null){check('send');if(!verified)throw failure();return publisher.prepareAttempt(text,replyTo);},
  async acknowledgeAttempt(id){check();return publisher.acknowledgeAttempt(id);},
  async send({text,requestId:id,replyTo=null}){
   check('send');if(!verified||!validMessageText(text)||!text.trim()||replyTo!==null&&!hex(replyTo))throw failure();
   if(id===undefined)id=(await publisher.prepareAttempt(text,replyTo)).requestId;check('send');
   const prior=requests.get(id);if(prior){if(prior.text!==text||prior.replyTo!==replyTo)throw failure();return prior.work;}
   if(requests.size>=1000)throw Error('Return to this conversation before sending more messages.');
   const message={id:'pending:'+id,requestId:id,text,replyTo,author:binding.pubkey,createdAt:Math.floor(Date.now()/1000),status:'sending'};
   pending.set(id,Object.freeze(message));sending++;emit();
   const work=(async()=>{try{
    const receipt=await publisher.send({text,requestId:id,replyTo});check('send');
    pending.delete(id);rows.set(receipt.messageId,Object.freeze({...message,id:receipt.messageId,status:receipt.status,eventIds:[...receipt.eventIds]}));
    problem=receipt.status==='unconfirmed'?'The relay has not confirmed this message yet.':null;return receipt;
   }catch(error){if(admitted()){const current=pending.get(id);if(current)pending.set(id,Object.freeze({...current,status:'unconfirmed'}));problem='This message is unconfirmed. Your draft has been kept.';}throw error;}
   finally{sending--;if(!closed){emit();void refresh().catch(()=>{});}}})();
   requests.set(id,{text,replyTo,work});void work.finally(()=>{if(requests.get(id)?.work===work)requests.delete(id);}).catch(()=>{});return work;
  },close,
 });
}
