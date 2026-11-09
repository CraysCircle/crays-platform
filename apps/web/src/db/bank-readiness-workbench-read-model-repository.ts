import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type BankReadinessStatus = "ready" | "attention" | "blocked";
type BankReadinessPriority = "critical" | "high" | "normal";
type BankReadinessWorkflowMode =
  | "finance_owner"
  | "deal_manager_consumer"
  | "reviewer_gate_review"
  | "oversight"
  | "external_release_shell"
  | "forbidden";

export type BankReadinessWorkbenchQuery = {
  role: RoleKey;
  preparedOfferId?: string | null;
  dealId?: string | null;
  propertyCaseId?: string | null;
};

export type BankReadinessWorkItem = {
  key: string;
  label: string;
  ownerRole: string;
  status: BankReadinessStatus;
  priority: BankReadinessPriority;
  current: string;
  blocker: string;
  nextAction: string;
  commandType: "bank_package_checklist" | "loan_condition";
  commandAction: "update_checklist" | "update_condition" | "request_bank_review";
  checklistItemKey: string | null;
  conditionKey: string | null;
};

export type BankReadinessCondition = {
  key: string;
  label: string;
  value: string;
  status: BankReadinessStatus;
};

export type BankReadinessCommandHistoryItem = {
  commandId: string;
  label: string;
  actorRole: string;
  commandStatus: string;
  validationStatus: string;
  dryRunStatus: string;
  targetApplyStatus: "blocked" | "not_configured";
  applyGate: string;
  applyGateStatus: string;
  preflight: string;
  createdAt: string;
};

export type BankReadinessWorkbenchReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: "internal_bank_readiness" | "external_release_shell" | "forbidden";
    workflowMode: BankReadinessWorkflowMode;
    canViewInternalRecords: boolean;
    canStageChecklistDraft: boolean;
    canReviewReleaseGate: boolean;
  };
  query: {
    preparedOfferId: string | null;
    dealId: string | null;
    propertyCaseId: string | null;
  };
  case: {
    preparedOfferId: string;
    dealId: string | null;
    propertyCaseId: string | null;
    title: string;
    market: string;
    city: string | null;
    country: string | null;
    updatedAt: string;
    scores: {
      bankability: number | null;
      targetRaise: number | null;
      ownEquity: number | null;
      bankDebt: number | null;
      dscr: number | null;
    };
  } | null;
  package: {
    bankPackageId: string | null;
    status: string;
    releaseStatus: string;
    ownerRole: string | null;
    financialModelId: string | null;
    evidencePackageId: string | null;
    requiredChecks: string[];
  } | null;
  loanCase: {
    loanCaseId: string | null;
    status: string;
    decisionState: string;
    requestedAmountSummary: Array<{ label: string; value: string }>;
    conditionsSummary: BankReadinessCondition[];
  } | null;
  evidence: {
    snapshotId: string | null;
    snapshotStatus: string;
    consentState: string;
    accountInformationReadiness: string;
    transactionEvidenceReadiness: string;
    sourceOfFundsReadiness: string;
    financeModelStatus: string;
    approvedDocuments: number;
    totalDocuments: number;
    blockedGates: number;
    readyGates: number;
  };
  summary: {
    readinessScore: number;
    workItems: number;
    blockedItems: number;
    attentionItems: number;
    readyItems: number;
    conditions: number;
    commandDrafts: number;
    latestCommandId: string | null;
  };
  nextDecision: {
    label: string;
    priority: BankReadinessPriority;
    status: BankReadinessStatus;
    copy: string;
    actionLabel: string;
    workItemKey: string | null;
  };
  workItems: BankReadinessWorkItem[];
  history: BankReadinessCommandHistoryItem[];
  links: {
    caseHref: string | null;
    roomsHref: string | null;
    filesHref: string | null;
  };
  boundaries: {
    liveSourceCallsEnabled: false;
    bankPackageCreationEnabled: false;
    bankHandoffEnabled: false;
    lenderReleaseEnabled: false;
    bankSendEnabled: false;
    paymentInitiationEnabled: false;
    financeWritesEnabled: false;
    accountingExportsEnabled: false;
    uploadsEnabled: false;
    privatePreviewEnabled: false;
    externalSendingEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    toolApplyEnabled: false;
    productionDeployEnabled: false;
    vpsChangingWorkEnabled: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "not_found" | "forbidden";
  secretsReturned: false;
  privateKeysReturned: false;
};

type BankReadinessRow = {
  offer_id: string;
  deal_id: string | null;
  property_case_id: string | null;
  title: string;
  market: string | null;
  city: string | null;
  country: string | null;
  updated_at: Date;
  bankability_score: string | null;
  target_raise: string | null;
  own_equity: string | null;
  bank_debt: string | null;
  bank_package_id: string | null;
  bank_package_status: string | null;
  release_status: string | null;
  package_owner_role: string | null;
  financial_model_id: string | null;
  evidence_package_id: string | null;
  required_checks: unknown;
  finance_model_status: string | null;
  requested_amount_summary: unknown;
  loan_case_id: string | null;
  loan_status: string | null;
  decision_state: string | null;
  conditions_summary: unknown;
  snapshot_id: string | null;
  snapshot_status: string | null;
  consent_state: string | null;
  account_information_readiness: string | null;
  transaction_evidence_readiness: string | null;
  source_of_funds_readiness: string | null;
  approved_documents: string;
  total_documents: string;
  blocked_gates: string;
  ready_gates: string;
  command_drafts: string;
  latest_command_id: string | null;
};

type BankReadinessCommandHistoryRow = {
  command_id: string;
  command_key: string;
  actor_role: string;
  command_status: string;
  validation_status: string;
  dry_run_status: string;
  target_apply_status: "blocked" | "not_configured";
  apply_gate: string;
  apply_gate_status: string;
  input_payload: unknown;
  created_at: Date;
};

const allowedRoles: RoleKey[] = ["deal-manager", "finance", "reviewer", "crays-management", "admin", "bank-partner"];
const internalRoles: RoleKey[] = ["deal-manager", "finance", "reviewer", "crays-management", "admin"];

function accessForRole(role: RoleKey, allowed: boolean): BankReadinessWorkbenchReadModel["access"] {
  if (!allowed) {
    return {
      role,
      allowed: false,
      level: "forbidden",
      workflowMode: "forbidden",
      canViewInternalRecords: false,
      canStageChecklistDraft: false,
      canReviewReleaseGate: false,
    };
  }

  if (role === "bank-partner") {
    return {
      role,
      allowed: true,
      level: "external_release_shell",
      workflowMode: "external_release_shell",
      canViewInternalRecords: false,
      canStageChecklistDraft: false,
      canReviewReleaseGate: false,
    };
  }

  const workflowMode: BankReadinessWorkflowMode =
    role === "finance"
      ? "finance_owner"
      : role === "deal-manager"
        ? "deal_manager_consumer"
        : role === "reviewer"
          ? "reviewer_gate_review"
          : "oversight";

  return {
    role,
    allowed: true,
    level: "internal_bank_readiness",
    workflowMode,
    canViewInternalRecords: true,
    canStageChecklistDraft: role === "finance",
    canReviewReleaseGate: role === "reviewer",
  };
}

function boundaries(): BankReadinessWorkbenchReadModel["boundaries"] {
  return {
    liveSourceCallsEnabled: false,
    bankPackageCreationEnabled: false,
    bankHandoffEnabled: false,
    lenderReleaseEnabled: false,
    bankSendEnabled: false,
    paymentInitiationEnabled: false,
    financeWritesEnabled: false,
    accountingExportsEnabled: false,
    uploadsEnabled: false,
    privatePreviewEnabled: false,
    externalSendingEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    productionDeployEnabled: false,
    vpsChangingWorkEnabled: false,
  };
}

function emptyReadModel(query: BankReadinessWorkbenchQuery, allowed: boolean, queryStatus: BankReadinessWorkbenchReadModel["queryStatus"]): BankReadinessWorkbenchReadModel {
  return {
    access: accessForRole(query.role, allowed),
    query: {
      preparedOfferId: allowed ? (query.preparedOfferId ?? null) : null,
      dealId: allowed ? (query.dealId ?? null) : null,
      propertyCaseId: allowed ? (query.propertyCaseId ?? null) : null,
    },
    case: null,
    package: null,
    loanCase: null,
    evidence: {
      snapshotId: null,
      snapshotStatus: "not_found",
      consentState: "not_requested",
      accountInformationReadiness: "not_requested",
      transactionEvidenceReadiness: "not_requested",
      sourceOfFundsReadiness: "not_started",
      financeModelStatus: "not_found",
      approvedDocuments: 0,
      totalDocuments: 0,
      blockedGates: 0,
      readyGates: 0,
    },
    summary: {
      readinessScore: 0,
      workItems: 0,
      blockedItems: 0,
      attentionItems: 0,
      readyItems: 0,
      conditions: 0,
      commandDrafts: 0,
      latestCommandId: null,
    },
    nextDecision: {
      label: "Open bank readiness case",
      priority: "normal",
      status: "blocked",
      copy: "No bank readiness case is loaded.",
      actionLabel: "Stage bank checklist",
      workItemKey: null,
    },
    workItems: [],
    history: [],
    links: {
      caseHref: null,
      roomsHref: null,
      filesHref: null,
    },
    boundaries: boundaries(),
    queryStatus,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function bankPartnerShell(query: BankReadinessWorkbenchQuery, queryStatus: BankReadinessWorkbenchReadModel["queryStatus"]): BankReadinessWorkbenchReadModel {
  return {
    ...emptyReadModel(query, true, queryStatus),
    access: accessForRole(query.role, true),
    query: {
      preparedOfferId: null,
      dealId: null,
      propertyCaseId: null,
    },
    nextDecision: {
      label: "Bank package release required",
      priority: "normal",
      status: "blocked",
      copy: "No bank package is visible until CRAYS approves lender release for this scope.",
      actionLabel: "Release gate closed",
      workItemKey: null,
    },
  };
}

function asNumber(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function asNullableNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = "not recorded") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function words(value: string) {
  return value.replaceAll("_", " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function title(value: string) {
  if (value.toLowerCase() === "dscr") return "DSCR";
  return words(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  return [];
}

function stateStatus(value: string): BankReadinessStatus {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["ready", "approved", "cleared", "available", "granted", "released", "verified", "passed", "complete", "completed", "prepared"].includes(normalized)) {
    return "ready";
  }
  if (["review", "in_review", "in_progress", "requested", "pending", "conditional", "submitted", "questions", "scheduled", "opened"].includes(normalized)) {
    return "attention";
  }
  return "blocked";
}

function priorityFor(status: BankReadinessStatus): BankReadinessPriority {
  if (status === "blocked") return "critical";
  if (status === "attention") return "high";
  return "normal";
}

function formatCurrency(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "n/a";
  if (numeric >= 1000000) return `EUR ${(numeric / 1000000).toFixed(1)}M`;
  if (numeric >= 1000) return `EUR ${Math.round(numeric / 1000)}k`;
  return `EUR ${numeric.toLocaleString("en-US")}`;
}

function formatMetricValue(key: string, value: unknown) {
  if (key.toLowerCase().includes("amount") || key.toLowerCase().includes("equity") || key.toLowerCase().includes("debt")) return formatCurrency(value);
  if (key.toLowerCase() === "dscr") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(2) : "n/a";
  }
  return asString(value);
}

function metricRows(summary: unknown) {
  const record = asRecord(summary);
  const preferred = ["requestedAmount", "ownEquity", "bankDebt", "dscr"];
  const keys = [
    ...preferred.filter((key) => key in record),
    ...Object.keys(record).filter((key) => !preferred.includes(key) && !key.startsWith("__") && !key.endsWith("Enabled")),
  ];
  return keys.slice(0, 6).map((key) => ({
    label: title(key),
    value: formatMetricValue(key, record[key]),
  }));
}

function conditionRows(summary: unknown): BankReadinessCondition[] {
  const record = asRecord(summary);
  return Object.entries(record)
    .filter(([key]) => !key.startsWith("__") && !key.endsWith("Enabled"))
    .slice(0, 8)
    .map(([key, value]) => {
      const text = asString(value);
      return {
        key,
        label: title(key),
        value: words(text),
        status: stateStatus(text),
      };
    });
}

function workItem(input: Omit<BankReadinessWorkItem, "priority">): BankReadinessWorkItem {
  return {
    ...input,
    priority: priorityFor(input.status),
  };
}

function buildWorkItems(row: BankReadinessRow, conditions: BankReadinessCondition[]): BankReadinessWorkItem[] {
  const packageStatus = stateStatus(row.bank_package_status ?? "blocked");
  const releaseStatus = row.release_status === "ready" || row.release_status === "released" ? "ready" : "blocked";
  const financeModelStatus = stateStatus(row.finance_model_status ?? "blocked");
  const docsTotal = asNumber(row.total_documents);
  const docsApproved = asNumber(row.approved_documents);
  const documentStatus = docsTotal > 0 && docsApproved >= docsTotal ? "ready" : docsTotal > 0 ? "attention" : "blocked";
  const consentStatus = stateStatus(row.consent_state ?? "not_requested");
  const sourceOfFundsStatus = stateStatus(row.source_of_funds_readiness ?? "not_started");

  const base: BankReadinessWorkItem[] = [
    workItem({
      key: "bank-package-checklist",
      label: "Bank package checklist",
      ownerRole: "Finance",
      status: packageStatus,
      current: row.bank_package_id ? `${title(row.bank_package_status ?? "draft")} bank package is attached.` : "No bank package record is attached.",
      blocker: packageStatus === "ready" ? "No package blocker is recorded." : "Bank package is not ready for lender review.",
      nextAction: "Stage checklist review for bank package readiness.",
      commandType: "bank_package_checklist",
      commandAction: "update_checklist",
      checklistItemKey: "bank-package-checklist",
      conditionKey: null,
    }),
    workItem({
      key: "finance-model-review",
      label: "Finance model review",
      ownerRole: "Finance",
      status: financeModelStatus,
      current: row.financial_model_id ? `${title(row.finance_model_status ?? "draft")} financial model is attached.` : "No financial model is linked to this bank package.",
      blocker: financeModelStatus === "ready" ? "No finance model blocker is recorded." : "Finance model needs review before bank release.",
      nextAction: "Request finance model review before bank package release.",
      commandType: "bank_package_checklist",
      commandAction: "request_bank_review",
      checklistItemKey: "finance-model-review",
      conditionKey: null,
    }),
    workItem({
      key: "document-readiness",
      label: "Bank document readiness",
      ownerRole: "Finance",
      status: documentStatus,
      current: `${docsApproved}/${docsTotal} bank package documents approved.`,
      blocker: documentStatus === "ready" ? "No document blocker is recorded." : "Bank package document approvals are incomplete.",
      nextAction: "Review document package completeness and grants.",
      commandType: "bank_package_checklist",
      commandAction: "update_checklist",
      checklistItemKey: "document-readiness",
      conditionKey: null,
    }),
    workItem({
      key: "banking-evidence-consent",
      label: "Banking evidence consent",
      ownerRole: "Finance",
      status: consentStatus,
      current: `Consent ${words(row.consent_state ?? "not_requested")}, account evidence ${words(row.account_information_readiness ?? "not_requested")}.`,
      blocker: consentStatus === "ready" ? "No consent blocker is recorded." : "Banking evidence consent is not ready.",
      nextAction: "Review consent and evidence readiness.",
      commandType: "bank_package_checklist",
      commandAction: "update_checklist",
      checklistItemKey: "banking-evidence-consent",
      conditionKey: null,
    }),
    workItem({
      key: "source-of-funds",
      label: "Source of funds",
      ownerRole: "Finance",
      status: sourceOfFundsStatus,
      current: `Source-of-funds state is ${words(row.source_of_funds_readiness ?? "not_started")}.`,
      blocker: sourceOfFundsStatus === "ready" ? "No source-of-funds blocker is recorded." : "Source-of-funds evidence is not cleared.",
      nextAction: "Stage source-of-funds checklist item for finance review.",
      commandType: "bank_package_checklist",
      commandAction: "update_checklist",
      checklistItemKey: "source-of-funds",
      conditionKey: null,
    }),
    workItem({
      key: "bank-release-gate",
      label: "Bank release gate",
      ownerRole: "Reviewer",
      status: releaseStatus,
      current: `Release status is ${words(row.release_status ?? "blocked")}.`,
      blocker: releaseStatus === "ready" ? "Release is ready for review, not sent." : "Bank release gate is closed.",
      nextAction: "Keep release closed and resolve readiness blockers first.",
      commandType: "bank_package_checklist",
      commandAction: "request_bank_review",
      checklistItemKey: "bank-release-gate",
      conditionKey: null,
    }),
  ];

  const conditionItems = conditions.map((condition) =>
    workItem({
      key: `condition-${condition.key}`,
      label: `Condition - ${condition.label}`,
      ownerRole: "Finance",
      status: condition.status,
      current: condition.value,
      blocker: condition.status === "ready" ? "Condition is ready." : "Condition is not cleared.",
      nextAction: `Review ${condition.label.toLowerCase()} condition.`,
      commandType: "loan_condition",
      commandAction: "update_condition",
      checklistItemKey: null,
      conditionKey: condition.key,
    }),
  );

  return [...base, ...conditionItems].sort((left, right) => {
    const rank: Record<BankReadinessStatus, number> = { blocked: 0, attention: 1, ready: 2 };
    return rank[left.status] - rank[right.status] || left.label.localeCompare(right.label);
  });
}

function orderWorkItemsForRole(role: RoleKey, workItems: BankReadinessWorkItem[]) {
  const statusRank: Record<BankReadinessStatus, number> = { blocked: 0, attention: 1, ready: 2 };
  return [...workItems].sort((left, right) => {
    const ownerRank = (item: BankReadinessWorkItem) => {
      if (role === "finance" || role === "deal-manager") return item.ownerRole === "Finance" ? 0 : 1;
      if (role === "reviewer") return item.ownerRole === "Reviewer" ? 0 : 1;
      return 0;
    };
    return ownerRank(left) - ownerRank(right) || statusRank[left.status] - statusRank[right.status] || left.label.localeCompare(right.label);
  });
}

function readinessScore(workItems: BankReadinessWorkItem[]) {
  if (workItems.length === 0) return 0;
  const points = workItems.reduce((sum, item) => {
    if (item.status === "ready") return sum + 1;
    if (item.status === "attention") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((points / workItems.length) * 100);
}

function nextDecisionForRole(role: RoleKey, workItems: BankReadinessWorkItem[]): BankReadinessWorkbenchReadModel["nextDecision"] {
  const firstOpenItem = workItems.find((item) => item.status !== "ready") ?? workItems[0] ?? null;
  const financeItem = workItems.find((item) => item.ownerRole === "Finance" && item.status !== "ready") ?? firstOpenItem;
  const gateItem = workItems.find((item) => item.key === "bank-release-gate") ?? firstOpenItem;

  if (role === "reviewer") {
    return {
      label: gateItem?.label ?? "Bank release gate review",
      priority: gateItem?.priority ?? "normal",
      status: gateItem?.status ?? "blocked",
      copy: gateItem
        ? `${gateItem.blocker} Review package evidence and redactions; Finance retains checklist and condition ownership.`
        : "No bank release gate is available for review.",
      actionLabel: "Open bank room preflight",
      workItemKey: gateItem?.key ?? null,
    };
  }

  if (role === "deal-manager") {
    return {
      label: financeItem?.label ?? "Bank readiness coordination",
      priority: financeItem?.priority ?? "normal",
      status: financeItem?.status ?? "blocked",
      copy: financeItem
        ? `${financeItem.blocker} Coordinate missing deal evidence with Finance; Finance stages checklist and condition drafts.`
        : "No bank readiness work is available for coordination.",
      actionLabel: "Open supporting files",
      workItemKey: financeItem?.key ?? null,
    };
  }

  if (role === "crays-management" || role === "admin") {
    return {
      label: firstOpenItem?.label ?? "Bank readiness oversight",
      priority: firstOpenItem?.priority ?? "normal",
      status: firstOpenItem?.status ?? "blocked",
      copy: firstOpenItem
        ? `${firstOpenItem.blocker} Monitor ownership and escalation without taking over Finance checklist work.`
        : "No bank readiness exception is available for oversight.",
      actionLabel: "Open case oversight",
      workItemKey: firstOpenItem?.key ?? null,
    };
  }

  return {
    label: financeItem?.label ?? "Bank readiness checklist",
    priority: financeItem?.priority ?? "normal",
    status: financeItem?.status ?? "blocked",
    copy: financeItem ? `${financeItem.blocker} ${financeItem.nextAction}` : "No Finance-owned bank readiness work is available.",
    actionLabel: "Stage checklist draft",
    workItemKey: financeItem?.key ?? null,
  };
}

function buildLinks(role: RoleKey, row: BankReadinessRow) {
  const params = new URLSearchParams({
    role,
    case: row.offer_id,
  });
  if (row.deal_id) params.set("deal", row.deal_id);
  if (row.property_case_id) params.set("propertyCase", row.property_case_id);

  const filesParams = new URLSearchParams(params);
  filesParams.set("view", "vault");
  filesParams.set("record", "all");

  return {
    caseHref: `/dashboard?${params.toString()}&view=case`,
    roomsHref: `/dashboard?${params.toString()}&view=rooms`,
    filesHref: `/files?${filesParams.toString()}`,
  };
}

async function fetchBankReadinessRow(query: BankReadinessWorkbenchQuery) {
  const pool = getCorePgPool();
  const result = await pool.query<BankReadinessRow>(
    `
      select
        prepared_offers.offer_id,
        deals.deal_id,
        property_cases.case_id as property_case_id,
        prepared_offers.title,
        prepared_offers.market,
        properties.city,
        properties.country,
        prepared_offers.updated_at,
        nullif(prepared_offers.metrics_snapshot ->> 'bankabilityScore', '') as bankability_score,
        nullif(prepared_offers.metrics_snapshot ->> 'targetRaise', '') as target_raise,
        nullif(prepared_offers.metrics_snapshot ->> 'ownEquity', '') as own_equity,
        nullif(prepared_offers.metrics_snapshot ->> 'bankDebt', '') as bank_debt,
        bank_package.package_id as bank_package_id,
        bank_package.status as bank_package_status,
        bank_package.release_status,
        bank_package.owner_role as package_owner_role,
        bank_package.financial_model_id,
        bank_package.evidence_package_id,
        bank_package.required_checks,
        finance_model.status as finance_model_status,
        loan_case.loan_case_id,
        loan_case.status as loan_status,
        loan_case.decision_state,
        loan_case.requested_amount_summary,
        loan_case.conditions_summary,
        banking_snapshot.snapshot_id,
        banking_snapshot.snapshot_status,
        banking_snapshot.consent_state,
        banking_snapshot.account_information_readiness,
        banking_snapshot.transaction_evidence_readiness,
        banking_snapshot.source_of_funds_readiness,
        (
          select count(*)::text
          from crays_core.document_package_links links
          where (
            (bank_package.package_id is not null and links.package_type = 'bank-package' and links.package_id = bank_package.package_id)
            or (loan_case.loan_case_id is not null and links.package_type = 'loan-case' and links.package_id = loan_case.loan_case_id)
          )
            and links.status = 'approved'
        ) as approved_documents,
        (
          select count(*)::text
          from crays_core.document_package_links links
          where (
            (bank_package.package_id is not null and links.package_type = 'bank-package' and links.package_id = bank_package.package_id)
            or (loan_case.loan_case_id is not null and links.package_type = 'loan-case' and links.package_id = loan_case.loan_case_id)
          )
        ) as total_documents,
        (
          select count(*)::text
          from crays_core.evidence_release_gates gates
          where gates.gate_status = 'blocked'
            and (
              (bank_package.package_id is not null and gates.related_entity_type = 'bank-package' and gates.related_entity_id = bank_package.package_id)
              or (loan_case.loan_case_id is not null and gates.related_entity_type = 'loan-case' and gates.related_entity_id = loan_case.loan_case_id)
              or (gates.related_entity_type = 'prepared-offer' and gates.related_entity_id = prepared_offers.offer_id and lower(gates.target_audience) like '%bank%')
            )
        ) as blocked_gates,
        (
          select count(*)::text
          from crays_core.evidence_release_gates gates
          where gates.gate_status = 'ready_for_review'
            and (
              (bank_package.package_id is not null and gates.related_entity_type = 'bank-package' and gates.related_entity_id = bank_package.package_id)
              or (loan_case.loan_case_id is not null and gates.related_entity_type = 'loan-case' and gates.related_entity_id = loan_case.loan_case_id)
              or (gates.related_entity_type = 'prepared-offer' and gates.related_entity_id = prepared_offers.offer_id and lower(gates.target_audience) like '%bank%')
            )
        ) as ready_gates,
        (
          select count(*)::text
          from crays_core.core_command_requests commands
          where commands.module_key = 'loans'
            and (
              commands.entity_id in (bank_package.package_id, loan_case.loan_case_id, prepared_offers.offer_id, deals.deal_id)
              or commands.entity_scope ->> 'preparedOfferId' = prepared_offers.offer_id
              or commands.entity_scope ->> 'dealId' = deals.deal_id
              or commands.entity_scope ->> 'bankPackageId' = bank_package.package_id
              or commands.entity_scope ->> 'loanCaseId' = loan_case.loan_case_id
            )
        ) as command_drafts,
        (
          select commands.command_id
          from crays_core.core_command_requests commands
          where commands.module_key = 'loans'
            and (
              commands.entity_id in (bank_package.package_id, loan_case.loan_case_id, prepared_offers.offer_id, deals.deal_id)
              or commands.entity_scope ->> 'preparedOfferId' = prepared_offers.offer_id
              or commands.entity_scope ->> 'dealId' = deals.deal_id
              or commands.entity_scope ->> 'bankPackageId' = bank_package.package_id
              or commands.entity_scope ->> 'loanCaseId' = loan_case.loan_case_id
            )
          order by commands.created_at desc, commands.id desc
          limit 1
        ) as latest_command_id
      from crays_core.prepared_offers
      left join crays_core.property_cases on property_cases.case_id = prepared_offers.property_case_id
      left join crays_core.properties on properties.property_id = property_cases.property_id
      left join crays_core.deals on deals.prepared_offer_id = prepared_offers.offer_id
      left join lateral (
        select *
        from crays_core.bank_packages packages
        where packages.deal_id = deals.deal_id
        order by packages.updated_at desc, packages.id desc
        limit 1
      ) bank_package on true
      left join lateral (
        select *
        from crays_core.loan_cases loans
        where loans.bank_package_id = bank_package.package_id
        order by loans.updated_at desc, loans.id desc
        limit 1
      ) loan_case on true
      left join lateral (
        select *
        from crays_core.financial_models models
        where (bank_package.financial_model_id is not null and models.model_id = bank_package.financial_model_id)
          or (deals.deal_id is not null and models.deal_id = deals.deal_id)
        order by models.updated_at desc, models.id desc
        limit 1
      ) finance_model on true
      left join lateral (
        select *
        from crays_core.banking_evidence_snapshots snapshots
        where (bank_package.package_id is not null and snapshots.bank_package_id = bank_package.package_id)
          or (loan_case.loan_case_id is not null and snapshots.loan_case_id = loan_case.loan_case_id)
          or snapshots.prepared_offer_id = prepared_offers.offer_id
        order by snapshots.updated_at desc, snapshots.id desc
        limit 1
      ) banking_snapshot on true
      where ($1::text is null or prepared_offers.offer_id = $1)
        and ($2::text is null or deals.deal_id = $2)
        and ($3::text is null or property_cases.case_id = $3)
      order by
        case when $1::text is not null and prepared_offers.offer_id = $1 then 0 else 1 end,
        case when bank_package.package_id is not null then 0 else 1 end,
        coalesce(nullif(prepared_offers.metrics_snapshot ->> 'bankabilityScore', '')::numeric, 0) desc,
        prepared_offers.updated_at desc
      limit 1
    `,
    [query.preparedOfferId ?? null, query.dealId ?? null, query.propertyCaseId ?? null],
  );

  return result.rows[0] ?? null;
}

async function fetchBankReadinessHistory(row: BankReadinessRow): Promise<BankReadinessCommandHistoryItem[]> {
  const result = await getCorePgPool().query<BankReadinessCommandHistoryRow>(
    `
      select
        command_id,
        command_key,
        actor_role,
        command_status,
        validation_status,
        dry_run_status,
        target_apply_status,
        apply_gate,
        apply_gate_status,
        input_payload,
        created_at
      from crays_core.core_command_requests
      where module_key = 'loans'
        and (
          entity_id in ($1, $2, $3, $4)
          or entity_scope ->> 'preparedOfferId' = $1
          or entity_scope ->> 'dealId' = $2
          or entity_scope ->> 'bankPackageId' = $3
          or entity_scope ->> 'loanCaseId' = $4
        )
      order by created_at desc, id desc
      limit 5
    `,
    [row.offer_id, row.deal_id, row.bank_package_id, row.loan_case_id],
  );

  return result.rows.map((historyRow) => {
    const payload = asRecord(historyRow.input_payload);
    const label = asString(payload.title, title(historyRow.command_key.replaceAll(".", " ")));
    return {
      commandId: historyRow.command_id,
      label,
      actorRole: historyRow.actor_role,
      commandStatus: historyRow.command_status,
      validationStatus: historyRow.validation_status,
      dryRunStatus: historyRow.dry_run_status,
      targetApplyStatus: historyRow.target_apply_status,
      applyGate: historyRow.apply_gate,
      applyGateStatus: historyRow.apply_gate_status,
      preflight: `${words(historyRow.validation_status)} validation, ${words(historyRow.dry_run_status)} dry run, ${words(historyRow.apply_gate_status)} apply gate`,
      createdAt: historyRow.created_at.toISOString(),
    };
  });
}

export async function getBankReadinessWorkbenchReadModel(query: BankReadinessWorkbenchQuery): Promise<BankReadinessWorkbenchReadModel> {
  if (!allowedRoles.includes(query.role)) return emptyReadModel(query, false, "forbidden");

  const runtime = getCoreDatabaseRuntimeState();
  if (query.role === "bank-partner") return bankPartnerShell(query, runtime.configured ? "schema_ready" : "not_configured");
  if (!runtime.configured) return emptyReadModel(query, true, "not_configured");

  const row = await fetchBankReadinessRow(query);
  if (!row) return emptyReadModel(query, true, "not_found");

  const history = await fetchBankReadinessHistory(row);
  const conditions = conditionRows(row.conditions_summary);
  const requestedAmountSummary = metricRows(row.requested_amount_summary);
  const workItems = internalRoles.includes(query.role) ? orderWorkItemsForRole(query.role, buildWorkItems(row, conditions)) : [];
  const readyItems = workItems.filter((item) => item.status === "ready").length;
  const blockedItems = workItems.filter((item) => item.status === "blocked").length;
  const attentionItems = workItems.filter((item) => item.status === "attention").length;

  return {
    access: accessForRole(query.role, true),
    query: {
      preparedOfferId: query.preparedOfferId ?? null,
      dealId: query.dealId ?? null,
      propertyCaseId: query.propertyCaseId ?? null,
    },
    case: {
      preparedOfferId: row.offer_id,
      dealId: row.deal_id,
      propertyCaseId: row.property_case_id,
      title: row.title,
      market: row.market ?? "n/a",
      city: row.city,
      country: row.country,
      updatedAt: row.updated_at.toISOString(),
      scores: {
        bankability: asNullableNumber(row.bankability_score),
        targetRaise: asNullableNumber(row.target_raise),
        ownEquity: asNullableNumber(row.own_equity),
        bankDebt: asNullableNumber(row.bank_debt),
        dscr: asNullableNumber(asRecord(row.requested_amount_summary).dscr as string | number | null | undefined),
      },
    },
    package: {
      bankPackageId: row.bank_package_id,
      status: row.bank_package_status ?? "not_found",
      releaseStatus: row.release_status ?? "blocked",
      ownerRole: row.package_owner_role,
      financialModelId: row.financial_model_id,
      evidencePackageId: row.evidence_package_id,
      requiredChecks: stringArray(row.required_checks),
    },
    loanCase: row.loan_case_id
      ? {
          loanCaseId: row.loan_case_id,
          status: row.loan_status ?? "not_found",
          decisionState: row.decision_state ?? "pending",
          requestedAmountSummary,
          conditionsSummary: conditions,
        }
      : null,
    evidence: {
      snapshotId: row.snapshot_id,
      snapshotStatus: row.snapshot_status ?? "not_found",
      consentState: row.consent_state ?? "not_requested",
      accountInformationReadiness: row.account_information_readiness ?? "not_requested",
      transactionEvidenceReadiness: row.transaction_evidence_readiness ?? "not_requested",
      sourceOfFundsReadiness: row.source_of_funds_readiness ?? "not_started",
      financeModelStatus: row.finance_model_status ?? "not_found",
      approvedDocuments: asNumber(row.approved_documents),
      totalDocuments: asNumber(row.total_documents),
      blockedGates: asNumber(row.blocked_gates),
      readyGates: asNumber(row.ready_gates),
    },
    summary: {
      readinessScore: readinessScore(workItems),
      workItems: workItems.length,
      blockedItems,
      attentionItems,
      readyItems,
      conditions: conditions.length,
      commandDrafts: asNumber(row.command_drafts),
      latestCommandId: row.latest_command_id,
    },
    nextDecision: nextDecisionForRole(query.role, workItems),
    workItems,
    history,
    links: buildLinks(query.role, row),
    boundaries: boundaries(),
    queryStatus: "schema_ready",
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
