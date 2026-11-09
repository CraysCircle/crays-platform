/** Pure proposal for a new isolated user's runtime. No identity issuance, I/O, tokens or owner template. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import PACKAGE from './STANDARD_PACKAGE.json' with {type:'json'};
const hash=x=>createHash('sha256').update(x).digest('hex');
const encode=x=>Array.isArray(x)?'['+x.map(encode).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+encode(x[k])).join(',')+'}':JSON.stringify(x);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
freeze(PACKAGE);const PACKAGE_SHA=hash(encode(PACKAGE));
const need=(condition,message)=>assert(condition,'STANDARD_PACKAGE: '+message);
function exact(x,keys) {
 need(x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x)),'plain input');
 const descriptors=Object.getOwnPropertyDescriptors(x),actual=Reflect.ownKeys(descriptors);
 need(actual.length===keys.length&&actual.every(k=>typeof k==='string'&&keys.includes(k)&&Object.hasOwn(descriptors[k],'value')),'exact keys; no unknown fields/accessors');
}
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function getPersonalAgentStandardPackage(){return freeze({descriptor:structuredClone(PACKAGE),sha256:PACKAGE_SHA});}
export function createNewPersonalAgentStandardConfig(input) {
 exact(input,['canonicalPersonId','agentId','expectedPackageVersion','expectedPackageSha256','modelAccount','artifactBindings']);
 const {canonicalPersonId,agentId,modelAccount,artifactBindings}=input;
 need(typeof canonicalPersonId==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(canonicalPersonId),'canonical person ID syntax');
 need(typeof agentId==='string'&&/^[a-z0-9][a-z0-9_-]{0,63}$/.test(agentId)&&!['__proto__','constructor','prototype'].includes(agentId),'agent ID syntax');
 need(input.expectedPackageVersion===PACKAGE.version&&input.expectedPackageSha256===PACKAGE_SHA,'package drift');
 // References are supplied by the existing canonical provisioner; syntax never establishes authority.
 exact(modelAccount,['canonicalPersonId','agentId','provider','apiRoute','modelRef','state','readinessReceiptSha256']);
 need(modelAccount.canonicalPersonId===canonicalPersonId&&modelAccount.agentId===agentId,'other owner model/account');
 need(modelAccount.provider==='openai'&&modelAccount.apiRoute===PACKAGE.requiredAccountRoute&&typeof modelAccount.modelRef==='string'&&/^openai\/[A-Za-z0-9_.-]+$/.test(modelAccount.modelRef),'unsupported provider route');
 need(['PENDING_OWN_LOGIN','OWN_ACCOUNT_REFERENCE_SUPPLIED'].includes(modelAccount.state),'account state');
 need(modelAccount.state==='PENDING_OWN_LOGIN'?modelAccount.readinessReceiptSha256===null:digest(modelAccount.readinessReceiptSha256),'own account readiness reference');
 need(Array.isArray(artifactBindings)&&artifactBindings.length===PACKAGE.plugins.length,'exact shared artifact set');
 const bindings=[];
 for(const plugin of PACKAGE.plugins) {
  const matches=artifactBindings.filter(x=>x?.pluginId===plugin.id);need(matches.length===1,'unique expected plugin');const b=matches[0];
  exact(b,['pluginId','codeSetSha256','manifestSha256','state','admissionReceiptSha256']);
  need(b.codeSetSha256===plugin.codeSetSha256,'wrong artifact code set');
  need(['SOURCE_ASSIGNED','INSTALLATION_ADMISSION_REFERENCE_SUPPLIED'].includes(b.state),'artifact state');
  if(b.state==='SOURCE_ASSIGNED')need(b.manifestSha256===null&&b.admissionReceiptSha256===null,'uninstalled reference contradiction');
  else {
   need(digest(b.manifestSha256)&&digest(b.admissionReceiptSha256),'exact artifact admission reference');
   if(plugin.knownInstalledManifestSha256!==null)need(b.manifestSha256===plugin.knownInstalledManifestSha256,'wrong installed artifact');
  }
  bindings.push({...b,tool:plugin.tool,proposedLoadPath:b.manifestSha256?plugin.artifactRoot+'/'+b.manifestSha256:null,referenceVerifiedByFactory:false});
 }
 const personNamespace=hash('crays.personal-agent.person-namespace.v1\n'+canonicalPersonId);
 const stateDir='/var/lib/crays-personal-agents/'+personNamespace+'/'+agentId,workspace=stateDir+'/workspace',agentDir=stateDir+'/agents/'+agentId+'/agent';
 const proposedPlugins=bindings.filter(b=>b.proposedLoadPath!==null),tools=['read','web_fetch','web_search','pdf',...proposedPlugins.map(b=>b.tool)];
 const policy=()=>({profile:'full',allow:[...tools],deny:[],fs:{workspaceOnly:true}});
 return freeze({schema:'crays.new-personal-agent.standard-config-proposal.v2',scope:'NEW_ISOLATED_PERSONAL_RUNTIME_ONLY_NOT_SHARED_GATEWAY_MERGE',canonicalPersonId,agentId,personNamespace,
  standardPackage:{version:PACKAGE.version,sha256:PACKAGE_SHA,status:PACKAGE.status},paths:{stateDir,workspace,agentDir},
  assignedTools:[...PACKAGE.tools],assignedBindingCapabilityIds:Array.from({length:100},(_,i)=>'B2C-CAP-'+String(i+1).padStart(3,'0')),
  artifactAssignments:bindings,modelAccountReadiness:{...modelAccount,referenceVerifiedByFactory:false},
  nativeConfigFragment:{agents:{entries:{[agentId]:{name:'Crays Agent',workspace,agentDir,skills:[...PACKAGE.skills],model:{primary:modelAccount.modelRef,fallbacks:[]},tools:policy()}},defaults:{models:{[modelAccount.modelRef]:{agentRuntime:{id:'openclaw'}}},pdfModel:{primary:modelAccount.modelRef,fallbacks:[]},maxConcurrent:1}},
   tools:{...policy(),web:{fetch:{enabled:true},search:{enabled:true,openaiCodex:{enabled:true}}}},
   skills:{allowBundled:[...PACKAGE.skills],entries:{weather:{enabled:true}}},
   plugins:{allow:['openai','document-extract',...proposedPlugins.map(b=>b.pluginId)],load:{paths:proposedPlugins.map(b=>b.proposedLoadPath)},entries:Object.fromEntries(['openai','document-extract',...proposedPlugins.map(b=>b.pluginId)].map(id=>[id,{enabled:true}]))}},
  readiness:{codeAssigned:true,canonicalIdentityVerified:false,artifactAdmissionVerified:false,ownAccountVerified:false,filesystemProvisioned:false,runtimeStartAllowed:false,userToolAcceptanceProven:false,all100Ready:false,credentialsInherited:false},
  integrationRequirements:[
   'Existing canonical Core provisioner must verify the actual person-agent assignment and exclusive private runtime before applying this proposal.',
   'Verify every plugin installation/admission reference against actual root-owned immutable manifest and exact file hashes in this standard package; SOURCE_ASSIGNED plugins remain unregistered.',
   'Verify each own account readiness reference for this exact person and agent through existing native auth; no auth/profile/token/channel state is supplied or copied.',
   'Validate the resulting fragment with the pinned native config validator and current component/runtime/tool admissions before startup; this pure factory cannot authorize startup.',
   'Create private filesystem and own native owner/session binding; perform actual per-user tool acceptance. Source assignment is not installation, account readiness, channel delivery or all100 completion.'
  ]});
}
