import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import B from './BASELINE_BINDINGS.json' with {type:'json'};
import {composeCitedResearchInheritance as compose} from './compose-cited-research-inheritance.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
function fresh(person){
 const agentId='personal-'+hash('crays.personal-agent.assignment.v1\n'+person).slice(0,48);
 const runtime='/var/lib/crays-personal-agents/'+hash('crays.personal-agent.person-namespace.v1\n'+person)+'/'+agentId;
 return {context:{agentId,runtime},base:{tools:{allow:[...B.baseToolNames],deny:[],fs:{workspaceOnly:true}},auth:{profiles:{own:{provider:'openai',mode:'oauth'}}},channels:{},bindings:[],cron:{enabled:true},plugins:{allow:['existing-only'],entries:{'existing-only':{enabled:true}}},skills:{load:{extraDirs:['/opt/existing-approved/skills']},entries:{existing:{enabled:true}}},agents:{defaults:{timeoutSeconds:300},entries:{[agentId]:{workspace:runtime+'/workspace',agentDir:runtime+'/agents/'+agentId+'/agent',tools:{allow:[...B.baseToolNames]},skills:[...B.baseInstructionNames],model:{primary:'openai/fixture-no-call',fallbacks:[]}}}}}};
}
function frozen(x){if(x&&typeof x==='object'){for(const v of Object.values(x))frozen(v);Object.freeze(x);}return x;}
test('two fresh canonical people retain separate paths and all current policy references',()=>{
 const a=fresh('fixture-alice'),b=fresh('fixture-bob');
 for(const x of [a,b]){const snapshot=structuredClone(x.base);frozen(x.base);const out=compose(x.base,x.context);assert.deepEqual(x.base,snapshot);assert.notEqual(out,x.base);assert.equal(out.agents.entries[x.context.agentId].skills.length,29);assert.equal(out.skills.load.extraDirs.at(-1),x.context.runtime+'/code/cited-research/skills');for(const k of ['tools','auth','channels','bindings','cron','plugins'])assert.strictEqual(out[k],x.base[k]);assert.strictEqual(out.agents.defaults,x.base.agents.defaults);assert.strictEqual(out.agents.entries[x.context.agentId].tools,x.base.agents.entries[x.context.agentId].tools);assert.strictEqual(out.agents.entries[x.context.agentId].model,x.base.agents.entries[x.context.agentId].model);assert.notEqual(out.skills.load.extraDirs,x.base.skills.load.extraDirs);}
 assert.notEqual(a.context.agentId,b.context.agentId);assert.notEqual(a.context.runtime,b.context.runtime);assert.throws(()=>compose(a.base,b.context));
});
test('reject owner identity, mismatched runtime/workspace/agent directory and extra agents',()=>{
 for(const mutate of [x=>x.context.agentId='crays-agent-thorben',x=>x.context.runtime='/run/crays-owner-tools-whatsapp-live',x=>x.context.runtime+='/other',x=>x.base.agents.entries[x.context.agentId].workspace='/other/workspace',x=>x.base.agents.entries[x.context.agentId].agentDir='/other/agent',x=>x.base.agents.entries[fresh('other').context.agentId]={},x=>x.context.skill='arbitrary']){const x=fresh('fixture-alice');mutate(x);assert.throws(()=>compose(x.base,x.context));}
});
test('reject duplicates, including reapplying the delta',()=>{
 const x=fresh('fixture-alice');assert.throws(()=>compose(compose(x.base,x.context),x.context));
 for(const mutate of [x=>x.base.skills.entries['crays-cited-research']={enabled:false},x=>x.base.skills.load.extraDirs.push(x.context.runtime+'/code/cited-research/skills'),x=>x.base.agents.entries[x.context.agentId].skills.push('crays-cited-research')]){const y=fresh('fixture-alice');mutate(y);assert.throws(()=>compose(y.base,y.context));}
});
test('reject incomplete25/26 shared baseline, extra/reordered tools and altered28 instructions',()=>{
 for(const mutate of [x=>x.base.tools.allow.splice(25),x=>x.base.agents.entries[x.context.agentId].skills.splice(26),x=>x.base.tools.allow.push('exec'),x=>x.base.tools.allow.reverse(),x=>x.base.agents.entries[x.context.agentId].tools.allow.pop(),x=>x.base.agents.entries[x.context.agentId].skills[0]='unapproved']){const x=fresh('fixture-alice');mutate(x);assert.throws(()=>compose(x.base,x.context));}
});
