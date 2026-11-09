/** SOURCE ONLY server helper. Not registered by server-materializer; no default switch or admission.
 * Call only between the existing Core/own-model rechecks and journal/CAS publication.
 * finalProjection is a fixed trusted deployment input, never request/model JSON or a grant.
 * This helper verifies source composition/artifacts only; original host/identity authority remains mandatory.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {composeApprovedGeneralBaseline} from './approved-general-baseline-composition-v4-real-factory/compose-approved-general-baseline.mjs';
import {verifySharedArtifacts} from './verify-shared-artifacts.mjs';
import BASE from './approved-general-baseline-composition-v3/INPUT_PROJECTED_RUNTIME_STANDARD.json' with {type:'json'};
const encode=x=>Array.isArray(x)?'['+x.map(encode).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+encode(x[k])).join(',')+'}':JSON.stringify(x);
const hash=x=>createHash('sha256').update(x).digest('hex');
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const missing=()=>{throw Object.assign(Error('PENDING_GENERAL_BASELINE_CATALOGUE'),{code:'PENDING_GENERAL_BASELINE_CATALOGUE'});};
const exact=(x,keys)=>assert(x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k)),'EXACT_GENERAL_BASELINE_DEPLOYMENT_INPUT_REQUIRED');
/** Deterministic public projection checks; no filesystem effects and no invented immutable roots.
 * Returned aliases describe a required future readonly mount contract, never proof of a mounted alias.
 */
export function composeApprovedGeneralRuntime(base,context,finalProjection){
 if(!finalProjection)missing();
 exact(finalProjection,['baseProjectedSha256','standard','catalog','instructionAliases']);
 const {standard,catalog,instructionAliases}=finalProjection;
 assert.equal(finalProjection.baseProjectedSha256,BASE.sha256,'EXACT_PREVIOUS_PROJECTED_BASELINE_REQUIRED');
 exact(standard,['descriptor','sha256']);assert(hex(standard.sha256));assert.equal(hash(encode(standard.descriptor)),standard.sha256,'GENERAL_DESCRIPTOR_DIGEST_MISMATCH');
 assert(catalog&&catalog.packageSha256===standard.sha256&&Array.isArray(catalog.skills)&&Array.isArray(catalog.plugins),'EXACT_FINAL_ARTIFACT_CATALOGUE_REQUIRED');
 assert(Array.isArray(instructionAliases),'EXACT_FINAL_INSTRUCTION_ALIASES_REQUIRED');
 const composed=composeApprovedGeneralBaseline(base,context),config=composed.candidateConfig;
 assert.deepEqual(standard.descriptor.tools,config.tools.allow,'FINAL_DESCRIPTOR_TOOLS_MISMATCH');
 assert.deepEqual(standard.descriptor.skills,config.agents.entries[context.agentId].skills,'FINAL_DESCRIPTOR_SKILLS_MISMATCH');
 assert.equal(standard.descriptor.tools.length,composed.toolCount);assert.equal(standard.descriptor.skills.length,composed.instructionCount);
 assert.equal(new Set(catalog.plugins.map(p=>p.pluginId)).size,catalog.plugins.length);
 assert(catalog.plugins.every(p=>config.plugins.allow.includes(p.pluginId)),'UNKNOWN_FINAL_PLUGIN_ID');
 const requiredPluginIds=[...BASE.descriptor.plugins.map(p=>p.id),'expedia-openclaw'];
 assert.deepEqual(catalog.plugins.map(p=>p.pluginId).sort(),requiredPluginIds.sort(),'EVERY_APPROVED_GENERAL_PLUGIN_MUST_BE_PRESENT');
 assert.deepEqual(standard.descriptor.plugins.map(p=>p.id).sort(),requiredPluginIds.sort(),'EVERY_APPROVED_GENERAL_PLUGIN_DESCRIPTOR_REQUIRED');
 assert.deepEqual(config.plugins.load.paths.slice().sort(),catalog.plugins.map(p=>p.root).sort(),'EVERY_FINAL_PLUGIN_ROOT_MUST_BE_VERIFIED');
 const names=catalog.skills.map(s=>s.name??s.skillId);assert.equal(new Set(names).size,names.length);
 assert.deepEqual(names.slice().sort(),standard.descriptor.skills.filter(s=>s!=='weather').slice().sort(),'EVERY_FINAL_INSTRUCTION_MUST_BE_VERIFIED');
 const actualDirs=config.skills.load.extraDirs;assert.equal(new Set(actualDirs).size,actualDirs.length);
 const sourceDirs=catalog.skills.map(s=>s.root+'/skills');assert.equal(new Set(sourceDirs).size,sourceDirs.length);
 for(const alias of instructionAliases){
  exact(alias,['runtimePath','artifactPath']);assert(actualDirs.includes(alias.runtimePath)&&sourceDirs.includes(alias.artifactPath),'UNKNOWN_INSTRUCTION_ALIAS');
  assert(alias.runtimePath.startsWith(context.runtime+'/code/'),'CANONICAL_PERSON_INSTRUCTION_ALIAS_REQUIRED');
 }
 assert.equal(new Set(instructionAliases.map(x=>x.runtimePath)).size,instructionAliases.length);
 const resolved=actualDirs.map(p=>instructionAliases.find(x=>x.runtimePath===p)?.artifactPath??p);
 assert.deepEqual(resolved.slice().sort(),sourceDirs.slice().sort(),'EVERY_LOADED_INSTRUCTION_DIRECTORY_MUST_BIND_EXACT_ARTIFACT');
 const projectionSha256=hash(encode({baseProjectedSha256:BASE.sha256,standardSha256:standard.sha256,instructionAliases}));
 return {config,standard,catalog,projectionSha256,pendingBranches:composed.pendingBranches??[],toolCount:composed.toolCount,skillCount:composed.instructionCount,runtimeStarted:false,nativeToolRegistryLoaded:false,userAcceptanceProven:false,nativeReadonlyAliasesVerified:false};
}
/** Original strict UID0/non-writable immutable artifact verifier; no callback/test bypass. */
export async function prepareApprovedGeneralRuntime(base,context,finalProjection){
 const prepared=composeApprovedGeneralRuntime(base,context,finalProjection);
 const artifacts=await verifySharedArtifacts(prepared.standard,prepared.catalog);
 assert.deepEqual(artifacts.skills.map(x=>x.name).sort(),prepared.standard.descriptor.skills.filter(x=>x!=='weather').sort());
 return {...prepared,artifacts,status:'GENERAL_BASELINE_ARTIFACTS_VERIFIED_NOT_ADMITTED',defaultFactorySwitched:false,ownAccountReadinessVerified:false};
}
