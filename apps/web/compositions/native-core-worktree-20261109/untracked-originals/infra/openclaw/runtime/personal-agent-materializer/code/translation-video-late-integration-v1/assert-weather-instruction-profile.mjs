/** Pure exact late instruction profile. No grant, mutation, filesystem or registry projection. */
import assert from 'node:assert/strict';
import W from './V53_WEATHER_BINDINGS.json' with {type:'json'};
const NAME=W.weatherSkill,DIR=W.weatherExtraDir;
import {assertTranslationVideoBatchProfile} from '../translation-video-batch-v1/compose-translation-video-batch.mjs';
import B from '../translation-video-batch-v1/TRANSLATION_VIDEO_BINDINGS.json' with {type:'json'};
const BATCH_NAMES=B.artifacts.map(a=>a.name);
function exactStrings(actual,expected,label){
 assert(Array.isArray(actual)&&actual.length===expected.length,label);
 assert.deepEqual(Reflect.ownKeys(actual),[...expected.map((_,i)=>String(i)),'length'],label);
 for(let i=0;i<expected.length;i++){const d=Object.getOwnPropertyDescriptor(actual,String(i));assert(d&&Object.hasOwn(d,'value')&&d.enumerable&&d.value===expected[i],label);}
}
export function assertWeatherInstructionProfile(config,{agentId,baselineInstructionNames}){
 const agent=config?.agents?.entries?.[agentId],actual=agent?.skills,entries=config?.skills?.entries,dirs=config?.skills?.load?.extraDirs;
 const batchFootprint=BATCH_NAMES.some(n=>actual?.includes(n)||Object.hasOwn(entries??{},n))||dirs?.some(p=>typeof p==='string'&&B.artifacts.some(a=>p===a.extraDir||p.includes('/skill-artifacts/'+a.name+'/')));
 const footprint=actual?.includes(NAME)||Object.hasOwn(entries??{},NAME)||dirs?.some(p=>typeof p==='string'&&(p===DIR||p.includes('/crays-weather-public/')));
 if(!footprint){assert(!batchFootprint,'BATCH_REQUIRES_EXACT_WEATHER_PROFILE');assert.deepEqual(actual,baselineInstructionNames);return Object.freeze({instructionCount:actual.length,weatherInstruction:false});}
 assert.equal(agentId,W.agentId,'EXACT_ADMITTED_WEATHER_AGENT_REQUIRED');
 exactStrings(baselineInstructionNames,W.instructions,'WEATHER_ONLY_AFTER_EXACT_CITED_29_BASELINE');assert.equal(baselineInstructionNames.length,29);
 if(batchFootprint){assertTranslationVideoBatchProfile(config);}
 else{
 exactStrings(actual,[...W.instructions,NAME],'EXACT_29_PLUS_SINGLE_WEATHER_INSTRUCTION_REQUIRED');
 }
 const enabled=entries?.[NAME];assert(enabled&&typeof enabled==='object'&&!Array.isArray(enabled),'EXACT_WEATHER_ENABLEMENT_REQUIRED');
 assert.deepEqual(Reflect.ownKeys(enabled),['enabled'],'EXACT_WEATHER_ENABLEMENT_REQUIRED');const enabledDescriptor=Object.getOwnPropertyDescriptor(enabled,'enabled');assert(enabledDescriptor&&Object.hasOwn(enabledDescriptor,'value')&&enabledDescriptor.enumerable&&enabledDescriptor.value===true,'EXACT_WEATHER_ENABLEMENT_REQUIRED');
 assert(Array.isArray(dirs)&&new Set(dirs).size===dirs.length&&dirs.every(p=>typeof p==='string'&&p.startsWith('/')),'EXACT_UNIQUE_INSTRUCTION_DIRECTORIES_REQUIRED');
 assert.equal(dirs.filter(p=>p===DIR).length,1,'EXACT_PINNED_WEATHER_ARTIFACT_EXTRA_DIR_REQUIRED');
 assert.equal(dirs.filter(p=>p.includes('/crays-weather-public/')).length,1,'REPLACED_OR_ADDITIONAL_WEATHER_ROOT_DENIED');
 if(batchFootprint)return Object.freeze({instructionCount:32,weatherInstruction:true,translationVideoInstructions:true});
 return Object.freeze({instructionCount:30,weatherInstruction:true});
}
