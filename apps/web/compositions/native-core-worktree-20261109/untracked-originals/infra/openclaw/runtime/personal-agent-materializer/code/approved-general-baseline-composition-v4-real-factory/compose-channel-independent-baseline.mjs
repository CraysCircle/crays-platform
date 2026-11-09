import S from '../approved-general-baseline-composition-v3/INPUT_PROJECTED_RUNTIME_STANDARD.json' with {type:'json'};
/** Explicit25->26TTS->29Expedia tool stages; no fabricated WhatsApp route or reminder grant. */
import assert from'node:assert/strict';
import R from'../approved-general-baseline-composition-v3/reminders/REMINDER_BASELINE_BINDINGS.json'with{type:'json'};
import E from'../approved-general-baseline-composition-v3/expedia/BASELINE_BINDINGS.json'with{type:'json'};
import {composeExplicitSpeechDelta}from'./compose-explicit-speech-delta.mjs';
import {composeExpediaSearchDelta,assertExpediaModelPolicy}from'./compose-expedia-search-delta.mjs';
import {composeCitedResearchInheritance}from'../approved-general-baseline-composition-v3/channel-independent/cited-research/compose-cited-research-inheritance.mjs';
import {composeMultipartPdfDelta}from'../approved-general-baseline-composition-v3/channel-independent/multipart-pdf/compose-multipart-pdf-delta.mjs';
const ROOT='/opt/crays/openclaw/skill-artifacts/crays-explicit-voice-translation/bce655768df4c2526d3396dcd964362ad50d2108f6ddd6d044cbe1120f673db3';
const ordered=(a,e,label)=>assert(Array.isArray(a)&&a.length===e.length&&a.every((x,i)=>typeof x==='string'&&x===e[i]),label);
// Called only after the parent module validates genuine-person hash formulas and exact V20 base25/26.
export function composeChannelIndependentBaseline(base,{agentId,runtime}){
 const agent=base.agents.entries[agentId];assert.equal(base.cron?.enabled,false,'DORMANT_REMINDERS_REQUIRED');assert.equal(base.hooks?.enabled,false);
 assert.deepEqual(base.agents.defaults.heartbeat,{every:'0m',target:'none'});assert.deepEqual(agent.heartbeat,{every:'0m',target:'none'});
 assert([120,300].includes(base.agents.defaults.timeoutSeconds),'KNOWN_REQUEST_BUDGET_REQUIRED');
 const expectedPlugins=base.plugins.allow.includes('whatsapp')?R.pluginAllow:['openai','document-extract',...S.descriptor.plugins.map(p=>p.id)];
 ordered(base.plugins.allow,expectedPlugins,'EXACT_SHARED_BASE_PLUGIN_ALLOW_REQUIRED');
 assert(!Object.hasOwn(base.plugins.entries,'crays-personal-reminder-policy'),'NO_UNCONNECTED_REMINDER_POLICY');
 const names=E.instructionSkills.filter(x=>x!=='crays-voice-translation');
 const stage25={...base,tools:{...base.tools,allow:[...R.tools]},agents:{...base.agents,defaults:{...base.agents.defaults,timeoutSeconds:300},entries:{...base.agents.entries,[agentId]:{...agent,tools:{...agent.tools,allow:[...R.tools]},skills:[...names]}}}};
 ordered(stage25.tools.allow,R.tools,'EXACT25_STAGE');assert.equal(stage25.tools.allow.length,25);assert.equal(stage25.agents.entries[agentId].skills.length,26);
 const speech=composeExplicitSpeechDelta(stage25,{agentId,skillRoot:ROOT});const speechNames=E.toolNames.filter(x=>x!=='automations');
 ordered(speech.tools.allow,speechNames,'EXACT26_TTS_STAGE');assert.equal(speech.tools.allow.length,26);
 const travel=composeExpediaSearchDelta(speech,{runtime});const finalNames=[...speechNames,...E.newModelToolNames];ordered(travel.tools.allow,finalNames,'EXACT29_EXPEDIA_STAGE');assert.equal(travel.tools.allow.length,29);
 const research=composeCitedResearchInheritance(travel,{agentId,runtime});const config=composeMultipartPdfDelta(research,{agentId});assertExpediaModelPolicy(config);
 ordered(config.tools.allow,finalNames,'EXACT_FINAL29_TOOLS');ordered(config.agents.entries[agentId].tools.allow,finalNames,'EXACT_AGENT29_TOOLS');assert.equal(config.agents.entries[agentId].skills.length,29);
 for(const k of['auth','channels','bindings','commands','hooks','cron','session','gateway'])assert.strictEqual(config[k],base[k],'UNCONNECTED_BRANCH_POLICY_REFERENCE_CHANGED');
 assert.strictEqual(config.agents.entries[agentId].model,agent.model);assert(!config.tools.allow.includes('automations'));assert(!config.plugins.allow.includes('crays-personal-reminder-policy'));
 return {status:'SOURCE_COMPOSED_REMINDER_CONNECTION_PENDING',candidateConfig:config,toolCount:29,instructionCount:29,targetCatalogueToolNames:[...E.toolNames,...E.newModelToolNames],targetInstructionNames:[...E.instructionSkills,'crays-expedia-search','crays-cited-research'],actualCoreAssignmentChanged:false,inputProjectedToolCount:25,inputProjectedInstructionCount:26,pendingBranches:[{capability:'automations',status:'PENDING_OWN_WHATSAPP_REMINDER_ROUTE_AND_NATIVE_ADMISSION'}],runtimeStarted:false,nativeRegistryLoaded:false,ownAccountReadinessVerified:false,defaultFactorySwitched:false};
}
