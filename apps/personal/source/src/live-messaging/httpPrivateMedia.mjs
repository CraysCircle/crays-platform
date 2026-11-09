import {PRIVATE_FILE_MAX_BYTES,decryptPrivateFileMessage,parsePrivateFileMessage} from './privateFileMessage.mjs';
import {privateAttachmentCache} from './privateAttachmentCache.mjs';
const fail=()=>Error('This private attachment is unavailable');
const encode=bytes=>{const parts=[];for(let offset=0;offset<bytes.length;offset+=24576)parts.push(btoa(String.fromCharCode(...bytes.subarray(offset,offset+24576))));return parts.join('');};
function attachmentValue(a){if(!a||!Number.isInteger(a.cipherBytes))throw fail();const tags=[['file-type',a.mediaType],['encryption-algorithm','aes-gcm'],['decryption-key',a.key],['decryption-nonce',a.nonce],['x',a.sha256],['ox',a.plainSha256],['size',String(a.cipherBytes)],['name',a.filename]];const result=parsePrivateFileMessage({kind:15,content:a.url,tags});if(result.bytes!==a.bytes)throw fail();return result;}
/** Same current SDK/Core conversation as the text port. No browser identity key,
 * public blob fetch, external URL fetch or synthetic message insertion. */
export function createHttpPrivateMedia({client,accountId,conversationId,isCurrent,signal,fetcher=globalThis.fetch,attachmentCache=privateAttachmentCache}){
 let closed=false,busy=false,active=0,cached=null,last=null;const listeners=new Set(),controllers=new Set(),readControllers=new Set();
 const current=()=>!closed&&!signal.aborted&&isCurrent()===true&&client.getSnapshot().available;
 const emit=()=>{cached=null;for(const fn of listeners)fn();};
 const unsubscribe=client.subscribe(emit);const close=()=>{if(closed)return;closed=true;active++;signal.removeEventListener('abort',close);unsubscribe();for(const c of controllers)c.abort();controllers.clear();emit();listeners.clear();};signal.addEventListener('abort',close,{once:true});
 const check=()=>{if(!current())throw fail();};
 async function post(route,body,binary=false){check();const c=new AbortController();controllers.add(c);if(route==='attachment')readControllers.add(c);const timeout=setTimeout(()=>c.abort(),20000);let reader;
  try{const response=await fetcher('/api/crays/personal/messaging/'+route,{method:'POST',headers:{'content-type':'application/json','x-crays-web-account-context':accountId},body:JSON.stringify({conversationId,...body}),credentials:'same-origin',cache:'no-store',redirect:'error',signal:c.signal});check();if(!response.ok||response.redirected)throw fail();const type=response.headers.get('content-type')||'';if(binary?!type.startsWith('application/octet-stream'):!type.startsWith('application/json'))throw fail();
   reader=response.body?.getReader();if(!reader)throw fail();const chunks=[];let size=0;for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>(binary?PRIVATE_FILE_MAX_BYTES+16:8192))throw fail();chunks.push(part.value);}check();const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return binary?bytes:JSON.parse(new TextDecoder().decode(bytes));
  }finally{clearTimeout(timeout);await reader?.cancel().catch(()=>{});reader?.releaseLock();controllers.delete(c);readControllers.delete(c);}
 }
 const port={cancelReads(){for(const controller of readControllers)controller.abort();readControllers.clear();},getSnapshot(){const source=client.getSnapshot();if(cached&&last===source)return cached;last=source;cached=Object.freeze({available:current()&&source.supportsAttachments===true,canSend:source.canSend!==false,rows:current()?source.messages.map(m=>({...m,attachments:m.attachments||[]})):[],sending:busy});return cached;},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  async send({requestId,file,filename,caption=''}){check();if(busy||client.getSnapshot().supportsAttachments!==true||client.getSnapshot().canSend===false||!file||file.size<1||file.size>PRIVATE_FILE_MAX_BYTES)throw fail();const generation=active;busy=true;emit();let bytes;try{bytes=new Uint8Array(await file.arrayBuffer());check();const envelope=await post('send-file',{requestId,text:caption,file:{filename,mediaType:file.type||'application/octet-stream',data:encode(bytes)}});check();const result=envelope?.result;if(envelope.status!=='ready'||!result||!['sent-to-relay','unconfirmed'].includes(result.status)||result.requestId!==requestId)throw fail();await client.refresh();check();return result;}finally{bytes?.fill(0);if(generation===active){busy=false;emit();}}},
  async load(messageId,index=0){
   check();const row=client.getSnapshot().messages.find(m=>m.id===messageId),attachment=attachmentValue(row?.attachments?.[index]);
   const allowed=()=>current()&&client.getSnapshot().messages.some(m=>m.id===messageId&&m.attachments?.[index]?.sha256===attachment.sha256);
   const checkRow=()=>{if(!allowed())throw fail();};const scope=[accountId,conversationId,messageId,index,attachment.sha256];let plain;
   try{checkRow();let data=await attachmentCache.read(scope,attachment.sha256,attachment.cipherBytes);checkRow();const downloaded=!data,eventIds=row?.eventIds?.slice(-8);
    if(!data)data=await post('attachment',{messageId,index,...(eventIds?.length?{eventIds}:{})},true);checkRow();plain=await decryptPrivateFileMessage({data,attachment});checkRow();
    if(downloaded)await attachmentCache.write(scope,attachment.sha256,data);checkRow();return {data:plain,attachment};
   }catch(error){plain?.fill(0);throw error;}
  },
  async adoptHistory(){throw Error('History is owned by the admitted conversation');},async flush(){},close};return Object.freeze(port);
}
