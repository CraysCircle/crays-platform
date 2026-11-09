import { createHash, randomUUID } from "node:crypto";

export type HotelReconciliationSystem = "BOOKING" | "VENDURE" | "STRIPE" | "ERP";
export type HotelReconciliationStatusClass =
  | "FINANCIAL_SUCCESS"
  | "PENDING"
  | "EXCEPTION"
  | "REFUNDED"
  | "CANCELLED";
export type HotelReconciliationIssueKind =
  | "MISSING"
  | "DUPLICATE"
  | "AMOUNT_MISMATCH"
  | "CURRENCY_MISMATCH"
  | "TAX_MISMATCH"
  | "STATUS_MISMATCH";

export interface HotelFinancialFact {
  sourceSystem: HotelReconciliationSystem;
  logicalBookingKey: string;
  sourceObjectRef: string;
  amountMinor: number;
  currency: string;
  taxMinor: number;
  statusClass: HotelReconciliationStatusClass;
  observedAt: string;
}

export interface HotelFinancialIssue {
  logicalBookingKey: string;
  sourceSystem: HotelReconciliationSystem;
  issueKind: HotelReconciliationIssueKind;
  issueKey: string;
  expectedSha256: string | null;
  actualSha256: string | null;
  detailSha256: string;
}

export interface HotelFinancialReconciliationReport {
  observations: ReadonlyArray<HotelFinancialFact & { factSha256: string }>;
  issues: ReadonlyArray<HotelFinancialIssue>;
  terminalState: "CLEAN" | "EXCEPTION";
  reportSha256: string;
}

export interface HotelReconciliationRequest {
  tenantKey: string;
  projectKey: string;
  siteKey: string;
  triggerMode: "SCHEDULED" | "ON_DEMAND";
  requestedBySubject: string;
  windowStart: string;
  windowEnd: string;
  idempotencyKey: string;
}

export interface ClaimedHotelReconciliationRun extends HotelReconciliationRequest {
  runId: string;
  leaseToken: string;
  attemptCount: number;
}

interface QueryResult<Row> {
  rows: Row[];
  rowCount: number | null;
}

export interface HotelReconciliationDatabase {
  query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
  transaction<T>(work: (database: HotelReconciliationDatabase) => Promise<T>): Promise<T>;
}

export interface HotelReconciliationCollector {
  collect(run: ClaimedHotelReconciliationRun): Promise<ReadonlyArray<HotelFinancialFact>>;
}

const SYSTEMS: readonly HotelReconciliationSystem[] = ["BOOKING", "VENDURE", "STRIPE", "ERP"];
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`HOTEL_RECONCILIATION_${field}_REQUIRED`);
  return normalized;
}

function isoInstant(value: string, field: string): string {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(`HOTEL_RECONCILIATION_${field}_INVALID`);
  return new Date(milliseconds).toISOString();
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function normalizeFact(fact: HotelFinancialFact): HotelFinancialFact & { factSha256: string } {
  if (!SYSTEMS.includes(fact.sourceSystem)) throw new Error("HOTEL_RECONCILIATION_SOURCE_SYSTEM_INVALID");
  if (!Number.isSafeInteger(fact.amountMinor) || fact.amountMinor < 0) {
    throw new Error("HOTEL_RECONCILIATION_AMOUNT_MINOR_INVALID");
  }
  if (!Number.isSafeInteger(fact.taxMinor) || fact.taxMinor < 0 || fact.taxMinor > fact.amountMinor) {
    throw new Error("HOTEL_RECONCILIATION_TAX_MINOR_INVALID");
  }
  const currency = fact.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("HOTEL_RECONCILIATION_CURRENCY_INVALID");
  const normalized: HotelFinancialFact = {
    sourceSystem: fact.sourceSystem,
    logicalBookingKey: requiredText(fact.logicalBookingKey, "LOGICAL_BOOKING_KEY"),
    sourceObjectRef: requiredText(fact.sourceObjectRef, "SOURCE_OBJECT_REF"),
    amountMinor: fact.amountMinor,
    currency,
    taxMinor: fact.taxMinor,
    statusClass: fact.statusClass,
    observedAt: isoInstant(fact.observedAt, "OBSERVED_AT"),
  };
  return { ...normalized, factSha256: sha256(normalized) };
}

function issue(
  logicalBookingKey: string,
  sourceSystem: HotelReconciliationSystem,
  issueKind: HotelReconciliationIssueKind,
  expected: unknown,
  actual: unknown,
): HotelFinancialIssue {
  const issueKey = `${logicalBookingKey}:${sourceSystem}:${issueKind}`;
  return {
    logicalBookingKey,
    sourceSystem,
    issueKind,
    issueKey,
    expectedSha256: expected === null ? null : sha256(expected),
    actualSha256: actual === null ? null : sha256(actual),
    detailSha256: sha256({ issueKey, expected, actual }),
  };
}

export function reconcileHotelFinancialFacts(
  facts: ReadonlyArray<HotelFinancialFact>,
): HotelFinancialReconciliationReport {
  const observations = facts.map(normalizeFact).sort((left, right) =>
    [left.logicalBookingKey, left.sourceSystem, left.sourceObjectRef].join("\u0000").localeCompare(
      [right.logicalBookingKey, right.sourceSystem, right.sourceObjectRef].join("\u0000"),
    ),
  );
  const bookingKeys = [...new Set(observations.map((fact) => fact.logicalBookingKey))].sort();
  const issues: HotelFinancialIssue[] = [];

  for (const logicalBookingKey of bookingKeys) {
    const bySystem = new Map<HotelReconciliationSystem, typeof observations>();
    for (const system of SYSTEMS) {
      bySystem.set(
        system,
        observations.filter(
          (fact) => fact.logicalBookingKey === logicalBookingKey && fact.sourceSystem === system,
        ),
      );
    }
    const bookingFacts = bySystem.get("BOOKING") ?? [];
    for (const system of SYSTEMS) {
      const systemFacts = bySystem.get(system) ?? [];
      if (systemFacts.length === 0) {
        issues.push(issue(logicalBookingKey, system, "MISSING", { cardinality: 1 }, null));
      } else if (systemFacts.length > 1) {
        issues.push(
          issue(
            logicalBookingKey,
            system,
            "DUPLICATE",
            { cardinality: 1 },
            { cardinality: systemFacts.length, factSha256: systemFacts.map((fact) => fact.factSha256) },
          ),
        );
      }
    }
    if (bookingFacts.length !== 1) continue;
    const expected = bookingFacts[0];
    for (const system of SYSTEMS.filter((candidate) => candidate !== "BOOKING")) {
      const actualFacts = bySystem.get(system) ?? [];
      if (actualFacts.length !== 1) continue;
      const actual = actualFacts[0];
      if (actual.amountMinor !== expected.amountMinor) {
        issues.push(issue(logicalBookingKey, system, "AMOUNT_MISMATCH", expected.amountMinor, actual.amountMinor));
      }
      if (actual.currency !== expected.currency) {
        issues.push(issue(logicalBookingKey, system, "CURRENCY_MISMATCH", expected.currency, actual.currency));
      }
      if (actual.taxMinor !== expected.taxMinor) {
        issues.push(issue(logicalBookingKey, system, "TAX_MISMATCH", expected.taxMinor, actual.taxMinor));
      }
      if (actual.statusClass !== expected.statusClass) {
        issues.push(issue(logicalBookingKey, system, "STATUS_MISMATCH", expected.statusClass, actual.statusClass));
      }
    }
  }

  issues.sort((left, right) => left.issueKey.localeCompare(right.issueKey));
  const terminalState = issues.length === 0 ? "CLEAN" : "EXCEPTION";
  const reportSha256 = sha256({
    terminalState,
    observations: observations.map((fact) => fact.factSha256),
    issues: issues.map((finding) => finding.detailSha256),
  });
  if (!SHA256_PATTERN.test(reportSha256)) throw new Error("HOTEL_RECONCILIATION_REPORT_HASH_INVALID");
  return { observations, issues, terminalState, reportSha256 };
}

function normalizeRequest(request: HotelReconciliationRequest): HotelReconciliationRequest {
  const windowStart = isoInstant(request.windowStart, "WINDOW_START");
  const windowEnd = isoInstant(request.windowEnd, "WINDOW_END");
  if (Date.parse(windowStart) >= Date.parse(windowEnd)) {
    throw new Error("HOTEL_RECONCILIATION_WINDOW_ORDER_INVALID");
  }
  return {
    tenantKey: requiredText(request.tenantKey, "TENANT_KEY"),
    projectKey: requiredText(request.projectKey, "PROJECT_KEY"),
    siteKey: requiredText(request.siteKey, "SITE_KEY"),
    triggerMode: request.triggerMode,
    requestedBySubject: requiredText(request.requestedBySubject, "REQUESTED_BY_SUBJECT"),
    windowStart,
    windowEnd,
    idempotencyKey: requiredText(request.idempotencyKey, "IDEMPOTENCY_KEY"),
  };
}

export function createHotelFinancialReconciliationRepository(
  database: HotelReconciliationDatabase,
  collector: HotelReconciliationCollector,
) {
  return {
    async requestRun(request: HotelReconciliationRequest): Promise<{ runId: string; replayed: boolean }> {
      const normalized = normalizeRequest(request);
      const runId = randomUUID();
      const result = await database.query<{ id: string; inserted: boolean }>(
        `INSERT INTO crays_core.cclub_hotel_financial_reconciliation_run (
           id, tenant_key, project_key, site_key, trigger_mode, requested_by_subject,
           reconciliation_window_start, reconciliation_window_end, idempotency_key
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (tenant_key, idempotency_key) DO UPDATE
           SET idempotency_key = EXCLUDED.idempotency_key
         RETURNING id, (xmax = 0) AS inserted`,
        [
          runId,
          normalized.tenantKey,
          normalized.projectKey,
          normalized.siteKey,
          normalized.triggerMode,
          normalized.requestedBySubject,
          normalized.windowStart,
          normalized.windowEnd,
          normalized.idempotencyKey,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("HOTEL_RECONCILIATION_REQUEST_NOT_PERSISTED");
      return { runId: row.id, replayed: !row.inserted };
    },

    async claimNextRun(input: {
      workerId: string;
      leaseSeconds: number;
    }): Promise<ClaimedHotelReconciliationRun | null> {
      const workerId = requiredText(input.workerId, "WORKER_ID");
      if (!Number.isInteger(input.leaseSeconds) || input.leaseSeconds < 5 || input.leaseSeconds > 3600) {
        throw new Error("HOTEL_RECONCILIATION_LEASE_SECONDS_INVALID");
      }
      const leaseToken = randomUUID();
      const result = await database.query<{
        id: string;
        tenant_key: string;
        project_key: string;
        site_key: string;
        trigger_mode: "SCHEDULED" | "ON_DEMAND";
        requested_by_subject: string;
        reconciliation_window_start: string;
        reconciliation_window_end: string;
        idempotency_key: string;
        attempt_count: number;
      }>(
        `WITH candidate AS (
           SELECT id
             FROM crays_core.cclub_hotel_financial_reconciliation_run
            WHERE (
              state IN ('PENDING','RETRY') AND next_attempt_at <= now()
            ) OR (
              state = 'RUNNING' AND lease_expires_at <= now()
            )
            ORDER BY next_attempt_at, requested_at
            FOR UPDATE SKIP LOCKED
            LIMIT 1
         )
         UPDATE crays_core.cclub_hotel_financial_reconciliation_run run
            SET state = 'RUNNING', lease_owner = $1, lease_token = $2,
                lease_expires_at = now() + make_interval(secs => $3),
                attempt_count = run.attempt_count + 1,
                started_at = COALESCE(run.started_at, now()), failure_code = NULL
           FROM candidate
          WHERE run.id = candidate.id
         RETURNING run.id, run.tenant_key, run.project_key, run.site_key, run.trigger_mode,
                   run.requested_by_subject, run.reconciliation_window_start,
                   run.reconciliation_window_end, run.idempotency_key, run.attempt_count`,
        [workerId, leaseToken, input.leaseSeconds],
      );
      const row = result.rows[0];
      if (!row) return null;
      return {
        runId: row.id,
        tenantKey: row.tenant_key,
        projectKey: row.project_key,
        siteKey: row.site_key,
        triggerMode: row.trigger_mode,
        requestedBySubject: row.requested_by_subject,
        windowStart: new Date(row.reconciliation_window_start).toISOString(),
        windowEnd: new Date(row.reconciliation_window_end).toISOString(),
        idempotencyKey: row.idempotency_key,
        leaseToken,
        attemptCount: row.attempt_count,
      };
    },

    async executeClaimedRun(run: ClaimedHotelReconciliationRun): Promise<HotelFinancialReconciliationReport> {
      const facts = await collector.collect(run);
      const report = reconcileHotelFinancialFacts(facts);
      await database.transaction(async (transaction) => {
        const locked = await transaction.query<{ state: string; lease_token: string }>(
          `SELECT state, lease_token
             FROM crays_core.cclub_hotel_financial_reconciliation_run
            WHERE id = $1
            FOR UPDATE`,
          [run.runId],
        );
        if (locked.rows[0]?.state !== "RUNNING" || locked.rows[0]?.lease_token !== run.leaseToken) {
          throw new Error("HOTEL_RECONCILIATION_LEASE_LOST");
        }
        for (const observation of report.observations) {
          await transaction.query(
            `INSERT INTO crays_core.cclub_hotel_financial_reconciliation_observation (
               id, run_id, source_system, logical_booking_key, source_object_ref,
               amount_minor, currency, tax_minor, status_class, fact_sha256, observed_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [
              randomUUID(),
              run.runId,
              observation.sourceSystem,
              observation.logicalBookingKey,
              observation.sourceObjectRef,
              observation.amountMinor,
              observation.currency,
              observation.taxMinor,
              observation.statusClass,
              observation.factSha256,
              observation.observedAt,
            ],
          );
        }
        for (const finding of report.issues) {
          await transaction.query(
            `INSERT INTO crays_core.cclub_hotel_financial_reconciliation_issue (
               id, run_id, logical_booking_key, source_system, issue_kind, issue_key,
               expected_sha256, actual_sha256, detail_sha256
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              randomUUID(),
              run.runId,
              finding.logicalBookingKey,
              finding.sourceSystem,
              finding.issueKind,
              finding.issueKey,
              finding.expectedSha256,
              finding.actualSha256,
              finding.detailSha256,
            ],
          );
        }
        const completed = await transaction.query(
          `UPDATE crays_core.cclub_hotel_financial_reconciliation_run
              SET state = $3, observation_count = $4, issue_count = $5, report_sha256 = $6,
                  completed_at = now(), lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL
            WHERE id = $1 AND state = 'RUNNING' AND lease_token = $2`,
          [
            run.runId,
            run.leaseToken,
            report.terminalState,
            report.observations.length,
            report.issues.length,
            report.reportSha256,
          ],
        );
        if (completed.rowCount !== 1) throw new Error("HOTEL_RECONCILIATION_TERMINAL_CAS_FAILED");
      });
      return report;
    },

    async recordFailure(input: {
      runId: string;
      leaseToken: string;
      failureCode: string;
      retryable: boolean;
      retryAfterSeconds?: number;
    }): Promise<void> {
      const failureCode = requiredText(input.failureCode, "FAILURE_CODE");
      const retryAfterSeconds = input.retryAfterSeconds ?? 60;
      if (!Number.isInteger(retryAfterSeconds) || retryAfterSeconds < 1 || retryAfterSeconds > 86400) {
        throw new Error("HOTEL_RECONCILIATION_RETRY_AFTER_INVALID");
      }
      const result = await database.query(
        `UPDATE crays_core.cclub_hotel_financial_reconciliation_run
            SET state = $3, failure_code = $4,
                next_attempt_at = CASE WHEN $3 = 'RETRY' THEN now() + make_interval(secs => $5) ELSE next_attempt_at END,
                completed_at = CASE WHEN $3 = 'FAILED' THEN now() ELSE NULL END,
                lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL
          WHERE id = $1 AND state = 'RUNNING' AND lease_token = $2`,
        [input.runId, input.leaseToken, input.retryable ? "RETRY" : "FAILED", failureCode, retryAfterSeconds],
      );
      if (result.rowCount !== 1) throw new Error("HOTEL_RECONCILIATION_FAILURE_CAS_FAILED");
    },
  };
}

