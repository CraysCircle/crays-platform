/** Pure additive POST-D42 candidate. No I/O, login, sender, restart or shared preference changes. */
import assert from 'node:assert/strict';
export function composeExplicitSpeechDelta(base,{agentId,skillRoot}){
 const agent=base.agents?.entries?.[agentId];assert(agent,'Existing effective personal agent required');
 assert(/^\/opt\/crays\/openclaw\/skill-artifacts\/crays-explicit-voice-translation\/[a-f0-9]{64}$/.test(skillRoot),'Exact separately staged skill required');
 for(const p of[base.tools,agent.tools]){assert.equal(p.profile,'full');assert.equal(p.fs?.workspaceOnly,true);assert.deepEqual(p.deny,[]);assert(Array.isArray(p.allow)&&p.allow.length===25&&!p.allow.includes('tts'));}assert.deepEqual(base.tools.allow,agent.tools.allow);
 assert(base.plugins?.allow?.includes('whatsapp'));assert(base.plugins.entries?.microsoft?.enabled!==false);assert(!base.plugins.deny?.some(x=>x==='*'||x==='microsoft'));
 assert.equal(base.tts,undefined,'Prior speech configuration requires a separate migration');assert.equal(agent.tts,undefined);for(const channel of Object.values(base.channels??{})){assert.equal(channel.tts,undefined);for(const account of Object.values(channel.accounts??{}))assert.equal(account.tts,undefined);}
 const addPolicy=p=>({...p,allow:[...p.allow,'tts']});const skill='crays-voice-translation';
 const cfg={...base,tts:{auto:'off',provider:'microsoft',mode:'final',maxTextLength:2000,timeoutMs:10000,modelOverrides:{enabled:false},providers:{microsoft:{enabled:true,voice:'es-ES-ElviraNeural',lang:'es-ES',outputFormat:'audio-24khz-48kbitrate-mono-mp3',timeoutMs:10000,saveSubtitles:false}}},tools:addPolicy(base.tools),agents:{...base.agents,entries:{...base.agents.entries,[agentId]:{...agent,tools:addPolicy(agent.tools),skills:[...agent.skills,skill]}}},plugins:{...base.plugins,allow:[...new Set([...base.plugins.allow,'microsoft'])],entries:{...base.plugins.entries,microsoft:{...base.plugins.entries.microsoft,enabled:true}}},skills:{...base.skills,load:{...base.skills.load,extraDirs:[...base.skills.load.extraDirs,skillRoot+'/skills']},entries:{...base.skills.entries,[skill]:{enabled:true}}}};
 for(const key of['gateway','channels','bindings','commands','auth','session','cron','hooks'])assert.strictEqual(cfg[key],base[key]);assert.strictEqual(cfg.agents.defaults,base.agents.defaults);
 return cfg;
}
