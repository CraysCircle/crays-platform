/** Real browser WebRTC media engine. Signaling is supplied by an independently authorized
 * encrypted conversation port. This module never discovers peers, opens a microphone
 * automatically, chooses a public ICE provider, or claims that relay ACK means a call. */
export function createCallMediaSession({isAuthorized,signal,iceServers=[],allowLoopbackQualification=false,
 createPeerConnection=config=>new RTCPeerConnection(config),
 getUserMedia=constraints=>navigator.mediaDevices.getUserMedia(constraints),onIceCandidate}){
 if(!signal||typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'||typeof signal.aborted!=='boolean'||typeof isAuthorized!=='function'||typeof onIceCandidate!=='function'||!Array.isArray(iceServers)||iceServers.length>8)throw Error('Explicit call authority and ICE configuration required');
 const configuration=structuredClone(iceServers);
 for(const server of configuration){
  if(!server||typeof server!=='object'||Object.keys(server).some(k=>!['urls','username','credential'].includes(k)))throw Error('Invalid call ICE configuration');
  const urls=typeof server.urls==='string'?[server.urls]:server.urls;
  if(!Array.isArray(urls)||!urls.length||urls.length>8||urls.some(url=>typeof url!=='string'||url.length>2048||!/^turns?:[^\s]+$/.test(url)))throw Error('Explicit TURN relay required');
  if(typeof server.username!=='string'||!server.username||typeof server.credential!=='string'||!server.credential)throw Error('TURN credentials required');
 }
 if(!configuration.length&&allowLoopbackQualification!==true)throw Error('Call relay is not configured');
 const listeners=new Set();let closed=false,pc,stream,remoteTracks=[],kind,serial=Promise.resolve(),mediaRequested=false;
 let snapshot=Object.freeze({state:'idle',kind:null,localStream:null,remoteTracks:Object.freeze([]),muted:false,cameraOff:false,problem:null});
 const current=()=>!closed&&!signal.aborted&&isAuthorized()===true;
 const emit=changes=>{snapshot=Object.freeze({...snapshot,...changes});for(const fn of listeners)fn();};
 const stopStream=value=>{for(const track of value?.getTracks()||[])track.stop();};
 const close=(reason='closed')=>{if(closed)return;closed=true;signal.removeEventListener('abort',revoked);stopStream(stream);stream=undefined;for(const track of remoteTracks)track.stop();remoteTracks=[];if(pc){pc.onicecandidate=null;pc.ontrack=null;pc.onconnectionstatechange=null;pc.close();}emit({state:reason,localStream:null,remoteTracks:Object.freeze([])});};
 const revoked=()=>close('unavailable');signal.addEventListener('abort',revoked,{once:true});if(signal.aborted)revoked();
 const check=()=>{if(!current()){close('unavailable');throw Error('Current call authorization required');}};
 const guarded=operation=>{const next=serial.then(async()=>{check();try{return await operation();}catch(error){if(!closed){emit({problem:'The call could not be connected.'});close('failed');}throw error;}});serial=next.catch(()=>{});return next;};
 const description=(value,type)=>{if(!value||value.type!==type||typeof value.sdp!=='string'||value.sdp.length<1||value.sdp.length>131072||/^m=application /m.test(value.sdp))throw Error('Invalid media session description');return{type,sdp:value.sdp};};
 const ensurePeer=()=>{
  check();if(pc)return pc;pc=createPeerConnection({iceServers:configuration,iceTransportPolicy:allowLoopbackQualification===true?'all':'relay',bundlePolicy:'max-bundle'});
  pc.onicecandidate=event=>{if(!current()){close('unavailable');return;}if(!event.candidate)return;const candidate=event.candidate.toJSON();Promise.resolve().then(()=>{check();return onIceCandidate(candidate);}).catch(()=>{if(!closed){emit({problem:'Call signaling is unavailable.'});close('failed');}});};
  pc.ontrack=event=>{if(!current()){event.track.stop();close('unavailable');return;}if(!['audio','video'].includes(event.track.kind)||kind==='voice'&&event.track.kind==='video'){event.track.stop();close('failed');return;}if(!remoteTracks.includes(event.track))remoteTracks.push(event.track);emit({remoteTracks:Object.freeze([...remoteTracks])});};
  pc.onconnectionstatechange=()=>{if(!current()){close('unavailable');return;}const state=pc.connectionState;if(state==='failed'||state==='closed'){close(state);return;}emit({state:state==='connected'?'connected':state==='disconnected'?'disconnected':'connecting'});};return pc;
 };
 const capture=async mediaKind=>{
  check();if(mediaRequested||!['voice','video'].includes(mediaKind))throw Error('Explicit single call media selection required');mediaRequested=true;kind=mediaKind;emit({state:'acquiring',kind});
  const acquired=await getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:kind==='video'?{width:{ideal:1280},height:{ideal:720},facingMode:'user'}:false});
  if(!current()){stopStream(acquired);check();}
  stream=acquired;const tracks=stream.getTracks();if(!tracks.some(t=>t.kind==='audio')||kind==='video'&&!tracks.some(t=>t.kind==='video')||tracks.some(t=>!['audio','video'].includes(t.kind)||kind==='voice'&&t.kind==='video'))throw Error('Requested call devices are unavailable');
  const peer=ensurePeer();for(const track of tracks){track.addEventListener('ended',()=>{if(!closed)close('ended');},{once:true});peer.addTrack(track,stream);}emit({localStream:stream,state:'connecting'});
 };
 return Object.freeze({
  getSnapshot(){if(!current()){close('unavailable');}return snapshot;},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  // Invoked only after the user explicitly presses Call or Accept.
  offer:mediaKind=>guarded(async()=>{await capture(mediaKind);check();await pc.setLocalDescription(await pc.createOffer());check();return description(pc.localDescription,'offer');}),
  answer:(offer,mediaKind)=>guarded(async()=>{const input=description(offer,'offer');await capture(mediaKind);check();await pc.setRemoteDescription(input);check();await pc.setLocalDescription(await pc.createAnswer());check();return description(pc.localDescription,'answer');}),
  acceptAnswer:answer=>guarded(async()=>{if(!pc||!mediaRequested||pc.signalingState!=='have-local-offer')throw Error('No pending call offer');await pc.setRemoteDescription(description(answer,'answer'));check();}),
  addIceCandidate:candidate=>guarded(async()=>{if(!pc?.remoteDescription)throw Error('Remote call description required before ICE');if(!candidate||typeof candidate.candidate!=='string'||candidate.candidate.length>4096||candidate.sdpMid!==null&&candidate.sdpMid!==undefined&&typeof candidate.sdpMid!=='string'||candidate.sdpMLineIndex!==null&&candidate.sdpMLineIndex!==undefined&&(!Number.isInteger(candidate.sdpMLineIndex)||candidate.sdpMLineIndex<0||candidate.sdpMLineIndex>64))throw Error('Invalid call ICE candidate');await pc.addIceCandidate({candidate:candidate.candidate,sdpMid:candidate.sdpMid??null,sdpMLineIndex:candidate.sdpMLineIndex??null,usernameFragment:candidate.usernameFragment??null});check();}),
  setMuted(value){check();if(typeof value!=='boolean'||!stream)throw Error('No active microphone');for(const track of stream.getAudioTracks())track.enabled=!value;emit({muted:value});},
  setCameraOff(value){check();if(typeof value!=='boolean'||kind!=='video'||!stream)throw Error('No active camera');for(const track of stream.getVideoTracks())track.enabled=!value;emit({cameraOff:value});},
  async getStats(){check();if(!pc)throw Error('Call has not started');const stats=await pc.getStats();check();return stats;},
  close(){close();listeners.clear();},
 });
}
