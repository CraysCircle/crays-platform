import {verifyEvent} from 'nostr-tools';
import {openBrowserAttemptOutbox} from './browserAttemptOutbox.mjs';
import {validMessageText} from './messageLimits.mjs';

const format='crays-original-mdk-current-v1';
const fields=['accountId','conversationId','groupId','membershipId','pubkey','kind'];
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const requestId=value=>typeof value==='string'&&/^[a-zA-Z0-9:_-]{1,200}$/.test(value);
const failure=()=>Error('The current group message could not be confirmed');

/** Exact original-MDK text publication and reconciliation. No Core admission
 * is manufactured here: the controller must supply a current independent grant,
 * its actual encrypted membership journal and its admitted ciphertext network.
 * Engine snapshot, attempt and exact wire are durable BEFORE network publication.
 * An unknown outcome never causes fresh encryption or automatic republishing.
 */
export async function openMdkOutgoingPublisher({binding:input,runtime,journal,network,getAdmission,authorize,signal,crypto=globalThis.crypto}){
 const binding=Object.freeze({...input});let closed=false;
 const same=actual=>actual?.storageFormat===format&&fields.every(key=>actual[key]===binding[key]);
 if(runtime?.storageFormat!==format||runtime.accountPubkey!==binding.pubkey||!fields.every(key=>typeof binding[key]==='string'&&binding[key])||typeof runtime.run!=='function'||typeof getAdmission!=='function'||typeof authorize!=='function'||!signal?.addEventListener||['getItem','setItem','removeItem','exclusive'].some(key=>typeof journal?.[key]!=='function')||typeof network?.publish!=='function'||typeof network?.request!=='function')throw failure();
 function check(action='read'){
  if(closed||signal.aborted||!same(getAdmission())||authorize(binding,action)!==true)throw failure();
 }
 const current=()=>{try{check('send');return true;}catch{return false;}};
 const close=()=>{closed=true;signal.removeEventListener('abort',close);};
 signal.addEventListener('abort',close,{once:true});
 const relays=()=>{
  check();const value=getAdmission().relays;
  if(!Array.isArray(value)||value.length<1||value.length>100||new Set(value).size!==value.length||value.some(url=>typeof url!=='string'||url.length>2048))throw failure();
  return [...value];
 };
 const key=id=>'outgoing:'+id;
 function validate(record,id){
  if(!record)return null;
  if(record.schema!==format||record.requestId!==id||record.groupId!==binding.groupId||record.membershipId!==binding.membershipId||record.author!==binding.pubkey||!validMessageText(record.text)||!record.text.trim()||record.replyTo!==null&&!hex(record.replyTo)||!hex(record.messageId)||!['unconfirmed','sent-to-relay'].includes(record.status)||!verifyEvent(record.event)||record.event.kind!==445)throw failure();
  return record;
 }
 const receipt=record=>Object.freeze({status:record.status,requestId:record.requestId,messageId:record.messageId,eventIds:Object.freeze([record.event.id])});
 let outbox;
 try{
  check();relays();
  outbox=await openBrowserAttemptOutbox({accountKey:JSON.stringify([binding.accountId,binding.pubkey]),conversationId:binding.conversationId,storage:journal,exclusive:journal.exclusive,crypto});check();
 }catch(error){close();throw error;}
 async function reconcile(record){
  check();if(record.status==='sent-to-relay')return record;
  const sources=relays(),events=await network.request(sources,{kinds:[445],ids:[record.event.id],limit:1},signal);check();
  if(events.some(event=>event.id===record.event.id&&verifyEvent(event))){record={...record,status:'sent-to-relay'};await journal.setItem(key(record.requestId),record);check();await outbox.confirm(record.requestId,receipt(record));check();}
  return record;
 }
 return Object.freeze({storageFormat:format,
  async prepareAttempt(text,replyTo=null){check('send');if(!validMessageText(text)||!text.trim()||replyTo!==null&&!hex(replyTo))throw failure();const result=await outbox.prepare(text,replyTo);check('send');return result;},
  async acknowledgeAttempt(id){check();if(!requestId(id))throw failure();return outbox.acknowledge(id);},
  async readReceipt(id){check();if(!requestId(id))throw failure();const record=validate(await journal.getItem(key(id)),id);check();return record?receipt(record):null;},
  async send({requestId:id,text,replyTo=null}){
   check('send');if(!requestId(id)||!validMessageText(text)||!text.trim()||replyTo!==null&&!hex(replyTo))throw failure();
   return journal.exclusive('outgoing-publication',async()=>{
    check('send');const claim=await outbox.claim(id,text,replyTo);check('send');
    let record=validate(await journal.getItem(key(id)),id);check('send');
    if(record&&(record.text!==text||record.replyTo!==replyTo))throw failure();
    if(!claim.canPublish){if(!record)throw failure();return receipt(await reconcile(record));}
    if(record)throw failure(); // Never encrypt again for an existing intent.
    const raw=JSON.parse(await runtime.run(account=>account.send_chat_attempt(binding.groupId,text,id,replyTo??undefined)));check('send');
    const result=raw.ApplicationMessage;
    // Queued epoch work is not a published message. Keep the claimed attempt
    // unresolved until its original engine outcome can be reconciled.
    if(!result||!hex(result.app_event_id)||!Array.isArray(result.msg?.payload)||result.msg.payload.length>2*1024*1024||result.msg.payload.some(byte=>!Number.isInteger(byte)||byte<0||byte>255))throw failure();
    const event=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(result.msg.payload)));
    record=validate({schema:format,requestId:id,groupId:binding.groupId,membershipId:binding.membershipId,author:binding.pubkey,text,replyTo,messageId:result.app_event_id,event,status:'unconfirmed'},id);
    await journal.setItem(key(id),record);check('send');const sources=relays();
    try{
     const acknowledgements=await network.publish(sources,event,{signal,beforeSend:current});check('send');
     if(sources.some(relay=>acknowledgements?.[relay]?.ok===true)){
      const confirmed={...record,status:'sent-to-relay'};await journal.setItem(key(id),confirmed);check('send');record=confirmed;await outbox.confirm(id,receipt(record));check('send');
     }
    }catch(error){check('send');return receipt(record);}
    return receipt(record);
   });
  },close,
 });
}
