import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";

import { getCorePgPool } from "@/db/client";
import type { CraysCommerceAdapter, VendureProviderEvent } from "./vendure-http-adapter";

const providerEventSchema = z.object({
  tenantId: z.string().min(1),
  providerEventId: z.string().min(1).max(200),
  eventType: z.enum([
    "order-settled",
    "fulfillment-shipped",
    "return-received",
    "refund-settled",
    "order-cancelled",
  ]),
  orderId: z.string().uuid(),
  providerOrderId: z.string().min(1),
  aggregateType: z.enum(["order", "fulfillment", "return", "refund"]),
  aggregateId: z.string().min(1),
  amountMinor: z.number().int().nonnegative().nullable(),
  currencyCode: z.string().regex(/^[A-Z]{3}$/).nullable(),
  providerState: z.string().min(1),
  occurredAt: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()),
});

export type CommerceProviderEvent = z.infer<typeof providerEventSchema>;

const eventTypeMap = {
  "order-settled": "retail.order.settled",
  "fulfillment-shipped": "retail.fulfillment.shipped",
  "return-received": "retail.return.received",
  "refund-settled": "retail.refund.settled",
  "order-cancelled": "retail.order.cancelled",
} as const;

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function ingestCommerceProviderEvent(raw: unknown): Promise<{
  status: "applied" | "duplicate";
  projectionId: string;
  outboxEventId: string;
}> {
  const event = providerEventSchema.parse(raw);
  return transaction(async (client) => {
    const existing = await client.query<{ projection_id: string; outbox_event_id: string }>(
      `select projection_id, outbox_event_id
         from crays_core.commerce_erp_projection_receipts
        where tenant_id = $1 and provider_event_id = $2`,
      [event.tenantId, event.providerEventId],
    );
    if (existing.rows[0]) {
      await client.query(
        `update crays_core.commerce_provider_event_receipts
            set processing_state = 'duplicate', processed_at = now(), reason_code = 'IDEMPOTENT_REPLAY'
          where tenant_id = $1 and provider = 'vendure' and provider_event_id = $2`,
        [event.tenantId, event.providerEventId],
      );
      return {
        status: "duplicate" as const,
        projectionId: existing.rows[0].projection_id,
        outboxEventId: existing.rows[0].outbox_event_id,
      };
    }

    const payloadHash = sha256(event.payload);
    const receiptId = randomUUID();
    const outboxEventId = randomUUID();
    const projectionId = randomUUID();
    const correlationId = `commerce:${event.providerEventId}`;
    const idempotencyKey = `vendure:${event.providerEventId}:${event.eventType}`;
    const projectionPayload = {
      providerOrderId: event.providerOrderId,
      providerState: event.providerState,
      amountMinor: event.amountMinor,
      currencyCode: event.currencyCode,
      payloadSha256: payloadHash,
    };

    await client.query(
      `insert into crays_core.commerce_provider_event_receipts
        (provider_event_receipt_id, tenant_id, provider, provider_event_id, event_type,
         payload_sha256, processing_state, aggregate_type, aggregate_id, correlation_id,
         received_at, processed_at)
       values ($1, $2, 'vendure', $3, $4, $5, 'applied', $6, $7, $8, now(), now())`,
      [
        receiptId, event.tenantId, event.providerEventId, event.eventType, payloadHash,
        event.aggregateType, event.aggregateId, correlationId,
      ],
    );
    await client.query(
      `insert into crays_core.domain_event_outbox
        (event_id, tenant_id, event_type, schema_version, aggregate_type, aggregate_id,
         correlation_id, idempotency_key, payload, metadata, occurred_at)
       values ($1, $2, $3, 1, 'retail-order', $4, $5, $6, $7::jsonb,
               '{"source":"vendure","destination":"erp","containsPersonalData":false}'::jsonb, $8)`,
      [
        outboxEventId, event.tenantId, eventTypeMap[event.eventType], event.orderId,
        correlationId, idempotencyKey, JSON.stringify(projectionPayload), event.occurredAt,
      ],
    );
    await client.query(
      `insert into crays_core.commerce_erp_projection_receipts
        (projection_id, tenant_id, order_id, outbox_event_id, event_type,
         provider_event_id, idempotency_key, projection_payload_sha256, erp_state, occurred_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)`,
      [
        projectionId, event.tenantId, event.orderId, outboxEventId, event.eventType,
        event.providerEventId, idempotencyKey, sha256(projectionPayload), event.occurredAt,
      ],
    );
    return { status: "applied" as const, projectionId, outboxEventId };
  });
}

export async function recordErpDeliveryAttempt(input: {
  tenantId: string;
  projectionId: string;
  request: Record<string, unknown>;
  result:
    | { state: "accepted"; acknowledgementId: string; documentReference: string }
    | { state: "rejected" | "provider-outage" | "timed-out"; errorCode: string };
}): Promise<{ attemptNumber: number; erpState: string; retryAt: string | null }> {
  return transaction(async (client) => {
    const locked = await client.query<{ retry_count: number; erp_state: string }>(
      `select retry_count, erp_state
         from crays_core.commerce_erp_projection_receipts
        where tenant_id = $1 and projection_id = $2
        for update`,
      [input.tenantId, input.projectionId],
    );
    if (!locked.rows[0]) throw new Error("COMMERCE_ERP_PROJECTION_NOT_FOUND");
    if (["accepted", "reconciled", "dead-letter"].includes(locked.rows[0].erp_state)) {
      throw new Error("COMMERCE_ERP_PROJECTION_TERMINAL");
    }
    const attemptNumber = locked.rows[0].retry_count + 1;
    const exhausted = input.result.state !== "accepted" && attemptNumber >= 8;
    const retryAt = input.result.state === "accepted" || exhausted
      ? null
      : new Date(Date.now() + Math.min(30 * 2 ** (attemptNumber - 1), 3_600) * 1_000).toISOString();
    const erpState = input.result.state === "accepted" ? "accepted" : exhausted ? "dead-letter" : "rejected";

    await client.query(
      `insert into crays_core.commerce_erp_delivery_attempts
        (delivery_attempt_id, tenant_id, projection_id, attempt_number, attempt_state,
         request_sha256, erp_acknowledgement_id, erp_document_reference, error_code,
         retry_at, started_at, completed_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())`,
      [
        randomUUID(), input.tenantId, input.projectionId, attemptNumber,
        exhausted ? "dead-letter" : input.result.state,
        sha256(input.request),
        input.result.state === "accepted" ? input.result.acknowledgementId : null,
        input.result.state === "accepted" ? input.result.documentReference : null,
        input.result.state === "accepted" ? null : input.result.errorCode,
        retryAt,
      ],
    );
    await client.query(
      `update crays_core.commerce_erp_projection_receipts
          set erp_state = $1,
              erp_acknowledgement_id = $2,
              erp_document_reference = $3,
              retry_count = $4,
              next_attempt_at = $5,
              last_error_code = $6,
              acknowledged_at = case when $1 = 'accepted' then now() else acknowledged_at end,
              dead_lettered_at = case when $1 = 'dead-letter' then now() else dead_lettered_at end,
              updated_at = now()
        where tenant_id = $7 and projection_id = $8`,
      [
        erpState,
        input.result.state === "accepted" ? input.result.acknowledgementId : null,
        input.result.state === "accepted" ? input.result.documentReference : null,
        attemptNumber,
        retryAt,
        input.result.state === "accepted" ? null : input.result.errorCode,
        input.tenantId,
        input.projectionId,
      ],
    );
    return { attemptNumber, erpState, retryAt };
  });
}

export function classifyCommerceErpObservation(input: {
  providerReachable: boolean;
  duplicateCount: number;
  expectedState: string;
  observedState: string | null;
  expectedAmountMinor: number | null;
  observedAmountMinor: number | null;
  expectedCurrencyCode: string | null;
  observedCurrencyCode: string | null;
  acknowledgementAt: string | null;
  deadlinePassed: boolean;
  deadLettered: boolean;
}): string | null {
  if (input.deadLettered) return "dead-letter";
  if (!input.providerReachable) return "provider-outage";
  if (input.duplicateCount > 1) return "duplicate";
  if (input.expectedAmountMinor !== input.observedAmountMinor) return "amount-mismatch";
  if (input.expectedCurrencyCode !== input.observedCurrencyCode) return "currency-mismatch";
  if (input.observedState !== input.expectedState) return input.observedState === null ? "delayed" : "state-mismatch";
  if (!input.acknowledgementAt && input.deadlinePassed) return "missing-acknowledgement";
  return null;
}

export async function persistCommerceErpObservation(input: {
  tenantId: string;
  projectionId: string;
  orderId: string;
  providerReachable: boolean;
  duplicateCount: number;
  expectedState: string;
  observedState: string | null;
  expectedAmountMinor: number | null;
  observedAmountMinor: number | null;
  expectedCurrencyCode: string | null;
  observedCurrencyCode: string | null;
  acknowledgementAt: string | null;
  acknowledgementDeadlineAt: string | null;
  deadlinePassed: boolean;
  deadLettered: boolean;
}): Promise<{ observationId: string; failureMode: string | null }> {
  const failureMode = classifyCommerceErpObservation(input);
  const observationId = randomUUID();
  await transaction(async (client) => {
    await client.query(
      `insert into crays_core.commerce_erp_reconciliation_observations
        (observation_id, tenant_id, projection_id, failure_mode, provider_reachable,
         duplicate_count, expected_state, observed_state, expected_amount_minor,
         observed_amount_minor, expected_currency_code, observed_currency_code,
         acknowledgement_deadline_at, checked_at, evidence)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now(), $14::jsonb)`,
      [
        observationId, input.tenantId, input.projectionId, failureMode,
        input.providerReachable, input.duplicateCount, input.expectedState,
        input.observedState, input.expectedAmountMinor, input.observedAmountMinor,
        input.expectedCurrencyCode, input.observedCurrencyCode,
        input.acknowledgementDeadlineAt,
        JSON.stringify({ acknowledgementAt: input.acknowledgementAt, deadLettered: input.deadLettered }),
      ],
    );
    if (!failureMode) {
      await client.query(
        `update crays_core.commerce_erp_projection_receipts
            set erp_state = 'reconciled', updated_at = now()
          where tenant_id = $1 and projection_id = $2 and erp_state = 'accepted'`,
        [input.tenantId, input.projectionId],
      );
      return;
    }
    const exceptionType = {
      duplicate: "duplicate-event",
      delayed: "missing-acknowledgement",
      "amount-mismatch": "amount-mismatch",
      "currency-mismatch": "currency-mismatch",
      "state-mismatch": "state-mismatch",
      "provider-outage": "provider-outage",
      "dead-letter": "dead-letter",
      "missing-acknowledgement": "missing-acknowledgement",
    }[failureMode];
    const severity = ["dead-letter", "amount-mismatch", "currency-mismatch"].includes(failureMode)
      ? "urgent"
      : "attention";
    await client.query(
      `insert into crays_core.commerce_erp_reconciliation_exceptions
        (exception_id, tenant_id, order_id, projection_id, exception_type, severity,
         expected_snapshot, observed_snapshot, state, opened_at)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, 'open', now())
       on conflict (tenant_id, projection_id, exception_type)
       do update set
         severity = excluded.severity,
         expected_snapshot = excluded.expected_snapshot,
         observed_snapshot = excluded.observed_snapshot,
         state = case when commerce_erp_reconciliation_exceptions.state in ('resolved', 'dismissed')
                      then 'open' else commerce_erp_reconciliation_exceptions.state end,
         opened_at = case when commerce_erp_reconciliation_exceptions.state in ('resolved', 'dismissed')
                          then now() else commerce_erp_reconciliation_exceptions.opened_at end,
         resolved_at = null,
         resolution_note = null`,
      [
        randomUUID(), input.tenantId, input.orderId, input.projectionId,
        exceptionType, severity,
        JSON.stringify({
          state: input.expectedState,
          amountMinor: input.expectedAmountMinor,
          currencyCode: input.expectedCurrencyCode,
        }),
        JSON.stringify({
          state: input.observedState,
          amountMinor: input.observedAmountMinor,
          currencyCode: input.observedCurrencyCode,
          providerReachable: input.providerReachable,
          duplicateCount: input.duplicateCount,
        }),
      ],
    );
  });
  return { observationId, failureMode };
}

async function resolveCoreOrderForProviderEvent(
  tenantId: string,
  event: VendureProviderEvent,
): Promise<{ orderId: string; providerOrderId: string }> {
  const providerOrderId = typeof event.payload.providerOrderId === "string"
    ? event.payload.providerOrderId
    : null;
  const providerPaymentId = typeof event.payload.providerPaymentId === "string"
    ? event.payload.providerPaymentId
    : null;
  const result = providerOrderId
    ? await getCorePgPool().query<{ order_id: string; provider_order_id: string }>(
      `select order_id, provider_order_id
         from crays_core.member_retail_orders
        where tenant_id = $1 and provider_order_id = $2`,
      [tenantId, providerOrderId],
    )
    : providerPaymentId
      ? await getCorePgPool().query<{ order_id: string; provider_order_id: string }>(
        `select o.order_id, o.provider_order_id
           from crays_core.member_retail_payments p
           join crays_core.member_retail_orders o on o.order_id = p.order_id
          where p.tenant_id = $1 and p.provider_payment_id = $2`,
        [tenantId, providerPaymentId],
      )
      : { rows: [] };
  const row = result.rows[0];
  if (!row) throw new Error("COMMERCE_PROVIDER_EVENT_ORDER_NOT_MAPPED");
  return { orderId: row.order_id, providerOrderId: row.provider_order_id };
}

export async function drainVendureProviderEvents(input: {
  tenantId: string;
  adapter: CraysCommerceAdapter;
  take?: number;
}): Promise<{ applied: number; duplicates: number; acknowledged: number }> {
  const events = await input.adapter.pendingProviderEvents(input.take ?? 50);
  let applied = 0;
  let duplicates = 0;
  let acknowledged = 0;
  for (const event of events) {
    if (!["return-received", "refund-settled"].includes(event.eventType)) continue;
    const order = await resolveCoreOrderForProviderEvent(input.tenantId, event);
    const amountMinor = typeof event.payload.amountMinor === "number"
      ? event.payload.amountMinor
      : null;
    const result = await ingestCommerceProviderEvent({
      tenantId: input.tenantId,
      providerEventId: event.eventId,
      eventType: event.eventType,
      orderId: order.orderId,
      providerOrderId: order.providerOrderId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      amountMinor,
      currencyCode: typeof event.payload.currencyCode === "string"
        ? event.payload.currencyCode
        : null,
      providerState: event.eventType === "refund-settled" ? "Settled" : "received",
      occurredAt: event.createdAt,
      payload: event.payload,
    });
    if (result.status === "applied") applied += 1;
    else duplicates += 1;
    if (await input.adapter.acknowledgeProviderEvent(event.eventId)) acknowledged += 1;
  }
  return { applied, duplicates, acknowledged };
}

export const commerceErpClosedLoopForTests = { sha256, stableJson };
