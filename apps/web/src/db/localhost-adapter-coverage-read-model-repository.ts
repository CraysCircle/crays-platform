import type { RoleKey } from "@/lib/roles";
import { getAdapterHealthReadiness, type AdapterHealthModuleKey } from "./adapter-health-readiness-repository";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import { getSyncAdapterReadiness } from "./sync-adapter-readiness-repository";

const internalCoverageRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedCoverageRoles: RoleKey[] = ["deal-manager", "expansion-manager", "finance"];

export type LocalhostCoverageStatus =
  | "live_adapter_bound"
  | "core_command_bound"
  | "core_read_model_bound"
  | "adapter_wired_runtime_missing"
  | "adapter_wired_runtime_unavailable"
  | "contract_only"
  | "gated_external_shell"
  | "needs_adapter_binding";

export type LocalhostSurfaceArea =
  | "dashboard"
  | "case"
  | "module"
  | "settings"
  | "portal";

export type LocalhostAdapterCoverageSurface = {
  key: string;
  label: string;
  route: string;
  area: LocalhostSurfaceArea;
  blockScope: string;
  ownerDepartment: string;
  ownerRole: RoleKey;
  consumingRoles: RoleKey[];
  externalStakeholderSlice: string;
  coreObject: string;
  moduleSurface: string;
  adapterModules: Array<AdapterHealthModuleKey | "loans" | "communication" | "location-intelligence" | "member-app">;
  status: LocalhostCoverageStatus;
  currentProof: string;
  nextBindingStep: string;
  adapterBindings: string[];
  commandBindings: string[];
  sourceMapBindings: string[];
  closedGates: string[];
};

type SurfaceDefinition = Omit<LocalhostAdapterCoverageSurface, "status" | "currentProof" | "sourceMapBindings"> & {
  baselineStatus: LocalhostCoverageStatus;
  proofWhenBound: string;
  proofWhenUnbound?: string;
};

export type LocalhostAdapterCoverageReadModel = {
  role: RoleKey;
  access: {
    allowed: boolean;
    level: "internal_localhost_coverage" | "scoped_localhost_coverage" | "forbidden";
    reason: string;
  };
  summary: {
    totalSurfaces: number;
    liveAdapterBound: number;
    coreCommandBound: number;
    coreReadModelBound: number;
    adapterWiredRuntimeMissing: number;
    adapterWiredRuntimeUnavailable: number;
    contractOnly: number;
    gatedExternalShell: number;
    needsAdapterBinding: number;
    sourceMappedModules: number;
    sourceMapsPersisted: number;
    localhostVerificationRequired: true;
  };
  coreSync: {
    status: "ready" | "forbidden";
    schemaReady: boolean;
    integrationConnections: number;
    externalRecordMaps: number;
    syncJobs: number;
    moduleCoverage: Array<{
      moduleKey: string;
      connections: number;
      externalMaps: number;
      syncJobs: number;
    }>;
  };
  surfaces: LocalhostAdapterCoverageSurface[];
  verificationPlan: Array<{
    key: string;
    label: string;
    route: string;
    expectedEvidence: string;
  }>;
  boundaries: {
    secretsReturned: false;
    privateKeysReturned: false;
    externalSendingEnabled: false;
    bankSendEnabled: false;
    paymentInitiationEnabled: false;
    publicReleaseEnabled: false;
    productionDeployEnabled: false;
    destructiveSourceApplyEnabled: false;
  };
};

const closedRuntimeGates = [
  "No secret values in UI",
  "No external sending",
  "No public release",
  "No bank send",
  "No payment initiation",
  "No production deploy",
  "No destructive source apply",
];

const surfaces: SurfaceDefinition[] = [
  {
    key: "dashboard-overview",
    label: "Dashboard overview",
    route: "/dashboard?role=deal-manager",
    area: "dashboard",
    blockScope: "Blocks 1-25 operating cockpit",
    ownerDepartment: "Management",
    ownerRole: "crays-management",
    consumingRoles: ["crays-management", "deal-manager", "expansion-manager", "finance", "reviewer"],
    externalStakeholderSlice: "Internal only",
    coreObject: "Portfolio operating cockpit",
    moduleSurface: "Dashboard",
    adapterModules: ["crm", "project", "erp", "files", "sync"],
    baselineStatus: "core_read_model_bound",
    proofWhenBound: "Dashboard reads Core operating projections and adapter readiness summaries.",
    proofWhenUnbound: "Dashboard still needs more live freshness indicators from every source module.",
    nextBindingStep: "Hydrate the cockpit cards from persisted source maps and recent sync jobs per department.",
    adapterBindings: ["CRM source maps", "Project source maps", "ERP source maps", "Files metadata", "Sync jobs"],
    commandBindings: ["Core command history links"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "role-work-queue",
    label: "Role work queue",
    route: "/dashboard?role=deal-manager&view=work-queue",
    area: "dashboard",
    blockScope: "Blocks 1-25 role-owned execution",
    ownerDepartment: "Operations",
    ownerRole: "deal-manager",
    consumingRoles: ["deal-manager", "expansion-manager", "finance", "reviewer"],
    externalStakeholderSlice: "Internal only",
    coreObject: "Role queue item",
    moduleSurface: "Dashboard / Work Queue",
    adapterModules: ["crm", "project", "erp", "loans", "files"],
    baselineStatus: "core_read_model_bound",
    proofWhenBound: "Role queues are served through the Core queue read model and link to case/module context.",
    proofWhenUnbound: "Queue rows need source freshness badges for CRM, Project, ERP, Loans and Files.",
    nextBindingStep: "Attach each queue row to external record maps and latest command history by case id.",
    adapterBindings: ["CRM contacts/deals", "Project tasks", "ERP finance records", "Loans conditions", "Files packages"],
    commandBindings: ["Workflow stage command", "Case transition command"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "case-workspace",
    label: "Case workspace",
    route: "/dashboard?role=deal-manager&view=case",
    area: "case",
    blockScope: "Blocks 1-25 shared case spine",
    ownerDepartment: "Franchise Sales",
    ownerRole: "deal-manager",
    consumingRoles: ["deal-manager", "expansion-manager", "finance", "reviewer", "franchise-partner"],
    externalStakeholderSlice: "External users consume released projections only",
    coreObject: "Prepared franchise case",
    moduleSurface: "Case Workspace",
    adapterModules: ["crm", "project", "erp", "loans", "files", "sync"],
    baselineStatus: "core_command_bound",
    proofWhenBound: "Case workspace reads Core case context and can show command history without applying source changes.",
    proofWhenUnbound: "Case workspace still needs per-engine source-map drilldowns beside each object section.",
    nextBindingStep: "Render source-map strip per case object and route write drafts to module-specific commands.",
    adapterBindings: ["CRM account/deal map", "Project opening map", "ERP finance map", "Loans package map", "Files evidence map"],
    commandBindings: ["Prepared offer review", "Property case review", "Workflow action stage"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "workflow-actions",
    label: "Workflow actions",
    route: "/api/crays/workflow-actions/read-model?role=deal-manager",
    area: "case",
    blockScope: "Blocks 1-25 guarded action spine",
    ownerDepartment: "Operations",
    ownerRole: "deal-manager",
    consumingRoles: ["deal-manager", "expansion-manager", "finance", "reviewer"],
    externalStakeholderSlice: "None until release",
    coreObject: "Workflow action",
    moduleSurface: "Case action drawer",
    adapterModules: ["crm", "project", "erp", "loans", "files"],
    baselineStatus: "core_command_bound",
    proofWhenBound: "Actions stage Core command drafts and return closed apply/release gates.",
    proofWhenUnbound: "Source apply handlers must be split by module before any real apply is allowed.",
    nextBindingStep: "Add module-specific source apply adapters behind explicit confirmation and audit.",
    adapterBindings: ["Module action registry", "Core command outbox"],
    commandBindings: ["Stage workflow action", "Stage module handoff"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "operational-signals",
    label: "Operational signals",
    route: "/dashboard?role=deal-manager&view=signals",
    area: "dashboard",
    blockScope: "Blocks 1-25 management-by-exception",
    ownerDepartment: "Management",
    ownerRole: "crays-management",
    consumingRoles: ["crays-management", "deal-manager", "expansion-manager", "finance", "reviewer", "studio-manager"],
    externalStakeholderSlice: "Only approved partner summaries later",
    coreObject: "Operating signal",
    moduleSurface: "Dashboard / Signals",
    adapterModules: ["crm", "project", "erp", "loans", "files", "sync"],
    baselineStatus: "core_read_model_bound",
    proofWhenBound: "Signals use Core operating read models and link to case/module work.",
    proofWhenUnbound: "Signals need adapter freshness, source variance and stale-map indicators.",
    nextBindingStep: "Merge source sync freshness into signal severity and owner routing.",
    adapterBindings: ["Sync job freshness", "External record maps", "Module readiness"],
    commandBindings: ["Escalation command draft"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "stakeholder-rooms",
    label: "Stakeholder rooms",
    route: "/dashboard?role=deal-manager&view=rooms",
    area: "case",
    blockScope: "Block 7 stakeholder evidence rooms",
    ownerDepartment: "Franchise Sales",
    ownerRole: "deal-manager",
    consumingRoles: ["deal-manager", "finance", "reviewer", "bank-partner", "franchise-candidate", "franchise-partner"],
    externalStakeholderSlice: "Release-gated evidence rooms",
    coreObject: "Stakeholder room",
    moduleSurface: "Stakeholder Rooms",
    adapterModules: ["files", "crm", "loans", "sync"],
    baselineStatus: "core_command_bound",
    proofWhenBound: "Rooms read Core room projections, document lifecycle and stage guarded file package commands.",
    proofWhenUnbound: "Release package handoff still needs a file version adapter and external release gate.",
    nextBindingStep: "Bind room documents to file version records and released projection snapshots.",
    adapterBindings: ["Files packages", "CRM stakeholder map", "Loans evidence map"],
    commandBindings: ["Stage file preflight", "Stage release preflight"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "crm-workbench",
    label: "CRM workbench",
    route: "/crm?role=deal-manager",
    area: "module",
    blockScope: "CRM operating module",
    ownerDepartment: "Franchise Sales",
    ownerRole: "deal-manager",
    consumingRoles: ["deal-manager", "expansion-manager", "crays-management", "reviewer"],
    externalStakeholderSlice: "Candidate and partner projections only",
    coreObject: "Account, contact and deal map",
    moduleSurface: "CRM",
    adapterModules: ["crm", "sync"],
    baselineStatus: "live_adapter_bound",
    proofWhenBound: "CRM workbench can read live business records and persist source maps into Core.",
    proofWhenUnbound: "CRM runtime is not returning mapped source records yet.",
    nextBindingStep: "Add scoped write drafts for activity updates and keep source apply behind command confirmation.",
    adapterBindings: ["CRM companies", "CRM people", "CRM opportunities", "CRM tasks"],
    commandBindings: ["CRM activity command draft"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "project-workbench",
    label: "Project workbench",
    route: "/project?role=deal-manager",
    area: "module",
    blockScope: "Project operating module",
    ownerDepartment: "Expansion",
    ownerRole: "expansion-manager",
    consumingRoles: ["deal-manager", "expansion-manager", "franchise-partner", "studio-manager", "reviewer"],
    externalStakeholderSlice: "Partner opening tasks later through scoped projection",
    coreObject: "Opening project",
    moduleSurface: "Project",
    adapterModules: ["project", "sync"],
    baselineStatus: "adapter_wired_runtime_missing",
    proofWhenBound: "Project workbench has adapter contract, native workbench and Core command draft path.",
    proofWhenUnbound: "Project source runtime is not configured for live task/project rows in this Localhost pass.",
    nextBindingStep: "Configure project source endpoint and map opening projects, milestones and blockers.",
    adapterBindings: ["Project tasks", "Milestones", "Boards", "Opening blockers"],
    commandBindings: ["Project work item command draft"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "loans-workbench",
    label: "Loans workbench",
    route: "/loans?role=finance",
    area: "module",
    blockScope: "Block 8 bank readiness",
    ownerDepartment: "Finance",
    ownerRole: "finance",
    consumingRoles: ["finance", "deal-manager", "reviewer", "bank-partner"],
    externalStakeholderSlice: "Bank partner release-gated shell",
    coreObject: "Bank package and loan case",
    moduleSurface: "Loans",
    adapterModules: ["loans", "files", "crm", "erp", "sync"],
    baselineStatus: "core_command_bound",
    proofWhenBound: "Loans workbench shows active case, bank package, conditions, evidence, blockers and persisted command history.",
    proofWhenUnbound: "Loans source runtime is not configured; finance command drafts persist in Core.",
    nextBindingStep: "Connect loan source records and keep bank sends behind release and reviewer gate.",
    adapterBindings: ["Loans conditions", "Bank package evidence", "CRM case map", "ERP finance map", "Files package map"],
    commandBindings: ["Loans checklist command draft", "Condition command draft"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "erp-finance-workbench",
    label: "ERP and finance workbench",
    route: "/erp?role=finance",
    area: "module",
    blockScope: "Finance operating module",
    ownerDepartment: "Finance",
    ownerRole: "finance",
    consumingRoles: ["finance", "crays-management", "reviewer", "franchise-partner"],
    externalStakeholderSlice: "Partner finance summaries only after scoped release",
    coreObject: "Finance model and operating ledger",
    moduleSurface: "ERP",
    adapterModules: ["erp", "sync"],
    baselineStatus: "adapter_wired_runtime_unavailable",
    proofWhenBound: "ERP finance workbench has adapter contract and guarded command draft surface.",
    proofWhenUnbound: "ERP runtime is currently unavailable in Localhost checks; no finance source rows are returned.",
    nextBindingStep: "Start/configure the ERP runtime and map invoices, fees, facilities and cost controls.",
    adapterBindings: ["Invoices", "Items", "Accounts", "Cost centers", "Facilities"],
    commandBindings: ["Finance command draft"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "files-workbench",
    label: "Files workbench",
    route: "/files?role=deal-manager",
    area: "module",
    blockScope: "Evidence and document lifecycle",
    ownerDepartment: "Legal / Compliance / Operations",
    ownerRole: "reviewer",
    consumingRoles: ["deal-manager", "finance", "expansion-manager", "reviewer", "bank-partner", "franchise-candidate"],
    externalStakeholderSlice: "Release-gated document packages",
    coreObject: "Evidence document",
    moduleSurface: "Files",
    adapterModules: ["files", "sync"],
    baselineStatus: "core_command_bound",
    proofWhenBound: "Files surface reads document lifecycle and can stage package preflight commands.",
    proofWhenUnbound: "File body/version storage adapter must be bound before real uploads or releases.",
    nextBindingStep: "Bind document metadata to versioned file storage and released package snapshots.",
    adapterBindings: ["Document package metadata", "Evidence lifecycle", "Source map links"],
    commandBindings: ["Files package command draft"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "analytics-workbench",
    label: "Analytics workbench",
    route: "/analytics?role=crays-management",
    area: "module",
    blockScope: "Management analytics",
    ownerDepartment: "Management",
    ownerRole: "crays-management",
    consumingRoles: ["crays-management", "finance", "deal-manager", "expansion-manager", "reviewer"],
    externalStakeholderSlice: "Board/investor reports only after approved release",
    coreObject: "Operating metric",
    moduleSurface: "Analytics",
    adapterModules: ["crm", "project", "erp", "loans", "files", "sync"],
    baselineStatus: "core_read_model_bound",
    proofWhenBound: "Analytics reads Core operating signals and sync/map readiness.",
    proofWhenUnbound: "Analytics needs source-backed metric grains from every module before production reporting.",
    nextBindingStep: "Define metric source maps and freshness windows per department.",
    adapterBindings: ["CRM funnel", "Project delivery", "ERP finance", "Loans readiness", "Files evidence"],
    commandBindings: ["Metric review command draft"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "operations-desk",
    label: "Operations desk",
    route: "/operations?role=studio-manager",
    area: "module",
    blockScope: "Operations department",
    ownerDepartment: "Operations",
    ownerRole: "studio-manager",
    consumingRoles: ["studio-manager", "franchise-partner", "crays-management", "reviewer"],
    externalStakeholderSlice: "Partner/studio operating scope",
    coreObject: "Studio operating task",
    moduleSurface: "Operations",
    adapterModules: ["member-app", "project", "erp", "files", "sync"],
    baselineStatus: "core_command_bound",
    proofWhenBound: "Operations desk reads synchronized Studio Cockpit source records for members, bookings, trainer load, payment exceptions and support work.",
    proofWhenUnbound: "Operations needs synchronized studio and member records before it can replace the generic desk shell.",
    nextBindingStep: "Continue binding maintenance, facilities and staff records into the same Studio Cockpit workbench.",
    adapterBindings: ["Studio source records", "Member operations", "Bookings", "Trainer schedules", "Support requests", "Maintenance evidence"],
    commandBindings: ["Studio operations action draft"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "hr-desk",
    label: "HR desk",
    route: "/hr?role=hr",
    area: "module",
    blockScope: "HR and staff operations",
    ownerDepartment: "HR",
    ownerRole: "hr",
    consumingRoles: ["hr", "studio-manager", "franchise-partner", "crays-management"],
    externalStakeholderSlice: "Staff users later through scoped records",
    coreObject: "Staff readiness profile",
    moduleSurface: "HR",
    adapterModules: ["erp", "project", "files", "sync"],
    baselineStatus: "needs_adapter_binding",
    proofWhenBound: "HR desk exists as a role-scoped shell.",
    proofWhenUnbound: "Staff records, contracts and onboarding state are not source-bound yet.",
    nextBindingStep: "Map staff records, onboarding tasks and certificates into Core projections.",
    adapterBindings: ["Staff records", "Onboarding tasks", "Certificates"],
    commandBindings: ["Staff readiness command draft"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "learning-desk",
    label: "Learning desk",
    route: "/learning?role=hr",
    area: "module",
    blockScope: "Academy and enablement",
    ownerDepartment: "Academy",
    ownerRole: "hr",
    consumingRoles: ["hr", "studio-manager", "franchise-partner", "crays-management"],
    externalStakeholderSlice: "Staff and partner training scope later",
    coreObject: "Learning progress record",
    moduleSurface: "Learning",
    adapterModules: ["project", "files", "sync"],
    baselineStatus: "needs_adapter_binding",
    proofWhenBound: "Learning desk exists as a role-scoped shell.",
    proofWhenUnbound: "Training paths, progress and certificates are not source-bound yet.",
    nextBindingStep: "Bind academy milestones to Project work and evidence certificates to Files.",
    adapterBindings: ["Training milestones", "Progress records", "Certificates"],
    commandBindings: ["Learning completion command draft"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "support-desk",
    label: "Support desk",
    route: "/support?role=studio-manager",
    area: "module",
    blockScope: "Support, Knowledge and Incident",
    ownerDepartment: "Support",
    ownerRole: "studio-manager",
    consumingRoles: ["studio-manager", "franchise-partner", "deal-manager", "reviewer"],
    externalStakeholderSlice: "Member and partner support scope after consent",
    coreObject: "Support incident",
    moduleSurface: "Support",
    adapterModules: ["communication", "project", "files", "sync"],
    baselineStatus: "contract_only",
    proofWhenBound: "Support persistence contracts exist, but live incidents are not source-bound.",
    proofWhenUnbound: "Incidents need a real support adapter plus task and attachment mapping.",
    nextBindingStep: "Bind incidents to Core events, tasks to Project and attachments to Files.",
    adapterBindings: ["Incident records", "Incident tasks", "Attachments"],
    commandBindings: ["Incident command draft"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "chat-desk",
    label: "Chat desk",
    route: "/chat?role=deal-manager",
    area: "module",
    blockScope: "Chat and collaboration",
    ownerDepartment: "Operations",
    ownerRole: "deal-manager",
    consumingRoles: ["deal-manager", "expansion-manager", "finance", "reviewer", "franchise-partner"],
    externalStakeholderSlice: "Candidate, partner and bank threads only after scoped grants",
    coreObject: "Conversation thread",
    moduleSurface: "Chat",
    adapterModules: ["communication", "files", "sync"],
    baselineStatus: "contract_only",
    proofWhenBound: "Chat contracts exist, but live message channels are not source-bound.",
    proofWhenUnbound: "Messages need a communication adapter, role grants and attachment mapping before real use.",
    nextBindingStep: "Bind conversations to Core events and released attachments to Files.",
    adapterBindings: ["Conversation records", "Message events", "Attachments"],
    commandBindings: ["Message draft command"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "sites-desk",
    label: "Sites desk",
    route: "/sites?role=admin",
    area: "module",
    blockScope: "Sites and public surfaces",
    ownerDepartment: "Marketing / IT",
    ownerRole: "admin",
    consumingRoles: ["admin", "crays-management", "reviewer"],
    externalStakeholderSlice: "Public pages only after review",
    coreObject: "Published site request",
    moduleSurface: "Sites",
    adapterModules: ["files", "sync"],
    baselineStatus: "gated_external_shell",
    proofWhenBound: "Sites is visible as a gated shell for reviewed public changes.",
    proofWhenUnbound: "No production publishing is enabled from Localhost.",
    nextBindingStep: "Attach site packages to review records and release gates before any publish action.",
    adapterBindings: ["Site package metadata", "Review evidence"],
    commandBindings: ["Site release preflight command"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "sync-module",
    label: "Sync module",
    route: "/sync?role=admin",
    area: "module",
    blockScope: "Shared engine mapping",
    ownerDepartment: "IT / Product / Data Governance",
    ownerRole: "admin",
    consumingRoles: ["admin", "crays-management", "reviewer", "finance", "deal-manager", "expansion-manager"],
    externalStakeholderSlice: "None",
    coreObject: "Sync job and record map",
    moduleSurface: "Sync",
    adapterModules: ["sync", "crm", "project", "erp", "files"],
    baselineStatus: "core_read_model_bound",
    proofWhenBound: "Sync module reads source map and sync job projections.",
    proofWhenUnbound: "Sync module needs reviewed conflict handling and module-specific apply paths.",
    nextBindingStep: "Bind conflict queues, retries and source apply drafts to audited command records.",
    adapterBindings: ["Integration connections", "External record maps", "Sync jobs"],
    commandBindings: ["Sync preview command draft"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "sync-data-sync",
    label: "Sync and Data Sync",
    route: "/settings/data-sync?role=admin",
    area: "settings",
    blockScope: "Shared engine mapping",
    ownerDepartment: "IT / Product / Data Governance",
    ownerRole: "admin",
    consumingRoles: ["admin", "crays-management", "reviewer", "finance", "deal-manager", "expansion-manager"],
    externalStakeholderSlice: "None",
    coreObject: "External record map and sync job",
    moduleSurface: "Settings / Data Sync",
    adapterModules: ["sync", "crm", "project", "erp", "files"],
    baselineStatus: "core_read_model_bound",
    proofWhenBound: "Data Sync reads integration connections, source maps, sync jobs and adapter readiness.",
    proofWhenUnbound: "Data Sync needs more module-level apply and conflict resolution controls.",
    nextBindingStep: "Add reviewed conflict queues and scoped source apply commands per module.",
    adapterBindings: ["Integration connections", "External record maps", "Sync jobs", "Workflow events"],
    commandBindings: ["Sync preview command draft"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "settings-integrations",
    label: "Settings integrations",
    route: "/settings/integrations?role=admin",
    area: "settings",
    blockScope: "Adapter administration",
    ownerDepartment: "IT / Product",
    ownerRole: "admin",
    consumingRoles: ["admin", "crays-management", "reviewer"],
    externalStakeholderSlice: "None",
    coreObject: "Integration connection",
    moduleSurface: "Settings / Integrations",
    adapterModules: ["sync", "crm", "project", "erp", "files"],
    baselineStatus: "core_read_model_bound",
    proofWhenBound: "Integration settings show adapter contracts, readiness and configuration state without secrets.",
    proofWhenUnbound: "Needs live runtime controls and scoped credential reference management.",
    nextBindingStep: "Expose credential-reference status and runtime health without returning values.",
    adapterBindings: ["Adapter health", "Configuration references"],
    commandBindings: ["Connection review command draft"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "candidate-deal-room",
    label: "Candidate deal room",
    route: "/pre-packed-deals/candidate",
    area: "portal",
    blockScope: "Candidate buying journey",
    ownerDepartment: "Franchise Sales",
    ownerRole: "deal-manager",
    consumingRoles: ["franchise-candidate", "deal-manager", "reviewer"],
    externalStakeholderSlice: "Candidate released deal package",
    coreObject: "Prepared offer projection",
    moduleSurface: "Candidate Portal",
    adapterModules: ["crm", "files", "loans", "sync"],
    baselineStatus: "gated_external_shell",
    proofWhenBound: "Candidate surface reads approved deal projections and evidence readiness.",
    proofWhenUnbound: "Candidate writes/releases remain gated; no internal records are exposed.",
    nextBindingStep: "Project only reviewed CRM, Files and Loans slices into candidate-visible records.",
    adapterBindings: ["Prepared offer projection", "Evidence package", "Candidate intent"],
    commandBindings: ["Candidate intent review command"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "funding-partner-bank-shell",
    label: "Funding partner bank shell",
    route: "/funding-partner-bank",
    area: "portal",
    blockScope: "Bank partner review",
    ownerDepartment: "Banking / Funding",
    ownerRole: "finance",
    consumingRoles: ["bank-partner", "finance", "reviewer"],
    externalStakeholderSlice: "Bank partner release-gated shell",
    coreObject: "Released bank package projection",
    moduleSurface: "Funding Partner Bank",
    adapterModules: ["loans", "files", "erp", "sync"],
    baselineStatus: "gated_external_shell",
    proofWhenBound: "Bank partner surface is a shell; internal records and PII stay hidden until reviewed release.",
    proofWhenUnbound: "No bank send or package release is enabled in Localhost.",
    nextBindingStep: "Bind only release-approved package snapshots and reviewer gate decisions.",
    adapterBindings: ["Released bank package", "Evidence package", "Finance summary"],
    commandBindings: ["Bank package release preflight"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "real-estate-web",
    label: "Real estate web",
    route: "/real-estate",
    area: "portal",
    blockScope: "Expansion and property acquisition",
    ownerDepartment: "Expansion",
    ownerRole: "expansion-manager",
    consumingRoles: ["expansion-manager", "landlord", "deal-manager", "reviewer"],
    externalStakeholderSlice: "Landlord/property owner scope",
    coreObject: "Property case projection",
    moduleSurface: "Real Estate",
    adapterModules: ["project", "files", "location-intelligence", "sync"],
    baselineStatus: "gated_external_shell",
    proofWhenBound: "Real estate surface is a released projection shell for property acquisition.",
    proofWhenUnbound: "Location and property feed analysis remain parked until the later location phase.",
    nextBindingStep: "After ERP/CRM/Project/Loans coverage, bind property cases to location analysis and owner evidence.",
    adapterBindings: ["Property case", "Owner evidence", "Location analysis"],
    commandBindings: ["Property review command"],
    closedGates: closedRuntimeGates,
  },
  {
    key: "investor-board-portal",
    label: "Investor and board portal",
    route: "/investments",
    area: "portal",
    blockScope: "Investor and board reporting",
    ownerDepartment: "Investor / Board",
    ownerRole: "crays-management",
    consumingRoles: ["investor", "crays-management", "finance", "reviewer"],
    externalStakeholderSlice: "Approved reporting only",
    coreObject: "Investor report projection",
    moduleSurface: "Investor Portal",
    adapterModules: ["erp", "files", "sync"],
    baselineStatus: "gated_external_shell",
    proofWhenBound: "Investor portal consumes approved report projections only.",
    proofWhenUnbound: "Investor-visible reporting still needs source-backed finance and analytics release workflow.",
    nextBindingStep: "Bind approved finance metrics and board packs to Files and release review.",
    adapterBindings: ["Finance summaries", "Board packs", "Operating metrics"],
    commandBindings: ["Investor report release preflight"],
    closedGates: closedRuntimeGates,
  },
];

function accessForRole(role: RoleKey): LocalhostAdapterCoverageReadModel["access"] {
  if (internalCoverageRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_localhost_coverage",
      reason: "Role can inspect Localhost surface coverage across Core, module adapters, commands, source maps and gates.",
    };
  }

  if (scopedCoverageRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_localhost_coverage",
      reason: "Role can inspect a scoped Localhost coverage view for operational handoff without secret values or source controls.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Localhost adapter coverage is internal-only.",
  };
}

function countByStatus(surfacesToCount: LocalhostAdapterCoverageSurface[], status: LocalhostCoverageStatus) {
  return surfacesToCount.filter((surface) => surface.status === status).length;
}

function statusFromDefinition(
  definition: SurfaceDefinition,
  moduleHealth: Map<string, { status: string; coreDbConfigured: boolean; dataTablesReady: boolean }>,
  sourceMapCounts: Map<string, number>,
): LocalhostCoverageStatus {
  if (definition.key === "crm-workbench" && (sourceMapCounts.get("crm") ?? 0) > 0) return "live_adapter_bound";
  if (definition.key === "operations-desk" && sourceMapCountFor("member-app", sourceMapCounts) > 0) return "live_adapter_bound";
  if (definition.key === "project-workbench" && !moduleHealth.get("project")?.coreDbConfigured) return "adapter_wired_runtime_missing";
  if (definition.key === "erp-finance-workbench" && moduleHealth.get("erp")?.status !== "schema_ready") return "adapter_wired_runtime_unavailable";
  return definition.baselineStatus;
}

function sourceMapCountFor(moduleKey: LocalhostAdapterCoverageSurface["adapterModules"][number], sourceMapCounts: Map<string, number>) {
  if (moduleKey === "member-app") return sourceMapCounts.get("member-app") ?? 0;
  return sourceMapCounts.get(moduleKey) ?? 0;
}

function proofFromStatus(definition: SurfaceDefinition, status: LocalhostCoverageStatus, sourceMapCounts: Map<string, number>) {
  if (status === "live_adapter_bound") {
    const mapped = definition.adapterModules.reduce((total, moduleKey) => total + sourceMapCountFor(moduleKey, sourceMapCounts), 0);
    return mapped > 0 ? `${definition.proofWhenBound} ${mapped} source maps are persisted for this surface's modules.` : definition.proofWhenBound;
  }
  return definition.proofWhenUnbound ?? definition.proofWhenBound;
}

function sourceMapBindingsFor(definition: SurfaceDefinition, sourceMapCounts: Map<string, number>) {
  return definition.adapterModules.map((moduleKey) => {
    const count = sourceMapCountFor(moduleKey, sourceMapCounts);
    return `${moduleKey}: ${count} persisted map${count === 1 ? "" : "s"}`;
  });
}

async function getMemberAppSourceMapCount() {
  if (!getCoreDatabaseRuntimeState().configured) return 0;
  try {
    const result = await getCorePgPool().query<{ maps: string }>(
      `
        select count(*)::text as maps
        from crays_core.external_record_maps
        where external_system = 'member-app'
      `,
    );
    return Number(result.rows[0]?.maps ?? 0);
  } catch {
    return 0;
  }
}

async function getLocationIntelligenceSourceMapCount() {
  if (!getCoreDatabaseRuntimeState().configured) return 0;
  try {
    const result = await getCorePgPool().query<{ maps: string }>(
      `
        select count(*)::text as maps
        from crays_core.external_record_maps
        where external_system = 'location-intelligence'
      `,
    );
    return Number(result.rows[0]?.maps ?? 0);
  } catch {
    return 0;
  }
}

export async function getLocalhostAdapterCoverageReadModel(role: RoleKey): Promise<LocalhostAdapterCoverageReadModel> {
  const access = accessForRole(role);

  if (!access.allowed) {
    return {
      role,
      access,
      summary: {
        totalSurfaces: 0,
        liveAdapterBound: 0,
        coreCommandBound: 0,
        coreReadModelBound: 0,
        adapterWiredRuntimeMissing: 0,
        adapterWiredRuntimeUnavailable: 0,
        contractOnly: 0,
        gatedExternalShell: 0,
        needsAdapterBinding: 0,
        sourceMappedModules: 0,
        sourceMapsPersisted: 0,
        localhostVerificationRequired: true,
      },
      coreSync: {
        status: "forbidden",
        schemaReady: false,
        integrationConnections: 0,
        externalRecordMaps: 0,
        syncJobs: 0,
        moduleCoverage: [],
      },
      surfaces: [],
      verificationPlan: [],
      boundaries: boundaries(),
    };
  }

  const [adapterHealth, syncReadiness, memberAppMaps, locationIntelligenceMaps] = await Promise.all([getAdapterHealthReadiness(role), getSyncAdapterReadiness("admin"), getMemberAppSourceMapCount(), getLocationIntelligenceSourceMapCount()]);
  const moduleHealth = new Map(
    adapterHealth.modules.map((module) => [
      module.module,
      {
        status: module.status,
        coreDbConfigured: module.coreDbConfigured,
        dataTablesReady: module.dataTablesReady,
      },
    ]),
  );
  const sourceMapCounts = new Map(syncReadiness.moduleCoverage.modules.map((module) => [module.moduleKey, module.externalMaps]));
  sourceMapCounts.set("member-app", memberAppMaps);
  sourceMapCounts.set("location-intelligence", locationIntelligenceMaps);

  const coverageSurfaces = surfaces.map((definition): LocalhostAdapterCoverageSurface => {
    const status = statusFromDefinition(definition, moduleHealth, sourceMapCounts);
    return {
      ...definition,
      status,
      currentProof: proofFromStatus(definition, status, sourceMapCounts),
      sourceMapBindings: sourceMapBindingsFor(definition, sourceMapCounts),
    };
  });

  return {
    role,
    access,
    summary: {
      totalSurfaces: coverageSurfaces.length,
      liveAdapterBound: countByStatus(coverageSurfaces, "live_adapter_bound"),
      coreCommandBound: countByStatus(coverageSurfaces, "core_command_bound"),
      coreReadModelBound: countByStatus(coverageSurfaces, "core_read_model_bound"),
      adapterWiredRuntimeMissing: countByStatus(coverageSurfaces, "adapter_wired_runtime_missing"),
      adapterWiredRuntimeUnavailable: countByStatus(coverageSurfaces, "adapter_wired_runtime_unavailable"),
      contractOnly: countByStatus(coverageSurfaces, "contract_only"),
      gatedExternalShell: countByStatus(coverageSurfaces, "gated_external_shell"),
      needsAdapterBinding: countByStatus(coverageSurfaces, "needs_adapter_binding"),
      sourceMappedModules: syncReadiness.moduleCoverage.modules.filter((module) => module.externalMaps > 0).length,
      sourceMapsPersisted: syncReadiness.syncSurface.currentExternalRecordMaps,
      localhostVerificationRequired: true,
    },
    coreSync: {
      status: syncReadiness.access.allowed ? "ready" : "forbidden",
      schemaReady: syncReadiness.syncSurface.syncTablesReady,
      integrationConnections: syncReadiness.syncSurface.currentIntegrationConnections,
      externalRecordMaps: syncReadiness.syncSurface.currentExternalRecordMaps,
      syncJobs: syncReadiness.syncSurface.currentSyncJobs,
      moduleCoverage: syncReadiness.moduleCoverage.modules,
    },
    surfaces: coverageSurfaces,
    verificationPlan: [
      {
        key: "settings-data-sync",
        label: "Open Data Sync coverage",
        route: "/settings/data-sync?role=admin",
        expectedEvidence: "Coverage panel shows every major Localhost surface and its adapter state.",
      },
      {
        key: "crm-live",
        label: "Open CRM workbench",
        route: "/crm?role=deal-manager",
        expectedEvidence: "CRM surface shows live business records and persisted source maps.",
      },
      {
        key: "loans-command-history",
        label: "Open Loans workbench",
        route: "/loans?role=finance",
        expectedEvidence: "Loans surface shows bank package, conditions and persisted command history.",
      },
      {
        key: "rooms-preflight",
        label: "Open stakeholder rooms",
        route: "/dashboard?role=deal-manager&view=rooms",
        expectedEvidence: "Rooms surface shows release-gated evidence and blocked apply/release gates.",
      },
    ],
    boundaries: boundaries(),
  };
}

function boundaries(): LocalhostAdapterCoverageReadModel["boundaries"] {
  return {
    secretsReturned: false,
    privateKeysReturned: false,
    externalSendingEnabled: false,
    bankSendEnabled: false,
    paymentInitiationEnabled: false,
    publicReleaseEnabled: false,
    productionDeployEnabled: false,
    destructiveSourceApplyEnabled: false,
  };
}
