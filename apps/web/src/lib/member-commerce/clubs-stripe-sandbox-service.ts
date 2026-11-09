import "server-only";

import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import {
  prepareClubsStripeSandboxPayment,
  type ClubsStripePaymentKind,
  type ClubsStripePaymentState,
} from "./clubs-stripe-sandbox-contract";
import {
  createClubsStripeSandboxPaymentIntent,
  verifyClubsStripeSandboxWebhook,
} from "./clubs-stripe-sandbox-provider";
import {
  persistClubsStripeSandboxPayment,
  recordClubsStripePaymentIntentReceipt,
  recordClubsStripeWebhook,
  type ClubsStripeSandboxPool,
} from "./clubs-stripe-sandbox-repository";
import {
  ensureTrustedClubsStayPaymentAuthority,
  provisionTrustedClubsStayAdapterReceipt,
} from "@/db/clubs-stripe-trusted-stay-adapter-repository";
import {
  clubsStripePaymentSetupPending,
  type ClubsStripePaymentSetupPending,
  type ClubsStripeTrustedStayProvisioningAuthority,
  type ClubsStripeTrustedStaySourceInput,
} from "./clubs-stripe-trusted-stay-adapter-contract";

export class ClubsStripeSandboxServiceError extends Error {
  constructor(
    readonly code:
      | "STRIPE_TEST_CONNECTION_NOT_READY"
      | "PAYMENT_SETUP_PENDING"
      | "PAYMENT_AUTHORITY_NOT_READY"
      | "PAYMENT_AUTHORITY_CONFLICT"
      | "PAYMENT_NOT_FOUND"
      | "WEBHOOK_CONFIGURATION_NOT_READY"
      | "WEBHOOK_REJECTED",
    message: string,
    readonly setupPending?: ClubsStripePaymentSetupPending,
  ) {
    super(message);
    this.name = "ClubsStripeSandboxServiceError";
  }
}

type PaymentAuthorityRow = {
  tenant_id: string;
  payment_authority_id: string;
  member_account_id: string;
  project_id: string;
  payment_kind: ClubsStripePaymentKind;
  subject_reference: string;
  source_authority_sha256: string;
  stripe_product_id: string;
  stripe_price_id: string;
  amount_minor: string | number;
  currency: string;
  operator_connected_account_id: string;
  ambassador_connected_account_id: string;
  software_connected_account_id: string;
  global_concept_test_connected_account_id: string;
};

type PaymentReadRow = {
  payment_id: string;
  payment_kind: ClubsStripePaymentKind;
  subject_reference: string;
  amount_minor: string | number;
  currency: string;
  payment_state: ClubsStripePaymentState;
  stripe_payment_intent_id: string | null;
  allocation_plan_sha256: string;
  created_at: Date | string;
  updated_at: Date | string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function asPool(): ClubsStripeSandboxPool {
  return getCorePgPool() as unknown as ClubsStripeSandboxPool;
}

function providerConfiguration(env: NodeJS.ProcessEnv = process.env): { platformTestKey: string } {
  if (env.CCLUB_STRIPE_TEST_CONNECTION_READY !== "true") {
    throw new ClubsStripeSandboxServiceError("STRIPE_TEST_CONNECTION_NOT_READY", "Stripe test connection is not management-ready.");
  }
  const platformTestKey = env.CCLUB_STRIPE_TEST_SECRET_KEY?.trim() ?? "";
  if (!/^(rk|sk)_test_[^\s]{8,}$/.test(platformTestKey)) {
    throw new ClubsStripeSandboxServiceError("STRIPE_TEST_CONNECTION_NOT_READY", "Stripe test credential is unavailable.");
  }
  return { platformTestKey };
}

async function withTenantClient<T>(tenantId: string, run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getCorePgPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('crays.app_role','core_service',true)");
    await client.query("SELECT set_config('crays.tenant_id',$1,true)", [tenantId]);
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function loadPaymentAuthority(input: Readonly<{
  tenantId: string;
  memberAccountId: string;
  paymentKind: ClubsStripePaymentKind;
  subjectReference: string;
  now: Date;
}>): Promise<PaymentAuthorityRow> {
  const rows = await withTenantClient(input.tenantId, (client) => client.query<PaymentAuthorityRow>(
    `SELECT tenant_id, payment_authority_id, member_account_id, project_id,
            payment_kind, subject_reference, source_authority_sha256,
            stripe_product_id, stripe_price_id, amount_minor, currency,
            operator_connected_account_id, ambassador_connected_account_id,
            software_connected_account_id, global_concept_test_connected_account_id
       FROM crays_core.clubs_stripe_sandbox_payment_authorities
      WHERE tenant_id=$1 AND member_account_id=$2 AND payment_kind=$3
        AND subject_reference=$4 AND authority_state='READY'
        AND livemode=false AND expires_at>$5
      FOR SHARE`,
    [input.tenantId, input.memberAccountId, input.paymentKind, input.subjectReference, input.now.toISOString()],
  ));
  if (rows.rows.length === 0) {
    throw new ClubsStripeSandboxServiceError("PAYMENT_AUTHORITY_NOT_READY", "No current server-side payment authority exists.");
  }
  if (rows.rows.length !== 1) {
    throw new ClubsStripeSandboxServiceError("PAYMENT_AUTHORITY_CONFLICT", "Payment authority cardinality is invalid.");
  }
  return rows.rows[0]!;
}

export async function prepareAndCreateClubsStripeSandboxPayment(input: Readonly<{
  tenantId: string;
  memberAccountId: string;
  paymentKind: ClubsStripePaymentKind;
  subjectReference: string;
  idempotencyKey: string;
  staySource?: ClubsStripeTrustedStaySourceInput;
  now?: Date;
}>) {
  const now = input.now ?? new Date();
  if (input.paymentKind === "STAY") {
    if (!input.staySource || input.staySource.holdId !== input.subjectReference) {
      const pending = clubsStripePaymentSetupPending(
        "STAY",
        "CANONICAL_STAY_AUTHORITY_NOT_READY",
      );
      throw new ClubsStripeSandboxServiceError(
        "PAYMENT_SETUP_PENDING",
        "The canonical STAY source is incomplete.",
        pending,
      );
    }
    const materialized = await ensureTrustedClubsStayPaymentAuthority({
      tenantId: input.tenantId,
      memberAccountId: input.memberAccountId,
      source: input.staySource,
      now,
    });
    if (materialized.status === "payment_setup_pending") {
      throw new ClubsStripeSandboxServiceError(
        "PAYMENT_SETUP_PENDING",
        "The trusted STAY payment binding is not ready.",
        materialized,
      );
    }
  }
  let row: PaymentAuthorityRow;
  try {
    row = await loadPaymentAuthority({ ...input, now });
  } catch (error) {
    if (
      error instanceof ClubsStripeSandboxServiceError &&
      error.code === "PAYMENT_AUTHORITY_NOT_READY"
    ) {
      const pending = clubsStripePaymentSetupPending(
        input.paymentKind,
        input.paymentKind === "STAY"
          ? "TRUSTED_STAY_ADAPTER_RECEIPT_MISSING"
          : "MEMBERSHIP_CATALOG_BINDING_MISSING",
      );
      throw new ClubsStripeSandboxServiceError(
        "PAYMENT_SETUP_PENDING",
        "The payment catalog binding is not ready.",
        pending,
      );
    }
    throw error;
  }
  const configuration = providerConfiguration();
  const identity = sha256([
    input.tenantId,
    input.memberAccountId,
    input.paymentKind,
    input.subjectReference,
    input.idempotencyKey,
  ].join("\u001f"));
  const authority = prepareClubsStripeSandboxPayment({
    tenantId: row.tenant_id,
    projectId: row.project_id,
    paymentAuthorityId: row.payment_authority_id,
    sourceAuthoritySha256: row.source_authority_sha256,
    stripeProductId: row.stripe_product_id,
    stripePriceId: row.stripe_price_id,
    paymentId: `cclubpay_${identity.slice(0, 40)}`,
    paymentKind: row.payment_kind,
    subjectReference: row.subject_reference,
    amountMinor: Number(row.amount_minor),
    currency: row.currency,
    idempotencyKey: `cclub_pi_${identity}`,
    recipientAccounts: {
      operatorOrFranchise: row.operator_connected_account_id,
      ambassador: row.ambassador_connected_account_id,
      software: row.software_connected_account_id,
      globalConceptTestOnly: row.global_concept_test_connected_account_id,
      globalConceptProductionBindingAvailable: false,
    },
    testMode: true,
  });
  const persisted = await persistClubsStripeSandboxPayment({ pool: asPool(), authority, createdAt: now });
  const receipt = await createClubsStripeSandboxPaymentIntent({
    platformTestKey: configuration.platformTestKey,
    authority,
  });
  await recordClubsStripePaymentIntentReceipt({
    pool: asPool(),
    tenantId: authority.tenantId,
    paymentId: authority.paymentId,
    providerReceiptId: `cclubreceipt_${sha256(`${receipt.paymentIntentId}:${receipt.state}`).slice(0, 40)}`,
    receipt,
    observedAt: now,
  });
  return Object.freeze({
    paymentId: authority.paymentId,
    paymentKind: authority.paymentKind,
    subjectReference: authority.subjectReference,
    amountMinor: authority.amountMinor,
    currency: authority.currency,
    state: receipt.state,
    clientSecret: receipt.clientSecret,
    replayed: persisted.replayed,
    livemode: false as const,
    allocationPlanSha256: authority.allocationPlanSha256,
  });
}

export async function provisionTrustedClubsStaySandboxPaymentAuthority(
  input: Readonly<{
    tenantId: string;
    memberAccountId: string;
    source: ClubsStripeTrustedStaySourceInput;
    setup: ClubsStripeTrustedStayProvisioningAuthority;
    observedAt?: Date;
  }>,
) {
  const configuration = providerConfiguration();
  return provisionTrustedClubsStayAdapterReceipt({
    ...input,
    platformTestKey: configuration.platformTestKey,
  });
}

export async function readClubsStripeSandboxPayment(input: Readonly<{
  tenantId: string;
  memberAccountId: string;
  paymentId: string;
}>): Promise<PaymentReadRow> {
  const result = await withTenantClient(input.tenantId, (client) => client.query<PaymentReadRow>(
    `SELECT p.payment_id, p.payment_kind, p.subject_reference, p.amount_minor,
            p.currency, p.payment_state, p.stripe_payment_intent_id,
            p.allocation_plan_sha256, p.created_at, p.updated_at
       FROM crays_core.clubs_stripe_sandbox_payments p
       JOIN crays_core.clubs_stripe_sandbox_payment_authorities a
         ON a.tenant_id=p.tenant_id AND a.payment_authority_id=p.payment_authority_id
      WHERE p.tenant_id=$1 AND p.payment_id=$2 AND a.member_account_id=$3`,
    [input.tenantId, input.paymentId, input.memberAccountId],
  ));
  const row = result.rows[0];
  if (!row) throw new ClubsStripeSandboxServiceError("PAYMENT_NOT_FOUND", "Payment is not visible to this member.");
  return row;
}

export async function receiveClubsStripeSandboxWebhook(input: Readonly<{
  rawBody: string;
  signatureHeader: string;
  receivedAt?: Date;
}>) {
  if (process.env.CCLUB_STRIPE_TEST_CONNECTION_READY !== "true") {
    throw new ClubsStripeSandboxServiceError("WEBHOOK_CONFIGURATION_NOT_READY", "Stripe test connection is not management-ready.");
  }
  const webhookSecret = process.env.CCLUB_STRIPE_TEST_WEBHOOK_SECRET?.trim() ?? "";
  if (!/^whsec_[^\s]{8,}$/.test(webhookSecret)) {
    throw new ClubsStripeSandboxServiceError("WEBHOOK_CONFIGURATION_NOT_READY", "Stripe webhook secret is unavailable.");
  }
  let event;
  try {
    event = verifyClubsStripeSandboxWebhook({ rawBody: input.rawBody, signatureHeader: input.signatureHeader, webhookSecret });
  } catch {
    throw new ClubsStripeSandboxServiceError("WEBHOOK_REJECTED", "Stripe webhook signature or Clubs scope is invalid.");
  }
  const metadata = event.object.metadata as Record<string, unknown>;
  const tenantId = typeof metadata.crays_tenant_id === "string" ? metadata.crays_tenant_id : "";
  const paymentId = typeof metadata.crays_payment_id === "string" ? metadata.crays_payment_id : "";
  if (!tenantId || !paymentId) throw new ClubsStripeSandboxServiceError("WEBHOOK_REJECTED", "Stripe webhook payment authority is missing.");
  const receivedAt = input.receivedAt ?? new Date();
  const recorded = await recordClubsStripeWebhook({
    pool: asPool(),
    tenantId,
    paymentId,
    webhookReceiptId: `cclubwebhook_${sha256(`${event.connectedAccountId}:${event.id}`).slice(0, 40)}`,
    event,
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
    receivedAt,
  });
  return Object.freeze({ accepted: true as const, replayed: recorded.replayed, eventId: event.id });
}
