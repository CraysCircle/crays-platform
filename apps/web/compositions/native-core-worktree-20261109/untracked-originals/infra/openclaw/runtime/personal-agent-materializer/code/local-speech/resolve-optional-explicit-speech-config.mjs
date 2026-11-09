/** Per-invocation provider choice. No runtime start, preference save or authorization grant.
 * Reuses the accepted explicit speech validation and original OpenClaw provider configuration.
 */
import assert from 'node:assert/strict';
import {resolveExplicitSpeechConfig as resolveExisting} from './original-explicit-speech-call.mjs';
import {composeOptionalLocalCliProvider} from './compose-optional-local-cli-provider.mjs';
export {withExplicitSpeechCall,currentExplicitSpeechCall,assertExplicitSpeechOwner} from './original-explicit-speech-call.mjs';
export function resolveOptionalExplicitSpeechConfig(cfg,request,hostContext){
 const provider=request?.provider??'microsoft';
 assert(['microsoft','tts-local-cli'].includes(provider),'EXPLICIT_SPEECH_PROVIDER_UNSUPPORTED');
 if(provider==='microsoft')return {...resolveExisting(cfg,request),providerId:'microsoft'};
 assert(request.language==='en-US'&&(request.voice===undefined||request.voice==='female'),'LOCAL_SPEECH_VOICE_NOT_QUALIFIED');
 assert(hostContext?.agentId===request.agentId,'EXPLICIT_LOCAL_HOST_AGENT_REQUIRED');
 const timeoutMs=request.timeoutMs??45000;
 assert(Number.isInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=45000,'EXPLICIT_LOCAL_TIMEOUT_LIMIT');
 // Preserve existing text/override/default-provider guards. Local voice selection never changes defaults.
 const existing=resolveExisting(cfg,{...request,timeoutMs:undefined});
 assert(cfg.plugins.allow.includes('tts-local-cli')&&cfg.plugins.entries['tts-local-cli']?.enabled===true,'OPTIONAL_LOCAL_PROVIDER_NOT_INSTALLED');
 assert(!cfg.plugins.deny?.some(x=>x==='*'||x==='tts-local-cli'),'OPTIONAL_LOCAL_PROVIDER_DENIED');
 const {['tts-local-cli']:localConfig,...otherProviders}=cfg.tts.providers;
 const {['tts-local-cli']:localEntry,...otherEntries}=cfg.plugins.entries;
 const originalBase={...cfg,tts:{...cfg.tts,providers:otherProviders},plugins:{...cfg.plugins,allow:cfg.plugins.allow.filter(x=>x!=='tts-local-cli'),entries:otherEntries}};
 const expected=composeOptionalLocalCliProvider(originalBase,hostContext).candidateConfig.tts.providers['tts-local-cli'];
 assert.deepEqual(localConfig,expected,'TRUSTED_LOCAL_PROVIDER_BINDING_REQUIRED');
 return {providerId:'tts-local-cli',timeoutMs,cfg:{...existing.cfg,tts:{...existing.cfg.tts,provider:'tts-local-cli',timeoutMs,providers:{'tts-local-cli':{...expected,timeoutMs}}}}};
}
