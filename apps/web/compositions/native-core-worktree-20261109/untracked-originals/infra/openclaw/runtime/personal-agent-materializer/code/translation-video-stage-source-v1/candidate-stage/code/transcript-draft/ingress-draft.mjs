/** Pure ingress decision and deterministic draft handling. No model, command, tool or session API. */
export const DRAFT_HEADER='[Transkriptentwurf]';
export const DRAFT_FOOTER='Zum Verwenden als Auftrag: Kopiere nur den Transkripttext, ändere ihn bei Bedarf und sende ihn als neue Nachricht.';
export function readRecognizableTranscript(body){
 if(typeof body!=='string')return;
 const text=body.trim();
 const native=/^\[Audio transcript \(machine-generated, untrusted\)\]:\s*([\s\S]*)$/i.exec(text);
 if(native){try{const value=JSON.parse(native[1]);return typeof value==='string'?value:native[1];}catch{return native[1];}}
 const marked=/^(?:\[(?:Transcript|Transkript|Transkriptentwurf)\]\s*:?|(?:Transcript|Transkript):)\s*([\s\S]*)$/i.exec(text);
 if(!marked)return;
 let value=marked[1];if(text.startsWith(DRAFT_HEADER)&&value.endsWith(DRAFT_FOOTER))value=value.slice(0,-DRAFT_FOOTER.length).trimEnd();return value;
}
export function classifyWhatsAppTranscriptDraft({msg,admission,route,preflightAudioTranscript}){
 // Existing normalized admission remains the authority; never parse sender IDs or grant a route here.
 if(admission?.ingress?.admission!=='dispatch'||admission.ingress.decision!=='allow'||admission.conversation?.kind!=='direct'||msg?.platform?.fromMe===true||!route?.agentId||!route?.sessionKey||(route.accountId??admission.accountId)!==admission.accountId)return;
 const media=msg?.payload?.media,audio=media?.kind==='audio'||typeof media?.type==='string'&&media.type.startsWith('audio/');
 if(media&&!audio)return; // Photo/OCR/video/document captions preserve their existing path.
 if(audio)return {kind:'audio',transcript:typeof preflightAudioTranscript==='string'?preflightAudioTranscript:undefined,preflightAttempted:preflightAudioTranscript!==undefined};
 if(preflightAudioTranscript!==undefined)return{kind:'preflight',transcript:typeof preflightAudioTranscript==='string'?preflightAudioTranscript:undefined,preflightAttempted:true};
 const transcript=readRecognizableTranscript(msg?.payload?.body);if(transcript!==undefined)return{kind:'marked-text',transcript,preflightAttempted:false};
}
export async function handleWhatsAppTranscriptDraft({msg,admission,route,preflightAudioTranscript,transcribe,deliverText}){
 const selected=classifyWhatsAppTranscriptDraft({msg,admission,route,preflightAudioTranscript});if(!selected)return{handled:false};
 let transcript=selected.transcript;
 if(selected.kind==='audio'&&!selected.preflightAttempted&&msg.payload.media?.path){try{const value=await transcribe();transcript=typeof value==='string'?value:undefined;}catch{transcript=undefined;}}
 const text=typeof transcript==='string'&&transcript.trim()?DRAFT_HEADER+'\n\n'+transcript+'\n\n'+DRAFT_FOOTER:'Ich konnte keinen lesbaren Transkripttext erzeugen. Es wurde kein Auftrag ausgeführt. Bitte sende deinen Text als neue Nachricht.';
 const delivery=await deliverText(text);return{handled:true,providerAccepted:delivery?.providerAccepted===true};
}
