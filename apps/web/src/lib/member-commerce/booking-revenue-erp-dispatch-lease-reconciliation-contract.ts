import "server-only";

import { createHash } from "node:crypto";

const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,255}$/;

export type BookingRevenueErpOutboxState =
  | "PENDING"
  | "LEASED"
  | "RETRY"
  | "ACKNOWLEDGED"
  | "REJECTED"
  | "DEAD_LETTER";

export type BookingRevenueErpLeaseSnapshot = Readonly<{
  tenantId: string;
  eventId: string;
  idempotencyKey: string;
  payloadSha256: string;
  state: BookingRevenueErpOutboxState;
  attemptNumber: number;
  leaseOwner: string | null;
  leaseId: string | null;
  leaseVersion: number;
  leaseExpiresAt: string | null;
  nextAttemptAt: string;
  lastErrorCode: string | null;
}>;

export type BookingRevenueErpTrustedProviderReceipt = Readonly<{
  attemptNumber: number;
  leaseId: string;
  leaseVersion: number;
  normalizedKind: "ACCEPTED" | "RETRYABLE_ERROR" | "TERMINAL_ERROR";
  providerReceiptSha256: string;
  requestSha256: string;
  responseSha256: string;
  externalDocumentReferenceSha256: string | null;
  observedAt: string;
}>;

export type BookingRevenueErpLeaseReconciliationPlan = Readonly<{
  decision:
    | "claim_initial"
    | "claim_proven_retry"
    | "wait_until_due"
    | "wait_active_lease"
    | "reconcile_required"
    | "finalized";
  reason:
    | "initial_attempt_due"
    | "trusted_retryable_receipt_due"
    | "not_due"
    | "active_lease"
    | "expired_lease_unknown_outcome"
    | "retry_receipt_missing_or_conflicting"
    | "prior_attempt_without_receipt"
    | "acknowledged_with_trusted_ack"
    | "terminal_state"
    | "final_state_receipt_missing_or_conflicting";
  claimEligible: boolean;
  retryEligible: boolean;
  reconciliationRequired: boolean;
  providerDeliveryClaimed: boolean;
  blindRetryPrevented: boolean;
  providerCallAuthorizedByPlan: false;
  providerCallPerformed: false;
  databaseMutationPerformed: false;
  evidenceSha256: string;
}>;

function reject(code: string): never {
  throw new Error(`CCLUB_ERP_LEASE_RECONCILIATION_${code}`);
}

function identifier(value: string, label: string): string {
  if (!SAFE_ID.test(value)) reject(`${label}_INVALID`);
  return value;
}

function hash(value: string, label: string): string {
  if (!SHA256.test(value)) reject(`${label}_INVALID`);
  return value;
}

function instant(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) reject(`${label}_INVALID`);
  return parsed;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonical(nested)}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) reject("CANONICAL_VALUE_INVALID");
  return serialized;
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function plan(
  material: Record<string, unknown>,
  values: Omit<
    BookingRevenueErpLeaseReconciliationPlan,
    | "providerCallAuthorizedByPlan"
    | "providerCallPerformed"
    | "databaseMutationPerformed"
    | "evidenceSha256"
  >,
): BookingRevenueErpLeaseReconciliationPlan {
  return Object.freeze({
    ...values,
    providerCallAuthorizedByPlan: false,
    providerCallPerformed: false,
    databaseMutationPerformed: false,
    evidenceSha256: digest(material),
  });
}

function validateReceipt(
  receipt: BookingRevenueErpTrustedProviderReceipt,
): BookingRevenueErpTrustedProviderReceipt {
  if (!Number.isSafeInteger(receipt.attemptNumber) || receipt.attemptNumber < 1) {
    reject("RECEIPT_ATTEMPT_INVALID");
  }
  if (!Number.isSafeInteger(receipt.leaseVersion) || receipt.leaseVersion < 1) {
    reject("RECEIPT_LEASE_VERSION_INVALID");
  }
  identifier(receipt.leaseId, "RECEIPT_LEASE_ID");
  hash(receipt.providerReceiptSha256, "PROVIDER_RECEIPT_SHA256");
  hash(receipt.requestSha256, "REQUEST_SHA256");
  hash(receipt.responseSha256, "RESPONSE_SHA256");
  instant(receipt.observedAt, "RECEIPT_OBSERVED_AT");
  if (receipt.normalizedKind === "ACCEPTED") {
    if (!receipt.externalDocumentReferenceSha256) reject("ACCEPTED_REFERENCE_REQUIRED");
    hash(receipt.externalDocumentReferenceSha256, "ACCEPTED_REFERENCE_SHA256");
  } else if (receipt.externalDocumentReferenceSha256 !== null) {
    reject("NON_ACCEPTED_REFERENCE_FORBIDDEN");
  }
  return receipt;
}

function receiptMatches(
  snapshot: BookingRevenueErpLeaseSnapshot,
  receipt: BookingRevenueErpTrustedProviderReceipt | null,
  kind: BookingRevenueErpTrustedProviderReceipt["normalizedKind"],
): receipt is BookingRevenueErpTrustedProviderReceipt {
  if (!receipt) return false;
  validateReceipt(receipt);
  return (
    receipt.normalizedKind === kind &&
    receipt.attemptNumber === snapshot.attemptNumber &&
    receipt.leaseVersion === snapshot.leaseVersion
  );
}

export function planBookingRevenueErpDispatchLeaseReconciliation(input: Readonly<{
  snapshot: BookingRevenueErpLeaseSnapshot;
  trustedReceipt: BookingRevenueErpTrustedProviderReceipt | null;
  observedAt: string;
}>): BookingRevenueErpLeaseReconciliationPlan {
  const snapshot = input.snapshot;
  const observedAt = instant(input.observedAt, "OBSERVED_AT");
  [snapshot.tenantId, snapshot.eventId, snapshot.idempotencyKey].forEach((value, index) =>
    identifier(value, `SNAPSHOT_ID_${index}`),
  );
  hash(snapshot.payloadSha256, "PAYLOAD_SHA256");
  if (!Number.isSafeInteger(snapshot.attemptNumber) || snapshot.attemptNumber < 0) {
    reject("ATTEMPT_INVALID");
  }
  if (!Number.isSafeInteger(snapshot.leaseVersion) || snapshot.leaseVersion < 0) {
    reject("LEASE_VERSION_INVALID");
  }
  const nextAttemptAt = instant(snapshot.nextAttemptAt, "NEXT_ATTEMPT_AT");
  const leased = snapshot.state === "LEASED";
  if (
    leased !==
    Boolean(snapshot.leaseOwner && snapshot.leaseId && snapshot.leaseExpiresAt)
  ) {
    reject("LEASE_SHAPE_INVALID");
  }
  if (leased) {
    identifier(snapshot.leaseOwner!, "LEASE_OWNER");
    identifier(snapshot.leaseId!, "LEASE_ID");
    if (snapshot.attemptNumber < 1 || snapshot.leaseVersion < 1) {
      reject("LEASE_COUNTER_INVALID");
    }
    const leaseExpiresAt = instant(snapshot.leaseExpiresAt!, "LEASE_EXPIRES_AT");
    if (leaseExpiresAt <= observedAt) {
      return plan(
        { snapshot, trustedReceipt: input.trustedReceipt, observedAt: input.observedAt },
        {
          decision: "reconcile_required",
          reason: "expired_lease_unknown_outcome",
          claimEligible: false,
          retryEligible: false,
          reconciliationRequired: true,
          providerDeliveryClaimed: false,
          blindRetryPrevented: true,
        },
      );
    }
    return plan(
      { snapshot, observedAt: input.observedAt },
      {
        decision: "wait_active_lease",
        reason: "active_lease",
        claimEligible: false,
        retryEligible: false,
        reconciliationRequired: false,
        providerDeliveryClaimed: false,
        blindRetryPrevented: true,
      },
    );
  }

  if (snapshot.state === "PENDING") {
    if (nextAttemptAt > observedAt) {
      return plan(
        { snapshot, observedAt: input.observedAt },
        {
          decision: "wait_until_due",
          reason: "not_due",
          claimEligible: false,
          retryEligible: false,
          reconciliationRequired: false,
          providerDeliveryClaimed: false,
          blindRetryPrevented: true,
        },
      );
    }
    if (snapshot.attemptNumber !== 0 || snapshot.leaseVersion !== 0 || input.trustedReceipt) {
      return plan(
        { snapshot, trustedReceipt: input.trustedReceipt, observedAt: input.observedAt },
        {
          decision: "reconcile_required",
          reason: "prior_attempt_without_receipt",
          claimEligible: false,
          retryEligible: false,
          reconciliationRequired: true,
          providerDeliveryClaimed: false,
          blindRetryPrevented: true,
        },
      );
    }
    return plan(
      { snapshot, observedAt: input.observedAt },
      {
        decision: "claim_initial",
        reason: "initial_attempt_due",
        claimEligible: true,
        retryEligible: false,
        reconciliationRequired: false,
        providerDeliveryClaimed: false,
        blindRetryPrevented: true,
      },
    );
  }

  if (snapshot.state === "RETRY") {
    const trustedRetry = receiptMatches(snapshot, input.trustedReceipt, "RETRYABLE_ERROR");
    if (!trustedRetry) {
      return plan(
        { snapshot, trustedReceipt: input.trustedReceipt, observedAt: input.observedAt },
        {
          decision: "reconcile_required",
          reason: "retry_receipt_missing_or_conflicting",
          claimEligible: false,
          retryEligible: false,
          reconciliationRequired: true,
          providerDeliveryClaimed: false,
          blindRetryPrevented: true,
        },
      );
    }
    if (nextAttemptAt > observedAt) {
      return plan(
        { snapshot, trustedReceipt: input.trustedReceipt, observedAt: input.observedAt },
        {
          decision: "wait_until_due",
          reason: "not_due",
          claimEligible: false,
          retryEligible: true,
          reconciliationRequired: false,
          providerDeliveryClaimed: false,
          blindRetryPrevented: true,
        },
      );
    }
    return plan(
      { snapshot, trustedReceipt: input.trustedReceipt, observedAt: input.observedAt },
      {
        decision: "claim_proven_retry",
        reason: "trusted_retryable_receipt_due",
        claimEligible: true,
        retryEligible: true,
        reconciliationRequired: false,
        providerDeliveryClaimed: false,
        blindRetryPrevented: true,
      },
    );
  }

  if (snapshot.state === "ACKNOWLEDGED") {
    const trustedAck = receiptMatches(snapshot, input.trustedReceipt, "ACCEPTED");
    return plan(
      { snapshot, trustedReceipt: input.trustedReceipt, observedAt: input.observedAt },
      trustedAck
        ? {
            decision: "finalized",
            reason: "acknowledged_with_trusted_ack",
            claimEligible: false,
            retryEligible: false,
            reconciliationRequired: false,
            providerDeliveryClaimed: true,
            blindRetryPrevented: true,
          }
        : {
            decision: "reconcile_required",
            reason: "final_state_receipt_missing_or_conflicting",
            claimEligible: false,
            retryEligible: false,
            reconciliationRequired: true,
            providerDeliveryClaimed: false,
            blindRetryPrevented: true,
          },
    );
  }

  return plan(
    { snapshot, trustedReceipt: input.trustedReceipt, observedAt: input.observedAt },
    {
      decision: "finalized",
      reason: "terminal_state",
      claimEligible: false,
      retryEligible: false,
      reconciliationRequired: false,
      providerDeliveryClaimed: false,
      blindRetryPrevented: true,
    },
  );
}
