import type {MemberDemoCommerce} from './member-demo-commerce-client';
import type {MemberFinanceRead,MemberFinanceOrderLine} from './member-finance-contract';
export type CorrelatedCommerceCommandReceipt={commandId:string;idempotencyKey:string;cartId:string|null;expectedVersion:number;expectedTotalMinor:number|null;action:'add'|'adjust'|'remove'|'checkout'|'restart';state:'applied'|'unknown'|'rejected';orderId:string|null;orderCode:string|null;errorCode:string|null};
type NativeCartLine=NonNullable<MemberDemoCommerce['cart']>['lines'][number];
export type OriginalCheckoutCartSnapshot={commandId:string;idempotencyKey:string;accountId:string;cartId:string;cartVersion:number;expectedVersion:number;orderId:string;orderCode:string;currency:'USD';totalMinor:number;expectedTotalMinor:number;lines:readonly NativeCartLine[]};
export type MemberCheckoutConfirmation={state:'unconfirmed'|'unavailable'|'finance_pending'|'confirmed';
 commandId:string|null;orderId:string|null;orderCode:string|null;totalMinor:number|null;currency:'USD';
 lines:readonly MemberFinanceOrderLine[];reviewedCartLines:readonly NativeCartLine[];
 financeState:'pending'|'unknown'|'rejected'|'acknowledged';invoiceId:string|null;invoiceHref:string|null;
 payment:'unconfirmed'|'not_required'|'test_payment_recorded';testOnly:true;liveMoney:false};
const empty=(state:MemberCheckoutConfirmation['state']):MemberCheckoutConfirmation=>({state,commandId:null,orderId:null,orderCode:null,totalMinor:null,currency:'USD',lines:[],reviewedCartLines:[],financeState:'pending',invoiceId:null,invoiceHref:null,payment:'unconfirmed',testOnly:true,liveMoney:false});
const isAmount=(n:number)=>Number.isSafeInteger(n)&&n>=0;
function validDate(date:string|null){if(date===null)return true;if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;const n=new Date(date+'T12:00:00Z');return Number.isFinite(n.getTime())&&n.toISOString().slice(0,10)===date;}
function originalCartLines(snapshot:OriginalCheckoutCartSnapshot|null,receipt:CorrelatedCommerceCommandReceipt,selected:MemberDemoCommerce['orders'][number],accountId:string):readonly NativeCartLine[]|null{
 if(!snapshot)return [];
 if(snapshot.commandId!==receipt.commandId||snapshot.idempotencyKey!==receipt.idempotencyKey||snapshot.cartId!==receipt.cartId||snapshot.expectedVersion!==receipt.expectedVersion||snapshot.expectedTotalMinor!==receipt.expectedTotalMinor||snapshot.accountId!==accountId||snapshot.cartId!==selected.cartId||snapshot.orderId!==receipt.orderId||snapshot.orderCode!==receipt.orderCode||snapshot.currency!=='USD'||!Number.isSafeInteger(snapshot.cartVersion)||snapshot.cartVersion<1||snapshot.expectedVersion!==snapshot.cartVersion||selected.version!==snapshot.expectedVersion+1||!isAmount(snapshot.totalMinor)||snapshot.totalMinor!==snapshot.expectedTotalMinor||snapshot.totalMinor!==selected.order.totalWithTax||!Array.isArray(snapshot.lines)||snapshot.lines.length<1||snapshot.lines.length>100)return null;
 const ids=new Set<string>();let sum=0;
 for(const l of snapshot.lines){
  if(!l.lineId||ids.has(l.lineId)||!l.offerId||!l.slotId||!l.title||!validDate(l.date)||l.date===null||!Number.isSafeInteger(l.quantity)||l.quantity<1||l.quantity>100||!isAmount(l.unitPriceMinor)||l.imageAssetId!==null&&(typeof l.imageAssetId!=='string'||!l.imageAssetId))return null;
  ids.add(l.lineId);sum+=l.quantity*l.unitPriceMinor;
 }
 if(!isAmount(sum)||sum!==snapshot.totalMinor)return null;
 return snapshot.lines.map(l=>({...l}));
}
/** Render-only original feed join; no server authorization or purchase effect.
 * The optional snapshot is captured from the admitted own cart immediately before
 * submitting this exact reviewed checkout. Retain immutable body/version/total
 * through uncertain outcomes; bind commandId only from exact server receipt.
 * It is displayed separately from ERP lines, never used to create an invoice.
 */
export function memberCheckoutConfirmation(receipt:CorrelatedCommerceCommandReceipt|null,commerce:MemberDemoCommerce|null,finance:MemberFinanceRead|null,expectedAccountId:string,snapshot:OriginalCheckoutCartSnapshot|null=null):MemberCheckoutConfirmation{
 if(!receipt||receipt.action!=='checkout'||receipt.state!=='applied'||!receipt.commandId||!receipt.orderId||!receipt.orderCode)return empty('unconfirmed');
 if(!expectedAccountId||!commerce||commerce.accountId!==expectedAccountId||commerce.currency!=='USD'||commerce.testOnly!==true||commerce.liveMoney!==false)return empty('unavailable');
 const matches=commerce.orders.filter(o=>o.order.id===receipt.orderId);if(matches.length!==1)return empty('unavailable');
 const selected=matches[0],order=selected.order;
 if(!receipt.idempotencyKey||!receipt.cartId||selected.cartId!==receipt.cartId||!Number.isSafeInteger(receipt.expectedVersion)||receipt.expectedVersion<1||selected.version!==receipt.expectedVersion+1||receipt.expectedTotalMinor!==order.totalWithTax||order.code!==receipt.orderCode||order.currencyCode!=='USD'||order.state!=='PaymentSettled'||!isAmount(order.totalWithTax))return empty('unavailable');
 const captured=originalCartLines(snapshot,receipt,selected,expectedAccountId);if(captured===null)return empty('unavailable');
 const base:MemberCheckoutConfirmation={...empty('finance_pending'),commandId:receipt.commandId,orderId:order.id,orderCode:order.code,totalMinor:order.totalWithTax,reviewedCartLines:captured,financeState:selected.financeState??'pending',payment:order.totalWithTax===0?'not_required':'test_payment_recorded'};
 if(!finance)return base;
 if(finance.accountId!==expectedAccountId||finance.sourceAuthority!=='test_only')return empty('unavailable');
 const financial=finance.orders.filter(o=>o.orderId===order.id);if(financial.length===0)return base;if(financial.length!==1)return empty('unavailable');
 const f=financial[0];const ids=new Set<string>();let sum=0;
 if(f.currency!=='USD'||f.totalMinor!==order.totalWithTax||f.testOnly!==true)return empty('unavailable');
 // Current Finance v2 exposes ACK rows only. If a future actual producer exposes
 // pending/unknown rows, preserve the native purchase and reviewed products;
 // never interpret them as an invoice/payment projection.
 if((f.financeState as string)!=='erp_acknowledged'){
  const pending=f.financeState as string;if(!['pending','unknown','rejected'].includes(pending))return empty('unavailable');
  if(Array.isArray(f.lines)&&f.lines.length){
   const lineIds=new Set<string>();let pendingSum=0;
   for(const l of f.lines){if(!l.lineId||lineIds.has(l.lineId)||!l.offerId||l.currency!=='USD'||!Number.isSafeInteger(l.quantity)||l.quantity<1||!isAmount(l.unitPriceMinor)||!isAmount(l.grossTotalMinor)||l.quantity*l.unitPriceMinor!==l.grossTotalMinor||!validDate(l.date))return empty('unavailable');lineIds.add(l.lineId);pendingSum+=l.grossTotalMinor;}
   if(!isAmount(pendingSum)||pendingSum!==f.totalMinor)return empty('unavailable');
  }
  return {...base,financeState:pending as 'pending'|'unknown'|'rejected'};
 }
 if(f.outstandingMinor!==0||!f.lines.length)return empty('unavailable');
 for(const line of f.lines){
  if(ids.has(line.lineId)||!line.lineId||!line.offerId||!line.title||line.currency!=='USD'||line.testOnly!==true||line.financeState!=='erp_acknowledged'||line.bookingState!=='booked_test'||!Number.isSafeInteger(line.quantity)||line.quantity<1||!isAmount(line.unitPriceMinor)||!isAmount(line.grossTotalMinor)||line.quantity*line.unitPriceMinor!==line.grossTotalMinor||!validDate(line.date))return empty('unavailable');
  ids.add(line.lineId);sum+=line.grossTotalMinor;
 }
 if(!isAmount(sum)||sum!==f.totalMinor)return empty('unavailable');
 if(order.totalWithTax===0&&(f.paymentId!==null||f.paymentEntryId!==null)||order.totalWithTax>0&&(!f.paymentId||!f.paymentEntryId))return empty('unavailable');
 if(captured.length&&(captured.length!==f.lines.length||captured.some(c=>!f.lines.some(l=>l.lineId===c.lineId&&l.offerId===c.offerId&&l.quantity===c.quantity&&l.unitPriceMinor===c.unitPriceMinor&&(l.date===null||l.date===c.date)))))return empty('unavailable');
 base.lines=f.lines.map(l=>({...l}));base.reviewedCartLines=[];
 if(selected.financeState!=='acknowledged'||selected.integrationComplete!==true)return base;
 if(!/^ACC-SINV-[0-9]{4}-[0-9]{5,}$/.test(f.invoiceId))return empty('unavailable');
 return {...base,state:'confirmed',financeState:'acknowledged',invoiceId:f.invoiceId,invoiceHref:'/api/clubs/member-self/invoices/'+encodeURIComponent(f.invoiceId)};
}
