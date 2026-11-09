import type {
  ExactOidcBindingExpectation,
  ExactOidcBindingRead,
  ExactOidcBindingSnapshot,
  ExactOidcSessionAuthority,
} from "@/lib/exact-oidc-core-binding-preflight";

if (typeof window !== "undefined") {
  throw new Error("EXACT_OIDC_CORE_BINDING_REPOSITORY_SERVER_ONLY");
}

type QueryResult<Row> = Readonly<{ rows: Row[] }>;
type Client = Readonly<{
  query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
  release(): void;
}>;
export type ExactOidcBindingPool = Readonly<{ connect(): Promise<Client> }>;

type BindingRow = Readonly<{
  binding_id: string;
  binding_version: string | number;
  binding_sha256: string;
  issuer: string;
  issuer_sha256: string;
  subject: string;
  provider_key: string;
  identity_sha256: string;
  auth0_tenant_id: string;
  connection_key: string;
  client_id_sha256: string;
  account_id: string;
  canonical_person_id: string;
  person_version: string | number;
  canonical_organization_id: string;
  canonical_relationship_id: string;
  relationship_version: string | number;
  crays_tenant_id: string;
  role_assignment_id: string;
  role_context_id: string;
  role_context_version: string | number;
  effective_role: string;
  purpose: string;
  vertical_root: ExactOidcBindingSnapshot["verticalRoot"];
  partner_tenant_id: string;
  partner_tenant_version: string | number;
  operator_legal_entity_id: string;
  operator_legal_entity_version: string | number;
  store_id: string;
  store_version: string | number;
  store_operator_assignment_id: string;
  store_operator_assignment_version: string | number;
  security_policy_version: string;
  nextcloud_provider_instance_id: string;
  nextcloud_organization_scope_id: string;
  nextcloud_principal_mapping_id: string;
  nextcloud_principal_mapping_version: string | number;
  nextcloud_internal_uid_sha256: string;
  binding_state: ExactOidcBindingSnapshot["state"];
  valid_from: string;
  valid_until: string | null;
}>;

const utcSql = (value: string) => `to_char(${value} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

function snapshot(row: BindingRow): ExactOidcBindingSnapshot {
  return Object.freeze({
    bindingId: row.binding_id,
    bindingVersion: Number(row.binding_version),
    bindingSha256: row.binding_sha256,
    issuer: row.issuer,
    issuerSha256: row.issuer_sha256,
    subject: row.subject,
    providerKey: row.provider_key,
    identitySha256: row.identity_sha256,
    auth0TenantId: row.auth0_tenant_id,
    connectionKey: row.connection_key,
    clientIdSha256: row.client_id_sha256,
    accountId: row.account_id,
    canonicalPersonId: row.canonical_person_id,
    personVersion: Number(row.person_version),
    canonicalOrganizationId: row.canonical_organization_id,
    relationshipId: row.canonical_relationship_id,
    relationshipVersion: Number(row.relationship_version),
    craysTenantId: row.crays_tenant_id,
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
    storeAssignmentId: row.store_operator_assignment_id,
    storeAssignmentVersion: Number(row.store_operator_assignment_version),
    securityPolicyVersion: row.security_policy_version,
    nextcloudProviderInstanceId: row.nextcloud_provider_instance_id,
    nextcloudOrganizationScopeId: row.nextcloud_organization_scope_id,
    nextcloudPrincipalBindingId: row.nextcloud_principal_mapping_id,
    nextcloudPrincipalBindingVersion: Number(row.nextcloud_principal_mapping_version),
    nextcloudInternalUidSha256: row.nextcloud_internal_uid_sha256,
    state: row.binding_state,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
  });
}

export function createExactOidcCoreBindingLoader(pool: ExactOidcBindingPool) {
  return async (
    session: ExactOidcSessionAuthority,
    expected: ExactOidcBindingExpectation,
  ): Promise<ExactOidcBindingRead> => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('crays.app_role','core_service',true), set_config('crays.tenant_id',$1,true)", [expected.craysTenantId]);
      const clock = await client.query<{ database_now: string }>(`select ${utcSql("transaction_timestamp()") } as database_now`);
      const result = await client.query<BindingRow>(`
        select
          root.binding_id, version.binding_version, version.binding_sha256,
          root.issuer, root.issuer_sha256, root.subject, root.provider_key,
          root.identity_sha256, root.auth0_tenant_id, root.connection_key,
          root.client_id_sha256, root.account_id, root.canonical_person_id,
          root.person_version, root.canonical_organization_id,
          root.canonical_relationship_id, root.relationship_version,
          root.crays_tenant_id, root.role_assignment_id, root.role_context_id,
          root.role_context_version, root.effective_role, root.purpose,
          root.vertical_root, root.partner_tenant_id, root.partner_tenant_version,
          root.operator_legal_entity_id, root.operator_legal_entity_version,
          root.store_id, root.store_version, root.store_operator_assignment_id,
          root.store_operator_assignment_version, root.security_policy_version,
          root.nextcloud_provider_instance_id, root.nextcloud_organization_scope_id,
          root.nextcloud_principal_mapping_id, root.nextcloud_principal_mapping_version,
          root.nextcloud_internal_uid_sha256, version.binding_state,
          ${utcSql("version.valid_from")} as valid_from,
          case when version.valid_until is null then null else ${utcSql("version.valid_until")} end as valid_until
        from crays_core.exact_oidc_core_binding_roots root
        join lateral (
          select candidate.*
          from crays_core.exact_oidc_core_binding_versions candidate
          where candidate.binding_id = root.binding_id
          order by candidate.binding_version desc
          limit 1
        ) version on true
        join crays_core.auth_identities source_identity
          on source_identity.identity_id = root.source_auth_identity_id
         and source_identity.account_id = root.account_id
         and source_identity.provider_subject = root.subject
         and source_identity.verified is true
        join crays_core.crays_accounts account
          on account.account_id = root.account_id and account.status = 'active'
        join crays_core.canonical_people person
          on person.canonical_person_id = root.canonical_person_id
         and person.account_id = root.account_id
         and person.person_version = root.person_version
         and person.lifecycle_state = 'active'
        join crays_core.organizations organization
          on organization.organization_id = root.canonical_organization_id
         and organization.status = 'active'
        join crays_core.canonical_relationships relationship
          on relationship.canonical_relationship_id = root.canonical_relationship_id
         and relationship.relationship_version = root.relationship_version
         and relationship.canonical_person_id = root.canonical_person_id
         and relationship.organization_id = root.canonical_organization_id
         and relationship.crays_tenant_id = root.crays_tenant_id
         and relationship.vertical_root = root.vertical_root
         and relationship.partner_tenant_id = root.partner_tenant_id
         and relationship.operator_legal_entity_id = root.operator_legal_entity_id
         and relationship.store_id = root.store_id
         and relationship.purpose = root.purpose
         and relationship.policy_version = root.security_policy_version
         and relationship.lifecycle_state = 'active'
         and relationship.valid_from <= transaction_timestamp()
         and (relationship.valid_until is null or relationship.valid_until > transaction_timestamp())
        join crays_core.partner_role_contexts role_context
          on role_context.role_context_id = root.role_context_id
         and role_context.context_version = root.role_context_version
         and role_context.account_id = root.account_id
         and role_context.role_assignment_id = root.role_assignment_id
         and role_context.role_key = root.effective_role
         and role_context.purpose = root.purpose
         and role_context.policy_version = root.security_policy_version
         and role_context.organization_id = root.canonical_organization_id
         and role_context.vertical_root = root.vertical_root
         and role_context.partner_tenant_id = root.partner_tenant_id
         and role_context.operator_legal_entity_id = root.operator_legal_entity_id
         and role_context.store_id = root.store_id
         and role_context.store_operator_assignment_id = root.store_operator_assignment_id
         and role_context.store_operator_assignment_version = root.store_operator_assignment_version
         and role_context.relationship_id = root.canonical_relationship_id
         and role_context.status = 'active'
         and role_context.valid_from <= transaction_timestamp()
         and (role_context.valid_until is null or role_context.valid_until > transaction_timestamp())
        join crays_core.role_assignments role_assignment
          on role_assignment.assignment_id = root.role_assignment_id
         and role_assignment.account_id = root.account_id
         and role_assignment.role_key = root.effective_role
         and role_assignment.organization_id = root.canonical_organization_id
         and role_assignment.status = 'active'
        join crays_core.franchise_operator_tenants partner
          on partner.partner_tenant_id = root.partner_tenant_id
         and partner.organization_id = root.canonical_organization_id
         and partner.version = root.partner_tenant_version and partner.status = 'active'
        join crays_core.operator_legal_entities legal_entity
          on legal_entity.legal_entity_id = root.operator_legal_entity_id
         and legal_entity.partner_tenant_id = root.partner_tenant_id
         and legal_entity.version = root.operator_legal_entity_version
         and legal_entity.status = 'active'
        join crays_core.stores store
          on store.store_id = root.store_id and store.vertical_root = root.vertical_root
         and store.version = root.store_version and store.status = 'active'
        join crays_core.store_operator_assignments assignment
          on assignment.assignment_id = root.store_operator_assignment_id
         and assignment.store_id = root.store_id
         and assignment.vertical_root = root.vertical_root
         and assignment.partner_tenant_id = root.partner_tenant_id
         and assignment.operator_legal_entity_id = root.operator_legal_entity_id
         and assignment.version = root.store_operator_assignment_version
         and assignment.status = 'active'
         and assignment.valid_from <= transaction_timestamp()
         and (assignment.valid_until is null or assignment.valid_until > transaction_timestamp())
        join crays_integration.provider_principal_mappings principal
          on principal.principal_mapping_id = root.nextcloud_principal_mapping_id
         and principal.mapping_version = root.nextcloud_principal_mapping_version
         and principal.account_id = root.account_id
         and principal.provider = 'nextcloud'
         and principal.provider_instance_id = root.nextcloud_provider_instance_id
         and principal.provider_organization_scope_id = root.nextcloud_organization_scope_id
         and encode(sha256(convert_to(principal.provider_principal_ref,'UTF8')),'hex') = root.nextcloud_internal_uid_sha256
         and principal.status = 'active'
        join lateral (
          select
            count(*)::integer as receipt_count,
            count(distinct approval.approver_account_id)::integer as approver_count,
            count(distinct approval.approver_role_assignment_id)::integer as assignment_count
          from crays_core.exact_oidc_binding_approval_receipts approval
          join crays_core.crays_accounts approver_account
            on approver_account.account_id = approval.approver_account_id
           and approver_account.status = 'active'
          join crays_core.role_assignments approver_assignment
            on approver_assignment.assignment_id = approval.approver_role_assignment_id
           and approver_assignment.account_id = approval.approver_account_id
           and approver_assignment.organization_id = root.canonical_organization_id
           and approver_assignment.status = 'active'
          join crays_core.partner_role_contexts approver_context
            on approver_context.role_context_id = approval.approver_role_context_id
           and approver_context.context_version = approval.approver_role_context_version
           and approver_context.account_id = approval.approver_account_id
           and approver_context.role_assignment_id = approval.approver_role_assignment_id
           and approver_context.organization_id = root.canonical_organization_id
           and approver_context.vertical_root = root.vertical_root
           and approver_context.partner_tenant_id = root.partner_tenant_id
           and approver_context.operator_legal_entity_id = root.operator_legal_entity_id
           and approver_context.store_id is not distinct from root.store_id
           and approver_context.store_operator_assignment_id is not distinct from root.store_operator_assignment_id
           and approver_context.store_operator_assignment_version is not distinct from root.store_operator_assignment_version
           and approver_context.relationship_id = root.canonical_relationship_id
           and approver_context.purpose = 'approve-exact-identity-binding'
           and approver_context.policy_version = approval.authority_policy_version
           and approver_context.status = 'active'
           and approver_context.valid_from <= transaction_timestamp()
           and (approver_context.valid_until is null or approver_context.valid_until > transaction_timestamp())
          where approval.binding_id = root.binding_id
            and approval.decision = 'APPROVED'
            and approval.valid_from <= transaction_timestamp()
            and approval.valid_until > transaction_timestamp()
            and approval.approver_role_key = case approval.approval_kind
              when 'IDENTITY_APPROVAL' then 'identity-security-owner'
              when 'SECURITY_APPROVAL' then 'security-owner'
              when 'ENVIRONMENT_APPROVAL' then 'platform-operations-owner'
              when 'MAPPING_CEREMONY' then 'collaboration-owner'
            end
            and approver_assignment.role_key = approval.approver_role_key
            and approver_context.role_key = approval.approver_role_key
            and approver_context.capabilities ? case approval.approval_kind
              when 'IDENTITY_APPROVAL' then 'identity:approve'
              when 'SECURITY_APPROVAL' then 'security:approve'
              when 'ENVIRONMENT_APPROVAL' then 'environment:approve'
              when 'MAPPING_CEREMONY' then 'mapping:approve'
            end
            and case approval.approval_kind
              when 'IDENTITY_APPROVAL' then
                approval.approval_receipt_id = version.identity_approval_receipt_id
                and approval.approval_receipt_sha256 = version.identity_approval_receipt_sha256
              when 'SECURITY_APPROVAL' then
                approval.approval_receipt_id = version.security_approval_receipt_id
                and approval.approval_receipt_sha256 = version.security_approval_receipt_sha256
              when 'ENVIRONMENT_APPROVAL' then
                approval.approval_receipt_id = version.environment_approval_receipt_id
                and approval.approval_receipt_sha256 = version.environment_approval_receipt_sha256
              when 'MAPPING_CEREMONY' then
                approval.approval_receipt_id = version.mapping_ceremony_receipt_id
                and approval.approval_receipt_sha256 = version.mapping_ceremony_receipt_sha256
              else false
            end
        ) current_approvals
          on current_approvals.receipt_count = 4
         and current_approvals.approver_count = 4
         and current_approvals.assignment_count = 4
        where root.identity_sha256 = $1
          and root.issuer = $2 and root.issuer_sha256 = $3
          and root.subject = $4 and root.provider_key = $5
          and root.auth0_tenant_id = $6 and root.connection_key = $7
          and root.client_id_sha256 = $8 and root.crays_tenant_id = $9
          and root.canonical_organization_id = $10
          and root.role_assignment_id = $11 and root.role_context_id = $12
          and root.role_context_version = $13 and root.effective_role = $14
          and root.purpose = $15 and root.vertical_root = $16
          and root.partner_tenant_id = $17 and root.partner_tenant_version = $18
          and root.operator_legal_entity_id = $19 and root.operator_legal_entity_version = $20
          and root.store_id = $21 and root.store_version = $22
          and root.store_operator_assignment_id = $23
          and root.store_operator_assignment_version = $24
          and root.security_policy_version = $25
          and root.nextcloud_provider_instance_id = $26
          and root.nextcloud_organization_scope_id = $27
      `, [
        session.identity.identitySha256, session.identity.issuer,
        session.identity.issuerSha256, session.identity.subject,
        session.identity.providerKey, session.auth0TenantId, session.connectionKey,
        session.clientIdSha256, expected.craysTenantId,
        expected.canonicalOrganizationId, expected.roleAssignmentId,
        expected.roleContextId, expected.roleContextVersion, expected.effectiveRole,
        expected.purpose, expected.verticalRoot, expected.partnerTenantId,
        expected.partnerTenantVersion, expected.operatorLegalEntityId,
        expected.operatorLegalEntityVersion, expected.storeId, expected.storeVersion,
        expected.storeAssignmentId, expected.storeAssignmentVersion,
        expected.securityPolicyVersion, expected.nextcloudProviderInstanceId,
        expected.nextcloudOrganizationScopeId,
      ]);
      await client.query("commit");
      return Object.freeze({
        databaseNow: clock.rows[0]?.database_now ?? "",
        rows: Object.freeze(result.rows.map(snapshot)),
      });
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  };
}
