/** Pure first-party V53 instruction delta; not an API, executor or admission. */
import assert from 'node:assert/strict';
import B from './V53_WEATHER_BINDINGS.json' with {type:'json'};
const NAME=B.weatherSkill,ID=B.agentId;
const exactArray=(actual,expected,label)=>assert.deepEqual(actual,expected,label);
export function composeWeatherV53(base,{sourceIdentity,assertInvocationCurrent}={}){
 assert.equal(typeof assertInvocationCurrent,'function','TRUSTED_HOST_CURRENTNESS_CALLBACK_REQUIRED');
 assertInvocationCurrent();
 assert.deepEqual(sourceIdentity,B.baselineIdentity,'EXACT_ACCEPTED_V53_SOURCE_IDENTITY_REQUIRED');
 assert(base&&typeof base==='object'&&!Array.isArray(base));
 exactArray(Object.keys(base.agents?.entries??{}),[ID],'EXACT_SINGLE_V53_OWNER_AGENT_REQUIRED');
 const a=base.agents.entries[ID];
 assert.equal(a.name,B.agentName,'PUBLIC_CHUCK_NAME_REQUIRED');
 assert.equal(a.workspace,B.runtime+'/state/workspace','EXACT_OWN_WORKSPACE_REQUIRED');
 assert.equal(a.agentDir,B.runtime+'/state/agents/'+ID+'/agent','EXACT_OWN_AGENT_DIRECTORY_REQUIRED');
 exactArray(base.tools?.allow,B.tools,'EXACT_V53_THIRTY_TOOLS_REQUIRED');
 exactArray(a.tools?.allow,B.tools,'EXACT_V53_AGENT_THIRTY_TOOLS_REQUIRED');
 exactArray(base.tools?.deny,[],'V53_TOOL_POLICY_DRIFT');
 assert(!base.tools.allow.includes('exec')&&!base.tools.allow.includes('shell'),'NO_EXEC_ESCALATION');
 exactArray(base.plugins?.allow,B.pluginAllow,'EXACT_V53_PLUGIN_IDENTITIES_REQUIRED');
 const paths=base.plugins?.load?.paths;
 assert(Array.isArray(paths)&&new Set(paths).size===paths.length,'UNIQUE_EXISTING_PLUGIN_PATHS_REQUIRED');
 assert(paths.every(p=>B.allowedExistingPluginRoots.includes(p)),'UNADMITTED_PLUGIN_ROOT');
 exactArray([...paths].sort(),B.expectedExistingPluginRoots,'EXACT_V53_PLUGIN_ROOT_SET_REQUIRED');
 exactArray(Object.keys(base.plugins.entries??{}).sort(),[...B.pluginAllow].sort(),'EXACT_V53_PLUGIN_ENTRY_SET_REQUIRED');
 for(const id of B.pluginAllow)assert(base.plugins.entries[id]?.enabled===true,'EXISTING_ENABLED_PLUGIN_REQUIRED');
 for(const p of B.requiredExistingPluginRoots)assert.equal(paths.filter(x=>x===p).length,1,'CURRENT_V53_REQUIRED_ROOT_MISSING');
 for(const p of B.excludedHistoricalPluginRoots)assert(!paths.includes(p),'RETIRED_PLUGIN_ROOT');
 assert.deepEqual(base.tts,B.tts,'EXPLICIT_V53_SPEECH_CONTRACT_DRIFT');
 assert.equal(base.agents.defaults.timeoutSeconds,300,'EXISTING_REQUEST_BUDGET_REQUIRED');
 assert.equal(base.agents.defaults.maxConcurrent,1,'EXISTING_SINGLE_CONCURRENCY_REQUIRED');
 exactArray(Object.keys(base.channels??{}),['whatsapp'],'EXACT_EXISTING_CHANNEL_REQUIRED');
 exactArray(base.bindings,[{agentId:ID,match:{channel:'whatsapp',accountId:'crays-agent-business'}}],'EXACT_EXISTING_AGENT_ROUTE_REQUIRED');
 const load=base.skills?.load,entries=base.skills?.entries;
 assert(load&&Array.isArray(load.extraDirs)&&new Set(load.extraDirs).size===load.extraDirs.length,'EXISTING_UNIQUE_INSTRUCTION_DIRS_REQUIRED');
 assert(load.extraDirs.every(p=>typeof p==='string'&&p.startsWith('/'))&&entries&&typeof entries==='object','EXISTING_SKILL_POLICY_REQUIRED');
 const already=Object.hasOwn(entries,NAME);
 const expected=[...B.instructions,...(already?[NAME]:[])];
 exactArray(a.skills,expected,'EXACT_V53_INSTRUCTION_ORDER_REQUIRED');
 if(already){
  assert.deepEqual(entries[NAME],{enabled:true},'EXACT_WEATHER_ENABLEMENT_REQUIRED');
  assert.equal(load.extraDirs.filter(x=>x===B.weatherExtraDir).length,1,'EXACT_WEATHER_ROOT_REQUIRED');
  assertInvocationCurrent();return base;
 }
 assert(!load.extraDirs.includes(B.weatherExtraDir),'UNBOUND_WEATHER_ROOT');
 const out={...base,skills:{...base.skills,load:{...load,extraDirs:[...load.extraDirs,B.weatherExtraDir]},entries:{...entries,[NAME]:{enabled:true}}},agents:{...base.agents,entries:{...base.agents.entries,[ID]:{...a,skills:[...a.skills,NAME]}}}};
 // Preserve auth/channel/brand/recurrence/model/runtime policy by reference.
 for(const k of Object.keys(base))if(!['skills','agents'].includes(k))assert.strictEqual(out[k],base[k],'UNRELATED_POLICY_REFERENCE_CHANGED');
 for(const k of Object.keys(a))if(k!=='skills')assert.strictEqual(out.agents.entries[ID][k],a[k],'OWNER_POLICY_REFERENCE_CHANGED');
 for(const k of Object.keys(base.agents))if(k!=='entries')assert.strictEqual(out.agents[k],base.agents[k]);
 assert.strictEqual(out.skills.allowBundled,base.skills.allowBundled);
 assert.equal(out.tools.allow.length,30);assert.equal(out.agents.entries[ID].skills.length,30);
 assertInvocationCurrent();return out;
}
