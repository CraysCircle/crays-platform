import {parseConversationContactInfo} from './conversationContactInfo.mjs';
import {validMessageText} from './messageLimits.mjs';
import {validReplyId} from './conversationReply.mjs';
/** Browser reader port: original same-origin session grants access, never a browser account parameter.
 * Human conversations only. Chuck keeps its existing independent transport.
 */
export function createHumanConversationClient({conversationId,fetcher=globalThis.fetch,intervalMs=3000,outbox,accountScope,newRequestId=()=>globalThis.crypto.randomUUID()}){
 if(typeof conversationId!=='string'||!/^[a-zA-Z0-9:._-]{1,200}$/.test(conversationId)||['chuck','person:chuck'].includes(conversationId))throw Error('Human conversation required');
 if(accountScope!==undefined&&(typeof accountScope.accountId!=='string'||!/^[^\x00-\x20\x7f]{1,200}$/.test(accountScope.accountId)||typeof accountScope.isCurrent!=='function'||!accountScope.signal?.addEventListener))throw Error('Current canonical account scope required');
 if(accountScope)accountScope=Object.freeze({...accountScope});
 const endpoint='/api/crays/personal/messaging',listeners=new Set(),requests=new Map(),controllers=new Set();
 let closed=false,timer=null,refreshing=null,revision=0,admission=null,lastLoadedAt=0,historyCursor=null,historyExpanded=false,loadingHistory=null,historyGeneration=0;
 const historyRows=new Map(),acknowledgedEchoes=new Map();
 let current=Object.freeze({state:'loading',available:false,messages:[],sending:false,problem:null,hasEarlierMessages:false});
 function gone(){if(!closed&&accountScope){let valid=false;try{valid=!accountScope.signal.aborted&&accountScope.isCurrent(accountScope.accountId)===true;}catch{}if(!valid)close();}return closed;}
 function clearHistory(){historyGeneration++;historyCursor=null;historyExpanded=false;historyRows.clear();}
 function close(){if(closed)return;closed=true;revision++;clearHistory();acknowledgedEchoes.clear();clearTimeout(timer);accountScope?.signal.removeEventListener('abort',close);for(const c of controllers)c.abort();controllers.clear();requests.clear();current=Object.freeze({state:'closed',available:false,messages:[],sending:false,problem:null});for(const listener of listeners)listener();listeners.clear();}
 accountScope?.signal.addEventListener('abort',close,{once:true});
 if(accountScope?.signal.aborted)close();
 function update(patch){if(gone())return;current=Object.freeze({...current,...patch});for(const listener of listeners)listener();}
 function later(){if(!gone()&&listeners.size&&!timer)timer=setTimeout(()=>{timer=null;void refresh();},Math.max(1000,intervalMs));}
 function unavailable(status){admission=null;revision++;clearHistory();acknowledgedEchoes.clear();update({state:'unavailable',available:false,messages:[],sending:false,loadingEarlier:false,contactInfo:null,problem:status===401?'sign_in_required':'conversation_unavailable'});}
 async function request(url,options={}){
  if(gone())throw Error('Current account unavailable');
  const controller=new AbortController();controllers.add(controller);const timeout=setTimeout(()=>controller.abort(),15000);let abort;
  const cancelled=new Promise((_,reject)=>{abort=()=>reject(Error('Request cancelled'));controller.signal.addEventListener('abort',abort,{once:true});});
  try{return await Promise.race([(async()=>{const response=await fetcher(url,{credentials:'same-origin',cache:'no-store',...options,redirect:'error',headers:{...options.headers,...(accountScope?{'x-crays-web-account-context':accountScope.accountId}:{})},signal:controller.signal});let body;if(response.redirected)throw Error('Messaging redirect denied');
   if(response.body?.getReader){const reader=response.body.getReader(),chunks=[];let bytes=0;try{while(true){const item=await reader.read();if(item.done)break;bytes+=item.value.byteLength;if(bytes>16*1024*1024){await reader.cancel();throw Error('Response too large');}chunks.push(item.value);}const joined=new Uint8Array(bytes);let at=0;for(const chunk of chunks){joined.set(chunk,at);at+=chunk.byteLength;}try{body=JSON.parse(new TextDecoder().decode(joined));}catch{body=null;}}finally{reader.releaseLock();}}
   else body=await response.json().catch(()=>null);
   return{ok:response.ok,status:response.status,body};})(),cancelled]);}finally{clearTimeout(timeout);controller.signal.removeEventListener('abort',abort);controllers.delete(controller);}
 }
 function validSnapshot(value){return value?.available===true&&Array.isArray(value.messages)&&value.messages.length<=10000&&value.messages.every(m=>typeof m.id==='string'&&validMessageText(m.text)&&typeof m.author==='string'&&(m.replyTo==null||validReplyId(m.replyTo))&&['received','sending','sent-to-relay','unconfirmed'].includes(m.status));}
 const scope=value=>JSON.stringify(['accountId','conversationId','kind','groupId','membershipId','pubkey'].map(k=>value?.[k]));
 function mergeHistory(messages){const merged=new Map([...historyRows,...messages.map(m=>[m.id,m])]);if(merged.size>10000)throw Error('History window full');return [...merged.values()].sort((a,b)=>(a.createdAt??0)-(b.createdAt??0)||a.id.localeCompare(b.id));}
 async function refresh(){
  if(gone())return;if(refreshing)return refreshing;
  const start=revision;
  refreshing=(async()=>{try{
   const response=await request(endpoint+'/conversation?conversationId='+encodeURIComponent(conversationId));
   if(gone())return;
   if(response.status===401||response.status===403){unavailable(response.status);return;}
   if(!response.ok)throw Error('read_unavailable');const value=response.body;
   if(gone())return;
   if(!validSnapshot(value.conversation))throw Error('invalid_snapshot');
   const nextAdmission=value.conversation.binding?Object.freeze({...value.conversation.binding}):null;
   if(admission&&scope(admission)!==scope(nextAdmission)){clearHistory();acknowledgedEchoes.clear();update({contactInfo:null,available:false,messages:[]});}admission=nextAdmission;
   for(const [requestId,request] of requests){const row=value.conversation.messages.find(m=>m.requestId===requestId&&m.text===request.text&&(m.replyTo??null)===(request.replyTo??null)&&['sent-to-relay','unconfirmed'].includes(m.status));if(row){request.promise=Promise.resolve({status:row.status,eventIds:row.eventIds||[],messageId:row.id});}}
   if(outbox)await outbox.reconcile(value.conversation.messages);if(gone())return;
   for(const [requestId,echo] of acknowledgedEchoes)if(value.conversation.messages.some(row=>row.id===echo.id&&row.text===echo.text&&(row.replyTo??null)===(echo.replyTo??null)))acknowledgedEchoes.delete(requestId);
   const contactInfo=parseConversationContactInfo(value.conversation.contactInfo,nextAdmission);
   if(start===revision){if(!historyExpanded)historyCursor=value.conversation.historyCursor??null;lastLoadedAt=Date.now();update({contactInfo,supportsAttachments:value.conversation.supportsAttachments===true,supportsReplies:value.conversation.supportsReplies===true,hasEarlierMessages:historyExpanded?historyCursor!==null:value.conversation.hasEarlierMessages===true,historyExpanded,state:'ready',available:true,messages:[...mergeHistory([...acknowledgedEchoes.values(),...value.conversation.messages]),...current.messages.filter(m=>m.id.startsWith('pending:')&&!value.conversation.messages.some(row=>row.requestId===m.requestId&&row.text===m.text&&(row.replyTo??null)===(m.replyTo??null)))].map(m=>Object.freeze({...m})),problem:null});}
  }catch{if(!gone()&&start===revision)update({state:current.available?'offline':'unavailable',problem:'connection_unavailable'});}
  finally{refreshing=null;later();}})();return refreshing;
 }
 async function loadOlder(){
  if(gone()||!current.available)return;if(loadingHistory)return loadingHistory;if(!historyCursor){if(current.hasEarlierMessages)update({problem:'Earlier messages are not available yet. Your current conversation has been kept.'});return;}
  const generation=historyGeneration,cursor=historyCursor,originalScope=scope(admission);update({loadingEarlier:true,problem:null});
  loadingHistory=(async()=>{try{
   const response=await request(endpoint+'/history',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({conversationId,cursor})});
   if(gone()||generation!==historyGeneration)return;
   if(response.status===401||response.status===403){unavailable(response.status);return;}
   if(!response.ok)throw Error(response.body?.status==='history_boundary_unavailable'?'boundary':'history');
   const value=response.body?.conversation;if(!validSnapshot(value)||scope(value.binding)!==originalScope||scope(admission)!==originalScope)throw Error('History binding changed');
   // Capture confirmed visible originals before merging the new page. A polling
   // refresh may have added messages while the older request was in flight.
   const retained=new Map([...historyRows,...current.messages.filter(m=>validReplyId(m.id)&&['received','sent-to-relay'].includes(m.status)).map(m=>[m.id,m]),...value.messages.map(m=>[m.id,m])]);
   if(retained.size>10000)throw Error('window');
   const pending=current.messages.filter(m=>m.id.startsWith('pending:')&&![...retained.values()].some(row=>row.requestId===m.requestId&&row.text===m.text&&(row.replyTo??null)===(m.replyTo??null)));
   historyRows.clear();for(const row of retained)historyRows.set(...row);historyCursor=value.historyCursor??null;historyExpanded=true;
   update({state:'ready',available:true,messages:[...mergeHistory([]),...pending].map(m=>Object.freeze({...m})),historyExpanded:true,hasEarlierMessages:historyCursor!==null,problem:null});
  }catch(error){if(!gone()&&generation===historyGeneration)update({problem:error.message==='boundary'?'More messages share this timestamp than the relay can return. Your loaded messages have been kept.':error.message==='window'?'This conversation window is full. Return to the latest messages to continue.':'Earlier messages could not be loaded. Your conversation has been kept. Try again.'});}
  finally{loadingHistory=null;if(!gone()&&generation===historyGeneration)update({loadingEarlier:false});}})();return loadingHistory;
 }
 return {
  getAdmission:()=>gone()?null:admission,
  getSnapshot:()=>{gone();return current;},
  subscribe(fn){if(gone())return()=>{};listeners.add(fn);if(!current.available||Date.now()-lastLoadedAt>=intervalMs)void refresh();else later();return()=>{listeners.delete(fn);if(!listeners.size){clearTimeout(timer);timer=null;}};},
  refresh,
  loadOlder,
  async showLatest(){if(gone())return;clearHistory();revision++;update({loadingEarlier:false});if(refreshing)await refreshing;await refresh();},
  async prepareAttempt(text,replyTo=null){if(gone())throw Error('Conversation closed');const value=outbox?await outbox.prepare(text,replyTo):{requestId:newRequestId()};if(gone())throw Error('Conversation closed');return value;},
  async acknowledgeAttempt(requestId){if(gone())throw Error('Conversation closed');const value=await outbox?.acknowledge(requestId);if(gone())throw Error('Conversation closed');return value;},
  async send({text,requestId=newRequestId(),replyTo=null}){
   if(gone()||!current.available)throw Error('Conversation unavailable');
   if(!validMessageText(text)||!text.trim()||typeof requestId!=='string'||!requestId||requestId.length>200)throw Error('Invalid message');
   const prior=requests.get(requestId);if(prior){if(prior.text!==text||(prior.replyTo??null)!==replyTo)throw Error('Message request changed');return prior.promise;}
   if(replyTo!==null&&(!current.supportsReplies||!validReplyId(replyTo)||!current.messages.some(row=>row.id===replyTo&&['received','sent-to-relay'].includes(row.status))))throw Error('Current loaded reply original required');
   if(requests.size>=1000)throw Error('Send window exceeded');
   const pendingId='pending:'+requestId;revision++;update({sending:true,messages:[...current.messages,{id:pendingId,requestId,text,createdAt:Math.floor(Date.now()/1000),...(replyTo?{replyTo}:{}),author:'self',status:'sending'}]});
   const promise=(async()=>{try{
    if(outbox){const claim=await outbox.claim(requestId,text,replyTo);if(!claim.canPublish){await refresh();const known=current.messages.find(m=>m.requestId===requestId&&m.text===text&&(m.replyTo??null)===replyTo&&m.status==='sent-to-relay');if(gone())throw Error('Conversation closed');if(known){update({sending:false});return{status:'sent-to-relay',requestId,messageId:known.id};}throw Error('Original attempt requires reconciliation');}}
    if(gone())throw Error('Conversation closed');
    const replyEventIds=replyTo?current.messages.find(m=>m.id===replyTo)?.eventIds?.slice(-8):undefined;
    const response=await request(endpoint+'/send',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({conversationId,requestId,text,...(replyTo?{replyTo,...(replyEventIds?.length?{replyEventIds}:{})}:{})})});
    if(gone())throw Error('Conversation closed');if(response.status===401||response.status===403){unavailable(response.status);throw Error('Conversation unavailable');}
    const body=response.body;if(gone())throw Error('Conversation closed');
    if(!response.ok||!['sent-to-relay','unconfirmed'].includes(body?.result?.status))throw Error('Send unconfirmed');
    if(outbox)await outbox.confirm(requestId,body.result);if(gone())throw Error('Conversation closed');
    const originalId=validReplyId(body.result.messageId)?body.result.messageId:pendingId;
    const echo=current.messages.find(m=>m.id===pendingId);
    const confirmed=echo?Object.freeze({...echo,id:originalId,status:body.result.status,...(Array.isArray(body.result.eventIds)&&body.result.eventIds.length<=8&&body.result.eventIds.every(validReplyId)?{eventIds:[...body.result.eventIds]}:{})}):null;
    if(confirmed&&originalId!==pendingId)acknowledgedEchoes.set(requestId,confirmed);
    revision++;update({sending:false,messages:current.messages.map(m=>m.id===pendingId?confirmed:m).filter(Boolean),problem:body.result.status==='unconfirmed'?'send_unconfirmed':null});
    // A durable relay receipt completes this send, not the next history query.
    // Keep the acknowledged row until history reconciles its exact request ID.
    void refresh();if(gone())throw Error('Conversation closed');return body.result;
   }catch(error){revision++;update({sending:false,messages:current.messages.map(m=>m.id===pendingId?{...m,status:'unconfirmed'}:m),problem:'send_unconfirmed'});throw error;}})();
   requests.set(requestId,{text,replyTo,promise});return promise;
  },
  close,
 };
}
