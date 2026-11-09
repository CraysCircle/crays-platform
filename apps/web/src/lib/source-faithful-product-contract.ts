import type { RoleKey } from "./roles";

export type SourceFaithfulModuleKey = "project" | "crm" | "erp" | "files" | "sync" | "analytics" | "loans";

type AccessLevel = "internal_workbench" | "scoped_workbench" | "internal_governance" | "forbidden";

type SurfaceStatus = "ready_read_only" | "settings_mapped" | "governance_ready" | "blocked_until_data";

export type SourceFaithfulAccess = {
  allowed: boolean;
  level: AccessLevel;
  reason: string;
};

type WorkbenchRecord = {
  key: string;
  label: string;
  scope: string;
  status: SurfaceStatus;
  count: number;
};

export type SourceWorkbenchRow = {
  id: string;
  label: string;
  status: string;
  owner: string;
  modifiedAt?: string;
  fields: Record<string, string | number | boolean | null>;
};

export type SourceWorkbenchSection = {
  key: string;
  label: string;
  count: number;
  rows: SourceWorkbenchRow[];
};

type WorkbenchView = {
  key: string;
  label: string;
  type: "table" | "board" | "timeline" | "calendar" | "detail" | "matrix" | "dashboard";
  status: SurfaceStatus;
  roleScoped: true;
};

type WorkbenchAction = {
  key: string;
  label: string;
  enabled: false;
  requires: string;
};

type SettingsGroup = {
  key: string;
  label: string;
  items: string[];
  status: SurfaceStatus;
};

type AiTool = {
  key: string;
  label: string;
  scope: string;
  enabled: false;
  approvalRequired: true;
};

type ModuleWorkbenchConfig = {
  key: SourceFaithfulModuleKey;
  label: string;
  blockRange: string;
  internalRoles: RoleKey[];
  scopedRoles: RoleKey[];
  records: WorkbenchRecord[];
  views: WorkbenchView[];
  settingsGroups: SettingsGroup[];
  aiTools: AiTool[];
  workflows: string[];
  actions: WorkbenchAction[];
  nextBlocks: string[];
};

export type SourceFaithfulWorkbenchContract = {
  role: RoleKey;
  access: SourceFaithfulAccess;
  module: {
    key: SourceFaithfulModuleKey;
    label: string;
    blockRange: string;
    sourceFaithful: true;
    craysNativeSurface: true;
    sourceUiEmbedded: false;
    visibleSourceWording: false;
  };
  navigation: WorkbenchView[];
  records: WorkbenchRecord[];
  settingsGroups: SettingsGroup[];
  aiTools: AiTool[];
  workflows: string[];
  actions: WorkbenchAction[];
  sourceRuntime?: {
    connection: string;
    owner: string;
    generatedAt: string;
    capabilities: Record<string, unknown>;
    diagnostics?: Record<string, unknown>;
  };
  sourceSections?: SourceWorkbenchSection[];
  boundaries: SourceFaithfulBoundaries;
  nextBlocks: string[];
};

export type SourceFaithfulBoundaries = {
  readOnly: boolean;
  sourceRuntimeCallsEnabled: boolean;
  sourceWritesEnabled: boolean;
  syncWritesEnabled: boolean;
  providerCallsEnabled: boolean;
  aiProviderCallsEnabled: boolean;
  fileUploadEnabled: boolean;
  binaryDownloadEnabled: boolean;
  filePreviewEnabled: boolean;
  externalSendingEnabled: boolean;
  publicReleaseEnabled: boolean;
  candidateReleaseEnabled: boolean;
  financeWritesEnabled: boolean;
  accountingExportsEnabled: boolean;
  bankSendEnabled: boolean;
  destructiveReconciliationEnabled: boolean;
  controlActionsEnabled: boolean;
  secretsReturned: boolean;
  privateKeysReturned: boolean;
  liveSourceRecordsReturned: boolean;
  liveBusinessRecordsReturned: boolean;
};

type ParityItem = {
  key: string;
  label: string;
  productLabel: string;
  status: SurfaceStatus;
};

export type ProjectCrmParityContract = {
  role: RoleKey;
  access: SourceFaithfulAccess;
  block: "Block 66";
  status: "ready";
  modules: Array<{
    key: "project" | "crm";
    label: "Project" | "CRM";
    aiParity: ParityItem[];
    settingsParity: ParityItem[];
    sourceFaithfulSurfaceRequired: true;
  }>;
  boundaries: SourceFaithfulBoundaries;
  nextBlocks: ["Block 67", "Block 68", "Block 69"];
};

export type ModuleSettingsParityContract = {
  role: RoleKey;
  access: SourceFaithfulAccess;
  module: {
    key: "project" | "crm";
    label: "Project" | "CRM";
    block: "Block 67" | "Block 68";
  };
  groups: SettingsGroup[];
  permissionMatrix: Array<{
    key: string;
    label: string;
    owner: string;
    allowedRoles: RoleKey[];
    status: SurfaceStatus;
  }>;
  boundaries: SourceFaithfulBoundaries;
};

export type AiGovernanceContract = {
  role: RoleKey;
  access: SourceFaithfulAccess;
  block: "Block 69";
  status: "governance_ready";
  modules: ["Project", "CRM"];
  providerState: {
    configuredProvidersReturned: false;
    liveProviderCallEnabled: false;
    localModelAllowedByPolicy: false;
    disableSwitchRequired: true;
    usageLedgerRequired: true;
    approvalGateRequired: true;
  };
  tools: AiTool[];
  auditRequirements: string[];
  boundaries: SourceFaithfulBoundaries;
};

export type SourceFaithfulReadinessContract = {
  role: RoleKey;
  access: SourceFaithfulAccess;
  blockRange: "Blocks 66-90";
  completedBlocks: number;
  totalBlocks: 25;
  sourceFaithfulModules: number;
  craysNativePanels: number;
  approvedWriteAdapters: 0;
  nextRequiredPause: "after_block_90_user_review";
  modules: Array<{
    key: SourceFaithfulModuleKey;
    label: string;
    blockRange: string;
    recordsMapped: number;
    viewsMapped: number;
    settingsGroupsMapped: number;
    aiToolsMapped: number;
  }>;
  blockLedger: Array<{
    block: string;
    title: string;
    status: "implemented_read_only";
  }>;
  boundaries: SourceFaithfulBoundaries;
};

const projectInternalRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager"];
const crmInternalRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager"];
const financeInternalRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "finance"];
const operatorRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];

function boundaries(): SourceFaithfulBoundaries {
  return {
    readOnly: true,
    sourceRuntimeCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    providerCallsEnabled: false,
    aiProviderCallsEnabled: false,
    fileUploadEnabled: false,
    binaryDownloadEnabled: false,
    filePreviewEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    candidateReleaseEnabled: false,
    financeWritesEnabled: false,
    accountingExportsEnabled: false,
    bankSendEnabled: false,
    destructiveReconciliationEnabled: false,
    controlActionsEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
    liveSourceRecordsReturned: false,
    liveBusinessRecordsReturned: false,
  };
}

const projectSettings: SettingsGroup[] = [
  {
    key: "workspace",
    label: "Workspace",
    items: ["Members", "Roles", "Custom roles", "Features", "Import and export", "Activity"],
    status: "settings_mapped",
  },
  {
    key: "project",
    label: "Project",
    items: ["Members", "States", "Labels", "Estimates", "Work item types", "Custom properties"],
    status: "settings_mapped",
  },
  {
    key: "delivery",
    label: "Delivery",
    items: ["Cycles", "Modules", "Pages", "Views", "Intake", "Templates"],
    status: "settings_mapped",
  },
  {
    key: "automation",
    label: "Automation",
    items: ["Workflow rules", "Webhooks", "API access", "AI use", "Semantic search"],
    status: "settings_mapped",
  },
];

const crmSettings: SettingsGroup[] = [
  {
    key: "workspace",
    label: "Workspace",
    items: ["Name", "Logo", "Time zone", "Date format", "Members", "Invites", "Home layout"],
    status: "settings_mapped",
  },
  {
    key: "permissions",
    label: "Permissions",
    items: ["Roles", "Object access", "Field access", "Settings access", "SSO policy", "Timeline visibility"],
    status: "settings_mapped",
  },
  {
    key: "data-model",
    label: "Data model",
    items: ["Objects", "Fields", "Relations", "Views", "Layouts", "Record pages", "Activity types"],
    status: "settings_mapped",
  },
  {
    key: "communication",
    label: "Communication",
    items: ["Inbox routing", "Email templates", "Calendar sync", "Meeting types", "Notification rules", "File links"],
    status: "settings_mapped",
  },
  {
    key: "workflow",
    label: "Workflow",
    items: ["Triggers", "Actions", "AI steps", "Approvals", "Rate limits", "Credit readiness", "Activity automation"],
    status: "settings_mapped",
  },
];

const configs: Record<SourceFaithfulModuleKey, ModuleWorkbenchConfig> = {
  project: {
    key: "project",
    label: "Project",
    blockRange: "Blocks 70-75",
    internalRoles: projectInternalRoles,
    scopedRoles: ["franchise-partner", "studio-manager", "landlord", "vendor"],
    records: [
      { key: "projects", label: "Projects", scope: "Opening and handoff projects", status: "ready_read_only", count: 0 },
      { key: "work-items", label: "Work items", scope: "Tasks, defects and milestones", status: "ready_read_only", count: 0 },
      { key: "cycles", label: "Cycles", scope: "Time-boxed delivery", status: "ready_read_only", count: 0 },
      { key: "modules", label: "Modules", scope: "Delivery streams", status: "ready_read_only", count: 0 },
      { key: "pages", label: "Pages", scope: "Project knowledge base", status: "ready_read_only", count: 0 },
    ],
    views: [
      { key: "list", label: "List", type: "table", status: "ready_read_only", roleScoped: true },
      { key: "board", label: "Board", type: "board", status: "ready_read_only", roleScoped: true },
      { key: "timeline", label: "Timeline", type: "timeline", status: "ready_read_only", roleScoped: true },
      { key: "cycles", label: "Cycles", type: "dashboard", status: "ready_read_only", roleScoped: true },
      { key: "pages", label: "Pages", type: "detail", status: "ready_read_only", roleScoped: true },
      { key: "settings", label: "Settings", type: "matrix", status: "settings_mapped", roleScoped: true },
    ],
    settingsGroups: projectSettings,
    aiTools: [
      { key: "project-brief", label: "Project brief builder", scope: "Projects and work items", enabled: false, approvalRequired: true },
      { key: "duplicate-check", label: "Duplicate and blocker review", scope: "Backlog", enabled: false, approvalRequired: true },
      { key: "project-qa", label: "Project Q&A", scope: "Role-visible project context", enabled: false, approvalRequired: true },
      { key: "delivery-agent", label: "Delivery agent", scope: "Assigned work only", enabled: false, approvalRequired: true },
    ],
    workflows: ["Intake", "Triage", "Backlog", "Cycle planning", "Delivery", "Review", "Handoff"],
    actions: [
      { key: "create-project", label: "Create project", enabled: false, requires: "write adapter approval" },
      { key: "create-work-item", label: "Create work item", enabled: false, requires: "write adapter approval" },
      { key: "add-comment", label: "Add comment", enabled: false, requires: "external and internal message policy" },
      { key: "run-ai", label: "Run AI tool", enabled: false, requires: "AI governance approval" },
    ],
    nextBlocks: ["Block 70", "Block 71", "Block 72", "Block 73", "Block 74", "Block 75"],
  },
  crm: {
    key: "crm",
    label: "CRM",
    blockRange: "Blocks 76-80",
    internalRoles: crmInternalRoles,
    scopedRoles: [],
    records: [
      { key: "companies", label: "Companies", scope: "Accounts and partner organizations", status: "ready_read_only", count: 0 },
      { key: "people", label: "People", scope: "Contacts and stakeholders", status: "ready_read_only", count: 0 },
      { key: "leads", label: "Leads", scope: "Inbound candidate and property owner demand", status: "ready_read_only", count: 0 },
      { key: "opportunities", label: "Opportunities", scope: "Candidate and expansion pipeline", status: "ready_read_only", count: 0 },
      { key: "tasks", label: "Tasks", scope: "Follow-up work", status: "ready_read_only", count: 0 },
      { key: "notes", label: "Notes", scope: "Internal context", status: "ready_read_only", count: 0 },
      { key: "emails", label: "Emails", scope: "Role-scoped message records and reply drafts", status: "ready_read_only", count: 0 },
      { key: "calendar-events", label: "Calendar events", scope: "Meetings, site visits and follow-up dates", status: "ready_read_only", count: 0 },
      { key: "activities", label: "Activities", scope: "Calls, messages, notes and record changes", status: "ready_read_only", count: 0 },
      { key: "files", label: "Files", scope: "Record-linked file metadata and package links", status: "ready_read_only", count: 0 },
      { key: "reports", label: "Reports", scope: "Pipeline, owner, candidate and bank-readiness reporting", status: "ready_read_only", count: 0 },
    ],
    views: [
      { key: "home", label: "Home", type: "dashboard", status: "ready_read_only", roleScoped: true },
      { key: "records", label: "Records", type: "table", status: "ready_read_only", roleScoped: true },
      { key: "pipeline", label: "Pipeline", type: "board", status: "ready_read_only", roleScoped: true },
      { key: "inbox", label: "Inbox", type: "table", status: "ready_read_only", roleScoped: true },
      { key: "calendar", label: "Calendar", type: "calendar", status: "ready_read_only", roleScoped: true },
      { key: "timeline", label: "Timeline", type: "timeline", status: "ready_read_only", roleScoped: true },
      { key: "record-page", label: "Record page", type: "detail", status: "ready_read_only", roleScoped: true },
      { key: "tasks", label: "Tasks", type: "table", status: "ready_read_only", roleScoped: true },
      { key: "files", label: "Files", type: "table", status: "ready_read_only", roleScoped: true },
      { key: "reports", label: "Reports", type: "dashboard", status: "ready_read_only", roleScoped: true },
      { key: "workflow", label: "Workflow", type: "timeline", status: "ready_read_only", roleScoped: true },
      { key: "settings", label: "Settings", type: "matrix", status: "settings_mapped", roleScoped: true },
    ],
    settingsGroups: crmSettings,
    aiTools: [
      { key: "crm-assistant", label: "CRM assistant", scope: "Role-visible records", enabled: false, approvalRequired: true },
      { key: "record-summary", label: "Record summary", scope: "Companies, people and opportunities", enabled: false, approvalRequired: true },
      { key: "pipeline-review", label: "Pipeline health review", scope: "Opportunity stages", enabled: false, approvalRequired: true },
      { key: "email-summary", label: "Email summary", scope: "Inbox and record-linked email context", enabled: false, approvalRequired: true },
      { key: "meeting-brief", label: "Meeting brief", scope: "Calendar events and related records", enabled: false, approvalRequired: true },
      { key: "workflow-agent", label: "Workflow agent", scope: "Approved workflow steps", enabled: false, approvalRequired: true },
    ],
    workflows: [
      "Lead capture",
      "Qualification",
      "Opportunity review",
      "Inbox triage",
      "Meeting scheduling",
      "Activity logging",
      "Task follow-up",
      "Approval",
      "Handoff",
    ],
    actions: [
      { key: "create-company", label: "Create company", enabled: false, requires: "CRM write adapter approval" },
      { key: "create-task", label: "Create task", enabled: false, requires: "CRM write adapter approval" },
      { key: "log-activity", label: "Log activity", enabled: false, requires: "CRM write adapter approval" },
      { key: "create-calendar-event", label: "Create calendar event", enabled: false, requires: "calendar write adapter approval" },
      { key: "draft-email", label: "Draft email", enabled: false, requires: "external sending approval" },
      { key: "send-email", label: "Send email", enabled: false, requires: "external sending approval" },
      { key: "run-ai", label: "Run AI tool", enabled: false, requires: "AI governance approval" },
    ],
    nextBlocks: ["Block 76", "Block 77", "Block 78", "Block 79", "Block 80"],
  },
  erp: {
    key: "erp",
    label: "ERP",
    blockRange: "Blocks 81-82",
    internalRoles: financeInternalRoles,
    scopedRoles: ["deal-manager", "franchise-partner", "studio-manager"],
    records: [
      { key: "customers", label: "Customers", scope: "Scoped account summaries", status: "ready_read_only", count: 0 },
      { key: "invoices", label: "Invoices", scope: "Status only", status: "ready_read_only", count: 0 },
      { key: "payment-exceptions", label: "Payment exceptions", scope: "Member and partner receivable recovery", status: "ready_read_only", count: 0 },
      { key: "budgets", label: "Budgets", scope: "Opening budget summary", status: "ready_read_only", count: 0 },
      { key: "accounts", label: "Accounts", scope: "Finance summary", status: "ready_read_only", count: 0 },
      { key: "cost-centers", label: "Cost centers", scope: "Opening and studio cost control", status: "ready_read_only", count: 0 },
      { key: "suppliers", label: "Suppliers", scope: "Supplier and partner administration", status: "ready_read_only", count: 0 },
      { key: "items", label: "Items", scope: "Procurement and equipment catalog", status: "ready_read_only", count: 0 },
      { key: "purchase-orders", label: "Purchase orders", scope: "Procurement commitments", status: "ready_read_only", count: 0 },
      { key: "material-requests", label: "Material requests", scope: "Studio opening supply requests", status: "ready_read_only", count: 0 },
      { key: "projects", label: "Projects", scope: "Opening and operating administration", status: "ready_read_only", count: 0 },
      { key: "tasks", label: "Tasks", scope: "Back-office work items", status: "ready_read_only", count: 0 },
      { key: "employees", label: "Employees", scope: "Staff and HR administration", status: "ready_read_only", count: 0 },
      { key: "departments", label: "Departments", scope: "Department ownership and reporting", status: "ready_read_only", count: 0 },
      { key: "job-applicants", label: "Job applicants", scope: "Staffing pipeline where available", status: "ready_read_only", count: 0 },
      { key: "training-events", label: "Training events", scope: "Academy and staff readiness where available", status: "ready_read_only", count: 0 },
      { key: "assets", label: "Assets", scope: "Facilities and equipment administration", status: "ready_read_only", count: 0 },
      { key: "maintenance", label: "Maintenance", scope: "Equipment and facilities service work", status: "ready_read_only", count: 0 },
      { key: "issues", label: "Issues", scope: "Support, quality and corrective work", status: "ready_read_only", count: 0 },
      { key: "quality-inspections", label: "Quality inspections", scope: "Quality and compliance checks", status: "ready_read_only", count: 0 },
      { key: "communications", label: "Communications", scope: "Object-bound back-office communication", status: "ready_read_only", count: 0 },
    ],
    views: [
      { key: "finance-summary", label: "Finance summary", type: "dashboard", status: "ready_read_only", roleScoped: true },
      { key: "invoice-status", label: "Invoice status", type: "table", status: "ready_read_only", roleScoped: true },
      { key: "budget-review", label: "Budget review", type: "matrix", status: "ready_read_only", roleScoped: true },
      { key: "procurement", label: "Procurement", type: "table", status: "ready_read_only", roleScoped: true },
      { key: "staff", label: "Staff", type: "table", status: "ready_read_only", roleScoped: true },
      { key: "facilities", label: "Facilities", type: "board", status: "ready_read_only", roleScoped: true },
      { key: "quality", label: "Quality", type: "table", status: "ready_read_only", roleScoped: true },
    ],
    settingsGroups: [
      { key: "finance-policy", label: "Finance policy", items: ["Roles", "Export approval", "Bank send gates"], status: "settings_mapped" },
      { key: "accounting", label: "Accounting", items: ["Accounts", "Cost centers", "Tax review"], status: "settings_mapped" },
      { key: "procurement", label: "Procurement", items: ["Suppliers", "Items", "Purchase orders", "Material requests"], status: "settings_mapped" },
      { key: "studio-back-office", label: "Studio back office", items: ["Employees", "Departments", "Assets", "Maintenance", "Quality"], status: "settings_mapped" },
    ],
    aiTools: [],
    workflows: ["Invoice review", "Budget review", "Procurement review", "Staffing review", "Asset service review", "Quality follow-up", "Export staging"],
    actions: [
      { key: "review-accounting-export", label: "Review accounting export request", enabled: false, requires: "accounting export approval" },
      { key: "review-bank-finance-evidence", label: "Review bank package finance evidence", enabled: false, requires: "bank send approval" },
      { key: "stage-purchase-review", label: "Stage purchase variance review", enabled: false, requires: "procurement command approval" },
      { key: "stage-maintenance-follow-up", label: "Stage maintenance cost follow-up", enabled: false, requires: "operations command approval" },
      { key: "stage-staffing-review", label: "Stage staffing cost review", enabled: false, requires: "HR command approval" },
    ],
    nextBlocks: ["Block 81", "Block 82"],
  },
  files: {
    key: "files",
    label: "Files",
    blockRange: "Blocks 83-84",
    internalRoles: ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance"],
    scopedRoles: ["franchise-candidate", "franchise-partner", "bank-partner", "landlord", "vendor"],
    records: [
      { key: "packages", label: "Packages", scope: "Candidate, owner, bank, partner, support and supplier package sets", status: "ready_read_only", count: 0 },
      { key: "documents", label: "Documents", scope: "Metadata, versions, package links and recipient visibility", status: "ready_read_only", count: 0 },
      { key: "version-history", label: "Version history", scope: "Reviewed document version state", status: "ready_read_only", count: 0 },
      { key: "approvals", label: "Approvals", scope: "Reviewer, finance, deal and expansion package decisions", status: "ready_read_only", count: 0 },
      { key: "grants", label: "Grants", scope: "Recipient-room access scopes and hidden sections", status: "ready_read_only", count: 0 },
      { key: "redactions", label: "Redactions", scope: "Candidate, owner, bank and support-safe redaction work", status: "ready_read_only", count: 0 },
      { key: "release-preflights", label: "Release preflights", scope: "Audience, visible sections, hidden sections and closed release gates", status: "ready_read_only", count: 0 },
      { key: "room-access", label: "Room access", scope: "Stakeholder access requests before any room release", status: "ready_read_only", count: 0 },
      { key: "package-tasks", label: "Package tasks", scope: "Next actions across document package preparation", status: "ready_read_only", count: 0 },
    ],
    views: [
      { key: "vault", label: "Vault", type: "table", status: "ready_read_only", roleScoped: true },
      { key: "package-builder", label: "Package builder", type: "matrix", status: "ready_read_only", roleScoped: true },
      { key: "release-review", label: "Release review", type: "detail", status: "ready_read_only", roleScoped: true },
    ],
    settingsGroups: [
      { key: "vault-policy", label: "Vault policy", items: ["Grants", "Versioning", "Review states", "Release gates"], status: "settings_mapped" },
      { key: "storage", label: "Storage", items: ["Upload approval", "Scanning", "Retention", "Takedown"], status: "blocked_until_data" },
    ],
    aiTools: [],
    workflows: ["Collect metadata", "Review versions", "Approve package scope", "Prepare room preflight", "Stage release review"],
    actions: [
      { key: "review-upload-request", label: "Review upload request", enabled: false, requires: "upload and scanning approval" },
      { key: "review-preview-request", label: "Review private preview request", enabled: false, requires: "binary preview approval" },
      { key: "stage-package-release-review", label: "Stage package release review", enabled: false, requires: "release approval" },
    ],
    nextBlocks: ["Block 83", "Block 84"],
  },
  sync: {
    key: "sync",
    label: "Sync",
    blockRange: "Block 85",
    internalRoles: ["admin", "crays-management", "reviewer", "finance"],
    scopedRoles: [],
    records: [
      { key: "mappings", label: "Mappings", scope: "External record maps", status: "ready_read_only", count: 0 },
      { key: "jobs", label: "Jobs", scope: "Dry-run sync jobs", status: "ready_read_only", count: 0 },
      { key: "conflicts", label: "Conflicts", scope: "Review queue", status: "ready_read_only", count: 0 },
    ],
    views: [
      { key: "mapping-table", label: "Mapping table", type: "table", status: "ready_read_only", roleScoped: true },
      { key: "conflict-review", label: "Conflict review", type: "matrix", status: "ready_read_only", roleScoped: true },
      { key: "job-timeline", label: "Job timeline", type: "timeline", status: "ready_read_only", roleScoped: true },
    ],
    settingsGroups: [
      { key: "mapping-policy", label: "Mapping policy", items: ["Matching", "Conflict class", "Retry policy", "Audit"], status: "settings_mapped" },
    ],
    aiTools: [],
    workflows: ["Map", "Compare", "Review", "Dry run", "Approve"],
    actions: [
      { key: "refresh-map", label: "Refresh mapping", enabled: false, requires: "sync write approval" },
      { key: "retry-job", label: "Retry job", enabled: false, requires: "retry policy approval" },
    ],
    nextBlocks: ["Block 85"],
  },
  analytics: {
    key: "analytics",
    label: "Analytics",
    blockRange: "Block 86",
    internalRoles: ["admin", "crays-management", "reviewer", "finance", "deal-manager", "expansion-manager"],
    scopedRoles: ["franchise-partner", "studio-manager", "bank-partner", "investor"],
    records: [
      { key: "kpis", label: "KPIs", scope: "Role-visible snapshots", status: "ready_read_only", count: 0 },
      { key: "reports", label: "Reports", scope: "Reviewed summaries", status: "ready_read_only", count: 0 },
      { key: "alerts", label: "Alerts", scope: "Threshold signals", status: "ready_read_only", count: 0 },
    ],
    views: [
      { key: "scorecards", label: "Scorecards", type: "dashboard", status: "ready_read_only", roleScoped: true },
      { key: "risk", label: "Risk", type: "matrix", status: "ready_read_only", roleScoped: true },
      { key: "portfolio", label: "Portfolio", type: "dashboard", status: "ready_read_only", roleScoped: true },
    ],
    settingsGroups: [
      { key: "metric-policy", label: "Metric policy", items: ["Definitions", "Thresholds", "Refresh", "Visibility"], status: "settings_mapped" },
    ],
    aiTools: [],
    workflows: ["Collect", "Compute", "Review", "Publish"],
    actions: [{ key: "publish-report", label: "Publish report", enabled: false, requires: "report approval" }],
    nextBlocks: ["Block 86"],
  },
  loans: {
    key: "loans",
    label: "Loans",
    blockRange: "Block 87",
    internalRoles: ["admin", "crays-management", "reviewer", "finance", "deal-manager"],
    scopedRoles: ["bank-partner", "franchise-candidate", "franchise-partner"],
    records: [
      { key: "packages", label: "Packages", scope: "Reviewed deal packages", status: "ready_read_only", count: 0 },
      { key: "loan-cases", label: "Loan cases", scope: "Credit workflow state", status: "ready_read_only", count: 0 },
      { key: "conditions", label: "Conditions", scope: "Lender requirements", status: "ready_read_only", count: 0 },
    ],
    views: [
      { key: "package-readiness", label: "Package readiness", type: "dashboard", status: "ready_read_only", roleScoped: true },
      { key: "conditions", label: "Conditions", type: "table", status: "ready_read_only", roleScoped: true },
      { key: "handoff", label: "Handoff", type: "timeline", status: "ready_read_only", roleScoped: true },
    ],
    settingsGroups: [
      { key: "lender-policy", label: "Lender policy", items: ["Release", "Consent", "Conditions", "Audit"], status: "settings_mapped" },
    ],
    aiTools: [],
    workflows: ["Package review", "Candidate consent", "Lender release", "Conditions", "Monitoring"],
    actions: [
      { key: "release-lender", label: "Release to lender", enabled: false, requires: "lender release approval" },
      { key: "start-check", label: "Start regulated check", enabled: false, requires: "regulated workflow approval" },
    ],
    nextBlocks: ["Block 87"],
  },
};

function accessFor(config: ModuleWorkbenchConfig, role: RoleKey): SourceFaithfulAccess {
  if (config.internalRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_workbench",
      reason: `${config.label} CRAYS-native workbench is available in read-only mode for this role.`,
    };
  }

  if (config.scopedRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_workbench",
      reason: `${config.label} CRAYS-native scoped workbench is available without internal counts or write actions.`,
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: `${config.label} workbench requires a scoped role.`,
  };
}

function governanceAccess(role: RoleKey): SourceFaithfulAccess {
  if (["admin", "crays-management", "reviewer"].includes(role)) {
    return {
      allowed: true,
      level: "internal_governance",
      reason: "Role can review source-faithful product and AI governance contracts.",
    };
  }

  if (["deal-manager", "expansion-manager", "finance"].includes(role)) {
    return {
      allowed: true,
      level: "scoped_workbench",
      reason: "Role can review scoped module planning and disabled AI/tool states.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Governance review requires internal or scoped planning access.",
  };
}

export function getSourceFaithfulWorkbench(module: SourceFaithfulModuleKey, role: RoleKey): SourceFaithfulWorkbenchContract {
  const config = configs[module];
  const access = accessFor(config, role);
  const scoped = access.level === "scoped_workbench";

  return {
    role,
    access,
    module: {
      key: config.key,
      label: config.label,
      blockRange: config.blockRange,
      sourceFaithful: true,
      craysNativeSurface: true,
      sourceUiEmbedded: false,
      visibleSourceWording: false,
    },
    navigation: access.allowed ? config.views : [],
    records: access.allowed ? config.records.map((record) => ({ ...record, count: scoped ? 0 : record.count })) : [],
    settingsGroups: access.allowed ? config.settingsGroups : [],
    aiTools: access.allowed ? config.aiTools : [],
    workflows: access.allowed ? config.workflows : [],
    actions: access.allowed ? config.actions : [],
    boundaries: boundaries(),
    nextBlocks: access.allowed ? config.nextBlocks : [],
  };
}

export function attachLiveSourceSections(
  readModel: SourceFaithfulWorkbenchContract,
  source: {
    source: { connection: string; owner: string };
    generatedAt: string;
    sections: SourceWorkbenchSection[];
    capabilities: Record<string, unknown>;
    diagnostics?: Record<string, unknown>;
  },
): SourceFaithfulWorkbenchContract {
  const existingRecords = new Map(readModel.records.map((record) => [record.key, record]));
  const sourceRecords = source.sections.map((section) => {
    const existing = existingRecords.get(section.key);
    return {
      key: section.key,
      label: existing?.label ?? section.label,
    scope: existing?.scope ?? `${section.label} from the ${source.source.connection === "snapshot" ? "synced operational source snapshot" : "live operational source"}`,
      status: existing?.status ?? ("ready_read_only" as const),
      count: section.count,
    };
  });
  const sourceKeys = new Set(sourceRecords.map((record) => record.key));

  return {
    ...readModel,
    records: [...sourceRecords, ...readModel.records.filter((record) => !sourceKeys.has(record.key))],
    sourceRuntime: {
      connection: source.source.connection,
      owner: source.source.owner,
      generatedAt: source.generatedAt,
      capabilities: source.capabilities,
      diagnostics: source.diagnostics,
    },
    sourceSections: source.sections,
    boundaries: {
      ...readModel.boundaries,
      sourceRuntimeCallsEnabled: source.source.connection !== "snapshot",
      liveSourceRecordsReturned: source.source.connection !== "snapshot",
      liveBusinessRecordsReturned: true,
    },
  };
}

export function getProjectCrmParityContract(role: RoleKey): ProjectCrmParityContract {
  const access = governanceAccess(role);
  const project = configs.project;
  const crm = configs.crm;

  return {
    role,
    access,
    block: "Block 66",
    status: "ready",
    modules: access.allowed
      ? [
          {
            key: "project",
            label: "Project",
            aiParity: project.aiTools.map((tool) => ({
              key: tool.key,
              label: tool.label,
              productLabel: tool.scope,
              status: "governance_ready",
            })),
            settingsParity: projectSettings.flatMap((group) =>
              group.items.map((item) => ({
                key: `${group.key}-${item.toLowerCase().replaceAll(" ", "-")}`,
                label: item,
                productLabel: group.label,
                status: "settings_mapped",
              })),
            ),
            sourceFaithfulSurfaceRequired: true,
          },
          {
            key: "crm",
            label: "CRM",
            aiParity: crm.aiTools.map((tool) => ({
              key: tool.key,
              label: tool.label,
              productLabel: tool.scope,
              status: "governance_ready",
            })),
            settingsParity: crmSettings.flatMap((group) =>
              group.items.map((item) => ({
                key: `${group.key}-${item.toLowerCase().replaceAll(" ", "-")}`,
                label: item,
                productLabel: group.label,
                status: "settings_mapped",
              })),
            ),
            sourceFaithfulSurfaceRequired: true,
          },
        ]
      : [],
    boundaries: boundaries(),
    nextBlocks: ["Block 67", "Block 68", "Block 69"],
  };
}

export function getModuleSettingsParity(module: "project" | "crm", role: RoleKey): ModuleSettingsParityContract {
  const config = configs[module];
  const access = accessFor(config, role);
  const groups = module === "project" ? projectSettings : crmSettings;
  const allowedRoles = module === "project" ? projectInternalRoles : crmInternalRoles;

  return {
    role,
    access,
    module: {
      key: module,
      label: config.label as "Project" | "CRM",
      block: module === "project" ? "Block 67" : "Block 68",
    },
    groups: access.allowed ? groups : [],
    permissionMatrix: access.allowed
      ? groups.map((group) => ({
          key: group.key,
          label: group.label,
          owner: module === "project" ? "Project Admin" : "CRM Admin",
          allowedRoles,
          status: group.status,
        }))
      : [],
    boundaries: boundaries(),
  };
}

export function getAiGovernanceContract(role: RoleKey): AiGovernanceContract {
  const access = governanceAccess(role);

  return {
    role,
    access,
    block: "Block 69",
    status: "governance_ready",
    modules: ["Project", "CRM"],
    providerState: {
      configuredProvidersReturned: false,
      liveProviderCallEnabled: false,
      localModelAllowedByPolicy: false,
      disableSwitchRequired: true,
      usageLedgerRequired: true,
      approvalGateRequired: true,
    },
    tools: access.allowed ? [...configs.project.aiTools, ...configs.crm.aiTools] : [],
    auditRequirements: access.allowed
      ? ["Role scope", "Entity scope", "Input hash", "Output state", "Action proposal", "Cost and usage ledger", "Disable switch"]
      : [],
    boundaries: boundaries(),
  };
}

export function getSourceFaithfulReadiness(role: RoleKey): SourceFaithfulReadinessContract {
  const access = governanceAccess(role);
  const visibleModules = access.allowed ? Object.values(configs).filter((config) => accessFor(config, role).allowed || operatorRoles.includes(role)) : [];

  return {
    role,
    access,
    blockRange: "Blocks 66-90",
    completedBlocks: access.allowed ? 25 : 0,
    totalBlocks: 25,
    sourceFaithfulModules: visibleModules.length,
    craysNativePanels: access.allowed ? 9 : 0,
    approvedWriteAdapters: 0,
    nextRequiredPause: "after_block_90_user_review",
    modules: visibleModules.map((config) => ({
      key: config.key,
      label: config.label,
      blockRange: config.blockRange,
      recordsMapped: config.records.length,
      viewsMapped: config.views.length,
      settingsGroupsMapped: config.settingsGroups.length,
      aiToolsMapped: config.aiTools.length,
    })),
    blockLedger: access.allowed ? blockLedger() : [],
    boundaries: boundaries(),
  };
}

function blockLedger(): SourceFaithfulReadinessContract["blockLedger"] {
  return [
    { block: "Block 66", title: "Project and CRM AI/settings parity contract", status: "implemented_read_only" },
    { block: "Block 67", title: "Project settings and permission map", status: "implemented_read_only" },
    { block: "Block 68", title: "CRM settings and permission map", status: "implemented_read_only" },
    { block: "Block 69", title: "AI governance contract", status: "implemented_read_only" },
    { block: "Block 70", title: "Project workbench read model", status: "implemented_read_only" },
    { block: "Block 71", title: "Project CRAYS-native panel", status: "implemented_read_only" },
    { block: "Block 72", title: "Project work item board controls", status: "implemented_read_only" },
    { block: "Block 73", title: "Project cycles, modules and pages controls", status: "implemented_read_only" },
    { block: "Block 74", title: "Project AI assist shells", status: "implemented_read_only" },
    { block: "Block 75", title: "Project settings surface", status: "implemented_read_only" },
    { block: "Block 76", title: "CRM workbench read model", status: "implemented_read_only" },
    { block: "Block 77", title: "CRM records and detail controls", status: "implemented_read_only" },
    { block: "Block 78", title: "CRM pipeline controls", status: "implemented_read_only" },
    { block: "Block 79", title: "CRM workflow and AI agent shells", status: "implemented_read_only" },
    { block: "Block 80", title: "CRM settings surface", status: "implemented_read_only" },
    { block: "Block 81", title: "ERP source-faithful read model", status: "implemented_read_only" },
    { block: "Block 82", title: "ERP finance controls", status: "implemented_read_only" },
    { block: "Block 83", title: "Files source-faithful read model", status: "implemented_read_only" },
    { block: "Block 84", title: "Files metadata and package controls", status: "implemented_read_only" },
    { block: "Block 85", title: "Sync mapping cockpit", status: "implemented_read_only" },
    { block: "Block 86", title: "Analytics source-faithful dashboard", status: "implemented_read_only" },
    { block: "Block 87", title: "Loans readiness cockpit", status: "implemented_read_only" },
    { block: "Block 88", title: "Cross-module AI governance console", status: "implemented_read_only" },
    { block: "Block 89", title: "Source-faithful acceptance contract", status: "implemented_read_only" },
    { block: "Block 90", title: "Aggregate readiness and pause gate", status: "implemented_read_only" },
  ];
}
