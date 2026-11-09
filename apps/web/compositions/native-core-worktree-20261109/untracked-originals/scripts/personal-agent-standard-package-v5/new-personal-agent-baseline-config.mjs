/** Pure V5 nine-tool baseline; shared public code only, no runtime or own-account authority. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import PACKAGE from './STANDARD_PACKAGE.json' with {type:'json'};
import {getPersonalAgentStandardPackage as getV4,createNewPersonalAgentStandardConfigWith124 as createV4} from '../personal-agent-standard-package-v4/new-personal-agent-baseline-config.mjs';
const encode=x=>Array.isArray(x)?'['+x.map(encode).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+encode(x[k])).join(',')+'}':JSON.stringify(x);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function exact(x,keys){assert(x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x)));const ds=Object.getOwnPropertyDescriptors(x),ks=Reflect.ownKeys(ds);assert(ks.length===keys.length&&ks.every(k=>typeof k==='string'&&keys.includes(k)&&Object.hasOwn(ds[k],'value')),'Exact plain data keys required');}
freeze(PACKAGE);const SHA=createHash('sha256').update(encode(PACKAGE)).digest('hex');const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function getPersonalAgentStandardPackage(){return freeze({descriptor:structuredClone(PACKAGE),sha256:SHA});}
export function createNewPersonalAgentStandardConfigWith124(input){
 exact(input,['canonicalPersonId','agentId','expectedPackageVersion','expectedPackageSha256','modelAccount','artifactBindings']);
 assert.equal(input.expectedPackageVersion,PACKAGE.version);assert.equal(input.expectedPackageSha256,SHA);
 assert(Array.isArray(input.artifactBindings)&&input.artifactBindings.length===5,'Exact five artifact bindings required');
 const v4=getV4(),rss=PACKAGE.plugins.find(p=>p.id==='crays-feed-reader');
 const matches=input.artifactBindings.filter(b=>b?.pluginId===rss.id);assert.equal(matches.length,1,'Unique RSS binding required');const b=matches[0];
 exact(b,['pluginId','codeSetSha256','manifestSha256','state','admissionReceiptSha256']);assert.equal(b.codeSetSha256,rss.codeSetSha256);
 assert(['SOURCE_ASSIGNED','INSTALLATION_ADMISSION_REFERENCE_SUPPLIED'].includes(b.state));
 if(b.state==='SOURCE_ASSIGNED'){assert.equal(b.manifestSha256,null);assert.equal(b.admissionReceiptSha256,null);}
 else {assert.equal(b.manifestSha256,rss.knownInstalledManifestSha256);assert(hex(b.admissionReceiptSha256),'Installation admission reference required');}
 const prior=createV4({...input,expectedPackageVersion:v4.descriptor.version,expectedPackageSha256:v4.sha256,artifactBindings:input.artifactBindings.filter(b=>v4.descriptor.plugins.some(p=>p.id===b?.pluginId))});
 const assignment={...b,tool:rss.tool,proposedLoadPath:b.manifestSha256?rss.artifactRoot+'/'+b.manifestSha256:null,referenceVerifiedByFactory:false};
 const config=structuredClone(prior.proposal.nativeConfigFragment),agent=config.agents.entries[input.agentId];
 if(assignment.proposedLoadPath!==null){for(const policy of [config.tools,agent.tools])policy.allow.push(rss.tool);config.plugins.allow.push(rss.id);config.plugins.load.paths.push(assignment.proposedLoadPath);config.plugins.entries[rss.id]={enabled:true};}
 const skill=PACKAGE.addedSkillAssignments.find(x=>x.skillId==='crays-feed-reader');agent.skills.push(skill.skillId);config.skills.load.extraDirs.push(skill.proposedExtraDir);config.skills.entries[skill.skillId]={enabled:true};
 return freeze({...prior,schema:'crays.new-personal-agent.standard-binding124-proposal.v5',
  proposal:{...prior.proposal,standardPackage:{version:PACKAGE.version,sha256:SHA,status:PACKAGE.status},assignedTools:[...PACKAGE.tools],artifactAssignments:[...prior.proposal.artifactAssignments,assignment],nativeConfigFragment:config},
  addedSkillAssignments:[...prior.addedSkillAssignments,structuredClone(skill)],
  assignmentScope:'124_CAPABILITY_INTENT_NINE_ASSIGNED_TOOLS_NOT_RUNTIME_AUTHORITY'});
}
