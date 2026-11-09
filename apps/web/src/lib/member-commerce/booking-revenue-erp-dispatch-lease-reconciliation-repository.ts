import "server-only";

import { randomUUID } from "node:crypto";

import type { ClaimedBookingRevenueErpEventV2 } from "./booking-revenue-erp-claim-worker-v2";
import {
  planBookingRevenueErpDispatchLeaseReconciliation,
  type BookingRevenueErpLeaseReconciliationPlan,
  type BookingRevenueErpOutboxState,
  type BookingRevenueErpTrustedProviderReceipt,
} from "./booking-revenue-erp-dispatch-lease-reconciliation-contract";

export type BookingRevenueErpLeaseSqlClient = Readonly<{
  query: <Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ) => Promise<{ rowCount: number; rows: readonly Row[] }>;
}>;

export type BookingRevenueErpLeaseDatabase = Readonly<{
  transaction: <T>(run: (client: BookingRevenueErpLeaseSqlClient) => Promise<T>) => Promise<T>;
}>;

type ProjectionRow = Readonly<{
  id: string;
  tenant_id: string;
  idempotency_key: string;
  payload_hash: string;
  state: string;
  attempt_count: number;
  lease_owner: string | null;
  lease_id: string | null;
  lease_version: number;
  lease_until: string | null;
  next_attempt_at: string;
  last_error_code: string | null;
  receipt_attempt_number: number | null;
  receipt_lease_id: string | null;
  receipt_lease_version: number | null;
  normalized_kind: string | null;
  provider_receipt_sha256: string | null;
  request_sha256: string | null;
  response_sha256: string | null;
  external_document_reference_sha256: string | null;
  receipt_observed_at: string | null;
}>;

type ClaimedRow = Readonly<{
  id: string;
  tenant_id: string;
  posting_batch_id: string;
  erp_target_kind: string;
  idempotency_key: string;
  payload_hash: string;
  source_event_kind: string;
  source_event_sha256: string;
  booking_reference_sha256: string;
  allocation_receipt_id: string;
  allocation_receipt_sha256: string;
  attempt_count: number;
  lease_owner: string;
  lease_id: string;
  lease_version: number;
  lease_until: string;
}>;

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,255}$/;
const SHA256 = /^[a-f0-9]{64}$/;

function reject(code: string): never {
  throw new Error(`CCLUB_ERP_LEASE_REPOSITORY_${code}`);
}

function uuid(value: string, label: string): string {
  if (!UUID.test(value)) reject(`${label}_UUID_INVALID`);
  return value;
}

function identifier(value: string, label: string): string {
  if (!SAFE_ID.test(value)) reject(`${label}_INVALID`);
  return value;
}

function hash(value: string, label: string): string {
  if (!SHA256.test(value)) reject(`${label}_SHA256_INVALID`);
  return value;
}

function positive(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 1) reject(`${label}_INVALID`);
  return value;
}

function instant(value: string, label: string): string {
  if (!Number.isFinite(Date.parse(value))) reject(`${label}_INVALID`);
  return value;
}

function optionalReceipt(row: ProjectionRow): BookingRevenueErpTrustedProviderReceipt | null {
  if (row.receipt_attempt_number === null) return null;
  if (
    row.receipt_lease_id === null ||
    row.receipt_lease_version === null ||
    row.normalized_kind === null ||
    row.provider_receipt_sha256 === null ||
    row.request_sha256 === null ||
    row.response_sha256 === null ||
    row.receipt_observed_at === null
  ) {
    reject("PARTIAL_RECEIPT");
  }
  return Object.freeze({
    attemptNumber: Number(row.receipt_attempt_number),
    leaseId: row.receipt_lease_id,
    leaseVersion: Number(row.receipt_lease_version),
    normalizedKind: row.normalized_kind as BookingRevenueErpTrustedProviderReceipt["normalizedKind"],
    providerReceiptSha256: row.provider_receipt_sha256,
    requestSha256: row.request_sha256,
    responseSha256: row.response_sha256,
    externalDocumentReferenceSha256: row.external_document_reference_sha256,
    observedAt: row.receipt_observed_at,
  });
}

export async function inspectBookingRevenueErpDispatchLeaseReconciliation(input: Readonly<{
  client: BookingRevenueErpLeaseSqlClient;
  tenantId: string;
  eventId: string;
  observedAt: string;
}>): Promise<BookingRevenueErpLeaseReconciliationPlan> {
  const tenantId = uuid(input.tenantId, "TENANT_ID");
  const eventId = uuid(input.eventId, "EVENT_ID");
  instant(input.observedAt, "OBSERVED_AT");
  const result = await input.client.query<ProjectionRow>(
    `/* cclub-t6-erp-lease-reconciliation:read-only */
     SELECT o."id"::text,o."tenant_id"::text,o."idempotency_key",o."payload_hash",
            o."state",o."attempt_count",o."lease_owner",o."lease_id",o."lease_version",
            o."lease_until",o."next_attempt_at",o."last_error_code",
            r."attempt_number" AS receipt_attempt_number,r."lease_id" AS receipt_lease_id,
            r."lease_version" AS receipt_lease_version,r."normalized_kind",
            r."provider_receipt_sha256",r."request_sha256",r."response_sha256",
            r."external_document_reference_sha256",r."observed_at" AS receipt_observed_at
       FROM "CraysClubErpDispatchOutbox" o
       LEFT JOIN LATERAL (
         SELECT a."attempt_number",a."lease_id",a."lease_version",a."normalized_kind",
                a."provider_receipt_sha256",a."request_sha256",a."response_sha256",
                a."external_document_reference_sha256",a."observed_at"
           FROM "CraysClubErpDispatchAuditReceipt" a
          WHERE a."tenant_id"=o."tenant_id" AND a."outbox_id"=o."id"
            AND a."attempt_number"=o."attempt_count"
          ORDER BY a."observed_at" DESC,a."provider_receipt_id" DESC LIMIT 1
       ) r ON true
      WHERE o."tenant_id"=$1::uuid AND o."id"=$2::uuid
        AND o."source_event_kind"='BOOKING_REVENUE_ALLOCATION_READY'`,
    [tenantId, eventId],
  );
  if (result.rows.length !== 1 || !result.rows[0]) reject("EVENT_NOT_FOUND_OR_AMBIGUOUS");
  const row = result.rows[0];
  return planBookingRevenueErpDispatchLeaseReconciliation({
    snapshot: {
      tenantId: row.tenant_id,
      eventId: row.id,
      idempotencyKey: row.idempotency_key,
      payloadSha256: row.payload_hash,
      state: row.state as BookingRevenueErpOutboxState,
      attemptNumber: Number(row.attempt_count),
      leaseOwner: row.lease_owner,
      leaseId: row.lease_id,
      leaseVersion: Number(row.lease_version),
      leaseExpiresAt: row.lease_until,
      nextAttemptAt: row.next_attempt_at,
      lastErrorCode: row.last_error_code,
    },
    trustedReceipt: optionalReceipt(row),
    observedAt: input.observedAt,
  });
}

function toClaimedEvent(row: ClaimedRow, now: Date, expectedLeaseId: string): ClaimedBookingRevenueErpEventV2 {
  [row.id, row.tenant_id, row.posting_batch_id, row.lease_id].forEach((value, index) =>
    uuid(value, `CLAIM_UUID_${index}`),
  );
  if (row.lease_id !== expectedLeaseId) reject("LEASE_ID_NOT_EXACT");
  [row.erp_target_kind, row.idempotency_key, row.lease_owner, row.allocation_receipt_id].forEach(
    (value, index) => identifier(value, `CLAIM_ID_${index}`),
  );
  [row.payload_hash, row.source_event_sha256, row.booking_reference_sha256, row.allocation_receipt_sha256].forEach(
    (value, index) => hash(value, `CLAIM_HASH_${index}`),
  );
  if (row.source_event_kind !== "BOOKING_REVENUE_ALLOCATION_READY") reject("EVENT_KIND_INVALID");
  const attemptNumber = positive(Number(row.attempt_count), "ATTEMPT_NUMBER");
  const leaseVersion = positive(Number(row.lease_version), "LEASE_VERSION");
  const leaseExpiresAt = instant(row.lease_until, "LEASE_EXPIRES_AT");
  if (Date.parse(leaseExpiresAt) <= now.getTime()) reject("LEASE_NOT_FUTURE");
  return Object.freeze({
    tenantId: row.tenant_id,
    eventId: row.id,
    eventSha256: row.source_event_sha256,
    eventType: "BOOKING_REVENUE_ALLOCATION_READY",
    bookingReferenceSha256: row.booking_reference_sha256,
    leaseOwner: row.lease_owner,
    leaseId: row.lease_id,
    leaseVersion,
    attemptNumber,
    leaseExpiresAt,
    idempotencyKey: row.idempotency_key,
    postingBatchId: row.posting_batch_id,
    erpTargetKind: row.erp_target_kind,
    payloadSha256: row.payload_hash,
    allocationReceiptId: row.allocation_receipt_id,
    allocationReceiptSha256: row.allocation_receipt_sha256,
  });
}

export async function claimBookingRevenueErpEventWithReceiptFence(input: Readonly<{
  database: BookingRevenueErpLeaseDatabase;
  tenantId: string;
  workerId: string;
  now: Date;
  leaseSeconds: number;
}>): Promise<ClaimedBookingRevenueErpEventV2 | undefined> {
  const tenantId = uuid(input.tenantId, "TENANT_ID");
  const workerId = identifier(input.workerId, "WORKER_ID");
  if (!Number.isFinite(input.now.getTime())) reject("NOW_INVALID");
  if (!Number.isSafeInteger(input.leaseSeconds) || input.leaseSeconds < 5 || input.leaseSeconds > 3600) {
    reject("LEASE_SECONDS_INVALID");
  }
  const now = input.now.toISOString();
  const leaseId = randomUUID();
  return input.database.transaction(async (client) => {
    await client.query(
      "/* cclub-t6-erp-lease-fence:rls */ SELECT set_config('crays.app_role','core_service',true)," +
        "set_config('crays.tenant_id',$1,true),set_config('app.tenant_id',$1,true)",
      [tenantId],
    );
    const claimed = await client.query<ClaimedRow>(
      `/* cclub-t6-erp-lease-fence:claim-without-expired-requeue */
       WITH candidate AS (
         SELECT o."id"
           FROM "CraysClubErpDispatchOutbox" o
          WHERE o."tenant_id"=$1::uuid
            AND o."next_attempt_at"<=$3::timestamptz
            AND o."source_event_kind"='BOOKING_REVENUE_ALLOCATION_READY'
            AND o."source_event_sha256" IS NOT NULL
            AND o."booking_reference_sha256" IS NOT NULL
            AND o."allocation_receipt_id" IS NOT NULL
            AND o."allocation_receipt_sha256" IS NOT NULL
            AND (
              (o."state"='PENDING' AND o."attempt_count"=0 AND o."lease_version"=0)
              OR (
                o."state"='RETRY' AND EXISTS (
                  SELECT 1 FROM "CraysClubErpDispatchAuditReceipt" a
                   WHERE a."tenant_id"=o."tenant_id" AND a."outbox_id"=o."id"
                     AND a."attempt_number"=o."attempt_count"
                     AND a."lease_version"=o."lease_version"
                     AND a."normalized_kind"='RETRYABLE_ERROR'
                     AND a."provider_receipt_sha256"~'^[0-9a-f]{64}$'
                     AND a."request_sha256"~'^[0-9a-f]{64}$'
                     AND a."response_sha256"~'^[0-9a-f]{64}$'
                )
              )
            )
          ORDER BY o."next_attempt_at",o."created_at",o."id"
          FOR UPDATE SKIP LOCKED LIMIT 1
       )
       UPDATE "CraysClubErpDispatchOutbox" o
          SET "state"='LEASED',"lease_owner"=$2,"lease_id"=$5,
              "lease_version"=o."lease_version"+1,
              "lease_until"=$3::timestamptz+($4::text||' seconds')::interval,
              "attempt_count"=o."attempt_count"+1,"last_error_code"=NULL
         FROM candidate WHERE o."id"=candidate."id"
       RETURNING o."id"::text,o."tenant_id"::text,o."posting_batch_id"::text,
         o."erp_target_kind",o."idempotency_key",o."payload_hash",o."source_event_kind",
         o."source_event_sha256",o."booking_reference_sha256",o."allocation_receipt_id",
         o."allocation_receipt_sha256",o."attempt_count",o."lease_owner",o."lease_id",
         o."lease_version",o."lease_until"`,
      [tenantId, workerId, now, input.leaseSeconds, leaseId],
    );
    const row = claimed.rows[0];
    return row ? toClaimedEvent(row, input.now, leaseId) : undefined;
  });
}
