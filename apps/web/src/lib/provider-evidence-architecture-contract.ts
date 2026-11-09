import type { RoleKey } from "./roles";

const internalEvidenceRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance"];

export type ProviderEvidenceAccessLevel = "internal_evidence_architecture" | "forbidden";

export type ProviderEvidenceBlock = {
  range: string;
  label: string;
  outcome: string;
  ownerRole: RoleKey;
  collaboratingRoles: RoleKey[];
  status: "complete" | "planned";
};

export type ProviderEvidenceLane = {
  key: string;
  label: string;
  purpose: string;
  evidenceInputs: string[];
  craysObjects: string[];
  releaseConsumers: string[];
  nextSafeAction: string;
};

export type ProviderEvidenceAdapterGuard = {
  key: string;
  label: string;
  allowedReadClasses: string[];
  blockedActionClasses: string[];
  requiredControls: string[];
  providerCallsEnabled: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  uploadsEnabled: false;
  externalSendingEnabled: false;
};

export type ProviderEvidenceDecisionGate = {
  key: string;
  label: string;
  decisionNeeded: string;
  approvalRequiredBefore: string[];
  defaultState: "blocked";
};

export type ProviderEvidenceArchitectureContract = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: {
    allowed: boolean;
    level: ProviderEvidenceAccessLevel;
    reason: string;
  };
  blockRange: "Blocks 201-250";
  completedBlocks: number;
  totalBlocks: 50;
  recommendedFirstPath: "location_intelligence_read_only_contract";
  northStar: {
    goal: string;
    productRule: string;
    evidenceRule: string;
    approvalRule: string;
  };
  blocks: ProviderEvidenceBlock[];
  evidenceLanes: ProviderEvidenceLane[];
  adapterGuards: ProviderEvidenceAdapterGuard[];
  decisionGates: ProviderEvidenceDecisionGate[];
  acceptanceChecks: string[];
  boundaries: {
    readOnly: true;
    architectureOnly: true;
    providerCallsEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    uploadsEnabled: false;
    ownerSubmissionWritesEnabled: false;
    publicReleaseEnabled: false;
    candidateReleaseEnabled: false;
    bankPackageCreationEnabled: false;
    bankSendEnabled: false;
    paymentInitiationEnabled: false;
    liveAiCallsEnabled: false;
    externalSendingEnabled: false;
    destructiveReconciliationEnabled: false;
    rawProviderPayloadsReturned: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  liveProviderCallsPerformed: false;
  liveSourceRecordsReturned: false;
  liveBusinessRecordsReturned: false;
  liveOwnerPrivateDataReturned: false;
  liveCandidateDataReturned: false;
  liveBankDataReturned: false;
};

const blocks: ProviderEvidenceBlock[] = [
  {
    range: "201",
    label: "Provider Evidence Architecture",
    outcome: "Evidence lanes, adapter guards, consent controls, retention rules, audit events and failure states are defined before any live read.",
    ownerRole: "crays-management",
    collaboratingRoles: ["deal-manager", "expansion-manager", "finance", "reviewer"],
    status: "complete",
  },
  {
    range: "202",
    label: "Location Intelligence decision contract",
    outcome: "Read classes, allowed fields, derived evidence, fixtures and failure behavior are defined without approving a live provider read.",
    ownerRole: "expansion-manager",
    collaboratingRoles: ["deal-manager", "finance", "reviewer"],
    status: "complete",
  },
  {
    range: "203-205",
    label: "Evidence classification",
    outcome: "Property, banking and source-work evidence classes are mapped to CRAYS-owned objects and release consumers.",
    ownerRole: "reviewer",
    collaboratingRoles: ["deal-manager", "expansion-manager", "finance"],
    status: "complete",
  },
  {
    range: "206-210",
    label: "Adapter contract templates",
    outcome: "Read-only adapter contracts are prepared for selected evidence lanes, with live calls blocked by default.",
    ownerRole: "admin",
    collaboratingRoles: ["crays-management", "reviewer"],
    status: "complete",
  },
  {
    range: "211-220",
    label: "Location Intelligence read model",
    outcome: "Catchment, reachability, demand, competition and confidence signals become CRAYS evidence before display.",
    ownerRole: "expansion-manager",
    collaboratingRoles: ["deal-manager", "reviewer"],
    status: "complete",
  },
  {
    range: "221-230",
    label: "Property Supply intake",
    outcome: "Owner digital handoff, Deal Manager manual intake and Expansion Manager manual intake share one normalized property-case path.",
    ownerRole: "expansion-manager",
    collaboratingRoles: ["deal-manager", "reviewer"],
    status: "complete",
  },
  {
    range: "231-238",
    label: "Rent and Deal Economics",
    outcome: "Rent range, tenant-fit reasoning, capex, opening budget and sensitivity data feed prepared-deal scoring.",
    ownerRole: "deal-manager",
    collaboratingRoles: ["expansion-manager", "finance", "reviewer"],
    status: "complete",
  },
  {
    range: "239-244",
    label: "Banking Evidence readiness",
    outcome: "Bank package evidence is classified without bank sends, payment initiation, counterparty actions or finance writes.",
    ownerRole: "finance",
    collaboratingRoles: ["deal-manager", "reviewer"],
    status: "complete",
  },
  {
    range: "245-250",
    label: "Release Governance",
    outcome: "Owner, Candidate and Bank visibility gates are tested before any released evidence leaves internal scope.",
    ownerRole: "reviewer",
    collaboratingRoles: ["crays-management", "deal-manager", "expansion-manager", "finance"],
    status: "complete",
  },
];

const evidenceLanes: ProviderEvidenceLane[] = [
  {
    key: "location-intelligence",
    label: "Location Intelligence",
    purpose: "Power property fit, rent potential, prepared-deal score, Candidate evidence and Banking Evidence without exposing raw provider payloads.",
    evidenceInputs: ["Reachability bands", "Travel-time matrix", "Catchment statistics", "Demand context", "Competition context", "Confidence score"],
    craysObjects: ["location_analyses", "evidence_packages", "property_cases", "prepared_offers", "workflow_events"],
    releaseConsumers: ["Real Estate Owner", "Deal Manager", "Expansion Manager", "Franchise Candidate", "Bank Partner"],
    nextSafeAction: "Create the read-only Location Intelligence adapter contract before any live read.",
  },
  {
    key: "property-feed",
    label: "Property Feed",
    purpose: "Normalize external property supply into CRAYS property cases while keeping publish, update, contact and upload actions blocked.",
    evidenceInputs: ["Listing metadata", "Address metadata", "Rent and area metadata", "Availability metadata", "Attachment metadata"],
    craysObjects: ["properties", "property_cases", "external_record_maps", "organizations", "workflow_events"],
    releaseConsumers: ["Expansion Manager", "Deal Manager", "Real Estate Owner"],
    nextSafeAction: "Create a read-only feed normalization and dedupe contract after Location Intelligence.",
  },
  {
    key: "banking-evidence",
    label: "Banking Evidence",
    purpose: "Represent finance readiness, consent state and bank-package prerequisites without money movement or external send.",
    evidenceInputs: ["Consent status", "Account-information readiness", "Transaction-evidence readiness", "Source-of-funds readiness", "Lender checklist"],
    craysObjects: ["bank_packages", "loan_cases", "financial_models", "document_package_links", "workflow_events"],
    releaseConsumers: ["Finance", "Deal Manager", "Bank Partner"],
    nextSafeAction: "Create a consent/readiness contract only after finance release rules are reviewed.",
  },
  {
    key: "source-work-items",
    label: "Source Work Items",
    purpose: "Tie provider-derived evidence review to CRAYS-owned opening and review work, without writing back to source systems.",
    evidenceInputs: ["Review task state", "Opening milestone state", "Evidence review page", "Approval queue", "Handoff checklist"],
    craysObjects: ["workflow_events", "external_record_maps", "document_package_links", "evidence_packages"],
    releaseConsumers: ["Deal Manager", "Expansion Manager", "Franchise Partner", "Reviewer"],
    nextSafeAction: "Bind evidence gates to internal review tasks before any source write candidate is reopened.",
  },
];

const adapterGuards: ProviderEvidenceAdapterGuard[] = [
  {
    key: "location-intelligence-read",
    label: "Location Intelligence Read",
    allowedReadClasses: ["Isochrone-style reachability", "Travel-time matrix", "Statistics context", "Location score"],
    blockedActionClasses: ["Browser-side provider call", "Raw payload display", "Unreviewed score release", "Client-side key exposure"],
    requiredControls: ["Server-side route", "Role scope", "Consent state when owner-private", "Cache policy", "Audit event", "Payload bounding"],
    providerCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
  },
  {
    key: "property-feed-read",
    label: "Property Feed Read",
    allowedReadClasses: ["Search metadata", "Listing metadata", "Address metadata", "Attachment metadata", "Region lookup"],
    blockedActionClasses: ["Listing publish", "Listing update", "Listing delete", "Owner or broker contact", "Attachment upload"],
    requiredControls: ["OAuth or partner-access decision", "Dedupe policy", "Address normalization", "Retention limit", "Source attribution hidden from product UI"],
    providerCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
  },
  {
    key: "banking-evidence-read",
    label: "Banking Evidence Read",
    allowedReadClasses: ["Consent state", "Account-information readiness", "Transaction-evidence readiness", "Bank-package checklist"],
    blockedActionClasses: ["Payment initiation", "Counterparty creation", "Currency exchange", "Bank package send", "Finance ledger write"],
    requiredControls: ["Finance approval", "Consent trace", "Data minimization", "Redaction", "Bank release gate"],
    providerCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
  },
  {
    key: "source-work-read",
    label: "Source Work Read",
    allowedReadClasses: ["Work item summary", "Cycle or milestone summary", "Module or project summary", "Page or evidence link metadata"],
    blockedActionClasses: ["Source work item create", "Source status update", "Attachment upload", "External notification"],
    requiredControls: ["CRAYS mirror object", "Role-scoped view", "No source UI exposure", "Write-adapter decision before source write"],
    providerCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
  },
];

const decisionGates: ProviderEvidenceDecisionGate[] = [
  {
    key: "first-live-read-path",
    label: "First live read path",
    decisionNeeded: "Choose one exact read-only evidence path, endpoint class and QA fixture set before any live call.",
    approvalRequiredBefore: ["Provider credentials", "Live API request", "Provider payload persistence", "Cache fill"],
    defaultState: "blocked",
  },
  {
    key: "owner-submission-write",
    label: "Owner submission write",
    decisionNeeded: "Define required fields, consent, file policy and audit trail before owner digital handoff can create records.",
    approvalRequiredBefore: ["Owner submission write", "Document upload", "Owner message send"],
    defaultState: "blocked",
  },
  {
    key: "candidate-bank-release",
    label: "Candidate and Bank release",
    decisionNeeded: "Define released evidence set, redaction, approvals and revocation before evidence leaves internal scope.",
    approvalRequiredBefore: ["Candidate release", "Bank partner release", "Public teaser release"],
    defaultState: "blocked",
  },
  {
    key: "finance-action-boundary",
    label: "Finance action boundary",
    decisionNeeded: "Separate evidence readiness from money movement, bank package send, counterparty creation and finance writes.",
    approvalRequiredBefore: ["Payment initiation", "Bank send", "Counterparty action", "Accounting export"],
    defaultState: "blocked",
  },
];

const acceptanceChecks = [
  "Location Intelligence is selected as the recommended first read-only adapter contract.",
  "Every evidence lane has CRAYS-owned objects and release consumers.",
  "Every adapter guard keeps provider calls, source writes, sync writes, uploads and external sending disabled.",
  "Owner, Candidate and Bank visibility remain release-gated.",
  "No raw provider payloads, secrets, private keys or live source records are returned.",
  "Product source and UI remain provider-neutral.",
  "Block 201 does not approve live reads or writes.",
];

function accessForRole(role: RoleKey): ProviderEvidenceArchitectureContract["access"] {
  if (internalEvidenceRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_evidence_architecture",
      reason: "Role can review the internal Provider Evidence Architecture. Live reads, writes, uploads, releases and sends remain disabled.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Provider Evidence Architecture is internal only until a release-gated external evidence surface is separately approved.",
  };
}

function boundaries(): ProviderEvidenceArchitectureContract["boundaries"] {
  return {
    readOnly: true,
    architectureOnly: true,
    providerCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    uploadsEnabled: false,
    ownerSubmissionWritesEnabled: false,
    publicReleaseEnabled: false,
    candidateReleaseEnabled: false,
    bankPackageCreationEnabled: false,
    bankSendEnabled: false,
    paymentInitiationEnabled: false,
    liveAiCallsEnabled: false,
    externalSendingEnabled: false,
    destructiveReconciliationEnabled: false,
    rawProviderPayloadsReturned: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

export function getProviderEvidenceArchitecture(role: RoleKey): ProviderEvidenceArchitectureContract {
  const access = accessForRole(role);
  const allowed = access.allowed;

  return {
    status: allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 201-250",
    completedBlocks: allowed ? 50 : 0,
    totalBlocks: 50,
    recommendedFirstPath: "location_intelligence_read_only_contract",
    northStar: {
      goal: "Turn provider and source signals into CRAYS-owned evidence for prepared franchise deals.",
      productRule: "CRAYS owns labels, workflow, role scope and release gates; source systems stay behind adapters.",
      evidenceRule: "Provider-derived values must become bounded CRAYS evidence before display or release.",
      approvalRule: "Each live read or write needs an exact approval for path, fields, endpoint class and QA.",
    },
    blocks: allowed ? blocks : [],
    evidenceLanes: allowed ? evidenceLanes : [],
    adapterGuards: allowed ? adapterGuards : [],
    decisionGates: allowed ? decisionGates : [],
    acceptanceChecks: allowed ? acceptanceChecks : [],
    boundaries: boundaries(),
    liveProviderCallsPerformed: false,
    liveSourceRecordsReturned: false,
    liveBusinessRecordsReturned: false,
    liveOwnerPrivateDataReturned: false,
    liveCandidateDataReturned: false,
    liveBankDataReturned: false,
  };
}
