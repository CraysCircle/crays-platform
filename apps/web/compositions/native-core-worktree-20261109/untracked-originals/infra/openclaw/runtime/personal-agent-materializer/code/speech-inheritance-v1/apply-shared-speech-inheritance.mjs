/** Fixed server-source projection; no account, channel, credential or memory inheritance. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {applySharedDefaultInheritance as applyBase,projectionSha256 as baseProjectionSha256} from '../apply-shared-default-inheritance.mjs';
import {sha,readRootFile} from '../verify-shared-artifacts.mjs';
import PINS from './SPEECH_INHERITANCE_PINS.json' with {type:'json'};
import PROJECTION from './SPEECH_RUNTIME_PROJECTION.json' with {type:'json'};
import STANDARD from './SPEECH_PROJECTED_RUNTIME_STANDARD.json' with {type:'json'};
const encode=x=>Array.isArray(x)?'['+x.map(encode).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+encode(x[k])).join(',')+'}':JSON.stringify(x);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
freeze(PINS);freeze(PROJECTION);freeze(STANDARD);
export const projectionSha256=sha(encode(PROJECTION));
export const projectedStandard=STANDARD;
export async function verifySharedSpeechCode(){
 assert.equal(PROJECTION.speechPinsSha256,sha(encode(PINS)));
 for(const row of PINS.files){const b=await readRootFile(row.path,row.bytes);assert.equal(b.length,row.bytes);assert.equal(sha(b),row.sha256,'EXACT_ADMITTED_SPEECH_CODE_REQUIRED');}
 const dep=PINS.nodeEdgeTts,manifest=await readRootFile(dep.immutableRoot+'/'+dep.manifestName,dep.manifestBytes);assert.equal(manifest.length,dep.manifestBytes);assert.equal(sha(manifest),dep.manifestSha256,'EXACT_PUBLISHED_TTS_DEPENDENCY_MANIFEST_REQUIRED');assert.deepEqual(JSON.parse(manifest).files,dep.files);
 const actual=[];async function walk(dir,prefix=''){for(const row of await fs.readdir(dir,{withFileTypes:true})){assert(!row.isSymbolicLink(),'NO_TTS_DEPENDENCY_SYMLINKS');const relative=prefix+row.name;if(row.isDirectory())await walk(dir+'/'+row.name,relative+'/');else{assert(row.isFile(),'EXACT_TTS_DEPENDENCY_FILESET_REQUIRED');actual.push(relative);}}}await walk(dep.immutableRoot);assert.deepEqual(actual.sort(),[dep.manifestName,...dep.files.map(r=>r.path)].sort(),'EXACT_TTS_DEPENDENCY_FILESET_REQUIRED');
 for(const row of dep.files){const raw=await readRootFile(dep.immutableRoot+'/'+row.path,row.bytes);assert.equal(raw.length,row.bytes);assert.equal(sha(raw),row.sha256,'EXACT_PUBLISHED_TTS_DEPENDENCY_REQUIRED');}
 assert.equal(JSON.parse(await readRootFile(dep.immutableRoot+'/package.json',4096)).version,'1.2.11');
 return sha(encode(PINS));
}
export function applySharedDefaultInheritance(config,{agentId,basePackageSha256}){
 assert.equal(PROJECTION.baseProjectionSha256,baseProjectionSha256);assert.equal(PROJECTION.speechPinsSha256,sha(encode(PINS)));assert.equal(sha(encode(STANDARD.descriptor)),STANDARD.sha256);assert.equal(STANDARD.descriptor.runtimeProjectionSha256,projectionSha256);
 const base=applyBase(config,{agentId,basePackageSha256}),out=structuredClone(base),a=out.agents.entries[agentId];
 assert.equal(out.tools.allow.length,25);assert.deepEqual(a.tools.allow,out.tools.allow);assert.equal(a.skills.length,26);assert.equal(out.tts,undefined);assert.equal(a.tts,undefined);
 // Account/channel setup is a separate own-person admission; this never manufactures it.
 assert.equal(out.channels,undefined);assert.equal(out.auth,undefined);assert.equal(out.bindings,undefined);
 assert(!out.plugins.deny?.some(x=>x==='*'||x==='microsoft'));assert.equal(out.plugins.entries?.microsoft,undefined);
 out.tools.allow.push('tts');a.tools.allow.push('tts');a.skills.push(PINS.instruction.name);out.skills.load.extraDirs.push(PINS.instruction.root+'/skills');out.skills.entries[PINS.instruction.name]={enabled:true};
 out.plugins.allow.push('microsoft');out.plugins.entries.microsoft={enabled:true};out.tts=structuredClone(PINS.defaultConfig);
 assert.deepEqual(out.tools.allow,STANDARD.descriptor.tools);assert.deepEqual(a.skills,STANDARD.descriptor.skills);
 for(const key of ['channels','auth','bindings','commands','session','cron','hooks'])assert.deepEqual(out[key],base[key]);
 assert.equal(out.agents.entries[agentId].workspace,base.agents.entries[agentId].workspace);
 return out;
}
/** Host-only proposal, NOT mount authority. Server derives person/agent paths from Core.
 * The historical alias is safe only within ONE separately qualified private person namespace.
 */
export function proposePersonalSpeechNamespace({canonicalPersonId,agentId}){
 assert(typeof canonicalPersonId==='string'&&canonicalPersonId.length>0&&canonicalPersonId.length<=200);assert.equal(agentId,'personal-'+sha('crays.personal-agent.assignment.v1\n'+canonicalPersonId).slice(0,48));
 const namespace=sha('crays.personal-agent.person-namespace.v1\n'+canonicalPersonId),stateDir='/var/lib/crays-personal-agents/'+namespace+'/'+agentId,alias=PINS.runtimeAlias;
 return freeze({status:'PENDING_PERSONAL_SPEECH_HOST_AND_CHANNEL_QUALIFICATION',namespace,agentId,stateDir,runtimeAlias:alias,readOnlyMounts:[...PINS.files.filter(r=>r.relative!=='compose-explicit-speech-delta.mjs').map(r=>({source:r.path,target:alias+'/code/tts/'+r.relative})),{source:PINS.sharedCodeRoot+'/openclaw-tools-BA3mvtXt.mjs',target:alias+'/node_modules/openclaw/dist/openclaw-tools-BA3mvtXt.mjs'},{source:PINS.sharedCodeRoot+'/tts-D9HL-FBa.mjs',target:alias+'/node_modules/openclaw/dist/tts-D9HL-FBa.mjs'},{source:PINS.sharedCodeRoot+'/microsoft-capability-catalog.js',target:alias+'/node_modules/openclaw/dist/extensions/microsoft/capability-catalog.js'},{source:PINS.nodeEdgeTts.immutableRoot,target:alias+'/node_modules/node-edge-tts'},{source:PINS.instruction.root,target:PINS.instruction.root}],privateStateMount:{source:stateDir,target:alias+'/state',requiredMode:448},requirements:['separate mount namespace per person','same exact Root-pinned SDK and Microsoft provider registration qualified','publish exact eight-file node-edge-tts1.2.11 immutable Root artifact before materialization; original SDK1.2.10 forbidden','resolve ws and https-proxy-agent from the same exact qualified original SDK namespace','all effective code mounts read-only; resolve overlay conflicts explicitly','runtime alias/code only shared; state/workspace/agent profile/temp/output private to this person','commands.ownerAllowFrom and WhatsApp sender/account allowFrom derived from this person own admitted channel only','exact explicit-speech owner guard unchanged; current grants and revocation checked','own model account selection remains original materializer authority','two newly provisioned people actual isolated tool-to-channel proof'],runtimeStarted:false,channelConnected:false,ownChannelQualified:false,modelAccountBorrowed:false,hostNamespaceQualified:false});
}
