import {readHotelPreferenceEntry, type HotelPreferenceEntry} from "./hotel-member-preference-entry";
export const HOTEL_PREFERENCE_COOKIE="crays_member_stay_preferences_test";
export function readHotelPreferenceCookie(value:string|undefined):HotelPreferenceEntry {
 if(value===undefined)return {status:"absent"};
 if(value.length>2732 || !/^[A-Za-z0-9_-]+$/.test(value))return {status:"invalid_preferences",reason:"invalid_cookie_transport"};
 const raw=Buffer.from(value,"base64url").toString("utf8");
 if(Buffer.from(raw,"utf8").toString("base64url")!==value)return {status:"invalid_preferences",reason:"invalid_cookie_transport"};
 return readHotelPreferenceEntry(raw);
}
