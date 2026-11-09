import type {ProductWorld} from './productModel';
import {ownPrivateAccount} from './ownPrivateAccount';
import {sha256Hex} from './privateEpubGenerator';
/** Pinned api-client/models/order.ts labels, not connected financial services. */
export const communityOfflineMethods=['cash','card','transfer','cheque','crypto','pix','alipay','revolut','wechat','wise','zelle','other'] as const;
export type CommunityOfflineMethod=typeof communityOfflineMethods[number];
export type CommunityProofFile={id:string;owner:string;name:string;mime:'application/pdf'|'image/jpeg'|'image/png'|'image/webp';size:number;dataUrl:string};
export type CommunityProofSubmission={revision:number;amountMinor:number;currency:'USD';method:CommunityOfflineMethod;paymentDate:string;notes:string;file:CommunityProofFile;submittedAt:number};
export type CommunityPaymentProof={paymentId:string;status:'pending'|'submitted'|'confirmed';revision:number;submission?:CommunityProofSubmission;rejections:{submission:CommunityProofSubmission;reason:string;reviewedAt:number}[];review?:{source:'fictional-external-community-review';outcome:'confirmed'|'rejected';note:string;at:number;submittedRevision:number}};
const need:(v:unknown,m:string)=>asserts v=(v,m)=>{if(!v)throw Error(m);};
const allowedMime=['application/pdf','image/jpeg','image/png','image/webp'];
function validFile(f:CommunityProofFile,owner:string){
 if(!f||f.owner!==owner||typeof f.id!=='string'||!f.id||typeof f.name!=='string'||!f.name.trim()||f.name.length>250||!allowedMime.includes(f.mime)||!Number.isSafeInteger(f.size)||f.size<=0||f.size>2*1024*1024||typeof f.dataUrl!=='string'||f.dataUrl.length>3*1024*1024||!f.dataUrl.startsWith(`data:${f.mime};base64,`))return false;
 const b64=f.dataUrl.slice(f.dataUrl.indexOf(',')+1);try{const bytes=atob(b64);return b64.length%4===0&&/^[A-Za-z0-9+/]*={0,2}$/.test(b64)&&bytes.length===f.size&&btoa(bytes)===b64;}catch{return false;}
}
/** Strict own local source; no arbitrary URL or filename-only attachment. */
export function communityProofFile(w:ProductWorld,id:string):CommunityProofFile|undefined{
 if(!ownPrivateAccount(w))return;const rows=w.objects.filter(o=>o.id===id),f=rows[0];if(rows.length!==1||!f||f.owner!==w.owner||f.kind!=='media-asset'||f.rights!=='Confirmed by owner')return;
 const file={id:f.id,owner:w.owner,name:f.name,mime:f.mime,size:Number(f.size),dataUrl:f.dataUrl} as CommunityProofFile;return validFile(file,w.owner)?file:undefined;
}
export function communityProofDate(date:string,now=Date.now()){
 if(!Number.isFinite(now)||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;const n=Date.parse(date+'T00:00:00.000Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===date&&date<=new Date(now).toISOString().slice(0,10);
}
export function validCommunityPaymentProof(p:CommunityPaymentProof,owner:string,paymentId:string,amountMinor:number){
 try{
  need(typeof owner==='string'&&!!owner.trim()&&owner===owner.trim()&&p&&p.paymentId===paymentId&&!!paymentId&&['pending','submitted','confirmed'].includes(p.status)&&Number.isSafeInteger(p.revision)&&p.revision>0&&Number.isSafeInteger(amountMinor)&&amountMinor>0&&Array.isArray(p.rejections),'Keep the original payment and proof revision.');
  const validSubmission=(s:CommunityProofSubmission)=>need(s&&Number.isSafeInteger(s.revision)&&s.revision>0&&s.revision<=p.revision&&s.amountMinor===amountMinor&&s.currency==='USD'&&communityOfflineMethods.includes(s.method)&&Number.isFinite(s.submittedAt)&&communityProofDate(s.paymentDate,s.submittedAt)&&typeof s.notes==='string'&&s.notes.length<=500&&validFile(s.file,owner),'Review the original amount, date and private file.');
  let previousReviewedAt=-Infinity;for(const [index,previous] of p.rejections.entries()){validSubmission(previous.submission);need(previous.submission.revision===2*(index+1)&&previous.submission.submittedAt>=previousReviewedAt&&typeof previous.reason==='string'&&!!previous.reason.trim()&&previous.reason.length<=500&&Number.isFinite(previous.reviewedAt)&&previous.reviewedAt>=previous.submission.submittedAt,'Keep the original ordered submission and rejection history.');previousReviewedAt=previous.reviewedAt;}
  const expectedRevision=2*p.rejections.length+(p.status==='pending'?1:2);need(p.revision===expectedRevision,'Keep the exact original proof revision sequence.');
  if(p.submission){validSubmission(p.submission);need(p.submission.submittedAt>=previousReviewedAt&&p.submission.revision===p.revision,'Keep one current submitted snapshot.');}
  if(p.status!=='pending')need(p.submission,'This status needs its original submitted proof.');else need(!p.submission,'Pending corrections retain earlier details in rejection history.');
  if(p.review)need(p.review.source==='fictional-external-community-review'&&['confirmed','rejected'].includes(p.review.outcome)&&typeof p.review.note==='string'&&!!p.review.note.trim()&&p.review.note.length<=500&&Number.isFinite(p.review.at)&&Number.isSafeInteger(p.review.submittedRevision),'Keep the separate external example review.');
  if(p.status==='confirmed')need(p.review?.outcome==='confirmed'&&p.review.submittedRevision===p.submission!.revision&&p.review.at>=p.submission!.submittedAt,'Confirmation needs the exact reviewed submission.');
  if(p.status==='submitted')need(!p.review,'Current submitted proof is not yet reviewed.');
  if(p.status==='pending'){const last=p.rejections.at(-1);if(last)need(p.review?.outcome==='rejected'&&p.review.submittedRevision===last.submission.revision&&p.review.note===last.reason&&p.review.at===last.reviewedAt,'Keep the exact last rejection and its matching review.');else need(!p.review,'An initial pending proof has no invented review.');}return true;
 }catch{return false;}
}
/** Pure draft transition. Caller must authorize/validate parent snapshot and commit atomically. Not dispatched in product actions yet. */
export function submitCommunityProof(w:ProductWorld,proof:CommunityPaymentProof,amountMinor:number,data:Record<string,string>,now=Date.now()){
 need(validCommunityPaymentProof(proof,w.owner,proof.paymentId,amountMinor)&&proof.status==='pending'&&ownPrivateAccount(w),'Only the same pending proof can be submitted.');need(data.proofRevision===String(proof.revision)&&data.confirmed==='Yes'&&data.currency==='USD'&&/^\d+$/.test(data.amountMinor||'')&&Number(data.amountMinor)===amountMinor,'Review the exact positive original amount and private proof.');
 const file=communityProofFile(w,data.fileId);need(file&&communityProofDate(data.paymentDate,now)&&communityOfflineMethods.includes(data.method as CommunityOfflineMethod)&&typeof data.notes==='string'&&data.notes.length<=500,'Choose your own available file, supported method, non-future date and notes up to500 characters.');
 const next=structuredClone(proof);next.revision++;next.status='submitted';next.submission={revision:next.revision,amountMinor,currency:'USD',method:data.method as CommunityOfflineMethod,paymentDate:data.paymentDate,notes:data.notes,file,submittedAt:now};delete next.review;need(validCommunityPaymentProof(next,w.owner,next.paymentId,amountMinor),'The submitted proof could not be qualified.');return next;
}
export function reviewCommunityProof(proof:CommunityPaymentProof,owner:string,amountMinor:number,data:Record<string,string>,now=Date.now()){
 need(validCommunityPaymentProof(proof,owner,proof.paymentId,amountMinor)&&proof.status==='submitted'&&proof.submission&&data.submittedRevision===String(proof.submission.revision)&&data.submittedAt===String(proof.submission.submittedAt),'Review the same immutable submission. Newer details need a new review.');need(data.exampleSource==='fictional-external-community-review'&&['confirmed','rejected'].includes(data.outcome)&&typeof data.note==='string'&&!!data.note.trim()&&data.note.length<=500&&Number.isFinite(now)&&now>=proof.submission.submittedAt,'Record the separately labelled original example review and reason.');
 const next=structuredClone(proof),submission=next.submission!;next.review={source:'fictional-external-community-review',outcome:data.outcome as 'confirmed'|'rejected',note:data.note.trim(),at:now,submittedRevision:submission.revision};if(data.outcome==='confirmed')next.status='confirmed';else{next.rejections.push({submission,reason:data.note.trim(),reviewedAt:now});delete next.submission;next.status='pending';next.revision++;}need(validCommunityPaymentProof(next,owner,next.paymentId,amountMinor),'The reviewed proof could not be qualified.');return next;
}

/** Compact content-bound reviews avoid copying entire private files into every action/consent. */
export function communityProofFileSnapshot(file:CommunityProofFile|undefined){if(!file)return;const {dataUrl,...meta}=file;return {...meta,contentSHA256:sha256Hex(dataUrl)};}
export function communityProofSnapshot(proof:CommunityPaymentProof|undefined){if(!proof)return;const submission=(s:CommunityProofSubmission)=>({...s,file:communityProofFileSnapshot(s.file)});return {...proof,submission:proof.submission?submission(proof.submission):undefined,rejections:proof.rejections.map(r=>({...r,submission:submission(r.submission)}))};}

export const communityProofConsent=(owner:string,parent:string,parentVersion:number,proofRevision:number,draft:Record<string,string>,file:CommunityProofFile|undefined)=>JSON.stringify({owner,parent,parentVersion,proofRevision,amount:draft.amountUSD,currency:'USD',method:draft.method,date:draft.paymentDate,file:communityProofFileSnapshot(file),notes:draft.notes});
