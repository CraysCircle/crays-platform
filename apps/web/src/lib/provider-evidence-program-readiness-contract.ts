import type { RoleKey } from "./roles";

const internalEvidenceRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance"];
const releaseShellRoles: RoleKey[] = ["landlord", "franchise-candidate", "bank-partner"];

type AccessLevel = "internal_program_readiness" | "release_gated_shell" | "forbidden";

type ProgramAccess = {
  allowed: boolean;
  level: AccessLevel;
  reason: string;
};

type EvidenceBoundary = {
  readOnly: true;
  noCallDefault: true;
  liveProviderReadApproved: false;
  providerCallsEnabled: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  uploadsEnabled: false;
  ownerSubmissionWritesEnabled: false;
  rawProviderPayloadsReturned: false;
  candidateReleaseEnabled: false;
  publicReleaseEnabled: false;
  ownerReleaseEnabled: false;
  bankReleaseEnabled: false;
  bankPackageCreationEnabled: false;
  bankSendEnabled: false;
  paymentInitiationEnabled: false;
  financeWritesEnabled: false;
  externalSendingEnabled: false;
  liveAiCallsEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type LocationNoCallFixture = {
  key: string;
  label: string;
  fixtureScope: string;
  requestClasses: string[];
  derivedEvidence: string[];
  expectedOutcome: string;
};

export type LocationNoCallScaffoldContract = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: ProgramAccess;
  block: "203";
  scaffold: "location_intelligence_no_call_fixture_scaffold";
  approvedForLiveRead: false;
  syntheticFixtures: LocationNoCallFixture[];
  derivedEvidenceShape: string[];
  cachePolicy: {
    cacheFillEnabled: false;
    retentionDecision: "block_204_205_required";
    staleEvidenceBehavior: string;
  };
  auditPlan: string[];
  failureStates: string[];
  nextSafeBlock: "204";
  boundaries: EvidenceBoundary;
  liveProviderCallsPerformed: false;
  liveProviderPayloadsReturned: false;
  liveBusinessRecordsReturned: false;
  liveOwnerPrivateDataReturned: false;
  liveCandidateDataReturned: false;
  liveBankDataReturned: false;
};

export type ProviderEvidenceBlockGroup = {
  range: string;
  label: string;
  status: "complete";
  outcome: string;
};

export type ProviderEvidenceProgramReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: ProgramAccess;
  blockRange: "Blocks 201-300";
  completedBlocks: number;
  totalBlocks: 100;
  operatingMode: "controlled_no_live_default";
  blockGroups: ProviderEvidenceBlockGroup[];
  evidenceSurfaces: string[];
  persistenceTables: string[];
  workflowStages: string[];
  releaseAudiences: string[];
  finalDecisionAfterBlock300: string[];
  boundaries: EvidenceBoundary;
  liveProviderCallsPerformed: false;
  liveSourceRecordsReturned: false;
  liveBusinessRecordsReturned: false;
  liveOwnerPrivateDataReturned: false;
  liveCandidateDataReturned: false;
  liveBankDataReturned: false;
};

export type EvidenceCorePersistenceContract = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: ProgramAccess;
  blockRange: "Blocks 251-260";
  migrationId: "0005_evidence_core";
  migrationApplied: false;
  dryRunReady: true;
  expectedTables: string[];
  readModels: string[];
  rlsRequired: true;
  verifierScript: "scripts/verify-evidence-core-persistence-draft.mjs";
  migrationScript: "scripts/migrate-evidence-core.mjs";
  boundaries: EvidenceBoundary;
  liveDatabaseWritePerformed: false;
  liveBusinessRecordsReturned: false;
};

export type EvidenceWorkflowReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: ProgramAccess;
  blockRange: "Blocks 261-270";
  intakeChannels: string[];
  sharedPropertyCaseFlow: string[];
  reviewQueues: string[];
  taskTypes: string[];
  evidenceGates: string[];
  boundaries: EvidenceBoundary;
  ownerSubmissionWritePerformed: false;
  liveBusinessRecordsReturned: false;
};

export type PreparedDealAssemblyReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: ProgramAccess;
  blockRange: "Blocks 271-280";
  assemblyInputs: string[];
  packageSections: string[];
  reviewStates: string[];
  blockedReleaseStates: string[];
  boundaries: EvidenceBoundary;
  preparedDealReleased: false;
  liveBusinessRecordsReturned: false;
};

export type EvidenceReleasePrepReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: ProgramAccess;
  blockRange: "Blocks 281-290";
  composerSections: string[];
  audienceGates: string[];
  ownerStatusStates: string[];
  candidateReadinessStates: string[];
  bankPackageShellStates: string[];
  boundaries: EvidenceBoundary;
  releasePerformed: false;
  liveBusinessRecordsReturned: false;
};

export type PilotReadinessHardeningContract = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: ProgramAccess;
  blockRange: "Blocks 291-300";
  hardeningAreas: string[];
  qaMatrix: string[];
  auditLedger: string[];
  providerReadinessDecision: string[];
  block300Pause: true;
  boundaries: EvidenceBoundary;
  liveProviderReadApproved: false;
  productionDeployPerformed: false;
  liveBusinessRecordsReturned: false;
};

const boundaries = (): EvidenceBoundary => ({
  readOnly: true,
  noCallDefault: true,
  liveProviderReadApproved: false,
  providerCallsEnabled: false,
  sourceWritesEnabled: false,
  syncWritesEnabled: false,
  uploadsEnabled: false,
  ownerSubmissionWritesEnabled: false,
  rawProviderPayloadsReturned: false,
  candidateReleaseEnabled: false,
  publicReleaseEnabled: false,
  ownerReleaseEnabled: false,
  bankReleaseEnabled: false,
  bankPackageCreationEnabled: false,
  bankSendEnabled: false,
  paymentInitiationEnabled: false,
  financeWritesEnabled: false,
  externalSendingEnabled: false,
  liveAiCallsEnabled: false,
  secretsReturned: false,
  privateKeysReturned: false,
});

function internalAccess(role: RoleKey): ProgramAccess {
  if (internalEvidenceRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_program_readiness",
      reason: "Role can review Provider Evidence program readiness. Live reads, writes, uploads, sends and releases remain disabled.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Provider Evidence program readiness is internal until release-gated external surfaces are separately approved.",
  };
}

function programAccess(role: RoleKey): ProgramAccess {
  if (internalEvidenceRoles.includes(role)) return internalAccess(role);

  if (releaseShellRoles.includes(role)) {
    return {
      allowed: true,
      level: "release_gated_shell",
      reason: "Role can see release-gated readiness shells only. Internal records, provider payloads and release actions remain hidden.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Provider Evidence program readiness is not available for this role.",
  };
}

const blockGroups: ProviderEvidenceBlockGroup[] = [
  {
    range: "201-250",
    label: "Provider Evidence Layer",
    status: "complete",
    outcome: "Adapter contracts, evidence classes, consent, cache, audit, failure handling and release governance are represented without live provider calls.",
  },
  {
    range: "251-260",
    label: "Evidence Core Persistence",
    status: "complete",
    outcome: "Reviewable CRAYS evidence tables and dry-run verification are prepared; migration apply remains blocked.",
  },
  {
    range: "261-270",
    label: "Owner And Internal Intake Workflow",
    status: "complete",
    outcome: "Owner digital handoff and internal manual property creation share one Property Case flow model.",
  },
  {
    range: "271-280",
    label: "Prepared Deal Assembly",
    status: "complete",
    outcome: "Property case, evidence, rent potential and economics can assemble an internal package, still unreleased.",
  },
  {
    range: "281-290",
    label: "Release Preparation",
    status: "complete",
    outcome: "Owner, Candidate and Bank visibility rules are prepared through CRAYS release gates.",
  },
  {
    range: "291-300",
    label: "Pilot Readiness Hardening",
    status: "complete",
    outcome: "Permission, audit, QA, browser smoke, provider-readiness and external-developer handoff gates are defined before the Block 300 pause.",
  },
];

const locationFixtures: LocationNoCallFixture[] = [
  {
    key: "urban-catchment-fixture",
    label: "Urban catchment fixture",
    fixtureScope: "Synthetic coordinate reference, synthetic travel bands and synthetic demand context.",
    requestClasses: ["reachability-bands", "travel-time-matrix", "statistics-context", "places-context", "location-score"],
    derivedEvidence: ["Catchment summary", "Transit reach note", "Demand context", "Competition context", "Reviewer confidence"],
    expectedOutcome: "Produces a complete internal evidence shape without provider contact.",
  },
  {
    key: "low-context-fixture",
    label: "Low-context fixture",
    fixtureScope: "Synthetic property case with incomplete context and missing statistics evidence.",
    requestClasses: ["reachability-bands", "travel-time-matrix", "location-score"],
    derivedEvidence: ["Catchment summary", "Missing context explanation", "Reviewer action required"],
    expectedOutcome: "Returns explainable partial evidence and keeps release gates blocked.",
  },
  {
    key: "missing-consent-fixture",
    label: "Missing consent fixture",
    fixtureScope: "Synthetic owner-private enrichment path with consent intentionally unavailable.",
    requestClasses: ["statistics-context", "places-context"],
    derivedEvidence: ["Consent missing state", "Private enrichment blocked", "Manual review note"],
    expectedOutcome: "Blocks owner-private evidence enrichment and performs no retry loop.",
  },
];

const evidenceTables = [
  "location_evidence_runs",
  "property_supply_records",
  "rent_potential_models",
  "deal_economics_models",
  "banking_evidence_snapshots",
  "evidence_release_gates",
  "evidence_audit_events",
];

const evidenceSurfaces = ["Location Evidence", "Property Supply", "Rent Potential", "Deal Economics", "Banking Evidence"];

export function getLocationIntelligenceNoCallScaffold(role: RoleKey): LocationNoCallScaffoldContract {
  const access = internalAccess(role);
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    block: "203",
    scaffold: "location_intelligence_no_call_fixture_scaffold",
    approvedForLiveRead: false,
    syntheticFixtures: allowed ? locationFixtures : [],
    derivedEvidenceShape: allowed
      ? ["property_case_id", "fixture_id", "evidence_class", "summary", "confidence_state", "review_status", "release_gate_state"]
      : [],
    cachePolicy: {
      cacheFillEnabled: false,
      retentionDecision: "block_204_205_required",
      staleEvidenceBehavior: "Synthetic evidence can be regenerated locally; no provider cache is filled.",
    },
    auditPlan: allowed ? ["fixture.generated", "evidence.computed", "gate.checked", "failure.recorded"] : [],
    failureStates: allowed ? ["missing-consent", "incomplete-location", "fixture-context-missing", "release-gate-blocked"] : [],
    nextSafeBlock: "204",
    boundaries: boundaries(),
    liveProviderCallsPerformed: false,
    liveProviderPayloadsReturned: false,
    liveBusinessRecordsReturned: false,
    liveOwnerPrivateDataReturned: false,
    liveCandidateDataReturned: false,
    liveBankDataReturned: false,
  };
}

export function getProviderEvidenceProgramReadiness(role: RoleKey): ProviderEvidenceProgramReadiness {
  const access = programAccess(role);
  const internal = access.level === "internal_program_readiness";
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 201-300",
    completedBlocks: internal ? 100 : 0,
    totalBlocks: 100,
    operatingMode: "controlled_no_live_default",
    blockGroups: internal ? blockGroups : [],
    evidenceSurfaces: allowed ? (internal ? evidenceSurfaces : ["Release-gated evidence status"]) : [],
    persistenceTables: internal ? evidenceTables : [],
    workflowStages: internal ? ["Owner handoff", "Manual property creation", "Review queue", "Evidence gates", "Prepared deal assembly", "Release preparation"] : [],
    releaseAudiences: allowed ? (internal ? ["Owner", "Candidate", "Bank", "Internal"] : [role === "landlord" ? "Owner" : role === "bank-partner" ? "Bank" : "Candidate"]) : [],
    finalDecisionAfterBlock300: internal
      ? ["Sandbox provider reads", "Owner submissions and uploads", "Candidate and Bank release", "Continue no-call hardening"]
      : [],
    boundaries: boundaries(),
    liveProviderCallsPerformed: false,
    liveSourceRecordsReturned: false,
    liveBusinessRecordsReturned: false,
    liveOwnerPrivateDataReturned: false,
    liveCandidateDataReturned: false,
    liveBankDataReturned: false,
  };
}

export function getEvidenceCorePersistenceContract(role: RoleKey): EvidenceCorePersistenceContract {
  const access = internalAccess(role);
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 251-260",
    migrationId: "0005_evidence_core",
    migrationApplied: false,
    dryRunReady: true,
    expectedTables: allowed ? evidenceTables : [],
    readModels: allowed ? evidenceSurfaces : [],
    rlsRequired: true,
    verifierScript: "scripts/verify-evidence-core-persistence-draft.mjs",
    migrationScript: "scripts/migrate-evidence-core.mjs",
    boundaries: boundaries(),
    liveDatabaseWritePerformed: false,
    liveBusinessRecordsReturned: false,
  };
}

export function getEvidenceWorkflowReadiness(role: RoleKey): EvidenceWorkflowReadiness {
  const access = internalAccess(role);
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 261-270",
    intakeChannels: allowed ? ["Owner digital handoff", "Deal Manager manual intake", "Expansion Manager manual intake"] : [],
    sharedPropertyCaseFlow: allowed ? ["draft", "submitted", "screening", "analysis", "review", "handoff_ready"] : [],
    reviewQueues: allowed ? ["Property fit review", "Evidence completeness review", "Rent potential review", "Deal handoff review"] : [],
    taskTypes: allowed ? ["Normalize address", "Check duplicate property", "Review consent", "Request missing evidence", "Prepare package handoff"] : [],
    evidenceGates: allowed ? ["Location Evidence", "Property Supply", "Rent Potential", "Deal Economics"] : [],
    boundaries: boundaries(),
    ownerSubmissionWritePerformed: false,
    liveBusinessRecordsReturned: false,
  };
}

export function getPreparedDealAssemblyReadiness(role: RoleKey): PreparedDealAssemblyReadiness {
  const access = internalAccess(role);
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 271-280",
    assemblyInputs: allowed ? ["Property Case", "Location Evidence", "Rent Potential", "Deal Economics", "Document package links"] : [],
    packageSections: allowed ? ["Property fit", "Location evidence", "Rent potential", "Deal economics", "Opening assumptions", "Reviewer notes"] : [],
    reviewStates: allowed ? ["draft", "assembled", "internal_review", "approved_for_release_decision"] : [],
    blockedReleaseStates: allowed ? ["public teaser", "Candidate detail", "Owner detail", "Bank package"] : [],
    boundaries: boundaries(),
    preparedDealReleased: false,
    liveBusinessRecordsReturned: false,
  };
}

export function getEvidenceReleasePrepReadiness(role: RoleKey): EvidenceReleasePrepReadiness {
  const access = programAccess(role);
  const internal = access.level === "internal_program_readiness";
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 281-290",
    composerSections: internal ? ["Owner evidence", "Candidate evidence", "Bank evidence", "Redaction checklist", "Revocation controls"] : [],
    audienceGates: allowed
      ? internal
        ? ["Owner release gate", "Candidate release gate", "Bank release gate", "Public teaser gate"]
        : [`${role} release gate`]
      : [],
    ownerStatusStates: allowed ? ["not_released", "ready_for_review", "released", "revoked"] : [],
    candidateReadinessStates: allowed ? ["not_released", "ready_for_review", "released", "revoked"] : [],
    bankPackageShellStates: allowed ? ["not_created", "ready_for_review", "released", "revoked"] : [],
    boundaries: boundaries(),
    releasePerformed: false,
    liveBusinessRecordsReturned: false,
  };
}

export function getPilotReadinessHardening(role: RoleKey): PilotReadinessHardeningContract {
  const access = internalAccess(role);
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 291-300",
    hardeningAreas: allowed
      ? ["Permission tests", "Audit ledger", "QA matrix", "Browser smoke", "Provider-readiness decision", "External-developer handoff", "Release checklist", "Block 300 pause"]
      : [],
    qaMatrix: allowed
      ? ["Contract routes", "Forbidden role boundaries", "Source/vendor wording scan", "Desktop browser smoke", "Mobile browser smoke", "No-live-call assertions"]
      : [],
    auditLedger: allowed ? ["fixture.generated", "evidence.reviewed", "release_gate.checked", "permission.denied", "failure.recorded"] : [],
    providerReadinessDecision: allowed ? ["sandbox_location_read", "sandbox_property_feed_read", "sandbox_banking_read", "continue_no_call_only"] : [],
    block300Pause: true,
    boundaries: boundaries(),
    liveProviderReadApproved: false,
    productionDeployPerformed: false,
    liveBusinessRecordsReturned: false,
  };
}
