import "server-only";

import { createHash } from "node:crypto";

import type { ClaimedHotelTwentySummary } from "./hotel-twenty-crm-summary-outbox-repository";

type ObservationBase = Readonly<{
  observedAt: string;
  summarySha256: string;
}>;

export type HotelTwentyCrmDeliveryObservation =
  | (ObservationBase & Readonly<{ kind: "provider_not_bound" }>)
  | (ObservationBase &
      Readonly<{
        kind: "confirmed_not_applied_retryable";
        failureCode: string;
        notAppliedEvidenceSha256: string;
        retryAfterSeconds: number;
      }>)
  | (ObservationBase &
      Readonly<{
        kind: "unknown_outcome";
        failureCode: string;
        transportEvidenceSha256: string;
      }>)
  | (ObservationBase &
      Readonly<{
        kind: "acknowledged";
        twentyObjectRefSha256: string;
        adapterReceiptSha256: string;
      }>)
  | (ObservationBase &
      Readonly<{
        kind: "reconciled";
        twentyObjectRefSha256: string;
        adapterReceiptSha256: string;
        reconciliationReceiptSha256: string;
      }>)
  | (ObservationBase &
      Readonly<{
        kind: "permanent_failure";
        failureCode: string;
        failureReceiptSha256: string;
      }>);

export type HotelTwentyCrmReconciliationPlan = Readonly<{
  state:
    | "provider_not_bound"
    | "retry"
    | "reconcile_required"
    | "delivered"
    | "reconciled"
    | "failed";
  nextSafeAction:
    | "await_provider_binding"
    | "eligible_for_guarded_retry"
    | "reconcile_before_retry"
    | "read_back_provider_state"
    | "none"
    | "manual_review";
  retryEligible: boolean;
  reconciliationRequired: boolean;
  providerDeliveryClaimed: boolean;
  providerCallAuthorizedByPlan: false;
  providerCallPerformed: false;
  databaseWriteAuthorizedByPlan: false;
  databaseWritePerformed: false;
  productionApplied: false;
  retryAfterSeconds: number | null;
  evidenceSha256: string;
}>;

const SHA256 = /^[a-f0-9]{64}$/;

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function requiredSha(value: string, field: string): string {
  if (!SHA256.test(value)) throw new Error(`HOTEL_TWENTY_${field}_INVALID`);
  return value;
}

function requiredCode(value: string): string {
  const normalized = value.trim();
  if (!/^[A-Z0-9_:-]{3,120}$/.test(normalized)) {
    throw new Error("HOTEL_TWENTY_FAILURE_CODE_INVALID");
  }
  return normalized;
}

function exactInstant(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error("HOTEL_TWENTY_OBSERVED_AT_INVALID");
  }
  return value;
}

function commonPlan(
  material: Record<string, unknown>,
): Pick<
  HotelTwentyCrmReconciliationPlan,
  | "providerCallAuthorizedByPlan"
  | "providerCallPerformed"
  | "databaseWriteAuthorizedByPlan"
  | "databaseWritePerformed"
  | "productionApplied"
  | "evidenceSha256"
> {
  return {
    providerCallAuthorizedByPlan: false,
    providerCallPerformed: false,
    databaseWriteAuthorizedByPlan: false,
    databaseWritePerformed: false,
    productionApplied: false,
    evidenceSha256: sha256(material),
  };
}

export function planHotelTwentyCrmSummaryDeliveryReconciliation(
  claimed: ClaimedHotelTwentySummary,
  observation: HotelTwentyCrmDeliveryObservation,
): HotelTwentyCrmReconciliationPlan {
  if (
    !claimed.outboxId ||
    !claimed.leaseToken ||
    !Number.isSafeInteger(claimed.attemptNumber) ||
    claimed.attemptNumber < 1
  ) {
    throw new Error("HOTEL_TWENTY_CLAIM_INVALID");
  }
  const summarySha256 = requiredSha(observation.summarySha256, "SUMMARY_SHA256");
  if (summarySha256 !== claimed.summarySha256) {
    throw new Error("HOTEL_TWENTY_SUMMARY_EVIDENCE_MISMATCH");
  }
  const observedAt = exactInstant(observation.observedAt);
  const baseEvidence = {
    outboxId: claimed.outboxId,
    attemptNumber: claimed.attemptNumber,
    summarySha256,
    observationKind: observation.kind,
    observedAt,
  };

  if (observation.kind === "provider_not_bound") {
    return Object.freeze({
      state: "provider_not_bound",
      nextSafeAction: "await_provider_binding",
      retryEligible: false,
      reconciliationRequired: false,
      providerDeliveryClaimed: false,
      retryAfterSeconds: null,
      ...commonPlan(baseEvidence),
    });
  }

  if (observation.kind === "confirmed_not_applied_retryable") {
    const failureCode = requiredCode(observation.failureCode);
    const notAppliedEvidenceSha256 = requiredSha(
      observation.notAppliedEvidenceSha256,
      "NOT_APPLIED_EVIDENCE_SHA256",
    );
    if (
      !Number.isSafeInteger(observation.retryAfterSeconds) ||
      observation.retryAfterSeconds < 5 ||
      observation.retryAfterSeconds > 86400
    ) {
      throw new Error("HOTEL_TWENTY_RETRY_AFTER_SECONDS_INVALID");
    }
    return Object.freeze({
      state: "retry",
      nextSafeAction: "eligible_for_guarded_retry",
      retryEligible: true,
      reconciliationRequired: false,
      providerDeliveryClaimed: false,
      retryAfterSeconds: observation.retryAfterSeconds,
      ...commonPlan({
        ...baseEvidence,
        failureCode,
        notAppliedEvidenceSha256,
        retryAfterSeconds: observation.retryAfterSeconds,
      }),
    });
  }

  if (observation.kind === "unknown_outcome") {
    const failureCode = requiredCode(observation.failureCode);
    const transportEvidenceSha256 = requiredSha(
      observation.transportEvidenceSha256,
      "TRANSPORT_EVIDENCE_SHA256",
    );
    return Object.freeze({
      state: "reconcile_required",
      nextSafeAction: "reconcile_before_retry",
      retryEligible: false,
      reconciliationRequired: true,
      providerDeliveryClaimed: false,
      retryAfterSeconds: null,
      ...commonPlan({ ...baseEvidence, failureCode, transportEvidenceSha256 }),
    });
  }

  if (observation.kind === "acknowledged") {
    const twentyObjectRefSha256 = requiredSha(
      observation.twentyObjectRefSha256,
      "OBJECT_REFERENCE_SHA256",
    );
    const adapterReceiptSha256 = requiredSha(
      observation.adapterReceiptSha256,
      "ADAPTER_RECEIPT_SHA256",
    );
    return Object.freeze({
      state: "delivered",
      nextSafeAction: "read_back_provider_state",
      retryEligible: false,
      reconciliationRequired: true,
      providerDeliveryClaimed: true,
      retryAfterSeconds: null,
      ...commonPlan({
        ...baseEvidence,
        twentyObjectRefSha256,
        adapterReceiptSha256,
      }),
    });
  }

  if (observation.kind === "reconciled") {
    const twentyObjectRefSha256 = requiredSha(
      observation.twentyObjectRefSha256,
      "OBJECT_REFERENCE_SHA256",
    );
    const adapterReceiptSha256 = requiredSha(
      observation.adapterReceiptSha256,
      "ADAPTER_RECEIPT_SHA256",
    );
    const reconciliationReceiptSha256 = requiredSha(
      observation.reconciliationReceiptSha256,
      "RECONCILIATION_RECEIPT_SHA256",
    );
    return Object.freeze({
      state: "reconciled",
      nextSafeAction: "none",
      retryEligible: false,
      reconciliationRequired: false,
      providerDeliveryClaimed: true,
      retryAfterSeconds: null,
      ...commonPlan({
        ...baseEvidence,
        twentyObjectRefSha256,
        adapterReceiptSha256,
        reconciliationReceiptSha256,
      }),
    });
  }

  const failureCode = requiredCode(observation.failureCode);
  const failureReceiptSha256 = requiredSha(
    observation.failureReceiptSha256,
    "FAILURE_RECEIPT_SHA256",
  );
  return Object.freeze({
    state: "failed",
    nextSafeAction: "manual_review",
    retryEligible: false,
    reconciliationRequired: false,
    providerDeliveryClaimed: false,
    retryAfterSeconds: null,
    ...commonPlan({ ...baseEvidence, failureCode, failureReceiptSha256 }),
  });
}
