import "server-only";

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

export const FOREST_CITY_QLO_PROVIDER_PROPERTIES = {
  "property-clubs-forest-city-golf": "CRAYS-FC-GOLF-HOTEL",
  "property-clubs-forest-city-marina": "CRAYS-FC-MARINA-HOTEL",
} as const;

export type ForestCityQloProviderPropertyId =
  keyof typeof FOREST_CITY_QLO_PROVIDER_PROPERTIES;

export type ForestCityQloProviderMedia = {
  mediaKey: string;
  alt: string;
  galleryOrder: number;
  sha256: string;
  licenseReceiptId: string;
  imagePath: string;
};

export type ForestCityQloProviderRoomType = {
  externalRoomTypeKey: string;
  name: string;
  description: string;
  shortDescription: string;
  adults: number;
  children: number;
  active: boolean;
  discoverable: boolean;
  bookable: false;
  rate: null;
  availability: null;
  availabilityStatus: "channel_manager_pending";
  paymentStatus: "payment_setup_pending";
};

export type ForestCityQloProviderHotel = {
  externalKey:
    (typeof FOREST_CITY_QLO_PROVIDER_PROPERTIES)[ForestCityQloProviderPropertyId];
  propertyId: ForestCityQloProviderPropertyId;
  name: string;
  shortDescription: string;
  description: string;
  policies: string;
  address: string;
  city: string;
  rating: number;
  checkIn: string;
  checkOut: string;
  active: boolean;
  contentAuthority: "qlo";
  inventoryAuthority: "channel_manager_pending";
  paymentStatus: "payment_setup_pending";
  roomTypes: ForestCityQloProviderRoomType[];
  media: ForestCityQloProviderMedia[];
};

type ProviderPayload = {
  status: "ready";
  authority: "qlo";
  inventoryStatus: "channel_manager_pending";
  paymentStatus: "payment_setup_pending";
  hotels: ForestCityQloProviderHotel[];
};

const MEDIA_KEY = /^[A-Za-z0-9_-]{3,180}$/;
const SHA256 = /^[a-f0-9]{64}$/;

function providerBaseUrl(
  env: Record<string, string | undefined> = process.env,
): URL {
  const value =
    env.CRAYS_CLUBS_QLO_PROVIDER_BASE_URL?.trim() ||
    "https://team.craysclub.com";
  const parsed = new URL(value);
  const isLoopbackTest =
    env.NODE_ENV === "test" &&
    parsed.protocol === "http:" &&
    ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !isLoopbackTest) {
    throw new Error("Qlo provider base URL must use HTTPS.");
  }
  parsed.pathname = "/";
  parsed.search = "";
  parsed.hash = "";
  return parsed;
}

async function providerToken(
  env: Record<string, string | undefined> = process.env,
): Promise<string> {
  const inline = env.CRAYS_CLUBS_QLO_PROVIDER_TOKEN?.trim();
  const file = env.CRAYS_CLUBS_QLO_PROVIDER_TOKEN_FILE?.trim();
  if (Boolean(inline) === Boolean(file)) {
    throw new Error(
      "Configure exactly one Qlo provider token source.",
    );
  }
  const value = inline || (await readFile(file!, "utf8")).trim();
  if (value.length < 32) throw new Error("Qlo provider token is invalid.");
  return value;
}

function safeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function validRoomType(value: unknown): value is ForestCityQloProviderRoomType {
  if (!value || typeof value !== "object") return false;
  const room = value as Record<string, unknown>;
  return (
    typeof room.externalRoomTypeKey === "string" &&
    MEDIA_KEY.test(room.externalRoomTypeKey) &&
    typeof room.name === "string" &&
    typeof room.description === "string" &&
    typeof room.shortDescription === "string" &&
    safeInteger(room.adults) &&
    safeInteger(room.children) &&
    typeof room.active === "boolean" &&
    typeof room.discoverable === "boolean" &&
    room.bookable === false &&
    room.rate === null &&
    room.availability === null &&
    room.availabilityStatus === "channel_manager_pending" &&
    room.paymentStatus === "payment_setup_pending"
  );
}

function validMedia(value: unknown): value is ForestCityQloProviderMedia {
  if (!value || typeof value !== "object") return false;
  const media = value as Record<string, unknown>;
  return (
    typeof media.mediaKey === "string" &&
    MEDIA_KEY.test(media.mediaKey) &&
    typeof media.alt === "string" &&
    safeInteger(media.galleryOrder) &&
    typeof media.sha256 === "string" &&
    SHA256.test(media.sha256) &&
    typeof media.licenseReceiptId === "string" &&
    media.licenseReceiptId.length >= 8 &&
    typeof media.imagePath === "string" &&
    media.imagePath.startsWith("/api/provider/hotels/")
  );
}

function validHotel(value: unknown): value is ForestCityQloProviderHotel {
  if (!value || typeof value !== "object") return false;
  const hotel = value as Record<string, unknown>;
  const externalKey =
    FOREST_CITY_QLO_PROVIDER_PROPERTIES[
      hotel.propertyId as ForestCityQloProviderPropertyId
    ];
  return (
    typeof hotel.propertyId === "string" &&
    externalKey !== undefined &&
    hotel.externalKey === externalKey &&
    typeof hotel.name === "string" &&
    hotel.name.length > 0 &&
    typeof hotel.shortDescription === "string" &&
    typeof hotel.description === "string" &&
    typeof hotel.policies === "string" &&
    typeof hotel.address === "string" &&
    typeof hotel.city === "string" &&
    safeInteger(hotel.rating) &&
    typeof hotel.checkIn === "string" &&
    typeof hotel.checkOut === "string" &&
    typeof hotel.active === "boolean" &&
    hotel.contentAuthority === "qlo" &&
    hotel.inventoryAuthority === "channel_manager_pending" &&
    hotel.paymentStatus === "payment_setup_pending" &&
    Array.isArray(hotel.roomTypes) &&
    hotel.roomTypes.length === 7 &&
    hotel.roomTypes.every(validRoomType) &&
    Array.isArray(hotel.media) &&
    hotel.media.length > 0 &&
    hotel.media.every(validMedia)
  );
}

function validPayload(value: unknown): value is ProviderPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  if (
    payload.status !== "ready" ||
    payload.authority !== "qlo" ||
    payload.inventoryStatus !== "channel_manager_pending" ||
    payload.paymentStatus !== "payment_setup_pending" ||
    !Array.isArray(payload.hotels) ||
    payload.hotels.length !== 2 ||
    !payload.hotels.every(validHotel)
  ) {
    return false;
  }
  const ids = payload.hotels.map((hotel) => hotel.propertyId).sort();
  return (
    ids.join(",") ===
    Object.keys(FOREST_CITY_QLO_PROVIDER_PROPERTIES).sort().join(",")
  );
}

async function providerFetch(
  pathname: string,
  env: Record<string, string | undefined> = process.env,
): Promise<Response> {
  const target = new URL(pathname, providerBaseUrl(env));
  const token = await providerToken(env);
  return fetch(target, {
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(8_000),
    headers: {
      accept: "application/json",
      "x-crays-clubs-provider-token": token,
      "x-correlation-id": `crays-core-qlo-${randomUUID()}`,
    },
  });
}

export async function readForestCityQloProviderHotels(
  env: Record<string, string | undefined> = process.env,
): Promise<ProviderPayload> {
  const response = await providerFetch("/api/provider/hotels", env);
  const payload = await response.json().catch(() => null);
  if (!response.ok || !validPayload(payload)) {
    throw new Error("Qlo provider hotel projection is unavailable.");
  }
  return payload;
}

export async function readForestCityQloProviderHotel(
  propertyId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<ForestCityQloProviderHotel | null> {
  if (!(propertyId in FOREST_CITY_QLO_PROVIDER_PROPERTIES)) return null;
  const payload = await readForestCityQloProviderHotels(env);
  return (
    payload.hotels.find((hotel) => hotel.propertyId === propertyId) ?? null
  );
}

export async function readForestCityQloProviderImage(
  propertyId: string,
  mediaKey: string,
  env: Record<string, string | undefined> = process.env,
): Promise<Response | null> {
  const externalKey =
    FOREST_CITY_QLO_PROVIDER_PROPERTIES[
      propertyId as ForestCityQloProviderPropertyId
    ];
  if (!externalKey || !MEDIA_KEY.test(mediaKey)) return null;
  return providerFetch(
    `/api/provider/hotels/${encodeURIComponent(externalKey)}` +
      `/images/${encodeURIComponent(mediaKey)}`,
    env,
  );
}
