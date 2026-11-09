import {
  prepareStorefrontOrderConversionPlan,
  type StorefrontOrderConversionPlanInput,
} from "./storefront-order-conversion-plan";
import {loadActiveSellerBoundCartSnapshot} from "./seller-bound-cart-repository";
import type {ServerCommerceContext} from "./server-commerce-context-resolver";

type QueryResult<Row> = Readonly<{rows: Row[]}>;
export type OrderPlanAuthorityDb = Readonly<{
  query<Row=Record<string, unknown>>(sql:string, values?:readonly unknown[]):Promise<QueryResult<Row>>;
}>;
export type OrderPlanAuthorityPool = Readonly<{
  connect():Promise<OrderPlanAuthorityDb&Readonly<{release():void}>>;
}>;
export type ResolveOrderPlanAuthorityInput = Readonly<{
  tenantId:string;
  customerRelationshipId:string;
  preflightId:string;
  orderSnapshotId:string;
  orderId:string;
  orderCode:string;
  idempotencyKey:string;
  expectedCurrency:string;
  context:ServerCommerceContext;
  now?:Date;
}>;

type PreflightRow=Readonly<{
  tenant_id:string;partner_tenant_id:string;preflight_id:string;cart_id:string;
  cart_version:string|number;preflight_state:"PERSISTED_PENDING_PROVIDER_PARITY";
  request_sha256:string;result_sha256:string;store_id:string;operator_legal_entity_id:string;
  vendure_seller_id:string;vendure_channel_id:string;currency:string;
}>;
type DisclosureRow=Readonly<{
  partner_tenant_id:string;operator_legal_entity_id:string;store_id:string;legal_name:string;
  store_display_name:string;registered_address:unknown;tax_registration_ref:string|null;
}>;
type CostCenterRow=Readonly<{
  erp_cost_center_mapping_id:string;mapping_version:string;erp_cost_center_id:string;
  approval_receipt_id:string;approval_receipt_sha256:string;
}>;
type ErpLineRow=Readonly<{
  variant_ref:string;erp_item_mapping_id:string;item_mapping_version:string;erp_item_code:string;
  warehouse_mapping_id:string;warehouse_mapping_version:string;erp_warehouse_id:string;
}>;

const nonempty=(value:string)=>value.trim().length>0;
function validate(input:ResolveOrderPlanAuthorityInput){
  const now=input.now??new Date();
  if([input.tenantId,input.customerRelationshipId,input.preflightId,input.orderSnapshotId,
    input.orderId,input.orderCode,input.idempotencyKey,input.expectedCurrency]
    .some(value=>!nonempty(value))||!/^[A-Z]{3}$/.test(input.expectedCurrency)||
    !Number.isFinite(now.getTime()))throw new Error("ORDER_PLAN_AUTHORITY_INPUT_INVALID");
  return now;
}

export async function resolveStorefrontOrderConversionPlan(
  pool:OrderPlanAuthorityPool,
  input:ResolveOrderPlanAuthorityInput,
){
  const now=validate(input);
  const db=await pool.connect();
  try{
    await db.query("begin isolation level repeatable read read only");
    await db.query(
      "select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true)",
      [input.tenantId],
    );
    const context=input.context;
    const cart=await loadActiveSellerBoundCartSnapshot(db,{
      tenantId:input.tenantId,
      customerRelationshipId:input.customerRelationshipId,
      seller:{
        verticalRoot:context.verticalRoot,storeId:context.storeId,
        partnerTenantId:context.partnerTenantId,
        operatorLegalEntityId:context.operatorLegalEntityId,
        vendureSellerId:context.vendure.sellerId,
        vendureChannelId:context.vendure.channelId,
        contextFingerprint:context.contextFingerprint,
      },
      now,
    });
    if(!cart||cart.lines.length===0)throw new Error("ORDER_PLAN_AUTHORITY_CART_UNAVAILABLE");
    const preflights=(await db.query<PreflightRow>(
      `select tenant_id,partner_tenant_id,preflight_id,cart_id,cart_version,preflight_state,
        request_sha256,result_sha256,store_id,operator_legal_entity_id,vendure_seller_id,
        vendure_channel_id,currency
       from crays_core.checkout_shipping_tax_preflights
       where tenant_id=$1 and preflight_id=$2 and cart_id=$3 and cart_version=$4`,
      [input.tenantId,input.preflightId,cart.cartId,cart.version],
    )).rows;
    if(preflights.length!==1)throw new Error("ORDER_PLAN_AUTHORITY_PREFLIGHT_UNAVAILABLE");
    const disclosureRows=(await db.query<DisclosureRow>(
      `select l.partner_tenant_id,l.legal_entity_id operator_legal_entity_id,
        st.store_id,l.legal_name,st.display_name store_display_name,l.registered_address,
        l.tax_registration_ref
       from crays_core.operator_legal_entities l
       join crays_core.stores st on st.store_id=$3 and st.status='active'
       where l.legal_entity_id=$1 and l.partner_tenant_id=$2 and l.status='active'`,
      [context.operatorLegalEntityId,context.partnerTenantId,context.storeId],
    )).rows;
    if(disclosureRows.length!==1)throw new Error("ORDER_PLAN_AUTHORITY_DISCLOSURE_UNAVAILABLE");
    const disclosure=disclosureRows[0];
    if(typeof disclosure.registered_address!=="object"||disclosure.registered_address===null||
      Array.isArray(disclosure.registered_address)){
      throw new Error("ORDER_PLAN_AUTHORITY_DISCLOSURE_UNAVAILABLE");
    }
    const costCenters=(await db.query<CostCenterRow>(
      `select erp_cost_center_mapping_id,mapping_version,erp_cost_center_id,
        approval_receipt_id,approval_receipt_sha256
       from crays_core.erp_cost_center_mapping_versions
       where tenant_id=$1 and store_id=$2 and operator_legal_entity_id=$3
        and store_operator_assignment_id=$4 and store_operator_assignment_version=$5
        and erp_site_id=$6 and erp_company_id=$7 and lifecycle_state='active'`,
      [input.tenantId,context.storeId,context.operatorLegalEntityId,
       context.storeOperatorAssignmentId,context.storeOperatorAssignmentVersion,
       context.erp.siteId,context.erp.companyId],
    )).rows;
    if(costCenters.length!==1)throw new Error("ORDER_PLAN_AUTHORITY_COST_CENTER_UNAVAILABLE");
    const physical=cart.lines.filter(line=>line.productType==="physical");
    const erpRows=physical.length===0?[]:(await db.query<ErpLineRow>(
      `select c.variant_ref,i.erp_item_mapping_id,i.mapping_version item_mapping_version,
        i.erp_item_code,w.warehouse_mapping_id,w.mapping_version warehouse_mapping_version,
        w.erp_warehouse_id
       from crays_core.seller_bound_cart_lines c
       join crays_core.erp_item_mapping_versions i
        on i.tenant_id=c.tenant_id
       and i.sellable_product_classification_id=c.sellable_product_classification_id
       and i.classification_version=c.classification_version
       and i.erp_site_id=$3 and i.erp_company_id=$4 and i.lifecycle_state='active'
       join crays_core.erp_warehouse_mapping_versions w
        on w.tenant_id=i.tenant_id and w.erp_item_mapping_id=i.erp_item_mapping_id
       and w.item_mapping_version=i.mapping_version and w.erp_site_id=i.erp_site_id
       and w.erp_company_id=i.erp_company_id and w.lifecycle_state='active'
       where c.tenant_id=$1 and c.cart_id=$2 and c.product_type='physical'
       order by c.variant_ref`,
      [input.tenantId,cart.cartId,context.erp.siteId,context.erp.companyId],
    )).rows;
    if(erpRows.length!==physical.length||
      new Set(erpRows.map(row=>row.variant_ref)).size!==physical.length){
      throw new Error("ORDER_PLAN_AUTHORITY_ERP_MAPPING_UNAVAILABLE");
    }
    const preflight=preflights[0];
    const candidate:StorefrontOrderConversionPlanInput={
      tenantId:input.tenantId,orderSnapshotId:input.orderSnapshotId,orderId:input.orderId,
      orderCode:input.orderCode,idempotencyKey:input.idempotencyKey,
      expectedCurrency:input.expectedCurrency,context,cart,
      preflight:{
        tenantId:preflight.tenant_id,partnerTenantId:preflight.partner_tenant_id,
        preflightId:preflight.preflight_id,cartId:preflight.cart_id,
        cartVersion:Number(preflight.cart_version),state:preflight.preflight_state,
        requestSha256:preflight.request_sha256,resultSha256:preflight.result_sha256,
        seller:{storeId:preflight.store_id,
          operatorLegalEntityId:preflight.operator_legal_entity_id,
          vendureSellerId:preflight.vendure_seller_id,
          vendureChannelId:preflight.vendure_channel_id,currency:preflight.currency},
      },
      sellerDisclosure:{
        partnerTenantId:disclosure.partner_tenant_id,
        operatorLegalEntityId:disclosure.operator_legal_entity_id,
        storeId:disclosure.store_id,sellerLegalName:disclosure.legal_name,
        sellerDisplayName:disclosure.store_display_name,
        sellerRegisteredAddress:disclosure.registered_address as Readonly<Record<string,unknown>>,
        sellerTaxRegistrationRef:disclosure.tax_registration_ref??"",
        disclosurePolicyVersion:"ncrv2-138.seller-disclosure.v1",
      },
      erpCostCenterMapping:{
        erpCostCenterMappingId:costCenters[0].erp_cost_center_mapping_id,
        erpCostCenterMappingVersion:costCenters[0].mapping_version,
        erpCostCenterId:costCenters[0].erp_cost_center_id,
        approvalReceiptId:costCenters[0].approval_receipt_id,
        approvalReceiptSha256:costCenters[0].approval_receipt_sha256,
      },
      orderLineErpMappings:erpRows.map(row=>({
        variantRef:row.variant_ref,erpItemMappingId:row.erp_item_mapping_id,
        erpItemMappingVersion:row.item_mapping_version,erpItemCode:row.erp_item_code,
        warehouseMappingId:row.warehouse_mapping_id,
        warehouseMappingVersion:row.warehouse_mapping_version,
        erpWarehouseId:row.erp_warehouse_id,
      })),
    };
    const plan=prepareStorefrontOrderConversionPlan(candidate);
    await db.query("commit");
    return plan;
  }catch(error){
    await db.query("rollback").catch(()=>undefined);
    throw error;
  }finally{db.release();}
}
