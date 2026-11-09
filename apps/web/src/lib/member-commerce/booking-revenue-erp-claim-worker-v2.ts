import "server-only";

import type { ClaimedBookingFinanceOutboxEvent } from "./booking-revenue-erp-dispatch-preflight";
import {
  claimBookingRevenueErpEventWithReceiptFence,
  type BookingRevenueErpLeaseDatabase,
  type BookingRevenueErpLeaseSqlClient,
} from "./booking-revenue-erp-dispatch-lease-reconciliation-repository";

export type ClaimedBookingRevenueErpEventV2 = ClaimedBookingFinanceOutboxEvent &
  Readonly<{
    idempotencyKey: string;
    postingBatchId: string;
    erpTargetKind: string;
    payloadSha256: string;
    allocationReceiptId: string;
    allocationReceiptSha256: string;
  }>;

export type BookingRevenueErpClaimSqlClient = BookingRevenueErpLeaseSqlClient;
export type BookingRevenueErpClaimDatabase = BookingRevenueErpLeaseDatabase;

/**
 * Canonical ERP claim entrypoint.
 *
 * The receipt-fenced repository deliberately never converts an expired LEASED row to
 * RETRY. Such rows remain unavailable to dispatch until a separate reconciliation
 * proves that the provider did not apply the request. RETRY rows are claimable only
 * when the exact attempt and lease version have a trusted RETRYABLE_ERROR receipt.
 */
export function claimBookingRevenueErpEventV2(input: Readonly<{
  database: BookingRevenueErpClaimDatabase;
  tenantId: string;
  workerId: string;
  now: Date;
  leaseSeconds: number;
}>): Promise<ClaimedBookingRevenueErpEventV2 | undefined> {
  return claimBookingRevenueErpEventWithReceiptFence(input);
}
