import "server-only";

import type { BookingRevenueErpDispatchPreflight } from "./booking-revenue-erp-dispatch-preflight";

export type RawBookingRevenueErpAdapterResult = Readonly<{
  kind: "EXPORT_ACCEPTED" | "RETRYABLE_ERROR" | "TERMINAL_ERROR";
  adapterId: string;
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
  externalDocumentReferenceHandle?: string;
  externalDocumentReferenceSha256?: string;
  errorCode?: "RATE_LIMITED" | "PROVIDER_UNAVAILABLE" | "TIMEOUT" | "INVALID_PAYLOAD" | "AUTHENTICATION_FAILED" | "ACCOUNT_SCOPE_REJECTED";
  retryAt?: string;
  containsPii: false;
  containsProviderCredentials: false;
}>;

export type NormalizedBookingRevenueErpResult =
  | Readonly<{ kind: "ACCEPTED"; tenantId: string; eventId: string; eventSha256: string; allocationReceiptId: string; allocationReceiptSha256: string; leaseOwner: string; leaseId: string; leaseVersion: number; attemptNumber: number; adapterId: string; providerReceiptId: string; providerReceiptSha256: string; providerRequestId: string; requestSha256: string; responseSha256: string; externalDocumentReferenceHandle: string; externalDocumentReferenceSha256: string; requestDispatchedAt: string; completedAt: string }>
  | Readonly<{ kind: "RETRYABLE_ERROR"; tenantId: string; eventId: string; eventSha256: string; allocationReceiptId: string; allocationReceiptSha256: string; leaseOwner: string; leaseId: string; leaseVersion: number; attemptNumber: number; adapterId: string; providerReceiptId: string; providerReceiptSha256: string; providerRequestId: string; requestSha256: string; responseSha256: string; errorCode: "RATE_LIMITED" | "PROVIDER_UNAVAILABLE" | "TIMEOUT"; retryAt: string; requestDispatchedAt: string; completedAt: string }>
  | Readonly<{ kind: "TERMINAL_ERROR"; tenantId: string; eventId: string; eventSha256: string; allocationReceiptId: string; allocationReceiptSha256: string; leaseOwner: string; leaseId: string; leaseVersion: number; attemptNumber: number; adapterId: string; providerReceiptId: string; providerReceiptSha256: string; providerRequestId: string; requestSha256: string; responseSha256: string; errorCode: "INVALID_PAYLOAD" | "AUTHENTICATION_FAILED" | "ACCOUNT_SCOPE_REJECTED"; requestDispatchedAt: string; completedAt: string }>;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,255}$/;
const SHA = /^[a-f0-9]{64}$/;
function id(value: string | undefined, field: string): string { if (!value || !ID.test(value)) throw new Error(`CCLUB_ERP_RESULT_${field}_INVALID`); return value; }
function hash(value: string | undefined, field: string): string { if (!value || !SHA.test(value)) throw new Error(`CCLUB_ERP_RESULT_${field}_INVALID`); return value; }
function instant(value: string, field: string): number { const parsed = Date.parse(value); if (!Number.isFinite(parsed)) throw new Error(`CCLUB_ERP_RESULT_${field}_INVALID`); return parsed; }

export function normalizeBookingRevenueErpAdapterResult(preflight: BookingRevenueErpDispatchPreflight, result: RawBookingRevenueErpAdapterResult): NormalizedBookingRevenueErpResult {
  if (preflight.state !== "READY_FOR_SEPARATELY_AUTHORIZED_ERP_ADAPTER_EXECUTION") throw new Error("CCLUB_ERP_RESULT_PREFLIGHT_NOT_READY");
  if (result.providerReceiptVerifiedByTrustedAdapter !== true) throw new Error("CCLUB_ERP_RESULT_TRUSTED_RECEIPT_REQUIRED");
  if (result.containsPii !== false || result.containsProviderCredentials !== false) throw new Error("CCLUB_ERP_RESULT_SENSITIVE_DATA_FORBIDDEN");
  id(result.adapterId, "ADAPTER_ID"); id(result.providerReceiptId, "RECEIPT_ID"); id(result.providerRequestId, "REQUEST_ID");
  hash(result.providerReceiptSha256, "RECEIPT_SHA256"); hash(result.requestSha256, "REQUEST_SHA256"); hash(result.responseSha256, "RESPONSE_SHA256");
  if (hash(result.bindingReceiptSha256, "BINDING_SHA256") !== preflight.bindingReceiptSha256 || hash(result.payloadSha256, "PAYLOAD_SHA256") !== preflight.payloadSha256) throw new Error("CCLUB_ERP_RESULT_PREFLIGHT_BINDING_MISMATCH");
  const dispatched = instant(result.requestDispatchedAt, "DISPATCHED_AT"); const completed = instant(result.completedAt, "COMPLETED_AT");
  if (dispatched > completed) throw new Error("CCLUB_ERP_RESULT_EVENT_ORDER_INVALID");
  const common = { tenantId: preflight.tenantId, eventId: preflight.eventId, eventSha256: preflight.eventSha256, allocationReceiptId: preflight.allocationReceiptId, allocationReceiptSha256: preflight.allocationReceiptSha256, leaseOwner: preflight.leaseOwner, leaseId: preflight.leaseId, leaseVersion: preflight.leaseVersion, attemptNumber: preflight.attemptNumber, adapterId: result.adapterId, providerReceiptId: result.providerReceiptId, providerReceiptSha256: result.providerReceiptSha256, providerRequestId: result.providerRequestId, requestSha256: result.requestSha256, responseSha256: result.responseSha256, requestDispatchedAt: result.requestDispatchedAt, completedAt: result.completedAt } as const;
  if (result.kind === "EXPORT_ACCEPTED") {
    if (result.errorCode || result.retryAt) throw new Error("CCLUB_ERP_RESULT_SUCCESS_ERROR_FIELDS_FORBIDDEN");
    return Object.freeze({ kind: "ACCEPTED", ...common, externalDocumentReferenceHandle: id(result.externalDocumentReferenceHandle, "DOCUMENT_HANDLE"), externalDocumentReferenceSha256: hash(result.externalDocumentReferenceSha256, "DOCUMENT_SHA256") });
  }
  if (result.externalDocumentReferenceHandle || result.externalDocumentReferenceSha256) throw new Error("CCLUB_ERP_RESULT_ERROR_DOCUMENT_REFERENCE_FORBIDDEN");
  if (result.kind === "RETRYABLE_ERROR") {
    if (result.errorCode !== "RATE_LIMITED" && result.errorCode !== "PROVIDER_UNAVAILABLE" && result.errorCode !== "TIMEOUT") throw new Error("CCLUB_ERP_RESULT_RETRYABLE_CODE_INVALID");
    if (!result.retryAt || instant(result.retryAt, "RETRY_AT") <= completed) throw new Error("CCLUB_ERP_RESULT_RETRY_AT_INVALID");
    return Object.freeze({ kind: "RETRYABLE_ERROR", ...common, errorCode: result.errorCode, retryAt: result.retryAt });
  }
  if (result.kind === "TERMINAL_ERROR") {
    if (result.errorCode !== "INVALID_PAYLOAD" && result.errorCode !== "AUTHENTICATION_FAILED" && result.errorCode !== "ACCOUNT_SCOPE_REJECTED") throw new Error("CCLUB_ERP_RESULT_TERMINAL_CODE_INVALID");
    if (result.retryAt) throw new Error("CCLUB_ERP_RESULT_TERMINAL_RETRY_FORBIDDEN");
    return Object.freeze({ kind: "TERMINAL_ERROR", ...common, errorCode: result.errorCode });
  }
  throw new Error("CCLUB_ERP_RESULT_KIND_INVALID");
}
