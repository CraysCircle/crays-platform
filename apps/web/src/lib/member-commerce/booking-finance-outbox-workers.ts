import { createHash, randomUUID } from "node:crypto";

export type ExternalExecutionScope = "STRIPE_CONNECT_BOOKING_SPLIT" | "ERP_DISPATCH";

export type ExternalExecutionAuthorization = Readonly<{
  kind: "EXPLICIT_EXTERNAL_AUTHORIZATION";
  scope: ExternalExecutionScope;
  evidenceHash: string;
  authorizedAt: Date;
  validUntil: Date;
}>;

export type OutboxWorkerSqlClient = Readonly<{
  query: <Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ) => Promise<{ rowCount: number; rows: readonly Row[] }>;
}>;

export type OutboxWorkerDatabase = Readonly<{
  transaction: <T>(run: (client: OutboxWorkerSqlClient) => Promise<T>) => Promise<T>;
}>;

type RevenueCommand = Readonly<{
  id: string;
  tenant_id: string;
  idempotency_key: string;
  command_payload: unknown;
  attempt_count: number;
  lease_owner: string;
}>;

type ErpCommand = Readonly<{
  id: string;
  tenant_id: string;
  idempotency_key: string;
  payload_hash: string;
  attempt_count: number;
  lease_owner: string;
  posting_batch_id: string;
}>;

export type DispatchResult =
  | Readonly<{
      kind: "ACCEPTED";
      externalReference: string;
      responseHash: string;
    }>
  | Readonly<{
      kind: "REJECTED";
      errorCode: string;
      responseHash: string;
    }>
  | Readonly<{
      kind: "RETRYABLE_ERROR";
      errorCode: string;
      responseHash: string;
      retryAfterSeconds: number;
    }>
  | Readonly<{
      kind: "TERMINAL_ERROR";
      errorCode: string;
      responseHash: string;
    }>;

export type BookingSplitProvider = Readonly<{
  dispatchBookingSplit: (command: Readonly<{
    idempotencyKey: string;
    payload: unknown;
  }>) => Promise<DispatchResult>;
}>;

export type ErpProvider = Readonly<{
  dispatchPostingBatch: (command: Readonly<{
    idempotencyKey: string;
    postingBatchId: string;
    payloadHash: string;
  }>) => Promise<DispatchResult>;
}>;

export type OutboxWorkerResult =
  | Readonly<{ state: "NOT_AUTHORIZED"; scope: ExternalExecutionScope }>
  | Readonly<{ state: "IDLE" }>
  | Readonly<{ state: "DISPATCHED" | "RETRY_SCHEDULED" | "REJECTED" | "DEAD_LETTER"; outboxId: string }>;

function assertNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`OUTBOX_WORKER_EMPTY:${field}`);
  return normalized;
}

function assertSha256(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error(`OUTBOX_WORKER_INVALID_SHA256:${field}`);
  return normalized;
}

function isAuthorized(
  authorization: ExternalExecutionAuthorization | undefined,
  scope: ExternalExecutionScope,
  now: Date,
): boolean {
  if (!authorization || authorization.kind !== "EXPLICIT_EXTERNAL_AUTHORIZATION") return false;
  if (authorization.scope !== scope) return false;
  if (!Number.isFinite(authorization.authorizedAt.getTime()) || !Number.isFinite(authorization.validUntil.getTime())) {
    return false;
  }
  if (authorization.authorizedAt.getTime() > now.getTime() || authorization.validUntil.getTime() <= now.getTime()) {
    return false;
  }
  try {
    assertSha256(authorization.evidenceHash, "authorization.evidenceHash");
  } catch {
    return false;
  }
  return true;
}

function requestHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function safeFailureHash(error: unknown): string {
  const kind = error instanceof Error ? error.name : typeof error;
  return createHash("sha256").update(`provider-exception:${kind}`).digest("hex");
}

function safeRetrySeconds(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) return 60;
  return Math.min(value, 86_400);
}

export class BookingFinanceOutboxRepository {
  constructor(private readonly database: OutboxWorkerDatabase) {}

  async claimRevenue(
    tenantId: string,
    workerId: string,
    now: Date,
    leaseSeconds: number,
  ): Promise<RevenueCommand | undefined> {
    return this.database.transaction(async (client) => {
      await client.query("SELECT set_config('crays.app_role', 'core_service', true), set_config('crays.tenant_id', $1, true), set_config('app.tenant_id', $1, true)", [tenantId]);
      await client.query(
        `UPDATE "CraysClubBookingRevenueDispatchOutbox"
         SET "state" = 'RETRY', "lease_owner" = NULL, "lease_until" = NULL,
             "next_attempt_at" = LEAST("next_attempt_at", $2), "last_error_code" = 'LEASE_EXPIRED'
         WHERE "tenant_id" = $1 AND "state" = 'LEASED' AND "lease_until" <= $2`,
        [tenantId, now.toISOString()],
      );
      const claimed = await client.query<RevenueCommand>(
        `WITH candidate AS (
           SELECT "id"
           FROM "CraysClubBookingRevenueDispatchOutbox"
           WHERE "tenant_id" = $1 AND "state" IN ('PENDING', 'RETRY') AND "next_attempt_at" <= $3
           ORDER BY "next_attempt_at", "created_at", "id"
           FOR UPDATE SKIP LOCKED
           LIMIT 1
         )
         UPDATE "CraysClubBookingRevenueDispatchOutbox" o
         SET "state" = 'LEASED', "lease_owner" = $2,
             "lease_until" = $3::timestamptz + ($4::text || ' seconds')::interval,
             "attempt_count" = o."attempt_count" + 1
         FROM candidate
         WHERE o."id" = candidate."id"
         RETURNING o."id", o."tenant_id", o."idempotency_key", o."command_payload",
           o."attempt_count", o."lease_owner"`,
        [tenantId, workerId, now.toISOString(), leaseSeconds],
      );
      return claimed.rows[0];
    });
  }

  async claimErp(
    tenantId: string,
    workerId: string,
    now: Date,
    leaseSeconds: number,
  ): Promise<ErpCommand | undefined> {
    return this.database.transaction(async (client) => {
      await client.query("SELECT set_config('crays.app_role', 'core_service', true), set_config('crays.tenant_id', $1, true), set_config('app.tenant_id', $1, true)", [tenantId]);
      await client.query(
        `UPDATE "CraysClubErpDispatchOutbox"
         SET "state" = 'RETRY', "lease_owner" = NULL, "lease_until" = NULL,
             "next_attempt_at" = LEAST("next_attempt_at", $2), "last_error_code" = 'LEASE_EXPIRED'
         WHERE "tenant_id" = $1 AND "state" = 'LEASED' AND "lease_until" <= $2`,
        [tenantId, now.toISOString()],
      );
      const claimed = await client.query<ErpCommand>(
        `WITH candidate AS (
           SELECT "id"
           FROM "CraysClubErpDispatchOutbox"
           WHERE "tenant_id" = $1 AND "state" IN ('PENDING', 'RETRY') AND "next_attempt_at" <= $3
           ORDER BY "next_attempt_at", "created_at", "id"
           FOR UPDATE SKIP LOCKED
           LIMIT 1
         )
         UPDATE "CraysClubErpDispatchOutbox" o
         SET "state" = 'LEASED', "lease_owner" = $2,
             "lease_until" = $3::timestamptz + ($4::text || ' seconds')::interval,
             "attempt_count" = o."attempt_count" + 1
         FROM candidate
         WHERE o."id" = candidate."id"
         RETURNING o."id", o."tenant_id", o."idempotency_key", o."payload_hash",
           o."attempt_count", o."lease_owner", o."posting_batch_id"`,
        [tenantId, workerId, now.toISOString(), leaseSeconds],
      );
      return claimed.rows[0];
    });
  }

  async completeRevenue(
    command: RevenueCommand,
    result: DispatchResult,
    observedAt: Date,
  ): Promise<OutboxWorkerResult> {
    return this.database.transaction(async (client) => {
      await client.query("SELECT set_config('crays.app_role', 'core_service', true), set_config('crays.tenant_id', $1, true), set_config('app.tenant_id', $1, true)", [command.tenant_id]);
      const nextState = result.kind === "ACCEPTED"
        ? "DISPATCHED"
        : result.kind === "RETRYABLE_ERROR"
          ? "RETRY"
          : "DEAD_LETTER";
      const retryAt = result.kind === "RETRYABLE_ERROR"
        ? new Date(observedAt.getTime() + safeRetrySeconds(result.retryAfterSeconds) * 1_000)
        : observedAt;
      const updated = await client.query(
        `UPDATE "CraysClubBookingRevenueDispatchOutbox"
         SET "state" = $4, "lease_owner" = NULL, "lease_until" = NULL, "next_attempt_at" = $5,
             "provider_reference" = $6, "last_error_code" = $7
         WHERE "tenant_id" = $1 AND "id" = $2 AND "state" = 'LEASED' AND "lease_owner" = $3`,
        [
          command.tenant_id,
          command.id,
          command.lease_owner,
          nextState,
          retryAt.toISOString(),
          result.kind === "ACCEPTED" ? result.externalReference : null,
          result.kind === "ACCEPTED" ? null : result.errorCode,
        ],
      );
      if (updated.rowCount !== 1) throw new Error("REVENUE_OUTBOX_LEASE_LOST");
      await client.query(
        `INSERT INTO "CraysClubBookingRevenueDispatchReceipt" (
          "id", "tenant_id", "outbox_id", "attempt_number", "result_kind", "provider_reference",
          "request_hash", "response_hash", "observed_at"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          randomUUID(), command.tenant_id, command.id, command.attempt_count,
          result.kind, result.kind === "ACCEPTED" ? result.externalReference : null,
          requestHash(command.command_payload), assertSha256(result.responseHash, "revenue.responseHash"),
          observedAt.toISOString(),
        ],
      );
      return {
        state: result.kind === "ACCEPTED"
          ? "DISPATCHED"
          : result.kind === "RETRYABLE_ERROR"
            ? "RETRY_SCHEDULED"
            : "DEAD_LETTER",
        outboxId: command.id,
      };
    });
  }

  async completeErp(
    command: ErpCommand,
    result: DispatchResult,
    observedAt: Date,
  ): Promise<OutboxWorkerResult> {
    return this.database.transaction(async (client) => {
      await client.query("SELECT set_config('crays.app_role', 'core_service', true), set_config('crays.tenant_id', $1, true), set_config('app.tenant_id', $1, true)", [command.tenant_id]);
      const nextState = result.kind === "ACCEPTED"
        ? "ACKNOWLEDGED"
        : result.kind === "REJECTED"
          ? "REJECTED"
          : result.kind === "RETRYABLE_ERROR"
            ? "RETRY"
            : "DEAD_LETTER";
      const retryAt = result.kind === "RETRYABLE_ERROR"
        ? new Date(observedAt.getTime() + safeRetrySeconds(result.retryAfterSeconds) * 1_000)
        : observedAt;
      const updated = await client.query(
        `UPDATE "CraysClubErpDispatchOutbox"
         SET "state" = $4, "lease_owner" = NULL, "lease_until" = NULL, "next_attempt_at" = $5,
             "erp_reference" = $6, "last_error_code" = $7
         WHERE "tenant_id" = $1 AND "id" = $2 AND "state" = 'LEASED' AND "lease_owner" = $3`,
        [
          command.tenant_id,
          command.id,
          command.lease_owner,
          nextState,
          retryAt.toISOString(),
          result.kind === "ACCEPTED" ? result.externalReference : null,
          result.kind === "ACCEPTED" ? null : result.errorCode,
        ],
      );
      if (updated.rowCount !== 1) throw new Error("ERP_OUTBOX_LEASE_LOST");
      const receiptKind = result.kind === "ACCEPTED" ? "ACKNOWLEDGED" : result.kind;
      await client.query(
        `INSERT INTO "CraysClubErpDispatchReceipt" (
          "id", "tenant_id", "outbox_id", "attempt_number", "result_kind", "erp_reference",
          "request_hash", "response_hash", "observed_at"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          randomUUID(), command.tenant_id, command.id, command.attempt_count,
          receiptKind, result.kind === "ACCEPTED" ? result.externalReference : null,
          assertSha256(command.payload_hash, "erp.payloadHash"), assertSha256(result.responseHash, "erp.responseHash"),
          observedAt.toISOString(),
        ],
      );
      return {
        state: result.kind === "ACCEPTED"
          ? "DISPATCHED"
          : result.kind === "RETRYABLE_ERROR"
            ? "RETRY_SCHEDULED"
            : result.kind === "REJECTED"
              ? "REJECTED"
              : "DEAD_LETTER",
        outboxId: command.id,
      };
    });
  }
}

export async function runRevenueDispatchOnce(input: Readonly<{
  tenantId: string;
  workerId: string;
  leaseSeconds: number;
  now: Date;
  authorization?: ExternalExecutionAuthorization;
  repository: BookingFinanceOutboxRepository;
  provider: BookingSplitProvider;
}>): Promise<OutboxWorkerResult> {
  if (!isAuthorized(input.authorization, "STRIPE_CONNECT_BOOKING_SPLIT", input.now)) {
    return { state: "NOT_AUTHORIZED", scope: "STRIPE_CONNECT_BOOKING_SPLIT" };
  }
  const command = await input.repository.claimRevenue(
    assertNonEmpty(input.tenantId, "tenantId"),
    assertNonEmpty(input.workerId, "workerId"),
    input.now,
    input.leaseSeconds,
  );
  if (!command) return { state: "IDLE" };
  let result: DispatchResult;
  try {
    result = await input.provider.dispatchBookingSplit({
      idempotencyKey: command.idempotency_key,
      payload: command.command_payload,
    });
  } catch (error) {
    result = {
      kind: "RETRYABLE_ERROR",
      errorCode: "PROVIDER_EXCEPTION",
      responseHash: safeFailureHash(error),
      retryAfterSeconds: 60,
    };
  }
  return input.repository.completeRevenue(command, result, new Date());
}

export async function runErpDispatchOnce(
  input: CanonicalErpDispatchOnceInput | LegacyErpDispatchOnceInput,
): Promise<Awaited<ReturnType<BookingRevenueErpSequenceRunner>>> {
  if (!("sequence" in input)) {
    throw new Error("OUTBOX_WORKER_ERP_LEGACY_DELEGATION_FORBIDDEN");
  }
  const { runBookingRevenueErpSequence } = await import(
    "./booking-revenue-erp-sequence-orchestrator"
  );
  return runBookingRevenueErpSequence(input.sequence);
}

type BookingRevenueErpSequenceRunner =
  typeof import("./booking-revenue-erp-sequence-orchestrator").runBookingRevenueErpSequence;
type VendureOrderDispatchRunner =
  typeof import("./vendure-order-dispatch").executeVendureOrderDispatch;
type HotelTwentyOutboxRepository = Pick<
  ReturnType<
    typeof import("./hotel-twenty-crm-summary-outbox-repository").createHotelTwentyCrmSummaryOutboxRepository
  >,
  "claim" | "deliver" | "reconcile"
>;
type HotelPlaneOutboxRepository = Pick<
  ReturnType<
    typeof import("./hotel-plane-exception-work-outbox-repository").createHotelPlaneExceptionWorkOutboxRepository
  >,
  "claim" | "deliver" | "reconcile"
>;

export type LegacyErpDispatchOnceInput = Readonly<{
  tenantId: string;
  workerId: string;
  leaseSeconds: number;
  now: Date;
  authorization?: ExternalExecutionAuthorization;
  repository: BookingFinanceOutboxRepository;
  provider: ErpProvider;
}>;

export type CanonicalErpDispatchOnceInput = Readonly<{
  sequence: Parameters<BookingRevenueErpSequenceRunner>[0];
}>;

export type VendureDispatchOnceInput = Parameters<VendureOrderDispatchRunner>[0];

export type HotelTwentyDispatchOnceInput = Readonly<{
  repository: HotelTwentyOutboxRepository;
  workerId: string;
  leaseSeconds: number;
}>;

export type HotelPlaneDispatchOnceInput = Readonly<{
  repository: HotelPlaneOutboxRepository;
  workerId: string;
  leaseSeconds: number;
}>;

export async function runVendureDispatchOnce(
  input: VendureDispatchOnceInput,
): Promise<Awaited<ReturnType<VendureOrderDispatchRunner>>> {
  const { executeVendureOrderDispatch } = await import("./vendure-order-dispatch");
  return executeVendureOrderDispatch(input);
}

export async function runTwentyCrmSummaryDispatchOnce(
  input: HotelTwentyDispatchOnceInput,
): Promise<Awaited<ReturnType<HotelTwentyOutboxRepository["deliver"]>> | null> {
  const claimed = await input.repository.claim({
    workerId: input.workerId,
    leaseSeconds: input.leaseSeconds,
  });
  if (!claimed) return null;
  return input.repository.deliver(claimed);
}

export async function runPlaneExceptionWorkDispatchOnce(
  input: HotelPlaneDispatchOnceInput,
): Promise<Awaited<ReturnType<HotelPlaneOutboxRepository["deliver"]>> | null> {
  const claimed = await input.repository.claim({
    workerId: input.workerId,
    leaseSeconds: input.leaseSeconds,
  });
  if (!claimed) return null;
  return input.repository.deliver(claimed);
}

export type BookingFinanceNonStripeLanesInput = Readonly<{
  vendure: VendureDispatchOnceInput;
  erp: CanonicalErpDispatchOnceInput;
  twenty: HotelTwentyDispatchOnceInput;
  plane: HotelPlaneDispatchOnceInput;
}>;

export type BookingFinanceNonStripeLanesResult = Readonly<{
  vendure: Awaited<ReturnType<VendureOrderDispatchRunner>>;
  erp: Awaited<ReturnType<BookingRevenueErpSequenceRunner>>;
  twenty: Awaited<ReturnType<HotelTwentyOutboxRepository["deliver"]>> | null;
  plane: Awaited<ReturnType<HotelPlaneOutboxRepository["deliver"]>> | null;
}>;

export async function runBookingFinanceNonStripeLanesOnce(
  input: BookingFinanceNonStripeLanesInput,
): Promise<BookingFinanceNonStripeLanesResult> {
  const vendure = await runVendureDispatchOnce(input.vendure);
  const erp = await runErpDispatchOnce(input.erp);
  const twenty = await runTwentyCrmSummaryDispatchOnce(input.twenty);
  const plane = await runPlaneExceptionWorkDispatchOnce(input.plane);
  return Object.freeze({ vendure, erp, twenty, plane });
}
