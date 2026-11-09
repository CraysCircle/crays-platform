import "server-only";

import type { NormalizedBookingRevenueErpResult } from "./booking-revenue-erp-result-normalizer";

export type BookingRevenueErpOutboxState = "ACKNOWLEDGED" | "RETRY" | "DEAD_LETTER";

export interface BookingRevenueErpSqlResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount?: number | null;
}

export interface BookingRevenueErpSqlClient {
  query<Row = Record<string, unknown>>(
    statement: string,
    values?: readonly unknown[],
  ): Promise<BookingRevenueErpSqlResult<Row>>;
  release?(): void;
}

export interface BookingRevenueErpSqlPool {
  connect(): Promise<BookingRevenueErpSqlClient>;
}

export interface BookingRevenueErpResultRepositoryOutput {
  eventId: string;
  providerReceiptId: string;
  state: BookingRevenueErpOutboxState;
  replayed: boolean;
}

type AnyRecord = Record<string, unknown>;
type ResultKind = "ACCEPTED" | "RETRYABLE_ERROR" | "TERMINAL_ERROR";
type CanonicalResult = {
  kind: ResultKind;
  tenantId: string;
  eventId: string;
  eventSha256: string;
  attemptNumber: number;
  leaseOwner: string;
  leaseId: string;
  leaseVersion: number;
  adapterId: string;
  providerReceiptId: string;
  providerReceiptSha256: string;
  providerRequestId: string;
  requestSha256: string;
  responseSha256: string;
  allocationReceiptId: string;
  allocationReceiptSha256: string;
  requestDispatchedAt: string;
  observedAt: string;
  externalDocumentReferenceHandle: string | null;
  externalDocumentReferenceSha256: string | null;
  errorCode: string | null;
  retryAt: string | null;
};

type LockedOutbox = {
  id: string;
  tenant_id: string;
  state: string;
  payload_hash: string;
  attempt_count: number;
  lease_owner: string | null;
  lease_id: string | null;
  lease_version: number;
  lease_until: string | null;
};

const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_HANDLE = /^[A-Za-z0-9._:/-]{8,512}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function fail(message: string): never {
  throw new Error("CCLUB_ERP_RESULT_REPOSITORY_REJECTED: " + message);
}

function asRecord(value: unknown): AnyRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("normalized result must be an object");
  }
  return value as AnyRecord;
}

function pick(source: AnyRecord, names: readonly string[]): unknown {
  for (const name of names) if (source[name] !== undefined) return source[name];
  return undefined;
}

function textField(source: AnyRecord, names: readonly string[], label: string): string {
  const value = pick(source, names);
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) {
    fail(label + " is missing or malformed");
  }
  return value;
}

function optionalText(source: AnyRecord, names: readonly string[], label: string): string | null {
  const value = pick(source, names);
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) {
    fail(label + " is malformed");
  }
  return value;
}

function positiveInteger(
  source: AnyRecord,
  names: readonly string[],
  label: string,
  allowZero = false,
): number {
  const value = pick(source, names);
  if (!Number.isSafeInteger(value) || (allowZero ? Number(value) < 0 : Number(value) < 1)) {
    fail(label + " is not a valid integer");
  }
  return Number(value);
}

function instant(value: string, label: string): string {
  if (!Number.isFinite(Date.parse(value))) fail(label + " is not an ISO instant");
  return value;
}

function hash(value: string, label: string): string {
  if (!SHA256.test(value)) fail(label + " is not a lowercase SHA-256");
  return value;
}

function normalize(result: NormalizedBookingRevenueErpResult): CanonicalResult {
  const source = asRecord(result);
  const kind = textField(source, ["kind", "resultKind"], "kind");
  if (!["ACCEPTED", "RETRYABLE_ERROR", "TERMINAL_ERROR"].includes(kind)) {
    fail("kind is not allowlisted");
  }

  const accepted = kind === "ACCEPTED";
  const retryable = kind === "RETRYABLE_ERROR";
  const externalDocumentReferenceHandle = optionalText(
    source,
    ["externalDocumentReferenceHandle", "secureExternalDocumentHandle", "erpReference"],
    "external document handle",
  );
  const externalDocumentReferenceSha256 = optionalText(
    source,
    ["externalDocumentReferenceSha256", "secureExternalDocumentSha256", "erpReferenceSha256"],
    "external document hash",
  );
  const errorCode = optionalText(source, ["errorCode"], "error code");
  const retryAt = optionalText(source, ["retryAt", "nextAttemptAt"], "retry time");

  if (accepted) {
    if (!externalDocumentReferenceHandle || !SAFE_HANDLE.test(externalDocumentReferenceHandle)) {
      fail("accepted result requires a secure external-document handle");
    }
    if (!externalDocumentReferenceSha256) fail("accepted result requires an external-document hash");
    hash(externalDocumentReferenceSha256, "external document hash");
    if (errorCode || retryAt) fail("accepted result cannot carry failure fields");
  } else {
    if (externalDocumentReferenceHandle || externalDocumentReferenceSha256) {
      fail("failure result cannot carry an external-document reference");
    }
    if (!errorCode || !/^[A-Z][A-Z0-9_]{2,63}$/.test(errorCode)) {
      fail("failure result requires an allowlisted-shape error code");
    }
    if (retryable && !retryAt) fail("retryable result requires retryAt");
    if (!retryable && retryAt) fail("terminal result cannot carry retryAt");
  }

  return {
    kind: kind as ResultKind,
    tenantId: textField(source, ["tenantId"], "tenant id"),
    eventId: textField(source, ["eventId", "outboxEventId", "dispatchEventId"], "event id"),
    eventSha256: hash(
      textField(source, ["eventSha256", "payloadSha256", "payloadHash"], "event hash"),
      "event hash",
    ),
    attemptNumber: positiveInteger(source, ["attemptNumber"], "attempt number"),
    leaseOwner: textField(source, ["leaseOwner"], "lease owner"),
    leaseId: textField(source, ["leaseId"], "lease id"),
    leaseVersion: positiveInteger(source, ["leaseVersion"], "lease version"),
    adapterId: textField(source, ["adapterId", "adapter", "adapterName"], "adapter id"),
    providerReceiptId: textField(source, ["providerReceiptId"], "provider receipt id"),
    providerReceiptSha256: hash(
      textField(source, ["providerReceiptSha256"], "provider receipt hash"),
      "provider receipt hash",
    ),
    providerRequestId: textField(source, ["providerRequestId"], "provider request id"),
    requestSha256: hash(
      textField(source, ["requestSha256", "requestHash"], "request hash"),
      "request hash",
    ),
    responseSha256: hash(
      textField(source, ["responseSha256", "responseHash"], "response hash"),
      "response hash",
    ),
    allocationReceiptId: textField(
      source,
      ["allocationReceiptId", "bookingRevenueAllocationReceiptId"],
      "allocation receipt id",
    ),
    allocationReceiptSha256: hash(
      textField(source, ["allocationReceiptSha256"], "allocation receipt hash"),
      "allocation receipt hash",
    ),
    requestDispatchedAt: instant(
      textField(source, ["requestDispatchedAt", "dispatchedAt"], "dispatch time"),
      "dispatch time",
    ),
    observedAt: instant(
      textField(source, ["observedAt", "completedAt"], "observed time"),
      "observed time",
    ),
    externalDocumentReferenceHandle,
    externalDocumentReferenceSha256,
    errorCode,
    retryAt: retryAt ? instant(retryAt, "retry time") : null,
  };
}

function receiptUuid(providerReceiptSha256: string): string {
  const raw = providerReceiptSha256.slice(0, 32);
  return [
    raw.slice(0, 8),
    raw.slice(8, 12),
    raw.slice(12, 16),
    raw.slice(16, 20),
    raw.slice(20),
  ].join("-");
}

function targetState(kind: ResultKind): BookingRevenueErpOutboxState {
  if (kind === "ACCEPTED") return "ACKNOWLEDGED";
  if (kind === "RETRYABLE_ERROR") return "RETRY";
  return "DEAD_LETTER";
}

function same(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left instanceof Date && typeof right === "string") {
    return left.toISOString() === new Date(right).toISOString();
  }
  if (right instanceof Date && typeof left === "string") {
    return right.toISOString() === new Date(left).toISOString();
  }
  return false;
}

function assertRow(row: AnyRecord | undefined, expected: AnyRecord, label: string): void {
  if (!row) fail(label + " was not persisted");
  for (const [key, value] of Object.entries(expected)) {
    if (!same(row[key], value)) fail(label + " conflict at " + key);
  }
}

export async function persistBookingRevenueErpResult(
  pool: BookingRevenueErpSqlPool,
  normalizedResult: NormalizedBookingRevenueErpResult,
): Promise<BookingRevenueErpResultRepositoryOutput> {
  const result = normalize(normalizedResult);
  if (!UUID.test(result.tenantId) || !UUID.test(result.eventId)) {
    fail("tenant and event identifiers must be UUIDs");
  }

  const state = targetState(result.kind);
  const providerReceiptId = receiptUuid(result.providerReceiptSha256);
  const client = await pool.connect();
  let committed = false;

  try {
    await client.query("BEGIN");
    await client.query(
      "/* cclub-phase9-erp-v39:rls */ SELECT set_config('crays.tenant_id', $1, true), set_config('crays.app_role', 'core_service', true)",
      [result.tenantId],
    );

    const lockedResult = await client.query<LockedOutbox>(
      "/* cclub-phase9-erp-v39:lock */ " +
        "SELECT id, tenant_id, state, payload_hash, attempt_count, lease_owner, " +
        "lease_id, lease_version, lease_until " +
        'FROM "CraysClubErpDispatchOutbox" ' +
        "WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE",
      [result.tenantId, result.eventId],
    );
    const locked = lockedResult.rows[0];
    if (!locked) fail("outbox event does not exist");
    if (locked.payload_hash !== result.eventSha256) fail("event hash mismatch");
    if (Number(locked.attempt_count) !== result.attemptNumber) fail("attempt mismatch");

    const replayed = locked.state === state;
    if (!replayed) {
      if (locked.state !== "LEASED") fail("outbox state " + locked.state + " cannot be finalized");
      if (
        locked.lease_owner !== result.leaseOwner ||
        locked.lease_id !== result.leaseId ||
        Number(locked.lease_version) !== result.leaseVersion
      ) fail("lease fence mismatch");
      if (!locked.lease_until || Date.parse(locked.lease_until) <= Date.parse(result.observedAt)) {
        fail("lease expired before provider result was observed");
      }
    } else if (
      locked.lease_owner !== null ||
      locked.lease_id !== null ||
      locked.lease_until !== null
    ) fail("replayed terminal state still carries a lease");

    const compatibilityExpected: AnyRecord = {
      id: providerReceiptId,
      tenant_id: result.tenantId,
      outbox_id: result.eventId,
      attempt_number: result.attemptNumber,
      result_kind: result.kind === "ACCEPTED" ? "ACKNOWLEDGED" : result.kind,
      erp_reference: result.externalDocumentReferenceHandle,
      request_hash: result.requestSha256,
      response_hash: result.responseSha256,
      observed_at: result.observedAt,
    };
    await client.query(
      "/* cclub-phase9-erp-v39:compat-insert */ " +
        'INSERT INTO "CraysClubErpDispatchReceipt" ' +
        "(id, tenant_id, outbox_id, attempt_number, result_kind, erp_reference, request_hash, response_hash, observed_at) " +
        "VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9::timestamptz) ON CONFLICT DO NOTHING",
      Object.values(compatibilityExpected),
    );
    const compatibilityRead = await client.query<AnyRecord>(
      "/* cclub-phase9-erp-v39:compat-read */ " +
        "SELECT id::text, tenant_id::text, outbox_id::text, attempt_number, result_kind, " +
        'erp_reference, request_hash, response_hash, observed_at FROM "CraysClubErpDispatchReceipt" ' +
        "WHERE tenant_id = $1::uuid AND id = $2::uuid",
      [result.tenantId, providerReceiptId],
    );
    assertRow(compatibilityRead.rows[0], compatibilityExpected, "compatibility receipt");

    const auditExpected: AnyRecord = {
      provider_receipt_id: result.providerReceiptId,
      tenant_id: result.tenantId,
      outbox_id: result.eventId,
      attempt_number: result.attemptNumber,
      lease_id: result.leaseId,
      lease_version: result.leaseVersion,
      normalized_kind: result.kind,
      adapter_id: result.adapterId,
      provider_receipt_sha256: result.providerReceiptSha256,
      provider_request_id: result.providerRequestId,
      request_sha256: result.requestSha256,
      response_sha256: result.responseSha256,
      allocation_receipt_id: result.allocationReceiptId,
      allocation_receipt_sha256: result.allocationReceiptSha256,
      external_document_reference_handle: result.externalDocumentReferenceHandle,
      external_document_reference_sha256: result.externalDocumentReferenceSha256,
      error_code: result.errorCode,
      request_dispatched_at: result.requestDispatchedAt,
      observed_at: result.observedAt,
    };
    await client.query(
      "/* cclub-phase9-erp-v39:audit-insert */ " +
        'INSERT INTO "CraysClubErpDispatchAuditReceipt" ' +
        "(provider_receipt_id, tenant_id, outbox_id, attempt_number, lease_id, lease_version, " +
        "normalized_kind, adapter_id, provider_receipt_sha256, provider_request_id, request_sha256, " +
        "response_sha256, allocation_receipt_id, allocation_receipt_sha256, " +
        "external_document_reference_handle, external_document_reference_sha256, error_code, " +
        "request_dispatched_at, observed_at) " +
        "VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, $12, " +
        "$13, $14, $15, $16, $17, $18::timestamptz, $19::timestamptz) ON CONFLICT DO NOTHING",
      Object.values(auditExpected),
    );
    const auditRead = await client.query<AnyRecord>(
      "/* cclub-phase9-erp-v39:audit-read */ " +
        "SELECT provider_receipt_id, tenant_id::text, outbox_id::text, attempt_number, " +
        "lease_id, lease_version, normalized_kind, adapter_id, provider_receipt_sha256, provider_request_id, " +
        "request_sha256, response_sha256, allocation_receipt_id, allocation_receipt_sha256, " +
        "external_document_reference_handle, external_document_reference_sha256, error_code, " +
        'request_dispatched_at, observed_at FROM "CraysClubErpDispatchAuditReceipt" ' +
        "WHERE tenant_id = $1::uuid AND provider_receipt_id = $2",
      [result.tenantId, result.providerReceiptId],
    );
    assertRow(auditRead.rows[0], auditExpected, "audit receipt");

    if (!replayed) {
      const updateResult = await client.query<{ id: string }>(
        "/* cclub-phase9-erp-v39:update */ " +
          'UPDATE "CraysClubErpDispatchOutbox" SET state = $1, erp_reference = $2, ' +
          "last_error_code = $3, next_attempt_at = $4::timestamptz, lease_owner = NULL, " +
          "lease_id = NULL, lease_until = NULL, updated_at = $5::timestamptz " +
          "WHERE tenant_id = $6::uuid AND id = $7::uuid AND state = 'LEASED' " +
          "AND lease_owner = $8 AND lease_id = $9 AND lease_version = $10 " +
          "AND lease_until > $5::timestamptz RETURNING id::text",
        [
          state,
          result.externalDocumentReferenceHandle,
          result.errorCode,
          result.retryAt,
          result.observedAt,
          result.tenantId,
          result.eventId,
          result.leaseOwner,
          result.leaseId,
          result.leaseVersion,
        ],
      );
      if (updateResult.rows.length !== 1) fail("lease-fenced outbox update lost the claim");
    }

    await client.query("COMMIT");
    committed = true;
    return { eventId: result.eventId, providerReceiptId, state, replayed };
  } catch (error) {
    if (!committed) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original failure.
      }
    }
    throw error;
  } finally {
    client.release?.();
  }
}
