import { createHash, randomUUID } from "node:crypto";

import {
  planHotelPlaneExceptionWorkDeliveryReconciliation,
  type HotelPlaneDeliveryObservation,
  type HotelPlaneDeliveryReconciliationPlan,
} from "./hotel-plane-exception-work-delivery-reconciliation-planner";

export type HotelPlaneExceptionKind =
  | "LAUNCH_GATE_BLOCKED"
  | "BOOKING_FINANCIAL_EXCEPTION"
  | "BOOKING_PROVIDER_EXCEPTION"
  | "BOOKING_CAPACITY_EXCEPTION"
  | "BOOKING_MEMBERSHIP_EXCEPTION";
export type HotelPlaneOwnerGroup = "LAUNCH" | "BOOKING_OPERATIONS" | "FINANCE";
export type HotelPlanePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface HotelPlaneExceptionWork {
  tenantKey: string;
  projectKey: string;
  siteKey: string;
  exceptionKind: HotelPlaneExceptionKind;
  sourceExceptionRef: string;
  sourceEvidenceSha256: string;
  actionabilityReceiptSha256: string;
  workSummary: string;
  ownerGroup: HotelPlaneOwnerGroup;
  priority: HotelPlanePriority;
  idempotencyKey: string;
}

export interface NormalizedHotelPlaneExceptionWork extends HotelPlaneExceptionWork {
  payloadSha256: string;
  authorityScope: "WORK_TRACKING_NON_AUTHORITATIVE";
}

interface QueryResult<Row> { rows: Row[]; rowCount: number | null }
export interface HotelPlaneDatabase {
  query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
  transaction<T>(work: (database: HotelPlaneDatabase) => Promise<T>): Promise<T>;
}
export interface ClaimedHotelPlaneExceptionWork extends NormalizedHotelPlaneExceptionWork {
  outboxId: string;
  leaseToken: string;
  attemptNumber: number;
}
type HotelPlaneExceptionWorkOutboxRow = Readonly<{
  id: string;
  tenant_key: NormalizedHotelPlaneExceptionWork["tenantKey"];
  project_key: NormalizedHotelPlaneExceptionWork["projectKey"];
  site_key: NormalizedHotelPlaneExceptionWork["siteKey"];
  exception_kind: NormalizedHotelPlaneExceptionWork["exceptionKind"];
  source_exception_ref: NormalizedHotelPlaneExceptionWork["sourceExceptionRef"];
  source_evidence_sha256: NormalizedHotelPlaneExceptionWork["sourceEvidenceSha256"];
  actionability_receipt_sha256: NormalizedHotelPlaneExceptionWork["actionabilityReceiptSha256"];
  work_summary: NormalizedHotelPlaneExceptionWork["workSummary"];
  owner_group: NormalizedHotelPlaneExceptionWork["ownerGroup"];
  priority: NormalizedHotelPlaneExceptionWork["priority"];
  idempotency_key: NormalizedHotelPlaneExceptionWork["idempotencyKey"];
  payload_sha256: NormalizedHotelPlaneExceptionWork["payloadSha256"];
  attempt_count: number;
}>;
export interface HotelPlaneWorkAdapter {
  deliver(command: ClaimedHotelPlaneExceptionWork): Promise<{
    planeWorkRefSha256: string;
    adapterReceiptSha256: string;
    payloadSha256: string;
    authorityScope: "WORK_TRACKING_NON_AUTHORITATIVE";
    acknowledgedAt: string;
  }>;
}

export type HotelPlaneDeliveryExecutionResult = Readonly<{
  plan: HotelPlaneDeliveryReconciliationPlan;
  providerCallPerformed: boolean;
  databaseWritePerformed: boolean;
}>;

const SHA256 = /^[0-9a-f]{64}$/;
const KINDS: readonly HotelPlaneExceptionKind[] = [
  "LAUNCH_GATE_BLOCKED",
  "BOOKING_FINANCIAL_EXCEPTION",
  "BOOKING_PROVIDER_EXCEPTION",
  "BOOKING_CAPACITY_EXCEPTION",
  "BOOKING_MEMBERSHIP_EXCEPTION",
];
const KEYS = [
  "tenantKey",
  "projectKey",
  "siteKey",
  "exceptionKind",
  "sourceExceptionRef",
  "sourceEvidenceSha256",
  "actionabilityReceiptSha256",
  "workSummary",
  "ownerGroup",
  "priority",
  "idempotencyKey",
] as const;

function required(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`HOTEL_PLANE_${field}_REQUIRED`);
  return normalized;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function transportEvidence(error: unknown): string {
  return hash({
    kind: error instanceof Error ? error.name : typeof error,
    code:
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code ?? "UNKNOWN")
        : "UNKNOWN",
  });
}

export function normalizeActionableHotelPlaneWork(
  input: HotelPlaneExceptionWork,
): NormalizedHotelPlaneExceptionWork {
  if (Object.keys(input).some((key) => !(KEYS as readonly string[]).includes(key))) {
    throw new Error("HOTEL_PLANE_UNPERMITTED_WORK_FIELD");
  }
  if (!KINDS.includes(input.exceptionKind)) throw new Error("HOTEL_PLANE_NON_EXCEPTION_WORK_FORBIDDEN");
  if (!SHA256.test(input.sourceEvidenceSha256) || !SHA256.test(input.actionabilityReceiptSha256)) {
    throw new Error("HOTEL_PLANE_EVIDENCE_INVALID");
  }
  const workSummary = required(input.workSummary, "WORK_SUMMARY");
  if (workSummary.length < 8 || workSummary.length > 180 || workSummary.includes("@")) {
    throw new Error("HOTEL_PLANE_WORK_SUMMARY_INVALID");
  }
  const core = {
    tenantKey: required(input.tenantKey, "TENANT_KEY"),
    projectKey: required(input.projectKey, "PROJECT_KEY"),
    siteKey: required(input.siteKey, "SITE_KEY"),
    exceptionKind: input.exceptionKind,
    sourceExceptionRef: required(input.sourceExceptionRef, "SOURCE_EXCEPTION_REF"),
    sourceEvidenceSha256: input.sourceEvidenceSha256,
    actionabilityReceiptSha256: input.actionabilityReceiptSha256,
    workSummary,
    ownerGroup: input.ownerGroup,
    priority: input.priority,
    idempotencyKey: required(input.idempotencyKey, "IDEMPOTENCY_KEY"),
    authorityScope: "WORK_TRACKING_NON_AUTHORITATIVE" as const,
  };
  return { ...core, payloadSha256: hash(core) };
}

export function createHotelPlaneExceptionWorkOutboxRepository(
  database: HotelPlaneDatabase,
  adapter?: HotelPlaneWorkAdapter,
) {
  return {
    async enqueue(input: HotelPlaneExceptionWork): Promise<{ outboxId: string; replayed: boolean }> {
      const work = normalizeActionableHotelPlaneWork(input);
      const outboxId = randomUUID();
      const result = await database.query<{ id: string; inserted: boolean }>(
        `INSERT INTO crays_core.cclub_hotel_plane_exception_work_outbox (
           id, tenant_key, project_key, site_key, exception_kind, source_exception_ref,
           source_evidence_sha256, actionability_receipt_sha256, work_summary, owner_group,
           priority, payload_sha256, idempotency_key
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (tenant_key, idempotency_key) DO UPDATE
           SET idempotency_key = EXCLUDED.idempotency_key
         RETURNING id, (xmax = 0) AS inserted`,
        [outboxId, work.tenantKey, work.projectKey, work.siteKey, work.exceptionKind,
          work.sourceExceptionRef, work.sourceEvidenceSha256, work.actionabilityReceiptSha256,
          work.workSummary, work.ownerGroup, work.priority, work.payloadSha256, work.idempotencyKey],
      );
      const row = result.rows[0];
      if (!row) throw new Error("HOTEL_PLANE_WORK_NOT_PERSISTED");
      return { outboxId: row.id, replayed: !row.inserted };
    },

    async claim(input: {
      workerId: string;
      leaseSeconds: number;
    }): Promise<ClaimedHotelPlaneExceptionWork | null> {
      if (!Number.isInteger(input.leaseSeconds) || input.leaseSeconds < 5 || input.leaseSeconds > 3600) {
        throw new Error("HOTEL_PLANE_LEASE_SECONDS_INVALID");
      }
      const leaseToken = randomUUID();
      const result = await database.query<HotelPlaneExceptionWorkOutboxRow>(
        `WITH candidate AS (
           SELECT id FROM crays_core.cclub_hotel_plane_exception_work_outbox
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
         UPDATE crays_core.cclub_hotel_plane_exception_work_outbox outbox
            SET state = 'LEASED', lease_owner = $1, lease_token = $2,
                lease_expires_at = now() + make_interval(secs => $3),
                attempt_count = outbox.attempt_count + 1, last_failure_code = NULL
           FROM candidate WHERE outbox.id = candidate.id AND outbox.attempt_count < 12
         RETURNING outbox.*`,
        [required(input.workerId, "WORKER_ID"), leaseToken, input.leaseSeconds],
      );
      const row = result.rows[0];
      if (!row) return null;
      return {
        outboxId: row.id,
        tenantKey: row.tenant_key,
        projectKey: row.project_key,
        siteKey: row.site_key,
        exceptionKind: row.exception_kind,
        sourceExceptionRef: row.source_exception_ref,
        sourceEvidenceSha256: row.source_evidence_sha256,
        actionabilityReceiptSha256: row.actionability_receipt_sha256,
        workSummary: row.work_summary,
        ownerGroup: row.owner_group,
        priority: row.priority,
        idempotencyKey: row.idempotency_key,
        payloadSha256: row.payload_sha256,
        authorityScope: "WORK_TRACKING_NON_AUTHORITATIVE",
        leaseToken,
        attemptNumber: row.attempt_count,
      };
    },

    async deliver(claimed: ClaimedHotelPlaneExceptionWork): Promise<HotelPlaneDeliveryExecutionResult> {
      const observedAt = new Date().toISOString();
      if (!adapter) {
        return {
          plan: planHotelPlaneExceptionWorkDeliveryReconciliation(claimed, {
            kind: "provider_not_bound",
            observedAt,
            payloadSha256: claimed.payloadSha256,
          }),
          providerCallPerformed: false,
          databaseWritePerformed: false,
        };
      }

      let acknowledgement: Awaited<ReturnType<HotelPlaneWorkAdapter["deliver"]>>;
      try {
        acknowledgement = await adapter.deliver(claimed);
      } catch (error) {
        return {
          plan: planHotelPlaneExceptionWorkDeliveryReconciliation(claimed, {
            kind: "unknown_outcome",
            failureCode: "TRANSPORT_UNKNOWN_OUTCOME",
            transportEvidenceSha256: transportEvidence(error),
            observedAt,
            payloadSha256: claimed.payloadSha256,
          }),
          providerCallPerformed: true,
          databaseWritePerformed: false,
        };
      }

      let plan: HotelPlaneDeliveryReconciliationPlan;
      try {
        if (
          !SHA256.test(acknowledgement.planeWorkRefSha256) ||
          !SHA256.test(acknowledgement.adapterReceiptSha256) ||
          acknowledgement.payloadSha256 !== claimed.payloadSha256 ||
          acknowledgement.authorityScope !== "WORK_TRACKING_NON_AUTHORITATIVE"
        ) throw new Error("HOTEL_PLANE_ACK_INVALID");
        const acknowledgedAt = new Date(acknowledgement.acknowledgedAt);
        if (
          Number.isNaN(acknowledgedAt.getTime()) ||
          acknowledgedAt.toISOString() !== acknowledgement.acknowledgedAt
        ) throw new Error("HOTEL_PLANE_ACK_TIME_INVALID");
        plan = planHotelPlaneExceptionWorkDeliveryReconciliation(claimed, {
          kind: "acknowledged",
          observedAt: acknowledgement.acknowledgedAt,
          payloadSha256: acknowledgement.payloadSha256,
          planeWorkRefSha256: acknowledgement.planeWorkRefSha256,
          adapterReceiptSha256: acknowledgement.adapterReceiptSha256,
        });
      } catch (error) {
        return {
          plan: planHotelPlaneExceptionWorkDeliveryReconciliation(claimed, {
            kind: "unknown_outcome",
            failureCode: "ACK_EVIDENCE_INVALID",
            transportEvidenceSha256: transportEvidence(error),
            observedAt,
            payloadSha256: claimed.payloadSha256,
          }),
          providerCallPerformed: true,
          databaseWritePerformed: false,
        };
      }
      if (!plan.providerDeliveryClaimed || plan.state !== "delivered") {
        throw new Error("HOTEL_PLANE_ACK_PLAN_INVALID");
      }

      await database.transaction(async (transaction) => {
        const locked = await transaction.query<{
          state: string;
          lease_token: string;
          attempt_count: number;
          payload_sha256: string;
          idempotency_key: string;
        }>(
          `SELECT state, lease_token, attempt_count, payload_sha256, idempotency_key
             FROM crays_core.cclub_hotel_plane_exception_work_outbox WHERE id = $1 FOR UPDATE`,
          [claimed.outboxId],
        );
        const row = locked.rows[0];
        if (
          row?.state !== "LEASED" ||
          row.lease_token !== claimed.leaseToken ||
          Number(row.attempt_count) !== claimed.attemptNumber ||
          row.payload_sha256 !== claimed.payloadSha256 ||
          row.idempotency_key !== claimed.idempotencyKey
        ) {
          throw new Error("HOTEL_PLANE_LEASE_LOST");
        }
        await transaction.query(
          `INSERT INTO crays_core.cclub_hotel_plane_exception_work_receipt (
             id, outbox_id, plane_work_ref_sha256, adapter_receipt_sha256,
             payload_sha256, authority_scope, acknowledged_at
           ) VALUES ($1,$2,$3,$4,$5,'WORK_TRACKING_NON_AUTHORITATIVE',$6)`,
          [randomUUID(), claimed.outboxId, acknowledgement.planeWorkRefSha256,
            acknowledgement.adapterReceiptSha256, acknowledgement.payloadSha256,
            acknowledgement.acknowledgedAt],
        );
        const changed = await transaction.query(
          `UPDATE crays_core.cclub_hotel_plane_exception_work_outbox
              SET state = 'ACKNOWLEDGED', acknowledged_at = $3,
                  lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL
            WHERE id = $1 AND state = 'LEASED' AND lease_token = $2
              AND attempt_count = $4 AND payload_sha256 = $5 AND idempotency_key = $6`,
          [claimed.outboxId, claimed.leaseToken, acknowledgement.acknowledgedAt,
            claimed.attemptNumber, claimed.payloadSha256, claimed.idempotencyKey],
        );
        if (changed.rowCount !== 1) throw new Error("HOTEL_PLANE_ACK_CAS_FAILED");
      });
      return { plan, providerCallPerformed: true, databaseWritePerformed: true };
    },

    async reconcile(
      claimed: ClaimedHotelPlaneExceptionWork,
      observation: HotelPlaneDeliveryObservation,
    ): Promise<HotelPlaneDeliveryExecutionResult> {
      if (observation.kind === "acknowledged" || observation.kind === "reconciled") {
        throw new Error("HOTEL_PLANE_DELIVERY_EVIDENCE_REQUIRES_ACK_CAS");
      }
      const plan = planHotelPlaneExceptionWorkDeliveryReconciliation(claimed, observation);
      if (plan.state !== "retry") {
        return { plan, providerCallPerformed: false, databaseWritePerformed: false };
      }
      const result = await database.query(
        `UPDATE crays_core.cclub_hotel_plane_exception_work_outbox
            SET state = 'RETRY',
                next_attempt_at = now() + make_interval(secs => $3),
                last_failure_code = $4,
                lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL
          WHERE id = $1 AND state = 'LEASED' AND lease_token = $2
            AND attempt_count = $5 AND payload_sha256 = $6 AND idempotency_key = $7
            AND attempt_count < 12`,
        [
          claimed.outboxId,
          claimed.leaseToken,
          plan.retryAfterSeconds,
          `CONFIRMED_NOT_APPLIED:${plan.evidenceSha256}`,
          claimed.attemptNumber,
          claimed.payloadSha256,
          claimed.idempotencyKey,
        ],
      );
      if (result.rowCount !== 1) throw new Error("HOTEL_PLANE_RECONCILIATION_CAS_FAILED");
      return { plan, providerCallPerformed: false, databaseWritePerformed: true };
    },

    async recordStatusObservation(input: {
      workReceiptId: string;
      planeStatus: "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
      verifiedEventReceiptSha256: string;
      observedAt: string;
    }): Promise<{ observationId: string; replayed: boolean }> {
      if (!SHA256.test(input.verifiedEventReceiptSha256)) {
        throw new Error("HOTEL_PLANE_EVENT_RECEIPT_INVALID");
      }
      const observedAt = new Date(input.observedAt);
      if (Number.isNaN(observedAt.getTime())) throw new Error("HOTEL_PLANE_OBSERVED_AT_INVALID");
      const observationId = randomUUID();
      const result = await database.query<{ id: string; inserted: boolean }>(
        `INSERT INTO crays_core.cclub_hotel_plane_status_observation (
           id, work_receipt_id, plane_status, verified_event_receipt_sha256,
           authority_scope, observed_at
         ) VALUES ($1,$2,$3,$4,'OBSERVATION_ONLY_NO_BOOKING_MUTATION',$5)
         ON CONFLICT (work_receipt_id, verified_event_receipt_sha256) DO UPDATE
           SET verified_event_receipt_sha256 = EXCLUDED.verified_event_receipt_sha256
         RETURNING id, (xmax = 0) AS inserted`,
        [observationId, input.workReceiptId, input.planeStatus,
          input.verifiedEventReceiptSha256, observedAt.toISOString()],
      );
      const row = result.rows[0];
      if (!row) throw new Error("HOTEL_PLANE_OBSERVATION_NOT_PERSISTED");
      return { observationId: row.id, replayed: !row.inserted };
    },
  };
}
