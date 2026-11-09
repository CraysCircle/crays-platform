import "server-only";

import { createHash } from "node:crypto";

import type {
  VendureRegistrationReconciliationRuntime,
} from "./vendure-customer-registration-reconciliation-runtime";

export const VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_VERSION =
  "cclub-063.vendure-registration-execution-authorization.v1" as const;

export const VENDURE_REGISTRATION_EXECUTION_ACTION =
  "VENDURE_REGISTRATION_STATUS_RECONCILIATION_TICK" as const;

export type VendureRegistrationExecutionAuthorization = Readonly<{
  authorizationVersion:
    typeof VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_VERSION;
  authorizationId: string;
  action: typeof VENDURE_REGISTRATION_EXECUTION_ACTION;
  tenantId: string;
  schedulerId: string;
  vendureEndpointSha256: string;
  approvalReceiptId: string;
  approvalReceiptSha256: string;
  humanAal2ReceiptId: string;
  humanAal2ReceiptSha256: string;
  humanAal2VerifiedAt: string;
  authorizedAt: string;
  expiresAt: string;
}>;

export type VendureRegistrationAuthorizationConsumption = Readonly<{
  authorizationId: string;
  tenantId: string;
  schedulerId: string;
  vendureEndpointSha256: string;
  approvalReceiptSha256: string;
  humanAal2ReceiptSha256: string;
  consumedAt: string;
}>;

export interface VendureRegistrationExecutionAuthorizationRepository {
  /**
   * Atomically consumes an independently persisted, still-active receipt.
   * CONSUMED must be returned exactly once for an authorizationId.
   */
  consumeAuthorization(
    input: VendureRegistrationAuthorizationConsumption,
  ): Promise<
    | "CONSUMED"
    | "NOT_FOUND"
    | "ALREADY_CONSUMED"
    | "SCOPE_MISMATCH"
  >;
}

export class VendureRegistrationExecutionAuthorizationError extends Error {
  constructor(
    readonly code:
      | "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CONFIG_INVALID"
      | "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_INVALID"
      | "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_SCOPE_MISMATCH"
      | "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_NOT_CURRENT"
      | "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_AAL2_STALE"
      | "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_NOT_FOUND"
      | "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_ALREADY_CONSUMED",
  ) {
    super(code);
    this.name = "VendureRegistrationExecutionAuthorizationError";
  }
}

export type AuthorizedVendureRegistrationRuntimeConfig = Readonly<{
  tenantId: string;
  schedulerId: string;
  vendureEndpoint: string;
  maxAuthorizationAgeMs: number;
  maxHumanAal2AgeMs: number;
  runtime: VendureRegistrationReconciliationRuntime;
  authorizationRepository: VendureRegistrationExecutionAuthorizationRepository;
  now?: () => Date;
}>;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$/;
const HASH = /^[a-f0-9]{64}$/;

function exactId(value: unknown, code: string): string {
  if (typeof value !== "string" || value.trim() !== value || !ID.test(value)) {
    throw new VendureRegistrationExecutionAuthorizationError(
      code as "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CONFIG_INVALID",
    );
  }
  return value;
}

function exactHash(value: unknown): string {
  if (typeof value !== "string" || !HASH.test(value)) {
    throw new VendureRegistrationExecutionAuthorizationError(
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_INVALID",
    );
  }
  return value;
}

function exactPositive(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new VendureRegistrationExecutionAuthorizationError(
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CONFIG_INVALID",
    );
  }
  return value;
}

function exactInstant(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new VendureRegistrationExecutionAuthorizationError(
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_INVALID",
    );
  }
  return parsed;
}

function clock(now: () => Date): Date {
  const value = now();
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new VendureRegistrationExecutionAuthorizationError(
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CONFIG_INVALID",
    );
  }
  return value;
}

export function vendureRegistrationEndpointSha256(endpoint: string): string {
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new VendureRegistrationExecutionAuthorizationError(
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CONFIG_INVALID",
    );
  }
  const loopback =
    parsed.protocol === "http:" &&
    ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname);
  if (
    (parsed.protocol !== "https:" && !loopback) ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  ) {
    throw new VendureRegistrationExecutionAuthorizationError(
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CONFIG_INVALID",
    );
  }
  parsed.search = "";
  return createHash("sha256").update(parsed.toString()).digest("hex");
}

/**
 * Returns the only entry point intended for real reconciliation execution.
 * Validation and durable single-use consumption complete before the runtime can
 * claim a scheduler lease, query the database or contact Vendure.
 */
export function createAuthorizedVendureRegistrationReconciliationRuntime(
  config: AuthorizedVendureRegistrationRuntimeConfig,
) {
  const tenantId = exactId(
    config.tenantId,
    "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CONFIG_INVALID",
  );
  const schedulerId = exactId(
    config.schedulerId,
    "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_CONFIG_INVALID",
  );
  const endpointSha256 = vendureRegistrationEndpointSha256(
    config.vendureEndpoint,
  );
  const maxAuthorizationAgeMs = exactPositive(config.maxAuthorizationAgeMs);
  const maxHumanAal2AgeMs = exactPositive(config.maxHumanAal2AgeMs);
  const now = config.now ?? (() => new Date());

  async function runAuthorizedScheduledTick(
    authorization: VendureRegistrationExecutionAuthorization,
  ) {
    if (
      authorization.authorizationVersion !==
        VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_VERSION ||
      authorization.action !== VENDURE_REGISTRATION_EXECUTION_ACTION
    ) {
      throw new VendureRegistrationExecutionAuthorizationError(
        "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_INVALID",
      );
    }
    exactId(
      authorization.authorizationId,
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_INVALID",
    );
    exactId(
      authorization.approvalReceiptId,
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_INVALID",
    );
    exactId(
      authorization.humanAal2ReceiptId,
      "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_INVALID",
    );
    exactHash(authorization.approvalReceiptSha256);
    exactHash(authorization.humanAal2ReceiptSha256);
    exactHash(authorization.vendureEndpointSha256);
    if (
      authorization.tenantId !== tenantId ||
      authorization.schedulerId !== schedulerId ||
      authorization.vendureEndpointSha256 !== endpointSha256
    ) {
      throw new VendureRegistrationExecutionAuthorizationError(
        "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_SCOPE_MISMATCH",
      );
    }

    const current = clock(now);
    const currentMs = current.getTime();
    const aal2Ms = exactInstant(authorization.humanAal2VerifiedAt);
    const authorizedMs = exactInstant(authorization.authorizedAt);
    const expiresMs = exactInstant(authorization.expiresAt);
    if (
      authorizedMs > currentMs ||
      currentMs - authorizedMs > maxAuthorizationAgeMs ||
      expiresMs <= currentMs ||
      expiresMs - authorizedMs > maxAuthorizationAgeMs
    ) {
      throw new VendureRegistrationExecutionAuthorizationError(
        "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_NOT_CURRENT",
      );
    }
    if (
      aal2Ms > authorizedMs ||
      authorizedMs - aal2Ms > maxHumanAal2AgeMs
    ) {
      throw new VendureRegistrationExecutionAuthorizationError(
        "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_AAL2_STALE",
      );
    }

    const consumedAt = current.toISOString();
    const consumption = await config.authorizationRepository.consumeAuthorization({
      authorizationId: authorization.authorizationId,
      tenantId,
      schedulerId,
      vendureEndpointSha256: endpointSha256,
      approvalReceiptSha256: authorization.approvalReceiptSha256,
      humanAal2ReceiptSha256: authorization.humanAal2ReceiptSha256,
      consumedAt,
    });
    if (consumption === "NOT_FOUND") {
      throw new VendureRegistrationExecutionAuthorizationError(
        "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_NOT_FOUND",
      );
    }
    if (consumption === "ALREADY_CONSUMED") {
      throw new VendureRegistrationExecutionAuthorizationError(
        "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_ALREADY_CONSUMED",
      );
    }
    if (consumption === "SCOPE_MISMATCH") {
      throw new VendureRegistrationExecutionAuthorizationError(
        "VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_SCOPE_MISMATCH",
      );
    }

    const result = await config.runtime.runScheduledTick();
    return Object.freeze({
      authorizationId: authorization.authorizationId,
      approvalReceiptSha256: authorization.approvalReceiptSha256,
      humanAal2ReceiptSha256: authorization.humanAal2ReceiptSha256,
      consumedAt,
      result,
    });
  }

  return Object.freeze({
    authorizationVersion: VENDURE_REGISTRATION_EXECUTION_AUTHORIZATION_VERSION,
    action: VENDURE_REGISTRATION_EXECUTION_ACTION,
    endpointSha256,
    runAuthorizedScheduledTick,
    ownsSchedulerProcess: false as const,
    performsProviderCreateReplay: false as const,
  });
}
