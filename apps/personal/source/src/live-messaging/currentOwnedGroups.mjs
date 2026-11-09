import {leaseRetainedConversation} from './retainedConversationWorkspace.mjs';
import {openCurrentOwnedOriginalGroups} from './currentOwnedOriginalGroups.mjs';
import {loadCurrentOriginalGroupEngine} from './currentOriginalEngineLoader.mjs';
import {originalMdkFormat,legacyGroupFormat} from './groupStorageFormat.mjs';
import {createCurrentGroupBlossom} from './currentGroupBlossom.mjs';
import {openPrivateMediaSession} from './privateMediaSession.mjs';
import {deserializeApplicationData} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/index.js';
import {createCurrentGroupNetwork} from './currentGroupNetwork.mjs';
import {verifyEvent} from 'nostr-tools';
import {createCurrentHostSigner} from './currentHostSigner.mjs';
import {createCurrentGroupDirectoryClient} from './currentGroupDirectoryClient.mjs';
import {openCurrentBrowserMls} from './currentBrowserMls.mjs';
import {createCurrentSdkHistoryFactory} from './currentSdkHistory.mjs';
import {createRelayNetwork} from './realRelayNetwork.mjs';
import {openGroupPublicationGate} from './groupPublicationGate.mjs';
import {createSdkGroupPublicationClassifier} from './sdkGroupPublicationClassifier.mjs';
import {openCurrentGroupResources} from './currentGroupResources.mjs';
import {createMembershipJournal} from './membershipJournal.mjs';
import {openConversationDraft} from './conversationDraft.mjs';
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const fail=()=>Error('This private group is unavailable');
const members=value=>[...value].sort();
const sameMembers=(a,b)=>JSON.stringify(members(a))===JSON.stringify(members(b));
/** Actual existing owner identity + durable browser MLS + independent same-host
 * group directory. Lazy crypto loading never changes the original person-chat
 * transport or supplies a fixture identity, test signer, fake history or relay.
 */
export function createCurrentOwnedGroups({identity,isCurrent,signal,contacts,spots,fetcher=globalThis.fetch,storage,locks=globalThis.navigator?.locks,crypto=globalThis.crypto,createSocket,openMedia,loadOriginalEngine=loadCurrentOriginalGroupEngine}){
 if(!identity?.accountId||!hex(identity.pubkey)||!hex(identity.bindingFingerprint)||identity.publicBindingVerified!==true||identity.emailVerificationRequired!==false||typeof isCurrent!=='function'||typeof contacts!=='function'||!Array.isArray(spots)||!spots.length||spots.length>100||!signal?.addEventListener||!locks?.request||!crypto?.subtle||createSocket!==undefined&&typeof createSocket!=='function')throw fail();
 const allowedSpots=new Map(spots.map(spot=>[spot.id,Object.freeze({...spot})]));
 if(allowedSpots.size!==spots.length||spots.some(spot=>!/^crays-demo-01a1863a-v1-spot-[0-9]{4}$/.test(spot.id)||spot.relay!=='ws://127.0.0.1:18990/spots/'+spot.id))throw fail();
 const lifetime=new AbortController(),workspaces=new Set(),composers=new WeakMap(),creations=new Set(),invitePermissions=new Map(),retained=new Map(),viewOwners=new WeakMap();let closed=false,engine,opening,classifier,gate,history,timer,originalOwned,openingOriginal;
 const current=()=>!closed&&!signal.aborted&&!lifetime.signal.aborted&&isCurrent(identity)===true;
 const check=()=>{if(!current())throw fail();};
 const directory=createCurrentGroupDirectoryClient({identity,isCurrent:current,signal:lifetime.signal,fetcher});
 const rows=()=>{const value=directory.getSnapshot();return current()&&['ready','loading'].includes(value.state)?value.groups:[];};
 const rowFor=id=>rows().find(row=>row.groupId===id||row.conversationId===id);
 const sourceCurrent=row=>{const actual=rowFor(row.groupId);return current()&&actual?.membershipId===row.membershipId&&actual.members.includes(identity.pubkey);};
 const eligible=()=>{check();const list=contacts();if(!Array.isArray(list)||list.length>1000)throw fail();return [...new Map(list.filter(row=>row&&hex(row.pubkey)&&row.pubkey!==identity.pubkey&&typeof row.name==='string'&&row.name.trim()&&row.name.length<=160).map(row=>[row.pubkey,row])).values()];};
 const eligibleFor=(row,pubkey)=>eligible().some(person=>person.pubkey===pubkey&&(!person.spotIds||person.spotIds.includes(row.spotId)));
 const selectedRelays=()=>[...new Set(rows().map(row=>row.relay))];
 const authorization=({groupId,invitees=[]})=>{const row=rowFor(groupId);return !!row&&sourceCurrent(row)&&classifier?.canPublish({groupId,invitees})===true&&invitees.every(pubkey=>{const permission=invitePermissions.get(groupId+':'+pubkey);return permission?.revision===row.revision&&permission.relay===row.relay&&eligibleFor(row,pubkey);});};
 function close(){if(closed)return;closed=true;for(const record of retained.values())record.workspace.close();retained.clear();lifetime.abort();signal.removeEventListener('abort',close);clearInterval(timer);for(const controller of creations)controller.close();for(const workspace of workspaces){composers.get(workspace)?.close();workspace.close();}creations.clear();workspaces.clear();invitePermissions.clear();classifier?.close();engine?.close();originalOwned?.close();directory.close();}
 signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();
 let retiring=Promise.resolve();
 const directoryChanged=()=>{if(!current())return;const status=directory.getSnapshot().state;if(status==='unavailable'||status==='closed'){const previous=engine;engine=null;previous?.close();const previousOriginal=originalOwned;originalOwned=null;previousOriginal?.close();if(previousOriginal)retiring=Promise.allSettled([retiring,previousOriginal.settled()]).then(()=>{});if(previous)retiring=Promise.allSettled([retiring,previous.settled()]).then(()=>{});for(const workspace of workspaces)workspace.close();}else {for(const workspace of workspaces)workspace.recheck();originalOwned?.recheck();}};directory.subscribe(directoryChanged);
 async function refresh(){check();await directory.refresh();check();}
 async function syncGroup(groupId,before,after){
  check();if(before.name===after.name&&sameMembers(before.members,after.members))return;
  await refresh();const row=rowFor(groupId);if(!row)throw fail();
  if(row.name===after.name&&sameMembers(row.members,after.members))return;
  if(row.name!==before.name||!sameMembers(row.members,before.members))throw Error('The group changed in another window. Reopen it before continuing.');
  await directory.sync({conversationId:row.conversationId,revision:row.revision,name:after.name,members:[...after.members]});await refresh();
 }
 const metadata=group=>({name:group.snapshot.groupData.name,members:[...group.snapshot.members]});
 function scopedClient(client){
  const manager=new Proxy(client.groups,{get(target,key){
   if(['send','commit','leave'].includes(key))return async(groupId,...args)=>{
    const group=await target.get(groupId),before=metadata(group);check();const result=await target[key](groupId,...args);
    const replies=Array.isArray(result)?result.map(item=>item.response):[result];
    if(replies.some(reply=>Object.values(reply??{}).some(ack=>ack?.ok===true))){const after=key==='leave'?{name:before.name,members:before.members.filter(pubkey=>pubkey!==identity.pubkey)}:metadata(group);await syncGroup(group.idStr,before,after);}
    return result;
   };
   const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }});
  return new Proxy(client,{get(target,key){if(key==='groups')return manager;const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
 }
 async function openEngine(){
  check();if(engine)return engine;if(opening)return opening;
  const work=(async()=>{
   await retiring;check();const provider=createCurrentHostSigner({accountId:identity.accountId,verifiedIdentity:identity,isCurrent:current,signal:lifetime.signal,fetcher});let opened;
   try{
    const metadataPreflights=new WeakSet();
    opened=await openCurrentBrowserMls({accountId:identity.accountId,provider,isCurrent:current,signal:lifetime.signal,fetcher,storage,
     prepareAccount:refresh,startGroupBeforeReturn:true,
     async prepareConversation({conversationId,signal:selectionSignal}){
      selectionSignal.throwIfAborted();await refresh();check();selectionSignal.throwIfAborted();
      const token=Object.freeze({conversationId,directorySnapshot:directory.getSnapshot()});metadataPreflights.add(token);return token;
     },
     isCurrentBinding:value=>current()&&value.accountId===identity.accountId&&value.pubkey===identity.pubkey&&value.bindingFingerprint===identity.bindingFingerprint,
     authorizeOperation:(binding,operation)=>current()&&(operation.kind==='identity'||['encrypt','decrypt'].includes(operation.kind)&&hex(operation.pubkey)||operation.kind==='sign'&&[13,450,30078,30443,22242,10050].includes(operation.event?.kind)),
     openNetwork:({signer})=>{
      const network=createSocket?createRelayNetwork({relays:spots.map(spot=>spot.relay),createSocket,verifyEvent,expectedAuthPubkey:identity.pubkey,signAuth:async(relay,challenge)=>{check();if(!selectedRelays().includes(relay))throw fail();return signer.signEvent({kind:22242,created_at:Math.floor(Date.now()/1000),content:'',tags:[['relay',relay],['challenge',challenge]]});}}):createCurrentGroupNetwork({identity,isCurrent:current,signal:lifetime.signal,fetcher});
      return{...network,async getUserInboxRelays(pubkey){check();const relays=selectedRelays();if(!relays.length)return[];const events=await network.request(relays,{kinds:[10050],authors:[pubkey]}),latest=events.sort((a,b)=>b.created_at-a.created_at)[0];return latest?[...new Set(latest.tags.filter(tag=>tag[0]==='relay'&&relays.includes(tag[1])).map(tag=>tag[1]))]:[];}};
     },
     async openPublicationGate(context){
      classifier=createSdkGroupPublicationClassifier({rewindStore:context.stores.rewindStore,pubkey:identity.pubkey,isCurrent:current,authorizeInvite:pubkey=>eligible().some(person=>person.pubkey===pubkey)});
      gate=await openGroupPublicationGate({network:context.network,journal:context.stores.conversationStore,binding:{accountId:identity.accountId,pubkey:identity.pubkey},signal:context.signal,verifyEvent,classify:event=>classifier.classify(event),authorize:current,authorizeGroup:authorization,authorizeTransport:event=>classifier.canSend(event)});return gate;
     },
     onGroupLoaded:group=>classifier.register(group),onGroupUnloaded:id=>classifier?.unregister(id),
     authorizeEvent:({relays,event})=>{
      if(!current()||!relays.length||relays.some(url=>!selectedRelays().includes(url)))return false;
      if(event.kind===445)return classifier?.canSend(event)===true&&rows().some(row=>event.tags.some(tag=>tag[0]==='h'&&tag[1]===row.routingId));
      if([10050,30443].includes(event.kind))return event.pubkey===identity.pubkey;
      if(event.kind===1059){const targets=event.tags.filter(tag=>tag[0]==='p');return targets.length===1&&[...invitePermissions.entries()].some(([key,value])=>key.endsWith(':'+targets[0][1])&&value.relay&&relays.includes(value.relay));}
      return false;
     },
     createHistoryFactory:context=>(history=createCurrentSdkHistoryFactory(context)),
     async admitConversation({identity:actual,conversationId,client,stores,signal:groupSignal,preflight}){
      // Consume only this invocation's freshly completed directory read. The
      // parallel account check must already have succeeded before this callback
      // can touch MLS state; no permission TTL or old directory cache is used.
      if(!preflight||!metadataPreflights.delete(preflight)||preflight.conversationId!==conversationId)throw fail();
      if(preflight.directorySnapshot.state!=='ready'||preflight.directorySnapshot!==directory.getSnapshot())await refresh();
      check();groupSignal.throwIfAborted();const row=rowFor(conversationId);if(!row||actual.bindingFingerprint!==identity.bindingFingerprint)return null;
      const group=await client.groups.get(row.groupId);check();const route=group.snapshot.groupData.nostrGroupId,routingId=typeof route==='string'?route:Array.from(route,byte=>byte.toString(16).padStart(2,'0')).join('');
      if(group.status!=='active'||!group.snapshot.members.includes(identity.pubkey)||routingId!==row.routingId||!group.snapshot.groupData.relays.every(url=>url===row.relay))return null;
      return{accountId:identity.accountId,pubkey:identity.pubkey,bindingFingerprint:identity.bindingFingerprint,conversationId,kind:row.kind,groupId:row.groupId,membershipId:row.membershipId,canRead:true,canSend:true,isCurrent:()=>sourceCurrent(row),
       openResources:context=>openCurrentGroupResources({...context,client:scopedClient(client),group,stores,origin:'creation',recoverHistory:()=>history.recover(row.groupId),isCurrent:()=>sourceCurrent(row),
        authorizeGroup:(binding,action,pubkey)=>sourceCurrent(row)&&binding.groupId===row.groupId&&(!['invite'].includes(action)||eligibleFor(row,pubkey)),candidates:()=>eligible().filter(person=>!person.spotIds||person.spotIds.includes(row.spotId)),
        async resolvePackage(pubkey){const latest=rowFor(row.groupId);if(!latest)throw fail();const permission=await directory.prepareInvitation({conversationId:row.conversationId,pubkey,revision:latest.revision});invitePermissions.set(row.groupId+':'+pubkey,permission);const packages=await opened.network.request([row.relay],{kinds:[30443],authors:[pubkey]});check();const exact=packages.find(event=>group.evaluateKeyPackage(event).eligible);if(!exact)throw Error('This person has no current messaging invitation key.');return exact;},
        recovery:{async retry(entry,options){const previous=rowFor(row.groupId);if(!previous)throw fail();const result=await classifier.retryOriginal({group,entry,gate,signal:options.signal});check();if(result.status==='sent-to-relay')await syncGroup(row.groupId,{name:previous.name,members:[...previous.members]},metadata(group));return result;}},openMedia:openMedia??(async context=>openPrivateMediaSession({binding:context.binding,group:context.group,client:context.client,journal:context.journal,transport:createCurrentGroupBlossom({binding:{...context.binding,bindingFingerprint:identity.bindingFingerprint},isCurrent:context.isCurrent,signal:context.signal,fetcher}),authorize:context.isCurrent,decode:deserializeApplicationData})),
       }),
      };
     },
    });
    if(!current()){opened.close();await opened.settled();throw fail();}engine=opened;return engine;
   }catch(error){provider.close();opened?.close();throw error;}
  })();opening=work;try{return await work;}finally{if(opening===work)opening=null;}
 }
 async function openOriginal(initialCreationRelay){
  check();if(originalOwned)return originalOwned;if(openingOriginal)return openingOriginal;
  const work=(async()=>{await retiring;await refresh();check();const opened=await openCurrentOwnedOriginalGroups({identity,isCurrent:current,signal:lifetime.signal,directory,rows,rowFor,sourceCurrent,eligible,eligibleFor,spots,fetcher,storage,locks,crypto,loadEngine:loadOriginalEngine,initialCreationRelay});if(!current()){opened.close();await opened.settled();throw fail();}originalOwned=opened;return opened;})();openingOriginal=work;try{return await work;}finally{if(openingOriginal===work)openingOriginal=null;}
 }
 // Keep at most three already-admitted active group transports in this
 // account lifetime, as for person chats. A detached view gets no snapshot;
 // the actual directory/MLS subscriptions continue their existing revocation
 // checks. Pending or failed connections are closed when their last view leaves.
 function borrow(record,signal){
  const view=leaseRetainedConversation(record,{signal,onRelease:()=>{if(record.views!==0)return;const value=record.workspace.getSnapshot(),state=value.client?.getSnapshot().connectionState;if(value.state!=='ready'||['connecting','unavailable','closed'].includes(state))record.workspace.close();}});
  viewOwners.set(view,record.workspace);return view;
 }
 async function openActualConversation(request){check();if(rowFor(request.conversationId)?.storageFormat===originalMdkFormat)return (await openOriginal()).openConversation(request);if(request.accountId!==identity.accountId||rowFor(request.conversationId)?.storageFormat!==legacyGroupFormat)throw fail();const runtime=await openEngine(),workspace=await runtime.messaging.openConversation(request);let draft,journal;
   try{const row=rowFor(request.conversationId);if(!row)throw fail();journal=createMembershipJournal({journal:runtime.storage.stores.conversationStore,groupId:row.groupId,membershipId:row.membershipId,origin:'creation',isCurrent:()=>sourceCurrent(row)&&!workspace.signal.aborted});draft=await openConversationDraft({binding:workspace.binding,journal,exclusive,authorize:()=>sourceCurrent(row)&&!workspace.signal.aborted,signal:workspace.signal});check();composers.set(workspace,draft);workspaces.add(workspace);workspace.signal.addEventListener('abort',()=>{draft.close();journal.close();workspaces.delete(workspace);},{once:true});return workspace;}catch(error){draft?.close();journal?.close();workspace.close();throw error;}
  }
 const exclusive=async(scope,operation,abort)=>{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(scope));return locks.request('crays.group-draft:'+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join(''),{signal:abort},operation);};
 return Object.freeze({directory,accountId:identity.accountId,signal:lifetime.signal,refresh,
  async openCreation({spotId,parentKind='vifs',parentId='personal-vifs'}){
   check();const spot=allowedSpots.get(spotId);if(!spot)throw fail();return (await openOriginal(spot.relay)).openCreation({spotId,parentKind,parentId});
  },
  async openConversation(request){
   check();if(request.accountId!==identity.accountId||!request.signal?.addEventListener||request.signal.aborted)throw fail();
   const previous=retained.get(request.conversationId);
   if(previous){previous.workspace.recheck();const value=previous.workspace.getSnapshot();if(!previous.workspace.signal.aborted&&value.state==='ready'&&value.client?.getSnapshot().available){retained.delete(request.conversationId);retained.set(request.conversationId,previous);return borrow(previous,request.signal);}previous.workspace.close();retained.delete(request.conversationId);}
   const stop=new AbortController(),cancel=()=>stop.abort();let base;
   request.signal.addEventListener('abort',cancel,{once:true});lifetime.signal.addEventListener('abort',cancel,{once:true});
   try{
    base=await openActualConversation({...request,signal:stop.signal});check();request.signal.throwIfAborted();
    for(const [id,record]of retained){if(retained.size<3)break;if(record.views===0){record.workspace.close();retained.delete(id);}}
    if(retained.size>=3)throw Error('Close an existing group view before opening another.');
    const record={workspace:base,startWork:null,views:0};retained.set(request.conversationId,record);
    base.signal.addEventListener('abort',()=>{lifetime.signal.removeEventListener('abort',cancel);if(retained.get(request.conversationId)===record)retained.delete(request.conversationId);},{once:true});
    return borrow(record,request.signal);
   }catch(error){cancel();base?.close();lifetime.signal.removeEventListener('abort',cancel);throw error;}
   finally{request.signal.removeEventListener('abort',cancel);}
  },
  owns(workspace){const base=viewOwners.get(workspace)??workspace;return current()&&(workspaces.has(base)||originalOwned?.owns(base)===true);},getComposer(workspace){check();if(workspace?.signal?.aborted)throw fail();const base=viewOwners.get(workspace)??workspace;if(originalOwned?.owns(base))return originalOwned.getComposer(base);const value=composers.get(base);if(!value||value.signal.aborted)throw fail();return value;},
  start(){check();if(timer)return;void refresh().catch(()=>{});timer=setInterval(()=>{if(current())void refresh().catch(()=>{});},5000);},close,async settled(){await retiring;await engine?.settled();await originalOwned?.settled();},
 });
}
