import type {ProductWorld,Entity,ActionContext,Wallet} from './productModel';
import {verifiedVenueOperator} from './venueAuthority';
import {venueSetupGates} from './venueSetup';
import {localPreviewId} from './localPreviewId';
export const merchantCryptoAssets=['BTC','sats','USDT','USDB'] as const;
export type MerchantAcceptanceDraft={applePay:boolean;cryptoAssets:string[]};
export type MerchantAcceptance=Entity&{kind:'merchant-payment-acceptance';setupId:string;venueId:string;contractId:string;paymentId:string;version:number;draft:MerchantAcceptanceDraft;status:'reviewed-preview'|'ready-preview'|'restricted-preview'|'unknown-preview'|'paused-preview';feePayer:'merchant';currency:'USD';reviewSnapshot:string;accountReference:string;realExecution:false};
export function merchantSetupEligibility(w:ProductWorld,setupId:string){
 if(!w.identity.signedIn)return;
 const setups=w.objects.filter(o=>o.id===setupId&&o.owner===w.owner&&o.kind==='venue-setup');if(setups.length!==1)return;const s=setups[0];if(s.status!=='released-preview'||typeof s.venueId!=='string'||!verifiedVenueOperator(w,s.venueId))return;
 const gates=venueSetupGates(w,s);if(!gates.entitlement||!gates.configuration||!gates.relay||!gates.authority)return;
 const bindings=w.objects.filter(e=>e.owner===w.owner&&e.kind==='venue-entitlement'&&e.setupId===s.id&&e.status==='active-demo');if(bindings.length!==1)return;
 const contracts=w.objects.filter(c=>c.id===bindings[0].contractId&&c.owner===w.owner&&c.kind==='crays-plan-contract'&&c.serviceScopeId===s.id&&c.segment==='venue');if(contracts.length!==1)return;const c=contracts[0];
 const payments=w.payments.filter(p=>p.id===c.paymentId&&p.owner===w.owner&&p.status==='confirmed'&&p.recipient==='CRAYS'&&p.sourceId===c.reviewId&&p.planReviewId===c.reviewId&&p.purpose==='CRAYS membership');if(payments.length!==1||!w.objects.some(o=>o.kind==='crays-plan-payment'&&o.owner===w.owner&&o.contractId===c.id&&o.paymentId===payments[0].id))return;
 return {setup:s,contract:c,payment:payments[0]};
}
export function merchantAcceptanceFor(w:ProductWorld,setupId:string){if(!w.identity.signedIn)return;const rows=w.objects.filter(o=>o.owner===w.owner&&o.kind==='merchant-payment-acceptance'&&o.setupId===setupId);return rows.length===1?rows[0] as MerchantAcceptance:undefined;}
export function applyMerchantAcceptance(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('merchant.acceptance.'))return;
 const scope=merchantSetupEligibility(w,ctx.objectId||'');if(!scope)throw Error('Finish the Spot, relay checks, paid CRAYS subscription and guest release before setting up merchant payment acceptance.');
 const existing=merchantAcceptanceFor(w,scope.setup.id);if(w.objects.filter(o=>o.owner===w.owner&&o.kind==='merchant-payment-acceptance'&&o.setupId===scope.setup.id).length>1)throw Error('Resolve ambiguous merchant payment settings.');
 if(data.expectedVersion!==String(existing?.version||0))throw Error('Merchant payment settings changed. Review the current original.');
 if(op==='merchant.acceptance.review'){
  let d:MerchantAcceptanceDraft;try{d=JSON.parse(data.draft);}catch{throw Error('Review your merchant payment methods.');}
  if(!d||typeof d.applePay!=='boolean'||!Array.isArray(d.cryptoAssets)||d.cryptoAssets.some(a=>!merchantCryptoAssets.includes(a as typeof merchantCryptoAssets[number]))||new Set(d.cryptoAssets).size!==d.cryptoAssets.length||data.snapshot!==JSON.stringify(d)||data.approved!=='Yes'||data.feePayerApproved!=='Yes')throw Error('Explicitly review merchant fee responsibility and these exact payment methods.');
  const r=existing||{id:localPreviewId(),owner:w.owner,kind:'merchant-payment-acceptance',setupId:scope.setup.id,venueId:scope.setup.venueId,contractId:scope.contract.id,paymentId:scope.payment.id,version:0,feePayer:'merchant',currency:'USD',accountReference:`fictional-connected-account:${scope.setup.id}`,realExecution:false} as MerchantAcceptance;
  Object.assign(r,{draft:structuredClone(d),version:r.version+1,status:'reviewed-preview',reviewSnapshot:JSON.stringify(d)});if(!existing)w.objects.push(r);return {objectId:r.id,message:'Your merchant-owned USD account setup and selected methods are reviewed. Provider onboarding and activation remain separate. No account or payment was created outside this preview.'};
 }
 if(!existing||existing.reviewSnapshot!==JSON.stringify(existing.draft)||existing.feePayer!=='merchant'||existing.paymentId!==scope.payment.id||existing.contractId!==scope.contract.id)throw Error('Review the exact merchant account, fee responsibility and paid Spot first.');
 if(op==='merchant.acceptance.check'){
  if(!['Ready','Restricted','Unknown'].includes(data.outcome)||data.approved!=='Yes')throw Error('Choose an explicit fictional provider response.');
  existing.status=data.outcome==='Ready'?'ready-preview':data.outcome==='Restricted'?'restricted-preview':'unknown-preview';existing.version++;return {objectId:existing.id,message:'Fictional merchant-provider response saved. No live Stripe onboarding, Apple Pay eligibility or crypto wallet connection is claimed.'};
 }
 if(op==='merchant.acceptance.pause'&&data.approved==='Yes'){existing.status='paused-preview';existing.version++;return {objectId:existing.id,message:'New merchant payment acceptance is paused in the preview. Existing payments, refunds and receipts are retained.'};}
 throw Error('Choose a supported merchant payment action.');
}
export function requireVenuePaymentAcceptance(w:ProductWorld,recipient:string,wallet:Pick<Wallet,'asset'|'network'>){
 const venues=w.venues.filter(v=>v.id===recipient||v.name===recipient);if(!venues.length)return;if(venues.length!==1)throw Error('Review the exact merchant beneficiary.');
 if(wallet.asset==='USD'){if(wallet.network!=='Stripe · USD')throw Error('Use the official USD merchant checkout.');return;}
 const venue=venues[0],rows=w.objects.filter(o=>o.kind==='merchant-payment-acceptance'&&o.venueId===venue.id&&o.status==='ready-preview'&&o.feePayer==='merchant'&&o.currency==='USD');if(rows.length!==1)throw Error('This Spot has not explicitly enabled the selected crypto payment route. Use its official USD checkout.');
 const r=rows[0] as MerchantAcceptance,sourceWorld={...w,owner:r.owner};const eligible=merchantSetupEligibility(sourceWorld,r.setupId);if(!eligible||r.contractId!==eligible.contract.id||r.paymentId!==eligible.payment.id||r.reviewSnapshot!==JSON.stringify(r.draft)||!r.draft.cryptoAssets.includes(wallet.asset))throw Error('Merchant crypto acceptance is unavailable, paused or changed. Review its current payment methods.');
}
