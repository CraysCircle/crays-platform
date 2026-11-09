/** Nonexporting original-host signer client. The original SDK/Core service,
 * not this browser, selects authority and existing custody. No key import UI,
 * alternate identity, fallback endpoint or message publication is provided.
 */
export function createCurrentHostSigner({accountId,isCurrent,signal,fetcher=globalThis.fetch,verifiedIdentity}){
 if(typeof accountId!=='string'||!accountId||accountId.length>200||typeof isCurrent!=='function'||!signal?.addEventListener||typeof fetcher!=='function')throw Error('Current messaging signer unavailable');
 if(verifiedIdentity!==undefined&&(verifiedIdentity.accountId!==accountId||verifiedIdentity.publicBindingVerified!==true||verifiedIdentity.emailVerificationRequired!==false||!['pubkey','bindingFingerprint'].every(k=>typeof verifiedIdentity[k]==='string'&&/^[a-f0-9]{64}$/.test(verifiedIdentity[k]))))throw Error('Current verified messaging identity required');
 const controllers=new Set();let closed=false,publicKey=verifiedIdentity?.pubkey??null,pendingPublicKey=null;
 const current=()=>{try{return !closed&&!signal.aborted&&isCurrent(accountId)===true;}catch{return false;}};
 const close=()=>{if(closed)return;closed=true;publicKey=null;pendingPublicKey=null;signal.removeEventListener('abort',close);for(const stop of controllers)stop.abort();controllers.clear();};
 signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();
 async function call(input){
  if(!current()){close();throw Error('Current messaging signer unavailable');}
  const stop=new AbortController();controllers.add(stop);const timer=setTimeout(()=>stop.abort(),20000);let reader,abort;
  try{
   const response=await fetcher('/api/crays/personal/messaging/signer',{method:'POST',headers:{'content-type':'application/json','x-crays-web-account-context':accountId},body:JSON.stringify(input),credentials:'same-origin',cache:'no-store',redirect:'error',signal:stop.signal});
   if(!current()||stop.signal.aborted||!response.ok||response.redirected||!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')||!response.body)throw Error('Current messaging signer unavailable');
   reader=response.body.getReader();const cancelled=new Promise((resolve,reject)=>{abort=()=>{void reader.cancel().catch(()=>{});reject(Error('Current messaging signer unavailable'));};stop.signal.addEventListener('abort',abort,{once:true});});let text='';const decode=new TextDecoder('utf-8',{fatal:true});let bytes=0;
   for(;;){stop.signal.throwIfAborted();const part=await Promise.race([reader.read(),cancelled]);if(part.done)break;bytes+=part.value.length;if(bytes>2200000)throw Error('Current messaging signer unavailable');text+=decode.decode(part.value,{stream:true});}
   text+=decode.decode();const value=JSON.parse(text);if(!current()||stop.signal.aborted||!value||Object.keys(value).join(',')!=='result')throw Error('Current messaging signer unavailable');return value.result;
  }finally{clearTimeout(timer);if(abort)stop.signal.removeEventListener('abort',abort);await reader?.cancel().catch(()=>{});reader?.releaseLock();controllers.delete(stop);}
 }
 // Reuse public metadata already verified by the same-host identity route.
 // This never unlocks local bytes: NIP-44/signing still require a fresh host
 // Core check before and after every operation.
 // Cache only the public key of this exact host/account lifetime. Signing and
 // NIP-44 still call the server every time, and the bound signer independently
 // revalidates Core before and after each operation. This is not an auth cache.
 const getPublicKey=()=>{
  if(!current())return Promise.reject(Error('Current messaging signer unavailable'));
  if(publicKey)return Promise.resolve(publicKey);
  if(pendingPublicKey)return pendingPublicKey;
  const work=call({operation:'public-key'}).then(value=>{if(!current()||typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value))throw Error('Current messaging signer unavailable');publicKey=value;return value;});
  pendingPublicKey=work;void work.then(()=>{if(pendingPublicKey===work)pendingPublicKey=null;},()=>{if(pendingPublicKey===work)pendingPublicKey=null;});return work;
 };
 return Object.freeze({getPublicKey,signEvent:event=>call({operation:'sign-event',event}),nip44:Object.freeze({encrypt:(pubkey,payload)=>call({operation:'encrypt',pubkey,payload}),decrypt:(pubkey,payload)=>call({operation:'decrypt',pubkey,payload})}),close});
}
