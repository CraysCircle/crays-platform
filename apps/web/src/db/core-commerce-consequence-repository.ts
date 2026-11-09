import type {
  CoreCommerceConsequenceSource,
} from "@/lib/member-commerce/core-commerce-consequence-receipt";
import {
  prepareCoreCommerceConsequencePersistence,
} from "@/lib/member-commerce/core-commerce-consequence-receipt";

if (typeof window !== "undefined") {
  throw new Error("CORE_COMMERCE_CONSEQUENCE_REPOSITORY_SERVER_ONLY");
}

type QueryResult<Row> = Readonly<{ rows: Row[] }>;
export type CoreCommerceConsequenceClient = Readonly<{
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<Row>>;
}>;

type TransactionClient = CoreCommerceConsequenceClient & Readonly<{
  release(): void;
}>;
export type CoreCommerceConsequencePool = Readonly<{
  connect(): Promise<TransactionClient>;
}>;

type SourceRow = Readonly<{
  consequence_id: string;
  source_record_sha256: string;
}>;

type OutboxRow = Readonly<{
  delivery_id: string;
  consequence_id: string;
  tenant_id: string;
  destination: string;
  delivery_state: "PENDING" | "CLAIMED" | "DELIVERED" | "QUARANTINED";
}>;

type ClaimRow = Readonly<{
  delivery_id: string;
  consequence_id: string;
  tenant_id: string;
  attempt_count: string | number;
  lease_owner: string;
  lease_expires_at: string | Date;
  source_type: CoreCommerceConsequenceSource["sourceType"];
  source_id: string;
  source_version: string | number;
  causing_record_type: CoreCommerceConsequenceSource["causingRecordType"];
  causing_record_id: string;
  causing_record_version: string | number;
  occurred_at: string | Date;
  order_id: string;
  order_code: string;
  order_seller_snapshot_id: string;
  order_seller_snapshot_sha256: string;
  payload: CoreCommerceConsequenceSource["payload"];
  source_record_sha256: string;
}>;

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const HASH = /^[a-f0-9]{64}$/;

function assertId(value: string, code: string) {
  if (!ID.test(value)) throw new Error(code);
}

async function bindCoreTenant(
  client: CoreCommerceConsequenceClient,
  tenantId: string,
) {
  assertId(tenantId, "CORE_COMMERCE_TENANT_INVALID");
  await client.query(
    `select
       set_config('crays.app_role','core_service',true),
       set_config('crays.tenant_id',$1,true)`,
    [tenantId],
  );
}

async function withCoreCommerceTransaction<T>(
  pool: CoreCommerceConsequencePool,
  work: (client: CoreCommerceConsequenceClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function persistCoreCommerceConsequenceWithClient(
  client: CoreCommerceConsequenceClient,
  input: CoreCommerceConsequenceSource,
) {
  const prepared = prepareCoreCommerceConsequencePersistence(input);
  await bindCoreTenant(client, input.tenantId);
  const existing = await client.query<SourceRow>(
    `select consequence_id, source_record_sha256
       from crays_core.commerce_consequence_sources
      where consequence_id=$1 and tenant_id=$2`,
    [input.consequenceId, input.tenantId],
  );
  if (existing.rows.length > 1) {
    throw new Error("CORE_COMMERCE_CONSEQUENCE_SOURCE_AMBIGUOUS");
  }
  if (existing.rows.length === 1) {
    if (existing.rows[0].source_record_sha256 !== prepared.sourceRecordSha256) {
      throw new Error("CORE_COMMERCE_CONSEQUENCE_REPLAY_CONFLICT");
    }
    const delivery = await client.query<OutboxRow>(
      `select delivery_id, consequence_id, tenant_id, destination, delivery_state
         from crays_core.commerce_consequence_delivery_outbox
        where consequence_id=$1 and tenant_id=$2`,
      [input.consequenceId, input.tenantId],
    );
    if (delivery.rows.length !== 1 ||
        delivery.rows[0].delivery_id !== prepared.deliveryRecord.deliveryId ||
        delivery.rows[0].destination !== "vendure_commerce_consequence") {
      throw new Error("CORE_COMMERCE_CONSEQUENCE_OUTBOX_INCOMPLETE");
    }
    return Object.freeze({
      ...prepared,
      replayed: true,
      deliveryState: delivery.rows[0].delivery_state,
    });
  }

  await client.query(
    `insert into crays_core.commerce_consequence_sources (
       consequence_id, tenant_id, source_type, source_id, source_version,
       causing_record_type, causing_record_id, causing_record_version,
       order_id, order_code, order_seller_snapshot_id,
       order_seller_snapshot_sha256, occurred_at, payload, payload_sha256,
       source_record_sha256
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16
     )`,
    [
      input.consequenceId, input.tenantId, input.sourceType, input.sourceId,
      input.sourceVersion, input.causingRecordType, input.causingRecordId,
      input.causingRecordVersion, input.orderId, input.orderCode,
      input.orderSellerSnapshotId, input.orderSellerSnapshotSha256,
      new Date(input.occurredAt).toISOString(),
      JSON.stringify(prepared.sourceRecord.payload), prepared.payloadSha256,
      prepared.sourceRecordSha256,
    ],
  );
  await client.query(
    `insert into crays_core.commerce_consequence_delivery_outbox (
       delivery_id, consequence_id, tenant_id, destination, delivery_state,
       attempt_count, available_at
     ) values ($1,$2,$3,'vendure_commerce_consequence','PENDING',0,$4)`,
    [
      prepared.deliveryRecord.deliveryId, input.consequenceId, input.tenantId,
      new Date(input.occurredAt).toISOString(),
    ],
  );
  return Object.freeze({
    ...prepared,
    replayed: false,
    deliveryState: "PENDING" as const,
  });
}

export async function claimCoreCommerceConsequenceDeliveryWithClient(
  client: CoreCommerceConsequenceClient,
  input: Readonly<{ tenantId: string; workerId: string; now: Date }>,
) {
  assertId(input.workerId, "CORE_COMMERCE_WORKER_INVALID");
  if (!Number.isFinite(input.now.getTime())) {
    throw new Error("CORE_COMMERCE_DELIVERY_TIME_INVALID");
  }
  await bindCoreTenant(client, input.tenantId);
  const claimed = await client.query<ClaimRow>(
    `with candidate as (
       select delivery_id
         from crays_core.commerce_consequence_delivery_outbox
        where tenant_id=$1
          and (
            (delivery_state='PENDING' and available_at <= $3::timestamptz)
            or (delivery_state='CLAIMED' and lease_expires_at <= $3::timestamptz)
          )
        order by available_at, created_at
        for update skip locked
        limit 1
     ), claimed as (
       update crays_core.commerce_consequence_delivery_outbox d
          set delivery_state='CLAIMED',
              attempt_count=d.attempt_count+1,
              lease_owner=$2,
              lease_expires_at=$3::timestamptz + interval '30 seconds',
              updated_at=$3::timestamptz
         from candidate c
        where d.delivery_id=c.delivery_id
      returning d.*
     )
     select c.delivery_id, c.consequence_id, c.tenant_id, c.attempt_count,
            c.lease_owner, c.lease_expires_at,
            s.source_type, s.source_id, s.source_version,
            s.causing_record_type, s.causing_record_id,
            s.causing_record_version, s.occurred_at, s.order_id, s.order_code,
            s.order_seller_snapshot_id, s.order_seller_snapshot_sha256,
            s.payload, s.source_record_sha256
       from claimed c
       join crays_core.commerce_consequence_sources s
         on s.consequence_id=c.consequence_id and s.tenant_id=c.tenant_id`,
    [input.tenantId, input.workerId, input.now.toISOString()],
  );
  if (claimed.rows.length === 0) return null;
  if (claimed.rows.length !== 1) {
    throw new Error("CORE_COMMERCE_DELIVERY_CLAIM_AMBIGUOUS");
  }
  const row = claimed.rows[0];
  const persisted = prepareCoreCommerceConsequencePersistence({
    consequenceId: row.consequence_id,
    tenantId: row.tenant_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    sourceVersion: Number(row.source_version),
    causingRecordType: row.causing_record_type,
    causingRecordId: row.causing_record_id,
    causingRecordVersion: Number(row.causing_record_version),
    occurredAt: new Date(row.occurred_at).toISOString(),
    orderId: row.order_id,
    orderCode: row.order_code,
    orderSellerSnapshotId: row.order_seller_snapshot_id,
    orderSellerSnapshotSha256: row.order_seller_snapshot_sha256,
    payload: row.payload,
  });
  if (persisted.sourceRecordSha256 !== row.source_record_sha256) {
    throw new Error("CORE_COMMERCE_DELIVERY_SOURCE_HASH_DRIFT");
  }
  return Object.freeze({
    deliveryId: row.delivery_id,
    tenantId: row.tenant_id,
    leaseOwner: row.lease_owner,
    leaseExpiresAt: new Date(row.lease_expires_at).toISOString(),
    attemptCount: Number(row.attempt_count),
    persisted,
  });
}

export async function completeCoreCommerceConsequenceDeliveryWithClient(
  client: CoreCommerceConsequenceClient,
  input: Readonly<{
    tenantId: string;
    deliveryId: string;
    workerId: string;
    receiptSha256: string;
    now: Date;
  }>,
): Promise<"DELIVERED"> {
  assertId(input.deliveryId, "CORE_COMMERCE_DELIVERY_ID_INVALID");
  assertId(input.workerId, "CORE_COMMERCE_WORKER_INVALID");
  if (!HASH.test(input.receiptSha256) || !Number.isFinite(input.now.getTime())) {
    throw new Error("CORE_COMMERCE_DELIVERY_ACK_INVALID");
  }
  await bindCoreTenant(client, input.tenantId);
  const result = await client.query<{ delivery_id: string }>(
    `update crays_core.commerce_consequence_delivery_outbox
        set delivery_state='DELIVERED', last_receipt_sha256=$4,
            delivered_at=$5::timestamptz, last_error_code=null,
            lease_owner=null, lease_expires_at=null, updated_at=$5::timestamptz
      where tenant_id=$1 and delivery_id=$2 and delivery_state='CLAIMED'
        and lease_owner=$3 and lease_expires_at > $5::timestamptz
      returning delivery_id`,
    [
      input.tenantId, input.deliveryId, input.workerId, input.receiptSha256,
      input.now.toISOString(),
    ],
  );
  if (result.rows.length !== 1) {
    throw new Error("CORE_COMMERCE_DELIVERY_ACK_LEASE_DENIED");
  }
  return "DELIVERED";
}

export async function failCoreCommerceConsequenceDeliveryWithClient(
  client: CoreCommerceConsequenceClient,
  input: Readonly<{
    tenantId: string;
    deliveryId: string;
    workerId: string;
    errorCode: string;
    retryable: boolean;
    now: Date;
    maxAttempts?: number;
  }>,
): Promise<"PENDING" | "QUARANTINED"> {
  assertId(input.deliveryId, "CORE_COMMERCE_DELIVERY_ID_INVALID");
  assertId(input.workerId, "CORE_COMMERCE_WORKER_INVALID");
  if (!/^[A-Z][A-Z0-9_]{2,99}$/.test(input.errorCode) ||
      typeof input.retryable !== "boolean" ||
      !Number.isFinite(input.now.getTime())) {
    throw new Error("CORE_COMMERCE_DELIVERY_FAILURE_INVALID");
  }
  const maxAttempts = input.maxAttempts ?? 8;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) {
    throw new Error("CORE_COMMERCE_DELIVERY_MAX_ATTEMPTS_INVALID");
  }
  await bindCoreTenant(client, input.tenantId);
  const result = await client.query<{ delivery_state: "PENDING" | "QUARANTINED" }>(
    `update crays_core.commerce_consequence_delivery_outbox
        set delivery_state=case when $6::boolean and attempt_count < $7::integer then 'PENDING'
                                else 'QUARANTINED' end,
            available_at=case when $6::boolean and attempt_count < $7::integer
              then $4::timestamptz + interval '30 seconds' else available_at end,
            last_error_code=$5, lease_owner=null, lease_expires_at=null,
            updated_at=$4::timestamptz
      where tenant_id=$1 and delivery_id=$2 and delivery_state='CLAIMED'
        and lease_owner=$3 and lease_expires_at > $4::timestamptz
      returning delivery_state`,
    [
      input.tenantId, input.deliveryId, input.workerId,
      input.now.toISOString(), input.errorCode, input.retryable, maxAttempts,
    ],
  );
  if (result.rows.length !== 1) {
    throw new Error("CORE_COMMERCE_DELIVERY_FAILURE_LEASE_DENIED");
  }
  return result.rows[0].delivery_state;
}

export function persistCoreCommerceConsequence(
  pool: CoreCommerceConsequencePool,
  input: CoreCommerceConsequenceSource,
) {
  return withCoreCommerceTransaction(
    pool,
    (client) => persistCoreCommerceConsequenceWithClient(client, input),
  );
}

export function createCoreCommerceConsequenceDeliveryRepository(
  pool: CoreCommerceConsequencePool,
) {
  return Object.freeze({
    claim(input: Readonly<{tenantId: string; workerId: string; now: Date; leaseSeconds?: number}>) {
      if (input.leaseSeconds !== undefined && input.leaseSeconds !== 30) {
        throw new Error("CORE_COMMERCE_DELIVERY_LEASE_SECONDS_INVALID");
      }
      return withCoreCommerceTransaction(
        pool,
        (client) => claimCoreCommerceConsequenceDeliveryWithClient(client, input),
      );
    },
    complete(input: Readonly<{
      tenantId: string;
      deliveryId: string;
      workerId: string;
      receiptSha256: string;
      now: Date;
    }>) {
      return withCoreCommerceTransaction(
        pool,
        (client) => completeCoreCommerceConsequenceDeliveryWithClient(client, input),
      );
    },
    fail(input: Readonly<{
      tenantId: string;
      deliveryId: string;
      workerId: string;
      errorCode: string;
      retryable: boolean;
      now: Date;
      maxAttempts?: number;
    }>) {
      return withCoreCommerceTransaction(
        pool,
        (client) => failCoreCommerceConsequenceDeliveryWithClient(client, input),
      );
    },
  });
}
