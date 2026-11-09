import {createCurrentHttpSpotConversations} from './currentHttpSpotConversations.mjs';
import {createAccountDataKeyCache} from './accountDataKeyCache.mjs';
import {openAccountBrowserStores} from './accountBrowserStores.mjs';
import {humanConversationKind,validHumanConversationId,matchingHumanConversationAddress} from './humanConversationAddress.mjs';
import {leaseRetainedConversation} from './retainedConversationWorkspace.mjs';
import {createHttpConversationForwarding} from './httpConversationForwarding.mjs';
import {createHttpInbox} from './httpInbox.mjs';
import {openForegroundGroupConversation} from './foregroundGroupConversation.mjs';
import {createHttpPrivateMedia} from './httpPrivateMedia.mjs';
import {createHumanConversationClient} from './humanConversationClient.mjs';
import {createHumanConversationWorkspace} from './humanConversationWorkspace.mjs';
import {createSessionInbox} from './sessionInbox.mjs';
import {createHttpConversationDrafts} from './httpConversationDrafts.mjs';
const fail=()=>Error('Private messaging is unavailable');
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
/** Discover the canonical messaging account through the same original SDK
 * session. Platform and Personal Core IDs need not be identical. No ID is
 * guessed from a name/email or supplied as a replacement browser identity. */
export async function openCurrentHttpMessaging({platformAccountId,isCurrent,signal,fetcher=globalThis.fetch,createDrafts=createHttpConversationDrafts,openConversationRoute=id=>{if(typeof window==='undefined')throw fail();window.location.hash='/conversations/'+encodeURIComponent(id);}}){
 if(!platformAccountId||typeof isCurrent!=='function'||!signal?.addEventListener||signal.aborted)throw fail();
 // Fetch public program code beside account discovery, not after the first
 // selected group. Importing creates no account, signer, store or relay. The
 // group factory remains behind the original verified account/current check.
 let groupModule;
 const loadGroupModule=()=>{if(!groupModule){const work=import('./currentOwnedGroups.mjs').catch(error=>{if(groupModule===work)groupModule=null;throw error;});groupModule=work;}return groupModule;};
 void loadGroupModule().catch(()=>{});
 const lifetime=new AbortController(),workspaces=new Set(),retained=new Map();let closed=false,identity,drafts,coldInbox,forwarding,selectedWorkspace,ownedGroups,openingGroups,dataKeys,spotConversations;
 const current=()=>!closed&&!signal.aborted&&!lifetime.signal.aborted&&isCurrent(platformAccountId)===true;
 const close=()=>{if(closed)return;closed=true;lifetime.abort();signal.removeEventListener('abort',close);for(const w of workspaces)w.close();workspaces.clear();retained.clear();ownedGroups?.close();spotConversations?.close();dataKeys?.close();forwarding?.close();drafts?.close();coldInbox?.close();};
 signal.addEventListener('abort',close,{once:true});
 try{
  const timeout=setTimeout(()=>lifetime.abort(),20000);let reader;
  try{
   const response=await fetcher('/api/crays/personal/messaging/identity',{method:'POST',headers:{'content-type':'application/json'},body:'{}',credentials:'same-origin',cache:'no-store',redirect:'error',signal:lifetime.signal});
   if(!current()||!response.ok||response.redirected||!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')||!response.body)throw fail();
   reader=response.body.getReader();let size=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>8192)throw fail();text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();
   const envelope=JSON.parse(text);if(Object.keys(envelope).join(',')!=='identity')throw fail();identity=envelope.identity;
   if(!identity||typeof identity.accountId!=='string'||!/^[^\x00-\x20\x7f]{1,200}$/.test(identity.accountId)||!hex(identity.pubkey)||!hex(identity.bindingFingerprint)||identity.publicBindingVerified!==true||identity.emailVerificationRequired!==false||!current())throw fail();Object.freeze(identity);
  }finally{clearTimeout(timeout);await reader?.cancel().catch(()=>{});reader?.releaseLock();}
  const inboxBindings=new Map(),preferenceVersions=new Map();
  const inbox=createSessionInbox({accountId:identity.accountId,pubkey:identity.pubkey,signal:lifetime.signal});
  dataKeys=createAccountDataKeyCache({binding:identity,signal:lifetime.signal,isCurrent:current});
  drafts=createDrafts({identity,signal:lifetime.signal,isCurrent:current,fetcher,openStores:options=>openAccountBrowserStores({...options,dataKeyCache:dataKeys})});
  forwarding=createHttpConversationForwarding({identity,signal:lifetime.signal,isCurrent:current,fetcher,drafts,
   currentSource:()=>{selectedWorkspace?.recheck();return selectedWorkspace&&!selectedWorkspace.signal.aborted&&selectedWorkspace.getSnapshot().client?.getSnapshot().available?selectedWorkspace.binding:null;},
   attachmentState:binding=>{if([...workspaces].some(w=>!w.signal.aborted&&w.binding.conversationId===binding.conversationId))throw Error('Close the destination conversation before forwarding.');return {hasAttachments:false,version:'no-mounted-destination-attachment'};},
   open:id=>{if(!current())throw fail();openConversationRoute(id);},
  });
  const pendingReads=new Map();
  async function flushRead(id){const record=pendingReads.get(id);if(!record||!current())return;if(record.work)return record.work;record.work=drafts.saveInboxMarkers(record.binding,record.ids).then(()=>{if(current()&&pendingReads.get(id)===record)pendingReads.delete(id);},()=>{}).finally(()=>{record.work=null;if(current())inbox.setStatus({readStateProblem:pendingReads.size>0});});return record.work;}
  coldInbox=createHttpInbox({accountId:identity.accountId,pubkey:identity.pubkey,signal:lifetime.signal,isCurrent:current,fetcher,receivePage:async entries=>{let readProblem=false;const decorated=[];for(const entry of entries){if(entry.state==='unavailable'){decorated.push(entry);continue;}let timerChanges,contextReady=false;try{const binding={kind:humanConversationKind(entry.conversationId),conversationId:entry.conversationId,groupId:entry.groupId,membershipId:entry.membershipId,accountId:identity.accountId,pubkey:identity.pubkey};inboxBindings.set(entry.conversationId,binding);if(drafts.readTimerChanges)timerChanges=await drafts.readTimerChanges(binding);const markers=await drafts.readInboxMarkers(binding);if(drafts.readLocalViewMarkers){const hidden=await drafts.readLocalViewMarkers(binding);if(!current())throw fail();inbox.setHidden(entry.conversationId,hidden);}if(drafts.readInboxPreference){const version=preferenceVersions.get(entry.conversationId)||0;const preference=await drafts.readInboxPreference(binding);if(!current())throw fail();if(version===(preferenceVersions.get(entry.conversationId)||0))inbox.setPreference(entry.conversationId,preference);}if(!current())throw fail();inbox.restoreRead(entry.conversationId,markers,entry.groupId+':'+entry.membershipId);contextReady=true;}catch{if(!current())throw fail();readProblem=true;}decorated.push(contextReady?{...entry,...(timerChanges?{timerChanges}:{})}:{...entry,state:'unavailable',latest:null,receivedIds:[],receivedTimes:[]});}inbox.setStatus({readStateProblem:readProblem||pendingReads.size>0});inbox.receivePage(decorated);},setStatus:inbox.setStatus,clear:inbox.clear});
  const lease=(record,selectionSignal)=>leaseRetainedConversation(record,{signal:selectionSignal,onSelect:value=>{selectedWorkspace=value;forwarding.sourceChanged();},onRelease:value=>{if(selectedWorkspace===value){selectedWorkspace=null;forwarding.sourceChanged();}}});
  const port={forwarding:forwarding.port,
   async openSpotDiscussion(options){if(!current())throw fail();if(!spotConversations)spotConversations=createCurrentHttpSpotConversations({identity,signal:lifetime.signal,isCurrent:current,fetcher,dataKeyCache:dataKeys});return spotConversations.open(options);},
   async openGroups(options){
    if(!current())throw fail();if(ownedGroups)return ownedGroups;if(openingGroups)return openingGroups;
    const work=(async()=>{const {createCurrentOwnedGroups}=await loadGroupModule();if(!current())throw fail();const groups=createCurrentOwnedGroups({...options,storage:{...options.storage,dataKeyCache:dataKeys},identity,isCurrent:current,signal:lifetime.signal,fetcher});if(!current()){groups.close();throw fail();}ownedGroups=groups;groups.start();return groups;})();openingGroups=work;try{return await work;}finally{if(openingGroups===work)openingGroups=null;}
   },
   async setArchived(conversationId,archived){if(!current())throw fail();const binding=inboxBindings.get(conversationId);if(!binding||!drafts.setInboxArchived)throw Error('Open this conversation before changing its archive setting.');const version=(preferenceVersions.get(conversationId)||0)+1;preferenceVersions.set(conversationId,version);const saved=await drafts.setInboxArchived(binding,archived);if(!current())throw fail();if(version===preferenceVersions.get(conversationId))inbox.setPreference(conversationId,saved);},accountId:identity.accountId,signal:lifetime.signal,inbox,refreshInbox:async()=>{await Promise.all([...pendingReads.keys()].map(flushRead));await coldInbox.refresh();},getComposer:workspace=>ownedGroups?.owns(workspace)?ownedGroups.getComposer(workspace):drafts.get(workspace),openPrivateNote:workspace=>drafts.openPrivateNote(workspace),
   async openConversation({accountId,conversationId,signal:selectionSignal}){
    if(!current()||accountId!==identity.accountId||!selectionSignal?.addEventListener||selectionSignal.aborted||!validHumanConversationId(conversationId))throw fail();
    if(ownedGroups&&humanConversationKind(conversationId)!=='person')return openForegroundGroupConversation({groups:ownedGroups,inbox:coldInbox,request:{accountId,conversationId,signal:selectionSignal}});
    const previous=retained.get(conversationId);if(previous){previous.workspace.recheck();const snapshot=previous.workspace.getSnapshot();if(!previous.workspace.signal.aborted&&snapshot.state==='ready'&&snapshot.client?.getSnapshot().available){retained.delete(conversationId);retained.set(conversationId,previous);return lease(previous,selectionSignal);}previous.workspace.close();retained.delete(conversationId);}
    // Release obsolete attachment downloads before the next selected chat's Core/read path.
    for(const record of retained.values())record.workspace.getSnapshot().media?.cancelReads?.();
    const releasePriority=coldInbox.prioritizeConversation();const selected=new AbortController();const abort=()=>selected.abort();selectionSignal.addEventListener('abort',abort,{once:true});lifetime.signal.addEventListener('abort',abort,{once:true});let client,workspace,media,inboxSubscription,sourceSubscription;
    const selectedCurrent=()=>current()&&!selected.signal.aborted;
    const release=()=>{selected.abort();inboxSubscription?.();sourceSubscription?.();media?.close();client?.close();selectionSignal.removeEventListener('abort',abort);lifetime.signal.removeEventListener('abort',abort);if(workspace){workspaces.delete(workspace);if(retained.get(conversationId)?.workspace===workspace)retained.delete(conversationId);}if(selectedWorkspace?.binding===workspace?.binding){selectedWorkspace=null;forwarding.sourceChanged();}};
    try{
     client=createHumanConversationClient({conversationId,fetcher,intervalMs:5000,accountScope:{accountId,isCurrent:selectedCurrent,signal:selected.signal}});await client.refresh();if(!selectedCurrent()||!client.getSnapshot().available)throw fail();
     const admission=client.getAdmission();if(!admission||admission.accountId!==accountId||admission.pubkey!==identity.pubkey||admission.conversationId!==conversationId||!matchingHumanConversationAddress(admission)||!hex(admission.groupId)||!hex(admission.membershipId))throw fail();
     const binding=Object.freeze({...admission});inboxBindings.set(conversationId,binding);
     // These are independent reads of the same encrypted account store. Open
     // them together only AFTER actual current conversation admission. Restore
     // no UI state until all have succeeded and the selection is still current.
     const preferenceVersion=preferenceVersions.get(conversationId)||0;
     const [,preference,readMarkers]=await Promise.all([drafts.open(binding),drafts.readInboxPreference?.(binding),drafts.readInboxMarkers?.(binding)]);
     if(!selectedCurrent())throw fail();
     if(preference&&preferenceVersion===(preferenceVersions.get(conversationId)||0))inbox.setPreference(conversationId,preference);
     if(readMarkers)inbox.restoreRead(conversationId,readMarkers,binding.groupId+':'+binding.membershipId);
     client.markRead=()=>{if(selectedCurrent()&&client.getSnapshot().available&&JSON.stringify(client.getAdmission())===JSON.stringify(admission)){const ids=inbox.markRead(conversationId,client.getSnapshot().messages);if(ids&&drafts.saveInboxMarkers){pendingReads.set(conversationId,{binding,ids,work:null});void flushRead(conversationId);}}};
     if(drafts.openLocalView){const originalClient=client;client=await drafts.openLocalView({binding,client:originalClient,signal:selected.signal,authorize:()=>selectedCurrent()&&JSON.stringify(originalClient.getAdmission())===JSON.stringify(admission)});if(!selectedCurrent())throw fail();}
     if(drafts.openTimedView){const originalClient=client;client=await drafts.openTimedView({binding,client:originalClient,signal:selected.signal,authorize:()=>selectedCurrent()&&JSON.stringify(originalClient.getAdmission())===JSON.stringify(admission)});if(!selectedCurrent())throw fail();}
     if(client.getSnapshot().supportsAttachments)media=createHttpPrivateMedia({client,accountId,conversationId,isCurrent:selectedCurrent,signal:selected.signal,fetcher});
     const publishSummary=()=>{const latest=client.getAdmission();if(selectedCurrent()){const valid=latest&&JSON.stringify(latest)===JSON.stringify(admission)&&client.getSnapshot().available;if(!valid){drafts.revoke(conversationId);workspace?.close();}if(valid&&client.localView?.getHiddenIds)inbox.setHidden(conversationId,client.localView.getHiddenIds());inbox.receive(conversationId,valid?client.getSnapshot():{available:false,messages:[]});}};
     inboxSubscription=client.subscribe(publishSummary);publishSummary();
     workspace=createHumanConversationWorkspace({binding,signal:selected.signal,authorize:()=>{const latest=client.getAdmission();return selectedCurrent()&&client.getSnapshot().available&&latest&&JSON.stringify(latest)===JSON.stringify(admission);},openConversation:async()=>({client,media,close:release})});
     const originalClose=workspace.close,wrapped=Object.freeze({...workspace,close(){originalClose();release();}});workspace=wrapped;workspaces.add(wrapped);sourceSubscription=wrapped.subscribe(()=>forwarding.sourceChanged());
     // Keep at most three already-open admitted transports. Detached views have
     // no plaintext access, while the existing client poll still checks Core.
     for(const [id,record]of retained){if(retained.size<3)break;if(record.views===0){record.workspace.close();retained.delete(id);}}
     if(retained.size>=3)throw Error('Close an existing conversation view before opening another.');
     const record={workspace:wrapped,startWork:null,views:0};retained.set(conversationId,record);selectionSignal.removeEventListener('abort',abort);return lease(record,selectionSignal);
    }catch(error){release();throw error;}finally{releasePriority();}
   },close,
  };void (async()=>{try{if(drafts.loadInboxPreferences){const preferences=await drafts.loadInboxPreferences();if(current())inbox.hydratePreferences(preferences);}}catch{if(current())inbox.setStatus({readStateProblem:true});}if(current())await coldInbox.refresh();})();return Object.freeze(port);
 }catch{close();throw fail();}
}
