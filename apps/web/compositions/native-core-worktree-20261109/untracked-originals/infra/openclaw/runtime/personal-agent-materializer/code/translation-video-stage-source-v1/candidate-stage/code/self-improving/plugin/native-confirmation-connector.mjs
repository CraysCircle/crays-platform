/** SOURCE ONLY local explicit-owner connector. No Core purpose/person admission, no tool invoke method invented.
 * Only authorized before_prompt_build pre-projection currentUserMessage can write dedicated host receipt ledger.
 */
import {createHash,randomBytes} from 'node:crypto';import {realpathSync,lstatSync} from 'node:fs';
import {resolveAgentDir} from 'openclaw/plugin-sdk/agent-scope-runtime';
import {executePersonalRecord} from './records-store.mjs';import {executePersonalRecord as ledgerRecord} from './receipt-store.mjs';
import {executePersonalRecord as challengeRecord} from './challenge-store.mjs';
import {createNativePersonalRecords} from './records-factory.mjs';import {createPersonalPreferenceAdapter} from './preference-adapter.mjs';
const TOOL='crays_personal_records',TITLE='Preference confirmation receipt',SCHEMA='crays.local-explicit-preference-confirmation.v1';
const hash=x=>createHash('sha256').update(x).digest('hex'),fail=()=>{throw Error('PREFERENCE_CONFIRMATION_SCOPE_UNAVAILABLE');};
const validId=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9_-]{0,63}$/.test(x)&&!['__proto__','constructor','prototype'].includes(x);
const nonempty=x=>typeof x==='string'&&x.length>0&&x.length<=512;
const directory=p=>{const s=lstatSync(p,{bigint:true});if(!s.isDirectory()||s.isSymbolicLink())fail();return `${s.dev}:${s.ino}`;};
const CHALLENGE_TITLE='Private preference confirmation challenge',CHALLENGE_SCHEMA='crays.local-preference-short-code-challenge.v1',ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const parse=text=>typeof text==='string'&&text.length<=64?/^Merken ([A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4})$/.exec(text.trim())?.[1]??null:null;
function randomCode(){const b=randomBytes(5);let acc=0,bits=0,out='';for(const n of b){acc=(acc<<8)|n;bits+=8;while(bits>=5){bits-=5;out+=ALPHABET[(acc>>>bits)&31];}}return out.slice(0,4)+'-'+out.slice(4);}
const routeFromNative=ctx=>[ctx.messageChannel,ctx.agentAccountId,ctx.nativeChannelId,ctx.requesterSenderId,ctx.sessionKey,ctx.sessionId];
const routeFromHook=ctx=>[ctx.channel,ctx.accountId,ctx.channelId,ctx.senderId,ctx.sessionKey,ctx.sessionId];
const routeHash=fields=>{if(!fields.every(nonempty))fail();return hash(JSON.stringify(fields));};
export function createNativePrivateMemoryActor(ctx){
 if(!createNativePersonalRecords(ctx)||ctx.senderIsOwner!==true||typeof ctx.assertInvocationCurrent!=='function')fail();
 const agentId=ctx.agentId,sessionKey=ctx.sessionKey,agentDir=realpathSync(ctx.agentDir),workspace=realpathSync(ctx.workspaceDir),a=directory(agentDir),w=directory(workspace);
 const guard=()=>{ctx.assertInvocationCurrent();if(ctx.senderIsOwner!==true||ctx.agentId!==agentId||ctx.sessionKey!==sessionKey||!createNativePersonalRecords(ctx)||realpathSync(ctx.agentDir)!==agentDir||realpathSync(ctx.workspaceDir)!==workspace||directory(agentDir)!==a||directory(workspace)!==w)fail();};guard();return {agentId,sessionKey,agentDir,workspace,guard};
}
function hookActor(ctx,getRuntimeConfig,requiredTools=[TOOL]){
 if(!validId(ctx?.agentId)||!nonempty(ctx.sessionKey)||!ctx.sessionKey.startsWith('agent:'+ctx.agentId+':')||!nonempty(ctx.sessionId)||!nonempty(ctx.runId)||ctx.inputProvenance?.kind!=='external_user'||!nonempty(ctx.senderId)||!nonempty(ctx.accountId)||!nonempty(ctx.channel)||!nonempty(ctx.channelId)||!nonempty(ctx.workspaceDir)||!ctx.toolAuthority||typeof ctx.toolAuthority.assertActive!=='function'||typeof ctx.toolAuthority.allows!=='function'||!nonempty(ctx.toolAuthority.fingerprint))fail();
 const cfg=getRuntimeConfig(),row=cfg?.agents?.entries?.[ctx.agentId];if(!row||!nonempty(row.workspace))fail();
 const agentId=ctx.agentId,sessionKey=ctx.sessionKey,sessionId=ctx.sessionId,agentDir=realpathSync(row.agentDir??resolveAgentDir(cfg,agentId)),workspace=realpathSync(ctx.workspaceDir);if(realpathSync(row.workspace)!==workspace)fail();
 const a=directory(agentDir),w=directory(workspace),fingerprint=ctx.toolAuthority.fingerprint;
 const guard=()=>{ctx.toolAuthority.assertActive();if(ctx.hookInvocation)ctx.hookInvocation.assertActive();const current=getRuntimeConfig()?.agents?.entries?.[agentId];if(!requiredTools.every(name=>ctx.toolAuthority.allows(name))||ctx.toolAuthority.fingerprint!==fingerprint||ctx.agentId!==agentId||ctx.sessionKey!==sessionKey||ctx.sessionId!==sessionId||!current||realpathSync(current.workspace)!==workspace||realpathSync(current.agentDir??resolveAgentDir(getRuntimeConfig(),agentId))!==agentDir||directory(agentDir)!==a||directory(workspace)!==w)fail();};guard();
 return {agentId,sessionKey,agentDir,workspace,guard};
}
export function createAuthorizedPrivateMemoryActor(ctx,getRuntimeConfig,requiredTools){if(!Array.isArray(requiredTools)||!requiredTools.length||requiredTools.some(name=>!['crays_personal_records','crays_personal_preferences','crays_personal_planner'].includes(name)))fail();return hookActor(ctx,getRuntimeConfig,[...requiredTools]);}
function rowsFor(store,actor,title,schema){
 // Original list API permits offsets through 10000, with pages of 50. Never use a partial ledger.
 const rows=[];let offset=0;
 while(true){
  actor.guard();const page=store(actor,{operation:'list',offset});
  if(page.status!=='listed'||!Array.isArray(page.records)||page.records.length>50||typeof page.hasMore!=='boolean')fail();
  for(const item of page.records){
   if(item.title!==title)fail();const r=store(actor,{operation:'read',id:item.id});if(r.status!=='read')fail();
   let data;try{data=JSON.parse(r.record.text);}catch{fail();}if(data?.schema!==schema)fail();rows.push({record:r.record,data});
  }
  if(!page.hasMore){actor.guard();return rows;}
  // Exhaustion/inconsistent pagination fails before the caller can accept ACTIVE or return revoked.
  if(page.records.length!==50||page.nextOffset!==offset+50||page.nextOffset>10000)throw Error('PREFERENCE_CONFIRMATION_LEDGER_INCOMPLETE');
  offset=page.nextOffset;
 }
}
const receiptRows=actor=>rowsFor(ledgerRecord,actor,TITLE,SCHEMA);
const challengeRows=actor=>rowsFor(challengeRecord,actor,CHALLENGE_TITLE,CHALLENGE_SCHEMA);
export function createNativePreferenceConfirmationConnector({getRuntimeConfig,now=Date.now}){
 if(typeof getRuntimeConfig!=='function'||typeof now!=='function')fail();
 const clock=()=>{const n=now();if(!Number.isSafeInteger(n)||n<0)fail();return n;};
 const same=(r,b)=>r.agentId===b.agentId&&r.recordId===b.recordId&&r.recordVersion===b.recordVersion&&r.proposalSha256===b.proposalSha256;
 const deleteChallenge=(actor,row)=>{const r=challengeRecord(actor,{operation:'delete',id:row.record.id,expectedVersion:row.record.version,idempotencyKey:'prefconsume_'+hash(row.record.id)});actor.guard();if(r.status!=='deleted')fail();};
 return Object.freeze({
  /** Host-only issue through the ACTUAL current owner factory. User receives only the short line. */
  async issueChallengeForNativeContext(ctx,binding){
   const actor=createNativePrivateMemoryActor(ctx),routeSha256=routeHash(routeFromNative(ctx));if(binding?.agentId!==actor.agentId)fail();
   const p=await createPersonalPreferenceAdapter({actor,now}).readForReview({id:binding.recordId});actor.guard();
   if(p.status!=='PROPOSAL_FOR_EXPLICIT_USER_REVIEW'||p.version!==binding.recordVersion||hash(JSON.stringify(p.proposal))!==binding.proposalSha256)fail();
   const t=clock();if(p.proposal.validUntil!==null&&Date.parse(p.proposal.validUntil)<=t)return {status:'PREFERENCE_EXPIRED'};
   let live=0;for(const row of challengeRows(actor)){if(Date.parse(row.data.expiresAt)<=t)deleteChallenge(actor,row);else live++;}if(live>=32)return {status:'TOO_MANY_PENDING_CONFIRMATIONS'};
   for(let attempt=0;attempt<8;attempt++){
    const code=randomCode(),codeSha256=hash(code),expiresAt=new Date(Math.min(t+600000,p.proposal.validUntil===null?Infinity:Date.parse(p.proposal.validUntil))).toISOString();
    const data={schema:CHALLENGE_SCHEMA,...binding,routeSha256,codeSha256,issuedAt:new Date(t).toISOString(),expiresAt};
    const r=challengeRecord(actor,{operation:'create',kind:'note',title:CHALLENGE_TITLE,text:JSON.stringify(data),idempotencyKey:'prefchallenge_'+codeSha256});actor.guard();if(r.status!=='created')continue;
    return {status:'CONFIRMATION_REQUIRED',userText:`Zum Merken antworte mit „Merken ${code}“.`,confirmationLine:'Merken '+code,expiresAt};
   }fail();
  },
  /** Register ONLY with requiresToolAuthority:true. The actual event text and admission ID remain untouched. */
  async beforePromptBuild(event,ctx){
   const code=parse(event?.currentUserMessage);if(!code||!nonempty(event.currentUserMessageId))return;
   let actor,routeSha256;try{actor=hookActor(ctx,getRuntimeConfig);routeSha256=routeHash(routeFromHook(ctx));}catch{return;}
   const codeSha256=hash(code),messageKey=hash(JSON.stringify([actor.agentId,ctx.sessionId,event.currentUserMessageId]));
   const old=receiptRows(actor).find(row=>row.data.messageKey===messageKey&&row.data.codeSha256===codeSha256&&row.data.routeSha256===routeSha256);if(old)return {appendContext:'Die Bestätigung wurde bereits gespeichert. Verwende nur aktuell gültige und nicht widerrufene Präferenzen.'};
   const matches=challengeRows(actor).filter(row=>row.data.codeSha256===codeSha256&&row.data.routeSha256===routeSha256&&row.data.agentId===actor.agentId);if(matches.length!==1)return;
   const challenge=matches[0],data=challenge.data;if(!Number.isFinite(Date.parse(data.expiresAt))||Date.parse(data.expiresAt)<=clock())return;
   const p=await createPersonalPreferenceAdapter({actor,now}).readForReview({id:data.recordId});actor.guard();
   if(p.status!=='PROPOSAL_FOR_EXPLICIT_USER_REVIEW'||p.version!==data.recordVersion||hash(JSON.stringify(p.proposal))!==data.proposalSha256)return;
   // Consume FIRST. A crash between consume and receipt is fail-closed: ask for a fresh challenge, never resurrect.
   deleteChallenge(actor,challenge);
   const receipt={schema:SCHEMA,agentId:actor.agentId,recordId:data.recordId,recordVersion:data.recordVersion,proposalSha256:data.proposalSha256,verificationOutcome:'CONFIRMED_CURRENT_USER_EXPLICIT',confirmedAt:new Date(clock()).toISOString(),expiresAt:p.proposal.validUntil,revoked:false,messageKey,codeSha256,routeSha256,challengeRecordSha256:hash(challenge.record.id),currentUserMessageSha256:hash(event.currentUserMessage),sourceSessionSha256:hash(actor.sessionKey),nativeToolSurfaceFingerprint:ctx.toolAuthority.fingerprint,localOwnerOnlyNotCorePurposeProof:true};
   const result=ledgerRecord(actor,{operation:'create',kind:'note',title:TITLE,text:JSON.stringify(receipt),idempotencyKey:'prefconfirm_'+hash(challenge.record.id)});actor.guard();if(result.status!=='created')fail();
   const r=ledgerRecord(actor,{operation:'read',id:result.receipt.id});actor.guard();if(r.status!=='read'||!same(JSON.parse(r.record.text),receipt))fail();
   return {appendContext:'Die ausdrücklich bestätigte Präferenz wurde gespeichert. Nutze sie nur solange gültig und nicht widerrufen; leite keine weiteren persönlichen Tatsachen ab.'};
  },
  readerForNativeContext(ctx){const actor=createNativePrivateMemoryActor(ctx);return async binding=>{
   actor.guard();if(binding?.agentId!==actor.agentId)return null;const current=executePersonalRecord(actor,{operation:'read',id:binding.recordId});if(current.status!=='read'||current.record.version!==binding.recordVersion||hash(current.record.text)!==binding.proposalSha256)return null;
   for(const row of receiptRows(actor).filter(row=>same(row.data,binding))){const r=row.data;actor.guard();if(r.revoked!==false||r.expiresAt!==null&&Date.parse(r.expiresAt)<=clock())continue;return {...r,receiptId:row.record.id};}actor.guard();return null;
  };},
  revokeForNativeContext(ctx,binding){const actor=createNativePrivateMemoryActor(ctx);if(binding?.agentId!==actor.agentId)return {status:'not_found'};const pendingChallenges=challengeRows(actor).filter(r=>same(r.data,binding)),pendingReceipts=receiptRows(actor).filter(r=>same(r.data,binding));let challenges=0,receipts=0;for(const row of pendingChallenges){deleteChallenge(actor,row);challenges++;}for(const row of pendingReceipts){const r=ledgerRecord(actor,{operation:'delete',id:row.record.id,expectedVersion:row.record.version,idempotencyKey:'prefrevoke_'+hash(JSON.stringify([row.record.id,row.record.version]))});actor.guard();if(!['deleted','replayed'].includes(r.status))fail();receipts++;}return {status:'revoked',receiptCount:receipts,challengeCount:challenges};}
 });
}
export function registerNativePreferenceConfirmationHook(api,connector,recall){if(typeof api?.on!=='function'||recall!==undefined&&typeof recall!=='function')fail();api.on('before_prompt_build',recall?async(event,ctx)=>{const confirmation=await connector.beforePromptBuild(event,ctx);const remembered=recall(event,ctx);const result={};if(confirmation?.appendContext)result.appendContext=confirmation.appendContext;if(remembered?.transientMemoryContext)result.transientMemoryContext=remembered.transientMemoryContext;return Object.keys(result).length?result:undefined;}:connector.beforePromptBuild,{requiresToolAuthority:true});}
