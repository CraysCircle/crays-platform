/** SOURCE-ONLY additive adapter, NOT a registered tool or native confirmation API.
 * Reuses unchanged notes storage/physical-owner/CAS/erase. No model boolean can activate a preference.
 * Without an independently implemented trusted host receipt reader every proposal remains pending.
 */
import {createHash} from 'node:crypto';
import {executePersonalRecord} from './records-store.mjs';
const SCHEMA='crays.private-preference-proposal.v1',PREFIX='Preference proposal: ';
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{safeCode:code});};
function plain(value,allowed,required=allowed){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('PREFERENCE_INVALID_INPUT');
 const d=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(d);if(keys.some(k=>typeof k!=='string'||!Object.hasOwn(d[k],'value')||!allowed.includes(k))||required.some(k=>!Object.hasOwn(d,k)))fail('PREFERENCE_INVALID_INPUT');
 return value;
}
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\u0000-\u001f\u007f\ud800-\udfff]/u.test(v);
const stamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
function proposal(input,actor,clock){
 plain(input,['topic','value','userProvidedSource','sourceObservedAt','validFrom','validUntil']);
 if(!text(input.topic,96)||!text(input.value,2048)||!text(input.userProvidedSource,2048)||!stamp(input.sourceObservedAt)||Date.parse(input.sourceObservedAt)>clock||!stamp(input.validFrom)||(input.validUntil!==null&&!stamp(input.validUntil))||input.validUntil!==null&&Date.parse(input.validUntil)<=Date.parse(input.validFrom))fail('PREFERENCE_INVALID_INPUT');
 return {schema:SCHEMA,topic:input.topic,value:input.value,source:{kind:'USER_PROVIDED_TOOL_ASSERTION_NOT_HOST_VERIFIED',quotedUserInput:input.userProvidedSource,ownerAgentId:actor.agentId,sourceObservedAt:input.sourceObservedAt},validFrom:input.validFrom,validUntil:input.validUntil};
}
function parse(record){
 if(record?.kind!=='note'||record.state!=='open'||!record.title.startsWith(PREFIX))return null;
 let p;try{p=JSON.parse(record.text);}catch{return null;}
 try{plain(p,['schema','topic','value','source','validFrom','validUntil']);plain(p.source,['kind','quotedUserInput','ownerAgentId','sourceObservedAt']);}catch{return null;}
 if(p.schema!==SCHEMA||!text(p.topic,96)||!text(p.value,2048)||!text(p.source.quotedUserInput,2048)||p.source.kind!=='USER_PROVIDED_TOOL_ASSERTION_NOT_HOST_VERIFIED'||!text(p.source.ownerAgentId,64)||!stamp(p.source.sourceObservedAt)||!stamp(p.validFrom)||(p.validUntil!==null&&!stamp(p.validUntil))||p.validUntil!==null&&Date.parse(p.validUntil)<=Date.parse(p.validFrom)||record.title!==PREFIX+p.topic)return null;
 return p;
}
/** Host-only constructor arguments; never accept a receipt/verifier/current clock in tool/model args.
 * readVerifiedConfirmationReceipt is a NEW integration seam, not an existing native ctx method.
 * It must independently validate current same-person explicit confirmation and revocation.
 */
export function createPersonalPreferenceAdapter({actor,readVerifiedConfirmationReceipt,now=Date.now,readRecord=executePersonalRecord}){
 if(!actor||typeof actor.guard!=='function'||typeof actor.agentId!=='string'||typeof actor.sessionKey!=='string'||!actor.sessionKey.startsWith('agent:'+actor.agentId+':')||!actor.sessionKey.slice(('agent:'+actor.agentId+':').length)||typeof now!=='function'||typeof readRecord!=='function'||readVerifiedConfirmationReceipt!==undefined&&typeof readVerifiedConfirmationReceipt!=='function')fail('PREFERENCE_HOST_CONTEXT_REQUIRED');
 const agentId=actor.agentId,sessionKey=actor.sessionKey,guard=()=>{actor.guard();if(actor.agentId!==agentId||actor.sessionKey!==sessionKey)fail('PREFERENCE_OWNER_CONTEXT_CHANGED');};
 const clock=()=>{guard();const n=now();if(!Number.isSafeInteger(n)||n<0)fail('PREFERENCE_INVALID_HOST_CLOCK');return n;};
 const invoke=args=>{guard();return readRecord({...actor,guard},args);};
 const load=id=>{const found=invoke({operation:'read',id});return found.status==='read'?{record:found.record,proposal:parse(found.record)}:null;};
 async function classify(record,p){
  let at=clock();if(!readVerifiedConfirmationReceipt)return {status:'PENDING_CONFIRMATION',hostConfirmationConnectorAvailable:false};
  if(p.source.ownerAgentId!==agentId)return {status:'PENDING_CONFIRMATION',hostConfirmationConnectorAvailable:true};
  const proposalSha256=hash(JSON.stringify(p)),binding={agentId,recordId:record.id,recordVersion:record.version,proposalSha256};
  let r;try{r=await readVerifiedConfirmationReceipt(Object.freeze(binding));}catch{guard();return {status:'PENDING_CONFIRMATION',hostConfirmationConnectorAvailable:true};}guard();at=clock();
  if(!r||r.verificationOutcome!=='CONFIRMED_CURRENT_USER_EXPLICIT'||r.agentId!==agentId||r.recordId!==record.id||r.recordVersion!==record.version||r.proposalSha256!==proposalSha256||!text(r.receiptId,128)||!stamp(r.confirmedAt)||Date.parse(r.confirmedAt)>at||r.revoked!==false)return {status:'PENDING_CONFIRMATION',hostConfirmationConnectorAvailable:true};
  if(r.expiresAt!==null&&(!stamp(r.expiresAt)||Date.parse(r.expiresAt)<=at))return {status:'CONFIRMATION_EXPIRED',hostConfirmationConnectorAvailable:true};
  if(Date.parse(p.validFrom)>at)return {status:'NOT_YET_VALID',hostConfirmationConnectorAvailable:true};
  if(p.validUntil!==null&&Date.parse(p.validUntil)<=at)return {status:'PREFERENCE_EXPIRED',hostConfirmationConnectorAvailable:true};
  return {status:'ACTIVE_HOST_RECEIPT_VERIFIED',confirmationReceiptId:r.receiptId,hostConfirmationConnectorAvailable:true};
 }
 function activeSync(found){if(!found?.proposal||found.proposal.source.ownerAgentId!==agentId||!readVerifiedConfirmationReceipt)return null;const record=found.record,p=found.proposal,b={agentId,recordId:record.id,recordVersion:record.version,proposalSha256:hash(JSON.stringify(p))};const at=clock(),r=readVerifiedConfirmationReceipt(Object.freeze(b));guard();if(!r||typeof r.then==='function'||r.verificationOutcome!=='CONFIRMED_CURRENT_USER_EXPLICIT'||r.agentId!==agentId||r.recordId!==record.id||r.recordVersion!==record.version||r.proposalSha256!==b.proposalSha256||!text(r.receiptId,128)||!stamp(r.confirmedAt)||Date.parse(r.confirmedAt)>at||r.revoked!==false||r.expiresAt!==null&&(!stamp(r.expiresAt)||Date.parse(r.expiresAt)<=at)||Date.parse(p.validFrom)>at||p.validUntil!==null&&Date.parse(p.validUntil)<=at)return null;return {id:record.id,version:record.version,topic:p.topic,value:p.value,validFrom:p.validFrom,validUntil:p.validUntil};}
 return Object.freeze({
  /** Host-only synchronous recall path. Never registered as a model confirmation or write operation. */
  readActiveForContext({id,expectedVersion}){const found=load(id);if(found?.record.version!==expectedVersion)return null;return activeSync(found);},
  listForContext(){const page=invoke({operation:'context_catalog'});if(!page||!Array.isArray(page.records)||page.records.length>4096||typeof page.incomplete!=='boolean')fail('PREFERENCE_READ_UNAVAILABLE');const records=[];for(const record of page.records){guard();const current=activeSync({record,proposal:parse(record)});if(current)records.push(current);}guard();return {records,scanned:page.records.length,incomplete:page.incomplete};},
  propose(input){plain(input,['proposal','idempotencyKey']);const p=proposal(input.proposal,actor,clock());return invoke({operation:'create',kind:'note',title:PREFIX+p.topic,text:JSON.stringify(p),idempotencyKey:input.idempotencyKey});},
  correct(input){plain(input,['id','expectedVersion','proposal','idempotencyKey']);const prior=load(input.id);if(!prior?.proposal)return {status:'not_found'};const p=proposal(input.proposal,actor,clock());return invoke({operation:'update',id:input.id,expectedVersion:input.expectedVersion,title:PREFIX+p.topic,text:JSON.stringify(p),state:'open',idempotencyKey:input.idempotencyKey});},
  erase(input){plain(input,['id','expectedVersion','idempotencyKey']);const prior=load(input.id);if(!prior?.proposal)return {status:'not_found'};return invoke({operation:'delete',...input});},
  async readForReview(input){plain(input,['id']);const found=load(input.id);if(!found?.proposal)return {status:'not_found'};const classification=await classify(found.record,found.proposal);guard();return {status:'PROPOSAL_FOR_EXPLICIT_USER_REVIEW',id:found.record.id,version:found.record.version,proposal:found.proposal,confirmation:classification,automaticPersonalizationAllowed:false};},
  async searchActive(input){
   plain(input,['topic'],[]);if(input.topic!==undefined&&!text(input.topic,96))fail('PREFERENCE_INVALID_INPUT');const records=[];let offset=0,scanned=0,hasMore=false;
   while(scanned<200&&records.length<10){const page=invoke({operation:'list',offset});hasMore=page.hasMore;for(const summary of page.records){if(++scanned>200)break;if(!summary.title.startsWith(PREFIX))continue;const found=load(summary.id);if(!found?.proposal||input.topic!==undefined&&found.proposal.topic.toLocaleLowerCase('en-US')!==input.topic.toLocaleLowerCase('en-US'))continue;const status=await classify(found.record,found.proposal);if(status.status==='ACTIVE_HOST_RECEIPT_VERIFIED')records.push({id:found.record.id,version:found.record.version,topic:found.proposal.topic,value:found.proposal.value,source:found.proposal.source,validFrom:found.proposal.validFrom,validUntil:found.proposal.validUntil,confirmationReceiptId:status.confirmationReceiptId});if(records.length>=10)break;}if(!page.hasMore)break;offset=page.nextOffset;}
   guard();return {status:'ACTIVE_PREFERENCES',records,scannedRecords:Math.min(scanned,200),searchMayBeIncomplete:hasMore||records.length===10,hostConfirmationConnectorAvailable:readVerifiedConfirmationReceipt!==undefined};
  }
 });
}
