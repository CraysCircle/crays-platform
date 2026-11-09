import "server-only";

import { createHash } from "node:crypto";

import type { KdsDatabase, KdsQuery } from "@/store-operations/kds";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const PROVIDER_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const VERTICALS = ["coffee", "retail", "gym", "clubs"] as const;

export type CommerceVerticalRoot = (typeof VERTICALS)[number];

type ResolutionRow = {
  vertical_root: string;
  store_id: string;
  store_version: string | number;
  assignment_id: string;
  assignment_version: string | number;
  partner_tenant_id: string;
  operator_legal_entity_id: string;
  legal_name: string;
  tax_registration_ref: string | null;
  binding_id: string;
  binding_version: string | number;
  vendure_deployment_cell_id: string;
  vendure_seller_id: string;
  vendure_channel_id: string;
  vendure_channel_token_secret_ref: string;
  vendure_channel_token_sha256: string;
  vendure_channel_is_default: boolean;
  vendure_stock_location_ids: unknown;
  stripe_connected_account_id: string;
  stripe_environment: string;
  stripe_capability_version: string;
  erp_site_id: string;
  erp_company_id: string;
  erp_warehouse_ids: unknown;
  erp_binding_version: string;
  nextcloud_tenant_group_id: string;
  nextcloud_team_folder_ids: unknown;
  verified_at: string | Date;
  verification_receipt_id: string;
};

export type ServerCommerceContext = Readonly<{
  verticalRoot: CommerceVerticalRoot;
  storeId: string;
  storeVersion: number;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  operatorLegalName: string;
  taxRegistrationRef: string | null;
  storeOperatorAssignmentId: string;
  storeOperatorAssignmentVersion: number;
  providerBindingId: string;
  providerBindingVersion: number;
  vendure: {
    deploymentCellId: string;
    sellerId: string;
    channelId: string;
    channelTokenSecretRef: string;
    channelTokenSha256?: string;
    stockLocationIds: readonly string[];
  };
  stripe: {
    connectedAccountId: string;
    environment: "test" | "live";
    capabilityVersion: string;
  };
  erp: {
    siteId: string;
    companyId: string;
    warehouseIds: readonly string[];
    bindingVersion: string;
  };
  nextcloud: {
    tenantGroupId: string;
    teamFolderIds: readonly string[];
  };
  verifiedAt: string;
  verificationReceiptId: string;
  contextFingerprint: string;
}>;

export type ServerCommerceContextResolutionInput = Readonly<{
  verticalRoot: CommerceVerticalRoot;
  storeId: string;
  expectedAssignmentVersion?: number;
}>;

export class CommerceContextResolutionError extends Error {
  constructor(
    readonly code:
      | "COMMERCE_CONTEXT_INPUT_INVALID"
      | "COMMERCE_CONTEXT_UNRESOLVED"
      | "COMMERCE_CONTEXT_AMBIGUOUS"
      | "COMMERCE_CONTEXT_STALE"
      | "COMMERCE_CONTEXT_INCOMPLETE",
  ) {
    super(code);
    this.name = "CommerceContextResolutionError";
  }
}

function exactId(value: unknown): string {
  if (typeof value !== "string" || !ID.test(value.trim())) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INCOMPLETE");
  }
  return value.trim();
}

function exactProviderId(value: unknown): string {
  if (typeof value !== "string" || !PROVIDER_ID.test(value.trim())) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INCOMPLETE");
  }
  return value.trim();
}

function exactSha256(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INCOMPLETE");
  }
  return value;
}

function exactVersion(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INCOMPLETE");
  }
  return parsed;
}

function exactIdArray(value: unknown): string[] {
  let parsed: unknown;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) as unknown : value;
  } catch {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INCOMPLETE");
  }
  if (!Array.isArray(parsed) || parsed.length < 1) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INCOMPLETE");
  }
  const values = parsed.map(exactId);
  if (new Set(values).size !== values.length) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INCOMPLETE");
  }
  return values.sort();
}

function exactProviderIdArray(value: unknown): string[] {
  let parsed: unknown;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) as unknown : value;
  } catch {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INCOMPLETE");
  }
  if (!Array.isArray(parsed) || parsed.length < 1) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INCOMPLETE");
  }
  const values = parsed.map(exactProviderId);
  if (new Set(values).size !== values.length) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INCOMPLETE");
  }
  return values.sort();
}

function canonicalFingerprint(value: object): string {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex");
}

function validateResolutionInput(input: ServerCommerceContextResolutionInput) {
  if (
    !VERTICALS.includes(input.verticalRoot) ||
    typeof input.storeId !== "string" ||
    !ID.test(input.storeId.trim()) ||
    (input.expectedAssignmentVersion !== undefined &&
      (!Number.isSafeInteger(input.expectedAssignmentVersion) ||
        input.expectedAssignmentVersion < 1))
  ) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INPUT_INVALID");
  }
}

/**
 * Resolve the complete commerce scope with a query that already belongs to the
 * caller's authoritative transaction. This is the only safe composition point
 * for an authorization preflight that must bind Core grants and provider scope
 * to one database snapshot.
 */
export async function resolveServerCommerceContextSnapshot(
  query: KdsQuery,
  input: ServerCommerceContextResolutionInput,
  authorityNow: Date,
): Promise<ServerCommerceContext> {
  validateResolutionInput(input);
  if (Number.isNaN(authorityNow.getTime())) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INPUT_INVALID");
  }

  const result = await query<ResolutionRow>(
    `select
       s.vertical_root,s.store_id,s.version store_version,
       a.assignment_id,a.version assignment_version,a.partner_tenant_id,
       a.operator_legal_entity_id,l.legal_name,l.tax_registration_ref,
       b.binding_id,b.binding_version,b.vendure_deployment_cell_id,
       b.vendure_seller_id,b.vendure_channel_id,
       b.vendure_channel_token_secret_ref,
       b.vendure_channel_token_sha256,b.vendure_channel_is_default,
       b.vendure_stock_location_ids,
       b.stripe_connected_account_id,b.stripe_environment,
       b.stripe_capability_version,b.erp_site_id,b.erp_company_id,
       b.erp_warehouse_ids,b.erp_binding_version,b.verified_at,
       b.verification_receipt_id,b.nextcloud_tenant_group_id,
       b.nextcloud_team_folder_ids
     from crays_core.stores s
     join crays_core.vertical_roots v
       on v.vertical_root=s.vertical_root and v.status='active'
     join crays_core.store_operator_assignments a
       on a.store_id=s.store_id and a.vertical_root=s.vertical_root
     join crays_core.franchise_operator_tenants p
       on p.partner_tenant_id=a.partner_tenant_id and p.status='active'
     join crays_core.organizations o
       on o.organization_id=p.organization_id and o.status='active'
     join crays_core.operator_legal_entities l
       on l.legal_entity_id=a.operator_legal_entity_id
      and l.partner_tenant_id=a.partner_tenant_id
     join crays_core.provider_scope_bindings b
       on b.assignment_id=a.assignment_id
      and b.assignment_version=a.version
     where s.store_id=$1 and s.vertical_root=$2
       and s.status='active' and a.status='active'
       and l.status='active' and b.status='active'
       and a.valid_from <= $3
       and (a.valid_until is null or a.valid_until > $3)`,
    [input.storeId.trim(), input.verticalRoot, authorityNow.toISOString()],
  );

  if (result.rows.length === 0) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_UNRESOLVED");
  }
  if (result.rows.length !== 1) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_AMBIGUOUS");
  }
  const row = result.rows[0];
  const assignmentVersion = exactVersion(row.assignment_version);
  if (
    input.expectedAssignmentVersion !== undefined &&
    assignmentVersion !== input.expectedAssignmentVersion
  ) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_STALE");
  }
  const verifiedAt = new Date(row.verified_at);
  if (Number.isNaN(verifiedAt.getTime()) || verifiedAt > authorityNow) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INCOMPLETE");
  }
  if (!["test", "live"].includes(row.stripe_environment)) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INCOMPLETE");
  }
  if (row.vendure_channel_is_default !== false) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INCOMPLETE");
  }
  const operatorLegalName =
    typeof row.legal_name === "string" ? row.legal_name.trim() : "";
  const taxRegistrationRef = row.tax_registration_ref === null
    ? null
    : typeof row.tax_registration_ref === "string" &&
        row.tax_registration_ref.trim().length > 0
      ? row.tax_registration_ref.trim()
      : undefined;
  if (operatorLegalName.length < 2 || taxRegistrationRef === undefined) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INCOMPLETE");
  }

  const stable = {
    verticalRoot: input.verticalRoot,
    storeId: exactId(row.store_id),
    storeVersion: exactVersion(row.store_version),
    partnerTenantId: exactId(row.partner_tenant_id),
    operatorLegalEntityId: exactId(row.operator_legal_entity_id),
    operatorLegalName,
    taxRegistrationRef,
    storeOperatorAssignmentId: exactId(row.assignment_id),
    storeOperatorAssignmentVersion: assignmentVersion,
    providerBindingId: exactId(row.binding_id),
    providerBindingVersion: exactVersion(row.binding_version),
    vendure: {
      deploymentCellId: exactId(row.vendure_deployment_cell_id),
      sellerId: exactProviderId(row.vendure_seller_id),
      channelId: exactProviderId(row.vendure_channel_id),
      channelTokenSecretRef: exactId(row.vendure_channel_token_secret_ref),
      channelTokenSha256: exactSha256(row.vendure_channel_token_sha256),
      stockLocationIds: exactProviderIdArray(row.vendure_stock_location_ids),
    },
    stripe: {
      connectedAccountId: exactId(row.stripe_connected_account_id),
      environment: row.stripe_environment as "test" | "live",
      capabilityVersion: exactId(row.stripe_capability_version),
    },
    erp: {
      siteId: exactId(row.erp_site_id),
      companyId: exactId(row.erp_company_id),
      warehouseIds: exactIdArray(row.erp_warehouse_ids),
      bindingVersion: exactId(row.erp_binding_version),
    },
    nextcloud: {
      tenantGroupId: exactId(row.nextcloud_tenant_group_id),
      teamFolderIds: exactIdArray(row.nextcloud_team_folder_ids),
    },
    verifiedAt: verifiedAt.toISOString(),
    verificationReceiptId: exactId(row.verification_receipt_id),
  };
  return {
    ...stable,
    contextFingerprint: canonicalFingerprint(stable),
  };
}

export async function resolveServerCommerceContext(
  database: KdsDatabase,
  input: ServerCommerceContextResolutionInput & Readonly<{ now?: Date }>,
): Promise<ServerCommerceContext> {
  validateResolutionInput(input);
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_INPUT_INVALID");
  }

  return database.transaction(async ({ query }) => {
    await query("set transaction isolation level repeatable read read only");
    await query("select set_config('crays.app_role','core_service',true)");
    return resolveServerCommerceContextSnapshot(query, input, now);
  });
}
