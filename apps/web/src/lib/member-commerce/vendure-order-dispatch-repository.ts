import {
  loadPendingVendureOrderCommand,
  type VendureOrderCommandDb,
} from "./vendure-order-command";
import {
  verifyVendureOrderDispatchReceipt,
  type VendureOrderDispatchReceipt,
} from "./vendure-order-dispatch";

export type VendureDispatchPool = Readonly<{
  connect(): Promise<VendureOrderCommandDb & Readonly<{ release(): void }>>;
}>;

const HASH = /^[a-f0-9]{64}$/;
const nonempty = (value: string) => value.trim().length > 0;

function exactInstant(value: string): boolean {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

async function transaction<T>(
  pool: VendureDispatchPool,
  tenantId: string,
  work: (database: VendureOrderCommandDb) => Promise<T>,
) {
  const database = await pool.connect();
  try {
    await database.query("begin");
    await database.query(
      "select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true)",
      [tenantId],
    );
    const value = await work(database);
    await database.query("commit");
    return value;
  } catch (error) {
    await database.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    database.release();
  }
}

type ClaimRow = Readonly<{
  delivery_state: string;
  attempt_count: string | number;
  dispatch_claim_token: string | null;
  last_error_code: string | null;
}>;

type RetryReceiptRow = Readonly<{
  receipt_sha256: string;
  provider_response_sha256: string;
  outcome: string;
}>;

type ReconciliationReceiptRow = Readonly<{
  resolution_sha256: string;
  observation_payload_sha256: string;
  observation_outcome: string;
  target_delivery_state: string;
}>;

export async function claimVendureOrderDispatch(
  pool: VendureDispatchPool,
  input: Readonly<{
    tenantId: string;
    outboxEventId: string;
    claimToken: string;
    claimedAt: string;
  }>,
) {
  if (
    [input.tenantId, input.outboxEventId, input.claimToken].some((value) => !nonempty(value)) ||
    !exactInstant(input.claimedAt)
  ) throw new Error("VENDURE_ORDER_DISPATCH_CLAIM_INVALID");

  return transaction(pool, input.tenantId, async (database) => {
    const rows = (
      await database.query<ClaimRow>(
        `select delivery_state,attempt_count,dispatch_claim_token,last_error_code
           from crays_core.checkout_order_transition_outbox
          where tenant_id=$1 and outbox_event_id=$2 for update`,
        [input.tenantId, input.outboxEventId],
      )
    ).rows;
    const row = rows[0];
    if (rows.length !== 1 || !row || row.dispatch_claim_token !== null) {
      throw new Error("VENDURE_ORDER_DISPATCH_NOT_CLAIMABLE");
    }

    const observedAttempt = Number(row.attempt_count);
    let retryProofSha256: string | null = null;
    if (row.delivery_state === "PENDING") {
      if (observedAttempt !== 0) throw new Error("VENDURE_ORDER_DISPATCH_NOT_CLAIMABLE");
    } else if (row.delivery_state === "FAILED_RETRYABLE") {
      if (!Number.isSafeInteger(observedAttempt) || observedAttempt < 1) {
        throw new Error("VENDURE_ORDER_DISPATCH_NOT_CLAIMABLE");
      }
      const retryReceipt = (
        await database.query<RetryReceiptRow>(
          `select receipt_sha256,provider_response_sha256,outcome
             from crays_core.checkout_vendure_order_dispatch_receipts
            where tenant_id=$1 and outbox_event_id=$2 and attempt_number=$3
              and outcome='FAILED_RETRYABLE'`,
          [input.tenantId, input.outboxEventId, observedAttempt],
        )
      ).rows;
      const reconciliationReceipt = (
        await database.query<ReconciliationReceiptRow>(
          `select resolution_sha256,observation_payload_sha256,
                  observation_outcome,target_delivery_state
             from crays_core.vendure_order_reconciliation_resolution_receipts
            where tenant_id=$1 and outbox_event_id=$2 and observed_attempt_count=$3
              and observation_outcome='PROVEN_NOT_DELIVERED'
              and target_delivery_state='FAILED_RETRYABLE'`,
          [input.tenantId, input.outboxEventId, observedAttempt],
        )
      ).rows;
      const direct = retryReceipt.length === 1 ? retryReceipt[0] : undefined;
      const reconciled = reconciliationReceipt.length === 1 ? reconciliationReceipt[0] : undefined;
      const directTrusted =
        direct?.outcome === "FAILED_RETRYABLE" &&
        HASH.test(direct.receipt_sha256) &&
        HASH.test(direct.provider_response_sha256) &&
        row.last_error_code === `RETRYABLE_ERROR:${direct.receipt_sha256}`;
      const reconciliationTrusted =
        reconciled?.observation_outcome === "PROVEN_NOT_DELIVERED" &&
        reconciled.target_delivery_state === "FAILED_RETRYABLE" &&
        HASH.test(reconciled.resolution_sha256) &&
        HASH.test(reconciled.observation_payload_sha256) &&
        row.last_error_code === "RECONCILIATION_PROVEN_NOT_DELIVERED";
      if (!directTrusted && !reconciliationTrusted) {
        throw new Error("VENDURE_ORDER_DISPATCH_RETRY_EVIDENCE_REQUIRED");
      }
      retryProofSha256 = directTrusted
        ? direct!.receipt_sha256
        : reconciled!.resolution_sha256;
    } else {
      throw new Error("VENDURE_ORDER_DISPATCH_NOT_CLAIMABLE");
    }

    const command = await loadPendingVendureOrderCommand(database, {
      tenantId: input.tenantId,
      outboxEventId: input.outboxEventId,
    });
    const attemptNumber = observedAttempt + 1;
    const updated = await database.query(
      `update crays_core.checkout_order_transition_outbox
          set delivery_state='CLAIMED',attempt_count=$1,claimed_at=$2,
              dispatch_claim_token=$3,last_error_code=null
        where tenant_id=$4 and outbox_event_id=$5
          and delivery_state=$6 and attempt_count=$7 and dispatch_claim_token is null
        returning outbox_event_id`,
      [attemptNumber, input.claimedAt, input.claimToken, input.tenantId,
        input.outboxEventId, row.delivery_state, observedAttempt],
    );
    if (updated.rows.length !== 1) throw new Error("VENDURE_ORDER_DISPATCH_CLAIM_CONFLICT");
    return Object.freeze({
      command,
      attemptNumber,
      claimToken: input.claimToken,
      leaseVersion: input.claimToken,
      retryProofSha256,
    });
  });
}

export async function persistVendureOrderDispatchReceipt(
  pool: VendureDispatchPool,
  input: Readonly<{
    tenantId: string;
    dispatchReceiptId: string;
    claimToken: string;
    attemptNumber: number;
    expectedCommandSha256: string;
    expectedIdempotencyKey: string;
    receipt: VendureOrderDispatchReceipt;
  }>,
) {
  const receipt = verifyVendureOrderDispatchReceipt(input.receipt);
  if (
    [input.tenantId, input.dispatchReceiptId, input.claimToken, input.expectedIdempotencyKey]
      .some((value) => !nonempty(value)) ||
    !Number.isSafeInteger(input.attemptNumber) ||
    input.attemptNumber < 1 ||
    !HASH.test(input.expectedCommandSha256) ||
    receipt.commandSha256 !== input.expectedCommandSha256 ||
    receipt.idempotencyKey !== input.expectedIdempotencyKey
  ) throw new Error("VENDURE_ORDER_DISPATCH_PERSIST_INPUT_INVALID");

  return transaction(pool, input.tenantId, async (database) => {
    const prior = (
      await database.query<Readonly<{
        dispatch_receipt_id: string;
        receipt_sha256: string;
        outcome: string;
      }>>(
        `select dispatch_receipt_id,receipt_sha256,outcome
           from crays_core.checkout_vendure_order_dispatch_receipts
          where tenant_id=$1 and outbox_event_id=$2 and attempt_number=$3`,
        [input.tenantId, receipt.sourceOutboxEventId, input.attemptNumber],
      )
    ).rows[0];
    if (prior) {
      if (
        prior.dispatch_receipt_id !== input.dispatchReceiptId ||
        prior.receipt_sha256 !== receipt.receiptSha256 ||
        prior.outcome !== receipt.outcome
      ) throw new Error("VENDURE_ORDER_DISPATCH_RECEIPT_REPLAY_CONFLICT");
      return Object.freeze({
        dispatchReceiptId: prior.dispatch_receipt_id,
        outcome: prior.outcome,
        replayed: true as const,
      });
    }

    const outbox = (
      await database.query<Readonly<{
        delivery_state: string;
        attempt_count: string | number;
        dispatch_claim_token: string | null;
        order_snapshot_id: string;
        snapshot_sha256: string;
        payload_sha256: string;
      }>>(
        `select delivery_state,attempt_count,dispatch_claim_token,order_snapshot_id,
                snapshot_sha256,payload_sha256
           from crays_core.checkout_order_transition_outbox
          where tenant_id=$1 and outbox_event_id=$2 for update`,
        [input.tenantId, receipt.sourceOutboxEventId],
      )
    ).rows[0];
    if (
      !outbox ||
      outbox.delivery_state !== "CLAIMED" ||
      Number(outbox.attempt_count) !== input.attemptNumber ||
      outbox.dispatch_claim_token !== input.claimToken ||
      outbox.order_snapshot_id !== receipt.orderSnapshotId ||
      receipt.idempotencyKey !==
        `vendure-order:${receipt.sourceOutboxEventId}:${outbox.snapshot_sha256}` ||
      !HASH.test(outbox.snapshot_sha256) ||
      !HASH.test(outbox.payload_sha256)
    ) throw new Error("VENDURE_ORDER_DISPATCH_RECEIPT_SCOPE_CONFLICT");

    await database.query(
      `insert into crays_core.checkout_vendure_order_dispatch_receipts
        (dispatch_receipt_id,tenant_id,outbox_event_id,order_snapshot_id,attempt_number,
         command_sha256,idempotency_key,outcome,provider_order_id,provider_response_sha256,
         receipt_sha256,observed_at,created_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)`,
      [input.dispatchReceiptId, input.tenantId, receipt.sourceOutboxEventId,
        receipt.orderSnapshotId, input.attemptNumber, receipt.commandSha256,
        receipt.idempotencyKey, receipt.outcome, receipt.providerOrderId,
        receipt.providerResponseSha256, receipt.receiptSha256, receipt.observedAt],
    );
    const errorCode =
      receipt.outcome === "FAILED_RETRYABLE"
        ? `RETRYABLE_ERROR:${receipt.receiptSha256}`
        : receipt.outcome === "UNKNOWN_RECONCILIATION_REQUIRED"
          ? `UNKNOWN_OUTCOME:${receipt.receiptSha256}`
          : null;
    const updated = await database.query(
      `update crays_core.checkout_order_transition_outbox
          set delivery_state=$1,dispatch_claim_token=null,
              delivered_at=case when $1='DELIVERED' then $2::timestamptz else null end,
              last_error_code=$3
        where tenant_id=$4 and outbox_event_id=$5 and delivery_state='CLAIMED'
          and dispatch_claim_token=$6 and attempt_count=$7
          and order_snapshot_id=$8 and snapshot_sha256=$9 and payload_sha256=$10
        returning outbox_event_id`,
      [receipt.outcome, receipt.observedAt, errorCode, input.tenantId,
        receipt.sourceOutboxEventId, input.claimToken, input.attemptNumber,
        receipt.orderSnapshotId, outbox.snapshot_sha256, outbox.payload_sha256],
    );
    if (updated.rows.length !== 1) throw new Error("VENDURE_ORDER_DISPATCH_RECEIPT_CAS_FAILED");
    return Object.freeze({
      dispatchReceiptId: input.dispatchReceiptId,
      outcome: receipt.outcome,
      replayed: false as const,
    });
  });
}
