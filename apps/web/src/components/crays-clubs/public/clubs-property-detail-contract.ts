import type {ClubsLocale} from "@/lib/clubs/public-site";
export const forestCityProperties = {
  marina: {
    propertyId: "property-clubs-forest-city-marina",
    route: "/en/hospitality/marina-hotel",
    destination: "Forest City",
    variant: "Marina",
    title: "Forest City Marina",
    discoveryTitle: "Forest City Marina Hotel",
    image: "/__crays-clubs/forest-city-public/marina-hotel-exterior.jpg",
    imagePosition: "50% 48%",
    imageSha256:
      "0693c771895373545748b02e7b633b3dcb86d56b17ad3254567a19da02392525",
  },
  golf: {
    propertyId: "property-clubs-forest-city-golf",
    route: "/en/hospitality/golf-hotel",
    destination: "Forest City",
    variant: "Golf",
    title: "Forest City Golf",
    discoveryTitle: "Forest City Golf Hotel",
    image: "/__crays-clubs/forest-city-public/golf-hotel-exterior.jpg",
    imagePosition: "50% 54%",
    imageSha256:
      "939b7c3d77944015eae4362748bb572d68af713e7059fdc134a7e5efc2766295",
  },
} as const;

export type ForestCityPropertyVariant = keyof typeof forestCityProperties;
export type SearchQuery = Record<string, string | string[] | undefined>;

export type BookingIntent = {
  dateMode: "exact" | "flexible";
  calendarMonths?: number;
  guestsExplicit?: boolean;
  checkIn: string;
  checkOut: string;
  flexibleMonth: string;
  flexibleStay: "weekend" | "week" | "month";
  guests: number;
  children: number;
  pets: number;
  nights: number;
  range: number;
};

export type ClubsMemberAuthStatus =
  | "loading"
  | "signed_out"
  | "configuration_not_ready"
  | "provider_session_unreadable"
  | "invalid_session_provenance"
  | "identity_binding_required"
  | "core_unavailable"
  | "temporarily_unavailable"
  | "ready";

export type ClubsMemberAuthSession = {
  status: ClubsMemberAuthStatus;
  authenticated: boolean;
  accountMapped: boolean;
  bookingAuthority: false;
  loginHref?: string;
  signupHref?: string;
  provisioningHref?: "/api/crays/auth/provider/account";
  logoutHref?: string;
  account?: {
    id: string | null;
    displayName: string | null;
    name: string | null;
    email: string | null;
    emailVerified: boolean;
    backendSynced: true;
    provider: "auth0";
  };
};

export const clubsMemberAuthCopy = {
  loading: "Loading secure member context...",
  signed_out: "Sign in or create an account to continue.",
  configuration_not_ready: "Secure sign-in is not available yet.",
  provider_session_unreadable: "Secure session unavailable. Please try again.",
  invalid_session_provenance:
    "This sign-in session cannot be used for CRAYS Clubs.",
  identity_binding_required:
    "Complete your CRAYS guest account before continuing.",
  core_unavailable: "Your CRAYS account cannot be loaded right now.",
  temporarily_unavailable: "This service is temporarily unavailable.",
  ready: "Secure member context ready.",
} as const satisfies Record<ClubsMemberAuthStatus, string>;

export const loadingClubsMemberAuthSession: ClubsMemberAuthSession = {
  status: "loading",
  authenticated: false,
  accountMapped: false,
  bookingAuthority: false,
};

const repeatableKeys = new Set([
  "attribute",
  "attributes",
  "type",
  "types",
  "filter",
  "filters",
]);

const preservedKeys = [
  "destination",
  "date_mode",
  "calendar_months",
  "guest_selection",
  "date_from",
  "date_to",
  "flexible_month",
  "flexible_stay",
  "guests",
  "children",
  "pets",
  "nights",
  "range",
  "collection",
  "attribute",
  "attributes",
  "type",
  "types",
  "price_min",
  "price_max",
  "bedrooms",
  "beds",
  "bathrooms",
  "view",
  "sort",
  "filter",
  "filters",
] as const;

function first(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? (value[0] ?? fallback) : (value ?? fallback);
}

function all(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
}

function boundedInteger(
  value: string | string[] | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(first(value));
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum)
    return fallback;
  return parsed;
}

function validIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
    ? ""
    : value;
}

export function isSafeRelativeRoute(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) return false;
  try {
    const decoded = decodeURIComponent(value);
    return (
      decoded.startsWith("/") &&
      !decoded.startsWith("//") &&
      !decoded.includes("\\")
    );
  } catch {
    return false;
  }
}

export function preserveSearchQuery(query: SearchQuery) {
  const params = new URLSearchParams();
  preservedKeys.forEach((key) => {
    const values = all(query[key]);
    if (!repeatableKeys.has(key) && values.length > 0) {
      params.set(key, values[0]);
      return;
    }
    values.forEach((value) => params.append(key, value));
  });
  return params;
}

export function buildBackToSearch(query: SearchQuery, locale: ClubsLocale = "en") {
  const requestedReturn = first(query.return_to);
  if (requestedReturn && isSafeRelativeRoute(requestedReturn))
    return requestedReturn;
  const params = preserveSearchQuery(query);
  return params.size > 0 ? `/${locale}/search?${params.toString()}` : `/${locale}/search`;
}

export function buildDetailHref(
  variant: ForestCityPropertyVariant,
  params: URLSearchParams,
  locale: ClubsLocale = "en",
) {
  const query = params.toString();
  return `${forestCityProperties[variant].route.replace(/^\/en\//, `/${locale}/`)}${query ? `?${query}` : ""}`;
}

export function buildPropertyReturnTo(
  variant: ForestCityPropertyVariant,
  query: SearchQuery,
  locale: ClubsLocale = "en",
) {
  return buildDetailHref(variant, preserveSearchQuery(query), locale);
}

const memberAuthStatuses = new Set<ClubsMemberAuthStatus>(
  Object.keys(clubsMemberAuthCopy) as ClubsMemberAuthStatus[],
);

function safeAuthHref(value: unknown, pathname: string) {
  if (typeof value !== "string" || !isSafeRelativeRoute(value)) return;
  try {
    const parsed = new URL(value, "https://clubs-auth.invalid");
    if (
      parsed.origin !== "https://clubs-auth.invalid" ||
      parsed.pathname !== pathname
    )
      return;
    return value;
  } catch {
    return;
  }
}

function memberAccount(value: unknown): ClubsMemberAuthSession["account"] {
  if (!value || typeof value !== "object") return;
  const account = value as Record<string, unknown>;
  return {
    id: typeof account.id === "string" ? account.id : null,
    displayName:
      typeof account.displayName === "string" ? account.displayName : null,
    name: typeof account.name === "string" ? account.name : null,
    email: typeof account.email === "string" ? account.email : null,
    emailVerified: account.emailVerified === true,
    backendSynced: true,
    provider: "auth0",
  };
}

export async function readClubsMemberAuthSession(
  returnTo: string,
  signal?: AbortSignal,
): Promise<ClubsMemberAuthSession> {
  try {
    const params = new URLSearchParams({ returnTo });
    const response = await fetch(
      `/api/crays/clubs/member/session?${params.toString()}`,
      {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal,
      },
    );
    const payload = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const status = payload?.status;
    if (
      !payload ||
      typeof status !== "string" ||
      !memberAuthStatuses.has(status as ClubsMemberAuthStatus)
    ) {
      return {
        ...loadingClubsMemberAuthSession,
        status: "temporarily_unavailable",
      };
    }
    const normalizedStatus = status as ClubsMemberAuthStatus;
    return {
      status: normalizedStatus,
      authenticated:
        normalizedStatus === "ready" ||
        normalizedStatus === "identity_binding_required",
      accountMapped: normalizedStatus === "ready",
      bookingAuthority: false,
      loginHref: safeAuthHref(payload.loginHref, "/auth/login"),
      signupHref: safeAuthHref(payload.signupHref, "/auth/login"),
      provisioningHref:
        payload.provisioningHref === "/api/crays/auth/provider/account"
          ? "/api/crays/auth/provider/account"
          : undefined,
      logoutHref: safeAuthHref(payload.logoutHref, "/auth/logout"),
      account:
        normalizedStatus === "ready"
          ? memberAccount(payload.account)
          : undefined,
    };
  } catch {
    return {
      ...loadingClubsMemberAuthSession,
      status: "temporarily_unavailable",
    };
  }
}

export function getBookingIntent(query: SearchQuery): BookingIntent {
  const rawMode = first(query.date_mode, "flexible");
  const flexibleStay = first(query.flexible_stay, "week");
  return {
    dateMode: rawMode === "exact" || rawMode === "dates" || rawMode === "months" ? "exact" : "flexible",
    calendarMonths: boundedInteger(query.calendar_months, 1, 1, 12),
    checkIn: validIsoDate(first(query.date_from)),
    checkOut: validIsoDate(first(query.date_to)),
    flexibleMonth: first(query.flexible_month),
    flexibleStay:
      flexibleStay === "weekend" || flexibleStay === "month"
        ? flexibleStay
        : "week",
    guests: boundedInteger(query.guests, 1, 1, 24),
    guestsExplicit: first(query.guest_selection)==="explicit",
    children: boundedInteger(query.children, 0, 0, 24),
    pets: boundedInteger(query.pets, 0, 0, 12),
    nights: boundedInteger(query.nights, 7, 1, 366),
    range: boundedInteger(query.range, 3, 0, 14),
  };
}

export const forestCitySourceState = {
  contract: "crays.forest-city.detail-room-booking-ui.v1",
  contractVersion: "1.1.0",
  state: "source_not_ready",
  httpStatus: 503,
  code: "FOREST_CITY_CANONICAL_ROOM_SOURCE_NOT_CONFIGURED",
  sourceReceiptAttached: false,
  expectedRoomSetAttached: false,
  matched: null,
  available: null,
  detail: null,
  rooms: null,
  rates: null,
  availability: null,
  admission: null,
  services: null,
  quote: null,
} as const;
