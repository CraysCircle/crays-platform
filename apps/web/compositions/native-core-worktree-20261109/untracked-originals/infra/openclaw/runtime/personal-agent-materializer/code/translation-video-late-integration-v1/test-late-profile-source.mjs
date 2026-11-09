/** Source-only pure profile tests. No SDK, requester, provider or runtime activation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const batch=path.resolve(here,'../translation-video-batch-v1');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'crays-profile-source-'));
fs.mkdirSync(temp+'/weather');fs.mkdirSync(temp+'/translation-video-batch-v1/baseline',{recursive:true});
fs.copyFileSync(here+'/assert-weather-instruction-profile.mjs',temp+'/weather/assert-weather-instruction-profile.mjs');
for(const name of ['compose-translation-video-batch.mjs','TRANSLATION_VIDEO_BINDINGS.json','baseline/V53_WEATHER_BINDINGS.json'])fs.copyFileSync(batch+'/'+name,temp+'/translation-video-batch-v1/'+name);
fs.copyFileSync(batch+'/baseline/V53_WEATHER_BINDINGS.json',temp+'/weather/V53_WEATHER_BINDINGS.json');
const W=JSON.parse(fs.readFileSync(batch+'/baseline/V53_WEATHER_BINDINGS.json')),B=JSON.parse(fs.readFileSync(batch+'/TRANSLATION_VIDEO_BINDINGS.json'));
const {assertWeatherInstructionProfile:check}=await import(pathToFileURL(temp+'/weather/assert-weather-instruction-profile.mjs'));
const cfg=n=>({agents:{entries:{[W.agentId]:{skills:n===28?W.instructions.slice(0,28):n===29?[...W.instructions]:n===30?[...W.instructions,W.weatherSkill]:B.finalInstructionNames.slice()}}},skills:{entries:n<30?{}:{[W.weatherSkill]:{enabled:true},...(n===32?Object.fromEntries(B.artifacts.map(a=>[a.name,{enabled:true}])):{})},load:{extraDirs:n<30?[]:[W.weatherExtraDir,...(n===32?B.artifacts.map(a=>a.extraDir):[])]}}});
const checkN=(c,n=29)=>check(c,{agentId:W.agentId,baselineInstructionNames:W.instructions.slice(0,n)});
try{
 await test('retains exact legacy28',()=>assert.equal(checkN(cfg(28),28).instructionCount,28));
 await test('retains exact legacy29',()=>assert.equal(checkN(cfg(29)).instructionCount,29));
 await test('retains exact weather30',()=>assert.equal(checkN(cfg(30)).instructionCount,30));
 await test('accepts exact weather plus two fixed guides32',()=>assert.equal(checkN(cfg(32)).instructionCount,32));
 await test('rejects different agent32',()=>assert.throws(()=>check(cfg(32),{agentId:'other',baselineInstructionNames:W.instructions})));
 await test('rejects wrong legacy baseline for32',()=>assert.throws(()=>checkN(cfg(32),28)));
 await test('rejects reordered two additions',()=>{const c=cfg(32),a=c.agents.entries[W.agentId].skills;[a[30],a[31]]=[a[31],a[30]];assert.throws(()=>checkN(c));});
 await test('rejects disabled translation',()=>{const c=cfg(32);c.skills.entries[B.artifacts[0].name].enabled=false;assert.throws(()=>checkN(c));});
 await test('rejects replaced video root',()=>{const c=cfg(32);c.skills.load.extraDirs[2]+='-replaced';assert.throws(()=>checkN(c));});
 await test('rejects orphan batch entry on30',()=>{const c=cfg(30);c.skills.entries[B.artifacts[0].name]={enabled:true};assert.throws(()=>checkN(c));});
 await test('keeps weather enablement guard for32',()=>{const c=cfg(32);c.skills.entries[W.weatherSkill].enabled=false;assert.throws(()=>checkN(c));});
 await test('keeps weather exact root guard for32',()=>{const c=cfg(32);c.skills.load.extraDirs[0]+='-replaced';assert.throws(()=>checkN(c));});
 await test('rejects unlisted33rd instruction',()=>{const c=cfg(32);c.agents.entries[W.agentId].skills.push('extra');assert.throws(()=>checkN(c));});
 await test('rejects batch orphan without weather',()=>{const c=cfg(29);c.skills.entries[B.artifacts[0].name]={enabled:true};assert.throws(()=>checkN(c));});
}finally{fs.rmSync(temp,{recursive:true,force:true});}
