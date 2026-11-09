import {createHash} from "node:crypto";

export const REFUND_CONSEQUENCE_VERSION = "ncrv2-137.v1" as const;

export type RefundSellerSnapshot = Readonly<{
  snapshotId: string;
  snapshotSha256: string;
  orderId: string;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  storeId: string;
  stripeConnectedAccountId: string;
  stripeEnvironment: "test" | "live";
}>;

type RefundInput = Readonly<{
  snapshot: RefundSellerSnapshot;
  resolvedConnectedAccountId: string;
  paymentIntentId: string;
  chargeId: string;
  originalAmountMinor: number;
  alreadyCommittedRefundAmountMinor: number;
  refundAmountMinor: number;
  currency: string;
  returnId: string;
  returnState: "APPROVED" | "RECEIVED";
  returnReceiptId?: string;
  reasonCode: "duplicate" | "fraudulent" | "requested_by_customer";
  actorAuthority: "partner_operator" | "finance" | "browser";
  approvalReceiptId: string;
  preflightSha256: string;
  stepUp: Readonly<{
    assuranceLevel: "AAL1" | "AAL2" | "AAL3";
    authenticatedAt: string;
    checkedAt: string;
    preflightSha256: string;
  }>;
  idempotencyKey: string;
  billingLedgerDomain: "retail-commerce" | "membership-billing";
}>;

const digest = (value: object) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const isSha256 = (value: string) => /^[a-f0-9]{64}$/.test(value);

export function createRefundCommand(input: RefundInput) {
  if (input.billingLedgerDomain !== "retail-commerce") {
    throw new Error("REFUND_BILLING_LEDGER_SEPARATION_REQUIRED");
  }
  if (
    input.resolvedConnectedAccountId !== input.snapshot.stripeConnectedAccountId
  ) {
    throw new Error("REFUND_CONNECTED_ACCOUNT_SNAPSHOT_MISMATCH");
  }
  if (
    input.actorAuthority === "browser" ||
    !input.approvalReceiptId.trim()
  ) {
    throw new Error("REFUND_APPROVAL_AUTHORITY_REQUIRED");
  }
  if (input.returnState === "RECEIVED" && !input.returnReceiptId?.trim()) {
    throw new Error("REFUND_RETURN_RECEIPT_REQUIRED");
  }
  if (
    !isSha256(input.snapshot.snapshotSha256) ||
    !isSha256(input.preflightSha256) ||
    input.stepUp.preflightSha256 !== input.preflightSha256 ||
    !["AAL2", "AAL3"].includes(input.stepUp.assuranceLevel)
  ) {
    throw new Error("REFUND_STEP_UP_BINDING_INVALID");
  }
  const authenticatedAt = new Date(input.stepUp.authenticatedAt).getTime();
  const checkedAt = new Date(input.stepUp.checkedAt).getTime();
  if (
    !Number.isFinite(authenticatedAt) ||
    !Number.isFinite(checkedAt) ||
    checkedAt < authenticatedAt ||
    checkedAt - authenticatedAt > 300_000
  ) {
    throw new Error("REFUND_STEP_UP_STALE");
  }
  if (
    !Number.isSafeInteger(input.originalAmountMinor) ||
    !Number.isSafeInteger(input.alreadyCommittedRefundAmountMinor) ||
    !Number.isSafeInteger(input.refundAmountMinor) ||
    input.originalAmountMinor < 1 ||
    input.alreadyCommittedRefundAmountMinor < 0 ||
    input.refundAmountMinor < 1 ||
    input.alreadyCommittedRefundAmountMinor + input.refundAmountMinor >
      input.originalAmountMinor
  ) {
    throw new Error("REFUND_AMOUNT_EXCEEDS_REMAINING");
  }
  if (
    !/^[a-z]{3}$/.test(input.currency) ||
    !input.paymentIntentId.trim() ||
    !input.chargeId.trim() ||
    !input.returnId.trim() ||
    !input.idempotencyKey.trim()
  ) {
    throw new Error("REFUND_COMMAND_INPUT_INVALID");
  }

  const remainingBeforeMinor =
    input.originalAmountMinor - input.alreadyCommittedRefundAmountMinor;
  const payload = {
    payment_intent: input.paymentIntentId,
    amount: input.refundAmountMinor,
    reason: input.reasonCode,
    metadata: {
      crays_domain: "retail-commerce",
      crays_order_id: input.snapshot.orderId,
      crays_seller_snapshot_id: input.snapshot.snapshotId,
      crays_return_id: input.returnId,
      crays_operator_legal_entity_id: input.snapshot.operatorLegalEntityId,
    },
  };
  const requestHash = digest({
    connectedAccount: input.snapshot.stripeConnectedAccountId,
    payload,
    snapshotSha256: input.snapshot.snapshotSha256,
    preflightSha256: input.preflightSha256,
    approvalReceiptId: input.approvalReceiptId,
  });

  return Object.freeze({
    contractVersion: REFUND_CONSEQUENCE_VERSION,
    state: "COMMAND_COMMITTED" as const,
    refundKind:
      input.refundAmountMinor === remainingBeforeMinor
        ? ("FULL" as const)
        : ("PARTIAL" as const),
    orderId: input.snapshot.orderId,
    snapshotId: input.snapshot.snapshotId,
    snapshotSha256: input.snapshot.snapshotSha256,
    partnerTenantId: input.snapshot.partnerTenantId,
    operatorLegalEntityId: input.snapshot.operatorLegalEntityId,
    storeId: input.snapshot.storeId,
    merchantOfRecordLegalEntityId: input.snapshot.operatorLegalEntityId,
    connectedAccount: input.snapshot.stripeConnectedAccountId,
    stripeEnvironment: input.snapshot.stripeEnvironment,
    paymentIntentId: input.paymentIntentId,
    chargeId: input.chargeId,
    currency: input.currency,
    originalAmountMinor: input.originalAmountMinor,
    alreadyCommittedRefundAmountMinor:
      input.alreadyCommittedRefundAmountMinor,
    refundAmountMinor: input.refundAmountMinor,
    remainingAfterMinor: remainingBeforeMinor - input.refundAmountMinor,
    returnId: input.returnId,
    returnState: input.returnState,
    returnReceiptId: input.returnReceiptId ?? null,
    approvalReceiptId: input.approvalReceiptId,
    preflightSha256: input.preflightSha256,
    assuranceLevel: input.stepUp.assuranceLevel,
    method: "POST" as const,
    path: "/v1/refunds" as const,
    idempotencyKey: input.idempotencyKey,
    requestHash,
    payload,
  });
}

export function adjudicateRefundReplay(
  prior: Readonly<{
    idempotencyKey: string;
    requestHash: string;
    refundId: string;
  }>,
  command: ReturnType<typeof createRefundCommand>,
) {
  if (prior.idempotencyKey !== command.idempotencyKey) {
    return {replay: false as const};
  }
  if (prior.requestHash !== command.requestHash) {
    throw new Error("REFUND_IDEMPOTENCY_COLLISION");
  }
  return {replay: true as const, refundId: prior.refundId};
}

export function acceptRefundProviderObservation(
  command: ReturnType<typeof createRefundCommand>,
  observation: Readonly<{
    providerEventId: string;
    connectedAccount: string;
    refundId: string;
    paymentIntentId: string;
    amountMinor: number;
    currency: string;
    status: string;
  }>,
) {
  if (
    observation.connectedAccount !== command.connectedAccount ||
    observation.paymentIntentId !== command.paymentIntentId ||
    observation.amountMinor !== command.refundAmountMinor ||
    observation.currency !== command.currency
  ) {
    throw new Error("REFUND_PROVIDER_OBSERVATION_SCOPE_MISMATCH");
  }
  const states = {
    pending: "PROVIDER_PENDING",
    requires_action: "PROVIDER_ACTION_REQUIRED",
    succeeded: "SUCCEEDED",
    failed: "FAILED",
    canceled: "CANCELED",
  } as const;
  const state = states[observation.status as keyof typeof states];
  if (!state) throw new Error("REFUND_PROVIDER_OUTCOME_UNKNOWN");
  const body = {
    providerEventId: observation.providerEventId,
    refundId: observation.refundId,
    connectedAccount: observation.connectedAccount,
    paymentIntentId: observation.paymentIntentId,
    amountMinor: observation.amountMinor,
    currency: observation.currency,
    state,
    commandRequestHash: command.requestHash,
    merchantOfRecordLegalEntityId: command.merchantOfRecordLegalEntityId,
  };
  return Object.freeze({...body, outcomeSha256: digest(body)});
}

export function routeDisputeObservation(
  snapshot: RefundSellerSnapshot,
  input: Readonly<{
    providerEventId: string;
    connectedAccount: string;
    paymentIntentId: string;
    expectedPaymentIntentId: string;
    chargeId: string;
    expectedChargeId: string;
    eventType:
      | "charge.dispute.created"
      | "charge.dispute.updated"
      | "charge.dispute.closed";
    disputeId: string;
  }>,
) {
  if (
    input.connectedAccount !== snapshot.stripeConnectedAccountId ||
    input.paymentIntentId !== input.expectedPaymentIntentId ||
    input.chargeId !== input.expectedChargeId
  ) {
    throw new Error("DISPUTE_SELLER_SNAPSHOT_SCOPE_MISMATCH");
  }
  return Object.freeze({
    source: "stripe_connected_account_event" as const,
    providerEventId: input.providerEventId,
    disputeId: input.disputeId,
    eventType: input.eventType,
    connectedAccount: snapshot.stripeConnectedAccountId,
    partnerTenantId: snapshot.partnerTenantId,
    merchantOfRecordLegalEntityId: snapshot.operatorLegalEntityId,
    orderId: snapshot.orderId,
    snapshotId: snapshot.snapshotId,
    nextSafeAction: "OPEN_EXACT_CONNECTED_ACCOUNT_DISPUTE_CASE" as const,
    originalSaleRewritten: false as const,
    craysMoneyMovementAuthorized: false as const,
  });
}
