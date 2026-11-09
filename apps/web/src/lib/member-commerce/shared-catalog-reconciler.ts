import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { KdsDatabase } from "@/store-operations/kds";
import type {
  CraysCommerceAdapter,
  VendureProduct,
} from "./vendure-http-adapter";

const PAGE_SIZE = 50;
const MAX_PRODUCTS = 2_000;

type RouteBindingRow = {
  storefront_store_route_id: string;
  route_version: string | number;
  vertical_root: string;
  store_id: string;
  currency: string;
  store_operator_assignment_id: string;
  store_operator_assignment_version: string | number;
  partner_tenant_id: string;
  operator_legal_entity_id: string;
  provider_binding_id: string;
  provider_binding_version: string | number;
  vendure_seller_id: string;
  vendure_channel_id: string;
};

type SellableRow = {
  sellable_assignment_id: string;
  sellable_assignment_version: string | number;
  catalog_definition_version_id: string;
  vendure_variant_id: string;
  price_book_version: string;
  tax_mapping_version: string;
  stock_projection_mapping_version: string;
  sellable_product_classification_id: string;
  classification_version: string | number;
  taxonomy_version: string | number;
  product_type: string;
  vertical_product_class: string;
  routing_policy_version: string;
};

function sha(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function stableProducts(products: readonly VendureProduct[]) {
  return [...products].sort((a, b) => a.id.localeCompare(b.id)).map((product) => ({
    ...product,
    collections: [...product.collections].sort((a, b) => a.id.localeCompare(b.id)),
    facetValues: [...product.facetValues].sort((a, b) => a.id.localeCompare(b.id)),
    variants: [...product.variants].sort((a, b) => a.id.localeCompare(b.id)),
  }));
}

export async function collectCompleteVendureCatalog(
  adapter: CraysCommerceAdapter,
): Promise<readonly VendureProduct[]> {
  const products: VendureProduct[] = [];
  for (let skip = 0; skip <= MAX_PRODUCTS; skip += PAGE_SIZE) {
    const page = await adapter.listProducts(PAGE_SIZE, skip);
    products.push(...page);
    if (page.length < PAGE_SIZE) return stableProducts(products);
  }
  throw new Error("CATALOG_PROVIDER_SNAPSHOT_UNBOUNDED");
}

function facets(product: VendureProduct): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const value of product.facetValues) {
    const key = value.facet?.code;
    if (!key) continue;
    result[key] = [...new Set([...(result[key] ?? []), value.code])].sort();
  }
  return result;
}

function availability(stock: string) {
  if (stock === "IN_STOCK") return "available";
  if (stock === "LOW_STOCK") return "low";
  if (stock === "OUT_OF_STOCK") return "unavailable";
  return "unknown";
}

export async function reconcileSharedCatalog(
  database: KdsDatabase,
  adapter: CraysCommerceAdapter,
  input: Readonly<{
    storefrontStoreRouteId: string;
    expectedRouteVersion: number;
    now?: Date;
  }>,
) {
  if (!Number.isSafeInteger(input.expectedRouteVersion) ||
    input.expectedRouteVersion < 1) throw new Error("CATALOG_ROUTE_VERSION_INVALID");
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("CATALOG_RECONCILIATION_TIME_INVALID");
  const products = await collectCompleteVendureCatalog(adapter);
  const snapshotSha = sha(products);
  const variants = products.flatMap((product) => product.variants.map((variant) => ({
    product, variant,
  })));

  return database.transaction(async ({ query }) => {
    await query("set transaction isolation level serializable");
    await query("select set_config('crays.app_role','core_service',true)");
    const routes = await query<RouteBindingRow>(
      `select r.storefront_store_route_id,r.route_version,r.vertical_root,
              r.store_id,r.currency,r.store_operator_assignment_id,
              r.store_operator_assignment_version,a.partner_tenant_id,
              a.operator_legal_entity_id,b.binding_id provider_binding_id,
              b.binding_version provider_binding_version,b.vendure_seller_id,
              b.vendure_channel_id
         from crays_core.storefront_store_routes r
         join crays_core.store_operator_assignments a
           on a.assignment_id=r.store_operator_assignment_id
          and a.version=r.store_operator_assignment_version
         join crays_core.provider_scope_bindings b
           on b.assignment_id=a.assignment_id and b.assignment_version=a.version
        where r.storefront_store_route_id=$1 and r.route_version=$2
          and r.lifecycle_state='active' and a.status='active'
          and b.status='active' and b.vendure_channel_is_default=false
        for update of r`,
      [input.storefrontStoreRouteId, input.expectedRouteVersion],
    );
    if (routes.rows.length !== 1) throw new Error("CATALOG_ROUTE_STALE_OR_UNRESOLVED");
    const route = routes.rows[0];
    const prior = await query<{ reconciliation_receipt_id: string }>(
      `select reconciliation_receipt_id
         from crays_integration.catalog_reconciliation_receipts
        where storefront_store_route_id=$1 and source_snapshot_sha256=$2`,
      [route.storefront_store_route_id, snapshotSha],
    );
    if (prior.rows.length === 1) return {
      state: "no_change" as const,
      reconciliationReceiptId: prior.rows[0].reconciliation_receipt_id,
      sourceSnapshotSha256: snapshotSha,
    };
    const variantIds = variants.map(({ variant }) => variant.id);
    const sellables = variantIds.length ? await query<SellableRow>(
      `select s.sellable_assignment_id,s.sellable_assignment_version,
              s.catalog_definition_version_id,s.vendure_variant_id,
              s.price_book_version,s.tax_mapping_version,
              s.stock_projection_mapping_version,
              c.sellable_product_classification_id,c.classification_version,
              c.taxonomy_version,c.product_type,c.vertical_product_class,
              c.routing_policy_version
         from crays_core.partner_sellable_assignments s
         join crays_core.sellable_product_classifications c
           on c.sellable_assignment_id=s.sellable_assignment_id
          and c.sellable_assignment_version=s.sellable_assignment_version
          and c.lifecycle_state='active'
         join crays_core.product_type_routing_registry r
           on r.taxonomy_version=c.taxonomy_version
          and r.product_type=c.product_type and r.lifecycle_state='active'
          and r.routing_policy_version=c.routing_policy_version
          and r.ordinary_vendure_checkout_allowed=true
        where s.store_operator_assignment_id=$1
          and s.store_operator_assignment_version=$2
          and s.vendure_seller_id=$3 and s.vendure_channel_id=$4
          and s.lifecycle_state='active' and s.vendure_variant_id=any($5::text[])`,
      [route.store_operator_assignment_id, route.store_operator_assignment_version,
       route.vendure_seller_id, route.vendure_channel_id, variantIds],
    ) : { rows: [] as SellableRow[] };
    const sellableByVariant = new Map(sellables.rows.map((row) =>
      [row.vendure_variant_id, row] as const));
    const projected = variants.filter(({ variant }) => sellableByVariant.has(variant.id));
    const active = await query<{ vendure_variant_id: string }>(
      `select vendure_variant_id from crays_integration.partner_catalog_read_model
        where storefront_store_route_id=$1 and lifecycle_state='active'`,
      [route.storefront_store_route_id],
    );
    const projectedIds = new Set(projected.map(({ variant }) => variant.id));
    const withdrawn = active.rows.filter((row) => !projectedIds.has(row.vendure_variant_id));
    const receiptId = `catalog-reconcile:${randomUUID()}`;
    await query(
      `insert into crays_integration.catalog_reconciliation_receipts
        (reconciliation_receipt_id,storefront_store_route_id,route_version,
         provider_binding_id,provider_binding_version,source_snapshot_sha256,
         provider_product_count,provider_variant_count,projected_variant_count,
         withdrawn_variant_count,outcome,completed_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'applied',$11)`,
      [receiptId, route.storefront_store_route_id, route.route_version,
       route.provider_binding_id, route.provider_binding_version, snapshotSha,
       products.length, variants.length, projected.length, withdrawn.length,
       now.toISOString()],
    );
    if (withdrawn.length) await query(
      `update crays_integration.partner_catalog_read_model
          set lifecycle_state='withdrawn',updated_at=$2,reconciliation_receipt_id=$3
        where storefront_store_route_id=$1 and lifecycle_state='active'
          and not (vendure_variant_id=any($4::text[]))`,
      [route.storefront_store_route_id, now.toISOString(), receiptId,
       [...projectedIds]],
    );
    for (const { product, variant } of projected) {
      if (variant.currencyCode !== route.currency || !variant.taxRateApplied?.name) {
        throw new Error("CATALOG_PROVIDER_VARIANT_INCOMPLETE");
      }
      const sellable = sellableByVariant.get(variant.id)!;
      const providerVersion = sha({ product, variant });
      const projectionId = `catalog:${sha([
        route.storefront_store_route_id, variant.id,
      ]).slice(0, 40)}`;
      await query(
        `insert into crays_integration.partner_catalog_read_model
          (catalog_projection_id,projection_version,storefront_store_route_id,
           route_version,catalog_definition_version_id,sellable_assignment_id,
           sellable_assignment_version,provider_binding_id,
           provider_binding_version,vertical_root,partner_tenant_id,
           operator_legal_entity_id,store_id,vendure_seller_id,
           vendure_channel_id,vendure_variant_id,product_name,
           product_description,collection_slugs,facets,currency,price_minor,
           price_book_version,tax_category,tax_mapping_version,availability,
           availability_observed_at,stock_projection_version,provider_version,
           sort_key,lifecycle_state,reconciled_at,reconciliation_receipt_id,
           sellable_product_classification_id,classification_version,
           taxonomy_version,product_type,vertical_product_class,
           routing_policy_version)
         values($1,1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
                $18::jsonb,$19::jsonb,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,
                'active',$30,$31,$32,$33,$34,$35,$36,$37)
         on conflict(catalog_projection_id) do update set
           projection_version=crays_integration.partner_catalog_read_model.projection_version+1,
           route_version=excluded.route_version,
           catalog_definition_version_id=excluded.catalog_definition_version_id,
           sellable_assignment_id=excluded.sellable_assignment_id,
           sellable_assignment_version=excluded.sellable_assignment_version,
           provider_binding_id=excluded.provider_binding_id,
           provider_binding_version=excluded.provider_binding_version,
           vertical_root=excluded.vertical_root,
           partner_tenant_id=excluded.partner_tenant_id,
           operator_legal_entity_id=excluded.operator_legal_entity_id,
           store_id=excluded.store_id,
           vendure_seller_id=excluded.vendure_seller_id,
           vendure_channel_id=excluded.vendure_channel_id,
           product_name=excluded.product_name,
           product_description=excluded.product_description,
           collection_slugs=excluded.collection_slugs,facets=excluded.facets,
           currency=excluded.currency,price_minor=excluded.price_minor,
           price_book_version=excluded.price_book_version,
           tax_category=excluded.tax_category,
           tax_mapping_version=excluded.tax_mapping_version,
           availability=excluded.availability,
           availability_observed_at=excluded.availability_observed_at,
           stock_projection_version=excluded.stock_projection_version,
           sellable_product_classification_id=
             excluded.sellable_product_classification_id,
           classification_version=excluded.classification_version,
           taxonomy_version=excluded.taxonomy_version,
           product_type=excluded.product_type,
           vertical_product_class=excluded.vertical_product_class,
           routing_policy_version=excluded.routing_policy_version,
           provider_version=excluded.provider_version,sort_key=excluded.sort_key,
           lifecycle_state='active',reconciled_at=excluded.reconciled_at,
           reconciliation_receipt_id=excluded.reconciliation_receipt_id,
           updated_at=excluded.updated_at`,
        [projectionId, route.storefront_store_route_id, route.route_version,
         sellable.catalog_definition_version_id, sellable.sellable_assignment_id,
         sellable.sellable_assignment_version, route.provider_binding_id,
         route.provider_binding_version, route.vertical_root, route.partner_tenant_id,
         route.operator_legal_entity_id, route.store_id, route.vendure_seller_id,
         route.vendure_channel_id, variant.id, product.name, product.description,
         JSON.stringify(product.collections.map((item) => item.slug).sort()),
         JSON.stringify(facets(product)), route.currency, variant.priceWithTax,
         sellable.price_book_version, variant.taxRateApplied.name,
         sellable.tax_mapping_version, availability(variant.stockLevel),
         now.toISOString(), sellable.stock_projection_mapping_version,
         providerVersion, `${product.name.toLocaleLowerCase("en")}:${variant.id}`,
         now.toISOString(), receiptId,
         sellable.sellable_product_classification_id,
         sellable.classification_version,sellable.taxonomy_version,
         sellable.product_type,sellable.vertical_product_class,
         sellable.routing_policy_version],
      );
    }
    return {
      state: "applied" as const,
      reconciliationReceiptId: receiptId,
      sourceSnapshotSha256: snapshotSha,
      providerProductCount: products.length,
      providerVariantCount: variants.length,
      projectedVariantCount: projected.length,
      withdrawnVariantCount: withdrawn.length,
    };
  });
}
