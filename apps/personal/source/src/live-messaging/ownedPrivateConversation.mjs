import {preparePrivateFileMessage,parsePrivateFileMessage,privateFileMime} from './privateFileMessage.mjs';
import {getEventHash,generateSecretKey,finalizeEvent,nip44,verifyEvent} from 'nostr-tools';
import {OwnedPrivateInboxPeer} from './ownedPrivateInbox.mjs';
import {validMessageText} from './messageLimits.mjs';
import {readPrivateInboxHistoryPage} from './privateInboxHistory.mjs';
import {createPrivateRumorCache} from './privateRumorCache.mjs';
const fail=()=>Error('Private conversation unavailable');
/** Compatibility for existing individually encrypted NIP-17 threads. Fresh
 * outer gift-wrap keys are transient protocol envelopes, never user identities.
 * Group messages continue to use the independently admitted Marmot engine. */
export async function wrapExistingPrivateRumor({rumor,recipient,signer,isCurrent}){
 if(isCurrent()!==true||rumor.pubkey!==await signer.getPublicKey()||getEventHash(rumor)!==rumor.id)throw fail();
 const content=await signer.nip44.encrypt(recipient,JSON.stringify(rumor));if(isCurrent()!==true)throw fail();
 const coverTime=()=>Math.floor(Date.now()/1000)-(globalThis.crypto.getRandomValues(new Uint32Array(1))[0]%172800);
 // NIP-59 randomizes seal/wrap times; the actual conversational timestamp
 // remains inside the encrypted original and controls message ordering.
 const seal=await signer.signEvent({kind:13,created_at:coverTime(),tags:[],content});if(isCurrent()!==true||seal.pubkey!==rumor.pubkey||!verifyEvent(seal))throw fail();
 const cover=generateSecretKey();let shared;
 try{shared=nip44.v2.utils.getConversationKey(cover,recipient);const event=finalizeEvent({kind:1059,created_at:coverTime(),tags:[['p',recipient]],content:nip44.v2.encrypt(JSON.stringify(seal),shared)},cover);if(isCurrent()!==true)throw fail();return event;}finally{shared?.fill(0);cover.fill(0);}
}

/** The caller provides exact independent admission and a durable encrypted
 * intent journal. Relay acknowledgements are never called recipient delivery. */
export function createOwnedPrivateConversation({binding,peerPubkey,spotId,registry,signer,isCurrent,signal,journal,seedIds=[],fileStore,historyPageSize=200,rumorCache,rumorCacheScope,completeInbox=false}){
 if(!binding?.accountId||!binding.conversationId||!binding.pubkey||!['person','spot'].includes(binding.kind)||!Array.isArray(seedIds)||typeof journal?.exclusive!=='function'||typeof journal?.read!=='function'||typeof journal?.writeIntent!=='function'||typeof journal?.writeReceipt!=='function'||typeof journal?.recent!=='function')throw fail();
 if(!Number.isInteger(historyPageSize)||historyPageSize<1||historyPageSize>200)throw fail();
 let closed=false,snapshot=Object.freeze({available:false,messages:[],supportsReplies:true,hasEarlierMessages:false}),historyCursor=null,historyExpanded=false,completeMessages=null;
 const current=()=>!closed&&!signal.aborted&&isCurrent()===true;
 const check=()=>{if(!current()){snapshot=Object.freeze({available:false,messages:[]});throw fail();}};
 const decoded=rumorCache??createPrivateRumorCache();
 const decodeScope=Object.freeze([...(rumorCacheScope??[]),...['accountId','conversationId','kind','groupId','membershipId','pubkey'].map(k=>binding[k]),spotId,peerPubkey]);
 if(rumorCache&&!rumorCacheScope?.length)throw fail();
 // Sharing verification work never shares a conversation grant. Each caller
 // still reads the exact relay and filters every rumor with belongs().
 const cacheScope=rumorCache?Object.freeze([...rumorCacheScope,binding.accountId,binding.pubkey,spotId]):decodeScope;
 const decode=event=>decoded.unwrap({scope:cacheScope,event,recipient:binding.pubkey,signer,isCurrent:current});
 const belongs=rumor=>rumor.pubkey===peerPubkey&&rumor.tags.some(t=>t[0]==='p'&&t[1]===binding.pubkey)||rumor.pubkey===binding.pubkey&&rumor.tags.some(t=>t[0]==='p'&&t[1]===peerPubkey);
 async function withPeer(operation){check();const peer=new OwnedPrivateInboxPeer({spotId,registry,recipient:binding.pubkey,signer,isCurrent:current,signal});try{await peer.ready();check();return await operation(peer);}finally{peer.close();}}
 async function ingest(actual,{retain=false,priorMessages}={}){
  const messages=new Map((priorMessages??(retain?snapshot.messages:[])).map(m=>[m.id,m]));
  for(const event of actual){check();const rumor=await decode(event);if(!belongs(rumor))continue;const request=rumor.tags.find(t=>t[0]==='crays-request')?.[1];const replyTo=rumor.tags.find(t=>t[0]==='e')?.[1];const attachment=rumor.kind===15?parsePrivateFileMessage(rumor):null;const prior=messages.get(rumor.id);messages.set(rumor.id,Object.freeze({id:rumor.id,text:attachment?attachment.caption:rumor.content,...(attachment?{attachments:[attachment]}:{}),author:rumor.pubkey,createdAt:rumor.created_at,status:rumor.pubkey===binding.pubkey?'sent-to-relay':'received',...(request?{requestId:request}:{}),...(replyTo?{replyTo}:{}),eventIds:Object.freeze([...new Set([...(prior?.eventIds??[]),event.id])])}));}
  check();return Object.freeze([...messages.values()].sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id)));
 }
 function publish(messages){check();snapshot=Object.freeze({available:true,messages,supportsReplies:true,supportsAttachments:!!fileStore,hasEarlierMessages:historyCursor!==null,historyCursor,historyExpanded,...(completeMessages?{latestHistoryComplete:true}:{})});return snapshot;}
 const chronologicalScope=JSON.stringify(decodeScope);
 function chronologicalWindow(cursor=null){
  check();if(!completeMessages)throw fail();
  if(cursor!==null&&(!cursor||Object.keys(cursor).sort().join(',')!=='beforeCreatedAt,beforeId,scope,version'||cursor.version!==3||cursor.scope!==chronologicalScope||!Number.isSafeInteger(cursor.beforeCreatedAt)||typeof cursor.beforeId!=='string'||!/^[a-f0-9]{64}$/.test(cursor.beforeId)))throw fail();
  // This cursor refers to VERIFIED INNER originals, never randomized covers.
  // Re-checking the complete admitted inbox also tolerates a deleted boundary.
  const eligible=cursor===null?completeMessages:completeMessages.filter(m=>m.createdAt<cursor.beforeCreatedAt||m.createdAt===cursor.beforeCreatedAt&&m.id<cursor.beforeId);
  const page=eligible.slice(-historyPageSize),oldest=page[0];
  historyCursor=eligible.length>page.length?Object.freeze({version:3,scope:chronologicalScope,beforeCreatedAt:oldest.createdAt,beforeId:oldest.id}):null;
  historyExpanded=cursor!==null;return publish(cursor===null?page:Object.freeze([...new Map([...page,...snapshot.messages].map(m=>[m.id,m])).values()].sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id))));
 }
 async function readComplete(peer){
  if(await peer.supportsHistoryCursor()!==true)throw Object.assign(fail(),{code:'HISTORY_CURSOR_UNSUPPORTED'});check();
  let cursor=null,messages=Object.freeze([]);const seen=new Set();let bytes=0;
  do{
   const page=await readPrivateInboxHistoryPage({peer,binding,isCurrent:current,cursor,pageSize:200});check();
   for(const e of page.events){if(seen.has(e.id))throw fail();seen.add(e.id);bytes+=new TextEncoder().encode(JSON.stringify(e)).length;}
   // Explicit resource failure is preferable to silently presenting the first
   // outer-time page as the latest conversation. Existing HTTP cancellation
   // also bounds network/custody work to the original twenty-second request.
   if(seen.size>10000||bytes>32*1024*1024)throw Object.assign(fail(),{code:'HISTORY_SYNC_BUDGET_EXCEEDED'});
   messages=await ingest(page.events,{priorMessages:messages});check();cursor=page.nextCursor;
  }while(cursor!==null);
  check();completeMessages=messages;return chronologicalWindow();
 }
 async function refresh(){check();return withPeer(async peer=>{
  if(completeInbox)return readComplete(peer);
  const records=await journal.recent();check();const ids=[...new Set([...seedIds,...records.flatMap(r=>r.events.filter(e=>e.tags.some(t=>t[0]==='p'&&t[1]===binding.pubkey)).map(e=>e.id))])].slice(-100);
  const page=await readPrivateInboxHistoryPage({peer,binding,isCurrent:current,pageSize:historyPageSize});check();const actual=[...page.events],seen=new Set(actual.map(e=>e.id));const missing=ids.filter(id=>!seen.has(id));if(missing.length)actual.push(...await peer.readOriginals(missing));
  const messages=await ingest(actual,{retain:historyExpanded});check();if(!historyExpanded)historyCursor=page.nextCursor;return publish(messages);
 });}
 async function loadOlder({cursor=historyCursor}={}){
  check();if(!snapshot.available)throw fail();if(cursor===null)return snapshot;
  if(completeInbox&&cursor?.version===3)return chronologicalWindow(cursor);
  return withPeer(async peer=>{const page=await readPrivateInboxHistoryPage({peer,binding,isCurrent:current,cursor,pageSize:historyPageSize});check();const messages=await ingest(page.events,{retain:true});check();historyCursor=page.nextCursor;historyExpanded=true;return publish(messages);});
 }
 async function resolveOriginal(messageId,eventIds){
  check();if(!/^[a-f0-9]{64}$/.test(messageId)||!Array.isArray(eventIds)||eventIds.length<1||eventIds.length>8||eventIds.some(id=>typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))||new Set(eventIds).size!==eventIds.length)throw fail();
  return withPeer(async peer=>{
   const actual=await peer.readOriginals(eventIds),matched=[];check();
   // An older browser row is a lookup hint, never proof of its author, content,
   // access or file key. Re-open exact signed wraps under the current grant.
   for(const event of actual){const rumor=await decode(event);if(rumor.id===messageId&&belongs(rumor))matched.push(event);}
   if(!matched.length)throw fail();return publish(await ingest(matched,{retain:true}));
  });
 }
 async function send({requestId,text,replyTo=null,replyEventIds,file=null}){
  check();if(!validMessageText(text)||!text.trim()&&!file||file&&(!fileStore||!(file.data instanceof Uint8Array))||typeof requestId!=='string'||!/^[a-zA-Z0-9:._-]{1,200}$/.test(requestId)||replyTo!==null&&!/^[a-f0-9]{64}$/.test(replyTo))throw fail();
  return journal.exclusive(requestId,async()=>{
   check();let record=await journal.read(requestId);check();
   if(record){const own=record.events.find(e=>e.tags.some(t=>t[0]==='p'&&t[1]===binding.pubkey));if(!own)throw fail();const original=await decode(own);const attachment=original.kind===15?parsePrivateFileMessage(original):null;if((attachment?attachment.caption:original.content)!==text||Boolean(attachment)!==Boolean(file)||(original.tags.find(t=>t[0]==='e')?.[1]??null)!==replyTo||original.pubkey!==binding.pubkey||!belongs(original))throw fail();if(file&&(attachment.filename!==file.filename||attachment.mediaType!==privateFileMime(file.mediaType)||attachment.plainSha256!==Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',file.data)),b=>b.toString(16).padStart(2,'0')).join('')))throw fail();if(record.receipt?.status==='sent-to-relay')return record.receipt;}
   else{
    if(replyTo&&!snapshot.messages.some(m=>m.id===replyTo&&['received','sent-to-relay'].includes(m.status)))await resolveOriginal(replyTo,replyEventIds);
    let prepared;if(file){prepared=await preparePrivateFileMessage({data:file.data,filename:file.filename,mediaType:file.mediaType,caption:text,blossom:fileStore.protocol==='blossom'});check();await fileStore.write(prepared.data);check();}const unsigned={kind:file?15:14,pubkey:binding.pubkey,created_at:Math.floor(Date.now()/1000),tags:[['p',peerPubkey],['crays-request',requestId],...(replyTo?[['e',replyTo]]:[]),...(prepared?prepared.tags:[])],content:prepared?prepared.content:text};const rumor={...unsigned,id:getEventHash(unsigned)};
    const events=[];for(const recipient of [peerPubkey,binding.pubkey])events.push(await wrapExistingPrivateRumor({rumor,recipient,signer,isCurrent:current}));check();record={requestId,messageId:rumor.id,events};await journal.writeIntent(requestId,record);check();
   }
   // The immutable intent is durable before the first write; a retry republishes
   // identical event IDs, so lost ACKs cannot create duplicate original messages.
   let accepted=true;await withPeer(async peer=>{for(const event of record.events){if(!event.tags.some(t=>t[0]==='p'&&[peerPubkey,binding.pubkey].includes(t[1])))throw fail();const ack=await peer.publishPrivate(event);accepted=accepted&&ack.accepted;}});check();
   const receipt=Object.freeze({status:accepted?'sent-to-relay':'unconfirmed',requestId,messageId:record.messageId,eventIds:record.events.map(e=>e.id)});await journal.writeReceipt(requestId,receipt);check();return receipt;
  });
 }
 return Object.freeze({prepareCommand(){check();return publish(Object.freeze([]));},getSnapshot:()=>current()?snapshot:Object.freeze({available:false,messages:[]}),refresh,loadOlder,send,async loadAttachment({messageId,index=0,eventIds}){check();if(!snapshot.messages.some(m=>m.id===messageId))await resolveOriginal(messageId,eventIds);const attachment=snapshot.messages.find(m=>m.id===messageId)?.attachments?.[index];if(!attachment||!fileStore)throw fail();const data=await fileStore.read(attachment.sha256);check();return data;},close(){closed=true;completeMessages=null;if(!rumorCache)decoded.clear();historyCursor=null;historyExpanded=false;snapshot=Object.freeze({available:false,messages:[]});}});
}
