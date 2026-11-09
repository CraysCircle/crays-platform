import type {ActionContext,Entity,ProductWorld} from './productModel.ts';
import {ownPartnerProgrammes,ownPartnerStatements,partnerActive} from './ambassadorJourney.ts';
import {localPreviewId} from './localPreviewId.ts';

// A separately labelled illustration. Never writes a real statement, wallet, payment or role.
export const financeEvidenceKeys=['identity','agreement','recipient','tax','erp','documents','attribution','settlement'] as const;
export type FinanceEvidence=Record<typeof financeEvidenceKeys[number],boolean>;
export type FinanceExampleDraft={draftId:string;bookingLabel:string;agreementLabel:string;basisUSD:string;ratePercent:string;illustrationOnly:boolean};
type ReceiptState='pending'|'unknown'|'failed'|'confirmed';
export type ExamplePayout={id:string;amountMinor:number;status:'pending'|'unknown'|'failed'|'cancelled'|'reconciliation-required'|'transferred'|'received';beneficiaryId:string;scopeSnapshot:string;reversedMinor:number;erpPosted:boolean;transferReceipt:string|null;bankReceipt:string|null;createdAt:number;approvalSnapshot?:string;cancelRequestedAt?:number|null;cancellationReceipt?:string|null;conflictTransferReceipt?:string|null;reconciliation?:{resolvedAs:'transferred'|'cancelled';at:number}};
export type ExampleAdjustment={id:string;refundBaseMinor:number;commissionReductionMinor:number;baseBeforeMinor:number;reason:string;status:ReceiptState;createdAt:number};
export type ExampleRecovery={id:string;payoutId:string;amountMinor:number;beneficiaryId:string;status:ReceiptState;receipt:string|null;createdAt:number};
export type PartnerFinanceExample=Entity&{kind:'partner-finance-example-preview';exampleOnly:true;statementId:string;programmeId:string;spaceId:string;spaceName:string;tenantKey:string;beneficiaryId:string;sourceAgreementVersion:string;sourceGrantVersion:number;scopeSnapshot:string;draft:FinanceExampleDraft;creationSnapshot:string;version:number;currency:'USD';basisMinor:number;rateBps:number;commissionMinor:number;rounding:'ILLUSTRATION_HALF_UP_CENT_NOT_CANONICAL_POLICY';phase:'estimated'|'awaiting-review'|'approved'|'payable'|'held';holdReason:string;evidence:FinanceEvidence;payouts:ExamplePayout[];adjustments:ExampleAdjustment[];recoveries:ExampleRecovery[];createdAt:number;history:{at:number;event:string}[]};
const unique=(w:ProductWorld,id:string)=>w.objects.filter(o=>o.id===id).length===1;
export const blankFinanceEvidence=():FinanceEvidence=>Object.fromEntries(financeEvidenceKeys.map(k=>[k,false])) as FinanceEvidence;
export function parseExampleDecimal(value:string,name:string){
 if(typeof value!=='string'||!/^\d{1,9}(?:\.\d{1,2})?$/.test(value))throw Error(`${name}: use a non-negative decimal with at most two decimal places.`);
 const [whole,fraction='']=value.split('.');return Number(BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0')));
}
function commission(baseMinor:number,rateBps:number){return Number((BigInt(baseMinor)*BigInt(rateBps)+5000n)/10000n);}
export function validateFinanceExampleDraft(input:FinanceExampleDraft){
 if(!input||typeof input.draftId!=='string'||input.draftId.length<8||input.draftId.length>120||input.illustrationOnly!==true)throw Error('Confirm this is a freely chosen illustration, not an agreed real commission.');
 for(const k of ['bookingLabel','agreementLabel'] as const)if(typeof input[k]!=='string'||input[k].trim().length<3||input[k].length>120)throw Error('Name the fictional booking and example agreement.');
 const basisMinor=parseExampleDecimal(input.basisUSD,'Example USD basis'),rateBps=parseExampleDecimal(input.ratePercent,'Example percentage');
 if(!basisMinor||!rateBps||rateBps>10000||!commission(basisMinor,rateBps))throw Error('Use a positive example basis and a percentage above zero and at most 100, producing at least one cent.');
 return {draft:{...input,bookingLabel:input.bookingLabel.trim(),agreementLabel:input.agreementLabel.trim()},basisMinor,rateBps,commissionMinor:commission(basisMinor,rateBps)};
}
export function ownFinanceExamples(w:ProductWorld):PartnerFinanceExample[]{
 if(!w.identity.signedIn)return [];
 return w.objects.filter((o):o is PartnerFinanceExample=>{
  if(o.owner!==w.owner||o.kind!=='partner-finance-example-preview'||o.exampleOnly!==true||o.beneficiaryId!==w.owner||o.currency!=='USD'||!unique(w,o.id))return false;
  if([o.payouts,o.adjustments,o.recoveries].some(j=>!Array.isArray(j)||j.some(r=>!r||typeof r.id!=='string')||new Set(j.map(r=>r.id)).size!==j.length))return false;
  const s=ownPartnerStatements(w).find(s=>s.id===o.statementId);
  return !!s&&s.programmeId===o.programmeId&&s.spaceId===o.spaceId&&s.tenantKey===o.tenantKey&&s.beneficiaryId===o.beneficiaryId;
 });
}
export function financeExampleTotals(e:PartnerFinanceExample){
 const refundedBaseMinor=e.adjustments.filter(a=>a.status==='confirmed').reduce((n,a)=>n+a.refundBaseMinor,0),netCommissionMinor=commission(e.basisMinor-refundedBaseMinor,e.rateBps);
 const transferredMinor=e.payouts.filter(p=>['transferred','received'].includes(p.status)).reduce((n,p)=>n+p.amountMinor-p.reversedMinor,0);
 return {refundedBaseMinor,netCommissionMinor,commissionReductionMinor:e.commissionMinor-netCommissionMinor,transferredMinor,remainingMinor:Math.max(0,netCommissionMinor-transferredMinor),recoveryDueMinor:Math.max(0,transferredMinor-netCommissionMinor),uncertainExposureMinor:e.payouts.filter(p=>p.status==='reconciliation-required').reduce((n,p)=>n+p.amountMinor,0),pendingPayout:e.payouts.find(p=>['pending','unknown','reconciliation-required'].includes(p.status)),pendingAdjustment:e.adjustments.find(a=>a.status==='pending'||a.status==='unknown'),pendingRecovery:e.recoveries.find(r=>r.status==='pending'||r.status==='unknown')};
}
export function currentFinanceExamplePermission(w:ProductWorld,e:PartnerFinanceExample,now=Date.now()){
 const s=ownPartnerStatements(w).find(s=>s.id===e.statementId),p=ownPartnerProgrammes(w).find(p=>p.id===e.programmeId);
 return !!s&&!!p&&ownFinanceExamples(w).some(x=>x.id===e.id)&&partnerActive(p,now)&&p.grantVersion===e.sourceGrantVersion&&s.agreementVersion===e.sourceAgreementVersion&&p.spaceId===e.spaceId&&p.tenantKey===e.tenantKey;
}
export function financeExampleCreation(w:ProductWorld,statementId:string,input:FinanceExampleDraft,now=Date.now()){
 const s=ownPartnerStatements(w).find(s=>s.id===statementId),p=s&&ownPartnerProgrammes(w).find(p=>p.id===s.programmeId);
 if(!s||!p||!partnerActive(p,now)||p.spaceId!==s.spaceId||p.tenantKey!==s.tenantKey)throw Error('Review your current own programme and original statement before starting an illustration.');
 const v=validateFinanceExampleDraft(input),scopeSnapshot=JSON.stringify({statementId:s.id,programmeId:p.id,spaceId:s.spaceId,tenantKey:s.tenantKey,beneficiaryId:s.beneficiaryId,sourceAgreementVersion:s.agreementVersion,sourceGrantVersion:p.grantVersion});
 return {...v,statement:s,programme:p,scopeSnapshot,snapshot:JSON.stringify({scopeSnapshot,draft:v.draft,basisMinor:v.basisMinor,rateBps:v.rateBps,rounding:'ILLUSTRATION_HALF_UP_CENT_NOT_CANONICAL_POLICY'})};
}
export function financePayoutReview(w:ProductWorld,id:string,now=Date.now()){
 const e=ownFinanceExamples(w).find(e=>e.id===id);if(!e||!currentFinanceExamplePermission(w,e,now))throw Error('Current programme permission or original agreement changed. Historical examples remain separate.');
 const t=financeExampleTotals(e);
 if(e.phase!=='payable'||!financeEvidenceKeys.every(k=>e.evidence[k])||!t.remainingMinor||t.recoveryDueMinor||t.pendingPayout||t.pendingAdjustment||t.pendingRecovery)throw Error('Resolve readiness, holds and original pending outcomes before another example payout.');
 return {example:e,amountMinor:t.remainingMinor,snapshot:JSON.stringify({exampleId:e.id,version:e.version,scope:e.scopeSnapshot,beneficiaryId:e.beneficiaryId,amountMinor:t.remainingMinor,currency:'USD'})};
}
export function financePayoutStopReview(w:ProductWorld,id:string,attemptId:string,now=Date.now()){
 const e=ownFinanceExamples(w).find(e=>e.id===id),p=e?.payouts.find(p=>p.id===attemptId);
 if(!e||!p||!currentFinanceExamplePermission(w,e,now)||!['pending','unknown'].includes(p.status)||p.cancelRequestedAt||p.beneficiaryId!==e.beneficiaryId||p.scopeSnapshot!==e.scopeSnapshot)throw Error('Only the current unresolved original attempt can receive one reviewed example stop request.');
 return {example:e,attempt:p,snapshot:JSON.stringify({exampleId:e.id,version:e.version,attemptId:p.id,status:p.status,amountMinor:p.amountMinor,beneficiaryId:p.beneficiaryId,scope:p.scopeSnapshot,action:'request-stop-not-confirmed'})};
}
export function financeChuckProjection(w:ProductWorld,id:string){
 const e=ownFinanceExamples(w).find(e=>e.id===id);if(!e)return;
 const t=financeExampleTotals(e),usd=(n:number)=>`${(n/100).toFixed(2)} USD · illustration`;
 return {name:'My freely chosen commission illustration',version:e.version,programmeId:e.programmeId,expiresAt:0,fingerprint:JSON.stringify([e.id,e.version,e.scopeSnapshot]),fields:{Spot:e.spaceName,'Example booking':e.draft.bookingLabel,'Example agreement':e.draft.agreementLabel,'Illustrative basis':usd(e.basisMinor),'Freely chosen percentage':`${(e.rateBps/100).toFixed(2)}% · not an agreed rate`,'Net illustrative commission':usd(t.netCommissionMinor),'Example transfer outcome':e.payouts.map(p=>`${p.status}: ${usd(p.amountMinor)}`).join('; ')||'No example transfer prepared','Example correction due':usd(t.recoveryDueMinor),'Real source status':'Original actual amount, agreed rate and provider receipts remain unconnected.'},request:'Explain only the illustration fields I select and what the current example outcome means.'};
}
export function applyPartnerFinanceJourney(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext,now=Date.now()):{objectId:string;message:string}|null{
 if(!op.startsWith('partner.finance.preview.'))return null;
 if(!w.identity.signedIn||ctx.personId&&ctx.personId!==w.owner)throw Error('Open your own private partner statements.');
 if(d.approved!=='Yes')throw Error('Review and confirm this exact illustration action.');
 if(op==='partner.finance.preview.create'){
  const r=financeExampleCreation(w,ctx.objectId||'',JSON.parse(d.draft),now);if(r.snapshot!==d.snapshot)throw Error('Example values or original scope changed. Review again.');
  const prior=ownFinanceExamples(w).find(e=>e.draft.draftId===r.draft.draftId);if(prior){if(prior.creationSnapshot===r.snapshot)return {objectId:prior.id,message:'Opening the same illustration. No second statement or real payable.'};throw Error('Use the original saved illustration; do not replace its immutable basis or beneficiary.');}
  const e:PartnerFinanceExample={id:localPreviewId(),owner:w.owner,kind:'partner-finance-example-preview',exampleOnly:true,statementId:r.statement.id,programmeId:r.programme.id,spaceId:r.statement.spaceId,spaceName:r.statement.spaceName,tenantKey:r.statement.tenantKey,beneficiaryId:w.owner,sourceAgreementVersion:r.statement.agreementVersion,sourceGrantVersion:r.programme.grantVersion,scopeSnapshot:r.scopeSnapshot,draft:r.draft,creationSnapshot:r.snapshot,version:1,currency:'USD',basisMinor:r.basisMinor,rateBps:r.rateBps,commissionMinor:r.commissionMinor,rounding:'ILLUSTRATION_HALF_UP_CENT_NOT_CANONICAL_POLICY',phase:'estimated',holdReason:'',evidence:blankFinanceEvidence(),payouts:[],adjustments:[],recoveries:[],createdAt:now,history:[{at:now,event:'Freely chosen USD illustration saved; original statement unchanged.'}]};w.objects.push(e);return {objectId:e.id,message:'Illustration saved. Real basis, contract rate, statement, payout and wallet remain unchanged.'};
 }
 const e=ownFinanceExamples(w).find(e=>e.id===ctx.objectId);if(!e||String(e.version)!==d.version)throw Error('Open the latest original illustration.');
 const event=(text:string)=>{e.version++;e.history.push({at:now,event:text});return {objectId:e.id,message:text+' Illustration only; no real provider or financial mutation.'};};
 const current=()=>{if(!currentFinanceExamplePermission(w,e,now))throw Error('Current programme or source agreement changed. No new example action is permitted.');};
 if(op==='partner.finance.preview.evidence'){
  current();const values=JSON.parse(d.evidence);if(!values||Object.keys(values).length!==financeEvidenceKeys.length||financeEvidenceKeys.some(k=>typeof values[k]!=='boolean')||Object.keys(values).some(k=>!financeEvidenceKeys.includes(k as typeof financeEvidenceKeys[number])))throw Error('Review each independent example condition.');
  e.evidence={...values};e.phase='awaiting-review';return event('Independent illustration conditions updated; previous approval is not reused.');
 }
 if(op==='partner.finance.preview.phase'){
  current();const t=financeExampleTotals(e);
  if(d.phase==='awaiting-review'&&['estimated','held'].includes(e.phase)&&t.pendingPayout?.status!=='reconciliation-required'){e.phase='awaiting-review';e.holdReason='';}
  else if(d.phase==='approved'&&e.phase==='awaiting-review'&&financeEvidenceKeys.every(k=>e.evidence[k])&&!t.pendingAdjustment&&!t.pendingRecovery&&!t.recoveryDueMinor){e.phase='approved';}
  else if(d.phase==='payable'&&e.phase==='approved'&&financeEvidenceKeys.every(k=>e.evidence[k])&&!t.pendingAdjustment&&!t.pendingRecovery&&!t.recoveryDueMinor){e.phase='payable';}
  else if(d.phase==='held'&&['awaiting-review','approved','payable'].includes(e.phase)&&typeof d.reason==='string'&&d.reason.trim().length>=8&&d.reason.length<=1000){e.phase='held';e.holdReason=d.reason.trim();}
  else throw Error('Review conditions and the same original hold before changing this example state.');
  return event(`Example commission state: ${e.phase}.`);
 }
 if(op==='partner.finance.preview.payout.prepare'){
  const r=financePayoutReview(w,e.id,now);if(d.snapshot!==r.snapshot)throw Error('Example amount, recipient or original version changed. Review again.');
  e.payouts.push({id:localPreviewId(),amountMinor:r.amountMinor,status:'pending',beneficiaryId:e.beneficiaryId,scopeSnapshot:e.scopeSnapshot,reversedMinor:0,erpPosted:false,transferReceipt:null,bankReceipt:null,createdAt:now,approvalSnapshot:r.snapshot,cancelRequestedAt:null,cancellationReceipt:null,conflictTransferReceipt:null});return event('One example payout attempt prepared. No transfer is confirmed.');
 }
 if(op==='partner.finance.preview.payout.cancel'){
  const r=financePayoutStopReview(w,e.id,d.attemptId,now);if(r.snapshot!==d.snapshot)throw Error('The original attempt, amount or permission changed. Review the stop request again.');
  r.attempt.cancelRequestedAt=now;return event('Stop requested for the same original example attempt; its outcome remains unresolved.');
 }
 if(op==='partner.finance.preview.payout.response'){
  const p=e.payouts.find(p=>p.id===d.attemptId);if(!p||!['pending','unknown'].includes(p.status)||!['unknown','failed','transferred','cancelled'].includes(d.status)||p.beneficiaryId!==e.beneficiaryId||p.scopeSnapshot!==e.scopeSnapshot||String(p.amountMinor)!==d.amountMinor||d.status==='cancelled'&&!p.cancelRequestedAt)throw Error('Reconcile the same original example attempt, amount and frozen beneficiary.');
  p.status=d.status as ExamplePayout['status'];if(p.status==='transferred')p.transferReceipt=`example-transfer:${p.id}`;
  if(p.status==='cancelled')p.cancellationReceipt=`example-cancellation:${p.id}`;
  return event(`Same example payout outcome: ${p.status}.`);
 }
 if(op==='partner.finance.preview.payout.late-response'){
  const p=e.payouts.find(p=>p.id===d.attemptId);if(!p||p.status!=='cancelled'||!p.cancellationReceipt||p.conflictTransferReceipt||d.status!=='transferred'||p.beneficiaryId!==e.beneficiaryId||p.scopeSnapshot!==e.scopeSnapshot||String(p.amountMinor)!==d.amountMinor)throw Error('A conflicting late example must refer to the same original cancelled attempt and amount.');
  p.conflictTransferReceipt=`example-conflicting-transfer:${p.id}`;p.status='reconciliation-required';e.phase='held';e.holdReason='Conflicting cancellation and transfer evidence · reconcile the same original attempt.';
  return event('Conflicting example receipts retained. Possible transfer exposure is unresolved; no second payout or automatic refund.');
 }
 if(op==='partner.finance.preview.payout.reconcile'){
  const p=e.payouts.find(p=>p.id===d.attemptId);if(!p||p.status!=='reconciliation-required'||!p.cancellationReceipt||!p.conflictTransferReceipt||!['transferred','cancelled'].includes(d.status)||p.beneficiaryId!==e.beneficiaryId||p.scopeSnapshot!==e.scopeSnapshot||String(p.amountMinor)!==d.amountMinor)throw Error('Reconcile both original example receipts before selecting a final outcome.');
  p.status=d.status as 'transferred'|'cancelled';p.reconciliation={resolvedAs:p.status,at:now};if(p.status==='transferred')p.transferReceipt=`example-transfer:${p.id}`;
  return event(`Both original example claims retained; reconciled as ${p.status}. No new payment was requested.`);
 }
 if(op==='partner.finance.preview.payout.erp'||op==='partner.finance.preview.payout.received'){
  const p=e.payouts.find(p=>p.id===d.attemptId);if(!p||!['transferred','received'].includes(p.status)||!p.transferReceipt||String(p.amountMinor)!==d.amountMinor||p.scopeSnapshot!==e.scopeSnapshot||p.beneficiaryId!==e.beneficiaryId)throw Error('An exact original example transfer receipt is required.');
  if(op.endsWith('.erp')){if(p.erpPosted)throw Error('This example ERP receipt is already recorded.');p.erpPosted=true;return event('Example ERP acknowledgement recorded separately from bank receipt.');}
  if(p.status==='received')throw Error('This example bank receipt is already recorded.');p.status='received';p.bankReceipt=`example-bank-receipt:${p.id}`;return event('Example bank receipt recorded; ERP reconciliation remains independent.');
 }
 if(op==='partner.finance.preview.refund.prepare'){
  current();const t=financeExampleTotals(e),base=parseExampleDecimal(d.baseUSD,'Original booking refund example');if(!base||base>e.basisMinor-t.refundedBaseMinor||typeof d.reason!=='string'||d.reason.trim().length<8||d.reason.length>1000)throw Error('Review a positive refund within the remaining original booking basis and its reason.');
  if(t.pendingAdjustment)throw Error('Reconcile the same pending refund notice before another adjustment.');
  const reduction=t.netCommissionMinor-commission(e.basisMinor-t.refundedBaseMinor-base,e.rateBps);
  e.adjustments.push({id:localPreviewId(),refundBaseMinor:base,commissionReductionMinor:reduction,baseBeforeMinor:t.refundedBaseMinor,reason:d.reason.trim(),status:'pending',createdAt:now});return event('Example original-booking refund notice prepared, not confirmed.');
 }
 if(op==='partner.finance.preview.refund.response'){
  const a=e.adjustments.find(a=>a.id===d.adjustmentId),t=financeExampleTotals(e);if(!a||!['pending','unknown'].includes(a.status)||!['unknown','failed','confirmed'].includes(d.status)||String(a.refundBaseMinor)!==d.baseMinor)throw Error('Check the same original refund notice and amount.');
  if(d.status==='confirmed'&&a.baseBeforeMinor!==t.refundedBaseMinor)throw Error('The original refund basis changed; reconcile before applying this notice.');
  a.status=d.status as ReceiptState;if(a.status==='confirmed'){e.phase='held';e.holdReason='Original booking refund · review commission correction and any earlier transfer.';}
  return event(`Same example refund notice: ${a.status}.`);
 }
 if(op==='partner.finance.preview.recovery.prepare'){
  current();const t=financeExampleTotals(e),p=e.payouts.find(p=>p.id===d.attemptId);
  if(!p||!['transferred','received'].includes(p.status)||!p.transferReceipt||!t.recoveryDueMinor||t.pendingRecovery||t.pendingPayout||t.pendingAdjustment||p.amountMinor<=p.reversedMinor)throw Error('Resolve pending original outcomes and select a confirmed original transfer with a correction due.');
  e.recoveries.push({id:localPreviewId(),payoutId:p.id,amountMinor:Math.min(t.recoveryDueMinor,p.amountMinor-p.reversedMinor),beneficiaryId:p.beneficiaryId,status:'pending',receipt:null,createdAt:now});return event('One example recovery linked to the original transfer prepared; no wallet debit.');
 }
 if(op==='partner.finance.preview.recovery.response'){
  const r=e.recoveries.find(r=>r.id===d.recoveryId),p=r&&e.payouts.find(p=>p.id===r.payoutId);
  if(!r||!p||!['pending','unknown'].includes(r.status)||!['unknown','failed','confirmed'].includes(d.status)||String(r.amountMinor)!==d.amountMinor||r.beneficiaryId!==p.beneficiaryId||p.scopeSnapshot!==e.scopeSnapshot)throw Error('Reconcile the same original example reversal and beneficiary.');
  if(d.status==='confirmed'){if(r.amountMinor>financeExampleTotals(e).recoveryDueMinor||p.reversedMinor+r.amountMinor>p.amountMinor)throw Error('Correction exceeds the original overpayment or remaining transfer.');p.reversedMinor+=r.amountMinor;r.receipt=`example-reversal:${r.id}`;}
  r.status=d.status as ReceiptState;return event(`Same example commission recovery: ${r.status}.`);
 }
 throw Error('This financial illustration action is unavailable.');
}
