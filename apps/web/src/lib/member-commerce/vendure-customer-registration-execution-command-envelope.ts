import "server-only";

export const VENDURE_EXECUTION_COMMAND_CONTRACT_VERSION = 1 as const;
export const VENDURE_EXECUTION_COMMAND_MODE =
  "STATUS_RECONCILIATION_ONLY" as const;
export const VENDURE_EXECUTION_COMMAND_MAX_HANDOFF_AGE_MS = 60 * 1000;
export const VENDURE_EXECUTION_COMMAND_MAX_TTL_MS = 5 * 60 * 1000;
export const VENDURE_EXECUTION_COMMAND_MAX_BATCH_SIZE = 100;
export const VENDURE_EXECUTION_COMMAND_MAX_RUNTIME_MS = 60 * 1000;
export const VENDURE_EXECUTION_COMMAND_MAX_CLOCK_SKEW_MS = 30 * 1000;

export type VendureExecutionCommandErrorCode =
  | "MALFORMED_COMMAND"
  | "INVALID_HASH"
  | "AUTHORIZATION_NOT_CONSUMED"
  | "CONSUMPTION_SCOPE_MISMATCH"
  | "CONSUMPTION_RECEIPT_MISMATCH"
  | "CONSUMPTION_HANDOFF_STALE"
  | "COMMAND_WINDOW_INVALID"
  | "WORK_LIMIT_INVALID";

export class VendureExecutionCommandError extends Error {
  readonly code: VendureExecutionCommandErrorCode;

  constructor(code: VendureExecutionCommandErrorCode, message: string) {
    super(message);
    this.name = "VendureExecutionCommandError";
    this.code = code;
  }
}

export interface ConsumedVendureExecutionAuthorization {
  authorizationId: string;
  authorizationSha256: string;
  tenantId: string;
  schedulerId: string;
  vendureEndpointSha256: string;
  state: string;
  authorizedAt: string;
  expiresAt: string;
  consumedAt: string;
  consumptionSha256: string;
}

export interface VendureExecutionAuthorizationConsumptionReceipt {
  receiptId: string;
  receiptSha256: string;
  authorizationId: string;
  authorizationSha256: string;
  tenantId: string;
  schedulerId: string;
  vendureEndpointSha256: string;
  consumedAt: string;
  consumptionSha256: string;
}

export interface PrepareVendureExecutionCommandInput {
  commandId: string;
  commandSha256: string;
  idempotencyKeySha256: string;
  tenantId: string;
  schedulerId: string;
  vendureEndpointSha256: string;
  workerRunId: string;
  correlationId: string;
  leaseOwner: string;
  notBefore: string;
  expiresAt: string;
  maxBatchSize: number;
  maxRuntimeMs: number;
  authorization: ConsumedVendureExecutionAuthorization;
  consumptionReceipt: VendureExecutionAuthorizationConsumptionReceipt;
}

export interface PreparedVendureExecutionCommand {
  contractVersion: typeof VENDURE_EXECUTION_COMMAND_CONTRACT_VERSION;
  commandId: string;
  commandSha256: string;
  idempotencyKeySha256: string;
  mode: typeof VENDURE_EXECUTION_COMMAND_MODE;
  tenantId: string;
  schedulerId: string;
  vendureEndpointSha256: string;
  workerRunId: string;
  correlationId: string;
  leaseOwner: string;
  authorizationId: string;
  authorizationSha256: string;
  authorizationConsumptionReceiptId: string;
  authorizationConsumptionReceiptSha256: string;
  consumptionSha256: string;
  consumedAt: string;
  preparedAt: string;
  notBefore: string;
  expiresAt: string;
  maxBatchSize: number;
  maxRuntimeMs: number;
  statusRefreshOnly: true;
  providerCreateReplay: false;
  startsScheduler: false;
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function fail(code: VendureExecutionCommandErrorCode, message: string): never {
  throw new VendureExecutionCommandError(code, message);
}

function requireText(
  value: string,
  field: string,
  code: VendureExecutionCommandErrorCode = "MALFORMED_COMMAND",
): string {
  if (typeof value !== "string" || value.trim() === "") {
    fail(code, field + " must be a non-empty string");
  }
  return value;
}

function requireSha256(value: string, field: string): string {
  if (!SHA256_PATTERN.test(value)) {
    fail("INVALID_HASH", field + " must be a lowercase SHA-256");
  }
  return value;
}

function requireDate(
  value: string,
  field: string,
  code: VendureExecutionCommandErrorCode,
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
  code: VendureExecutionCommandErrorCode,
): void {
  if (actual !== expected) {
    fail(code, field + " does not match");
  }
}

export function prepareVendureExecutionCommand(
  input: PrepareVendureExecutionCommandInput,
  observedAt: Date = new Date(),
): Readonly<PreparedVendureExecutionCommand> {
  if (!Number.isFinite(observedAt.getTime())) {
    fail("MALFORMED_COMMAND", "observedAt must be valid");
  }
  const nowMs = observedAt.getTime();
  const commandId = requireText(input.commandId, "commandId");
  const commandSha256 = requireSha256(input.commandSha256, "commandSha256");
  const idempotencyKeySha256 = requireSha256(
    input.idempotencyKeySha256,
    "idempotencyKeySha256",
  );
  const tenantId = requireText(input.tenantId, "tenantId");
  const schedulerId = requireText(input.schedulerId, "schedulerId");
  const endpointSha256 = requireSha256(
    input.vendureEndpointSha256,
    "vendureEndpointSha256",
  );
  const workerRunId = requireText(input.workerRunId, "workerRunId");
  const correlationId = requireText(input.correlationId, "correlationId");
  const leaseOwner = requireText(input.leaseOwner, "leaseOwner");

  const authorization = input.authorization;
  const receipt = input.consumptionReceipt;

  if (authorization.state.toLowerCase() !== "consumed") {
    fail(
      "AUTHORIZATION_NOT_CONSUMED",
      "authorization must already be atomically consumed",
    );
  }

  requireText(authorization.authorizationId, "authorization.authorizationId");
  requireSha256(
    authorization.authorizationSha256,
    "authorization.authorizationSha256",
  );
  requireSha256(
    authorization.vendureEndpointSha256,
    "authorization.vendureEndpointSha256",
  );
  requireSha256(
    authorization.consumptionSha256,
    "authorization.consumptionSha256",
  );

  exact(
    authorization.tenantId,
    tenantId,
    "authorization tenant",
    "CONSUMPTION_SCOPE_MISMATCH",
  );
  exact(
    authorization.schedulerId,
    schedulerId,
    "authorization scheduler",
    "CONSUMPTION_SCOPE_MISMATCH",
  );
  exact(
    authorization.vendureEndpointSha256,
    endpointSha256,
    "authorization endpoint",
    "CONSUMPTION_SCOPE_MISMATCH",
  );

  requireText(receipt.receiptId, "consumptionReceipt.receiptId");
  requireSha256(receipt.receiptSha256, "consumptionReceipt.receiptSha256");
  requireSha256(
    receipt.authorizationSha256,
    "consumptionReceipt.authorizationSha256",
  );
  requireSha256(
    receipt.vendureEndpointSha256,
    "consumptionReceipt.vendureEndpointSha256",
  );
  requireSha256(
    receipt.consumptionSha256,
    "consumptionReceipt.consumptionSha256",
  );

  exact(
    receipt.authorizationId,
    authorization.authorizationId,
    "receipt authorization id",
    "CONSUMPTION_RECEIPT_MISMATCH",
  );
  exact(
    receipt.authorizationSha256,
    authorization.authorizationSha256,
    "receipt authorization hash",
    "CONSUMPTION_RECEIPT_MISMATCH",
  );
  exact(
    receipt.tenantId,
    tenantId,
    "receipt tenant",
    "CONSUMPTION_RECEIPT_MISMATCH",
  );
  exact(
    receipt.schedulerId,
    schedulerId,
    "receipt scheduler",
    "CONSUMPTION_RECEIPT_MISMATCH",
  );
  exact(
    receipt.vendureEndpointSha256,
    endpointSha256,
    "receipt endpoint",
    "CONSUMPTION_RECEIPT_MISMATCH",
  );
  exact(
    receipt.consumptionSha256,
    authorization.consumptionSha256,
    "receipt consumption hash",
    "CONSUMPTION_RECEIPT_MISMATCH",
  );
  exact(
    receipt.consumedAt,
    authorization.consumedAt,
    "receipt consumed timestamp",
    "CONSUMPTION_RECEIPT_MISMATCH",
  );

  const authorizedAt = requireDate(
    authorization.authorizedAt,
    "authorization.authorizedAt",
    "CONSUMPTION_HANDOFF_STALE",
  );
  const authorizationExpiresAt = requireDate(
    authorization.expiresAt,
    "authorization.expiresAt",
    "COMMAND_WINDOW_INVALID",
  );
  const consumedAt = requireDate(
    authorization.consumedAt,
    "authorization.consumedAt",
    "CONSUMPTION_HANDOFF_STALE",
  );
  if (
    authorizedAt.getTime() > consumedAt.getTime() ||
    consumedAt.getTime() > nowMs + VENDURE_EXECUTION_COMMAND_MAX_CLOCK_SKEW_MS ||
    nowMs - consumedAt.getTime() > VENDURE_EXECUTION_COMMAND_MAX_HANDOFF_AGE_MS
  ) {
    fail(
      "CONSUMPTION_HANDOFF_STALE",
      "consumed authorization is outside the command handoff window",
    );
  }

  const notBefore = requireDate(
    input.notBefore,
    "notBefore",
    "COMMAND_WINDOW_INVALID",
  );
  const commandExpiresAt = requireDate(
    input.expiresAt,
    "expiresAt",
    "COMMAND_WINDOW_INVALID",
  );
  if (
    notBefore.getTime() < consumedAt.getTime() ||
    notBefore.getTime() > nowMs + VENDURE_EXECUTION_COMMAND_MAX_HANDOFF_AGE_MS ||
    commandExpiresAt.getTime() <= notBefore.getTime() ||
    commandExpiresAt.getTime() - nowMs > VENDURE_EXECUTION_COMMAND_MAX_TTL_MS ||
    commandExpiresAt.getTime() > authorizationExpiresAt.getTime()
  ) {
    fail(
      "COMMAND_WINDOW_INVALID",
      "command timing exceeds the consumed authorization boundary",
    );
  }

  if (
    !Number.isInteger(input.maxBatchSize) ||
    input.maxBatchSize < 1 ||
    input.maxBatchSize > VENDURE_EXECUTION_COMMAND_MAX_BATCH_SIZE
  ) {
    fail("WORK_LIMIT_INVALID", "maxBatchSize is outside the safe bound");
  }
  if (
    !Number.isInteger(input.maxRuntimeMs) ||
    input.maxRuntimeMs < 1000 ||
    input.maxRuntimeMs > VENDURE_EXECUTION_COMMAND_MAX_RUNTIME_MS
  ) {
    fail("WORK_LIMIT_INVALID", "maxRuntimeMs is outside the safe bound");
  }

  return Object.freeze({
    contractVersion: VENDURE_EXECUTION_COMMAND_CONTRACT_VERSION,
    commandId,
    commandSha256,
    idempotencyKeySha256,
    mode: VENDURE_EXECUTION_COMMAND_MODE,
    tenantId,
    schedulerId,
    vendureEndpointSha256: endpointSha256,
    workerRunId,
    correlationId,
    leaseOwner,
    authorizationId: authorization.authorizationId,
    authorizationSha256: authorization.authorizationSha256,
    authorizationConsumptionReceiptId: receipt.receiptId,
    authorizationConsumptionReceiptSha256: receipt.receiptSha256,
    consumptionSha256: authorization.consumptionSha256,
    consumedAt: consumedAt.toISOString(),
    preparedAt: observedAt.toISOString(),
    notBefore: notBefore.toISOString(),
    expiresAt: commandExpiresAt.toISOString(),
    maxBatchSize: input.maxBatchSize,
    maxRuntimeMs: input.maxRuntimeMs,
    statusRefreshOnly: true,
    providerCreateReplay: false,
    startsScheduler: false,
  });
}

