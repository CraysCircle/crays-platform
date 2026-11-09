import {getEventHash} from 'nostr-tools/pure';
import {openBrowserAttemptOutbox} from './browserAttemptOutbox.mjs';
import {validMessageText} from './messageLimits.mjs';
const format='crays-original-mdk-current-v1',schema='crays.original-mdk-device-command.v1';
const fields=['accountId','conversationId','groupId','membershipId','pubkey','kind'];
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const requestId=value=>typeof value==='string'&&/^[a-zA-Z0-9:_-]{1,200}$/.test(value);
const failure=()=>Error('This group message could not be confirmed');
/** Existing desktop command publisher over normal original AccountDeviceRuntime.
 * Canonical event identity is journaled before the runtime accepts it. The
 * runtime's actual SQL source/relay receipts establish publication; a claimed
 * attempt or optimistic plaintext row never does. No fallback to a raw engine.
 */
export async function openMdkDevicePublisher({binding:input,runtime,journal,getAdmission,authorize,signal,crypto=globalThis.crypto}){
 const binding=Object.freeze({...input});let closed=false;
 if(runtime?.storageFormat!==format||runtime.accountPubkey!==binding.pubkey||!fields.every(key=>typeof binding[key]==='string'&&binding[key])||typeof runtime.sendChatEvent!=='function'||typeof runtime.reconcile!=='function'||typeof authorize!=='function'||typeof getAdmission!=='function'||!signal?.addEventListener||['getItem','setItem','removeItem','exclusive'].some(key=>typeof journal?.[key]!=='function'))throw failure();
 function check(action='read'){const grant=getAdmission();if(closed||signal.aborted||grant?.storageFormat!==format||!fields.every(key=>grant[key]===binding[key])||authorize(binding,action)!==true)throw failure();}
 const close=()=>{closed=true;signal.removeEventListener('abort',close);};signal.addEventListener('abort',close,{once:true});
 const key=id=>'device-outgoing:'+id;
 function validate(record,id){
  if(record==null)return null;
  if(record.schema!==schema||record.requestId!==id||record.groupId!==binding.groupId||record.membershipId!==binding.membershipId||record.author!==binding.pubkey||!validMessageText(record.text)||!record.text.trim()||record.replyTo!==null&&!hex(record.replyTo)||!['unconfirmed','sent-to-relay'].includes(record.status)||record.event?.kind!==9||record.event.pubkey!==binding.pubkey||record.event.content!==record.text||record.event.id!==getEventHash(record.event)||record.event.tags.filter(tag=>tag[0]==='crays-request').length!==1||record.event.tags.find(tag=>tag[0]==='crays-request')?.[1]!==id||record.transportId!==null&&!hex(record.transportId)||record.status==='sent-to-relay'&&!hex(record.transportId))throw failure();
  const reply=record.event.tags.filter(tag=>tag[0]==='e');if(record.replyTo===null?reply.length!==0:reply.length!==1||reply[0]?.[1]!==record.replyTo)throw failure();return record;
 }
 const receipt=record=>Object.freeze({status:record.status,requestId:record.requestId,messageId:record.event.id,eventIds:Object.freeze(record.transportId?[record.transportId]:[])});
 check();const outbox=await openBrowserAttemptOutbox({accountKey:JSON.stringify([binding.accountId,binding.pubkey]),conversationId:binding.conversationId,storage:journal,exclusive:journal.exclusive,crypto});check();
 async function confirm(record,transportId){
  check();if(!hex(transportId))throw failure();if(record.transportId&&record.transportId!==transportId)throw failure();
  if(record.status!=='sent-to-relay'){record={...record,transportId,status:'sent-to-relay'};await journal.setItem(key(record.requestId),record);check();await outbox.confirm(record.requestId,receipt(record));check();}return record;
 }
 return Object.freeze({storageFormat:format,
  async prepareAttempt(text,replyTo=null){check('send');if(!validMessageText(text)||!text.trim()||replyTo!==null&&!hex(replyTo))throw failure();const result=await outbox.prepare(text,replyTo);check('send');return result;},
  async acknowledgeAttempt(id){check();if(!requestId(id))throw failure();return outbox.acknowledge(id);},
  async readReceipt(id){check();if(!requestId(id))throw failure();const record=validate(await journal.getItem(key(id)),id);check();return record?receipt(record):null;},
  async observeTimeline(page){
   check();if(!Array.isArray(page?.messages)||page.messages.length>200)throw failure();
   // One canonical page read already performed by the command client. This
   // restores receipts after a crash between original SQL commit and journal
   // notification without another per-message network/engine round trip.
   for(const row of page.messages){
    if(row.group_id_hex!==binding.groupId)throw failure();
    if(row.sender!==binding.pubkey||row.kind!==9||row.deleted||row.invalidation_status!==null||!hex(row.source_message_id_hex)||row.retention_expires_at!=null&&row.retention_expires_at<=Date.now()/1000)continue;
    const id=row.tags?.find(tag=>tag[0]==='crays-request')?.[1];if(!requestId(id))continue;
    const record=validate(await journal.getItem(key(id)),id);check();
    if(record&&record.event.id===row.message_id_hex&&record.text===row.plaintext)await confirm(record,row.source_message_id_hex);
   }
  },
  async send({requestId:id,text,replyTo=null}){
   check('send');if(!requestId(id)||!validMessageText(text)||!text.trim()||replyTo!==null&&!hex(replyTo))throw failure();
   return journal.exclusive('device-outgoing-publication',async()=>{
    check('send');const claim=await outbox.claim(id,text,replyTo);check('send');let record=validate(await journal.getItem(key(id)),id);check('send');
    if(record&&(record.text!==text||record.replyTo!==replyTo))throw failure();
    if(!record){
     if(!claim.canPublish)throw failure();const event={pubkey:binding.pubkey,kind:9,created_at:Math.floor(Date.now()/1000),tags:[['crays-request',id],...(replyTo?[['e',replyTo]]:[])],content:text};
     record=validate({schema,requestId:id,groupId:binding.groupId,membershipId:binding.membershipId,author:binding.pubkey,text,replyTo,event:{...event,id:getEventHash(event)},transportId:null,status:'unconfirmed'},id);
     await journal.setItem(key(id),record);check('send');
    }
    if(record.status==='sent-to-relay')return receipt(record);
    const result=await runtime.sendChatEvent(binding.groupId,record.event);check('send');
    const published=result.publishedAppMessages?.find(row=>row.groupId===binding.groupId&&row.appEventId===record.event.id);
    if(published)record=await confirm(record,published.transportId);
    else if(result.existingAppEventId===record.event.id&&result.confirmedTransportId)record=await confirm(record,result.confirmedTransportId);
    else if(result.existingAppEventId===record.event.id){const recovered=await runtime.reconcile(binding.groupId);check('send');const original=recovered.publishedAppMessages?.find(row=>row.groupId===binding.groupId&&row.appEventId===record.event.id);if(original)record=await confirm(record,original.transportId);}
    check('send');return receipt(record);
   });
  },close,
 });
}
