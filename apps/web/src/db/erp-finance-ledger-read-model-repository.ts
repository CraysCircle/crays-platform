import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "finance_ledger_full" | "finance_ledger_internal" | "finance_ledger_partner" | "finance_ledger_studio" | "forbidden";
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

export type ErpFinanceLedgerRecord = {
  id: string;
  family: string;
  label: string;
  craysEntityType: string;
  craysEntityId: string;
  status: string;
  priority: string;
  owner: string;
  amountGross: number | null;
  amountNet: number | null;
  currency: string;
  memberName: string | null;
  invoiceNumber: string | null;
  dueDate: string | null;
  nextAction: string;
  href: string;
  lastSyncedAt: string | null;
  fields: JsonRecord;
};

export type ErpFinanceLedgerReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
    canViewMemberRows: boolean;
    canStageLedgerReview: boolean;
  };
  summary: {
    records: number;
    sourceRecords: number;
    linkedMemberSourceRecords: number;
    linkedRecoveryRecords: number;
    linkedPartnerPerformanceRecords: number;
    revenuePreviews: number;
    invoiceLines: number;
    paymentSettlements: number;
    refundLiabilities: number;
    chargebackReserves: number;
    cancellationAdjustments: number;
    partnerSummaries: number;
    reviewActions: number;
    netRevenuePreview: number;
    grossRevenuePreview: number;
    amountAtRisk: number;
    refundLiabilityAmount: number;
    chargebackReserveAmount: number;
    blockedRows: number;
    attentionRows: number;
    conflicts: number;
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
  records: ErpFinanceLedgerRecord[];
  controls: {
    families: Array<{ key: string; label: string; rows: number }>;
    statuses: Array<{ key: string; label: string; rows: number }>;
    priorities: Array<{ key: string; label: string; rows: number }>;
    sourceBacked: true;
    roleScoped: true;
  };
  actions: {
    stageLedgerReviewAllowed: boolean;
    commandRoute: "/api/crays/core-command/erp-finance";
    confirmationHeader: "stage-erp-finance-command";
    commandType: "finance_summary";
    action: "request_finance_review";
    applyGate: "OPEN_DEV_ERP_FINANCE_APPLY";
  };
  boundaries: {
    paymentInitiationEnabled: false;
    financePostingEnabled: false;
    accountingExportsEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
    externalSendingEnabled: false;
    liveAiEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const seedBatch = "crays-erp-finance-ledger-20260712-v1";
const recoverySeedBatch = "crays-member-payment-recovery-20260712-v1";
const partnerPerformanceSeedBatch = "crays-franchise-partner-performance-20260712-v1";

const fullRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const internalRoles: RoleKey[] = ["finance", "deal-manager"];
const partnerRoles: RoleKey[] = ["franchise-partner"];
const studioRoles: RoleKey[] = ["studio-manager"];
const commandRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "finance", "deal-manager"];
const partnerVisibleFamilies = new Set(["monthly-revenue-ledger-previews", "payment-settlement-previews", "partner-finance-summaries", "ledger-review-actions"]);
const memberLevelFamilies = new Set(["invoice-ledger-lines", "refund-liability-previews", "chargeback-reserve-previews", "cancellation-revenue-adjustments"]);

function accessForRole(role: RoleKey): ErpFinanceLedgerReadModel["access"] {
  if (fullRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "finance_ledger_full",
      reason: "Role can inspect the full ERP finance ledger preview, member rows, partner summaries and review actions.",
      canViewMemberRows: true,
      canStageLedgerReview: commandRoles.includes(role),
    };
  }

  if (internalRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "finance_ledger_internal",
      reason: "Role can inspect ERP finance ledger previews, member payment evidence and partner finance summaries before any posting or export.",
      canViewMemberRows: true,
      canStageLedgerReview: commandRoles.includes(role),
    };
  }

  if (partnerRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "finance_ledger_partner",
      reason: "Role can inspect partner-scoped finance summaries and aggregate ledger previews, without member-level invoice or refund rows.",
      canViewMemberRows: false,
      canStageLedgerReview: false,
    };
  }

  if (studioRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "finance_ledger_studio",
      reason: "Role can inspect studio-scoped finance summary signals, without member-level finance ledger rows.",
      canViewMemberRows: false,
      canStageLedgerReview: false,
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Role is outside the ERP finance ledger workflow scope.",
    canViewMemberRows: false,
    canStageLedgerReview: false,
  };
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function bool(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function titleCase(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(value: number) {
  return `EUR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function familyLabel(family: string) {
  const labels: Record<string, string> = {
    "monthly-revenue-ledger-previews": "Revenue previews",
    "invoice-ledger-lines": "Invoice ledger lines",
    "payment-settlement-previews": "Payment settlements",
    "refund-liability-previews": "Refund liabilities",
    "chargeback-reserve-previews": "Chargeback reserves",
    "cancellation-revenue-adjustments": "Cancellation adjustments",
    "partner-finance-summaries": "Partner finance summaries",
    "ledger-review-actions": "Ledger review actions",
  };
  return labels[family] ?? titleCase(family);
}

function rowFromMetadata(metadata: JsonRecord | null) {
  return asRecord(metadata?.row);
}

function fieldsFromMetadata(metadata: JsonRecord | null) {
  return asRecord(rowFromMetadata(metadata).fields);
}

function statusFor(fields: JsonRecord, fallback: string) {
  return text(fields.status, fallback);
}

function ownerFor(row: SourceRow, fields: JsonRecord) {
  const sourceRow = rowFromMetadata(row.metadata);
  return text(sourceRow.owner, text(fields.ownerRole, "CRAYS Finance"));
}

function hrefFor(family: string, role: RoleKey) {
  const encodedRole = encodeURIComponent(role);
  if (family === "invoice-ledger-lines" || family === "refund-liability-previews" || family === "chargeback-reserve-previews") {
    return `/erp?role=${encodedRole}&view=payment-recovery`;
  }
  if (family === "cancellation-revenue-adjustments") return `/operations?role=${encodedRole}&view=members&record=cancellations`;
  if (family === "partner-finance-summaries") return `/analytics?role=${encodedRole}&view=franchise-performance`;
  if (family === "ledger-review-actions") return `/dashboard?role=${encodedRole}&view=actions`;
  return `/erp?role=${encodedRole}&view=finance-ledger`;
}

function mapRecord(row: SourceRow, role: RoleKey): ErpFinanceLedgerRecord {
  const sourceRow = rowFromMetadata(row.metadata);
  const fields = fieldsFromMetadata(row.metadata);
  const family = row.external_entity_type;
  return {
    id: `${family}:${row.external_entity_id}`,
    family,
    label: text(sourceRow.label, text(row.metadata?.label, row.external_entity_id)),
    craysEntityType: row.crays_entity_type,
    craysEntityId: row.crays_entity_id,
    status: statusFor(fields, row.sync_status),
    priority: text(sourceRow.priority, text(fields.priority, row.sync_status === "conflict" ? "high" : "medium")),
    owner: ownerFor(row, fields),
    amountGross: numberValue(fields.amountGross),
    amountNet: numberValue(fields.amountNet),
    currency: text(fields.currency, "EUR"),
    memberName: text(fields.memberName, "") || null,
    invoiceNumber: text(fields.invoiceNumber, "") || null,
    dueDate: text(sourceRow.dueDate, text(fields.dueDate, "")) || null,
    nextAction: text(fields.nextAction, "Review finance ledger row."),
    href: hrefFor(family, role),
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
    fields,
  };
}

function visibleFor(record: ErpFinanceLedgerRecord, access: ErpFinanceLedgerReadModel["access"]) {
  if (!access.allowed) return false;
  if (access.level === "finance_ledger_full" || access.level === "finance_ledger_internal") return true;
  if (access.level === "finance_ledger_partner" || access.level === "finance_ledger_studio") {
    if (memberLevelFamilies.has(record.family)) return false;
    return partnerVisibleFamilies.has(record.family) || bool(record.fields.partnerVisible);
  }
  return false;
}

function empty(role: RoleKey, access: ErpFinanceLedgerReadModel["access"], queryStatus: ErpFinanceLedgerReadModel["queryStatus"]): ErpFinanceLedgerReadModel {
  return {
    access,
    summary: {
      records: 0,
      sourceRecords: 0,
      linkedMemberSourceRecords: 0,
      linkedRecoveryRecords: 0,
      linkedPartnerPerformanceRecords: 0,
      revenuePreviews: 0,
      invoiceLines: 0,
      paymentSettlements: 0,
      refundLiabilities: 0,
      chargebackReserves: 0,
      cancellationAdjustments: 0,
      partnerSummaries: 0,
      reviewActions: 0,
      netRevenuePreview: 0,
      grossRevenuePreview: 0,
      amountAtRisk: 0,
      refundLiabilityAmount: 0,
      chargebackReserveAmount: 0,
      blockedRows: 0,
      attentionRows: 0,
      conflicts: 0,
      freshnessMinutes: null,
    },
    decisionCards: [],
    records: [],
    controls: { families: [], statuses: [], priorities: [], sourceBacked: true, roleScoped: true },
    actions: {
      stageLedgerReviewAllowed: access.canStageLedgerReview,
      commandRoute: "/api/crays/core-command/erp-finance",
      confirmationHeader: "stage-erp-finance-command",
      commandType: "finance_summary",
      action: "request_finance_review",
      applyGate: "OPEN_DEV_ERP_FINANCE_APPLY",
    },
    boundaries: {
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      accountingExportsEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      externalSendingEnabled: false,
      liveAiEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    queryStatus,
  };
}

function countFamily(records: ErpFinanceLedgerRecord[], family: string) {
  return records.filter((record) => record.family === family).length;
}

function sumAmount(records: ErpFinanceLedgerRecord[], value: "amountGross" | "amountNet", predicate: (record: ErpFinanceLedgerRecord) => boolean) {
  return records.reduce((total, record) => total + (predicate(record) ? record[value] ?? 0 : 0), 0);
}

function partnerReportingPackAmount(records: ErpFinanceLedgerRecord[], value: "amountGross" | "amountNet") {
  const pack = records.find((record) => record.family === "monthly-revenue-ledger-previews" && record.label === "Partner reporting finance pack preview");
  return pack?.[value] ?? sumAmount(records, value, (record) => record.family === "monthly-revenue-ledger-previews");
}

function risky(record: ErpFinanceLedgerRecord) {
  return record.status === "blocked" || record.status.includes("review") || record.status.includes("failed") || record.status.includes("chargeback") || record.priority === "critical";
}

function buildDecisionCards(records: ErpFinanceLedgerRecord[]): ErpFinanceLedgerReadModel["decisionCards"] {
  const revenueRows = records.filter((record) => record.family === "monthly-revenue-ledger-previews");
  const invoiceRows = records.filter((record) => record.family === "invoice-ledger-lines");
  const settlements = records.filter((record) => record.family === "payment-settlement-previews");
  const refunds = records.filter((record) => record.family === "refund-liability-previews");
  const reserves = records.filter((record) => record.family === "chargeback-reserve-previews");
  const partnerSummaries = records.filter((record) => record.family === "partner-finance-summaries");
  const reviewActions = records.filter((record) => record.family === "ledger-review-actions");

  const cards: ErpFinanceLedgerReadModel["decisionCards"] = [
    {
      key: "revenue-preview",
      label: "Revenue preview",
      value: money(partnerReportingPackAmount(records, "amountNet")),
      context: `${revenueRows.length} revenue rows from member billing, add-ons and recovery hold.`,
      status: revenueRows.some((record) => record.status === "blocked") ? "blocked" : revenueRows.some((record) => record.priority === "high") ? "attention" : "ready",
      filterFamily: "monthly-revenue-ledger-previews",
      searchTerm: "",
    },
    {
      key: "invoice-lines",
      label: "Invoice lines",
      value: String(invoiceRows.length),
      context: `${invoiceRows.filter(risky).length} member invoice rows need finance classification.`,
      status: invoiceRows.some((record) => record.priority === "critical") ? "blocked" : invoiceRows.some(risky) ? "attention" : "ready",
      filterFamily: "invoice-ledger-lines",
      searchTerm: "",
    },
    {
      key: "settlement-preview",
      label: "Settlements",
      value: money(sumAmount(settlements, "amountGross", () => true)),
      context: `${settlements.length} settlement previews; payments and accounting exports stay closed.`,
      status: settlements.some((record) => record.status === "blocked") ? "blocked" : settlements.some(risky) ? "attention" : "ready",
      filterFamily: "payment-settlement-previews",
      searchTerm: "",
    },
    {
      key: "refund-liability",
      label: "Refund liabilities",
      value: money(sumAmount(refunds, "amountGross", () => true)),
      context: "Refund and credit rows are checked before partner reporting is marked clean.",
      status: refunds.some((record) => record.priority === "critical") ? "blocked" : refunds.length > 0 ? "attention" : "ready",
      filterFamily: "refund-liability-previews",
      searchTerm: "",
    },
    {
      key: "chargeback-reserve",
      label: "Chargeback reserves",
      value: money(sumAmount(reserves, "amountGross", () => true)),
      context: "Reserve rows must be classified before revenue hold is cleared.",
      status: reserves.some((record) => record.status === "blocked") ? "blocked" : reserves.length > 0 ? "attention" : "ready",
      filterFamily: "chargeback-reserve-previews",
      searchTerm: "",
    },
    {
      key: "partner-summary",
      label: "Partner summaries",
      value: String(partnerSummaries.length),
      context: "Partner-visible finance summaries bridge operating ledger, forecast and package evidence.",
      status: partnerSummaries.some((record) => record.status === "blocked") ? "blocked" : partnerSummaries.some(risky) ? "attention" : "ready",
      filterFamily: "partner-finance-summaries",
      searchTerm: "",
    },
    {
      key: "ledger-review-actions",
      label: "Review actions",
      value: String(reviewActions.length),
      context: "Finance review actions can be staged as guarded Core command drafts.",
      status: reviewActions.some((record) => record.status === "blocked") ? "blocked" : reviewActions.length > 0 ? "attention" : "ready",
      filterFamily: "ledger-review-actions",
      searchTerm: "",
    },
  ];

  return cards.filter((card) => card.value !== "0" && card.value !== "EUR 0.00");
}

async function linkedCount(query: string, params: string[]) {
  const result = await getCorePgPool().query<{ count: string }>(query, params);
  return Number.parseInt(result.rows[0]?.count ?? "0", 10);
}

export async function getErpFinanceLedgerReadModel(role: RoleKey): Promise<ErpFinanceLedgerReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured || !access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");

  const [result, linkedMemberSourceRecords, linkedRecoveryRecords, linkedPartnerPerformanceRecords] = await Promise.all([
    getCorePgPool().query<SourceRow>(
      `
        select external_entity_type, external_entity_id, crays_entity_type, crays_entity_id, sync_status, last_synced_at, metadata
        from crays_core.external_record_maps
        where external_system = 'erp-engine'
          and metadata ->> 'seedBatch' = $1
        order by external_entity_type, external_entity_id
      `,
      [seedBatch],
    ),
    linkedCount(
      `
        select count(*)::text as count
        from crays_core.external_record_maps
        where external_system = 'member-app'
      `,
      [],
    ),
    linkedCount(
      `
        select count(*)::text as count
        from crays_core.external_record_maps
        where external_system = 'erp-engine'
          and metadata ->> 'seedBatch' = $1
      `,
      [recoverySeedBatch],
    ),
    linkedCount(
      `
        select count(*)::text as count
        from crays_core.external_record_maps
        where external_system = 'franchise-performance'
          and metadata ->> 'seedBatch' = $1
      `,
      [partnerPerformanceSeedBatch],
    ),
  ]);

  const allRecords = result.rows.map((row) => mapRecord(row, role));
  const records = allRecords
    .filter((record) => visibleFor(record, access))
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
  const statuses = [...new Set(records.map((record) => record.status).filter(Boolean))];
  const priorities = [...new Set(records.map((record) => record.priority).filter(Boolean))];

  return {
    ...empty(role, access, "schema_ready"),
    summary: {
      records: records.length,
      sourceRecords: result.rowCount ?? result.rows.length,
      linkedMemberSourceRecords,
      linkedRecoveryRecords,
      linkedPartnerPerformanceRecords,
      revenuePreviews: countFamily(records, "monthly-revenue-ledger-previews"),
      invoiceLines: countFamily(records, "invoice-ledger-lines"),
      paymentSettlements: countFamily(records, "payment-settlement-previews"),
      refundLiabilities: countFamily(records, "refund-liability-previews"),
      chargebackReserves: countFamily(records, "chargeback-reserve-previews"),
      cancellationAdjustments: countFamily(records, "cancellation-revenue-adjustments"),
      partnerSummaries: countFamily(records, "partner-finance-summaries"),
      reviewActions: countFamily(records, "ledger-review-actions"),
      netRevenuePreview: partnerReportingPackAmount(records, "amountNet"),
      grossRevenuePreview: partnerReportingPackAmount(records, "amountGross"),
      amountAtRisk: sumAmount(records, "amountGross", (record) => record.family === "partner-finance-summaries" && record.label.includes("cash-risk")),
      refundLiabilityAmount: sumAmount(records, "amountGross", (record) => record.family === "refund-liability-previews"),
      chargebackReserveAmount: sumAmount(records, "amountGross", (record) => record.family === "chargeback-reserve-previews"),
      blockedRows: records.filter((record) => record.status === "blocked" || record.priority === "critical").length,
      attentionRows: records.filter((record) => record.priority === "high" || record.status.includes("review") || record.status === "attention").length,
      conflicts: records.filter((record) => record.priority === "critical" || record.status === "blocked" || record.status.includes("review") || record.status.includes("failed")).length,
      freshnessMinutes,
    },
    decisionCards: buildDecisionCards(records),
    records,
    controls: {
      families: families.map((family) => ({ key: family, label: familyLabel(family), rows: records.filter((record) => record.family === family).length })),
      statuses: statuses.map((status) => ({ key: status, label: titleCase(status), rows: records.filter((record) => record.status === status).length })),
      priorities: priorities.map((priority) => ({ key: priority, label: titleCase(priority), rows: records.filter((record) => record.priority === priority).length })),
      sourceBacked: true,
      roleScoped: true,
    },
  };
}
