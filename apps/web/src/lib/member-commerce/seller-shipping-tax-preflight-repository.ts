import {createHash} from "node:crypto";
import {
  calculateSellerShippingAndTax,
  type Address,
  type SellerScope,
  type ShippingRule,
  type TaxRule,
} from "./seller-shipping-tax-calculator";

type Result<Row> = Readonly<{rows: Row[]}>;
export type ShippingTaxDb = Readonly<{query<Row=Record<string,unknown>>(sql:string,values?:readonly unknown[]):Promise<Result<Row>>}>;
export type ShippingTaxPool = Readonly<{connect():Promise<ShippingTaxDb&Readonly<{release():void}>>}>;
export type ShippingTaxPreflightInput = Readonly<{
  tenantId:string; preflightId:string; outboxEventId:string; cartId:string; expectedCartVersion:number;
  seller:SellerScope; address:Address; shippingMethod:string; idempotencyKey:string; calculatedAt:string;
}>;

type CartRow=Readonly<{cart_version:string|number;cart_state:string;store_id:string;partner_tenant_id:string;operator_legal_entity_id:string;vendure_seller_id:string;vendure_channel_id:string}>;
type CatalogLineRow=Readonly<{variant_ref:string;quantity:string|number;catalog_projection_id:string;projection_version:string|number;price_minor:string|number;price_book_version:string;tax_category:string;tax_mapping_version:string}>;
type ShippingRuleRow=Readonly<{shipping_rule_id:string;rule_version:string;store_id:string;operator_legal_entity_id:string;vendure_seller_id:string;vendure_channel_id:string;currency:string;country_code:string;postal_prefix:string;shipping_method:string;shipping_minor:string|number}>;
type TaxRuleRow=Readonly<{tax_rule_id:string;rule_version:string;store_id:string;operator_legal_entity_id:string;vendure_seller_id:string;vendure_channel_id:string;currency:string;country_code:string;postal_prefix:string;tax_category:string;rate_basis_points:string|number}>;
const HASH=/^[a-f0-9]{64}$/;
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");

function validate(input:ShippingTaxPreflightInput){
  if([input.tenantId,input.preflightId,input.outboxEventId,input.cartId,input.idempotencyKey,input.shippingMethod].some(v=>!v.trim())||
    !Number.isSafeInteger(input.expectedCartVersion)||input.expectedCartVersion<1||!Number.isFinite(Date.parse(input.calculatedAt)))
    throw new Error("SHIPPING_TAX_PREFLIGHT_INPUT_INVALID");
}
export function prepareSellerShippingTaxPreflight(input:ShippingTaxPreflightInput):ShippingTaxPreflightInput{
  const snapshot=Object.freeze({
    ...input,
    seller:Object.freeze({...input.seller}),
    address:Object.freeze({...input.address}),
  });
  validate(snapshot);
  return snapshot;
}
function sameCartScope(cart:CartRow,input:ShippingTaxPreflightInput){return cart.cart_state==="active"&&Number(cart.cart_version)===input.expectedCartVersion&&cart.store_id===input.seller.storeId&&cart.operator_legal_entity_id===input.seller.operatorLegalEntityId&&cart.vendure_seller_id===input.seller.vendureSellerId&&cart.vendure_channel_id===input.seller.vendureChannelId;}
async function transaction<T>(pool:ShippingTaxPool,tenantId:string,work:(db:ShippingTaxDb)=>Promise<T>){const db=await pool.connect();try{await db.query("begin");await db.query("select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true)",[tenantId]);const value=await work(db);await db.query("commit");return value;}catch(error){await db.query("rollback").catch(()=>undefined);throw error;}finally{db.release();}}

export function persistSellerShippingTaxPreflight(pool:ShippingTaxPool,input:ShippingTaxPreflightInput){
  input=prepareSellerShippingTaxPreflight(input);
  const requestSha256=digest({tenantId:input.tenantId,cartId:input.cartId,expectedCartVersion:input.expectedCartVersion,seller:input.seller,address:input.address,shippingMethod:input.shippingMethod,idempotencyKey:input.idempotencyKey});
  return transaction(pool,input.tenantId,async db=>{
    const prior=(await db.query<Readonly<{preflight_id:string;request_sha256:string;result_sha256:string}>>("select preflight_id,request_sha256,result_sha256 from crays_core.checkout_shipping_tax_preflights where tenant_id=$1 and idempotency_key=$2",[input.tenantId,input.idempotencyKey])).rows[0];
    if(prior){if(prior.preflight_id!==input.preflightId||prior.request_sha256!==requestSha256||!HASH.test(prior.result_sha256))throw new Error("SHIPPING_TAX_PREFLIGHT_REPLAY_CONFLICT");return Object.freeze({preflightId:prior.preflight_id,requestSha256,resultSha256:prior.result_sha256,replayed:true as const,state:"PERSISTED_PENDING_PROVIDER_PARITY" as const});}
    const cart=(await db.query<CartRow>("select cart_version,cart_state,store_id,partner_tenant_id,operator_legal_entity_id,vendure_seller_id,vendure_channel_id from crays_core.seller_bound_carts where tenant_id=$1 and cart_id=$2 for update",[input.tenantId,input.cartId])).rows[0];
    if(!cart||!sameCartScope(cart,input))throw new Error("SHIPPING_TAX_PREFLIGHT_CART_SCOPE_CONFLICT");
    const catalogLines=(await db.query<CatalogLineRow>(`select l.variant_ref,l.quantity,c.catalog_projection_id,c.projection_version,c.price_minor,c.price_book_version,c.tax_category,c.tax_mapping_version from crays_core.seller_bound_cart_lines l join crays_integration.partner_catalog_read_model c on c.vendure_variant_id=l.variant_ref and c.lifecycle_state='active' and c.store_id=$3 and c.partner_tenant_id=$4 and c.operator_legal_entity_id=$5 and c.vendure_seller_id=$6 and c.vendure_channel_id=$7 and c.currency=$8 where l.tenant_id=$1 and l.cart_id=$2 order by l.variant_ref`,[input.tenantId,input.cartId,input.seller.storeId,cart.partner_tenant_id,input.seller.operatorLegalEntityId,input.seller.vendureSellerId,input.seller.vendureChannelId,input.seller.currency])).rows;
    const count=(await db.query<Readonly<{count:string|number}>>("select count(*) count from crays_core.seller_bound_cart_lines where tenant_id=$1 and cart_id=$2",[input.tenantId,input.cartId])).rows[0];
    if(catalogLines.length===0||catalogLines.length!==Number(count?.count))throw new Error("SHIPPING_TAX_PREFLIGHT_CATALOG_UNRESOLVED");
    const time=input.calculatedAt;
    const shippingRows=(await db.query<ShippingRuleRow>(`select shipping_rule_id,rule_version,store_id,operator_legal_entity_id,vendure_seller_id,vendure_channel_id,currency,country_code,postal_prefix,shipping_method,shipping_minor from crays_core.seller_shipping_rule_versions where tenant_id=$1 and store_id=$2 and partner_tenant_id=$3 and operator_legal_entity_id=$4 and vendure_seller_id=$5 and vendure_channel_id=$6 and currency=$7 and country_code=$8 and $9 like postal_prefix||'%' and shipping_method=$10 and lifecycle_state='active' and effective_from<=$11 and (effective_until is null or effective_until>$11)`,[input.tenantId,input.seller.storeId,cart.partner_tenant_id,input.seller.operatorLegalEntityId,input.seller.vendureSellerId,input.seller.vendureChannelId,input.seller.currency,input.address.countryCode,input.address.postalCode,input.shippingMethod,time])).rows;
    const categories=[...new Set(catalogLines.map(line=>line.tax_category))];
    const taxRows=(await db.query<TaxRuleRow>(`select tax_rule_id,rule_version,store_id,operator_legal_entity_id,vendure_seller_id,vendure_channel_id,currency,country_code,postal_prefix,tax_category,rate_basis_points from crays_core.seller_tax_rule_versions where tenant_id=$1 and store_id=$2 and partner_tenant_id=$3 and operator_legal_entity_id=$4 and vendure_seller_id=$5 and vendure_channel_id=$6 and currency=$7 and country_code=$8 and $9 like postal_prefix||'%' and tax_category=any($10::text[]) and lifecycle_state='active' and effective_from<=$11 and (effective_until is null or effective_until>$11)`,[input.tenantId,input.seller.storeId,cart.partner_tenant_id,input.seller.operatorLegalEntityId,input.seller.vendureSellerId,input.seller.vendureChannelId,input.seller.currency,input.address.countryCode,input.address.postalCode,categories,time])).rows;
    const toShipping=(row:ShippingRuleRow):ShippingRule=>({...input.seller,ruleVersion:row.rule_version,countryCode:row.country_code,postalPrefix:row.postal_prefix,shippingMethod:row.shipping_method,shippingMinor:Number(row.shipping_minor)});
    const toTax=(row:TaxRuleRow):TaxRule=>({...input.seller,ruleVersion:row.rule_version,countryCode:row.country_code,postalPrefix:row.postal_prefix,taxCategory:row.tax_category,rateBasisPoints:Number(row.rate_basis_points)});
    const result=calculateSellerShippingAndTax({seller:input.seller,address:input.address,shippingMethod:input.shippingMethod,lines:catalogLines.map(line=>({lineId:line.variant_ref,netMinor:Number(line.price_minor)*Number(line.quantity),taxCategory:line.tax_category,seller:input.seller})),shippingRules:shippingRows.map(toShipping),taxRules:taxRows.map(toTax)});
    const frozenLines=result.lines.map(line=>{const catalog=catalogLines.find(c=>c.variant_ref===line.lineId)!;const tax=taxRows.find(t=>t.rule_version===line.taxRuleVersion&&t.tax_category===line.taxCategory)!;return{...line,quantity:Number(catalog.quantity),catalogProjectionId:catalog.catalog_projection_id,catalogProjectionVersion:Number(catalog.projection_version),unitPriceMinor:Number(catalog.price_minor),priceBookVersion:catalog.price_book_version,taxMappingVersion:catalog.tax_mapping_version,taxRuleId:tax.tax_rule_id};});
    const resultSha256=digest({...result,lines:frozenLines});
    const shipping=shippingRows.find(row=>row.rule_version===result.shippingRuleVersion)!;
    await db.query(`insert into crays_core.checkout_shipping_tax_preflights(preflight_id,tenant_id,cart_id,cart_version,store_id,partner_tenant_id,operator_legal_entity_id,vendure_seller_id,vendure_channel_id,currency,address_country_code,address_postal_code,shipping_method,shipping_rule_id,shipping_rule_version,shipping_minor,net_minor,tax_minor,total_minor,idempotency_key,request_sha256,result_sha256,preflight_state,calculated_at,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'PERSISTED_PENDING_PROVIDER_PARITY',$23,$23)`,[input.preflightId,input.tenantId,input.cartId,input.expectedCartVersion,input.seller.storeId,cart.partner_tenant_id,input.seller.operatorLegalEntityId,input.seller.vendureSellerId,input.seller.vendureChannelId,input.seller.currency,input.address.countryCode,input.address.postalCode,input.shippingMethod,shipping.shipping_rule_id,result.shippingRuleVersion,result.shippingMinor,result.netMinor,result.taxMinor,result.totalMinor,input.idempotencyKey,requestSha256,resultSha256,time]);
    for(const line of frozenLines)await db.query(`insert into crays_core.checkout_shipping_tax_preflight_lines(preflight_line_id,tenant_id,preflight_id,cart_id,cart_version,variant_ref,quantity,catalog_projection_id,catalog_projection_version,unit_price_minor,price_book_version,tax_category,tax_mapping_version,tax_rule_id,tax_rule_version,net_minor,tax_minor,gross_minor,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,[`${input.preflightId}:${line.lineId}`,input.tenantId,input.preflightId,input.cartId,input.expectedCartVersion,line.lineId,line.quantity,line.catalogProjectionId,line.catalogProjectionVersion,line.unitPriceMinor,line.priceBookVersion,line.taxCategory,line.taxMappingVersion,line.taxRuleId,line.taxRuleVersion,line.netMinor,line.taxMinor,line.grossMinor,time]);
    await db.query("insert into crays_core.checkout_shipping_tax_outbox(outbox_event_id,tenant_id,preflight_id,event_type,payload_sha256,delivery_state,created_at) values($1,$2,$3,'CHECKOUT_SHIPPING_TAX_PREFLIGHT_PERSISTED',$4,'PENDING',$5)",[input.outboxEventId,input.tenantId,input.preflightId,resultSha256,time]);
    return Object.freeze({preflightId:input.preflightId,requestSha256,resultSha256,replayed:false as const,state:"PERSISTED_PENDING_PROVIDER_PARITY" as const,result:Object.freeze({...result,lines:frozenLines})});
  });
}
