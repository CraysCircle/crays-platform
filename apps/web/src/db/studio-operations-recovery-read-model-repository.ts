import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "operations_recovery_full" | "operations_recovery_owner" | "operations_recovery_finance" | "operations_recovery_review" | "forbidden";
type DecisionStatus = "ready" | "attention" | "blocked";
type CommandType = "member_recovery" | "booking_follow_up" | "trainer_capacity_review" | "support_escalation" | "training_plan_update" | "studio_day_close";

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

export type StudioOperationsRecoveryRecord = {
  id: string;
  family: string;
  label: string;
  craysEntityType: string;
  craysEntityId: string;
  memberId: string | null;
  memberName: string;
  ownerRole: string;
  status: string;
  priority: string;
  impactArea: string;
  dueTime: string | null;
  currentState: string;
  nextAction: string;
  commandType: CommandType;
  entityId: string | null;
  href: string;
  lastSyncedAt: string | null;
  fields: JsonRecord;
};

export type StudioOperationsRecoveryReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
    canStageOperationalDraft: boolean;
  };
  summary: {
    records: number;
    sourceRecords: number;
    linkedMemberSourceRecords: number;
    linkedFinanceRecoveryRecords: number;
    recoveryTasks: number;
    accessImpacts: number;
    classCapacityImpacts: number;
    supportHandoffs: number;
    trainerFollowUps: number;
    financeHandoffs: number;
    criticalTasks: number;
    conflicts: number;
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
  records: StudioOperationsRecoveryRecord[];
  controls: {
    families: Array<{ key: string; label: string; rows: number }>;
    statuses: Array<{ key: string; label: string; rows: number }>;
    priorities: Array<{ key: string; label: string; rows: number }>;
    impactAreas: Array<{ key: string; label: string; rows: number }>;
    sourceBacked: true;
    roleScoped: true;
  };
  actions: {
    stageOperationalDraftAllowed: boolean;
    commandRoute: "/api/crays/operations/studio-workbench/command-draft";
    confirmationHeader: "stage-studio-operations-command";
    action: "stage_action";
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
    connectionId: "core_source_operations_studio_recovery";
    systemKey: "operations-engine";
    seedBatch: "crays-studio-operations-recovery-20260712-v1";
    records: number;
    conflicts: number;
  };
  boundaries: {
    memberAppApiWritesEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
    paymentInitiationEnabled: false;
    financePostingEnabled: false;
    externalSendingEnabled: false;
    uploadsEnabled: false;
    liveAiEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const seedBatch = "crays-studio-operations-recovery-20260712-v1";
const sourceSystem = "operations-engine";
const fullRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const ownerRoles: RoleKey[] = ["studio-manager", "franchise-partner"];
const financeRoles: RoleKey[] = ["finance"];
const reviewRoles: RoleKey[] = ["deal-manager"];
const commandRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "studio-manager", "franchise-partner", "finance"];
const financeFamilies = new Set(["studio-recovery-tasks", "access-impact-checks", "support-handoffs", "finance-handoffs"]);
const reviewFamilies = new Set(["studio-recovery-tasks", "class-capacity-impacts", "finance-handoffs"]);

function accessForRole(role: RoleKey): StudioOperationsRecoveryReadModel["access"] {
  if (fullRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "operations_recovery_full",
      reason: "Role can inspect the full studio recovery linkage across member, support, capacity and finance handoff records.",
      canStageOperationalDraft: commandRoles.includes(role),
    };
  }

  if (ownerRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "operations_recovery_owner",
      reason: "Role owns or consumes local studio recovery tasks and can stage safe operations drafts.",
      canStageOperationalDraft: commandRoles.includes(role),
    };
  }

  if (financeRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "operations_recovery_finance",
      reason: "Role can inspect the operational context needed before finance recovery review.",
      canStageOperationalDraft: commandRoles.includes(role),
    };
  }

  if (reviewRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "operations_recovery_review",
      reason: "Role can inspect cross-functional handoff state but cannot stage studio operations commands.",
      canStageOperationalDraft: false,
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Role is outside the internal studio recovery workflow.",
    canStageOperationalDraft: false,
  };
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
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
    "studio-recovery-tasks": "Studio recovery tasks",
    "access-impact-checks": "Access impact checks",
    "class-capacity-impacts": "Class capacity impacts",
    "support-handoffs": "Support handoffs",
    "trainer-follow-ups": "Trainer follow-ups",
    "finance-handoffs": "Finance handoffs",
  };
  return labels[family] ?? titleCase(family);
}

function hrefFor(family: string, role: RoleKey) {
  const encodedRole = encodeURIComponent(role);
  if (family === "finance-handoffs") return `/erp?role=${encodedRole}&view=payment-recovery`;
  if (family === "support-handoffs") return `/support?role=${encodedRole}&view=member-recovery`;
  if (family === "class-capacity-impacts") return `/operations?role=${encodedRole}&view=members&record=course-bookings`;
  if (family === "trainer-follow-ups") return `/operations?role=${encodedRole}&view=members&record=training-plans`;
  if (family === "access-impact-checks") return `/operations?role=${encodedRole}&view=members&record=check-ins`;
  return `/operations?role=${encodedRole}&view=members`;
}

function statusRank(status: string) {
  if (["evidence_required", "manual_review", "contact_ready"].includes(status)) return 0;
  if (["support_owner_needed", "refund_context_needed", "member_update_needed", "finance_review_ready", "refund_policy_review", "capacity_review", "waitlist_review", "pause_review"].includes(status)) return 1;
  return 2;
}

function priorityRank(priority: string) {
  if (priority === "critical") return 0;
  if (priority === "high") return 1;
  if (priority === "medium") return 2;
  return 3;
}

function decisionStatus(records: StudioOperationsRecoveryRecord[], family: string): DecisionStatus {
  const familyRecords = records.filter((record) => record.family === family);
  if (familyRecords.some((record) => record.priority === "critical" || statusRank(record.status) === 0)) return "blocked";
  if (familyRecords.some((record) => record.priority === "high" || statusRank(record.status) === 1)) return "attention";
  return "ready";
}

function mapRecord(row: SourceRow, role: RoleKey): StudioOperationsRecoveryRecord {
  const sourceRow = rowFromMetadata(row.metadata);
  const fields = fieldsFromMetadata(row.metadata);
  const family = row.external_entity_type;
  return {
    id: `${family}:${row.external_entity_id}`,
    family,
    label: text(sourceRow.label, text(row.metadata?.label, row.external_entity_id)),
    craysEntityType: row.crays_entity_type,
    craysEntityId: row.crays_entity_id,
    memberId: text(fields.memberId, "") || null,
    memberName: text(fields.memberName, text(fields.trainerName, "Studio record")),
    ownerRole: text(fields.ownerRole, text(sourceRow.owner, "Studio Manager")),
    status: text(fields.workflowStatus, text(sourceRow.status, row.sync_status)),
    priority: text(fields.priority, text(sourceRow.priority, row.sync_status === "conflict" ? "high" : "medium")),
    impactArea: text(fields.impactArea, familyLabel(family)),
    dueTime: text(fields.dueTime, text(sourceRow.dueDate, "")) || null,
    currentState: text(fields.currentState, "Current state is not recorded."),
    nextAction: text(fields.nextAction, "Review operations recovery record."),
    commandType: text(fields.commandType, "member_recovery") as CommandType,
    entityId: text(fields.entityId, text(fields.memberId, "")) || null,
    href: hrefFor(family, role),
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
    fields,
  };
}

function visibleFor(record: StudioOperationsRecoveryRecord, access: StudioOperationsRecoveryReadModel["access"]) {
  if (!access.allowed) return false;
  if (access.level === "operations_recovery_full" || access.level === "operations_recovery_owner") return true;
  if (access.level === "operations_recovery_finance") return financeFamilies.has(record.family);
  if (access.level === "operations_recovery_review") return reviewFamilies.has(record.family);
  return false;
}

function empty(role: RoleKey, access: StudioOperationsRecoveryReadModel["access"], queryStatus: StudioOperationsRecoveryReadModel["queryStatus"]): StudioOperationsRecoveryReadModel {
  return {
    access,
    summary: {
      records: 0,
      sourceRecords: 0,
      linkedMemberSourceRecords: 0,
      linkedFinanceRecoveryRecords: 0,
      recoveryTasks: 0,
      accessImpacts: 0,
      classCapacityImpacts: 0,
      supportHandoffs: 0,
      trainerFollowUps: 0,
      financeHandoffs: 0,
      criticalTasks: 0,
      conflicts: 0,
      commandDrafts: 0,
      latestCommandId: null,
      freshnessMinutes: null,
    },
    decisionCards: [],
    records: [],
    controls: { families: [], statuses: [], priorities: [], impactAreas: [], sourceBacked: true, roleScoped: true },
    actions: {
      stageOperationalDraftAllowed: access.canStageOperationalDraft,
      commandRoute: "/api/crays/operations/studio-workbench/command-draft",
      confirmationHeader: "stage-studio-operations-command",
      action: "stage_action",
    },
    history: [],
    sourceHealth: {
      connectionId: "core_source_operations_studio_recovery",
      systemKey: sourceSystem,
      seedBatch,
      records: 0,
      conflicts: 0,
    },
    boundaries: {
      memberAppApiWritesEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      externalSendingEnabled: false,
      uploadsEnabled: false,
      liveAiEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    queryStatus,
  };
}

function countFamily(records: StudioOperationsRecoveryRecord[], family: string) {
  return records.filter((record) => record.family === family).length;
}

function buildDecisionCards(records: StudioOperationsRecoveryRecord[]): StudioOperationsRecoveryReadModel["decisionCards"] {
  const definitions = [
    ["today-recovery", "Today recovery queue", "studio-recovery-tasks", "Members whose payment, support or entitlement state affects studio work today.", ""],
    ["access-impact", "Access impact", "access-impact-checks", "Member access and entitlement checks tied to recovery state.", ""],
    ["class-capacity", "Class capacity", "class-capacity-impacts", "Bookings, late cancellations and class-credit checks tied to member recovery.", ""],
    ["support-handoff", "Support handoff", "support-handoffs", "Support cases that must be coordinated with Studio Manager and Finance.", ""],
    ["trainer-capacity", "Trainer capacity", "trainer-follow-ups", "Trainer-load actions linked to member care and capacity decisions.", ""],
    ["finance-handoff", "Finance handoff", "finance-handoffs", "Operations facts prepared for Finance review without payment or posting.", ""],
  ] as const;

  return definitions
    .map(([key, label, family, context, searchTerm]) => {
      const rows = countFamily(records, family);
      return {
        key,
        label,
        value: String(rows),
        context,
        status: decisionStatus(records, family),
        filterFamily: family,
        searchTerm,
      };
    })
    .filter((card) => Number(card.value) > 0);
}

function commandHistory(rows: CommandRow[]): StudioOperationsRecoveryReadModel["history"] {
  return rows.map((row) => ({
    commandId: row.command_id,
    label: text(row.input_payload?.title, row.command_id),
    actorRole: row.actor_role,
    status: row.command_status,
    targetApplyStatus: row.target_apply_status,
    createdAt: row.created_at.toISOString(),
  }));
}

function countOptions(records: StudioOperationsRecoveryRecord[], getter: (record: StudioOperationsRecoveryRecord) => string) {
  return [...new Set(records.map(getter).filter(Boolean))]
    .sort()
    .map((key) => ({ key, label: titleCase(key), rows: records.filter((record) => getter(record) === key).length }));
}

export async function getStudioOperationsRecoveryReadModel(role: RoleKey): Promise<StudioOperationsRecoveryReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured || !access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");

  const [sourceResult, memberResult, financeResult, historyResult] = await Promise.all([
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
    getCorePgPool().query<CommandRow>(
      `
        select command_id, actor_role, command_status, target_apply_status, input_payload, created_at
        from crays_core.core_command_requests
        where module_key = 'operations'
          and command_key = 'operations.studio_action.stage'
        order by created_at desc
        limit 8
      `,
    ),
  ]);

  const allRecords = sourceResult.rows.map((row) => mapRecord(row, role));
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
      recoveryTasks: countFamily(records, "studio-recovery-tasks"),
      accessImpacts: countFamily(records, "access-impact-checks"),
      classCapacityImpacts: countFamily(records, "class-capacity-impacts"),
      supportHandoffs: countFamily(records, "support-handoffs"),
      trainerFollowUps: countFamily(records, "trainer-follow-ups"),
      financeHandoffs: countFamily(records, "finance-handoffs"),
      criticalTasks: records.filter((record) => record.priority === "critical").length,
      conflicts: records.filter((record) => record.priority === "critical" || statusRank(record.status) === 0).length,
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
      impactAreas: countOptions(records, (record) => record.impactArea),
      sourceBacked: true,
      roleScoped: true,
    },
    history,
    sourceHealth: {
      connectionId: "core_source_operations_studio_recovery",
      systemKey: sourceSystem,
      seedBatch,
      records: sourceResult.rowCount ?? sourceResult.rows.length,
      conflicts: sourceResult.rows.filter((row) => row.sync_status === "conflict").length,
    },
  };
}
