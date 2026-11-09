import "server-only";

import { createHash } from "node:crypto";
import type { ForestCityContentPropertyId } from "./forest-city-hospitality-content-contract";

export const FOREST_CITY_QLO_ROOM_CATEGORY_SET_UI_CONTRACT = {
  schema: "crays.forest-city.qlo-room-category-set-ui.v1",
  version: "1.1.0",
  endpoint: "/api/crays/clubs/forest-city/properties/{propertyId}/rooms",
  method: "GET",
  cache: "no-store",
} as const;

export const FOREST_CITY_QLO_ROOM_CATEGORY_AUTHORITIES = {
  publicRoomCategorySet: {
    ready: true,
    status: "source_admitted_non_bookable",
    authority: "source_bound_primary_room_discovery",
  },
  providerRoomSet: {
    ready: false,
    status: "provider_mapping_not_ready",
    code: "FOREST_CITY_PROVIDER_ROOM_SET_NOT_READY",
  },
  rateAssociation: {
    ready: false,
    status: "room_rate_allocation_not_ready_not_inferred",
    code: "FOREST_CITY_ROOM_RATE_ALLOCATION_NOT_READY",
  },
  availability: {
    ready: false,
    status: "source_not_ready",
    code: "FOREST_CITY_AVAILABILITY_SOURCE_NOT_READY",
  },
  booking: {
    ready: false,
    status: "booking_not_ready",
    code: "FOREST_CITY_BOOKING_AUTHORITY_NOT_READY",
  },
} as const;

export const FOREST_CITY_QLO_ROOM_CATEGORY_COPY = {
  unavailable: "Room details are currently unavailable.",
} as const;

type RoomCategoryKind = "room" | "suite" | "accessible_room";

export type ForestCityRoomCategorySourceReceipt = {
  sourceId: "golf-about" | "marina-swiftbook";
  sourceFamily:
    | "forest_city_golf_hotel_official"
    | "forest_city_marina_official_booking_engine";
  sourceKind: "official_hotel" | "official_booking_engine";
  sourceUrl: string;
  observedAt: "2026-08-28";
  retrievalStatus: 200;
  sourceSnapshotSha256: string;
  sourceSnapshotBytes: number;
  admissionState: "primary_source_admitted";
};

export type ForestCityPublicRoomCategory = {
  roomCategoryId: string;
  propertyId: ForestCityContentPropertyId;
  displayName: string;
  sourceLabel: string;
  discoveryOrder: number;
  categoryKind: RoomCategoryKind;
  inventoryCount: number | null;
  inventoryCountAuthority:
    | "official_property_inventory_reference_not_live_availability"
    | "not_published_source_conflict";
  sizeSquareMetres: number | null;
  discoveryText: string | null;
  sourceId: ForestCityRoomCategorySourceReceipt["sourceId"];
  admissionState: "source_admitted_public_room_category";
  providerRoomTypeId: null;
  canonicalBookingRoomTypeId: null;
  rateAssociationStatus: "not_ready_not_inferred";
  rates: null;
  availability: null;
  bookable: false;
};

export type ForestCityPublicRoomCategorySet = {
  propertyId: ForestCityContentPropertyId;
  propertyName: "Forest City Golf Hotel" | "Forest City Marina Hotel";
  status: "source_admitted_non_bookable";
  accessMode: "open" | "property_admission_required";
  membershipRequired: boolean;
  propertyAdmissionRequired: boolean;
  allowedStayUnits: readonly ("night" | "week" | "month")[];
  publishedTotal: number | null;
  inventoryStatus:
    | "primary_admitted_secondary_conflict_retained"
    | "source_conflict_total_not_published";
  sourceReceipt: ForestCityRoomCategorySourceReceipt;
  setSha256: string;
  categories: readonly ForestCityPublicRoomCategory[];
};

const GOLF_SOURCE_RECEIPT: ForestCityRoomCategorySourceReceipt = Object.freeze({
  sourceId: "golf-about",
  sourceFamily: "forest_city_golf_hotel_official",
  sourceKind: "official_hotel",
  sourceUrl:
    "https://fcgolfhotel.com/about-forest-city-phoenix-golf-hotel-johor-bahru",
  observedAt: "2026-08-28",
  retrievalStatus: 200,
  sourceSnapshotSha256:
    "a3848567b20604e810237e1a148bc0bc4a8beb88f9930974570e1a6775c71a9e",
  sourceSnapshotBytes: 58_497,
  admissionState: "primary_source_admitted",
});

const MARINA_SOURCE_RECEIPT: ForestCityRoomCategorySourceReceipt =
  Object.freeze({
    sourceId: "marina-swiftbook",
    sourceFamily: "forest_city_marina_official_booking_engine",
    sourceKind: "official_booking_engine",
    sourceUrl: "https://www.swiftbook.io/inst/#home?propertyId=26767",
    observedAt: "2026-08-28",
    retrievalStatus: 200,
    sourceSnapshotSha256:
      "ff8023fc6d3372573c9ca452a8e181ee038c2c90aac6f9f38db75f396beb2ac4",
    sourceSnapshotBytes: 2_609,
    admissionState: "primary_source_admitted",
  });

function roomCategory(
  input: Omit<
    ForestCityPublicRoomCategory,
    | "admissionState"
    | "providerRoomTypeId"
    | "canonicalBookingRoomTypeId"
    | "rateAssociationStatus"
    | "rates"
    | "availability"
    | "bookable"
  >,
): ForestCityPublicRoomCategory {
  return Object.freeze({
    ...input,
    admissionState: "source_admitted_public_room_category" as const,
    providerRoomTypeId: null,
    canonicalBookingRoomTypeId: null,
    rateAssociationStatus: "not_ready_not_inferred" as const,
    rates: null,
    availability: null,
    bookable: false as const,
  });
}

const golfPropertyId = "property-clubs-forest-city-golf" as const;
const marinaPropertyId = "property-clubs-forest-city-marina" as const;

const GOLF_CATEGORIES = Object.freeze(
  [
    ["superior-room", "Superior Room", "room", 168],
    ["deluxe-room", "Deluxe Room", "room", 87],
    ["superior-suite", "Superior Suite", "suite", 22],
    ["deluxe-suite", "Deluxe Suite", "suite", 15],
    ["accessible-room", "Disabled Rooms", "accessible_room", 2],
    ["family-suite", "Family Suite", "suite", 1],
    ["presidential-suite", "Presidential Suite", "suite", 3],
  ].map(([slug, label, categoryKind, inventoryCount], index) =>
    roomCategory({
      roomCategoryId: `room-category-fc-golf-${slug}`,
      propertyId: golfPropertyId,
      displayName: String(label),
      sourceLabel: String(label),
      discoveryOrder: index + 1,
      categoryKind: categoryKind as RoomCategoryKind,
      inventoryCount: Number(inventoryCount),
      inventoryCountAuthority:
        "official_property_inventory_reference_not_live_availability",
      sizeSquareMetres: null,
      discoveryText: null,
      sourceId: "golf-about",
    }),
  ),
);

const MARINA_CATEGORIES = Object.freeze(
  [
    ["superior-twin", "Superior Twin", "room", 44, null],
    ["deluxe-king", "Deluxe King", "room", 44, null],
    ["deluxe-twin", "Deluxe Twin", "room", 44, null],
    ["superior-suite", "Superior Suite", "suite", 136, null],
    ["deluxe-suite", "Deluxe Suite", "suite", 136, null],
    ["superior-king", "Superior King", "room", 44, null],
    [
      "presidential-suite",
      "Presidential Suite",
      "suite",
      null,
      "Featuring Seaview (subject to availability) and has a balcony and terrace.",
    ],
  ].map(([slug, label, categoryKind, sizeSquareMetres, discoveryText], index) =>
    roomCategory({
      roomCategoryId: `room-category-fc-marina-${slug}`,
      propertyId: marinaPropertyId,
      displayName: String(label),
      sourceLabel: String(label),
      discoveryOrder: index + 1,
      categoryKind: categoryKind as RoomCategoryKind,
      inventoryCount: null,
      inventoryCountAuthority: "not_published_source_conflict",
      sizeSquareMetres:
        typeof sizeSquareMetres === "number" ? sizeSquareMetres : null,
      discoveryText: typeof discoveryText === "string" ? discoveryText : null,
      sourceId: "marina-swiftbook",
    }),
  ),
);

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function computeForestCityPublicRoomCategorySetSha256(
  input: Omit<ForestCityPublicRoomCategorySet, "setSha256">,
): string {
  return createHash("sha256").update(canonicalJson(input)).digest("hex");
}

function roomSet(
  input: Omit<ForestCityPublicRoomCategorySet, "setSha256">,
): ForestCityPublicRoomCategorySet {
  return Object.freeze({
    ...input,
    setSha256: computeForestCityPublicRoomCategorySetSha256(input),
  });
}

export const FOREST_CITY_PUBLIC_ROOM_CATEGORY_SETS = Object.freeze({
  [golfPropertyId]: roomSet({
    propertyId: golfPropertyId,
    propertyName: "Forest City Golf Hotel",
    status: "source_admitted_non_bookable",
    accessMode: "open",
    membershipRequired: false,
    propertyAdmissionRequired: false,
    allowedStayUnits: ["night", "week", "month"],
    publishedTotal: 298,
    inventoryStatus: "primary_admitted_secondary_conflict_retained",
    sourceReceipt: GOLF_SOURCE_RECEIPT,
    categories: GOLF_CATEGORIES,
  }),
  [marinaPropertyId]: roomSet({
    propertyId: marinaPropertyId,
    propertyName: "Forest City Marina Hotel",
    status: "source_admitted_non_bookable",
    accessMode: "property_admission_required",
    membershipRequired: true,
    propertyAdmissionRequired: true,
    allowedStayUnits: ["month"],
    publishedTotal: null,
    inventoryStatus: "source_conflict_total_not_published",
    sourceReceipt: MARINA_SOURCE_RECEIPT,
    categories: MARINA_CATEGORIES,
  }),
});

export function readForestCityPublicRoomCategorySet(
  propertyId: ForestCityContentPropertyId,
) {
  return FOREST_CITY_PUBLIC_ROOM_CATEGORY_SETS[propertyId];
}
