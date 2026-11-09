/** Inactive trusted-host source helper. No registration, default switch, runtime or authority. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {composeApprovedGeneralRuntime as composeLegacy} from './prepare-approved-general-runtime.candidate-v3.mjs';
import {normalizeDormantGeneralFactoryPolicy} from './prepare-channel-independent-general-runtime.candidate-v2.mjs';
import {composeFixedGeneralInstructions} from './approved-general-baseline-composition-v5-translation-video/compose-approved-general-baseline.mjs';
import {verifySharedArtifacts} from './verify-shared-artifacts.mjs';
import {verifyFixedGeneralGuides,fixedGeneralGuideBindings} from './verify-fixed-general-guides-v1.mjs';
import DEPLOYMENT from './approved-general-baseline-v5-catalogue-source-v1/FINAL_CHANNEL_INDEPENDENT_PROJECTION.json' with {type:'json'};
const FIXED=structuredClone(DEPLOYMENT),MAX_SYNC_COMPOSE_MS=1000;
const encode=x=>Array.isArray(x)?'['+x.map(encode).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+encode(x[k])).join(',')+'}':JSON.stringify(x);
const hash=x=>createHash('sha256').update(x).digest('hex');
const exact=(x,keys)=>assert(x&&typeof x==='object'&&!Array.isArray(x)&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k)),'EXACT_V5_HOST_DEPLOYMENT_INPUT_REQUIRED');
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function channelIndependent(base){assert(!base?.channels?.whatsapp&&!base?.bindings?.some(b=>b.match?.channel==='whatsapp'),'V5_CHANNEL_INDEPENDENT_ONLY_OWN_WHATSAPP_REQUIRES_SEPARATE_ADMISSION');assert(!base?.tools?.allow?.includes('automations'),'V5_UNCONNECTED_REMINDER_GRANT_DENIED');}
function resolvedProjection(context){
 const legacy=structuredClone(FIXED.legacyProjection);
 const instructionAliases=legacy.instructionAliasSuffixes.map(a=>({runtimePath:context.runtime+a.runtimeSuffix,artifactPath:a.artifactPath}));
 delete legacy.instructionAliasSuffixes;legacy.instructionAliases=instructionAliases;
 return {legacyProjection:legacy,standard:structuredClone(FIXED.standard),fixedGuides:structuredClone(FIXED.fixedGuides)};
}
function projectionContract(projection){
 exact(projection,['legacyProjection','standard','fixedGuides']);const legacy=projection.legacyProjection;
 exact(legacy,['baseProjectedSha256','standard','catalog','instructionAliases']);
 assert.equal(legacy.baseProjectedSha256,FIXED.legacyProjection.baseProjectedSha256);
 assert.deepEqual(legacy.standard,FIXED.legacyProjection.standard,'EXACT_LEGACY_STANDARD_REQUIRED');assert.deepEqual(legacy.catalog,FIXED.legacyProjection.catalog,'EXACT_LEGACY_CATALOGUE_REQUIRED');
 assert.deepEqual(projection.standard,FIXED.standard,'EXACT_FINAL_V5_STANDARD_REQUIRED');assert.deepEqual(projection.fixedGuides,fixedGeneralGuideBindings(),'EXACT_THREE_FIXED_GUIDES_REQUIRED');
 assert.equal(legacy.standard.descriptor.skills.length,29);assert.equal(legacy.standard.descriptor.tools.length,29);
 assert.equal(legacy.catalog.packageSha256,legacy.standard.sha256,'LEGACY_VERIFIER_PACKAGE_BINDING_UNCHANGED');
 assert.deepEqual(projection.standard.descriptor,{...legacy.standard.descriptor,skills:[...legacy.standard.descriptor.skills,...projection.fixedGuides.map(a=>a.name)]},'ONLY_FIXED_THREE_INSTRUCTIONS_ADDED');
 assert.equal(hash(encode(projection.standard.descriptor)),projection.standard.sha256,'FINAL_DESCRIPTOR_DIGEST_MISMATCH');
}
/** Pure public deployment composition; its callback guards only synchronous host scope. */
export function composeApprovedGeneralRuntime(base,context,projection,{assertInvocationCurrent}={}){
 if(!projection)throw Object.assign(Error('PENDING_GENERAL_BASELINE_CATALOGUE'),{code:'PENDING_GENERAL_BASELINE_CATALOGUE'});
 channelIndependent(base);projectionContract(projection);
 assert.deepEqual(projection.legacyProjection.instructionAliases,resolvedProjection(context).legacyProjection.instructionAliases,'EXACT_CANONICAL_PERSON_LEGACY_ALIASES_REQUIRED');
 const legacy=composeLegacy(base,context,projection.legacyProjection);assert.equal(legacy.toolCount,29);assert.equal(legacy.skillCount,29);
 const config=composeFixedGeneralInstructions(legacy.config,{agentId:context.agentId,assertInvocationCurrent});
 assert.deepEqual(config.tools.allow,projection.standard.descriptor.tools);assert.deepEqual(config.agents.entries[context.agentId].skills,projection.standard.descriptor.skills);
 assert.strictEqual(config.tools,legacy.config.tools);assert.strictEqual(config.plugins,legacy.config.plugins);assert.strictEqual(config.auth,legacy.config.auth);assert.strictEqual(config.channels,legacy.config.channels);assert.strictEqual(config.bindings,legacy.config.bindings);
 assert.deepEqual(config.skills.load.extraDirs,[...legacy.config.skills.load.extraDirs,...projection.fixedGuides.map(a=>a.extraDir)],'EXACT_LEGACY_PLUS_THREE_ARTIFACT_DIRECTORIES_REQUIRED');
 return {config,standard:structuredClone(projection.standard),legacyProjection:structuredClone(projection.legacyProjection),fixedGuides:structuredClone(projection.fixedGuides),projectionSha256:hash(encode({legacyProjectionSha256:legacy.projectionSha256,standardSha256:projection.standard.sha256,fixedGuides:projection.fixedGuides})),pendingBranches:legacy.pendingBranches,toolCount:29,skillCount:32,runtimeStarted:false,nativeToolRegistryLoaded:false,userAcceptanceProven:false,nativeReadonlyAliasesVerified:false,defaultFactorySwitched:false,ownAccountReadinessVerified:false};
}
/** Original strict legacy verifier plus strict fixed-three verifier; no injection or bypass. */
export async function verifyApprovedGeneralRuntimeArtifacts(prepared){
 projectionContract({legacyProjection:prepared.legacyProjection,standard:prepared.standard,fixedGuides:prepared.fixedGuides});
 const legacy=await verifySharedArtifacts(prepared.legacyProjection.standard,prepared.legacyProjection.catalog);
 assert.deepEqual(legacy.skills.map(s=>s.name).sort(),prepared.legacyProjection.standard.descriptor.skills.filter(s=>s!=='weather').sort());
 const fixedGuides=await verifyFixedGeneralGuides(prepared.fixedGuides),skills=[...legacy.skills,...fixedGuides.skills];
 assert.deepEqual(skills.map(s=>s.name).sort(),prepared.standard.descriptor.skills.filter(s=>s!=='weather').sort());
 return {...legacy,skills,legacy,fixedGuides,sha256:hash(encode({legacy:legacy.sha256,fixedGuides:fixedGuides.sha256})),nativeReadonlyAliasesVerified:false,authorityGranted:false};
}
function authoritySnapshot(record,context){
 const keys=['accountId','canonicalPersonId','agentId','agentDir','provider','apiRoute','profileRef','receiptSha256','expiresAtMs'];exact(record,keys);
 assert(record.canonicalPersonId===context.canonicalPersonId&&record.agentId===context.agentId&&record.agentDir===context.runtime+'/agents/'+context.agentId+'/agent','HOST_RECHECK_PERSON_AGENT_SCOPE_MISMATCH');
 assert(typeof record.accountId==='string'&&record.accountId.length>0&&record.accountId.length<=200,'HOST_RECHECK_ACCOUNT_REQUIRED');
 assert(record.provider==='openai'&&record.apiRoute==='openai-chatgpt-responses','EXISTING_OWN_PROVIDER_ROUTE_REQUIRED');
 assert(typeof record.profileRef==='string'&&record.profileRef.length>0&&record.profileRef.length<=200&&!['__proto__','constructor','prototype'].includes(record.profileRef)&&hex(record.receiptSha256),'HOST_RECHECK_PROFILE_RECEIPT_REQUIRED');
 assert(Number.isFinite(record.expiresAtMs)&&record.expiresAtMs>Date.now(),'HOST_RECHECK_RECEIPT_EXPIRED');return Object.freeze({...record});
}
/** Await genuine Core+own-account recheck; scope callback never replaces that authority. */
export async function prepareApprovedGeneralRuntime(base,context,projection,{recheckHost}={}){
 assert(typeof recheckHost==='function','REAL_ASYNC_HOST_RECHECK_REQUIRED');channelIndependent(base);
 const before=authoritySnapshot(await recheckHost(),context),started=Date.now();let active=true,prepared;
 const assertSynchronousCompositionCurrent=()=>{assert(active,'SYNC_COMPOSITION_SCOPE_CLOSED');assert(Date.now()<before.expiresAtMs,'HOST_RECHECK_RECEIPT_EXPIRED');assert(Date.now()-started<=MAX_SYNC_COMPOSE_MS,'SYNC_COMPOSITION_SCOPE_EXPIRED');};
 try{assertSynchronousCompositionCurrent();prepared=composeApprovedGeneralRuntime(base,context,projection,{assertInvocationCurrent:assertSynchronousCompositionCurrent});assertSynchronousCompositionCurrent();}
 finally{active=false;}
 // No await happens while the lexical composition scope is active.
 const artifacts=await verifyApprovedGeneralRuntimeArtifacts(prepared);
 const after=authoritySnapshot(await recheckHost(),context);
 for(const k of ['accountId','canonicalPersonId','agentId','agentDir','provider','apiRoute','profileRef','receiptSha256'])assert.equal(after[k],before[k],'HOST_RECHECK_BINDING_CHANGED');
 return {...prepared,artifacts,status:'GENERAL_V5_FIXED_GUIDES_ARTIFACTS_VERIFIED_NOT_ADMITTED',hostRecheckedBeforeAndAfterArtifactIO:true,synchronousCompositionScopeClosed:true,defaultFactorySwitched:false,ownAccountReadinessVerified:false};
}
/** Fixed trusted deployment entry. No catalogue/credential/authority from request JSON. */
export async function prepareChannelIndependentGeneralRuntime(base,context,{recheckHost}={}){
 channelIndependent(base);const normalized=normalizeDormantGeneralFactoryPolicy(base,context);
 return prepareApprovedGeneralRuntime(normalized,context,resolvedProjection(context),{recheckHost});
}
