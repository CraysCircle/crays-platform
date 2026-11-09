import type { RoleKey } from "./roles";

const candidateIntentRoles: RoleKey[] = ["franchise-candidate", "deal-manager", "reviewer", "crays-management", "admin"];

export type CandidateIntentContract = {
  role: RoleKey;
  access: {
    allowed: boolean;
    reason: string;
  };
  intentStages: Array<{
    key: "review_offer" | "purchase_intent" | "financing_intent" | "regulated_checks" | "bank_handoff";
    label: string;
    startsAfter: string;
    requiredFor: string[];
    ownerRole: RoleKey;
  }>;
  boundary: {
    accountMappingRequired: true;
    preparedOfferReleaseRequired: true;
    purchaseIntentWriteEnabled: false;
    financingIntentWriteEnabled: false;
    kycAmlRequiredBeforeIntent: false;
    kycAmlStartsAfterIntent: true;
    equityCheckStartsAfterIntent: true;
    bankHandoffEnabled: false;
    externalSendingEnabled: false;
  };
  currentState: {
    liveIntentRecordsReturned: false;
    purchaseIntentRecorded: false;
    financingIntentRecorded: false;
    kycAmlStarted: false;
    equityCheckStarted: false;
    bankPackageCreated: false;
  };
  guardrails: string[];
  candidatePrivateDataReturned: false;
  bankDataReturned: false;
  fileUploadEnabled: false;
  providerCallsEnabled: false;
  externalSendingEnabled: false;
  publicReleaseEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

function accessForRole(role: RoleKey) {
  if (candidateIntentRoles.includes(role)) {
    return {
      allowed: true,
      reason: "Role can review the Candidate purchase and financing intent contract.",
    };
  }

  return {
    allowed: false,
    reason: "Candidate intent requires Candidate, Deal Manager or review scope.",
  };
}

export function getCandidateIntentContract(role: RoleKey): CandidateIntentContract {
  return {
    role,
    access: accessForRole(role),
    intentStages: [
      {
        key: "review_offer",
        label: "Review offer",
        startsAfter: "Prepared offer is explicitly released to the Candidate account scope.",
        requiredFor: ["purchase_intent", "financing_intent"],
        ownerRole: "franchise-candidate",
      },
      {
        key: "purchase_intent",
        label: "Purchase intent",
        startsAfter: "Candidate chooses a released prepared offer.",
        requiredFor: ["regulated_checks", "deal_readiness_review"],
        ownerRole: "franchise-candidate",
      },
      {
        key: "financing_intent",
        label: "Financing intent",
        startsAfter: "Candidate requests financing preparation for a released prepared offer.",
        requiredFor: ["equity_check", "bank_handoff"],
        ownerRole: "franchise-candidate",
      },
      {
        key: "regulated_checks",
        label: "Regulated checks",
        startsAfter: "Purchase or financing intent is recorded and CRAYS starts the regulated path.",
        requiredFor: ["bank_handoff", "closing"],
        ownerRole: "finance",
      },
      {
        key: "bank_handoff",
        label: "Bank handoff",
        startsAfter: "KYC, equity check, source-of-funds where required and CRAYS deal review are complete.",
        requiredFor: ["loan_case", "closing"],
        ownerRole: "finance",
      },
    ],
    boundary: {
      accountMappingRequired: true,
      preparedOfferReleaseRequired: true,
      purchaseIntentWriteEnabled: false,
      financingIntentWriteEnabled: false,
      kycAmlRequiredBeforeIntent: false,
      kycAmlStartsAfterIntent: true,
      equityCheckStartsAfterIntent: true,
      bankHandoffEnabled: false,
      externalSendingEnabled: false,
    },
    currentState: {
      liveIntentRecordsReturned: false,
      purchaseIntentRecorded: false,
      financingIntentRecorded: false,
      kycAmlStarted: false,
      equityCheckStarted: false,
      bankPackageCreated: false,
    },
    guardrails: [
      "Purchase and financing intent require a mapped Candidate account.",
      "Intent cannot start from a public Guest teaser.",
      "Intent cannot start while the prepared offer is not released to the Candidate.",
      "KYC / AML starts after purchase or financing intent, not before offer browsing.",
      "Bank handoff requires KYC, equity check, source-of-funds where required and CRAYS deal review.",
      "This contract does not write intent records and does not send external messages.",
    ],
    candidatePrivateDataReturned: false,
    bankDataReturned: false,
    fileUploadEnabled: false,
    providerCallsEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
