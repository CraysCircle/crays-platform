import { createHash } from "node:crypto";

export const VENDURE_REGISTRATION_RECONCILIATION_SCHEDULER_VERSION =
  "cclub-063.vendure-registration-reconciliation-scheduler.v1" as const;

export type PersistedVendureReconciliationSchedulerLease = Readonly<{
  schedulerId: string;
  schedulerLeaseId: string;
  schedulerLeaseVersion: number;
  recoveredExpiredLease: boolean;
}>;

export type VendureReconciliationWorkerTickReceipt = Readonly<{
  tickReceiptHash: string;
  items: readonly unknown[];
  performsProviderCreateReplay: false;
  ownsSchedulerProcess: false;
}>;

export interface VendureReconciliationTickRunner {
  runTick(): Promise<VendureReconciliationWorkerTickReceipt>;
}

export interface PersistedVendureReconciliationSchedulerRepository {
  /**
   * Atomically claims the named schedule or recovers its expired lease.
   * Implementations use database time and must never accept tenant scope from
   * an HTTP/browser caller.
   */
  claimSchedule(input: {
    schedulerId: string;
    workerId: string;
    claimedAt: string;
    leaseDurationMs: number;
  }): Promise<PersistedVendureReconciliationSchedulerLease | null>;

  /**
   * Appends completion and releases only the exact scheduler lease.
   */
  completeSchedule(input: {
    schedulerId: string;
    workerId: string;
    schedulerLeaseId: string;
    schedulerLeaseVersion: number;
    completedAt: string;
    workerTickReceiptHash: string;
    schedulerReceiptHash: string;
  }): Promise<"COMMITTED" | "LEASE_LOST">;

  /**
   * Appends a sanitized failure receipt and releases only the exact lease into
   * its next database-owned due state.
   */
  failSchedule(input: {
    schedulerId: string;
    workerId: string;
    schedulerLeaseId: string;
    schedulerLeaseVersion: number;
    failedAt: string;
    reasonCode: string;
    schedulerReceiptHash: string;
  }): Promise<"RECORDED" | "LEASE_LOST">;
}

export type VendureReconciliationSchedulerConfig = Readonly<{
  schedulerId: string;
  workerId: string;
  leaseDurationMs: number;
  repository: PersistedVendureReconciliationSchedulerRepository;
  worker: VendureReconciliationTickRunner;
  now?: () => Date;
}>;

export type VendureReconciliationScheduledTickResult =
  | Readonly<{ state: "NOT_DUE_OR_ALREADY_LEASED" }>
  | Readonly<{
      state: "COMPLETED";
      schedulerLeaseRecovered: boolean;
      workerTickReceiptHash: string;
      schedulerReceiptHash: string;
    }>
  | Readonly<{
      state: "FAILED_RECORDED";
      schedulerLeaseRecovered: boolean;
      reasonCode: string;
      schedulerReceiptHash: string;
    }>
  | Readonly<{
      state: "LEASE_LOST";
      schedulerLeaseRecovered: boolean;
      schedulerReceiptHash: string;
    }>;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const HASH = /^[a-f0-9]{64}$/;

function digest(value: object): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function exactId(value: string, code: string): string {
  if (typeof value !== "string" || !ID.test(value.trim())) {
    throw new Error(code);
  }
  return value.trim();
}

function instant(now: () => Date): Date {
  const value = now();
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error("VENDURE_RECONCILIATION_SCHEDULER_CLOCK_INVALID");
  }
  return value;
}

function validateLease(
  value: PersistedVendureReconciliationSchedulerLease,
  schedulerId: string,
): void {
  if (
    value.schedulerId !== schedulerId ||
    !ID.test(value.schedulerLeaseId) ||
    !Number.isSafeInteger(value.schedulerLeaseVersion) ||
    value.schedulerLeaseVersion < 1 ||
    typeof value.recoveredExpiredLease !== "boolean"
  ) {
    throw new Error("VENDURE_RECONCILIATION_SCHEDULER_LEASE_INVALID");
  }
}

function reasonFrom(error: unknown): string {
  if (error instanceof Error) {
    const normalized = error.message.trim();
    if (/^VENDURE_RECONCILIATION_[A-Z0-9_]+$/.test(normalized)) {
      return normalized;
    }
  }
  return "VENDURE_RECONCILIATION_TICK_FAILED";
}

export function createVendureRegistrationReconciliationScheduler(
  config: VendureReconciliationSchedulerConfig,
) {
  const schedulerId = exactId(
    config.schedulerId,
    "VENDURE_RECONCILIATION_SCHEDULER_ID_INVALID",
  );
  const workerId = exactId(
    config.workerId,
    "VENDURE_RECONCILIATION_SCHEDULER_WORKER_ID_INVALID",
  );
  if (
    !Number.isSafeInteger(config.leaseDurationMs) ||
    config.leaseDurationMs < 1
  ) {
    throw new Error(
      "VENDURE_RECONCILIATION_SCHEDULER_LEASE_DURATION_INVALID",
    );
  }
  const now = config.now ?? (() => new Date());

  async function runScheduledTick(): Promise<VendureReconciliationScheduledTickResult> {
    const claimedAt = instant(now);
    const lease = await config.repository.claimSchedule({
      schedulerId,
      workerId,
      claimedAt: claimedAt.toISOString(),
      leaseDurationMs: config.leaseDurationMs,
    });
    if (lease === null) return { state: "NOT_DUE_OR_ALREADY_LEASED" };
    validateLease(lease, schedulerId);

    try {
      const workerReceipt = await config.worker.runTick();
      if (
        !HASH.test(workerReceipt.tickReceiptHash) ||
        workerReceipt.performsProviderCreateReplay !== false ||
        workerReceipt.ownsSchedulerProcess !== false ||
        !Array.isArray(workerReceipt.items)
      ) {
        throw new Error(
          "VENDURE_RECONCILIATION_WORKER_TICK_RECEIPT_INVALID",
        );
      }

      const completedAt = instant(now);
      const body = {
        schedulerVersion:
          VENDURE_REGISTRATION_RECONCILIATION_SCHEDULER_VERSION,
        schedulerId,
        workerId,
        schedulerLeaseId: lease.schedulerLeaseId,
        schedulerLeaseVersion: lease.schedulerLeaseVersion,
        schedulerLeaseRecovered: lease.recoveredExpiredLease,
        claimedAt: claimedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        workerTickReceiptHash: workerReceipt.tickReceiptHash,
        ownsRetainedProcess: false as const,
      };
      const schedulerReceiptHash = digest(body);
      const committed = await config.repository.completeSchedule({
        schedulerId,
        workerId,
        schedulerLeaseId: lease.schedulerLeaseId,
        schedulerLeaseVersion: lease.schedulerLeaseVersion,
        completedAt: completedAt.toISOString(),
        workerTickReceiptHash: workerReceipt.tickReceiptHash,
        schedulerReceiptHash,
      });
      if (committed === "LEASE_LOST") {
        return {
          state: "LEASE_LOST",
          schedulerLeaseRecovered: lease.recoveredExpiredLease,
          schedulerReceiptHash,
        };
      }
      return {
        state: "COMPLETED",
        schedulerLeaseRecovered: lease.recoveredExpiredLease,
        workerTickReceiptHash: workerReceipt.tickReceiptHash,
        schedulerReceiptHash,
      };
    } catch (error) {
      const failedAt = instant(now);
      const reasonCode = reasonFrom(error);
      const body = {
        schedulerVersion:
          VENDURE_REGISTRATION_RECONCILIATION_SCHEDULER_VERSION,
        schedulerId,
        workerId,
        schedulerLeaseId: lease.schedulerLeaseId,
        schedulerLeaseVersion: lease.schedulerLeaseVersion,
        schedulerLeaseRecovered: lease.recoveredExpiredLease,
        claimedAt: claimedAt.toISOString(),
        failedAt: failedAt.toISOString(),
        reasonCode,
        ownsRetainedProcess: false as const,
      };
      const schedulerReceiptHash = digest(body);
      const recorded = await config.repository.failSchedule({
        schedulerId,
        workerId,
        schedulerLeaseId: lease.schedulerLeaseId,
        schedulerLeaseVersion: lease.schedulerLeaseVersion,
        failedAt: failedAt.toISOString(),
        reasonCode,
        schedulerReceiptHash,
      });
      if (recorded === "LEASE_LOST") {
        return {
          state: "LEASE_LOST",
          schedulerLeaseRecovered: lease.recoveredExpiredLease,
          schedulerReceiptHash,
        };
      }
      return {
        state: "FAILED_RECORDED",
        schedulerLeaseRecovered: lease.recoveredExpiredLease,
        reasonCode,
        schedulerReceiptHash,
      };
    }
  }

  return Object.freeze({
    runScheduledTick,
    ownsRetainedProcess: false as const,
  });
}

