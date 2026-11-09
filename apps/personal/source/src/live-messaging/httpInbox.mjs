import {validHumanConversationId,matchingHumanConversationAddress} from './humanConversationAddress.mjs';
const prefix='/api/crays/personal/messaging/inbox?cursor=';
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const id=validHumanConversationId;
const fail=()=>Error('Conversation previews are temporarily unavailable');
function validate(page,cursor,pubkey){
 if(!page||!Array.isArray(page.entries)||page.entries.length>60||!Array.isArray(page.sources)||page.sources.length>10||!Number.isInteger(page.total)||page.total<0||page.total>1000||cursor>page.total||!(page.nextCursor===null||page.nextCursor===cursor+60&&page.nextCursor<page.total))throw fail();
 if(page.entries.length!==Math.min(60,page.total-cursor))throw fail();
 const ids=new Set();
 for(const row of page.entries){
  if(!id(row.conversationId)||row.kind!==undefined&&!matchingHumanConversationAddress(row)||ids.has(row.conversationId)||!hex(row.groupId)||!hex(row.membershipId)||!['ready','partial','unavailable'].includes(row.state)||!Array.isArray(row.receivedIds)||row.receivedIds.length>200||!row.receivedIds.every(hex)||new Set(row.receivedIds).size!==row.receivedIds.length)throw fail();
  if(row.receivedTimes!==undefined&&(!Array.isArray(row.receivedTimes)||row.receivedTimes.length!==row.receivedIds.length||row.receivedTimes.some((m,i)=>m.messageId!==row.receivedIds[i]||!Number.isSafeInteger(m.createdAt)||m.createdAt<0||m.createdAt>253402300799)))throw fail();
  ids.add(row.conversationId);const m=row.latest;
  if(m!==null&&(!m||!hex(m.messageId)||!hex(m.author)||!Number.isSafeInteger(m.createdAt)||m.createdAt<0||m.createdAt>253402300799||typeof m.text!=='string'||m.text.length>300||m.mediaType!==undefined&&(typeof m.mediaType!=='string'||m.mediaType.length>150)||m.status!==(m.author===pubkey?'sent-to-relay':'received')))throw fail();
  if(row.state==='unavailable'&&(m!==null||row.receivedIds.length))throw fail();
 }
 return page;
}
/** Progressive summaries never block opening a conversation. Every page comes
 * from the current SDK/Core admission; no world/seed messages are substituted.
 * One bounded cycle per account, no full-screen loading state or key creation. */
export function createHttpInbox({accountId,pubkey,signal,isCurrent,receivePage,setStatus,clear,fetcher=globalThis.fetch,events=globalThis,document=globalThis.document,intervalMs=120000}){
 let closed=signal.aborted,pending=null,timer,lastStarted=0,request,foreground=0,priorityRevision=0;const priorityWaiters=new Set();
 const waitForForeground=async()=>{while(current()&&foreground)await new Promise(resolve=>priorityWaiters.add(resolve));};
 const releaseWaiters=()=>{for(const resolve of priorityWaiters)resolve();priorityWaiters.clear();};
 const current=()=>!closed&&!signal.aborted&&isCurrent()===true;
 const schedule=()=>{clearTimeout(timer);if(current())timer=setTimeout(()=>{if(document?.visibilityState!=='hidden')void refresh();else schedule();},intervalMs);};
 const clearRequest=()=>{request?.abort();request=null;};
 async function cycle(){
  lastStarted=Date.now();let cursor=0,loaded=0,total=null,partial=false;const found=new Set();setStatus({state:'loading',loaded:0,total:null});
  try{do{
   await waitForForeground();if(!current())throw fail();const observedPriority=priorityRevision;request=new AbortController();const abort=()=>request?.abort();signal.addEventListener('abort',abort,{once:true});const timeout=setTimeout(abort,22000);let reader;
   try{
    const response=await fetcher(prefix+cursor,{credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'x-crays-web-account-context':accountId},signal:request.signal});
    if(!current())throw fail();if(response.status===401||response.status===403){clear();throw fail();}
    if(!response.ok||response.redirected||!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')||!response.body)throw fail();
    reader=response.body.getReader();let length=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});
    for(;;){const chunk=await reader.read();if(chunk.done)break;length+=chunk.value.length;if(length>2*1024*1024)throw fail();text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();
    if(!current())throw fail();if(observedPriority!==priorityRevision)continue;const value=JSON.parse(text);if(value.status!=='ready')throw fail();const page=validate(value.inbox,cursor,pubkey);
    if(total!==null&&total!==page.total)throw fail();total=page.total;
    for(const row of page.entries){if(found.has(row.conversationId))throw fail();found.add(row.conversationId);}
    partial||=page.entries.some(row=>row.state!=='ready');await receivePage(page.entries);if(!current())throw fail();loaded+=page.entries.length;
    setStatus({state:page.nextCursor===null?(partial?'partial':'ready'):'loading',loaded,total});cursor=page.nextCursor;
   }catch(error){if(current()&&observedPriority!==priorityRevision)continue;throw error;}finally{clearTimeout(timeout);signal.removeEventListener('abort',abort);await reader?.cancel().catch(()=>{});reader?.releaseLock();clearRequest();}
  }while(cursor!==null);
  }catch{if(current())setStatus({state:'unavailable',loaded,total});}
  finally{pending=null;schedule();}
 }
 function refresh(){if(!current())return Promise.resolve();if(pending)return pending;pending=cycle();return pending;}
 const resume=()=>{if(current()&&document?.visibilityState!=='hidden'&&Date.now()-lastStarted>30000)void refresh();};
 const offline=()=>{if(current())setStatus({state:'offline'});clearRequest();};
 function close(){if(closed)return;closed=true;clearTimeout(timer);clearRequest();releaseWaiters();signal.removeEventListener('abort',close);events.removeEventListener?.('focus',resume);events.removeEventListener?.('online',resume);events.removeEventListener?.('offline',offline);document?.removeEventListener?.('visibilitychange',resume);}
 signal.addEventListener('abort',close,{once:true});events.addEventListener?.('focus',resume);events.addEventListener?.('online',resume);events.addEventListener?.('offline',offline);document?.addEventListener?.('visibilitychange',resume);
 return Object.freeze({refresh,close,prioritizeConversation(){if(!current())return()=>{};foreground++;priorityRevision++;clearRequest();let released=false;return()=>{if(released)return;released=true;foreground--;if(!foreground)releaseWaiters();};}});
}
