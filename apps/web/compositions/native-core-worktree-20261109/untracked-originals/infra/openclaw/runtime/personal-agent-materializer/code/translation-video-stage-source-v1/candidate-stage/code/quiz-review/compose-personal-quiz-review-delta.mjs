/** Pure fixed additive owner Quiz delta after Cooking. No IO/auth/prompt text, new authority or runtime actions. */
import assert from 'node:assert/strict';
import A from './ARTIFACT_BINDINGS.json' with {type:'json'};
const ID='crays-agent-thorben',PLUGIN='crays-quiz-review',TOOL='crays_quiz_review';
export function composePersonalQuizReviewDelta(base){
 assert.deepEqual(Object.keys(base.agents.entries),[ID]);const agent=base.agents.entries[ID];
 for(const policy of [base.tools,agent.tools]){assert.equal(policy.profile,'full');assert.deepEqual(policy.allow,A.baselineTools);assert.deepEqual(policy.deny,[]);assert.equal(policy.fs.workspaceOnly,true);assert(!policy.alsoAllow?.length);}
 assert.deepEqual(agent.skills,A.baselineSkills);assert.deepEqual(base.plugins.allow,A.baselinePluginAllow);
 assert.deepEqual(base.plugins.load.paths.filter(x=>x.startsWith('/opt/')),A.baselinePluginRoots);
 assert.equal(new Set(base.plugins.load.paths).size,base.plugins.load.paths.length);assert.equal(new Set(base.skills.load.extraDirs).size,base.skills.load.extraDirs.length);
 assert.equal(base.cron.enabled,false);assert.equal(agent.workspace,'/run/crays-owner-tools-whatsapp-live/state/workspace');assert.equal(agent.agentDir,'/run/crays-owner-tools-whatsapp-live/state/agents/'+ID+'/agent');
 assert(!Object.hasOwn(base.plugins.entries,PLUGIN));assert(!Object.hasOwn(base.skills.entries,PLUGIN));assert(!base.skills.load.extraDirs.includes(A.skillRoot+'/skills'));
 assert(!base.plugins.deny?.some(x=>x==='*'||x===PLUGIN));assert(!base.skills.deny?.some(x=>x==='*'||x===PLUGIN));
 const out={...base,tools:{...base.tools,allow:[...base.tools.allow,TOOL]},agents:{...base.agents,entries:{...base.agents.entries,[ID]:{...agent,tools:{...agent.tools,allow:[...agent.tools.allow,TOOL]},skills:[...agent.skills,PLUGIN]}}},plugins:{...base.plugins,allow:[...base.plugins.allow,PLUGIN],load:{...base.plugins.load,paths:[...base.plugins.load.paths,A.pluginRoot]},entries:{...base.plugins.entries,[PLUGIN]:{enabled:true}}},skills:{...base.skills,load:{...base.skills.load,extraDirs:[...base.skills.load.extraDirs,A.skillRoot+'/skills']},entries:{...base.skills.entries,[PLUGIN]:{enabled:true}}}};
 assert.equal(out.tools.allow.length,24);assert.equal(out.agents.entries[ID].skills.length,20);
 for(const[k,v]of Object.entries(base))if(!['tools','agents','plugins','skills'].includes(k))assert.strictEqual(out[k],v);
 for(const[k,v]of Object.entries(agent))if(!['tools','skills'].includes(k))assert.strictEqual(out.agents.entries[ID][k],v);
 for(const[k,v]of Object.entries(base.plugins.entries))assert.strictEqual(out.plugins.entries[k],v);
 for(const[k,v]of Object.entries(base.skills.entries))assert.strictEqual(out.skills.entries[k],v);
 assert.strictEqual(out.tools.fs,base.tools.fs);assert.strictEqual(out.tools.media,base.tools.media);assert.strictEqual(out.agents.defaults,base.agents.defaults);
 return out;
}
