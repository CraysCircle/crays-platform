import{n as validateConfigObjectRawWithPlugins}from'../node_modules/openclaw/dist/validation-BEEczOwC.mjs';
/** Original non-starting schema/plugin validation, with explicit own-state environment only. */
export function validateNativeConfig(config,{stateDir,agentDir}){
 return validateConfigObjectRawWithPlugins(config,{env:{PATH:'/usr/bin:/bin',HOME:stateDir,OPENCLAW_STATE_DIR:stateDir,OPENCLAW_AGENT_DIR:agentDir},pluginValidation:'full',semanticValidation:'strict'});
}
