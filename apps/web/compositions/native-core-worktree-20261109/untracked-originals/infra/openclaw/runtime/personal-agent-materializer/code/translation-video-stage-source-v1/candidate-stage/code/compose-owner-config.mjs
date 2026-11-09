import assert from 'node:assert/strict';
import {withOwnerPersonalRecords} from './with-owner-personal-records.mjs';
import {composeGeneralSkillsSecondWave} from './scripts/crays-agent-general-skills-second-wave.mjs';
const ID='crays-agent-thorben';
export function composeOwnerToolConfig({runtime,modelRouteEvidence,base={}}) {
 assert(/^\/run\/crays-owner-tools-[a-z0-9-]+$/.test(runtime));

 const owner='/var/lib/crays-life-agent-thorben',model='openai/gpt-6-astra';
 const local={agents:{entries:{[ID]:{name:'Chuck Crays',workspace:owner+'/workspace',agentDir:owner+'/agents/'+ID+'/agent',model:{primary:model,fallbacks:[]},fastModeDefault:false,utilityModel:'',heartbeat:{every:'0m',target:'none'}}},defaults:{models:{[model]:{agentRuntime:{id:'openclaw'}}},heartbeat:{every:'0m',target:'none'},timeoutSeconds:300,maxConcurrent:1}},session:{dmScope:'per-account-channel-peer'},tools:{profile:'minimal',deny:['*']},plugins:{allow:['openai'],load:{paths:[]},entries:{openai:{enabled:true}}},channels:{},bindings:[],cron:{enabled:false},hooks:{enabled:false},discovery:{mdns:{mode:'off'}},update:{checkOnStart:false,auto:{enabled:false}}};
 const cfg=composeGeneralSkillsSecondWave(local,{apiRoute:'openai-chatgpt-responses',existingModelRef:model,modelRouteEvidence});
 // Preserve native configured auth order verbatim; never inspect/select/publish profile IDs.
 if(Object.hasOwn(base,'auth'))cfg.auth=base.auth;
 cfg.plugins.allow.push('crays-calculator');cfg.plugins.load.paths.push('/opt/crays/openclaw/plugin-artifacts/crays-calculator/9dc61bf9690602b5c8cb0460199160735d70146b2e2ab2b237284c1ad1267241');cfg.plugins.entries['crays-calculator']={enabled:true};
 cfg.tools.allow.push('crays_calculator');cfg.agents.entries[ID].tools.allow.push('crays_calculator');

 // Same original state in-place through the admitted non-symlink runtime bind.
 cfg.agents.entries[ID].workspace=runtime+'/state/workspace';
 cfg.agents.entries[ID].agentDir=runtime+'/state/agents/'+ID+'/agent';
 return withOwnerPersonalRecords(cfg,{runtime});
}
