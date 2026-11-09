import type {observePartnerPlaneWorkItem,preparePartnerPlaneWorkItemDelivery,reconcilePartnerPlaneWorkItem} from "./partner-plane-work-item-delivery-contract";

type Command=ReturnType<typeof preparePartnerPlaneWorkItemDelivery>;
type ProviderReceipt=ReturnType<typeof observePartnerPlaneWorkItem>;
type Reconciliation=ReturnType<typeof reconcilePartnerPlaneWorkItem>;
type Result<Row>=Readonly<{rows:Row[]}>;
export type PartnerPlaneDb=Readonly<{query<Row=Record<string,unknown>>(sql:string,values?:readonly unknown[]):Promise<Result<Row>>}>;
export type PartnerPlanePool=Readonly<{connect():Promise<PartnerPlaneDb&Readonly<{release():void}>>}>;

async function transaction<T>(pool:PartnerPlanePool,tenantId:string,work:(db:PartnerPlaneDb)=>Promise<T>){
  if(!tenantId.trim())throw new Error("PLANE_REPOSITORY_TENANT_INVALID");
  const db=await pool.connect();
  try{
    await db.query("begin");
    await db.query("select set_config('crays.app_role','core_service',true), set_config('crays.tenant_id',$1,true)",[tenantId]);
    const value=await work(db);await db.query("commit");return value;
  }catch(error){await db.query("rollback").catch(()=>undefined);throw error}finally{db.release()}
}

export function persistPartnerPlaneWorkItemCommand(pool:PartnerPlanePool,command:Command){
  return transaction(pool,command.tenantId,async db=>{
    const inserted=await db.query<Readonly<{command_id:string;command_sha256:string;work_item_correlation_id:string}>>(
      `insert into crays_core.partner_plane_work_item_commands (
        command_id,tenant_id,work_item_correlation_id,source_kind,source_record_id,
        source_record_sha256,partner_tenant_id,operator_legal_entity_id,store_id,
        plane_workspace_id,plane_project_id,project_binding_version,owner_role,
        owner_assignment_id,evidence_refs,command_payload,command_sha256,idempotency_key,
        delivery_state,required_information,due_at,expires_at,attention_state,
        escalation_owner_role,next_safe_action,created_at,updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,
        $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$26)
       on conflict (tenant_id,idempotency_key) do nothing
       returning command_id,command_sha256,work_item_correlation_id`,
      [command.commandId,command.tenantId,command.workItemCorrelationId,command.sourceKind,
        command.sourceRecordId,command.sourceRecordSha256,command.partnerTenantId,
        command.operatorLegalEntityId,command.storeId,command.planeWorkspaceId,
        command.planeProjectId,command.projectBindingVersion,command.ownerRole,
        command.ownerAssignmentId,JSON.stringify(command.evidenceRefs),JSON.stringify(command.commandPayload),
        command.commandSha256,command.idempotencyKey,command.deliveryState,
        command.requiredInformation,command.dueAt,command.expiresAt,command.attentionState,
        command.escalationOwnerRole,command.nextSafeAction,command.createdAt],
    );
    const row=inserted.rows[0]??(await db.query<Readonly<{command_id:string;command_sha256:string;work_item_correlation_id:string}>>(
      `select command_id,command_sha256,work_item_correlation_id from crays_core.partner_plane_work_item_commands where tenant_id=$1 and idempotency_key=$2`,
      [command.tenantId,command.idempotencyKey],
    )).rows[0];
    if(!row||row.command_id!==command.commandId||row.command_sha256!==command.commandSha256||row.work_item_correlation_id!==command.workItemCorrelationId)
      throw new Error("PLANE_COMMAND_REPLAY_CONFLICT");
    return Object.freeze({commandId:command.commandId,state:"PENDING" as const});
  });
}

export function persistPartnerPlaneWorkItemReceipt(pool:PartnerPlanePool,receipt:ProviderReceipt){
  return transaction(pool,receipt.tenantId,async db=>{
    const inserted=await db.query<Readonly<{provider_receipt_id:string;receipt_sha256:string}>>(
      `insert into crays_core.partner_plane_work_item_receipts (
        provider_receipt_id,command_id,tenant_id,partner_tenant_id,operator_legal_entity_id,
        store_id,plane_workspace_id,plane_project_id,plane_work_item_id,provider_event_id,
        observed_command_sha256,signature_verified,provider_state,acknowledged_at,receipt_sha256)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       on conflict (tenant_id,provider_event_id) do nothing returning provider_receipt_id,receipt_sha256`,
      [receipt.providerReceiptId,receipt.commandId,receipt.tenantId,receipt.partnerTenantId,
        receipt.operatorLegalEntityId,receipt.storeId,receipt.planeWorkspaceId,receipt.planeProjectId,
        receipt.planeWorkItemId,receipt.providerEventId,receipt.observedCommandSha256,
        receipt.signatureVerified,receipt.providerState,receipt.acknowledgedAt,receipt.receiptSha256],
    );
    const row=inserted.rows[0]??(await db.query<Readonly<{provider_receipt_id:string;receipt_sha256:string}>>(
      `select provider_receipt_id,receipt_sha256 from crays_core.partner_plane_work_item_receipts where tenant_id=$1 and provider_event_id=$2`,
      [receipt.tenantId,receipt.providerEventId],
    )).rows[0];
    if(!row||row.provider_receipt_id!==receipt.providerReceiptId||row.receipt_sha256!==receipt.receiptSha256)throw new Error("PLANE_RECEIPT_REPLAY_CONFLICT");
    const updated=await db.query(`update crays_core.partner_plane_work_item_commands set delivery_state='ACKNOWLEDGED_PENDING_RECONCILIATION',attention_state='ACKNOWLEDGED',next_safe_action='reconcile',updated_at=$1 where command_id=$2 and tenant_id=$3 and delivery_state in ('PENDING','CLAIMED','UNKNOWN_OUTCOME','ACKNOWLEDGED_PENDING_RECONCILIATION') returning command_id`,[receipt.acknowledgedAt,receipt.commandId,receipt.tenantId]);
    if(!updated.rows[0])throw new Error("PLANE_COMMAND_ACK_STATE_CONFLICT");
    return Object.freeze({providerReceiptId:receipt.providerReceiptId,state:"ACKNOWLEDGED_PENDING_RECONCILIATION" as const});
  });
}

export function persistPartnerPlaneWorkItemReconciliation(pool:PartnerPlanePool,reconciliation:Reconciliation){
  return transaction(pool,reconciliation.tenantId,async db=>{
    const inserted=await db.query<Readonly<{reconciliation_receipt_id:string;receipt_sha256:string}>>(
      `insert into crays_core.partner_plane_work_item_reconciliation_receipts (
        reconciliation_receipt_id,command_id,provider_receipt_id,tenant_id,
        partner_tenant_id,operator_legal_entity_id,store_id,plane_workspace_id,
        plane_project_id,expected_work_item_correlation_id,observed_work_item_correlation_id,
        expected_command_sha256,observed_command_sha256,reconciliation_state,
        reconciled_by_assignment_id,reconciled_at,next_safe_action,receipt_sha256)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       on conflict (tenant_id,command_id,provider_receipt_id) do nothing
       returning reconciliation_receipt_id,receipt_sha256`,
      [reconciliation.reconciliationReceiptId,reconciliation.commandId,reconciliation.providerReceiptId,
        reconciliation.tenantId,reconciliation.partnerTenantId,reconciliation.operatorLegalEntityId,
        reconciliation.storeId,reconciliation.planeWorkspaceId,reconciliation.planeProjectId,
        reconciliation.expectedWorkItemCorrelationId,reconciliation.observedWorkItemCorrelationId,
        reconciliation.expectedCommandSha256,reconciliation.observedCommandSha256,
        reconciliation.reconciliationState,reconciliation.reconciledByAssignmentId,
        reconciliation.reconciledAt,reconciliation.nextSafeAction,reconciliation.receiptSha256],
    );
    const row=inserted.rows[0]??(await db.query<Readonly<{reconciliation_receipt_id:string;receipt_sha256:string}>>(
      `select reconciliation_receipt_id,receipt_sha256 from crays_core.partner_plane_work_item_reconciliation_receipts where tenant_id=$1 and command_id=$2 and provider_receipt_id=$3`,
      [reconciliation.tenantId,reconciliation.commandId,reconciliation.providerReceiptId],
    )).rows[0];
    if(!row||row.reconciliation_receipt_id!==reconciliation.reconciliationReceiptId||row.receipt_sha256!==reconciliation.receiptSha256)throw new Error("PLANE_RECONCILIATION_REPLAY_CONFLICT");
    const matched=reconciliation.reconciliationState==="MATCHED";
    const updated=await db.query(`update crays_core.partner_plane_work_item_commands set delivery_state=$1,attention_state=$2,next_safe_action=$3,updated_at=$4 where command_id=$5 and tenant_id=$6 and delivery_state='ACKNOWLEDGED_PENDING_RECONCILIATION' returning command_id`,[matched?"RECONCILED":"FAILED",matched?"ACKNOWLEDGED":"ESCALATED",matched?"close":"repair",reconciliation.reconciledAt,reconciliation.commandId,reconciliation.tenantId]);
    if(!updated.rows[0])throw new Error("PLANE_RECONCILIATION_STATE_CONFLICT");
    return Object.freeze({reconciliationReceiptId:reconciliation.reconciliationReceiptId,state:reconciliation.reconciliationState});
  });
}
