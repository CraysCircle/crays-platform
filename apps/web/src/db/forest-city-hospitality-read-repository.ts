import "server-only";

import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import {
  FOREST_CITY_HOSPITALITY_DATA_AUTHORITIES,
  type ForestCityHospitalityPropertyId,
} from "@/lib/member-commerce/forest-city-hospitality-booking-north-star";

export type ForestCityHospitalityReadWindow = {
  checkIn?: string;
  checkOut?: string;
};

export type ForestCityHospitalityReadPlan = {
  propertyId: ForestCityHospitalityPropertyId;
  profile: {
    text: string;
    values: unknown[];
  };
  canonicalRoomTypes: {
    text: string;
    values: unknown[];
  };
  datedRatesAndInventory: {
    text: string;
    values: unknown[];
  } | null;
  sourceAuthority: string;
  includesSyntheticFallback: false;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertIsoDate(value: string, field: string): void {
  if (!DATE_PATTERN.test(value)) {
    throw new Error(`${field} must be an ISO date in YYYY-MM-DD form`);
  }
}

export function buildForestCityHospitalityReadPlan(
  propertyId: ForestCityHospitalityPropertyId,
  window: ForestCityHospitalityReadWindow = {},
): ForestCityHospitalityReadPlan {
  const hasCheckIn = Boolean(window.checkIn);
  const hasCheckOut = Boolean(window.checkOut);

  if (hasCheckIn !== hasCheckOut) {
    throw new Error("checkIn and checkOut must be supplied together");
  }

  if (window.checkIn && window.checkOut) {
    assertIsoDate(window.checkIn, "checkIn");
    assertIsoDate(window.checkOut, "checkOut");
    if (window.checkIn >= window.checkOut) {
      throw new Error("checkOut must be later than checkIn");
    }
  }

  return {
    propertyId,
    profile: {
      text: `
        SELECT to_jsonb(profile) AS record
        FROM crays_core.clubs_hotel_profiles profile
        WHERE to_jsonb(profile)->>'property_id' = $1
        LIMIT 1
      `,
      values: [propertyId],
    },
    canonicalRoomTypes: {
      text: `
        SELECT to_jsonb(room_type) AS record
        FROM crays_core.clubs_hotel_room_types room_type
        WHERE to_jsonb(room_type)->>'property_id' = $1
          AND COALESCE(to_jsonb(room_type)->>'active', 'true') NOT IN ('false', '0')
          AND COALESCE(
            to_jsonb(room_type)->>'status',
            to_jsonb(room_type)->>'lifecycle',
            'active'
          ) NOT IN ('inactive', 'archived', 'deleted')
        ORDER BY COALESCE(
          to_jsonb(room_type)->>'sort_order',
          to_jsonb(room_type)->>'room_type_id',
          to_jsonb(room_type)->>'id'
        )
      `,
      values: [propertyId],
    },
    datedRatesAndInventory:
      window.checkIn && window.checkOut
        ? {
            text: `
              SELECT
                to_jsonb(rate) AS rate,
                to_jsonb(inventory) AS inventory
              FROM crays_core.clubs_hotel_room_rates rate
              LEFT JOIN crays_core.clubs_hotel_inventory_days inventory
                ON to_jsonb(inventory)->>'property_id' =
                   to_jsonb(rate)->>'property_id'
               AND COALESCE(
                     to_jsonb(inventory)->>'room_type_id',
                     to_jsonb(inventory)->>'hotel_room_type_id'
                   ) = COALESCE(
                     to_jsonb(rate)->>'room_type_id',
                     to_jsonb(rate)->>'hotel_room_type_id'
                   )
               AND COALESCE(
                     to_jsonb(inventory)->>'stay_date',
                     to_jsonb(inventory)->>'service_date',
                     to_jsonb(inventory)->>'inventory_date'
                   ) = COALESCE(
                     to_jsonb(rate)->>'stay_date',
                     to_jsonb(rate)->>'service_date',
                     to_jsonb(rate)->>'rate_date'
                   )
              WHERE to_jsonb(rate)->>'property_id' = $1
                AND COALESCE(
                      to_jsonb(rate)->>'stay_date',
                      to_jsonb(rate)->>'service_date',
                      to_jsonb(rate)->>'rate_date'
                    )::date >= $2::date
                AND COALESCE(
                      to_jsonb(rate)->>'stay_date',
                      to_jsonb(rate)->>'service_date',
                      to_jsonb(rate)->>'rate_date'
                    )::date < $3::date
              ORDER BY
                COALESCE(
                  to_jsonb(rate)->>'room_type_id',
                  to_jsonb(rate)->>'hotel_room_type_id'
                ),
                COALESCE(
                  to_jsonb(rate)->>'stay_date',
                  to_jsonb(rate)->>'service_date',
                  to_jsonb(rate)->>'rate_date'
                )
            `,
            values: [propertyId, window.checkIn, window.checkOut],
          }
        : null,
    sourceAuthority:
      FOREST_CITY_HOSPITALITY_DATA_AUTHORITIES.rateAndInventorySourceAuthority,
    includesSyntheticFallback: false,
  };
}

export type ForestCityHospitalitySourceReadiness = {
  ready: boolean;
  reason:
    | "ready"
    | "missing_property_profile"
    | "missing_canonical_room_source_receipt"
    | "missing_room_types"
    | "room_source_mismatch"
    | "invalid_rate_or_inventory_source_authority";
};

export function evaluateForestCityHospitalitySourceReadiness(input: {
  propertyProfilePresent: boolean;
  canonicalRoomSourceReceiptAttached: boolean;
  expectedCanonicalRoomTypeIds: readonly string[];
  actualCanonicalRoomTypeIds: readonly string[];
  rateAndInventorySourceAuthorityValid?: boolean;
}): ForestCityHospitalitySourceReadiness {
  if (!input.propertyProfilePresent) {
    return { ready: false, reason: "missing_property_profile" };
  }
  if (!input.canonicalRoomSourceReceiptAttached) {
    return {
      ready: false,
      reason: "missing_canonical_room_source_receipt",
    };
  }
  if (input.actualCanonicalRoomTypeIds.length === 0) {
    return { ready: false, reason: "missing_room_types" };
  }

  const expected = [...new Set(input.expectedCanonicalRoomTypeIds)].sort();
  const actual = [...new Set(input.actualCanonicalRoomTypeIds)].sort();

  if (
    expected.length !== actual.length ||
    expected.some((value, index) => value !== actual[index])
  ) {
    return { ready: false, reason: "room_source_mismatch" };
  }
  if (input.rateAndInventorySourceAuthorityValid === false) {
    return {
      ready: false,
      reason: "invalid_rate_or_inventory_source_authority",
    };
  }

  return { ready: true, reason: "ready" };
}

type JsonRecord = Record<string, unknown>;
type JsonRecordRow = { record: JsonRecord };
type RateInventoryRow = {
  rate: JsonRecord;
  inventory: JsonRecord | null;
};

const PROFILE_PUBLIC_KEYS = [
  "property_id",
  "public_reference",
  "slug",
  "display_name",
  "description",
  "short_description",
  "address_locality",
  "region",
  "country",
  "timezone",
  "access_mode",
  "status",
  "check_in_time",
  "check_out_time",
  "amenities",
  "facilities",
  "media",
  "hero_media",
  "house_rules",
  "legal_information",
] as const;

const ROOM_PUBLIC_KEYS = [
  "room_type_id",
  "hotel_room_type_id",
  "property_id",
  "public_reference",
  "code",
  "slug",
  "display_name",
  "name",
  "description",
  "short_description",
  "max_guests",
  "max_adults",
  "max_children",
  "bed_configuration",
  "bedroom_count",
  "bathroom_count",
  "area_sqm",
  "amenities",
  "facilities",
  "accessibility",
  "media",
  "gallery",
  "house_rules",
  "status",
  "lifecycle",
  "sort_order",
] as const;

const RATE_PUBLIC_KEYS = [
  "room_type_id",
  "hotel_room_type_id",
  "stay_date",
  "service_date",
  "rate_date",
  "currency",
  "amount_minor",
  "price_minor",
  "minimum_stay",
  "maximum_stay",
  "source_authority",
] as const;

const INVENTORY_PUBLIC_KEYS = [
  "room_type_id",
  "hotel_room_type_id",
  "stay_date",
  "service_date",
  "inventory_date",
  "total_rooms",
  "available_rooms",
  "held_rooms",
  "source_authority",
] as const;

function publicRecord(
  record: JsonRecord,
  keys: readonly string[],
): JsonRecord {
  return Object.fromEntries(
    keys
      .filter((key) => Object.prototype.hasOwnProperty.call(record, key))
      .map((key) => [key, record[key]]),
  );
}

function roomTypeId(record: JsonRecord): string | null {
  const value = record.room_type_id ?? record.hotel_room_type_id ?? record.id;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sourceAuthorityValid(rows: readonly RateInventoryRow[]): boolean {
  return rows.every((row) => {
    const rateAuthority = row.rate.source_authority;
    const inventoryAuthority = row.inventory?.source_authority;
    return (
      rateAuthority ===
        FOREST_CITY_HOSPITALITY_DATA_AUTHORITIES.rateAndInventorySourceAuthority
      && (
        row.inventory === null
        || inventoryAuthority ===
          FOREST_CITY_HOSPITALITY_DATA_AUTHORITIES.rateAndInventorySourceAuthority
      )
    );
  });
}

export async function readForestCityHospitalityProperty(
  input: {
    propertyId: ForestCityHospitalityPropertyId;
    window?: ForestCityHospitalityReadWindow;
    canonicalRoomSourceReceiptSha256?: string | null;
    expectedCanonicalRoomTypeIds: readonly string[];
  },
  database: Pick<PoolClient, "query"> = getCorePgPool(),
) {
  const plan = buildForestCityHospitalityReadPlan(
    input.propertyId,
    input.window,
  );
  const [profileResult, roomResult] = await Promise.all([
    database.query<JsonRecordRow>(plan.profile.text, plan.profile.values),
    database.query<JsonRecordRow>(
      plan.canonicalRoomTypes.text,
      plan.canonicalRoomTypes.values,
    ),
  ]);
  const rateInventoryResult = plan.datedRatesAndInventory
    ? await database.query<RateInventoryRow>(
        plan.datedRatesAndInventory.text,
        plan.datedRatesAndInventory.values,
      )
    : { rows: [] as RateInventoryRow[] };

  const profile = profileResult.rows[0]?.record ?? null;
  const canonicalRooms = roomResult.rows
    .map((row) => row.record)
    .filter((record): record is JsonRecord => Boolean(record));
  const actualCanonicalRoomTypeIds = canonicalRooms
    .map(roomTypeId)
    .filter((value): value is string => Boolean(value));
  const readiness = evaluateForestCityHospitalitySourceReadiness({
    propertyProfilePresent: Boolean(profile),
    canonicalRoomSourceReceiptAttached: Boolean(
      input.canonicalRoomSourceReceiptSha256?.trim(),
    ),
    expectedCanonicalRoomTypeIds: input.expectedCanonicalRoomTypeIds,
    actualCanonicalRoomTypeIds,
    rateAndInventorySourceAuthorityValid: sourceAuthorityValid(
      rateInventoryResult.rows,
    ),
  });

  return {
    propertyId: input.propertyId,
    sourceReadiness: readiness,
    canonicalRoomSourceReceiptSha256:
      input.canonicalRoomSourceReceiptSha256?.trim() || null,
    sourceAuthority: plan.sourceAuthority,
    includesSyntheticFallback: false as const,
    property: profile
      ? publicRecord(profile, PROFILE_PUBLIC_KEYS)
      : null,
    rooms: canonicalRooms.map((room) =>
      publicRecord(room, ROOM_PUBLIC_KEYS),
    ),
    datedRatesAndInventory: rateInventoryResult.rows.map((row) => ({
      rate: publicRecord(row.rate, RATE_PUBLIC_KEYS),
      inventory: row.inventory
        ? publicRecord(row.inventory, INVENTORY_PUBLIC_KEYS)
        : null,
    })),
  };
}

export async function readForestCityHospitalityRoom(
  input: {
    propertyId: ForestCityHospitalityPropertyId;
    roomTypeId: string;
    window?: ForestCityHospitalityReadWindow;
    canonicalRoomSourceReceiptSha256?: string | null;
    expectedCanonicalRoomTypeIds: readonly string[];
  },
  database: Pick<PoolClient, "query"> = getCorePgPool(),
) {
  const property = await readForestCityHospitalityProperty(input, database);
  const room = property.rooms.find((candidate) => {
    const value =
      candidate.room_type_id
      ?? candidate.hotel_room_type_id
      ?? candidate.id;
    return value === input.roomTypeId;
  }) ?? null;

  return {
    ...property,
    roomTypeId: input.roomTypeId,
    room,
    datedRatesAndInventory:
      property.datedRatesAndInventory.filter((item) => {
        const value =
          item.rate.room_type_id
          ?? item.rate.hotel_room_type_id;
        return value === input.roomTypeId;
      }),
  };
}
