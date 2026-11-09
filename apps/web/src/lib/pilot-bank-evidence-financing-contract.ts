import type { RoleKey } from "./roles";

const internalBankEvidenceFinancingRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "finance"];

type BankEvidenceFinancingAccessLevel =
  | "internal_financing_package_control"
  | "bank_partner_release_shell"
  | "candidate_financing_status_shell"
  | "forbidden";
type BankEvidenceFinancingStageStatus = "ready" | "model_ready" | "decision_required" | "release_required" | "locked";
type BankEvidenceFinancingFunctionState = "represented" | "deferred_until_exact_gate";

export type BankEvidenceFinancingPilotAccess = {
  allowed: boolean;
  level: BankEvidenceFinancingAccessLevel;
  reason: string;
};

export type BankEvidenceFinancingPilotBoundary = {
  coreDevPilotDataAllowed: true;
  bankReadinessReadsEnabled: true;
  candidateIntentSignalsReadable: boolean;
  financingPackageShellEnabled: true;
  bankPartnerShellEnabled: boolean;
  candidateFinanceShellEnabled: boolean;
  bankPartnerPackageRecordsEnabled: false;
  bankPackageCreationEnabled: false;
  bankHandoffEnabled: false;
  lenderReleaseEnabled: false;
  bankSendEnabled: false;
  paymentInitiationEnabled: false;
  financeWritesEnabled: false;
  candidateConsentCollectionEnabled: false;
  regulatedChecksStarted: false;
  kycAmlStarted: false;
  equityCheckStarted: false;
  sourceOfFundsCollectionEnabled: false;
  fileUploadEnabled: false;
  liveExternalReadsEnabled: false;
  liveProviderCallsEnabled: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  toolApplyEnabled: false;
  externalSendingEnabled: false;
  candidateReleaseEnabled: false;
  publicReleaseEnabled: false;
  productionDeployEnabled: false;
  vpsChangingWorkEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type BankEvidenceFinancingPilotStage = {
  key: string;
  label: string;
  status: BankEvidenceFinancingStageStatus;
  current: string;
  requiredFor: string;
};

export type BankEvidenceFinancingPilotWorkItem = {
  key: string;
  label: string;
  ownerRole: RoleKey;
  moduleSurface: "Loans" | "CRM" | "Files" | "Settings" | "Sites";
  commandBoundary: string;
  guardedRoute: string;
  status: BankEvidenceFinancingStageStatus;
  current: string;
  nextAction: string;
  closedGate: string;
};

export type BankEvidenceFinancingPilotReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: BankEvidenceFinancingPilotAccess;
  blockRange: "Blocks 661-670";
  journeySegment: "Bank Package Readiness";
  ownerRoles: RoleKey[];
  consumingRoles: RoleKey[];
  summary: {
    bankPackages: number;
    loanCases: number;
    financialModels: number;
    documentPackageLinks: number;
    candidateIntents: number;
    releasedOffers: number;
    readyPrerequisites: number;
    blockedPrerequisites: number;
    decisionRequiredPrerequisites: number;
    prerequisites: number;
    workItems: number;
    modelReadyWorkItems: number;
    readinessGates: number;
    readyGates: number;
    visibleSurfaces: number;
    preservedFunctions: number;
    openSideEffectGates: 0;
    internalCountsReturned: boolean;
  };
  stages: BankEvidenceFinancingPilotStage[];
  workItems: BankEvidenceFinancingPilotWorkItem[];
  visibleSurfaces: Array<{
    surface: string;
    roleUse: string;
  }>;
  preservedFunctions: Array<{
    key: string;
    label: string;
    state: BankEvidenceFinancingFunctionState;
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
  boundaries: BankEvidenceFinancingPilotBoundary;
  liveBusinessRecordsReturned: boolean;
  bankPartnerPackageRecordsReturned: false;
  financeRecordsWritten: false;
  externalPackageReleased: false;
};

export function bankEvidenceFinancingPilotAccessForRole(role: RoleKey): BankEvidenceFinancingPilotAccess {
  if (internalBankEvidenceFinancingRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_financing_package_control",
      reason: "Role can review financing package prerequisites, conditions, shell state and command readiness before any bank release.",
    };
  }

  if (role === "bank-partner") {
    return {
      allowed: true,
      level: "bank_partner_release_shell",
      reason: "Role can read the release-gated bank partner shell only; no internal package, Candidate or lender records are returned.",
    };
  }

  if (role === "franchise-candidate") {
    return {
      allowed: true,
      level: "candidate_financing_status_shell",
      reason: "Role can see financing status and closed gates in the Candidate journey; no bank package records are returned.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Bank Evidence and Financing Package pilot access requires Finance, Deal Manager, review, Bank Partner or Candidate scope.",
  };
}

export function bankEvidenceFinancingPilotBoundary(input: {
  internalCountsReturned: boolean;
  bankPartnerShell: boolean;
  candidateFinanceShell: boolean;
}): BankEvidenceFinancingPilotBoundary {
  return {
    coreDevPilotDataAllowed: true,
    bankReadinessReadsEnabled: true,
    candidateIntentSignalsReadable: input.internalCountsReturned,
    financingPackageShellEnabled: true,
    bankPartnerShellEnabled: input.bankPartnerShell,
    candidateFinanceShellEnabled: input.candidateFinanceShell,
    bankPartnerPackageRecordsEnabled: false,
    bankPackageCreationEnabled: false,
    bankHandoffEnabled: false,
    lenderReleaseEnabled: false,
    bankSendEnabled: false,
    paymentInitiationEnabled: false,
    financeWritesEnabled: false,
    candidateConsentCollectionEnabled: false,
    regulatedChecksStarted: false,
    kycAmlStarted: false,
    equityCheckStarted: false,
    sourceOfFundsCollectionEnabled: false,
    fileUploadEnabled: false,
    liveExternalReadsEnabled: false,
    liveProviderCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    externalSendingEnabled: false,
    candidateReleaseEnabled: false,
    publicReleaseEnabled: false,
    productionDeployEnabled: false,
    vpsChangingWorkEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function visibleSurfaces(access: BankEvidenceFinancingPilotAccess): BankEvidenceFinancingPilotReadiness["visibleSurfaces"] {
  if (access.level === "bank_partner_release_shell") {
    return [
      { surface: "Loans", roleUse: "Bank Partner sees package readiness shell and closed release gates." },
      { surface: "Files", roleUse: "Document access remains locked until package release approval." },
    ];
  }

  if (access.level === "candidate_financing_status_shell") {
    return [
      { surface: "Sites", roleUse: "Candidate sees financing readiness status without bank package records." },
      { surface: "Loans", roleUse: "Financing steps stay locked until consent and regulated gates are approved." },
    ];
  }

  return [
    { surface: "Loans", roleUse: "Finance owns prerequisites, conditions, checklist and release preparation." },
    { surface: "CRM", roleUse: "Deal Manager links Candidate intent and follow-up into financing readiness." },
    { surface: "Files", roleUse: "Reviewers inspect document package links and evidence requirements." },
    { surface: "Settings", roleUse: "Admin verifies gates, command boundaries and QA." },
    { surface: "Sites", roleUse: "Candidate and Bank shells stay release-gated." },
  ];
}

function preservedFunctions(): BankEvidenceFinancingPilotReadiness["preservedFunctions"] {
  return [
    { key: "prerequisite-checklist", label: "Financing prerequisite checklist and condition review", state: "represented" },
    { key: "candidate-intent-signal", label: "Candidate purchase or financing intent signal", state: "represented" },
    { key: "document-package-state", label: "Document package and evidence link readiness", state: "represented" },
    { key: "partner-shell", label: "Bank Partner release-gated workspace shell", state: "represented" },
    { key: "loan-case-model", label: "Loan case, financial model and conditions read model", state: "represented" },
    { key: "regulated-execution", label: "KYC / AML, equity check and source-of-funds execution", state: "deferred_until_exact_gate" },
    { key: "bank-release-send", label: "Bank package release, bank send and payment initiation", state: "deferred_until_exact_gate" },
  ];
}

function stageStatusFromCounts(count: number, fallback: BankEvidenceFinancingStageStatus) {
  return count > 0 ? "ready" : fallback;
}

function stages(input: {
  candidateIntents: number;
  releasedOffers: number;
  documentPackageLinks: number;
  bankPackages: number;
  readyPrerequisites: number;
  decisionRequiredPrerequisites: number;
}): BankEvidenceFinancingPilotReadiness["stages"] {
  return [
    {
      key: "candidate-intent",
      label: "Candidate financing signal",
      status: stageStatusFromCounts(input.candidateIntents, "release_required"),
      current: `${input.candidateIntents} eligible Candidate intent records`,
      requiredFor: "Financing package preparation",
    },
    {
      key: "deal-source-material",
      label: "Deal source material",
      status: stageStatusFromCounts(input.releasedOffers, "release_required"),
      current: `${input.releasedOffers} Candidate-visible released offers`,
      requiredFor: "Package source evidence",
    },
    {
      key: "regulated-consent",
      label: "Consent and regulated policy",
      status: input.decisionRequiredPrerequisites > 0 ? "decision_required" : "ready",
      current: `${input.decisionRequiredPrerequisites} finance policy decisions required`,
      requiredFor: "KYC / AML, equity and source-of-funds start",
    },
    {
      key: "document-package",
      label: "Financing evidence package",
      status: input.documentPackageLinks > 0 ? "model_ready" : "release_required",
      current: `${input.documentPackageLinks} bank or loan document links`,
      requiredFor: "Bank Partner release review",
    },
    {
      key: "bank-package-record",
      label: "Bank package record",
      status: input.bankPackages > 0 ? "model_ready" : "locked",
      current: `${input.bankPackages} internal bank package records`,
      requiredFor: "Released partner workspace",
    },
    {
      key: "lender-release",
      label: "Lender release",
      status: "locked",
      current: "Bank release, bank send and payment initiation are closed",
      requiredFor: "External financing partner work",
    },
    {
      key: "package-readiness",
      label: "Readiness gate set",
      status: input.readyPrerequisites > 0 ? "model_ready" : "release_required",
      current: `${input.readyPrerequisites} prerequisites ready before release`,
      requiredFor: "Block 671-680 opening handoff input",
    },
  ];
}

function workItems(input: {
  coreCommandStoreReady: boolean;
  candidateIntents: number;
  documentPackageLinks: number;
  bankPackages: number;
}): BankEvidenceFinancingPilotReadiness["workItems"] {
  return [
    {
      key: "confirm-candidate-financing-scope",
      label: "Confirm Candidate financing scope",
      ownerRole: "deal-manager",
      moduleSurface: "CRM",
      commandBoundary: "candidate.intent.review",
      guardedRoute: "/api/crays/candidate/prepared-offers/intent/review",
      status: input.candidateIntents > 0 ? "ready" : "release_required",
      current: input.candidateIntents > 0 ? "Candidate intent signal exists." : "No eligible purchase or financing intent.",
      nextAction: "Review Candidate intent and keep bank workflow locked.",
      closedGate: "OPEN_BETA_BANK_PACKAGE_RELEASE",
    },
    {
      key: "review-consent-policy",
      label: "Review consent and retention policy",
      ownerRole: "finance",
      moduleSurface: "Loans",
      commandBoundary: "loans.consent.policy_review",
      guardedRoute: "/api/crays/bank-packages/readiness",
      status: "decision_required",
      current: "Consent wording, retention and evidence policy require approval.",
      nextAction: "Prepare policy decision brief for review.",
      closedGate: "OPEN_BETA_BANK_PACKAGE_RELEASE",
    },
    {
      key: "assemble-financing-checklist",
      label: "Assemble financing checklist",
      ownerRole: "finance",
      moduleSurface: "Loans",
      commandBoundary: "loans.bank_package_checklist",
      guardedRoute: "/api/crays/core-command/loans-checklist",
      status: input.coreCommandStoreReady ? "model_ready" : "release_required",
      current: input.coreCommandStoreReady ? "Checklist command model is ready; apply gate closed." : "Core command store required.",
      nextAction: "Stage checklist items without writing finance records.",
      closedGate: "OPEN_DEV_LOANS_CHECKLIST_APPLY",
    },
    {
      key: "prepare-document-package",
      label: "Prepare evidence document package",
      ownerRole: "reviewer",
      moduleSurface: "Files",
      commandBoundary: "files.bank_package.metadata_link",
      guardedRoute: "/api/crays/core-command/files-package",
      status: input.documentPackageLinks > 0 ? "model_ready" : "release_required",
      current: `${input.documentPackageLinks} package document links available for review.`,
      nextAction: "Keep uploads and partner visibility disabled.",
      closedGate: "OPEN_DEV_FILES_PACKAGE_APPLY",
    },
    {
      key: "open-bank-partner-shell",
      label: "Open Bank Partner shell",
      ownerRole: "finance",
      moduleSurface: "Loans",
      commandBoundary: "bank_partner.release_shell",
      guardedRoute: "/api/crays/pilot-workflow/bank-evidence-financing/readiness",
      status: "locked",
      current: "Partner shell is readable but returns zero package records.",
      nextAction: "Require exact release gate before any bank package access.",
      closedGate: "OPEN_BETA_BANK_PACKAGE_RELEASE",
    },
    {
      key: "hold-lender-release",
      label: "Hold lender release",
      ownerRole: "finance",
      moduleSurface: "Settings",
      commandBoundary: "bank_package.release_decision",
      guardedRoute: "/api/crays/bank-packages/readiness",
      status: input.bankPackages > 0 ? "decision_required" : "locked",
      current: input.bankPackages > 0 ? "Internal package record exists; release disabled." : "No package record and release disabled.",
      nextAction: "Keep bank send and payment initiation Off.",
      closedGate: "OPEN_BETA_BANK_PACKAGE_RELEASE",
    },
  ];
}

function gates(input: {
  candidateIntents: number;
  releasedOffers: number;
  documentPackageLinks: number;
  coreCommandStoreReady: boolean;
}): BankEvidenceFinancingPilotReadiness["gates"] {
  return [
    {
      key: "candidate-intent",
      label: "Candidate intent signal",
      ready: input.candidateIntents > 0,
      current: input.candidateIntents > 0 ? "Intent signal can inform readiness." : "No eligible Candidate intent.",
    },
    {
      key: "released-offer",
      label: "Released source offer",
      ready: input.releasedOffers > 0,
      current: input.releasedOffers > 0 ? "Candidate source offer exists." : "No Candidate-visible released offer.",
    },
    {
      key: "document-package",
      label: "Document package links",
      ready: input.documentPackageLinks > 0,
      current: input.documentPackageLinks > 0 ? "Document metadata exists." : "No released document package links.",
    },
    {
      key: "command-store",
      label: "Core command store",
      ready: input.coreCommandStoreReady,
      current: input.coreCommandStoreReady ? "Checklist commands can be modeled." : "Command store pending.",
    },
    {
      key: "bank-release",
      label: "Bank package release",
      ready: false,
      current: "Closed until exact release gate.",
    },
    {
      key: "bank-send",
      label: "Bank send and payment",
      ready: false,
      current: "Closed until exact bank and payment gates.",
    },
  ];
}

function nextBlockInputs(): BankEvidenceFinancingPilotReadiness["nextBlockInputs"] {
  return [
    {
      blockRange: "671-680",
      requiredInput: "Opening Handoff can consume only reviewed internal financing readiness; no bank release or lender package is required.",
    },
    {
      blockRange: "681-690",
      requiredInput: "Cross-role dashboards must show financing gates as scoped readiness, not released bank data.",
    },
  ];
}

export function emptyBankEvidenceFinancingPilotReadiness(role: RoleKey): BankEvidenceFinancingPilotReadiness {
  const access = bankEvidenceFinancingPilotAccessForRole(role);
  const surfaceList = access.allowed ? visibleSurfaces(access) : [];
  const functionList = access.allowed ? preservedFunctions() : [];
  const boundary = bankEvidenceFinancingPilotBoundary({
    internalCountsReturned: access.level === "internal_financing_package_control",
    bankPartnerShell: access.level === "bank_partner_release_shell",
    candidateFinanceShell: access.level === "candidate_financing_status_shell",
  });

  return {
    status: access.allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 661-670",
    journeySegment: "Bank Package Readiness",
    ownerRoles: ["finance", "deal-manager"],
    consumingRoles: ["bank-partner", "franchise-candidate", "reviewer", "crays-management"],
    summary: {
      bankPackages: 0,
      loanCases: 0,
      financialModels: 0,
      documentPackageLinks: 0,
      candidateIntents: 0,
      releasedOffers: 0,
      readyPrerequisites: 0,
      blockedPrerequisites: 0,
      decisionRequiredPrerequisites: 0,
      prerequisites: 0,
      workItems: 0,
      modelReadyWorkItems: 0,
      readinessGates: 0,
      readyGates: 0,
      visibleSurfaces: surfaceList.length,
      preservedFunctions: functionList.length,
      openSideEffectGates: 0,
      internalCountsReturned: false,
    },
    stages: [],
    workItems: [],
    visibleSurfaces: surfaceList,
    preservedFunctions: functionList,
    gates: [],
    nextBlockInputs: access.allowed ? nextBlockInputs() : [],
    boundaries: boundary,
    liveBusinessRecordsReturned: false,
    bankPartnerPackageRecordsReturned: false,
    financeRecordsWritten: false,
    externalPackageReleased: false,
  };
}

export function buildBankEvidenceFinancingPilotReadiness(
  role: RoleKey,
  input: {
    bankPackages: number;
    loanCases: number;
    financialModels: number;
    documentPackageLinks: number;
    candidateIntents: number;
    releasedOffers: number;
    readyPrerequisites: number;
    blockedPrerequisites: number;
    decisionRequiredPrerequisites: number;
    prerequisites: number;
    coreCommandStoreReady: boolean;
    internalCountsReturned: boolean;
  },
): BankEvidenceFinancingPilotReadiness {
  const base = emptyBankEvidenceFinancingPilotReadiness(role);
  const stageList = stages(input);
  const workItemList = workItems(input);
  const gateList = gates(input);

  return {
    ...base,
    summary: {
      ...base.summary,
      bankPackages: input.bankPackages,
      loanCases: input.loanCases,
      financialModels: input.financialModels,
      documentPackageLinks: input.documentPackageLinks,
      candidateIntents: input.candidateIntents,
      releasedOffers: input.releasedOffers,
      readyPrerequisites: input.readyPrerequisites,
      blockedPrerequisites: input.blockedPrerequisites,
      decisionRequiredPrerequisites: input.decisionRequiredPrerequisites,
      prerequisites: input.prerequisites,
      workItems: workItemList.length,
      modelReadyWorkItems: workItemList.filter((item) => item.status === "model_ready").length,
      readinessGates: gateList.length,
      readyGates: gateList.filter((gate) => gate.ready).length,
      internalCountsReturned: input.internalCountsReturned,
    },
    stages: stageList,
    workItems: workItemList,
    gates: gateList,
    boundaries: bankEvidenceFinancingPilotBoundary({
      internalCountsReturned: input.internalCountsReturned,
      bankPartnerShell: base.access.level === "bank_partner_release_shell",
      candidateFinanceShell: base.access.level === "candidate_financing_status_shell",
    }),
  };
}
