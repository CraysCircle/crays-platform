import {openCurrentOriginalBrowserMls} from './currentOriginalBrowserMls.mjs';
import {createCurrentHostSigner} from './currentHostSigner.mjs';
import {createCurrentGroupNetwork} from './currentGroupNetwork.mjs';
import {createCurrentGroupBlossom} from './currentGroupBlossom.mjs';
import {openMdkGroupTextResources} from './mdkGroupTextResources.mjs';
import {createMdkFounderRegistration} from './mdkFounderRegistration.mjs';
import {openPrivateGroupCreation} from './privateGroupCreation.mjs';
import {originalMdkFormat} from './groupStorageFormat.mjs';
const hex=(value,length=64)=>typeof value==='string'&&new RegExp('^[a-f0-9]{'+length+'}$').test(value);
const fail=()=>Error('This original private group is unavailable');
const key=bytes=>Array.isArray(bytes)&&bytes.length===32?bytes.map(v=>v.toString(16).padStart(2,'0')).join(''):null;
/** Existing Core directory and same-origin signer/network, explicitly dispatched
 * by persisted original format. This backend never reads a legacy group or
 * claims a VIF relationship from group membership. */
export async function openCurrentOwnedOriginalGroups({identity,isCurrent,signal,directory,rows,rowFor,sourceCurrent,eligible,eligibleFor,spots,fetcher,storage,locks,crypto,loadEngine,initialCreationRelay}){
 const controller=new AbortController(),workspaces=new Set(),composers=new WeakMap(),resources=new Map(),creations=new Set(),permissions=new Map(),inboxRoutes=new Map(),creationScopes=new Set(),inspectionGroups=new Map();let closed=false,backend,provider;
 const current=()=>!closed&&!signal.aborted&&isCurrent()===true;
 const check=()=>{if(!current())throw fail();};
 if(initialCreationRelay!==undefined&&!spots.some(spot=>spot.relay===initialCreationRelay))throw fail();
 const relays=()=>[...new Set(rows().map(row=>row.relay).concat([...creationScopes].map(scope=>scope.relay),initialCreationRelay?[initialCreationRelay]:[]))];
 const currentRow=id=>{const row=rowFor(id);return row?.storageFormat===originalMdkFormat&&sourceCurrent(row)?row:null;};
 const match=(groupId,endpoints,routingId)=>{const row=currentRow(groupId);return !!row&&Array.isArray(endpoints)&&endpoints.length===1&&endpoints[0]===row.relay&&(routingId===undefined||routingId===row.routingId);};
 const inviteAllowed=(recipient,endpoints)=>[...permissions.entries()].some(([id,permission])=>{const row=currentRow(id.split(':')[0]);return row&&permission.pubkey===recipient&&permission.revision===row.revision&&permission.relay===row.relay&&eligibleFor(row,recipient)&&(!endpoints||JSON.stringify(endpoints)===JSON.stringify([row.relay]));});
 function authorize(operation,payload){
  if(!current())return false;
  if(operation==='open')return payload?.inboxes&&Object.entries(payload.inboxes).every(([pubkey,targets])=>(pubkey===identity.pubkey||eligible().some(person=>person.pubkey===pubkey))&&Array.isArray(targets)&&targets.every(url=>relays().includes(url)));
  if(operation==='activate'||operation==='deactivate')return payload===null||key(payload)===identity.pubkey||key(payload?.account_id)===identity.pubkey;
  if(operation==='syncGroups')return payload===null||key(payload?.account_id)===identity.pubkey&&payload.group_subscriptions?.every(route=>match(route.group_id.map(v=>v.toString(16).padStart(2,'0')).join(''),route.endpoints,route.transport_group_id.map(v=>v.toString(16).padStart(2,'0')).join('')));
  if(operation==='create')return [...creationScopes].some(scope=>JSON.stringify(payload?.relays)===JSON.stringify([scope.relay]));
  if(operation==='route-inbox')return inviteAllowed(payload?.pubkey,payload?.endpoints);
  if(operation==='create-reconcile')return creationScopes.size>0&&hex(payload?.routingId);
  if(operation==='subscribe')return payload.group===null?relays().includes(payload.endpoint):match(payload.group,[payload.endpoint],payload.filters?.['#h']?.[0]);
  if(operation==='receive')return payload.groupId===null?relays().includes(payload.endpoint):match(payload.groupId,[payload.endpoint]);
  if(operation==='publishKeyPackage')return key(payload?.account_id)===identity.pubkey&&payload.endpoints?.every(url=>relays().includes(url));
  if(operation==='publish'){
   if(key(payload?.account_id)!==identity.pubkey)return false;
   const target=payload.target?.Group;if(target)return match(target.group_id?.map(v=>v.toString(16).padStart(2,'0')).join(''),target.endpoints,target.transport_group_id?.map(v=>v.toString(16).padStart(2,'0')).join(''));
   const inbox=payload.target?.Inbox;return !!inbox&&inviteAllowed(key(inbox.recipient),inbox.endpoints);
  }
  if(operation==='read'&&creationScopes.has(inspectionGroups.get(payload?.groupId)))return true;
  const row=currentRow(payload?.groupId);if(!row)return false;
  if(operation==='manage'&&payload.action?.action==='retry-welcome')return row.members.includes(payload.action.recipient)&&inviteAllowed(payload.action.recipient,[row.relay])&&inboxRoutes.get(payload.action.recipient)===row.relay;
  if(operation==='manage'&&payload.action?.action==='invite')return payload.action.packages?.every(event=>eligibleFor(row,event.pubkey)&&inviteAllowed(event.pubkey,[row.relay])&&inboxRoutes.get(event.pubkey)===row.relay);
  return ['read','send','manage','leave','media-upload','media-download'].includes(operation);
 }
 const close=()=>{if(closed)return;closed=true;controller.abort();signal.removeEventListener('abort',close);for(const item of creations)item.close();for(const ws of workspaces)ws.close();creations.clear();resources.clear();workspaces.clear();permissions.clear();inboxRoutes.clear();creationScopes.clear();inspectionGroups.clear();void backend?.close();provider?.close();};
 signal.addEventListener('abort',close,{once:true});
 const refresh=async()=>{check();await directory.refresh();check();};
 async function sync(summary){await refresh();const row=currentRow(summary.groupId);if(!row)throw fail();if(row.name===summary.name&&JSON.stringify([...row.members].sort())===JSON.stringify([...summary.members].sort()))return;await directory.sync({conversationId:row.conversationId,revision:row.revision,name:summary.name,members:[...summary.members]});await refresh();}
 // The original runtime is opened lazily by the owning factory. The original
 // verified account supplies custody; no replacement identity or local fallback.
 try{
  check();await refresh();
  provider=createCurrentHostSigner({accountId:identity.accountId,verifiedIdentity:identity,isCurrent:current,signal:controller.signal,fetcher});
  backend=await openCurrentOriginalBrowserMls({accountId:identity.accountId,provider,isCurrent:current,signal:controller.signal,fetcher,storage,locks,crypto,loadEngine,
   isCurrentBinding:value=>current()&&value.accountId===identity.accountId&&value.pubkey===identity.pubkey&&value.bindingFingerprint===identity.bindingFingerprint,
   authorizeOperation:(_,operation)=>current()&&(operation.kind==='identity'||['encrypt','decrypt'].includes(operation.kind)&&hex(operation.pubkey)||operation.kind==='sign'&&[13,450,30078,30443,22242,10050].includes(operation.event?.kind)),
   currentInboxes:()=>{const targets=relays();if(!targets.length)throw fail();return {[identity.pubkey]:targets};},
   openNetwork:()=>createCurrentGroupNetwork({identity,isCurrent:current,signal:controller.signal,fetcher}),authorizeRuntimeOperation:authorize,
   async admitConversation({conversationId,identity:actual}){
    await refresh();const row=currentRow(conversationId);if(!row||actual.bindingFingerprint!==identity.bindingFingerprint)return null;
    const grant={...row,accountId:identity.accountId,pubkey:identity.pubkey,bindingFingerprint:identity.bindingFingerprint,relays:[row.relay],canRead:true,canSend:true,isCurrent:()=>sourceCurrent(row)};
    return {...grant,openResources:async context=>{
     const result=await openMdkGroupTextResources({...context,getAdmission:()=>sourceCurrent(row)?grant:null,authorize:(_,action,target)=>sourceCurrent(row)&&(action!=='invite'||eligibleFor(row,target)),
      invitationCandidates:()=>eligible().filter(person=>!person.spotIds||person.spotIds.includes(row.spotId)),
      async resolveInvitationPackage(pubkey){await refresh();const latest=currentRow(row.groupId);if(!latest||!eligibleFor(latest,pubkey))throw fail();const permission=await directory.prepareInvitation({conversationId:latest.conversationId,pubkey,revision:latest.revision});permissions.set(row.groupId+':'+pubkey,{...permission,pubkey});await backend.runtime.setInboxRoute(pubkey,[row.relay]);inboxRoutes.set(pubkey,row.relay);const events=await backend.network.request([row.relay],{kinds:[30443],authors:[pubkey]});check();const event=events.sort((a,b)=>b.created_at-a.created_at).find(event=>event.pubkey===pubkey&&event.kind===30443&&(!permission.keyPackageEventId||event.id===permission.keyPackageEventId));if(!event)throw Error('This person has no current messaging invitation key.');return event;},
      async prepareInvitationRetry(attempt,{needsCommitProof=false}={}){
       await refresh();const latest=currentRow(row.groupId);if(!latest||!eligibleFor(latest,attempt.pubkey))throw fail();
       const permission=await directory.resumeInvitation({conversationId:latest.conversationId,pubkey:attempt.pubkey,revision:latest.revision});check();
       const fresh=currentRow(row.groupId);if(!fresh||fresh.revision!==latest.revision||permission.relay!==latest.relay)throw fail();
       permissions.set(row.groupId+':'+attempt.pubkey,{...permission,pubkey:attempt.pubkey});
       await backend.runtime.setInboxRoute(attempt.pubkey,[latest.relay]);check();inboxRoutes.set(attempt.pubkey,latest.relay);
       if(needsCommitProof){
        const events=await backend.network.request([latest.relay],{kinds:[30443],authors:[attempt.pubkey],ids:[attempt.keyPackageEventId]});check();
        const original=events.find(event=>event.id===attempt.keyPackageEventId&&event.pubkey===attempt.pubkey&&event.kind===30443);
        if(!original)throw fail();return original;
       }

      },
      onGroupConfirmed:sync,onGroupLeft:async()=>{await refresh();const latest=currentRow(row.groupId);if(latest)await directory.sync({conversationId:latest.conversationId,revision:latest.revision,name:latest.name,members:latest.members.filter(pubkey=>pubkey!==identity.pubkey)});await refresh();},
      mediaConfiguration:{baseUrl:'http://127.0.0.1:18994/',transport:createCurrentGroupBlossom({binding:{...context.binding,bindingFingerprint:identity.bindingFingerprint},isCurrent:()=>sourceCurrent(row),signal:context.signal,fetcher})},
     });check();resources.set(conversationId,result);context.signal.addEventListener('abort',()=>{if(resources.get(conversationId)===result)resources.delete(conversationId);},{once:true});return result;
    }};
   },
  });check();
  return Object.freeze({
   async openConversation(request){check();if(request.accountId!==identity.accountId||!currentRow(request.conversationId))throw fail();const ws=await backend.messaging.openConversation(request);check();workspaces.add(ws);ws.signal.addEventListener('abort',()=>workspaces.delete(ws),{once:true});return ws;},
   getComposer(ws){check();const known=composers.get(ws);if(known)return known;const result=resources.get(ws.binding.conversationId)?.composer;if(!workspaces.has(ws)||!result)throw fail();composers.set(ws,result);return result;},owns:ws=>current()&&workspaces.has(ws),
   async openCreation({spotId,parentKind='vifs',parentId='personal-vifs'}){
    check();const spot=spots.find(item=>item.id===spotId);if(!spot||!['vifs','spot','circle'].includes(parentKind))throw fail();
    const scope={relay:spot.relay};creationScopes.add(scope);
    const binding={accountId:identity.accountId,pubkey:identity.pubkey,bindingFingerprint:identity.bindingFingerprint,contextId:parentKind+':'+parentId+':'+spotId,kind:parentKind==='spot'?'spot':'circle',storageFormat:originalMdkFormat,relays:[spot.relay]};
    let journal,creation;
    try{
     journal=await backend.accountStore.openCreationJournal({binding,getAdmission:()=>current()&&creationScopes.has(scope)?binding:null,signal:controller.signal});
     const creationRuntime=Object.freeze({...backend.runtime,async createFounderGroup(input){const value=await backend.runtime.createFounderGroup(input);inspectionGroups.set(value.groupId,scope);return value;},async findGroupByRouting(route){const groupId=await backend.runtime.findGroupByRouting(route);if(groupId)inspectionGroups.set(groupId,scope);return groupId;}});
     const registration=createMdkFounderRegistration({identity,runtime:creationRuntime,journal,directory,isCurrent:()=>current()&&creationScopes.has(scope),context:{spotId,parentKind,parentId,relay:spot.relay,mediaEndpoints:['http://127.0.0.1:18994/']},crypto});
     const register=async(input,allowCreate)=>{const value=await registration.register(input,{allowCreate});await refresh();await backend.runtime.syncGroups();const summary=await backend.runtime.summary(value.groupId),route=await backend.runtime.routing(value.groupId);return {groupId:value.groupId,name:summary.name,members:summary.members.map(row=>key(row.id)),admins:summary.admins,relays:route.relays,active:!summary.terminal&&!summary.removed&&!summary.unrecoverable};};
     creation=await openPrivateGroupCreation({binding,journal,signal:controller.signal,authorize:()=>current()&&creationScopes.has(scope),create:input=>register(input,true),reconcile:input=>register(input,false),describeCreated:value=>value});
     const handle=Object.freeze({...creation,close(){creation.close();journal.close();creationScopes.delete(scope);for(const [id,value]of inspectionGroups)if(value===scope)inspectionGroups.delete(id);creations.delete(handle);}});creations.add(handle);return handle;
    }catch(error){journal?.close();creation?.close();creationScopes.delete(scope);throw error;}
   },
   recheck(){if(!current())close();else for(const ws of workspaces)ws.recheck();},close,async settled(){await backend?.settled();},
  });
 }catch(error){close();throw error;}
}
