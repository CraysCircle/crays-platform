import "server-only";

import type { Pool } from "pg";
import { getCorePgPool } from "./client";
import type { ForestCityContentPropertyId } from "@/lib/member-commerce/forest-city-hospitality-content-contract";
import {
  FOREST_CITY_PUBLIC_ROOM_CATEGORY_SETS,
  computeForestCityPublicRoomCategorySetSha256,
  type ForestCityPublicRoomCategory,
  type ForestCityPublicRoomCategorySet,
} from "@/lib/member-commerce/forest-city-hospitality-room-category-set";

type SetRow = {
  property_id: ForestCityContentPropertyId;
  property_name: ForestCityPublicRoomCategorySet["propertyName"];
  status: ForestCityPublicRoomCategorySet["status"];
  access_mode: ForestCityPublicRoomCategorySet["accessMode"];
  membership_required: boolean;
  property_admission_required: boolean;
  allowed_stay_units: ("night" | "week" | "month")[];
  published_total: number | null;
  inventory_status: ForestCityPublicRoomCategorySet["inventoryStatus"];
  source_id: ForestCityPublicRoomCategorySet["sourceReceipt"]["sourceId"];
  source_family: ForestCityPublicRoomCategorySet["sourceReceipt"]["sourceFamily"];
  source_kind: ForestCityPublicRoomCategorySet["sourceReceipt"]["sourceKind"];
  source_url: string;
  source_observed_at: string | Date;
  source_snapshot_sha256: string;
  source_snapshot_bytes: number;
  source_set_sha256: string;
  expected_category_count: number;
  persistence_scope: "isolated_neon_preview";
  provider_room_mapping_ready: false;
  rate_association_ready: false;
  availability_ready: false;
  booking_ready: false;
  persisted: true;
  synthetic: false;
};

type CategoryRow = {
  room_category_id: string;
  property_id: ForestCityContentPropertyId;
  display_name: string;
  source_label: string;
  discovery_order: number;
  category_kind: ForestCityPublicRoomCategory["categoryKind"];
  inventory_count: number | null;
  inventory_count_authority: ForestCityPublicRoomCategory["inventoryCountAuthority"];
  size_square_metres: string | number | null;
  discovery_text: string | null;
  source_id: ForestCityPublicRoomCategory["sourceId"];
  admission_state: ForestCityPublicRoomCategory["admissionState"];
  provider_room_type_id: null;
  canonical_booking_room_type_id: null;
  rate_association_status: ForestCityPublicRoomCategory["rateAssociationStatus"];
  rates: null;
  availability: null;
  bookable: false;
};

export type ForestCityPersistedRoomCategoryRead = {
  roomCategorySet: ForestCityPublicRoomCategorySet;
  persistence: {
    ready: true;
    status: "persisted_source_match";
    scope: "isolated_neon_preview";
    sourceSetMatch: true;
    providerRoomMappingReady: false;
    rateAssociationReady: false;
    availabilityReady: false;
    bookingReady: false;
  };
};

function dateOnly(value: string | Date) {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

export async function readForestCityPersistedRoomCategorySetWithPool(
  pool: Pick<Pool, "query">,
  propertyId: ForestCityContentPropertyId,
): Promise<ForestCityPersistedRoomCategoryRead> {
  const setResult = await pool.query<SetRow>(
    `select property_id,property_name,status,access_mode,membership_required,
            property_admission_required,allowed_stay_units,published_total,
            inventory_status,source_id,source_family,source_kind,source_url,
            source_observed_at,source_snapshot_sha256,source_snapshot_bytes,
            source_set_sha256,expected_category_count,persistence_scope,
            provider_room_mapping_ready,rate_association_ready,
            availability_ready,booking_ready,persisted,synthetic
       from crays_core.clubs_public_room_category_sets
      where property_id=$1 and lifecycle_state='active'`,
    [propertyId],
  );
  if (setResult.rows.length !== 1) {
    throw new Error("FOREST_CITY_PUBLIC_ROOM_CATEGORY_SET_NOT_PERSISTED");
  }
  const row = setResult.rows[0];
  const categoryResult = await pool.query<CategoryRow>(
    `select room_category_id,property_id,display_name,source_label,
            discovery_order,category_kind,inventory_count,
            inventory_count_authority,size_square_metres,discovery_text,
            source_id,admission_state,provider_room_type_id,
            canonical_booking_room_type_id,rate_association_status,
            rates,availability,bookable
       from crays_core.clubs_public_room_categories
      where property_id=$1 and lifecycle_state='active'
      order by discovery_order`,
    [propertyId],
  );
  if (categoryResult.rows.length !== row.expected_category_count) {
    throw new Error("FOREST_CITY_PUBLIC_ROOM_CATEGORY_COUNT_MISMATCH");
  }

  const categories = Object.freeze(
    categoryResult.rows.map((category) =>
      Object.freeze({
        roomCategoryId: category.room_category_id,
        propertyId: category.property_id,
        displayName: category.display_name,
        sourceLabel: category.source_label,
        discoveryOrder: category.discovery_order,
        categoryKind: category.category_kind,
        inventoryCount: category.inventory_count,
        inventoryCountAuthority: category.inventory_count_authority,
        sizeSquareMetres:
          category.size_square_metres === null
            ? null
            : Number(category.size_square_metres),
        discoveryText: category.discovery_text,
        sourceId: category.source_id,
        admissionState: category.admission_state,
        providerRoomTypeId: category.provider_room_type_id,
        canonicalBookingRoomTypeId: category.canonical_booking_room_type_id,
        rateAssociationStatus: category.rate_association_status,
        rates: category.rates,
        availability: category.availability,
        bookable: category.bookable,
      }),
    ),
  );

  const roomCategorySetWithoutHash = {
    propertyId: row.property_id,
    propertyName: row.property_name,
    status: row.status,
    accessMode: row.access_mode,
    membershipRequired: row.membership_required,
    propertyAdmissionRequired: row.property_admission_required,
    allowedStayUnits: Object.freeze([...row.allowed_stay_units]),
    publishedTotal: row.published_total,
    inventoryStatus: row.inventory_status,
    sourceReceipt: Object.freeze({
      sourceId: row.source_id,
      sourceFamily: row.source_family,
      sourceKind: row.source_kind,
      sourceUrl: row.source_url,
      observedAt: dateOnly(row.source_observed_at) as "2026-08-28",
      retrievalStatus: 200 as const,
      sourceSnapshotSha256: row.source_snapshot_sha256,
      sourceSnapshotBytes: row.source_snapshot_bytes,
      admissionState: "primary_source_admitted" as const,
    }),
    categories,
  };
  const computedSha256 = computeForestCityPublicRoomCategorySetSha256(
    roomCategorySetWithoutHash,
  );
  const sourceSet = FOREST_CITY_PUBLIC_ROOM_CATEGORY_SETS[propertyId];
  if (
    computedSha256 !== row.source_set_sha256 ||
    computedSha256 !== sourceSet.setSha256
  ) {
    throw new Error("FOREST_CITY_PUBLIC_ROOM_CATEGORY_SOURCE_DRIFT");
  }

  return Object.freeze({
    roomCategorySet: Object.freeze({
      ...roomCategorySetWithoutHash,
      setSha256: computedSha256,
    }),
    persistence: Object.freeze({
      ready: true as const,
      status: "persisted_source_match" as const,
      scope: row.persistence_scope,
      sourceSetMatch: true as const,
      providerRoomMappingReady: row.provider_room_mapping_ready,
      rateAssociationReady: row.rate_association_ready,
      availabilityReady: row.availability_ready,
      bookingReady: row.booking_ready,
    }),
  });
}

export function readForestCityPersistedRoomCategorySet(
  propertyId: ForestCityContentPropertyId,
) {
  return readForestCityPersistedRoomCategorySetWithPool(
    getCorePgPool(),
    propertyId,
  );
}
