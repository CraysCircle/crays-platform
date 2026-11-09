"use client";

export const CLUBS_MEMBER_BOOKING_CLIENT_CONTRACT = Object.freeze({
  schema: "crays.clubs.member-booking-client.v1",
  version: "1.2.0",
  cache: "no-store",
  credentials: "same-origin",
  endpoints: {
    eligibilityTemplate:
      "/api/crays/clubs/member/properties/{propertyId}/eligibility",
    stayStep4: "/api/crays/clubs/member/stay-step4",
    quotes: "/api/crays/clubs/member/quotes",
    holds: "/api/crays/clubs/member/holds",
    bookingRequests: "/api/crays/clubs/member/booking-requests",
    bookings: "/api/crays/clubs/member/bookings",
  },
  sequence: [
    "eligibility",
    "stay-step4",
    "quotes",
    "holds",
    "booking-requests",
    "booking-lifecycle",
    "status-reconcile",
  ],
  idempotency: {
    header: "Idempotency-Key",
    minimumLength: 16,
    maximumLength: 200,
    payloadDriftStatus: 409,
    unknownOutcomeStatus: 503,
    reconcileBeforeRetry: true,
    retryWithSameKeyAndPayloadOnly: true,
    automaticMutationRetry: false,
  },
  authoritySeparation: {
    browserSuppliesAmounts: false,
    browserSuppliesCurrency: false,
    browserSuppliesSellerAccount: false,
    paymentAuthority: false,
    providerAuthority: false,
    productionAuthority: false,
  },
} as const);

export type ClubsMemberBookingPropertyId =
  | "property-clubs-forest-city-golf"
  | "property-clubs-forest-city-marina";
export type ClubsMemberBookingStayUnit = "night" | "week" | "month";
export type ClubsMemberBookingReconcileScope =
  | "quotes"
  | "holds"
  | "booking-requests"
  | "bookings";

type AuthorityBoundary = Readonly<{
  availabilityAuthority?: false;
  bookingAuthority?: false;
  paymentAuthority?: false;
  providerAuthority?: false;
  productionAuthority?: false;
  providerCalled?: false;
  providerSuccessClaimed?: false;
}>;

export type ClubsMemberBookingEligibilityPayload = AuthorityBoundary &
  Readonly<{
    schema?: string;
    version?: string;
    status: string;
    propertyId?: ClubsMemberBookingPropertyId;
    allowedStayUnits?: readonly ClubsMemberBookingStayUnit[];
    membershipRequired?: boolean;
    propertyAdmissionRequired?: boolean;
  }>;

export type ClubsMemberBookingStayOfferPayload = AuthorityBoundary &
  Readonly<{
    schema: "crays.clubs.member-stay-step4.v1";
    version: "1.1.0";
    status: string;
    source?: "canonical_database_only";
    publicQloInferred?: false;
    propertyId?: ClubsMemberBookingPropertyId;
    stayUnit?: ClubsMemberBookingStayUnit;
    arrivalDate?: string;
    departureDate?: string;
    nights?: number;
    unitId?: string;
    ratePlanId?: string;
    ratePlanVersionId?: string;
    currency?: string;
    offerSha256?: string;
    sellerRoutingSha256?: string;
    returnTo?: string;
  }>;

export type ClubsMemberBookingQuoteLine = Readonly<{
  order: number;
  type: "accommodation" | "tax" | "fee" | "deposit";
  serviceDate: string | null;
  label: string;
  quantity: number;
  unitAmountMinor: string;
  lineTotalMinor: string;
  includedInTotal: boolean;
}>;

export type ClubsMemberBookingQuote = Readonly<{
  quoteId: string;
  publicReference: string;
  propertyId: ClubsMemberBookingPropertyId;
  unitId: string;
  ratePlanId: string;
  arrivalDate: string;
  departureDate: string;
  guestCount: number;
  requestedCapacity: number;
  nights: number;
  currency: string;
  accommodationSubtotalMinor: string;
  inclusiveTaxMinor: string;
  exclusiveTaxMinor: string;
  mandatoryFeeMinor: string;
  totalMinor: string;
  depositDueMinor: string;
  pricingSnapshotSha256: string;
  lines: readonly ClubsMemberBookingQuoteLine[];
  issuedAt: string;
  expiresAt: string;
  status: "active" | "accepted" | "expired";
  acceptedAt: string | null;
  holdId: string | null;
}>;

export type ClubsMemberBookingHold = Readonly<{
  holdId: string;
  propertyId: ClubsMemberBookingPropertyId;
  unitId: string;
  arrivalDate: string;
  departureDate: string;
  reservedCapacity: number;
  status: "active" | "released" | "expired" | "converted";
  version: number;
  expiresAt: string;
  maximumExpiresAt: string;
}>;

export type ClubsMemberBookingRequest = Readonly<{
  bookingRequestId: string;
  publicReference: string;
  propertyId: ClubsMemberBookingPropertyId;
  unitId: string;
  quoteId: string;
  holdId: string;
  status:
    | "submitted"
    | "under_review"
    | "accepted"
    | "rejected"
    | "cancelled";
  version: number;
  submittedAt: string;
  updatedAt: string;
  holdStatus: string;
  holdExpiresAt: string;
  holdIsExpired: boolean;
  currency: string;
  totalMinor: string;
  reservationStatus: null;
  bookingStatus: null;
  paymentStatus: null;
}>;

export type ClubsMemberBookingRequestCancellationInput = Readonly<{
  requestId: string;
  expectedVersion: number;
  currentStatus: "submitted" | "under_review";
  reason: string;
}>;

export type ClubsMemberBookingChangeRequest = Readonly<{
  changeRequestId: string;
  changeType: "dates" | "guest_assignment" | "cancellation" | "other";
  status: "submitted" | "under_review" | "approved" | "rejected" | "cancelled";
  version: number;
  updatedAt: string;
  decidedAt: string | null;
}>;

export type ClubsMemberBookingLifecycle = Readonly<{
  bookingId: string;
  publicReference: string;
  status:
    | "confirmed"
    | "change_requested"
    | "in_stay"
    | "completed"
    | "cancelled"
    | "no_show";
  version: number;
  propertyId: ClubsMemberBookingPropertyId;
  unitId: string;
  arrivalDate: string;
  departureDate: string;
  reservationStatus: string;
  stayId: string;
  stayStatus: string;
  stayVersion: number;
  guestCount: number;
  assignedGuestCount: number;
  changeRequests: readonly ClubsMemberBookingChangeRequest[];
}>;

export type ClubsMemberBookingChangeSubmissionInput = Readonly<{
  bookingId: string;
  expectedVersion: number;
  currentStatus: "confirmed";
  changeType: ClubsMemberBookingChangeRequest["changeType"];
  requestedChange: Readonly<Record<string, unknown>>;
}>;

export type ClubsMemberBookingChangeCancellationInput = Readonly<{
  changeRequestId: string;
  expectedVersion: number;
  currentStatus: "submitted" | "under_review";
  reason: string;
}>;

export type ClubsMemberBookingQuoteReceipt = Readonly<{
  outcome: "issued" | "conflict" | "denied" | "invalid";
  reason: string | null;
  quoteId: string | null;
  publicReference: string | null;
  pricingSnapshotSha256: string | null;
  totalMinor: string | null;
  currency: string | null;
  expiresAt: string | null;
  replayed: boolean;
}>;

export type ClubsMemberBookingHoldReceipt = Readonly<{
  outcome: "applied" | "conflict" | "denied" | "invalid" | "noop";
  replayed: boolean;
  reason: string | null;
  holdId: string | null;
  previousVersion: number | null;
  resultingVersion: number | null;
  resultingStatus: "active" | "released" | "expired" | "converted" | null;
  expiresAt: string | null;
  capacityDelta: number;
}>;

export type ClubsMemberBookingRequestReceipt = Readonly<{
  outcome: "applied" | "conflict" | "denied" | "invalid" | "noop";
  reason: string | null;
  bookingRequestId: string | null;
  previousVersion: number | null;
  resultingVersion: number | null;
  resultingStatus: ClubsMemberBookingRequest["status"] | null;
  replayed: boolean;
}>;

type StatusPayload = AuthorityBoundary & Readonly<{ status: string }>;
export type ClubsMemberBookingQuotesPayload = StatusPayload &
  Readonly<{ quotes?: readonly ClubsMemberBookingQuote[] }>;
export type ClubsMemberBookingHoldsPayload = StatusPayload &
  Readonly<{ holds?: readonly ClubsMemberBookingHold[] }>;
export type ClubsMemberBookingRequestsPayload = StatusPayload &
  Readonly<{ requests?: readonly ClubsMemberBookingRequest[] }>;
export type ClubsMemberBookingQuoteMutationPayload = StatusPayload &
  Readonly<{ receipt?: ClubsMemberBookingQuoteReceipt }>;
export type ClubsMemberBookingHoldMutationPayload = StatusPayload &
  Readonly<{ receipt?: ClubsMemberBookingHoldReceipt }>;
export type ClubsMemberBookingRequestMutationPayload = StatusPayload &
  Readonly<{ receipt?: ClubsMemberBookingRequestReceipt }>;
export type ClubsMemberBookingsPayload = StatusPayload &
  Readonly<{ bookings?: readonly ClubsMemberBookingLifecycle[] }>;
export type ClubsMemberBookingLifecycleReceipt = Readonly<{
  outcome: "applied" | "conflict" | "denied" | "invalid" | "noop";
  reason: string | null;
  aggregateType:
    | "reservation"
    | "booking"
    | "stay"
    | "guest"
    | "change_request"
    | null;
  aggregateId: string | null;
  previousVersion: number | null;
  resultingVersion: number | null;
  resultingStatus: string | null;
  replayed: boolean;
}>;
export type ClubsMemberBookingLifecycleMutationPayload = StatusPayload &
  Readonly<{ receipt?: ClubsMemberBookingLifecycleReceipt }>;

export type ClubsMemberBookingApiResult<T extends StatusPayload> = Readonly<{
  ok: boolean;
  httpStatus: number;
  status: string;
  data: T;
  retryAfterSeconds: number | null;
}>;

export type ClubsMemberBookingMutationResult<
  TMutation extends StatusPayload,
  TReconciliation extends StatusPayload,
> = Readonly<{
  kind: "completed" | "rejected" | "conflict" | "unknown_outcome";
  response: ClubsMemberBookingApiResult<TMutation> | null;
  reconciliation: ClubsMemberBookingApiResult<TReconciliation> | null;
  idempotencyKey: string;
  retryWithSameIdempotencyKeyOnly: boolean;
  automaticRetryPerformed: false;
}>;

export type ClubsMemberBookingStayIntent = Readonly<{
  propertyId: ClubsMemberBookingPropertyId;
  stayUnit: ClubsMemberBookingStayUnit;
  arrivalDate: string;
  departureDate: string;
  guestCount: number;
  requestedCapacity: number;
  returnTo: string;
}>;

export type ClubsMemberBookingQuoteInput = Readonly<{
  propertyId: ClubsMemberBookingPropertyId;
  unitId: string;
  ratePlanId: string;
  arrivalDate: string;
  departureDate: string;
  guestCount: number;
  requestedCapacity: number;
}>;

export type ClubsMemberBookingFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export class ClubsMemberBookingClientError extends Error {
  constructor(
    readonly code:
      | "invalid_input"
      | "invalid_idempotency_key"
      | "invalid_return_to"
      | "transport_unavailable"
      | "non_json_response"
      | "cache_contract_violation"
      | "invalid_response"
      | "authority_boundary_violation",
  ) {
    super(code);
    this.name = "ClubsMemberBookingClientError";
  }
}

const strongIdempotencyKey = /^[A-Za-z0-9:_.-]{16,200}$/;
const identifier = /^[A-Za-z0-9:_.-]{3,180}$/;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const authorityClaimKeys = [
  "paymentAuthority",
  "providerAuthority",
  "productionAuthority",
  "providerCalled",
  "providerSuccessClaimed",
] as const;

function assertPropertyId(
  value: string,
): asserts value is ClubsMemberBookingPropertyId {
  if (
    value !== "property-clubs-forest-city-golf" &&
    value !== "property-clubs-forest-city-marina"
  ) {
    throw new ClubsMemberBookingClientError("invalid_input");
  }
}

function assertIdentifier(value: string) {
  if (!identifier.test(value)) {
    throw new ClubsMemberBookingClientError("invalid_input");
  }
}

function utcDay(value: string) {
  if (!isoDate.test(value)) {
    throw new ClubsMemberBookingClientError("invalid_input");
  }
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== value
  ) {
    throw new ClubsMemberBookingClientError("invalid_input");
  }
  return timestamp;
}

function assertStayIntent(input: ClubsMemberBookingStayIntent) {
  assertPropertyId(input.propertyId);
  const arrival = utcDay(input.arrivalDate);
  const departure = utcDay(input.departureDate);
  const nights = (departure - arrival) / 86_400_000;
  const validStay =
    input.propertyId === "property-clubs-forest-city-golf"
      ? (input.stayUnit === "night" && nights >= 1 && nights <= 30) ||
        (input.stayUnit === "week" && nights === 7) ||
        (input.stayUnit === "month" && nights === 30)
      : input.stayUnit === "month" && nights === 30;
  if (
    !validStay ||
    !Number.isSafeInteger(input.guestCount) ||
    input.guestCount < 1 ||
    input.guestCount > 100 ||
    !Number.isSafeInteger(input.requestedCapacity) ||
    input.requestedCapacity < 1 ||
    input.requestedCapacity > 100
  ) {
    throw new ClubsMemberBookingClientError("invalid_input");
  }
}

export function assertClubsMemberBookingIdempotencyKey(value: string) {
  if (!strongIdempotencyKey.test(value)) {
    throw new ClubsMemberBookingClientError("invalid_idempotency_key");
  }
  return value;
}

export function createClubsMemberBookingIdempotencyKey(
  scope:
    | "quote"
    | "hold"
    | "booking-request"
    | "booking-request-cancel"
    | "booking-change",
) {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (!uuid) {
    throw new ClubsMemberBookingClientError("transport_unavailable");
  }
  return assertClubsMemberBookingIdempotencyKey(
    `cclub-member-${scope}-${uuid}`,
  );
}

export function sanitizeClubsMemberBookingReturnTo(
  propertyId: ClubsMemberBookingPropertyId,
  value: string,
) {
  assertPropertyId(propertyId);
  if (
    value.length < 1 ||
    value.length > 2_048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f]/.test(value)
  ) {
    throw new ClubsMemberBookingClientError("invalid_return_to");
  }
  const base = "https://clubs-member-client.invalid";
  const parsed = new URL(value, base);
  const expectedPath =
    propertyId === "property-clubs-forest-city-golf"
      ? "/en/hospitality/golf-hotel"
      : "/en/hospitality/marina-hotel";
  if (parsed.origin !== base || parsed.pathname !== expectedPath || parsed.hash) {
    throw new ClubsMemberBookingClientError("invalid_return_to");
  }
  return parsed.pathname + parsed.search;
}

function assertSameOriginEndpoint(endpoint: string) {
  if (!endpoint.startsWith("/api/crays/clubs/") || endpoint.startsWith("//")) {
    throw new ClubsMemberBookingClientError("invalid_input");
  }
}

function boundedRequestedChange(value: Readonly<Record<string, unknown>>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ClubsMemberBookingClientError("invalid_input");
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new ClubsMemberBookingClientError("invalid_input");
  }
  if (serialized === "{}" || serialized.length > 8_000) {
    throw new ClubsMemberBookingClientError("invalid_input");
  }
  return JSON.parse(serialized) as Record<string, unknown>;
}

function parseRetryAfter(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  return Number(value);
}

function assertSafeStatusPayload(value: unknown): asserts value is StatusPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ClubsMemberBookingClientError("invalid_response");
  }
  const payload = value as Record<string, unknown>;
  if (typeof payload.status !== "string" || payload.status.length === 0) {
    throw new ClubsMemberBookingClientError("invalid_response");
  }
  if (authorityClaimKeys.some((key) => payload[key] === true)) {
    throw new ClubsMemberBookingClientError("authority_boundary_violation");
  }
}

async function decodeResponse<T extends StatusPayload>(response: Response) {
  const cacheControl = response.headers.get("cache-control")?.toLowerCase();
  if (!cacheControl?.includes("no-store")) {
    throw new ClubsMemberBookingClientError("cache_contract_violation");
  }
  const contentType = response.headers.get("content-type")?.toLowerCase();
  if (!contentType?.includes("application/json")) {
    throw new ClubsMemberBookingClientError("non_json_response");
  }
  const payload = await response.json().catch(() => null);
  assertSafeStatusPayload(payload);
  return Object.freeze({
    ok: response.ok,
    httpStatus: response.status,
    status: payload.status,
    data: payload as T,
    retryAfterSeconds: parseRetryAfter(response.headers.get("retry-after")),
  }) satisfies ClubsMemberBookingApiResult<T>;
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

function postInit(
  idempotencyKey: string,
  body: string,
  signal?: AbortSignal,
): RequestInit {
  return {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    body,
    signal,
  };
}

export function createClubsMemberBookingClient(options: {
  fetch?: ClubsMemberBookingFetch;
} = {}) {
  const fetcher: ClubsMemberBookingFetch =
    options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const endpoints = CLUBS_MEMBER_BOOKING_CLIENT_CONTRACT.endpoints;

  async function read<T extends StatusPayload>(
    endpoint: string,
    signal?: AbortSignal,
  ) {
    assertSameOriginEndpoint(endpoint);
    try {
      return await decodeResponse<T>(
        await fetcher(endpoint, readInit(signal)),
      );
    } catch (error) {
      if (error instanceof ClubsMemberBookingClientError) throw error;
      throw new ClubsMemberBookingClientError("transport_unavailable");
    }
  }

  async function safeReconcile<T extends StatusPayload>(
    reconcile: () => Promise<ClubsMemberBookingApiResult<T>>,
  ) {
    try {
      return await reconcile();
    } catch {
      return null;
    }
  }

  async function mutate<
    TMutation extends StatusPayload,
    TReconciliation extends StatusPayload,
  >(
    endpoint: string,
    payload: Readonly<Record<string, unknown>>,
    idempotencyKey: string,
    reconcile: () => Promise<ClubsMemberBookingApiResult<TReconciliation>>,
    signal?: AbortSignal,
  ): Promise<
    ClubsMemberBookingMutationResult<TMutation, TReconciliation>
  > {
    assertSameOriginEndpoint(endpoint);
    assertClubsMemberBookingIdempotencyKey(idempotencyKey);
    const body = JSON.stringify(payload);
    let response: ClubsMemberBookingApiResult<TMutation>;
    try {
      response = await decodeResponse<TMutation>(
        await fetcher(endpoint, postInit(idempotencyKey, body, signal)),
      );
    } catch {
      return Object.freeze({
        kind: "unknown_outcome",
        response: null,
        reconciliation: await safeReconcile(reconcile),
        idempotencyKey,
        retryWithSameIdempotencyKeyOnly: true,
        automaticRetryPerformed: false,
      });
    }
    if (response.httpStatus === 409) {
      return Object.freeze({
        kind: "conflict",
        response,
        reconciliation: await safeReconcile(reconcile),
        idempotencyKey,
        retryWithSameIdempotencyKeyOnly: true,
        automaticRetryPerformed: false,
      });
    }
    if (response.httpStatus === 503 && response.status === "unknown_outcome") {
      return Object.freeze({
        kind: "unknown_outcome",
        response,
        reconciliation: await safeReconcile(reconcile),
        idempotencyKey,
        retryWithSameIdempotencyKeyOnly: true,
        automaticRetryPerformed: false,
      });
    }
    return Object.freeze({
      kind: response.ok ? "completed" : "rejected",
      response,
      reconciliation: null,
      idempotencyKey,
      retryWithSameIdempotencyKeyOnly: false,
      automaticRetryPerformed: false,
    });
  }

  const readQuotes = (signal?: AbortSignal) =>
    read<ClubsMemberBookingQuotesPayload>(endpoints.quotes, signal);
  const readHolds = (signal?: AbortSignal) =>
    read<ClubsMemberBookingHoldsPayload>(endpoints.holds, signal);
  const readBookingRequests = (signal?: AbortSignal) =>
    read<ClubsMemberBookingRequestsPayload>(
      endpoints.bookingRequests,
      signal,
    );
  const readBookings = (signal?: AbortSignal) =>
    read<ClubsMemberBookingsPayload>(endpoints.bookings, signal);

  return Object.freeze({
    readEligibility(
      propertyId: ClubsMemberBookingPropertyId,
      signal?: AbortSignal,
    ) {
      assertPropertyId(propertyId);
      return read<ClubsMemberBookingEligibilityPayload>(
        endpoints.eligibilityTemplate.replace(
          "{propertyId}",
          encodeURIComponent(propertyId),
        ),
        signal,
      );
    },

    resolveStayStep4Offer(
      input: ClubsMemberBookingStayIntent,
      signal?: AbortSignal,
    ) {
      assertStayIntent(input);
      const returnTo = sanitizeClubsMemberBookingReturnTo(
        input.propertyId,
        input.returnTo,
      );
      const query = new URLSearchParams({
        propertyId: input.propertyId,
        stayUnit: input.stayUnit,
        arrivalDate: input.arrivalDate,
        departureDate: input.departureDate,
        guestCount: String(input.guestCount),
        requestedCapacity: String(input.requestedCapacity),
        returnTo,
      });
      return read<ClubsMemberBookingStayOfferPayload>(
        `${endpoints.stayStep4}?${query.toString()}`,
        signal,
      );
    },

    readQuotes,

    issueQuote(
      input: ClubsMemberBookingQuoteInput,
      idempotencyKey: string,
      signal?: AbortSignal,
    ) {
      assertPropertyId(input.propertyId);
      assertIdentifier(input.unitId);
      assertIdentifier(input.ratePlanId);
      const stayInput: ClubsMemberBookingStayIntent = {
        ...input,
        stayUnit:
          input.propertyId === "property-clubs-forest-city-marina"
            ? "month"
            : (Date.parse(`${input.departureDate}T00:00:00.000Z`) -
                  Date.parse(`${input.arrivalDate}T00:00:00.000Z`)) /
                  86_400_000 ===
                7
              ? "week"
              : "night",
        returnTo:
          input.propertyId === "property-clubs-forest-city-golf"
            ? "/en/hospitality/golf-hotel"
            : "/en/hospitality/marina-hotel",
      };
      assertStayIntent(stayInput);
      const payload = {
        propertyId: input.propertyId,
        unitId: input.unitId,
        ratePlanId: input.ratePlanId,
        arrivalDate: input.arrivalDate,
        departureDate: input.departureDate,
        guestCount: input.guestCount,
        requestedCapacity: input.requestedCapacity,
      };
      return mutate<
        ClubsMemberBookingQuoteMutationPayload,
        ClubsMemberBookingQuotesPayload
      >(
        endpoints.quotes,
        payload,
        idempotencyKey,
        () => readQuotes(signal),
        signal,
      );
    },

    readHolds,

    createHold(
      input: Readonly<{ quoteId: string; ttlMinutes?: number }>,
      idempotencyKey: string,
      signal?: AbortSignal,
    ) {
      assertIdentifier(input.quoteId);
      const ttlMinutes = input.ttlMinutes ?? 10;
      if (
        !Number.isSafeInteger(ttlMinutes) ||
        ttlMinutes < 2 ||
        ttlMinutes > 20
      ) {
        throw new ClubsMemberBookingClientError("invalid_input");
      }
      return mutate<
        ClubsMemberBookingHoldMutationPayload,
        ClubsMemberBookingHoldsPayload
      >(
        endpoints.holds,
        { type: "create", quoteId: input.quoteId, ttlMinutes },
        idempotencyKey,
        () => readHolds(signal),
        signal,
      );
    },

    readBookingRequests,

    submitBookingRequest(
      input: Readonly<{ holdId: string }>,
      idempotencyKey: string,
      signal?: AbortSignal,
    ) {
      assertIdentifier(input.holdId);
      return mutate<
        ClubsMemberBookingRequestMutationPayload,
        ClubsMemberBookingRequestsPayload
      >(
        endpoints.bookingRequests,
        { type: "submit", holdId: input.holdId },
        idempotencyKey,
        () => readBookingRequests(signal),
        signal,
      );
    },

    cancelBookingRequest(
      input: ClubsMemberBookingRequestCancellationInput,
      idempotencyKey: string,
      signal?: AbortSignal,
    ) {
      assertIdentifier(input.requestId);
      const reason = input.reason.trim();
      if (
        !Number.isSafeInteger(input.expectedVersion) ||
        input.expectedVersion < 1 ||
        !["submitted", "under_review"].includes(input.currentStatus) ||
        reason.length < 3 ||
        reason.length > 500
      ) {
        throw new ClubsMemberBookingClientError("invalid_input");
      }
      return mutate<
        ClubsMemberBookingRequestMutationPayload,
        ClubsMemberBookingRequestsPayload
      >(
        endpoints.bookingRequests,
        {
          type: "cancel",
          requestId: input.requestId,
          expectedVersion: input.expectedVersion,
          reason,
        },
        idempotencyKey,
        () => readBookingRequests(signal),
        signal,
      );
    },

    readBookings,

    submitBookingChange(
      input: ClubsMemberBookingChangeSubmissionInput,
      idempotencyKey: string,
      signal?: AbortSignal,
    ) {
      assertIdentifier(input.bookingId);
      if (
        !Number.isSafeInteger(input.expectedVersion) ||
        input.expectedVersion < 1 ||
        input.currentStatus !== "confirmed" ||
        !["dates", "guest_assignment", "cancellation", "other"].includes(
          input.changeType,
        )
      ) {
        throw new ClubsMemberBookingClientError("invalid_input");
      }
      return mutate<
        ClubsMemberBookingLifecycleMutationPayload,
        ClubsMemberBookingsPayload
      >(
        endpoints.bookings,
        {
          type: "submit_change",
          bookingId: input.bookingId,
          expectedVersion: input.expectedVersion,
          changeType: input.changeType,
          requestedChange: boundedRequestedChange(input.requestedChange),
        },
        idempotencyKey,
        () => readBookings(signal),
        signal,
      );
    },

    cancelBookingChange(
      input: ClubsMemberBookingChangeCancellationInput,
      idempotencyKey: string,
      signal?: AbortSignal,
    ) {
      assertIdentifier(input.changeRequestId);
      const reason = input.reason.trim();
      if (
        !Number.isSafeInteger(input.expectedVersion) ||
        input.expectedVersion < 1 ||
        !["submitted", "under_review"].includes(input.currentStatus) ||
        reason.length < 3 ||
        reason.length > 500
      ) {
        throw new ClubsMemberBookingClientError("invalid_input");
      }
      return mutate<
        ClubsMemberBookingLifecycleMutationPayload,
        ClubsMemberBookingsPayload
      >(
        endpoints.bookings,
        {
          type: "cancel_change",
          changeRequestId: input.changeRequestId,
          expectedVersion: input.expectedVersion,
          reason,
        },
        idempotencyKey,
        () => readBookings(signal),
        signal,
      );
    },

    reconcile(scope: ClubsMemberBookingReconcileScope, signal?: AbortSignal) {
      if (scope === "quotes") return readQuotes(signal);
      if (scope === "holds") return readHolds(signal);
      if (scope === "booking-requests") return readBookingRequests(signal);
      if (scope === "bookings") return readBookings(signal);
      throw new ClubsMemberBookingClientError("invalid_input");
    },
  });
}

export type ClubsMemberBookingClient = ReturnType<
  typeof createClubsMemberBookingClient
>;
