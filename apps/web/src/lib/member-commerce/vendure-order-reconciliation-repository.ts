import {
  freezeVendureOrderReconciliationCommand,
  verifyVendureOrderReconciliationResolution,
  type VendureOrderReconciliationCommandInput,
  type VendureOrderReconciliationResolution,
} from "./vendure-order-reconciliation";

type Result<Row>=Readonly<{rows:Row[]}>;
export type VendureOrderReconciliationDb=Readonly<{
  query<Row=Record<string,unknown>>(sql:string,values?:readonly unknown[]):Promise<Result<Row>>;
}>;
export type VendureOrderReconciliationPool=Readonly<{
  connect():Promise<VendureOrderReconciliationDb&Readonly<{release():void}>>;
}>;

async function transaction<T>(
  pool:VendureOrderReconciliationPool,
  tenantId:string,
  work:(db:VendureOrderReconciliationDb)=>Promise<T>,
){
  const db=await pool.connect();
  try{
    await db.query("begin");
    await db.query(
      "select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true)",
      [tenantId],
    );
    const result=await work(db);
    await db.query("commit");
    return result;
  }catch(error){
    await db.query("rollback").catch(()=>undefined);
    throw error;
  }finally{
    db.release();
  }
}

type OutboxRow=Readonly<{
  outbox_event_id:string;
  order_snapshot_id:string;
  snapshot_sha256:string;
  payload_sha256:string;
  delivery_state:string;
  attempt_count:number;
}>;

export function persistVendureOrderReconciliationCommand(
  pool:VendureOrderReconciliationPool,
  input:VendureOrderReconciliationCommandInput,
){
  const command=freezeVendureOrderReconciliationCommand(input);
  return transaction(pool,command.tenantId,async(db)=>{
    const outbox=(await db.query<OutboxRow>(
      `select outbox_event_id,order_snapshot_id,snapshot_sha256,payload_sha256,
              delivery_state,attempt_count
         from crays_core.checkout_order_transition_outbox
        where tenant_id=$1 and outbox_event_id=$2
        for update`,
      [command.tenantId,command.outboxEventId],
    )).rows[0];
    if(!outbox)throw new Error("VENDURE_ORDER_RECONCILIATION_OUTBOX_NOT_FOUND");
    const prior=(await db.query<Readonly<{
      reconciliation_command_id:string;
      outbox_event_id:string;
      order_snapshot_id:string;
      observed_attempt_count:number;
      command_sha256:string;
      reconciliation_state:string;
    }>>(
      `select reconciliation_command_id,outbox_event_id,order_snapshot_id,observed_attempt_count,
              command_sha256,reconciliation_state
         from crays_core.vendure_order_reconciliation_commands
        where tenant_id=$1 and idempotency_key=$2`,
      [command.tenantId,command.idempotencyKey],
    )).rows[0];
    if(prior){
      if(prior.reconciliation_command_id!==command.reconciliationCommandId
        || prior.outbox_event_id!==command.outboxEventId
        || prior.order_snapshot_id!==command.orderSnapshotId
        || prior.observed_attempt_count!==command.observedAttemptCount
        || prior.command_sha256!==command.commandSha256)
        throw new Error("VENDURE_ORDER_RECONCILIATION_COMMAND_REPLAY_CONFLICT");
      return Object.freeze({
        command,
        reconciliationState:prior.reconciliation_state,
        replayed:true as const,
      });
    }
    if(outbox.delivery_state!=="UNKNOWN_RECONCILIATION_REQUIRED")
      throw new Error("VENDURE_ORDER_RECONCILIATION_NOT_REQUIRED");
    if(outbox.order_snapshot_id!==command.orderSnapshotId
      || outbox.attempt_count!==command.observedAttemptCount
      || outbox.snapshot_sha256!==command.snapshotSha256
      || outbox.payload_sha256!==command.payloadSha256)
      throw new Error("VENDURE_ORDER_RECONCILIATION_COMMAND_SCOPE_MISMATCH");
    await db.query(
      `insert into crays_core.vendure_order_reconciliation_commands
        (reconciliation_command_id,tenant_id,outbox_event_id,order_snapshot_id,
         observed_attempt_count,snapshot_sha256,payload_sha256,idempotency_key,
         command_payload,command_sha256,reconciliation_state,created_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,'PERSISTED_PENDING_OBSERVATION',$11)`,
      [
        command.reconciliationCommandId,command.tenantId,command.outboxEventId,
        command.orderSnapshotId,command.observedAttemptCount,command.snapshotSha256,
        command.payloadSha256,command.idempotencyKey,JSON.stringify(command),
        command.commandSha256,command.createdAt,
      ],
    );
    return Object.freeze({
      command,
      reconciliationState:"PERSISTED_PENDING_OBSERVATION",
      replayed:false as const,
    });
  });
}

export function persistVendureOrderReconciliationResolution(
  pool:VendureOrderReconciliationPool,
  input:VendureOrderReconciliationResolution,
){
  const resolution=verifyVendureOrderReconciliationResolution(input);
  return transaction(pool,resolution.tenantId,async(db)=>{
    const joined=(await db.query<Readonly<{
      command_sha256:string;
      reconciliation_state:string;
      outbox_event_id:string;
      order_snapshot_id:string;
      observed_attempt_count:number;
      delivery_state:string;
      attempt_count:number;
    }>>(
      `select c.command_sha256,c.reconciliation_state,c.outbox_event_id,c.order_snapshot_id,
              c.observed_attempt_count,o.delivery_state,o.attempt_count
         from crays_core.vendure_order_reconciliation_commands c
         join crays_core.checkout_order_transition_outbox o
           on o.outbox_event_id=c.outbox_event_id and o.tenant_id=c.tenant_id
        where c.tenant_id=$1 and c.reconciliation_command_id=$2
        for update of c,o`,
      [resolution.tenantId,resolution.reconciliationCommandId],
    )).rows[0];
    if(!joined)throw new Error("VENDURE_ORDER_RECONCILIATION_COMMAND_NOT_FOUND");
    const prior=(await db.query<Readonly<{
      resolution_receipt_id:string;
      resolution_sha256:string;
      observation_outcome:string;
      target_delivery_state:string;
    }>>(
      `select resolution_receipt_id,resolution_sha256,observation_outcome,target_delivery_state
         from crays_core.vendure_order_reconciliation_resolution_receipts
        where tenant_id=$1 and reconciliation_command_id=$2`,
      [resolution.tenantId,resolution.reconciliationCommandId],
    )).rows[0];
    if(prior){
      if(prior.resolution_receipt_id!==resolution.resolutionReceiptId
        || prior.resolution_sha256!==resolution.resolutionSha256
        || prior.observation_outcome!==resolution.observationOutcome
        || prior.target_delivery_state!==resolution.targetDeliveryState)
        throw new Error("VENDURE_ORDER_RECONCILIATION_RESOLUTION_REPLAY_CONFLICT");
      return Object.freeze({
        resolutionReceiptId:prior.resolution_receipt_id,
        targetDeliveryState:prior.target_delivery_state,
        replayed:true as const,
      });
    }
    if(joined.reconciliation_state!=="PERSISTED_PENDING_OBSERVATION"
      || joined.delivery_state!=="UNKNOWN_RECONCILIATION_REQUIRED"
      || joined.command_sha256!==resolution.commandSha256
      || joined.outbox_event_id!==resolution.outboxEventId
      || joined.order_snapshot_id!==resolution.orderSnapshotId
      || joined.observed_attempt_count!==resolution.observedAttemptCount
      || joined.attempt_count!==resolution.observedAttemptCount)
      throw new Error("VENDURE_ORDER_RECONCILIATION_RESOLUTION_SCOPE_MISMATCH");
    await db.query(
      `insert into crays_core.vendure_order_reconciliation_resolution_receipts
        (resolution_receipt_id,tenant_id,reconciliation_command_id,outbox_event_id,
         order_snapshot_id,observed_attempt_count,command_sha256,observation_outcome,
         observed_provider_state,provider_order_id,observation_payload_sha256,
         target_delivery_state,resolution_sha256,observed_at,created_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)`,
      [
        resolution.resolutionReceiptId,resolution.tenantId,resolution.reconciliationCommandId,
        resolution.outboxEventId,resolution.orderSnapshotId,resolution.observedAttemptCount,
        resolution.commandSha256,resolution.observationOutcome,resolution.observedProviderState,
        resolution.providerOrderId,resolution.observationPayloadSha256,
        resolution.targetDeliveryState,resolution.resolutionSha256,resolution.observedAt,
      ],
    );
    await db.query(
      `update crays_core.vendure_order_reconciliation_commands
          set reconciliation_state='RESOLVED',resolved_at=$1
        where tenant_id=$2 and reconciliation_command_id=$3`,
      [resolution.observedAt,resolution.tenantId,resolution.reconciliationCommandId],
    );
    const errorCode=resolution.targetDeliveryState==="FAILED_RETRYABLE"
      ?"RECONCILIATION_PROVEN_NOT_DELIVERED"
      :resolution.targetDeliveryState==="UNKNOWN_RECONCILIATION_REQUIRED"
        ?"RECONCILIATION_STILL_UNKNOWN"
        :null;
    await db.query(
      `update crays_core.checkout_order_transition_outbox
          set delivery_state=$1,
              claimed_at=null,
              delivered_at=case when $1='DELIVERED' then $2::timestamptz else null end,
              last_error_code=$3
        where tenant_id=$4 and outbox_event_id=$5`,
      [
        resolution.targetDeliveryState,resolution.observedAt,errorCode,
        resolution.tenantId,resolution.outboxEventId,
      ],
    );
    return Object.freeze({
      resolutionReceiptId:resolution.resolutionReceiptId,
      targetDeliveryState:resolution.targetDeliveryState,
      replayed:false as const,
    });
  });
}
