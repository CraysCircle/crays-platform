import type { ModuleKey } from "./modules";
import type { RoleKey } from "./roles";

export type WorkflowEventSeverity = "info" | "attention" | "risk" | "critical";
export type WorkflowEventStatus = "new" | "acknowledged" | "in_progress" | "resolved" | "archived";

export type WorkflowEventCategory =
  | "identity-access"
  | "candidate-journey"
  | "banking"
  | "location-property"
  | "project-opening"
  | "studio-operations"
  | "finance"
  | "support-hr"
  | "communication";

export type WorkflowEventContract = {
  id: string;
  category: WorkflowEventCategory;
  type: string;
  sourceModule: ModuleKey;
  entityType: string;
  severity: WorkflowEventSeverity;
  status: WorkflowEventStatus;
  visibilityRoles: RoleKey[];
  dashboardImpact: string[];
};

export type MetricKey =
  | "candidate_readiness"
  | "bank_package_readiness"
  | "opening_milestone_delay"
  | "studio_revenue"
  | "studio_members"
  | "payment_failure_rate"
  | "franchise_fee_basis"
  | "support_sla_risk"
  | "document_approval_queue"
  | "portfolio_risk";

export type KpiSnapshotContract = {
  metricKey: MetricKey;
  label: string;
  unit: "percent" | "count" | "currency" | "ratio" | "status";
  entityType: "portfolio" | "candidate" | "deal" | "studio" | "project" | "loan-case" | "member";
  scopeType: "global" | "organization" | "studio" | "deal" | "project" | "member" | "document" | "own";
  visibilityRoles: RoleKey[];
  sourceModules: ModuleKey[];
  refreshPolicy: "event-driven" | "hourly" | "daily" | "manual-review";
};

export type DashboardWidgetContract = {
  id: string;
  title: string;
  metricKey: MetricKey;
  visualType: "scorecard" | "trend" | "queue" | "risk-list" | "funnel";
  roleVisibility: RoleKey[];
  drilldownRoute: `/${string}`;
  requiresScope: KpiSnapshotContract["scopeType"];
};

export type EventKpiContract = {
  status: "contract_ready";
  liveEventsReturned: false;
  liveKpisReturned: false;
  workflowEvents: WorkflowEventContract[];
  kpis: KpiSnapshotContract[];
  widgets: DashboardWidgetContract[];
  guardrails: string[];
};

export const workflowEventContracts: WorkflowEventContract[] = [
  {
    id: "event-contract-role-assigned",
    category: "identity-access",
    type: "role.assigned",
    sourceModule: "settings",
    entityType: "RoleAssignment",
    severity: "attention",
    status: "new",
    visibilityRoles: ["admin", "crays-management", "reviewer"],
    dashboardImpact: ["access review queue", "audit log"],
  },
  {
    id: "event-contract-kyc-verified",
    category: "candidate-journey",
    type: "candidate.kyc_verified",
    sourceModule: "loans",
    entityType: "Candidate",
    severity: "info",
    status: "acknowledged",
    visibilityRoles: ["franchise-candidate", "deal-manager", "finance", "crays-management", "bank-partner"],
    dashboardImpact: ["candidate readiness", "bank package readiness"],
  },
  {
    id: "event-contract-package-submitted",
    category: "banking",
    type: "bank_package.submitted",
    sourceModule: "loans",
    entityType: "BankPackage",
    severity: "attention",
    status: "new",
    visibilityRoles: ["deal-manager", "finance", "crays-management", "bank-partner", "reviewer"],
    dashboardImpact: ["bank queue", "credit workflow"],
  },
  {
    id: "event-contract-milestone-delayed",
    category: "project-opening",
    type: "opening.milestone_delayed",
    sourceModule: "project",
    entityType: "Project",
    severity: "risk",
    status: "in_progress",
    visibilityRoles: ["deal-manager", "franchise-partner", "crays-management", "vendor", "landlord", "reviewer"],
    dashboardImpact: ["opening delay risk", "stakeholder task queue"],
  },
  {
    id: "event-contract-payment-failed",
    category: "studio-operations",
    type: "member.payment_failed",
    sourceModule: "operations",
    entityType: "Member",
    severity: "attention",
    status: "new",
    visibilityRoles: ["franchise-partner", "studio-manager", "finance", "crays-management"],
    dashboardImpact: ["payment recovery", "studio revenue"],
  },
  {
    id: "event-contract-franchise-fee-calculated",
    category: "finance",
    type: "franchise_fee.calculated",
    sourceModule: "erp",
    entityType: "Studio",
    severity: "info",
    status: "acknowledged",
    visibilityRoles: ["franchise-partner", "finance", "crays-management"],
    dashboardImpact: ["franchise fee basis", "finance review"],
  },
  {
    id: "event-contract-sla-breached",
    category: "support-hr",
    type: "support.sla_breached",
    sourceModule: "support",
    entityType: "Ticket",
    severity: "critical",
    status: "new",
    visibilityRoles: ["franchise-partner", "studio-manager", "crays-management", "reviewer"],
    dashboardImpact: ["support SLA risk", "operations escalation"],
  },
  {
    id: "event-contract-external-message-failed",
    category: "communication",
    type: "message.delivery_failed",
    sourceModule: "chat",
    entityType: "Conversation",
    severity: "attention",
    status: "new",
    visibilityRoles: ["deal-manager", "franchise-partner", "studio-manager", "crays-management"],
    dashboardImpact: ["communication SLA", "stakeholder follow-up"],
  },
];

export const kpiSnapshotContracts: KpiSnapshotContract[] = [
  {
    metricKey: "candidate_readiness",
    label: "Candidate readiness",
    unit: "percent",
    entityType: "candidate",
    scopeType: "deal",
    visibilityRoles: ["franchise-candidate", "deal-manager", "crays-management", "reviewer"],
    sourceModules: ["crm", "loans", "files"],
    refreshPolicy: "event-driven",
  },
  {
    metricKey: "bank_package_readiness",
    label: "Bank package readiness",
    unit: "percent",
    entityType: "loan-case",
    scopeType: "deal",
    visibilityRoles: ["franchise-candidate", "deal-manager", "finance", "bank-partner", "crays-management"],
    sourceModules: ["loans", "files", "erp"],
    refreshPolicy: "event-driven",
  },
  {
    metricKey: "opening_milestone_delay",
    label: "Opening milestone delay",
    unit: "count",
    entityType: "project",
    scopeType: "project",
    visibilityRoles: ["deal-manager", "franchise-partner", "crays-management", "vendor", "landlord"],
    sourceModules: ["project", "operations"],
    refreshPolicy: "event-driven",
  },
  {
    metricKey: "studio_revenue",
    label: "Studio revenue",
    unit: "currency",
    entityType: "studio",
    scopeType: "studio",
    visibilityRoles: ["franchise-partner", "finance", "crays-management", "studio-manager"],
    sourceModules: ["erp", "analytics", "operations"],
    refreshPolicy: "hourly",
  },
  {
    metricKey: "studio_members",
    label: "Studio members",
    unit: "count",
    entityType: "studio",
    scopeType: "studio",
    visibilityRoles: ["franchise-partner", "studio-manager", "crays-management"],
    sourceModules: ["operations", "analytics"],
    refreshPolicy: "hourly",
  },
  {
    metricKey: "payment_failure_rate",
    label: "Payment failure rate",
    unit: "percent",
    entityType: "studio",
    scopeType: "studio",
    visibilityRoles: ["franchise-partner", "finance", "studio-manager", "crays-management"],
    sourceModules: ["erp", "operations"],
    refreshPolicy: "event-driven",
  },
  {
    metricKey: "franchise_fee_basis",
    label: "Franchise fee basis",
    unit: "currency",
    entityType: "studio",
    scopeType: "studio",
    visibilityRoles: ["franchise-partner", "finance", "crays-management"],
    sourceModules: ["erp", "analytics"],
    refreshPolicy: "manual-review",
  },
  {
    metricKey: "support_sla_risk",
    label: "Support SLA risk",
    unit: "count",
    entityType: "studio",
    scopeType: "studio",
    visibilityRoles: ["franchise-partner", "studio-manager", "crays-management", "reviewer"],
    sourceModules: ["support", "chat"],
    refreshPolicy: "event-driven",
  },
  {
    metricKey: "document_approval_queue",
    label: "Document approval queue",
    unit: "count",
    entityType: "deal",
    scopeType: "document",
    visibilityRoles: ["deal-manager", "finance", "reviewer", "crays-management"],
    sourceModules: ["files", "loans", "project"],
    refreshPolicy: "event-driven",
  },
  {
    metricKey: "portfolio_risk",
    label: "Portfolio risk",
    unit: "status",
    entityType: "portfolio",
    scopeType: "global",
    visibilityRoles: ["crays-management", "admin"],
    sourceModules: ["analytics", "crm", "project", "erp", "support"],
    refreshPolicy: "hourly",
  },
];

export const dashboardWidgetContracts: DashboardWidgetContract[] = [
  {
    id: "widget-deal-readiness",
    title: "Deal readiness",
    metricKey: "candidate_readiness",
    visualType: "funnel",
    roleVisibility: ["deal-manager", "crays-management"],
    drilldownRoute: "/crm",
    requiresScope: "deal",
  },
  {
    id: "widget-bank-package",
    title: "Bank package",
    metricKey: "bank_package_readiness",
    visualType: "scorecard",
    roleVisibility: ["deal-manager", "finance", "bank-partner", "crays-management"],
    drilldownRoute: "/loans",
    requiresScope: "deal",
  },
  {
    id: "widget-opening-risk",
    title: "Opening risk",
    metricKey: "opening_milestone_delay",
    visualType: "risk-list",
    roleVisibility: ["deal-manager", "franchise-partner", "crays-management"],
    drilldownRoute: "/project",
    requiresScope: "project",
  },
  {
    id: "widget-studio-performance",
    title: "Studio performance",
    metricKey: "studio_revenue",
    visualType: "trend",
    roleVisibility: ["franchise-partner", "finance", "crays-management"],
    drilldownRoute: "/analytics",
    requiresScope: "studio",
  },
  {
    id: "widget-document-queue",
    title: "Document queue",
    metricKey: "document_approval_queue",
    visualType: "queue",
    roleVisibility: ["deal-manager", "finance", "reviewer", "crays-management"],
    drilldownRoute: "/files",
    requiresScope: "document",
  },
];

export const eventKpiGuardrails = [
  "Workflow events feed dashboards, tasks, notifications and audit context.",
  "Audit events remain separate from workflow events.",
  "KPIs must declare role visibility and scope before they are rendered.",
  "Finance KPIs must separate franchisor corporate finance from franchise partner studio finance.",
  "Member KPIs must avoid exposing personal member data unless the role and legal basis allow it.",
  "Every automated dashboard signal must be traceable back to source event IDs before production.",
];

export function getEventKpiContract(): EventKpiContract {
  return {
    status: "contract_ready",
    liveEventsReturned: false,
    liveKpisReturned: false,
    workflowEvents: workflowEventContracts,
    kpis: kpiSnapshotContracts,
    widgets: dashboardWidgetContracts,
    guardrails: eventKpiGuardrails,
  };
}
