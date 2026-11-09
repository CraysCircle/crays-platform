import { getManagementGateReviewReadModel } from "./management-gate-review-read-model-repository";
import { getSyncPerformanceReadModel } from "./sync-performance-read-model-repository";
import type { RoleKey } from "@/lib/roles";

type AdapterPolicyLevel = "internal_adapter_policy" | "scoped_adapter_policy" | "forbidden";
type AdapterPolicyState = "source_ready" | "draft_ready" | "review_required" | "coverage_required";

const internalRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedRoles: RoleKey[] = ["deal-manager", "expansion-manager", "finance", "studio-manager"];

const modulePolicy: Record<
  string,
  {
    label: string;
    ownerRole: string;
    preservedFunction: string;
    craysOrchestration: string;
    draftAction: string;
    rollbackPolicy: string;
    gateReview: string;
  }
> = {
  crm: {
    label: "CRM",
    ownerRole: "Deal Manager",
    preservedFunction: "Relationships, companies, people, opportunities and follow-up tasks remain source-owned.",
    craysOrchestration: "CRAYS stages relationship updates as Core command drafts with role scope and audit.",
    draftAction: "Stage CRM activity or relationship update",
    rollbackPolicy: "Supersede or cancel before any future CRM apply.",
    gateReview: "CRM activity apply review",
  },
  project: {
    label: "Project",
    ownerRole: "Expansion Manager",
    preservedFunction: "Opening projects, work items, milestones and dependencies remain source-owned.",
    craysOrchestration: "CRAYS stages work-item drafts and keeps handoff history in Core.",
    draftAction: "Stage project work item",
    rollbackPolicy: "Supersede or cancel before any future Project apply.",
    gateReview: "Project work item apply review",
  },
  erp: {
    label: "ERP",
    ownerRole: "Finance",
    preservedFunction: "Finance accounts, budgets, invoices and cost-center data remain source-owned.",
    craysOrchestration: "CRAYS stages finance review commands and blocks posting/export actions.",
    draftAction: "Stage finance review",
    rollbackPolicy: "Supersede or cancel before any finance write or accounting export.",
    gateReview: "ERP finance apply review",
  },
  files: {
    label: "Files",
    ownerRole: "Reviewer",
    preservedFunction: "Document metadata, packages, grants and redactions remain governed by Files.",
    craysOrchestration: "CRAYS stages package/grant reviews without file bodies, uploads or releases.",
    draftAction: "Stage document package review",
    rollbackPolicy: "Supersede or cancel before any file apply, upload or release.",
    gateReview: "Files package apply review",
  },
  loans: {
    label: "Loans",
    ownerRole: "Finance",
    preservedFunction: "Bank packages, loan cases, conditions and covenants remain source-owned.",
    craysOrchestration: "CRAYS stages checklist reviews and keeps bank sends/payment actions closed.",
    draftAction: "Stage bank package checklist",
    rollbackPolicy: "Supersede or cancel before bank send, lender release or payment step.",
    gateReview: "Loans checklist apply review",
  },
  operations: {
    label: "Operations",
    ownerRole: "Studio Manager",
    preservedFunction: "Member App profiles, bookings, trainer schedules and support requests remain source-owned.",
    craysOrchestration: "CRAYS stages operating recovery actions and connects them to command history.",
    draftAction: "Stage studio action",
    rollbackPolicy: "Supersede or cancel before any Operations apply or member-facing send.",
    gateReview: "Operations action apply review",
  },
  analytics: {
    label: "Analytics",
    ownerRole: "CRAYS Management",
    preservedFunction: "KPI snapshots and risk signals remain projection-owned.",
    craysOrchestration: "CRAYS links KPI drilldowns to Core records, exceptions and command history.",
    draftAction: "Stage metric review",
    rollbackPolicy: "Supersede or cancel before any published reporting workflow.",
    gateReview: "Analytics publish review",
  },
  hr: {
    label: "HR",
    ownerRole: "CRAYS HR",
    preservedFunction: "Staffing, shifts and hiring records remain HR-source projections.",
    craysOrchestration: "CRAYS stages staffing reviews and keeps employment-system writes closed.",
    draftAction: "Stage staffing review",
    rollbackPolicy: "Supersede or cancel before any HR source update.",
    gateReview: "HR source update review",
  },
  learning: {
    label: "Learning",
    ownerRole: "CRAYS Management",
    preservedFunction: "Training paths, events, certifications and knowledge base records remain learning-source projections.",
    craysOrchestration: "CRAYS stages learning-path reviews and keeps publication/apply closed.",
    draftAction: "Stage learning path review",
    rollbackPolicy: "Supersede or cancel before any Learning source update.",
    gateReview: "Learning source update review",
  },
  support: {
    label: "Support",
    ownerRole: "Reviewer",
    preservedFunction: "Tickets, service threads and service-level records remain support-source projections.",
    craysOrchestration: "CRAYS stages service reviews and keeps external replies closed.",
    draftAction: "Stage support review",
    rollbackPolicy: "Supersede or cancel before any external support reply or source update.",
    gateReview: "Support source update review",
  },
  sync: {
    label: "Sync",
    ownerRole: "Admin",
    preservedFunction: "Source maps, sync jobs and workflow events remain Core-owned.",
    craysOrchestration: "CRAYS monitors freshness, idempotency and apply gates without running sync apply.",
    draftAction: "Stage sync review",
    rollbackPolicy: "Supersede or cancel before any sync apply workflow.",
    gateReview: "Sync apply review",
  },
};

export type AdapterBidirectionalPolicyItem = {
  moduleKey: string;
  label: string;
  ownerRole: string;
  state: AdapterPolicyState;
  sourceMaps: number;
  commandDrafts: number;
  sourceReadEnabled: boolean;
  commandDraftEnabled: boolean;
  preflightRequired: true;
  targetApplyEnabled: false;
  sourceWriteEnabled: false;
  syncApplyEnabled: false;
  externalSendingEnabled: false;
  destructiveApplyEnabled: false;
  idempotencyRule: string;
  preservedFunction: string;
  craysOrchestration: string;
  draftAction: string;
  rollbackPolicy: string;
  gateReview: string;
  nextAction: string;
};

export type AdapterBidirectionalPolicyReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AdapterPolicyLevel;
    reason: string;
  };
  summary: {
    modules: number;
    sourceReady: number;
    draftReady: number;
    reviewRequired: number;
    coverageRequired: number;
    sourceMaps: number;
    commandDrafts: number;
    targetApplyEnabled: false;
    sourceWriteEnabled: false;
    syncApplyEnabled: false;
  };
  policyItems: AdapterBidirectionalPolicyItem[];
  queueBridge: {
    commandQueueReady: boolean;
    applyBlockedCommands: number;
    modulesWithCommands: number;
  };
  boundaries: {
    sourceReadsEnabled: true;
    commandDraftsEnabled: true;
    targetApplyEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    destructiveApplyEnabled: false;
    uploadsEnabled: false;
    externalSendingEnabled: false;
    publicReleaseEnabled: false;
    paymentInitiationEnabled: false;
    bankActionsEnabled: false;
    liveAiEnabled: false;
    productionDeployEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

function accessForRole(role: RoleKey): AdapterBidirectionalPolicyReadModel["access"] {
  if (internalRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "internal_adapter_policy",
      reason: "Role can inspect cross-module read/write policy, Core command queue binding and closed apply boundaries.",
    };
  }
  if (scopedRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "scoped_adapter_policy",
      reason: "Role can inspect module-safe adapter policy without raw source payloads or apply controls.",
    };
  }
  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Adapter policy requires internal or scoped operating access.",
  };
}

function stateFor(sourceMaps: number, minimumMaps: number, commandDrafts: number, commandDraftEnabled: boolean): AdapterPolicyState {
  if (sourceMaps === 0 && minimumMaps > 0) return "coverage_required";
  if (commandDrafts > 0) return "review_required";
  if (commandDraftEnabled) return "draft_ready";
  return "source_ready";
}

function nextActionFor(state: AdapterPolicyState, commandDrafts: number, draftAction: string) {
  if (state === "coverage_required") return "Bind realistic source maps before staging write drafts.";
  if (commandDrafts > 0) return "Review the Apply Queue and rollback policy before any future approval.";
  return `${draftAction}; keep target/source/sync apply closed.`;
}

function boundaries(): AdapterBidirectionalPolicyReadModel["boundaries"] {
  return {
    sourceReadsEnabled: true,
    commandDraftsEnabled: true,
    targetApplyEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    destructiveApplyEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    paymentInitiationEnabled: false,
    bankActionsEnabled: false,
    liveAiEnabled: false,
    productionDeployEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

export async function getAdapterBidirectionalPolicyReadModel(role: RoleKey): Promise<AdapterBidirectionalPolicyReadModel> {
  const access = accessForRole(role);
  if (!access.allowed) {
    return {
      access,
      summary: {
        modules: 0,
        sourceReady: 0,
        draftReady: 0,
        reviewRequired: 0,
        coverageRequired: 0,
        sourceMaps: 0,
        commandDrafts: 0,
        targetApplyEnabled: false,
        sourceWriteEnabled: false,
        syncApplyEnabled: false,
      },
      policyItems: [],
      queueBridge: { commandQueueReady: false, applyBlockedCommands: 0, modulesWithCommands: 0 },
      boundaries: boundaries(),
    };
  }

  const [syncPerformance, commandQueue] = await Promise.all([getSyncPerformanceReadModel(role), getManagementGateReviewReadModel("reviewer")]);
  const commandCountByModule = new Map(commandQueue.moduleBreakdown.map((item) => [item.module.toLowerCase(), item.count]));

  const policyItems = syncPerformance.modules.map((module) => {
    const policy = modulePolicy[module.moduleKey] ?? {
      label: module.label,
      ownerRole: module.ownerRole,
      preservedFunction: "Source-owned records remain in the connected system.",
      craysOrchestration: "CRAYS stages review, command history and audit in Core.",
      draftAction: "Stage review",
      rollbackPolicy: "Supersede or cancel before any future apply.",
      gateReview: "Apply review",
    };
    const commandDrafts = commandCountByModule.get(module.label.toLowerCase()) ?? commandCountByModule.get(module.moduleKey) ?? 0;
    const commandDraftEnabled = module.moduleKey !== "sync";
    const state = stateFor(module.sourceMaps, module.minimumMaps, commandDrafts, commandDraftEnabled);
    return {
      moduleKey: module.moduleKey,
      label: policy.label,
      ownerRole: policy.ownerRole,
      state,
      sourceMaps: module.sourceMaps,
      commandDrafts,
      sourceReadEnabled: module.sourceMaps > 0 || module.minimumMaps === 0,
      commandDraftEnabled,
      preflightRequired: true,
      targetApplyEnabled: false,
      sourceWriteEnabled: false,
      syncApplyEnabled: false,
      externalSendingEnabled: false,
      destructiveApplyEnabled: false,
      idempotencyRule: `${module.moduleKey}:object:action:role:v1`,
      preservedFunction: policy.preservedFunction,
      craysOrchestration: policy.craysOrchestration,
      draftAction: policy.draftAction,
      rollbackPolicy: policy.rollbackPolicy,
      gateReview: policy.gateReview,
      nextAction: nextActionFor(state, commandDrafts, policy.draftAction),
    } satisfies AdapterBidirectionalPolicyItem;
  });

  return {
    access,
    summary: {
      modules: policyItems.length,
      sourceReady: policyItems.filter((item) => item.state === "source_ready").length,
      draftReady: policyItems.filter((item) => item.state === "draft_ready").length,
      reviewRequired: policyItems.filter((item) => item.state === "review_required").length,
      coverageRequired: policyItems.filter((item) => item.state === "coverage_required").length,
      sourceMaps: policyItems.reduce((total, item) => total + item.sourceMaps, 0),
      commandDrafts: policyItems.reduce((total, item) => total + item.commandDrafts, 0),
      targetApplyEnabled: false,
      sourceWriteEnabled: false,
      syncApplyEnabled: false,
    },
    policyItems,
    queueBridge: {
      commandQueueReady: commandQueue.queryStatus === "schema_ready",
      applyBlockedCommands: commandQueue.summary.applyBlocked,
      modulesWithCommands: commandQueue.summary.modules,
    },
    boundaries: boundaries(),
  };
}
