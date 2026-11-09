import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
export async function qualifyReminderRegistryBoundary({config,registry}){
 const R='/run/crays-owner-tools-whatsapp-live',D=R+'/node_modules/openclaw/dist/',mod=n=>import(pathToFileURL(D+n));
 const {s:getGlobalHookRunnerRegistry}=await mod('hook-runner-global-CAwEvnZt.mjs');
 const {r:withGeneration,t:getGeneration}=await mod('generation-state-C1yPL1Zl.mjs');
 const {r:getContextRegistry,u:withContextRegistry}=await mod('gateway-request-scope-BSmCVVpP.mjs');
 const {t:createEmpty}=await mod('registry-empty-D0pq-oeY.mjs');
 const {w:retire,b:isRetired}=await mod('registry-lifecycle-Cju8-zUe.mjs');
 const {b:runBeforeToolCallHook}=await mod('agent-tools.before-tool-call-iy-Keqfw.mjs');
 const {reminderToolBoundaryDecision:boundary}=await import(R+'/code/reminders/native-reminder-runtime-boundary.mjs');
 const params={action:'add',job:{declarationKey:'SYNTHETIC_REGISTRY_PROOF_0001',schedule:{kind:'every',everyMs:60000},payload:{kind:'agentTurn',message:'Synthetic registry-only request; never dispatched.'}}};
 const decide=r=>boundary({config,registry:r,toolName:'automations',action:'add',params});
 const denied=r=>{const result=decide(r);assert.equal(result?.blocked,true);assert.equal(result.deniedReason,'crays-reminder-native-boundary');};
 assert(Array.isArray(registry.tools));assert(Array.isArray(registry.speechProviders));assert.equal(isRetired(registry),false);
 await withGeneration(registry,async()=>{
  assert.strictEqual(getGeneration(),registry);
  const facade=getGlobalHookRunnerRegistry();assert(facade);assert.deepEqual(Object.keys(facade).sort(),['hooks','plugins','trustedToolPolicies','typedHooks']);
  assert.equal(facade.tools,undefined);assert.equal(facade.speechProviders,undefined);assert.strictEqual(facade.plugins,registry.plugins);assert.strictEqual(facade.trustedToolPolicies,registry.trustedToolPolicies);
  denied(facade);assert.equal(decide(getGeneration()??getContextRegistry()),undefined);
  const outcome=await runBeforeToolCallHook({toolName:'automations',params,ctx:{config},toolCallId:'synthetic-missing-requester'});
  assert.equal(outcome.blocked,true);assert.equal(outcome.deniedReason,'plugin-before-tool-call');assert.equal(outcome.reason,'REMINDER_TRUSTED_REQUESTER_REQUIRED');
 });
 assert.equal(decide(registry),undefined);denied(undefined);denied(createEmpty());
 const contextView={...registry};withContextRegistry(contextView,()=>assert.strictEqual(getContextRegistry(),contextView));
 await withGeneration(createEmpty(),async()=>{const outcome=await runBeforeToolCallHook({toolName:'automations',params,ctx:{config},toolCallId:'synthetic-empty-selected-registry'});assert.equal(outcome.blocked,true);assert.equal(outcome.deniedReason,'crays-reminder-native-boundary');});
 denied({...registry,tools:[]});denied({...registry,trustedToolPolicies:[]});
 const {EXPEDIA_PLUGIN_ID}=await import(R+'/code/expedia/compose-expedia-search-delta.mjs');
 const record=registry.plugins.find(p=>p.id===EXPEDIA_PLUGIN_ID);assert(record);
 denied({...registry,plugins:registry.plugins.map(p=>p===record?{...p,source:p.source+'.unexpected'}:p)});
 const retired=createEmpty();retire(retired);assert.equal(isRetired(retired),true);
 await withGeneration(retired,async()=>{assert.strictEqual(getGeneration(),retired);const outcome=await runBeforeToolCallHook({toolName:'automations',params,ctx:{config},toolCallId:'synthetic-retired-registry'});assert.equal(outcome.blocked,true);assert.equal(outcome.deniedReason,'crays-reminder-native-boundary');});
 assert.equal(decide(registry),undefined);
 const clone=()=>JSON.parse(JSON.stringify(config));const bad=c=>{const x=boundary({config:c,registry,toolName:'automations',action:'add',params});assert.equal(x?.blocked,true);assert.equal(x.deniedReason,'crays-reminder-native-boundary');};
 const ID=Object.keys(config.agents.entries)[0],W=JSON.parse((await import('node:fs')).readFileSync(R+'/code/weather/V53_WEATHER_BINDINGS.json','utf8'));
 {const c=clone();c.agents.entries[ID].skills[29]='alien-weather';bad(c);}
 {const c=clone();[c.agents.entries[ID].skills[0],c.agents.entries[ID].skills[1]]=[c.agents.entries[ID].skills[1],c.agents.entries[ID].skills[0]];bad(c);}
 {const c=clone();c.skills.entries[W.weatherSkill].enabled=false;bad(c);}
 {const c=clone();c.skills.load.extraDirs=c.skills.load.extraDirs.map(x=>x===W.weatherExtraDir?x+'-replaced':x);bad(c);}
 {const c=clone();c.agents.entries[ID].skills.pop();bad(c);}
 const TV=JSON.parse((await import('node:fs')).readFileSync(R+'/code/translation-video-batch-v1/TRANSLATION_VIDEO_BINDINGS.json','utf8'));for(const a of TV.artifacts){{const c=clone();c.skills.entries[a.name].enabled=false;bad(c);}{const c=clone();c.skills.load.extraDirs=c.skills.load.extraDirs.map(x=>x===a.extraDir?x+'-replaced':x);bad(c);}{const c=clone();c.skills.load.extraDirs.push(a.extraDir);bad(c);}{const c=clone();c.agents.entries[ID].skills=c.agents.entries[ID].skills.filter(n=>n!==a.name);bad(c);}}{const c=clone();c.agents.entries[ID].skills[30]='alien-batch';bad(c);}{const c=clone();[c.agents.entries[ID].skills[30],c.agents.entries[ID].skills[31]]=[c.agents.entries[ID].skills[31],c.agents.entries[ID].skills[30]];bad(c);}
 return {batchProfileAlienReorderedDisabledReplacedDuplicateOrphanDenied:true,weatherProfileAlienReorderedDisabledReplacedOrphanDenied:true,originalHookFacadeMissingFullToolInventoryRejected:true,originalScopedFullRegistryPassesBoundary:true,productionBeforeToolReachesUnchangedTrustedRequesterPolicy:true,missingReplacedRetiredPolicyToolSourceRegistriesDenied:true,retiredGenerationDoesNotFallBackToHealthyRegistry:true,registryBoundaryProof:{scope:'ISOLATED_ORIGINAL_GATEWAY_NO_AUTHORIZED_TOOL_EXECUTION',facadeKeys:['hooks','plugins','trustedToolPolicies','typedHooks'],positiveToolName:'automations',nativeScheduleMinimumMs:60000,missingRequesterDeniedReason:'plugin-before-tool-call',missingRequesterPolicyCode:'REMINDER_TRUSTED_REQUESTER_REQUIRED',schedulerInvoked:false,authorityFabricated:false}};
}
