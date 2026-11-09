/** Browser-only projection mapper. Content authority stays in Core; money/inventory never come from this DTO. */
export const CORE_PUBLIC_HOSPITALITY_SCHEMA = "crays.hospitality.public-content-ui.v1";
export type CoreHotelId = "property-clubs-forest-city-golf" | "property-clubs-forest-city-marina";
type Item = { id: string; label: string; description: string; details: string[] };
type Media = { assetId: string; url: string; width: number; height: number; alt: string; caption: string; purpose: "gallery" | "hero"; galleryGroup: string; galleryOrder: number; maxCssWidth: number; maxDevicePixelRatio: number; searchPlacements?: string[] };
export type CoreHotelView = {
 propertyId: CoreHotelId; canonicalName: string; officialName: string; contentVersionId: string; contentSha256: string;
 copy: Record<string,string>; address: string; facilities: Item[]; dining: Item[]; meetings: Item[];
 rooms: {publicRoomTypeId:string; name:string; description:string; providerRoomTypeId:null}[];
 media: Media[]; hero: Media | null; map: {embedUrl:string; placeUrl:string; directionsUrl:string; latitude:null; longitude:null; coordinateStatus:"exact-pin-unverified"; loadPolicy:"after-user-consent"|"on-page-load"};
 bookingGranted:false; nativeReadGranted:false;
};
const groups=["Exterior","Facilities","Dining","Golf & Beach","Meetings & Events","Property gallery","Rooms & Suites"];
const copyKeys=["headline","cardSummary","overview","locationText","amenitiesIntroduction","diningIntroduction","meetingsIntroduction","roomIntroduction","seoTitle","seoDescription"];
function rec(v:unknown):Record<string,unknown>{if(!v||typeof v!=="object"||Array.isArray(v))throw Error("CORE_CONTENT_INVALID");return v as Record<string,unknown>;}
function exact(v:Record<string,unknown>,keys:string[]){if(Object.keys(v).length!==keys.length||keys.some(k=>!(k in v)))throw Error("CORE_CONTENT_FIELDS_INVALID");}
function text(v:unknown,max=10000):string {if(typeof v!=="string"||!v.trim()||v.length>max)throw Error("CORE_CONTENT_TEXT_INVALID");return v;}
function strings(v:unknown):string[]{if(!Array.isArray(v)||v.some(x=>typeof x!=="string"))throw Error("CORE_CONTENT_ARRAY_INVALID");return v;}
function https(v:unknown):string {const s=text(v,2048);const u=new URL(s);if(u.protocol!=="https:"||u.username||u.password)throw Error("CORE_MAP_URL_INVALID");return s;}
function items(v:unknown):Item[]{if(!Array.isArray(v))throw Error("CORE_SECTION_INVALID");return v.map(x=>{const r=rec(x);exact(r,["id","label","description","details","sourceIds"]);if(strings(r.sourceIds).length)throw Error("CORE_PUBLIC_PROVENANCE_INVALID");return {id:text(r.id,200),label:text(r.label,300),description:text(r.description),details:strings(r.details)};});}
function positive(v:unknown):number{if(typeof v!=="number"||!Number.isFinite(v)||v<=0)throw Error("CORE_MEDIA_DIMENSION_INVALID");return v;}
export function readCoreHotelView(value:unknown,expectedPropertyId:CoreHotelId):CoreHotelView {
 const e=rec(value);exact(e,["schema","version","propertyId","status","code","authority","nativeReadGranted","bookingGranted","content"]);
 if(e.schema!==CORE_PUBLIC_HOSPITALITY_SCHEMA||e.version!=="1.0.0"||e.propertyId!==expectedPropertyId||e.status!=="ready"||e.code!=="HOSPITALITY_PUBLIC_CONTENT_READY"||e.authority!=="stored-approved-core-public-projection"||e.nativeReadGranted!==false||e.bookingGranted!==false)throw Error("CORE_CONTENT_NOT_READY");
 const c=rec(e.content);exact(c,["propertyId","locale","canonicalName","copy","location","facilities","dining","meetings","rooms","contentVersionId","contentSha256","media"]);
 if(c.propertyId!==expectedPropertyId||c.locale!=="en")throw Error("CORE_PROPERTY_MISMATCH");
 const copy=rec(c.copy);const admittedCopyKeys=[...copyKeys,...["cardStayPolicy","paymentOptionsSummary","paymentOptionsNote","baseOfferDescription","displayName"].filter(key=>key in copy)];exact(copy,admittedCopyKeys);const safeCopy=Object.fromEntries(admittedCopyKeys.map(k=>[k,text(copy[k])]));
 const loc=rec(c.location);exact(loc,["address","countryCode","sourceIds","map"]);if(loc.countryCode!=="MY"||strings(loc.sourceIds).length)throw Error("CORE_LOCATION_INVALID");
 const map=rec(loc.map);exact(map,["embedUrl","placeUrl","directionsUrl","latitude","longitude","coordinateStatus","officialEntityReference","sourceIds","loadPolicy"]);
 if(map.latitude!==null||map.longitude!==null||map.coordinateStatus!=="exact-pin-unverified"||!["after-user-consent","on-page-load"].includes(String(map.loadPolicy))||strings(map.sourceIds).length)throw Error("CORE_MAP_AUTHORITY_INVALID");
 text(map.officialEntityReference,300);
 const safeMap={embedUrl:https(map.embedUrl),placeUrl:https(map.placeUrl),directionsUrl:https(map.directionsUrl),latitude:null,longitude:null,coordinateStatus:"exact-pin-unverified",loadPolicy:map.loadPolicy as "after-user-consent"|"on-page-load"} as const;
 if(!Array.isArray(c.media)||!c.media.length)throw Error("CORE_MEDIA_UNAVAILABLE");
 const ids=new Set<string>();const media=c.media.map(x=>{const m=rec(x);exact(m,["assetId","url","width","height","alt","caption","purpose","galleryGroup","galleryOrder","maxCssWidth","maxDevicePixelRatio",...("searchPlacements" in m?["searchPlacements"]:[])]);const id=text(m.assetId,256);if(ids.has(id))throw Error("CORE_MEDIA_DUPLICATE");ids.add(id);
 if(m.url!==`/api/crays/clubs/media/${encodeURIComponent(id)}`||!groups.includes(String(m.galleryGroup))||!["hero","gallery"].includes(String(m.purpose))||!Number.isInteger(m.galleryOrder)||Number(m.galleryOrder)<0)throw Error("CORE_MEDIA_BINDING_INVALID");
 return {assetId:id,url:String(m.url),width:positive(m.width),height:positive(m.height),alt:text(m.alt,500),caption:typeof m.caption==="string"?m.caption:"",purpose:m.purpose as "hero"|"gallery",galleryGroup:String(m.galleryGroup),galleryOrder:Number(m.galleryOrder),maxCssWidth:positive(m.maxCssWidth),maxDevicePixelRatio:positive(m.maxDevicePixelRatio),...("searchPlacements" in m?{searchPlacements:strings(m.searchPlacements)}:{})};
 }).sort((a,b)=>groups.indexOf(a.galleryGroup)-groups.indexOf(b.galleryGroup)||a.galleryOrder-b.galleryOrder);
 if(!Array.isArray(c.rooms))throw Error("CORE_ROOMS_INVALID");const rooms=c.rooms.map(x=>{const r=rec(x);exact(r,["publicRoomTypeId","name","description","sourceIds","providerRoomTypeId"]);if(r.providerRoomTypeId!==null||strings(r.sourceIds).length)throw Error("CORE_ROOM_DISCOVERY_BINDING_INVALID");return {publicRoomTypeId:text(r.publicRoomTypeId,256),name:text(r.name,300),description:text(r.description),providerRoomTypeId:null};});
 const hash=text(c.contentSha256,64);if(!/^[a-f0-9]{64}$/.test(hash))throw Error("CORE_CONTENT_SHA_INVALID");
 return {propertyId:expectedPropertyId,canonicalName:text(copy.displayName ?? c.canonicalName,200),officialName:text(c.canonicalName,200),contentVersionId:text(c.contentVersionId,256),contentSha256:hash,copy:safeCopy,address:text(loc.address),facilities:items(c.facilities),dining:items(c.dining),meetings:items(c.meetings),rooms,media,hero:media.find(m=>m.purpose==="hero")??null,map:safeMap,bookingGranted:false,nativeReadGranted:false};
}
