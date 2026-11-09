import "server-only";

import {createHash} from "node:crypto";
import type {KdsDatabase} from "@/store-operations/kds";
import {
  requireStorefrontCustomerCartAuthority,
  resolveStorefrontCustomerRelationship,
  type StorefrontCartAuthority,
} from "./storefront-cart-bff";
import {
  resolveStorefrontRouteCommerceContextSnapshot,
  type StorefrontRouteCommerceContext,
} from "./storefront-route-commerce-context";
import {
  resolveStorefrontOrderConversionPlan,
  type OrderPlanAuthorityPool,
} from "./storefront-order-conversion-plan-repository";
import {executeStorefrontOrderConversionPlan} from "./storefront-order-conversion-command";
import type {
  StorefrontOrderBffRequest,
  StorefrontOrderBffResult,
} from "./storefront-order-bff-contract";

type AuthoritySnapshot=Readonly<{
  tenantId:string;
  customerRelationshipId:string;
  route:StorefrontRouteCommerceContext;
  storeDisplayName:string;
}>;
type CommandIds=Readonly<{
  orderSnapshotId:string;orderId:string;orderCode:string;
  transitionReceiptId:string;outboxEventId:string;
}>;
type Replay=Readonly<{orderCode:string}>|null;
export type StorefrontOrderBffDependencies=Readonly<{
  resolveAuthoritySnapshot?:(database:KdsDatabase,input:Readonly<{
    request:StorefrontOrderBffRequest;accountId:string;
  }>)=>Promise<AuthoritySnapshot>;
  findReplay?:(database:KdsDatabase,input:Readonly<{
    authority:AuthoritySnapshot;request:StorefrontOrderBffRequest;ids:CommandIds;
  }>)=>Promise<Replay>;
  resolvePlan?:typeof resolveStorefrontOrderConversionPlan;
  executePlan?:typeof executeStorefrontOrderConversionPlan;
  now?:()=>Date;
}>;

const sha=(value:string)=>createHash("sha256").update(value).digest("hex");
function ids(input:Readonly<{authority:AuthoritySnapshot;request:StorefrontOrderBffRequest}>):
CommandIds{
  const body=["ncrv2-134.order-bff.ids.v1",input.authority.tenantId,
    input.authority.customerRelationshipId,input.authority.route.routeId,
    String(input.request.expectedCartVersion),input.request.checkoutPreflightReference,
    input.request.idempotencyKey].join("|");
  const root=sha(body);
  return Object.freeze({
    orderSnapshotId:`order-snapshot-${root}`,
    orderId:`order-${root}`,
    orderCode:`CRAYS-${root.slice(0,20).toUpperCase()}`,
    transitionReceiptId:`order-transition-${root}`,
    outboxEventId:`order-outbox-${root}`,
  });
}

async function defaultAuthoritySnapshot(database:KdsDatabase,input:Readonly<{
  request:StorefrontOrderBffRequest;accountId:string;
}>):Promise<AuthoritySnapshot>{
  return database.transaction(async({query})=>{
    await query("set transaction isolation level repeatable read read only");
    await query("select set_config('crays.app_role','core_service',true)");
    const clock=await query<{authority_now:string|Date}>(
      "select transaction_timestamp() authority_now");
    const authorityNow=new Date(clock.rows[0]?.authority_now??"");
    if(!Number.isFinite(authorityNow.getTime())){
      throw new Error("STOREFRONT_ORDER_AUTHORITY_CLOCK_INVALID");
    }
    const route=await resolveStorefrontRouteCommerceContextSnapshot(query,{
      verticalRoot:input.request.verticalRoot,storeSlug:input.request.storeSlug,
    },authorityNow);
    await query("select set_config('crays.tenant_id',$1,true)",
      [route.context.partnerTenantId]);
    const relationship=await resolveStorefrontCustomerRelationship(query,{
      accountId:input.accountId,route,authorityNow,
    });
    return Object.freeze({
      tenantId:route.context.partnerTenantId,
      customerRelationshipId:relationship,
      route,storeDisplayName:route.store.displayName,
    });
  });
}

async function defaultFindReplay(database:KdsDatabase,input:Readonly<{
  authority:AuthoritySnapshot;request:StorefrontOrderBffRequest;ids:CommandIds;
}>):Promise<Replay>{
  return database.transaction(async({query})=>{
    await query("set transaction isolation level repeatable read read only");
    await query("select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true)",
      [input.authority.tenantId]);
    const result=await query<{order_code:string;order_snapshot_id:string;
      transition_receipt_id:string;cart_version:string|number;checkout_preflight_id:string;
      customer_relationship_id:string;vertical_root:string;store_id:string}>(
      `select s.order_code,s.order_snapshot_id,r.transition_receipt_id,s.cart_version,
        s.checkout_preflight_id,c.customer_relationship_id,s.vertical_root,s.store_id
       from crays_core.checkout_order_transition_receipts r
       join crays_core.checkout_order_snapshots s
        on s.tenant_id=r.tenant_id and s.order_snapshot_id=r.order_snapshot_id
       join crays_core.seller_bound_carts c
        on c.tenant_id=s.tenant_id and c.cart_id=s.cart_id
       where r.tenant_id=$1 and r.idempotency_key=$2`,
      [input.authority.tenantId,input.request.idempotencyKey]);
    if(result.rows.length===0)return null;
    if(result.rows.length!==1)throw new Error("STOREFRONT_ORDER_REPLAY_AMBIGUOUS");
    const row=result.rows[0];
    if(row.order_snapshot_id!==input.ids.orderSnapshotId||
      row.transition_receipt_id!==input.ids.transitionReceiptId||
      Number(row.cart_version)!==input.request.expectedCartVersion||
      row.checkout_preflight_id!==input.request.checkoutPreflightReference||
      row.customer_relationship_id!==input.authority.customerRelationshipId||
      row.vertical_root!==input.authority.route.context.verticalRoot||
      row.store_id!==input.authority.route.context.storeId||
      row.order_code!==input.ids.orderCode){
      throw new Error("STOREFRONT_ORDER_REPLAY_CONFLICT");
    }
    return Object.freeze({orderCode:row.order_code});
  });
}

export async function executeAuthenticatedStorefrontOrder(
  database:KdsDatabase,
  pool:OrderPlanAuthorityPool,
  input:Readonly<{request:StorefrontOrderBffRequest;authority:StorefrontCartAuthority}>,
  dependencies:StorefrontOrderBffDependencies={},
):Promise<StorefrontOrderBffResult>{
  const customer=requireStorefrontCustomerCartAuthority(input.authority);
  const authority=await(dependencies.resolveAuthoritySnapshot??defaultAuthoritySnapshot)(
    database,{request:input.request,accountId:customer.accountId});
  const commandIds=ids({authority,request:input.request});
  const replay=await(dependencies.findReplay??defaultFindReplay)(
    database,{authority,request:input.request,ids:commandIds});
  if(replay){
    return Object.freeze({state:"pending_provider",storeSlug:input.request.storeSlug,
      storeDisplayName:authority.storeDisplayName,orderReference:replay.orderCode,
      replayed:true,recovery:"reconcile"});
  }
  const plan=await(dependencies.resolvePlan??resolveStorefrontOrderConversionPlan)(pool,{
    tenantId:authority.tenantId,
    customerRelationshipId:authority.customerRelationshipId,
    preflightId:input.request.checkoutPreflightReference,
    ...commandIds,
    idempotencyKey:input.request.idempotencyKey,
    expectedCurrency:authority.route.currency,
    context:authority.route.context,
  });
  if(plan.cartVersion!==input.request.expectedCartVersion||
    plan.preflight.preflightId!==input.request.checkoutPreflightReference){
    throw new Error("STOREFRONT_ORDER_CART_OR_PREFLIGHT_CONFLICT");
  }
  const now=(dependencies.now??(()=>new Date()))();
  if(!Number.isFinite(now.getTime()))throw new Error("STOREFRONT_ORDER_CLOCK_INVALID");
  const persisted=await(dependencies.executePlan??executeStorefrontOrderConversionPlan)(pool,{
    plan,transitionReceiptId:commandIds.transitionReceiptId,
    outboxEventId:commandIds.outboxEventId,createdAt:now.toISOString(),
  });
  if(persisted.orderId!==commandIds.orderId||
    persisted.orderSnapshotId!==commandIds.orderSnapshotId||
    persisted.transitionState!=="PERSISTED_PENDING_PROVIDER"){
    throw new Error("STOREFRONT_ORDER_PERSISTENCE_RESULT_INVALID");
  }
  return Object.freeze({state:"pending_provider",storeSlug:input.request.storeSlug,
    storeDisplayName:authority.storeDisplayName,orderReference:commandIds.orderCode,
    replayed:persisted.replayed,recovery:"reconcile"});
}
