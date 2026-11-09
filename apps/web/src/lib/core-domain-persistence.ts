import { getCoreDatabaseRuntimeState, type CoreDatabaseRuntimeState } from "../db/client";

export type CoreDomainConnectionState = "contract_ready" | "configured";

export type CoreDomainTableKey =
  | "properties"
  | "property-cases"
  | "location-analyses"
  | "evidence-packages"
  | "prepared-offers"
  | "deals"
  | "financial-models"
  | "bank-packages"
  | "loan-cases"
  | "document-package-links"
  | "workflow-events"
  | "external-record-maps"
  | "integration-connections"
  | "sync-jobs";

export type CoreDomainOwner = "Deal" | "Expansion" | "Finance" | "Documents" | "Events" | "Integrations";
export type CoreDomainAccessPattern = "candidate_deal" | "property_handoff" | "bank_package" | "document_scope" | "event_stream" | "sync_control";

export type CoreDomainTable = {
  key: CoreDomainTableKey;
  tableName: string;
  label: string;
  purpose: string;
  owner: CoreDomainOwner;
  accessPattern: CoreDomainAccessPattern;
  rlsRequired: true;
  auditLevel: "standard" | "sensitive" | "append_only";
};

export type CoreDomainIndex = {
  tableName: string;
  name: string;
  columns: string[];
  purpose: string;
};

export type CoreDomainRlsRule = {
  tableName: string;
  policyIntent: string;
  enforcement: "deny_until_context" | "service_role_only" | "append_only";
};

export type CoreDomainMigrationContract = {
  version: "0002_core_domain";
  migrationPath: "database/migrations/0002_core_domain.sql";
  providerNeutral: true;
  executionStatus: "not_run";
  reviewRequiredBeforeProduction: true;
};

export type CoreDomainPersistenceState = {
  connectionState: CoreDomainConnectionState;
  databaseUrlConfigured: boolean;
  databaseRuntime: CoreDatabaseRuntimeState;
  schemaVersion: CoreDomainMigrationContract["version"];
  requiredTables: number;
  rlsProtectedTables: number;
  migration: CoreDomainMigrationContract;
  guardrails: string[];
};

export const coreDomainTables: CoreDomainTable[] = [
  {
    key: "properties",
    tableName: "crays_core.properties",
    label: "Properties",
    purpose: "Owner-submitted or internally sourced real estate opportunities before active deal handoff.",
    owner: "Expansion",
    accessPattern: "property_handoff",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "property-cases",
    tableName: "crays_core.property_cases",
    label: "Property cases",
    purpose: "Structured Expansion review, analysis and handoff state for each property.",
    owner: "Expansion",
    accessPattern: "property_handoff",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "location-analyses",
    tableName: "crays_core.location_analyses",
    label: "Location analyses",
    purpose: "Server-side location intelligence and property-fit evidence summaries.",
    owner: "Expansion",
    accessPattern: "property_handoff",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "evidence-packages",
    tableName: "crays_core.evidence_packages",
    label: "Evidence packages",
    purpose: "Released and internal evidence bundles for candidates, owners, banks and internal reviewers.",
    owner: "Deal",
    accessPattern: "candidate_deal",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "prepared-offers",
    tableName: "crays_core.prepared_offers",
    label: "Prepared offers",
    purpose: "Candidate-facing prepared studio cases with teaser/detail release states.",
    owner: "Deal",
    accessPattern: "candidate_deal",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "deals",
    tableName: "crays_core.deals",
    label: "Deals",
    purpose: "Candidate-to-franchise-partner lifecycle from interest through handoff.",
    owner: "Deal",
    accessPattern: "candidate_deal",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "financial-models",
    tableName: "crays_core.financial_models",
    label: "Financial models",
    purpose: "Versioned business and finance assumptions linked to prepared offers or deals.",
    owner: "Finance",
    accessPattern: "bank_package",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "bank-packages",
    tableName: "crays_core.bank_packages",
    label: "Bank packages",
    purpose: "Reviewed lender package state after KYC, equity check and deal readiness review.",
    owner: "Deal",
    accessPattern: "bank_package",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "loan-cases",
    tableName: "crays_core.loan_cases",
    label: "Loan cases",
    purpose: "Bank review, questions, conditions and decision state connected to released bank packages.",
    owner: "Finance",
    accessPattern: "bank_package",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "document-package-links",
    tableName: "crays_core.document_package_links",
    label: "Document package links",
    purpose: "Document-to-package metadata and role visibility links without storing file binaries.",
    owner: "Documents",
    accessPattern: "document_scope",
    rlsRequired: true,
    auditLevel: "sensitive",
  },
  {
    key: "workflow-events",
    tableName: "crays_core.workflow_events",
    label: "Workflow events",
    purpose: "Business event stream for dashboards, audit context and notifications.",
    owner: "Events",
    accessPattern: "event_stream",
    rlsRequired: true,
    auditLevel: "append_only",
  },
  {
    key: "external-record-maps",
    tableName: "crays_core.external_record_maps",
    label: "External record maps",
    purpose: "CRAYS-to-module record mapping for CRM, Project, ERP, Files, Loans and other adapters.",
    owner: "Integrations",
    accessPattern: "sync_control",
    rlsRequired: true,
    auditLevel: "standard",
  },
  {
    key: "integration-connections",
    tableName: "crays_core.integration_connections",
    label: "Integration connections",
    purpose: "Non-secret adapter connection status, owner, mode and health metadata.",
    owner: "Integrations",
    accessPattern: "sync_control",
    rlsRequired: true,
    auditLevel: "standard",
  },
  {
    key: "sync-jobs",
    tableName: "crays_core.sync_jobs",
    label: "Sync jobs",
    purpose: "Read, command, event and analytics synchronization job state.",
    owner: "Integrations",
    accessPattern: "sync_control",
    rlsRequired: true,
    auditLevel: "standard",
  },
];

export const coreDomainIndexes: CoreDomainIndex[] = [
  {
    tableName: "crays_core.properties",
    name: "properties_owner_status_idx",
    columns: ["owner_organization_id", "status"],
    purpose: "Expansion owner property review queues.",
  },
  {
    tableName: "crays_core.property_cases",
    name: "property_cases_assigned_status_idx",
    columns: ["assigned_account_id", "status"],
    purpose: "Assigned property case worklists.",
  },
  {
    tableName: "crays_core.prepared_offers",
    name: "prepared_offers_status_release_idx",
    columns: ["status", "candidate_release_state"],
    purpose: "Candidate release and teaser/detail routing.",
  },
  {
    tableName: "crays_core.deals",
    name: "deals_candidate_stage_idx",
    columns: ["candidate_account_id", "stage", "status"],
    purpose: "Candidate deal lifecycle lookup.",
  },
  {
    tableName: "crays_core.bank_packages",
    name: "bank_packages_bank_partner_idx",
    columns: ["bank_partner_organization_id", "release_status"],
    purpose: "Bank partner package queues after CRAYS review.",
  },
  {
    tableName: "crays_core.workflow_events",
    name: "workflow_events_related_created_idx",
    columns: ["related_entity_type", "related_entity_id", "occurred_at"],
    purpose: "Business object event timelines.",
  },
  {
    tableName: "crays_core.external_record_maps",
    name: "external_record_maps_crays_idx",
    columns: ["crays_entity_type", "crays_entity_id"],
    purpose: "Resolve operational source records from CRAYS domain entities.",
  },
  {
    tableName: "crays_core.sync_jobs",
    name: "sync_jobs_connection_status_idx",
    columns: ["connection_id", "status"],
    purpose: "Adapter sync queue monitoring.",
  },
];

export const coreDomainRlsRules: CoreDomainRlsRule[] = coreDomainTables.map((table) => ({
  tableName: table.tableName,
  policyIntent:
    table.auditLevel === "append_only"
      ? "Append-only workflow event access with role-scoped readers."
      : "Deny by default until CRAYS account, role, organization and entity context is set.",
  enforcement: table.auditLevel === "append_only" ? "append_only" : table.accessPattern === "sync_control" ? "service_role_only" : "deny_until_context",
}));

export const coreDomainMigrationContract: CoreDomainMigrationContract = {
  version: "0002_core_domain",
  migrationPath: "database/migrations/0002_core_domain.sql",
  providerNeutral: true,
  executionStatus: "not_run",
  reviewRequiredBeforeProduction: true,
};

export const coreDomainPersistenceGuardrails = [
  "CRAYS Core DB is the control layer for deals, properties, evidence, bank packages, workflow events and integration maps.",
  "Candidate, Bank Partner and Real Estate Owner web surfaces consume CRAYS contracts instead of owning separate truth.",
  "Deal Manager owns candidate/deal execution; Expansion Manager owns partner and property development until explicit handoff.",
  "Bank package visibility starts only after KYC, equity check and CRAYS deal readiness review.",
  "Location intelligence provider details, keys and raw payloads remain server-side.",
  "Document package links store metadata and visibility, not binary files.",
  "Integration connection records store non-secret status and references only.",
  "Row access must be denied by default and reinforced by server-side permission checks.",
];

export function getCoreDomainPersistenceState(env: Record<string, string | undefined> = process.env): CoreDomainPersistenceState {
  const databaseUrlConfigured = Boolean(env.CRAYS_DATABASE_URL);
  const databaseRuntime = getCoreDatabaseRuntimeState(env);

  return {
    connectionState: databaseUrlConfigured ? "configured" : "contract_ready",
    databaseUrlConfigured,
    databaseRuntime,
    schemaVersion: coreDomainMigrationContract.version,
    requiredTables: coreDomainTables.length,
    rlsProtectedTables: coreDomainTables.filter((table) => table.rlsRequired).length,
    migration: coreDomainMigrationContract,
    guardrails: coreDomainPersistenceGuardrails,
  };
}

export function coreDomainTableByKey(key: string | null | undefined) {
  return coreDomainTables.find((table) => table.key === key);
}
