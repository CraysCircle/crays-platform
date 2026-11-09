import type { RoleKey } from "./roles";

const internalPilotRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance"];
const releaseShellRoles: RoleKey[] = ["landlord", "franchise-candidate", "bank-partner"];

type SandboxAccessLevel = "internal_sandbox_pilot_readiness" | "release_gated_pilot_shell" | "forbidden";

type SandboxAccess = {
  allowed: boolean;
  level: SandboxAccessLevel;
  reason: string;
};

type SandboxBoundary = {
  readOnly: true;
  sandboxReady: true;
  sandboxExecutionApproved: false;
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
  envValuesReturned: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type SandboxPilotBlockGroup = {
  range: string;
  label: string;
  status: "complete";
  outcome: string;
};

export type ProviderSandboxPilotReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: SandboxAccess;
  blockRange: "Blocks 301-400";
  completedBlocks: number;
  totalBlocks: 100;
  operatingMode: "sandbox_ready_no_execute_default";
  blockGroups: SandboxPilotBlockGroup[];
  sandboxPaths: string[];
  pilotSurfaces: string[];
  decisionAfterBlock400: string[];
  boundaries: SandboxBoundary;
  liveProviderCallsPerformed: false;
  liveBusinessRecordsReturned: false;
  productionDeployPerformed: false;
};

export type ProviderSandboxDecisionPack = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: SandboxAccess;
  blockRange: "Blocks 301-310";
  sandboxPaths: string[];
  serverOnlyBoundaries: string[];
  rateLimits: string[];
  auditEvents: string[];
  killSwitches: string[];
  costLimits: string[];
  rotationRunbook: string[];
  boundaries: SandboxBoundary;
  sandboxExecutionApproved: false;
};

export type LocationSandboxReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: SandboxAccess;
  blockRange: "Blocks 311-320";
  readClasses: string[];
  evidenceOutputs: string[];
  boundingRules: string[];
  failureStates: string[];
  boundaries: SandboxBoundary;
  sandboxReadExecuted: false;
};

export type PropertyFeedSandboxReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: SandboxAccess;
  blockRange: "Blocks 321-330";
  normalizationSteps: string[];
  dedupeRules: string[];
  redactionRules: string[];
  blockedActions: string[];
  boundaries: SandboxBoundary;
  feedReadExecuted: false;
};

export type BankingEvidenceSandboxReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: SandboxAccess;
  blockRange: "Blocks 331-340";
  consentShells: string[];
  classifications: string[];
  packagePrerequisites: string[];
  blockedActions: string[];
  boundaries: SandboxBoundary;
  bankingReadExecuted: false;
};

export type OwnerSubmissionBetaReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: SandboxAccess;
  blockRange: "Blocks 341-350";
  ownerFormSections: string[];
  consentStates: string[];
  reviewQueues: string[];
  storageGate: "separate_storage_security_gate_required";
  uploadExecutionApproved: false;
  boundaries: SandboxBoundary;
  ownerSubmissionCreated: false;
};

export type RentDealEconomicsEngineReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: SandboxAccess;
  blockRange: "Blocks 351-360";
  modelInputs: string[];
  assumptionSets: string[];
  sensitivityScenarios: string[];
  reviewerOverrides: string[];
  boundaries: SandboxBoundary;
  liveFinancialModelWritten: false;
};

export type PreparedDealInternalPackageV1Readiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: SandboxAccess;
  blockRange: "Blocks 361-370";
  packageInputs: string[];
  packageSections: string[];
  qaGates: string[];
  auditEvents: string[];
  boundaries: SandboxBoundary;
  packageReleased: false;
};

export type ControlledReleasePilotReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: SandboxAccess;
  blockRange: "Blocks 371-380";
  audiences: string[];
  pilotRecordGates: string[];
  visibilityStates: string[];
  rollbackStates: string[];
  boundaries: SandboxBoundary;
  releaseExecuted: false;
};

export type EvidenceOperationsHardeningReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: SandboxAccess;
  blockRange: "Blocks 381-390";
  observability: string[];
  queuePolicies: string[];
  staleEvidenceHandling: string[];
  costGuardrails: string[];
  permissionRegressionTests: string[];
  boundaries: SandboxBoundary;
  operationalJobsStarted: false;
};

export type PilotLaunchDecisionCloseout = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: SandboxAccess;
  blockRange: "Blocks 391-400";
  reportSections: string[];
  securityReview: string[];
  externalDeveloperHandoff: string[];
  releaseChecklist: string[];
  block400Pause: true;
  nextDecisionOptions: string[];
  boundaries: SandboxBoundary;
  pilotLaunched: false;
};

const boundaries = (): SandboxBoundary => ({
  readOnly: true,
  sandboxReady: true,
  sandboxExecutionApproved: false,
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
  envValuesReturned: false,
  secretsReturned: false,
  privateKeysReturned: false,
});

function internalAccess(role: RoleKey): SandboxAccess {
  if (internalPilotRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_sandbox_pilot_readiness",
      reason: "Role can review sandbox and pilot readiness. Execution, uploads, release and finance actions remain disabled.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Sandbox and pilot readiness is internal until release-gated shells are explicitly approved.",
  };
}

function programAccess(role: RoleKey): SandboxAccess {
  if (internalPilotRoles.includes(role)) return internalAccess(role);

  if (releaseShellRoles.includes(role)) {
    return {
      allowed: true,
      level: "release_gated_pilot_shell",
      reason: "Role can see release-gated pilot readiness shells only. Internal records, provider payloads and actions remain hidden.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Sandbox and pilot readiness is not available for this role.",
  };
}

const blockGroups: SandboxPilotBlockGroup[] = [
  {
    range: "301-310",
    label: "Sandbox Decision Pack",
    status: "complete",
    outcome: "Sandbox paths, server-only boundaries, rate limits, audit, kill switches, cost limits and rotation runbooks are ready without execution.",
  },
  {
    range: "311-320",
    label: "Location Sandbox Readiness",
    status: "complete",
    outcome: "Reachability, travel-time, context and score read classes are sandbox-ready, but no sandbox read runs by default.",
  },
  {
    range: "321-330",
    label: "Property Feed Normalization",
    status: "complete",
    outcome: "Listing intake, address normalization, dedupe and redaction readiness are defined without publish, update or contact actions.",
  },
  {
    range: "331-340",
    label: "Banking Evidence Readiness",
    status: "complete",
    outcome: "Consent shells, evidence classification and bank package prerequisites are ready without payments, bank sends or finance writes.",
  },
  {
    range: "341-350",
    label: "Owner Submission Beta",
    status: "complete",
    outcome: "Owner form, consent, review queue and storage/security gate are ready while uploads remain blocked.",
  },
  {
    range: "351-360",
    label: "Rent And Deal Economics Engine",
    status: "complete",
    outcome: "Rent range, opening budget, sensitivity, score and reviewer override contracts are ready without finance writes.",
  },
  {
    range: "361-370",
    label: "Internal Package V1",
    status: "complete",
    outcome: "Internal prepared deal package v1, QA gates and audit events are ready without external release.",
  },
  {
    range: "371-380",
    label: "Controlled Release Pilot",
    status: "complete",
    outcome: "Candidate, Owner and Bank pilot shells are release-gated for explicit pilot records only; no release is executed.",
  },
  {
    range: "381-390",
    label: "Operations Hardening",
    status: "complete",
    outcome: "Observability, queues, stale evidence handling, cost guardrails and permission regression tests are defined.",
  },
  {
    range: "391-400",
    label: "Pilot Launch Decision Closeout",
    status: "complete",
    outcome: "Sandbox/live-read report, security review, external-developer handoff, release checklist and Block 400 pause are complete.",
  },
];

const sandboxPaths = ["Location Intelligence sandbox readiness", "Property Feed sandbox normalization", "Banking Evidence sandbox readiness"];
const pilotSurfaces = ["Owner status shell", "Candidate Deal Room shell", "Bank package shell", "Internal reviewer package"];

export function getProviderSandboxPilotReadiness(role: RoleKey): ProviderSandboxPilotReadiness {
  const access = programAccess(role);
  const internal = access.level === "internal_sandbox_pilot_readiness";
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 301-400",
    completedBlocks: internal ? 100 : 0,
    totalBlocks: 100,
    operatingMode: "sandbox_ready_no_execute_default",
    blockGroups: internal ? blockGroups : [],
    sandboxPaths: internal ? sandboxPaths : [],
    pilotSurfaces: allowed ? (internal ? pilotSurfaces : [role === "landlord" ? "Owner status shell" : role === "bank-partner" ? "Bank package shell" : "Candidate Deal Room shell"]) : [],
    decisionAfterBlock400: internal
      ? ["approve one sandbox read path", "keep no-call only", "approve owner submissions after storage gate", "approve explicit pilot release records"]
      : [],
    boundaries: boundaries(),
    liveProviderCallsPerformed: false,
    liveBusinessRecordsReturned: false,
    productionDeployPerformed: false,
  };
}

export function getProviderSandboxDecisionPack(role: RoleKey): ProviderSandboxDecisionPack {
  const access = internalAccess(role);
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 301-310",
    sandboxPaths: allowed ? sandboxPaths : [],
    serverOnlyBoundaries: allowed ? ["server route only", "no browser-side provider access", "bounded request classes", "raw payload quarantine"] : [],
    rateLimits: allowed ? ["per route", "per provider class", "per pilot record", "per operator role"] : [],
    auditEvents: allowed ? ["sandbox.request_planned", "sandbox.request_blocked", "sandbox.result_classified", "sandbox.kill_switch_used"] : [],
    killSwitches: allowed ? ["global provider off", "per path off", "per role off", "per pilot record off"] : [],
    costLimits: allowed ? ["daily cap", "per-case cap", "per-provider-class cap", "manual override required"] : [],
    rotationRunbook: allowed ? ["env inventory", "rotation owner", "rollback owner", "post-rotation verification"] : [],
    boundaries: boundaries(),
    sandboxExecutionApproved: false,
  };
}

export function getLocationSandboxReadiness(role: RoleKey): LocationSandboxReadiness {
  const access = internalAccess(role);
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 311-320",
    readClasses: allowed ? ["reachability", "travel-time", "context", "score"] : [],
    evidenceOutputs: allowed ? ["catchment bands", "travel matrix summary", "context note", "location score", "reviewer confidence"] : [],
    boundingRules: allowed ? ["no raw payload return", "no owner private enrichment without consent", "bounded rows", "cache off until approved"] : [],
    failureStates: allowed ? ["provider off", "rate limited", "missing consent", "partial context", "stale evidence"] : [],
    boundaries: boundaries(),
    sandboxReadExecuted: false,
  };
}

export function getPropertyFeedSandboxReadiness(role: RoleKey): PropertyFeedSandboxReadiness {
  const access = internalAccess(role);
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 321-330",
    normalizationSteps: allowed ? ["address parse", "geo confidence", "size/rent field normalize", "listing status normalize", "source snapshot bound"] : [],
    dedupeRules: allowed ? ["address similarity", "geo proximity", "owner/broker redaction safe hash", "listing freshness window"] : [],
    redactionRules: allowed ? ["contact hidden", "owner identifiers hidden", "broker notes hidden", "raw listing payload hidden"] : [],
    blockedActions: allowed ? ["publish listing", "update listing", "contact owner", "contact broker", "write source system"] : [],
    boundaries: boundaries(),
    feedReadExecuted: false,
  };
}

export function getBankingEvidenceSandboxReadiness(role: RoleKey): BankingEvidenceSandboxReadiness {
  const access = programAccess(role);
  const internal = access.level === "internal_sandbox_pilot_readiness";
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 331-340",
    consentShells: internal ? ["candidate consent", "business account consent", "retention notice", "revocation state"] : [],
    classifications: allowed ? (internal ? ["cashflow", "equity evidence", "liquidity", "recurring obligations", "risk note"] : ["release-gated bank evidence shell"]) : [],
    packagePrerequisites: allowed ? ["reviewed candidate", "reviewed deal", "release gate", "manual finance approval"] : [],
    blockedActions: allowed ? ["payment initiation", "bank send", "counterparty creation", "exchange", "finance write"] : [],
    boundaries: boundaries(),
    bankingReadExecuted: false,
  };
}

export function getOwnerSubmissionBetaReadiness(role: RoleKey): OwnerSubmissionBetaReadiness {
  const access = programAccess(role);
  const internal = access.level === "internal_sandbox_pilot_readiness";
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 341-350",
    ownerFormSections: allowed ? (internal ? ["property basics", "address", "rent expectation", "availability", "documents metadata", "consent"] : ["property status shell"]) : [],
    consentStates: allowed ? ["not_started", "draft", "submitted_for_review", "revoked"] : [],
    reviewQueues: internal ? ["owner submission review", "duplicate check", "location evidence review", "deal handoff review"] : [],
    storageGate: "separate_storage_security_gate_required",
    uploadExecutionApproved: false,
    boundaries: boundaries(),
    ownerSubmissionCreated: false,
  };
}

export function getRentDealEconomicsEngineReadiness(role: RoleKey): RentDealEconomicsEngineReadiness {
  const access = internalAccess(role);
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 351-360",
    modelInputs: allowed ? ["property size", "rent ask", "catchment score", "capex assumption", "opening budget", "franchise economics"] : [],
    assumptionSets: allowed ? ["base", "conservative", "upside", "reviewer override"] : [],
    sensitivityScenarios: allowed ? ["rent variance", "capex variance", "opening delay", "membership ramp"] : [],
    reviewerOverrides: allowed ? ["rent range", "capex range", "score note", "release note"] : [],
    boundaries: boundaries(),
    liveFinancialModelWritten: false,
  };
}

export function getPreparedDealInternalPackageV1(role: RoleKey): PreparedDealInternalPackageV1Readiness {
  const access = internalAccess(role);
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 361-370",
    packageInputs: allowed ? ["property case", "location evidence", "rent potential", "deal economics", "documents metadata", "review notes"] : [],
    packageSections: allowed ? ["executive summary", "property fit", "market context", "economics", "risks", "release checklist"] : [],
    qaGates: allowed ? ["evidence complete", "redaction complete", "finance reviewed", "release gate checked"] : [],
    auditEvents: allowed ? ["package.assembled", "package.qa_checked", "package.release_blocked"] : [],
    boundaries: boundaries(),
    packageReleased: false,
  };
}

export function getControlledReleasePilotReadiness(role: RoleKey): ControlledReleasePilotReadiness {
  const access = programAccess(role);
  const internal = access.level === "internal_sandbox_pilot_readiness";
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 371-380",
    audiences: allowed ? (internal ? ["Owner", "Candidate", "Bank", "Internal reviewer"] : [role === "landlord" ? "Owner" : role === "bank-partner" ? "Bank" : "Candidate"]) : [],
    pilotRecordGates: allowed ? ["explicit pilot record", "manual reviewer approval", "redaction complete", "revocation available"] : [],
    visibilityStates: allowed ? ["not_released", "pilot_ready", "released_to_pilot", "revoked"] : [],
    rollbackStates: allowed ? ["hide shell", "revoke evidence", "pause pilot record", "audit review"] : [],
    boundaries: boundaries(),
    releaseExecuted: false,
  };
}

export function getEvidenceOperationsHardening(role: RoleKey): EvidenceOperationsHardeningReadiness {
  const access = internalAccess(role);
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 381-390",
    observability: allowed ? ["request outcome", "provider-off state", "cost counter", "stale evidence", "release gate"] : [],
    queuePolicies: allowed ? ["manual retry only", "idempotent job key", "dead-letter review", "operator acknowledgement"] : [],
    staleEvidenceHandling: allowed ? ["mark stale", "block release", "request review", "record audit event"] : [],
    costGuardrails: allowed ? ["daily cap", "pilot record cap", "manual override", "kill switch"] : [],
    permissionRegressionTests: allowed ? ["internal allowed", "external shell only", "guest forbidden", "finance scoped", "release hidden"] : [],
    boundaries: boundaries(),
    operationalJobsStarted: false,
  };
}

export function getPilotLaunchDecisionCloseout(role: RoleKey): PilotLaunchDecisionCloseout {
  const access = internalAccess(role);
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 391-400",
    reportSections: allowed ? ["sandbox readiness", "security review", "QA matrix", "side-effect gates", "next decision"] : [],
    securityReview: allowed ? ["server-only boundary", "env value handling", "no raw payload return", "role gate coverage", "audit coverage"] : [],
    externalDeveloperHandoff: allowed ? ["block map", "route map", "QA proof", "blocked actions", "next range 400-500"] : [],
    releaseChecklist: allowed ? ["one path selected", "exact side-effect gate", "pilot records selected", "rollback owner", "audit owner"] : [],
    block400Pause: true,
    nextDecisionOptions: allowed
      ? ["scale sandbox readiness", "approve one sandbox read", "approve real owner submissions after storage gate", "approve explicit pilot release records"]
      : [],
    boundaries: boundaries(),
    pilotLaunched: false,
  };
}
