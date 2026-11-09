import type { ModuleKey } from "./modules";
import type { RoleKey } from "./roles";

export type WebPlatformAudience = "guest" | "franchise-candidate";

export type JourneyAccessLevel =
  | "public"
  | "account_required"
  | "candidate_scoped"
  | "purchase_intent_required"
  | "regulated_review"
  | "bank_handoff";

export type JourneyStageKey =
  | "guest-offer-teasers"
  | "candidate-account-gate"
  | "prepared-deal-detail"
  | "offer-evidence"
  | "candidate-selection"
  | "deal-manager-communication"
  | "purchase-intent"
  | "kyc-aml"
  | "equity-check"
  | "source-of-funds"
  | "deal-readiness-review"
  | "bank-package"
  | "deal-manager-dashboard"
  | "franchise-partner-handoff";

export type EvidenceCategory =
  | "location-intelligence"
  | "business-planning"
  | "financial-planning"
  | "kpi-snapshot"
  | "timeline"
  | "property-summary"
  | "document-preview"
  | "communication";

export type GateKey =
  | "account-required-for-detail"
  | "purchase-intent-required"
  | "kyc-aml-required"
  | "equity-check-required"
  | "source-of-funds-required"
  | "deal-readiness-required"
  | "bank-handoff-required";

export type JourneySurfaceContract = {
  audience: WebPlatformAudience;
  label: string;
  experienceMode: "data_driven_web_platform";
  visualRule: string;
  allowedContent: string[];
  blockedContent: string[];
  sourceModules: ModuleKey[];
};

export type JourneyStageContract = {
  key: JourneyStageKey;
  label: string;
  accessLevel: JourneyAccessLevel;
  primaryRole: WebPlatformAudience | "deal-manager" | "bank-partner" | "franchise-partner";
  visibleToRoles: RoleKey[];
  sourceModules: ModuleKey[];
  purpose: string;
  requiredBeforeNext: GateKey[];
  status: "contract_ready" | "blocked_until_account" | "blocked_until_purchase_intent" | "blocked_until_review";
};

export type EvidenceContract = {
  category: EvidenceCategory;
  label: string;
  guestAccess: "hidden" | "teaser" | "summary";
  candidateAccess: "summary" | "detail";
  bankAccess: "none" | "approved_package_only";
  sourceModules: ModuleKey[];
  approvalRequired: boolean;
};

export type GateContract = {
  key: GateKey;
  label: string;
  trigger: string;
  requiredChecks: string[];
  unlocks: JourneyStageKey[];
  bankVisible: boolean;
};

export type BankHandoffContract = {
  status: "contract_ready";
  bankStartsAt: "approved_handoff";
  candidateBrowsingVisibleToBank: false;
  requires: string[];
  prohibited: string[];
};

export type GuestCandidateJourneyContract = {
  status: "contract_ready";
  liveDealsReturned: false;
  liveCandidateDataReturned: false;
  liveBankDataReturned: false;
  surfaces: JourneySurfaceContract[];
  stages: JourneyStageContract[];
  evidence: EvidenceContract[];
  gates: GateContract[];
  bankHandoff: BankHandoffContract;
  guardrails: string[];
};

export const journeySurfaces: JourneySurfaceContract[] = [
  {
    audience: "guest",
    label: "Guest web platform",
    experienceMode: "data_driven_web_platform",
    visualRule: "Public website-style surface with offer teasers, proof, clear sections and account gate for deal detail.",
    allowedContent: [
      "public franchise story",
      "prepared offer teasers",
      "high-level proof",
      "simplified location evidence",
      "public business potential",
      "account gate for prepared deal detail",
    ],
    blockedContent: [
      "full prepared deal detail",
      "sensitive documents",
      "candidate tasks",
      "Deal Manager thread",
      "bank package data",
      "internal notes",
    ],
    sourceModules: ["sites", "crm", "analytics", "files"],
  },
  {
    audience: "franchise-candidate",
    label: "Candidate buying portal",
    experienceMode: "data_driven_web_platform",
    visualRule: "Premium website-style buying portal powered by CRAYS data, not a dense internal workbench.",
    allowedContent: [
      "prepared deal detail",
      "approved location evidence",
      "business planning evidence",
      "financial planning evidence",
      "KPIs and timelines",
      "document previews",
      "Deal Manager communication",
      "purchase intent flow",
    ],
    blockedContent: [
      "other candidates",
      "CRAYS internal finance",
      "bank internal notes",
      "unreleased review comments",
      "raw provider data",
    ],
    sourceModules: ["sites", "crm", "analytics", "files", "chat", "loans"],
  },
];

export const journeyStages: JourneyStageContract[] = [
  {
    key: "guest-offer-teasers",
    label: "Offer teasers",
    accessLevel: "public",
    primaryRole: "guest",
    visibleToRoles: ["guest", "franchise-candidate", "deal-manager", "crays-management"],
    sourceModules: ["sites", "crm", "analytics"],
    purpose: "Show public prepared offer teasers without exposing full deal detail.",
    requiredBeforeNext: ["account-required-for-detail"],
    status: "contract_ready",
  },
  {
    key: "candidate-account-gate",
    label: "Account gate",
    accessLevel: "account_required",
    primaryRole: "franchise-candidate",
    visibleToRoles: ["guest", "franchise-candidate", "deal-manager", "crays-management"],
    sourceModules: ["settings", "crm"],
    purpose: "Require CRAYS account mapping before prepared deal detail is shown.",
    requiredBeforeNext: [],
    status: "contract_ready",
  },
  {
    key: "prepared-deal-detail",
    label: "Prepared deal detail",
    accessLevel: "candidate_scoped",
    primaryRole: "franchise-candidate",
    visibleToRoles: ["franchise-candidate", "deal-manager", "crays-management", "reviewer"],
    sourceModules: ["sites", "crm", "analytics", "files"],
    purpose: "Show released deal detail to the registered Candidate without requiring KYC.",
    requiredBeforeNext: [],
    status: "blocked_until_account",
  },
  {
    key: "offer-evidence",
    label: "Offer evidence",
    accessLevel: "candidate_scoped",
    primaryRole: "franchise-candidate",
    visibleToRoles: ["franchise-candidate", "deal-manager", "crays-management", "reviewer"],
    sourceModules: ["analytics", "files", "crm"],
    purpose: "Show released location, business, financial, KPI and timeline evidence before purchase intent.",
    requiredBeforeNext: [],
    status: "blocked_until_account",
  },
  {
    key: "candidate-selection",
    label: "Candidate selection",
    accessLevel: "candidate_scoped",
    primaryRole: "franchise-candidate",
    visibleToRoles: ["franchise-candidate", "deal-manager", "crays-management"],
    sourceModules: ["crm", "sites"],
    purpose: "Allow candidate to select or reserve a preferred prepared offer.",
    requiredBeforeNext: ["purchase-intent-required"],
    status: "blocked_until_account",
  },
  {
    key: "deal-manager-communication",
    label: "Deal Manager communication",
    accessLevel: "candidate_scoped",
    primaryRole: "franchise-candidate",
    visibleToRoles: ["franchise-candidate", "deal-manager", "crays-management", "reviewer"],
    sourceModules: ["chat", "crm"],
    purpose: "Allow candidate questions and Deal Manager replies before KYC while keeping internal notes private.",
    requiredBeforeNext: [],
    status: "blocked_until_account",
  },
  {
    key: "purchase-intent",
    label: "Purchase intent",
    accessLevel: "purchase_intent_required",
    primaryRole: "franchise-candidate",
    visibleToRoles: ["franchise-candidate", "deal-manager", "finance", "crays-management", "reviewer"],
    sourceModules: ["crm", "loans", "files"],
    purpose: "Record purchase, reservation or financing intent before regulated checks start.",
    requiredBeforeNext: ["kyc-aml-required", "equity-check-required", "source-of-funds-required"],
    status: "blocked_until_account",
  },
  {
    key: "kyc-aml",
    label: "KYC / AML",
    accessLevel: "regulated_review",
    primaryRole: "franchise-candidate",
    visibleToRoles: ["franchise-candidate", "deal-manager", "finance", "crays-management", "reviewer"],
    sourceModules: ["loans", "files"],
    purpose: "Verify the candidate after purchase or financing intent, before bank handoff.",
    requiredBeforeNext: ["equity-check-required", "deal-readiness-required"],
    status: "blocked_until_purchase_intent",
  },
  {
    key: "equity-check",
    label: "Equity check",
    accessLevel: "regulated_review",
    primaryRole: "franchise-candidate",
    visibleToRoles: ["franchise-candidate", "deal-manager", "finance", "crays-management", "reviewer"],
    sourceModules: ["loans", "erp", "files"],
    purpose: "Verify own-equity proof before any bank package handoff.",
    requiredBeforeNext: ["source-of-funds-required", "deal-readiness-required"],
    status: "blocked_until_purchase_intent",
  },
  {
    key: "source-of-funds",
    label: "Source of funds",
    accessLevel: "regulated_review",
    primaryRole: "franchise-candidate",
    visibleToRoles: ["franchise-candidate", "deal-manager", "finance", "crays-management", "reviewer"],
    sourceModules: ["loans", "files"],
    purpose: "Review source-of-funds where required before bank package preparation.",
    requiredBeforeNext: ["deal-readiness-required"],
    status: "blocked_until_purchase_intent",
  },
  {
    key: "deal-readiness-review",
    label: "Deal readiness review",
    accessLevel: "regulated_review",
    primaryRole: "deal-manager",
    visibleToRoles: ["deal-manager", "finance", "crays-management", "reviewer"],
    sourceModules: ["crm", "analytics", "files", "loans"],
    purpose: "Review the prepared deal, evidence, financial model and timeline before bank package handoff.",
    requiredBeforeNext: ["bank-handoff-required"],
    status: "blocked_until_review",
  },
  {
    key: "bank-package",
    label: "Bank package",
    accessLevel: "bank_handoff",
    primaryRole: "bank-partner",
    visibleToRoles: ["bank-partner", "deal-manager", "finance", "crays-management", "reviewer"],
    sourceModules: ["loans", "files", "analytics", "erp"],
    purpose: "Expose only the approved package for KYC-checked, equity-checked candidates and reviewed deals.",
    requiredBeforeNext: [],
    status: "blocked_until_review",
  },
  {
    key: "deal-manager-dashboard",
    label: "Deal Manager dashboard",
    accessLevel: "candidate_scoped",
    primaryRole: "deal-manager",
    visibleToRoles: ["deal-manager", "crays-management", "reviewer"],
    sourceModules: ["dashboard", "crm", "analytics", "loans", "chat"],
    purpose: "Show role-scoped exceptions across candidate, offer, checks, bank package and communication.",
    requiredBeforeNext: [],
    status: "contract_ready",
  },
  {
    key: "franchise-partner-handoff",
    label: "Partner handoff",
    accessLevel: "regulated_review",
    primaryRole: "franchise-partner",
    visibleToRoles: ["franchise-partner", "deal-manager", "finance", "crays-management", "reviewer"],
    sourceModules: ["project", "crm", "files", "loans"],
    purpose: "Start post-approval partner handoff after closing and CRAYS approval.",
    requiredBeforeNext: [],
    status: "blocked_until_review",
  },
];

export const evidenceContracts: EvidenceContract[] = [
  {
    category: "location-intelligence",
    label: "Location intelligence",
    guestAccess: "summary",
    candidateAccess: "detail",
    bankAccess: "approved_package_only",
    sourceModules: ["analytics", "files"],
    approvalRequired: true,
  },
  {
    category: "business-planning",
    label: "Business planning",
    guestAccess: "teaser",
    candidateAccess: "detail",
    bankAccess: "approved_package_only",
    sourceModules: ["crm", "files", "analytics"],
    approvalRequired: true,
  },
  {
    category: "financial-planning",
    label: "Financial planning",
    guestAccess: "teaser",
    candidateAccess: "detail",
    bankAccess: "approved_package_only",
    sourceModules: ["erp", "analytics", "files"],
    approvalRequired: true,
  },
  {
    category: "kpi-snapshot",
    label: "KPI snapshots",
    guestAccess: "summary",
    candidateAccess: "detail",
    bankAccess: "approved_package_only",
    sourceModules: ["analytics", "dashboard"],
    approvalRequired: true,
  },
  {
    category: "timeline",
    label: "Timeline",
    guestAccess: "summary",
    candidateAccess: "detail",
    bankAccess: "approved_package_only",
    sourceModules: ["project", "crm"],
    approvalRequired: true,
  },
  {
    category: "property-summary",
    label: "Property summary",
    guestAccess: "teaser",
    candidateAccess: "detail",
    bankAccess: "approved_package_only",
    sourceModules: ["crm", "project", "files"],
    approvalRequired: true,
  },
  {
    category: "document-preview",
    label: "Document previews",
    guestAccess: "hidden",
    candidateAccess: "summary",
    bankAccess: "approved_package_only",
    sourceModules: ["files"],
    approvalRequired: true,
  },
  {
    category: "communication",
    label: "Candidate communication",
    guestAccess: "hidden",
    candidateAccess: "detail",
    bankAccess: "none",
    sourceModules: ["chat", "crm"],
    approvalRequired: false,
  },
];

export const gateContracts: GateContract[] = [
  {
    key: "account-required-for-detail",
    label: "Account required for deal detail",
    trigger: "Guest opens a prepared deal detail.",
    requiredChecks: ["CRAYS account mapping", "candidate role assignment", "scope to selected prepared offer"],
    unlocks: ["prepared-deal-detail", "offer-evidence", "deal-manager-communication"],
    bankVisible: false,
  },
  {
    key: "purchase-intent-required",
    label: "Purchase intent required",
    trigger: "Candidate selects, reserves or requests financing for a prepared offer.",
    requiredChecks: ["selected prepared offer", "candidate confirmation", "Deal Manager review queue"],
    unlocks: ["purchase-intent", "kyc-aml", "equity-check", "source-of-funds"],
    bankVisible: false,
  },
  {
    key: "kyc-aml-required",
    label: "KYC / AML required",
    trigger: "Purchase, reservation, financing preparation or deeper gated access starts.",
    requiredChecks: ["candidate identity", "screening state", "review decision", "audit event"],
    unlocks: ["deal-readiness-review", "bank-package"],
    bankVisible: true,
  },
  {
    key: "equity-check-required",
    label: "Equity check required",
    trigger: "Bank package preparation requires own-equity proof.",
    requiredChecks: ["own-equity amount", "equity proof document", "review decision", "audit event"],
    unlocks: ["deal-readiness-review", "bank-package"],
    bankVisible: true,
  },
  {
    key: "source-of-funds-required",
    label: "Source of funds required",
    trigger: "Equity proof or compliance review requires source-of-funds evidence.",
    requiredChecks: ["declared sources", "supporting documents", "review decision", "audit event"],
    unlocks: ["deal-readiness-review", "bank-package"],
    bankVisible: true,
  },
  {
    key: "deal-readiness-required",
    label: "Deal readiness required",
    trigger: "CRAYS prepares lender package.",
    requiredChecks: ["deal reviewed", "evidence approved", "financial model locked", "timeline approved", "document versions approved"],
    unlocks: ["bank-package"],
    bankVisible: true,
  },
  {
    key: "bank-handoff-required",
    label: "Bank handoff required",
    trigger: "CRAYS releases approved package to a bank or financing partner.",
    requiredChecks: ["KYC checked", "equity checked", "source-of-funds reviewed", "deal reviewed", "bank consent", "package version"],
    unlocks: ["bank-package"],
    bankVisible: true,
  },
];

export const bankHandoffContract: BankHandoffContract = {
  status: "contract_ready",
  bankStartsAt: "approved_handoff",
  candidateBrowsingVisibleToBank: false,
  requires: [
    "KYC-checked candidate",
    "Equity-checked candidate",
    "Source-of-funds reviewed where required",
    "CRAYS-reviewed prepared deal",
    "Approved location, property, business, financial and timeline evidence",
    "Versioned bank package",
    "Bank consent where required",
  ],
  prohibited: [
    "pre-KYC candidate browsing",
    "unverified profile data",
    "unverified equity data",
    "unreviewed prepared deals",
    "internal Deal Manager notes",
    "internal CRAYS review comments unless explicitly released",
  ],
};

export const guestCandidateJourneyGuardrails = [
  "Guest and Candidate surfaces are website-style buying portals, not internal workbenches.",
  "Guest may see public offer teasers, never full prepared deal detail.",
  "Prepared deal detail requires CRAYS account mapping and Candidate role scope.",
  "KYC is not required for browsing prepared deal detail.",
  "KYC starts at purchase, reservation, financing preparation or deeper gated access.",
  "Bank handoff requires KYC-checked candidate, equity-checked candidate and CRAYS-reviewed deal.",
  "Bank users never see pre-KYC browsing or unreviewed candidate/deal activity.",
  "Provider keys and raw provider payloads stay server-side.",
];

export function getVisibleJourneyStagesForRole(role: RoleKey) {
  return journeyStages.filter((stage) => stage.visibleToRoles.includes(role));
}

export function getEvidenceForAudience(audience: WebPlatformAudience) {
  return evidenceContracts.filter((evidence) => {
    if (audience === "guest") return evidence.guestAccess !== "hidden";
    return Boolean(evidence.candidateAccess);
  });
}

export function getGuestCandidateJourneyContract(): GuestCandidateJourneyContract {
  return {
    status: "contract_ready",
    liveDealsReturned: false,
    liveCandidateDataReturned: false,
    liveBankDataReturned: false,
    surfaces: journeySurfaces,
    stages: journeyStages,
    evidence: evidenceContracts,
    gates: gateContracts,
    bankHandoff: bankHandoffContract,
    guardrails: guestCandidateJourneyGuardrails,
  };
}
