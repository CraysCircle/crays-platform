import { createHash } from "node:crypto";

export const HOSPITALITY_CONTENT_SCHEMA = "crays.hospitality.content.v1" as const;
export const HOSPITALITY_PROPERTIES = [
  "property-clubs-forest-city-golf", "property-clubs-forest-city-marina",
] as const;
export type HospitalityPropertyId = typeof HOSPITALITY_PROPERTIES[number];
export type HospitalityCopy = Record<
  "headline" | "cardSummary" | "overview" | "locationText" |
  "amenitiesIntroduction" | "diningIntroduction" | "meetingsIntroduction" |
  "roomIntroduction" | "seoTitle" | "seoDescription", string> & {cardStayPolicy?:string; paymentOptionsSummary?:string; paymentOptionsNote?:string; baseOfferDescription?:string; displayName?:string};
export type HospitalitySource = {
  sourceId: string; url: string; observedAt: string; contentSha256: string;
  authority: "official-hotel" | "existing-core" | "owner-confirmation" | "public-booking-platform";
};
export type HospitalitySectionItem = {
  id: string; label: string; description: string; details: string[]; sourceIds: string[];
};
export type HospitalityRoomCopy = {
  publicRoomTypeId: string; name: string; description: string; sourceIds: string[];
  // An official public category is not a native sellable category until explicitly mapped.
  providerRoomTypeId: null;
};
export const HOSPITALITY_GALLERY_GROUPS = [
  "Exterior", "Facilities", "Dining", "Golf & Beach", "Meetings & Events", "Property gallery", "Rooms & Suites",
] as const;
export type HospitalityGalleryGroup = typeof HOSPITALITY_GALLERY_GROUPS[number];
export type HospitalityMedia = {
  assetId: string; sourceUrl: string; sha256: string; byteSize: number;
  width: number; height: number; mimeType: "image/jpeg" | "image/png" | "image/webp";
  rightsReceiptId: string; qualityReceiptSha256: string;
  alt: string; caption: string; purpose: "gallery" | "hero"; galleryGroup: HospitalityGalleryGroup; galleryOrder: number;
  maxCssWidth: number; maxDevicePixelRatio: number; searchPlacements?: string[];
  // Paths/credentials/internal storage references never enter the public projection.
  storageAssetId: string | null; publicRoomTypeId: null;
};
export type HospitalityHotelMap = {
  embedUrl: string; placeUrl: string; directionsUrl: string;
  latitude: null; longitude: null; coordinateStatus: "exact-pin-unverified";
  officialEntityReference: string; sourceIds: string[]; loadPolicy: "after-user-consent" | "on-page-load";
};
export type HospitalityContent = {
  schema: typeof HOSPITALITY_CONTENT_SCHEMA; propertyId: HospitalityPropertyId;
  locale: "en"; canonicalName: string; copy: HospitalityCopy;
  location: { address: string; countryCode: "MY"; sourceIds: string[]; map: HospitalityHotelMap };
  facilities: HospitalitySectionItem[]; dining: HospitalitySectionItem[];
  meetings: HospitalitySectionItem[]; rooms: HospitalityRoomCopy[];
  sources: HospitalitySource[]; media: HospitalityMedia[];
  // Content never owns monetary amounts, bookable inventory or payment facts.
  commercialAuthority: "core-qlo-vendure-stored-quote";
  calendarMonthPolicy: "calendar-month-anchor-clamp-v1";
};

export function hospitalitySha256(bytes: string | Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}
export function isHospitalityPropertyId(value: unknown): value is HospitalityPropertyId {
  return typeof value === "string" && HOSPITALITY_PROPERTIES.some((id) => id === value);
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function text(value: unknown, max = 10000): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}
function sha(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  return Object.keys(value).every((key) => allowed.includes(key)) && allowed.every((key) => key in value);
}
function httpsUrl(value: unknown): value is string {
  if (!text(value, 2048)) return false;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}
function uniqueIds(items: { id: string }[]) { return new Set(items.map((item) => item.id)).size === items.length; }
const copyKeys = ["headline", "cardSummary", "overview", "locationText", "amenitiesIntroduction",
  "diningIntroduction", "meetingsIntroduction", "roomIntroduction", "seoTitle", "seoDescription"];

export function validateHospitalityContent(value: unknown): HospitalityContent {
  if (!record(value) || !keys(value, ["schema", "propertyId", "locale", "canonicalName", "copy", "location",
    "facilities", "dining", "meetings", "rooms", "sources", "media", "commercialAuthority", "calendarMonthPolicy"])
    || value.schema !== HOSPITALITY_CONTENT_SCHEMA || !isHospitalityPropertyId(value.propertyId)
    || value.locale !== "en" || !text(value.canonicalName, 200)
    || value.commercialAuthority !== "core-qlo-vendure-stored-quote"
    || value.calendarMonthPolicy !== "calendar-month-anchor-clamp-v1"
    || !record(value.copy) || !keys(value.copy, [...copyKeys,...["cardStayPolicy","paymentOptionsSummary","paymentOptionsNote","baseOfferDescription","displayName"].filter(key => key in (value.copy as Record<string,unknown>))]) || !Object.values(value.copy).every((v) => text(v))) {
    throw new Error("HOSPITALITY_INVALID_CONTENT");
  }
  if (!Array.isArray(value.sources) || value.sources.length < 1 || value.sources.length > 100
    || !value.sources.every((s) => record(s) && keys(s, ["sourceId", "url", "observedAt", "contentSha256", "authority"])
      && text(s.sourceId, 200) && httpsUrl(s.url) && text(s.observedAt, 40)
      && Number.isFinite(Date.parse(s.observedAt)) && sha(s.contentSha256)
      && ["official-hotel", "existing-core", "owner-confirmation", "public-booking-platform"].includes(String(s.authority)))) {
    throw new Error("HOSPITALITY_INVALID_PROVENANCE");
  }
  const sourceIds = new Set(value.sources.map((s: HospitalitySource) => s.sourceId));
  if (sourceIds.size !== value.sources.length) throw new Error("HOSPITALITY_DUPLICATE_SOURCE");
  const refs = (ids: unknown) => Array.isArray(ids) && ids.length > 0
    && ids.every((id) => typeof id === "string" && sourceIds.has(id));
  if (!record(value.location) || !keys(value.location, ["address", "countryCode", "sourceIds", "map"])
    || !text(value.location.address, 1000) || value.location.countryCode !== "MY" || !refs(value.location.sourceIds)) {
    throw new Error("HOSPITALITY_INVALID_LOCATION");
  }
  const map = value.location.map;
  if (!record(map) || !keys(map, ["embedUrl", "placeUrl", "directionsUrl", "latitude", "longitude", "coordinateStatus", "officialEntityReference", "sourceIds", "loadPolicy"])
    || !httpsUrl(map.embedUrl) || !httpsUrl(map.placeUrl) || !httpsUrl(map.directionsUrl)
    || map.latitude !== null || map.longitude !== null || map.coordinateStatus !== "exact-pin-unverified"
    || !["after-user-consent", "on-page-load"].includes(String(map.loadPolicy)) || !refs(map.sourceIds)
    || !text(map.officialEntityReference, 100) || !/^0x[0-9a-f]+:0x[0-9a-f]+$/.test(map.officialEntityReference)) {
    throw new Error("HOSPITALITY_INVALID_MAP");
  }
  const embed = new URL(map.embedUrl), place = new URL(map.placeUrl), directions = new URL(map.directionsUrl);
  const entity = decodeURIComponent(embed.searchParams.get("pb") ?? "");
  if ([embed, place, directions].some((url) => url.hostname !== "www.google.com" || url.port || url.hash)
    || embed.pathname !== "/maps/embed" || place.pathname !== "/maps" || directions.pathname !== "/maps/dir/"
    || !entity.includes(`!1s${map.officialEntityReference}!2s${value.canonicalName}!`)
    || place.searchParams.get("cid") !== BigInt(map.officialEntityReference.split(":")[1]).toString()
    || directions.searchParams.get("api") !== "1"
    || directions.searchParams.get("destination") !== `${value.canonicalName}, ${value.location.address}`) {
    throw new Error("HOSPITALITY_MAP_IDENTITY_MISMATCH");
  }
  for (const section of ["facilities", "dining", "meetings"] as const) {
    const items = value[section];
    if (!Array.isArray(items) || items.length > 100 || !items.every((item) => record(item)
      && keys(item, ["id", "label", "description", "details", "sourceIds"])
      && text(item.id, 200) && text(item.label, 200) && text(item.description)
      && Array.isArray(item.details) && item.details.length <= 50 && item.details.every((v) => text(v, 1000))
      && refs(item.sourceIds)) || !uniqueIds(items)) throw new Error("HOSPITALITY_INVALID_SECTION");
  }
  if (!Array.isArray(value.rooms) || value.rooms.length < 1 || value.rooms.length > 100
    || !value.rooms.every((room) => record(room)
      && keys(room, ["publicRoomTypeId", "name", "description", "sourceIds", "providerRoomTypeId"])
      && text(room.publicRoomTypeId, 200) && text(room.name, 200) && text(room.description)
      && refs(room.sourceIds) && room.providerRoomTypeId === null)
    || new Set(value.rooms.map((r: HospitalityRoomCopy) => r.publicRoomTypeId)).size !== value.rooms.length) {
    throw new Error("HOSPITALITY_INVALID_ROOM_COPY");
  }
  if (!Array.isArray(value.media) || value.media.length > 200 || !value.media.every((m) => record(m)
    && keys(m, ["assetId", "sourceUrl", "sha256", "byteSize", "width", "height", "mimeType", "rightsReceiptId",
      "qualityReceiptSha256", "alt", "caption", "purpose", "galleryGroup", "galleryOrder", "maxCssWidth", "maxDevicePixelRatio", "storageAssetId", "publicRoomTypeId", ...("searchPlacements" in m ? ["searchPlacements"] : [])])
    && (!("searchPlacements" in m) || (Array.isArray(m.searchPlacements) && m.searchPlacements.length <= 20 && m.searchPlacements.every(p => typeof p === "string" && /^(golf|marina)[A-Z][a-zA-Z]+$/.test(p)) && new Set(m.searchPlacements).size === m.searchPlacements.length))
    && text(m.assetId, 200) && (httpsUrl(m.sourceUrl) || (typeof m.sourceUrl === "string" && typeof m.storageAssetId === "string" && /^hospitality-owner-photo-[a-f0-9]{64}$/.test(m.storageAssetId) && m.sourceUrl === `core://hospitality/${m.storageAssetId}`)) && sha(m.sha256) && sha(m.qualityReceiptSha256)
    && Number.isSafeInteger(m.byteSize) && Number(m.byteSize) > 0
    && Number.isSafeInteger(m.width) && (Number(m.width) >= 800 || (m.sha256 === "8e9f49db19e3ce857470293a3f51d006beb89f1be1de653ad12717e47f5c18b5" && m.purpose === "gallery" && Number(m.width) === 600 && Number(m.height) === 420 && Number(m.maxCssWidth) <= 300 && Number(m.maxDevicePixelRatio) <= 2))
    && Number.isSafeInteger(m.height) && (Number(m.height) >= 500 || (m.sha256 === "8e9f49db19e3ce857470293a3f51d006beb89f1be1de653ad12717e47f5c18b5" && m.purpose === "gallery" && Number(m.width) === 600 && Number(m.height) === 420 && Number(m.maxCssWidth) <= 300 && Number(m.maxDevicePixelRatio) <= 2))
    && ["image/jpeg", "image/png", "image/webp"].includes(String(m.mimeType))
    && text(m.rightsReceiptId, 256) && text(m.alt, 1000) && text(m.caption, 1000)
    && ["gallery", "hero"].includes(String(m.purpose))
    && HOSPITALITY_GALLERY_GROUPS.some((group) => group === m.galleryGroup)
    && Number.isSafeInteger(m.galleryOrder) && Number(m.galleryOrder) >= 1 && Number(m.galleryOrder) <= 10000
    && Number.isFinite(m.maxCssWidth) && Number(m.maxCssWidth) > 0
    && Number.isFinite(m.maxDevicePixelRatio) && Number(m.maxDevicePixelRatio) >= 1
    && Number(m.maxCssWidth) * Number(m.maxDevicePixelRatio) <= Number(m.width)
    && (m.purpose !== "hero" || (Number(m.width) >= 1600 && Number(m.height) >= 900))
    && (m.storageAssetId === null || text(m.storageAssetId, 200)) && m.publicRoomTypeId === null)
    || new Set(value.media.map((m: HospitalityMedia) => m.assetId)).size !== value.media.length) {
    throw new Error("HOSPITALITY_INVALID_MEDIA");
  }
  if (new Set(value.media.map((m: HospitalityMedia) => `${m.galleryGroup}|${m.galleryOrder}`)).size !== value.media.length) {
    throw new Error("HOSPITALITY_DUPLICATE_GALLERY_ORDER");
  }
  // Reject prototypes/accessors by round-tripping the admitted plain JSON document.
  return JSON.parse(JSON.stringify(value)) as HospitalityContent;
}

export type HospitalityOriginalRoomBinding = {
  sourceKey: string; sourceCoreRoomId: string; sourceRecordSha256: string;
  sourceMapRowId: string; sourceMapId: string; propertyId: HospitalityPropertyId;
  providerHotelId: string; providerRoomTypeId: string; providerRoomId: string;
  sourceCategoryKey: string; nativeReadbackSha256: string; operationKey: string;
  canonicalUnitUuid: null; publicRoomTypeId: null;
};
export function validateHospitalityOriginalRoomBinding(value: unknown): HospitalityOriginalRoomBinding {
  if (!record(value) || !keys(value, ["sourceKey", "sourceCoreRoomId", "sourceRecordSha256", "sourceMapRowId",
    "sourceMapId", "propertyId", "providerHotelId", "providerRoomTypeId", "providerRoomId", "sourceCategoryKey",
    "nativeReadbackSha256", "operationKey", "canonicalUnitUuid", "publicRoomTypeId"])
    || !isHospitalityPropertyId(value.propertyId) || !text(value.sourceKey, 1000)
    || !text(value.sourceCoreRoomId, 500) || !sha(value.sourceRecordSha256)
    || !text(value.sourceMapRowId, 20) || !/^[1-9][0-9]*$/.test(value.sourceMapRowId)
    || BigInt(value.sourceMapRowId) > 9223372036854775807n || !text(value.sourceMapId, 1000)
    || value.providerHotelId !== (value.propertyId === HOSPITALITY_PROPERTIES[0] ? "2" : "3")
    || !text(value.providerRoomTypeId, 10) || !/^[1-9][0-9]*$/.test(value.providerRoomTypeId)
    || !(value.propertyId === HOSPITALITY_PROPERTIES[0] ? ["25", "26", "27", "28", "29"] : ["30", "31", "32", "33", "34"]).includes(value.providerRoomTypeId)
    || !text(value.providerRoomId, 20) || !/^[1-9][0-9]*$/.test(value.providerRoomId)
    || !text(value.sourceCategoryKey, 1000) || !sha(value.nativeReadbackSha256) || !text(value.operationKey, 1000)
    || value.canonicalUnitUuid !== null || value.publicRoomTypeId !== null) {
    throw new Error("HOSPITALITY_INVALID_ORIGINAL_ROOM_BINDING");
  }
  return JSON.parse(JSON.stringify(value)) as HospitalityOriginalRoomBinding;
}

export type HospitalityPublicContent = Pick<HospitalityContent,
  "propertyId" | "locale" | "canonicalName" | "copy" | "location" | "facilities" | "dining" | "meetings" | "rooms"> & {
  contentVersionId: string; contentSha256: string; media: {
    assetId: string; url: string; width: number; height: number; alt: string; caption: string;
    purpose: "gallery" | "hero"; galleryGroup: HospitalityGalleryGroup; galleryOrder: number; maxCssWidth: number; maxDevicePixelRatio: number; searchPlacements?: string[];
  }[];
};
export function projectHospitalityPublicContent(content: HospitalityContent, versionId: string, payloadSha256: string): HospitalityPublicContent {
  const admitted = validateHospitalityContent(content);
  if (!text(versionId, 256) || !sha(payloadSha256)) throw new Error("HOSPITALITY_INVALID_VERSION");
  const section = (items: HospitalitySectionItem[]) => items.map(({ id, label, description, details }) => ({ id, label, description, details, sourceIds: [] }));
  return {
    propertyId: admitted.propertyId, locale: "en", canonicalName: admitted.canonicalName, copy: admitted.copy,
    location: { address: admitted.location.address, countryCode: "MY", sourceIds: [], map: { ...admitted.location.map, sourceIds: [] } },
    facilities: section(admitted.facilities), dining: section(admitted.dining), meetings: section(admitted.meetings),
    rooms: admitted.rooms.map((r) => ({ ...r, sourceIds: [] })), contentVersionId: versionId, contentSha256: payloadSha256,
    media: admitted.media.filter((m) => m.storageAssetId !== null).sort((a, b) => HOSPITALITY_GALLERY_GROUPS.indexOf(a.galleryGroup) - HOSPITALITY_GALLERY_GROUPS.indexOf(b.galleryGroup) || a.galleryOrder - b.galleryOrder).map((m) => ({
      assetId: m.storageAssetId!, url: `/api/crays/clubs/media/${encodeURIComponent(m.storageAssetId!)}`,
      width: m.width, height: m.height, alt: m.alt, caption: m.caption, purpose: m.purpose, galleryGroup: m.galleryGroup, galleryOrder: m.galleryOrder,
      maxCssWidth: m.maxCssWidth, maxDevicePixelRatio: m.maxDevicePixelRatio,
      ...(m.searchPlacements ? { searchPlacements: m.searchPlacements } : {}),
    })),
  };
}
