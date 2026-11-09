import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "full_location" | "partner_location" | "external_location" | "release_blocked" | "forbidden";
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

export type LocationIntelligenceRecord = {
  id: string;
  label: string;
  family: string;
  craysEntityType: string;
  craysEntityId: string;
  audience: string;
  owner: string;
  status: string;
  priority: string;
  metricLabel: string;
  value: string | number | boolean | null;
  unit: string | null;
  scenario: string;
  nextAction: string;
  href: string;
  commandScope: string;
  lastSyncedAt: string | null;
  fields: JsonRecord;
};

export type LocationIntelligenceReadModel = {
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
    catchmentBands: number;
    competitionSignals: number;
    stakeholderViews: number;
    releaseBlockedViews: number;
    midCasePotential: number | null;
    localityConfidence: number | null;
    midCaseYear5Revenue: number | null;
    midCaseRentRatio: number | null;
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
  records: LocationIntelligenceRecord[];
  controls: {
    families: Array<{ key: string; label: string; rows: number }>;
    audiences: Array<{ key: string; label: string; rows: number }>;
    statuses: Array<{ key: string; label: string; rows: number }>;
    sourceBacked: true;
    roleScoped: true;
  };
  actions: {
    stageReviewAllowed: boolean;
    commandRoute: "/api/crays/core-command/sync-preview";
    confirmationHeader: "stage-sync-preview-command";
    commandType: "diff_review";
    action: "classify_diff";
    applyGate: "OPEN_DEV_SYNC_APPLY";
  };
  boundaries: {
    liveExternalReadEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
    reportPublicationEnabled: false;
    externalSendingEnabled: false;
    candidateReleaseEnabled: false;
    ownerReleaseEnabled: false;
    bankSendEnabled: false;
    paymentInitiationEnabled: false;
    financePostingEnabled: false;
    liveAiEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const fullRoles: RoleKey[] = ["admin", "crays-management", "expansion-manager", "finance", "deal-manager", "reviewer"];
const partnerRoles: RoleKey[] = ["franchise-partner", "studio-manager"];
const externalRoles: RoleKey[] = ["bank-partner", "landlord", "investor"];
const releaseBlockedRoles: RoleKey[] = ["franchise-candidate", "guest"];
const commandRoles: RoleKey[] = ["admin", "crays-management", "finance", "deal-manager", "reviewer"];

function accessForRole(role: RoleKey): LocationIntelligenceReadModel["access"] {
  if (fullRoles.includes(role)) return { role, allowed: true, level: "full_location", reason: "Role can inspect location inputs, catchment evidence, forecast links and stakeholder preflight state." };
  if (partnerRoles.includes(role)) return { role, allowed: true, level: "partner_location", reason: "Role can inspect partner-facing site fit, member potential and operating assumptions." };
  if (externalRoles.includes(role)) return { role, allowed: true, level: "external_location", reason: "Role receives scoped location evidence for credit, lease or investment decisions." };
  if (releaseBlockedRoles.includes(role)) return { role, allowed: false, level: "release_blocked", reason: "Location evidence requires a reviewed stakeholder package before this role can access it." };
  return { role, allowed: false, level: "forbidden", reason: "Role is outside the Location Intelligence workflow scope." };
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
  return value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function familyLabel(family: string) {
  const labels: Record<string, string> = {
    "site-inputs": "Site inputs",
    "catchment-bands": "Catchment bands",
    "member-potential": "Member potential",
    "competition-pressure": "Competition pressure",
    "demographic-fit": "Demographic fit",
    accessibility: "Accessibility",
    "rent-potential-link": "Rent potential link",
    "forecast-impact-links": "Forecast impact links",
    "stakeholder-location-views": "Stakeholder location views",
  };
  return labels[family] ?? titleCase(family);
}

function visibleValue(fields: JsonRecord, family: string) {
  if (family === "catchment-bands") return fields.memberPotential as number | string | boolean | null | undefined;
  if (family === "member-potential") return fields.validatedPotential as number | string | boolean | null | undefined;
  if (family === "competition-pressure") return fields.pressure as number | string | boolean | null | undefined;
  if (family === "demographic-fit") return fields.fitnessAffinity as number | string | boolean | null | undefined;
  if (family === "accessibility") return fields.score as number | string | boolean | null | undefined;
  if (family === "rent-potential-link" || family === "forecast-impact-links") return fields.value as number | string | boolean | null | undefined;
  return (fields.value as string | number | boolean | null | undefined) ?? null;
}

function visibleUnit(fields: JsonRecord, family: string) {
  if (typeof fields.unit === "string") return fields.unit;
  if (family === "catchment-bands" || family === "member-potential") return "members";
  if (family === "competition-pressure" || family === "demographic-fit") return "score";
  if (family === "accessibility") return "score";
  return null;
}

function metricLabel(fields: JsonRecord, family: string, label: string) {
  if (typeof fields.metric === "string") return fields.metric;
  if (typeof fields.signal === "string") return fields.signal;
  if (typeof fields.competitorName === "string") return fields.competitorName;
  if (typeof fields.segment === "string") return fields.segment;
  if (typeof fields.mode === "string" && typeof fields.minutes === "number") return `${fields.mode} ${fields.minutes} minute catchment`;
  if (typeof fields.audience === "string") return fields.audience;
  return label;
}

function hrefFor(record: Omit<LocationIntelligenceRecord, "href">, role: RoleKey) {
  const roleParam = encodeURIComponent(role);
  if (record.audience === "Bank Partner" || record.family === "forecast-impact-links") return `/loans?role=${roleParam}&view=bank-package&record=location-evidence`;
  if (record.audience === "Real Estate Partner" || record.family === "rent-potential-link") return `/files?role=${roleParam}&view=release-review&record=lease-location-evidence`;
  if (record.family === "member-potential" || record.audience === "Franchise Partner") return `/analytics?role=${roleParam}&view=location-intelligence&record=member-potential`;
  return `/analytics?role=${roleParam}&view=location-intelligence&record=${encodeURIComponent(record.family)}`;
}

function commandScopeFor(record: Omit<LocationIntelligenceRecord, "href" | "commandScope">) {
  if (record.family === "competition-pressure") return "competition-pressure-review";
  if (record.family === "accessibility") return "accessibility-mitigation-review";
  if (record.family === "rent-potential-link") return "rent-fit-review";
  if (record.family === "forecast-impact-links") return "forecast-impact-review";
  if (record.family === "stakeholder-location-views") return "stakeholder-preflight-review";
  return "location-evidence-review";
}

function mapRecord(row: SourceRow, role: RoleKey): LocationIntelligenceRecord {
  const fields = asRecord(row.metadata?.fields);
  const family = row.external_entity_type;
  const label = text(row.metadata?.label, row.external_entity_id);
  const audience = text(fields.primaryAudience, text(fields.audience, "CRAYS Management"));
  const mapped = {
    id: `${family}:${row.external_entity_id}`,
    label,
    family,
    craysEntityType: row.crays_entity_type,
    craysEntityId: row.crays_entity_id,
    audience,
    owner: text(row.metadata?.owner, "Expansion Manager"),
    status: text(row.metadata?.status, row.sync_status),
    priority: text(row.metadata?.priority, "medium"),
    metricLabel: metricLabel(fields, family, label),
    value: visibleValue(fields, family) ?? null,
    unit: visibleUnit(fields, family),
    scenario: text(fields.scenario, "Shared"),
    nextAction: text(fields.nextAction, "Review Location Intelligence evidence."),
    commandScope: "",
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
    fields,
  };
  const scoped = { ...mapped, commandScope: commandScopeFor(mapped) };
  return { ...scoped, href: hrefFor(scoped, role) };
}

function visibleFor(record: LocationIntelligenceRecord, access: LocationIntelligenceReadModel["access"]) {
  if (!access.allowed) return false;
  if (access.level === "full_location") return true;
  if (access.level === "partner_location") {
    return ["Franchise Partner", "CRAYS Management"].includes(record.audience) || ["catchment-bands", "member-potential", "demographic-fit", "accessibility", "forecast-impact-links"].includes(record.family);
  }
  if (access.role === "bank-partner") {
    return ["Bank Partner", "Finance", "CRAYS Management"].includes(record.audience) || ["catchment-bands", "member-potential", "rent-potential-link", "forecast-impact-links"].includes(record.family);
  }
  if (access.role === "landlord") {
    return ["Real Estate Partner", "CRAYS Management"].includes(record.audience) || ["site-inputs", "catchment-bands", "accessibility", "rent-potential-link"].includes(record.family);
  }
  if (access.role === "investor") {
    return ["CRAYS Management", "Franchise Partner", "Bank Partner"].includes(record.audience) || ["member-potential", "forecast-impact-links"].includes(record.family);
  }
  return false;
}

function recordNumber(records: LocationIntelligenceRecord[], family: string, predicate: (record: LocationIntelligenceRecord) => boolean, field?: string) {
  const record = records.find((item) => item.family === family && predicate(item));
  if (!record) return null;
  if (field) return num(record.fields[field]);
  return num(record.value);
}

function valueLabel(value: number | null, unit: string) {
  if (value === null) return "not available";
  if (unit === "EUR") return `EUR ${Math.round(value).toLocaleString("en-US")}`;
  if (unit === "EUR/sqm") return `EUR ${value.toLocaleString("en-US")}/sqm`;
  if (unit === "percent") return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
  if (unit === "score") return `${Math.round(value * (value <= 1 ? 100 : 1))}/100`;
  if (unit === "months") return `${Math.round(value)} months`;
  return Math.round(value).toLocaleString("en-US");
}

function buildDecisionCards(records: LocationIntelligenceRecord[]): LocationIntelligenceReadModel["decisionCards"] {
  const midCasePotential = recordNumber(records, "member-potential", (record) => record.scenario === "Mid-Case");
  const transitPotential = recordNumber(records, "catchment-bands", (record) => record.label.includes("Transit 15"), "memberPotential");
  const rentRatio = recordNumber(records, "rent-potential-link", (record) => record.metricLabel === "Mid-Case Year-5 rent ratio");
  const localityConfidence = recordNumber(records, "forecast-impact-links", (record) => record.metricLabel === "Locality confidence");
  const avgPressure = records
    .filter((record) => record.family === "competition-pressure")
    .map((record) => num(record.fields.pressure))
    .filter((value): value is number => value !== null)
    .reduce((sum, value, _index, arr) => sum + value / arr.length, 0);

  return [
    {
      key: "member-potential",
      label: "Member potential",
      value: valueLabel(midCasePotential, "members"),
      context: "Mid-Case validated potential tied to the 5-year partner forecast.",
      status: midCasePotential !== null && midCasePotential >= 1200 ? "ready" : "attention",
      filterFamily: "member-potential",
      searchTerm: "Mid-Case",
    },
    {
      key: "catchment-strength",
      label: "Catchment strength",
      value: valueLabel(transitPotential, "members"),
      context: "Transit catchment capacity used as the bankable demand floor.",
      status: transitPotential !== null && transitPotential >= 1300 ? "ready" : "attention",
      filterFamily: "catchment-bands",
      searchTerm: "Transit 15",
    },
    {
      key: "competition-pressure",
      label: "Competition pressure",
      value: valueLabel(avgPressure || null, "score"),
      context: "Average pressure stays manageable but requires differentiation review.",
      status: avgPressure <= 0.34 ? "ready" : "attention",
      filterFamily: "competition-pressure",
      searchTerm: "competition",
    },
    {
      key: "rent-fit",
      label: "Lease fit",
      value: valueLabel(rentRatio, "percent"),
      context: "Year-5 rent ratio linked to the financial forecast and lease package.",
      status: rentRatio !== null && rentRatio <= 0.09 ? "ready" : "attention",
      filterFamily: "rent-potential-link",
      searchTerm: "Year-5 rent ratio",
    },
    {
      key: "locality-confidence",
      label: "Locality confidence",
      value: valueLabel(localityConfidence, "score"),
      context: "Confidence score summarises catchment, rent, access and forecast linkage.",
      status: localityConfidence !== null && localityConfidence >= 0.8 ? "ready" : "attention",
      filterFamily: "forecast-impact-links",
      searchTerm: "Locality confidence",
    },
  ];
}

function empty(role: RoleKey, access: LocationIntelligenceReadModel["access"], queryStatus: LocationIntelligenceReadModel["queryStatus"]): LocationIntelligenceReadModel {
  return {
    access,
    caseContext: {
      title: "Location Intelligence forecast inputs",
      journey: "site input -> catchment and competition evidence -> forecast impact -> stakeholder package preflight",
      ownerRole: "Expansion Manager",
      consumingRoles: ["CRAYS Management", "Finance", "Deal Manager", "Franchise Partner", "Bank Partner", "Real Estate Partner", "Reviewer"],
    },
    summary: {
      records: 0,
      sourceRecords: 0,
      catchmentBands: 0,
      competitionSignals: 0,
      stakeholderViews: 0,
      releaseBlockedViews: 0,
      midCasePotential: null,
      localityConfidence: null,
      midCaseYear5Revenue: null,
      midCaseRentRatio: null,
      freshnessMinutes: null,
    },
    decisionCards: [],
    records: [],
    controls: { families: [], audiences: [], statuses: [], sourceBacked: true, roleScoped: true },
    actions: {
      stageReviewAllowed: commandRoles.includes(role),
      commandRoute: "/api/crays/core-command/sync-preview",
      confirmationHeader: "stage-sync-preview-command",
      commandType: "diff_review",
      action: "classify_diff",
      applyGate: "OPEN_DEV_SYNC_APPLY",
    },
    boundaries: {
      liveExternalReadEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      reportPublicationEnabled: false,
      externalSendingEnabled: false,
      candidateReleaseEnabled: false,
      ownerReleaseEnabled: false,
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

export async function getLocationIntelligenceReadModel(role: RoleKey): Promise<LocationIntelligenceReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured || !access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");

  const result = await getCorePgPool().query<SourceRow>(`
    select external_entity_type, external_entity_id, crays_entity_type, crays_entity_id, sync_status, last_synced_at, metadata
    from crays_core.external_record_maps
    where external_system = 'location-intelligence'
    order by external_entity_type, external_entity_id
  `);

  const allRecords = result.rows.map((row) => mapRecord(row, role));
  const records = allRecords.filter((record) => visibleFor(record, access));
  const latest = records
    .map((record) => (record.lastSyncedAt ? new Date(record.lastSyncedAt).getTime() : 0))
    .filter((time) => time > 0)
    .sort((a, b) => b - a)[0];
  const freshnessMinutes = latest ? Math.max(0, Math.round((Date.now() - latest) / 60_000)) : null;
  const families = [...new Set(records.map((record) => record.family))];
  const audiences = [...new Set(records.map((record) => record.audience).filter(Boolean))];
  const statuses = [...new Set(records.map((record) => record.status).filter(Boolean))];

  return {
    ...empty(role, access, "schema_ready"),
    summary: {
      records: records.length,
      sourceRecords: result.rowCount ?? result.rows.length,
      catchmentBands: records.filter((record) => record.family === "catchment-bands").length,
      competitionSignals: records.filter((record) => record.family === "competition-pressure").length,
      stakeholderViews: records.filter((record) => record.family === "stakeholder-location-views").length,
      releaseBlockedViews: records.filter((record) => record.status === "release_blocked").length,
      midCasePotential: recordNumber(records, "member-potential", (record) => record.scenario === "Mid-Case"),
      localityConfidence: recordNumber(records, "forecast-impact-links", (record) => record.metricLabel === "Locality confidence"),
      midCaseYear5Revenue: recordNumber(records, "forecast-impact-links", (record) => record.metricLabel === "Year-5 revenue supported by catchment"),
      midCaseRentRatio: recordNumber(records, "rent-potential-link", (record) => record.metricLabel === "Mid-Case Year-5 rent ratio"),
      freshnessMinutes,
    },
    decisionCards: buildDecisionCards(records),
    records,
    controls: {
      families: families.map((family) => ({ key: family, label: familyLabel(family), rows: records.filter((record) => record.family === family).length })),
      audiences: audiences.map((audience) => ({ key: audience, label: audience, rows: records.filter((record) => record.audience === audience).length })),
      statuses: statuses.map((status) => ({ key: status, label: titleCase(status), rows: records.filter((record) => record.status === status).length })),
      sourceBacked: true,
      roleScoped: true,
    },
  };
}
