import type {ProductWorld,Entity} from './productModel';
import {voiceFor,voiceSourcesCurrent,voiceSendFingerprint,type VoiceAudioRef} from './privateVoice';
import {agentRequestFingerprint} from './taskOriginals';
import {sha256Hex} from './privateEpubGenerator';
/** Immutable, purpose-limited provenance. No source text or private bytes are copied into this grant. */
export type PrivateSourceRef=
 |{kind:'private-voice-transcript';owner:string;voiceId:string;taskId:string;sentId:string;sentVersion:number;fingerprint:string;audio:VoiceAudioRef;taskFingerprint:string;segmentIds:string[];purpose:'private-conversation-note'}
 |{kind:'selected-note-review';owner:string;notes:{id:string;version:number;fingerprint:string}[];purpose:'private-note-review'}
 |{kind:'conversation-followup';owner:string;noteId:string;noteVersion:number;conversationId:string;segmentId:string;segmentFingerprint:string;purpose:'private-followup'};
const stopped=['paused','stopped','cancelled','failed','deleted','revoked','blocked'];
const unique=(w:ProductWorld,id:string)=>{const all=w.objects.filter(o=>o.id===id);return w.identity.signedIn&&all.length===1&&all[0].owner===w.owner?all[0]:undefined;};
export const privateNoteFingerprint=(n:Entity)=>sha256Hex(JSON.stringify({owner:n.owner,id:n.id,version:n.version,title:n.title,text:n.text,tags:n.tags,sourceRef:n.sourceRef}));
export function voiceNoteSource(w:ProductWorld,id:string,segmentIds?:string[]):Extract<PrivateSourceRef,{kind:'private-voice-transcript'}>{
 const r=voiceFor(w,id);if(!r||r.status!=='saved'||r.capabilityId!=='B2C-CAP-071'||!r.sent||r.sent.fingerprint!==voiceSendFingerprint(r.draft)||!r.draft.audioSource)throw Error('Explicitly send these exact current words before reviewing a separate private note.');
 voiceSourcesCurrent(w,r.draft);const task=unique(w,r.sourceTaskId);if(!task||task.kind!=='agent-task'||task.resultId!==id||task.id!==r.sent.taskId||stopped.includes(String(task.status)))throw Error('Resume the same exact voice task.');
 const chosen=segmentIds||r.draft.segments.map(s=>s.id);if(!chosen.length||chosen.length>60||new Set(chosen).size!==chosen.length||chosen.some(id=>!r.draft.segments.some(s=>s.id===id)))throw Error('Explicitly choose up to sixty existing passages. No passage is silently omitted.');
 return {kind:'private-voice-transcript',owner:w.owner,voiceId:id,taskId:task.id,sentId:r.sent.id,sentVersion:r.sent.version,fingerprint:r.sent.fingerprint,audio:r.draft.audioSource,taskFingerprint:agentRequestFingerprint(task),segmentIds:[...chosen],purpose:'private-conversation-note'};
}
export function privateSourceCurrent(w:ProductWorld,ref:unknown,seen=new Set<string>()):boolean{
 try{
  if(!ref||typeof ref!=='object'||seen.size>12)return false;const r=ref as PrivateSourceRef;if(!w.identity.signedIn||r.owner!==w.owner)return false;
  if(r.kind==='private-voice-transcript')return JSON.stringify(r)===JSON.stringify(voiceNoteSource(w,r.voiceId,r.segmentIds));
  const validNote=(id:string,version:number,fingerprint?:string)=>{if(seen.has(id))return false;const n=unique(w,id),t=n&&unique(w,String(n.sourceTaskId));if(!n||n.kind!=='personal-note'||n.status!=='saved'||n.version!==version||!t||t.kind!=='agent-task'||t.resultId!==id||stopped.includes(String(t.status))||fingerprint&&privateNoteFingerprint(n)!==fingerprint)return false;return !n.sourceRef||privateSourceCurrent(w,n.sourceRef,new Set([...seen,id]));};
  if(r.kind==='selected-note-review')return r.purpose==='private-note-review'&&Array.isArray(r.notes)&&r.notes.length>=2&&r.notes.length<=30&&new Set(r.notes.map(n=>n.id)).size===r.notes.length&&r.notes.every(n=>validNote(n.id,n.version,n.fingerprint));
  if(r.kind==='conversation-followup'){if(r.purpose!=='private-followup'||!validNote(r.noteId,r.noteVersion))return false;const c=unique(w,r.conversationId),d=c?.draft as {segments?:{id:string}[]}|undefined,s=d?.segments?.find(s=>s.id===r.segmentId);return !!c&&c.kind==='conversation-note-preview'&&c.noteId===r.noteId&&c.noteVersion===r.noteVersion&&!!s&&sha256Hex(JSON.stringify(s))===r.segmentFingerprint;}
  return false;
 }catch{return false;}
}
export function entitySourceCurrent(w:ProductWorld,entity:Entity){return !entity.sourceRef||privateSourceCurrent(w,entity.sourceRef);}
export function privateTaskSourceCurrent(w:ProductWorld,task:Entity){const id=String(task.resultId||''),rows=w.objects.filter(o=>o.id===id),result=unique(w,id);if(rows.some(o=>!!o.sourceRef)&&!result)return false;if(result?.kind==='private-voice-workspace'){try{const voice=voiceFor(w,result.id);if(!voice||voice.status!=='saved'||stopped.includes(String(task.status)))return false;voiceSourcesCurrent(w,result.draft as Parameters<typeof voiceSourcesCurrent>[1]);}catch{return false;}}return !result||entitySourceCurrent(w,result);}
export function voiceSourceMatchesDraft(w:ProductWorld,ref:PrivateSourceRef,d:{source:string;segments:{id:string;seconds:number;speaker:string;text:string;uncertain?:boolean}[]}){
 if(ref.kind!=='private-voice-transcript'||!privateSourceCurrent(w,ref))return false;const voice=voiceFor(w,ref.voiceId)!;
 return d.source===(voice.draft.transcriptOrigin==='explicit-fictional-scenario'?'Fictional example':'Imported transcript')&&d.segments.length===ref.segmentIds.length&&d.segments.every((s,i)=>{const v=voice.draft.segments.find(v=>v.id===ref.segmentIds[i]);return !!v&&s.id===v.id&&s.seconds===Math.floor(v.startMs/1000)&&s.speaker===(v.speaker||'Speaker unassigned')&&s.text===v.text&&s.uncertain===v.uncertain;});
}

export function voiceBoundNoteText(w:ProductWorld,ref:PrivateSourceRef){if(ref.kind!=='private-voice-transcript'||!privateSourceCurrent(w,ref))throw Error('The exact sent transcript source is unavailable.');const v=voiceFor(w,ref.voiceId)!;return ref.segmentIds.map(id=>{const s=v.draft.segments.find(s=>s.id===id)!;return `[${Math.floor(s.startMs/60000)}:${String(Math.floor(s.startMs/1000)%60).padStart(2,'0')}] ${s.speaker||'Speaker unassigned'}: ${s.text}${s.uncertain?' [uncertain]':''}`;}).join('\n');}
