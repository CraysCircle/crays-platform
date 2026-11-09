import {generateSecretKey,getPublicKey,finalizeEvent,getEventHash,verifyEvent,nip44} from 'nostr-tools';
// NIP-AC wire shape examined against pinned Nospeak e94a464: signed 25050–54
// inner event, NIP44-v2 encrypted inside ephemeral 21059. Uses installed nostr-tools
// cryptography, not a custom cipher. No cross-client interoperability acceptance.
const actions=Object.freeze({offer:25050,answer:25051,ice:25052,hangup:25053,reject:25054});
const publicKey=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const id=value=>typeof value==='string'&&/^[a-f0-9]{32}$/.test(value);
const tag=(event,name)=>{const rows=event.tags.filter(t=>t[0]===name);return rows.length===1&&rows[0].length===2?rows[0][1]:null;};
export function createPrivateCallSignaling({binding,authorize,signal,signer,network,relays,now=()=>Math.floor(Date.now()/1000)}){
 if(!binding||!['person','spot','circle'].includes(binding.kind)||!binding.accountId||typeof binding.conversationId!=='string'||!binding.conversationId||binding.conversationId.length>200||!publicKey(binding.pubkey)||!publicKey(binding.peerPubkey)||binding.pubkey===binding.peerPubkey||typeof authorize!=='function'||!signal?.addEventListener||!signer?.getPublicKey||!signer?.signEvent||!signer?.nip44?.decrypt||!network?.subscription||!network?.publish||!Array.isArray(relays)||!relays.length||relays.length>8||relays.some(r=>typeof r!=='string'||r.length>2048))throw Error('Explicit authorized call peer and relay scope required');
 const scope=Object.freeze({...binding}),destinations=Object.freeze([...new Set(relays)]),listeners=new Set(),seen=new Set(),authored=new Set(),attempts=new Map();let closed=false,subscription,receiving=Promise.resolve(),queued=0;
 const current=()=>!closed&&!signal.aborted&&authorize(scope)===true;
 const check=()=>{if(!current()){close();throw Error('Call signaling is no longer authorized');}};
 const close=()=>{if(closed)return;closed=true;signal.removeEventListener('abort',close);subscription?.unsubscribe();listeners.clear();seen.clear();authored.clear();attempts.clear();};
 signal.addEventListener('abort',close,{once:true});
 const currentSigner=async()=>{check();const key=await signer.getPublicKey();check();if(key!==scope.pubkey)throw Error('Call signer changed');};
 const validInner=event=>{
  if(!event||!Object.values(actions).includes(event.kind)||!publicKey(event.pubkey)||!Array.isArray(event.tags)||event.tags.length>12||event.tags.some(t=>!Array.isArray(t)||t.some(v=>typeof v!=='string'||v.length>512))||typeof event.content!=='string'||event.content.length>48000||!Number.isInteger(event.created_at)||now()-event.created_at>60||event.created_at-now()>15||!id(tag(event,'call-id')))return false;
  if(event.kind===25050&&!['voice','video'].includes(tag(event,'call-type')))return false;
  if(event.tags.some(t=>['group-call-id','initiator','participants','role'].includes(t[0])))return false; // group signaling requires a separate explicit roster adapter.
  return verifyEvent(event);
 };
 const receive=async input=>{
  if(!current())return;let event;try{
   event=structuredClone(input);if(event.kind!==21059||tag(event,'p')!==scope.pubkey||typeof event.content!=='string'||event.content.length>90000||!Number.isInteger(event.created_at)||now()-event.created_at>60||event.created_at-now()>15||!verifyEvent(event)||seen.has(event.id))return;
   await currentSigner();const json=await signer.nip44.decrypt(event.pubkey,event.content);check();if(typeof json!=='string'||json.length>65000)return;const inner=JSON.parse(json);if(!validInner(inner)||tag(inner,'conversation-id')!==scope.conversationId||tag(inner,'crays-call-scope')!==scope.kind||seen.has(inner.id))return;
   const self=inner.pubkey===scope.pubkey,peer=inner.pubkey===scope.peerPubkey;
   if(self&&authored.has(inner.id))return;
   if(peer&&tag(inner,'p')!==scope.pubkey||self&&(tag(inner,'p')!==scope.peerPubkey||![25051,25054].includes(inner.kind))||!self&&!peer)return;
   seen.add(event.id);seen.add(inner.id);while(seen.size>512)seen.delete(seen.values().next().value);check();
   for(const fn of listeners){check();fn(Object.freeze({action:Object.keys(actions).find(k=>actions[k]===inner.kind),callId:tag(inner,'call-id'),callType:inner.kind===25050?tag(inner,'call-type'):undefined,content:inner.content,from:inner.pubkey,selfDevice:self,eventId:inner.id}));}
  }catch{/* Malformed or revoked call signals are discarded without logging private SDP/ciphertext. */}
 };
 check();subscription=network.subscription(destinations,{kinds:[21059],'#p':[scope.pubkey],since:now()-5}).subscribe({next:event=>{if(!current()||queued>=32)return;queued++;receiving=receiving.then(()=>receive(event)).catch(()=>{}).finally(()=>{queued--;});},error:()=>{}});
 const wrap=(inner,recipient)=>{
  const secret=generateSecretKey();let key;try{key=nip44.v2.utils.getConversationKey(secret,recipient);const content=nip44.v2.encrypt(JSON.stringify(inner),key);return finalizeEvent({kind:21059,created_at:now(),content,tags:[['p',recipient]]},secret);}finally{key?.fill(0);secret.fill(0);}
 };
 return Object.freeze({
  subscribe(fn){check();listeners.add(fn);return()=>listeners.delete(fn);},
  send({action,callId,content='',callType,signal:operationSignal}){
   check();if(!operationSignal||typeof operationSignal.aborted!=='boolean')throw Error('Explicit call operation lifetime required');const checkOperation=()=>{check();if(operationSignal.aborted)throw Error('Call operation cancelled');};checkOperation();if(!Object.hasOwn(actions,action)||!id(callId)||typeof content!=='string'||content.length>48000||action==='offer'&&!['voice','video'].includes(callType)||action!=='offer'&&callType!==undefined)throw Error('Invalid call signaling request');
   const fingerprint=JSON.stringify([action,callId,content,callType??null]);const old=attempts.get(fingerprint);if(old)return old;if(attempts.size>=1024)throw Error('Call signaling attempt bound exceeded');
   const operation=(async()=>{
    checkOperation();await currentSigner();checkOperation();const template={kind:actions[action],created_at:now(),content,tags:[['p',scope.peerPubkey],['call-id',callId],['conversation-id',scope.conversationId],['crays-call-scope',scope.kind],['alt','WebRTC call signaling'],...(action==='offer'?[['call-type',callType]]:[])]};
    const signed=await signer.signEvent(structuredClone(template));checkOperation();await currentSigner();checkOperation();if(signed.pubkey!==scope.pubkey||signed.id!==getEventHash({...template,pubkey:scope.pubkey})||!validInner(signed))throw Error('Call signaling signature changed');
    authored.add(signed.id);while(authored.size>1024)authored.delete(authored.values().next().value);
    const targets=[scope.peerPubkey,...(['answer','reject'].includes(action)?[scope.pubkey]:[])],results=[];
    for(const target of targets){checkOperation();const encrypted=wrap(signed,target);checkOperation();const result=await network.publish(destinations,encrypted,{signal:operationSignal});checkOperation();results.push({target,accepted:Object.values(result).some(r=>r.ok===true)});}
    return Object.freeze({state:results.every(r=>r.accepted)?'sent-to-relay':'unconfirmed',eventId:signed.id});
   })();attempts.set(fingerprint,operation);return operation;
  },
  async flush(){await receiving;},close,
 });
}
