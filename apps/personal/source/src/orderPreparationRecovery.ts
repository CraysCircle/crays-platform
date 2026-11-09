import type {ActionContext,Entity,ProductWorld} from './productModel.ts';
import {ownPickupOrder,pickupRecord} from './orderPickupPreview.ts';
import {ownMerchantCheckout} from './merchantCheckout.ts';
import {localPreviewId} from './localPreviewId.ts';
export const preparationRecoveryReasons=['delayed','offline','kds-lost'] as const;
export type PreparationRecoveryReason=typeof preparationRecoveryReasons[number];
export type PreparationObservation={id:string;version:number;reason:PreparationRecoveryReason;state:'observed'|'unknown'|'recovered';pickupRevision:number;history:{version:number;state:string;at:number}[]};
export type PreparationRecovery={source:'explicit-fictional-preparation-observation';liveExecution:false;owner:string;orderId:string;venueId:string;paymentId:string;sourceTaskId:string;snapshot:string;revision:number;observations:PreparationObservation[];events:{key:string;request:string;observationId:string;at:number;revision:number}[]};
const prefix='order.preparation.example.';
function need(value:unknown,message:string):asserts value{if(!value)throw Error(message);}
function validObservation(o:PreparationObservation){return o&&typeof o.id==='string'&&!!o.id&&Number.isSafeInteger(o.version)&&o.version>0&&preparationRecoveryReasons.includes(o.reason)&&['observed','unknown','recovered'].includes(o.state)&&Number.isSafeInteger(o.pickupRevision)&&o.pickupRevision>0&&Array.isArray(o.history)&&o.history.length===o.version&&o.history.every((h,i)=>h.version===i+1&&Number.isFinite(h.at)&&['observed','unknown','recovered'].includes(h.state))&&o.history[0].state==='observed'&&o.history.at(-1)?.state===o.state&&o.history.slice(1).every((h,i)=>o.history[i].state!=='recovered'&&['unknown','recovered'].includes(h.state));}
export function preparationRecoveryRecord(order:Entity):PreparationRecovery|undefined {
 const r=order.preparationRecovery as PreparationRecovery|undefined;
 return r&&r.source==='explicit-fictional-preparation-observation'&&r.liveExecution===false&&r.owner===order.owner&&r.orderId===order.id&&r.venueId===order.venueId&&r.sourceTaskId===(order.sourceTaskId||'')&&typeof r.paymentId==='string'&&!!r.paymentId&&typeof r.snapshot==='string'&&Number.isSafeInteger(r.revision)&&r.revision>0&&Array.isArray(r.observations)&&r.observations.length>0&&r.observations.every(validObservation)&&new Set(r.observations.map(o=>o.id)).size===r.observations.length&&r.observations.filter(o=>o.state!=='recovered').length<=1&&Array.isArray(r.events)&&r.events.length===r.revision&&r.events.every((e,i)=>e.revision===i+1&&typeof e.key==='string'&&e.key.length>=8&&typeof e.request==='string'&&r.observations.some(o=>o.id===e.observationId)&&Number.isFinite(e.at))&&new Set(r.events.map(e=>e.key)).size===r.events.length?r:undefined;
}
/** Root applies this fail-closed guard before normal preparation updates/collection. */
export function preparationRecoveryBlocks(order:Entity):boolean {
 if(!order.preparationRecovery)return false;
 const r=preparationRecoveryRecord(order);return !r||r.observations.some(o=>o.state!=='recovered');
}
export function requirePreparationRecoveryClear(order:Entity){need(!preparationRecoveryBlocks(order),'This preparation observation is unresolved or needs source review. Check the same original observation before updating preparation or collecting.');}
export function preparationRecoverySource(w:ProductWorld,orderId:string,paymentId?:string){
 const o=ownPickupOrder(w,orderId);need(o,'Open your own exact paid pickup order.');
 const pickup=pickupRecord(o);need(pickup&&o.status==='placed-demo'&&o.delivery==='Pick up'&&pickup.state!=='collected'&&!pickup.acknowledgement,'Open the same accepted, paid and uncollected pickup original. Collection acknowledgement has its own recovery.');
 const p=ownMerchantCheckout(w,paymentId||pickup.paymentId),c=p?.merchantCheckout;
 need(p&&c&&p.id===pickup.paymentId&&p.sourceId===o.id&&c.orderId===o.id&&c.venueId===o.venueId&&p.status==='confirmed'&&!c.refund,'Keep this exact original confirmed payment; refunds and new checkouts are separate.');
 need(pickup.snapshot===c.orderSnapshot,'The preparation and payment must retain the same exact order snapshot.');
 let frozen:Record<string,unknown>;try{frozen=JSON.parse(c.orderSnapshot);}catch{throw Error('The original paid-order snapshot needs review.');}
 need(frozen.owner===w.owner&&frozen.orderId===o.id&&frozen.venueId===o.venueId&&(frozen.sourceTaskId||'')===(o.sourceTaskId||'')&&!frozen.shippingReview&&JSON.stringify(frozen.items)===JSON.stringify(o.items)&&JSON.stringify(frozen.quote)===JSON.stringify(o.quote)&&frozen.requestSnapshot===o.requestSnapshot&&JSON.stringify(frozen.sellerSnapshot)===JSON.stringify(o.sellerSnapshot),'The order, items, quote or original seller changed. No preparation recovery was applied.');
 const venues=w.venues.filter(v=>v.id===o.venueId);need(venues.length===1&&venues[0].operatorActive&&venues[0].name===p.recipient,'The original seller context is inactive or changed. Check its source before recovery.');
 const r=preparationRecoveryRecord(o);if(o.preparationRecovery)need(r&&r.paymentId===p.id&&r.snapshot===c.orderSnapshot,'The retained preparation observation needs source review.');
 return {order:o,pickup,payment:p,recovery:r};
}
export function applyOrderPreparationRecovery(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext,now=Date.now()):{objectId:string;message:string}|null {
 if(!op.startsWith(prefix))return null;
 need(!ctx.personId||ctx.personId===w.owner,'Open your own pickup observation.');
 const {order:o,pickup,payment,recovery:prior}=preparationRecoverySource(w,ctx.objectId||'',d.paymentId||undefined);
 need(ctx.venueId===o.venueId&&(!ctx.sourceTaskId||ctx.sourceTaskId===o.sourceTaskId),'Keep the exact original Spot and Chuck task.');
 need(d.approved==='Yes'&&d.scenario==='explicit-local-example'&&typeof d.actionKey==='string'&&d.actionKey.length>=8&&d.actionKey.length<=160,'Personally choose this explicit fictional preparation observation.');
 need(['observe','check'].some(s=>op===prefix+s),'Choose a supported original preparation observation action.');
 const request=JSON.stringify({op,paymentId:payment.id,expectedRevision:d.expectedRevision,expectedPickupRevision:d.expectedPickupRevision,observationId:d.observationId||'',observationVersion:d.observationVersion||'',reason:d.reason||'',outcome:d.outcome||''});
 const receipt=prior?.events.find(e=>e.key===d.actionKey);if(receipt){need(receipt.request===request,'This action reference belongs to a different observation or check.');return {objectId:o.id,message:'The same original observation action is retained. Nothing was resent or prepared again.'};}
 need(d.expectedRevision===String(prior?.revision||0)&&d.expectedPickupRevision===String(pickup.revision),'The preparation source or observation changed. Review the current same-order original.');
 let r=prior,observation:PreparationObservation;
 if(op===prefix+'observe'){
  need(preparationRecoveryReasons.includes(d.reason as PreparationRecoveryReason),'Choose delayed, offline or KDS-lost as the fictional observation reason.');
  need(!r?.observations.some(o=>o.state!=='recovered'),'Check the same unresolved observation before adding another.');
  observation={id:localPreviewId(),version:1,reason:d.reason as PreparationRecoveryReason,state:'observed',pickupRevision:pickup.revision,history:[{version:1,state:'observed',at:now}]};
  if(!r){r={source:'explicit-fictional-preparation-observation',liveExecution:false,owner:w.owner,orderId:o.id,venueId:String(o.venueId),paymentId:payment.id,sourceTaskId:typeof o.sourceTaskId==='string'?o.sourceTaskId:'',snapshot:payment.merchantCheckout!.orderSnapshot,revision:0,observations:[],events:[]};o.preparationRecovery=r;}
  r.observations.push(observation);
 }else{
  need(r,'Open the existing preparation observation.');const matches=r.observations.filter(o=>o.id===d.observationId);
  need(matches.length===1,'Choose this exact original observation.');observation=matches[0];
  need(observation.state!=='recovered'&&String(observation.version)===d.observationVersion&&observation.pickupRevision===pickup.revision,'The same observation or preparation revision changed; no new preparation was requested.');
  need(['unknown','recovered'].includes(d.outcome),'Recheck this observation as unknown or recovered only.');
  observation.state=d.outcome as 'unknown'|'recovered';observation.version++;observation.history.push({version:observation.version,state:observation.state,at:now});
 }
 r.revision++;r.events.push({key:d.actionKey,request,observationId:observation.id,at:now,revision:r.revision});
 return {objectId:o.id,message:observation.state==='recovered'?'Fictional source observation recovered. Actual preparation and collection states remain unchanged; no KDS resend, order, payment or support request occurred.':'Observation retained on this same paid order. The preparation outcome is unresolved; no retry, replacement, refund or collection was triggered.'};
}
