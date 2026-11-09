import type {MemberDemoDocumentsRead} from "../../../lib/clubs/member-demo-document-contract";
import type {MemberFinanceRead} from "../../../lib/clubs/member-finance-contract";
import type {MemberServiceOffersRead} from "../../../lib/clubs/member-service-offers-contract";
import type {MemberExperienceRead} from "../../../lib/clubs/member-experience-contract";
import type {OwnTestStays} from "../../../lib/clubs/member-test-stays-contract";
import type {OwnMemberDocuments} from "../../../lib/clubs/member-document-contract";
import type {OwnMemberConversations} from "../../../lib/clubs/member-conversation-contract";
/** Member presentation contracts: existing same-origin BFF only. */
export type MemberView = 'home' | 'search' | 'bookings' | 'support' | 'requests' | 'experiences' | 'services' | 'documents' | 'membership' | 'payments' | 'saved' | 'cart' | 'profile' | 'ambassador';
export type MemberFeed<T> = {kind:'loading'} | {kind:'unavailable'} | {kind:'ready';data:T};
export type MemberBooking = {bookingId:string;publicReference:string;status:string;propertyId:string;arrivalDate:string|null;departureDate:string|null;guestCount:number|null;currency:string|null;totalMinor:number|null};
export type MemberDocument = {documentId:string;kind:string;title:string;createdAt:string;bookingUrn?:string;sourceRecordId?:string|null};
export type MemberOffering = {offeringId:string;bookingId:string;bookingReference:string;displayName:string;serviceCode:string;serviceType:string};
export type MemberCase = {caseId:string;publicReference:string;subject:string;status:string;messageCount:number};
export type MemberWorkspace = {
 finance?:MemberFeed<MemberFinanceRead>;
 serviceOffers?:MemberFeed<MemberServiceOffersRead>;
 bookings:MemberFeed<{bookings:MemberBooking[]}>;
 testStays?:MemberFeed<OwnTestStays>;
 experiences?:MemberFeed<MemberExperienceRead>;
 requests:MemberFeed<{requests:Array<{bookingRequestId:string;publicReference:string;status:string}>}>;
 services:MemberFeed<{services:Array<{selectionId:string;bookingId:string;displayName:string;status:string;requestedFor:string|null}>;availableOfferings?:MemberOffering[]}>;
 documents?:MemberFeed<OwnMemberDocuments>;
 demoDocuments?:MemberFeed<MemberDemoDocumentsRead>;
 conversations?:MemberFeed<OwnMemberConversations>;
 support:MemberFeed<{documents:MemberDocument[];supportCases:MemberCase[]}>;
 membership:MemberFeed<{membership:{status:string;validUntil:string|null}|null;application:{status:string}|null;authorities:{membershipConfirmed:boolean}}>;
 savedProperties?:MemberFeed<{savedPropertyIds:string[]}>;
 savedCart:MemberFeed<{savedPropertyIds:string[];cartItems:unknown[]}>;
};
const properties:Record<string,{title:string;image:string;href:string}>={
 'property-clubs-forest-city-marina':{title:'Forest City Marina Hotel',image:'/__crays-clubs/forest-city-v2552/marina/002-1deca31c18f7f331.jpg',href:'hospitality/marina-hotel'},
 'property-clubs-forest-city-golf':{title:'Forest City Golf Hotel',image:'/__crays-clubs/forest-city-v2552/golf/004-f9f3773022d48f71.jpg',href:'hospitality/golf-hotel'},
};
export function memberProperty(id:string){return properties[id]??null;}
export function memberStatus(value:string){return value.replaceAll('_',' ');}
export function memberCalendarDateValid(value:string|null):value is string{
 if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(`${value}T00:00:00Z`);
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function memberBookingHasValidDates(booking:MemberBooking){
 return memberCalendarDateValid(booking.arrivalDate)&&memberCalendarDateValid(booking.departureDate)&&booking.departureDate>=booking.arrivalDate;
}
export function memberDate(value:string|null,locale:string){
 if(!value||/^\d{4}-\d{2}-\d{2}$/.test(value)&&!memberCalendarDateValid(value))return 'Date to be confirmed';
 const date=new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T12:00:00Z`:value);
 return Number.isFinite(date.getTime())?new Intl.DateTimeFormat(locale,{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date):'Date to be confirmed';
}
export function memberMoney(booking:MemberBooking,locale:string){
 if(booking.totalMinor===null||!Number.isSafeInteger(booking.totalMinor)||!booking.currency||! /^[A-Z]{3}$/.test(booking.currency))return 'Amount not available';
 try {const places=new Intl.NumberFormat(locale,{style:'currency',currency:booking.currency}).resolvedOptions().maximumFractionDigits??2;return new Intl.NumberFormat(locale,{style:'currency',currency:booking.currency}).format(booking.totalMinor/10**places);}catch{return 'Amount not available';}
}
/** Only bookings with a meaningful future/current date are upcoming. No request or hold is promoted. */
export function memberUpcoming(bookings:MemberBooking[],today:string){
 return bookings.filter(b=>!['cancelled','canceled','rejected','expired'].includes(b.status.toLowerCase())&&memberBookingHasValidDates(b)&&(b.departureDate??'')>today).sort((a,b)=>(a.arrivalDate??'').localeCompare(b.arrivalDate??'')||a.bookingId.localeCompare(b.bookingId))[0]??null;
}
