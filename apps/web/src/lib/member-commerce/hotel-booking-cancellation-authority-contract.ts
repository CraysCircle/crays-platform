import {createHash} from "node:crypto";

export const HOTEL_BOOKING_CANCELLATION_AUTHORITY_VERSION =
  "cclub.phase9.hotel-booking-cancellation-authority.v1" as const;

const SHA256 = /^[a-f0-9]{64}$/;
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const timestamp = (value: string, code: string) => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(code);
  return parsed;
};

export type HotelFinalBookingReceipt = Readonly<{
  finalBookingReceiptId: string;
  finalBookingSnapshotSha256: string;
  tenantId: string;
  projectId: string;
  siteId: string;
  propertyId: string;
  propertyWorld: "forest-city-golf" | "forest-city-marina";
  reservationId: string;
  holdId: string;
  paymentEvidenceReceiptId: string;
  providerConfirmationReceiptId: string;
  accountReferenceHash: string;
  currency: string;
  paidAmountMinor: number;
  bookedAt: string;
  stayStartsAt: string;
  stayEndsAt: string;
  status: "provider-confirmed";
}>;

export type HotelCancellationPolicyReceipt = Readonly<{
  policyReceiptId: string;
  finalBookingReceiptId: string;
  finalBookingSnapshotSha256: string;
  sourceKind: "contracted-rate-plan";
  sourceReference: string;
  policyVersion: string;
  currency: string;
  refundableAmountMinor: number;
  evaluatedAt: string;
  policySnapshotSha256: string;
  synthetic: false;
}>;

export type HotelCancellationDecisionReceipt = Readonly<{
  decisionReceiptId: string;
  finalBookingReceiptId: string;
  actorAccountReferenceHash: string;
  actorAuthority: "booking_operations" | "finance";
  assuranceLevel: "AAL2" | "AAL3";
  authenticatedAt: string;
  checkedAt: string;
  expiresAt: string;
  requestedAction: "hotel-booking.cancel-and-refund";
  outcome: "approved";
  decisionSha256: string;
}>;

export type CreateHotelBookingCancellationAuthorityInput = Readonly<{
  cancellationAuthorityId: string;
  idempotencyKey: string;
  requestedAt: string;
  reasonCode:
    | "customer-request"
    | "property-unavailable"
    | "duplicate-booking"
    | "provider-failure";
  finalBooking: HotelFinalBookingReceipt;
  policy: HotelCancellationPolicyReceipt;
  decision: HotelCancellationDecisionReceipt;
}>;

function requireText(values: readonly string[]) {
  if (values.some((value) => !value.trim())) {
    throw new Error("HOTEL_CANCELLATION_REQUIRED_REFERENCE_MISSING");
  }
}

export function createHotelBookingCancellationAuthority(
  input: CreateHotelBookingCancellationAuthorityInput,
) {
  const {finalBooking: booking, policy, decision} = input;
  requireText([
    input.cancellationAuthorityId,
    input.idempotencyKey,
    booking.finalBookingReceiptId,
    booking.tenantId,
    booking.projectId,
    booking.siteId,
    booking.propertyId,
    booking.reservationId,
    booking.holdId,
    booking.paymentEvidenceReceiptId,
    booking.providerConfirmationReceiptId,
    policy.policyReceiptId,
    policy.sourceReference,
    policy.policyVersion,
    decision.decisionReceiptId,
  ]);
  if (
    booking.status !== "provider-confirmed" ||
    !SHA256.test(booking.finalBookingSnapshotSha256) ||
    !SHA256.test(booking.accountReferenceHash)
  ) {
    throw new Error("HOTEL_CANCELLATION_FINAL_BOOKING_INVALID");
  }
  if (
    policy.synthetic !== false ||
    policy.sourceKind !== "contracted-rate-plan" ||
    !SHA256.test(policy.policySnapshotSha256)
  ) {
    throw new Error("HOTEL_CANCELLATION_POLICY_NOT_SOURCE_BACKED");
  }
  if (
    policy.finalBookingReceiptId !== booking.finalBookingReceiptId ||
    policy.finalBookingSnapshotSha256 !== booking.finalBookingSnapshotSha256
  ) {
    throw new Error("HOTEL_CANCELLATION_POLICY_BOOKING_SCOPE_MISMATCH");
  }
  if (
    !/^[A-Z]{3}$/.test(booking.currency) ||
    policy.currency !== booking.currency ||
    !Number.isSafeInteger(booking.paidAmountMinor) ||
    booking.paidAmountMinor < 1 ||
    !Number.isSafeInteger(policy.refundableAmountMinor) ||
    policy.refundableAmountMinor < 0 ||
    policy.refundableAmountMinor > booking.paidAmountMinor
  ) {
    throw new Error("HOTEL_CANCELLATION_REFUND_POLICY_INVALID");
  }
  const bookedAt = timestamp(booking.bookedAt, "HOTEL_CANCELLATION_BOOKED_AT_INVALID");
  const stayStartsAt = timestamp(
    booking.stayStartsAt,
    "HOTEL_CANCELLATION_STAY_WINDOW_INVALID",
  );
  const stayEndsAt = timestamp(
    booking.stayEndsAt,
    "HOTEL_CANCELLATION_STAY_WINDOW_INVALID",
  );
  const requestedAt = timestamp(
    input.requestedAt,
    "HOTEL_CANCELLATION_REQUESTED_AT_INVALID",
  );
  const policyEvaluatedAt = timestamp(
    policy.evaluatedAt,
    "HOTEL_CANCELLATION_POLICY_EVALUATED_AT_INVALID",
  );
  if (
    stayEndsAt <= stayStartsAt ||
    requestedAt < bookedAt ||
    policyEvaluatedAt > requestedAt ||
    requestedAt - policyEvaluatedAt > 900_000
  ) {
    throw new Error("HOTEL_CANCELLATION_TIMELINE_INVALID");
  }
  if (
    decision.finalBookingReceiptId !== booking.finalBookingReceiptId ||
    decision.requestedAction !== "hotel-booking.cancel-and-refund" ||
    decision.outcome !== "approved" ||
    !["booking_operations", "finance"].includes(decision.actorAuthority) ||
    !["AAL2", "AAL3"].includes(decision.assuranceLevel) ||
    !SHA256.test(decision.actorAccountReferenceHash) ||
    !SHA256.test(decision.decisionSha256)
  ) {
    throw new Error("HOTEL_CANCELLATION_HUMAN_AUTHORITY_INVALID");
  }
  const authenticatedAt = timestamp(
    decision.authenticatedAt,
    "HOTEL_CANCELLATION_AUTHENTICATED_AT_INVALID",
  );
  const checkedAt = timestamp(
    decision.checkedAt,
    "HOTEL_CANCELLATION_CHECKED_AT_INVALID",
  );
  const expiresAt = timestamp(
    decision.expiresAt,
    "HOTEL_CANCELLATION_EXPIRES_AT_INVALID",
  );
  if (
    checkedAt < authenticatedAt ||
    checkedAt - authenticatedAt > 300_000 ||
    checkedAt < requestedAt ||
    checkedAt > expiresAt
  ) {
    throw new Error("HOTEL_CANCELLATION_HUMAN_AUTHORITY_STALE");
  }

  const scope = Object.freeze({
    tenantId: booking.tenantId,
    projectId: booking.projectId,
    siteId: booking.siteId,
    propertyId: booking.propertyId,
    propertyWorld: booking.propertyWorld,
    finalBookingReceiptId: booking.finalBookingReceiptId,
    finalBookingSnapshotSha256: booking.finalBookingSnapshotSha256,
    reservationId: booking.reservationId,
    holdId: booking.holdId,
    accountReferenceHash: booking.accountReferenceHash,
  });
  const authorityBody = Object.freeze({
    contractVersion: HOTEL_BOOKING_CANCELLATION_AUTHORITY_VERSION,
    cancellationAuthorityId: input.cancellationAuthorityId,
    idempotencyKey: input.idempotencyKey,
    requestedAt: input.requestedAt,
    reasonCode: input.reasonCode,
    scope,
    paymentEvidenceReceiptId: booking.paymentEvidenceReceiptId,
    providerConfirmationReceiptId: booking.providerConfirmationReceiptId,
    policyReceiptId: policy.policyReceiptId,
    policySnapshotSha256: policy.policySnapshotSha256,
    decisionReceiptId: decision.decisionReceiptId,
    decisionSha256: decision.decisionSha256,
    actorAuthority: decision.actorAuthority,
    assuranceLevel: decision.assuranceLevel,
    currency: booking.currency,
    paidAmountMinor: booking.paidAmountMinor,
    refundableAmountMinor: policy.refundableAmountMinor,
  });
  const authoritySha256 = digest(authorityBody);
  return Object.freeze({
    ...authorityBody,
    authoritySha256,
    status: "authorized-awaiting-provider-cancellation" as const,
    providerCancellationStatus: "not-dispatched" as const,
    stripeRefundStatus:
      policy.refundableAmountMinor === 0
        ? ("not-required" as const)
        : ("not-authorized" as const),
    inventoryReleaseStatus:
      "blocked-until-provider-cancellation-confirmed" as const,
    entitlementReversalStatus:
      "blocked-until-provider-cancellation-and-refund-final" as const,
    bookingFinalStateChanged: false as const,
    inventoryReleased: false as const,
    refundDispatched: false as const,
    externalActionPerformed: false as const,
    formalActionAuthorized: false as const,
  });
}

export function adjudicateHotelCancellationAuthorityReplay(
  prior: Readonly<{
    cancellationAuthorityId: string;
    idempotencyKey: string;
    authoritySha256: string;
  }>,
  candidate: ReturnType<typeof createHotelBookingCancellationAuthority>,
) {
  if (prior.idempotencyKey !== candidate.idempotencyKey) {
    return Object.freeze({replayed: false as const});
  }
  if (
    prior.cancellationAuthorityId !== candidate.cancellationAuthorityId ||
    prior.authoritySha256 !== candidate.authoritySha256
  ) {
    throw new Error("HOTEL_CANCELLATION_AUTHORITY_REPLAY_CONFLICT");
  }
  return Object.freeze({
    replayed: true as const,
    cancellationAuthorityId: prior.cancellationAuthorityId,
  });
}
