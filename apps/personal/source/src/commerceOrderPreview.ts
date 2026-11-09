import {isGroceryOrder,groceryCanonicalOriginal,applyGroceryCanonicalQuote} from './groceryCommerce.ts';
import {isMerchantExampleVenue,gymRetailVenueId} from './merchantExampleScope.ts';
import type {ProductWorld,Entity,ActionContext} from './productModel.ts';
import {catalogueOrderLines,catalogueEstimate,type OrderBasketLine} from './catalogueOrdering.ts';
import {merchantUSDMinor} from './merchantPaymentCosts.ts';
import {localPreviewId} from './localPreviewId.ts';
export type ExampleMerchantReply={id:string;orderId:string;venueId:string;owner:string;requestSnapshot:string;basketSnapshot:string;state:'unknown'|'available'|'unavailable';createdAt:number;checkedAt?:number;quoteVersion?:string;pricingExample?:'original-discount-return';source:'explicit-fictional-merchant';liveExecution:false};
function need(value:unknown,message:string):asserts value{if(!value)throw Error(message);}
export function exampleCommerceOrder(w:ProductWorld,id:string){
 const matches=w.objects.filter(o=>o.id===id);const o=matches.length===1?matches[0]:undefined;
 if(isGroceryOrder(o)){try{return groceryCanonicalOriginal(w,id);}catch{return;}}
 if(!w.identity.signedIn||!o||o.owner!==w.owner||o.kind!=='order'||!isMerchantExampleVenue(o.venueId)||!o.requestSnapshot||!Array.isArray(o.items)||!o.items.length)return;
 const v=w.venues.filter(v=>v.id===o.venueId);if(v.length!==1||!v[0].operatorActive)return;
 const cats=w.objects.filter(c=>c.kind==='venue-catalogue'&&c.venueId===o.venueId&&c.status!=='withdrawn'&&Array.isArray(c.releasedItems));
 if(cats.length!==1||cats[0].id!==`preview-brand-catalogue:${o.venueId}`||cats[0].sourceAuthority!=='fictional-preview'||cats[0].liveExecution!==false)return;
 if(o.venueId===gymRetailVenueId){try{if(JSON.stringify(catalogueOrderLines(w,gymRetailVenueId,o.items as OrderBasketLine[]))!==JSON.stringify(o.items))return;}catch{return;}}
 return o;
}
export function merchantReplyMatches(o:Entity){const r=o.commerceExampleReply as ExampleMerchantReply|undefined;return r?.source==='explicit-fictional-merchant'&&r.liveExecution===false&&r.orderId===o.id&&r.venueId===o.venueId&&r.owner===o.owner&&r.requestSnapshot===o.requestSnapshot&&r.basketSnapshot===JSON.stringify(o.items)?r:undefined;}
/** A customer explicitly explores a local fictional response; never merchant authority or a live quote. */
export function applyCommerceOrderPreview(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext){
 if(!['order.example.reply','order.example.check'].includes(op))return;
 const grocery=applyGroceryCanonicalQuote(w,op,d,ctx);if(grocery)return grocery;
 const o=exampleCommerceOrder(w,ctx.objectId||'');need(o,'Open your own original order from the labelled CRAYS Coffee or Store example.');
 need(o.delivery!=='Shipping','Use the original shipping coverage response for this order.');
 need(ctx.venueId===o.venueId,'This response belongs to another original Spot.');
 need(!ctx.sourceTaskId||ctx.sourceTaskId===o.sourceTaskId,'Keep this order’s original Chuck task.');
 need(d.approved==='Yes'&&d.expectedRequest===o.requestSnapshot,'Review this exact original request before exploring a merchant response.');
 need(['available','unavailable','unknown'].includes(d.outcome),'Choose a supported fictional response.');
 need(!d.pricingExample||d.pricingExample==='original-discount-return'&&d.outcome==='available','Choose the explicitly labelled discount and original return-policy example.');
 const existing=merchantReplyMatches(o);
 if(o.commerceExampleReply)need(existing,'The original response no longer matches this request. Keep it for review, rather than replacing it.');
 if(existing&&existing.state!=='unknown')return {objectId:o.id,message:'The same final example response is retained. No second quote, order or payment was created.'};
 need(o.status==='quote-requested'&&!o.quote,'Only this unchanged, open quote request can receive an example response.');
 if(existing)need(op==='order.example.check','Check the same unresolved response; do not start a second attempt.');
 else need(op==='order.example.reply','Start one explicitly selected example before checking its outcome.');
 // The current catalogue must still agree with the exact original lines. Never silently reprice a frozen request.
 const lines=catalogueOrderLines(w,String(o.venueId),o.items as OrderBasketLine[]),estimate=catalogueEstimate(w,String(o.venueId),lines);
 need(estimate&&estimate.currency==='USD'&&JSON.stringify(estimate.lines)===JSON.stringify((o.catalogueEstimate as {lines?:unknown}|undefined)?.lines),'This original catalogue or price changed. Prepare a newly reviewed basket instead.');
 const at=Date.now(),r:ExampleMerchantReply=existing||{id:localPreviewId(),orderId:o.id,venueId:String(o.venueId),owner:w.owner,requestSnapshot:String(o.requestSnapshot),basketSnapshot:JSON.stringify(o.items),state:'unknown',createdAt:at,source:'explicit-fictional-merchant',liveExecution:false};
 r.state=d.outcome as ExampleMerchantReply['state'];if(existing)r.checkedAt=at;
 if(r.state==='available'){
  const version=localPreviewId();
  if(d.pricingExample==='original-discount-return')r.pricingExample='original-discount-return';
  o.quote={subtotal:estimate.subtotal,fees:'0.00',discount:'0.00',tip:'0.00',total:estimate.subtotal,currency:'USD',expires:new Date(at+15*60000).toISOString(),version,source:'Fictional merchant quote · explicitly selected local example',scenario:true,exampleReplyId:r.id,componentBasis:'Illustrative scenario: listed item subtotal; zero additional fees, discount and tip. Actual taxes, processing and merchant terms need their own real quote.',sellerIds:[...new Set(lines.map(l=>l.sellerId))],channelIds:[...new Set(lines.map(l=>l.channelId))]};
  if(r.pricingExample==='original-discount-return'){
   const subtotalMinor=merchantUSDMinor(estimate.subtotal),discountMinor=Math.floor(subtotalMinor/10),totalMinor=subtotalMinor-discountMinor;
   need(totalMinor>0&&lines.length>0,'Keep a positive original item quote.');
   const quote=o.quote as Record<string,unknown>,sellerId=String(lines[0].sellerId),channelId=String(lines[0].channelId);
   quote.discount=(discountMinor/100).toFixed(2);quote.total=(totalMinor/100).toFixed(2);quote.deliveryFee='0.00';
   quote.componentBasis='Explicit fictional seller example: original item prices, a 10% item discount rounded down to USD cents, no guest fees, delivery charge or tip. No real promotion or provider settlement is represented.';
   quote.returnAllocationPolicy={source:'explicit-fictional-seller-review',id:`fictional-return-policy:${r.id}`,version:'1',venueId:o.venueId,sellerId,channelId,currency:'USD',terms:'Fictional seller review: the original item discount is allocated by original gross price, with stable cent remainders. Selected item quantities are refundable after seller acceptance and goods received. No guest fees, delivery charge or tip apply to this pickup quote.',discountAllocation:'gross-weighted-largest-remainder-v1',guestFees:'retain',delivery:'retain',tip:'retain',settlement:{source:'explicit-fictional-original-settlement',applicationFeeMinor:0,transferredMinor:totalMinor,applicationFeeRefund:'retain',transferReversal:'proportional-guest-refund'}};
  }
  r.quoteVersion=version;o.status='quoted';o.priceStatus='Example USD quote · review required';
 }
 if(r.state==='unavailable'){o.status='declined';o.priceStatus='Example seller cannot fulfil';}
 o.commerceExampleReply=r;
 return {objectId:o.id,message:r.state==='available'?'Example USD quote ready to review. No order was placed, payment made or dietary requirement confirmed.':r.state==='unavailable'?'Example seller cannot fulfil this request. No quote, order, replacement or payment was created.':'Example response is unresolved. Check this same original response before another attempt.'};
}
