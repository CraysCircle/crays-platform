import "server-only";

import {
  prepareBookingRevenueErpDispatchPreflight,
  type BookingRevenueErpDispatchPreflight,
  type ErpBindingReceipt,
  type ErpRevenueExecutionAuthorization,
  type SecureErpPayloadReceipt,
} from "./booking-revenue-erp-dispatch-preflight";
import {
  claimBookingRevenueErpEventV2,
  type BookingRevenueErpClaimDatabase,
} from "./booking-revenue-erp-claim-worker-v2";
import type { BookingRevenueErpBridgeOutput } from "./booking-revenue-to-erp-enqueue-bridge";
import {
  normalizeBookingRevenueErpAdapterResult,
  type NormalizedBookingRevenueErpResult,
  type RawBookingRevenueErpAdapterResult,
} from "./booking-revenue-erp-result-normalizer";
import {
  persistBookingRevenueErpResult,
  type BookingRevenueErpResultRepositoryOutput,
  type BookingRevenueErpSqlPool,
} from "./booking-revenue-erp-result-repository";

export type BookingRevenueErpSequenceAdapter = Readonly<{
  exportBookingRevenue: (
    preflight: BookingRevenueErpDispatchPreflight,
  ) => Promise<RawBookingRevenueErpAdapterResult>;
}>;

export type BookingRevenueErpSequenceDependencies = Readonly<{
  enqueue: () => Promise<BookingRevenueErpBridgeOutput>;
  claimDatabase: BookingRevenueErpClaimDatabase;
  adapter: BookingRevenueErpSequenceAdapter;
  resultPool: BookingRevenueErpSqlPool;
}>;

export type BookingRevenueErpSequenceClaimInput = Readonly<{
  tenantId: string;
  workerId: string;
  now: Date;
  leaseSeconds: number;
}>;

export type BookingRevenueErpSequenceOutput = Readonly<{
  preflight: BookingRevenueErpDispatchPreflight;
  normalizedResult: NormalizedBookingRevenueErpResult;
  persistence: BookingRevenueErpResultRepositoryOutput;
}>;

function reject(code: string): never {
  throw new Error("CCLUB_ERP_SEQUENCE_" + code);
}

function exact(left: string | number, right: string | number, label: string): void {
  if (left !== right) reject(label + "_MISMATCH");
}

function instant(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) reject(label + "_INVALID");
  return parsed;
}

export async function runBookingRevenueErpSequence(input: Readonly<{
  dependencies: BookingRevenueErpSequenceDependencies;
  claim: BookingRevenueErpSequenceClaimInput;
  authorization: ErpRevenueExecutionAuthorization;
  binding: ErpBindingReceipt;
  payload: SecureErpPayloadReceipt;
  preparedAt: string;
}>): Promise<BookingRevenueErpSequenceOutput> {
  const bridge = await input.dependencies.enqueue();
  const claim = await claimBookingRevenueErpEventV2({
    database: input.dependencies.claimDatabase,
    tenantId: input.claim.tenantId,
    workerId: input.claim.workerId,
    now: input.claim.now,
    leaseSeconds: input.claim.leaseSeconds,
  });
  if (!claim) reject("NO_CLAIM");

  exact(bridge.outboxId, claim.eventId, "BRIDGE_EVENT");
  exact(bridge.postingBatchId, claim.postingBatchId, "POSTING_BATCH");
  exact(bridge.bookingReferenceSha256, claim.bookingReferenceSha256, "BOOKING_REFERENCE");
  exact(bridge.payloadSha256, claim.payloadSha256, "PAYLOAD");
  exact(
    bridge.allocationReceipt.allocationReceiptId,
    claim.allocationReceiptId,
    "ALLOCATION_RECEIPT_ID",
  );
  exact(
    bridge.allocationReceipt.allocationReceiptSha256,
    claim.allocationReceiptSha256,
    "ALLOCATION_RECEIPT_SHA256",
  );
  exact(bridge.allocationReceipt.sourceEventId, claim.eventId, "ALLOCATION_SOURCE_EVENT");
  exact(
    bridge.allocationReceipt.sourceEventSha256,
    claim.eventSha256,
    "ALLOCATION_SOURCE_HASH",
  );

  const preflight = prepareBookingRevenueErpDispatchPreflight({
    event: claim,
    allocation: bridge.allocationReceipt,
    authorization: input.authorization,
    binding: input.binding,
    payload: input.payload,
    preparedAt: input.preparedAt,
  });

  const rawResult = await input.dependencies.adapter.exportBookingRevenue(preflight);
  exact(rawResult.adapterId, preflight.adapterId, "ADAPTER_ID");
  const dispatchedAt = instant(rawResult.requestDispatchedAt, "DISPATCHED_AT");
  const completedAt = instant(rawResult.completedAt, "COMPLETED_AT");
  const preparedAt = instant(preflight.preparedAt, "PREPARED_AT");
  const leaseExpiresAt = instant(claim.leaseExpiresAt, "LEASE_EXPIRES_AT");
  if (dispatchedAt < preparedAt) reject("DISPATCH_BEFORE_PREFLIGHT");
  if (completedAt >= leaseExpiresAt) reject("RESULT_AFTER_LEASE_EXPIRY");

  const normalizedResult = normalizeBookingRevenueErpAdapterResult(preflight, rawResult);
  const persistence = await persistBookingRevenueErpResult(
    input.dependencies.resultPool,
    normalizedResult,
  );
  exact(persistence.eventId, normalizedResult.eventId, "PERSISTED_EVENT");

  const expectedState =
    normalizedResult.kind === "ACCEPTED"
      ? "ACKNOWLEDGED"
      : normalizedResult.kind === "RETRYABLE_ERROR"
        ? "RETRY"
        : "DEAD_LETTER";
  exact(persistence.state, expectedState, "PERSISTED_STATE");

  return Object.freeze({ preflight, normalizedResult, persistence });
}
