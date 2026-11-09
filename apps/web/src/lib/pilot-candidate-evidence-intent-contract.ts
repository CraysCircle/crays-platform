import type { RoleKey } from "./roles";

const internalCandidateEvidenceIntentRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager"];
const scopedCandidateEvidenceIntentRoles: RoleKey[] = ["franchise-candidate"];

type CandidateEvidenceIntentAccessLevel = "internal_evidence_intent_control" | "candidate_guarded_action_shell" | "forbidden";
type CandidateEvidenceIntentStageStatus = "ready" | "model_ready" | "release_required" | "locked";
type CandidateEvidenceIntentFunctionState = "represented" | "deferred_until_exact_gate";

export type CandidateEvidenceIntentPilotAccess = {
  allowed: boolean;
  level: CandidateEvidenceIntentAccessLevel;
  reason: string;
};

export type CandidateEvidenceIntentPilotBoundary = {
  coreDevPilotDataAllowed: true;
  candidateDealRoomReadsEnabled: true;
  candidateEvidenceReadsEnabled: true;
  candidateIntentReviewReadsEnabled: boolean;
  candidateQuestionCommandsModeled: true;
  candidateIntentGuardedWriteModeled: true;
  candidateChecklistCommandsModeled: true;
  candidateQuestionCommandWritesEnabled: false;
  checklistCommandWritesEnabled: false;
  candidateVisibleRecordsEnabled: false;
  candidateReleaseEnabled: false;
  publicReleaseEnabled: false;
  bankReleaseEnabled: false;
  regulatedChecksStarted: false;
  purchaseIntentWritesEnabled: false;
  financingIntentWritesEnabled: false;
  fileUploadEnabled: false;
  liveExternalReadsEnabled: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  toolApplyEnabled: false;
  externalSendingEnabled: false;
  bankWorkflowStartEnabled: false;
  bankPackageCreationEnabled: false;
  bankSendEnabled: false;
  paymentInitiationEnabled: false;
  financeWritesEnabled: false;
  liveAiCallsEnabled: false;
  productionDeployEnabled: false;
  vpsChangingWorkEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type CandidateEvidenceIntentPilotStage = {
  key: string;
  label: string;
  status: CandidateEvidenceIntentStageStatus;
  current: string;
  requiredFor: string;
};

export type CandidateEvidenceIntentPilotActionModel = {
  key: "candidate-question" | "purchase-financing-intent" | "review-checklist";
  label: string;
  moduleSurface: "CRM" | "Sites" | "Files";
  commandBoundary: string;
  guardedRoute: string;
  actorRoles: RoleKey[];
  status: "model_ready" | "release_required";
  applyGate: string;
  current: string;
};

export type CandidateEvidenceIntentPilotReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: CandidateEvidenceIntentPilotAccess;
  blockRange: "Blocks 651-660";
  journeySegment: "Candidate Intent";
  ownerRoles: RoleKey[];
  consumingRoles: RoleKey[];
  summary: {
    internalAssemblyPackages: number;
    candidateVisiblePackages: 0;
    releasedOffers: number;
    evidenceOffers: number;
    evidencePackages: number;
    approvedDocumentLinks: number;
    intentRecords: number;
    purchaseIntents: number;
    financingIntents: number;
    questionThreads: number;
    messages: number;
    actionModels: number;
    guardedCommandBoundaries: number;
    readinessGates: number;
    readyGates: number;
    visibleSurfaces: number;
    preservedFunctions: number;
    openSideEffectGates: 0;
    realCoreRecordsReturned: boolean;
  };
  stages: CandidateEvidenceIntentPilotStage[];
  actionModels: CandidateEvidenceIntentPilotActionModel[];
  visibleSurfaces: Array<{
    surface: string;
    roleUse: string;
  }>;
  preservedFunctions: Array<{
    key: string;
    label: string;
    state: CandidateEvidenceIntentFunctionState;
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
  boundaries: CandidateEvidenceIntentPilotBoundary;
  liveBusinessRecordsReturned: boolean;
  candidateVisibleRecordsReturned: false;
  commandRecordsWritten: false;
  intentRecordsWritten: false;
};

export function candidateEvidenceIntentPilotAccessForRole(role: RoleKey): CandidateEvidenceIntentPilotAccess {
  if (internalCandidateEvidenceIntentRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_evidence_intent_control",
      reason: "Role can review Candidate evidence, questions, intent and guarded command readiness before release.",
    };
  }

  if (scopedCandidateEvidenceIntentRoles.includes(role)) {
    return {
      allowed: true,
      level: "candidate_guarded_action_shell",
      reason: "Role can see the Candidate action shell only; no unreleased package, evidence or intent records are returned.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Candidate Evidence and Intent pilot access requires internal deal scope or Franchise Candidate scope.",
  };
}

export function candidateEvidenceIntentPilotBoundary(input: {
  intentReviewAllowed: boolean;
}): CandidateEvidenceIntentPilotBoundary {
  return {
    coreDevPilotDataAllowed: true,
    candidateDealRoomReadsEnabled: true,
    candidateEvidenceReadsEnabled: true,
    candidateIntentReviewReadsEnabled: input.intentReviewAllowed,
    candidateQuestionCommandsModeled: true,
    candidateIntentGuardedWriteModeled: true,
    candidateChecklistCommandsModeled: true,
    candidateQuestionCommandWritesEnabled: false,
    checklistCommandWritesEnabled: false,
    candidateVisibleRecordsEnabled: false,
    candidateReleaseEnabled: false,
    publicReleaseEnabled: false,
    bankReleaseEnabled: false,
    regulatedChecksStarted: false,
    purchaseIntentWritesEnabled: false,
    financingIntentWritesEnabled: false,
    fileUploadEnabled: false,
    liveExternalReadsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    externalSendingEnabled: false,
    bankWorkflowStartEnabled: false,
    bankPackageCreationEnabled: false,
    bankSendEnabled: false,
    paymentInitiationEnabled: false,
    financeWritesEnabled: false,
    liveAiCallsEnabled: false,
    productionDeployEnabled: false,
    vpsChangingWorkEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function visibleSurfaces(): CandidateEvidenceIntentPilotReadiness["visibleSurfaces"] {
  return [
    { surface: "Sites", roleUse: "Candidate sees only the guarded evidence and action shell." },
    { surface: "CRM", roleUse: "Deal Manager reviews questions, intent readiness and follow-up actions." },
    { surface: "Files", roleUse: "Review checklist and evidence/package actions remain guarded before release." },
    { surface: "Settings", roleUse: "Admin and reviewers inspect command readiness, gates and QA." },
  ];
}

function preservedFunctions(): CandidateEvidenceIntentPilotReadiness["preservedFunctions"] {
  return [
    { key: "candidate-questions", label: "Candidate questions and Deal Manager follow-up command intent", state: "represented" },
    { key: "evidence-readiness", label: "Released evidence and document readiness state", state: "represented" },
    { key: "purchase-financing-intent", label: "Purchase and financing intent preparation", state: "represented" },
    { key: "review-checklist", label: "Package review checklist and evidence action model", state: "represented" },
    { key: "regulated-prep", label: "KYC/AML, equity check and source-of-funds start", state: "deferred_until_exact_gate" },
    { key: "bank-workflow", label: "Bank package workflow start and lender release", state: "deferred_until_exact_gate" },
  ];
}

function actionModels(input: {
  releasedOffers: number;
  communicationReady: boolean;
  intentPersistenceReady: boolean;
  coreCommandStoreReady: boolean;
}): CandidateEvidenceIntentPilotReadiness["actionModels"] {
  return [
    {
      key: "candidate-question",
      label: "Ask Deal Manager",
      moduleSurface: "CRM",
      commandBoundary: "crm.activity.log_or_task",
      guardedRoute: "/api/crays/core-command/crm-activity",
      actorRoles: ["franchise-candidate", "deal-manager"],
      status: input.coreCommandStoreReady && input.communicationReady ? "model_ready" : "release_required",
      applyGate: "OPEN_DEV_CRM_ACTIVITY_APPLY",
      current: input.communicationReady ? "Question command model ready; external sending remains Off." : "Communication persistence required.",
    },
    {
      key: "purchase-financing-intent",
      label: "Purchase or financing intent",
      moduleSurface: "Sites",
      commandBoundary: "candidate.intent.guarded_write",
      guardedRoute: "/api/crays/candidate/prepared-offers/intent",
      actorRoles: ["franchise-candidate"],
      status: input.releasedOffers > 0 && input.intentPersistenceReady ? "model_ready" : "release_required",
      applyGate: "CREATE_CANDIDATE_INTENT_DEV_ONLY",
      current: input.intentPersistenceReady ? "Intent persistence ready; released offer required before any dev intent write." : "Intent persistence required.",
    },
    {
      key: "review-checklist",
      label: "Review checklist action",
      moduleSurface: "Files",
      commandBoundary: "files.package.metadata_link",
      guardedRoute: "/api/crays/core-command/files-package",
      actorRoles: ["deal-manager", "reviewer", "franchise-candidate"],
      status: input.coreCommandStoreReady ? "model_ready" : "release_required",
      applyGate: "OPEN_DEV_FILES_PACKAGE_APPLY",
      current: "Checklist and evidence-reference command model ready; upload and release remain Off.",
    },
  ];
}

function gates(input: {
  dealRoomShellReady: boolean;
  evidenceReady: boolean;
  communicationReady: boolean;
  intentPersistenceReady: boolean;
  coreCommandStoreReady: boolean;
}): CandidateEvidenceIntentPilotReadiness["gates"] {
  return [
    {
      key: "deal-room-shell",
      label: "Candidate Deal Room shell",
      ready: input.dealRoomShellReady,
      current: input.dealRoomShellReady ? "Shell sections are available." : "Shell sections pending.",
    },
    {
      key: "evidence-release",
      label: "Evidence release",
      ready: input.evidenceReady,
      current: input.evidenceReady ? "Candidate evidence records are released." : "No Candidate-visible evidence records.",
    },
    {
      key: "communication-persistence",
      label: "Communication persistence",
      ready: input.communicationReady,
      current: input.communicationReady ? "Schema ready, external sending Off." : "Communication schema pending.",
    },
    {
      key: "intent-persistence",
      label: "Intent persistence",
      ready: input.intentPersistenceReady,
      current: input.intentPersistenceReady ? "Schema ready, intent writes guarded." : "Intent schema pending.",
    },
    {
      key: "core-command-store",
      label: "Core command store",
      ready: input.coreCommandStoreReady,
      current: input.coreCommandStoreReady ? "Command store ready, apply gates closed." : "Command store pending.",
    },
    {
      key: "bank-workflow",
      label: "Bank workflow start",
      ready: false,
      current: "Closed until Candidate, regulated and deal-review gates are opened.",
    },
  ];
}

function nextBlockInputs(): CandidateEvidenceIntentPilotReadiness["nextBlockInputs"] {
  return [
    {
      blockRange: "661-670",
      requiredInput: "Bank Evidence Package can only read release-gated shell state after Candidate intent and regulated prerequisites remain explicit.",
    },
    {
      blockRange: "671-680",
      requiredInput: "Opening Handoff stays internal until approved Candidate state can be mapped into Project, Files and Operations command models.",
    },
  ];
}

export function buildCandidateEvidenceIntentPilotStages(input: {
  candidateVisiblePackages: number;
  evidencePackages: number;
  approvedDocumentLinks: number;
  communicationReady: boolean;
  intentPersistenceReady: boolean;
  coreCommandStoreReady: boolean;
  intentRecords: number;
}): CandidateEvidenceIntentPilotStage[] {
  return [
    {
      key: "deal-room-shell",
      label: "Candidate action shell",
      status: input.candidateVisiblePackages > 0 ? "ready" : "release_required",
      current: `${input.candidateVisiblePackages} Candidate-visible packages`,
      requiredFor: "Candidate evidence and action visibility",
    },
    {
      key: "evidence",
      label: "Evidence and documents",
      status: input.evidencePackages > 0 || input.approvedDocumentLinks > 0 ? "ready" : "release_required",
      current: `${input.evidencePackages} evidence packages, ${input.approvedDocumentLinks} approved document links`,
      requiredFor: "Candidate diligence before intent",
    },
    {
      key: "question-command",
      label: "Question command",
      status: input.coreCommandStoreReady && input.communicationReady ? "model_ready" : "release_required",
      current: input.communicationReady ? "Command model ready; external sending closed" : "Communication persistence required",
      requiredFor: "Deal Manager follow-up inside CRAYS",
    },
    {
      key: "intent-command",
      label: "Purchase and financing intent",
      status: input.intentRecords > 0 ? "ready" : input.intentPersistenceReady ? "release_required" : "locked",
      current: `${input.intentRecords} intent records, writes guarded`,
      requiredFor: "Regulated preparation",
    },
    {
      key: "checklist-command",
      label: "Review checklist",
      status: input.coreCommandStoreReady ? "model_ready" : "release_required",
      current: "Files checklist command model ready; apply closed",
      requiredFor: "Package and evidence action review",
    },
    {
      key: "bank-workflow",
      label: "Bank workflow",
      status: "locked",
      current: "Bank workflow start closed",
      requiredFor: "Bank Evidence Package",
    },
  ];
}

export function emptyCandidateEvidenceIntentPilotReadiness(role: RoleKey): CandidateEvidenceIntentPilotReadiness {
  const access = candidateEvidenceIntentPilotAccessForRole(role);
  const surfaceList = access.allowed ? visibleSurfaces() : [];
  const functionList = access.allowed ? preservedFunctions() : [];
  const boundary = candidateEvidenceIntentPilotBoundary({
    intentReviewAllowed: access.level === "internal_evidence_intent_control",
  });

  return {
    status: access.allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 651-660",
    journeySegment: "Candidate Intent",
    ownerRoles: ["deal-manager", "franchise-candidate"],
    consumingRoles: ["reviewer", "crays-management"],
    summary: {
      internalAssemblyPackages: 0,
      candidateVisiblePackages: 0,
      releasedOffers: 0,
      evidenceOffers: 0,
      evidencePackages: 0,
      approvedDocumentLinks: 0,
      intentRecords: 0,
      purchaseIntents: 0,
      financingIntents: 0,
      questionThreads: 0,
      messages: 0,
      actionModels: 0,
      guardedCommandBoundaries: 0,
      readinessGates: 0,
      readyGates: 0,
      visibleSurfaces: surfaceList.length,
      preservedFunctions: functionList.length,
      openSideEffectGates: 0,
      realCoreRecordsReturned: false,
    },
    stages: [],
    actionModels: [],
    visibleSurfaces: surfaceList,
    preservedFunctions: functionList,
    gates: [],
    nextBlockInputs: access.allowed ? nextBlockInputs() : [],
    boundaries: boundary,
    liveBusinessRecordsReturned: false,
    candidateVisibleRecordsReturned: false,
    commandRecordsWritten: false,
    intentRecordsWritten: false,
  };
}

export function buildCandidateEvidenceIntentPilotReadiness(
  role: RoleKey,
  input: {
    internalAssemblyPackages: number;
    candidateVisiblePackages: 0;
    releasedOffers: number;
    evidenceOffers: number;
    evidencePackages: number;
    approvedDocumentLinks: number;
    intentRecords: number;
    purchaseIntents: number;
    financingIntents: number;
    questionThreads: number;
    messages: number;
    communicationReady: boolean;
    intentPersistenceReady: boolean;
    coreCommandStoreReady: boolean;
    liveBusinessRecordsReturned: boolean;
  },
): CandidateEvidenceIntentPilotReadiness {
  const base = emptyCandidateEvidenceIntentPilotReadiness(role);
  const actionList = actionModels(input);
  const gateList = gates({
    dealRoomShellReady: input.releasedOffers > 0 || input.questionThreads >= 0,
    evidenceReady: input.evidencePackages > 0 || input.approvedDocumentLinks > 0,
    communicationReady: input.communicationReady,
    intentPersistenceReady: input.intentPersistenceReady,
    coreCommandStoreReady: input.coreCommandStoreReady,
  });

  return {
    ...base,
    summary: {
      ...base.summary,
      internalAssemblyPackages: input.internalAssemblyPackages,
      releasedOffers: input.releasedOffers,
      evidenceOffers: input.evidenceOffers,
      evidencePackages: input.evidencePackages,
      approvedDocumentLinks: input.approvedDocumentLinks,
      intentRecords: input.intentRecords,
      purchaseIntents: input.purchaseIntents,
      financingIntents: input.financingIntents,
      questionThreads: input.questionThreads,
      messages: input.messages,
      actionModels: actionList.length,
      guardedCommandBoundaries: actionList.length,
      readinessGates: gateList.length,
      readyGates: gateList.filter((gate) => gate.ready).length,
      realCoreRecordsReturned: input.liveBusinessRecordsReturned,
    },
    stages: buildCandidateEvidenceIntentPilotStages(input),
    actionModels: actionList,
    gates: gateList,
    liveBusinessRecordsReturned: input.liveBusinessRecordsReturned,
  };
}
