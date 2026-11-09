import {resolveSdkHistoryReply} from './resolveSdkHistoryReply.mjs';
import {openPagedConversationClient} from './pagedConversationClient.mjs';
import {replyToFromTags} from './conversationReply.mjs';
import {recoverSdkHistory} from './recoverSdkHistory.mjs';
import {decodeDeliveredEvidence} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/client/session/delivered-payload-store.js';
import {createBoundedRumorHistoryBackend,createPagedSdkGroupHistory} from './boundedRumorHistory.mjs';
import {compileFilter} from '../../.qualification/marmot-pilot-v1/node_modules/applesauce-core/dist/helpers/filter.js';
import {openScopedRumorStore} from './scopedRumorStore.mjs';
import {openFencedSdkRumorStore} from './fencedSdkRumorStore.mjs';
import {GroupRumorHistory} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/client/group/group-rumor-history.js';
import {KeyValueRumorHistoryBackend} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/extra/key-value-rumor-history-backend.js';
import {openConversationDraft} from './conversationDraft.mjs';
import {openConversationLocalView} from './conversationLocalView.mjs';
import {encryptedMediaBlossomDefaultV2} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/core/index.js';
import {verifiedMembershipContext,readVerifiedMembershipContext} from './verifiedMembershipContext.mjs';
import {founderMembership} from './founderMembership.mjs';
import {openPrivateGroupCreation} from './privateGroupCreation.mjs';
import {createMembershipJournal} from './membershipJournal.mjs';
import {openPrivateGroupDeparture} from './privateGroupDeparture.mjs';
// Explicit ephemeral browser-crypto qualification. Never imported by actual8990 production sources.
import {MarmotClient,deserializeApplicationData,createInboxRelayListEvent,createNip65RelayListEvent} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/index.js';
import {createApplicationMessageIntent,createChatRumor,Proposals} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/client/index.js';
import {InMemoryKeyValueStore} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/extra/index.js';
import {generateSecretKey,getPublicKey,finalizeEvent,verifyEvent,nip44} from 'nostr-tools';
import {openPrivateGroupInvitations} from './privateGroupInvitations.mjs';
import {createInviteIntent} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/client/group/invite.js';
import {openGroupPublicationGate} from './groupPublicationGate.mjs';
import {createSdkGroupPublicationClassifier} from './sdkGroupPublicationClassifier.mjs';
import {openPrivateGroupController} from './privateGroupController.mjs';
import {createPrivateBlobTransport} from './privateBlobTransport.mjs';
import {openPrivateMediaSession} from './privateMediaSession.mjs';
import {createMediaConversationClient} from './mediaConversationClient.mjs';
import {createRelayNetwork} from './realRelayNetwork.mjs';
import {createConversationSession,openPersistedConversationSession} from './conversationSession.mjs';

export function createSyntheticBrowserMlsActor({relayURL,onReader,identityKey,durableStores,mediaBaseURL,invitationCandidates=[],fencedSdkHistory=false}){
 if(globalThis.__CRAYS_SYNTHETIC_MARMOT_LAB__!==true||!/^ws:\/\/127\.0\.0\.1:\d+\/$/.test(relayURL))throw Error('Explicit isolated browser-crypto lab required');
 const key=identityKey?new Uint8Array(identityKey):generateSecretKey(),pubkey=getPublicKey(key),stores=[],subscriptions=[],lifetime=new AbortController();let creationControl,groupControl,invitations,departure,departurePermit,departureFailure,invitationFailure,membershipId,membershipJournal,groupSubscription,currentReader,activeGroup,groupSwitch=Promise.resolve(),loseNextGroupAck=false,revokeAtWelcome=false,failDraftSave=false,failSdkHistorySave=false;const retainedSessions=new Map(),verifiedHistoryBindings=new Map(),historyStores=new Map(),historyRecoveryPorts=new Map(),historyRecoveryResults=new Map(),historyErrors=[],ingestDiagnostics=[],inboundDiagnostics=[],storageDiagnostics=[],storagePending=new Map(),authorizedHistoryPurges=new WeakSet();const revokedInviteTargets=new Set();const groupWireWrites=[],welcomeWireWrites=[],textWireDiagnostics=[];let lastTextDiagnostic=null;let closed=false,session,closePromise,mediaSession,projectedReader;
 // The synthetic identity key is generated in this browser realm and never returned through the lab control API.
 const signer={getPublicKey:async()=>{if(closed)throw Error('Browser actor closed');return pubkey;},signEvent:async template=>{if(closed)throw Error('Browser actor closed');return finalizeEvent(template,key);},nip44:{encrypt:async(other,text)=>{if(closed)throw Error('Browser actor closed');return nip44.v2.encrypt(text,nip44.v2.utils.getConversationKey(key,other));},decrypt:async(other,cipher)=>{if(closed)throw Error('Browser actor closed');return nip44.v2.decrypt(cipher,nip44.v2.utils.getConversationKey(key,other));}}};
 const rawNetwork=createRelayNetwork({relays:[relayURL],createSocket:url=>{const socket=new WebSocket(url),send=socket.send.bind(socket);socket.addEventListener('message',frame=>{try{const value=JSON.parse(String(frame.data));if(value[0]==='EVENT'&&value[2]?.kind===445){inboundDiagnostics.push({eventId:value[2].id,routing:value[2].tags.filter(tag=>tag[0]==='h').map(tag=>tag[1])});while(inboundDiagnostics.length>64)inboundDiagnostics.shift();}}catch{}});socket.send=(frame,...args)=>{try{const value=JSON.parse(frame);if(value[0]==='EVENT'&&value[1]?.kind===1059)welcomeWireWrites.push(value[1].id);}catch{}return send(frame,...args);};return socket;},verifyEvent,expectedAuthPubkey:pubkey,signAuth:(url,challenge)=>signer.signEvent({kind:22242,created_at:Math.floor(Date.now()/1000),content:'',tags:[['relay',url],['challenge',challenge]]})});
 const store=name=>{const value=durableStores?.[name]??new InMemoryKeyValueStore();stores.push(value);return Object.fromEntries(['getItem','setItem','removeItem','keys','clear'].filter(method=>typeof value[method]==='function').map(method=>[method,async(...args)=>{const token=crypto.randomUUID(),started=performance.now();storagePending.set(token,{store:name,method,started});try{return await value[method](...args);}finally{storagePending.delete(token);storageDiagnostics.push({store:name,method,ms:Math.round(performance.now()-started),at:Math.round(performance.now())});while(storageDiagnostics.length>80)storageDiagnostics.shift();}}]));};
 const rewindStore=store('rewindStore');
 const classifier=createSdkGroupPublicationClassifier({rewindStore,pubkey,isCurrent:()=>!closed,authorizeInvite:target=>!revokedInviteTargets.has(target)&&invitationCandidates.some(row=>row.pubkey===target)});
 let gatePromise=Promise.resolve(null);
 const openGate=(journal,selectedGroup,selectedMembership)=>openGroupPublicationGate({network:{...rawNetwork,publish:(...args)=>observedNetwork.publish(...args)},journal,binding:{accountId:'synthetic-browser:'+pubkey,pubkey,membershipId},classify:event=>classifier.classify(event),authorize:()=>!closed&&membershipId===selectedMembership&&activeGroup===selectedGroup,authorizeGroup:scope=>scope.groupId===selectedGroup.idStr&&classifier.canPublish(scope),authorizeTransport:event=>{const route=selectedGroup.snapshot.groupData?.nostrGroupId,hex=typeof route==='string'?route:route instanceof Uint8Array?Array.from(route,b=>b.toString(16).padStart(2,'0')).join(''):null;return (event.kind!==445||event.tags?.some(tag=>tag.length===2&&tag[0]==='h'&&tag[1]===hex))&&classifier.canSend(event)&&(!departurePermit||departurePermit())&&(event.kind!==445||!!departurePermit||departure?.getSnapshot().status!=='unconfirmed');},signal:lifetime.signal,verifyEvent});
 const observedNetwork={...rawNetwork,publish:async(urls,event,options)=>{const classified=await classifier.classify(event);if(event.kind===1059&&revokeAtWelcome){revokeAtWelcome=false;const target=event.tags.find(tag=>tag[0]==='p')?.[1];if(target)revokedInviteTargets.add(target);invitations?.recheck();}if(classified)groupWireWrites.push(event.id);const response=await rawNetwork.publish(urls,event,options);if(event.kind===445){textWireDiagnostics.push({eventId:event.id,eventBytes:new TextEncoder().encode(JSON.stringify(event)).byteLength,responses:Object.values(response).map(row=>({ok:row?.ok===true,uncertain:row?.uncertain===true,message:typeof row?.message==='string'?row.message.replace(/[0-9a-f]{64,}/gi,'[hex]').slice(0,200):null}))});while(textWireDiagnostics.length>8)textWireDiagnostics.shift();}if(classified&&loseNextGroupAck&&urls.some(url=>response[url]?.ok===true)){loseNextGroupAck=false;throw Error('Synthetic lab discarded an actual positive relay receipt');}return response;}};
 const network={...rawNetwork,publishWelcome:async(...args)=>{const gate=await gatePromise;if(!gate)throw Error('Durable trusted Welcome gate required');return gate.network.publishWelcome(...args);},publish:async(...args)=>{const gate=await gatePromise;return(gate?.network??rawNetwork).publish(...args);}};

 const historyJournal=durableStores?.historyStore?{...durableStores.historyStore,setItem:async(...args)=>{if(failSdkHistorySave){failSdkHistorySave=false;throw Error('Synthetic SDK history write failure');}return durableStores.historyStore.setItem(...args);}}:null;
 const historyFactory=durableStores?.historyStore?(groupBytes)=>{
  const groupId=Array.from(groupBytes,byte=>byte.toString(16).padStart(2,'0')).join('');let incarnation;
  const scoped=async()=>{
   const context=verifiedHistoryBindings.get(groupId);
   if(closed||!context||incarnation&&incarnation!==context)throw Error('Verified history membership unavailable');incarnation=context;
   let entry=historyStores.get(context);
   if(!entry){entry={context,store:null,ready:null};historyStores.set(context,entry);entry.ready=(fencedSdkHistory?openFencedSdkRumorStore:openScopedRumorStore)({...(fencedSdkHistory?{signal:lifetime.signal,verifyOriginal:id=>context.group.session.mediaSourceForRumor(id),exclusive:async(scope,operation,signal)=>{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(scope));return navigator.locks.request('crays.sdk-history:'+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join(''),{signal},operation);}}:{}),binding:context.binding,journal:historyJournal,authorize:()=>!closed&&verifiedHistoryBindings.get(groupId)===context&&context.group.status==='active'&&!context.group.closedSignal.aborted&&context.group.snapshot.members.includes(pubkey),authorizePurge:()=>!closed&&verifiedHistoryBindings.get(groupId)===context&&(context.group.status==='active'&&!context.group.closedSignal.aborted&&context.group.snapshot.members.includes(pubkey)||authorizedHistoryPurges.has(context.group)&&context.group.closedSignal.aborted),validateRumor:value=>deserializeApplicationData(new TextEncoder().encode(JSON.stringify(value)))}).then(store=>{entry.store=store;return store;});}
   const store=await entry.ready;if(closed||verifiedHistoryBindings.get(groupId)!==context)throw Error('History membership changed');return store;
  };
  const backend=new KeyValueRumorHistoryBackend(Object.fromEntries(['getItem','setItem','removeItem','keys','clear'].map(method=>[method,async(...args)=>{const store=await scoped();return store[method](...args);}])));
  let bounded;
  const queryBackend=async()=>{const store=await scoped();if(!bounded)bounded=createBoundedRumorHistoryBackend({store,backend,compileFilter,scopeKey:JSON.stringify(store.binding),isCurrent:()=>!closed&&verifiedHistoryBindings.get(groupId)===incarnation&&incarnation.group.status==='active'&&!incarnation.group.closedSignal.aborted&&incarnation.group.snapshot.members.includes(pubkey)});return bounded;};
  const history=createPagedSdkGroupHistory({GroupRumorHistory,backend:{addRumor:row=>backend.addRumor(row),removeRumor:id=>backend.removeRumor(id),clear:()=>backend.clear(),queryRumors:async filters=>(await queryBackend()).queryRumors(filters),queryPage:async options=>(await queryBackend()).queryPage(options)}});
  historyRecoveryPorts.set(groupId,async()=>{const store=await scoped(),context=verifiedHistoryBindings.get(groupId);const result=await recoverSdkHistory({readEvidence:()=>durableStores.ingestStateStore.getItem(groupId+'/delivered-payloads/v1'),decodeEvidence:bytes=>decodeDeliveredEvidence(bytes,context.group.session.historyTree),parseRumor:deserializeApplicationData,currentSource:id=>context.group.session.mediaSourceForRumor(id),history,store,isCurrent:()=>!closed&&verifiedHistoryBindings.get(groupId)===context&&context.group.status==='active'&&!context.group.closedSignal.aborted&&context.group.snapshot.members.includes(pubkey),signal:lifetime.signal});historyRecoveryResults.set(groupId,result);return result;});
  return history;
 }:undefined;
 const client=new MarmotClient({signer,network,historyFactory,clientId:pubkey,groupStateStore:store('groupStateStore'),keyPackageStore:store('keyPackageStore'),ingestStateStore:store('ingestStateStore'),inviteStore:store('inviteStore'),rewindStore,removedMarkerStore:store('removedMarkerStore')});
 async function retainGroupSession(group,currentMembership,groupKind,origin){
   const conversationId=groupKind==='circle'?'circle:'+group.idStr:'spot-pilot-group';
   if(durableStores?.historyStore){const previous=verifiedHistoryBindings.get(group.idStr);if(!previous||previous.group!==group||previous.binding.membershipId!==currentMembership){const context={group,binding:{kind:groupKind,accountId:'synthetic-browser:'+pubkey,conversationId,groupId:group.idStr,pubkey,membershipId:currentMembership}};verifiedHistoryBindings.set(group.idStr,context);group.on('ingestResult',result=>{ingestDiagnostics.push({groupId:group.idStr,kind:result.kind,at:Math.round(performance.now()),eventId:result.event?.id,reason:typeof result.reason==='string'?result.reason.slice(0,150):null,error:typeof result.error?.message==='string'?result.error.message.replace(/[0-9a-f]{64,}/gi,'[hex]').slice(0,150):null});while(ingestDiagnostics.length>64)ingestDiagnostics.shift();});group.on('historyError',()=>{historyErrors.push({groupId:group.idStr,membershipId:currentMembership});while(historyErrors.length>20)historyErrors.shift();});}}

   if(durableStores?.historyStore){const recover=historyRecoveryPorts.get(group.idStr);if(!recover)throw Error('Actual SDK history recovery port unavailable');await recover();}
   let retained=retainedSessions.get(group.idStr);
   if(retained&&(retained.membershipId!==currentMembership||retained.group!==group)){
    // Drain the former incarnation before invalidating its journal. Ordinary view
    // selection never destroys the independent background receive/history session.
    await retained.session.flush();retained.draft?.close();retained.session.close();retained.journal?.close();retainedSessions.delete(group.idStr);retained=null;
   }
   if(!retained){
    if(retainedSessions.size>=64)throw Error('Bounded background conversation window exceeded');
    const entry={group,membershipId:currentMembership,journal:null,session:null};retainedSessions.set(group.idStr,entry);
    const receiveCurrent=()=>!closed&&retainedSessions.get(group.idStr)===entry&&!group.closedSignal?.aborted&&group.snapshot.members.includes(pubkey);
    try{
     entry.journal=durableStores?createMembershipJournal({journal:durableStores.conversationStore,groupId:group.idStr,membershipId:currentMembership,origin,isCurrent:receiveCurrent}):null;
     entry.session=await (durableStores?openPersistedConversationSession:createConversationSession)({journal:entry.journal,binding:{kind:groupKind,accountId:'synthetic-browser:'+pubkey,conversationId,groupId:group.idStr,pubkey,membershipId:currentMembership},authorize:receiveCurrent,client,group,decode:deserializeApplicationData,supportsReplies:true,resolveHistoryReply:(id,proof)=>group.history?resolveSdkHistoryReply({id,binding:verifiedHistoryBindings.get(group.idStr)?.binding,history:group.history,sourceFor:id=>group.session.mediaSourceForRumor(id),readMediaJournal:()=>entry.journal?.getItem('media:'+conversationId),isCurrent:receiveCurrent,ownTextConfirmed:proof?.ownTextConfirmed===true}):null,makeIntent:options=>{const rumor=createChatRumor({...options,tags:[['crays-request',crypto.randomUUID()],...(options.replyTo?[['e',options.replyTo]]:[])]});return{messageId:rumor.id,createdAt:rumor.created_at,replyTo:options.replyTo??null,intent:createApplicationMessageIntent(rumor)};}});
     if(durableStores)entry.openDraft=()=>openConversationDraft({binding:{kind:groupKind,accountId:'synthetic-browser:'+pubkey,conversationId,groupId:group.idStr,pubkey,membershipId:currentMembership},journal:{getItem:key=>entry.journal.getItem(key),setItem:async(key,value)=>{if(failDraftSave){failDraftSave=false;throw Error('Synthetic storage-write failure');}return entry.journal.setItem(key,value);}},authorize:receiveCurrent,signal:lifetime.signal,exclusive:async(scope,operation,signal)=>{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(scope));const name='crays.composer:'+Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');return navigator.locks.request(name,{signal},operation);}});
     if(durableStores)entry.draft=await entry.openDraft();
     if(!receiveCurrent())throw Error('Background conversation membership no longer current');retained=entry;
    }catch(error){entry.draft?.close();entry.session?.close();entry.journal?.close();if(retainedSessions.get(group.idStr)===entry)retainedSessions.delete(group.idStr);throw error;}
   }
   return retained;
 }
 function openGroup(...args){const work=groupSwitch.then(()=>openGroupNow(...args));groupSwitch=work.catch(()=>{});return work;}
 async function openGroupNow(group,selfUpdate,nextMembershipId=membershipId,groupKind='spot',origin='welcome'){
   if(closed)throw Error('Browser actor closed');
   const drained=await Promise.allSettled([session?.flush(),mediaSession?.flush()]);
   groupControl?.close();invitations?.close();departure?.close();projectedReader?.close();await projectedReader?.flushLocalView?.();currentReader?.close();mediaSession?.close();groupSubscription?.unsubscribe();(await gatePromise)?.close();
   if(drained.some(row=>row.status==='rejected'))throw Error('Previous membership persistence needs recovery');
   membershipId=nextMembershipId;const currentMembership=membershipId;projectedReader=null;mediaSession=null;

   const conversationId=groupKind==='circle'?'circle:'+group.idStr:'spot-pilot-group';
   const retained=await retainGroupSession(group,currentMembership,groupKind,origin);
   membershipJournal=retained.journal;
   classifier.register(group);activeGroup=group;gatePromise=membershipJournal?openGate(membershipJournal,group,currentMembership):Promise.resolve(null);await gatePromise;
   const conversationJournal=membershipJournal,openedSession=retained.session;
   if(closed)throw Error('Browser actor closed');session=openedSession;const localSession=openedSession;let current,readerClosed=false;const listeners=new Set();
   const readerCurrent=()=>!readerClosed&&!closed&&membershipId===currentMembership&&!group.closedSignal?.aborted;
   const requireReader=()=>{if(!readerCurrent())throw Error('Previous conversation membership is no longer available');};
   const read=()=>{const value=localSession.getSnapshot(),available=readerCurrent()&&value.available;return{state:available?'ready':'unavailable',available,supportsReplies:value.supportsReplies===true,messages:available?value.messages:[],sending:available&&value.messages.some(m=>m.status==='sending'),problem:value.persistenceWarning?'Some messages could not be saved. Keep this conversation open and try again.':historyStores.get(verifiedHistoryBindings.get(group.idStr))?.store?.getProblem()?'Message history could not be saved. Keep this conversation open and try again.':null,hasEarlierMessages:value.hasEarlierMessages};};current=read();
   const update=()=>{if(readerClosed)return;current=read();for(const listener of listeners)listener();};const unsubscribe=localSession.subscribe(update);const memberChanged=()=>update();group.on('removed',memberChanged);group.on('updated',memberChanged);
   const reader={getSnapshot:()=>current,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},refresh:async()=>{requireReader();if(durableStores?.historyStore)await historyRecoveryPorts.get(group.idStr)();if(readerCurrent())update();},prepareAttempt:async()=>{requireReader();return{requestId:crypto.randomUUID()};},acknowledgeAttempt:async()=>{requireReader();return true;},send:async value=>{requireReader();lastTextDiagnostic={codeUnits:value.text.length,utf8Bytes:new TextEncoder().encode(value.text).byteLength,replySelected:!!value.replyTo,status:'started'};try{const result=await localSession.send(value);lastTextDiagnostic={...lastTextDiagnostic,status:result.status,eventIds:result.eventIds||[]};if(readerCurrent())update();return result;}catch(error){lastTextDiagnostic={...lastTextDiagnostic,status:'failed',error:String(error?.message||error).replace(/[0-9a-f]{64,}/gi,'[hex]').slice(0,300)};throw error;}},close:()=>{if(readerClosed)return;readerClosed=true;unsubscribe();group.off('historyError',update);group.off('removed',memberChanged);group.off('updated',memberChanged);current=Object.freeze({state:'closed',available:false,messages:[],sending:false,problem:null});for(const fn of listeners)fn();listeners.clear();}};group.on('historyError',update);currentReader=reader;

   if(mediaBaseURL){if(!durableStores||!/^http:\/\/127\.0\.0\.1:\d+\/$/.test(mediaBaseURL))throw Error('Explicit isolated media destination required');mediaSession=await openPrivateMediaSession({binding:{kind:groupKind,accountId:'synthetic-browser:'+pubkey,conversationId,groupId:group.idStr,pubkey,membershipId},authorize:()=>!closed,client,group,journal:conversationJournal,decode:deserializeApplicationData,transport:createPrivateBlobTransport({baseUrls:[mediaBaseURL],pubkey,signer,isAuthorized:()=>!closed,allowLoopback:true})});if(closed){mediaSession.close();throw Error('Browser actor closed');}projectedReader=createMediaConversationClient({text:reader,media:mediaSession});}
   if(durableStores?.historyStore){
    const parent=projectedReader||reader;
    projectedReader=await openPagedConversationClient({client:parent,isCurrent:readerCurrent,signal:lifetime.signal,queryPage:async options=>{requireReader();const page=await group.history.queryPage({filter:{kinds:[9]},...options});requireReader();if(mediaSession)await mediaSession.adoptHistory(page.messages);requireReader();return page;},decodeRow:rumor=>({id:rumor.id,text:rumor.content,author:rumor.pubkey,status:rumor.pubkey===pubkey?'unconfirmed':'received',createdAt:rumor.created_at,observedAt:rumor.created_at*1000,...(replyToFromTags(rumor.tags)?{replyTo:replyToFromTags(rumor.tags)}:{})})});
   }
   if(durableStores){
    if(!globalThis.navigator?.locks?.request)throw Error('An exclusive encrypted local-view journal is required');
    projectedReader=await openConversationLocalView({binding:{kind:groupKind,accountId:'synthetic-browser:'+pubkey,conversationId,groupId:group.idStr,pubkey,membershipId:currentMembership},client:projectedReader||reader,journal:conversationJournal,authorize:readerCurrent,signal:lifetime.signal,exclusive:async(scope,operation,signal)=>{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(scope));const name='crays.local-view:'+Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');return navigator.locks.request(name,{signal},operation);}});
   }
   if(durableStores){const openedControl=await openPrivateGroupController({binding:{kind:groupKind,accountId:'synthetic-browser:'+pubkey,conversationId,groupId:group.idStr,pubkey,membershipId},group,client,journal:conversationJournal,authorize:()=>!closed,signal:lifetime.signal,recovery:{retry:async(entry,{signal})=>classifier.retryOriginal({group,entry,gate:await gatePromise,signal})},proposals:{admins:adminPubkeys=>Proposals.proposeUpdateMetadata({adminPubkeys}),rename:name=>Proposals.proposeUpdateMetadata({name}),remove:value=>Proposals.proposeRemoveUser(value)}});if(closed){openedControl.close();throw Error('Browser actor closed');}groupControl=openedControl;}
   if(durableStores){const inviteController=await openPrivateGroupInvitations({binding:{kind:groupKind,accountId:'synthetic-browser:'+pubkey,conversationId,groupId:group.idStr,pubkey,membershipId},group,journal:conversationJournal,signal:lifetime.signal,authorize:(_binding,action,target)=>!closed&&(action!=='invite'||!revokedInviteTargets.has(target)&&invitationCandidates.some(row=>row.pubkey===target)),candidates:()=>invitationCandidates,resolvePackage:async target=>{const rows=await network.request([relayURL],{kinds:[30443],authors:[target]});const event=rows.sort((a,b)=>b.created_at-a.created_at)[0];if(!event)throw Error('Current invitee package unavailable');return event;},makeIntent:(event,actorPubkey)=>createInviteIntent({keyPackageEvent:event,actorPubkey,verifyEvent}),send:async intent=>(await client.groups.send(group.id,intent))[0]});invitations=Object.freeze({...inviteController,prepare:async(...args)=>{try{return await inviteController.prepare(...args);}catch(error){invitationFailure=String(error?.message||error).replace(/[0-9a-f]{64,}/gi,'[hex]').slice(0,500);throw error;}}});}
   if(durableStores){departure=await openPrivateGroupDeparture({binding:{kind:groupKind,accountId:'synthetic-browser:'+pubkey,conversationId,groupId:group.idStr,pubkey,membershipId},group,journal:conversationJournal,signal:lifetime.signal,authorize:()=>!closed,send:async({isCurrent})=>{if(departurePermit)throw Error('Departure already running');if(!isCurrent())throw Error('Departure is no longer admitted');departurePermit=isCurrent;authorizedHistoryPurges.add(group);try{return await client.groups.leave(group.id);}catch(error){departureFailure=String(error?.message||error).replace(/[0-9a-f]{64,}/gi,'[hex]').slice(0,500);throw error;}finally{authorizedHistoryPurges.delete(group);departurePermit=null;}}});}
   groupSubscription=client.groups.connectAll();if(selfUpdate)await group.selfUpdate();if(closed)throw Error('Browser actor closed');if(durableStores)await durableStores.conversationStore.setItem('selected-group',{pubkey,groupId:group.idStr,membershipId:currentMembership});onReader({draft:retained.draft,reader:projectedReader||reader,media:mediaSession,group:groupControl,invitations,departure,pubkey,groupId:group.idStr,kind:groupKind,conversationId,membershipId:currentMembership,name:group.snapshot.groupData.name});return{groupId:group.idStr,pubkey,membershipId};
 }
 function resumeGroup(selectedId){const work=groupSwitch.then(()=>resumeGroupNow(selectedId));groupSwitch=work.catch(()=>{});return work;}
 async function resumeGroupNow(selectedId){
  if(closed||!durableStores)throw Error('Durable selected conversation required');
  const ids=(await client.groups.listIds()).map(id=>Array.from(id,b=>b.toString(16).padStart(2,'0')).join('')),selected=await durableStores.conversationStore.getItem('selected-group');
  const id=selectedId??(selected?.pubkey===pubkey?selected.groupId:ids.length===1?ids[0]:null);
  if(typeof id!=='string'||!ids.includes(id))throw Error('Exact selected persisted group required');
  const group=await client.groups.get(id),row=readVerifiedMembershipContext(await durableStores.conversationStore.getItem('verified-membership:'+group.idStr),{groupId:group.idStr,pubkey});
  if(group.closedSignal.aborted||!group.snapshot.members.includes(pubkey))throw Error('Verified current membership incarnation unavailable');
  // Restore only independently verified memberships before the SDK starts
  // ingesting all persisted groups. Selection is not an inbox admission grant.
  for(const otherId of ids){
   if(otherId===id)continue;
   const other=await client.groups.get(otherId);
   if(other.closedSignal.aborted||!other.snapshot.members.includes(pubkey))continue;
   const stored=await durableStores.conversationStore.getItem('verified-membership:'+otherId);
   if(!stored)continue;
   const verified=readVerifiedMembershipContext(stored,{groupId:otherId,pubkey});
   await retainGroupSession(other,verified.membershipId,verified.kind,verified.origin);
  }
  return openGroupNow(group,false,row.membershipId,row.kind,row.origin);
 }

 return {
  pubkey,
  failNextSdkHistorySave(){if(closed||!durableStores)throw Error('Isolated durable actor required');failSdkHistorySave=true;},
  failNextDraftSave(){if(closed||!durableStores)throw Error('Isolated durable actor required');failDraftSave=true;},
  async openCompetingDraft(){const row=retainedSessions.get(activeGroup?.idStr);if(closed||!row?.openDraft)throw Error('Current isolated durable draft required');return row.openDraft();},
  async creationController(){if(closed||!durableStores)throw Error('Durable current creation scope required');if(creationControl)return creationControl;creationControl=await openPrivateGroupCreation({binding:{kind:'circle',accountId:'synthetic-browser:'+pubkey,pubkey,contextId:'original-private-create',relays:[relayURL]},journal:durableStores.conversationStore,signal:lifetime.signal,authorize:()=>!closed,create:async({name,relays,isCurrent})=>{if(!isCurrent())throw Error('Creation revoked');if(mediaBaseURL&&(!durableStores||!/^http:\/\/127\.0\.0\.1:\d+\/$/.test(mediaBaseURL)))throw Error('Explicit isolated media destination required');const group=await client.groups.create(name,{relays,...(mediaBaseURL?{encryptedMedia:encryptedMediaBlossomDefaultV2([mediaBaseURL])}:{})});const founded=await founderMembership(group,pubkey);await durableStores.conversationStore.setItem('verified-membership:'+group.idStr,verifiedMembershipContext({groupId:group.idStr,pubkey,context:{kind:'circle'},...founded}));return group;}});return creationControl;},
  async openCreatedGroup(id){if(closed||!creationControl||creationControl.getSnapshot().groupId!==id||creationControl.getSnapshot().status!=='created')throw Error('Actual original group creation required');return resumeGroup(id);},
  async selectGroup(id){return resumeGroup(id);},
  async createdGroupView(id){if(closed||!/^[a-f0-9]{64}$/.test(id))throw Error('Exact created group required');const group=await client.groups.get(id);return{id:group.idStr,name:group.snapshot.groupData.name,members:[...group.snapshot.members],admins:[...group.snapshot.groupData.adminPubkeys],closed:group.closedSignal.aborted,routing:typeof group.snapshot.groupData.nostrGroupId==='string'?group.snapshot.groupData.nostrGroupId:Array.from(group.snapshot.groupData.nostrGroupId,b=>b.toString(16).padStart(2,'0')).join('')};},
  groupView:()=>groupControl?.getSnapshot(),
  invitationView:()=>({view:invitations?.getSnapshot(),failure:invitationFailure}),
  membershipView:()=>({groupId:activeGroup?.idStr,membershipId}),
  async groupHistory(groupId){if(closed||!verifiedHistoryBindings.has(groupId))throw Error('Verified history required');const group=await client.groups.get(groupId);if(!group.history)throw Error('Durable SDK history unavailable');return group.history.queryRumors({kinds:[9],limit:50});},
  async groupHistoryPage(groupId,options){if(closed||!verifiedHistoryBindings.has(groupId))throw Error('Verified history required');const group=await client.groups.get(groupId);if(!group.history?.queryPage)throw Error('Paged SDK history unavailable');return group.history.queryPage(options);},
  async withdrawStoredOriginal(id){if(!fencedSdkHistory||closed||!activeGroup?.history)throw Error('Explicit fenced SDK lab required');await activeGroup.history.removeMessage(id);},
  async clearStoredHistory(){if(!fencedSdkHistory||closed||!activeGroup?.history)throw Error('Explicit fenced SDK lab required');await activeGroup.history.purgeMessages();},
  historyFenceView(){if(!fencedSdkHistory||closed||!activeGroup)throw Error('Explicit fenced SDK lab required');const store=historyStores.get(verifiedHistoryBindings.get(activeGroup.idStr))?.store;return{snapshot:store?.visibility?.getSnapshot(),problem:store?.getProblem()??null};},
  async historyStorageCensus(){
   if(!fencedSdkHistory||closed||!activeGroup||!durableStores?.historyStore)throw Error('Explicit fenced SDK lab required');
   const context=verifiedHistoryBindings.get(activeGroup.idStr);if(!context)throw Error('Exact original history context required');
   const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(context.binding))),hash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
   const keys=await durableStores.historyStore.keys(),prefix='sdk-history-fence:'+hash+':';
   return{raw:keys.filter(key=>key.startsWith('rumor-history:'+hash+':')).length,captures:keys.filter(key=>key.startsWith(prefix+'capture:')).length,retired:keys.filter(key=>key.startsWith(prefix+'retired:')).length,clearIntent:keys.includes(prefix+'clear-intent')};
  },
  async recoverHistory(groupId){if(closed||!verifiedHistoryBindings.has(groupId))throw Error('Verified history required');return historyRecoveryPorts.get(groupId)();},
  historyRecoveryView:()=>Object.fromEntries(historyRecoveryResults),
  historyProblems:()=>[...historyErrors],
  historyTransportDiagnostic:()=>({inbound:[...inboundDiagnostics],ingest:[...ingestDiagnostics],storage:[...storageDiagnostics],pending:[...storagePending.values()].map(row=>({store:row.store,method:row.method,ms:Math.round(performance.now()-row.started)}))}),
  async dropMediaSummaryForReload(id){if(closed||!durableStores||!mediaSession||!/^[a-f0-9]{64}$/.test(id))throw Error('Isolated admitted media cache required');const context=verifiedHistoryBindings.get(activeGroup.idStr);if(!context)throw Error('Verified original media cache required');const key='media:'+context.binding.conversationId;const value=await membershipJournal.getItem(key);if(!value||value.binding.groupId!==activeGroup.idStr)throw Error('Original media cache scope required');const before=value.rows.length;await membershipJournal.setItem(key,{...value,rows:value.rows.filter(row=>row.id!==id)});return{before,after:before-1};},
  mediaOriginalView:id=>{const row=mediaSession?.getSnapshot().rows.find(row=>row.id===id);return row?{exists:true,status:row.status,fromHistory:row.fromHistory===true,sourceProven:!!row.sourceParent}:{exists:false};},
  retainedHasMessage:(groupId,id)=>retainedSessions.get(groupId)?.session?.getSnapshot().messages.some(row=>row.id===id)??false,
  retainedMessageCount:groupId=>retainedSessions.get(groupId)?.session?.getSnapshot().messages.length??0,
  departureView:()=>({view:departure?.getSnapshot(),failure:departureFailure,closed:activeGroup?.closedSignal.aborted,groupStatus:activeGroup?.status}),
  loseNextGroupCommitAck(){if(!durableStores||closed)throw Error('Durable isolated actor required');loseNextGroupAck=true;},
  groupPublicationWrites:()=>[...groupWireWrites],
  textDiagnostics:()=>({last:lastTextDiagnostic,wire:textWireDiagnostics.slice(-4)}),
  revokeInvitationAtNextWelcome(){if(closed)throw Error('Actor closed');revokeAtWelcome=true;},
  welcomePublicationWrites:()=>[...welcomeWireWrites],
  async prepare(){for(const template of[createNip65RelayListEvent({pubkey,relays:[relayURL]}),createInboxRelayListEvent({pubkey,relays:[relayURL]})]){const event=await signer.signEvent(template),result=await network.publish([relayURL],event);if(!result[relayURL].ok)throw Error('Browser metadata not admitted');}subscriptions.push(await client.invites.listen([relayURL]));await client.keyPackages.create({relays:[relayURL],client:'crays-browser-crypto-lab'});},
  async inviteCount(){return (await client.invites.getUnread()).length;},
  async join(context){if(!['spot','circle'].includes(context?.kind)||(context.kind==='spot'&&context.conversationId!=='spot-pilot-group'))throw Error('Explicit admitted invitation context required');const invite=(await client.invites.getUnread())[0];if(!invite)throw Error('Browser Welcome not available');const {group}=await client.joinGroupFromWelcome({welcomeRumor:invite});const row=verifiedMembershipContext({groupId:group.idStr,pubkey,context,origin:'welcome',membershipId:invite.id});if(durableStores)await durableStores.conversationStore.setItem('verified-membership:'+group.idStr,row);await client.invites.markAsRead(invite.id);return openGroup(group,true,row.membershipId,row.kind,row.origin);},
  async resume(){return resumeGroup();},
  async flush(){await Promise.all([...retainedSessions.values()].map(async row=>{await row.session?.flush();await row.draft?.flush();}));await mediaSession?.flush();await projectedReader?.flushLocalView?.();for(const entry of historyStores.values()){const store=await entry.ready;if(verifiedHistoryBindings.get(entry.context.group.idStr)===entry.context&&entry.context.group.status==='active')await store.flush();}},
  close(){if(closePromise)return closePromise;closed=true;lifetime.abort();creationControl?.close();groupControl?.close();invitations?.close();departure?.close();closePromise=(async()=>{const errors=[];const finish=async fn=>{try{await fn();}catch(error){errors.push(error);}};try{await finish(async()=>{(await gatePromise)?.close();classifier.close();});await finish(()=>groupSubscription?.unsubscribe());await finish(()=>mediaSession?.flush());await finish(()=>projectedReader?.flushLocalView?.());await finish(()=>projectedReader?.close());await finish(()=>currentReader?.close());for(const retained of retainedSessions.values()){retained.draft?.close();await finish(()=>retained.session?.flush());await finish(()=>retained.session?.close());retained.journal?.close();}retainedSessions.clear();for(const subscription of subscriptions)await finish(()=>subscription.unsubscribe());await finish(()=>network.close());await finish(async()=>{for(const id of await client.groups.listIds())await finish(()=>client.groups.unload(id));});for(const entry of historyStores.values()){await finish(async()=>{const store=await entry.ready;store.close();});}historyStores.clear();verifiedHistoryBindings.clear();for(const value of stores)await finish(()=>durableStores?value.close():value.clear());if(durableStores?.conversationStore)await finish(()=>durableStores.conversationStore.close());if(durableStores?.historyStore)await finish(()=>durableStores.historyStore.close());}finally{key.fill(0);}if(errors.length)throw new AggregateError(errors,'Browser actor cleanup failed');})();return closePromise;},
 };
}
