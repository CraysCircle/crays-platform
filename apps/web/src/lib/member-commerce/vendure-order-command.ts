import "server-only";
import {createHash} from "node:crypto";
import {verifyFrozenOrderSellerSnapshot,type FrozenOrderSellerSnapshot} from "./checkout-order-transition-contract";
export const VENDURE_ORDER_COMMAND_VERSION="ncrv2-134.v1" as const;
export type CheckoutOrderOutboxAuthority=Readonly<{outboxEventId:string;tenantId:string;orderSnapshotId:string;transitionReceiptId:string;partnerTenantId:string;operatorLegalEntityId:string;storeId:string;vendureSellerId:string;vendureChannelId:string;snapshotSha256:string;payloadSha256:string;eventType:"CHECKOUT_ORDER_SNAPSHOT_FROZEN";deliveryState:"PENDING"|"FAILED_RETRYABLE"}>;
export type FrozenPreflightOrderAuthority=Readonly<{preflightId:string;cartId:string;cartVersion:number;storeId:string;partnerTenantId:string;operatorLegalEntityId:string;vendureSellerId:string;vendureChannelId:string;currency:string;shippingMethod:string;shippingMinor:number;netMinor:number;taxMinor:number;totalMinor:number;resultSha256:string;state:"PERSISTED_PENDING_PROVIDER_PARITY";lines:readonly Readonly<{variantRef:string;quantity:number;unitPriceMinor:number;netMinor:number;taxMinor:number;grossMinor:number}>[]}>;
const HASH=/^[a-f0-9]{64}$/,CURRENCY=/^[A-Z]{3}$/;
function canonical(value:unknown):string{
  if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;
  if(value!==null&&typeof value==="object")return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  const serialized=JSON.stringify(value);if(serialized===undefined)throw new Error("VENDURE_ORDER_COMMAND_CANONICAL_VALUE_INVALID");return serialized;
}
const digest=(value:object)=>createHash("sha256").update(canonical(value)).digest("hex");
const nonempty=(value:string)=>value.trim().length>0;
const minor=(value:number)=>Number.isSafeInteger(value)&&value>=0;
function fail():never{throw new Error("VENDURE_ORDER_COMMAND_AUTHORITY_CONFLICT");}
export function prepareVendureOrderCommand(input:Readonly<{snapshot:FrozenOrderSellerSnapshot;orderSnapshotId:string;outbox:CheckoutOrderOutboxAuthority;preflight:FrozenPreflightOrderAuthority}>){
  const s=verifyFrozenOrderSellerSnapshot(input.snapshot),o=input.outbox,p=input.preflight;
  if(!nonempty(input.orderSnapshotId)||[o.outboxEventId,o.tenantId,o.transitionReceiptId,o.payloadSha256,p.shippingMethod].some(v=>!nonempty(v))||
    !HASH.test(o.snapshotSha256)||!HASH.test(o.payloadSha256)||!HASH.test(p.resultSha256)||!CURRENCY.test(p.currency)||
    o.eventType!=="CHECKOUT_ORDER_SNAPSHOT_FROZEN"||!["PENDING","FAILED_RETRYABLE"].includes(o.deliveryState)||o.orderSnapshotId!==input.orderSnapshotId||
    o.snapshotSha256!==s.snapshotSha256||o.partnerTenantId!==s.partnerTenantId||o.operatorLegalEntityId!==s.operatorLegalEntityId||
    o.storeId!==s.storeId||o.vendureSellerId!==s.vendureSellerId||o.vendureChannelId!==s.vendureChannelId||
    p.state!=="PERSISTED_PENDING_PROVIDER_PARITY"||p.preflightId!==s.checkoutPreflightId||p.cartId!==s.cartId||
    p.cartVersion!==s.cartVersion||p.storeId!==s.storeId||p.partnerTenantId!==s.partnerTenantId||
    p.operatorLegalEntityId!==s.operatorLegalEntityId||p.vendureSellerId!==s.vendureSellerId||
    p.vendureChannelId!==s.vendureChannelId||![p.shippingMinor,p.netMinor,p.taxMinor,p.totalMinor].every(minor)||
    p.lines.length!==s.lines.length)fail();
  const lines=[...p.lines].sort((a,b)=>a.variantRef.localeCompare(b.variantRef)).map((line,index)=>{
    const frozen=s.lines[index];
    if(!frozen||!nonempty(line.variantRef)||line.variantRef!==frozen.variantRef||line.quantity!==frozen.quantity||
      !Number.isSafeInteger(line.quantity)||line.quantity<1||![line.unitPriceMinor,line.netMinor,line.taxMinor,line.grossMinor].every(minor)||
      line.netMinor!==line.unitPriceMinor*line.quantity||line.grossMinor!==line.netMinor+line.taxMinor)fail();
    return Object.freeze({productVariantId:line.variantRef,quantity:line.quantity,unitPriceMinor:line.unitPriceMinor,netMinor:line.netMinor,taxMinor:line.taxMinor,grossMinor:line.grossMinor});
  });
  const net=lines.reduce((n,l)=>n+l.netMinor,0),tax=lines.reduce((n,l)=>n+l.taxMinor,0);
  if(net!==p.netMinor||tax!==p.taxMinor||p.totalMinor!==net+tax+p.shippingMinor)fail();
  const body={version:VENDURE_ORDER_COMMAND_VERSION,idempotencyKey:`vendure-order:${o.outboxEventId}:${s.snapshotSha256}`,
    sourceOutboxEventId:o.outboxEventId,sourcePayloadSha256:o.payloadSha256,tenantId:o.tenantId,
    orderSnapshotId:input.orderSnapshotId,orderId:s.orderId,orderCode:s.orderCode,
    vendureDeploymentCellId:s.vendureDeploymentCellId,vendureSellerId:s.vendureSellerId,
    vendureChannelId:s.vendureChannelId,storeId:s.storeId,currency:p.currency,
    checkoutPreflightId:p.preflightId,preflightResultSha256:p.resultSha256,shippingMethod:p.shippingMethod,
    shippingMinor:p.shippingMinor,netMinor:p.netMinor,taxMinor:p.taxMinor,totalMinor:p.totalMinor,lines:Object.freeze(lines)};
  return Object.freeze({...body,commandSha256:digest(body)});
}
export type VendureOrderCommand=ReturnType<typeof prepareVendureOrderCommand>;

export type VendureOrderCommandDb=Readonly<{
  query<Row=Record<string,unknown>>(sql:string,values?:readonly unknown[]):Promise<Readonly<{rows:Row[]}>>;
}>;
type CommandRow=Readonly<{
  outbox_event_id:string;tenant_id:string;order_snapshot_id:string;transition_receipt_id:string;
  partner_tenant_id:string;operator_legal_entity_id:string;store_id:string;vendure_seller_id:string;
  vendure_channel_id:string;snapshot_sha256:string;payload_sha256:string;event_type:string;
  delivery_state:string;snapshot_payload:unknown;checkout_preflight_id:string;cart_id:string;
  cart_version:string|number;currency:string;shipping_method:string;shipping_minor:string|number;
  net_minor:string|number;tax_minor:string|number;total_minor:string|number;result_sha256:string;
  preflight_state:string;
}>;
type CommandLineRow=Readonly<{variant_ref:string;quantity:string|number;unit_price_minor:string|number;
  net_minor:string|number;tax_minor:string|number;gross_minor:string|number}>;
export async function loadPendingVendureOrderCommand(db:VendureOrderCommandDb,input:Readonly<{tenantId:string;outboxEventId:string}>){
  if(!nonempty(input.tenantId)||!nonempty(input.outboxEventId))fail();
  const rows=(await db.query<CommandRow>(`select o.outbox_event_id,o.tenant_id,o.order_snapshot_id,
      o.transition_receipt_id,o.partner_tenant_id,o.operator_legal_entity_id,o.store_id,
      o.vendure_seller_id,o.vendure_channel_id,o.snapshot_sha256,o.payload_sha256,o.event_type,
      o.delivery_state,s.snapshot_payload,s.checkout_preflight_id,s.cart_id,s.cart_version,
      p.currency,p.shipping_method,p.shipping_minor,p.net_minor,p.tax_minor,p.total_minor,
      p.result_sha256,p.preflight_state
    from crays_core.checkout_order_transition_outbox o
    join crays_core.checkout_order_snapshots s on s.tenant_id=o.tenant_id and s.order_snapshot_id=o.order_snapshot_id
    join crays_core.checkout_shipping_tax_preflights p on p.tenant_id=s.tenant_id
      and p.preflight_id=s.checkout_preflight_id and p.cart_id=s.cart_id and p.cart_version=s.cart_version
    where o.tenant_id=$1 and o.outbox_event_id=$2 for update of o`,[input.tenantId,input.outboxEventId])).rows;
  const row=rows[0];if(rows.length!==1||!row||typeof row.snapshot_payload!=="object"||row.snapshot_payload===null)fail();
  const lineRows=(await db.query<CommandLineRow>(`select variant_ref,quantity,unit_price_minor,
      net_minor,tax_minor,gross_minor from crays_core.checkout_shipping_tax_preflight_lines
    where tenant_id=$1 and preflight_id=$2 and cart_id=$3 and cart_version=$4 order by variant_ref`,
    [input.tenantId,row.checkout_preflight_id,row.cart_id,Number(row.cart_version)])).rows;
  return prepareVendureOrderCommand({snapshot:row.snapshot_payload as FrozenOrderSellerSnapshot,
    orderSnapshotId:row.order_snapshot_id,outbox:{outboxEventId:row.outbox_event_id,tenantId:row.tenant_id,
      orderSnapshotId:row.order_snapshot_id,transitionReceiptId:row.transition_receipt_id,
      partnerTenantId:row.partner_tenant_id,operatorLegalEntityId:row.operator_legal_entity_id,
      storeId:row.store_id,vendureSellerId:row.vendure_seller_id,vendureChannelId:row.vendure_channel_id,
      snapshotSha256:row.snapshot_sha256,payloadSha256:row.payload_sha256,
      eventType:row.event_type as CheckoutOrderOutboxAuthority["eventType"],
      deliveryState:row.delivery_state as CheckoutOrderOutboxAuthority["deliveryState"]},
    preflight:{preflightId:row.checkout_preflight_id,cartId:row.cart_id,cartVersion:Number(row.cart_version),
      storeId:row.store_id,partnerTenantId:row.partner_tenant_id,operatorLegalEntityId:row.operator_legal_entity_id,
      vendureSellerId:row.vendure_seller_id,vendureChannelId:row.vendure_channel_id,currency:row.currency,
      shippingMethod:row.shipping_method,shippingMinor:Number(row.shipping_minor),netMinor:Number(row.net_minor),
      taxMinor:Number(row.tax_minor),totalMinor:Number(row.total_minor),resultSha256:row.result_sha256,
      state:row.preflight_state as FrozenPreflightOrderAuthority["state"],lines:lineRows.map(line=>({
        variantRef:line.variant_ref,quantity:Number(line.quantity),unitPriceMinor:Number(line.unit_price_minor),
        netMinor:Number(line.net_minor),taxMinor:Number(line.tax_minor),grossMinor:Number(line.gross_minor)}))}});
}
