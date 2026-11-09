import {venueSetupGates} from './venueSetup';
import {localPreviewId} from "./localPreviewId.ts";
import { canonicalAgentTaskRef, canonicalTaskUsage, requireAgentBillingPurpose, agentRequestFingerprint } from "./taskOriginals.ts";
import previousUSDCatalog from './craysPlanCatalogUSD.json' with { type: 'json' };
import rawCatalog from './craysPlanCatalogStorageUSD.json' with { type: 'json' };
import legacyCatalog from './craysPlanCatalog.json' with { type: 'json' };
import type { ProductWorld, Entity, ActionContext, Payment, Wallet } from './productModel.ts';
export const planCatalog = rawCatalog;
export type CraysPlan = typeof planCatalog[number];
export const planById = (id: string) => planCatalog.find(p => p.id === id);
export const planForReview=(r:Entity)=>[...planCatalog,...previousUSDCatalog,...legacyCatalog].find(p=>p.id===r.planId&&p.pricingVersion===r.pricingVersion&&p.sourceHash===r.sourceHash);
export const creditPacksUSD=[{credits:100,gross:5.99},{credits:1000,gross:49.99},{credits:3000,gross:149.99}];
const creditVersion='credits-usd-proposal-2026-10-20-v2';
function creditTerms(version:unknown,count:number){
 if(version===creditVersion)return {currency:'USD',gross:creditPacksUSD.find(p=>p.credits===count)?.gross};
 if(version==='credits-proposal-2026-10-18-v1')return {currency:'EUR',gross:({100:4.99,1000:39.99,3000:119.99} as Record<number,number>)[count]};
 return undefined;
}
function need(ok: unknown, text: string): asserts ok { if (!ok) throw Error(text); }
const uid = () => localPreviewId();
const now = () => Date.now();
const amount = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const own = (w: ProductWorld, id: string, kind?: string) => {if(!w.identity.signedIn||typeof id!=='string'||!id)return undefined;const matches=w.objects.filter(o=>o.id===id);return matches.length===1&&matches[0].owner===w.owner&&(!kind||matches[0].kind===kind)?matches[0]:undefined;};
export function ownPlanContracts(w: ProductWorld) { return w.identity.signedIn?w.objects.filter(o => o.kind === 'crays-plan-contract' && o.owner === w.owner && typeof o.id==='string' && o.id.length>0 && w.objects.filter(other=>other.id===o.id).length===1):[]; }
export function planContractActive(o: Entity, at = now()) { return o.kind === 'crays-plan-contract' && o.status === 'active-preview' && Number(o.currentPeriodStart) <= at && Number(o.currentPeriodEnd) > at; }
export function planReview(w: ProductWorld, id: string) { return w.identity.signedIn?own(w, id, 'crays-plan-review'):undefined; }
function monthsAfter(at: number, months: number) { const d = new Date(at), day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+months); d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate())); return +d; }
function scopeCheck(w: ProductWorld, plan: Pick<CraysPlan,'segment'>, scopeId: string) {
 if (plan.segment === 'guest') need(scopeId === w.owner,'Personal membership must belong to your own profile.');
 if (plan.segment === 'creator') need(scopeId === w.owner || !!own(w,scopeId,'creator-profile'),'Choose your own Creator profile.');
 if (plan.segment === 'venue') need(!!own(w,scopeId,'venue-setup'),'Save your own venue setup first.');
}
function quote(p: CraysPlan|typeof legacyCatalog[number], period: string, relayMode: string, setupMode='self-service') {
 need(['monthly','annual'].includes(period),'Choose monthly or annual explicitly.');
 need(p.segment === 'venue' ? ['managed','byo'].includes(relayMode) : relayMode === 'managed','Choose a valid relay option.');
 const o=p.relayCommercialOptions as Record<string,number>;
 const usd='monthlyNetUsd' in p,field=(usdKey:string,legacyKey:string)=>Number((p as unknown as Record<string,unknown>)[usd?usdKey:legacyKey]);
 need(['self-service','assisted'].includes(setupMode)&& (setupMode==='self-service'||p.segment==='venue'),'Choose an available setup service.');
 const recurringNet=amount(p.segment === 'venue' && relayMode === 'byo' ? o[period==='annual'?(usd?'BYOAnnualNetUsd':'BYOAnnualNetEur'):(usd?'BYOTotalNetUsd':'BYOTotalNetEur')] : period==='annual'?field('annualNetUsd','annualNetEur'):field('monthlyNetUsd','monthlyNetEur'));
 // This proposal has only an explicitly labelled German19% preview, not a global tax calculator.
 const setupNet=setupMode==='assisted'?field('assistedSetupNetUsd','assistedSetupNetEur'):0;const net=amount(recurringNet+setupNet);
 const gross=p.segment==='guest'?(period==='annual'?field('annualGrossDE19Usd','annualGrossDE19Eur'):field('monthlyGrossDE19Usd','monthlyGrossDE19Eur')):amount(net*1.19);
 return { priceNet:net,recurringNet,setupNet,tax:amount(gross-net),gross,taxRate:.19,currency:usd?'USD':'EUR' };
}
function requireReview(w: ProductWorld, id: string) {
 const r=planReview(w,id);need(r,'Open your exact plan review.');
 need(r.status==='reviewed' || r.status==='applied','This review was cancelled or changed.');
 if(r.type==='credits') { const contract=own(w,String(r.contractId),'crays-plan-contract');need(contract&&planContractActive(contract)&&r.payer===w.owner&&r.scopeId===contract.serviceScopeId,'Credit quote no longer belongs to an active authorised membership.');need([100,1000,3000].includes(Number(r.credits)),'Unknown credit package.'); const terms=creditTerms(r.pricingVersion,Number(r.credits));need(terms&&r.gross===terms.gross&&r.currency===terms.currency&&r.seller==='CRAYS','The exact credit quote changed.'); }
 else { const p=planForReview(r);need(p&&p.pricingVersion===r.pricingVersion&&p.sourceHash===r.sourceHash,'Pricing version changed; review again.');scopeCheck(w,p,String(r.scopeId));if(p.segment==='venue'){const setup=own(w,String(r.scopeId),'venue-setup')!;need(setup.version===r.scopeVersion&&JSON.stringify(setup.config)===r.scopeFingerprint,'Venue configuration changed; review the exact scope again.');}const q=quote(p,String(r.period),String(r.relayMode),String(r.setupMode||'self-service'));need(Object.entries(q).every(([k,v])=>r[k]===v)&&r.seller==='CRAYS'&&r.payer===w.owner&&r.segment===p.segment&&JSON.stringify(r.allowances)===JSON.stringify(p.allowances),'Exact plan price, payer or allowances changed.'); }
 return r;
}
export function requireCraysPayment(w: ProductWorld, sourceId: string, data: {purpose:string;recipient:string;amount:string}, wallet: Pick<Wallet,'asset'>, existing?: Payment) {
 const source=own(w,sourceId);const relevant=source?.kind==='crays-plan-review'||!!existing?.planReviewId||['CRAYS membership','Chuck credits'].includes(data.purpose);
 if(!relevant)return undefined;
 const r=requireReview(w,sourceId);need(r.status==='reviewed','This review has already been applied.');
 if(r.currency!=='USD'||(r.type!=='credits'&&planById(String(r.planId))?.pricingVersion!==r.pricingVersion))need(existing&&['submitted','pending','unknown','confirmed'].includes(existing.status),'This historical review cannot start a new payment. Review a current USD offer; the original record is retained.');
 const purpose=r.type==='credits'?'Chuck credits':'CRAYS membership';
 need(data.purpose===purpose&&data.recipient==='CRAYS'&&wallet.asset===r.currency&&Number(data.amount)===Number(r.gross),'Payment must match this exact CRAYS quote, original currency total and seller.');
 if(existing)need(existing.planReviewId===r.id&&existing.planPricingVersion===r.pricingVersion,'Payment review/version changed.');
 const competing=w.payments.find(p=>p.owner===w.owner&&p.id!==existing?.id&&['prepared','approved','submitted','pending','unknown','confirmed'].includes(p.status)&&w.objects.some(x=>x.id===p.sourceId&&x.kind==='crays-plan-review'&&x.owner===w.owner&&(x.id===r.id||(r.type!=='credits'&&x.segment===r.segment&&x.scopeId===r.scopeId&&x.status!=='cancelled'&&!x.appliedContractId))));
 need(!competing,'This quote or scope already has a payment attempt. Open its original status; do not pay twice.');
 return r;
}
/** Purchased credit capacity is derived from one confirmed exact quote/payment, never an arbitrary entity. */
function purchasedCreditGrants(w: ProductWorld) {
 const usedPayments=new Set<string>();
 return w.objects.filter(g=>{
  if(g.kind!=='crays-credit-grant'||g.owner!==w.owner||g.status!=='active-preview')return false;
  const review=own(w,String(g.reviewId),'crays-plan-review'),contract=own(w,String(g.contractId),'crays-plan-contract');
  const payment=w.payments.find(p=>p.id===g.paymentId&&p.owner===w.owner&&p.status==='confirmed');
  if(!review||!contract||!payment||review.type!=='credits'||review.status!=='applied'||review.appliedContractId!==contract.id||review.contractId!==contract.id||review.payer!==w.owner||review.scopeId!==contract.serviceScopeId||review.segment!==contract.segment)return false;
  const credits=Number(review.credits),terms=creditTerms(review.pricingVersion,credits),gross=terms?.gross;
  if(!Number.isFinite(gross)||Number(g.credits)!==credits||review.gross!==gross||review.currency!==terms?.currency||review.seller!=='CRAYS')return false;
  if(payment.sourceId!==review.id||payment.planReviewId!==review.id||payment.planPricingVersion!==review.pricingVersion||payment.purpose!=='Chuck credits'||payment.asset!==review.currency||payment.recipient!=='CRAYS'||Number(payment.amount)!==gross)return false;
  if(!w.objects.some(a=>a.kind==='crays-plan-payment'&&a.owner===w.owner&&a.paymentId===payment.id&&a.reviewId===review.id&&a.contractId===contract.id))return false;
  if(usedPayments.has(payment.id))return false;
  usedPayments.add(payment.id);return true;
 });
}
export function planUsage(w: ProductWorld, contractId: string) {
 if(!w.identity.signedIn)return undefined;
 const c=own(w,contractId,'crays-plan-contract');if(!c)return undefined;
 const allowance=(c.allowances as {aiUnits?:unknown}|undefined)?.aiUnits;
 if(typeof allowance!=='number'||!Number.isFinite(allowance)||allowance<0||!Number.isFinite(Number(c.currentPeriodStart))||!Number.isFinite(Number(c.currentPeriodEnd))||!Number.isFinite(+new Date(Number(c.currentPeriodStart)))||!Number.isFinite(+new Date(Number(c.currentPeriodEnd)))||Number(c.currentPeriodEnd)<=Number(c.currentPeriodStart))return undefined;
 // Monthly quota anniversary, clamped to month-end, even for annual subscriptions.
 let start=Number(c.currentPeriodStart), next=monthsAfter(start,1);while(next<=now()&&next<Number(c.currentPeriodEnd)){start=next;next=monthsAfter(Number(c.currentPeriodStart),Math.round((new Date(start).getUTCFullYear()-new Date(Number(c.currentPeriodStart)).getUTCFullYear())*12+new Date(start).getUTCMonth()-new Date(Number(c.currentPeriodStart)).getUTCMonth())+1);}
 const entries=w.objects.filter(o=>o.kind==='crays-usage'&&o.owner===w.owner&&o.contractId===c.id&&o.periodStart===start);
 const reserved=entries.reduce((s,o)=>s+(o.status==='reserved'?Number(o.credits):0),0),captured=entries.reduce((s,o)=>s+(o.status==='captured'?Number(o.actualCredits):0),0);
 const scopeContracts=ownPlanContracts(w).filter(o=>o.segment===c.segment&&o.serviceScopeId===c.serviceScopeId);
 const scopeIds=new Set(scopeContracts.map(o=>o.id));
 const topups=purchasedCreditGrants(w).filter(o=>scopeIds.has(String(o.contractId))).reduce((s,o)=>s+Number(o.credits),0);
 // Purchased credits belong to the same authorised payer/scope and survive renewals; no invented expiry.
 const previous=w.objects.filter(o=>o.kind==='crays-usage'&&o.owner===w.owner&&scopeIds.has(String(o.contractId))&&(o.contractId!==c.id||Number(o.periodStart)<start)&&['reserved','captured'].includes(String(o.status)));
 const groups=new Set(previous.map(o=>`${o.contractId}|${o.periodStart}`));
 const previousTopupUsed=[...groups].reduce((total,key)=>{const values=previous.filter(o=>`${o.contractId}|${o.periodStart}`===key);const original=scopeContracts.find(o=>o.id===values[0].contractId)!;const included=(original.allowances as {aiUnits:number}).aiUnits;return total+Math.max(0,values.reduce((sum,o)=>sum+Number(o.status==='reserved'?o.credits:o.actualCredits),0)-included);},0);
 const available=allowance+Math.max(0,topups-previousTopupUsed);const used=reserved+captured;
 return {contractId,periodStart:start,periodEnd:Math.min(next,Number(c.currentPeriodEnd)),included:allowance,topup:Math.max(0,topups-previousTopupUsed),reserved,captured,remaining:Math.max(0,available-used),warning:used>=available?'100':used>=available*.9?'90':used>=available*.7?'70':'none',active:planContractActive(c)};
}
export function applyCraysPlan(w: ProductWorld, op: string, d: Record<string,string>, ctx: ActionContext) {
 if(!op.startsWith('complete.plan.'))return;
 need(w.identity.signedIn,'Sign in before managing your own membership.');
 let objectId='';const create=(fields:Record<string,unknown>)=>{const o={id:uid(),owner:w.owner,...fields} as Entity;w.objects.unshift(o);return o;};
 if(op==='complete.plan.review'||op==='complete.plan.renew.review') {
  const p=planById(d.planId);need(p,'Choose a current proposed plan.');const scopeId=d.scopeId||w.owner;scopeCheck(w,p,scopeId);if(p.segment==='venue'&&!d.changeOf){const setup=own(w,scopeId,'venue-setup')!,gates=venueSetupGates(w,setup);need(gates.configuration&&gates.relay,'Complete this Spot’s configuration review and relay check before the final payment step.');}
  need(['Yes','No'].includes(d.autoRenew),'Choose auto-renew explicitly.');need(d.taxRate==='19','This preview only quotes the explicit German19% example.');need(!d.payer||d.payer==='own'||d.payer===w.owner,'Choose your own authorised payer.');
  const previous=d.changeOf?own(w,d.changeOf,'crays-plan-contract'):undefined;
  if(d.changeOf)need(previous&&previous.segment===p.segment&&previous.serviceScopeId===scopeId&&previous.status==='active-preview','Review your exact existing scope contract.');
  const active=ownPlanContracts(w).find(o=>o.segment===p.segment&&o.serviceScopeId===scopeId&&planContractActive(o));need(!active||previous?.id===active.id,'Open your existing membership to renew or change it.');
  need(!previous||!ownPlanContracts(w).some(o=>o.changeOf===previous.id&&o.status==='active-preview'),'A next-period plan already exists.');
  need(!d.displayBadge||['Yes','No'].includes(d.displayBadge),'Choose public badge visibility explicitly.');const setup=p.segment==='venue'?own(w,scopeId,'venue-setup'):undefined;
  const relayMode=p.segment==='venue'?d.relayMode:'managed';const q=quote(p,d.period,relayMode,d.setupMode||'self-service');
  const r=create({kind:'crays-plan-review',type:'membership',status:'reviewed',planId:p.id,segment:p.segment,scopeId,serviceScopeId:scopeId,payer:w.owner,seller:'CRAYS',pricingVersion:p.pricingVersion,sourceHash:p.sourceHash,period:d.period,relayMode,setupMode:d.setupMode||'self-service',autoRenew:d.autoRenew==='Yes',allowances:structuredClone(p.allowances),...q,changeOf:previous?.id,previousPeriodEnd:previous?.currentPeriodEnd,createdAt:now(),pricingProposal:true,displayBadge:d.displayBadge==='Yes',scopeVersion:setup?.version,scopeFingerprint:setup?JSON.stringify(setup.config):undefined});objectId=r.id;
 } else if(op==='complete.plan.credits.review') {
  const c=own(w,ctx.objectId||'','crays-plan-contract');need(c&&planContractActive(c),'Choose your active membership for these prepaid credits.');const credits=Number(d.credits);need([100,1000,3000].includes(credits),'Choose an exact credit package.');const gross=creditPacksUSD.find(p=>p.credits===credits)!.gross;
  objectId=create({kind:'crays-plan-review',type:'credits',status:'reviewed',contractId:c.id,scopeId:c.serviceScopeId,segment:c.segment,credits,payer:w.owner,seller:'CRAYS',gross,priceNet:amount(gross/1.19),tax:amount(gross-gross/1.19),taxRate:.19,currency:'USD',pricingVersion:creditVersion,autoRenew:false,createdAt:now(),pricingProposal:true}).id;
 } else if(op==='complete.plan.review.cancel') {
  const r=requireReview(w,ctx.objectId||'');need(r.status==='reviewed','Already applied review cannot be cancelled.');need(!w.payments.some(p=>p.sourceId===r.id&&['pending','unknown','submitted','confirmed'].includes(p.status)),'Resolve the original payment before cancelling its review.');r.status='cancelled';objectId=r.id;
 } else if(op==='complete.plan.activate'||op==='complete.plan.credits.apply') {
  const r=requireReview(w,ctx.objectId||'');const payment=w.payments.find(p=>p.id===d.paymentId&&p.owner===w.owner);need(payment&&payment.status==='confirmed','Confirmed original payment is required.');
  need(payment.sourceId===r.id&&payment.planReviewId===r.id&&payment.planPricingVersion===r.pricingVersion&&payment.recipient==='CRAYS'&&payment.asset===r.currency&&Number(payment.amount)===Number(r.gross)&&payment.purpose===(r.type==='credits'?'Chuck credits':'CRAYS membership'),'Payment must match the same exact quote and version.');
  const applied=w.objects.find(o=>o.kind==='crays-plan-payment'&&o.owner===w.owner&&o.paymentId===payment.id);if(applied)return {objectId:String(applied.contractId),message:'The original payment is already applied; no duplicate contract or credits.'};
  need(r.status==='reviewed','Review already used.');
  if(r.type==='credits') { const c=own(w,String(r.contractId),'crays-plan-contract');need(c&&planContractActive(c),'This membership is no longer active; resolve the original paid quote without another payment.');create({kind:'crays-credit-grant',contractId:c.id,credits:r.credits,status:'active-preview',paymentId:payment.id,reviewId:r.id,expiresAt:null});objectId=c.id; }
  else {const p=planForReview(r)!;const previous=r.changeOf?own(w,String(r.changeOf),'crays-plan-contract'):undefined;if(r.changeOf)need(previous&&previous.currentPeriodEnd===r.previousPeriodEnd&&previous.status==='active-preview','Original membership period changed; resolve this payment without a second transfer.');need(!ownPlanContracts(w).some(o=>o.segment===p.segment&&o.serviceScopeId===r.scopeId&&planContractActive(o)&&o.id!==previous?.id),'An active contract already covers this exact scope.');const start=previous?Math.max(now(),Number(previous.currentPeriodEnd)):now();const c=create({kind:'crays-plan-contract',status:'active-preview',segment:p.segment,planId:p.id,name:p.name,badgeId:p.badgeId,pricingVersion:p.pricingVersion,sourceHash:p.sourceHash,serviceScopeId:r.scopeId,period:r.period,relayMode:r.relayMode,setupMode:r.setupMode,setupNet:r.setupNet,recurringNet:r.recurringNet,payer:r.payer,autoRenew:r.autoRenew,cancelAtTerm:false,currentPeriodStart:start,currentPeriodEnd:monthsAfter(start,r.period==='annual'?12:1),allowances:structuredClone(p.allowances),reviewId:r.id,paymentId:payment.id,changeOf:previous?.id,pricingProposal:true,displayBadge:r.displayBadge===true});objectId=c.id;
   if(p.segment==='venue'){const s=own(w,String(r.scopeId),'venue-setup')!;create({kind:'venue-entitlement',setupId:s.id,organisation:(s.config as Record<string,unknown>).organisation,status:'active-demo',verifiedForPreview:true,contractId:c.id});}
   const award=create({kind:'badge-award',personId:p.segment==='guest'?w.owner:String(r.scopeId),publisherId:p.segment==='venue'?String(r.scopeId):undefined,purchaserId:w.owner,segment:p.segment,badgeId:p.badgeId,name:p.badgeName,status:'issued-demo',contractId:c.id,startsAt:start,endsAt:c.currentPeriodEnd,displayPublic:r.displayBadge===true,pricingProposal:true});
   if(p.segment==='creator')create({kind:'creator-entitlement',personId:w.owner,badgeAwardId:award.id,status:'active',contractId:c.id,startsAt:start,endsAt:c.currentPeriodEnd,additionalPlan:true});
  }
  create({kind:'crays-plan-payment',paymentId:payment.id,reviewId:r.id,contractId:objectId});r.status='applied';r.appliedContractId=objectId;
 } else if(op==='complete.plan.badge.visibility') {
  const c=own(w,ctx.objectId||'','crays-plan-contract');need(c,'Choose your own membership.');need(d.approved==='Yes'&&['Yes','No'].includes(d.displayBadge),'Explicitly approve showing or hiding this membership badge.');c.displayBadge=d.displayBadge==='Yes';w.objects.filter(o=>o.kind==='badge-award'&&o.owner===w.owner&&o.contractId===c.id).forEach(o=>o.displayPublic=d.displayBadge==='Yes');objectId=c.id;
 } else if(op==='complete.plan.cancel') {
  const c=own(w,ctx.objectId||'','crays-plan-contract');need(c,'Choose your own membership.');need(d.approved==='Yes','Confirm cancellation at the displayed term end.');c.autoRenew=false;c.cancelAtTerm=true;objectId=c.id;
 } else if(['complete.plan.reserve','complete.plan.capture','complete.plan.release'].includes(op)) {
  const c=own(w,ctx.objectId||'','crays-plan-contract');need(c,'Choose your own membership.');if(op!=='complete.plan.release')need(planContractActive(c),'This membership has ended or has not started; no new billed work.');need(d.taskId,'Choose the exact task.');
  const original=canonicalAgentTaskRef(w,d.taskId),task=original.task;
  if(op!=='complete.plan.release') { requireAgentBillingPurpose(original);need(!['forbidden','blocked','cancelled','revoked','stopped','paused'].includes(String(task.status)),'This task is not permitted to start or capture billed work.'); }
  const taskUsage=canonicalTaskUsage(w,original);
  const costReview=d.costReviewId?own(w,d.costReviewId,'chuck-cost-review'):undefined;
  if(op!=='complete.plan.release' && (task.aiExecutionRequested===true || d.costReviewId)) {
    need(costReview&&costReview.taskId===task.id&&costReview.contractId===c.id&&costReview.canonicalTaskKey===original.canonicalKey&&
      costReview.requestRevision===task.aiRequestRevision&&costReview.requestMessageId===task.aiRequestMessageId&&costReview.requestFingerprint===agentRequestFingerprint(task)&&
      task.aiExecutionApprovalReviewId===costReview.id&&task.aiExecutionApprovedRevision===task.aiRequestRevision&&task.aiExecutionApprovedMessageId===task.aiRequestMessageId&&
      ['reviewed','approved'].includes(String(costReview.status)),'Approve the exact current task revision, payer and cost review first.');
  }
  if(costReview && op!=='complete.plan.release') {
    need(c.segment==='guest'&&c.serviceScopeId===w.owner,'This personal extra-work review requires your own personal allowance.');
    need(costReview.contractFingerprint===JSON.stringify([c.id,c.owner,c.planId,c.segment,c.serviceScopeId,c.pricingVersion,c.currentPeriodStart,c.currentPeriodEnd,c.allowances]),'This exact payer or membership changed. Review again.');
    if(op==='complete.plan.reserve')need(Number(d.credits)===Number(costReview.maxCredits),'Reserve exactly the maximum in this cost review.');
  }
  const reservations=taskUsage.filter(o=>o.status==='reserved');
  const releaseChoices=op==='complete.plan.release'?reservations.filter(o=>o.contractId===c.id&&(!d.reservationId||o.id===d.reservationId)):reservations;
  need(releaseChoices.length<=1,op==='complete.plan.release'?'Choose the exact historical reservation to release.':'Multiple historical reservations require reconciliation before another change.');
  const entry=releaseChoices[0],u=planUsage(w,c.id)!;
  if(op==='complete.plan.reserve') {need(d.approved==='Yes'&&d.permitted==='Yes','Only explicitly approved and permitted work may reserve credits.');const credits=Number(d.credits);need(Number.isFinite(credits)&&credits>0&&Number.isInteger(credits*10),'Choose a positive maximum in tenths of a credit.');need(!taskUsage.some(o=>o.status==='reserved'||(o.status==='captured'&&(!costReview||!o.executionKey||o.executionKey===costReview.executionKey))),'This original execution already has a payer reservation or capture.');need(credits<=planUsage(w,c.id)!.remaining,'Allowance exhausted; review a prepaid top-up or upgrade first.');objectId=create({kind:'crays-usage',contractId:c.id,taskId:task.id,taskOrigin:original.origin,canonicalTaskKey:original.canonicalKey,sourceAliasId:d.taskId,costReviewId:costReview?.id,executionKey:costReview?.executionKey,aiRequestRevision:costReview?.requestRevision,aiRequestMessageId:costReview?.requestMessageId,payer:w.owner,periodStart:u.periodStart,credits,status:'reserved',approved:true,permitted:true}).id;}
  else {need(entry&&entry.contractId===c.id&&entry.payer===w.owner,'Open this task’s original payer reservation.');if(op==='complete.plan.release'){entry.status='released';entry.actualCredits=0;}else {need(d.approved==='Yes'&&d.permitted==='Yes','Unapproved or forbidden work cannot be billed.');if(costReview){const receipt=own(w,d.receiptId||'','chuck-usage-receipt');need(entry.costReviewId===costReview.id&&entry.executionKey===costReview.executionKey&&receipt&&receipt.id===costReview.receiptId&&receipt.costReviewId===costReview.id&&receipt.reservationId===entry.id&&receipt.taskId===task.id&&receipt.executionKey===entry.executionKey&&receipt.requestRevision===task.aiRequestRevision&&receipt.source==='synthetic-fixture'&&receipt.status==='known-preview'&&Number(receipt.chargedCredits)===Number(d.credits),'The exact simulated usage receipt and approved original run are required.');}
const actual=Number(d.credits);need(Number.isFinite(actual)&&actual>=0&&Number.isInteger(actual*10)&&actual<=Number(entry.credits),'Actual cost cannot exceed the approved reservation.');entry.status='captured';entry.actualCredits=actual;}objectId=entry.id;}
 } else throw Error('This membership action is unavailable.');
 return {objectId,message:op.includes('review')?'Exact proposed terms saved for review. No payment or rights issued.':op.includes('cancel')?'Renewal cancelled at term end; current rights and separate Lifetime badges remain.':'Original preview state updated. No real payment, provisioning or messages.'};
}
