import{PROVIDERS}from'./providers.mjs';
/** Server-only bounded fetch; no caller URLs, redirects, retries, cookies or response/error logging. */
export function createFixedProviderTransport({fetchImpl=globalThis.fetch}={}){
 if(typeof fetchImpl!=='function')throw Error('FETCH_REQUIRED');
 const methods=new Map(Object.values(PROVIDERS).flatMap(p=>[[p.token,'POST'],[p.userinfo,'GET']]));
 return async(url,options)=>{
  if(methods.get(url)!==options?.method)throw Error('PROVIDER_ENDPOINT_DENIED');
  const response=await fetchImpl(url,{...options,redirect:'error',credentials:'omit',cache:'no-store'});
  return{ok:response.ok,async readJsonBounded(maxBytes){
   if(maxBytes!==65536)throw Error('RESPONSE_BUDGET_DENIED');
   const length=response.headers.get('content-length');
   if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes)){await response.body?.cancel();throw Error('RESPONSE_TOO_LARGE');}
   if(!response.body)throw Error('EMPTY_RESPONSE');const reader=response.body.getReader();let size=0;const parts=[];
   try{for(;;){const{value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes)throw Error('RESPONSE_TOO_LARGE');parts.push(value);}return JSON.parse(Buffer.concat(parts).toString('utf8'));}
   catch{await reader.cancel().catch(()=>{});throw Error('PROVIDER_RESPONSE_INVALID');}finally{reader.releaseLock();}
  }};
 };
}
