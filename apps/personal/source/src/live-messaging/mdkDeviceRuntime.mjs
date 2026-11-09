import {verifyEvent} from 'nostr-tools/pure';
import {openMdkRuntimePublication} from './mdkRuntimePublication.mjs';
const format='crays-original-mdk-current-v1',failure=()=>Error('The private group connection is unavailable');
const hex=bytes=>{if(!Array.isArray(bytes)||!bytes.length||bytes.length>64||bytes.some(v=>!Number.isInteger(v)||v<0||v>255))throw failure();return bytes.map(v=>v.toString(16).padStart(2,'0')).join('');};
const endpoints=value=>{if(!Array.isArray(value)||!value.length||value.length>20||new Set(value).size!==value.length||value.some(url=>typeof url!=='string'||url.length>2048||!/^wss?:\/\//.test(url)))throw failure();return value;};
/** Normal original AccountDeviceRuntime host, using the existing admitted
 * non-exporting account and private relay network. The original Rust runtime
 * owns durable fanouts and MLS decisions. Subscription EOSE/actual receipts,
 * not a timer or local row, establish transport state. No legacy fallback.
 */
export async function openMdkDeviceRuntime({account,runtime,network,inboxes,isCurrent,authorize,onFailure=()=>{}}){
 if(runtime?.storageFormat!==format||runtime.accountPubkey!==account?.identity?.pubkey||typeof runtime.checkpointDuringOperation!=='function'||typeof isCurrent!=='function'||typeof authorize!=='function'||['publish','request','subscription'].some(k=>typeof network?.[k]!=='function')||!account?.signal?.addEventListener)throw failure();
 const pubkey=account.identity.pubkey;let closed=false,active=false,device,bridge,closeTask,processing=false,flushTimer,publicationObserver,publicationGuard;
 const subscriptionGroups=new Map();const listeners=new Set(),seen=new Set(),incoming=[],timers=new Map(),schedules=new Map();let subscriptions=[],inboxPlans=[];
 const check=()=>{if(closed||account.signal.aborted||isCurrent()!==true)throw failure();};
 const allowed=(operation,payload)=>{check();if(authorize(operation,payload)!==true)throw failure();};
 const notify=kind=>{for(const listener of listeners)try{listener(Object.freeze({kind}));}catch{}};
 const close=()=>{
  if(closeTask)return closeTask;closed=true;active=false;account.signal.removeEventListener('abort',close);clearTimeout(flushTimer);
  for(const timer of timers.values())clearTimeout(timer);timers.clear();schedules.clear();for(const sub of subscriptions)sub.unsubscribe();subscriptions=[];subscriptionGroups.clear();incoming.length=0;seen.clear();
  try{bridge?.close();}catch{}notify('closed');listeners.clear();closeTask=runtime.close();return closeTask;
 };
 account.signal.addEventListener('abort',close,{once:true});
 const publisher=openMdkRuntimePublication({account,network,isCurrent:()=>!closed&&isCurrent()===true,checkpoint:()=>runtime.checkpointDuringOperation(),authorize:request=>{try{allowed('publish',request);publicationGuard?.();return true;}catch{return false;}}});
 const queueEvent=(plan,event)=>{
  try{allowed('receive',{groupId:plan.group,endpoint:plan.endpoint});if(!verifyEvent(event))throw failure();
   const id=(plan.group??'inbox')+':'+event.id;if(seen.has(id))return;if(incoming.length>=256)throw failure();seen.add(id);if(seen.size>4096)seen.delete(seen.values().next().value);
   incoming.push({plan,event});if(!flushTimer)flushTimer=setTimeout(()=>{flushTimer=null;void flush().catch(()=>close());},0);
  }catch{void close();}
 };
 function plans(value,withInbox){
  if(hex(value?.account_id)!==pubkey||!Array.isArray(value.group_subscriptions)||value.group_subscriptions.length>100||value.since!=null&&(!Number.isSafeInteger(value.since)||value.since<0))throw failure();
  const result=[];
  if(withInbox)for(const endpoint of endpoints(value.inbox_endpoints))result.push({group:null,endpoint,filters:{kinds:[1059],'#p':[pubkey],...(value.since!=null?{since:value.since}:{})}});
  for(const route of value.group_subscriptions){
   const group=hex(route.group_id),routing=hex(route.transport_group_id);if(route.retained_since!=null&&(!Number.isSafeInteger(route.retained_since)||route.retained_since<0))throw failure();
   const since=route.retained_since==null?value.since:Math.min(route.retained_since,value.since??route.retained_since);
   for(const endpoint of endpoints(route.endpoints))result.push({group,endpoint,filters:{kinds:[445],'#h':[routing],...(since!=null?{since}:{})}});
  }
  if(new Set(result.map(p=>JSON.stringify([p.group,p.endpoint,p.filters]))).size!==result.length)throw failure();return result;
 }
 async function install(next){
  const replacements=[];let cursor=0,failed;
  // Independent relay reads are bounded; each plan still needs its own actual
  // EOSE result and fresh permission before a live subscription is installed.
  async function worker(){while(!failed){const plan=next[cursor++];if(!plan)return;
   try{allowed('subscribe',plan);const events=await network.request([plan.endpoint],plan.filters,account.signal);allowed('subscribe',plan);if(!Array.isArray(events))throw failure();for(const event of events)queueEvent(plan,event);
    allowed('subscribe',plan);const sub=network.subscription([plan.endpoint],plan.filters).subscribe({next:event=>queueEvent(plan,event),error:()=>{if(!closed)notify('offline');}});
    try{allowed('subscribe',plan);}catch(error){sub.unsubscribe();throw error;}replacements.push(sub);subscriptionGroups.set(sub,plan.group);
   }catch(error){failed??=error;}
  }}
  try{
   await Promise.all(Array.from({length:Math.min(4,next.length)},()=>worker()));if(failed)throw failed;
   check();for(const sub of subscriptions){sub.unsubscribe();subscriptionGroups.delete(sub);}subscriptions=replacements;
  }catch(error){for(const sub of replacements){sub.unsubscribe();subscriptionGroups.delete(sub);}throw error;}
 }
 async function perform(request){
  if(!request||!Number.isSafeInteger(request.id)||request.id<1)throw failure();const {operation,payload}=request;allowed(operation,payload);
  if(operation==='publish')return publisher.publish(payload,{beforePublication:publicationObserver});
  if(operation==='publishKeyPackage'){
   if(hex(payload?.account_id)!==pubkey||!verifyEvent(payload.event)||payload.event.pubkey!==pubkey||payload.event.kind!==30443||payload.event.content.length>87380)throw failure();
   const targets=endpoints(payload.endpoints);await runtime.checkpointDuringOperation();check();const accepted=[],failed=[];
   for(const endpoint of targets){allowed(operation,payload);const replies=await network.publish([endpoint],payload.event,{signal:account.signal,beforeSend:()=>{try{allowed(operation,payload);return true;}catch{return false;}}});check();const reply=replies?.[endpoint];
    if(!reply||typeof reply.ok!=='boolean'||reply.uncertain===true)throw failure();if(reply.ok)accepted.push(endpoint);else failed.push(endpoint);
   }return{accepted,failed};
  }
  if(operation==='activate'){const next=plans(payload,true);await install(next);inboxPlans=next.filter(p=>p.group===null);active=true;return true;}
  if(operation==='syncGroups'){if(!active)throw failure();await install([...inboxPlans,...plans(payload,false)]);return true;}
  if(operation==='deactivate'){if(hex(payload)!==pubkey)throw failure();for(const sub of subscriptions)sub.unsubscribe();subscriptions=[];inboxPlans=[];active=false;return true;}
  throw failure(); // No simulated transport activation or receive success.
 }
 async function execute(work,phase='runtime',observer,guard){
  check();let result;try{result=await runtime.run(async()=>{
   const previousObserver=publicationObserver,previousGuard=publicationGuard;publicationObserver=observer;publicationGuard=guard;
   try{let done=false,result,error;const operation=Promise.resolve().then(work);
   void operation.then(value=>{result=value;done=true;},reason=>{error=reason;done=true;});
   while(!done){check();const requests=JSON.parse(bridge.drain());if(!Array.isArray(requests)||requests.length>8)throw failure();
    await Promise.all(requests.map(async request=>{try{const value=await perform(request);check();bridge.resolve(request.id,JSON.stringify(value),false);}catch{bridge.resolve(request.id,'null',true);}}));
    if(!done)await new Promise(resolve=>setTimeout(resolve,4));
   }if(error)throw error;return result;
   }finally{publicationObserver=previousObserver;publicationGuard=previousGuard;}
  });}catch(error){try{onFailure(Object.freeze({phase,code:'original-runtime-failed'}));}catch{}throw error;}check();return result;
 }
 const parse=value=>{if(typeof value!=='string'||value.length>2*1024*1024)throw failure();return JSON.parse(value);};
 async function schedule(group){
  const generation=Symbol();schedules.set(group,generation);
  clearTimeout(timers.get(group));timers.delete(group);check();allowed('read',{groupId:group});
  const state=parse(await execute(()=>device.group_summary(group),'group-schedule-state'));if(schedules.get(group)!==generation)return;if(state.terminal){for(let i=incoming.length-1;i>=0;i--)if(incoming[i].plan.group===group)incoming.splice(i,1);for(const sub of subscriptions.filter(sub=>subscriptionGroups.get(sub)===group)){sub.unsubscribe();subscriptionGroups.delete(sub);}subscriptions=subscriptions.filter(sub=>subscriptionGroups.has(sub));return;}const originalDelay=await execute(()=>device.retry_delay_ms(group),'group-schedule');check();if(schedules.get(group)!==generation)return;
  const delay=typeof originalDelay==='bigint'?Number(originalDelay):originalDelay;
  if(delay==null)return;if(!Number.isSafeInteger(delay)||delay<0)throw failure();
  timers.set(group,setTimeout(()=>{timers.delete(group);void reconcile(group).catch(()=>{if(!closed)notify('offline');});},Math.min(2147483647,Math.max(1,delay))));
 }
 async function reconcile(group,{beforePublication}={}){allowed('read',{groupId:group});const result=parse(await execute(()=>device.reconcile_group(group),'group-reconcile',beforePublication));await runtime.recordControlEffects?.(group,result);check();if(result.timelineChange!=='none')notify('withdrawal');else if(result.publishedAppMessages?.length)notify('append');await schedule(group);return result;}
 async function flush(){
  if(processing||closed)return;processing=true;
  try{while(incoming.length){const {plan,event}=incoming.shift();allowed('receive',{groupId:plan.group,endpoint:plan.endpoint});const result=parse(await execute(()=>device.ingest_event(plan.group??undefined,JSON.stringify(event),plan.endpoint),'subscription-ingest'));if(plan.group)await runtime.recordControlEffects?.(plan.group,result);check();if(result.timelineChange!=='none')notify('withdrawal');if(plan.group)await schedule(plan.group);}}
  finally{processing=false;}
 }
 try{
  allowed('open',{inboxes});device=await runtime.run(raw=>raw.take_device_runtime(JSON.stringify(inboxes)));check();bridge=device.transport_bridge();
  return Object.freeze({storageFormat:format,accountPubkey:pubkey,
      verifyInvitationCommit(groupId,transportId,expectedParent,keyPackage){
    allowed('read',{groupId});const verified=runtime.invitationCommitMatches?.(groupId,transportId,expectedParent,keyPackage)===true;check();return verified;
   },
   invitationPublicationIds(groupId,expectedParent,keyPackage){
    allowed('read',{groupId});const result=runtime.invitationPublicationIds?.(groupId,expectedParent,keyPackage)??null;check();return result;
   },
   welcomeDeliveryConfirmed(groupId,transportId,recipient){
    allowed('read',{groupId});const confirmed=runtime.welcomeDeliveryConfirmed?.(groupId,transportId,recipient)===true;check();return confirmed;
   },
   async managementDeliveryConfirmed(groupId,transportId){
    allowed('read',{groupId});const confirmed=await runtime.managementDeliveryConfirmed?.(groupId,transportId);allowed('read',{groupId});return confirmed===true;
   },
   managementPublicationId(groupId,expectedParent,actionJson){
    allowed('read',{groupId});const id=runtime.managementPublicationId?.(groupId,expectedParent,actionJson)??null;check();return id;
   },
   async publishInvitationKey(slot){if(typeof slot!=='string'||!/^[a-f0-9]{64}$/.test(slot))throw failure();allowed('publish-invitation-key',null);await execute(()=>device.publish_invitation_key(slot),'publish-invitation-key');check();},
   async activate(){allowed('activate',null);await execute(()=>device.activate(),'activate');check();},
   async setInboxRoute(pubkey,targets){if(typeof pubkey!=='string'||!/^[a-f0-9]{64}$/.test(pubkey)||pubkey===account.identity.pubkey)throw failure();const serialized=JSON.stringify(endpoints(targets)),guard=()=>allowed('route-inbox',{pubkey,endpoints:JSON.parse(serialized)});guard();const accepted=await execute(()=>{guard();return device.set_inbox_route(pubkey,serialized);},'recipient-route');guard();if(accepted!==true)throw failure();},
   async findGroupByRouting(routingId){if(typeof routingId!=='string'||!/^[a-f0-9]{64}$/.test(routingId))throw failure();const guard=()=>allowed('create-reconcile',{routingId});guard();const value=await execute(()=>{guard();return device.find_group_by_routing(routingId);},'find-created-group');guard();if(value==null)return null;if(typeof value!=='string'||!/^[a-f0-9]{32}$/.test(value))throw failure();return value;},
   async createFounderGroup(input){
    if(!input||typeof input.name!=='string'||!input.name.trim()||new TextEncoder().encode(input.name).length>256||typeof input.description!=='string'||new TextEncoder().encode(input.description).length>4096||typeof input.routingId!=='string'||!/^[a-f0-9]{64}$/.test(input.routingId))throw failure();
    const spec=JSON.stringify({name:input.name.trim(),description:input.description,routingId:input.routingId,relays:endpoints(input.relays),...(input.mediaEndpoints===undefined?{}:{mediaEndpoints:input.mediaEndpoints})});
    if(spec.length>32768)throw failure();const reviewed=JSON.parse(spec);
    if(reviewed.mediaEndpoints!==undefined&&(!Array.isArray(reviewed.mediaEndpoints)||!reviewed.mediaEndpoints.length||reviewed.mediaEndpoints.length>20||reviewed.mediaEndpoints.some(url=>typeof url!=='string'||url.length>2048||!/^https?:\/\//.test(url))))throw failure();
    const guard=()=>allowed('create',JSON.parse(spec));guard();
    const groupId=await execute(()=>{guard();return device.create_founder_group(reviewed.name,reviewed.description,reviewed.routingId,JSON.stringify(reviewed.relays),reviewed.mediaEndpoints===undefined?undefined:JSON.stringify(reviewed.mediaEndpoints));},'create-group',undefined,guard);
    guard();if(typeof groupId!=='string'||!/^[a-f0-9]{32}$/.test(groupId))throw failure();return Object.freeze({groupId,routingId:reviewed.routingId});
   },
   async syncGroups(){allowed('syncGroups',null);await execute(()=>device.sync_groups(),'sync-groups');check();},
   async summary(group){allowed('read',{groupId:group});return parse(await execute(()=>device.group_summary(group),'summary'));},
   async routing(group){allowed('read',{groupId:group});const result=await execute(()=>{allowed('read',{groupId:group});return device.group_routing(group);},'routing');return result===undefined||result===null?null:parse(result);},
   async mediaPolicy(group){allowed('read',{groupId:group});const result=await execute(()=>{allowed('read',{groupId:group});return device.group_media_policy(group);},'media-policy');return result===undefined||result===null?null:parse(result);},
   async manage(group,pin,action,{beforePublication}={}){const serializedAction=JSON.stringify(action),serializedPin=JSON.stringify(pin);if(typeof serializedAction!=='string'||serializedAction.length>4*1024*1024||typeof serializedPin!=='string'||serializedPin.length>1024)throw failure();const reviewedAction=JSON.parse(serializedAction),operation=reviewedAction?.action==='leave'?'leave':'manage';const guard=()=>allowed(operation,{groupId:group,action:JSON.parse(serializedAction)});guard();const result=parse(await execute(()=>{guard();return device.manage_group(group,serializedPin,serializedAction);},'manage',beforePublication,guard));await runtime.recordControlEffects?.(group,result);guard();if(result.timelineChange!=='none')notify('withdrawal');else if(result.publishedAppMessages?.length)notify('append');await schedule(group);return result;},
   async ownDevices(group){
    const guard=()=>allowed('device-read',{groupId:group});guard();
    const value=parse(await execute(()=>{guard();return device.own_device_members(group);},'own-device-members'));guard();
    if(value?.groupId!==group||!Array.isArray(value.devices)||value.devices.length>40||value.devices.some(d=>typeof d.signatureKey!=='string'||!/^[a-f0-9]{2,266}$/.test(d.signatureKey)||d.signatureKey.length%2!==0||typeof d.currentDevice!=='boolean')||new Set(value.devices.map(d=>d.signatureKey)).size!==value.devices.length||value.devices.filter(d=>d.currentDevice).length!==1)throw failure();
    return Object.freeze({groupId:group,epochPin:value.epochPin,devices:Object.freeze(value.devices.map(d=>Object.freeze({signatureKey:d.signatureKey,currentDevice:d.currentDevice})))});
   },
   async removeOwnDevices(group,pin,signatureKeys,{beforePublication}={}){
    if(!Array.isArray(signatureKeys)||!signatureKeys.length||signatureKeys.length>40||signatureKeys.some(key=>typeof key!=='string'||!key.length||key.length>266||key.length%2!==0||!/^[a-f0-9]+$/.test(key))||new Set(signatureKeys).size!==signatureKeys.length)throw failure();
    const keys=JSON.stringify(signatureKeys),serializedPin=JSON.stringify(pin);if(typeof serializedPin!=='string'||serializedPin.length>1024)throw failure();
    // Explicit current device-revocation authority, distinct from generic group
    // admin rights. Original MLS still verifies each leaf belongs to this account.
    const guard=()=>allowed('device-remove',{groupId:group,leafSignatureKeys:JSON.parse(keys)});guard();
    const raw=await execute(()=>{guard();return device.remove_own_devices(group,serializedPin,keys);},'remove-own-devices',beforePublication,guard);guard();if(raw===undefined||raw===null)throw failure();const result=parse(raw);
    await runtime.recordControlEffects?.(group,result);guard();notify('withdrawal');await schedule(group);return result;
   },
   async prepareMedia(group,{data,fileName,mediaType}){
    if(!(data instanceof Uint8Array)||!data.length||data.length>5*1024*1024-16||typeof fileName!=='string'||!fileName.length||new TextEncoder().encode(fileName).length>255||fileName.includes('\0')||typeof mediaType!=='string'||mediaType.length>128)throw failure();
    const body=data.slice(),guard=()=>allowed('media-upload',{groupId:group});guard();
    try{const policy=await execute(()=>{guard();return device.group_media_policy(group);},'media-policy');if(policy===undefined||policy===null)throw failure();
     const prepared=await execute(()=>{guard();return device.prepare_group_media(group,body,fileName,mediaType);},'prepare-media');guard();
     if(!(prepared?.ciphertext instanceof Uint8Array)||typeof prepared.reference!=='string')throw failure();return Object.freeze({reference:parse(prepared.reference),ciphertext:prepared.ciphertext});
    }finally{body.fill(0);}
   },
   async buildMediaTag(group,reference){const encoded=JSON.stringify(reference);if(typeof encoded!=='string'||encoded.length>32768)throw failure();const guard=()=>allowed('media-upload',{groupId:group});guard();const value=await execute(()=>{guard();return device.build_group_media_tag(group,encoded);},'media-tag');guard();if(value===undefined||value===null)throw failure();return parse(value);},
   async mediaReference(group,messageId,index){if(typeof messageId!=='string'||!/^[a-f0-9]{64}$/.test(messageId)||!Number.isInteger(index)||index<0||index>1000)throw failure();const guard=()=>allowed('media-download',{groupId:group,messageId,index});guard();const value=await execute(()=>{guard();return device.group_media_reference(group,messageId,index);},'media-reference');guard();if(value===undefined||value===null)throw failure();return parse(value);},
   async openMedia(group,messageId,index,data){if(typeof messageId!=='string'||!/^[a-f0-9]{64}$/.test(messageId)||!Number.isInteger(index)||index<0||index>1000||!(data instanceof Uint8Array)||data.length<17||data.length>5*1024*1024)throw failure();const body=data.slice(),guard=()=>allowed('media-download',{groupId:group,messageId,index});let result;guard();try{result=await execute(()=>{guard();return device.open_group_media(group,messageId,index,body);},'open-media');guard();if(!(result instanceof Uint8Array))throw failure();return result;}catch(error){result?.fill?.(0);throw error;}finally{body.fill(0);}},
   async sendChatEvent(group,event){allowed('send',{groupId:group});const result=parse(await execute(()=>device.send_chat_event(group,JSON.stringify(event)),'send'));await runtime.recordControlEffects?.(group,result);check();notify('append');await schedule(group);return result;},
   async ingest(group,event,endpoint){allowed('receive',{groupId:group,endpoint});const result=parse(await execute(()=>device.ingest_event(group??undefined,JSON.stringify(event),endpoint),'ingest'));if(group)await runtime.recordControlEffects?.(group,result);check();if(result.timelineChange!=='none')notify('withdrawal');if(group)await schedule(group);return result;},
   async redeliverWelcome(group,messageId,recipient,{beforePublication}={}){
    if(!/^[a-f0-9]{32}$/.test(group)||!/^[a-f0-9]{64}$/.test(messageId)||!/^[a-f0-9]{64}$/.test(recipient))throw failure();
    const guard=()=>allowed('manage',{groupId:group,action:{action:'retry-welcome',recipient,messageId}});guard();
    const result=parse(await execute(()=>{guard();return device.redeliver_group_welcome(group,messageId,recipient);},'retry-welcome',beforePublication,guard));if(result?.unavailable===true)throw failure();return result;
   },
   reconcile,
   async readTimeline(group,{before,limit=50}={}){allowed('read',{groupId:group});if(!Number.isSafeInteger(limit)||limit<1||limit>200||before&&(!Number.isSafeInteger(before.at)||before.at<0||typeof before.messageId!=='string'||! /^[a-f0-9]{64}$/.test(before.messageId)))throw failure();const page=parse(await execute(()=>device.timeline(group,before?BigInt(before.at):undefined,before?.messageId,limit),'timeline'));if(page.terminal===true)throw failure();return page;},
   subscribeTimeline(listener){check();listeners.add(listener);return()=>listeners.delete(listener);},
   close,async settled(){await runtime.settled();},
  });
 }catch{await close();throw failure();}
}
