import type {ProductWorld,Person,ActionContext} from './productModel';
import {creatorChatContent} from './creatorChatContent';
import {awardVotes} from './awardPreview';
export const contactOrigins=['Not recorded','Spot community','Personal QR','Chuck introduction','iPhone contacts','Google contacts','Microsoft contacts','Nextcloud contacts','Public feed','Public profile or bio link','Creator content','Award','Wave','Circle or group','Event','Member or Ambassador invitation','Introduced by a person','Known before CRAYS','Other'] as const;
export type ContactOrigin=typeof contactOrigins[number];
export type ContactMemory={origin:ContactOrigin;originPlace:string;firstMetPlace:string;firstMetDate:string;note:string};
export const blankContactMemory:ContactMemory={origin:'Not recorded',originPlace:'',firstMetPlace:'',firstMetDate:'',note:''};
export const contactContextKey=(w:ProductWorld,id:string)=>`contact-context:${w.owner}:${id}`;
function personFor(w:ProductWorld,id:string):Person|undefined{const matches=w.people.filter(p=>p.id===id);return w.identity.signedIn&&id!==w.owner&&matches.length===1?matches[0]:undefined;}
export function validateContactMemory(x:unknown):ContactMemory{
 if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Review your private connection note.');
 const d=x as ContactMemory;const keys=Object.keys(blankContactMemory);if(Object.keys(d).length!==keys.length||keys.some(k=>!Object.hasOwn(d,k)||typeof d[k as keyof ContactMemory]!=='string')||!contactOrigins.includes(d.origin)||d.originPlace.length>160||d.firstMetPlace.length>160||d.note.length>1000)throw Error('Keep place names under 160 characters and your note under 1,000 characters.');
 if(d.firstMetDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(d.firstMetDate)||!Number.isFinite(Date.parse(d.firstMetDate+'T12:00Z'))||new Date(d.firstMetDate+'T12:00Z').toISOString().slice(0,10)!==d.firstMetDate||d.firstMetDate>new Date().toISOString().slice(0,10)))throw Error('Use a real past meeting date, or leave it unknown. A future plan is not a first meeting.');
 return {...d,originPlace:d.originPlace.trim(),firstMetPlace:d.firstMetPlace.trim(),note:d.note.trim()};
}
export function contactMemory(w:ProductWorld,id:string){
 const raw=personFor(w,id)?w.settings[contactContextKey(w,id)]:undefined;
 if(raw===undefined)return {memory:{...blankContactMemory},raw:'',problem:false};
 try{return {memory:validateContactMemory(JSON.parse(String(raw))),raw:String(raw),problem:false};}catch{return {memory:{...blankContactMemory},raw:String(raw),problem:true};}
}
export type ConnectionEvidence={id:string;label:string;detail:string;at?:number};
/** Read legacy import receipts only when they already carry an explicit,
 * reviewed canonical-person mapping. Searches, names and addresses never match
 * people implicitly. This projection creates no imported contact or authority. */
function recordedOriginEvidence(w:ProductWorld,id:string):ConnectionEvidence[]{
 const out:ConnectionEvidence[]=[],unique=(key:string)=>{const rows=w.objects.filter(o=>o.id===key);return rows.length===1&&rows[0].owner===w.owner?rows[0]:undefined;};
 for(const r of w.objects){if(r.owner!==w.owner||unique(r.id)!==r)continue;
  if(r.kind==='contact-import'&&r.status==='completed'&&r.authoritySource==='user-reviewed-contact-import'&&['iPhone contacts','Google contacts','Microsoft contacts','Nextcloud contacts'].includes(String(r.source))&&Array.isArray(r.mappings)&&Number.isSafeInteger(r.completedAt)&&Number(r.completedAt)>0){const mappings=r.mappings as Record<string,unknown>[];const matches=mappings.filter(m=>m&&m.personId===id);if(matches.length===1&&matches[0].confirmed===true&&typeof matches[0].sourceContactId==='string'&&matches[0].sourceContactId&&mappings.filter(m=>m&&m.sourceContactId===matches[0].sourceContactId).length===1)out.push({id:r.id,label:String(r.source),detail:'Reviewed import recorded · a private connection and first meeting remain separate',at:Number(r.completedAt)});}
  if(r.kind==='circle-invitation'&&((r.personId===w.owner&&r.issuedBy===id)||(r.personId===id&&r.issuedBy===w.owner))&&['pending','approved','accepted','declined','revoked'].includes(String(r.status))&&Number.isSafeInteger(r.version)&&Number(r.version)>0&&Number.isSafeInteger(r.groupVersion)&&Number(r.groupVersion)>0&&Number.isSafeInteger(r.createdAt)&&Number(r.createdAt)>0){const group=typeof r.groupId==='string'?unique(r.groupId):undefined;if(group?.kind==='group')out.push({id:r.id,label:'Member invitation',detail:`Circle invitation ${String(r.status)} · no physical meeting or VIF connection inferred`,at:Number(r.createdAt)});}
  if(r.kind==='referral-guest-application-preview'&&r.exampleOnly===true&&r.referrerId===id&&r.status==='submitted'&&typeof r.programmeId==='string'&&typeof r.caseId==='string'){const programme=unique(r.programmeId),applicationCase=unique(r.caseId);if(programme?.kind==='partner-programme-preview'&&programme.subjectId===id&&applicationCase?.kind==='partner-case-preview'&&applicationCase.guestApplicationId===r.id&&applicationCase.programmeId===r.programmeId&&applicationCase.reviewerId===id)out.push({id:r.id,label:'Member or Ambassador invitation',detail:'Submitted application through this exact fictional invitation · membership, private contact and first meeting are separate',at:Number.isSafeInteger(r.submittedAt)?Number(r.submittedAt):undefined});}
 }
 return out;
}
// Private projection of the owner's exact records. Current affiliation, presence,
// following, avatar, private chat contents and matching reasons are never sources.
export function connectionEvidence(w:ProductWorld,id:string):ConnectionEvidence[]{
 const person=personFor(w,id);if(!person)return [];
 const out:ConnectionEvidence[]=recordedOriginEvidence(w,id);const unique=(o:{id:string})=>w.objects.filter(x=>x.id===o.id).length===1;
 const spot=(id:unknown)=>{const matches=w.venues.filter(v=>v.id===id);return matches.length===1?matches[0].name:'Original Spot unavailable';};
 for(const o of w.objects.filter(o=>o.owner===w.owner&&o.personId===id&&unique(o))){
  if(o.kind==='contact-introduction'){
   const labels:Record<string,string>={'targeted-public-introduction':'Chuck introduction','shared-space':'Spot community','public-feed':'Public feed','personal-qr':'Personal QR'};
   const label=labels[String(o.sourceMethod)]||'Contact request';
   // Only the exact initiating context, never an arbitrary sharedSpaceIds entry.
   out.push({id:o.id,label,detail:[typeof o.originVenueId==='string'?spot(o.originVenueId):'',o.status==='accepted'?'Connection accepted':`Request ${String(o.status)}`].filter(Boolean).join(' · ')});
  }
  if(o.kind==='connection-scan')out.push({id:o.id,label:'Personal QR',detail:`${spot(o.venueId)} · ${o.status==='connected'?'Connection accepted':'Code reviewed; a scan alone is not a connection'}`});
  if(o.kind==='wave-preview-invitation'&&o.selfConsent===true&&o.otherConsent===true)out.push({id:o.id,label:'Wave',detail:'Mutual Wave accepted · no physical meeting or Spot inferred',at:Number(o.createdAt)||undefined});
 }
 for(const e of creatorChatContent(w,id))for(const p of e.payments)out.push({id:p.id,label:'Creator content',detail:`${p.status==='confirmed'?'Purchase confirmed':`Payment ${p.status}`} · private connection is separate`});
 for(const v of awardVotes(w).filter(v=>v.creatorId===id))out.push({id:v.id,label:'Award',detail:`${v.season} · ${v.status==='confirmed-demo'?'Payment confirmed':'Payment '+v.status} · ${v.proof==='verified-preview'?'voting proof checked':'voting proof separate'}`,at:v.createdAt});
 // Evidence dates are not reliable across legacy records; do not invent a first.
 return out;
}
export function connectionSummary(w:ProductWorld,id:string){
 const m=contactMemory(w,id).memory,events=connectionEvidence(w,id);
 if(m.firstMetPlace)return `First met · ${m.firstMetPlace}`;
 if(m.origin!=='Not recorded')return m.originPlace?`${m.origin} · ${m.originPlace}`:m.origin;
 const labels=[...new Set(events.map(e=>e.label))];return labels.length===1?labels[0]:labels.length?'Your recorded connections':'How you connected';
}
export function applyContactContext(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('contacts.context.'))return null;
 const id=ctx.personId||'';if(!personFor(w,id))throw Error('Open this unique person in your own signed-in account.');
 const current=contactMemory(w,id);if(data.expected!==current.raw)throw Error('This private note changed. Reopen its latest version before saving.');
 if(data.approved!=='Yes')throw Error('Review this private note. It does not record the other person’s confirmation.');
 const key=contactContextKey(w,id);
 if(op==='contacts.context.forget'){delete w.settings[key];return {objectId:id,message:'Your private connection note was removed. Original requests, purchases and permissions stay unchanged.'};}
 if(op!=='contacts.context.save')throw Error('Use the private connection note workflow.');
 let m:ContactMemory;try{m=validateContactMemory(JSON.parse(data.memory));}catch(e){throw Error(e instanceof Error?e.message:'Review your private note.');}
 w.settings[key]=JSON.stringify(m);return {objectId:id,message:'Saved only for you. No meeting, public profile, contact permission or Chuck memory was created.'};
}
