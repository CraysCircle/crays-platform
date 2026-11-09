import type { RealProductReadModel } from "@/db/real-product-read-model-repository";
import type { MultiCompanyTenantizationReadiness } from "./multi-company-tenantization-contract";
import type { RoleKey } from "./roles";

const prototypeRoles: RoleKey[] = [
  "crays-management",
  "admin",
  "deal-manager",
  "expansion-manager",
  "finance",
  "franchise-candidate",
  "franchise-partner",
  "bank-partner",
  "landlord",
  "reviewer",
];

type PrototypeAccessLevel = "operating_prototype_workspace" | "forbidden";
type PrototypeBlockStatus = "ready" | "prepared" | "blocked" | "closed";
type PrototypeActionState = "stageable_local" | "read_only" | "closed_gate";

export type OperatingPlatformPrototypeAccess = {
  allowed: boolean;
  level: PrototypeAccessLevel;
  reason: string;
};

export type PrototypeBlock = {
  blockRange: string;
  label: string;
  status: PrototypeBlockStatus;
  ownerRole: RoleKey;
  proves: string;
  stillGated: string;
};

export type PrototypeRoleQueue = {
  role: RoleKey;
  surface: string;
  queue: string;
  records: number;
  nextAction: string;
};

export type PrototypeCaseWorkspace = {
  key: string;
  title: string;
  ownerRole: RoleKey;
  journeyState: string;
  readiness: number;
  linkedSignals: number;
  nextAction: string;
};

export type PrototypeWorkflowAction = {
  key: string;
  label: string;
  ownerRole: RoleKey;
  state: PrototypeActionState;
  visibleResult: string;
};

export type PrototypeStakeholderRoom = {
  audience: "Franchise Candidate" | "Property Owner" | "Bank Partner" | "Franchise Partner" | "Gym Member";
  state: "prepared_closed" | "future";
  visibleScope: string;
};

export type OperatingPlatformPrototypeBoundary = {
  operatingPrototypeReadModelEnabled: true;
  interactiveUiEnabled: true;
  localActionStagingEnabled: true;
  liveActionExecutionEnabled: false;
  tenantProvisioningEnabled: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  toolApplyEnabled: false;
  fileUploadEnabled: false;
  externalSendingEnabled: false;
  candidateReleaseEnabled: false;
  ownerPortalReleaseEnabled: false;
  bankReleaseEnabled: false;
  publicReleaseEnabled: false;
  financeWritesEnabled: false;
  bankSendEnabled: false;
  paymentInitiationEnabled: false;
  productionDeployEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type OperatingPlatformPrototypeReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: OperatingPlatformPrototypeAccess;
  blockRange: "Blocks 901-1000";
  journeySegment: "Operating Platform Prototype";
  ownerRoles: RoleKey[];
  consumingRoles: RoleKey[];
  summary: {
    prototypeBlocks: number;
    readyBlocks: number;
    preparedBlocks: number;
    blockedBlocks: number;
    roleQueues: number;
    caseWorkspaces: number;
    workflowActions: number;
    crossModuleHandoffs: number;
    stakeholderRooms: number;
    cockpitMetrics: number;
    acceptanceCriteria: number;
    tenantInputsConsumed: number;
    realCoreRecordsReturned: boolean;
    openSideEffectGates: 0;
  };
  blocks: PrototypeBlock[];
  roleQueues: PrototypeRoleQueue[];
  caseWorkspaces: PrototypeCaseWorkspace[];
  workflowActions: PrototypeWorkflowAction[];
  crossModuleHandoffs: Array<{ key: string; label: string; owner: string; ready: number; waiting: number; blocked: number; nextAction: string }>;
  stakeholderRooms: PrototypeStakeholderRoom[];
  managementCockpit: Array<{ key: string; label: string; value: string; context: string; tone: "green" | "amber" | "rose" | "blue" | "ink" }>;
  acceptanceCriteria: Array<{ key: string; label: string; state: "met" | "prepared"; evidence: string }>;
  morningHandover: Array<{ key: string; label: string; state: "prepared"; detail: string }>;
  boundaries: OperatingPlatformPrototypeBoundary;
  liveActionsExecuted: false;
  productionDeployPerformed: false;
  externalActionsPerformed: false;
};

export function operatingPlatformPrototypeAccessForRole(role: RoleKey): OperatingPlatformPrototypeAccess {
  if (prototypeRoles.includes(role)) {
    return {
      allowed: true,
      level: "operating_prototype_workspace",
      reason: "Role can use the CRAYS operating prototype read model and local staging UI without live execution or release side effects.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Operating prototype access requires an approved internal or scoped stakeholder role.",
  };
}

function boundary(): OperatingPlatformPrototypeBoundary {
  return {
    operatingPrototypeReadModelEnabled: true,
    interactiveUiEnabled: true,
    localActionStagingEnabled: true,
    liveActionExecutionEnabled: false,
    tenantProvisioningEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    fileUploadEnabled: false,
    externalSendingEnabled: false,
    candidateReleaseEnabled: false,
    ownerPortalReleaseEnabled: false,
    bankReleaseEnabled: false,
    publicReleaseEnabled: false,
    financeWritesEnabled: false,
    bankSendEnabled: false,
    paymentInitiationEnabled: false,
    productionDeployEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function blocks(realProduct: RealProductReadModel, tenantization: MultiCompanyTenantizationReadiness): PrototypeBlock[] {
  const hasCases = realProduct.summary.preparedDeals > 0 && realProduct.cases.length > 0;
  const hasTenantScope = tenantization.summary.scopeRules >= 7;

  return [
    {
      blockRange: "901-910",
      label: "Role Work Queue",
      status: hasCases ? "ready" : "blocked",
      ownerRole: "deal-manager",
      proves: "The first working surface is a role-scoped queue with records, filters and next actions.",
      stillGated: "Live task apply.",
    },
    {
      blockRange: "911-920",
      label: "End-to-End Case Workspace",
      status: hasCases ? "ready" : "blocked",
      ownerRole: "deal-manager",
      proves: "A prepared deal ties property, location, economics, candidate, bank and opening evidence together.",
      stillGated: "Candidate, owner or bank release.",
    },
    {
      blockRange: "921-930",
      label: "Record Detail UX",
      status: hasCases ? "ready" : "blocked",
      ownerRole: "deal-manager",
      proves: "Selecting a record exposes scores, evidence, module signals and next action in the same workspace.",
      stillGated: "Record edit writes.",
    },
    {
      blockRange: "931-940",
      label: "Workflow Actions",
      status: "prepared",
      ownerRole: "reviewer",
      proves: "Actions stage visible local activity and command intent without executing external side effects.",
      stillGated: "Command apply and external sends.",
    },
    {
      blockRange: "941-950",
      label: "Cross-Module Handoffs",
      status: realProduct.journey.length >= 7 ? "ready" : "blocked",
      ownerRole: "crays-management",
      proves: "The North-Star journey is visible as handoff counts across modules and owners.",
      stillGated: "Automated handoff writes.",
    },
    {
      blockRange: "951-960",
      label: "External Stakeholder Rooms",
      status: "prepared",
      ownerRole: "reviewer",
      proves: "Candidate, owner, bank, partner and member rooms have scoped visibility definitions.",
      stillGated: "External room release.",
    },
    {
      blockRange: "961-970",
      label: "Management Cockpit",
      status: realProduct.dashboards.length >= 5 ? "ready" : "blocked",
      ownerRole: "crays-management",
      proves: "Management sees operating KPIs, blockers and module read maps in one place.",
      stillGated: "Production reporting publish.",
    },
    {
      blockRange: "971-980",
      label: "UX Polish",
      status: "prepared",
      ownerRole: "admin",
      proves: "The prototype uses the existing app shell, compact panels, filters, rows and role-specific work surfaces.",
      stillGated: "Visual sign-off outside local prototype.",
    },
    {
      blockRange: "981-990",
      label: "QA / Smokes / Contracts",
      status: "prepared",
      ownerRole: "reviewer",
      proves: "Contracts and route smokes are registered for the prototype readiness layer.",
      stillGated: "Claiming final QA before the full command suite runs.",
    },
    {
      blockRange: "991-1000",
      label: "Morning Handover",
      status: hasTenantScope && hasCases ? "prepared" : "blocked",
      ownerRole: "crays-management",
      proves: "The morning decision package can show what works, what remains gated and what to approve next.",
      stillGated: "Next-day production or beta approval.",
    },
  ];
}

function readinessForCase(caseItem: RealProductReadModel["cases"][number]) {
  const checks = [
    caseItem.handoffStatus === "ready",
    caseItem.evidence.locationRuns > 0,
    caseItem.evidence.rentModels > 0,
    caseItem.evidence.dealEconomicsModels > 0,
    caseItem.evidence.bankingSnapshots > 0,
    caseItem.evidence.blockedReleaseGates === 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function signalCount(caseItem: RealProductReadModel["cases"][number]) {
  return Object.values(caseItem.toolSignals).reduce((sum, value) => sum + value, 0);
}

function roleQueues(realProduct: RealProductReadModel): PrototypeRoleQueue[] {
  return [
    {
      role: "deal-manager",
      surface: "Dashboard",
      queue: "Prepared deal queue",
      records: realProduct.summary.preparedDeals,
      nextAction: "Open highest-priority prepared deal and clear next blocker.",
    },
    {
      role: "expansion-manager",
      surface: "CRM",
      queue: "Owner property checks",
      records: realProduct.summary.propertyChecks,
      nextAction: "Review handoff-ready properties before deal package work.",
    },
    {
      role: "finance",
      surface: "Loans",
      queue: "Bank evidence blockers",
      records: realProduct.summary.bankPackages,
      nextAction: "Resolve finance evidence and bank package readiness.",
    },
    {
      role: "reviewer",
      surface: "Files",
      queue: "Release gate review",
      records: realProduct.summary.blockedReleaseGates,
      nextAction: "Keep blocked gates closed until redaction and approval are complete.",
    },
    {
      role: "franchise-partner",
      surface: "Operations",
      queue: "Opening handoff",
      records: realProduct.summary.handoffReadyProperties,
      nextAction: "Clear opening readiness tasks and launch handoff dependencies.",
    },
    {
      role: "crays-management",
      surface: "Analytics",
      queue: "Portfolio cockpit",
      records: realProduct.summary.toolReadMaps,
      nextAction: "Review portfolio blockers, tenant scope and beta readiness.",
    },
  ];
}

function caseWorkspaces(realProduct: RealProductReadModel): PrototypeCaseWorkspace[] {
  return realProduct.cases.slice(0, 6).map((caseItem) => ({
    key: caseItem.offerId,
    title: caseItem.title,
    ownerRole: "deal-manager",
    journeyState: caseItem.nextAction,
    readiness: readinessForCase(caseItem),
    linkedSignals: signalCount(caseItem),
    nextAction: caseItem.nextAction,
  }));
}

function workflowActions(): PrototypeWorkflowAction[] {
  return [
    {
      key: "open-priority-deal",
      label: "Open priority deal",
      ownerRole: "deal-manager",
      state: "stageable_local",
      visibleResult: "Selected record and local activity entry.",
    },
    {
      key: "review-property-fit",
      label: "Review property fit",
      ownerRole: "expansion-manager",
      state: "stageable_local",
      visibleResult: "Property check review intent staged in UI.",
    },
    {
      key: "clear-bank-evidence",
      label: "Clear bank evidence blocker",
      ownerRole: "finance",
      state: "stageable_local",
      visibleResult: "Finance review intent staged without bank send.",
    },
    {
      key: "approve-release-gate",
      label: "Approve release gate",
      ownerRole: "reviewer",
      state: "closed_gate",
      visibleResult: "Approval remains closed until exact release gate.",
    },
    {
      key: "prepare-owner-room",
      label: "Prepare owner room",
      ownerRole: "deal-manager",
      state: "read_only",
      visibleResult: "Room scope preview only, no owner release.",
    },
    {
      key: "prepare-opening-handoff",
      label: "Prepare opening handoff",
      ownerRole: "franchise-partner",
      state: "stageable_local",
      visibleResult: "Opening handoff intent staged without project apply.",
    },
  ];
}

function stakeholderRooms(): PrototypeStakeholderRoom[] {
  return [
    {
      audience: "Franchise Candidate",
      state: "prepared_closed",
      visibleScope: "Released deal room shell, evidence status, questions and gated intent state only.",
    },
    {
      audience: "Property Owner",
      state: "prepared_closed",
      visibleScope: "Property fit, rent potential and handoff actions after owner-room release.",
    },
    {
      audience: "Bank Partner",
      state: "prepared_closed",
      visibleScope: "Released bank package status only after exact bank release.",
    },
    {
      audience: "Franchise Partner",
      state: "prepared_closed",
      visibleScope: "Opening tasks, launch readiness and training handoff after partner release.",
    },
    {
      audience: "Gym Member",
      state: "future",
      visibleScope: "Membership, booking, support and payment work after operations launch scope.",
    },
  ];
}

function acceptanceCriteria(realProduct: RealProductReadModel, tenantization: MultiCompanyTenantizationReadiness): OperatingPlatformPrototypeReadiness["acceptanceCriteria"] {
  return [
    {
      key: "first-screen-work",
      label: "First screen is work",
      state: realProduct.summary.preparedDeals > 0 ? "met" : "prepared",
      evidence: `${realProduct.summary.preparedDeals} prepared deals feed the role queue.`,
    },
    {
      key: "record-detail",
      label: "Record detail is inspectable",
      state: realProduct.cases.length > 0 ? "met" : "prepared",
      evidence: `${realProduct.cases.length} records expose evidence, scores, next action and module signals.`,
    },
    {
      key: "workflow-action",
      label: "Actions change visible local state",
      state: "met",
      evidence: "Dashboard actions stage local activity without live execution.",
    },
    {
      key: "cross-module",
      label: "Cross-module journey is visible",
      state: realProduct.journey.length >= 7 ? "met" : "prepared",
      evidence: `${realProduct.journey.length} North-Star journey handoffs returned.`,
    },
    {
      key: "tenant-scope",
      label: "Tenant scope is explicit",
      state: tenantization.summary.scopeRules >= 7 ? "met" : "prepared",
      evidence: `${tenantization.summary.scopeRules} tenant scope rules and ${tenantization.summary.moduleTemplates} module templates prepared.`,
    },
    {
      key: "closed-gates",
      label: "Side-effect gates remain closed",
      state: "met",
      evidence: "Release, upload, send, bank, finance, payment, tenant provisioning and production deploy flags are false.",
    },
  ];
}

function morningHandover(): OperatingPlatformPrototypeReadiness["morningHandover"] {
  return [
    { key: "what-works", label: "What works now", state: "prepared", detail: "Dashboard workbench, queue filtering, record detail, local action staging and readiness panels." },
    { key: "what-is-gated", label: "What stays gated", state: "prepared", detail: "External releases, writes, sends, uploads, bank actions, payments, tenant provisioning and deploy." },
    { key: "next-decisions", label: "Next decisions", state: "prepared", detail: "Approve which exact live read/apply gates, beta scope and FitYes tenant path can move next." },
    { key: "qa-package", label: "QA package", state: "prepared", detail: "Contracts, route smokes, build, lint, forbidden wording scan and screenshots form the morning basis." },
  ];
}

export function emptyOperatingPlatformPrototypeReadiness(role: RoleKey): OperatingPlatformPrototypeReadiness {
  const access = operatingPlatformPrototypeAccessForRole(role);

  return {
    status: access.allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 901-1000",
    journeySegment: "Operating Platform Prototype",
    ownerRoles: ["deal-manager", "crays-management", "admin", "reviewer", "finance"],
    consumingRoles: ["expansion-manager", "franchise-candidate", "franchise-partner", "bank-partner", "landlord", "studio-manager", "gym-member"],
    summary: {
      prototypeBlocks: 0,
      readyBlocks: 0,
      preparedBlocks: 0,
      blockedBlocks: 0,
      roleQueues: 0,
      caseWorkspaces: 0,
      workflowActions: 0,
      crossModuleHandoffs: 0,
      stakeholderRooms: 0,
      cockpitMetrics: 0,
      acceptanceCriteria: 0,
      tenantInputsConsumed: 0,
      realCoreRecordsReturned: false,
      openSideEffectGates: 0,
    },
    blocks: [],
    roleQueues: [],
    caseWorkspaces: [],
    workflowActions: [],
    crossModuleHandoffs: [],
    stakeholderRooms: [],
    managementCockpit: [],
    acceptanceCriteria: [],
    morningHandover: access.allowed ? morningHandover() : [],
    boundaries: boundary(),
    liveActionsExecuted: false,
    productionDeployPerformed: false,
    externalActionsPerformed: false,
  };
}

export function buildOperatingPlatformPrototypeReadiness(
  role: RoleKey,
  input: { realProduct: RealProductReadModel; tenantization: MultiCompanyTenantizationReadiness },
): OperatingPlatformPrototypeReadiness {
  const base = emptyOperatingPlatformPrototypeReadiness(role);
  const blockList = blocks(input.realProduct, input.tenantization);
  const queueList = roleQueues(input.realProduct);
  const workspaceList = caseWorkspaces(input.realProduct);
  const actionList = workflowActions();
  const roomList = stakeholderRooms();
  const criteriaList = acceptanceCriteria(input.realProduct, input.tenantization);

  return {
    ...base,
    summary: {
      prototypeBlocks: blockList.length,
      readyBlocks: blockList.filter((block) => block.status === "ready").length,
      preparedBlocks: blockList.filter((block) => block.status === "prepared").length,
      blockedBlocks: blockList.filter((block) => block.status === "blocked").length,
      roleQueues: queueList.length,
      caseWorkspaces: workspaceList.length,
      workflowActions: actionList.length,
      crossModuleHandoffs: input.realProduct.journey.length,
      stakeholderRooms: roomList.length,
      cockpitMetrics: input.realProduct.dashboards.length,
      acceptanceCriteria: criteriaList.length,
      tenantInputsConsumed: input.tenantization.summary.tenantBlocks,
      realCoreRecordsReturned: input.realProduct.cases.length > 0,
      openSideEffectGates: 0,
    },
    blocks: blockList,
    roleQueues: queueList,
    caseWorkspaces: workspaceList,
    workflowActions: actionList,
    crossModuleHandoffs: input.realProduct.journey.map((step) => ({
      key: step.key,
      label: step.label,
      owner: step.owner,
      ready: step.ready,
      waiting: step.waiting,
      blocked: step.blocked,
      nextAction: step.primaryAction,
    })),
    stakeholderRooms: roomList,
    managementCockpit: input.realProduct.dashboards,
    acceptanceCriteria: criteriaList,
  };
}
