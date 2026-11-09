import type { RoleKey } from "./roles";

export type ModuleKey =
  | "dashboard"
  | "crm"
  | "project"
  | "erp"
  | "files"
  | "analytics"
  | "loans"
  | "chat"
  | "operations"
  | "hr"
  | "learning"
  | "support"
  | "sites"
  | "sync"
  | "settings";

export type MetricDefinition = {
  label: string;
  value: string;
  context: string;
  tone: "green" | "amber" | "rose" | "blue" | "ink";
};

export type WorkstreamDefinition = {
  title: string;
  owner: string;
  state: string;
  next: string;
};

export type ModuleDefinition = {
  key: ModuleKey;
  label: string;
  route: `/${string}`;
  group: "Command" | "Growth" | "Operations" | "Platform";
  purpose: string;
  primaryRecords: string[];
  roles: RoleKey[];
  metrics: MetricDefinition[];
  workstreams: WorkstreamDefinition[];
};

const allWorkbenchRoles: RoleKey[] = [
  "crays-management",
  "admin",
  "deal-manager",
  "expansion-manager",
  "finance",
  "hr",
  "franchise-partner",
  "studio-manager",
  "bank-partner",
  "investor",
  "landlord",
  "vendor",
  "reviewer",
];

export const modules: ModuleDefinition[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    route: "/dashboard",
    group: "Command",
    purpose: "Role-scoped operating picture across deals, studios, finance, documents and communication.",
    primaryRecords: ["Events", "KPIs", "Tasks", "Documents"],
    roles: allWorkbenchRoles,
    metrics: [
      { label: "Open actions", value: "42", context: "role queue", tone: "amber" },
      { label: "Visible KPIs", value: "18", context: "scoped", tone: "green" },
      { label: "Critical risks", value: "7", context: "review", tone: "rose" },
      { label: "Messages", value: "23", context: "unanswered", tone: "blue" },
    ],
    workstreams: [
      { title: "Bank package readiness", owner: "Deal Team", state: "Review", next: "Resolve lender questions" },
      { title: "Opening project delays", owner: "Operations", state: "At risk", next: "Escalate milestone owners" },
      { title: "Document approvals", owner: "Compliance", state: "Active", next: "Approve or request evidence" },
    ],
  },
  {
    key: "crm",
    label: "CRM",
    route: "/crm",
    group: "Growth",
    purpose: "Companies, people, leads, opportunities, tasks, notes and workflow records.",
    primaryRecords: ["Companies", "People", "Leads", "Opportunities"],
    roles: ["crays-management", "admin", "deal-manager", "expansion-manager", "reviewer"],
    metrics: [
      { label: "Opportunities", value: "31", context: "active", tone: "green" },
      { label: "Candidates", value: "14", context: "in diligence", tone: "blue" },
      { label: "Follow-ups", value: "19", context: "due", tone: "amber" },
      { label: "Blocked files", value: "5", context: "documents", tone: "rose" },
    ],
    workstreams: [
      { title: "Candidate pipeline", owner: "Deal Manager", state: "Active", next: "Prioritize bank-ready cases" },
      { title: "Partner qualification", owner: "Expansion", state: "Screening", next: "Score regions and capital path" },
      { title: "Workflow automation", owner: "Admin", state: "Draft", next: "Review trigger rules" },
    ],
  },
  {
    key: "project",
    label: "Project",
    route: "/project",
    group: "Operations",
    purpose: "Opening projects, work items, cycles, modules, views, pages and stakeholder delivery.",
    primaryRecords: ["Projects", "Work Items", "Cycles", "Pages"],
    roles: ["crays-management", "admin", "deal-manager", "expansion-manager", "franchise-partner", "landlord", "vendor", "reviewer"],
    metrics: [
      { label: "Opening projects", value: "12", context: "active", tone: "green" },
      { label: "Delayed milestones", value: "4", context: "critical path", tone: "rose" },
      { label: "RFIs", value: "16", context: "open", tone: "amber" },
      { label: "Handoffs", value: "3", context: "this week", tone: "blue" },
    ],
    workstreams: [
      { title: "Lease to build-out", owner: "Project Lead", state: "Running", next: "Clear permit tasks" },
      { title: "Supplier delivery", owner: "Operations", state: "At risk", next: "Confirm equipment dates" },
      { title: "Handover checklist", owner: "Franchise Partner", state: "Queued", next: "Assign studio owner" },
    ],
  },
  {
    key: "erp",
    label: "ERP",
    route: "/erp",
    group: "Operations",
    purpose: "Finance, procurement, purchasing, budgets and controlled back-office records.",
    primaryRecords: ["Invoices", "Budgets", "Suppliers", "Purchase Orders", "Items", "Cost Centers"],
    roles: ["crays-management", "admin", "finance", "deal-manager", "franchise-partner", "studio-manager", "reviewer"],
    metrics: [
      { label: "Open invoices", value: "68", context: "review", tone: "amber" },
      { label: "Budget variance", value: "6.4%", context: "opening", tone: "rose" },
      { label: "Fee basis", value: "Ready", context: "month", tone: "green" },
      { label: "Exports", value: "9", context: "queued", tone: "blue" },
    ],
    workstreams: [
      { title: "Opening budget", owner: "Finance", state: "Review", next: "Approve change orders" },
      { title: "Supplier and purchase queue", owner: "Procurement", state: "Running", next: "Confirm equipment dates" },
      { title: "Purchase approval", owner: "Procurement", state: "Queued", next: "Review material requests" },
    ],
  },
  {
    key: "files",
    label: "Files",
    route: "/files",
    group: "Operations",
    purpose: "Role-scoped document vault, file packages, reviews, versions and approvals.",
    primaryRecords: ["Documents", "Versions", "Approvals", "Packages"],
    roles: allWorkbenchRoles,
    metrics: [
      { label: "Pending reviews", value: "27", context: "documents", tone: "amber" },
      { label: "Bank files", value: "11", context: "ready", tone: "green" },
      { label: "Expired items", value: "3", context: "renew", tone: "rose" },
      { label: "Shared links", value: "36", context: "scoped", tone: "blue" },
    ],
    workstreams: [
      { title: "Document vault", owner: "Compliance", state: "Active", next: "Map visibility scopes" },
      { title: "Bank file package", owner: "Deal Team", state: "Review", next: "Attach latest evidence" },
      { title: "Project documents", owner: "Operations", state: "Active", next: "Resolve missing plans" },
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    route: "/analytics",
    group: "Command",
    purpose: "Role-scoped KPI dashboards, trends, risk signals and portfolio reporting.",
    primaryRecords: ["KPI Snapshots", "Reports", "Events", "Read Models"],
    roles: ["crays-management", "admin", "finance", "deal-manager", "expansion-manager", "franchise-partner", "studio-manager", "bank-partner", "investor"],
    metrics: [
      { label: "Live dashboards", value: "8", context: "role scoped", tone: "green" },
      { label: "Alerts", value: "15", context: "active", tone: "amber" },
      { label: "Portfolio MRR", value: "EUR 2.8M", context: "visible", tone: "blue" },
      { label: "Variance", value: "4", context: "thresholds", tone: "rose" },
    ],
    workstreams: [
      { title: "Executive portfolio", owner: "Management", state: "Active", next: "Review risk segments" },
      { title: "Partner studio KPIs", owner: "Franchise Partner", state: "Active", next: "Open underperforming sites" },
      { title: "Bank monitoring", owner: "Finance", state: "Review", next: "Refresh covenant data" },
      { title: "Expansion partner pipeline", owner: "Expansion Manager", state: "Screening", next: "Review property and funding signals" },
    ],
  },
  {
    key: "loans",
    label: "Loans",
    route: "/loans",
    group: "Growth",
    purpose: "Bank packages, loan cases, conditions, account opening, payout and monitoring.",
    primaryRecords: ["Bank Packages", "Loan Cases", "Conditions", "Consents"],
    roles: ["crays-management", "admin", "finance", "deal-manager", "franchise-candidate", "franchise-partner", "bank-partner", "reviewer"],
    metrics: [
      { label: "Loan cases", value: "17", context: "active", tone: "green" },
      { label: "Avg DSCR", value: "1.62x", context: "review", tone: "blue" },
      { label: "Conditions", value: "24", context: "open", tone: "amber" },
      { label: "Payout blockers", value: "5", context: "critical", tone: "rose" },
    ],
    workstreams: [
      { title: "Credit file", owner: "Bank Desk", state: "Review", next: "Answer lender questions" },
      { title: "KYC handoff", owner: "Compliance", state: "Ready", next: "Release scoped package" },
      { title: "Drawdown monitor", owner: "Finance", state: "Queued", next: "Confirm account status" },
    ],
  },
  {
    key: "chat",
    label: "Chat",
    route: "/chat",
    group: "Operations",
    purpose: "Role-scoped stakeholder communication across internal, shared and external conversations.",
    primaryRecords: ["Inbox", "Threads", "Participants", "Channels"],
    roles: [
      "crays-management",
      "admin",
      "deal-manager",
      "expansion-manager",
      "finance",
      "hr",
      "franchise-candidate",
      "franchise-partner",
      "studio-manager",
      "bank-partner",
      "investor",
      "landlord",
      "vendor",
      "reviewer",
      "gym-member",
    ],
    metrics: [
      { label: "Open threads", value: "44", context: "scoped", tone: "blue" },
      { label: "Pending replies", value: "17", context: "waiting", tone: "amber" },
      { label: "SLA risk", value: "6", context: "conversations", tone: "rose" },
      { label: "Resolved", value: "88%", context: "week", tone: "green" },
    ],
    workstreams: [
      { title: "Bank questions", owner: "Deal Team", state: "Waiting", next: "Route answer to lender scope" },
      { title: "Partner launch thread", owner: "Success", state: "Active", next: "Confirm open decisions" },
      { title: "Member support handoff", owner: "Support", state: "Queued", next: "Separate internal notes" },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    route: "/operations",
    group: "Operations",
    purpose: "Studio cockpit for access, tasks, staff readiness, assets, maintenance, quality and service recovery.",
    primaryRecords: ["Studios", "Tasks", "Staff Readiness", "Assets", "Maintenance", "Quality"],
    roles: ["crays-management", "admin", "finance", "deal-manager", "franchise-partner", "studio-manager", "vendor", "reviewer"],
    metrics: [
      { label: "Studio tasks", value: "64", context: "open", tone: "amber" },
      { label: "Check-ins", value: "12.4K", context: "week", tone: "green" },
      { label: "Maintenance", value: "9", context: "active", tone: "rose" },
      { label: "Readiness", value: "82%", context: "launch", tone: "blue" },
    ],
    workstreams: [
      { title: "Access readiness", owner: "Studio Manager", state: "Active", next: "Verify door and app rights" },
      { title: "Staff coverage", owner: "Studio Manager", state: "Review", next: "Clear shift gaps" },
      { title: "Maintenance queue", owner: "Operations", state: "At risk", next: "Escalate unresolved ticket" },
    ],
  },
  {
    key: "hr",
    label: "HR",
    route: "/hr",
    group: "Operations",
    purpose: "People readiness, training, workforce tasks and staff-related operating controls.",
    primaryRecords: ["People", "Training", "Tasks", "Readiness"],
    roles: ["crays-management", "admin", "hr", "studio-manager", "reviewer"],
    metrics: [
      { label: "Training due", value: "21", context: "people", tone: "amber" },
      { label: "Ready teams", value: "6", context: "studios", tone: "green" },
      { label: "Open checks", value: "9", context: "review", tone: "blue" },
      { label: "Escalations", value: "2", context: "urgent", tone: "rose" },
    ],
    workstreams: [
      { title: "Opening staffing", owner: "HR", state: "Active", next: "Confirm launch coverage" },
      { title: "Training completion", owner: "Studio Manager", state: "Review", next: "Schedule missing modules" },
      { title: "People documents", owner: "HR", state: "Restricted", next: "Review access grants" },
    ],
  },
  {
    key: "learning",
    label: "Learning",
    route: "/learning",
    group: "Operations",
    purpose: "Training paths, operating playbooks, compliance learning and partner enablement.",
    primaryRecords: ["Courses", "Lessons", "Progress", "Certifications"],
    roles: ["crays-management", "admin", "hr", "franchise-partner", "studio-manager", "vendor"],
    metrics: [
      { label: "Active paths", value: "14", context: "training", tone: "green" },
      { label: "Overdue", value: "18", context: "learners", tone: "amber" },
      { label: "Certified", value: "83%", context: "launch teams", tone: "blue" },
      { label: "Blocked", value: "3", context: "modules", tone: "rose" },
    ],
    workstreams: [
      { title: "Partner onboarding", owner: "Success", state: "Active", next: "Assign launch modules" },
      { title: "Studio operations path", owner: "HR", state: "Draft", next: "Approve cleaning and access lessons" },
      { title: "Compliance learning", owner: "Reviewer", state: "Review", next: "Publish required module" },
    ],
  },
  {
    key: "support",
    label: "Support",
    route: "/support",
    group: "Operations",
    purpose: "Support tickets, service recovery, stakeholder requests and member issue handling.",
    primaryRecords: ["Tickets", "SLAs", "Requests", "Messages"],
    roles: ["crays-management", "admin", "deal-manager", "finance", "franchise-partner", "studio-manager", "gym-member", "reviewer"],
    metrics: [
      { label: "Open tickets", value: "53", context: "all scopes", tone: "amber" },
      { label: "SLA risk", value: "8", context: "today", tone: "rose" },
      { label: "Resolved", value: "91%", context: "week", tone: "green" },
      { label: "Member cases", value: "26", context: "active", tone: "blue" },
    ],
    workstreams: [
      { title: "Member recovery", owner: "Support", state: "Active", next: "Prioritize payment issues" },
      { title: "Partner requests", owner: "Success", state: "Review", next: "Assign finance blockers" },
      { title: "Escalation queue", owner: "Operations", state: "At risk", next: "Clear SLA breaches" },
    ],
  },
  {
    key: "sites",
    label: "Sites",
    route: "/sites",
    group: "Growth",
    purpose: "Public web surfaces, B2B portals, franchise pages and data-backed frontends.",
    primaryRecords: ["Pages", "Forms", "Leads", "Content"],
    roles: ["crays-management", "admin", "deal-manager", "expansion-manager", "reviewer"],
    metrics: [
      { label: "Live pages", value: "12", context: "public", tone: "green" },
      { label: "Forms", value: "7", context: "active", tone: "blue" },
      { label: "Lead requests", value: "41", context: "week", tone: "amber" },
      { label: "Review items", value: "5", context: "content", tone: "rose" },
    ],
    workstreams: [
      { title: "Franchise page", owner: "Growth", state: "Live", next: "Connect deal inventory" },
      { title: "Candidate portal", owner: "Deal Team", state: "Draft", next: "Map access states" },
      { title: "Member web flows", owner: "Operations", state: "Queued", next: "Define access scope" },
    ],
  },
  {
    key: "sync",
    label: "Sync",
    route: "/sync",
    group: "Platform",
    purpose: "Integration mappings, sync jobs, adapter health, events and controlled data exchange.",
    primaryRecords: ["Adapters", "Mappings", "Jobs", "Events"],
    roles: ["crays-management", "admin", "finance", "reviewer"],
    metrics: [
      { label: "Sync jobs", value: "39", context: "today", tone: "green" },
      { label: "Warnings", value: "6", context: "review", tone: "amber" },
      { label: "Failures", value: "2", context: "blocked", tone: "rose" },
      { label: "Mappings", value: "128", context: "records", tone: "blue" },
    ],
    workstreams: [
      { title: "Record mapping", owner: "Admin", state: "Active", next: "Resolve unmatched entities" },
      { title: "Webhook intake", owner: "Platform", state: "Queued", next: "Verify signatures" },
      { title: "Dashboard refresh", owner: "Analytics", state: "Running", next: "Check delayed KPIs" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    route: "/settings",
    group: "Platform",
    purpose: "Global users, roles, permissions, organizations, modules, security and integration controls.",
    primaryRecords: ["Users", "Roles", "Permissions", "Organizations"],
    roles: ["crays-management", "admin", "finance", "hr", "reviewer", "franchise-partner", "studio-manager"],
    metrics: [
      { label: "Users", value: "184", context: "mapped", tone: "green" },
      { label: "Roles", value: "16", context: "active", tone: "blue" },
      { label: "Access reviews", value: "12", context: "due", tone: "amber" },
      { label: "Security checks", value: "4", context: "urgent", tone: "rose" },
    ],
    workstreams: [
      { title: "Role matrix", owner: "Admin", state: "Review", next: "Confirm stakeholder scopes" },
      { title: "Global identity", owner: "Security", state: "Ready", next: "Connect provider config" },
      { title: "Module access", owner: "Admin", state: "Active", next: "Review partner permissions" },
    ],
  },
];

export function moduleByKey(key: string | null | undefined) {
  return modules.find((module) => module.key === key);
}

export function modulesForRole(role: RoleKey) {
  if (role === "guest") return modules.filter((module) => ["sites"].includes(module.key));
  if (role === "gym-member") return modules.filter((module) => ["dashboard", "chat", "support", "settings"].includes(module.key));
  return modules.filter((module) => module.roles.includes(role));
}
