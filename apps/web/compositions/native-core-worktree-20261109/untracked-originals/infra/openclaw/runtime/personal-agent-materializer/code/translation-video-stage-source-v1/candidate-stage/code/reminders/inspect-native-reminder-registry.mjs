/** Inspect ORIGINAL loadGatewayPlugins(...).pluginRegistry in the same admitted
 * bootstrap/replacement path. This is NOT an authority grant, plugin load call,
 * watcher binding, or substitute for the real native requester.
 */
import assert from 'node:assert/strict';
export function inspectNativeReminderRegistry(registry){
 assert(registry&&Array.isArray(registry.plugins)&&Array.isArray(registry.trustedToolPolicies)&&Array.isArray(registry.typedHooks),'ACTUAL_NATIVE_REGISTRY_REQUIRED');
 const record=registry.plugins.filter(p=>p.id==='crays-personal-reminder-policy');assert.equal(record.length,1,'REQUIRED_POLICY_PLUGIN_MISSING');assert.equal(record[0].status,'loaded','REQUIRED_POLICY_PLUGIN_NOT_LOADED');assert.equal(record[0].origin,'config','EXPECTED_INSTALLED_POLICY_ORIGIN');
 assert.equal(registry.trustedToolPolicies.length,1,'UNEXPECTED_ADDITIONAL_POLICY_IN_EXACT_ADMITTED_SCOPE');
 const policies=registry.trustedToolPolicies.filter(r=>r.pluginId==='crays-personal-reminder-policy'&&r.policy?.id==='crays-personal-reminder-only');assert.equal(policies.length,1,'REQUIRED_POLICY_REGISTRATION_MISSING');assert.equal(typeof policies[0].policy.evaluate,'function');const matcher=policies[0].policy.matcher;assert(Array.isArray(matcher),'EXACT_POLICY_MATCHER_ARRAY_REQUIRED');assert.equal(matcher.length,2,'EXACT_POLICY_MATCHER_LENGTH_REQUIRED');assert.equal(typeof matcher[0],'string','EXACT_POLICY_MATCHER_STRING_REQUIRED');assert.equal(typeof matcher[1],'string','EXACT_POLICY_MATCHER_STRING_REQUIRED');assert.equal(matcher[0],'automations','EXACT_POLICY_MATCHER_NAMES_REQUIRED');assert.equal(matcher[1],'cron','EXACT_POLICY_MATCHER_NAMES_REQUIRED');assert.deepEqual(Array.from(matcher),['automations','cron']);
 const after=registry.typedHooks.filter(r=>r.pluginId==='crays-personal-reminder-policy'&&r.hookName==='after_tool_call');assert.equal(after.length,1,'REQUIRED_RESULT_HOOK_MISSING');assert.equal(typeof after[0].handler,'function');
 assert.equal(registry.typedHooks.filter(r=>r.hookName==='before_tool_call').length,0,'UNEXPECTED_POST_POLICY_HOOK_IN_EXACT_ADMITTED_SCOPE');
 return Object.freeze({requiredPolicyRegistered:true,requiredResultHookRegistered:true,postPolicyBeforeHookCount:0,nativeRequesterAuthorityProven:false,cronOrToolEnablementAuthorized:false});
}
