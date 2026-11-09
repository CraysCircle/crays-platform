import type {Payment,ProductWorld} from './productModel';
import {ownPrivateAccount} from './ownPrivateAccount';
import {ownMembershipInvoices,ownSpaceMemberships,qualifiedSpotPurchase,type EcosystemInvoice} from './ecosystemMemberships';

const nonempty=(value:unknown):value is string=>typeof value==='string'&&!!value.trim();
const statuses=new Set(['prepared','approved','submitted','pending','confirmed','unknown','failed','refunded']);
const objects=(world:ProductWorld)=>Array.isArray(world.objects)?world.objects:[];

/** The original financial authority remains the existing qualified purchase/invoice reader. */
export function exactOwnInvoice(world:ProductWorld,id:string):EcosystemInvoice|undefined{
 if(!ownPrivateAccount(world)||!nonempty(id)||!Array.isArray(world.objects))return;
 const matches=objects(world).filter(row=>row.id===id);if(matches.length!==1)return;
 const row=matches[0];
 if(row.owner!==world.owner||row.subjectId!==undefined&&row.subjectId!==world.owner||row.kind!=='ecosystem-invoice-preview'||row.documentKind!=='design-example'||row.livePayment!==false||row.currency!=='USD'||row.status!=='paid-example'||!Number.isSafeInteger(row.amountMinor)||Number(row.amountMinor)<0||typeof row.issuedAt!=='number'||!Number.isFinite(new Date(row.issuedAt).getTime())||typeof row.invoiceNumber!=='string'||typeof row.sellerName!=='string'||typeof row.storeName!=='string')return;
 const invoice=row as EcosystemInvoice;
 const purchase=nonempty(row.purchaseId)?qualifiedSpotPurchase(world,row.purchaseId):undefined;
 if(row.purchaseId!==undefined&&(!purchase||purchase.owner!==world.owner||purchase.customerMode!=='own-customer-example'||purchase.customerId!==world.owner||purchase.context!==undefined||purchase.state!=='confirmed'||purchase.invoiceId!==row.id||row.subjectId!==world.owner||row.storeName!==purchase.offer.venueName))return;
 if(purchase){
  if(purchase.activation.state==='confirmed'){if(invoice.membershipId!==purchase.membershipId)return;}
  else if(!['not-requested','pending','unknown','failed'].includes(purchase.activation.state)||(purchase.membershipId!==undefined&&purchase.membershipId!=='')||invoice.membershipId!=='')return;
 }
 if(ownMembershipInvoices(world).some(value=>value.id===id))return invoice;
 // Confirmed payment and a separately pending activation are different original states.
 // No membership, payment, invoice or right is created or modified by this exception.
 if(purchase&&['not-requested','pending','unknown','failed'].includes(purchase.activation.state)&&(purchase.membershipId===undefined||purchase.membershipId==='')&&invoice.membershipId===''&&invoice.amountMinor===purchase.offer.amountMinor&&invoice.currency===purchase.offer.currency&&invoice.sellerName===purchase.offer.sellerName)return invoice;
}

function paymentVenue(world:ProductWorld,payment:Payment):string|undefined{
 if(payment.merchantCheckout!==undefined){
  const checkout=payment.merchantCheckout;
  return checkout&&typeof checkout==='object'&&nonempty(checkout.venueId)?checkout.venueId:undefined;
 }
 const sources=objects(world).filter(row=>row.id===payment.sourceId);
 return sources.length===1&&sources[0].owner===world.owner&&nonempty(sources[0].venueId)?sources[0].venueId:undefined;
}

export function exactOwnSpotPayment(world:ProductWorld,venueId:string,id:string):Payment|undefined{
 if(!ownPrivateAccount(world)||!nonempty(id)||!nonempty(venueId)||!Array.isArray(world.payments))return;
 const matches=world.payments.filter(row=>row.id===id);if(matches.length!==1)return;
 const payment=matches[0];
 if(payment.owner!==world.owner||typeof payment.amount!=='string'||!payment.amount.trim()||!nonempty(payment.asset)||typeof payment.purpose!=='string'||!statuses.has(payment.status)||!nonempty(payment.sourceId)||!nonempty(payment.walletId))return;
 return paymentVenue(world,payment)===venueId?payment:undefined;
}

export function originalInvoiceVenue(world:ProductWorld,invoice:EcosystemInvoice):string|undefined{
 if(exactOwnInvoice(world,invoice.id)!==invoice)return;
 if(nonempty(invoice.purchaseId)){
  const purchase=qualifiedSpotPurchase(world,invoice.purchaseId);
  return purchase?.customerMode==='own-customer-example'&&purchase.customerId===world.owner?purchase.offer.venueId:undefined;
 }
 const raw=objects(world).filter(row=>row.id===invoice.membershipId);
 if(raw.length!==1)return;
 const members=ownSpaceMemberships(world).filter(row=>row.id===invoice.membershipId);
 return members.length===1&&nonempty(members[0].storeId)?members[0].storeId:undefined;
}

export function readSpotPaymentRecords(world:ProductWorld,venueId:string){
 const available=ownPrivateAccount(world),payments:Payment[]=[],invoices:EcosystemInvoice[]=[];
 if(!available||!nonempty(venueId))return {available,venue:undefined,payments,invoices,needsReview:false};
 const venues=Array.isArray(world.venues)?world.venues.filter(row=>row.id===venueId):[];
 const venue=venues.length===1&&typeof venues[0].name==='string'&&typeof venues[0].city==='string'?venues[0]:undefined;
 let needsReview=!Array.isArray(world.payments)||!Array.isArray(world.objects);
 for(const row of Array.isArray(world.payments)?world.payments:[]){
  if(row.owner!==world.owner)continue;
  const related=row.merchantCheckout?.venueId===venueId||row.merchantCheckout===undefined&&objects(world).some(source=>source.id===row.sourceId&&source.owner===world.owner&&source.venueId===venueId);
  const payment=exactOwnSpotPayment(world,venueId,row.id);
  if(payment)payments.push(payment);else if(related)needsReview=true;
 }
 for(const row of objects(world)){
  if(row.owner!==world.owner||row.kind!=='ecosystem-invoice-preview'||row.subjectId!==undefined&&row.subjectId!==world.owner)continue;
  const invoice=exactOwnInvoice(world,row.id);
  if(invoice&&originalInvoiceVenue(world,invoice)===venueId){invoices.push(invoice);continue;}
  const sourcePurchase=nonempty(row.purchaseId)?objects(world).filter(source=>source.id===row.purchaseId):[];
  const related=objects(world).some(member=>member.id===row.membershipId&&member.owner===world.owner&&member.storeId===venueId)||sourcePurchase.some(source=>source.owner===world.owner&&typeof source.offer==='object'&&source.offer!==null&&(source.offer as {venueId?:unknown}).venueId===venueId);
  if(related)needsReview=true;
 }
 return {available,venue,payments,invoices,needsReview};
}
