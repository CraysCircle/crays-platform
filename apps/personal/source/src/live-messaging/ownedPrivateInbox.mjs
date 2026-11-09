import {verifyEvent,getEventHash} from 'nostr-tools';
import {ownedDemoRelayURL} from '../../demo-network/config.mjs';

const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const fail=()=>Error('Private relay inbox unavailable');
const validBefore=b=>b===null||b&&Object.keys(b).sort().join(',')==='created_at,id'&&hex(b.id)&&Number.isSafeInteger(b.created_at)&&b.created_at>=0&&b.created_at<=4294967295;
const beforeBoundary=(e,b)=>e.created_at<b.created_at||e.created_at===b.created_at&&e.id.slice(32,48)<b.id.slice(32,48);
/** Existing NIP-17 inbox compatibility. Uses a non-exporting signer; it does
 * not create a Nostr identity or grant VIF/group membership. The caller must
 * independently admit the account, exact Spot and selected conversation. */
export async function unwrapPrivateInboxEvent({event,recipient,signer,isCurrent}){
 const check=()=>{if(isCurrent()!==true)throw fail();};
 check();const encoded=JSON.stringify(event);if(!hex(recipient)||!encoded||encoded.length>128*1024)throw fail();
 // Signature verifiers may memoize with a Symbol. Never inherit a caller's
 // cached verification result or a concurrently mutable event object.
 event=JSON.parse(encoded);
 if(event.kind!==1059||!verifyEvent(event)||event.tags.filter(t=>t[0]==='p').length!==1||event.tags.find(t=>t[0]==='p')?.[1]!==recipient)throw fail();
 if(await signer.getPublicKey()!==recipient)throw fail();check();
 const seal=JSON.parse(await signer.nip44.decrypt(event.pubkey,event.content));check();
 if(!seal||seal.kind!==13||seal.tags.length!==0||!verifyEvent(seal))throw fail();
 const rumor=JSON.parse(await signer.nip44.decrypt(seal.pubkey,seal.content));check();
 if(!rumor||![14,15].includes(rumor.kind)||rumor.pubkey!==seal.pubkey||!hex(rumor.id)||getEventHash(rumor)!==rumor.id||typeof rumor.content!=='string'||rumor.content.length>65535||!Array.isArray(rumor.tags)||!rumor.tags.some(t=>t[0]==='p'&&(t[1]===recipient||rumor.pubkey===recipient&&hex(t[1])))||!Number.isSafeInteger(rumor.created_at)||rumor.sig!==undefined)throw fail();
 return Object.freeze(rumor);
}

/** Exact owned relay, bounded requests, genuine NIP-42 authentication and
 * source-checked original events. No arbitrary upstream or synthetic signer. */
export class OwnedPrivateInboxPeer{
 constructor({spotId,registry,recipient,signer,isCurrent,signal,WebSocket:Socket=globalThis.WebSocket,fetch:request=globalThis.fetch}){
  if(!hex(recipient)||typeof isCurrent!=='function'||!signal?.addEventListener||signal.aborted)throw fail();
  this.url=ownedDemoRelayURL(spotId,registry);this.recipient=recipient;this.signer=signer;this.isCurrent=isCurrent;this.signal=signal;this.queue=[];this.waiters=[];this.closed=false;this.counter=0;
  this.abort=()=>this.close();signal.addEventListener('abort',this.abort,{once:true});
  this.request=request;this.historyCapability=null;this.ws=new Socket(this.url);
  this.opened=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{reject(fail());this.close();},8000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});this.ws.addEventListener('error',()=>{clearTimeout(timer);reject(fail());this.close();},{once:true});});
  // Prevent an unobserved handshake rejection when caller closes immediately.
  void this.opened.catch(()=>{});
  this.ws.addEventListener('message',message=>{
   if(this.closed)return;let frame;try{if(typeof message.data!=='string'||message.data.length>128*1024)throw fail();frame=JSON.parse(message.data);if(!Array.isArray(frame))throw fail();}catch{return this.close();}
   const i=this.waiters.findIndex(w=>w.match(frame));if(i>=0){const [w]=this.waiters.splice(i,1);clearTimeout(w.timer);w.resolve(frame);}else{this.queue.push(frame);if(this.queue.length>512)this.close();}
  });
  this.ws.addEventListener('close',()=>this.close());
 }
 check(){if(this.closed||this.signal.aborted||this.isCurrent()!==true){this.close();throw fail();}}
 wait(match){this.check();const i=this.queue.findIndex(match);if(i>=0)return Promise.resolve(this.queue.splice(i,1)[0]);return new Promise((resolve,reject)=>{const row={match,resolve,reject,timer:setTimeout(()=>{this.waiters=this.waiters.filter(w=>w!==row);reject(fail());this.close();},8000)};this.waiters.push(row);});}
 async ready(){await this.opened;this.check();const frame=await this.wait(f=>f[0]==='AUTH');const challenge=frame[1];if(typeof challenge!=='string'||challenge.length<16||challenge.length>512)throw fail();
  if(await this.signer.getPublicKey()!==this.recipient)throw fail();this.check();
  const event=await this.signer.signEvent({kind:22242,created_at:Math.floor(Date.now()/1000),tags:[['relay',this.url],['challenge',challenge]],content:''});this.check();
  if(event.pubkey!==this.recipient||event.kind!==22242||event.content!==''||JSON.stringify(event.tags)!==JSON.stringify([['relay',this.url],['challenge',challenge]])||!verifyEvent(event))throw fail();
  this.ws.send(JSON.stringify(['AUTH',event]));const ack=await this.wait(f=>f[0]==='OK'&&f[1]===event.id);this.check();if(ack[2]!==true)throw fail();
 }
 async readOriginals(ids){
  this.check();if(!Array.isArray(ids)||!ids.length||ids.length>100||!ids.every(hex)||new Set(ids).size!==ids.length)throw fail();const sub='private-inbox-'+(++this.counter),found=[];
  this.ws.send(JSON.stringify(['REQ',sub,{ids,kinds:[1059],'#p':[this.recipient],limit:ids.length}]));
  try{for(;;){const f=await this.wait(f=>f[1]===sub&&['EVENT','EOSE','CLOSED'].includes(f[0]));this.check();if(f[0]==='EOSE')return found;if(f[0]!=='EVENT'||!ids.includes(f[2]?.id)||found.some(e=>e.id===f[2].id)||f[2].kind!==1059||!verifyEvent(f[2])||f[2].tags.filter(t=>t[0]==='p').length!==1||f[2].tags.find(t=>t[0]==='p')?.[1]!==this.recipient)throw fail();found.push(f[2]);}}
  finally{if(!this.closed)this.ws.send(JSON.stringify(['CLOSE',sub]));}
 }
 async supportsHistoryCursor(){
  this.check();if(this.historyCapability===null)this.historyCapability=(async()=>{
   try{
    const url=new URL(this.url);url.protocol='http:';
    const response=await this.request(url.href,{headers:{Accept:'application/nostr+json'},redirect:'error',cache:'no-store',signal:AbortSignal.any([this.signal,AbortSignal.timeout(2000)])});this.check();
    if(!response.ok)return false;const text=await response.text();this.check();if(text.length>32768)return false;
    const info=JSON.parse(text);return info.version==='crays-test-khatru-6cc50f1a5b58-private-history-v5'&&info.crays_private_history?.version===1&&info.crays_private_history.order==='created_at-desc-idptr-desc'&&info.crays_private_history.search==='crays-private-before'&&info.crays_private_history.max_limit===500;
   }catch{this.check();return false;}
  })();const supported=await this.historyCapability;this.check();return supported;
 }
 async readInboxBefore({limit=200,before=null}={}){
  this.check();if(!validBefore(before))throw fail();
  if(await this.supportsHistoryCursor()!==true)throw fail();this.check();
  return this.readInbox({limit,...(before===null?{}:{until:before.created_at}),historyBefore:before});
 }
 async readInbox({limit=100,since,until,historyBefore}={}){
  // The owned fleet caps stored queries at 500. Time bounds are inclusive
  // NIP-01 bounds on gift wraps, not the encrypted message's actual time.
  this.check();const time=v=>v===undefined||Number.isSafeInteger(v)&&v>=0;
  if(!Number.isInteger(limit)||limit<1||limit>500||!time(since)||!time(until)||since!==undefined&&until!==undefined&&since>until)throw fail();const sub='private-inbox-'+(++this.counter),found=[];
  if(historyBefore!==undefined&&(!validBefore(historyBefore)||since!==undefined||until!==(historyBefore?.created_at)||await this.supportsHistoryCursor()!==true))throw fail();
  this.ws.send(JSON.stringify(['REQ',sub,{kinds:[1059],'#p':[this.recipient],limit,...(since===undefined?{}:{since}),...(until===undefined?{}:{until}),...(historyBefore===undefined?{}:{search:historyBefore===null?'crays-private-before:start':`crays-private-before:${historyBefore.created_at}:${historyBefore.id}`})}]));
  try{for(;;){const f=await this.wait(f=>f[1]===sub&&['EVENT','EOSE','CLOSED'].includes(f[0]));this.check();if(f[0]==='EOSE')return found;if(f[0]!=='EVENT'||found.length>=limit||found.some(e=>e.id===f[2]?.id)||f[2]?.kind!==1059||!verifyEvent(f[2])||!Number.isSafeInteger(f[2].created_at)||f[2].created_at<0||since!==undefined&&f[2].created_at<since||until!==undefined&&f[2].created_at>until||historyBefore!=null&&!beforeBoundary(f[2],historyBefore)||f[2].tags.filter(t=>t[0]==='p').length!==1||f[2].tags.find(t=>t[0]==='p')?.[1]!==this.recipient)throw fail();found.push(f[2]);}}
  finally{if(!this.closed)this.ws.send(JSON.stringify(['CLOSE',sub]));}
 }
 async publishPrivate(event){
  this.check();if(!event||JSON.stringify(event).length>128*1024||event.kind!==1059||!verifyEvent(event)||event.tags.filter(t=>t[0]==='p').length!==1)throw fail();
  this.ws.send(JSON.stringify(['EVENT',event]));const ack=await this.wait(f=>f[0]==='OK'&&f[1]===event.id);this.check();return Object.freeze({eventId:event.id,accepted:ack[2]===true});
 }
 close(){if(this.closed)return;this.closed=true;this.signal.removeEventListener('abort',this.abort);for(const w of this.waiters.splice(0)){clearTimeout(w.timer);w.reject(fail());}this.queue=[];try{this.ws.close();}catch{}}
}
