import type {ProductWorld} from './productModel';
import type {PersonalNote} from './personalNotes';
import type {ConversationDraft} from './conversationNotes';
import {voiceFor} from './privateVoice';
import {voiceNoteSource,voiceBoundNoteText} from './privateSourceBinding';
/** Separate review, never an implicit side-effect of Save or Send. */
export function voiceConversationBridge(w:ProductWorld,voiceId:string,date:string,segmentIds?:string[]){
 const sourceRef=voiceNoteSource(w,voiceId,segmentIds),r=voiceFor(w,voiceId)!;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Choose the date for this private note.');
 const segments=sourceRef.segmentIds.map(id=>{const s=r.draft.segments.find(s=>s.id===id)!;if(s.text.length>2000)throw Error('A selected passage exceeds the conversation limit. Split it at the original, review and send again; no words were shortened.');return {id:s.id,seconds:Math.floor(s.startMs/1000),speaker:s.speaker||'Speaker unassigned',text:s.text,uncertain:s.uncertain,type:'note' as const};});
 if(voiceBoundNoteText(w,sourceRef).length>20000)throw Error('The exact selected passages exceed the note limit. Choose fewer explicit passages; nothing was truncated.');
 const draft:ConversationDraft={title:r.draft.name,date,template:'Personal reflection',source:r.draft.transcriptOrigin==='explicit-fictional-scenario'?'Fictional example':'Imported transcript',personId:'',venueId:'',segments};
 const targets=w.objects.filter((o):o is PersonalNote=>o.owner===w.owner&&o.kind==='personal-note'&&o.status==='saved').filter(o=>o.sourceRef?.kind==='private-voice-transcript'&&o.sourceRef.voiceId===voiceId&&JSON.stringify(o.sourceRef.segmentIds)===JSON.stringify(sourceRef.segmentIds));
 if(targets.length>1)throw Error('Resolve ambiguous original conversation notes before refreshing.');
 return {draft,sourceRef,noteId:targets[0]?.id||'',expectedVersion:String(targets[0]?.version||0)};
}
