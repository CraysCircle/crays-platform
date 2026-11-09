import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";

export const craysCore = pgSchema("crays_core");

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const craysAccounts = craysCore.table(
  "crays_accounts",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    accountId: text("account_id").notNull().unique(),
    craysId: text("crays_id").notNull().unique(),
    displayName: text("display_name").notNull(),
    primaryContact: text("primary_contact"),
    primaryContactType: text("primary_contact_type").notNull().default("contact"),
    defaultRole: text("default_role").notNull(),
    status: text("status").notNull().default("review"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("crays_accounts_status_role_idx").on(table.status, table.defaultRole),
    check("crays_accounts_primary_contact_type_check", sql`${table.primaryContactType} in ('contact', 'nip05', 'npub')`),
    check("crays_accounts_status_check", sql`${table.status} in ('active', 'review', 'blocked')`),
  ],
);

export const authIdentities = craysCore.table(
  "auth_identities",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    identityId: text("identity_id").notNull().unique(),
    accountId: text("account_id")
      .notNull()
      .references(() => craysAccounts.accountId, { onDelete: "cascade" }),
    methodType: text("method_type").notNull(),
    providerKey: text("provider_key").notNull(),
    providerSubject: text("provider_subject").notNull(),
    verified: boolean("verified").notNull().default(false),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("auth_identities_account_id_idx").on(table.accountId),
    uniqueIndex("auth_identities_provider_subject_idx").on(table.providerKey, table.providerSubject),
    check("auth_identities_method_type_check", sql`${table.methodType} in ('contact', 'social', 'passkey', 'mfa', 'signer', 'nostr')`),
  ],
);

export const nostrIdentities = craysCore.table(
  "nostr_identities",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    accountId: text("account_id")
      .notNull()
      .unique()
      .references(() => craysAccounts.accountId, { onDelete: "cascade" }),
    npub: text("npub").unique(),
    pubkeyHex: text("pubkey_hex").unique(),
    nip05: text("nip05").unique(),
    nip05Status: text("nip05_status").notNull().default("not_claimed"),
    issuer: text("issuer").notNull().default("crays"),
    issuanceStatus: text("issuance_status").notNull().default("required"),
    privateKeyHandoff: text("private_key_handoff").notNull().default("not_created"),
    accessEnabled: boolean("access_enabled").notNull().default(false),
    proofMethod: text("proof_method"),
    signerStatus: text("signer_status").notNull().default("not_connected"),
    linkedAt: timestamp("linked_at", { withTimezone: true }),
    lastSignedEventAt: timestamp("last_signed_event_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("nostr_identities_active_pubkey_idx").on(table.pubkeyHex).where(sql`${table.accessEnabled} = true`),
    check("nostr_identities_nip05_status_check", sql`${table.nip05Status} in ('not_claimed', 'claimed', 'resolved', 'mismatch', 'verified')`),
    check("nostr_identities_issuer_check", sql`${table.issuer} in ('crays', 'external')`),
    check("nostr_identities_issuance_status_check", sql`${table.issuanceStatus} in ('required', 'queued', 'issued', 'handoff_pending', 'active', 'revoked')`),
    check(
      "nostr_identities_private_key_handoff_check",
      sql`${table.privateKeyHandoff} in ('not_created', 'one_time_pending', 'confirmed', 'not_applicable')`,
    ),
    check("nostr_identities_proof_method_check", sql`${table.proofMethod} is null or ${table.proofMethod} in ('nip07', 'nip46', 'nip98', 'server_generated_once')`),
    check("nostr_identities_signer_status_check", sql`${table.signerStatus} in ('not_connected', 'pending', 'connected', 'verified')`),
    check("nostr_identities_pubkey_lowercase_check", sql`${table.pubkeyHex} is null or ${table.pubkeyHex} = lower(${table.pubkeyHex})`),
  ],
);

export const nip05Handles = craysCore.table(
  "nip05_handles",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    handleId: text("handle_id").notNull().unique(),
    accountId: text("account_id")
      .notNull()
      .references(() => craysAccounts.accountId, { onDelete: "cascade" }),
    localPart: text("local_part").notNull(),
    domain: text("domain").notNull(),
    pubkeyHex: text("pubkey_hex").notNull(),
    status: text("status").notNull().default("reserved"),
    reservedAt: timestamp("reserved_at", { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("nip05_handles_account_id_idx").on(table.accountId),
    uniqueIndex("nip05_handles_domain_local_idx").on(table.domain, table.localPart),
    check("nip05_handles_status_check", sql`${table.status} in ('reserved', 'active', 'revoked')`),
    check("nip05_handles_local_part_lowercase_check", sql`${table.localPart} = lower(${table.localPart})`),
    check("nip05_handles_pubkey_lowercase_check", sql`${table.pubkeyHex} = lower(${table.pubkeyHex})`),
  ],
);

export const organizations = craysCore.table(
  "organizations",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    organizationId: text("organization_id").notNull().unique(),
    name: text("name").notNull(),
    organizationType: text("organization_type").notNull(),
    status: text("status").notNull().default("review"),
    parentOrganizationId: text("parent_organization_id").references((): AnyPgColumn => organizations.organizationId, { onDelete: "set null" }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("organizations_parent_organization_id_idx").on(table.parentOrganizationId),
    check(
      "organizations_type_check",
      sql`${table.organizationType} in ('crays', 'franchise-partner', 'bank', 'landlord', 'real-estate-partner', 'funding-partner', 'finance-partner', 'vendor', 'investor', 'advisor')`,
    ),
    check("organizations_status_check", sql`${table.status} in ('active', 'review', 'suspended')`),
  ],
);

export const organizationMemberships = craysCore.table(
  "organization_memberships",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    membershipId: text("membership_id").notNull().unique(),
    accountId: text("account_id")
      .notNull()
      .references(() => craysAccounts.accountId, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    roleKey: text("role_key").notNull(),
    status: text("status").notNull().default("review"),
    scopes: jsonb("scopes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("organization_memberships_account_status_idx").on(table.accountId, table.status),
    index("organization_memberships_organization_status_idx").on(table.organizationId, table.status),
    uniqueIndex("organization_memberships_account_org_role_unique").on(table.accountId, table.organizationId, table.roleKey),
    check("organization_memberships_status_check", sql`${table.status} in ('invited', 'active', 'review', 'suspended')`),
  ],
);

export const roleAssignments = craysCore.table(
  "role_assignments",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    assignmentId: text("assignment_id").notNull().unique(),
    accountId: text("account_id")
      .notNull()
      .references(() => craysAccounts.accountId, { onDelete: "cascade" }),
    roleKey: text("role_key").notNull(),
    organizationId: text("organization_id").references(() => organizations.organizationId, { onDelete: "set null" }),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    nostrBindingRequired: boolean("nostr_binding_required").notNull().default(true),
    nostrBindingStatus: text("nostr_binding_status").notNull().default("pending"),
    nostrPubkeyHex: text("nostr_pubkey_hex"),
    nostrNip05: text("nostr_nip05"),
    nostrVerifiedAt: timestamp("nostr_verified_at", { withTimezone: true }),
    grantedByAccountId: text("granted_by_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    status: text("status").notNull().default("review"),
    createdAt,
    updatedAt,
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("role_assignments_account_role_status_idx").on(table.accountId, table.roleKey, table.status),
    index("role_assignments_organization_status_idx").on(table.organizationId, table.status),
    check("role_assignments_status_check", sql`${table.status} in ('active', 'review', 'revoked')`),
    check(
      "role_assignments_entity_type_check",
      sql`${table.entityType} is null or ${table.entityType} in ('portfolio', 'studio', 'deal', 'project', 'property', 'property-case', 'partner', 'bank-package', 'loan-case', 'member', 'document')`,
    ),
    check("role_assignments_nostr_status_check", sql`${table.nostrBindingStatus} in ('missing', 'pending', 'verified', 'system_attested', 'revoked')`),
    check("role_assignments_nostr_required_check", sql`${table.nostrBindingRequired} = true`),
    check("role_assignments_pubkey_lowercase_check", sql`${table.nostrPubkeyHex} is null or ${table.nostrPubkeyHex} = lower(${table.nostrPubkeyHex})`),
  ],
);

export const nostrChallenges = craysCore.table(
  "nostr_challenges",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    challengeId: text("challenge_id").notNull().unique(),
    accountId: text("account_id").references(() => craysAccounts.accountId, { onDelete: "cascade" }),
    identifier: text("identifier"),
    pubkeyHex: text("pubkey_hex"),
    challenge: text("challenge").notNull().unique(),
    absoluteUrl: text("absolute_url").notNull(),
    method: text("method").notNull(),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    index("nostr_challenges_account_status_idx").on(table.accountId, table.status),
    index("nostr_challenges_pending_expiry_idx").on(table.status, table.expiresAt).where(sql`${table.status} = 'pending'`),
    check("nostr_challenges_method_check", sql`${table.method} in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')`),
    check("nostr_challenges_status_check", sql`${table.status} in ('pending', 'verified', 'expired', 'revoked')`),
    check("nostr_challenges_pubkey_lowercase_check", sql`${table.pubkeyHex} is null or ${table.pubkeyHex} = lower(${table.pubkeyHex})`),
  ],
);

export const keyHandoffEvents = craysCore.table(
  "key_handoff_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    handoffId: text("handoff_id").notNull().unique(),
    accountId: text("account_id")
      .notNull()
      .references(() => craysAccounts.accountId, { onDelete: "cascade" }),
    pubkeyHex: text("pubkey_hex").notNull(),
    status: text("status").notNull().default("pending"),
    deliveryChannel: text("delivery_channel").notNull().default("one_time_handoff"),
    privateKeyMaterialStored: boolean("private_key_material_stored").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    index("key_handoff_events_account_status_idx").on(table.accountId, table.status),
    check("key_handoff_events_status_check", sql`${table.status} in ('pending', 'confirmed', 'expired', 'revoked')`),
    check("key_handoff_events_no_plaintext_key_check", sql`${table.privateKeyMaterialStored} = false`),
    check("key_handoff_events_pubkey_lowercase_check", sql`${table.pubkeyHex} = lower(${table.pubkeyHex})`),
  ],
);

export const auditEvents = craysCore.table(
  "audit_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    auditId: text("audit_id").notNull().unique(),
    actorAccountId: text("actor_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    outcome: text("outcome").notNull(),
    riskLevel: text("risk_level").notNull().default("standard"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
  },
  (table) => [
    index("audit_events_actor_created_idx").on(table.actorAccountId, table.createdAt),
    index("audit_events_target_created_idx").on(table.targetType, table.targetId, table.createdAt),
    check("audit_events_outcome_check", sql`${table.outcome} in ('allowed', 'denied', 'changed', 'failed')`),
    check("audit_events_risk_level_check", sql`${table.riskLevel} in ('standard', 'sensitive', 'critical')`),
  ],
);

export const properties = craysCore.table(
  "properties",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    propertyId: text("property_id").notNull().unique(),
    ownerOrganizationId: text("owner_organization_id").references(() => organizations.organizationId, { onDelete: "set null" }),
    ownerAccountId: text("owner_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    title: text("title").notNull(),
    addressSummary: text("address_summary"),
    city: text("city"),
    country: text("country"),
    propertyType: text("property_type").notNull().default("unknown"),
    intakeSource: text("intake_source").notNull().default("manual"),
    status: text("status").notNull().default("submitted"),
    visibilityScope: jsonb("visibility_scope").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("properties_owner_status_idx").on(table.ownerOrganizationId, table.status),
    index("properties_city_status_idx").on(table.city, table.status),
    check("properties_property_type_check", sql`${table.propertyType} in ('retail', 'fitness', 'mixed_use', 'commercial', 'unknown')`),
    check("properties_status_check", sql`${table.status} in ('draft', 'submitted', 'screening', 'qualified', 'rejected', 'archived')`),
    check("properties_intake_source_check", sql`${table.intakeSource} in ('manual', 'owner_portal', 'partner_import', 'internal_review')`),
  ],
);

export const propertyCases = craysCore.table(
  "property_cases",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    caseId: text("case_id").notNull().unique(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.propertyId, { onDelete: "cascade" }),
    ownerRole: text("owner_role").notNull().default("expansion-manager"),
    assignedAccountId: text("assigned_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    relatedDealId: text("related_deal_id"),
    status: text("status").notNull().default("intake"),
    currentPhase: text("current_phase").notNull().default("owner_intake"),
    handoffRequired: boolean("handoff_required").notNull().default(true),
    handoffStatus: text("handoff_status").notNull().default("not_ready"),
    reviewSummary: jsonb("review_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("property_cases_property_status_idx").on(table.propertyId, table.status),
    index("property_cases_assigned_status_idx").on(table.assignedAccountId, table.status),
    check("property_cases_owner_role_check", sql`${table.ownerRole} in ('expansion-manager', 'deal-manager', 'crays-management', 'admin')`),
    check("property_cases_status_check", sql`${table.status} in ('intake', 'analysis', 'review', 'handoff_ready', 'handed_to_deal', 'rejected', 'archived')`),
    check("property_cases_handoff_status_check", sql`${table.handoffStatus} in ('not_ready', 'ready', 'handed_to_deal', 'revoked')`),
  ],
);

export const locationAnalyses = craysCore.table(
  "location_analyses",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    analysisId: text("analysis_id").notNull().unique(),
    propertyCaseId: text("property_case_id")
      .notNull()
      .references(() => propertyCases.caseId, { onDelete: "cascade" }),
    analysisType: text("analysis_type").notNull().default("location_intelligence"),
    status: text("status").notNull().default("draft"),
    scoreSnapshot: jsonb("score_snapshot").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    kpiSnapshot: jsonb("kpi_snapshot").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    sourceSummary: jsonb("source_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    reviewedByAccountId: text("reviewed_by_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("location_analyses_case_status_idx").on(table.propertyCaseId, table.status),
    check("location_analyses_type_check", sql`${table.analysisType} in ('location_intelligence', 'market_fit', 'catchment', 'competition', 'transport')`),
    check("location_analyses_status_check", sql`${table.status} in ('draft', 'running', 'review', 'approved', 'released', 'revoked')`),
  ],
);

export const evidencePackages = craysCore.table(
  "evidence_packages",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    packageId: text("package_id").notNull().unique(),
    relatedEntityType: text("related_entity_type").notNull(),
    relatedEntityId: text("related_entity_id").notNull(),
    ownerRole: text("owner_role").notNull(),
    releaseState: text("release_state").notNull().default("internal"),
    visibilityRoles: jsonb("visibility_roles").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    summary: jsonb("summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    approvedByAccountId: text("approved_by_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("evidence_packages_related_idx").on(table.relatedEntityType, table.relatedEntityId, table.releaseState),
    check("evidence_packages_related_type_check", sql`${table.relatedEntityType} in ('prepared-offer', 'deal', 'property-case', 'bank-package', 'loan-case')`),
    check("evidence_packages_owner_role_check", sql`${table.ownerRole} in ('deal-manager', 'expansion-manager', 'finance', 'reviewer', 'crays-management', 'admin')`),
    check("evidence_packages_release_state_check", sql`${table.releaseState} in ('internal', 'candidate_released', 'bank_released', 'owner_released', 'revoked')`),
  ],
);

export const preparedOffers = craysCore.table(
  "prepared_offers",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    offerId: text("offer_id").notNull().unique(),
    propertyCaseId: text("property_case_id").references(() => propertyCases.caseId, { onDelete: "set null" }),
    locationAnalysisId: text("location_analysis_id").references(() => locationAnalyses.analysisId, { onDelete: "set null" }),
    evidencePackageId: text("evidence_package_id").references(() => evidencePackages.packageId, { onDelete: "set null" }),
    title: text("title").notNull(),
    market: text("market"),
    ownerRole: text("owner_role").notNull().default("deal-manager"),
    status: text("status").notNull().default("draft"),
    candidateReleaseState: text("candidate_release_state").notNull().default("not_released"),
    publicTeaserEnabled: boolean("public_teaser_enabled").notNull().default(false),
    partnerHandoffStatus: text("partner_handoff_status").notNull().default("not_required"),
    metricsSnapshot: jsonb("metrics_snapshot").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("prepared_offers_status_release_idx").on(table.status, table.candidateReleaseState),
    index("prepared_offers_property_case_idx").on(table.propertyCaseId),
    check("prepared_offers_owner_role_check", sql`${table.ownerRole} in ('deal-manager', 'expansion-manager', 'crays-management', 'admin')`),
    check("prepared_offers_status_check", sql`${table.status} in ('draft', 'review', 'released', 'reserved', 'withdrawn', 'archived')`),
    check("prepared_offers_candidate_release_state_check", sql`${table.candidateReleaseState} in ('not_released', 'teaser', 'detail_released', 'reserved', 'revoked')`),
    check("prepared_offers_partner_handoff_status_check", sql`${table.partnerHandoffStatus} in ('not_required', 'pending', 'complete', 'revoked')`),
  ],
);

export const deals = craysCore.table(
  "deals",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    dealId: text("deal_id").notNull().unique(),
    preparedOfferId: text("prepared_offer_id").references(() => preparedOffers.offerId, { onDelete: "set null" }),
    candidateAccountId: text("candidate_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    franchisePartnerAccountId: text("franchise_partner_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    dealManagerAccountId: text("deal_manager_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    organizationId: text("organization_id").references(() => organizations.organizationId, { onDelete: "set null" }),
    stage: text("stage").notNull().default("candidate_interest"),
    status: text("status").notNull().default("review"),
    kycAmlStatus: text("kyc_aml_status").notNull().default("not_started"),
    equityStatus: text("equity_status").notNull().default("not_started"),
    bankHandoffStatus: text("bank_handoff_status").notNull().default("not_started"),
    propertyHandoffStatus: text("property_handoff_status").notNull().default("not_required"),
    requiredActions: jsonb("required_actions").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("deals_candidate_stage_idx").on(table.candidateAccountId, table.stage, table.status),
    index("deals_manager_status_idx").on(table.dealManagerAccountId, table.status),
    index("deals_prepared_offer_idx").on(table.preparedOfferId),
    check("deals_stage_check", sql`${table.stage} in ('candidate_interest', 'deal_detail', 'purchase_intent', 'kyc_aml', 'equity_check', 'deal_readiness', 'bank_package', 'closing', 'franchise_partner_handoff')`),
    check("deals_status_check", sql`${table.status} in ('review', 'active', 'blocked', 'closed', 'archived')`),
    check("deals_kyc_aml_status_check", sql`${table.kycAmlStatus} in ('not_started', 'required', 'in_review', 'passed', 'failed', 'expired')`),
    check("deals_equity_status_check", sql`${table.equityStatus} in ('not_started', 'requested', 'in_review', 'verified', 'failed')`),
    check("deals_bank_handoff_status_check", sql`${table.bankHandoffStatus} in ('not_started', 'blocked', 'ready', 'released', 'revoked')`),
    check("deals_property_handoff_status_check", sql`${table.propertyHandoffStatus} in ('not_required', 'pending', 'complete', 'revoked')`),
  ],
);

export const financialModels = craysCore.table(
  "financial_models",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    modelId: text("model_id").notNull().unique(),
    preparedOfferId: text("prepared_offer_id").references(() => preparedOffers.offerId, { onDelete: "set null" }),
    dealId: text("deal_id").references(() => deals.dealId, { onDelete: "set null" }),
    versionLabel: text("version_label").notNull().default("v1"),
    ownerRole: text("owner_role").notNull().default("deal-manager"),
    status: text("status").notNull().default("draft"),
    summary: jsonb("summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    assumptions: jsonb("assumptions").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    approvedByAccountId: text("approved_by_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("financial_models_offer_status_idx").on(table.preparedOfferId, table.status),
    index("financial_models_deal_status_idx").on(table.dealId, table.status),
    check("financial_models_owner_role_check", sql`${table.ownerRole} in ('deal-manager', 'finance', 'crays-management', 'admin')`),
    check("financial_models_status_check", sql`${table.status} in ('draft', 'review', 'approved', 'released', 'revoked')`),
  ],
);

export const bankPackages = craysCore.table(
  "bank_packages",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    packageId: text("package_id").notNull().unique(),
    dealId: text("deal_id")
      .notNull()
      .references(() => deals.dealId, { onDelete: "cascade" }),
    financialModelId: text("financial_model_id").references(() => financialModels.modelId, { onDelete: "set null" }),
    evidencePackageId: text("evidence_package_id").references(() => evidencePackages.packageId, { onDelete: "set null" }),
    bankPartnerOrganizationId: text("bank_partner_organization_id").references(() => organizations.organizationId, { onDelete: "set null" }),
    ownerRole: text("owner_role").notNull().default("deal-manager"),
    status: text("status").notNull().default("draft"),
    releaseStatus: text("release_status").notNull().default("blocked"),
    preparedByAccountId: text("prepared_by_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    releasedByAccountId: text("released_by_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    requiredChecks: jsonb("required_checks").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("bank_packages_deal_status_idx").on(table.dealId, table.status),
    index("bank_packages_bank_partner_idx").on(table.bankPartnerOrganizationId, table.releaseStatus),
    check("bank_packages_owner_role_check", sql`${table.ownerRole} in ('deal-manager', 'finance', 'reviewer', 'crays-management', 'admin')`),
    check("bank_packages_status_check", sql`${table.status} in ('draft', 'review', 'ready', 'released', 'conditions', 'closed', 'revoked')`),
    check("bank_packages_release_status_check", sql`${table.releaseStatus} in ('blocked', 'ready', 'released', 'revoked')`),
  ],
);

export const loanCases = craysCore.table(
  "loan_cases",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    loanCaseId: text("loan_case_id").notNull().unique(),
    bankPackageId: text("bank_package_id")
      .notNull()
      .references(() => bankPackages.packageId, { onDelete: "cascade" }),
    bankPartnerOrganizationId: text("bank_partner_organization_id").references(() => organizations.organizationId, { onDelete: "set null" }),
    status: text("status").notNull().default("not_submitted"),
    decisionState: text("decision_state").notNull().default("pending"),
    requestedAmountSummary: jsonb("requested_amount_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    conditionsSummary: jsonb("conditions_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("loan_cases_package_status_idx").on(table.bankPackageId, table.status),
    check("loan_cases_status_check", sql`${table.status} in ('not_submitted', 'submitted', 'questions', 'approved', 'declined', 'closed', 'archived')`),
    check("loan_cases_decision_state_check", sql`${table.decisionState} in ('pending', 'conditional', 'approved', 'declined', 'withdrawn')`),
  ],
);

export const documentPackageLinks = craysCore.table(
  "document_package_links",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    linkId: text("link_id").notNull().unique(),
    packageType: text("package_type").notNull(),
    packageId: text("package_id").notNull(),
    documentRefType: text("document_ref_type").notNull(),
    documentRefId: text("document_ref_id").notNull(),
    documentGroup: text("document_group").notNull(),
    visibilityRoles: jsonb("visibility_roles").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    status: text("status").notNull().default("linked"),
    requiredFor: text("required_for"),
    createdByAccountId: text("created_by_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("document_package_links_package_idx").on(table.packageType, table.packageId, table.status),
    check("document_package_links_package_type_check", sql`${table.packageType} in ('prepared-offer', 'deal', 'property-case', 'bank-package', 'loan-case', 'opening-project')`),
    check("document_package_links_status_check", sql`${table.status} in ('linked', 'required', 'approved', 'rejected', 'revoked')`),
  ],
);

export const workflowEvents = craysCore.table(
  "workflow_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    eventId: text("event_id").notNull().unique(),
    eventType: text("event_type").notNull(),
    actorAccountId: text("actor_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    relatedEntityType: text("related_entity_type").notNull(),
    relatedEntityId: text("related_entity_id").notNull(),
    roleKey: text("role_key"),
    visibilityRoles: jsonb("visibility_roles").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    eventStatus: text("event_status").notNull().default("recorded"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt,
  },
  (table) => [
    index("workflow_events_related_created_idx").on(table.relatedEntityType, table.relatedEntityId, table.occurredAt),
    index("workflow_events_actor_created_idx").on(table.actorAccountId, table.occurredAt),
    check(
      "workflow_events_related_type_check",
      sql`${table.relatedEntityType} in ('prepared-offer', 'deal', 'property', 'property-case', 'location-analysis', 'evidence-package', 'financial-model', 'bank-package', 'loan-case', 'document', 'conversation', 'message', 'candidate-intent', 'integration', 'sync-job')`,
    ),
    check("workflow_events_status_check", sql`${table.eventStatus} in ('recorded', 'visible', 'suppressed', 'revoked')`),
  ],
);

export const externalRecordMaps = craysCore.table(
  "external_record_maps",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    mapId: text("map_id").notNull().unique(),
    craysEntityType: text("crays_entity_type").notNull(),
    craysEntityId: text("crays_entity_id").notNull(),
    externalSystem: text("external_system").notNull(),
    externalEntityType: text("external_entity_type").notNull(),
    externalEntityId: text("external_entity_id").notNull(),
    externalUrl: text("external_url"),
    syncDirection: text("sync_direction").notNull().default("read"),
    syncStatus: text("sync_status").notNull().default("pending"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("external_record_maps_crays_idx").on(table.craysEntityType, table.craysEntityId),
    index("external_record_maps_sync_status_idx").on(table.syncStatus, table.lastSyncedAt),
    uniqueIndex("external_record_maps_external_unique").on(table.externalSystem, table.externalEntityType, table.externalEntityId),
    uniqueIndex("external_record_maps_crays_external_unique").on(table.craysEntityType, table.craysEntityId, table.externalSystem, table.externalEntityType),
    check(
      "external_record_maps_crays_type_check",
      sql`${table.craysEntityType} in ('prepared-offer', 'deal', 'property', 'property-case', 'location-analysis', 'evidence-package', 'financial-model', 'bank-package', 'loan-case', 'document', 'conversation', 'message', 'candidate-intent', 'organization', 'account', 'studio', 'member', 'employee', 'training', 'support-ticket')`,
    ),
    check("external_record_maps_sync_direction_check", sql`${table.syncDirection} in ('read', 'write', 'bidirectional', 'event')`),
    check("external_record_maps_sync_status_check", sql`${table.syncStatus} in ('pending', 'synced', 'conflict', 'failed', 'disabled')`),
  ],
);

export const integrationConnections = craysCore.table(
  "integration_connections",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    connectionId: text("connection_id").notNull().unique(),
    moduleKey: text("module_key").notNull(),
    systemKey: text("system_key").notNull(),
    connectionName: text("connection_name").notNull(),
    ownerRole: text("owner_role").notNull().default("admin"),
    organizationId: text("organization_id").references(() => organizations.organizationId, { onDelete: "set null" }),
    status: text("status").notNull().default("contract"),
    connectionMode: text("connection_mode").notNull().default("api_bff"),
    secretReferenceStatus: text("secret_reference_status").notNull().default("not_configured"),
    connectionHealth: text("connection_health").notNull().default("unknown"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("integration_connections_module_status_idx").on(table.moduleKey, table.status),
    check("integration_connections_module_key_check", sql`${table.moduleKey} in ('crm', 'project', 'erp', 'files', 'analytics', 'loans', 'chat', 'operations', 'hr', 'learning', 'support', 'sites', 'sync')`),
    check("integration_connections_owner_role_check", sql`${table.ownerRole} in ('admin', 'crays-management', 'finance', 'reviewer')`),
    check("integration_connections_status_check", sql`${table.status} in ('contract', 'configured', 'active', 'paused', 'disabled')`),
    check("integration_connections_mode_check", sql`${table.connectionMode} in ('api_bff', 'sync_read_model', 'webhook_event', 'source_faithful_surface', 'transitional_embed')`),
    check("integration_connections_secret_reference_status_check", sql`${table.secretReferenceStatus} in ('not_configured', 'configured_reference', 'not_required')`),
    check("integration_connections_health_check", sql`${table.connectionHealth} in ('unknown', 'healthy', 'degraded', 'failed')`),
  ],
);

export const syncJobs = craysCore.table(
  "sync_jobs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    jobId: text("job_id").notNull().unique(),
    connectionId: text("connection_id").references(() => integrationConnections.connectionId, { onDelete: "set null" }),
    jobType: text("job_type").notNull(),
    craysEntityType: text("crays_entity_type"),
    craysEntityId: text("crays_entity_id"),
    direction: text("direction").notNull().default("read"),
    status: text("status").notNull().default("queued"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastErrorCode: text("last_error_code"),
    payloadSummary: jsonb("payload_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("sync_jobs_connection_status_idx").on(table.connectionId, table.status),
    index("sync_jobs_entity_status_idx").on(table.craysEntityType, table.craysEntityId, table.status),
    check("sync_jobs_type_check", sql`${table.jobType} in ('read_sync', 'command_sync', 'event_ingest', 'analytics_refresh', 'document_link', 'dashboard_refresh')`),
    check("sync_jobs_direction_check", sql`${table.direction} in ('read', 'write', 'bidirectional', 'event')`),
    check("sync_jobs_status_check", sql`${table.status} in ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'blocked')`),
    check("sync_jobs_attempt_count_check", sql`${table.attemptCount} >= 0`),
  ],
);

export const workbenchSavedViews = craysCore.table(
  "workbench_saved_views",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    viewId: text("view_id").notNull().unique(),
    moduleKey: text("module_key").notNull(),
    roleKey: text("role_key").notNull(),
    viewKey: text("view_key").notNull(),
    viewLabel: text("view_label").notNull(),
    viewType: text("view_type").notNull().default("table"),
    ownerRole: text("owner_role").notNull(),
    departmentKey: text("department_key").notNull(),
    workspaceKey: text("workspace_key").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    filters: jsonb("filters").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    display: jsonb("display").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    sourceSemantics: jsonb("source_semantics").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    status: text("status").notNull().default("active"),
    createdAt,
    updatedAt,
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("workbench_saved_views_unique").on(table.moduleKey, table.roleKey, table.viewKey),
    index("workbench_saved_views_role_module_idx").on(table.roleKey, table.moduleKey, table.status),
    index("workbench_saved_views_default_idx").on(table.moduleKey, table.roleKey, table.isDefault).where(sql`${table.status} = 'active'`),
    check("workbench_saved_views_module_check", sql`${table.moduleKey} in ('crm', 'project', 'erp', 'files', 'analytics', 'loans', 'operations')`),
    check(
      "workbench_saved_views_role_check",
      sql`${table.roleKey} in ('crays-management', 'admin', 'deal-manager', 'expansion-manager', 'finance', 'hr', 'franchise-candidate', 'franchise-partner', 'studio-manager', 'bank-partner', 'investor', 'landlord', 'vendor', 'reviewer', 'gym-member', 'guest')`,
    ),
    check("workbench_saved_views_view_type_check", sql`${table.viewType} in ('table', 'board', 'timeline', 'calendar', 'dashboard', 'matrix')`),
    check(
      "workbench_saved_views_owner_role_check",
      sql`${table.ownerRole} in ('crays-management', 'admin', 'deal-manager', 'expansion-manager', 'finance', 'hr', 'franchise-partner', 'studio-manager', 'reviewer')`,
    ),
    check("workbench_saved_views_status_check", sql`${table.status} in ('active', 'archived', 'system')`),
  ],
);

export const coreCommandRequests = craysCore.table(
  "core_command_requests",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    commandId: text("command_id").notNull().unique(),
    commandKey: text("command_key").notNull(),
    moduleKey: text("module_key").notNull(),
    actorAccountId: text("actor_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    actorRole: text("actor_role").notNull(),
    organizationId: text("organization_id").references(() => organizations.organizationId, { onDelete: "set null" }),
    organizationScope: jsonb("organization_scope").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    entityScope: jsonb("entity_scope").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    idempotencyKey: text("idempotency_key").notNull(),
    commandStatus: text("command_status").notNull().default("draft"),
    validationStatus: text("validation_status").notNull().default("not_started"),
    dryRunStatus: text("dry_run_status").notNull().default("not_requested"),
    targetApplyStatus: text("target_apply_status").notNull().default("blocked"),
    applyGate: text("apply_gate").notNull(),
    applyGateStatus: text("apply_gate_status").notNull().default("closed"),
    inputPayload: jsonb("input_payload").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    validationSummary: jsonb("validation_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    dryRunSummary: jsonb("dry_run_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    rollbackSummary: jsonb("rollback_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    auditSummary: jsonb("audit_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    sourceWriteEnabled: boolean("source_write_enabled").notNull().default(false),
    syncWriteEnabled: boolean("sync_write_enabled").notNull().default(false),
    toolApplyEnabled: boolean("tool_apply_enabled").notNull().default(false),
    uploadEnabled: boolean("upload_enabled").notNull().default(false),
    externalSendEnabled: boolean("external_send_enabled").notNull().default(false),
    financeActionEnabled: boolean("finance_action_enabled").notNull().default(false),
    bankActionEnabled: boolean("bank_action_enabled").notNull().default(false),
    releaseActionEnabled: boolean("release_action_enabled").notNull().default(false),
    createdAt,
    updatedAt,
    supersededByCommandId: text("superseded_by_command_id"),
  },
  (table) => [
    uniqueIndex("core_command_requests_idempotency_unique").on(table.commandKey, table.idempotencyKey),
    index("core_command_requests_module_status_idx").on(table.moduleKey, table.commandStatus, table.createdAt),
    index("core_command_requests_actor_status_idx").on(table.actorAccountId, table.actorRole, table.commandStatus),
    index("core_command_requests_entity_status_idx").on(table.entityType, table.entityId, table.commandStatus),
    check(
      "core_command_requests_key_check",
      sql`${table.commandKey} in ('project.work_item.create_or_update', 'crm.activity.log_or_task', 'files.package.metadata_link', 'erp.finance_summary.stage', 'loans.bank_package.checklist', 'sync.mapping.preview_refresh', 'operations.studio_action.stage')`,
    ),
    check("core_command_requests_module_check", sql`${table.moduleKey} in ('project', 'crm', 'files', 'erp', 'loans', 'sync', 'operations')`),
    check(
      "core_command_requests_actor_role_check",
      sql`${table.actorRole} in ('deal-manager', 'expansion-manager', 'finance', 'hr', 'reviewer', 'crays-management', 'admin', 'franchise-candidate', 'franchise-partner', 'bank-partner', 'landlord', 'vendor', 'studio-manager', 'system')`,
    ),
    check(
      "core_command_requests_status_check",
      sql`${table.commandStatus} in ('draft', 'validated', 'dry_run_ready', 'dry_run_failed', 'apply_blocked', 'superseded', 'cancelled', 'failed')`,
    ),
    check(
      "core_command_requests_entity_type_check",
      sql`${table.entityType} in ('project', 'work-item', 'company', 'person', 'opportunity', 'activity', 'task', 'calendar-event', 'document', 'package', 'prepared-offer', 'deal', 'property', 'property-case', 'bank-package', 'loan-case', 'sync-mapping', 'finance-summary', 'budget', 'evidence-package', 'opening-project', 'studio', 'member', 'training', 'employee', 'support-ticket')`,
    ),
    check("core_command_requests_validation_check", sql`${table.validationStatus} in ('not_started', 'valid', 'invalid', 'needs_review')`),
    check("core_command_requests_dry_run_check", sql`${table.dryRunStatus} in ('not_requested', 'ready', 'failed', 'stale')`),
    check("core_command_requests_apply_status_check", sql`${table.targetApplyStatus} in ('not_configured', 'blocked')`),
    check("core_command_requests_apply_gate_status_check", sql`${table.applyGateStatus} in ('closed', 'requested', 'revoked')`),
    check("core_command_requests_no_source_write_check", sql`${table.sourceWriteEnabled} = false`),
    check("core_command_requests_no_sync_write_check", sql`${table.syncWriteEnabled} = false`),
    check("core_command_requests_no_tool_apply_check", sql`${table.toolApplyEnabled} = false`),
    check("core_command_requests_no_upload_check", sql`${table.uploadEnabled} = false`),
    check("core_command_requests_no_external_send_check", sql`${table.externalSendEnabled} = false`),
    check("core_command_requests_no_finance_action_check", sql`${table.financeActionEnabled} = false`),
    check("core_command_requests_no_bank_action_check", sql`${table.bankActionEnabled} = false`),
    check("core_command_requests_no_release_action_check", sql`${table.releaseActionEnabled} = false`),
  ],
);

export const coreCommandPreviews = craysCore.table(
  "core_command_previews",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    previewId: text("preview_id").notNull().unique(),
    commandId: text("command_id")
      .notNull()
      .references(() => coreCommandRequests.commandId, { onDelete: "cascade" }),
    previewStatus: text("preview_status").notNull().default("draft"),
    previewType: text("preview_type").notNull().default("dry_run"),
    diffSummary: jsonb("diff_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    conflictSummary: jsonb("conflict_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    applyPayloadSummary: jsonb("apply_payload_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    targetApplyEnabled: boolean("target_apply_enabled").notNull().default(false),
    generatedByRole: text("generated_by_role"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    index("core_command_previews_command_status_idx").on(table.commandId, table.previewStatus),
    check("core_command_previews_status_check", sql`${table.previewStatus} in ('draft', 'ready', 'failed', 'stale', 'discarded')`),
    check("core_command_previews_type_check", sql`${table.previewType} in ('dry_run', 'validation', 'conflict_review', 'rollback_review')`),
    check("core_command_previews_no_target_apply_check", sql`${table.targetApplyEnabled} = false`),
  ],
);

export const coreCommandEvents = craysCore.table(
  "core_command_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    eventId: text("event_id").notNull().unique(),
    commandId: text("command_id")
      .notNull()
      .references(() => coreCommandRequests.commandId, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    eventStatus: text("event_status").notNull().default("recorded"),
    actorAccountId: text("actor_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    actorRole: text("actor_role"),
    payloadSummary: jsonb("payload_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt,
  },
  (table) => [
    index("core_command_events_command_created_idx").on(table.commandId, table.occurredAt),
    index("core_command_events_type_status_idx").on(table.eventType, table.eventStatus),
    check(
      "core_command_events_type_check",
      sql`${table.eventType} in ('command.drafted', 'command.validated', 'command.validation_failed', 'command.dry_run_ready', 'command.dry_run_failed', 'command.apply_blocked', 'command.superseded', 'command.cancelled', 'gate.requested', 'gate.revoked')`,
    ),
    check("core_command_events_status_check", sql`${table.eventStatus} in ('recorded', 'visible', 'suppressed', 'failed', 'revoked')`),
  ],
);

export const coreCommandApplyGateReviews = craysCore.table(
  "core_command_apply_gate_reviews",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    gateReviewId: text("gate_review_id").notNull().unique(),
    commandId: text("command_id")
      .notNull()
      .references(() => coreCommandRequests.commandId, { onDelete: "cascade" }),
    applyGate: text("apply_gate").notNull(),
    gateStatus: text("gate_status").notNull().default("blocked"),
    requestedByAccountId: text("requested_by_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    reviewedByAccountId: text("reviewed_by_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    reviewSummary: jsonb("review_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    index("core_command_apply_gate_reviews_command_status_idx").on(table.commandId, table.gateStatus),
    check("core_command_apply_gate_reviews_status_check", sql`${table.gateStatus} in ('blocked', 'requested', 'rejected', 'revoked')`),
  ],
);

export const conversations = craysCore.table(
  "conversations",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    conversationId: text("conversation_id").notNull().unique(),
    title: text("title").notNull(),
    conversationType: text("conversation_type").notNull(),
    relatedEntityType: text("related_entity_type").notNull(),
    relatedEntityId: text("related_entity_id").notNull(),
    organizationId: text("organization_id").references(() => organizations.organizationId, { onDelete: "set null" }),
    studioId: text("studio_id"),
    preparedOfferId: text("prepared_offer_id").references(() => preparedOffers.offerId, { onDelete: "set null" }),
    dealId: text("deal_id").references(() => deals.dealId, { onDelete: "set null" }),
    propertyCaseId: text("property_case_id").references(() => propertyCases.caseId, { onDelete: "set null" }),
    bankPackageId: text("bank_package_id").references(() => bankPackages.packageId, { onDelete: "set null" }),
    loanCaseId: text("loan_case_id").references(() => loanCases.loanCaseId, { onDelete: "set null" }),
    visibilityRoles: jsonb("visibility_roles").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    visibilityScopes: jsonb("visibility_scopes").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    status: text("status").notNull().default("open"),
    openedByRole: text("opened_by_role").notNull(),
    createdByAccountId: text("created_by_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("conversations_related_status_idx").on(table.relatedEntityType, table.relatedEntityId, table.status),
    index("conversations_deal_status_idx").on(table.dealId, table.status),
    index("conversations_prepared_offer_status_idx").on(table.preparedOfferId, table.status),
    index("conversations_property_case_status_idx").on(table.propertyCaseId, table.status),
    index("conversations_bank_package_status_idx").on(table.bankPackageId, table.status),
    index("conversations_last_message_idx").on(table.lastMessageAt),
    check(
      "conversations_type_check",
      sql`${table.conversationType} in ('candidate_deal_thread', 'bank_questions', 'property_lease_thread', 'opening_project_thread', 'support_thread', 'finance_review', 'internal_review')`,
    ),
    check(
      "conversations_related_type_check",
      sql`${table.relatedEntityType} in ('prepared-offer', 'deal', 'property-case', 'bank-package', 'loan-case', 'document', 'project', 'studio', 'member', 'support-ticket')`,
    ),
    check("conversations_status_check", sql`${table.status} in ('open', 'pending', 'closed', 'archived', 'blocked')`),
    check(
      "conversations_opened_by_role_check",
      sql`${table.openedByRole} in ('deal-manager', 'expansion-manager', 'finance', 'reviewer', 'crays-management', 'admin', 'franchise-candidate', 'franchise-partner', 'studio-manager', 'bank-partner', 'landlord', 'vendor', 'gym-member', 'hr', 'system')`,
    ),
  ],
);

export const conversationParticipants = craysCore.table(
  "conversation_participants",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    participantId: text("participant_id").notNull().unique(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.conversationId, { onDelete: "cascade" }),
    accountId: text("account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    organizationId: text("organization_id").references(() => organizations.organizationId, { onDelete: "set null" }),
    roleKey: text("role_key").notNull(),
    participantType: text("participant_type").notNull(),
    visibilityLevel: text("visibility_level").notNull().default("shared"),
    canReply: boolean("can_reply").notNull().default(true),
    canInvite: boolean("can_invite").notNull().default(false),
    canShareExternally: boolean("can_share_externally").notNull().default(false),
    status: text("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("conversation_participants_conversation_idx").on(table.conversationId, table.status),
    index("conversation_participants_account_idx").on(table.accountId, table.status),
    index("conversation_participants_org_role_idx").on(table.organizationId, table.roleKey, table.status),
    check(
      "conversation_participants_role_key_check",
      sql`${table.roleKey} in ('deal-manager', 'expansion-manager', 'finance', 'reviewer', 'crays-management', 'admin', 'franchise-candidate', 'franchise-partner', 'studio-manager', 'bank-partner', 'landlord', 'vendor', 'gym-member', 'hr', 'system')`,
    ),
    check(
      "conversation_participants_type_check",
      sql`${table.participantType} in ('internal', 'candidate', 'partner', 'bank', 'owner', 'vendor', 'member', 'system')`,
    ),
    check("conversation_participants_visibility_check", sql`${table.visibilityLevel} in ('internal', 'shared', 'external')`),
    check("conversation_participants_status_check", sql`${table.status} in ('active', 'invited', 'removed', 'blocked')`),
    check("conversation_participants_external_share_check", sql`${table.canShareExternally} = false or ${table.visibilityLevel} = 'shared'`),
  ],
);

export const messages = craysCore.table(
  "messages",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    messageId: text("message_id").notNull().unique(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.conversationId, { onDelete: "cascade" }),
    senderAccountId: text("sender_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    senderRole: text("sender_role").notNull(),
    channel: text("channel").notNull().default("in_app"),
    messageType: text("message_type").notNull(),
    body: text("body").notNull(),
    bodyFormat: text("body_format").notNull().default("plain_text"),
    visibility: text("visibility").notNull().default("shared"),
    attachmentRefs: jsonb("attachment_refs").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    relatedDocumentIds: jsonb("related_document_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    relatedTaskIds: jsonb("related_task_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    externalMessageRef: text("external_message_ref"),
    deliveryStatus: text("delivery_status").notNull().default("not_sent"),
    reviewStatus: text("review_status").notNull().default("not_required"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("messages_conversation_created_idx").on(table.conversationId, table.createdAt),
    index("messages_sender_created_idx").on(table.senderAccountId, table.createdAt),
    index("messages_delivery_status_idx").on(table.deliveryStatus, table.createdAt),
    check(
      "messages_sender_role_check",
      sql`${table.senderRole} in ('deal-manager', 'expansion-manager', 'finance', 'reviewer', 'crays-management', 'admin', 'franchise-candidate', 'franchise-partner', 'studio-manager', 'bank-partner', 'landlord', 'vendor', 'gym-member', 'hr', 'system')`,
    ),
    check("messages_channel_check", sql`${table.channel} in ('internal', 'shared_portal', 'mail', 'external_message', 'sms', 'in_app', 'push', 'system')`),
    check(
      "messages_type_check",
      sql`${table.messageType} in ('internal_note', 'shared_comment', 'external_message', 'bank_question', 'candidate_reply', 'support_message', 'system_notification')`,
    ),
    check("messages_body_format_check", sql`${table.bodyFormat} in ('plain_text', 'markdown')`),
    check("messages_visibility_check", sql`${table.visibility} in ('internal', 'shared', 'external')`),
    check("messages_delivery_status_check", sql`${table.deliveryStatus} in ('not_sent', 'queued', 'sent', 'delivered', 'read', 'failed', 'blocked')`),
    check("messages_review_status_check", sql`${table.reviewStatus} in ('not_required', 'needs_review', 'approved', 'rejected')`),
    check(
      "messages_external_visibility_check",
      sql`${table.visibility} <> 'external' or ${table.messageType} in ('external_message', 'bank_question', 'candidate_reply', 'support_message')`,
    ),
  ],
);

export const communicationConsents = craysCore.table(
  "communication_consents",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    consentId: text("consent_id").notNull().unique(),
    accountId: text("account_id").references(() => craysAccounts.accountId, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organizations.organizationId, { onDelete: "set null" }),
    channel: text("channel").notNull(),
    destinationHash: text("destination_hash").notNull(),
    status: text("status").notNull().default("pending"),
    purpose: text("purpose").notNull(),
    consentSource: text("consent_source").notNull().default("manual_review"),
    consentedAt: timestamp("consented_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("communication_consents_account_channel_idx").on(table.accountId, table.channel, table.status),
    index("communication_consents_hash_channel_idx").on(table.destinationHash, table.channel, table.status),
    check("communication_consents_channel_check", sql`${table.channel} in ('mail', 'external_message', 'sms', 'in_app', 'push')`),
    check("communication_consents_status_check", sql`${table.status} in ('pending', 'active', 'revoked', 'expired', 'blocked')`),
    check(
      "communication_consents_source_check",
      sql`${table.consentSource} in ('manual_review', 'candidate_portal', 'partner_portal', 'support_request', 'system_import')`,
    ),
    check("communication_consents_hash_check", sql`length(${table.destinationHash}) >= 32`),
  ],
);

export const communicationEvents = craysCore.table(
  "communication_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    eventId: text("event_id").notNull().unique(),
    conversationId: text("conversation_id").references(() => conversations.conversationId, { onDelete: "cascade" }),
    messageId: text("message_id").references(() => messages.messageId, { onDelete: "cascade" }),
    consentId: text("consent_id").references(() => communicationConsents.consentId, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    eventStatus: text("event_status").notNull().default("recorded"),
    channel: text("channel"),
    actorAccountId: text("actor_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    relatedEntityType: text("related_entity_type"),
    relatedEntityId: text("related_entity_id"),
    deliveryStatus: text("delivery_status"),
    payloadSummary: jsonb("payload_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt,
  },
  (table) => [
    index("communication_events_conversation_created_idx").on(table.conversationId, table.occurredAt),
    index("communication_events_message_created_idx").on(table.messageId, table.occurredAt),
    index("communication_events_type_status_idx").on(table.eventType, table.eventStatus),
    check(
      "communication_events_type_check",
      sql`${table.eventType} in ('conversation.opened', 'message.created', 'message.shared', 'message.queued', 'message.sent', 'message.delivered', 'message.failed', 'participant.added', 'participant.removed', 'consent.granted', 'consent.revoked', 'bank_question.opened', 'bank_question.answered')`,
    ),
    check("communication_events_status_check", sql`${table.eventStatus} in ('recorded', 'visible', 'suppressed', 'failed', 'revoked')`),
    check(
      "communication_events_channel_check",
      sql`${table.channel} is null or ${table.channel} in ('internal', 'shared_portal', 'mail', 'external_message', 'sms', 'in_app', 'push', 'system')`,
    ),
    check(
      "communication_events_delivery_status_check",
      sql`${table.deliveryStatus} is null or ${table.deliveryStatus} in ('not_sent', 'queued', 'sent', 'delivered', 'read', 'failed', 'blocked')`,
    ),
    check(
      "communication_events_related_type_check",
      sql`${table.relatedEntityType} is null or ${table.relatedEntityType} in ('prepared-offer', 'deal', 'property-case', 'bank-package', 'loan-case', 'document', 'project', 'studio', 'member', 'support-ticket')`,
    ),
  ],
);

export const candidateIntents = craysCore.table(
  "candidate_intents",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    intentId: text("intent_id").notNull().unique(),
    preparedOfferId: text("prepared_offer_id")
      .notNull()
      .references(() => preparedOffers.offerId, { onDelete: "restrict" }),
    dealId: text("deal_id").references(() => deals.dealId, { onDelete: "set null" }),
    candidateAccountId: text("candidate_account_id").references(() => craysAccounts.accountId, { onDelete: "restrict" }),
    candidateOrganizationId: text("candidate_organization_id").references(() => organizations.organizationId, { onDelete: "set null" }),
    intentType: text("intent_type").notNull(),
    intentSource: text("intent_source").notNull().default("candidate_portal"),
    status: text("status").notNull().default("draft"),
    reviewStatus: text("review_status").notNull().default("not_started"),
    regulatedCheckStatus: text("regulated_check_status").notNull().default("not_started"),
    equityCheckStatus: text("equity_check_status").notNull().default("not_started"),
    bankHandoffStatus: text("bank_handoff_status").notNull().default("not_started"),
    candidateAcknowledgedBoundary: boolean("candidate_acknowledged_boundary").notNull().default(false),
    acknowledgementSummary: jsonb("acknowledgement_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    financingRequestSummary: jsonb("financing_request_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    visibilityRoles: jsonb("visibility_roles").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedByAccountId: text("reviewed_by_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("candidate_intents_offer_status_idx").on(table.preparedOfferId, table.status),
    index("candidate_intents_candidate_status_idx").on(table.candidateAccountId, table.status),
    index("candidate_intents_type_status_idx").on(table.intentType, table.status),
    index("candidate_intents_deal_status_idx").on(table.dealId, table.status),
    check("candidate_intents_type_check", sql`${table.intentType} in ('purchase', 'financing')`),
    check("candidate_intents_source_check", sql`${table.intentSource} in ('candidate_portal', 'deal_manager_review', 'internal_review')`),
    check("candidate_intents_status_check", sql`${table.status} in ('draft', 'submitted', 'under_review', 'accepted', 'withdrawn', 'rejected', 'expired')`),
    check("candidate_intents_review_status_check", sql`${table.reviewStatus} in ('not_started', 'pending', 'approved', 'rejected')`),
    check(
      "candidate_intents_regulated_status_check",
      sql`${table.regulatedCheckStatus} in ('not_started', 'required', 'in_review', 'cleared', 'failed', 'expired')`,
    ),
    check("candidate_intents_equity_status_check", sql`${table.equityCheckStatus} in ('not_started', 'requested', 'in_review', 'verified', 'failed')`),
    check("candidate_intents_bank_handoff_status_check", sql`${table.bankHandoffStatus} in ('not_started', 'blocked', 'ready', 'released', 'revoked')`),
    check("candidate_intents_no_auto_bank_handoff_check", sql`${table.bankHandoffStatus} = 'not_started' or ${table.status} = 'accepted'`),
    check("candidate_intents_submission_ack_check", sql`${table.status} <> 'submitted' or ${table.candidateAcknowledgedBoundary} = true`),
  ],
);

export const candidateIntentEvents = craysCore.table(
  "candidate_intent_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    eventId: text("event_id").notNull().unique(),
    intentId: text("intent_id")
      .notNull()
      .references(() => candidateIntents.intentId, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    eventStatus: text("event_status").notNull().default("recorded"),
    actorAccountId: text("actor_account_id").references(() => craysAccounts.accountId, { onDelete: "set null" }),
    actorRole: text("actor_role"),
    relatedEntityType: text("related_entity_type"),
    relatedEntityId: text("related_entity_id"),
    visibilityRoles: jsonb("visibility_roles").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    payloadSummary: jsonb("payload_summary").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt,
  },
  (table) => [
    index("candidate_intent_events_intent_created_idx").on(table.intentId, table.occurredAt),
    index("candidate_intent_events_type_status_idx").on(table.eventType, table.eventStatus),
    check(
      "candidate_intent_events_type_check",
      sql`${table.eventType} in ('intent.drafted', 'intent.submitted', 'intent.withdrawn', 'intent.review_started', 'intent.reviewed', 'purchase_intent.recorded', 'financing_intent.recorded', 'regulated_path.blocked')`,
    ),
    check("candidate_intent_events_status_check", sql`${table.eventStatus} in ('recorded', 'visible', 'suppressed', 'failed', 'revoked')`),
    check(
      "candidate_intent_events_actor_role_check",
      sql`${table.actorRole} is null or ${table.actorRole} in ('franchise-candidate', 'deal-manager', 'finance', 'reviewer', 'crays-management', 'admin', 'system')`,
    ),
    check(
      "candidate_intent_events_related_type_check",
      sql`${table.relatedEntityType} is null or ${table.relatedEntityType} in ('prepared-offer', 'deal', 'candidate-intent', 'conversation', 'document')`,
    ),
  ],
);

export const coreIdentitySchema = {
  craysAccounts,
  authIdentities,
  nostrIdentities,
  nip05Handles,
  organizations,
  organizationMemberships,
  roleAssignments,
  nostrChallenges,
  keyHandoffEvents,
  auditEvents,
};

export const coreDomainSchema = {
  properties,
  propertyCases,
  locationAnalyses,
  evidencePackages,
  preparedOffers,
  deals,
  financialModels,
  bankPackages,
  loanCases,
  documentPackageLinks,
  workflowEvents,
  externalRecordMaps,
  integrationConnections,
  syncJobs,
  workbenchSavedViews,
};

export const communicationPersistenceSchema = {
  conversations,
  conversationParticipants,
  messages,
  communicationConsents,
  communicationEvents,
};

export const candidateIntentPersistenceSchema = {
  candidateIntents,
  candidateIntentEvents,
};
