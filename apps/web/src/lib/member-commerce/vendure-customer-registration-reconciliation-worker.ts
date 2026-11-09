import { createHash } from "node:crypto";

import type {
  VendureCustomerRegistrationStatusOutcome,
  VendureCustomerRegistrationStatusTransport,
} from "./vendure-customer-registration-status-transport";

export const VENDURE_REGISTRATION_RECONCILIATION_WORKER_VERSION =
  "cclub-063.vendure-registration-reconciliation-worker.v1" as const;

export type PersistedVendureRegistrationLease = Readonly<{
  reconciliationId: string;
  tenantId: string;
  leaseId: string;
  leaseVersion: number;
  leaseRecovered: boolean;
  claimId: string;
  idempotencyKey: string;
  authorityPayloadHash: string;
  commandBindingId: string;
  commandBindingVersion: string;
  deploymentCell: string;
  providerExecutionAttempt: number;
  statusAttempt: number;
}>;

export type ClaimNextVendureRegistrationLeaseInput = Readonly<{
  workerId: string;
  claimedAt: string;
  leaseDurationMs: number;
}>;

export type CommitVendureRegistrationResolutionInput = Readonly<{
  workerId: string;
  reconciliationId: string;
  tenantId: string;
  leaseId: string;
  leaseVersion: number;
  observedAt: string;
  outcome: Exclude<
    VendureCustomerRegistrationStatusOutcome,
    Readonly<{ outcome: "UNRESOLVED" }>
  >;
  workerReceiptHash: string;
}>;

export type ScheduleVendureRegistrationRetryInput = Readonly<{
  workerId: string;
  reconciliationId: string;
  tenantId: string;
  leaseId: string;
  leaseVersion: number;
  observedAt: string;
  nextAttemptAt: string;
  reasonCode: string;
  statusReceiptHash: string | null;
  workerReceiptHash: string;
}>;

export interface PersistedVendureRegistrationWorkRepository {
  /**
   * Must atomically claim one due PENDING/UNKNOWN item or recover one expired
   * lease. It must increment leaseVersion/statusAttempt in the same durable
   * transaction and never accept tenant, claim or command scope from a browser.
   */
  claimNext(
    input: ClaimNextVendureRegistrationLeaseInput,
  ): Promise<PersistedVendureRegistrationLease | null>;

  /**
   * Must append observation and terminal reconciliation receipts in one
   * transaction iff the exact lease owner/id/version still match.
   */
  commitResolution(
    input: CommitVendureRegistrationResolutionInput,
  ): Promise<"COMMITTED" | "LEASE_LOST">;

  /**
   * Must append the unresolved observation and release the exact lease into a
   * due-at retry state. It must never replay the provider create command.
   */
  scheduleRetry(
    input: ScheduleVendureRegistrationRetryInput,
  ): Promise<"SCHEDULED" | "LEASE_LOST">;
}

export type VendureRegistrationReconciliationWorkerConfig = Readonly<{
  workerId: string;
  leaseDurationMs: number;
  baseRetryDelayMs: number;
  maxRetryDelayMs: number;
  maxItemsPerTick: number;
  repository: PersistedVendureRegistrationWorkRepository;
  statusTransport: VendureCustomerRegistrationStatusTransport;
  now?: () => Date;
}>;

export type VendureRegistrationWorkerItemResult =
  | Readonly<{
      state: "NO_WORK";
    }>
  | Readonly<{
      state: "RESOLVED";
      reconciliationId: string;
      outcome: "APPLIED_CONFIRMED" | "NOT_APPLIED_CONFIRMED";
      leaseRecovered: boolean;
    }>
  | Readonly<{
      state: "RETRY_SCHEDULED";
      reconciliationId: string;
      reasonCode: string;
      nextAttemptAt: string;
      leaseRecovered: boolean;
    }>
  | Readonly<{
      state: "LEASE_LOST";
      reconciliationId: string;
      leaseRecovered: boolean;
    }>;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const HASH = /^[a-f0-9]{64}$/;

function digest(value: object): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function exactDate(now: () => Date): Date {
  const value = now();
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error("VENDURE_RECONCILIATION_WORKER_CLOCK_INVALID");
  }
  return value;
}

function exactId(value: string, code: string): string {
  if (typeof value !== "string" || !ID.test(value.trim())) {
    throw new Error(code);
  }
  return value.trim();
}

function exactPositive(value: number, code: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(code);
  return value;
}

function validateLease(
  lease: PersistedVendureRegistrationLease,
): PersistedVendureRegistrationLease {
  [
    lease.reconciliationId,
    lease.tenantId,
    lease.leaseId,
    lease.claimId,
    lease.idempotencyKey,
    lease.commandBindingId,
    lease.commandBindingVersion,
    lease.deploymentCell,
  ].forEach((value) =>
    exactId(value, "VENDURE_RECONCILIATION_LEASE_INVALID"),
  );
  exactPositive(
    lease.leaseVersion,
    "VENDURE_RECONCILIATION_LEASE_INVALID",
  );
  exactPositive(
    lease.providerExecutionAttempt,
    "VENDURE_RECONCILIATION_LEASE_INVALID",
  );
  exactPositive(
    lease.statusAttempt,
    "VENDURE_RECONCILIATION_LEASE_INVALID",
  );
  if (!HASH.test(lease.authorityPayloadHash)) {
    throw new Error("VENDURE_RECONCILIATION_LEASE_INVALID");
  }
  if (typeof lease.leaseRecovered !== "boolean") {
    throw new Error("VENDURE_RECONCILIATION_LEASE_INVALID");
  }
  return lease;
}

function retryDelayMs(
  statusAttempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exponent = Math.min(statusAttempt - 1, 30);
  return Math.min(maxDelayMs, baseDelayMs * 2 ** exponent);
}

function reasonFrom(error: unknown): string {
  if (error instanceof Error) {
    const normalized = error.message.trim();
    if (/^VENDURE_STATUS_[A-Z0-9_]+$/.test(normalized)) {
      return normalized;
    }
  }
  return "VENDURE_STATUS_TRANSPORT_UNRESOLVED";
}

function statusRequestId(
  lease: PersistedVendureRegistrationLease,
): string {
  return (
    "status-" +
    digest({
      reconciliationId: lease.reconciliationId,
      leaseId: lease.leaseId,
      leaseVersion: lease.leaseVersion,
      statusAttempt: lease.statusAttempt,
      authorityPayloadHash: lease.authorityPayloadHash,
    })
  );
}

export function createVendureRegistrationReconciliationWorker(
  config: VendureRegistrationReconciliationWorkerConfig,
) {
  const workerId = exactId(
    config.workerId,
    "VENDURE_RECONCILIATION_WORKER_ID_INVALID",
  );
  const leaseDurationMs = exactPositive(
    config.leaseDurationMs,
    "VENDURE_RECONCILIATION_WORKER_LEASE_DURATION_INVALID",
  );
  const baseRetryDelayMs = exactPositive(
    config.baseRetryDelayMs,
    "VENDURE_RECONCILIATION_WORKER_RETRY_DELAY_INVALID",
  );
  const maxRetryDelayMs = exactPositive(
    config.maxRetryDelayMs,
    "VENDURE_RECONCILIATION_WORKER_RETRY_DELAY_INVALID",
  );
  const maxItemsPerTick = exactPositive(
    config.maxItemsPerTick,
    "VENDURE_RECONCILIATION_WORKER_BATCH_INVALID",
  );
  if (baseRetryDelayMs > maxRetryDelayMs) {
    throw new Error("VENDURE_RECONCILIATION_WORKER_RETRY_RANGE_INVALID");
  }
  const now = config.now ?? (() => new Date());

  async function scheduleRetry(
    lease: PersistedVendureRegistrationLease,
    observedAt: Date,
    reasonCode: string,
    statusReceiptHash: string | null,
  ): Promise<VendureRegistrationWorkerItemResult> {
    const nextAttemptAt = new Date(
      observedAt.getTime() +
        retryDelayMs(
          lease.statusAttempt,
          baseRetryDelayMs,
          maxRetryDelayMs,
        ),
    ).toISOString();
    const retryBody = {
      workerVersion: VENDURE_REGISTRATION_RECONCILIATION_WORKER_VERSION,
      workerId,
      reconciliationId: lease.reconciliationId,
      tenantId: lease.tenantId,
      leaseId: lease.leaseId,
      leaseVersion: lease.leaseVersion,
      observedAt: observedAt.toISOString(),
      nextAttemptAt,
      reasonCode,
      statusReceiptHash,
    };
    const result = await config.repository.scheduleRetry({
      ...retryBody,
      workerReceiptHash: digest(retryBody),
    });
    if (result === "LEASE_LOST") {
      return {
        state: "LEASE_LOST",
        reconciliationId: lease.reconciliationId,
        leaseRecovered: lease.leaseRecovered,
      };
    }
    return {
      state: "RETRY_SCHEDULED",
      reconciliationId: lease.reconciliationId,
      reasonCode,
      nextAttemptAt,
      leaseRecovered: lease.leaseRecovered,
    };
  }

  async function runOne(): Promise<VendureRegistrationWorkerItemResult> {
    const claimedAt = exactDate(now);
    const lease = await config.repository.claimNext({
      workerId,
      claimedAt: claimedAt.toISOString(),
      leaseDurationMs,
    });
    if (lease === null) return { state: "NO_WORK" };
    validateLease(lease);

    let outcome: VendureCustomerRegistrationStatusOutcome;
    try {
      outcome = await config.statusTransport({
        statusRequestId: statusRequestId(lease),
        claimId: lease.claimId,
        idempotencyKey: lease.idempotencyKey,
        authorityPayloadHash: lease.authorityPayloadHash,
        commandBindingId: lease.commandBindingId,
        commandBindingVersion: lease.commandBindingVersion,
        deploymentCell: lease.deploymentCell,
        observedAttempt: lease.providerExecutionAttempt,
        statusAttempt: lease.statusAttempt,
      });
    } catch (error) {
      return scheduleRetry(
        lease,
        exactDate(now),
        reasonFrom(error),
        null,
      );
    }

    const observedAt = exactDate(now);
    if (outcome.outcome === "UNRESOLVED") {
      return scheduleRetry(
        lease,
        observedAt,
        "VENDURE_STATUS_PROVIDER_INCONCLUSIVE",
        outcome.statusReceiptHash,
      );
    }

    const resolutionBody = {
      workerVersion: VENDURE_REGISTRATION_RECONCILIATION_WORKER_VERSION,
      workerId,
      reconciliationId: lease.reconciliationId,
      tenantId: lease.tenantId,
      leaseId: lease.leaseId,
      leaseVersion: lease.leaseVersion,
      observedAt: observedAt.toISOString(),
      outcome,
    };
    const result = await config.repository.commitResolution({
      workerId,
      reconciliationId: lease.reconciliationId,
      tenantId: lease.tenantId,
      leaseId: lease.leaseId,
      leaseVersion: lease.leaseVersion,
      observedAt: observedAt.toISOString(),
      outcome,
      workerReceiptHash: digest(resolutionBody),
    });
    if (result === "LEASE_LOST") {
      return {
        state: "LEASE_LOST",
        reconciliationId: lease.reconciliationId,
        leaseRecovered: lease.leaseRecovered,
      };
    }
    return {
      state: "RESOLVED",
      reconciliationId: lease.reconciliationId,
      outcome: outcome.outcome,
      leaseRecovered: lease.leaseRecovered,
    };
  }

  async function runTick() {
    const items: VendureRegistrationWorkerItemResult[] = [];
    for (let index = 0; index < maxItemsPerTick; index += 1) {
      const result = await runOne();
      items.push(result);
      if (result.state === "NO_WORK") break;
    }
    const body = {
      workerVersion: VENDURE_REGISTRATION_RECONCILIATION_WORKER_VERSION,
      workerId,
      maxItemsPerTick,
      items,
      performsProviderCreateReplay: false as const,
      ownsSchedulerProcess: false as const,
    };
    return Object.freeze({
      ...body,
      tickReceiptHash: digest(body),
    });
  }

  return Object.freeze({ runOne, runTick });
}

