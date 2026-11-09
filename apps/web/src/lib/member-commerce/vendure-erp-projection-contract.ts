import {createHash} from "node:crypto";
import {
 verifyFrozenOrderSellerSnapshot,
 type FrozenOrderSellerSnapshot,
} from "./checkout-order-transition-contract";

export const VENDURE_ERP_PROJECTION_VERSION="ncrv2-141.v1" as const;
const hash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");

export type ErpProjectionEvent=
 | "item_master_referenced"|"warehouse_master_referenced"|"sale_accepted"
 | "payment_settled"|"settlement_reported"|"fulfillment_shipped"
 | "return_received"|"refund_settled"|"fee_assessed"|"correction_approved";

export type ErpProjectionSnapshot=Readonly<{
 snapshotId:string;snapshotSha256:string;orderId:string;partnerTenantId:string;
 operatorLegalEntityId:string;storeId:string;vendureSellerId:string;
 vendureChannelId:string;erpSiteId:string;erpCompanyId:string;
 erpWarehouseId:string;erpCostCenterId:string;erpBindingVersion:string;currency:string;
}>;

type Input=Readonly<{
 sourceEventId:string;event:ErpProjectionEvent;sourceState:string;snapshot:ErpProjectionSnapshot;
 itemReference?:string;quantityMinor?:number;netMinor?:number;taxMinor?:number;
 grossMinor?:number;feeMinor?:number;providerReference?:string;
 targetOverride?:Partial<Pick<ErpProjectionSnapshot,"erpSiteId"|"erpCompanyId"|"erpWarehouseId"|"erpCostCenterId">>;
}>;

export const ERP_FIELD_AUTHORITY=Object.freeze({
 itemReference:"ERPNext:item_master",
 warehouseReference:"ERPNext:warehouse_master",
 physicalStock:"ERPNext:stock_ledger",
 valuation:"ERPNext:stock_ledger",
 saleState:"Vendure:order",
 fulfillmentState:"Vendure:fulfillment",
 returnState:"Vendure:return",
 refundState:"Vendure_refund+Stripe_outcome",
 tax:"ERPNext:tax_rule_and_accounting_document",
 invoiceCreditNote:"ERPNext:sales_invoice_credit_note",
 receivable:"ERPNext:general_ledger",
 paymentOutcome:"Stripe:connected_account",
 paymentPosting:"ERPNext:payment_entry_general_ledger",
 settlement:"ERPNext:bank_reconciliation",
 fee:"ERPNext:expense_and_payable_ledger",
 correction:"ERPNext:governed_adjustment_document",
 sellerScope:"CRAYS_Core:immutable_order_seller_snapshot",
} as const);

const effects:Record<ErpProjectionEvent,readonly string[]>={
 item_master_referenced:["item_reference_validation"],
 warehouse_master_referenced:["warehouse_reference_validation"],
 sale_accepted:["sales_order","tax","sales_invoice","receivable","physical_stock","valuation"],
 payment_settled:["payment_entry","receivable_allocation"],
 settlement_reported:["bank_settlement","payment_fee_reconciliation"],
 fulfillment_shipped:["delivery_note","physical_stock","valuation"],
 return_received:["stock_receipt","physical_stock","valuation","return_document"],
 refund_settled:["credit_note","receivable_reversal","payment_refund"],
 fee_assessed:["fee_expense","payable_or_settlement_adjustment"],
 correction_approved:["governed_correction","tax_or_ledger_adjustment"],
};



export function erpProjectionSnapshotFromFrozenOrder(
 snapshot:FrozenOrderSellerSnapshot,
 input:Readonly<{orderSnapshotId:string;erpWarehouseId:string;currency:string}>,
):ErpProjectionSnapshot{
 const frozen=verifyFrozenOrderSellerSnapshot(snapshot);
 if(!input.orderSnapshotId.trim()||!/^[A-Z]{3}$/.test(input.currency)||
   !frozen.erpWarehouseIds.includes(input.erpWarehouseId)||
   !frozen.erpCostCenterMappingId.trim()||!frozen.erpCostCenterMappingVersion.trim()||
   !frozen.erpCostCenterId.trim()||!frozen.erpCostCenterApprovalReceiptId.trim()||
   !/^[a-f0-9]{64}$/.test(frozen.erpCostCenterApprovalReceiptSha256)){
   throw new Error("ERP_PROJECTION_FROZEN_AUTHORITY_UNAVAILABLE");
 }
 return Object.freeze({
   snapshotId:input.orderSnapshotId,snapshotSha256:frozen.snapshotSha256,orderId:frozen.orderId,
   partnerTenantId:frozen.partnerTenantId,operatorLegalEntityId:frozen.operatorLegalEntityId,
   storeId:frozen.storeId,vendureSellerId:frozen.vendureSellerId,
   vendureChannelId:frozen.vendureChannelId,erpSiteId:frozen.erpSiteId,
   erpCompanyId:frozen.erpCompanyId,erpWarehouseId:input.erpWarehouseId,
   erpCostCenterId:frozen.erpCostCenterId,erpBindingVersion:frozen.erpBindingVersion,
   currency:input.currency,
 });
}

export function projectVendureEventToErp(input:Input){
 const s=input.snapshot;
 if(!/^[a-f0-9]{64}$/.test(s.snapshotSha256)||!s.erpBindingVersion.trim()||!/^[A-Z]{3}$/.test(s.currency))throw new Error("ERP_PROJECTION_SNAPSHOT_INVALID");
 if(!input.sourceEventId.trim()||!input.sourceState.trim())throw new Error("ERP_PROJECTION_EVENT_INVALID");
 if(input.targetOverride&&Object.entries(input.targetOverride).some(([key,value])=>value!==s[key as keyof ErpProjectionSnapshot]))throw new Error("ERP_PROJECTION_TARGET_OVERRIDE_DENIED");
 if((input.quantityMinor??0)<0||[input.netMinor,input.taxMinor,input.grossMinor,input.feeMinor].some(v=>v!==undefined&&!Number.isInteger(v)))throw new Error("ERP_PROJECTION_AMOUNT_INVALID");
 if(["item_master_referenced","sale_accepted","fulfillment_shipped","return_received"].includes(input.event)&&!input.itemReference?.trim())throw new Error("ERP_PROJECTION_ITEM_REFERENCE_REQUIRED");
 const financial=["sale_accepted","payment_settled","settlement_reported","refund_settled","fee_assessed","correction_approved"].includes(input.event);
 if(financial&&input.grossMinor===undefined)throw new Error("ERP_PROJECTION_GROSS_REQUIRED");
 const identity={contractVersion:VENDURE_ERP_PROJECTION_VERSION,source:"vendure",sourceEventId:input.sourceEventId,event:input.event,snapshotId:s.snapshotId,snapshotSha256:s.snapshotSha256,partnerTenantId:s.partnerTenantId,operatorLegalEntityId:s.operatorLegalEntityId,storeId:s.storeId,erpSiteId:s.erpSiteId,erpCompanyId:s.erpCompanyId,erpWarehouseId:s.erpWarehouseId,erpCostCenterId:s.erpCostCenterId,erpBindingVersion:s.erpBindingVersion};
 const payload={...identity,orderId:s.orderId,vendureSellerId:s.vendureSellerId,vendureChannelId:s.vendureChannelId,currency:s.currency,sourceState:input.sourceState,itemReference:input.itemReference??null,quantityMinor:input.quantityMinor??null,netMinor:input.netMinor??null,taxMinor:input.taxMinor??null,grossMinor:input.grossMinor??null,feeMinor:input.feeMinor??null,providerReference:input.providerReference??null,effects:effects[input.event],fieldAuthority:ERP_FIELD_AUTHORITY,state:"PENDING_ERP_ACKNOWLEDGEMENT" as const};
 return Object.freeze({...payload,idempotencyKey:`vendure-erp:${hash(identity)}`,payloadSha256:hash(payload)});
}

export function acceptErpAcknowledgement(plan:ReturnType<typeof projectVendureEventToErp>,input:Readonly<{partnerTenantId:string;erpSiteId:string;erpCompanyId:string;idempotencyKey:string;acknowledgementId:string;documentReferences:readonly string[];observedPayloadSha256:string}>){
 if(input.partnerTenantId!==plan.partnerTenantId||input.erpSiteId!==plan.erpSiteId||input.erpCompanyId!==plan.erpCompanyId)throw new Error("ERP_ACK_SCOPE_MISMATCH");
 if(input.idempotencyKey!==plan.idempotencyKey||input.observedPayloadSha256!==plan.payloadSha256)throw new Error("ERP_ACK_CONFLICT");
 if(!input.acknowledgementId.trim()||input.documentReferences.some(v=>!v.trim()))throw new Error("ERP_ACK_INVALID");
 const body={idempotencyKey:plan.idempotencyKey,acknowledgementId:input.acknowledgementId,partnerTenantId:plan.partnerTenantId,erpSiteId:plan.erpSiteId,erpCompanyId:plan.erpCompanyId,documentReferences:[...input.documentReferences],state:"ERP_ACKNOWLEDGED" as const};
 return Object.freeze({...body,receiptSha256:hash(body)});
}
