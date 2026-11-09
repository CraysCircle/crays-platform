import { createHash } from "node:crypto";

export const CLUBS_STAY_STEP4_SCHEMA =
  "crays.clubs.member-stay-step4.v1" as const;
export const CLUBS_STAY_PAYMENT_BINDING_SCHEMA =
  "cclub-t5-stripe-price-binding.v1" as const;

export const CLUBS_STAY_STEP4_PROPERTIES = {
  golf: "property-clubs-forest-city-golf",
  marina: "property-clubs-forest-city-marina",
} as const;

export type ClubsStayStep4PropertyId =
  (typeof CLUBS_STAY_STEP4_PROPERTIES)[keyof typeof CLUBS_STAY_STEP4_PROPERTIES];
export type ClubsStayStep4StayUnit = "night" | "week" | "month";
export type ClubsStayStep4PayableBasis = "TOTAL" | "DEPOSIT_DUE";

export const CLUBS_STAY_STEP4_CONTRACT = Object.freeze({
  schema: CLUBS_STAY_STEP4_SCHEMA,
  version: "1.1.0",
  endpoint: "/api/crays/clubs/member/stay-step4",
  cache: "no-store",
  runtime: "nodejs",
  offerResolution: {
    method: "GET",
    source: "canonical_database_only",
    publicQloInferenceAllowed: false,
    writes: false,
    statuses: [
      "offer_ready",
      "offer_not_ready",
      "offer_ambiguous",
      "property_access_required",
    ],
  },
  paymentAuthority: {
    method: "POST",
    sourceTables: [
      "crays_core.clubs_quote_snapshots",
      "crays_core.clubs_quote_acceptances",
      "crays_core.clubs_reservation_holds",
      "crays_core.clubs_booking_party_team_go_evidence",
      "crays_core.clubs_booking_membership_application_handoffs",
      "crays_core.clubs_booking_membership_party_go_receipts",
    ],
    browserAmountAllowed: false,
    browserCurrencyAllowed: false,
    browserConnectedAccountAllowed: false,
    t5ProviderCalled: false,
    statuses: [
      "trusted_t5_adapter_receipt_required",
      "canonical_source_not_ready",
      "conflict",
      "unknown_outcome",
    ],
    trustedAdapterReceiptGate: {
      persistedImmutableReceiptRequired: true,
      requiredScope: "QUOTE_ACCEPTANCE_HOLD_TAX_SELLER_REFUND",
      exactSourceReceiptRequired: true,
      exactProductReadbackRequired: true,
      exactPriceReadbackRequired: true,
      persistableTo0256MustBe: true,
      providerCallableMustBe: true,
      persistenceAllowedMustBe: true,
      providerUseAllowedMustBe: true,
      prebindingUnverifiedAccepted: false,
      writerImplemented: false,
    },
  },
  idempotency: {
    header: "Idempotency-Key",
    minimumLength: 16,
    maximumLength: 200,
    identicalReplay: "same_fail_closed_status_until_trusted_receipt",
    payloadDrift: 409,
    unknownOutcome: 503,
    retryWithSameKeyOnly: true,
  },
  returnTo: {
    sameOriginRelativeOnly: true,
    golfPath: "/en/hospitality/golf-hotel",
    marinaPath: "/en/hospitality/marina-hotel",
  },
  authoritySeparation: {
    teamGoIsStayAmountAuthority: false,
    canonicalAcceptedQuoteIsStayAmountAuthority: false,
    acceptedQuoteHoldAndTrustedAdapterReceiptRequired: true,
    quoteDoesNotReserve: true,
    holdDoesNotCreatePayment: true,
    paymentDoesNotConfirmBooking: true,
    providerAuthority: false,
    productionAuthority: false,
  },
} as const);

export class ClubsStayStep4ContractError extends Error {
  constructor(
    readonly code:
      | "CCLUB_STAY_STEP4_PROPERTY_INVALID"
      | "CCLUB_STAY_STEP4_STAY_UNIT_INVALID"
      | "CCLUB_STAY_STEP4_DATE_INVALID"
      | "CCLUB_STAY_STEP4_STAY_INVALID"
      | "CCLUB_STAY_STEP4_RETURN_TO_INVALID"
      | "CCLUB_STAY_STEP4_BROWSER_AUTHORITY_FIELD_FORBIDDEN"
      | "CCLUB_STAY_STEP4_IDEMPOTENCY_KEY_INVALID"
      | "CCLUB_STAY_STEP4_TEAM_GO_CORRELATION_INVALID",
  ) {
    super(code);
    this.name = "ClubsStayStep4ContractError";
  }
}

function utcDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ClubsStayStep4ContractError("CCLUB_STAY_STEP4_DATE_INVALID");
  }
  const timestamp = Date.parse(value + "T00:00:00.000Z");
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== value
  ) {
    throw new ClubsStayStep4ContractError("CCLUB_STAY_STEP4_DATE_INVALID");
  }
  return timestamp;
}

export function validateClubsStayStep4Intent(input: {
  propertyId: string;
  stayUnit: string;
  arrivalDate: string;
  departureDate: string;
}) {
  if (
    input.propertyId !== CLUBS_STAY_STEP4_PROPERTIES.golf &&
    input.propertyId !== CLUBS_STAY_STEP4_PROPERTIES.marina
  ) {
    throw new ClubsStayStep4ContractError(
      "CCLUB_STAY_STEP4_PROPERTY_INVALID",
    );
  }
  if (!["night", "week", "month"].includes(input.stayUnit)) {
    throw new ClubsStayStep4ContractError(
      "CCLUB_STAY_STEP4_STAY_UNIT_INVALID",
    );
  }
  const arrival = utcDay(input.arrivalDate);
  const departure = utcDay(input.departureDate);
  const nights = (departure - arrival) / 86_400_000;
  const valid =
    input.propertyId === CLUBS_STAY_STEP4_PROPERTIES.golf
      ? (input.stayUnit === "night" && nights >= 1 && nights <= 30) ||
        (input.stayUnit === "week" && nights === 7) ||
        (input.stayUnit === "month" && nights === 30)
      : input.stayUnit === "month" && nights === 30;
  if (!valid) {
    throw new ClubsStayStep4ContractError("CCLUB_STAY_STEP4_STAY_INVALID");
  }
  return Object.freeze({
    propertyId: input.propertyId as ClubsStayStep4PropertyId,
    stayUnit: input.stayUnit as ClubsStayStep4StayUnit,
    arrivalDate: input.arrivalDate,
    departureDate: input.departureDate,
    nights,
  });
}

export type ClubsStayStep4TeamGoCorrelationInput = Readonly<{
  quote: Readonly<{
    accountId: string;
    propertyId: ClubsStayStep4PropertyId;
    arrivalDate: string;
    departureDate: string;
    guestCount: number;
  }>;
  handoff: Readonly<{
    handoffId: string;
    accountId: string;
    propertyId: ClubsStayStep4PropertyId;
    dateMode: string;
    stayUnit: string;
    intentPropertyId: string | null;
    intentDateMode: string | null;
    intentCheckIn: string | null;
    intentCheckOut: string | null;
    intentStayUnit: string | null;
    intentGuestCount: number | null;
    intentChildCount: number | null;
    adultCount: number;
    dependentMinorCount: number;
    intentSha256: string;
  }>;
  teamGo: Readonly<{
    handoffId: string;
    partyGoReceiptId: string;
    primaryAccountId: string;
    propertyId: string;
    requiredPersonCount: number;
    approvedPersonCount: number;
    partySnapshotSha256: string;
    decisionSnapshotSha256: string;
  }>;
  partyGo: Readonly<{
    partyGoReceiptId: string;
    handoffId: string;
    partySnapshotSha256: string;
  }>;
}>;

export function assertClubsStayStep4TeamGoCorrelation(
  input: ClubsStayStep4TeamGoCorrelationInput,
) {
  const invalid = () => {
    throw new ClubsStayStep4ContractError(
      "CCLUB_STAY_STEP4_TEAM_GO_CORRELATION_INVALID",
    );
  };
  try {
    validateClubsStayStep4Intent({
      propertyId: input.quote.propertyId,
      stayUnit: input.handoff.stayUnit,
      arrivalDate: input.quote.arrivalDate,
      departureDate: input.quote.departureDate,
    });
  } catch {
    invalid();
  }
  const sha256 = /^[a-f0-9]{64}$/;
  if (
    input.handoff.dateMode !== "exact" ||
    input.handoff.accountId !== input.quote.accountId ||
    input.handoff.propertyId !== input.quote.propertyId ||
    input.handoff.intentPropertyId !== input.quote.propertyId ||
    input.handoff.intentDateMode !== "exact" ||
    input.handoff.intentCheckIn !== input.quote.arrivalDate ||
    input.handoff.intentCheckOut !== input.quote.departureDate ||
    input.handoff.intentStayUnit !== input.handoff.stayUnit ||
    input.handoff.intentGuestCount !== input.quote.guestCount ||
    input.handoff.intentChildCount !== 0 ||
    input.handoff.adultCount !== input.quote.guestCount ||
    input.handoff.dependentMinorCount !== 0 ||
    input.teamGo.handoffId !== input.handoff.handoffId ||
    input.teamGo.partyGoReceiptId !== input.partyGo.partyGoReceiptId ||
    input.partyGo.handoffId !== input.handoff.handoffId ||
    input.teamGo.primaryAccountId !== input.quote.accountId ||
    input.teamGo.propertyId !== input.quote.propertyId ||
    input.teamGo.requiredPersonCount !== input.handoff.adultCount ||
    input.teamGo.approvedPersonCount !== input.teamGo.requiredPersonCount ||
    input.teamGo.partySnapshotSha256 !==
      input.partyGo.partySnapshotSha256 ||
    !sha256.test(input.handoff.intentSha256) ||
    !sha256.test(input.teamGo.partySnapshotSha256) ||
    !sha256.test(input.teamGo.decisionSnapshotSha256)
  ) {
    invalid();
  }
  return Object.freeze({
    handoffId: input.handoff.handoffId,
    handoffIntentSha256: input.handoff.intentSha256,
    partyGoReceiptId: input.partyGo.partyGoReceiptId,
    partySnapshotSha256: input.teamGo.partySnapshotSha256,
    decisionSnapshotSha256: input.teamGo.decisionSnapshotSha256,
    stayUnit: input.handoff.stayUnit as ClubsStayStep4StayUnit,
    arrivalDate: input.quote.arrivalDate,
    departureDate: input.quote.departureDate,
    adultCount: input.handoff.adultCount,
    dependentMinorCount: input.handoff.dependentMinorCount,
  });
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

export function clubsStayStep4Sha256(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)), "utf8")
    .digest("hex");
}

export function validateClubsStayStep4IdempotencyKey(value: string) {
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(value)) {
    throw new ClubsStayStep4ContractError(
      "CCLUB_STAY_STEP4_IDEMPOTENCY_KEY_INVALID",
    );
  }
  return value;
}

export function clubsStayStep4AuthorityId(input: {
  tenantId: string;
  accountId: string;
  idempotencyKey: string;
}) {
  validateClubsStayStep4IdempotencyKey(input.idempotencyKey);
  const digest = clubsStayStep4Sha256({
    tenantId: input.tenantId,
    accountId: input.accountId,
    idempotencyKey: input.idempotencyKey,
  });
  return `cclub_stay_authority_${digest.slice(0, 40)}`;
}

const browserAuthorityKeys = new Set([
  "amountminor",
  "totalminor",
  "depositdueminor",
  "currency",
  "sellersnapshot",
  "stripeconnectedaccountid",
  "operatorconnectedaccountid",
  "ambassadorconnectedaccountid",
  "softwareconnectedaccountid",
  "globalconcepttestconnectedaccountid",
  "stripeproductid",
  "stripepriceid",
  "sourceauthoritysha256",
  "pricing",
  "tax",
  "fee",
  "deposit",
  "cancellation",
  "refundauthority",
  "providerbinding",
  "trustedadapterreceipt",
  "trustedrepositoryreceiptid",
  "trustedrepositoryreceiptsha256",
  "persistableto0256",
  "providercallable",
  "persistenceallowed",
  "provideruseallowed",
]);

function assertNoBrowserAuthorityFields(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertNoBrowserAuthorityFields);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (browserAuthorityKeys.has(key.toLowerCase())) {
      throw new ClubsStayStep4ContractError(
        "CCLUB_STAY_STEP4_BROWSER_AUTHORITY_FIELD_FORBIDDEN",
      );
    }
    assertNoBrowserAuthorityFields(entry);
  }
}

export function assertClubsStayStep4BrowserPayload(value: unknown) {
  assertNoBrowserAuthorityFields(value);
  return value;
}

export function sanitizeClubsStayStep4ReturnTo(
  propertyId: ClubsStayStep4PropertyId,
  value: string,
) {
  if (
    value.length < 1 ||
    value.length > 2_048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f]/.test(value)
  ) {
    throw new ClubsStayStep4ContractError(
      "CCLUB_STAY_STEP4_RETURN_TO_INVALID",
    );
  }
  const parsed = new URL(value, "https://clubs-step4.invalid");
  const expectedPath =
    propertyId === CLUBS_STAY_STEP4_PROPERTIES.golf
      ? CLUBS_STAY_STEP4_CONTRACT.returnTo.golfPath
      : CLUBS_STAY_STEP4_CONTRACT.returnTo.marinaPath;
  if (
    parsed.origin !== "https://clubs-step4.invalid" ||
    parsed.pathname !== expectedPath ||
    parsed.hash
  ) {
    throw new ClubsStayStep4ContractError(
      "CCLUB_STAY_STEP4_RETURN_TO_INVALID",
    );
  }
  return parsed.pathname + parsed.search;
}

export type ClubsStayStep4SourceReceipt = Readonly<{
  schema: typeof CLUBS_STAY_STEP4_SCHEMA;
  version: "1.1.0";
  status: "canonical_source_ready_trusted_t5_receipt_required";
  paymentAuthority: false;
  providerAuthority: false;
  productionAuthority: false;
  quoteId: string;
  holdId: string;
  teamGoEvidenceId: string;
  handoffId: string;
  handoffIntentSha256: string;
  partyGoReceiptId: string;
  partySnapshotSha256: string;
  decisionSnapshotSha256: string;
  propertyId: ClubsStayStep4PropertyId;
  accountId: string;
  stayUnit: ClubsStayStep4StayUnit;
  arrivalDate: string;
  departureDate: string;
  adultCount: number;
  dependentMinorCount: 0;
  payableBasis: ClubsStayStep4PayableBasis;
  amountMinor: number;
  totalMinor: number;
  depositDueMinor: number;
  currency: string;
  pricingSnapshotSha256: string;
  acceptedPricingSha256: string;
  sellerSnapshotSha256: string;
  acceptedSellerSha256: string;
  taxSnapshotSha256: string;
  feeSnapshotSha256: string;
  depositSnapshotSha256: string;
  cancellationSnapshotSha256: string;
  refundBoundarySha256: string;
  teamGoEvidenceSha256: string;
  sourceExpiresAt: string;
  sourceReceiptSha256: string;
}>;
