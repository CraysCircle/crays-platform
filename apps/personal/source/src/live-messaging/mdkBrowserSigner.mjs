import {getEventHash,verifyEvent} from 'nostr-tools/pure';
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const bytes=value=>new TextEncoder().encode(value).byteLength;
const failure=()=>Error('Private group account operation unavailable');
/** Pumps the original WASM engine's queued async signer only during a real
 * operation. The supplied signer is the existing verified Core-bound port;
 * this module never holds an nsec or publishes to a relay. A separate bridge
 * handle can cancel Rust signer awaits while the engine itself is borrowed.
 * No result leaves run() until the actual account snapshot commit completes.
 */
export function openMdkBrowserSigner({account,bridge,isCurrent,persist,timeoutMs=20000}){
 const identity=account?.identity,signer=account?.signer;
 if(typeof isCurrent!=='function'||typeof persist!=='function'||typeof bridge?.drain!=='function'||typeof bridge.resolve!=='function'||typeof bridge.close!=='function'||!account?.signal?.addEventListener||typeof signer?.getPublicKey!=='function'||typeof signer.signEvent!=='function'||typeof signer.nip44?.encrypt!=='function'||typeof signer.nip44?.decrypt!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>20000)throw failure();
 let closed=false,busy=false;
 const check=()=>{if(closed||account.signal.aborted||isCurrent()!==true||identity?.publicBindingVerified!==true||identity.emailVerificationRequired!==false||!hex(identity.pubkey)||!hex(identity.bindingFingerprint)||account.accountId!==identity.accountId||signer.binding?.accountId!==identity.accountId||signer.binding.pubkey!==identity.pubkey||signer.binding.bindingFingerprint!==identity.bindingFingerprint)throw failure();};
 let rejectActive;
 const close=()=>{if(closed)return;closed=true;account.signal.removeEventListener('abort',close);try{bridge.close();}catch{}rejectActive?.(failure());};
 account.signal.addEventListener('abort',close,{once:true});
 const perform=async request=>{
  check();let value;
  if(!request||!Number.isSafeInteger(request.id)||request.id<1)throw failure();
  const {operation,payload}=request;
  if(operation==='getPublicKey'){
   if(payload!==null)throw failure();value=await signer.getPublicKey();check();if(value!==identity.pubkey)throw failure();
  }else if(operation==='signEvent'){
   if(!payload||payload.pubkey!==identity.pubkey||payload.id!==getEventHash(payload))throw failure();
   const {kind,created_at,tags,content}=payload;
   value=await signer.signEvent({kind,created_at,tags,content});check();
   if(value.pubkey!==identity.pubkey||value.id!==payload.id||!verifyEvent(value))throw failure();value=JSON.stringify(value);
  }else if(operation==='nip44.encrypt'||operation==='nip44.decrypt'){
   if(!payload||!hex(payload.pubkey)||typeof payload.text!=='string'||!payload.text.length||bytes(payload.text)>(operation==='nip44.encrypt'?65535:100000))throw failure();
   value=await signer.nip44[operation.slice(6)](payload.pubkey,payload.text);check();
   if(typeof value!=='string'||bytes(value)>(operation==='nip44.encrypt'?100000:65535))throw failure();
  }else throw failure();
  check();bridge.resolve(request.id,value,false);
 };
 try{check();}catch{close();throw failure();}
 return Object.freeze({close,async run(work){
  check();if(busy||typeof work!=='function')throw failure();busy=true;
  let timer,finished=false;
  const cancelled=new Promise((_,reject)=>{rejectActive=reject;timer=setTimeout(close,timeoutMs);});
  const operation=(async()=>{
   check();const running=Promise.resolve().then(work);let result,error;
   // Attach both handlers immediately: closing the independent bridge rejects
   // suspended Rust futures, including on timeout/account loss.
   void running.then(value=>{result=value;finished=true;},reason=>{error=reason;finished=true;});
   while(!finished){
    check();const requests=JSON.parse(bridge.drain());
    if(!Array.isArray(requests)||requests.length>8)throw failure();
    for(const request of requests){await perform(request);check();}
    if(!finished)await new Promise(resolve=>setTimeout(resolve,4));
   }
   if(error)throw error;check();await persist();check();return result;
  })();
  try{return await Promise.race([operation,cancelled]);}catch{close();throw failure();}
  finally{clearTimeout(timer);rejectActive=undefined;busy=false;}
 }});
}
