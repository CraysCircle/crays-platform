import {getEventHash,verifyEvent} from 'nostr-tools';

const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const bytes=value=>new TextEncoder().encode(value).byteLength;
const failed=()=>Error('Current messaging signer unavailable');

/** Adapts an existing nonexporting signer to the Marmot EventSigner interface.
 * A key handle is not a login or conversation grant. The canonical parent must
 * supply both the current Core binding and operation admission. No key files,
 * generated identity, browser globals, persistence or network publication here.
 * A NIP-07 handle may be passed explicitly, as may original host key custody.
 */
export function createCurrentBoundSigner({binding:input,provider,readIdentity,isCurrent,authorizeOperation,signal,timeoutMs=20000}) {
 if(!input||typeof input.accountId!=='string'||!input.accountId||!hex(input.pubkey)||!hex(input.bindingFingerprint)||typeof provider?.getPublicKey!=='function'||typeof provider?.signEvent!=='function'||typeof readIdentity!=='function'||typeof isCurrent!=='function'||typeof authorizeOperation!=='function'||!signal?.addEventListener||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw failed();
 const binding=Object.freeze({accountId:input.accountId,pubkey:input.pubkey,bindingFingerprint:input.bindingFingerprint});
 const lifetime=new AbortController();let closed=false;
 const close=()=>{if(closed)return;closed=true;lifetime.abort();signal.removeEventListener('abort',close);};
 signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();
 const check=()=>{if(closed||signal.aborted||isCurrent(binding)!==true)throw failed();};
 const permit=operation=>{check();if(authorizeOperation(binding,operation)!==true)throw failed();};
 const identity=async (operation,operationSignal)=>{
  operationSignal.throwIfAborted();permit(operation);const value=await readIdentity(binding.accountId);operationSignal.throwIfAborted();permit(operation);
  if(!value||value.accountId!==binding.accountId||value.pubkey!==binding.pubkey||value.bindingFingerprint!==binding.bindingFingerprint||value.publicBindingVerified!==true||value.emailVerificationRequired!==false)throw failed();
  const key=await provider.getPublicKey();operationSignal.throwIfAborted();permit(operation);if(key!==binding.pubkey)throw failed();
 };
 async function run(operation,perform,validate){
  permit(operation);const stop=new AbortController();let timer,abort;
  const cancelled=new Promise((resolve,reject)=>{abort=()=>{stop.abort();reject(failed());};lifetime.signal.addEventListener('abort',abort,{once:true});timer=setTimeout(abort,timeoutMs);});
  // Pure public metadata performs no external operation or private read.
  // One fresh Core/key check suffices for that lookup. Signing and NIP44
  // retain independent checks on BOTH sides of the external provider call.
  const work=(async()=>{if(operation.kind!=='identity')await identity(operation,stop.signal);stop.signal.throwIfAborted();const result=await perform();stop.signal.throwIfAborted();await identity(operation,stop.signal);stop.signal.throwIfAborted();if(!validate(result))throw failed();return result;})();
  try{return await Promise.race([work,cancelled]);}catch{throw failed();}finally{clearTimeout(timer);lifetime.signal.removeEventListener('abort',abort);}
 }
 function captureEvent(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['kind','created_at','tags','content','pubkey'].includes(k))||value.pubkey!==undefined&&value.pubkey!==binding.pubkey||!Number.isSafeInteger(value.kind)||value.kind<0||value.kind>65535||!Number.isSafeInteger(value.created_at)||value.created_at<0||typeof value.content!=='string'||bytes(value.content)>2*1024*1024||!Array.isArray(value.tags)||value.tags.length>1024||value.tags.some(t=>!Array.isArray(t)||t.length>64||t.some(v=>typeof v!=='string'||bytes(v)>65536)))throw failed();
  const event={kind:value.kind,created_at:value.created_at,tags:value.tags.map(t=>Object.freeze([...t])),content:value.content};
  if(bytes(JSON.stringify(event))>2*1024*1024)throw failed();return Object.freeze({...event,tags:Object.freeze(event.tags)});
 }
 const crypt=(action,other,text)=>{
  if(!hex(other)||typeof text!=='string'||bytes(text)>(action==='encrypt'?65535:100000)||!text.length||typeof provider.nip44?.[action]!=='function')throw failed();
  const operation=Object.freeze({kind:action,pubkey:other,payload:text});
  return run(operation,()=>provider.nip44[action](other,text),result=>typeof result==='string'&&bytes(result)<=(action==='encrypt'?100000:65535));
 };
 return Object.freeze({
  binding,signal:lifetime.signal,close,
  getPublicKey:()=>run(Object.freeze({kind:'identity'}),async()=>binding.pubkey,result=>result===binding.pubkey),
  signEvent(value){const event=captureEvent(value),operation=Object.freeze({kind:'sign',event});return run(operation,async()=>{
   // Give the external provider an independent mutable copy. It cannot alter
   // the reviewed template or its admission decision while a prompt is open.
   const signed=await provider.signEvent(structuredClone(event));
   if(!signed||typeof signed!=='object')throw failed();return structuredClone(signed);
  },signed=>Object.keys(signed).sort().join(',')==='content,created_at,id,kind,pubkey,sig,tags'&&signed.pubkey===binding.pubkey&&signed.id===getEventHash({...event,pubkey:binding.pubkey})&&verifyEvent(signed)&&JSON.stringify([signed.kind,signed.created_at,signed.tags,signed.content])===JSON.stringify([event.kind,event.created_at,event.tags,event.content]));},
  nip44:Object.freeze({encrypt:(other,text)=>crypt('encrypt',other,text),decrypt:(other,text)=>crypt('decrypt',other,text)}),
 });
}
