import type {ProductWorld} from '../productModel';
import {awardVotes} from '../awardPreview';
/** Fresh inbox discovery indexes only. Never grants communication or paid-content rights.
 * A creator belongs in the inbox when at least one original purchase attempt is
 * discoverable, including unavailable originals. Reading the content stays separate. */
export function indexedCreatorInboxPeople(w:ProductWorld){
 if(!w.identity.signedIn)return [];
 const objectCounts=new Map<string,number>(),personCounts=new Map<string,number>(),paymentCounts=new Map<string,number>();
 const profiles=new Map<string,typeof w.objects>(),paid=new Set<string>(),conversationPayments=new Set<string>(),conversationOffers=new Map<string,Set<string>>();
 for(const o of w.objects){
  objectCounts.set(o.id,(objectCounts.get(o.id)||0)+1);
  if(o.kind==='creator-profile'&&o.status==='published-demo'&&typeof o.personId==='string')profiles.set(o.personId,[...(profiles.get(o.personId)||[]),o]);
  if(o.owner===w.owner&&o.kind==='paid-conversation'&&typeof o.sellerId==='string')paid.add(o.sellerId);
  if(o.owner===w.owner&&o.kind==='entitlement-payment'&&o.grantKind==='paid-conversation'&&typeof o.paymentId==='string')conversationPayments.add(o.paymentId);
  if(o.kind==='public-creator-offer'&&o.type==='paid-conversation'){const versions=conversationOffers.get(o.id)||new Set<string>();versions.add(String(o.version));conversationOffers.set(o.id,versions);}
 }
 for(const p of w.people)personCounts.set(p.id,(personCounts.get(p.id)||0)+1);
 for(const p of w.payments)paymentCounts.set(p.id,(paymentCounts.get(p.id)||0)+1);
 const statuses=new Set(['prepared','approved','submitted','pending','unknown','confirmed','failed','refunded']);
 const buyers=new Set(w.payments.filter(p=>p.owner===w.owner&&p.recipient!==w.owner&&p.purpose==='Content purchase'&&p.creatorOfferType!=='paid-conversation'&&!conversationPayments.has(p.id)&&!conversationOffers.get(p.offerId||'')?.has(p.offerVersion as string)&&paymentCounts.get(p.id)===1&&statuses.has(p.status)).map(p=>p.recipient));
 const supported=new Set(awardVotes(w).filter(v=>v.status!=='failed').map(v=>v.creatorId));
 return w.people.filter(p=>{
  if(personCounts.get(p.id)!==1)return false;
  if(paid.has(p.id)||buyers.has(p.id))return true;
  const rows=profiles.get(p.id)||[],available=rows.length===1&&objectCounts.get(rows[0].id)===1&&!p.blocked&&!p.blockedByOther;
  return available&&(p.following||supported.has(p.id));
 });
}
