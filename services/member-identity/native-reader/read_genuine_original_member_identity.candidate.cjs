'use strict';
const ORIGIN='https://member.crays.world';
const PATH='/api/crays/clubs/member/session';
/** Read the original SDK/Core response using only this genuine browser's cookies. */
async function readNativeIdentity({page,context}) {
 if (!page || !context || page.context()!==context || new URL(page.url()).origin!==ORIGIN) return null;
 const before=page.url();
 const identity=await page.evaluate(async ({origin,path})=>{
  if(location.origin!==origin)return null;
  const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),8000);
  try {
   const response=await fetch(path,{method:'GET',credentials:'same-origin',redirect:'error',cache:'no-store',signal:abort.signal});
   if(response.status===401)return {providerAuthenticated:false,accountMapped:false};
   if(response.status!==200)return null;
   if(!String(response.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))return null;
   if(!response.body)return null;
   const reader=response.body.getReader();const chunks=[];let count=0;
   try{while(true){const part=await reader.read();if(part.done)break;count+=part.value.byteLength;if(count>262144){await reader.cancel();return null;}chunks.push(part.value);}}finally{reader.releaseLock();}
   const joined=new Uint8Array(count);let at=0;for(const part of chunks){joined.set(part,at);at+=part.byteLength;}
   const value=JSON.parse(new TextDecoder().decode(joined));const account=value.account;
   if(value.status!=='ready'||value.authenticated!==true||value.accountMapped!==true||value.sessionMode!=='auth0'||!account||account.provider!=='auth0')return null;
   if(typeof account.id!=='string'||!account.id||account.id.length>128||typeof account.email!=='string'||!account.email||account.email.length>254)return null;
   return {providerAuthenticated:true,accountMapped:true,sessionStatus:'crays_mapped',accountId:account.id,email:account.email,emailVerified:account.emailVerified===true};
  } catch (_) {return null;} finally {clearTimeout(timer);}
 },{origin:ORIGIN,path:PATH});
 if(page.context()!==context||new URL(page.url()).origin!==ORIGIN||page.url()!==before)return null;
 return identity;
}
module.exports={readNativeIdentity};
