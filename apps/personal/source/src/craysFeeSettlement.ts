import type {ProductWorld,Entity,ActionContext,Payment,Wallet} from './productModel';
import {requireUSDCheckoutQuote,type USDCheckoutQuote} from './usdCheckout';
import {awardVotes} from './awardPreview';
import {localPreviewId} from './localPreviewId';
export type CraysFeeSource={key:string;originalId:string;kind:'payment'|'award';name:string;asset:string;amountMicros:number;state:'due'|'pending'|'adjustment-review';fingerprint:string};
export type FeeAllocation={sourceKey:string;micros:number;fingerprint:string};
export type CraysFeeStatement=Entity&{kind:'crays-fee-statement';version:number;status:'reviewed-preview'|'settled-preview'|'cancelled-preview';allocations:FeeAllocation[];totalMinor:number;currency:'USD';recipient:'CRAYS';payer:string;reviewSnapshot:string;createdAt:number;paymentId?:string;realExecution:false};
const need=(v:unknown,message:string)=>{if(!v)throw Error(message);};
function quoteValid(q:USDCheckoutQuote,owner:string,sourceId:string,recipient:string){try{return requireUSDCheckoutQuote(q,{owner,sourceId,recipient,purpose:q.purpose,offerId:q.offerId,offerVersion:q.offerVersion,walletId:q.walletId,asset:q.asset,network:q.network,usdAmount:(q.baseMinor/100).toFixed(2)})===q&&q.feeTreatment==='official-usd-v1'&&q.ecosystemCollection==='separate-usd';}catch{return false;}}
export function craysFeeSources(w:ProductWorld):CraysFeeSource[]{
 if(!w.identity.signedIn)return [];const rows:CraysFeeSource[]=[];
 for(const p of w.payments.filter(p=>p.owner===w.owner)){
  const q=p.usdQuote;if(!q||w.payments.filter(x=>x.id===p.id).length!==1||!quoteValid(q,w.owner,p.sourceId,p.recipient)||p.asset!==q.asset||p.network!==q.network||p.walletId!==q.walletId||p.purpose!==q.purpose||p.amount!==q.principal||p.fee!==q.fee||!['confirmed','refunded','pending','unknown','submitted','prepared','approved'].includes(p.status))continue;
  const state=p.status==='confirmed'?'due':p.status==='refunded'?'adjustment-review':'pending';rows.push({key:`payment:${p.id}`,originalId:p.id,kind:'payment',name:p.purpose,asset:p.asset,amountMicros:q.ecosystemMicros,state,fingerprint:JSON.stringify({owner:p.owner,id:p.id,sourceId:p.sourceId,reference:p.reference,status:p.status,quote:q})});
 }
 for(const v of awardVotes(w)){
  const q=v.checkout;if(!q||!quoteValid(q,w.owner,v.campaignId,v.creatorId)||!['confirmed-demo','refunded-demo','prepared','unknown'].includes(v.status))continue;
  rows.push({key:`award:${v.id}`,originalId:v.id,kind:'award',name:`${v.quantity} Props ${v.quantity===1?'vote':'votes'}`,asset:q.asset,amountMicros:q.ecosystemMicros,state:v.status==='confirmed-demo'?'due':v.status==='refunded-demo'?'adjustment-review':'pending',fingerprint:JSON.stringify({owner:w.owner,id:v.id,campaignId:v.campaignId,status:v.status,quote:q})});
 }
 return rows;
}
export function craysFeeStatements(w:ProductWorld){return w.identity.signedIn?w.objects.filter(o=>o.owner===w.owner&&o.kind==='crays-fee-statement'&&craysFeeStatementFor(w,o.id)===o) as CraysFeeStatement[]:[];}
export function craysFeeStatementFor(w:ProductWorld,id:string){
 if(!w.identity.signedIn)return;const rows=w.objects.filter(o=>o.id===id);if(rows.length!==1||rows[0].owner!==w.owner||rows[0].kind!=='crays-fee-statement')return;const r=rows[0] as CraysFeeStatement;
 if(!Number.isSafeInteger(r.version)||r.version<1||!['reviewed-preview','settled-preview','cancelled-preview'].includes(r.status)||r.currency!=='USD'||r.recipient!=='CRAYS'||r.payer!==w.owner||!Number.isSafeInteger(r.totalMinor)||r.totalMinor<50||!Array.isArray(r.allocations)||!r.allocations.length||r.allocations.length>1000||r.allocations.some(a=>!a||typeof a.sourceKey!=='string'||typeof a.fingerprint!=='string'||!Number.isSafeInteger(a.micros)||a.micros<=0)||new Set(r.allocations.map(a=>a.sourceKey)).size!==r.allocations.length||r.allocations.reduce((n,a)=>n+a.micros,0)!==r.totalMinor*10000||r.reviewSnapshot!==JSON.stringify({payer:r.payer,recipient:r.recipient,currency:r.currency,totalMinor:r.totalMinor,allocations:r.allocations}))return;
 return r;
}
export function craysFeeBalance(w:ProductWorld){
 const sources=craysFeeSources(w),all=w.objects.filter(o=>o.owner===w.owner&&o.kind==='crays-fee-statement'),statements=craysFeeStatements(w);
 need(all.length===statements.length,'A fee statement needs source review before another settlement can be prepared.');
 const allocations=new Map<string,number>();for(const r of statements.filter(r=>r.status!=='cancelled-preview'))for(const a of r.allocations)allocations.set(a.sourceKey,(allocations.get(a.sourceKey)||0)+a.micros);
 const rows=sources.map(s=>{const used=allocations.get(s.key)||0;need(used<=s.amountMicros,'Resolve overlapping fee allocations before preparing another payment.');return {...s,allocatedMicros:used,remainingMicros:s.state==='due'?s.amountMicros-used:0};});
 for(const key of allocations.keys())need(sources.some(s=>s.key===key),'An original fee source is unavailable. Review its previous statement first.');
 const dueMicros=rows.reduce((n,s)=>n+s.remainingMicros,0),chargeMinor=Math.floor(dueMicros/10000),carryMicros=dueMicros-chargeMinor*10000;
 const take:FeeAllocation[]=[];let remaining=chargeMinor*10000;for(const s of rows){const amount=Math.min(remaining,s.remainingMicros);if(amount>0){take.push({sourceKey:s.key,micros:amount,fingerprint:s.fingerprint});remaining-=amount;}}
 const snapshot=JSON.stringify({payer:w.owner,recipient:'CRAYS',currency:'USD',totalMinor:chargeMinor,allocations:take});return {sources:rows,statements,dueMicros,chargeMinor,carryMicros,allocations:take,snapshot,canPrepare:chargeMinor>=50&&take.length<=1000};
}
function currentStatement(w:ProductWorld,r:CraysFeeStatement){
 need(r.status==='reviewed-preview','This fee statement is already settled or cancelled.');const sources=craysFeeSources(w);for(const a of r.allocations){const s=sources.find(s=>s.key===a.sourceKey);need(s&&s.state==='due'&&s.fingerprint===a.fingerprint,'An original payment changed, was refunded or became unavailable. Review this fee statement before paying.');}
 craysFeeBalance(w);
}
export function requireCraysFeePayment(w:ProductWorld,sourceId:string,data:{recipient:string;purpose:string;amount:string},wallet:Pick<Wallet,'asset'|'network'>,existing?:Payment){
 const relevant=w.objects.some(o=>o.id===sourceId&&o.kind==='crays-fee-statement')||data.purpose==='CRAYS ecosystem fees';if(!relevant)return;
 if(existing)need(existing.owner===w.owner&&w.payments.filter(p=>p.id===existing.id).length===1,'Resolve the exact unique original payment before settling this statement.');
 const r=craysFeeStatementFor(w,sourceId);need(r,'Open your exact original USD fee statement.');currentStatement(w,r!);
 need(data.recipient==='CRAYS'&&data.purpose==='CRAYS ecosystem fees'&&wallet.asset==='USD'&&wallet.network==='Stripe · USD'&&Number(data.amount)===r!.totalMinor/100,'The fee payment must match this exact USD statement and CRAYS beneficiary.');
 const attempts=w.payments.filter(p=>p.owner===w.owner&&p.sourceId===r!.id&&p.id!==existing?.id&&['prepared','approved','pending','submitted','unknown','confirmed'].includes(p.status));need(!attempts.length,'This statement already has a payment attempt. Reconcile that original instead of paying again.');return r;
}
export function applyCraysFeeSettlement(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('crays.fees.'))return;need(w.identity.signedIn,'Sign in to your own fee statement.');
 if(op==='crays.fees.review'){
  const b=craysFeeBalance(w);need(b.canPrepare,'Small USD fractions carry forward. A new Stripe example needs at least 0.50 USD in whole cents; nothing is rounded up.');need(data.approved==='Yes'&&data.snapshot===b.snapshot,'Review the exact current fee sources and USD amount.');
  const r:CraysFeeStatement={id:localPreviewId(),owner:w.owner,kind:'crays-fee-statement',version:1,status:'reviewed-preview',allocations:b.allocations,totalMinor:b.chargeMinor,currency:'USD',recipient:'CRAYS',payer:w.owner,reviewSnapshot:b.snapshot,createdAt:Date.now(),realExecution:false};w.objects.push(r);return {objectId:r.id,message:'The exact USD fee settlement is ready. Source payments and content rights are unchanged; no money sent.'};
 }
 const r=craysFeeStatementFor(w,ctx.objectId||'');need(r,'Open your own exact USD fee statement.');need(data.expectedVersion===String(r!.version),'This statement changed. Review the current original.');
 if(op==='crays.fees.cancel'){
  need(r!.status==='reviewed-preview'&&data.approved==='Yes','Review cancellation of this exact unsettled statement.');need(!w.payments.some(p=>p.owner===w.owner&&p.sourceId===r!.id&&['submitted','pending','unknown','confirmed'].includes(p.status)),'Resolve the existing payment outcome before cancelling this statement.');r!.status='cancelled-preview';r!.version++;return {objectId:r!.id,message:'This unsettled statement is cancelled. Its source amounts carry forward; an unsubmitted old attempt cannot be sent.'};
 }
 if(op==='crays.fees.apply'){
  const payment=w.payments.find(p=>p.id===data.paymentId&&p.owner===w.owner);if(r!.status==='settled-preview'){need(r!.paymentId===payment?.id,'Open the already applied original payment.');return {objectId:r!.id,message:'This original fee payment is already applied. Nothing was billed twice.'};}
  need(payment&&payment.status==='confirmed','Confirmed original USD payment is required.');requireCraysFeePayment(w,r!.id,payment!,{asset:payment!.asset,network:payment!.network},payment!);r!.paymentId=payment!.id;r!.status='settled-preview';r!.version++;return {objectId:r!.id,message:'The same confirmed USD payment is linked to these exact fee allocations. Remaining fractions carry forward; no crypto was collected for CRAYS.'};
 }
 throw Error('Choose an available USD fee settlement action.');
}
