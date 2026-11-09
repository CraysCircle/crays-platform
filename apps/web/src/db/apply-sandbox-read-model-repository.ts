import { getManagementGateReviewReadModel } from "./management-gate-review-read-model-repository";
import type { RoleKey } from "@/lib/roles";

type AccessLevel = "apply_sandbox_control" | "apply_sandbox_scope" | "forbidden";
type SandboxStatus = "review_ready" | "gate_blocked" | "needs_correction";

export type ApplySandboxItem = {
  id: string;
  commandId: string;
  commandKey: string;
  moduleKey: string;
  moduleLabel: string;
  departmentOwner: string;
  actorRole: string;
  label: string;
  targetObject: string;
  status: SandboxStatus;
  simulatedTarget: string;
  diffClass: string;
  dryRunState: string;
  validationState: string;
  applyGate: string;
  applyGateLabel: string;
  applyGateStatus: string;
  rollbackPlan: string;
  idempotencyPolicy: string;
  auditEvidence: string[];
  recoveryOwner: string;
  nextAction: string;
  href: string;
};

export type ApplySandboxReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
    canStageSandboxReview: boolean;
  };
  summary: {
    items: number;
    modules: number;
    departments: number;
    gateBlocked: number;
    needsCorrection: number;
    reviewReady: number;
    rollbackReady: number;
    idempotentItems: number;
    sourceCommands: number;
  };
  items: ApplySandboxItem[];
  controls: {
    modules: Array<{ key: string; label: string; rows: number }>;
    statuses: Array<{ key: string; label: string; rows: number }>;
    gates: Array<{ key: string; label: string; rows: number }>;
    owners: Array<{ key: string; label: string; rows: number }>;
  };
  actions: {
    stageSandboxReviewAllowed: boolean;
    commandRoute: "/api/crays/core-command/sync-preview";
    confirmationHeader: "stage-sync-preview-command";
    applyGate: "OPEN_DEV_SYNC_APPLY";
  };
  boundaries: {
    coreCommandReadsEnabled: true;
    dryRunSimulationEnabled: true;
    targetApplyEnabled: false;
    sourceApplyEnabled: false;
    syncApplyEnabled: false;
    toolApplyEnabled: false;
    destructiveApplyEnabled: false;
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
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const fullRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedRoles: RoleKey[] = ["deal-manager", "expansion-manager", "finance", "studio-manager", "franchise-partner"];

function accessForRole(role: RoleKey): ApplySandboxReadModel["access"] {
  if (fullRoles.includes(role)) return { role, allowed: true, level: "apply_sandbox_control", reason: "Role can inspect the full apply sandbox design across all Core command drafts and closed gates.", canStageSandboxReview: true };
  if (scopedRoles.includes(role)) return { role, allowed: true, level: "apply_sandbox_scope", reason: "Role can inspect scoped apply sandbox design for its command drafts and module gates.", canStageSandboxReview: ["deal-manager", "finance", "studio-manager"].includes(role) };
  return { role, allowed: false, level: "forbidden", reason: "Apply Sandbox is internal/scoped command governance only.", canStageSandboxReview: false };
}

function boundaries(): ApplySandboxReadModel["boundaries"] {
  return {
    coreCommandReadsEnabled: true,
    dryRunSimulationEnabled: true,
    targetApplyEnabled: false,
    sourceApplyEnabled: false,
    syncApplyEnabled: false,
    toolApplyEnabled: false,
    destructiveApplyEnabled: false,
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

function title(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusFor(item: Awaited<ReturnType<typeof getManagementGateReviewReadModel>>["queue"][number]): SandboxStatus {
  if (item.validationStatus === "invalid" || item.queueState === "Needs correction") return "needs_correction";
  if (item.targetApplyStatus === "blocked" || item.applyGateStatus === "closed") return "gate_blocked";
  return "review_ready";
}

function diffClass(item: Awaited<ReturnType<typeof getManagementGateReviewReadModel>>["queue"][number]) {
  if (item.moduleKey === "sync") return item.commandKey.includes("rollback") ? "rollback-plan" : "mapping-diff";
  if (item.moduleKey === "files") return "metadata-package-diff";
  if (item.moduleKey === "erp") return "finance-summary-diff";
  if (item.moduleKey === "loans") return "bank-checklist-diff";
  if (item.moduleKey === "operations") return "studio-action-diff";
  if (item.moduleKey === "crm") return "activity-task-diff";
  if (item.moduleKey === "project") return "work-item-diff";
  return "core-command-diff";
}

function hrefFor(item: Awaited<ReturnType<typeof getManagementGateReviewReadModel>>["queue"][number], role: RoleKey) {
  const roleParam = encodeURIComponent(role);
  if (item.moduleKey === "sync") return `/sync?role=${roleParam}&view=queue`;
  if (item.moduleKey === "files") return `/files?role=${roleParam}&view=release-review&record=approvals`;
  if (item.moduleKey === "erp") return `/erp?role=${roleParam}&view=finance-summary`;
  if (item.moduleKey === "loans") return `/loans?role=${roleParam}&view=conditions&record=conditions`;
  if (item.moduleKey === "operations") return `/operations?role=${roleParam}`;
  if (item.moduleKey === "crm") return `/crm?role=${roleParam}&view=workflow`;
  if (item.moduleKey === "project") return `/project?role=${roleParam}&view=work-items`;
  return `/dashboard?role=${roleParam}&view=actions`;
}

function optionRows<T>(items: T[], selector: (item: T) => string, labeler = title) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, rows]) => ({ key, label: labeler(key), rows }));
}

function mapItem(item: Awaited<ReturnType<typeof getManagementGateReviewReadModel>>["queue"][number], role: RoleKey): ApplySandboxItem {
  const status = statusFor(item);
  return {
    id: item.commandId,
    commandId: item.commandId,
    commandKey: item.commandKey,
    moduleKey: item.moduleKey,
    moduleLabel: item.moduleLabel,
    departmentOwner: item.departmentOwner,
    actorRole: item.actorRole,
    label: item.label,
    targetObject: item.targetObject,
    status,
    simulatedTarget: `${item.moduleLabel} target adapter sandbox`,
    diffClass: diffClass(item),
    dryRunState: item.dryRunStatus,
    validationState: item.validationStatus,
    applyGate: item.applyGate,
    applyGateLabel: item.applyGateLabel,
    applyGateStatus: item.applyGateStatus,
    rollbackPlan: item.rollback.policy,
    idempotencyPolicy: "Stable idempotency key is required before any future apply simulation can be promoted.",
    auditEvidence: [
      `${item.history.eventCount} command events`,
      `${item.history.previewCount} previews`,
      `${item.history.gateReviewCount} gate reviews`,
      item.history.latestEvent,
    ],
    recoveryOwner: item.departmentOwner,
    nextAction:
      status === "needs_correction"
        ? "Return the command draft to its owner before any sandbox review can continue."
        : "Review diff, rollback, idempotency and audit evidence; keep apply gate closed.",
    href: hrefFor(item, role),
  };
}

export async function getApplySandboxReadModel(role: RoleKey): Promise<ApplySandboxReadModel> {
  const access = accessForRole(role);
  if (!access.allowed) {
    return {
      access,
      summary: { items: 0, modules: 0, departments: 0, gateBlocked: 0, needsCorrection: 0, reviewReady: 0, rollbackReady: 0, idempotentItems: 0, sourceCommands: 0 },
      items: [],
      controls: { modules: [], statuses: [], gates: [], owners: [] },
      actions: { stageSandboxReviewAllowed: false, commandRoute: "/api/crays/core-command/sync-preview", confirmationHeader: "stage-sync-preview-command", applyGate: "OPEN_DEV_SYNC_APPLY" },
      boundaries: boundaries(),
      queryStatus: "forbidden",
    };
  }

  const gateReview = await getManagementGateReviewReadModel(role);
  if (gateReview.queryStatus !== "schema_ready") {
    return {
      access,
      summary: { items: 0, modules: 0, departments: 0, gateBlocked: 0, needsCorrection: 0, reviewReady: 0, rollbackReady: 0, idempotentItems: 0, sourceCommands: 0 },
      items: [],
      controls: { modules: [], statuses: [], gates: [], owners: [] },
      actions: { stageSandboxReviewAllowed: access.canStageSandboxReview, commandRoute: "/api/crays/core-command/sync-preview", confirmationHeader: "stage-sync-preview-command", applyGate: "OPEN_DEV_SYNC_APPLY" },
      boundaries: boundaries(),
      queryStatus: gateReview.queryStatus,
    };
  }

  const items = gateReview.queue.map((item) => mapItem(item, role));
  const modules = new Set(items.map((item) => item.moduleKey));
  const departments = new Set(items.map((item) => item.departmentOwner));

  return {
    access,
    summary: {
      items: items.length,
      modules: modules.size,
      departments: departments.size,
      gateBlocked: items.filter((item) => item.status === "gate_blocked").length,
      needsCorrection: items.filter((item) => item.status === "needs_correction").length,
      reviewReady: items.filter((item) => item.status === "review_ready").length,
      rollbackReady: items.filter((item) => item.rollbackPlan.length > 0).length,
      idempotentItems: items.length,
      sourceCommands: gateReview.summary.total,
    },
    items,
    controls: {
      modules: optionRows(items, (item) => item.moduleKey),
      statuses: optionRows(items, (item) => item.status),
      gates: optionRows(items, (item) => item.applyGate, (key) => items.find((item) => item.applyGate === key)?.applyGateLabel ?? title(key)),
      owners: optionRows(items, (item) => item.departmentOwner),
    },
    actions: { stageSandboxReviewAllowed: access.canStageSandboxReview, commandRoute: "/api/crays/core-command/sync-preview", confirmationHeader: "stage-sync-preview-command", applyGate: "OPEN_DEV_SYNC_APPLY" },
    boundaries: boundaries(),
    queryStatus: "schema_ready",
  };
}
