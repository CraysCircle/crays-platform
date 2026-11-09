import {createHash} from "node:crypto";
import type {projectVendureEventToErp} from "./vendure-erp-projection-contract";

type QueryResult<Row> = Readonly<{rows: Row[]}>;
export type VendureErpProjectionDb = Readonly<{
  query<Row=Record<string,unknown>>(sql:string,values?:readonly unknown[]):Promise<QueryResult<Row>>;
}>;
export type VendureErpProjectionPool = Readonly<{
  connect():Promise<VendureErpProjectionDb & Readonly<{release():void}>>;
}>;
type ProjectionPlan=ReturnType<typeof projectVendureEventToErp>;

export type VendureErpProjectionMutation=Readonly<{
  tenantId:string;
  inboxEventId:string;
  projectionPlanId:string;
  outboxEventId:string;
  sourcePayloadSha256:string;
  signatureVerificationReceiptId:string;
  signatureVerificationReceiptSha256:string;
  receivedAt:string;
  plan:ProjectionPlan;
}>;

const HASH=/^[a-f0-9]{64}$/;
const nonempty=(value:string)=>value.trim().length>0;
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function prepareVendureErpProjectionMutation(input:VendureErpProjectionMutation){
  const p=input.plan;
  if([input.tenantId,input.inboxEventId,input.projectionPlanId,input.outboxEventId,
      input.signatureVerificationReceiptId,p.sourceEventId,p.snapshotId,p.idempotencyKey,
      p.partnerTenantId,p.operatorLegalEntityId,p.storeId,p.erpSiteId,p.erpCompanyId,
      p.erpWarehouseId,p.erpCostCenterId,p.erpBindingVersion]
      .some((value)=>!nonempty(value))||
    !HASH.test(input.sourcePayloadSha256)||
    !HASH.test(input.signatureVerificationReceiptSha256)||
    !HASH.test(p.snapshotSha256)||!HASH.test(p.payloadSha256)||
    !Number.isFinite(Date.parse(input.receivedAt))||
    p.state!=="PENDING_ERP_ACKNOWLEDGEMENT"){
    throw new Error("VENDURE_ERP_PROJECTION_INPUT_INVALID");
  }
  const payload=Object.fromEntries(Object.entries(p)
    .filter(([key])=>key!=="idempotencyKey"&&key!=="payloadSha256"));
  if(digest(payload)!==p.payloadSha256){
    throw new Error("VENDURE_ERP_PROJECTION_PAYLOAD_HASH_INVALID");
  }
  return Object.freeze({...input,plan:Object.freeze({...p})});
}

async function transaction<T>(pool:VendureErpProjectionPool,tenantId:string,
  work:(db:VendureErpProjectionDb)=>Promise<T>){
  const db=await pool.connect();
  try{
    await db.query("begin");
    await db.query("select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true)",[tenantId]);
    const result=await work(db);
    await db.query("commit");
    return result;
  }catch(error){
    await db.query("rollback").catch(()=>undefined);
    throw error;
  }finally{db.release();}
}

export function persistVendureErpProjection(pool:VendureErpProjectionPool,
  candidate:VendureErpProjectionMutation){
  const mutation=prepareVendureErpProjectionMutation(candidate);
  const p=mutation.plan;
  return transaction(pool,mutation.tenantId,async(db)=>{
    const existing=(await db.query<Readonly<{
      inbox_event_id:string;projection_plan_id:string;outbox_event_id:string;
      source_payload_sha256:string;signature_verification_receipt_sha256:string;
      payload_sha256:string;idempotency_key:string;
    }>>(`select i.inbox_event_id,p.projection_plan_id,o.outbox_event_id,
      i.source_payload_sha256,i.signature_verification_receipt_sha256,
      p.payload_sha256,p.idempotency_key
      from crays_core.vendure_erp_event_inbox i
      join crays_core.vendure_erp_projection_plans p using(tenant_id,inbox_event_id)
      join crays_core.vendure_erp_projection_outbox o using(tenant_id,projection_plan_id)
      where i.tenant_id=$1 and i.source_event_id=$2`,
      [mutation.tenantId,p.sourceEventId])).rows[0];
    if(existing){
      if(existing.inbox_event_id!==mutation.inboxEventId||
        existing.projection_plan_id!==mutation.projectionPlanId||
        existing.outbox_event_id!==mutation.outboxEventId||
        existing.source_payload_sha256!==mutation.sourcePayloadSha256||
        existing.signature_verification_receipt_sha256!==mutation.signatureVerificationReceiptSha256||
        existing.payload_sha256!==p.payloadSha256||existing.idempotency_key!==p.idempotencyKey){
        throw new Error("VENDURE_ERP_PROJECTION_REPLAY_CONFLICT");
      }
      return Object.freeze({projectionPlanId:mutation.projectionPlanId,
        outboxEventId:mutation.outboxEventId,replayed:true as const,
        state:"PENDING_ERP_ACKNOWLEDGEMENT" as const});
    }

    const snapshot=(await db.query<Readonly<{
      snapshot_sha256:string;partner_tenant_id:string;operator_legal_entity_id:string;
      store_id:string;vendure_seller_id:string;vendure_channel_id:string;
      erp_site_id:string;erp_company_id:string;erp_warehouse_ids:unknown;
      erp_cost_center_id:string|null;erp_binding_version:string;
    }>>(`select snapshot_sha256,partner_tenant_id,operator_legal_entity_id,store_id,
      vendure_seller_id,vendure_channel_id,erp_site_id,erp_company_id,erp_warehouse_ids,
      erp_cost_center_id,erp_binding_version
      from crays_core.checkout_order_snapshots
      where tenant_id=$1 and order_snapshot_id=$2 for share`,
      [mutation.tenantId,p.snapshotId])).rows[0];
    const warehouses=Array.isArray(snapshot?.erp_warehouse_ids)?snapshot.erp_warehouse_ids:[];
    if(!snapshot||snapshot.snapshot_sha256!==p.snapshotSha256||
      snapshot.partner_tenant_id!==p.partnerTenantId||
      snapshot.operator_legal_entity_id!==p.operatorLegalEntityId||
      snapshot.store_id!==p.storeId||snapshot.vendure_seller_id!==p.vendureSellerId||
      snapshot.vendure_channel_id!==p.vendureChannelId||
      snapshot.erp_site_id!==p.erpSiteId||snapshot.erp_company_id!==p.erpCompanyId||
      snapshot.erp_cost_center_id!==p.erpCostCenterId||
      snapshot.erp_binding_version!==p.erpBindingVersion||
      !warehouses.includes(p.erpWarehouseId)){
      throw new Error("VENDURE_ERP_PROJECTION_FROZEN_SNAPSHOT_CONFLICT");
    }

    const {idempotencyKey,payloadSha256,...payload}=p;
    await db.query(`insert into crays_core.vendure_erp_event_inbox
      (inbox_event_id,tenant_id,source_event_id,event_type,order_snapshot_id,snapshot_sha256,
       source_payload_sha256,signature_verification_receipt_id,
       signature_verification_receipt_sha256,received_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [mutation.inboxEventId,mutation.tenantId,p.sourceEventId,p.event,p.snapshotId,
       p.snapshotSha256,mutation.sourcePayloadSha256,mutation.signatureVerificationReceiptId,
       mutation.signatureVerificationReceiptSha256,mutation.receivedAt]);
    await db.query(`insert into crays_core.vendure_erp_projection_plans
      (projection_plan_id,tenant_id,inbox_event_id,source_event_id,order_snapshot_id,
       idempotency_key,partner_tenant_id,operator_legal_entity_id,store_id,erp_site_id,
       erp_company_id,erp_warehouse_id,erp_cost_center_id,erp_binding_version,payload,
       payload_sha256,projection_state,created_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,
        'PENDING_ERP_ACKNOWLEDGEMENT',$17)`,
      [mutation.projectionPlanId,mutation.tenantId,mutation.inboxEventId,p.sourceEventId,
       p.snapshotId,idempotencyKey,p.partnerTenantId,p.operatorLegalEntityId,p.storeId,
       p.erpSiteId,p.erpCompanyId,p.erpWarehouseId,p.erpCostCenterId,p.erpBindingVersion,
       JSON.stringify(payload),payloadSha256,mutation.receivedAt]);
    await db.query(`insert into crays_core.vendure_erp_projection_outbox
      (outbox_event_id,tenant_id,projection_plan_id,inbox_event_id,partner_tenant_id,
       erp_site_id,erp_company_id,idempotency_key,payload_sha256,delivery_state,created_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING',$10)`,
      [mutation.outboxEventId,mutation.tenantId,mutation.projectionPlanId,
       mutation.inboxEventId,p.partnerTenantId,p.erpSiteId,p.erpCompanyId,
       idempotencyKey,payloadSha256,mutation.receivedAt]);
    return Object.freeze({projectionPlanId:mutation.projectionPlanId,
      outboxEventId:mutation.outboxEventId,replayed:false as const,
      state:"PENDING_ERP_ACKNOWLEDGEMENT" as const});
  });
}

