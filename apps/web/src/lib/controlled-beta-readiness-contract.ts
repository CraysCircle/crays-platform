import type { PilotCloseoutReleaseDecisionReadiness } from "./pilot-closeout-release-decision-contract";
import type { RoleKey } from "./roles";

const betaReadinessRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "finance"];

type BetaReadinessAccessLevel = "internal_beta_readiness_control" | "forbidden";
type BetaReadinessStatus = "prepared" | "blocked" | "closed";

export type ControlledBetaReadinessAccess = {
  allowed: boolean;
  level: BetaReadinessAccessLevel;
  reason: string;
};

export type ControlledBetaReadinessBlock = {
  blockRange: string;
  label: string;
  status: BetaReadinessStatus;
  ownerRole: RoleKey;
  outcome: string;
  stillGated: string;
};

export type ControlledBetaReadinessBoundary = {
  betaReadinessReadModelEnabled: true;
  betaScopePrepared: true;
  betaLaunched: false;
  productionDeployEnabled: false;
  liveExternalReadsEnabled: false;
  approvedLiveReadGatesOpened: false;
  approvedApplyGatesOpened: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  toolApplyEnabled: false;
  ownerSubmissionWritesEnabled: false;
  fileUploadEnabled: false;
  externalSendingEnabled: false;
  candidateReleaseEnabled: false;
  bankReleaseEnabled: false;
  publicReleaseEnabled: false;
  financeWritesEnabled: false;
  bankSendEnabled: false;
  paymentInitiationEnabled: false;
  vpsChangingWorkEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type ControlledBetaReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: ControlledBetaReadinessAccess;
  blockRange: "Blocks 701-800";
  journeySegment: "Controlled Beta Readiness";
  ownerRoles: RoleKey[];
  consumingRoles: RoleKey[];
  summary: {
    betaBlocks: number;
    preparedBlocks: number;
    blockedBlocks: number;
    exactGatePreparations: number;
    openedExactGates: 0;
    externalRoomsPrepared: number;
    opsSupportSurfaces: number;
    recoveryControls: number;
    releaseDecisionsConsumed: number;
    openSideEffectGates: 0;
  };
  blocks: ControlledBetaReadinessBlock[];
  exactGatePreparations: Array<{ key: string; label: string; state: "prepared_closed"; prerequisite: string }>;
  betaRooms: Array<{ audience: "Candidate" | "Property Owner" | "Bank Partner" | "Franchise Partner"; state: "prepared_closed"; visibleScope: string }>;
  opsSupportReadiness: Array<{ surface: string; queue: string; state: "prepared"; ownerRole: RoleKey }>;
  recoveryControls: Array<{ key: string; label: string; state: "prepared" | "required"; ownerRole: RoleKey }>;
  nextTenantInputs: Array<{ blockRange: string; input: string }>;
  boundaries: ControlledBetaReadinessBoundary;
  betaApproved: false;
  productionDeployPerformed: false;
  externalActionsPerformed: false;
};

export function controlledBetaReadinessAccessForRole(role: RoleKey): ControlledBetaReadinessAccess {
  if (betaReadinessRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_beta_readiness_control",
      reason: "Role can review controlled beta readiness and exact gate preparations without launching beta or opening side effects.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Controlled beta readiness requires internal beta control scope.",
  };
}

function boundary(): ControlledBetaReadinessBoundary {
  return {
    betaReadinessReadModelEnabled: true,
    betaScopePrepared: true,
    betaLaunched: false,
    productionDeployEnabled: false,
    liveExternalReadsEnabled: false,
    approvedLiveReadGatesOpened: false,
    approvedApplyGatesOpened: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    ownerSubmissionWritesEnabled: false,
    fileUploadEnabled: false,
    externalSendingEnabled: false,
    candidateReleaseEnabled: false,
    bankReleaseEnabled: false,
    publicReleaseEnabled: false,
    financeWritesEnabled: false,
    bankSendEnabled: false,
    paymentInitiationEnabled: false,
    vpsChangingWorkEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function blocks(closeout: PilotCloseoutReleaseDecisionReadiness): ControlledBetaReadinessBlock[] {
  return [
    {
      blockRange: "701-710",
      label: "Pilot Findings to Beta Scope",
      status: closeout.summary.betaScopeReadyDecisions > 0 ? "prepared" : "blocked",
      ownerRole: "crays-management",
      outcome: "Pilot findings define beta roles, flows, records and risk limits.",
      stillGated: "Automatic beta approval.",
    },
    {
      blockRange: "711-720",
      label: "Beta Tenant / Data Boundary",
      status: "prepared",
      ownerRole: "admin",
      outcome: "Dev, Pilot and Beta data boundaries, reset, backup and retention are explicit.",
      stillGated: "Production data migration.",
    },
    {
      blockRange: "721-730",
      label: "Permission and Compliance Hardening",
      status: "prepared",
      ownerRole: "reviewer",
      outcome: "Role visibility, consent, audit and external-room permissions are regression-test ready.",
      stillGated: "Unreviewed visibility expansion.",
    },
    {
      blockRange: "731-740",
      label: "First Approved Live Read Gates",
      status: "closed",
      ownerRole: "admin",
      outcome: "Selected live-read gates are named and can be approved one by one later.",
      stillGated: "Broad live integration.",
    },
    {
      blockRange: "741-750",
      label: "First Approved Apply Gates",
      status: closeout.summary.blockedSegments > 0 ? "blocked" : "closed",
      ownerRole: "admin",
      outcome: "Low-risk apply gate candidates require rollback and audit before opening.",
      stillGated: "Finance, bank, payment and release actions.",
    },
    {
      blockRange: "751-760",
      label: "External Communication Readiness",
      status: "prepared",
      ownerRole: "reviewer",
      outcome: "Templates, consent, preview-before-send and send audit are prepared.",
      stillGated: "Ungated external sending.",
    },
    {
      blockRange: "761-770",
      label: "Candidate / Owner / Bank Beta Rooms",
      status: "prepared",
      ownerRole: "deal-manager",
      outcome: "External beta rooms are prepared for released records and status communication.",
      stillGated: "Public marketplace or unscoped data rooms.",
    },
    {
      blockRange: "771-780",
      label: "Operations and Support Cockpit",
      status: "prepared",
      ownerRole: "deal-manager",
      outcome: "Support, Operations, HR, Learning and Studio workflows have queues, SLAs and escalations.",
      stillGated: "Automated external side effects.",
    },
    {
      blockRange: "781-790",
      label: "Security, Observability and Recovery",
      status: "prepared",
      ownerRole: "admin",
      outcome: "Monitoring, alerts, restore drills, incident runbooks and admin reviews are specified.",
      stillGated: "Production deploy without approval.",
    },
    {
      blockRange: "791-800",
      label: "Beta Release Decision",
      status: "prepared",
      ownerRole: "crays-management",
      outcome: "Small-beta gate candidates and closed gates are ready for decision.",
      stillGated: "Ungated scale-up.",
    },
  ];
}

function gatePreparations(): ControlledBetaReadiness["exactGatePreparations"] {
  return [
    { key: "OPEN_BETA_LOCATION_READ", label: "Location read", state: "prepared_closed", prerequisite: "Exact provider, scope, rate, audit and rollback review." },
    { key: "OPEN_BETA_PROJECT_WORK_ITEM_APPLY", label: "Project work item apply", state: "prepared_closed", prerequisite: "One low-risk command, idempotency and rollback evidence." },
    { key: "OPEN_BETA_CRM_ACTIVITY_APPLY", label: "CRM activity apply", state: "prepared_closed", prerequisite: "Scoped activity write, audit and user confirmation." },
    { key: "OPEN_BETA_EMAIL_SEND_REVIEWED", label: "Reviewed external email send", state: "prepared_closed", prerequisite: "Consent, preview, template and send audit." },
    { key: "OPEN_BETA_OWNER_SUBMISSION", label: "Owner submission", state: "prepared_closed", prerequisite: "Upload/storage/security approval." },
    { key: "OPEN_BETA_BANK_PACKAGE_RELEASE", label: "Bank package release", state: "prepared_closed", prerequisite: "Regulated checks, consent, finance review and release approval." },
  ];
}

function betaRooms(): ControlledBetaReadiness["betaRooms"] {
  return [
    { audience: "Candidate", state: "prepared_closed", visibleScope: "Released deal room, evidence status, questions and gated intent state." },
    { audience: "Property Owner", state: "prepared_closed", visibleScope: "Property fit, rent potential, owner handoff and missing actions." },
    { audience: "Bank Partner", state: "prepared_closed", visibleScope: "Released package status only after exact bank release." },
    { audience: "Franchise Partner", state: "prepared_closed", visibleScope: "Opening tasks, launch readiness, training and support handoff." },
  ];
}

function opsSupportReadiness(): ControlledBetaReadiness["opsSupportReadiness"] {
  return [
    { surface: "Operations", queue: "Opening launch blockers", state: "prepared", ownerRole: "deal-manager" },
    { surface: "Support", queue: "Stakeholder support and escalations", state: "prepared", ownerRole: "reviewer" },
    { surface: "Learning", queue: "Partner onboarding path", state: "prepared", ownerRole: "franchise-partner" },
    { surface: "HR", queue: "Launch staffing and training readiness", state: "prepared", ownerRole: "admin" },
  ];
}

function recoveryControls(): ControlledBetaReadiness["recoveryControls"] {
  return [
    { key: "audit-review", label: "Daily beta audit review", state: "prepared", ownerRole: "reviewer" },
    { key: "backup-reset", label: "Beta backup and reset runbook", state: "prepared", ownerRole: "admin" },
    { key: "incident-response", label: "Incident response path", state: "prepared", ownerRole: "admin" },
    { key: "restore-drill", label: "Restore drill evidence", state: "required", ownerRole: "admin" },
  ];
}

function nextTenantInputs(): ControlledBetaReadiness["nextTenantInputs"] {
  return [
    { blockRange: "801-810", input: "Tenant strategy must sit above organization and beta scope." },
    { blockRange: "811-830", input: "Tenant model and enforcement must scope every read, command, setting and audit event." },
    { blockRange: "831-860", input: "Regression harness, branding templates and FitYes seed must prove no cross-tenant leakage." },
    { blockRange: "861-900", input: "Tenant admin, commercial readiness, export/retention and FitYes pilot decision." },
  ];
}

export function emptyControlledBetaReadiness(role: RoleKey): ControlledBetaReadiness {
  const access = controlledBetaReadinessAccessForRole(role);

  return {
    status: access.allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 701-800",
    journeySegment: "Controlled Beta Readiness",
    ownerRoles: ["crays-management", "admin", "reviewer"],
    consumingRoles: ["deal-manager", "finance", "franchise-candidate", "bank-partner", "franchise-partner"],
    summary: {
      betaBlocks: 0,
      preparedBlocks: 0,
      blockedBlocks: 0,
      exactGatePreparations: 0,
      openedExactGates: 0,
      externalRoomsPrepared: 0,
      opsSupportSurfaces: 0,
      recoveryControls: 0,
      releaseDecisionsConsumed: 0,
      openSideEffectGates: 0,
    },
    blocks: [],
    exactGatePreparations: [],
    betaRooms: [],
    opsSupportReadiness: [],
    recoveryControls: [],
    nextTenantInputs: access.allowed ? nextTenantInputs() : [],
    boundaries: boundary(),
    betaApproved: false,
    productionDeployPerformed: false,
    externalActionsPerformed: false,
  };
}

export function buildControlledBetaReadiness(role: RoleKey, input: { closeout: PilotCloseoutReleaseDecisionReadiness }): ControlledBetaReadiness {
  const base = emptyControlledBetaReadiness(role);
  const blockList = blocks(input.closeout);
  const gateList = gatePreparations();
  const roomList = betaRooms();
  const opsList = opsSupportReadiness();
  const recoveryList = recoveryControls();

  return {
    ...base,
    summary: {
      betaBlocks: blockList.length,
      preparedBlocks: blockList.filter((block) => block.status === "prepared").length,
      blockedBlocks: blockList.filter((block) => block.status === "blocked").length,
      exactGatePreparations: gateList.length,
      openedExactGates: 0,
      externalRoomsPrepared: roomList.length,
      opsSupportSurfaces: opsList.length,
      recoveryControls: recoveryList.length,
      releaseDecisionsConsumed: input.closeout.summary.decisions,
      openSideEffectGates: 0,
    },
    blocks: blockList,
    exactGatePreparations: gateList,
    betaRooms: roomList,
    opsSupportReadiness: opsList,
    recoveryControls: recoveryList,
  };
}
