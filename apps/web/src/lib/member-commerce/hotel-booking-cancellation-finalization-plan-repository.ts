import {createHash} from "node:crypto";

import type {createHotelBookingCancellationAuthority} from "./hotel-booking-cancellation-authority-contract";
import type {acceptAuthenticatedHotelPmsCancellationConfirmation} from "./hotel-booking-cancellation-provider-saga-repository";
import type {acceptSignedHotelStripeRefundEvent} from "./hotel-booking-stripe-refund-saga-repository";

export const HOTEL_CANCELLATION_FINALIZATION_PLAN_VERSION =
  "cclub.phase9.hotel-cancellation-finalization-plan.v1" as const;
type Authority = ReturnType<typeof createHotelBookingCancellationAuthority>;
type PmsConfirmation = ReturnType<
  typeof acceptAuthenticatedHotelPmsCancellationConfirmation
>;
type RefundOutcome = ReturnType<typeof acceptSignedHotelStripeRefundEvent>;
const SHA256 = /^[a-f0-9]{64}$/;
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const instant = (value: string, code: string) => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(code);
  return parsed;
};

const ENTITLEMENTS = [
  ["ambassador-marketing", 1000],
  ["technology-personal", 500],
  ["global-concept-company", 25],
  ["operating-remainder", 8475],
] as const;
type EntitlementKind = (typeof ENTITLEMENTS)[number][0];

export type HotelCancellationFinalizationDb = Readonly<{
  query<T = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<Readonly<{rows: T[]}>>;
  release(): void;
}>;
export type HotelCancellationFinalizationPool = Readonly<{
  connect(): Promise<HotelCancellationFinalizationDb>;
}>;

export type CreateHotelCancellationFinalizationPlanInput = Readonly<{
  finalizationPlanId: string;
  inventoryReleaseIntentId: string;
  authority: Authority;
  pmsCancellation: PmsConfirmation;
  refundOutcome: RefundOutcome | null;
  allocationSnapshot: Readonly<{
    allocationSnapshotReceiptId: string;
    allocationSnapshotSha256: string;
    tenantId: string;
    finalBookingReceiptId: string;
    finalBookingSnapshotSha256: string;
    holdId: string;
    capturedAt: string;
    synthetic: false;
    allocations: readonly Readonly<{
      allocationReceiptId: string;
      serviceDate: string;
      quantity: number;
      status: "converted-booked";
    }>[];
  }>;
  revenueEntitlementSnapshot: Readonly<{
    revenueEntitlementReceiptId: string;
    revenueEntitlementSha256: string;
    tenantId: string;
    finalBookingReceiptId: string;
    currency: string;
    grossAmountMinor: number;
    capturedAt: string;
    entries: readonly Readonly<{
      entitlementKind: EntitlementKind;
      basisPoints: 1000 | 500 | 25 | 8475;
      amountMinor: number;
      beneficiaryReference: string | null;
      beneficiaryStatus:
        | "confirmed-ambassador"
        | "unassigned"
        | "unresolved-personal-claimant"
        | "unnamed-company"
        | "resolved-operating-legal-entity";
    }>[];
  }>;
  createdAt: string;
}>;

function allocateReversal(
  entries: CreateHotelCancellationFinalizationPlanInput["revenueEntitlementSnapshot"]["entries"],
  grossAmountMinor: number,
  refundAmountMinor: number,
) {
  const gross = BigInt(grossAmountMinor);
  const refund = BigInt(refundAmountMinor);
  const rows = entries.map((entry, index) => {
    const numerator = BigInt(entry.amountMinor) * refund;
    return {
      entry,
      index,
      amount: numerator / gross,
      remainder: numerator % gross,
    };
  });
  let undistributed = refund - rows.reduce((sum, row) => sum + row.amount, 0n);
  for (const row of [...rows].sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1
  )) {
    if (undistributed === 0n) break;
    row.amount += 1n;
    undistributed -= 1n;
  }
  return rows.sort((a, b) => a.index - b.index).map(({entry, amount}) => ({
    ...entry,
    originalAmountMinor: entry.amountMinor,
    reversalAmountMinor: Number(amount),
  }));
}

export function createHotelCancellationFinalizationPlan(
  input: CreateHotelCancellationFinalizationPlanInput,
) {
  const {authority, pmsCancellation: pms, refundOutcome: refund} = input;
  if (!input.finalizationPlanId.trim() || !input.inventoryReleaseIntentId.trim()) {
    throw new Error("HOTEL_CANCELLATION_FINALIZATION_REFERENCE_REQUIRED");
  }
  if (
    authority.status !== "authorized-awaiting-provider-cancellation" ||
    !SHA256.test(authority.authoritySha256) ||
    pms.providerCancellationConfirmed !== true ||
    pms.providerStatus !== "canceled" ||
    pms.tenantId !== authority.scope.tenantId
  ) throw new Error("HOTEL_CANCELLATION_FINALIZATION_PROVIDER_EVIDENCE_INVALID");
  if (
    authority.refundableAmountMinor > 0 &&
    (!refund || !refund.refundSucceeded || refund.providerStatus !== "succeeded" ||
      refund.tenantId !== authority.scope.tenantId ||
      refund.amountMinor !== authority.refundableAmountMinor ||
      refund.currency !== authority.currency.toLowerCase() ||
      !SHA256.test(refund.providerReceiptSha256))
  ) throw new Error("HOTEL_CANCELLATION_FINALIZATION_REFUND_EVIDENCE_INVALID");
  if (authority.refundableAmountMinor === 0 && refund !== null) {
    throw new Error("HOTEL_CANCELLATION_FINALIZATION_UNEXPECTED_REFUND");
  }
  const allocation = input.allocationSnapshot;
  if (
    allocation.synthetic !== false ||
    !SHA256.test(allocation.allocationSnapshotSha256) ||
    allocation.tenantId !== authority.scope.tenantId ||
    allocation.finalBookingReceiptId !== authority.scope.finalBookingReceiptId ||
    allocation.finalBookingSnapshotSha256 !== authority.scope.finalBookingSnapshotSha256 ||
    allocation.holdId !== authority.scope.holdId ||
    allocation.allocations.length < 1
  ) throw new Error("HOTEL_CANCELLATION_FINALIZATION_ALLOCATION_SNAPSHOT_INVALID");
  const allocationIds = new Set<string>();
  const dates = new Set<string>();
  for (const row of allocation.allocations) {
    if (!row.allocationReceiptId.trim() || allocationIds.has(row.allocationReceiptId) ||
      dates.has(row.serviceDate) || !/^\d{4}-\d{2}-\d{2}$/.test(row.serviceDate) ||
      !Number.isSafeInteger(row.quantity) || row.quantity < 1 || row.status !== "converted-booked") {
      throw new Error("HOTEL_CANCELLATION_FINALIZATION_ALLOCATION_ROW_INVALID");
    }
    allocationIds.add(row.allocationReceiptId); dates.add(row.serviceDate);
  }
  const revenue = input.revenueEntitlementSnapshot;
  if (
    !SHA256.test(revenue.revenueEntitlementSha256) ||
    revenue.tenantId !== authority.scope.tenantId ||
    revenue.finalBookingReceiptId !== authority.scope.finalBookingReceiptId ||
    revenue.currency !== authority.currency ||
    revenue.grossAmountMinor !== authority.paidAmountMinor ||
    !Number.isSafeInteger(revenue.grossAmountMinor) ||
    revenue.grossAmountMinor < 1 ||
    revenue.entries.length !== 4
  ) throw new Error("HOTEL_CANCELLATION_FINALIZATION_REVENUE_SNAPSHOT_INVALID");
  let amountSum = 0;
  for (let i = 0; i < ENTITLEMENTS.length; i += 1) {
    const entry = revenue.entries[i];
    const [kind, basisPoints] = ENTITLEMENTS[i];
    if (!entry || entry.entitlementKind !== kind || entry.basisPoints !== basisPoints ||
      !Number.isSafeInteger(entry.amountMinor) || entry.amountMinor < 0) {
      throw new Error("HOTEL_CANCELLATION_FINALIZATION_ENTITLEMENT_ORDER_INVALID");
    }
    amountSum += entry.amountMinor;
  }
  if (amountSum !== revenue.grossAmountMinor) {
    throw new Error("HOTEL_CANCELLATION_FINALIZATION_ENTITLEMENT_SUM_INVALID");
  }
  const capturedAt = instant(allocation.capturedAt, "HOTEL_CANCELLATION_FINALIZATION_CAPTURE_TIME_INVALID");
  const revenueCapturedAt = instant(revenue.capturedAt, "HOTEL_CANCELLATION_FINALIZATION_CAPTURE_TIME_INVALID");
  const createdAt = instant(input.createdAt, "HOTEL_CANCELLATION_FINALIZATION_CREATED_AT_INVALID");
  if (capturedAt > createdAt || revenueCapturedAt > createdAt) {
    throw new Error("HOTEL_CANCELLATION_FINALIZATION_TIMELINE_INVALID");
  }
  const releasePayload = Object.freeze({
    tenantId: authority.scope.tenantId,
    finalBookingReceiptId: authority.scope.finalBookingReceiptId,
    holdId: authority.scope.holdId,
    allocationSnapshotReceiptId: allocation.allocationSnapshotReceiptId,
    allocationSnapshotSha256: allocation.allocationSnapshotSha256,
    allocations: allocation.allocations.map((row) => Object.freeze({
      allocationReceiptId: row.allocationReceiptId,
      serviceDate: row.serviceDate,
      quantity: row.quantity,
      expectedStatus: "converted-booked" as const,
      requestedStatus: "released-after-confirmed-cancellation" as const,
    })),
  });
  const reversalRows = allocateReversal(
    revenue.entries,
    revenue.grossAmountMinor,
    authority.refundableAmountMinor,
  );
  const reversals = reversalRows.map((entry) => {
    const body = {
      entitlementKind: entry.entitlementKind,
      basisPoints: entry.basisPoints,
      originalAmountMinor: entry.originalAmountMinor,
      reversalAmountMinor: entry.reversalAmountMinor,
      beneficiaryReference: entry.beneficiaryReference,
      beneficiaryStatus: entry.beneficiaryStatus,
      payoutStatus: "not-authorized" as const,
    };
    return Object.freeze({...body, entrySha256: digest(body)});
  });
  const planBody = Object.freeze({
    contractVersion: HOTEL_CANCELLATION_FINALIZATION_PLAN_VERSION,
    finalizationPlanId: input.finalizationPlanId,
    cancellationAuthorityId: authority.cancellationAuthorityId,
    pmsCancellationConfirmationReceiptId: pms.confirmationReceiptId,
    stripeRefundProviderReceiptId: refund?.refundProviderReceiptId ?? null,
    tenantId: authority.scope.tenantId,
    projectId: authority.scope.projectId,
    siteId: authority.scope.siteId,
    propertyId: authority.scope.propertyId,
    finalBookingReceiptId: authority.scope.finalBookingReceiptId,
    allocationSnapshotReceiptId: allocation.allocationSnapshotReceiptId,
    allocationSnapshotSha256: allocation.allocationSnapshotSha256,
    revenueEntitlementReceiptId: revenue.revenueEntitlementReceiptId,
    revenueEntitlementSha256: revenue.revenueEntitlementSha256,
    currency: authority.currency,
    paidAmountMinor: authority.paidAmountMinor,
    refundAmountMinor: authority.refundableAmountMinor,
    createdAt: input.createdAt,
  });
  return Object.freeze({
    ...planBody,
    planSha256: digest({planBody, releasePayload, reversals}),
    planState: "eligible-not-applied" as const,
    inventoryReleaseIntent: Object.freeze({
      inventoryReleaseIntentId: input.inventoryReleaseIntentId,
      releasePayload,
      releasePayloadSha256: digest(releasePayload),
      allocationCount: releasePayload.allocations.length,
      totalQuantity: releasePayload.allocations.reduce((sum, row) => sum + row.quantity, 0),
      deliveryState: "not-dispatched" as const,
    }),
    reversals: Object.freeze(reversals),
    inventoryReleased: false as const,
    revenueReversed: false as const,
    payoutAuthorized: false as const,
    erpDispatched: false as const,
    vendureDispatched: false as const,
    formalActionAuthorized: false as const,
  });
}

async function transaction<T>(pool: HotelCancellationFinalizationPool, tenantId: string, work: (db: HotelCancellationFinalizationDb) => Promise<T>) {
  const db = await pool.connect();
  try { await db.query("begin"); await db.query("select set_config('crays.app_role','integration_service',true),set_config('crays.tenant_id',$1,true)",[tenantId]);
    const result=await work(db); await db.query("set constraints clubs_hotel_revenue_reversal_plan_exact_guard immediate"); await db.query("commit"); return result;
  } catch(error) { await db.query("rollback").catch(()=>undefined); throw error; } finally { db.release(); }
}

export function persistHotelCancellationFinalizationPlan(pool:HotelCancellationFinalizationPool,input:CreateHotelCancellationFinalizationPlanInput){
  const plan=createHotelCancellationFinalizationPlan(input);
  return transaction(pool,plan.tenantId,async(db)=>{
    await db.query(`insert into crays_core.clubs_hotel_booking_cancellation_finalization_plans
      (finalization_plan_id,cancellation_authority_id,pms_cancellation_confirmation_receipt_id,
       stripe_refund_provider_receipt_id,tenant_id,project_id,site_id,property_id,final_booking_receipt_id,
       allocation_snapshot_receipt_id,allocation_snapshot_sha256,allocation_snapshot,
       revenue_entitlement_receipt_id,revenue_entitlement_sha256,revenue_entitlement_snapshot,
       currency,paid_amount_minor,refund_amount_minor,plan_sha256,plan_state,created_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15::jsonb,$16,$17,$18,$19,$20,$21)`,
      [plan.finalizationPlanId,plan.cancellationAuthorityId,plan.pmsCancellationConfirmationReceiptId,
       plan.stripeRefundProviderReceiptId,plan.tenantId,plan.projectId,plan.siteId,plan.propertyId,
       plan.finalBookingReceiptId,plan.allocationSnapshotReceiptId,plan.allocationSnapshotSha256,
       JSON.stringify(input.allocationSnapshot),plan.revenueEntitlementReceiptId,plan.revenueEntitlementSha256,
       JSON.stringify(input.revenueEntitlementSnapshot),plan.currency,plan.paidAmountMinor,plan.refundAmountMinor,
       plan.planSha256,plan.planState,plan.createdAt]);
    await db.query(`insert into crays_integration.clubs_hotel_inventory_release_intents
      (inventory_release_intent_id,finalization_plan_id,tenant_id,final_booking_receipt_id,
       allocation_snapshot_receipt_id,allocation_snapshot_sha256,release_payload,release_payload_sha256,
       allocation_count,total_quantity,delivery_state,created_at)
      values($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,'not-dispatched',$11)`,
      [plan.inventoryReleaseIntent.inventoryReleaseIntentId,plan.finalizationPlanId,plan.tenantId,
       plan.finalBookingReceiptId,plan.allocationSnapshotReceiptId,plan.allocationSnapshotSha256,
       JSON.stringify(plan.inventoryReleaseIntent.releasePayload),plan.inventoryReleaseIntent.releasePayloadSha256,
       plan.inventoryReleaseIntent.allocationCount,plan.inventoryReleaseIntent.totalQuantity,plan.createdAt]);
    for(const entry of plan.reversals){
      await db.query(`insert into crays_core.clubs_hotel_revenue_reversal_plan_entries
        (reversal_entry_id,finalization_plan_id,tenant_id,entitlement_kind,basis_points,
         original_amount_minor,reversal_amount_minor,beneficiary_reference,beneficiary_status,
         payout_status,entry_sha256,created_at)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,'not-authorized',$10,$11)`,
        [`${plan.finalizationPlanId}:${entry.entitlementKind}`,plan.finalizationPlanId,plan.tenantId,
         entry.entitlementKind,entry.basisPoints,entry.originalAmountMinor,entry.reversalAmountMinor,
         entry.beneficiaryReference,entry.beneficiaryStatus,entry.entrySha256,plan.createdAt]);
    }
    return plan;
  });
}
