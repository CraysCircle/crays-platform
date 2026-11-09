import "server-only";

import { type ForestCityHospitalityPropertyKey } from "@/lib/member-commerce/forest-city-hospitality-booking-north-star";

const CONFIG_KEYS = {
  golf: {
    receipt: "CRAYS_FOREST_CITY_GOLF_ROOM_SOURCE_RECEIPT_SHA256",
    roomTypes: "CRAYS_FOREST_CITY_GOLF_EXPECTED_ROOM_TYPE_IDS",
  },
  marina: {
    receipt: "CRAYS_FOREST_CITY_MARINA_ROOM_SOURCE_RECEIPT_SHA256",
    roomTypes: "CRAYS_FOREST_CITY_MARINA_EXPECTED_ROOM_TYPE_IDS",
  },
} as const;

const SHA256 = /^[a-f0-9]{64}$/;
const ROOM_TYPE_ID = /^[A-Za-z0-9:_.-]{3,180}$/;

export function getForestCityHospitalityRuntimeConfig(
  propertyKey: ForestCityHospitalityPropertyKey,
  env: Record<string, string | undefined> = process.env,
) {
  const keys = CONFIG_KEYS[propertyKey];
  const receipt = env[keys.receipt]?.trim() || null;
  const expectedCanonicalRoomTypeIds = [
    ...new Set(
      (env[keys.roomTypes] ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].sort();
  const sourceReceiptAttached = Boolean(receipt);
  const sourceReceiptValid = Boolean(receipt && SHA256.test(receipt));
  const expectedRoomSetValid =
    expectedCanonicalRoomTypeIds.length > 0 &&
    expectedCanonicalRoomTypeIds.every((value) =>
      ROOM_TYPE_ID.test(value),
    );

  return {
    canonicalRoomSourceReceiptSha256: receipt,
    expectedCanonicalRoomTypeIds,
    sourceReceiptAttached,
    sourceReceiptValid,
    expectedRoomSetValid,
    sourceConfigured: sourceReceiptValid && expectedRoomSetValid,
    configurationKeys: {
      receipt: keys.receipt,
      roomTypes: keys.roomTypes,
    },
  };
}
