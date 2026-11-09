import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import { readModelCacheGet, readModelCacheSet } from "@/lib/performance/read-model-cache";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "opening_control" | "partner_execution" | "studio_execution" | "release_blocked" | "forbidden";
type CardStatus = "ready" | "attention" | "blocked";

type SourceRow = {
  external_entity_type: string;
  external_entity_id: string;
  crays_entity_type: string;
  crays_entity_id: string;
  sync_status: string;
  last_synced_at: Date | null;
  metadata: JsonRecord | null;
};

export type OpeningProjectRecord = {
  id: string;
  family: string;
  label: string;
  craysEntityType: string;
  craysEntityId: string;
  status: string;
  priority: string;
  owner: string;
  audience: string;
  value: string | number | boolean | null;
  unit: string | null;
  context: string;
  currentState: string;
  nextAction: string;
  dueDate: string | null;
  milestoneId: string | null;
  predecessorId: string | null;
  successorId: string | null;
  linkedObjectId: string | null;
  identifier: string | null;
  href: string;
  lastSyncedAt: string | null;
  fields: JsonRecord;
};

export type OpeningProjectReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
    canStageWorkItem: boolean;
    canViewFinanceImpact: boolean;
    canViewInternalReview: boolean;
  };
  projectContext: {
    projectId: string;
    decisionId: string;
    dealId: string;
    propertyCaseId: string;
    studioId: string;
    studioName: string;
    siteName: string;
    address: string;
    partnerName: string;
    partnerCompany: string;
    targetOpeningDate: string;
    journey: string;
  };
  summary: {
    records: number;
    sourceRecords: number;
    activeProjects: number;
    linkedPartnerDecisionRecords: number;
    linkedFilesRecords: number;
    linkedForecastRecords: number;
    milestones: number;
    workItems: number;
    dependencies: number;
    evidenceLinks: number;
    forecastImpacts: number;
    reviewActions: number;
    readinessScore: number;
    blockers: number;
    overdue: number;
    criticalPathItems: number;
    scheduleContingencyDays: number | null;
    targetOpeningDate: string;
    freshnessMinutes: number | null;
  };
  cards: Array<{ key: string; label: string; value: string; context: string; status: CardStatus; filterFamily: string }>;
  records: OpeningProjectRecord[];
  controls: {
    families: Array<{ key: string; label: string; rows: number }>;
    statuses: Array<{ key: string; label: string; rows: number }>;
    priorities: Array<{ key: string; label: string; rows: number }>;
    owners: Array<{ key: string; label: string; rows: number }>;
    milestones: Array<{ key: string; label: string; rows: number }>;
    sourceBacked: true;
    roleScoped: true;
  };
  actions: {
    stageWorkItemAllowed: boolean;
    commandRoute: "/api/crays/core-command/project-work-item";
    confirmationHeader: "stage-project-work-item-command";
    applyGate: "OPEN_DEV_PROJECT_WORK_ITEM_APPLY";
  };
  boundaries: {
    projectApplyEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    uploadsEnabled: false;
    privatePreviewEnabled: false;
    externalSendingEnabled: false;
    stakeholderReleaseEnabled: false;
    financePostingEnabled: false;
    paymentInitiationEnabled: false;
    bankSendEnabled: false;
    liveAiEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const seedBatch = "crays-opening-project-20260713-v1";
const partnerDecisionBatch = "crays-franchise-partner-decision-20260713-v1";
const filesBatch = "crays-files-workflow-20260712-v1";
const forecastBatch = "crays-financial-forecast-5y-rotkreuzplatz-20260712-v1";
const cacheTtlMs = 30_000;
const cacheNamespace = "opening-project";
const internalRoles: RoleKey[] = ["admin", "crays-management", "deal-manager", "reviewer", "expansion-manager", "finance"];
const blockedRoles: RoleKey[] = ["guest", "franchise-candidate", "bank-partner", "landlord", "gym-member", "vendor", "investor", "hr"];

function accessForRole(role: RoleKey): OpeningProjectReadModel["access"] {
  if (internalRoles.includes(role)) return { role, allowed: true, level: "opening_control", reason: "Role can inspect the full Opening Project, critical path, evidence, finance impact and guarded work-item reviews.", canStageWorkItem: ["deal-manager", "expansion-manager", "admin", "crays-management"].includes(role), canViewFinanceImpact: true, canViewInternalReview: true };
  if (role === "franchise-partner") return { role, allowed: true, level: "partner_execution", reason: "Franchise Partner can execute partner-owned opening work and inspect the scoped milestone plan.", canStageWorkItem: true, canViewFinanceImpact: false, canViewInternalReview: false };
  if (role === "studio-manager") return { role, allowed: true, level: "studio_execution", reason: "Studio Manager can inspect staffing, equipment, access and operational-readiness work.", canStageWorkItem: true, canViewFinanceImpact: false, canViewInternalReview: false };
  if (blockedRoles.includes(role)) return { role, allowed: false, level: "release_blocked", reason: "This role has no released Opening Project scope.", canStageWorkItem: false, canViewFinanceImpact: false, canViewInternalReview: false };
  return { role, allowed: false, level: "forbidden", reason: "Role is outside the Opening Project workflow.", canStageWorkItem: false, canViewFinanceImpact: false, canViewInternalReview: false };
}

const asRecord = (value: unknown): JsonRecord => value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
const text = (value: unknown, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;
const num = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const rowFromMetadata = (metadata: JsonRecord | null) => asRecord(metadata?.row);
const fieldsFromMetadata = (metadata: JsonRecord | null) => asRecord(rowFromMetadata(metadata).fields);
const titleCase = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const familyLabels: Record<string, string> = { "project-summary": "Opening overview", milestone: "Milestones", "work-item": "Work items", dependency: "Dependencies", "evidence-link": "Evidence", "forecast-impact": "Forecast impact", "opening-review-actions": "Review actions" };

function hrefFor(family: string, role: RoleKey) {
  const roleParam = encodeURIComponent(role);
  if (family === "evidence-link") return `/files?role=${roleParam}&view=packages&record=opening`;
  if (family === "forecast-impact") return `/analytics?role=${roleParam}&view=financial-model`;
  if (family === "opening-review-actions") return `/dashboard?role=${roleParam}&view=actions`;
  return `/project?role=${roleParam}&view=work-items`;
}

function mapRecord(row: SourceRow, role: RoleKey): OpeningProjectRecord {
  const source = rowFromMetadata(row.metadata);
  const fields = fieldsFromMetadata(row.metadata);
  const family = row.external_entity_type;
  return {
    id: `${family}:${row.external_entity_id}`,
    family,
    label: text(source.label, row.external_entity_id),
    craysEntityType: row.crays_entity_type,
    craysEntityId: row.crays_entity_id,
    status: text(fields.status, text(source.status, row.sync_status)),
    priority: text(source.priority, text(fields.priority, row.sync_status === "conflict" ? "high" : "medium")),
    owner: text(source.owner, text(fields.ownerRole, "Deal Manager")),
    audience: text(fields.audience, "Franchise Partner"),
    value: (fields.value as string | number | boolean | null | undefined) ?? null,
    unit: text(fields.unit) || null,
    context: text(fields.context, "Review Opening Project record."),
    currentState: text(fields.currentState, "Review required."),
    nextAction: text(fields.nextAction, "Review the next safe action."),
    dueDate: text(source.dueDate, text(fields.dueDate)) || null,
    milestoneId: text(fields.milestoneId) || null,
    predecessorId: text(fields.predecessorId) || null,
    successorId: text(fields.successorId) || null,
    linkedObjectId: text(fields.linkedObjectId) || null,
    identifier: text(fields.identifier) || null,
    href: hrefFor(family, role),
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
    fields,
  };
}

function visibleFor(record: OpeningProjectRecord, access: OpeningProjectReadModel["access"]) {
  if (!access.allowed) return false;
  if (access.level === "opening_control") return true;
  if (access.level === "partner_execution") return record.family !== "forecast-impact" && record.audience !== "Reviewer" && (record.audience === "Franchise Partner" || record.owner === "Franchise Partner" || ["project-summary", "milestone", "work-item", "evidence-link"].includes(record.family));
  if (access.level === "studio_execution") return !["forecast-impact", "dependency", "opening-review-actions"].includes(record.family) && (["Studio Manager", "Operations", "Learning Lead", "Fit-out Lead"].includes(record.owner) || record.family === "project-summary" || record.family === "milestone");
  return false;
}

function empty(role: RoleKey, access: OpeningProjectReadModel["access"], queryStatus: OpeningProjectReadModel["queryStatus"]): OpeningProjectReadModel {
  return {
    access,
    projectContext: { projectId: "opening_project_munich_rotkreuzplatz_2026", decisionId: "partner_decision_munich_rotkreuzplatz_schneider_fitness", dealId: "deal_case_munich_rotkreuzplatz_schneider_fitness", propertyCaseId: "property_case_gudrunstrasse_3_rotkreuzplatz", studioId: "studio_munich_rotkreuzplatz_opening", studioName: "Munich Rotkreuzplatz Studio", siteName: "Gudrunstrasse 3 Studio Lease", address: "Gudrunstrasse 3, 80634 Munich", partnerName: access.canViewInternalReview ? "Lea Schneider" : "Franchise Partner", partnerCompany: access.canViewInternalReview ? "Schneider Fitness Beteiligungs GmbH" : "Partner operating company", targetOpeningDate: "2026-10-01", journey: "Partner decision -> Opening handoff -> Critical path -> Operational readiness -> Studio opening" },
    summary: { records: 0, sourceRecords: 0, activeProjects: 0, linkedPartnerDecisionRecords: 0, linkedFilesRecords: 0, linkedForecastRecords: 0, milestones: 0, workItems: 0, dependencies: 0, evidenceLinks: 0, forecastImpacts: 0, reviewActions: 0, readinessScore: 0, blockers: 0, overdue: 0, criticalPathItems: 0, scheduleContingencyDays: null, targetOpeningDate: "2026-10-01", freshnessMinutes: null },
    cards: [], records: [], controls: { families: [], statuses: [], priorities: [], owners: [], milestones: [], sourceBacked: true, roleScoped: true },
    actions: { stageWorkItemAllowed: access.canStageWorkItem, commandRoute: "/api/crays/core-command/project-work-item", confirmationHeader: "stage-project-work-item-command", applyGate: "OPEN_DEV_PROJECT_WORK_ITEM_APPLY" },
    boundaries: { projectApplyEnabled: false, sourceWritesEnabled: false, syncApplyEnabled: false, uploadsEnabled: false, privatePreviewEnabled: false, externalSendingEnabled: false, stakeholderReleaseEnabled: false, financePostingEnabled: false, paymentInitiationEnabled: false, bankSendEnabled: false, liveAiEnabled: false, secretsReturned: false, privateKeysReturned: false },
    queryStatus,
  };
}

const countFamily = (records: OpeningProjectRecord[], family: string) => records.filter((record) => record.family === family).length;
const metric = (records: OpeningProjectRecord[], key: string) => records.find((record) => text(record.fields.metricKey) === key)?.value ?? null;
const numericMetric = (records: OpeningProjectRecord[], key: string) => num(metric(records, key));
function statusFor(records: OpeningProjectRecord[], family: string): CardStatus { const scoped = records.filter((record) => record.family === family); if (scoped.some((record) => record.status === "blocked" || record.priority === "critical")) return "blocked"; if (scoped.some((record) => record.status === "attention" || record.priority === "high")) return "attention"; return "ready"; }
function cards(records: OpeningProjectRecord[]): OpeningProjectReadModel["cards"] {
  const readiness = numericMetric(records, "opening_readiness") ?? 0;
  return [
    { key: "overview", label: "Opening readiness", value: `${readiness}%`, context: "Partner decision is converted into an owned opening plan.", status: statusFor(records, "project-summary"), filterFamily: "project-summary" },
    { key: "milestones", label: "Milestones", value: `${countFamily(records, "milestone")}`, context: "Opening milestones connect lease, fit-out, equipment, staffing, training and launch.", status: statusFor(records, "milestone"), filterFamily: "milestone" },
    { key: "work-items", label: "Owned work", value: `${countFamily(records, "work-item")}`, context: "Every work item has an owner, due date, milestone and safe next action.", status: statusFor(records, "work-item"), filterFamily: "work-item" },
    { key: "dependencies", label: "Critical path", value: `${countFamily(records, "dependency")}`, context: "Dependencies expose schedule impact rather than hiding delay risk.", status: statusFor(records, "dependency"), filterFamily: "dependency" },
    { key: "evidence", label: "Evidence links", value: `${countFamily(records, "evidence-link")}`, context: "Evidence metadata links Project and Files without upload or private preview.", status: statusFor(records, "evidence-link"), filterFamily: "evidence-link" },
    { key: "forecast", label: "Forecast impact", value: `${countFamily(records, "forecast-impact")}`, context: "Schedule risks connect to cash and forecast impact without finance posting.", status: statusFor(records, "forecast-impact"), filterFamily: "forecast-impact" },
    { key: "actions", label: "Review actions", value: `${countFamily(records, "opening-review-actions")}`, context: "Guarded Project command drafts capture reviewed next work.", status: statusFor(records, "opening-review-actions"), filterFamily: "opening-review-actions" },
  ].filter((card) => card.value !== "0");
}

function groupOptions(records: OpeningProjectRecord[], selector: (record: OpeningProjectRecord) => string, labeler = titleCase) { const counts = new Map<string, number>(); for (const record of records) { const key = selector(record); if (key) counts.set(key, (counts.get(key) ?? 0) + 1); } return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => ({ key, label: labeler(key), rows })); }
async function linkedCount(system: string, batch: string) { const result = await getCorePgPool().query<{ count: string }>(`select count(*)::text as count from crays_core.external_record_maps where external_system=$1 and coalesce(metadata->>'seedBatch',metadata->'fields'->>'seedBatch')=$2`, [system, batch]); return Number.parseInt(result.rows[0]?.count ?? "0", 10); }

export function getOpeningProjectReadModelCacheKey(role: RoleKey) {
  return JSON.stringify({ role, seedBatch, partnerDecisionBatch, filesBatch, forecastBatch });
}

export function getCachedOpeningProjectReadModel(role: RoleKey): OpeningProjectReadModel | null {
  return readModelCacheGet<OpeningProjectReadModel>(cacheNamespace, getOpeningProjectReadModelCacheKey(role));
}

export async function getOpeningProjectReadModel(role: RoleKey): Promise<OpeningProjectReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured || !access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");
  const cacheKey = getOpeningProjectReadModelCacheKey(role);
  const cached = readModelCacheGet<OpeningProjectReadModel>(cacheNamespace, cacheKey);
  if (cached) return cached;
  const [result, linkedPartnerDecisionRecords, linkedFilesRecords, linkedForecastRecords] = await Promise.all([
    getCorePgPool().query<SourceRow>(`select external_entity_type,external_entity_id,crays_entity_type,crays_entity_id,sync_status,last_synced_at,metadata from crays_core.external_record_maps where external_system='opening-project-engine' and metadata->>'seedBatch'=$1 order by external_entity_type,external_entity_id`, [seedBatch]),
    linkedCount("franchise-partner-decision-engine", partnerDecisionBatch), linkedCount("files-engine", filesBatch), linkedCount("financial-forecast-5y", forecastBatch),
  ]);
  const allRecords = result.rows.map((row) => mapRecord(row, role));
  const records = allRecords.filter((record) => visibleFor(record, access)).sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.priority] ?? 4) - ({ critical: 0, high: 1, medium: 2, low: 3 }[b.priority] ?? 4) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.label.localeCompare(b.label));
  const model = empty(role, access, "schema_ready");
  const latestMs = Math.max(...records.map((record) => record.lastSyncedAt ? Date.parse(record.lastSyncedAt) : 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const activeProjectIds = new Set(records.map((record) => text(record.fields.projectId, model.projectContext.projectId)));
  const firstPortfolioRecord = records.find((record) => text(record.fields.projectId));
  const firstTargetOpeningDate = text(firstPortfolioRecord?.fields.targetOpeningDate, model.projectContext.targetOpeningDate);
  const projectContext = activeProjectIds.size > 1
    ? { ...model.projectContext, projectId: "opening_project_portfolio_active_2026", decisionId: "partner_decision_portfolio_active_2026", dealId: "deal_case_portfolio_active_2026", propertyCaseId: "property_case_portfolio_active_2026", studioId: "studio_portfolio_active_openings", studioName: `${activeProjectIds.size} active Opening Projects`, siteName: "Portfolio opening pipeline", address: "Multiple verified German markets", partnerName: "Multiple franchise partners", partnerCompany: "Multiple partner operating companies", targetOpeningDate: firstTargetOpeningDate, journey: "Portfolio -> Opening project -> Critical path -> Evidence -> Guarded command staging" }
    : model.projectContext;
  const readModel: OpeningProjectReadModel = { ...model, projectContext, summary: { records: records.length, sourceRecords: allRecords.length, activeProjects: activeProjectIds.size, linkedPartnerDecisionRecords, linkedFilesRecords, linkedForecastRecords, milestones: countFamily(records, "milestone"), workItems: countFamily(records, "work-item"), dependencies: countFamily(records, "dependency"), evidenceLinks: countFamily(records, "evidence-link"), forecastImpacts: countFamily(records, "forecast-impact"), reviewActions: countFamily(records, "opening-review-actions"), readinessScore: numericMetric(allRecords, "opening_readiness") ?? 0, blockers: records.filter((record) => record.status === "blocked" || record.priority === "critical").length, overdue: records.filter((record) => record.dueDate && record.dueDate < today && record.status !== "ready").length, criticalPathItems: numericMetric(allRecords, "critical_path_items") ?? activeProjectIds.size, scheduleContingencyDays: numericMetric(allRecords, "opening_contingency"), targetOpeningDate: firstTargetOpeningDate, freshnessMinutes: latestMs ? Math.max(0, Math.round((Date.now() - latestMs) / 60000)) : null }, cards: cards(records), records, controls: { families: groupOptions(records, (record) => record.family, (key) => familyLabels[key] ?? titleCase(key)), statuses: groupOptions(records, (record) => record.status), priorities: groupOptions(records, (record) => record.priority), owners: groupOptions(records, (record) => record.owner), milestones: groupOptions(records.filter((record) => record.milestoneId), (record) => record.milestoneId ?? ""), sourceBacked: true, roleScoped: true } };
  return readModelCacheSet(cacheNamespace, cacheKey, readModel, cacheTtlMs);
}

export function formatOpeningProjectValue(value: string | number | boolean | null, unit: string | null) {
  if (value === null) return "Not available";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value.replaceAll("_", " ");
  if (unit === "EUR") return `EUR ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (unit === "percent") return `${value}%`;
  if (unit === "score") return `${Math.round(value)}/100`;
  if (unit === "days") return `${value} days`;
  return Math.round(value).toLocaleString("en-US");
}
