import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "full_policy" | "scoped_policy" | "release_blocked" | "forbidden";
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

export type RoleMetricAccessRecord = {
  id: string;
  family: string;
  label: string;
  craysEntityType: string;
  craysEntityId: string;
  roleKey: string;
  roleLabel: string;
  category: string;
  metricKey: string;
  metricLabel: string;
  sourceDataset: string;
  sourceFamily: string;
  value: string | number | boolean | null;
  unit: string | null;
  visibility: string;
  status: string;
  owner: string;
  priority: string;
  accessReason: string;
  href: string;
  nextAction: string;
  lastSyncedAt: string | null;
};

export type RoleMetricAccessReadModel = {
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
    metricCatalog: number;
    roleVisibilityRows: number;
    visibleRows: number;
    aggregateRows: number;
    releaseBlockedRows: number;
    hiddenRows: number;
    roleCount: number;
    categories: number;
    freshnessMinutes: number | null;
  };
  decisionCards: Array<{
    key: string;
    label: string;
    value: string;
    context: string;
    status: DecisionStatus;
    filterRole: string;
    filterVisibility: string;
    searchTerm: string;
  }>;
  records: RoleMetricAccessRecord[];
  controls: {
    roles: Array<{ key: string; label: string; rows: number }>;
    categories: Array<{ key: string; label: string; rows: number }>;
    visibilities: Array<{ key: string; label: string; rows: number }>;
    families: Array<{ key: string; label: string; rows: number }>;
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

const fullRoles: RoleKey[] = ["admin", "crays-management", "finance", "deal-manager", "reviewer"];
const scopedRoles: RoleKey[] = ["franchise-partner", "bank-partner", "landlord", "studio-manager", "investor", "expansion-manager"];
const releaseBlockedRoles: RoleKey[] = ["franchise-candidate", "guest"];
const commandRoles: RoleKey[] = ["admin", "crays-management", "finance", "deal-manager", "reviewer"];

function accessForRole(role: RoleKey): RoleMetricAccessReadModel["access"] {
  if (fullRoles.includes(role)) return { role, allowed: true, level: "full_policy", reason: "Role can inspect the full metric visibility policy, source lineage and release-blocked stakeholder rows." };
  if (scopedRoles.includes(role)) return { role, allowed: true, level: "scoped_policy", reason: "Role can inspect only its own metric visibility rows and released aggregate/source-backed policy records." };
  if (releaseBlockedRoles.includes(role)) return { role, allowed: false, level: "release_blocked", reason: "Metric packages require release preflight before this role can access them." };
  return { role, allowed: false, level: "forbidden", reason: "Role is outside the metric access policy scope." };
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

function rolesFrom(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapRecord(row: SourceRow): RoleMetricAccessRecord {
  const fields = asRecord(row.metadata?.fields);
  const family = row.external_entity_type;
  const label = text(row.metadata?.label, row.external_entity_id);
  const roleLabel = text(fields.roleLabel, text(fields.primaryAudience, "All roles"));
  const metricLabel = text(fields.metricLabel, label);
  return {
    id: `${family}:${row.external_entity_id}`,
    family,
    label,
    craysEntityType: row.crays_entity_type,
    craysEntityId: row.crays_entity_id,
    roleKey: text(fields.roleKey, "all"),
    roleLabel,
    category: text(fields.category, family === "stakeholder-metric-packages" ? "Metric Package" : family === "redaction-rules" ? "Redaction Rule" : "Metric Catalog"),
    metricKey: text(fields.metricKey, text(fields.packageKey, row.external_entity_id)),
    metricLabel,
    sourceDataset: text(fields.sourceDataset, "role-metric-access"),
    sourceFamily: text(fields.sourceFamily, family),
    value: (fields.value as string | number | boolean | null | undefined) ?? null,
    unit: text(fields.unit) || null,
    visibility: text(fields.visibility, family === "metric-catalog" ? "catalog" : text(fields.status, text(row.metadata?.status, row.sync_status))),
    status: text(row.metadata?.status, row.sync_status),
    owner: text(row.metadata?.owner, "CRAYS Management"),
    priority: text(row.metadata?.priority, "medium"),
    accessReason: text(fields.accessReason, text(fields.rule, "Role metric access policy record.")),
    href: text(fields.href, "/analytics?view=role-metric-access"),
    nextAction: text(fields.nextAction, "Review this role metric policy row."),
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
  };
}

function packageIncludesRole(row: SourceRow, role: RoleKey) {
  const fields = asRecord(row.metadata?.fields);
  const roleLabelsByKey: Partial<Record<RoleKey, string>> = {
    "franchise-partner": "Franchise Partner",
    "bank-partner": "Bank Partner",
    landlord: "Real Estate Partner",
    "studio-manager": "Studio Manager",
    investor: "Investor",
    "expansion-manager": "Expansion Manager",
  };
  const roles = rolesFrom(fields.roles);
  return roles.includes(roleLabelsByKey[role] ?? "");
}

function visibleFor(record: RoleMetricAccessRecord, rawRow: SourceRow, access: RoleMetricAccessReadModel["access"]) {
  if (!access.allowed) return false;
  if (access.level === "full_policy") return true;
  if (record.family === "role-visibility") return record.roleKey === access.role;
  if (record.family === "stakeholder-metric-packages") return packageIncludesRole(rawRow, access.role);
  if (record.family === "metric-catalog") return false;
  if (record.family === "redaction-rules") return false;
  if (record.family === "visibility-review-actions") return false;
  return false;
}

function empty(role: RoleKey, access: RoleMetricAccessReadModel["access"], queryStatus: RoleMetricAccessReadModel["queryStatus"]): RoleMetricAccessReadModel {
  return {
    access,
    caseContext: {
      title: "Role metric access policy",
      journey: "source metric -> role visibility grain -> stakeholder package -> review command",
      ownerRole: "CRAYS Management",
      consumingRoles: ["CRAYS Management", "Finance", "Deal Manager", "Franchise Partner", "Bank Partner", "Real Estate Partner", "Studio Manager", "Reviewer"],
    },
    summary: {
      records: 0,
      sourceRecords: 0,
      metricCatalog: 0,
      roleVisibilityRows: 0,
      visibleRows: 0,
      aggregateRows: 0,
      releaseBlockedRows: 0,
      hiddenRows: 0,
      roleCount: 0,
      categories: 0,
      freshnessMinutes: null,
    },
    decisionCards: [],
    records: [],
    controls: { roles: [], categories: [], visibilities: [], families: [], sourceBacked: true, roleScoped: true },
    actions: {
      stageReviewAllowed: commandRoles.includes(role),
      commandRoute: "/api/crays/core-command/sync-preview",
      confirmationHeader: "stage-sync-preview-command",
      commandType: "diff_review",
      action: "classify_diff",
      applyGate: "OPEN_DEV_SYNC_APPLY",
    },
    boundaries: {
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

function valueForRole(records: RoleMetricAccessRecord[], roleKey: string, visibility: string) {
  return records.filter((record) => record.family === "role-visibility" && record.roleKey === roleKey && record.visibility === visibility).length;
}

function buildDecisionCards(records: RoleMetricAccessRecord[]): RoleMetricAccessReadModel["decisionCards"] {
  const partnerVisible = records.filter((record) => record.family === "role-visibility" && record.roleKey === "franchise-partner" && ["scoped", "aggregate", "full"].includes(record.visibility)).length;
  const bankVisible = records.filter((record) => record.family === "role-visibility" && record.roleKey === "bank-partner" && ["scoped", "aggregate", "full"].includes(record.visibility)).length;
  const realEstateVisible = records.filter((record) => record.family === "role-visibility" && record.roleKey === "landlord" && ["scoped", "aggregate", "full"].includes(record.visibility)).length;
  const candidateBlocked = valueForRole(records, "franchise-candidate", "release_blocked");
  const hiddenRows = records.filter((record) => record.visibility === "hidden").length;
  return [
    { key: "partner-metrics", label: "Partner decision metrics", value: String(partnerVisible), context: "Scoped forecast, location and member operating metrics for Franchise Partner decision.", status: partnerVisible >= 8 ? "ready" : "attention", filterRole: "franchise-partner", filterVisibility: "all", searchTerm: "" },
    { key: "bank-metrics", label: "Bank credit metrics", value: String(bankVisible), context: "Credit-safe metrics without member-level PII or send action.", status: bankVisible >= 6 ? "ready" : "attention", filterRole: "bank-partner", filterVisibility: "all", searchTerm: "" },
    { key: "real-estate-metrics", label: "Real estate metrics", value: String(realEstateVisible), context: "Lease fit, rent ratio, catchment and locality evidence only.", status: realEstateVisible >= 4 ? "ready" : "attention", filterRole: "landlord", filterVisibility: "all", searchTerm: "" },
    { key: "candidate-blocked", label: "Candidate release blocked", value: String(candidateBlocked), context: "Candidate package metrics stay blocked until preflight and redaction pass.", status: candidateBlocked > 0 ? "blocked" : "attention", filterRole: "franchise-candidate", filterVisibility: "release_blocked", searchTerm: "" },
    { key: "privacy-guard", label: "Hidden or restricted rows", value: String(hiddenRows), context: "Rows not needed by a role remain hidden instead of leaking internal details.", status: hiddenRows > 0 ? "ready" : "attention", filterRole: "all", filterVisibility: "hidden", searchTerm: "" },
  ];
}

function familySortRank(family: string) {
  const ranks: Record<string, number> = {
    "role-visibility": 0,
    "stakeholder-metric-packages": 1,
    "visibility-review-actions": 2,
    "redaction-rules": 3,
    "metric-catalog": 4,
  };
  return ranks[family] ?? 9;
}

export async function getRoleMetricAccessReadModel(role: RoleKey): Promise<RoleMetricAccessReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured || !access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");

  const result = await getCorePgPool().query<SourceRow>(`
    select external_entity_type, external_entity_id, crays_entity_type, crays_entity_id, sync_status, last_synced_at, metadata
    from crays_core.external_record_maps
    where external_system = 'role-metric-access'
    order by external_entity_type, external_entity_id
  `);

  const allRecords = result.rows.map(mapRecord);
  const records = allRecords
    .filter((record, index) => visibleFor(record, result.rows[index], access))
    .sort((a, b) => familySortRank(a.family) - familySortRank(b.family) || a.roleLabel.localeCompare(b.roleLabel) || a.metricLabel.localeCompare(b.metricLabel));
  const latest = records
    .map((record) => (record.lastSyncedAt ? new Date(record.lastSyncedAt).getTime() : 0))
    .filter((time) => time > 0)
    .sort((a, b) => b - a)[0];
  const freshnessMinutes = latest ? Math.max(0, Math.round((Date.now() - latest) / 60_000)) : null;
  const roles = [...new Map(records.filter((record) => record.roleKey !== "all").map((record) => [record.roleKey, record.roleLabel])).entries()];
  const categories = [...new Set(records.map((record) => record.category).filter(Boolean))];
  const visibilities = [...new Set(records.map((record) => record.visibility).filter(Boolean))];
  const families = [...new Set(records.map((record) => record.family))];

  return {
    ...empty(role, access, "schema_ready"),
    summary: {
      records: records.length,
      sourceRecords: result.rowCount ?? result.rows.length,
      metricCatalog: records.filter((record) => record.family === "metric-catalog").length,
      roleVisibilityRows: records.filter((record) => record.family === "role-visibility").length,
      visibleRows: records.filter((record) => ["full", "scoped"].includes(record.visibility)).length,
      aggregateRows: records.filter((record) => record.visibility === "aggregate").length,
      releaseBlockedRows: records.filter((record) => record.visibility === "release_blocked" || record.status === "release_blocked").length,
      hiddenRows: records.filter((record) => record.visibility === "hidden").length,
      roleCount: roles.length,
      categories: categories.length,
      freshnessMinutes,
    },
    decisionCards: buildDecisionCards(records),
    records,
    controls: {
      roles: roles.map(([key, label]) => ({ key, label, rows: records.filter((record) => record.roleKey === key).length })),
      categories: categories.map((category) => ({ key: category, label: category, rows: records.filter((record) => record.category === category).length })),
      visibilities: visibilities.map((visibility) => ({ key: visibility, label: titleCase(visibility), rows: records.filter((record) => record.visibility === visibility).length })),
      families: families.map((family) => ({ key: family, label: titleCase(family), rows: records.filter((record) => record.family === family).length })),
      sourceBacked: true,
      roleScoped: true,
    },
  };
}
