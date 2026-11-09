/** Pure exact additional instruction; no tools, roles, provider, records, filesystem or network actions. */
import assert from'node:assert/strict';import B from'./BASELINE_BINDINGS.json'with{type:'json'};
const ID='crays-agent-thorben',NAME='crays-cited-research';
export function composeCitedResearchDelta(base,{runtime}){
 assert.equal(runtime,'/run/crays-owner-tools-whatsapp-live');assert.deepEqual(Object.keys(base.agents.entries),[ID]);const agent=base.agents.entries[ID];assert.equal(agent.workspace,runtime+'/state/workspace');assert.deepEqual(base.tools.allow,B.baseToolNames);assert.deepEqual(agent.tools.allow,B.baseToolNames);assert.deepEqual(agent.skills,B.baseInstructionNames);assert(!Object.hasOwn(base.skills.entries,NAME));const directory=runtime+'/code/cited-research/skills';assert(!base.skills.load.extraDirs.includes(directory));
 const out={...base,skills:{...base.skills,load:{...base.skills.load,extraDirs:[...base.skills.load.extraDirs,directory]},entries:{...base.skills.entries,[NAME]:{enabled:true}}},agents:{...base.agents,entries:{...base.agents.entries,[ID]:{...agent,skills:[...agent.skills,NAME]}}}};
 for(const key of Object.keys(base))if(!['skills','agents'].includes(key))assert.strictEqual(out[key],base[key]);assert.strictEqual(out.agents.entries[ID].tools,agent.tools);assert.deepEqual(out.tools.allow,B.baseToolNames);assert.equal(out.agents.entries[ID].skills.length,29);return out;
}
