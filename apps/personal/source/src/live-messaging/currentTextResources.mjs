import {createMediaConversationClient} from './mediaConversationClient.mjs';
import {deserializeApplicationData} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/index.js';
import {createChatRumor,createApplicationMessageIntent} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/client/index.js';
import {openPersistedConversationSession} from './conversationSession.mjs';
import {createMembershipJournal} from './membershipJournal.mjs';
import {openBrowserAttemptOutbox} from './browserAttemptOutbox.mjs';
import {openPagedConversationClient} from './pagedConversationClient.mjs';
import {openConversationLocalView} from './conversationLocalView.mjs';
import {openSourceCheckedConversation} from './sourceCheckedConversation.mjs';
import {resolveSdkHistoryReply} from './resolveSdkHistoryReply.mjs';
import {replyToFromTags} from './conversationReply.mjs';

/** The real text/receipt/history resource consumed by the existing desktop
 * workspace. Account and exact canonical conversation admission are supplied
 * by currentAccountMessaging. No mock messages, substitute identity or relay.
 */
export async function openCurrentTextResources({binding,group,client,stores,signal,isCurrent,recoverHistory,origin,connect=true,openMedia,locks=globalThis.navigator?.locks,crypto=globalThis.crypto}) {
 if(!binding||!['person','spot','circle'].includes(binding.kind)||group?.idStr!==binding.groupId||!group.history?.queryPage||!stores?.conversationStore||typeof isCurrent!=='function'||typeof recoverHistory!=='function'||!['welcome','creation'].includes(origin)||!signal?.addEventListener||!locks?.request||!crypto?.subtle)throw Error('Original current text resources required');
 if(openMedia!==undefined&&typeof openMedia!=='function')throw Error('Admitted media resource factory required');
 let closed=false,session,raw,media,merged,paged,local,checked,subscription,unsubscribe,closing;
 const listeners=new Set();let snapshot;
 const current=()=>{try{return !closed&&!signal.aborted&&isCurrent()===true&&group.status==='active'&&!group.closedSignal.aborted&&group.snapshot.members.includes(binding.pubkey);}catch{return false;}};
 const check=()=>{if(!current())throw Error('Conversation membership unavailable');};
 const journal=createMembershipJournal({journal:stores.conversationStore,groupId:binding.groupId,membershipId:binding.membershipId,origin,isCurrent:current});
 const exclusive=async(scope,operation,abort)=>{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(scope));return locks.request('crays.local-view:'+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join(''),{signal:abort},operation);};
 function close(){
  if(closed)return closing;closed=true;signal.removeEventListener('abort',close);unsubscribe?.();subscription?.unsubscribe();
  checked?.close();local?.close();paged?.close();merged?.close();media?.close();raw?.close();session?.close();journal.close();listeners.clear();
  closing=Promise.allSettled([session?.flush(),media?.flush(),local?.flushLocalView()]).then(()=>{});return closing;
 }
 const update=()=>{if(closed)return;const value=session.getSnapshot(),available=current()&&value.available;snapshot=Object.freeze({state:available?'ready':'unavailable',available,supportsReplies:value.supportsReplies===true,messages:available?value.messages:[],sending:available&&value.messages.some(row=>row.status==='sending'),problem:value.persistenceWarning?'Some messages could not be saved. Keep this conversation open and try again.':null,hasEarlierMessages:value.hasEarlierMessages});for(const fn of listeners)fn();};
 signal.addEventListener('abort',close,{once:true});
 try{
  check();await recoverHistory();check();
  session=await openPersistedConversationSession({binding,journal,authorize:current,client,group,decode:deserializeApplicationData,supportsReplies:true,
   resolveHistoryReply:(id,proof)=>resolveSdkHistoryReply({id,binding,history:group.history,sourceFor:id=>group.session.mediaSourceForRumor(id),isCurrent:current,ownTextConfirmed:proof?.ownTextConfirmed===true}),
   makeIntent:options=>{const rumor=createChatRumor({...options,tags:[['crays-request',crypto.randomUUID()],...(options.replyTo?[['e',options.replyTo]]:[])]});return {messageId:rumor.id,createdAt:rumor.created_at,replyTo:options.replyTo??null,intent:createApplicationMessageIntent(rumor)};}});check();
  const outbox=await openBrowserAttemptOutbox({accountKey:JSON.stringify([binding.accountId,binding.pubkey,binding.groupId,binding.membershipId]),conversationId:binding.conversationId,crypto,exclusive:(scope,operation)=>exclusive('outbox:'+scope,operation,signal),storage:{getItem:key=>journal.getItem(key),setItem:(key,value)=>journal.setItem(key,value),removeItem:key=>journal.setItem(key,null)}});check();
  update();unsubscribe=session.subscribe(update);
  raw={getSnapshot:()=>snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},async refresh(){check();await recoverHistory();check();await outbox.reconcile(session.getSnapshot().messages);check();update();},
   async prepareAttempt(...args){check();const result=await outbox.prepare(...args);check();return result;},
   async acknowledgeAttempt(id){check();const value=await outbox.acknowledge(id);check();return value;},
   async send({text,replyTo=null,requestId}){
    check();const prepared=requestId?{requestId}:await outbox.prepare(text,replyTo);check();
    const claim=await outbox.claim(prepared.requestId,text,replyTo);check();
    if(!claim.canPublish){await outbox.reconcile(session.getSnapshot().messages);check();const reconciled=await outbox.claim(prepared.requestId,text,replyTo);check();if(reconciled.result)return reconciled.result;throw Error('Original attempt requires reconciliation');}
    const result=await session.send({text,replyTo,requestId:prepared.requestId});check();await outbox.confirm(prepared.requestId,result);check();update();return result;
   },close(){listeners.clear();}};
  if(openMedia){media=await openMedia({binding,group,client,stores,journal,signal,isCurrent:current});check();if(!media||['getSnapshot','subscribe','adoptHistory','send','load','flush','close'].some(key=>typeof media[key]!=='function'))throw Error('Actual admitted media resources required');merged=createMediaConversationClient({text:raw,media});}
  paged=await openPagedConversationClient({client:merged||raw,isCurrent:current,signal,queryPage:async options=>{const page=await group.history.queryPage({filter:{kinds:[9]},...options});check();if(media)await media.adoptHistory(page.messages);check();return page;},decodeRow:rumor=>({id:rumor.id,text:rumor.content,author:rumor.pubkey,status:rumor.pubkey===binding.pubkey?'unconfirmed':'received',createdAt:rumor.created_at,...(replyToFromTags(rumor.tags)?{replyTo:replyToFromTags(rumor.tags)}:{})})});check();
  local=await openConversationLocalView({binding,client:paged,journal,authorize:current,signal,exclusive});check();
  checked=await openSourceCheckedConversation({client:local,history:group.history,sourceFor:id=>group.session.mediaSourceForRumor(id),isCurrent:current,signal});check();
  if(connect){subscription=await client.groups.connect(group.id,{signal});check();}
  return Object.freeze({client:checked,...(media?{media}:{}),close});
 }catch(error){subscription?.unsubscribe();checked?.close();local?.close();paged?.close();merged?.close();media?.close();raw?.close();session?.close();journal.close();await close();throw error;}
}
