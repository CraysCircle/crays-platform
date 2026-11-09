import "server-only";

import type { ClaimedStripeCustomerCreateCommand } from "./stripe-customer-create-command-worker";

export type StripeCustomerProviderOutcome = "CREATED" | "ALREADY_EXISTS";

export type VerifiedStripeCustomerProviderResult = Readonly<{
  provider: "STRIPE";
  operation: "CUSTOMER_CREATE";
  outcome: StripeCustomerProviderOutcome;
  tenantId: string;
  commandId: string;
  commandSha256: string;
  stripeAccountScopeSha256: string;
  customerSubjectReferenceSha256: string;
  idempotencyKeySha256: string;
  leaseOwner: string;
  leaseId: string;
  leaseVersion: number;
  attemptNumber: number;
  providerAdapterId: string;
  providerReceiptVerificationVersion: 1;
  providerReceiptVerifiedByTrustedAdapter: true;
  providerReceiptId: string;
  providerReceiptSha256: string;
  providerRequestId: string;
  stripeCustomerId: string;
  requestSha256: string;
  responseSha256: string;
  requestDispatchedAt: string;
  completedAt: string;
  containsPii: false;
  containsProviderCredentials: false;
}>;

export type StripeCustomerProviderResultFinalizationEnvelope = Readonly<{
  contractVersion: 1;
  action: "PERSIST_STRIPE_CUSTOMER_PROVIDER_RESULT";
  mode: "RECEIPT_MAPPING_AND_COMMAND_FINALIZATION";
  tenantId: string;
  commandId: string;
  commandSha256: string;
  stripeAccountScopeSha256: string;
  customerSubjectReferenceSha256: string;
  idempotencyKeySha256: string;
  leaseOwner: string;
  leaseId: string;
  leaseVersion: number;
  attemptNumber: number;
  providerAdapterId: string;
  providerOutcome: StripeCustomerProviderOutcome;
  providerReceiptId: string;
  providerReceiptSha256: string;
  providerRequestId: string;
  stripeCustomerId: string;
  requestSha256: string;
  responseSha256: string;
  requestDispatchedAt: string;
  completedAt: string;
  preparedAt: string;
  containsPii: false;
  containsProviderCredentials: false;
  providerApiCalledByThisEnvelope: false;
  databaseMutatedByThisEnvelope: false;
  readyForIdempotentPersistence: true;
  requiresSeparateRepositoryPersistence: true;
}>;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,255}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const STRIPE_CUSTOMER_ID = /^cus_[A-Za-z0-9]{8,255}$/;
const STRIPE_REQUEST_ID = /^req_[A-Za-z0-9]{8,255}$/;

function assertId(value: string, field: string): void {
  if (!ID.test(value)) throw new Error(`CCLUB_STRIPE_CUSTOMER_PROVIDER_RESULT_${field}_INVALID`);
}

function assertSha(value: string, field: string): void {
  if (!SHA256.test(value)) throw new Error(`CCLUB_STRIPE_CUSTOMER_PROVIDER_RESULT_${field}_INVALID`);
}

function instant(value: string, field: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`CCLUB_STRIPE_CUSTOMER_PROVIDER_RESULT_${field}_INVALID`);
  return parsed;
}

function assertEqual(actual: string | number, expected: string | number, field: string): void {
  if (actual !== expected) throw new Error(`CCLUB_STRIPE_CUSTOMER_PROVIDER_RESULT_${field}_MISMATCH`);
}

export function prepareStripeCustomerProviderResultFinalization(input: Readonly<{
  claimedCommand: ClaimedStripeCustomerCreateCommand;
  verifiedResult: VerifiedStripeCustomerProviderResult;
  preparedAt: string;
}>): StripeCustomerProviderResultFinalizationEnvelope {
  const { claimedCommand: claim, verifiedResult: result } = input;
  if (result.provider !== "STRIPE" || result.operation !== "CUSTOMER_CREATE") {
    throw new Error("CCLUB_STRIPE_CUSTOMER_PROVIDER_RESULT_PROVIDER_OPERATION_INVALID");
  }
  if (result.outcome !== "CREATED" && result.outcome !== "ALREADY_EXISTS") {
    throw new Error("CCLUB_STRIPE_CUSTOMER_PROVIDER_RESULT_OUTCOME_INVALID");
  }
  assertId(result.tenantId, "TENANT_ID");
  assertId(result.commandId, "COMMAND_ID");
  assertId(result.leaseOwner, "LEASE_OWNER");
  assertId(result.leaseId, "LEASE_ID");
  if (!Number.isInteger(result.attemptNumber) || result.attemptNumber < 1) throw new Error("CCLUB_STRIPE_CUSTOMER_PROVIDER_RESULT_ATTEMPT_NUMBER_INVALID");
  assertId(result.providerAdapterId, "PROVIDER_ADAPTER_ID");
  assertId(result.providerReceiptId, "PROVIDER_RECEIPT_ID");
  assertSha(result.commandSha256, "COMMAND_SHA256");
  assertSha(result.stripeAccountScopeSha256, "STRIPE_ACCOUNT_SCOPE_SHA256");
  assertSha(result.customerSubjectReferenceSha256, "CUSTOMER_SUBJECT_REFERENCE_SHA256");
  assertSha(result.idempotencyKeySha256, "IDEMPOTENCY_KEY_SHA256");
  assertSha(result.providerReceiptSha256, "PROVIDER_RECEIPT_SHA256");
  assertSha(result.requestSha256, "REQUEST_SHA256");
  assertSha(result.responseSha256, "RESPONSE_SHA256");
  if (!STRIPE_REQUEST_ID.test(result.providerRequestId)) throw new Error("CCLUB_STRIPE_CUSTOMER_PROVIDER_RESULT_PROVIDER_REQUEST_ID_INVALID");
  if (!STRIPE_CUSTOMER_ID.test(result.stripeCustomerId)) throw new Error("CCLUB_STRIPE_CUSTOMER_PROVIDER_RESULT_STRIPE_CUSTOMER_ID_INVALID");
  if (result.providerReceiptVerificationVersion !== 1 || result.providerReceiptVerifiedByTrustedAdapter !== true) {
    throw new Error("CCLUB_STRIPE_CUSTOMER_PROVIDER_RESULT_TRUSTED_ADAPTER_VERIFICATION_REQUIRED");
  }
  if (result.containsPii !== false || result.containsProviderCredentials !== false) {
    throw new Error("CCLUB_STRIPE_CUSTOMER_PROVIDER_RESULT_SENSITIVE_DATA_FORBIDDEN");
  }
  assertEqual(result.commandId, claim.commandId, "COMMAND_ID");
  assertEqual(result.commandSha256, claim.commandSha256, "COMMAND_SHA256");
  assertEqual(result.stripeAccountScopeSha256, claim.stripeAccountScopeSha256, "STRIPE_ACCOUNT_SCOPE_SHA256");
  assertEqual(result.customerSubjectReferenceSha256, claim.customerSubjectReferenceSha256, "CUSTOMER_SUBJECT_REFERENCE_SHA256");
  assertEqual(result.idempotencyKeySha256, claim.idempotencyKeySha256, "IDEMPOTENCY_KEY_SHA256");
  assertEqual(result.leaseOwner, claim.leaseOwner, "LEASE_OWNER");
  assertEqual(result.leaseId, claim.leaseId, "LEASE_ID");
  assertEqual(result.leaseVersion, claim.leaseVersion, "LEASE_VERSION");
  assertEqual(result.attemptNumber, claim.attemptCount, "ATTEMPT_NUMBER");
  const dispatchedAt = instant(result.requestDispatchedAt, "REQUEST_DISPATCHED_AT");
  const completedAt = instant(result.completedAt, "COMPLETED_AT");
  const preparedAt = instant(input.preparedAt, "PREPARED_AT");
  const leaseExpiresAt = instant(claim.leaseExpiresAt, "LEASE_EXPIRES_AT");
  if (dispatchedAt > completedAt || completedAt > preparedAt) {
    throw new Error("CCLUB_STRIPE_CUSTOMER_PROVIDER_RESULT_EVENT_ORDER_INVALID");
  }
  if (preparedAt >= leaseExpiresAt) {
    throw new Error("CCLUB_STRIPE_CUSTOMER_PROVIDER_RESULT_LEASE_EXPIRED");
  }
  return Object.freeze({
    contractVersion: 1,
    action: "PERSIST_STRIPE_CUSTOMER_PROVIDER_RESULT",
    mode: "RECEIPT_MAPPING_AND_COMMAND_FINALIZATION",
    tenantId: result.tenantId,
    commandId: result.commandId,
    commandSha256: result.commandSha256,
    stripeAccountScopeSha256: result.stripeAccountScopeSha256,
    customerSubjectReferenceSha256: result.customerSubjectReferenceSha256,
    idempotencyKeySha256: result.idempotencyKeySha256,
    leaseOwner: result.leaseOwner,
    leaseId: result.leaseId,
    leaseVersion: result.leaseVersion,
    attemptNumber: result.attemptNumber,
    providerAdapterId: result.providerAdapterId,
    providerOutcome: result.outcome,
    providerReceiptId: result.providerReceiptId,
    providerReceiptSha256: result.providerReceiptSha256,
    providerRequestId: result.providerRequestId,
    stripeCustomerId: result.stripeCustomerId,
    requestSha256: result.requestSha256,
    responseSha256: result.responseSha256,
    requestDispatchedAt: result.requestDispatchedAt,
    completedAt: result.completedAt,
    preparedAt: input.preparedAt,
    containsPii: false,
    containsProviderCredentials: false,
    providerApiCalledByThisEnvelope: false,
    databaseMutatedByThisEnvelope: false,
    readyForIdempotentPersistence: true,
    requiresSeparateRepositoryPersistence: true,
  });
}
