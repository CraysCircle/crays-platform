export const FOREST_CITY_MEMBER_PROPERTY_STATE_CONTRACT = {
  schema: "crays.clubs.member-property-state.v2",
  version: "2.0.0",
  endpoint: "/api/crays/clubs/member/state",
  cache: "no-store",
  authentication: "crays_clubs_b2c_auth0_exact_core_mapping",
  mutationSecurity: {
    sameOrigin: true,
    jsonOnly: true,
    idempotencyKeyRequired: true,
  },
  authoritySeparation: {
    saved: "source_admitted_public_property_identity",
    planningCart: "source_admitted_public_property_identity",
    commercialCart: "active_exact_seller_provider_binding",
    booking: "separate_property_room_inventory_quote_admission_provider_gate",
  },
} as const;

export const FOREST_CITY_MEMBER_PROPERTY_IDENTITIES = {
  "property-clubs-forest-city-golf": {
    displayName: "Forest City Golf Hotel",
    publicPath: "/en/hospitality/golf-hotel",
    accessMode: "public",
    membershipRequired: false,
    allowedStayUnits: ["night", "week", "month"],
  },
  "property-clubs-forest-city-marina": {
    displayName: "Forest City Marina Hotel",
    publicPath: "/en/hospitality/marina-hotel",
    accessMode: "membership_only",
    membershipRequired: true,
    allowedStayUnits: ["month"],
  },
} as const;

export const FOREST_CITY_MEMBER_PROPERTY_STATE_RESPONSES = {
  saved: {
    status: "persisted",
    bookingAuthority: false,
  },
  planningCart: {
    status: "persisted",
    cartState: "planning",
    commercialBinding: false,
    bookingAuthority: false,
    authorityStatus: "commercial_binding_not_ready",
  },
  commerciallyBoundCart: {
    status: "persisted",
    cartState: "commercially_bound",
    commercialBinding: true,
    bookingAuthority: false,
  },
} as const;

export const FOREST_CITY_MEMBER_PROPERTY_STATE_HTTP = {
  ready: 200,
  validationError: 400,
  signedOut: 401,
  denied: 403,
  identityBindingRequired: 409,
  replayConflict: 409,
  unavailableOrUnknownOutcome: 503,
} as const;
