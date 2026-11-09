import type { RoleKey } from "./roles";

const internalRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedRoles: RoleKey[] = ["finance", "deal-manager", "expansion-manager"];

export type AdapterAuditContract = {
  role: RoleKey;
  access: {
    allowed: boolean;
    level: "internal_audit_scaffold" | "scoped_audit_shell" | "forbidden";
    reason: string;
  };
  audit: {
    schemaReady: true;
    liveAuditEventsReturned: false;
    auditWritesEnabled: false;
    plannedEvents: Array<{
      key: string;
      label: string;
      status: "planned";
    }>;
  };
  boundaries: {
    readOnly: true;
    scaffoldOnly: true;
    eventWritesEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    retryExecutionEnabled: false;
    destructiveReconciliationEnabled: false;
    providerCallsEnabled: false;
    fileUploadEnabled: false;
    externalSendingEnabled: false;
    controlActionsEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

function accessForRole(role: RoleKey): AdapterAuditContract["access"] {
  if (internalRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_audit_scaffold",
      reason: "Role can read adapter audit scaffolding. No audit event write is enabled.",
    };
  }

  if (scopedRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_audit_shell",
      reason: "Role can read the scoped adapter audit shell for future module review only.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Adapter audit scaffold requires internal platform, review or scoped module planning access.",
  };
}

function plannedEvents(): AdapterAuditContract["audit"]["plannedEvents"] {
  return [
    { key: "source-smoke-planned", label: "Source smoke planned", status: "planned" },
    { key: "source-smoke-passed", label: "Source smoke passed", status: "planned" },
    { key: "source-smoke-blocked", label: "Source smoke blocked", status: "planned" },
    { key: "write-approval-required", label: "Write approval required", status: "planned" },
    { key: "write-blocked", label: "Write blocked", status: "planned" },
    { key: "reconciliation-blocked", label: "Reconciliation blocked", status: "planned" },
  ];
}

export function getAdapterAuditContract(role: RoleKey): AdapterAuditContract {
  const access = accessForRole(role);

  return {
    role,
    access,
    audit: {
      schemaReady: true,
      liveAuditEventsReturned: false,
      auditWritesEnabled: false,
      plannedEvents: access.allowed ? plannedEvents() : [],
    },
    boundaries: {
      readOnly: true,
      scaffoldOnly: true,
      eventWritesEnabled: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      retryExecutionEnabled: false,
      destructiveReconciliationEnabled: false,
      providerCallsEnabled: false,
      fileUploadEnabled: false,
      externalSendingEnabled: false,
      controlActionsEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
  };
}
