import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import B from './V53_WEATHER_BINDINGS.json'with{type:'json'};
import{composeWeatherV53}from'./compose-weather-v53.mjs';
const ID=B.agentId;
function fixture(){const tools={allow:[...B.tools],deny:[],profile:'minimal',fs:{workspaceOnly:true}};return{auth:{ownReference:'synthetic-only-no-token'},tools,plugins:{allow:[...B.pluginAllow],load:{paths:[...B.expectedExistingPluginRoots]},entries:Object.fromEntries(B.pluginAllow.map(id=>[id,{enabled:true}]))},tts:structuredClone(B.tts),agents:{defaults:{timeoutSeconds:300,maxConcurrent:1,heartbeat:{every:'0m',target:'none'}},entries:{[ID]:{name:'Chuck Crays',workspace:B.runtime+'/state/workspace',agentDir:B.runtime+'/state/agents/'+ID+'/agent',tools,skills:[...B.instructions],model:{primary:'openai/gpt-6-astra',fallbacks:[]},heartbeat:{every:'0m',target:'none'}}}},skills:{allowBundled:['weather'],load:{extraDirs:[B.runtime+'/code/cited-research/skills']},entries:{'crays-cited-research':{enabled:true}}},channels:{whatsapp:{fixture:true}},bindings:[{agentId:ID,match:{channel:'whatsapp',accountId:'crays-agent-business'}}],cron:{enabled:true,fixtureRecurringPolicy:'unchanged'},hooks:{enabled:true},commands:{bash:false,restart:false},session:{dmScope:'per-account-channel-peer'},brand:{firstName:'Chuck',lastName:'Crays',vifs:'VIFs'},gateway:{fixture:true}};}
const context=(guard=()=>{})=>({sourceIdentity:{...B.baselineIdentity},assertInvocationCurrent:guard});
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const x of Object.values(value))freeze(x);}return value;}
test('adds only the weather instruction while preserving authority, branding and recurrence references',()=>{const base=freeze(fixture());let checks=0;const out=composeWeatherV53(base,context(()=>{checks++;}));assert.equal(checks,2);assert.equal(out.tools.allow.length,30);assert.equal(out.agents.entries[ID].skills.length,30);assert.equal(base.agents.entries[ID].skills.length,29);assert.deepEqual(out.agents.entries[ID].skills,[...B.instructions,B.weatherSkill]);for(const k of Object.keys(base))if(!['agents','skills'].includes(k))assert.strictEqual(out[k],base[k]);for(const k of Object.keys(base.agents.entries[ID]))if(k!=='skills')assert.strictEqual(out.agents.entries[ID][k],base.agents.entries[ID][k]);assert.strictEqual(out.agents.defaults,base.agents.defaults);assert.equal(out.skills.load.extraDirs.at(-1),B.weatherExtraDir);});
test('exact replay is idempotent with no duplicate instruction or directory',()=>{const first=composeWeatherV53(fixture(),context());const again=composeWeatherV53(first,context());assert.strictEqual(again,first);assert.equal(again.skills.load.extraDirs.filter(x=>x===B.weatherExtraDir).length,1);});
test('revoked authority before or after composition propagates without mutating input',()=>{for(const stopAt of[1,2]){const base=fixture(),before=structuredClone(base);let n=0;const denied=new Error('synthetic-revocation');assert.throws(()=>composeWeatherV53(base,context(()=>{if(++n===stopAt)throw denied;})),e=>e===denied);assert.deepEqual(base,before);}});
test('a changed accepted source identity is rejected',()=>{const c=context();c.sourceIdentity.planSha256='0'.repeat(64);assert.throws(()=>composeWeatherV53(fixture(),c),/EXACT_ACCEPTED_V53_SOURCE_IDENTITY_REQUIRED/);});
test('cross-agent, multiple-agent and foreign workspace configurations are rejected',()=>{for(const mutate of[b=>{b.agents.entries.other=b.agents.entries[ID];},b=>{b.agents.entries[ID].workspace='/other/workspace';},b=>{b.bindings[0].agentId='other';}]){const base=fixture();mutate(base);assert.throws(()=>composeWeatherV53(base,context()));}});
test('wrong baseline inventory and exec escalation are rejected',()=>{for(const mutate of[b=>b.tools.allow.push('exec'),b=>b.agents.entries[ID].skills.reverse(),b=>b.plugins.allow.push('foreign-provider')]){const base=fixture();mutate(base);assert.throws(()=>composeWeatherV53(base,context()));}});
test('foreign or retired plugin roots and changed speech provider are rejected',()=>{for(const mutate of[b=>b.plugins.load.paths.push('/foreign/plugin'),b=>b.plugins.load.paths.push(B.excludedHistoricalPluginRoots[0]),b=>{b.tts.provider='foreign';}]){const base=fixture();mutate(base);assert.throws(()=>composeWeatherV53(base,context()));}});
test('incomplete baseline roots or plugin entries cannot be accepted as the real V53 inventory',()=>{for(const mutate of[b=>b.plugins.load.paths.pop(),b=>{delete b.plugins.entries.openai;},b=>{b.plugins.entries.openai.enabled=false;}]){const base=fixture();mutate(base);assert.throws(()=>composeWeatherV53(base,context()));}});
test('partial, disabled or duplicate weather state is rejected rather than silently repaired',()=>{for(const mutate of[b=>{b.skills.entries[B.weatherSkill]={enabled:false};},b=>b.skills.load.extraDirs.push(B.weatherExtraDir),b=>{b.skills.load.extraDirs.push(b.skills.load.extraDirs[0]);}]){const base=fixture();mutate(base);assert.throws(()=>composeWeatherV53(base,context()));}});
test('revocation also applies to idempotent replay',()=>{const base=composeWeatherV53(fixture(),context());assert.throws(()=>composeWeatherV53(base,context(()=>{throw Error('revoked');})),/revoked/);});
test('actual instruction limits itself to useful public-place text weather through the existing tool',()=>{const text=readFileSync(new URL('./skills/crays-weather-public/SKILL.md',import.meta.url),'utf8');assert.match(text,/existing `web_fetch`/);assert.match(text,/maxChars: 4096/);assert.match(text,/maxChars: 16384/);assert.match(text,/actual date returned/);assert.match(text,/Fetch time is not observation time/);assert.match(text,/untrusted external data/);assert.match(text,/Do not run curl/);assert.doesNotMatch(text,/api\.open-meteo\.com|Open-Meteo|crays-personal-standing-intent/);assert.match(text,/do not claim to create a weather image/);});

test('async currentness callbacks are rejected before invocation, including rejected callbacks',async()=>{
 for(const rejected of[false,true]){
  let called=false;
  const guard=async()=>{called=true;if(rejected)throw Error('must never execute');};
  assert.throws(()=>composeWeatherV53(fixture(),context(guard)),/SYNCHRONOUS_CURRENTNESS_ASSERTION_REQUIRED/);
  assert.equal(called,false);
 }
});
test('ordinary callbacks returning native promises fail closed without unhandled rejection',async()=>{
 const unhandled=[];const listen=e=>unhandled.push(e);process.on('unhandledRejection',listen);
 try{
  for(const reject of[false,true]){
   const base=fixture(),before=structuredClone(base);
   assert.throws(()=>composeWeatherV53(base,context(()=>reject?Promise.reject(Error('synthetic rejected result')):Promise.resolve())),/CURRENTNESS_ASSERTION_MUST_RETURN_UNDEFINED/);
   assert.deepEqual(base,before);
  }
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(unhandled,[]);
 }finally{process.off('unhandledRejection',listen);}
});
test('thenables and non-undefined results are denied without invoking or reading arbitrary then',()=>{
 let reads=0,calls=0;const thenable={get then(){reads++;return()=>{calls++;};}};
 for(const value of[thenable,false,true,{},null,0,'']){
  assert.throws(()=>composeWeatherV53(fixture(),context(()=>value)),/CURRENTNESS_ASSERTION_MUST_RETURN_UNDEFINED/);
 }
 assert.equal(reads,0);assert.equal(calls,0);
});
test('invalid post-compose and replay currentness results cannot return a candidate',()=>{
 for(const replay of[false,true]){
  const base=replay?composeWeatherV53(fixture(),context()):fixture();
  const before=structuredClone(base);let n=0;
  assert.throws(()=>composeWeatherV53(base,context(()=>{if(++n===2)return false;})),/CURRENTNESS_ASSERTION_MUST_RETURN_UNDEFINED/);
  assert.equal(n,2);assert.deepEqual(base,before);
 }
});
