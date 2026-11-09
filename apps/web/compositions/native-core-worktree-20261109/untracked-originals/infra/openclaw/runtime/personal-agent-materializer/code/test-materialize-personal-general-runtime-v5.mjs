/** Prepared synthetic-host component tests. Actual readonly Root artifacts are always UID0 checked.
 * Own-account/Core/native-validator connectors below are explicit synthetic host fixtures, NOT authenticated production proof. */
import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs/promises';import os from'node:os';import path from'node:path';import{constants as C}from'node:fs';import{spawn}from'node:child_process';import{acquireRuntimeJournal}from'./runtime-journal.mjs';
import *as standardFactory from'/srv/crays/worktrees/openclaw-phase5-019ff983/scripts/personal-agent-standard-package-v20/new-personal-agent-baseline-config.mjs';
import catalog from'./HOST_ARTIFACT_CATALOG.json'with{type:'json'};import baseCatalog from'./BASE_HOST_ARTIFACT_CATALOG.json'with{type:'json'};import{projectedStandard,projectionSha256}from'./apply-shared-default-inheritance.mjs';import{sha,verifySharedArtifacts}from'./verify-shared-artifacts.mjs';import{createGeneralPersonalRuntimeMaterializerCandidate as createPersonalRuntimeMaterializer}from'./materialize-personal-general-runtime.candidate-v5.mjs';
const standard=standardFactory.getPersonalAgentStandardPackage();
async function fixture(t,options={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'synthetic-personal-runtime-'));await fs.chmod(root,0o700);t.after(async()=>{await options.beforeCleanup?.();await fs.rm(root,{recursive:true,force:true});});let opens=0,checks=0,validated=0;const expiresAtMs=Date.now()+300000;
 const person=n=>'synthetic-person-'+n,agent=n=>'personal-'+sha('crays.personal-agent.assignment.v1\n'+person(n)).slice(0,48);
 const resolveCommittedAssignment=async input=>({accountId:input.accountId,canonicalPersonId:person(input.accountId),agentId:agent(input.accountId),packageVersion:standard.descriptor.version,packageSha256:standard.sha256,modelRef:'openai/gpt-6-astra',assertCurrent:async()=>{if(options.revokeCore)throw Error('SYNTHETIC_CORE_REVOKED');}});
 const ownAccountAuthority={assertReady:async scope=>{checks++;const physical=path.join(root,scope.stateDir.slice('/var/lib/crays-personal-agents/'.length));let names=[];try{names=await fs.readdir(physical);}catch(e){if(e.code!=='ENOENT')throw e;}if(options.pending||options.revokeAccount||options.revokeWhenCurrentPresent&&names.includes('CURRENT_ADMISSION.json')||options.revokeWhenPointerTemp&&names.some(n=>n.startsWith('.current-')))throw Object.assign(Error('SYNTHETIC_PENDING_OWN_ACCOUNT'),{code:'PENDING_OWN_ACCOUNT'});return{accountId:scope.accountId,canonicalPersonId:scope.canonicalPersonId,agentId:options.foreign?'foreign':scope.agentId,agentDir:scope.agentDir,provider:'openai',apiRoute:'openai-chatgpt-responses',profileRef:'synthetic-native-profile',receiptSha256:options.receiptSha256??'1'.repeat(64),expiresAtMs,...options.extraAuthority};},assertConfigSelectsOwnProfile:async(scope,config,profileRef)=>{assert.deepEqual(config.auth.order,{openai:[profileRef]});assert.deepEqual(config.auth.profiles,{[profileRef]:{provider:'openai',mode:'oauth'}});assert.equal(config.agents.entries[scope.agentId].model.primary,scope.modelRef);return{agentDir:scope.agentDir,modelRef:scope.modelRef,profileIds:[profileRef],source:'OWN_AGENT_STORE_ONLY'};}};
 const openRuntimeRoot=async()=>{opens++;const h=await fs.open(root,C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW),s=await h.stat();return{handle:h,logicalRoot:'/var/lib/crays-personal-agents',assertCurrent:async()=>{const a=await fs.lstat(root),b=await h.stat();assert(!a.isSymbolicLink()&&a.ino===s.ino&&a.dev===s.dev&&b.ino===s.ino);}};};
 const validateNativeConfig=async config=>{validated++;assert.equal(config.tools.allow.length,29);assert.equal(config.tools.fs.workspaceOnly,true);assert(!config.channels&&config.auth);if(options.afterValidation)await options.afterValidation();if(options.originalNativeValidator){const originalFile='/srv/crays/openclaw/oca063/owner-test-intent/20261014/dependency-installation/project/node_modules/openclaw/dist/validation-BEEczOwC.mjs';assert.equal(sha(await fs.readFile(originalFile)),'eb2e0c8095accfe6757be1a4a6d874886145dc239c531fd442011bc19b81905d');const {n:validateOriginal}=await import(originalFile);const result=validateOriginal(config,{env:{PATH:'/usr/bin:/bin',HOME:root,OPENCLAW_STATE_DIR:root,OPENCLAW_AGENT_DIR:root+'/synthetic-agent'},pluginValidation:'full',semanticValidation:'strict'});assert.equal(result.ok,true,JSON.stringify(result.issues));return result;}return{ok:!options.invalidSchema};};
 return{root,options,stats:()=>({opens,checks,validated}),materialize:createPersonalRuntimeMaterializer({standardFactory,catalog:options.catalog??catalog,baseCatalog,resolveCommittedAssignment,ownAccountAuthority,openRuntimeRoot,validateNativeConfig}),physical:n=>path.join(root,sha('crays.personal-agent.person-namespace.v1\n'+person(n)),agent(n))};
}

test('V5 persists 29 tools and 32 instructions via actual Root artifacts, with separate own auth and idempotent receipt',async t=>{
 const f=await fixture(t,{originalNativeValidator:true}),a=await f.materialize({accountId:'alice'}),b=await f.materialize({accountId:'alice'});
 assert.equal(a.status,'MATERIALIZED_NOT_STARTED');assert.equal(a.toolCount,29);assert.equal(a.skillCount,32);
 assert.equal(a.idempotent,false);assert.equal(b.idempotent,true);assert.equal(a.admissionId,b.admissionId);
 const dir=f.physical('alice'),current=JSON.parse(await fs.readFile(path.join(dir,'CURRENT_ADMISSION.json')));
 assert.equal(current.admissionId,a.admissionId);
 const raw=await fs.readFile(path.join(dir,'runtime-admissions',a.admissionId,'config.json'));
 assert.equal(sha(raw),a.configSha256);const config=JSON.parse(raw);
 assert.deepEqual(config.agents.entries[a.agentId].skills.slice(-3),['crays-weather-public','crays-personal-translation','crays-short-video-explanation']);
 assert.equal(config.tools.allow.length,29);assert(!config.tools.allow.includes('automations'));
 assert(!config.channels);assert.deepEqual(config.auth.order.openai,['synthetic-native-profile']);
 assert.equal(a.credentialsCopied,false);assert.equal(a.runtimeStarted,false);assert.equal(a.nativeToolRegistryLoaded,false);
 assert.equal(a.userAcceptanceProven,false);assert.equal(a.nativeHostMountsQualifiedForFuturePerson,false);
 assert.equal((await fs.stat(path.join(dir,'runtime-admissions',a.admissionId,'config.json'))).mode&0o777,0o600);
});
test('V5 pending own login returns before private root creation',async t=>{
 const f=await fixture(t,{pending:true});assert.equal((await f.materialize({accountId:'alice'})).status,'PENDING_OWN_ACCOUNT');
 assert.equal(f.stats().opens,0);assert.deepEqual(await fs.readdir(f.root),[]);
});
test('V5 keeps two synthetic canonical persons and their durable configuration separate',async t=>{
 const f=await fixture(t),a=await f.materialize({accountId:'alice'}),b=await f.materialize({accountId:'bob'});
 assert.notEqual(a.admissionId,b.admissionId);assert.notEqual(a.paths.workspace,b.paths.workspace);
 const ac=JSON.parse(await fs.readFile(path.join(f.physical('alice'),'CURRENT_ADMISSION.json')));
 const bc=JSON.parse(await fs.readFile(path.join(f.physical('bob'),'CURRENT_ADMISSION.json')));
 assert.equal(ac.canonicalPersonId,a.canonicalPersonId);assert.equal(bc.canonicalPersonId,b.canonicalPersonId);
});
test('V5 revocation before CAS leaves no current pointer and removes only own journal temp',async t=>{
 const f=await fixture(t,{revokeWhenPointerTemp:true});await assert.rejects(()=>f.materialize({accountId:'alice'}));
 const dir=f.physical('alice');assert(!(await fs.readdir(dir)).some(n=>n.startsWith('.current-')));
 await assert.rejects(fs.stat(path.join(dir,'CURRENT_ADMISSION.json')),{code:'ENOENT'});
});
test('V5 validator rejection precedes private filesystem writes',async t=>{
 const f=await fixture(t,{invalidSchema:true});await assert.rejects(()=>f.materialize({accountId:'alice'}));assert.equal(f.stats().opens,0);
});
