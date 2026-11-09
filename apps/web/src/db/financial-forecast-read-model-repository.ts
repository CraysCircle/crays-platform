import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "full_forecast" | "partner_forecast" | "external_forecast" | "release_blocked" | "forbidden";
type ForecastStatus = "ready" | "attention" | "blocked";

type SourceRow = {
  external_entity_type: string;
  external_entity_id: string;
  sync_status: string;
  last_synced_at: Date | null;
  metadata: JsonRecord | null;
};

export type ForecastRecord = {
  id: string;
  label: string;
  family: string;
  scenario: string;
  forecastYear: number | null;
  sourceType: string;
  metricKey: string | null;
  metricLabel: string;
  value: string | number | boolean | null;
  unit: string | null;
  audience: string;
  status: string;
  owner: string;
  nextAction: string;
  href: string;
  lastSyncedAt: string | null;
};

export type FinancialForecastReadModel = {
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
    sourceRecords: number;
    annualForecasts: number;
    forecastKpis: number;
    scenarios: number;
    years: number;
    blockedReleaseViews: number;
    midCaseYear5Revenue: number | null;
    midCaseYear5Cash: number | null;
    midCaseYear5Members: number | null;
    midCaseYear5Payback: number | null;
    freshnessMinutes: number | null;
  };
  decisionCards: Array<{
    key: string;
    label: string;
    value: string;
    context: string;
    status: ForecastStatus;
    drillMetric: string;
  }>;
  records: ForecastRecord[];
  controls: {
    scenarios: Array<{ key: string; label: string; rows: number }>;
    years: Array<{ key: string; label: string; rows: number }>;
    families: Array<{ key: string; label: string; rows: number }>;
    sourceBacked: true;
    roleScoped: true;
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

function accessForRole(role: RoleKey): FinancialForecastReadModel["access"] {
  if (fullRoles.includes(role)) return { role, allowed: true, level: "full_forecast", reason: "Role can inspect 5-year forecast assumptions, KPIs, source lineage and stakeholder preflight state." };
  if (partnerRoles.includes(role)) return { role, allowed: true, level: "partner_forecast", reason: "Role can inspect partner/studio economics without internal lender or release workpapers." };
  if (externalRoles.includes(role)) return { role, allowed: true, level: "external_forecast", reason: "Role receives scoped forecast metrics for credit, lease, investment or expansion decisions." };
  if (releaseBlockedRoles.includes(role)) return { role, allowed: false, level: "release_blocked", reason: "Forecast records require a released stakeholder package for this role." };
  return { role, allowed: false, level: "forbidden", reason: "Role is outside the 5-year forecast scope." };
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function titleCase(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function familyLabel(family: string) {
  const labels: Record<string, string> = {
    "forecast-assumptions": "Forecast assumptions",
    "annual-forecast": "Annual forecast",
    "forecast-kpis": "Forecast KPIs",
    "stakeholder-forecast-views": "Stakeholder forecast views",
  };
  return labels[family] ?? titleCase(family);
}

function mapRecord(row: SourceRow, role: RoleKey): ForecastRecord {
  const fields = asRecord(row.metadata?.fields);
  const family = row.external_entity_type;
  const audience = text(fields.primaryAudience, text(fields.audience, "Finance"));
  const metricKey = text(fields.metricKey) || null;
  const mapped = {
    id: `${family}:${row.external_entity_id}`,
    label: text(row.metadata?.label, row.external_entity_id),
    family,
    scenario: text(fields.scenario, "Shared"),
    forecastYear: num(fields.forecastYear ?? fields.year),
    sourceType: text(fields.sourceType, text(fields.sourceType, "forecast_source")),
    metricKey,
    metricLabel: text(fields.metricLabel, text(row.metadata?.label, row.external_entity_id)),
    value: (fields.value as string | number | boolean | null | undefined) ?? null,
    unit: text(fields.unit) || null,
    audience,
    status: text(row.metadata?.status, row.sync_status),
    owner: text(row.metadata?.owner, "Finance"),
    nextAction: text(fields.nextAction, "Review 5-year forecast record."),
    href: "",
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
  };
  return { ...mapped, href: hrefFor(mapped, role) };
}

function hrefFor(record: Omit<ForecastRecord, "href">, role: RoleKey) {
  const roleParam = encodeURIComponent(role);
  if (record.audience === "Bank Partner") return `/loans?role=${roleParam}&view=bank-package&record=financial-forecast`;
  if (record.audience === "Real Estate Partner") return `/files?role=${roleParam}&view=release-review&record=lease-forecast`;
  return `/analytics?role=${roleParam}&view=financial-forecast&record=${encodeURIComponent(record.family)}`;
}

function visibleFor(record: ForecastRecord, access: FinancialForecastReadModel["access"]) {
  if (!access.allowed) return false;
  if (access.level === "full_forecast") return true;
  if (access.level === "partner_forecast") return ["Franchise Partner", "Studio Manager", "Finance"].includes(record.audience) || record.family === "stakeholder-forecast-views";
  if (access.role === "bank-partner") {
    return (
      ["Bank Partner", "Finance"].includes(record.audience) ||
      ["revenue", "activeMembersEnd", "ebitdaBeforeLeasingAndFinancing", "resultAfterMonthlyCosts", "netCashflow", "cumulativeCash", "cashBreakEvenMembers", "roic", "paybackYears"].includes(record.metricKey ?? "")
    );
  }
  if (access.role === "landlord") return record.audience === "Real Estate Partner" || record.metricKey === "rentRatio" || record.metricKey === "revenue";
  if (access.role === "investor" || access.role === "expansion-manager") return ["Franchise Partner", "Bank Partner", "Real Estate Partner", "CRAYS Management"].includes(record.audience);
  return false;
}

function metric(records: ForecastRecord[], key: string, year = 2031, scenario = "Mid-Case") {
  return num(records.find((record) => record.metricKey === key && record.forecastYear === year && record.scenario === scenario)?.value);
}

function valueLabel(value: number | null, unit: string) {
  if (value === null) return "not available";
  if (unit === "EUR") return `€${Math.round(value).toLocaleString("en-US")}`;
  if (unit === "percent") return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
  if (unit === "years") return `${value.toFixed(1)} years`;
  return Math.round(value).toLocaleString("en-US");
}

function buildDecisionCards(records: ForecastRecord[]): FinancialForecastReadModel["decisionCards"] {
  const revenue = metric(records, "revenue");
  const cash = metric(records, "cumulativeCash");
  const members = metric(records, "activeMembersEnd");
  const payback = metric(records, "paybackYears");
  const rentRatio = metric(records, "rentRatio");

  return [
    { key: "year5-revenue", label: "Year-5 revenue", value: valueLabel(revenue, "EUR"), context: `${valueLabel(members, "members")} members in Mid-Case year 5.`, status: revenue !== null && revenue > 600000 ? "ready" : "attention", drillMetric: "revenue" },
    { key: "year5-cash", label: "Year-5 cumulative cash", value: valueLabel(cash, "EUR"), context: "Cash projection after Year 4-5 extension assumptions.", status: cash !== null && cash > 500000 ? "ready" : "attention", drillMetric: "cumulativeCash" },
    { key: "year5-payback", label: "Year-5 payback", value: valueLabel(payback, "years"), context: "Payback based on project basis and forecast result.", status: payback !== null && payback <= 1.2 ? "ready" : "attention", drillMetric: "paybackYears" },
    { key: "lease-fit", label: "Lease fit year 5", value: valueLabel(rentRatio, "percent"), context: "Rent ratio uses rent plus service charges against net revenue.", status: rentRatio !== null && rentRatio < 0.09 ? "ready" : "attention", drillMetric: "rentRatio" },
  ];
}

function empty(role: RoleKey, access: FinancialForecastReadModel["access"], queryStatus: FinancialForecastReadModel["queryStatus"]): FinancialForecastReadModel {
  return {
    access,
    caseContext: {
      title: "5-year forecast extension",
      journey: "3-year workbook baseline -> Year 4-5 forecast assumptions -> role decision view -> release preflight",
      ownerRole: "Finance",
      consumingRoles: ["CRAYS Management", "Finance", "Franchise Partner", "Bank Partner", "Real Estate Partner", "Reviewer"],
    },
    summary: { records: 0, sourceRecords: 0, annualForecasts: 0, forecastKpis: 0, scenarios: 0, years: 0, blockedReleaseViews: 0, midCaseYear5Revenue: null, midCaseYear5Cash: null, midCaseYear5Members: null, midCaseYear5Payback: null, freshnessMinutes: null },
    decisionCards: [],
    records: [],
    controls: { scenarios: [], years: [], families: [], sourceBacked: true, roleScoped: true },
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
    queryStatus,
  };
}

export async function getFinancialForecastReadModel(role: RoleKey): Promise<FinancialForecastReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured || !access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");

  const result = await getCorePgPool().query<SourceRow>(`
    select external_entity_type, external_entity_id, sync_status, last_synced_at, metadata
    from crays_core.external_record_maps
    where external_system = 'financial-forecast-5y'
    order by external_entity_type, external_entity_id
  `);

  const allRecords = result.rows.map((row) => mapRecord(row, role));
  const records = allRecords.filter((record) => visibleFor(record, access));
  const latest = records
    .map((record) => (record.lastSyncedAt ? new Date(record.lastSyncedAt).getTime() : 0))
    .filter((time) => time > 0)
    .sort((a, b) => b - a)[0];
  const freshnessMinutes = latest ? Math.max(0, Math.round((Date.now() - latest) / 60_000)) : null;
  const scenarios = [...new Set(records.map((record) => record.scenario).filter(Boolean))];
  const years = [...new Set(records.map((record) => record.forecastYear).filter((year): year is number => typeof year === "number"))].sort();
  const families = [...new Set(records.map((record) => record.family))];

  return {
    ...empty(role, access, "schema_ready"),
    summary: {
      records: records.length,
      sourceRecords: result.rowCount ?? result.rows.length,
      annualForecasts: records.filter((record) => record.family === "annual-forecast").length,
      forecastKpis: records.filter((record) => record.family === "forecast-kpis").length,
      scenarios: scenarios.length,
      years: years.length,
      blockedReleaseViews: records.filter((record) => record.status === "release_blocked").length,
      midCaseYear5Revenue: metric(records, "revenue"),
      midCaseYear5Cash: metric(records, "cumulativeCash"),
      midCaseYear5Members: metric(records, "activeMembersEnd"),
      midCaseYear5Payback: metric(records, "paybackYears"),
      freshnessMinutes,
    },
    decisionCards: buildDecisionCards(records),
    records,
    controls: {
      scenarios: scenarios.map((scenario) => ({ key: scenario, label: scenario, rows: records.filter((record) => record.scenario === scenario).length })),
      years: years.map((year) => ({ key: String(year), label: String(year), rows: records.filter((record) => record.forecastYear === year).length })),
      families: families.map((family) => ({ key: family, label: familyLabel(family), rows: records.filter((record) => record.family === family).length })),
      sourceBacked: true,
      roleScoped: true,
    },
  };
}
