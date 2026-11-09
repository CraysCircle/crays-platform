import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;

export type ManagementGateReviewItem = {
  commandId: string;
  commandKey: string;
  moduleKey: string;
  moduleLabel: string;
  departmentOwner: string;
  owner: string;
  label: string;
  actorRole: string;
  targetObject: string;
  commandStatus: string;
  validationStatus: string;
  dryRunStatus: string;
  targetApplyStatus: string;
  applyGate: string;
  applyGateLabel: string;
  applyGateStatus: string;
  ageMinutes: number;
  queueState: string;
  nextReviewAction: string;
  preflight: {
    validation: string;
    dryRun: string;
    apply: string;
    summary: string;
  };
  evidence: {
    preparedOfferId: string | null;
    dealId: string | null;
    propertyCaseId: string | null;
  };
  rollback: {
    policy: string;
    availableBeforeApply: boolean;
  };
  history: {
    eventCount: number;
    latestEvent: string;
    previewCount: number;
    latestPreview: string;
    gateReviewCount: number;
    latestGateReview: string;
  };
  gateReview: {
    status: string;
    message: string;
  };
  createdAt: string;
};

export type ManagementGateReviewReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: "gate_review" | "forbidden";
  };
  summary: {
    total: number;
    returned: number;
    departments: number;
    modules: number;
    needsReview: number;
    applyBlocked: number;
    oldestAgeMinutes: number;
  };
  queue: ManagementGateReviewItem[];
  departmentBreakdown: Array<{ department: string; count: number }>;
  moduleBreakdown: Array<{ module: string; count: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
  targetApplyEnabled: false;
  releaseEnabled: false;
  sourceWritesEnabled: false;
  syncApplyEnabled: false;
  externalSendingEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

const privilegedGateReviewRoles: RoleKey[] = ["reviewer", "admin", "crays-management"];
const gateReviewRoles: RoleKey[] = [
  ...privilegedGateReviewRoles,
  "deal-manager",
  "expansion-manager",
  "finance",
  "hr",
  "franchise-partner",
  "studio-manager",
];

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function jsonObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function departmentForModule(moduleKey: string) {
  if (moduleKey === "erp") return "Finance";
  if (moduleKey === "loans") return "Banking/Funding";
  if (moduleKey === "files") return "Legal/Compliance/Privacy";
  if (moduleKey === "project") return "Operations";
  if (moduleKey === "crm") return "Franchise Sales";
  if (moduleKey === "sync") return "IT/Product/Data Governance";
  if (moduleKey === "operations") return "Studio Operations";
  return "Management";
}

function moduleLabel(moduleKey: string) {
  if (moduleKey === "crm") return "CRM";
  if (moduleKey === "project") return "Project";
  if (moduleKey === "erp") return "ERP";
  if (moduleKey === "loans") return "Loans";
  if (moduleKey === "files") return "Files";
  if (moduleKey === "operations") return "Operations";
  if (moduleKey === "sync") return "Sync";
  return moduleKey.replaceAll("_", " ");
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function labelFromPayload(commandKey: string, payload: JsonRecord) {
  return text(payload.title) ?? text(payload.subject) ?? commandKey.replaceAll(".", " ");
}

function displayId(value: string | null) {
  if (!value) return null;
  if (value.startsWith("bench_crays_benchmark_")) return null;
  return titleCase(value);
}

function targetObject(entityType: string, entityId: string | null, entityScope: JsonRecord, payload: JsonRecord) {
  const payloadLabel = text(payload.targetLabel) ?? text(payload.objectLabel) ?? text(payload.recordLabel);
  if (payloadLabel) return payloadLabel;

  const scopedId = text(entityScope.preparedOfferId) ?? text(entityScope.dealId) ?? text(entityScope.propertyCaseId);
  const visibleId = displayId(entityId) ?? displayId(scopedId);
  const label = titleCase(entityType);
  return visibleId ? `${label} · ${visibleId}` : label;
}

function queueState(row: { validation_status: string; dry_run_status: string; apply_gate_status: string; target_apply_status: string; command_status: string }) {
  if (row.validation_status === "invalid") return "Needs correction";
  if (row.validation_status === "needs_review") return "Needs review";
  if (row.dry_run_status === "failed") return "Preflight failed";
  if (row.apply_gate_status === "requested") return "Apply requested";
  if (row.target_apply_status === "blocked" || row.command_status === "apply_blocked") return "Apply blocked";
  if (row.command_status === "draft") return "Draft";
  return "Ready for review";
}

function reviewMessage(state: string, applyGate: string) {
  if (state === "Needs correction") return "Fix validation issues before any review can continue.";
  if (state === "Preflight failed") return "Review the failed preflight and update the draft.";
  const gateLabel = applyGateLabel(applyGate);
  if (state === "Apply requested") return `Review request for ${gateLabel}; approval remains closed in this prototype.`;
  if (state === "Apply blocked") return `Target apply is blocked by the ${gateLabel}.`;
  return "Review the draft, evidence and rollback plan before any future apply workflow.";
}

function applyGateLabel(applyGate: string) {
  const known: Record<string, string> = {
    OPEN_DEV_PROJECT_WORK_ITEM_APPLY: "Project work item apply gate",
    OPEN_DEV_CRM_ACTIVITY_APPLY: "CRM activity apply gate",
    OPEN_DEV_FILES_PACKAGE_APPLY: "Files package apply gate",
    OPEN_DEV_ERP_FINANCE_APPLY: "ERP finance apply gate",
    OPEN_DEV_LOANS_CHECKLIST_APPLY: "Loans checklist apply gate",
    OPEN_DEV_SYNC_APPLY: "Sync apply gate",
    OPEN_DEV_OPERATIONS_ACTION_APPLY: "Operations action apply gate",
  };
  return known[applyGate] ?? titleCase(applyGate.replace(/^OPEN_DEV_/, ""));
}

function eventLabel(event: string) {
  const known: Record<string, string> = {
    "command.drafted": "Command drafted",
    "command.validated": "Command validated",
    "command.validation_failed": "Validation failed",
    "command.dry_run_ready": "Dry run ready",
    "command.dry_run_failed": "Dry run failed",
    "command.apply_blocked": "Apply blocked",
    "command.superseded": "Command superseded",
    "command.cancelled": "Command cancelled",
    "gate.requested": "Gate requested",
    "gate.revoked": "Gate revoked",
  };
  return known[event] ?? titleCase(event);
}

function policyLabel(policy: string) {
  const withoutPrefix = policy.replace(/^supersede_or_cancel_before_/, "Supersede or cancel before ");
  return `${withoutPrefix.replaceAll("_", " ")}.`;
}

function emptyReadModel(role: RoleKey, queryStatus: ManagementGateReviewReadModel["queryStatus"]): ManagementGateReviewReadModel {
  const allowed = gateReviewRoles.includes(role);
  return {
    access: {
      role,
      allowed,
      level: allowed ? "gate_review" : "forbidden",
    },
    summary: {
      total: 0,
      returned: 0,
      departments: 0,
      modules: 0,
      needsReview: 0,
      applyBlocked: 0,
      oldestAgeMinutes: 0,
    },
    queue: [],
    departmentBreakdown: [],
    moduleBreakdown: [],
    statusBreakdown: [],
    queryStatus,
    targetApplyEnabled: false,
    releaseEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    externalSendingEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

export async function getManagementGateReviewReadModel(role: RoleKey): Promise<ManagementGateReviewReadModel> {
  if (!gateReviewRoles.includes(role)) return emptyReadModel(role, "forbidden");
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured) return emptyReadModel(role, "not_configured");
  const canSeeFullQueue = privilegedGateReviewRoles.includes(role);

  const result = await getCorePgPool().query<{
    command_id: string;
    command_key: string;
    module_key: string;
    actor_role: string;
    entity_type: string;
    entity_id: string | null;
    entity_scope: JsonRecord;
    command_status: string;
    validation_status: string;
    dry_run_status: string;
    target_apply_status: string;
    apply_gate: string;
    apply_gate_status: string;
    input_payload: JsonRecord;
    rollback_summary: JsonRecord;
    audit_summary: JsonRecord;
    event_count: string;
    latest_event_type: string | null;
    preview_count: string;
    latest_preview_status: string | null;
    gate_review_count: string;
    latest_gate_review_status: string | null;
    created_at: Date;
    age_minutes: string;
    total_count: string;
  }>(
    `
      select
        command_id,
        command_key,
        module_key,
        actor_role,
        entity_type,
        entity_id,
        entity_scope,
        command_status,
        validation_status,
        dry_run_status,
        target_apply_status,
        apply_gate,
        apply_gate_status,
        input_payload,
        rollback_summary,
        audit_summary,
        coalesce(events.event_count, 0)::text as event_count,
        events.latest_event_type,
        coalesce(previews.preview_count, 0)::text as preview_count,
        previews.latest_preview_status,
        coalesce(gates.gate_review_count, 0)::text as gate_review_count,
        gates.latest_gate_review_status,
        created_at,
        floor(extract(epoch from (now() - created_at)) / 60)::text as age_minutes,
        count(*) over()::text as total_count
      from crays_core.core_command_requests
      left join lateral (
        select
          count(*)::int as event_count,
          (array_agg(event_type order by occurred_at desc, id desc))[1] as latest_event_type
        from crays_core.core_command_events
        where command_id = core_command_requests.command_id
      ) events on true
      left join lateral (
        select
          count(*)::int as preview_count,
          (array_agg(preview_status order by created_at desc, id desc))[1] as latest_preview_status
        from crays_core.core_command_previews
        where command_id = core_command_requests.command_id
      ) previews on true
      left join lateral (
        select
          count(*)::int as gate_review_count,
          (array_agg(gate_status order by created_at desc, id desc))[1] as latest_gate_review_status
        from crays_core.core_command_apply_gate_reviews
        where command_id = core_command_requests.command_id
      ) gates on true
      where command_status in ('draft', 'validated', 'dry_run_ready', 'dry_run_failed', 'apply_blocked')
        and ($1::boolean = true or actor_role = $2::text)
      order by created_at desc, id desc
      limit 60
    `,
    [canSeeFullQueue, role],
  );

  const queue = result.rows.map((row) => {
    const entityScope = jsonObject(row.entity_scope);
    const payload = jsonObject(row.input_payload);
    const rollback = jsonObject(row.rollback_summary);
    const audit = jsonObject(row.audit_summary);
    const departmentOwner = departmentForModule(row.module_key);
    const applyGateStatus = row.apply_gate_status;
    const state = queueState(row);
    const event = text(row.latest_event_type) ?? text(audit.eventName) ?? "command.drafted";
    const rollbackPolicy = text(rollback.policy) ?? "Supersede or cancel before target apply.";

    return {
      commandId: row.command_id,
      commandKey: row.command_key,
      moduleKey: row.module_key,
      moduleLabel: moduleLabel(row.module_key),
      departmentOwner,
      owner: `${titleCase(row.actor_role)} · ${departmentOwner}`,
      label: labelFromPayload(row.command_key, payload),
      actorRole: row.actor_role,
      targetObject: targetObject(row.entity_type, row.entity_id, entityScope, payload),
      commandStatus: row.command_status,
      validationStatus: row.validation_status,
      dryRunStatus: row.dry_run_status,
      targetApplyStatus: row.target_apply_status,
      applyGate: row.apply_gate,
      applyGateLabel: applyGateLabel(row.apply_gate),
      applyGateStatus,
      queueState: state,
      ageMinutes: Number(row.age_minutes ?? 0),
      nextReviewAction: state === "Apply requested" ? "Review apply request" : state === "Needs correction" ? "Return to owner" : "Review draft and evidence",
      preflight: {
        validation: row.validation_status,
        dryRun: row.dry_run_status,
        apply: row.target_apply_status,
        summary: `${titleCase(row.validation_status)} validation · ${titleCase(row.dry_run_status)} dry run · ${titleCase(row.target_apply_status)} apply`,
      },
      evidence: {
        preparedOfferId: text(entityScope.preparedOfferId),
        dealId: text(entityScope.dealId),
        propertyCaseId: text(entityScope.propertyCaseId),
      },
      rollback: {
        policy: policyLabel(rollbackPolicy),
        availableBeforeApply: true,
      },
      history: {
        eventCount: Number(row.event_count ?? 0),
        latestEvent: eventLabel(event),
        previewCount: Number(row.preview_count ?? 0),
        latestPreview: text(row.latest_preview_status) ? titleCase(text(row.latest_preview_status) as string) : "No preview",
        gateReviewCount: Number(row.gate_review_count ?? 0),
        latestGateReview: text(row.latest_gate_review_status) ? titleCase(text(row.latest_gate_review_status) as string) : "No gate review",
      },
      gateReview: {
        status: applyGateStatus,
        message: reviewMessage(state, row.apply_gate),
      },
      createdAt: row.created_at.toISOString(),
    };
  });
  const breakdown = new Map<string, number>();
  const moduleBreakdown = new Map<string, number>();
  const statusBreakdown = new Map<string, number>();
  for (const item of queue) breakdown.set(item.departmentOwner, (breakdown.get(item.departmentOwner) ?? 0) + 1);
  for (const item of queue) moduleBreakdown.set(item.moduleLabel, (moduleBreakdown.get(item.moduleLabel) ?? 0) + 1);
  for (const item of queue) statusBreakdown.set(item.queueState, (statusBreakdown.get(item.queueState) ?? 0) + 1);
  const oldestAgeMinutes = queue.reduce((oldest, item) => Math.max(oldest, item.ageMinutes), 0);

  return {
    access: {
      role,
      allowed: true,
      level: "gate_review",
    },
    summary: {
      total: Number(result.rows[0]?.total_count ?? 0),
      returned: queue.length,
      departments: breakdown.size,
      modules: moduleBreakdown.size,
      needsReview: queue.filter((item) => item.applyGateStatus === "requested" || item.validationStatus === "needs_review" || item.validationStatus === "invalid").length,
      applyBlocked: queue.filter((item) => item.targetApplyStatus === "blocked").length,
      oldestAgeMinutes,
    },
    queue,
    departmentBreakdown: Array.from(breakdown.entries()).map(([department, count]) => ({ department, count })),
    moduleBreakdown: Array.from(moduleBreakdown.entries()).map(([module, count]) => ({ module, count })),
    statusBreakdown: Array.from(statusBreakdown.entries()).map(([status, count]) => ({ status, count })),
    queryStatus: "schema_ready",
    targetApplyEnabled: false,
    releaseEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    externalSendingEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
