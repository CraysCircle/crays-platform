import "server-only";

import type { ClaimedStripeCustomerCreateCommand } from "./stripe-customer-create-command-worker";

export type StripeCustomerProviderExecutionAuthorization = Readonly<{
  authorizationId: string;
  authorizationSha256: string;
  authorizationStatus: "CONSUMED_SINGLE_USE";
  action: "STRIPE_CUSTOMER_CREATE_PROVIDER_EXECUTION";
  tenantId: string;
  stripeAccountScopeSha256: string;
  commandId: string;
  commandSha256: string;
  leaseId: string;
  leaseVersion: number;
  approvalReceiptSha256: string;
  humanAal2ReceiptSha256: string;
  authorizationConsumptionReceiptId: string;
  authorizationConsumptionReceiptSha256: string;
  consumedAt: string;
  notBefore: string;
  expiresAt: string;
}>;

export type StripeProviderBindingReceipt = Readonly<{
  provider: "STRIPE";
  operation: "CUSTOMER_CREATE";
  endpointBindingId: string;
  endpointBindingSha256: string;
  credentialBindingId: string;
  credentialBindingSha256: string;
  bindingReceiptId: string;
  bindingReceiptSha256: string;
  verifiedForLiveExecution: true;
  containsEndpointValue: false;
  containsCredentialValue: false;
}>;

export type SecureStripeCustomerPayloadReceipt = Readonly<{
  payloadHandle: string;
  payloadSha256: string;
  payloadReceiptId: string;
  payloadReceiptSha256: string;
  customerSubjectReferenceSha256: string;
  stripeAccountScopeSha256: string;
  assembledByTrustedService: true;
  rawPiiPresentInReceipt: false;
  providerCredentialsPresentInReceipt: false;
}>;

export type StripeCustomerProviderAdapterPreflight = Readonly<{
  contractVersion: 1;
  action: "STRIPE_CUSTOMER_CREATE_PROVIDER_EXECUTION";
  state: "READY_FOR_SEPARATELY_AUTHORIZED_PROVIDER_ADAPTER_EXECUTION";
  tenantId: string;
  commandId: string;
  commandSha256: string;
  leaseOwner: string;
  leaseId: string;
  leaseVersion: number;
  attemptNumber: number;
  stripeAccountScopeSha256: string;
  customerSubjectReferenceSha256: string;
  idempotencyKeySha256: string;
  authorizationId: string;
  authorizationSha256: string;
  authorizationConsumptionReceiptId: string;
  authorizationConsumptionReceiptSha256: string;
  endpointBindingId: string;
  endpointBindingSha256: string;
  credentialBindingId: string;
  credentialBindingSha256: string;
  bindingReceiptId: string;
  bindingReceiptSha256: string;
  payloadHandle: string;
  payloadSha256: string;
  payloadReceiptId: string;
  payloadReceiptSha256: string;
  preparedAt: string;
  containsRawPii: false;
  containsEndpointValue: false;
  containsCredentialValue: false;
  stripeApiCalledByPreflight: false;
  databaseMutatedByPreflight: false;
  requiresSeparateProviderAdapterInvocation: true;
}>;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,255}$/;
const SHA256 = /^[a-f0-9]{64}$/;
function id(value: string, field: string): void { if (!ID.test(value)) throw new Error(`CCLUB_STRIPE_PROVIDER_PREFLIGHT_${field}_INVALID`); }
function hash(value: string, field: string): void { if (!SHA256.test(value)) throw new Error(`CCLUB_STRIPE_PROVIDER_PREFLIGHT_${field}_INVALID`); }
function time(value: string, field: string): number { const parsed = Date.parse(value); if (!Number.isFinite(parsed)) throw new Error(`CCLUB_STRIPE_PROVIDER_PREFLIGHT_${field}_INVALID`); return parsed; }
function exact(actual: string | number, expected: string | number, field: string): void { if (actual !== expected) throw new Error(`CCLUB_STRIPE_PROVIDER_PREFLIGHT_${field}_MISMATCH`); }

export function prepareStripeCustomerProviderAdapterPreflight(input: Readonly<{
  tenantId: string;
  claimedCommand: ClaimedStripeCustomerCreateCommand;
  authorization: StripeCustomerProviderExecutionAuthorization;
  binding: StripeProviderBindingReceipt;
  payload: SecureStripeCustomerPayloadReceipt;
  preparedAt: string;
}>): StripeCustomerProviderAdapterPreflight {
  const { claimedCommand: claim, authorization, binding, payload } = input;
  id(input.tenantId, "TENANT_ID"); id(claim.commandId, "COMMAND_ID"); id(claim.leaseOwner, "LEASE_OWNER"); id(claim.leaseId, "LEASE_ID");
  [claim.commandSha256, claim.stripeAccountScopeSha256, claim.customerSubjectReferenceSha256, claim.idempotencyKeySha256].forEach((value, index) => hash(value, `CLAIM_HASH_${index}`));
  if (authorization.action !== "STRIPE_CUSTOMER_CREATE_PROVIDER_EXECUTION" || authorization.authorizationStatus !== "CONSUMED_SINGLE_USE") throw new Error("CCLUB_STRIPE_PROVIDER_PREFLIGHT_SINGLE_USE_AUTHORIZATION_REQUIRED");
  id(authorization.authorizationId, "AUTHORIZATION_ID"); id(authorization.authorizationConsumptionReceiptId, "AUTHORIZATION_CONSUMPTION_RECEIPT_ID");
  [authorization.authorizationSha256, authorization.approvalReceiptSha256, authorization.humanAal2ReceiptSha256, authorization.authorizationConsumptionReceiptSha256].forEach((value, index) => hash(value, `AUTHORIZATION_HASH_${index}`));
  exact(authorization.tenantId, input.tenantId, "AUTHORIZATION_TENANT_ID"); exact(authorization.commandId, claim.commandId, "AUTHORIZATION_COMMAND_ID"); exact(authorization.commandSha256, claim.commandSha256, "AUTHORIZATION_COMMAND_SHA256"); exact(authorization.stripeAccountScopeSha256, claim.stripeAccountScopeSha256, "AUTHORIZATION_ACCOUNT_SCOPE"); exact(authorization.leaseId, claim.leaseId, "AUTHORIZATION_LEASE_ID"); exact(authorization.leaseVersion, claim.leaseVersion, "AUTHORIZATION_LEASE_VERSION");
  const consumedAt = time(authorization.consumedAt, "AUTHORIZATION_CONSUMED_AT"); const notBefore = time(authorization.notBefore, "AUTHORIZATION_NOT_BEFORE"); const expiresAt = time(authorization.expiresAt, "AUTHORIZATION_EXPIRES_AT"); const preparedAt = time(input.preparedAt, "PREPARED_AT"); const leaseExpiresAt = time(claim.leaseExpiresAt, "LEASE_EXPIRES_AT");
  if (consumedAt > notBefore || notBefore > preparedAt || preparedAt >= expiresAt) throw new Error("CCLUB_STRIPE_PROVIDER_PREFLIGHT_AUTHORIZATION_WINDOW_INVALID");
  if (preparedAt >= leaseExpiresAt) throw new Error("CCLUB_STRIPE_PROVIDER_PREFLIGHT_LEASE_EXPIRED");
  if (binding.provider !== "STRIPE" || binding.operation !== "CUSTOMER_CREATE" || binding.verifiedForLiveExecution !== true) throw new Error("CCLUB_STRIPE_PROVIDER_PREFLIGHT_BINDING_NOT_VERIFIED");
  if (binding.containsEndpointValue !== false || binding.containsCredentialValue !== false) throw new Error("CCLUB_STRIPE_PROVIDER_PREFLIGHT_RAW_BINDING_VALUE_FORBIDDEN");
  [binding.endpointBindingId, binding.credentialBindingId, binding.bindingReceiptId].forEach((value, index) => id(value, `BINDING_ID_${index}`)); [binding.endpointBindingSha256, binding.credentialBindingSha256, binding.bindingReceiptSha256].forEach((value, index) => hash(value, `BINDING_HASH_${index}`));
  if (payload.assembledByTrustedService !== true) throw new Error("CCLUB_STRIPE_PROVIDER_PREFLIGHT_TRUSTED_PAYLOAD_ASSEMBLY_REQUIRED");
  if (payload.rawPiiPresentInReceipt !== false || payload.providerCredentialsPresentInReceipt !== false) throw new Error("CCLUB_STRIPE_PROVIDER_PREFLIGHT_SENSITIVE_PAYLOAD_RECEIPT_FORBIDDEN");
  id(payload.payloadHandle, "PAYLOAD_HANDLE"); id(payload.payloadReceiptId, "PAYLOAD_RECEIPT_ID"); hash(payload.payloadSha256, "PAYLOAD_SHA256"); hash(payload.payloadReceiptSha256, "PAYLOAD_RECEIPT_SHA256"); hash(payload.customerSubjectReferenceSha256, "PAYLOAD_SUBJECT_SHA256"); hash(payload.stripeAccountScopeSha256, "PAYLOAD_ACCOUNT_SCOPE_SHA256");
  exact(payload.customerSubjectReferenceSha256, claim.customerSubjectReferenceSha256, "PAYLOAD_SUBJECT_SHA256"); exact(payload.stripeAccountScopeSha256, claim.stripeAccountScopeSha256, "PAYLOAD_ACCOUNT_SCOPE_SHA256");
  return Object.freeze({ contractVersion: 1, action: "STRIPE_CUSTOMER_CREATE_PROVIDER_EXECUTION", state: "READY_FOR_SEPARATELY_AUTHORIZED_PROVIDER_ADAPTER_EXECUTION", tenantId: input.tenantId, commandId: claim.commandId, commandSha256: claim.commandSha256, leaseOwner: claim.leaseOwner, leaseId: claim.leaseId, leaseVersion: claim.leaseVersion, attemptNumber: claim.attemptCount, stripeAccountScopeSha256: claim.stripeAccountScopeSha256, customerSubjectReferenceSha256: claim.customerSubjectReferenceSha256, idempotencyKeySha256: claim.idempotencyKeySha256, authorizationId: authorization.authorizationId, authorizationSha256: authorization.authorizationSha256, authorizationConsumptionReceiptId: authorization.authorizationConsumptionReceiptId, authorizationConsumptionReceiptSha256: authorization.authorizationConsumptionReceiptSha256, endpointBindingId: binding.endpointBindingId, endpointBindingSha256: binding.endpointBindingSha256, credentialBindingId: binding.credentialBindingId, credentialBindingSha256: binding.credentialBindingSha256, bindingReceiptId: binding.bindingReceiptId, bindingReceiptSha256: binding.bindingReceiptSha256, payloadHandle: payload.payloadHandle, payloadSha256: payload.payloadSha256, payloadReceiptId: payload.payloadReceiptId, payloadReceiptSha256: payload.payloadReceiptSha256, preparedAt: input.preparedAt, containsRawPii: false, containsEndpointValue: false, containsCredentialValue: false, stripeApiCalledByPreflight: false, databaseMutatedByPreflight: false, requiresSeparateProviderAdapterInvocation: true });
}
