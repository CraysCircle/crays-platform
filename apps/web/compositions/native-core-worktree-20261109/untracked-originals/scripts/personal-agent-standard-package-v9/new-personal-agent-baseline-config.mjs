/** Pure proposed V9: QR-create + seven-format component source; unchanged124 obligations/7skill IDs, every own model grant pending. */
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import PACKAGE from './STANDARD_PACKAGE.json' with {type:'json'};
import {getPersonalAgentStandardPackage as getV8,createNewPersonalAgentStandardConfigWith124 as createV8} from '../personal-agent-standard-package-v8/new-personal-agent-baseline-config.mjs';
const encode=x=>Array.isArray(x)?'['+x.map(encode).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+encode(x[k])).join(',')+'}':JSON.stringify(x);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const exact=(x,keys)=>{assert(x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x)));const ds=Object.getOwnPropertyDescriptors(x),ks=Reflect.ownKeys(ds);assert(ks.length===keys.length&&ks.every(k=>typeof k==='string'&&keys.includes(k)&&Object.hasOwn(ds[k],'value')),'Exact plain data keys required');};
freeze(PACKAGE);const SHA=createHash('sha256').update(encode(PACKAGE)).digest('hex'),hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function getPersonalAgentStandardPackage(){return freeze({descriptor:structuredClone(PACKAGE),sha256:SHA});}
export function createNewPersonalAgentStandardConfigWith124(input){
 exact(input,['canonicalPersonId','agentId','expectedPackageVersion','expectedPackageSha256','modelAccount','artifactBindings']);assert.equal(input.expectedPackageVersion,PACKAGE.version);assert.equal(input.expectedPackageSha256,SHA);assert(Array.isArray(input.artifactBindings)&&input.artifactBindings.length===7,'Exact seven tool artifact bindings required');
 for(const row of input.artifactBindings)exact(row,['pluginId','codeSetSha256','manifestSha256','state','admissionReceiptSha256']);
 const v8=getV8(),qr=PACKAGE.plugins.find(p=>p.id==='crays-qr'),exportsPlugin=PACKAGE.plugins.find(p=>p.id==='crays-document-exports'),oldExports=v8.descriptor.plugins.find(p=>p.id===exportsPlugin.id),skill=PACKAGE.addedSkillAssignments.find(s=>s.skillId===exportsPlugin.id),oldSkill=v8.descriptor.addedSkillAssignments.find(s=>s.skillId===exportsPlugin.id);
 const assignmentFor=plugin=>{
  const matches=input.artifactBindings.filter(b=>b.pluginId===plugin.id);assert.equal(matches.length,1);const b=matches[0];assert.equal(b.codeSetSha256,plugin.codeSetSha256);assert(['SOURCE_ASSIGNED','INSTALLATION_ADMISSION_REFERENCE_SUPPLIED'].includes(b.state));
  if(b.state==='SOURCE_ASSIGNED'){assert.equal(b.manifestSha256,null);assert.equal(b.admissionReceiptSha256,null);}else{assert.equal(b.manifestSha256,plugin.knownInstalledManifestSha256);assert(hex(b.admissionReceiptSha256));}
  return {...b,tool:plugin.tool,proposedLoadPath:b.manifestSha256?plugin.artifactRoot+'/'+b.manifestSha256:null,referenceVerifiedByFactory:false};
 };
 const qrAssignment={...assignmentFor(qr),componentScope:'CREATE_ONLY_FULL_CAP121_OPEN'},exportAssignment=assignmentFor(exportsPlugin);
 // Genuine V8 compatibility intent only. Never present a0.7 admission as an old0.6 admission or reuse credentials.
 const legacyBindings=input.artifactBindings.filter(row=>row.pluginId!==qr.id).map(row=>row.pluginId===exportsPlugin.id?{pluginId:oldExports.id,codeSetSha256:oldExports.codeSetSha256,manifestSha256:null,state:'SOURCE_ASSIGNED',admissionReceiptSha256:null}:row);
 const prior=createV8({...input,expectedPackageVersion:v8.descriptor.version,expectedPackageSha256:v8.sha256,artifactBindings:legacyBindings});
 const config=structuredClone(prior.proposal.nativeConfigFragment),agent=config.agents.entries[input.agentId];
 const skillStageBound=typeof skill.proposedExtraDir==='string'&&typeof skill.proposedArtifactRoot==='string'&&typeof skill.proposedSkillPath==='string'&&hex(skill.artifactManifestSha256Reference);
 for(const plugin of [qr,exportsPlugin]){assert(!config.plugins.allow.includes(plugin.id)&&!config.plugins.load.paths.some(p=>p.includes('/'+plugin.id+'/')));assert(!config.tools.allow.includes(plugin.tool)&&!agent.tools.allow.includes(plugin.tool));}
 const include=(plugin,assignment)=>{for(const policy of [config.tools,agent.tools])policy.allow.push(plugin.tool);config.plugins.allow.push(plugin.id);config.plugins.load.paths.push(assignment.proposedLoadPath);config.plugins.entries[plugin.id]={enabled:true};};
 // Component-local pending stage only: an absent seven-format instruction must not block QR or other independent tools.
 if(exportAssignment.proposedLoadPath!==null&&skillStageBound)include(exportsPlugin,exportAssignment);
 if(qrAssignment.proposedLoadPath!==null)include(qr,qrAssignment);
 if(skillStageBound)config.skills.load.extraDirs=config.skills.load.extraDirs.map(p=>p===oldSkill.proposedExtraDir?skill.proposedExtraDir:p);
 exportAssignment.sharedInstructionStageReferenceSupplied=skillStageBound;exportAssignment.sharedInstructionReferenceVerifiedByFactory=false;exportAssignment.nativeConfigInclusionState=!skillStageBound?'PENDING_SHARED_INSTRUCTION_ROOT_STAGE':exportAssignment.proposedLoadPath===null?'SOURCE_ASSIGNED_NOT_REGISTERED':'REFERENCE_ONLY_NOT_RUNTIME_ADMISSION';
 return freeze({...prior,schema:'crays.new-personal-agent.standard-binding124-proposal.v9',proposal:{...prior.proposal,standardPackage:{version:PACKAGE.version,sha256:SHA,status:PACKAGE.status},assignedTools:[...PACKAGE.tools],artifactAssignments:[...prior.proposal.artifactAssignments.map(row=>row.pluginId===exportsPlugin.id?exportAssignment:row),qrAssignment],capabilityComponentAssignments:structuredClone(PACKAGE.capabilityComponentAssignments),nativeConfigFragment:config},addedSkillAssignments:prior.addedSkillAssignments.map(row=>row.skillId===exportsPlugin.id?structuredClone(skill):row),assignmentScope:'124_CAPABILITY_INTENT_ELEVEN_ASSIGNED_TOOLS_QR_CREATE_AND_SEVEN_FORMAT_SOURCE_PENDING_OWN_ACCOUNT_NOT_RUNTIME_AUTHORITY'});
}
