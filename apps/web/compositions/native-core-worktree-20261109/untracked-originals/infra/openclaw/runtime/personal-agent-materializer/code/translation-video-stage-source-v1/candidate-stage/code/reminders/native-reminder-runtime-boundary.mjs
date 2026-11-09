import {b as isPluginRegistryRetired} from '../../node_modules/openclaw/dist/registry-lifecycle-Cju8-zUe.mjs';
import {assertMultipartPdfNativeRegistry}from'../multipart-pdf/assert-multipart-pdf-native-registry.mjs';
import {EXPEDIA_PLUGIN_ID}from'../expedia/compose-expedia-search-delta.mjs';
import {assertExpediaLoadedRecord,assertExpediaNativeRegistry}from'../expedia/assert-expedia-native-registry.mjs';
import {n as resolveCronJobsStorePathFromConfig} from '../../node_modules/openclaw/dist/paths-BNmrkGS9.mjs';
import B from './REMINDER_BASELINE_BINDINGS.json' with {type:'json'};
/** MODIFIED_ORIGINAL_RUNTIME_OVERLAY companion, own isolated prototype only.
 * Receives the actual registry at original startup/replacement/tool callsites.
 * This module neither creates native authority nor invokes Cron/SDK/provider APIs.
 */
import assert from 'node:assert/strict';
import {inspectNativeReminderRegistry} from './inspect-native-reminder-registry.mjs';
export const OWNER_UNIT='crays-owner-tools-whatsapp-live';
const PLUGIN='crays-personal-reminder-policy',POLICY_ROOT='/opt/crays/openclaw/plugin-artifacts/crays-personal-reminder-policy/f406dba6c7e7edd7939ad1247f0ed8c3ab709252de225c7c24d3620383748a7a';
const KNOWN=[...B.pluginAllow,PLUGIN,'microsoft',EXPEDIA_PLUGIN_ID];
import fs from 'node:fs';
import {createHash} from 'node:crypto';
// Exact original SDK dependencies observed by the actual full startup diagnostic.
// This is not a bundled-plugin wildcard and does not add tools/config allow entries.
const NATIVE_REMINDER_DEPENDENCIES=Object.freeze({
 'memory-core':Object.freeze({source:'/run/crays-owner-tools-whatsapp-live/node_modules/openclaw/dist/extensions/memory-core/index.js',bytes:45402,sha256:'74a6f4b8136cf17441565a1ee3a1a5220fc3f19a1873cce98e5eec057b7d2416'}),
 'openai':Object.freeze({source:'/run/crays-owner-tools-whatsapp-live/node_modules/openclaw/dist/extensions/openai/index.js',bytes:3791,sha256:'d3722172d4500e756206a8eec649e4a6b22c88d985e611f9ccfd510af56268ec'}),
 'microsoft':Object.freeze({source:'/run/crays-owner-tools-whatsapp-live/node_modules/openclaw/dist/extensions/microsoft/index.js',bytes:482,sha256:'ba6fb9f58120189d852e082ffcb1441f8b0db8531ddf8228e0c5244429edf301'})
});
/** Host-only fixed-pin content check; returns no requester or tool authority. */
export function assertNativeReminderDependencyBytes(id,bytes){
 assert(Object.hasOwn(NATIVE_REMINDER_DEPENDENCIES,id),'UNKNOWN_NATIVE_REMINDER_DEPENDENCY');
 const expected=NATIVE_REMINDER_DEPENDENCIES[id];assert(Buffer.isBuffer(bytes),'NATIVE_DEPENDENCY_BYTES_REQUIRED');
 assert.equal(bytes.length,expected.bytes,'NATIVE_DEPENDENCY_SIZE_MISMATCH');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.sha256,'NATIVE_DEPENDENCY_CONTENT_MISMATCH');
}
function assertExactNativeReminderDependency(record){
 const expected=NATIVE_REMINDER_DEPENDENCIES[record.id];
 assert.equal(record.origin,'bundled','NATIVE_DEPENDENCY_ORIGIN_MISMATCH');assert.equal(record.source,expected.source,'NATIVE_DEPENDENCY_SOURCE_MISMATCH');
 const fd=fs.openSync(expected.source,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);let bytes;
 try{
  const before=fs.fstatSync(fd,{bigint:true});assert(before.isFile(),'NATIVE_DEPENDENCY_NOT_REGULAR');assert.equal(before.nlink,1n,'NATIVE_DEPENDENCY_LINK_COUNT');assert.equal(before.mode&0o022n,0n,'NATIVE_DEPENDENCY_WRITABLE_BY_OTHERS');assert.equal(before.size,BigInt(expected.bytes),'NATIVE_DEPENDENCY_SIZE_MISMATCH');
  bytes=Buffer.alloc(expected.bytes+1);let count=0;while(count<bytes.length){const n=fs.readSync(fd,bytes,count,bytes.length-count,null);if(n===0)break;count+=n;}
  assert.equal(count,expected.bytes,'NATIVE_DEPENDENCY_READ_SIZE_MISMATCH');assertNativeReminderDependencyBytes(record.id,bytes.subarray(0,count));
  const after=fs.fstatSync(fd,{bigint:true});assert(after.isFile());for(const key of ['dev','ino','uid','gid','mode','nlink','size','mtimeNs','ctimeNs'])assert.equal(after[key],before[key],'NATIVE_DEPENDENCY_CHANGED_DURING_READ');
 }finally{bytes?.fill(0);fs.closeSync(fd);}
}
/** The original registry is read only. Native dependencies are checked even if an ID is already KNOWN. */
export function assertQualifiedReminderLoadedPlugins(registry){
 assert(Array.isArray(registry?.plugins),'NATIVE_PLUGIN_REGISTRY_REQUIRED');const seen=new Set();
 for(const record of registry.plugins.filter(p=>p.status==='loaded')){
  assert(!seen.has(record.id),'DUPLICATE_LOADED_PLUGIN_IN_OWN_SCOPE');seen.add(record.id);
  if(record.id===EXPEDIA_PLUGIN_ID)assertExpediaLoadedRecord(record);
  else if(Object.hasOwn(NATIVE_REMINDER_DEPENDENCIES,record.id))assertExactNativeReminderDependency(record);
  else assert(KNOWN.includes(record.id),'UNQUALIFIED_LOADED_PLUGIN_IN_OWN_SCOPE');
  if(record.id==='microsoft'){
   assert.equal(registry.typedHooks.filter(r=>r.pluginId==='microsoft').length,0,'MICROSOFT_HOOKS_DENIED');assert.equal(registry.trustedToolPolicies.filter(r=>r.pluginId==='microsoft').length,0,'MICROSOFT_TRUSTED_POLICY_DENIED');assert.equal(registry.tools.filter(r=>r.pluginId==='microsoft').length,0,'MICROSOFT_TOOLS_DENIED');const speech=registry.speechProviders.filter(r=>r.pluginId==='microsoft');assert.equal(speech.length,1,'EXACT_MICROSOFT_SPEECH_PROVIDER_REQUIRED');assert.equal(speech[0].provider.id,'microsoft');assert.deepEqual(speech[0].provider.aliases,['edge']);
  }
 }
}
const own=()=>process.env.CRAYS_GATEWAY_UNIT===OWNER_UNIT;
const allowed=(cfg,name)=>[cfg?.tools,...Object.values(cfg?.agents?.entries??{}).map(a=>a?.tools)].some(p=>p?.allow?.includes(name)||p?.alsoAllow?.includes(name));
function enabled(cfg){return cfg?.cron?.enabled===true||cfg?.plugins?.entries?.[PLUGIN]?.enabled===true||allowed(cfg,'automations')||allowed(cfg,'cron');}
export function assertReminderRegistryForOwnedRuntime({config,registry,phase,action}){
 if(!own())return {scopeActive:false,authorityGranted:false};
 assert(registry&&!isPluginRegistryRetired(registry),'CURRENT_NONRETIRED_FULL_REGISTRY_REQUIRED');
 assert(['startup','replacement','tool'].includes(phase),'UNKNOWN_NATIVE_BOUNDARY_PHASE');
 if(phase!=='tool'&&!enabled(config))return {scopeActive:false,authorityGranted:false};
 const entries=config?.agents?.entries;assert(entries&&Object.keys(entries).length===1,'EXACT_OWN_AGENT_REQUIRED');const agentId=Object.keys(entries)[0],agent=entries[agentId];
 assert(/^[a-z0-9][a-z0-9_-]{0,63}$/.test(agentId));assert(typeof agent.workspace==='string'&&agent.workspace.endsWith('/workspace'));const state=agent.workspace.slice(0,-10);assert.equal(agent.agentDir,state+'/agents/'+agentId+'/agent');
 assert.deepEqual(config.plugins.allow,KNOWN,'EXACT_QUALIFIED_PLUGIN_SET_REQUIRED');assert.equal(config.plugins.load.paths.filter(p=>p===POLICY_ROOT).length,1);assert.equal(config.plugins.entries[PLUGIN]?.enabled,true,'REQUIRED_POLICY_NOT_CONFIGURED');
 assert.equal(config.bindings?.length,1);const route=config.bindings[0];assert.equal(route.agentId,agentId);assert.equal(route.match.channel,'whatsapp');const accountId=route.match.accountId,channel=config.channels?.whatsapp;assert.deepEqual(Object.keys(channel.accounts),[accountId]);
 assert.equal(channel.allowFrom?.length,1);const senderId=channel.allowFrom[0];assert(typeof senderId==='string'&&/^[+][1-9][0-9]{7,14}$/.test(senderId));
 for(const row of [channel,channel.accounts[accountId]]){assert.equal(row.enabled,true);assert.equal(row.dmPolicy,'allowlist');assert.equal(row.groupPolicy,'disabled');assert.equal(row.configWrites,false);assert.deepEqual(row.allowFrom,[senderId]);}
 assert.deepEqual(config.commands.ownerAllowFrom,['whatsapp:'+senderId]);assert.deepEqual(config.plugins.entries[PLUGIN].config.bindings,[{agentId,channel:'whatsapp',accountId,senderId}]);
 if(config.cron?.enabled===true||phase==='tool'){
  assert(!Object.hasOwn(config.cron??{},'store'),'LEGACY_CRON_CONFIG_STORE_DENIED');assert.equal(process.env.OPENCLAW_STATE_DIR,state,'OWN_STATE_ENV_REQUIRED');assert.equal(resolveCronJobsStorePathFromConfig(config,process.env,process.env),state+'/crays-personal-reminders-v1/jobs.json','EXPLICIT_OWN_CRON_PARTITION_REQUIRED');assert.equal(config.cron.triggers?.enabled,false);assert.equal(config.skills?.workshop?.autonomous?.mode,'off');
  assert.deepEqual(config.agents.defaults.heartbeat,{every:'0m',target:'none'});assert.deepEqual(agent.heartbeat,{every:'0m',target:'none'});
 }
 if(phase==='tool'&&action!=='remove')assert.equal(config.cron.enabled,true,'OWN_REMINDER_SCHEDULER_DISABLED');
 assertExpediaNativeRegistry({config,registry});
 assertMultipartPdfNativeRegistry({config,registry});
 const facts=inspectNativeReminderRegistry(registry);
 assertQualifiedReminderLoadedPlugins(registry);
 return {...facts,scopeActive:true,phase,authorityGranted:false};
}
// Diagnostic projection only: fixed public coordinates and allowlisted code. No message, values, config, arguments or raw stack are logged.
function projectReminderBoundaryDiagnostic(error){
 const relatives=['reminders/native-reminder-runtime-boundary.mjs','reminders/inspect-native-reminder-registry.mjs','expedia/assert-expedia-native-registry.mjs','expedia/compose-expedia-search-delta.mjs','multipart-pdf/assert-multipart-pdf-native-registry.mjs','multipart-pdf/compose-multipart-pdf-delta.mjs'];
 const known=new Map();
 for(const relative of relatives){
  const short=relative.split('/').pop();
  for(const prefix of [new URL('../',import.meta.url).pathname,'/run/crays-owner-tools-whatsapp-live/code/','/opt/crays/openclaw/personal-services/crays-owner-tools-whatsapp-live-v51-multipart-pdf/code/'])known.set(prefix+relative,short);
 }
 const code=['ERR_ASSERTION','ENOENT','EACCES','EPERM','ERR_MODULE_NOT_FOUND'].includes(error?.code)?error.code:null;
 let frame=null;
 if(typeof error?.stack==='string')for(const line of error.stack.slice(0,16384).split('\n').slice(1,17)){
  const match=/(?:\(|\s)(?:file:\/\/)?([^\s()]+):(\d{1,7}):(\d{1,7})\)?$/.exec(line);
  if(match&&known.has(match[1])){frame={file:known.get(match[1]),line:Number(match[2])};break;}
 }
 return {event:'CRAYS_REMINDER_BOUNDARY_REJECTED_DIAGNOSTIC_V1',code,...frame?{frame}:{}};
}
/** Used by ORIGINAL before-tool dispatcher before its policy-absent earlyreturn.
 * A pass only continues the ORIGINAL requester/policy/Cron path; it grants nothing.
 */
export function reminderToolBoundaryDecision({config,registry,toolName,action,params}){
 if(!own()||!['automations','cron'].includes(toolName))return undefined;
 try{assertReminderRegistryForOwnedRuntime({config,registry,phase:'tool',action});return undefined;}
 catch(error){try{console.error(JSON.stringify(projectReminderBoundaryDiagnostic(error)));}catch{}return {blocked:true,kind:'veto',deniedReason:'crays-reminder-native-boundary',reason:'Personal reminder runtime policy is unavailable; no automation was executed.',params};}
}
