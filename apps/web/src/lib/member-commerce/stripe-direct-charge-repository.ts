import {
  createDirectChargeRequest,
  mapPaymentIntentOutcome,
  type PersistedShippingTaxPreflight,
} from "./stripe-connect-direct-charge-adapter";
import type {FrozenOrderSellerSnapshot} from "./checkout-order-transition-contract";

type Result<Row> = Readonly<{rows: Row[]}>;
export type StripeDirectChargeDb = Readonly<{
  query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<Result<Row>>;
}>;
export type StripeDirectChargePool = Readonly<{
  connect(): Promise<StripeDirectChargeDb & Readonly<{release(): void}>>;
}>;

export type StripeDirectChargeCommandInput = Readonly<{
  tenantId: string;
  directChargeCommandId: string;
  outboxEventId: string;
  orderSnapshotId: string;
  canonicalStripeCustomerRef: string;
  idempotencyKey: string;
  createdAt: string;
}>;

export type StripePaymentIntentStatus =
  | "requires_payment_method"
  | "requires_action"
  | "processing"
  | "requires_capture"
  | "succeeded"
  | "canceled";

export type StripeDirectChargeProviderReceiptInput = Readonly<{
  tenantId: string;
  providerReceiptId: string;
  directChargeCommandId: string;
  providerEventId: string;
  paymentIntentId: string;
  chargeId?: string;
  connectedAccountId: string;
  providerStatus: StripePaymentIntentStatus;
  signatureVerified: boolean;
  eventPayloadSha256: string;
  observedAt: string;
}>;

type AuthorityRow = Readonly<{
  order_snapshot_id: string;
  order_id: string;
  snapshot_sha256: string;
  snapshot_payload: FrozenOrderSellerSnapshot | string;
  preflight_id: string;
  cart_id: string;
  cart_version: string | number;
  store_id: string;
  partner_tenant_id: string;
  operator_legal_entity_id: string;
  vendure_seller_id: string;
  vendure_channel_id: string;
  currency: string;
  total_minor: string | number;
  result_sha256: string;
  delivery_state: string;
}>;

type CommandRow = Readonly<{
  direct_charge_command_id: string;
  order_snapshot_id: string;
  request_sha256: string;
  payment_intent_id: string | null;
  stripe_connected_account_id: string;
  command_state: string;
}>;

const HASH = /^[a-f0-9]{64}$/;
const nonempty = (value: string) => value.trim().length > 0;

async function transaction<T>(
  pool: StripeDirectChargePool,
  tenantId: string,
  work: (db: StripeDirectChargeDb) => Promise<T>,
) {
  const db = await pool.connect();
  try {
    await db.query("begin");
    await db.query(
      "select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true)",
      [tenantId],
    );
    const result = await work(db);
    await db.query("commit");
    return result;
  } catch (error) {
    await db.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    db.release();
  }
}

function validateCommandInput(input: StripeDirectChargeCommandInput) {
  if (
    [input.tenantId, input.directChargeCommandId, input.outboxEventId, input.orderSnapshotId,
      input.canonicalStripeCustomerRef, input.idempotencyKey].some((value) => !nonempty(value)) ||
    !Number.isFinite(Date.parse(input.createdAt))
  ) throw new Error("STRIPE_DIRECT_CHARGE_COMMAND_INPUT_INVALID");
}

export function prepareStripeDirectChargeCommandInput(
  input: StripeDirectChargeCommandInput,
): StripeDirectChargeCommandInput {
  const snapshot = Object.freeze({...input});
  validateCommandInput(snapshot);
  return snapshot;
}

function parseSnapshot(value: FrozenOrderSellerSnapshot | string) {
  return (typeof value === "string" ? JSON.parse(value) : value) as FrozenOrderSellerSnapshot;
}

export function persistStripeDirectChargeCommand(
  pool: StripeDirectChargePool,
  input: StripeDirectChargeCommandInput,
) {
  input = prepareStripeDirectChargeCommandInput(input);
  return transaction(pool, input.tenantId, async (db) => {
    const authority = (await db.query<AuthorityRow>(
      `select s.order_snapshot_id,s.order_id,s.snapshot_sha256,s.snapshot_payload,
        p.preflight_id,p.cart_id,p.cart_version,p.store_id,p.partner_tenant_id,
        p.operator_legal_entity_id,p.vendure_seller_id,p.vendure_channel_id,p.currency,
        p.total_minor,p.result_sha256,o.delivery_state
       from crays_core.checkout_order_snapshots s
       join crays_core.checkout_shipping_tax_preflights p
         on p.preflight_id=s.checkout_preflight_id and p.tenant_id=s.tenant_id
       join crays_core.checkout_shipping_tax_outbox o
         on o.preflight_id=p.preflight_id and o.tenant_id=p.tenant_id
       where s.tenant_id=$1 and s.order_snapshot_id=$2
       for update of s,p,o`,
      [input.tenantId, input.orderSnapshotId],
    )).rows[0];
    if (!authority || authority.delivery_state !== "PARITY_CONFIRMED") {
      throw new Error("STRIPE_CHECKOUT_PREFLIGHT_AUTHORITY_UNAVAILABLE");
    }
    const snapshot = parseSnapshot(authority.snapshot_payload);
    const preflight: PersistedShippingTaxPreflight = {
      preflightId: authority.preflight_id,
      cartId: authority.cart_id,
      cartVersion: Number(authority.cart_version),
      storeId: authority.store_id,
      partnerTenantId: authority.partner_tenant_id,
      operatorLegalEntityId: authority.operator_legal_entity_id,
      vendureSellerId: authority.vendure_seller_id,
      vendureChannelId: authority.vendure_channel_id,
      currency: authority.currency,
      totalMinor: Number(authority.total_minor),
      resultSha256: authority.result_sha256,
      preflightState: "PROVIDER_PARITY_CONFIRMED",
    };
    const request = createDirectChargeRequest(snapshot, preflight, {
      canonicalStripeCustomerRef: input.canonicalStripeCustomerRef,
      idempotencyKey: input.idempotencyKey,
      billingLedgerDomain: "retail-commerce",
      livemode: snapshot.stripeEnvironment === "live",
    });
    const prior = (await db.query<CommandRow>(
      `select direct_charge_command_id,order_snapshot_id,request_sha256,payment_intent_id,
        stripe_connected_account_id,command_state
       from crays_core.stripe_direct_charge_commands
       where tenant_id=$1 and idempotency_key=$2`,
      [input.tenantId, input.idempotencyKey],
    )).rows[0];
    if (prior) {
      if (prior.direct_charge_command_id !== input.directChargeCommandId ||
          prior.order_snapshot_id !== input.orderSnapshotId || prior.request_sha256 !== request.requestHash) {
        throw new Error("STRIPE_DIRECT_CHARGE_COMMAND_REPLAY_CONFLICT");
      }
      return Object.freeze({...request, directChargeCommandId: prior.direct_charge_command_id,
        paymentIntentId: prior.payment_intent_id, commandState: prior.command_state, replayed: true as const});
    }
    await db.query(
      `insert into crays_core.stripe_direct_charge_commands
       (direct_charge_command_id,tenant_id,order_snapshot_id,checkout_preflight_id,order_id,
        order_snapshot_sha256,checkout_preflight_sha256,partner_tenant_id,operator_legal_entity_id,
        store_id,stripe_connected_account_id,stripe_environment,canonical_stripe_customer_ref,
        amount_minor,currency,billing_ledger_domain,idempotency_key,request_sha256,command_state,
        created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'retail-commerce',$16,$17,
        'PERSISTED_PENDING_PROVIDER',$18,$18)`,
      [input.directChargeCommandId,input.tenantId,input.orderSnapshotId,authority.preflight_id,
        authority.order_id,authority.snapshot_sha256,authority.result_sha256,authority.partner_tenant_id,
        authority.operator_legal_entity_id,authority.store_id,request.connectedAccount,
        snapshot.stripeEnvironment,input.canonicalStripeCustomerRef,request.payload.amount,
        request.payload.currency,input.idempotencyKey,request.requestHash,input.createdAt],
    );
    await db.query(
      `insert into crays_core.stripe_direct_charge_outbox
       (outbox_event_id,tenant_id,direct_charge_command_id,connected_account_id,request_path,
        request_payload,request_sha256,idempotency_key,delivery_state,created_at)
       values($1,$2,$3,$4,$5,$6::jsonb,$7,$8,'PENDING',$9)`,
      [input.outboxEventId,input.tenantId,input.directChargeCommandId,request.connectedAccount,
        request.path,JSON.stringify(request.payload),request.requestHash,input.idempotencyKey,input.createdAt],
    );
    return Object.freeze({...request, directChargeCommandId: input.directChargeCommandId,
      paymentIntentId: null, commandState: "PERSISTED_PENDING_PROVIDER", replayed: false as const});
  });
}

function projectedState(status: StripePaymentIntentStatus) {
  const mapped = mapPaymentIntentOutcome({connectedAccount: "verified", expectedConnectedAccount: "verified", status});
  return mapped === "settled" ? "SETTLED_PENDING_BUSINESS_RECONCILIATION" : mapped.toUpperCase();
}

function validateReceiptInput(input: StripeDirectChargeProviderReceiptInput) {
  if ([input.tenantId,input.providerReceiptId,input.directChargeCommandId,input.providerEventId,
    input.paymentIntentId,input.connectedAccountId].some((value) => !nonempty(value)) ||
    !input.signatureVerified || (input.providerStatus === "succeeded" && !nonempty(input.chargeId ?? "")) || !HASH.test(input.eventPayloadSha256) ||
    !Number.isFinite(Date.parse(input.observedAt))) {
    throw new Error("STRIPE_DIRECT_CHARGE_PROVIDER_RECEIPT_INVALID");
  }
}

export function prepareStripeDirectChargeProviderReceiptInput(
  input: StripeDirectChargeProviderReceiptInput,
): StripeDirectChargeProviderReceiptInput {
  const snapshot = Object.freeze({...input});
  validateReceiptInput(snapshot);
  return snapshot;
}

export function persistStripeDirectChargeProviderReceipt(
  pool: StripeDirectChargePool,
  input: StripeDirectChargeProviderReceiptInput,
) {
  input = prepareStripeDirectChargeProviderReceiptInput(input);
  return transaction(pool, input.tenantId, async (db) => {
    const command = (await db.query<CommandRow>(
      `select direct_charge_command_id,order_snapshot_id,request_sha256,payment_intent_id,
        stripe_connected_account_id,command_state
       from crays_core.stripe_direct_charge_commands
       where tenant_id=$1 and direct_charge_command_id=$2 for update`,
      [input.tenantId, input.directChargeCommandId],
    )).rows[0];
    if (!command) throw new Error("STRIPE_DIRECT_CHARGE_COMMAND_NOT_FOUND");
    mapPaymentIntentOutcome({connectedAccount: input.connectedAccountId,
      expectedConnectedAccount: command.stripe_connected_account_id,status: input.providerStatus});
    const state = projectedState(input.providerStatus);
    const prior = (await db.query<Readonly<{
      provider_receipt_id:string; payment_intent_id:string; charge_id:string|null; provider_status:string;
      event_payload_sha256:string; projected_command_state:string;
    }>>(
      `select provider_receipt_id,payment_intent_id,charge_id,provider_status,event_payload_sha256,
        projected_command_state from crays_core.stripe_direct_charge_provider_receipts
       where tenant_id=$1 and connected_account_id=$2 and provider_event_id=$3`,
      [input.tenantId,input.connectedAccountId,input.providerEventId],
    )).rows[0];
    if (prior) {
      if (prior.provider_receipt_id !== input.providerReceiptId ||
          prior.payment_intent_id !== input.paymentIntentId || prior.charge_id !== (input.chargeId ?? null) || prior.provider_status !== input.providerStatus ||
          prior.event_payload_sha256 !== input.eventPayloadSha256 || prior.projected_command_state !== state) {
        throw new Error("STRIPE_DIRECT_CHARGE_PROVIDER_EVENT_REPLAY_CONFLICT");
      }
      return Object.freeze({providerReceiptId: prior.provider_receipt_id,
        paymentIntentId: prior.payment_intent_id, commandState: prior.projected_command_state,
        replayed: true as const});
    }
    if (command.payment_intent_id && command.payment_intent_id !== input.paymentIntentId) {
      throw new Error("STRIPE_DIRECT_CHARGE_PAYMENT_INTENT_IDENTITY_CONFLICT");
    }
    await db.query(
      `insert into crays_core.stripe_direct_charge_provider_receipts
       (provider_receipt_id,tenant_id,direct_charge_command_id,provider_event_id,payment_intent_id,charge_id,
        connected_account_id,provider_status,signature_verified,event_payload_sha256,
        projected_command_state,observed_at,created_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$10,$11,$11)`,
      [input.providerReceiptId,input.tenantId,input.directChargeCommandId,input.providerEventId,
        input.paymentIntentId,input.chargeId??null,input.connectedAccountId,input.providerStatus,input.eventPayloadSha256,
        state,input.observedAt],
    );
    await db.query(
      `update crays_core.stripe_direct_charge_commands set payment_intent_id=$1,
        command_state=$2,updated_at=$3 where tenant_id=$4 and direct_charge_command_id=$5`,
      [input.paymentIntentId,state,input.observedAt,input.tenantId,input.directChargeCommandId],
    );
    await db.query(
      `update crays_core.stripe_direct_charge_outbox set delivery_state=$1,completed_at=$2
       where tenant_id=$3 and direct_charge_command_id=$4`,
      [state,input.observedAt,input.tenantId,input.directChargeCommandId],
    );
    return Object.freeze({providerReceiptId: input.providerReceiptId,
      paymentIntentId: input.paymentIntentId,commandState: state,replayed: false as const});
  });
}
