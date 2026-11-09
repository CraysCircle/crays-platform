import {isLocalizedPublicHotelPath} from "@/lib/member-commerce/hotel-public-locale-route";
import {readPublicHotelDraftUrl,publicHotelDraftUrl} from "@/lib/member-commerce/hotel-public-stay-history";

export const CLUBS_MEMBER_AUTH_CONTRACT_SCHEMA =
  "crays.clubs.member-auth-ui.v1" as const;
export const CLUBS_MEMBER_AUTH_CONTRACT_VERSION = "1.0.0" as const;

export type ClubsMemberAuthState =
  | "loading"
  | "signed_out"
  | "configuration_not_ready"
  | "provider_session_unreadable"
  | "invalid_session_provenance"
  | "identity_binding_required"
  | "core_unavailable"
  | "temporarily_unavailable"
  | "ready";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const SAFE_FRAGMENT = /^#[A-Za-z0-9_-]{1,80}$/;
const SAFE_PATHS = new Set([
  "/",
  "/account",
  "/account/continue",
  "/auth/clubs-tenant-session",
  "/auth/nostr-handoff",
  "/auth/provider-account",
  "/clubs/forest-city",
  "/en",
  "/en/account",
  "/en/clubs/search",
  "/en/hospitality/golf-hotel",
  "/en/hospitality/marina-hotel",
  "/en/search",
  "/search",
]);
const SAFE_LOCALE_ACCOUNT =
  /^\/(?:de|es|ca|fr|pt|it)\/account(?:\/ambassador)?$/;
const SAFE_QUERY_KEYS = new Set([
  "attribute",
  "attributes",
  "bathrooms",
  "bedrooms",
  "beds",
  "checkIn",
  "checkOut",
  "children",
  "collection",
  "date_from",
  "date_mode",
  "date_to",
  "destination",
  "filter",
  "filters",
  "flexible_month",
  "flexible_stay",
  "guests",
  "nights",
  "pets",
  "price_max",
  "price_min",
  "range",
  "returnTo",
  "return_to",
  "rooms",
  "sort",
  "type",
  "types",
  "view",
]);

const PUBLIC_PLAN_QUERY_KEYS = new Set([
  "stay_draft", "stay_step", "date_mode", "guests", "guest_selection",
  "children", "child_ages", "pets", "range", "date_from", "date_to",
  "calendar_months", "nights", "flexible_month", "room_type",
  "ambassador_slug", "payment_schedule",
]);
const PUBLIC_PLAN_MARKER_KEYS = ["stay_draft", "stay_step", "child_ages", "room_type", "ambassador_slug", "payment_schedule"];

/** Only the complete validated PUBLIC planning snapshot gets these keys.
 * It carries preferences, never Core identifiers or booking/payment rights. */
function publicPlanReturn(parsed: URL): {status: "none" | "invalid"} | {status: "valid"; href: string} {
  if (!PUBLIC_PLAN_MARKER_KEYS.some(key => parsed.searchParams.has(key))) return {status: "none"};
  const propertyId = isLocalizedPublicHotelPath(parsed.pathname, "property-clubs-forest-city-marina")
    ? "property-clubs-forest-city-marina"
    : isLocalizedPublicHotelPath(parsed.pathname, "property-clubs-forest-city-golf")
      ? "property-clubs-forest-city-golf" : null;
  if (!propertyId || parsed.hash && !SAFE_FRAGMENT.test(parsed.hash)) return {status: "invalid"};
  for (const [key, value] of parsed.searchParams) {
    if (!PUBLIC_PLAN_QUERY_KEYS.has(key) || parsed.searchParams.getAll(key).length !== 1 || value.length > 2048 || CONTROL_CHARACTERS.test(value) || value.includes("\\")) return {status: "invalid"};
  }
  const draft = readPublicHotelDraftUrl(parsed.href, propertyId);
  if (!draft) return {status: "invalid"};
  const href = publicHotelDraftUrl(parsed.href, draft);
  return href ? {status: "valid", href} : {status: "invalid"};
}

function allowedPath(pathname: string) {
  return SAFE_PATHS.has(pathname) || SAFE_LOCALE_ACCOUNT.test(pathname) ||
    /^\/(?:en|de|es|ca|fr|pt|it)\/(?:search|apply-directly)$/.test(pathname) ||
    isLocalizedPublicHotelPath(pathname, "property-clubs-forest-city-marina") || isLocalizedPublicHotelPath(pathname, "property-clubs-forest-city-golf") ||
    (process.env.NODE_ENV === "development" && pathname === "/en/member-preview");
}

function safeNestedReturn(value: string) {
  if (
    !value ||
    value.length > 2048 ||
    CONTROL_CHARACTERS.test(value) ||
    value.includes("\\")
  ) {
    return null;
  }
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const parsed = new URL(value, "https://clubs-return.invalid");
    if (
      parsed.origin !== "https://clubs-return.invalid" ||
      !allowedPath(parsed.pathname)
    )
      return null;
    const plan = publicPlanReturn(parsed);
    if (plan.status === "invalid") return null;
    if (plan.status === "valid") return plan.href;
    const sanitized = new URLSearchParams();
    for (const [key, raw] of parsed.searchParams) {
      if (
        !SAFE_QUERY_KEYS.has(key) ||
        key === "returnTo" ||
        key === "return_to" ||
        raw.length > 2048 ||
        CONTROL_CHARACTERS.test(raw)
      )
        continue;
      sanitized.append(key, raw);
    }
    const query = sanitized.toString();
    const fragment = SAFE_FRAGMENT.test(parsed.hash) ? parsed.hash : "";
    return `${parsed.pathname}${query ? `?${query}` : ""}${fragment}`;
  } catch {
    return null;
  }
}

export function sanitizeClubsReturnTo(
  value: unknown,
  fallback = "/en/account",
) {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 4096 ||
    CONTROL_CHARACTERS.test(value) ||
    value.includes("\\") ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://clubs-return.invalid");
    if (
      parsed.origin !== "https://clubs-return.invalid" ||
      !allowedPath(parsed.pathname)
    )
      return fallback;
    if (parsed.searchParams.getAll("returnTo").length > 1 || parsed.searchParams.getAll("return_to").length > 1 || parsed.searchParams.has("returnTo") && parsed.searchParams.has("return_to")) return fallback;
    const plan = publicPlanReturn(parsed);
    if (plan.status === "invalid") return fallback;
    if (plan.status === "valid") return plan.href;
    const sanitized = new URLSearchParams();
    for (const [key, raw] of parsed.searchParams) {
      if (
        !SAFE_QUERY_KEYS.has(key) ||
        raw.length > 2048 ||
        CONTROL_CHARACTERS.test(raw)
      )
        continue;
      if (key === "returnTo" || key === "return_to") {
        const nested = safeNestedReturn(raw);
        if (nested) sanitized.append(key, nested);
        continue;
      }
      sanitized.append(key, raw);
    }
    const query = sanitized.toString();
    const fragment = SAFE_FRAGMENT.test(parsed.hash) ? parsed.hash : "";
    return `${parsed.pathname}${query ? `?${query}` : ""}${fragment}`;
  } catch {
    return fallback;
  }
}

export function buildClubsLoginHref(returnTo: unknown) {
  const safeReturnTo = sanitizeClubsReturnTo(returnTo);
  return `/auth/login?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function buildClubsSignupHref(returnTo: unknown) {
  const safeReturnTo = sanitizeClubsReturnTo(returnTo);
  return `/auth/login?screen_hint=signup&returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function buildClubsLogoutHref(returnTo: unknown = "/en") {
  const safeReturnTo = sanitizeClubsReturnTo(returnTo, "/en");
  return `/auth/logout?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function getClubsMemberAuthUiContract() {
  return Object.freeze({
    schema: CLUBS_MEMBER_AUTH_CONTRACT_SCHEMA,
    version: CLUBS_MEMBER_AUTH_CONTRACT_VERSION,
    routes: Object.freeze({
      login: "/auth/login",
      signup: "/auth/login?screen_hint=signup",
      callback: "/auth/callback",
      logout: "/auth/logout",
      profile: "/auth/profile",
      account: "/en/account",
      session: "/api/crays/clubs/member/session",
      state: "/api/crays/clubs/member/state",
      provisioning: "/api/crays/auth/provider/account",
      contract: "/api/crays/clubs/member/auth-contract",
    }),
    states: Object.freeze({
      loading: Object.freeze({
        httpStatus: null,
        actionEnabled: false,
        visible: "Loading secure member context...",
      }),
      signed_out: Object.freeze({
        httpStatus: 401,
        actionEnabled: true,
        visible: "Sign in or create an account to continue.",
      }),
      configuration_not_ready: Object.freeze({
        httpStatus: 503,
        actionEnabled: false,
        visible: "Secure sign-in is not available yet.",
      }),
      provider_session_unreadable: Object.freeze({
        httpStatus: 503,
        actionEnabled: false,
        visible: "Secure session unavailable. Please try again.",
      }),
      invalid_session_provenance: Object.freeze({
        httpStatus: 401,
        actionEnabled: false,
        visible: "This sign-in session cannot be used for CRAYS Clubs.",
      }),
      identity_binding_required: Object.freeze({
        httpStatus: 409,
        actionEnabled: true,
        visible: "Complete your CRAYS guest account before continuing.",
      }),
      core_unavailable: Object.freeze({
        httpStatus: 503,
        actionEnabled: false,
        visible: "Your CRAYS account cannot be loaded right now.",
      }),
      temporarily_unavailable: Object.freeze({
        httpStatus: 503,
        actionEnabled: false,
        visible: "This service is temporarily unavailable.",
      }),
      ready: Object.freeze({
        httpStatus: 200,
        actionEnabled: true,
        visible: "Secure member context ready.",
      }),
    } satisfies Record<
      ClubsMemberAuthState,
      Readonly<{
        httpStatus: number | null;
        actionEnabled: boolean;
        visible: string;
      }>
    >),
    identity: Object.freeze({
      provider: "auth0",
      mappingKey: "normalized issuer + provider subject",
      clientGate:
        "The server-selected CRAYS Clubs Auth0 client must validate the session before mapping.",
      initialRole: "guest",
      initialStatus: "review",
      bookingAuthorityOnProvision: false,
    }),
    returnTo: Object.freeze({
      relativeOnly: true,
      maximumLength: 4096,
      unknownPathsFallBackTo: "/en/account",
      queryAllowlist: Object.freeze([...SAFE_QUERY_KEYS]),
      publicHotelPlanQueryAllowlist: Object.freeze([...PUBLIC_PLAN_QUERY_KEYS]),
      publicHotelPlanRequiresCompleteValidatedSnapshot: true,
    }),
    rules: Object.freeze([
      "Use normal anchor navigation for Auth0 login, signup and logout routes.",
      "Never accept an absolute, protocol-relative, backslash or control-character return target.",
      "A provider session is not a CRAYS account and never grants booking authority by itself.",
      "Guest account provisioning creates review state only; Save, Cart and Booking Request remain separately gated.",
      "No price, availability, quote, deposit, security hold, service or booking success may be inferred from authentication.",
      "No provider secret, token, authorization code, state or raw provider subject is returned by these UI endpoints.",
    ]),
  });
}
