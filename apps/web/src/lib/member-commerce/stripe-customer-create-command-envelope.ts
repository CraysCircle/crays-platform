import "server-only";

import type { StripeCustomerSequenceGateDecision } from "./stripe-customer-vendure-sequence-gate";

export const STRIPE_CUSTOMER_CREATE_COMMAND_CONTRACT_VERSION = 1 as const;
export const STRIPE_CUSTOMER_CREATE_COMMAND_ACTION = "STRIPE_CUSTOMER_CREATE" as const;
export const STRIPE_CUSTOMER_CREATE_COMMAND_MODE = "CREATE_IF_ABSENT" as const;
export const STRIPE_CUSTOMER_CREATE_COMMAND_MAX_HANDOFF_AGE_MS = 60 * 1000;
export const STRIPE_CUSTOMER_CREATE_COMMAND_MAX_TTL_MS = 2 * 60 * 1000;
export const STRIPE_CUSTOMER_CREATE_COMMAND_MAX_CLOCK_SKEW_MS = 30 * 1000;

export type StripeCustomerCreateCommandErrorCode =
  | "MALFORMED_COMMAND"
  | "INVALID_HASH"
  | "SEQUENCE_GATE_NOT_ELIGIBLE"
  | "SEQUENCE_GATE_SCOPE_MISMATCH"
  | "SEQUENCE_GATE_RECEIPT_MISMATCH"
  | "AUTHORIZATION_NOT_CONSUMED"
  | "AUTHORIZATION_SCOPE_MISMATCH"
  | "AUTHORIZATION_LINEAGE_MISSING"
  | "AUTHORIZATION_CONSUMPTION_RECEIPT_MISMATCH"
  | "AUTHORIZATION_HANDOFF_STALE"
  | "COMMAND_WINDOW_INVALID";

export class StripeCustomerCreateCommandError extends Error {
  constructor(
    readonly code: StripeCustomerCreateCommandErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "StripeCustomerCreateCommandError";
  }
}

export interface StripeCustomerSequenceGateReceipt {
  receiptId: string;
  receiptSha256: string;
  gateVersion: number;
  tenantId: string;
  stripeAccountScopeSha256: string;
  customerSubjectReferenceHash: string;
  idempotencyKeySha256: string;
  vendureRunReceiptId: string;
  leaseRecoveryReceiptId: string;
  stripeAbsenceReceiptId: string;
  evaluatedAt: string;
  expiresAt: string;
}

export interface ConsumedStripeCustomerCreateAuthorization {
  authorizationId: string;
  authorizationSha256: string;
  action: typeof STRIPE_CUSTOMER_CREATE_COMMAND_ACTION;
  state: string;
  tenantId: string;
  stripeAccountScopeSha256: string;
  customerSubjectReferenceHash: string;
  idempotencyKeySha256: string;
  sequenceGateReceiptId: string;
  sequenceGateReceiptSha256: string;
  approvalReceiptSha256: string;
  humanAal2ReceiptSha256: string;
  authorizedAt: string;
  expiresAt: string;
  consumedAt: string;
  consumptionSha256: string;
}

export interface StripeCustomerCreateAuthorizationConsumptionReceipt {
  receiptId: string;
  receiptSha256: string;
  authorizationId: string;
  authorizationSha256: string;
  tenantId: string;
  stripeAccountScopeSha256: string;
  customerSubjectReferenceHash: string;
  idempotencyKeySha256: string;
  sequenceGateReceiptId: string;
  sequenceGateReceiptSha256: string;
  consumedAt: string;
  consumptionSha256: string;
}

export interface PrepareStripeCustomerCreateCommandInput {
  commandId: string;
  commandSha256: string;
  tenantId: string;
  stripeAccountScopeSha256: string;
  customerSubjectReferenceHash: string;
  idempotencyKeySha256: string;
  correlationId: string;
  notBefore: string;
  expiresAt: string;
  sequenceGateDecision: StripeCustomerSequenceGateDecision;
  sequenceGateReceipt: StripeCustomerSequenceGateReceipt;
  authorization: ConsumedStripeCustomerCreateAuthorization;
  authorizationConsumptionReceipt: StripeCustomerCreateAuthorizationConsumptionReceipt;
}

export interface PreparedStripeCustomerCreateCommand {
  contractVersion: typeof STRIPE_CUSTOMER_CREATE_COMMAND_CONTRACT_VERSION;
  action: typeof STRIPE_CUSTOMER_CREATE_COMMAND_ACTION;
  mode: typeof STRIPE_CUSTOMER_CREATE_COMMAND_MODE;
  commandId: string;
  commandSha256: string;
  tenantId: string;
  stripeAccountScopeSha256: string;
  customerSubjectReferenceHash: string;
  idempotencyKeySha256: string;
  correlationId: string;
  sequenceGateReceiptId: string;
  sequenceGateReceiptSha256: string;
  vendureRunReceiptId: string;
  leaseRecoveryReceiptId: string;
  stripeAbsenceReceiptId: string;
  authorizationId: string;
  authorizationSha256: string;
  authorizationConsumptionReceiptId: string;
  authorizationConsumptionReceiptSha256: string;
  approvalReceiptSha256: string;
  humanAal2ReceiptSha256: string;
  consumptionSha256: string;
  consumedAt: string;
  preparedAt: string;
  notBefore: string;
  expiresAt: string;
  containsPii: false;
  containsProviderCredentials: false;
  stripeApiCalled: false;
  stripeCustomerCreated: false;
  startsProcess: false;
  requiresSeparateProviderAdapterExecution: true;
}

const HASH = /^[0-9a-f]{64}$/;
const text = (value: string) => typeof value === "string" && value.trim() !== "";
const date = (value: string) => {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};
const fail = (code: StripeCustomerCreateCommandErrorCode, message: string): never => {
  throw new StripeCustomerCreateCommandError(code, message);
};

export function prepareStripeCustomerCreateCommand(
  input: PrepareStripeCustomerCreateCommandInput,
  observedAt: Date = new Date(),
): Readonly<PreparedStripeCustomerCreateCommand> {
  const nowMs = observedAt.getTime();
  if (
    !Number.isFinite(nowMs) ||
    !text(input.commandId) ||
    !text(input.tenantId) ||
    !text(input.correlationId)
  ) {
    fail("MALFORMED_COMMAND", "command identity and scope are required");
  }
  const requiredHashes = [
    input.commandSha256,
    input.stripeAccountScopeSha256,
    input.customerSubjectReferenceHash,
    input.idempotencyKeySha256,
  ];
  if (requiredHashes.some((value) => !HASH.test(value))) {
    fail("INVALID_HASH", "command scope hashes must be lowercase SHA-256");
  }

  const gate = input.sequenceGateDecision;
  if (
    gate.eligible !== true ||
    gate.status !== "ELIGIBLE_FOR_SEPARATELY_AUTHORIZED_CREATE" ||
    gate.blockReasons.length !== 0 ||
    gate.stripeApiCalled !== false ||
    gate.stripeCustomerCreated !== false ||
    gate.externalMutationAuthorized !== false
  ) {
    fail("SEQUENCE_GATE_NOT_ELIGIBLE", "sequence gate is not eligible for separately authorized create");
  }
  if (
    gate.tenantId !== input.tenantId ||
    gate.stripeAccountScopeSha256 !== input.stripeAccountScopeSha256 ||
    gate.customerSubjectReferenceHash !== input.customerSubjectReferenceHash ||
    gate.idempotencyKeySha256 !== input.idempotencyKeySha256
  ) {
    fail("SEQUENCE_GATE_SCOPE_MISMATCH", "sequence gate scope does not match command scope");
  }

  const gateReceipt = input.sequenceGateReceipt;
  if (!text(gateReceipt.receiptId) || !HASH.test(gateReceipt.receiptSha256)) {
    fail("SEQUENCE_GATE_RECEIPT_MISMATCH", "persisted sequence gate receipt is required");
  }
  if (
    gateReceipt.gateVersion !== gate.gateVersion ||
    gateReceipt.tenantId !== input.tenantId ||
    gateReceipt.stripeAccountScopeSha256 !== input.stripeAccountScopeSha256 ||
    gateReceipt.customerSubjectReferenceHash !== input.customerSubjectReferenceHash ||
    gateReceipt.idempotencyKeySha256 !== input.idempotencyKeySha256 ||
    gateReceipt.vendureRunReceiptId !== gate.vendureRunReceiptId ||
    gateReceipt.leaseRecoveryReceiptId !== gate.leaseRecoveryReceiptId ||
    gateReceipt.stripeAbsenceReceiptId !== gate.stripeAbsenceReceiptId ||
    gateReceipt.evaluatedAt !== gate.evaluatedAt ||
    gateReceipt.expiresAt !== gate.expiresAt
  ) {
    fail("SEQUENCE_GATE_RECEIPT_MISMATCH", "sequence gate receipt does not match the exact decision");
  }

  const authorization = input.authorization;
  if (
    authorization.action !== STRIPE_CUSTOMER_CREATE_COMMAND_ACTION ||
    authorization.state !== "consumed"
  ) {
    fail("AUTHORIZATION_NOT_CONSUMED", "Stripe Customer create authorization must already be consumed");
  }
  const authorizationHashes = [
    authorization.authorizationSha256,
    authorization.approvalReceiptSha256,
    authorization.humanAal2ReceiptSha256,
    authorization.consumptionSha256,
  ];
  if (!text(authorization.authorizationId) || authorizationHashes.some((value) => !HASH.test(value))) {
    fail("AUTHORIZATION_LINEAGE_MISSING", "authorization approval, AAL2 and consumption lineage are required");
  }
  if (
    authorization.tenantId !== input.tenantId ||
    authorization.stripeAccountScopeSha256 !== input.stripeAccountScopeSha256 ||
    authorization.customerSubjectReferenceHash !== input.customerSubjectReferenceHash ||
    authorization.idempotencyKeySha256 !== input.idempotencyKeySha256 ||
    authorization.sequenceGateReceiptId !== gateReceipt.receiptId ||
    authorization.sequenceGateReceiptSha256 !== gateReceipt.receiptSha256
  ) {
    fail("AUTHORIZATION_SCOPE_MISMATCH", "authorization scope does not match the command and gate receipt");
  }

  const consumption = input.authorizationConsumptionReceipt;
  if (!text(consumption.receiptId) || !HASH.test(consumption.receiptSha256)) {
    fail("AUTHORIZATION_CONSUMPTION_RECEIPT_MISMATCH", "authorization consumption receipt is required");
  }
  if (
    consumption.authorizationId !== authorization.authorizationId ||
    consumption.authorizationSha256 !== authorization.authorizationSha256 ||
    consumption.tenantId !== input.tenantId ||
    consumption.stripeAccountScopeSha256 !== input.stripeAccountScopeSha256 ||
    consumption.customerSubjectReferenceHash !== input.customerSubjectReferenceHash ||
    consumption.idempotencyKeySha256 !== input.idempotencyKeySha256 ||
    consumption.sequenceGateReceiptId !== gateReceipt.receiptId ||
    consumption.sequenceGateReceiptSha256 !== gateReceipt.receiptSha256 ||
    consumption.consumedAt !== authorization.consumedAt ||
    consumption.consumptionSha256 !== authorization.consumptionSha256
  ) {
    fail("AUTHORIZATION_CONSUMPTION_RECEIPT_MISMATCH", "consumption receipt does not match exact authorization scope");
  }

  const authorizedAt = date(authorization.authorizedAt);
  const authorizationExpiresAt = date(authorization.expiresAt);
  const consumedAt = date(authorization.consumedAt);
  if (
    !authorizedAt ||
    !authorizationExpiresAt ||
    !consumedAt ||
    authorizedAt.getTime() > consumedAt.getTime() ||
    consumedAt.getTime() > nowMs + STRIPE_CUSTOMER_CREATE_COMMAND_MAX_CLOCK_SKEW_MS ||
    nowMs - consumedAt.getTime() > STRIPE_CUSTOMER_CREATE_COMMAND_MAX_HANDOFF_AGE_MS
  ) {
    return fail("AUTHORIZATION_HANDOFF_STALE", "authorization consumption handoff is stale or invalid");
  }

  const notBefore = date(input.notBefore);
  const expiresAt = date(input.expiresAt);
  const gateExpiresAt = date(gate.expiresAt);
  if (
    !notBefore ||
    !expiresAt ||
    !gateExpiresAt ||
    authorizationExpiresAt.getTime() <= nowMs ||
    gateExpiresAt.getTime() <= nowMs ||
    notBefore.getTime() < consumedAt.getTime() ||
    notBefore.getTime() > nowMs + STRIPE_CUSTOMER_CREATE_COMMAND_MAX_CLOCK_SKEW_MS ||
    expiresAt.getTime() <= nowMs ||
    expiresAt.getTime() <= notBefore.getTime() ||
    expiresAt.getTime() > authorizationExpiresAt.getTime() ||
    expiresAt.getTime() > gateExpiresAt.getTime() ||
    expiresAt.getTime() - nowMs > STRIPE_CUSTOMER_CREATE_COMMAND_MAX_TTL_MS
  ) {
    fail("COMMAND_WINDOW_INVALID", "command window must fit active gate and authorization windows");
  }

  return Object.freeze({
    contractVersion: STRIPE_CUSTOMER_CREATE_COMMAND_CONTRACT_VERSION,
    action: STRIPE_CUSTOMER_CREATE_COMMAND_ACTION,
    mode: STRIPE_CUSTOMER_CREATE_COMMAND_MODE,
    commandId: input.commandId,
    commandSha256: input.commandSha256,
    tenantId: input.tenantId,
    stripeAccountScopeSha256: input.stripeAccountScopeSha256,
    customerSubjectReferenceHash: input.customerSubjectReferenceHash,
    idempotencyKeySha256: input.idempotencyKeySha256,
    correlationId: input.correlationId,
    sequenceGateReceiptId: gateReceipt.receiptId,
    sequenceGateReceiptSha256: gateReceipt.receiptSha256,
    vendureRunReceiptId: gate.vendureRunReceiptId,
    leaseRecoveryReceiptId: gate.leaseRecoveryReceiptId,
    stripeAbsenceReceiptId: gate.stripeAbsenceReceiptId,
    authorizationId: authorization.authorizationId,
    authorizationSha256: authorization.authorizationSha256,
    authorizationConsumptionReceiptId: consumption.receiptId,
    authorizationConsumptionReceiptSha256: consumption.receiptSha256,
    approvalReceiptSha256: authorization.approvalReceiptSha256,
    humanAal2ReceiptSha256: authorization.humanAal2ReceiptSha256,
    consumptionSha256: authorization.consumptionSha256,
    consumedAt: authorization.consumedAt,
    preparedAt: observedAt.toISOString(),
    notBefore: input.notBefore,
    expiresAt: input.expiresAt,
    containsPii: false,
    containsProviderCredentials: false,
    stripeApiCalled: false,
    stripeCustomerCreated: false,
    startsProcess: false,
    requiresSeparateProviderAdapterExecution: true,
  });
}
