/** Trusted host pure candidate. Does not resolve identity, stage code or grant runtime authority. */
import assert from 'node:assert/strict';
import B from './BASELINE_BINDINGS.json' with {type:'json'};
const NAME='crays-cited-research', ROOT='/var/lib/crays-personal-agents';
function ordered(actual,expected,label){assert(Array.isArray(actual)&&actual.length===expected.length&&actual.every((v,i)=>typeof v==='string'&&v===expected[i]),label);}
export function composeCitedResearchInheritance(base,context){
 assert(context&&Object.keys(context).length===2&&Object.hasOwn(context,'agentId')&&Object.hasOwn(context,'runtime'),'EXACT_HOST_CONTEXT_REQUIRED');
 const {agentId,runtime}=context;
 assert(typeof agentId==='string'&&/^personal-[a-f0-9]{48}$/.test(agentId),'CANONICAL_PERSONAL_AGENT_REQUIRED');
 assert(typeof runtime==='string'&&new RegExp('^'+ROOT+'/[a-f0-9]{64}/'+agentId+'$').test(runtime),'CANONICAL_PERSON_RUNTIME_REQUIRED');
 ordered(Object.keys(base.agents.entries),[agentId],'ONE_MATCHING_CANONICAL_AGENT_REQUIRED');
 const agent=base.agents.entries[agentId];
 assert.equal(agent.workspace,runtime+'/workspace','MATCHING_PRIVATE_WORKSPACE_REQUIRED');
 assert.equal(agent.agentDir,runtime+'/agents/'+agentId+'/agent','MATCHING_PRIVATE_AGENT_DIR_REQUIRED');
 ordered(base.tools.allow,B.baseToolNames,'EXACT_APPROVED_30_TOOL_BASE_REQUIRED');
 ordered(agent.tools.allow,B.baseToolNames,'EXACT_AGENT_30_TOOL_BASE_REQUIRED');
 ordered(agent.skills,B.baseInstructionNames,'EXACT_APPROVED_28_INSTRUCTION_BASE_REQUIRED');
 assert(!Object.hasOwn(base.skills.entries,NAME),'CITED_INSTRUCTION_ALREADY_ASSIGNED');
 const directory=runtime+'/code/cited-research/skills';
 assert(Array.isArray(base.skills.load.extraDirs)&&!base.skills.load.extraDirs.includes(directory),'CITED_DIRECTORY_ALREADY_ASSIGNED');
 const out={...base,skills:{...base.skills,load:{...base.skills.load,extraDirs:[...base.skills.load.extraDirs,directory]},entries:{...base.skills.entries,[NAME]:{enabled:true}}},agents:{...base.agents,entries:{...base.agents.entries,[agentId]:{...agent,skills:[...agent.skills,NAME]}}}};
 for(const key of Object.keys(base))if(!['skills','agents'].includes(key))assert.strictEqual(out[key],base[key]);
 for(const key of Object.keys(agent))if(key!=='skills')assert.strictEqual(out.agents.entries[agentId][key],agent[key]);
 assert.strictEqual(out.agents.defaults,base.agents.defaults);
 ordered(out.tools.allow,B.baseToolNames,'TOOLS_MUST_REMAIN_UNCHANGED');
 ordered(out.agents.entries[agentId].skills,[...B.baseInstructionNames,NAME],'EXACT_ADDITIVE_INSTRUCTION_REQUIRED');
 return out;
}
