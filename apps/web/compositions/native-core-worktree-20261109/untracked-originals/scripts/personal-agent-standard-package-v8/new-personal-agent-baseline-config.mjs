/** Pure V8: same ten tools/124 IDs, qualified six-format source, per-user grants remain pending. */
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import PACKAGE from './STANDARD_PACKAGE.json' with {type:'json'};
import {getPersonalAgentStandardPackage as getV7,createNewPersonalAgentStandardConfigWith124 as createV7} from '../personal-agent-standard-package-v7/new-personal-agent-baseline-config.mjs';
const encode=x=>Array.isArray(x)?'['+x.map(encode).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+encode(x[k])).join(',')+'}':JSON.stringify(x);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const exact=(x,keys)=>{assert(x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x)));const ds=Object.getOwnPropertyDescriptors(x),ks=Reflect.ownKeys(ds);assert(ks.length===keys.length&&ks.every(k=>typeof k==='string'&&keys.includes(k)&&Object.hasOwn(ds[k],'value')),'Exact plain data keys required');};
freeze(PACKAGE);const SHA=createHash('sha256').update(encode(PACKAGE)).digest('hex'),hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function getPersonalAgentStandardPackage(){return freeze({descriptor:structuredClone(PACKAGE),sha256:SHA});}
export function createNewPersonalAgentStandardConfigWith124(input){
 exact(input,['canonicalPersonId','agentId','expectedPackageVersion','expectedPackageSha256','modelAccount','artifactBindings']);assert.equal(input.expectedPackageVersion,PACKAGE.version);assert.equal(input.expectedPackageSha256,SHA);assert(Array.isArray(input.artifactBindings)&&input.artifactBindings.length===6,'Exact six tool artifact bindings required');
 const v7=getV7(),plugin=PACKAGE.plugins.find(p=>p.id==='crays-document-exports'),legacy=v7.descriptor.plugins.find(p=>p.id===plugin.id);
 const matches=input.artifactBindings.filter(b=>b?.pluginId===plugin.id);assert.equal(matches.length,1);const b=matches[0];exact(b,['pluginId','codeSetSha256','manifestSha256','state','admissionReceiptSha256']);assert.equal(b.codeSetSha256,plugin.codeSetSha256);assert(['SOURCE_ASSIGNED','INSTALLATION_ADMISSION_REFERENCE_SUPPLIED'].includes(b.state));
 if(b.state==='SOURCE_ASSIGNED'){assert.equal(b.manifestSha256,null);assert.equal(b.admissionReceiptSha256,null);}else{assert.equal(b.manifestSha256,plugin.knownInstalledManifestSha256);assert(hex(b.admissionReceiptSha256));}
 // V7 remains a pure compatibility builder: never relabel new0.6/six-format admission as old0.3/XLSX.
 const legacyBindings=input.artifactBindings.map(row=>row.pluginId===plugin.id?{pluginId:legacy.id,codeSetSha256:legacy.codeSetSha256,manifestSha256:null,state:'SOURCE_ASSIGNED',admissionReceiptSha256:null}:row);
 const prior=createV7({...input,expectedPackageVersion:v7.descriptor.version,expectedPackageSha256:v7.sha256,artifactBindings:legacyBindings});
 const assignment={...b,tool:plugin.tool,proposedLoadPath:b.manifestSha256?plugin.artifactRoot+'/'+b.manifestSha256+(plugin.artifactSubdirectory?'/'+plugin.artifactSubdirectory:''):null,referenceVerifiedByFactory:false};
 const config=structuredClone(prior.proposal.nativeConfigFragment),agent=config.agents.entries[input.agentId];
 assert(!config.plugins.allow.includes(plugin.id)&&!config.plugins.load.paths.some(p=>p.includes('/crays-document-exports/')));assert(!config.tools.allow.includes(plugin.tool)&&!agent.tools.allow.includes(plugin.tool));
 if(assignment.proposedLoadPath!==null){for(const policy of [config.tools,agent.tools])policy.allow.push(plugin.tool);config.plugins.allow.push(plugin.id);config.plugins.load.paths.push(assignment.proposedLoadPath);config.plugins.entries[plugin.id]={enabled:true};}
 const oldSkill=v7.descriptor.addedSkillAssignments.find(s=>s.skillId===plugin.id),skill=PACKAGE.addedSkillAssignments.find(s=>s.skillId===plugin.id);
 assert.equal(config.skills.load.extraDirs.filter(p=>p===oldSkill.proposedExtraDir).length,1);assert.equal(agent.skills.filter(id=>id===plugin.id).length,1);
 config.skills.load.extraDirs=config.skills.load.extraDirs.map(p=>p===oldSkill.proposedExtraDir?skill.proposedExtraDir:p);
 return freeze({...prior,schema:'crays.new-personal-agent.standard-binding124-proposal.v8',proposal:{...prior.proposal,standardPackage:{version:PACKAGE.version,sha256:SHA,status:PACKAGE.status},assignedTools:[...PACKAGE.tools],artifactAssignments:prior.proposal.artifactAssignments.map(row=>row.pluginId===plugin.id?assignment:row),nativeConfigFragment:config},addedSkillAssignments:prior.addedSkillAssignments.map(row=>row.skillId===plugin.id?structuredClone(skill):row),assignmentScope:'124_CAPABILITY_INTENT_TEN_ASSIGNED_TOOLS_SIX_FORMAT_SOURCE_AND_PENDING_OWN_NOTICE_NOT_RUNTIME_AUTHORITY'});
}
