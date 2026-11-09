import type{SellerFulfillmentDb,SellerFulfillmentPool}from"./seller-fulfillment-repository";
export type PersistReconciledErpDocumentInput=Readonly<{tenantId:string;erpDocumentAuthorityId:string;
  observationId:string;reconciliationReceiptId:string;orderSnapshotId:string;documentType:"sales_invoice"|"credit_note";
  providerDocumentReference:string;providerDocumentVersion:string;providerDocumentSha256:string;issuedAt:string;
  returnRequestId?:string;refundCommandId?:string;createdAt:string}>;
const HASH=/^[a-f0-9]{64}$/;const nonempty=(v:string|undefined)=>Boolean(v?.trim());
async function transaction<T>(pool:SellerFulfillmentPool,tenantId:string,work:(db:SellerFulfillmentDb)=>Promise<T>){const db=await pool.connect();try{await db.query("begin");await db.query("select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true)",[tenantId]);const value=await work(db);await db.query("commit");return value}catch(error){await db.query("rollback").catch(()=>undefined);throw error}finally{db.release()}}
export function persistReconciledErpDocumentAuthority(pool:SellerFulfillmentPool,input:PersistReconciledErpDocumentInput){
  if([input.tenantId,input.erpDocumentAuthorityId,input.observationId,input.reconciliationReceiptId,input.orderSnapshotId,
    input.providerDocumentReference,input.providerDocumentVersion].some(v=>!nonempty(v))||!HASH.test(input.providerDocumentSha256)||
    !Number.isFinite(Date.parse(input.issuedAt))||!Number.isFinite(Date.parse(input.createdAt))||
    ((input.documentType==="credit_note")!==Boolean(nonempty(input.returnRequestId)&&nonempty(input.refundCommandId))))throw new Error("ERP_DOCUMENT_AUTHORITY_INPUT_INVALID");
  return transaction(pool,input.tenantId,async db=>{
    const source=(await db.query<Readonly<{partner_tenant_id:string;operator_legal_entity_id:string;store_id:string;
      erp_site_id:string;erp_company_id:string;accounting_period:string;actual_payload:unknown}>>(`select o.partner_tenant_id,
      o.operator_legal_entity_id,o.store_id,o.erp_site_id,o.erp_company_id,o.accounting_period,o.actual_payload
      from crays_core.commerce_actual_observations o join crays_core.commerce_reconciliation_receipts r
        on r.observation_id=o.observation_id and r.reconciliation_receipt_id=$3 and r.reconciliation_state='MATCHED'
      join crays_core.checkout_order_snapshots s on s.tenant_id=o.tenant_id and s.order_id=o.order_id
        and s.snapshot_sha256=o.order_seller_snapshot_sha256 and s.order_snapshot_id=$4
      where o.tenant_id=$1 and o.observation_id=$2 and o.source_signature_verified for update of o`,
      [input.tenantId,input.observationId,input.reconciliationReceiptId,input.orderSnapshotId])).rows[0];
    if(!source)throw new Error("ERP_DOCUMENT_RECONCILED_SOURCE_UNAVAILABLE");
    const docs=(source.actual_payload as{erp_documents?:unknown})?.erp_documents;
    if(!Array.isArray(docs)||!docs.some(d=>{if(!d||typeof d!=="object")return false;const x=d as Record<string,unknown>;return x.document_type===input.documentType&&x.document_reference===input.providerDocumentReference&&x.document_version===input.providerDocumentVersion&&x.document_sha256===input.providerDocumentSha256&&x.issued_at===input.issuedAt}))throw new Error("ERP_DOCUMENT_NOT_IN_SIGNED_ACTUAL");
    const prior=(await db.query<Readonly<{erp_document_authority_id:string;provider_document_sha256:string}>>(`select erp_document_authority_id,provider_document_sha256 from crays_core.commerce_erp_document_authorities where tenant_id=$1 and erp_site_id=$2 and document_type=$3 and provider_document_reference=$4 and provider_document_version=$5`,[input.tenantId,source.erp_site_id,input.documentType,input.providerDocumentReference,input.providerDocumentVersion])).rows[0];
    if(prior){if(prior.erp_document_authority_id!==input.erpDocumentAuthorityId||prior.provider_document_sha256!==input.providerDocumentSha256)throw new Error("ERP_DOCUMENT_AUTHORITY_REPLAY_CONFLICT");return Object.freeze({erpDocumentAuthorityId:prior.erp_document_authority_id,replayed:true as const})}
    await db.query(`insert into crays_core.commerce_erp_document_authorities
      (erp_document_authority_id,tenant_id,observation_id,reconciliation_receipt_id,order_snapshot_id,
       return_request_id,refund_command_id,partner_tenant_id,operator_legal_entity_id,store_id,erp_site_id,
       erp_company_id,accounting_period,document_type,provider_document_reference,provider_document_version,
       provider_document_sha256,issued_at,authority_state,created_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'RECONCILED_ERP_DOCUMENT',$19)`,
      [input.erpDocumentAuthorityId,input.tenantId,input.observationId,input.reconciliationReceiptId,input.orderSnapshotId,
       input.returnRequestId??null,input.refundCommandId??null,source.partner_tenant_id,source.operator_legal_entity_id,
       source.store_id,source.erp_site_id,source.erp_company_id,source.accounting_period,input.documentType,
       input.providerDocumentReference,input.providerDocumentVersion,input.providerDocumentSha256,input.issuedAt,input.createdAt]);
    return Object.freeze({erpDocumentAuthorityId:input.erpDocumentAuthorityId,replayed:false as const});
  })
}
