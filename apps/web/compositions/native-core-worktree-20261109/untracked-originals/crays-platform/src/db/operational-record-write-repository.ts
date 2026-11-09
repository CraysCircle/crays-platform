import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "./client";
import type { OperationalMutationInput } from "@/lib/read-write/operational-record-schema";
import { assertDataMinimizedEventPayload, gymEventContractForResource } from "@/graphql/eventing/gym-event-catalog";

export type OperationalRecord = {
  tenantId: string;
  resource: string;
  recordId: string;
  data: Record<string, unknown>;
  version: number;
  state: "active" | "archived" | "deleted";
  createdAt: string;
  updatedAt: string;
};

export type OperationalMutationResult = {
  status: "saved" | "conflict" | "not-found" | "idempotency-conflict";
  record?: OperationalRecord;
  expectedVersion?: number;
  currentVersion?: number;
  eventId?: string;
  replayed: boolean;
};

export type OperationalRecordEvent = {
  eventId: string;
  resource: string;
  recordId: string;
  operation: "create" | "update" | "archive" | "restore" | "delete";
  actorRole: string;
  previousVersion: number | null;
  recordVersion: number;
  beforeState: string | null;
  afterState: string;
  changedFields: string[];
  occurredAt: string;
};

type RepositoryMutationInput = {
  mutation: OperationalMutationInput;
  tenantId: string;
  actorId: string;
  actorRole: string;
  correlationId: string;
};

type RecordRow = {
  tenant_id: string;
  resource_key: string;
  record_id: string;
  record_data: Record<string, unknown>;
  record_version: string;
  record_state: "active" | "archived" | "deleted";
  created_at: Date | string;
  updated_at: Date | string;
};

type EventRow = {
  event_id: string;
  resource_key: string;
  record_id: string;
  operation: OperationalRecordEvent["operation"];
  actor_role: string;
  previous_version: string | null;
  record_version: string;
  before_state: string | null;
  after_state: string;
  changed_fields: string[];
  occurred_at: Date | string;
};

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRecord(row: RecordRow): OperationalRecord {
  return {
    tenantId: row.tenant_id,
    resource: row.resource_key,
    recordId: row.record_id,
    data: row.record_data,
    version: Number.parseInt(row.record_version, 10),
    state: row.record_state,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function fingerprint(input: RepositoryMutationInput) {
  return createHash("sha256").update(JSON.stringify({
    tenantId: input.tenantId,
    actorId: input.actorId,
    resource: input.mutation.resource,
    operation: input.mutation.operation,
    recordId: input.mutation.recordId ?? null,
    expectedVersion: input.mutation.expectedVersion ?? null,
    reason: input.mutation.reason,
    changes: Object.entries(input.mutation.changes).sort(([left], [right]) => left.localeCompare(right)),
  })).digest("hex");
}

async function completeIdempotency(client: PoolClient, input: RepositoryMutationInput, result: OperationalMutationResult) {
  await client.query(
    `update crays_core.operational_mutation_idempotency
       set response_payload = $4::jsonb, status = 'completed', completed_at = now()
     where tenant_id = $1 and actor_id = $2 and idempotency_key = $3`,
    [input.tenantId, input.actorId, input.mutation.idempotencyKey, JSON.stringify(result)],
  );
}

export async function mutateOperationalRecord(input: RepositoryMutationInput): Promise<OperationalMutationResult> {
  const client = await getCorePgPool().connect();
  const requestFingerprint = fingerprint(input);

  try {
    await client.query("begin");
    const idempotency = await client.query<{ request_fingerprint: string; status: string; response_payload: OperationalMutationResult | null }>(
      `select request_fingerprint, status, response_payload
         from crays_core.operational_mutation_idempotency
        where tenant_id = $1 and actor_id = $2 and idempotency_key = $3
        for update`,
      [input.tenantId, input.actorId, input.mutation.idempotencyKey],
    );

    const prior = idempotency.rows[0];
    if (prior) {
      if (prior.request_fingerprint !== requestFingerprint) {
        await client.query("rollback");
        return { status: "idempotency-conflict", replayed: false };
      }
      if (prior.status === "completed" && prior.response_payload) {
        await client.query("commit");
        return { ...prior.response_payload, replayed: true };
      }
    } else {
      await client.query(
        `insert into crays_core.operational_mutation_idempotency
          (tenant_id, actor_id, idempotency_key, request_fingerprint, status)
         values ($1, $2, $3, $4, 'processing')`,
        [input.tenantId, input.actorId, input.mutation.idempotencyKey, requestFingerprint],
      );
    }

    const recordId = input.mutation.recordId ?? `record_${randomUUID()}`;
    const existing = await client.query<RecordRow>(
      `select tenant_id, resource_key, record_id, record_data, record_version, record_state, created_at, updated_at
         from crays_core.operational_records
        where tenant_id = $1 and resource_key = $2 and record_id = $3
        for update`,
      [input.tenantId, input.mutation.resource, recordId],
    );
    const current = existing.rows[0];

    if (input.mutation.operation === "create" && current) {
      const result: OperationalMutationResult = {
        status: "conflict",
        currentVersion: Number.parseInt(current.record_version, 10),
        replayed: false,
      };
      await completeIdempotency(client, input, result);
      await client.query("commit");
      return result;
    }

    if (input.mutation.operation !== "create" && !current) {
      const result: OperationalMutationResult = { status: "not-found", replayed: false };
      await completeIdempotency(client, input, result);
      await client.query("commit");
      return result;
    }

    const currentVersion = current ? Number.parseInt(current.record_version, 10) : 0;
    if (current && input.mutation.expectedVersion !== currentVersion) {
      const result: OperationalMutationResult = {
        status: "conflict",
        expectedVersion: input.mutation.expectedVersion,
        currentVersion,
        record: mapRecord(current),
        replayed: false,
      };
      await completeIdempotency(client, input, result);
      await client.query("commit");
      return result;
    }

    const before = current?.record_data ?? null;
    const beforeState = current?.record_state ?? null;
    const nextData = input.mutation.operation === "create"
      ? input.mutation.changes
      : input.mutation.operation === "update"
        ? { ...current!.record_data, ...input.mutation.changes }
        : current!.record_data;
    const nextState = input.mutation.operation === "archive"
      ? "archived"
      : input.mutation.operation === "restore"
        ? "active"
        : input.mutation.operation === "delete"
          ? "deleted"
          : current?.record_state ?? "active";

    const saved = input.mutation.operation === "create"
      ? await client.query<RecordRow>(
          `insert into crays_core.operational_records
            (tenant_id, resource_key, record_id, record_data, record_version, record_state, created_by, updated_by)
           values ($1, $2, $3, $4::jsonb, 1, 'active', $5, $5)
           returning tenant_id, resource_key, record_id, record_data, record_version, record_state, created_at, updated_at`,
          [input.tenantId, input.mutation.resource, recordId, JSON.stringify(nextData), input.actorId],
        )
      : await client.query<RecordRow>(
          `update crays_core.operational_records
              set record_data = $4::jsonb, record_state = $5, record_version = record_version + 1,
                  updated_by = $6, updated_at = now()
            where tenant_id = $1 and resource_key = $2 and record_id = $3
            returning tenant_id, resource_key, record_id, record_data, record_version, record_state, created_at, updated_at`,
          [input.tenantId, input.mutation.resource, recordId, JSON.stringify(nextData), nextState, input.actorId],
        );

    const record = mapRecord(saved.rows[0]);
    const eventId = randomUUID();
    await client.query(
      `insert into crays_core.operational_record_events
        (event_id, tenant_id, resource_key, record_id, operation, actor_id, actor_role,
         correlation_id, idempotency_key, command_reason, previous_version, record_version, before_data, after_data,
         before_state, after_state, changed_fields)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16, $17::jsonb)`,
      [
        eventId, input.tenantId, input.mutation.resource, recordId, input.mutation.operation,
        input.actorId, input.actorRole, input.correlationId, input.mutation.idempotencyKey,
        input.mutation.reason, currentVersion || null, record.version, before ? JSON.stringify(before) : null, JSON.stringify(record.data),
        beforeState, record.state, JSON.stringify(Object.keys(input.mutation.changes)),
      ],
    );

    const eventContract = gymEventContractForResource(input.mutation.resource);
    const outboxPayload = {
      operation: input.mutation.operation,
      previousVersion: currentVersion || null,
      recordVersion: record.version,
      state: record.state,
      changedFields: Object.keys(input.mutation.changes),
    };
    assertDataMinimizedEventPayload(outboxPayload);
    await client.query(
      `insert into crays_core.domain_event_outbox
        (event_id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,actor_id,correlation_id,causation_id,idempotency_key,payload,metadata,occurred_at)
       values ($1,$2,$3,1,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12)`,
      [eventId, input.tenantId, eventContract.eventType, eventContract.aggregate, recordId, input.actorId,
       input.correlationId, null, input.mutation.idempotencyKey, JSON.stringify(outboxPayload),
       JSON.stringify({ owner: eventContract.owner, retentionDays: eventContract.retentionDays, classification: "internal", containsPersonalData: false }), record.updatedAt],
    );

    const result: OperationalMutationResult = { status: "saved", record, eventId, replayed: false };
    await completeIdempotency(client, input, result);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function getOperationalRecord(input: { tenantId: string; resource: string; recordId: string }) {
  const result = await getCorePgPool().query<RecordRow>(
    `select tenant_id, resource_key, record_id, record_data, record_version, record_state, created_at, updated_at
       from crays_core.operational_records
      where tenant_id = $1 and resource_key = $2 and record_id = $3`,
    [input.tenantId, input.resource, input.recordId],
  );
  return result.rows[0] ? mapRecord(result.rows[0]) : null;
}

export async function listOperationalRecords(input: {
  tenantId: string;
  resource: string;
  states?: Array<OperationalRecord["state"]>;
  limit?: number;
}) {
  const states = input.states?.length ? input.states : ["active", "archived"];
  const limit = Math.min(Math.max(input.limit ?? 500, 1), 1000);
  const result = await getCorePgPool().query<RecordRow>(
    `select tenant_id, resource_key, record_id, record_data, record_version, record_state, created_at, updated_at
       from crays_core.operational_records
      where tenant_id = $1 and resource_key = $2 and record_state = any($3::text[])
      order by updated_at desc, record_id asc
      limit $4`,
    [input.tenantId, input.resource, states, limit],
  );
  return result.rows.map(mapRecord);
}

export async function getOperationalRecordContextRows(input: {
  tenantId: string;
  resource: string;
  recordId: string;
  readableResources: string[];
}) {
  const [record, events, candidates] = await Promise.all([
    getOperationalRecord({ tenantId: input.tenantId, resource: input.resource, recordId: input.recordId }),
    getCorePgPool().query<EventRow>(
      `select event_id, resource_key, record_id, operation, actor_role, previous_version,
              record_version, before_state, after_state, changed_fields, occurred_at
         from crays_core.operational_record_events
        where tenant_id = $1 and resource_key = $2 and record_id = $3
        order by record_version desc, occurred_at desc
        limit 250`,
      [input.tenantId, input.resource, input.recordId],
    ),
    input.readableResources.length
      ? getCorePgPool().query<RecordRow>(
          `select tenant_id, resource_key, record_id, record_data, record_version, record_state, created_at, updated_at
             from crays_core.operational_records
            where tenant_id = $1 and resource_key = any($2::text[]) and record_state <> 'deleted'
            order by updated_at desc
            limit 5000`,
          [input.tenantId, input.readableResources],
        )
      : Promise.resolve({ rows: [] as RecordRow[] }),
  ]);

  return {
    record,
    candidates: candidates.rows.map(mapRecord),
    events: events.rows.map((row): OperationalRecordEvent => ({
      eventId: row.event_id,
      resource: row.resource_key,
      recordId: row.record_id,
      operation: row.operation,
      actorRole: row.actor_role,
      previousVersion: row.previous_version === null ? null : Number.parseInt(row.previous_version, 10),
      recordVersion: Number.parseInt(row.record_version, 10),
      beforeState: row.before_state,
      afterState: row.after_state,
      changedFields: Array.isArray(row.changed_fields) ? row.changed_fields : [],
      occurredAt: iso(row.occurred_at),
    })),
  };
}
