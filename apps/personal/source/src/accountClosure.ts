import type {ActionContext,Entity,ProductWorld} from './productModel.ts';
import {nostrPublicIdReadable} from './nostrSources.ts';
import {localPreviewId} from './localPreviewId.ts';
import {closureItems,closureItemChoices} from './closureConsequences.ts';

export const closureSources=[
 {id:'contracts',name:'Subscriptions & services',detail:'Renewals, bookings, orders and refunds stay with their original Spot and contract.'},
 {id:'tasks',name:'Chuck tasks & plans',detail:'Running work needs a separate stop and confirmation. A closure request does not stop execution.'},
 {id:'access',name:'Communities & permissions',detail:'Membership, social visibility, app permissions and device sessions require separate decisions.'},
 {id:'data',name:'Private data & memory',detail:'Review export and deletion at each source, including health data, files and memories.'},
 {id:'receipts',name:'Payments & retained records',detail:'Receipts, licences and third-party interests need a source-specific retention decision. Funds are not transferred.'},
 {id:'nostr',name:'Independent Nostr identity',detail:'Your keys and identity are independent of CRAYS. Replicated public events cannot be globally erased.'},
] as const;
export type ClosureSource=typeof closureSources[number]['id'];
export type ClosureOutcome='pending'|'unknown'|'restricted'|'unavailable'|'confirmed-example';
export type ClosureItemDecision={ref:string;choice:string;note:string;at:number;revision:number;itemSnapshot:string;requestState:'decision-only'};
export type ClosureReview=Entity&{kind:'account-closure-review';version:number;requestId:string;status:'prepared'|'awaiting-source-results'|'withdrawn-locally';note:string;reviewedSnapshot:string;results:Record<ClosureSource,ClosureOutcome>;decisions?:Record<string,ClosureItemDecision>;decisionHistory?:ClosureItemDecision[];fictional:true;liveClosure:false;createdAt:number};
const sourceIds=closureSources.map(s=>s.id);
const reference=(v:unknown,max=300):v is string=>typeof v==='string'&&!!v.trim()&&v===v.trim()&&v.length<=max;
function validDecision(x:unknown):x is ClosureItemDecision{
 if(!x||typeof x!=='object')return false;const d=x as ClosureItemDecision;
 if(!reference(d.ref)||!reference(d.choice)||typeof d.note!=='string'||d.note.length>2000||typeof d.at!=='number'||!Number.isFinite(d.at)||d.at<=0||!Number.isSafeInteger(d.revision)||d.revision<=0||typeof d.itemSnapshot!=='string'||d.requestState!=='decision-only')return false;
 try{const item=JSON.parse(d.itemSnapshot) as ClosureItemDecision&{source:ClosureSource;originalId:string};return item.ref===d.ref&&typeof item.originalId==='string'&&item.ref.endsWith(':'+item.originalId)&&(!item.ref.startsWith('identity:')||item.ref==='identity:nostr'&&item.source==='nostr'&&item.originalId==='nostr')&&(!item.ref.startsWith('space:')||item.source==='access')&&(!/^(wallet|payment):/.test(item.ref)||item.source==='receipts')&&sourceIds.includes(item.source)&&closureItemChoices[item.source].some(c=>c.value===d.choice);}catch{return false;}
}
function validDecisions(o:Entity){return (o.decisions===undefined||Boolean(o.decisions&&typeof o.decisions==='object'&&!Array.isArray(o.decisions)&&Object.entries(o.decisions).every(([ref,d])=>validDecision(d)&&ref===d.ref)))&&(o.decisionHistory===undefined||Array.isArray(o.decisionHistory)&&o.decisionHistory.every(validDecision));}
function own(w:ProductWorld,ctx?:Partial<ActionContext>){if(w.identity.signedIn!==true||!reference(w.owner)||(ctx?.personId!==undefined&&ctx.personId!==w.owner))throw Error('Sign in to review your own account closure.');}
function validSnapshot(value:unknown,owner:string){if(!reference(value,2000000))return false;try{const a=JSON.parse(value);return Array.isArray(a)&&a.length===9&&a[0]===owner&&nostrPublicIdReadable(a[1])&&['locked','demo-connected','revoked'].includes(a[2])&&Array.isArray(a[4])&&Array.isArray(a[5])&&Array.isArray(a[6])&&Array.isArray(a[7])&&a[8]&&Array.isArray(a[8].items);}catch{return false;}}
export function closureReviews(w:ProductWorld):ClosureReview[]{
 if(w.identity.signedIn!==true||!reference(w.owner))return [];
 return (Array.isArray(w.objects)?w.objects:[]).filter((o):o is ClosureReview=>!!o&&reference(o.id)&&o.owner===w.owner&&o.kind==='account-closure-review'&&o.fictional===true&&o.liveClosure===false&&typeof o.note==='string'&&o.note.length<=2000&&reference(o.requestId,120)&&validSnapshot(o.reviewedSnapshot,w.owner)&&Number.isSafeInteger(o.version)&&Number(o.version)>0&&typeof o.createdAt==='number'&&Number.isFinite(o.createdAt)&&o.createdAt>0&&typeof o.status==='string'&&['prepared','awaiting-source-results','withdrawn-locally'].includes(o.status)&&typeof o.results==='object'&&o.results!==null&&sourceIds.every(id=>typeof (o.results as Record<string,unknown>)[id]==='string'&&['pending','unknown','restricted','unavailable','confirmed-example'].includes((o.results as Record<string,string>)[id]))&&validDecisions(o)&&w.objects.filter(x=>x?.id===o.id).length===1&&w.objects.filter(x=>x?.owner===w.owner&&x.kind==='account-closure-review'&&x.requestId===o.requestId).length===1);
}
const metadata=(v:unknown)=>typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v)?v:null;
export function closureImpactSnapshot(w:ProductWorld):string{
 own(w);if(!['locked','demo-connected','revoked'].includes(w.identity.signer)||typeof w.identity.signer!=='string'||!(typeof w.identity.relaySelection==='string'&&nostrPublicIdReadable(w.identity.relaySelection)||Array.isArray(w.identity.relaySelection)&&w.identity.relaySelection.every(nostrPublicIdReadable)))throw Error('Review the original signer and relay selection.');if(!nostrPublicIdReadable(w.identity.publicId))throw Error('Review your public identity before preparing this account review.');
 w={...w,objects:(Array.isArray(w.objects)?w.objects:[]).filter(x=>x&&typeof x==='object'),payments:(Array.isArray(w.payments)?w.payments:[]).filter(x=>x&&typeof x==='object'),wallets:(Array.isArray(w.wallets)?w.wallets:[]).filter(x=>x&&typeof x==='object'),venues:(Array.isArray(w.venues)?w.venues:[]).filter(x=>x&&typeof x==='object')};
 // Metadata only: no credentials, private chat text, health readings or peer profiles.
 const rows=w.objects.filter(o=>o.owner===w.owner&&o.kind!=='account-closure-review').map(o=>[o.id,o.kind,o.status,o.version,o.storeId,o.venueId,o.membershipId,o.renewal,o.startsAt,o.endsAt,o.expiresAt,o.revokeVersion,o.amountMinor,o.currency,o.recipient,o.purpose,o.scope,o.dataType].map(metadata)).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
 return JSON.stringify([w.owner,w.identity.publicId,w.identity.signer,w.identity.relaySelection,rows,w.payments.filter(p=>p.owner===w.owner).map(p=>[p.id,p.status,p.amount,p.fee,p.recipient,p.sourceId,p.walletId].map(metadata)),w.wallets.map(x=>[x.id,x.connected,x.asset,x.network,x.available,x.pending,x.reserved].map(metadata)),w.venues.map(v=>[v.id,v.membership,v.grant,v.presence].map(metadata)),closureItems(w)]);
}
export function closureImpact(w:ProductWorld){
 own(w);const {items,ambiguous}=closureItems(w);
 return {ambiguous,sources:closureSources.map(s=>({...s,records:items.filter(o=>o.source===s.id)}))};
}
export function applyAccountClosure(w:ProductWorld,op:string,d:Record<string,string>,ctx:Partial<ActionContext>,now=Date.now()):{objectId:string;message:string}|null{
 if(!op.startsWith('closure.preview.'))return null;own(w,ctx);if(!Number.isFinite(now)||now<=0)throw Error('Review the current time.');
 if(op==='closure.preview.prepare'){
  const note=(d.note||'').trim();if(!reference(d.requestId,120)||note.length>2000)throw Error('Use a valid review reference and a note up to 2,000 characters.');
  const matches=w.objects.filter(o=>o.owner===w.owner&&o.kind==='account-closure-review'&&o.requestId===d.requestId);
  if(matches.length){const old=closureReviews(w).find(o=>o.requestId===d.requestId);if(matches.length!==1||!old||old.note!==note)throw Error('Open the unchanged original closure review.');return {objectId:old.id,message:'Opened the same local review. No account or contract was closed.'};}
  if(w.objects.some(o=>o.owner===w.owner&&o.kind==='account-closure-review'&&!closureReviews(w).some(r=>r.id===o.id)))throw Error('The existing review needs source repair. Keep the original; do not create a replacement.');
  if(closureReviews(w).some(o=>o.status!=='withdrawn-locally'))throw Error('Continue the existing review before starting another.');
  if(d.confirmed!=='Yes'||d.reviewedSnapshot!==closureImpactSnapshot(w))throw Error('Review the current account consequences and confirm again.');
  if(closureImpact(w).ambiguous)throw Error('Conflicting original records need source review before preparing closure.');
  const id=localPreviewId();w.objects.unshift({id,owner:w.owner,kind:'account-closure-review',version:1,requestId:d.requestId,status:'prepared',note,reviewedSnapshot:d.reviewedSnapshot,results:Object.fromEntries(sourceIds.map(s=>[s,'pending'])),fictional:true,liveClosure:false,createdAt:now});return {objectId:id,message:'Closure review saved locally. No request was sent and no access, contract, funds or data changed.'};
 }
 const o=closureReviews(w).find(o=>o.id===ctx.objectId);if(!o)throw Error('Open your own unambiguous original closure review.');
 if(d.version!==String(o.version)||o.status==='withdrawn-locally')throw Error('This review changed or was withdrawn. Reopen its original.');
 if(op==='closure.preview.withdraw'){
  if(d.confirmed!=='Yes')throw Error('Confirm withdrawal of this local review.');o.status='withdrawn-locally';o.version++;return {objectId:o.id,message:'Local review withdrawn. No remote cancellation is claimed; existing access and records stay unchanged.'};
 }
 if(d.reviewedSnapshot!==closureImpactSnapshot(w)||o.reviewedSnapshot!==d.reviewedSnapshot)throw Error('Account circumstances changed. Withdraw this local review and prepare a fresh one after checking the originals.');
 if(op==='closure.preview.item'){
  const item=closureItems(w).items.find(i=>i.ref===d.itemRef),note=(d.note||'').trim();
  if(!item||d.confirmed!=='Yes'||note.length>2000||!closureItemChoices[item.source].some(c=>c.value===d.choice))throw Error('Review one current original item and its permitted decision.');
  const previous=o.decisions?.[item.ref];
  if(previous?.choice===d.choice&&previous.note===note)return {objectId:o.id,message:'The same item decision is already saved. No duplicate source request was created.'};
  const decision:ClosureItemDecision={ref:item.ref,choice:d.choice,note,at:now,revision:(previous?.revision||0)+1,itemSnapshot:JSON.stringify(item),requestState:'decision-only'};
  o.decisions={...o.decisions,[item.ref]:decision};o.decisionHistory=[...(o.decisionHistory||[]),decision];o.version++;
  return {objectId:o.id,message:'Your choice for this original item is saved for review only. Open its source for a separate action and confirmation.'};
 }
 if(op==='closure.preview.start'){
  if(d.confirmed!=='Yes'||o.status!=='prepared')throw Error('Confirm the prepared sample review first.');o.status='awaiting-source-results';o.version++;return {objectId:o.id,message:'Sample source review started. No provider was contacted. Follow each result on this same original.'};
 }
 if(op==='closure.preview.result'){
  if(o.status!=='awaiting-source-results'||d.sampleAcknowledged!=='Yes'||!sourceIds.includes(d.source as ClosureSource)||!['pending','unknown','restricted','unavailable','confirmed-example'].includes(d.outcome))throw Error('Choose an explicit sample result for one original source.');
  const source=d.source as ClosureSource;if(o.results[source]===d.outcome)return {objectId:o.id,message:'The same source result is already recorded. No duplicate request was created.'};
  o.results={...o.results,[source]:d.outcome as ClosureOutcome};o.version++;return {objectId:o.id,message:'Sample source result retained on the original review. This is not a confirmed live closure or deletion.'};
 }
 throw Error('Unknown closure review action.');
}
