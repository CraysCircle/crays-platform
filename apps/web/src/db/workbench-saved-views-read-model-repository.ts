import { createHash } from "node:crypto";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import { moduleByKey, modulesForRole } from "@/lib/modules";
import type { RoleKey } from "@/lib/roles";
import type { WorkbenchModuleKey, WorkbenchSavedView, WorkbenchSavedViewsReadModel, WorkbenchViewType } from "@/lib/workbench-saved-views";

type JsonRecord = Record<string, unknown>;

type ViewDefinition = {
  key: string;
  label: string;
  type: WorkbenchViewType;
  status: string;
  density: "comfortable" | "compact" | "dense";
  sort: "priority" | "updated" | "owner";
  groupBy: string;
  columns: string[];
  sourceFamilies: string[];
  department: string;
};

type SourceFamilyRow = {
  external_entity_type: string;
  record_count: string;
  last_synced_at: Date | null;
};

type SavedViewRow = {
  view_key: string;
  view_label: string;
  view_type: WorkbenchViewType;
  role_key: RoleKey;
  owner_role: RoleKey;
  department_key: string;
  workspace_key: string;
  is_default: boolean;
  filters: JsonRecord;
  display: JsonRecord;
  source_semantics: JsonRecord;
};

const modules: WorkbenchModuleKey[] = ["crm", "project", "erp", "files", "analytics", "loans", "operations"];

function hash(value: unknown, length = 24) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, length);
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function ownerRoleFor(role: RoleKey, moduleKey: WorkbenchModuleKey): RoleKey {
  if (role === "admin" || role === "crays-management" || role === "reviewer") return role;
  if (moduleKey === "erp" || moduleKey === "loans" || role === "finance") return "finance";
  if (moduleKey === "operations" || role === "studio-manager") return "studio-manager";
  if (moduleKey === "crm") return role === "expansion-manager" ? "expansion-manager" : "deal-manager";
  if (moduleKey === "project") return "deal-manager";
  if (moduleKey === "files") return "reviewer";
  return "crays-management";
}

function sourceSystems(moduleKey: WorkbenchModuleKey) {
  if (moduleKey === "operations") return ["member-app", "member-app-engine", "operations", "operations-engine"];
  return [moduleKey, `${moduleKey}-engine`];
}

function title(value: WorkbenchModuleKey) {
  if (value === "crm") return "CRM";
  if (value === "erp") return "ERP";
  return value[0].toUpperCase() + value.slice(1);
}

function definitionsFor(moduleKey: WorkbenchModuleKey, role: RoleKey): ViewDefinition[] {
  const base: Record<WorkbenchModuleKey, ViewDefinition[]> = {
    crm: [
      {
        key: "relationship-work",
        label: "Relationship work",
        type: "table",
        status: "open",
        density: "comfortable",
        sort: "updated",
        groupBy: "owner",
        columns: ["name", "stage", "owner", "nextAction", "lastActivity"],
        sourceFamilies: ["companies", "people", "leads", "opportunities", "tasks"],
        department: "Franchise Sales",
      },
      {
        key: "pipeline-review",
        label: "Pipeline review",
        type: "board",
        status: "review",
        density: "compact",
        sort: "priority",
        groupBy: "stage",
        columns: ["opportunity", "candidate", "stage", "bankReadiness", "nextAction"],
        sourceFamilies: ["opportunities", "activities", "calendar-events"],
        department: "Deal Team",
      },
    ],
    project: [
      {
        key: "opening-execution",
        label: "Opening execution",
        type: "board",
        status: "open",
        density: "comfortable",
        sort: "priority",
        groupBy: "state",
        columns: ["workItem", "owner", "priority", "dueDate", "dependency"],
        sourceFamilies: ["projects", "work-items", "cycles", "modules"],
        department: "Operations",
      },
      {
        key: "handoff-timeline",
        label: "Handoff timeline",
        type: "timeline",
        status: "review",
        density: "compact",
        sort: "updated",
        groupBy: "dueDate",
        columns: ["milestone", "owner", "blockedBy", "dueDate", "nextAction"],
        sourceFamilies: ["projects", "work-items", "pages"],
        department: "Operations",
      },
    ],
    erp: [
      {
        key: "finance-review",
        label: "Finance review",
        type: "table",
        status: "review",
        density: "compact",
        sort: "priority",
        groupBy: "costCenter",
        columns: ["record", "amount", "status", "owner", "nextAction"],
        sourceFamilies: ["invoices", "budgets", "accounts", "cost-centers"],
        department: "Finance",
      },
      {
        key: "procurement-operations",
        label: "Procurement operations",
        type: "table",
        status: "open",
        density: "comfortable",
        sort: "updated",
        groupBy: "supplier",
        columns: ["supplier", "item", "order", "status", "dueDate"],
        sourceFamilies: ["suppliers", "items", "purchase-orders", "material-requests"],
        department: "Procurement",
      },
      {
        key: "facilities-and-staff",
        label: "Facilities and staff",
        type: "board",
        status: "exception",
        density: "compact",
        sort: "priority",
        groupBy: "recordFamily",
        columns: ["record", "owner", "risk", "status", "nextAction"],
        sourceFamilies: ["employees", "assets", "maintenance", "issues", "quality-inspections"],
        department: "Operations",
      },
    ],
    files: [
      {
        key: "package-assembly",
        label: "Package assembly",
        type: "matrix",
        status: "review",
        density: "compact",
        sort: "priority",
        groupBy: "recipient",
        columns: ["package", "document", "version", "grant", "redaction"],
        sourceFamilies: ["packages", "metadata", "versions", "approvals"],
        department: "Legal/Compliance/Privacy",
      },
      {
        key: "release-preflight",
        label: "Release preflight",
        type: "table",
        status: "blocked",
        density: "compact",
        sort: "updated",
        groupBy: "audience",
        columns: ["recipient", "included", "hidden", "redaction", "review"],
        sourceFamilies: ["packages", "approvals"],
        department: "Legal/Compliance/Privacy",
      },
    ],
    analytics: [
      {
        key: "portfolio-exceptions",
        label: "Portfolio exceptions",
        type: "dashboard",
        status: "exception",
        density: "compact",
        sort: "priority",
        groupBy: "department",
        columns: ["metric", "studio", "delta", "owner", "drilldown"],
        sourceFamilies: ["kpis", "reports", "alerts"],
        department: "Management",
      },
      {
        key: "source-backed-scorecards",
        label: "Source-backed scorecards",
        type: "dashboard",
        status: "all",
        density: "comfortable",
        sort: "updated",
        groupBy: "role",
        columns: ["metric", "source", "freshness", "confidence", "nextAction"],
        sourceFamilies: ["kpis", "reports"],
        department: "Management",
      },
    ],
    loans: [
      {
        key: "bank-package-readiness",
        label: "Bank package readiness",
        type: "table",
        status: "review",
        density: "compact",
        sort: "priority",
        groupBy: "condition",
        columns: ["case", "condition", "evidence", "owner", "nextAction"],
        sourceFamilies: ["packages", "loan-cases", "conditions"],
        department: "Banking/Funding",
      },
      {
        key: "conditions-monitoring",
        label: "Conditions monitoring",
        type: "timeline",
        status: "open",
        density: "comfortable",
        sort: "updated",
        groupBy: "dueDate",
        columns: ["condition", "status", "evidence", "deadline", "review"],
        sourceFamilies: ["loan-cases", "conditions"],
        department: "Banking/Funding",
      },
    ],
    operations: [
      {
        key: "studio-today",
        label: "Studio today",
        type: "dashboard",
        status: "today",
        density: "comfortable",
        sort: "priority",
        groupBy: "workstream",
        columns: ["record", "status", "risk", "owner", "nextAction"],
        sourceFamilies: ["studio", "member-profile", "course-booking", "trainer-schedule", "support-request"],
        department: "Studio Operations",
      },
      {
        key: "member-exceptions",
        label: "Member exceptions",
        type: "table",
        status: "exception",
        density: "compact",
        sort: "priority",
        groupBy: "risk",
        columns: ["member", "payment", "booking", "support", "nextAction"],
        sourceFamilies: ["member-profile", "course-booking", "support-request"],
        department: "Studio Operations",
      },
      {
        key: "support-and-capacity",
        label: "Support and capacity",
        type: "board",
        status: "review",
        density: "compact",
        sort: "updated",
        groupBy: "owner",
        columns: ["request", "priority", "trainer", "status", "nextAction"],
        sourceFamilies: ["trainer-schedule", "support-request"],
        department: "Studio Operations",
      },
    ],
  };

  const roleSpecific: ViewDefinition[] = [];
  if (role === "reviewer" || role === "admin") {
    roleSpecific.push({
      key: "approval-queue",
      label: "Approval queue",
      type: "table",
      status: "review",
      density: "compact",
      sort: "updated",
      groupBy: "department",
      columns: ["record", "owner", "preflight", "rollback", "audit"],
      sourceFamilies: [],
      department: "Review",
    });
  }
  if (role === "crays-management") {
    roleSpecific.push({
      key: "portfolio-risk",
      label: "Portfolio risk",
      type: "dashboard",
      status: "risk",
      density: "compact",
      sort: "priority",
      groupBy: "department",
      columns: ["signal", "studio", "delta", "owner", "drilldown"],
      sourceFamilies: [],
      department: "Management",
    });
  }

  return [
    {
      key: `${moduleKey}-all`,
      label: `All ${title(moduleKey)} records`,
      type: "table",
      status: "all",
      density: "comfortable",
      sort: "updated",
      groupBy: "recordFamily",
      columns: ["record", "status", "owner", "updatedAt", "nextAction"],
      sourceFamilies: [],
      department: base[moduleKey][0]?.department ?? "Operations",
    },
    ...roleSpecific,
    ...base[moduleKey],
  ];
}

function emptyReadModel(role: RoleKey, moduleKey: WorkbenchModuleKey, allowed: boolean, status: WorkbenchSavedViewsReadModel["source"]["queryStatus"]): WorkbenchSavedViewsReadModel {
  return {
    access: {
      allowed,
      role,
      moduleKey,
      level: allowed ? "role_workbench" : "forbidden",
    },
    views: [],
    activeDefaultViewKey: null,
    source: {
      persistedInCore: false,
      queryStatus: status,
      sourceRecordCount: 0,
      commandDraftCount: 0,
      sourceFamilies: [],
    },
    boundaries: {
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      toolApplyEnabled: false,
      externalSendingEnabled: false,
      releaseEnabled: false,
    },
  };
}

async function ensureDefaults(role: RoleKey, moduleKey: WorkbenchModuleKey) {
  const pool = getCorePgPool();
  const defs = definitionsFor(moduleKey, role);
  for (const [index, def] of defs.entries()) {
    const viewId = `wbv_${hash([moduleKey, role, def.key], 28)}`;
    await pool.query(
      `
        insert into crays_core.workbench_saved_views (
          view_id, module_key, role_key, view_key, view_label, view_type,
          owner_role, department_key, workspace_key, is_default,
          filters, display, source_semantics, status, updated_at
        )
        values (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11::jsonb, $12::jsonb, $13::jsonb, 'active', now()
        )
        on conflict (module_key, role_key, view_key) do update set
          view_label = excluded.view_label,
          view_type = excluded.view_type,
          owner_role = excluded.owner_role,
          department_key = excluded.department_key,
          workspace_key = excluded.workspace_key,
          is_default = excluded.is_default,
          filters = excluded.filters,
          display = excluded.display,
          source_semantics = excluded.source_semantics,
          status = 'active',
          updated_at = now()
      `,
      [
        viewId,
        moduleKey,
        role,
        def.key,
        def.label,
        def.type,
        ownerRoleFor(role, moduleKey),
        def.department,
        `${moduleKey}:${role}`,
        index === 0,
        JSON.stringify({ search: "", status: def.status, sourceFamilies: def.sourceFamilies }),
        JSON.stringify({ density: def.density, sort: def.sort, groupBy: def.groupBy, columns: def.columns }),
        JSON.stringify({
          preserved: "source-native filtering and record semantics",
          craysAdds: "role, department, workspace and source-map orchestration",
          notDuplicated: "source engine view execution",
          sourceFamilies: def.sourceFamilies,
        }),
      ],
    );
  }
}

async function sourceFamilyCounts(moduleKey: WorkbenchModuleKey) {
  const systems = sourceSystems(moduleKey);
  const result = await getCorePgPool().query<SourceFamilyRow>(
    `
      select
        external_entity_type,
        count(*)::text as record_count,
        max(last_synced_at) as last_synced_at
      from crays_core.external_record_maps
      where external_system = any($1::text[])
         or metadata ->> 'moduleKey' = $2
      group by external_entity_type
      order by external_entity_type
    `,
    [systems, moduleKey],
  );
  return result.rows.map((row) => ({
    key: row.external_entity_type,
    count: Number(row.record_count),
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
  }));
}

async function commandDraftCount(moduleKey: WorkbenchModuleKey) {
  const result = await getCorePgPool().query<{ count: string }>(
    `
      select count(*)::text as count
      from crays_core.core_command_requests
      where module_key = $1
        and command_status in ('draft', 'validated', 'dry_run_ready', 'apply_blocked')
    `,
    [moduleKey],
  );
  return Number(result.rows[0]?.count ?? 0);
}

function viewFromRow(row: SavedViewRow, sourceCounts: Map<string, number>, commandCount: number): WorkbenchSavedView {
  const filters = row.filters ?? {};
  const display = row.display ?? {};
  const sourceSemantics = row.source_semantics ?? {};
  const families = stringList(filters.sourceFamilies).length ? stringList(filters.sourceFamilies) : stringList(sourceSemantics.sourceFamilies);
  const sourceRecordCount = families.length
    ? families.reduce((total, family) => total + (sourceCounts.get(family) ?? 0), 0)
    : Array.from(sourceCounts.values()).reduce((total, value) => total + value, 0);

  return {
    key: row.view_key,
    label: row.view_label,
    type: row.view_type,
    role: row.role_key,
    ownerRole: row.owner_role,
    department: row.department_key,
    workspace: row.workspace_key,
    isDefault: toBoolean(row.is_default),
    search: toText(filters.search),
    status: toText(filters.status, "all"),
    density: toText(display.density, "comfortable") as WorkbenchSavedView["density"],
    sort: toText(display.sort, "updated") as WorkbenchSavedView["sort"],
    groupBy: toText(display.groupBy, "recordFamily"),
    columns: stringList(display.columns),
    sourceFamilies: families,
    sourceRecordCount,
    commandDraftCount: commandCount,
  };
}

export async function getWorkbenchSavedViewsReadModel(input: { role: RoleKey; moduleKey: WorkbenchModuleKey }): Promise<WorkbenchSavedViewsReadModel> {
  if (!modules.includes(input.moduleKey)) return emptyReadModel(input.role, input.moduleKey, false, "forbidden");
  const allowed = Boolean(moduleByKey(input.moduleKey)) && modulesForRole(input.role).some((module) => module.key === input.moduleKey);
  if (!allowed) return emptyReadModel(input.role, input.moduleKey, false, "forbidden");

  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured) return emptyReadModel(input.role, input.moduleKey, true, "not_configured");

  try {
    await ensureDefaults(input.role, input.moduleKey);
    const [viewsResult, families, commandCount] = await Promise.all([
      getCorePgPool().query<SavedViewRow>(
        `
          select
            view_key, view_label, view_type, role_key, owner_role, department_key,
            workspace_key, is_default, filters, display, source_semantics
          from crays_core.workbench_saved_views
          where module_key = $1
            and role_key = $2
            and status = 'active'
          order by is_default desc, view_label asc
        `,
        [input.moduleKey, input.role],
      ),
      sourceFamilyCounts(input.moduleKey),
      commandDraftCount(input.moduleKey),
    ]);

    const sourceCounts = new Map(families.map((family) => [family.key, family.count]));
    const views = viewsResult.rows.map((row) => viewFromRow(row, sourceCounts, commandCount));

    return {
      access: {
        allowed: true,
        role: input.role,
        moduleKey: input.moduleKey,
        level: "role_workbench",
      },
      views,
      activeDefaultViewKey: views.find((view) => view.isDefault)?.key ?? views[0]?.key ?? null,
      source: {
        persistedInCore: true,
        queryStatus: "schema_ready",
        sourceRecordCount: families.reduce((total, family) => total + family.count, 0),
        commandDraftCount: commandCount,
        sourceFamilies: families,
      },
      boundaries: {
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        toolApplyEnabled: false,
        externalSendingEnabled: false,
        releaseEnabled: false,
      },
    };
  } catch (error) {
    if (error instanceof Error && /workbench_saved_views|does not exist|relation/i.test(error.message)) {
      return emptyReadModel(input.role, input.moduleKey, true, "not_configured");
    }
    throw error;
  }
}
