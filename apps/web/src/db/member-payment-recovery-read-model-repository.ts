import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type AccessLevel = "payment_recovery_full" | "payment_recovery_finance" | "payment_recovery_scoped" | "forbidden";
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

export type MemberPaymentRecoveryRecord = {
  id: string;
  family: string;
  label: string;
  craysEntityType: string;
  craysEntityId: string;
  memberId: string;
  memberName: string;
  status: string;
  priority: string;
  amountGross: number | null;
  currency: string;
  dueDate: string | null;
  nextAction: string;
  href: string;
  lastSyncedAt: string | null;
  fields: JsonRecord;
};

export type MemberPaymentRecoveryReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
    canViewLedgerPreview: boolean;
    canStageFinanceReview: boolean;
  };
  summary: {
    records: number;
    sourceRecords: number;
    recoveryCases: number;
    openRecoveryCases: number;
    refundReviews: number;
    cancellationSettlements: number;
    communicationPreflights: number;
    ledgerEvents: number;
    chargebackCases: number;
    criticalCases: number;
    amountAtRisk: number;
    refundsUnderReview: number;
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
  records: MemberPaymentRecoveryRecord[];
  controls: {
    families: Array<{ key: string; label: string; rows: number }>;
    statuses: Array<{ key: string; label: string; rows: number }>;
    priorities: Array<{ key: string; label: string; rows: number }>;
    sourceBacked: true;
    roleScoped: true;
  };
  actions: {
    stageFinanceReviewAllowed: boolean;
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

const seedBatch = "crays-member-payment-recovery-20260712-v1";
const fullRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const financeRoles: RoleKey[] = ["finance", "deal-manager"];
const scopedRoles: RoleKey[] = ["studio-manager", "franchise-partner"];
const commandRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "finance", "deal-manager", "franchise-partner"];
const scopedFamilies = new Set(["payment-recovery-cases", "refund-review-cases", "cancellation-settlements", "member-communication-preflights"]);
const ledgerFamily = "recovery-ledger-events";

function accessForRole(role: RoleKey): MemberPaymentRecoveryReadModel["access"] {
  if (fullRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "payment_recovery_full",
      reason: "Role can inspect the full payment recovery, refund, communication preflight and ledger-preview workflow.",
      canViewLedgerPreview: true,
      canStageFinanceReview: commandRoles.includes(role),
    };
  }

  if (financeRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "payment_recovery_finance",
      reason: "Role can inspect member payment recovery, refund review and ledger previews before any finance action is approved.",
      canViewLedgerPreview: true,
      canStageFinanceReview: commandRoles.includes(role),
    };
  }

  if (scopedRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "payment_recovery_scoped",
      reason: "Role can inspect studio-scoped recovery state and communication preflight, but ledger previews stay internal.",
      canViewLedgerPreview: false,
      canStageFinanceReview: commandRoles.includes(role),
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Role is outside the member payment recovery scope.",
    canViewLedgerPreview: false,
    canStageFinanceReview: false,
  };
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function titleCase(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function familyLabel(family: string) {
  const labels: Record<string, string> = {
    "payment-recovery-cases": "Payment recovery cases",
    "refund-review-cases": "Refund review cases",
    "cancellation-settlements": "Cancellation settlements",
    "member-communication-preflights": "Communication preflights",
    "recovery-ledger-events": "Recovery ledger previews",
  };
  return labels[family] ?? titleCase(family);
}

function statusFor(family: string, fields: JsonRecord, fallback: string) {
  if (family === "payment-recovery-cases") return text(fields.recoveryStatus, fallback);
  if (family === "refund-review-cases") return text(fields.reviewStatus, fallback);
  if (family === "cancellation-settlements") return text(fields.settlementStatus, fallback);
  if (family === "member-communication-preflights") return text(fields.consentStatus, fallback);
  if (family === ledgerFamily) return text(fields.ledgerStatus, fallback);
  return fallback;
}

function hrefFor(family: string, role: RoleKey) {
  const encodedRole = encodeURIComponent(role);
  if (family === "refund-review-cases") return `/operations?role=${encodedRole}&view=members&record=refunds`;
  if (family === "cancellation-settlements") return `/operations?role=${encodedRole}&view=members&record=cancellations`;
  if (family === "member-communication-preflights") return `/support?role=${encodedRole}&view=member-recovery`;
  if (family === ledgerFamily) return `/erp?role=${encodedRole}&view=ledger-preview`;
  return `/erp?role=${encodedRole}&view=payment-recovery`;
}

function rowFromMetadata(metadata: JsonRecord | null) {
  return asRecord(metadata?.row);
}

function fieldsFromMetadata(metadata: JsonRecord | null) {
  return asRecord(rowFromMetadata(metadata).fields);
}

function mapRecord(row: SourceRow, role: RoleKey): MemberPaymentRecoveryRecord {
  const sourceRow = rowFromMetadata(row.metadata);
  const fields = fieldsFromMetadata(row.metadata);
  const family = row.external_entity_type;
  const label = text(sourceRow.label, text(row.metadata?.label, row.external_entity_id));
  return {
    id: `${family}:${row.external_entity_id}`,
    family,
    label,
    craysEntityType: row.crays_entity_type,
    craysEntityId: row.crays_entity_id,
    memberId: text(fields.memberId, row.crays_entity_id),
    memberName: text(fields.memberName, "Member record"),
    status: statusFor(family, fields, row.sync_status),
    priority: text(sourceRow.priority, text(fields.priority, row.sync_status === "conflict" ? "high" : "medium")),
    amountGross: numberValue(fields.amountGross),
    currency: text(fields.currency, "EUR"),
    dueDate: text(sourceRow.dueDate, text(fields.dueDate, "")) || null,
    nextAction: text(fields.nextAction, "Review payment recovery record."),
    href: hrefFor(family, role),
    lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
    fields,
  };
}

function visibleFor(record: MemberPaymentRecoveryRecord, access: MemberPaymentRecoveryReadModel["access"]) {
  if (!access.allowed) return false;
  if (access.level === "payment_recovery_full" || access.level === "payment_recovery_finance") return true;
  if (access.level === "payment_recovery_scoped") return scopedFamilies.has(record.family);
  return false;
}

function empty(role: RoleKey, access: MemberPaymentRecoveryReadModel["access"], queryStatus: MemberPaymentRecoveryReadModel["queryStatus"]): MemberPaymentRecoveryReadModel {
  return {
    access,
    summary: {
      records: 0,
      sourceRecords: 0,
      recoveryCases: 0,
      openRecoveryCases: 0,
      refundReviews: 0,
      cancellationSettlements: 0,
      communicationPreflights: 0,
      ledgerEvents: 0,
      chargebackCases: 0,
      criticalCases: 0,
      amountAtRisk: 0,
      refundsUnderReview: 0,
      conflicts: 0,
      freshnessMinutes: null,
    },
    decisionCards: [],
    records: [],
    controls: { families: [], statuses: [], priorities: [], sourceBacked: true, roleScoped: true },
    actions: {
      stageFinanceReviewAllowed: access.canStageFinanceReview,
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

function countFamily(records: MemberPaymentRecoveryRecord[], family: string) {
  return records.filter((record) => record.family === family).length;
}

function sumAmount(records: MemberPaymentRecoveryRecord[], predicate: (record: MemberPaymentRecoveryRecord) => boolean) {
  return records.reduce((total, record) => total + (predicate(record) ? record.amountGross ?? 0 : 0), 0);
}

function buildDecisionCards(records: MemberPaymentRecoveryRecord[]): MemberPaymentRecoveryReadModel["decisionCards"] {
  const recoveryCases = records.filter((record) => record.family === "payment-recovery-cases");
  const chargebacks = recoveryCases.filter((record) => record.status.includes("chargeback") || record.label.toLowerCase().includes("chargeback"));
  const refundReviews = records.filter((record) => record.family === "refund-review-cases");
  const cancellationSettlements = records.filter((record) => record.family === "cancellation-settlements");
  const communicationPreflights = records.filter((record) => record.family === "member-communication-preflights");
  const ledgerEvents = records.filter((record) => record.family === ledgerFamily);

  const cards: MemberPaymentRecoveryReadModel["decisionCards"] = [
    {
      key: "payment-recovery",
      label: "Payment recovery",
      value: String(recoveryCases.length),
      context: `EUR ${sumAmount(recoveryCases, () => true).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in member recovery review.`,
      status: recoveryCases.length > 0 ? "attention" : "ready",
      filterFamily: "payment-recovery-cases",
      searchTerm: "",
    },
    {
      key: "chargeback-evidence",
      label: "Chargeback evidence",
      value: String(chargebacks.length),
      context: "Chargeback cases require evidence review before any finance posting.",
      status: chargebacks.length > 0 ? "blocked" : "ready",
      filterFamily: "payment-recovery-cases|refund-review-cases",
      searchTerm: "chargeback",
    },
    {
      key: "refund-review",
      label: "Refund review",
      value: String(refundReviews.length),
      context: `EUR ${sumAmount(refundReviews, () => true).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} under refund or credit review.`,
      status: refundReviews.length > 0 ? "attention" : "ready",
      filterFamily: "refund-review-cases",
      searchTerm: "",
    },
    {
      key: "cancellation-settlement",
      label: "Cancellation settlement",
      value: String(cancellationSettlements.length),
      context: "Cancelled or paused contracts are checked before billing cohorts update.",
      status: cancellationSettlements.length > 0 ? "attention" : "ready",
      filterFamily: "cancellation-settlements",
      searchTerm: "",
    },
    {
      key: "communication-preflight",
      label: "Communication preflight",
      value: String(communicationPreflights.length),
      context: "Member contact rules are checked before any outreach draft is prepared.",
      status: communicationPreflights.some((record) => record.status !== "payment_reminder_allowed") ? "blocked" : "ready",
      filterFamily: "member-communication-preflights",
      searchTerm: "",
    },
    {
      key: "ledger-preview",
      label: "Ledger previews",
      value: String(ledgerEvents.length),
      context: "Finance ledger entries are review-only; posting and export stay closed.",
      status: ledgerEvents.length > 0 ? "attention" : "ready",
      filterFamily: ledgerFamily,
      searchTerm: "",
    },
  ];

  return cards.filter((card) => Number(card.value) > 0);
}

export async function getMemberPaymentRecoveryReadModel(role: RoleKey): Promise<MemberPaymentRecoveryReadModel> {
  const access = accessForRole(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured || !access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");

  const result = await getCorePgPool().query<SourceRow>(
    `
      select external_entity_type, external_entity_id, crays_entity_type, crays_entity_id, sync_status, last_synced_at, metadata
      from crays_core.external_record_maps
      where external_system = 'erp-engine'
        and metadata ->> 'seedBatch' = $1
      order by external_entity_type, external_entity_id
    `,
    [seedBatch],
  );

  const allRecords = result.rows.map((row) => mapRecord(row, role));
  const records = allRecords
    .filter((record) => visibleFor(record, access))
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, normal: 3, low: 4 } as Record<string, number>;
      return (priorityOrder[a.priority] ?? 5) - (priorityOrder[b.priority] ?? 5) || a.family.localeCompare(b.family) || a.memberName.localeCompare(b.memberName);
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
      recoveryCases: countFamily(records, "payment-recovery-cases"),
      openRecoveryCases: records.filter((record) => record.family === "payment-recovery-cases" && !["processed", "settled", "closed"].includes(record.status)).length,
      refundReviews: countFamily(records, "refund-review-cases"),
      cancellationSettlements: countFamily(records, "cancellation-settlements"),
      communicationPreflights: countFamily(records, "member-communication-preflights"),
      ledgerEvents: countFamily(records, ledgerFamily),
      chargebackCases: records.filter((record) => record.label.toLowerCase().includes("chargeback") || record.status.includes("chargeback")).length,
      criticalCases: records.filter((record) => record.priority === "critical").length,
      amountAtRisk: sumAmount(records, (record) => ["payment-recovery-cases", ledgerFamily].includes(record.family) && record.amountGross !== null),
      refundsUnderReview: sumAmount(records, (record) => record.family === "refund-review-cases"),
      conflicts: records.filter((record) => record.priority === "critical" || record.status.includes("required") || record.status.includes("revoked")).length,
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
