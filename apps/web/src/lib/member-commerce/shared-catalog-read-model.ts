import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { KdsDatabase } from "@/store-operations/kds";
import {
  createCatalogPage,
  parseCatalogBrowserQuery,
  type CatalogBrowserQuery,
  type CatalogServerContext,
  type CatalogSourceRow,
} from "./shared-catalog-contract";
import type { CommerceVerticalRoot } from "./server-commerce-context-resolver";
import { resolveStorefrontRouteCommerceContextSnapshot } from
  "./storefront-route-commerce-context";

type ProjectionRow = {
  catalog_projection_id: string;
  catalog_definition_version_id: string;
  sellable_assignment_id: string;
  sellable_assignment_version: string | number;
  partner_tenant_id: string;
  operator_legal_entity_id: string;
  store_id: string;
  vendure_seller_id: string;
  vendure_channel_id: string;
  vendure_variant_id: string;
  product_name: string;
  product_description: string;
  collection_slugs: unknown;
  facets: unknown;
  currency: string;
  price_minor: string | number;
  price_book_version: string;
  tax_category: string;
  tax_mapping_version: string;
  availability: CatalogSourceRow["availability"];
  availability_observed_at: string | Date;
  stock_projection_version: string;
  sort_key: string;
};

type CursorPayload = Readonly<{
  routeId: string;
  routeVersion: number;
  sortKey: string;
  projectionId: string;
}>;

function signature(secret: string, payload: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

function encodeCursor(secret: string, value: CursorPayload): string {
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${payload}.${signature(secret, payload).toString("base64url")}`;
}

function decodeCursor(secret: string, cursor: string): CursorPayload {
  const [payload, supplied, extra] = cursor.split(".");
  if (!payload || !supplied || extra) throw new Error("CATALOG_CURSOR_INVALID");
  const expected = signature(secret, payload);
  let actual: Buffer;
  try { actual = Buffer.from(supplied, "base64url"); } catch {
    throw new Error("CATALOG_CURSOR_INVALID");
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("CATALOG_CURSOR_INVALID");
  }
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); }
  catch { throw new Error("CATALOG_CURSOR_INVALID"); }
  const value = parsed as Partial<CursorPayload>;
  if (!value || typeof value.routeId !== "string" ||
    !Number.isSafeInteger(value.routeVersion) ||
    typeof value.sortKey !== "string" ||
    typeof value.projectionId !== "string") {
    throw new Error("CATALOG_CURSOR_INVALID");
  }
  return value as CursorPayload;
}

function json<T>(value: unknown, guard: (value: unknown) => value is T): T {
  const parsed = typeof value === "string" ? JSON.parse(value) as unknown : value;
  if (!guard(parsed)) throw new Error("CATALOG_READ_MODEL_INVALID");
  return parsed;
}

const stringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const facetObject = (value: unknown): value is Record<string, readonly string[]> =>
  !!value && typeof value === "object" && !Array.isArray(value) &&
  Object.values(value).every(stringArray);

function sourceRow(row: ProjectionRow): CatalogSourceRow {
  const price = Number(row.price_minor);
  const version = Number(row.sellable_assignment_version);
  if (
    !Number.isSafeInteger(price) || !Number.isSafeInteger(version) ||
    !["available", "low", "unavailable", "unknown"].includes(
      row.availability,
    )
  ) {
    throw new Error("CATALOG_READ_MODEL_INVALID");
  }
  return {
    catalogDefinitionVersionId: row.catalog_definition_version_id,
    sellableAssignmentId: row.sellable_assignment_id,
    sellableAssignmentVersion: version,
    partnerTenantId: row.partner_tenant_id,
    operatorLegalEntityId: row.operator_legal_entity_id,
    storeId: row.store_id,
    vendureSellerId: row.vendure_seller_id,
    vendureChannelId: row.vendure_channel_id,
    productVariantReference: row.vendure_variant_id,
    name: row.product_name,
    description: row.product_description,
    collectionSlugs: json(row.collection_slugs, stringArray),
    facets: json(row.facets, facetObject),
    currency: row.currency,
    priceMinor: price,
    priceBookVersion: row.price_book_version,
    taxCategory: row.tax_category,
    taxMappingVersion: row.tax_mapping_version,
    availability: row.availability,
    availabilityObservedAt: new Date(row.availability_observed_at).toISOString(),
    stockProjectionVersion: row.stock_projection_version,
  };
}

export async function readSharedCatalog(
  database: KdsDatabase,
  input: Readonly<{
    verticalRoot: CommerceVerticalRoot;
    browserQuery: Readonly<Record<string, unknown>>;
    cursorSecret: string;
  }>,
) {
  if (Buffer.byteLength(input.cursorSecret, "utf8") < 32) {
    throw new Error("CATALOG_CURSOR_SECRET_INVALID");
  }
  const query = parseCatalogBrowserQuery(input.browserQuery);
  return database.transaction(async ({ query: sql }) => {
    await sql("set transaction isolation level repeatable read read only");
    await sql("select set_config('crays.app_role','core_service',true)");
    const clock = await sql<{ authority_now: string | Date }>(
      "select transaction_timestamp() authority_now",
    );
    const authorityNow = new Date(clock.rows[0]?.authority_now ?? "");
    const route = await resolveStorefrontRouteCommerceContextSnapshot(
      sql,
      { verticalRoot: input.verticalRoot, storeSlug: query.storeSlug },
      authorityNow,
    );
    let cursor: CursorPayload | null = null;
    if (query.cursor) {
      cursor = decodeCursor(input.cursorSecret, query.cursor);
      if (cursor.routeId !== route.routeId ||
        cursor.routeVersion !== route.routeVersion) {
        throw new Error("CATALOG_CURSOR_SCOPE_MISMATCH");
      }
    }
    const rows = await sql<ProjectionRow>(
      `select catalog_projection_id,catalog_definition_version_id,
              sellable_assignment_id,sellable_assignment_version,
              partner_tenant_id,operator_legal_entity_id,store_id,
              vendure_seller_id,vendure_channel_id,vendure_variant_id,
              product_name,product_description,collection_slugs,facets,
              currency,price_minor,price_book_version,tax_category,
              tax_mapping_version,availability,availability_observed_at,
              stock_projection_version,sort_key
         from crays_integration.partner_catalog_read_model
        where storefront_store_route_id=$1 and route_version=$2
          and lifecycle_state='active'
          and ($3::text is null or product_name ilike '%'||$3||'%'
               or product_description ilike '%'||$3||'%')
          and ($4::text is null or collection_slugs @> jsonb_build_array($4))
          and ($5::jsonb is null or facets @> $5::jsonb)
          and ($6::text is null or (sort_key,catalog_projection_id) > ($6,$7))
        order by sort_key,catalog_projection_id limit $8`,
      [route.routeId, route.routeVersion, query.search ?? null,
       query.collection ?? null, query.facets ? JSON.stringify(query.facets) : null,
       cursor?.sortKey ?? null, cursor?.projectionId ?? null, query.take + 1],
    );
    const pageRows = rows.rows.slice(0, query.take);
    const last = pageRows.at(-1);
    const nextCursor = rows.rows.length > query.take && last ? encodeCursor(
      input.cursorSecret,
      { routeId: route.routeId, routeVersion: route.routeVersion,
        sortKey: last.sort_key, projectionId: last.catalog_projection_id },
    ) : null;
    const context: CatalogServerContext = {
      verticalRoot: route.context.verticalRoot,
      partnerTenantId: route.context.partnerTenantId,
      operatorLegalEntityId: route.context.operatorLegalEntityId,
      storeId: route.context.storeId,
      vendureSellerId: route.context.vendure.sellerId,
      vendureChannelId: route.context.vendure.channelId,
      currency: route.currency,
      storeDisplayName: route.store.displayName,
      sellerDisplayName: route.seller.displayName,
      sellerLegalName: route.seller.legalName,
      storeSnapshotVersion:
        `store:${route.store.version}:assignment:${route.assignmentVersion}:binding:${route.bindingVersion}:route:${route.routeVersion}`,
      storeSnapshotSha256: createHash("sha256").update(JSON.stringify({
        verticalRoot: route.context.verticalRoot,
        storeId: route.context.storeId,
        storeDisplayName: route.store.displayName,
        sellerDisplayName: route.seller.displayName,
        sellerLegalName: route.seller.legalName,
        currency: route.currency,
        storeVersion: route.store.version,
        assignmentVersion: route.assignmentVersion,
        bindingVersion: route.bindingVersion,
        routeVersion: route.routeVersion,
      })).digest("hex"),
    };
    return {
      ...createCatalogPage(context, pageRows.map(sourceRow), nextCursor),
      query: query as CatalogBrowserQuery,
      routeVersion: route.routeVersion,
    };
  });
}
