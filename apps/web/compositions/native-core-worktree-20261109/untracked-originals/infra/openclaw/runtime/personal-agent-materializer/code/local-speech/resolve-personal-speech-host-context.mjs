/** Trusted host-only read binding. Never a model tool, account-login adapter, writer or startup grant.
 * Reuses existing Core assignment and native own-account authority through their actual host composition.
 */
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex'),ROOT='/var/lib/crays-personal-agents',HEX=/^[a-f0-9]{64}$/;
export function createPersonalSpeechHostContextResolver({verifiedProviderAccount,standardFactory,resolveCommittedAssignment,ownAccountAuthority,readRuntimeAdmission,assertHostAdmissionCurrent}){
 assert(verifiedProviderAccount?.providerKey==='auth0'&&typeof verifiedProviderAccount.providerSubject==='string'&&verifiedProviderAccount.providerSubject.length>0&&typeof verifiedProviderAccount.accountId==='string'&&verifiedProviderAccount.accountId.length>0,'VERIFIED_HOST_AUTH0_ACCOUNT_REQUIRED');
 assert(typeof standardFactory?.getPersonalAgentStandardPackage==='function'&&[resolveCommittedAssignment,readRuntimeAdmission,assertHostAdmissionCurrent].every(x=>typeof x==='function')&&typeof ownAccountAuthority?.assertReady==='function'&&typeof ownAccountAuthority?.assertConfigSelectsOwnProfile==='function','EXISTING_CORE_ACCOUNT_AND_HOST_AUTHORITIES_REQUIRED');
 // Capture only the existing route's verified identity; later caller mutations cannot select another account.
 const account=Object.freeze({accountId:verifiedProviderAccount.accountId,providerKey:'auth0',providerSubject:verifiedProviderAccount.providerSubject});
 return async function resolve(...args){
  assert.equal(args.length,0,'NO_CALLER_PERSON_OR_RUNTIME_ARGUMENTS');assert(process.getuid()!==0,'NON_ROOT_PERSON_HOST_REQUIRED');
  const standard=standardFactory.getPersonalAgentStandardPackage();assert(HEX.test(standard.sha256));
  const identity=await resolveCommittedAssignment(account,standard);assert.equal(identity.accountId,account.accountId);assert(typeof identity.canonicalPersonId==='string'&&identity.canonicalPersonId.length>0&&identity.canonicalPersonId.length<=200);assert.equal(identity.packageSha256,standard.sha256);assert.equal(identity.packageVersion,standard.descriptor.version);assert(typeof identity.assertCurrent==='function');
  assert(/^openai\/[A-Za-z0-9_.-]+$/.test(identity.modelRef),'EXISTING_OWN_MODEL_REFERENCE_REQUIRED');
  const person=identity.canonicalPersonId,agentId='personal-'+hash('crays.personal-agent.assignment.v1\n'+person).slice(0,48);assert.equal(identity.agentId,agentId);
  const runtime=ROOT+'/'+hash('crays.personal-agent.person-namespace.v1\n'+person)+'/'+agentId,agentDir=runtime+'/agents/'+agentId+'/agent',hostContext=Object.freeze({canonicalPersonId:person,agentId,runtime});
  const scope=Object.freeze({accountId:account.accountId,canonicalPersonId:person,agentId,stateDir:runtime,agentDir,provider:'openai',apiRoute:'openai-chatgpt-responses',modelRef:identity.modelRef});
  await identity.assertCurrent();let snapshot,closed=false;
  try{
   snapshot=await readRuntimeAdmission(hostContext);assert(snapshot&&Buffer.isBuffer(snapshot.configBytes)&&snapshot.configBytes.length<=128*1024&&typeof snapshot.assertCurrent==='function'&&typeof snapshot.close==='function','READONLY_ADMISSION_SNAPSHOT_REQUIRED');
   const pointer=structuredClone(snapshot.pointer),receipt=structuredClone(snapshot.receipt),configBytes=Buffer.from(snapshot.configBytes),config=JSON.parse(configBytes.toString('utf8')),configSha256=hash(configBytes);
   for(const key of ['accountId','canonicalPersonId','agentId']){assert.equal(pointer[key],scope[key]);assert.equal(receipt[key],scope[key]);}
   assert.equal(pointer.runtimeStarted,false);assert.equal(receipt.runtimeStarted,false);assert.equal(receipt.status,'MATERIALIZED_NOT_STARTED','MATERIALIZATION_IS_NOT_STARTUP_ADMISSION');
   assert.equal(pointer.packageSha256,standard.sha256);assert.equal(receipt.packageSha256,standard.sha256);assert.equal(receipt.packageVersion,standard.descriptor.version);assert.equal(pointer.configSha256,configSha256);assert.equal(receipt.configSha256,configSha256);assert(HEX.test(pointer.projectionSha256)&&HEX.test(receipt.artifactVerificationSha256)&&HEX.test(pointer.ownAccountReceiptSha256));assert.equal(receipt.projectionSha256,pointer.projectionSha256);assert.equal(pointer.admissionId,receipt.admissionId);
   assert.equal(receipt.admissionId,hash(JSON.stringify({accountId:scope.accountId,canonicalPersonId:person,agentId,packageSha256:standard.sha256,configSha256,projectionSha256:pointer.projectionSha256,artifacts:receipt.artifactVerificationSha256})));
   assert.deepEqual(receipt.paths,{stateDir:runtime,workspace:runtime+'/workspace',agentDir});assert.deepEqual(Object.keys(config.agents?.entries??{}),[agentId]);const agent=config.agents.entries[agentId];assert.equal(agent.workspace,runtime+'/workspace');assert.equal(agent.agentDir,agentDir);assert.equal(agent.model?.primary,identity.modelRef);assert.deepEqual(agent.model?.fallbacks,[]);
   let firstReady;
   const recheck=async()=>{
    assert(!closed,'SPEECH_HOST_BINDING_CLOSED');await identity.assertCurrent();assert.equal(standardFactory.getPersonalAgentStandardPackage().sha256,standard.sha256,'CURRENT_STANDARD_CHANGED');await snapshot.assertCurrent();
    const ready=await ownAccountAuthority.assertReady(scope);assert(ready&&ready.accountId===scope.accountId&&ready.canonicalPersonId===person&&ready.agentId===agentId&&ready.agentDir===agentDir&&ready.provider==='openai'&&ready.apiRoute===scope.apiRoute&&typeof ready.profileRef==='string'&&ready.profileRef.length>0&&ready.profileRef.length<=200&&!['__proto__','constructor','prototype'].includes(ready.profileRef)&&HEX.test(ready.receiptSha256)&&Number.isFinite(ready.expiresAtMs)&&ready.expiresAtMs>Date.now(),'EXACT_CURRENT_OWN_NATIVE_ACCOUNT_REQUIRED');
    assert.equal(ready.receiptSha256,pointer.ownAccountReceiptSha256,'PERSISTED_OWN_ACCOUNT_OBSERVATION_REQUIRES_REFRESH');assert.equal(ready.expiresAtMs,pointer.ownAccountExpiresAtMs);
    if(firstReady)assert.deepEqual(ready,firstReady,'OWN_NATIVE_ACCOUNT_CHANGED');
    const selection=await ownAccountAuthority.assertConfigSelectsOwnProfile(scope,config,ready.profileRef);assert(selection&&selection.agentDir===agentDir&&selection.modelRef===identity.modelRef&&selection.source==='OWN_AGENT_STORE_ONLY');assert.deepEqual(selection.profileIds,[ready.profileRef]);
    // A materializer receipt is not operational permission. Reuse the separately admitted actual host gate.
    const admission=Object.freeze({admissionId:receipt.admissionId,packageSha256:standard.sha256,configSha256,projectionSha256:pointer.projectionSha256,artifactVerificationSha256:receipt.artifactVerificationSha256});
    const hostResult=await assertHostAdmissionCurrent(hostContext,admission);assert.equal(hostResult,undefined,'HOST_ADMISSION_ASSERTION_MUST_THROW_OR_RETURN_VOID');
    await snapshot.assertCurrent();await identity.assertCurrent();firstReady??=structuredClone(ready);
   };
   await recheck();
   return Object.freeze({hostContext,assertConfig:config=>{assert(!closed,'SPEECH_HOST_BINDING_CLOSED');assert.equal(hash(Buffer.from(JSON.stringify(config)+'\n')),configSha256,'RUNTIME_CONFIG_NOT_CURRENT_ADMISSION');},assertCurrent:recheck,close:async()=>{if(!closed){closed=true;await snapshot.close();}}});
  }catch(e){if(snapshot&&!closed){closed=true;try{await snapshot.close();}catch{throw Object.assign(new Error('SPEECH_HOST_SNAPSHOT_CLEANUP_UNCONFIRMED'),{code:'SPEECH_HOST_SNAPSHOT_CLEANUP_UNCONFIRMED'});}}throw e;}
 };
}

/** Host boundary for generation only: delivery may consume a result only after currentness passes.
 * Does not dispatch messages. A generated private file is not claimed absent if a later check fails.
 */
export async function withCurrentPersonalSpeechHostContext({resolveContext,runtimeConfig,signal,produceNativeAudioOnly}){
 assert(typeof resolveContext==='function'&&typeof produceNativeAudioOnly==='function');let binding,started=false;
 try{
  signal?.throwIfAborted();binding=await resolveContext();binding.assertConfig(runtimeConfig);await binding.assertCurrent();signal?.throwIfAborted();
  started=true;const result=await produceNativeAudioOnly(binding.hostContext);signal?.throwIfAborted();binding.assertConfig(runtimeConfig);await binding.assertCurrent();return result;
 }catch{
  const code=signal?.aborted?'PERSONAL_SPEECH_CANCELLED':started?'PERSONAL_SPEECH_OUTCOME_UNCONFIRMED':'PERSONAL_SPEECH_CONTEXT_UNAVAILABLE';
  throw Object.assign(new Error(signal?.aborted?'The audio request was cancelled.':'The audio request could not be completed.'),{code});
 }finally{if(binding)try{await binding.close();}catch{throw Object.assign(new Error('The audio request could not be completed.'),{code:'PERSONAL_SPEECH_CONTEXT_CLEANUP_UNCONFIRMED'});}}
}
