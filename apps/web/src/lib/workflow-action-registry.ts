import type { CaseWorkspaceReadModel, CaseWorkspaceSection } from "@/db/case-workspace-read-model-repository";
import type { RoleKey } from "@/lib/roles";

export type WorkflowActionKey =
  | "resolve-blocker"
  | "review-evidence"
  | "request-finance-review"
  | "prepare-bank-package"
  | "stage-room-preflight"
  | "create-opening-handoff";

export type WorkflowActionCommandKind = "project-work-item" | "files-package" | "erp-finance" | "loans-checklist";
export type WorkflowActionPreflightStatus = "ready" | "attention" | "blocked";

export type WorkflowActionSpec = {
  key: WorkflowActionKey;
  label: string;
  shortLabel: string;
  description: string;
  journeySegment: string;
  moduleLabel: "Project" | "Files" | "ERP" | "Loans";
  commandKind: WorkflowActionCommandKind;
  applyGate: string;
  allowedRoles: RoleKey[];
  sectionKeys: CaseWorkspaceSection["key"][];
  rank: number;
  auditEvent: string;
  rollbackNote: string;
  closedGates: string[];
};

export type WorkflowActionReadModelItem = WorkflowActionSpec & {
  roleAllowed: boolean;
  preflightStatus: WorkflowActionPreflightStatus;
  preflightSummary: string;
  blockers: string[];
  nextAction: string;
};

export type WorkflowActionRegistryReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: "workflow_action_registry" | "forbidden";
  };
  case: {
    preparedOfferId: string;
    dealId: string | null;
    propertyCaseId: string | null;
    title: string;
    market: string;
    blockedSections: number;
    commandDrafts: number;
  } | null;
  recommendedActionKey: WorkflowActionKey | null;
  actions: WorkflowActionReadModelItem[];
  boundaries: {
    targetApplyEnabled: false;
    releaseEnabled: false;
    uploadEnabled: false;
    externalSendingEnabled: false;
    financeWritesEnabled: false;
    bankSendsEnabled: false;
    paymentInitiationEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "not_found" | "forbidden";
  secretsReturned: false;
  privateKeysReturned: false;
};

const workflowActionSpecs: WorkflowActionSpec[] = [
  {
    key: "resolve-blocker",
    label: "Resolve blocker",
    shortLabel: "blocker resolution",
    description: "Stage the next internal work item for the highest case blocker.",
    journeySegment: "Case execution",
    moduleLabel: "Project",
    commandKind: "project-work-item",
    applyGate: "OPEN_DEV_PROJECT_WORK_ITEM_APPLY",
    allowedRoles: ["deal-manager", "reviewer", "franchise-partner", "studio-manager", "admin", "crays-management"],
    sectionKeys: ["evidence", "candidate", "files", "opening"],
    rank: 10,
    auditEvent: "workflow.action.resolve_blocker_requested",
    rollbackNote: "Cancel or supersede this work-item draft before any future Project apply.",
    closedGates: ["Project apply", "External send", "Release"],
  },
  {
    key: "review-evidence",
    label: "Review evidence",
    shortLabel: "evidence review",
    description: "Stage an internal evidence and package visibility review.",
    journeySegment: "Location Evidence",
    moduleLabel: "Files",
    commandKind: "files-package",
    applyGate: "OPEN_DEV_FILES_PACKAGE_APPLY",
    allowedRoles: ["deal-manager", "finance", "reviewer", "admin", "crays-management"],
    sectionKeys: ["evidence", "files"],
    rank: 20,
    auditEvent: "workflow.action.review_evidence_requested",
    rollbackNote: "Cancel or supersede this package draft before any future file apply, upload or release.",
    closedGates: ["Files apply", "Upload", "Release"],
  },
  {
    key: "request-finance-review",
    label: "Request finance review",
    shortLabel: "finance review",
    description: "Stage a finance summary review over the active deal economics.",
    journeySegment: "Deal Economics",
    moduleLabel: "ERP",
    commandKind: "erp-finance",
    applyGate: "OPEN_DEV_ERP_FINANCE_APPLY",
    allowedRoles: ["finance", "deal-manager", "reviewer", "admin", "crays-management", "franchise-partner"],
    sectionKeys: ["economics"],
    rank: 30,
    auditEvent: "workflow.action.finance_review_requested",
    rollbackNote: "Cancel or supersede this finance draft before any future finance write or accounting export.",
    closedGates: ["Finance write", "Accounting export", "Bank send"],
  },
  {
    key: "prepare-bank-package",
    label: "Prepare bank package",
    shortLabel: "bank package",
    description: "Stage a bank-readiness checklist review without bank sending.",
    journeySegment: "Bank Package Readiness",
    moduleLabel: "Loans",
    commandKind: "loans-checklist",
    applyGate: "OPEN_DEV_LOANS_CHECKLIST_APPLY",
    allowedRoles: ["finance", "deal-manager", "reviewer", "admin", "crays-management"],
    sectionKeys: ["bank", "files"],
    rank: 40,
    auditEvent: "workflow.action.bank_package_requested",
    rollbackNote: "Cancel or supersede this checklist draft before any future bank send, lender release or payment step.",
    closedGates: ["Loans apply", "Bank send", "Payment", "Release"],
  },
  {
    key: "stage-room-preflight",
    label: "Stage room preflight",
    shortLabel: "room preflight",
    description: "Stage internal preflight for Candidate, Owner, Bank and Partner room scope.",
    journeySegment: "Controlled Release",
    moduleLabel: "Files",
    commandKind: "files-package",
    applyGate: "OPEN_DEV_FILES_PACKAGE_APPLY",
    allowedRoles: ["deal-manager", "reviewer", "admin", "crays-management"],
    sectionKeys: ["candidate", "bank", "files", "evidence"],
    rank: 50,
    auditEvent: "workflow.action.room_preflight_requested",
    rollbackNote: "Cancel or supersede this preflight draft before any room release or external share.",
    closedGates: ["Candidate release", "Owner release", "Bank release", "Partner release", "External send"],
  },
  {
    key: "create-opening-handoff",
    label: "Create opening handoff",
    shortLabel: "opening handoff",
    description: "Stage internal opening work for franchise partner and studio continuation.",
    journeySegment: "Opening Handoff",
    moduleLabel: "Project",
    commandKind: "project-work-item",
    applyGate: "OPEN_DEV_PROJECT_WORK_ITEM_APPLY",
    allowedRoles: ["deal-manager", "franchise-partner", "studio-manager", "admin", "crays-management"],
    sectionKeys: ["opening"],
    rank: 60,
    auditEvent: "workflow.action.opening_handoff_requested",
    rollbackNote: "Cancel or supersede this opening handoff draft before any future Project apply or external notification.",
    closedGates: ["Project apply", "External send", "Release"],
  },
];

function boundaries(): WorkflowActionRegistryReadModel["boundaries"] {
  return {
    targetApplyEnabled: false,
    releaseEnabled: false,
    uploadEnabled: false,
    externalSendingEnabled: false,
    financeWritesEnabled: false,
    bankSendsEnabled: false,
    paymentInitiationEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
  };
}

function sectionMap(sections: CaseWorkspaceSection[]) {
  return new Map(sections.map((section) => [section.key, section]));
}

function preflightForAction(spec: WorkflowActionSpec, workspace: CaseWorkspaceReadModel, role: RoleKey) {
  if (!workspace.case) {
    return {
      roleAllowed: false,
      preflightStatus: "blocked" as const,
      preflightSummary: "No case loaded.",
      blockers: ["Open a prepared deal case before staging workflow actions."],
      nextAction: "Open Work Queue",
    };
  }

  const roleAllowed = spec.allowedRoles.includes(role);
  const sections = sectionMap(workspace.sections);
  const scopedSections = spec.sectionKeys.map((key) => sections.get(key)).filter((section): section is CaseWorkspaceSection => Boolean(section));
  const blockedSections = scopedSections.filter((section) => section.status === "blocked");
  const missingSections = spec.sectionKeys.filter((key) => !sections.has(key));
  const blockers = [
    ...missingSections.map((key) => `${key} section is missing.`),
    ...blockedSections.map((section) => `${section.label}: ${section.blocker}`),
  ];

  if (!roleAllowed) {
    return {
      roleAllowed,
      preflightStatus: "blocked" as const,
      preflightSummary: "Role cannot stage this workflow action.",
      blockers: ["Role is read-only for this action."],
      nextAction: "Choose a role-owned action.",
    };
  }

  if (missingSections.length > 0) {
    return {
      roleAllowed,
      preflightStatus: "blocked" as const,
      preflightSummary: "Required case sections are missing.",
      blockers,
      nextAction: "Refresh case workspace.",
    };
  }

  if (blockedSections.length > 0) {
    return {
      roleAllowed,
      preflightStatus: "attention" as const,
      preflightSummary: `${blockedSections.length} related section${blockedSections.length === 1 ? "" : "s"} need attention.`,
      blockers,
      nextAction: blockedSections[0]?.nextAction ?? workspace.case.nextAction,
    };
  }

  return {
    roleAllowed,
    preflightStatus: "ready" as const,
    preflightSummary: "Preflight ready for internal command draft.",
    blockers,
    nextAction: scopedSections[0]?.nextAction ?? workspace.case.nextAction,
  };
}

export function getWorkflowActionSpec(actionKey: string): WorkflowActionSpec | null {
  return workflowActionSpecs.find((spec) => spec.key === actionKey) ?? null;
}

export function getWorkflowActionSpecs() {
  return workflowActionSpecs;
}

export function buildWorkflowActionRegistryReadModel(workspace: CaseWorkspaceReadModel, role: RoleKey): WorkflowActionRegistryReadModel {
  const actions = workflowActionSpecs
    .map((spec) => {
      const preflight = preflightForAction(spec, workspace, role);
      return { ...spec, ...preflight };
    })
    .sort((a, b) => {
      if (a.roleAllowed !== b.roleAllowed) return a.roleAllowed ? -1 : 1;
      if (a.preflightStatus !== b.preflightStatus) {
        const order: Record<WorkflowActionPreflightStatus, number> = { attention: 0, ready: 1, blocked: 2 };
        return order[a.preflightStatus] - order[b.preflightStatus];
      }
      return a.rank - b.rank;
    });

  const recommendedAction = actions.find((action) => action.roleAllowed && action.preflightStatus !== "blocked") ?? null;

  return {
    access: {
      role,
      allowed: workspace.access.allowed,
      level: workspace.access.allowed ? "workflow_action_registry" : "forbidden",
    },
    case: workspace.case
      ? {
          preparedOfferId: workspace.case.preparedOfferId,
          dealId: workspace.case.dealId,
          propertyCaseId: workspace.case.propertyCaseId,
          title: workspace.case.title,
          market: workspace.case.market,
          blockedSections: workspace.summary.blockedSections,
          commandDrafts: workspace.summary.commandDrafts,
        }
      : null,
    recommendedActionKey: recommendedAction?.key ?? null,
    actions,
    boundaries: boundaries(),
    queryStatus: workspace.queryStatus,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

export function workflowActionIdempotencyKey(actionKey: WorkflowActionKey, preparedOfferId: string, role: RoleKey) {
  return `workflow-action:${actionKey}:${preparedOfferId}:${role}:v1`;
}
