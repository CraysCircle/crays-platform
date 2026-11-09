import type {ProductWorld} from './productModel.ts';
import {visitJourneyFor,visitJourneyContext} from './visitJourney.ts';
export const visitChuckFields=[{id:'intent',label:'Purpose of this visit'},{id:'prepareNotes',label:'Preparation notes'},{id:'duringNotes',label:'Notes from the visit'},{id:'followupNotes',label:'Follow-up notes'}] as const;
export type VisitChuckField=typeof visitChuckFields[number]['id'];
export function visitChuckReview(w:ProductWorld,id:string,fields:VisitChuckField[],question:string){
 const j=visitJourneyFor(w,id),context=j&&visitJourneyContext(w,id);
 if(!w.identity.signedIn||!j||!context?.current)throw Error('Review your own current visit and its original Spot first.');
 if(!Array.isArray(fields)||!fields.length||new Set(fields).size!==fields.length||fields.some(f=>!visitChuckFields.some(a=>a.id===f)))throw Error('Choose only the private passages you want Chuck to review.');
 if(typeof question!=='string'||!question.trim()||question.length>2000)throw Error('Write the question you want to discuss with Chuck.');
 const passages=fields.map(f=>{const value=j[f];if(typeof value!=='string'||value.length>4000||!value.trim())throw Error('Choose a non-empty passage from this saved original.');return {field:f,label:visitChuckFields.find(a=>a.id===f)!.label,text:value};});
 return JSON.stringify({source:'private-visit-chuck-review-v1',owner:w.owner,visitId:j.id,version:j.version,sourceSnapshot:j.sourceSnapshot,name:j.name,venueId:j.venueId,date:j.date,time:j.time,timezone:j.timezone,question:question.trim(),passages});
}
export function visitChuckDraft(w:ProductWorld,id:string,fields:VisitChuckField[],question:string,review:string){
 if(visitChuckReview(w,id,fields,question)!==review)throw Error('The visit, selected passages or question changed. Review the current original before continuing.');
 const exact=JSON.parse(review);return [`My question: ${exact.question}`,`My private visit: ${exact.name} · ${exact.date} ${exact.time} ${exact.timezone}`,`Spot: ${w.venues.find(v=>v.id===exact.venueId)!.name}`,...exact.passages.map((p:{label:string;text:string})=>`${p.label}:\n${p.text}`),'Only the selected passages are included. This draft does not authorise messages, bookings, check-in or payment.'].join('\n\n');
}
