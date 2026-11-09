import "server-only";
import type {HotelPreferenceEntry} from "./hotel-member-preference-entry";
import {HOTEL_PREFERENCE_DISPLAY_CATALOG} from "./hotel-preference-display-catalog";
import {findPublicAmbassador} from "../server/clubs/public-ambassador-page-data";
import type {PublicAmbassadorView} from "./public-ambassador-view";
export type HotelPreferenceSummary=Readonly<{status:"absent"|"invalid_preferences"}>|Readonly<{status:"valid_preferences_only";propertyName:string;roomName:string;dateLabel:string;checkoutLabel:string;durationLabel:string;guestLabel:string;ambassadorLabel:string;paymentLabel:string;labelVersion:string}>;
const day=(date:string)=>new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(date+"T00:00:00Z"));
export type AmbassadorNameReader=(locale:"en",slug:string)=>Promise<Pick<PublicAmbassadorView,"slug"|"name"|"version">|null>;
export async function buildHotelPreferenceSummary(entry:HotelPreferenceEntry,readAmbassador:AmbassadorNameReader=findPublicAmbassador):Promise<HotelPreferenceSummary> {
 if(entry.status!=="valid_preferences_only")return {status:entry.status};
 const p=entry.preferences; const marina=p.propertyId==="property-clubs-forest-city-marina";const catalog=HOTEL_PREFERENCE_DISPLAY_CATALOG[p.propertyId];
 const rooms:Readonly<Record<string,string>>=catalog.rooms;
 const lastIncluded=new Date(Date.parse(p.departureDateExclusive+"T00:00:00Z")-86400000).toISOString().slice(0,10);
 const nights=(Date.parse(p.departureDateExclusive+"T00:00:00Z")-Date.parse(p.arrivalDate+"T00:00:00Z"))/86400000;
 let ambassador:Pick<PublicAmbassadorView,"slug"|"name"|"version">|null=null;
 const institutionalTeamPreference=p.ambassadorSlug==="crays-team";
 if(p.ambassadorSlug && !institutionalTeamPreference){try{const profile=await readAmbassador("en",p.ambassadorSlug);if(profile?.slug===p.ambassadorSlug && Number.isInteger(profile.version) && profile.version>0 && typeof profile.name==="string" && profile.name.trim() && profile.name.length<=180)ambassador=profile;}catch{/* Actual public source unavailable: no static fallback or name inference. */}}
 return {status:"valid_preferences_only",propertyName:marina?"Crays Club Marina":"Crays Golf Hotel",roomName:rooms[p.publicRoomTypeId]??"Room category details pending",dateLabel:marina?`${day(p.arrivalDate)} – ${day(lastIncluded)}`:`Check-in ${day(p.arrivalDate)} · check-out ${day(p.departureDateExclusive)}`,checkoutLabel:marina?`Checkout: ${day(p.departureDateExclusive)}`:"",durationLabel:marina?`${p.calendarMonths} calendar ${p.calendarMonths===1?"month":"months"}`:`${nights} ${nights===1?"night":"nights"}`,guestLabel:`${p.adults} ${p.adults===1?"adult":"adults"} · ${p.childAges.length} ${p.childAges.length===1?"child":"children"}`,ambassadorLabel:institutionalTeamPreference?"Crays Team":ambassador?ambassador.name:p.ambassadorSlug?"Selected ambassador · profile details pending":"Crays Team · routing to be confirmed",paymentLabel:p.paymentSchedulePreference==="MONTHLY"?"Monthly payments requested · payment plan not confirmed":p.paymentSchedulePreference==="FULL_UPFRONT"?"Pay in full requested · no payment taken":"Payment preference to be chosen",labelVersion:catalog.contentVersionId};
}
