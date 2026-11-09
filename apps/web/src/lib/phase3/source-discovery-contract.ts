import type { ResourceKey, ResourceSourceSystem } from "@/lib/resources";

export type SourceDiscoverySystemKey = "twenty" | "plane" | "frappe";

export type SourceDiscoveryEnvRequirement = {
  name: string;
  label: string;
  secret: boolean;
  requiredFor: "metadata" | "read-only-probe" | "local-runtime" | "optional-timeout";
};

export type SourceDiscoveryMetadataRequirement = {
  key: string;
  label: string;
  reason: string;
  required: true;
};

export type SourceDiscoveryContract = {
  systemKey: SourceDiscoverySystemKey;
  label: string;
  moduleKey: "crm" | "project" | "erp";
  sourceSystem: ResourceSourceSystem;
  adapterBoundary: "crays-bff-only";
  browserNativeApiAccess: false;
  browserSecretAccess: false;
  nativeWritesEnabled: false;
  metadataStatus: "requires-discovery";
  resources: ResourceKey[];
  requiredEnvironment: SourceDiscoveryEnvRequirement[];
  metadataRequirements: SourceDiscoveryMetadataRequirement[];
  readOnlyProbePlan: string[];
  documentationBasis: string[];
};

const twentyResources: ResourceKey[] = [
  "crm-companies",
  "crm-people",
  "crm-leads",
  "crm-opportunities",
  "crm-emails",
  "crm-calendar-events",
  "crm-tasks",
  "crm-activities",
];

const planeResources: ResourceKey[] = ["project-work-items", "project-states", "project-comments"];
const frappeResources: ResourceKey[] = ["erp-documents"];

export const sourceDiscoveryContracts: SourceDiscoveryContract[] = [
  {
    systemKey: "twenty",
    label: "Twenty CRM",
    moduleKey: "crm",
    sourceSystem: "twenty",
    adapterBoundary: "crays-bff-only",
    browserNativeApiAccess: false,
    browserSecretAccess: false,
    nativeWritesEnabled: false,
    metadataStatus: "requires-discovery",
    resources: twentyResources,
    requiredEnvironment: [
      { name: "CRAYS_CRM_BASE_URL", label: "Twenty base URL", secret: false, requiredFor: "read-only-probe" },
      { name: "CRAYS_CRM_EMAIL", label: "Twenty service account login", secret: true, requiredFor: "read-only-probe" },
      { name: "CRAYS_CRM_PASSWORD", label: "Twenty service account password", secret: true, requiredFor: "read-only-probe" },
      { name: "CRAYS_CRM_SOURCE_TIMEOUT_MS", label: "Twenty read timeout", secret: false, requiredFor: "optional-timeout" },
      { name: "CRAYS_CRM_DB_CONTAINER", label: "Local Twenty DB container", secret: false, requiredFor: "local-runtime" },
      { name: "CRAYS_CRM_DB_USER", label: "Local Twenty DB user", secret: true, requiredFor: "local-runtime" },
      { name: "CRAYS_CRM_DB_NAME", label: "Local Twenty DB name", secret: false, requiredFor: "local-runtime" },
      { name: "CRAYS_CRM_WORKSPACE_SCHEMA", label: "Local Twenty workspace schema", secret: false, requiredFor: "metadata" },
    ],
    metadataRequirements: [
      { key: "objects", label: "Workspace objects", reason: "Object names and slugs are generated from deployed Twenty workspace metadata.", required: true },
      { key: "fields", label: "Fields and field types", reason: "CRAYS must map only discovered fields into canonical DTOs.", required: true },
      { key: "relations", label: "Relations", reason: "People, companies, leads, opportunities, messages and tasks need explicit relation metadata.", required: true },
      { key: "filters-sorts-pagination", label: "Query semantics", reason: "Filters, sorts and pagination must be generated from source capabilities, not guessed.", required: true },
      { key: "webhooks", label: "Webhook/event model", reason: "Event ingestion and cache invalidation need a verified source event contract.", required: true },
    ],
    readOnlyProbePlan: [
      "Authenticate server-side only.",
      "Read Twenty Metadata API object and field definitions.",
      "Compare discovered objects to CRAYS CRM resource descriptors.",
      "Persist only canonical discovery evidence and env-name presence; never return credentials.",
    ],
    documentationBasis: [
      "Twenty exposes Core API resources through /rest and /graphql based on workspace objects.",
      "Twenty exposes Metadata API resources under /rest/metadata and GraphQL metadata endpoints.",
    ],
  },
  {
    systemKey: "plane",
    label: "Plane Project",
    moduleKey: "project",
    sourceSystem: "plane",
    adapterBoundary: "crays-bff-only",
    browserNativeApiAccess: false,
    browserSecretAccess: false,
    nativeWritesEnabled: false,
    metadataStatus: "requires-discovery",
    resources: planeResources,
    requiredEnvironment: [
      { name: "CRAYS_PROJECT_SOURCE_BASE_URL", label: "Plane base URL", secret: false, requiredFor: "read-only-probe" },
      { name: "CRAYS_PROJECT_SOURCE_WORKSPACE_SLUG", label: "Plane workspace slug", secret: false, requiredFor: "metadata" },
      { name: "CRAYS_PROJECT_SOURCE_PROJECT_ID", label: "Plane project ID", secret: true, requiredFor: "metadata" },
      { name: "CRAYS_PROJECT_SOURCE_API_KEY", label: "Plane API key", secret: true, requiredFor: "read-only-probe" },
      { name: "CRAYS_PROJECT_SOURCE_AUTH_SCHEME", label: "Plane auth scheme", secret: false, requiredFor: "read-only-probe" },
      { name: "CRAYS_PROJECT_SOURCE_TIMEOUT_MS", label: "Plane read timeout", secret: false, requiredFor: "optional-timeout" },
    ],
    metadataRequirements: [
      { key: "work-items", label: "Work item shape", reason: "Issue/work-item fields, IDs and state references must be source-verified.", required: true },
      { key: "states", label: "States and transitions", reason: "Board columns and transitions cannot be inferred from labels.", required: true },
      { key: "properties", label: "Properties", reason: "Priority, assignee, labels, modules and custom properties need source metadata.", required: true },
      { key: "comments", label: "Comments", reason: "Comment visibility and authorship must be scoped before surfacing collaboration rows.", required: true },
      { key: "cursor-pagination", label: "Cursor pagination and limits", reason: "CRAYS tables and boards must honor Plane pagination and rate limits.", required: true },
    ],
    readOnlyProbePlan: [
      "Authenticate server-side with a secret reference only.",
      "Read workspace, project, state and work-item metadata through the CRAYS adapter.",
      "Persist a cursor/pagination compatibility report.",
      "Keep Plane native writes disabled until transition metadata and apply gates are opened.",
    ],
    documentationBasis: [
      "Plane API keys are secrets and must remain server-side.",
      "Plane work-item resources use workspace/project context and cursor-style pagination.",
    ],
  },
  {
    systemKey: "frappe",
    label: "Frappe / ERPNext",
    moduleKey: "erp",
    sourceSystem: "frappe",
    adapterBoundary: "crays-bff-only",
    browserNativeApiAccess: false,
    browserSecretAccess: false,
    nativeWritesEnabled: false,
    metadataStatus: "requires-discovery",
    resources: frappeResources,
    requiredEnvironment: [
      { name: "CRAYS_ERP_BACKEND_CONTAINER", label: "ERPNext backend container", secret: false, requiredFor: "local-runtime" },
      { name: "CRAYS_ERP_SITE", label: "ERPNext site", secret: false, requiredFor: "metadata" },
      { name: "CRAYS_ERP_DB_CONTAINER", label: "ERPNext DB container", secret: false, requiredFor: "local-runtime" },
      { name: "CRAYS_ERP_DB_NAME", label: "ERPNext DB name", secret: false, requiredFor: "local-runtime" },
    ],
    metadataRequirements: [
      { key: "doctype-allowlist", label: "DocType allowlist", reason: "Frappe creates REST endpoints for DocTypes; CRAYS must choose an explicit safe subset.", required: true },
      { key: "fields", label: "DocType fields", reason: "Financial, identity and private fields must be scoped before any DTO leaves the server.", required: true },
      { key: "permissions", label: "Permissions", reason: "Frappe role permissions need to be translated into CRAYS server-side scopes.", required: true },
      { key: "filters-pagination", label: "Filters and pagination", reason: "ERP tables must use verified Frappe list/get behavior.", required: true },
      { key: "method-allowlist", label: "Method allowlist", reason: "Arbitrary method calls are not exposed; only reviewed command drafts may target methods later.", required: true },
    ],
    readOnlyProbePlan: [
      "Read DocType metadata server-side or through a local controlled runtime.",
      "Build a CRAYS DocType allowlist and field redaction map.",
      "Verify list/get pagination semantics before UI surfaces depend on ERP rows.",
      "Keep finance posting, payment and bank actions closed.",
    ],
    documentationBasis: [
      "Frappe exposes DocTypes as REST resources.",
      "Frappe method calls require explicit server-side allowlisting and must not become a browser proxy.",
    ],
  },
];

export function getSourceDiscoveryContract(systemKey: SourceDiscoverySystemKey) {
  return sourceDiscoveryContracts.find((contract) => contract.systemKey === systemKey) ?? null;
}
