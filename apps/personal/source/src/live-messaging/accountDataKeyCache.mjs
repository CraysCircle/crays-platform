const fail=()=>Error('Current account private key lease unavailable');
const equal=(a,b)=>a?.accountId===b.accountId&&a?.pubkey===b.pubkey&&a?.bindingFingerprint===b.bindingFingerprint;
/** One already-unlocked nonextractable local AES key in the existing account
 * lifetime. This caches no login/grant, group membership, message or signer.
 * Each store factory still supplies its freshly admitted account and keeps its
 * OWN operation authorization/abort scope. No private key is exported. */
export function createAccountDataKeyCache({binding,signal,isCurrent}){
 if(typeof binding?.accountId!=='string'||!binding.accountId||binding.accountId.length>200||!['pubkey','bindingFingerprint'].every(k=>/^[a-f0-9]{64}$/.test(binding[k]))||!signal?.addEventListener||typeof isCurrent!=='function')throw fail();
 const owner=Object.freeze({accountId:binding.accountId,pubkey:binding.pubkey,bindingFingerprint:binding.bindingFingerprint}),entries=new Map();let closed=false;
 const current=()=>{let valid=false;try{valid=!closed&&!signal.aborted&&isCurrent(owner)===true;}catch{}if(!valid)close();return valid;};
 const close=()=>{if(closed)return;closed=true;entries.clear();signal.removeEventListener('abort',close);};signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();
 return Object.freeze({close,async get(request,open){
  const allowed=()=>{try{return current()&&equal(request?.binding,owner)&&!request.signal.aborted&&request.isCurrent()===true;}catch{return false;}};
  if(!allowed()||typeof open!=='function'||typeof request.namespace!=='string'||!request.namespace||request.namespace.length>200)throw fail();
  let work=entries.get(request.namespace);
  if(!work){if(entries.size>=4)throw fail();work=Promise.resolve().then(()=>{if(!allowed())throw fail();return open();}).then(key=>{if(!current()||key?.type!=='secret'||key.extractable!==false||key.algorithm?.name!=='AES-GCM'||key.algorithm?.length!==256||!key.usages?.includes('encrypt')||!key.usages?.includes('decrypt'))throw fail();return key;});entries.set(request.namespace,work);void work.catch(()=>{if(entries.get(request.namespace)===work)entries.delete(request.namespace);});}
  const key=await work;if(!allowed())throw fail();return key;
 }});
}
