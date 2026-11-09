import { modules, type ModuleKey } from "./modules";
import type { PermissionScope } from "./permissions";
import { roles, type RoleKey } from "./roles";

type MatrixAccessLevel = "matrix_admin" | "matrix_reviewer" | "role_scope" | "portal_scope" | "forbidden";
type RoleToolAccessKind = "owner" | "operator" | "contributor" | "reviewer" | "admin" | "scoped" | "portal";
type SurfaceMode = "internal_shell" | "external_portal" | "shared_service";
type CurrentMode = "read_only" | "local_draft_only" | "portal_read_only" | "admin_contract_only";
type FunctionFamily = "objects" | "views" | "workflow" | "communication" | "files" | "finance" | "analytics" | "admin";
type DepartmentScope =
  | "Management"
  | "Franchise Sales"
  | "Expansion"
  | "Finance"
  | "Banking/Funding"
  | "Legal/Compliance/Privacy"
  | "Operations"
  | "Studio Management"
  | "Member/Customer Experience"
  | "HR/Staff"
  | "Academy"
  | "Marketing"
  | "Procurement"
  | "Facilities/Equipment/Maintenance"
  | "Quality/Audit"
  | "Support/Knowledge/Incident"
  | "IT/Product/Data Governance"
  | "Corporate Wellness"
  | "Investor/Board";

export type ToolFunction = {
  key: string;
  label: string;
  family: FunctionFamily;
  description: string;
  sideEffectsEnabled: false;
};

type ToolCatalogItem = {
  module: ModuleKey;
  label: string;
  purpose: string;
  functions: ToolFunction[];
};

export type FullOsCapabilityScope = {
  key: string;
  module: ModuleKey;
  capability: string;
  ownerDepartment: DepartmentScope;
  ownerRole: RoleKey;
  consumingRoles: RoleKey[];
  externalStakeholderSlices: RoleKey[];
  coreObject:
    | "prepared-offer"
    | "deal"
    | "property-case"
    | "bank-package"
    | "loan-case"
    | "document"
    | "conversation"
    | "project"
    | "financial-model"
    | "studio"
    | "member"
    | "employee"
    | "training"
    | "support-ticket"
    | "sync-job"
    | "kpi-snapshot";
  primaryAction: string;
  commandModel: string;
  historyModel: string;
  preservedSourceFunctions: string[];
  craysOrchestration: string;
  closedGates: string[];
};

type RoleToolEntitlementSeed = {
  role: RoleKey;
  module: ModuleKey;
  access: RoleToolAccessKind;
  surface: SurfaceMode;
  currentMode: CurrentMode;
  functionKeys: string[];
  dataScopes: PermissionScope[];
  requiredHandoffs: string[];
};

export type RoleToolEntitlement = RoleToolEntitlementSeed & {
  toolLabel: string;
  functions: ToolFunction[];
  missingFunctionKeys: string[];
};

export type RoleToolFunctionMatrixContract = {
  role: RoleKey;
  status: "ready" | "forbidden";
  access: {
    allowed: boolean;
    level: MatrixAccessLevel;
    reason: string;
  };
  blockRange: "Blocks 476-500";
  sourceOfTruth: string[];
  productRule: {
    completeFunctionCoverageRequired: true;
    sourceUiEmbedded: false;
    productUiLanguage: "English";
    roleScopedByDefault: true;
    sharedCoreDataRequired: true;
    targetWriteModelsRequired: true;
    isolatedToolDatabasesAsProductTruth: false;
  };
  targetWriteModelPolicy: Array<{
    key: string;
    label: string;
    targetBlocks: "Blocks 501-600";
    currentState: "disabled_until_exact_gate";
    rule: string;
  }>;
  sharedCoreEntities: Array<{
    key: string;
    label: string;
    availableToTools: ModuleKey[];
    productRule: string;
  }>;
  summary: {
    rolesMapped: number;
    toolsMapped: number;
    functionFamiliesMapped: number;
    entitlementsMapped: number;
    capabilityScopesMapped: number;
    departmentsMapped: number;
    missingFunctionKeys: number;
  };
  fullOsCapabilityScopes: FullOsCapabilityScope[];
  roles: Array<{
    key: RoleKey;
    label: string;
    mode: string;
    entitlements: RoleToolEntitlement[];
    hiddenModules: ModuleKey[];
  }>;
  tools: ToolCatalogItem[];
  coverageIssues: string[];
  boundaries: {
    liveSourceCallsEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    providerCallsEnabled: false;
    liveAiCallsEnabled: false;
    uploadsEnabled: false;
    externalSendingEnabled: false;
    financeWritesEnabled: false;
    bankSendsEnabled: false;
    candidateReleaseEnabled: false;
    publicReleaseEnabled: false;
    productionDeployEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

const adminMatrixRoles: RoleKey[] = ["admin", "crays-management"];
const reviewerMatrixRoles: RoleKey[] = ["reviewer", "deal-manager", "expansion-manager", "finance", "hr"];
const portalMatrixRoles: RoleKey[] = ["franchise-candidate", "franchise-partner", "studio-manager", "bank-partner", "investor", "landlord", "vendor", "gym-member"];

function fn(key: string, label: string, family: FunctionFamily, description: string): ToolFunction {
  return { key, label, family, description, sideEffectsEnabled: false };
}

const toolCatalog: ToolCatalogItem[] = [
  {
    module: "dashboard",
    label: "Dashboard",
    purpose: "Role-scoped command picture across deals, properties, evidence, finance, projects and communication.",
    functions: [
      fn("overview", "Overview", "views", "Role home with scoped KPI and action state."),
      fn("real-product-workbench", "Real product workbench", "workflow", "Prepared deal and property-check operating journey from CRAYS core records."),
      fn("action-queue", "Action queue", "workflow", "Next actions, blocked gates and handoff work."),
      fn("signals", "Signals", "analytics", "Risk, evidence and benchmark signals."),
      fn("messages", "Messages", "communication", "Unread and waiting communication summaries."),
    ],
  },
  {
    module: "crm",
    label: "CRM",
    purpose: "Relationship, owner, candidate, partner and deal pipeline work.",
    functions: [
      fn("home", "Home", "views", "CRM command surface."),
      fn("companies", "Companies", "objects", "Company and organization records."),
      fn("people", "People", "objects", "Contact and stakeholder records."),
      fn("leads", "Leads", "objects", "Inbound candidate, owner and partner leads."),
      fn("opportunities", "Opportunities", "objects", "Candidate, property and partner pipeline opportunities."),
      fn("tasks", "Tasks", "workflow", "Follow-up work and due items."),
      fn("notes", "Notes", "objects", "Internal and scoped record notes."),
      fn("inbox", "Inbox", "communication", "Role-scoped email and message queue."),
      fn("emails", "Emails", "communication", "Record-linked email history and drafts."),
      fn("calendar", "Calendar", "communication", "Meetings, site visits and follow-up dates."),
      fn("activities", "Activities", "workflow", "Calls, messages, notes and record state changes."),
      fn("files", "Files", "files", "Record-linked file metadata and package links."),
      fn("reports", "Reports", "analytics", "Pipeline and readiness reporting."),
      fn("record-pages", "Record pages", "views", "Closeable record detail and layout sections."),
      fn("workflow", "Workflow", "workflow", "Triggers, approvals and staged automation."),
      fn("settings", "Settings", "admin", "Object, field, layout and communication settings."),
      fn("ai-controls", "AI controls", "workflow", "Approval-gated assistive controls."),
    ],
  },
  {
    module: "project",
    label: "Project",
    purpose: "Opening, build-out, handoff and supplier delivery execution.",
    functions: [
      fn("work-items", "Work items", "objects", "Tasks, milestones, defects and RFIs."),
      fn("board", "Board", "views", "Grouped work execution view."),
      fn("timeline", "Timeline", "views", "Schedule, dependencies and critical-path view."),
      fn("cycles", "Cycles", "workflow", "Time-boxed delivery planning."),
      fn("modules", "Modules", "workflow", "Opening workstreams and delivery streams."),
      fn("pages", "Pages", "objects", "Project knowledge pages and handover notes."),
      fn("views", "Views", "views", "Saved filters and role-specific work views."),
      fn("analytics", "Analytics", "analytics", "Delivery health and blocker reporting."),
      fn("comments", "Comments", "communication", "Scoped work-item discussion."),
      fn("settings", "Settings", "admin", "Project roles, states, labels and properties."),
    ],
  },
  {
    module: "erp",
    label: "ERP",
    purpose: "Finance, procurement, workforce, asset, maintenance, quality and back-office operations.",
    functions: [
      fn("finance-summary", "Finance summary", "finance", "Role-scoped finance overview."),
      fn("invoices", "Invoices", "finance", "Invoice status and exception review."),
      fn("budgets", "Budgets", "finance", "Opening and operating budget review."),
      fn("accounts", "Accounts", "finance", "Account and cost center summaries."),
      fn("customers", "Customers", "objects", "Customer and account administration records."),
      fn("suppliers", "Suppliers", "objects", "Supplier and payee records."),
      fn("items", "Items", "objects", "Catalog, stock and purchasable item records."),
      fn("purchase-orders", "Purchase orders", "workflow", "Purchase order review and fulfillment state."),
      fn("material-requests", "Material requests", "workflow", "Procurement request and approval state."),
      fn("employees", "Employees", "objects", "Employee and staff administration records."),
      fn("departments", "Departments", "objects", "Department and reporting structure records."),
      fn("training-events", "Training events", "workflow", "Training and certification schedule records."),
      fn("assets", "Assets", "objects", "Equipment, facility and asset records."),
      fn("maintenance", "Maintenance", "workflow", "Asset maintenance and service visit workflow."),
      fn("issues", "Issues", "workflow", "Back-office issue and support workflow."),
      fn("quality-inspections", "Quality inspections", "workflow", "Quality review, compliance and corrective-action records."),
      fn("communications", "Communications", "communication", "Back-office communication and record-linked message state."),
      fn("ledger", "Ledger", "finance", "Accounting ledger summaries."),
      fn("cost-centers", "Cost centers", "finance", "Studio, opening and deal cost allocation."),
      fn("reports", "Reports", "analytics", "Finance reports and variance views."),
      fn("settings", "Settings", "admin", "Finance policy and export settings."),
    ],
  },
  {
    module: "files",
    label: "Files",
    purpose: "Document vault, packages, versions, approvals and access grants.",
    functions: [
      fn("vault", "Vault", "files", "Role-scoped document vault."),
      fn("packages", "Packages", "files", "Deal, bank, project and evidence packages."),
      fn("metadata", "Metadata", "files", "Document names, states and classifications."),
      fn("versions", "Versions", "files", "Version state and review trail."),
      fn("approvals", "Approvals", "workflow", "Document and package approval state."),
      fn("grants", "Grants", "admin", "Visibility and access grants."),
      fn("release-review", "Release review", "workflow", "Candidate, bank and partner package release checks."),
      fn("record-links", "Record links", "files", "Links between files and business objects."),
    ],
  },
  {
    module: "analytics",
    label: "Analytics",
    purpose: "KPI dashboards, benchmarks, risks, reports and decision evidence.",
    functions: [
      fn("scorecards", "Scorecards", "analytics", "Role KPI scorecards."),
      fn("risk", "Risk", "analytics", "Risk and blocked-gate matrix."),
      fn("portfolio", "Portfolio", "analytics", "Portfolio and market summaries."),
      fn("reports", "Reports", "analytics", "Reviewed report surfaces."),
      fn("alerts", "Alerts", "workflow", "Threshold and exception alerts."),
      fn("definitions", "Definitions", "admin", "Metric definitions and visibility rules."),
      fn("benchmarks", "Benchmarks", "analytics", "Branch benchmark and KPI comparison views."),
    ],
  },
  {
    module: "loans",
    label: "Loans",
    purpose: "Bank package, loan case, condition, consent, account and payout workflow.",
    functions: [
      fn("packages", "Packages", "files", "Controlled financing packages."),
      fn("loan-cases", "Loan cases", "objects", "Credit workflow case state."),
      fn("conditions", "Conditions", "workflow", "Lender requirements and blockers."),
      fn("consents", "Consents", "workflow", "Candidate and partner consent state."),
      fn("covenants", "Covenants", "finance", "Monitoring and covenant evidence."),
      fn("lender-handoff", "Lender handoff", "workflow", "Reviewed package handoff."),
      fn("monitoring", "Monitoring", "analytics", "Post-decision monitoring state."),
      fn("account-opening", "Account opening", "finance", "Account readiness and status."),
      fn("payout-readiness", "Payout readiness", "finance", "Drawdown and payout blockers."),
    ],
  },
  {
    module: "chat",
    label: "Chat",
    purpose: "Scoped conversations, discussions, pages, tasks and stakeholder communication.",
    functions: [
      fn("inbox", "Inbox", "communication", "Role-scoped conversation inbox."),
      fn("threads", "Threads", "communication", "Internal, shared and external conversation threads."),
      fn("spaces", "Spaces", "communication", "Team or workflow spaces."),
      fn("pages", "Pages", "objects", "Conversation-linked pages and decisions."),
      fn("tasks", "Tasks", "workflow", "Tasks created from discussion context."),
      fn("people", "People", "objects", "Conversation participants."),
      fn("bookmarks", "Bookmarks", "views", "Saved thread or page references."),
      fn("drafts", "Drafts", "communication", "Local message drafts."),
      fn("search", "Search", "views", "Conversation and page search."),
      fn("settings", "Settings", "admin", "Notification, space and access settings."),
    ],
  },
  {
    module: "operations",
    label: "Operations",
    purpose: "Studio cockpit for service work, staff readiness, assets, maintenance, quality and daily operations.",
    functions: [
      fn("dashboard", "Dashboard", "views", "Operations command surface."),
      fn("leads", "Leads", "objects", "Operational lead or request intake."),
      fn("deals", "Deals", "objects", "Operational deal and handoff records."),
      fn("contacts", "Contacts", "objects", "Operational contacts."),
      fn("organizations", "Organizations", "objects", "Partner, vendor and studio organizations."),
      fn("notes", "Notes", "objects", "Operational notes."),
      fn("tasks", "Tasks", "workflow", "Studio and service task queue."),
      fn("call-logs", "Call logs", "communication", "Scoped call records."),
      fn("calendar", "Calendar", "communication", "Operational calendar and service dates."),
      fn("data-import", "Data import", "admin", "Reviewed import staging."),
      fn("studios", "Studios", "objects", "Studio operating records."),
      fn("check-ins", "Check-ins", "analytics", "Studio usage and access signals."),
      fn("staff-readiness", "Staff readiness", "workflow", "Studio staffing, shift and readiness queue."),
      fn("assets", "Assets", "objects", "Studio asset and equipment records."),
      fn("maintenance", "Maintenance", "workflow", "Maintenance and service recovery workflow."),
      fn("issues", "Issues", "workflow", "Operational issue and escalation queue."),
      fn("quality-inspections", "Quality inspections", "workflow", "Studio quality review and inspection state."),
      fn("procurement", "Procurement", "workflow", "Studio-scoped purchase and material request follow-up."),
    ],
  },
  {
    module: "hr",
    label: "HR",
    purpose: "People readiness, staffing, training and HR-private controls.",
    functions: [
      fn("people-readiness", "People readiness", "objects", "Staff and launch team readiness."),
      fn("staffing", "Staffing", "workflow", "Coverage and hiring workflow."),
      fn("training", "Training", "workflow", "Training requirements and completion."),
      fn("documents", "Documents", "files", "HR document metadata."),
      fn("reviews", "Reviews", "workflow", "Compliance and people review state."),
      fn("settings", "Settings", "admin", "HR role and policy settings."),
    ],
  },
  {
    module: "learning",
    label: "Learning",
    purpose: "Courses, lessons, progress, certifications and partner enablement.",
    functions: [
      fn("courses", "Courses", "objects", "Course catalog and training paths."),
      fn("lessons", "Lessons", "objects", "Lesson content and operating playbooks."),
      fn("progress", "Progress", "analytics", "Learner and team progress."),
      fn("certifications", "Certifications", "workflow", "Completion and certification state."),
      fn("assignments", "Assignments", "workflow", "Assigned learning work."),
      fn("assessments", "Assessments", "workflow", "Review and test outcomes."),
    ],
  },
  {
    module: "support",
    label: "Support",
    purpose: "Tickets, SLAs, requests, messages, knowledge and escalations.",
    functions: [
      fn("tickets", "Tickets", "objects", "Support ticket records."),
      fn("slas", "SLAs", "workflow", "Service-level status and risk."),
      fn("requests", "Requests", "objects", "Stakeholder and member requests."),
      fn("messages", "Messages", "communication", "Support communication."),
      fn("knowledge-base", "Knowledge base", "objects", "Support articles and answers."),
      fn("escalations", "Escalations", "workflow", "Escalation queue and ownership."),
    ],
  },
  {
    module: "sites",
    label: "Sites",
    purpose: "Public pages, portals, forms, lead intake and controlled publishing.",
    functions: [
      fn("pages", "Pages", "objects", "Public and role-scoped page records."),
      fn("forms", "Forms", "objects", "Lead, property and access request forms."),
      fn("leads", "Leads", "objects", "Public lead intake records."),
      fn("content", "Content", "objects", "Content blocks and reviewed copy."),
      fn("public-portals", "Public portals", "views", "Candidate, partner and public portal surfaces."),
      fn("review", "Review", "workflow", "Content and release review."),
      fn("publishing-gates", "Publishing gates", "admin", "Publication approval gates."),
    ],
  },
  {
    module: "sync",
    label: "Sync",
    purpose: "Record mappings, jobs, conflicts, events, webhooks, backups and monitoring.",
    functions: [
      fn("adapters", "Adapters", "admin", "Adapter inventory and state."),
      fn("mappings", "Mappings", "objects", "Cross-tool record mappings."),
      fn("jobs", "Jobs", "workflow", "Dry-run and approved job state."),
      fn("conflicts", "Conflicts", "workflow", "Conflict review queue."),
      fn("events", "Events", "analytics", "Integration and workflow events."),
      fn("webhooks", "Webhooks", "admin", "Inbound and outbound webhook policy."),
      fn("releases", "Releases", "admin", "Runtime and app release state."),
      fn("backups", "Backups", "admin", "Backup and restore evidence."),
      fn("monitoring", "Monitoring", "analytics", "Health and runtime monitoring."),
    ],
  },
  {
    module: "settings",
    label: "Settings",
    purpose: "Users, roles, permissions, modules, organizations, security, integrations and feature coverage.",
    functions: [
      fn("users", "Users", "admin", "Account and identity records."),
      fn("roles", "Roles", "admin", "Role assignment and policy."),
      fn("permissions", "Permissions", "admin", "Permission and scope policy."),
      fn("modules", "Modules", "admin", "Module configuration and visibility."),
      fn("organizations", "Organizations", "objects", "Organization records."),
      fn("studios", "Studios", "objects", "Studio records and ownership."),
      fn("billing", "Billing", "finance", "Billing policy and finance settings."),
      fn("integrations", "Integrations", "admin", "Connection and adapter settings."),
      fn("security", "Security", "admin", "Security boundary and sensitive action policy."),
      fn("audit-log", "Audit log", "analytics", "Access and sensitive action events."),
      fn("notifications", "Notifications", "communication", "Notification policy."),
      fn("branding", "Branding", "admin", "CRAYS presentation settings."),
      fn("data-sync", "Data sync", "admin", "Data movement controls."),
      fn("feature-coverage", "Feature coverage", "admin", "Role, tool and function coverage matrix."),
    ],
  },
];

const fullOsCapabilityScopes: FullOsCapabilityScope[] = [
  {
    key: "crm-relationship-pipeline",
    module: "crm",
    capability: "Relationship and opportunity execution",
    ownerDepartment: "Franchise Sales",
    ownerRole: "deal-manager",
    consumingRoles: ["deal-manager", "expansion-manager", "finance", "reviewer", "crays-management"],
    externalStakeholderSlices: ["franchise-candidate", "landlord", "vendor"],
    coreObject: "deal",
    primaryAction: "Manage relationships, activities, opportunities and follow-up work.",
    commandModel: "crm.activity.log_or_task",
    historyModel: "core_command_requests + case activity timeline",
    preservedSourceFunctions: ["people", "companies", "leads", "opportunities", "activities", "tasks", "notes", "files"],
    craysOrchestration: "Unifies source CRM records with prepared deals, documents, loans, project handoff and role-scoped communication.",
    closedGates: ["Source apply", "External send", "Public release", "Live AI"],
  },
  {
    key: "project-opening-execution",
    module: "project",
    capability: "Opening project and work-item execution",
    ownerDepartment: "Operations",
    ownerRole: "deal-manager",
    consumingRoles: ["deal-manager", "expansion-manager", "franchise-partner", "studio-manager", "reviewer", "crays-management"],
    externalStakeholderSlices: ["landlord", "vendor"],
    coreObject: "project",
    primaryAction: "Plan opening work, dependencies, handoffs, blockers and delivery state.",
    commandModel: "project.work_item.create_or_update",
    historyModel: "core_command_requests + workflow_events + source maps",
    preservedSourceFunctions: ["projects", "work items", "cycles", "modules", "pages", "views", "comments"],
    craysOrchestration: "Connects project execution to deal readiness, document packages, procurement, operations and stakeholder rooms.",
    closedGates: ["Source apply", "External notification", "Recipient release"],
  },
  {
    key: "back-office-operations",
    module: "erp",
    capability: "Finance, procurement, HR, assets, maintenance and quality administration",
    ownerDepartment: "Finance",
    ownerRole: "finance",
    consumingRoles: ["finance", "franchise-partner", "studio-manager", "hr", "reviewer", "crays-management"],
    externalStakeholderSlices: ["vendor"],
    coreObject: "financial-model",
    primaryAction: "Review budgets, suppliers, purchase work, staff/admin records, assets, maintenance, issues and quality evidence.",
    commandModel: "erp.finance_summary.stage",
    historyModel: "source snapshots + core_command_requests + case activity timeline",
    preservedSourceFunctions: [
      "accounts",
      "cost centers",
      "customers",
      "suppliers",
      "items",
      "purchase orders",
      "material requests",
      "employees",
      "departments",
      "training events",
      "assets",
      "maintenance",
      "issues",
      "quality inspections",
      "communications",
    ],
    craysOrchestration: "Maps back-office records into finance, studio, procurement, HR, quality and operations workbenches without replacing the source ledger/admin engine.",
    closedGates: ["Accounting export", "Payment initiation", "Finance posting", "Bank send", "Source apply"],
  },
  {
    key: "loans-bank-readiness",
    module: "loans",
    capability: "Bank readiness and loan package workflow",
    ownerDepartment: "Banking/Funding",
    ownerRole: "finance",
    consumingRoles: ["finance", "deal-manager", "reviewer", "crays-management", "franchise-candidate", "bank-partner"],
    externalStakeholderSlices: ["franchise-candidate", "bank-partner"],
    coreObject: "loan-case",
    primaryAction: "Prepare loan cases, package evidence, conditions, checklist items and bank questions.",
    commandModel: "loans.bank_package.checklist",
    historyModel: "core_command_requests + communication_events + document lifecycle",
    preservedSourceFunctions: ["loan products", "loan applications", "loan cases", "conditions", "bank package state"],
    craysOrchestration: "Separates Finance-owned internal work, Deal Manager consumption, Reviewer approval and bank-safe projection.",
    closedGates: ["Bank send", "Payment", "Regulated checks", "Lender release", "Source apply"],
  },
  {
    key: "files-package-control",
    module: "files",
    capability: "Document package assembly and recipient preflight",
    ownerDepartment: "Legal/Compliance/Privacy",
    ownerRole: "reviewer",
    consumingRoles: ["deal-manager", "finance", "reviewer", "franchise-partner", "studio-manager", "bank-partner", "crays-management"],
    externalStakeholderSlices: ["franchise-candidate", "franchise-partner", "bank-partner", "landlord", "vendor", "investor"],
    coreObject: "document",
    primaryAction: "Assemble versions, grants, redactions, package sections and recipient-specific preflight.",
    commandModel: "files.package.metadata_link",
    historyModel: "document_package_links + evidence_release_gates + core_command_requests",
    preservedSourceFunctions: ["metadata", "versions", "attachments", "grants", "packages", "evidence relations"],
    craysOrchestration: "Turns document access rules into package review, stakeholder rooms and audit-visible release readiness.",
    closedGates: ["Upload", "Private preview", "Public file release", "External share", "Source apply"],
  },
  {
    key: "case-communication",
    module: "chat",
    capability: "Object-bound communication and message review",
    ownerDepartment: "Member/Customer Experience",
    ownerRole: "deal-manager",
    consumingRoles: ["deal-manager", "finance", "reviewer", "franchise-partner", "studio-manager", "bank-partner", "crays-management"],
    externalStakeholderSlices: ["franchise-candidate", "franchise-partner", "bank-partner", "landlord", "vendor", "gym-member"],
    coreObject: "conversation",
    primaryAction: "Manage internal notes, shared comments, stakeholder questions, participants, consent and reply drafts.",
    commandModel: "crm.activity.log_or_task",
    historyModel: "conversations + messages + communication_events + core_command_requests",
    preservedSourceFunctions: ["threads", "participants", "messages", "delivery events", "consents"],
    craysOrchestration: "Keeps internal, shared and external communication lanes separate while joining them to case objects, documents and approvals.",
    closedGates: ["External send", "Provider connection", "Upload", "Public release"],
  },
  {
    key: "studio-member-app-operations",
    module: "operations",
    capability: "Studio cockpit powered by B2C member app activity",
    ownerDepartment: "Studio Management",
    ownerRole: "studio-manager",
    consumingRoles: ["studio-manager", "franchise-partner", "finance", "hr", "reviewer", "crays-management"],
    externalStakeholderSlices: ["gym-member"],
    coreObject: "member",
    primaryAction: "Operate memberships, bookings, trainer scheduling, training plans, attendance, service cases and studio readiness.",
    commandModel: "project.work_item.create_or_update",
    historyModel: "member activity projections + support tickets + workflow_events + source maps",
    preservedSourceFunctions: [
      "member profiles",
      "membership status",
      "payment status",
      "payment method status",
      "course bookings",
      "trainer bookings",
      "training plans",
      "attendance",
      "member consents",
      "support requests",
    ],
    craysOrchestration: "Projects member-app operational state into Studio Manager, Partner, Finance, HR, Academy and Support workflows without exposing unnecessary private data.",
    closedGates: ["Payment initiation", "External send", "Sensitive member export", "Source apply"],
  },
  {
    key: "hr-staff-readiness",
    module: "hr",
    capability: "Staff, onboarding and compliance readiness",
    ownerDepartment: "HR/Staff",
    ownerRole: "hr",
    consumingRoles: ["hr", "studio-manager", "franchise-partner", "reviewer", "crays-management"],
    externalStakeholderSlices: [],
    coreObject: "employee",
    primaryAction: "Manage staffing needs, employee readiness, onboarding tasks, private documents and reviews.",
    commandModel: "project.work_item.create_or_update",
    historyModel: "employee projections + document metadata + workflow_events",
    preservedSourceFunctions: ["employees", "departments", "applicants", "staffing", "onboarding records"],
    craysOrchestration: "Shows role-safe readiness signals to Studio Management while keeping HR-private details restricted.",
    closedGates: ["HR private data release", "Source apply", "External send"],
  },
  {
    key: "academy-learning",
    module: "learning",
    capability: "Academy paths, assignments and certification progress",
    ownerDepartment: "Academy",
    ownerRole: "hr",
    consumingRoles: ["hr", "studio-manager", "franchise-partner", "reviewer", "crays-management"],
    externalStakeholderSlices: ["vendor"],
    coreObject: "training",
    primaryAction: "Assign courses, track progress, review certifications and surface readiness gaps.",
    commandModel: "project.work_item.create_or_update",
    historyModel: "training projections + workflow_events + source maps",
    preservedSourceFunctions: ["courses", "lessons", "progress", "certifications", "assignments", "assessments"],
    craysOrchestration: "Bridges academy readiness into launch staffing, Studio Cockpit and quality reviews.",
    closedGates: ["Publish learning content", "External send", "Source apply"],
  },
  {
    key: "support-service-recovery",
    module: "support",
    capability: "Support, incident and knowledge workflow",
    ownerDepartment: "Support/Knowledge/Incident",
    ownerRole: "studio-manager",
    consumingRoles: ["studio-manager", "franchise-partner", "finance", "reviewer", "crays-management", "gym-member"],
    externalStakeholderSlices: ["gym-member", "franchise-partner", "vendor"],
    coreObject: "support-ticket",
    primaryAction: "Resolve tickets, SLA risks, member requests, partner requests, incidents and knowledge handoffs.",
    commandModel: "crm.activity.log_or_task",
    historyModel: "support tickets + communication_events + workflow_events",
    preservedSourceFunctions: ["tickets", "SLA state", "requests", "messages", "knowledge base", "escalations"],
    craysOrchestration: "Routes member and partner issues into studio operations, finance blockers, communication review and quality audit.",
    closedGates: ["External send", "Refund/payment action", "Sensitive member export", "Source apply"],
  },
  {
    key: "analytics-portfolio-kpis",
    module: "analytics",
    capability: "Portfolio KPIs and exception drill-down",
    ownerDepartment: "Management",
    ownerRole: "crays-management",
    consumingRoles: ["crays-management", "finance", "deal-manager", "expansion-manager", "franchise-partner", "studio-manager", "bank-partner", "investor"],
    externalStakeholderSlices: ["investor", "bank-partner"],
    coreObject: "kpi-snapshot",
    primaryAction: "Review KPIs, exceptions, source freshness, thresholds and role-safe drill-down.",
    commandModel: "sync.mapping.preview_refresh",
    historyModel: "kpi snapshots + source maps + sync jobs + workflow_events",
    preservedSourceFunctions: ["scorecards", "reports", "alerts", "benchmarks", "portfolio views"],
    craysOrchestration: "Combines operational, finance, member-app, lending and project signals into role-safe portfolio views.",
    closedGates: ["Investor release", "Bank release", "Live AI", "External send"],
  },
  {
    key: "sync-data-governance",
    module: "sync",
    capability: "Source mapping, sync freshness and conflict governance",
    ownerDepartment: "IT/Product/Data Governance",
    ownerRole: "admin",
    consumingRoles: ["admin", "crays-management", "finance", "reviewer"],
    externalStakeholderSlices: [],
    coreObject: "sync-job",
    primaryAction: "Review adapters, mappings, jobs, freshness, conflicts, retries and rollback evidence.",
    commandModel: "sync.mapping.preview_refresh",
    historyModel: "integration_connections + external_record_maps + sync_jobs + core_command_requests",
    preservedSourceFunctions: ["adapters", "mappings", "jobs", "conflicts", "events", "monitoring"],
    craysOrchestration: "Keeps source systems and Neon/Core aligned with audit-ready diffs and explicit apply controls.",
    closedGates: ["Sync apply", "Source write", "Destructive action", "Production deploy"],
  },
];

const functionKeysByTool = new Map(toolCatalog.map((tool) => [tool.module, new Set(tool.functions.map((item) => item.key))]));

function allFunctions(module: ModuleKey) {
  return toolCatalog.find((tool) => tool.module === module)?.functions.map((item) => item.key) ?? [];
}

function without(module: ModuleKey, blocked: string[]) {
  const blockedSet = new Set(blocked);
  return allFunctions(module).filter((key) => !blockedSet.has(key));
}

function entitlement(
  role: RoleKey,
  module: ModuleKey,
  access: RoleToolAccessKind,
  surface: SurfaceMode,
  currentMode: CurrentMode,
  functionKeys: string[],
  dataScopes: PermissionScope[],
  requiredHandoffs: string[] = [],
): RoleToolEntitlementSeed {
  return { role, module, access, surface, currentMode, functionKeys, dataScopes, requiredHandoffs };
}

const internalScopes: PermissionScope[] = ["global", "organization"];
const dealScopes: PermissionScope[] = ["organization", "deal", "candidate", "property", "document"];
const propertyScopes: PermissionScope[] = ["organization", "property", "partner", "document"];
const financeScopes: PermissionScope[] = ["organization", "deal", "bank-package", "loan-case", "document"];
const studioScopes: PermissionScope[] = ["organization", "studio", "project", "member", "own"];
const ownScopes: PermissionScope[] = ["own", "document"];

const managementEntitlements: RoleToolEntitlementSeed[] = modules.map((module) =>
  entitlement("crays-management", module.key, module.key === "settings" || module.key === "sync" ? "reviewer" : "reviewer", "internal_shell", "read_only", allFunctions(module.key), internalScopes),
);

const adminEntitlements: RoleToolEntitlementSeed[] = modules.map((module) =>
  entitlement("admin", module.key, module.key === "settings" || module.key === "sync" ? "admin" : "reviewer", "internal_shell", module.key === "settings" || module.key === "sync" ? "admin_contract_only" : "read_only", allFunctions(module.key), internalScopes),
);

const matrixSeeds: RoleToolEntitlementSeed[] = [
  ...managementEntitlements,
  ...adminEntitlements,
  entitlement("reviewer", "dashboard", "reviewer", "internal_shell", "read_only", allFunctions("dashboard"), internalScopes),
  entitlement("reviewer", "crm", "reviewer", "internal_shell", "read_only", without("crm", ["settings"]), internalScopes),
  entitlement("reviewer", "project", "reviewer", "internal_shell", "read_only", without("project", ["settings"]), internalScopes),
  entitlement("reviewer", "erp", "reviewer", "internal_shell", "read_only", without("erp", ["settings"]), internalScopes),
  entitlement("reviewer", "files", "reviewer", "internal_shell", "read_only", allFunctions("files"), internalScopes),
  entitlement("reviewer", "analytics", "reviewer", "internal_shell", "read_only", allFunctions("analytics"), internalScopes),
  entitlement("reviewer", "loans", "reviewer", "internal_shell", "read_only", allFunctions("loans"), internalScopes),
  entitlement("reviewer", "chat", "reviewer", "shared_service", "read_only", without("chat", ["settings"]), internalScopes),
  entitlement("reviewer", "operations", "reviewer", "internal_shell", "read_only", without("operations", ["data-import"]), internalScopes),
  entitlement("reviewer", "hr", "reviewer", "internal_shell", "read_only", without("hr", ["settings"]), internalScopes),
  entitlement("reviewer", "support", "reviewer", "internal_shell", "read_only", allFunctions("support"), internalScopes),
  entitlement("reviewer", "sites", "reviewer", "internal_shell", "read_only", without("sites", ["publishing-gates"]), internalScopes),
  entitlement("reviewer", "sync", "reviewer", "internal_shell", "read_only", allFunctions("sync"), internalScopes),
  entitlement("reviewer", "settings", "reviewer", "internal_shell", "read_only", ["users", "roles", "permissions", "modules", "organizations", "security", "audit-log", "data-sync", "feature-coverage"], internalScopes),

  entitlement("deal-manager", "dashboard", "owner", "internal_shell", "read_only", allFunctions("dashboard"), dealScopes),
  entitlement("deal-manager", "crm", "owner", "internal_shell", "local_draft_only", without("crm", ["settings"]), dealScopes),
  entitlement("deal-manager", "project", "owner", "internal_shell", "local_draft_only", without("project", ["settings"]), dealScopes),
  entitlement(
    "deal-manager",
    "erp",
    "scoped",
    "internal_shell",
    "read_only",
    [
      "finance-summary",
      "invoices",
      "budgets",
      "accounts",
      "customers",
      "suppliers",
      "items",
      "purchase-orders",
      "material-requests",
      "assets",
      "maintenance",
      "issues",
      "quality-inspections",
      "communications",
      "reports",
    ],
    ["organization", "deal"],
  ),
  entitlement("deal-manager", "files", "owner", "internal_shell", "local_draft_only", allFunctions("files"), dealScopes),
  entitlement("deal-manager", "analytics", "owner", "internal_shell", "read_only", without("analytics", ["definitions"]), dealScopes),
  entitlement("deal-manager", "loans", "owner", "internal_shell", "local_draft_only", allFunctions("loans"), financeScopes),
  entitlement("deal-manager", "chat", "owner", "shared_service", "local_draft_only", without("chat", ["settings"]), dealScopes),
  entitlement("deal-manager", "operations", "contributor", "internal_shell", "local_draft_only", ["dashboard", "deals", "contacts", "organizations", "notes", "tasks", "call-logs", "calendar", "studios", "maintenance"], ["organization", "project", "deal"]),
  entitlement("deal-manager", "support", "contributor", "internal_shell", "local_draft_only", ["tickets", "slas", "requests", "messages", "knowledge-base", "escalations"], ["organization", "deal", "own"]),
  entitlement("deal-manager", "sites", "contributor", "internal_shell", "local_draft_only", ["pages", "forms", "leads", "content", "public-portals", "review"], ["organization", "deal"]),

  entitlement("expansion-manager", "dashboard", "owner", "internal_shell", "read_only", ["overview", "real-product-workbench", "action-queue", "signals", "messages"], propertyScopes),
  entitlement("expansion-manager", "crm", "owner", "internal_shell", "local_draft_only", without("crm", ["settings"]), propertyScopes),
  entitlement("expansion-manager", "project", "owner", "internal_shell", "local_draft_only", without("project", ["settings", "analytics"]), propertyScopes),
  entitlement("expansion-manager", "files", "owner", "internal_shell", "local_draft_only", allFunctions("files"), propertyScopes),
  entitlement("expansion-manager", "analytics", "owner", "internal_shell", "read_only", without("analytics", ["definitions"]), propertyScopes),
  entitlement("expansion-manager", "chat", "owner", "shared_service", "local_draft_only", without("chat", ["settings"]), propertyScopes),
  entitlement("expansion-manager", "sites", "contributor", "internal_shell", "local_draft_only", ["pages", "forms", "leads", "content", "public-portals", "review"], ["organization", "property", "partner"]),

  entitlement("finance", "dashboard", "owner", "internal_shell", "read_only", allFunctions("dashboard"), financeScopes),
  entitlement(
    "finance",
    "erp",
    "owner",
    "internal_shell",
    "local_draft_only",
    [
      "finance-summary",
      "invoices",
      "budgets",
      "accounts",
      "customers",
      "suppliers",
      "items",
      "purchase-orders",
      "material-requests",
      "ledger",
      "cost-centers",
      "reports",
      "settings",
    ],
    financeScopes,
  ),
  entitlement("finance", "files", "owner", "internal_shell", "local_draft_only", allFunctions("files"), financeScopes),
  entitlement("finance", "analytics", "owner", "internal_shell", "read_only", without("analytics", ["definitions"]), financeScopes),
  entitlement("finance", "loans", "owner", "internal_shell", "local_draft_only", allFunctions("loans"), financeScopes),
  entitlement("finance", "chat", "contributor", "shared_service", "local_draft_only", ["inbox", "threads", "drafts", "search"], financeScopes),
  entitlement("finance", "operations", "contributor", "internal_shell", "read_only", ["dashboard", "organizations", "tasks", "calendar", "studios", "maintenance"], ["organization", "studio", "deal"]),
  entitlement("finance", "support", "contributor", "internal_shell", "local_draft_only", ["tickets", "slas", "requests", "messages", "escalations"], ["organization", "studio", "deal"]),
  entitlement("finance", "sync", "reviewer", "internal_shell", "read_only", ["adapters", "mappings", "jobs", "conflicts", "events", "monitoring"], ["organization"]),
  entitlement("finance", "settings", "scoped", "internal_shell", "read_only", ["billing", "integrations", "audit-log", "notifications", "data-sync", "feature-coverage"], ["organization"]),

  entitlement("hr", "dashboard", "owner", "internal_shell", "read_only", allFunctions("dashboard"), ["organization"]),
  entitlement("hr", "chat", "contributor", "shared_service", "local_draft_only", ["inbox", "threads", "spaces", "pages", "tasks", "people", "drafts", "search"], ["organization", "own"]),
  entitlement("hr", "files", "contributor", "internal_shell", "local_draft_only", ["vault", "packages", "metadata", "versions", "approvals", "record-links"], ["organization", "document"]),
  entitlement("hr", "hr", "owner", "internal_shell", "local_draft_only", allFunctions("hr"), ["organization"]),
  entitlement("hr", "learning", "owner", "internal_shell", "local_draft_only", allFunctions("learning"), ["organization"]),
  entitlement("hr", "settings", "scoped", "internal_shell", "read_only", ["users", "roles", "permissions", "organizations", "notifications", "security", "feature-coverage"], ["organization"]),

  entitlement("franchise-candidate", "loans", "portal", "external_portal", "portal_read_only", ["packages", "loan-cases", "conditions", "consents", "account-opening", "payout-readiness"], ["own", "deal", "candidate", "document"], ["Candidate release gate"]),
  entitlement("franchise-candidate", "files", "portal", "external_portal", "portal_read_only", ["vault", "packages", "metadata", "versions", "approvals", "record-links"], ownScopes, ["Candidate document grant"]),
  entitlement("franchise-candidate", "chat", "portal", "external_portal", "local_draft_only", ["inbox", "threads", "drafts", "search"], ["own", "deal"], ["Candidate account scope"]),
  entitlement("franchise-candidate", "sites", "portal", "external_portal", "portal_read_only", ["pages", "forms", "public-portals"], ["own"], ["Mapped account"]),

  entitlement("franchise-partner", "dashboard", "owner", "internal_shell", "read_only", allFunctions("dashboard"), studioScopes),
  entitlement("franchise-partner", "project", "owner", "internal_shell", "local_draft_only", without("project", ["settings"]), studioScopes),
  entitlement(
    "franchise-partner",
    "erp",
    "scoped",
    "internal_shell",
    "read_only",
    [
      "finance-summary",
      "invoices",
      "budgets",
      "accounts",
      "customers",
      "suppliers",
      "items",
      "purchase-orders",
      "material-requests",
      "employees",
      "departments",
      "training-events",
      "assets",
      "maintenance",
      "issues",
      "quality-inspections",
      "communications",
      "reports",
    ],
    ["organization", "studio", "own"],
  ),
  entitlement("franchise-partner", "files", "owner", "internal_shell", "local_draft_only", allFunctions("files"), studioScopes),
  entitlement("franchise-partner", "analytics", "owner", "internal_shell", "read_only", ["scorecards", "risk", "portfolio", "reports", "alerts", "benchmarks"], studioScopes),
  entitlement("franchise-partner", "loans", "scoped", "internal_shell", "read_only", ["packages", "loan-cases", "conditions", "consents", "covenants", "monitoring", "account-opening", "payout-readiness"], ["organization", "studio", "loan-case", "own"]),
  entitlement("franchise-partner", "chat", "owner", "shared_service", "local_draft_only", without("chat", ["settings"]), studioScopes),
  entitlement(
    "franchise-partner",
    "operations",
    "owner",
    "internal_shell",
    "local_draft_only",
    ["dashboard", "tasks", "call-logs", "calendar", "studios", "check-ins", "staff-readiness", "assets", "maintenance", "issues", "quality-inspections", "procurement", "notes"],
    studioScopes,
  ),
  entitlement("franchise-partner", "learning", "contributor", "internal_shell", "local_draft_only", ["courses", "lessons", "progress", "certifications", "assignments"], ["organization", "studio", "own"]),
  entitlement("franchise-partner", "support", "owner", "internal_shell", "local_draft_only", allFunctions("support"), studioScopes),
  entitlement("franchise-partner", "settings", "scoped", "internal_shell", "read_only", ["users", "studios", "billing", "notifications", "branding"], ["organization", "studio", "own"]),

  entitlement("studio-manager", "dashboard", "owner", "internal_shell", "read_only", allFunctions("dashboard"), studioScopes),
  entitlement(
    "studio-manager",
    "erp",
    "scoped",
    "internal_shell",
    "read_only",
    [
      "finance-summary",
      "invoices",
      "budgets",
      "accounts",
      "customers",
      "suppliers",
      "items",
      "purchase-orders",
      "material-requests",
      "employees",
      "departments",
      "training-events",
      "assets",
      "maintenance",
      "issues",
      "quality-inspections",
      "communications",
      "reports",
    ],
    ["studio", "own"],
  ),
  entitlement("studio-manager", "files", "owner", "internal_shell", "local_draft_only", ["vault", "packages", "metadata", "versions", "approvals", "record-links"], studioScopes),
  entitlement("studio-manager", "analytics", "owner", "internal_shell", "read_only", ["scorecards", "risk", "portfolio", "reports", "alerts", "benchmarks"], studioScopes),
  entitlement("studio-manager", "chat", "owner", "shared_service", "local_draft_only", without("chat", ["settings"]), studioScopes),
  entitlement(
    "studio-manager",
    "operations",
    "owner",
    "internal_shell",
    "local_draft_only",
    ["dashboard", "tasks", "call-logs", "calendar", "studios", "check-ins", "staff-readiness", "assets", "maintenance", "issues", "quality-inspections", "procurement", "notes"],
    studioScopes,
  ),
  entitlement("studio-manager", "hr", "contributor", "internal_shell", "read_only", ["people-readiness", "staffing", "training", "reviews"], ["studio", "own"]),
  entitlement("studio-manager", "learning", "contributor", "internal_shell", "local_draft_only", ["courses", "lessons", "progress", "certifications", "assignments", "assessments"], ["studio", "own"]),
  entitlement("studio-manager", "support", "owner", "internal_shell", "local_draft_only", allFunctions("support"), studioScopes),
  entitlement("studio-manager", "settings", "scoped", "internal_shell", "read_only", ["users", "studios", "notifications", "branding"], ["studio", "own"]),

  entitlement("bank-partner", "dashboard", "scoped", "internal_shell", "read_only", ["overview", "action-queue", "signals", "messages"], ["bank-package", "loan-case", "document", "own"], ["Bank package release"]),
  entitlement("bank-partner", "files", "scoped", "internal_shell", "portal_read_only", ["vault", "packages", "metadata", "versions", "approvals", "release-review", "record-links"], ["bank-package", "loan-case", "document"], ["Bank package release"]),
  entitlement("bank-partner", "analytics", "scoped", "internal_shell", "read_only", ["scorecards", "risk", "reports", "alerts", "benchmarks"], ["bank-package", "loan-case", "document"], ["Bank evidence release"]),
  entitlement("bank-partner", "loans", "scoped", "internal_shell", "portal_read_only", ["packages", "loan-cases", "conditions", "consents", "covenants", "lender-handoff", "monitoring"], ["bank-package", "loan-case", "document"], ["Bank package release"]),
  entitlement("bank-partner", "chat", "scoped", "shared_service", "local_draft_only", ["inbox", "threads", "drafts", "search"], ["bank-package", "loan-case", "own"], ["Bank package release"]),

  entitlement("investor", "dashboard", "portal", "external_portal", "portal_read_only", ["overview", "signals"], ["own", "organization"]),
  entitlement("investor", "files", "portal", "external_portal", "portal_read_only", ["vault", "packages", "metadata", "versions", "record-links"], ["own", "document"]),
  entitlement("investor", "analytics", "portal", "external_portal", "portal_read_only", ["scorecards", "portfolio", "reports", "alerts", "benchmarks"], ["own", "organization"]),
  entitlement("investor", "chat", "portal", "external_portal", "local_draft_only", ["inbox", "threads", "drafts", "search"], ["own"]),

  entitlement("landlord", "dashboard", "portal", "external_portal", "portal_read_only", ["overview", "action-queue", "messages"], ["own", "property"]),
  entitlement("landlord", "project", "portal", "external_portal", "local_draft_only", ["work-items", "timeline", "pages", "comments"], ["own", "property", "project"]),
  entitlement("landlord", "files", "portal", "external_portal", "portal_read_only", ["vault", "packages", "metadata", "versions", "approvals", "record-links"], ["own", "property", "document"]),
  entitlement("landlord", "chat", "portal", "external_portal", "local_draft_only", ["inbox", "threads", "drafts", "search"], ["own", "property"]),

  entitlement("vendor", "dashboard", "portal", "external_portal", "portal_read_only", ["overview", "action-queue", "messages"], ["own", "project"]),
  entitlement("vendor", "project", "portal", "external_portal", "local_draft_only", ["work-items", "board", "timeline", "pages", "comments"], ["own", "project", "document"]),
  entitlement("vendor", "files", "portal", "external_portal", "portal_read_only", ["vault", "packages", "metadata", "versions", "approvals", "record-links"], ["own", "project", "document"]),
  entitlement("vendor", "chat", "portal", "external_portal", "local_draft_only", ["inbox", "threads", "drafts", "search"], ["own", "project"]),
  entitlement("vendor", "operations", "portal", "external_portal", "local_draft_only", ["tasks", "calendar", "maintenance", "notes"], ["own", "project", "studio"]),
  entitlement("vendor", "learning", "portal", "external_portal", "portal_read_only", ["courses", "lessons", "progress", "certifications"], ["own"]),

  entitlement("gym-member", "dashboard", "portal", "external_portal", "portal_read_only", ["overview", "messages"], ["own", "member"]),
  entitlement("gym-member", "chat", "portal", "external_portal", "local_draft_only", ["inbox", "threads", "drafts", "search"], ["own", "member"]),
  entitlement("gym-member", "support", "portal", "external_portal", "local_draft_only", ["tickets", "requests", "messages", "knowledge-base", "escalations"], ["own", "member"]),
  entitlement("gym-member", "settings", "portal", "external_portal", "read_only", ["users", "notifications", "security"], ["own", "member"]),

  entitlement("guest", "sites", "portal", "external_portal", "portal_read_only", ["pages", "forms", "leads", "content", "public-portals"], ["own"]),
];

function boundaries(): RoleToolFunctionMatrixContract["boundaries"] {
  return {
    liveSourceCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    providerCallsEnabled: false,
    liveAiCallsEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
    financeWritesEnabled: false,
    bankSendsEnabled: false,
    candidateReleaseEnabled: false,
    publicReleaseEnabled: false,
    productionDeployEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function matrixAccess(role: RoleKey): RoleToolFunctionMatrixContract["access"] {
  if (adminMatrixRoles.includes(role)) {
    return {
      allowed: true,
      level: "matrix_admin",
      reason: "Role can review the complete role, tool and function matrix.",
    };
  }

  if (reviewerMatrixRoles.includes(role)) {
    return {
      allowed: true,
      level: "matrix_reviewer",
      reason: "Role can review internal role/function coverage and its own operating scope.",
    };
  }

  if (portalMatrixRoles.includes(role)) {
    return {
      allowed: true,
      level: "portal_scope",
      reason: "Role can review only its own portal-scoped tool functions.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Guest role can only use public site surfaces and cannot inspect the role/function matrix.",
  };
}

function enrich(seed: RoleToolEntitlementSeed): RoleToolEntitlement {
  const tool = toolCatalog.find((item) => item.module === seed.module);
  const functionSet = functionKeysByTool.get(seed.module) ?? new Set<string>();
  const missingFunctionKeys = seed.functionKeys.filter((key) => !functionSet.has(key));
  const functions = (tool?.functions ?? []).filter((item) => seed.functionKeys.includes(item.key));

  return {
    ...seed,
    toolLabel: tool?.label ?? seed.module,
    functions,
    missingFunctionKeys,
  };
}

function entitlementsForRole(role: RoleKey) {
  return matrixSeeds.filter((seed) => seed.role === role).map(enrich);
}

function hiddenModulesForRole(entitlements: RoleToolEntitlement[]) {
  const visible = new Set(entitlements.map((item) => item.module));
  return modules.map((module) => module.key).filter((key) => !visible.has(key));
}

function coverageIssuesFor(entitlements: RoleToolEntitlement[]) {
  const issues: string[] = [];
  entitlements.forEach((entitlementItem) => {
    entitlementItem.missingFunctionKeys.forEach((key) => {
      issues.push(`${entitlementItem.role}:${entitlementItem.module}:${key}`);
    });
  });
  return issues;
}

function capabilityScopesForRole(role: RoleKey, accessLevel: MatrixAccessLevel) {
  if (accessLevel === "matrix_admin" || accessLevel === "matrix_reviewer") return fullOsCapabilityScopes;
  if (accessLevel === "portal_scope" || accessLevel === "role_scope") {
    return fullOsCapabilityScopes.filter(
      (scope) => scope.ownerRole === role || scope.consumingRoles.includes(role) || scope.externalStakeholderSlices.includes(role),
    );
  }
  return [];
}

export function getRoleToolFunctionMatrix(role: RoleKey): RoleToolFunctionMatrixContract {
  const access = matrixAccess(role);
  const visibleRoles = access.level === "matrix_admin" || access.level === "matrix_reviewer" ? roles : roles.filter((item) => item.key === role);
  const roleRows = access.allowed
    ? visibleRoles.map((roleItem) => {
        const entitlements = entitlementsForRole(roleItem.key);
        return {
          key: roleItem.key,
          label: roleItem.label,
          mode: roleItem.mode,
          entitlements,
          hiddenModules: hiddenModulesForRole(entitlements),
        };
      })
    : [];
  const entitlements = roleRows.flatMap((roleItem) => roleItem.entitlements);
  const coverageIssues = coverageIssuesFor(entitlements);
  const functionFamilies = new Set(toolCatalog.flatMap((tool) => tool.functions.map((item) => item.family)));
  const capabilityScopes = capabilityScopesForRole(role, access.level);
  const departments = new Set(capabilityScopes.map((scope) => scope.ownerDepartment));

  return {
    role,
    status: access.allowed ? "ready" : "forbidden",
    access,
    blockRange: "Blocks 476-500",
    sourceOfTruth: [
      "docs/CRAYS_ROLE_TOOL_FUNCTION_MATRIX_AND_NATIVE_UX_BLOCKS_476_500_2026_07_10.md",
      "docs/CRAYS_TOOL_NATIVE_UI_RULES_AND_BLOCKS_101_120_2026_07_10.md",
      "docs/UX_SAAS_DESIGN_SYSTEM_MEMORY.md",
      "src/lib/roles.ts",
      "src/lib/modules.ts",
      "src/lib/access-control.ts",
      "src/lib/permissions.ts",
    ],
    productRule: {
      completeFunctionCoverageRequired: true,
      sourceUiEmbedded: false,
      productUiLanguage: "English",
      roleScopedByDefault: true,
      sharedCoreDataRequired: true,
      targetWriteModelsRequired: true,
      isolatedToolDatabasesAsProductTruth: false,
    },
    targetWriteModelPolicy: [
      {
        key: "core-write-models",
        label: "CRAYS Core write models",
        targetBlocks: "Blocks 501-600",
        currentState: "disabled_until_exact_gate",
        rule: "User actions first write into validated CRAYS Core command models with role, scope, audit, validation and rollback evidence.",
      },
      {
        key: "tool-write-adapters",
        label: "Tool write adapters",
        targetBlocks: "Blocks 501-600",
        currentState: "disabled_until_exact_gate",
        rule: "After Core command acceptance, specific approved adapters can apply changes to Project, CRM, ERP, Files, Loans, Chat or Operations in controlled dev mode only.",
      },
      {
        key: "sync-apply-models",
        label: "Sync apply models",
        targetBlocks: "Blocks 501-600",
        currentState: "disabled_until_exact_gate",
        rule: "Sync writes require dry-run diff, conflict class, explicit apply gate, audit event and cleanup or rollback path.",
      },
      {
        key: "external-send-models",
        label: "External send models",
        targetBlocks: "Blocks 501-600",
        currentState: "disabled_until_exact_gate",
        rule: "Email, bank handoff, public release, uploads, payment, finance execution and external sending remain separate high-risk gates.",
      },
    ],
    sharedCoreEntities: [
      {
        key: "people",
        label: "People",
        availableToTools: ["crm", "project", "erp", "files", "analytics", "loans", "chat", "operations", "hr", "learning", "support", "sites", "sync"],
        productRule: "People records are CRAYS Core entities and can appear in every role-scoped tool where contact, staffing, support, candidate, owner, lender or vendor context is required.",
      },
      {
        key: "companies",
        label: "Companies",
        availableToTools: ["crm", "project", "erp", "files", "analytics", "loans", "chat", "operations", "support", "sites", "sync"],
        productRule: "Company and organization records are shared across CRM, delivery, finance, packages, lending, operations, support and reporting.",
      },
      {
        key: "communication",
        label: "Email, calendar and activities",
        availableToTools: ["crm", "project", "erp", "files", "analytics", "loans", "chat", "operations", "hr", "support", "sync"],
        productRule: "Email, calendar events, calls, notes and activity timeline records are shared CRAYS Core communication entities with tool-specific views.",
      },
      {
        key: "properties",
        label: "Properties",
        availableToTools: ["dashboard", "crm", "project", "files", "analytics", "loans", "chat", "operations", "sites", "sync"],
        productRule: "Property, owner and location records can surface in acquisition, project, package, evidence, lending, operations and portal tools.",
      },
      {
        key: "deals",
        label: "Deals and prepared packages",
        availableToTools: ["dashboard", "crm", "project", "erp", "files", "analytics", "loans", "chat", "operations", "sites", "sync"],
        productRule: "Prepared deal, candidate intent, bank package and opening handoff records are shared across the full CRAYS operating workflow.",
      },
      {
        key: "evidence",
        label: "Evidence and documents",
        availableToTools: ["dashboard", "crm", "project", "erp", "files", "analytics", "loans", "chat", "operations", "support", "sync"],
        productRule: "Evidence records, document metadata and package links are reusable across files, analytics, lending, deal, finance and project views.",
      },
      {
        key: "finance-kpis",
        label: "Finance and KPIs",
        availableToTools: ["dashboard", "crm", "project", "erp", "files", "analytics", "loans", "operations", "sync"],
        productRule: "Finance summaries, KPI snapshots, benchmark signals and readiness metrics are shared read models, never trapped inside one tool.",
      },
      {
        key: "project-signals",
        label: "Project signals",
        availableToTools: ["dashboard", "crm", "project", "erp", "files", "analytics", "loans", "chat", "operations", "support", "sync"],
        productRule: "Project work items, blockers, milestones and handoff signals must be available to related CRM, finance, file, loan and operating views.",
      },
    ],
    summary: {
      rolesMapped: roleRows.length,
      toolsMapped: toolCatalog.length,
      functionFamiliesMapped: functionFamilies.size,
      entitlementsMapped: entitlements.length,
      capabilityScopesMapped: capabilityScopes.length,
      departmentsMapped: departments.size,
      missingFunctionKeys: coverageIssues.length,
    },
    roles: roleRows,
    tools: toolCatalog,
    fullOsCapabilityScopes: capabilityScopes,
    coverageIssues,
    boundaries: boundaries(),
  };
}
