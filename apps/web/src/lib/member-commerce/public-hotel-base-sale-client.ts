import {checkedPublicHotelBaseSale,type PublicHotelBaseSale} from "./clubs-public-hotel-base-sale-contract";
type ExpectedSale={propertyId:string;asOf:string};
/** Same strict production planning DTO as the BFF. No seed, native rate or validity window is inferred. */
export function parsePublicHotelBaseSale(raw:unknown,expected:ExpectedSale):Readonly<PublicHotelBaseSale>|null {
 try{return Object.freeze(checkedPublicHotelBaseSale(raw,expected));}catch{return null;}
}
export function publicHotelBaseSaleDisplay(raw:unknown,expected:ExpectedSale) {
 const sale=parsePublicHotelBaseSale(raw,expected);
 if(!sale||sale.status!=="ready"||sale.fromUnitMinor===null||sale.currency===null)return null;
 const money=new Intl.NumberFormat('en-US',{style:'currency',currency:sale.currency,maximumFractionDigits:2,minimumFractionDigits:0}).format(Number(sale.fromUnitMinor)/100);
 return Object.freeze({label:`From ${money} / ${sale.calendarUnit==='calendar-month'?'calendar month':'night'}`,context:'Room and Crays services. Availability and the final price are confirmed separately.',sourcePublicationId:sale.sourcePublicationId,sourceAdmissionSha256:sale.sourceAdmissionSha256,quoteUnavailable:true});
}
