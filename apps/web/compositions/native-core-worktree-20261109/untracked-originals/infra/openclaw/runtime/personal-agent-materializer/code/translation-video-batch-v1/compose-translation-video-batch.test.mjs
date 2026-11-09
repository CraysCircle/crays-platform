import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash}from'node:crypto';
import vm from 'node:vm';
import B from './TRANSLATION_VIDEO_BINDINGS.json' with {type:'json'};
import W from './baseline/V53_WEATHER_BINDINGS.json' with {type:'json'};
import {composeTranslationVideoBatch as owner,composePersonalTranslationVideoInstructions as generic,assertTranslationVideoBatchProfile as profile}from'./compose-translation-video-batch.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const now=()=>{};
function base(){return {auth:{opaque:'test-only'},channels:{whatsapp:{enabled:true}},bindings:[{agentId:W.agentId,match:{channel:'whatsapp',accountId:'crays-agent-business'}}],tools:{allow:[...W.tools],deny:[]},plugins:{allow:[...W.pluginAllow],load:{paths:[...W.expectedExistingPluginRoots]},entries:Object.fromEntries(W.pluginAllow.map(n=>[n,{enabled:true}]))},tts:clone(W.tts),cron:{enabled:true},agents:{defaults:{timeoutSeconds:300,maxConcurrent:1},entries:{[W.agentId]:{name:W.agentName,workspace:W.runtime+'/state/workspace',agentDir:W.runtime+'/state/agents/'+W.agentId+'/agent',tools:{allow:[...W.tools]},skills:[...B.baselineInstructionNames],otherPolicy:{original:true}}}},skills:{allowBundled:['weather'],load:{extraDirs:['/existing/instructions',W.weatherExtraDir],watch:false},entries:{weather:{enabled:true},[W.weatherSkill]:{enabled:true}},extraPolicy:{preserved:true}}};}
const call=b=>owner(b,{assertInvocationCurrent:now});
test('exact V2 guide copies, hashes and content-addressed prospective roots',()=>{
 for(const a of B.artifacts){const data=fs.readFileSync(new URL(`./artifacts/${a.name}/${a.relativePath}`,import.meta.url));assert.equal(data.length,a.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),a.sha256);assert.equal(a.root,`/opt/crays/openclaw/skill-artifacts/${a.name}/${a.sha256}`);assert.equal(a.extraDir,a.root+'/skills');assert.deepEqual(data,fs.readFileSync(a.source.path));}
});
test('owner30 to32 is atomic, immutable and preserves every unrelated reference',()=>{
 const b=base(),before=JSON.stringify(b),out=call(b);assert.equal(JSON.stringify(b),before);assert.deepEqual(out.agents.entries[W.agentId].skills,B.finalInstructionNames);assert.equal(out.tools.allow.length,30);
 for(const k of Object.keys(b))if(!['agents','skills'].includes(k))assert.strictEqual(out[k],b[k]);
 for(const k of Object.keys(b.agents.entries[W.agentId]))if(k!=='skills')assert.strictEqual(out.agents.entries[W.agentId][k],b.agents.entries[W.agentId][k]);
 assert.strictEqual(out.agents.defaults,b.agents.defaults);assert.strictEqual(out.skills.allowBundled,b.skills.allowBundled);assert.equal(out.skills.load.watch,false);assert.strictEqual(out.skills.entries.weather,b.skills.entries.weather);assert.equal(profile(out).instructionCount,32);
});
test('idempotent32 returns exact object only after complete revalidation',()=>{const b=call(base());assert.strictEqual(call(b),b);b.skills.entries[B.artifacts[1].name].enabled=false;assert.throws(()=>call(b));});
test('generic two fresh people without WhatsApp retain channel and all other agents',()=>{
 for(const id of ['personal-alpha','personal-beta']){const b=base(),a=b.agents.entries[W.agentId];b.agents.entries={[id]:a,unselected:{skills:['unchanged']}};b.channels={telegram:{opaque:'owned'}};b.bindings=[{agentId:id,match:{channel:'telegram'}}];const out=generic(b,{agentId:id,baselineInstructionNames:B.baselineInstructionNames,assertInvocationCurrent:now});assert.strictEqual(out.channels,b.channels);assert.strictEqual(out.bindings,b.bindings);assert.strictEqual(out.agents.entries.unselected,b.agents.entries.unselected);assert.equal(profile(out,{agentId:id,baselineInstructionNames:B.baselineInstructionNames}).instructionCount,32);assert.throws(()=>call(b));}
});
test('generic baseline is host-declared, not an owner/account authorization claim',()=>{const b=base(),names=Array.from({length:30},(_,i)=>'host-existing-'+i);b.agents.entries[W.agentId].skills=names;const out=generic(b,{agentId:W.agentId,baselineInstructionNames:names,assertInvocationCurrent:now});assert.deepEqual(out.agents.entries[W.agentId].skills,[...names,...B.artifacts.map(a=>a.name)]);assert.throws(()=>call(b));assert.throws(()=>generic(b,{agentId:W.agentId,baselineInstructionNames:names.slice(1),assertInvocationCurrent:now}));});
for(const [name,mutate]of [
 ['reordered base',b=>b.agents.entries[W.agentId].skills.reverse()],
 ['missing base',b=>b.agents.entries[W.agentId].skills.pop()],
 ['alien base',b=>b.agents.entries[W.agentId].skills[0]='alien'],
 ['partial31',b=>b.agents.entries[W.agentId].skills.push(B.artifacts[0].name)],
 ['orphan entry',b=>b.skills.entries[B.artifacts[0].name]={enabled:true}],
 ['orphan root',b=>b.skills.load.extraDirs.push(B.artifacts[0].extraDir)],
 ['replaced root footprint',b=>b.skills.load.extraDirs.push(B.artifacts[0].extraDir.replace(B.artifacts[0].sha256,'alien'))],
 ['duplicate existing root',b=>b.skills.load.extraDirs.push(W.weatherExtraDir)],
 ['extra tool',b=>b.tools.allow.push('exec')],
 ['plugin replacement',b=>b.plugins.allow[0]='alien'],
 ['wrong owner path',b=>b.agents.entries[W.agentId].agentDir='/foreign'],
 ['wrong route',b=>b.bindings[0].match.accountId='foreign'],
 ['disabled weather',b=>b.skills.entries[W.weatherSkill].enabled=false]
])test('deny '+name,()=>{const b=base();mutate(b);assert.throws(()=>call(b));});
for(const [name,mutate]of [
 ['extra33',b=>b.agents.entries[W.agentId].skills.push('alien')],
 ['reversed batch',b=>{const a=b.agents.entries[W.agentId].skills;[a[30],a[31]]=[a[31],a[30]];}],
 ['missing batch root',b=>b.skills.load.extraDirs.pop()],
 ['duplicate batch root',b=>b.skills.load.extraDirs.push(B.artifacts[0].extraDir)],
 ['wrong batch root',b=>b.skills.load.extraDirs[b.skills.load.extraDirs.length-1]='/alien'],
 ['disabled batch',b=>b.skills.entries[B.artifacts[0].name].enabled=false],
 ['extra enable key',b=>b.skills.entries[B.artifacts[0].name].config={}],
 ['symbol enable key',b=>b.skills.entries[B.artifacts[0].name][Symbol('alien')]=true],
 ['getter enable',b=>Object.defineProperty(b.skills.entries[B.artifacts[0].name],'enabled',{enumerable:true,get(){throw new Error('MUST_NOT_READ');}})],
 ['holey names',b=>delete b.agents.entries[W.agentId].skills[30]],
 ['extra array property',b=>b.agents.entries[W.agentId].skills.extra=true]
])test('reject malformed32 '+name,()=>{const b=call(base());mutate(b);assert.throws(()=>profile(b));assert.throws(()=>call(b));});
test('sync currentness runs before and after; revocation prevents output',()=>{let calls=0;const b=base();const before=JSON.stringify(b);assert.throws(()=>owner(b,{assertInvocationCurrent:()=>{if(++calls===3)throw Error('REVOKED');}}),/REVOKED/);assert.equal(JSON.stringify(b),before);let good=0;owner(base(),{assertInvocationCurrent:()=>{good++;}});assert.equal(good,3);});
test('async, promises, rejected promises and thenables denied without thenable dispatch',async()=>{
 let dispatched=0;
 for(const fn of [async()=>{},()=>Promise.resolve(),()=>Promise.reject(Error('synthetic')),()=>({then(){dispatched++;}}),()=>true])assert.throws(()=>owner(base(),{assertInvocationCurrent:fn}));
 await new Promise(r=>setImmediate(r));assert.equal(dispatched,0);assert.throws(()=>owner(base()));
});
test('cross-realm exact instruction arrays accepted without weakening own dense values',()=>{const b=base();b.agents.entries[W.agentId].skills=vm.runInNewContext(JSON.stringify(B.baselineInstructionNames));const out=call(b);assert.equal(profile(out).instructionCount,32);});
