import{registerOperationalLearningCapture}from'./operational-learning-hooks.mjs';
import {registerExplicitMemoryCaptureHook} from './explicit-memory-capture.mjs';
import {createCombinedPrivateMemoryContext} from './memory-context.mjs';
/** SOURCE ONLY. Optional owner tool + authorized hook. No activation/native transport proof. */
import {createHash} from 'node:crypto';import {realpathSync,lstatSync} from 'node:fs';
import {createNativePersonalRecords} from './records-factory.mjs';import {createPersonalPreferenceAdapter} from './preference-adapter.mjs';
import {createNativePreferenceConfirmationConnector,registerNativePreferenceConfirmationHook} from './native-confirmation-connector.mjs';
const TOOL='crays_personal_preferences',sha=s=>createHash('sha256').update(s).digest('hex');
const fail=()=>{throw Error('PREFERENCE_UNAVAILABLE');},text=x=>typeof x==='string'&&x.length>0&&x.length<=512;
const identity=p=>{const s=lstatSync(p,{bigint:true});if(!s.isDirectory()||s.isSymbolicLink())fail();return `${s.dev}:${s.ino}`;};
const fields={propose:['operation','proposal','idempotencyKey'],correct:['operation','id','expectedVersion','proposal','idempotencyKey'],readForReview:['operation','id'],searchConfirmed:['operation','topic'],revoke:['operation','id','expectedVersion'],forget:['operation','id','expectedVersion','idempotencyKey']};
function input(x){if(!x||typeof x!=='object'||Array.isArray(x)||![Object.prototype,null].includes(Object.getPrototypeOf(x)))fail();const ds=Object.getOwnPropertyDescriptors(x),op=ds.operation?.value,keys=fields[op];const expected=op==='searchConfirmed'&&!Object.hasOwn(ds,'topic')?['operation']:keys;if(!expected||Reflect.ownKeys(ds).length!==expected.length||Reflect.ownKeys(ds).some(k=>typeof k!=='string'||!expected.includes(k)||!Object.hasOwn(ds[k],'value')))fail();return op;}
const result=details=>({content:[{type:'text',text:JSON.stringify(details)}],details});
const summary=r=>({id:r.id,version:r.version,topic:r.proposal.topic,value:r.proposal.value,validFrom:r.proposal.validFrom,validUntil:r.proposal.validUntil});
function owner(ctx){
 if(!createNativePersonalRecords(ctx)||ctx.senderIsOwner!==true||typeof ctx.assertInvocationCurrent!=='function')return null;
 const agentId=ctx.agentId,sessionKey=ctx.sessionKey,agentDir=realpathSync(ctx.agentDir),workspace=realpathSync(ctx.workspaceDir),ai=identity(agentDir),wi=identity(workspace);
 const guard=()=>{ctx.assertInvocationCurrent();if(ctx.agentId!==agentId||ctx.sessionKey!==sessionKey||ctx.senderIsOwner!==true||!createNativePersonalRecords(ctx)||realpathSync(ctx.agentDir)!==agentDir||realpathSync(ctx.workspaceDir)!==workspace||identity(agentDir)!==ai||identity(workspace)!==wi)fail();};guard();return {agentId,sessionKey,agentDir,workspace,guard};
}
const binding=(a,r)=>({agentId:a.agentId,recordId:r.id,recordVersion:r.version,proposalSha256:sha(JSON.stringify(r.proposal))});
const proposedSchema={type:'object',additionalProperties:false,required:['topic','value','userProvidedSource','sourceObservedAt','validFrom','validUntil'],properties:{topic:{type:'string',maxLength:96},value:{type:'string',maxLength:2048},userProvidedSource:{type:'string',maxLength:2048},sourceObservedAt:{type:'string'},validFrom:{type:'string'},validUntil:{anyOf:[{type:'string'},{type:'null'}]}}};
export function createNativePersonalPreferences(ctx,connector){
 let actor;try{actor=owner(ctx);}catch{return null;}if(!actor)return null;
 const parameters={type:'object',additionalProperties:false,required:['operation'],properties:{operation:{type:'string',enum:Object.keys(fields)},id:{type:'string'},expectedVersion:{type:'integer',minimum:1},proposal:proposedSchema,topic:{type:'string',maxLength:96},idempotencyKey:{type:'string',minLength:16,maxLength:96}}};
 return {name:TOOL,label:'Personal preferences',description:'Record only explicitly requested personal preferences. propose/correct require the user to send the exact short Merken code before activation. Never accept a model confirmation flag or infer consent. Only searchConfirmed values may personalize replies. IDs are private tool handles: never show IDs, hashes or implementation details in user prose.',parameters,async execute(_call,args,signal){
  const guard=()=>{signal?.throwIfAborted();actor.guard();};
  try{
   guard();const operation=input(args),adapter=createPersonalPreferenceAdapter({actor:{...actor,guard},readVerifiedConfirmationReceipt:connector.readerForNativeContext(ctx)});
   if(operation==='searchConfirmed'){const found=await adapter.searchActive({topic:args.topic});guard();return result({status:'confirmed_preferences',preferences:found.records.map(r=>({id:r.id,version:r.version,topic:r.topic,value:r.value,validFrom:r.validFrom,validUntil:r.validUntil})),searchMayBeIncomplete:found.searchMayBeIncomplete});}
   if(operation==='readForReview'){const r=await adapter.readForReview({id:args.id});guard();if(r.status==='not_found')return result({status:'not_found'});return result({status:r.confirmation.status==='ACTIVE_HOST_RECEIPT_VERIFIED'?'confirmed':'not_confirmed',preference:summary(r),userText:`${r.proposal.topic}: ${r.proposal.value}`,automaticPersonalizationAllowed:r.confirmation.status==='ACTIVE_HOST_RECEIPT_VERIFIED'});}
   if(operation==='propose'||operation==='correct'){
    // Fail before persisting a new proposal if the native owner route cannot bind a private challenge.
    if(![ctx.messageChannel,ctx.agentAccountId,ctx.nativeChannelId,ctx.requesterSenderId,ctx.sessionKey,ctx.sessionId].every(text))fail();
    const write=operation==='propose'?adapter.propose({proposal:args.proposal,idempotencyKey:args.idempotencyKey}):adapter.correct({id:args.id,expectedVersion:args.expectedVersion,proposal:args.proposal,idempotencyKey:args.idempotencyKey});guard();
    if(!['created','updated','replayed'].includes(write.status))return result({status:write.status==='not_found'?'not_found':'not_changed',userText:'Die Änderung konnte nicht übernommen werden. Bitte lade die aktuelle Präferenz erneut.'});
    const id=operation==='propose'?write.receipt.id:args.id,r=await adapter.readForReview({id});guard();if(r.status!=='PROPOSAL_FOR_EXPLICIT_USER_REVIEW')fail();
    const challenge=await connector.issueChallengeForNativeContext(ctx,binding(actor,r));guard();
    if(challenge.status!=='CONFIRMATION_REQUIRED')return result({status:'not_confirmed',preference:summary(r),userText:'Die Präferenz ist noch nicht bestätigt. Bitte versuche die Bestätigung später erneut.'});
    return result({status:'awaiting_confirmation',preference:summary(r),userText:`Ich soll mir merken: ${r.proposal.topic} — ${r.proposal.value}. ${challenge.userText}`,confirmationLine:challenge.confirmationLine,expiresAt:challenge.expiresAt});
   }
   const r=await adapter.readForReview({id:args.id});guard();if(r.status==='not_found')return result({status:'not_found'});if(r.version!==args.expectedVersion)return result({status:'version_conflict',userText:'Diese Präferenz wurde inzwischen geändert. Bitte lade den aktuellen Stand.'});
   connector.revokeForNativeContext(ctx,binding(actor,r));guard();
   if(operation==='revoke')return result({status:'revoked',userText:'Die Bestätigung ist widerrufen. Ich verwende diese Präferenz nicht mehr.'});
   const erased=adapter.erase({id:args.id,expectedVersion:args.expectedVersion,idempotencyKey:args.idempotencyKey});guard();return result({status:erased.status==='deleted'||erased.status==='replayed'?'forgotten':'not_changed',userText:erased.status==='deleted'||erased.status==='replayed'?'Die Präferenz wurde gelöscht.':'Die Präferenz konnte nicht gelöscht werden. Ihre Bestätigung ist widerrufen.'});
  }catch{return result({status:'unavailable',userText:'Die Präferenz konnte gerade nicht verarbeitet werden. Bitte versuche es erneut.'});}
 }};
}
export default {id:'crays-personal-preferences',name:'Private personal preferences',version:'0.1.0',configSchema:{jsonSchema:{type:'object',additionalProperties:false,properties:{}}},register(api){
 if(typeof api?.registerTool!=='function'||typeof api?.on!=='function')fail();
 registerExplicitMemoryCaptureHook(api);
 registerOperationalLearningCapture(api);
 const connector=createNativePreferenceConfirmationConnector({getRuntimeConfig:()=>api.runtime.config.current()});
 api.registerTool({contextVersion:2,create:ctx=>createNativePersonalPreferences(ctx,connector)},{name:TOOL,optional:true});
 registerNativePreferenceConfirmationHook(api,connector,createCombinedPrivateMemoryContext({getRuntimeConfig:()=>api.runtime.config.current()}));
}};
