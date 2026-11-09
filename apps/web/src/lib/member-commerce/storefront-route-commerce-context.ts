import "server-only";

import type { KdsDatabase, KdsQuery } from "@/store-operations/kds";
import {
  resolveServerCommerceContextSnapshot,
  type CommerceVerticalRoot,
  type ServerCommerceContext,
} from "./server-commerce-context-resolver";

const VERTICALS = new Set<CommerceVerticalRoot>(["coffee", "retail", "gym", "clubs"]);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CURRENCY = /^[A-Z]{3}$/;

type RouteRow = Readonly<{
  storefront_store_route_id: string;
  route_version: string | number;
  vertical_root: CommerceVerticalRoot;
  public_store_slug: string;
  store_id: string;
  store_version: string | number;
  store_display_name: string;
  store_timezone: string;
  assignment_version: string | number;
  partner_tenant_id: string;
  operator_legal_entity_id: string;
  seller_display_name: string;
  seller_legal_name: string;
  binding_version: string | number;
  vendure_seller_id: string;
  vendure_channel_id: string;
  currency: string;
}>;

export type StorefrontRouteCommerceContext = Readonly<{
  routeId: string;
  routeVersion: number;
  storeSlug: string;
  currency: string;
  context: ServerCommerceContext;
  store: Readonly<{
    displayName: string;
    timezone: string;
    version: number;
  }>;
  seller: Readonly<{
    displayName: string;
    legalName: string;
  }>;
  assignmentVersion: number;
  bindingVersion: number;
}>;

function validateInput(
  input: Readonly<{ verticalRoot: CommerceVerticalRoot; storeSlug: string }>,
) {
  if (!VERTICALS.has(input.verticalRoot) ||
      typeof input.storeSlug !== "string" ||
      !SLUG.test(input.storeSlug)) {
    throw new Error("STOREFRONT_ROUTE_CONTEXT_INPUT_INVALID");
  }
}

export async function resolveStorefrontRouteCommerceContextSnapshot(
  query: KdsQuery,
  input: Readonly<{ verticalRoot: CommerceVerticalRoot; storeSlug: string }>,
  authorityNow: Date,
): Promise<StorefrontRouteCommerceContext> {
  validateInput(input);
  if (!Number.isFinite(authorityNow.getTime())) {
    throw new Error("STOREFRONT_ROUTE_CONTEXT_CLOCK_INVALID");
  }
  const result = await query<RouteRow>(
    `select r.storefront_store_route_id,r.route_version,r.vertical_root,
            r.public_store_slug,r.store_id,s.version store_version,
            s.display_name store_display_name,s.timezone store_timezone,
            a.version assignment_version,
            a.partner_tenant_id,a.operator_legal_entity_id,
            t.display_name seller_display_name,l.legal_name seller_legal_name,
            b.binding_version,b.vendure_seller_id,b.vendure_channel_id,r.currency
       from crays_core.storefront_store_routes r
       join crays_core.stores s on s.store_id=r.store_id
       join crays_core.store_operator_assignments a
         on a.assignment_id=r.store_operator_assignment_id
        and a.version=r.store_operator_assignment_version
       join crays_core.franchise_operator_tenants t
         on t.partner_tenant_id=a.partner_tenant_id
       join crays_core.operator_legal_entities l
         on l.legal_entity_id=a.operator_legal_entity_id
       join crays_core.provider_scope_bindings b
         on b.assignment_id=a.assignment_id
        and b.assignment_version=a.version
      where r.vertical_root=$1 and r.public_store_slug=$2
        and r.lifecycle_state='active' and s.status='active'
        and t.status='active' and l.status='active' and a.status='active'
        and a.valid_from<=$3
        and (a.valid_until is null or a.valid_until>$3)
        and b.status='active' and b.vendure_channel_is_default=false`,
    [input.verticalRoot, input.storeSlug, authorityNow.toISOString()],
  );
  if (result.rows.length !== 1) {
    throw new Error(result.rows.length === 0
      ? "STOREFRONT_ROUTE_CONTEXT_NOT_FOUND"
      : "STOREFRONT_ROUTE_CONTEXT_AMBIGUOUS");
  }
  const route = result.rows[0];
  const routeVersion = Number(route.route_version);
  const storeVersion = Number(route.store_version);
  const assignmentVersion = Number(route.assignment_version);
  const bindingVersion = Number(route.binding_version);
  if (!Number.isSafeInteger(routeVersion) || routeVersion < 1 ||
      !Number.isSafeInteger(storeVersion) || storeVersion < 1 ||
      !Number.isSafeInteger(assignmentVersion) || assignmentVersion < 1 ||
      !Number.isSafeInteger(bindingVersion) || bindingVersion < 1 ||
      route.vertical_root !== input.verticalRoot ||
      route.public_store_slug !== input.storeSlug ||
      typeof route.store_display_name !== "string" ||
      !route.store_display_name.trim() ||
      typeof route.store_timezone !== "string" || !route.store_timezone.trim() ||
      typeof route.seller_display_name !== "string" ||
      !route.seller_display_name.trim() ||
      typeof route.seller_legal_name !== "string" ||
      !route.seller_legal_name.trim() ||
      typeof route.currency !== "string" || !CURRENCY.test(route.currency)) {
    throw new Error("STOREFRONT_ROUTE_CONTEXT_CORRUPT");
  }
  const context = await resolveServerCommerceContextSnapshot(
    query,
    {
      verticalRoot: input.verticalRoot,
      storeId: route.store_id,
      expectedAssignmentVersion: assignmentVersion,
    },
    authorityNow,
  );
  if (context.partnerTenantId !== route.partner_tenant_id ||
      context.operatorLegalEntityId !== route.operator_legal_entity_id ||
      context.vendure.sellerId !== route.vendure_seller_id ||
      context.vendure.channelId !== route.vendure_channel_id) {
    throw new Error("STOREFRONT_ROUTE_CONTEXT_SCOPE_MISMATCH");
  }
  return Object.freeze({
    routeId: route.storefront_store_route_id,
    routeVersion,
    storeSlug: route.public_store_slug,
    currency: route.currency,
    context,
    store: Object.freeze({
      displayName: route.store_display_name.trim(),
      timezone: route.store_timezone.trim(),
      version: storeVersion,
    }),
    seller: Object.freeze({
      displayName: route.seller_display_name.trim(),
      legalName: route.seller_legal_name.trim(),
    }),
    assignmentVersion,
    bindingVersion,
  });
}

export async function resolveStorefrontRouteCommerceContext(
  database: KdsDatabase,
  input: Readonly<{ verticalRoot: CommerceVerticalRoot; storeSlug: string }>,
): Promise<StorefrontRouteCommerceContext> {
  validateInput(input);
  return database.transaction(async ({ query }) => {
    await query("set transaction isolation level repeatable read read only");
    await query("select set_config('crays.app_role','core_service',true)");
    const clock = await query<{ authority_now: string | Date }>(
      "select transaction_timestamp() authority_now",
    );
    const authorityNow = new Date(clock.rows[0]?.authority_now ?? "");
    return resolveStorefrontRouteCommerceContextSnapshot(
      query,
      input,
      authorityNow,
    );
  });
}
