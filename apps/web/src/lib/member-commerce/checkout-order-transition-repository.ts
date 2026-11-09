import {
  verifyFrozenOrderSellerSnapshot,
  type FrozenOrderSellerSnapshot,
} from "./checkout-order-transition-contract";
import {digestStorefrontSellerDisclosure} from "./storefront-order-conversion-plan";

type QueryResult<Row> = Readonly<{rows: Row[]}>;
export type CheckoutOrderDb = Readonly<{
  query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
}>;
export type CheckoutOrderPool = Readonly<{
  connect(): Promise<CheckoutOrderDb & Readonly<{release(): void}>>;
}>;

export type CheckoutOrderTransitionMutation = Readonly<{
  tenantId: string;
  orderSnapshotId: string;
  transitionReceiptId: string;
  idempotencyKey: string;
  receiptSha256: string;
  outboxEventId: string;
  payloadSha256: string;
  createdAt: string;
  snapshot: FrozenOrderSellerSnapshot;
  planSha256: string;
  preflightResultSha256: string;
  preflightRequestSha256: string;
  sellerDisclosureSha256: string;
  expectedCurrency: string;
}>;

const HASH = /^[a-f0-9]{64}$/;
const nonempty = (value: string) => value.trim().length > 0;

export function prepareCheckoutOrderTransitionMutation(input: CheckoutOrderTransitionMutation) {
  const snapshot = verifyFrozenOrderSellerSnapshot(input.snapshot);
  if ([input.tenantId,input.orderSnapshotId,input.transitionReceiptId,input.idempotencyKey,
    input.outboxEventId].some((value) => !nonempty(value)) ||
    !HASH.test(input.receiptSha256) || !HASH.test(input.payloadSha256) ||
    !Number.isFinite(Date.parse(input.createdAt)) || snapshot.version !== 3 ||
    !HASH.test(input.planSha256)||!HASH.test(input.preflightRequestSha256)||!HASH.test(input.preflightResultSha256)||
    !HASH.test(input.sellerDisclosureSha256)||!nonempty(input.expectedCurrency)||
    input.payloadSha256!==input.planSha256||
    snapshot.lines.length === 0 || snapshot.cartVersion < 1 ||
    snapshot.lines.some((line) => !nonempty(line.variantRef) || line.quantity < 1 ||
      !nonempty(line.sellableProductClassificationId) || line.classificationVersion < 1 ||
      line.taxonomyVersion < 1 || !nonempty(line.routingPolicyVersion) ||
      (line.productType === "physical" &&
        (!line.erpItemMappingId || !line.erpItemMappingVersion || !line.erpItemCode ||
         !line.warehouseMappingId || !line.warehouseMappingVersion || !line.erpWarehouseId)) ||
      (line.productType !== "physical" &&
        (line.erpItemMappingId !== null || line.erpItemMappingVersion !== null ||
         line.erpItemCode !== null || line.warehouseMappingId !== null ||
         line.warehouseMappingVersion !== null || line.erpWarehouseId !== null)))) {
    throw new Error("CHECKOUT_ORDER_TRANSITION_INPUT_INVALID");
  }
  return Object.freeze({...input, snapshot});
}

async function transaction<T>(pool: CheckoutOrderPool, tenantId: string, work: (db: CheckoutOrderDb) => Promise<T>) {
  const db = await pool.connect();
  try {
    await db.query("begin");
    await db.query("select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true)", [tenantId]);
    const result = await work(db);
    await db.query("commit");
    return result;
  } catch (error) {
    await db.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    db.release();
  }
}

export function persistCheckoutOrderTransition(pool: CheckoutOrderPool, candidate: CheckoutOrderTransitionMutation) {
  const mutation = prepareCheckoutOrderTransitionMutation(candidate);
  const s = mutation.snapshot;
  return transaction(pool, mutation.tenantId, async (db) => {
    const replay = (await db.query<Readonly<{
      transition_receipt_id: string; order_snapshot_id: string; order_id: string;
      snapshot_sha256: string; receipt_sha256: string;
    }>>(
      "select transition_receipt_id,order_snapshot_id,order_id,snapshot_sha256,receipt_sha256 from crays_core.checkout_order_transition_receipts where tenant_id=$1 and idempotency_key=$2",
      [mutation.tenantId, mutation.idempotencyKey],
    )).rows[0];
    if (replay) {
      if (replay.transition_receipt_id !== mutation.transitionReceiptId ||
          replay.order_snapshot_id !== mutation.orderSnapshotId || replay.order_id !== s.orderId ||
          replay.snapshot_sha256 !== s.snapshotSha256 || replay.receipt_sha256 !== mutation.receiptSha256) {
        throw new Error("CHECKOUT_ORDER_TRANSITION_REPLAY_CONFLICT");
      }
      return Object.freeze({orderId: s.orderId, orderSnapshotId: mutation.orderSnapshotId,
        snapshotSha256: s.snapshotSha256, replayed: true as const,
        transitionState: "PERSISTED_PENDING_PROVIDER" as const});
    }

    const cart = (await db.query<Readonly<{
      cart_version: string | number; cart_state: string; vertical_root: string; store_id: string;
      partner_tenant_id: string; operator_legal_entity_id: string; vendure_seller_id: string;
      vendure_channel_id: string; context_fingerprint: string;
    }>>(
      "select cart_version,cart_state,vertical_root,store_id,partner_tenant_id,operator_legal_entity_id,vendure_seller_id,vendure_channel_id,context_fingerprint from crays_core.seller_bound_carts where tenant_id=$1 and cart_id=$2 for update",
      [mutation.tenantId, s.cartId],
    )).rows[0];
    if (!cart || Number(cart.cart_version) !== s.cartVersion || cart.cart_state !== "active" ||
        cart.vertical_root !== s.verticalRoot || cart.store_id !== s.storeId ||
        cart.partner_tenant_id !== s.partnerTenantId || cart.operator_legal_entity_id !== s.operatorLegalEntityId ||
        cart.vendure_seller_id !== s.vendureSellerId || cart.vendure_channel_id !== s.vendureChannelId ||
        cart.context_fingerprint !== s.cartContextFingerprint) {
      throw new Error("CHECKOUT_ORDER_TRANSITION_CART_CONFLICT");
    }
    const preflights=(await db.query<Readonly<{request_sha256:string;result_sha256:string;
      preflight_state:string;store_id:string;partner_tenant_id:string;operator_legal_entity_id:string;
      vendure_seller_id:string;vendure_channel_id:string;currency:string}>>(
      `select request_sha256,result_sha256,preflight_state,store_id,partner_tenant_id,
        operator_legal_entity_id,vendure_seller_id,vendure_channel_id,currency
       from crays_core.checkout_shipping_tax_preflights
       where tenant_id=$1 and preflight_id=$2 and cart_id=$3 and cart_version=$4 for share`,
      [mutation.tenantId,s.checkoutPreflightId,s.cartId,s.cartVersion],
    )).rows;
    const preflight=preflights[0];
    if(preflights.length!==1||!preflight||
      preflight.preflight_state!=="PERSISTED_PENDING_PROVIDER_PARITY"||
      preflight.request_sha256!==mutation.preflightRequestSha256||
      preflight.result_sha256!==mutation.preflightResultSha256||
      preflight.store_id!==s.storeId||preflight.partner_tenant_id!==s.partnerTenantId||
      preflight.operator_legal_entity_id!==s.operatorLegalEntityId||
      preflight.vendure_seller_id!==s.vendureSellerId||
      preflight.vendure_channel_id!==s.vendureChannelId||
      preflight.currency!==mutation.expectedCurrency) {
      throw new Error("CHECKOUT_ORDER_TRANSITION_PREFLIGHT_AUTHORITY_CONFLICT");
    }
    const disclosure=(await db.query<Readonly<{legal_name:string;registered_address:unknown;
      tax_registration_ref:string|null;store_display_name:string}>>(`select l.legal_name,l.registered_address,
      l.tax_registration_ref,st.display_name store_display_name from crays_core.operator_legal_entities l
      join crays_core.stores st on st.store_id=$3 and st.status='active'
      where l.legal_entity_id=$1 and l.partner_tenant_id=$2 and l.status='active' for update of l,st`,
      [s.operatorLegalEntityId,s.partnerTenantId,s.storeId])).rows[0];
    if(!disclosure||!disclosure.legal_name.trim()||!disclosure.store_display_name.trim()||
      !disclosure.tax_registration_ref?.trim()||typeof disclosure.registered_address!=="object"||
      disclosure.registered_address===null||Array.isArray(disclosure.registered_address)||
      Object.keys(disclosure.registered_address).length===0)throw new Error("CHECKOUT_ORDER_SELLER_DISCLOSURE_AUTHORITY_UNAVAILABLE");

    const disclosureBody={orderSnapshotId:mutation.orderSnapshotId,partnerTenantId:s.partnerTenantId,
      operatorLegalEntityId:s.operatorLegalEntityId,storeId:s.storeId,sellerLegalName:disclosure.legal_name,
      sellerDisplayName:disclosure.store_display_name,sellerRegisteredAddress:disclosure.registered_address,
      sellerTaxRegistrationRef:disclosure.tax_registration_ref,operatorKind:"independent_franchise_operator" as const,
      disclosurePolicyVersion:"ncrv2-138.seller-disclosure.v1"};
    if(digestStorefrontSellerDisclosure(disclosureBody)!==mutation.sellerDisclosureSha256)
      throw new Error("CHECKOUT_ORDER_TRANSITION_SELLER_DISCLOSURE_CONFLICT");
    const costCenters=(await db.query<Readonly<{
      erp_cost_center_mapping_id:string;mapping_version:string;erp_cost_center_id:string;
      approval_receipt_id:string;approval_receipt_sha256:string;
    }>>(`select erp_cost_center_mapping_id,mapping_version,erp_cost_center_id,
        approval_receipt_id,approval_receipt_sha256
      from crays_core.erp_cost_center_mapping_versions
      where tenant_id=$1 and erp_cost_center_mapping_id=$2 and mapping_version=$3
        and store_id=$4 and operator_legal_entity_id=$5
        and store_operator_assignment_id=$6 and store_operator_assignment_version=$7
        and erp_site_id=$8 and erp_company_id=$9 and lifecycle_state='active'`,
      [mutation.tenantId,s.erpCostCenterMappingId,s.erpCostCenterMappingVersion,s.storeId,
        s.operatorLegalEntityId,s.storeOperatorAssignmentId,s.storeOperatorAssignmentVersion,
        s.erpSiteId,s.erpCompanyId])).rows;
    const costCenter=costCenters[0];
    if(costCenters.length!==1||!costCenter||costCenter.erp_cost_center_id!==s.erpCostCenterId||
      costCenter.approval_receipt_id!==s.erpCostCenterApprovalReceiptId||
      costCenter.approval_receipt_sha256!==s.erpCostCenterApprovalReceiptSha256){
      throw new Error("CHECKOUT_ORDER_TRANSITION_ERP_COST_CENTER_AUTHORITY_CONFLICT");
    }

    for (const line of s.lines) {
      if (line.productType !== "physical") continue;
      const mapping = (await db.query<Readonly<{
        erp_item_mapping_id:string; item_mapping_version:string; erp_item_code:string;
        warehouse_mapping_id:string; warehouse_mapping_version:string; erp_warehouse_id:string;
      }>>(
        `select i.erp_item_mapping_id,i.mapping_version item_mapping_version,i.erp_item_code,
          w.warehouse_mapping_id,w.mapping_version warehouse_mapping_version,w.erp_warehouse_id
         from crays_core.erp_item_mapping_versions i
         join crays_core.erp_warehouse_mapping_versions w
           on w.tenant_id=i.tenant_id and w.erp_item_mapping_id=i.erp_item_mapping_id
          and w.item_mapping_version=i.mapping_version
         where i.tenant_id=$1 and i.sellable_product_classification_id=$2
          and i.classification_version=$3 and i.erp_site_id=$4 and i.erp_company_id=$5
          and i.lifecycle_state='active' and w.lifecycle_state='active'`,
        [mutation.tenantId,line.sellableProductClassificationId,line.classificationVersion,
          s.erpSiteId,s.erpCompanyId],
      )).rows;
      const resolved=mapping[0];
      if (mapping.length !== 1 || !resolved || resolved.erp_item_mapping_id !== line.erpItemMappingId ||
          resolved.item_mapping_version !== line.erpItemMappingVersion ||
          resolved.erp_item_code !== line.erpItemCode ||
          resolved.warehouse_mapping_id !== line.warehouseMappingId ||
          resolved.warehouse_mapping_version !== line.warehouseMappingVersion ||
          resolved.erp_warehouse_id !== line.erpWarehouseId ||
          !s.erpWarehouseIds.includes(line.erpWarehouseId!)) {
        throw new Error("CHECKOUT_ORDER_TRANSITION_ERP_MAPPING_AUTHORITY_CONFLICT");
      }
    }

    await db.query(
      `insert into crays_core.checkout_order_snapshots
       (order_snapshot_id,tenant_id,order_id,order_code,cart_id,cart_version,checkout_preflight_id,
        vertical_root,store_id,store_version,partner_tenant_id,operator_legal_entity_id,
        store_operator_assignment_id,store_operator_assignment_version,vendure_deployment_cell_id,
        vendure_seller_id,vendure_channel_id,stripe_connected_account_id,stripe_environment,
        erp_site_id,erp_company_id,erp_warehouse_ids,erp_binding_version,erp_cost_center_mapping_id,
        erp_cost_center_mapping_version,erp_cost_center_id,erp_cost_center_approval_receipt_id,
        erp_cost_center_approval_receipt_sha256,provider_binding_id,provider_binding_version,
        cart_context_fingerprint,snapshot_payload,snapshot_sha256,created_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
        $22::jsonb,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32::jsonb,$33,$34)`,
      [mutation.orderSnapshotId,mutation.tenantId,s.orderId,s.orderCode,s.cartId,s.cartVersion,
        s.checkoutPreflightId,s.verticalRoot,s.storeId,s.storeVersion,s.partnerTenantId,
        s.operatorLegalEntityId,s.storeOperatorAssignmentId,s.storeOperatorAssignmentVersion,
        s.vendureDeploymentCellId,s.vendureSellerId,s.vendureChannelId,s.stripeConnectedAccountId,
        s.stripeEnvironment,s.erpSiteId,s.erpCompanyId,JSON.stringify(s.erpWarehouseIds),
        s.erpBindingVersion,s.erpCostCenterMappingId,s.erpCostCenterMappingVersion,s.erpCostCenterId,
        s.erpCostCenterApprovalReceiptId,s.erpCostCenterApprovalReceiptSha256,s.providerBindingId,
        s.providerBindingVersion,s.cartContextFingerprint,JSON.stringify(s),s.snapshotSha256,
        mutation.createdAt],
    );
    await db.query(`insert into crays_core.checkout_order_seller_disclosures
      (order_snapshot_id,tenant_id,partner_tenant_id,operator_legal_entity_id,store_id,seller_legal_name,
       seller_display_name,seller_registered_address,seller_tax_registration_ref,operator_kind,
       disclosure_policy_version,disclosure_sha256,created_at)
      values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13)`,[mutation.orderSnapshotId,
      mutation.tenantId,s.partnerTenantId,s.operatorLegalEntityId,s.storeId,disclosure.legal_name,
      disclosure.store_display_name,JSON.stringify(disclosure.registered_address),disclosure.tax_registration_ref,
      disclosureBody.operatorKind,disclosureBody.disclosurePolicyVersion,mutation.sellerDisclosureSha256,mutation.createdAt]);
    for (const line of s.lines) {
      await db.query(
        `insert into crays_core.checkout_order_snapshot_lines
         (order_snapshot_line_id,order_snapshot_id,tenant_id,cart_id,cart_version,variant_ref,quantity,
          sellable_assignment_id,sellable_assignment_version,sellable_product_classification_id,
          classification_version,taxonomy_version,product_type,vertical_product_class,
          routing_policy_version,erp_item_mapping_id,erp_item_mapping_version,erp_item_code,
          warehouse_mapping_id,warehouse_mapping_version,erp_warehouse_id,
          mixed_type_compatibility_receipts,created_at)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22::jsonb,$23)`,
        [`${mutation.orderSnapshotId}:${line.variantRef}`,mutation.orderSnapshotId,mutation.tenantId,
          s.cartId,s.cartVersion,line.variantRef,line.quantity,line.sellableAssignmentId,
          line.sellableAssignmentVersion,line.sellableProductClassificationId,line.classificationVersion,
          line.taxonomyVersion,line.productType,line.verticalProductClass,line.routingPolicyVersion,
          line.erpItemMappingId,line.erpItemMappingVersion,line.erpItemCode,line.warehouseMappingId,
          line.warehouseMappingVersion,line.erpWarehouseId,
          JSON.stringify(line.mixedTypeCompatibilityReceipts),mutation.createdAt],
      );
    }
    await db.query(
      `insert into crays_core.checkout_order_transition_receipts
       (transition_receipt_id,tenant_id,order_snapshot_id,order_id,cart_id,cart_version,
        idempotency_key,snapshot_sha256,receipt_sha256,transition_state,created_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,'PERSISTED_PENDING_PROVIDER',$10)`,
      [mutation.transitionReceiptId,mutation.tenantId,mutation.orderSnapshotId,s.orderId,s.cartId,
        s.cartVersion,mutation.idempotencyKey,s.snapshotSha256,mutation.receiptSha256,mutation.createdAt],
    );
    await db.query(
      `insert into crays_core.checkout_order_transition_outbox
       (outbox_event_id,tenant_id,order_snapshot_id,transition_receipt_id,partner_tenant_id,
        operator_legal_entity_id,store_id,vendure_seller_id,vendure_channel_id,snapshot_sha256,
        payload_sha256,event_type,delivery_state,created_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'CHECKOUT_ORDER_SNAPSHOT_FROZEN','PENDING',$12)`,
      [mutation.outboxEventId,mutation.tenantId,mutation.orderSnapshotId,mutation.transitionReceiptId,
        s.partnerTenantId,s.operatorLegalEntityId,s.storeId,s.vendureSellerId,s.vendureChannelId,
        s.snapshotSha256,mutation.payloadSha256,mutation.createdAt],
    );
    const converted = await db.query(
      "update crays_core.seller_bound_carts set cart_state='converted',cart_version=cart_version+1,updated_at=$1 where tenant_id=$2 and cart_id=$3 and cart_version=$4 and cart_state='active' returning cart_id",
      [mutation.createdAt,mutation.tenantId,s.cartId,s.cartVersion],
    );
    if (!converted.rows[0]) throw new Error("CHECKOUT_ORDER_TRANSITION_CART_CONFLICT");
    return Object.freeze({orderId: s.orderId, orderSnapshotId: mutation.orderSnapshotId,
      snapshotSha256: s.snapshotSha256, replayed: false as const,
      transitionState: "PERSISTED_PENDING_PROVIDER" as const});
  });
}
