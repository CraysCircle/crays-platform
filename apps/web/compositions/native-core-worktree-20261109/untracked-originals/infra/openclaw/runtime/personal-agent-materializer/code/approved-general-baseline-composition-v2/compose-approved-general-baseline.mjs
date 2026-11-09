import {composeChannelIndependentBaseline}from'./compose-channel-independent-baseline.mjs';
/** Pure shared future-user candidate; never installs, starts, logs in or grants authority. */
import assert from 'node:assert/strict';import {createHash}from'node:crypto';
import S from './INPUT_PROJECTED_RUNTIME_STANDARD.json'with{type:'json'};
import R from './reminders/REMINDER_BASELINE_BINDINGS.json'with{type:'json'};
import L from './selected-local-skills/ARTIFACT_BINDINGS.json'with{type:'json'};
import E from './expedia/BASELINE_BINDINGS.json'with{type:'json'};
import M from './multipart-pdf/ARTIFACT_BINDINGS.json'with{type:'json'};
import {composePersonalReminderCandidate}from'./reminders/compose-personal-reminder-candidate.mjs';
import {composeSelectedLocalSkills}from'./selected-local-skills/compose-selected-local-skills.mjs';
import {composeExplicitSpeechDelta}from'./tts/compose-explicit-speech-delta.mjs';
import {composeExpediaSearchDelta}from'./expedia/compose-expedia-search-delta.mjs';
import {composeCitedResearchInheritance}from'./cited-research/compose-cited-research-inheritance.mjs';
import {composeMultipartPdfDelta,assertMultipartPdfConfig}from'./multipart-pdf/compose-multipart-pdf-delta.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const VOICE_ROOT='/opt/crays/openclaw/skill-artifacts/crays-explicit-voice-translation/bce655768df4c2526d3396dcd964362ad50d2108f6ddd6d044cbe1120f673db3';
const array=(a,e)=>assert(Array.isArray(a)&&a.length===e.length&&a.every((v,i)=>typeof v==='string'&&v===e[i]),'EXACT_ORDERED_APPROVED_NAMES_REQUIRED');
function exactSet(a,e){assert(Array.isArray(a)&&a.length===e.length&&new Set(a).size===a.length&&a.every(v=>typeof v==='string'&&e.includes(v)),'EXACT_FIXED_BASELINE_SET_REQUIRED');}
function ownContext(base,c){
 assert(c&&Object.keys(c).length===3&&['canonicalPersonId','agentId','runtime'].every(k=>Object.hasOwn(c,k)),'EXACT_CORE_HOST_CONTEXT_REQUIRED');
 assert(typeof c.canonicalPersonId==='string'&&c.canonicalPersonId.length>0&&c.canonicalPersonId.length<=200,'CANONICAL_PERSON_REQUIRED');
 assert.equal(c.agentId,'personal-'+hash('crays.personal-agent.assignment.v1\n'+c.canonicalPersonId).slice(0,48),'CANONICAL_AGENT_MISMATCH');
 assert.equal(c.runtime,'/var/lib/crays-personal-agents/'+hash('crays.personal-agent.person-namespace.v1\n'+c.canonicalPersonId)+'/'+c.agentId,'CANONICAL_PERSON_RUNTIME_MISMATCH');
 array(Object.keys(base.agents.entries),[c.agentId]);const a=base.agents.entries[c.agentId];assert.equal(a.workspace,c.runtime+'/workspace');assert.equal(a.agentDir,c.runtime+'/agents/'+c.agentId+'/agent');return a;
}
export function composeApprovedGeneralBaseline(base,context){
 const agent=ownContext(base,context),{agentId,runtime}=context;
 // This is source composition against a previously materialized/admitted base, not an assignment or account verifier.
 array(base.tools.allow,S.descriptor.tools);array(agent.tools.allow,S.descriptor.tools);array(agent.skills,S.descriptor.skills);
 const selected=L.artifacts.map(x=>x.name),dirs=L.artifacts.map(x=>x.extraDir);assert.equal(selected.length,5);
 exactSet(base.tools.allow,R.tools);exactSet(agent.skills,[...R.skills,...selected]);
 assert(!base.bindings||Array.isArray(base.bindings),'ROUTE_ARRAY_REQUIRED');
 for(const route of base.bindings??[])assert.equal(route.agentId,agentId,'FOREIGN_ROUTE_DENIED');
 const hasOwnWhatsAppRoute=base.channels?.whatsapp&&base.bindings?.some(route=>route.match?.channel==='whatsapp');
 if(!hasOwnWhatsAppRoute)return composeChannelIndependentBaseline(base,context);
 // Reuse the original route validator; only a real separately admitted own channel may supply this config.
 assert([120,300].includes(base.agents.defaults.timeoutSeconds),'KNOWN_REQUEST_BUDGET_REQUIRED');
 for(const dir of dirs)assert.equal(base.skills.load.extraDirs.filter(x=>x===dir).length,1,'EXACT_EXISTING_ORIGINAL_INSTRUCTION_DIRECTORY_REQUIRED');
 const ordered={...base,tools:{...base.tools,allow:[...R.tools]},agents:{...base.agents,defaults:{...base.agents.defaults,timeoutSeconds:300},entries:{...base.agents.entries,[agentId]:{...agent,tools:{...agent.tools,allow:[...R.tools]},skills:[...R.skills]}}},skills:{...base.skills,load:{...base.skills.load,extraDirs:base.skills.load.extraDirs.filter(x=>!dirs.includes(x))}}};
 const reminder=composePersonalReminderCandidate(ordered);const withOriginals=composeSelectedLocalSkills(reminder.candidateConfig);
 const speech=composeExplicitSpeechDelta(withOriginals,{agentId,skillRoot:VOICE_ROOT});
 const travel=composeExpediaSearchDelta(speech,{runtime});
 const research=composeCitedResearchInheritance(travel,{agentId,runtime});
 const config=composeMultipartPdfDelta(research,{agentId});assertMultipartPdfConfig(config,{agentId});
 array(config.tools.allow,[...E.toolNames,...E.newModelToolNames]);array(config.agents.entries[agentId].tools.allow,config.tools.allow);array(config.agents.entries[agentId].skills,[...E.instructionSkills,'crays-expedia-search','crays-cited-research']);
 for(const k of ['auth','channels','bindings','commands','hooks','session','gateway'])assert.strictEqual(config[k],base[k],'OWN_POLICY_OR_CONNECTION_REFERENCE_CHANGED');
 assert.strictEqual(config.agents.entries[agentId].model,agent.model,'OWN_MODEL_REFERENCE_CHANGED');
 assert.equal(config.agents.defaults.heartbeat.every,'0m');assert.equal(config.agents.defaults.heartbeat.target,'none');
 assert.equal(config.plugins.load.paths.filter(p=>p===M.pluginRoot).length,1);assert(!config.plugins.load.paths.includes(M.oldPluginRoot));
 return {status:'SOURCE_COMPOSED_NOT_ADMITTED',candidateConfig:config,assignmentVersionStill:S.descriptor.version,toolCount:30,instructionCount:29,reminderActivationRequirements:reminder.activation,runtimeStarted:false,nativeRegistryLoaded:false,ownAccountReadinessVerified:false,defaultFactorySwitched:false};
}
