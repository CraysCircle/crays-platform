import {createHash} from "node:crypto";

import type {createHotelCancellationFinalizationPlan} from "./hotel-booking-cancellation-finalization-plan-repository";

export const HOTEL_CANCELLATION_APPLICATION_RECEIPT_VERSION =
  "cclub.phase9.hotel-cancellation-application-receipt.v1" as const;
type FinalizationPlan = ReturnType<
  typeof createHotelCancellationFinalizationPlan
>;
const SHA256 = /^[a-f0-9]{64}$/;
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const instant = (value: string, code: string) => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(code);
  return parsed;
};

export type HotelCancellationApplicationDb = Readonly<{
  query<T = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<Readonly<{rows: T[]}>>;
  release(): void;
}>;
export type HotelCancellationApplicationPool = Readonly<{
  connect(): Promise<HotelCancellationApplicationDb>;
}>;

type SharedApplicationEvidence = Readonly<{
  databaseTransactionId: string;
  committedAt: string;
}>;

export type CreateHotelCancellationApplicationReceiptInput = Readonly<{
  applicationReceiptId: string;
  plan: FinalizationPlan;
  transaction: Readonly<{
    databaseTransactionId: string;
    databaseSystem: "postgresql";
    isolationLevel: "serializable";
    transactionCommitted: true;
    committedAt: string;
    transactionReceiptSha256: string;
  }>;
  inventoryApplication: SharedApplicationEvidence & Readonly<{
    inventoryApplicationReceiptId: string;
    releasePayloadSha256: string;
    affectedRows: number;
    appliedAllocations: readonly Readonly<{
      allocationReceiptId: string;
      serviceDate: string;
      quantity: number;
      expectedStatus: "converted-booked";
      appliedStatus: "released-after-confirmed-cancellation";
    }>[];
    compareAndSwap: true;
    applicationSha256: string;
  }>;
  reversalApplication: SharedApplicationEvidence & Readonly<{
    reversalApplicationReceiptId: string;
    affectedRows: 4;
    appliedEntries: readonly Readonly<{
      entitlementKind: string;
      entrySha256: string;
      reversalAmountMinor: number;
      payoutStatus: "not-authorized";
    }>[];
    appendOnly: true;
    applicationSha256: string;
  }>;
  bookingApplication: SharedApplicationEvidence & Readonly<{
    bookingApplicationReceiptId: string;
    finalBookingReceiptId: string;
    expectedStatus: "provider-confirmed";
    appliedStatus: "canceled-after-provider-and-refund-final";
    affectedRows: 1;
    compareAndSwap: true;
    applicationSha256: string;
  }>;
  auditReceipt: SharedApplicationEvidence & Readonly<{
    auditReceiptId: string;
    eventType: "hotel-booking-cancellation-applied";
    finalizationPlanId: string;
    previousAuditSha256: string;
    eventSha256: string;
    appendOnly: true;
    applicationSha256: string;
  }>;
  createdAt: string;
}>;

function validateShared(
  evidence: SharedApplicationEvidence,
  transaction: CreateHotelCancellationApplicationReceiptInput["transaction"],
) {
  if (
    evidence.databaseTransactionId !== transaction.databaseTransactionId ||
    evidence.committedAt !== transaction.committedAt
  ) throw new Error("HOTEL_CANCELLATION_APPLICATION_TRANSACTION_BINDING_MISMATCH");
}

export function createHotelCancellationApplicationReceipt(
  input: CreateHotelCancellationApplicationReceiptInput,
) {
  const {plan, transaction, inventoryApplication: inventory,
    reversalApplication: reversal, bookingApplication: booking,
    auditReceipt: audit} = input;
  if (!input.applicationReceiptId.trim() || !transaction.databaseTransactionId.trim()) {
    throw new Error("HOTEL_CANCELLATION_APPLICATION_REFERENCE_REQUIRED");
  }
  if (
    plan.planState !== "eligible-not-applied" ||
    plan.inventoryReleased || plan.revenueReversed ||
    !SHA256.test(plan.planSha256)
  ) throw new Error("HOTEL_CANCELLATION_APPLICATION_PLAN_INVALID");
  if (
    transaction.databaseSystem !== "postgresql" ||
    transaction.isolationLevel !== "serializable" ||
    transaction.transactionCommitted !== true ||
    !SHA256.test(transaction.transactionReceiptSha256)
  ) throw new Error("HOTEL_CANCELLATION_APPLICATION_TRANSACTION_INVALID");
  const committedAt = instant(transaction.committedAt, "HOTEL_CANCELLATION_APPLICATION_COMMIT_TIME_INVALID");
  const createdAt = instant(input.createdAt, "HOTEL_CANCELLATION_APPLICATION_CREATED_AT_INVALID");
  if (createdAt < committedAt) throw new Error("HOTEL_CANCELLATION_APPLICATION_TIMELINE_INVALID");
  for (const evidence of [inventory, reversal, booking, audit]) {
    validateShared(evidence, transaction);
  }
  const expectedAllocations = plan.inventoryReleaseIntent.releasePayload.allocations;
  if (
    inventory.releasePayloadSha256 !== plan.inventoryReleaseIntent.releasePayloadSha256 ||
    inventory.compareAndSwap !== true ||
    inventory.affectedRows !== expectedAllocations.length ||
    inventory.appliedAllocations.length !== expectedAllocations.length ||
    !SHA256.test(inventory.applicationSha256)
  ) throw new Error("HOTEL_CANCELLATION_APPLICATION_INVENTORY_INVALID");
  for (let index = 0; index < expectedAllocations.length; index += 1) {
    const expected = expectedAllocations[index];
    const applied = inventory.appliedAllocations[index];
    if (!applied || applied.allocationReceiptId !== expected.allocationReceiptId ||
      applied.serviceDate !== expected.serviceDate || applied.quantity !== expected.quantity ||
      applied.expectedStatus !== expected.expectedStatus ||
      applied.appliedStatus !== expected.requestedStatus) {
      throw new Error("HOTEL_CANCELLATION_APPLICATION_INVENTORY_CAS_MISMATCH");
    }
  }
  if (
    reversal.appendOnly !== true || reversal.affectedRows !== 4 ||
    reversal.appliedEntries.length !== 4 || !SHA256.test(reversal.applicationSha256)
  ) throw new Error("HOTEL_CANCELLATION_APPLICATION_REVERSAL_INVALID");
  for (let index = 0; index < plan.reversals.length; index += 1) {
    const expected = plan.reversals[index]; const applied = reversal.appliedEntries[index];
    if (!applied || applied.entitlementKind !== expected.entitlementKind ||
      applied.entrySha256 !== expected.entrySha256 ||
      applied.reversalAmountMinor !== expected.reversalAmountMinor ||
      applied.payoutStatus !== "not-authorized") {
      throw new Error("HOTEL_CANCELLATION_APPLICATION_REVERSAL_SCOPE_MISMATCH");
    }
  }
  if (
    booking.finalBookingReceiptId !== plan.finalBookingReceiptId ||
    booking.expectedStatus !== "provider-confirmed" ||
    booking.appliedStatus !== "canceled-after-provider-and-refund-final" ||
    booking.affectedRows !== 1 || booking.compareAndSwap !== true ||
    !SHA256.test(booking.applicationSha256)
  ) throw new Error("HOTEL_CANCELLATION_APPLICATION_BOOKING_CAS_INVALID");
  if (
    audit.eventType !== "hotel-booking-cancellation-applied" ||
    audit.finalizationPlanId !== plan.finalizationPlanId ||
    audit.appendOnly !== true || !SHA256.test(audit.previousAuditSha256) ||
    !SHA256.test(audit.eventSha256) || !SHA256.test(audit.applicationSha256)
  ) throw new Error("HOTEL_CANCELLATION_APPLICATION_AUDIT_INVALID");
  const body = Object.freeze({
    contractVersion: HOTEL_CANCELLATION_APPLICATION_RECEIPT_VERSION,
    applicationReceiptId: input.applicationReceiptId,
    finalizationPlanId: plan.finalizationPlanId,
    tenantId: plan.tenantId,
    finalBookingReceiptId: plan.finalBookingReceiptId,
    databaseTransactionId: transaction.databaseTransactionId,
    databaseSystem: transaction.databaseSystem,
    isolationLevel: transaction.isolationLevel,
    transactionReceiptSha256: transaction.transactionReceiptSha256,
    inventoryApplicationReceiptId: inventory.inventoryApplicationReceiptId,
    inventoryApplicationSha256: inventory.applicationSha256,
    reversalApplicationReceiptId: reversal.reversalApplicationReceiptId,
    reversalApplicationSha256: reversal.applicationSha256,
    bookingApplicationReceiptId: booking.bookingApplicationReceiptId,
    bookingApplicationSha256: booking.applicationSha256,
    auditReceiptId: audit.auditReceiptId,
    auditReceiptSha256: audit.applicationSha256,
    committedAt: transaction.committedAt,
    createdAt: input.createdAt,
  });
  return Object.freeze({
    ...body,
    applicationSha256: digest({body, inventory, reversal, booking, audit}),
    applicationState: "applied-by-verified-transaction" as const,
    inventoryApplication: inventory,
    reversalApplication: reversal,
    bookingApplication: booking,
    auditReceipt: audit,
    inventoryReleased: true as const,
    revenueReversed: true as const,
    bookingCanceled: true as const,
    payoutAuthorized: false as const,
    externalDispatchPerformed: false as const,
    formalActionAuthorized: false as const,
  });
}

export async function persistHotelCancellationApplicationReceipt(
  pool: HotelCancellationApplicationPool,
  input: CreateHotelCancellationApplicationReceiptInput,
) {
  const receipt = createHotelCancellationApplicationReceipt(input);
  const db = await pool.connect();
  try {
    await db.query("begin isolation level serializable");
    await db.query("select set_config('crays.app_role','integration_service',true),set_config('crays.tenant_id',$1,true)",[receipt.tenantId]);
    await db.query(`insert into crays_core.clubs_hotel_booking_cancellation_application_receipts
      (application_receipt_id,finalization_plan_id,tenant_id,final_booking_receipt_id,
       database_transaction_id,database_system,isolation_level,transaction_receipt_sha256,
       inventory_application_receipt_id,inventory_application_sha256,inventory_application,
       reversal_application_receipt_id,reversal_application_sha256,reversal_application,
       booking_application_receipt_id,booking_application_sha256,booking_application,
       audit_receipt_id,audit_receipt_sha256,audit_receipt,application_sha256,application_state,
       inventory_released,revenue_reversed,booking_canceled,payout_authorized,
       external_dispatch_performed,formal_action_authorized,committed_at,created_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14::jsonb,$15,$16,$17::jsonb,
       $18,$19,$20::jsonb,$21,$22,true,true,true,false,false,false,$23,$24)`,
      [receipt.applicationReceiptId,receipt.finalizationPlanId,receipt.tenantId,receipt.finalBookingReceiptId,
       receipt.databaseTransactionId,receipt.databaseSystem,receipt.isolationLevel,receipt.transactionReceiptSha256,
       receipt.inventoryApplicationReceiptId,receipt.inventoryApplicationSha256,JSON.stringify(receipt.inventoryApplication),
       receipt.reversalApplicationReceiptId,receipt.reversalApplicationSha256,JSON.stringify(receipt.reversalApplication),
       receipt.bookingApplicationReceiptId,receipt.bookingApplicationSha256,JSON.stringify(receipt.bookingApplication),
       receipt.auditReceiptId,receipt.auditReceiptSha256,JSON.stringify(receipt.auditReceipt),receipt.applicationSha256,
       receipt.applicationState,receipt.committedAt,receipt.createdAt]);
    await db.query("commit"); return receipt;
  } catch(error) { await db.query("rollback").catch(()=>undefined); throw error; } finally { db.release(); }
}
