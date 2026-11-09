import "server-only";

import type { RoleKey } from "@/lib/roles";
import type { KdsDatabase } from "@/store-operations/kds";
import { isCommerceRoleVerticalAuthorized } from
  "./commerce-role-vertical-authority";
import {
  authorizePartnerVendureAdmin,
} from "./partner-vendure-admin-authorization";
import {
  isCommerceGrantLoadingError,
  loadPartnerVendureAdminGrants,
  type PartnerVendureAdminGrantSnapshot,
} from "./partner-vendure-admin-grant-repository";
import type { CommerceVerticalRoot } from
  "./server-commerce-context-resolver";

const CORE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const PURPOSE = "vendure_admin_authorization";
const POLICY_VERSION = "vendure-admin-v1";
const MAX_CONTEXTS = 50;
const ROLES: readonly RoleKey[] = [
  "finance", "franchise-partner", "studio-manager",
];

type CandidateRow = Readonly<{
  vertical_root: string;
  store_id: string;
  store_display_name: string;
  operator_legal_name: string;
  assignment_version: string | number;
}>;

export type PartnerVendureReconciliationContext = Readonly<{
  verticalRoot: CommerceVerticalRoot;
  storeId: string;
  storeDisplayName: string;
  operatorLegalName: string;
  storeOperatorAssignmentVersion: number;
}>;

export class ReconciliationContextLoadingError extends Error {
  constructor(readonly code:
    | "RECONCILIATION_CONTEXT_INPUT_INVALID"
    | "RECONCILIATION_CONTEXT_AUTHORITY_DRIFT"
    | "RECONCILIATION_CONTEXT_RESULT_INVALID"
    | "RECONCILIATION_CONTEXT_TOO_MANY") {
    super(code);
    this.name = "ReconciliationContextLoadingError";
  }
}

function exactText(value: unknown): string {
  if (
    typeof value !== "string" || value.trim() !== value ||
    value.length < 1 || value.length > 200
  ) {
    throw new ReconciliationContextLoadingError(
      "RECONCILIATION_CONTEXT_RESULT_INVALID",
    );
  }
  return value;
}

function exactVertical(value: unknown): CommerceVerticalRoot {
  if (
    value !== "coffee" && value !== "retail" &&
    value !== "gym" && value !== "clubs"
  ) {
    throw new ReconciliationContextLoadingError(
      "RECONCILIATION_CONTEXT_RESULT_INVALID",
    );
  }
  return value;
}

async function loadCandidates(
  database: KdsDatabase,
  input: Readonly<{
    accountId: string;
    organizationId: string;
    effectiveRole: RoleKey;
  }>,
): Promise<readonly CandidateRow[]> {
  return database.transaction(async ({ query }) => {
    await query("set transaction isolation level repeatable read read only");
    await query("select set_config('crays.app_role','core_service',true)");
    const result = await query<CandidateRow>(
      `select distinct
              s.vertical_root,
              s.store_id,
              s.display_name store_display_name,
              l.legal_name operator_legal_name,
              a.version assignment_version
         from crays_core.partner_role_contexts c
         join crays_core.crays_accounts account
           on account.account_id=c.account_id and account.status='active'
         join crays_core.organizations organization
           on organization.organization_id=c.organization_id
          and organization.status='active'
         join crays_core.role_assignments role_assignment
           on role_assignment.assignment_id=c.role_assignment_id
          and role_assignment.account_id=c.account_id
          and role_assignment.role_key=c.role_key
          and role_assignment.organization_id=c.organization_id
          and role_assignment.status='active'
         join crays_core.organization_memberships membership
           on membership.account_id=c.account_id
          and membership.organization_id=c.organization_id
          and membership.role_key=c.role_key
          and membership.status='active'
         join crays_core.franchise_operator_tenants tenant
           on tenant.partner_tenant_id=c.partner_tenant_id
          and tenant.organization_id=c.organization_id
          and tenant.status='active'
         join crays_core.operator_legal_entities l
           on l.legal_entity_id=c.operator_legal_entity_id
          and l.partner_tenant_id=c.partner_tenant_id
          and l.status='active'
         join crays_core.store_operator_assignments a
           on a.vertical_root=c.vertical_root
          and a.partner_tenant_id=c.partner_tenant_id
          and a.operator_legal_entity_id=c.operator_legal_entity_id
          and a.status='active'
          and a.valid_from <= transaction_timestamp()
          and (a.valid_until is null or a.valid_until > transaction_timestamp())
         join crays_core.stores s
           on s.store_id=a.store_id and s.vertical_root=a.vertical_root
          and s.status='active'
        where c.account_id=$1 and c.organization_id=$2 and c.role_key=$3
          and c.purpose=$4 and c.policy_version=$5 and c.status='active'
          and c.valid_from <= transaction_timestamp()
          and (c.valid_until is null or c.valid_until > transaction_timestamp())
          and (
            c.store_id is null
            or (
              c.store_id=a.store_id
              and c.store_operator_assignment_id=a.assignment_id
              and c.store_operator_assignment_version=a.version
            )
          )
        order by s.vertical_root,s.display_name,s.store_id,a.version
        limit $6`,
      [
        input.accountId,
        input.organizationId,
        input.effectiveRole,
        PURPOSE,
        POLICY_VERSION,
        MAX_CONTEXTS + 1,
      ],
    );
    return result.rows;
  });
}

export async function listAuthorizedPartnerVendureReconciliationContexts(
  database: KdsDatabase,
  input: Readonly<{
    accountId: string;
    organizationId: string;
    effectiveRole: RoleKey;
  }>,
  dependencies: Readonly<{
    loadGrants?: typeof loadPartnerVendureAdminGrants;
    authorize?: typeof authorizePartnerVendureAdmin;
    candidates?: typeof loadCandidates;
  }> = {},
): Promise<readonly PartnerVendureReconciliationContext[]> {
  if (
    !CORE_ID.test(input.accountId) || !CORE_ID.test(input.organizationId) ||
    !ROLES.includes(input.effectiveRole)
  ) {
    throw new ReconciliationContextLoadingError(
      "RECONCILIATION_CONTEXT_INPUT_INVALID",
    );
  }
  const candidates = await (dependencies.candidates ?? loadCandidates)(
    database,
    input,
  );
  if (candidates.length > MAX_CONTEXTS) {
    throw new ReconciliationContextLoadingError(
      "RECONCILIATION_CONTEXT_TOO_MANY",
    );
  }
  const result: PartnerVendureReconciliationContext[] = [];
  for (const candidate of candidates) {
    const verticalRoot = exactVertical(candidate.vertical_root);
    if (!isCommerceRoleVerticalAuthorized(
      input.effectiveRole, verticalRoot)) continue;
    const storeId = exactText(candidate.store_id);
    if (!CORE_ID.test(storeId)) {
      throw new ReconciliationContextLoadingError(
        "RECONCILIATION_CONTEXT_RESULT_INVALID",
      );
    }
    const assignmentVersion = Number(candidate.assignment_version);
    if (!Number.isSafeInteger(assignmentVersion) || assignmentVersion < 1) {
      throw new ReconciliationContextLoadingError(
        "RECONCILIATION_CONTEXT_RESULT_INVALID",
      );
    }
    let snapshot: PartnerVendureAdminGrantSnapshot;
    try {
      snapshot = await (dependencies.loadGrants ??
        loadPartnerVendureAdminGrants)(database, {
          ...input,
          verticalRoot,
          storeId,
          expectedAssignmentVersion: assignmentVersion,
        });
    } catch (error) {
      if (
        isCommerceGrantLoadingError(error) &&
        error.code === "COMMERCE_GRANT_NOT_ACTIVE"
      ) {
        continue;
      }
      throw new ReconciliationContextLoadingError(
        "RECONCILIATION_CONTEXT_AUTHORITY_DRIFT",
      );
    }
    const decision = (dependencies.authorize ?? authorizePartnerVendureAdmin)({
      action: "order.read",
      grants: snapshot.grants,
      context: snapshot.context,
      now: new Date(snapshot.authorityNow),
    });
    if (
      decision.decision !== "ALLOW" ||
      decision.scope.kind !== "partner_store" ||
      decision.scope.storeId !== storeId ||
      snapshot.context.verticalRoot !== verticalRoot ||
      snapshot.context.storeOperatorAssignmentVersion !== assignmentVersion
    ) {
      continue;
    }
    result.push(Object.freeze({
      verticalRoot,
      storeId,
      storeDisplayName: exactText(candidate.store_display_name),
      operatorLegalName: exactText(candidate.operator_legal_name),
      storeOperatorAssignmentVersion: assignmentVersion,
    }));
  }
  return Object.freeze(result);
}
