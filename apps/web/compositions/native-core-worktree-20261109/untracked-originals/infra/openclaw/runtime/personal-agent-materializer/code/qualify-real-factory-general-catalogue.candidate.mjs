/** Pure original V20 factory + actual Root artifacts. No native SDK, private store, Core database or runtime start. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as factory from '../../../../../scripts/personal-agent-standard-package-v20/new-personal-agent-baseline-config.mjs';
import BASECAT from './BASE_HOST_ARTIFACT_CATALOG.json' with {type:'json'};
import {sha,verifySharedArtifacts} from './verify-shared-artifacts.mjs';
import {applySharedDefaultInheritance} from './apply-shared-default-inheritance.mjs';
import {prepareChannelIndependentGeneralRuntime} from './prepare-channel-independent-general-runtime.candidate-v2.mjs';
const standard=factory.getPersonalAgentStandardPackage();
const baseArtifacts=await verifySharedArtifacts(standard,BASECAT);
const results=[];
for(const canonicalPersonId of ['general-original-factory-synthetic-a','general-original-factory-synthetic-b']) {
 const agentId='personal-'+sha('crays.personal-agent.assignment.v1\n'+canonicalPersonId).slice(0,48);
 const runtime='/var/lib/crays-personal-agents/'+sha('crays.personal-agent.person-namespace.v1\n'+canonicalPersonId)+'/'+agentId;
 const full=factory.createNewPersonalAgentStandardConfigWith124({canonicalPersonId,agentId,expectedPackageVersion:standard.descriptor.version,expectedPackageSha256:standard.sha256,modelAccount:{canonicalPersonId,agentId,provider:'openai',apiRoute:'openai-chatgpt-responses',modelRef:'openai/gpt-6-astra',state:'OWN_ACCOUNT_REFERENCE_SUPPLIED',readinessReceiptSha256:'1'.repeat(64)},artifactBindings:standard.descriptor.plugins.map(p=>({pluginId:p.id,codeSetSha256:p.codeSetSha256,manifestSha256:baseArtifacts.plugins.find(a=>a.pluginId===p.id).manifestSha256,state:'INSTALLATION_ADMISSION_REFERENCE_SUPPLIED',admissionReceiptSha256:baseArtifacts.sha256}))});
 const base=applySharedDefaultInheritance(structuredClone(full.proposal.nativeConfigFragment),{agentId,basePackageSha256:standard.sha256});
 assert(!base.auth&&!base.channels);
 const out=await prepareChannelIndependentGeneralRuntime(base,{canonicalPersonId,agentId,runtime});
 assert.equal(out.toolCount,29);assert.equal(out.skillCount,29);assert(!out.config.auth&&!out.config.channels);
 assert.equal(out.artifacts.plugins.length,22);assert.equal(out.artifacts.skills.length,28);
 results.push({syntheticPerson:canonicalPersonId,status:out.status,toolCount:out.toolCount,skillCount:out.skillCount,plugins:out.artifacts.plugins.length,instructionPackages:out.artifacts.skills.length,projectionSha256:out.projectionSha256,artifactVerificationSha256:out.artifacts.sha256,ownRuntime:runtime});
}
const result={schema:'crays.chuck.original-factory-general-catalogue-proof.v1',recordedAtUtc:new Date().toISOString(),status:'ORIGINAL_FACTORY_AND_ACTUAL_ROOT_GENERAL_CATALOGUE_PASS_NOT_RUNTIME_ADMISSION',originalFactoryUsed:true,actualBaseArtifactsVerified:true,syntheticPersonContexts:2,results,privateFilesystemWritten:false,ownAccountReadinessVerified:false,coreDatabaseCalled:false,nativeValidatorCalled:false,defaultFactorySwitched:false,runtimeStarted:false,realUserAcceptance:false};
await fs.writeFile(new URL('../../../../../docs/architecture/evidence/CHUCK_GENERAL_BASELINE_ORIGINAL_FACTORY_ACTUAL_CATALOGUE_PASS_2026_10_19.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
