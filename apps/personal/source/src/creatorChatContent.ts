import {mayRead,type ProductWorld,type Payment,type Post} from './productModel.ts';
import {canReadPaidOriginal} from './paidContentAccess.ts';
import {awardVotes} from './awardPreview.ts';
export type CreatorChatEntry={sourceId:string;post?:Post;payments:Payment[];canOpen:boolean;status:string};
/** Read-only projection of own original purchases. This grants neither chat nor content rights. */
export function creatorChatContent(w:ProductWorld,personId:string):CreatorChatEntry[]{
 if(!w.identity.signedIn||personId===w.owner)return [];
 const people=w.people.filter(p=>p.id===personId);
 if(people.length!==1)return []; // Communication blocks do not revoke an independently held purchase/licence.
 const payments=w.payments.filter(p=>p.owner===w.owner&&p.recipient===personId&&p.purpose==='Content purchase'&&p.creatorOfferType!=='paid-conversation'&&!w.objects.some(o=>o.owner===w.owner&&o.kind==='entitlement-payment'&&o.paymentId===p.id&&o.grantKind==='paid-conversation')&&!w.objects.some(o=>o.kind==='public-creator-offer'&&o.id===p.offerId&&String(o.version)===p.offerVersion&&o.type==='paid-conversation')&&w.payments.filter(x=>x.id===p.id).length===1&&['prepared','approved','submitted','pending','unknown','confirmed','failed','refunded'].includes(p.status));
 return [...new Set(payments.map(p=>p.sourceId))].map(sourceId=>{
  const attempts=payments.filter(p=>p.sourceId===sourceId),originals=w.posts.filter(p=>p.id===sourceId);
  const p=originals.length===1&&originals[0].author===personId&&mayRead(w,originals[0])&&['accepted','partial'].includes(originals[0].status)?originals[0]:undefined;
  const settled=attempts.some(p=>p.status==='confirmed'),canOpen=!!p&&settled&&canReadPaidOriginal(w,p)&&p.mediaAvailable;
  return {sourceId,post:p,payments:attempts,canOpen,status:!p?'Original unavailable · receipts retained':canOpen?'Purchased · ready to open':settled?p.license?'Rights retained · media unavailable':'Payment confirmed · access needs review':attempts.some(p=>['pending','unknown','submitted'].includes(p.status))?'Payment outcome needs review':attempts.every(p=>p.status==='refunded')?'Refund recorded · access needs review':'Purchase not completed'};
 });
}
export function creatorInboxPeople(w:ProductWorld){
 if(!w.identity.signedIn)return [];
 // Inbox discovery needs public profile eligibility, not every creator’s complete
 // posts/offers/campaign graph. Build exact ambiguity indexes once per projection.
 const objectCounts=new Map<string,number>(),personCounts=new Map<string,number>();
 const profiles=new Map<string,typeof w.objects>();const paid=new Set<string>();
 for(const o of w.objects){objectCounts.set(o.id,(objectCounts.get(o.id)||0)+1);if(o.kind==='creator-profile'&&o.status==='published-demo'&&typeof o.personId==='string')profiles.set(o.personId,[...(profiles.get(o.personId)||[]),o]);if(o.owner===w.owner&&o.kind==='paid-conversation'&&typeof o.sellerId==='string')paid.add(o.sellerId);}
 for(const p of w.people)personCounts.set(p.id,(personCounts.get(p.id)||0)+1);
 const paymentRecipients=new Set(w.payments.filter(p=>p.owner===w.owner&&p.purpose==='Content purchase').map(p=>p.recipient));
 const supported=new Set(awardVotes(w).filter(v=>v.status!=='failed').map(v=>v.creatorId));
 return w.people.filter(p=>{
  if(personCounts.get(p.id)!==1)return false;
  if(paid.has(p.id)||paymentRecipients.has(p.id)&&creatorChatContent(w,p.id).length>0)return true;
  const rows=profiles.get(p.id)||[],available=rows.length===1&&objectCounts.get(rows[0].id)===1&&!p.blocked&&!p.blockedByOther;
  return available&&(p.following||supported.has(p.id));
 });
}
