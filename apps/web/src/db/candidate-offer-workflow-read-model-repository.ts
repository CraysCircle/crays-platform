import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "candidate_offer_full" | "candidate_scoped" | "release_blocked" | "forbidden";
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

export type CandidateOfferWorkflowRecord = {
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

export type CandidateOfferWorkflowReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
    canStageOfferReview: boolean;
    canViewInternalRecords: boolean;
    canViewCandidateScopedRecords: boolean;
  };
  offerContext: {
    offerId: string;
    dealId: string;
    propertyCaseId: string;
    candidateName: string;
    candidateCompany: string;
    siteName: string;
    address: string;
    journey: string;
  };
  summary: {
    records: number;
    sourceRecords: number;
    linkedFinancialWorkbookRecords: number;
    linkedForecastRecords: number;
    linkedLocationRecords: number;
    linkedBankPackageRecords: number;
    linkedRealEstateRecords: number;
    linkedFilesRecords: number;
    offerSummaries: number;
    candidateIntent: number;
    financialDecision: number;
    locationDecision: number;
    bankPackageReadiness: number;
    realEstateReadiness: number;
    evidencePackage: number;
    redactions: number;
    reviewActions: number;
    readinessScore: number;
    blockers: number;
    attention: number;
    conflicts: number;
    midCaseYear3Revenue: number | null;
    paybackYears: number | null;
    equityRequirement: number | null;
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
  records: CandidateOfferWorkflowRecord[];
  controls: {
    families: Array<{ key: string; label: string; rows: number }>;
    statuses: Array<{ key: string; label: string; rows: number }>;
    priorities: Array<{ key: string; label: string; rows: number }>;
    audiences: Array<{ key: string; label: string; rows: number }>;
    sourceBacked: true;
    roleScoped: true;
  };
  actions: {
    stageOfferReviewAllowed: boolean;
    commandRoute: "/api/crays/core-command/crm-activity";
    confirmationHeader: "stage-crm-activity-command";
    applyGate: "OPEN_DEV_CRM_ACTIVITY_APPLY";
  };
  boundaries: {
    candidateReleaseEnabled: false;
    publicReleaseEnabled: false;
    candidateSendEnabled: false;
    candidatePortalSubmissionEnabled: false;
    uploadsEnabled: false;
    externalSendingEnabled: false;
    bankSendEnabled: false;
    leaseSigningEnabled: false;
    financePostingEnabled: false;
    paymentInitiationEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
    liveAiEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const seedBatch = "crays-candidate-offer-workflow-20260713-v1";
const workbookSeedBatch = "crays-financial-workbook-rotkreuzplatz-20260712-v1";
const forecastSeedBatch = "crays-financial-forecast-5y-rotkreuzplatz-20260712-v1";
const locationSeedBatch = "crays-location-intelligence-rotkreuzplatz-20260712-v1";
const bankPackageSeedBatch = "crays-bank-package-workflow-20260713-v1";
const realEstateSeedBatch = "crays-real-estate-decision-20260713-v1";
const filesSeedBatch = "crays-files-workflow-20260712-v1";

const fullRoles: RoleKey[] = ["admin", "crays-management", "deal-manager", "reviewer", "finance", "expansion-manager"];
const candidateScopedRoles: RoleKey[] = ["franchise-candidate", "franchise-partner"];
const releaseBlockedRoles: RoleKey[] = ["guest", "bank-partner", "landlord", "gym-member", "vendor", "investor", "studio-manager", "hr"];

function accessForRole(role: RoleKey): CandidateOfferWorkflowReadModel["access"] {
  if (fullRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "candidate_offer_full",
      reason: "Role can inspect internal candidate offer records, blockers, redactions and guarded CRM follow-up actions.",
      canStageOfferReview: ["deal-manager", "reviewer"].includes(role),
      canViewInternalRecords: true,
      canViewCandidateScopedRecords: true,
    };
  }

  if (candidateScopedRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "candidate_scoped",
      reason: "Role can inspect candidate-safe offer readiness only; release, submission, uploads and sends remain closed.",
      canStageOfferReview: false,
      canViewInternalRecords: false,
      canViewCandidateScopedRecords: true,
    };
  }

  if (releaseBlockedRoles.includes(role)) {
    return {
      role,
      allowed: false,
      level: "release_blocked",
      reason: "This role requires a reviewed Candidate Offer release before offer records are visible.",
      canStageOfferReview: false,
      canViewInternalRecords: false,
      canViewCandidateScopedRecords: false,
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Role is outside the Candidate Offer workflow scope.",
    canStageOfferReview: false,
    canViewInternalRecords: false,
    canViewCandidateScopedRecords: false,
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
    "offer-summary": "Offer summary",
    "candidate-intent": "Candidate intent",
    "financial-decision": "Financial decision",
    "location-decision": "Location decision",
    "bank-package-readiness": "Bank package",
    "real-estate-readiness": "Real estate",
    "evidence-package": "Evidence package",
    "candidate-redactions": "Candidate redactions",
    "offer-review-actions": "Review actions",
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
  if (unit === "ratio") return `${value.toFixed(1)}x`;
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
  if (family === "financial-decision") return `/analytics?role=${roleParam}&view=financial-model`;
  if (family === "location-decision") return `/analytics?role=${roleParam}&view=location-intelligence`;
  if (family === "bank-package-readiness") return `/loans?role=${roleParam}&view=bank-package`;
  if (family === "real-estate-readiness") return `/project?role=${roleParam}&view=real-estate-decision`;
  if (family === "evidence-package" || family === "candidate-redactions") return `/files?role=${roleParam}&view=package-builder&record=packages`;
  if (family === "offer-review-actions") return `/dashboard?role=${roleParam}&view=actions`;
  return `/crm?role=${roleParam}&view=candidate-offer`;
}

function mapRecord(row: SourceRow, role: RoleKey): CandidateOfferWorkflowRecord {
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
    owner: text(sourceRow.owner, text(fields.ownerRole, "Deal Manager")),
    audience: text(fields.audience, "Franchise Candidate"),
    value: (fields.value as string | number | boolean | null | undefined) ?? null,
    unit: text(fields.unit) || null,
    context: text(fields.context, text(fields.currentState, "Review candidate offer source record.")),
    nextAction: text(fields.nextAction, "Review candidate offer record."),
    href: hrefFor(family, role),
    dueDate: text(sourceRow.dueDate, text(fields.dueDate, "")) || null,
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
    fields,
  };
}

function redactScopedText(value: string) {
  return value
    .replaceAll("internal finance workpapers", "restricted finance material")
    .replaceAll("Internal finance workpapers", "Restricted finance material")
    .replaceAll("internal sensitivity workpapers", "restricted finance material")
    .replaceAll("bank workpapers", "restricted finance material")
    .replaceAll("Bank workpapers", "Restricted finance material")
    .replaceAll("landlord private contact", "restricted real estate contact")
    .replaceAll("Landlord private contact", "Restricted real estate contact")
    .replaceAll("internal review notes", "restricted internal notes")
    .replaceAll("raw redaction workpapers", "restricted review material")
    .replaceAll("schneider_fitness", "candidate_operator")
    .replaceAll("org_schneider_fitness_beteiligungs", "candidate_operator_company");
}

function redactScopedValue(value: unknown): unknown {
  if (typeof value === "string") return redactScopedText(value);
  if (Array.isArray(value)) return value.map((item) => redactScopedValue(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as JsonRecord).map(([key, entry]) => [key, redactScopedValue(entry)]));
}

function redactForScopedAccess(record: CandidateOfferWorkflowRecord): CandidateOfferWorkflowRecord {
  const fields = redactScopedValue(record.fields) as JsonRecord;
  delete fields.hiddenForCandidate;
  delete fields.internalNotes;
  delete fields.landlordContact;
  return {
    ...record,
    context: redactScopedText(record.context),
    nextAction: redactScopedText(record.nextAction),
    fields,
  };
}

function isCandidateSafe(record: CandidateOfferWorkflowRecord) {
  if (record.family === "candidate-redactions" || record.family === "offer-review-actions") return false;
  if (record.audience === "Reviewer" || record.audience === "CRAYS Management") return false;
  return record.audience === "Franchise Candidate" || bool(record.fields.visibleForCandidate);
}

function visibleFor(record: CandidateOfferWorkflowRecord, access: CandidateOfferWorkflowReadModel["access"]) {
  if (!access.allowed) return false;
  if (access.level === "candidate_offer_full") return true;
  if (access.level === "candidate_scoped") return isCandidateSafe(record);
  return false;
}

function empty(role: RoleKey, access: CandidateOfferWorkflowReadModel["access"], queryStatus: CandidateOfferWorkflowReadModel["queryStatus"]): CandidateOfferWorkflowReadModel {
  return {
    access,
    offerContext: {
      offerId: access.canViewInternalRecords ? "prepared_franchise_deal_munich_rotkreuzplatz_schneider_fitness" : "prepared_franchise_deal_munich_rotkreuzplatz_candidate_operator",
      dealId: access.canViewInternalRecords ? "deal_case_munich_rotkreuzplatz_schneider_fitness" : "deal_case_munich_rotkreuzplatz_candidate_operator",
      propertyCaseId: "property_case_gudrunstrasse_3_rotkreuzplatz",
      candidateName: access.canViewInternalRecords || role === "franchise-candidate" ? "Lea Schneider" : "Scoped franchise candidate",
      candidateCompany: access.canViewInternalRecords || role === "franchise-candidate" ? "Schneider Fitness Beteiligungs GmbH" : "Scoped operator company",
      siteName: "Gudrunstrasse 3 Studio Lease",
      address: "Gudrunstrasse 3, 80634 Munich",
      journey: "Candidate intent -> Financial decision -> Location decision -> Bank package -> Real estate readiness -> Evidence package -> Candidate Offer review",
    },
    summary: {
      records: 0,
      sourceRecords: 0,
      linkedFinancialWorkbookRecords: 0,
      linkedForecastRecords: 0,
      linkedLocationRecords: 0,
      linkedBankPackageRecords: 0,
      linkedRealEstateRecords: 0,
      linkedFilesRecords: 0,
      offerSummaries: 0,
      candidateIntent: 0,
      financialDecision: 0,
      locationDecision: 0,
      bankPackageReadiness: 0,
      realEstateReadiness: 0,
      evidencePackage: 0,
      redactions: 0,
      reviewActions: 0,
      readinessScore: 0,
      blockers: 0,
      attention: 0,
      conflicts: 0,
      midCaseYear3Revenue: null,
      paybackYears: null,
      equityRequirement: null,
      freshnessMinutes: null,
    },
    decisionCards: [],
    records: [],
    controls: { families: [], statuses: [], priorities: [], audiences: [], sourceBacked: true, roleScoped: true },
    actions: {
      stageOfferReviewAllowed: access.canStageOfferReview,
      commandRoute: "/api/crays/core-command/crm-activity",
      confirmationHeader: "stage-crm-activity-command",
      applyGate: "OPEN_DEV_CRM_ACTIVITY_APPLY",
    },
    boundaries: {
      candidateReleaseEnabled: false,
      publicReleaseEnabled: false,
      candidateSendEnabled: false,
      candidatePortalSubmissionEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
      bankSendEnabled: false,
      leaseSigningEnabled: false,
      financePostingEnabled: false,
      paymentInitiationEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      liveAiEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    queryStatus,
  };
}

function countFamily(records: CandidateOfferWorkflowRecord[], family: string) {
  return records.filter((record) => record.family === family).length;
}

function metric(records: CandidateOfferWorkflowRecord[], key: string) {
  return num(records.find((record) => text(record.fields.metricKey) === key)?.value);
}

function readiness(records: CandidateOfferWorkflowRecord[]) {
  return Math.round(
    records.reduce((max, record) => {
      const score = typeof record.fields.readinessScore === "number" ? record.fields.readinessScore : 0;
      return score > max ? score : max;
    }, 0),
  );
}

function statusFor(records: CandidateOfferWorkflowRecord[], family: string): DecisionStatus {
  const scoped = records.filter((record) => record.family === family);
  if (scoped.some((record) => record.status === "blocked" || record.priority === "critical")) return "blocked";
  if (scoped.some((record) => ["attention", "required", "review", "conditional"].includes(record.status) || record.priority === "high")) return "attention";
  return "ready";
}

function buildDecisionCards(records: CandidateOfferWorkflowRecord[]): CandidateOfferWorkflowReadModel["decisionCards"] {
  return [
    { key: "offer-summary", label: "Offer summary", value: `${readiness(records)}%`, context: "Candidate offer is assembled internally; release and send stay closed.", status: statusFor(records, "offer-summary"), filterFamily: "offer-summary" },
    { key: "candidate-intent", label: "Candidate intent", value: `${countFamily(records, "candidate-intent")}`, context: "Candidate qualification, equity proof and intent dependencies drive offer readiness.", status: statusFor(records, "candidate-intent"), filterFamily: "candidate-intent" },
    { key: "financial-decision", label: "Financial decision", value: money(metric(records, "mid_case_year3_result")), context: "Financial Workbook and forecast KPIs explain the candidate investment decision.", status: statusFor(records, "financial-decision"), filterFamily: "financial-decision" },
    { key: "location-decision", label: "Location decision", value: `${countFamily(records, "location-decision")}`, context: "Location Intelligence records explain catchment, rent fit and competitive context.", status: statusFor(records, "location-decision"), filterFamily: "location-decision" },
    { key: "bank-package", label: "Bank package", value: `${countFamily(records, "bank-package-readiness")}`, context: "Bank package status is summarized without restricted finance material or sends.", status: statusFor(records, "bank-package-readiness"), filterFamily: "bank-package-readiness" },
    { key: "real-estate", label: "Real estate", value: `${countFamily(records, "real-estate-readiness")}`, context: "Lease readiness is summarized without private owner contact or signing.", status: statusFor(records, "real-estate-readiness"), filterFamily: "real-estate-readiness" },
    { key: "evidence", label: "Evidence package", value: `${countFamily(records, "evidence-package")}`, context: "Files evidence controls what can become candidate-safe offer material.", status: statusFor(records, "evidence-package"), filterFamily: "evidence-package" },
    { key: "redactions", label: "Candidate redactions", value: `${countFamily(records, "candidate-redactions")}`, context: "Reviewer redactions keep restricted material out of candidate scope.", status: statusFor(records, "candidate-redactions"), filterFamily: "candidate-redactions" },
    { key: "actions", label: "Review actions", value: `${countFamily(records, "offer-review-actions")}`, context: "Open review actions can stage guarded CRM tasks; release and send stay closed.", status: statusFor(records, "offer-review-actions"), filterFamily: "offer-review-actions" },
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

function groupOptions(records: CandidateOfferWorkflowRecord[], field: keyof CandidateOfferWorkflowRecord, labeler = titleCase) {
  const counts = new Map<string, number>();
  for (const record of records) {
    const key = String(record[field] ?? "");
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => ({ key, label: labeler(key), rows }));
}

export async function getCandidateOfferWorkflowReadModel(role: RoleKey): Promise<CandidateOfferWorkflowReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured || !access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");

  const [result, linkedFinancialWorkbookRecords, linkedForecastRecords, linkedLocationRecords, linkedBankPackageRecords, linkedRealEstateRecords, linkedFilesRecords] = await Promise.all([
    getCorePgPool().query<SourceRow>(
      `
        select external_entity_type, external_entity_id, crays_entity_type, crays_entity_id, sync_status, last_synced_at, metadata
        from crays_core.external_record_maps
        where external_system = 'candidate-offer-engine'
          and metadata ->> 'seedBatch' = $1
        order by external_entity_type, external_entity_id
      `,
      [seedBatch],
    ),
    linkedCount("financial-workbook", workbookSeedBatch),
    linkedCount("financial-forecast-5y", forecastSeedBatch),
    linkedCount("location-intelligence", locationSeedBatch),
    linkedCount("bank-package-engine", bankPackageSeedBatch),
    linkedCount("real-estate-decision-engine", realEstateSeedBatch),
    linkedCount("files-engine", filesSeedBatch),
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
      linkedFinancialWorkbookRecords,
      linkedForecastRecords,
      linkedLocationRecords,
      linkedBankPackageRecords,
      linkedRealEstateRecords,
      linkedFilesRecords,
      offerSummaries: countFamily(records, "offer-summary"),
      candidateIntent: countFamily(records, "candidate-intent"),
      financialDecision: countFamily(records, "financial-decision"),
      locationDecision: countFamily(records, "location-decision"),
      bankPackageReadiness: countFamily(records, "bank-package-readiness"),
      realEstateReadiness: countFamily(records, "real-estate-readiness"),
      evidencePackage: countFamily(records, "evidence-package"),
      redactions: countFamily(records, "candidate-redactions"),
      reviewActions: countFamily(records, "offer-review-actions"),
      readinessScore: readiness(allRecords),
      blockers: records.filter((record) => record.status === "blocked" || record.priority === "critical").length,
      attention: records.filter((record) => record.status === "attention" || record.priority === "high").length,
      conflicts: allRecords.filter((record) => record.status === "blocked" || record.priority === "critical").length,
      midCaseYear3Revenue: metric(allRecords, "mid_case_year3_result"),
      paybackYears: metric(allRecords, "payback_years"),
      equityRequirement: metric(allRecords, "candidate_equity_requirement"),
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

export function formatCandidateOfferWorkflowValue(value: string | number | boolean | null, unit: string | null) {
  return valueLabel(value, unit);
}
