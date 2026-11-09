import {createHash, randomUUID} from "node:crypto";
import type {createCommerceException} from "./commerce-exception-queue-contract";

type ExceptionRecord = ReturnType<typeof createCommerceException>;

type PersistCommerceExceptionInput = Readonly<{
  exceptionId: string; tenantId: string; record: ExceptionRecord;
}>;
type CommerceExceptionAttentionInput = Readonly<{
  tenantId: string; partnerTenantId: string; operatorLegalEntityId: string;
  storeId: string; now: string; limit?: number;
}>;
type AcknowledgeCommerceExceptionInput = Readonly<{
  tenantId: string; partnerTenantId: string; operatorLegalEntityId: string;
  storeId: string; exceptionId: string; expectedExceptionSha256: string;
  actorAssignmentId: string; idempotencyKey: string; occurredAt: string;
}>;
type EscalateCommerceExceptionsInput = Readonly<{
  tenantId: string; now: string; workerAssignmentId: string; limit?: number;
}>;

type QueryResult<Row> = Readonly<{rows: Row[]; rowCount?: number | null}>;
export type CommerceExceptionDb = Readonly<{
  query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
}>;
export type CommerceExceptionPool = Readonly<{
  connect(): Promise<CommerceExceptionDb & Readonly<{release(): void}>>;
}>;

const sha256 = (value: object) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const requireIds = (values: readonly string[], error: string) => {
  if (values.some((value) => !value.trim())) throw new Error(error);
};

export function prepareCommerceExceptionPersistenceInput(input: PersistCommerceExceptionInput) {
  requireIds([input.exceptionId, input.tenantId], "COMMERCE_EXCEPTION_PERSISTENCE_INPUT_INVALID");
  const evidenceRefs = Object.freeze(input.record.evidenceRefs.map((reference) => Object.freeze({...reference})));
  const record = Object.freeze({...input.record, evidenceRefs});
  return Object.freeze({...input, record});
}

export function prepareCommerceExceptionAttentionInput(input: CommerceExceptionAttentionInput) {
  const now = Date.parse(input.now);
  const limit = input.limit ?? 50;
  requireIds(
    [input.tenantId, input.partnerTenantId, input.operatorLegalEntityId, input.storeId],
    "COMMERCE_EXCEPTION_QUEUE_INPUT_INVALID",
  );
  if (!Number.isFinite(now) || limit < 1 || limit > 100) {
    throw new Error("COMMERCE_EXCEPTION_QUEUE_INPUT_INVALID");
  }
  return Object.freeze({...input, now: new Date(now).toISOString(), limit});
}

export function prepareAcknowledgeCommerceExceptionInput(input: AcknowledgeCommerceExceptionInput) {
  const occurredAt = Date.parse(input.occurredAt);
  requireIds(
    [input.tenantId, input.partnerTenantId, input.operatorLegalEntityId, input.storeId,
      input.exceptionId, input.actorAssignmentId, input.idempotencyKey],
    "COMMERCE_EXCEPTION_ACK_INPUT_INVALID",
  );
  if (!/^[a-f0-9]{64}$/.test(input.expectedExceptionSha256) || !Number.isFinite(occurredAt)) {
    throw new Error("COMMERCE_EXCEPTION_ACK_INPUT_INVALID");
  }
  return Object.freeze({...input, occurredAt: new Date(occurredAt).toISOString()});
}

export function prepareEscalateCommerceExceptionsInput(input: EscalateCommerceExceptionsInput) {
  const now = Date.parse(input.now);
  const limit = input.limit ?? 50;
  requireIds([input.tenantId, input.workerAssignmentId], "COMMERCE_EXCEPTION_ESCALATION_INPUT_INVALID");
  if (!Number.isFinite(now) || limit < 1 || limit > 100) {
    throw new Error("COMMERCE_EXCEPTION_ESCALATION_INPUT_INVALID");
  }
  return Object.freeze({...input, now: new Date(now).toISOString(), limit});
}

export async function configureCommerceExceptionCoreScope(db: CommerceExceptionDb, tenantId: string) {
  if (!tenantId.trim()) throw new Error("COMMERCE_EXCEPTION_TENANT_INVALID");
  await db.query(
    "select set_config('crays.app_role','core_service',true), set_config('crays.tenant_id',$1,true)",
    [tenantId],
  );
}

async function transaction<T>(pool: CommerceExceptionPool, tenantId: string, work: (db: CommerceExceptionDb) => Promise<T>) {
  const db = await pool.connect();
  try {
    await db.query("begin");
    await configureCommerceExceptionCoreScope(db, tenantId);
    const result = await work(db);
    await db.query("commit");
    return result;
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    db.release();
  }
}

export async function persistCommerceException(
  db: CommerceExceptionDb,
  input: PersistCommerceExceptionInput,
) {
  input = prepareCommerceExceptionPersistenceInput(input);
  const record = input.record;
  const result = await db.query<Readonly<{exception_id: string; exception_sha256: string; inserted: boolean}>>(
    `insert into crays_core.commerce_exceptions (
       exception_id,exception_sha256,tenant_id,partner_tenant_id,
       operator_legal_entity_id,store_id,order_id,order_seller_snapshot_id,
       order_seller_snapshot_sha256,stripe_connected_account_id,erp_site_id,
       exception_kind,source_record_id,source_state,provider_state,reason_code,
       first_observed_at,last_observed_at,owner_role,owner_assignment_id,
       required_information,sla_seconds,due_at,expires_at,escalation_owner_role,
       attention_state,attention_acknowledged_at,
       attention_acknowledged_by_assignment_id,escalated_at,evidence_refs,
       original_idempotency_key,reconciliation_state,next_safe_action,
       business_state,record_version)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
       $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30::jsonb,$31,$32,$33,
       'PENDING_RECONCILIATION',1)
     on conflict (tenant_id,partner_tenant_id,original_idempotency_key,exception_kind)
     do nothing
     returning exception_id,exception_sha256,true as inserted`,
    [input.exceptionId, record.exceptionSha256, input.tenantId, record.partnerTenantId,
      record.operatorLegalEntityId, record.storeId, record.orderId, record.snapshotId,
      record.snapshotSha256, record.stripeConnectedAccountId, record.erpSiteId,
      record.kind, record.sourceRecordId, record.sourceState, record.providerState,
      record.reasonCode, record.firstObservedAt, record.lastObservedAt,
      record.ownerRole, record.ownerAssignmentId, record.requiredInformation,
      record.slaSeconds, record.dueAt, record.expiresAt, record.escalationOwnerRole,
      record.attentionState, record.attentionAcknowledgedAt,
      record.attentionAcknowledgedByAssignmentId, null,
      JSON.stringify(record.evidenceRefs), record.originalIdempotencyKey,
      record.reconciliationState, record.nextSafeAction],
  );
  const persisted = result.rows[0] ?? (await db.query<Readonly<{exception_id:string;exception_sha256:string;inserted:boolean}>>(
    `select exception_id,exception_sha256,false as inserted
       from crays_core.commerce_exceptions
      where tenant_id=$1 and partner_tenant_id=$2
        and original_idempotency_key=$3 and exception_kind=$4`,
    [input.tenantId,record.partnerTenantId,record.originalIdempotencyKey,record.kind],
  )).rows[0];
  if (!persisted || persisted.exception_sha256 !== record.exceptionSha256) {
    throw new Error("COMMERCE_EXCEPTION_PERSISTENCE_REPLAY_CONFLICT");
  }
  return Object.freeze({exceptionId: persisted.exception_id, replay: !persisted.inserted});
}

export async function listCommerceExceptionAttention(
  db: CommerceExceptionDb,
  input: CommerceExceptionAttentionInput,
) {
  input = prepareCommerceExceptionAttentionInput(input);
  const result = await db.query(
    `select exception_id,exception_sha256,exception_kind,order_id,source_record_id,
            reason_code,owner_role,owner_assignment_id,required_information,
            due_at,expires_at,escalation_owner_role,reconciliation_state,
            next_safe_action,business_state,record_version,
            case
              when attention_state='ACKNOWLEDGED' then 'ACKNOWLEDGED'
              when $5::timestamptz >= expires_at then 'EXPIRED'
              when $5::timestamptz >= due_at then 'ESCALATED'
              else attention_state
            end as effective_attention_state,
            attention_acknowledged_at,attention_acknowledged_by_assignment_id,
            escalated_at,evidence_refs
       from crays_core.commerce_exceptions
      where tenant_id=$1 and partner_tenant_id=$2
        and operator_legal_entity_id=$3 and store_id=$4
        and business_state <> 'RECONCILED'
      order by due_at asc,created_at asc
      limit $6`,
    [input.tenantId, input.partnerTenantId, input.operatorLegalEntityId,
      input.storeId, input.now, input.limit],
  );
  return Object.freeze(result.rows.map((row) => Object.freeze(row)));
}

export async function acknowledgeCommerceException(
  pool: CommerceExceptionPool,
  input: AcknowledgeCommerceExceptionInput,
) {
  input = prepareAcknowledgeCommerceExceptionInput(input);
  return transaction(pool, input.tenantId, async (db) => {
    const replay = await db.query<Readonly<{
      action_receipt_id: string; expected_exception_sha256: string;
      actor_assignment_id: string; receipt_sha256: string;
    }>>(
      `select action_receipt_id,expected_exception_sha256,actor_assignment_id,receipt_sha256
         from crays_core.commerce_exception_action_receipts
        where tenant_id=$1 and idempotency_key=$2`,
      [input.tenantId, input.idempotencyKey],
    );
    if (replay.rows[0]) {
      const row = replay.rows[0];
      if (row.expected_exception_sha256 !== input.expectedExceptionSha256 ||
          row.actor_assignment_id !== input.actorAssignmentId) {
        throw new Error("COMMERCE_EXCEPTION_ACK_REPLAY_CONFLICT");
      }
      return Object.freeze({receiptId: row.action_receipt_id, receiptSha256: row.receipt_sha256, replay: true});
    }

    const locked = await db.query<Readonly<{
      exception_sha256: string; next_safe_action: string; business_state: string;
      attention_state: string; record_version: number;
    }>>(
      `select exception_sha256,next_safe_action,business_state,attention_state,record_version
         from crays_core.commerce_exceptions
        where exception_id=$1 and tenant_id=$2 and partner_tenant_id=$3
          and operator_legal_entity_id=$4 and store_id=$5
        for update`,
      [input.exceptionId, input.tenantId, input.partnerTenantId,
        input.operatorLegalEntityId, input.storeId],
    );
    const current = locked.rows[0];
    if (!current) throw new Error("COMMERCE_EXCEPTION_ACK_NOT_FOUND");
    if (current.exception_sha256 !== input.expectedExceptionSha256) {
      throw new Error("COMMERCE_EXCEPTION_ACK_CONFLICT");
    }
    if (current.next_safe_action !== "acknowledge" || current.business_state === "RECONCILED") {
      throw new Error("COMMERCE_EXCEPTION_ACK_NOT_SAFE");
    }

    const receiptId = `commerce-exception-action:${randomUUID()}`;
    const receiptBody = {
      receiptId, exceptionId: input.exceptionId, action: "acknowledge",
      actorAssignmentId: input.actorAssignmentId,
      occurredAt: input.occurredAt,
      expectedExceptionSha256: input.expectedExceptionSha256,
      resultingAttentionState: "ACKNOWLEDGED",
      resultingBusinessState: "PENDING_RECONCILIATION",
      idempotencyKey: input.idempotencyKey,
    };
    const receiptSha256 = sha256(receiptBody);
    await db.query(
      `update crays_core.commerce_exceptions
          set attention_state='ACKNOWLEDGED',attention_acknowledged_at=$1,
              attention_acknowledged_by_assignment_id=$2,escalated_at=null,
              record_version=record_version+1
        where exception_id=$3`,
      [receiptBody.occurredAt, input.actorAssignmentId, input.exceptionId],
    );
    await db.query(
      `insert into crays_core.commerce_exception_action_receipts (
         action_receipt_id,exception_id,tenant_id,partner_tenant_id,
         operator_legal_entity_id,store_id,action,actor_assignment_id,
         expected_exception_sha256,idempotency_key,occurred_at,
         resulting_attention_state,resulting_business_state,receipt_sha256)
       values ($1,$2,$3,$4,$5,$6,'acknowledge',$7,$8,$9,$10,
         'ACKNOWLEDGED','PENDING_RECONCILIATION',$11)`,
      [receiptId, input.exceptionId, input.tenantId, input.partnerTenantId,
        input.operatorLegalEntityId, input.storeId, input.actorAssignmentId,
        input.expectedExceptionSha256, input.idempotencyKey,
        receiptBody.occurredAt, receiptSha256],
    );
    return Object.freeze({receiptId, receiptSha256, replay: false});
  });
}

export async function escalateDueCommerceExceptions(
  pool: CommerceExceptionPool,
  input: EscalateCommerceExceptionsInput,
) {
  input = prepareEscalateCommerceExceptionsInput(input);
  const now = Date.parse(input.now);
  return transaction(pool, input.tenantId, async (db) => {
    const due = await db.query<Readonly<{
      exception_id: string; exception_sha256: string; partner_tenant_id: string;
      operator_legal_entity_id: string; store_id: string; expires_at: string;
    }>>(
      `select exception_id,exception_sha256,partner_tenant_id,
              operator_legal_entity_id,store_id,expires_at
         from crays_core.commerce_exceptions
        where tenant_id=$1 and business_state <> 'RECONCILED'
          and attention_state='UNACKNOWLEDGED' and due_at <= $2::timestamptz
        order by due_at asc
        for update skip locked limit $3`,
      [input.tenantId, input.now, input.limit],
    );
    const receipts: Array<Readonly<{receiptId: string; receiptSha256: string}>> = [];
    for (const row of due.rows) {
      const effective = now >= Date.parse(row.expires_at) ? "EXPIRED" : "ESCALATED";
      const receiptId = `commerce-exception-action:${randomUUID()}`;
      const idempotencyKey = `escalate:${row.exception_id}:${effective}`;
      const body = {
        receiptId, exceptionId: row.exception_id, action: "escalate",
        actorAssignmentId: input.workerAssignmentId,
        occurredAt: new Date(now).toISOString(),
        expectedExceptionSha256: row.exception_sha256,
        resultingAttentionState: effective,
        resultingBusinessState: "PENDING_RECONCILIATION",
        idempotencyKey,
      };
      const receiptSha256 = sha256(body);
      await db.query(
        `update crays_core.commerce_exceptions
            set attention_state=$1,escalated_at=$2,record_version=record_version+1
          where exception_id=$3`,
        [effective, body.occurredAt, row.exception_id],
      );
      await db.query(
        `insert into crays_core.commerce_exception_action_receipts (
           action_receipt_id,exception_id,tenant_id,partner_tenant_id,
           operator_legal_entity_id,store_id,action,actor_assignment_id,
           expected_exception_sha256,idempotency_key,occurred_at,
           resulting_attention_state,resulting_business_state,receipt_sha256)
         values ($1,$2,$3,$4,$5,$6,'escalate',$7,$8,$9,$10,$11,
           'PENDING_RECONCILIATION',$12)
         on conflict (tenant_id,idempotency_key) do nothing`,
        [receiptId, row.exception_id, input.tenantId, row.partner_tenant_id,
          row.operator_legal_entity_id, row.store_id, input.workerAssignmentId,
          row.exception_sha256, idempotencyKey, body.occurredAt, effective,
          receiptSha256],
      );
      receipts.push(Object.freeze({receiptId, receiptSha256}));
    }
    return Object.freeze(receipts);
  });
}
