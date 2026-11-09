import type { CrossRoleAuditPilotReadiness } from "./pilot-cross-role-audit-contract";
import type { RoleKey } from "./roles";

const closeoutRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager"];

type CloseoutAccessLevel = "internal_release_decision_board" | "forbidden";
type CloseoutDecisionStatus = "ready_for_beta_scope" | "blocked" | "closed";

export type PilotCloseoutReleaseDecisionAccess = {
  allowed: boolean;
  level: CloseoutAccessLevel;
  reason: string;
};

export type PilotCloseoutDecision = {
  key: string;
  label: string;
  status: CloseoutDecisionStatus;
  ownerRole: RoleKey;
  evidence: string;
  decision: string;
};

export type PilotCloseoutRisk = {
  key: string;
  label: string;
  severity: "high" | "medium" | "low";
  ownerRole: RoleKey;
  mitigation: string;
};

export type PilotCloseoutReleaseDecisionBoundary = {
  pilotCloseoutReadModelEnabled: true;
  betaScopeDecisionPrepared: true;
  automaticBetaApprovalEnabled: false;
  productionDeployEnabled: false;
  liveExternalReadsEnabled: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  toolApplyEnabled: false;
  ownerSubmissionWritesEnabled: false;
  fileUploadEnabled: false;
  externalSendingEnabled: false;
  candidateReleaseEnabled: false;
  bankReleaseEnabled: false;
  publicReleaseEnabled: false;
  regulatedChecksStarted: false;
  financeWritesEnabled: false;
  bankSendEnabled: false;
  paymentInitiationEnabled: false;
  vpsChangingWorkEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type PilotCloseoutReleaseDecisionReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: PilotCloseoutReleaseDecisionAccess;
  blockRange: "Blocks 691-700";
  journeySegment: "Pilot Closeout / Release Decision";
  ownerRoles: RoleKey[];
  consumingRoles: RoleKey[];
  summary: {
    pilotBlocksClosed: number;
    journeySegmentsReviewed: number;
    auditEventsReviewed: number;
    readySegments: number;
    blockedSegments: number;
    lockedSegments: number;
    decisions: number;
    betaScopeReadyDecisions: number;
    blockedDecisions: number;
    risks: number;
    highRisks: number;
    gatesReviewed: number;
    openSideEffectGates: 0;
  };
  decisions: PilotCloseoutDecision[];
  risks: PilotCloseoutRisk[];
  qaEvidence: Array<{ key: string; label: string; state: "passed" | "required" | "deferred"; evidence: string }>;
  gates: Array<{ key: string; label: string; state: "closed" | "prepared" | "blocked"; reason: string }>;
  nextBetaInputs: Array<{ blockRange: string; input: string }>;
  boundaries: PilotCloseoutReleaseDecisionBoundary;
  liveBusinessRecordsReturned: false;
  betaApproved: false;
  productionDeployPerformed: false;
  externalActionsPerformed: false;
};

export function pilotCloseoutReleaseDecisionAccessForRole(role: RoleKey): PilotCloseoutReleaseDecisionAccess {
  if (closeoutRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_release_decision_board",
      reason: "Role can review pilot closeout, QA, risks and exact beta gate decisions without approving production or release execution.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Pilot closeout decision board requires CRAYS internal release decision scope.",
  };
}

function boundary(): PilotCloseoutReleaseDecisionBoundary {
  return {
    pilotCloseoutReadModelEnabled: true,
    betaScopeDecisionPrepared: true,
    automaticBetaApprovalEnabled: false,
    productionDeployEnabled: false,
    liveExternalReadsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    ownerSubmissionWritesEnabled: false,
    fileUploadEnabled: false,
    externalSendingEnabled: false,
    candidateReleaseEnabled: false,
    bankReleaseEnabled: false,
    publicReleaseEnabled: false,
    regulatedChecksStarted: false,
    financeWritesEnabled: false,
    bankSendEnabled: false,
    paymentInitiationEnabled: false,
    vpsChangingWorkEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function decisions(input: CrossRoleAuditPilotReadiness): PilotCloseoutDecision[] {
  return [
    {
      key: "beta-scope",
      label: "Move pilot findings into beta scope",
      status: "ready_for_beta_scope",
      ownerRole: "crays-management",
      evidence: `${input.summary.journeySegments} journey segments and ${input.summary.auditEvents} audit events reviewed.`,
      decision: "Prepare controlled beta scope; do not open production or release gates.",
    },
    {
      key: "candidate-release",
      label: "Candidate release",
      status: "closed",
      ownerRole: "deal-manager",
      evidence: `${input.summary.releaseRequiredSegments} segments still require release decisions.`,
      decision: "Remain closed until exact Candidate release gate.",
    },
    {
      key: "bank-release",
      label: "Bank package release",
      status: "closed",
      ownerRole: "finance",
      evidence: `${input.summary.lockedSegments} locked bank-readiness segment.`,
      decision: "Remain closed until regulated, consent and bank package release gates are explicitly approved.",
    },
    {
      key: "project-apply",
      label: "Project and Operations apply",
      status: input.summary.blockedSegments > 0 ? "blocked" : "ready_for_beta_scope",
      ownerRole: "deal-manager",
      evidence: `${input.summary.blockedSegments} blocked segment in the pilot chain.`,
      decision: "Prepare low-risk beta apply gate only after blockers and rollback evidence are reviewed.",
    },
    {
      key: "external-communication",
      label: "External communication",
      status: "closed",
      ownerRole: "reviewer",
      evidence: "Preview and consent readiness exist; send execution is not approved.",
      decision: "Remain closed until reviewed send gate.",
    },
  ];
}

function risks(input: CrossRoleAuditPilotReadiness): PilotCloseoutRisk[] {
  return [
    {
      key: "opening-blockers",
      label: "Opening handoff blockers",
      severity: input.summary.blockedSegments > 0 ? "high" : "medium",
      ownerRole: "deal-manager",
      mitigation: "Use Project and Operations queues to clear blockers before beta release decision.",
    },
    {
      key: "release-pressure",
      label: "Release pressure before regulated readiness",
      severity: "high",
      ownerRole: "reviewer",
      mitigation: "Keep Candidate, Bank and Public release gates separate and exact.",
    },
    {
      key: "visibility-expansion",
      label: "Unreviewed cross-role visibility",
      severity: "medium",
      ownerRole: "admin",
      mitigation: "Use role-scoped aggregate dashboards until permission regressions pass.",
    },
    {
      key: "beta-apply-scope",
      label: "Apply gate blast radius",
      severity: "medium",
      ownerRole: "admin",
      mitigation: "Approve only one low-risk command with rollback, idempotency and audit evidence.",
    },
  ];
}

function qaEvidence(): PilotCloseoutReleaseDecisionReadiness["qaEvidence"] {
  return [
    { key: "contract-verifier", label: "Contract route verifier", state: "required", evidence: "Run after Blocks 691-700 routes are added." },
    { key: "typescript", label: "TypeScript", state: "required", evidence: "Run after closeout UI wiring." },
    { key: "forbidden-wording", label: "Forbidden product wording scan", state: "required", evidence: "Scan product source and scripts before handoff." },
    { key: "browser-smoke", label: "Visible workflow smoke", state: "required", evidence: "Dashboard, Settings, CRM, Project, Files, Loans, Operations and Candidate portal." },
    { key: "release-gates", label: "Release gates", state: "passed", evidence: "All closeout boundaries keep side-effect gates false." },
  ];
}

function gates(): PilotCloseoutReleaseDecisionReadiness["gates"] {
  return [
    { key: "beta-scope", label: "Beta scope", state: "prepared", reason: "Pilot findings can feed Blocks 701-800." },
    { key: "candidate-release", label: "Candidate release", state: "closed", reason: "No exact Candidate release gate opened." },
    { key: "bank-release", label: "Bank release", state: "closed", reason: "No regulated or bank send gate opened." },
    { key: "tool-apply", label: "Tool apply", state: "blocked", reason: "Apply requires rollback and exact gate." },
    { key: "external-send", label: "External sending", state: "closed", reason: "Reviewed send gate not opened." },
    { key: "production", label: "Production deploy", state: "closed", reason: "No deployment approval." },
  ];
}

function nextBetaInputs(): PilotCloseoutReleaseDecisionReadiness["nextBetaInputs"] {
  return [
    { blockRange: "701-710", input: "Translate pilot findings into beta roles, flows, records and risk limits." },
    { blockRange: "711-720", input: "Define Dev, Pilot and Beta data boundaries, backup, reset and retention." },
    { blockRange: "721-730", input: "Regression-test permissions, consent, audit and external-room scope." },
    { blockRange: "731-750", input: "Prepare exact live-read and low-risk apply gates without opening them automatically." },
  ];
}

export function emptyPilotCloseoutReleaseDecisionReadiness(role: RoleKey): PilotCloseoutReleaseDecisionReadiness {
  const access = pilotCloseoutReleaseDecisionAccessForRole(role);

  return {
    status: access.allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 691-700",
    journeySegment: "Pilot Closeout / Release Decision",
    ownerRoles: ["crays-management", "reviewer", "deal-manager"],
    consumingRoles: ["admin", "finance", "expansion-manager", "franchise-candidate", "bank-partner", "franchise-partner"],
    summary: {
      pilotBlocksClosed: 0,
      journeySegmentsReviewed: 0,
      auditEventsReviewed: 0,
      readySegments: 0,
      blockedSegments: 0,
      lockedSegments: 0,
      decisions: 0,
      betaScopeReadyDecisions: 0,
      blockedDecisions: 0,
      risks: 0,
      highRisks: 0,
      gatesReviewed: 0,
      openSideEffectGates: 0,
    },
    decisions: [],
    risks: [],
    qaEvidence: [],
    gates: [],
    nextBetaInputs: access.allowed ? nextBetaInputs() : [],
    boundaries: boundary(),
    liveBusinessRecordsReturned: false,
    betaApproved: false,
    productionDeployPerformed: false,
    externalActionsPerformed: false,
  };
}

export function buildPilotCloseoutReleaseDecisionReadiness(
  role: RoleKey,
  input: {
    crossRole: CrossRoleAuditPilotReadiness;
  },
): PilotCloseoutReleaseDecisionReadiness {
  const base = emptyPilotCloseoutReleaseDecisionReadiness(role);
  const decisionList = decisions(input.crossRole);
  const riskList = risks(input.crossRole);
  const gateList = gates();

  return {
    ...base,
    summary: {
      pilotBlocksClosed: 10,
      journeySegmentsReviewed: input.crossRole.summary.journeySegments,
      auditEventsReviewed: input.crossRole.summary.auditEvents,
      readySegments: input.crossRole.summary.readySegments,
      blockedSegments: input.crossRole.summary.blockedSegments,
      lockedSegments: input.crossRole.summary.lockedSegments,
      decisions: decisionList.length,
      betaScopeReadyDecisions: decisionList.filter((decision) => decision.status === "ready_for_beta_scope").length,
      blockedDecisions: decisionList.filter((decision) => decision.status === "blocked").length,
      risks: riskList.length,
      highRisks: riskList.filter((risk) => risk.severity === "high").length,
      gatesReviewed: gateList.length,
      openSideEffectGates: 0,
    },
    decisions: decisionList,
    risks: riskList,
    qaEvidence: qaEvidence(),
    gates: gateList,
  };
}
