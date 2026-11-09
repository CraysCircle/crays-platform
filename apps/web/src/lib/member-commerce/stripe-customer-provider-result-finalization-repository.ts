import "server-only";

import { createHash } from "node:crypto";
import type { StripeCustomerProviderResultFinalizationEnvelope } from "./stripe-customer-provider-result-finalization-envelope";
import type { StripeCustomerCreateWorkerSqlPool } from "./stripe-customer-create-command-worker";

export type PersistedStripeCustomerProviderResult = Readonly<{
  commandId: string;
  providerReceiptId: string;
  stripeCustomerMappingId: string;
  stripeCustomerId: string;
  commandState: "DISPATCHED";
  replayed: boolean;
}>;

const SHA256 = /^[a-f0-9]{64}$/;
function digest(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function text(row: Record<string, unknown>, field: string): string { const value = row[field]; if (typeof value !== "string" || value.length === 0) throw new Error(`CCLUB_STRIPE_CUSTOMER_FINALIZATION_ROW_${field}_INVALID`); return value; }
function integer(row: Record<string, unknown>, field: string): number { const value = row[field]; if (typeof value !== "number" || !Number.isInteger(value) || value < 1) throw new Error(`CCLUB_STRIPE_CUSTOMER_FINALIZATION_ROW_${field}_INVALID`); return value; }
function exact(actual: string | number, expected: string | number, field: string): void { if (actual !== expected) throw new Error(`CCLUB_STRIPE_CUSTOMER_FINALIZATION_${field}_CONFLICT`); }

export class StripeCustomerProviderResultFinalizationRepository {
  constructor(private readonly pool: StripeCustomerCreateWorkerSqlPool) {}

  async persist(envelope: StripeCustomerProviderResultFinalizationEnvelope): Promise<PersistedStripeCustomerProviderResult> {
    if (envelope.action !== "PERSIST_STRIPE_CUSTOMER_PROVIDER_RESULT" || envelope.readyForIdempotentPersistence !== true) throw new Error("CCLUB_STRIPE_CUSTOMER_FINALIZATION_ENVELOPE_NOT_READY");
    if (envelope.containsPii || envelope.containsProviderCredentials || envelope.providerApiCalledByThisEnvelope || envelope.databaseMutatedByThisEnvelope) throw new Error("CCLUB_STRIPE_CUSTOMER_FINALIZATION_ENVELOPE_EFFECT_OR_SENSITIVE_DATA_INVALID");
    if (![envelope.commandSha256, envelope.stripeAccountScopeSha256, envelope.customerSubjectReferenceSha256, envelope.idempotencyKeySha256, envelope.providerReceiptSha256, envelope.requestSha256, envelope.responseSha256].every((value) => SHA256.test(value))) throw new Error("CCLUB_STRIPE_CUSTOMER_FINALIZATION_HASH_INVALID");
    const stripeCustomerMappingId = `stripe-customer-mapping-${digest(`${envelope.tenantId}:${envelope.stripeAccountScopeSha256}:${envelope.customerSubjectReferenceSha256}`)}`;
    const providerCustomerReferenceSha256 = digest(envelope.stripeCustomerId);
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('crays.app_role','core_service',true)");
      await client.query("select set_config('crays.tenant_id',$1,true)", [envelope.tenantId]);
      const commandResult = await client.query(
        `select command_id, command_sha256, stripe_account_scope_sha256,
                customer_subject_reference_sha256, idempotency_key_sha256,
                command_state, attempt_count, lease_owner, lease_id, lease_version, lease_expires_at
         from crays_core.clubs_stripe_customer_create_commands
         where tenant_id = $1 and command_id = $2 for update`,
        [envelope.tenantId, envelope.commandId],
      );
      if (commandResult.rowCount !== 1 || !commandResult.rows[0]) throw new Error("CCLUB_STRIPE_CUSTOMER_FINALIZATION_COMMAND_NOT_FOUND");
      const command = commandResult.rows[0];
      exact(text(command, "command_sha256"), envelope.commandSha256, "COMMAND_SHA256");
      exact(text(command, "stripe_account_scope_sha256"), envelope.stripeAccountScopeSha256, "STRIPE_ACCOUNT_SCOPE_SHA256");
      exact(text(command, "customer_subject_reference_sha256"), envelope.customerSubjectReferenceSha256, "CUSTOMER_SUBJECT_REFERENCE_SHA256");
      exact(text(command, "idempotency_key_sha256"), envelope.idempotencyKeySha256, "IDEMPOTENCY_KEY_SHA256");
      exact(integer(command, "attempt_count"), envelope.attemptNumber, "ATTEMPT_NUMBER");
      const state = text(command, "command_state");
      if (state !== "LEASED" && state !== "DISPATCHED") throw new Error("CCLUB_STRIPE_CUSTOMER_FINALIZATION_COMMAND_STATE_INVALID");
      if (state === "LEASED") {
        exact(text(command, "lease_owner"), envelope.leaseOwner, "LEASE_OWNER");
        exact(text(command, "lease_id"), envelope.leaseId, "LEASE_ID");
        exact(integer(command, "lease_version"), envelope.leaseVersion, "LEASE_VERSION");
        if (Date.parse(text(command, "lease_expires_at")) <= Date.parse(envelope.preparedAt)) throw new Error("CCLUB_STRIPE_CUSTOMER_FINALIZATION_LEASE_EXPIRED");
      }
      await client.query(
        `insert into crays_core.clubs_stripe_customer_create_provider_receipts
          (provider_receipt_id, tenant_id, command_id, provider_adapter_id, provider_outcome,
           provider_receipt_sha256, provider_request_id, lease_id, lease_version, attempt_number,
           result_kind, provider_customer_reference, provider_customer_reference_sha256,
           request_sha256, response_sha256, request_dispatched_at, observed_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ACCEPTED',$11,$12,$13,$14,$15::timestamptz,$16::timestamptz)
         on conflict do nothing`,
        [envelope.providerReceiptId, envelope.tenantId, envelope.commandId, envelope.providerAdapterId,
          envelope.providerOutcome, envelope.providerReceiptSha256, envelope.providerRequestId,
          envelope.leaseId, envelope.leaseVersion, envelope.attemptNumber, envelope.stripeCustomerId,
          providerCustomerReferenceSha256, envelope.requestSha256, envelope.responseSha256,
          envelope.requestDispatchedAt, envelope.completedAt],
      );
      const receiptResult = await client.query(
        `select provider_receipt_id, command_id, provider_adapter_id, provider_outcome,
                provider_receipt_sha256, provider_request_id, lease_id, lease_version, attempt_number,
                result_kind, provider_customer_reference, provider_customer_reference_sha256,
                request_sha256, response_sha256
         from crays_core.clubs_stripe_customer_create_provider_receipts
         where tenant_id = $1 and command_id = $2 and attempt_number = $3`,
        [envelope.tenantId, envelope.commandId, envelope.attemptNumber],
      );
      if (receiptResult.rowCount !== 1 || !receiptResult.rows[0]) throw new Error("CCLUB_STRIPE_CUSTOMER_FINALIZATION_PROVIDER_RECEIPT_NOT_FOUND");
      const receipt = receiptResult.rows[0];
      exact(text(receipt, "provider_receipt_id"), envelope.providerReceiptId, "PROVIDER_RECEIPT_ID");
      exact(text(receipt, "command_id"), envelope.commandId, "PROVIDER_RECEIPT_COMMAND_ID");
      exact(text(receipt, "provider_adapter_id"), envelope.providerAdapterId, "PROVIDER_ADAPTER_ID");
      exact(text(receipt, "provider_outcome"), envelope.providerOutcome, "PROVIDER_OUTCOME");
      exact(text(receipt, "provider_receipt_sha256"), envelope.providerReceiptSha256, "PROVIDER_RECEIPT_SHA256");
      exact(text(receipt, "provider_request_id"), envelope.providerRequestId, "PROVIDER_REQUEST_ID");
      exact(text(receipt, "lease_id"), envelope.leaseId, "PROVIDER_RECEIPT_LEASE_ID");
      exact(integer(receipt, "lease_version"), envelope.leaseVersion, "PROVIDER_RECEIPT_LEASE_VERSION");
      exact(integer(receipt, "attempt_number"), envelope.attemptNumber, "PROVIDER_RECEIPT_ATTEMPT_NUMBER");
      exact(text(receipt, "result_kind"), "ACCEPTED", "RESULT_KIND");
      exact(text(receipt, "provider_customer_reference"), envelope.stripeCustomerId, "PROVIDER_CUSTOMER_REFERENCE");
      exact(text(receipt, "provider_customer_reference_sha256"), providerCustomerReferenceSha256, "PROVIDER_CUSTOMER_REFERENCE_SHA256");
      exact(text(receipt, "request_sha256"), envelope.requestSha256, "REQUEST_SHA256");
      exact(text(receipt, "response_sha256"), envelope.responseSha256, "RESPONSE_SHA256");
      await client.query(
        `insert into crays_core.clubs_stripe_customer_mappings
          (stripe_customer_mapping_id, tenant_id, stripe_account_scope_sha256,
           customer_subject_reference_sha256, provider_customer_reference,
           provider_customer_reference_sha256, source_command_id, source_provider_receipt_id)
         values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict do nothing`,
        [stripeCustomerMappingId, envelope.tenantId, envelope.stripeAccountScopeSha256,
          envelope.customerSubjectReferenceSha256, envelope.stripeCustomerId,
          providerCustomerReferenceSha256, envelope.commandId, envelope.providerReceiptId],
      );
      const mappingResult = await client.query(
        `select stripe_customer_mapping_id, provider_customer_reference,
                provider_customer_reference_sha256, source_command_id, source_provider_receipt_id
         from crays_core.clubs_stripe_customer_mappings
         where tenant_id = $1 and stripe_account_scope_sha256 = $2
           and customer_subject_reference_sha256 = $3`,
        [envelope.tenantId, envelope.stripeAccountScopeSha256, envelope.customerSubjectReferenceSha256],
      );
      if (mappingResult.rowCount !== 1 || !mappingResult.rows[0]) throw new Error("CCLUB_STRIPE_CUSTOMER_FINALIZATION_MAPPING_NOT_FOUND");
      const mapping = mappingResult.rows[0];
      exact(text(mapping, "stripe_customer_mapping_id"), stripeCustomerMappingId, "MAPPING_ID");
      exact(text(mapping, "provider_customer_reference"), envelope.stripeCustomerId, "MAPPING_CUSTOMER_ID");
      exact(text(mapping, "provider_customer_reference_sha256"), providerCustomerReferenceSha256, "MAPPING_CUSTOMER_SHA256");
      exact(text(mapping, "source_command_id"), envelope.commandId, "MAPPING_COMMAND_ID");
      exact(text(mapping, "source_provider_receipt_id"), envelope.providerReceiptId, "MAPPING_PROVIDER_RECEIPT_ID");
      const finalizeResult = await client.query(
        `update crays_core.clubs_stripe_customer_create_commands
         set command_state = 'DISPATCHED', lease_owner = null, lease_id = null,
             lease_expires_at = null, updated_at = transaction_timestamp()
         where tenant_id = $1 and command_id = $2 and command_state = 'LEASED'
           and lease_owner = $3 and lease_id = $4 and lease_version = $5
           and lease_expires_at > $6::timestamptz`,
        [envelope.tenantId, envelope.commandId, envelope.leaseOwner, envelope.leaseId,
          envelope.leaseVersion, envelope.preparedAt],
      );
      if (finalizeResult.rowCount > 1) throw new Error("CCLUB_STRIPE_CUSTOMER_FINALIZATION_COMMAND_CARDINALITY_INVALID");
      const replayed = state === "DISPATCHED";
      if (!replayed && finalizeResult.rowCount !== 1) throw new Error("CCLUB_STRIPE_CUSTOMER_FINALIZATION_COMMAND_LEASE_LOST");
      if (replayed && finalizeResult.rowCount !== 0) throw new Error("CCLUB_STRIPE_CUSTOMER_FINALIZATION_REPLAY_STATE_INVALID");
      await client.query("commit");
      return Object.freeze({ commandId: envelope.commandId, providerReceiptId: envelope.providerReceiptId, stripeCustomerMappingId, stripeCustomerId: envelope.stripeCustomerId, commandState: "DISPATCHED", replayed });
    } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  }
}
