import type { ProjectNativeOperabilityReadModel, ProjectNativeWorkItem } from "./project-native-operability-read-model";
import type { RoleKey } from "./roles";

const internalOpeningHandoffRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance"];
const scopedOpeningHandoffRoles: RoleKey[] = ["franchise-partner", "landlord", "vendor", "studio-manager"];

type OpeningHandoffAccessLevel = "internal_opening_handoff_control" | "partner_handoff_workspace" | "stakeholder_scoped_shell" | "forbidden";
type OpeningHandoffStatus = "ready" | "model_ready" | "in_progress" | "decision_required" | "blocked" | "locked";
type OpeningHandoffFunctionState = "represented" | "deferred_until_exact_gate";

export type OpeningHandoffPilotAccess = {
  allowed: boolean;
  level: OpeningHandoffAccessLevel;
  reason: string;
};

export type OpeningHandoffPilotBoundary = {
  coreDevPilotDataAllowed: true;
  projectWorkbenchReadsEnabled: true;
  openingHandoffShellEnabled: true;
  partnerWorkspaceEnabled: boolean;
  stakeholderShellEnabled: boolean;
  localDraftEditsEnabled: true;
  projectWorkItemCommandsModeled: true;
  operationsTaskCommandsModeled: true;
  filesPackageCommandsModeled: true;
  projectCreationEnabled: false;
  workItemWriteEnabled: false;
  operationsWriteEnabled: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  toolApplyEnabled: false;
  fileUploadEnabled: false;
  externalSendingEnabled: false;
  candidateReleaseEnabled: false;
  bankReleaseEnabled: false;
  publicReleaseEnabled: false;
  financeWritesEnabled: false;
  paymentInitiationEnabled: false;
  liveProviderCallsEnabled: false;
  liveAiCallsEnabled: false;
  productionDeployEnabled: false;
  vpsChangingWorkEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type OpeningHandoffPilotMilestone = {
  key: string;
  label: string;
  status: OpeningHandoffStatus;
  ownerRole: RoleKey;
  current: string;
  nextAction: string;
};

export type OpeningHandoffPilotAction = {
  key: string;
  label: string;
  ownerRole: RoleKey;
  moduleSurface: "Project" | "Operations" | "Files" | "CRM" | "Learning" | "Support";
  commandBoundary: string;
  guardedRoute: string;
  status: OpeningHandoffStatus;
  nextAction: string;
  closedGate: string;
};

export type OpeningHandoffPilotReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: OpeningHandoffPilotAccess;
  blockRange: "Blocks 671-680";
  journeySegment: "Opening Handoff";
  ownerRoles: RoleKey[];
  consumingRoles: RoleKey[];
  summary: {
    projectWorkItems: number;
    openingHandoffItems: number;
    highPriorityItems: number;
    blockedItems: number;
    cycles: number;
    modules: number;
    pages: number;
    savedViews: number;
    milestones: number;
    handoffActions: number;
    modelReadyActions: number;
    readinessGates: number;
    readyGates: number;
    visibleSurfaces: number;
    preservedFunctions: number;
    openSideEffectGates: 0;
    projectRecordsReturned: boolean;
  };
  milestones: OpeningHandoffPilotMilestone[];
  handoffActions: OpeningHandoffPilotAction[];
  workItems: Array<Pick<ProjectNativeWorkItem, "id" | "identifier" | "title" | "state" | "priority" | "lead" | "assignees" | "dueDate" | "modules" | "blockedBy">>;
  visibleSurfaces: Array<{
    surface: string;
    roleUse: string;
  }>;
  preservedFunctions: Array<{
    key: string;
    label: string;
    state: OpeningHandoffFunctionState;
  }>;
  gates: Array<{
    key: string;
    label: string;
    ready: boolean;
    current: string;
  }>;
  nextBlockInputs: Array<{
    blockRange: string;
    requiredInput: string;
  }>;
  boundaries: OpeningHandoffPilotBoundary;
  liveBusinessRecordsReturned: boolean;
  workItemsWritten: false;
  operationsTasksWritten: false;
  externalNotificationsSent: false;
};

export function openingHandoffPilotAccessForRole(role: RoleKey): OpeningHandoffPilotAccess {
  if (internalOpeningHandoffRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_opening_handoff_control",
      reason: "Role can coordinate opening handoff readiness, work items, dependencies and stakeholder scopes before external actions.",
    };
  }

  if (role === "franchise-partner") {
    return {
      allowed: true,
      level: "partner_handoff_workspace",
      reason: "Role can work the scoped opening handoff workspace without internal finance, bank or release records.",
    };
  }

  if (scopedOpeningHandoffRoles.includes(role)) {
    return {
      allowed: true,
      level: "stakeholder_scoped_shell",
      reason: "Role can see assigned handoff shell and next actions only; no unscoped project or finance data is returned.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Opening Handoff pilot requires internal, partner or assigned stakeholder scope.",
  };
}

export function openingHandoffPilotBoundary(access: OpeningHandoffPilotAccess): OpeningHandoffPilotBoundary {
  return {
    coreDevPilotDataAllowed: true,
    projectWorkbenchReadsEnabled: true,
    openingHandoffShellEnabled: true,
    partnerWorkspaceEnabled: access.level === "partner_handoff_workspace",
    stakeholderShellEnabled: access.level === "stakeholder_scoped_shell",
    localDraftEditsEnabled: true,
    projectWorkItemCommandsModeled: true,
    operationsTaskCommandsModeled: true,
    filesPackageCommandsModeled: true,
    projectCreationEnabled: false,
    workItemWriteEnabled: false,
    operationsWriteEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    fileUploadEnabled: false,
    externalSendingEnabled: false,
    candidateReleaseEnabled: false,
    bankReleaseEnabled: false,
    publicReleaseEnabled: false,
    financeWritesEnabled: false,
    paymentInitiationEnabled: false,
    liveProviderCallsEnabled: false,
    liveAiCallsEnabled: false,
    productionDeployEnabled: false,
    vpsChangingWorkEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function visibleSurfaces(access: OpeningHandoffPilotAccess): OpeningHandoffPilotReadiness["visibleSurfaces"] {
  if (access.level === "stakeholder_scoped_shell") {
    return [
      { surface: "Project", roleUse: "Assigned stakeholder work items and milestone state." },
      { surface: "Files", roleUse: "Required documents remain gated before upload or external send." },
    ];
  }

  if (access.level === "partner_handoff_workspace") {
    return [
      { surface: "Project", roleUse: "Franchise Partner sees opening tasks, milestones and dependencies." },
      { surface: "Operations", roleUse: "Launch readiness queue and studio setup state." },
      { surface: "Learning", roleUse: "Training tasks and readiness path." },
      { surface: "Support", roleUse: "Launch blockers and escalation queue." },
    ];
  }

  return [
    { surface: "Project", roleUse: "Deal Manager and Operations coordinate work items, cycles, modules and pages." },
    { surface: "Operations", roleUse: "Launch readiness, studio tasks, vendor dependencies and escalation." },
    { surface: "Files", roleUse: "Opening documents and package references remain gated." },
    { surface: "CRM", roleUse: "Deal Manager links Candidate and partner context into handoff." },
    { surface: "Learning", roleUse: "Partner onboarding and launch training readiness." },
    { surface: "Support", roleUse: "Support handoff and post-opening escalation readiness." },
  ];
}

function preservedFunctions(): OpeningHandoffPilotReadiness["preservedFunctions"] {
  return [
    { key: "work-items", label: "Opening work items, owners, states, priorities and dependencies", state: "represented" },
    { key: "cycles-modules", label: "Cycles, modules, saved views and timeline planning", state: "represented" },
    { key: "pages", label: "Opening playbook pages and scoped decision notes", state: "represented" },
    { key: "partner-workspace", label: "Franchise Partner handoff workspace", state: "represented" },
    { key: "stakeholder-scopes", label: "Landlord, vendor and studio stakeholder shells", state: "represented" },
    { key: "command-models", label: "Project, Operations and Files command models", state: "represented" },
    { key: "tool-apply", label: "Tool apply, uploads, external notifications and release execution", state: "deferred_until_exact_gate" },
  ];
}

function milestones(input: {
  openingHandoffItems: number;
  highPriorityItems: number;
  blockedItems: number;
  pages: number;
  coreCommandStoreReady: boolean;
}): OpeningHandoffPilotReadiness["milestones"] {
  return [
    {
      key: "handoff-case-created",
      label: "Opening handoff case",
      status: input.openingHandoffItems > 0 ? "ready" : "model_ready",
      ownerRole: "deal-manager",
      current: `${input.openingHandoffItems} opening handoff work items`,
      nextAction: "Keep partner scope explicit before any external release.",
    },
    {
      key: "critical-path",
      label: "Critical path review",
      status: input.highPriorityItems > 0 ? "in_progress" : "ready",
      ownerRole: "deal-manager",
      current: `${input.highPriorityItems} high-priority project items`,
      nextAction: "Review blockers and due dates in Project.",
    },
    {
      key: "blocked-dependencies",
      label: "Blocked dependencies",
      status: input.blockedItems > 0 ? "blocked" : "ready",
      ownerRole: "expansion-manager",
      current: `${input.blockedItems} blocked or dependency-bound items`,
      nextAction: "Assign owner and keep external messages gated.",
    },
    {
      key: "partner-readiness",
      label: "Partner readiness",
      status: input.openingHandoffItems > 0 ? "in_progress" : "model_ready",
      ownerRole: "franchise-partner",
      current: "Partner workspace can stage local updates only.",
      nextAction: "Prepare scoped launch checklist without tool apply.",
    },
    {
      key: "opening-playbook",
      label: "Opening playbook",
      status: input.pages > 0 ? "model_ready" : "decision_required",
      ownerRole: "reviewer",
      current: `${input.pages} project pages available`,
      nextAction: "Review visibility before partner publishing.",
    },
    {
      key: "command-readiness",
      label: "Command readiness",
      status: input.coreCommandStoreReady ? "model_ready" : "decision_required",
      ownerRole: "admin",
      current: input.coreCommandStoreReady ? "Command store ready; apply gates closed." : "Command store pending.",
      nextAction: "Keep Project and Operations writes staged only.",
    },
  ];
}

function handoffActions(input: { coreCommandStoreReady: boolean; blockedItems: number }): OpeningHandoffPilotReadiness["handoffActions"] {
  return [
    {
      key: "stage-project-work-item",
      label: "Stage opening work item",
      ownerRole: "deal-manager",
      moduleSurface: "Project",
      commandBoundary: "project.work_item.stage",
      guardedRoute: "/api/crays/core-command/project-work-item",
      status: input.coreCommandStoreReady ? "model_ready" : "decision_required",
      nextAction: "Stage Project work item without source write.",
      closedGate: "OPEN_BETA_PROJECT_WORK_ITEM_APPLY",
    },
    {
      key: "assign-operations-task",
      label: "Assign launch operations task",
      ownerRole: "franchise-partner",
      moduleSurface: "Operations",
      commandBoundary: "operations.launch_task.stage",
      guardedRoute: "/api/crays/core-command/project-work-item",
      status: input.coreCommandStoreReady ? "model_ready" : "decision_required",
      nextAction: "Create guarded task draft and keep Operations apply blocked.",
      closedGate: "OPEN_BETA_PROJECT_WORK_ITEM_APPLY",
    },
    {
      key: "request-opening-document",
      label: "Request opening document",
      ownerRole: "reviewer",
      moduleSurface: "Files",
      commandBoundary: "files.opening_project.metadata_link",
      guardedRoute: "/api/crays/core-command/files-package",
      status: input.coreCommandStoreReady ? "model_ready" : "decision_required",
      nextAction: "Link document metadata without upload or external sharing.",
      closedGate: "OPEN_DEV_FILES_PACKAGE_APPLY",
    },
    {
      key: "review-partner-training",
      label: "Review partner training",
      ownerRole: "franchise-partner",
      moduleSurface: "Learning",
      commandBoundary: "learning.partner_onboarding.review",
      guardedRoute: "/api/crays/pilot-workflow/opening-handoff/readiness",
      status: "in_progress",
      nextAction: "Confirm readiness path in CRAYS before launch.",
      closedGate: "OPEN_BETA_PROJECT_WORK_ITEM_APPLY",
    },
    {
      key: "hold-external-notification",
      label: "Hold external notification",
      ownerRole: "deal-manager",
      moduleSurface: "Support",
      commandBoundary: "support.launch_notification.release_decision",
      guardedRoute: "/api/crays/pilot-workflow/opening-handoff/readiness",
      status: input.blockedItems > 0 ? "blocked" : "locked",
      nextAction: "Preview message only after explicit external-send gate.",
      closedGate: "OPEN_BETA_EMAIL_SEND_REVIEWED",
    },
  ];
}

function gates(input: { projectWorkItems: number; openingHandoffItems: number; coreCommandStoreReady: boolean; blockedItems: number }): OpeningHandoffPilotReadiness["gates"] {
  return [
    {
      key: "project-read-model",
      label: "Project read model",
      ready: input.projectWorkItems > 0,
      current: `${input.projectWorkItems} Project work items available.`,
    },
    {
      key: "opening-handoff-scope",
      label: "Opening handoff scope",
      ready: input.openingHandoffItems > 0,
      current: `${input.openingHandoffItems} handoff-related items.`,
    },
    {
      key: "command-store",
      label: "Command store",
      ready: input.coreCommandStoreReady,
      current: input.coreCommandStoreReady ? "Command models can be staged." : "Command store pending.",
    },
    {
      key: "blocked-dependencies",
      label: "Blocked dependencies",
      ready: input.blockedItems === 0,
      current: `${input.blockedItems} blocked dependencies.`,
    },
    {
      key: "tool-apply",
      label: "Tool apply",
      ready: false,
      current: "Closed until exact apply gate.",
    },
    {
      key: "external-send",
      label: "External sending",
      ready: false,
      current: "Closed until reviewed external send gate.",
    },
  ];
}

function nextBlockInputs(): OpeningHandoffPilotReadiness["nextBlockInputs"] {
  return [
    {
      blockRange: "681-690",
      requiredInput: "Cross-role dashboards should show opening handoff readiness, blocked dependencies, partner scope and command gates.",
    },
    {
      blockRange: "691-700",
      requiredInput: "Pilot closeout must decide which handoff surfaces can move toward beta and which gates remain Off.",
    },
  ];
}

export function emptyOpeningHandoffPilotReadiness(role: RoleKey): OpeningHandoffPilotReadiness {
  const access = openingHandoffPilotAccessForRole(role);
  const surfaceList = access.allowed ? visibleSurfaces(access) : [];
  const functionList = access.allowed ? preservedFunctions() : [];

  return {
    status: access.allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 671-680",
    journeySegment: "Opening Handoff",
    ownerRoles: ["deal-manager", "franchise-partner"],
    consumingRoles: ["landlord", "vendor", "studio-manager", "reviewer", "crays-management"],
    summary: {
      projectWorkItems: 0,
      openingHandoffItems: 0,
      highPriorityItems: 0,
      blockedItems: 0,
      cycles: 0,
      modules: 0,
      pages: 0,
      savedViews: 0,
      milestones: 0,
      handoffActions: 0,
      modelReadyActions: 0,
      readinessGates: 0,
      readyGates: 0,
      visibleSurfaces: surfaceList.length,
      preservedFunctions: functionList.length,
      openSideEffectGates: 0,
      projectRecordsReturned: false,
    },
    milestones: [],
    handoffActions: [],
    workItems: [],
    visibleSurfaces: surfaceList,
    preservedFunctions: functionList,
    gates: [],
    nextBlockInputs: access.allowed ? nextBlockInputs() : [],
    boundaries: openingHandoffPilotBoundary(access),
    liveBusinessRecordsReturned: false,
    workItemsWritten: false,
    operationsTasksWritten: false,
    externalNotificationsSent: false,
  };
}

export function buildOpeningHandoffPilotReadiness(
  role: RoleKey,
  input: {
    project: ProjectNativeOperabilityReadModel;
    coreCommandStoreReady: boolean;
  },
): OpeningHandoffPilotReadiness {
  const base = emptyOpeningHandoffPilotReadiness(role);
  const projectWorkItems = input.project.workItems.length;
  const directHandoffWorkItems = input.project.workItems.filter(
    (item) => item.modules.includes("Opening handoff") || item.modules.includes("Partner readiness") || item.title.toLowerCase().includes("handoff"),
  );
  const fallbackHandoffWorkItems = input.project.workItems
    .filter((item) => item.priority === "Urgent" || item.priority === "High" || item.state === "In progress")
    .slice(0, 8);
  const handoffWorkItems = directHandoffWorkItems.length > 0 ? directHandoffWorkItems : fallbackHandoffWorkItems;
  const highPriorityItems = input.project.workItems.filter((item) => item.priority === "Urgent" || item.priority === "High").length;
  const blockedItems = input.project.workItems.filter((item) => item.blockedBy.length > 0 || item.state === "To do").length;
  const milestoneList = milestones({
    openingHandoffItems: handoffWorkItems.length,
    highPriorityItems,
    blockedItems,
    pages: input.project.pages.length,
    coreCommandStoreReady: input.coreCommandStoreReady,
  });
  const actionList = handoffActions({ coreCommandStoreReady: input.coreCommandStoreReady, blockedItems });
  const gateList = gates({
    projectWorkItems,
    openingHandoffItems: handoffWorkItems.length,
    coreCommandStoreReady: input.coreCommandStoreReady,
    blockedItems,
  });

  return {
    ...base,
    summary: {
      ...base.summary,
      projectWorkItems,
      openingHandoffItems: handoffWorkItems.length,
      highPriorityItems,
      blockedItems,
      cycles: input.project.cycles.length,
      modules: input.project.modules.length,
      pages: input.project.pages.length,
      savedViews: input.project.savedViews.length,
      milestones: milestoneList.length,
      handoffActions: actionList.length,
      modelReadyActions: actionList.filter((action) => action.status === "model_ready").length,
      readinessGates: gateList.length,
      readyGates: gateList.filter((gate) => gate.ready).length,
      projectRecordsReturned: projectWorkItems > 0,
    },
    milestones: milestoneList,
    handoffActions: actionList,
    workItems: handoffWorkItems.slice(0, 8).map((item) => ({
      id: item.id,
      identifier: item.identifier,
      title: item.title,
      state: item.state,
      priority: item.priority,
      lead: item.lead,
      assignees: item.assignees,
      dueDate: item.dueDate,
      modules: item.modules,
      blockedBy: item.blockedBy,
    })),
    gates: gateList,
    liveBusinessRecordsReturned: projectWorkItems > 0 && base.access.level === "internal_opening_handoff_control",
  };
}
