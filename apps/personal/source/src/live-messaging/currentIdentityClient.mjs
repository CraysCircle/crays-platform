const PATH='/api/crays/personal/messaging/identity';
/** Current-account public binding read. It never signs, creates identity or refreshes the whole workspace. */
export function createCurrentMessagingIdentityClient({accountId,isCurrent,fetcher=globalThis.fetch}){
 if(typeof accountId!=='string'||!accountId||accountId.length>200||typeof isCurrent!=='function')throw Error('Original current account context required');
 const listeners=new Set(),unavailable=Object.freeze({state:'unavailable',identity:null});let closed=false,generation=0,active,snapshot=Object.freeze({state:'idle',identity:null});
 const current=()=>!closed&&isCurrent(accountId)===true;
 const emit=next=>{snapshot=Object.freeze(next);for(const fn of listeners)fn();};
 const validate=value=>{const keys=['accountId','pubkey','publicBindingVerified','emailVerificationRequired','bindingFingerprint','signerAvailable','canCreateIdentity','capabilities'];if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==keys.sort().join(',')||value.accountId!==accountId||value.pubkey!==null&&!/^[a-f0-9]{64}$/.test(value.pubkey)||typeof value.publicBindingVerified!=='boolean'||typeof value.emailVerificationRequired!=='boolean'||value.publicBindingVerified&&value.pubkey===null||!/^[a-f0-9]{64}$/.test(value.bindingFingerprint)||value.signerAvailable!==false||value.canCreateIdentity!==false||!Array.isArray(value.capabilities)||value.capabilities.length)throw Error('Current public binding unavailable');return Object.freeze({...value,capabilities:Object.freeze([])});};
 return {
  getSnapshot:()=>current()?snapshot:closed?snapshot:unavailable,
  subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},
  async refresh(){
   active?.abort();if(!current()){emit(unavailable);return;}const own=++generation,stop=new AbortController();active=stop;const timer=setTimeout(()=>stop.abort(),20000);emit({state:'loading',identity:null});let reader,cancel,response;
   try{
    response=await fetcher(PATH,{method:'POST',headers:{'content-type':'application/json','x-crays-web-account-context':accountId},body:'{}',credentials:'same-origin',cache:'no-store',redirect:'error',signal:stop.signal});
    if(!current()||own!==generation)return;if(response.status===401||response.status===403){emit({state:'signed-out',identity:null});return;}if(!response.ok||!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')||!response.body||Number(response.headers.get('content-length')||'0')>8192)throw Error('Current public binding unavailable');
    reader=response.body.getReader();const cancelled=new Promise((resolve,reject)=>{cancel=()=>{void reader.cancel().catch(()=>{});reject(Error('Current public binding unavailable'));};stop.signal.addEventListener('abort',cancel,{once:true});});const chunks=[];let size=0;
    for(;;){stop.signal.throwIfAborted();const part=await Promise.race([reader.read(),cancelled]);if(part.done)break;size+=part.value.length;if(size>8192)throw Error('Current public binding unavailable');chunks.push(part.value);}
    const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}const envelope=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!envelope||Object.keys(envelope).join(',')!=='identity')throw Error('Current public binding unavailable');const identity=validate(envelope.identity);if(!current()||own!==generation)return;stop.signal.throwIfAborted();emit({state:'ready',identity});
   }catch{if(current()&&own===generation)emit(unavailable);}finally{clearTimeout(timer);if(cancel)stop.signal.removeEventListener('abort',cancel);if(reader){await reader.cancel().catch(()=>{});reader.releaseLock();}else await response?.body?.cancel().catch(()=>{});if(active===stop)active=undefined;}
  },
  close(){if(closed)return;closed=true;generation++;active?.abort();emit({state:'closed',identity:null});listeners.clear();},
 };
}
