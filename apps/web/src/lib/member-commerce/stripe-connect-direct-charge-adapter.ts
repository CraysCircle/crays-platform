import {createHash} from "node:crypto";
import {verifyFrozenOrderSellerSnapshot,type FrozenOrderSellerSnapshot} from "./checkout-order-transition-contract";

export const STRIPE_CONNECT_DIRECT_CHARGE_VERSION = "ncrv2-133.v2" as const;

export type PersistedShippingTaxPreflight = Readonly<{
  preflightId:string; cartId:string; cartVersion:number; storeId:string;
  partnerTenantId:string; operatorLegalEntityId:string; vendureSellerId:string;
  vendureChannelId:string; currency:string; totalMinor:number; resultSha256:string;
  preflightState:"PERSISTED_PENDING_PROVIDER_PARITY"|"PROVIDER_PARITY_CONFIRMED";
}>;

type DirectChargeInput = Readonly<{
  canonicalStripeCustomerRef: string;
  idempotencyKey: string;
  billingLedgerDomain: "retail-commerce" | "membership-billing";
  livemode: boolean;
}>;

function hash(value: object) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function createDirectChargeRequest(
  candidateSnapshot: FrozenOrderSellerSnapshot,
  preflight: PersistedShippingTaxPreflight,
  input: DirectChargeInput,
) {
  const snapshot=verifyFrozenOrderSellerSnapshot(candidateSnapshot);
  if (input.billingLedgerDomain !== "retail-commerce") {
    throw new Error("STRIPE_BILLING_LEDGER_SEPARATION_REQUIRED");
  }
  if ((snapshot.stripeEnvironment === "live") !== input.livemode) {
    throw new Error("STRIPE_ENVIRONMENT_MISMATCH");
  }
  if (
    preflight.preflightId !== snapshot.checkoutPreflightId || preflight.cartId !== snapshot.cartId ||
    preflight.cartVersion !== snapshot.cartVersion || preflight.storeId !== snapshot.storeId ||
    preflight.partnerTenantId !== snapshot.partnerTenantId ||
    preflight.operatorLegalEntityId !== snapshot.operatorLegalEntityId ||
    preflight.vendureSellerId !== snapshot.vendureSellerId ||
    preflight.vendureChannelId !== snapshot.vendureChannelId ||
    preflight.preflightState !== "PROVIDER_PARITY_CONFIRMED" ||
    !/^[a-f0-9]{64}$/.test(preflight.resultSha256)
  ) throw new Error("STRIPE_CHECKOUT_PREFLIGHT_MISMATCH");
  if (!Number.isSafeInteger(preflight.totalMinor) || preflight.totalMinor < 1 ||
      !/^[A-Z]{3}$/.test(preflight.currency) || !input.idempotencyKey.trim() ||
      !input.canonicalStripeCustomerRef.trim()) {
    throw new Error("STRIPE_DIRECT_CHARGE_INPUT_INVALID");
  }
  const payload = {
    amount: preflight.totalMinor,
    currency: preflight.currency.toLowerCase(),
    customer: input.canonicalStripeCustomerRef,
    automatic_payment_methods: {enabled: true},
    metadata: {
      crays_domain: "retail-commerce",
      crays_order_id: snapshot.orderId,
      crays_seller_snapshot_sha256: snapshot.snapshotSha256,
      crays_checkout_preflight_id: preflight.preflightId,
      crays_checkout_preflight_sha256: preflight.resultSha256,
      crays_operator_legal_entity_id: snapshot.operatorLegalEntityId,
    },
  };
  return {
    adapterVersion: STRIPE_CONNECT_DIRECT_CHARGE_VERSION,
    method: "POST" as const,
    path: "/v1/payment_intents" as const,
    connectedAccount: snapshot.stripeConnectedAccountId,
    merchantOfRecordLegalEntityId: snapshot.operatorLegalEntityId,
    idempotencyKey: input.idempotencyKey,
    requestHash: hash({connectedAccount: snapshot.stripeConnectedAccountId, payload}),
    payload,
  };
}

export function adjudicateDirectChargeReplay(
  prior: Readonly<{idempotencyKey: string; requestHash: string; paymentIntentId: string}>,
  request: ReturnType<typeof createDirectChargeRequest>,
) {
  if (prior.idempotencyKey !== request.idempotencyKey) return {replay: false as const};
  if (prior.requestHash !== request.requestHash) {
    throw new Error("STRIPE_IDEMPOTENCY_COLLISION");
  }
  return {replay: true as const, paymentIntentId: prior.paymentIntentId};
}

export function mapPaymentIntentOutcome(input: Readonly<{
  connectedAccount: string;
  expectedConnectedAccount: string;
  status: string;
}>) {
  if (input.connectedAccount !== input.expectedConnectedAccount) {
    throw new Error("STRIPE_CONNECTED_ACCOUNT_OUTCOME_MISMATCH");
  }
  const states: Record<string, string> = {
    requires_payment_method: "failed_or_retry_payment_method",
    requires_action: "customer_3ds_action_required",
    processing: "provider_processing",
    requires_capture: "authorized_requires_capture",
    succeeded: "settled",
    canceled: "canceled",
  };
  const state = states[input.status];
  if (!state) throw new Error("STRIPE_PAYMENT_OUTCOME_UNKNOWN");
  return state;
}
