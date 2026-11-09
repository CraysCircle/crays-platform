import type {
  preparePartnerCrmActivityPersistence,
  preparePartnerCrmActivityRevocation,
  observeTwentyCrmActivity,
  reconcileTwentyCrmActivity,
} from "./partner-crm-activity-projection-contract";

type Initial=ReturnType<typeof preparePartnerCrmActivityPersistence>;
type Revocation=ReturnType<typeof preparePartnerCrmActivityRevocation>;
type ProviderReceipt=ReturnType<typeof observeTwentyCrmActivity>;
type Reconciliation=ReturnType<typeof reconcileTwentyCrmActivity>;
type QueryResult<Row>=Readonly<{rows:Row[]}>;
export type PartnerCrmDb=Readonly<{query<Row=Record<string,unknown>>(sql:string,values?:readonly unknown[]):Promise<QueryResult<Row>>}>;
export type PartnerCrmPool=Readonly<{connect():Promise<PartnerCrmDb&Readonly<{release():void}>>}>;

async function transaction<T>(pool:PartnerCrmPool,tenantId:string,work:(db:PartnerCrmDb)=>Promise<T>){
  if(!tenantId.trim())throw new Error("CRM_ACTIVITY_TENANT_INVALID");
  const db=await pool.connect();
  try{await db.query("begin");await db.query("select set_config('crays.app_role','core_service',true), set_config('crays.tenant_id',$1,true)",[tenantId]);const result=await work(db);await db.query("commit");return result}catch(error){await db.query("rollback").catch(()=>undefined);throw error}finally{db.release()}
}

async function insertOutbox(db:PartnerCrmDb,outbox:Initial["outboxRecord"]|Revocation["outboxRecord"]){
  const result=await db.query<Readonly<{outbox_id:string;payload_sha256:string;operation:string}>>(
    `insert into crays_core.partner_crm_activity_outbox (
       outbox_id,projection_id,tenant_id,partner_tenant_id,operator_legal_entity_id,
       store_id,relationship_id,relationship_version,target_provider,operation,
       idempotency_key,payload,payload_sha256,delivery_state,owner_assignment_id,
       required_information,due_at,expires_at,attention_state,
       escalation_owner_role,next_safe_action,available_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,
       $17,$18,$19,$20,$21,$22)
     on conflict (tenant_id,idempotency_key) do nothing
     returning outbox_id,payload_sha256,operation`,
    [outbox.outboxId,outbox.projectionId,outbox.tenantId,outbox.partnerTenantId,
      outbox.operatorLegalEntityId,outbox.storeId,outbox.relationshipId,
      outbox.relationshipVersion,outbox.targetProvider,outbox.operation,
      outbox.idempotencyKey,JSON.stringify(outbox.payload),outbox.payloadSha256,
      outbox.deliveryState,outbox.ownerAssignmentId,outbox.requiredInformation,
      outbox.dueAt,outbox.expiresAt,outbox.attentionState,
      outbox.escalationOwnerRole,outbox.nextSafeAction,outbox.availableAt],
  );
  const row=result.rows[0]??(await db.query<Readonly<{outbox_id:string;payload_sha256:string;operation:string}>>(
    `select outbox_id,payload_sha256,operation from crays_core.partner_crm_activity_outbox where tenant_id=$1 and idempotency_key=$2`,
    [outbox.tenantId,outbox.idempotencyKey],
  )).rows[0];
  if(!row||row.outbox_id!==outbox.outboxId||row.payload_sha256!==outbox.payloadSha256||row.operation!==outbox.operation)throw new Error("CRM_ACTIVITY_OUTBOX_REPLAY_CONFLICT");
}

export function persistPartnerCrmActivity(pool:PartnerCrmPool,prepared:Initial){
  const record=prepared.projectionRecord;
  return transaction(pool,record.tenantId,async(db)=>{
    const result=await db.query<Readonly<{projection_id:string;payload_sha256:string}>>(
      `insert into crays_core.partner_crm_activity_projections (
         projection_id,tenant_id,source_activity_id,activity_kind,occurred_at,
         canonical_person_id,canonical_organization_id,relationship_id,
         relationship_version,contract_permission_receipt_id,partner_tenant_id,
         operator_legal_entity_id,store_id,seller_snapshot_sha256,order_pointer,
         summary_code,attribution_code,idempotency_key,payload,payload_sha256,
         lifecycle_state,record_version)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
         $18,$19::jsonb,$20,$21,$22)
       on conflict (tenant_id,idempotency_key) do nothing
       returning projection_id,payload_sha256`,
      [record.projectionId,record.tenantId,record.sourceActivityId,record.activityKind,
        record.occurredAt,record.canonicalPersonId,record.canonicalOrganizationId,
        record.relationshipId,record.relationshipVersion,
        record.contractPermissionReceiptId,record.partnerTenantId,
        record.operatorLegalEntityId,record.storeId,record.sellerSnapshotSha256,
        record.orderPointer,record.summaryCode,record.attributionCode,
        record.idempotencyKey,JSON.stringify(record.payload),record.payloadSha256,
        record.lifecycleState,record.recordVersion],
    );
    const row=result.rows[0]??(await db.query<Readonly<{projection_id:string;payload_sha256:string}>>(
      `select projection_id,payload_sha256 from crays_core.partner_crm_activity_projections where tenant_id=$1 and idempotency_key=$2`,
      [record.tenantId,record.idempotencyKey],
    )).rows[0];if(!row||row.projection_id!==record.projectionId||row.payload_sha256!==record.payloadSha256)throw new Error("CRM_ACTIVITY_PROJECTION_REPLAY_CONFLICT");
    await insertOutbox(db,prepared.outboxRecord);
    return Object.freeze({projectionId:record.projectionId,outboxId:prepared.outboxRecord.outboxId,state:"PENDING"as const,persistenceSha256:prepared.persistenceSha256});
  });
}

export function persistPartnerCrmActivityRevocation(pool:PartnerCrmPool,prepared:Revocation){
  const update=prepared.projectionLifecycleUpdate;
  return transaction(pool,update.tenantId,async(db)=>{
    const changed=await db.query<Readonly<{projection_id:string;record_version:number}>>(
      `update crays_core.partner_crm_activity_projections
          set lifecycle_state='REVOCATION_PENDING',revocation_reason_code=$1,
              record_version=record_version+1
        where projection_id=$2 and tenant_id=$3 and record_version=$4
          and lifecycle_state='ACTIVE'
        returning projection_id,record_version`,
      [update.revocationReasonCode,update.projectionId,update.tenantId,update.expectedRecordVersion],
    );
    if(!changed.rows[0]||changed.rows[0].record_version!==update.recordVersion)throw new Error("CRM_ACTIVITY_REVOCATION_CONFLICT");
    await insertOutbox(db,prepared.outboxRecord);
    return Object.freeze({projectionId:update.projectionId,outboxId:prepared.outboxRecord.outboxId,state:"REVOCATION_PENDING"as const,persistenceSha256:prepared.persistenceSha256});
  });
}

export function persistTwentyCrmActivityProviderReceipt(pool:PartnerCrmPool,receipt:ProviderReceipt){
  return transaction(pool,receipt.tenantId,async(db)=>{
    const inserted=await db.query<Readonly<{provider_receipt_id:string;receipt_sha256:string}>>(
      `insert into crays_core.partner_crm_activity_provider_receipts (
         provider_receipt_id,outbox_id,projection_id,tenant_id,partner_tenant_id,
         operator_legal_entity_id,store_id,relationship_id,relationship_version,
         operation,twenty_activity_pointer_id,provider_event_id,
         observed_payload_sha256,signature_verified,provider_state,
         acknowledged_at,receipt_sha256)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       on conflict (tenant_id,provider_event_id) do nothing
       returning provider_receipt_id,receipt_sha256`,
      [receipt.providerReceiptId,receipt.outboxId,receipt.projectionId,receipt.tenantId,
        receipt.partnerTenantId,receipt.operatorLegalEntityId,receipt.storeId,
        receipt.relationshipId,receipt.relationshipVersion,receipt.operation,
        receipt.twentyActivityPointerId,receipt.providerEventId,
        receipt.observedPayloadSha256,receipt.signatureVerified,
        receipt.providerState,receipt.acknowledgedAt,receipt.receiptSha256],
    );
    const row=inserted.rows[0]??(await db.query<Readonly<{provider_receipt_id:string;receipt_sha256:string}>>(
      `select provider_receipt_id,receipt_sha256 from crays_core.partner_crm_activity_provider_receipts where tenant_id=$1 and provider_event_id=$2`,
      [receipt.tenantId,receipt.providerEventId],
    )).rows[0];if(!row||row.provider_receipt_id!==receipt.providerReceiptId||row.receipt_sha256!==receipt.receiptSha256)throw new Error("CRM_ACTIVITY_PROVIDER_RECEIPT_REPLAY_CONFLICT");
    const updated=await db.query(`update crays_core.partner_crm_activity_outbox set delivery_state='ACKNOWLEDGED_PENDING_RECONCILIATION',next_safe_action='reconcile',updated_at=$1 where outbox_id=$2 and tenant_id=$3 and delivery_state<>'RECONCILED' returning outbox_id`,[receipt.acknowledgedAt,receipt.outboxId,receipt.tenantId]);
    if(updated.rows.length!==1)throw new Error("CRM_ACTIVITY_PROVIDER_ACK_OUTBOX_CONFLICT");
    return Object.freeze({providerReceiptId:receipt.providerReceiptId,state:receipt.providerState,receiptSha256:receipt.receiptSha256});
  });
}

export function persistTwentyCrmActivityReconciliation(pool:PartnerCrmPool,reconciliation:Reconciliation){
  return transaction(pool,reconciliation.tenantId,async(db)=>{
    const inserted=await db.query<Readonly<{reconciliation_receipt_id:string;receipt_sha256:string}>>(
      `insert into crays_core.partner_crm_activity_reconciliation_receipts (
         reconciliation_receipt_id,outbox_id,provider_receipt_id,projection_id,
         tenant_id,partner_tenant_id,operator_legal_entity_id,store_id,
         relationship_id,relationship_version,expected_payload_sha256,
         observed_payload_sha256,reconciliation_state,reconciled_by_assignment_id,
         reconciled_at,next_safe_action,receipt_sha256)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       on conflict (tenant_id,outbox_id,provider_receipt_id) do nothing
       returning reconciliation_receipt_id,receipt_sha256`,
      [reconciliation.reconciliationReceiptId,reconciliation.outboxId,
        reconciliation.providerReceiptId,reconciliation.projectionId,
        reconciliation.tenantId,reconciliation.partnerTenantId,
        reconciliation.operatorLegalEntityId,reconciliation.storeId,
        reconciliation.relationshipId,reconciliation.relationshipVersion,
        reconciliation.expectedPayloadSha256,reconciliation.observedPayloadSha256,
        reconciliation.reconciliationState,reconciliation.reconciledByAssignmentId,
        reconciliation.reconciledAt,reconciliation.nextSafeAction,
        reconciliation.receiptSha256],
    );
    const row=inserted.rows[0]??(await db.query<Readonly<{reconciliation_receipt_id:string;receipt_sha256:string}>>(
      `select reconciliation_receipt_id,receipt_sha256 from crays_core.partner_crm_activity_reconciliation_receipts where tenant_id=$1 and outbox_id=$2 and provider_receipt_id=$3`,
      [reconciliation.tenantId,reconciliation.outboxId,reconciliation.providerReceiptId],
    )).rows[0];if(!row||row.reconciliation_receipt_id!==reconciliation.reconciliationReceiptId||row.receipt_sha256!==reconciliation.receiptSha256)throw new Error("CRM_ACTIVITY_RECONCILIATION_REPLAY_CONFLICT");
    if(reconciliation.reconciliationState==="MATCHED"||reconciliation.reconciliationState==="REVOKED_MATCHED"){
      await db.query(`update crays_core.partner_crm_activity_outbox set delivery_state='RECONCILED',next_safe_action='close',updated_at=$1 where outbox_id=$2 and tenant_id=$3`,[reconciliation.reconciledAt,reconciliation.outboxId,reconciliation.tenantId]);
    }
    if(reconciliation.reconciliationState==="REVOKED_MATCHED"){
      const revoked=await db.query(`update crays_core.partner_crm_activity_projections set lifecycle_state='REVOKED',revoked_at=$1,record_version=record_version+1 where projection_id=$2 and tenant_id=$3 and lifecycle_state='REVOCATION_PENDING' returning projection_id`,[reconciliation.reconciledAt,reconciliation.projectionId,reconciliation.tenantId]);
      if(revoked.rows.length!==1)throw new Error("CRM_ACTIVITY_REVOCATION_RECONCILIATION_CONFLICT");
    }
    return Object.freeze({reconciliationReceiptId:reconciliation.reconciliationReceiptId,state:reconciliation.reconciliationState,receiptSha256:reconciliation.receiptSha256});
  });
}
