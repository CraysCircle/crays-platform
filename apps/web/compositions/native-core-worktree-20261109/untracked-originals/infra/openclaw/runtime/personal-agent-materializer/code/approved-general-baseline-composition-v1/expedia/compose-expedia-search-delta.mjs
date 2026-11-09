/** Pure projection for one isolated personal instance. No filesystem, credential, login or provider calls. */
import assert from 'node:assert/strict';import path from 'node:path';
import B from './BASELINE_BINDINGS.json' with {type:'json'};
export const EXPEDIA_PLUGIN_ID=B.pluginId,EXPEDIA_PLUGIN_ROOT=B.pluginRoot;
export const EXPEDIA_MODEL_TOOLS=Object.freeze([...B.newModelToolNames]);
export const EXPEDIA_DEFERRED_TOOLS=Object.freeze([...B.deferredModelToolNames]);
export const EXPEDIA_PERSONAL_SKILL='crays-expedia-search';
const singleAgent=cfg=>{const ids=Object.keys(cfg?.agents?.entries??{});assert.equal(ids.length,1,'EXPEDIA_REQUIRES_ONE_PERSON_PER_PROCESS');assert(/^[a-z0-9][a-z0-9_-]{0,63}$/.test(ids[0]));return[ids[0],cfg.agents.entries[ids[0]]];};
const absolute=p=>typeof p==='string'&&p.startsWith('/')&&path.posix.normalize(p)===p&&!/[\u0000-\u001f\u007f]/.test(p);
export function assertExpediaPersonalHome(config,env){
 const[id,agent]=singleAgent(config);assert(absolute(agent.workspace)&&agent.workspace.endsWith('/workspace'));const state=agent.workspace.slice(0,-10);
 assert.equal(agent.agentDir,state+'/agents/'+id+'/agent','EXPEDIA_OWN_AGENT_STATE_REQUIRED');
 assert.equal(env.HOME,state,'EXPEDIA_PRIVATE_PERSON_HOME_REQUIRED');assert.equal(env.OPENCLAW_STATE_DIR,state,'EXPEDIA_PRIVATE_PERSON_STATE_REQUIRED');
 return Object.freeze({singlePersonProcess:true,credentialRelativeToPrivateHome:'.oc/credentials/eg-travel.json',credentialsRead:false});
}
export function assertExpediaModelPolicy(config){
 const[,agent]=singleAgent(config);assert.deepEqual(config.tts,B.exactTtsConfig,'V45_EXPLICIT_SPEECH_CONTRACT_MUST_SURVIVE');assert.deepEqual(config.tools.allow,[...B.toolNames,...EXPEDIA_MODEL_TOOLS]);assert.deepEqual(agent.tools.allow,config.tools.allow);assert.deepEqual(config.tools.deny,[]);
 assert.deepEqual(config.plugins.allow,[...B.pluginAllow,EXPEDIA_PLUGIN_ID]);assert.equal(config.plugins.load.paths.filter(x=>x===EXPEDIA_PLUGIN_ROOT).length,1);
 assert.deepEqual(config.plugins.entries[EXPEDIA_PLUGIN_ID],{enabled:true,config:B.fixedPluginConfig});
 const extraName='crays-cited-research';assert.deepEqual(B.allowedAdditionalInstructionSkills,[extraName]);const extraEnabled=config.skills?.entries?.[extraName]?.enabled===true;
 if(extraEnabled){assert.deepEqual(config.skills.entries[extraName],{enabled:true});const suffix='/state/workspace';assert(agent.workspace.endsWith(suffix));const root=agent.workspace.slice(0,-suffix.length)+'/code/cited-research/skills';assert.equal(config.skills.load.extraDirs.filter(p=>p===root).length,1,'EXACT_APPROVED_RESEARCH_INSTRUCTION_DIRECTORY_REQUIRED');}
 const expectedSkills=[...B.instructionSkills,EXPEDIA_PERSONAL_SKILL,...(extraEnabled?[extraName]:[])];assert.deepEqual(agent.skills,expectedSkills);assert(!agent.skills.includes('travel-search'),'ORIGINAL_AUTOSIGNUP_INSTRUCTIONS_NOT_ENABLED');
 for(const n of EXPEDIA_DEFERRED_TOOLS)assert(!config.tools.allow.includes(n)&&!agent.tools.allow.includes(n),'PERSONAL_SIGNUP_AND_VERIFY_DEFERRED');
 return Object.freeze({configuredModelTools:30,instructionSkills:expectedSkills.length,signupDeferred:true,verifyDeferred:true,liveSearchProven:false,bookingAvailable:false});
}
export function composeExpediaSearchDelta(base,{runtime}){
 assert(absolute(runtime));const[id,agent]=singleAgent(base);assert.deepEqual(base.tools.allow,B.toolNames,'EXACT_V45_27_TOOL_BASE_REQUIRED_REBASE_IF_CHANGED');assert.deepEqual(agent.tools.allow,B.toolNames);assert.deepEqual(agent.skills,B.instructionSkills);assert.deepEqual(base.plugins.allow,B.pluginAllow);assert.deepEqual(base.tts,B.exactTtsConfig,'EXACT_V45_TTS_BASE_REQUIRED');
 assert(!base.plugins.load.paths.includes(EXPEDIA_PLUGIN_ROOT));assert(!Object.hasOwn(base.plugins.entries,EXPEDIA_PLUGIN_ID));
 const skillRoot=runtime+'/code/expedia/skills';assert(!base.skills.load.extraDirs.includes(skillRoot));const allow=[...B.toolNames,...EXPEDIA_MODEL_TOOLS];
 const out={...base,tools:{...base.tools,allow},plugins:{...base.plugins,allow:[...base.plugins.allow,EXPEDIA_PLUGIN_ID],load:{...base.plugins.load,paths:[...base.plugins.load.paths,EXPEDIA_PLUGIN_ROOT]},entries:{...base.plugins.entries,[EXPEDIA_PLUGIN_ID]:{enabled:true,config:structuredClone(B.fixedPluginConfig)}}},skills:{...base.skills,load:{...base.skills.load,extraDirs:[...base.skills.load.extraDirs,skillRoot]},entries:{...base.skills.entries,[EXPEDIA_PERSONAL_SKILL]:{enabled:true}}},agents:{...base.agents,entries:{...base.agents.entries,[id]:{...agent,tools:{...agent.tools,allow:[...allow]},skills:[...agent.skills,EXPEDIA_PERSONAL_SKILL]}}}};
 for(const key of Object.keys(base))if(!['tools','plugins','skills','agents'].includes(key))assert.strictEqual(out[key],base[key]);assertExpediaModelPolicy(out);return out;
}
