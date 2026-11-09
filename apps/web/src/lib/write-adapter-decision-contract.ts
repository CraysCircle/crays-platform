import type { RoleKey } from "./roles";

const internalDecisionRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedDecisionRoles: RoleKey[] = ["finance", "deal-manager", "expansion-manager"];

export type WriteAdapterDecisionContract = {
  role: RoleKey;
  access: {
    allowed: boolean;
    level: "internal_write_decision" | "scoped_write_decision_shell" | "forbidden";
    reason: string;
  };
  decision: {
    status: "decision_required";
    recommendation: "no_write_adapter_after_bounded_smokes_until_scope_approval";
    approvedWriteAdapters: 0;
    nextApprovedAction: "review_project_write_scope_decision";
  };
  boundedSmokeEvidence: {
    blockRange: "Blocks 56-65";
    evidenceRoute: "/api/crays/adapters/source-smoke/evidence";
    endpointReviewsComplete: boolean;
    boundedReadOnlySmokesComplete: boolean;
    sourceRuntimeCallsObserved: number;
    metadataOnlySmokes: number;
    approvedWriteAdapters: 0;
  };
  candidateOrder: Array<{
    module: "project" | "crm" | "erp" | "files" | "sync";
    label: string;
    firstPossibleWrite: string;
    currentStatus: "blocked";
    reason: string;
  }>;
  requiredGates: Array<{
    key: string;
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
    publicReleaseEnabled: false;
    candidateReleaseEnabled: false;
    providerCallsEnabled: false;
    externalSendingEnabled: false;
    controlActionsEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  docs: {
    brief: "docs/CRAYS_WRITE_ADAPTER_DECISION_BRIEF_2026_07_09.md";
    nextBlock: "Block 66";
  };
};

function accessForRole(role: RoleKey): WriteAdapterDecisionContract["access"] {
  if (internalDecisionRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_write_decision",
      reason: "Role can read the full write-adapter decision framework. No write adapter is approved.",
    };
  }

  if (scopedDecisionRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_write_decision_shell",
      reason: "Role can read the scoped write-adapter decision shell for planning only. No write adapter is approved.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Write-adapter decision access requires internal platform, review or scoped module planning access.",
  };
}

function candidateOrder(): WriteAdapterDecisionContract["candidateOrder"] {
  return [
    {
      module: "project",
      label: "Project",
      firstPossibleWrite: "Create or update a scoped opening task.",
      currentStatus: "blocked",
      reason: "Read-only source smoke, idempotency, audit event and rollback policy are required first.",
    },
    {
      module: "crm",
      label: "CRM",
      firstPossibleWrite: "Create or update an internal follow-up task.",
      currentStatus: "blocked",
      reason: "Contact ownership, dedupe, consent and workflow ownership need approval first.",
    },
    {
      module: "files",
      label: "Files",
      firstPossibleWrite: "Create a document package metadata link.",
      currentStatus: "blocked",
      reason: "File storage, versioning, scan policy and release-state rules need approval first.",
    },
    {
      module: "erp",
      label: "ERP",
      firstPossibleWrite: "Create a finance summary draft or export staging record.",
      currentStatus: "blocked",
      reason: "Finance approval, accounting ownership, rollback and bank-send boundaries need approval first.",
    },
    {
      module: "sync",
      label: "Sync",
      firstPossibleWrite: "Run a non-destructive map refresh.",
      currentStatus: "blocked",
      reason: "Conflict policy, retry limits, idempotency keys and operator controls need approval first.",
    },
  ];
}

function requiredGates(): WriteAdapterDecisionContract["requiredGates"] {
  return [
    { key: "read-only-smoke", label: "Module read-only smoke has passed with sanitized output.", status: "required" },
    { key: "idempotency", label: "Idempotency key and replay behavior are defined.", status: "required" },
    { key: "audit", label: "Audit event schema, owner and review route are defined.", status: "required" },
    { key: "rollback", label: "Rollback, compensation and manual repair process are documented.", status: "required" },
    { key: "scope", label: "Role, organization and entity scope are enforced server-side.", status: "required" },
    { key: "rate-limit", label: "Rate limits, retry limits and failure classes are defined.", status: "required" },
    { key: "dry-run", label: "Dry-run preview matches the later write payload shape.", status: "required" },
    { key: "approval", label: "Explicit user approval names the module and write action.", status: "required" },
  ];
}

export function getWriteAdapterDecisionContract(role: RoleKey): WriteAdapterDecisionContract {
  const access = accessForRole(role);

  return {
    role,
    access,
    decision: {
      status: "decision_required",
      recommendation: "no_write_adapter_after_bounded_smokes_until_scope_approval",
      approvedWriteAdapters: 0,
      nextApprovedAction: "review_project_write_scope_decision",
    },
    boundedSmokeEvidence: {
      blockRange: "Blocks 56-65",
      evidenceRoute: "/api/crays/adapters/source-smoke/evidence",
      endpointReviewsComplete: access.allowed,
      boundedReadOnlySmokesComplete: access.allowed,
      sourceRuntimeCallsObserved: access.allowed ? 3 : 0,
      metadataOnlySmokes: access.allowed ? 1 : 0,
      approvedWriteAdapters: 0,
    },
    candidateOrder: access.allowed ? candidateOrder() : [],
    requiredGates: access.allowed ? requiredGates() : [],
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
      publicReleaseEnabled: false,
      candidateReleaseEnabled: false,
      providerCallsEnabled: false,
      externalSendingEnabled: false,
      controlActionsEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    docs: {
      brief: "docs/CRAYS_WRITE_ADAPTER_DECISION_BRIEF_2026_07_09.md",
      nextBlock: "Block 66",
    },
  };
}
