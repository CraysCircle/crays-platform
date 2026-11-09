/** Source-only fixed two-instruction delta. Host admission is external. */
import assert from 'node:assert/strict';
import {isAsyncFunction,isPromise} from 'node:util/types';
import B from './TRANSLATION_VIDEO_BINDINGS.json' with {type:'json'};
import W from './baseline/V53_WEATHER_BINDINGS.json' with {type:'json'};
const then=Promise.prototype.then;
const NAMES=B.artifacts.map(a=>a.name);
function current(check){
 assert.equal(typeof check,'function','HOST_SYNC_CURRENTNESS_REQUIRED');
 assert(!isAsyncFunction(check),'ASYNC_CURRENTNESS_DENIED');
 const value=check();
 if(isPromise(value))Reflect.apply(then,value,[undefined,()=>{}]);
 assert(value===undefined,'CURRENTNESS_MUST_RETURN_UNDEFINED');
}
function strings(actual,expected,label){
 assert(Array.isArray(actual)&&actual.length===expected.length,label);
 assert.deepEqual(Reflect.ownKeys(actual),[...expected.map((_,i)=>String(i)),'length'],label);
 for(let i=0;i<expected.length;i++){
  const d=Object.getOwnPropertyDescriptor(actual,String(i));
  assert(d&&Object.hasOwn(d,'value')&&d.enumerable&&d.value===expected[i],label);
 }
}
function enabled(entry){
 assert(entry&&typeof entry==='object'&&!Array.isArray(entry),'EXACT_ENABLED_ENTRY_REQUIRED');
 assert.deepEqual(Reflect.ownKeys(entry),['enabled'],'EXACT_ENABLED_ENTRY_REQUIRED');
 const d=Object.getOwnPropertyDescriptor(entry,'enabled');
 assert(d&&Object.hasOwn(d,'value')&&d.enumerable&&d.value===true,'EXACT_ENABLED_ENTRY_REQUIRED');
}
function context(config,{agentId,baselineInstructionNames}={}){
 assert(typeof agentId==='string'&&agentId.length>0,'HOST_AGENT_ID_REQUIRED');
 assert(Array.isArray(baselineInstructionNames)&&baselineInstructionNames.length===30,'HOST_ORDERED_THIRTY_BASELINE_REQUIRED');
 strings(baselineInstructionNames,[...baselineInstructionNames],'PLAIN_BASELINE_REQUIRED');
 assert(baselineInstructionNames.every(n=>typeof n==='string'&&n.length>0)&&new Set(baselineInstructionNames).size===30,'UNIQUE_BASELINE_REQUIRED');
 assert(!baselineInstructionNames.some(n=>NAMES.includes(n)),'ADDITIVE_NAMES_NOT_BASELINE');
 const agent=config?.agents?.entries?.[agentId],load=config?.skills?.load,entries=config?.skills?.entries;
 assert(agent&&load&&entries&&typeof entries==='object'&&!Array.isArray(entries),'EXISTING_AGENT_AND_SKILL_POLICY_REQUIRED');
 assert(Array.isArray(load.extraDirs),'EXISTING_SKILL_DIRS_REQUIRED');
 strings(load.extraDirs,[...load.extraDirs],'PLAIN_SKILL_DIRS_REQUIRED');
 assert(load.extraDirs.every(p=>typeof p==='string'&&p.startsWith('/'))&&new Set(load.extraDirs).size===load.extraDirs.length,'UNIQUE_ABSOLUTE_SKILL_DIRS_REQUIRED');
 return {agent,load,entries,agentId,baselineInstructionNames};
}
const artifactDir=(p,a)=>p===a.extraDir||p.includes('/skill-artifacts/'+a.name+'/');
/** Pure structure assertion; never claims requester/host authority or currentness. */
export function assertTranslationVideoBatchProfile(config,options={agentId:B.agentId,baselineInstructionNames:B.baselineInstructionNames}){
 const c=context(config,options);
 strings(c.agent.skills,[...c.baselineInstructionNames,...NAMES],'EXACT_ORDERED_THIRTY_TWO_REQUIRED');
 for(const a of B.artifacts){
  assert(Object.hasOwn(c.entries,a.name),'OWN_BATCH_ENTRY_REQUIRED');enabled(c.entries[a.name]);
  assert.equal(c.load.extraDirs.filter(p=>artifactDir(p,a)).length,1,'EXACT_SINGLE_BATCH_ROOT_REQUIRED');
  assert(c.load.extraDirs.includes(a.extraDir),'PINNED_BATCH_ROOT_REQUIRED');
 }
 return Object.freeze({instructionCount:32,toolPolicyChanged:false,originalRuntimeActivationsAdded:0});
}
/** Generic host-selected agent/baseline; fixed two guides only, no channel assumptions. */
export function composePersonalTranslationVideoInstructions(base,{agentId,baselineInstructionNames,assertInvocationCurrent}={}){
 current(assertInvocationCurrent);
 const options={agentId,baselineInstructionNames},c=context(base,options);
 const footprint=NAMES.some(n=>c.agent.skills?.includes(n)||Object.hasOwn(c.entries,n))||B.artifacts.some(a=>c.load.extraDirs.some(p=>artifactDir(p,a)));
 if(footprint){assertTranslationVideoBatchProfile(base,options);current(assertInvocationCurrent);return base;}
 strings(c.agent.skills,baselineInstructionNames,'EXACT_ORDERED_THIRTY_REQUIRED');
 const out={...base,skills:{...base.skills,load:{...c.load,extraDirs:[...c.load.extraDirs,...B.artifacts.map(a=>a.extraDir)]},entries:{...c.entries,...Object.fromEntries(NAMES.map(n=>[n,{enabled:true}]))}},agents:{...base.agents,entries:{...base.agents.entries,[agentId]:{...c.agent,skills:[...c.agent.skills,...NAMES]}}}};
 for(const k of Reflect.ownKeys(base))if(k!=='skills'&&k!=='agents')assert.strictEqual(out[k],base[k]);
 for(const k of Reflect.ownKeys(c.agent))if(k!=='skills')assert.strictEqual(out.agents.entries[agentId][k],c.agent[k]);
 for(const k of Reflect.ownKeys(base.agents))if(k!=='entries')assert.strictEqual(out.agents[k],base.agents[k]);
 for(const [id,a]of Object.entries(base.agents.entries))if(id!==agentId)assert.strictEqual(out.agents.entries[id],a);
 for(const k of Reflect.ownKeys(base.skills))if(k!=='load'&&k!=='entries')assert.strictEqual(out.skills[k],base.skills[k]);
 for(const k of Reflect.ownKeys(c.load))if(k!=='extraDirs')assert.strictEqual(out.skills.load[k],c.load[k]);
 for(const k of Reflect.ownKeys(c.entries))assert.strictEqual(out.skills.entries[k],c.entries[k]);
 assertTranslationVideoBatchProfile(out,options);current(assertInvocationCurrent);return out;
}
/** Existing V53 owner adapter: exact public profile, no new authority. */
function ownerProfile(base){
 const id=W.agentId,a=base?.agents?.entries?.[id];
 strings(Object.keys(base?.agents?.entries??{}),[id],'EXACT_OWNER_PROFILE_REQUIRED');
 assert.equal(a.name,W.agentName);assert.equal(a.workspace,W.runtime+'/state/workspace');assert.equal(a.agentDir,W.runtime+'/state/agents/'+id+'/agent');
 strings(base.tools?.allow,W.tools,'EXACT_THIRTY_TOOLS_REQUIRED');strings(a.tools?.allow,W.tools,'EXACT_AGENT_TOOLS_REQUIRED');strings(base.tools?.deny,[],'NO_TOOL_POLICY_DRIFT');
 strings(base.plugins?.allow,W.pluginAllow,'EXACT_EXISTING_PLUGINS_REQUIRED');
 const paths=base.plugins?.load?.paths;assert(Array.isArray(paths)&&new Set(paths).size===paths.length);strings([...paths].sort(),W.expectedExistingPluginRoots,'EXACT_EXISTING_PLUGIN_ROOTS_REQUIRED');
 strings(Object.keys(base.plugins.entries??{}).sort(),[...W.pluginAllow].sort(),'EXACT_EXISTING_PLUGIN_ENTRIES_REQUIRED');
 for(const name of W.pluginAllow)assert.equal(base.plugins.entries[name]?.enabled,true);
 assert.deepEqual(base.tts,W.tts);assert.equal(base.agents.defaults.timeoutSeconds,300);assert.equal(base.agents.defaults.maxConcurrent,1);
 strings(Object.keys(base.channels??{}),['whatsapp'],'EXACT_EXISTING_CHANNEL_REQUIRED');
 assert.deepEqual(base.bindings,[{agentId:id,match:{channel:'whatsapp',accountId:'crays-agent-business'}}]);
 enabled(base.skills?.entries?.[W.weatherSkill]);
 const dirs=base.skills?.load?.extraDirs;assert(Array.isArray(dirs));assert.equal(dirs.filter(p=>p===W.weatherExtraDir).length,1);assert.equal(dirs.filter(p=>typeof p==='string'&&p.includes('/crays-weather-public/')).length,1);
}
export function composeTranslationVideoBatch(base,{assertInvocationCurrent}={}){
 current(assertInvocationCurrent);ownerProfile(base);
 return composePersonalTranslationVideoInstructions(base,{agentId:B.agentId,baselineInstructionNames:B.baselineInstructionNames,assertInvocationCurrent});
}
