import { createHash, randomUUID } from "node:crypto";

import {
  planHotelTwentyCrmSummaryDeliveryReconciliation,
  type HotelTwentyCrmDeliveryObservation,
  type HotelTwentyCrmReconciliationPlan,
} from "./hotel-twenty-crm-summary-delivery-reconciliation-planner";

export type HotelTwentyActivityKind =
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "CHECKED_IN"
  | "CHECKED_OUT";

export interface HotelTwentySummary {
  tenantKey: string;
  projectKey: string;
  siteKey: string;
  guestSubjectRef: string;
  bookingActivityRef: string;
  activityKind: HotelTwentyActivityKind;
  arrivalDate: string;
  departureDate: string;
  guestCount: number;
  roomCategoryKey: string;
  lawfulBasisReceiptSha256: string;
  idempotencyKey: string;
}
export interface NormalizedHotelTwentySummary extends HotelTwentySummary {
  authorityScope: "SUMMARY_ONLY_NON_AUTHORITATIVE";
  summarySha256: string;
}

interface QueryResult<Row> { rows: Row[]; rowCount: number | null }
export interface HotelTwentyDatabase {
  query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
  transaction<T>(work: (database: HotelTwentyDatabase) => Promise<T>): Promise<T>;
}

export interface ClaimedHotelTwentySummary extends NormalizedHotelTwentySummary {
  outboxId: string;
  leaseToken: string;
  attemptNumber: number;
}
type HotelTwentySummaryOutboxRow = Readonly<{
  id: string; tenant_key: NormalizedHotelTwentySummary["tenantKey"];
  project_key: NormalizedHotelTwentySummary["projectKey"]; site_key: NormalizedHotelTwentySummary["siteKey"];
  guest_subject_ref: NormalizedHotelTwentySummary["guestSubjectRef"]; booking_activity_ref: NormalizedHotelTwentySummary["bookingActivityRef"];
  activity_kind: NormalizedHotelTwentySummary["activityKind"]; arrival_date: string | Date; departure_date: string | Date;
  guest_count: NormalizedHotelTwentySummary["guestCount"]; room_category_key: NormalizedHotelTwentySummary["roomCategoryKey"];
  lawful_basis_receipt_sha256: NormalizedHotelTwentySummary["lawfulBasisReceiptSha256"]; idempotency_key: NormalizedHotelTwentySummary["idempotencyKey"];
  summary_sha256: NormalizedHotelTwentySummary["summarySha256"]; attempt_count: number;
}>;

export interface HotelTwentySummaryAdapter {
  deliver(command: ClaimedHotelTwentySummary): Promise<{
    twentyObjectRefSha256: string;
    adapterReceiptSha256: string;
    summarySha256: string;
    authorityScope: "SUMMARY_ONLY_NON_AUTHORITATIVE";
    acknowledgedAt: string;
  }>;
}

export type HotelTwentyCrmDeliveryExecutionResult = Readonly<{
  plan: HotelTwentyCrmReconciliationPlan;
  providerCallPerformed: boolean;
  databaseWritePerformed: boolean;
}>;

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ACTIVITY_KINDS: readonly HotelTwentyActivityKind[] = [
  "BOOKING_CREATED", "BOOKING_CONFIRMED", "BOOKING_CANCELLED", "CHECKED_IN", "CHECKED_OUT",
];
const PERMITTED_KEYS = [
  "tenantKey", "projectKey", "siteKey", "guestSubjectRef", "bookingActivityRef", "activityKind",
  "arrivalDate", "departureDate", "guestCount", "roomCategoryKey", "lawfulBasisReceiptSha256", "idempotencyKey",
] as const;

function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`HOTEL_TWENTY_${field}_REQUIRED`);
  return normalized;
}

function dateOnly(value: string, field: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    throw new Error(`HOTEL_TWENTY_${field}_INVALID`);
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function transportEvidence(error: unknown): string {
  return sha256({
    kind: error instanceof Error ? error.name : typeof error,
    code:
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code ?? "UNKNOWN")
        : "UNKNOWN",
  });
}

export function normalizePermittedHotelTwentySummary(input: HotelTwentySummary): NormalizedHotelTwentySummary {
  const unknownKeys = Object.keys(input).filter((key) => !(PERMITTED_KEYS as readonly string[]).includes(key));
  if (unknownKeys.length > 0) throw new Error("HOTEL_TWENTY_UNPERMITTED_SUMMARY_FIELD");
  const guestSubjectRef = requiredText(input.guestSubjectRef, "GUEST_SUBJECT_REF");
  if (!/^psn_[A-Za-z0-9_-]{12,128}$/.test(guestSubjectRef) || guestSubjectRef.includes("@")) {
    throw new Error("HOTEL_TWENTY_PSEUDONYMOUS_SUBJECT_REQUIRED");
  }
  if (!ACTIVITY_KINDS.includes(input.activityKind)) throw new Error("HOTEL_TWENTY_ACTIVITY_KIND_INVALID");
  if (!Number.isInteger(input.guestCount) || input.guestCount < 1 || input.guestCount > 99) {
    throw new Error("HOTEL_TWENTY_GUEST_COUNT_INVALID");
  }
  if (!SHA256_PATTERN.test(input.lawfulBasisReceiptSha256)) {
    throw new Error("HOTEL_TWENTY_LAWFUL_BASIS_RECEIPT_INVALID");
  }
  const arrivalDate = dateOnly(input.arrivalDate, "ARRIVAL_DATE");
  const departureDate = dateOnly(input.departureDate, "DEPARTURE_DATE");
  if (arrivalDate >= departureDate) throw new Error("HOTEL_TWENTY_STAY_WINDOW_INVALID");
  const summary = {
    tenantKey: requiredText(input.tenantKey, "TENANT_KEY"),
    projectKey: requiredText(input.projectKey, "PROJECT_KEY"),
    siteKey: requiredText(input.siteKey, "SITE_KEY"),
    guestSubjectRef,
    bookingActivityRef: requiredText(input.bookingActivityRef, "BOOKING_ACTIVITY_REF"),
    activityKind: input.activityKind,
    arrivalDate,
    departureDate,
    guestCount: input.guestCount,
    roomCategoryKey: requiredText(input.roomCategoryKey, "ROOM_CATEGORY_KEY"),
    lawfulBasisReceiptSha256: input.lawfulBasisReceiptSha256,
    idempotencyKey: requiredText(input.idempotencyKey, "IDEMPOTENCY_KEY"),
    authorityScope: "SUMMARY_ONLY_NON_AUTHORITATIVE" as const,
  };
  return { ...summary, summarySha256: sha256(summary) };
}

export function createHotelTwentyCrmSummaryOutboxRepository(
  database: HotelTwentyDatabase,
  adapter?: HotelTwentySummaryAdapter,
) {
  return {
    async enqueue(input: HotelTwentySummary): Promise<{ outboxId: string; replayed: boolean }> {
      const summary = normalizePermittedHotelTwentySummary(input);
      const outboxId = randomUUID();
      const result = await database.query<{ id: string; inserted: boolean }>(
        `INSERT INTO crays_core.cclub_hotel_twenty_summary_outbox (
           id, tenant_key, project_key, site_key, guest_subject_ref, booking_activity_ref,
           activity_kind, arrival_date, departure_date, guest_count, room_category_key,
           lawful_basis_receipt_sha256, summary_sha256, idempotency_key
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (tenant_key, idempotency_key) DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
         RETURNING id, (xmax = 0) AS inserted`,
        [outboxId, summary.tenantKey, summary.projectKey, summary.siteKey, summary.guestSubjectRef,
          summary.bookingActivityRef, summary.activityKind, summary.arrivalDate, summary.departureDate,
          summary.guestCount, summary.roomCategoryKey, summary.lawfulBasisReceiptSha256,
          summary.summarySha256, summary.idempotencyKey],
      );
      const row = result.rows[0];
      if (!row) throw new Error("HOTEL_TWENTY_SUMMARY_NOT_PERSISTED");
      return { outboxId: row.id, replayed: !row.inserted };
    },

    async claim(input: { workerId: string; leaseSeconds: number }): Promise<ClaimedHotelTwentySummary | null> {
      if (!Number.isInteger(input.leaseSeconds) || input.leaseSeconds < 5 || input.leaseSeconds > 3600) {
        throw new Error("HOTEL_TWENTY_LEASE_SECONDS_INVALID");
      }
      const leaseToken = randomUUID();
      const result = await database.query<HotelTwentySummaryOutboxRow>(
        `WITH candidate AS (
           SELECT id FROM crays_core.cclub_hotel_twenty_summary_outbox
            WHERE next_attempt_at <= now()
              AND (
                (state = 'PENDING' AND attempt_count = 0)
                OR (
                  state = 'RETRY'
                  AND last_failure_code ~ '^CONFIRMED_NOT_APPLIED:[0-9a-f]{64}$'
                )
              )
            ORDER BY next_attempt_at, created_at FOR UPDATE SKIP LOCKED LIMIT 1
         )
         UPDATE crays_core.cclub_hotel_twenty_summary_outbox outbox
            SET state = 'LEASED', lease_owner = $1, lease_token = $2,
                lease_expires_at = now() + make_interval(secs => $3),
                attempt_count = outbox.attempt_count + 1, last_failure_code = NULL
           FROM candidate WHERE outbox.id = candidate.id AND outbox.attempt_count < 12
         RETURNING outbox.*`,
        [requiredText(input.workerId, "WORKER_ID"), leaseToken, input.leaseSeconds],
      );
      const row = result.rows[0];
      if (!row) return null;
      return {
        outboxId: row.id, tenantKey: row.tenant_key, projectKey: row.project_key, siteKey: row.site_key,
        guestSubjectRef: row.guest_subject_ref, bookingActivityRef: row.booking_activity_ref,
        activityKind: row.activity_kind, arrivalDate: String(row.arrival_date), departureDate: String(row.departure_date),
        guestCount: row.guest_count, roomCategoryKey: row.room_category_key,
        lawfulBasisReceiptSha256: row.lawful_basis_receipt_sha256, idempotencyKey: row.idempotency_key,
        authorityScope: "SUMMARY_ONLY_NON_AUTHORITATIVE", summarySha256: row.summary_sha256,
        leaseToken, attemptNumber: row.attempt_count,
      };
    },

    async deliver(claimed: ClaimedHotelTwentySummary): Promise<HotelTwentyCrmDeliveryExecutionResult> {
      const observedAt = new Date().toISOString();
      if (!adapter) {
        return {
          plan: planHotelTwentyCrmSummaryDeliveryReconciliation(claimed, {
            kind: "provider_not_bound",
            observedAt,
            summarySha256: claimed.summarySha256,
          }),
          providerCallPerformed: false,
          databaseWritePerformed: false,
        };
      }

      let acknowledgement: Awaited<ReturnType<HotelTwentySummaryAdapter["deliver"]>>;
      try {
        acknowledgement = await adapter.deliver(claimed);
      } catch (error) {
        return {
          plan: planHotelTwentyCrmSummaryDeliveryReconciliation(claimed, {
            kind: "unknown_outcome",
            failureCode: "TRANSPORT_UNKNOWN_OUTCOME",
            transportEvidenceSha256: transportEvidence(error),
            observedAt,
            summarySha256: claimed.summarySha256,
          }),
          providerCallPerformed: true,
          databaseWritePerformed: false,
        };
      }

      let plan: HotelTwentyCrmReconciliationPlan;
      try {
        if (
          !SHA256_PATTERN.test(acknowledgement.twentyObjectRefSha256) ||
          !SHA256_PATTERN.test(acknowledgement.adapterReceiptSha256) ||
          acknowledgement.summarySha256 !== claimed.summarySha256 ||
          acknowledgement.authorityScope !== "SUMMARY_ONLY_NON_AUTHORITATIVE"
        ) throw new Error("HOTEL_TWENTY_ACKNOWLEDGEMENT_INVALID");
        const acknowledgedAt = new Date(acknowledgement.acknowledgedAt);
        if (
          Number.isNaN(acknowledgedAt.getTime()) ||
          acknowledgedAt.toISOString() !== acknowledgement.acknowledgedAt
        ) throw new Error("HOTEL_TWENTY_ACKNOWLEDGED_AT_INVALID");
        plan = planHotelTwentyCrmSummaryDeliveryReconciliation(claimed, {
          kind: "acknowledged",
          observedAt: acknowledgement.acknowledgedAt,
          summarySha256: acknowledgement.summarySha256,
          twentyObjectRefSha256: acknowledgement.twentyObjectRefSha256,
          adapterReceiptSha256: acknowledgement.adapterReceiptSha256,
        });
      } catch (error) {
        return {
          plan: planHotelTwentyCrmSummaryDeliveryReconciliation(claimed, {
            kind: "unknown_outcome",
            failureCode: "ACK_EVIDENCE_INVALID",
            transportEvidenceSha256: transportEvidence(error),
            observedAt,
            summarySha256: claimed.summarySha256,
          }),
          providerCallPerformed: true,
          databaseWritePerformed: false,
        };
      }
      if (!plan.providerDeliveryClaimed || plan.state !== "delivered") {
        throw new Error("HOTEL_TWENTY_ACK_PLAN_INVALID");
      }

      await database.transaction(async (transaction) => {
        const locked = await transaction.query<{
          state: string;
          lease_token: string;
          attempt_count: number;
          summary_sha256: string;
          idempotency_key: string;
        }>(
          `SELECT state, lease_token, attempt_count, summary_sha256, idempotency_key
             FROM crays_core.cclub_hotel_twenty_summary_outbox WHERE id = $1 FOR UPDATE`,
          [claimed.outboxId],
        );
        const row = locked.rows[0];
        if (
          row?.state !== "LEASED" ||
          row.lease_token !== claimed.leaseToken ||
          Number(row.attempt_count) !== claimed.attemptNumber ||
          row.summary_sha256 !== claimed.summarySha256 ||
          row.idempotency_key !== claimed.idempotencyKey
        ) {
          throw new Error("HOTEL_TWENTY_LEASE_LOST");
        }
        await transaction.query(
          `INSERT INTO crays_core.cclub_hotel_twenty_summary_delivery_receipt (
             id, outbox_id, twenty_object_ref_sha256, adapter_receipt_sha256,
             summary_sha256, authority_scope, acknowledged_at
          ) VALUES ($1,$2,$3,$4,$5,'SUMMARY_ONLY_NON_AUTHORITATIVE',$6)`,
          [randomUUID(), claimed.outboxId, acknowledgement.twentyObjectRefSha256,
            acknowledgement.adapterReceiptSha256, acknowledgement.summarySha256,
            acknowledgement.acknowledgedAt],
        );
        const changed = await transaction.query(
          `UPDATE crays_core.cclub_hotel_twenty_summary_outbox
              SET state = 'ACKNOWLEDGED', acknowledged_at = $3,
                  lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL
            WHERE id = $1 AND state = 'LEASED' AND lease_token = $2`,
          [claimed.outboxId, claimed.leaseToken, acknowledgement.acknowledgedAt],
        );
        if (changed.rowCount !== 1) throw new Error("HOTEL_TWENTY_ACKNOWLEDGEMENT_CAS_FAILED");
      });
      return { plan, providerCallPerformed: true, databaseWritePerformed: true };
    },

    async reconcile(
      claimed: ClaimedHotelTwentySummary,
      observation: HotelTwentyCrmDeliveryObservation,
    ): Promise<HotelTwentyCrmDeliveryExecutionResult> {
      const plan = planHotelTwentyCrmSummaryDeliveryReconciliation(claimed, observation);
      if (plan.state !== "retry") {
        return { plan, providerCallPerformed: false, databaseWritePerformed: false };
      }
      const result = await database.query(
        `UPDATE crays_core.cclub_hotel_twenty_summary_outbox
            SET state = 'RETRY',
                next_attempt_at = now() + make_interval(secs => $3),
                last_failure_code = $4,
                lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL
          WHERE id = $1 AND state = 'LEASED' AND lease_token = $2
            AND attempt_count = $5 AND summary_sha256 = $6 AND idempotency_key = $7
            AND attempt_count < 12`,
        [
          claimed.outboxId,
          claimed.leaseToken,
          plan.retryAfterSeconds,
          `CONFIRMED_NOT_APPLIED:${plan.evidenceSha256}`,
          claimed.attemptNumber,
          claimed.summarySha256,
          claimed.idempotencyKey,
        ],
      );
      if (result.rowCount !== 1) throw new Error("HOTEL_TWENTY_RECONCILIATION_CAS_FAILED");
      return { plan, providerCallPerformed: false, databaseWritePerformed: true };
    },
  };
}
