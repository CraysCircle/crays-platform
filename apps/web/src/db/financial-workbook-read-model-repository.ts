import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "full_financial_model" | "partner_financial_model" | "external_financial_model" | "release_blocked" | "forbidden";
type FinancialStatus = "ready" | "attention" | "blocked";

type FinancialSourceRow = {
  crays_entity_id: string;
  external_entity_type: string;
  external_entity_id: string;
  sync_status: string;
  last_synced_at: Date | null;
  metadata: JsonRecord | null;
};

type FinancialWorkbookRecordWithRaw = FinancialWorkbookRecord & { rawFields: JsonRecord };

export type FinancialWorkbookRecord = {
  id: string;
  label: string;
  family: string;
  scenario: string;
  status: string;
  owner: string;
  audience: string;
  category: string;
  metricKey: string | null;
  value: string | number | boolean | null;
  unit: string | null;
  sourceSheet: string | null;
  sourceRef: string | null;
  nextAction: string;
  href: string;
  lastSyncedAt: string | null;
};

export type FinancialWorkbookReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
  };
  caseContext: {
    title: string;
    journey: string;
    ownerRole: string;
    consumingRoles: string[];
  };
  summary: {
    records: number;
    families: number;
    scenarios: number;
    kpiRows: number;
    workbookRecords: number;
    blockedReleaseViews: number;
    midCaseMembersEndYear3: number | null;
    midCaseRevenueYear3: number | null;
    midCaseResultYear3: number | null;
    midCaseCashflowEndYear3: number | null;
    midCasePaybackYears: number | null;
    freshnessMinutes: number | null;
  };
  decisionCards: Array<{
    key: string;
    label: string;
    value: string;
    context: string;
    status: FinancialStatus;
    audience: string;
    drillFamily: string;
  }>;
  stakeholderViews: Array<{
    audience: string;
    label: string;
    visibleMetrics: string[];
    hiddenMetrics: string[];
    nextAction: string;
    status: string;
  }>;
  records: FinancialWorkbookRecord[];
  controls: {
    families: Array<{ key: string; label: string; rows: number }>;
    scenarios: Array<{ key: string; label: string; rows: number }>;
    searchEnabled: true;
    roleScoped: true;
    sourceBacked: true;
  };
  boundaries: {
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
    reportPublicationEnabled: false;
    externalSendingEnabled: false;
    candidateReleaseEnabled: false;
    bankSendEnabled: false;
    paymentInitiationEnabled: false;
    financePostingEnabled: false;
    liveAiEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const fullRoles: RoleKey[] = ["admin", "crays-management", "finance", "reviewer", "deal-manager"];
const partnerRoles: RoleKey[] = ["franchise-partner", "studio-manager"];
const externalRoles: RoleKey[] = ["bank-partner", "landlord", "investor", "expansion-manager"];
const releaseBlockedRoles: RoleKey[] = ["franchise-candidate", "guest"];

function accessForRole(role: RoleKey): FinancialWorkbookReadModel["access"] {
  if (fullRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "full_financial_model",
      reason: "Role can inspect workbook lineage, financial assumptions, KPI matrix, BWA scenario summaries and release-gated stakeholder views.",
    };
  }

  if (partnerRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "partner_financial_model",
      reason: "Role can inspect franchise/studio operating economics without internal lender workpapers or release controls.",
    };
  }

  if (externalRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "external_financial_model",
      reason: "Role receives scoped finance metrics relevant to credit, investment or lease decisions.",
    };
  }

  if (releaseBlockedRoles.includes(role)) {
    return {
      role,
      allowed: false,
      level: "release_blocked",
      reason: "This role needs a released stakeholder package before internal financial model records are visible.",
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Role is outside the financial model scope.",
  };
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function label(row: FinancialSourceRow) {
  return text(row.metadata?.label, row.external_entity_id);
}

function titleCase(value: string) {
  return value
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function familyLabel(family: string) {
  const labels: Record<string, string> = {
    "workbook-metadata": "Workbook metadata",
    "site-assumptions": "Site assumptions",
    "scenario-assumptions": "Scenario assumptions",
    "kpi-matrix": "KPI matrix",
    "bwa-scenario-summary": "BWA scenario summary",
    "stakeholder-finance-views": "Stakeholder finance views",
  };
  return labels[family] ?? titleCase(family);
}

function hrefForRecord(row: FinancialWorkbookRecord, role: RoleKey) {
  const roleParam = encodeURIComponent(role);
  if (row.family === "bwa-scenario-summary" || row.audience === "Bank Partner") return `/loans?role=${roleParam}&view=bank-package&record=financial-model`;
  if (row.audience === "Real Estate Partner") return `/files?role=${roleParam}&view=release-review&record=owner-financial-evidence`;
  if (row.family === "site-assumptions") return `/erp?role=finance&view=budget-review&record=financial-model`;
  return `/analytics?role=${roleParam}&view=financial-model&record=${encodeURIComponent(row.family)}`;
}

function mapRecord(row: FinancialSourceRow, role: RoleKey): FinancialWorkbookRecord {
  const fields = asRecord(row.metadata?.fields);
  const sourceCell = text(fields.sourceCell);
  const sourceRow = fields.sourceRow;
  const sourceColumn = text(fields.sourceColumn);
  const sourceRef = sourceCell || (sourceColumn && sourceRow ? `${sourceColumn}${sourceRow}` : null);
  const mapped = {
    id: `${row.external_entity_type}:${row.external_entity_id}`,
    label: label(row),
    family: row.external_entity_type,
    scenario: text(fields.scenario, "Shared"),
    status: text(row.metadata?.status, row.sync_status),
    owner: text(row.metadata?.owner, "Finance"),
    audience: text(fields.primaryAudience, text(fields.audience, "Finance")),
    category: text(fields.category, row.external_entity_type),
    metricKey: text(fields.metricKey) || text(fields.key) || null,
    value: (fields.value as string | number | boolean | null | undefined) ?? null,
    unit: text(fields.unit) || null,
    sourceSheet: text(fields.sourceSheet) || null,
    sourceRef,
    nextAction: text(fields.nextAction, "Review workbook source record."),
    href: "",
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
  };
  return { ...mapped, href: hrefForRecord(mapped, role) };
}

function isVisibleForAccess(row: FinancialWorkbookRecord, access: FinancialWorkbookReadModel["access"]) {
  if (!access.allowed) return false;
  if (access.level === "full_financial_model") return true;
  if (access.level === "partner_financial_model") {
    return ["Franchise Partner", "Studio Manager", "Finance"].includes(row.audience) || ["kpi-matrix", "scenario-assumptions", "stakeholder-finance-views"].includes(row.family);
  }
  if (access.role === "bank-partner") {
    return ["Bank Partner", "Finance"].includes(row.audience) || ["bwa-scenario-summary", "stakeholder-finance-views"].includes(row.family);
  }
  if (access.role === "landlord") {
    return ["Real Estate Partner"].includes(row.audience) || row.metricKey?.includes("rent") || row.category === "real-estate";
  }
  if (access.role === "investor" || access.role === "expansion-manager") {
    return ["Bank Partner", "Franchise Partner", "Real Estate Partner"].includes(row.audience) || row.family === "bwa-scenario-summary";
  }
  return false;
}

function metric(records: FinancialWorkbookRecord[], metricKey: string, scenario = "Mid-Case") {
  return numberValue(records.find((row) => row.metricKey === metricKey && row.scenario === scenario)?.value);
}

function valueLabel(value: number | null, unit: string) {
  if (value === null) return "not available";
  if (unit === "EUR") return `€${Math.round(value).toLocaleString("en-US")}`;
  if (unit === "percent") return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
  if (unit === "years") return `${value.toFixed(1)} years`;
  return Math.round(value).toLocaleString("en-US");
}

function buildDecisionCards(records: FinancialWorkbookRecord[]): FinancialWorkbookReadModel["decisionCards"] {
  const midMembers = metric(records, "active-members-end-y3");
  const midRevenue = metric(records, "net-revenue-year-3");
  const midResult = metric(records, "result-after-monthly-costs-y3");
  const midCashflow = metric(records, "cumulative-cashflow-end-y3");
  const midPayback = metric(records, "payback-years");
  const midRentRatio = metric(records, "rent-ratio-y3");

  return [
    {
      key: "franchise-economics",
      label: "Franchise partner economics",
      value: valueLabel(midPayback, "years"),
      context: `${valueLabel(midRevenue, "EUR")} net revenue year 3; ${valueLabel(midMembers, "members")} members end year 3.`,
      status: midPayback !== null && midPayback <= 1.5 ? "ready" : "attention",
      audience: "Franchise Partner",
      drillFamily: "kpi-matrix",
    },
    {
      key: "bank-credit",
      label: "Bank credit capacity",
      value: valueLabel(midCashflow, "EUR"),
      context: `${valueLabel(midResult, "EUR")} result after monthly costs year 3.`,
      status: midCashflow !== null && midCashflow > 250000 ? "ready" : "attention",
      audience: "Bank Partner",
      drillFamily: "bwa-scenario-summary",
    },
    {
      key: "real-estate-rent",
      label: "Real estate rent fit",
      value: valueLabel(midRentRatio, "percent"),
      context: "Year-3 rent ratio from workbook source model.",
      status: midRentRatio !== null && midRentRatio < 0.12 ? "ready" : "attention",
      audience: "Real Estate Partner",
      drillFamily: "site-assumptions",
    },
    {
      key: "release-preflight",
      label: "Stakeholder release preflight",
      value: `${records.filter((row) => row.family === "stakeholder-finance-views" && row.status === "release_blocked").length} blocked`,
      context: "Candidate and guest views stay closed until release review.",
      status: "blocked",
      audience: "Reviewer",
      drillFamily: "stakeholder-finance-views",
    },
  ];
}

function buildStakeholderViews(records: FinancialWorkbookRecordWithRaw[]): FinancialWorkbookReadModel["stakeholderViews"] {
  return records
    .filter((row) => row.family === "stakeholder-finance-views")
    .map((row) => {
      const fields = row.rawFields;
      return {
        audience: text(fields.audience, row.audience),
        label: row.label,
        visibleMetrics: Array.isArray(fields.visibleMetrics) ? fields.visibleMetrics.map(String) : [],
        hiddenMetrics: Array.isArray(fields.hiddenMetrics) ? fields.hiddenMetrics.map(String) : [],
        nextAction: text(fields.nextAction, row.nextAction),
        status: row.status,
      };
    });
}

function withRawFields(row: FinancialWorkbookRecord, source: FinancialSourceRow): FinancialWorkbookRecordWithRaw {
  return { ...row, rawFields: asRecord(source.metadata?.fields) };
}

function stripRawFields(row: FinancialWorkbookRecordWithRaw): FinancialWorkbookRecord {
  return {
    id: row.id,
    label: row.label,
    family: row.family,
    scenario: row.scenario,
    status: row.status,
    owner: row.owner,
    audience: row.audience,
    category: row.category,
    metricKey: row.metricKey,
    value: row.value,
    unit: row.unit,
    sourceSheet: row.sourceSheet,
    sourceRef: row.sourceRef,
    nextAction: row.nextAction,
    href: row.href,
    lastSyncedAt: row.lastSyncedAt,
  };
}

export async function getFinancialWorkbookReadModel(role: RoleKey): Promise<FinancialWorkbookReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();

  const base: Omit<FinancialWorkbookReadModel, "summary" | "decisionCards" | "stakeholderViews" | "records" | "controls"> = {
    access,
    caseContext: {
      title: "Financial model source workbook",
      journey: "Workbook source -> Core financial records -> role decision view -> package preflight",
      ownerRole: "Finance",
      consumingRoles: ["CRAYS Management", "Finance", "Franchise Partner", "Bank Partner", "Real Estate Partner", "Reviewer"],
    },
    boundaries: {
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      reportPublicationEnabled: false,
      externalSendingEnabled: false,
      candidateReleaseEnabled: false,
      bankSendEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      liveAiEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    queryStatus: runtime.configured ? (access.allowed ? "schema_ready" : "forbidden") : "not_configured",
  };

  if (!runtime.configured || !access.allowed) {
    return {
      ...base,
      summary: {
        records: 0,
        families: 0,
        scenarios: 0,
        kpiRows: 0,
        workbookRecords: 0,
        blockedReleaseViews: 0,
        midCaseMembersEndYear3: null,
        midCaseRevenueYear3: null,
        midCaseResultYear3: null,
        midCaseCashflowEndYear3: null,
        midCasePaybackYears: null,
        freshnessMinutes: null,
      },
      decisionCards: [],
      stakeholderViews: [],
      records: [],
      controls: { families: [], scenarios: [], searchEnabled: true, roleScoped: true, sourceBacked: true },
    };
  }

  const pool = getCorePgPool();
  const result = await pool.query<FinancialSourceRow>(`
    select
      crays_entity_id,
      external_entity_type,
      external_entity_id,
      sync_status,
      last_synced_at,
      metadata
    from crays_core.external_record_maps
    where external_system = 'financial-workbook'
    order by
      case external_entity_type
        when 'workbook-metadata' then 1
        when 'site-assumptions' then 2
        when 'scenario-assumptions' then 3
        when 'kpi-matrix' then 4
        when 'bwa-scenario-summary' then 5
        when 'stakeholder-finance-views' then 6
        else 9
      end,
      external_entity_id
  `);

  const mapped = result.rows.map((row) => withRawFields(mapRecord(row, role), row));
  const visible = mapped.filter((row) => isVisibleForAccess(row, access));
  const scenarios = [...new Set(visible.map((row) => row.scenario).filter(Boolean))];
  const families = [...new Set(visible.map((row) => row.family))];
  const latest = visible
    .map((row) => (row.lastSyncedAt ? new Date(row.lastSyncedAt).getTime() : 0))
    .filter((time) => time > 0)
    .sort((a, b) => b - a)[0];
  const freshnessMinutes = latest ? Math.max(0, Math.round((Date.now() - latest) / 60_000)) : null;

  const plainVisible = visible.map(stripRawFields);
  return {
    ...base,
    summary: {
      records: plainVisible.length,
      families: families.length,
      scenarios: scenarios.length,
      kpiRows: plainVisible.filter((row) => row.family === "kpi-matrix").length,
      workbookRecords: result.rowCount ?? result.rows.length,
      blockedReleaseViews: plainVisible.filter((row) => row.status === "release_blocked").length,
      midCaseMembersEndYear3: metric(plainVisible, "active-members-end-y3"),
      midCaseRevenueYear3: metric(plainVisible, "net-revenue-year-3"),
      midCaseResultYear3: metric(plainVisible, "result-after-monthly-costs-y3"),
      midCaseCashflowEndYear3: metric(plainVisible, "cumulative-cashflow-end-y3"),
      midCasePaybackYears: metric(plainVisible, "payback-years"),
      freshnessMinutes,
    },
    decisionCards: buildDecisionCards(plainVisible),
    stakeholderViews: buildStakeholderViews(visible),
    records: plainVisible,
    controls: {
      families: families.map((family) => ({ key: family, label: familyLabel(family), rows: plainVisible.filter((row) => row.family === family).length })),
      scenarios: scenarios.map((scenario) => ({ key: scenario, label: scenario, rows: plainVisible.filter((row) => row.scenario === scenario).length })),
      searchEnabled: true,
      roleScoped: true,
      sourceBacked: true,
    },
  };
}
