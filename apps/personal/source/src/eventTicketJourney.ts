import type {ProductWorld,ActionContext,Entity} from './productModel';
import {ownPrivateAccount} from './ownPrivateAccount';
import {localPreviewId} from './localPreviewId';
export const eventTicketExampleId='web-demo-experience-creative-conversation';
export const ticketOfferVersion='creative-workshop-preview-20261028-v1';
export const ticketTypes=[{id:'admission',name:'Workshop admission',description:'Workshop and shared conversation',unitMinor:2500,capacity:12},{id:'materials',name:'Workshop + materials',description:'Workshop, conversation and a materials kit',unitMinor:4000,capacity:8}] as const;
export type EventTicket={id:string;typeId:string;name:string;unitMinor:number;holder:string;status:'not-issued'|'issued'|'refund-requested'|'refunded';transfer?:{name:string;status:'prepared'|'claimed'}};
export type TicketOrder=Entity&{kind:'event-ticket-order-preview';eventId:string;offerVersion:string;eventName:string;venueId:string;eventDate:string;eventTime:string;timezone:string;currency:'USD';totalMinor:number;createdAt:number;expiresAt:number;status:'review'|'payment-pending'|'paid'|'abandoned';tickets:EventTicket[];paymentId:string;payment:'not-started'|'pending'|'confirmed';invoice:'not-issued'|'pending'|'issued';invoiceNumber?:string;invoiceId?:string;invoiceName:string;billingAddress:string;refundMinor:number;creditNote:'none'|'pending'|'issued';creditNoteId?:string;creditNoteNumber?:string;liveExecution:false};
function need(x:unknown,m:string):asserts x{if(!x)throw Error(m);}
export function eventTicketOffer(w:ProductWorld,eventId:string){
 if(!ownPrivateAccount(w)||w.owner!=='thorben'||w.identity.destination!=='Demo account'||eventId!==eventTicketExampleId)return;
 const events=w.objects.filter(o=>o.id===eventId);const e=events[0];
 if(events.length!==1||e.owner!==w.owner||e.kind!=='event'||e.sourceAuthority!=='fictional-preview'||e.liveExecution!==false||e.status!=='available'||e.venueId!=='harbor-house')return;
 const places=w.venues.filter(v=>v.id===e.venueId);if(places.length!==1||!places[0].operatorActive||!['active','provisional'].includes(places[0].membership))return;
 return {event:e,venue:places[0],types:ticketTypes,version:ticketOfferVersion};
}
function validOrder(o:Entity):boolean{
 if(!Array.isArray(o.tickets)||!o.tickets.length||o.tickets.length>4||o.currency!=='USD'||o.venueId!=='harbor-house'||o.offerVersion!==ticketOfferVersion||o.liveExecution!==false)return false;
 if(!['review','payment-pending','paid','abandoned'].includes(String(o.status))||!['not-started','pending','confirmed'].includes(String(o.payment))||!['not-issued','pending','issued'].includes(String(o.invoice))||!['none','pending','issued'].includes(String(o.creditNote)))return false;
 if(!Number.isSafeInteger(o.totalMinor)||!Number.isSafeInteger(o.refundMinor)||Number(o.refundMinor)<0||Number(o.refundMinor)>Number(o.totalMinor)||!Number.isSafeInteger(o.createdAt)||!Number.isSafeInteger(o.expiresAt)||Number(o.expiresAt)<=Number(o.createdAt)||o.paymentId!==o.id+':payment')return false;
 let sum=0,refunded=0;const ids=new Set();
 for(const t of o.tickets){const type=ticketTypes.find(type=>type.id===t?.typeId);if(!type||t.name!==type.name||t.unitMinor!==type.unitMinor||typeof t.id!=='string'||!t.id.startsWith(o.id+':'+type.id+':')||ids.has(t.id)||typeof t.holder!=='string'||!['not-issued','issued','refund-requested','refunded'].includes(t.status))return false;ids.add(t.id);sum+=t.unitMinor;if(t.status==='refunded')refunded+=t.unitMinor;if(o.payment!=='confirmed'&&t.status!=='not-issued')return false;}
 return sum===o.totalMinor&&refunded===o.refundMinor&&(o.payment!=='confirmed'||o.status==='paid')&&(o.invoice!=='issued'||o.payment==='confirmed'&&o.invoiceId===o.id+':invoice'&&typeof o.invoiceNumber==='string')&&(o.creditNote!=='issued'||o.creditNoteId===o.id+':credit'&&Number(o.refundMinor)>0);
}
export function ownTicketOrders(w:ProductWorld):TicketOrder[]{
 if(!ownPrivateAccount(w))return [];
 return w.objects.filter(o=>o.kind==='event-ticket-order-preview'&&o.owner===w.owner&&o.liveExecution===false&&o.offerVersion===ticketOfferVersion&&w.objects.filter(x=>x.id===o.id).length===1&&o.eventId===eventTicketExampleId&&validOrder(o)) as TicketOrder[];
}
export function ticketOrder(w:ProductWorld,id:string){return ownTicketOrders(w).find(o=>o.id===id);}
/** The historical order remains readable when its event disappears; never substitute another event. */
export function ticketOriginalEvent(w:ProductWorld,orderId:string){
 const order=ticketOrder(w,orderId);if(!order)return;
 const matches=w.objects.filter(o=>o.id===order.eventId);
 return matches.length===1&&matches[0].owner===w.owner&&matches[0].kind==='event'?matches[0]:undefined;
}
function ticketInventoryIntact(w:ProductWorld){
 const raw=w.objects.filter(o=>o.kind==='event-ticket-order-preview'&&o.owner===w.owner&&o.eventId===eventTicketExampleId);
 return raw.every(o=>validOrder(o)&&w.objects.filter(x=>x.id===o.id).length===1);
}
export function ticketAvailability(w:ProductWorld,typeId:string,at=Date.now()){
 const type=ticketTypes.find(t=>t.id===typeId);if(!type||!ticketInventoryIntact(w))return 0;
 return Math.max(0,type.capacity-ownTicketOrders(w).filter(o=>o.status==='paid'||o.status==='payment-pending'||o.status==='review'&&o.expiresAt>at).flatMap(o=>o.tickets).filter(t=>t.typeId===typeId&&t.status!=='refunded').length);
}
export function applyEventTicketJourney(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('event.ticket.'))return;
 need(ownPrivateAccount(w),'Sign in to your own account.');need(!ctx.personId||ctx.personId===w.owner,'Open your own ticket order.');
 if(op==='event.ticket.review'){
  const offer=eventTicketOffer(w,String(ctx.objectId));need(offer,'This ticket offer is unavailable.');need(ticketInventoryIntact(w),'Resolve the original ticket inventory before another review.');need(d.offerVersion===offer.version,'The offer changed. Review its current terms.');
  const lines=offer.types.map(t=>{const raw=d[t.id];need(typeof raw==='string'&&/^[0-4]$/.test(raw),'Choose zero to four tickets of each type.');return {type:t,quantity:Number(raw)};});
  const count=lines.reduce((n,l)=>n+l.quantity,0);need(count>0&&count<=4,'Choose one to four tickets.');
  // Returning to review reopens the SAME pending order, never a new charge or inventory hold.
  const existing=ownTicketOrders(w).filter(o=>o.eventId===offer.event.id&&o.status!=='abandoned'&&(o.status!=='review'||o.expiresAt>Date.now()));need(existing.length<=1,'Resolve the duplicate original order.');
  if(existing.length)return {objectId:existing[0].id,message:'Your original order is retained. Review it before starting another purchase.'};
  for(const l of lines)need(l.quantity<=ticketAvailability(w,l.type.id),'These tickets are no longer available.');
  const id=localPreviewId(),at=Date.now();
  const order:TicketOrder={id,owner:w.owner,kind:'event-ticket-order-preview',eventId:offer.event.id,offerVersion:offer.version,eventName:String(offer.event.name),venueId:offer.venue.id,eventDate:String(offer.event.date),eventTime:String(offer.event.time),timezone:String(offer.event.timezone),currency:'USD',totalMinor:lines.reduce((n,l)=>n+l.type.unitMinor*l.quantity,0),createdAt:at,expiresAt:at+15*60000,status:'review',tickets:lines.flatMap(l=>Array.from({length:l.quantity},(_,i)=>({id:id+':'+l.type.id+':'+i,typeId:l.type.id,name:l.type.name,unitMinor:l.type.unitMinor,holder:'',status:'not-issued' as const}))),paymentId:id+':payment',payment:'not-started',invoice:'not-issued',invoiceName:'',billingAddress:'',refundMinor:0,creditNote:'none',liveExecution:false};
  w.objects.push(order);return {objectId:id,message:'Review your example order. No payment or admission has been created.'};
 }
 const o=ticketOrder(w,String(ctx.objectId));need(o,'This original order is unavailable.');
 if(op==='event.ticket.abandon'){need(o.status==='review','A pending or paid order cannot be discarded.');o.status='abandoned';return {objectId:o.id,message:'Unpaid example order discarded.'};}
 if(op==='event.ticket.payment.start'){
  if(o.payment!=='not-started')return {objectId:o.id,message:'Your existing payment attempt is retained. Check its status.'};
  need(o.status==='review'&&o.expiresAt>Date.now(),'This unpaid review expired. Return to the event.');const offer=eventTicketOffer(w,o.eventId);need(offer,'The current offer or access is unavailable.');need(ticketInventoryIntact(w),'Resolve the original ticket inventory.');need(o.offerVersion===offer.version&&o.eventName===String(offer.event.name)&&o.eventDate===String(offer.event.date)&&o.eventTime===String(offer.event.time)&&o.timezone===String(offer.event.timezone)&&o.venueId===offer.venue.id,'The event changed. Discard this unpaid example order and review the current event.');
  need(d.approved==='Yes'&&d.terms==='Yes','Review the example total and cancellation terms.');
  const name=d.invoiceName?.trim(),address=d.billingAddress?.trim();need(name&&name.length<=120&&address&&address.length<=500,'Enter the invoice name and billing address.');
  const holders=o.tickets.map((_,i)=>d['holder'+i]?.trim());need(holders.every(h=>h&&h.length<=120),'Enter a name for each ticket holder.');
  o.invoiceName=name;o.billingAddress=address;o.tickets.forEach((t,i)=>{t.holder=holders[i];});o.payment='pending';o.status='payment-pending';return {objectId:o.id,message:'Example payment pending. No real money was requested or collected.'};
 }
 if(op==='event.ticket.payment.confirm'){
  need(d.approved==='Yes','Choose the labelled example outcome.');need(o.payment==='pending'||o.payment==='confirmed','Start the reviewed example payment first.');
  if(o.payment==='confirmed')return {objectId:o.id,message:'The same example payment is already confirmed.'};
  o.payment='confirmed';o.status='paid';o.invoice='pending';o.tickets.forEach(t=>{t.status='issued';});return {objectId:o.id,message:'Example payment confirmed; invoice is being created. No real payment or entry right.'};
 }
 if(op==='event.ticket.invoice.reconcile'){
  need(o.payment==='confirmed'&&d.approved==='Yes','Confirm the original example payment first.');
  if(o.invoice!=='issued'){o.invoice='issued';o.invoiceId=o.id+':invoice';o.invoiceNumber='EXAMPLE-'+o.id.slice(0,8).toUpperCase();}
  return {objectId:o.id,message:'The same example invoice is retained, without another charge.'};
 }
 if(op==='event.ticket.refund.request'){
  need(d.approved==='Yes'&&o.payment==='confirmed'&&o.invoice==='issued','Review the paid order and its original invoice first.');need(o.creditNote==='none'&&Date.now()<Date.parse(o.eventDate+'T'+o.eventTime+':00Z'),'This example refund policy is no longer available.');const t=o.tickets.find(t=>t.id===d.ticketId);need(t,'Choose a ticket from this order.');
  if(t.status!=='issued')return {objectId:o.id,message:'The original refund request is retained.'};
  t.status='refund-requested';o.creditNote='pending';return {objectId:o.id,message:'Example refund requested for one ticket. Money has not been returned; invoice correction is pending.'};
 }
 if(op==='event.ticket.refund.confirm'){
  need(d.approved==='Yes'&&o.payment==='confirmed','Choose the labelled example refund outcome.');const t=o.tickets.find(t=>t.id===d.ticketId);need(t&&(t.status==='refund-requested'||t.status==='refunded'),'Request the original ticket refund first.');
  if(t.status!=='refunded'){t.status='refunded';o.refundMinor+=t.unitMinor;}
  return {objectId:o.id,message:'Example payout confirmed. Invoice correction remains a separate record.'};
 }
 if(op==='event.ticket.credit.reconcile'){
  need(d.approved==='Yes'&&o.tickets.some(t=>t.status==='refunded'),'An example refund payout must be confirmed first.');
  // This first sample supports one correction; later refunds remain pending rather than rewriting a prior note.
  need(o.tickets.filter(t=>t.status==='refunded').length===1,'Multiple corrections require separate original credit notes.');
  o.creditNote='issued';o.creditNoteId=o.id+':credit';o.creditNoteNumber='CREDIT-'+o.id.slice(0,8).toUpperCase();
  return {objectId:o.id,message:'Example credit note linked to the original invoice and refunded ticket.'};
 }
 throw Error('Use the original supported ticket action.');
}
export const ticketMoney=(minor:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(minor/100);
