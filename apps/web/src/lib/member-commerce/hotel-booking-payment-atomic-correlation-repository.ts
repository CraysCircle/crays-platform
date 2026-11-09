import { createHash, randomUUID } from "node:crypto";

export type HotelPaymentAtomicCorrelationPool = {
  connect(): Promise<{
    query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<{ rows: Row[] }>;
    release(): void;
  }>;
};

export type BindHotelHoldToCartInput = Readonly<{
  tenantId: string;
  holdId: string;
  cartId: string;
  cartVersion: number;
  holdRequestSha256: string;
  cartContextFingerprint: string;
  boundAt: string;
}>;

export type BindHotelCheckoutVendureInput = Readonly<{
  tenantId: string;
  cartBindingId: string;
  checkoutCommandId: string;
  holdId: string;
  outboxEventId: string;
  orderSnapshotId: string;
  transitionReceiptId: string;
  orderSnapshotSha256: string;
  sellerSnapshotSha256: string;
  correlatedAt: string;
}>;

export type ApplyHotelPaymentSuccessInput = Readonly<{
  tenantId: string;
  checkoutCommandId: string;
  vendureCorrelationId: string;
  webhookReceiptId: string;
  applicationReceiptId: string;
  stripeApiVersion: "2026-07-29.dahlia";
}>;

export type HotelPaymentClassification =
  | "IN_WINDOW_SUCCESS"
  | "LATE_AFTER_HOLD_TERMINAL"
  | "CAPACITY_CONFLICT";

export type HotelPaymentAtomicCorrelationResult = Readonly<{
  atomicCorrelationReceiptId: string;
  classification: HotelPaymentClassification;
  resolutionState: "ATOMICALLY_ACCEPTED" | "COMPENSATION_COMMAND_PERSISTED" | "COMPENSATION_BLOCKED_POLICY_MISSING";
  paymentReceiptId: string | null;
  compensationCommandId: string | null;
  replayed: boolean;
}>;

type TruthRow = {
  tenant_id: string;
  checkout_command_id: string;
  hold_id: string;
  stripe_customer_id: string;
  stripe_customer_created_evidence_sha256: string;
  amount_total_minor: string | number;
  currency: string;
  stripe_environment: "test" | "live";
  seller_snapshot_sha256: string;
  vendure_correlation_id: string;
  outbox_event_id: string;
  order_snapshot_id: string;
  delivery_state: string;
  hold_status: string;
  expires_at: string | Date;
  webhook_receipt_id: string;
  stripe_event_id: string;
  stripe_event_type: string;
  stripe_livemode: boolean;
  stripe_created_at: string | Date;
  payment_intent_id: string;
  checkout_session_id: string | null;
  raw_body: string;
  signature_verification_receipt_sha256: string;
  event_payload_sha256: string;
  observed_at: string | Date;
  application_receipt_id: string;
  disposition: string;
  derived_payment_state: string;
};

type AllocationRow = { allocation_id: string; allocation_status: string };
type ReplayRow = {
  atomic_correlation_receipt_id: string;
  classification: HotelPaymentClassification;
  resolution_state: HotelPaymentAtomicCorrelationResult["resolutionState"];
  payment_receipt_id: string | null;
  compensation_command_id: string | null;
};

const shaPattern = /^[0-9a-f]{64}$/;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const sha256 = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");

function requireHash(value: string, field: string): void {
  if (!shaPattern.test(value)) throw new Error(`${field} must be lowercase SHA-256`);
}

function iso(value: string, field: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`${field} is invalid`);
  return parsed.toISOString();
}

async function transaction<T>(
  pool: HotelPaymentAtomicCorrelationPool,
  tenantId: string,
  body: (client: Awaited<ReturnType<HotelPaymentAtomicCorrelationPool["connect"]>>) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    const result = await body(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function classifyHotelPaymentCorrelation(input: Readonly<{
  holdStatus: string;
  expiresAt: string;
  observedAt: string;
  allocationStatuses: readonly string[];
}>): HotelPaymentClassification {
  const expiresAt = new Date(input.expiresAt).getTime();
  const observedAt = new Date(input.observedAt).getTime();
  if (!Number.isFinite(expiresAt) || !Number.isFinite(observedAt)) throw new Error("payment correlation timestamps are invalid");
  if (["expired", "released", "failed"].includes(input.holdStatus) || observedAt >= expiresAt) {
    return "LATE_AFTER_HOLD_TERMINAL";
  }
  if (input.holdStatus === "held-pending-payment" && input.allocationStatuses.length > 0 && input.allocationStatuses.every((state) => state === "held")) {
    return "IN_WINDOW_SUCCESS";
  }
  return "CAPACITY_CONFLICT";
}

export async function bindHotelHoldToSellerCart(
  pool: HotelPaymentAtomicCorrelationPool,
  input: BindHotelHoldToCartInput,
): Promise<Readonly<{ cartBindingId: string; bindingSha256: string; replayed: boolean }>> {
  requireHash(input.holdRequestSha256, "holdRequestSha256");
  requireHash(input.cartContextFingerprint, "cartContextFingerprint");
  if (!Number.isSafeInteger(input.cartVersion) || input.cartVersion <= 0) throw new Error("cartVersion must be positive");
  const boundAt = iso(input.boundAt, "boundAt");
  const bindingSha256 = sha256({ ...input, boundAt });
  return transaction(pool, input.tenantId, async (client) => {
    const prior = await client.query<{ cart_binding_id: string; binding_sha256: string }>(
      `SELECT cart_binding_id,binding_sha256
         FROM crays_core.clubs_hotel_booking_cart_bindings
        WHERE tenant_id=$1 AND hold_id=$2 FOR UPDATE`,
      [input.tenantId, input.holdId],
    );
    if (prior.rows[0]) {
      if (prior.rows[0].binding_sha256 !== bindingSha256) throw new Error("HOTEL_CART_BINDING_REPLAY_CONFLICT");
      return { cartBindingId: prior.rows[0].cart_binding_id, bindingSha256, replayed: true };
    }
    const cartBindingId = randomUUID();
    await client.query(
      `INSERT INTO crays_core.clubs_hotel_booking_cart_bindings
       (cart_binding_id,tenant_id,hold_id,cart_id,cart_version,hold_request_sha256,
        cart_context_fingerprint,binding_sha256,bound_at,persisted_record,synthetic_source,formal_applied)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz,true,false,false)`,
      [cartBindingId,input.tenantId,input.holdId,input.cartId,input.cartVersion,input.holdRequestSha256,
        input.cartContextFingerprint,bindingSha256,boundAt],
    );
    return { cartBindingId, bindingSha256, replayed: false };
  });
}

export async function bindHotelCheckoutToVendureOrder(
  pool: HotelPaymentAtomicCorrelationPool,
  input: BindHotelCheckoutVendureInput,
): Promise<Readonly<{ vendureCorrelationId: string; correlationSha256: string; replayed: boolean }>> {
  requireHash(input.orderSnapshotSha256, "orderSnapshotSha256");
  requireHash(input.sellerSnapshotSha256, "sellerSnapshotSha256");
  const correlatedAt = iso(input.correlatedAt, "correlatedAt");
  const correlationSha256 = sha256({ ...input, correlatedAt });
  return transaction(pool, input.tenantId, async (client) => {
    const prior = await client.query<{ vendure_correlation_id: string; correlation_sha256: string }>(
      `SELECT vendure_correlation_id,correlation_sha256
         FROM crays_core.clubs_hotel_checkout_vendure_correlations
        WHERE tenant_id=$1 AND checkout_command_id=$2 FOR UPDATE`,
      [input.tenantId, input.checkoutCommandId],
    );
    if (prior.rows[0]) {
      if (prior.rows[0].correlation_sha256 !== correlationSha256) throw new Error("HOTEL_VENDURE_CORRELATION_REPLAY_CONFLICT");
      return { vendureCorrelationId: prior.rows[0].vendure_correlation_id, correlationSha256, replayed: true };
    }
    const vendureCorrelationId = randomUUID();
    await client.query(
      `INSERT INTO crays_core.clubs_hotel_checkout_vendure_correlations
       (vendure_correlation_id,tenant_id,cart_binding_id,checkout_command_id,hold_id,outbox_event_id,
        order_snapshot_id,transition_receipt_id,order_snapshot_sha256,seller_snapshot_sha256,
        correlation_sha256,correlated_at,persisted_record,synthetic_source,formal_applied)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::timestamptz,true,false,false)`,
      [vendureCorrelationId,input.tenantId,input.cartBindingId,input.checkoutCommandId,input.holdId,
        input.outboxEventId,input.orderSnapshotId,input.transitionReceiptId,input.orderSnapshotSha256,
        input.sellerSnapshotSha256,correlationSha256,correlatedAt],
    );
    return { vendureCorrelationId, correlationSha256, replayed: false };
  });
}

function signedPaidOutcome(row: TruthRow): Readonly<{
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string;
  stripeCustomerId: string;
  amountTotalMinor: number;
  currency: string;
  apiVersion: string;
}> {
  let event: Record<string, unknown>;
  try { event = JSON.parse(row.raw_body) as Record<string, unknown>; }
  catch { throw new Error("SIGNED_STRIPE_RAW_BODY_INVALID_JSON"); }
  const data = event.data as Record<string, unknown> | undefined;
  const object = data?.object as Record<string, unknown> | undefined;
  if (!object || event.id !== row.stripe_event_id || event.type !== row.stripe_event_type) throw new Error("SIGNED_STRIPE_EVENT_SCOPE_CONFLICT");
  const apiVersion = String(event.api_version ?? "");
  let stripeCheckoutSessionId: string | null = null;
  let stripePaymentIntentId: string;
  let stripeCustomerId: string;
  let amountTotalMinor: number;
  let currency: string;
  if (row.stripe_event_type === "payment_intent.succeeded") {
    if (object.status !== "succeeded") throw new Error("SIGNED_PAYMENT_INTENT_NOT_SUCCEEDED");
    stripePaymentIntentId = String(object.id ?? "");
    stripeCustomerId = String(object.customer ?? "");
    amountTotalMinor = Number(object.amount_received);
    currency = String(object.currency ?? "").toUpperCase();
  } else {
    if (object.payment_status !== "paid") throw new Error("SIGNED_CHECKOUT_SESSION_NOT_PAID");
    stripeCheckoutSessionId = String(object.id ?? "");
    stripePaymentIntentId = String(object.payment_intent ?? "");
    stripeCustomerId = String(object.customer ?? "");
    amountTotalMinor = Number(object.amount_total);
    currency = String(object.currency ?? "").toUpperCase();
  }
  if (!/^pi_[A-Za-z0-9]{8,}$/.test(stripePaymentIntentId) || !/^cus_[A-Za-z0-9]{8,}$/.test(stripeCustomerId)) throw new Error("SIGNED_STRIPE_PROVIDER_IDS_INVALID");
  if (stripeCheckoutSessionId !== null && !/^cs_(test_|live_)[A-Za-z0-9]{8,}$/.test(stripeCheckoutSessionId)) throw new Error("SIGNED_CHECKOUT_SESSION_ID_INVALID");
  if (!Number.isSafeInteger(amountTotalMinor) || amountTotalMinor <= 0 || !/^[A-Z]{3}$/.test(currency)) throw new Error("SIGNED_STRIPE_AMOUNT_INVALID");
  return { stripeCheckoutSessionId, stripePaymentIntentId, stripeCustomerId, amountTotalMinor, currency, apiVersion };
}

export async function applyHotelPaymentSuccessAtomically(
  pool: HotelPaymentAtomicCorrelationPool,
  input: ApplyHotelPaymentSuccessInput,
): Promise<HotelPaymentAtomicCorrelationResult> {
  return transaction(pool, input.tenantId, async (client) => {
    const replay = await client.query<ReplayRow>(
      `SELECT r.atomic_correlation_receipt_id,r.classification,r.resolution_state,r.payment_receipt_id,
              c.compensation_command_id
         FROM crays_core.clubs_hotel_payment_atomic_correlation_receipts r
         LEFT JOIN crays_core.clubs_hotel_payment_compensation_commands c
           ON c.tenant_id=r.tenant_id AND c.atomic_correlation_receipt_id=r.atomic_correlation_receipt_id
        WHERE r.tenant_id=$1 AND r.webhook_receipt_id=$2 FOR UPDATE OF r`,
      [input.tenantId, input.webhookReceiptId],
    );
    if (replay.rows[0]) {
      const row = replay.rows[0];
      return { atomicCorrelationReceiptId: row.atomic_correlation_receipt_id, classification: row.classification,
        resolutionState: row.resolution_state, paymentReceiptId: row.payment_receipt_id,
        compensationCommandId: row.compensation_command_id, replayed: true };
    }

    const truth = await client.query<TruthRow>(
      `SELECT c.tenant_id,c.checkout_command_id,c.hold_id,c.stripe_customer_id,
              c.stripe_customer_created_evidence_sha256,c.amount_total_minor,c.currency,
              c.stripe_environment,c.seller_snapshot_sha256,v.vendure_correlation_id,
              v.outbox_event_id,v.order_snapshot_id,o.delivery_state,h.hold_status,h.expires_at,
              w.webhook_receipt_id,w.stripe_event_id,w.stripe_event_type,w.stripe_livemode,
              w.stripe_created_at,w.payment_intent_id,w.checkout_session_id,w.raw_body,
              w.signature_verification_receipt_sha256,w.event_payload_sha256,w.observed_at,
              a.application_receipt_id,a.disposition,a.derived_payment_state
         FROM crays_core.clubs_hotel_stripe_checkout_commands c
         JOIN crays_core.clubs_hotel_checkout_vendure_correlations v
           ON v.tenant_id=c.tenant_id AND v.checkout_command_id=c.checkout_command_id AND v.hold_id=c.hold_id
         JOIN crays_core.checkout_order_transition_outbox o
           ON o.tenant_id=v.tenant_id AND o.outbox_event_id=v.outbox_event_id AND o.order_snapshot_id=v.order_snapshot_id
         JOIN crays_core.clubs_hotel_booking_inventory_holds h
           ON h.tenant_id=c.tenant_id AND h.hold_id=c.hold_id
         JOIN crays_core.clubs_hotel_stripe_webhook_inbox w
           ON w.tenant_id=c.tenant_id AND w.checkout_command_id=c.checkout_command_id
         JOIN crays_core.clubs_hotel_stripe_webhook_application_receipts a
           ON a.tenant_id=w.tenant_id AND a.webhook_receipt_id=w.webhook_receipt_id AND a.checkout_command_id=w.checkout_command_id
        WHERE c.tenant_id=$1 AND c.checkout_command_id=$2 AND v.vendure_correlation_id=$3
          AND w.webhook_receipt_id=$4 AND a.application_receipt_id=$5
        FOR UPDATE OF c,v,o,h,w,a`,
      [input.tenantId,input.checkoutCommandId,input.vendureCorrelationId,input.webhookReceiptId,input.applicationReceiptId],
    );
    const row = truth.rows[0];
    if (!row) throw new Error("HOTEL_PAYMENT_EXACT_CORRELATED_TRUTH_NOT_FOUND");
    if (row.disposition !== "APPLIED_CURRENT" || !["CHECKOUT_COMPLETED", "SUCCEEDED", "ASYNC_SUCCEEDED"].includes(row.derived_payment_state)) {
      throw new Error("HOTEL_PAYMENT_WEBHOOK_IS_NOT_CURRENT_SUCCESS");
    }
    const paid = signedPaidOutcome(row);
    if (paid.apiVersion !== input.stripeApiVersion) throw new Error("STRIPE_API_VERSION_CONFLICT");
    if (paid.stripePaymentIntentId !== row.payment_intent_id || paid.stripeCustomerId !== row.stripe_customer_id) throw new Error("STRIPE_PAYMENT_IDENTITY_CONFLICT");
    if (paid.amountTotalMinor !== Number(row.amount_total_minor) || paid.currency !== row.currency) throw new Error("STRIPE_PAYMENT_AMOUNT_CONFLICT");
    if ((row.stripe_environment === "live") !== row.stripe_livemode) throw new Error("STRIPE_ENVIRONMENT_CONFLICT");
    if (paid.stripeCheckoutSessionId !== row.checkout_session_id) throw new Error("STRIPE_CHECKOUT_SESSION_CONFLICT");

    const allocations = await client.query<AllocationRow>(
      `SELECT allocation_id,allocation_status
         FROM crays_core.clubs_hotel_booking_inventory_hold_allocations
        WHERE tenant_id=$1 AND hold_id=$2 ORDER BY stay_date FOR UPDATE`,
      [input.tenantId,row.hold_id],
    );
    const observedAt = new Date(row.observed_at).toISOString();
    const classification = classifyHotelPaymentCorrelation({
      holdStatus: row.hold_status,
      expiresAt: new Date(row.expires_at).toISOString(),
      observedAt,
      allocationStatuses: allocations.rows.map((allocation) => allocation.allocation_status),
    });
    const paymentEvidence = {
      tenantId: input.tenantId, holdId: row.hold_id, checkoutCommandId: row.checkout_command_id,
      vendureCorrelationId: row.vendure_correlation_id, stripeEventId: row.stripe_event_id,
      stripeEventType: row.stripe_event_type, stripeApiVersion: input.stripeApiVersion,
      stripeCustomerId: paid.stripeCustomerId, stripeCheckoutSessionId: paid.stripeCheckoutSessionId,
      stripePaymentIntentId: paid.stripePaymentIntentId, livemode: row.stripe_livemode,
      checkoutStatus: "complete", paymentStatus: "paid", currency: paid.currency,
      amountTotalMinor: paid.amountTotalMinor, signatureVerified: true,
      signatureVerificationReceiptSha256: row.signature_verification_receipt_sha256,
      stripeCustomerCreatedEvidenceSha256: row.stripe_customer_created_evidence_sha256,
      stripeEventPayloadSha256: row.event_payload_sha256, verifiedAt: observedAt,
    } as const;
    const paymentEvidenceSha256 = sha256(paymentEvidence);
    const atomicCorrelationReceiptId = randomUUID();
    let paymentReceiptId: string | null = null;
    let compensationCommandId: string | null = null;
    let resolutionState: HotelPaymentAtomicCorrelationResult["resolutionState"];

    if (classification === "IN_WINDOW_SUCCESS") {
      paymentReceiptId = randomUUID();
      await client.query(
        `INSERT INTO crays_core.clubs_hotel_booking_stripe_payment_receipts
         (payment_receipt_id,tenant_id,hold_id,stripe_event_id,stripe_event_type,stripe_api_version,
          stripe_customer_id,stripe_checkout_session_id,stripe_payment_intent_id,livemode,checkout_status,
          payment_status,currency,amount_total_minor,signature_verified,signature_verification_receipt_sha256,
          stripe_customer_created_evidence_sha256,stripe_event_payload_sha256,payment_evidence_sha256,
          verified_at,persisted_record,synthetic_source)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'complete','paid',$11,$12,true,$13,$14,$15,$16,$17::timestamptz,true,false)`,
        [paymentReceiptId,input.tenantId,row.hold_id,row.stripe_event_id,row.stripe_event_type,input.stripeApiVersion,
          paid.stripeCustomerId,paid.stripeCheckoutSessionId,paid.stripePaymentIntentId,row.stripe_livemode,
          paid.currency,paid.amountTotalMinor,row.signature_verification_receipt_sha256,
          row.stripe_customer_created_evidence_sha256,row.event_payload_sha256,paymentEvidenceSha256,observedAt],
      );
      const updatedHold = await client.query<{ hold_id: string }>(
        `UPDATE crays_core.clubs_hotel_booking_inventory_holds
            SET hold_status='payment-confirmed-awaiting-provider',payment_provider='stripe-checkout-session',
                external_payment_id=$3,payment_evidence_sha256=$4,payment_confirmed_at=$5::timestamptz
          WHERE tenant_id=$1 AND hold_id=$2 AND hold_status='held-pending-payment'
          RETURNING hold_id`,
        [input.tenantId,row.hold_id,paid.stripeCheckoutSessionId ?? paid.stripePaymentIntentId,paymentEvidenceSha256,observedAt],
      );
      if (!updatedHold.rows[0]) throw new Error("HOTEL_PAYMENT_HOLD_CAS_CONFLICT");
      const updatedAllocations = await client.query<{ allocation_id: string }>(
        `UPDATE crays_core.clubs_hotel_booking_inventory_hold_allocations
            SET allocation_status='payment-confirmed'
          WHERE tenant_id=$1 AND hold_id=$2 AND allocation_status='held'
          RETURNING allocation_id`,
        [input.tenantId,row.hold_id],
      );
      if (updatedAllocations.rows.length !== allocations.rows.length) throw new Error("HOTEL_PAYMENT_ALLOCATION_CAS_CONFLICT");
      await client.query(
        `INSERT INTO crays_core.clubs_hotel_booking_inventory_hold_events
         (event_id,tenant_id,hold_id,sequence_no,event_type,from_status,to_status,evidence_sha256,event_payload)
         SELECT $1,$2,$3,COALESCE(max(sequence_no),0)+1,'stripe-payment-confirmed-v93',
                'held-pending-payment','payment-confirmed-awaiting-provider',$4,$5::jsonb
           FROM crays_core.clubs_hotel_booking_inventory_hold_events WHERE tenant_id=$2 AND hold_id=$3`,
        [randomUUID(),input.tenantId,row.hold_id,paymentEvidenceSha256,
          JSON.stringify({ paymentReceiptId, atomicCorrelationReceiptId, vendureCorrelationId: row.vendure_correlation_id })],
      );
      resolutionState = "ATOMICALLY_ACCEPTED";
    } else {
      const policies = await client.query<{
        compensation_policy_id: string;
        stripe_action: "REFUND_EXACT_PAYMENT";
        pending_vendure_action: "SUPPRESS_PENDING_ORDER";
        delivered_vendure_action: "CANCEL_DELIVERED_ORDER";
        internal_reason: "paid-booking-capacity-unavailable";
      }>(
        `SELECT compensation_policy_id,stripe_action,pending_vendure_action,delivered_vendure_action,internal_reason
           FROM crays_core.clubs_hotel_payment_compensation_policies
          WHERE tenant_id=$1 AND seller_snapshot_sha256=$2 AND policy_state='ACTIVE'
            AND effective_from<=$3::timestamptz AND (effective_until IS NULL OR effective_until>$3::timestamptz)
          ORDER BY effective_from DESC FOR SHARE`,
        [input.tenantId,row.seller_snapshot_sha256,observedAt],
      );
      if (policies.rows.length > 1) throw new Error("HOTEL_PAYMENT_COMPENSATION_POLICY_AMBIGUOUS");
      resolutionState = policies.rows[0] ? "COMPENSATION_COMMAND_PERSISTED" : "COMPENSATION_BLOCKED_POLICY_MISSING";
    }

    const decisionSha256 = sha256({ paymentEvidence, classification, resolutionState,
      holdStatusAtDecision: row.hold_status, allocationStatuses: allocations.rows.map((value) => value.allocation_status),
      outboxEventId: row.outbox_event_id, orderSnapshotId: row.order_snapshot_id });
    await client.query(
      `INSERT INTO crays_core.clubs_hotel_payment_atomic_correlation_receipts
       (atomic_correlation_receipt_id,tenant_id,checkout_command_id,vendure_correlation_id,hold_id,
        webhook_receipt_id,application_receipt_id,payment_receipt_id,stripe_event_id,
        stripe_event_payload_sha256,stripe_payment_intent_id,amount_total_minor,currency,
        hold_status_at_decision,allocation_count,classification,resolution_state,decision_sha256,
        decided_at,persisted_record,synthetic_source,provider_mutation_performed,browser_return_authoritative,formal_applied)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::timestamptz,true,false,false,false,false)`,
      [atomicCorrelationReceiptId,input.tenantId,row.checkout_command_id,row.vendure_correlation_id,row.hold_id,
        row.webhook_receipt_id,row.application_receipt_id,paymentReceiptId,row.stripe_event_id,row.event_payload_sha256,
        paid.stripePaymentIntentId,paid.amountTotalMinor,paid.currency,row.hold_status,allocations.rows.length,
        classification,resolutionState,decisionSha256,observedAt],
    );

    if (resolutionState === "COMPENSATION_COMMAND_PERSISTED") {
      const policy = (await client.query<{
        compensation_policy_id: string;
        stripe_action: "REFUND_EXACT_PAYMENT";
        pending_vendure_action: "SUPPRESS_PENDING_ORDER";
        delivered_vendure_action: "CANCEL_DELIVERED_ORDER";
        internal_reason: "paid-booking-capacity-unavailable";
      }>(
        `SELECT compensation_policy_id,stripe_action,pending_vendure_action,delivered_vendure_action,internal_reason
           FROM crays_core.clubs_hotel_payment_compensation_policies
          WHERE tenant_id=$1 AND seller_snapshot_sha256=$2 AND policy_state='ACTIVE'
            AND effective_from<=$3::timestamptz AND (effective_until IS NULL OR effective_until>$3::timestamptz)
          ORDER BY effective_from DESC LIMIT 1 FOR SHARE`,
        [input.tenantId,row.seller_snapshot_sha256,observedAt],
      )).rows[0];
      if (!policy) throw new Error("HOTEL_PAYMENT_COMPENSATION_POLICY_LOST");
      compensationCommandId = randomUUID();
      const vendureAction = row.delivery_state === "DELIVERED" ? policy.delivered_vendure_action : policy.pending_vendure_action;
      const idempotencyKey = `hotel-payment-compensation:${atomicCorrelationReceiptId}`;
      const commandSha256 = sha256({ atomicCorrelationReceiptId, policyId: policy.compensation_policy_id,
        checkoutCommandId: row.checkout_command_id, holdId: row.hold_id, outboxEventId: row.outbox_event_id,
        orderSnapshotId: row.order_snapshot_id, stripePaymentIntentId: paid.stripePaymentIntentId,
        amountTotalMinor: paid.amountTotalMinor, currency: paid.currency, stripeAction: policy.stripe_action,
        vendureAction, internalReason: policy.internal_reason, idempotencyKey });
      await client.query(
        `INSERT INTO crays_core.clubs_hotel_payment_compensation_commands
         (compensation_command_id,tenant_id,atomic_correlation_receipt_id,compensation_policy_id,
          checkout_command_id,hold_id,outbox_event_id,order_snapshot_id,stripe_payment_intent_id,
          amount_total_minor,currency,stripe_action,vendure_action,internal_reason,idempotency_key,
          command_sha256,command_state,created_at,provider_mutation_performed,formal_applied)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'PERSISTED_PENDING_WORKER',$17::timestamptz,false,false)`,
        [compensationCommandId,input.tenantId,atomicCorrelationReceiptId,policy.compensation_policy_id,
          row.checkout_command_id,row.hold_id,row.outbox_event_id,row.order_snapshot_id,paid.stripePaymentIntentId,
          paid.amountTotalMinor,paid.currency,policy.stripe_action,vendureAction,policy.internal_reason,
          idempotencyKey,commandSha256,observedAt],
      );
    }
    return { atomicCorrelationReceiptId, classification, resolutionState, paymentReceiptId, compensationCommandId, replayed: false };
  });
}
