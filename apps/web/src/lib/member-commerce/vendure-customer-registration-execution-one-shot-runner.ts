import "server-only";

import type {
  PreparedVendureExecutionCommand,
} from "./vendure-customer-registration-execution-command-envelope.js";

export const VENDURE_ONE_SHOT_RUNNER_CONTRACT_VERSION = 1 as const;

export type VendureOneShotRunnerErrorCode =
  | "COMMAND_SCOPE_INVALID"
  | "COMMAND_NOT_ACTIVE"
  | "RUNTIME_SCOPE_MISMATCH"
  | "RUNTIME_RESULT_INVALID";

export class VendureOneShotRunnerError extends Error {
  readonly code: VendureOneShotRunnerErrorCode;

  constructor(code: VendureOneShotRunnerErrorCode, message: string) {
    super(message);
    this.name = "VendureOneShotRunnerError";
    this.code = code;
  }
}

export interface VendureOneShotRuntimeScope {
  tenantId: string;
  schedulerId: string;
  vendureEndpointSha256: string;
  statusRefreshOnly: true;
  providerCreateReplay: false;
}

export interface VendureOneShotRuntimeRequest {
  tenantId: string;
  schedulerId: string;
  vendureEndpointSha256: string;
  workerRunId: string;
  correlationId: string;
  leaseOwner: string;
  idempotencyKeySha256: string;
  notBefore: string;
  deadline: string;
  maxBatchSize: number;
  maxRuntimeMs: number;
  statusRefreshOnly: true;
  providerCreateReplay: false;
}

export type VendureOneShotRuntimeStatus =
  | "completed"
  | "partial"
  | "no_work"
  | "failed";

export interface VendureOneShotRuntimeResult {
  tenantId: string;
  schedulerId: string;
  vendureEndpointSha256: string;
  workerRunId: string;
  correlationId: string;
  status: VendureOneShotRuntimeStatus;
  claimedCount: number;
  refreshedCount: number;
  retryCount: number;
  quarantinedCount: number;
  startedAt: string;
  completedAt: string;
  providerCreateReplay: false;
}

export interface VendureOneShotRuntime {
  describeScope(): VendureOneShotRuntimeScope;
  runOneShotStatusReconciliation(
    request: Readonly<VendureOneShotRuntimeRequest>,
  ): Promise<VendureOneShotRuntimeResult>;
}

export interface VendureOneShotRunReceipt {
  contractVersion: typeof VENDURE_ONE_SHOT_RUNNER_CONTRACT_VERSION;
  commandId: string;
  commandSha256: string;
  authorizationId: string;
  authorizationSha256: string;
  authorizationConsumptionReceiptId: string;
  authorizationConsumptionReceiptSha256: string;
  tenantId: string;
  schedulerId: string;
  vendureEndpointSha256: string;
  workerRunId: string;
  correlationId: string;
  leaseOwner: string;
  status: VendureOneShotRuntimeStatus;
  claimedCount: number;
  refreshedCount: number;
  retryCount: number;
  quarantinedCount: number;
  startedAt: string;
  completedAt: string;
  statusRefreshOnly: true;
  providerCreateReplay: false;
  schedulerProcessStarted: false;
}

function fail(code: VendureOneShotRunnerErrorCode, message: string): never {
  throw new VendureOneShotRunnerError(code, message);
}

function parseDate(
  value: string,
  field: string,
  code: VendureOneShotRunnerErrorCode,
): Date {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    fail(code, field + " must be an ISO timestamp");
  }
  return parsed;
}

function exact(
  actual: string,
  expected: string,
  field: string,
  code: VendureOneShotRunnerErrorCode,
): void {
  if (actual !== expected) {
    fail(code, field + " does not match");
  }
}

function count(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0) {
    fail("RUNTIME_RESULT_INVALID", field + " must be a non-negative integer");
  }
  return value;
}

export async function runPreparedVendureExecutionCommand(
  command: Readonly<PreparedVendureExecutionCommand>,
  runtime: VendureOneShotRuntime,
  observedAt: Date = new Date(),
): Promise<Readonly<VendureOneShotRunReceipt>> {
  if (!Number.isFinite(observedAt.getTime())) {
    fail("COMMAND_SCOPE_INVALID", "observedAt must be valid");
  }
  if (
    command.contractVersion !== 1 ||
    command.mode !== "STATUS_RECONCILIATION_ONLY" ||
    command.statusRefreshOnly !== true ||
    command.providerCreateReplay !== false ||
    command.startsScheduler !== false
  ) {
    fail("COMMAND_SCOPE_INVALID", "command safety contract is invalid");
  }

  const nowMs = observedAt.getTime();
  const notBefore = parseDate(
    command.notBefore,
    "command.notBefore",
    "COMMAND_NOT_ACTIVE",
  );
  const expiresAt = parseDate(
    command.expiresAt,
    "command.expiresAt",
    "COMMAND_NOT_ACTIVE",
  );
  if (nowMs < notBefore.getTime() || nowMs >= expiresAt.getTime()) {
    fail("COMMAND_NOT_ACTIVE", "command is not active");
  }

  const runtimeScope = runtime.describeScope();
  exact(
    runtimeScope.tenantId,
    command.tenantId,
    "runtime tenant",
    "RUNTIME_SCOPE_MISMATCH",
  );
  exact(
    runtimeScope.schedulerId,
    command.schedulerId,
    "runtime scheduler",
    "RUNTIME_SCOPE_MISMATCH",
  );
  exact(
    runtimeScope.vendureEndpointSha256,
    command.vendureEndpointSha256,
    "runtime endpoint",
    "RUNTIME_SCOPE_MISMATCH",
  );
  if (
    runtimeScope.statusRefreshOnly !== true ||
    runtimeScope.providerCreateReplay !== false
  ) {
    fail("RUNTIME_SCOPE_MISMATCH", "runtime safety mode is invalid");
  }

  const request = Object.freeze({
    tenantId: command.tenantId,
    schedulerId: command.schedulerId,
    vendureEndpointSha256: command.vendureEndpointSha256,
    workerRunId: command.workerRunId,
    correlationId: command.correlationId,
    leaseOwner: command.leaseOwner,
    idempotencyKeySha256: command.idempotencyKeySha256,
    notBefore: command.notBefore,
    deadline: command.expiresAt,
    maxBatchSize: command.maxBatchSize,
    maxRuntimeMs: command.maxRuntimeMs,
    statusRefreshOnly: true as const,
    providerCreateReplay: false as const,
  });

  const result = await runtime.runOneShotStatusReconciliation(request);

  exact(result.tenantId, command.tenantId, "result tenant", "RUNTIME_RESULT_INVALID");
  exact(
    result.schedulerId,
    command.schedulerId,
    "result scheduler",
    "RUNTIME_RESULT_INVALID",
  );
  exact(
    result.vendureEndpointSha256,
    command.vendureEndpointSha256,
    "result endpoint",
    "RUNTIME_RESULT_INVALID",
  );
  exact(
    result.workerRunId,
    command.workerRunId,
    "result worker run",
    "RUNTIME_RESULT_INVALID",
  );
  exact(
    result.correlationId,
    command.correlationId,
    "result correlation",
    "RUNTIME_RESULT_INVALID",
  );
  if (!["completed", "partial", "no_work", "failed"].includes(result.status)) {
    fail("RUNTIME_RESULT_INVALID", "runtime status is invalid");
  }
  if (result.providerCreateReplay !== false) {
    fail("RUNTIME_RESULT_INVALID", "runtime result enabled provider create replay");
  }

  const claimedCount = count(result.claimedCount, "claimedCount");
  const refreshedCount = count(result.refreshedCount, "refreshedCount");
  const retryCount = count(result.retryCount, "retryCount");
  const quarantinedCount = count(result.quarantinedCount, "quarantinedCount");
  if (refreshedCount + retryCount + quarantinedCount > claimedCount) {
    fail("RUNTIME_RESULT_INVALID", "result outcome counts exceed claimed count");
  }
  if (result.status === "no_work" && claimedCount !== 0) {
    fail("RUNTIME_RESULT_INVALID", "no_work result must claim zero rows");
  }

  const startedAt = parseDate(
    result.startedAt,
    "result.startedAt",
    "RUNTIME_RESULT_INVALID",
  );
  const completedAt = parseDate(
    result.completedAt,
    "result.completedAt",
    "RUNTIME_RESULT_INVALID",
  );
  if (
    startedAt.getTime() < nowMs ||
    completedAt.getTime() < startedAt.getTime() ||
    completedAt.getTime() > expiresAt.getTime() ||
    completedAt.getTime() - startedAt.getTime() > command.maxRuntimeMs
  ) {
    fail("RUNTIME_RESULT_INVALID", "runtime result timing is invalid");
  }

  return Object.freeze({
    contractVersion: VENDURE_ONE_SHOT_RUNNER_CONTRACT_VERSION,
    commandId: command.commandId,
    commandSha256: command.commandSha256,
    authorizationId: command.authorizationId,
    authorizationSha256: command.authorizationSha256,
    authorizationConsumptionReceiptId:
      command.authorizationConsumptionReceiptId,
    authorizationConsumptionReceiptSha256:
      command.authorizationConsumptionReceiptSha256,
    tenantId: command.tenantId,
    schedulerId: command.schedulerId,
    vendureEndpointSha256: command.vendureEndpointSha256,
    workerRunId: command.workerRunId,
    correlationId: command.correlationId,
    leaseOwner: command.leaseOwner,
    status: result.status,
    claimedCount,
    refreshedCount,
    retryCount,
    quarantinedCount,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    statusRefreshOnly: true,
    providerCreateReplay: false,
    schedulerProcessStarted: false,
  });
}

