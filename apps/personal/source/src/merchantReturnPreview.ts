import {isGroceryVenue,groceryPaidUnitMinor} from './groceryCommerce.ts';
import {isMerchantExampleVenue} from './merchantExampleScope.ts';
import type {ProductWorld,Payment,ActionContext} from './productModel.ts';
import {ownMerchantCheckout} from './merchantCheckout.ts';
import {merchantUSDMinor} from './merchantPaymentCosts.ts';
import {calculateMerchantReturnAllocation,merchantReturnAllocationAtRecord,merchantReturnAllocationSource,prepareMerchantReturnCorrections,updateMerchantReturnCorrection,type MerchantReturnAllocation,type MerchantReturnCorrectionExample,type ReturnCorrectionComponent} from './merchantReturnAllocation.ts';
import {localPreviewId} from './localPreviewId.ts';
export type MerchantReturnLine={key:string;name:string;variant:string;purchased:number;quantity:number;unitMinor:number;amountMinor:number};
export type MerchantReturnPreview={id:string;owner:string;paymentId:string;orderId:string;venueId:string;sellerName:string;snapshot:string;lines:MerchantReturnLine[];amountMinor:number;reason:string;note:string;state:'draft'|'requested'|'unknown'|'accepted'|'declined'|'returned';revision:number;createdAt:number;refund?:{id:string;state:'requested'|'unknown'|'declined'|'confirmed';amountMinor:number;createdAt:number};allocation?:MerchantReturnAllocation;corrections?:MerchantReturnCorrectionExample;events:{key:string;operation:string;payload:string;at:number}[];liveExecution:false};
type CheckoutWithReturns=NonNullable<Payment['merchantCheckout']>&{returns?:MerchantReturnPreview[]};
function need(v:unknown,m:string):asserts v{if(!v)throw Error(m);}
export function merchantReturnRecords(p:Payment){const records=(p.merchantCheckout as CheckoutWithReturns|undefined)?.returns;return Array.isArray(records)?records:[];}
export function settledMerchantReturnMinor(p:Payment){return merchantReturnRecords(p).filter(r=>r.refund?.state==='confirmed').reduce((n,r)=>n+r.refund!.amountMinor,0);}
export function merchantReturnsBlockFullRefund(p:Payment){return merchantReturnRecords(p).some(r=>r.state!=='draft'&&r.state!=='declined'||r.refund?.state==='confirmed');}
function allocatedLineMinor(l:MerchantReturnAllocation['lines'][number]){return l.netItemsMinor+l.selectedGuestFeeMinor+l.selectedDeliveryMinor+l.selectedTipMinor;}
function correctionsMatch(r:MerchantReturnPreview){
 const a=r.allocation,c=r.corrections;if(!a||!c||c.kind!=='merchant-return-corrections-preview'||c.liveExecution!==false||c.returnId!==r.id||c.paymentId!==r.paymentId||c.allocationReview!==a.reviewSnapshot)return false;
 const amounts:Record<ReturnCorrectionComponent,number>={guestRefund:a.guestRefundMinor,applicationFeeRefund:a.applicationFeeRefundMinor,transferReversal:a.transferReversalMinor};const names:ReturnCorrectionComponent[]=['guestRefund','applicationFeeRefund','transferReversal'];if(new Set(names.map(k=>c.components?.[k]?.id)).size!==3)return false;
 for(const k of names){const x=c.components?.[k],amount=amounts[k];if(!x||typeof x.id!=='string'||!x.id||x.amountMinor!==amount||!Number.isSafeInteger(amount)||amount<0||!['not-applicable','not-requested','pending','unknown','confirmed','failed'].includes(x.status)||(amount===0?x.status!=='not-applicable':x.status==='not-applicable'))return false;}
 const guest=c.components.guestRefund,expected=r.refund?({requested:'pending',unknown:'unknown',declined:'failed',confirmed:'confirmed'} as const)[r.refund.state]:r.amountMinor===0?'not-applicable':'not-requested';
 if(guest.status!==expected||r.refund&&(guest.id!==r.refund.id||guest.amountMinor!==r.refund.amountMinor))return false;
 if(r.state!=='returned'&&(r.refund||names.some(k=>!['not-requested','not-applicable'].includes(c.components[k].status))))return false;
 return true;
}
function merchantReturnSourceUnchecked(w:ProductWorld,paymentId:string){
 const p=ownMerchantCheckout(w,paymentId);if(!p||!p.merchantCheckout||!isMerchantExampleVenue(p.merchantCheckout.venueId)&&!isGroceryVenue(p.merchantCheckout.venueId))return;
 const c=p.merchantCheckout as CheckoutWithReturns;let s;try{s=JSON.parse(c.orderSnapshot);}catch{return;}
 if(s.quote?.currency!=='USD'||!Array.isArray(s.items)||!s.items.length||c.returns!==undefined&&!Array.isArray(c.returns))return;
 let allocationSource:ReturnType<typeof merchantReturnAllocationSource>|undefined,lines:MerchantReturnLine[];
 try{
  if(s.quote?.returnAllocationPolicy!==undefined){allocationSource=merchantReturnAllocationSource(w,paymentId);lines=allocationSource.lines.map(l=>({key:l.key,name:l.name,variant:l.variant,purchased:l.purchased,quantity:0,unitMinor:l.unitMinor,amountMinor:0}));}
  else{lines=s.items.map((i:Record<string,unknown>,index:number)=>{const quantity=Number(i.quantity),unitMinor=s.groceryReview?groceryPaidUnitMinor(w,p,index):merchantUSDMinor(String(i.unitPrice));need(Number.isSafeInteger(quantity)&&quantity>0&&unitMinor>0,'Original positions need exact quantities and USD prices.');return {key:String(index),name:String(i.name||'Original item'),variant:String(i.variant||''),purchased:quantity,quantity:0,unitMinor,amountMinor:0};});if(lines.reduce((n,l)=>n+l.purchased*l.unitMinor,0)!==c.amountMinor||merchantUSDMinor(String(s.quote.subtotal))!==c.amountMinor||['fees','discount','tip'].some(k=>merchantUSDMinor(String(s.quote[k]))!==0)||s.quote.deliveryFee!==undefined&&merchantUSDMinor(String(s.quote.deliveryFee))!==0||s.quote.tax!==undefined&&merchantUSDMinor(String(s.quote.tax))!==0)return;}
 }catch{return;}
 const records=merchantReturnRecords(p),references=new Set<string>();if(new Set(records.map(r=>r.id)).size!==records.length||records.some(r=>r.owner!==w.owner||r.paymentId!==p.id||r.orderId!==p.sourceId||r.venueId!==c.venueId||r.snapshot!==c.orderSnapshot||r.sellerName!==c.sellerName||r.liveExecution!==false))return;
 for(const r of records){
  if(!['draft','requested','unknown','accepted','declined','returned'].includes(r.state)||!Number.isSafeInteger(r.revision)||r.revision<1||!Array.isArray(r.events)||!Array.isArray(r.lines)||!r.lines.length||new Set(r.lines.map(l=>l.key)).size!==r.lines.length||!Number.isSafeInteger(r.amountMinor)||r.amountMinor<(allocationSource?0:1)||r.lines.reduce((n,l)=>n+l.amountMinor,0)!==r.amountMinor)return;
  let allocation:MerchantReturnAllocation|undefined;
  if(allocationSource){try{if(r.state==='declined'){allocation=r.allocation;need(allocation&&allocation.originalSnapshot===c.orderSnapshot&&allocation.policySnapshot===allocationSource.policySnapshot&&allocation.owner===w.owner&&allocation.paymentId===p.id&&allocation.orderId===p.sourceId&&allocation.guestRefundMinor===r.amountMinor&&JSON.stringify({...allocation,reviewSnapshot:undefined})===allocation.reviewSnapshot,'Keep the declined original allocation.');}else allocation=merchantReturnAllocationAtRecord(w,p.id,r.id);if(!correctionsMatch(r))return;for(const component of Object.values(r.corrections!.components)){if(references.has(component.id))return;references.add(component.id);}}catch{return;}}
  else if(r.allocation||r.corrections)return;
  for(const line of r.lines){const original=lines.find(l=>l.key===line.key),a=allocation?.lines.find(l=>l.key===line.key);if(!original||line.name!==original.name||line.variant!==original.variant||line.purchased!==original.purchased||line.unitMinor!==original.unitMinor||!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>line.purchased||line.amountMinor!==(a?allocatedLineMinor(a):line.quantity*line.unitMinor)||allocation&&(!a||a.quantity!==line.quantity)||allocation&&allocation.lines.length!==r.lines.length)return;}
  if(typeof r.reason!=='string'||typeof r.note!=='string'||r.note.length>2000||new Set(r.events.map(e=>e.key)).size!==r.events.length||r.events.some(e=>typeof e.key!=='string'||typeof e.operation!=='string'||typeof e.payload!=='string'||!Number.isFinite(e.at)))return;
  if(r.refund&&(!['requested','unknown','declined','confirmed'].includes(r.refund.state)||r.refund.amountMinor!==r.amountMinor||r.state!=='returned'))return;
 }
 if(lines.some(line=>merchantReturnRemaining(p,line.key)>line.purchased)||settledMerchantReturnMinor(p)>c.amountMinor)return;
 return {p,c,lines,records,allocationSource};
}
export function merchantReturnSource(w:ProductWorld,paymentId:string){try{return merchantReturnSourceUnchecked(w,paymentId);}catch{return;}}
/** Validated private breakdown for the original return, including historical fully refunded payments. */
export function merchantReturnAllocationReview(w:ProductWorld,paymentId:string,returnId:string){const source=merchantReturnSource(w,paymentId),r=source?.records.find(r=>r.id===returnId);return r?.allocation?structuredClone(r.allocation):undefined;}

export function merchantReturnRemaining(p:Payment,key:string,exceptId=''){return merchantReturnRecords(p).filter(r=>r.id!==exceptId&&r.state!=='draft'&&r.state!=='declined').reduce((n,r)=>n+(r.lines.find(l=>l.key===key)?.quantity||0),0);}
export function merchantReturnReview(r:MerchantReturnPreview){return JSON.stringify({id:r.id,paymentId:r.paymentId,orderId:r.orderId,seller:r.sellerName,snapshot:r.snapshot,lines:r.lines,amountMinor:r.amountMinor,reason:r.reason,note:r.note,...(r.allocation?{allocationReview:r.allocation.reviewSnapshot}:{} )});}
export function applyMerchantReturnPreview(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('merchant.return.example.'))return;
 const source=merchantReturnSource(w,ctx.objectId||'');need(source,'Open your own exact original merchant payment and positions.');const {p,c,lines,records,allocationSource}=source;
 need(ctx.venueId===c.venueId&&(!ctx.sourceTaskId||ctx.sourceTaskId===c.sourceTaskId),'Keep the original Spot and Chuck task.');need(d.approved==='Yes'&&!!d.actionKey?.trim(),'Approve this single local example action.');
 const payload=JSON.stringify({returnId:d.returnId||'',lines:d.lines||'',reason:d.reason||'',note:d.note||'',review:d.review||'',outcome:d.outcome||'',allocationReview:d.allocationReview||'',component:d.component||'',correctionReference:d.correctionReference||''});
 for(const original of records){const prior=original.events.find(e=>e.key===d.actionKey);if(prior){need(prior.operation===op&&prior.payload===payload,'This action reference belongs to a different return.');return {objectId:p.id,message:'The same original return action is retained.'};}}
 let r:MerchantReturnPreview|undefined;
 if(op==='merchant.return.example.prepare'){
  need(p.status==='confirmed'&&!c.refund,'Use the original settled payment; a separate full refund must be resolved first.');need(!records.some(r=>r.state==='draft'),'Review or close your existing draft first.');
  let selected:Record<string,unknown>;try{selected=JSON.parse(d.lines);}catch{throw Error('Choose the exact original item quantities.');}need(selected&&typeof selected==='object'&&!Array.isArray(selected)&&Object.keys(selected).every(key=>lines.some(l=>l.key===key)),'Choose only original positions.');
  const chosen=lines.map(line=>{const quantity=Number(selected[line.key]||0);need(Number.isSafeInteger(quantity)&&quantity>=0&&quantity<=line.purchased-merchantReturnRemaining(p,line.key),'Choose no more than the remaining purchased quantity.');return {...line,quantity,amountMinor:quantity*line.unitMinor};}).filter(l=>l.quantity>0);need(chosen.length,'Choose at least one original item.');
  need(['Item issue','Changed my mind','Wrong item','Other'].includes(d.reason)&&(d.note||'').length<=2000,'Choose a return reason and a note within2,000 characters.');
  const allocation=allocationSource?calculateMerchantReturnAllocation(w,p.id,Object.fromEntries(chosen.map(l=>[l.key,l.quantity]))):undefined;if(allocation)for(const line of chosen){line.amountMinor=allocatedLineMinor(allocation.lines.find(l=>l.key===line.key)!);}
  r={id:localPreviewId(),owner:w.owner,paymentId:p.id,orderId:p.sourceId,venueId:c.venueId,sellerName:c.sellerName,snapshot:c.orderSnapshot,lines:chosen,amountMinor:chosen.reduce((n,l)=>n+l.amountMinor,0),reason:d.reason,note:d.note||'',state:'draft',revision:1,createdAt:Date.now(),events:[],liveExecution:false,...(allocation?{allocation}:{} )};if(allocation)r.corrections=prepareMerchantReturnCorrections(allocation,r.id);c.returns??=[];c.returns.push(r);
 }else{
  r=records.find(r=>r.id===d.returnId);need(r&&d.expectedRevision===String(r.revision),'Review this same original return and its current version.');
  if(op==='merchant.return.example.submit'){
   need(r.state==='draft'&&p.status==='confirmed'&&!c.refund&&d.review===merchantReturnReview(r),'Review the exact quantities, seller and USD amount before sending.');for(const line of r.lines)need(line.quantity+merchantReturnRemaining(p,line.key,r.id)<=line.purchased,'Another return already reserves these quantities.');if(r.allocation){const fresh=calculateMerchantReturnAllocation(w,p.id,Object.fromEntries(r.lines.map(l=>[l.key,l.quantity])));need(fresh.reviewSnapshot===r.allocation.reviewSnapshot,'Original allocation changed; review the exact seller breakdown again.');}r.state='requested';
  }else if(op==='merchant.return.example.cancel'){
   need(r.state==='draft','Only an unsent draft can be closed here.');r.state='declined';
  }else if(op==='merchant.return.example.respond'){
   need(['requested','unknown'].includes(r.state)&&['Accepted','Declined','Unknown'].includes(d.outcome),'Check the same unresolved merchant return request.');r.state=({Accepted:'accepted',Declined:'declined',Unknown:'unknown'} as const)[d.outcome as 'Accepted'|'Declined'|'Unknown'];
  }else if(op==='merchant.return.example.received'){
   need(r.state==='accepted'&&d.outcome==='Received','Goods received requires its own explicit seller example after acceptance.');r.state='returned';
  }else if(op==='merchant.return.example.refund.request'){
   need(r.state==='returned'&&r.amountMinor>0&&!r.refund&&p.status==='confirmed'&&!c.refund,'Only received goods can enter this separate partial-refund example.');need(settledMerchantReturnMinor(p)+r.amountMinor<=c.amountMinor,'The remaining original principal is insufficient.');if(r.allocation){need(d.allocationReview===r.allocation.reviewSnapshot,'Personally review this exact original refund breakdown.');r.corrections=updateMerchantReturnCorrection(r.corrections!,'guestRefund',r.corrections!.components.guestRefund.id,'request',d.allocationReview,true);}r.refund={id:r.corrections?.components.guestRefund.id||localPreviewId(),state:'requested',amountMinor:r.amountMinor,createdAt:Date.now()};
  }else if(op==='merchant.return.example.refund.check'){
   need(r.refund&&['requested','unknown'].includes(r.refund.state)&&['Confirmed','Declined','Unknown'].includes(d.outcome),'Check the same unresolved original-route refund.');if(d.outcome==='Confirmed')need(!c.refund&&settledMerchantReturnMinor(p)+r.refund.amountMinor<=c.amountMinor,'Do not refund more than the original paid principal.');if(r.allocation){need(d.allocationReview===r.allocation.reviewSnapshot,'Review the same original refund allocation.');r.corrections=updateMerchantReturnCorrection(r.corrections!,'guestRefund',r.refund.id,({Confirmed:'confirmed',Declined:'failed',Unknown:'unknown'} as const)[d.outcome as 'Confirmed'|'Declined'|'Unknown'],d.allocationReview,true);}r.refund.state=({Confirmed:'confirmed',Declined:'declined',Unknown:'unknown'} as const)[d.outcome as 'Confirmed'|'Declined'|'Unknown'];if(settledMerchantReturnMinor(p)===c.amountMinor)p.status='refunded';
  }else if(op==='merchant.return.example.correction.request'||op==='merchant.return.example.correction.check'){
   need(r.state==='returned'&&r.refund&&r.allocation&&r.corrections&&d.allocationReview===r.allocation.reviewSnapshot&&['applicationFeeRefund','transferReversal'].includes(d.component),'Review this exact received return and its independent original correction.');
   const component=d.component as 'applicationFeeRefund'|'transferReversal';need(r.corrections.components[component].id===d.correctionReference,'Keep the exact original correction reference.');
   if(op.endsWith('.request'))r.corrections=updateMerchantReturnCorrection(r.corrections,component,d.correctionReference,'request',d.allocationReview,true);
   else{need(['Unknown','Confirmed','Failed'].includes(d.outcome),'Choose an explicit independent correction response.');r.corrections=updateMerchantReturnCorrection(r.corrections,component,d.correctionReference,({Unknown:'unknown',Confirmed:'confirmed',Failed:'failed'} as const)[d.outcome as 'Unknown'|'Confirmed'|'Failed'],d.allocationReview,true);}
  }else throw Error('Choose a supported return example action.');
  r.revision++;
 }
 r.events.push({key:d.actionKey,operation:op,payload,at:Date.now()});c.revision++;
 return {objectId:p.id,message:op.includes('.correction.')?'Independent original correction updated. Customer refund, application-fee refund and transfer reversal retain separate states; no new payment or CRAYS fee subsidy.':r.refund?.state==='confirmed'?'Original-route example refund confirmed. No CRAYS wallet credit, fee subsidy or new payment was created.':r.state==='draft'?'Return draft saved. Review before asking the seller.':'Original return updated. Goods, seller acceptance and money each keep their separate status.'};
}
