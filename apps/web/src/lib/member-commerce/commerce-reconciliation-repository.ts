import {
  snapshotPreparedCommerceReconciliation,
  type preparePartnerCommerceReconciliationPersistence,
} from "./partner-commerce-reconciliation-contract";

type Prepared = ReturnType<typeof preparePartnerCommerceReconciliationPersistence>;
type QueryResult<Row> = Readonly<{rows: Row[]}>;
export type CommerceReconciliationDb = Readonly<{
  query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
}>;
export type CommerceReconciliationPool = Readonly<{
  connect(): Promise<CommerceReconciliationDb & Readonly<{release(): void}>>;
}>;

export async function configureCommerceReconciliationCoreScope(db:CommerceReconciliationDb,tenantId:string){
  if(!tenantId.trim())throw new Error("COMMERCE_RECONCILIATION_TENANT_INVALID");
  await db.query("select set_config('crays.app_role','core_service',true), set_config('crays.tenant_id',$1,true)",[tenantId]);
}

export async function persistPreparedCommerceReconciliation(db:CommerceReconciliationDb,prepared:Prepared){
  prepared=snapshotPreparedCommerceReconciliation(prepared);
  const observation=prepared.observationRecord;
  const existingObservation=await db.query<Readonly<{observation_id:string;actual_sha256:string;source_receipt_sha256:string}>>(
    `insert into crays_core.commerce_actual_observations (
       observation_id,tenant_id,partner_tenant_id,operator_legal_entity_id,store_id,
       order_id,order_seller_snapshot_sha256,erp_site_id,erp_company_id,
       accounting_period,erp_acknowledgement_id,acknowledged_at,actual_observed_at,
       actual_payload,actual_sha256,source_receipt_sha256,source_signature_verified)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17)
     on conflict (source_receipt_sha256) do nothing
     returning observation_id,actual_sha256,source_receipt_sha256`,
    [observation.observationId,observation.tenantId,observation.partnerTenantId,
      observation.operatorLegalEntityId,observation.storeId,observation.orderId,
      observation.orderSellerSnapshotSha256,observation.erpSiteId,
      observation.erpCompanyId,observation.accountingPeriod,
      observation.erpAcknowledgementId,observation.acknowledgedAt,
      observation.actualObservedAt,JSON.stringify(observation.actualPayload),
      observation.actualSha256,observation.sourceReceiptSha256,
      observation.sourceSignatureVerified],
  );
  const observationRow=existingObservation.rows[0]??(await db.query<Readonly<{observation_id:string;actual_sha256:string;source_receipt_sha256:string}>>(
    `select observation_id,actual_sha256,source_receipt_sha256 from crays_core.commerce_actual_observations where source_receipt_sha256=$1`,
    [observation.sourceReceiptSha256],
  )).rows[0];
  if(!observationRow||observationRow.observation_id!==observation.observationId||observationRow.actual_sha256!==observation.actualSha256){
    throw new Error("COMMERCE_ACTUAL_OBSERVATION_REPLAY_CONFLICT");
  }

  const receipt=prepared.reconciliationReceipt;
  const existingReceipt=await db.query<Readonly<{reconciliation_receipt_id:string;receipt_sha256:string;reconciliation_state:string}>>(
    `insert into crays_core.commerce_reconciliation_receipts (
       reconciliation_receipt_id,observation_id,tenant_id,partner_tenant_id,
       operator_legal_entity_id,store_id,order_id,accounting_period,
       expected_actual_sha256,observed_actual_sha256,reconciliation_state,
       next_safe_action,reconciled_by_assignment_id,reconciled_at,receipt_sha256)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     on conflict (tenant_id,observation_id,expected_actual_sha256) do nothing
     returning reconciliation_receipt_id,receipt_sha256,reconciliation_state`,
    [receipt.reconciliationReceiptId,receipt.observationId,receipt.tenantId,
      receipt.partnerTenantId,receipt.operatorLegalEntityId,receipt.storeId,
      receipt.orderId,receipt.accountingPeriod,receipt.expectedActualSha256,
      receipt.observedActualSha256,receipt.reconciliationState,
      receipt.nextSafeAction,receipt.reconciledByAssignmentId,
      receipt.reconciledAt,receipt.receiptSha256],
  );
  const receiptRow=existingReceipt.rows[0]??(await db.query<Readonly<{reconciliation_receipt_id:string;receipt_sha256:string;reconciliation_state:string}>>(
    `select reconciliation_receipt_id,receipt_sha256,reconciliation_state
       from crays_core.commerce_reconciliation_receipts
      where tenant_id=$1 and observation_id=$2 and expected_actual_sha256=$3`,
    [receipt.tenantId,receipt.observationId,receipt.expectedActualSha256],
  )).rows[0];
  if(!receiptRow||receiptRow.reconciliation_receipt_id!==receipt.reconciliationReceiptId||receiptRow.receipt_sha256!==receipt.receiptSha256||receiptRow.reconciliation_state!==receipt.reconciliationState){
    throw new Error("COMMERCE_RECONCILIATION_RECEIPT_REPLAY_CONFLICT");
  }

  if(prepared.exportRecord){
    const exportRecord=prepared.exportRecord;
    const existingExport=await db.query<Readonly<{export_id:string;actual_sha256:string;reconciliation_receipt_sha256:string}>>(
      `insert into crays_core.commerce_reconciled_actual_exports (
         export_id,reconciliation_receipt_id,observation_id,tenant_id,
         partner_tenant_id,operator_legal_entity_id,store_id,order_id,
         accounting_period,actual_sha256,source_receipt_sha256,
         reconciliation_receipt_sha256,export_state)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (reconciliation_receipt_id) do nothing
       returning export_id,actual_sha256,reconciliation_receipt_sha256`,
      [exportRecord.exportId,exportRecord.reconciliationReceiptId,
        exportRecord.observationId,exportRecord.tenantId,
        exportRecord.partnerTenantId,exportRecord.operatorLegalEntityId,
        exportRecord.storeId,exportRecord.orderId,exportRecord.accountingPeriod,
        exportRecord.actualSha256,exportRecord.sourceReceiptSha256,
        exportRecord.reconciliationReceiptSha256,exportRecord.exportState],
    );
    const exportRow=existingExport.rows[0]??(await db.query<Readonly<{export_id:string;actual_sha256:string;reconciliation_receipt_sha256:string}>>(
      `select export_id,actual_sha256,reconciliation_receipt_sha256
         from crays_core.commerce_reconciled_actual_exports
        where reconciliation_receipt_id=$1`,
      [exportRecord.reconciliationReceiptId],
    )).rows[0];
    if(!exportRow||exportRow.export_id!==exportRecord.exportId||exportRow.actual_sha256!==exportRecord.actualSha256||exportRow.reconciliation_receipt_sha256!==exportRecord.reconciliationReceiptSha256){
      throw new Error("COMMERCE_RECONCILED_ACTUAL_EXPORT_REPLAY_CONFLICT");
    }
  }
  return Object.freeze({
    observationId:observation.observationId,
    reconciliationReceiptId:receipt.reconciliationReceiptId,
    exportId:prepared.exportRecord?.exportId??null,
    state:receipt.reconciliationState,
    persistenceSha256:prepared.persistenceSha256,
  });
}

export async function persistCommerceReconciliationTransaction(pool:CommerceReconciliationPool,prepared:Prepared){
  prepared=snapshotPreparedCommerceReconciliation(prepared);
  const client=await pool.connect();
  try{
    await client.query("begin");
    await configureCommerceReconciliationCoreScope(client,prepared.observationRecord.tenantId);
    const result=await persistPreparedCommerceReconciliation(client,prepared);
    await client.query("commit");
    return result;
  }catch(error){
    await client.query("rollback").catch(()=>undefined);
    throw error;
  }finally{client.release()}
}
