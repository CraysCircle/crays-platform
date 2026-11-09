import { createHash, randomUUID } from "node:crypto";

export type HotelFinopsQueueKind = "FINANCE" | "OPERATIONS";
export type HotelFinopsSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type HotelFinopsSafeRetryAction =
  | "RECHECK_OBSERVATIONS"
  | "REDELIVER_IDEMPOTENT_OUTBOX"
  | "REPLAY_VERIFIED_WEBHOOK";

const SAFE_RETRY_ACTIONS: readonly HotelFinopsSafeRetryAction[] = [
  "RECHECK_OBSERVATIONS",
  "REDELIVER_IDEMPOTENT_OUTBOX",
  "REPLAY_VERIFIED_WEBHOOK",
];

interface QueryResult<Row> {
  rows: Row[];
  rowCount: number | null;
}

export interface HotelFinopsDatabase {
  query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
  transaction<T>(work: (database: HotelFinopsDatabase) => Promise<T>): Promise<T>;
}

export interface ClaimedHotelFinopsRetry {
  retryId: string;
  exceptionItemId: string;
  actionKind: HotelFinopsSafeRetryAction;
  idempotencyKey: string;
  attemptNumber: number;
  leaseToken: string;
}

export interface HotelFinopsSafeRetryExecutor {
  execute(command: ClaimedHotelFinopsRetry): Promise<{
    outcome: "SUCCEEDED" | "RETRYABLE_FAILURE" | "TERMINAL_FAILURE";
    receiptSha256: string;
    failureCode?: string;
  }>;
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`HOTEL_FINOPS_${field}_REQUIRED`);
  return normalized;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function assertHotelFinopsSafeRetryAction(value: string): HotelFinopsSafeRetryAction {
  if (!SAFE_RETRY_ACTIONS.includes(value as HotelFinopsSafeRetryAction)) {
    throw new Error("HOTEL_FINOPS_DESTRUCTIVE_OR_UNKNOWN_RETRY_FORBIDDEN");
  }
  return value as HotelFinopsSafeRetryAction;
}

export function routeHotelFinancialIssue(input: {
  issueKind: string;
  sourceSystem: string;
}): { queueKind: HotelFinopsQueueKind; severity: HotelFinopsSeverity } {
  if (["AMOUNT_MISMATCH", "CURRENCY_MISMATCH", "TAX_MISMATCH", "DUPLICATE"].includes(input.issueKind)) {
    return {
      queueKind: "FINANCE",
      severity: input.issueKind === "DUPLICATE" ? "CRITICAL" : "HIGH",
    };
  }
  return {
    queueKind: "OPERATIONS",
    severity: input.sourceSystem === "BOOKING" || input.sourceSystem === "ERP" ? "HIGH" : "MEDIUM",
  };
}

export function createHotelFinopsExceptionQueueRepository(
  database: HotelFinopsDatabase,
  executor: HotelFinopsSafeRetryExecutor,
) {
  return {
    async enqueueIssue(input: {
      tenantKey: string;
      projectKey: string;
      siteKey: string;
      reconciliationIssueId: string;
      issueKind: string;
      sourceSystem: string;
      actorSubject: string;
      issueEvidenceSha256: string;
    }): Promise<{ exceptionItemId: string; replayed: boolean }> {
      if (!SHA256_PATTERN.test(input.issueEvidenceSha256)) {
        throw new Error("HOTEL_FINOPS_ISSUE_EVIDENCE_HASH_INVALID");
      }
      const route = routeHotelFinancialIssue(input);
      return database.transaction(async (transaction) => {
        const exceptionItemId = randomUUID();
        const inserted = await transaction.query<{ id: string; inserted: boolean; version: number }>(
          `INSERT INTO crays_core.cclub_hotel_finops_exception_item (
             id, tenant_key, project_key, site_key, reconciliation_issue_id, queue_kind, severity
           ) VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (reconciliation_issue_id) DO UPDATE
             SET reconciliation_issue_id = EXCLUDED.reconciliation_issue_id
           RETURNING id, version, (xmax = 0) AS inserted`,
          [
            exceptionItemId,
            requiredText(input.tenantKey, "TENANT_KEY"),
            requiredText(input.projectKey, "PROJECT_KEY"),
            requiredText(input.siteKey, "SITE_KEY"),
            input.reconciliationIssueId,
            route.queueKind,
            route.severity,
          ],
        );
        const row = inserted.rows[0];
        if (!row) throw new Error("HOTEL_FINOPS_EXCEPTION_NOT_PERSISTED");
        if (row.inserted) {
          await transaction.query(
            `INSERT INTO crays_core.cclub_hotel_finops_exception_event (
               id, exception_item_id, event_kind, actor_subject, item_version, evidence_sha256
             ) VALUES ($1,$2,'OPENED',$3,$4,$5)`,
            [randomUUID(), row.id, requiredText(input.actorSubject, "ACTOR_SUBJECT"), row.version, input.issueEvidenceSha256],
          );
        }
        return { exceptionItemId: row.id, replayed: !row.inserted };
      });
    },

    async acquireOwnership(input: {
      exceptionItemId: string;
      ownerSubject: string;
      expectedVersion: number;
      evidenceSha256: string;
    }): Promise<number> {
      if (!SHA256_PATTERN.test(input.evidenceSha256)) throw new Error("HOTEL_FINOPS_OWNERSHIP_EVIDENCE_INVALID");
      return database.transaction(async (transaction) => {
        const changed = await transaction.query<{ version: number }>(
          `UPDATE crays_core.cclub_hotel_finops_exception_item
              SET state = 'OWNED', owner_subject = $2, ownership_acquired_at = now(), version = version + 1
            WHERE id = $1 AND state = 'OPEN' AND version = $3
          RETURNING version`,
          [input.exceptionItemId, requiredText(input.ownerSubject, "OWNER_SUBJECT"), input.expectedVersion],
        );
        const row = changed.rows[0];
        if (!row) throw new Error("HOTEL_FINOPS_OWNERSHIP_CAS_FAILED");
        await transaction.query(
          `INSERT INTO crays_core.cclub_hotel_finops_exception_event (
             id, exception_item_id, event_kind, actor_subject, item_version, evidence_sha256
           ) VALUES ($1,$2,'OWNERSHIP_ACQUIRED',$3,$4,$5)`,
          [randomUUID(), input.exceptionItemId, input.ownerSubject, row.version, input.evidenceSha256],
        );
        return row.version;
      });
    },

    async requestSafeRetry(input: {
      exceptionItemId: string;
      ownerSubject: string;
      expectedVersion: number;
      actionKind: string;
      reason: string;
      idempotencyKey: string;
    }): Promise<{ retryId: string; replayed: boolean }> {
      const actionKind = assertHotelFinopsSafeRetryAction(input.actionKind);
      const reasonSha256 = sha256(requiredText(input.reason, "RETRY_REASON"));
      return database.transaction(async (transaction) => {
        const locked = await transaction.query<{ owner_subject: string; state: string; version: number }>(
          `SELECT owner_subject, state, version
             FROM crays_core.cclub_hotel_finops_exception_item
            WHERE id = $1 FOR UPDATE`,
          [input.exceptionItemId],
        );
        const item = locked.rows[0];
        if (
          !item ||
          item.owner_subject !== input.ownerSubject ||
          !["OWNED", "RETRY_PENDING"].includes(item.state) ||
          item.version !== input.expectedVersion
        ) throw new Error("HOTEL_FINOPS_RETRY_REQUIRES_CURRENT_OWNER");

        const retryId = randomUUID();
        const inserted = await transaction.query<{ id: string; inserted: boolean }>(
          `INSERT INTO crays_core.cclub_hotel_finops_safe_retry (
             id, exception_item_id, action_kind, requested_by_subject, reason_sha256,
             idempotency_key, expected_item_version
           ) VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (exception_item_id, idempotency_key) DO UPDATE
             SET idempotency_key = EXCLUDED.idempotency_key
           RETURNING id, (xmax = 0) AS inserted`,
          [
            retryId,
            input.exceptionItemId,
            actionKind,
            input.ownerSubject,
            reasonSha256,
            requiredText(input.idempotencyKey, "IDEMPOTENCY_KEY"),
            input.expectedVersion,
          ],
        );
        const retry = inserted.rows[0];
        if (!retry) throw new Error("HOTEL_FINOPS_RETRY_NOT_PERSISTED");
        if (retry.inserted) {
          const changed = await transaction.query<{ version: number }>(
            `UPDATE crays_core.cclub_hotel_finops_exception_item
                SET state = 'RETRY_PENDING', version = version + 1
              WHERE id = $1 AND owner_subject = $2 AND version = $3
            RETURNING version`,
            [input.exceptionItemId, input.ownerSubject, input.expectedVersion],
          );
          const version = changed.rows[0]?.version;
          if (version === undefined) throw new Error("HOTEL_FINOPS_RETRY_ITEM_CAS_FAILED");
          await transaction.query(
            `INSERT INTO crays_core.cclub_hotel_finops_exception_event (
               id, exception_item_id, event_kind, actor_subject, item_version, evidence_sha256
             ) VALUES ($1,$2,'RETRY_REQUESTED',$3,$4,$5)`,
            [randomUUID(), input.exceptionItemId, input.ownerSubject, version, reasonSha256],
          );
        }
        return { retryId: retry.id, replayed: !retry.inserted };
      });
    },

    async claimSafeRetry(input: { workerId: string; leaseSeconds: number }): Promise<ClaimedHotelFinopsRetry | null> {
      if (!Number.isInteger(input.leaseSeconds) || input.leaseSeconds < 5 || input.leaseSeconds > 3600) {
        throw new Error("HOTEL_FINOPS_LEASE_SECONDS_INVALID");
      }
      const leaseToken = randomUUID();
      const claimed = await database.query<{
        id: string;
        exception_item_id: string;
        action_kind: HotelFinopsSafeRetryAction;
        idempotency_key: string;
        attempt_count: number;
      }>(
        `WITH candidate AS (
           SELECT id FROM crays_core.cclub_hotel_finops_safe_retry
            WHERE (state IN ('REQUESTED','RETRY') AND next_attempt_at <= now())
               OR (state = 'LEASED' AND lease_expires_at <= now())
            ORDER BY next_attempt_at, requested_at
            FOR UPDATE SKIP LOCKED LIMIT 1
         )
         UPDATE crays_core.cclub_hotel_finops_safe_retry retry
            SET state = 'LEASED', lease_owner = $1, lease_token = $2,
                lease_expires_at = now() + make_interval(secs => $3),
                attempt_count = retry.attempt_count + 1
           FROM candidate WHERE retry.id = candidate.id AND retry.attempt_count < 12
         RETURNING retry.id, retry.exception_item_id, retry.action_kind,
                   retry.idempotency_key, retry.attempt_count`,
        [requiredText(input.workerId, "WORKER_ID"), leaseToken, input.leaseSeconds],
      );
      const row = claimed.rows[0];
      return row
        ? {
            retryId: row.id,
            exceptionItemId: row.exception_item_id,
            actionKind: row.action_kind,
            idempotencyKey: row.idempotency_key,
            attemptNumber: row.attempt_count,
            leaseToken,
          }
        : null;
    },

    async executeClaimedRetry(command: ClaimedHotelFinopsRetry): Promise<void> {
      const result = await executor.execute(command);
      if (!SHA256_PATTERN.test(result.receiptSha256)) throw new Error("HOTEL_FINOPS_ADAPTER_RECEIPT_INVALID");
      await database.transaction(async (transaction) => {
        const locked = await transaction.query<{ state: string; lease_token: string }>(
          `SELECT state, lease_token FROM crays_core.cclub_hotel_finops_safe_retry WHERE id = $1 FOR UPDATE`,
          [command.retryId],
        );
        if (locked.rows[0]?.state !== "LEASED" || locked.rows[0]?.lease_token !== command.leaseToken) {
          throw new Error("HOTEL_FINOPS_RETRY_LEASE_LOST");
        }
        await transaction.query(
          `INSERT INTO crays_core.cclub_hotel_finops_safe_retry_receipt (
             id, retry_id, attempt_number, outcome, adapter_receipt_sha256
           ) VALUES ($1,$2,$3,$4,$5)`,
          [randomUUID(), command.retryId, command.attemptNumber, result.outcome, result.receiptSha256],
        );
        const nextState =
          result.outcome === "SUCCEEDED" ? "SUCCEEDED" :
          result.outcome === "RETRYABLE_FAILURE" && command.attemptNumber < 12 ? "RETRY" : "FAILED";
        const changed = await transaction.query(
          `UPDATE crays_core.cclub_hotel_finops_safe_retry
              SET state = $3,
                  result_sha256 = CASE WHEN $3 = 'SUCCEEDED' THEN $4 ELSE NULL END,
                  failure_code = CASE WHEN $3 <> 'SUCCEEDED' THEN $5 ELSE NULL END,
                  next_attempt_at = CASE WHEN $3 = 'RETRY' THEN now() + interval '5 minutes' ELSE next_attempt_at END,
                  completed_at = CASE WHEN $3 IN ('SUCCEEDED','FAILED') THEN now() ELSE NULL END,
                  lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL
            WHERE id = $1 AND state = 'LEASED' AND lease_token = $2`,
          [command.retryId, command.leaseToken, nextState, result.receiptSha256, result.failureCode ?? null],
        );
        if (changed.rowCount !== 1) throw new Error("HOTEL_FINOPS_RETRY_TERMINAL_CAS_FAILED");
        const eventKind = nextState === "SUCCEEDED" ? "RETRY_SUCCEEDED" : "RETRY_FAILED";
        await transaction.query(
          `INSERT INTO crays_core.cclub_hotel_finops_exception_event (
             id, exception_item_id, event_kind, actor_subject, item_version, evidence_sha256
           ) SELECT $1, id, $3, owner_subject, version, $4
               FROM crays_core.cclub_hotel_finops_exception_item WHERE id = $2`,
          [randomUUID(), command.exceptionItemId, eventKind, result.receiptSha256],
        );
        // Deliberately do not resolve or mutate the exception item here.
      });
    },

    async resolveOwnedItem(input: {
      exceptionItemId: string;
      ownerSubject: string;
      expectedVersion: number;
      cleanReconciliationRunId: string;
      cleanReconciliationEvidenceSha256: string;
    }): Promise<void> {
      if (!SHA256_PATTERN.test(input.cleanReconciliationEvidenceSha256)) {
        throw new Error("HOTEL_FINOPS_RESOLUTION_EVIDENCE_INVALID");
      }
      await database.transaction(async (transaction) => {
        const changed = await transaction.query<{ version: number }>(
          `UPDATE crays_core.cclub_hotel_finops_exception_item
              SET state = 'RESOLVED', resolution_code = 'RECONCILED_CLEAN',
                  resolution_reconciliation_run_id = $4, resolution_evidence_sha256 = $5,
                  resolved_at = now(), version = version + 1
            WHERE id = $1 AND owner_subject = $2 AND state IN ('OWNED','RETRY_PENDING') AND version = $3
          RETURNING version`,
          [
            input.exceptionItemId,
            input.ownerSubject,
            input.expectedVersion,
            requiredText(input.cleanReconciliationRunId, "CLEAN_RECONCILIATION_RUN_ID"),
            input.cleanReconciliationEvidenceSha256,
          ],
        );
        const version = changed.rows[0]?.version;
        if (version === undefined) throw new Error("HOTEL_FINOPS_RESOLUTION_CAS_FAILED");
        await transaction.query(
          `INSERT INTO crays_core.cclub_hotel_finops_exception_event (
             id, exception_item_id, event_kind, actor_subject, item_version, evidence_sha256
           ) VALUES ($1,$2,'RESOLVED',$3,$4,$5)`,
          [randomUUID(), input.exceptionItemId, input.ownerSubject, version, input.cleanReconciliationEvidenceSha256],
        );
      });
    },
  };
}

