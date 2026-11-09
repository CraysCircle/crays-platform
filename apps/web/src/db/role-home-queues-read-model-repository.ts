import { getRealProductReadModel, type RealProductCase } from "./real-product-read-model-repository";
import type { RoleKey } from "@/lib/roles";

type QueuePriority = "critical" | "high" | "medium" | "low";
type QueueModuleKey = "dashboard" | "crm" | "project" | "erp" | "files" | "analytics" | "loans" | "operations" | "support";
type QueueBucketKey = "my_work" | "blocked" | "due_soon" | "needs_review" | "waiting_on_gate";

export type RoleHomeQueueBucket = {
  key: QueueBucketKey;
  label: string;
  description: string;
  count: number;
};

export type RoleHomeQueueRow = {
  id: string;
  preparedOfferId: string;
  dealId: string | null;
  propertyCaseId: string | null;
  title: string;
  market: string;
  objectLabel: string;
  state: string;
  priority: QueuePriority;
  ownerRole: string;
  workstream: string;
  blocker: string;
  dueLabel: string;
  nextAction: string;
  changedLabel: string;
  gateState: string;
  commandModel: string;
  evidenceSummary: {
    evidencePackages: number;
    documents: number;
    approvedDocuments: number;
    blockedGates: number;
    moduleSignals: number;
  };
  caseHref: string;
  primaryModule: QueueModuleKey;
  primaryModuleLabel: string;
  primaryModuleHref: string;
  updatedAt: string;
};

export type RoleHomeQueuesReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: "role_home_queue" | "forbidden";
  };
  roleQueue: {
    key: string;
    label: string;
    ownerRole: string;
    primaryModule: QueueModuleKey;
    primaryAction: string;
  };
  workBuckets: RoleHomeQueueBucket[];
  summary: {
    rows: number;
    critical: number;
    high: number;
    blocked: number;
    moduleDeepLinks: number;
  };
  rows: RoleHomeQueueRow[];
  boundaries: {
    liveSourceCallsEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    toolApplyEnabled: false;
    uploadsEnabled: false;
    externalSendingEnabled: false;
    financeActionsEnabled: false;
    bankActionsEnabled: false;
    paymentInitiationEnabled: false;
    releaseActionsEnabled: false;
    productionDeployEnabled: false;
    vpsChangingWorkEnabled: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
  secretsReturned: false;
  privateKeysReturned: false;
};

const allowedQueueRoles: RoleKey[] = [
  "crays-management",
  "admin",
  "deal-manager",
  "expansion-manager",
  "finance",
  "reviewer",
  "franchise-partner",
  "studio-manager",
];

const moduleLabels: Record<QueueModuleKey, string> = {
  dashboard: "Dashboard",
  crm: "CRM",
  project: "Project",
  erp: "ERP",
  files: "Files",
  analytics: "Analytics",
  loans: "Loans",
  operations: "Operations",
  support: "Support",
};

function boundaries(): RoleHomeQueuesReadModel["boundaries"] {
  return {
    liveSourceCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
    financeActionsEnabled: false,
    bankActionsEnabled: false,
    paymentInitiationEnabled: false,
    releaseActionsEnabled: false,
    productionDeployEnabled: false,
    vpsChangingWorkEnabled: false,
  };
}

function queueProfile(role: RoleKey): RoleHomeQueuesReadModel["roleQueue"] {
  if (role === "expansion-manager") {
    return {
      key: "owner-property-checks",
      label: "Owner property checks",
      ownerRole: "Expansion Manager",
      primaryModule: "crm",
      primaryAction: "Review property fit",
    };
  }

  if (role === "finance") {
    return {
      key: "bank-package-readiness",
      label: "Bank package readiness",
      ownerRole: "Finance",
      primaryModule: "loans",
      primaryAction: "Resolve bank blockers",
    };
  }

  if (role === "reviewer") {
    return {
      key: "gate-review",
      label: "Gate review queue",
      ownerRole: "Reviewer",
      primaryModule: "files",
      primaryAction: "Review release gates",
    };
  }

  if (role === "franchise-partner") {
    return {
      key: "opening-handoff",
      label: "Opening and portfolio queue",
      ownerRole: "Franchise Partner",
      primaryModule: "project",
      primaryAction: "Clear opening and portfolio work",
    };
  }

  if (role === "studio-manager") {
    return {
      key: "studio-continuation",
      label: "Studio continuation queue",
      ownerRole: "Studio Manager",
      primaryModule: "operations",
      primaryAction: "Review studio launch blockers",
    };
  }

  if (role === "crays-management" || role === "admin") {
    return {
      key: "portfolio-gates",
      label: "Portfolio gate oversight",
      ownerRole: role === "admin" ? "Admin" : "CRAYS Management",
      primaryModule: "analytics",
      primaryAction: "Inspect portfolio blockers",
    };
  }

  return {
    key: "prepared-deal-queue",
    label: "Prepared deal queue",
    ownerRole: "Deal Manager",
    primaryModule: "dashboard",
    primaryAction: "Open next prepared deal",
  };
}

function labelize(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Pending";
}

function scorePriority(score: number | null, blocked: number): QueuePriority {
  if (blocked > 0) return "critical";
  if (score === null || score < 70) return "high";
  if (score < 85) return "medium";
  return "low";
}

function caseHref(role: RoleKey, item: RealProductCase) {
  const params = new URLSearchParams({
    role,
    case: item.offerId,
    view: "case",
  });
  if (item.dealId) params.set("deal", item.dealId);
  if (item.propertyCaseId) params.set("propertyCase", item.propertyCaseId);
  return `/dashboard?${params.toString()}`;
}

function moduleHref(role: RoleKey, item: RealProductCase, moduleKey: QueueModuleKey) {
  if (moduleKey === "dashboard") return caseHref(role, item);

  const viewByModule: Record<Exclude<QueueModuleKey, "dashboard">, string> = {
    crm: "timeline",
    project: "board",
    erp: "finance-summary",
    files: "vault",
    analytics: "scorecards",
    loans: "package-readiness",
    operations: "handoff",
    support: "queue",
  };
  const recordByModule: Record<Exclude<QueueModuleKey, "dashboard">, string> = {
    crm: "opportunities",
    project: "all",
    erp: "all",
    files: "all",
    analytics: "all",
    loans: "all",
    operations: "opening",
    support: "all",
  };
  const params = new URLSearchParams({
    role,
    case: item.offerId,
    view: viewByModule[moduleKey],
    record: recordByModule[moduleKey],
  });
  if (item.dealId) params.set("deal", item.dealId);
  if (item.propertyCaseId) params.set("propertyCase", item.propertyCaseId);
  return `/${moduleKey}?${params.toString()}`;
}

function blockerFor(role: RoleKey, item: RealProductCase) {
  if (role === "expansion-manager") {
    if (!item.propertyCaseId) return "No property case attached.";
    if (item.scores.location === null) return "Location score missing.";
    return item.handoffStatus === "ready" ? "No owner handoff blocker." : "Owner handoff is not ready.";
  }

  if (role === "finance") {
    if (item.bankPackageStatus !== "ready") return "Bank package is not ready.";
    if (item.loanDecisionState !== "approved") return "Loan decision is not approved.";
    return "No bank package blocker.";
  }

  if (role === "reviewer") {
    return item.evidence.blockedReleaseGates > 0 ? `${item.evidence.blockedReleaseGates} release gates blocked.` : "No blocked release gates.";
  }

  if (role === "franchise-partner") {
    const readiness = item.scores.openingReadiness;
    if (readiness === null || readiness < 70) return "Opening readiness needs handoff detail.";
    if (item.evidence.approvedDocuments < item.evidence.documents) return "Opening documents still need review.";
    return "No opening blocker in this read model.";
  }

  if (role === "studio-manager") {
    const readiness = item.scores.openingReadiness;
    if (readiness === null || readiness < 70) return "Launch readiness and operations handoff are not complete.";
    if (item.toolSignals.project === 0) return "No opening work signal is mapped yet.";
    return "Studio continuation shell is ready for scoped operations review.";
  }

  if (role === "crays-management" || role === "admin") {
    return item.evidence.blockedReleaseGates > 0 ? `${item.evidence.blockedReleaseGates} gates need oversight.` : "No portfolio gate blocker.";
  }

  return item.evidence.blockedReleaseGates > 0 ? `${item.evidence.blockedReleaseGates} release gates blocked.` : item.nextAction;
}

function stateFor(role: RoleKey, item: RealProductCase) {
  if (role === "expansion-manager") return `${labelize(item.caseStatus)} property, ${labelize(item.handoffStatus)} handoff`;
  if (role === "finance") return `${labelize(item.bankPackageStatus)} package, ${labelize(item.loanDecisionState)} loan`;
  if (role === "reviewer") return `${item.evidence.readyReleaseGates} ready gates, ${item.evidence.blockedReleaseGates} blocked`;
  if (role === "franchise-partner") return item.scores.openingReadiness === null ? "Opening readiness pending" : `${item.scores.openingReadiness}% opening readiness`;
  if (role === "studio-manager") return item.scores.openingReadiness === null ? "Studio launch pending" : `${item.scores.openingReadiness}% launch readiness`;
  if (role === "crays-management" || role === "admin") return `${labelize(item.status)} deal, ${item.evidence.blockedReleaseGates} blocked gates`;
  return `${labelize(item.status)} deal, ${labelize(item.dealStage)} stage`;
}

function priorityFor(role: RoleKey, item: RealProductCase): QueuePriority {
  if (role === "finance") return scorePriority(item.scores.bankability, item.bankPackageStatus === "ready" ? 0 : 1);
  if (role === "expansion-manager") return scorePriority(item.scores.location, item.handoffStatus === "ready" ? 0 : 1);
  if (role === "franchise-partner") return scorePriority(item.scores.openingReadiness, item.scores.openingReadiness !== null && item.scores.openingReadiness >= 70 ? 0 : 1);
  if (role === "studio-manager") return scorePriority(item.scores.openingReadiness, item.toolSignals.project > 0 ? 0 : 1);
  return scorePriority(item.scores.bankability, item.evidence.blockedReleaseGates);
}

function objectLabelFor(role: RoleKey) {
  if (role === "expansion-manager") return "Property case";
  if (role === "finance") return "Bank package";
  if (role === "reviewer") return "Release gate";
  if (role === "franchise-partner") return "Opening case";
  if (role === "studio-manager") return "Studio launch case";
  if (role === "crays-management" || role === "admin") return "Portfolio case";
  return "Prepared deal";
}

function nextActionFor(role: RoleKey, item: RealProductCase) {
  if (role === "finance") return "Review bank package and finance blockers.";
  if (role === "expansion-manager") return "Review owner facts and location fit.";
  if (role === "reviewer") return "Review gate blockers and redaction state.";
  if (role === "franchise-partner") return "Open project handoff and clear opening work.";
  if (role === "studio-manager") return "Open operations handoff and review launch blockers.";
  if (role === "crays-management" || role === "admin") return "Inspect case risk and gate state.";
  return item.nextAction;
}

function workstreamFor(role: RoleKey, item: RealProductCase) {
  if (role === "expansion-manager") return "Property Supply";
  if (role === "finance") return "Bank Package Readiness";
  if (role === "reviewer") return "Release Gate Review";
  if (role === "franchise-partner" || role === "studio-manager") return "Opening Handoff";
  if (role === "crays-management" || role === "admin") return "Portfolio Oversight";
  if (item.evidence.dealEconomicsModels === 0) return "Deal Economics";
  if (item.bankPackageStatus !== "ready") return "Bank Package Readiness";
  return "Candidate Intent";
}

function commandModelFor(moduleKey: QueueModuleKey) {
  if (moduleKey === "crm") return "CRM activity command draft";
  if (moduleKey === "project") return "Project work item command draft";
  if (moduleKey === "erp") return "ERP finance command draft";
  if (moduleKey === "files") return "Files package command draft";
  if (moduleKey === "loans") return "Loans checklist command draft";
  if (moduleKey === "analytics") return "Analytics signal review command draft";
  if (moduleKey === "operations") return "Opening handoff command draft";
  if (moduleKey === "support") return "Support queue command draft";
  return "Case transition command draft";
}

function gateStateFor(role: RoleKey, item: RealProductCase) {
  if (item.evidence.blockedReleaseGates > 0) return `${item.evidence.blockedReleaseGates} release gates blocked`;
  if (role === "finance" && item.bankPackageStatus !== "ready") return "Bank package apply gate closed";
  if (role === "franchise-partner" || role === "studio-manager") return "Opening apply gate closed";
  return "Apply and release gates closed";
}

function changedLabel(updatedAt: string) {
  const updatedTime = Date.parse(updatedAt);
  if (!Number.isFinite(updatedTime)) return "Recently updated";

  const hours = Math.max(0, Math.round((Date.now() - updatedTime) / 36e5));
  if (hours < 1) return "Updated now";
  if (hours < 24) return `Updated ${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "Updated 1d ago";
  return `Updated ${days}d ago`;
}

function dueLabel(priority: QueuePriority) {
  if (priority === "critical") return "Today";
  if (priority === "high") return "Next";
  if (priority === "medium") return "This week";
  return "Monitor";
}

function rowIsBlocked(row: RoleHomeQueueRow) {
  const blocker = row.blocker.toLowerCase();
  return (
    row.priority === "critical" ||
    blocker.includes("blocked") ||
    blocker.includes("not ready") ||
    blocker.includes("missing") ||
    blocker.includes("pending")
  );
}

function rowNeedsReview(row: RoleHomeQueueRow) {
  const action = row.nextAction.toLowerCase();
  return row.objectLabel.toLowerCase().includes("gate") || action.includes("review") || row.gateState.toLowerCase().includes("blocked");
}

function rowWaitsOnGate(row: RoleHomeQueueRow) {
  const gate = row.gateState.toLowerCase();
  return gate.includes("gate") || gate.includes("release") || gate.includes("apply");
}

function buildBuckets(rows: RoleHomeQueueRow[]): RoleHomeQueueBucket[] {
  return [
    {
      key: "my_work",
      label: "My work",
      description: "All role-owned items in this queue.",
      count: rows.length,
    },
    {
      key: "blocked",
      label: "Blocked",
      description: "Items with blocked, missing or not-ready state.",
      count: rows.filter(rowIsBlocked).length,
    },
    {
      key: "due_soon",
      label: "Due soon",
      description: "Critical and high-priority work.",
      count: rows.filter((row) => row.priority === "critical" || row.priority === "high").length,
    },
    {
      key: "needs_review",
      label: "Needs review",
      description: "Items that require operator or reviewer judgment.",
      count: rows.filter(rowNeedsReview).length,
    },
    {
      key: "waiting_on_gate",
      label: "Waiting on gate",
      description: "Items held by apply or release gates.",
      count: rows.filter(rowWaitsOnGate).length,
    },
  ];
}

function buildRows(role: RoleKey, cases: RealProductCase[]): RoleHomeQueueRow[] {
  const profile = queueProfile(role);
  return cases.slice(0, 12).map((item) => {
    const priority = priorityFor(role, item);
    const moduleSignals =
      item.toolSignals.project +
      item.toolSignals.crm +
      item.toolSignals.files +
      item.toolSignals.erp +
      item.toolSignals.analytics +
      item.toolSignals.loans;
    return {
      id: `${role}:${item.offerId}`,
      preparedOfferId: item.offerId,
      dealId: item.dealId,
      propertyCaseId: item.propertyCaseId,
      title: item.title,
      market: item.market,
      objectLabel: objectLabelFor(role),
      state: stateFor(role, item),
      priority,
      ownerRole: profile.ownerRole,
      workstream: workstreamFor(role, item),
      blocker: blockerFor(role, item),
      dueLabel: dueLabel(priority),
      nextAction: nextActionFor(role, item),
      changedLabel: changedLabel(item.updatedAt),
      gateState: gateStateFor(role, item),
      commandModel: commandModelFor(profile.primaryModule),
      evidenceSummary: {
        evidencePackages: item.evidence.packages,
        documents: item.evidence.documents,
        approvedDocuments: item.evidence.approvedDocuments,
        blockedGates: item.evidence.blockedReleaseGates,
        moduleSignals,
      },
      caseHref: caseHref(role, item),
      primaryModule: profile.primaryModule,
      primaryModuleLabel: moduleLabels[profile.primaryModule],
      primaryModuleHref: moduleHref(role, item, profile.primaryModule),
      updatedAt: item.updatedAt,
    };
  });
}

function emptyReadModel(role: RoleKey, allowed: boolean, queryStatus: RoleHomeQueuesReadModel["queryStatus"]): RoleHomeQueuesReadModel {
  return {
    access: {
      role,
      allowed,
      level: allowed ? "role_home_queue" : "forbidden",
    },
    roleQueue: queueProfile(role),
    workBuckets: [],
    summary: {
      rows: 0,
      critical: 0,
      high: 0,
      blocked: 0,
      moduleDeepLinks: 0,
    },
    rows: [],
    boundaries: boundaries(),
    queryStatus,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

export async function getRoleHomeQueuesReadModel(role: RoleKey): Promise<RoleHomeQueuesReadModel> {
  if (!allowedQueueRoles.includes(role)) return emptyReadModel(role, false, "forbidden");

  const realProduct = await getRealProductReadModel(role);
  if (!realProduct.configured) return emptyReadModel(role, true, "not_configured");

  const rows = buildRows(role, realProduct.cases);
  const workBuckets = buildBuckets(rows);
  return {
    access: {
      role,
      allowed: true,
      level: "role_home_queue",
    },
    roleQueue: queueProfile(role),
    workBuckets,
    summary: {
      rows: rows.length,
      critical: rows.filter((row) => row.priority === "critical").length,
      high: rows.filter((row) => row.priority === "high").length,
      blocked: rows.filter(rowIsBlocked).length,
      moduleDeepLinks: rows.length,
    },
    rows,
    boundaries: boundaries(),
    queryStatus: "schema_ready",
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
