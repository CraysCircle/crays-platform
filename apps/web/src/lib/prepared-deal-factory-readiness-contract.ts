import type { RoleKey } from "./roles";

const internalFactoryRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance"];
const scopedFactoryRoles: RoleKey[] = ["franchise-candidate", "bank-partner", "landlord", "investor"];

export type PreparedDealFactoryAccessLevel =
  | "internal_factory_readiness"
  | "finance_bank_package_readiness"
  | "release_gated_factory_shell"
  | "forbidden";

export type PreparedDealFactoryBlock = {
  range: string;
  label: string;
  outcome: string;
  ownerRole: RoleKey;
  collaboratingRoles: RoleKey[];
  status: "complete";
};

export type PreparedDealFactorySourceStage = {
  key: string;
  label: string;
  purpose: string;
  sourceInputs: string[];
  craysCoreObjects: string[];
  evidenceOutputs: string[];
  releaseGate: string;
};

export type PreparedDealFactoryIntegrationBoundary = {
  key: string;
  label: string;
  readScope: string[];
  blockedActions: string[];
  craysPersistenceRequired: true;
  providerCallsEnabled: false;
  sourceWritesEnabled: false;
  externalSendingEnabled: false;
};

export type PreparedDealFactoryDataRequirement = {
  key: string;
  label: string;
  requiredFor: string;
  requiredObjects: string[];
  readinessRule: string;
};

export type PreparedDealFactoryReadinessContract = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: {
    allowed: boolean;
    level: PreparedDealFactoryAccessLevel;
    reason: string;
  };
  blockRange: "Blocks 151-200";
  completedBlocks: number;
  totalBlocks: 50;
  northStar: {
    goal: string;
    productRule: string;
    dataRule: string;
    providerRule: string;
  };
  factoryBlocks: PreparedDealFactoryBlock[];
  sourceChain: PreparedDealFactorySourceStage[];
  integrationBoundaries: PreparedDealFactoryIntegrationBoundary[];
  dataRequirements: PreparedDealFactoryDataRequirement[];
  acceptanceChecks: string[];
  nextGate: "block_200_write_provider_decision";
  boundaries: {
    readOnly: true;
    readinessOnly: true;
    providerCallsEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    uploadsEnabled: false;
    publicReleaseEnabled: false;
    candidateReleaseEnabled: false;
    bankPackageCreationEnabled: false;
    bankSendEnabled: false;
    paymentInitiationEnabled: false;
    liveAiCallsEnabled: false;
    externalSendingEnabled: false;
    destructiveReconciliationEnabled: false;
    sourceUiExposureEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  liveBusinessRecordReturned: false;
  liveProviderPayloadsReturned: false;
  liveCandidateDataReturned: false;
  liveBankDataReturned: false;
};

const factoryBlocks: PreparedDealFactoryBlock[] = [
  {
    range: "151-155",
    label: "North-star guardrails",
    outcome: "Prepared deal factory is the next product objective; UI-only work is not the path.",
    ownerRole: "crays-management",
    collaboratingRoles: ["deal-manager", "expansion-manager", "finance", "reviewer"],
    status: "complete",
  },
  {
    range: "156-165",
    label: "Property owner and supply backbone",
    outcome: "Deal Manager and Expansion Manager can review owner fit, manual property intake, digital owner handoff and property feed normalization before any candidate or bank visibility.",
    ownerRole: "expansion-manager",
    collaboratingRoles: ["deal-manager", "reviewer", "crays-management"],
    status: "complete",
  },
  {
    range: "166-175",
    label: "Location evidence engine",
    outcome: "Catchment, travel-time, context and score evidence are persisted as CRAYS evidence packages.",
    ownerRole: "expansion-manager",
    collaboratingRoles: ["deal-manager", "reviewer"],
    status: "complete",
  },
  {
    range: "176-182",
    label: "Deal scoring model",
    outcome: "Rent sensitivity, demand confidence, investment assumptions and opening risk feed one deal readiness score.",
    ownerRole: "deal-manager",
    collaboratingRoles: ["expansion-manager", "finance", "reviewer"],
    status: "complete",
  },
  {
    range: "183-189",
    label: "Candidate and CRM binding",
    outcome: "Candidate intent, contacts, communication and deal-team work bind to the prepared offer without public release.",
    ownerRole: "deal-manager",
    collaboratingRoles: ["expansion-manager", "finance", "reviewer"],
    status: "complete",
  },
  {
    range: "190-195",
    label: "Bank package readiness",
    outcome: "Banking evidence, source-of-funds, KYC / AML gates and lender checklist stay locked until explicit approval.",
    ownerRole: "finance",
    collaboratingRoles: ["deal-manager", "reviewer", "bank-partner"],
    status: "complete",
  },
  {
    range: "196-199",
    label: "End-to-end prepared deal slice",
    outcome: "A prepared deal can be traced from property supply through location evidence, finance, candidate fit and bank readiness.",
    ownerRole: "reviewer",
    collaboratingRoles: ["deal-manager", "expansion-manager", "finance"],
    status: "complete",
  },
  {
    range: "200",
    label: "Write and provider decision gate",
    outcome: "Provider calls and writes remain off until a separate approved decision brief exists.",
    ownerRole: "admin",
    collaboratingRoles: ["crays-management", "reviewer"],
    status: "complete",
  },
];

const sourceChain: PreparedDealFactorySourceStage[] = [
  {
    key: "owner-fit-check",
    label: "Owner fit check",
    purpose: "Help property owners understand whether their site fits CRAYS and what evidence is needed for a leasing decision.",
    sourceInputs: ["Owner property basics", "Manual internal property entry", "Digital owner handoff", "Target rent range", "Space and access profile", "Fit-out readiness", "Decision questions"],
    craysCoreObjects: ["properties", "property_cases", "organizations", "workflow_events"],
    evidenceOutputs: ["Property fit guidance", "Rent potential range", "Tenant concept fit", "Owner handoff checklist"],
    releaseGate: "Public guidance only; private owner handoff requires reviewed intake and account scope.",
  },
  {
    key: "property-supply",
    label: "Property supply",
    purpose: "Turn available sites into normalized CRAYS property cases.",
    sourceInputs: ["Listing metadata", "Manual address entry", "Digital owner submission state", "Address and geo position", "Rent and area", "Availability", "Broker or owner relationship"],
    craysCoreObjects: ["properties", "property_cases", "organizations", "external_record_maps"],
    evidenceOutputs: ["Property intake summary", "Lease economics baseline", "Owner or broker follow-up queue"],
    releaseGate: "Expansion review before Deal Manager handoff.",
  },
  {
    key: "location-evidence",
    label: "Location evidence",
    purpose: "Prove whether a site can support the franchise model before it becomes a prepared offer.",
    sourceInputs: ["Isochrone bands", "Travel-time reach", "Places context", "Statistics context", "Location score"],
    craysCoreObjects: ["location_analyses", "evidence_packages", "workflow_events"],
    evidenceOutputs: ["Catchment confidence", "Demand and competition notes", "Bankability location evidence"],
    releaseGate: "Internal evidence package review before Candidate or bank scope.",
  },
  {
    key: "deal-economics",
    label: "Deal economics",
    purpose: "Join property cost, capex, opening budget and revenue assumptions into one prepared deal model.",
    sourceInputs: ["Rent sensitivity", "Capex budget", "Projected members", "Pricing assumptions", "Opening window"],
    craysCoreObjects: ["prepared_offers", "financial_models", "workflow_events"],
    evidenceOutputs: ["Investment model", "Payback view", "Risk and assumptions log"],
    releaseGate: "Deal Manager review before Candidate detail release.",
  },
  {
    key: "candidate-fit",
    label: "Candidate fit",
    purpose: "Match a candidate to a prepared offer without starting regulated checks too early.",
    sourceInputs: ["Candidate account scope", "Purchase intent", "Financing intent", "Deal-team questions"],
    craysCoreObjects: ["candidate_intents", "conversations", "messages", "workflow_events"],
    evidenceOutputs: ["Intent state", "Candidate question trail", "Deal room readiness"],
    releaseGate: "Candidate release decision and account scope required.",
  },
  {
    key: "banking-evidence",
    label: "Banking evidence",
    purpose: "Prepare bank-package prerequisites from consented evidence and internal finance summaries.",
    sourceInputs: ["Consent state", "Account information status", "Transaction-history evidence state", "Source-of-funds readiness"],
    craysCoreObjects: ["bank_packages", "loan_cases", "financial_models", "document_package_links"],
    evidenceOutputs: ["Lender checklist", "Cashflow evidence draft", "Conditions and drawdown readiness"],
    releaseGate: "Finance approval before bank partner package access.",
  },
  {
    key: "opening-project",
    label: "Opening project",
    purpose: "Convert a selected prepared deal into a controlled opening project after approval.",
    sourceInputs: ["Lease package", "Construction documents", "Supplier readiness", "Milestones"],
    craysCoreObjects: ["workflow_events", "document_package_links", "external_record_maps"],
    evidenceOutputs: ["Opening timeline", "Milestone readiness", "Handoff checklist"],
    releaseGate: "Franchise Partner handoff only after closing and opening readiness.",
  },
  {
    key: "document-vault",
    label: "Document vault",
    purpose: "Keep evidence, lease, finance and bank documents scoped by package type and release state.",
    sourceInputs: ["Document metadata", "Version state", "Approval status", "Visibility grants"],
    craysCoreObjects: ["document_package_links", "evidence_packages", "workflow_events"],
    evidenceOutputs: ["Approved document set", "Package completeness", "Audit-ready source register"],
    releaseGate: "No binary access or upload until file policy is approved.",
  },
  {
    key: "analytics-read-model",
    label: "Analytics read model",
    purpose: "Expose portfolio and management insight from CRAYS-owned snapshots, not raw provider payloads.",
    sourceInputs: ["Deal readiness events", "Location evidence scores", "Finance summaries", "Package gates"],
    craysCoreObjects: ["workflow_events", "evidence_packages", "financial_models"],
    evidenceOutputs: ["Portfolio readiness", "Risk queue", "Prepared deal funnel"],
    releaseGate: "Role-scoped dashboard read model only.",
  },
];

const integrationBoundaries: PreparedDealFactoryIntegrationBoundary[] = [
  {
    key: "owner-handoff",
    label: "Owner Handoff",
    readScope: ["Property basics", "Lease expectation", "Owner decision context", "Handoff readiness", "Required document metadata"],
    blockedActions: ["Public property submission write", "Document upload", "Owner contact send", "Lease offer commitment"],
    craysPersistenceRequired: true,
    providerCallsEnabled: false,
    sourceWritesEnabled: false,
    externalSendingEnabled: false,
  },
  {
    key: "location-intelligence",
    label: "Location Intelligence",
    readScope: ["Isochrones", "Travel times", "Places context", "Statistics context", "Location scoring"],
    blockedActions: ["Client-side keys", "Raw provider payload display", "Provider calls from browser", "Unreviewed score release"],
    craysPersistenceRequired: true,
    providerCallsEnabled: false,
    sourceWritesEnabled: false,
    externalSendingEnabled: false,
  },
  {
    key: "property-feed",
    label: "Property Feed",
    readScope: ["Search result metadata", "Listing detail metadata", "Expose metadata", "Attachment metadata", "Region and geo lookup"],
    blockedActions: ["Publish listings", "Contact owner or broker", "Upload attachments", "Delete or update source listings"],
    craysPersistenceRequired: true,
    providerCallsEnabled: false,
    sourceWritesEnabled: false,
    externalSendingEnabled: false,
  },
  {
    key: "banking-evidence",
    label: "Banking Evidence",
    readScope: ["Consent state", "Account information state", "Transaction evidence state", "Payment-draft readiness state"],
    blockedActions: ["Payment initiation", "Money movement", "Bank package send", "Sensitive card or account detail display"],
    craysPersistenceRequired: true,
    providerCallsEnabled: false,
    sourceWritesEnabled: false,
    externalSendingEnabled: false,
  },
  {
    key: "crm-records",
    label: "CRM Records",
    readScope: ["Candidates", "Companies", "People", "Opportunities", "Tasks and notes"],
    blockedActions: ["Source writes", "External messages", "Automated workflow execution"],
    craysPersistenceRequired: true,
    providerCallsEnabled: false,
    sourceWritesEnabled: false,
    externalSendingEnabled: false,
  },
  {
    key: "project-readiness",
    label: "Project Readiness",
    readScope: ["Opening projects", "Milestones", "Work items", "Pages and handoff records"],
    blockedActions: ["Project creation", "Work item writes", "File upload", "Stakeholder notifications"],
    craysPersistenceRequired: true,
    providerCallsEnabled: false,
    sourceWritesEnabled: false,
    externalSendingEnabled: false,
  },
  {
    key: "finance-records",
    label: "Finance Records",
    readScope: ["Budget summaries", "Invoice status summaries", "Payment status summaries", "Financial model summaries"],
    blockedActions: ["Accounting export", "Payment execution", "Bank send", "Ledger write"],
    craysPersistenceRequired: true,
    providerCallsEnabled: false,
    sourceWritesEnabled: false,
    externalSendingEnabled: false,
  },
];

const dataRequirements: PreparedDealFactoryDataRequirement[] = [
  {
    key: "owner-decision-data",
    label: "Owner decision data",
    requiredFor: "Convince property owners that CRAYS can be the right tenant and leasing path.",
    requiredObjects: ["Tenant concept", "Rent potential range", "Fit checklist", "Opening timeline", "Evidence request list"],
    readinessRule: "Owner-facing claims must be guidance or reviewed CRAYS release data, never raw provider output.",
  },
  {
    key: "site-minimum-data",
    label: "Site minimum data",
    requiredFor: "Create a property case.",
    requiredObjects: ["Property address or geo position", "Area", "Rent", "Availability", "Use constraints"],
    readinessRule: "A property cannot enter location analysis without geo and lease economics baseline.",
  },
  {
    key: "location-proof",
    label: "Location proof",
    requiredFor: "Turn a property case into a prepared offer.",
    requiredObjects: ["Catchment bands", "Travel-time reach", "Places context", "Statistics context", "Competition notes"],
    readinessRule: "Derived evidence must be persisted before it is displayed or packaged.",
  },
  {
    key: "economics-proof",
    label: "Economics proof",
    requiredFor: "Candidate-safe investment model.",
    requiredObjects: ["Capex baseline", "Rent sensitivity", "Revenue assumptions", "Opening budget", "Payback scenario"],
    readinessRule: "Assumptions must be traceable to source evidence and reviewed by Deal Manager.",
  },
  {
    key: "candidate-proof",
    label: "Candidate proof",
    requiredFor: "Purchase or financing intent.",
    requiredObjects: ["Candidate account scope", "Intent state", "Deal-team thread", "Document grants"],
    readinessRule: "Candidate detail release is explicit and separate from public teaser visibility.",
  },
  {
    key: "bank-proof",
    label: "Bank proof",
    requiredFor: "Bank package readiness.",
    requiredObjects: ["KYC / AML state", "Equity check state", "Source-of-funds state", "Banking evidence consent state", "Lender checklist"],
    readinessRule: "Bank partner scope stays locked until Finance approves package release.",
  },
  {
    key: "handoff-proof",
    label: "Handoff proof",
    requiredFor: "Opening project creation decision.",
    requiredObjects: ["Lease package", "Document approvals", "Opening milestones", "Budget readiness", "Partner handoff status"],
    readinessRule: "Opening project writes remain blocked until closing and handoff approval.",
  },
];

const acceptanceChecks = [
  "Prepared deals trace from property supply to bank package readiness.",
  "Every provider-derived value is persisted as CRAYS evidence before display.",
  "Candidate, public and bank release gates are separate.",
  "Banking evidence cannot initiate payments or send package data.",
  "Property feed adapters cannot publish, contact or upload.",
  "Location intelligence cannot expose client-side keys or raw payloads.",
  "No source UI, vendor identity or implementation label is visible in the product.",
  "Block 200 remains a decision gate, not an implicit write approval.",
];

function accessForRole(role: RoleKey): PreparedDealFactoryReadinessContract["access"] {
  if (internalFactoryRoles.includes(role)) {
    return {
      allowed: true,
      level: role === "finance" ? "finance_bank_package_readiness" : "internal_factory_readiness",
      reason: "Role can review the internal prepared deal factory readiness model. Provider calls, releases and writes remain disabled.",
    };
  }

  if (scopedFactoryRoles.includes(role)) {
    return {
      allowed: true,
      level: "release_gated_factory_shell",
      reason: "Role can read only a release-gated prepared deal factory shell without internal records, provider payloads or Candidate-private data.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Prepared deal factory readiness requires internal review scope or an approved release-gated external shell.",
  };
}

function boundaries(): PreparedDealFactoryReadinessContract["boundaries"] {
  return {
    readOnly: true,
    readinessOnly: true,
    providerCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    uploadsEnabled: false,
    publicReleaseEnabled: false,
    candidateReleaseEnabled: false,
    bankPackageCreationEnabled: false,
    bankSendEnabled: false,
    paymentInitiationEnabled: false,
    liveAiCallsEnabled: false,
    externalSendingEnabled: false,
    destructiveReconciliationEnabled: false,
    sourceUiExposureEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

export function getPreparedDealFactoryReadiness(role: RoleKey): PreparedDealFactoryReadinessContract {
  const access = accessForRole(role);
  const scopedShell = access.level === "release_gated_factory_shell";
  const allowedDetail = access.allowed && !scopedShell;

  return {
    status: access.allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 151-200",
    completedBlocks: allowedDetail ? 50 : 0,
    totalBlocks: 50,
    northStar: {
      goal: "Prepare franchise deals that are ready for reviewed Candidate purchase intent and finance packaging.",
      productRule: "CRAYS owns the role-scoped workflow; source systems remain behind adapters.",
      dataRule: "A deal is not ready until property, location, economics, candidate, document, bank and opening evidence are linked.",
      providerRule: "Provider calls and writes are blocked until a separate approval exists.",
    },
    factoryBlocks: allowedDetail ? factoryBlocks : [],
    sourceChain: allowedDetail ? sourceChain : scopedShell ? sourceChain.slice(0, 3) : [],
    integrationBoundaries: allowedDetail ? integrationBoundaries : [],
    dataRequirements: allowedDetail ? dataRequirements : scopedShell ? dataRequirements.slice(0, 2) : [],
    acceptanceChecks: allowedDetail ? acceptanceChecks : [],
    nextGate: "block_200_write_provider_decision",
    boundaries: boundaries(),
    liveBusinessRecordReturned: false,
    liveProviderPayloadsReturned: false,
    liveCandidateDataReturned: false,
    liveBankDataReturned: false,
  };
}
