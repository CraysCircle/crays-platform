export const FOREST_CITY_QLO_RATE_UI_CONTRACT = {
  schema: "crays.forest-city.qlo-rate-ui.v1",
  version: "1.2.0",
  endpoint: "/api/crays/clubs/forest-city/properties/{propertyId}/rates",
  method: "GET",
} as const;

export const FOREST_CITY_QLO_RATE_FORMULA = {
  version: "crays.forest-city.owner-provisional-usd.v1",
  fx: {
    pair: "USD/MYR",
    myrPerUsd: "4.0271",
    referenceDate: "2026-08-28",
    authority:
      "Bank Negara Malaysia and Financial Markets Association of Malaysia",
    sourceUrl: "https://www.bnm.gov.my/kuala-lumpur-usd/myr-reference-rate",
  },
  multipliers: {
    night: "3",
    week: "17.5",
    month: "60",
  },
  displayRoundingUsd: {
    night: 10,
    week: 50,
    month: 100,
  },
  exactMinorRounding: "nearest_cent_half_up",
  displayRounding: "nearest_increment_half_up",
} as const;

export const FOREST_CITY_QLO_RATE_PROVENANCE = {
  primaryRateAuthority: {
    title: "FOREST CITY GOLF HOTEL ROOM RATE 2026",
    fileName: "FOREST CITY GOLF HOTEL ROOM RATE, 2026 (1).pdf",
    sha256: "6e27b26f5a9298625d81cbd83938ec2e0b1973c8449f13e2bebea13f5925afc3",
    sizeBytes: 83_481,
    pages: 1,
    sourceColumn: "Online Rate",
    sourceCurrency: "MYR",
    authority: "owner_authorized_provisional_online_rate_source",
  },
  referenceOnly: {
    title: "2026 NEW AGENT RATE & E-VOUCHER SYSTEM",
    fileName: "2026 NEW AGENT RATE & E-VOUCHER SYSTEM - ORIGINAL.pdf",
    sha256: "a83367b6f0c4aa0371a9327d6cecf8f6019d673ab9f02f306137e0a149d1f446",
    sizeBytes: 136_541,
    pages: 2,
    authority: "provenance_reference_only_not_public_rate_authority",
  },
  marinaPublicFromRate: {
    amountUsdMinor: 350_000,
    displayUsdMinor: 350_000,
    stayUnit: "month",
    authority: "owner_authorized_provisional_property_from_rate",
    instructedAt: "2026-08-28",
    projectionScope: "public_property_from_only",
    roomRateAllocationStatus: "not_ready_not_inferred",
  },
} as const;

export const FOREST_CITY_MARINA_PUBLIC_FROM_RATE = Object.freeze({
  stayUnit: "month" as const,
  exactUsdMinor: 350_000,
  displayUsdMinor: 350_000,
  currency: "USD" as const,
  sourceAuthority: "owner_authorized_provisional_property_from_rate" as const,
  projectionScope: "public_property_from_only" as const,
  roomRateAllocationStatus: "not_ready_not_inferred" as const,
});

export const FOREST_CITY_QLO_RATE_COPY = {
  golfReady: "Provisional QLO rate. Availability is checked separately.",
  rateUnavailable: "Rate currently unavailable",
  marinaAccess: "Members only · Monthly stays",
  marinaTierNeutralReady:
    "Provisional monthly member rate. Eligibility is checked separately.",
  marinaTierMappingPending:
    "This provisional monthly rate is currently the same for every eligible membership.",
  authenticationRequired: "Log in to view your eligible monthly member rate.",
  membershipRequired: "A confirmed CRAYS membership is required.",
  propertyAdmissionRequired: "This stay requires active Marina admission.",
} as const;

export const FOREST_CITY_RATE_PROPERTY_POLICIES = {
  "property-clubs-forest-city-golf": {
    propertyKey: "golf",
    accessMode: "public",
    canonicalAccessMode: "open",
    membershipRequired: false,
    propertyAdmissionRequired: false,
    allowedStayUnits: ["night", "week", "month"],
  },
  "property-clubs-forest-city-marina": {
    propertyKey: "marina",
    accessMode: "membership_only",
    canonicalAccessMode: "property_admission_required",
    membershipRequired: true,
    propertyAdmissionRequired: true,
    allowedStayUnits: ["month"],
  },
} as const;

export type ForestCityRatePropertyId =
  keyof typeof FOREST_CITY_RATE_PROPERTY_POLICIES;
export type ForestCityStayUnit = "night" | "week" | "month";
export type ForestCityRateBand = "weekday" | "weekend";

export const FOREST_CITY_RATE_AUTHORITY_STATES = {
  golf: {
    rateAuthority: "ready",
    availabilityAuthority: "source_not_ready",
    bookingAuthority: "booking_not_ready",
  },
  marina: {
    rateAuthority: "ready_provisional_tier_neutral",
    availabilityAuthority: "source_not_ready",
    bookingAuthority: "booking_not_ready",
  },
} as const;

export const FOREST_CITY_MARINA_MEMBERSHIP_AUTHORITY = {
  membershipDecisionAuthority: "CRAYS_TEAM",
  membershipStatusRequired: "confirmed",
  propertyAdmissionDecisionContract: "cclub063.property-admission.decision.v3",
  propertyAdmissionRequiredState:
    "active_non_revoked_current_dimension_exact_grant",
  membershipTierMappingStatus:
    "not_ready_not_required_for_tier_neutral_provisional_display",
  membershipTierMappingVersion: null,
  admittedMembershipTierIds: [],
  provisionalPricingMode: "tier_neutral",
  membershipControls: "eligibility_not_provisional_rate_selection",
} as const;

export type ForestCityRatePrice = {
  stayUnit: ForestCityStayUnit;
  exactUsdMinor: number;
  displayUsdMinor: number;
  currency: "USD";
  formulaVersion: typeof FOREST_CITY_QLO_RATE_FORMULA.version;
};

export type ForestCityRateBandProjection = {
  roomType: string;
  canonicalRoomTypeId: null;
  rateBand: ForestCityRateBand;
  sourceAmountMinor: number;
  sourceCurrency: "MYR";
  prices: readonly ForestCityRatePrice[];
};
