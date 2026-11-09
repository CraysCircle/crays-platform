/** Optional provider configuration only. Reuses original OpenClaw Local CLI provider and
 * original Sherpa executable. No I/O, service start, login, default voice switch or grant.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
export const DEPENDENCY_ROOT='/opt/crays/openclaw/qualification-artifacts/crays-local-tts-original-runtime-v1/239d0bb22dd9b5123dc4ae709a11d5183b2e46068835cf8ffa015d288dd01046';
export const DEPENDENCY_MANIFEST_SHA256='239d0bb22dd9b5123dc4ae709a11d5183b2e46068835cf8ffa015d288dd01046';
const RUNTIME=DEPENDENCY_ROOT+'/sherpa-onnx-v1.13.2-linux-x64-shared';
const MODEL=DEPENDENCY_ROOT+'/vits-piper-en_US-ljspeech-high';
export function composeOptionalLocalCliProvider(base,context){
 assert(context&&Object.keys(context).sort().join(',')==='agentId,canonicalPersonId,runtime','EXACT_TRUSTED_HOST_CONTEXT_REQUIRED');
 const {canonicalPersonId,agentId,runtime}=context;
 assert(typeof canonicalPersonId==='string'&&canonicalPersonId.length>0&&canonicalPersonId.length<=200,'CORE_PERSON_REQUIRED');
 assert.equal(agentId,'personal-'+hash('crays.personal-agent.assignment.v1\n'+canonicalPersonId).slice(0,48),'CANONICAL_AGENT_REQUIRED');
 assert.equal(runtime,'/var/lib/crays-personal-agents/'+hash('crays.personal-agent.person-namespace.v1\n'+canonicalPersonId)+'/'+agentId,'CANONICAL_RUNTIME_REQUIRED');
 assert.deepEqual(Object.keys(base.agents?.entries??{}),[agentId],'ONE_MATCHING_PERSON_PROCESS_REQUIRED');
 const agent=base.agents.entries[agentId];assert.equal(agent.workspace,runtime+'/workspace');assert.equal(agent.agentDir,runtime+'/agents/'+agentId+'/agent');
 assert(base.tools?.allow?.includes('tts')&&agent.tools?.allow?.includes('tts'),'APPROVED_TTS_TOOL_REQUIRED');
 assert.equal(base.tts?.auto,'off','EXPLICIT_SPEECH_ONLY_REQUIRED');assert.equal(base.tts.modelOverrides?.enabled,false,'MODEL_PROVIDER_OVERRIDE_DISABLED_REQUIRED');
 assert.equal(base.tts.provider,'microsoft','EXISTING_ACCEPTED_PROVIDER_MUST_REMAIN_DEFAULT');assert(Number.isSafeInteger(base.tts.maxTextLength)&&base.tts.maxTextLength>0&&base.tts.maxTextLength<=2000,'KNOWN_TEXT_BOUND_REQUIRED');
 assert(!base.plugins.allow.includes('tts-local-cli')&&!Object.hasOwn(base.plugins.entries,'tts-local-cli'),'LOCAL_PROVIDER_ALREADY_CONFIGURED_REQUIRES_MIGRATION');
 assert(!Object.hasOwn(base.tts.providers,'tts-local-cli'),'LOCAL_PROVIDER_CONFIG_ALREADY_EXISTS');
 // env -i clears inherited private configuration before executing the fixed native binary.
 // The original Sherpa parser supports standalone --; user text is one positional argument.
 const provider={command:'/usr/bin/env',args:['-i','PATH=/usr/bin:/bin','HOME='+runtime,'TMPDIR='+runtime+'/workspace','LD_LIBRARY_PATH='+RUNTIME+'/lib','OMP_NUM_THREADS=1','OPENBLAS_NUM_THREADS=1','LANG=C.UTF-8','LC_ALL=C.UTF-8','TZ=UTC',RUNTIME+'/bin/sherpa-onnx-offline-tts','--vits-model='+MODEL+'/en_US-ljspeech-high.onnx','--vits-tokens='+MODEL+'/tokens.txt','--vits-data-dir='+MODEL+'/espeak-ng-data','--output-filename={{OutputPath}}','--num-threads=1','--provider=cpu','--','{{Text}}'],outputFormat:'wav',timeoutMs:45000,cwd:runtime+'/workspace'};
 const out={...base,tts:{...base.tts,providers:{...base.tts.providers,'tts-local-cli':provider}},plugins:{...base.plugins,allow:[...base.plugins.allow,'tts-local-cli'],entries:{...base.plugins.entries,'tts-local-cli':{enabled:true}}}};
 for(const key of Object.keys(base))if(!['tts','plugins'].includes(key))assert.strictEqual(out[key],base[key],'OWN_CONTEXT_OR_POLICY_CHANGED');
 assert.equal(out.tts.provider,base.tts.provider);assert.equal(out.tts.auto,'off');
 return {candidateConfig:out,localProviderId:'tts-local-cli',dependencyRoot:DEPENDENCY_ROOT,dependencyManifestSha256:DEPENDENCY_MANIFEST_SHA256,modelLanguage:'en_US',selected079WrapperUsed:false,defaultProviderChanged:false,sourceOnly:true,runtimeStarted:false,ownMediaOrChannelAcceptance:false};
}
