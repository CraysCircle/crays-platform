import "server-only";

import type { StripeCustomerProviderAdapterPreflight } from "./stripe-customer-provider-adapter-preflight";
import type { VerifiedStripeCustomerProviderResult } from "./stripe-customer-provider-result-finalization-envelope";

export type RawStripeCustomerAdapterResult = Readonly<{
  kind: "CUSTOMER_CREATED" | "CUSTOMER_ALREADY_EXISTS" | "RETRYABLE_ERROR" | "TERMINAL_ERROR";
  providerAdapterId: string;
  providerReceiptId: string;
  providerReceiptSha256: string;
  providerRequestId: string;
  requestSha256: string;
  responseSha256: string;
  bindingReceiptSha256: string;
  payloadSha256: string;
  requestDispatchedAt: string;
  completedAt: string;
  providerReceiptVerifiedByTrustedAdapter: true;
  stripeCustomerId?: string;
  errorCode?: "RATE_LIMITED" | "PROVIDER_UNAVAILABLE" | "TIMEOUT" | "INVALID_REQUEST" | "AUTHENTICATION_FAILED" | "ACCOUNT_SCOPE_REJECTED";
  retryAt?: string;
  containsPii: false;
  containsProviderCredentials: false;
}>;

export type NormalizedStripeCustomerAdapterResult =
  | Readonly<{ kind: "ACCEPTED"; verifiedResult: VerifiedStripeCustomerProviderResult }>
  | Readonly<{ kind: "RETRYABLE_ERROR"; tenantId: string; commandId: string; leaseOwner: string; leaseId: string; leaseVersion: number; attemptNumber: number; providerAdapterId: string; providerRequestId: string; requestSha256: string; requestDispatchedAt: string; completedAt: string; retryAt: string; errorCode: "RATE_LIMITED" | "PROVIDER_UNAVAILABLE" | "TIMEOUT"; providerReceiptId: string; providerReceiptSha256: string; responseSha256: string }>
  | Readonly<{ kind: "TERMINAL_ERROR"; tenantId: string; commandId: string; leaseOwner: string; leaseId: string; leaseVersion: number; attemptNumber: number; providerAdapterId: string; providerRequestId: string; requestSha256: string; requestDispatchedAt: string; completedAt: string; errorCode: "INVALID_REQUEST" | "AUTHENTICATION_FAILED" | "ACCOUNT_SCOPE_REJECTED"; providerReceiptId: string; providerReceiptSha256: string; responseSha256: string }>;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,255}$/; const SHA = /^[a-f0-9]{64}$/; const REQUEST = /^req_[A-Za-z0-9]{8,255}$/; const CUSTOMER = /^cus_[A-Za-z0-9]{8,255}$/;
function id(v: string, f: string) { if (!ID.test(v)) throw new Error(`CCLUB_STRIPE_RESULT_${f}_INVALID`); }
function hash(v: string, f: string) { if (!SHA.test(v)) throw new Error(`CCLUB_STRIPE_RESULT_${f}_INVALID`); }
function when(v: string, f: string) { const n = Date.parse(v); if (!Number.isFinite(n)) throw new Error(`CCLUB_STRIPE_RESULT_${f}_INVALID`); return n; }

export function normalizeStripeCustomerAdapterResult(preflight: StripeCustomerProviderAdapterPreflight, result: RawStripeCustomerAdapterResult): NormalizedStripeCustomerAdapterResult {
  if (preflight.state !== "READY_FOR_SEPARATELY_AUTHORIZED_PROVIDER_ADAPTER_EXECUTION") throw new Error("CCLUB_STRIPE_RESULT_PREFLIGHT_NOT_READY");
  if (result.providerReceiptVerifiedByTrustedAdapter !== true) throw new Error("CCLUB_STRIPE_RESULT_TRUSTED_RECEIPT_REQUIRED");
  if (result.containsPii !== false || result.containsProviderCredentials !== false) throw new Error("CCLUB_STRIPE_RESULT_SENSITIVE_DATA_FORBIDDEN");
  id(result.providerAdapterId, "ADAPTER_ID"); id(result.providerReceiptId, "RECEIPT_ID");
  [result.providerReceiptSha256, result.requestSha256, result.responseSha256, result.bindingReceiptSha256, result.payloadSha256].forEach((v, i) => hash(v, `HASH_${i}`));
  if (!REQUEST.test(result.providerRequestId)) throw new Error("CCLUB_STRIPE_RESULT_REQUEST_ID_INVALID");
  if (result.bindingReceiptSha256 !== preflight.bindingReceiptSha256 || result.payloadSha256 !== preflight.payloadSha256) throw new Error("CCLUB_STRIPE_RESULT_PREFLIGHT_BINDING_MISMATCH");
  const dispatched = when(result.requestDispatchedAt, "DISPATCHED_AT"); const completed = when(result.completedAt, "COMPLETED_AT");
  if (dispatched > completed) throw new Error("CCLUB_STRIPE_RESULT_EVENT_ORDER_INVALID");
  if (result.kind === "CUSTOMER_CREATED" || result.kind === "CUSTOMER_ALREADY_EXISTS") {
    if (!result.stripeCustomerId || !CUSTOMER.test(result.stripeCustomerId)) throw new Error("CCLUB_STRIPE_RESULT_CUSTOMER_ID_REQUIRED");
    if (result.errorCode || result.retryAt) throw new Error("CCLUB_STRIPE_RESULT_SUCCESS_ERROR_FIELDS_FORBIDDEN");
    const verifiedResult: VerifiedStripeCustomerProviderResult = Object.freeze({ provider: "STRIPE", operation: "CUSTOMER_CREATE", outcome: result.kind === "CUSTOMER_CREATED" ? "CREATED" : "ALREADY_EXISTS", tenantId: preflight.tenantId, commandId: preflight.commandId, commandSha256: preflight.commandSha256, stripeAccountScopeSha256: preflight.stripeAccountScopeSha256, customerSubjectReferenceSha256: preflight.customerSubjectReferenceSha256, idempotencyKeySha256: preflight.idempotencyKeySha256, leaseOwner: preflight.leaseOwner, leaseId: preflight.leaseId, leaseVersion: preflight.leaseVersion, attemptNumber: preflight.attemptNumber, providerAdapterId: result.providerAdapterId, providerReceiptVerificationVersion: 1, providerReceiptVerifiedByTrustedAdapter: true, providerReceiptId: result.providerReceiptId, providerReceiptSha256: result.providerReceiptSha256, providerRequestId: result.providerRequestId, stripeCustomerId: result.stripeCustomerId, requestSha256: result.requestSha256, responseSha256: result.responseSha256, requestDispatchedAt: result.requestDispatchedAt, completedAt: result.completedAt, containsPii: false, containsProviderCredentials: false });
    return Object.freeze({ kind: "ACCEPTED", verifiedResult });
  }
  if (result.stripeCustomerId) throw new Error("CCLUB_STRIPE_RESULT_ERROR_CUSTOMER_ID_FORBIDDEN");
  if (result.kind === "RETRYABLE_ERROR") {
    if (result.errorCode !== "RATE_LIMITED" && result.errorCode !== "PROVIDER_UNAVAILABLE" && result.errorCode !== "TIMEOUT") throw new Error("CCLUB_STRIPE_RESULT_RETRYABLE_CODE_INVALID");
    if (!result.retryAt || when(result.retryAt, "RETRY_AT") <= completed) throw new Error("CCLUB_STRIPE_RESULT_RETRY_AT_INVALID");
    return Object.freeze({ kind: "RETRYABLE_ERROR", tenantId: preflight.tenantId, commandId: preflight.commandId, leaseOwner: preflight.leaseOwner, leaseId: preflight.leaseId, leaseVersion: preflight.leaseVersion, attemptNumber: preflight.attemptNumber, providerAdapterId: result.providerAdapterId, providerRequestId: result.providerRequestId, requestSha256: result.requestSha256, requestDispatchedAt: result.requestDispatchedAt, completedAt: result.completedAt, retryAt: result.retryAt, errorCode: result.errorCode, providerReceiptId: result.providerReceiptId, providerReceiptSha256: result.providerReceiptSha256, responseSha256: result.responseSha256 });
  }
  if (result.kind === "TERMINAL_ERROR") {
    if (result.errorCode !== "INVALID_REQUEST" && result.errorCode !== "AUTHENTICATION_FAILED" && result.errorCode !== "ACCOUNT_SCOPE_REJECTED") throw new Error("CCLUB_STRIPE_RESULT_TERMINAL_CODE_INVALID");
    if (result.retryAt) throw new Error("CCLUB_STRIPE_RESULT_TERMINAL_RETRY_FORBIDDEN");
    return Object.freeze({ kind: "TERMINAL_ERROR", tenantId: preflight.tenantId, commandId: preflight.commandId, leaseOwner: preflight.leaseOwner, leaseId: preflight.leaseId, leaseVersion: preflight.leaseVersion, attemptNumber: preflight.attemptNumber, providerAdapterId: result.providerAdapterId, providerRequestId: result.providerRequestId, requestSha256: result.requestSha256, requestDispatchedAt: result.requestDispatchedAt, completedAt: result.completedAt, errorCode: result.errorCode, providerReceiptId: result.providerReceiptId, providerReceiptSha256: result.providerReceiptSha256, responseSha256: result.responseSha256 });
  }
  throw new Error("CCLUB_STRIPE_RESULT_KIND_INVALID");
}
