import {createCurrentBoundSigner} from '../currentBoundSigner.mjs';
import {createCurrentMessagingBindingReader} from './currentIdentity.mjs';
const PATH='/api/crays/personal/messaging/signer',ORIGIN='http://localhost:8990';
const failed=()=>Error('Current messaging signer unavailable');
/** Original session/Core -> existing nonexporting custody. No nsec input,
 * account creation, public relay publication or conversation grant. The original
 * host supplies the actual custody opener and exact operation policy.
 */
export function createCurrentSignerHttp({sdkReader,core,assertRuntimeCurrent,openCustody,authorizeOperation}){
 if(!sdkReader||typeof assertRuntimeCurrent!=='function'||typeof openCustody!=='function'||typeof authorizeOperation!=='function')throw failed();
 const readBinding=createCurrentMessagingBindingReader(core);
 let active=0;
 const reply=(res,status,value)=>{if(res.destroyed||res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(JSON.stringify(value));};
 return async(req,res)=>{
  if(req.url!==PATH)return false;
  const h=req.headers;
  if(req.method!=='POST'){reply(res,405,{error:'MESSAGING_SIGNER_REQUEST_NOT_ADMITTED'});return true;}
  if(h.host!=='localhost:8990'||h.origin!==ORIGIN||h.authorization!==undefined||h['sec-fetch-site']!==undefined&&h['sec-fetch-site']!=='same-origin'||Object.keys(h).some(k=>k==='forwarded'||k.startsWith('x-forwarded-')||k.startsWith('x-crays-')&&k!=='x-crays-web-account-context')){reply(res,403,{error:'MESSAGING_SIGNER_UNAVAILABLE'});return true;}
  const expected=h['x-crays-web-account-context'];
  if(typeof expected!=='string'||!expected||expected.length>200||/[\x00-\x20\x7f]/.test(expected)||h['content-type']?.split(';')[0].trim().toLowerCase()!=='application/json'||h['content-encoding']!==undefined||h['content-length']!==undefined&&(!/^\d{1,8}$/.test(h['content-length'])||Number(h['content-length'])>2200000)){reply(res,400,{error:'MESSAGING_SIGNER_REQUEST_NOT_ADMITTED'});return true;}
  if(active>=8){reply(res,503,{error:'MESSAGING_SIGNER_UNAVAILABLE'});return true;}active++;
  const stop=new AbortController(),cancel=()=>stop.abort(),disconnected=()=>{if(!res.writableEnded)cancel();},timer=setTimeout(()=>{cancel();if(!req.complete)req.destroy();},20000);req.on('aborted',cancel);res.on('close',disconnected);
  let custody,signer,proof,binding;
  const current=()=>{stop.signal.throwIfAborted();if(!proof||sdkReader.runtimeGuard!==assertRuntimeCurrent)assertRuntimeCurrent();if(proof)sdkReader.assertCurrent(req,proof);};
  async function wait(work){let abort;const cancelled=new Promise((resolve,reject)=>{abort=()=>reject(failed());stop.signal.addEventListener('abort',abort,{once:true});});try{current();return await Promise.race([work,cancelled]);}finally{stop.signal.removeEventListener('abort',abort);}}
  try{
   current();proof=await wait(sdkReader.read(req,{signal:stop.signal}));current();const provider=sdkReader.resolveVerifiedProviderBinding(req,proof);
   const observe=async()=>{current();await wait(sdkReader.revalidate(req,proof));current();const value=await readBinding({provider,expected,current,wait});current();if(!value.publicBindingVerified||value.emailVerificationRequired||binding&&value.bindingFingerprint!==binding.bindingFingerprint)throw failed();return value;};
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2200000)throw failed();chunks.push(chunk);current();}
   const input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))),fields=input&&typeof input==='object'&&!Array.isArray(input)?Object.keys(input).sort().join(','):'';
   if(!(['public-key'].includes(input?.operation)&&fields==='operation'||input?.operation==='sign-event'&&fields==='event,operation'||['encrypt','decrypt'].includes(input?.operation)&&fields==='operation,payload,pubkey'))throw failed();
   const operation=input.operation==='public-key'?{kind:'identity'}:input.operation==='sign-event'?{kind:'sign',event:input.event}:{kind:input.operation,pubkey:input.pubkey,payload:input.payload};
   binding=await observe();current();
   if(authorizeOperation(binding,operation)!==true)throw failed();
   const opened=openCustody({binding,isCurrent:value=>{try{current();return value.accountId===binding.accountId&&value.pubkey===binding.pubkey&&value.bindingFingerprint===binding.bindingFingerprint;}catch{return false;}},authorizeOperation,signal:stop.signal});
   const synchronous=!(opened&&typeof opened.then==='function');
   if(synchronous){custody=opened;current();}else custody=await wait(Promise.resolve(opened).then(value=>{try{current();return value;}catch(error){value?.close?.();throw error;}}));
   // A synchronous existing-file custody opener has not crossed an external
   // wait since the full observation above. The bound signer consumes that
   // exact first observation once, then performs its own fresh post-operation
   // SDK/Core read. Async custody openers still require a new pre-operation read.
   let initial=synchronous;
   signer=createCurrentBoundSigner({binding,provider:custody,readIdentity:()=>{if(initial){initial=false;current();return binding;}return observe();},isCurrent:value=>{try{current();return value.accountId===binding.accountId&&value.pubkey===binding.pubkey&&value.bindingFingerprint===binding.bindingFingerprint;}catch{return false;}},authorizeOperation:(scope,operation)=>scope.accountId===binding.accountId&&scope.pubkey===binding.pubkey&&scope.bindingFingerprint===binding.bindingFingerprint&&authorizeOperation(binding,operation)===true,signal:stop.signal});
   let value;
   if(input.operation==='public-key')value=await signer.getPublicKey();
   else if(input.operation==='sign-event')value=await signer.signEvent(input.event);
   else value=await signer.nip44[input.operation](input.pubkey,input.payload);
   // Bound signer already revalidated after the actual custody operation.
   current();reply(res,200,{result:value});
  }catch{reply(res,403,{error:'MESSAGING_SIGNER_UNAVAILABLE'});}
  finally{active--;clearTimeout(timer);stop.abort();signer?.close();custody?.close?.();req.off('aborted',cancel);res.off('close',disconnected);}
  return true;
 };
}
