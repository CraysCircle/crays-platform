import {localPreviewId} from "./localPreviewId.ts";
import type {ActionContext,ActionResult,Entity,ProductWorld} from './productModel.ts';
import {guestVenueCatalogue,cataloguePriceUnits,type GuestCatalogueItem,type CatalogueStayTerms} from './venueCatalogue.ts';
import {reminderTime} from './reminders.ts';
export type CatalogueServiceForm={itemId:string;variantId:string;date:string;time:string;timezone:string;partySize:string;notes:string;checkOutDate?:string;rooms?:string};
export type CatalogueServiceSnapshot={stay?:CatalogueStayTerms;image?:string;sourceAuthority?:'fictional-preview';venueId:string;catalogueId:string;catalogueVersion:number;itemId:string;name:string;description:string;variantId:string;variantName:string;externalVariantId:string;sku:null;priceVersion:string;sellerId:string;channelId:string;unit:string;unitPrice:string;sourcePrice:string;sourceCurrency?:string;currency:string;duration:string|null;availability:GuestCatalogueItem['availability'];taxStatus:GuestCatalogueItem['taxStatus'];taxBasis:'unknown';validFrom:string|null;validUntil:string|null};
export type CatalogueServiceReview=Entity&{kind:'catalogue-service-review';venueId:string;sourceSnapshot:CatalogueServiceSnapshot;sourceFingerprint:string;request:CatalogueServiceForm;requestFingerprint:string;requestedAt:number;status:'reviewed'|'requested';bookingId?:string;requestKey?:string;createdAt:number;liveExecution:false};
export type CreateExistingBooking=(world:ProductWorld,payload:Record<string,string>,context:ActionContext)=>ActionResult;
function need(test:unknown,message:string):asserts test{if(!test)throw Error(message);}
export function catalogueServiceSnapshot(w:ProductWorld,venueId:string,itemId:string,variantId:string):CatalogueServiceSnapshot{
 need(w.identity.signedIn,'Sign in to request your own service.');
 const item=guestVenueCatalogue(w,venueId)?.find(i=>i.id===itemId&&i.kind==='service');need(item,'This service is no longer available to you in this Spot. Return to the current services.');
 need(item.venueId===venueId&&!!item.sellerId?.trim()&&!!item.channelId?.trim(),'The original service seller and Spot mapping is incomplete or inconsistent.');
 need(item.availability!=='unavailable','This service is currently unavailable.');
 const variant=item.variants.find(v=>v.variantId===variantId);need(variant&&variant.currency==='USD'&&cataloguePriceUnits(variant.spacePrice,variant.currency)!==undefined,'Choose this service’s exact priced variant.');
 const stay=item.stay?validateStayTerms(item):undefined;
 return {...(stay?{stay}:{}),image:item.image,sourceAuthority:item.sourceAuthority,venueId,catalogueId:item.catalogueId,catalogueVersion:item.catalogueVersion,itemId:item.id,name:item.name,description:item.description,variantId:variant.variantId,variantName:variant.label,externalVariantId:variant.externalVariantId,sku:null,priceVersion:variant.priceVersion,sellerId:item.sellerId,channelId:item.channelId,unit:item.unit,unitPrice:variant.spacePrice,sourcePrice:variant.sourcePrice,sourceCurrency:variant.sourceCurrency||variant.currency,currency:variant.currency,duration:item.serviceDuration?.trim()||null,availability:item.availability,taxStatus:item.taxStatus,taxBasis:'unknown',validFrom:item.validFrom||null,validUntil:item.validUntil||null};
}
function exactForm(d:Record<string,string>):CatalogueServiceForm{
 for(const field of ['itemId','variantId','date','time','timezone','partySize'])need(typeof d[field]==='string'&&!!d[field].trim(),'Choose the service, date, time, time zone and number of guests.');
 need(/^\d+$/.test(d.partySize)&&Number.isSafeInteger(Number(d.partySize))&&Number(d.partySize)>0,'Choose a valid positive number of guests.');
 need(typeof(d.notes||'')==='string'&&(d.notes||'').length<=4000,'Keep this service note within 4,000 characters.');
 return {itemId:d.itemId,variantId:d.variantId,date:d.date,time:d.time,timezone:d.timezone,partySize:String(Number(d.partySize)),notes:d.notes||'',...(d.checkOutDate!==undefined||d.rooms!==undefined?{checkOutDate:d.checkOutDate||'',rooms:d.rooms||''}:{})};
}
const ownReview=(w:ProductWorld,id:string)=>{const rows=w.objects.filter(o=>o.id===id);return rows.length===1&&rows[0].owner===w.owner&&rows[0].kind==='catalogue-service-review'?rows[0] as CatalogueServiceReview:undefined;};
export function catalogueServiceReview(w:ProductWorld,id:string){return w.identity.signedIn?ownReview(w,id):undefined;}
/** Reviews and booking requests are local planning originals, not provider confirmations or payments. */
export function applyCatalogueServiceBooking(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext,createBooking:CreateExistingBooking):{objectId:string;message:string}|undefined{
 if(!op.startsWith('complete.catalogue-service.'))return;
 need(w.identity.signedIn,'Sign in before preparing a service request.');
 if(op.startsWith('complete.catalogue-service.stay.'))return applyStayAction(w,op,d,ctx);
 if(op==='complete.catalogue-service.review'){
  need(ctx.venueId,'Choose the exact service Spot.');const form=exactForm(d),source=catalogueServiceSnapshot(w,ctx.venueId,form.itemId,form.variantId);
  if(source.stay)catalogueStayQuote(source,form);else need(form.checkOutDate===undefined&&form.rooms===undefined,'Stay fields require an exact room offer.');
  const requestedAt=reminderTime(form.date,form.time,form.timezone);need(requestedAt>Date.now(),'Choose a future service time.');
  const review:CatalogueServiceReview={id:localPreviewId(),owner:w.owner,kind:'catalogue-service-review',venueId:ctx.venueId,sourceSnapshot:structuredClone(source),sourceFingerprint:JSON.stringify(source),request:form,requestFingerprint:JSON.stringify(form),requestedAt,status:'reviewed',createdAt:Date.now(),liveExecution:false};
  w.objects.unshift(review);return {objectId:review.id,message:'Exact service request ready for review. No booking, availability confirmation or payment yet.'};
 }
 need(op==='complete.catalogue-service.request','This service action is unavailable.');
 const review=ownReview(w,ctx.objectId||'');need(review,'Open your own exact service request review.');
 need(!ctx.venueId||ctx.venueId===review.venueId,'Return to this review’s original Spot.');
 need(d.approved==='Yes','Approve this exact service, variant, date, time, guests and displayed price first.');
 const key=(d.requestKey||'').trim();need(!!key&&key.length<=200,'Keep a stable service request reference.');
 need(JSON.stringify(review.request)===review.requestFingerprint&&JSON.stringify(review.sourceSnapshot)===review.sourceFingerprint,'This review changed. Prepare the exact request again.');
 const originals=w.objects.filter(o=>o.kind==='booking'&&o.catalogueServiceReviewId===review.id);need(originals.length<=1,'Conflicting original service bookings need review.');const original=originals[0];if(original)need(original.owner===w.owner,'Return to your own service request.');
 if(original){need(original.id===review.bookingId&&original.requestKey===key,'This service already has an original booking request. Open that original.');return {objectId:original.id,message:'Your original service request is open. No second booking or payment was created.'};}
 need(review.status==='reviewed'&&!review.bookingId,'Open the original request instead of creating a replacement.');
 need(!w.objects.some(o=>o.owner===w.owner&&o.kind==='booking'&&o.requestKey===key),'This request reference already belongs to another original booking.');
 const current=catalogueServiceSnapshot(w,review.venueId,review.request.itemId,review.request.variantId);need(JSON.stringify(current)===review.sourceFingerprint,'The service or its price changed. Review its current version before requesting.');
 if(current.stay)catalogueStayQuote(current,review.request);
 const at=reminderTime(review.request.date,review.request.time,review.request.timezone);need(at===review.requestedAt&&at>Date.now(),'This service time has passed or changed. Review a future time.');
 const payload={name:current.name,date:review.request.date,time:review.request.time,timezone:review.request.timezone,partySize:review.request.partySize,notes:review.request.notes,participants:review.request.partySize==='1'?'You':`You and your party of ${review.request.partySize}`};
 const result=createBooking(w,payload,{featureId:'AL-297',venueId:review.venueId,...(current.stay?{}:{sourceId:review.id})});
 need(result.ok,result.message);need(result.world.owner===w.owner,'The active booking account changed.');
 const booking=result.world.objects.find(o=>o.id===result.objectId&&o.owner===w.owner&&o.kind==='booking');
 need(booking&&booking.venueId===review.venueId&&booking.sourceId===(current.stay?'':review.id)&&booking.status==='requested'&&booking.date===payload.date&&booking.time===payload.time&&booking.timezone===payload.timezone&&booking.partySize===payload.partySize,'The original booking response did not match this request. No result was adopted.');
 const returnedReview=ownReview(result.world,review.id);need(returnedReview&&returnedReview.requestFingerprint===review.requestFingerprint&&returnedReview.sourceFingerprint===review.sourceFingerprint&&returnedReview.status==='reviewed','The reviewed source was not preserved in the original booking response.');
 // Adopt only the successful existing Booking operation. A failed callback never leaks its world.
 Object.assign(w,result.world);const saved=ownReview(w,review.id)!;const originalBooking=w.objects.find(o=>o.id===booking.id)!;
 Object.assign(originalBooking,{sourceId:saved.id,catalogueServiceReviewId:saved.id,catalogueServiceSnapshot:structuredClone(saved.sourceSnapshot),catalogueServiceRequestSnapshot:structuredClone(saved.request),requestKey:key,catalogueId:current.catalogueId,catalogueVersion:current.catalogueVersion,catalogueItemId:current.itemId,catalogueVariantId:current.variantId,externalVariantId:current.externalVariantId,priceVersion:current.priceVersion,sellerId:current.sellerId,channelId:current.channelId,priceStatus:`${current.unitPrice} ${current.currency} / ${current.unit} advertised; total and taxes awaiting venue confirmation`,capacity:'Awaiting venue confirmation',realBooking:false});
 if(current.stay){const quote=catalogueStayQuote(current,saved.request);Object.assign(originalBooking,{clubStay:{version:1,requestId:key,state:'requested',quote,history:[{at:Date.now(),state:'requested',requestId:key}],commands:[]},priceStatus:quote.totalMinor===null?'Exact total requires seller confirmation':`${(quote.totalMinor/100).toFixed(2)} USD · fictional stay total; no payment`});}
 saved.status='requested';saved.bookingId=originalBooking.id;saved.requestKey=key;
 return {objectId:originalBooking.id,message:'Service request saved on your original booking. The venue must confirm the time, capacity and final price. Nothing was paid.'};
}

function validateStayTerms(item:GuestCatalogueItem):CatalogueStayTerms{
 const t=item.stay!;need(item.kind==='service'&&item.unit==='room-night'&&item.sourceAuthority==='fictional-preview'&&t.source==='explicit-fictional-club-room-v1'&&t.liveExecution===false,'Review this exact fictional room source.');
 need(Object.keys(t).sort().join('|')===['source','liveExecution','roomType','maxGuestsPerRoom','maxRooms','maxNights','checkInTime','checkOutTime','timezone','cancellation','feeMinor','taxMinor'].sort().join('|'),'Room terms changed shape.');
 need(typeof t.roomType==='string'&&t.roomType.trim()&&typeof t.cancellation==='string'&&t.cancellation.trim(),'Room type and cancellation terms are required.');
 for(const n of [t.maxGuestsPerRoom,t.maxRooms,t.maxNights])need(Number.isSafeInteger(n)&&n>0&&n<=100,'Review bounded room capacity.');
 for(const n of [t.feeMinor,t.taxMinor])need(n===null||Number.isSafeInteger(n)&&n>=0,'Use exact USD cents or unknown charges.');
 reminderTime('2099-01-01',t.checkInTime,t.timezone);reminderTime('2099-01-02',t.checkOutTime,t.timezone);return structuredClone(t);
}
function calendarDay(value:string){need(/^\d{4}-\d{2}-\d{2}$/.test(value),'Choose a real stay date.');const ms=Date.parse(`${value}T00:00:00Z`);need(Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===value,'Choose a real stay date.');return ms;}
export function catalogueStayQuote(source:CatalogueServiceSnapshot,request:CatalogueServiceForm){
 need(source.stay,'This is not a room-night offer.');const t=validateStayTerms({...source,kind:'service',variants:[]} as unknown as GuestCatalogueItem);
 const nights=(calendarDay(request.checkOutDate||'')-calendarDay(request.date))/86400000;
 need(Number.isSafeInteger(nights)&&nights>0&&nights<=t.maxNights,'Check-out must follow check-in within this offer’s night limit.');
 need(/^[1-9]\d*$/.test(request.rooms||'')&&Number(request.rooms)<=t.maxRooms,'Choose a valid room count.');const rooms=Number(request.rooms),guests=Number(request.partySize);
 need(Number.isSafeInteger(guests)&&guests>0&&guests<=rooms*t.maxGuestsPerRoom,'This party exceeds the stated room capacity.');
 need(request.time===t.checkInTime&&request.timezone===t.timezone,'Use this room source’s exact check-in time and time zone.');
 const unitMinor=cataloguePriceUnits(source.unitPrice,'USD');need(source.currency==='USD'&&unitMinor!==undefined,'Review the exact USD room-night price.');
 const base=BigInt(unitMinor!)*BigInt(nights)*BigInt(rooms);need(base<=BigInt(Number.MAX_SAFE_INTEGER),'This stay amount is too large.');const total=t.feeMinor===null||t.taxMinor===null?null:base+BigInt(t.feeMinor)+BigInt(t.taxMinor);need(total===null||total<=BigInt(Number.MAX_SAFE_INTEGER),'This stay total is too large.');
 return {currency:'USD' as const,nights,rooms,guests,unitMinor:unitMinor!,baseMinor:Number(base),feeMinor:t.feeMinor,taxMinor:t.taxMinor,totalMinor:total===null?null:Number(total),checkInDate:request.date,checkOutDate:request.checkOutDate!,checkInTime:t.checkInTime,checkOutTime:t.checkOutTime,timezone:t.timezone,cancellation:t.cancellation};
}
export type ClubStayRecord={version:number;requestId:string;state:'requested'|'unknown'|'confirmed'|'failed'|'cancellation-requested'|'cancelled';quote:ReturnType<typeof catalogueStayQuote>;history:{at:number;state:string;requestId:string}[];commands:{key:string;request:string}[]};
export function catalogueStayBooking(w:ProductWorld,id:string){
 const rows=w.objects.filter(o=>o.id===id);const b=rows[0];if(!w.identity.signedIn||rows.length!==1||b?.owner!==w.owner||b.kind!=='booking')return;
 const review=ownReview(w,String(b.catalogueServiceReviewId||''));if(!review?.sourceSnapshot.stay)return;
 const record=b.clubStay as ClubStayRecord;try{need(review.bookingId===b.id&&review.status==='requested'&&JSON.stringify(review.sourceSnapshot)===review.sourceFingerprint&&JSON.stringify(review.request)===review.requestFingerprint,'Original stay review changed.');need(JSON.stringify(b.catalogueServiceSnapshot)===review.sourceFingerprint&&JSON.stringify(b.catalogueServiceRequestSnapshot)===review.requestFingerprint&&b.venueId===review.venueId&&b.requestKey===review.requestKey,'Original stay binding changed.');need(record&&record.version>0&&Number.isSafeInteger(record.version)&&Array.isArray(record.history)&&Array.isArray(record.commands)&&record.requestId&&record.history.length>0&&record.history.at(-1)?.state===record.state&&record.history.at(-1)?.requestId===record.requestId&&new Set(record.commands.map(c=>c.key)).size===record.commands.length&&b.status===record.state&&['requested','unknown','confirmed','failed','cancellation-requested','cancelled'].includes(record.state),'Original stay status changed.');need(JSON.stringify(catalogueStayQuote(review.sourceSnapshot,review.request))===JSON.stringify(record.quote),'Stay quote changed.');return {booking:b,review,record};}catch{return;}
}
export function catalogueStayActionReview(w:ProductWorld,id:string,action:'response'|'cancel'){const original=catalogueStayBooking(w,id);need(original,'Open this own exact stay original.');return JSON.stringify({owner:w.owner,id,action,version:original!.record.version,requestId:original!.record.requestId,state:original!.record.state,source:original!.review.sourceFingerprint,request:original!.review.requestFingerprint,quote:original!.record.quote});}
function applyStayAction(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext){
 const original=catalogueStayBooking(w,ctx.objectId||'');need(original,'Open your own unchanged room-stay request.');const {booking,record}=original!;need(!ctx.venueId||ctx.venueId===booking.venueId,'Return to this exact Club.');need(d.approved==='Yes'&&d.exampleConfirmed==='Yes'&&d.actionKey?.trim(),'Personally review this labelled fictional response.');
 const action=op.endsWith('.cancel')?'cancel':op.endsWith('.response')?'response':undefined;need(action,'Unsupported stay action.');const command=JSON.stringify({op,review:d.review,outcome:d.outcome||''});const previous=record.commands.filter(c=>c.key===d.actionKey);if(previous.length){need(previous.length===1&&previous[0].request===command,'This action key belongs to a different review.');return {objectId:booking.id,message:'Same fictional stay action retained; no second request or payment.'};}
 need(d.review===catalogueStayActionReview(w,booking.id,action!),'Stay version changed. Review the same original again.');
 if(action==='cancel'){need(['requested','confirmed','failed'].includes(record.state),'Reconcile the original unknown request before cancelling.');record.requestId=localPreviewId();record.state='cancellation-requested';}
 else {need(['requested','unknown','cancellation-requested'].includes(record.state),'This stay has a final response.');const cancelling=record.history.some(h=>h.requestId===record.requestId&&h.state==='cancellation-requested');need((cancelling?['unknown','cancelled','failed']:['unknown','confirmed','failed']).includes(d.outcome),'Choose the matching original response.');if(d.outcome==='confirmed')need(record.quote.totalMinor!==null,'Unknown charges prevent a confirmed stay example.');record.state=d.outcome as ClubStayRecord['state'];}
 booking.status=record.state;record.version++;record.history.push({at:Date.now(),state:record.state,requestId:record.requestId});record.commands.push({key:d.actionKey,request:command});return {objectId:booking.id,message:'Original fictional stay updated. No real hotel booking, payment, presence or membership was created.'};
}
