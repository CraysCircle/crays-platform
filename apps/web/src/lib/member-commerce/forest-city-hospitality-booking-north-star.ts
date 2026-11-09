export const CRAYS_CLUBS_LOCALES = [
  "en",
  "de",
  "es",
  "ca",
  "fr",
  "pt",
  "it",
] as const;

export type CraysClubsLocale = (typeof CRAYS_CLUBS_LOCALES)[number];

export const FOREST_CITY_HOSPITALITY_PROPERTIES = {
  golf: {
    propertyId: "property-clubs-forest-city-golf",
    routeSlug: "golf-hotel",
    accessMode: "open",
    bookingRule: "direct_booking_without_membership",
  },
  marina: {
    propertyId: "property-clubs-forest-city-marina",
    routeSlug: "marina-hotel",
    accessMode: "property_admission_required",
    bookingRule: "confirmed_membership_and_property_admission_required",
  },
} as const;

export type ForestCityHospitalityPropertyKey =
  keyof typeof FOREST_CITY_HOSPITALITY_PROPERTIES;

export type ForestCityHospitalityPropertyId =
  (typeof FOREST_CITY_HOSPITALITY_PROPERTIES)[ForestCityHospitalityPropertyKey]["propertyId"];

export const FOREST_CITY_HOSPITALITY_PUBLIC_ROUTES = {
  hospitality: (locale: CraysClubsLocale) => `/${locale}/hospitality`,
  property: (
    locale: CraysClubsLocale,
    propertyKey: ForestCityHospitalityPropertyKey,
  ) =>
    `/${locale}/hospitality/${FOREST_CITY_HOSPITALITY_PROPERTIES[propertyKey].routeSlug}`,
  room: (
    locale: CraysClubsLocale,
    propertyKey: ForestCityHospitalityPropertyKey,
    canonicalRoomSlug: string,
  ) =>
    `/${locale}/hospitality/${FOREST_CITY_HOSPITALITY_PROPERTIES[propertyKey].routeSlug}/rooms/${canonicalRoomSlug}`,
} as const;

export const FOREST_CITY_HOSPITALITY_API_CONTRACT = {
  existingAvailabilityAndBooking: "/api/crays/clubs/forest-city",
  existingBookingStatus: "/api/crays/clubs/forest-city/bookings/{bookingId}",
  requiredPropertyRead: "/api/crays/clubs/forest-city/properties/{propertyId}",
  publicRoomCategorySetRead:
    "/api/crays/clubs/forest-city/properties/{propertyId}/rooms",
  requiredRoomRead:
    "/api/crays/clubs/forest-city/properties/{propertyId}/rooms/{roomTypeId}",
} as const;

export const FOREST_CITY_HOSPITALITY_DATA_AUTHORITIES = {
  propertyProfiles: "crays_core.clubs_hotel_profiles",
  roomTypes: "crays_core.clubs_hotel_room_types",
  rates: "crays_core.clubs_hotel_room_rates",
  inventory: "crays_core.clubs_hotel_inventory_days",
  bookings: "crays_core.clubs_hotel_bookings",
  bookingNights: "crays_core.clubs_hotel_booking_nights",
  rateAndInventorySourceAuthority: "crays-allotment-contract",
  pmsRole: "later_transmission_and_confirmation_only",
} as const;

export const FOREST_CITY_MARINA_GATE = {
  requiredAccessMode: "property_admission_required",
  requiredState: "active_non_revoked_property_admission_grant",
  requiredDimensions: [
    "account_id",
    "property_id",
    "store_id",
    "tenant_id",
    "legal_entity_id",
    "assignment_version",
    "policy_version",
  ],
  insufficientStates: [
    "anonymous",
    "authenticated_without_membership",
    "application_submitted",
    "application_under_review",
    "ambassador_prequalification",
    "invitation_prospect",
    "revoked_membership",
    "expired_property_admission",
  ],
  finalDecisionAuthority: "CRAYS_TEAM",
} as const;

export const FOREST_CITY_GOLF_FLOW = {
  membershipRequired: false,
  propertyAdmissionRequired: false,
  permittedAnonymousStages: [
    "property_discovery",
    "room_discovery",
    "availability_search",
    "price_quote",
    "booking_request",
  ],
  productionConfirmationStillRequires:
    "real_inventory_price_payment_and_provider_confirmation_contract",
} as const;

export const CRAYSCLUB_LEGACY_FUNCTIONS_TO_PRESERVE = [
  "seven_locale_navigation",
  "destination_search",
  "exact_and_flexible_dates",
  "night_count",
  "adult_child_and_pet_request",
  "category_filter",
  "amenity_filter",
  "property_type_filter",
  "accessibility_filter",
  "collection_filter",
  "recommended_sorting",
  "tile_list_and_map_results",
  "complete_result_count",
  "property_and_room_detail",
  "gallery",
  "facts_facilities_rooms_and_amenities",
  "location",
  "house_rules_and_legal",
  "reviews",
  "availability",
  "optional_services",
  "save_and_wishlist",
  "cart",
  "account_handoff",
  "quote",
  "booking_request_and_status",
  "change_and_cancellation",
] as const;

export const CRAYSCLUB_LEGACY_AUDIT_FACTS = {
  auditedUrl:
    "https://www.craysclub.com/en/search?id_category=7&controller=category&id_lang=1&pets=0&occupancy%5B0%5D%5Badults%5D=2&occupancy%5B0%5D%5Bchildren%5D=0",
  currentResultDomain: "mallorca_villas",
  currentResultCount: 13,
  catalogApiObservedStatus: 404,
  bookingRequestPersistenceObserved: "browser_localStorage_only",
  liveCalendarAndPriceSyncObserved: false,
  authority:
    "legacy_functional_reference_not_proof_of_live_forest_city_booking",
} as const;

export type RoomCompletenessInput = {
  expectedCanonicalRoomTypeIds: readonly string[];
  returnedCanonicalRoomTypeIds: readonly string[];
  sourceReceiptAttached: boolean;
};

export type RoomCompletenessResult = {
  complete: boolean;
  displayAllowed: boolean;
  missingRoomTypeIds: string[];
  unexpectedRoomTypeIds: string[];
  reason: "complete" | "missing_source_receipt" | "room_set_mismatch";
};

export function evaluateRoomCompleteness(
  input: RoomCompletenessInput,
): RoomCompletenessResult {
  const expected = new Set(input.expectedCanonicalRoomTypeIds);
  const returned = new Set(input.returnedCanonicalRoomTypeIds);
  const missingRoomTypeIds = [...expected].filter((id) => !returned.has(id));
  const unexpectedRoomTypeIds = [...returned].filter((id) => !expected.has(id));

  if (!input.sourceReceiptAttached) {
    return {
      complete: false,
      displayAllowed: false,
      missingRoomTypeIds,
      unexpectedRoomTypeIds,
      reason: "missing_source_receipt",
    };
  }

  if (missingRoomTypeIds.length > 0 || unexpectedRoomTypeIds.length > 0) {
    return {
      complete: false,
      displayAllowed: false,
      missingRoomTypeIds,
      unexpectedRoomTypeIds,
      reason: "room_set_mismatch",
    };
  }

  return {
    complete: true,
    displayAllowed: true,
    missingRoomTypeIds: [],
    unexpectedRoomTypeIds: [],
    reason: "complete",
  };
}

export function resolveForestCityHospitalityProperty(propertyId: string) {
  return (
    Object.entries(FOREST_CITY_HOSPITALITY_PROPERTIES).find(
      ([, property]) => property.propertyId === propertyId,
    ) ?? null
  );
}
