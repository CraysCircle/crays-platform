import {requirePreparationRecoveryClear} from './orderPreparationRecovery.ts';
import {isMerchantExampleVenue} from './merchantExampleScope.ts';
import type {ProductWorld,ActionContext,Entity} from './productModel.ts';
import {ownMerchantCheckout} from './merchantCheckout.ts';
import {localPreviewId} from './localPreviewId.ts';
export type PickupProofPreview={id:string;owner:string;orderId:string;venueId:string;paymentId:string;snapshot:string;readyVersion:number;issuedAt:number;expiresAt:number;source:'fictional-pickup-proof';liveExecution:false};
export type PickupPreview={source:'explicit-fictional-merchant';liveExecution:false;orderId:string;owner:string;venueId:string;paymentId:string;snapshot:string;revision:number;state:'accepted'|'preparing'|'ready'|'unavailable'|'collected';readyVersion?:number;proofs?:PickupProofPreview[];exampleExpiredProofIds?:string[];events:{key:string;operation:string;outcome:string;at:number;proofId?:string;proofVersion?:string}[];acknowledgement?:{id:string;proofId?:string;proofVersion?:number;state:'unknown'|'confirmed';createdAt:number;checkedAt?:number}};
function need(v:unknown,m:string):asserts v{if(!v)throw Error(m);}
export function ownPickupOrder(w:ProductWorld,id:string){const found=w.objects.filter(o=>o.id===id),o=found[0];return w.identity.signedIn&&found.length===1&&o.owner===w.owner&&o.kind==='order'&&o.delivery!=='Shipping'&&isMerchantExampleVenue(o.venueId)?o:undefined;}
export function pickupRecord(o:Entity){const r=o.pickupPreview as PickupPreview|undefined;return r?.source==='explicit-fictional-merchant'&&r.liveExecution===false&&r.orderId===o.id&&r.owner===o.owner&&r.venueId===o.venueId&&Number.isSafeInteger(r.revision)&&r.revision>0&&Array.isArray(r.events)?r:undefined;}
export function currentPickupProof(r:PickupPreview){return Array.isArray(r.proofs)?r.proofs.at(-1):undefined;}
export function pickupProofState(r:PickupPreview,now=Date.now()):'missing'|'stale'|'expired'|'valid'{
 const proof=currentPickupProof(r);if(!proof)return 'missing';
 if(proof.source!=='fictional-pickup-proof'||proof.liveExecution!==false||proof.owner!==r.owner||proof.orderId!==r.orderId||proof.venueId!==r.venueId||proof.paymentId!==r.paymentId||proof.snapshot!==r.snapshot||proof.readyVersion!==r.readyVersion||!Number.isSafeInteger(proof.readyVersion)||proof.readyVersion<1||!Number.isFinite(proof.issuedAt)||!Number.isFinite(proof.expiresAt)||proof.expiresAt<=proof.issuedAt||proof.issuedAt>now)return 'stale';
 return proof.expiresAt<=now||r.exampleExpiredProofIds?.includes(proof.id)?'expired':'valid';
}
function issueProof(r:PickupPreview){const at=Date.now();r.proofs??=[];r.proofs.push({id:localPreviewId(),owner:r.owner,orderId:r.orderId,venueId:r.venueId,paymentId:r.paymentId,snapshot:r.snapshot,readyVersion:r.readyVersion!,issuedAt:at,expiresAt:at+5*60000,source:'fictional-pickup-proof',liveExecution:false});}
export function applyOrderPickupPreview(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('order.pickup.example.'))return;
 const o=ownPickupOrder(w,ctx.objectId||'');need(o,'Open your own exact Coffee or Store order.');need(ctx.venueId===o.venueId&&(!ctx.sourceTaskId||ctx.sourceTaskId===o.sourceTaskId),'Keep the original Spot and Chuck task.');
 need(d.approved==='Yes'&&!!d.actionKey?.trim(),'Choose this explicit fictional merchant outcome.');const r=pickupRecord(o);if(o.pickupPreview)need(r,'The pickup original needs review.');
 const prior=r?.events.find(e=>e.key===d.actionKey);if(prior){need(prior.operation===op&&prior.outcome===d.outcome&&(prior.proofId||'')===(d.proofId||'')&&(prior.proofVersion||'')===(d.proofVersion||''),'This reference already belongs to another pickup action.');return {objectId:o.id,message:'The original pickup action is retained. No second collection.'};}
 const p=ownMerchantCheckout(w,r?.paymentId||d.paymentId);need(p&&p.sourceId===o.id&&p.merchantCheckout?.venueId===o.venueId,'Keep this order’s exact original payment.');
 if(op==='order.pickup.example.start'){
  need(!r&&o.status==='placed-demo'&&o.delivery==='Pick up'&&p.status==='confirmed'&&!p.merchantCheckout!.refund,'Only an unchanged paid pickup order can enter the merchant example.');
  const s=JSON.parse(p.merchantCheckout!.orderSnapshot);need(!s.shippingReview&&s.items&&JSON.stringify(s.items)===JSON.stringify(o.items)&&s.requestSnapshot===o.requestSnapshot&&JSON.stringify(s.sellerSnapshot)===JSON.stringify(o.sellerSnapshot)&&JSON.stringify(s.quote)===JSON.stringify(o.quote),'This paid order changed. Check its original before preparation.');
  const v=w.venues.filter(v=>v.id===o.venueId);need(v.length===1&&v[0].operatorActive&&v[0].name===p.recipient,'The original seller is not currently available.');
  o.pickupPreview={source:'explicit-fictional-merchant',liveExecution:false,orderId:o.id,owner:w.owner,venueId:String(o.venueId),paymentId:p.id,snapshot:p.merchantCheckout!.orderSnapshot,revision:1,state:'accepted',events:[{key:d.actionKey,operation:op,outcome:d.outcome,at:Date.now()}]} satisfies PickupPreview;o.fulfilment='Example · accepted by seller';
 }else{
  need(r&&d.expectedRevision===String(r.revision),'Review the current pickup status first.');need(r.snapshot===p.merchantCheckout!.orderSnapshot,'Keep the same original paid order.');if(op!=='order.pickup.example.check'){const original=JSON.parse(r.snapshot);need(o.status==='placed-demo'&&o.delivery==='Pick up'&&JSON.stringify(o.items)===JSON.stringify(original.items)&&JSON.stringify(o.quote)===JSON.stringify(original.quote)&&o.requestSnapshot===original.requestSnapshot&&JSON.stringify(o.sellerSnapshot)===JSON.stringify(original.sellerSnapshot),'The order changed or cancellation needs checking. Keep its original history.');}
  if(['order.pickup.example.update','order.pickup.example.collect'].includes(op))requirePreparationRecoveryClear(o);
  if(op==='order.pickup.example.update'){
   need(p.status==='confirmed'&&!p.merchantCheckout!.refund&&!r.acknowledgement,'Check the original refund or collection request before another preparation update.');
   need((r.state==='accepted'&&['preparing','unavailable'].includes(d.outcome))||(r.state==='preparing'&&['ready','unavailable'].includes(d.outcome)),'Follow the original preparation sequence. Ready is not collected.');r.state=d.outcome as PickupPreview['state'];if(r.state==='ready'){r.readyVersion=(r.readyVersion||0)+1;issueProof(r);}
  }else if(['order.pickup.example.proof.expire','order.pickup.example.proof.stale','order.pickup.example.proof.refresh'].includes(op)){
   need(r.state==='ready'&&!r.acknowledgement&&p.status==='confirmed'&&!p.merchantCheckout!.refund,'Review a proof only for the same ready, paid, uncollected order.');
   const v=w.venues.filter(v=>v.id===o.venueId);need(v.length===1&&v[0].operatorActive&&v[0].name===p.recipient,'The original seller must be available to refresh pickup.');
   if(op.endsWith('.refresh')){need(pickupProofState(r)!=='valid','The current proof is still valid; keep this same original.');r.readyVersion??=1;issueProof(r);}
   else {const proof=currentPickupProof(r);need(proof&&pickupProofState(r)==='valid','Choose a current valid proof for this explicit recovery example.');if(op.endsWith('.expire')){r.exampleExpiredProofIds??=[];r.exampleExpiredProofIds.push(proof.id);}else r.readyVersion=(r.readyVersion||0)+1;}
  }else if(op==='order.pickup.example.collect'){
   need(r.state==='ready'&&!r.acknowledgement&&p.status==='confirmed'&&!p.merchantCheckout!.refund&&d.outcome==='unknown','Review collection only for this ready, paid original.');const v=w.venues.filter(v=>v.id===o.venueId);need(v.length===1&&v[0].operatorActive&&v[0].name===p.recipient,'The original seller needs review before collection.');
   const proof=currentPickupProof(r);need(proof&&pickupProofState(r)==='valid'&&d.proofId===proof.id&&d.proofVersion===String(proof.readyVersion),'This pickup proof expired or changed. Refresh the same ready order before collection.');r.acknowledgement={id:localPreviewId(),proofId:proof.id,proofVersion:proof.readyVersion,state:'unknown',createdAt:Date.now()};
  }else if(op==='order.pickup.example.check'){
   need(r.state==='ready'&&r.acknowledgement?.state==='unknown'&&['unknown','confirmed'].includes(d.outcome),'Check the same unresolved collection acknowledgement.');r.acknowledgement.state=d.outcome as 'unknown'|'confirmed';r.acknowledgement.checkedAt=Date.now();if(d.outcome==='confirmed')r.state='collected';
  }else throw Error('Choose a supported pickup example action.');
  r.events.push({key:d.actionKey,operation:op,outcome:d.outcome,at:Date.now(),...(d.proofId?{proofId:d.proofId,proofVersion:d.proofVersion}:{} )});r.revision++;o.fulfilment=`Example · ${r.state==='ready'&&r.acknowledgement?.state==='unknown'?'collection outcome unknown':r.state}`;
 }
 return {objectId:o.id,message:'Original fictional pickup status updated. No real seller, stock, collection proof, payment or invoice was changed.'};
}
