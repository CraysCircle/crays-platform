import "server-only";

import type {
  ForestCityContentPropertyId,
  ForestCityContentSource,
  ForestCityFieldEvidence,
  ForestCityMediaEvidence,
  ForestCityPublicContentProjection,
  ForestCitySourceAttributedContent,
} from "./forest-city-hospitality-content-contract";
import {
  findForestCityHospitalityMediaAdmission,
  FOREST_CITY_HOSPITALITY_FRONTEND_PROJECTION_RULES,
  getForestCityHospitalityAdmittedMedia,
} from "./forest-city-hospitality-media-admission";

const observedAt = "2026-08-28" as const;

function fieldEvidence(entries: ForestCityFieldEvidence[]) {
  return Object.freeze(entries);
}

function primary(
  id: string,
  url: string,
  sourceKind:
    "official_hotel" | "official_destination" | "official_booking_engine",
  contentSha256: string,
  contentBytes: number,
): ForestCityContentSource {
  return Object.freeze({
    id,
    sourceFamily:
      sourceKind === "official_destination"
        ? "forest_city_destination_official"
        : sourceKind === "official_booking_engine"
          ? "forest_city_marina_official_booking_engine"
          : url.includes("fcmarinahotel.com")
            ? "forest_city_marina_hotel_official"
            : "forest_city_golf_hotel_official",
    url,
    sourceKind,
    authority: "primary",
    confidence: "high",
    observedAt,
    retrievalStatus: 200,
    contentSha256,
    contentBytes,
    admissionState: "primary_source_admitted",
    conflictId: null,
  });
}

function secondary(
  id: string,
  url: string,
  retrievalStatus: number,
  contentSha256: string | null,
  contentBytes: number | null,
): ForestCityContentSource {
  return Object.freeze({
    id,
    sourceFamily: url.includes("expedia.com")
      ? "expedia_group"
      : url.includes("booking.com")
        ? "booking_holdings"
        : url.includes("agoda.com")
          ? "booking_holdings"
          : url.includes("trip.com")
            ? "trip_com_group"
            : "travelmyth",
    url,
    sourceKind: "secondary_ota",
    authority: "secondary",
    confidence: retrievalStatus === 403 ? "retrieval_blocked" : "medium",
    observedAt,
    retrievalStatus,
    contentSha256,
    contentBytes,
    admissionState:
      retrievalStatus === 403
        ? "retrieval_blocked_not_admitted"
        : "secondary_source_attributed_unmerged",
    conflictId: null,
  });
}

function media(
  id: string,
  url: string,
  sourceId: string,
  evidenceRole: ForestCityMediaEvidence["evidenceRole"],
): ForestCityMediaEvidence {
  const admission = findForestCityHospitalityMediaAdmission(url);
  return Object.freeze({
    id,
    url,
    sourceId,
    evidenceRole,
    retrievalStatus: 200,
    mediaType: "image/jpeg",
    rightsStatus: admission ? "admitted" : "blocked",
    licenseReceiptId: admission?.licenseReceiptId ?? null,
    originalAssetSha256: admission?.originalSha256 ?? null,
    originalAssetAvailable: Boolean(admission),
    hotlinkAllowed: false,
    rehostingAllowed: Boolean(admission),
    renderable: false,
    admissionState: admission
      ? "promoted_to_admitted_media"
      : "evidence_only_blocked",
    admittedMediaId: admission?.id ?? null,
  });
}

const marinaSources = Object.freeze([
  primary(
    "marina-home",
    "https://www.fcmarinahotel.com/",
    "official_hotel",
    "b9f5daba8db98d6a531ca41f6258053a6cd903a198507b5dec6cba97d1027558",
    141_372,
  ),
  primary(
    "marina-about",
    "https://www.fcmarinahotel.com/about-marina-hotel-in-country-garden-forest-city-johor-bahru",
    "official_hotel",
    "3df8894f0ce9028afa9de74dee4bdf8c2276ffd48488392e143a2759aff3d470",
    55_913,
  ),
  primary(
    "marina-contact",
    "https://www.fcmarinahotel.com/contact-us-country-garden-forest-city-marina-hotel-johor-bahru",
    "official_hotel",
    "a7d8bfdffe1dbc1c7e72f788ac284e2a5b1412b2104090c59ea587a573d8a2eb",
    118_239,
  ),
  primary(
    "marina-recreation",
    "https://www.fcmarinahotel.com/facilities-at-country-garden-forest-city-marina-hotel/recreation-and-entertainment-facilities-in-country-garden-forest-city-marina-hotel-johor-bahru",
    "official_hotel",
    "c6db1b1e11f9df52bdb15ca522b1edbf81ac330816111c7047df1aa0f34c4607",
    62_437,
  ),
  primary(
    "marina-events",
    "https://www.fcmarinahotel.com/facilities-at-country-garden-forest-city-marina-hotel/events-and-meetings-rooms-at-country-garden-forest-city-marina-hotel-johor-bahru",
    "official_hotel",
    "446f5a0378276b71d2a1f6e175ef8b4995a25fbc46dc339b0ef3de0e3e144bd0",
    62_080,
  ),
  primary(
    "marina-other-facilities",
    "https://www.fcmarinahotel.com/facilities-at-country-garden-forest-city-marina-hotel/others-facilities-at-country-garden-forest-city-marina-hotel-johor-bahru",
    "official_hotel",
    "d22aa1e89acabf201d2687c687cb41151c16bbbd91949c592d4d6dabf9f12a16",
    89_707,
  ),
  primary(
    "marina-direct-policy",
    "https://www.fcmarinahotel.com/refund-policy",
    "official_hotel",
    "1c1ddcf0de6555421ccb28d04b25022a22d6ef5353487dfec2aff7a1f46dd3aa",
    41_594,
  ),
  primary(
    "marina-swiftbook",
    "https://www.swiftbook.io/inst/#home?propertyId=26767",
    "official_booking_engine",
    "ff8023fc6d3372573c9ca452a8e181ee038c2c90aac6f9f38db75f396beb2ac4",
    2_609,
  ),
  primary(
    "forest-city-hotels",
    "https://www.forestcitysfz.com/tourism/forest-city-hotel",
    "official_destination",
    "418e3667e964901486707b9ad7ee76648399d6a71c12b7aa543ce13da6e58c98",
    49_052,
  ),
  secondary(
    "marina-expedia",
    "https://www.expedia.com/Johor-Bahru-Hotels-Forest-City-Marina-Hotel.h17399959.Hotel-Information",
    403,
    null,
    null,
  ),
  secondary(
    "marina-booking",
    "https://www.booking.com/hotel/my/po-forest-city-marina-hotel-kampong-tanjong-kupang.ms.html",
    202,
    "7070c76ede93c778e7f9d956435ed27f26dd0ba6de22122a416e0a99108c0c28",
    3_962,
  ),
  secondary(
    "marina-agoda",
    "https://www.agoda.com/forest-city-phoenix-international-marina-hotel/hotel/johor-bahru-my.html",
    200,
    "17e12466dc5d467720be9439341d0bd2c281db2984aae75384c06cc4635e5a13",
    340_897,
  ),
  secondary(
    "marina-trip",
    "https://www.trip.com/hotels/gelang-patah-hotel-detail-6633787/forest-city-marina-hotel",
    200,
    "cfcc5ea609af8691984f73d7eaef6e5fc16edfcfa885f004033d727d25c18973",
    473_943,
  ),
]);

const golfSources = Object.freeze([
  primary(
    "golf-home",
    "https://fcgolfhotel.com/",
    "official_hotel",
    "4160a2d039c012ae857bbc308be5dfec98c6d5112eaa0e68d82a8b6638e1ac4b",
    72_191,
  ),
  primary(
    "golf-about",
    "https://fcgolfhotel.com/about-forest-city-phoenix-golf-hotel-johor-bahru",
    "official_hotel",
    "a3848567b20604e810237e1a148bc0bc4a8beb88f9930974570e1a6775c71a9e",
    58_497,
  ),
  primary(
    "golf-contact",
    "https://fcgolfhotel.com/contact-at-forest-city-phoenix-golf-hotel-johor-bahru",
    "official_hotel",
    "11648580553efeb34bd0cb07c243384198efdea85d0c4ff7f8b08aabfadfe3e7",
    96_357,
  ),
  primary(
    "golf-health",
    "https://fcgolfhotel.com/facilities-at-forest-city-phoenix-golf-hotel-johor-bahru/health-recreation-at-forest-city-phoenix-golf-hotel-johor-bahru",
    "official_hotel",
    "6951e1108a88cf0300e4459f36dd81e349e1ec3b27bf84198e26f5f2b7d0df2d",
    57_699,
  ),
  primary(
    "golf-conference",
    "https://fcgolfhotel.com/facilities-at-forest-city-phoenix-golf-hotel-johor-bahru/conference-venue-at-forest-city-phoenix-golf-hotel-johor-bahru",
    "official_hotel",
    "60e2453586053172cc477bd1bc3b221bb4aa09c8a2e55f09caf85ff5a89f6f52",
    58_175,
  ),
  primary(
    "golf-dining",
    "https://fcgolfhotel.com/facilities-at-forest-city-phoenix-golf-hotel-johor-bahru/dining-at-forest-city-phoenix-golf-hotel-johor-bahru",
    "official_hotel",
    "7801a62feb25e39d093b1f39279a50700be1f58fe7f09884544438d4795838a8",
    60_938,
  ),
  primary(
    "golf-course",
    "https://fcgolfhotel.com/facilities-at-forest-city-phoenix-golf-hotel-johor-bahru/golf-at-forest-city-phoenix-golf-hotel-johor-bahru",
    "official_hotel",
    "f5533c1c4f713d9007d0a112fb7e4a0d94620642fee56fc39eb1ced6f0d83707",
    62_747,
  ),
  primary(
    "golf-direct-policy",
    "https://fcgolfhotel.com/refund-policy",
    "official_hotel",
    "1f9556ab62b6c2301d5c2b129cffcfbc91a5766a86ab367e5691c90bf3ec815e",
    48_799,
  ),
  primary(
    "forest-city-hotels",
    "https://www.forestcitysfz.com/tourism/forest-city-hotel",
    "official_destination",
    "418e3667e964901486707b9ad7ee76648399d6a71c12b7aa543ce13da6e58c98",
    49_052,
  ),
  secondary(
    "golf-expedia",
    "https://www.expedia.com/Johor-Bahru-Hotels-Forest-City-Golf-Hotel.h26543248.Hotel-Information",
    403,
    null,
    null,
  ),
  secondary(
    "golf-booking",
    "https://www.booking.com/hotel/my/forest-city-golf.en-gb.html",
    202,
    "2e0f6ea2d671acd20ff3b894469fc700a77840bf4372b28d29cc276d22215039",
    7_033,
  ),
  secondary(
    "golf-agoda",
    "https://www.agoda.com/en-au/forest-city-phoenix-international-golf-hotel/hotel/johor-bahru-my.html",
    200,
    "e6b7af82c027201a1f8ecf2d401cba43428ae70d17d79698a9234fc964c9c994",
    341_721,
  ),
  secondary(
    "golf-travelmyth",
    "https://www.travelmyth.com/Nusajaya/Hotels/Forest-City-Golf-Hotel_tmid2762849",
    200,
    "b63cd8041251c6a7fd3e04ac1d627a0076b940f1caaf8bdecfb21f1c5ae74797",
    412_899,
  ),
]);

const marinaMedia = Object.freeze([
  media(
    "marina-property-1",
    "https://www.forestcitysfz.com/images/0_forestcity/hotel/marina/marina1.jpg",
    "forest-city-hotels",
    "property",
  ),
  ...([1, 2, 3, 4] as const).map((index) =>
    media(
      `marina-property-${index + 1}`,
      `https://www.forestcitysfz.com/images/0_forestcity/hotel/marina/n--O_${index}.jpg`,
      "forest-city-hotels",
      "property",
    ),
  ),
  media(
    "marina-room-superior",
    "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/room/superior.jpg",
    "marina-home",
    "room",
  ),
  media(
    "marina-room-deluxe-suite",
    "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/room/deluxe-suite.jpg",
    "marina-home",
    "room",
  ),
  media(
    "marina-room-superior-suite",
    "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/room/home-superior-suite.jpg",
    "marina-home",
    "room",
  ),
  media(
    "marina-room-presidential-suite",
    "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/room/presidential-suite.jpg",
    "marina-home",
    "room",
  ),
  media(
    "marina-pool",
    "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/pool-001.jpg",
    "marina-recreation",
    "pool",
  ),
  media(
    "marina-gym",
    "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/gym-001.jpg",
    "marina-recreation",
    "gym",
  ),
  media(
    "marina-lobby",
    "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/lobby-001.jpg",
    "marina-other-facilities",
    "lobby",
  ),
  media(
    "marina-beach",
    "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/beach-001.jpg",
    "marina-other-facilities",
    "beach",
  ),
  media(
    "marina-restaurant",
    "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/restaurant-002.jpg",
    "marina-other-facilities",
    "restaurant",
  ),
]);

const golfMedia = Object.freeze([
  media(
    "golf-family-suite",
    "https://fcgolfhotel.com/images/2019/01/11/family-suite20190111.jpg",
    "golf-home",
    "room",
  ),
  media(
    "golf-king-room",
    "https://fcgolfhotel.com/images/1_Golf-hotel/home/Superior-Deluxe-King-Room.jpg",
    "golf-home",
    "room",
  ),
  media(
    "golf-twin-room",
    "https://fcgolfhotel.com/images/1_Golf-hotel/home/Superior-Deluxe-Twin-Room.jpg",
    "golf-home",
    "room",
  ),
  media(
    "golf-suite-room",
    "https://fcgolfhotel.com/images/1_Golf-hotel/home/Superior-Deluxe-Suite-Room.jpg",
    "golf-home",
    "room",
  ),
  media(
    "golf-property",
    "https://fcgolfhotel.com/images/1_Golf-hotel/about/abt-001-min.jpg",
    "golf-about",
    "property",
  ),
  media(
    "golf-health",
    "https://fcgolfhotel.com/images/1_Golf-hotel/health/hr-001-min.jpg",
    "golf-health",
    "pool",
  ),
  media(
    "golf-conference",
    "https://fcgolfhotel.com/images/1_Golf-hotel/conference/cv-001-min.jpg",
    "golf-conference",
    "conference",
  ),
  media(
    "golf-restaurant",
    "https://fcgolfhotel.com/images/1_Golf-hotel/dining/rd-001-min.jpg",
    "golf-dining",
    "restaurant",
  ),
  media(
    "golf-course",
    "https://fcgolfhotel.com/images/1_Golf-hotel/golf/golf-003-min.jpg",
    "golf-course",
    "golf",
  ),
]);

const directPolicy = (sourceId: string) =>
  Object.freeze({
    status: "source_attributed_direct_channel_only",
    appliesTo: "hotel_direct_channel_only",
    craysChannelApplicability: "not_admitted",
    sourceId,
    checkInLocal: "15:00",
    checkOutLocal: "12:00",
    lateCheckout: {
      throughLocal: "18:00",
      chargeRule: "day_use_or_50_percent_daily_rate_whichever_higher",
      afterLocal: "18:00",
      afterRule: "full_daily_rate",
    },
    reservation: "subject_to_availability_and_hotel_confirmation",
    confirmedBooking: "non_refundable_and_non_transferable",
    cancellationWithinHours: 48,
    noShowCharge: "full_charge",
    specialRequestLeadHours: 24,
    specialRequestGuaranteed: false,
    paymentTiming: "at_check_in",
    validOnlyWithHotelReference: true,
  });

const marina: ForestCitySourceAttributedContent = Object.freeze({
  propertyId: "property-clubs-forest-city-marina",
  route: "/en/hospitality/marina-hotel",
  identity: Object.freeze({
    canonicalName: "Forest City Marina Hotel",
    legacyNames: [
      "Forest City Phoenix International Marina Hotel",
      "Country Garden Forest City Phoenix Hotel",
    ],
    legacyNamesUsage: "legacy_search_and_source_attribution_only",
    summary:
      "A Forest City hotel on Pulau Satu with rooms and suites overlooking the Straits of Johor.",
    sourceIds: ["marina-home", "marina-about"],
  }),
  location: Object.freeze({
    address:
      "Forest City Marina Hotel, Jalan Forest City 1, Pulau Satu, 81550 Gelang Patah, Johor, Malaysia",
    sourceId: "marina-contact",
    geoCandidate: {
      latitude: 1.3374935,
      longitude: 103.5855632,
      precision: "official_embedded_map_center_not_surveyed_parcel",
      publishableWithQualifier: true,
      sourceId: "marina-contact",
    },
    addressConflict: {
      status: "source_conflict",
      preferredPostalCode: "81550",
      conflictingCorporatePostalCode: "81500",
      sourceIds: ["marina-contact", "forest-city-hotels"],
    },
  }),
  contacts: Object.freeze({
    visibility: "internal_evidence_only",
    publicProjection: null,
    reservationEvidence: {
      email: "rsvmh_slcs@outlook.com",
      phones: [
        { value: "+60195011586", hours: "18:00-09:00" },
        { value: "+60138044588", hours: "09:00-18:00" },
      ],
    },
    publicHandoff: "crays_guest_contact_only",
    sourceId: "marina-contact",
  }),
  operator: Object.freeze({
    status: "source_conflict",
    publishedName: null,
    observations: [
      {
        name: "PACIFICVIEW DEVELOPMENT GROUP SDN BHD.",
        registrationNumber: "1044344-D",
        sourceId: "marina-home",
      },
      {
        name: "Country Garden Pacificview Sdn. Bhd.",
        registrationNumber: null,
        sourceId: "forest-city-hotels",
      },
    ],
  }),
  classification: Object.freeze({
    status: "not_published",
    publishedValue: null,
    reason: "no_unconflicted_primary_classification",
  }),
  inventory: Object.freeze({
    status: "source_conflict",
    publishedTotal: null,
    observations: [
      { totalRooms: 283, sourceId: "marina-about", authority: "primary" },
      {
        totalRooms: 286,
        sourceId: "forest-city-hotels",
        authority: "primary",
      },
    ],
    publicationRule: "do_not_publish_total_until_primary_conflict_is_resolved",
  }),
  roomDiscovery: Object.freeze({
    canonicalRoomSetStatus: "source_not_ready",
    discoverySetStatus: "official_labels_admitted_non_bookable",
    bookable: false,
    officialCategoryLabels: [
      {
        label: "Superior Twin",
        discoveryOrder: 1,
        sizeSquareMetres: 44,
        canonicalRoomTypeId: null,
        sourceId: "marina-swiftbook",
      },
      {
        label: "Deluxe King",
        discoveryOrder: 2,
        sizeSquareMetres: 44,
        canonicalRoomTypeId: null,
        sourceId: "marina-swiftbook",
      },
      {
        label: "Deluxe Twin",
        discoveryOrder: 3,
        sizeSquareMetres: 44,
        canonicalRoomTypeId: null,
        sourceId: "marina-swiftbook",
      },
      {
        label: "Superior Suite",
        discoveryOrder: 4,
        sizeSquareMetres: 136,
        canonicalRoomTypeId: null,
        sourceId: "marina-swiftbook",
      },
      {
        label: "Deluxe Suite",
        discoveryOrder: 5,
        sizeSquareMetres: 136,
        canonicalRoomTypeId: null,
        sourceId: "marina-swiftbook",
      },
      {
        label: "Superior King",
        discoveryOrder: 6,
        sizeSquareMetres: 44,
        canonicalRoomTypeId: null,
        sourceId: "marina-swiftbook",
      },
      {
        label: "Presidential Suite",
        discoveryOrder: 7,
        sizeSquareMetres: null,
        discoveryText:
          "Featuring Seaview (subject to availability) and has a balcony and terrace.",
        canonicalRoomTypeId: null,
        sourceId: "marina-swiftbook",
      },
    ].map((entry) => ({
      ...entry,
      admission: "official_discovery_non_bookable",
      rates: null,
      availability: null,
    })),
    merchandisingLabels: [
      {
        label: "Superior Room",
        status: "merchandising_label_not_additional_room_category",
        sourceId: "marina-home",
      },
    ],
    secondaryAttributedVariants: [
      {
        label: "Superior King",
        sizeSquareMetres: 44,
        sourceIds: ["marina-trip", "marina-agoda"],
      },
      {
        label: "Superior Twin",
        sizeSquareMetres: 44,
        sourceIds: ["marina-trip", "marina-agoda"],
      },
      {
        label: "Deluxe King",
        sizeSquareMetres: 44,
        sourceIds: ["marina-trip", "marina-agoda"],
      },
      {
        label: "Deluxe Twin",
        sizeSquareMetres: 44,
        sourceIds: ["marina-trip", "marina-agoda"],
      },
      {
        label: "Superior Suite",
        sizeSquareMetres: 136,
        sourceIds: ["marina-trip", "marina-agoda"],
      },
      {
        label: "Deluxe Suite",
        sizeSquareMetres: 136,
        sourceIds: ["marina-trip", "marina-agoda"],
      },
      {
        label: "Presidential Suite",
        sizeSquareMetres: 253,
        sourceIds: ["marina-trip", "marina-agoda"],
      },
    ].map((entry) => ({
      ...entry,
      canonicalRoomTypeId: null,
      admission: "source_attributed_secondary_unmerged",
      rates: null,
      availability: null,
    })),
  }),
  facilities: Object.freeze([
    {
      id: "adult-and-children-pools",
      label: "Adult and children swimming pools",
      operationHours: "08:00-19:00",
      sourceId: "marina-recreation",
    },
    {
      id: "gym",
      label: "Gym on the first floor",
      operationHours: "07:00-19:00",
      sourceId: "marina-recreation",
    },
    {
      id: "lobby-bar",
      label: "Lobby Bar",
      operationHours: null,
      sourceId: "marina-other-facilities",
    },
    {
      id: "beach-area",
      label: "Beach Area",
      operationHours: null,
      sourceId: "marina-other-facilities",
    },
    {
      id: "rom-venue",
      label: "Beach-view ROM and wedding venue",
      operationHours: null,
      sourceId: "marina-other-facilities",
    },
  ]),
  dining: Object.freeze([
    {
      id: "c-and-m-restaurant",
      label: "C&M Restaurant",
      cuisine: "international",
      sourceId: "marina-other-facilities",
      serviceHours: {
        breakfast: "07:00-10:00",
        lunch: "12:00-14:00",
        dinner: "18:00-21:00",
      },
      publicMealPricesAdmitted: false,
    },
    {
      id: "private-dining",
      label: "Private dining rooms",
      sourceId: "marina-events",
    },
  ]),
  meetings: Object.freeze([
    {
      id: "conference-rooms",
      label: "Conference rooms",
      detailsStatus: "source_attributed_without_capacity_matrix",
      sourceId: "marina-events",
    },
  ]),
  policies: Object.freeze({
    directChannel: directPolicy("marina-direct-policy"),
    conflicts: [
      "ota_cancellation_is_rate_specific",
      "minimum_age_and_deposit_are_secondary_only",
      "pet_policy_is_secondary_only",
      "floor_count_12_vs_13",
      "smoking_policy_conflict",
      "pool_and_gym_hours_official_vs_ota_conflict",
    ],
  }),
  craysChannelRules: Object.freeze({
    authority: "owner_authorized_crays_qlo_channel_not_hotel_public_fact",
    accessMode: "membership_only",
    canonicalAccessMode: "property_admission_required",
    allowedStayUnits: ["month"],
    rateStatus: "ready_provisional_tier_neutral",
    pricingMode: "tier_neutral_provisional",
    membershipTierMappingStatus: "not_ready",
    membershipTierMappingVersion: null,
    availabilityStatus: "source_not_ready",
    bookingStatus: "booking_not_ready",
  }),
  fieldEvidence: fieldEvidence([
    {
      field: "identity.canonicalName",
      value: "Forest City Marina Hotel",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceUrl: "https://www.fcmarinahotel.com/",
      observedAt,
      authority: "primary",
      confidence: "high",
      admissionState: "admitted",
      conflictId: null,
    },
    {
      field: "location.address",
      value:
        "Forest City Marina Hotel, Jalan Forest City 1, Pulau Satu, 81550 Gelang Patah, Johor, Malaysia",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceUrl:
        "https://www.fcmarinahotel.com/contact-us-country-garden-forest-city-marina-hotel-johor-bahru",
      observedAt,
      authority: "primary",
      confidence: "high",
      admissionState: "admitted",
      conflictId: null,
    },
    {
      field: "contacts.email",
      value: "rsvmh_slcs@outlook.com",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceUrl:
        "https://www.fcmarinahotel.com/contact-us-country-garden-forest-city-marina-hotel-johor-bahru",
      observedAt,
      authority: "primary",
      confidence: "high",
      admissionState: "internal_evidence_only",
      conflictId: null,
    },
    {
      field: "contacts.email",
      value: "rsvgh_slcs@outlook.com",
      sourceFamily: "trip_com_group",
      sourceUrl:
        "https://www.trip.com/hotels/gelang-patah-hotel-detail-6633787/forest-city-marina-hotel",
      observedAt,
      authority: "secondary",
      confidence: "medium",
      admissionState: "rejected_conflict",
      conflictId: "MARINA_CONTACT_TRIP_GOLF_EMAIL",
    },
    {
      field: "inventory.totalRooms",
      value: 283,
      sourceFamily: "forest_city_marina_hotel_official",
      sourceUrl:
        "https://www.fcmarinahotel.com/about-marina-hotel-in-country-garden-forest-city-johor-bahru",
      observedAt,
      authority: "primary",
      confidence: "high",
      admissionState: "source_attributed_unmerged",
      conflictId: "MARINA_TOTAL_ROOMS_283_286",
    },
    {
      field: "inventory.totalRooms",
      value: 286,
      sourceFamily: "forest_city_destination_official",
      sourceUrl: "https://www.forestcitysfz.com/tourism/forest-city-hotel",
      observedAt,
      authority: "primary",
      confidence: "high",
      admissionState: "source_attributed_unmerged",
      conflictId: "MARINA_TOTAL_ROOMS_283_286",
    },
    {
      field: "craysChannelRules.allowedStayUnits",
      value: ["month"],
      sourceFamily: "crays_owner_channel_decision",
      sourceUrl: "owner-decision://2026-08-28/forest-city-marina-access",
      observedAt,
      authority: "owner_channel_rule",
      confidence: "high",
      admissionState: "owner_channel_only",
      conflictId: null,
    },
  ]),
  conflicts: Object.freeze([
    {
      conflictId: "MARINA_TOTAL_ROOMS_283_286",
      field: "inventory.totalRooms",
      status: "source_conflict",
      resolution:
        "publishedTotal remains null until explicit primary resolution",
    },
    {
      conflictId: "MARINA_CONTACT_TRIP_GOLF_EMAIL",
      field: "contacts.email",
      status: "rejected_conflict",
      resolution:
        "Golf reservation email on the Trip.com Marina record is rejected; official Marina email remains admitted",
    },
    {
      conflictId: "MARINA_OPERATOR_IDENTITY",
      field: "operator",
      status: "source_conflict",
      resolution: "no flattened published operator name",
    },
    {
      conflictId: "AGODA_AI_ASSISTED_MARKETING",
      field: "marketingCopy",
      status: "excluded",
      resolution: "Agoda AI-assisted copy is never primary evidence",
    },
  ]),
  reviews: Object.freeze({
    status: "not_ingested",
    sourceScopedOnly: true,
    averagedAcrossSources: false,
    quotesIngested: false,
    reviewerProfilesIngested: false,
    travelerPhotosIngested: false,
    items: [],
  }),
  admittedMedia: getForestCityHospitalityAdmittedMedia(
    "property-clubs-forest-city-marina",
  ),
  sources: marinaSources,
  mediaEvidence: marinaMedia,
  frontendProjection: FOREST_CITY_HOSPITALITY_FRONTEND_PROJECTION_RULES,
});

const golf: ForestCitySourceAttributedContent = Object.freeze({
  propertyId: "property-clubs-forest-city-golf",
  route: "/en/hospitality/golf-hotel",
  identity: Object.freeze({
    canonicalName: "Forest City Golf Hotel",
    legacyNames: ["Forest City Phoenix Golf Hotel"],
    legacyNamesUsage: "legacy_search_and_source_attribution_only",
    summary:
      "A hotel within the 800-hectare Forest City Golf Resort beside the Legacy Golf Course.",
    sourceIds: ["golf-home", "golf-about", "golf-course"],
  }),
  location: Object.freeze({
    address:
      "Jalan Persiaran Golf 5, Forest City Golf Resort, 81550 Gelang Patah, Johor Bahru, Johor, Malaysia",
    sourceId: "golf-contact",
    geoCandidate: {
      latitude: 1.411186,
      longitude: 103.555806,
      precision: "secondary_candidate_not_official",
      publishableWithQualifier: false,
      sourceId: "golf-travelmyth",
    },
  }),
  contacts: Object.freeze({
    visibility: "internal_evidence_only",
    publicProjection: null,
    reservationEvidence: {
      email: "rsvgh_slcs@outlook.com",
      phones: [
        {
          value: "+601157570089",
          hours: "18:00-09:00",
          footerConflict: "also_described_as_24_hours",
        },
        { value: "+60135990209", hours: "09:00-18:00" },
      ],
      golfReservation: {
        phone: "+6075352359",
        email: "golfbooking@fcgolfresort.com",
        sourceId: "golf-course",
      },
    },
    publicHandoff: "crays_guest_contact_only",
    sourceId: "golf-contact",
  }),
  operator: Object.freeze({
    status: "source_conflict",
    publishedName: null,
    observations: [
      {
        name: "PACIFICVIEW DEVELOPMENT GROUP SDN BHD.",
        registrationNumber: "1044344-D",
        sourceId: "golf-home",
      },
      {
        name: "Country Garden Pacificview Sdn. Bhd.",
        registrationNumber: null,
        sourceId: "forest-city-hotels",
      },
    ],
  }),
  classification: Object.freeze({
    status: "source_conflict",
    publishedValue: null,
    observations: [
      {
        value: "five-star",
        claimKind: "official_hotel_claim",
        sourceId: "golf-home",
      },
      {
        value: "four-star",
        claimKind: "secondary_classification",
        sourceId: "golf-agoda",
      },
      {
        value: "three-and-a-half-star",
        claimKind: "blocked_secondary_report",
        sourceId: "golf-expedia",
      },
    ],
  }),
  inventory: Object.freeze({
    status: "primary_preferred_secondary_conflict",
    publishedTotal: 298,
    observations: [
      { totalRooms: 298, sourceId: "golf-about", authority: "primary" },
      { totalRooms: 298, sourceId: "forest-city-hotels", authority: "primary" },
      {
        totalRooms: 296,
        sourceId: "golf-expedia",
        authority: "secondary_blocked_retrieval",
      },
    ],
    officialCategoryCounts: [
      { label: "Superior Room", count: 168 },
      { label: "Deluxe Room", count: 87 },
      { label: "Superior Suite", count: 22 },
      { label: "Deluxe Suite", count: 15 },
      { label: "Disabled Rooms", count: 2 },
      { label: "Family Suite", count: 1 },
      { label: "Presidential Suite", count: 3 },
    ],
    officialCategoryCountsSourceId: "golf-about",
  }),
  roomDiscovery: Object.freeze({
    canonicalRoomSetStatus: "source_not_ready",
    discoverySetStatus: "official_labels_and_counts_admitted_non_bookable",
    bookable: false,
    officialCategoryLabels: [
      ["Superior Room", 168],
      ["Deluxe Room", 87],
      ["Superior Suite", 22],
      ["Deluxe Suite", 15],
      ["Disabled Rooms", 2],
      ["Family Suite", 1],
      ["Presidential Suite", 3],
    ].map(([label, count], index) => ({
      label: String(label),
      inventoryCount: Number(count),
      discoveryOrder: index + 1,
      canonicalRoomTypeId: null,
      sourceId: "golf-about",
      admission: "official_discovery_non_bookable",
      rates: null,
      availability: null,
    })),
    bedVariantsStatus: "merchandising_variants_not_canonical_skus",
    secondaryAttributedVariants: [
      "Superior King",
      "Superior Twin",
      "Deluxe King",
      "Deluxe Twin",
      "Superior Suite",
      "Deluxe Suite",
      "Family Suite",
      "Panorama Presidential Suite",
    ].map((label) => ({
      label,
      canonicalRoomTypeId: null,
      sizeSquareMetres: null,
      occupancy: null,
      factsStatus: "source_conflict",
      admission: "source_attributed_secondary_unmerged",
      sourceIds: ["golf-booking", "golf-agoda", "golf-expedia"],
      rates: null,
      availability: null,
    })),
  }),
  facilities: Object.freeze([
    {
      id: "large-pool",
      label: "Large outdoor swimming pool",
      areaValue: 893.42,
      areaUnit: null,
      depthMillimetres: 1200,
      operationHours: "07:00-21:00",
      charges: "free_for_hotel_guests",
      sourceId: "golf-health",
    },
    {
      id: "children-pool",
      label: "Children's outdoor swimming pool",
      areaValue: 320.96,
      areaUnit: null,
      depthMillimetres: 430,
      operationHours: "07:00-21:00",
      charges: "free_for_hotel_guests",
      sourceId: "golf-health",
    },
    {
      id: "gym",
      label: "Gymnasium",
      areaValue: 306.97,
      areaUnit: null,
      operationHours: "08:00-22:00",
      charges: "free_for_hotel_guests",
      sourceId: "golf-health",
    },
    {
      id: "spa",
      label: "Spa",
      detailsStatus: "listed_without_reliable_service_details",
      floor: "1F",
      sourceId: "golf-about",
    },
    {
      id: "executive-lounge",
      label: "Executive Lounge",
      floor: "10F",
      sourceId: "golf-about",
    },
    {
      id: "golf-shop",
      label: "Golf Shop",
      floor: "2F",
      sourceId: "golf-course",
    },
    {
      id: "legacy-golf-course",
      label: "Legacy Golf Course",
      sourceId: "golf-course",
    },
    { id: "parking", label: "Car Park", sourceId: "golf-about" },
  ]),
  dining: Object.freeze([
    {
      id: "tee-off-restaurant",
      label: "Tee-Off Restaurant",
      cuisine: "international",
      sourceId: "golf-dining",
      service: {
        breakfast: { hours: "06:30-10:00", format: "set_menu" },
        lunch: { hours: "12:00-14:30", format: "set_menu" },
        dinner: { hours: "18:30-20:00", format: "set_menu" },
      },
      buffetClaimStatus: "secondary_conflict_not_merged",
    },
    { id: "par-cafe", label: "Par Cafe", floor: "2F", sourceId: "golf-about" },
    {
      id: "private-dining",
      label: "Private dining rooms",
      sourceId: "golf-dining",
    },
  ]),
  meetings: Object.freeze([
    ...["I", "II", "III", "IV"].map((suffix) => ({
      id: `meeting-room-${suffix.toLowerCase()}`,
      label: `Meeting Room ${suffix}`,
      dimensionsMetres: [15, 6.75],
      areaSquareMetres: 101.25,
      heightMetres: 2.75,
      capacity: { theatre: 100, classroom: 72, uShape: 36, banquet: 30 },
      sourceId: "golf-conference",
    })),
    {
      id: "meeting-hall",
      label: "Meeting Hall",
      dimensionsMetres: [15, 27],
      areaSquareMetres: 405,
      heightMetres: 2.75,
      capacity: { theatre: 400, classroom: 270, uShape: 75, banquet: 250 },
      sourceId: "golf-conference",
    },
    {
      id: "grand-ballroom",
      label: "Grand Ballroom",
      dimensionsMetres: [26, 31.7],
      areaSquareMetres: 824,
      heightMetres: 3.65,
      capacity: { theatre: 600, classroom: 350, uShape: null, banquet: 400 },
      sourceId: "golf-conference",
    },
  ]),
  policies: Object.freeze({
    directChannel: directPolicy("golf-direct-policy"),
    conflicts: [
      "ota_refund_and_payment_terms_are_rate_specific",
      "minimum_age_cot_and_deposit_are_secondary_only",
      "pet_policy_is_secondary_only",
      "hotel_course_i_to_iii_vs_two_international_courses",
    ],
  }),
  craysChannelRules: Object.freeze({
    authority: "owner_authorized_crays_qlo_channel_not_hotel_public_fact",
    accessMode: "public",
    canonicalAccessMode: "open",
    allowedStayUnits: ["night", "week", "month"],
    rateStatus: "ready",
    availabilityStatus: "source_not_ready",
    bookingStatus: "booking_not_ready",
  }),
  fieldEvidence: fieldEvidence([
    {
      field: "identity.canonicalName",
      value: "Forest City Golf Hotel",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceUrl: "https://fcgolfhotel.com/",
      observedAt,
      authority: "primary",
      confidence: "high",
      admissionState: "admitted",
      conflictId: null,
    },
    {
      field: "location.address",
      value:
        "Jalan Persiaran Golf 5, Forest City Golf Resort, 81550 Gelang Patah, Johor Bahru, Johor, Malaysia",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceUrl:
        "https://fcgolfhotel.com/contact-at-forest-city-phoenix-golf-hotel-johor-bahru",
      observedAt,
      authority: "primary",
      confidence: "high",
      admissionState: "admitted",
      conflictId: null,
    },
    {
      field: "inventory.totalRooms",
      value: 298,
      sourceFamily: "forest_city_golf_hotel_official",
      sourceUrl:
        "https://fcgolfhotel.com/about-forest-city-phoenix-golf-hotel-johor-bahru",
      observedAt,
      authority: "primary",
      confidence: "high",
      admissionState: "admitted",
      conflictId: "GOLF_TOTAL_ROOMS_298_296",
    },
    {
      field: "inventory.totalRooms",
      value: 298,
      sourceFamily: "forest_city_destination_official",
      sourceUrl: "https://www.forestcitysfz.com/tourism/forest-city-hotel",
      observedAt,
      authority: "primary",
      confidence: "high",
      admissionState: "admitted",
      conflictId: "GOLF_TOTAL_ROOMS_298_296",
    },
    {
      field: "inventory.totalRooms",
      value: 296,
      sourceFamily: "expedia_group",
      sourceUrl:
        "https://www.expedia.com/Johor-Bahru-Hotels-Forest-City-Golf-Hotel.h26543248.Hotel-Information",
      observedAt,
      authority: "secondary",
      confidence: "medium",
      admissionState: "source_attributed_unmerged",
      conflictId: "GOLF_TOTAL_ROOMS_298_296",
    },
    {
      field: "classification",
      value: "five-star",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceUrl: "https://fcgolfhotel.com/",
      observedAt,
      authority: "primary",
      confidence: "high",
      admissionState: "source_attributed_unmerged",
      conflictId: "GOLF_CLASSIFICATION_CONFLICT",
    },
    {
      field: "classification",
      value: "four-star",
      sourceFamily: "booking_holdings",
      sourceUrl:
        "https://www.agoda.com/en-au/forest-city-phoenix-international-golf-hotel/hotel/johor-bahru-my.html",
      observedAt,
      authority: "secondary",
      confidence: "medium",
      admissionState: "source_attributed_unmerged",
      conflictId: "GOLF_CLASSIFICATION_CONFLICT",
    },
    {
      field: "craysChannelRules.allowedStayUnits",
      value: ["night", "week", "month"],
      sourceFamily: "crays_owner_channel_decision",
      sourceUrl: "owner-decision://2026-08-28/forest-city-golf-access",
      observedAt,
      authority: "owner_channel_rule",
      confidence: "high",
      admissionState: "owner_channel_only",
      conflictId: null,
    },
  ]),
  conflicts: Object.freeze([
    {
      conflictId: "GOLF_TOTAL_ROOMS_298_296",
      field: "inventory.totalRooms",
      status: "primary_preferred_secondary_conflict",
      resolution:
        "298 is published from two independent primary source families; Expedia Group 296 remains attributed",
    },
    {
      conflictId: "GOLF_CLASSIFICATION_CONFLICT",
      field: "classification",
      status: "source_conflict",
      resolution: "no unqualified star classification is published",
    },
    {
      conflictId: "GOLF_OPERATOR_IDENTITY",
      field: "operator",
      status: "source_conflict",
      resolution: "no flattened published operator name",
    },
    {
      conflictId: "AGODA_AI_ASSISTED_MARKETING",
      field: "marketingCopy",
      status: "excluded",
      resolution: "Agoda AI-assisted copy is never primary evidence",
    },
  ]),
  reviews: Object.freeze({
    status: "not_ingested",
    sourceScopedOnly: true,
    averagedAcrossSources: false,
    quotesIngested: false,
    reviewerProfilesIngested: false,
    travelerPhotosIngested: false,
    items: [],
  }),
  admittedMedia: getForestCityHospitalityAdmittedMedia(
    "property-clubs-forest-city-golf",
  ),
  sources: golfSources,
  mediaEvidence: golfMedia,
  frontendProjection: FOREST_CITY_HOSPITALITY_FRONTEND_PROJECTION_RULES,
});

export const FOREST_CITY_SOURCE_ATTRIBUTED_CONTENT = Object.freeze({
  "property-clubs-forest-city-golf": golf,
  "property-clubs-forest-city-marina": marina,
});

export function readForestCitySourceAttributedContent(
  propertyId: ForestCityContentPropertyId,
) {
  return FOREST_CITY_SOURCE_ATTRIBUTED_CONTENT[propertyId];
}

export function projectForestCityPublicContent(
  content: ForestCitySourceAttributedContent,
): ForestCityPublicContentProjection {
  return Object.freeze({
    propertyId: content.propertyId,
    route: content.route,
    identity: content.identity,
    location: content.location,
    classification: content.classification,
    inventory: content.inventory,
    roomDiscovery: content.roomDiscovery,
    facilities: content.facilities,
    dining: content.dining,
    meetings: content.meetings,
    policies: content.policies,
    reviews: content.reviews,
    admittedMedia: content.admittedMedia,
  });
}
