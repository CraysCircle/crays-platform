import "server-only";

import type { KdsDatabase } from "@/store-operations/kds";
import {
  resolveServerCommerceContextSnapshot,
  type CommerceVerticalRoot,
  type ServerCommerceContext,
} from "./server-commerce-context-resolver";

const CORE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const VENDURE_PROVIDER_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const PURPOSES = ["account", "order", "support", "loyalty", "marketing"] as const;

export type CommerceCustomerPurpose = (typeof PURPOSES)[number];
export type CustomerProjectionUse = "active_session" | "historical_order_recovery";

type ProjectionRow = {
  canonical_person_id: string;
  commerce_customer_relationship_id: string;
  relationship_version: string | number;
  vendure_customer_projection_id: string;
  projection_version: string | number;
  provider_version: string;
  lifecycle_state: string;
  vendure_customer_id: string;
  vendure_user_id: string;
  last_reconciled_at: string | Date | null;
};

export type CanonicalVendureCustomerProjection = Readonly<{
  authorityNow: string;
  use: CustomerProjectionUse;
  purpose: CommerceCustomerPurpose;
  canonicalPersonId: string;
  commerceCustomerRelationshipId: string;
  relationshipVersion: number;
  vendureCustomerProjectionId: string;
  projectionVersion: number;
  providerVersion: string;
  projectionLifecycleState: "active" | "disabled" | "superseded" | "anonymized";
  vendureCustomerId: string;
  vendureUserId: string;
  lastReconciledAt: string;
  context: ServerCommerceContext;
}>;

export class CustomerProjectionAuthorityError extends Error {
  constructor(readonly code:
    | "CUSTOMER_PROJECTION_INPUT_INVALID"
    | "CUSTOMER_PROJECTION_NOT_ACTIVE"
    | "CUSTOMER_PROJECTION_AMBIGUOUS"
    | "CUSTOMER_PROJECTION_STALE"
    | "CUSTOMER_PROJECTION_INCOMPLETE") {
    super(code);
    this.name = "CustomerProjectionAuthorityError";
  }
}

const CUSTOMER_PROJECTION_AUTHORITY_CODES = new Set([
  "CUSTOMER_PROJECTION_INPUT_INVALID",
  "CUSTOMER_PROJECTION_NOT_ACTIVE",
  "CUSTOMER_PROJECTION_AMBIGUOUS",
  "CUSTOMER_PROJECTION_STALE",
  "CUSTOMER_PROJECTION_INCOMPLETE",
]);

export function isCustomerProjectionAuthorityError(
  error: unknown,
  expectedCode?: CustomerProjectionAuthorityError["code"],
): error is CustomerProjectionAuthorityError {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: unknown; code?: unknown; message?: unknown };
  return candidate.name === "CustomerProjectionAuthorityError" &&
    typeof candidate.code === "string" &&
    CUSTOMER_PROJECTION_AUTHORITY_CODES.has(candidate.code) &&
    candidate.message === candidate.code &&
    (expectedCode === undefined || candidate.code === expectedCode);
}

function exactId(value: unknown): string {
  if (typeof value !== "string" || !CORE_ID.test(value.trim())) {
    throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_INCOMPLETE");
  }
  return value.trim();
}

function exactVendureProviderId(value: unknown): string {
  if (typeof value !== "string" || !VENDURE_PROVIDER_ID.test(value.trim())) {
    throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_INCOMPLETE");
  }
  return value.trim();
}

function exactVersion(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_INCOMPLETE");
  }
  return parsed;
}

function exactTimestamp(value: string | Date | null, authorityNow: Date): string {
  if (value === null) {
    throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_INCOMPLETE");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed > authorityNow) {
    throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_INCOMPLETE");
  }
  return parsed.toISOString();
}

function freezeContext(context: ServerCommerceContext): ServerCommerceContext {
  return Object.freeze({
    ...context,
    vendure: Object.freeze({
      ...context.vendure,
      stockLocationIds: Object.freeze([...context.vendure.stockLocationIds]),
    }),
    stripe: Object.freeze({ ...context.stripe }),
    erp: Object.freeze({
      ...context.erp,
      warehouseIds: Object.freeze([...context.erp.warehouseIds]),
    }),
    nextcloud: Object.freeze({
      ...context.nextcloud,
      teamFolderIds: Object.freeze([...context.nextcloud.teamFolderIds]),
    }),
  });
}

function validateInput(input: Readonly<{
  canonicalPersonId?: string;
  canonicalAccountId?: string;
  purpose: CommerceCustomerPurpose;
  use: CustomerProjectionUse;
  expectedProjectionVersion?: number;
}>) {
  if (
    ((input.canonicalPersonId ? 1 : 0) + (input.canonicalAccountId ? 1 : 0)) !== 1 ||
    (input.canonicalPersonId !== undefined && !CORE_ID.test(input.canonicalPersonId.trim())) ||
    (input.canonicalAccountId !== undefined && !CORE_ID.test(input.canonicalAccountId.trim())) ||
    !PURPOSES.includes(input.purpose) ||
    !["active_session", "historical_order_recovery"].includes(input.use) ||
    (input.use === "historical_order_recovery" && input.purpose !== "order") ||
    (input.expectedProjectionVersion !== undefined &&
      (!Number.isSafeInteger(input.expectedProjectionVersion) ||
        input.expectedProjectionVersion < 1))
  ) {
    throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_INPUT_INVALID");
  }
}

export async function loadCanonicalVendureCustomerProjection(
  database: KdsDatabase,
  input: Readonly<{
    canonicalPersonId?: string;
    canonicalAccountId?: string;
    verticalRoot: CommerceVerticalRoot;
    storeId: string;
    purpose: CommerceCustomerPurpose;
    use: CustomerProjectionUse;
    expectedAssignmentVersion?: number;
    expectedProjectionVersion?: number;
  }>,
): Promise<CanonicalVendureCustomerProjection> {
  validateInput(input);
  return database.transaction(async ({ query }) => {
    await query("set transaction isolation level repeatable read read only");
    await query("select set_config('crays.app_role','core_service',true)");
    const clock = await query<{ authority_now: string | Date }>(
      "select transaction_timestamp() authority_now",
    );
    const authorityNow = new Date(clock.rows[0]?.authority_now);
    if (Number.isNaN(authorityNow.getTime())) {
      throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_INCOMPLETE");
    }
    const context = await resolveServerCommerceContextSnapshot(query, {
      verticalRoot: input.verticalRoot,
      storeId: input.storeId,
      ...(input.expectedAssignmentVersion === undefined
        ? {}
        : { expectedAssignmentVersion: input.expectedAssignmentVersion }),
    }, authorityNow);
    const result = await query<ProjectionRow>(
      `select person.canonical_person_id,
              r.commerce_customer_relationship_id,r.relationship_version,
              p.vendure_customer_projection_id,p.projection_version,
              p.provider_version,p.lifecycle_state,p.vendure_customer_id,
              p.vendure_user_id,p.last_reconciled_at
         from crays_core.canonical_people person
         join crays_core.commerce_customer_relationships r
           on r.canonical_person_id=person.canonical_person_id
         join crays_core.vendure_customer_projections p
           on p.commerce_customer_relationship_id=
              r.commerce_customer_relationship_id
          and p.relationship_version=r.relationship_version
          and p.canonical_person_id=r.canonical_person_id
          and p.vertical_root=r.vertical_root
          and p.partner_tenant_id=r.partner_tenant_id
          and p.operator_legal_entity_id=r.operator_legal_entity_id
        where (($11='person' and person.canonical_person_id=$1)
            or ($11='account' and person.account_id=$1))
          and person.lifecycle_state='active'
          and r.vertical_root=$2 and r.partner_tenant_id=$3
          and r.operator_legal_entity_id=$4
          and r.lifecycle_state='active'
          and r.effective_from <= $5
          and (r.effective_until is null or r.effective_until > $5)
          and r.purposes @> jsonb_build_array($6::text)
          and p.vendure_deployment_cell_id=$7
          and p.provider_binding_id=$8
          and p.provider_binding_version=$9
          and (($10='active_session' and p.lifecycle_state='active')
            or ($10='historical_order_recovery' and
                p.lifecycle_state in ('active','disabled','superseded','anonymized')))`,
      [
        (input.canonicalPersonId ?? input.canonicalAccountId ?? "").trim(),
        context.verticalRoot,
        context.partnerTenantId,
        context.operatorLegalEntityId,
        authorityNow.toISOString(),
        input.purpose,
        context.vendure.deploymentCellId,
        context.providerBindingId,
        context.providerBindingVersion,
        input.use,
        input.canonicalPersonId ? "person" : "account",
      ],
    );
    if (result.rows.length === 0) {
      throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_NOT_ACTIVE");
    }
    if (result.rows.length !== 1) {
      throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_AMBIGUOUS");
    }
    const row = result.rows[0];
    const projectionVersion = exactVersion(row.projection_version);
    if (
      input.expectedProjectionVersion !== undefined &&
      projectionVersion !== input.expectedProjectionVersion
    ) {
      throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_STALE");
    }
    if (
      !["active", "disabled", "superseded", "anonymized"].includes(
        row.lifecycle_state,
      ) ||
      !row.provider_version.trim()
    ) {
      throw new CustomerProjectionAuthorityError("CUSTOMER_PROJECTION_INCOMPLETE");
    }
    return Object.freeze({
      authorityNow: authorityNow.toISOString(),
      use: input.use,
      purpose: input.purpose,
      canonicalPersonId: exactId(row.canonical_person_id),
      commerceCustomerRelationshipId: exactId(
        row.commerce_customer_relationship_id,
      ),
      relationshipVersion: exactVersion(row.relationship_version),
      vendureCustomerProjectionId: exactId(
        row.vendure_customer_projection_id,
      ),
      projectionVersion,
      providerVersion: row.provider_version.trim(),
      projectionLifecycleState: row.lifecycle_state as
        CanonicalVendureCustomerProjection["projectionLifecycleState"],
      vendureCustomerId: exactVendureProviderId(row.vendure_customer_id),
      vendureUserId: exactVendureProviderId(row.vendure_user_id),
      lastReconciledAt: exactTimestamp(row.last_reconciled_at, authorityNow),
      context: freezeContext(context),
    });
  });
}
