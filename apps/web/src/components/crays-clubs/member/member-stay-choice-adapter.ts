import type {MemberWorkspace,MemberBooking} from "./clubs-member-home-model";
import type {OwnTestStay} from "@/lib/clubs/member-test-stays-contract";

/** A TEST source is a selectable context, never a provider booking authority. */
export type MemberStayChoice =
 | {kind:"booking";key:string;bookingId:string;sourceRecordId:null;title:string;reference:string;arrivalDate:string|null;departureDate:string|null;booking:MemberBooking}
 | {kind:"test_stay";key:string;bookingId:null;sourceRecordId:string;title:string;reference:string;arrivalDate:string;departureDate:string;stay:OwnTestStay};

export function memberStayChoices(workspace:Pick<MemberWorkspace,"bookings"|"testStays">):MemberStayChoice[]{
 const native:MemberStayChoice[]=workspace.bookings.kind==="ready"?workspace.bookings.data.bookings.map(booking=>({kind:"booking",key:`booking:${booking.bookingId}`,bookingId:booking.bookingId,sourceRecordId:null,title:booking.propertyId,reference:booking.publicReference,arrivalDate:booking.arrivalDate,departureDate:booking.departureDate,booking})):[];
 const original:MemberStayChoice[]=workspace.testStays?.kind==="ready"?workspace.testStays.data.stays.map(stay=>({kind:"test_stay",key:`test:${stay.sourceRecordId}`,bookingId:null,sourceRecordId:stay.sourceRecordId,title:stay.propertyDisplayName,reference:stay.publicReference,arrivalDate:stay.arrivalDate,departureDate:stay.departureDate,stay})):[];
 return [...native,...original];
}

export function memberSelectedStay(choices:readonly MemberStayChoice[],key:string):MemberStayChoice|null{
 return choices.find(stay=>stay.key===key)??null;
}

/** Only an original native booking can enter existing booking-scoped RPCs. */
export function memberNativeBookingId(choice:MemberStayChoice|null):string|null{
 return choice?.kind==="booking"?choice.bookingId:null;
}

export function memberDocumentMatchesStay(document:{bookingUrn?:string;sourceRecordId?:string|null},choice:MemberStayChoice|null):boolean{
 if(!choice)return true;
 return choice.kind==="booking"?document.bookingUrn===`urn:crays:clubs:booking:${choice.bookingId}`:document.sourceRecordId===choice.sourceRecordId;
}
