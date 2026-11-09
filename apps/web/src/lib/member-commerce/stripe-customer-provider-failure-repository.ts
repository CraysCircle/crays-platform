import "server-only";

import type { NormalizedStripeCustomerAdapterResult } from "./stripe-customer-provider-result-normalizer";
import type { StripeCustomerCreateWorkerSqlPool } from "./stripe-customer-create-command-worker";

type ProviderFailure = Exclude<NormalizedStripeCustomerAdapterResult, { kind: "ACCEPTED" }>;
export type PersistedStripeCustomerProviderFailure = Readonly<{ commandId: string; providerReceiptId: string; commandState: "RETRY" | "DEAD_LETTER"; errorCode: ProviderFailure["errorCode"]; replayed: boolean }>;
function text(row: Record<string, unknown>, field: string): string { const value = row[field]; if (typeof value !== "string" || value.length === 0) throw new Error(`CCLUB_STRIPE_FAILURE_ROW_${field}_INVALID`); return value; }
function integer(row: Record<string, unknown>, field: string): number { const value = row[field]; if (typeof value !== "number" || !Number.isInteger(value) || value < 1) throw new Error(`CCLUB_STRIPE_FAILURE_ROW_${field}_INVALID`); return value; }
function exact(actual: string | number, expected: string | number, field: string): void { if (actual !== expected) throw new Error(`CCLUB_STRIPE_FAILURE_${field}_CONFLICT`); }

export class StripeCustomerProviderFailureRepository {
  constructor(private readonly pool: StripeCustomerCreateWorkerSqlPool) {}
  async persist(failure: ProviderFailure): Promise<PersistedStripeCustomerProviderFailure> {
    if (failure.kind !== "RETRYABLE_ERROR" && failure.kind !== "TERMINAL_ERROR") throw new Error("CCLUB_STRIPE_FAILURE_KIND_INVALID");
    const targetState = failure.kind === "RETRYABLE_ERROR" ? "RETRY" : "DEAD_LETTER";
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('crays.app_role','core_service',true)");
      await client.query("select set_config('crays.tenant_id',$1,true)", [failure.tenantId]);
      const commandResult = await client.query(
        `select command_id, command_state, attempt_count, lease_owner, lease_id, lease_version, lease_expires_at
         from crays_core.clubs_stripe_customer_create_commands
         where tenant_id = $1 and command_id = $2 for update`,
        [failure.tenantId, failure.commandId],
      );
      if (commandResult.rowCount !== 1 || !commandResult.rows[0]) throw new Error("CCLUB_STRIPE_FAILURE_COMMAND_NOT_FOUND");
      const command = commandResult.rows[0];
      exact(integer(command, "attempt_count"), failure.attemptNumber, "ATTEMPT_NUMBER");
      const state = text(command, "command_state");
      if (state !== "LEASED" && state !== targetState) throw new Error("CCLUB_STRIPE_FAILURE_COMMAND_STATE_INVALID");
      if (state === "LEASED") {
        exact(text(command, "lease_owner"), failure.leaseOwner, "LEASE_OWNER");
        exact(text(command, "lease_id"), failure.leaseId, "LEASE_ID");
        exact(integer(command, "lease_version"), failure.leaseVersion, "LEASE_VERSION");
        if (Date.parse(text(command, "lease_expires_at")) <= Date.parse(failure.completedAt)) throw new Error("CCLUB_STRIPE_FAILURE_LEASE_EXPIRED");
      }
      await client.query(
        `insert into crays_core.clubs_stripe_customer_create_provider_receipts
          (provider_receipt_id, tenant_id, command_id, provider_adapter_id, provider_outcome,
           provider_receipt_sha256, provider_request_id, lease_id, lease_version, attempt_number,
           error_code, result_kind, provider_customer_reference, provider_customer_reference_sha256,
           request_sha256, response_sha256, request_dispatched_at, observed_at)
         values ($1,$2,$3,$4,'NONE',$5,$6,$7,$8,$9,$10,$11,null,null,$12,$13,$14::timestamptz,$15::timestamptz)
         on conflict do nothing`,
        [failure.providerReceiptId, failure.tenantId, failure.commandId, failure.providerAdapterId,
          failure.providerReceiptSha256, failure.providerRequestId, failure.leaseId,
          failure.leaseVersion, failure.attemptNumber, failure.errorCode, failure.kind,
          failure.requestSha256, failure.responseSha256, failure.requestDispatchedAt, failure.completedAt],
      );
      const receiptResult = await client.query(
        `select provider_receipt_id, command_id, lease_id, lease_version, attempt_number,
                error_code, result_kind, provider_customer_reference, provider_customer_reference_sha256,
                request_sha256, response_sha256
         from crays_core.clubs_stripe_customer_create_provider_receipts
         where tenant_id = $1 and command_id = $2 and attempt_number = $3`,
        [failure.tenantId, failure.commandId, failure.attemptNumber],
      );
      if (receiptResult.rowCount !== 1 || !receiptResult.rows[0]) throw new Error("CCLUB_STRIPE_FAILURE_RECEIPT_NOT_FOUND");
      const receipt = receiptResult.rows[0];
      exact(text(receipt, "provider_receipt_id"), failure.providerReceiptId, "RECEIPT_ID");
      exact(text(receipt, "command_id"), failure.commandId, "RECEIPT_COMMAND_ID");
      exact(text(receipt, "lease_id"), failure.leaseId, "RECEIPT_LEASE_ID");
      exact(integer(receipt, "lease_version"), failure.leaseVersion, "RECEIPT_LEASE_VERSION");
      exact(integer(receipt, "attempt_number"), failure.attemptNumber, "RECEIPT_ATTEMPT_NUMBER");
      exact(text(receipt, "error_code"), failure.errorCode, "ERROR_CODE");
      exact(text(receipt, "result_kind"), failure.kind, "RESULT_KIND");
      if (receipt.provider_customer_reference !== null || receipt.provider_customer_reference_sha256 !== null) throw new Error("CCLUB_STRIPE_FAILURE_CUSTOMER_REFERENCE_FORBIDDEN");
      exact(text(receipt, "request_sha256"), failure.requestSha256, "REQUEST_SHA256");
      exact(text(receipt, "response_sha256"), failure.responseSha256, "RESPONSE_SHA256");
      const update = failure.kind === "RETRYABLE_ERROR"
        ? `update crays_core.clubs_stripe_customer_create_commands
           set command_state = 'RETRY', last_error_code = $6, next_attempt_at = $7::timestamptz,
               lease_owner = null, lease_id = null, lease_expires_at = null, updated_at = transaction_timestamp()
           where tenant_id = $1 and command_id = $2 and command_state = 'LEASED'
             and lease_owner = $3 and lease_id = $4 and lease_version = $5`
        : `update crays_core.clubs_stripe_customer_create_commands
           set command_state = 'DEAD_LETTER', last_error_code = $6,
               lease_owner = null, lease_id = null, lease_expires_at = null, updated_at = transaction_timestamp()
           where tenant_id = $1 and command_id = $2 and command_state = 'LEASED'
             and lease_owner = $3 and lease_id = $4 and lease_version = $5`;
      const values = failure.kind === "RETRYABLE_ERROR"
        ? [failure.tenantId, failure.commandId, failure.leaseOwner, failure.leaseId, failure.leaseVersion, failure.errorCode, failure.retryAt]
        : [failure.tenantId, failure.commandId, failure.leaseOwner, failure.leaseId, failure.leaseVersion, failure.errorCode];
      const stateResult = await client.query(update, values);
      if (stateResult.rowCount > 1) throw new Error("CCLUB_STRIPE_FAILURE_STATE_CARDINALITY_INVALID");
      const replayed = state === targetState;
      if (!replayed && stateResult.rowCount !== 1) throw new Error("CCLUB_STRIPE_FAILURE_LEASE_LOST");
      if (replayed && stateResult.rowCount !== 0) throw new Error("CCLUB_STRIPE_FAILURE_REPLAY_INVALID");
      await client.query("commit");
      return Object.freeze({ commandId: failure.commandId, providerReceiptId: failure.providerReceiptId, commandState: targetState, errorCode: failure.errorCode, replayed });
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  }
}
