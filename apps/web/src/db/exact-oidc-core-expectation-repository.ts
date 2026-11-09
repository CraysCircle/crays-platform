import "server-only";

import type {
  ExactOidcBindingExpectation,
  ExactOidcSessionAuthority,
} from "@/lib/exact-oidc-core-binding-preflight";
import type { ExactOidcTrustedHostContext } from "@/lib/exact-oidc-trusted-host";

if (typeof window !== "undefined") {
  throw new Error("EXACT_OIDC_CORE_EXPECTATION_REPOSITORY_SERVER_ONLY");
}

type QueryResult<Row> = Readonly<{ rows: Row[] }>;
type Client = Readonly<{
  query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
  release(): void;
}>;
export type ExactOidcCoreExpectationPool = Readonly<{ connect(): Promise<Client> }>;

type ExpectationRow = Readonly<{
  crays_tenant_id: string;
  canonical_organization_id: string;
  role_assignment_id: string;
  role_context_id: string;
  role_context_version: string | number;
  effective_role: string;
  purpose: string;
  vertical_root: ExactOidcBindingExpectation["verticalRoot"];
  partner_tenant_id: string;
  partner_tenant_version: string | number;
  operator_legal_entity_id: string;
  operator_legal_entity_version: string | number;
  store_id: string;
  store_version: string | number;
  store_assignment_id: string;
  store_assignment_version: string | number;
  security_policy_version: string;
  nextcloud_provider_instance_id: string;
  nextcloud_organization_scope_id: string;
}>;

export type ExactOidcCoreExpectationResolution =
  | Readonly<{
      status: "RESOLVED";
      reason: "CURRENT_CORE_AUTHORITY_RESOLVED";
      expectation: ExactOidcBindingExpectation;
    }>
  | Readonly<{
      status: "DENIED";
      reason:
        | "MISSING_CURRENT_CORE_AUTHORITY"
        | "AMBIGUOUS_CURRENT_CORE_AUTHORITY"
        | "CURRENT_CORE_AUTHORITY_UNAVAILABLE";
    }>;

function expectation(row: ExpectationRow): ExactOidcBindingExpectation {
  return Object.freeze({
    craysTenantId: row.crays_tenant_id,
    canonicalOrganizationId: row.canonical_organization_id,
    roleAssignmentId: row.role_assignment_id,
    roleContextId: row.role_context_id,
    roleContextVersion: Number(row.role_context_version),
    effectiveRole: row.effective_role,
    purpose: row.purpose,
    verticalRoot: row.vertical_root,
    partnerTenantId: row.partner_tenant_id,
    partnerTenantVersion: Number(row.partner_tenant_version),
    operatorLegalEntityId: row.operator_legal_entity_id,
    operatorLegalEntityVersion: Number(row.operator_legal_entity_version),
    storeId: row.store_id,
    storeVersion: Number(row.store_version),
    storeAssignmentId: row.store_assignment_id,
    storeAssignmentVersion: Number(row.store_assignment_version),
    securityPolicyVersion: row.security_policy_version,
    nextcloudProviderInstanceId: row.nextcloud_provider_instance_id,
    nextcloudOrganizationScopeId: row.nextcloud_organization_scope_id,
  });
}

const denied = (
  reason: Extract<ExactOidcCoreExpectationResolution, { status: "DENIED" }>["reason"],
): ExactOidcCoreExpectationResolution => Object.freeze({ status: "DENIED", reason });

export function createExactOidcCoreExpectationResolver(pool: ExactOidcCoreExpectationPool) {
  return async (
    session: ExactOidcSessionAuthority,
    host: ExactOidcTrustedHostContext,
  ): Promise<ExactOidcCoreExpectationResolution> => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('crays.app_role','core_service',true)");
      const result = await client.query<ExpectationRow>(`
        select
          relationship.crays_tenant_id,
          organization.organization_id as canonical_organization_id,
          role_assignment.assignment_id as role_assignment_id,
          role_context.role_context_id,
          role_context.context_version as role_context_version,
          role_context.role_key as effective_role,
          role_context.purpose,
          role_context.vertical_root,
          partner.partner_tenant_id,
          partner.version as partner_tenant_version,
          legal_entity.legal_entity_id as operator_legal_entity_id,
          legal_entity.version as operator_legal_entity_version,
          store.store_id,
          store.version as store_version,
          assignment.assignment_id as store_assignment_id,
          assignment.version as store_assignment_version,
          role_context.policy_version as security_policy_version,
          principal.provider_instance_id as nextcloud_provider_instance_id,
          principal.provider_organization_scope_id as nextcloud_organization_scope_id
        from crays_core.auth_identities source_identity
        join crays_core.crays_accounts account
          on account.account_id = source_identity.account_id
         and account.status = 'active'
        join crays_core.canonical_people person
          on person.account_id = account.account_id
         and person.lifecycle_state = 'active'
        join crays_core.canonical_relationships relationship
          on relationship.canonical_person_id = person.canonical_person_id
         and relationship.lifecycle_state = 'active'
         and relationship.valid_from <= transaction_timestamp()
         and (relationship.valid_until is null or relationship.valid_until > transaction_timestamp())
        join crays_core.organizations organization
          on organization.organization_id = relationship.organization_id
         and organization.status = 'active'
        join crays_core.partner_role_contexts role_context
          on role_context.account_id = account.account_id
         and role_context.relationship_id = relationship.canonical_relationship_id
         and role_context.organization_id = relationship.organization_id
         and role_context.vertical_root = relationship.vertical_root
         and role_context.partner_tenant_id = relationship.partner_tenant_id
         and role_context.operator_legal_entity_id = relationship.operator_legal_entity_id
         and role_context.store_id = relationship.store_id
         and role_context.purpose = relationship.purpose
         and role_context.policy_version = relationship.policy_version
         and role_context.status = 'active'
         and role_context.valid_from <= transaction_timestamp()
         and (role_context.valid_until is null or role_context.valid_until > transaction_timestamp())
        join crays_core.role_assignments role_assignment
          on role_assignment.assignment_id = role_context.role_assignment_id
         and role_assignment.account_id = account.account_id
         and role_assignment.role_key = role_context.role_key
         and role_assignment.organization_id = organization.organization_id
         and role_assignment.status = 'active'
        join crays_core.franchise_operator_tenants partner
          on partner.partner_tenant_id = relationship.partner_tenant_id
         and partner.organization_id = organization.organization_id
         and partner.status = 'active'
        join crays_core.operator_legal_entities legal_entity
          on legal_entity.legal_entity_id = relationship.operator_legal_entity_id
         and legal_entity.partner_tenant_id = partner.partner_tenant_id
         and legal_entity.status = 'active'
        join crays_core.stores store
          on store.store_id = relationship.store_id
         and store.vertical_root = relationship.vertical_root
         and store.status = 'active'
        join crays_core.store_operator_assignments assignment
          on assignment.assignment_id = role_context.store_operator_assignment_id
         and assignment.version = role_context.store_operator_assignment_version
         and assignment.store_id = store.store_id
         and assignment.vertical_root = store.vertical_root
         and assignment.partner_tenant_id = partner.partner_tenant_id
         and assignment.operator_legal_entity_id = legal_entity.legal_entity_id
         and assignment.status = 'active'
         and assignment.valid_from <= transaction_timestamp()
         and (assignment.valid_until is null or assignment.valid_until > transaction_timestamp())
        join crays_integration.provider_principal_mappings principal
          on principal.account_id = account.account_id
         and principal.provider = 'nextcloud'
         and principal.provider_principal_type = 'user'
         and principal.source_policy_version = role_context.policy_version
         and principal.status = 'active'
        where source_identity.provider_subject = $1
          and source_identity.provider_key like 'auth0%'
          and source_identity.verified is true
          and role_context.purpose = 'nextcloud-personal-workspace'
          and role_context.capabilities ? 'nextcloud:read'
          and ($2::text is null or role_context.vertical_root = $2)
        order by role_context.role_context_id, principal.principal_mapping_id
        limit 2
      `, [session.identity.subject, host.verticalRoot]);
      await client.query("commit");
      if (result.rows.length === 0) return denied("MISSING_CURRENT_CORE_AUTHORITY");
      if (result.rows.length !== 1) return denied("AMBIGUOUS_CURRENT_CORE_AUTHORITY");
      return Object.freeze({
        status: "RESOLVED",
        reason: "CURRENT_CORE_AUTHORITY_RESOLVED",
        expectation: expectation(result.rows[0]),
      });
    } catch {
      await client.query("rollback").catch(() => undefined);
      return denied("CURRENT_CORE_AUTHORITY_UNAVAILABLE");
    } finally {
      client.release();
    }
  };
}
