import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";

export type OutboxEvent = {
  eventId: string; tenantId: string; eventType: string; schemaVersion: number; aggregateType: string; aggregateId: string;
  actorId: string | null; correlationId: string; causationId: string | null; idempotencyKey: string;
  payload: Record<string, unknown>; metadata: Record<string, unknown>; occurredAt: string; deliveryAttempts: number;
};

type OutboxRow = {
  event_id: string; tenant_id: string; event_type: string; schema_version: number; aggregate_type: string; aggregate_id: string;
  actor_id: string | null; correlation_id: string; causation_id: string | null; idempotency_key: string;
  payload: Record<string, unknown>; metadata: Record<string, unknown>; occurred_at: Date; delivery_attempts: number;
};

function mapEvent(row: OutboxRow): OutboxEvent {
  return { eventId: row.event_id, tenantId: row.tenant_id, eventType: row.event_type, schemaVersion: row.schema_version,
    aggregateType: row.aggregate_type, aggregateId: row.aggregate_id, actorId: row.actor_id, correlationId: row.correlation_id,
    causationId: row.causation_id, idempotencyKey: row.idempotency_key, payload: row.payload, metadata: row.metadata,
    occurredAt: row.occurred_at.toISOString(), deliveryAttempts: row.delivery_attempts };
}

export class OutboxWorkerCrash extends Error {}
export type OutboxTransport = { key: string; deliver(event: OutboxEvent): Promise<{ safeDetail?: string }> };
export const localReceiptTransport: OutboxTransport = { key: "local-receipt", async deliver(event) { return { safeDetail: `local:${event.eventId}` }; } };

export async function dispatchOutboxBatch(input: { transport: OutboxTransport; limit?: number; maximumAttempts?: number }) {
  const client = await getCorePgPool().connect();
  const maximumAttempts = input.maximumAttempts ?? 5;
  const outcomes: Array<{ eventId: string; status: "delivered" | "failed" | "quarantined" }> = [];
  try {
    await client.query("begin");
    const selected = await client.query<OutboxRow>(
      `select event_id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,actor_id,correlation_id,causation_id,idempotency_key,payload,metadata,occurred_at,delivery_attempts
         from crays_core.domain_event_outbox
        where published_at is null and quarantined_at is null and available_at <= now()
        order by occurred_at,event_id for update skip locked limit $1`, [Math.min(Math.max(input.limit ?? 50, 1), 100)],
    );
    for (const row of selected.rows) {
      const event = mapEvent(row);
      const attempt = row.delivery_attempts + 1;
      try {
        const delivered = await input.transport.deliver(event);
        await client.query(`insert into crays_core.domain_event_delivery_receipts(receipt_id,event_id,transport_key,attempt,status,safe_detail) values($1,$2,$3,$4,'delivered',$5)`, [randomUUID(), event.eventId, input.transport.key, attempt, delivered.safeDetail ?? null]);
        await client.query(`update crays_core.domain_event_outbox set published_at=now(),delivery_attempts=$2,last_delivery_error=null where event_id=$1`, [event.eventId, attempt]);
        outcomes.push({ eventId: event.eventId, status: "delivered" });
      } catch (error) {
        if (error instanceof OutboxWorkerCrash) throw error;
        const safeError = error instanceof Error ? error.message.slice(0, 500) : "Transport delivery failed.";
        const quarantined = attempt >= maximumAttempts;
        await client.query(`insert into crays_core.domain_event_delivery_receipts(receipt_id,event_id,transport_key,attempt,status,safe_detail) values($1,$2,$3,$4,$5,$6)`, [randomUUID(), event.eventId, input.transport.key, attempt, quarantined ? "quarantined" : "failed", safeError]);
        const nextAvailableAt = new Date(Date.now() + Math.min(3600, 2 ** attempt) * 1000);
        await client.query(`update crays_core.domain_event_outbox set delivery_attempts=$2,last_delivery_error=$3,available_at=$5,quarantined_at=case when $4 then now() else null end,quarantine_reason=case when $4 then $3 else null end where event_id=$1`, [event.eventId, attempt, safeError, quarantined, nextAvailableAt]);
        outcomes.push({ eventId: event.eventId, status: quarantined ? "quarantined" : "failed" });
      }
    }
    await client.query("commit");
    return outcomes;
  } catch (error) { await client.query("rollback").catch(() => undefined); throw error; }
  finally { client.release(); }
}

export async function consumeDomainEvent<T>(input: { consumerKey: string; eventId: string; effect: (client: PoolClient, event: OutboxEvent) => Promise<T> }) {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin");
    const consumed = await client.query(`select result_hash from crays_core.domain_event_consumptions where consumer_key=$1 and event_id=$2`, [input.consumerKey, input.eventId]);
    if (consumed.rowCount) { await client.query("commit"); return { replayed: true, resultHash: consumed.rows[0].result_hash as string, result: null as T | null }; }
    const eventResult = await client.query<OutboxRow>(`select event_id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,actor_id,correlation_id,causation_id,idempotency_key,payload,metadata,occurred_at,delivery_attempts from crays_core.domain_event_outbox where event_id=$1 for update`, [input.eventId]);
    if (!eventResult.rowCount) throw new Error("Event is unavailable.");
    const event = mapEvent(eventResult.rows[0]);
    const result = await input.effect(client, event);
    const resultHash = createHash("sha256").update(JSON.stringify(result ?? null)).digest("hex");
    await client.query(`insert into crays_core.domain_event_consumptions(consumer_key,event_id,result_hash) values($1,$2,$3)`, [input.consumerKey, input.eventId, resultHash]);
    await client.query("commit");
    return { replayed: false, resultHash, result };
  } catch (error) { await client.query("rollback").catch(() => undefined); throw error; }
  finally { client.release(); }
}

export async function requestEventReplay(input: { tenantId: string; requestedBy: string; reason: string; from: Date; to: Date; eventType?: string | null }) {
  if (input.to.getTime() < input.from.getTime() || input.to.getTime() - input.from.getTime() > 31 * 86_400_000) throw new Error("Replay window must be ordered and no longer than 31 days.");
  const replayId = randomUUID();
  await getCorePgPool().query(`insert into crays_core.domain_event_replay_requests(replay_id,tenant_id,requested_by,reason,from_occurred_at,to_occurred_at,event_type) values($1,$2,$3,$4,$5,$6,$7)`, [replayId,input.tenantId,input.requestedBy,input.reason,input.from,input.to,input.eventType??null]);
  return replayId;
}

export async function releaseQuarantinedEvent(input: { eventId: string; reason: string }) {
  const reason = input.reason.trim();
  if (reason.length < 3 || reason.length > 500) throw new Error("A recovery reason from 3 through 500 characters is required.");
  const result = await getCorePgPool().query(`update crays_core.domain_event_outbox set quarantined_at=null,quarantine_reason=null,available_at=now(),last_delivery_error=$2 where event_id=$1 and quarantined_at is not null returning event_id`, [input.eventId, `released:${reason}`]);
  return result.rowCount === 1;
}
