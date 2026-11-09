import { getApplySandboxReadModel } from "./apply-sandbox-read-model-repository";
import { getSyncDataHealthReadModel, type SyncDataHealthRecord } from "./sync-data-health-read-model-repository";
import type { RoleKey } from "@/lib/roles";

type AccessLevel = "monitoring_control" | "monitoring_scope" | "forbidden";
type MonitorStatus = "healthy" | "attention" | "blocked" | "stale";
type MonitorFamily = "runtime" | "source-family" | "sync-job" | "identity" | "command-gate" | "recovery";

export type MonitoringRecord = {
  id: string;
  family: MonitorFamily;
  label: string;
  moduleKey: string;
  owner: string;
  status: MonitorStatus;
  priority: "low" | "medium" | "high" | "critical";
  records: number;
  conflicts: number;
  staleMinutes: number | null;
  currentState: string;
  recoveryAction: string;
  href: string;
};

export type MonitoringReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
    canStageMonitoringReview: boolean;
  };
  summary: {
    records: number;
    runtimeRecords: number;
    sourceFamilies: number;
    syncJobs: number;
    identityRecords: number;
    commandGates: number;
    recoveryRecords: number;
    blocked: number;
    attention: number;
    stale: number;
    conflicts: number;
    failedJobs: number;
    commandGateBlocked: number;
    owners: number;
  };
  records: MonitoringRecord[];
  controls: {
    families: Array<{ key: string; label: string; rows: number }>;
    modules: Array<{ key: string; label: string; rows: number }>;
    statuses: Array<{ key: string; label: string; rows: number }>;
    owners: Array<{ key: string; label: string; rows: number }>;
  };
  actions: {
    stageMonitoringReviewAllowed: boolean;
    commandRoute: "/api/crays/core-command/sync-preview";
    confirmationHeader: "stage-sync-preview-command";
    applyGate: "OPEN_DEV_SYNC_APPLY";
  };
  boundaries: {
    runtimeReadsEnabled: true;
    sourceHealthReadsEnabled: true;
    commandHealthReadsEnabled: true;
    retryExecutionEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    toolApplyEnabled: false;
    targetApplyEnabled: false;
    destructiveApplyEnabled: false;
    externalSendingEnabled: false;
    releaseEnabled: false;
    bankActionsEnabled: false;
    paymentInitiationEnabled: false;
    financePostingEnabled: false;
    uploadsEnabled: false;
    liveAiEnabled: false;
    productionDeployEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const controlRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedRoles: RoleKey[] = ["deal-manager", "expansion-manager", "finance", "studio-manager"];

function accessForRole(role: RoleKey): MonitoringReadModel["access"] {
  if (controlRoles.includes(role)) return { role, allowed: true, level: "monitoring_control", reason: "Role can monitor system-wide runtime, source, sync, identity and command gate health.", canStageMonitoringReview: true };
  if (scopedRoles.includes(role)) return { role, allowed: true, level: "monitoring_scope", reason: "Role can monitor module-scoped source, sync and command gate health.", canStageMonitoringReview: false };
  return { role, allowed: false, level: "forbidden", reason: "Monitoring is internal operating control only.", canStageMonitoringReview: false };
}

function boundaries(): MonitoringReadModel["boundaries"] {
  return {
    runtimeReadsEnabled: true,
    sourceHealthReadsEnabled: true,
    commandHealthReadsEnabled: true,
    retryExecutionEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    toolApplyEnabled: false,
    targetApplyEnabled: false,
    destructiveApplyEnabled: false,
    externalSendingEnabled: false,
    releaseEnabled: false,
    bankActionsEnabled: false,
    paymentInitiationEnabled: false,
    financePostingEnabled: false,
    uploadsEnabled: false,
    liveAiEnabled: false,
    productionDeployEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function title(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function priority(status: MonitorStatus): MonitoringRecord["priority"] {
  if (status === "blocked") return "critical";
  if (status === "attention") return "high";
  if (status === "stale") return "medium";
  return "low";
}

function familyFromHealth(record: SyncDataHealthRecord): MonitorFamily {
  if (record.family === "connection") return "runtime";
  if (record.family === "sync-job") return "sync-job";
  if (record.family === "identity-health") return "identity";
  return "source-family";
}

function statusFromHealth(record: SyncDataHealthRecord): MonitorStatus {
  if (["blocked", "failed"].includes(record.sourceStatus) || record.status === "blocked") return "blocked";
  if (record.status === "stale") return "stale";
  if (record.status === "attention") return "attention";
  return "healthy";
}

function healthRecord(record: SyncDataHealthRecord): MonitoringRecord {
  const status = statusFromHealth(record);
  return {
    id: record.id,
    family: familyFromHealth(record),
    label: record.label,
    moduleKey: record.moduleKey,
    owner: record.owner,
    status,
    priority: priority(status),
    records: record.records,
    conflicts: record.conflicts,
    staleMinutes: record.freshnessMinutes,
    currentState: record.currentState,
    recoveryAction: record.nextAction,
    href: record.href,
  };
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

export async function getMonitoringReadModel(role: RoleKey): Promise<MonitoringReadModel> {
  const access = accessForRole(role);
  if (!access.allowed) {
    return {
      access,
      summary: { records: 0, runtimeRecords: 0, sourceFamilies: 0, syncJobs: 0, identityRecords: 0, commandGates: 0, recoveryRecords: 0, blocked: 0, attention: 0, stale: 0, conflicts: 0, failedJobs: 0, commandGateBlocked: 0, owners: 0 },
      records: [],
      controls: { families: [], modules: [], statuses: [], owners: [] },
      actions: { stageMonitoringReviewAllowed: false, commandRoute: "/api/crays/core-command/sync-preview", confirmationHeader: "stage-sync-preview-command", applyGate: "OPEN_DEV_SYNC_APPLY" },
      boundaries: boundaries(),
      queryStatus: "forbidden",
    };
  }

  const [health, sandbox] = await Promise.all([getSyncDataHealthReadModel(role), getApplySandboxReadModel(role)]);
  if (health.queryStatus !== "schema_ready") {
    return {
      access,
      summary: { records: 0, runtimeRecords: 0, sourceFamilies: 0, syncJobs: 0, identityRecords: 0, commandGates: 0, recoveryRecords: 0, blocked: 0, attention: 0, stale: 0, conflicts: 0, failedJobs: 0, commandGateBlocked: 0, owners: 0 },
      records: [],
      controls: { families: [], modules: [], statuses: [], owners: [] },
      actions: { stageMonitoringReviewAllowed: access.canStageMonitoringReview, commandRoute: "/api/crays/core-command/sync-preview", confirmationHeader: "stage-sync-preview-command", applyGate: "OPEN_DEV_SYNC_APPLY" },
      boundaries: boundaries(),
      queryStatus: health.queryStatus,
    };
  }

  const healthRecords = health.records.map(healthRecord);
  const commandRecords: MonitoringRecord[] = sandbox.items.slice(0, 30).map((item) => ({
    id: `command-gate:${item.commandId}`,
    family: "command-gate",
    label: item.label,
    moduleKey: item.moduleKey,
    owner: item.departmentOwner,
    status: item.status === "needs_correction" ? "blocked" : "attention",
    priority: item.status === "needs_correction" ? "critical" : "high",
    records: 1,
    conflicts: 0,
    staleMinutes: null,
    currentState: `${item.commandKey} is blocked by ${item.applyGateLabel}.`,
    recoveryAction: item.nextAction,
    href: item.href,
  }));
  const recoveryRecords: MonitoringRecord[] = healthRecords
    .filter((record) => record.status !== "healthy")
    .slice(0, 20)
    .map((record) => ({ ...record, id: `recovery:${record.id}`, family: "recovery", label: `${record.label} recovery`, owner: record.owner || "Data Governance" }));
  const records = [...healthRecords, ...commandRecords, ...recoveryRecords].sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.priority] - { critical: 0, high: 1, medium: 2, low: 3 }[b.priority]) || a.label.localeCompare(b.label));
  const owners = new Set(records.map((record) => record.owner));

  return {
    access,
    summary: {
      records: records.length,
      runtimeRecords: records.filter((record) => record.family === "runtime").length,
      sourceFamilies: records.filter((record) => record.family === "source-family").length,
      syncJobs: records.filter((record) => record.family === "sync-job").length,
      identityRecords: records.filter((record) => record.family === "identity").length,
      commandGates: records.filter((record) => record.family === "command-gate").length,
      recoveryRecords: records.filter((record) => record.family === "recovery").length,
      blocked: records.filter((record) => record.status === "blocked").length,
      attention: records.filter((record) => record.status === "attention").length,
      stale: records.filter((record) => record.status === "stale").length,
      conflicts: records.reduce((total, record) => total + record.conflicts, 0),
      failedJobs: health.summary.failedJobs,
      commandGateBlocked: sandbox.summary.gateBlocked,
      owners: owners.size,
    },
    records,
    controls: {
      families: optionRows(records, (record) => record.family),
      modules: optionRows(records, (record) => record.moduleKey),
      statuses: optionRows(records, (record) => record.status),
      owners: optionRows(records, (record) => record.owner),
    },
    actions: { stageMonitoringReviewAllowed: access.canStageMonitoringReview, commandRoute: "/api/crays/core-command/sync-preview", confirmationHeader: "stage-sync-preview-command", applyGate: "OPEN_DEV_SYNC_APPLY" },
    boundaries: boundaries(),
    queryStatus: "schema_ready",
  };
}
