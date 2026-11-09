import {originalMdkFormat} from './groupStorageFormat.mjs';
const hex=(value,length)=>typeof value==='string'&&new RegExp('^[a-f0-9]{'+length+'}$').test(value);
const failure=()=>Error('The original group creation is not confirmed. No second group was created.');
/** Original normal-runtime local creation and independent Core registration.
 * The supplied journal MUST be the current account's encrypted, context-scoped
 * journal. Persistence never supplies membership or publication authority.
 * Keep the exact random public route before creating MLS state. Reconciliation
 * only looks up that route; it never creates or reinvites after an unknown result.
 */
export function createMdkFounderRegistration({identity:originalIdentity,runtime,journal,directory,isCurrent,context:originalContext,crypto=globalThis.crypto}){
 const identity=Object.freeze({...originalIdentity}),context=Object.freeze({...originalContext,...(originalContext?.mediaEndpoints?{mediaEndpoints:Object.freeze([...originalContext.mediaEndpoints])}:{})});
 if(runtime?.storageFormat!==originalMdkFormat||runtime.accountPubkey!==identity?.pubkey||!identity.accountId||!hex(identity.pubkey,64)||!hex(identity.bindingFingerprint,64)||typeof isCurrent!=='function'||!journal?.exclusive||!journal.getItem||!journal.setItem||!directory?.register||!crypto?.getRandomValues||!context||typeof context.spotId!=='string'||!['vifs','spot','circle'].includes(context.parentKind)||typeof context.parentId!=='string'||typeof context.relay!=='string')throw failure();
 const scope=JSON.stringify([identity.accountId,identity.pubkey,identity.bindingFingerprint,context.spotId,context.parentKind,context.parentId,context.relay,context.mediaEndpoints??null]);
 const check=()=>{if(isCurrent()!==true)throw failure();};
 return Object.freeze({async register(input,{allowCreate=false}={}){
  check();if(!input||typeof input.requestId!=='string'||!/^[a-zA-Z0-9:_-]{1,200}$/.test(input.requestId)||typeof input.name!=='string'||!input.name.trim()||input.name.length>80)throw failure();
  const requestId=input.requestId,name=input.name.trim(),request=JSON.stringify([scope,requestId,name]);
  return journal.exclusive('original-founder-registration',async()=>{
   check();const key='founder-request:'+requestId;let record=await journal.getItem(key);check();
   if(record){if(record.schema!==1||record.request!==request||!hex(record.routingId,64)||record.groupId!=null&&!hex(record.groupId,32))throw failure();}
   else{
    if(!allowCreate)throw failure();const random=new Uint8Array(32);crypto.getRandomValues(random);
    record={schema:1,request,routingId:Array.from(random,b=>b.toString(16).padStart(2,'0')).join(''),groupId:null};
    await journal.setItem(key,record);check();
   }
   let groupId=record.groupId;
   if(!groupId){
    if(!allowCreate){groupId=await runtime.findGroupByRouting(record.routingId);if(!groupId)throw failure();}
    else groupId=(await runtime.createFounderGroup({name,description:'',routingId:record.routingId,relays:[context.relay],mediaEndpoints:context.mediaEndpoints})).groupId;
    check();if(!hex(groupId,32))throw failure();record={...record,groupId};await journal.setItem(key,record);check();
   }
   const summary=await runtime.summary(groupId),route=await runtime.routing(groupId);check();
   if(summary.terminal||summary.removed||summary.unrecoverable||summary.name!==name||summary.members?.length!==1||!Array.isArray(summary.members[0]?.id)||summary.members[0].id.map(b=>b.toString(16).padStart(2,'0')).join('')!==identity.pubkey||summary.admins?.length!==1||summary.admins[0]!==identity.pubkey||route?.routingId!==record.routingId||JSON.stringify(route.relays)!==JSON.stringify([context.relay]))throw failure();
   const grant=await directory.register({storageFormat:originalMdkFormat,groupId,routingId:record.routingId,name,spotId:context.spotId,parentKind:context.parentKind,parentId:context.parentId});check();
   if(grant.storageFormat!==originalMdkFormat||grant.groupId!==groupId||grant.routingId!==record.routingId||!grant.members?.includes(identity.pubkey))throw failure();
   await journal.setItem(key,{...record,registered:true});check();
   // Admission must be rechecked by the parent before runtime.syncGroups().
   return Object.freeze({groupId,routingId:record.routingId,grant});
  });
 }});
}
