import "server-only";

import { createHash } from "node:crypto";
import {
  clubsStripeSha256,
  type ClubsStripePaymentState,
  type ClubsStripeSandboxPaymentAuthority,
} from "./clubs-stripe-sandbox-contract";
import type {
  ClubsStripePaymentIntentReceipt,
  ClubsStripeRefundReceipt,
  ClubsStripeTransferReceipt,
} from "./clubs-stripe-sandbox-provider";
import type { VerifiedStripeConnectEvent } from "./stripe-connect-direct-charge-provider";

type QueryResult<Row extends Record<string, unknown> = Record<string, unknown>> = {
  rows: Row[];
  rowCount?: number | null;
};

type DbClient = {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
  release(): void;
};

export type ClubsStripeSandboxPool = {
  connect(): Promise<DbClient>;
};

type PaymentRow = {
  payment_id: string;
  authority_sha256: string;
  stripe_payment_intent_id: string | null;
  payment_state: ClubsStripePaymentState;
};

const HASH = /^[a-f0-9]{64}$/;

function text(value: unknown, code: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(code);
  return value;
}

function hash(value: unknown, code: string): string {
  const normalized = text(value, code);
  if (!HASH.test(normalized)) throw new Error(code);
  return normalized;
}

function instant(value: Date, code: string): string {
  if (!Number.isFinite(value.getTime())) throw new Error(code);
  return value.toISOString();
}

function rawSha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function transaction<T>(pool: ClubsStripeSandboxPool, tenantId: string, run: (client: DbClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
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

export async function persistClubsStripeSandboxPayment(input: Readonly<{
  pool: ClubsStripeSandboxPool;
  authority: ClubsStripeSandboxPaymentAuthority;
  createdAt: Date;
}>): Promise<{ paymentId: string; authoritySha256: string; replayed: boolean }> {
  const { authority } = input;
  if (authority.livemode !== false) throw new Error("CCLUB_STRIPE_REPOSITORY_TEST_MODE_REQUIRED");
  const createdAt = instant(input.createdAt, "CCLUB_STRIPE_REPOSITORY_TIME_INVALID");
  const authoritySha256 = clubsStripeSha256(authority);
  return transaction(input.pool, authority.tenantId, async (client) => {
    const inserted = await client.query(
      `INSERT INTO crays_core.clubs_stripe_sandbox_payments (
         tenant_id, payment_id, payment_authority_id, project_id, payment_kind, billing_ledger_domain,
         subject_reference, amount_minor, currency, operator_connected_account_id,
         application_fee_amount_minor, allocation_plan_sha256, authority_json,
         authority_sha256, idempotency_key, payment_state, livemode, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,'PREPARED',false,$16,$16)
       ON CONFLICT (tenant_id, payment_id) DO NOTHING
       RETURNING payment_id`,
      [
        authority.tenantId,
        authority.paymentId,
        authority.paymentAuthorityId,
        authority.projectId,
        authority.paymentKind,
        authority.billingLedgerDomain,
        authority.subjectReference,
        authority.amountMinor,
        authority.currency,
        authority.operatorConnectedAccountId,
        authority.applicationFeeAmountMinor,
        authority.allocationPlanSha256,
        JSON.stringify(authority),
        authoritySha256,
        authority.idempotencyKey,
        createdAt,
      ],
    );
    const replayed = (inserted.rowCount ?? inserted.rows.length) === 0;
    const existing = await client.query<PaymentRow>(
      `SELECT payment_id, authority_sha256, stripe_payment_intent_id, payment_state
         FROM crays_core.clubs_stripe_sandbox_payments
        WHERE tenant_id=$1 AND payment_id=$2
        FOR UPDATE`,
      [authority.tenantId, authority.paymentId],
    );
    const row = existing.rows[0];
    if (!row || hash(row.authority_sha256, "CCLUB_STRIPE_PAYMENT_AUTHORITY_INVALID") !== authoritySha256) {
      throw new Error("CCLUB_STRIPE_PAYMENT_IDEMPOTENCY_CONFLICT");
    }
    if (!replayed) {
      for (const line of authority.allocation) {
        await client.query(
          `INSERT INTO crays_core.clubs_stripe_sandbox_ledger_entries (
             tenant_id, ledger_entry_id, payment_id, payment_kind, billing_ledger_domain,
             beneficiary_kind, entry_type, direction, amount_minor, currency,
             evidence_sha256, idempotency_key, occurred_at
           ) VALUES ($1,$2,$3,$4,$5,$6,'ALLOCATION','CREDIT',$7,$8,$9,$10,$11)`,
          [
            authority.tenantId,
            `${authority.paymentId}:allocation:${line.beneficiaryKind}`,
            authority.paymentId,
            authority.paymentKind,
            authority.billingLedgerDomain,
            line.beneficiaryKind,
            line.amountMinor,
            authority.currency,
            authority.allocationPlanSha256,
            `${authority.idempotencyKey}:allocation:${line.beneficiaryKind}`,
            createdAt,
          ],
        );
        if (line.beneficiaryKind !== "operator_or_franchise") {
          await client.query(
            `INSERT INTO crays_core.clubs_stripe_sandbox_transfer_commands (
               tenant_id, transfer_command_id, payment_id, beneficiary_kind,
               destination_connected_account_id, basis_points, amount_minor, currency,
               idempotency_key, transfer_state, available_at, created_at, updated_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING',$10,$10,$10)`,
            [
              authority.tenantId,
              `${authority.paymentId}:transfer:${line.beneficiaryKind}`,
              authority.paymentId,
              line.beneficiaryKind,
              line.destinationConnectedAccountId,
              line.basisPoints,
              line.amountMinor,
              authority.currency,
              `${authority.idempotencyKey}:transfer:${line.beneficiaryKind}`,
              createdAt,
            ],
          );
        }
      }
    }
    return { paymentId: authority.paymentId, authoritySha256, replayed };
  });
}

export async function recordClubsStripePaymentIntentReceipt(input: Readonly<{
  pool: ClubsStripeSandboxPool;
  tenantId: string;
  paymentId: string;
  providerReceiptId: string;
  receipt: ClubsStripePaymentIntentReceipt;
  observedAt: Date;
}>): Promise<{ replayed: boolean }> {
  const observedAt = instant(input.observedAt, "CCLUB_STRIPE_RECEIPT_TIME_INVALID");
  return transaction(input.pool, input.tenantId, async (client) => {
    const payment = await client.query<PaymentRow & { operator_connected_account_id: string; amount_minor: number; application_fee_amount_minor: number; currency: string }>(
      `SELECT payment_id, authority_sha256, stripe_payment_intent_id, payment_state,
              operator_connected_account_id, amount_minor, application_fee_amount_minor, currency
         FROM crays_core.clubs_stripe_sandbox_payments
        WHERE tenant_id=$1 AND payment_id=$2 FOR UPDATE`,
      [input.tenantId, input.paymentId],
    );
    const row = payment.rows[0];
    if (
      !row || input.receipt.livemode !== false ||
      row.operator_connected_account_id !== input.receipt.connectedAccountId ||
      Number(row.amount_minor) !== input.receipt.amountMinor ||
      Number(row.application_fee_amount_minor) !== input.receipt.applicationFeeAmountMinor ||
      row.currency.toLowerCase() !== input.receipt.currency
    ) {
      throw new Error("CCLUB_STRIPE_PAYMENT_RECEIPT_SCOPE_MISMATCH");
    }
    const inserted = await client.query(
      `INSERT INTO crays_core.clubs_stripe_sandbox_payment_receipts (
         tenant_id, provider_receipt_id, payment_id, stripe_payment_intent_id,
         stripe_connected_account_id, payment_state, amount_minor,
         application_fee_amount_minor, currency, provider_request_id,
         provider_response_sha256, livemode, observed_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,$12)
       ON CONFLICT (tenant_id, stripe_connected_account_id, stripe_payment_intent_id, payment_state) DO NOTHING
       RETURNING provider_receipt_id`,
      [
        input.tenantId,
        input.providerReceiptId,
        input.paymentId,
        input.receipt.paymentIntentId,
        input.receipt.connectedAccountId,
        input.receipt.state,
        input.receipt.amountMinor,
        input.receipt.applicationFeeAmountMinor,
        input.receipt.currency,
        input.receipt.providerRequestId,
        input.receipt.providerResponseSha256,
        observedAt,
      ],
    );
    await client.query(
      `UPDATE crays_core.clubs_stripe_sandbox_payments
          SET stripe_payment_intent_id=$3, payment_state=$4, updated_at=$5
        WHERE tenant_id=$1 AND payment_id=$2
          AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id=$3)`,
      [input.tenantId, input.paymentId, input.receipt.paymentIntentId, input.receipt.state, observedAt],
    );
    return { replayed: (inserted.rowCount ?? inserted.rows.length) === 0 };
  });
}

function webhookPaymentIntentId(event: VerifiedStripeConnectEvent): string {
  const direct = event.object.id;
  const nested = event.object.payment_intent;
  const value = typeof direct === "string" && direct.startsWith("pi_") ? direct : nested;
  if (typeof value !== "string" || !/^pi_[A-Za-z0-9]{8,}$/.test(value)) {
    throw new Error("CCLUB_STRIPE_WEBHOOK_PAYMENT_INTENT_INVALID");
  }
  return value;
}

export async function recordClubsStripeWebhook(input: Readonly<{
  pool: ClubsStripeSandboxPool;
  tenantId: string;
  paymentId: string;
  webhookReceiptId: string;
  event: VerifiedStripeConnectEvent;
  rawBody: string;
  signatureHeader: string;
  receivedAt: Date;
}>): Promise<{ replayed: boolean }> {
  if (input.event.livemode !== false) throw new Error("CCLUB_STRIPE_WEBHOOK_TEST_MODE_REQUIRED");
  const paymentIntentId = webhookPaymentIntentId(input.event);
  const metadata = input.event.object.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata) || (metadata as Record<string, unknown>).crays_payment_id !== input.paymentId) {
    throw new Error("CCLUB_STRIPE_WEBHOOK_PAYMENT_SCOPE_MISMATCH");
  }
  const receivedAt = instant(input.receivedAt, "CCLUB_STRIPE_WEBHOOK_TIME_INVALID");
  const stripeCreatedAt = new Date(input.event.created * 1_000);
  if (!Number.isFinite(stripeCreatedAt.getTime())) throw new Error("CCLUB_STRIPE_WEBHOOK_PROVIDER_TIME_INVALID");
  return transaction(input.pool, input.tenantId, async (client) => {
    const payment = await client.query<{ operator_connected_account_id: string; stripe_payment_intent_id: string | null }>(
      `SELECT operator_connected_account_id, stripe_payment_intent_id
         FROM crays_core.clubs_stripe_sandbox_payments
        WHERE tenant_id=$1 AND payment_id=$2 FOR UPDATE`,
      [input.tenantId, input.paymentId],
    );
    const row = payment.rows[0];
    if (!row || row.operator_connected_account_id !== input.event.connectedAccountId || (row.stripe_payment_intent_id && row.stripe_payment_intent_id !== paymentIntentId)) {
      throw new Error("CCLUB_STRIPE_WEBHOOK_AUTHORITY_MISMATCH");
    }
    const eventPayloadSha256 = clubsStripeSha256({
      id: input.event.id,
      type: input.event.type,
      created: input.event.created,
      account: input.event.connectedAccountId,
      object: input.event.object,
    });
    const inserted = await client.query(
      `INSERT INTO crays_core.clubs_stripe_sandbox_webhook_inbox (
         tenant_id, webhook_receipt_id, payment_id, stripe_event_id, stripe_event_type,
         stripe_connected_account_id, stripe_payment_intent_id, stripe_created_at,
         raw_body, raw_body_sha256, signature_header_sha256, event_payload_sha256,
         signature_verified, livemode, received_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,false,$13)
       ON CONFLICT (tenant_id, stripe_connected_account_id, stripe_event_id) DO NOTHING
       RETURNING webhook_receipt_id`,
      [
        input.tenantId,
        input.webhookReceiptId,
        input.paymentId,
        input.event.id,
        input.event.type,
        input.event.connectedAccountId,
        paymentIntentId,
        stripeCreatedAt.toISOString(),
        input.rawBody,
        input.event.rawBodyDigest,
        rawSha256(input.signatureHeader),
        eventPayloadSha256,
        receivedAt,
      ],
    );
    if ((inserted.rowCount ?? inserted.rows.length) === 0) {
      const existing = await client.query<{ raw_body_sha256: string; event_payload_sha256: string }>(
        `SELECT raw_body_sha256, event_payload_sha256
           FROM crays_core.clubs_stripe_sandbox_webhook_inbox
          WHERE tenant_id=$1 AND stripe_connected_account_id=$2 AND stripe_event_id=$3`,
        [input.tenantId, input.event.connectedAccountId, input.event.id],
      );
      const prior = existing.rows[0];
      if (!prior || prior.raw_body_sha256 !== input.event.rawBodyDigest || prior.event_payload_sha256 !== eventPayloadSha256) {
        throw new Error("CCLUB_STRIPE_WEBHOOK_REPLAY_CONFLICT");
      }
      return { replayed: true };
    }
    return { replayed: false };
  });
}

export async function recordClubsStripeTransferReceipt(input: Readonly<{
  pool: ClubsStripeSandboxPool;
  tenantId: string;
  paymentId: string;
  beneficiaryKind: "ambassador" | "software" | "global_concept";
  receipt: ClubsStripeTransferReceipt;
  recordedAt: Date;
}>): Promise<{ replayed: boolean }> {
  const recordedAt = instant(input.recordedAt, "CCLUB_STRIPE_TRANSFER_TIME_INVALID");
  return transaction(input.pool, input.tenantId, async (client) => {
    const command = await client.query<{ transfer_command_id: string; destination_connected_account_id: string; amount_minor: number; currency: string; transfer_state: string }>(
      `SELECT transfer_command_id, destination_connected_account_id, amount_minor, currency, transfer_state
         FROM crays_core.clubs_stripe_sandbox_transfer_commands
        WHERE tenant_id=$1 AND payment_id=$2 AND beneficiary_kind=$3 FOR UPDATE`,
      [input.tenantId, input.paymentId, input.beneficiaryKind],
    );
    const row = command.rows[0];
    if (
      !row || input.receipt.livemode !== false ||
      row.destination_connected_account_id !== input.receipt.destinationConnectedAccountId ||
      Number(row.amount_minor) !== input.receipt.amountMinor || row.currency.toLowerCase() !== input.receipt.currency
    ) {
      throw new Error("CCLUB_STRIPE_TRANSFER_RECEIPT_SCOPE_MISMATCH");
    }
    if (row.transfer_state === "CONFIRMED") return { replayed: true };
    const updated = await client.query(
      `UPDATE crays_core.clubs_stripe_sandbox_transfer_commands
          SET transfer_state='CONFIRMED', stripe_transfer_id=$4,
              provider_response_sha256=$5, updated_at=$6
        WHERE tenant_id=$1 AND payment_id=$2 AND beneficiary_kind=$3
          AND transfer_state <> 'CONFIRMED'
        RETURNING transfer_command_id`,
      [input.tenantId, input.paymentId, input.beneficiaryKind, input.receipt.transferId, input.receipt.providerResponseSha256, recordedAt],
    );
    if ((updated.rowCount ?? updated.rows.length) !== 1) throw new Error("CCLUB_STRIPE_TRANSFER_UPDATE_CONFLICT");
    await client.query(
      `INSERT INTO crays_core.clubs_stripe_sandbox_ledger_entries (
         tenant_id, ledger_entry_id, payment_id, payment_kind, billing_ledger_domain,
         beneficiary_kind, entry_type, direction, amount_minor, currency,
         external_reference, evidence_sha256, idempotency_key, occurred_at
       ) SELECT tenant_id, $4, payment_id, payment_kind, billing_ledger_domain,
                $3, 'TRANSFER_CONFIRMED', 'DEBIT', $5, currency, $6, $7, $8, $9
           FROM crays_core.clubs_stripe_sandbox_payments
          WHERE tenant_id=$1 AND payment_id=$2`,
      [
        input.tenantId,
        input.paymentId,
        input.beneficiaryKind,
        `${input.paymentId}:transfer-confirmed:${input.beneficiaryKind}`,
        input.receipt.amountMinor,
        input.receipt.transferId,
        input.receipt.providerResponseSha256,
        `${input.paymentId}:transfer-confirmed:${input.beneficiaryKind}`,
        recordedAt,
      ],
    );
    return { replayed: false };
  });
}

export async function persistClubsStripeRefundCommand(input: Readonly<{
  pool: ClubsStripeSandboxPool;
  tenantId: string;
  paymentId: string;
  refundCommandId: string;
  amountMinor: number;
  reason: "requested_by_customer" | "duplicate" | "fraudulent";
  idempotencyKey: string;
  createdAt: Date;
}>): Promise<{ replayed: boolean; paymentIntentId: string; currency: string }> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error("CCLUB_STRIPE_REFUND_AMOUNT_INVALID");
  const createdAt = instant(input.createdAt, "CCLUB_STRIPE_REFUND_TIME_INVALID");
  return transaction(input.pool, input.tenantId, async (client) => {
    const payment = await client.query<{
      amount_minor: number;
      currency: string;
      payment_state: string;
      stripe_payment_intent_id: string | null;
      refunded_minor: number;
    }>(
      `SELECT p.amount_minor,p.currency,p.payment_state,p.stripe_payment_intent_id,
              COALESCE((SELECT sum(r.amount_minor) FROM crays_core.clubs_stripe_sandbox_refund_commands r
                         WHERE r.tenant_id=p.tenant_id AND r.payment_id=p.payment_id AND r.refund_state='SUCCEEDED'),0)::bigint refunded_minor
         FROM crays_core.clubs_stripe_sandbox_payments p
        WHERE p.tenant_id=$1 AND p.payment_id=$2 FOR UPDATE`,
      [input.tenantId, input.paymentId],
    );
    const row = payment.rows[0];
    if (!row || row.payment_state !== "SUCCEEDED" || !row.stripe_payment_intent_id) {
      throw new Error("CCLUB_STRIPE_REFUND_PAYMENT_NOT_SETTLED");
    }
    if (input.amountMinor > Number(row.amount_minor) - Number(row.refunded_minor)) {
      throw new Error("CCLUB_STRIPE_REFUND_EXCEEDS_REMAINING_AMOUNT");
    }
    const inserted = await client.query(
      `INSERT INTO crays_core.clubs_stripe_sandbox_refund_commands(
         tenant_id,refund_command_id,payment_id,amount_minor,currency,reason,
         idempotency_key,refund_state,created_at,updated_at
       ) VALUES($1,$2,$3,$4,$5,$6,$7,'PENDING',$8,$8)
       ON CONFLICT (tenant_id,idempotency_key) DO NOTHING
       RETURNING refund_command_id`,
      [input.tenantId, input.refundCommandId, input.paymentId, input.amountMinor, row.currency, input.reason, input.idempotencyKey, createdAt],
    );
    const replayed = (inserted.rowCount ?? inserted.rows.length) === 0;
    if (replayed) {
      const existing = await client.query<{ refund_command_id: string; payment_id: string; amount_minor: number; reason: string }>(
        `SELECT refund_command_id,payment_id,amount_minor,reason
           FROM crays_core.clubs_stripe_sandbox_refund_commands
          WHERE tenant_id=$1 AND idempotency_key=$2`,
        [input.tenantId, input.idempotencyKey],
      );
      const prior = existing.rows[0];
      if (!prior || prior.refund_command_id !== input.refundCommandId || prior.payment_id !== input.paymentId || Number(prior.amount_minor) !== input.amountMinor || prior.reason !== input.reason) {
        throw new Error("CCLUB_STRIPE_REFUND_IDEMPOTENCY_CONFLICT");
      }
    }
    return { replayed, paymentIntentId: row.stripe_payment_intent_id, currency: row.currency };
  });
}

export async function recordClubsStripeRefundReceipt(input: Readonly<{
  pool: ClubsStripeSandboxPool;
  tenantId: string;
  paymentId: string;
  refundCommandId: string;
  receipt: ClubsStripeRefundReceipt;
  recordedAt: Date;
}>): Promise<{ replayed: boolean }> {
  const recordedAt = instant(input.recordedAt, "CCLUB_STRIPE_REFUND_TIME_INVALID");
  return transaction(input.pool, input.tenantId, async (client) => {
    const command = await client.query<{
      amount_minor: number;
      currency: string;
      refund_state: string;
      payment_kind: "MEMBERSHIP" | "STAY";
      billing_ledger_domain: "clubs-membership" | "clubs-stay";
      payment_amount_minor: number;
      authority_json: Record<string, unknown>;
    }>(
      `SELECT r.amount_minor, r.currency, r.refund_state, p.payment_kind,
              p.billing_ledger_domain, p.amount_minor payment_amount_minor, p.authority_json
         FROM crays_core.clubs_stripe_sandbox_refund_commands r
         JOIN crays_core.clubs_stripe_sandbox_payments p
           ON p.tenant_id=r.tenant_id AND p.payment_id=r.payment_id
        WHERE r.tenant_id=$1 AND r.payment_id=$2 AND r.refund_command_id=$3
        FOR UPDATE OF r,p`,
      [input.tenantId, input.paymentId, input.refundCommandId],
    );
    const row = command.rows[0];
    if (!row || input.receipt.livemode !== false || Number(row.amount_minor) !== input.receipt.amountMinor || row.currency.toLowerCase() !== input.receipt.currency) {
      throw new Error("CCLUB_STRIPE_REFUND_RECEIPT_SCOPE_MISMATCH");
    }
    if (row.refund_state === "SUCCEEDED" && input.receipt.state === "SUCCEEDED") return { replayed: true };
    const updated = await client.query(
      `UPDATE crays_core.clubs_stripe_sandbox_refund_commands
          SET refund_state=$4, stripe_refund_id=$5, provider_response_sha256=$6, updated_at=$7
        WHERE tenant_id=$1 AND payment_id=$2 AND refund_command_id=$3
        RETURNING refund_command_id`,
      [input.tenantId, input.paymentId, input.refundCommandId, input.receipt.state, input.receipt.refundId, input.receipt.providerResponseSha256, recordedAt],
    );
    if ((updated.rowCount ?? updated.rows.length) !== 1) throw new Error("CCLUB_STRIPE_REFUND_UPDATE_CONFLICT");
    if (input.receipt.state === "SUCCEEDED") {
      const allocation = row.authority_json.allocation;
      if (!Array.isArray(allocation) || allocation.length !== 4) throw new Error("CCLUB_STRIPE_REFUND_ALLOCATION_AUTHORITY_INVALID");
      const original = new Map<string, number>();
      for (const candidate of allocation) {
        if (!candidate || typeof candidate !== "object") throw new Error("CCLUB_STRIPE_REFUND_ALLOCATION_AUTHORITY_INVALID");
        const value = candidate as Record<string, unknown>;
        if (typeof value.beneficiaryKind !== "string" || typeof value.amountMinor !== "number" || !Number.isSafeInteger(value.amountMinor)) {
          throw new Error("CCLUB_STRIPE_REFUND_ALLOCATION_AUTHORITY_INVALID");
        }
        original.set(value.beneficiaryKind, value.amountMinor as number);
      }
      const gross = Number(row.payment_amount_minor);
      const ambassador = Math.floor((input.receipt.amountMinor * (original.get("ambassador") ?? 0)) / gross);
      const software = Math.floor((input.receipt.amountMinor * (original.get("software") ?? 0)) / gross);
      const globalConcept = Math.floor((input.receipt.amountMinor * (original.get("global_concept") ?? 0)) / gross);
      const operator = input.receipt.amountMinor - ambassador - software - globalConcept;
      const lines = [
        ["operator_or_franchise", operator],
        ["ambassador", ambassador],
        ["software", software],
        ["global_concept", globalConcept],
      ] as const;
      for (const [beneficiaryKind, amountMinor] of lines) {
        if (amountMinor <= 0) continue;
        await client.query(
          `INSERT INTO crays_core.clubs_stripe_sandbox_ledger_entries(
             tenant_id,ledger_entry_id,payment_id,payment_kind,billing_ledger_domain,
             beneficiary_kind,entry_type,direction,amount_minor,currency,
             external_reference,evidence_sha256,idempotency_key,occurred_at
           ) VALUES($1,$2,$3,$4,$5,$6,'REFUND','DEBIT',$7,$8,$9,$10,$11,$12)
           ON CONFLICT (tenant_id,idempotency_key) DO NOTHING`,
          [
            input.tenantId,
            `${input.refundCommandId}:refund:${beneficiaryKind}`,
            input.paymentId,
            row.payment_kind,
            row.billing_ledger_domain,
            beneficiaryKind,
            amountMinor,
            row.currency,
            input.receipt.refundId,
            input.receipt.providerResponseSha256,
            `${input.refundCommandId}:refund:${beneficiaryKind}`,
            recordedAt,
          ],
        );
      }
      await client.query(
        `UPDATE crays_core.clubs_stripe_sandbox_payments p
            SET payment_state=CASE WHEN (
              SELECT COALESCE(sum(r.amount_minor),0) FROM crays_core.clubs_stripe_sandbox_refund_commands r
               WHERE r.tenant_id=p.tenant_id AND r.payment_id=p.payment_id AND r.refund_state='SUCCEEDED'
            ) >= p.amount_minor THEN 'REFUNDED' ELSE p.payment_state END,
                updated_at=$3
          WHERE p.tenant_id=$1 AND p.payment_id=$2`,
        [input.tenantId, input.paymentId, recordedAt],
      );
    }
    return { replayed: false };
  });
}

export async function reconcileClubsStripeSandboxPayment(input: Readonly<{
  pool: ClubsStripeSandboxPool;
  tenantId: string;
  paymentId: string;
  reconciliationReceiptId: string;
  reconciledAt: Date;
}>): Promise<{
  state: "BALANCED" | "MISMATCH";
  reconciliationSha256: string;
  replayed: boolean;
}> {
  const reconciledAt = instant(input.reconciledAt, "CCLUB_STRIPE_RECONCILIATION_TIME_INVALID");
  return transaction(input.pool, input.tenantId, async (client) => {
    const result = await client.query<{
      stripe_payment_intent_id: string | null;
      amount_minor: number;
      application_fee_amount_minor: number;
      currency: string;
      ledger_credit_minor: number;
      transfer_confirmed_minor: number;
      refund_succeeded_minor: number;
    }>(
      `SELECT p.stripe_payment_intent_id,p.amount_minor,p.application_fee_amount_minor,p.currency,
              COALESCE(sum(l.amount_minor) FILTER (WHERE l.entry_type='ALLOCATION' AND l.direction='CREDIT'),0)::bigint ledger_credit_minor,
              COALESCE(sum(l.amount_minor) FILTER (WHERE l.entry_type='TRANSFER_CONFIRMED' AND l.direction='DEBIT'),0)::bigint transfer_confirmed_minor,
              COALESCE(sum(l.amount_minor) FILTER (WHERE l.entry_type='REFUND' AND l.direction='DEBIT'),0)::bigint refund_succeeded_minor
         FROM crays_core.clubs_stripe_sandbox_payments p
         LEFT JOIN crays_core.clubs_stripe_sandbox_ledger_entries l
           ON l.tenant_id=p.tenant_id AND l.payment_id=p.payment_id
        WHERE p.tenant_id=$1 AND p.payment_id=$2
        GROUP BY p.tenant_id,p.payment_id,p.stripe_payment_intent_id,p.amount_minor,
                 p.application_fee_amount_minor,p.currency`,
      [input.tenantId, input.paymentId],
    );
    const row = result.rows[0];
    if (!row || !row.stripe_payment_intent_id) throw new Error("CCLUB_STRIPE_RECONCILIATION_PAYMENT_NOT_READY");
    const gross = Number(row.amount_minor);
    const applicationFee = Number(row.application_fee_amount_minor);
    const ledgerCredit = Number(row.ledger_credit_minor);
    const transferConfirmed = Number(row.transfer_confirmed_minor);
    const refundSucceeded = Number(row.refund_succeeded_minor);
    const state = ledgerCredit === gross && transferConfirmed === applicationFee && refundSucceeded <= gross
      ? "BALANCED" as const
      : "MISMATCH" as const;
    const reconciliationSha256 = clubsStripeSha256({
      tenantId: input.tenantId,
      paymentId: input.paymentId,
      paymentIntentId: row.stripe_payment_intent_id,
      gross,
      applicationFee,
      ledgerCredit,
      transferConfirmed,
      refundSucceeded,
      currency: row.currency,
      state,
      reconciledAt,
    });
    const inserted = await client.query(
      `INSERT INTO crays_core.clubs_stripe_sandbox_reconciliation_receipts(
         tenant_id,reconciliation_receipt_id,payment_id,stripe_payment_intent_id,
         payment_amount_minor,ledger_credit_minor,transfer_confirmed_minor,
         refund_succeeded_minor,currency,reconciliation_state,reconciliation_sha256,reconciled_at
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (tenant_id,payment_id,reconciliation_sha256) DO NOTHING
       RETURNING reconciliation_receipt_id`,
      [
        input.tenantId,
        input.reconciliationReceiptId,
        input.paymentId,
        row.stripe_payment_intent_id,
        gross,
        ledgerCredit,
        transferConfirmed,
        refundSucceeded,
        row.currency,
        state,
        reconciliationSha256,
        reconciledAt,
      ],
    );
    return { state, reconciliationSha256, replayed: (inserted.rowCount ?? inserted.rows.length) === 0 };
  });
}
