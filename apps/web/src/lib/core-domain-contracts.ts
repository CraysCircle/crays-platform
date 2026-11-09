import { accessPoliciesForRole, type AccessDomainKey } from "./access-control";
import { defaultRole, roleByKey, type RoleKey } from "./roles";

export type CoreDomainContractKey = "prepared-offers" | "properties" | "location-evidence" | "bank-packages" | "partner-web";

export type ContractField = {
  key: string;
  label: string;
  classification: "public" | "role_scoped" | "sensitive" | "internal";
  source: "crays_core" | "adapter_read_model" | "reviewed_release";
};

export type ContractStage = {
  key: string;
  label: string;
  ownerRole: RoleKey;
  visibleTo: RoleKey[];
  gate: string;
};

export type CoreDomainReadModelContract = {
  key: CoreDomainContractKey;
  label: string;
  status: "contract_ready";
  primaryTables: string[];
  accessDomains: AccessDomainKey[];
  ownerRoles: RoleKey[];
  consumerSurfaces: string[];
  fields: ContractField[];
  stages: ContractStage[];
  guardrails: string[];
};

const candidateRoles: RoleKey[] = ["franchise-candidate", "deal-manager", "finance", "reviewer", "crays-management", "admin"];
const propertyRoles: RoleKey[] = ["expansion-manager", "deal-manager", "reviewer", "crays-management", "admin"];
const bankRoles: RoleKey[] = ["bank-partner", "deal-manager", "finance", "reviewer", "crays-management", "admin"];

export const preparedOfferContract: CoreDomainReadModelContract = {
  key: "prepared-offers",
  label: "Prepared Offers",
  status: "contract_ready",
  primaryTables: ["crays_core.prepared_offers", "crays_core.deals", "crays_core.evidence_packages", "crays_core.document_package_links"],
  accessDomains: ["prepared-offers", "candidate-deals", "document-packages"],
  ownerRoles: ["deal-manager", "expansion-manager", "finance", "reviewer", "crays-management", "admin"],
  consumerSurfaces: ["Guest teaser", "Candidate deal detail", "Deal Manager pipeline", "Bank package preparation"],
  fields: [
    { key: "offer_id", label: "Offer ID", classification: "role_scoped", source: "crays_core" },
    { key: "title", label: "Title", classification: "public", source: "reviewed_release" },
    { key: "market", label: "Market", classification: "public", source: "reviewed_release" },
    { key: "candidate_release_state", label: "Candidate release state", classification: "role_scoped", source: "crays_core" },
    { key: "public_teaser_enabled", label: "Public teaser enabled", classification: "public", source: "crays_core" },
    { key: "metrics_snapshot", label: "Metrics snapshot", classification: "role_scoped", source: "reviewed_release" },
    { key: "evidence_package_id", label: "Evidence package", classification: "role_scoped", source: "crays_core" },
  ],
  stages: [
    { key: "draft", label: "Draft", ownerRole: "deal-manager", visibleTo: ["deal-manager", "reviewer", "crays-management", "admin"], gate: "Internal review only." },
    { key: "teaser", label: "Teaser released", ownerRole: "deal-manager", visibleTo: ["guest", "franchise-candidate", "deal-manager", "admin"], gate: "Only reviewed public teaser fields." },
    { key: "detail_released", label: "Detail released", ownerRole: "deal-manager", visibleTo: candidateRoles, gate: "Candidate account mapping required." },
    { key: "reserved", label: "Reserved", ownerRole: "deal-manager", visibleTo: candidateRoles, gate: "Candidate purchase or financing intent recorded." },
  ],
  guardrails: [
    "Guest users see only reviewed public teaser fields.",
    "Candidate deal detail requires CRAYS account mapping before full prepared offer detail is returned.",
    "KYC/AML is not required for browsing released prepared offer detail.",
    "Bank handoff is not part of this contract until KYC, equity check and CRAYS deal readiness review are complete.",
    "No live prepared offer records are returned by this contract.",
  ],
};

export const propertyContract: CoreDomainReadModelContract = {
  key: "properties",
  label: "Properties And Property Cases",
  status: "contract_ready",
  primaryTables: ["crays_core.properties", "crays_core.property_cases", "crays_core.location_analyses", "crays_core.prepared_offers"],
  accessDomains: ["property-cases", "partner-pipeline", "location-evidence"],
  ownerRoles: ["expansion-manager", "deal-manager", "reviewer", "crays-management", "admin"],
  consumerSurfaces: ["Real Estate Partner website", "Property analysis", "Owner portal", "Expansion Manager pipeline", "Deal Manager handoff"],
  fields: [
    { key: "property_id", label: "Property ID", classification: "role_scoped", source: "crays_core" },
    { key: "owner_organization_id", label: "Owner organization", classification: "sensitive", source: "crays_core" },
    { key: "address_summary", label: "Address summary", classification: "sensitive", source: "reviewed_release" },
    { key: "property_type", label: "Property type", classification: "role_scoped", source: "crays_core" },
    { key: "status", label: "Property status", classification: "role_scoped", source: "crays_core" },
    { key: "handoff_status", label: "Handoff status", classification: "role_scoped", source: "crays_core" },
    { key: "review_summary", label: "Review summary", classification: "internal", source: "reviewed_release" },
  ],
  stages: [
    { key: "submitted", label: "Submitted", ownerRole: "expansion-manager", visibleTo: ["expansion-manager", "reviewer", "admin"], gate: "Owner or internal intake created." },
    { key: "analysis", label: "Analysis", ownerRole: "expansion-manager", visibleTo: propertyRoles, gate: "Property fit and location evidence are being reviewed." },
    { key: "handoff_ready", label: "Handoff ready", ownerRole: "expansion-manager", visibleTo: propertyRoles, gate: "Expansion review is complete." },
    { key: "handed_to_deal", label: "Handed to deal", ownerRole: "deal-manager", visibleTo: propertyRoles, gate: "Explicit handoff links the property case to a prepared offer or deal." },
  ],
  guardrails: [
    "Expansion Manager owns property and partner development until an explicit handoff.",
    "Deal Manager sees property strategy only after it is linked to an active prepared offer or candidate deal.",
    "Candidate-visible property details must be reviewed and released by CRAYS.",
    "Owner contact and sensitive property details are not visible to candidates by default.",
    "No live property or owner records are returned by this contract.",
  ],
};

export const locationEvidenceContract: CoreDomainReadModelContract = {
  key: "location-evidence",
  label: "Location Evidence",
  status: "contract_ready",
  primaryTables: ["crays_core.location_analyses", "crays_core.evidence_packages", "crays_core.workflow_events"],
  accessDomains: ["location-evidence", "property-cases", "bank-packages"],
  ownerRoles: ["expansion-manager", "deal-manager", "finance", "reviewer", "crays-management", "admin"],
  consumerSurfaces: ["Property analysis", "Candidate evidence", "Deal Manager review", "Bank evidence summary"],
  fields: [
    { key: "analysis_id", label: "Analysis ID", classification: "role_scoped", source: "crays_core" },
    { key: "analysis_type", label: "Analysis type", classification: "role_scoped", source: "crays_core" },
    { key: "score_snapshot", label: "Score snapshot", classification: "role_scoped", source: "reviewed_release" },
    { key: "kpi_snapshot", label: "KPI snapshot", classification: "role_scoped", source: "reviewed_release" },
    { key: "source_summary", label: "Source summary", classification: "internal", source: "adapter_read_model" },
    { key: "reviewed_at", label: "Reviewed at", classification: "role_scoped", source: "crays_core" },
  ],
  stages: [
    { key: "draft", label: "Draft", ownerRole: "expansion-manager", visibleTo: ["expansion-manager", "reviewer", "admin"], gate: "Internal analysis only." },
    { key: "review", label: "Review", ownerRole: "reviewer", visibleTo: propertyRoles, gate: "CRAYS checks source quality and release scope." },
    { key: "candidate_released", label: "Candidate released", ownerRole: "deal-manager", visibleTo: candidateRoles, gate: "Only candidate-safe evidence is released." },
    { key: "bank_released", label: "Bank released", ownerRole: "finance", visibleTo: bankRoles, gate: "Only after KYC, equity check and bank package readiness." },
  ],
  guardrails: [
    "Location intelligence keys and raw provider payloads stay server-side.",
    "Guest users see simplified proof only.",
    "Candidates see understandable released evidence before KYC.",
    "Banks see lender-grade summaries only after bank package handoff.",
    "No live location evidence records are returned by this contract.",
  ],
};

export const bankPackageContract: CoreDomainReadModelContract = {
  key: "bank-packages",
  label: "Bank Packages And Loan Cases",
  status: "contract_ready",
  primaryTables: ["crays_core.bank_packages", "crays_core.loan_cases", "crays_core.financial_models", "crays_core.document_package_links"],
  accessDomains: ["bank-packages", "candidate-deals", "document-packages"],
  ownerRoles: ["deal-manager", "finance", "reviewer", "crays-management", "admin"],
  consumerSurfaces: ["Candidate financing status", "Deal Manager bank package queue", "Finance review", "Bank partner workspace"],
  fields: [
    { key: "package_id", label: "Package ID", classification: "role_scoped", source: "crays_core" },
    { key: "deal_id", label: "Deal", classification: "sensitive", source: "crays_core" },
    { key: "release_status", label: "Release status", classification: "role_scoped", source: "crays_core" },
    { key: "required_checks", label: "Required checks", classification: "role_scoped", source: "crays_core" },
    { key: "decision_state", label: "Decision state", classification: "role_scoped", source: "crays_core" },
    { key: "conditions_summary", label: "Conditions summary", classification: "sensitive", source: "reviewed_release" },
  ],
  stages: [
    { key: "draft", label: "Draft", ownerRole: "deal-manager", visibleTo: ["deal-manager", "finance", "reviewer", "admin"], gate: "Candidate selected or reserved an offer." },
    { key: "blocked", label: "Blocked", ownerRole: "finance", visibleTo: ["deal-manager", "finance", "reviewer", "admin"], gate: "KYC, equity check or CRAYS review missing." },
    { key: "ready", label: "Ready", ownerRole: "finance", visibleTo: ["deal-manager", "finance", "reviewer", "crays-management", "admin"], gate: "All bank handoff preconditions are satisfied." },
    { key: "released", label: "Released", ownerRole: "finance", visibleTo: bankRoles, gate: "Bank partner has scoped access to reviewed package only." },
  ],
  guardrails: [
    "Bank handoff requires KYC-checked candidate, equity-checked candidate and CRAYS-reviewed deal.",
    "Pre-KYC browsing and candidate offer-selection activity are not visible to banks.",
    "Sensitive financial fields must be field-permissioned, not only page-permissioned.",
    "Bank package documents must be versioned before release.",
    "No live bank package, loan case or candidate financial data is returned by this contract.",
  ],
};

export const partnerWebContract: CoreDomainReadModelContract = {
  key: "partner-web",
  label: "Partner Web Surfaces",
  status: "contract_ready",
  primaryTables: ["crays_core.properties", "crays_core.property_cases", "crays_core.bank_packages", "crays_core.workflow_events"],
  accessDomains: ["partner-pipeline", "property-cases", "location-evidence", "bank-packages"],
  ownerRoles: ["expansion-manager", "deal-manager", "finance", "reviewer", "crays-management", "admin"],
  consumerSurfaces: ["Banking Partner website", "Real Estate Partner website", "Property analysis", "Owner portal", "Partner access request"],
  fields: [
    { key: "surface_key", label: "Surface key", classification: "public", source: "crays_core" },
    { key: "audience", label: "Audience", classification: "public", source: "reviewed_release" },
    { key: "request_state", label: "Request state", classification: "role_scoped", source: "crays_core" },
    { key: "pipeline_teaser_rules", label: "Pipeline teaser rules", classification: "public", source: "reviewed_release" },
    { key: "property_analysis_state", label: "Property analysis state", classification: "role_scoped", source: "crays_core" },
  ],
  stages: [
    { key: "public", label: "Public", ownerRole: "expansion-manager", visibleTo: ["guest", "bank-partner", "landlord", "admin"], gate: "Only reviewed marketing and teaser content." },
    { key: "request", label: "Access request", ownerRole: "expansion-manager", visibleTo: ["expansion-manager", "reviewer", "admin"], gate: "Partner request or property submission captured." },
    { key: "mapped", label: "Account mapped", ownerRole: "admin", visibleTo: ["expansion-manager", "admin"], gate: "Auth0/CRAYS account mapping and role review required." },
    { key: "handoff", label: "Workflow handoff", ownerRole: "deal-manager", visibleTo: ["deal-manager", "expansion-manager", "finance", "reviewer", "admin"], gate: "Only when partner/property enters active deal or bank package workflow." },
  ],
  guardrails: [
    "Banking Partner public pages acquire lender partners; they are not bank package views.",
    "Real Estate Partner public pages may start property analysis, but preliminary states must be clearly separated from reviewed CRAYS release states.",
    "Property uploads create scoped property cases and audit events before internal review.",
    "Public partner pages must not expose candidate PII, unreleased deal data, owner private records or internal finance.",
    "No public partner route returns live partner, property, candidate or bank data from this contract.",
  ],
};

export const coreDomainReadModelContracts: Record<CoreDomainContractKey, CoreDomainReadModelContract> = {
  "prepared-offers": preparedOfferContract,
  properties: propertyContract,
  "location-evidence": locationEvidenceContract,
  "bank-packages": bankPackageContract,
  "partner-web": partnerWebContract,
};

export function getCoreDomainReadModelContract(key: CoreDomainContractKey) {
  return coreDomainReadModelContracts[key];
}

export function getCoreDomainRolePreview(contract: CoreDomainReadModelContract, roleParam: string | null | undefined = defaultRole) {
  const role = roleByKey(roleParam).key;
  const accessDomains = new Set(contract.accessDomains);
  const visibleAccessPolicies = accessPoliciesForRole(role).filter((policy) => accessDomains.has(policy.key));

  return {
    role,
    visibleStages: contract.stages.filter((stage) => stage.visibleTo.includes(role)).map((stage) => ({
      key: stage.key,
      label: stage.label,
      ownerRole: stage.ownerRole,
      gate: stage.gate,
    })),
    visibleFieldCount: contract.fields.filter((field) => field.classification !== "internal" || ["admin", "crays-management", "reviewer"].includes(role)).length,
    accessDomains: visibleAccessPolicies.map((policy) => ({
      key: policy.key,
      label: policy.label,
      ownerRole: policy.ownerRole,
      rules: policy.rules.filter((rule) => rule.roles.includes(role)).map((rule) => ({
        action: rule.action,
        scopes: rule.scopes,
        requiresExplicitHandoff: Boolean(rule.requiresExplicitHandoff),
      })),
    })),
  };
}
