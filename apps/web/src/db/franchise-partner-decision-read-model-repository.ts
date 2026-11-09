import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "partner_decision_full" | "partner_decision_partner_scoped" | "partner_decision_bank_scoped" | "release_blocked" | "forbidden";
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

type CommandRow = {
  command_id: string;
  actor_role: string;
  command_status: string;
  target_apply_status: string;
  input_payload: JsonRecord | null;
  created_at: Date;
};

export type FranchisePartnerDecisionRecord = {
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
  href: string;
  dueDate: string | null;
  lastSyncedAt: string | null;
  fields: JsonRecord;
};

export type FranchisePartnerDecisionReadModel = {
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
    offerId: string;
    dealId: string;
    propertyCaseId: string;
    partnerName: string;
    partnerCompany: string;
    siteName: string;
    address: string;
    journey: string;
  };
  summary: {
    records: number;
    sourceRecords: number;
    linkedCandidateOfferRecords: number;
    linkedFinancialWorkbookRecords: number;
    linkedForecastRecords: number;
    linkedBankPackageRecords: number;
    linkedRealEstateRecords: number;
    linkedFilesRecords: number;
    linkedPartnerPerformanceRecords: number;
    linkedOperationsRecords: number;
    decisionSummaries: number;
    investmentFit: number;
    operatingProof: number;
    bankAndLeaseConditions: number;
    evidencePackage: number;
    redactions: number;
    openingReadiness: number;
    reviewActions: number;
    readinessScore: number;
    blockers: number;
    attention: number;
    conflicts: number;
    year3Result: number | null;
    paybackYears: number | null;
    equityRequirement: number | null;
    freshnessMinutes: number | null;
    commandDrafts: number;
    latestCommandId: string | null;
  };
  decisionCards: Array<{ key: string; label: string; value: string; context: string; status: DecisionStatus; filterFamily: string }>;
  records: FranchisePartnerDecisionRecord[];
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
    commandRoute: "/api/crays/core-command/sync-preview";
    confirmationHeader: "stage-sync-preview-command";
    commandType: "diff_review";
    action: "classify_diff";
    applyGate: "OPEN_DEV_SYNC_APPLY";
  };
  history: Array<{ commandId: string; label: string; actorRole: string; status: string; targetApplyStatus: string; createdAt: string }>;
  boundaries: {
    partnerReleaseEnabled: false;
    publicReleaseEnabled: false;
    candidateReleaseEnabled: false;
    partnerSendEnabled: false;
    uploadsEnabled: false;
    externalSendingEnabled: false;
    bankSendEnabled: false;
    leaseSigningEnabled: false;
    financePostingEnabled: false;
    accountingExportsEnabled: false;
    paymentInitiationEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
    liveAiEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  sourceHealth: {
    systemKey: "franchise-partner-decision-engine";
    connectionId: "core_source_franchise_partner_decision";
    seedBatch: "crays-franchise-partner-decision-20260713-v1";
    records: number;
    conflicts: number;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const seedBatch = "crays-franchise-partner-decision-20260713-v1";
const sourceSystem = "franchise-partner-decision-engine";
const candidateOfferSeedBatch = "crays-candidate-offer-workflow-20260713-v1";
const workbookSeedBatch = "crays-financial-workbook-rotkreuzplatz-20260712-v1";
const forecastSeedBatch = "crays-financial-forecast-5y-rotkreuzplatz-20260712-v1";
const bankSeedBatch = "crays-bank-package-workflow-20260713-v1";
const realEstateSeedBatch = "crays-real-estate-decision-20260713-v1";
const filesSeedBatch = "crays-files-workflow-20260712-v1";
const performanceSeedBatch = "crays-franchise-partner-performance-20260712-v1";
const operationsSeedBatch = "crays-studio-operations-recovery-20260712-v1";

const fullRoles: RoleKey[] = ["admin", "crays-management", "deal-manager", "finance", "reviewer", "expansion-manager"];
const partnerScopedRoles: RoleKey[] = ["franchise-partner"];
const bankScopedRoles: RoleKey[] = ["bank-partner"];
const blockedRoles: RoleKey[] = ["guest", "gym-member", "vendor", "landlord", "investor", "studio-manager", "hr", "franchise-candidate"];

function accessForRole(role: RoleKey): FranchisePartnerDecisionReadModel["access"] {
  if (fullRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "partner_decision_full",
      reason: "Role can inspect internal partner decision records, blockers, redactions and guarded review actions.",
      canStageDecisionReview: ["deal-manager", "reviewer", "crays-management"].includes(role),
      canViewInternalRecords: true,
      canViewPartnerScopedRecords: true,
    };
  }
  if (partnerScopedRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "partner_decision_partner_scoped",
      reason: "Role can inspect partner-safe decision evidence and stage guarded internal partner review actions. Release, send, upload and apply remain closed.",
      canStageDecisionReview: true,
      canViewInternalRecords: false,
      canViewPartnerScopedRecords: true,
    };
  }
  if (bankScopedRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "partner_decision_bank_scoped",
      reason: "Role can inspect bank-relevant decision conditions only. Bank send and package release remain closed.",
      canStageDecisionReview: false,
      canViewInternalRecords: false,
      canViewPartnerScopedRecords: true,
    };
  }
  if (blockedRoles.includes(role)) {
    return {
      role,
      allowed: false,
      level: "release_blocked",
      reason: "This role requires a reviewed Franchise Partner decision release before decision records are visible.",
      canStageDecisionReview: false,
      canViewInternalRecords: false,
      canViewPartnerScopedRecords: false,
    };
  }
  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Role is outside the Franchise Partner Decision workflow scope.",
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
    "partner-decision-summary": "Decision summary",
    "investment-fit": "Investment fit",
    "operating-proof": "Operating proof",
    "bank-and-lease-conditions": "Bank and lease",
    "evidence-package": "Evidence package",
    "partner-redactions": "Partner redactions",
    "opening-readiness": "Opening readiness",
    "partner-review-actions": "Review actions",
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
  if (unit === "EUR") return money(value);
  if (unit === "percent") return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
  if (unit === "score") return `${Math.round(value * (value <= 1 ? 100 : 1))}/100`;
  if (unit === "years") return `${value.toFixed(1)} years`;
  if (unit === "ratio") return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}x`;
  if (unit === "members") return `${value.toLocaleString("en-US")} members`;
  if (unit === "records") return `${value.toLocaleString("en-US")} records`;
  return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function rowFromMetadata(metadata: JsonRecord | null) {
  return asRecord(metadata?.row);
}

function fieldsFromMetadata(metadata: JsonRecord | null) {
  return asRecord(rowFromMetadata(metadata).fields);
}

function hrefFor(family: string, role: RoleKey) {
  const roleParam = encodeURIComponent(role);
  if (family === "investment-fit") return `/analytics?role=${roleParam}&view=financial-model`;
  if (family === "operating-proof") return `/analytics?role=${roleParam}&view=portfolio`;
  if (family === "bank-and-lease-conditions") return `/loans?role=${roleParam}&view=bank-package`;
  if (family === "evidence-package" || family === "partner-redactions") return `/files?role=${roleParam}&view=package-builder&record=packages`;
  if (family === "opening-readiness") return `/project?role=${roleParam}&view=work-items`;
  if (family === "partner-review-actions") return `/dashboard?role=${roleParam}&view=actions`;
  return `/analytics?role=${roleParam}&view=partner-decision`;
}

function mapRecord(row: SourceRow, role: RoleKey): FranchisePartnerDecisionRecord {
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
    audience: text(fields.audience, "Franchise Partner"),
    value: (fields.value as string | number | boolean | null | undefined) ?? null,
    unit: text(fields.unit) || null,
    context: text(fields.context, "Review partner decision source record."),
    currentState: text(fields.currentState, text(fields.context, "Partner decision record is available.")),
    nextAction: text(fields.nextAction, "Review partner decision record."),
    href: hrefFor(family, role),
    dueDate: text(sourceRow.dueDate, text(fields.dueDate, "")) || null,
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
    fields,
  };
}

function redactText(value: string) {
  return value
    .replaceAll("Internal finance workpapers", "Restricted finance material")
    .replaceAll("internal finance workpapers", "restricted finance material")
    .replaceAll("Bank workpapers", "Restricted bank material")
    .replaceAll("bank workpapers", "restricted bank material")
    .replaceAll("Owner private contact", "Restricted real estate contact")
    .replaceAll("owner private contact", "restricted real estate contact")
    .replaceAll("Member-level data", "Restricted member detail")
    .replaceAll("member-level data", "restricted member detail")
    .replaceAll("raw redaction workpapers", "restricted review material");
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as JsonRecord).map(([key, entry]) => [key, redactValue(entry)]));
}

function redactForScopedAccess(record: FranchisePartnerDecisionRecord): FranchisePartnerDecisionRecord {
  const fields = redactValue(record.fields) as JsonRecord;
  delete fields.hiddenForPartner;
  return {
    ...record,
    context: redactText(record.context),
    currentState: redactText(record.currentState),
    nextAction: redactText(record.nextAction),
    fields,
  };
}

function visibleFor(record: FranchisePartnerDecisionRecord, access: FranchisePartnerDecisionReadModel["access"]) {
  if (!access.allowed) return false;
  if (access.level === "partner_decision_full") return true;
  if (access.level === "partner_decision_partner_scoped") {
    if (record.family === "partner-redactions") return false;
    if (record.audience === "Reviewer" || record.audience === "CRAYS Management") return false;
    return bool(record.fields.visibleForPartner) || record.audience === "Franchise Partner";
  }
  if (access.level === "partner_decision_bank_scoped") {
    return ["investment-fit", "bank-and-lease-conditions", "evidence-package"].includes(record.family) && record.status !== "blocked";
  }
  return false;
}

function empty(role: RoleKey, access: FranchisePartnerDecisionReadModel["access"], queryStatus: FranchisePartnerDecisionReadModel["queryStatus"]): FranchisePartnerDecisionReadModel {
  return {
    access,
    decisionContext: {
      decisionId: "partner_decision_munich_rotkreuzplatz_schneider_fitness",
      offerId: "prepared_franchise_deal_munich_rotkreuzplatz_schneider_fitness",
      dealId: "deal_case_munich_rotkreuzplatz_schneider_fitness",
      propertyCaseId: "property_case_gudrunstrasse_3_rotkreuzplatz",
      partnerName: "Lea Schneider",
      partnerCompany: "Schneider Fitness Beteiligungs GmbH",
      siteName: "Gudrunstrasse 3 Studio Lease",
      address: "Gudrunstrasse 3, 80634 Munich",
      journey: "Candidate Offer -> Partner decision package -> Investment fit -> Operating proof -> Bank and lease conditions -> Evidence package -> Opening readiness -> guarded review",
    },
    summary: {
      records: 0,
      sourceRecords: 0,
      linkedCandidateOfferRecords: 0,
      linkedFinancialWorkbookRecords: 0,
      linkedForecastRecords: 0,
      linkedBankPackageRecords: 0,
      linkedRealEstateRecords: 0,
      linkedFilesRecords: 0,
      linkedPartnerPerformanceRecords: 0,
      linkedOperationsRecords: 0,
      decisionSummaries: 0,
      investmentFit: 0,
      operatingProof: 0,
      bankAndLeaseConditions: 0,
      evidencePackage: 0,
      redactions: 0,
      openingReadiness: 0,
      reviewActions: 0,
      readinessScore: 0,
      blockers: 0,
      attention: 0,
      conflicts: 0,
      year3Result: null,
      paybackYears: null,
      equityRequirement: null,
      freshnessMinutes: null,
      commandDrafts: 0,
      latestCommandId: null,
    },
    decisionCards: [],
    records: [],
    controls: { families: [], statuses: [], priorities: [], audiences: [], sourceBacked: true, roleScoped: true },
    actions: {
      stageDecisionReviewAllowed: access.canStageDecisionReview,
      commandRoute: "/api/crays/core-command/sync-preview",
      confirmationHeader: "stage-sync-preview-command",
      commandType: "diff_review",
      action: "classify_diff",
      applyGate: "OPEN_DEV_SYNC_APPLY",
    },
    history: [],
    boundaries: {
      partnerReleaseEnabled: false,
      publicReleaseEnabled: false,
      candidateReleaseEnabled: false,
      partnerSendEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
      bankSendEnabled: false,
      leaseSigningEnabled: false,
      financePostingEnabled: false,
      accountingExportsEnabled: false,
      paymentInitiationEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      liveAiEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    sourceHealth: {
      systemKey: sourceSystem,
      connectionId: "core_source_franchise_partner_decision",
      seedBatch,
      records: 0,
      conflicts: 0,
    },
    queryStatus,
  };
}

function countFamily(records: FranchisePartnerDecisionRecord[], family: string) {
  return records.filter((record) => record.family === family).length;
}

function metric(records: FranchisePartnerDecisionRecord[], key: string) {
  return num(records.find((record) => text(record.fields.metricKey) === key)?.value);
}

function readiness(records: FranchisePartnerDecisionRecord[]) {
  return Math.round(
    records.reduce((max, record) => {
      const score = typeof record.fields.readinessScore === "number" ? record.fields.readinessScore : 0;
      return score > max ? score : max;
    }, 0),
  );
}

function statusFor(records: FranchisePartnerDecisionRecord[], family: string): DecisionStatus {
  const scoped = records.filter((record) => record.family === family);
  if (scoped.some((record) => record.status === "blocked" || record.priority === "critical")) return "blocked";
  if (scoped.some((record) => record.status === "attention" || record.priority === "high")) return "attention";
  return "ready";
}

function buildDecisionCards(records: FranchisePartnerDecisionRecord[]): FranchisePartnerDecisionReadModel["decisionCards"] {
  return [
    { key: "decision", label: "Decision summary", value: `${readiness(records)}%`, context: "Partner decision package readiness across offer, finance, bank, lease, evidence and opening work.", status: statusFor(records, "partner-decision-summary"), filterFamily: "partner-decision-summary" },
    { key: "investment", label: "Investment fit", value: money(metric(records, "year3_result_mid_case")), context: "Investment KPIs explain whether the prepared deal clears the partner decision hurdle.", status: statusFor(records, "investment-fit"), filterFamily: "investment-fit" },
    { key: "operating", label: "Operating proof", value: `${countFamily(records, "operating-proof")}`, context: "Operating proof compares forecast assumptions with existing partner studio and member evidence.", status: statusFor(records, "operating-proof"), filterFamily: "operating-proof" },
    { key: "bank-lease", label: "Bank and lease", value: `${countFamily(records, "bank-and-lease-conditions")}`, context: "Bank and lease conditions show what still blocks partner signing confidence.", status: statusFor(records, "bank-and-lease-conditions"), filterFamily: "bank-and-lease-conditions" },
    { key: "evidence", label: "Evidence package", value: `${countFamily(records, "evidence-package")}`, context: "Files evidence defines which package sections are ready for scoped partner review.", status: statusFor(records, "evidence-package"), filterFamily: "evidence-package" },
    { key: "opening", label: "Opening readiness", value: `${countFamily(records, "opening-readiness")}`, context: "Opening readiness proves the partner can move from decision to launch execution.", status: statusFor(records, "opening-readiness"), filterFamily: "opening-readiness" },
    { key: "redactions", label: "Partner redactions", value: `${countFamily(records, "partner-redactions")}`, context: "Reviewer redactions keep restricted finance, bank, owner and member material out of partner scope.", status: statusFor(records, "partner-redactions"), filterFamily: "partner-redactions" },
    { key: "actions", label: "Review actions", value: `${countFamily(records, "partner-review-actions")}`, context: "Open review actions can stage guarded Core review commands; release and send stay closed.", status: statusFor(records, "partner-review-actions"), filterFamily: "partner-review-actions" },
  ].filter((card) => countFamily(records, card.filterFamily) > 0);
}

function groupOptions(records: FranchisePartnerDecisionRecord[], field: keyof FranchisePartnerDecisionRecord, labeler = titleCase) {
  const counts = new Map<string, number>();
  for (const record of records) {
    const key = String(record[field] ?? "");
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => ({ key, label: labeler(key), rows }));
}

type LinkedCountKey =
  | "candidateOffer"
  | "financialWorkbook"
  | "forecast"
  | "bankPackage"
  | "realEstate"
  | "files"
  | "partnerPerformance"
  | "operations";

const linkedCountRequests: Array<{ key: LinkedCountKey; externalSystem: string; batch: string }> = [
  { key: "candidateOffer", externalSystem: "candidate-offer-engine", batch: candidateOfferSeedBatch },
  { key: "financialWorkbook", externalSystem: "financial-workbook", batch: workbookSeedBatch },
  { key: "forecast", externalSystem: "financial-forecast-5y", batch: forecastSeedBatch },
  { key: "bankPackage", externalSystem: "bank-package-engine", batch: bankSeedBatch },
  { key: "realEstate", externalSystem: "real-estate-decision-engine", batch: realEstateSeedBatch },
  { key: "files", externalSystem: "files-engine", batch: filesSeedBatch },
  { key: "partnerPerformance", externalSystem: "franchise-performance", batch: performanceSeedBatch },
  { key: "operations", externalSystem: "operations-engine", batch: operationsSeedBatch },
];

async function linkedCounts() {
  const systems = linkedCountRequests.map((request) => request.externalSystem);
  const batches = linkedCountRequests.map((request) => request.batch);
  const result = await getCorePgPool().query<{ external_system: string; seed_batch: string; count: string }>(
    `
      with requested as (
        select *
        from unnest($1::text[], $2::text[]) as requested(external_system, seed_batch)
      )
      select requested.external_system, requested.seed_batch, count(maps.external_system)::text as count
      from requested
      left join crays_core.external_record_maps maps
        on maps.external_system = requested.external_system
       and coalesce(maps.metadata ->> 'seedBatch', maps.metadata -> 'fields' ->> 'seedBatch') = requested.seed_batch
      group by requested.external_system, requested.seed_batch
    `,
    [systems, batches],
  );
  const counts = Object.fromEntries(linkedCountRequests.map((request) => [request.key, 0])) as Record<LinkedCountKey, number>;
  for (const request of linkedCountRequests) {
    const row = result.rows.find((entry) => entry.external_system === request.externalSystem && entry.seed_batch === request.batch);
    counts[request.key] = Number.parseInt(row?.count ?? "0", 10);
  }
  return counts;
}

function commandHistory(rows: CommandRow[]): FranchisePartnerDecisionReadModel["history"] {
  return rows.map((row) => ({
    commandId: row.command_id,
    label: text(row.input_payload?.title, row.command_id),
    actorRole: row.actor_role,
    status: row.command_status,
    targetApplyStatus: row.target_apply_status,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function getFranchisePartnerDecisionReadModel(role: RoleKey): Promise<FranchisePartnerDecisionReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured || !access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");

  const pool = getCorePgPool();
  const result = await pool.query<SourceRow>(
    `
      select external_entity_type, external_entity_id, crays_entity_type, crays_entity_id, sync_status, last_synced_at, metadata
      from crays_core.external_record_maps
      where external_system = $1
        and metadata ->> 'seedBatch' = $2
      order by external_entity_type, external_entity_id
    `,
    [sourceSystem, seedBatch],
  );
  const linked = await linkedCounts();
  const historyResult = await pool.query<CommandRow>(
    `
      select command_id, actor_role, command_status, target_apply_status, input_payload, created_at
      from crays_core.core_command_requests
      where module_key = 'sync'
        and command_key = 'sync.mapping.preview_refresh'
        and input_payload ->> 'conflictClass' = 'franchise-partner-decision-review'
      order by created_at desc
      limit 8
    `,
  );

  const allRecords = result.rows.map((row) => mapRecord(row, role));
  const records = allRecords
    .filter((record) => visibleFor(record, access))
    .map((record) => (access.canViewInternalRecords ? record : redactForScopedAccess(record)))
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, normal: 3, low: 4 } as Record<string, number>;
      return (priorityOrder[a.priority] ?? 5) - (priorityOrder[b.priority] ?? 5) || a.family.localeCompare(b.family) || a.label.localeCompare(b.label);
    });
  const latestMs = Math.max(...records.map((record) => (record.lastSyncedAt ? Date.parse(record.lastSyncedAt) : 0)).filter(Boolean), 0);
  const freshnessMinutes = latestMs ? Math.max(0, Math.round((Date.now() - latestMs) / 60000)) : null;
  const history = commandHistory(historyResult.rows);
  const model = empty(role, access, "schema_ready");

  return {
    ...model,
    summary: {
      records: records.length,
      sourceRecords: allRecords.length,
      linkedCandidateOfferRecords: linked.candidateOffer,
      linkedFinancialWorkbookRecords: linked.financialWorkbook,
      linkedForecastRecords: linked.forecast,
      linkedBankPackageRecords: linked.bankPackage,
      linkedRealEstateRecords: linked.realEstate,
      linkedFilesRecords: linked.files,
      linkedPartnerPerformanceRecords: linked.partnerPerformance,
      linkedOperationsRecords: linked.operations,
      decisionSummaries: countFamily(records, "partner-decision-summary"),
      investmentFit: countFamily(records, "investment-fit"),
      operatingProof: countFamily(records, "operating-proof"),
      bankAndLeaseConditions: countFamily(records, "bank-and-lease-conditions"),
      evidencePackage: countFamily(records, "evidence-package"),
      redactions: countFamily(records, "partner-redactions"),
      openingReadiness: countFamily(records, "opening-readiness"),
      reviewActions: countFamily(records, "partner-review-actions"),
      readinessScore: readiness(allRecords),
      blockers: records.filter((record) => record.status === "blocked" || record.priority === "critical").length,
      attention: records.filter((record) => record.status === "attention" || record.priority === "high").length,
      conflicts: allRecords.filter((record) => record.status === "blocked" || record.priority === "critical").length,
      year3Result: metric(allRecords, "year3_result_mid_case"),
      paybackYears: metric(allRecords, "payback_mid_case"),
      equityRequirement: metric(allRecords, "equity_requirement"),
      freshnessMinutes,
      commandDrafts: history.length,
      latestCommandId: history[0]?.commandId ?? null,
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
    history,
    sourceHealth: {
      systemKey: sourceSystem,
      connectionId: "core_source_franchise_partner_decision",
      seedBatch,
      records: allRecords.length,
      conflicts: allRecords.filter((record) => record.status === "blocked" || record.priority === "critical").length,
    },
  };
}

export function formatFranchisePartnerDecisionValue(value: string | number | boolean | null, unit: string | null) {
  return valueLabel(value, unit);
}
