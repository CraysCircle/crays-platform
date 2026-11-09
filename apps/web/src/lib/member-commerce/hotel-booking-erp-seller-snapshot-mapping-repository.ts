import { createHash, randomUUID } from "node:crypto";

export type HotelErpMappingPool = { connect(): Promise<{ query<Row=Record<string,unknown>>(sql:string,values?:readonly unknown[]):Promise<{rows:Row[]}>; release():void }> };
export type PersistHotelErpMappingInput = Readonly<{tenantId:string;stage8ReconciliationReceiptId:string;erpMappingVersionId:string;capturedAt:string}>;

type Source = {
  booking_id:string;order_snapshot_id:string;seller_snapshot_sha256:string;mapping_version:number|string;
  erp_site_id:string;erp_company_id:string;debtor_id:string;currency:string;mapping_sha256:string;
  tax_template_id:string;tax_account_id:string;sales_invoice_document_type:string;receivable_account_id:string;
  payment_entry_document_type:string;payment_mode_id:string;payment_clearing_account_id:string;
  deposit_item_id:string;deposit_liability_account_id:string;fee_item_id:string;fee_account_id:string;
  credit_note_document_type:string;credit_note_account_id:string;refund_payment_mode_id:string;refund_clearing_account_id:string;
};
type Prior={erp_mapping_snapshot_id:string;snapshot_sha256:string};
function canonical(v:unknown):string{if(Array.isArray(v))return`[${v.map(canonical).join(",")}]`;if(v&&typeof v==="object"){const o=v as Record<string,unknown>;return`{${Object.keys(o).sort().map(k=>`${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;}return JSON.stringify(v);}
const hash=(v:unknown)=>createHash("sha256").update(canonical(v)).digest("hex");

export async function persistHotelBookingErpSellerSnapshotMapping(pool:HotelErpMappingPool,input:PersistHotelErpMappingInput):Promise<Readonly<{erpMappingSnapshotId:string;snapshotSha256:string;mappingLineCount:7;erpApiCalled:false;replayed:boolean}>>{
  for(const[k,v]of Object.entries(input))if(!String(v).trim())throw new Error(`HOTEL_ERP_MAPPING_${k.toUpperCase()}_REQUIRED`);
  const capturedAt=new Date(input.capturedAt);if(!Number.isFinite(capturedAt.getTime()))throw new Error("HOTEL_ERP_MAPPING_CAPTURED_AT_INVALID");
  const db=await pool.connect();try{await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE");await db.query("SELECT set_config('app.tenant_id',$1,true)",[input.tenantId]);
    const rows=(await db.query<Source>(`SELECT g.booking_id,g.order_snapshot_id,g.order_snapshot_sha256 AS seller_snapshot_sha256,
      m.mapping_version,m.erp_site_id,m.erp_company_id,m.debtor_id,m.currency,m.mapping_sha256,
      m.tax_template_id,m.tax_account_id,m.sales_invoice_document_type,m.receivable_account_id,
      m.payment_entry_document_type,m.payment_mode_id,m.payment_clearing_account_id,
      m.deposit_item_id,m.deposit_liability_account_id,m.fee_item_id,m.fee_account_id,
      m.credit_note_document_type,m.credit_note_account_id,m.refund_payment_mode_id,m.refund_clearing_account_id
      FROM crays_core.clubs_hotel_stage8_booking_commerce_reconciliation_receipts g
      JOIN crays_core.checkout_order_snapshots o ON o.tenant_id=g.tenant_id AND o.order_snapshot_id=g.order_snapshot_id AND o.snapshot_sha256=g.order_snapshot_sha256
      JOIN crays_core.clubs_hotel_final_bookings b ON b.tenant_id=g.tenant_id AND b.booking_id=g.booking_id
      JOIN crays_core.clubs_hotel_erp_master_mapping_versions m ON m.tenant_id=g.tenant_id
       AND m.erp_mapping_version_id=$3 AND m.store_id=o.store_id AND m.operator_legal_entity_id=o.operator_legal_entity_id
       AND m.erp_site_id=o.erp_site_id AND m.erp_company_id=o.erp_company_id AND m.currency=b.currency
       AND m.lifecycle_state='ACTIVE' AND m.persisted_record=true AND m.synthetic_source=false
       AND m.valid_from<=$4::timestamptz AND m.valid_until>$4::timestamptz
      WHERE g.tenant_id=$1 AND g.stage8_reconciliation_receipt_id=$2 AND g.gate_state='STAGE8_PROVIDER_RECONCILED_NOT_FORMAL'
      FOR SHARE OF g,o,b,m`,[input.tenantId,input.stage8ReconciliationReceiptId,input.erpMappingVersionId,capturedAt.toISOString()])).rows;
    if(rows.length!==1)throw new Error("HOTEL_ERP_EXACT_ACTIVE_MAPPING_NOT_FOUND");const source=rows[0];
    const lineSpecs=[
      {kind:"TAX",type:"tax_template",primary:source.tax_template_id,secondary:source.tax_account_id,tertiary:null},
      {kind:"SALES_INVOICE",type:source.sales_invoice_document_type,primary:source.debtor_id,secondary:source.receivable_account_id,tertiary:source.erp_company_id},
      {kind:"PAYMENT_ENTRY",type:source.payment_entry_document_type,primary:source.payment_mode_id,secondary:source.payment_clearing_account_id,tertiary:source.debtor_id},
      {kind:"DEPOSIT",type:"deposit_liability",primary:source.deposit_item_id,secondary:source.deposit_liability_account_id,tertiary:source.debtor_id},
      {kind:"FEE",type:"fee_document",primary:source.fee_item_id,secondary:source.fee_account_id,tertiary:source.erp_company_id},
      {kind:"CREDIT_NOTE",type:source.credit_note_document_type,primary:source.debtor_id,secondary:source.credit_note_account_id,tertiary:source.receivable_account_id},
      {kind:"REFUND",type:"refund_payment_entry",primary:source.refund_payment_mode_id,secondary:source.refund_clearing_account_id,tertiary:source.debtor_id},
    ]as const;
    const snapshotMaterial={tenantId:input.tenantId,stage8ReconciliationReceiptId:input.stage8ReconciliationReceiptId,
      bookingId:source.booking_id,orderSnapshotId:source.order_snapshot_id,sellerSnapshotSha256:source.seller_snapshot_sha256,
      erpMappingVersionId:input.erpMappingVersionId,mappingVersion:Number(source.mapping_version),erpSiteId:source.erp_site_id,
      erpCompanyId:source.erp_company_id,debtorId:source.debtor_id,currency:source.currency,mappingSha256:source.mapping_sha256,
      lines:lineSpecs,capturedAt:capturedAt.toISOString()};const snapshotSha256=hash(snapshotMaterial);
    const prior=(await db.query<Prior>(`SELECT erp_mapping_snapshot_id,snapshot_sha256 FROM crays_core.clubs_hotel_booking_erp_mapping_snapshots WHERE tenant_id=$1 AND booking_id=$2 FOR UPDATE`,[input.tenantId,source.booking_id])).rows[0];
    if(prior){if(prior.snapshot_sha256!==snapshotSha256)throw new Error("HOTEL_ERP_MAPPING_REPLAY_CONFLICT");await db.query("COMMIT");return{erpMappingSnapshotId:prior.erp_mapping_snapshot_id,snapshotSha256,mappingLineCount:7,erpApiCalled:false,replayed:true};}
    const erpMappingSnapshotId=randomUUID();await db.query(`INSERT INTO crays_core.clubs_hotel_booking_erp_mapping_snapshots
      (erp_mapping_snapshot_id,tenant_id,stage8_reconciliation_receipt_id,booking_id,order_snapshot_id,seller_snapshot_sha256,
       erp_mapping_version_id,mapping_version,erp_site_id,erp_company_id,debtor_id,currency,mapping_sha256,snapshot_sha256,
       captured_at,persisted_record,synthetic_source,provider_mutation_performed,formal_applied)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::timestamptz,true,false,false,false)`,
      [erpMappingSnapshotId,input.tenantId,input.stage8ReconciliationReceiptId,source.booking_id,source.order_snapshot_id,
       source.seller_snapshot_sha256,input.erpMappingVersionId,Number(source.mapping_version),source.erp_site_id,source.erp_company_id,
       source.debtor_id,source.currency,source.mapping_sha256,snapshotSha256,capturedAt.toISOString()]);
    for(let index=0;index<lineSpecs.length;index+=1){const line=lineSpecs[index];const payload={erpSiteId:source.erp_site_id,erpCompanyId:source.erp_company_id,
      debtorId:source.debtor_id,currency:source.currency,kind:line.kind,providerObjectType:line.type,primaryReferenceId:line.primary,
      secondaryReferenceId:line.secondary,tertiaryReferenceId:line.tertiary,mappingVersion:Number(source.mapping_version)};const lineSha256=hash({snapshotSha256,...payload});
      await db.query(`INSERT INTO crays_core.clubs_hotel_booking_erp_mapping_lines(erp_mapping_line_id,tenant_id,erp_mapping_snapshot_id,
       sequence_no,mapping_kind,provider_object_type,primary_reference_id,secondary_reference_id,tertiary_reference_id,mapping_payload,
       line_sha256,provider_mutation_performed,formal_applied,created_at)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,false,false,$12::timestamptz)`,
       [randomUUID(),input.tenantId,erpMappingSnapshotId,index+1,line.kind,line.type,line.primary,line.secondary,line.tertiary,JSON.stringify(payload),lineSha256,capturedAt.toISOString()]);}
    await db.query("COMMIT");return{erpMappingSnapshotId,snapshotSha256,mappingLineCount:7,erpApiCalled:false,replayed:false};
  }catch(e){await db.query("ROLLBACK");throw e}finally{db.release();}}
