import type { RoleKey } from "./roles";

const internalCandidateDealRoomRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager"];
const scopedCandidateDealRoomRoles: RoleKey[] = ["franchise-candidate"];

type CandidateDealRoomPilotAccessLevel = "internal_candidate_room_control" | "candidate_release_gated_shell" | "forbidden";

export type CandidateDealRoomPilotAccess = {
  allowed: boolean;
  level: CandidateDealRoomPilotAccessLevel;
  reason: string;
};

export type CandidateDealRoomPilotBoundary = {
  coreDevPilotDataAllowed: true;
  preparedDealAssemblyReadsEnabled: true;
  candidateShellEnabled: true;
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

export type CandidateDealRoomPilotStage = {
  key: string;
  label: string;
  status: "ready" | "release_required" | "locked";
  current: string;
  requiredFor: string;
};

export type CandidateDealRoomPilotReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: CandidateDealRoomPilotAccess;
  blockRange: "Blocks 641-650";
  journeySegment: "Candidate Intent";
  ownerRoles: RoleKey[];
  consumingRoles: RoleKey[];
  summary: {
    internalAssemblyPackages: number;
    candidateVisiblePackages: 0;
    releasedOffers: number;
    sections: number;
    releaseRequiredSections: number;
    regulatedLockedSections: number;
    readinessGates: number;
    readyGates: number;
    messages: number;
    threads: number;
    visibleSurfaces: number;
    preservedFunctions: number;
    openSideEffectGates: 0;
    realCoreRecordsReturned: boolean;
  };
  stages: CandidateDealRoomPilotStage[];
  visibleSurfaces: Array<{
    surface: string;
    roleUse: string;
  }>;
  preservedFunctions: Array<{
    key: string;
    label: string;
    state: "represented" | "deferred_until_exact_gate";
  }>;
  gates: Array<{
    key: string;
    label: string;
    state: "closed" | "read_only";
  }>;
  nextBlockInputs: Array<{
    blockRange: string;
    requiredInput: string;
  }>;
  boundaries: CandidateDealRoomPilotBoundary;
  liveBusinessRecordsReturned: boolean;
  candidateVisibleRecordsReturned: false;
  commandRecordsWritten: false;
};

export function candidateDealRoomPilotAccessForRole(role: RoleKey): CandidateDealRoomPilotAccess {
  if (internalCandidateDealRoomRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_candidate_room_control",
      reason: "Role can review the Candidate Deal Room pilot shell and internal assembly readiness before release.",
    };
  }

  if (scopedCandidateDealRoomRoles.includes(role)) {
    return {
      allowed: true,
      level: "candidate_release_gated_shell",
      reason: "Role can see the Candidate Deal Room shell only; no unreleased package records are returned.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Candidate Deal Room pilot access requires internal deal scope or Franchise Candidate scope.",
  };
}

export function candidateDealRoomPilotBoundary(): CandidateDealRoomPilotBoundary {
  return {
    coreDevPilotDataAllowed: true,
    preparedDealAssemblyReadsEnabled: true,
    candidateShellEnabled: true,
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

function visibleSurfaces(): CandidateDealRoomPilotReadiness["visibleSurfaces"] {
  return [
    { surface: "Sites", roleUse: "Candidate Deal Room shell and released-offer empty state." },
    { surface: "CRM", roleUse: "Deal Manager reviews candidate-facing questions and release readiness." },
    { surface: "Files", roleUse: "Package documents stay release-gated before candidate visibility." },
    { surface: "Settings", roleUse: "Admin and reviewers inspect pilot gates and QA." },
  ];
}

function preservedFunctions(): CandidateDealRoomPilotReadiness["preservedFunctions"] {
  return [
    { key: "candidate-room-shell", label: "Candidate Deal Room shell and section navigation", state: "represented" },
    { key: "release-required-sections", label: "Section-level release required state", state: "represented" },
    { key: "question-thread-readiness", label: "Question and Deal Manager thread readiness", state: "represented" },
    { key: "intent-prep", label: "Purchase and financing intent preparation", state: "represented" },
    { key: "regulated-checks", label: "KYC/AML, equity check and source-of-funds start", state: "deferred_until_exact_gate" },
    { key: "external-send", label: "External message sending and bank package release", state: "deferred_until_exact_gate" },
  ];
}

function gates(): CandidateDealRoomPilotReadiness["gates"] {
  return [
    { key: "candidate-shell", label: "Candidate shell", state: "read_only" },
    { key: "candidate-release", label: "Candidate package release", state: "closed" },
    { key: "intent-write", label: "Purchase and financing intent writes", state: "closed" },
    { key: "regulated-checks", label: "Regulated checks", state: "closed" },
    { key: "external-send", label: "External sending", state: "closed" },
    { key: "bank-release", label: "Bank package creation and release", state: "closed" },
  ];
}

function nextBlockInputs(): CandidateDealRoomPilotReadiness["nextBlockInputs"] {
  return [
    {
      blockRange: "651-660",
      requiredInput: "Candidate questions, intent and checklist actions become controlled CRAYS Core commands only after the release-gated shell is stable.",
    },
    {
      blockRange: "661-670",
      requiredInput: "Bank Evidence Package remains blocked until Candidate intent and regulated prerequisites are reviewed.",
    },
  ];
}

export function buildCandidateDealRoomPilotStages(input: {
  internalAssemblyPackages: number;
  releasedOffers: number;
  releaseRequiredSections: number;
  regulatedLockedSections: number;
  intentPersistenceReady: boolean;
}): CandidateDealRoomPilotStage[] {
  return [
    {
      key: "internal-package",
      label: "Internal package",
      status: input.internalAssemblyPackages > 0 ? "ready" : "release_required",
      current: `${input.internalAssemblyPackages} internal packages assembled`,
      requiredFor: "Candidate release review",
    },
    {
      key: "candidate-sections",
      label: "Candidate sections",
      status: input.releasedOffers > 0 ? "ready" : "release_required",
      current: `${input.releaseRequiredSections} sections require release`,
      requiredFor: "Candidate Deal Room visibility",
    },
    {
      key: "question-thread",
      label: "Question thread",
      status: input.intentPersistenceReady ? "ready" : "release_required",
      current: input.intentPersistenceReady ? "Persistence ready, external sending closed" : "Persistence not ready",
      requiredFor: "Deal Manager communication inside CRAYS",
    },
    {
      key: "intent",
      label: "Purchase and financing intent",
      status: "locked",
      current: "Intent writes closed in this pilot slice",
      requiredFor: "Regulated preparation",
    },
    {
      key: "regulated",
      label: "Regulated checks",
      status: "locked",
      current: `${input.regulatedLockedSections} regulated sections locked`,
      requiredFor: "Bank Evidence Package",
    },
  ];
}

export function emptyCandidateDealRoomPilotReadiness(role: RoleKey): CandidateDealRoomPilotReadiness {
  const access = candidateDealRoomPilotAccessForRole(role);
  const surfaceList = access.allowed ? visibleSurfaces() : [];
  const functionList = access.allowed ? preservedFunctions() : [];

  return {
    status: access.allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 641-650",
    journeySegment: "Candidate Intent",
    ownerRoles: ["deal-manager"],
    consumingRoles: ["franchise-candidate", "reviewer", "crays-management"],
    summary: {
      internalAssemblyPackages: 0,
      candidateVisiblePackages: 0,
      releasedOffers: 0,
      sections: 0,
      releaseRequiredSections: 0,
      regulatedLockedSections: 0,
      readinessGates: 0,
      readyGates: 0,
      messages: 0,
      threads: 0,
      visibleSurfaces: surfaceList.length,
      preservedFunctions: functionList.length,
      openSideEffectGates: 0,
      realCoreRecordsReturned: false,
    },
    stages: [],
    visibleSurfaces: surfaceList,
    preservedFunctions: functionList,
    gates: access.allowed ? gates() : [],
    nextBlockInputs: access.allowed ? nextBlockInputs() : [],
    boundaries: candidateDealRoomPilotBoundary(),
    liveBusinessRecordsReturned: false,
    candidateVisibleRecordsReturned: false,
    commandRecordsWritten: false,
  };
}

export function buildCandidateDealRoomPilotReadiness(
  role: RoleKey,
  input: {
    internalAssemblyPackages: number;
    releasedOffers: number;
    sections: number;
    releaseRequiredSections: number;
    regulatedLockedSections: number;
    readinessGates: number;
    readyGates: number;
    messages: number;
    threads: number;
    intentPersistenceReady: boolean;
    liveBusinessRecordsReturned: boolean;
  },
): CandidateDealRoomPilotReadiness {
  const base = emptyCandidateDealRoomPilotReadiness(role);

  return {
    ...base,
    summary: {
      ...base.summary,
      internalAssemblyPackages: input.internalAssemblyPackages,
      releasedOffers: input.releasedOffers,
      sections: input.sections,
      releaseRequiredSections: input.releaseRequiredSections,
      regulatedLockedSections: input.regulatedLockedSections,
      readinessGates: input.readinessGates,
      readyGates: input.readyGates,
      messages: input.messages,
      threads: input.threads,
      realCoreRecordsReturned: input.liveBusinessRecordsReturned,
    },
    stages: buildCandidateDealRoomPilotStages(input),
    liveBusinessRecordsReturned: input.liveBusinessRecordsReturned,
  };
}
