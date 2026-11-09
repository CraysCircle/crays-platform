import {captureOwnAttachmentReference} from '../../db/personal-message-attachment-input.mjs';

export const MAX_NATIVE_ORIGINAL_READ_BYTES=16*1024*1024;
const fail=code=>Error('NATIVE_PERSONAL_'+code);
export function assertNativeOriginalReadTransport(request) {
 const u=new URL(request.url),type=request.headers.get('content-type')??'';
 if(request.method!=='POST'||u.pathname!=='/api/native/personal-message-originals/read'||u.search||u.hash||
   request.headers.has('cookie')||request.headers.has('x-crays-email-authorization')||request.headers.has('content-encoding')||
   !/^application\/json(?:;\s*charset=utf-8)?$/i.test(type))throw fail('REQUEST_NOT_ADMITTED');
 const size=request.headers.get('content-length');
 if(size!==null&&(!/^[1-9][0-9]{0,3}$/.test(size)||Number(size)>2048))throw fail('ORIGINAL_TOO_LARGE');
}
/** Fixed reference only, after the existing Auth0/Core lookup. Never a path,
 * URL, model identity, retention change or generic file-read permission. */
export async function readNativeOriginalReference(request,assertCurrent) {
 assertNativeOriginalReadTransport(request);assertCurrent();
 const reader=request.body?.getReader();if(!reader)throw fail('REQUEST_NOT_ADMITTED');
 let total=0,complete=false,timer;const chunks=[];
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(fail('ORIGINAL_READ_TIMEOUT'));void reader.cancel().catch(()=>{});},10000);timer.unref?.();});
 try {
  for(;;){assertCurrent();const part=await Promise.race([reader.read(),deadline]);if(part.done){complete=true;break;}
   total+=part.value.byteLength;if(total>2048)throw fail('ORIGINAL_TOO_LARGE');chunks.push(part.value);}
 }finally{clearTimeout(timer);if(!complete)void reader.cancel().catch(()=>{});reader.releaseLock();}
 assertCurrent();const size=request.headers.get('content-length');if(size!==null&&Number(size)!==total)throw fail('REQUEST_NOT_ADMITTED');
 let reference;try{reference=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{throw fail('REQUEST_NOT_ADMITTED');}
 return captureOwnAttachmentReference(reference);
}

// Process-local buffer admission, never an authority or durable work queue.
// Keep the slot until the response closes/cancels, rather than just until SQL.
const active=new Set();
export function acquireNativeOriginalReadCapacity(accountId) {
 if(active.has(accountId)||active.size>=2)throw fail('ORIGINAL_READ_BUSY');
 active.add(accountId);let ended=false;
 return Object.freeze({assertCurrent(){if(ended)throw fail('ORIGINAL_READ_UNAVAILABLE');},release(){if(!ended){ended=true;active.delete(accountId);}}});
}

/** Canonical reader already recomputed the full source digest. This private
 * byte response makes no decoded/model/delivery claim and exposes no filename.
 * Copied64KiB chunks do not retain a full original after cancellation/deadline.
 */
export function createNativeOriginalReadResponse(result,signal) {
 const releaseSlot=result.release;
 let bytes=result.bytes,offset=0,ended=false,timer,controller;
 const release=()=>{if(ended)return;ended=true;clearTimeout(timer);signal.removeEventListener('abort',abort);bytes=undefined;releaseSlot();};
 const stop=error=>{if(ended)return;try{controller?.error(error);}finally{release();}};
 const abort=()=>stop(fail('CANCELLED'));
 try {
  const r=result.receipt;
  if(signal.aborted)throw fail('CANCELLED');
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>MAX_NATIVE_ORIGINAL_READ_BYTES||bytes.byteLength!==r.byteLength||r.available!==true)throw fail('ORIGINAL_READ_UNAVAILABLE');
  const headers={'Cache-Control':'no-store, private, no-transform','X-Content-Type-Options':'nosniff','Content-Type':r.mimeType,'Content-Encoding':'identity',
   'Content-Length':String(bytes.byteLength),'Content-Disposition':'attachment; filename="original"',
   'X-Crays-Original-Id':r.attachmentId,'X-Crays-Original-Version':String(r.version),
   'X-Crays-Original-Sha256':r.sha256,'X-Crays-Original-Message-Receipt':r.messageReceiptId,
   'X-Crays-Original-Registration-Receipt':r.registrationReceiptId};
  const stream=new ReadableStream({
   start(c){controller=c;signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}
    timer=setTimeout(()=>stop(fail('ORIGINAL_READ_TIMEOUT')),30000);timer.unref?.();},
   pull(c){if(ended)return;try{
    if(signal.aborted)throw fail('CANCELLED');
    const end=Math.min(offset+65536,bytes.byteLength),chunk=Uint8Array.from(bytes.subarray(offset,end));offset=end;c.enqueue(chunk);
    if(offset===bytes.byteLength){c.close();release();}
   }catch(error){stop(error);}},
   cancel(){release();},
  });
  return new Response(stream,{status:200,headers});
 }catch(error){release();throw error;}
}
