import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { getCorePgPool } from "@/db/client";
import {
  createResolution,
  deterministicStatusTransport,
  freezeCommand,
  type FrozenCommand,
  type Observation,
  type Resolution,
} from "./vendure-customer-registration-reconciliation";
import type {
  PersistedVendureReconciliationSchedulerLease,
  PersistedVendureReconciliationSchedulerRepository,
} from "./vendure-customer-registration-reconciliation-scheduler";
import type {
  CommitVendureRegistrationResolutionInput,
  PersistedVendureRegistrationLease,
  PersistedVendureRegistrationWorkRepository,
  ScheduleVendureRegistrationRetryInput,
} from "./vendure-customer-registration-reconciliation-worker";

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$/;
const HASH = /^[a-f0-9]{64}$/;

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function stableId(prefix: string, value: unknown): string {
  return prefix + "_" + digest(value).slice(0, 48);
}

function exactId(value: string, code: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!ID.test(normalized)) throw new Error(code);
  return normalized;
}

function exactHash(value: string, code: string): string {
  if (!HASH.test(value)) throw new Error(code);
  return value;
}

function exactInstant(value: string, code: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(code);
  return new Date(parsed).toISOString();
}

function exactDuration(value: number, code: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(code);
  return value;
}

async function transaction<T>(
  tenantId: string,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  exactId(tenantId, "VCRC_PHASE9_TENANT_INVALID");
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin isolation level serializable");
    await client.query(
      "select set_config('crays.app_role','core_service',true)",
    );
    await client.query("select set_config('crays.tenant_id',$1,true)", [
      tenantId,
    ]);
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

type RuntimeRow = Readonly<{
  tenant_id: string;
  reconciliation_command_id: string;
  runtime_state: "PENDING" | "LEASED" | "RETRY_SCHEDULED" | "RESOLVED";
  status_attempt: number | string;
  next_attempt_at: Date;
  worker_id_sha256: string | null;
  lease_id_sha256: string | null;
  lease_version: number | string;
  lease_expires_at: Date | null;
  resolved_worker_receipt_sha256: string | null;
  registration_claim_id: string;
  registration_idempotency_key: string;
  authority_cell_sha256: string;
  provider_binding_id: string;
  provider_binding_version: number | string;
  vendure_deployment_cell_id: string;
  observed_attempt: number | string;
  canonical_account_id: string;
  canonical_person_id: string;
  vertical_root: "clubs";
  operator_legal_entity_id: string;
  registration_command_sha256: string;
  reconciliation_idempotency_key: string;
  command_sha256: string;
  created_at: Date;
  command_execution_state: "PENDING" | "CLAIMED" | "OBSERVED" | "RESOLVED";
}>;

type ScheduleRow = Readonly<{
  tenant_id: string;
  scheduler_id: string;
  scheduler_state: "IDLE" | "LEASED";
  due_at: Date;
  worker_id_sha256: string | null;
  lease_id_sha256: string | null;
  lease_version: number | string;
  lease_expires_at: Date | null;
  last_scheduler_receipt_sha256: string | null;
}>;

async function appendRuntimeReceipt(
  client: PoolClient,
  input: {
    tenantId: string;
    reconciliationCommandId: string;
    receiptKind: "CLAIMED" | "RETRY_SCHEDULED" | "RESOLVED";
    priorState: string;
    resultingState: string;
    statusAttempt: number;
    leaseVersion: number;
    workerIdSha256: string;
    leaseIdSha256: string;
    workerReceiptSha256: string | null;
    reasonCode: string | null;
    nextAttemptAt: string | null;
    observedAt: string;
  },
): Promise<void> {
  const body = { runtimeVersion: "vcrc-phase9-runtime.v1", ...input };
  const receiptSha256 = digest(body);
  await client.query(
    `insert into crays_core.vendure_customer_registration_runtime_receipts (
       runtime_receipt_id,tenant_id,reconciliation_command_id,receipt_kind,
       prior_state,resulting_state,status_attempt,lease_version,
       worker_id_sha256,lease_id_sha256,worker_receipt_sha256,reason_code,
       next_attempt_at,receipt_sha256,observed_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      stableId("vcrpr", body),
      input.tenantId,
      input.reconciliationCommandId,
      input.receiptKind,
      input.priorState,
      input.resultingState,
      input.statusAttempt,
      input.leaseVersion,
      input.workerIdSha256,
      input.leaseIdSha256,
      input.workerReceiptSha256,
      input.reasonCode,
      input.nextAttemptAt,
      receiptSha256,
      input.observedAt,
    ],
  );
}

async function appendExecutionReceipt(
  client: PoolClient,
  input: {
    tenantId: string;
    commandId: string;
    statusAttempt: number;
    priorState: "PENDING" | "CLAIMED" | "OBSERVED";
    resultingState: "CLAIMED" | "OBSERVED" | "RESOLVED";
    ownerTokenSha256: string;
    leaseExpiresAt: string | null;
    observedAt: string;
  },
): Promise<void> {
  const receiptId = stableId("vcrxe", input);
  await client.query(
    `insert into crays_core.vendure_customer_registration_reconciliation_execution_receipts (
       execution_receipt_id,tenant_id,reconciliation_command_id,status_attempt,
       prior_state,resulting_state,owner_token_sha256,lease_expires_at,
       receipt_sha256,observed_at
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,
       crays_core.vcrc37_execution($1,$3,$4,$5,$6,$7,$8,$9),$9
     )`,
    [
      receiptId,
      input.tenantId,
      input.commandId,
      input.statusAttempt,
      input.priorState,
      input.resultingState,
      input.ownerTokenSha256,
      input.leaseExpiresAt,
      input.observedAt,
    ],
  );
}

function frozenCommand(row: RuntimeRow): FrozenCommand {
  return freezeCommand({
    reconciliationCommandId: row.reconciliation_command_id,
    registrationClaimId: row.registration_claim_id,
    canonicalAccountId: row.canonical_account_id,
    canonicalPersonId: row.canonical_person_id,
    verticalRoot: row.vertical_root,
    tenantId: row.tenant_id,
    operatorLegalEntityId: row.operator_legal_entity_id,
    providerBindingId: row.provider_binding_id,
    providerBindingVersion: Number(row.provider_binding_version),
    deploymentCellId: row.vendure_deployment_cell_id,
    observedAttempt: Number(row.observed_attempt),
    registrationCommandSha256: row.registration_command_sha256,
    registrationIdempotencyKey: row.registration_idempotency_key,
    reconciliationIdempotencyKey: row.reconciliation_idempotency_key,
    createdAt: row.created_at.toISOString(),
  });
}

async function insertObservation(
  client: PoolClient,
  tenantId: string,
  observation: Observation,
): Promise<void> {
  const proof = observation.statusProof;
  await client.query(
    `insert into crays_core.vendure_customer_registration_reconciliation_observations (
       observation_id,tenant_id,reconciliation_command_id,registration_claim_id,
       status_attempt,owner_token_sha256,command_sha256,observation_outcome,
       observed_provider_state,status_provider,status_provider_version,
       status_request_receipt_id,status_response_sha256,queried_idempotency_key,
       status_authority_cell_sha256,vendure_customer_id,vendure_user_id,
       provider_version,provider_action_receipt_id,provider_receipt_sha256,
       observation_sha256,observed_at,created_at
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
       $18,$19,$20,$21,$22,$22
     )`,
    [
      observation.observationId,
      tenantId,
      observation.reconciliationCommandId,
      observation.registrationClaimId,
      observation.statusAttempt,
      observation.ownerTokenSha256,
      observation.commandSha256,
      observation.outcome,
      observation.observedProviderState,
      proof.statusProvider,
      proof.statusProviderVersion,
      proof.statusRequestReceiptId,
      proof.statusResponseSha256,
      proof.queriedIdempotencyKey,
      proof.statusAuthorityCellSha256,
      observation.vendureCustomerId,
      observation.vendureUserId,
      observation.providerVersion,
      observation.providerActionReceiptId,
      observation.providerReceiptSha256,
      observation.observationSha256,
      observation.observedAt,
    ],
  );
}

async function insertResolution(
  client: PoolClient,
  resolution: Resolution,
): Promise<void> {
  const proof = resolution.statusProof;
  await client.query(
    `insert into crays_core.vendure_customer_registration_reconciliation_resolutions (
       resolution_receipt_id,tenant_id,reconciliation_command_id,observation_id,
       registration_claim_id,status_attempt,command_sha256,observation_sha256,
       observation_outcome,prior_claim_state,target_claim_state,status_provider,
       status_provider_version,status_request_receipt_id,status_response_sha256,
       queried_idempotency_key,status_authority_cell_sha256,observed_provider_state,
       vendure_customer_id,vendure_user_id,provider_version,provider_action_receipt_id,
       provider_receipt_sha256,resolution_sha256,resolved_at,created_at
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
       $18,$19,$20,$21,$22,$23,$24,$25,$25
     )`,
    [
      resolution.resolutionReceiptId,
      resolution.tenantId,
      resolution.reconciliationCommandId,
      resolution.observationId,
      resolution.registrationClaimId,
      resolution.statusAttempt,
      resolution.commandSha256,
      resolution.observationSha256,
      resolution.observationOutcome,
      resolution.priorClaimState,
      resolution.targetClaimState,
      proof.statusProvider,
      proof.statusProviderVersion,
      proof.statusRequestReceiptId,
      proof.statusResponseSha256,
      proof.queriedIdempotencyKey,
      proof.statusAuthorityCellSha256,
      resolution.observedProviderState,
      resolution.vendureCustomerId,
      resolution.vendureUserId,
      resolution.providerVersion,
      resolution.providerActionReceiptId,
      resolution.providerReceiptSha256,
      resolution.resolutionSha256,
      resolution.resolvedAt,
    ],
  );
}

export function createPersistedVendureRegistrationRuntimeRepository(config: {
  tenantId: string;
  scheduleIntervalMs: number;
  schedulerFailureRetryMs: number;
}): Readonly<{
  workRepository: PersistedVendureRegistrationWorkRepository;
  schedulerRepository: PersistedVendureReconciliationSchedulerRepository;
}> {
  const tenantId = exactId(config.tenantId, "VCRC_PHASE9_TENANT_INVALID");
  const scheduleIntervalMs = exactDuration(
    config.scheduleIntervalMs,
    "VCRC_PHASE9_SCHEDULE_INTERVAL_INVALID",
  );
  const schedulerFailureRetryMs = exactDuration(
    config.schedulerFailureRetryMs,
    "VCRC_PHASE9_SCHEDULE_RETRY_INVALID",
  );

  const workRepository: PersistedVendureRegistrationWorkRepository = {
    async claimNext(input): Promise<PersistedVendureRegistrationLease | null> {
      const workerId = exactId(input.workerId, "VCRC_PHASE9_WORKER_INVALID");
      const claimedAt = exactInstant(
        input.claimedAt,
        "VCRC_PHASE9_CLAIM_TIME_INVALID",
      );
      const leaseDurationMs = exactDuration(
        input.leaseDurationMs,
        "VCRC_PHASE9_LEASE_DURATION_INVALID",
      );
      return transaction(tenantId, async (client) => {
        await client.query(
          `insert into crays_core.vendure_customer_registration_reconciliation_runtime (
             tenant_id,reconciliation_command_id,runtime_state,status_attempt,
             next_attempt_at,lease_version,created_at,updated_at
           )
           select c.tenant_id,c.reconciliation_command_id,'PENDING',0,$2,0,$2,$2
             from crays_core.vendure_customer_registration_reconciliation_commands c
            where c.tenant_id=$1 and c.execution_state='PENDING'
              and not exists (
                select 1
                  from crays_core.vendure_customer_registration_reconciliation_runtime r
                 where r.tenant_id=c.tenant_id
                   and r.reconciliation_command_id=c.reconciliation_command_id
              )
            order by c.created_at,c.reconciliation_command_id
            limit 1
           on conflict (tenant_id,reconciliation_command_id) do nothing`,
          [tenantId, claimedAt],
        );

        const selected = await client.query<RuntimeRow>(
          `select r.*,c.registration_claim_id,c.registration_idempotency_key,
                  c.authority_cell_sha256,c.provider_binding_id,
                  c.provider_binding_version,c.vendure_deployment_cell_id,
                  c.observed_attempt,c.canonical_account_id,c.canonical_person_id,
                  c.vertical_root,c.operator_legal_entity_id,
                  c.registration_command_sha256,c.reconciliation_idempotency_key,
                  c.command_sha256,c.created_at,
                  c.execution_state command_execution_state
             from crays_core.vendure_customer_registration_reconciliation_runtime r
             join crays_core.vendure_customer_registration_reconciliation_commands c
               on c.tenant_id=r.tenant_id
              and c.reconciliation_command_id=r.reconciliation_command_id
            where r.tenant_id=$1
              and c.execution_state='PENDING'
              and (
                (r.runtime_state in ('PENDING','RETRY_SCHEDULED') and
                 r.next_attempt_at<=$2)
                or
                (r.runtime_state='LEASED' and r.lease_expires_at<=$2)
              )
            order by r.next_attempt_at,r.updated_at,r.reconciliation_command_id
            for update of r,c skip locked
            limit 1`,
          [tenantId, claimedAt],
        );
        const row = selected.rows[0];
        if (!row) return null;

        const leaseId = "vcrl_" + randomUUID().replaceAll("-", "");
        const workerIdSha256 = digest(workerId);
        const leaseIdSha256 = digest(leaseId);
        const priorState = row.runtime_state;
        const statusAttempt = Number(row.status_attempt) + 1;
        const leaseVersion = Number(row.lease_version) + 1;
        const leaseExpiresAt = new Date(
          Date.parse(claimedAt) + leaseDurationMs,
        ).toISOString();
        await client.query(
          `update crays_core.vendure_customer_registration_reconciliation_runtime
              set runtime_state='LEASED',status_attempt=$3,
                  worker_id_sha256=$4,lease_id_sha256=$5,lease_version=$6,
                  lease_expires_at=$7,last_reason_code=null,updated_at=$2
            where tenant_id=$1 and reconciliation_command_id=$8`,
          [
            tenantId,
            claimedAt,
            statusAttempt,
            workerIdSha256,
            leaseIdSha256,
            leaseVersion,
            leaseExpiresAt,
            row.reconciliation_command_id,
          ],
        );
        await appendRuntimeReceipt(client, {
          tenantId,
          reconciliationCommandId: row.reconciliation_command_id,
          receiptKind: "CLAIMED",
          priorState,
          resultingState: "LEASED",
          statusAttempt,
          leaseVersion,
          workerIdSha256,
          leaseIdSha256,
          workerReceiptSha256: null,
          reasonCode: null,
          nextAttemptAt: null,
          observedAt: claimedAt,
        });
        return Object.freeze({
          reconciliationId: row.reconciliation_command_id,
          tenantId,
          leaseId,
          leaseVersion,
          leaseRecovered: priorState === "LEASED",
          claimId: row.registration_claim_id,
          idempotencyKey: row.registration_idempotency_key,
          authorityPayloadHash: row.authority_cell_sha256,
          commandBindingId: row.provider_binding_id,
          commandBindingVersion: String(row.provider_binding_version),
          deploymentCell: row.vendure_deployment_cell_id,
          providerExecutionAttempt: Number(row.observed_attempt),
          statusAttempt,
        });
      });
    },

    async scheduleRetry(
      input: ScheduleVendureRegistrationRetryInput,
    ): Promise<"SCHEDULED" | "LEASE_LOST"> {
      const observedAt = exactInstant(
        input.observedAt,
        "VCRC_PHASE9_RETRY_TIME_INVALID",
      );
      const nextAttemptAt = exactInstant(
        input.nextAttemptAt,
        "VCRC_PHASE9_RETRY_TIME_INVALID",
      );
      exactHash(input.workerReceiptHash, "VCRC_PHASE9_RETRY_RECEIPT_INVALID");
      if (input.statusReceiptHash !== null) {
        exactHash(input.statusReceiptHash, "VCRC_PHASE9_STATUS_RECEIPT_INVALID");
      }
      return transaction(tenantId, async (client) => {
        const result = await client.query<RuntimeRow>(
          `select r.*,c.registration_claim_id,c.registration_idempotency_key,
                  c.authority_cell_sha256,c.provider_binding_id,
                  c.provider_binding_version,c.vendure_deployment_cell_id,
                  c.observed_attempt,c.canonical_account_id,c.canonical_person_id,
                  c.vertical_root,c.operator_legal_entity_id,
                  c.registration_command_sha256,c.reconciliation_idempotency_key,
                  c.command_sha256,c.created_at,
                  c.execution_state command_execution_state
             from crays_core.vendure_customer_registration_reconciliation_runtime r
             join crays_core.vendure_customer_registration_reconciliation_commands c
               on c.tenant_id=r.tenant_id
              and c.reconciliation_command_id=r.reconciliation_command_id
            where r.tenant_id=$1 and r.reconciliation_command_id=$2
            for update of r`,
          [tenantId, input.reconciliationId],
        );
        const row = result.rows[0];
        if (
          !row ||
          row.runtime_state !== "LEASED" ||
          row.worker_id_sha256 !== digest(input.workerId) ||
          row.lease_id_sha256 !== digest(input.leaseId) ||
          Number(row.lease_version) !== input.leaseVersion
        ) {
          return "LEASE_LOST";
        }
        await appendRuntimeReceipt(client, {
          tenantId,
          reconciliationCommandId: input.reconciliationId,
          receiptKind: "RETRY_SCHEDULED",
          priorState: "LEASED",
          resultingState: "RETRY_SCHEDULED",
          statusAttempt: Number(row.status_attempt),
          leaseVersion: Number(row.lease_version),
          workerIdSha256: row.worker_id_sha256,
          leaseIdSha256: row.lease_id_sha256,
          workerReceiptSha256: input.workerReceiptHash,
          reasonCode: input.reasonCode,
          nextAttemptAt,
          observedAt,
        });
        await client.query(
          `update crays_core.vendure_customer_registration_reconciliation_runtime
              set runtime_state='RETRY_SCHEDULED',next_attempt_at=$3,
                  worker_id_sha256=null,lease_id_sha256=null,
                  lease_expires_at=null,last_reason_code=$4,updated_at=$5
            where tenant_id=$1 and reconciliation_command_id=$2`,
          [tenantId, input.reconciliationId, nextAttemptAt, input.reasonCode, observedAt],
        );
        return "SCHEDULED";
      });
    },

    async commitResolution(
      input: CommitVendureRegistrationResolutionInput,
    ): Promise<"COMMITTED" | "LEASE_LOST"> {
      const observedAt = exactInstant(
        input.observedAt,
        "VCRC_PHASE9_RESOLUTION_TIME_INVALID",
      );
      exactHash(
        input.workerReceiptHash,
        "VCRC_PHASE9_WORKER_RECEIPT_INVALID",
      );
      return transaction(tenantId, async (client) => {
        const result = await client.query<RuntimeRow>(
          `select r.*,c.registration_claim_id,c.registration_idempotency_key,
                  c.authority_cell_sha256,c.provider_binding_id,
                  c.provider_binding_version,c.vendure_deployment_cell_id,
                  c.observed_attempt,c.canonical_account_id,c.canonical_person_id,
                  c.vertical_root,c.operator_legal_entity_id,
                  c.registration_command_sha256,c.reconciliation_idempotency_key,
                  c.command_sha256,c.created_at,
                  c.execution_state command_execution_state
             from crays_core.vendure_customer_registration_reconciliation_runtime r
             join crays_core.vendure_customer_registration_reconciliation_commands c
               on c.tenant_id=r.tenant_id
              and c.reconciliation_command_id=r.reconciliation_command_id
            where r.tenant_id=$1 and r.reconciliation_command_id=$2
            for update of r,c`,
          [tenantId, input.reconciliationId],
        );
        const row = result.rows[0];
        if (
          !row ||
          row.runtime_state !== "LEASED" ||
          row.command_execution_state !== "PENDING" ||
          row.worker_id_sha256 !== digest(input.workerId) ||
          row.lease_id_sha256 !== digest(input.leaseId) ||
          Number(row.lease_version) !== input.leaseVersion
        ) {
          return "LEASE_LOST";
        }

        const command = frozenCommand(row);
        const ownerTokenSha256 = digest({
          scope: "vcrc-phase9-owner.v1",
          workerId: input.workerId,
          leaseId: input.leaseId,
          leaseVersion: input.leaseVersion,
        });
        const commandLeaseExpiresAt = new Date(
          Date.parse(observedAt) + 300_000,
        ).toISOString();
        await client.query(
          `update crays_core.vendure_customer_registration_reconciliation_commands
              set execution_state='CLAIMED',status_attempt=1,
                  owner_token_sha256=$1,lease_expires_at=$2
            where tenant_id=$3 and reconciliation_command_id=$4`,
          [ownerTokenSha256, commandLeaseExpiresAt, tenantId, command.reconciliationCommandId],
        );
        await appendExecutionReceipt(client, {
          tenantId,
          commandId: command.reconciliationCommandId,
          statusAttempt: 1,
          priorState: "PENDING",
          resultingState: "CLAIMED",
          ownerTokenSha256,
          leaseExpiresAt: commandLeaseExpiresAt,
          observedAt,
        });

        const outcome =
          input.outcome.outcome === "APPLIED_CONFIRMED"
            ? "PROVEN_APPLIED"
            : "PROVEN_NOT_APPLIED";
        const transport = deterministicStatusTransport({
          outcome,
          statusProvider: "VENDURE_GRAPHQL_STATUS",
          statusProviderVersion: input.outcome.providerVersion,
          statusRequestReceiptId: input.outcome.statusRequestId,
          statusResponseSha256: input.outcome.statusReceiptHash,
          observedAt,
          ...(input.outcome.outcome === "APPLIED_CONFIRMED"
            ? {
                vendureCustomerId: input.outcome.customerId,
                vendureUserId: input.outcome.userId,
                providerVersion: input.outcome.providerVersion,
                providerActionReceiptId: input.outcome.providerActionId,
                providerReceiptSha256: input.outcome.providerReceiptHash,
              }
            : {}),
        });
        const observation = await transport(command, {
          ownerTokenSha256,
          statusAttempt: 1,
        });
        await insertObservation(client, tenantId, observation);
        await client.query(
          `update crays_core.vendure_customer_registration_reconciliation_commands
              set execution_state='OBSERVED',lease_expires_at=null,
                  observation_id=$1,observed_at=$2
            where tenant_id=$3 and reconciliation_command_id=$4`,
          [observation.observationId, observedAt, tenantId, command.reconciliationCommandId],
        );
        await appendExecutionReceipt(client, {
          tenantId,
          commandId: command.reconciliationCommandId,
          statusAttempt: 1,
          priorState: "CLAIMED",
          resultingState: "OBSERVED",
          ownerTokenSha256,
          leaseExpiresAt: null,
          observedAt,
        });

        const resolution = createResolution(command, observation);
        await insertResolution(client, resolution);
        await client.query(
          `update crays_core.vendure_customer_registration_claims
              set claim_state=$1,vendure_customer_id=$2,vendure_user_id=$3,
                  provider_version=$4,provider_action_receipt_id=$5,
                  provider_receipt_sha256=$6,reconciliation_receipt_sha256=$7,
                  resolved_at=$8,updated_at=$8
            where registration_claim_id=$9 and claim_state='UNKNOWN'`,
          [
            resolution.targetClaimState,
            resolution.vendureCustomerId,
            resolution.vendureUserId,
            resolution.providerVersion,
            resolution.providerActionReceiptId,
            resolution.providerReceiptSha256,
            resolution.resolutionSha256,
            observedAt,
            resolution.registrationClaimId,
          ],
        );
        const claimReceiptBody = {
          claimId: resolution.registrationClaimId,
          attempt: command.observedAttempt,
          prior: "UNKNOWN",
          result: resolution.targetClaimState,
          commandSha256: command.registrationCommandSha256,
          observedAt,
        };
        const claimReceiptSha256 = digest(claimReceiptBody);
        await client.query(
          `insert into crays_core.vendure_customer_registration_claim_receipts (
             registration_claim_receipt_id,registration_claim_id,attempt,
             prior_state,resulting_state,registration_command_sha256,
             receipt_sha256,observed_at
           ) values ($1,$2,$3,'UNKNOWN',$4,$5,$6,$7)`,
          [
            "vcrcr_" + claimReceiptSha256.slice(0, 40),
            resolution.registrationClaimId,
            command.observedAttempt,
            resolution.targetClaimState,
            command.registrationCommandSha256,
            claimReceiptSha256,
            observedAt,
          ],
        );
        await client.query(
          `update crays_core.vendure_customer_registration_reconciliation_commands
              set execution_state='RESOLVED',resolved_at=$1
            where tenant_id=$2 and reconciliation_command_id=$3`,
          [observedAt, tenantId, command.reconciliationCommandId],
        );
        await appendExecutionReceipt(client, {
          tenantId,
          commandId: command.reconciliationCommandId,
          statusAttempt: 1,
          priorState: "OBSERVED",
          resultingState: "RESOLVED",
          ownerTokenSha256,
          leaseExpiresAt: null,
          observedAt,
        });
        await appendRuntimeReceipt(client, {
          tenantId,
          reconciliationCommandId: input.reconciliationId,
          receiptKind: "RESOLVED",
          priorState: "LEASED",
          resultingState: "RESOLVED",
          statusAttempt: Number(row.status_attempt),
          leaseVersion: Number(row.lease_version),
          workerIdSha256: row.worker_id_sha256,
          leaseIdSha256: row.lease_id_sha256,
          workerReceiptSha256: input.workerReceiptHash,
          reasonCode: null,
          nextAttemptAt: null,
          observedAt,
        });
        await client.query(
          `update crays_core.vendure_customer_registration_reconciliation_runtime
              set runtime_state='RESOLVED',worker_id_sha256=null,
                  lease_id_sha256=null,lease_expires_at=null,
                  resolved_worker_receipt_sha256=$3,updated_at=$4
            where tenant_id=$1 and reconciliation_command_id=$2`,
          [tenantId, input.reconciliationId, input.workerReceiptHash, observedAt],
        );
        return "COMMITTED";
      });
    },
  };

  const schedulerRepository: PersistedVendureReconciliationSchedulerRepository = {
    async claimSchedule(input): Promise<PersistedVendureReconciliationSchedulerLease | null> {
      const schedulerId = exactId(input.schedulerId, "VCRC_PHASE9_SCHEDULER_INVALID");
      const workerId = exactId(input.workerId, "VCRC_PHASE9_WORKER_INVALID");
      const claimedAt = exactInstant(input.claimedAt, "VCRC_PHASE9_CLAIM_TIME_INVALID");
      const leaseDurationMs = exactDuration(input.leaseDurationMs, "VCRC_PHASE9_LEASE_DURATION_INVALID");
      return transaction(tenantId, async (client) => {
        await client.query(
          `insert into crays_core.vendure_customer_registration_reconciliation_schedules (
             tenant_id,scheduler_id,scheduler_state,due_at,lease_version,
             created_at,updated_at
           ) values ($1,$2,'IDLE',$3,0,$3,$3)
           on conflict (tenant_id,scheduler_id) do nothing`,
          [tenantId, schedulerId, claimedAt],
        );
        const selected = await client.query<ScheduleRow>(
          `select *
             from crays_core.vendure_customer_registration_reconciliation_schedules
            where tenant_id=$1 and scheduler_id=$2
            for update`,
          [tenantId, schedulerId],
        );
        const row = selected.rows[0];
        if (!row) throw new Error("VCRC_PHASE9_SCHEDULE_NOT_FOUND");
        const due = row.scheduler_state === "IDLE"
          ? row.due_at.getTime() <= Date.parse(claimedAt)
          : (row.lease_expires_at?.getTime() ?? Number.POSITIVE_INFINITY) <= Date.parse(claimedAt);
        if (!due) return null;
        const leaseId = "vcrsl_" + randomUUID().replaceAll("-", "");
        const leaseVersion = Number(row.lease_version) + 1;
        const workerIdSha256 = digest(workerId);
        const leaseIdSha256 = digest(leaseId);
        const leaseExpiresAt = new Date(Date.parse(claimedAt) + leaseDurationMs).toISOString();
        await client.query(
          `update crays_core.vendure_customer_registration_reconciliation_schedules
              set scheduler_state='LEASED',worker_id_sha256=$3,
                  lease_id_sha256=$4,lease_version=$5,lease_expires_at=$6,
                  updated_at=$7
            where tenant_id=$1 and scheduler_id=$2`,
          [tenantId, schedulerId, workerIdSha256, leaseIdSha256, leaseVersion, leaseExpiresAt, claimedAt],
        );
        return Object.freeze({
          schedulerId,
          schedulerLeaseId: leaseId,
          schedulerLeaseVersion: leaseVersion,
          recoveredExpiredLease: row.scheduler_state === "LEASED",
        });
      });
    },

    async completeSchedule(input): Promise<"COMMITTED" | "LEASE_LOST"> {
      exactHash(input.workerTickReceiptHash, "VCRC_PHASE9_TICK_RECEIPT_INVALID");
      exactHash(input.schedulerReceiptHash, "VCRC_PHASE9_SCHEDULER_RECEIPT_INVALID");
      const completedAt = exactInstant(input.completedAt, "VCRC_PHASE9_COMPLETE_TIME_INVALID");
      return transaction(tenantId, async (client) => {
        const selected = await client.query<ScheduleRow>(
          `select * from crays_core.vendure_customer_registration_reconciliation_schedules
            where tenant_id=$1 and scheduler_id=$2 for update`,
          [tenantId, input.schedulerId],
        );
        const row = selected.rows[0];
        if (!row || row.scheduler_state !== "LEASED" ||
            row.worker_id_sha256 !== digest(input.workerId) ||
            row.lease_id_sha256 !== digest(input.schedulerLeaseId) ||
            Number(row.lease_version) !== input.schedulerLeaseVersion) {
          return "LEASE_LOST";
        }
        const receiptId = stableId("vcrsr", { tenantId, ...input });
        await client.query(
          `insert into crays_core.vendure_customer_registration_scheduler_receipts (
             scheduler_receipt_id,tenant_id,scheduler_id,receipt_kind,
             lease_version,worker_id_sha256,lease_id_sha256,
             worker_tick_receipt_sha256,scheduler_receipt_sha256,observed_at
           ) values ($1,$2,$3,'COMPLETED',$4,$5,$6,$7,$8,$9)`,
          [receiptId, tenantId, input.schedulerId, input.schedulerLeaseVersion,
           row.worker_id_sha256, row.lease_id_sha256, input.workerTickReceiptHash,
           input.schedulerReceiptHash, completedAt],
        );
        const dueAt = new Date(Date.parse(completedAt) + scheduleIntervalMs).toISOString();
        await client.query(
          `update crays_core.vendure_customer_registration_reconciliation_schedules
              set scheduler_state='IDLE',due_at=$3,worker_id_sha256=null,
                  lease_id_sha256=null,lease_expires_at=null,
                  last_worker_tick_receipt_sha256=$4,
                  last_scheduler_receipt_sha256=$5,last_reason_code=null,
                  updated_at=$6
            where tenant_id=$1 and scheduler_id=$2`,
          [tenantId, input.schedulerId, dueAt, input.workerTickReceiptHash,
           input.schedulerReceiptHash, completedAt],
        );
        return "COMMITTED";
      });
    },

    async failSchedule(input): Promise<"RECORDED" | "LEASE_LOST"> {
      exactHash(input.schedulerReceiptHash, "VCRC_PHASE9_SCHEDULER_RECEIPT_INVALID");
      const failedAt = exactInstant(input.failedAt, "VCRC_PHASE9_FAILURE_TIME_INVALID");
      return transaction(tenantId, async (client) => {
        const selected = await client.query<ScheduleRow>(
          `select * from crays_core.vendure_customer_registration_reconciliation_schedules
            where tenant_id=$1 and scheduler_id=$2 for update`,
          [tenantId, input.schedulerId],
        );
        const row = selected.rows[0];
        if (!row || row.scheduler_state !== "LEASED" ||
            row.worker_id_sha256 !== digest(input.workerId) ||
            row.lease_id_sha256 !== digest(input.schedulerLeaseId) ||
            Number(row.lease_version) !== input.schedulerLeaseVersion) {
          return "LEASE_LOST";
        }
        const receiptId = stableId("vcrsr", { tenantId, ...input });
        await client.query(
          `insert into crays_core.vendure_customer_registration_scheduler_receipts (
             scheduler_receipt_id,tenant_id,scheduler_id,receipt_kind,
             lease_version,worker_id_sha256,lease_id_sha256,
             scheduler_receipt_sha256,reason_code,observed_at
           ) values ($1,$2,$3,'FAILED',$4,$5,$6,$7,$8,$9)`,
          [receiptId, tenantId, input.schedulerId, input.schedulerLeaseVersion,
           row.worker_id_sha256, row.lease_id_sha256, input.schedulerReceiptHash,
           input.reasonCode, failedAt],
        );
        const dueAt = new Date(Date.parse(failedAt) + schedulerFailureRetryMs).toISOString();
        await client.query(
          `update crays_core.vendure_customer_registration_reconciliation_schedules
              set scheduler_state='IDLE',due_at=$3,worker_id_sha256=null,
                  lease_id_sha256=null,lease_expires_at=null,
                  last_scheduler_receipt_sha256=$4,last_reason_code=$5,
                  updated_at=$6
            where tenant_id=$1 and scheduler_id=$2`,
          [tenantId, input.schedulerId, dueAt, input.schedulerReceiptHash,
           input.reasonCode, failedAt],
        );
        return "RECORDED";
      });
    },
  };

  return Object.freeze({ workRepository, schedulerRepository });
}
