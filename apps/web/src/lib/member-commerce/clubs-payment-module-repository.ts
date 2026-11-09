import "server-only";

import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

import { getCorePgPool } from "@/db/client";
import { readOwnAmbassadorBackofficeByAccount } from "@/lib/member-commerce/ambassador-stripe-split-repository";
import {
  CLUBS_PAYMENT_MODULE_CONTRACT,
  nextActionsForPaymentState,
  reconciliationInstructionForPaymentState,
  type ClubsAmbassadorSettlementStatus,
  type ClubsFinancePaymentOverview,
  type ClubsMemberPaymentStatus,
  type ClubsPaymentModuleKind,
  type ClubsPaymentModuleNextAction,
  type ClubsPaymentModuleState,
} from "./clubs-payment-module-contract";

type PaymentRow = Readonly<{
  authority_state: string;
  expires_at: Date | string;
  payment_id: string | null;
  payment_state: string | null;
  amount_minor: string | number;
  currency: string;
  stripe_payment_intent_id: string | null;
  refund_state: string | null;
  reconciliation_state: string | null;
  updated_at: Date | string | null;
}>;

const SAFE_CURRENCY = /^[A-Z]{3}$/;

export class ClubsPaymentModuleReadError extends Error {
  readonly code = "CCLUB_PAYMENT_MODULE_READ_UNAVAILABLE";

  constructor(cause?: unknown) {
    super("CCLUB_PAYMENT_MODULE_READ_UNAVAILABLE", { cause });
    this.name = "ClubsPaymentModuleReadError";
  }
}

function instant(value: Date | string | null): string {
  const parsed = value instanceof Date ? value : new Date(value ?? 0);
  return Number.isFinite(parsed.getTime())
    ? parsed.toISOString()
    : new Date(0).toISOString();
}

function positiveMinor(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

function currency(value: string): string {
  return SAFE_CURRENCY.test(value) ? value : "XXX";
}

function activityReference(scope: string, value: string): string {
  return `activity_${createHash("sha256")
    .update(`${scope}:${value}`, "utf8")
    .digest("hex")
    .slice(0, 20)}`;
}

async function readOnlyTransaction<T>(
  tenantId: string,
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin transaction read only");
    await client.query("select set_config('crays.app_role','core_service',true)");
    await client.query("select set_config('crays.tenant_id',$1,true)", [tenantId]);
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw new ClubsPaymentModuleReadError(error);
  } finally {
    client.release();
  }
}

function mapPaymentState(row: PaymentRow): ClubsPaymentModuleState {
  if (row.refund_state === "SUCCEEDED" || row.payment_state === "REFUNDED") {
    return "refunded";
  }
  if (row.refund_state === "PENDING" || row.refund_state === "RETRYABLE") {
    return "refund_pending";
  }
  if (row.reconciliation_state === "MISMATCH") return "reconcile_required";
  switch (row.payment_state) {
    case "PREPARED":
      return "prepared";
    case "REQUIRES_PAYMENT_METHOD":
    case "REQUIRES_ACTION":
      return "ready_to_pay";
    case "PROCESSING":
    case "AUTHORIZED":
      return "processing";
    case "SUCCEEDED":
      return row.reconciliation_state === "BALANCED"
        ? "paid_confirmation_received"
        : "reconcile_required";
    case "FAILED":
    case "CANCELED":
      return "failed";
    default:
      return "ready_to_prepare";
  }
}

async function hasUnmaterializedSetup(
  client: PoolClient,
  tenantId: string,
  memberAccountId: string,
  paymentKind: ClubsPaymentModuleKind,
): Promise<boolean> {
  const sql =
    paymentKind === "MEMBERSHIP"
      ? `select setup_receipt_id
           from crays_core.clubs_membership_payment_adapter_setup_receipts
          where tenant_id=$1 and member_account_id=$2
            and fee_offer_valid_from<=transaction_timestamp()
            and fee_offer_expires_at>transaction_timestamp()
            and owner_authority_expires_at>transaction_timestamp()
            and owner_authority_verified and provider_readback_verified
            and livemode=false and provider_called=false
            and provider_success_claimed=false and payment_success_claimed=false
            and membership_granted=false
            and not exists (
              select 1
                from crays_core.clubs_stripe_sandbox_payment_authorities authority
               where authority.tenant_id=$1
                 and authority.payment_authority_id=
                     clubs_membership_payment_adapter_setup_receipts.payment_authority_id
            )
          order by created_at desc limit 2`
      : `select adapter_receipt_id
           from crays_core.clubs_stripe_sandbox_trusted_stay_adapter_receipts
          where tenant_id=$1 and member_account_id=$2
            and source_expires_at>transaction_timestamp()
            and provider_readback_verified and persistable_to_0256
            and provider_callable and persistence_allowed and provider_use_allowed
            and livemode=false
            and not exists (
              select 1
                from crays_core.clubs_stripe_sandbox_payment_authorities authority
               where authority.tenant_id=$1
                 and authority.payment_authority_id=
                     clubs_stripe_sandbox_trusted_stay_adapter_receipts.payment_authority_id
            )
          order by created_at desc limit 2`;
  const result = await client.query(sql, [tenantId, memberAccountId]);
  return result.rows.length === 1;
}

export async function readClubsMemberPaymentStatus(input: Readonly<{
  tenantId: string;
  memberAccountId: string;
  paymentKind: ClubsPaymentModuleKind;
}>): Promise<ClubsMemberPaymentStatus> {
  return readOnlyTransaction(input.tenantId, async (client) => {
    const result = await client.query<PaymentRow>(
      `select authority.authority_state,authority.expires_at,
              payment.payment_id,payment.payment_state,
              authority.amount_minor,authority.currency,
              payment.stripe_payment_intent_id,payment.updated_at,
              refund.refund_state,reconciliation.reconciliation_state
         from crays_core.clubs_stripe_sandbox_payment_authorities authority
         left join crays_core.clubs_stripe_sandbox_payments payment
           on payment.tenant_id=authority.tenant_id
          and payment.payment_authority_id=authority.payment_authority_id
         left join lateral (
           select refund_state
             from crays_core.clubs_stripe_sandbox_refund_commands refund
            where refund.tenant_id=payment.tenant_id
              and refund.payment_id=payment.payment_id
            order by refund.updated_at desc limit 1
         ) refund on true
         left join lateral (
           select reconciliation_state
             from crays_core.clubs_stripe_sandbox_reconciliation_receipts receipt
            where receipt.tenant_id=payment.tenant_id
              and receipt.payment_id=payment.payment_id
            order by receipt.reconciled_at desc limit 1
         ) reconciliation on true
        where authority.tenant_id=$1
          and authority.member_account_id=$2
          and authority.payment_kind=$3
        order by payment.updated_at desc nulls last,authority.created_at desc
        limit 20`,
      [input.tenantId, input.memberAccountId, input.paymentKind],
    );

    const now = Date.now();
    const current = result.rows.find(
      (row) =>
        row.authority_state === "READY" &&
        new Date(row.expires_at).getTime() > now,
    );
    let state: ClubsPaymentModuleState = "payment_setup_pending";
    if (current) {
      state = mapPaymentState(current);
    } else if (
      await hasUnmaterializedSetup(
        client,
        input.tenantId,
        input.memberAccountId,
        input.paymentKind,
      )
    ) {
      state = "ready_to_prepare";
    }

    const recentActivity = result.rows
      .filter((row) => row.payment_id && row.payment_state && row.updated_at)
      .slice(0, 10)
      .map((row) =>
        Object.freeze({
          activityReference: activityReference(
            `${input.tenantId}:${input.paymentKind}`,
            row.payment_id!,
          ),
          state: mapPaymentState(row),
          amount: Object.freeze({
            minor: positiveMinor(row.amount_minor),
            currency: currency(row.currency),
          }),
          updatedAt: instant(row.updated_at),
        }),
      );
    const amountSource = current;

    return Object.freeze({
      schema: CLUBS_PAYMENT_MODULE_CONTRACT.schema,
      version: CLUBS_PAYMENT_MODULE_CONTRACT.version,
      status: "ready" as const,
      paymentKind: input.paymentKind,
      state,
      amount: amountSource
        ? Object.freeze({
            minor: positiveMinor(amountSource.amount_minor),
            currency: currency(amountSource.currency),
          })
        : null,
      recentActivity: Object.freeze(recentActivity),
      allowedNextActions: nextActionsForPaymentState(state),
      reconciliationInstruction: reconciliationInstructionForPaymentState(state),
      livemode: false as const,
      providerCalled: Boolean(current?.stripe_payment_intent_id),
      providerSuccessClaimed: false as const,
      paymentSuccessClaimed: false as const,
      bookingConfirmed: false as const,
      membershipGranted: false as const,
    });
  });
}

function settlementState(
  stripeState: string,
  erpState: string | null,
  reconciliationState: string | null,
): "pending" | "processing" | "settled" | "reconcile_required" | "failed" {
  if (reconciliationState && reconciliationState !== "BALANCED") {
    return "reconcile_required";
  }
  if (stripeState === "FAILED" || erpState === "FAILED") return "failed";
  if (stripeState === "CONFIRMED" && erpState === "DELIVERED") return "settled";
  if (stripeState === "LEASED" || erpState === "LEASED") return "processing";
  return "pending";
}

export async function readClubsAmbassadorSettlementStatus(input: Readonly<{
  tenantId: string;
  canonicalAccountId: string;
  roleAssignmentId: string;
}>): Promise<ClubsAmbassadorSettlementStatus> {
  let backoffice: Awaited<ReturnType<typeof readOwnAmbassadorBackofficeByAccount>>;
  try {
    backoffice = await readOwnAmbassadorBackofficeByAccount(input);
  } catch (error) {
    throw new ClubsPaymentModuleReadError(error);
  }
  if (backoffice.state !== "AMBASSADOR_BACKOFFICE") {
    return Object.freeze({
      schema: CLUBS_PAYMENT_MODULE_CONTRACT.schema,
      version: CLUBS_PAYMENT_MODULE_CONTRACT.version,
      status: "ready",
      state: "setup_pending",
      readinessState: null,
      totals: Object.freeze([]),
      activity: Object.freeze([]),
      allowedNextActions: Object.freeze([
        "complete_payment_setup",
        "refresh_status",
      ] as const),
      reconciliationInstruction: "setup_required_before_payment",
      ownAttributableActivityOnly: true,
      foreignAmbassadorAccess: false,
      providerCalled: false,
      providerSuccessClaimed: false,
      livemode: false,
    });
  }

  const totals = new Map<string, number>();
  let requiresReconciliation = false;
  const activity = backoffice.bookingAllocations.map((row) => {
    const safeCurrency = currency(row.currency);
    totals.set(safeCurrency, (totals.get(safeCurrency) ?? 0) + row.amountMinor);
    const state = settlementState(
      row.stripeDeliveryState,
      row.erpDeliveryState,
      row.erpReconciliationState,
    );
    requiresReconciliation ||= state === "reconcile_required" || state === "failed";
    return Object.freeze({
      activityReference: activityReference(
        `${input.tenantId}:ambassador`,
        `${row.bookingId}:${row.orderId}`,
      ),
      amount: Object.freeze({ minor: row.amountMinor, currency: safeCurrency }),
      settlementState: state,
      occurredAt: row.createdAt,
    });
  });
  const state = requiresReconciliation
    ? "reconcile_required"
    : activity.length > 0
      ? "activity_ready"
      : "no_activity";
  const allowedNextActions: readonly ClubsPaymentModuleNextAction[] =
    requiresReconciliation
      ? ["wait_for_reconciliation", "refresh_status"]
      : ["refresh_status"];

  return Object.freeze({
    schema: CLUBS_PAYMENT_MODULE_CONTRACT.schema,
    version: CLUBS_PAYMENT_MODULE_CONTRACT.version,
    status: "ready",
    state,
    readinessState: backoffice.authority.readinessState,
    totals: Object.freeze(
      [...totals.entries()].map(([currencyCode, amountMinor]) =>
        Object.freeze({ currency: currencyCode, amountMinor }),
      ),
    ),
    activity: Object.freeze(activity),
    allowedNextActions: Object.freeze(allowedNextActions),
    reconciliationInstruction: requiresReconciliation
      ? "operations_reconciliation_required"
      : "payment_receipt_balanced",
    ownAttributableActivityOnly: true,
    foreignAmbassadorAccess: false,
    providerCalled: false,
    providerSuccessClaimed: false,
    livemode: false,
  });
}

type FinancePaymentRow = Readonly<{
  payment_kind: ClubsPaymentModuleKind;
  payment_state: string;
  currency: string;
  count: string | number;
  amount_minor: string | number;
}>;

type StateCountRow = Readonly<{ state: string; count: string | number }>;

function safeCount(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export async function readClubsFinancePaymentOverview(
  tenantId: string,
): Promise<ClubsFinancePaymentOverview> {
  return readOnlyTransaction(tenantId, async (client) => {
    const [payments, transfers, refunds, reconciliations, webhooks] =
      await Promise.all([
        client.query<FinancePaymentRow>(
          `select payment_kind,payment_state,currency,count(*)::bigint count,
                  coalesce(sum(amount_minor),0)::bigint amount_minor
             from crays_core.clubs_stripe_sandbox_payments
            where tenant_id=$1 and livemode=false
            group by payment_kind,payment_state,currency
            order by payment_kind,payment_state,currency`,
          [tenantId],
        ),
        client.query<StateCountRow>(
          `select transfer_state state,count(*)::bigint count
             from crays_core.clubs_stripe_sandbox_transfer_commands
            where tenant_id=$1 group by transfer_state order by transfer_state`,
          [tenantId],
        ),
        client.query<StateCountRow>(
          `select refund_state state,count(*)::bigint count
             from crays_core.clubs_stripe_sandbox_refund_commands
            where tenant_id=$1 group by refund_state order by refund_state`,
          [tenantId],
        ),
        client.query<StateCountRow>(
          `select reconciliation_state state,count(*)::bigint count
             from crays_core.clubs_stripe_sandbox_reconciliation_receipts
            where tenant_id=$1 group by reconciliation_state order by reconciliation_state`,
          [tenantId],
        ),
        client.query<{ count: string | number }>(
          `select count(*)::bigint count
             from crays_core.clubs_stripe_sandbox_webhook_inbox
            where tenant_id=$1 and livemode=false`,
          [tenantId],
        ),
      ]);
    const requiresReconciliation =
      transfers.rows.some((row) => ["PENDING", "LEASED", "RETRYABLE", "FAILED"].includes(row.state)) ||
      refunds.rows.some((row) => ["PENDING", "RETRYABLE", "FAILED"].includes(row.state)) ||
      reconciliations.rows.some((row) => row.state === "MISMATCH") ||
      payments.rows.some((row) => row.payment_state === "SUCCEEDED") &&
        reconciliations.rows.every((row) => row.state !== "BALANCED");
    const allowedNextActions: readonly ClubsPaymentModuleNextAction[] =
      requiresReconciliation
        ? ["wait_for_reconciliation", "refresh_status"]
        : ["refresh_status"];

    return Object.freeze({
      schema: CLUBS_PAYMENT_MODULE_CONTRACT.schema,
      version: CLUBS_PAYMENT_MODULE_CONTRACT.version,
      status: "ready",
      scope: "CLUBS_ONLY",
      paymentSummaries: Object.freeze(
        payments.rows.map((row) =>
          Object.freeze({
            paymentKind: row.payment_kind,
            paymentState: row.payment_state,
            currency: currency(row.currency),
            count: safeCount(row.count),
            amountMinor: positiveMinor(row.amount_minor),
          }),
        ),
      ),
      transferStates: Object.freeze(
        transfers.rows.map((row) => Object.freeze({ state: row.state, count: safeCount(row.count) })),
      ),
      refundStates: Object.freeze(
        refunds.rows.map((row) => Object.freeze({ state: row.state, count: safeCount(row.count) })),
      ),
      reconciliationStates: Object.freeze(
        reconciliations.rows.map((row) => Object.freeze({ state: row.state, count: safeCount(row.count) })),
      ),
      webhookReceipts: safeCount(webhooks.rows[0]?.count ?? 0),
      allowedNextActions: Object.freeze(allowedNextActions),
      reconciliationInstruction: requiresReconciliation
        ? "operations_reconciliation_required"
        : "payment_receipt_balanced",
      livemode: false,
      providerSuccessClaimed: false,
      productionAuthority: false,
    });
  });
}
