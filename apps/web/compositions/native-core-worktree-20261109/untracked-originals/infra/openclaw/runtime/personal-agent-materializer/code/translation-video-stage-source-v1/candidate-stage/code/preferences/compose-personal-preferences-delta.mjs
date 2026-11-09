/** Generic additive source candidate. Carries every current base tool/plugin/skill unchanged; no deployment actions. */
import assert from 'node:assert/strict';import A from './ARTIFACT_BINDINGS.json' with {type:'json'};
const ID='crays-agent-thorben',PLUGIN='crays-personal-preferences',TOOL='crays_personal_preferences';
export function composePersonalPreferencesDelta(base){
 assert.deepEqual(Object.keys(base.agents.entries),[ID]);const agent=base.agents.entries[ID];assert.equal(base.cron?.enabled,false);
 for(const p of[base.tools,agent.tools]){assert.equal(p.profile,'full');assert(Array.isArray(p.allow)&&p.allow.includes('crays_personal_records')&&!p.allow.includes(TOOL));assert.deepEqual(p.deny,[]);assert.equal(p.fs?.workspaceOnly,true);assert(!p.alsoAllow?.length);}
 assert.deepEqual(base.tools.allow,agent.tools.allow);assert(Array.isArray(agent.skills)&&!agent.skills.includes(PLUGIN));
 assert(Array.isArray(base.plugins.allow)&&!base.plugins.allow.includes(PLUGIN));assert(!Object.hasOwn(base.plugins.entries,PLUGIN));assert(!base.plugins.deny?.some(x=>x==='*'||x===PLUGIN));assert(Array.isArray(base.plugins.load.paths)&&!base.plugins.load.paths.some(x=>x.includes('/'+PLUGIN+'/')));
 assert(Array.isArray(base.skills.load.extraDirs)&&!base.skills.load.extraDirs.includes(A.skillRoot+'/skills'));assert.equal(base.skills.load.extraDirs.filter(x=>x===A.correctedBudgetSkillRoot+'/skills').length,1);assert(!Object.hasOwn(base.skills.entries,PLUGIN));
 const out={...base,tools:{...base.tools,allow:[...base.tools.allow,TOOL]},agents:{...base.agents,entries:{...base.agents.entries,[ID]:{...agent,tools:{...agent.tools,allow:[...agent.tools.allow,TOOL]},skills:[...agent.skills,PLUGIN]}}},plugins:{...base.plugins,allow:[...base.plugins.allow,PLUGIN],load:{...base.plugins.load,paths:[...base.plugins.load.paths,A.pluginRoot]},entries:{...base.plugins.entries,[PLUGIN]:{enabled:true,hooks:{allowPromptInjection:true,allowConversationAccess:true}}}},skills:{...base.skills,load:{...base.skills.load,extraDirs:[...base.skills.load.extraDirs,A.skillRoot+'/skills']},entries:{...base.skills.entries,[PLUGIN]:{enabled:true}}}};
 for(const[k,v]of Object.entries(base))if(!['tools','agents','plugins','skills'].includes(k))assert.strictEqual(out[k],v);
 for(const[k,v]of Object.entries(agent))if(!['tools','skills'].includes(k))assert.strictEqual(out.agents.entries[ID][k],v);
 for(const[k,v]of Object.entries(base.plugins.entries))assert.strictEqual(out.plugins.entries[k],v);
 for(const[k,v]of Object.entries(base.skills.entries))assert.strictEqual(out.skills.entries[k],v);
 assert.deepEqual(out.tools.allow.slice(0,-1),base.tools.allow);assert.deepEqual(out.agents.entries[ID].skills.slice(0,-1),agent.skills);assert.deepEqual(out.plugins.load.paths.slice(0,-1),base.plugins.load.paths);assert.deepEqual(out.skills.load.extraDirs.slice(0,-1),base.skills.load.extraDirs);
 assert.strictEqual(out.tools.media,base.tools.media);assert.strictEqual(out.tools.fs,base.tools.fs);assert.strictEqual(out.agents.defaults,base.agents.defaults);return out;
}
