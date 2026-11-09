import {parseHotelMemberStayPreferences, type HotelPreferenceParseResult} from "./hotel-member-preferences";
export type HotelPreferenceEntry = HotelPreferenceParseResult | Readonly<{status:"absent"}>;
// Next.js has already decoded searchParams. Never double-decode or accept a second value.
export function readHotelPreferenceEntry(value: string | string[] | undefined): HotelPreferenceEntry {
 if(value===undefined) return {status:"absent"};
 if(typeof value!=="string" || value.length===0 || value.length>2048) return {status:"invalid_preferences",reason:"invalid_transport"};
 try{return parseHotelMemberStayPreferences(JSON.parse(value));}
 catch{return {status:"invalid_preferences",reason:"invalid_json"};}
}
