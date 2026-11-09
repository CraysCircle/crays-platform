import "server-only";

import type { PreparedStripeCustomerCreateCommand } from "./stripe-customer-create-command-envelope";

export type StripeCustomerCreateSqlClient = Readonly<{
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rowCount: number; rows: readonly Row[] }>;
  release(): void;
}>;
export type StripeCustomerCreateSqlPool = Readonly<{
  connect(): Promise<StripeCustomerCreateSqlClient>;
}>;
export type PersistStripeCustomerCreateCommandResult = Readonly<{
  commandId: string;
  idempotencyKeySha256: string;
  replayed: boolean;
  commandState: "PENDING";
  providerCalled: false;
  stripeCustomerCreated: false;
}>;

type ReplayRow = {
  command_id: string;
  command_sha256: string;
  stripe_account_scope_sha256: string;
  customer_subject_reference_sha256: string;
  idempotency_key_sha256: string;
  sequence_gate_receipt_sha256: string;
  authorization_sha256: string;
  authorization_consumption_receipt_sha256: string;
  command_state: string;
};
const HASH = /^[0-9a-f]{64}$/;
function validate(command: PreparedStripeCustomerCreateCommand) {
  if (
    command.contractVersion !== 1 ||
    command.action !== "STRIPE_CUSTOMER_CREATE" ||
    command.mode !== "CREATE_IF_ABSENT" ||
    command.containsPii !== false ||
    command.containsProviderCredentials !== false ||
    command.stripeApiCalled !== false ||
    command.stripeCustomerCreated !== false ||
    command.startsProcess !== false ||
    command.requiresSeparateProviderAdapterExecution !== true
  ) {
    throw new Error("CCLUB_STRIPE_CUSTOMER_COMMAND_NOT_PREPARED");
  }
  const texts = [
    command.commandId, command.tenantId, command.correlationId,
    command.sequenceGateReceiptId, command.vendureRunReceiptId,
    command.leaseRecoveryReceiptId, command.stripeAbsenceReceiptId,
    command.authorizationId, command.authorizationConsumptionReceiptId,
  ];
  if (texts.some((value) => typeof value !== "string" || value.trim() === "")) {
    throw new Error("CCLUB_STRIPE_CUSTOMER_COMMAND_SCOPE_INVALID");
  }
  const hashes = [
    command.commandSha256, command.stripeAccountScopeSha256,
    command.customerSubjectReferenceHash, command.idempotencyKeySha256,
    command.sequenceGateReceiptSha256, command.authorizationSha256,
    command.authorizationConsumptionReceiptSha256, command.approvalReceiptSha256,
    command.humanAal2ReceiptSha256, command.consumptionSha256,
  ];
  if (hashes.some((value) => !HASH.test(value))) {
    throw new Error("CCLUB_STRIPE_CUSTOMER_COMMAND_HASH_INVALID");
  }
  const consumedAt = new Date(command.consumedAt).getTime();
  const notBefore = new Date(command.notBefore).getTime();
  const expiresAt = new Date(command.expiresAt).getTime();
  if (![consumedAt, notBefore, expiresAt].every(Number.isFinite) || consumedAt > notBefore || notBefore >= expiresAt) {
    throw new Error("CCLUB_STRIPE_CUSTOMER_COMMAND_WINDOW_INVALID");
  }
}

export class StripeCustomerCreateCommandRepository {
  constructor(private readonly pool: StripeCustomerCreateSqlPool) {}

  async persistPreparedCommand(
    command: PreparedStripeCustomerCreateCommand,
  ): Promise<PersistStripeCustomerCreateCommandResult> {
    validate(command);
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        "select set_config('crays.app_role','core_service',true), set_config('crays.tenant_id',$1,true)",
        [command.tenantId],
      );
      const inserted = await client.query(
        `insert into crays_core.clubs_stripe_customer_create_commands (
          command_id,tenant_id,command_contract_version,command_action,command_mode,
          command_sha256,stripe_account_scope_sha256,customer_subject_reference_sha256,
          idempotency_key_sha256,correlation_id,sequence_gate_receipt_id,
          sequence_gate_receipt_sha256,vendure_run_receipt_id,lease_recovery_receipt_id,
          stripe_absence_receipt_id,authorization_id,authorization_sha256,
          authorization_consumption_receipt_id,authorization_consumption_receipt_sha256,
          approval_receipt_sha256,human_aal2_receipt_sha256,consumption_sha256,
          consumed_at,not_before,expires_at,command_state,next_attempt_at
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
          $20,$21,$22,$23,$24,$25,'PENDING',$24
        ) on conflict (tenant_id,idempotency_key_sha256) do nothing`,
        [
          command.commandId, command.tenantId, command.contractVersion, command.action,
          command.mode, command.commandSha256, command.stripeAccountScopeSha256,
          command.customerSubjectReferenceHash, command.idempotencyKeySha256,
          command.correlationId, command.sequenceGateReceiptId,
          command.sequenceGateReceiptSha256, command.vendureRunReceiptId,
          command.leaseRecoveryReceiptId, command.stripeAbsenceReceiptId,
          command.authorizationId, command.authorizationSha256,
          command.authorizationConsumptionReceiptId,
          command.authorizationConsumptionReceiptSha256,
          command.approvalReceiptSha256, command.humanAal2ReceiptSha256,
          command.consumptionSha256, command.consumedAt, command.notBefore,
          command.expiresAt,
        ],
      );
      let replayed = false;
      if (inserted.rowCount === 0) {
        replayed = true;
        const replay = await client.query<ReplayRow>(
          `select command_id,command_sha256,stripe_account_scope_sha256,
                  customer_subject_reference_sha256,idempotency_key_sha256,
                  sequence_gate_receipt_sha256,authorization_sha256,
                  authorization_consumption_receipt_sha256,command_state
             from crays_core.clubs_stripe_customer_create_commands
            where tenant_id=$1 and idempotency_key_sha256=$2`,
          [command.tenantId, command.idempotencyKeySha256],
        );
        const row = replay.rows[0];
        if (
          !row || row.command_id !== command.commandId ||
          row.command_sha256 !== command.commandSha256 ||
          row.stripe_account_scope_sha256 !== command.stripeAccountScopeSha256 ||
          row.customer_subject_reference_sha256 !== command.customerSubjectReferenceHash ||
          row.idempotency_key_sha256 !== command.idempotencyKeySha256 ||
          row.sequence_gate_receipt_sha256 !== command.sequenceGateReceiptSha256 ||
          row.authorization_sha256 !== command.authorizationSha256 ||
          row.authorization_consumption_receipt_sha256 !== command.authorizationConsumptionReceiptSha256 ||
          row.command_state !== "PENDING"
        ) {
          throw new Error("CCLUB_STRIPE_CUSTOMER_COMMAND_REPLAY_CONFLICT");
        }
      }
      await client.query("commit");
      return Object.freeze({
        commandId: command.commandId,
        idempotencyKeySha256: command.idempotencyKeySha256,
        replayed,
        commandState: "PENDING" as const,
        providerCalled: false as const,
        stripeCustomerCreated: false as const,
      });
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
