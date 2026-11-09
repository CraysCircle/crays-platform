/** Count-preserving final V48 exporter replacement. No filesystem/provider/account/policy action. */
import assert from'node:assert/strict';import B from'./ARTIFACT_BINDINGS.json'with{type:'json'};

export function assertMultipartPdfConfig(config,{agentId:ID}){
 assert.deepEqual(Object.keys(config?.agents?.entries??{}),[ID]);const agent=config.agents.entries[ID];assert.deepEqual(config.tools.allow,B.toolNames);assert.deepEqual(agent.tools.allow,B.toolNames);assert.deepEqual(agent.skills,B.instructionNames);assert.equal(config.tools.allow.length,30);assert.equal(agent.skills.length,29);assert.equal(config.agents.defaults.timeoutSeconds,300);
 assert.equal(config.plugins.load.paths.filter(p=>p===B.pluginRoot).length,1);assert(!config.plugins.load.paths.includes(B.oldPluginRoot));assert(config.plugins.allow.includes(B.pluginId));assert.equal(config.plugins.entries[B.pluginId].enabled,true);return true;
}
export function composeMultipartPdfDelta(base,{agentId:ID}){
 assert.deepEqual(Object.keys(base?.agents?.entries??{}),[ID]);assert.deepEqual(base.tools.allow,B.toolNames);assert.deepEqual(base.agents.entries[ID].tools.allow,B.toolNames);assert.deepEqual(base.agents.entries[ID].skills,B.instructionNames);
 assert.equal(base.agents.defaults.timeoutSeconds,300,'EXACT_ACTUAL_V49_REQUEST_BUDGET_REQUIRED');
 assert.equal(base.plugins.load.paths.filter(p=>p===B.oldPluginRoot).length,1);assert(!base.plugins.load.paths.includes(B.pluginRoot));assert(base.plugins.allow.includes(B.pluginId));assert.equal(base.plugins.entries[B.pluginId].enabled,true);
 const out={...base,plugins:{...base.plugins,load:{...base.plugins.load,paths:base.plugins.load.paths.map(p=>p===B.oldPluginRoot?B.pluginRoot:p)}}};
 for(const[k,v]of Object.entries(base))if(k!=='plugins')assert.strictEqual(out[k],v);for(const[k,v]of Object.entries(base.agents))if(k!=='defaults')assert.strictEqual(out.agents[k],v);for(const[k,v]of Object.entries(base.agents.defaults))if(k!=='timeoutSeconds')assert.strictEqual(out.agents.defaults[k],v);for(const[k,v]of Object.entries(base.plugins))if(k!=='load')assert.strictEqual(out.plugins[k],v);for(const[k,v]of Object.entries(base.plugins.load))if(k!=='paths')assert.strictEqual(out.plugins.load[k],v);assert.equal(out.plugins.load.paths.length,base.plugins.load.paths.length);assertMultipartPdfConfig(out,{agentId:ID});return out;
}
