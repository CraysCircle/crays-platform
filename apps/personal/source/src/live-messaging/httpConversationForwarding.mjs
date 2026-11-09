import {matchingHumanConversationAddress} from './humanConversationAddress.mjs';
import {createParentDraftForwardingPort} from './parentDraftForwarding.mjs';
import {createHumanConversationClient} from './humanConversationClient.mjs';
const fields=['kind','accountId','conversationId','groupId','pubkey','membershipId'];
const same=(a,b)=>a&&b&&fields.every(k=>a[k]===b[k]);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const fail=()=>Error('Permitted conversations could not be opened. Try again.');
/** Original account's independently admitted metadata and encrypted composers.
 * Selecting a destination rechecks its actual HTTP admission. Listing does not
 * fetch/decrypt messages, open every draft, send, or copy attachment keys. */
export function createHttpConversationForwarding({identity,signal,isCurrent,fetcher,drafts,currentSource,attachmentState,open}){
 let closed=false,pending=null,snapshot=Object.freeze({available:false,targets:Object.freeze([])});
 const listeners=new Set(),lifetime=new AbortController();
 const current=()=>!closed&&!signal.aborted&&!lifetime.signal.aborted&&isCurrent()===true;
 const catalog={getSnapshot:()=>current()?snapshot:Object.freeze({available:false,targets:[]}),subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
 const notify=()=>{for(const fn of listeners)fn();};
 const permitted=b=>current()&&b.accountId===identity.accountId&&b.pubkey===identity.pubkey&&snapshot.targets.some(row=>same(b,row));
 const adapter=createParentDraftForwardingPort({accountId:identity.accountId,signal:lifetime.signal,catalog,currentSource,
  authorize:(binding,action)=>action==='source'?current()&&same(binding,currentSource()):permitted(binding),
  getComposer:binding=>drafts.getForBinding(binding),attachmentState,open,
  async prepareComposer(binding,operationSignal){
   if(!permitted(binding)||operationSignal.aborted)throw fail();
   const selectedSignal=AbortSignal.any([signal,lifetime.signal,operationSignal]);
   const selectedCurrent=()=>current()&&!selectedSignal.aborted&&permitted(binding);
   const client=createHumanConversationClient({conversationId:binding.conversationId,fetcher,accountScope:{accountId:identity.accountId,isCurrent:selectedCurrent,signal:selectedSignal},intervalMs:5000});
   try{await client.refresh();if(!selectedCurrent()||!client.getSnapshot().available||client.getSnapshot().canSend===false||!same(client.getAdmission(),binding))throw fail();await drafts.open(binding);if(!selectedCurrent())throw fail();}finally{client.close();}
  },
 });
 const close=()=>{if(closed)return;closed=true;lifetime.abort();signal.removeEventListener('abort',close);adapter.close();snapshot=Object.freeze({available:false,targets:Object.freeze([])});notify();listeners.clear();};
 signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();
 async function load(){
  const request=new AbortController(),abort=()=>request.abort();lifetime.signal.addEventListener('abort',abort,{once:true});const timeout=setTimeout(abort,15000);let reader;
  try{
   const response=await fetcher('/api/crays/personal/messaging/destinations',{credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'x-crays-web-account-context':identity.accountId},signal:request.signal});
   if(!current()||!response.ok||response.redirected||!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')||!response.body)throw fail();
   reader=response.body.getReader();let length=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});for(;;){const chunk=await reader.read();if(chunk.done)break;length+=chunk.value.length;if(length>2*1024*1024)throw fail();text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();
   const value=JSON.parse(text),rows=value.destinations?.targets,ids=new Set();if(value.status!=='ready'||!Array.isArray(rows)||rows.length>1000)throw fail();
   const targets=rows.map(row=>{if(!matchingHumanConversationAddress(row)||row.accountId!==identity.accountId||row.pubkey!==identity.pubkey||typeof row.conversationId!=='string'||ids.has(row.conversationId)||!hex(row.groupId)||!hex(row.membershipId)||typeof row.title!=='string'||!row.title.trim()||row.title.length>200||typeof row.version!=='string'||!row.version||row.version.length>1000)throw fail();ids.add(row.conversationId);return Object.freeze(Object.fromEntries([...fields,'title','version'].map(k=>[k,row[k]])));});
   if(!current())throw fail();snapshot=Object.freeze({available:true,targets:Object.freeze(targets)});notify();
  }catch(error){snapshot=Object.freeze({available:false,targets:Object.freeze([])});notify();throw error;}finally{clearTimeout(timeout);lifetime.signal.removeEventListener('abort',abort);await reader?.cancel().catch(()=>{});reader?.releaseLock();pending=null;}
 }
 function refresh(){if(!current())return Promise.reject(fail());if(!pending)pending=load();else notify();return pending;}
 return Object.freeze({port:Object.freeze({...adapter.port,refresh}),refresh,sourceChanged:notify,close});
}
