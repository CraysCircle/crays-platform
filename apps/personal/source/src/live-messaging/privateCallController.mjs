import {createCallMediaSession} from './callMediaSession.mjs';
/** One explicitly admitted peer call within the current human conversation.
 * Chuck does not use this controller. Group mesh calls require a separate roster controller. */
export function createPrivateCallController({signaling,authorize,signal,iceServers,allowLoopbackQualification=false,createMedia=createCallMediaSession,ringTimeoutMs=60000}){
 if(!signaling?.send||!signaling?.subscribe||typeof authorize!=='function'||!signal?.addEventListener||!Number.isFinite(ringTimeoutMs)||ringTimeoutMs<1000||ringTimeoutMs>60000)throw Error('Explicit current human call scope required');
 const listeners=new Set();let closed=false,call,serial=Promise.resolve(),timer,unsubscribe,queued=0;const ended=new Map();
 let snapshot=Object.freeze({state:'idle',callId:null,kind:null,localStream:null,remoteTracks:Object.freeze([]),muted:false,cameraOff:false,problem:null});
 const current=()=>!closed&&!signal.aborted&&authorize()===true;
 const emit=changes=>{snapshot=Object.freeze({...snapshot,...changes});for(const fn of listeners)fn();};
 const finish=(state,problem=null)=>{clearTimeout(timer);if(call){ended.set(call.id,Date.now());while(ended.size>256)ended.delete(ended.keys().next().value);const previous=call;call=null;previous.unsubscribe?.();previous.lifetime.abort();previous.media?.close();}emit({state,localStream:null,remoteTracks:Object.freeze([]),problem});};
 const check=()=>{if(!current()){finish('unavailable');throw Error('Current call access required');}};
 const close=()=>{if(closed)return;closed=true;signal.removeEventListener('abort',close);unsubscribe?.();finish('unavailable');listeners.clear();};
 signal.addEventListener('abort',close,{once:true});
 const still=entry=>current()&&call===entry;
 // Browser WebRTC promises can remain pending when the peer is closed. A
 // finished call must release the serial signaling queue for the next call,
 // while the original operation remains observed and fenced by its entry.
 const duringCall=async(entry,operation)=>{if(!still(entry))throw Error('Call changed');let aborted;const cancelled=new Promise((_,reject)=>{aborted=()=>reject(Error('Call changed'));entry.lifetime.signal.addEventListener('abort',aborted,{once:true});if(entry.lifetime.signal.aborted)aborted();});try{return await Promise.race([Promise.resolve().then(()=>{if(!still(entry))throw Error('Call changed');return operation();}),cancelled]);}finally{entry.lifetime.signal.removeEventListener('abort',aborted);}};
 const send=async(entry,action,content='',callType)=>{check();const result=await signaling.send({action,callId:entry.id,content,signal:entry.lifetime.signal,...(callType?{callType}:{})});if(!still(entry))throw Error('Call changed');if(result.state!=='sent-to-relay')throw Error('Call signal not confirmed');return result;};
 const deadline=entry=>{clearTimeout(timer);timer=setTimeout(()=>{if(still(entry)){const id=entry.id;finish('ended','The call was not answered.');void signaling.send({action:'hangup',callId:id,content:'timeout',signal}).catch(()=>{});}},ringTimeoutMs);};
 const flushOutbound=async entry=>{if(!entry.descriptionSent)return;while(entry.outbound.length){if(!still(entry))return;await send(entry,'ice',JSON.stringify(entry.outbound.shift()));}};
 const flushInbound=async entry=>{while(entry.remoteReady&&entry.inbound.length){if(!still(entry))return;const candidate=entry.inbound.shift();await duringCall(entry,()=>entry.media.addIceCandidate(candidate));}};
 const makeMedia=entry=>{
  const media=createMedia({isAuthorized:()=>still(entry),signal:entry.lifetime.signal,iceServers,allowLoopbackQualification,onIceCandidate:candidate=>{
   if(!still(entry))return;if(entry.outbound.length>=64)throw Error('Call ICE bound exceeded');entry.outbound.push({candidate:candidate.candidate,sdpMid:candidate.sdpMid,sdpMLineIndex:candidate.sdpMLineIndex});
   entry.outgoing=entry.outgoing.then(()=>flushOutbound(entry)).catch(()=>{if(still(entry))finish('failed','Call signaling is unavailable.');});
  }});entry.media=media;entry.unsubscribe=media.subscribe(()=>{if(!still(entry))return;const value=media.getSnapshot();if(['failed','unavailable','ended','closed'].includes(value.state)){finish(value.state,value.problem);return;}if(value.state==='connected')clearTimeout(timer);emit({state:value.state==='idle'?snapshot.state:value.state,localStream:value.localStream,remoteTracks:value.remoteTracks,muted:value.muted,cameraOff:value.cameraOff,problem:value.problem});});return media;
 };
 const fresh=(id,kind,offer)=>({id,kind,offer,lifetime:new AbortController(),outbound:[],inbound:[],outgoing:Promise.resolve(),descriptionSent:false,remoteReady:false});
 const receive=async message=>{
  if(!current())return;
  for(const[id,time]of ended)if(Date.now()-time>90000)ended.delete(id);
  if(message.action==='hangup'||message.action==='reject')ended.set(message.callId,Date.now());while(ended.size>256)ended.delete(ended.keys().next().value);
  if(message.action==='offer'&&ended.has(message.callId))return;
  if(message.selfDevice){if(call?.id===message.callId)finish('ended','This call was handled on another device.');return;}
  if(message.action==='offer'){
   if(call){if(call.id!==message.callId)void signaling.send({action:'reject',callId:message.callId,content:'busy',signal}).catch(()=>{});return;}
   if(!['voice','video'].includes(message.callType)||!message.content)return;call=fresh(message.callId,message.callType,{type:'offer',sdp:message.content});emit({state:'ringing',callId:call.id,kind:call.kind,problem:null});deadline(call);return;
  }
  const entry=call;if(!entry||entry.id!==message.callId)return;
  if(message.action==='hangup'||message.action==='reject'){finish('ended',message.action==='reject'?'The call was declined.':null);return;}
  if(message.action==='ice'){
   let candidate;try{candidate=JSON.parse(message.content);}catch{return;}if(entry.inbound.length>=64){finish('failed','The connection could not be established.');return;}entry.inbound.push(candidate);await flushInbound(entry);return;
  }
  if(message.action==='answer'&&entry.media&&!entry.offer&&!entry.remoteReady){await duringCall(entry,()=>entry.media.acceptAnswer({type:'answer',sdp:message.content}));if(!still(entry))return;entry.remoteReady=true;await flushInbound(entry);}
 };
 if(signal.aborted)close();else {check();unsubscribe=signaling.subscribe(message=>{if(!current())return;if(queued>=64){if(call?.id===message.callId)finish('failed','Call signaling exceeded the supported limit.');return;}queued++;serial=serial.then(async()=>{const original=call;try{await receive(message);}catch{if(current()&&call===original&&call?.id===message.callId)finish('failed','The call could not be connected.');}}).finally(()=>{queued--;});});}
 return Object.freeze({
  getSnapshot:()=>snapshot,
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  async initiate(kind){
   check();if(call||!['voice','video'].includes(kind))throw Error('Call is already active or media kind invalid');const bytes=crypto.getRandomValues(new Uint8Array(16)),id=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join(''),entry=fresh(id,kind);call=entry;emit({state:'outgoing',callId:id,kind,problem:null});deadline(entry);
   try{const offer=await makeMedia(entry).offer(kind);if(!still(entry))return;await send(entry,'offer',offer.sdp,kind);entry.descriptionSent=true;await flushOutbound(entry);}catch{if(still(entry))finish('failed','The call could not be started. Check device permissions and connection.');}
  },
  async accept(){
   check();const entry=call;if(!entry?.offer||snapshot.state!=='ringing')throw Error('No incoming call to accept');emit({state:'acquiring'});
   try{const answer=await makeMedia(entry).answer(entry.offer,entry.kind);if(!still(entry))return;entry.remoteReady=true;await flushInbound(entry);await send(entry,'answer',answer.sdp);entry.descriptionSent=true;await flushOutbound(entry);}catch{if(still(entry))finish('failed','The call could not be accepted. Check device permissions and connection.');}
  },
  async hangup(){check();const entry=call;if(!entry)return;const action=snapshot.state==='ringing'?'reject':'hangup';finish('ended');try{const result=await signaling.send({action,callId:entry.id,signal,content:action==='reject'?'declined':'normal'});if(current()&&!call&&snapshot.callId===entry.id&&result.state!=='sent-to-relay')emit({problem:'The call ended here. The other device could not be notified.'});}catch{if(current()&&!call&&snapshot.callId===entry.id)emit({problem:'The call ended here. The other device could not be notified.'});}},
  setMuted(value){check();if(!call?.media)throw Error('Call not connected');call.media.setMuted(value);},
  setCameraOff(value){check();if(!call?.media)throw Error('Call not connected');call.media.setCameraOff(value);},
  async getStats(){check();if(!call?.media)throw Error('Call not connected');return call.media.getStats();},
  close,
 });
}
