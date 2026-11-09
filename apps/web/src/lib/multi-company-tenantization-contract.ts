import type { ControlledBetaReadiness } from "./controlled-beta-readiness-contract";
import type { ModuleKey } from "./modules";
import type { RoleKey } from "./roles";

const tenantizationRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "finance"];

type TenantizationAccessLevel = "internal_tenantization_control" | "forbidden";
type TenantizationStatus = "prepared" | "blocked" | "closed";

export type MultiCompanyTenantizationAccess = {
  allowed: boolean;
  level: TenantizationAccessLevel;
  reason: string;
};

export type TenantizationBlock = {
  blockRange: string;
  label: string;
  status: TenantizationStatus;
  ownerRole: RoleKey;
  outcome: string;
  stillGated: string;
};

export type TenantRecord = {
  key: string;
  label: string;
  state: "current_core_workspace" | "seed_prepared_closed";
  businessDataState: "contains_current_dev_records" | "no_crays_business_data";
  nextAction: string;
};

export type TenantScopeRule = {
  key: string;
  label: string;
  state: "prepared";
  enforcedLayer: "read" | "command" | "settings" | "audit" | "files" | "analytics" | "portal";
};

export type TenantModuleTemplate = {
  module: ModuleKey;
  label: string;
  state: "template_prepared";
  requiredTenantScope: string;
};

export type TenantizationBoundary = {
  tenantReadModelEnabled: true;
  multiCompanyStrategyPrepared: true;
  productionTenantMigrationEnabled: false;
  liveTenantProvisioningEnabled: false;
  tenantDataWritesEnabled: false;
  crossTenantDataSharingEnabled: false;
  unscopedQueriesEnabled: false;
  unscopedCommandsEnabled: false;
  billingActionsEnabled: false;
  invoiceWritesEnabled: false;
  exportExecutionEnabled: false;
  retentionDeleteExecutionEnabled: false;
  fileUploadEnabled: false;
  externalSendingEnabled: false;
  candidateReleaseEnabled: false;
  bankReleaseEnabled: false;
  publicReleaseEnabled: false;
  financeWritesEnabled: false;
  paymentInitiationEnabled: false;
  productionDeployEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type MultiCompanyTenantizationReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: MultiCompanyTenantizationAccess;
  blockRange: "Blocks 801-900";
  journeySegment: "Multi-Company Tenantization";
  ownerRoles: RoleKey[];
  consumingRoles: RoleKey[];
  summary: {
    tenantBlocks: number;
    preparedBlocks: number;
    blockedBlocks: number;
    tenantsPrepared: number;
    fitYesSeedTenants: number;
    scopeRules: number;
    moduleTemplates: number;
    regressionChecks: number;
    adminControls: number;
    commercialControls: number;
    retentionControls: number;
    betaInputsConsumed: number;
    openSideEffectGates: 0;
  };
  blocks: TenantizationBlock[];
  tenants: TenantRecord[];
  scopeRules: TenantScopeRule[];
  moduleTemplates: TenantModuleTemplate[];
  regressionChecks: Array<{ key: string; label: string; state: "prepared"; proves: string }>;
  adminControls: Array<{ key: string; label: string; state: "prepared_closed"; ownerRole: RoleKey }>;
  commercialControls: Array<{ key: string; label: string; state: "prepared_closed"; ownerRole: RoleKey }>;
  retentionControls: Array<{ key: string; label: string; state: "prepared_closed"; ownerRole: RoleKey }>;
  nextPrototypeInputs: Array<{ blockRange: string; input: string }>;
  boundaries: TenantizationBoundary;
  fitYesCommercialPilotApproved: false;
  productionTenantCreated: false;
  tenantWritesPerformed: false;
  externalActionsPerformed: false;
};

export function multiCompanyTenantizationAccessForRole(role: RoleKey): MultiCompanyTenantizationAccess {
  if (tenantizationRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_tenantization_control",
      reason: "Role can review tenant strategy, scope enforcement, FitYes seed readiness and commercial controls without provisioning a production tenant.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Multi-company tenantization requires internal tenantization control scope.",
  };
}

function boundary(): TenantizationBoundary {
  return {
    tenantReadModelEnabled: true,
    multiCompanyStrategyPrepared: true,
    productionTenantMigrationEnabled: false,
    liveTenantProvisioningEnabled: false,
    tenantDataWritesEnabled: false,
    crossTenantDataSharingEnabled: false,
    unscopedQueriesEnabled: false,
    unscopedCommandsEnabled: false,
    billingActionsEnabled: false,
    invoiceWritesEnabled: false,
    exportExecutionEnabled: false,
    retentionDeleteExecutionEnabled: false,
    fileUploadEnabled: false,
    externalSendingEnabled: false,
    candidateReleaseEnabled: false,
    bankReleaseEnabled: false,
    publicReleaseEnabled: false,
    financeWritesEnabled: false,
    paymentInitiationEnabled: false,
    productionDeployEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function blocks(beta: ControlledBetaReadiness): TenantizationBlock[] {
  return [
    {
      blockRange: "801-810",
      label: "Tenant Strategy Decision",
      status: beta.summary.preparedBlocks >= 8 ? "prepared" : "blocked",
      ownerRole: "crays-management",
      outcome: "CRAYS Core, franchise company and future white-label tenants are separated by tenant, organization and role scope.",
      stillGated: "Production tenant activation.",
    },
    {
      blockRange: "811-820",
      label: "Tenant Data Model",
      status: "prepared",
      ownerRole: "admin",
      outcome: "Tenant, organization, studio, module, record scope, settings and audit ownership are explicit.",
      stillGated: "Schema migration against production data.",
    },
    {
      blockRange: "821-830",
      label: "Tenant Scope Enforcement",
      status: "prepared",
      ownerRole: "reviewer",
      outcome: "Every read, command, file, setting, portal and analytics query must carry tenant scope.",
      stillGated: "Any unscoped query or command.",
    },
    {
      blockRange: "831-840",
      label: "Tenant Regression Harness",
      status: "prepared",
      ownerRole: "reviewer",
      outcome: "Isolation checks are prepared for cross-tenant records, role leaks, exports and audit trails.",
      stillGated: "Tenant rollout without regression evidence.",
    },
    {
      blockRange: "841-850",
      label: "Tenant Branding and Module Templates",
      status: "prepared",
      ownerRole: "admin",
      outcome: "Dashboard, CRM, Project, ERP, Files, Analytics, Loans, Operations and support modules can be templated per tenant.",
      stillGated: "Unreviewed tenant-specific UI overrides.",
    },
    {
      blockRange: "851-860",
      label: "FitYes Pilot Tenant Seed",
      status: "prepared",
      ownerRole: "admin",
      outcome: "FitYes can be seeded as a clean pilot tenant with no CRAYS business records copied into it.",
      stillGated: "Live tenant provisioning.",
    },
    {
      blockRange: "861-870",
      label: "Tenant Admin Console",
      status: "prepared",
      ownerRole: "admin",
      outcome: "Tenant admin controls are prepared for users, modules, roles, branding, retention and audit review.",
      stillGated: "Tenant admin writes.",
    },
    {
      blockRange: "871-880",
      label: "Tenant Billing / Commercial Readiness",
      status: "blocked",
      ownerRole: "finance",
      outcome: "Commercial package, billing basis and invoice evidence can be reviewed before any finance write exists.",
      stillGated: "Billing actions, invoice writes and payment initiation.",
    },
    {
      blockRange: "881-890",
      label: "Tenant Export / Retention / Offboarding",
      status: "prepared",
      ownerRole: "reviewer",
      outcome: "Export, retention, legal hold and offboarding commands are designed as reviewed, auditable closed gates.",
      stillGated: "Export execution and destructive retention actions.",
    },
    {
      blockRange: "891-900",
      label: "FitYes Commercial Pilot Decision",
      status: "prepared",
      ownerRole: "crays-management",
      outcome: "FitYes can be evaluated for commercial pilot readiness after prototype and QA evidence are visible.",
      stillGated: "Commercial approval and production rollout.",
    },
  ];
}

function tenants(): TenantRecord[] {
  return [
    {
      key: "crays-core-dev",
      label: "CRAYS Core dev workspace",
      state: "current_core_workspace",
      businessDataState: "contains_current_dev_records",
      nextAction: "Keep as source workspace and require tenant scope on every read model.",
    },
    {
      key: "fityes-pilot",
      label: "FitYes pilot seed",
      state: "seed_prepared_closed",
      businessDataState: "no_crays_business_data",
      nextAction: "Seed only templates, roles, modules, demo settings and empty operating queues after exact approval.",
    },
  ];
}

function scopeRules(): TenantScopeRule[] {
  return [
    { key: "read-models", label: "Read models require tenant scope", state: "prepared", enforcedLayer: "read" },
    { key: "commands", label: "Commands require tenant and actor scope", state: "prepared", enforcedLayer: "command" },
    { key: "settings", label: "Settings inherit tenant and organization scope", state: "prepared", enforcedLayer: "settings" },
    { key: "audit", label: "Audit events include tenant id and source surface", state: "prepared", enforcedLayer: "audit" },
    { key: "files", label: "Files and packages are tenant-scoped before role scope", state: "prepared", enforcedLayer: "files" },
    { key: "analytics", label: "Analytics aggregates cannot mix tenants by default", state: "prepared", enforcedLayer: "analytics" },
    { key: "portals", label: "External portals can see only released tenant records", state: "prepared", enforcedLayer: "portal" },
  ];
}

function moduleTemplates(): TenantModuleTemplate[] {
  return [
    { module: "dashboard", label: "Management cockpit", state: "template_prepared", requiredTenantScope: "tenant + role" },
    { module: "crm", label: "Tenant CRM pipeline", state: "template_prepared", requiredTenantScope: "tenant + company + role" },
    { module: "project", label: "Opening project workspace", state: "template_prepared", requiredTenantScope: "tenant + project + role" },
    { module: "erp", label: "Tenant finance operations", state: "template_prepared", requiredTenantScope: "tenant + finance role" },
    { module: "files", label: "Tenant file vault", state: "template_prepared", requiredTenantScope: "tenant + package + role" },
    { module: "analytics", label: "Tenant KPI read models", state: "template_prepared", requiredTenantScope: "tenant + reporting scope" },
    { module: "loans", label: "Tenant loans workspace", state: "template_prepared", requiredTenantScope: "tenant + release gate" },
    { module: "chat", label: "Tenant communication rooms", state: "template_prepared", requiredTenantScope: "tenant + participant scope" },
    { module: "operations", label: "Tenant operations cockpit", state: "template_prepared", requiredTenantScope: "tenant + studio scope" },
    { module: "hr", label: "Tenant people readiness", state: "template_prepared", requiredTenantScope: "tenant + HR scope" },
    { module: "learning", label: "Tenant learning paths", state: "template_prepared", requiredTenantScope: "tenant + learner scope" },
    { module: "support", label: "Tenant support desk", state: "template_prepared", requiredTenantScope: "tenant + ticket scope" },
    { module: "sites", label: "Tenant public and portal surfaces", state: "template_prepared", requiredTenantScope: "tenant + release state" },
    { module: "sync", label: "Tenant sync controls", state: "template_prepared", requiredTenantScope: "tenant + adapter scope" },
    { module: "settings", label: "Tenant admin settings", state: "template_prepared", requiredTenantScope: "tenant + admin role" },
  ];
}

function regressionChecks(): MultiCompanyTenantizationReadiness["regressionChecks"] {
  return [
    { key: "tenant-read-isolation", label: "Read isolation", state: "prepared", proves: "One tenant cannot list another tenant's records." },
    { key: "tenant-command-isolation", label: "Command isolation", state: "prepared", proves: "Commands reject missing or mismatched tenant scope." },
    { key: "tenant-portal-isolation", label: "Portal isolation", state: "prepared", proves: "External users receive only released records in their tenant." },
    { key: "tenant-file-isolation", label: "File isolation", state: "prepared", proves: "Document packages cannot cross tenant boundaries." },
    { key: "tenant-analytics-isolation", label: "Analytics isolation", state: "prepared", proves: "Aggregate reports do not mix tenant datasets unless explicitly approved." },
    { key: "tenant-audit-trace", label: "Audit trace", state: "prepared", proves: "Every scoped read and command can be traced by tenant and actor." },
  ];
}

function adminControls(): MultiCompanyTenantizationReadiness["adminControls"] {
  return [
    { key: "tenant-users", label: "Tenant users", state: "prepared_closed", ownerRole: "admin" },
    { key: "tenant-modules", label: "Tenant modules", state: "prepared_closed", ownerRole: "admin" },
    { key: "tenant-branding", label: "Tenant branding", state: "prepared_closed", ownerRole: "admin" },
    { key: "tenant-audit", label: "Tenant audit review", state: "prepared_closed", ownerRole: "reviewer" },
  ];
}

function commercialControls(): MultiCompanyTenantizationReadiness["commercialControls"] {
  return [
    { key: "commercial-package", label: "Commercial package", state: "prepared_closed", ownerRole: "finance" },
    { key: "billing-basis", label: "Billing basis", state: "prepared_closed", ownerRole: "finance" },
    { key: "invoice-evidence", label: "Invoice evidence", state: "prepared_closed", ownerRole: "finance" },
    { key: "payment-policy", label: "Payment policy", state: "prepared_closed", ownerRole: "finance" },
    { key: "pilot-approval", label: "Commercial pilot approval", state: "prepared_closed", ownerRole: "crays-management" },
  ];
}

function retentionControls(): MultiCompanyTenantizationReadiness["retentionControls"] {
  return [
    { key: "tenant-export", label: "Tenant export package", state: "prepared_closed", ownerRole: "reviewer" },
    { key: "legal-hold", label: "Legal hold", state: "prepared_closed", ownerRole: "reviewer" },
    { key: "retention-window", label: "Retention window", state: "prepared_closed", ownerRole: "admin" },
    { key: "offboarding-runbook", label: "Offboarding runbook", state: "prepared_closed", ownerRole: "admin" },
  ];
}

function nextPrototypeInputs(): MultiCompanyTenantizationReadiness["nextPrototypeInputs"] {
  return [
    { blockRange: "901-910", input: "Role work queues must be the first usable screen, not an information board." },
    { blockRange: "911-940", input: "End-to-end case workspace, record detail and workflow actions must connect the North Star journey." },
    { blockRange: "941-970", input: "Cross-module handoffs, external rooms and management cockpit must show who owns the next move." },
    { blockRange: "971-1000", input: "UX polish, contract QA and morning handover must prove the prototype is usable." },
  ];
}

export function emptyMultiCompanyTenantizationReadiness(role: RoleKey): MultiCompanyTenantizationReadiness {
  const access = multiCompanyTenantizationAccessForRole(role);

  return {
    status: access.allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 801-900",
    journeySegment: "Multi-Company Tenantization",
    ownerRoles: ["crays-management", "admin", "reviewer", "finance"],
    consumingRoles: ["deal-manager", "franchise-partner", "studio-manager", "bank-partner", "investor"],
    summary: {
      tenantBlocks: 0,
      preparedBlocks: 0,
      blockedBlocks: 0,
      tenantsPrepared: 0,
      fitYesSeedTenants: 0,
      scopeRules: 0,
      moduleTemplates: 0,
      regressionChecks: 0,
      adminControls: 0,
      commercialControls: 0,
      retentionControls: 0,
      betaInputsConsumed: 0,
      openSideEffectGates: 0,
    },
    blocks: [],
    tenants: [],
    scopeRules: [],
    moduleTemplates: [],
    regressionChecks: [],
    adminControls: [],
    commercialControls: [],
    retentionControls: [],
    nextPrototypeInputs: access.allowed ? nextPrototypeInputs() : [],
    boundaries: boundary(),
    fitYesCommercialPilotApproved: false,
    productionTenantCreated: false,
    tenantWritesPerformed: false,
    externalActionsPerformed: false,
  };
}

export function buildMultiCompanyTenantizationReadiness(
  role: RoleKey,
  input: { beta: ControlledBetaReadiness },
): MultiCompanyTenantizationReadiness {
  const base = emptyMultiCompanyTenantizationReadiness(role);
  const blockList = blocks(input.beta);
  const tenantList = tenants();
  const scopeList = scopeRules();
  const templateList = moduleTemplates();
  const regressionList = regressionChecks();
  const adminList = adminControls();
  const commercialList = commercialControls();
  const retentionList = retentionControls();

  return {
    ...base,
    summary: {
      tenantBlocks: blockList.length,
      preparedBlocks: blockList.filter((block) => block.status === "prepared").length,
      blockedBlocks: blockList.filter((block) => block.status === "blocked").length,
      tenantsPrepared: tenantList.length,
      fitYesSeedTenants: tenantList.filter((tenant) => tenant.key === "fityes-pilot").length,
      scopeRules: scopeList.length,
      moduleTemplates: templateList.length,
      regressionChecks: regressionList.length,
      adminControls: adminList.length,
      commercialControls: commercialList.length,
      retentionControls: retentionList.length,
      betaInputsConsumed: input.beta.summary.betaBlocks,
      openSideEffectGates: 0,
    },
    blocks: blockList,
    tenants: tenantList,
    scopeRules: scopeList,
    moduleTemplates: templateList,
    regressionChecks: regressionList,
    adminControls: adminList,
    commercialControls: commercialList,
    retentionControls: retentionList,
  };
}
