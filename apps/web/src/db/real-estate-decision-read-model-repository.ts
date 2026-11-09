import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "real_estate_full" | "real_estate_partner_scoped" | "release_blocked" | "forbidden";
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

export type RealEstateDecisionRecord = {
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
  nextAction: string;
  href: string;
  dueDate: string | null;
  lastSyncedAt: string | null;
  fields: JsonRecord;
};

export type RealEstateDecisionReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
    canStageDecisionReview: boolean;
    canViewInternalRecords: boolean;
    canViewPartnerScopedRecords: boolean;
  };
  decisionContext: {
    decisionId: string;
    propertyCaseId: string;
    preparedOfferId: string;
    dealId: string;
    siteName: string;
    address: string;
    landlordCompany: string;
    landlordContact: string;
    candidateName: string;
    candidateCompany: string;
    journey: string;
  };
  summary: {
    records: number;
    sourceRecords: number;
    linkedLocationRecords: number;
    linkedFinancialWorkbookRecords: number;
    linkedForecastRecords: number;
    linkedBankPackageRecords: number;
    leaseDecisionRecords: number;
    leaseEconomics: number;
    locationFit: number;
    propertyEvidence: number;
    financialFit: number;
    redactions: number;
    reviewActions: number;
    readinessScore: number;
    blockers: number;
    attention: number;
    conflicts: number;
    monthlyBaseRent: number | null;
    rentPerSquareMeter: number | null;
    year3RentRatio: number | null;
    year5RentRatio: number | null;
    freshnessMinutes: number | null;
  };
  decisionCards: Array<{
    key: string;
    label: string;
    value: string;
    context: string;
    status: DecisionStatus;
    filterFamily: string;
  }>;
  records: RealEstateDecisionRecord[];
  controls: {
    families: Array<{ key: string; label: string; rows: number }>;
    statuses: Array<{ key: string; label: string; rows: number }>;
    priorities: Array<{ key: string; label: string; rows: number }>;
    audiences: Array<{ key: string; label: string; rows: number }>;
    sourceBacked: true;
    roleScoped: true;
  };
  actions: {
    stageDecisionReviewAllowed: boolean;
    commandRoute: "/api/crays/core-command/project-work-item";
    confirmationHeader: "stage-project-work-item-command";
    applyGate: "OPEN_DEV_PROJECT_WORK_ITEM_APPLY";
  };
  boundaries: {
    landlordReleaseEnabled: false;
    ownerSendEnabled: false;
    leaseSigningEnabled: false;
    packagePublicationEnabled: false;
    uploadsEnabled: false;
    externalSendingEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
    financePostingEnabled: false;
    paymentInitiationEnabled: false;
    liveAiEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const seedBatch = "crays-real-estate-decision-20260713-v1";
const locationSeedBatch = "crays-location-intelligence-rotkreuzplatz-20260712-v1";
const workbookSeedBatch = "crays-financial-workbook-rotkreuzplatz-20260712-v1";
const forecastSeedBatch = "crays-financial-forecast-5y-rotkreuzplatz-20260712-v1";
const bankPackageSeedBatch = "crays-bank-package-workflow-20260713-v1";

const fullRoles: RoleKey[] = ["admin", "crays-management", "expansion-manager", "deal-manager", "finance", "reviewer"];
const partnerScopedRoles: RoleKey[] = ["landlord", "franchise-partner"];
const releaseBlockedRoles: RoleKey[] = ["guest", "franchise-candidate", "bank-partner", "gym-member", "vendor", "investor", "studio-manager", "hr"];

function accessForRole(role: RoleKey): RealEstateDecisionReadModel["access"] {
  if (fullRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "real_estate_full",
      reason: "Role can inspect internal lease evidence, financial fit, location fit, redactions, blockers and guarded review actions.",
      canStageDecisionReview: ["expansion-manager", "deal-manager"].includes(role),
      canViewInternalRecords: true,
      canViewPartnerScopedRecords: true,
    };
  }

  if (partnerScopedRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "real_estate_partner_scoped",
      reason: "Role can inspect scoped lease decision metrics only; release, send, upload and signing remain closed.",
      canStageDecisionReview: false,
      canViewInternalRecords: false,
      canViewPartnerScopedRecords: true,
    };
  }

  if (releaseBlockedRoles.includes(role)) {
    return {
      role,
      allowed: false,
      level: "release_blocked",
      reason: "This role requires a reviewed Real Estate Partner release before lease decision records are visible.",
      canStageDecisionReview: false,
      canViewInternalRecords: false,
      canViewPartnerScopedRecords: false,
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Role is outside the Real Estate Decision workflow scope.",
    canStageDecisionReview: false,
    canViewInternalRecords: false,
    canViewPartnerScopedRecords: false,
  };
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

function bool(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function titleCase(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function familyLabel(family: string) {
  const labels: Record<string, string> = {
    "lease-decision-summary": "Lease decision",
    "lease-economics": "Lease economics",
    "location-fit": "Location fit",
    "property-evidence": "Property evidence",
    "financial-fit": "Financial fit",
    "release-redactions": "Release redactions",
    "real-estate-review-actions": "Review actions",
  };
  return labels[family] ?? titleCase(family);
}

function money(value: number | null) {
  if (value === null) return "not available";
  return `EUR ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function valueLabel(value: string | number | boolean | null, unit: string | null) {
  if (value === null) return "not available";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value.replaceAll("_", " ");
  if (unit === "EUR" || unit === "EUR_per_sqm") return money(value);
  if (unit === "percent") return `${(value * 100).toFixed(1)}%`;
  if (unit === "score") return `${Math.round(value * (value <= 1 ? 100 : 1))}/100`;
  if (unit === "years") return `${value.toFixed(1)} years`;
  return Math.round(value).toLocaleString("en-US");
}

function rowFromMetadata(metadata: JsonRecord | null) {
  return asRecord(metadata?.row);
}

function fieldsFromMetadata(metadata: JsonRecord | null) {
  return asRecord(rowFromMetadata(metadata).fields);
}

function hrefFor(family: string, role: RoleKey) {
  const roleParam = encodeURIComponent(role);
  if (family === "location-fit") return `/analytics?role=${roleParam}&view=location-intelligence`;
  if (family === "financial-fit") return `/analytics?role=${roleParam}&view=financial-model`;
  if (family === "property-evidence" || family === "release-redactions") return `/files?role=${roleParam}&view=packages&record=real-estate`;
  if (family === "real-estate-review-actions") return `/dashboard?role=${roleParam}&view=actions`;
  return `/project?role=${roleParam}&view=real-estate-decision`;
}

function mapRecord(row: SourceRow, role: RoleKey): RealEstateDecisionRecord {
  const sourceRow = rowFromMetadata(row.metadata);
  const fields = fieldsFromMetadata(row.metadata);
  const family = row.external_entity_type;
  return {
    id: `${family}:${row.external_entity_id}`,
    family,
    label: text(sourceRow.label, row.external_entity_id),
    craysEntityType: row.crays_entity_type,
    craysEntityId: row.crays_entity_id,
    status: text(fields.status, text(sourceRow.status, row.sync_status)),
    priority: text(sourceRow.priority, text(fields.priority, row.sync_status === "conflict" ? "high" : "medium")),
    owner: text(sourceRow.owner, text(fields.ownerRole, "Expansion Manager")),
    audience: text(fields.audience, "Real Estate Partner"),
    value: (fields.value as string | number | boolean | null | undefined) ?? null,
    unit: text(fields.unit) || null,
    context: text(fields.context, text(fields.currentState, "Review real estate decision source record.")),
    nextAction: text(fields.nextAction, "Review real estate decision record."),
    href: hrefFor(family, role),
    dueDate: text(sourceRow.dueDate, text(fields.dueDate, "")) || null,
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
    fields,
  };
}

function redactScopedText(value: string) {
  return value
    .replaceAll("Lea Schneider", "Scoped franchise operator")
    .replaceAll("Schneider Fitness Beteiligungs GmbH", "Scoped operator company")
    .replaceAll("schneider_fitness", "scoped_operator")
    .replaceAll("Schneider Fitness", "Scoped Operator")
    .replaceAll("schneider fitness", "scoped operator")
    .replaceAll("candidate private notes", "restricted internal notes")
    .replaceAll("Internal finance sensitivity", "Restricted finance sensitivity")
    .replaceAll("internal finance sensitivity", "restricted finance sensitivity")
    .replaceAll("bank workpapers", "restricted finance workpapers");
}

function redactScopedValue(value: unknown): unknown {
  if (typeof value === "string") return redactScopedText(value);
  if (Array.isArray(value)) return value.map((item) => redactScopedValue(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as JsonRecord).map(([key, entry]) => [key, redactScopedValue(entry)]));
}

function redactForScopedAccess(record: RealEstateDecisionRecord): RealEstateDecisionRecord {
  const fields = redactScopedValue(record.fields) as JsonRecord;
  delete fields.candidateName;
  delete fields.landlordContact;
  delete fields.hiddenForLandlord;
  delete fields.internalNotes;
  return {
    ...record,
    context: redactScopedText(record.context),
    nextAction: redactScopedText(record.nextAction),
    fields,
  };
}

function isPartnerSafe(record: RealEstateDecisionRecord) {
  if (record.family === "release-redactions" || record.family === "real-estate-review-actions") return false;
  if (record.audience === "Reviewer" || record.audience === "CRAYS Management") return false;
  return record.audience === "Real Estate Partner" || bool(record.fields.visibleForLandlord) || ["lease-economics", "location-fit", "property-evidence", "financial-fit"].includes(record.family);
}

function visibleFor(record: RealEstateDecisionRecord, access: RealEstateDecisionReadModel["access"]) {
  if (!access.allowed) return false;
  if (access.level === "real_estate_full") return true;
  if (access.level === "real_estate_partner_scoped") return isPartnerSafe(record);
  return false;
}

function empty(role: RoleKey, access: RealEstateDecisionReadModel["access"], queryStatus: RealEstateDecisionReadModel["queryStatus"]): RealEstateDecisionReadModel {
  return {
    access,
    decisionContext: {
      decisionId: access.canViewInternalRecords ? "real_estate_decision_munich_rotkreuzplatz_schneider_fitness" : "real_estate_decision_munich_rotkreuzplatz_scoped_operator",
      propertyCaseId: "property_case_gudrunstrasse_3_rotkreuzplatz",
      preparedOfferId: access.canViewInternalRecords ? "prepared_franchise_deal_munich_rotkreuzplatz_schneider_fitness" : "prepared_franchise_deal_munich_rotkreuzplatz_scoped_operator",
      dealId: access.canViewInternalRecords ? "deal_case_munich_rotkreuzplatz_schneider_fitness" : "deal_case_munich_rotkreuzplatz_scoped_operator",
      siteName: "Gudrunstrasse 3 Studio Lease",
      address: "Gudrunstrasse 3, 80634 Munich",
      landlordCompany: "Keller & Brandt Real Estate GmbH",
      landlordContact: access.canViewInternalRecords ? "Tobias Keller" : "Real estate partner contact scoped",
      candidateName: access.canViewInternalRecords ? "Lea Schneider" : "Scoped franchise operator",
      candidateCompany: access.canViewInternalRecords ? "Schneider Fitness Beteiligungs GmbH" : "Scoped operator company",
      journey: "Property evidence -> Location fit -> Lease economics -> Financial fit -> Redaction preflight -> Real Estate Partner decision",
    },
    summary: {
      records: 0,
      sourceRecords: 0,
      linkedLocationRecords: 0,
      linkedFinancialWorkbookRecords: 0,
      linkedForecastRecords: 0,
      linkedBankPackageRecords: 0,
      leaseDecisionRecords: 0,
      leaseEconomics: 0,
      locationFit: 0,
      propertyEvidence: 0,
      financialFit: 0,
      redactions: 0,
      reviewActions: 0,
      readinessScore: 0,
      blockers: 0,
      attention: 0,
      conflicts: 0,
      monthlyBaseRent: null,
      rentPerSquareMeter: null,
      year3RentRatio: null,
      year5RentRatio: null,
      freshnessMinutes: null,
    },
    decisionCards: [],
    records: [],
    controls: { families: [], statuses: [], priorities: [], audiences: [], sourceBacked: true, roleScoped: true },
    actions: {
      stageDecisionReviewAllowed: access.canStageDecisionReview,
      commandRoute: "/api/crays/core-command/project-work-item",
      confirmationHeader: "stage-project-work-item-command",
      applyGate: "OPEN_DEV_PROJECT_WORK_ITEM_APPLY",
    },
    boundaries: {
      landlordReleaseEnabled: false,
      ownerSendEnabled: false,
      leaseSigningEnabled: false,
      packagePublicationEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      financePostingEnabled: false,
      paymentInitiationEnabled: false,
      liveAiEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    queryStatus,
  };
}

function countFamily(records: RealEstateDecisionRecord[], family: string) {
  return records.filter((record) => record.family === family).length;
}

function metric(records: RealEstateDecisionRecord[], key: string) {
  return num(records.find((record) => text(record.fields.metricKey) === key)?.value);
}

function readiness(records: RealEstateDecisionRecord[]) {
  return Math.round(
    records.reduce((max, record) => {
      const score = typeof record.fields.readinessScore === "number" ? record.fields.readinessScore : 0;
      return score > max ? score : max;
    }, 0),
  );
}

function statusFor(records: RealEstateDecisionRecord[], family: string): DecisionStatus {
  const scoped = records.filter((record) => record.family === family);
  if (scoped.some((record) => record.status === "blocked" || record.priority === "critical")) return "blocked";
  if (scoped.some((record) => ["attention", "required", "review", "conditional"].includes(record.status) || record.priority === "high")) return "attention";
  return "ready";
}

function buildDecisionCards(records: RealEstateDecisionRecord[]): RealEstateDecisionReadModel["decisionCards"] {
  return [
    { key: "lease-decision", label: "Lease decision", value: `${readiness(records)}%`, context: "Lease decision is assembled, but partner release and send stay closed.", status: statusFor(records, "lease-decision-summary"), filterFamily: "lease-decision-summary" },
    { key: "lease-economics", label: "Lease economics", value: money(metric(records, "monthly_base_rent")), context: `${countFamily(records, "lease-economics")} lease economics records drive rent-fit and break-option review.`, status: statusFor(records, "lease-economics"), filterFamily: "lease-economics" },
    { key: "location-fit", label: "Location fit", value: `${countFamily(records, "location-fit")}`, context: "Location Intelligence records explain catchment, access, density and competition fit.", status: statusFor(records, "location-fit"), filterFamily: "location-fit" },
    { key: "property-evidence", label: "Property evidence", value: `${countFamily(records, "property-evidence")}`, context: "Files evidence supports lease draft, area, ownership, permits and technical handoff.", status: statusFor(records, "property-evidence"), filterFamily: "property-evidence" },
    { key: "financial-fit", label: "Financial fit", value: `${countFamily(records, "financial-fit")}`, context: "Financial plan, forecast, bank-package state and ledger quality determine lease confidence.", status: statusFor(records, "financial-fit"), filterFamily: "financial-fit" },
    { key: "redactions", label: "Release redactions", value: `${countFamily(records, "release-redactions")}`, context: "Reviewer redactions keep internal candidate, bank and finance workpapers out of partner scope.", status: statusFor(records, "release-redactions"), filterFamily: "release-redactions" },
    { key: "review-actions", label: "Review actions", value: `${countFamily(records, "real-estate-review-actions")}`, context: "Open review actions can stage guarded Project command drafts; release and send stay closed.", status: statusFor(records, "real-estate-review-actions"), filterFamily: "real-estate-review-actions" },
  ].filter((card) => card.value !== "0" && card.value !== "EUR 0");
}

async function linkedCount(externalSystem: string, batch: string) {
  const result = await getCorePgPool().query<{ count: string }>(
    `
      select count(*)::text as count
      from crays_core.external_record_maps
      where external_system = $1
        and coalesce(metadata ->> 'seedBatch', metadata -> 'fields' ->> 'seedBatch') = $2
    `,
    [externalSystem, batch],
  );
  return Number.parseInt(result.rows[0]?.count ?? "0", 10);
}

function groupOptions(records: RealEstateDecisionRecord[], field: keyof RealEstateDecisionRecord, labeler = titleCase) {
  const counts = new Map<string, number>();
  for (const record of records) {
    const key = String(record[field] ?? "");
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => ({ key, label: labeler(key), rows }));
}

export async function getRealEstateDecisionReadModel(role: RoleKey): Promise<RealEstateDecisionReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured || !access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");

  const [result, linkedLocationRecords, linkedFinancialWorkbookRecords, linkedForecastRecords, linkedBankPackageRecords] = await Promise.all([
    getCorePgPool().query<SourceRow>(
      `
        select external_entity_type, external_entity_id, crays_entity_type, crays_entity_id, sync_status, last_synced_at, metadata
        from crays_core.external_record_maps
        where external_system = 'real-estate-decision-engine'
          and metadata ->> 'seedBatch' = $1
        order by external_entity_type, external_entity_id
      `,
      [seedBatch],
    ),
    linkedCount("location-intelligence", locationSeedBatch),
    linkedCount("financial-workbook", workbookSeedBatch),
    linkedCount("financial-forecast-5y", forecastSeedBatch),
    linkedCount("bank-package-engine", bankPackageSeedBatch),
  ]);

  const allRecords = result.rows.map((row) => mapRecord(row, role));
  const records = allRecords
    .filter((record) => visibleFor(record, access))
    .map((record) => (access.canViewInternalRecords ? record : redactForScopedAccess(record)))
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, normal: 3, low: 4 } as Record<string, number>;
      return (priorityOrder[a.priority] ?? 5) - (priorityOrder[b.priority] ?? 5) || a.family.localeCompare(b.family) || a.label.localeCompare(b.label);
    });

  const model = empty(role, access, "schema_ready");
  const latestMs = Math.max(...records.map((record) => (record.lastSyncedAt ? Date.parse(record.lastSyncedAt) : 0)).filter(Boolean), 0);
  const freshnessMinutes = latestMs ? Math.max(0, Math.round((Date.now() - latestMs) / 60000)) : null;

  return {
    ...model,
    summary: {
      records: records.length,
      sourceRecords: allRecords.length,
      linkedLocationRecords,
      linkedFinancialWorkbookRecords,
      linkedForecastRecords,
      linkedBankPackageRecords,
      leaseDecisionRecords: countFamily(records, "lease-decision-summary"),
      leaseEconomics: countFamily(records, "lease-economics"),
      locationFit: countFamily(records, "location-fit"),
      propertyEvidence: countFamily(records, "property-evidence"),
      financialFit: countFamily(records, "financial-fit"),
      redactions: countFamily(records, "release-redactions"),
      reviewActions: countFamily(records, "real-estate-review-actions"),
      readinessScore: readiness(allRecords),
      blockers: records.filter((record) => record.status === "blocked" || record.priority === "critical").length,
      attention: records.filter((record) => record.status === "attention" || record.priority === "high").length,
      conflicts: allRecords.filter((record) => record.status === "blocked" || record.priority === "critical").length,
      monthlyBaseRent: metric(allRecords, "monthly_base_rent"),
      rentPerSquareMeter: metric(allRecords, "rent_per_sqm"),
      year3RentRatio: metric(allRecords, "year3_rent_ratio"),
      year5RentRatio: metric(allRecords, "year5_rent_ratio"),
      freshnessMinutes,
    },
    decisionCards: buildDecisionCards(records),
    records,
    controls: {
      families: groupOptions(records, "family", familyLabel),
      statuses: groupOptions(records, "status", titleCase),
      priorities: groupOptions(records, "priority", titleCase),
      audiences: groupOptions(records, "audience", titleCase),
      sourceBacked: true,
      roleScoped: true,
    },
  };
}

export function formatRealEstateDecisionValue(value: string | number | boolean | null, unit: string | null) {
  return valueLabel(value, unit);
}
