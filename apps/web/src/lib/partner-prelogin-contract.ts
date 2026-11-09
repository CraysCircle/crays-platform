import type { RoleKey } from "./roles";

export type PartnerPreloginSurfaceKey = "bank-partner" | "real-estate-partner";

export type PartnerPreloginSection = {
  key: string;
  label: string;
  purpose: string;
  visibleBeforeAccountApproval: boolean;
  dataSource: "reviewed_release" | "contract_only" | "candidate_safe_summary" | "owner_submitted_preliminary";
  guardrail: string;
};

export type PartnerPreloginGate = {
  key: string;
  label: string;
  ownerRole: RoleKey;
  startsAfter: string;
  requiredFor: string[];
  enabled: false;
  guardrail: string;
};

export type PartnerPreloginContract = {
  surface: PartnerPreloginSurfaceKey;
  label: string;
  status: "contract_ready";
  ownerRole: RoleKey;
  audienceRoles: RoleKey[];
  recommendedRoutes: string[];
  primaryGoal: string;
  sections: PartnerPreloginSection[];
  gates: PartnerPreloginGate[];
  allowedPreloginSignals: string[];
  blockedPreloginData: string[];
  accountContinuation: {
    accountMappingRequired: true;
    roleReviewRequired: true;
    nostrRoleBindingRequired: true;
    directProductAccessEnabled: false;
  };
  boundaries: {
    routeImplementationReady: boolean;
    livePartnerRecordsReturned: false;
    liveProjectPipelineReturned: false;
    livePropertyRecordsReturned: false;
    liveCandidateDataReturned: false;
    liveBankDataReturned: false;
    propertyAnalysisProviderCallsEnabled: false;
    propertyUploadEnabled: false;
    partnerAccessRequestWriteEnabled: false;
    fileUploadEnabled: false;
    externalSendingEnabled: false;
    publicPageReleaseEnabled: boolean;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

export type PartnerPreloginRolePreview = {
  role: RoleKey;
  surface: PartnerPreloginSurfaceKey;
  canReadContract: boolean;
  reason: string;
  visibleSections: Array<{
    key: string;
    label: string;
    visibleBeforeAccountApproval: boolean;
  }>;
  blockedActions: string[];
};

const contractReaders: RoleKey[] = ["guest", "bank-partner", "landlord", "expansion-manager", "deal-manager", "finance", "reviewer", "crays-management", "admin"];

export const bankPartnerPreloginContract: PartnerPreloginContract = {
  surface: "bank-partner",
  label: "Bank Partner pre-login platform",
  status: "contract_ready",
  ownerRole: "expansion-manager",
  audienceRoles: ["guest", "bank-partner"],
  recommendedRoutes: ["/banking-partners"],
  primaryGoal: "Acquire and qualify financing partners before authenticated bank package access.",
  sections: [
    {
      key: "model",
      label: "CRAYS model",
      purpose: "Explain the gym franchise model, operating discipline and preparation workflow.",
      visibleBeforeAccountApproval: true,
      dataSource: "contract_only",
      guardrail: "No candidate PII, borrower identity or unreleased deal economics before account approval.",
    },
    {
      key: "bankability",
      label: "Bankability",
      purpose: "Show how CRAYS prepares candidate, property, evidence and finance quality before bank handoff.",
      visibleBeforeAccountApproval: true,
      dataSource: "candidate_safe_summary",
      guardrail: "Only anonymized, reviewed readiness signals are allowed before bank role approval.",
    },
    {
      key: "risk-controls",
      label: "Risk controls",
      purpose: "Describe KYC/AML, equity check, source-of-funds and CRAYS review gates.",
      visibleBeforeAccountApproval: true,
      dataSource: "contract_only",
      guardrail: "This is a policy overview only; it is not a live regulated-check result.",
    },
    {
      key: "project-teasers",
      label: "Reviewed project teasers",
      purpose: "Future section for selected reviewed project pipeline teasers.",
      visibleBeforeAccountApproval: true,
      dataSource: "reviewed_release",
      guardrail: "No live project pipeline is returned until explicit release rules and account access are approved.",
    },
    {
      key: "partner-access",
      label: "Partner access request",
      purpose: "Future entry path for bank partner qualification and account mapping.",
      visibleBeforeAccountApproval: true,
      dataSource: "contract_only",
      guardrail: "No access request writes, external sending or account creation are enabled by this contract.",
    },
  ],
  gates: [
    {
      key: "partner-request",
      label: "Partner request",
      ownerRole: "expansion-manager",
      startsAfter: "Bank partner asks for CRAYS partner access.",
      requiredFor: ["account-review", "bank-workspace"],
      enabled: false,
      guardrail: "Request writes remain disabled until the public route and consent model are approved.",
    },
    {
      key: "account-review",
      label: "Account review",
      ownerRole: "admin",
      startsAfter: "Partner request is captured and reviewed.",
      requiredFor: ["bank-workspace"],
      enabled: false,
      guardrail: "Bank role access starts only after Auth0/CRAYS account mapping, role review and scope grants.",
    },
    {
      key: "bank-workspace",
      label: "Bank workspace",
      ownerRole: "finance",
      startsAfter: "A reviewed bank package is approved for lender release.",
      requiredFor: ["loan-case", "conditions-workflow"],
      enabled: false,
      guardrail: "Pre-login pages never expose actual bank packages, loan cases or candidate financial data.",
    },
  ],
  allowedPreloginSignals: [
    "CRAYS model overview",
    "Risk-control overview",
    "Anonymized readiness categories",
    "Approximate project type and range after reviewed release",
    "Partner access process",
  ],
  blockedPreloginData: [
    "Candidate PII",
    "Borrower identity",
    "Unreleased prepared offers",
    "Internal financial assumptions",
    "Bank package documents",
    "Loan cases",
    "Provider payloads",
  ],
  accountContinuation: {
    accountMappingRequired: true,
    roleReviewRequired: true,
    nostrRoleBindingRequired: true,
    directProductAccessEnabled: false,
  },
  boundaries: {
    routeImplementationReady: true,
    livePartnerRecordsReturned: false,
    liveProjectPipelineReturned: false,
    livePropertyRecordsReturned: false,
    liveCandidateDataReturned: false,
    liveBankDataReturned: false,
    propertyAnalysisProviderCallsEnabled: false,
    propertyUploadEnabled: false,
    partnerAccessRequestWriteEnabled: false,
    fileUploadEnabled: false,
    externalSendingEnabled: false,
    publicPageReleaseEnabled: true,
    secretsReturned: false,
    privateKeysReturned: false,
  },
};

export const realEstatePartnerPreloginContract: PartnerPreloginContract = {
  surface: "real-estate-partner",
  label: "Real Estate Partner pre-login platform",
  status: "contract_ready",
  ownerRole: "expansion-manager",
  audienceRoles: ["guest", "landlord"],
  recommendedRoutes: ["/real-estate-partners", "/real-estate-partners/analyze"],
  primaryGoal: "Acquire suitable properties and route owner submissions into CRAYS property-case review.",
  sections: [
    {
      key: "tenant-concept",
      label: "Tenant concept",
      purpose: "Explain why CRAYS Gym can be an attractive smart-gym tenant.",
      visibleBeforeAccountApproval: true,
      dataSource: "contract_only",
      guardrail: "No lease negotiation, owner private data or candidate demand claim is presented as final live analysis.",
    },
    {
      key: "property-fit",
      label: "Property fit",
      purpose: "Describe space, access, visibility, zoning, rent potential and fit-out requirements.",
      visibleBeforeAccountApproval: true,
      dataSource: "contract_only",
      guardrail: "Pre-login fit rules are guidance only until CRAYS review confirms a property case.",
    },
    {
      key: "owner-rent-potential",
      label: "Rent potential",
      purpose: "Explain how CRAYS will prepare lease-range guidance, tenant-fit reasoning and owner decision data.",
      visibleBeforeAccountApproval: true,
      dataSource: "contract_only",
      guardrail: "Rent potential stays guidance until reviewed property, location and lease economics are approved.",
    },
    {
      key: "property-analysis",
      label: "Property Analysis",
      purpose: "Future preliminary analysis path for one owner-submitted property.",
      visibleBeforeAccountApproval: true,
      dataSource: "owner_submitted_preliminary",
      guardrail: "Provider calls and raw provider payloads remain disabled and server-side until approved.",
    },
    {
      key: "location-intelligence",
      label: "Location Intelligence",
      purpose: "Future catchment, reachability, demand, competition and conversion-potential summary.",
      visibleBeforeAccountApproval: true,
      dataSource: "reviewed_release",
      guardrail: "Preliminary analysis must be clearly separated from reviewed CRAYS release states.",
    },
    {
      key: "owner-continuation",
      label: "Owner continuation",
      purpose: "Future transition from digital property handoff to owner account updates and CRAYS deal preparation.",
      visibleBeforeAccountApproval: true,
      dataSource: "contract_only",
      guardrail: "Owner account mapping and role approval are required before private property updates.",
    },
  ],
  gates: [
    {
      key: "property-analysis-request",
      label: "Property analysis request",
      ownerRole: "expansion-manager",
      startsAfter: "Owner enters preliminary property context.",
      requiredFor: ["property-case-review", "owner-account"],
      enabled: false,
      guardrail: "No provider calls or address analysis writes are enabled by this contract.",
    },
    {
      key: "property-submission",
      label: "Owner handoff",
      ownerRole: "expansion-manager",
      startsAfter: "Owner decides to submit the property for CRAYS review.",
      requiredFor: ["property-case-review", "document-request"],
      enabled: false,
      guardrail: "Property upload and file upload remain disabled until required fields, consent and audit rules are approved.",
    },
    {
      key: "owner-account",
      label: "Owner account",
      ownerRole: "admin",
      startsAfter: "Submitted owner context passes CRAYS review.",
      requiredFor: ["owner-portal", "communication"],
      enabled: false,
      guardrail: "Owner SaaS continuation starts only after Auth0/CRAYS account mapping and role review.",
    },
  ],
  allowedPreloginSignals: [
    "CRAYS tenant concept",
    "Property fit guidance",
    "Rent potential guidance",
    "Preliminary analysis state labels",
    "Location Intelligence categories",
    "Owner account continuation process",
  ],
  blockedPreloginData: [
    "Owner private contact data",
    "Exact unreleased property address",
    "Unreviewed lease details",
    "Candidate private data",
    "Internal CRAYS assumptions",
    "Raw provider payloads",
    "Uploaded documents",
  ],
  accountContinuation: {
    accountMappingRequired: true,
    roleReviewRequired: true,
    nostrRoleBindingRequired: true,
    directProductAccessEnabled: false,
  },
  boundaries: {
    routeImplementationReady: true,
    livePartnerRecordsReturned: false,
    liveProjectPipelineReturned: false,
    livePropertyRecordsReturned: false,
    liveCandidateDataReturned: false,
    liveBankDataReturned: false,
    propertyAnalysisProviderCallsEnabled: false,
    propertyUploadEnabled: false,
    partnerAccessRequestWriteEnabled: false,
    fileUploadEnabled: false,
    externalSendingEnabled: false,
    publicPageReleaseEnabled: true,
    secretsReturned: false,
    privateKeysReturned: false,
  },
};

const contracts: Record<PartnerPreloginSurfaceKey, PartnerPreloginContract> = {
  "bank-partner": bankPartnerPreloginContract,
  "real-estate-partner": realEstatePartnerPreloginContract,
};

export function getPartnerPreloginContract(surface: PartnerPreloginSurfaceKey) {
  return contracts[surface];
}

export function parsePartnerPreloginSurface(value: string | null | undefined): PartnerPreloginSurfaceKey {
  return value === "real-estate-partner" ? "real-estate-partner" : "bank-partner";
}

export function getPartnerPreloginRolePreview(contract: PartnerPreloginContract, role: RoleKey): PartnerPreloginRolePreview {
  const canReadContract = contractReaders.includes(role);

  return {
    role,
    surface: contract.surface,
    canReadContract,
    reason: canReadContract
      ? "Role can read pre-login partner surface rules without live data."
      : "Pre-login partner contracts are visible only to Guest, target partner and internal review roles.",
    visibleSections: canReadContract
      ? contract.sections.map((section) => ({
          key: section.key,
          label: section.label,
          visibleBeforeAccountApproval: section.visibleBeforeAccountApproval,
        }))
      : [],
    blockedActions: [
      "route implementation",
      "partner request write",
      "property upload",
      "provider calls",
      "file upload",
      "external sending",
      "direct product access",
    ],
  };
}
