/** Exact accepted-core delta only. Returns source; never writes, loads, starts or grants. */
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
export const ORIGINAL_TOOL_SHA256='db2e21377c75611379e596e0b89db582c5323f1a3a1189f99e22a57e517de934';
export const ORIGINAL_SCOPE_SHA256='74ce3ed6a4d9ba08e78a29c3d2b7ccbfac4266642b7f2e1c4ea9e85bd2cf078e';
function once(source,old,next){assert.equal(source.split(old).length,2,'EXACT_SINGLE_ACCEPTED_SEAM_REQUIRED');return source.replace(old,next);}
export function buildLocalAwareNativeTtsOverlay({toolSource,scopeSource}){
 assert.equal(sha(toolSource),ORIGINAL_TOOL_SHA256,'ACCEPTED_NATIVE_TOOL_SOURCE_DRIFT');assert.equal(sha(scopeSource),ORIGINAL_SCOPE_SHA256,'ACCEPTED_SCOPE_SOURCE_DRIFT');
 const start=toolSource.indexOf('//#region src/agents/tools/tts-tool.ts'),end=toolSource.indexOf('//#endregion',start);assert(start>=0&&end>start);const original=toolSource.slice(start,end);let block=original;
 block=once(block,'\tchannel: Type.Optional(Type.String({ description: "Channel id; output-format hint." })),','\tvoiceMode: Type.Optional(Type.Union([Type.Literal("standard"),Type.Literal("local")], {description:"Use the standard voice unless local audio was explicitly requested. Local currently supports en-US female only."})),\n\tchannel: Type.Optional(Type.String({ description: "Channel id; output-format hint." })),');
 block=once(block,'minimum: 1, maximum: 10000','minimum: 1, maximum: 45000');
 block=once(block,'description: "Provider timeout ms."','description: "Speech deadline ms; standard up to10000, optional local up to45000."');
 block=once(block,'execute: async (_toolCallId, args, signal) => {\n\t\t\tconst params = args;','execute: async (_toolCallId, args, signal) => {\n\t\t\ttry {\n\t\t\tconst params = args;\n\t\t\tif(params?.voiceMode!==undefined&&!['+"'standard','local'"+'].includes(params.voiceMode))throw new Error("UNSUPPORTED_SPEECH_MODE");');
 block=once(block,'const {cfg,timeoutMs:boundedTimeoutMs} = resolveExplicitSpeechConfig(baseCfg,{language:params.language,voice:params.voice,text,timeoutMs,agentId:opts?.agentId,channel:channel??opts?.agentChannel,accountId:opts?.agentAccountId});','const {cfg,timeoutMs:boundedTimeoutMs,providerId} = resolveExplicitSpeechConfig(baseCfg,{provider:params.voiceMode=== "local"?"tts-local-cli":"microsoft",language:params.language,voice:params.voice,text,timeoutMs,agentId:opts?.agentId,channel:channel??opts?.agentChannel,accountId:opts?.agentAccountId},opts?.craysPersonalHostContext);');
 block=once(block,'overrides:{provider:"microsoft"},disableFallback:true,','overrides:{provider:providerId},disableFallback:true,');
 block=once(block,'\t\t\t\t\tprovider: result.provider,\n','');
 block=once(block,'throw new Error(result.error ?? "TTS conversion failed");','throw new Error(result.error ?? "TTS conversion failed");\n\t\t\t}catch{throw new Error(signal?.aborted?"The audio request was cancelled.":"Audio could not be created. Please try again.");}');
 const nativeToolSource=toolSource.slice(0,start)+block+toolSource.slice(end);
 let nativeScopeSource=once(scopeSource,'export function resolveExplicitSpeechConfig(cfg,','export function resolveMicrosoftSpeechConfig(cfg,');
 nativeScopeSource+='\n// Fixed optional-provider resolution only; existing call scope remains this module.\nimport {resolveOptionalExplicitSpeechConfig} from "../local-speech/resolve-optional-explicit-speech-config.mjs";\nexport function resolveExplicitSpeechConfig(cfg,request,hostContext){return resolveOptionalExplicitSpeechConfig(cfg,request,hostContext); }\n';
 return{nativeToolSource,nativeScopeSource,originalToolSha256:ORIGINAL_TOOL_SHA256,originalScopeSha256:ORIGINAL_SCOPE_SHA256,changedNativeRegion:'src/agents/tools/tts-tool.ts',existingCoreMediaProvenancePreserved:true,existingOwnerAndInvocationGuardsPreserved:true,existingScopeModuleIdentityPreserved:true,allOtherNativeRegionsByteExact:true,requiresTrustedHostContextForLocal:true,sourceOnly:true,runtimeChanged:false};
}
