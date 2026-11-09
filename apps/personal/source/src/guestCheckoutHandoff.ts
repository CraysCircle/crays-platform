import type {ProductWorld} from './productModel.ts';
import {ownReferralGuestApplications,referralGuestCase,referralGuestCheckoutContext} from './referralGuestJourney.ts';
import {ownPartnerProgrammes} from './ambassadorJourney.ts';
export type GuestCheckoutContext=NonNullable<ReturnType<typeof referralGuestCheckoutContext>>;
export type GuestCheckoutStep={id:'eligibility'|'applicant-account'|'spot-offer'|'terms'|'payment'|'activation';state:'ready'|'required'|'locked';title:string;description:string};
export type GuestCheckoutReady={state:'eligibility-ready-checkout-locked';review:string;owner:string;applicationId:string;caseId:string;programmeId:string;spaceId:string;tenantKey:string;recipientId:string;applicantName:string;spaceName:string;vertical:'club'|'gym';expiresAt:number;eligibilityReceipt:string;receipts:{stage:string;attemptId:string;receiptId:string}[];steps:GuestCheckoutStep[];applicantAccount:'unbound';offer:'no-qualified-same-spot-usd-offer';canPay:false;canCreateMembership:false;liveExecution:false};
export type GuestCheckoutHeld={state:'source-unavailable';message:string;canPay:false;canCreateMembership:false;liveExecution:false};
export type GuestCheckoutView=GuestCheckoutReady|GuestCheckoutHeld;
const serial=(x:unknown)=>JSON.stringify(x);
const held=():GuestCheckoutHeld=>({state:'source-unavailable',message:'This original application, eligibility or assignment changed, expired or is unavailable to your account. No applicant, alternative Spot or payment source was selected.',canPay:false,canCreateMembership:false,liveExecution:false});
/** Read-only, recipient-bound qualification handoff. A reviewer is never promoted to payer. */
export function guestCheckoutHandoff(w:ProductWorld,requested:GuestCheckoutContext,now=Date.now()):GuestCheckoutView{
 try{
  if(!w.identity.signedIn||!Number.isFinite(now)||!requested||requested.source!=='explicit-fictional-membership-eligibility'||requested.liveExecution!==false||requested.personalPaymentApprovalRequired!==true)return held();
  const current=referralGuestCheckoutContext(w,requested.applicationId,now);if(!current||serial(current)!==serial(requested))return held();
  const a=ownReferralGuestApplications(w).find(a=>a.id===current.applicationId),p=a&&ownPartnerProgrammes(w).find(p=>p.id===a.programmeId),c=a&&referralGuestCase(w,a);
  if(!a||!p||!c||w.objects.filter(o=>o.id===a.id).length!==1||w.objects.filter(o=>o.id===p.id).length!==1||w.objects.filter(o=>o.id===c.id).length!==1||a.owner!==w.owner||p.owner!==w.owner||p.subjectId!==w.owner||c.owner!==w.owner||c.reviewerId!==w.owner||c.applicantId===w.owner||c.applicantId!==current.recipientId||a.spaceId!==p.spaceId||c.spaceId!==p.spaceId||a.tenantKey!==p.tenantKey||c.tenantKey!==p.tenantKey||a.programmeId!==p.id||c.programmeId!==p.id||a.caseId!==c.id||c.guestApplicationId!==a.id||a.vertical!==p.vertical||c.vertical!==p.vertical||!Number.isFinite(c.expiresAt)||c.expiresAt<=now||!Number.isFinite(p.expiresAt)||p.expiresAt<=now)return held();
  const venues=w.venues.filter(v=>v.id===current.spaceId&&v.operatorActive);if(venues.length!==1)return held();
  const stages=a.vertical==='gym'?['identity','eligibility']:['team-decision','team-go','eligibility'];
  const attempts=(a.continuation?.attempts||[]).filter(t=>stages.includes(t.stage)&&t.status==='confirmed');
  if(attempts.length!==stages.length||attempts.some(t=>t.source!=='explicit-fictional-source-response'||t.recipientId!==c.applicantId||t.receiptId!==`fictional-${t.stage}-receipt:${t.id}`))return held();
  const receipts=attempts.map(t=>({stage:t.stage,attemptId:t.id,receiptId:t.receiptId!}));
  if(w.objects.some(o=>o.id!==a.id&&o.kind==='referral-guest-application-preview'&&((o as unknown as {continuation?:{attempts?:{id:string;receiptId?:string}[]}}).continuation?.attempts||[]).some(t=>receipts.some(r=>r.attemptId===t.id||r.receiptId===t.receiptId))))return held();
  if(new Set(receipts.map(r=>r.attemptId)).size!==receipts.length||new Set(receipts.map(r=>r.receiptId)).size!==receipts.length)return held();
  const expiresAt=Math.min(c.expiresAt,p.expiresAt),review=serial({source:'guest-membership-checkout-handoff-preview-v1',owner:w.owner,context:current,applicationVersion:a.version,caseVersion:c.version,assignmentVersion:c.assignmentVersion,programmeVersion:p.version,grantVersion:p.grantVersion,applicationStatus:a.status,caseStatus:c.status,programmeStatus:p.status,spaceName:venues[0].name,expiresAt,receipts,applicantAccount:'unbound',offer:'no-qualified-same-spot-usd-offer',canPay:false,liveExecution:false});
  return {state:'eligibility-ready-checkout-locked',review,owner:w.owner,applicationId:a.id,caseId:c.id,programmeId:p.id,spaceId:p.spaceId,tenantKey:p.tenantKey,recipientId:c.applicantId,applicantName:a.draft.fullName,spaceName:venues[0].name,vertical:a.vertical,expiresAt,eligibilityReceipt:current.eligibilityReceipt,receipts,steps:[
   {id:'eligibility',state:'ready',title:'Eligibility ready in this example',description:'The matching original applicant, programme and Spot have their required fictional source receipts. This is not a payment or membership.'},
   {id:'applicant-account',state:'required',title:'Applicant account required',description:'The exact eligible applicant must be bound to their own verified account. Supplied contact details, a reviewer login or switching demo accounts does not establish that binding.'},
   {id:'spot-offer',state:'required',title:'Current USD offer from this Spot required',description:'Load an active offer from this exact Spot, tenant and seller with its original version, USD price, period, cancellation terms and current terms document. No such qualified offer is connected here.'},
   {id:'terms',state:'locked',title:'Applicant reviews the exact terms',description:'After account and offer qualification, the applicant personally reviews the exact offer version and current terms. The sponsor cannot accept them for the applicant.'},
   {id:'payment',state:'locked',title:'Customer personally approves payment',description:'The same customer must approve the exact seller, USD total, fees, payment method and original attempt. Unknown outcomes require checking that original; this handoff creates no payment.'},
   {id:'activation',state:'locked',title:'Membership and entry checked separately',description:'Payment, membership activation, contract/invoice and physical entry each require their own matching source outcomes. An eligibility receipt does not grant any of them.'}
  ],applicantAccount:'unbound',offer:'no-qualified-same-spot-usd-offer',canPay:false,canCreateMembership:false,liveExecution:false};
 }catch{return held();}
}
/** Recheck before a UI continuation. Never a checkout, identity-mapping or price-setting action. */
export function reviewGuestCheckoutHandoff(w:ProductWorld,context:GuestCheckoutContext,exactReview:string,now=Date.now()):GuestCheckoutReady{
 const current=guestCheckoutHandoff(w,context,now);if(current.state!=='eligibility-ready-checkout-locked'||current.review!==exactReview)throw Error('Review this exact current original eligibility and assignment again. No payment or account binding was created.');return current;
}
