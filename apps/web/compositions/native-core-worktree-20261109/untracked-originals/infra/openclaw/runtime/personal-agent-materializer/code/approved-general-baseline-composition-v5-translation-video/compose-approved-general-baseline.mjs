/** Pure source successor, not authority, catalogue admission or factory activation. */
import assert from 'node:assert/strict';
import {isAsyncFunction,isPromise}from'node:util/types';
import {composeApprovedGeneralBaseline as v4}from'../approved-general-baseline-composition-v4-real-factory/compose-approved-general-baseline.mjs';
import {composePersonalTranslationVideoInstructions,assertTranslationVideoBatchProfile}from'../translation-video-batch-v1/compose-translation-video-batch.mjs';
import B from'./FIXED_THREE_GUIDE_BINDINGS.json'with{type:'json'};
const then=Promise.prototype.then,W=B.weather,thirty=[...B.baselineInstructionNames,W.name];
function current(check){assert.equal(typeof check,'function','HOST_SYNC_CURRENTNESS_REQUIRED');assert(!isAsyncFunction(check),'ASYNC_CURRENTNESS_DENIED');const value=check();if(isPromise(value))Reflect.apply(then,value,[undefined,()=>{}]);assert(value===undefined,'CURRENTNESS_MUST_RETURN_UNDEFINED');}
function strings(a,e){assert(Array.isArray(a)&&a.length===e.length,'EXACT_FIXED_ORDER_REQUIRED');assert.deepEqual(Reflect.ownKeys(a),[...e.map((_,i)=>String(i)),'length']);for(let i=0;i<e.length;i++){const d=Object.getOwnPropertyDescriptor(a,String(i));assert(d&&Object.hasOwn(d,'value')&&d.enumerable&&d.value===e[i],'EXACT_FIXED_ORDER_REQUIRED');}}
function weather(config){const dirs=config.skills?.load?.extraDirs,entry=config.skills?.entries?.[W.name];assert(entry&&typeof entry==='object'&&!Array.isArray(entry));assert.deepEqual(Reflect.ownKeys(entry),['enabled']);const d=Object.getOwnPropertyDescriptor(entry,'enabled');assert(d&&Object.hasOwn(d,'value')&&d.enumerable&&d.value===true,'EXACT_WEATHER_ENTRY_REQUIRED');assert(Array.isArray(dirs)&&new Set(dirs).size===dirs.length);assert.equal(dirs.filter(p=>typeof p==='string'&&p.includes('/crays-weather-public/')).length,1,'EXACT_SINGLE_WEATHER_ROOT_REQUIRED');assert.equal(dirs.filter(p=>p===W.extraDir).length,1,'PINNED_WEATHER_ROOT_REQUIRED');}
/** Fixed29->32 across host-selected agents; only the same three named guide roots. */
export function composeFixedGeneralInstructions(base,{agentId,assertInvocationCurrent}={}){
 current(assertInvocationCurrent);assert(typeof agentId==='string'&&agentId.length>0,'HOST_AGENT_ID_REQUIRED');const a=base?.agents?.entries?.[agentId];assert(a,'EXISTING_AGENT_REQUIRED');
 let weatherBase=base;
 if(a.skills?.length===32){weather(base);assertTranslationVideoBatchProfile(base,{agentId,baselineInstructionNames:thirty});current(assertInvocationCurrent);return base;}
 strings(a.skills,B.baselineInstructionNames);const entries=base.skills?.entries,load=base.skills?.load;assert(entries&&load&&Array.isArray(load.extraDirs));assert(!Object.hasOwn(entries,W.name),'PARTIAL_WEATHER_PROFILE_DENIED');assert(!load.extraDirs.some(p=>typeof p==='string'&&p.includes('/crays-weather-public/')),'ORPHAN_WEATHER_ROOT_DENIED');
 weatherBase={...base,agents:{...base.agents,entries:{...base.agents.entries,[agentId]:{...a,skills:thirty.slice()}}},skills:{...base.skills,entries:{...entries,[W.name]:{enabled:true}},load:{...load,extraDirs:[...load.extraDirs,W.extraDir]}}};
 weather(weatherBase);const out=composePersonalTranslationVideoInstructions(weatherBase,{agentId,baselineInstructionNames:thirty,assertInvocationCurrent});
 for(const k of Reflect.ownKeys(base))if(k!=='skills'&&k!=='agents')assert.strictEqual(out[k],base[k]);for(const k of Reflect.ownKeys(a))if(k!=='skills')assert.strictEqual(out.agents.entries[agentId][k],a[k]);for(const k of Reflect.ownKeys(base.agents))if(k!=='entries')assert.strictEqual(out.agents[k],base.agents[k]);for(const [id,agent]of Object.entries(base.agents.entries))if(id!==agentId)assert.strictEqual(out.agents.entries[id],agent);for(const k of Reflect.ownKeys(base.skills))if(k!=='entries'&&k!=='load')assert.strictEqual(out.skills[k],base.skills[k]);for(const k of Reflect.ownKeys(load))if(k!=='extraDirs')assert.strictEqual(out.skills.load[k],load[k]);for(const k of Reflect.ownKeys(entries))assert.strictEqual(out.skills.entries[k],entries[k]);
 current(assertInvocationCurrent);return out;
}
export function composeApprovedGeneralBaseline(base,context,{assertInvocationCurrent}={}){
 current(assertInvocationCurrent);const previous=v4(base,context);assert.equal(previous.instructionCount,29);assert([29,30].includes(previous.toolCount));
 const candidateConfig=composeFixedGeneralInstructions(previous.candidateConfig,{agentId:context.agentId,assertInvocationCurrent});
 assert.strictEqual(candidateConfig.tools,previous.candidateConfig.tools);assert.strictEqual(candidateConfig.plugins,previous.candidateConfig.plugins);assert.equal(candidateConfig.agents.entries[context.agentId].skills.length,32);current(assertInvocationCurrent);
 return {...previous,candidateConfig,instructionCount:32,...(previous.targetInstructionNames?{targetInstructionNames:[...thirty,...candidateConfig.agents.entries[context.agentId].skills.slice(30)]}:{}),fixedGuideSourceComposed:true,sourceOnly:true,nativeRegistryLoaded:false,defaultFactorySwitched:false,weatherDefaultSourceGapAddressed:true,weatherDefaultRuntimeQualified:false};
}
