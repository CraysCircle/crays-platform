"use client";
import {hospitalityDate,hospitalityFromDate} from "./hospitality-locale-format";
import {isLocalizedPublicHotelPath} from "@/lib/member-commerce/hotel-public-locale-route";
import {hospitalityUiMessages} from "./hospitality-ui-messages";
import type {ClubsLocale} from "@/lib/clubs/public-site";
import {TodayLocaleProvider, TodayLocalizedContent} from "./today-localized-content";
import {publicHotelBackToSearch} from "@/lib/member-commerce/hotel-public-stay-history";
import { CraysClubExperience } from "./crays-club-experience";

import { readCoreHotelView, type CoreHotelView, type CoreHotelId } from "@/lib/member-commerce/core-public-hospitality-view";

import {parsePublicHotelBaseSale, publicHotelBaseSaleDisplay} from "@/lib/member-commerce/public-hotel-base-sale-client";
import {parseHospitalityPublicPricingPolicy,hospitalityUnitPriceLabel,type HospitalityPublicPricingPolicy} from "@/lib/member-commerce/hospitality-public-pricing-policy";
import { HospitalityImage as Image } from "./hospitality-image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  CheckCircle2,
  Waves,
  Dumbbell,
  Wine,
  Umbrella,
  Car,
  Flag,
  Sparkles,
  Copy,
  Heart,
  Images,
  Info,
  MapPin,
  Presentation,
  Search,
  ShoppingBag,
  Utensils,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PropertyEligibilityView } from "./clubs-property-booking-flow";
import {
  forestCityProperties,
  loadingClubsMemberAuthSession,
  readClubsMemberAuthSession,
  type BookingIntent,
  type ClubsMemberAuthSession,
  type ForestCityPropertyVariant,
} from "./clubs-property-detail-contract";
import styles from "./clubs-property-detail-page.module.css";
import type {HotelAmbassadorChoice} from "./clubs-hotel-ambassador-picker";
import { ClubsHotelStayPlanner } from "./clubs-hotel-stay-planner";

type ClubsPropertyDetailPageProps = {
  locale?: ClubsLocale;
  authReturnTo: string;
  backToSearch: string;
  intent: BookingIntent;
  variant: ForestCityPropertyVariant;
  initialPublicContent?: unknown;
  initialPublicRate?: unknown;
  initialPublicPricing?: unknown;
  initialAmbassadors?: readonly HotelAmbassadorChoice[];
};

function hotelGuestSummary(guests:number,pets:number,locale:ClubsLocale){
  const messages=hospitalityUiMessages[locale];
  const guest=guests===1?"guest":"guests",pet=pets===1?"pet request":"pet requests";
  return `${guests} ${messages[guest]??guest} · ${pets} ${messages[pet]??pet}`;
}

type StayUnit = "night" | "week" | "month";

type PropertyRateView = {
  publicBaseLabel?: string;
  allowedStayUnits: StayUnit[];
  fromUsdMinor: Partial<Record<StayUnit, number>>;
  membershipRequired: boolean;
  propertyId: string;
  propertyAdmissionRequired: boolean;
  qualifier: string;
  ready: boolean;
  status: string;
};

type QloRateFrom = {
  currency?: unknown;
  displayUsdMinor?: unknown;
  exactUsdMinor?: unknown;
  projectionScope?: unknown;
  roomRateAllocationStatus?: unknown;
  sourceAuthority?: unknown;
  stayUnit?: unknown;
};

type QloRateResponse = {
  allowedStayUnits?: unknown;
  bookingAuthority?: { ready?: unknown };
  displayCopy?: { rate?: unknown };
  from?: unknown;
  membershipRequired?: unknown;
  pricingMode?: unknown;
  propertyId?: unknown;
  propertyAdmissionRequired?: unknown;
  rateAuthority?: { ready?: unknown; status?: unknown };
  schema?: unknown;
  status?: unknown;
  version?: unknown;
};

type ContentListItem = {
  details: string[];
  id: string;
  label: string;
};

type AdmittedMediaItem = {
  alt: string;
  crop: "cover" | "contain";
  width?: number;
  height?: number;
  maxCssWidth?: number;
  purpose?: "gallery" | "hero";
  searchPlacements?: string[];
  detailGalleryOrder: number;
  focalPoint: { x: number; y: number };
  galleryGroup: string;
  galleryOrder: number;
  id: string;
  publicPath: string;
};

type PropertyContentView = {
  contentVersionId?: string;
  contentSha256?: string;
  locationText?: string;
  cardStayPolicy?: string;
  paymentOptionsNote?: string;
  baseOfferDescription?: string;
  paymentOptionsSummary?: string;
  map: CoreHotelView["map"] | null;
  address: string;
  canonicalName: string;
  contentStatus: string;
  dining: ContentListItem[];
  directPolicyCopy: string;
  facilities: ContentListItem[];
  galleryMedia: AdmittedMediaItem[];
  hotelDirectPolicy: string[];
  inventoryTotal: number | null;
  mapStatus: string | null;
  mediaStatus: string;
  meetings: ContentListItem[];
  propertyId: string;
  ready: boolean;
  summary: string;
  unavailable: boolean;
};

type PropertyRoomLabel = {
  details: string[];
  id: string;
  label: string;
  order: number;
};

type PropertyRoomView = {
  contentVersionId?: string;
  contentSha256?: string;
  labels: PropertyRoomLabel[];
  propertyId: string;
  ready: boolean;
  status: string;
};

type QloRoomCategory = {
  admissionState?: unknown;
  availability?: unknown;
  bookable?: unknown;
  canonicalBookingRoomTypeId?: unknown;
  categoryKind?: unknown;
  discoveryOrder?: unknown;
  discoveryText?: unknown;
  displayName?: unknown;
  inventoryCount?: unknown;
  inventoryCountAuthority?: unknown;
  propertyId?: unknown;
  providerRoomTypeId?: unknown;
  rateAssociationStatus?: unknown;
  rates?: unknown;
  roomCategoryId?: unknown;
  sizeSquareMetres?: unknown;
  sourceLabel?: unknown;
};

type QloRoomResponse = {
  authorities?: {
    availability?: { ready?: unknown; status?: unknown };
    booking?: { ready?: unknown; status?: unknown };
    providerRoomSet?: { ready?: unknown; status?: unknown };
    publicRoomCategorySet?: {
      authority?: unknown;
      ready?: unknown;
      status?: unknown;
    };
    rateAssociation?: { ready?: unknown; status?: unknown };
  };
  code?: unknown;
  persistence?: {
    availabilityReady?: unknown;
    bookingReady?: unknown;
    providerRoomMappingReady?: unknown;
    rateAssociationReady?: unknown;
    ready?: unknown;
    scope?: unknown;
    sourceSetMatch?: unknown;
    status?: unknown;
  };
  propertyId?: unknown;
  roomCategorySet?: {
    accessMode?: unknown;
    allowedStayUnits?: unknown;
    categories?: unknown;
    inventoryStatus?: unknown;
    membershipRequired?: unknown;
    propertyAdmissionRequired?: unknown;
    propertyId?: unknown;
    propertyName?: unknown;
    publishedTotal?: unknown;
    setSha256?: unknown;
    status?: unknown;
  } | null;
  schema?: unknown;
  status?: unknown;
  version?: unknown;
};

type MemberCommandType =
  "save_property" | "remove_saved_property" | "add_cart" | "remove_cart";

type MemberPersistenceView = {
  busy: "save" | "cart" | "provision" | null;
  cartState: "planning" | "commercially_bound" | null;
  inCart: boolean;
  loading: boolean;
  message: string | null;
  saved: boolean;
  session: ClubsMemberAuthSession;
  stateReady: boolean;
};

type QloPropertyEligibilityResponse = {
  accountMapped?: unknown;
  accessMode?: unknown;
  allowedStayUnits?: unknown;
  authentication?: { accountMapped?: unknown; status?: unknown };
  authorities?: {
    availability?: unknown;
    booking?: unknown;
    payment?: unknown;
    propertyAccess?: unknown;
    quote?: unknown;
  };
  bookingAuthority?: unknown;
  eligibility?: unknown;
  evaluatedAt?: unknown;
  loginHref?: unknown;
  membership?: {
    confirmed?: unknown;
    decisionAuthority?: unknown;
    status?: unknown;
    validFrom?: unknown;
    validUntil?: unknown;
  };
  membershipRequired?: unknown;
  propertyAdmission?: {
    admitted?: unknown;
    basis?: unknown;
    decisionReceiptCreated?: unknown;
    status?: unknown;
    validFrom?: unknown;
    validUntil?: unknown;
  };
  propertyAdmissionRequired?: unknown;
  propertyId?: unknown;
  schema?: unknown;
  status?: unknown;
  version?: unknown;
};

type QloContentLabel = {
  admission?: unknown;
  areaUnit?: unknown;
  areaValue?: unknown;
  areaSquareMetres?: unknown;
  availability?: unknown;
  canonicalRoomTypeId?: unknown;
  capacity?: unknown;
  charges?: unknown;
  cuisine?: unknown;
  depthMillimetres?: unknown;
  discoveryOrder?: unknown;
  discoveryText?: unknown;
  detailsStatus?: unknown;
  dimensionsMetres?: unknown;
  floor?: unknown;
  heightMetres?: unknown;
  id?: unknown;
  inventoryCount?: unknown;
  label?: unknown;
  operationHours?: unknown;
  rates?: unknown;
  service?: unknown;
  serviceHours?: unknown;
  sizeSquareMetres?: unknown;
};

type QloContentResponse = {
  authorities?: {
    availability?: { ready?: unknown; status?: unknown };
    booking?: { ready?: unknown; status?: unknown };
    canonicalRoomSet?: {
      authority?: unknown;
      ready?: unknown;
      status?: unknown;
    };
    media?: {
      authority?: unknown;
      complete?: unknown;
      ready?: unknown;
      status?: unknown;
    };
    publicContent?: {
      authority?: unknown;
      ready?: unknown;
      status?: unknown;
    };
  };
  code?: unknown;
  content?: {
    admittedMedia?: unknown;
    dining?: unknown;
    facilities?: unknown;
    identity?: { canonicalName?: unknown; summary?: unknown };
    inventory?: { publishedTotal?: unknown; status?: unknown };
    location?: { address?: unknown };
    meetings?: unknown;
    policies?: { directChannel?: Record<string, unknown> };
    propertyId?: unknown;
    reviews?: { status?: unknown };
    roomDiscovery?: {
      bookable?: unknown;
      canonicalRoomSetStatus?: unknown;
      discoverySetStatus?: unknown;
      officialCategoryLabels?: unknown;
    };
    route?: unknown;
  };
  displayCopy?: {
    directPolicy?: unknown;
    map?: unknown;
    media?: unknown;
    roomSet?: unknown;
    status?: unknown;
  };
  propertyId?: unknown;
  schema?: unknown;
  status?: unknown;
  version?: unknown;
};

const mediaLicenseReceiptIds = [
  "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
  "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
] as const;

const admittedMediaContract = {
  golf: {
    count: 43,
    primaryPath:
      "/api/crays/clubs/forest-city/properties/property-clubs-forest-city-golf/media/golf-gallery-001-62d864b37e84",
    primarySha256:
      "62d864b37e846ab0d5848f19b0d6e6aac619ae4edc1deeff30f9cafc795a8050",
  },
  marina: {
    count: 154,
    primaryPath:
      "/api/crays/clubs/forest-city/properties/property-clubs-forest-city-marina/media/marina-gallery-001-d1eb2e058f0c",
    primarySha256:
      "d1eb2e058f0c76bab0ae2e1ec6ea487b0216a098924d9e2e857e0406767c1d8a",
  },
} as const;

const fallbackGalleryMedia = {
  golf: [
    {
      alt: "Forest City Golf Hotel illuminated beside the pool at blue hour",
      crop: "cover",
      detailGalleryOrder: 1,
      focalPoint: { x: 0.5, y: 0.5 },
      galleryGroup: "Hotel overview",
      galleryOrder: 1,
      id: "golf-preview-gallery-1",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/001-62d864b37e846ab0.jpg",
    },
    {
      alt: "Aerial view of Forest City Golf Hotel, gardens and pool",
      crop: "cover",
      detailGalleryOrder: 2,
      focalPoint: { x: 0.56, y: 0.5 },
      galleryGroup: "Hotel overview",
      galleryOrder: 2,
      id: "golf-preview-gallery-2",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/002-083a5d47c48edf6e.jpg",
    },
    {
      alt: "Pool terrace overlooking the Forest City golf course",
      crop: "cover",
      detailGalleryOrder: 3,
      focalPoint: { x: 0.5, y: 0.48 },
      galleryGroup: "Hotel overview",
      galleryOrder: 3,
      id: "golf-preview-gallery-3",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/003-ef05a7097ce8d58a.jpg",
    },
    {
      alt: "Forest City Golf Hotel viewed across the landscaped course",
      crop: "cover",
      detailGalleryOrder: 4,
      focalPoint: { x: 0.5, y: 0.45 },
      galleryGroup: "Hotel overview",
      galleryOrder: 4,
      id: "golf-preview-gallery-4",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/004-f9f3773022d48f71.jpg",
    },
    {
      alt: "Outdoor event setting beside the golf course water feature",
      crop: "cover",
      detailGalleryOrder: 5,
      focalPoint: { x: 0.46, y: 0.5 },
      galleryGroup: "Hotel overview",
      galleryOrder: 5,
      id: "golf-preview-gallery-5",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/005-af79d00a220afee7.jpg",
    },
  ],
  marina: [
    {
      alt: "Bright central lobby inside Forest City Marina Hotel",
      crop: "cover",
      detailGalleryOrder: 1,
      focalPoint: { x: 0.5, y: 0.5 },
      galleryGroup: "Hotel overview",
      galleryOrder: 1,
      id: "marina-preview-gallery-1",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/001-d1eb2e058f0c76ba.jpg",
    },
    {
      alt: "Forest City Marina Hotel entrance illuminated at night",
      crop: "cover",
      detailGalleryOrder: 2,
      focalPoint: { x: 0.5, y: 0.5 },
      galleryGroup: "Hotel overview",
      galleryOrder: 2,
      id: "marina-preview-gallery-2",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/002-1deca31c18f7f331.jpg",
    },
    {
      alt: "Marina Hotel lobby lounge with illuminated tree installation",
      crop: "cover",
      detailGalleryOrder: 3,
      focalPoint: { x: 0.5, y: 0.5 },
      galleryGroup: "Hotel overview",
      galleryOrder: 3,
      id: "marina-preview-gallery-3",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/003-d7a28cc9496ce522.jpg",
    },
    {
      alt: "Aerial view of the landscaped Forest City waterfront park",
      crop: "cover",
      detailGalleryOrder: 4,
      focalPoint: { x: 0.5, y: 0.5 },
      galleryGroup: "Hotel overview",
      galleryOrder: 4,
      id: "marina-preview-gallery-4",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/004-07ed52618a3e0455.jpg",
    },
    {
      alt: "Marina Hotel garden pool beside the planted facade",
      crop: "cover",
      detailGalleryOrder: 5,
      focalPoint: { x: 0.5, y: 0.5 },
      galleryGroup: "Hotel overview",
      galleryOrder: 5,
      id: "marina-preview-gallery-5",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/005-89287a873894fb48.jpg",
    },
  ],
} as const satisfies Record<
  ForestCityPropertyVariant,
  readonly AdmittedMediaItem[]
>;

const roomDiscoveryContract = {
  golf: [
    {
      categoryKind: "room",
      id: "room-category-fc-golf-superior-room",
      inventoryCount: 168,
      label: "Superior Room",
      order: 1,
    },
    {
      categoryKind: "room",
      id: "room-category-fc-golf-deluxe-room",
      inventoryCount: 87,
      label: "Deluxe Room",
      order: 2,
    },
    {
      categoryKind: "suite",
      id: "room-category-fc-golf-superior-suite",
      inventoryCount: 22,
      label: "Superior Suite",
      order: 3,
    },
    {
      categoryKind: "suite",
      id: "room-category-fc-golf-deluxe-suite",
      inventoryCount: 15,
      label: "Deluxe Suite",
      order: 4,
    },
    {
      categoryKind: "accessible_room",
      id: "room-category-fc-golf-accessible-room",
      inventoryCount: 2,
      label: "Disabled Rooms",
      order: 5,
    },
    {
      categoryKind: "suite",
      id: "room-category-fc-golf-family-suite",
      inventoryCount: 1,
      label: "Family Suite",
      order: 6,
    },
    {
      categoryKind: "suite",
      id: "room-category-fc-golf-presidential-suite",
      inventoryCount: 3,
      label: "Presidential Suite",
      order: 7,
    },
  ],
  marina: [
    {
      categoryKind: "room",
      id: "room-category-fc-marina-superior-twin",
      label: "Superior Twin",
      order: 1,
      sizeSquareMetres: 44,
    },
    {
      categoryKind: "room",
      id: "room-category-fc-marina-deluxe-king",
      label: "Deluxe King",
      order: 2,
      sizeSquareMetres: 44,
    },
    {
      categoryKind: "room",
      id: "room-category-fc-marina-deluxe-twin",
      label: "Deluxe Twin",
      order: 3,
      sizeSquareMetres: 44,
    },
    {
      categoryKind: "suite",
      id: "room-category-fc-marina-superior-suite",
      label: "Superior Suite",
      order: 4,
      sizeSquareMetres: 136,
    },
    {
      categoryKind: "suite",
      id: "room-category-fc-marina-deluxe-suite",
      label: "Deluxe Suite",
      order: 5,
      sizeSquareMetres: 136,
    },
    {
      categoryKind: "room",
      id: "room-category-fc-marina-superior-king",
      label: "Superior King",
      order: 6,
      sizeSquareMetres: 44,
    },
    {
      categoryKind: "suite",
      discoveryText:
        "Featuring Seaview (subject to availability) and has a balcony and terrace.",
      id: "room-category-fc-marina-presidential-suite",
      label: "Presidential Suite",
      order: 7,
      sizeSquareMetres: null,
    },
  ],
} as const;

const usdFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  style: "currency",
});

function initialRateView(variant: ForestCityPropertyVariant): PropertyRateView {
  return {
    allowedStayUnits: variant === "marina" ? ["month"] : [],
    fromUsdMinor: {},
    membershipRequired: variant === "marina",
    propertyId: forestCityProperties[variant].propertyId,
    propertyAdmissionRequired: variant === "marina",
    qualifier: "Rate currently unavailable",
    ready: false,
    status: "rate_unavailable",
  };
}

function initialContentView(propertyId: string): PropertyContentView {
  return {
    address: "",
    canonicalName: "",
    contentStatus: "Loading hotel details...",
    map: null,
    dining: [],
    directPolicyCopy: "",
    facilities: [],
    galleryMedia: [],
    hotelDirectPolicy: [],
    inventoryTotal: null,
    mapStatus: null,
    mediaStatus:
      "Approved hotel preview photography is shown. Live property content is checked separately.",
    meetings: [],
    propertyId,
    ready: false,
    summary: "",
    unavailable: false,
  };
}

function initialRoomView(propertyId: string): PropertyRoomView {
  return {
    labels: [],
    propertyId,
    ready: false,
    status: "Loading room details...",
  };
}

function initialMemberPersistence(): MemberPersistenceView {
  return {
    busy: null,
    cartState: null,
    inCart: false,
    loading: true,
    message: null,
    saved: false,
    session: { ...loadingClubsMemberAuthSession },
    stateReady: false,
  };
}

const eligibilitySeparationCopy =
  "Availability and booking confirmation are checked separately.";

function initialPropertyEligibility(
  propertyId: string,
): PropertyEligibilityView {
  return {
    accessCopy: "Checking stay access…",
    allowedStayUnits: [],
    loading: true,
    loginHref: null,
    propertyAccess: false,
    propertyId,
    retryable: false,
    separationCopy: eligibilitySeparationCopy,
    status: "loading",
  };
}

function unavailablePropertyEligibility(
  propertyId: string,
  status: "not_found" | "temporarily_unavailable" = "temporarily_unavailable",
): PropertyEligibilityView {
  return {
    accessCopy: "Stay access is temporarily unavailable.",
    allowedStayUnits: [],
    loading: false,
    loginHref: null,
    propertyAccess: false,
    propertyId,
    retryable: status !== "not_found",
    separationCopy: eligibilitySeparationCopy,
    status,
  };
}

function safeEligibilityLoginHref(value: unknown, authReturnTo: string) {
  const legacyExpected =
    "/auth/login?returnTo=%2Fen%2Fhospitality%2Fmarina-hotel";
  if (typeof value !== "string") return null;
  try {
    const parsedReturnTo = new URL(
      authReturnTo,
      "https://clubs-return.invalid",
    );
    if (
      !authReturnTo.startsWith("/") ||
      authReturnTo.startsWith("//") ||
      parsedReturnTo.origin !== "https://clubs-return.invalid" ||
      !isLocalizedPublicHotelPath(parsedReturnTo.pathname, "property-clubs-forest-city-marina")
    )
      return null;
    const expected = `/auth/login?${new URLSearchParams({
      returnTo: authReturnTo,
    }).toString()}`;
    return value === expected || value === legacyExpected ? expected : null;
  } catch {
    return null;
  }
}

function isIsoDateTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    Number.isFinite(new Date(value).getTime())
  );
}

function isNullableIsoDateTime(value: unknown) {
  return value === null || isIsoDateTime(value);
}

function isActiveWindow(
  validFrom: unknown,
  validUntil: unknown,
  evaluatedAt: unknown,
) {
  if (!isIsoDateTime(validFrom) || !isIsoDateTime(evaluatedAt)) return false;
  if (!isNullableIsoDateTime(validUntil)) return false;
  const evaluatedAtMs = new Date(evaluatedAt).getTime();
  return (
    new Date(validFrom).getTime() <= evaluatedAtMs &&
    (validUntil === null || new Date(validUntil).getTime() > evaluatedAtMs)
  );
}

function hasEligibilityContract(
  payload: QloPropertyEligibilityResponse | null,
): payload is QloPropertyEligibilityResponse {
  return (
    payload?.schema === "crays.clubs.member-property-eligibility-ui.v1" &&
    payload.version === "1.0.0"
  );
}

async function readPropertyEligibility(
  propertyId: string,
  variant: ForestCityPropertyVariant,
  authReturnTo: string,
  signal?: AbortSignal,
): Promise<PropertyEligibilityView> {
  try {
    const response = await fetch(
      `/api/crays/clubs/member/properties/${propertyId}/eligibility`,
      {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal,
      },
    );
    const payload = (await response
      .json()
      .catch(() => null)) as QloPropertyEligibilityResponse | null;

    if (
      response.status === 404 &&
      hasEligibilityContract(payload) &&
      payload?.status === "not_found"
    )
      return unavailablePropertyEligibility(propertyId, "not_found");

    if (variant === "marina" && response.status === 401) {
      const loginHref = safeEligibilityLoginHref(
        payload?.loginHref,
        authReturnTo,
      );
      if (
        payload?.status === "signed_out" &&
        payload.accountMapped === false &&
        payload.bookingAuthority === false &&
        loginHref
      )
        return {
          accessCopy: "Sign in to continue.",
          allowedStayUnits: ["month"],
          loading: false,
          loginHref,
          propertyAccess: false,
          propertyId,
          retryable: false,
          separationCopy: eligibilitySeparationCopy,
          status: "signed_out",
        };
      return unavailablePropertyEligibility(propertyId);
    }

    if (
      variant === "marina" &&
      response.status === 409 &&
      payload?.status === "identity_binding_required" &&
      payload.accountMapped === false &&
      payload.bookingAuthority === false
    )
      return {
        accessCopy: "Complete your CRAYS guest account to continue.",
        allowedStayUnits: ["month"],
        loading: false,
        loginHref: null,
        propertyAccess: false,
        propertyId,
        retryable: false,
        separationCopy: eligibilitySeparationCopy,
        status: "identity_binding_required",
      };

    const allowedStayUnits = Array.isArray(payload?.allowedStayUnits)
      ? payload.allowedStayUnits.filter(isStayUnit)
      : [];
    const expectedUnits: StayUnit[] =
      variant === "marina" ? ["month"] : ["night", "week", "month"];
    const expectedAccessMode =
      variant === "marina" ? "property_admission_required" : "open";
    const eligibility = payload?.eligibility;
    const propertyAccessExpected =
      eligibility === "public_access" ||
      eligibility === "property_access_admitted";
    const validCommercialBoundaries =
      payload?.authorities?.propertyAccess === propertyAccessExpected &&
      payload.authorities.availability === false &&
      payload.authorities.quote === false &&
      payload.authorities.booking === false &&
      payload.authorities.payment === false;
    if (!hasEligibilityContract(payload))
      return unavailablePropertyEligibility(propertyId);
    const validCommonPayload =
      payload.propertyId === propertyId &&
      payload.accessMode === expectedAccessMode &&
      payload.membershipRequired === (variant === "marina") &&
      payload.propertyAdmissionRequired === (variant === "marina") &&
      sameUnits(allowedStayUnits, expectedUnits) &&
      isIsoDateTime(payload.evaluatedAt) &&
      validCommercialBoundaries;
    if (!validCommonPayload) return unavailablePropertyEligibility(propertyId);

    const authenticationReady =
      payload.authentication?.status === "ready" &&
      payload.authentication.accountMapped === true;
    const membershipBaseValid =
      payload.membership?.decisionAuthority === "CRAYS_TEAM" &&
      isNullableIsoDateTime(payload.membership.validFrom) &&
      isNullableIsoDateTime(payload.membership.validUntil);
    const membershipActive =
      authenticationReady &&
      membershipBaseValid &&
      payload.membership?.status === "confirmed" &&
      payload.membership.confirmed === true &&
      isActiveWindow(
        payload.membership.validFrom,
        payload.membership.validUntil,
        payload.evaluatedAt,
      );
    const admissionBaseValid =
      payload.propertyAdmission?.decisionReceiptCreated === false &&
      isNullableIsoDateTime(payload.propertyAdmission.validFrom) &&
      isNullableIsoDateTime(payload.propertyAdmission.validUntil);

    if (response.status === 503) {
      if (
        variant === "marina" &&
        payload.status === "property_scope_not_ready" &&
        eligibility === "property_scope_not_ready" &&
        membershipActive &&
        admissionBaseValid &&
        payload.propertyAdmission?.status === "not_admitted" &&
        payload.propertyAdmission.admitted === false &&
        payload.propertyAdmission.basis === "NONE" &&
        payload.propertyAdmission.validFrom === null &&
        payload.propertyAdmission.validUntil === null
      )
        return {
          accessCopy: "Marina access is temporarily unavailable.",
          allowedStayUnits,
          loading: false,
          loginHref: null,
          propertyAccess: false,
          propertyId,
          retryable: true,
          separationCopy: eligibilitySeparationCopy,
          status: "property_scope_not_ready",
        };
      return unavailablePropertyEligibility(propertyId);
    }

    if (response.status !== 200 || payload.status !== "ready")
      return unavailablePropertyEligibility(propertyId);

    if (
      variant === "golf" &&
      eligibility === "public_access" &&
      payload.authentication?.status === "signed_out" &&
      payload.authentication.accountMapped === false &&
      membershipBaseValid &&
      payload.membership?.status === "not_confirmed" &&
      payload.membership.confirmed === false &&
      payload.membership.validFrom === null &&
      payload.membership.validUntil === null &&
      admissionBaseValid &&
      payload.propertyAdmission?.status === "not_required" &&
      payload.propertyAdmission.admitted === true &&
      payload.propertyAdmission.basis === "OPEN_ACCESS" &&
      payload.propertyAdmission.validFrom === null &&
      payload.propertyAdmission.validUntil === null
    )
      return {
        accessCopy: "Public stays",
        allowedStayUnits,
        loading: false,
        loginHref: null,
        propertyAccess: true,
        propertyId,
        retryable: false,
        separationCopy: eligibilitySeparationCopy,
        status: "public_access",
      };

    if (variant === "marina") {
      const membershipNotConfirmed =
        authenticationReady &&
        membershipBaseValid &&
        payload.membership?.confirmed === false &&
        ["not_confirmed", "suspended", "revoked", "expired"].includes(
          String(payload.membership.status),
        );
      if (
        eligibility === "membership_required" &&
        membershipNotConfirmed &&
        admissionBaseValid &&
        payload.propertyAdmission?.status === "not_admitted" &&
        payload.propertyAdmission.admitted === false &&
        payload.propertyAdmission.basis === "NONE" &&
        payload.propertyAdmission.validFrom === null &&
        payload.propertyAdmission.validUntil === null
      )
        return {
          accessCopy: "A confirmed CRAYS membership is required.",
          allowedStayUnits,
          loading: false,
          loginHref: null,
          propertyAccess: false,
          propertyId,
          retryable: false,
          separationCopy: eligibilitySeparationCopy,
          status: "membership_required",
        };
      if (
        eligibility === "property_admission_required" &&
        membershipActive &&
        admissionBaseValid &&
        payload.propertyAdmission?.status === "not_admitted" &&
        payload.propertyAdmission.admitted === false &&
        payload.propertyAdmission.basis === "GRANT_NOT_FOUND_OR_AMBIGUOUS" &&
        payload.propertyAdmission.validFrom === null &&
        payload.propertyAdmission.validUntil === null
      )
        return {
          accessCopy: "This stay requires active Marina access.",
          allowedStayUnits,
          loading: false,
          loginHref: null,
          propertyAccess: false,
          propertyId,
          retryable: false,
          separationCopy: eligibilitySeparationCopy,
          status: "property_admission_required",
        };
      if (
        eligibility === "property_access_admitted" &&
        membershipActive &&
        admissionBaseValid &&
        payload.propertyAdmission?.status === "active" &&
        payload.propertyAdmission.admitted === true &&
        payload.propertyAdmission.basis === "ACTIVE_GRANT" &&
        isActiveWindow(
          payload.propertyAdmission.validFrom,
          payload.propertyAdmission.validUntil,
          payload.evaluatedAt,
        )
      )
        return {
          accessCopy: "Marina access confirmed.",
          allowedStayUnits,
          loading: false,
          loginHref: null,
          propertyAccess: true,
          propertyId,
          retryable: false,
          separationCopy: eligibilitySeparationCopy,
          status: "property_access_admitted",
        };
    }

    return unavailablePropertyEligibility(propertyId);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      return initialPropertyEligibility(propertyId);
    return unavailablePropertyEligibility(propertyId);
  }
}

async function readMemberPersistence(
  propertyId: string,
  returnTo: string,
  signal?: AbortSignal,
): Promise<MemberPersistenceView> {
  const session = await readClubsMemberAuthSession(returnTo, signal);
  if (session.status !== "ready") {
    return {
      ...initialMemberPersistence(),
      loading: false,
      session,
    };
  }

  try {
    const response = await fetch("/api/crays/clubs/member/state", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal,
    });
    const payload = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (
      !response.ok ||
      payload?.status !== "ready" ||
      !Array.isArray(payload.savedPropertyIds) ||
      !Array.isArray(payload.cartItems)
    ) {
      const refreshedSession = await readClubsMemberAuthSession(
        returnTo,
        signal,
      );
      return {
        ...initialMemberPersistence(),
        loading: false,
        message:
          refreshedSession.status === "ready"
            ? "Saved stays and cart are temporarily unavailable."
            : null,
        session: refreshedSession,
      };
    }

    const saved = payload.savedPropertyIds.some(
      (value) => value === propertyId,
    );
    const currentCartItem = payload.cartItems.find(
      (value) =>
        value &&
        typeof value === "object" &&
        "propertyId" in value &&
        value.propertyId === propertyId,
    );
    const inCart = Boolean(currentCartItem);
    const cartState =
      currentCartItem &&
      typeof currentCartItem === "object" &&
      "cartState" in currentCartItem &&
      (currentCartItem.cartState === "planning" ||
        currentCartItem.cartState === "commercially_bound")
        ? currentCartItem.cartState
        : null;
    return {
      busy: null,
      cartState,
      inCart,
      loading: false,
      message: null,
      saved,
      session,
      stateReady: true,
    };
  } catch {
    return {
      ...initialMemberPersistence(),
      loading: false,
      message: "Saved stays and cart are temporarily unavailable.",
      session,
    };
  }
}

function isStayUnit(value: unknown): value is StayUnit {
  return value === "night" || value === "week" || value === "month";
}

function sameUnits(actual: StayUnit[], expected: StayUnit[]) {
  return actual.join(",") === expected.join(",");
}

function rateLabel(
  rate: PropertyRateView,
  stayUnit: StayUnit,
  showPublicAmount: boolean,
) {
  if(rate.ready && rate.publicBaseLabel)return rate.publicBaseLabel;
  const amount = rate.fromUsdMinor[stayUnit];
  if (!rate.ready || typeof amount !== "number")
    return "Rate currently unavailable";
  return showPublicAmount
    ? `From ${usdFormatter.format(amount / 100)} / ${stayUnit}`
    : "Rate available after stay review";
}

function contentItems(value: unknown): ContentListItem[] {
  if (!Array.isArray(value)) return [];
  return (value as QloContentLabel[]).flatMap((item) => {
    if (!item || typeof item.label !== "string") return [];
    const details: string[] = [];
    if (typeof item.operationHours === "string") {
      details.push(`Open ${item.operationHours}`);
    }
    if (typeof item.floor === "string") details.push(item.floor);
    if (typeof item.cuisine === "string") {
      details.push(
        item.cuisine.charAt(0).toUpperCase() + item.cuisine.slice(1),
      );
    }
    if (typeof item.areaSquareMetres === "number") {
      details.push(`${item.areaSquareMetres} m²`);
    } else if (
      typeof item.areaValue === "number" &&
      typeof item.areaUnit === "string"
    ) {
      details.push(`${item.areaValue} ${item.areaUnit}`);
    }
    if (typeof item.depthMillimetres === "number") {
      details.push(`Depth ${item.depthMillimetres.toLocaleString("en-US")} mm`);
    }
    if (Array.isArray(item.dimensionsMetres)) {
      const dimensions = item.dimensionsMetres.filter(
        (entry): entry is number => typeof entry === "number",
      );
      if (dimensions.length === item.dimensionsMetres.length)
        details.push(`${dimensions.join(" × ")} m`);
    }
    if (typeof item.heightMetres === "number") {
      details.push(`Ceiling ${item.heightMetres} m`);
    }
    if (typeof item.charges === "string") {
      details.push(item.charges.replaceAll("_", " "));
    }
    if (item.detailsStatus === "listed_without_reliable_service_details") {
      details.push("Service details are still being verified");
    }

    const hours =
      item.serviceHours && typeof item.serviceHours === "object"
        ? item.serviceHours
        : item.service && typeof item.service === "object"
          ? item.service
          : null;
    if (hours) {
      details.push(
        ...Object.entries(hours).flatMap(([key, entry]) => {
          const label = key.charAt(0).toUpperCase() + key.slice(1);
          if (typeof entry === "string") return [`${label} ${entry}`];
          if (
            entry &&
            typeof entry === "object" &&
            "hours" in entry &&
            typeof entry.hours === "string"
          )
            return [`${label} ${entry.hours}`];
          return [];
        }),
      );
    }
    if (item.capacity && typeof item.capacity === "object") {
      details.push(
        ...Object.entries(item.capacity).flatMap(([key, entry]) => {
          if (typeof entry !== "number") return [];
          const label =
            key === "uShape"
              ? "U-shape"
              : key.charAt(0).toUpperCase() + key.slice(1);
          return [`${label} ${entry}`];
        }),
      );
    }
    return [
      {
        details,
        id: typeof item.id === "string" ? item.id : item.label,
        label: item.label,
      },
    ];
  });
}

function admittedMediaItems(
  value: unknown,
  propertyId: string,
  variant: ForestCityPropertyVariant,
): AdmittedMediaItem[] | null {
  if (!Array.isArray(value)) return null;
  const expected = admittedMediaContract[variant];
  if (value.length !== expected.count) return null;

  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();
  const seenHashes = new Set<string>();
  const allowedPlacements = new Set([
    "collection",
    "destination",
    "detail_gallery_primary",
    "editorial",
    "forest_city_overview",
    "gallery_supporting",
    "promo",
    "search_card_primary",
    "sfz_context",
  ]);
  const allowedSearchPlacements = new Set([
    "collection",
    "collection_marina_hospitality",
    "collection_member_monthly_stays",
    "collection_public_hotel_stays",
    "destination",
    "destination_forest_city_waterfront",
    "destination_golf_hotel",
    "destination_legacy_golf_course",
    "editorial",
    "editorial_clear_stay_information",
    "editorial_collections_for_stay_types",
    "editorial_search_map_detail_pages",
    "forest_city_overview",
    "promo",
    "promo_book_and_relax",
    "promo_forest_city_properties",
    "search_card_primary",
    "sfz_context",
  ]);

  const parsed = value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const focalPoint = item.focalPoint as Record<string, unknown> | undefined;
    const order = index + 1;
    const validId =
      typeof item.id === "string" &&
      item.id.startsWith(
        `${variant}-gallery-${String(order).padStart(3, "0")}-`,
      );
    const validPath =
      typeof item.publicPath === "string" &&
      new RegExp(
        `^/api/crays/clubs/forest-city/properties/${propertyId}/media/${variant}-gallery-\\d{3}-[a-f0-9]{12}$`,
      ).test(item.publicPath);
    const validHash =
      typeof item.originalSha256 === "string" &&
      /^[a-f0-9]{64}$/.test(item.originalSha256) &&
      item.servedAssetSha256 === item.originalSha256;
    const validFocalPoint =
      focalPoint !== undefined &&
      typeof focalPoint.x === "number" &&
      typeof focalPoint.y === "number" &&
      focalPoint.x >= 0 &&
      focalPoint.x <= 1 &&
      focalPoint.y >= 0 &&
      focalPoint.y <= 1;
    const validSearchPlacement =
      item.searchPlacement === null ||
      (typeof item.searchPlacement === "string" &&
        allowedSearchPlacements.has(item.searchPlacement));
    if (
      item.propertyId !== propertyId ||
      !validId ||
      !validPath ||
      !validHash ||
      !mediaLicenseReceiptIds.includes(
        item.licenseReceiptId as (typeof mediaLicenseReceiptIds)[number],
      ) ||
      typeof item.placement !== "string" ||
      !allowedPlacements.has(item.placement) ||
      !validSearchPlacement ||
      item.placement !==
        (index === 0 ? "detail_gallery_primary" : "gallery_supporting") ||
      item.searchPlacement !== (index === 0 ? "search_card_primary" : null) ||
      item.galleryOrder !== order ||
      item.detailGalleryOrder !== order ||
      typeof item.galleryGroup !== "string" ||
      item.galleryGroup.trim().length === 0 ||
      item.mediaType !== "image/jpeg" ||
      item.crop !== "cover" ||
      !validFocalPoint ||
      item.rightsStatus !== "admitted" ||
      item.renderable !== true ||
      item.hotlinkAllowed !== false ||
      item.rehostingAllowed !== true ||
      item.admissionState !== "qlo_provider_receipt_bound" ||
      item.canonicalRoomTypeId !== null ||
      item.bookable !== false ||
      typeof item.alt !== "string" ||
      item.alt.trim().length === 0 ||
      seenIds.has(item.id as string) ||
      seenPaths.has(item.publicPath as string) ||
      seenHashes.has(item.originalSha256 as string)
    )
      return [];

    if (
      index === 0 &&
      (item.publicPath !== expected.primaryPath ||
        item.originalSha256 !== expected.primarySha256 ||
        item.placement !== "detail_gallery_primary" ||
        item.searchPlacement !== "search_card_primary")
    )
      return [];

    seenIds.add(item.id as string);
    seenPaths.add(item.publicPath as string);
    seenHashes.add(item.originalSha256 as string);

    return [
      {
        alt: item.alt,
        crop: "cover" as const,
        detailGalleryOrder: order,
        focalPoint: { x: focalPoint.x as number, y: focalPoint.y as number },
        galleryGroup: item.galleryGroup,
        galleryOrder: order,
        id: item.id as string,
        publicPath: item.publicPath as string,
      },
    ];
  });

  return parsed.length === expected.count ? parsed : null;
}

function formatDate(value:string,locale:ClubsLocale){return hospitalityDate(value,locale,hospitalityUiMessages[locale]["Any dates"]||"Any dates");}

function FacilityIcon({label}:{label:string}) {
 const name=label.toLowerCase();
 const Icon=name.includes("pool")?Waves:name.includes("gym")?Dumbbell:name.includes("bar")||name.includes("lounge")?Wine:name.includes("beach")?Umbrella:name.includes("park")?Car:name.includes("golf")?Flag:name.includes("spa")?Sparkles:CheckCircle2;
 return <Icon aria-hidden="true" size={20} strokeWidth={1.75}/>;
}

function mapPublicHotelViews(value: unknown, propertyId: CoreHotelId) {
        const view=readCoreHotelView(value,propertyId);
        const section=(items:CoreHotelView["facilities"]):ContentListItem[]=>items.map(item=>{
          const capacityLabels: Record<string, string> = {theatre: "Theatre seating", classroom: "Classroom seating", uShape: "U-shaped seating", banquet: "Banquet seating"};
          const details=Array.from(new Set(item.details.map(value=>value.trim()).filter(Boolean)));
          const description=item.description.trim();
          const remainder=details.reduce((text,detail)=>text.replace(detail,""),description).replace(/[\s.,;:]+/g,"");
          const uniqueDetails = Array.from(new Set((remainder ? [description,...details] : details.length ? details : [description]).filter(Boolean)));
          return {id:item.id,label:item.label,details:uniqueDetails.map(value=>value.replace(/^(theatre|classroom|uShape|banquet):/, (_match, key: string) => `${capacityLabels[key]}:`))};
        });
        const orderedMedia=view.hero?[view.hero,...view.media.filter(item=>item.assetId!==view.hero?.assetId)]:view.media;
        const content: PropertyContentView = {contentVersionId:view.contentVersionId,contentSha256:view.contentSha256,locationText:view.copy.locationText,baseOfferDescription:view.copy.baseOfferDescription,paymentOptionsSummary:view.copy.paymentOptionsSummary,paymentOptionsNote:view.copy.paymentOptionsNote,cardStayPolicy:view.copy.cardStayPolicy,address:view.address,canonicalName:view.canonicalName,contentStatus:"Hotel details",dining:section(view.dining),directPolicyCopy:"",facilities:section(view.facilities),galleryMedia:orderedMedia.map((item,index)=>({id:item.assetId,publicPath:item.url,alt:item.alt,galleryGroup:item.galleryGroup,galleryOrder:item.galleryOrder,detailGalleryOrder:index,crop:item.purpose==="hero"?"cover":"contain",width:item.width,height:item.height,maxCssWidth:item.maxCssWidth,purpose:item.purpose,searchPlacements:item.searchPlacements,focalPoint:{x:0.5,y:0.5}})),hotelDirectPolicy:[],inventoryTotal:null,map:view.map,mapStatus:null,mediaStatus:"Hotel photography",meetings:section(view.meetings),propertyId:view.propertyId,ready:true,summary:view.copy.overview,unavailable:false};
        // Official category copy is discovery only. Actual sellable room allocation stays in the quote API.
        const rooms: PropertyRoomView = {contentVersionId:view.contentVersionId,contentSha256:view.contentSha256,propertyId:view.propertyId,ready:true,status:view.copy.roomIntroduction,labels:view.rooms.map((room,index)=>({id:room.publicRoomTypeId,label:room.name,details:[room.description],order:index}))};
  return {content, rooms};
}

export function ClubsPropertyDetailPage({
  locale="en",
  authReturnTo,
  backToSearch: initialBackToSearch,
  intent: initialIntent,
  variant,
  initialPublicContent,
  initialPublicRate,
  initialPublicPricing,
  initialAmbassadors=[],
}: ClubsPropertyDetailPageProps) {
  const property = forestCityProperties[variant];
  const [intent,setIntent]=useState<BookingIntent>(()=>({...initialIntent,guests:initialIntent.guestsExplicit?initialIntent.guests:1}));
  const adoptPlannerIntent=useCallback((patch:Partial<BookingIntent>)=>setIntent(previous=>{
    const changed=Object.entries(patch).some(([key,value])=>previous[key as keyof BookingIntent]!==value);
    return changed?{...previous,...patch}:previous;
  }),[]);
  const backToSearch=useMemo(()=>publicHotelBackToSearch(initialBackToSearch,intent,variant),[initialBackToSearch,intent,variant]);
  const initialViews = useMemo(() => {
    if (!initialPublicContent) return null;
    try { return mapPublicHotelViews(initialPublicContent, property.propertyId as CoreHotelId); }
    catch { return null; }
  }, [initialPublicContent, property.propertyId]);
  const [plannerEditRequest, setPlannerEditRequest] = useState(0);
  const reviewStayDetails = () => setPlannerEditRequest(value => value + 1);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryReady,setGalleryReady]=useState(false);
  useEffect(()=>{setGalleryReady(true);},[]);
  const galleryDialogRef = useRef<HTMLDivElement>(null);
  const galleryCloseButtonRef = useRef<HTMLButtonElement>(null);
  const galleryReturnFocusRef = useRef<HTMLElement | null>(null);
  const roomAnchorSettledRef = useRef<string | null>(null);
  const initialRate = useMemo(() => {
    const asOf=intent.checkIn || new Date().toISOString().slice(0,10);
    const expected={propertyId:property.propertyId,asOf};
    const sale=parsePublicHotelBaseSale(initialPublicRate,expected), display=publicHotelBaseSaleDisplay(initialPublicRate,expected);
    if(!sale || !display || sale.status!=="ready" || sale.fromUnitMinor===null) return null;
    const unit:StayUnit=sale.calendarUnit==="calendar-month"?"month":"night";
    return {asOf,view:{...initialRateView(variant),allowedStayUnits:variant==="marina"?["month" as StayUnit]:["night","week","month"] as StayUnit[],fromUsdMinor:{[unit]:Number(sale.fromUnitMinor)},publicBaseLabel:display.label,qualifier:display.context,ready:true,status:"stored_public_base_sale"}};
  },[initialPublicRate,intent.checkIn,property.propertyId,variant]);
  const [rateSnapshot, setRateSnapshot] = useState<{ asOf: string; view: PropertyRateView }>(() => initialRate ?? ({ asOf: "", view: initialRateView(variant) }));
  const rateAsOf = intent.checkIn || new Date().toISOString().slice(0,10);
  const currentRateSnapshot = initialRate ?? rateSnapshot;
  const rateView = currentRateSnapshot.asOf === rateAsOf ? currentRateSnapshot.view : initialRateView(variant);
  const [contentView, setContentView] = useState<PropertyContentView>(() =>
    initialViews?.content ?? initialContentView(property.propertyId),
  );
  const [roomView, setRoomView] = useState<PropertyRoomView>(() =>
    initialViews?.rooms ?? initialRoomView(property.propertyId),
  );
  const [eligibilityView, setEligibilityView] =
    useState<PropertyEligibilityView>(() =>
      initialPropertyEligibility(property.propertyId),
    );
  const [plannerStep, setPlannerStep] = useState(1);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [memberPersistence, setMemberPersistence] =
    useState<MemberPersistenceView>(initialMemberPersistence);

  const whenText = useMemo(() => {
    if (variant === "marina") return intent.checkIn&&intent.checkOut?`${formatDate(intent.checkIn,locale)} – ${formatDate(new Date(Date.parse(intent.checkOut+"T00:00:00Z")-86400000).toISOString().slice(0,10),locale)}`:"Select your start month";
    if (intent.dateMode === "flexible")
      return intent.flexibleMonth || `Flexible · ${intent.flexibleStay}`;
    if (intent.checkIn && intent.checkOut)
      return `${formatDate(intent.checkIn,locale)} - ${formatDate(intent.checkOut,locale)}`;
    return intent.checkIn ? hospitalityFromDate(intent.checkIn,locale) : "Any dates";
  }, [intent, variant,locale]);


  useEffect(() => {
    const controller = new AbortController();
    void readMemberPersistence(
      property.propertyId,
      authReturnTo,
      controller.signal,
    ).then((next) => {
      if (!controller.signal.aborted) setMemberPersistence(next);
    });
    return () => controller.abort();
  }, [authReturnTo, property.propertyId]);

  useEffect(() => {
    const controller = new AbortController();
    void readPropertyEligibility(
      property.propertyId,
      variant,
      authReturnTo,
      controller.signal,
    ).then((next) => {
      if (!controller.signal.aborted) setEligibilityView(next);
    });
    return () => controller.abort();
  }, [authReturnTo, property.propertyId, variant]);

  useEffect(() => {
    if (!galleryOpen) return;
    const previousOverflow = document.body.style.overflow;
    const focusCloseButton = window.requestAnimationFrame(() => {
      galleryCloseButtonRef.current?.focus();
    });
    const handleGalleryKeyboard = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setGalleryOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = galleryDialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleGalleryKeyboard);
    return () => {
      window.cancelAnimationFrame(focusCloseButton);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleGalleryKeyboard);
      galleryReturnFocusRef.current?.focus();
    };
  }, [galleryOpen]);

  const openGallery = (event:{currentTarget:HTMLButtonElement}) => {
    if(!galleryReady)return;
    galleryReturnFocusRef.current = event.currentTarget;
    setGalleryOpen(true);
  };

  useEffect(()=>{
    if(initialRate) return;
    const controller=new AbortController();const asOf=intent.checkIn || new Date().toISOString().slice(0,10);
    const load=async()=>{
      try {const response=await fetch(`/api/crays/clubs/forest-city/properties/${property.propertyId}/rates?asOf=${encodeURIComponent(asOf)}`,{cache:"no-store",signal:controller.signal});if(!response.ok)return;
        const raw:unknown=await response.json(),expected={propertyId:property.propertyId,asOf};const sale=parsePublicHotelBaseSale(raw,expected),display=publicHotelBaseSaleDisplay(raw,expected);if(!sale||!display||sale.status!=="ready"||sale.fromUnitMinor===null||controller.signal.aborted)return;
        const unit:StayUnit=sale.calendarUnit==="calendar-month"?"month":"night";
        setRateSnapshot({asOf,view:{...initialRateView(variant),allowedStayUnits:variant==="marina"?["month"]:["night","week","month"],fromUsdMinor:{[unit]:Number(sale.fromUnitMinor)},publicBaseLabel:display.label,qualifier:display.context,ready:true,status:"stored_public_base_sale"}});
      }catch{/* Keep unavailable; never substitute a local amount. */}
    };void load();return()=>controller.abort();
  },[property.propertyId,variant,intent.checkIn,initialRate]);

  const [mapConsentPropertyId, setMapConsentPropertyId] = useState<string | null>(null);
  const hotelMapConsent = mapConsentPropertyId === property.propertyId;
  const initialPolicy=useMemo(()=>{try{return parseHospitalityPublicPricingPolicy(initialPublicPricing,property.propertyId);}catch{return null;}},[initialPublicPricing,property.propertyId]);
  const [pricingPolicy, setPricingPolicy] = useState<HospitalityPublicPricingPolicy | null>(()=>initialPolicy);
  useEffect(() => {
    const controller = new AbortController();
    async function readPolicy() {
      if(initialPolicy){setPricingPolicy(initialPolicy);return;}
      try {
        const response = await fetch(`/api/crays/clubs/forest-city/properties/${encodeURIComponent(property.propertyId)}/pricing`, {cache:"no-store",signal:controller.signal});
        if (!response.ok) return;
        const policy = parseHospitalityPublicPricingPolicy(await response.json(), property.propertyId);
        if (!controller.signal.aborted) setPricingPolicy(policy);
      } catch { /* Missing policy never becomes a frontend price or payment fallback. */ }
    }
    void readPolicy();
    return () => controller.abort();
  }, [property.propertyId,initialPolicy]);
  const activePricingPolicy = pricingPolicy?.propertyId === property.propertyId ? pricingPolicy : null;
  const categoryBasePrices = activePricingPolicy ? new Map(activePricingPolicy.categories.map(category => [category.publicRoomTypeId, hospitalityUnitPriceLabel(category.baseUnitMinor, activePricingPolicy.billingUnit)])) : new Map<string,string>();

  useEffect(() => {
    if (initialViews) return;
    const controller = new AbortController();
    const markUnavailable = () => {
      if (controller.signal.aborted) return;
      setContentView({...initialContentView(property.propertyId),contentStatus: "Hotel details are currently unavailable.",unavailable:true});
      setRoomView({...initialRoomView(property.propertyId),status:"Room details are currently unavailable."});
    };
    const readContent = async () => {
      try {
        const response = await fetch(`/api/crays/clubs/forest-city/properties/${property.propertyId}/content`,{cache:"no-store",signal:controller.signal});
        if(!response.ok) {markUnavailable();return;}
        const views = mapPublicHotelViews(await response.json(), property.propertyId as CoreHotelId);
        if (controller.signal.aborted) return;
        setContentView(views.content);
        setRoomView(views.rooms);
      } catch(error) {
        if(error instanceof DOMException&&error.name==="AbortError")return;
        markUnavailable();
      }
    };
    void readContent();return()=>controller.abort();
  },[initialViews,property.propertyId]);

  const activeRateView =
    rateView.propertyId === property.propertyId
      ? rateView
      : initialRateView(variant);
  const currentContentView = initialViews?.content ?? contentView;
  const currentRoomView = initialViews?.rooms ?? roomView;
  const activeContentView =
    currentContentView.propertyId === property.propertyId
      ? currentContentView
      : initialContentView(property.propertyId);
  const activeRoomView =
    currentRoomView.propertyId === property.propertyId
      ? currentRoomView
      : initialRoomView(property.propertyId);
  const activeEligibilityView =
    eligibilityView.propertyId === property.propertyId &&
    (!activeRateView.ready ||
      sameUnits(
        eligibilityView.allowedStayUnits,
        activeRateView.allowedStayUnits,
      ))
      ? eligibilityView
      : unavailablePropertyEligibility(property.propertyId);

  useEffect(() => {
    if (
      !activeContentView.ready ||
      activeRoomView.status === "Loading room details..."
    )
      return;
    const anchorId = window.location.hash.slice(1);
    if (
      !["overview", "amenities", "dining", "meetings", "rooms", "location", "availability", "reviews", "legal"].includes(anchorId) &&
      !anchorId.startsWith(`room-category-fc-${variant}-`)
    )
      return;
    const settleKey = `${property.propertyId}:${anchorId}`;
    if (roomAnchorSettledRef.current === settleKey) return;
    roomAnchorSettledRef.current = settleKey;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        document.getElementById(anchorId)?.scrollIntoView({ block: "start" });
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [
    activeContentView.ready,
    activeRoomView.status,
    property.propertyId,
    variant,
  ]);
  const propertyTitle = activeContentView.ready
    ? activeContentView.canonicalName
    : activeContentView.unavailable ? "Hotel details unavailable" : "Loading hotel details…";
  const galleryImages: AdmittedMediaItem[] = activeContentView.ready
    ? activeContentView.galleryMedia
    : [];
  const heroGalleryImages = [
    galleryImages.find(image => image.searchPlacements?.includes(variant === "marina" ? "marinaCard" : "golfCard")) ?? galleryImages.find(image => image.galleryGroup === "Exterior"),
    galleryImages.find(image => image.galleryGroup === "Rooms & Suites"),
    galleryImages.find(image => image.galleryGroup === "Facilities"),
    ...galleryImages,
  ].filter((image, index, images): image is AdmittedMediaItem => Boolean(image) && images.findIndex(candidate => candidate?.publicPath === image?.publicPath) === index).slice(0, 3);
  const galleryGroups = Array.from(
    galleryImages.reduce((groups, image) => {
      const current = groups.get(image.galleryGroup) ?? [];
      current.push(image);
      groups.set(image.galleryGroup, current);
      return groups;
    }, new Map<string, AdmittedMediaItem[]>()),
  );
  const selectedStayUnit: StayUnit = variant === "marina" ? "month" : intent.dateMode === "exact" ? "night" : intent.flexibleStay === "month" ? "month" : intent.flexibleStay === "week" ? "week" : "night";
  const visibleRate = rateLabel(
    activeRateView,
    selectedStayUnit,
    variant !== "golf",
  );


  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  const refreshMemberPersistence = async () => {
    setMemberPersistence((current) => ({
      ...current,
      loading: true,
      message: null,
    }));
    setMemberPersistence(
      await readMemberPersistence(property.propertyId, authReturnTo),
    );
  };

  const refreshPropertyEligibility = async () => {
    setEligibilityView(initialPropertyEligibility(property.propertyId));
    setEligibilityView(
      await readPropertyEligibility(
        property.propertyId,
        variant,
        authReturnTo,
      ),
    );
  };

  const provisionGuestAccount = async () => {
    if (
      memberPersistence.busy ||
      memberPersistence.session.status !== "identity_binding_required" ||
      memberPersistence.session.provisioningHref !==
        "/api/crays/auth/provider/account"
    )
      return;

    setMemberPersistence((current) => ({
      ...current,
      busy: "provision",
      message: null,
    }));
    try {
      await fetch(memberPersistence.session.provisioningHref, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: "clubs" }),
      });
      await Promise.all([
        refreshMemberPersistence(),
        refreshPropertyEligibility(),
      ]);
    } catch {
      setMemberPersistence((current) => ({
        ...current,
        busy: null,
        message: "Your guest account could not be completed. Please try again.",
      }));
    }
  };

  const runMemberCommand = async (area: "save" | "cart") => {
    if (
      memberPersistence.busy ||
      memberPersistence.session.status !== "ready" ||
      !memberPersistence.stateReady
    )
      return;

    const command: MemberCommandType =
      area === "save"
        ? memberPersistence.saved
          ? "remove_saved_property"
          : "save_property"
        : memberPersistence.inCart
          ? "remove_cart"
          : "add_cart";
    const expected =
      area === "save" ? !memberPersistence.saved : !memberPersistence.inCart;
    const idempotencyKey = `clubs_${Date.now()}_${crypto.randomUUID()}`;
    setMemberPersistence((current) => ({
      ...current,
      busy: area,
      message: null,
    }));

    const postCommand = async () => {
      const response = await fetch("/api/crays/clubs/member/state", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          propertyId: property.propertyId,
          type: command,
        }),
      });
      const payload = (await response.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      return { payload, response };
    };

    try {
      let result = await postCommand();
      if (
        result.response.status === 503 &&
        result.payload?.status === "unknown_outcome"
      ) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        result = await postCommand();
      }

      const reconciled = await readMemberPersistence(
        property.propertyId,
        authReturnTo,
      );
      const stateVerified =
        reconciled.stateReady &&
        (area === "save" ? reconciled.saved : reconciled.inCart) === expected;
      const acknowledged =
        result.response.status === 200 &&
        result.payload?.status === "persisted" &&
        result.payload.propertyId === property.propertyId &&
        result.payload.bookingAuthority === false &&
        typeof result.payload.receiptId === "string" &&
        (area !== "save" || result.payload.saved === expected) &&
        (area !== "cart" ||
          !expected ||
          (typeof result.payload.cartItemId === "string" &&
            ((result.payload.cartState === "planning" &&
              result.payload.commercialBinding === false) ||
              (result.payload.cartState === "commercially_bound" &&
                result.payload.commercialBinding === true))));
      const confirmed = acknowledged && stateVerified;
      setMemberPersistence({
        ...reconciled,
        message: confirmed
          ? area === "save"
            ? expected
              ? "Saved to your CRAYS account."
              : "Removed from your saved stays."
            : expected
              ? result.payload?.cartState === "planning"
                ? "Saved to your planning cart. Booking options will become available after the stay is confirmed for sale."
                : "Saved to your cart. Availability and booking are confirmed separately."
              : "Removed from your planning cart."
          : result.response.status === 503
            ? "Saved stays and cart are temporarily unavailable."
            : result.response.status === 400
              ? "This change was not accepted. Your latest account state is shown."
              : result.response.status === 409
                ? "Your account state changed. The latest saved stays and cart are shown."
                : result.response.status === 200
                  ? "The latest account state could not be confirmed. Please try again."
                  : "This change could not be completed. Please try again.",
      });
    } catch {
      setMemberPersistence((current) => ({
        ...current,
        busy: null,
        message: "This change could not be completed. Please try again.",
      }));
    }
  };

  return (
    <TodayLocaleProvider locale={locale} messages={hospitalityUiMessages[locale]}><TodayLocalizedContent><main className={styles.page} data-booking-step={plannerStep}>
      <section className={styles.firstScreen} aria-labelledby="property-title">
        <div
          className={styles.searchContext}
          aria-label="Your preserved search"
        >
          <div>
            <span>Where</span>
            <strong>{property.destination}</strong>
          </div>
          <div>
            <span>When</span>
            <strong>{whenText}</strong>
          </div>
          <div>
            <span>Who</span>
            <strong>
              {hotelGuestSummary(intent.guests + intent.children,intent.pets,locale)}
            </strong>
          </div>
          <Link aria-label="Back to Forest City search" href={backToSearch}>
            <Search aria-hidden="true" size={21} />
          </Link>
        </div>

        <div className={styles.heroHeading}>
          <div>
            <nav aria-label="Breadcrumb">
              <Link href="/en">CRAYS Clubs</Link>
              <span>/</span>
              <Link href="/en/hospitality">Hospitality</Link>
              <span>/</span>
              <span aria-current="page">
                {variant === "marina" ? "Marina Hotel" : "Golf Hotel"}
              </span>
            </nav>
            <p className={styles.kicker}>CRAYS FOREST CITY</p>
            <h1 id="property-title">{propertyTitle}</h1>
            <div className={styles.identityLine}>
              <span>
                <MapPin aria-hidden="true" size={16} /> Forest City, Johor
              </span>
              <span>Membership only</span>
              <span>{variant === "marina" ? "Crays Club Longstay" : "Crays Club Short-Stay"}</span>
              <span>
                {activeContentView.cardStayPolicy ?? ""}
              </span>
            </div>
          </div>
          <div className={styles.heroActions}>
            {memberPersistence.loading ? (
              <button disabled type="button">
                <Heart aria-hidden="true" size={16} /> Loading saved stay…
              </button>
            ) : memberPersistence.session.status === "signed_out" &&
              memberPersistence.session.loginHref ? (
              <a href={memberPersistence.session.loginHref}>
                <Heart aria-hidden="true" size={16} /> Log in to save
              </a>
            ) : memberPersistence.session.status === "ready" &&
              memberPersistence.stateReady ? (
              <button
                aria-pressed={memberPersistence.saved}
                disabled={memberPersistence.busy !== null}
                onClick={() => void runMemberCommand("save")}
                type="button"
              >
                <Heart aria-hidden="true" size={16} />
                {memberPersistence.busy === "save"
                  ? "Saving…"
                  : memberPersistence.saved
                    ? "Saved"
                    : "Save"}
              </button>
            ) : memberPersistence.session.status ===
                "identity_binding_required" &&
              memberPersistence.session.provisioningHref ? (
              <button
                disabled={memberPersistence.busy === "provision"}
                onClick={() => void provisionGuestAccount()}
                type="button"
              >
                {memberPersistence.busy === "provision"
                  ? "Completing account…"
                  : "Complete guest account"}
              </button>
            ) : (
              <button
                disabled
                title="Saving is currently unavailable because your account connection could not be verified. You can retry in Your account & saved stay below."
                type="button"
              >
                <Heart aria-hidden="true" size={16} /> Save unavailable
              </button>
            )}
            <button onClick={copyLink} type="button">
              {copyState === "copied" ? (
                <Check aria-hidden="true" size={16} />
              ) : (
                <Copy aria-hidden="true" size={16} />
              )}
              {copyState === "copied"
                ? "Link copied"
                : copyState === "error"
                  ? "Copy unavailable"
                  : "Copy link"}
            </button>
            <Link href={backToSearch}>
              <ArrowLeft aria-hidden="true" size={16} /> Back to search
            </Link>
          </div>
        </div>

        <nav className={styles.bookingJourney} aria-label="Hotel booking journey">
          <ol>{["Stay details", "Rooms & services", "Your offer", "Payment"].map((label, index) => <li key={label} aria-current={index === 0 ? "step" : undefined}><span>{index + 1}</span><strong>{label}</strong></li>)}</ol>
        </nav>

        <div className={`${styles.heroMedia} ${galleryImages.some(image=>image.purpose==="hero")?"":styles.galleryOnly}`}>
          <div className={styles.heroGallery}>
            {heroGalleryImages.map((image, index) => (
              <button
                aria-label={`Open ${propertyTitle} image gallery at image ${index + 1}`}
                className={styles.galleryTile}
                disabled={!galleryReady}
                key={image.publicPath}
                onClick={openGallery}
                type="button"
              >
                <Image
                  alt={image.alt}
                  fill
                  unoptimized
                  loading="eager"
                  priority={index === 0}
                  sizes={
                    index === 0
                      ? "(max-width: 560px) 100vw, 65vw"
                      : "(max-width: 560px) 25vw, 18vw"
                  }
                  src={image.publicPath}
                  style={{
                    objectPosition: `${image.focalPoint.x * 100}% ${image.focalPoint.y * 100}%`,
                    objectFit: "cover",
                  }}
                />
              </button>
            ))}
          </div>
          <div className={styles.statusBadge}>
            {activeRateView.ready
              ? "From rate available · Availability checked separately"
              : "Rate currently unavailable"}
          </div>
          {galleryImages.length > 1 ? (
            <button
              className={styles.allImagesButton}
                disabled={!galleryReady}
              onClick={openGallery}
              type="button"
            >
              <Images aria-hidden="true" size={17} /> All images ·{" "}
              {galleryImages.length}
            </button>
          ) : null}
          <p>
            {galleryImages.length > 1
              ? activeContentView.ready
                ? `${galleryImages.length} hotel images are available.`
                : `${galleryImages.length} approved preview images are available. Live property content is checked separately.`
              : activeContentView.mediaStatus}
          </p>
        </div>
      </section>

      {galleryOpen && galleryImages.length > 1 ? (
        <div
          aria-labelledby="property-gallery-title"
          aria-modal="true"
          className={styles.galleryOverlay}
          role="dialog"
        >
          <div className={styles.galleryDialog} ref={galleryDialogRef}>
            <header>
              <div>
                <p className={styles.kicker}>HOTEL PHOTOGRAPHY</p>
                <h2 id="property-gallery-title">{propertyTitle}</h2>
                <span>
                  {galleryImages.length} hotel images · this collection may grow
                </span>
              </div>
              <button
                aria-label="Close image gallery"
                onClick={() => setGalleryOpen(false)}
                ref={galleryCloseButtonRef}
                type="button"
              >
                <X aria-hidden="true" size={23} />
              </button>
            </header>
            <div className={styles.galleryDialogGroups}>
              {galleryGroups.map(([group, images]) => (
                <section className={styles.galleryGroup} key={group}>
                  <div className={styles.galleryGroupHeading}>
                    <h3>{group}</h3>
                    <span>{images.length} {images.length === 1 ? "image" : "images"}</span>
                  </div>
                  <div className={styles.galleryDialogGrid}>
                    {images.map((image) => (
                      <figure key={image.publicPath} style={image.maxCssWidth?{maxWidth:image.maxCssWidth,width:"100%",justifySelf:"center"}:undefined}>
                        <div style={image.width&&image.height?{aspectRatio:`${image.width} / ${image.height}`}:undefined}>
                          <Image
                            alt={image.alt}
                            fill
                            unoptimized
                            sizes="(max-width: 680px) 100vw, 50vw"
                            src={image.publicPath}
                            style={{
                              objectPosition: `${image.focalPoint.x * 100}% ${image.focalPoint.y * 100}%`,
                    objectFit: image.crop,
                            }}
                          />
                        </div>
                        <figcaption>
                          {galleryImages.findIndex((item) => item.publicPath === image.publicPath) + 1} / {galleryImages.length} ·{" "}
                          {image.alt}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <ClubsHotelStayPlanner ambassadors={initialAmbassadors} propertyId={property.propertyId} title={propertyTitle} variant={variant} intent={intent} summary={activeContentView.ready ? activeContentView.summary : activeContentView.contentStatus} baseDescription={activeContentView.baseOfferDescription} fromLabel={visibleRate} facilities={activeContentView.facilities} rooms={activeRoomView.labels} photos={galleryImages} policy={activePricingPolicy} onStepChange={setPlannerStep} onIntentChange={adoptPlannerIntent} editRequest={plannerEditRequest} />

      <nav className={styles.sectionNav} aria-label="Property detail sections">
        {[
          ["overview", "Overview"],
          ["amenities", "Amenities"],
          ["dining", "Dining"],
          ["meetings", "Meetings"],
          ["rooms", "Rooms & suites"],
          ["location", "Location"],
          ["availability", "Availability"],
          ["reviews", "Reviews"],
          ["legal", "Good to know"],
        ].map(([href, label]) => (
          <a href={`#${href}`} key={href}>
            {label}
          </a>
        ))}
      </nav>

      <div className={styles.detailLayout}>
        <div className={styles.detailContent}>
          <section className={styles.introPanel} id="overview">
            <header className={styles.sectionHeading}>
            <p className={styles.kicker}>OVERVIEW</p>
            <h2>Overview</h2>
            </header>
            <div className={styles.sectionBody}>
            <CraysClubExperience />
            <h3 className={styles.hotelOverviewHeading}>Your hotel setting</h3>
            <p>
              {activeContentView.ready
                ? activeContentView.summary
                : activeContentView.contentStatus}
            </p>
            {!activeContentView.ready ? <div className={styles.emptyState} role="status"><strong>{activeContentView.contentStatus}</strong></div> : null}

            </div>
          </section>

          <section className={styles.stateSection} id="amenities">
            <header className={styles.sectionHeading}>
            <p className={styles.kicker}>AMENITIES</p>
            <h2>Hotel amenities</h2>
            {galleryImages.find(image=>image.galleryGroup==="Facilities") ? <div className={styles.sectionPhoto}><Image src={galleryImages.find(image=>image.galleryGroup==="Facilities")!.publicPath} alt={galleryImages.find(image=>image.galleryGroup==="Facilities")!.alt} fill unoptimized sizes="(max-width: 820px) 90vw, 440px" /></div> : null}

            </header>
            <div className={styles.sectionBody}>
            <p>
              Explore the hotel facilities and services currently available to
              guests. Opening times may change.
            </p>
            {activeContentView.ready ? (
              <div className={styles.amenityGrid}>
                {activeContentView.facilities.map((item) => (
                  <article className={styles.amenityCard} key={item.id}>
                    <span className={styles.amenityIcon}>
                      <FacilityIcon label={item.label} />
                    </span>
                    <div>
                      <strong>{item.label}</strong>
                      {item.details.length > 0 ? (
                        <ul>
                          {Array.from(new Set(item.details)).map((detail) => (
                            <li key={detail}>{detail}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <strong>{activeContentView.contentStatus}</strong>
              </div>
            )}

            </div>
          </section>

          <section className={styles.stateSection} id="dining">
            <header className={styles.sectionHeading}>
            <p className={styles.kicker}>DINING</p>
            <h2>Restaurants and dining</h2>
            {galleryImages.find(image=>image.galleryGroup==="Dining") ? <div className={styles.sectionPhoto}><Image src={galleryImages.find(image=>image.galleryGroup==="Dining")!.publicPath} alt={galleryImages.find(image=>image.galleryGroup==="Dining")!.alt} fill unoptimized sizes="(max-width: 820px) 90vw, 440px" /></div> : null}

            </header>
            <div className={styles.sectionBody}>
            <p>
              Explore dining venues and published service hours. Opening times
              may change during your stay.
            </p>
            {activeContentView.ready ? (
              <div className={styles.amenityGrid}>
                {activeContentView.dining.map((item) => (
                  <article className={styles.amenityCard} key={item.id}>
                    <span className={styles.amenityIcon}>
                      <Utensils aria-hidden="true" size={20} />
                    </span>
                    <div>
                      <strong>{item.label}</strong>
                      {item.details.length > 0 ? (
                        <ul>
                          {Array.from(new Set(item.details)).map((detail) => (
                            <li key={detail}>{detail}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <strong>{activeContentView.contentStatus}</strong>
              </div>
            )}

            </div>
          </section>

          <section className={styles.stateSection} id="meetings">
            <header className={styles.sectionHeading}>
            <p className={styles.kicker}>MEETINGS &amp; EVENTS</p>
            <h2>Meetings and events</h2>
            {galleryImages.find(image=>image.galleryGroup==="Meetings & Events") ? <div className={styles.sectionPhoto}><Image src={galleryImages.find(image=>image.galleryGroup==="Meetings & Events")!.publicPath} alt={galleryImages.find(image=>image.galleryGroup==="Meetings & Events")!.alt} fill unoptimized sizes="(max-width: 820px) 90vw, 440px" /></div> : null}

            </header>
            <div className={styles.sectionBody}>
            <p>
              Explore meeting and event spaces. Event availability is checked
              separately.
            </p>
            {activeContentView.ready ? (
              <div className={styles.amenityGrid}>
                {activeContentView.meetings.map((item) => (
                  <article className={styles.amenityCard} key={item.id}>
                    <span className={styles.amenityIcon}>
                      <Presentation aria-hidden="true" size={20} />
                    </span>
                    <div>
                      <strong>{item.label}</strong>
                      {item.details.length > 0 ? (
                        <ul>
                          {Array.from(new Set(item.details)).map((detail) => (
                            <li key={detail}>{detail}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <strong>{activeContentView.contentStatus}</strong>
              </div>
            )}

            </div>
          </section>

          <section className={styles.stateSection} id="rooms">
            <header className={styles.sectionHeading}>
            <p className={styles.kicker}>ROOMS &amp; SUITES</p>
            <h2>Rooms and suites</h2>

            </header>
            <div className={styles.sectionBody}>
            {activeRoomView.ready ? (
              <>
                <div className={styles.roomIntro}>
{galleryImages.find(image=>image.galleryGroup==="Rooms & Suites") ? <figure className={styles.roomSectionPhoto}><div className={styles.sectionPhoto}><Image src={galleryImages.find(image=>image.galleryGroup==="Rooms & Suites")!.publicPath} alt={galleryImages.find(image=>image.galleryGroup==="Rooms & Suites")!.alt} fill unoptimized sizes="(max-width: 820px) 90vw, 440px" /></div><figcaption>Room photography. Your selected room category and features are confirmed in your offer.</figcaption></figure> : null}
                <div className={styles.sourceNotice} role="status">
                  <Info aria-hidden="true" size={20} />
                  <div>
                    <strong>Compare room categories</strong>
                    <span>
                      These categories describe the hotel. Individual room
                      selection, rates and availability are checked separately.
                    </span>
                    <details className={styles.roomGuide}><summary>How room selection works</summary><p>{activeRoomView.status}</p></details>
                  </div>
                </div>
                </div>
                <div className={styles.roomGrid}>
                  {[...activeRoomView.labels].sort((a,b)=>Number(activePricingPolicy?.categories.find(x=>x.publicRoomTypeId===a.id)?.baseUnitMinor ?? Number.MAX_SAFE_INTEGER)-Number(activePricingPolicy?.categories.find(x=>x.publicRoomTypeId===b.id)?.baseUnitMinor ?? Number.MAX_SAFE_INTEGER)).map((room) => (
                    <article
                      aria-labelledby={`${room.id}-title`}
                      className={styles.roomCard}
                      id={room.id}
                      key={room.id}
                    >
                      <span className={styles.amenityIcon}>
                        <BedDouble aria-hidden="true" size={20} />
                      </span>
                      <div>
                        <h3 id={`${room.id}-title`}>{room.label}</h3>
                        {categoryBasePrices.has(room.id) ? <p>From {categoryBasePrices.get(room.id)}</p> : null}
                        {room.details.length > 0 ? (
                          <ul>
                            {room.details.map((detail) => (
                              <li key={detail}>{detail}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <strong>{activeRoomView.status}</strong>
              </div>
            )}

            </div>
          </section>

          <section className={styles.stateSection} id="location">
            <header className={styles.sectionHeading}>
            <p className={styles.kicker}>LOCATION</p>
            <h2>Forest City</h2>
            </header>
            <div className={styles.sectionBody}>
            {activeContentView.locationText ? <p className={styles.locationIntroduction}>{activeContentView.locationText}</p> : null}
            <div className={styles.locationMap}>
              <div className={styles.mapCanvas}>
                {activeContentView.map && (activeContentView.map.loadPolicy === "on-page-load" || hotelMapConsent) ? (
                  <iframe allowFullScreen loading="eager" referrerPolicy="no-referrer-when-downgrade" src={activeContentView.map.embedUrl} title={`${propertyTitle} location`} />
                ) : activeContentView.map ? (
                  <button type="button" onClick={()=>setMapConsentPropertyId(property.propertyId)}>Show hotel map</button>
                ) : (<p>Hotel location is currently unavailable.</p>)}
              </div>
              <div className={styles.mapCaption}>
                <MapPin aria-hidden="true" size={24} />
                <div>
                  <strong>
                    {activeContentView.ready
                      ? activeContentView.address
                      : activeContentView.contentStatus}
                  </strong>
                  <a
                    href={activeContentView.map?.placeUrl}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    Open in Google Maps{" "}
                    <ArrowRight aria-hidden="true" size={15} />
                  </a>
                </div>
              </div>
            </div>

            </div>
          </section>

          <section className={styles.stateSection} id="availability">
            <header className={styles.sectionHeading}>
            <p className={styles.kicker}>AVAILABILITY &amp; HOUSE RULES</p>
            <h2>Stay information</h2>
            </header>
            <div className={styles.sectionBody}>
            <div className={styles.stateGrid}>
              <article>
                <CalendarDays aria-hidden="true" size={22} />
                <strong>Availability is confirmed before booking.</strong>
                <p>Your dates and selected room category must be confirmed in your stay offer.</p>
              </article>
              <article>
                <Info aria-hidden="true" size={22} />
                <strong>{activeContentView.ready ? activeContentView.directPolicyCopy || "Your confirmed stay terms" : activeContentView.contentStatus}</strong>
                <p>Your CRAYS offer sets the room, included services, cancellation and payment terms. Hotel information on this page is guidance.</p>
              </article>
            </div>
            <details className={styles.stayAccessDetails}><summary>Stay access and room availability</summary><p>{activeEligibilityView.accessCopy}</p><p>{activeEligibilityView.separationCopy}</p><p>{activeRateView.allowedStayUnits.length ? `Stay lengths: ${activeRateView.allowedStayUnits.join(", ")}.` : "Available stay lengths are being checked."}</p>{activeContentView.inventoryTotal !== null ? <p>{activeContentView.inventoryTotal} published rooms.</p> : <p>Available rooms are confirmed for your selected dates.</p>}</details>
            {activeContentView.ready ? (
              <div className={styles.sourceGrid}>
                {activeContentView.hotelDirectPolicy.map((policy) => (
                  <div key={policy}>
                    <span>Hotel-direct information</span>
                    <strong>{policy}</strong>
                  </div>
                ))}
              </div>
            ) : null}

            </div>
          </section>

          <section className={styles.stateSection} id="reviews">
            <header className={styles.sectionHeading}>
            <p className={styles.kicker}>REVIEWS</p>
            <h2>Guest reviews</h2>
            </header>
            <div className={styles.sectionBody}>
            <div className={styles.emptyState}>
              <strong>Reviews are not available yet.</strong>
              <p>
                Guest ratings and review totals will appear here when available.
              </p>
            </div>

            </div>
          </section>

          <section className={styles.stateSection} id="legal">
            <header className={styles.sectionHeading}>
            <p className={styles.kicker}>GOOD TO KNOW</p>
            <h2>Before you request your stay</h2>
            </header>
            <div className={styles.sectionBody}>
            <div className={styles.stateGrid}>
              <article>
                <CalendarDays aria-hidden="true" size={22} />
                <strong>
                  {activeRateView.ready
                    ? "The displayed price is a starting price for your Crays stay package."
                    : "A price is not currently available."}
                </strong>
                <p>
                  {activeRateView.ready
                    ? "Your package combines your room and the Crays services included for each guest. Additional guests and room-category changes affect the price. Availability, included services and the final total are confirmed in your dated offer before booking and payment."
                    : "Dates, availability and a final quote are not available in this flow."}
                </p>
              </article>
              <article>
                <Info aria-hidden="true" size={22} />
                <strong>{activeEligibilityView.accessCopy}</strong>
                <p>{activeEligibilityView.separationCopy}</p>
              </article>
            </div>
            <div className={styles.policyDetails}>
            {activePricingPolicy?.occupancy ? (
              <div className={styles.emptyState}>
                <strong>Marina monthly occupancy</strong>
                <p>The room base price includes one adult. A second adult adds {hospitalityUnitPriceLabel(activePricingPolicy.occupancy.secondAdultUnitMinor, activePricingPolicy.billingUnit)}.</p>
                <p>One child aged {activePricingPolicy.occupancy.childFreeThroughAge} or younger stays without an additional CRAYS charge. Two children in this age range require a separate available room at {hospitalityUnitPriceLabel(activePricingPolicy.occupancy.additionalChildrenRoomUnitMinor, activePricingPolicy.billingUnit)}, for the room only.</p>
              </div>
            ) : null}
            {activeContentView.paymentOptionsNote ? (
              <div className={styles.emptyState}>
                <strong>Payment options</strong>
                <p>{activeContentView.paymentOptionsNote}</p>
              </div>
            ) : null}

            </div>
            </div>
          </section>

          <section className={styles.helpPanel}>
            <div>
              <p className={styles.kicker}>NEED HELP?</p>
              <h2>Let’s plan your Crays stay.</h2>
              <p>
                Contact Crays for booking and stay questions, or return to your search to adjust dates, guests and stay preferences.
              </p>
            </div>
            <Link href={backToSearch}>
              Back to search <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </section>
        </div>

        <details className={styles.bookingCard} aria-label="Your account and saved stay"><summary>Your account &amp; saved stay</summary>
          <p className={styles.kicker}>YOUR HOTEL STAY</p>
          <div className={styles.rateLead}>
            <h2>{visibleRate}</h2>
            <p>{contentView.baseOfferDescription ?? activeRateView.qualifier}</p>
          </div>
          <div className={styles.bookingNotice} role="status">
            <Info aria-hidden="true" size={18} />
            <p>
              <strong>
                {activeRateView.ready
                  ? variant === "golf"
                    ? "Your from-rate is available."
                    : "Your from-rate is available."
                  : "The rate is currently unavailable."}
              </strong>
              Exact availability and the final booking quote are checked
              separately.
            </p>
          </div>
          <div className={styles.bookingFields}>
            <button onClick={reviewStayDetails} type="button">
              <span>Arrival date and duration</span>
              <strong>{whenText}</strong>
              <em>Review</em>
            </button>
            <button onClick={reviewStayDetails} type="button">
              <span>Guests and pets</span>
              <strong>
                {hotelGuestSummary(intent.guests + intent.children,intent.pets,locale)}
              </strong>
              <em>Review</em>
            </button>
          </div>
          <button
            className={styles.previewButton}
            onClick={reviewStayDetails}
            type="button"
          >
            Review stay &amp; booking{" "}
            <ArrowRight aria-hidden="true" size={16} />
          </button>
          <div className={styles.bookingPolicy}>
            <p>
              {activeContentView.cardStayPolicy ?? ""}
            </p>
            <p>
              {activeEligibilityView.accessCopy}
              {activeEligibilityView.status === "signed_out" &&
              activeEligibilityView.loginHref ? (
                <>
                  {" "}
                  <a href={activeEligibilityView.loginHref}>Sign in</a>
                </>
              ) : null}
            </p>
            <p>{activeEligibilityView.separationCopy}</p>
            {activeContentView.paymentOptionsSummary ? <p>{activeContentView.paymentOptionsSummary}</p> : null}
            <p>This screen does not take payment or confirm a stay.</p>
            {activeEligibilityView.retryable ? (
              <p>
                <button
                  onClick={() => void refreshPropertyEligibility()}
                  type="button"
                >
                  Try again
                </button>
              </p>
            ) : null}
          </div>
          {memberPersistence.message ? (
            <p className={styles.persistenceMessage} role="status">
              {memberPersistence.message}
            </p>
          ) : null}
          <div className={styles.persistenceActions}>
            {memberPersistence.loading ? (
              <>
                <button disabled type="button">
                  <Heart aria-hidden="true" size={16} /> Loading saved stays…
                </button>
                <button disabled type="button">
                  <ShoppingBag aria-hidden="true" size={16} /> Loading cart…
                </button>
              </>
            ) : memberPersistence.session.status === "signed_out" &&
              memberPersistence.session.loginHref ? (
              <>
                <a href={memberPersistence.session.loginHref}>
                  <Heart aria-hidden="true" size={16} /> Log in to save
                </a>
                <a href={memberPersistence.session.loginHref}>
                  <ShoppingBag aria-hidden="true" size={16} /> Log in to add to
                  cart
                </a>
              </>
            ) : memberPersistence.session.status ===
                "identity_binding_required" &&
              memberPersistence.session.provisioningHref ? (
              <button
                className={styles.persistenceWide}
                disabled={memberPersistence.busy === "provision"}
                onClick={() => void provisionGuestAccount()}
                type="button"
              >
                {memberPersistence.busy === "provision"
                  ? "Completing guest account…"
                  : "Complete guest account to save and use cart"}
              </button>
            ) : memberPersistence.session.status === "ready" &&
              memberPersistence.stateReady ? (
              <>
                <button
                  aria-pressed={memberPersistence.saved}
                  className={
                    memberPersistence.saved ? styles.persistenceActive : ""
                  }
                  disabled={memberPersistence.busy !== null}
                  onClick={() => void runMemberCommand("save")}
                  type="button"
                >
                  <Heart aria-hidden="true" size={16} />
                  {memberPersistence.busy === "save"
                    ? "Saving…"
                    : memberPersistence.saved
                      ? "Saved"
                      : "Save"}
                </button>
                <button
                  aria-pressed={memberPersistence.inCart}
                  className={
                    memberPersistence.inCart ? styles.persistenceActive : ""
                  }
                  disabled={memberPersistence.busy !== null}
                  onClick={() => void runMemberCommand("cart")}
                  type="button"
                >
                  <ShoppingBag aria-hidden="true" size={16} />
                  {memberPersistence.busy === "cart"
                    ? "Updating…"
                    : memberPersistence.inCart
                      ? "In cart"
                      : "Add to cart"}
                </button>
              </>
            ) : (
              <button
                className={styles.persistenceWide}
                onClick={() => void refreshMemberPersistence()}
                type="button"
              >
                Retry account connection
              </button>
            )}
          </div>
        </details>
      </div>


    </main></TodayLocalizedContent></TodayLocaleProvider>
  );
}
