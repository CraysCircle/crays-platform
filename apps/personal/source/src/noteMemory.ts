import type {ActionContext,ProductWorld,Entity} from './productModel.ts';
import {localPreviewId} from './localPreviewId.ts';
import {noteSource,noteSourceCurrent,type NoteSource} from './personalNotes.ts';
const need=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
export const noteMemoryReview=(source:Readonly<NoteSource>,fact:string,purpose:string)=>JSON.stringify({owner:source.owner,noteId:source.noteId,noteVersion:source.parentVersion,sourceFingerprint:source.fingerprint,fact,purpose});
export function applyNoteMemory(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('complete.note-memory.'))return;
 need(op==='complete.note-memory.save','Choose the reviewed note memory action.');
 need(w.identity.signedIn,'Sign in to your own notes and memory.');
 need(!w.objects.some(o=>o.id===d.noteId&&o.owner===w.owner&&o.kind==='personal-note'&&o.sourceRef),'This source-bound note needs a separately permission-bound memory adapter. Use its reviewed conversation and follow-up instead.');
 const source=noteSource(w,d.noteId),current=noteSourceCurrent(w,source);need(current.ready,current.message);
 need(!ctx.objectId||ctx.objectId===source.noteId,'Keep this same original note.');
 need(d.sourceFingerprint===source.fingerprint,'This note changed. Review the current note before remembering anything.');
 need(typeof d.fact==='string'&&d.fact.trim()&&d.fact.length<=4000,'Choose the exact fact or preference to remember.');
 need(typeof d.purpose==='string'&&d.purpose.trim()&&d.purpose.length<=1000,'Choose the purpose for this memory.');
 need(d.approved==='Yes'&&d.reviewSnapshot===noteMemoryReview(source,d.fact,d.purpose),'Review the exact fact, purpose and original note before confirming this separate memory.');
 const fingerprint=JSON.stringify({owner:w.owner,noteId:source.noteId,sourceVersion:source.parentVersion,fact:d.fact.trim(),purpose:d.purpose.trim()});
 const matches=w.objects.filter(o=>o.owner===w.owner&&o.kind==='memory'&&o.noteMemoryFingerprint===fingerprint&&o.name===d.fact.trim()&&o.purpose===d.purpose.trim());need(matches.length<=1,'Review the exact existing memory record.');
 if(matches.length){need(w.objects.filter(o=>o.id===matches[0].id).length===1,'This memory identity is ambiguous. Review its original source.');return {objectId:matches[0].id,message:'This exact confirmed memory already exists. No duplicate was added.'};}
 const memory:Entity={id:localPreviewId(),owner:w.owner,kind:'memory',name:d.fact.trim(),purpose:d.purpose.trim(),source:'Explicitly selected from your own private note',sourceNoteId:source.noteId,sourceNoteVersion:source.parentVersion,noteMemoryFingerprint:fingerprint,status:'confirmed',confirmedAt:Date.now(),version:1,realExecution:false};w.objects.unshift(memory);
 return {objectId:memory.id,message:'This exact fact and purpose are saved separately in Chuck’s memory in the clickdummy. The rest of your note was not imported. No real agent or external service received it.'};
}
