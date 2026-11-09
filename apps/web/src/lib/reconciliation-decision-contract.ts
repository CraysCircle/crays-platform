import type { RoleKey } from "./roles";

const internalRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedRoles: RoleKey[] = ["finance", "deal-manager", "expansion-manager"];

export type ReconciliationDecisionContract = {
  role: RoleKey;
  access: {
    allowed: boolean;
    level: "internal_reconciliation_decision" | "scoped_reconciliation_shell" | "forbidden";
    reason: string;
  };
  decision: {
    status: "decision_required";
    recommendation: "no_reconciliation_execution_until_read_only_smokes_and_policy_are_complete";
    reconciliationExecutionApproved: false;
    nextApprovedAction: "define_non_destructive_conflict_policy";
  };
  policyGates: Array<{
    key: string;
    label: string;
    status: "required";
  }>;
  boundaries: {
    readOnly: true;
    decisionOnly: true;
    reconciliationExecutionEnabled: false;
    destructiveReconciliationEnabled: false;
    syncWritesEnabled: false;
    sourceWritesEnabled: false;
    retryExecutionEnabled: false;
    mappingOverrideEnabled: false;
    providerCallsEnabled: false;
    controlActionsEnabled: false;
    externalSendingEnabled: false;
    fileUploadEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

function accessForRole(role: RoleKey): ReconciliationDecisionContract["access"] {
  if (internalRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_reconciliation_decision",
      reason: "Role can read the full reconciliation decision framework. No reconciliation execution is approved.",
    };
  }

  if (scopedRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_reconciliation_shell",
      reason: "Role can read the scoped reconciliation shell for planning only. No reconciliation execution is approved.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Reconciliation decision access requires internal platform, review or scoped module planning access.",
  };
}

function policyGates(): ReconciliationDecisionContract["policyGates"] {
  return [
    { key: "idempotency", label: "Idempotency keys and replay behavior are defined.", status: "required" },
    { key: "conflict-policy", label: "Conflict classes and owner decisions are documented.", status: "required" },
    { key: "retry-limits", label: "Retry limits and failure states are bounded.", status: "required" },
    { key: "rollback", label: "Rollback, compensation and manual repair process exist.", status: "required" },
    { key: "audit", label: "Audit event ownership and review route are defined.", status: "required" },
    { key: "approval", label: "Explicit user approval names the reconciliation action.", status: "required" },
  ];
}

export function getReconciliationDecisionContract(role: RoleKey): ReconciliationDecisionContract {
  const access = accessForRole(role);

  return {
    role,
    access,
    decision: {
      status: "decision_required",
      recommendation: "no_reconciliation_execution_until_read_only_smokes_and_policy_are_complete",
      reconciliationExecutionApproved: false,
      nextApprovedAction: "define_non_destructive_conflict_policy",
    },
    policyGates: access.allowed ? policyGates() : [],
    boundaries: {
      readOnly: true,
      decisionOnly: true,
      reconciliationExecutionEnabled: false,
      destructiveReconciliationEnabled: false,
      syncWritesEnabled: false,
      sourceWritesEnabled: false,
      retryExecutionEnabled: false,
      mappingOverrideEnabled: false,
      providerCallsEnabled: false,
      controlActionsEnabled: false,
      externalSendingEnabled: false,
      fileUploadEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
  };
}
