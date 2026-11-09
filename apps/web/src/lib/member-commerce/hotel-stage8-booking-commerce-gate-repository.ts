import { createHash, randomUUID } from "node:crypto";

export type HotelStage8GatePool = { connect(): Promise<{
  query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<{ rows: Row[] }>;
  release(): void;
}> };

export type PersistHotelStage8GateInput = Readonly<{
  tenantId: string;
  holdId: string;
  checkoutCommandId: string;
  atomicCorrelationReceiptId: string;
  paymentReceiptId: string;
  providerConfirmationReceiptId: string;
  bookingId: string;
  vendureCorrelationId: string;
  vendureLinkId: string;
  outboxEventId: string;
  orderSnapshotId: string;
  dispatchReceiptId: string;
  reconciledAt: string;
}>;

type Truth = {
  payment_evidence_sha256: string;
  pms_confirmation_evidence_sha256: string;
  vendure_dispatch_receipt_sha256: string;
  final_booking_sha256: string;
  order_snapshot_sha256: string;
};
type Existing = { stage8_reconciliation_receipt_id: string; reconciliation_sha256: string };

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") { const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`; }
  return JSON.stringify(value);
}
const sha256 = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");

export async function persistHotelStage8BookingCommerceGate(
  pool: HotelStage8GatePool,
  input: PersistHotelStage8GateInput,
): Promise<Readonly<{ stage8ReconciliationReceiptId: string; gateState: "STAGE8_PROVIDER_RECONCILED_NOT_FORMAL"; reconciliationSha256: string; replayed: boolean }>> {
  for (const [key,value] of Object.entries(input)) if (!String(value).trim()) throw new Error(`STAGE8_${key.toUpperCase()}_REQUIRED`);
  const reconciledAt = new Date(input.reconciledAt);
  if (!Number.isFinite(reconciledAt.getTime())) throw new Error("STAGE8_RECONCILED_AT_INVALID");
  const db = await pool.connect();
  try {
    await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    await db.query("SELECT set_config('app.tenant_id',$1,true)", [input.tenantId]);
    const prior = (await db.query<Existing>(
      `SELECT stage8_reconciliation_receipt_id,reconciliation_sha256
         FROM crays_core.clubs_hotel_stage8_booking_commerce_reconciliation_receipts
        WHERE tenant_id=$1 AND hold_id=$2 FOR UPDATE`, [input.tenantId,input.holdId],
    )).rows[0];
    const truthRows = (await db.query<Truth>(
      `SELECT p.payment_evidence_sha256,
              pc.confirmation_evidence_sha256 AS pms_confirmation_evidence_sha256,
              d.receipt_sha256 AS vendure_dispatch_receipt_sha256,
              b.finalization_sha256 AS final_booking_sha256,
              v.order_snapshot_sha256
         FROM crays_core.clubs_hotel_payment_atomic_correlation_receipts a
         JOIN crays_core.clubs_hotel_booking_stripe_payment_receipts p
           ON p.tenant_id=a.tenant_id AND p.payment_receipt_id=a.payment_receipt_id
          AND p.hold_id=a.hold_id AND p.signature_verified=true
         JOIN crays_core.clubs_hotel_final_bookings b
           ON b.tenant_id=a.tenant_id AND b.hold_id=a.hold_id
          AND b.payment_receipt_id=p.payment_receipt_id AND b.booking_status='provider-confirmed'
         JOIN crays_core.clubs_hotel_pms_provider_confirmation_receipts pc
           ON pc.tenant_id=b.tenant_id AND pc.provider_confirmation_receipt_id=b.provider_confirmation_receipt_id
          AND pc.authentication_verified=true AND pc.confirmation_status='confirmed'
         JOIN crays_core.clubs_hotel_checkout_vendure_correlations v
           ON v.tenant_id=a.tenant_id AND v.vendure_correlation_id=a.vendure_correlation_id
          AND v.checkout_command_id=a.checkout_command_id AND v.hold_id=a.hold_id
         JOIN crays_core.checkout_order_transition_outbox o
           ON o.tenant_id=v.tenant_id AND o.outbox_event_id=v.outbox_event_id
          AND o.order_snapshot_id=v.order_snapshot_id AND o.delivery_state='DELIVERED'
         JOIN crays_core.checkout_vendure_order_dispatch_receipts d
           ON d.tenant_id=o.tenant_id AND d.outbox_event_id=o.outbox_event_id
          AND d.order_snapshot_id=o.order_snapshot_id AND d.outcome='DELIVERED'
         JOIN crays_core.clubs_hotel_final_booking_vendure_links l
           ON l.tenant_id=b.tenant_id AND l.booking_id=b.booking_id
          AND l.outbox_event_id=o.outbox_event_id AND l.order_snapshot_id=o.order_snapshot_id
          AND l.dispatch_receipt_id=d.dispatch_receipt_id AND l.provider_order_id=d.provider_order_id
          AND l.vendure_dispatch_receipt_sha256=d.receipt_sha256
        WHERE a.tenant_id=$1 AND a.atomic_correlation_receipt_id=$2
          AND a.checkout_command_id=$3 AND a.hold_id=$4
          AND a.classification='IN_WINDOW_SUCCESS' AND a.resolution_state='ATOMICALLY_ACCEPTED'
          AND p.payment_receipt_id=$5 AND pc.provider_confirmation_receipt_id=$6 AND b.booking_id=$7
          AND v.vendure_correlation_id=$8 AND l.vendure_link_id=$9
          AND o.outbox_event_id=$10 AND o.order_snapshot_id=$11 AND d.dispatch_receipt_id=$12
          AND p.verified_at<=pc.confirmed_at AND pc.confirmed_at<=l.linked_at
          AND l.linked_at<=$13::timestamptz
        FOR SHARE OF a,p,b,pc,v,o,d,l`,
      [input.tenantId,input.atomicCorrelationReceiptId,input.checkoutCommandId,input.holdId,
        input.paymentReceiptId,input.providerConfirmationReceiptId,input.bookingId,input.vendureCorrelationId,
        input.vendureLinkId,input.outboxEventId,input.orderSnapshotId,input.dispatchReceiptId,reconciledAt.toISOString()],
    )).rows;
    if (truthRows.length !== 1) throw new Error("STAGE8_EXACT_PROVIDER_RECONCILIATION_NOT_FOUND");
    const cardinality = (await db.query<{ booking_count: number | string; order_count: number | string }>(
      `SELECT
         (SELECT count(*) FROM crays_core.clubs_hotel_final_bookings b WHERE b.tenant_id=$1 AND b.hold_id=$2) AS booking_count,
         (SELECT count(*) FROM crays_core.clubs_hotel_checkout_vendure_correlations v WHERE v.tenant_id=$1 AND v.hold_id=$2) AS order_count`,
      [input.tenantId,input.holdId],
    )).rows[0];
    if (!cardinality || Number(cardinality.booking_count) !== 1 || Number(cardinality.order_count) !== 1) throw new Error("STAGE8_ONE_BOOKING_ONE_ORDER_REQUIRED");
    const truth = truthRows[0];
    const material = { ...input, reconciledAt: reconciledAt.toISOString(), ...truth,
      bookingCount: 1, commerceOrderCount: 1, gateState: "STAGE8_PROVIDER_RECONCILED_NOT_FORMAL",
      browserReturnAuthoritative: false, providerMutationPerformed: false, formalApplied: false };
    const reconciliationSha256 = sha256(material);
    if (prior) {
      if (prior.reconciliation_sha256 !== reconciliationSha256) throw new Error("STAGE8_RECONCILIATION_REPLAY_CONFLICT");
      await db.query("COMMIT");
      return { stage8ReconciliationReceiptId: prior.stage8_reconciliation_receipt_id,
        gateState: "STAGE8_PROVIDER_RECONCILED_NOT_FORMAL", reconciliationSha256, replayed: true };
    }
    const stage8ReconciliationReceiptId = randomUUID();
    await db.query(
      `INSERT INTO crays_core.clubs_hotel_stage8_booking_commerce_reconciliation_receipts
       (stage8_reconciliation_receipt_id,tenant_id,hold_id,checkout_command_id,atomic_correlation_receipt_id,
        payment_receipt_id,provider_confirmation_receipt_id,booking_id,vendure_correlation_id,vendure_link_id,
        outbox_event_id,order_snapshot_id,dispatch_receipt_id,payment_evidence_sha256,
        pms_confirmation_evidence_sha256,vendure_dispatch_receipt_sha256,final_booking_sha256,
        order_snapshot_sha256,booking_count,commerce_order_count,gate_state,reconciliation_sha256,
        reconciled_at,persisted_record,synthetic_source,browser_return_authoritative,
        provider_mutation_performed,formal_applied)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,1,1,
        'STAGE8_PROVIDER_RECONCILED_NOT_FORMAL',$19,$20::timestamptz,true,false,false,false,false)`,
      [stage8ReconciliationReceiptId,input.tenantId,input.holdId,input.checkoutCommandId,
        input.atomicCorrelationReceiptId,input.paymentReceiptId,input.providerConfirmationReceiptId,input.bookingId,
        input.vendureCorrelationId,input.vendureLinkId,input.outboxEventId,input.orderSnapshotId,input.dispatchReceiptId,
        truth.payment_evidence_sha256,truth.pms_confirmation_evidence_sha256,truth.vendure_dispatch_receipt_sha256,
        truth.final_booking_sha256,truth.order_snapshot_sha256,reconciliationSha256,reconciledAt.toISOString()],
    );
    await db.query("COMMIT");
    return { stage8ReconciliationReceiptId, gateState: "STAGE8_PROVIDER_RECONCILED_NOT_FORMAL", reconciliationSha256, replayed: false };
  } catch (error) { await db.query("ROLLBACK"); throw error; }
  finally { db.release(); }
}
