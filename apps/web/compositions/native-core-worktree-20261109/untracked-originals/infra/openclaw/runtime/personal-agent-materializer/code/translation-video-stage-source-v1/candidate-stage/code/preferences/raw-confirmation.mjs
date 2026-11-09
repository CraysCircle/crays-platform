import{recognizeNaturalCorrection}from'../self-improving/plugin/natural-correction.mjs';
/** SOURCE ONLY. Host-only capture from admitted WhatsApp monitor, before transcription/enrichment.
 * No prompt/history/recorder text fallback. Private symbols survive host shallow copies;
 * private WeakSet verifies origin and WeakMap binds the same actual recorder. */
const captureBrand=new WeakSet(),commandBrand=new WeakSet(),learningBrand=new WeakSet(),CTX=Symbol('crays.private.current-raw-text'),recorderInputs=new WeakMap(),EXTERNAL_USER=Object.freeze({kind:'external_user'});
const explicit=x=>typeof x==='string'&&x.length<=8192&&(/^(?:Merk dir:|Korrigiere das zuletzt Gemerkte:)[ ]?[^\s][\s\S]*$/.test(x)||x==='Vergiss das zuletzt Gemerkte.'||x==='Widerrufe das zuletzt Gemerkte.');
const learning=x=>recognizeNaturalCorrection(x)!==null;
const short=x=>typeof x==='string'&&x.length<=64&&/^(?:Merken|Kochen) [A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(x);
const id=x=>typeof x==='string'&&x.length>0&&x.length<=512;
export function captureOriginalWhatsAppText({msg,admission,agentId,sessionKey,preflightAudioTranscript,quoted}){
 if(admission?.ingress?.admission!=='dispatch'||admission.conversation?.kind!=='direct'||msg?.platform?.fromMe===true||msg?.event?.isBatched===true||msg?.payload?.media||preflightAudioTranscript!==undefined||quoted||msg?.payload?.channelStructuredContext||!id(msg?.event?.id)||typeof msg?.payload?.body!=='string'||msg.payload.body.length===0||msg.payload.commandBody!==undefined&&msg.payload.commandBody!==msg.payload.body||!id(agentId)||!id(sessionKey))return;
 const command=short(msg.payload.body)||explicit(msg.payload.body),capture=Object.freeze({rawText:msg.payload.body,...(command?{currentUserMessage:msg.payload.body}:{}),currentUserMessageId:msg.event.id,agentId,sessionKey});captureBrand.add(capture);if(command)commandBrand.add(capture);if(learning(msg.payload.body))learningBrand.add(capture);return capture;
}
export function carryOriginalWhatsAppText(ctx,capture,{inboundId,agentId,sessionKey}){
 if(!captureBrand.has(capture)||capture.currentUserMessageId!==inboundId||capture.agentId!==agentId||capture.sessionKey!==sessionKey||ctx?.rawText!==capture.rawText||ctx?.Transcript!==undefined||ctx?.media?.length)return;
 Object.defineProperty(ctx,CTX,{value:capture,enumerable:true,writable:false,configurable:false});
}
export function bindOriginalTextToRecorder(ctx,recorder,sourceMessageId){
 const capture=ctx?.[CTX];if(!captureBrand.has(capture)||!recorder||typeof recorder!=='object'||capture.currentUserMessageId!==sourceMessageId||ctx.rawText!==capture.rawText||ctx.Transcript!==undefined||ctx.media?.length)return;
 const prior=recorderInputs.get(recorder);if(prior&&prior!==capture){recorderInputs.delete(recorder);return;}recorderInputs.set(recorder,capture);
}
function currentCaptureForHook({recorder,agentId,sessionKey,trigger,inputProvenance,skipPreparedUserTurnMessage,internalEvents}){
 if(trigger!=='user'||inputProvenance!==undefined&&inputProvenance?.kind!=='external_user'||skipPreparedUserTurnMessage||internalEvents?.length)return;
 const capture=recorderInputs.get(recorder);if(!captureBrand.has(capture)||capture.agentId!==agentId||capture.sessionKey!==sessionKey)return;return capture;
}
/** Normalize ONLY the original host-branded current direct user turn for ephemeral authorized hook context.
 * Never writes ctx/attempt InputProvenance, preserving original routing/Cron provenance semantics. */
export function projectOriginalUserProvenanceForHook(input){return currentCaptureForHook(input)?EXTERNAL_USER:undefined;}
export function projectOriginalTextForHook(input){
 const capture=currentCaptureForHook(input);return{...(commandBrand.has(capture)?{currentUserMessage:capture.currentUserMessage,currentUserMessageId:capture.currentUserMessageId}:{}),...(learningBrand.has(capture)?{currentOperationalLearning:{text:capture.rawText,messageId:capture.currentUserMessageId}}:{})};
}
