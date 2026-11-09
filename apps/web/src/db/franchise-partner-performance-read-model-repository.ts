import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "partner_performance_full" | "partner_performance_owner" | "partner_performance_finance" | "partner_performance_operations" | "partner_performance_review" | "forbidden";
type DecisionStatus = "ready" | "attention" | "blocked";

type SourceRow = {
  external_entity_type: string;
  external_entity_id: string;
  crays_entity_type: string;
  crays_entity_id: string;
  sync_status: string;
  last_synced_at: Date | null;
  metadata: JsonRecord | null;
};

type CommandRow = {
  command_id: string;
  actor_role: string;
  command_status: string;
  target_apply_status: "blocked" | "not_configured";
  input_payload: JsonRecord | null;
  created_at: Date;
};

export type FranchisePartnerPerformanceRecord = {
  id: string;
  family: string;
  label: string;
  craysEntityType: string;
  craysEntityId: string;
  partnerName: string;
  companyName: string;
  studioName: string;
  metricKey: string;
  metricLabel: string;
  value: string | number | boolean | null;
  unit: string | null;
  benchmarkValue: string | number | boolean | null;
  benchmarkDelta: number | null;
  status: string;
  priority: string;
  ownerRole: string;
  sourceDatasets: string[];
  currentState: string;
  nextAction: string;
  href: string;
  lastSyncedAt: string | null;
  fields: JsonRecord;
};

export type FranchisePartnerPerformanceReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
    canStagePerformanceReview: boolean;
  };
  summary: {
    records: number;
    sourceRecords: number;
    linkedMemberSourceRecords: number;
    linkedFinanceRecoveryRecords: number;
    linkedOperationsRecoveryRecords: number;
    portfolioSnapshots: number;
    partnerMetrics: number;
    memberGrowthMetrics: number;
    paymentQualityMetrics: number;
    operationsRecoveryMetrics: number;
    supportExperienceMetrics: number;
    reviewActions: number;
    blockedRows: number;
    attentionRows: number;
    criticalRows: number;
    commandDrafts: number;
    latestCommandId: string | null;
    freshnessMinutes: number | null;
  };
  decisionCards: Array<{
    key: string;
    label: string;
    value: string;
    context: string;
    status: DecisionStatus;
    filterFamily: string;
    searchTerm: string;
  }>;
  records: FranchisePartnerPerformanceRecord[];
  controls: {
    families: Array<{ key: string; label: string; rows: number }>;
    statuses: Array<{ key: string; label: string; rows: number }>;
    priorities: Array<{ key: string; label: string; rows: number }>;
    owners: Array<{ key: string; label: string; rows: number }>;
    studios: Array<{ key: string; label: string; rows: number }>;
    sourceBacked: true;
    roleScoped: true;
  };
  actions: {
    stagePerformanceReviewAllowed: boolean;
    commandRoute: "/api/crays/core-command/sync-preview";
    confirmationHeader: "stage-sync-preview-command";
    commandType: "diff_review";
    action: "classify_diff";
  };
  history: Array<{
    commandId: string;
    label: string;
    actorRole: string;
    status: string;
    targetApplyStatus: "blocked" | "not_configured";
    createdAt: string;
  }>;
  sourceHealth: {
    connectionId: "core_source_franchise_partner_performance";
    systemKey: "franchise-performance";
    seedBatch: "crays-franchise-partner-performance-20260712-v1";
    records: number;
    conflicts: number;
  };
  boundaries: {
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
    paymentInitiationEnabled: false;
    financePostingEnabled: false;
    accountingExportsEnabled: false;
    externalSendingEnabled: false;
    liveAiEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const seedBatch = "crays-franchise-partner-performance-20260712-v1";
const sourceSystem = "franchise-performance";
const fullRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const ownerRoles: RoleKey[] = ["franchise-partner"];
const financeRoles: RoleKey[] = ["finance"];
const operationsRoles: RoleKey[] = ["studio-manager"];
const reviewRoles: RoleKey[] = ["deal-manager"];
const commandRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "finance", "deal-manager", "franchise-partner", "studio-manager"];
const financeFamilies = new Set(["partner-portfolio-snapshots", "partner-performance-metrics", "payment-quality-metrics", "partner-review-actions"]);
const operationsFamilies = new Set(["partner-portfolio-snapshots", "member-growth-metrics", "operations-recovery-metrics", "support-experience-metrics", "partner-review-actions"]);
const reviewFamilies = new Set(["partner-portfolio-snapshots", "partner-performance-metrics", "partner-review-actions"]);

function accessForRole(role: RoleKey): FranchisePartnerPerformanceReadModel["access"] {
  if (fullRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "partner_performance_full",
      reason: "Role can inspect the full partner performance workflow across portfolio, member, payment, operations and support data.",
      canStagePerformanceReview: commandRoles.includes(role),
    };
  }

  if (ownerRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "partner_performance_owner",
      reason: "Role owns the scoped partner performance view and can stage guarded partner review commands.",
      canStagePerformanceReview: commandRoles.includes(role),
    };
  }

  if (financeRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "partner_performance_finance",
      reason: "Role can inspect partner performance metrics that affect financial recovery, payment quality and forecast review.",
      canStagePerformanceReview: commandRoles.includes(role),
    };
  }

  if (operationsRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "partner_performance_operations",
      reason: "Role can inspect partner performance metrics that depend on local studio operations, support and member recovery.",
      canStagePerformanceReview: commandRoles.includes(role),
    };
  }

  if (reviewRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "partner_performance_review",
      reason: "Role can inspect partner decision status and stage internal review commands.",
      canStagePerformanceReview: commandRoles.includes(role),
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Role is outside the internal Franchise Partner Performance workflow.",
    canStagePerformanceReview: false,
  };
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function titleCase(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function rowFromMetadata(metadata: JsonRecord | null) {
  return asRecord(metadata?.row);
}

function fieldsFromMetadata(metadata: JsonRecord | null) {
  return asRecord(rowFromMetadata(metadata).fields);
}

function familyLabel(family: string) {
  const labels: Record<string, string> = {
    "partner-portfolio-snapshots": "Portfolio snapshots",
    "partner-performance-metrics": "Performance metrics",
    "member-growth-metrics": "Member growth",
    "payment-quality-metrics": "Payment quality",
    "operations-recovery-metrics": "Operations recovery",
    "support-experience-metrics": "Support experience",
    "partner-review-actions": "Review actions",
  };
  return labels[family] ?? titleCase(family);
}

function normalizeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
}

function visibleFor(record: FranchisePartnerPerformanceRecord, access: FranchisePartnerPerformanceReadModel["access"]) {
  if (!access.allowed) return false;
  if (access.level === "partner_performance_full" || access.level === "partner_performance_owner") return true;
  if (access.level === "partner_performance_finance") return financeFamilies.has(record.family);
  if (access.level === "partner_performance_operations") return operationsFamilies.has(record.family);
  if (access.level === "partner_performance_review") return reviewFamilies.has(record.family);
  return false;
}

function mapRecord(row: SourceRow): FranchisePartnerPerformanceRecord {
  const sourceRow = rowFromMetadata(row.metadata);
  const fields = fieldsFromMetadata(row.metadata);
  const value = fields.value;
  const benchmarkValue = fields.benchmarkValue;
  return {
    id: `${row.external_entity_type}:${row.external_entity_id}`,
    family: row.external_entity_type,
    label: text(sourceRow.label, row.external_entity_id),
    craysEntityType: row.crays_entity_type,
    craysEntityId: row.crays_entity_id,
    partnerName: text(fields.partnerName, "Franchise Partner"),
    companyName: text(fields.companyName, "Partner company"),
    studioName: text(fields.studioName, "Portfolio"),
    metricKey: text(fields.metricKey, row.external_entity_id),
    metricLabel: text(fields.metricLabel, text(sourceRow.label, row.external_entity_id)),
    value: typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : null,
    unit: text(fields.unit, "") || null,
    benchmarkValue: typeof benchmarkValue === "string" || typeof benchmarkValue === "number" || typeof benchmarkValue === "boolean" ? benchmarkValue : null,
    benchmarkDelta: numberValue(fields.benchmarkDelta),
    status: text(fields.status, text(sourceRow.status, row.sync_status)),
    priority: text(fields.priority, text(sourceRow.priority, row.sync_status === "conflict" ? "high" : "medium")),
    ownerRole: text(fields.ownerRole, text(sourceRow.owner, "Franchise Partner")),
    sourceDatasets: normalizeArray(fields.sourceDatasets),
    currentState: text(fields.currentState, "Current state is not recorded."),
    nextAction: text(fields.nextAction, "Review partner performance record."),
    href: text(fields.href, "/analytics?role=franchise-partner"),
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
    fields,
  };
}

function priorityRank(priority: string) {
  if (priority === "critical") return 0;
  if (priority === "high") return 1;
  if (priority === "medium") return 2;
  return 3;
}

function statusRank(status: string) {
  if (status === "blocked") return 0;
  if (status === "attention") return 1;
  if (status === "ready") return 2;
  return 3;
}

function empty(role: RoleKey, access: FranchisePartnerPerformanceReadModel["access"], queryStatus: FranchisePartnerPerformanceReadModel["queryStatus"]): FranchisePartnerPerformanceReadModel {
  return {
    access,
    summary: {
      records: 0,
      sourceRecords: 0,
      linkedMemberSourceRecords: 0,
      linkedFinanceRecoveryRecords: 0,
      linkedOperationsRecoveryRecords: 0,
      portfolioSnapshots: 0,
      partnerMetrics: 0,
      memberGrowthMetrics: 0,
      paymentQualityMetrics: 0,
      operationsRecoveryMetrics: 0,
      supportExperienceMetrics: 0,
      reviewActions: 0,
      blockedRows: 0,
      attentionRows: 0,
      criticalRows: 0,
      commandDrafts: 0,
      latestCommandId: null,
      freshnessMinutes: null,
    },
    decisionCards: [],
    records: [],
    controls: { families: [], statuses: [], priorities: [], owners: [], studios: [], sourceBacked: true, roleScoped: true },
    actions: {
      stagePerformanceReviewAllowed: access.canStagePerformanceReview,
      commandRoute: "/api/crays/core-command/sync-preview",
      confirmationHeader: "stage-sync-preview-command",
      commandType: "diff_review",
      action: "classify_diff",
    },
    history: [],
    sourceHealth: {
      connectionId: "core_source_franchise_partner_performance",
      systemKey: sourceSystem,
      seedBatch,
      records: 0,
      conflicts: 0,
    },
    boundaries: {
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      accountingExportsEnabled: false,
      externalSendingEnabled: false,
      liveAiEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    queryStatus,
  };
}

function countFamily(records: FranchisePartnerPerformanceRecord[], family: string) {
  return records.filter((record) => record.family === family).length;
}

function decisionStatus(records: FranchisePartnerPerformanceRecord[], family: string): DecisionStatus {
  const scoped = records.filter((record) => record.family === family);
  if (scoped.some((record) => record.status === "blocked" || record.priority === "critical")) return "blocked";
  if (scoped.some((record) => record.status === "attention" || record.priority === "high")) return "attention";
  return "ready";
}

function buildDecisionCards(records: FranchisePartnerPerformanceRecord[]): FranchisePartnerPerformanceReadModel["decisionCards"] {
  const definitions = [
    ["portfolio-health", "Portfolio health", "partner-portfolio-snapshots", "Operating, opening and prepared-deal status in one partner view.", ""],
    ["member-growth", "Member growth", "member-growth-metrics", "Member growth, churn, pause and risk indicators sourced from the member database.", ""],
    ["payment-quality", "Payment quality", "payment-quality-metrics", "Failed payments, refunds, chargebacks and recovery exposure for partner review.", ""],
    ["operations-recovery", "Operations recovery", "operations-recovery-metrics", "Local operating exceptions that affect partner performance.", ""],
    ["support-experience", "Support experience", "support-experience-metrics", "Support and communication preflight exceptions that affect member trust.", ""],
    ["review-actions", "Review actions", "partner-review-actions", "Partner-safe next reviews with guarded command history.", ""],
  ] as const;

  return definitions
    .map(([key, label, family, context, searchTerm]) => ({
      key,
      label,
      value: String(countFamily(records, family)),
      context,
      status: decisionStatus(records, family),
      filterFamily: family,
      searchTerm,
    }))
    .filter((card) => Number(card.value) > 0);
}

function countOptions(records: FranchisePartnerPerformanceRecord[], getter: (record: FranchisePartnerPerformanceRecord) => string) {
  return [...new Set(records.map(getter).filter(Boolean))]
    .sort()
    .map((key) => ({ key, label: titleCase(key), rows: records.filter((record) => getter(record) === key).length }));
}

function commandHistory(rows: CommandRow[]): FranchisePartnerPerformanceReadModel["history"] {
  return rows.map((row) => ({
    commandId: row.command_id,
    label: text(row.input_payload?.title, row.command_id),
    actorRole: row.actor_role,
    status: row.command_status,
    targetApplyStatus: row.target_apply_status,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function getFranchisePartnerPerformanceReadModel(role: RoleKey): Promise<FranchisePartnerPerformanceReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured || !access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");

  const [sourceResult, memberResult, financeResult, operationsResult, historyResult] = await Promise.all([
    getCorePgPool().query<SourceRow>(
      `
        select external_entity_type, external_entity_id, crays_entity_type, crays_entity_id, sync_status, last_synced_at, metadata
        from crays_core.external_record_maps
        where external_system = $1
          and metadata ->> 'seedBatch' = $2
        order by external_entity_type, external_entity_id
      `,
      [sourceSystem, seedBatch],
    ),
    getCorePgPool().query<{ records: string }>(
      `
        select count(*)::text as records
        from crays_core.external_record_maps
        where external_system = 'member-app'
      `,
    ),
    getCorePgPool().query<{ records: string }>(
      `
        select count(*)::text as records
        from crays_core.external_record_maps
        where external_system = 'erp-engine'
          and metadata ->> 'seedBatch' = 'crays-member-payment-recovery-20260712-v1'
      `,
    ),
    getCorePgPool().query<{ records: string }>(
      `
        select count(*)::text as records
        from crays_core.external_record_maps
        where external_system = 'operations-engine'
          and metadata ->> 'seedBatch' = 'crays-studio-operations-recovery-20260712-v1'
      `,
    ),
    getCorePgPool().query<CommandRow>(
      `
        select command_id, actor_role, command_status, target_apply_status, input_payload, created_at
        from crays_core.core_command_requests
        where module_key = 'sync'
          and command_key = 'sync.mapping.preview_refresh'
          and input_payload ->> 'conflictClass' = 'franchise-partner-performance-review'
        order by created_at desc
        limit 8
      `,
    ),
  ]);

  const allRecords = sourceResult.rows.map(mapRecord);
  const records = allRecords.filter((record) => visibleFor(record, access)).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || statusRank(a.status) - statusRank(b.status) || a.family.localeCompare(b.family) || a.label.localeCompare(b.label));
  const latest = records
    .map((record) => (record.lastSyncedAt ? new Date(record.lastSyncedAt).getTime() : 0))
    .filter((time) => time > 0)
    .sort((a, b) => b - a)[0];
  const freshnessMinutes = latest ? Math.max(0, Math.round((Date.now() - latest) / 60_000)) : null;
  const history = commandHistory(historyResult.rows);

  return {
    ...empty(role, access, "schema_ready"),
    summary: {
      records: records.length,
      sourceRecords: sourceResult.rowCount ?? sourceResult.rows.length,
      linkedMemberSourceRecords: Number(memberResult.rows[0]?.records ?? 0),
      linkedFinanceRecoveryRecords: Number(financeResult.rows[0]?.records ?? 0),
      linkedOperationsRecoveryRecords: Number(operationsResult.rows[0]?.records ?? 0),
      portfolioSnapshots: countFamily(records, "partner-portfolio-snapshots"),
      partnerMetrics: countFamily(records, "partner-performance-metrics"),
      memberGrowthMetrics: countFamily(records, "member-growth-metrics"),
      paymentQualityMetrics: countFamily(records, "payment-quality-metrics"),
      operationsRecoveryMetrics: countFamily(records, "operations-recovery-metrics"),
      supportExperienceMetrics: countFamily(records, "support-experience-metrics"),
      reviewActions: countFamily(records, "partner-review-actions"),
      blockedRows: records.filter((record) => record.status === "blocked").length,
      attentionRows: records.filter((record) => record.status === "attention").length,
      criticalRows: records.filter((record) => record.priority === "critical").length,
      commandDrafts: history.length,
      latestCommandId: history[0]?.commandId ?? null,
      freshnessMinutes,
    },
    decisionCards: buildDecisionCards(records),
    records,
    controls: {
      families: countOptions(records, (record) => record.family).map((option) => ({ ...option, label: familyLabel(option.key) })),
      statuses: countOptions(records, (record) => record.status),
      priorities: countOptions(records, (record) => record.priority),
      owners: countOptions(records, (record) => record.ownerRole),
      studios: countOptions(records, (record) => record.studioName),
      sourceBacked: true,
      roleScoped: true,
    },
    history,
    sourceHealth: {
      connectionId: "core_source_franchise_partner_performance",
      systemKey: sourceSystem,
      seedBatch,
      records: sourceResult.rowCount ?? sourceResult.rows.length,
      conflicts: sourceResult.rows.filter((row) => row.sync_status === "conflict").length,
    },
  };
}
