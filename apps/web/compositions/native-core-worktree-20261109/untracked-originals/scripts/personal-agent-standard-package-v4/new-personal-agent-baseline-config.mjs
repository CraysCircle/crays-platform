/** Additive124 source-intent composition. No I/O, installation, identity, account or runtime authority. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import PACKAGE from './STANDARD_PACKAGE.json' with {type:'json'};
import {getPersonalAgentStandardPackage as getV3,createNewPersonalAgentStandardConfigWith107 as createV3} from '../personal-agent-standard-package-v3/new-personal-agent-baseline-config.mjs';
const encode=x=>Array.isArray(x)?'['+x.map(encode).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+encode(x[k])).join(',')+'}':JSON.stringify(x);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
freeze(PACKAGE);const SHA=createHash('sha256').update(encode(PACKAGE)).digest('hex');
export function getPersonalAgentStandardPackage(){return freeze({descriptor:structuredClone(PACKAGE),sha256:SHA});}
export function createNewPersonalAgentStandardConfigWith124(input){
 assert(input!==null&&typeof input==='object'&&!Array.isArray(input)&&[Object.prototype,null].includes(Object.getPrototypeOf(input)));
 const keys=['canonicalPersonId','agentId','expectedPackageVersion','expectedPackageSha256','modelAccount','artifactBindings'];
 const descriptors=Object.getOwnPropertyDescriptors(input),actual=Reflect.ownKeys(descriptors);
 assert(actual.length===keys.length&&actual.every(k=>typeof k==='string'&&keys.includes(k)&&Object.hasOwn(descriptors[k],'value')),'Exact plain data input required');
 assert.equal(input.expectedPackageVersion,PACKAGE.version);assert.equal(input.expectedPackageSha256,SHA);
 const v3=getV3();
 const prior=createV3({...input,expectedPackageVersion:v3.descriptor.version,expectedPackageSha256:v3.sha256});
 const added=structuredClone(PACKAGE.additional124SkillAssignments);
 return freeze({...prior,schema:'crays.new-personal-agent.standard-binding124-proposal.v4',
  proposal:{...prior.proposal,standardPackage:{version:PACKAGE.version,sha256:SHA,status:PACKAGE.status},
   assignedBindingCapabilityIds:[...prior.proposal.assignedBindingCapabilityIds,...added.map(x=>x.capabilityId)],
   bindingRequirementsReference:{path:PACKAGE.binding124.path,sha256:PACKAGE.binding124.sha256,referenceVerifiedByFactory:false},
   readiness:{...prior.proposal.readiness,all124Ready:false}},
  additionalSkillAssignments:[...prior.additionalSkillAssignments,...added],
  assignmentScope:'124_CAPABILITY_INTENT_EIGHT_ASSIGNED_TOOLS_NOT_RUNTIME_AUTHORITY'});
}
