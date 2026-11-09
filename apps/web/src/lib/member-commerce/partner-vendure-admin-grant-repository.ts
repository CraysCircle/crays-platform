import "server-only";

import type { KdsDatabase, KdsQuery } from "@/store-operations/kds";
import type { RoleKey } from "@/lib/roles";
import { isCommerceRoleVerticalAuthorized } from
  "./commerce-role-vertical-authority";
import type { CommerceRoleGrant, PartnerCommerceRole } from
  "./partner-vendure-admin-authorization";
import {
  resolveServerCommerceContextSnapshot,
  type CommerceVerticalRoot,
  type ServerCommerceContext,
} from "./server-commerce-context-resolver";

const PURPOSE = "vendure_admin_authorization";
const ADMITTED_POLICY_VERSION = "vendure-admin-v1";
const ROLE_CAPABILITY_PREFIX = "vendure.admin.role.";
const CORE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const COMMERCE_VERTICALS: readonly CommerceVerticalRoot[] = [
  "coffee",
  "retail",
  "gym",
  "clubs",
];
const ADMITTED_CANONICAL_ROLES: readonly RoleKey[] = [
  "franchise-partner",
  "studio-manager",
  "finance",
];

type RoleCapability =
  | "vendure.admin.role.partner-owner"
  | "vendure.admin.role.store-manager"
  | "vendure.admin.role.catalog-manager"
  | "vendure.admin.role.inventory-operator"
  | "vendure.admin.role.fulfillment-operator"
  | "vendure.admin.role.partner-finance"
  | "vendure.admin.role.refund-approver";

const roleCapabilities: Readonly<Record<RoleCapability, Readonly<{
  canonicalRole: RoleKey;
  commerceRole: PartnerCommerceRole;
  exactStoreRequired: boolean;
}>>> = {
  "vendure.admin.role.partner-owner": {
    canonicalRole: "franchise-partner",
    commerceRole: "partner_owner",
    exactStoreRequired: false,
  },
  "vendure.admin.role.store-manager": {
    canonicalRole: "studio-manager",
    commerceRole: "store_manager",
    exactStoreRequired: true,
  },
  "vendure.admin.role.catalog-manager": {
    canonicalRole: "studio-manager",
    commerceRole: "catalog_manager",
    exactStoreRequired: true,
  },
  "vendure.admin.role.inventory-operator": {
    canonicalRole: "studio-manager",
    commerceRole: "inventory_operator",
    exactStoreRequired: true,
  },
  "vendure.admin.role.fulfillment-operator": {
    canonicalRole: "studio-manager",
    commerceRole: "fulfillment_operator",
    exactStoreRequired: true,
  },
  "vendure.admin.role.partner-finance": {
    canonicalRole: "finance",
    commerceRole: "partner_finance",
    exactStoreRequired: false,
  },
  "vendure.admin.role.refund-approver": {
    canonicalRole: "finance",
    commerceRole: "refund_approver",
    exactStoreRequired: false,
  },
};

type GrantRow = {
  role_context_id: string;
  context_version: string | number;
  role_assignment_id: string;
  relationship_id: string;
  role_key: string;
  store_id: string | null;
  capabilities: unknown;
  valid_from: string | Date;
  valid_until: string | Date | null;
  policy_version: string;
};

export class CommerceGrantLoadingError extends Error {
  constructor(readonly code:
    | "COMMERCE_GRANT_INPUT_INVALID"
    | "COMMERCE_GRANT_NOT_ACTIVE"
    | "COMMERCE_GRANT_AMBIGUOUS"
    | "COMMERCE_GRANT_INCOMPLETE") {
    super(code);
    this.name = "CommerceGrantLoadingError";
  }
}

const COMMERCE_GRANT_LOADING_CODES = new Set([
  "COMMERCE_GRANT_INPUT_INVALID",
  "COMMERCE_GRANT_NOT_ACTIVE",
  "COMMERCE_GRANT_AMBIGUOUS",
  "COMMERCE_GRANT_INCOMPLETE",
]);

export function isCommerceGrantLoadingError(
  error: unknown,
): error is CommerceGrantLoadingError {
  if (!(error instanceof Error) || error.name !== "CommerceGrantLoadingError") {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" &&
    COMMERCE_GRANT_LOADING_CODES.has(code) &&
    error.message === code;
}

function exactCapabilities(value: unknown): string[] {
  let parsed: unknown;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) as unknown : value;
  } catch {
    throw new CommerceGrantLoadingError("COMMERCE_GRANT_INCOMPLETE");
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length < 1 ||
    parsed.some((item) =>
      typeof item !== "string" || item.trim() !== item || item.length < 3) ||
    new Set(parsed).size !== parsed.length
  ) {
    throw new CommerceGrantLoadingError("COMMERCE_GRANT_INCOMPLETE");
  }
  return parsed as string[];
}

function exactDate(value: string | Date): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new CommerceGrantLoadingError("COMMERCE_GRANT_INCOMPLETE");
  }
  return parsed.toISOString();
}

function grantFromRow(
  row: GrantRow,
  context: ServerCommerceContext,
): CommerceRoleGrant {
  const capabilities = exactCapabilities(row.capabilities);
  const markers = capabilities.filter((capability) =>
    capability.startsWith(ROLE_CAPABILITY_PREFIX));
  if (markers.length !== 1 || capabilities.length !== 1) {
    throw new CommerceGrantLoadingError("COMMERCE_GRANT_INCOMPLETE");
  }
  const specification = roleCapabilities[markers[0] as RoleCapability];
  if (!specification || row.role_key !== specification.canonicalRole) {
    throw new CommerceGrantLoadingError("COMMERCE_GRANT_INCOMPLETE");
  }
  if (
    specification.exactStoreRequired && row.store_id !== context.storeId
  ) {
    throw new CommerceGrantLoadingError("COMMERCE_GRANT_INCOMPLETE");
  }
  if (!row.role_context_id.trim() || !row.policy_version.trim()) {
    throw new CommerceGrantLoadingError("COMMERCE_GRANT_INCOMPLETE");
  }
  const contextVersion = Number(row.context_version);
  if (
    !Number.isSafeInteger(contextVersion) || contextVersion < 1 ||
    row.policy_version.trim() !== ADMITTED_POLICY_VERSION
  ) {
    throw new CommerceGrantLoadingError("COMMERCE_GRANT_INCOMPLETE");
  }
  return {
    grantId: row.role_context_id,
    contextVersion,
    roleAssignmentId: exactCoreId(row.role_assignment_id),
    relationshipId: exactCoreId(row.relationship_id),
    role: specification.commerceRole,
    partnerTenantId: context.partnerTenantId,
    operatorLegalEntityId: context.operatorLegalEntityId,
    storeIds: [context.storeId],
    validFrom: exactDate(row.valid_from),
    ...(row.valid_until === null
      ? {}
      : { validUntil: exactDate(row.valid_until) }),
    status: "active",
    policyVersion: row.policy_version.trim(),
  };
}

function exactCoreId(value: unknown): string {
  if (typeof value !== "string" || value.trim() !== value || !CORE_ID.test(value)) {
    throw new CommerceGrantLoadingError("COMMERCE_GRANT_INCOMPLETE");
  }
  return value;
}

export type PartnerVendureAdminGrantSnapshot = Readonly<{
  authorityNow: string;
  context: ServerCommerceContext;
  grants: readonly CommerceRoleGrant[];
}>;

export type PartnerVendureAdminGrantInput = Readonly<{
  accountId: string;
  organizationId: string;
  effectiveRole: RoleKey;
  verticalRoot: CommerceVerticalRoot;
  storeId: string;
  expectedAssignmentVersion?: number;
}>;

function freezeContext(
  context: ServerCommerceContext,
): ServerCommerceContext {
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

function validateGrantInput(input: PartnerVendureAdminGrantInput) {
  if (
    typeof input.accountId !== "string" ||
    typeof input.organizationId !== "string" ||
    typeof input.storeId !== "string" ||
    !CORE_ID.test(input.accountId.trim()) ||
    !CORE_ID.test(input.organizationId.trim()) ||
    !CORE_ID.test(input.storeId.trim()) ||
    !COMMERCE_VERTICALS.includes(input.verticalRoot) ||
    !ADMITTED_CANONICAL_ROLES.includes(input.effectiveRole) ||
    !isCommerceRoleVerticalAuthorized(
      input.effectiveRole, input.verticalRoot) ||
    (input.expectedAssignmentVersion !== undefined &&
      (!Number.isSafeInteger(input.expectedAssignmentVersion) ||
        input.expectedAssignmentVersion < 1))
  ) {
    throw new CommerceGrantLoadingError("COMMERCE_GRANT_INPUT_INVALID");
  }
}

/**
 * Load the effective grant and Commerce provider scope through a query that is
 * already inside the caller's authoritative transaction. Command paths must
 * use this composition point before their own command/receipt/outbox insert.
 */
export async function loadPartnerVendureAdminGrantSnapshot(
  query: KdsQuery,
  input: PartnerVendureAdminGrantInput,
  authorityNow: Date,
): Promise<PartnerVendureAdminGrantSnapshot> {
  validateGrantInput(input);
  if (Number.isNaN(authorityNow.getTime())) {
    throw new CommerceGrantLoadingError("COMMERCE_GRANT_INCOMPLETE");
  }
  const context = freezeContext(await resolveServerCommerceContextSnapshot(
    query,
    {
      verticalRoot: input.verticalRoot,
      storeId: input.storeId,
      ...(input.expectedAssignmentVersion === undefined
        ? {}
        : { expectedAssignmentVersion: input.expectedAssignmentVersion }),
    },
    authorityNow,
  ));
  const result = await query<GrantRow>(
      `select c.role_context_id,c.context_version,c.role_assignment_id,
              c.relationship_id,c.role_key,c.store_id,
              c.capabilities,
              c.valid_from,c.valid_until,c.policy_version
         from crays_core.partner_role_contexts c
         join crays_core.crays_accounts account
           on account.account_id=c.account_id and account.status='active'
         join crays_core.organizations organization
           on organization.organization_id=c.organization_id
          and organization.status='active'
         join crays_core.role_assignments r
           on r.assignment_id=c.role_assignment_id
          and r.account_id=c.account_id and r.role_key=c.role_key
          and r.organization_id=c.organization_id and r.status='active'
         join crays_core.organization_memberships m
           on m.account_id=c.account_id
          and m.organization_id=c.organization_id
          and m.role_key=c.role_key and m.status='active'
         join crays_core.franchise_operator_tenants p
           on p.partner_tenant_id=c.partner_tenant_id
          and p.organization_id=c.organization_id and p.status='active'
         join crays_core.operator_legal_entities l
           on l.legal_entity_id=c.operator_legal_entity_id
          and l.partner_tenant_id=c.partner_tenant_id and l.status='active'
         join crays_core.store_operator_assignments a
           on a.assignment_id=$6 and a.store_id=$5 and a.vertical_root=$2
          and a.partner_tenant_id=$3 and a.operator_legal_entity_id=$4
          and a.version=$7 and a.status='active'
          and a.valid_from <= $8
          and (a.valid_until is null or a.valid_until > $8)
        where c.account_id=$1 and c.vertical_root=$2
          and c.partner_tenant_id=$3 and c.operator_legal_entity_id=$4
          and (c.store_id is null or c.store_id=$5)
          and (c.store_operator_assignment_id is null
               or (c.store_operator_assignment_id=$6
                   and c.store_operator_assignment_version=$7))
        and c.purpose=$9 and c.status='active'
          and c.organization_id=$10 and c.role_key=$11
          and c.valid_from <= $8
          and (c.valid_until is null or c.valid_until > $8)`,
      [
        input.accountId.trim(),
        context.verticalRoot,
        context.partnerTenantId,
        context.operatorLegalEntityId,
        context.storeId,
        context.storeOperatorAssignmentId,
        context.storeOperatorAssignmentVersion,
        authorityNow.toISOString(),
        PURPOSE,
        input.organizationId.trim(),
        input.effectiveRole,
      ],
  );
  if (result.rows.length === 0) {
    throw new CommerceGrantLoadingError("COMMERCE_GRANT_NOT_ACTIVE");
  }
  if (result.rows.length !== 1) {
    throw new CommerceGrantLoadingError("COMMERCE_GRANT_AMBIGUOUS");
  }
  const grants = Object.freeze([grantFromRow(result.rows[0], context)]);
  return Object.freeze({
    authorityNow: authorityNow.toISOString(),
    context,
    grants,
  });
}

export async function loadPartnerVendureAdminGrants(
  database: KdsDatabase,
  input: PartnerVendureAdminGrantInput,
): Promise<PartnerVendureAdminGrantSnapshot> {
  validateGrantInput(input);
  return database.transaction(async ({ query }) => {
    await query("set transaction isolation level repeatable read read only");
    await query("select set_config('crays.app_role','core_service',true)");
    const clock = await query<{ authority_now: string | Date }>(
      "select transaction_timestamp() authority_now",
    );
    const authorityNow = new Date(clock.rows[0]?.authority_now);
    return loadPartnerVendureAdminGrantSnapshot(query, input, authorityNow);
  });
}
