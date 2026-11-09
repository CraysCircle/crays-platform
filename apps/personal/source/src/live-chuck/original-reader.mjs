import {fail} from './protocol.mjs';
import {originalReference,originalReadReference,isOriginalLocallyRetained,NATIVE_ORIGINAL_TRANSFER_MAX_BYTES} from './originals.mjs';
const path='/api/crays/personal/chuck/original';
/** Same-session byte read, never a URL/model grant. No partial Blob is exposed;
 * current metadata, exact receipt headers, full length and digest must agree. */
export function createChuckOriginalReader({accountScope,fetch:fetcher=globalThis.fetch,subtle=globalThis.crypto?.subtle}={}){
 if(typeof accountScope!=='string'||!accountScope.length||accountScope.length>200||/[^\x21-\x7e]/.test(accountScope)||typeof fetcher!=='function'||typeof subtle?.digest!=='function')throw fail('invalid-transport');
 return async(value,{signal,onProgress}={})=>{
  const reference=originalReference(value),input=originalReadReference(reference);
  const requestSignal=signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000);
  const current=()=>{if(signal?.aborted)throw fail('cancelled');if(requestSignal.aborted)throw fail('connection');if(!isOriginalLocallyRetained(reference))throw fail('original-unavailable');};
  current();if(reference.byteLength>NATIVE_ORIGINAL_TRANSFER_MAX_BYTES)throw fail('original-too-large');
  let response;
  try{response=await fetcher(path,{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:reference.mimeType,'Content-Type':'application/json','X-Crays-Web-Account-Context':accountScope},body:JSON.stringify(input),signal:requestSignal});}catch{current();throw fail('connection');}
  const reader=response.body?.getReader();let complete=false;
  try{
   if(signal?.aborted)throw fail('cancelled');
   if(response.status===401||response.status===403)throw fail('access-denied');
   current();
   if(response.status===429)throw fail('original-busy');
   if(response.status===404)throw fail('original-unavailable');
   if(response.status===413)throw fail('original-too-large');
   if(response.status!==200||response.redirected||!reader)throw fail('unavailable');
   const expected={'content-type':reference.mimeType,'content-length':String(reference.byteLength),'content-encoding':'identity','content-disposition':'attachment; filename="original"','x-crays-original-id':reference.attachmentId,'x-crays-original-version':String(reference.version),'x-crays-original-sha256':reference.sha256,'x-crays-original-message-receipt':reference.messageReceiptId,'x-crays-original-registration-receipt':reference.registrationReceiptId};
   if(Object.entries(expected).some(([name,value])=>response.headers.get(name)!==value))throw fail('invalid-response');
   const bytes=new Uint8Array(reference.byteLength);let offset=0;
   for(;;){current();const part=await reader.read();current();if(part.done)break;if(!(part.value instanceof Uint8Array)||part.value.byteLength>bytes.length-offset)throw fail('invalid-response');bytes.set(part.value,offset);offset+=part.value.byteLength;onProgress?.(offset,bytes.length);current();}
   if(offset!==bytes.length)throw fail('invalid-response');
   const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));current();
   if(Array.from(digest,value=>value.toString(16).padStart(2,'0')).join('')!==reference.sha256)throw fail('invalid-response');
   complete=true;return new Blob([bytes],{type:reference.mimeType});
  }catch(error){if(signal?.aborted)throw fail('cancelled');if(error?.code==='access-denied')throw error;if(requestSignal.aborted)throw fail('connection');throw error;}
  finally{if(reader){if(!complete){try{await reader.cancel();}catch{/* Rejection remains authoritative. */}}reader.releaseLock();}}
 };
}
