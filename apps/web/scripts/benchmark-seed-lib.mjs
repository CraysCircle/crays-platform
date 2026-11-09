import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const appRoot = resolve(scriptDir, "..");
export const repoRoot = resolve(appRoot, "..");
export const defaultWorkspaceDataPath = resolve(repoRoot, "investments-static", "crays-workspace-data.js");
export const defaultSeedBatchId = "crays-benchmark-20260710-v1";

const sourceFileLabel = "investments-static/crays-workspace-data.js";
const dataOrigin = "local_benchmark_fixture";
const cleanupPolicy = "delete_by_seed_batch_id";

const blockedTerms = [
  ["Fra", "ppe"].join(""),
  ["Twen", "ty"].join(""),
  ["Pla", "ne"].join(""),
  ["ERP", "Next"].join(""),
  ["Game", "plan"].join(""),
  ["Git", "Hub"].join(""),
  ["Tar", "gomo"].join(""),
  ["Revo", "lut"].join(""),
  ["Immobilien", "scout"].join(""),
  ["Immo", "Scout"].join(""),
  ["Scout", "24"].join(""),
  ["open", " source"].join(""),
];

const candidateDisplayNames = [
  "Johannes Adler",
  "Clara Hoffmann",
  "Deniz Yilmaz",
  "Lara Keller",
  "Sarah Neumann",
  "Tobias Berger",
  "Mara Lindner",
  "Jonas Reuter",
  "Nina Vogt",
  "Felix Brandt",
];

const internalRoleDisplayNames = {
  "deal-manager": "Mara Lindner",
  "expansion-manager": "Jonas Reuter",
  finance: "Nina Vogt",
  reviewer: "Felix Brandt",
  admin: "Tobias Berger",
  investor: "Clara Hoffmann",
  system: "CRAYS Operations Service",
};

function legalSuffix(country) {
  if (country === "United States") return "LLC";
  if (country === "United Kingdom" || country === "Ireland") return "Ltd.";
  if (country === "Spain") return "S.L.";
  if (country === "Portugal") return "Lda.";
  if (country === "Italy") return "S.r.l.";
  if (country === "Switzerland" || country === "Austria" || country === "Luxembourg") return "AG";
  if (country === "France") return "S.A.S.";
  if (country === "Singapore") return "Pte. Ltd.";
  if (country === "Canada") return "Inc.";
  if (country === "Sweden") return "AB";
  if (country === "Norway") return "AS";
  if (country === "Poland") return "Sp. z o.o.";
  if (country === "Czech Republic") return "s.r.o.";
  if (country === "Cayman Islands" || country === "Cyprus") return "Ltd.";
  if (country === "United Arab Emirates") return "LLC";
  return "GmbH";
}

function compactMarketName(pipeline = {}, property = {}) {
  return sanitizeText([pipeline.city || property.city, pipeline.district || property.district].filter(Boolean).join(" ")) || "Central Market";
}

function ownerOrganizationName(pipeline = {}, property = {}) {
  const district = sanitizeText(pipeline.district || property.district || pipeline.city || property.city || "Central");
  return `${district} Retail Properties ${legalSuffix(pipeline.country)}`;
}

function bankOrganizationName(pipeline = {}) {
  const city = sanitizeText(pipeline.city || "Regional");
  return `${city} Commercial Finance ${legalSuffix(pipeline.country)}`;
}

function propertyLeaseTitle(pipeline = {}, property = {}) {
  return `${compactMarketName(pipeline, property)} Studio Lease`;
}

function accountDisplayName(user = {}, index = 0) {
  const role = mapRole(user.role);
  if (role === "franchise-candidate") return candidateDisplayNames[index % candidateDisplayNames.length];
  return internalRoleDisplayNames[role] ?? candidateDisplayNames[index % candidateDisplayNames.length];
}

export const requiredBenchmarkSeedTables = [
  "crays_accounts",
  "organizations",
  "organization_memberships",
  "role_assignments",
  "properties",
  "property_cases",
  "location_analyses",
  "evidence_packages",
  "prepared_offers",
  "deals",
  "financial_models",
  "bank_packages",
  "loan_cases",
  "document_package_links",
  "workflow_events",
  "external_record_maps",
  "integration_connections",
  "sync_jobs",
  "candidate_intents",
  "candidate_intent_events",
  "location_evidence_runs",
  "property_supply_records",
  "rent_potential_models",
  "deal_economics_models",
  "banking_evidence_snapshots",
  "evidence_release_gates",
  "evidence_audit_events",
];

export const benchmarkSeedTableOrder = [
  "organizations",
  "crays_accounts",
  "organization_memberships",
  "role_assignments",
  "properties",
  "property_cases",
  "location_analyses",
  "evidence_packages",
  "prepared_offers",
  "deals",
  "financial_models",
  "bank_packages",
  "loan_cases",
  "document_package_links",
  "workflow_events",
  "external_record_maps",
  "integration_connections",
  "sync_jobs",
  "candidate_intents",
  "candidate_intent_events",
  "location_evidence_runs",
  "property_supply_records",
  "rent_potential_models",
  "deal_economics_models",
  "banking_evidence_snapshots",
  "evidence_release_gates",
  "evidence_audit_events",
];

export const cleanupOrder = [
  "evidence_audit_events",
  "evidence_release_gates",
  "banking_evidence_snapshots",
  "deal_economics_models",
  "rent_potential_models",
  "property_supply_records",
  "location_evidence_runs",
  "candidate_intent_events",
  "candidate_intents",
  "sync_jobs",
  "external_record_maps",
  "workflow_events",
  "document_package_links",
  "loan_cases",
  "bank_packages",
  "financial_models",
  "deals",
  "prepared_offers",
  "evidence_packages",
  "location_analyses",
  "property_cases",
  "properties",
  "role_assignments",
  "organization_memberships",
  "crays_accounts",
  "organizations",
];

const tableColumns = {
  organizations: [
    "organization_id",
    "name",
    "organization_type",
    "status",
    "parent_organization_id",
  ],
  crays_accounts: [
    "account_id",
    "crays_id",
    "display_name",
    "primary_contact",
    "primary_contact_type",
    "default_role",
    "status",
  ],
  organization_memberships: [
    "membership_id",
    "account_id",
    "organization_id",
    "role_key",
    "status",
    { name: "scopes", json: true },
  ],
  role_assignments: [
    "assignment_id",
    "account_id",
    "role_key",
    "organization_id",
    "entity_type",
    "entity_id",
    "nostr_binding_required",
    "nostr_binding_status",
    "status",
  ],
  properties: [
    "property_id",
    "owner_organization_id",
    "owner_account_id",
    "title",
    "address_summary",
    "city",
    "country",
    "property_type",
    "intake_source",
    "status",
    { name: "visibility_scope", json: true },
    { name: "metadata", json: true },
  ],
  property_cases: [
    "case_id",
    "property_id",
    "owner_role",
    "assigned_account_id",
    "related_deal_id",
    "status",
    "current_phase",
    "handoff_required",
    "handoff_status",
    { name: "review_summary", json: true },
    { name: "metadata", json: true },
  ],
  location_analyses: [
    "analysis_id",
    "property_case_id",
    "analysis_type",
    "status",
    { name: "score_snapshot", json: true },
    { name: "kpi_snapshot", json: true },
    { name: "source_summary", json: true },
    "reviewed_by_account_id",
    "reviewed_at",
  ],
  evidence_packages: [
    "package_id",
    "related_entity_type",
    "related_entity_id",
    "owner_role",
    "release_state",
    { name: "visibility_roles", json: true },
    { name: "summary", json: true },
    "approved_by_account_id",
    "approved_at",
  ],
  prepared_offers: [
    "offer_id",
    "property_case_id",
    "location_analysis_id",
    "evidence_package_id",
    "title",
    "market",
    "owner_role",
    "status",
    "candidate_release_state",
    "public_teaser_enabled",
    "partner_handoff_status",
    { name: "metrics_snapshot", json: true },
    { name: "metadata", json: true },
  ],
  deals: [
    "deal_id",
    "prepared_offer_id",
    "candidate_account_id",
    "franchise_partner_account_id",
    "deal_manager_account_id",
    "organization_id",
    "stage",
    "status",
    "kyc_aml_status",
    "equity_status",
    "bank_handoff_status",
    "property_handoff_status",
    { name: "required_actions", json: true },
    { name: "metadata", json: true },
  ],
  financial_models: [
    "model_id",
    "prepared_offer_id",
    "deal_id",
    "version_label",
    "owner_role",
    "status",
    { name: "summary", json: true },
    { name: "assumptions", json: true },
    "approved_by_account_id",
    "approved_at",
  ],
  bank_packages: [
    "package_id",
    "deal_id",
    "financial_model_id",
    "evidence_package_id",
    "bank_partner_organization_id",
    "owner_role",
    "status",
    "release_status",
    "prepared_by_account_id",
    "released_by_account_id",
    "released_at",
    { name: "required_checks", json: true },
    { name: "metadata", json: true },
  ],
  loan_cases: [
    "loan_case_id",
    "bank_package_id",
    "bank_partner_organization_id",
    "status",
    "decision_state",
    { name: "requested_amount_summary", json: true },
    { name: "conditions_summary", json: true },
    { name: "metadata", json: true },
  ],
  document_package_links: [
    "link_id",
    "package_type",
    "package_id",
    "document_ref_type",
    "document_ref_id",
    "document_group",
    { name: "visibility_roles", json: true },
    "status",
    "required_for",
    "created_by_account_id",
    { name: "metadata", json: true },
  ],
  workflow_events: [
    "event_id",
    "event_type",
    "actor_account_id",
    "related_entity_type",
    "related_entity_id",
    "role_key",
    { name: "visibility_roles", json: true },
    "event_status",
    { name: "payload", json: true },
    "occurred_at",
  ],
  external_record_maps: [
    "map_id",
    "crays_entity_type",
    "crays_entity_id",
    "external_system",
    "external_entity_type",
    "external_entity_id",
    "external_url",
    "sync_direction",
    "sync_status",
    "last_synced_at",
    { name: "metadata", json: true },
  ],
  integration_connections: [
    "connection_id",
    "module_key",
    "system_key",
    "connection_name",
    "owner_role",
    "organization_id",
    "status",
    "connection_mode",
    "secret_reference_status",
    "connection_health",
    { name: "metadata", json: true },
  ],
  sync_jobs: [
    "job_id",
    "connection_id",
    "job_type",
    "crays_entity_type",
    "crays_entity_id",
    "direction",
    "status",
    "attempt_count",
    "last_error_code",
    { name: "payload_summary", json: true },
    "scheduled_at",
    "started_at",
    "finished_at",
  ],
  candidate_intents: [
    "intent_id",
    "prepared_offer_id",
    "deal_id",
    "candidate_account_id",
    "candidate_organization_id",
    "intent_type",
    "intent_source",
    "status",
    "review_status",
    "regulated_check_status",
    "equity_check_status",
    "bank_handoff_status",
    "candidate_acknowledged_boundary",
    { name: "acknowledgement_summary", json: true },
    { name: "financing_request_summary", json: true },
    { name: "visibility_roles", json: true },
    "submitted_at",
    "reviewed_by_account_id",
    "reviewed_at",
    "expires_at",
    { name: "metadata", json: true },
  ],
  candidate_intent_events: [
    "event_id",
    "intent_id",
    "event_type",
    "event_status",
    "actor_account_id",
    "actor_role",
    "related_entity_type",
    "related_entity_id",
    { name: "visibility_roles", json: true },
    { name: "payload_summary", json: true },
    "occurred_at",
  ],
  location_evidence_runs: [
    "run_id",
    "property_case_id",
    "analysis_id",
    "evidence_package_id",
    "run_mode",
    "status",
    "request_class",
    "coordinate_reference",
    "travel_mode",
    "travel_time_minutes",
    { name: "request_summary", json: true },
    { name: "derived_evidence", json: true },
    "confidence_state",
    "review_status",
    "reviewed_by_account_id",
    "reviewed_at",
    "expires_at",
  ],
  property_supply_records: [
    "supply_record_id",
    "property_id",
    "property_case_id",
    "intake_source",
    "normalization_status",
    "dedupe_status",
    "address_resolution_status",
    { name: "rent_area_summary", json: true },
    { name: "availability_summary", json: true },
    "contact_redaction_state",
    "attachment_metadata_state",
    "release_state",
  ],
  rent_potential_models: [
    "model_id",
    "property_case_id",
    "prepared_offer_id",
    "model_status",
    { name: "rent_range_summary", json: true },
    { name: "sensitivity_summary", json: true },
    { name: "tenant_fit_summary", json: true },
    { name: "market_context_summary", json: true },
    "reviewer_confidence",
    "release_state",
    "reviewed_by_account_id",
    "reviewed_at",
  ],
  deal_economics_models: [
    "model_id",
    "prepared_offer_id",
    "deal_id",
    "property_case_id",
    "model_status",
    { name: "capex_summary", json: true },
    { name: "opening_budget_summary", json: true },
    { name: "revenue_assumption_summary", json: true },
    { name: "franchise_price_summary", json: true },
    { name: "prepared_deal_score", json: true },
    "reviewer_confidence",
    "release_state",
    "reviewed_by_account_id",
    "reviewed_at",
  ],
  banking_evidence_snapshots: [
    "snapshot_id",
    "bank_package_id",
    "loan_case_id",
    "prepared_offer_id",
    "snapshot_status",
    "consent_state",
    "account_information_readiness",
    "transaction_evidence_readiness",
    "source_of_funds_readiness",
    { name: "package_checklist_summary", json: true },
    { name: "finance_review_summary", json: true },
    "release_state",
    "reviewed_by_account_id",
    "reviewed_at",
  ],
  evidence_release_gates: [
    "gate_id",
    "related_entity_type",
    "related_entity_id",
    "evidence_class",
    "target_audience",
    "gate_status",
    { name: "required_approvals", json: true },
    { name: "redaction_summary", json: true },
    { name: "release_summary", json: true },
    "approved_by_account_id",
    "approved_at",
    "revoked_at",
  ],
  evidence_audit_events: [
    "audit_event_id",
    "event_type",
    "event_status",
    "related_entity_type",
    "related_entity_id",
    "actor_account_id",
    "actor_role",
    "evidence_class",
    { name: "payload_summary", json: true },
    "occurred_at",
  ],
};

const conflictColumns = {
  organizations: "organization_id",
  crays_accounts: "account_id",
  organization_memberships: "membership_id",
  role_assignments: "assignment_id",
  properties: "property_id",
  property_cases: "case_id",
  location_analyses: "analysis_id",
  evidence_packages: "package_id",
  prepared_offers: "offer_id",
  deals: "deal_id",
  financial_models: "model_id",
  bank_packages: "package_id",
  loan_cases: "loan_case_id",
  document_package_links: "link_id",
  workflow_events: "event_id",
  external_record_maps: "map_id",
  integration_connections: "connection_id",
  sync_jobs: "job_id",
  candidate_intents: "intent_id",
  candidate_intent_events: "event_id",
  location_evidence_runs: "run_id",
  property_supply_records: "supply_record_id",
  rent_potential_models: "model_id",
  deal_economics_models: "model_id",
  banking_evidence_snapshots: "snapshot_id",
  evidence_release_gates: "gate_id",
  evidence_audit_events: "audit_event_id",
};

export function parseCliArgs(argv = process.argv.slice(2)) {
  const args = new Map();
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rest] = arg.slice(2).split("=");
    args.set(rawKey, rest.length ? rest.join("=") : "true");
  }
  return args;
}

export function getSeedBatchId(args = new Map()) {
  return args.get("seed-batch-id") || process.env.CRAYS_BENCHMARK_SEED_BATCH_ID || defaultSeedBatchId;
}

export function getSeedPrefix(seedBatchId) {
  return `bench_${slug(seedBatchId).replace(/-/g, "_").slice(0, 44)}`;
}

export function normalizeLimit(value) {
  if (!value || value === "all" || value === "full") return Number.POSITIVE_INFINITY;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : Number.POSITIVE_INFINITY;
}

export function loadWorkspaceData(dataPath = defaultWorkspaceDataPath) {
  if (!existsSync(dataPath)) {
    throw new Error(`Workspace data source was not found at ${dataPath}.`);
  }

  const code = readFileSync(dataPath, "utf8");
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: dataPath, timeout: 60_000 });
  const db = context.window.CRAYS_WORKSPACE_DATA;

  if (!db || typeof db !== "object") {
    throw new Error("Workspace data source did not expose CRAYS_WORKSPACE_DATA.");
  }

  return db;
}

export function buildBenchmarkSeed({ seedBatchId = defaultSeedBatchId, limit = Number.POSITIVE_INFINITY, now = new Date() } = {}) {
  const db = loadWorkspaceData();
  const idFor = createIdFactory(seedBatchId);
  const seedPrefix = getSeedPrefix(seedBatchId);
  const generatedAt = now.toISOString();
  const selectedPipelineRows = take(db.pipelineGyms || [], limit);
  const selectedPipelineIds = new Set(selectedPipelineRows.map((row) => row.id));
  const selectedProperties = (db.properties || []).filter((row) => selectedPipelineIds.has(row.pipelineGymId));
  const selectedCandidateCases = (db.candidateCases || []).filter((row) => selectedPipelineIds.has(row.pipelineGymId));
  const selectedPublicDeals = (db.publicFranchiseDeals || []).filter((row) => selectedPipelineIds.has(row.pipelineGymId));
  const selectedDealIds = new Set([
    ...selectedCandidateCases.map((row) => row.dealId),
    ...selectedPublicDeals.map((row) => row.id),
  ]);
  const selectedProjectIds = new Set(selectedCandidateCases.map((row) => row.projectId).filter(Boolean));
  const selectedCandidateUserIds = new Set(selectedCandidateCases.map((row) => row.candidateUserId).filter(Boolean));
  const selectedOrgIds = new Set(selectedCandidateCases.map((row) => userById(db, row.candidateUserId)?.organizationId).filter(Boolean));
  const selectedSourceOrganizations = (db.organizations || []).filter((row) => selectedOrgIds.has(row.id));
  const selectedAccountRows = (db.accountUsers || []).filter((row) => selectedCandidateUserIds.has(row.id) || selectedOrgIds.has(row.organizationId));
  const dealIdByPipelineId = new Map(selectedPublicDeals.map((row) => [row.pipelineGymId, row.id]));
  const propertyByPipelineId = new Map(selectedProperties.map((row) => [row.pipelineGymId, row]));
  const pipelineById = new Map(selectedPipelineRows.map((row) => [row.id, row]));
  const propertyCaseIdByPipeline = new Map();
  const preparedOfferIdByPipeline = new Map();
  const firstDealIdByPipeline = new Map();
  const bankPackageIdByDealId = new Map();
  const financialModelIdByOfferId = new Map();
  const loanCaseIdByDealId = new Map();
  const candidateAccountIdBySourceUser = new Map();
  const candidateOrganizationIdBySourceUser = new Map();
  const caseByDealId = new Map();
  const caseByProjectId = new Map();

  selectedCandidateCases.forEach((row) => {
    if (!caseByDealId.has(row.dealId)) caseByDealId.set(row.dealId, row);
    if (!caseByProjectId.has(row.projectId)) caseByProjectId.set(row.projectId, row);
  });

  const seed = (sourceCollection, sourceId, extra = {}) => ({
    seed_batch_id: seedBatchId,
    data_origin: dataOrigin,
    source_file: sourceFileLabel,
    source_collection: sourceCollection,
    source_id: String(sourceId || ""),
    cleanup_policy: cleanupPolicy,
    generated_at: generatedAt,
    ...extra,
  });
  const tag = (sourceCollection, sourceId, payload = {}) => ({
    ...payload,
    __seed: seed(sourceCollection, sourceId),
  });

  const craysOrgId = idFor("org", "crays-core");
  const systemAccountId = idFor("account", "system");
  const expansionAccountId = idFor("account", "expansion-manager");
  const dealManagerAccountId = idFor("account", "deal-manager");
  const financeAccountId = idFor("account", "finance");
  const reviewerAccountId = idFor("account", "reviewer");

  const organizations = [
    {
      organization_id: craysOrgId,
      name: "CRAYS Operating Core",
      organization_type: "crays",
      status: "active",
      parent_organization_id: null,
    },
    ...selectedSourceOrganizations.map((org) => ({
      organization_id: idFor("org", org.id),
      name: sanitizeText(org.name || `Benchmark Organization ${org.id}`),
      organization_type: mapOrganizationType(org.type),
      status: mapReviewStatus(org.status),
      parent_organization_id: null,
    })),
  ];

  const ownerOrganizations = selectedProperties.map((property) => {
    const pipeline = pipelineById.get(property.pipelineGymId) || {};
    return {
      organization_id: idFor("owner-org", property.id),
      name: ownerOrganizationName(pipeline, property),
      organization_type: "landlord",
      status: "review",
      parent_organization_id: null,
    };
  });

  const bankOrganizations = selectedPipelineRows.map((pipeline) => ({
    organization_id: idFor("bank-org", pipeline.id),
    name: bankOrganizationName(pipeline),
    organization_type: "bank",
    status: "review",
    parent_organization_id: null,
  }));

  organizations.push(...dedupeBy([...ownerOrganizations, ...bankOrganizations], "organization_id"));

  const accounts = [
    makeSystemAccount(systemAccountId, "System Operator", "system", "active"),
    makeSystemAccount(expansionAccountId, "Expansion Manager", "expansion-manager", "active"),
    makeSystemAccount(dealManagerAccountId, "Deal Manager", "deal-manager", "active"),
    makeSystemAccount(financeAccountId, "Finance Reviewer", "finance", "active"),
    makeSystemAccount(reviewerAccountId, "Evidence Reviewer", "reviewer", "active"),
    ...selectedAccountRows.map((user, index) => {
      const accountId = idFor("account", user.id);
      candidateAccountIdBySourceUser.set(user.id, accountId);
      if (user.organizationId) candidateOrganizationIdBySourceUser.set(user.id, idFor("org", user.organizationId));
      return {
        account_id: accountId,
        crays_id: `${seedPrefix}_${slug(user.id)}@crays-gym.com`,
        display_name: sanitizeText(accountDisplayName(user, index)),
        primary_contact: `${slug(accountDisplayName(user, index))}@crays-gym.com`,
        primary_contact_type: "contact",
        default_role: mapRole(user.role),
        status: user.accessState === "kyc_verified" ? "active" : "review",
      };
    }),
  ];

  const memberships = accounts.flatMap((account) => {
    const sourceUserId = account.account_id.split("_account_").at(-1)?.replace(/_/g, "-");
    const sourceUser = (db.accountUsers || []).find((user) => slug(user.id).replace(/-/g, "_") === sourceUserId);
    const orgId = sourceUser?.organizationId ? idFor("org", sourceUser.organizationId) : craysOrgId;
    return [
      {
        membership_id: idFor("membership", account.account_id),
        account_id: account.account_id,
        organization_id: orgId,
        role_key: account.default_role,
        status: account.status === "active" ? "active" : "review",
        scopes: ["benchmark-dev", "read-model"],
      },
    ];
  });

  const roleAssignments = accounts.map((account) => ({
    assignment_id: idFor("role", account.account_id, account.default_role),
    account_id: account.account_id,
    role_key: account.default_role,
    organization_id: account.default_role === "franchise-candidate" ? memberships.find((row) => row.account_id === account.account_id)?.organization_id || craysOrgId : craysOrgId,
    entity_type: null,
    entity_id: null,
    nostr_binding_required: true,
    nostr_binding_status: "system_attested",
    status: account.status === "active" ? "active" : "review",
  }));

  const properties = selectedProperties.map((property) => {
    const pipeline = pipelineById.get(property.pipelineGymId) || {};
    const propertyId = idFor("property", property.id);
    return {
      property_id: propertyId,
      owner_organization_id: idFor("owner-org", property.id),
      owner_account_id: null,
      title: sanitizeText(propertyLeaseTitle(pipeline, property)),
      address_summary: sanitizeText(`${pipeline.district || property.district || "District"} area, ${pipeline.city || property.city || "Market"}`),
      city: sanitizeText(property.city || pipeline.city || ""),
      country: sanitizeText(pipeline.country || ""),
      property_type: "fitness",
      intake_source: "internal_review",
      status: Number(property.fitScore || pipeline.siteScore || 0) >= 76 ? "qualified" : "screening",
      visibility_scope: { roles: ["expansion-manager", "deal-manager", "reviewer", "admin"] },
      metadata: tag("properties", property.id, {
        sourcePropertyId: property.id,
        sourcePipelineId: property.pipelineGymId,
        district: sanitizeText(property.district || pipeline.district || ""),
        areaSqm: numberOrNull(property.areaSqm || pipeline.areaSqm),
        rentPerSqm: numberOrNull(property.rentPerSqm),
        fitScore: numberOrNull(property.fitScore || pipeline.siteScore),
        ownerSourceLabel: "redacted_owner_metadata",
      }),
    };
  });

  const propertyCases = selectedProperties.map((property) => {
    const pipeline = pipelineById.get(property.pipelineGymId) || {};
    const caseId = idFor("property-case", property.id);
    propertyCaseIdByPipeline.set(property.pipelineGymId, caseId);
    const score = Number(property.fitScore || pipeline.siteScore || 0);
    const ready = score >= 76 || Number(pipeline.bankabilityScore || 0) >= 82;
    return {
      case_id: caseId,
      property_id: idFor("property", property.id),
      owner_role: "expansion-manager",
      assigned_account_id: expansionAccountId,
      related_deal_id: dealIdByPipelineId.get(property.pipelineGymId) || null,
      status: ready ? "handoff_ready" : "review",
      current_phase: ready ? "deal_handoff" : "location_review",
      handoff_required: true,
      handoff_status: ready ? "ready" : "not_ready",
      review_summary: tag("property_cases", property.id, {
        readiness: ready ? "ready_for_deal_manager" : "needs_review",
        siteScore: numberOrNull(pipeline.siteScore || property.fitScore),
        openingReadiness: numberOrNull(pipeline.openingReadiness),
        nextAction: sanitizeText(pipeline.nextAction || "Review property"),
      }),
      metadata: tag("property_cases", property.id, {
        sourcePipelineId: property.pipelineGymId,
        sourcePropertyId: property.id,
        ownerSubmissionWritesEnabled: false,
        externalProviderCallsEnabled: false,
      }),
    };
  });

  const locationAnalyses = selectedProperties.map((property) => {
    const pipeline = pipelineById.get(property.pipelineGymId) || {};
    const analysisId = idFor("location-analysis", property.id);
    const score = Number(pipeline.siteScore || property.fitScore || 0);
    return {
      analysis_id: analysisId,
      property_case_id: idFor("property-case", property.id),
      analysis_type: "location_intelligence",
      status: score >= 76 ? "approved" : "review",
      score_snapshot: {
        siteScore: score,
        bankabilityScore: numberOrNull(pipeline.bankabilityScore),
        openingReadiness: numberOrNull(pipeline.openingReadiness),
        confidence: score >= 76 ? "medium" : "low",
      },
      kpi_snapshot: {
        targetMembers: numberOrNull(pipeline.targetMembers),
        presaleMembers: numberOrNull(pipeline.presaleMembers),
        targetMRR: numberOrNull(pipeline.targetMRR),
        targetOpening: pipeline.targetOpening || null,
      },
      source_summary: tag("location_analyses", property.id, {
        mode: "benchmark_fixture",
        providerCallsEnabled: false,
        sourceRecords: ["pipelineGyms", "properties"],
      }),
      reviewed_by_account_id: reviewerAccountId,
      reviewed_at: generatedAt,
    };
  });

  const propertyEvidencePackages = selectedProperties.map((property) => ({
    package_id: idFor("evidence-package", "property", property.id),
    related_entity_type: "property-case",
    related_entity_id: idFor("property-case", property.id),
    owner_role: "expansion-manager",
    release_state: "internal",
    visibility_roles: ["expansion-manager", "deal-manager", "reviewer", "admin"],
    summary: tag("evidence_packages", property.id, {
      classes: ["location_evidence", "property_supply", "rent_potential"],
      sourceRecordCount: countForDeal(db.candidateEvidencePacks, dealIdByPipelineId.get(property.pipelineGymId)),
      approvedForCandidateRelease: false,
      approvedForBankRelease: false,
    }),
    approved_by_account_id: reviewerAccountId,
    approved_at: generatedAt,
  }));

  const preparedOffers = selectedPipelineRows.map((pipeline) => {
    const property = propertyByPipelineId.get(pipeline.id);
    const offerId = idFor("prepared-offer", pipeline.id);
    preparedOfferIdByPipeline.set(pipeline.id, offerId);
    financialModelIdByOfferId.set(offerId, idFor("financial-model", pipeline.id));
    return {
      offer_id: offerId,
      property_case_id: property ? idFor("property-case", property.id) : null,
      location_analysis_id: property ? idFor("location-analysis", property.id) : null,
      evidence_package_id: property ? idFor("evidence-package", "property", property.id) : null,
      title: sanitizeText(`Prepared Franchise Deal - ${pipeline.city} ${pipeline.district}`),
      market: sanitizeText(`${pipeline.city}, ${pipeline.country}`),
      owner_role: "deal-manager",
      status: Number(pipeline.bankabilityScore || 0) >= 82 ? "review" : "draft",
      candidate_release_state: "not_released",
      public_teaser_enabled: false,
      partner_handoff_status: "pending",
      metrics_snapshot: tag("prepared_offers", pipeline.id, {
        targetRaise: numberOrNull(pipeline.investment),
        ownEquity: numberOrNull(pipeline.ownEquity),
        bankDebt: numberOrNull(pipeline.bankDebt),
        bankabilityScore: numberOrNull(pipeline.bankabilityScore),
        locationScore: numberOrNull(pipeline.siteScore),
        targetMRR: numberOrNull(pipeline.targetMRR),
      }),
      metadata: tag("prepared_offers", pipeline.id, {
        sourcePipelineId: pipeline.id,
        sourcePublicDealId: dealIdByPipelineId.get(pipeline.id) || null,
        candidateReleaseEnabled: false,
        publicReleaseEnabled: false,
        bankSendEnabled: false,
      }),
    };
  });

  const preparedOfferEvidencePackages = selectedPipelineRows.map((pipeline) => ({
    package_id: idFor("evidence-package", "offer", pipeline.id),
    related_entity_type: "prepared-offer",
    related_entity_id: idFor("prepared-offer", pipeline.id),
    owner_role: "deal-manager",
    release_state: "internal",
    visibility_roles: ["deal-manager", "finance", "reviewer", "admin"],
    summary: tag("evidence_packages", pipeline.id, {
      classes: ["deal_economics", "banking_evidence"],
      candidateReleaseEnabled: false,
      bankReleaseEnabled: false,
    }),
    approved_by_account_id: reviewerAccountId,
    approved_at: generatedAt,
  }));

  const deals = selectedCandidateCases.map((candidateCase) => {
    const pipeline = pipelineById.get(candidateCase.pipelineGymId) || {};
    const dealId = idFor("deal", candidateCase.id);
    if (!firstDealIdByPipeline.has(candidateCase.pipelineGymId)) firstDealIdByPipeline.set(candidateCase.pipelineGymId, dealId);
    return {
      deal_id: dealId,
      prepared_offer_id: preparedOfferIdByPipeline.get(candidateCase.pipelineGymId) || null,
      candidate_account_id: candidateAccountIdBySourceUser.get(candidateCase.candidateUserId) || null,
      franchise_partner_account_id: null,
      deal_manager_account_id: dealManagerAccountId,
      organization_id: candidateOrganizationIdBySourceUser.get(candidateCase.candidateUserId) || craysOrgId,
      stage: mapDealStage(candidateCase.stage),
      status: Number(candidateCase.completion || 0) >= 70 ? "active" : "review",
      kyc_aml_status: candidateCase.accessState === "kyc_verified" ? "passed" : "in_review",
      equity_status: Number(pipeline.ownEquity || 0) > 0 ? "requested" : "not_started",
      bank_handoff_status: Number(pipeline.bankabilityScore || 0) >= 85 ? "ready" : "blocked",
      property_handoff_status: "pending",
      required_actions: [sanitizeText(candidateCase.nextAction || "Review case")],
      metadata: tag("candidate_cases", candidateCase.id, {
        sourceDealId: candidateCase.dealId,
        sourcePipelineId: candidateCase.pipelineGymId,
        sourceProjectId: candidateCase.projectId,
        completion: numberOrNull(candidateCase.completion),
        externalSendingEnabled: false,
        bankSendEnabled: false,
      }),
    };
  });

  const financialModels = selectedPipelineRows.map((pipeline) => {
    const scenario = (db.candidateScenarioModels || []).find((row) => row.dealId === dealIdByPipelineId.get(pipeline.id));
    const offerId = preparedOfferIdByPipeline.get(pipeline.id);
    return {
      model_id: idFor("financial-model", pipeline.id),
      prepared_offer_id: offerId,
      deal_id: firstDealIdByPipeline.get(pipeline.id) || null,
      version_label: "benchmark-v1",
      owner_role: "finance",
      status: Number(scenario?.dscr || 0) >= 1.25 ? "review" : "draft",
      summary: tag("financial_models", pipeline.id, {
        targetMembers: numberOrNull(scenario?.targetMembers || pipeline.targetMembers),
        predictedMRR: numberOrNull(scenario?.predictedMRR || pipeline.targetMRR),
        ownEquity: numberOrNull(scenario?.ownEquity || pipeline.ownEquity),
        requestedLoan: numberOrNull(scenario?.requestedLoan || pipeline.bankDebt),
        dscr: numberOrNull(scenario?.dscr),
        paybackMonths: numberOrNull(scenario?.paybackMonths),
      }),
      assumptions: tag("financial_model_assumptions", pipeline.id, {
        scenario: sanitizeText(scenario?.scenario || "Base"),
        source: "benchmark_kpi_fixture",
        providerCallsEnabled: false,
      }),
      approved_by_account_id: null,
      approved_at: null,
    };
  });

  const bankPackages = selectedCandidateCases.map((candidateCase) => {
    const pipeline = pipelineById.get(candidateCase.pipelineGymId) || {};
    const dealId = idFor("deal", candidateCase.id);
    const packageId = idFor("bank-package", candidateCase.id);
    const offerId = preparedOfferIdByPipeline.get(candidateCase.pipelineGymId);
    const evidencePackageId = idFor("evidence-package", "offer", candidateCase.pipelineGymId);
    bankPackageIdByDealId.set(dealId, packageId);
    return {
      package_id: packageId,
      deal_id: dealId,
      financial_model_id: offerId ? financialModelIdByOfferId.get(offerId) : null,
      evidence_package_id: evidencePackageId,
      bank_partner_organization_id: idFor("bank-org", candidateCase.pipelineGymId),
      owner_role: "finance",
      status: Number(pipeline.bankabilityScore || 0) >= 85 ? "ready" : "review",
      release_status: "blocked",
      prepared_by_account_id: financeAccountId,
      released_by_account_id: null,
      released_at: null,
      required_checks: ["finance_review", "redaction_review", "release_gate"],
      metadata: tag("bank_packages", candidateCase.id, {
        sourcePipelineId: candidateCase.pipelineGymId,
        bankSendEnabled: false,
        externalReleaseEnabled: false,
      }),
    };
  });

  const loanCases = selectedCandidateCases.map((candidateCase) => {
    const loan = (db.bankLoanCases || []).find((row) => row.pipelineGymId === candidateCase.pipelineGymId) || {};
    const dealId = idFor("deal", candidateCase.id);
    const loanCaseId = idFor("loan-case", candidateCase.id);
    loanCaseIdByDealId.set(dealId, loanCaseId);
    return {
      loan_case_id: loanCaseId,
      bank_package_id: bankPackageIdByDealId.get(dealId),
      bank_partner_organization_id: idFor("bank-org", candidateCase.pipelineGymId),
      status: mapLoanStatus(loan.status),
      decision_state: mapLoanDecision(loan.status),
      requested_amount_summary: tag("bank_loan_cases", loan.id || candidateCase.id, {
        requestedAmount: numberOrNull(loan.requestedAmount),
        ownEquity: numberOrNull(loan.ownEquity),
        dscr: numberOrNull(loan.dscr),
      }),
      conditions_summary: tag("bank_loan_conditions", loan.id || candidateCase.id, {
        accountOpening: sanitizeText(loan.accountOpening || "not_started"),
        payoutStatus: sanitizeText(loan.payoutStatus || "not_started"),
        paymentInitiationEnabled: false,
        bankSendEnabled: false,
      }),
      metadata: tag("bank_loan_cases", loan.id || candidateCase.id, {
        sourcePipelineId: candidateCase.pipelineGymId,
        externalReleaseEnabled: false,
      }),
    };
  });

  const documentPackageLinks = [
    ...(db.candidateDealRoomFiles || []).filter((row) => selectedDealIds.has(row.dealId)),
    ...(db.candidateClosingDocuments || []).filter((row) => selectedDealIds.has(row.dealId)),
  ].map((file) => {
    const publicDeal = selectedPublicDeals.find((row) => row.id === file.dealId);
    const candidateCase = caseByDealId.get(file.dealId);
    const pipelineId = publicDeal?.pipelineGymId || candidateCase?.pipelineGymId;
    const dealId = candidateCase ? idFor("deal", candidateCase.id) : null;
    const packageType = file.access === "bank" && dealId ? "bank-package" : dealId ? "deal" : "prepared-offer";
    const packageId = packageType === "bank-package" ? bankPackageIdByDealId.get(dealId) : packageType === "deal" ? dealId : preparedOfferIdByPipeline.get(pipelineId);
    return {
      link_id: idFor("document-link", file.id),
      package_type: packageType,
      package_id: packageId,
      document_ref_type: "metadata_only",
      document_ref_id: idFor("document-ref", file.id),
      document_group: sanitizeText(file.type || "Case file"),
      visibility_roles: file.access === "bank" ? ["finance", "reviewer", "admin"] : ["deal-manager", "franchise-candidate", "reviewer", "admin"],
      status: file.status === "ready" || file.status === "verified" ? "approved" : "required",
      required_for: sanitizeText(file.requiredFor || file.access || "internal review"),
      created_by_account_id: dealManagerAccountId,
      metadata: tag("documents", file.id, {
        title: sanitizeText(file.title),
        sourceDealId: file.dealId,
        binaryStored: false,
        uploadEnabled: false,
      }),
    };
  }).filter((row) => row.package_id);

  const workflowEvents = [
    ...selectedProperties.map((property) => ({
      event_id: idFor("event", "property-case", property.id),
      event_type: "property_case.benchmark_seeded",
      actor_account_id: systemAccountId,
      related_entity_type: "property-case",
      related_entity_id: idFor("property-case", property.id),
      role_key: "expansion-manager",
      visibility_roles: ["expansion-manager", "deal-manager", "reviewer", "admin"],
      event_status: "recorded",
      payload: tag("workflow_events", property.id, { sourceEntity: "property_case" }),
      occurred_at: generatedAt,
    })),
    ...selectedPipelineRows.map((pipeline) => ({
      event_id: idFor("event", "prepared-offer", pipeline.id),
      event_type: "prepared_offer.benchmark_seeded",
      actor_account_id: systemAccountId,
      related_entity_type: "prepared-offer",
      related_entity_id: idFor("prepared-offer", pipeline.id),
      role_key: "deal-manager",
      visibility_roles: ["deal-manager", "finance", "reviewer", "admin"],
      event_status: "recorded",
      payload: tag("workflow_events", pipeline.id, { sourceEntity: "prepared_offer" }),
      occurred_at: generatedAt,
    })),
    ...selectedCandidateCases.map((candidateCase) => ({
      event_id: idFor("event", "deal", candidateCase.id),
      event_type: "deal.benchmark_seeded",
      actor_account_id: systemAccountId,
      related_entity_type: "deal",
      related_entity_id: idFor("deal", candidateCase.id),
      role_key: "deal-manager",
      visibility_roles: ["deal-manager", "finance", "reviewer", "admin"],
      event_status: "recorded",
      payload: tag("workflow_events", candidateCase.id, { sourceEntity: "deal" }),
      occurred_at: generatedAt,
    })),
  ];

  const externalRecordMaps = [
    ...selectedCandidateCases.flatMap((candidateCase) => [
      makeExternalMap(idFor, tag, "project", "work_item", candidateCase.projectId, "deal", idFor("deal", candidateCase.id), "read"),
      makeExternalMap(idFor, tag, "crm", "opportunity", candidateCase.id, "deal", idFor("deal", candidateCase.id), "read"),
    ]),
    ...selectedProperties.map((property) => makeExternalMap(idFor, tag, "files", "metadata_record", property.id, "property-case", idFor("property-case", property.id), "read")),
    ...selectedPipelineRows.map((pipeline) => makeExternalMap(idFor, tag, "erp", "finance_model", pipeline.id, "prepared-offer", idFor("prepared-offer", pipeline.id), "read")),
  ];

  const integrationConnections = ["project", "crm", "files", "erp", "analytics", "loans", "sync"].map((moduleKey) => ({
    connection_id: idFor("connection", moduleKey, "read"),
    module_key: moduleKey,
    system_key: `${moduleKey}-read-model`,
    connection_name: `${labelForModule(moduleKey)} Read Model`,
    owner_role: moduleKey === "loans" || moduleKey === "erp" ? "finance" : "admin",
    organization_id: craysOrgId,
    status: "configured",
    connection_mode: moduleKey === "sync" ? "webhook_event" : "sync_read_model",
    secret_reference_status: "not_required",
    connection_health: "healthy",
    metadata: tag("integration_connections", moduleKey, {
      source: "benchmark_seed",
      writeEnabled: false,
      liveReadEnabled: false,
    }),
  }));

  const syncJobs = integrationConnections.map((connection) => ({
    job_id: idFor("sync-job", connection.module_key, "benchmark-read"),
    connection_id: connection.connection_id,
    job_type: connection.module_key === "analytics" ? "analytics_refresh" : "read_sync",
    crays_entity_type: "integration",
    crays_entity_id: connection.connection_id,
    direction: "read",
    status: "succeeded",
    attempt_count: 1,
    last_error_code: null,
    payload_summary: tag("sync_jobs", connection.module_key, {
      source: "benchmark_seed",
      recordsPlanned: selectedPipelineRows.length,
      writeEnabled: false,
    }),
    scheduled_at: generatedAt,
    started_at: generatedAt,
    finished_at: generatedAt,
  }));

  const candidateIntents = selectedCandidateCases.map((candidateCase) => ({
    intent_id: idFor("candidate-intent", candidateCase.id),
    prepared_offer_id: preparedOfferIdByPipeline.get(candidateCase.pipelineGymId),
    deal_id: idFor("deal", candidateCase.id),
    candidate_account_id: candidateAccountIdBySourceUser.get(candidateCase.candidateUserId) || null,
    candidate_organization_id: candidateOrganizationIdBySourceUser.get(candidateCase.candidateUserId) || null,
    intent_type: "purchase",
    intent_source: "internal_review",
    status: "draft",
    review_status: "not_started",
    regulated_check_status: candidateCase.accessState === "kyc_verified" ? "cleared" : "required",
    equity_check_status: "requested",
    bank_handoff_status: "not_started",
    candidate_acknowledged_boundary: false,
    acknowledgement_summary: tag("candidate_intents", candidateCase.id, {
      candidatePortalSubmissionEnabled: false,
      externalSendingEnabled: false,
    }),
    financing_request_summary: tag("candidate_intents", candidateCase.id, {
      requestedReview: false,
      bankSendEnabled: false,
    }),
    visibility_roles: ["deal-manager", "reviewer", "admin"],
    submitted_at: null,
    reviewed_by_account_id: null,
    reviewed_at: null,
    expires_at: null,
    metadata: tag("candidate_intents", candidateCase.id, {
      sourceDealId: candidateCase.dealId,
      sourcePipelineId: candidateCase.pipelineGymId,
      candidateReleaseEnabled: false,
    }),
  }));

  const candidateIntentEvents = selectedCandidateCases.map((candidateCase) => ({
    event_id: idFor("candidate-intent-event", candidateCase.id, "drafted"),
    intent_id: idFor("candidate-intent", candidateCase.id),
    event_type: "intent.drafted",
    event_status: "recorded",
    actor_account_id: systemAccountId,
    actor_role: "system",
    related_entity_type: "candidate-intent",
    related_entity_id: idFor("candidate-intent", candidateCase.id),
    visibility_roles: ["deal-manager", "reviewer", "admin"],
    payload_summary: tag("candidate_intent_events", candidateCase.id, {
      source: "benchmark_seed",
      candidateActionRequired: false,
    }),
    occurred_at: generatedAt,
  }));

  const locationEvidenceRuns = (db.candidateEvidencePacks || []).filter((row) => selectedDealIds.has(row.dealId)).map((evidence) => {
    const publicDeal = selectedPublicDeals.find((row) => row.id === evidence.dealId);
    const candidateCase = caseByDealId.get(evidence.dealId);
    const pipelineId = publicDeal?.pipelineGymId || candidateCase?.pipelineGymId;
    const property = pipelineId ? propertyByPipelineId.get(pipelineId) : null;
    return {
      run_id: idFor("location-evidence-run", evidence.id),
      property_case_id: property ? idFor("property-case", property.id) : null,
      analysis_id: property ? idFor("location-analysis", property.id) : null,
      evidence_package_id: property ? idFor("evidence-package", "property", property.id) : null,
      run_mode: "no_call_fixture",
      status: evidence.status === "ready" ? "computed" : "review",
      request_class: mapEvidenceRequestClass(evidence),
      coordinate_reference: pipelineId || evidence.dealId,
      travel_mode: mapTravelMode(evidence.signal),
      travel_time_minutes: 15,
      request_summary: tag("candidate_evidence_packs", evidence.id, {
        signal: sanitizeText(evidence.signal),
        output: sanitizeText(evidence.output),
        noCallFixture: true,
      }),
      derived_evidence: tag("candidate_evidence_packs", evidence.id, {
        score: numberOrNull(evidence.score),
        recordCount: numberOrNull(evidence.recordCount),
        lastSync: evidence.lastSync || null,
      }),
      confidence_state: Number(evidence.score || 0) >= 80 ? "medium" : "low",
      review_status: evidence.status === "ready" ? "needs_review" : "not_started",
      reviewed_by_account_id: null,
      reviewed_at: null,
      expires_at: null,
    };
  }).filter((row) => row.property_case_id);

  const propertySupplyRecords = (db.candidatePropertyIntakes || []).filter((row) => selectedDealIds.has(row.dealId)).map((propertyIntake) => {
    const publicDeal = selectedPublicDeals.find((row) => row.id === propertyIntake.dealId);
    const candidateCase = caseByDealId.get(propertyIntake.dealId);
    const pipelineId = publicDeal?.pipelineGymId || candidateCase?.pipelineGymId;
    const property = pipelineId ? propertyByPipelineId.get(pipelineId) : null;
    return {
      supply_record_id: idFor("property-supply", propertyIntake.id),
      property_id: property ? idFor("property", property.id) : null,
      property_case_id: property ? idFor("property-case", property.id) : null,
      intake_source: "internal_review",
      normalization_status: "normalized",
      dedupe_status: "unique",
      address_resolution_status: "normalized",
      rent_area_summary: tag("candidate_property_intakes", propertyIntake.id, {
        areaSqm: numberOrNull(propertyIntake.areaSqm),
        rentPerSqm: numberOrNull(propertyIntake.rentPerSqm),
        leaseFit: numberOrNull(propertyIntake.leaseFit),
      }),
      availability_summary: tag("candidate_property_intakes", propertyIntake.id, {
        status: sanitizeText(propertyIntake.status || "active"),
        source: "benchmark_property_source",
      }),
      contact_redaction_state: "redacted",
      attachment_metadata_state: "metadata_only",
      release_state: "internal",
    };
  }).filter((row) => row.property_case_id);

  const rentPotentialModels = (db.candidatePropertyIntakes || []).filter((row) => selectedDealIds.has(row.dealId)).map((propertyIntake) => {
    const publicDeal = selectedPublicDeals.find((row) => row.id === propertyIntake.dealId);
    const candidateCase = caseByDealId.get(propertyIntake.dealId);
    const pipelineId = publicDeal?.pipelineGymId || candidateCase?.pipelineGymId;
    const property = pipelineId ? propertyByPipelineId.get(pipelineId) : null;
    return {
      model_id: idFor("rent-potential", propertyIntake.id),
      property_case_id: property ? idFor("property-case", property.id) : null,
      prepared_offer_id: pipelineId ? preparedOfferIdByPipeline.get(pipelineId) : null,
      model_status: "computed",
      rent_range_summary: tag("candidate_property_intakes", propertyIntake.id, {
        rentPerSqm: numberOrNull(propertyIntake.rentPerSqm),
        forecastMRR: numberOrNull(propertyIntake.forecastMRR),
      }),
      sensitivity_summary: tag("candidate_property_intakes", propertyIntake.id, {
        bankFit: numberOrNull(propertyIntake.bankFit),
        leaseFit: numberOrNull(propertyIntake.leaseFit),
      }),
      tenant_fit_summary: tag("candidate_property_intakes", propertyIntake.id, {
        reachablePeople: numberOrNull(propertyIntake.reachablePeople),
        format: sanitizeText(propertyIntake.format),
      }),
      market_context_summary: tag("candidate_property_intakes", propertyIntake.id, {
        city: sanitizeText(propertyIntake.city),
        district: sanitizeText(propertyIntake.district),
        travelMode: sanitizeText(propertyIntake.travelMode),
      }),
      reviewer_confidence: Number(propertyIntake.bankFit || 0) >= 80 ? "medium" : "low",
      release_state: "internal",
      reviewed_by_account_id: null,
      reviewed_at: null,
    };
  }).filter((row) => row.property_case_id);

  const dealEconomicsModels = (db.candidateScenarioModels || []).filter((row) => selectedDealIds.has(row.dealId)).map((scenario) => {
    const publicDeal = selectedPublicDeals.find((row) => row.id === scenario.dealId);
    const candidateCase = caseByDealId.get(scenario.dealId);
    const pipelineId = publicDeal?.pipelineGymId || candidateCase?.pipelineGymId;
    const property = pipelineId ? propertyByPipelineId.get(pipelineId) : null;
    return {
      model_id: idFor("deal-economics", scenario.id),
      prepared_offer_id: pipelineId ? preparedOfferIdByPipeline.get(pipelineId) : null,
      deal_id: candidateCase ? idFor("deal", candidateCase.id) : null,
      property_case_id: property ? idFor("property-case", property.id) : null,
      model_status: "computed",
      capex_summary: tag("candidate_scenario_models", scenario.id, {
        ownEquity: numberOrNull(scenario.ownEquity),
        requestedLoan: numberOrNull(scenario.requestedLoan),
      }),
      opening_budget_summary: tag("candidate_scenario_models", scenario.id, {
        targetMembers: numberOrNull(scenario.targetMembers),
        predictedMRR: numberOrNull(scenario.predictedMRR),
      }),
      revenue_assumption_summary: tag("candidate_scenario_models", scenario.id, {
        dscr: numberOrNull(scenario.dscr),
        rentRatio: sanitizeText(scenario.rentRatio),
      }),
      franchise_price_summary: tag("candidate_scenario_models", scenario.id, {
        paybackMonths: numberOrNull(scenario.paybackMonths),
        use: sanitizeText(scenario.use),
      }),
      prepared_deal_score: tag("candidate_scenario_models", scenario.id, {
        scenario: sanitizeText(scenario.scenario),
        active: Boolean(scenario.active),
      }),
      reviewer_confidence: Number(scenario.dscr || 0) >= 1.3 ? "medium" : "low",
      release_state: "internal",
      reviewed_by_account_id: null,
      reviewed_at: null,
    };
  }).filter((row) => row.prepared_offer_id);

  const bankingEvidenceSnapshots = selectedCandidateCases.map((candidateCase) => {
    const loan = (db.bankLoanCases || []).find((row) => row.pipelineGymId === candidateCase.pipelineGymId) || {};
    const dealId = idFor("deal", candidateCase.id);
    return {
      snapshot_id: idFor("banking-evidence", candidateCase.id),
      bank_package_id: bankPackageIdByDealId.get(dealId),
      loan_case_id: loanCaseIdByDealId.get(dealId),
      prepared_offer_id: preparedOfferIdByPipeline.get(candidateCase.pipelineGymId),
      snapshot_status: "review",
      consent_state: "not_requested",
      account_information_readiness: "not_requested",
      transaction_evidence_readiness: "not_requested",
      source_of_funds_readiness: candidateCase.accessState === "kyc_verified" ? "in_review" : "required",
      package_checklist_summary: tag("banking_evidence_snapshots", candidateCase.id, {
        businessPlan: "prepared",
        financialModel: "prepared",
        locationEvidence: "prepared",
        bankSendEnabled: false,
      }),
      finance_review_summary: tag("banking_evidence_snapshots", candidateCase.id, {
        requestedAmount: numberOrNull(loan.requestedAmount),
        dscr: numberOrNull(loan.dscr),
        accountInformationReadEnabled: false,
        transactionEvidenceReadEnabled: false,
      }),
      release_state: "internal",
      reviewed_by_account_id: null,
      reviewed_at: null,
    };
  });

  const evidenceReleaseGates = [
    ...selectedProperties.flatMap((property) => [
      makeGate(idFor, tag, property.id, "property-case", idFor("property-case", property.id), "location_evidence", "internal", "ready_for_review"),
      makeGate(idFor, tag, property.id, "property-case", idFor("property-case", property.id), "property_supply", "owner", "blocked"),
    ]),
    ...selectedPipelineRows.flatMap((pipeline) => [
      makeGate(idFor, tag, pipeline.id, "prepared-offer", idFor("prepared-offer", pipeline.id), "deal_economics", "candidate", "blocked"),
      makeGate(idFor, tag, pipeline.id, "prepared-offer", idFor("prepared-offer", pipeline.id), "banking_evidence", "bank", "blocked"),
    ]),
  ];

  const evidenceAuditEvents = [
    ...locationEvidenceRuns.map((run) => makeEvidenceAudit(idFor, tag, "location_evidence", "evidence.computed", run.run_id, "property-case", run.property_case_id, systemAccountId, generatedAt)),
    ...rentPotentialModels.map((model) => makeEvidenceAudit(idFor, tag, "rent_potential", "evidence.computed", model.model_id, "property-case", model.property_case_id, systemAccountId, generatedAt)),
    ...dealEconomicsModels.map((model) => makeEvidenceAudit(idFor, tag, "deal_economics", "evidence.computed", model.model_id, "prepared-offer", model.prepared_offer_id, systemAccountId, generatedAt)),
    ...bankingEvidenceSnapshots.map((snapshot) => makeEvidenceAudit(idFor, tag, "banking_evidence", "evidence.computed", snapshot.snapshot_id, "bank-package", snapshot.bank_package_id, systemAccountId, generatedAt)),
  ];

  const rows = {
    organizations: dedupeBy(organizations, "organization_id"),
    crays_accounts: dedupeBy(accounts, "account_id"),
    organization_memberships: dedupeBy(memberships, "membership_id"),
    role_assignments: dedupeBy(roleAssignments, "assignment_id"),
    properties,
    property_cases: propertyCases,
    location_analyses: locationAnalyses,
    evidence_packages: [...propertyEvidencePackages, ...preparedOfferEvidencePackages],
    prepared_offers: preparedOffers,
    deals,
    financial_models: financialModels,
    bank_packages: bankPackages,
    loan_cases: loanCases,
    document_package_links: dedupeBy(documentPackageLinks, "link_id"),
    workflow_events: dedupeBy(workflowEvents, "event_id"),
    external_record_maps: dedupeBy(externalRecordMaps, "map_id"),
    integration_connections: integrationConnections,
    sync_jobs: syncJobs,
    candidate_intents: candidateIntents,
    candidate_intent_events: candidateIntentEvents,
    location_evidence_runs: dedupeBy(locationEvidenceRuns, "run_id"),
    property_supply_records: dedupeBy(propertySupplyRecords, "supply_record_id"),
    rent_potential_models: dedupeBy(rentPotentialModels, "model_id"),
    deal_economics_models: dedupeBy(dealEconomicsModels, "model_id"),
    banking_evidence_snapshots: dedupeBy(bankingEvidenceSnapshots, "snapshot_id"),
    evidence_release_gates: dedupeBy(evidenceReleaseGates, "gate_id"),
    evidence_audit_events: dedupeBy(evidenceAuditEvents, "audit_event_id"),
  };

  return {
    seedBatchId,
    seedPrefix,
    source: {
      path: defaultWorkspaceDataPath,
      dbVersion: db.dbVersion || null,
      sourceCounts: db.counts || {},
    },
    planning: {
      selectedPipelines: selectedPipelineRows.length,
      selectedProperties: selectedProperties.length,
      selectedCandidateCases: selectedCandidateCases.length,
      selectedPublicDeals: selectedPublicDeals.length,
      selectedProjects: selectedProjectIds.size,
      selectedAccounts: selectedAccountRows.length,
    },
    rows,
    counts: Object.fromEntries(Object.entries(rows).map(([table, tableRows]) => [table, tableRows.length])),
    safeguards: {
      providerCallsEnabled: false,
      ownerUploadsEnabled: false,
      externalSendingEnabled: false,
      bankSendEnabled: false,
      paymentInitiationEnabled: false,
      productionDeployEnabled: false,
    },
  };
}

export function buildManifestSummary(seed) {
  return {
    seedBatchId: seed.seedBatchId,
    seedPrefix: seed.seedPrefix,
    source: {
      path: seed.source.path,
      dbVersion: seed.source.dbVersion,
      counts: seed.source.sourceCounts,
    },
    planning: seed.planning,
    plannedRows: seed.counts,
    tableOrder: benchmarkSeedTableOrder,
    requiredTables: requiredBenchmarkSeedTables,
    safeguards: seed.safeguards,
  };
}

export async function getMissingTables(client, expectedTables = requiredBenchmarkSeedTables) {
  const result = await client.query(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'crays_core'
        and table_name = any($1::text[])
      order by table_name
    `,
    [expectedTables],
  );
  const existing = new Set(result.rows.map((row) => row.table_name));
  return expectedTables.filter((table) => !existing.has(table));
}

export async function upsertSeedRows(client, seed) {
  const insertedRows = {};
  for (const table of benchmarkSeedTableOrder) {
    insertedRows[table] = await upsertRows(client, table, seed.rows[table] || []);
  }
  return insertedRows;
}

export async function countSeedRows(client, seedBatchId, seedPrefix = getSeedPrefix(seedBatchId)) {
  const counts = {};
  for (const table of requiredBenchmarkSeedTables) {
    const where = seedWhereClause(table);
    try {
      const result = await client.query(`select count(*)::int as row_count from crays_core.${table} where ${where}`, [
        seedBatchId,
        `${seedPrefix}%`,
      ]);
      counts[table] = Number(result.rows[0]?.row_count || 0);
    } catch (error) {
      if (String(error?.message || "").includes("does not exist")) {
        counts[table] = "missing";
      } else {
        throw error;
      }
    }
  }
  return counts;
}

export async function deleteSeedRows(client, seedBatchId, seedPrefix = getSeedPrefix(seedBatchId)) {
  const deletedRows = {};
  for (const table of cleanupOrder) {
    const where = seedWhereClause(table);
    try {
      const result = await client.query(`delete from crays_core.${table} where ${where}`, [
        seedBatchId,
        `${seedPrefix}%`,
      ]);
      deletedRows[table] = result.rowCount || 0;
    } catch (error) {
      if (String(error?.message || "").includes("does not exist")) {
        deletedRows[table] = "missing";
      } else {
        throw error;
      }
    }
  }
  return deletedRows;
}

export function getTableColumns(table) {
  return tableColumns[table] || [];
}

function createIdFactory(seedBatchId) {
  const prefix = getSeedPrefix(seedBatchId);
  return (...parts) => [prefix, ...parts.map((part) => slug(part).replace(/-/g, "_"))].filter(Boolean).join("_").slice(0, 180);
}

function makeSystemAccount(accountId, displayName, role, status) {
  return {
    account_id: accountId,
    crays_id: `${accountId}@benchmark.crays.internal`,
    display_name: displayName,
    primary_contact: `${accountId}@benchmark.crays.internal`,
    primary_contact_type: "contact",
    default_role: role,
    status,
  };
}

function makeExternalMap(idFor, tag, systemKey, externalEntityType, sourceId, craysEntityType, craysEntityId, syncDirection) {
  return {
    map_id: idFor("external-map", systemKey, externalEntityType, sourceId, craysEntityType),
    crays_entity_type: craysEntityType,
    crays_entity_id: craysEntityId,
    external_system: systemKey,
    external_entity_type: externalEntityType,
    external_entity_id: String(sourceId || craysEntityId),
    external_url: null,
    sync_direction: syncDirection,
    sync_status: "synced",
    last_synced_at: null,
    metadata: tag("external_record_maps", `${systemKey}:${sourceId}`, {
      source: "benchmark_seed",
      writeEnabled: false,
    }),
  };
}

function makeGate(idFor, tag, sourceId, relatedEntityType, relatedEntityId, evidenceClass, targetAudience, gateStatus) {
  return {
    gate_id: idFor("evidence-gate", relatedEntityType, relatedEntityId, evidenceClass, targetAudience),
    related_entity_type: relatedEntityType,
    related_entity_id: relatedEntityId,
    evidence_class: evidenceClass,
    target_audience: targetAudience,
    gate_status: gateStatus,
    required_approvals: ["reviewer", "deal-manager"],
    redaction_summary: tag("evidence_release_gates", sourceId, {
      contactDataRedacted: true,
      binaryFilesExcluded: true,
    }),
    release_summary: tag("evidence_release_gates", sourceId, {
      externalReleaseEnabled: false,
      bankSendEnabled: false,
      candidateReleaseEnabled: false,
    }),
    approved_by_account_id: null,
    approved_at: null,
    revoked_at: null,
  };
}

function makeEvidenceAudit(idFor, tag, evidenceClass, eventType, sourceId, relatedEntityType, relatedEntityId, actorAccountId, occurredAt) {
  return {
    audit_event_id: idFor("evidence-audit", evidenceClass, sourceId),
    event_type: eventType,
    event_status: "recorded",
    related_entity_type: relatedEntityType,
    related_entity_id: relatedEntityId,
    actor_account_id: actorAccountId,
    actor_role: "system",
    evidence_class: evidenceClass,
    payload_summary: tag("evidence_audit_events", sourceId, {
      noCallFixture: true,
      releaseEnabled: false,
    }),
    occurred_at: occurredAt,
  };
}

async function upsertRows(client, table, rows) {
  if (!rows.length) return 0;

  const columns = getTableColumns(table);
  const columnNames = columns.map((column) => (typeof column === "string" ? column : column.name));
  const updateColumns = columnNames.filter((column) => column !== conflictColumns[table]);
  const batchSize = Math.max(1, Math.floor(3_000 / columns.length));
  let affected = 0;

  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const values = [];
    let parameterIndex = 1;
    const valueGroups = batch.map((row) => {
      const placeholders = columns.map((column) => {
        const columnName = typeof column === "string" ? column : column.name;
        const isJson = typeof column !== "string" && column.json;
        const value = row[columnName] === undefined ? null : row[columnName];
        values.push(isJson ? JSON.stringify(value ?? (Array.isArray(value) ? [] : {})) : value);
        return `$${parameterIndex++}${isJson ? "::jsonb" : ""}`;
      });
      return `(${placeholders.join(", ")})`;
    });
    const updates = updateColumns.map((column) => `${column} = excluded.${column}`).join(", ");
    const query = `
      insert into crays_core.${table} (${columnNames.join(", ")})
      values ${valueGroups.join(", ")}
      on conflict (${conflictColumns[table]}) do update
      set ${updates}
    `;
    const result = await client.query(query, values);
    affected += result.rowCount || 0;
  }

  return affected;
}

function seedWhereClause(table) {
  switch (table) {
    case "organizations":
      return "organization_id like $2 and $1::text is not null";
    case "crays_accounts":
      return "account_id like $2 and $1::text is not null";
    case "organization_memberships":
      return "membership_id like $2 and $1::text is not null";
    case "role_assignments":
      return "assignment_id like $2 and $1::text is not null";
    case "properties":
    case "property_cases":
    case "prepared_offers":
    case "deals":
    case "bank_packages":
    case "loan_cases":
    case "document_package_links":
    case "external_record_maps":
    case "integration_connections":
    case "candidate_intents":
      return "metadata -> '__seed' ->> 'seed_batch_id' = $1 and $2::text is not null";
    case "location_analyses":
      return "source_summary -> '__seed' ->> 'seed_batch_id' = $1 and $2::text is not null";
    case "evidence_packages":
    case "financial_models":
      return "summary -> '__seed' ->> 'seed_batch_id' = $1 and $2::text is not null";
    case "workflow_events":
      return "payload -> '__seed' ->> 'seed_batch_id' = $1 and $2::text is not null";
    case "sync_jobs":
    case "candidate_intent_events":
    case "evidence_audit_events":
      return "payload_summary -> '__seed' ->> 'seed_batch_id' = $1 and $2::text is not null";
    case "location_evidence_runs":
      return "request_summary -> '__seed' ->> 'seed_batch_id' = $1 and $2::text is not null";
    case "property_supply_records":
      return "rent_area_summary -> '__seed' ->> 'seed_batch_id' = $1 and $2::text is not null";
    case "rent_potential_models":
      return "rent_range_summary -> '__seed' ->> 'seed_batch_id' = $1 and $2::text is not null";
    case "deal_economics_models":
      return "capex_summary -> '__seed' ->> 'seed_batch_id' = $1 and $2::text is not null";
    case "banking_evidence_snapshots":
      return "package_checklist_summary -> '__seed' ->> 'seed_batch_id' = $1 and $2::text is not null";
    case "evidence_release_gates":
      return "release_summary -> '__seed' ->> 'seed_batch_id' = $1 and $2::text is not null";
    default:
      throw new Error(`No seed where clause configured for ${table}.`);
  }
}

function userById(db, userId) {
  return (db.accountUsers || []).find((user) => user.id === userId);
}

function countForDeal(rows = [], dealId) {
  if (!dealId) return 0;
  return rows.filter((row) => row.dealId === dealId).length;
}

function take(rows, limit) {
  if (!Number.isFinite(limit)) return rows;
  return rows.slice(0, limit);
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "record";
}

function sanitizeText(value, fallback = "") {
  let text = String(value ?? fallback ?? "");
  for (const term of blockedTerms) {
    text = text.replace(new RegExp(escapeRegExp(term), "gi"), "source system");
  }
  return text;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapOrganizationType(type) {
  const value = String(type || "").toLowerCase();
  if (value.includes("franchise")) return "franchise-partner";
  if (value.includes("bank")) return "bank";
  if (value.includes("landlord")) return "landlord";
  if (value.includes("real estate")) return "real-estate-partner";
  if (value.includes("funding")) return "funding-partner";
  if (value.includes("finance")) return "finance-partner";
  if (value.includes("investor")) return "investor";
  if (value.includes("crays")) return "crays";
  return "advisor";
}

function mapReviewStatus(status) {
  const value = String(status || "").toLowerCase();
  return value === "active" ? "active" : value === "suspended" ? "suspended" : "review";
}

function mapRole(role) {
  const value = String(role || "").toLowerCase();
  if (value.includes("candidate")) return "franchise-candidate";
  if (value.includes("partner")) return "franchise-partner";
  if (value.includes("deal manager")) return "deal-manager";
  if (value.includes("bank")) return "finance";
  if (value.includes("landlord")) return "real-estate-partner";
  if (value.includes("admin")) return "admin";
  if (value.includes("investment")) return "investor";
  return "member";
}

function mapDealStage(stage) {
  const value = String(stage || "").toLowerCase();
  if (value.includes("bank")) return "bank_package";
  if (value.includes("closing")) return "closing";
  if (value.includes("approval") || value.includes("ready")) return "deal_readiness";
  if (value.includes("kyc")) return "kyc_aml";
  return "deal_detail";
}

function mapLoanStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("approved")) return "approved";
  if (value.includes("declined")) return "declined";
  if (value.includes("question")) return "questions";
  if (value.includes("submitted")) return "submitted";
  return "not_submitted";
}

function mapLoanDecision(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("approved")) return "approved";
  if (value.includes("declined")) return "declined";
  if (value.includes("conditional")) return "conditional";
  return "pending";
}

function mapEvidenceRequestClass(evidence) {
  const value = `${evidence.api || ""} ${evidence.signal || ""} ${evidence.output || ""}`.toLowerCase();
  if (value.includes("matrix")) return "travel_time_matrix";
  if (value.includes("statistics")) return "statistics_context";
  if (value.includes("place")) return "places_context";
  if (value.includes("score")) return "location_score";
  return "reachability_bands";
}

function mapTravelMode(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("car")) return "car";
  if (text.includes("walk")) return "walk";
  if (text.includes("bike")) return "bike";
  return "transit";
}

function labelForModule(moduleKey) {
  const labels = {
    project: "Project",
    crm: "CRM",
    files: "Files",
    erp: "ERP",
    analytics: "Analytics",
    loans: "Loans",
    sync: "Sync",
  };
  return labels[moduleKey] || moduleKey;
}

function numberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function dedupeBy(rows, key) {
  return [...new Map(rows.filter(Boolean).map((row) => [row[key], row])).values()];
}
