/** Pure per-invocation voice config plus a private call scope, never preferences or a sender. */
import {AsyncLocalStorage} from 'node:async_hooks';
const calls=new AsyncLocalStorage();
export const VOICES=Object.freeze({
 'de-DE':Object.freeze({female:'de-DE-KatjaNeural',male:'de-DE-ConradNeural'}),
 'en-US':Object.freeze({female:'en-US-JennyNeural',male:'en-US-GuyNeural'}),
 'en-GB':Object.freeze({female:'en-GB-SoniaNeural',male:'en-GB-RyanNeural'}),
 'es-ES':Object.freeze({female:'es-ES-ElviraNeural',male:'es-ES-AlvaroNeural'}),
 'fr-FR':Object.freeze({female:'fr-FR-DeniseNeural',male:'fr-FR-HenriNeural'}),
 'it-IT':Object.freeze({female:'it-IT-ElsaNeural',male:'it-IT-DiegoNeural'}),
 'pt-PT':Object.freeze({female:'pt-PT-RaquelNeural',male:'pt-PT-DuarteNeural'}),
 'zh-CN':Object.freeze({female:'zh-CN-XiaoxiaoNeural',male:'zh-CN-YunxiNeural'})
});
export function resolveExplicitSpeechConfig(cfg,{language,voice='female',text,timeoutMs,agentId,channel,accountId}){
 if(!Object.hasOwn(VOICES,language)||!Object.hasOwn(VOICES[language],voice)||typeof text!=='string'||text.trim().length===0||text.length>2000||Buffer.byteLength(text,'utf8')>12000)throw Error('EXPLICIT_SPEECH_INPUT_REQUIRED');
 if(timeoutMs!==undefined&&(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000))throw Error('EXPLICIT_SPEECH_TIMEOUT_LIMIT');
 if(cfg.tts?.auto!=='off'||cfg.tts?.provider!=='microsoft')throw Error('EXPLICIT_SPEECH_CONFIG_REQUIRED');
 // Per-channel/account/agent overrides must be admitted explicitly in a later composer, never silently outrank the chosen voice.
 const agent=cfg.agents?.entries?.[agentId],channelCfg=cfg.channels?.[channel];
 if(agent?.tts!==undefined||channelCfg?.tts!==undefined||channelCfg?.accounts?.[accountId]?.tts!==undefined)throw Error('EXPLICIT_SPEECH_OVERRIDE_CONFLICT');
 const bounded=timeoutMs??10000;
 return {timeoutMs:bounded,cfg:{...cfg,tts:{auto:'off',provider:'microsoft',mode:'final',maxTextLength:2000,timeoutMs:bounded,modelOverrides:{enabled:false},providers:{microsoft:{enabled:true,voice:VOICES[language][voice],lang:language,outputFormat:'audio-24khz-48kbitrate-mono-mp3',timeoutMs:bounded,saveSubtitles:false}}}}};
}
export function withExplicitSpeechCall({signal,assertCurrent},fn){
 const guard=()=>{signal?.throwIfAborted();if(typeof assertCurrent==='function')assertCurrent();};guard();
 return calls.run(Object.freeze({signal,guard}),async()=>{const result=await fn();guard();return result;});
}
export function currentExplicitSpeechCall(){const scope=calls.getStore();if(!scope)throw Error('EXPLICIT_NATIVE_TTS_CALL_REQUIRED');scope.guard();return scope;}

export function assertExplicitSpeechOwner(cfg,ctx,signal){
 signal?.throwIfAborted();if(typeof ctx?.assertInvocationCurrent==='function')ctx.assertInvocationCurrent();
 const owner=cfg.commands?.ownerAllowFrom,sender=ctx?.senderId,canonical=typeof sender==='string'&&/^\+?[1-9][0-9]{7,14}$/.test(sender)?'+'+sender.replace(/^\+/,''):null,channel=ctx?.agentChannel??ctx?.messageChannel,accountId=ctx?.agentAccountId;
 const account=cfg.channels?.whatsapp?.accounts?.[accountId],exact=x=>Array.isArray(x)&&x.length===1&&x[0]===canonical;
 if(ctx?.senderIsOwner!==true||channel!=='whatsapp'||!canonical||!Array.isArray(owner)||owner.length!==1||owner[0]!=='whatsapp:'+canonical||!exact(cfg.channels?.whatsapp?.allowFrom)||!exact(account?.allowFrom))throw Error('EXPLICIT_SPEECH_OWNER_REQUIRED');
}
