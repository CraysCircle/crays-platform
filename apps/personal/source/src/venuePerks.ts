import {localPresenceCurrent} from './localPresence.ts';
import {localPreviewId} from './localPreviewId.ts';
import type {ProductWorld,Entity,ActionContext} from './productModel.ts';
function need(v:unknown,m:string):asserts v{if(!v)throw Error(m);}
const owned=(w:ProductWorld,id:string,kind:string)=>{const a=w.objects.filter(o=>o.id===id);return w.identity.signedIn&&a.length===1&&a[0].owner===w.owner&&a[0].kind===kind?a[0]:undefined;};
export const ownVenuePerks=(w:ProductWorld,venueId:string)=>w.identity.signedIn?w.objects.filter(o=>o.owner===w.owner&&o.kind==='venue-perk'&&o.venueId===venueId&&owned(w,o.id,'venue-perk')):[];
export const perkReceipts=(w:ProductWorld,perkId:string)=>w.identity.signedIn?w.objects.filter(o=>o.owner===w.owner&&o.kind==='perk-receipt'&&o.perkId===perkId&&owned(w,o.id,'perk-receipt')):[];
export const perkTermsSnapshot=(p:Entity)=>JSON.stringify([p.id,p.owner,p.version,p.issuedTo,p.venueId,p.issuerId,p.issuer,p.sourceId,p.sourceVersion,p.category,p.name,p.terms,p.validFrom,p.expiresAt,p.onSite,p.synthetic,p.priceUSD,p.eligibility]);
export function perkAvailability(w:ProductWorld,id:string,at=Date.now()):{state:string;reason:string;perk?:Entity;receipt?:Entity}{
 const p=owned(w,id,'venue-perk');if(!p)return {state:'unavailable',reason:'The original benefit is missing, ambiguous or belongs to another account.'};
 const receipts=perkReceipts(w,p.id),receipt=receipts.find(r=>r.id===p.receiptId);
 if(p.status==='redeemed')return {state:'redeemed',reason:'Already used. Keep its original receipt; no second redemption.',perk:p,receipt};
 const sourceOK=p.synthetic===true&&p.sourceState==='fictional-issued'&&p.issuedTo===w.owner&&p.issuerId===`venue:${p.venueId}`&&p.sourceId===`example-perk-issuer:${p.venueId}:${p.category}`&&p.sourceVersion===1&&p.version===1&&typeof p.issuer==='string'&&!!p.issuer&&typeof p.terms==='string'&&p.priceUSD==='0.00'&&['welcome','limited-time'].includes(String(p.category))&&p.eligibility==='Community member'&&typeof p.onSite==='boolean'&&Number.isFinite(p.validFrom)&&Number.isFinite(p.expiresAt)&&Number(p.expiresAt)>Number(p.validFrom);
 if(!sourceOK)return {state:'needs-source',reason:'Its original issuer, account or terms need review. No new entitlement is inferred.',perk:p};
 if(p.status==='redemption-pending')return {state:'pending',reason:'Check the same original attempt. An unknown result is not a second redeemable benefit.',perk:p,receipt};
 if(p.status==='redemption-declined')return {state:'declined',reason:'The example issuer declined this attempt. Only a new issuer decision can release another entitlement.',perk:p,receipt};
 if(p.status==='revoked')return {state:'revoked',reason:'The issuer withdrew this benefit. Existing receipt history is retained.',perk:p,receipt};
 if(p.status!=='available')return {state:'needs-source',reason:'The source status needs review before redemption.',perk:p,receipt};
 const venues=w.venues.filter(v=>v.id===p.venueId),v=venues.length===1?venues[0]:undefined;
 if(!v?.operatorActive)return {state:'unavailable',reason:'This Spot is unavailable. Your original benefit history remains.',perk:p};
 if(Number(p.validFrom)>at)return {state:'future',reason:'This benefit has not started yet.',perk:p};
 if(Number(p.expiresAt)<=at)return {state:'expired',reason:'This offer has expired. It cannot be redeemed or silently renewed.',perk:p};
 if(!['active','provisional'].includes(v.membership))return {state:'needs-membership',reason:'The issuer requires current community eligibility at this exact Spot.',perk:p};
 if(p.onSite===true&&!localPresenceCurrent(w,v.id))return {state:'needs-checkin',reason:'This on-site benefit needs a current visit at this Spot. A badge, booking or relay connection is not enough.',perk:p};
 return {state:'available',reason:'Review the exact issuer terms before requesting redemption. Availability still needs the issuer’s response.',perk:p};
}
export function applyVenuePerks(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('perk.preview.')&&op!=='complete.perk.redeem')return;
 need(w.identity.signedIn,'Sign in to review your own original benefits.');
 if(op==='perk.preview.example'){
  need(d.approved==='Yes','Choose the clearly labelled example explicitly.');const venues=w.venues.filter(v=>v.id===ctx.venueId);need(venues.length===1&&venues[0].operatorActive,'Choose one available original Spot.');const v=venues[0],at=Date.now();let added=0;
  for(const category of ['welcome','limited-time']){
   if(w.objects.some(o=>o.owner===w.owner&&o.kind==='venue-perk'&&o.venueId===v.id&&o.category===category))continue;
   added++;w.objects.push({id:localPreviewId(),owner:w.owner,kind:'venue-perk',venueId:v.id,issuedTo:w.owner,issuerId:`venue:${v.id}`,issuer:v.name,sourceId:`example-perk-issuer:${v.id}:${category}`,sourceVersion:1,version:1,sourceState:'fictional-issued',synthetic:true,category,name:category==='welcome'?'Welcome drink · example':'A little extra this week · example',terms:category==='welcome'?'One complimentary welcome drink for this named account, subject to the example issuer confirming fulfilment. No cash value or transfer.':'One complimentary seasonal taster for this named account during the stated period. Subject to the example issuer confirming availability. No cash value or transfer.',eligibility:'Community member',onSite:true,validFrom:at-60000,expiresAt:at+(category==='welcome'?7:2)*86400000,priceUSD:'0.00',status:'available',createdAt:at});
  }
  return {objectId:ctx.venueId||'',message:added?'Labelled fictional issuer examples opened. No real gift, membership, attendance, payment or booking was created.':'Existing issuer originals retained; no replacement entitlement or renewal was created.'};
 }
 const decision=perkAvailability(w,ctx.objectId||''),p=decision.perk;need(p,'Open your own original benefit.');need(ctx.venueId===p.venueId,'This benefit belongs to another Spot.');
 if(op==='complete.perk.redeem'){
  need(d.approved==='Yes'&&d.expectedVersion===String(p.version)&&d.termsSnapshot===perkTermsSnapshot(p),'Review this exact issuer version before requesting redemption.');
  const current=perkReceipts(w,p.id);need(current.length<=1,'Resolve conflicting original redemption records before continuing.');
  if(['pending','redeemed','declined'].includes(decision.state)){need(decision.receipt,'The original attempt is missing; do not repeat redemption.');return {objectId:p.id,message:'Keep the same original redemption attempt and its status. No second receipt was created.'};}
  need(decision.state==='available',decision.reason);need(!current.length,'This benefit already has an original attempt. Open its outcome.');const id=localPreviewId();w.objects.push({id,owner:w.owner,kind:'perk-receipt',perkId:p.id,venueId:p.venueId,issuerId:p.issuerId,issuer:p.issuer,issuedTo:p.issuedTo,sourceId:p.sourceId,sourceVersion:p.sourceVersion,termsSnapshot:perkTermsSnapshot(p),attemptId:id,status:'pending',amount:'0.00',currency:'USD',paymentCreated:false,synthetic:true,createdAt:Date.now(),history:[{state:'pending',at:Date.now()}]});p.status='redemption-pending';p.receiptId=id;return {objectId:p.id,message:'One example redemption request prepared. It is not fulfilled or charged. Check this exact original with the issuer.'};
 }
 need(op==='perk.preview.check','Use the original issuer outcome check.');need(d.approved==='Yes','Choose a labelled issuer-response preview explicitly.');const receipts=perkReceipts(w,p.id),r=receipts.length===1?receipts[0]:undefined;need(r&&r.id===p.receiptId&&r.attemptId===r.id&&r.synthetic===true&&r.termsSnapshot===perkTermsSnapshot(p)&&r.venueId===p.venueId&&r.issuedTo===w.owner&&r.issuerId===p.issuerId&&r.sourceId===p.sourceId&&r.sourceVersion===p.sourceVersion,'The original attempt or issuer terms changed. No new redemption was made.');
 if(r.status==='redeemed-demo'||r.status==='declined')return {objectId:p.id,message:'The original final outcome is retained; no repeated fulfilment or receipt.'};
 need(decision.state==='pending'&&p.status==='redemption-pending'&&['pending','unknown'].includes(String(r.status)),'This original request needs review.');need(['Confirmed','Unknown','Declined'].includes(d.outcome),'Choose the explicit issuer response.');
 const at=Date.now();if(d.outcome==='Confirmed'){
  const v=w.venues.find(v=>v.id===p.venueId);need(v?.operatorActive&&['active','provisional'].includes(v.membership)&&(!p.onSite||localPresenceCurrent(w,v.id,at))&&Number(p.validFrom)<=at&&Number(p.expiresAt)>at,'Current issuer eligibility, on-site presence or validity no longer allows this example fulfilment. Keep the original outcome unresolved.');p.status='redeemed';p.redeemedAt=at;r.status='redeemed-demo';r.fulfilledAt=at;
 }else if(d.outcome==='Declined'){p.status='redemption-declined';r.status='declined';}else r.status='unknown';
 if(!Array.isArray(r.history))throw Error('The original outcome history is unavailable.');if((r.history.at(-1) as {state?:string})?.state!==r.status)r.history.push({state:r.status,at});
 return {objectId:p.id,message:d.outcome==='Confirmed'?'Fictional issuer fulfilment recorded once. Original receipt retained; no payment, contact or admission was created.':d.outcome==='Unknown'?'Outcome remains unknown on the same original attempt. Do not redeem again.':'Fictional issuer declined the request. No benefit, payment or new entitlement was created.'};
}
