export const FOREST_CITY_QLO_PROPERTY_CONTENT_UI_CONTRACT = {
  schema: "crays.forest-city.qlo-property-content-ui.v1",
  version: "1.4.0",
  endpoint: "/api/crays/clubs/forest-city/properties/{propertyId}/content",
  method: "GET",
  cache: "no-store",
} as const;

export const FOREST_CITY_QLO_PROPERTY_CONTENT_COPY = {
  readyWithConflicts: "Some property details are still being verified.",
  propertyUnavailable: "Property details are currently unavailable.",
  roomSetNotReady: "Room details are being verified.",
  mediaNotReady: "Property photography is not available yet.",
  mediaPartial: "Property photography is available. More images may be added.",
  mapNotReady: "Map location is being verified.",
  directPolicyQualifier:
    "Hotel-direct terms are shown for information only. CRAYS booking terms are not available yet.",
} as const;

export const FOREST_CITY_QLO_PROPERTY_CONTENT_AUTHORITIES = {
  publicContent: {
    ready: true,
    status: "ready_with_source_conflicts",
    authority: "source_attributed_public_projection",
  },
  canonicalRoomSet: {
    ready: false,
    status: "source_not_ready",
    code: "FOREST_CITY_CANONICAL_ROOM_SOURCE_NOT_READY",
  },
  media: {
    ready: true,
    status: "admitted_renderable_collection_partial_coverage",
    code: "FOREST_CITY_MEDIA_COLLECTION_ADMITTED_GOLF_BOOKING_PARTIAL",
    complete: false,
    licenseReceiptIds: [
      "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
    ],
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

export const FOREST_CITY_CONTENT_PROPERTY_IDS = [
  "property-clubs-forest-city-golf",
  "property-clubs-forest-city-marina",
] as const;

export type ForestCityContentPropertyId =
  (typeof FOREST_CITY_CONTENT_PROPERTY_IDS)[number];

export type ForestCityContentSource = {
  id: string;
  sourceFamily: string;
  url: string;
  sourceKind:
    | "official_hotel"
    | "official_destination"
    | "official_booking_engine"
    | "secondary_ota";
  authority: "primary" | "secondary";
  confidence: "high" | "medium_high" | "medium" | "retrieval_blocked";
  observedAt: "2026-08-28";
  retrievalStatus: number;
  contentSha256: string | null;
  contentBytes: number | null;
  admissionState:
    | "primary_source_admitted"
    | "secondary_source_attributed_unmerged"
    | "retrieval_blocked_not_admitted";
  conflictId: string | null;
};

export type ForestCityFieldEvidence = {
  field: string;
  value: unknown;
  sourceFamily: string;
  sourceUrl: string;
  observedAt: "2026-08-28";
  authority: "primary" | "secondary" | "owner_channel_rule";
  confidence: "high" | "medium_high" | "medium";
  admissionState:
    | "admitted"
    | "source_attributed_unmerged"
    | "rejected_conflict"
    | "internal_evidence_only"
    | "owner_channel_only";
  conflictId: string | null;
};

export type ForestCityMediaEvidence = {
  id: string;
  url: string;
  sourceId: string;
  evidenceRole:
    | "property"
    | "room"
    | "pool"
    | "gym"
    | "lobby"
    | "beach"
    | "restaurant"
    | "conference"
    | "golf";
  retrievalStatus: 200;
  mediaType: "image/jpeg";
  rightsStatus: "blocked" | "admitted";
  licenseReceiptId: string | null;
  originalAssetSha256: string | null;
  originalAssetAvailable: boolean;
  hotlinkAllowed: false;
  rehostingAllowed: boolean;
  renderable: false;
  admissionState: "evidence_only_blocked" | "promoted_to_admitted_media";
  admittedMediaId: string | null;
};

export type ForestCityAdmittedMedia = {
  id: string;
  propertyId: ForestCityContentPropertyId;
  sourceFamily:
    | "forest_city_golf_hotel_official"
    | "forest_city_marina_hotel_official"
    | "booking_com_partner_property_media";
  sourceEvidenceId: string;
  sourceAssetId: string | null;
  sourceUrl: string;
  finalSourceUrl: string;
  observedAt: "2026-08-28";
  authority:
    | "owner_authorized_official_hotel_media"
    | "owner_authorized_booking_com_partner_media";
  licenseReceiptId: string;
  originalAsset: string;
  publicPath: string;
  originalSha256: string;
  servedAssetSha256: string;
  mediaType: "image/jpeg";
  width: number;
  height: number;
  placement:
    | "detail_gallery_primary"
    | "search_card_primary"
    | "promo"
    | "destination"
    | "collection"
    | "forest_city_overview"
    | "sfz_context"
    | "editorial"
    | "gallery_supporting";
  searchPlacement:
    | "search_card_primary"
    | "promo"
    | "promo_book_and_relax"
    | "promo_forest_city_properties"
    | "destination"
    | "destination_golf_hotel"
    | "destination_forest_city_waterfront"
    | "destination_legacy_golf_course"
    | "collection"
    | "collection_public_hotel_stays"
    | "collection_member_monthly_stays"
    | "collection_marina_hospitality"
    | "forest_city_overview"
    | "sfz_context"
    | "editorial"
    | "editorial_collections_for_stay_types"
    | "editorial_search_map_detail_pages"
    | "editorial_clear_stay_information"
    | null;
  galleryGroup:
    | "Exterior"
    | "Rooms & Suites"
    | "Facilities"
    | "Dining"
    | "Golf & Beach"
    | "Meetings & Events"
    | "Property gallery";
  galleryOrder: number;
  detailGalleryOrder: number;
  alt: string;
  focalPoint: { readonly x: number; readonly y: number };
  crop: "cover";
  rightsStatus: "admitted";
  renderable: true;
  hotlinkAllowed: false;
  rehostingAllowed: true;
  admissionState: "admitted_owner_authorized_source_bound";
  canonicalRoomTypeId: null;
  bookable: false;
  usageQualifier: "property_and_search_media_no_canonical_room_or_booking_binding";
};

export type ForestCitySourceAttributedContent = {
  propertyId: ForestCityContentPropertyId;
  route: string;
  identity: Record<string, unknown>;
  location: Record<string, unknown>;
  contacts: Record<string, unknown>;
  operator: Record<string, unknown>;
  classification: Record<string, unknown>;
  inventory: Record<string, unknown>;
  roomDiscovery: Record<string, unknown>;
  facilities: readonly Record<string, unknown>[];
  dining: readonly Record<string, unknown>[];
  meetings: readonly Record<string, unknown>[];
  policies: Record<string, unknown>;
  craysChannelRules: Record<string, unknown>;
  sources: readonly ForestCityContentSource[];
  fieldEvidence: readonly ForestCityFieldEvidence[];
  conflicts: readonly Record<string, unknown>[];
  reviews: Record<string, unknown>;
  admittedMedia: readonly ForestCityAdmittedMedia[];
  mediaEvidence: readonly ForestCityMediaEvidence[];
  frontendProjection: Record<string, unknown>;
};

export type ForestCityPublicContentProjection = Pick<
  ForestCitySourceAttributedContent,
  | "propertyId"
  | "route"
  | "identity"
  | "location"
  | "classification"
  | "inventory"
  | "roomDiscovery"
  | "facilities"
  | "dining"
  | "meetings"
  | "policies"
  | "reviews"
  | "admittedMedia"
>;
