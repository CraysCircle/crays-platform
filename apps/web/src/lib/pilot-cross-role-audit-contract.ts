import type { RoleKey } from "./roles";

const internalCrossRoleAuditRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance"];
const scopedCrossRoleAuditRoles: RoleKey[] = ["franchise-candidate", "bank-partner", "franchise-partner"];

type CrossRoleAuditAccessLevel = "internal_pilot_control_tower" | "scoped_stakeholder_status" | "forbidden";
type CrossRoleAuditStatus = "ready" | "in_progress" | "blocked" | "release_required" | "locked";

export type CrossRoleAuditPilotAccess = {
  allowed: boolean;
  level: CrossRoleAuditAccessLevel;
  reason: string;
};

export type CrossRoleAuditPilotSegment = {
  key: string;
  label: string;
  journeyStep: string;
  ownerRole: RoleKey;
  consumerRoles: RoleKey[];
  status: CrossRoleAuditStatus;
  recordSignal: string;
  nextAction: string;
  auditState: "visible" | "scoped" | "locked";
};

export type CrossRoleAuditPilotBoundary = {
  coreDevPilotDataAllowed: true;
  aggregateReadModelsEnabled: true;
  roleScopedAuditEnabled: true;
  crossRoleDashboardEnabled: true;
  unreviewedVisibilityExpansionEnabled: false;
  candidateReleaseEnabled: false;
  bankReleaseEnabled: false;
  publicReleaseEnabled: false;
  ownerSubmissionWritesEnabled: false;
  fileUploadEnabled: false;
  liveExternalReadsEnabled: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  toolApplyEnabled: false;
  externalSendingEnabled: false;
  financeWritesEnabled: false;
  paymentInitiationEnabled: false;
  productionDeployEnabled: false;
  vpsChangingWorkEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type CrossRoleAuditPilotReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: CrossRoleAuditPilotAccess;
  blockRange: "Blocks 681-690";
  journeySegment: "Cross-role Dashboards and Audit";
  ownerRoles: RoleKey[];
  consumingRoles: RoleKey[];
  summary: {
    journeySegments: number;
    readySegments: number;
    blockedSegments: number;
    releaseRequiredSegments: number;
    lockedSegments: number;
    visibleSurfaces: number;
    auditEvents: number;
    roleScopes: number;
    openSideEffectGates: 0;
    aggregateOnly: true;
  };
  segments: CrossRoleAuditPilotSegment[];
  visibleSurfaces: Array<{ surface: string; roleUse: string }>;
  auditEvents: Array<{ key: string; label: string; source: string; state: "captured" | "derived" | "locked" }>;
  gates: Array<{ key: string; label: string; ready: boolean; current: string }>;
  nextBlockInputs: Array<{ blockRange: string; requiredInput: string }>;
  boundaries: CrossRoleAuditPilotBoundary;
  liveBusinessRecordsReturned: false;
  visibilityExpanded: false;
  externalActionsPerformed: false;
};

export function crossRoleAuditPilotAccessForRole(role: RoleKey): CrossRoleAuditPilotAccess {
  if (internalCrossRoleAuditRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_pilot_control_tower",
      reason: "Role can review cross-role pilot readiness, scoped audit signals and blocked gates across the end-to-end journey.",
    };
  }

  if (scopedCrossRoleAuditRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_stakeholder_status",
      reason: "Role can see scoped status signals only; no unreviewed cross-role records are returned.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Cross-role pilot audit requires internal or scoped pilot stakeholder access.",
  };
}

export function crossRoleAuditPilotBoundary(): CrossRoleAuditPilotBoundary {
  return {
    coreDevPilotDataAllowed: true,
    aggregateReadModelsEnabled: true,
    roleScopedAuditEnabled: true,
    crossRoleDashboardEnabled: true,
    unreviewedVisibilityExpansionEnabled: false,
    candidateReleaseEnabled: false,
    bankReleaseEnabled: false,
    publicReleaseEnabled: false,
    ownerSubmissionWritesEnabled: false,
    fileUploadEnabled: false,
    liveExternalReadsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    externalSendingEnabled: false,
    financeWritesEnabled: false,
    paymentInitiationEnabled: false,
    productionDeployEnabled: false,
    vpsChangingWorkEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function visibleSurfaces(access: CrossRoleAuditPilotAccess): CrossRoleAuditPilotReadiness["visibleSurfaces"] {
  if (access.level === "scoped_stakeholder_status") {
    return [
      { surface: "Dashboard", roleUse: "Scoped readiness status for the current stakeholder journey." },
      { surface: "Sites", roleUse: "Portal status without internal records or release actions." },
    ];
  }

  return [
    { surface: "Dashboard", roleUse: "Management and Deal Manager see one end-to-end pilot chain." },
    { surface: "CRM", roleUse: "Candidate, property and deal status are connected to owner actions." },
    { surface: "Project", roleUse: "Opening and handoff blockers remain visible." },
    { surface: "Loans", roleUse: "Financing readiness and bank gates are tracked without release." },
    { surface: "Files", roleUse: "Evidence and document gate state is aggregated." },
    { surface: "Settings", roleUse: "Admin sees gate, audit and QA state." },
  ];
}

function auditEvents(): CrossRoleAuditPilotReadiness["auditEvents"] {
  return [
    { key: "property-fit-reviewed", label: "Property fit reviewed", source: "Owner Property Check", state: "captured" },
    { key: "economics-reviewed", label: "Deal economics reviewed", source: "Location and Rent Economics", state: "captured" },
    { key: "candidate-shell-locked", label: "Candidate release shell locked", source: "Candidate Deal Room", state: "captured" },
    { key: "intent-modeled", label: "Candidate intent command modeled", source: "Candidate Evidence and Intent", state: "derived" },
    { key: "bank-release-locked", label: "Bank release locked", source: "Bank Evidence and Financing", state: "locked" },
    { key: "opening-handoff-staged", label: "Opening handoff staged", source: "Opening Handoff", state: "derived" },
  ];
}

function gates(): CrossRoleAuditPilotReadiness["gates"] {
  return [
    { key: "aggregate-read-model", label: "Aggregate read model", ready: true, current: "Cross-role status can be read as scoped summaries." },
    { key: "role-scope", label: "Role scope", ready: true, current: "Stakeholder status is role scoped." },
    { key: "audit-state", label: "Audit state", ready: true, current: "Pilot events are represented as captured, derived or locked." },
    { key: "visibility-expansion", label: "Visibility expansion", ready: false, current: "Unreviewed cross-role visibility stays Off." },
    { key: "external-actions", label: "External actions", ready: false, current: "Sends, uploads, releases and tool apply stay Off." },
  ];
}

function nextBlockInputs(): CrossRoleAuditPilotReadiness["nextBlockInputs"] {
  return [
    {
      blockRange: "691-700",
      requiredInput: "Pilot closeout must decide readiness, risk, QA and which gates remain closed before beta readiness starts.",
    },
    {
      blockRange: "701-710",
      requiredInput: "Beta scope must be derived from this end-to-end pilot chain, not from isolated module readiness.",
    },
  ];
}

function segmentStatus(input: { ready: boolean; blocked?: boolean; releaseRequired?: boolean; locked?: boolean }): CrossRoleAuditStatus {
  if (input.locked) return "locked";
  if (input.blocked) return "blocked";
  if (input.releaseRequired) return "release_required";
  return input.ready ? "ready" : "in_progress";
}

export function emptyCrossRoleAuditPilotReadiness(role: RoleKey): CrossRoleAuditPilotReadiness {
  const access = crossRoleAuditPilotAccessForRole(role);
  const surfaceList = access.allowed ? visibleSurfaces(access) : [];

  return {
    status: access.allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 681-690",
    journeySegment: "Cross-role Dashboards and Audit",
    ownerRoles: ["crays-management", "deal-manager"],
    consumingRoles: ["expansion-manager", "finance", "franchise-candidate", "bank-partner", "franchise-partner", "reviewer"],
    summary: {
      journeySegments: 0,
      readySegments: 0,
      blockedSegments: 0,
      releaseRequiredSegments: 0,
      lockedSegments: 0,
      visibleSurfaces: surfaceList.length,
      auditEvents: 0,
      roleScopes: 0,
      openSideEffectGates: 0,
      aggregateOnly: true,
    },
    segments: [],
    visibleSurfaces: surfaceList,
    auditEvents: [],
    gates: [],
    nextBlockInputs: access.allowed ? nextBlockInputs() : [],
    boundaries: crossRoleAuditPilotBoundary(),
    liveBusinessRecordsReturned: false,
    visibilityExpanded: false,
    externalActionsPerformed: false,
  };
}

export function buildCrossRoleAuditPilotReadiness(
  role: RoleKey,
  input: {
    ownerReadyGates: number;
    economicsReadyGates: number;
    assemblyInternalPackages: number;
    candidateVisiblePackages: number;
    candidateActionModels: number;
    bankReadyGates: number;
    openingHandoffItems: number;
    openingBlockedItems: number;
  },
): CrossRoleAuditPilotReadiness {
  const base = emptyCrossRoleAuditPilotReadiness(role);
  const events = auditEvents();
  const segmentList: CrossRoleAuditPilotSegment[] = [
    {
      key: "property-owner-fit",
      label: "Property Owner Fit",
      journeyStep: "Property Owner Fit",
      ownerRole: "expansion-manager",
      consumerRoles: ["deal-manager", "reviewer"],
      status: segmentStatus({ ready: input.ownerReadyGates > 0 }),
      recordSignal: `${input.ownerReadyGates} owner/property gates ready`,
      nextAction: "Keep owner submission writes closed while handoff readiness is reviewed.",
      auditState: "visible",
    },
    {
      key: "location-evidence",
      label: "Location Evidence",
      journeyStep: "Location Evidence",
      ownerRole: "deal-manager",
      consumerRoles: ["finance", "reviewer"],
      status: segmentStatus({ ready: input.economicsReadyGates > 0 }),
      recordSignal: `${input.economicsReadyGates} economics gates ready`,
      nextAction: "Use location and rent evidence as package input only.",
      auditState: "visible",
    },
    {
      key: "deal-economics",
      label: "Deal Economics",
      journeyStep: "Deal Economics",
      ownerRole: "deal-manager",
      consumerRoles: ["finance", "franchise-candidate"],
      status: segmentStatus({ ready: input.assemblyInternalPackages > 0, releaseRequired: input.candidateVisiblePackages === 0 }),
      recordSignal: `${input.assemblyInternalPackages} internal packages, ${input.candidateVisiblePackages} Candidate-visible`,
      nextAction: "Review package before Candidate or public release.",
      auditState: "visible",
    },
    {
      key: "candidate-intent",
      label: "Candidate Intent",
      journeyStep: "Candidate Intent",
      ownerRole: "deal-manager",
      consumerRoles: ["franchise-candidate", "reviewer"],
      status: segmentStatus({ ready: input.candidateActionModels > 0, releaseRequired: true }),
      recordSignal: `${input.candidateActionModels} guarded action models`,
      nextAction: "Keep intent writes and regulated checks locked until exact gate.",
      auditState: base.access.level === "scoped_stakeholder_status" ? "scoped" : "visible",
    },
    {
      key: "bank-package-readiness",
      label: "Bank Package Readiness",
      journeyStep: "Bank Package Readiness",
      ownerRole: "finance",
      consumerRoles: ["bank-partner", "deal-manager"],
      status: segmentStatus({ ready: input.bankReadyGates > 0, locked: true }),
      recordSignal: `${input.bankReadyGates} bank readiness gates ready`,
      nextAction: "Keep bank package release, bank send and payment initiation closed.",
      auditState: "locked",
    },
    {
      key: "opening-handoff",
      label: "Opening Handoff",
      journeyStep: "Opening Handoff",
      ownerRole: "franchise-partner",
      consumerRoles: ["landlord", "vendor", "studio-manager", "reviewer"],
      status: segmentStatus({ ready: input.openingHandoffItems > 0, blocked: input.openingBlockedItems > 0 }),
      recordSignal: `${input.openingHandoffItems} handoff items, ${input.openingBlockedItems} blockers`,
      nextAction: "Resolve handoff blockers before beta release decision.",
      auditState: base.access.level === "scoped_stakeholder_status" ? "scoped" : "visible",
    },
  ];
  const gateList = gates();

  return {
    ...base,
    summary: {
      ...base.summary,
      journeySegments: segmentList.length,
      readySegments: segmentList.filter((segment) => segment.status === "ready" || segment.status === "in_progress").length,
      blockedSegments: segmentList.filter((segment) => segment.status === "blocked").length,
      releaseRequiredSegments: segmentList.filter((segment) => segment.status === "release_required").length,
      lockedSegments: segmentList.filter((segment) => segment.status === "locked").length,
      auditEvents: events.length,
      roleScopes: base.visibleSurfaces.length,
    },
    segments: segmentList,
    auditEvents: events,
    gates: gateList,
  };
}
