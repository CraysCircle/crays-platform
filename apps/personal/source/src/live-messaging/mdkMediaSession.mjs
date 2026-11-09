import {getEventHash} from 'nostr-tools/pure';
import {originalMdkFormat,validBoundGroupId} from './groupStorageFormat.mjs';
import {validMessageText} from './messageLimits.mjs';
const fail=()=>Error('This private group attachment is unavailable');
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const validFilename=value=>typeof value==='string'&&value.length>0&&new TextEncoder().encode(value).length<=255&&!/[\x00-\x1f\/\\]/.test(value);
/** Existing desktop media contract over canonical original MDK events. Epoch
 * keys stay in WASM; the journal stores the exact event before dispatch. An
 * uncertain send can only reconcile that same original, never re-encrypt it.
 * Transport is separately supplied by the current authorized deployment.
 */
export async function openMdkMediaSession({binding:input,runtime,journal,transport,baseUrl,getAdmission,authorize,signal}){
 const binding=Object.freeze({...input}),fields=['accountId','conversationId','groupId','membershipId','pubkey','storageFormat'];
 if(binding.storageFormat!==originalMdkFormat||!validBoundGroupId(binding)||runtime?.storageFormat!==originalMdkFormat||runtime.accountPubkey!==binding.pubkey||typeof transport?.upload!=='function'||typeof transport?.fetch!=='function'||typeof baseUrl!=='string'||typeof journal?.exclusive!=='function'||typeof journal?.getItem!=='function'||typeof journal?.setItem!=='function'||typeof getAdmission!=='function'||typeof authorize!=='function'||!signal?.addEventListener)throw fail();
 let closed=false,busy=false,rows=[],pendingSends=[],snapshot,refreshing=null,settling=Promise.resolve(),unsubscribe;const listeners=new Set(),stop=new AbortController();
 const check=(action='read')=>{const grant=getAdmission();if(closed||signal.aborted||stop.signal.aborted||!fields.every(key=>grant?.[key]===binding[key])||authorize(binding,action)!==true)throw fail();};
 const emit=()=>{snapshot=null;for(const f of listeners)try{f();}catch{}};
 const getSnapshot=()=>{let available=true;try{check();}catch{available=false;}const canSend=available&&authorize(binding,'send')===true;return snapshot&&snapshot.available===available&&snapshot.canSend===canSend?snapshot:snapshot=Object.freeze({available,canSend,rows:Object.freeze(available?rows:[]),pendingSends:Object.freeze(available?pendingSends:[]),sending:available&&busy});};
 async function refresh(){if(refreshing)return refreshing;refreshing=(async()=>{check();const page=await runtime.readTimeline(binding.groupId,{limit:200});check();const found=[];
  for(const row of page.messages){if(row.kind!==9||row.deleted||row.invalidation_status!==null)continue;const tags=row.tags?.filter(tag=>tag[0]==='imeta')??[];if(!tags.length)continue;const attachments=[];for(let i=0;i<Math.min(tags.length,8);i++){try{const ref=await runtime.mediaReference(binding.groupId,row.message_id_hex,i);check();attachments.push({filename:ref.file_name,mediaType:ref.media_type,index:i});}catch{check();}}
   if(!attachments.length)continue;found.push(Object.freeze({id:row.message_id_hex,text:row.plaintext,author:row.sender,createdAt:row.timeline_at,observedAt:row.timeline_at*1000,status:row.sender===binding.pubkey?(hex(row.source_message_id_hex)?'sent-to-relay':'unconfirmed'):'received',attachments:Object.freeze(attachments),fromHistory:true}));
  }const pending=[];for(const requestId of await pendingIndex()){check();const record=await journal.getItem(key(requestId));check();if(!record)continue;await original(record,requestId);const observed=page.messages.find(row=>row.message_id_hex===record.event.id);if(record.status==='sent-to-relay'||observed&&!observed.deleted&&observed.invalidation_status===null&&observed.sender===binding.pubkey&&hex(observed.source_message_id_hex))continue;pending.push(Object.freeze({requestId,messageId:record.event.id,filename:record.filename||'Attachment',text:record.event.content,createdAt:record.event.created_at}));}check();rows=found;pendingSends=pending;emit();return{added:found.length};})().finally(()=>{refreshing=null;});return refreshing;}
 const close=()=>{if(closed)return;closed=true;stop.abort();signal.removeEventListener('abort',close);unsubscribe?.();rows=[];pendingSends=[];emit();listeners.clear();};
 signal.addEventListener('abort',close,{once:true});check();
 const key=id=>'original-media-send:'+id;
 const validRequest=id=>typeof id==='string'&&/^[a-zA-Z0-9:_-]{1,200}$/.test(id);
 // This index lives in the same encrypted, account/membership-scoped journal.
 // Write its pointer before the original record, and both before dispatch.
 // An interruption between the two writes leaves only a harmless empty pointer.
 async function pendingIndex(){check();const value=await journal.getItem('original-media-pending-index');check();if(value===undefined||value===null)return[];if(!Array.isArray(value)||value.length>128||value.some(id=>!validRequest(id))||new Set(value).size!==value.length)throw fail();return value;}
 async function retainPending(requestId){const ids=[];for(const id of await pendingIndex()){check();const value=await journal.getItem(key(id));check();if(value){await original(value,id);if(value.status==='unconfirmed')ids.push(id);}}if(!ids.includes(requestId))ids.push(requestId);if(ids.length>128)throw Error('Resolve existing attachment sends before sending more files');await journal.setItem('original-media-pending-index',ids);check('send');}
 async function original(record,requestId){check();if(!record||record.requestId!==requestId||!['unconfirmed','sent-to-relay'].includes(record.status)||record.schema!==1||record.groupId!==binding.groupId||record.membershipId!==binding.membershipId||record.event?.pubkey!==binding.pubkey||record.event.kind!==9||record.event.id!==getEventHash(record.event)||!record.event.tags.some(tag=>tag.length===2&&tag[0]==='crays-request'&&tag[1]===requestId)||record.filename!==undefined&&!validFilename(record.filename))throw fail();return record;}
 async function reconcile(record,{resume=false}={}){
  check();const page=await runtime.readTimeline(binding.groupId,{limit:200});check();
  const row=page.messages.find(row=>row.message_id_hex===record.event.id);
  if(row&&!row.deleted&&row.invalidation_status===null&&row.sender===binding.pubkey&&hex(row.source_message_id_hex)){
   record={...record,status:'sent-to-relay'};await journal.setItem(key(record.requestId),record);check();
  }else if(resume&&record.status==='unconfirmed'){
   // A crash after the journal checkpoint may precede the first engine call.
   // Submit only the retained app event. Original MDK deduplicates it and owns
   // any already prepared encrypted fanout; never prepare media or upload again.
   check('send');await runtime.sendChatEvent(binding.groupId,record.event);check('send');
   if(typeof runtime.reconcile==='function'){await runtime.reconcile(binding.groupId);check('send');}
   return reconcile(record);
  }
  return{status:record.status,messageId:record.event.id,requestId:record.requestId};
 }
 async function send({requestId,file,filename,caption=''}){
  check('send');if(!validRequest(requestId)||!(file instanceof Blob)||!file.size||file.size>5*1024*1024-16||!validFilename(filename)||!validMessageText(caption))throw fail();
  return journal.exclusive('original-media-publication',async()=>{check('send');let body=new Uint8Array(await file.arrayBuffer()),prepared;
   try{const fingerprint=await digest(new TextEncoder().encode(JSON.stringify([filename,file.type,body.length,await digest(body),caption])));check('send');const prior=await journal.getItem(key(requestId));check('send');if(prior){const retained=await original(prior,requestId);if(retained.fingerprint!==fingerprint)throw fail();busy=true;emit();const result=await reconcile(retained,{resume:true});await refresh();return result;}
    busy=true;emit();prepared=await runtime.prepareMedia(binding.groupId,{data:body,fileName:filename,mediaType:file.type||'application/octet-stream'});check('send');
    const url=await transport.upload({baseUrl,data:prepared.ciphertext,ciphertextSha256:prepared.reference.ciphertext_sha256,signal:stop.signal,maxBytes:5*1024*1024});check('send');
    const reference={...prepared.reference,locators:[{kind:'blossom-v1',value:url}],dim:null,thumbhash:null},tag=await runtime.buildMediaTag(binding.groupId,reference);check('send');
    const value={pubkey:binding.pubkey,kind:9,created_at:Math.floor(Date.now()/1000),tags:[['crays-request',requestId],tag],content:caption.trim()?caption:filename},event={...value,id:getEventHash(value)};
    let record={schema:1,requestId,fingerprint,groupId:binding.groupId,membershipId:binding.membershipId,event,status:'unconfirmed',filename};
    await retainPending(requestId);check('send');
    await journal.setItem(key(requestId),record);check('send');
    const result=await runtime.sendChatEvent(binding.groupId,event);check('send');if(result.publishedAppMessages?.some(row=>row.groupId===binding.groupId&&row.appEventId===event.id&&hex(row.transportId))||result.existingAppEventId===event.id&&hex(result.confirmedTransportId)){record={...record,status:'sent-to-relay'};await journal.setItem(key(requestId),record);check('send');}
    await refresh();return{status:record.status,messageId:event.id,requestId};
   }finally{body.fill(0);prepared?.ciphertext.fill(0);busy=false;emit();}
  });
 }
 async function resumeSend(requestId){check('send');if(!validRequest(requestId))throw fail();return journal.exclusive('original-media-publication',async()=>{check('send');const record=await original(await journal.getItem(key(requestId)),requestId);check('send');busy=true;emit();try{return await reconcile(record,{resume:true});}finally{busy=false;await refresh();emit();}});}
 async function load(id,index=0){check();const reference=await runtime.mediaReference(binding.groupId,id,index);check();let cipher,data;
  try{const locator=reference.locators.find(row=>row.kind==='blossom-v1');if(!locator)throw fail();cipher=await transport.fetch({url:locator.value,signal:stop.signal,maxBytes:5*1024*1024});check();data=await runtime.openMedia(binding.groupId,id,index,cipher);check();return{data,attachment:{filename:reference.file_name,mediaType:reference.media_type}};}catch(error){data?.fill(0);throw error;}finally{cipher?.fill(0);}
 }
 unsubscribe=runtime.subscribeTimeline(change=>{if(change?.kind==='closed'){close();return;}const work=refresh().catch(()=>{try{check();}catch{close();}});settling=Promise.allSettled([settling,work]);});
 try{await refresh();}catch(error){close();throw error;}
 return Object.freeze({getSnapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},adoptHistory:()=>refresh(),send,resumeSend,load,flush:async()=>{await settling;await refreshing;},close});
}
