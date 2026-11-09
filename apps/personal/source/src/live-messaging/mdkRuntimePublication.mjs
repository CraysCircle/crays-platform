import {verifyEvent} from 'nostr-tools/pure';

const failure=()=>Error('Private group publication unavailable');
const hex=bytes=>{
 if(!Array.isArray(bytes)||!bytes.length||bytes.length>64||bytes.some(v=>!Number.isInteger(v)||v<0||v>255))throw failure();
 return bytes.map(v=>v.toString(16).padStart(2,'0')).join('');
};
/** Original AccountDeviceRuntime TransportPublishRequest -> existing private
 * Core-authorized network. The independent checkpoint commits the runtime's
 * exact durable evolution/fanout intent BEFORE any event reaches the network.
 * No success from a SQL row, queued state, missing ack or retryable exception.
 */
export function openMdkRuntimePublication({account,network,isCurrent,checkpoint,authorize}){
 if(!account?.identity||!account.signal?.addEventListener||typeof network?.publish!=='function'||typeof isCurrent!=='function'||typeof checkpoint!=='function'||typeof authorize!=='function')throw failure();
 const identity=account.identity;
 const check=()=>{
  if(account.signal.aborted||isCurrent()!==true||identity.publicBindingVerified!==true||identity.emailVerificationRequired!==false||identity.accountId!==account.accountId||!/^[a-f0-9]{64}$/.test(identity.pubkey)||!/^[a-f0-9]{64}$/.test(identity.bindingFingerprint))throw failure();
 };
 check();
 return Object.freeze({async publish(request,{beforePublication}={}){
  check();
  if(!request||hex(request.account_id)!==identity.pubkey||!Number.isSafeInteger(request.required_acks)||request.required_acks<0||request.required_acks>20)throw failure();
  const target=request.target,keys=Object.keys(target??{});
  if(keys.length!==1||!['Group','Inbox'].includes(keys[0]))throw failure();
  const kind=keys[0],route=target[kind],endpoints=route?.endpoints;
  if(!Array.isArray(endpoints)||!endpoints.length||endpoints.length>20||new Set(endpoints).size!==endpoints.length||endpoints.some(v=>typeof v!=='string'||!v.length||v.length>2048))throw failure();
  const payload=request.message?.payload;
  if(!Array.isArray(payload)||!payload.length||payload.length>4*1024*1024||payload.some(v=>!Number.isInteger(v)||v<0||v>255))throw failure();
  const event=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(payload)));
  if(!verifyEvent(event)||event.id!==hex(request.message.id))throw failure();
  const envelope=request.message.envelope;
  if(kind==='Group'){
   const routeId=hex(route.transport_group_id);
   if(hex(envelope?.GroupMessage?.transport_group_id)!==routeId||event.kind!==445||event.tags.filter(t=>t[0]==='h').length!==1||event.tags.find(t=>t[0]==='h')?.[1]!==routeId)throw failure();
   hex(route.group_id);
  }else{
   const recipient=hex(route.recipient);
   if(hex(envelope?.Welcome?.recipient)!==recipient||event.kind!==1059||event.tags.filter(t=>t[0]==='p').length!==1||event.tags.find(t=>t[0]==='p')?.[1]!==recipient)throw failure();
  }
  if(await authorize(request)!==true)throw failure();check();
  await checkpoint();check(); // Existing account/device encrypted CAS store.
  // Only validated public wire metadata leaves this port. Persist the UI
  // attempt's correlation BEFORE wire dispatch, never ciphertext or MLS refs.
  if(beforePublication){await beforePublication(Object.freeze({transportId:event.id,kind:kind==='Group'?'group':'welcome',groupId:kind==='Group'?hex(route.group_id):null,recipient:kind==='Inbox'?hex(route.recipient):null}));check();}
  const accepted=[],failed=[];
  for(const endpoint of endpoints){
   // Every endpoint attempt receives fresh admission. A refusal here is
   // proven unexposed; an exception after publish begins is ambiguous.
   try{if(await authorize(request)!==true)throw failure();check();}catch{
    failed.push({endpoint,reason:'Current group authorization unavailable',kind:'not_exposed',rejection_category:null});continue;
   }
   try{
    const replies=await network.publish([endpoint],event,{signal:account.signal,beforeSend:()=>{try{check();return true;}catch{return false;}}});
    check();const reply=replies?.[endpoint];
    if(!reply||typeof reply.ok!=='boolean')throw failure();
    if(reply.ok)accepted.push({endpoint,accepted_at:Math.floor(Date.now()/1000),ack_kind:'affirmative'});
    else if(reply.uncertain===true)failed.push({endpoint,reason:'Relay acknowledgement unavailable',kind:'possibly_exposed',rejection_category:null});
    else if(reply.uncertain===false)failed.push({endpoint,reason:'Publication did not reach relay',kind:'not_exposed',rejection_category:null});
    else failed.push({endpoint,reason:'Relay rejected publication',kind:'terminal_rejected',rejection_category:null});
   }catch{
    failed.push({endpoint,reason:'Relay acknowledgement unavailable',kind:'possibly_exposed',rejection_category:null});
   }
  }
  check();return {message_id:request.message.id,accepted,failed,required_acks:request.required_acks};
 }});
}
