"use client";

export const CLUBS_MEMBER_STAYS_RETURN_TO =
  "/en/account?view=booking-requests" as const;

export const CLUBS_MEMBER_STAYS_CLIENT_CONTRACT = Object.freeze({
  schema: "crays.clubs.member-stays-client.v1",
  version: "1.0.0",
  cache: "no-store",
  credentials: "same-origin",
  endpoints: {
    bookingRequests: "/api/crays/clubs/member/booking-requests",
    quotes: "/api/crays/clubs/member/quotes",
    holds: "/api/crays/clubs/member/holds",
    bookings: "/api/crays/clubs/member/bookings",
  },
  operations: {
    read: true,
    mutation: false,
  },
  authoritySeparation: {
    exposesInternalIds: false,
    exposesPersonallyIdentifiableInformation: false,
    exposesAmounts: false,
    paymentAuthority: false,
    providerAuthority: false,
    productionAuthority: false,
  },
} as const);

export type ClubsMemberStayProperty = "golf" | "marina";
export type ClubsMemberStayUnit = "night" | "week" | "month";
export type ClubsMemberStayState =
  | "submitted"
  | "in_review"
  | "accepted"
  | "confirmed_internal"
  | "rejected"
  | "cancelled"
  | "released"
  | "reconcile_required";

export type ClubsMemberRequestLifecycle =
  | "submitted"
  | "in_review"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "not_available"
  | "reconcile_required";
export type ClubsMemberQuoteLifecycle =
  | "active"
  | "accepted"
  | "expired"
  | "not_available"
  | "reconcile_required";
export type ClubsMemberHoldLifecycle =
  | "active"
  | "expired"
  | "released"
  | "converted"
  | "not_available"
  | "reconcile_required";
export type ClubsMemberBookingLifecycle =
  | "confirmed"
  | "change_requested"
  | "in_stay"
  | "completed"
  | "cancelled"
  | "no_show"
  | "not_available"
  | "reconcile_required";
export type ClubsMemberReservationLifecycle =
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "not_available"
  | "reconcile_required";
export type ClubsMemberStayLifecycle =
  | "not_started"
  | "ready_for_check_in"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show"
  | "not_available"
  | "reconcile_required";
export type ClubsMemberStayExpiry =
  | "active"
  | "expired"
  | "released"
  | "converted"
  | "not_available"
  | "reconcile_required";

export type ClubsMemberStayRecord = Readonly<{
  publicReference: string;
  bookingReference: string | null;
  property: ClubsMemberStayProperty;
  propertyLabel: string;
  stayUnit: ClubsMemberStayUnit;
  arrivalDate: string;
  departureDate: string;
  adults: number;
  requestedCapacity: number | null;
  state: ClubsMemberStayState;
  requestLifecycle: ClubsMemberRequestLifecycle;
  quoteLifecycle: ClubsMemberQuoteLifecycle;
  holdLifecycle: ClubsMemberHoldLifecycle;
  bookingLifecycle: ClubsMemberBookingLifecycle;
  reservationLifecycle: ClubsMemberReservationLifecycle;
  stayLifecycle: ClubsMemberStayLifecycle;
  holdExpiresAt: string | null;
  expiryStatus: ClubsMemberStayExpiry;
  updatedAt: string;
}>;

export type ClubsMemberStaysReadResult =
  | Readonly<{ kind: "signed_out"; loginHref: string }>
  | Readonly<{
      kind: "ready";
      records: readonly ClubsMemberStayRecord[];
    }>
  | Readonly<{
      kind: "reconcile_required";
      records: readonly ClubsMemberStayRecord[];
      reason: "read_unavailable" | "contract_mismatch";
    }>;

export type ClubsMemberStaysFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type JsonRecord = Record<string, unknown>;

type RawBookingRequest = Readonly<{
  bookingRequestId: string;
  publicReference: string;
  propertyId: PropertyId;
  unitId: string;
  quoteId: string;
  holdId: string;
  status: "submitted" | "under_review" | "accepted" | "rejected" | "cancelled";
  updatedAt: string;
  holdStatus: "active" | "expired" | "released" | "converted";
  holdExpiresAt: string;
  holdIsExpired: boolean;
}>;

type RawQuote = Readonly<{
  quoteId: string;
  publicReference: string;
  propertyId: PropertyId;
  unitId: string;
  arrivalDate: string;
  departureDate: string;
  guestCount: number;
  requestedCapacity: number;
  nights: number;
  expiresAt: string;
  status: "active" | "accepted" | "expired";
  acceptedAt: string | null;
  holdId: string | null;
}>;

type RawHold = Readonly<{
  holdId: string;
  propertyId: PropertyId;
  unitId: string;
  arrivalDate: string;
  departureDate: string;
  reservedCapacity: number;
  status: "active" | "expired" | "released" | "converted";
  expiresAt: string;
}>;

type RawBooking = Readonly<{
  bookingId: string;
  publicReference: string;
  status:
    | "confirmed"
    | "change_requested"
    | "in_stay"
    | "completed"
    | "cancelled"
    | "no_show";
  propertyId: PropertyId;
  unitId: string;
  arrivalDate: string;
  departureDate: string;
  reservationStatus: "confirmed" | "completed" | "cancelled" | "no_show";
  stayId: string;
  stayStatus:
    | "not_started"
    | "ready_for_check_in"
    | "checked_in"
    | "checked_out"
    | "cancelled"
    | "no_show";
  guestCount: number;
}>;

type PropertyId =
  | "property-clubs-forest-city-golf"
  | "property-clubs-forest-city-marina";

type EndpointEnvelope = Readonly<{
  status: string;
  httpStatus: number;
  ok: boolean;
  payload: JsonRecord;
}>;

const propertyIds = new Set<PropertyId>([
  "property-clubs-forest-city-golf",
  "property-clubs-forest-city-marina",
]);
const requestStatuses = new Set<RawBookingRequest["status"]>([
  "submitted",
  "under_review",
  "accepted",
  "rejected",
  "cancelled",
]);
const quoteStatuses = new Set<RawQuote["status"]>([
  "active",
  "accepted",
  "expired",
]);
const holdStatuses = new Set<RawHold["status"]>([
  "active",
  "expired",
  "released",
  "converted",
]);
const bookingStatuses = new Set<RawBooking["status"]>([
  "confirmed",
  "change_requested",
  "in_stay",
  "completed",
  "cancelled",
  "no_show",
]);
const reservationStatuses = new Set<RawBooking["reservationStatus"]>([
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);
const stayStatuses = new Set<RawBooking["stayStatus"]>([
  "not_started",
  "ready_for_check_in",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
]);
const identifier = /^[A-Za-z0-9:_.-]{3,180}$/;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const authorityClaimKeys = new Set([
  "paymentAuthority",
  "providerAuthority",
  "productionAuthority",
  "providerCalled",
  "providerSuccessClaimed",
]);

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && identifier.test(value);
}

function isPublicReference(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 3 &&
    value.length <= 180 &&
    !/[\u0000-\u001f]/.test(value)
  );
}

function isPropertyId(value: unknown): value is PropertyId {
  return typeof value === "string" && propertyIds.has(value as PropertyId);
}

function isDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    isoDate.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
  );
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isNullableTimestamp(value: unknown): value is string | null {
  return value === null || isTimestamp(value);
}

function containsPositiveAuthorityClaim(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsPositiveAuthorityClaim);
  }
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      (authorityClaimKeys.has(key) && nested === true) ||
      containsPositiveAuthorityClaim(nested),
  );
}

function parseRequest(value: unknown): RawBookingRequest | null {
  if (!isRecord(value)) return null;
  if (
    !isIdentifier(value.bookingRequestId) ||
    !isPublicReference(value.publicReference) ||
    !isPropertyId(value.propertyId) ||
    !isIdentifier(value.unitId) ||
    !isIdentifier(value.quoteId) ||
    !isIdentifier(value.holdId) ||
    typeof value.status !== "string" ||
    !requestStatuses.has(value.status as RawBookingRequest["status"]) ||
    !isTimestamp(value.updatedAt) ||
    typeof value.holdStatus !== "string" ||
    !holdStatuses.has(value.holdStatus as RawHold["status"]) ||
    !isTimestamp(value.holdExpiresAt) ||
    typeof value.holdIsExpired !== "boolean"
  ) {
    return null;
  }
  return {
    bookingRequestId: value.bookingRequestId,
    publicReference: value.publicReference,
    propertyId: value.propertyId,
    unitId: value.unitId,
    quoteId: value.quoteId,
    holdId: value.holdId,
    status: value.status as RawBookingRequest["status"],
    updatedAt: value.updatedAt,
    holdStatus: value.holdStatus as RawBookingRequest["holdStatus"],
    holdExpiresAt: value.holdExpiresAt,
    holdIsExpired: value.holdIsExpired,
  };
}

function parseQuote(value: unknown): RawQuote | null {
  if (!isRecord(value)) return null;
  if (
    !isIdentifier(value.quoteId) ||
    !isPublicReference(value.publicReference) ||
    !isPropertyId(value.propertyId) ||
    !isIdentifier(value.unitId) ||
    !isDate(value.arrivalDate) ||
    !isDate(value.departureDate) ||
    !isPositiveInteger(value.guestCount) ||
    !isPositiveInteger(value.requestedCapacity) ||
    !isPositiveInteger(value.nights) ||
    !isTimestamp(value.expiresAt) ||
    typeof value.status !== "string" ||
    !quoteStatuses.has(value.status as RawQuote["status"]) ||
    !isNullableTimestamp(value.acceptedAt) ||
    !(value.holdId === null || isIdentifier(value.holdId))
  ) {
    return null;
  }
  return {
    quoteId: value.quoteId,
    publicReference: value.publicReference,
    propertyId: value.propertyId,
    unitId: value.unitId,
    arrivalDate: value.arrivalDate,
    departureDate: value.departureDate,
    guestCount: value.guestCount,
    requestedCapacity: value.requestedCapacity,
    nights: value.nights,
    expiresAt: value.expiresAt,
    status: value.status as RawQuote["status"],
    acceptedAt: value.acceptedAt,
    holdId: value.holdId,
  };
}

function parseHold(value: unknown): RawHold | null {
  if (!isRecord(value)) return null;
  if (
    !isIdentifier(value.holdId) ||
    !isPropertyId(value.propertyId) ||
    !isIdentifier(value.unitId) ||
    !isDate(value.arrivalDate) ||
    !isDate(value.departureDate) ||
    !isPositiveInteger(value.reservedCapacity) ||
    typeof value.status !== "string" ||
    !holdStatuses.has(value.status as RawHold["status"]) ||
    !isTimestamp(value.expiresAt)
  ) {
    return null;
  }
  return {
    holdId: value.holdId,
    propertyId: value.propertyId,
    unitId: value.unitId,
    arrivalDate: value.arrivalDate,
    departureDate: value.departureDate,
    reservedCapacity: value.reservedCapacity,
    status: value.status as RawHold["status"],
    expiresAt: value.expiresAt,
  };
}

function parseBooking(value: unknown): RawBooking | null {
  if (!isRecord(value)) return null;
  if (
    !isIdentifier(value.bookingId) ||
    !isPublicReference(value.publicReference) ||
    typeof value.status !== "string" ||
    !bookingStatuses.has(value.status as RawBooking["status"]) ||
    !isPropertyId(value.propertyId) ||
    !isIdentifier(value.unitId) ||
    !isDate(value.arrivalDate) ||
    !isDate(value.departureDate) ||
    typeof value.reservationStatus !== "string" ||
    !reservationStatuses.has(
      value.reservationStatus as RawBooking["reservationStatus"],
    ) ||
    !isIdentifier(value.stayId) ||
    typeof value.stayStatus !== "string" ||
    !stayStatuses.has(value.stayStatus as RawBooking["stayStatus"]) ||
    !isPositiveInteger(value.guestCount)
  ) {
    return null;
  }
  return {
    bookingId: value.bookingId,
    publicReference: value.publicReference,
    status: value.status as RawBooking["status"],
    propertyId: value.propertyId,
    unitId: value.unitId,
    arrivalDate: value.arrivalDate,
    departureDate: value.departureDate,
    reservationStatus: value.reservationStatus as RawBooking["reservationStatus"],
    stayId: value.stayId,
    stayStatus: value.stayStatus as RawBooking["stayStatus"],
    guestCount: value.guestCount,
  };
}

function parseList<T>(value: unknown, parser: (item: unknown) => T | null) {
  if (!Array.isArray(value)) return null;
  const parsed = value.map(parser);
  return parsed.every((item): item is T => item !== null) ? parsed : null;
}

function readInit(signal?: AbortSignal): RequestInit {
  return {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    headers: { accept: "application/json" },
    signal,
  };
}

async function readEndpoint(
  fetcher: ClubsMemberStaysFetch,
  endpoint: string,
  signal?: AbortSignal,
): Promise<EndpointEnvelope> {
  if (!endpoint.startsWith("/api/crays/clubs/member/") || endpoint.startsWith("//")) {
    throw new Error("invalid_endpoint");
  }
  const response = await fetcher(endpoint, readInit(signal));
  if (!response.headers.get("cache-control")?.toLowerCase().includes("no-store")) {
    throw new Error("cache_contract_violation");
  }
  if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new Error("non_json_response");
  }
  const payload = await response.json().catch(() => null);
  if (
    !isRecord(payload) ||
    typeof payload.status !== "string" ||
    payload.status.length === 0 ||
    containsPositiveAuthorityClaim(payload)
  ) {
    throw new Error("invalid_response");
  }
  return {
    status: payload.status,
    httpStatus: response.status,
    ok: response.ok,
    payload,
  };
}

export function sanitizeClubsMemberStaysReturnTo(value?: string | null) {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 2_048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f]/.test(value)
  ) {
    return CLUBS_MEMBER_STAYS_RETURN_TO;
  }
  const base = "https://clubs-member-stays.invalid";
  const parsed = new URL(value, base);
  if (
    parsed.origin !== base ||
    parsed.pathname !== "/en/account" ||
    parsed.hash ||
    parsed.searchParams.size !== 1 ||
    parsed.searchParams.get("view") !== "booking-requests"
  ) {
    return CLUBS_MEMBER_STAYS_RETURN_TO;
  }
  return CLUBS_MEMBER_STAYS_RETURN_TO;
}

export function buildClubsMemberStaysLoginHref(value?: string | null) {
  const returnTo = sanitizeClubsMemberStaysReturnTo(value);
  return `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function propertyProjection(propertyId: PropertyId) {
  return propertyId === "property-clubs-forest-city-golf"
    ? ({ property: "golf", propertyLabel: "Forest City Golf Hotel" } as const)
    : ({ property: "marina", propertyLabel: "Forest City Marina Hotel" } as const);
}

function stayUnitFor(
  propertyId: PropertyId,
  nights: number,
): ClubsMemberStayUnit | null {
  if (propertyId === "property-clubs-forest-city-marina") {
    return nights === 30 ? "month" : null;
  }
  if (nights === 7) return "week";
  return nights >= 1 && nights <= 30 ? "night" : null;
}

function lifecycleKey(input: {
  propertyId: PropertyId;
  unitId: string;
  arrivalDate: string;
  departureDate: string;
}) {
  return [input.propertyId, input.unitId, input.arrivalDate, input.departureDate].join("|");
}

function requestLifecycle(
  status: RawBookingRequest["status"],
): ClubsMemberRequestLifecycle {
  return status === "under_review" ? "in_review" : status;
}

function expiryStatus(
  request: RawBookingRequest,
  hold: RawHold,
): ClubsMemberStayExpiry {
  if (hold.status === "released") return "released";
  if (hold.status === "converted") return "converted";
  if (hold.status === "expired" || request.holdIsExpired) return "expired";
  return "active";
}

function hasDuplicate<T>(items: readonly T[], key: (item: T) => string) {
  const seen = new Set<string>();
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) return true;
    seen.add(value);
  }
  return false;
}

function bookingLifecycleIsConsistent(booking: RawBooking) {
  const bookingTerminal = booking.status === "cancelled" || booking.status === "no_show";
  const reservationTerminal =
    booking.reservationStatus === "cancelled" ||
    booking.reservationStatus === "no_show";
  const stayTerminal =
    booking.stayStatus === "cancelled" || booking.stayStatus === "no_show";
  if (bookingTerminal) {
    return reservationTerminal && stayTerminal;
  }
  return !reservationTerminal && !stayTerminal;
}

function projectRecords(input: {
  requests: readonly RawBookingRequest[];
  quotes: readonly RawQuote[];
  holds: readonly RawHold[];
  bookings: readonly RawBooking[];
}) {
  const duplicateSourceIdentity =
    hasDuplicate(input.requests, (request) => request.bookingRequestId) ||
    hasDuplicate(input.quotes, (quote) => quote.quoteId) ||
    hasDuplicate(input.holds, (hold) => hold.holdId) ||
    hasDuplicate(input.bookings, (booking) => booking.bookingId);
  const quoteById = new Map(input.quotes.map((quote) => [quote.quoteId, quote]));
  const holdById = new Map(input.holds.map((hold) => [hold.holdId, hold]));
  const bookingsByKey = new Map<string, RawBooking[]>();
  for (const booking of input.bookings) {
    const key = lifecycleKey(booking);
    bookingsByKey.set(key, [...(bookingsByKey.get(key) ?? []), booking]);
  }
  const requestKeyCounts = new Map<string, number>();
  for (const request of input.requests) {
    const quote = quoteById.get(request.quoteId);
    if (!quote) continue;
    const key = lifecycleKey(quote);
    requestKeyCounts.set(key, (requestKeyCounts.get(key) ?? 0) + 1);
  }

  let contractMismatch = duplicateSourceIdentity;
  const matchedBookingIds = new Set<string>();
  const records: ClubsMemberStayRecord[] = [];

  for (const request of input.requests) {
    const quote = quoteById.get(request.quoteId);
    const hold = holdById.get(request.holdId);
    if (!quote || !hold) {
      contractMismatch = true;
      continue;
    }
    const stayUnit = stayUnitFor(quote.propertyId, quote.nights);
    const key = lifecycleKey(quote);
    const bookingCandidates = bookingsByKey.get(key) ?? [];
    const booking = bookingCandidates.length === 1 ? bookingCandidates[0] : null;
    const requestState = requestLifecycle(request.status);
    const expiry = expiryStatus(request, hold);
    const mismatched =
      !stayUnit ||
      request.propertyId !== quote.propertyId ||
      request.unitId !== quote.unitId ||
      hold.propertyId !== quote.propertyId ||
      hold.unitId !== quote.unitId ||
      hold.arrivalDate !== quote.arrivalDate ||
      hold.departureDate !== quote.departureDate ||
      hold.reservedCapacity !== quote.requestedCapacity ||
      quote.guestCount > quote.requestedCapacity ||
      quote.status !== "accepted" ||
      !quote.acceptedAt ||
      quote.holdId !== request.holdId ||
      request.holdStatus !== hold.status ||
      request.holdExpiresAt !== hold.expiresAt ||
      bookingCandidates.length > 1 ||
      (requestKeyCounts.get(key) ?? 0) > 1 ||
      Boolean(booking && request.status !== "accepted") ||
      Boolean(booking && booking.guestCount !== quote.guestCount) ||
      Boolean(booking && !bookingLifecycleIsConsistent(booking));

    if (booking) matchedBookingIds.add(booking.bookingId);
    if (mismatched) contractMismatch = true;

    let state: ClubsMemberStayState;
    if (mismatched) {
      state = "reconcile_required";
    } else if (request.status === "rejected") {
      state = "rejected";
    } else if (request.status === "cancelled") {
      state = "cancelled";
    } else if (booking?.status === "cancelled" || booking?.status === "no_show") {
      state = "cancelled";
    } else if (booking) {
      state = "confirmed_internal";
    } else if (expiry === "released" || expiry === "expired") {
      state = "released";
    } else if (request.status === "accepted") {
      state = "accepted";
    } else if (request.status === "under_review") {
      state = "in_review";
    } else {
      state = "submitted";
    }

    const property = propertyProjection(quote.propertyId);
    records.push(
      Object.freeze({
        publicReference: request.publicReference,
        bookingReference: booking?.publicReference ?? null,
        ...property,
        stayUnit: stayUnit ?? "night",
        arrivalDate: quote.arrivalDate,
        departureDate: quote.departureDate,
        adults: quote.guestCount,
        requestedCapacity: quote.requestedCapacity,
        state,
        requestLifecycle: mismatched ? "reconcile_required" : requestState,
        quoteLifecycle: mismatched ? "reconcile_required" : quote.status,
        holdLifecycle: mismatched ? "reconcile_required" : hold.status,
        bookingLifecycle: mismatched
          ? "reconcile_required"
          : (booking?.status ?? "not_available"),
        reservationLifecycle: mismatched
          ? "reconcile_required"
          : (booking?.reservationStatus ?? "not_available"),
        stayLifecycle: mismatched
          ? "reconcile_required"
          : (booking?.stayStatus ?? "not_available"),
        holdExpiresAt: hold.expiresAt,
        expiryStatus: mismatched ? "reconcile_required" : expiry,
        updatedAt: request.updatedAt,
      }),
    );
  }

  for (const booking of input.bookings) {
    if (matchedBookingIds.has(booking.bookingId)) continue;
    contractMismatch = true;
    const nights =
      (Date.parse(`${booking.departureDate}T00:00:00.000Z`) -
        Date.parse(`${booking.arrivalDate}T00:00:00.000Z`)) /
      86_400_000;
    const stayUnit = stayUnitFor(booking.propertyId, nights);
    const property = propertyProjection(booking.propertyId);
    records.push(
      Object.freeze({
        publicReference: booking.publicReference,
        bookingReference: booking.publicReference,
        ...property,
        stayUnit: stayUnit ?? "night",
        arrivalDate: booking.arrivalDate,
        departureDate: booking.departureDate,
        adults: booking.guestCount,
        requestedCapacity: null,
        state: "reconcile_required",
        requestLifecycle: "reconcile_required",
        quoteLifecycle: "not_available",
        holdLifecycle: "not_available",
        bookingLifecycle: "reconcile_required",
        reservationLifecycle: "reconcile_required",
        stayLifecycle: "reconcile_required",
        holdExpiresAt: null,
        expiryStatus: "not_available",
        updatedAt: `${booking.arrivalDate}T00:00:00.000Z`,
      }),
    );
  }

  records.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return { records: Object.freeze(records), contractMismatch };
}

export function createClubsMemberStaysClient(
  options: Readonly<{ fetch?: ClubsMemberStaysFetch }> = {},
) {
  const fetcher = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init));
  const endpoints = CLUBS_MEMBER_STAYS_CLIENT_CONTRACT.endpoints;

  return Object.freeze({
    async read(input: Readonly<{ returnTo?: string | null; signal?: AbortSignal }> = {}): Promise<ClubsMemberStaysReadResult> {
      const loginHref = buildClubsMemberStaysLoginHref(input.returnTo);
      let envelopes: readonly EndpointEnvelope[];
      try {
        envelopes = await Promise.all([
          readEndpoint(fetcher, endpoints.bookingRequests, input.signal),
          readEndpoint(fetcher, endpoints.quotes, input.signal),
          readEndpoint(fetcher, endpoints.holds, input.signal),
          readEndpoint(fetcher, endpoints.bookings, input.signal),
        ]);
      } catch {
        return Object.freeze({
          kind: "reconcile_required",
          records: Object.freeze([]),
          reason: "read_unavailable",
        });
      }

      if (
        envelopes.some(
          (envelope) =>
            envelope.httpStatus === 401 ||
            envelope.status === "authentication_required" ||
            envelope.status === "signed_out",
        )
      ) {
        return Object.freeze({ kind: "signed_out", loginHref });
      }
      if (envelopes.some((envelope) => !envelope.ok || envelope.status !== "ready")) {
        return Object.freeze({
          kind: "reconcile_required",
          records: Object.freeze([]),
          reason: "read_unavailable",
        });
      }

      const requests = parseList(envelopes[0]?.payload.requests, parseRequest);
      const quotes = parseList(envelopes[1]?.payload.quotes, parseQuote);
      const holds = parseList(envelopes[2]?.payload.holds, parseHold);
      const bookings = parseList(envelopes[3]?.payload.bookings, parseBooking);
      if (!requests || !quotes || !holds || !bookings) {
        return Object.freeze({
          kind: "reconcile_required",
          records: Object.freeze([]),
          reason: "contract_mismatch",
        });
      }
      const projected = projectRecords({ requests, quotes, holds, bookings });
      if (projected.contractMismatch) {
        return Object.freeze({
          kind: "reconcile_required",
          records: projected.records,
          reason: "contract_mismatch",
        });
      }
      return Object.freeze({ kind: "ready", records: projected.records });
    },
  });
}
