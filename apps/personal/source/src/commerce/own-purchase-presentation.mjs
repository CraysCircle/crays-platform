import {creatorContentFormatLabel} from './content-formats.mjs';
import {validOwnCreatorPurchase} from './own-purchase-read-contract.mjs';
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const usd=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
const paymentLabels={'not-started':'Not started','awaiting-payment':'Awaiting demo payment','unknown-payment':'Demo outcome needs review','failed-payment':'Demo payment failed','expired-payment':'Demo payment expired','confirmed-simulation':'Demo payment confirmed','refunded-simulation':'Demo refund recorded'};
const rightsLabels={'not-issued':'Not issued','proof-pending':'Demo licence pending','valid-demo':'Demo licence recorded',expired:'Demo licence expired','revoked-refund':'Demo licence revoked'};
/** Existing Commerce/Library presentation only. Exact current controller rows,
 * not caller-copied records or a public-profile grant, supply private metadata.
 * The host still owns canonical navigation/admission and the selected design.
 */
export function createOwnPurchasePresentation({controller}){
 if(typeof controller?.getSnapshot!=='function'||typeof controller?.isCurrent!=='function')throw Error('Current own purchase controller required');
 const bindings=new WeakMap();
 function row(input,snapshot=controller.getSnapshot()){
  if(!controller.isCurrent(snapshot)||!validOwnCreatorPurchase(input)||!snapshot.entries.some(r=>r===input)&&snapshot.detail.result?.original!==input)throw Error('Current own purchase original required');
  const view=freeze({schema:'crays.own-purchase-presentation.v2',key:input.orderId,title:input.title,formatLabel:creatorContentFormatLabel(input.format),creator:{name:input.creatorDisplayName,pubkey:input.creatorPubkey,target:{type:'profile',pubkey:input.creatorPubkey}},spot:{name:input.spotName,id:input.spotId},priceLabel:usd.format(input.totalMinor/100)+' · demo',paymentLabel:paymentLabels[input.payment.state],rightsLabel:rightsLabels[input.rights.state],accessLabel:'Content not delivered',commissionLabel:'0% CRAYS content commission',externalFeesLabel:'External fees not quoted',kindLabel:'Creator purchase',simulationLabel:'Demo purchase',reconcileSameAttempt:input.payment.reconcileSameAttempt,refundLabel:input.refundState==='pending-demo'?'Demo refund pending':input.refundState==='confirmed-demo'?'Demo refund recorded':null,playable:false,actualPaymentEnabled:false,actualRGBProof:false,actualProtectedDelivery:false,legalInvoice:false,
   originalSelector:{kind:'order',id:input.orderId},receiptSelector:{kind:'receipt',id:input.receiptId},rightsSelector:input.rights.licenceId?{kind:'licence',id:input.rights.licenceId}:null,previewTarget:{type:'reference',reference:{type:'event',eventId:input.previewEventId}}});
  bindings.set(view,snapshot);return view;
 }
 return Object.freeze({row,isCurrent(view){const source=bindings.get(view);return !!source&&controller.isCurrent(source);},
  rows(s=controller.getSnapshot()){if(!controller.isCurrent(s)||!['loaded','loading-more'].includes(s.phase))return Object.freeze([]);return Object.freeze(s.entries.map(r=>row(r,s)));},
  selected(s=controller.getSnapshot()){return controller.isCurrent(s)&&s.detail.phase==='loaded'&&s.detail.result?.original?row(s.detail.result.original,s):null;},
 });
}
