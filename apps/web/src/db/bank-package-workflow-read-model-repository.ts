import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "bank_package_full" | "bank_package_partner" | "bank_package_bank_scoped" | "release_blocked" | "forbidden";
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

export type BankPackageWorkflowRecord = {
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

export type BankPackageWorkflowReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
    canStagePackageReview: boolean;
    canViewInternalRecords: boolean;
    canViewBankScopedRecords: boolean;
  };
  packageContext: {
    packageId: string;
    loanCaseId: string;
    preparedOfferId: string;
    propertyCaseId: string;
    candidateName: string;
    candidateCompany: string;
    bankPartner: string;
    realEstatePartner: string;
    siteName: string;
    journey: string;
  };
  summary: {
    records: number;
    sourceRecords: number;
    linkedFinancialWorkbookRecords: number;
    linkedForecastRecords: number;
    linkedLocationRecords: number;
    linkedFilesRecords: number;
    linkedFinanceLedgerRecords: number;
    creditMetrics: number;
    financialEvidence: number;
    locationEvidence: number;
    fileEvidence: number;
    loanConditions: number;
    redactionRules: number;
    reviewActions: number;
    readinessScore: number;
    blockers: number;
    attention: number;
    conflicts: number;
    requestedDebt: number | null;
    totalInvestment: number | null;
    equityAmount: number | null;
    midCaseRevenueYear3: number | null;
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
  records: BankPackageWorkflowRecord[];
  controls: {
    families: Array<{ key: string; label: string; rows: number }>;
    statuses: Array<{ key: string; label: string; rows: number }>;
    priorities: Array<{ key: string; label: string; rows: number }>;
    audiences: Array<{ key: string; label: string; rows: number }>;
    sourceBacked: true;
    roleScoped: true;
  };
  actions: {
    stagePackageReviewAllowed: boolean;
    commandRoute: "/api/crays/bank-readiness/workbench/command-draft";
    confirmationHeader: "stage-loans-checklist-command";
    applyGate: "OPEN_DEV_LOANS_CHECKLIST_APPLY";
  };
  boundaries: {
    bankSendEnabled: false;
    lenderReleaseEnabled: false;
    packagePublicationEnabled: false;
    financePostingEnabled: false;
    accountingExportsEnabled: false;
    paymentInitiationEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
    uploadsEnabled: false;
    externalSendingEnabled: false;
    liveAiEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const seedBatch = "crays-bank-package-workflow-20260713-v1";
const financialWorkbookSeedBatch = "crays-financial-workbook-rotkreuzplatz-20260712-v1";
const financialForecastSeedBatch = "crays-financial-forecast-5y-rotkreuzplatz-20260712-v1";
const locationSeedBatch = "crays-location-intelligence-rotkreuzplatz-20260712-v1";
const filesSeedBatch = "crays-files-workflow-20260712-v1";
const financeLedgerSeedBatch = "crays-erp-finance-ledger-20260712-v1";

const fullRoles: RoleKey[] = ["admin", "crays-management", "finance", "reviewer", "deal-manager"];
const partnerRoles: RoleKey[] = ["franchise-partner"];
const bankScopedRoles: RoleKey[] = ["bank-partner"];
const releaseBlockedRoles: RoleKey[] = ["franchise-candidate", "guest", "gym-member", "vendor", "landlord", "investor", "studio-manager"];

function accessForRole(role: RoleKey): BankPackageWorkflowReadModel["access"] {
  if (fullRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "bank_package_full",
      reason: "Role can inspect internal bank package evidence, blockers, source lineage, conditions and guarded review actions.",
      canStagePackageReview: role === "finance",
      canViewInternalRecords: true,
      canViewBankScopedRecords: true,
    };
  }

  if (partnerRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "bank_package_partner",
      reason: "Role can inspect partner decision metrics and package readiness without lender workpapers or internal redaction detail.",
      canStagePackageReview: false,
      canViewInternalRecords: false,
      canViewBankScopedRecords: true,
    };
  }

  if (bankScopedRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "bank_package_bank_scoped",
      reason: "Role can inspect scoped bank package readiness metrics only; no sends, document room release or internal notes are open.",
      canStagePackageReview: false,
      canViewInternalRecords: false,
      canViewBankScopedRecords: true,
    };
  }

  if (releaseBlockedRoles.includes(role)) {
    return {
      role,
      allowed: false,
      level: "release_blocked",
      reason: "This role requires a reviewed stakeholder package release before bank package records are visible.",
      canStagePackageReview: false,
      canViewInternalRecords: false,
      canViewBankScopedRecords: false,
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Role is outside the bank package workflow scope.",
    canStagePackageReview: false,
    canViewInternalRecords: false,
    canViewBankScopedRecords: false,
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
    "bank-package-summary": "Package summary",
    "credit-decision-metrics": "Credit metrics",
    "financial-model-evidence": "Financial evidence",
    "location-evidence": "Location evidence",
    "files-evidence": "Files evidence",
    "loan-conditions": "Loan conditions",
    "redaction-preflight": "Redaction preflight",
    "bank-review-actions": "Review actions",
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
  if (unit === "ratio") return value.toFixed(2);
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
  if (family === "credit-decision-metrics" || family === "financial-model-evidence") return `/analytics?role=${roleParam}&view=financial-model`;
  if (family === "location-evidence") return `/analytics?role=${roleParam}&view=location-intelligence`;
  if (family === "files-evidence" || family === "redaction-preflight") return `/files?role=${roleParam}&view=packages&record=bank`;
  if (family === "bank-review-actions") return `/dashboard?role=${roleParam}&view=actions`;
  return `/loans?role=${roleParam}&view=bank-package`;
}

function mapRecord(row: SourceRow, role: RoleKey): BankPackageWorkflowRecord {
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
    owner: text(sourceRow.owner, text(fields.ownerRole, "CRAYS Finance")),
    audience: text(fields.audience, "Bank Partner"),
    value: (fields.value as string | number | boolean | null | undefined) ?? null,
    unit: text(fields.unit) || null,
    context: text(fields.context, text(fields.currentState, "Review bank package source record.")),
    nextAction: text(fields.nextAction, "Review bank package record."),
    href: hrefFor(family, role),
    dueDate: text(sourceRow.dueDate, text(fields.dueDate, "")) || null,
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
    fields,
  };
}

function redactScopedText(value: string) {
  return value
    .replaceAll("Lea Schneider", "Scoped franchise applicant")
    .replaceAll("Internal margin sensitivity", "Sensitive package detail")
    .replaceAll("internal margin sensitivity", "sensitive package detail");
}

function redactScopedValue(value: unknown): unknown {
  if (typeof value === "string") return redactScopedText(value);
  if (Array.isArray(value)) return value.map((item) => redactScopedValue(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as JsonRecord).map(([key, entry]) => [key, redactScopedValue(entry)]));
}

function redactForScopedAccess(record: BankPackageWorkflowRecord): BankPackageWorkflowRecord {
  const fields = redactScopedValue(record.fields) as JsonRecord;
  delete fields.candidateName;
  delete fields.realEstatePartner;
  delete fields.internalNotes;
  delete fields.internalMarginSensitivity;

  return {
    ...record,
    context: redactScopedText(record.context),
    nextAction: redactScopedText(record.nextAction),
    fields,
  };
}

function isBankSafe(record: BankPackageWorkflowRecord) {
  if (record.family === "redaction-preflight" || record.family === "bank-review-actions") return false;
  if (record.label.toLowerCase().includes("internal margin")) return false;
  if (record.audience === "Reviewer" || record.audience === "CRAYS Management") return false;
  return record.audience === "Bank Partner" || bool(record.fields.visibleForBank) || ["credit-decision-metrics", "location-evidence", "loan-conditions"].includes(record.family);
}

function visibleFor(record: BankPackageWorkflowRecord, access: BankPackageWorkflowReadModel["access"]) {
  if (!access.allowed) return false;
  if (access.level === "bank_package_full") return true;
  if (access.level === "bank_package_partner") {
    if (record.family === "redaction-preflight" || record.family === "bank-review-actions") return false;
    return ["Franchise Partner", "Bank Partner"].includes(record.audience) || ["credit-decision-metrics", "financial-model-evidence", "location-evidence", "loan-conditions"].includes(record.family);
  }
  if (access.level === "bank_package_bank_scoped") return isBankSafe(record);
  return false;
}

function empty(role: RoleKey, access: BankPackageWorkflowReadModel["access"], queryStatus: BankPackageWorkflowReadModel["queryStatus"]): BankPackageWorkflowReadModel {
  return {
    access,
    packageContext: {
      packageId: "bank_package_munich_rotkreuzplatz_schneider_fitness",
      loanCaseId: "loan_case_munich_rotkreuzplatz_schneider_fitness",
      preparedOfferId: "prepared_franchise_deal_munich_rotkreuzplatz_schneider_fitness",
      propertyCaseId: "property_case_gudrunstrasse_3_rotkreuzplatz",
      candidateName: access.canViewInternalRecords ? "Lea Schneider" : "Scoped franchise applicant",
      candidateCompany: "Schneider Fitness Beteiligungs GmbH",
      bankPartner: "Isar Commercial Finance AG",
      realEstatePartner: access.canViewInternalRecords ? "Keller & Brandt Real Estate GmbH" : "Real estate partner scoped",
      siteName: "Gudrunstrasse 3 Studio Lease",
      journey: "Financial model -> Forecast -> Location evidence -> Files evidence -> Loan conditions -> Bank package preflight",
    },
    summary: {
      records: 0,
      sourceRecords: 0,
      linkedFinancialWorkbookRecords: 0,
      linkedForecastRecords: 0,
      linkedLocationRecords: 0,
      linkedFilesRecords: 0,
      linkedFinanceLedgerRecords: 0,
      creditMetrics: 0,
      financialEvidence: 0,
      locationEvidence: 0,
      fileEvidence: 0,
      loanConditions: 0,
      redactionRules: 0,
      reviewActions: 0,
      readinessScore: 0,
      blockers: 0,
      attention: 0,
      conflicts: 0,
      requestedDebt: null,
      totalInvestment: null,
      equityAmount: null,
      midCaseRevenueYear3: null,
      freshnessMinutes: null,
    },
    decisionCards: [],
    records: [],
    controls: { families: [], statuses: [], priorities: [], audiences: [], sourceBacked: true, roleScoped: true },
    actions: {
      stagePackageReviewAllowed: access.canStagePackageReview,
      commandRoute: "/api/crays/bank-readiness/workbench/command-draft",
      confirmationHeader: "stage-loans-checklist-command",
      applyGate: "OPEN_DEV_LOANS_CHECKLIST_APPLY",
    },
    boundaries: {
      bankSendEnabled: false,
      lenderReleaseEnabled: false,
      packagePublicationEnabled: false,
      financePostingEnabled: false,
      accountingExportsEnabled: false,
      paymentInitiationEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
      liveAiEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    queryStatus,
  };
}

function countFamily(records: BankPackageWorkflowRecord[], family: string) {
  return records.filter((record) => record.family === family).length;
}

function metric(records: BankPackageWorkflowRecord[], key: string) {
  return num(records.find((record) => text(record.fields.metricKey) === key)?.value);
}

function packageReadiness(records: BankPackageWorkflowRecord[]) {
  return Math.round(
    records.reduce((max, record) => {
      const score = typeof record.fields.readinessScore === "number" ? record.fields.readinessScore : 0;
      return score > max ? score : max;
    }, 0),
  );
}

function statusFor(records: BankPackageWorkflowRecord[], family: string): DecisionStatus {
  const scoped = records.filter((record) => record.family === family);
  if (scoped.some((record) => record.status === "blocked" || record.priority === "critical")) return "blocked";
  if (scoped.some((record) => ["attention", "required", "review", "conditional"].includes(record.status) || record.priority === "high")) return "attention";
  return "ready";
}

function buildDecisionCards(records: BankPackageWorkflowRecord[]): BankPackageWorkflowReadModel["decisionCards"] {
  return [
    {
      key: "package-readiness",
      label: "Package readiness",
      value: `${packageReadiness(records)}%`,
      context: "Bank package is assembled, but release and send gates remain closed until blockers are resolved.",
      status: statusFor(records, "bank-package-summary"),
      filterFamily: "bank-package-summary",
      searchTerm: "",
    },
    {
      key: "credit-metrics",
      label: "Credit metrics",
      value: money(metric(records, "requested_debt")),
      context: `${countFamily(records, "credit-decision-metrics")} credit metrics connect workbook, forecast and package conditions.`,
      status: statusFor(records, "credit-decision-metrics"),
      filterFamily: "credit-decision-metrics",
      searchTerm: "",
    },
    {
      key: "financial-evidence",
      label: "Financial evidence",
      value: String(countFamily(records, "financial-model-evidence")),
      context: "Financial model, 5-year forecast, benchmark comparison and ERP ledger bridge are package inputs.",
      status: statusFor(records, "financial-model-evidence"),
      filterFamily: "financial-model-evidence",
      searchTerm: "",
    },
    {
      key: "location-evidence",
      label: "Location evidence",
      value: String(countFamily(records, "location-evidence")),
      context: "Catchment, competition, accessibility and rent-fit evidence support the credit story.",
      status: statusFor(records, "location-evidence"),
      filterFamily: "location-evidence",
      searchTerm: "",
    },
    {
      key: "files-evidence",
      label: "Files evidence",
      value: String(countFamily(records, "files-evidence")),
      context: "Document package evidence and bank-room grants are checked before any release.",
      status: statusFor(records, "files-evidence"),
      filterFamily: "files-evidence",
      searchTerm: "",
    },
    {
      key: "loan-conditions",
      label: "Loan conditions",
      value: String(countFamily(records, "loan-conditions")),
      context: "Finance-owned credit conditions drive the next guarded checklist command.",
      status: statusFor(records, "loan-conditions"),
      filterFamily: "loan-conditions",
      searchTerm: "",
    },
    {
      key: "redactions",
      label: "Redactions",
      value: String(countFamily(records, "redaction-preflight")),
      context: "Reviewer redaction preflight keeps internal notes and sensitive details out of bank scope.",
      status: statusFor(records, "redaction-preflight"),
      filterFamily: "redaction-preflight",
      searchTerm: "",
    },
    {
      key: "review-actions",
      label: "Review actions",
      value: String(countFamily(records, "bank-review-actions")),
      context: "Open package actions can stage guarded Core command drafts; bank send stays closed.",
      status: statusFor(records, "bank-review-actions"),
      filterFamily: "bank-review-actions",
      searchTerm: "",
    },
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

export async function getBankPackageWorkflowReadModel(role: RoleKey): Promise<BankPackageWorkflowReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured || !access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");

  const [result, linkedFinancialWorkbookRecords, linkedForecastRecords, linkedLocationRecords, linkedFilesRecords, linkedFinanceLedgerRecords] = await Promise.all([
    getCorePgPool().query<SourceRow>(
      `
        select external_entity_type, external_entity_id, crays_entity_type, crays_entity_id, sync_status, last_synced_at, metadata
        from crays_core.external_record_maps
        where external_system = 'bank-package-engine'
          and metadata ->> 'seedBatch' = $1
        order by external_entity_type, external_entity_id
      `,
      [seedBatch],
    ),
    linkedCount("financial-workbook", financialWorkbookSeedBatch),
    linkedCount("financial-forecast-5y", financialForecastSeedBatch),
    linkedCount("location-intelligence", locationSeedBatch),
    linkedCount("files-engine", filesSeedBatch),
    linkedCount("erp-engine", financeLedgerSeedBatch),
  ]);

  const allRecords = result.rows.map((row) => mapRecord(row, role));
  const records = allRecords
    .filter((record) => visibleFor(record, access))
    .map((record) => (access.canViewInternalRecords ? record : redactForScopedAccess(record)))
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, normal: 3, low: 4 } as Record<string, number>;
      return (priorityOrder[a.priority] ?? 5) - (priorityOrder[b.priority] ?? 5) || a.family.localeCompare(b.family) || a.label.localeCompare(b.label);
    });
  const latest = records
    .map((record) => (record.lastSyncedAt ? new Date(record.lastSyncedAt).getTime() : 0))
    .filter((time) => time > 0)
    .sort((a, b) => b - a)[0];
  const freshnessMinutes = latest ? Math.max(0, Math.round((Date.now() - latest) / 60_000)) : null;
  const families = [...new Set(records.map((record) => record.family))];
  const statuses = [...new Set(records.map((record) => record.status))];
  const priorities = [...new Set(records.map((record) => record.priority))];
  const audiences = [...new Set(records.map((record) => record.audience))];

  return {
    ...empty(role, access, "schema_ready"),
    summary: {
      records: records.length,
      sourceRecords: result.rowCount ?? result.rows.length,
      linkedFinancialWorkbookRecords,
      linkedForecastRecords,
      linkedLocationRecords,
      linkedFilesRecords,
      linkedFinanceLedgerRecords,
      creditMetrics: countFamily(records, "credit-decision-metrics"),
      financialEvidence: countFamily(records, "financial-model-evidence"),
      locationEvidence: countFamily(records, "location-evidence"),
      fileEvidence: countFamily(records, "files-evidence"),
      loanConditions: countFamily(records, "loan-conditions"),
      redactionRules: countFamily(records, "redaction-preflight"),
      reviewActions: countFamily(records, "bank-review-actions"),
      readinessScore: packageReadiness(records),
      blockers: records.filter((record) => record.status === "blocked" || record.priority === "critical").length,
      attention: records.filter((record) => ["attention", "required", "review", "conditional"].includes(record.status) || record.priority === "high").length,
      conflicts: records.filter((record) => record.priority === "critical" || record.status === "blocked" || record.status === "required").length,
      requestedDebt: metric(records, "requested_debt"),
      totalInvestment: metric(records, "total_project_investment"),
      equityAmount: metric(records, "equity_contribution"),
      midCaseRevenueYear3: metric(records, "mid_case_year3_net_revenue"),
      freshnessMinutes,
    },
    decisionCards: buildDecisionCards(records),
    records,
    controls: {
      families: families.map((family) => ({ key: family, label: familyLabel(family), rows: records.filter((record) => record.family === family).length })),
      statuses: statuses.map((status) => ({ key: status, label: titleCase(status), rows: records.filter((record) => record.status === status).length })),
      priorities: priorities.map((priority) => ({ key: priority, label: titleCase(priority), rows: records.filter((record) => record.priority === priority).length })),
      audiences: audiences.map((audience) => ({ key: audience, label: audience, rows: records.filter((record) => record.audience === audience).length })),
      sourceBacked: true,
      roleScoped: true,
    },
    actions: {
      stagePackageReviewAllowed: access.canStagePackageReview,
      commandRoute: "/api/crays/bank-readiness/workbench/command-draft",
      confirmationHeader: "stage-loans-checklist-command",
      applyGate: "OPEN_DEV_LOANS_CHECKLIST_APPLY",
    },
  };
}

export function formatBankPackageValue(value: string | number | boolean | null, unit: string | null) {
  return valueLabel(value, unit);
}
