import type { RoleKey } from "./roles";

const regulatedCheckRoles: RoleKey[] = ["franchise-candidate", "deal-manager", "finance", "reviewer", "crays-management", "admin"];

export type RegulatedCheckKey =
  | "candidate-consent"
  | "identity-verification"
  | "sanctions-pep-screening"
  | "risk-classification"
  | "equity-check"
  | "source-of-funds"
  | "manual-review"
  | "bank-package-readiness";

export type CandidateRegulatedCheckStage = {
  key: RegulatedCheckKey;
  label: string;
  ownerRole: RoleKey;
  startsAfter: string;
  requiredFor: string[];
  currentState: "decision_required" | "not_started" | "locked";
  guardrail: string;
};

export type CandidateRegulatedChecksContract = {
  status: "decision_required";
  role: RoleKey;
  access: {
    allowed: boolean;
    reason: string;
  };
  stages: CandidateRegulatedCheckStage[];
  decisionBrief: {
    path: string;
    requiredBeforeProviderIntegration: true;
    openDecisions: string[];
  };
  boundary: {
    purchaseOrFinancingIntentRequired: true;
    candidateConsentRequired: true;
    providerSelectionRequired: true;
    legalReviewRequired: true;
    dataRetentionDecisionRequired: true;
    providerCallsEnabled: false;
    fileUploadEnabled: false;
    externalSendingEnabled: false;
    kycAmlStarted: false;
    equityCheckStarted: false;
    sourceOfFundsCollectionEnabled: false;
    bankPackageCreated: false;
    bankHandoffEnabled: false;
    publicReleaseEnabled: false;
  };
  currentState: {
    liveCandidateDataReturned: false;
    liveBankDataReturned: false;
    liveProviderPayloadsReturned: false;
    consentRecorded: false;
    kycAmlStarted: false;
    equityCheckStarted: false;
    sourceOfFundsStarted: false;
    bankPackageCreated: false;
  };
  guardrails: string[];
  secretsReturned: false;
  privateKeysReturned: false;
};

function accessForRole(role: RoleKey) {
  if (regulatedCheckRoles.includes(role)) {
    return {
      allowed: true,
      reason: "Role can review the regulated-check contract before any provider integration or bank handoff.",
    };
  }

  return {
    allowed: false,
    reason: "Regulated-check scope requires Candidate, Deal Manager, Finance or review scope.",
  };
}

export function getCandidateRegulatedChecksContract(role: RoleKey): CandidateRegulatedChecksContract {
  return {
    status: "decision_required",
    role,
    access: accessForRole(role),
    stages: [
      {
        key: "candidate-consent",
        label: "Candidate consent",
        ownerRole: "finance",
        startsAfter: "Purchase or financing intent is recorded.",
        requiredFor: ["identity-verification", "equity-check", "source-of-funds", "bank-package-readiness"],
        currentState: "decision_required",
        guardrail: "Consent wording, retention and revocation rules require legal and product approval before collection.",
      },
      {
        key: "identity-verification",
        label: "Identity verification",
        ownerRole: "finance",
        startsAfter: "Candidate consent and provider selection are approved.",
        requiredFor: ["sanctions-pep-screening", "risk-classification", "bank-package-readiness"],
        currentState: "locked",
        guardrail: "No provider call or identity document collection is enabled in this contract.",
      },
      {
        key: "sanctions-pep-screening",
        label: "Sanctions and PEP screening",
        ownerRole: "finance",
        startsAfter: "Identity verification is available through an approved provider or reviewed manual process.",
        requiredFor: ["risk-classification", "bank-package-readiness"],
        currentState: "locked",
        guardrail: "Screening result storage, refresh cadence and false-positive review require a decided operating policy.",
      },
      {
        key: "risk-classification",
        label: "Risk classification",
        ownerRole: "reviewer",
        startsAfter: "Identity and screening inputs are reviewed.",
        requiredFor: ["manual-review", "bank-package-readiness"],
        currentState: "decision_required",
        guardrail: "Risk scoring must be explainable and reviewable before it can affect Candidate or Bank Partner outcomes.",
      },
      {
        key: "equity-check",
        label: "Equity check",
        ownerRole: "finance",
        startsAfter: "Purchase or financing intent and Candidate consent are recorded.",
        requiredFor: ["source-of-funds", "bank-package-readiness"],
        currentState: "decision_required",
        guardrail: "Equity thresholds and acceptable evidence types require CRAYS policy approval before any file upload.",
      },
      {
        key: "source-of-funds",
        label: "Source of funds",
        ownerRole: "finance",
        startsAfter: "Equity evidence requirement is triggered by the approved policy.",
        requiredFor: ["manual-review", "bank-package-readiness"],
        currentState: "decision_required",
        guardrail: "Collection must be minimized, purpose-bound and separated from public or Deal Room browsing state.",
      },
      {
        key: "manual-review",
        label: "Manual review",
        ownerRole: "reviewer",
        startsAfter: "Automated or manual inputs create a review decision.",
        requiredFor: ["bank-package-readiness"],
        currentState: "not_started",
        guardrail: "Reviewer decisions require audit events and cannot trigger external sending by themselves.",
      },
      {
        key: "bank-package-readiness",
        label: "Bank package readiness",
        ownerRole: "finance",
        startsAfter: "KYC/AML, equity check, source-of-funds where required and CRAYS deal review are complete.",
        requiredFor: ["bank-handoff"],
        currentState: "locked",
        guardrail: "Bank package creation remains disabled until all regulated and CRAYS review gates are approved.",
      },
    ],
    decisionBrief: {
      path: "docs/CRAYS_KYC_AML_EQUITY_DECISION_BRIEF.md",
      requiredBeforeProviderIntegration: true,
      openDecisions: [
        "Confirm CRAYS legal role and whether CRAYS is an obliged entity or a pre-bank orchestration layer in each launch market.",
        "Choose provider strategy: manual-first review, provider-neutral orchestrator or direct single provider.",
        "Approve consent wording, retention rules, deletion rules and Candidate data visibility.",
        "Approve equity evidence thresholds and source-of-funds trigger policy.",
        "Approve Bank Partner handoff package contents and release event requirements.",
      ],
    },
    boundary: {
      purchaseOrFinancingIntentRequired: true,
      candidateConsentRequired: true,
      providerSelectionRequired: true,
      legalReviewRequired: true,
      dataRetentionDecisionRequired: true,
      providerCallsEnabled: false,
      fileUploadEnabled: false,
      externalSendingEnabled: false,
      kycAmlStarted: false,
      equityCheckStarted: false,
      sourceOfFundsCollectionEnabled: false,
      bankPackageCreated: false,
      bankHandoffEnabled: false,
      publicReleaseEnabled: false,
    },
    currentState: {
      liveCandidateDataReturned: false,
      liveBankDataReturned: false,
      liveProviderPayloadsReturned: false,
      consentRecorded: false,
      kycAmlStarted: false,
      equityCheckStarted: false,
      sourceOfFundsStarted: false,
      bankPackageCreated: false,
    },
    guardrails: [
      "Prepared deal browsing remains before KYC/AML.",
      "Regulated checks start only after purchase or financing intent plus approved Candidate consent.",
      "Provider integration is blocked until legal role, consent, retention and evidence policy decisions are approved.",
      "Bank handoff requires KYC/AML, equity check, source-of-funds where required and CRAYS deal readiness review.",
      "This contract returns no live Candidate data, bank data, files, provider payloads, secrets or private keys.",
    ],
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
