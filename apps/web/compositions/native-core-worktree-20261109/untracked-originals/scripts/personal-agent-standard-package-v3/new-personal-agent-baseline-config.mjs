/** Pure V3 addon: reuse immutable V2/107; no I/O, identity issuance or runtime activation. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import PACKAGE from './STANDARD_PACKAGE.json' with {type:'json'};
import {getPersonalAgentStandardPackage as getV2} from '../personal-agent-standard-package-v2/new-personal-agent-baseline-config.mjs';
import {createNewPersonalAgentStandardConfigWith107 as createNewPersonalAgentStandardConfigWith107V2} from '../personal-agent-standard-package-v2/with-binding107.mjs';
const encode=x=>Array.isArray(x)?'['+x.map(encode).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+encode(x[k])).join(',')+'}':JSON.stringify(x);
const hash=x=>createHash('sha256').update(x).digest('hex');
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
freeze(PACKAGE);const PACKAGE_SHA=hash(encode(PACKAGE));const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function exact(x,keys){assert(x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x)));const descriptors=Object.getOwnPropertyDescriptors(x),actual=Reflect.ownKeys(descriptors);assert(actual.length===keys.length&&actual.every(k=>typeof k==='string'&&keys.includes(k)&&Object.hasOwn(descriptors[k],'value')),'Exact plain data keys required');}
export function getPersonalAgentStandardPackage(){return freeze({descriptor:structuredClone(PACKAGE),sha256:PACKAGE_SHA});}
export function createNewPersonalAgentStandardConfigWith107(input){
 exact(input,['canonicalPersonId','agentId','expectedPackageVersion','expectedPackageSha256','modelAccount','artifactBindings']);
 assert.equal(input.expectedPackageVersion,PACKAGE.version);assert.equal(input.expectedPackageSha256,PACKAGE_SHA);
 assert(Array.isArray(input.artifactBindings)&&input.artifactBindings.length===4,'Exact four artifact bindings required');
 const bindings=PACKAGE.plugins.map(plugin=>{
  const matches=input.artifactBindings.filter(b=>b?.pluginId===plugin.id);assert.equal(matches.length,1,'Unique exact plugin binding required');const b=matches[0];
  exact(b,['pluginId','codeSetSha256','manifestSha256','state','admissionReceiptSha256']);assert.equal(b.codeSetSha256,plugin.codeSetSha256);
  assert(['SOURCE_ASSIGNED','INSTALLATION_ADMISSION_REFERENCE_SUPPLIED'].includes(b.state));
  if(b.state==='SOURCE_ASSIGNED'){assert.equal(b.manifestSha256,null);assert.equal(b.admissionReceiptSha256,null);}
  else {assert(digest(b.manifestSha256)&&digest(b.admissionReceiptSha256));const expected=plugin.expectedArtifactManifestSha256??plugin.knownInstalledManifestSha256;if(expected!==null)assert.equal(b.manifestSha256,expected,'Exact retained manifest reference required');}
  return {...b,tool:plugin.tool,proposedLoadPath:b.manifestSha256?plugin.artifactRoot+'/'+b.manifestSha256:null,referenceVerifiedByFactory:false};
 });
 const v2=getV2();
 const prior=createNewPersonalAgentStandardConfigWith107V2({...input,expectedPackageVersion:v2.descriptor.version,expectedPackageSha256:v2.sha256,artifactBindings:input.artifactBindings.filter(b=>v2.descriptor.plugins.some(p=>p.id===b.pluginId))});
 const config=structuredClone(prior.proposal.nativeConfigFragment),agent=config.agents.entries[input.agentId];
 const added=bindings.slice(2),registered=added.filter(b=>b.proposedLoadPath!==null);
 for(const b of registered){for(const policy of [config.tools,agent.tools])policy.allow.push(b.tool);config.plugins.allow.push(b.pluginId);config.plugins.load.paths.push(b.proposedLoadPath);config.plugins.entries[b.pluginId]={enabled:true};}
 for(const skill of PACKAGE.addedSkillAssignments){agent.skills.push(skill.skillId);config.skills.load.extraDirs.push(skill.proposedExtraDir);config.skills.entries[skill.skillId]={enabled:true};}
 return freeze({...prior,schema:'crays.new-personal-agent.standard-binding107-proposal.v3',
  proposal:{...prior.proposal,standardPackage:{version:PACKAGE.version,sha256:PACKAGE_SHA,status:PACKAGE.status},assignedTools:[...PACKAGE.tools],artifactAssignments:bindings,nativeConfigFragment:config},
  addedSkillAssignments:structuredClone(PACKAGE.addedSkillAssignments),
  partialCapabilitySupport:[{capabilityId:'B2C-CAP-103',tool:'crays_shared_expenses',scope:'Exact private calculation only; no connected group ledger, write or payment authority',fullOutcomeProven:false}],
  assignmentScope:'107_CAPABILITY_INTENT_EIGHT_ASSIGNED_TOOLS_NOT_RUNTIME_AUTHORITY'});
}
