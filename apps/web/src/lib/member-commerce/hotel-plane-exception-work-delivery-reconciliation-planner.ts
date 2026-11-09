import "server-only";

import { createHash } from "node:crypto";

import type { ClaimedHotelPlaneExceptionWork } from "./hotel-plane-exception-work-outbox-repository";

type BaseObservation = Readonly<{
  observedAt: string;
  payloadSha256: string;
}>;

export type HotelPlaneDeliveryObservation =
  | (BaseObservation & Readonly<{ kind: "provider_not_bound" }>)
  | (BaseObservation &
      Readonly<{
        kind: "confirmed_not_applied_retryable";
        failureCode: string;
        notAppliedEvidenceSha256: string;
        retryAfterSeconds: number;
      }>)
  | (BaseObservation &
      Readonly<{
        kind: "unknown_outcome";
        failureCode: string;
        transportEvidenceSha256: string;
      }>)
  | (BaseObservation &
      Readonly<{
        kind: "acknowledged";
        planeWorkRefSha256: string;
        adapterReceiptSha256: string;
      }>)
  | (BaseObservation &
      Readonly<{
        kind: "reconciled";
        planeWorkRefSha256: string;
        adapterReceiptSha256: string;
        statusObservationReceiptSha256: string;
      }>)
  | (BaseObservation &
      Readonly<{
        kind: "permanent_failure";
        failureCode: string;
        failureReceiptSha256: string;
      }>);

export type HotelPlaneDeliveryReconciliationPlan = Readonly<{
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
    | "read_back_plane_status"
    | "none"
    | "manual_review";
  retryEligible: boolean;
  reconciliationRequired: boolean;
  providerDeliveryClaimed: boolean;
  providerCallAuthorizedByPlan: false;
  providerCallPerformed: false;
  databaseWriteAuthorizedByPlan: false;
  databaseWritePerformed: false;
  bookingMutationAuthorized: false;
  productionApplied: false;
  retryAfterSeconds: number | null;
  evidenceSha256: string;
}>;

const SHA256 = /^[a-f0-9]{64}$/;

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function exactSha(value: string, field: string): string {
  if (!SHA256.test(value)) throw new Error(`HOTEL_PLANE_${field}_INVALID`);
  return value;
}

function exactCode(value: string): string {
  const normalized = value.trim();
  if (!/^[A-Z0-9_:-]{3,120}$/.test(normalized)) {
    throw new Error("HOTEL_PLANE_FAILURE_CODE_INVALID");
  }
  return normalized;
}

function exactInstant(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error("HOTEL_PLANE_OBSERVED_AT_INVALID");
  }
  return value;
}

function safetyBoundary(material: Record<string, unknown>) {
  return {
    providerCallAuthorizedByPlan: false as const,
    providerCallPerformed: false as const,
    databaseWriteAuthorizedByPlan: false as const,
    databaseWritePerformed: false as const,
    bookingMutationAuthorized: false as const,
    productionApplied: false as const,
    evidenceSha256: digest(material),
  };
}

export function planHotelPlaneExceptionWorkDeliveryReconciliation(
  claimed: ClaimedHotelPlaneExceptionWork,
  observation: HotelPlaneDeliveryObservation,
): HotelPlaneDeliveryReconciliationPlan {
  if (
    !claimed.outboxId ||
    !claimed.leaseToken ||
    !Number.isSafeInteger(claimed.attemptNumber) ||
    claimed.attemptNumber < 1
  ) {
    throw new Error("HOTEL_PLANE_CLAIM_INVALID");
  }
  const payloadSha256 = exactSha(observation.payloadSha256, "PAYLOAD_SHA256");
  if (payloadSha256 !== claimed.payloadSha256) {
    throw new Error("HOTEL_PLANE_PAYLOAD_EVIDENCE_MISMATCH");
  }
  const observedAt = exactInstant(observation.observedAt);
  const baseEvidence = {
    outboxId: claimed.outboxId,
    attemptNumber: claimed.attemptNumber,
    payloadSha256,
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
      ...safetyBoundary(baseEvidence),
    });
  }

  if (observation.kind === "confirmed_not_applied_retryable") {
    const failureCode = exactCode(observation.failureCode);
    const notAppliedEvidenceSha256 = exactSha(
      observation.notAppliedEvidenceSha256,
      "NOT_APPLIED_EVIDENCE_SHA256",
    );
    if (
      !Number.isSafeInteger(observation.retryAfterSeconds) ||
      observation.retryAfterSeconds < 5 ||
      observation.retryAfterSeconds > 86400
    ) {
      throw new Error("HOTEL_PLANE_RETRY_AFTER_SECONDS_INVALID");
    }
    return Object.freeze({
      state: "retry",
      nextSafeAction: "eligible_for_guarded_retry",
      retryEligible: true,
      reconciliationRequired: false,
      providerDeliveryClaimed: false,
      retryAfterSeconds: observation.retryAfterSeconds,
      ...safetyBoundary({
        ...baseEvidence,
        failureCode,
        notAppliedEvidenceSha256,
        retryAfterSeconds: observation.retryAfterSeconds,
      }),
    });
  }

  if (observation.kind === "unknown_outcome") {
    const failureCode = exactCode(observation.failureCode);
    const transportEvidenceSha256 = exactSha(
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
      ...safetyBoundary({ ...baseEvidence, failureCode, transportEvidenceSha256 }),
    });
  }

  if (observation.kind === "acknowledged") {
    const planeWorkRefSha256 = exactSha(
      observation.planeWorkRefSha256,
      "WORK_REFERENCE_SHA256",
    );
    const adapterReceiptSha256 = exactSha(
      observation.adapterReceiptSha256,
      "ADAPTER_RECEIPT_SHA256",
    );
    return Object.freeze({
      state: "delivered",
      nextSafeAction: "read_back_plane_status",
      retryEligible: false,
      reconciliationRequired: true,
      providerDeliveryClaimed: true,
      retryAfterSeconds: null,
      ...safetyBoundary({ ...baseEvidence, planeWorkRefSha256, adapterReceiptSha256 }),
    });
  }

  if (observation.kind === "reconciled") {
    const planeWorkRefSha256 = exactSha(
      observation.planeWorkRefSha256,
      "WORK_REFERENCE_SHA256",
    );
    const adapterReceiptSha256 = exactSha(
      observation.adapterReceiptSha256,
      "ADAPTER_RECEIPT_SHA256",
    );
    const statusObservationReceiptSha256 = exactSha(
      observation.statusObservationReceiptSha256,
      "STATUS_OBSERVATION_RECEIPT_SHA256",
    );
    return Object.freeze({
      state: "reconciled",
      nextSafeAction: "none",
      retryEligible: false,
      reconciliationRequired: false,
      providerDeliveryClaimed: true,
      retryAfterSeconds: null,
      ...safetyBoundary({
        ...baseEvidence,
        planeWorkRefSha256,
        adapterReceiptSha256,
        statusObservationReceiptSha256,
      }),
    });
  }

  const failureCode = exactCode(observation.failureCode);
  const failureReceiptSha256 = exactSha(
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
    ...safetyBoundary({ ...baseEvidence, failureCode, failureReceiptSha256 }),
  });
}
