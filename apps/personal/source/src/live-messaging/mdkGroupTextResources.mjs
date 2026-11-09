import {openMdkMediaSession} from './mdkMediaSession.mjs';
import {createMediaConversationClient} from './mediaConversationClient.mjs';
import {openMdkGroupDeparture} from './mdkGroupDeparture.mjs';
import {openMdkGroupInvitations} from './mdkGroupInvitations.mjs';
import {openMdkGroupManagement} from './mdkGroupManagement.mjs';
import {originalMdkFormat,validBoundGroupId} from './groupStorageFormat.mjs';
import {openMdkDevicePublisher} from './mdkDevicePublisher.mjs';
import {openMdkConversationCommands} from './mdkConversationCommands.mjs';
import {openMdkTimelineConversation} from './mdkTimelineConversation.mjs';
import {openConversationLocalView} from './conversationLocalView.mjs';
import {openConversationDraft} from './conversationDraft.mjs';
const fields=['kind','accountId','conversationId','groupId','membershipId','pubkey','storageFormat'];
const failure=()=>Error('The current private group is unavailable');
/** Production resource composition for the EXISTING desktop workspace. The
 * caller supplies an independently admitted Core grant and the same account's
 * normal original runtime/encrypted journal. This does not register a group,
 * generate keys, grant a relationship, or fall back to a legacy engine.
 * Group management uses the same original runtime and encrypted journal.
 * Invitations and self-departure share this lifetime. Media uses the original canonical-reference port only when an explicit
 * deployment media configuration is supplied; no legacy media fallback.
 */
export async function openMdkGroupTextResources({binding:input,runtime,accountStore,getAdmission,authorize,signal,pageSize=50,onGroupConfirmed=async()=>{},invitationCandidates,resolveInvitationPackage,prepareInvitationRetry,onGroupLeft=async()=>{},mediaConfiguration}){
 const binding=Object.freeze({...input});
 if(binding.storageFormat!==originalMdkFormat||!validBoundGroupId(binding)||runtime?.storageFormat!==originalMdkFormat||runtime.accountPubkey!==binding.pubkey||typeof accountStore?.openGroupJournal!=='function'||typeof getAdmission!=='function'||typeof authorize!=='function'||!signal?.addEventListener)throw failure();
 let closed=false,journal,publisher,commands,timeline,local,draft,management,invitations,departure,media,combined,unsubscribe,closing;
 const lifetime=new AbortController();
 const current=(action,target)=>{try{const grant=getAdmission();return !closed&&!signal.aborted&&!lifetime.signal.aborted&&fields.every(key=>grant?.[key]===binding[key])&&authorize(binding,action,target)===true;}catch{return false;}};
 const check=()=>{if(!current('read'))throw failure();};
 const close=()=>{
  if(closing)return closing;closed=true;lifetime.abort();signal.removeEventListener('abort',close);unsubscribe?.();
  combined?.close();media?.close();departure?.close();invitations?.close();management?.close();draft?.close();local?.close();timeline?.close();commands?.close();publisher?.close();
  closing=Promise.allSettled([media?.flush(),draft?.flush(),local?.flushLocalView()]).then(()=>{journal?.close();});return closing;
 };
 signal.addEventListener('abort',close,{once:true});
 try{
  check();const summary=await runtime.summary(binding.groupId);check();
  const own=summary?.members?.some(member=>Array.isArray(member.id)&&member.id.length===32&&member.id.every(v=>Number.isInteger(v)&&v>=0&&v<=255)&&member.id.map(v=>v.toString(16).padStart(2,'0')).join('')===binding.pubkey);
  if(summary?.groupId===binding.groupId&&summary.terminal===true&&summary.removed===true&&summary.unrecoverable===false){
   // A prior SelfRemove may already be canonical MLS truth while its separate
   // directory callback was interrupted. Recover only the retained departure;
   // do not reopen messages or manufacture active membership after removal.
   journal=await accountStore.openGroupJournal({binding,getAdmission,signal:lifetime.signal});check();
   departure=await openMdkGroupDeparture({binding,runtime,journal,getAdmission,authorize:(_,action)=>current(action),signal:lifetime.signal,onLeft:onGroupLeft});check();
   await departure.settled();throw failure();
  }
  if(summary?.groupId!==binding.groupId||summary.removed!==false||summary.unrecoverable!==false||!own)throw failure();
  journal=await accountStore.openGroupJournal({binding,getAdmission,signal:lifetime.signal});check();
  publisher=await openMdkDevicePublisher({binding,runtime,journal,getAdmission,authorize:(_,action)=>current(action),signal:lifetime.signal});check();
  commands=await openMdkConversationCommands({binding,runtime,publisher,getAdmission,authorize:(_,action)=>current(action),signal:lifetime.signal});check();
  timeline=await openMdkTimelineConversation({binding,runtime,commands,authorize:(_,action)=>current(action),signal:lifetime.signal,pageSize});check();
  const exclusive=(key,work)=>journal.exclusive(key,work);
  local=await openConversationLocalView({binding,client:timeline,journal,exclusive,authorize:()=>current('read'),signal:lifetime.signal});check();
  management=await openMdkGroupManagement({binding,runtime,journal,getAdmission,authorize:(_,action)=>current(action),signal:lifetime.signal,onConfirmed:onGroupConfirmed});check();
  if(invitationCandidates!==undefined||resolveInvitationPackage!==undefined){
   invitations=await openMdkGroupInvitations({binding,runtime,journal,getAdmission,authorize:(_,action,target)=>current(action,target),signal:lifetime.signal,candidates:invitationCandidates,resolvePackage:resolveInvitationPackage,prepareRetry:prepareInvitationRetry,onConfirmed:onGroupConfirmed});check();
  }
  departure=await openMdkGroupDeparture({binding,runtime,journal,getAdmission,authorize:(_,action)=>current(action),signal:lifetime.signal,onLeft:onGroupLeft});check();
  draft=await openConversationDraft({binding,journal,exclusive,authorize:()=>current('read'),signal:lifetime.signal});check();
  if(mediaConfiguration){media=await openMdkMediaSession({binding,runtime,journal,getAdmission,authorize:(_,action)=>current(action),signal:lifetime.signal,transport:mediaConfiguration.transport,baseUrl:mediaConfiguration.baseUrl});check();combined=createMediaConversationClient({text:local,media});}
  unsubscribe=runtime.subscribeTimeline(change=>{if(change?.kind==='closed'||!current('read'))void close();else if(change?.kind==='withdrawal')void runtime.summary(binding.groupId).then(async state=>{if(state.terminal||state.removed||state.unrecoverable){await departure?.settled();void close();}}).catch(()=>close());});
  const client=combined?Object.freeze({...local,getSnapshot:combined.getSnapshot,subscribe:combined.subscribe,close:combined.close}):local;
  return Object.freeze({client,...(media?{media}:{}),composer:draft,group:management,departure,...(invitations?{invitations}:{}),close});
 }catch(error){await close();throw error;}
}
