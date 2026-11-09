import { createHash, randomUUID } from "node:crypto";

export type HotelStripePaymentPool = {
  connect(): Promise<{
    query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<{ rows: Row[] }>;
    release(): void;
  }>;
};

export type RecordHotelStripePaymentEvidenceInput = {
  tenantId: string;
  holdId: string;
  stripeEventId: string;
  stripeEventType: "checkout.session.completed" | "checkout.session.async_payment_succeeded";
  stripeApiVersion: "2026-07-29.dahlia";
  stripeCustomerId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string;
  livemode: true;
  checkoutStatus: "complete";
  paymentStatus: "paid";
  currency: string;
  amountTotalMinor: number;
  signatureVerified: true;
  signatureVerificationReceiptSha256: string;
  stripeCustomerCreatedEvidenceSha256: string;
  stripeEventPayloadSha256: string;
  verifiedAt: string;
};

export type HotelStripePaymentEvidenceResult = {
  paymentReceiptId: string;
  holdId: string;
  status: "payment-confirmed-awaiting-provider";
  paymentEvidenceSha256: string;
  replayed: boolean;
};

type HoldRow = {
  hold_id: string;
  hold_status: string;
  currency: string;
  total_amount_minor: string | number;
  expires_at: string | Date;
};
type ReceiptRow = { payment_receipt_id: string; hold_id: string; payment_evidence_sha256: string };

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
const sha256 = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
const shaPattern = /^[0-9a-f]{64}$/;

function normalize(input: RecordHotelStripePaymentEvidenceInput) {
  const currency = input.currency.trim().toUpperCase();
  if (!/^evt_[A-Za-z0-9]+$/.test(input.stripeEventId)) throw new Error("invalid Stripe event ID");
  if (!/^cus_[A-Za-z0-9]+$/.test(input.stripeCustomerId)) throw new Error("invalid Stripe Customer ID");
  if (!/^cs_live_[A-Za-z0-9]+$/.test(input.stripeCheckoutSessionId)) throw new Error("only live Checkout Session evidence is accepted");
  if (!/^pi_[A-Za-z0-9]+$/.test(input.stripePaymentIntentId)) throw new Error("invalid Stripe PaymentIntent ID");
  if (!input.livemode || !input.signatureVerified || input.checkoutStatus !== "complete" || input.paymentStatus !== "paid") throw new Error("Stripe payment evidence is not verified and paid");
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("currency must be a three-letter ISO code");
  if (!Number.isSafeInteger(input.amountTotalMinor) || input.amountTotalMinor < 0) throw new Error("amountTotalMinor must be non-negative");
  for (const hash of [input.signatureVerificationReceiptSha256, input.stripeCustomerCreatedEvidenceSha256, input.stripeEventPayloadSha256]) {
    if (!shaPattern.test(hash)) throw new Error("Stripe evidence hashes must be lowercase SHA-256");
  }
  const verifiedAt = new Date(input.verifiedAt);
  if (!Number.isFinite(verifiedAt.getTime())) throw new Error("verifiedAt is invalid");
  const normalized = { ...input, currency, verifiedAt: verifiedAt.toISOString() };
  return { normalized, paymentEvidenceSha256: sha256(normalized) };
}

export async function recordHotelStripePaymentEvidence(
  pool: HotelStripePaymentPool,
  input: RecordHotelStripePaymentEvidenceInput,
): Promise<HotelStripePaymentEvidenceResult> {
  const { normalized, paymentEvidenceSha256 } = normalize(input);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [normalized.tenantId]);
    const replay = await client.query<ReceiptRow>(
      `SELECT payment_receipt_id, hold_id, payment_evidence_sha256
         FROM crays_core.clubs_hotel_booking_stripe_payment_receipts
        WHERE tenant_id = $1 AND stripe_event_id = $2
        FOR UPDATE`,
      [normalized.tenantId, normalized.stripeEventId],
    );
    if (replay.rows[0]) {
      if (replay.rows[0].hold_id !== normalized.holdId || replay.rows[0].payment_evidence_sha256 !== paymentEvidenceSha256) throw new Error("Stripe event replay conflict");
      await client.query("COMMIT");
      return { paymentReceiptId: replay.rows[0].payment_receipt_id, holdId: replay.rows[0].hold_id, status: "payment-confirmed-awaiting-provider", paymentEvidenceSha256, replayed: true };
    }
    const hold = await client.query<HoldRow>(
      `SELECT hold_id, hold_status, currency, total_amount_minor, expires_at
         FROM crays_core.clubs_hotel_booking_inventory_holds
        WHERE tenant_id = $1 AND hold_id = $2
        FOR UPDATE`,
      [normalized.tenantId, normalized.holdId],
    );
    const row = hold.rows[0];
    if (!row || row.hold_status !== "held-pending-payment") throw new Error("Stripe payment evidence requires one pending-payment hold");
    if (new Date(row.expires_at).getTime() <= new Date(normalized.verifiedAt).getTime()) throw new Error("Stripe payment was verified after hold expiry");
    if (row.currency !== normalized.currency || Number(row.total_amount_minor) !== normalized.amountTotalMinor) throw new Error("Stripe payment amount or currency does not match hold");

    const paymentReceiptId = randomUUID();
    await client.query(
      `INSERT INTO crays_core.clubs_hotel_booking_stripe_payment_receipts (
         payment_receipt_id, tenant_id, hold_id, stripe_event_id, stripe_event_type,
         stripe_api_version, stripe_customer_id, stripe_checkout_session_id,
         stripe_payment_intent_id, livemode, checkout_status, payment_status,
         currency, amount_total_minor, signature_verified,
         signature_verification_receipt_sha256, stripe_customer_created_evidence_sha256,
         stripe_event_payload_sha256, payment_evidence_sha256, verified_at,
         persisted_record, synthetic_source
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,'complete','paid',$10,$11,true,$12,$13,$14,$15,$16,true,false)`,
      [paymentReceiptId, normalized.tenantId, normalized.holdId, normalized.stripeEventId, normalized.stripeEventType, normalized.stripeApiVersion, normalized.stripeCustomerId, normalized.stripeCheckoutSessionId, normalized.stripePaymentIntentId, normalized.currency, normalized.amountTotalMinor, normalized.signatureVerificationReceiptSha256, normalized.stripeCustomerCreatedEvidenceSha256, normalized.stripeEventPayloadSha256, paymentEvidenceSha256, normalized.verifiedAt],
    );
    await client.query(
      `UPDATE crays_core.clubs_hotel_booking_inventory_holds
          SET hold_status = 'payment-confirmed-awaiting-provider',
              payment_provider = 'stripe-checkout-session', external_payment_id = $3,
              payment_evidence_sha256 = $4, payment_confirmed_at = $5::timestamptz
        WHERE tenant_id = $1 AND hold_id = $2 AND hold_status = 'held-pending-payment'`,
      [normalized.tenantId, normalized.holdId, normalized.stripeCheckoutSessionId, paymentEvidenceSha256, normalized.verifiedAt],
    );
    await client.query(
      `UPDATE crays_core.clubs_hotel_booking_inventory_hold_allocations
          SET allocation_status = 'payment-confirmed'
        WHERE tenant_id = $1 AND hold_id = $2 AND allocation_status = 'held'`,
      [normalized.tenantId, normalized.holdId],
    );
    await client.query(
      `INSERT INTO crays_core.clubs_hotel_booking_inventory_hold_events (
         event_id, tenant_id, hold_id, sequence_no, event_type, from_status,
         to_status, evidence_sha256, event_payload
       ) SELECT $1,$2,$3,COALESCE(max(sequence_no),0)+1,'stripe-payment-confirmed',
                'held-pending-payment','payment-confirmed-awaiting-provider',$4,$5::jsonb
           FROM crays_core.clubs_hotel_booking_inventory_hold_events
          WHERE tenant_id=$2 AND hold_id=$3`,
      [randomUUID(), normalized.tenantId, normalized.holdId, paymentEvidenceSha256, JSON.stringify({ paymentReceiptId, stripeEventId: normalized.stripeEventId, stripeCheckoutSessionId: normalized.stripeCheckoutSessionId })],
    );
    await client.query("COMMIT");
    return { paymentReceiptId, holdId: normalized.holdId, status: "payment-confirmed-awaiting-provider", paymentEvidenceSha256, replayed: false };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
