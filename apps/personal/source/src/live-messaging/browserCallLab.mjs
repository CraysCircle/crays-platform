import {generateSecretKey,getPublicKey,finalizeEvent,verifyEvent,nip44} from 'nostr-tools';
import {createRelayNetwork} from './realRelayNetwork.mjs';
import {createPrivateCallSignaling} from './callSignaling.mjs';
import {createCallAccessLease} from './callAccessLease.mjs';
import {createCallMediaSession} from './callMediaSession.mjs';
import {createPrivateCallController} from './privateCallController.mjs';
/** Synthetic browser-generated identities only; not a canonical owner signer or production account adapter. */
export function createSyntheticBrowserCallActor({identityKey}={}){
 if(globalThis.__CRAYS_SYNTHETIC_CALL_LAB__!==true||!['127.0.0.1','localhost'].includes(location.hostname))throw Error('Explicit loopback call qualification required');
 if(identityKey!==undefined&&(!(identityKey instanceof Uint8Array)||identityKey.length!==32))throw Error('Volatile synthetic test identity required');
 const key=identityKey?new Uint8Array(identityKey):generateSecretKey(),pubkey=getPublicKey(key),lifetime=new AbortController();let network,signaling,controller,relay,access,makeRenderer,claimed=false,rendererReleased=false,closed=false;const published=[],observedTracks=new Set(),callTrace=[];const trace=value=>{callTrace.push(value);if(callTrace.length>128)callTrace.shift();};
 const signer={getPublicKey:async()=>{if(closed)throw Error('Closed synthetic call actor');return pubkey;},signEvent:async template=>{if(closed)throw Error('Closed synthetic call actor');trace({phase:'signed',kind:template.kind,callId:template.tags?.find(tag=>tag[0]==='call-id')?.[1]??null});return finalizeEvent(template,key);},nip44:{decrypt:async(other,ciphertext)=>{if(closed)throw Error('Closed synthetic call actor');const secret=nip44.v2.utils.getConversationKey(key,other);try{return nip44.v2.decrypt(ciphertext,secret);}finally{secret.fill(0);}}}};
 return Object.freeze({pubkey,
  async connect({relayURL,peerPubkey}){
   if(network||closed||!/^ws:\/\/127\.0\.0\.1:\d+\/$/.test(relayURL))throw Error('Explicit isolated relay required');
   relay=relayURL;network=createRelayNetwork({relays:[relayURL],createSocket:url=>new WebSocket(url),verifyEvent,expectedAuthPubkey:pubkey,signAuth:(url,challenge)=>signer.signEvent({kind:22242,created_at:Math.floor(Date.now()/1000),content:'',tags:[['relay',url],['challenge',challenge]]})});
   const transport={...network,publish:async(urls,event,options)=>{published.push(structuredClone(event));return network.publish(urls,event,options);}};
   access=createCallAccessLease({binding:{accountId:'synthetic-call:'+pubkey,conversationId:'synthetic-call-pair',pubkey,peerPubkey},isAccountCurrent:()=>!closed,signal:lifetime.signal,ttlMs:3000,refreshMs:300,readAdmission:async scope=>{await network.request([relay],{kinds:[21059],'#p':[scope.pubkey],'#crays-call-peer':[scope.peerPubkey]});return true;}});
   try{await access.start();}catch{return false;}
   // Actor owns the authenticated network/lease; each acquired workspace owns
   // its own controller+signaling subscription. Reopening never reuses a closed port.
   makeRenderer=()=>{const scopedSignaling=createPrivateCallSignaling({binding:{kind:'person',accountId:'synthetic-call:'+pubkey,conversationId:'synthetic-call-pair',pubkey,peerPubkey},authorize:()=>access.isAuthorized(),signal:access.signal,signer,network:transport,relays:[relayURL]});
    const observedSignaling={...scopedSignaling,subscribe(fn){return scopedSignaling.subscribe(message=>{trace({phase:'received',action:message.action,callId:message.callId,selfDevice:message.selfDevice,contentLength:message.content.length});fn(message);});}};
    const createObservedMedia=options=>{const callId=controller?.getSnapshot().callId;const media=createCallMediaSession({...options,createPeerConnection:config=>{const pc=new RTCPeerConnection(config);for(const event of ['signalingstatechange','iceconnectionstatechange','connectionstatechange'])pc.addEventListener(event,()=>trace({phase:'peer-state',callId,event,signaling:pc.signalingState,ice:pc.iceConnectionState,connection:pc.connectionState}));return pc;}});const wrapped={...media};for(const action of ['offer','answer','acceptAnswer','addIceCandidate'])wrapped[action]=async(...args)=>{trace({phase:'media-start',callId,action});try{const result=await media[action](...args);trace({phase:'media-done',callId,action});return result;}catch(error){trace({phase:'media-failed',callId,action});throw error;}};return wrapped;};
    const inner=createPrivateCallController({createMedia:createObservedMedia,signaling:observedSignaling,authorize:()=>access.isAuthorized(),signal:access.signal,iceServers:[],allowLoopbackQualification:true});
    inner.subscribe(()=>{const snapshot=inner.getSnapshot();trace({phase:'state',state:snapshot.state,callId:snapshot.callId,problem:snapshot.problem});for(const track of inner.getSnapshot().localStream?.getTracks()??[])observedTracks.add(track);});
    let scopedClosed=false;const port=Object.freeze({...inner,close(){if(scopedClosed)return;scopedClosed=true;inner.close();scopedSignaling.close();if(controller===port)rendererReleased=true;}});signaling=scopedSignaling;return port;};
   controller=makeRenderer();return true;
  },
  acquireRendererPort(){if(closed||!access?.isAuthorized()||!makeRenderer)throw Error('Current synthetic call pair unavailable');if(claimed&&!rendererReleased)throw Error('Call renderer is already owned');if(rendererReleased){controller=makeRenderer();rendererReleased=false;}claimed=true;return controller;},
  rendererPort:()=>controller,
  state:()=>{const snapshot=controller?.getSnapshot();return snapshot?{state:snapshot.state,kind:snapshot.kind,callId:snapshot.callId,problem:snapshot.problem,tracks:snapshot.remoteTracks.map(t=>t.kind),localTracks:snapshot.localStream?.getTracks().map(t=>({kind:t.kind,enabled:t.enabled,readyState:t.readyState}))??[]}:null;},
  initiate:kind=>controller.initiate(kind),accept:()=>controller.accept(),hangup:()=>controller.hangup(),mute:value=>controller.setMuted(value),camera:value=>controller.setCameraOff(value),
  stats:async()=>[...(await controller.getStats()).values()].filter(row=>row.type==='inbound-rtp').map(row=>({kind:row.kind,bytesReceived:row.bytesReceived,packetsReceived:row.packetsReceived})),
  deviceStates:()=>[...observedTracks].map(track=>({kind:track.kind,readyState:track.readyState})),
  publicCiphertext:()=>published,
  diagnosticTrace:()=>callTrace.map(row=>({...row})),
  ready:()=>network.request([relay],{kinds:[21059],'#p':[pubkey],since:Math.floor(Date.now()/1000)}),
  async probePair(target){const ephemeral=generateSecretKey();try{return await network.publish([relay],finalizeEvent({kind:21059,created_at:Math.floor(Date.now()/1000),content:'synthetic negative',tags:[['p',target]]},ephemeral));}finally{ephemeral.fill(0);}},
  close(){if(closed)return;closed=true;lifetime.abort();access?.close();controller?.close();signaling?.close();network?.close();key.fill(0);},
 });
}
