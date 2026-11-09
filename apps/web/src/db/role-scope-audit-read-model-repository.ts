import { evaluatePermission, permissionDefinitions, type PermissionKey, type PermissionScope } from "@/lib/permissions";
import { getRoleToolFunctionMatrix } from "@/lib/role-tool-function-matrix";
import { roles, type RoleKey } from "@/lib/roles";

type AccessLevel = "scope_governance" | "scoped_scope_review" | "forbidden";
type AuditStatus = "allowed" | "redacted" | "blocked" | "review_required";
type BoundaryKind = "record" | "field" | "command" | "redaction";

type Scenario = {
  key: string;
  label: string;
  moduleKey: string;
  resource: string;
  permission: PermissionKey;
  scope: PermissionScope;
  fieldClass: "public" | "operational" | "financial" | "regulated" | "member-private";
  commandClass: "none" | "review-draft" | "core-command-draft" | "external-release" | "finance-execution";
  redactionRule: string;
  href: string;
};

export type RoleScopeAuditRow = {
  id: string;
  role: RoleKey;
  roleLabel: string;
  roleMode: string;
  scenarioKey: string;
  scenarioLabel: string;
  moduleKey: string;
  resource: string;
  scope: PermissionScope;
  boundaryKind: BoundaryKind;
  status: AuditStatus;
  permissionKey: PermissionKey;
  permissionRisk: string;
  currentState: string;
  visibleFields: string[];
  redactedFields: string[];
  commandAvailable: boolean;
  commandRoute: string | null;
  applyGate: string | null;
  nextAction: string;
  href: string;
};

export type RoleScopeAuditReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
    canStageScopeReview: boolean;
  };
  summary: {
    auditedRoles: number;
    scenarios: number;
    rows: number;
    allowedRows: number;
    redactedRows: number;
    blockedRows: number;
    reviewRequiredRows: number;
    commandDraftRows: number;
    criticalPermissions: number;
    matrixEntitlements: number;
  };
  rows: RoleScopeAuditRow[];
  controls: {
    roles: Array<{ key: string; label: string; rows: number }>;
    modules: Array<{ key: string; label: string; rows: number }>;
    statuses: Array<{ key: string; label: string; rows: number }>;
    boundaries: Array<{ key: string; label: string; rows: number }>;
  };
  actions: {
    stageScopeReviewAllowed: boolean;
    commandRoute: "/api/crays/core-command/sync-preview";
    confirmationHeader: "stage-sync-preview-command";
    applyGate: "OPEN_DEV_SYNC_APPLY";
  };
  boundaries: {
    permissionReadsEnabled: true;
    roleMatrixReadsEnabled: true;
    coreCommandDraftsEnabled: true;
    permissionMutationEnabled: false;
    accountMutationEnabled: false;
    roleMutationEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    toolApplyEnabled: false;
    targetApplyEnabled: false;
    externalSendingEnabled: false;
    publicReleaseEnabled: false;
    candidateReleaseEnabled: false;
    bankActionsEnabled: false;
    paymentInitiationEnabled: false;
    financePostingEnabled: false;
    uploadsEnabled: false;
    privatePreviewEnabled: false;
    liveAiEnabled: false;
    productionDeployEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "ready" | "forbidden";
};

const governanceRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedReviewerRoles: RoleKey[] = ["deal-manager", "expansion-manager", "finance", "studio-manager", "franchise-partner", "bank-partner"];
const auditedRoles: RoleKey[] = ["guest", "franchise-candidate", "franchise-partner", "bank-partner", "landlord", "studio-manager", "finance", "reviewer", "crays-management", "admin"];
const externalRoles: RoleKey[] = ["guest", "franchise-candidate", "bank-partner", "landlord", "vendor", "gym-member", "investor"];

const scenarios: Scenario[] = [
  {
    key: "candidate-offer-record",
    label: "Candidate offer record access",
    moduleKey: "crm",
    resource: "Prepared Offer",
    permission: "prepared-offers:read",
    scope: "candidate",
    fieldClass: "operational",
    commandClass: "review-draft",
    redactionRule: "External scopes only see released summaries; internal economics and source IDs are hidden.",
    href: "/crm?role=deal-manager&view=workflow",
  },
  {
    key: "bank-package-record",
    label: "Bank package access",
    moduleKey: "loans",
    resource: "Bank Package",
    permission: "bank-packages:read",
    scope: "bank-package",
    fieldClass: "regulated",
    commandClass: "core-command-draft",
    redactionRule: "Bank partner sees only release-gated package metadata; candidate PII and internal notes are redacted.",
    href: "/loans?role=finance&view=package-readiness&record=packages",
  },
  {
    key: "real-estate-property",
    label: "Real estate property case",
    moduleKey: "project",
    resource: "Property Case",
    permission: "properties:read",
    scope: "property",
    fieldClass: "operational",
    commandClass: "review-draft",
    redactionRule: "Owner and landlord slices exclude candidate economics, bank conditions and internal scoring.",
    href: "/project?role=expansion-manager&view=real-estate-decision",
  },
  {
    key: "finance-ledger",
    label: "Finance ledger visibility",
    moduleKey: "erp",
    resource: "Finance Ledger",
    permission: "finance:read",
    scope: "deal",
    fieldClass: "financial",
    commandClass: "finance-execution",
    redactionRule: "Only Finance/Admin/Management see internal ledger detail; partner views receive summary signals.",
    href: "/erp?role=finance&view=finance-summary",
  },
  {
    key: "kyc-aml-status",
    label: "KYC/AML status visibility",
    moduleKey: "loans",
    resource: "Regulated Check",
    permission: "kyc-aml:read",
    scope: "candidate",
    fieldClass: "regulated",
    commandClass: "external-release",
    redactionRule: "Regulated evidence is never visible to Guest and stays release-gated for external roles.",
    href: "/loans?role=finance&view=conditions",
  },
  {
    key: "member-data",
    label: "Member data visibility",
    moduleKey: "operations",
    resource: "Member Profile",
    permission: "member-data:read",
    scope: "member",
    fieldClass: "member-private",
    commandClass: "core-command-draft",
    redactionRule: "Member-private fields stay studio/member scoped and are never exposed in deal, bank or public surfaces.",
    href: "/operations?role=studio-manager",
  },
  {
    key: "document-package",
    label: "Document package approval",
    moduleKey: "files",
    resource: "Evidence Package",
    permission: "documents:approve",
    scope: "document",
    fieldClass: "operational",
    commandClass: "review-draft",
    redactionRule: "Approval history is internal; external package views receive only released section status.",
    href: "/files?role=reviewer&view=release-review&record=approvals",
  },
  {
    key: "communication-thread",
    label: "Communication thread visibility",
    moduleKey: "chat",
    resource: "Communication",
    permission: "communication:read",
    scope: "document",
    fieldClass: "operational",
    commandClass: "none",
    redactionRule: "Threads are participant-, scope- and consent-filtered before any external send exists.",
    href: "/chat?role=deal-manager",
  },
  {
    key: "workflow-events",
    label: "Workflow and audit events",
    moduleKey: "dashboard",
    resource: "Workflow Events",
    permission: "workflow-events:read",
    scope: "deal",
    fieldClass: "operational",
    commandClass: "review-draft",
    redactionRule: "Audit events show actor role and state but hide private payloads from scoped and external roles.",
    href: "/dashboard?role=reviewer&view=actions",
  },
];

const commandRouteByClass: Record<Scenario["commandClass"], string | null> = {
  none: null,
  "review-draft": "/api/crays/core-command/sync-preview",
  "core-command-draft": "/api/crays/core-command/sync-preview",
  "external-release": null,
  "finance-execution": null,
};

function boundaries(): RoleScopeAuditReadModel["boundaries"] {
  return {
    permissionReadsEnabled: true,
    roleMatrixReadsEnabled: true,
    coreCommandDraftsEnabled: true,
    permissionMutationEnabled: false,
    accountMutationEnabled: false,
    roleMutationEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    toolApplyEnabled: false,
    targetApplyEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    candidateReleaseEnabled: false,
    bankActionsEnabled: false,
    paymentInitiationEnabled: false,
    financePostingEnabled: false,
    uploadsEnabled: false,
    privatePreviewEnabled: false,
    liveAiEnabled: false,
    productionDeployEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function accessForRole(role: RoleKey): RoleScopeAuditReadModel["access"] {
  if (governanceRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "scope_governance",
      reason: "Role can audit all role, record, field, command and redaction boundaries.",
      canStageScopeReview: true,
    };
  }

  if (scopedReviewerRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "scoped_scope_review",
      reason: "Role can audit its own operating and partner-safe scope boundaries.",
      canStageScopeReview: ["finance", "studio-manager", "deal-manager"].includes(role),
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Permission scope audit is not available to public, candidate, member or owner-only roles.",
    canStageScopeReview: false,
  };
}

function title(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function optionRows<T>(items: T[], selector: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, rows]) => ({ key, label: title(key), rows }));
}

function fieldsFor(input: { scenario: Scenario; allowed: boolean; status: AuditStatus; role: RoleKey }) {
  const commonVisible = ["Record label", "Status", "Owner role", "Next safe action"];
  if (!input.allowed) return { visibleFields: ["Release boundary", "Access reason"], redactedFields: ["Record payload", "Source IDs", "Command controls", "Private notes"] };

  if (input.status === "redacted") {
    return {
      visibleFields: [...commonVisible, "Released summary", "Redaction state"],
      redactedFields: ["Internal notes", "Raw source IDs", "Private personal data", input.scenario.fieldClass === "financial" ? "Ledger detail" : "Internal scoring"],
    };
  }

  const regulatedRedactions = input.scenario.fieldClass === "regulated" ? ["Provider payload", "Source-of-funds documents"] : [];
  const memberRedactions = input.scenario.fieldClass === "member-private" && input.role !== "studio-manager" && input.role !== "admin" ? ["Member contact detail", "Payment instrument references"] : [];

  return {
    visibleFields: [...commonVisible, "Source map status", "Timeline state", "Scoped evidence"],
    redactedFields: [...regulatedRedactions, ...memberRedactions],
  };
}

function rowStatus(input: { role: RoleKey; scenario: Scenario; allowed: boolean; boundaryKind: BoundaryKind }): AuditStatus {
  if (!input.allowed) return "blocked";
  if (input.boundaryKind === "redaction") return externalRoles.includes(input.role) || input.scenario.fieldClass === "regulated" ? "redacted" : "allowed";
  if (input.boundaryKind === "field") return input.scenario.fieldClass === "regulated" || input.scenario.fieldClass === "member-private" ? "review_required" : "allowed";
  if (input.boundaryKind === "command") {
    if (input.scenario.commandClass === "none") return "blocked";
    if (input.scenario.commandClass === "external-release" || input.scenario.commandClass === "finance-execution") return "blocked";
    return ["admin", "crays-management", "reviewer", "deal-manager", "finance", "studio-manager"].includes(input.role) ? "review_required" : "blocked";
  }
  return "allowed";
}

function auditRowsFor(role: RoleKey, visibleAuditedRoles: RoleKey[]): RoleScopeAuditRow[] {
  const permissionRisk = new Map(permissionDefinitions.map((permission) => [permission.key, permission.risk]));
  const roleLabel = new Map(roles.map((item) => [item.key, item.label]));
  const roleMode = new Map(roles.map((item) => [item.key, item.mode]));

  return visibleAuditedRoles.flatMap((auditedRole) =>
    scenarios.flatMap((scenario) => {
      const decision = evaluatePermission({ role: auditedRole, permission: scenario.permission, scope: scenario.scope });
      const boundaryKinds: BoundaryKind[] = ["record", "field", "command", "redaction"];

      return boundaryKinds.map((boundaryKind) => {
        const status = rowStatus({ role: auditedRole, scenario, allowed: decision.allowed, boundaryKind });
        const fieldSet = fieldsFor({ scenario, allowed: decision.allowed, status, role: auditedRole });
        const commandAvailable = boundaryKind === "command" && status === "review_required" && Boolean(commandRouteByClass[scenario.commandClass]);

        return {
          id: `${auditedRole}:${scenario.key}:${boundaryKind}`,
          role: auditedRole,
          roleLabel: roleLabel.get(auditedRole) ?? title(auditedRole),
          roleMode: roleMode.get(auditedRole) ?? "workbench",
          scenarioKey: scenario.key,
          scenarioLabel: scenario.label,
          moduleKey: scenario.moduleKey,
          resource: scenario.resource,
          scope: scenario.scope,
          boundaryKind,
          status,
          permissionKey: scenario.permission,
          permissionRisk: permissionRisk.get(scenario.permission) ?? "medium",
          currentState: decision.allowed
            ? `${scenario.label} is ${status === "redacted" ? "visible through redacted scope" : "covered by permission policy"} for ${roleLabel.get(auditedRole) ?? auditedRole}.`
            : `${scenario.label} is blocked for ${roleLabel.get(auditedRole) ?? auditedRole}: ${decision.reason}`,
          visibleFields: fieldSet.visibleFields,
          redactedFields: fieldSet.redactedFields,
          commandAvailable,
          commandRoute: commandAvailable ? commandRouteByClass[scenario.commandClass] : null,
          applyGate: commandAvailable ? "OPEN_DEV_SYNC_APPLY" : null,
          nextAction: commandAvailable
            ? "Stage a guarded scope-review draft if the reviewer needs to document this boundary; do not mutate permissions."
            : status === "blocked"
              ? "Keep the boundary closed unless an explicit future access decision changes the policy."
              : status === "redacted"
                ? "Keep redaction proof attached before any external visibility is prepared."
                : "Use this boundary as current role-scope proof.",
          href: scenario.href,
        } satisfies RoleScopeAuditRow;
      });
    }),
  );
}

function visibleRolesFor(access: RoleScopeAuditReadModel["access"], role: RoleKey) {
  if (access.level === "scope_governance") return auditedRoles;
  if (role === "finance") return ["finance", "deal-manager", "bank-partner", "franchise-partner"] satisfies RoleKey[];
  if (role === "studio-manager") return ["studio-manager", "franchise-partner", "gym-member"] satisfies RoleKey[];
  if (role === "deal-manager") return ["deal-manager", "franchise-candidate", "franchise-partner", "bank-partner", "landlord"] satisfies RoleKey[];
  if (role === "expansion-manager") return ["expansion-manager", "landlord", "deal-manager"] satisfies RoleKey[];
  if (role === "franchise-partner") return ["franchise-partner", "studio-manager", "gym-member"] satisfies RoleKey[];
  if (role === "bank-partner") return ["bank-partner"] satisfies RoleKey[];
  return [role];
}

export async function getRoleScopeAuditReadModel(role: RoleKey): Promise<RoleScopeAuditReadModel> {
  const access = accessForRole(role);
  if (!access.allowed) {
    return {
      access,
      summary: { auditedRoles: 0, scenarios: scenarios.length, rows: 0, allowedRows: 0, redactedRows: 0, blockedRows: 0, reviewRequiredRows: 0, commandDraftRows: 0, criticalPermissions: 0, matrixEntitlements: 0 },
      rows: [],
      controls: { roles: [], modules: [], statuses: [], boundaries: [] },
      actions: { stageScopeReviewAllowed: false, commandRoute: "/api/crays/core-command/sync-preview", confirmationHeader: "stage-sync-preview-command", applyGate: "OPEN_DEV_SYNC_APPLY" },
      boundaries: boundaries(),
      queryStatus: "forbidden",
    };
  }

  const matrix = getRoleToolFunctionMatrix(access.level === "scope_governance" ? "reviewer" : role);
  const visibleAuditedRoles = visibleRolesFor(access, role);
  const rows = auditRowsFor(role, visibleAuditedRoles);

  return {
    access,
    summary: {
      auditedRoles: visibleAuditedRoles.length,
      scenarios: scenarios.length,
      rows: rows.length,
      allowedRows: rows.filter((row) => row.status === "allowed").length,
      redactedRows: rows.filter((row) => row.status === "redacted").length,
      blockedRows: rows.filter((row) => row.status === "blocked").length,
      reviewRequiredRows: rows.filter((row) => row.status === "review_required").length,
      commandDraftRows: rows.filter((row) => row.commandAvailable).length,
      criticalPermissions: permissionDefinitions.filter((permission) => permission.risk === "critical").length,
      matrixEntitlements: matrix.summary.entitlementsMapped,
    },
    rows,
    controls: {
      roles: optionRows(rows, (row) => row.role),
      modules: optionRows(rows, (row) => row.moduleKey),
      statuses: optionRows(rows, (row) => row.status),
      boundaries: optionRows(rows, (row) => row.boundaryKind),
    },
    actions: { stageScopeReviewAllowed: access.canStageScopeReview, commandRoute: "/api/crays/core-command/sync-preview", confirmationHeader: "stage-sync-preview-command", applyGate: "OPEN_DEV_SYNC_APPLY" },
    boundaries: boundaries(),
    queryStatus: "ready",
  };
}
