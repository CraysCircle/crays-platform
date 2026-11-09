import {createHash} from "node:crypto";

import {
  acceptRefundProviderObservation,
  type RefundSellerSnapshot,
  createRefundCommand,
} from "./refund-consequence-contract";

export const REFUND_DURABLE_COMMAND_VERSION = "ncrv2-137.persistence.v1" as const;

type RefundCommand = ReturnType<typeof createRefundCommand>;

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const requireIsoDate = (value: string, code: string) => {
  if (!Number.isFinite(Date.parse(value))) throw new Error(code);
  return value;
};

export function createRefundPersistenceEnvelope(input: Readonly<{
  refundCommandId: string;
  outboxId: string;
  command: RefundCommand;
  committedAt: string;
}>) {
  if (!input.refundCommandId.trim() || !input.outboxId.trim()) {
    throw new Error("REFUND_PERSISTENCE_ID_REQUIRED");
  }
  requireIsoDate(input.committedAt, "REFUND_COMMITTED_AT_INVALID");
  const commandRecord = Object.freeze({
    contractVersion: REFUND_DURABLE_COMMAND_VERSION,
    refundCommandId: input.refundCommandId,
    idempotencyKey: input.command.idempotencyKey,
    requestSha256: input.command.requestHash,
    orderId: input.command.orderId,
    orderSellerSnapshotId: input.command.snapshotId,
    orderSellerSnapshotSha256: input.command.snapshotSha256,
    partnerTenantId: input.command.partnerTenantId,
    operatorLegalEntityId: input.command.operatorLegalEntityId,
    storeId: input.command.storeId,
    stripeConnectedAccountId: input.command.connectedAccount,
    stripeEnvironment: input.command.stripeEnvironment,
    paymentIntentId: input.command.paymentIntentId,
    chargeId: input.command.chargeId,
    originalAmountMinor: input.command.originalAmountMinor,
    committedBeforeMinor: input.command.alreadyCommittedRefundAmountMinor,
    refundAmountMinor: input.command.refundAmountMinor,
    remainingAfterMinor: input.command.remainingAfterMinor,
    currency: input.command.currency,
    returnId: input.command.returnId,
    returnReceiptId: input.command.returnReceiptId,
    approvalReceiptId: input.command.approvalReceiptId,
    preflightSha256: input.command.preflightSha256,
    assuranceLevel: input.command.assuranceLevel,
    commandState: "committed" as const,
    committedAt: input.committedAt,
  });
  const outboxRecord = Object.freeze({
    refundOutboxId: input.outboxId,
    refundCommandId: input.refundCommandId,
    provider: "stripe_connected_account" as const,
    connectedAccountId: input.command.connectedAccount,
    idempotencyKey: input.command.idempotencyKey,
    requestPath: input.command.path,
    requestPayload: input.command.payload,
    requestSha256: input.command.requestHash,
    deliveryState: "pending" as const,
    attemptCount: 0,
    availableAt: input.committedAt,
  });
  return Object.freeze({
    commandRecord,
    outboxRecord,
    persistenceSha256: digest({commandRecord, outboxRecord}),
    currentStoreAssignmentRead: false as const,
    platformStripeAccountFallbackAllowed: false as const,
  });
}

export function prepareRefundDispatch(
  envelope: ReturnType<typeof createRefundPersistenceEnvelope>,
  input: Readonly<{
    attempt: number;
    requestedConnectedAccountOverride?: string;
    currentAssignmentConnectedAccountId?: string;
  }>,
) {
  if (!Number.isSafeInteger(input.attempt) || input.attempt < 1) {
    throw new Error("REFUND_DISPATCH_ATTEMPT_INVALID");
  }
  if (
    input.requestedConnectedAccountOverride &&
    input.requestedConnectedAccountOverride !== envelope.outboxRecord.connectedAccountId
  ) {
    throw new Error("REFUND_DISPATCH_TARGET_OVERRIDE_DENIED");
  }
  return Object.freeze({
    method: "POST" as const,
    path: "/v1/refunds" as const,
    connectedAccount: envelope.outboxRecord.connectedAccountId,
    idempotencyKey: envelope.outboxRecord.idempotencyKey,
    requestSha256: envelope.outboxRecord.requestSha256,
    payload: envelope.outboxRecord.requestPayload,
    attempt: input.attempt,
    state: "DISPATCH_PREPARED" as const,
    currentAssignmentIgnored:
      input.currentAssignmentConnectedAccountId !== undefined &&
      input.currentAssignmentConnectedAccountId !==
        envelope.outboxRecord.connectedAccountId,
  });
}

export function markRefundDispatchUncertain(
  envelope: ReturnType<typeof createRefundPersistenceEnvelope>,
  input: Readonly<{
    attemptedAt: string;
    reason: "timeout" | "connection_reset" | "response_unreadable";
  }>,
) {
  requireIsoDate(input.attemptedAt, "REFUND_ATTEMPTED_AT_INVALID");
  const body = {
    refundCommandId: envelope.commandRecord.refundCommandId,
    connectedAccountId: envelope.outboxRecord.connectedAccountId,
    idempotencyKey: envelope.outboxRecord.idempotencyKey,
    requestSha256: envelope.outboxRecord.requestSha256,
    deliveryState: "unknown_outcome" as const,
    attemptedAt: input.attemptedAt,
    reason: input.reason,
    retryAllowed: false as const,
    nextSafeAction: "RECONCILE_BY_CONNECTED_ACCOUNT_AND_IDEMPOTENCY_KEY" as const,
  };
  return Object.freeze({...body, receiptSha256: digest(body)});
}

export function acceptSignedRefundProviderEvent(
  command: RefundCommand,
  input: Readonly<{
    signatureVerified: boolean;
    eventCreatedAt: string;
    receivedAt: string;
    payloadSha256: string;
    providerEventId: string;
    connectedAccount: string;
    refundId: string;
    paymentIntentId: string;
    amountMinor: number;
    currency: string;
    status: string;
  }>,
) {
  if (!input.signatureVerified) throw new Error("REFUND_EVENT_SIGNATURE_INVALID");
  if (!/^[a-f0-9]{64}$/.test(input.payloadSha256)) {
    throw new Error("REFUND_EVENT_PAYLOAD_HASH_INVALID");
  }
  const createdAt = Date.parse(requireIsoDate(
    input.eventCreatedAt,
    "REFUND_EVENT_CREATED_AT_INVALID",
  ));
  const receivedAt = Date.parse(requireIsoDate(
    input.receivedAt,
    "REFUND_EVENT_RECEIVED_AT_INVALID",
  ));
  if (receivedAt < createdAt || receivedAt - createdAt > 300_000) {
    throw new Error("REFUND_EVENT_OUTSIDE_REPLAY_WINDOW");
  }
  const outcome = acceptRefundProviderObservation(command, input);
  return Object.freeze({
    ...outcome,
    signatureVerified: true as const,
    eventPayloadSha256: input.payloadSha256,
    eventCreatedAt: input.eventCreatedAt,
    receivedAt: input.receivedAt,
    duplicateMoneyMovementAuthorized: false as const,
  });
}

export function createRefundConsequencePlan(
  command: RefundCommand,
  providerOutcome: ReturnType<typeof acceptSignedRefundProviderEvent>,
  input: Readonly<{
    vendureRefundTransition: string;
    erpSiteId: string;
    erpCompanyId: string;
    erpWarehouseId: string;
    fiscalJurisdiction: string;
  }>,
) {
  if (providerOutcome.state !== "SUCCEEDED") {
    throw new Error("REFUND_CONSEQUENCE_REQUIRES_PROVIDER_SUCCESS");
  }
  if (
    input.vendureRefundTransition !== "RefundSettled" ||
    !input.erpSiteId.trim() ||
    !input.erpCompanyId.trim() ||
    !input.erpWarehouseId.trim() ||
    !input.fiscalJurisdiction.trim()
  ) {
    throw new Error("REFUND_CONSEQUENCE_TARGET_INVALID");
  }
  const common = {
    refundCommandId: digest({
      requestHash: command.requestHash,
      refundId: providerOutcome.refundId,
    }),
    orderId: command.orderId,
    snapshotId: command.snapshotId,
    snapshotSha256: command.snapshotSha256,
    partnerTenantId: command.partnerTenantId,
    operatorLegalEntityId: command.operatorLegalEntityId,
    storeId: command.storeId,
    refundId: providerOutcome.refundId,
    refundAmountMinor: command.refundAmountMinor,
    currency: command.currency,
  };
  const vendurePayload = {
    ...common,
    transition: input.vendureRefundTransition,
    returnId: command.returnId,
  };
  const erpPayload = {
    ...common,
    erpSiteId: input.erpSiteId,
    erpCompanyId: input.erpCompanyId,
    erpWarehouseId: input.erpWarehouseId,
    fiscalJurisdiction: input.fiscalJurisdiction,
    command: "create_credit_note_and_apply_refund_settlement" as const,
  };
  return Object.freeze({
    vendure: Object.freeze({
      targetAuthority: "vendure" as const,
      consequenceType: "vendure_refund_state" as const,
      idempotencyKey: `refund:${command.requestHash}:vendure`,
      payload: vendurePayload,
      payloadSha256: digest(vendurePayload),
      state: "pending" as const,
    }),
    erpnext: Object.freeze({
      targetAuthority: "erpnext" as const,
      consequenceType: "erp_credit_note_and_settlement" as const,
      idempotencyKey: `refund:${command.requestHash}:erpnext`,
      payload: erpPayload,
      payloadSha256: digest(erpPayload),
      state: "pending" as const,
    }),
    currentAssignmentRead: false as const,
  });
}

export function adjudicateRefundConsequenceAcknowledgement(
  plan: ReturnType<typeof createRefundConsequencePlan>,
  input: Readonly<{
    targetAuthority: "vendure" | "erpnext";
    idempotencyKey: string;
    payloadSha256: string;
    outcome:
      | "acknowledged"
      | "retryable_failure"
      | "permanent_failure"
      | "unknown";
    acknowledgementId?: string;
    documentReferences?: readonly string[];
    errorCode?: string;
  }>,
) {
  const expected = input.targetAuthority === "vendure" ? plan.vendure : plan.erpnext;
  if (
    input.idempotencyKey !== expected.idempotencyKey ||
    input.payloadSha256 !== expected.payloadSha256
  ) {
    throw new Error("REFUND_CONSEQUENCE_ACK_SCOPE_MISMATCH");
  }
  if (input.outcome === "acknowledged" && !input.acknowledgementId?.trim()) {
    throw new Error("REFUND_CONSEQUENCE_ACK_ID_REQUIRED");
  }
  const state = input.outcome === "acknowledged"
    ? "acknowledged"
    : input.outcome === "retryable_failure"
      ? "retryable_failure"
      : input.outcome === "permanent_failure"
        ? "permanent_failure"
        : "unknown_outcome";
  const body = {
    targetAuthority: input.targetAuthority,
    idempotencyKey: input.idempotencyKey,
    payloadSha256: input.payloadSha256,
    state,
    acknowledgementId: input.acknowledgementId ?? null,
    documentReferences: [...(input.documentReferences ?? [])],
    errorCode: input.errorCode ?? null,
    retryAllowed: input.outcome === "retryable_failure",
    reconciliationRequired: input.outcome === "unknown",
  };
  return Object.freeze({...body, receiptSha256: digest(body)});
}

export function assertSnapshotUnchanged(
  snapshot: RefundSellerSnapshot,
  command: RefundCommand,
) {
  if (
    snapshot.snapshotId !== command.snapshotId ||
    snapshot.snapshotSha256 !== command.snapshotSha256 ||
    snapshot.partnerTenantId !== command.partnerTenantId ||
    snapshot.operatorLegalEntityId !== command.operatorLegalEntityId ||
    snapshot.storeId !== command.storeId ||
    snapshot.stripeConnectedAccountId !== command.connectedAccount
  ) {
    throw new Error("REFUND_DURABLE_SNAPSHOT_SCOPE_MISMATCH");
  }
  return true as const;
}
