import { accessPoliciesForRole } from "./access-control";
import { roleByKey, type RoleKey } from "./roles";

export type CandidateDealPackageSectionKey =
  | "offer-summary"
  | "location-evidence"
  | "business-plan"
  | "financial-model"
  | "property-lease"
  | "opening-timeline"
  | "documents"
  | "deal-manager-thread"
  | "purchase-intent"
  | "bank-handoff";

export type CandidateDealPackageSection = {
  key: CandidateDealPackageSectionKey;
  label: string;
  sourceTables: string[];
  visibleBeforeKyc: boolean;
  ownerRole: RoleKey;
  candidateAccess: "public_teaser" | "account_required" | "intent_required" | "regulated_gate";
  bankAccess: "none" | "after_package_release";
  guardrail: string;
};

export type CandidateDealGate = {
  key: string;
  label: string;
  startsAfter: string;
  requiredFor: string[];
  ownerRole: RoleKey;
};

export type CandidateDealPackageContract = {
  status: "contract_ready";
  liveDealsReturned: false;
  liveCandidateDataReturned: false;
  liveBankDataReturned: false;
  sections: CandidateDealPackageSection[];
  gates: CandidateDealGate[];
  bankHandoffPreconditions: string[];
  guardrails: string[];
};

export const candidateDealPackageSections: CandidateDealPackageSection[] = [
  {
    key: "offer-summary",
    label: "Offer summary",
    sourceTables: ["crays_core.prepared_offers", "crays_core.evidence_packages"],
    visibleBeforeKyc: true,
    ownerRole: "deal-manager",
    candidateAccess: "account_required",
    bankAccess: "none",
    guardrail: "Guest users see only teaser fields; full deal detail requires CRAYS account mapping.",
  },
  {
    key: "location-evidence",
    label: "Location evidence",
    sourceTables: ["crays_core.location_analyses", "crays_core.evidence_packages"],
    visibleBeforeKyc: true,
    ownerRole: "expansion-manager",
    candidateAccess: "account_required",
    bankAccess: "after_package_release",
    guardrail: "Candidate sees released evidence summaries; raw provider payloads and keys stay server-side.",
  },
  {
    key: "business-plan",
    label: "Business plan",
    sourceTables: ["crays_core.evidence_packages", "crays_core.document_package_links"],
    visibleBeforeKyc: true,
    ownerRole: "deal-manager",
    candidateAccess: "account_required",
    bankAccess: "after_package_release",
    guardrail: "Business plan sections must be reviewed before candidate or bank release.",
  },
  {
    key: "financial-model",
    label: "Financial model",
    sourceTables: ["crays_core.financial_models", "crays_core.document_package_links"],
    visibleBeforeKyc: true,
    ownerRole: "finance",
    candidateAccess: "account_required",
    bankAccess: "after_package_release",
    guardrail: "Candidate-safe finance summaries are separate from internal assumptions and bank package fields.",
  },
  {
    key: "property-lease",
    label: "Property and lease",
    sourceTables: ["crays_core.properties", "crays_core.property_cases", "crays_core.document_package_links"],
    visibleBeforeKyc: true,
    ownerRole: "expansion-manager",
    candidateAccess: "account_required",
    bankAccess: "after_package_release",
    guardrail: "Owner-sensitive and unreleased lease details stay hidden until CRAYS release state allows them.",
  },
  {
    key: "opening-timeline",
    label: "Opening timeline",
    sourceTables: ["crays_core.workflow_events", "crays_core.external_record_maps"],
    visibleBeforeKyc: true,
    ownerRole: "deal-manager",
    candidateAccess: "account_required",
    bankAccess: "after_package_release",
    guardrail: "Project and supplier details stay role-scoped until stakeholder handoff.",
  },
  {
    key: "documents",
    label: "Documents",
    sourceTables: ["crays_core.document_package_links", "crays_core.evidence_packages"],
    visibleBeforeKyc: true,
    ownerRole: "deal-manager",
    candidateAccess: "account_required",
    bankAccess: "after_package_release",
    guardrail: "Documents are visible only through package links, version state and role access checks.",
  },
  {
    key: "deal-manager-thread",
    label: "Deal Manager thread",
    sourceTables: ["crays_core.deals", "crays_core.workflow_events"],
    visibleBeforeKyc: true,
    ownerRole: "deal-manager",
    candidateAccess: "account_required",
    bankAccess: "none",
    guardrail: "Candidate communication before KYC stays inside CRAYS unless later released as part of a bank package artifact.",
  },
  {
    key: "purchase-intent",
    label: "Purchase / financing intent",
    sourceTables: ["crays_core.deals", "crays_core.workflow_events"],
    visibleBeforeKyc: true,
    ownerRole: "deal-manager",
    candidateAccess: "intent_required",
    bankAccess: "none",
    guardrail: "Purchase or financing intent starts the regulated preparation path; it is not a bank handoff by itself.",
  },
  {
    key: "bank-handoff",
    label: "Bank handoff",
    sourceTables: ["crays_core.bank_packages", "crays_core.loan_cases", "crays_core.document_package_links"],
    visibleBeforeKyc: false,
    ownerRole: "finance",
    candidateAccess: "regulated_gate",
    bankAccess: "after_package_release",
    guardrail: "Bank access starts only after KYC, equity check, source-of-funds where required and CRAYS deal review.",
  },
];

export const candidateDealGates: CandidateDealGate[] = [
  {
    key: "account-mapping",
    label: "Account mapping",
    startsAfter: "Candidate chooses to view prepared offer detail.",
    requiredFor: ["offer-summary", "location-evidence", "business-plan", "financial-model", "property-lease", "opening-timeline", "documents", "deal-manager-thread"],
    ownerRole: "admin",
  },
  {
    key: "purchase-intent",
    label: "Purchase / financing intent",
    startsAfter: "Candidate selects or reserves a prepared offer.",
    requiredFor: ["purchase-intent", "kyc-aml", "equity-check", "source-of-funds", "bank-handoff"],
    ownerRole: "deal-manager",
  },
  {
    key: "kyc-aml",
    label: "KYC / AML",
    startsAfter: "Purchase, reservation, financing preparation or deeper gated access.",
    requiredFor: ["bank-handoff"],
    ownerRole: "finance",
  },
  {
    key: "equity-check",
    label: "Equity check",
    startsAfter: "Regulated purchase / financing path starts.",
    requiredFor: ["bank-handoff"],
    ownerRole: "finance",
  },
  {
    key: "deal-readiness-review",
    label: "Deal readiness review",
    startsAfter: "Candidate checks and CRAYS package review are complete.",
    requiredFor: ["bank-handoff", "franchise-partner-handoff"],
    ownerRole: "reviewer",
  },
];

export const candidateDealPackageGuardrails = [
  "Prepared deal browsing and evidence review happen before KYC/AML.",
  "Prepared deal detail requires CRAYS account mapping, not anonymous public access.",
  "KYC/AML starts only after purchase, reservation, financing preparation or deeper gated access.",
  "Bank handoff requires KYC-checked candidate, equity-checked candidate and CRAYS-reviewed deal.",
  "Bank never sees pre-KYC browsing, offer-selection activity or unreleased candidate communication.",
  "Every visible document, evidence and finance field must have release state and role scope.",
  "No live deal, candidate, bank, file upload or provider data is returned by this contract.",
];

export function getCandidateDealPackageContract(): CandidateDealPackageContract {
  return {
    status: "contract_ready",
    liveDealsReturned: false,
    liveCandidateDataReturned: false,
    liveBankDataReturned: false,
    sections: candidateDealPackageSections,
    gates: candidateDealGates,
    bankHandoffPreconditions: [
      "Candidate CRAYS account is mapped.",
      "Purchase or financing intent is recorded.",
      "KYC/AML is checked.",
      "Equity check is completed.",
      "Source-of-funds state is reviewed where required.",
      "Prepared deal is reviewed by CRAYS.",
      "Bank package documents and evidence are approved for lender release.",
      "Candidate consent exists where required.",
    ],
    guardrails: candidateDealPackageGuardrails,
  };
}

export function getCandidateDealPackageRolePreview(roleParam: string | null | undefined) {
  const role = roleByKey(roleParam).key;
  const visibleSections = candidateDealPackageSections.filter((section) => {
    if (role === "guest") return section.candidateAccess === "public_teaser";
    if (role === "bank-partner") return section.bankAccess === "after_package_release";
    if (role === "franchise-candidate") return section.candidateAccess !== "public_teaser";
    return section.ownerRole === role || ["admin", "crays-management", "reviewer"].includes(role);
  });
  const policyKeys = new Set(["prepared-offers", "candidate-deals", "location-evidence", "bank-packages", "document-packages"]);

  return {
    role,
    visibleSections: visibleSections.map((section) => ({
      key: section.key,
      label: section.label,
      visibleBeforeKyc: section.visibleBeforeKyc,
      candidateAccess: section.candidateAccess,
      bankAccess: section.bankAccess,
    })),
    gates: candidateDealGates.filter((gate) => gate.ownerRole === role || role === "franchise-candidate" || ["admin", "crays-management", "reviewer"].includes(role)),
    accessDomains: accessPoliciesForRole(role).filter((policy) => policyKeys.has(policy.key)).map((policy) => ({
      key: policy.key,
      label: policy.label,
      ownerRole: policy.ownerRole,
    })),
  };
}
