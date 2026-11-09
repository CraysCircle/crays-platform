import type { RoleKey } from "./roles";

const internalRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedRoles: RoleKey[] = ["finance", "deal-manager", "expansion-manager"];

export type FinalWriteCandidateContract = {
  role: RoleKey;
  access: {
    allowed: boolean;
    level: "internal_final_write_candidate" | "scoped_final_write_candidate_shell" | "forbidden";
    reason: string;
  };
  finalDecision: {
    status: "not_approved";
    firstCandidate: "project";
    candidateStatus: "candidate_after_bounded_smoke_evidence_but_still_requires_scope_approval";
    approvedWriteAdapters: 0;
    recommendation: "prepare_project_write_scope_decision_before_any_write_approval";
  };
  boundedSmokeEvidence: {
    blockRange: "Blocks 56-65";
    evidenceRoute: "/api/crays/adapters/source-smoke/evidence";
    endpointReviewsComplete: boolean;
    boundedReadOnlySmokesComplete: boolean;
    sourceRuntimeCallsObserved: number;
    metadataOnlySmokes: number;
    approvedWriteAdapters: 0;
    nextBlock: "Block 66";
  };
  requiredEvidence: Array<{
    block: string;
    label: string;
    status: "required";
  }>;
  boundaries: {
    readOnly: true;
    decisionOnly: true;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    destructiveReconciliationEnabled: false;
    retryExecutionEnabled: false;
    financeWritesEnabled: false;
    accountingExportsEnabled: false;
    fileUploadsEnabled: false;
    providerCallsEnabled: false;
    controlActionsEnabled: false;
    externalSendingEnabled: false;
    candidateReleaseEnabled: false;
    publicReleaseEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

function accessForRole(role: RoleKey): FinalWriteCandidateContract["access"] {
  if (internalRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_final_write_candidate",
      reason: "Role can read the final write-candidate decision. No write adapter is approved.",
    };
  }

  if (scopedRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_final_write_candidate_shell",
      reason: "Role can read the scoped final write-candidate shell. No write adapter is approved.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Final write-candidate decision access requires internal platform, review or scoped module planning access.",
  };
}

function requiredEvidence(): FinalWriteCandidateContract["requiredEvidence"] {
  return [
    { block: "Block 56", label: "Project source endpoint review.", status: "required" },
    { block: "Block 57", label: "Project bounded read-only source-smoke evidence.", status: "required" },
    { block: "Block 58", label: "CRM source endpoint review.", status: "required" },
    { block: "Block 59", label: "CRM bounded read-only source-smoke evidence.", status: "required" },
    { block: "Block 60", label: "ERP source endpoint review.", status: "required" },
    { block: "Block 61", label: "ERP bounded read-only source-smoke evidence.", status: "required" },
    { block: "Block 62", label: "Files metadata endpoint review.", status: "required" },
    { block: "Block 63", label: "Files metadata-only source-smoke evidence.", status: "required" },
    { block: "Block 50", label: "Reconciliation policy and retry limits.", status: "required" },
    { block: "Block 52", label: "Audit/event scaffold for adapter actions.", status: "required" },
  ];
}

export function getFinalWriteCandidateContract(role: RoleKey): FinalWriteCandidateContract {
  const access = accessForRole(role);

  return {
    role,
    access,
    finalDecision: {
      status: "not_approved",
      firstCandidate: "project",
      candidateStatus: "candidate_after_bounded_smoke_evidence_but_still_requires_scope_approval",
      approvedWriteAdapters: 0,
      recommendation: "prepare_project_write_scope_decision_before_any_write_approval",
    },
    boundedSmokeEvidence: {
      blockRange: "Blocks 56-65",
      evidenceRoute: "/api/crays/adapters/source-smoke/evidence",
      endpointReviewsComplete: access.allowed,
      boundedReadOnlySmokesComplete: access.allowed,
      sourceRuntimeCallsObserved: access.allowed ? 3 : 0,
      metadataOnlySmokes: access.allowed ? 1 : 0,
      approvedWriteAdapters: 0,
      nextBlock: "Block 66",
    },
    requiredEvidence: access.allowed ? requiredEvidence() : [],
    boundaries: {
      readOnly: true,
      decisionOnly: true,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      destructiveReconciliationEnabled: false,
      retryExecutionEnabled: false,
      financeWritesEnabled: false,
      accountingExportsEnabled: false,
      fileUploadsEnabled: false,
      providerCallsEnabled: false,
      controlActionsEnabled: false,
      externalSendingEnabled: false,
      candidateReleaseEnabled: false,
      publicReleaseEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
  };
}
