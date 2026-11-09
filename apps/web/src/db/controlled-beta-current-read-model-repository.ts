import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getApplySandboxReadModel } from "./apply-sandbox-read-model-repository";
import { getAzSimulationReadModel } from "./az-simulation-read-model-repository";
import { getControlledBetaReadiness } from "./controlled-beta-readiness-repository";
import { getCrossToolObjectIdentityReadModel } from "./cross-tool-object-identity-read-model-repository";
import { getExternalPreflightReadModel } from "./external-preflight-read-model-repository";
import { getGoldenOperatingDatasetReadModel } from "./golden-operating-dataset-read-model-repository";
import { getMonitoringReadModel } from "./monitoring-read-model-repository";
import { getRoleScopeAuditReadModel } from "./role-scope-audit-read-model-repository";
import type { RoleKey } from "@/lib/roles";

type AccessLevel = "controlled_beta_control" | "controlled_beta_scope" | "forbidden";
type ReadinessStatus = "ready" | "attention" | "blocked" | "closed";
type EvidenceCategory = "data" | "workflow" | "permission" | "external" | "apply" | "monitoring" | "qa" | "legacy-gate";

export type ControlledBetaCurrentEvidence = {
  id: string;
  category: EvidenceCategory;
  label: string;
  status: ReadinessStatus;
  owner: string;
  source: string;
  metric: string;
  currentState: string;
  nextAction: string;
  href: string;
};

export type ControlledBetaRoleAcceptance = {
  role: string;
  status: "accepted_internal" | "scoped_ready" | "release_blocked" | "forbidden";
  evidence: string;
  remainingGate: string;
};

export type ControlledBetaBlocker = {
  key: string;
  severity: "decision_gate" | "operational_attention" | "release_blocker";
  label: string;
  owner: string;
  evidence: string;
  nextAction: string;
};

export type ControlledBetaCurrentReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
    canStageReadinessReview: boolean;
  };
  decision: {
    label: "Internal controlled beta rehearsal ready; external beta remains gated" | "Controlled beta readiness blocked";
    internalBetaRehearsalReady: boolean;
    externalBetaApproved: false;
    productionDeployApproved: false;
    releaseApproved: false;
    bankSendApproved: false;
    paymentApproved: false;
    applyApproved: false;
  };
  summary: {
    evidenceSections: number;
    readyEvidence: number;
    attentionEvidence: number;
    blockedEvidence: number;
    closedGateEvidence: number;
    qaCases: number;
    qaFailures: number;
    qaConsoleErrors: number;
    qaBadResponses: number;
    sourceMaps: number;
    objectClusters: number;
    simulations: number;
    roleScopeChecks: number;
    externalRooms: number;
    monitoringSignals: number;
    commandGatesClosed: number;
    blockers: number;
    releaseBlockers: number;
    openSideEffectGates: 0;
  };
  evidence: ControlledBetaCurrentEvidence[];
  roleAcceptance: ControlledBetaRoleAcceptance[];
  blockers: ControlledBetaBlocker[];
  exactGates: Array<{ key: string; label: string; state: "closed_prepared"; prerequisite: string }>;
  qaEvidence: {
    artifact: string;
    status: "ready" | "missing" | "failed";
    cases: number;
    failures: number;
    consoleErrors: number;
    badResponses: number;
    screenshots: number;
  };
  actions: {
    stageReadinessReviewAllowed: boolean;
    commandRoute: "/api/crays/core-command/sync-preview";
    confirmationHeader: "stage-sync-preview-command";
    applyGate: "OPEN_DEV_SYNC_APPLY";
  };
  boundaries: {
    betaReadinessReadsEnabled: true;
    betaLaunchEnabled: false;
    productionDeployEnabled: false;
    publicReleaseEnabled: false;
    candidateReleaseEnabled: false;
    ownerReleaseEnabled: false;
    bankReleaseEnabled: false;
    bankSendEnabled: false;
    paymentInitiationEnabled: false;
    financePostingEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    toolApplyEnabled: false;
    targetApplyEnabled: false;
    destructiveApplyEnabled: false;
    externalSendingEnabled: false;
    uploadsEnabled: false;
    privatePreviewEnabled: false;
    liveAiEnabled: false;
    productionVpsChangesEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "partial" | "forbidden";
};

type QaSummary = {
  caseCount?: number;
  failures?: unknown[];
  consoleErrors?: unknown[];
  badResponses?: unknown[];
  screenshots?: unknown[];
};

const controlRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedRoles: RoleKey[] = ["deal-manager", "finance", "studio-manager", "expansion-manager"];
const qaArtifact = "output/playwright/block68-manual-tab-qa/summary.json";

function accessFor(role: RoleKey): ControlledBetaCurrentReadModel["access"] {
  if (controlRoles.includes(role)) return { role, allowed: true, level: "controlled_beta_control", reason: "Role can review controlled beta readiness across evidence, blockers, roles and closed gates.", canStageReadinessReview: true };
  if (scopedRoles.includes(role)) return { role, allowed: true, level: "controlled_beta_scope", reason: "Role can inspect controlled beta readiness for its operating scope without approving release or apply gates.", canStageReadinessReview: false };
  return { role, allowed: false, level: "forbidden", reason: "Controlled beta readiness is internal beta-control scope only.", canStageReadinessReview: false };
}

function boundaries(): ControlledBetaCurrentReadModel["boundaries"] {
  return {
    betaReadinessReadsEnabled: true,
    betaLaunchEnabled: false,
    productionDeployEnabled: false,
    publicReleaseEnabled: false,
    candidateReleaseEnabled: false,
    ownerReleaseEnabled: false,
    bankReleaseEnabled: false,
    bankSendEnabled: false,
    paymentInitiationEnabled: false,
    financePostingEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    toolApplyEnabled: false,
    targetApplyEnabled: false,
    destructiveApplyEnabled: false,
    externalSendingEnabled: false,
    uploadsEnabled: false,
    privatePreviewEnabled: false,
    liveAiEnabled: false,
    productionVpsChangesEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function empty(role: RoleKey, queryStatus: ControlledBetaCurrentReadModel["queryStatus"]): ControlledBetaCurrentReadModel {
  const access = accessFor(role);
  return {
    access,
    decision: {
      label: "Controlled beta readiness blocked",
      internalBetaRehearsalReady: false,
      externalBetaApproved: false,
      productionDeployApproved: false,
      releaseApproved: false,
      bankSendApproved: false,
      paymentApproved: false,
      applyApproved: false,
    },
    summary: {
      evidenceSections: 0,
      readyEvidence: 0,
      attentionEvidence: 0,
      blockedEvidence: 0,
      closedGateEvidence: 0,
      qaCases: 0,
      qaFailures: 0,
      qaConsoleErrors: 0,
      qaBadResponses: 0,
      sourceMaps: 0,
      objectClusters: 0,
      simulations: 0,
      roleScopeChecks: 0,
      externalRooms: 0,
      monitoringSignals: 0,
      commandGatesClosed: 0,
      blockers: 0,
      releaseBlockers: 0,
      openSideEffectGates: 0,
    },
    evidence: [],
    roleAcceptance: [],
    blockers: [],
    exactGates: [],
    qaEvidence: { artifact: qaArtifact, status: "missing", cases: 0, failures: 0, consoleErrors: 0, badResponses: 0, screenshots: 0 },
    actions: { stageReadinessReviewAllowed: access.canStageReadinessReview, commandRoute: "/api/crays/core-command/sync-preview", confirmationHeader: "stage-sync-preview-command", applyGate: "OPEN_DEV_SYNC_APPLY" },
    boundaries: boundaries(),
    queryStatus,
  };
}

function readQaEvidence(): ControlledBetaCurrentReadModel["qaEvidence"] {
  const artifactPath = join(process.cwd(), qaArtifact);
  if (!existsSync(artifactPath)) return { artifact: qaArtifact, status: "missing", cases: 0, failures: 0, consoleErrors: 0, badResponses: 0, screenshots: 0 };
  const parsed = JSON.parse(readFileSync(artifactPath, "utf8")) as QaSummary;
  const failures = parsed.failures?.length ?? 0;
  const consoleErrors = parsed.consoleErrors?.length ?? 0;
  const badResponses = parsed.badResponses?.length ?? 0;
  return {
    artifact: qaArtifact,
    status: failures + consoleErrors + badResponses === 0 ? "ready" : "failed",
    cases: parsed.caseCount ?? 0,
    failures,
    consoleErrors,
    badResponses,
    screenshots: parsed.screenshots?.length ?? 0,
  };
}

function statusFromAttention(value: number): ReadinessStatus {
  return value > 0 ? "attention" : "ready";
}

export async function getControlledBetaCurrentReadModel(role: RoleKey): Promise<ControlledBetaCurrentReadModel> {
  const access = accessFor(role);
  if (!access.allowed) return empty(role, "forbidden");

  const [
    dataset,
    identity,
    simulations,
    roleScopes,
    preflight,
    sandbox,
    monitoring,
    legacyBeta,
  ] = await Promise.all([
    getGoldenOperatingDatasetReadModel("admin"),
    getCrossToolObjectIdentityReadModel("admin"),
    getAzSimulationReadModel("crays-management"),
    getRoleScopeAuditReadModel("admin"),
    getExternalPreflightReadModel("reviewer"),
    getApplySandboxReadModel("reviewer"),
    getMonitoringReadModel("reviewer"),
    getControlledBetaReadiness("admin"),
  ]);
  const qa = readQaEvidence();

  const evidence: ControlledBetaCurrentEvidence[] = [
    {
      id: "golden-operating-dataset",
      category: "data",
      label: "Golden Operating Dataset",
      status: dataset.summary.activePlaceholderHits === 0 && dataset.queryStatus === "schema_ready" ? "ready" : "blocked",
      owner: "Data Governance",
      source: "/api/crays/golden-operating-dataset/read-model",
      metric: `${dataset.summary.sourceMaps} source maps, ${dataset.summary.identities} identities, ${dataset.summary.activePlaceholderHits} active placeholder hits`,
      currentState: "The controlled beta rehearsal uses the realistic Core operating dataset instead of placeholder records.",
      nextAction: "Keep dataset under read-only QA until a future approved migration gate exists.",
      href: "/dashboard?role=admin&view=operating-dataset",
    },
    {
      id: "object-identity",
      category: "data",
      label: "Cross-tool Object Identity",
      status: statusFromAttention(identity.summary.conflicts),
      owner: "Data Governance",
      source: "/api/crays/object-identity/read-model",
      metric: `${identity.summary.clusters} clusters, ${identity.summary.sourceLinks} source links, ${identity.summary.conflicts} conflicts`,
      currentState: "Core object identity links source records, modules and workflow timelines for beta rehearsal.",
      nextAction: "Review conflicts as governed blockers; do not apply identity changes.",
      href: "/dashboard?role=admin&view=object-identity",
    },
    {
      id: "az-simulations",
      category: "workflow",
      label: "A-Z Simulations",
      status: simulations.summary.blockedSteps > 0 ? "attention" : "ready",
      owner: "CRAYS Management",
      source: "/api/crays/a-z-simulations/read-model",
      metric: `${simulations.summary.simulations} simulations, ${simulations.summary.steps} steps, ${simulations.summary.sourceRecords} source records`,
      currentState: "Five operating simulations prove the main beta workflows can be rehearsed end-to-end.",
      nextAction: "Use blocked steps as acceptance notes; do not release or apply actions.",
      href: "/dashboard?role=crays-management&view=az-simulations",
    },
    {
      id: "role-scopes",
      category: "permission",
      label: "Permissions and Role Scopes",
      status: roleScopes.summary.blockedRows > 0 || roleScopes.summary.redactedRows > 0 ? "attention" : "ready",
      owner: "Reviewer",
      source: "/api/crays/permissions/role-scope-audit/read-model",
      metric: `${roleScopes.summary.rows} checks, ${roleScopes.summary.blockedRows} blocked, ${roleScopes.summary.redactedRows} redacted`,
      currentState: "Role, record, field, command and redaction boundaries are explicit before beta exposure.",
      nextAction: "Keep redactions and blocked rows as beta guardrails until exact release decisions are approved.",
      href: "/dashboard?role=admin&view=role-scopes",
    },
    {
      id: "external-preflight",
      category: "external",
      label: "External Preflight",
      status: preflight.summary.blockedRooms > 0 || preflight.summary.missingPrerequisites > 0 ? "blocked" : "ready",
      owner: "Reviewer",
      source: "/api/crays/external-preflight/read-model",
      metric: `${preflight.summary.rooms} rooms, ${preflight.summary.blockedRooms} blocked, ${preflight.summary.missingPrerequisites} missing prerequisites`,
      currentState: "External audience rooms are prepared, but release and send gates remain closed.",
      nextAction: "Resolve prerequisites and run exact release review before any external preview or send.",
      href: "/dashboard?role=reviewer&view=external-preflight",
    },
    {
      id: "apply-sandbox",
      category: "apply",
      label: "Apply Sandbox",
      status: "closed",
      owner: "Admin",
      source: "/api/crays/apply-sandbox/read-model",
      metric: `${sandbox.summary.items} sandbox items, ${sandbox.summary.gateBlocked} gate-blocked, ${sandbox.summary.rollbackReady} rollback-ready`,
      currentState: "Apply behavior is reviewable as design and dry-run simulation only.",
      nextAction: "Do not promote any source, sync, tool, target or destructive apply without a future exact gate.",
      href: "/dashboard?role=reviewer&view=apply-sandbox",
    },
    {
      id: "monitoring",
      category: "monitoring",
      label: "Monitoring",
      status: monitoring.summary.blocked > 0 ? "attention" : "ready",
      owner: "Admin",
      source: "/api/crays/monitoring/read-model",
      metric: `${monitoring.summary.records} signals, ${monitoring.summary.blocked} blocked, ${monitoring.summary.commandGateBlocked} command gates closed`,
      currentState: "Runtime, source-health, sync-job, identity, command-gate and recovery signals are visible.",
      nextAction: "Review monitoring blockers as controlled beta operating risk; do not execute retries or applies.",
      href: "/dashboard?role=reviewer&view=monitoring",
    },
    {
      id: "manual-qa",
      category: "qa",
      label: "Manual Tab-by-Tab QA",
      status: qa.status === "ready" ? "ready" : "blocked",
      owner: "Reviewer",
      source: qa.artifact,
      metric: `${qa.cases} cases, ${qa.failures} failures, ${qa.consoleErrors} console errors, ${qa.badResponses} bad responses`,
      currentState: "Visible Block 42-67 surfaces have browser evidence with screenshots, search/filter/selection and boundary checks.",
      nextAction: "Keep the artifact with the beta readiness packet and rerun after any visible product change.",
      href: "/dashboard?role=reviewer&view=beta-readiness",
    },
    {
      id: "legacy-beta-gates",
      category: "legacy-gate",
      label: "Controlled Beta Gate Preparations",
      status: "closed",
      owner: "CRAYS Management",
      source: "/api/crays/beta-readiness/controlled/readiness",
      metric: `${legacyBeta.summary.exactGatePreparations} prepared exact gates, ${legacyBeta.summary.openedExactGates} opened gates, ${legacyBeta.summary.openSideEffectGates} side-effect gates`,
      currentState: "Earlier beta gate preparations remain available as closed gate evidence.",
      nextAction: "Use these preparations as decision inputs only; do not open gates in this block.",
      href: "/settings/data-sync?role=admin",
    },
  ];

  const blockers: ControlledBetaBlocker[] = [
    { key: "external-preflight", severity: "release_blocker", label: "External rooms are not release-approved", owner: "Reviewer", evidence: `${preflight.summary.blockedRooms} blocked rooms and ${preflight.summary.missingPrerequisites} missing prerequisites`, nextAction: "Resolve prerequisites and approve exact release gates later." },
    { key: "apply-gates", severity: "decision_gate", label: "Apply gates are deliberately closed", owner: "Admin", evidence: `${sandbox.summary.gateBlocked} sandbox items remain gate-blocked`, nextAction: "Keep apply simulation in review-only mode." },
    { key: "monitoring-blockers", severity: "operational_attention", label: "Monitoring shows controlled operating blockers", owner: "Admin", evidence: `${monitoring.summary.blocked} blocked monitoring signals and ${monitoring.summary.attention} attention signals`, nextAction: "Review owners and recovery actions before external beta." },
    { key: "role-redactions", severity: "operational_attention", label: "Role-scope redactions remain active", owner: "Reviewer", evidence: `${roleScopes.summary.blockedRows} blocked and ${roleScopes.summary.redactedRows} redacted checks`, nextAction: "Keep redactions as guardrails until exact audience gates open." },
    { key: "production-release", severity: "decision_gate", label: "Production deploy and releases are closed", owner: "CRAYS Management", evidence: "0 opened side-effect gates in current and legacy beta readiness.", nextAction: "Prepare the decision packet; do not deploy or release." },
  ];
  const releaseBlockers = blockers.filter((blocker) => blocker.severity === "release_blocker" || blocker.severity === "decision_gate").length;
  const rehearsalReady = qa.status === "ready" && dataset.summary.activePlaceholderHits === 0 && evidence.every((item) => item.status !== "blocked" || item.id === "external-preflight");

  return {
    access,
    decision: {
      label: rehearsalReady ? "Internal controlled beta rehearsal ready; external beta remains gated" : "Controlled beta readiness blocked",
      internalBetaRehearsalReady: rehearsalReady,
      externalBetaApproved: false,
      productionDeployApproved: false,
      releaseApproved: false,
      bankSendApproved: false,
      paymentApproved: false,
      applyApproved: false,
    },
    summary: {
      evidenceSections: evidence.length,
      readyEvidence: evidence.filter((item) => item.status === "ready").length,
      attentionEvidence: evidence.filter((item) => item.status === "attention").length,
      blockedEvidence: evidence.filter((item) => item.status === "blocked").length,
      closedGateEvidence: evidence.filter((item) => item.status === "closed").length,
      qaCases: qa.cases,
      qaFailures: qa.failures,
      qaConsoleErrors: qa.consoleErrors,
      qaBadResponses: qa.badResponses,
      sourceMaps: dataset.summary.sourceMaps,
      objectClusters: identity.summary.clusters,
      simulations: simulations.summary.simulations,
      roleScopeChecks: roleScopes.summary.rows,
      externalRooms: preflight.summary.rooms,
      monitoringSignals: monitoring.summary.records,
      commandGatesClosed: monitoring.summary.commandGateBlocked,
      blockers: blockers.length,
      releaseBlockers,
      openSideEffectGates: 0,
    },
    evidence,
    roleAcceptance: [
      { role: "CRAYS Management", status: "accepted_internal", evidence: `${simulations.summary.simulations} simulations and ${qa.cases} QA cases reviewed`, remainingGate: "External beta approval remains closed." },
      { role: "Admin", status: "accepted_internal", evidence: `${dataset.summary.sourceMaps} source maps, ${identity.summary.clusters} identity clusters and ${monitoring.summary.records} monitoring signals`, remainingGate: "Production deploy and apply gates remain closed." },
      { role: "Reviewer", status: "accepted_internal", evidence: `${roleScopes.summary.rows} role-scope checks and ${preflight.summary.rooms} preflight rooms`, remainingGate: "Release and send gates remain closed." },
      { role: "Deal Manager", status: "scoped_ready", evidence: "Candidate Offer, Opening Project, Bank Package and A-Z simulation paths passed visible QA.", remainingGate: "Candidate release and external send remain closed." },
      { role: "Finance", status: "scoped_ready", evidence: "ERP Finance Ledger, Member Payment Recovery and Bank Package paths passed visible QA.", remainingGate: "Payment, posting, export and bank send remain closed." },
      { role: "Studio Manager", status: "scoped_ready", evidence: "Operations, Member Database, Studio Recovery and Support Recovery paths passed visible QA.", remainingGate: "External member send, refund/payment execution and apply remain closed." },
      { role: "Franchise Partner", status: "release_blocked", evidence: "Partner room exists in preflight but is not released.", remainingGate: "Partner release gate remains closed." },
      { role: "Bank Partner", status: "release_blocked", evidence: "Bank preflight room exists with bank send closed.", remainingGate: "Bank package release and bank send remain closed." },
      { role: "Guest", status: "forbidden", evidence: "Guest boundaries were verified for Monitoring and External Preflight.", remainingGate: "Public release remains closed." },
    ],
    blockers,
    exactGates: legacyBeta.exactGatePreparations.map((gate) => ({ key: gate.key, label: gate.label, state: "closed_prepared", prerequisite: gate.prerequisite })),
    qaEvidence: qa,
    actions: { stageReadinessReviewAllowed: access.canStageReadinessReview, commandRoute: "/api/crays/core-command/sync-preview", confirmationHeader: "stage-sync-preview-command", applyGate: "OPEN_DEV_SYNC_APPLY" },
    boundaries: boundaries(),
    queryStatus: qa.status === "missing" ? "partial" : "schema_ready",
  };
}
