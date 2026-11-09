/** Pure V10 source intent: add personal legal chess/PNG; no runtime/user-account admission. */
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import PACKAGE from './STANDARD_PACKAGE.json' with {type:'json'};
import {getPersonalAgentStandardPackage as getV9,createNewPersonalAgentStandardConfigWith124 as createV9} from '../personal-agent-standard-package-v9/new-personal-agent-baseline-config.mjs';
const encode=x=>Array.isArray(x)?'['+x.map(encode).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+encode(x[k])).join(',')+'}':JSON.stringify(x);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const exact=(x,keys)=>{assert(x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x)));const ds=Object.getOwnPropertyDescriptors(x),ks=Reflect.ownKeys(ds);assert(ks.length===keys.length&&ks.every(k=>typeof k==='string'&&keys.includes(k)&&Object.hasOwn(ds[k],'value')),'Exact plain data keys required');};
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);freeze(PACKAGE);const SHA=createHash('sha256').update(encode(PACKAGE)).digest('hex');
export function getPersonalAgentStandardPackage(){return freeze({descriptor:structuredClone(PACKAGE),sha256:SHA});}
export function createNewPersonalAgentStandardConfigWith124(input){
 exact(input,['canonicalPersonId','agentId','expectedPackageVersion','expectedPackageSha256','modelAccount','artifactBindings']);assert.equal(input.expectedPackageVersion,PACKAGE.version);assert.equal(input.expectedPackageSha256,SHA);assert(Array.isArray(input.artifactBindings)&&input.artifactBindings.length===8,'Exact eight tool artifact bindings required');
 for(const row of input.artifactBindings)exact(row,['pluginId','codeSetSha256','manifestSha256','state','admissionReceiptSha256']);
 const plugin=PACKAGE.plugins.find(p=>p.id==='crays-chess'),skill=PACKAGE.addedSkillAssignments.find(s=>s.skillId===plugin.id),matches=input.artifactBindings.filter(b=>b.pluginId===plugin.id);assert.equal(matches.length,1);const b=matches[0];assert.equal(b.codeSetSha256,plugin.codeSetSha256);assert(['SOURCE_ASSIGNED','INSTALLATION_ADMISSION_REFERENCE_SUPPLIED'].includes(b.state));
 if(b.state==='SOURCE_ASSIGNED'){assert.equal(b.manifestSha256,null);assert.equal(b.admissionReceiptSha256,null);}else{assert.equal(b.manifestSha256,plugin.knownInstalledManifestSha256);assert(hex(b.admissionReceiptSha256));}
 const previous=getV9(),prior=createV9({...input,expectedPackageVersion:previous.descriptor.version,expectedPackageSha256:previous.sha256,artifactBindings:input.artifactBindings.filter(row=>row.pluginId!==plugin.id)});
 const config=structuredClone(prior.proposal.nativeConfigFragment),agent=config.agents.entries[input.agentId];
 assert(!config.plugins.allow.includes(plugin.id)&&!config.plugins.load.paths.some(p=>p.includes('/'+plugin.id+'/')));assert(!config.tools.allow.includes(plugin.tool)&&!agent.tools.allow.includes(plugin.tool));
 const loadPath=b.manifestSha256?plugin.artifactRoot+'/'+b.manifestSha256:null,instructionStageBound=hex(skill.artifactManifestSha256Reference);
 // Assigned skill name is intent, never a verified native skill load. Absent instruction only defers this branch.
 agent.skills.push(skill.skillId);
 if(instructionStageBound){config.skills.load.extraDirs.push(skill.proposedExtraDir);config.skills.entries={...config.skills.entries,[skill.skillId]:{enabled:true}};}
 if(loadPath!==null&&instructionStageBound){config.tools.allow.push(plugin.tool);agent.tools.allow.push(plugin.tool);config.plugins.allow.push(plugin.id);config.plugins.load.paths.push(loadPath);config.plugins.entries[plugin.id]={enabled:true};}
 const assignment={...b,tool:plugin.tool,proposedLoadPath:loadPath,referenceVerifiedByFactory:false,componentScope:'PERSISTENT_LEGAL_CHESS_PNG_PENDING_NATIVE_AND_OWN_RUNTIME_ADMISSION',sharedInstructionStageReferenceSupplied:instructionStageBound,sharedInstructionReferenceVerifiedByFactory:false,nativeConfigInclusionState:!instructionStageBound?'PENDING_SHARED_INSTRUCTION_ROOT_STAGE':loadPath===null?'SOURCE_ASSIGNED_NOT_REGISTERED':'REFERENCE_ONLY_NOT_RUNTIME_ADMISSION'};
 return freeze({...prior,schema:'crays.new-personal-agent.standard-binding124-proposal.v10',proposal:{...prior.proposal,standardPackage:{version:PACKAGE.version,sha256:SHA,status:PACKAGE.status},assignedTools:[...PACKAGE.tools],artifactAssignments:[...prior.proposal.artifactAssignments,assignment],capabilityComponentAssignments:structuredClone(PACKAGE.capabilityComponentAssignments),nativeConfigFragment:config},addedSkillAssignments:[...prior.addedSkillAssignments,structuredClone(skill)],assignmentScope:'124_CAPABILITY_INTENT_TWELVE_ASSIGNED_TOOLS_EIGHT_SKILLS_CHESS_SOURCE_PENDING_OWN_ACCOUNT_NOT_RUNTIME_AUTHORITY'});
}
