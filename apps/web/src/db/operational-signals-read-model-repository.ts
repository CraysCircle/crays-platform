import type { RoleKey } from "@/lib/roles";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

type JsonRecord = Record<string, unknown>;
type SignalModuleKey = "dashboard" | "crm" | "project" | "erp" | "files" | "analytics" | "loans" | "operations";

const defaultSeedBatchId = "crays-benchmark-20260710-v1";

export type OperationalSignalQuery = {
  role: RoleKey;
  seedBatchId?: string;
  limit?: number;
};

export type OperationalSignalCase = {
  id: string;
  preparedOfferId: string;
  dealId: string | null;
  propertyCaseId: string | null;
  title: string;
  market: string;
  ownerRole: string;
  priority: "critical" | "high" | "medium";
  state: string;
  blocker: string;
  nextAction: string;
  latestEventAt: string;
  kpis: {
    location: number | null;
    bankability: number | null;
    openingReadiness: number | null;
    targetMRR: number | null;
    investment: number | null;
    approvedDocuments: number;
    documents: number;
    blockedGates: number;
    commandDrafts: number;
    workflowEvents: number;
  };
  links: {
    caseHref: string;
    primaryModuleHref: string;
    primaryModuleLabel: string;
  };
};

export type OperationalSignalEvent = {
  id: string;
  source: "workflow" | "command";
  label: string;
  eventType: string;
  actorRole: string | null;
  relatedEntityType: string;
  relatedEntityId: string;
  occurredAt: string;
};

export type OperationalSignalKpi = {
  key: string;
  label: string;
  value: string;
  context: string;
  tone: "green" | "amber" | "rose" | "blue" | "ink";
};

export type OperationalSignalsReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: "internal_operational_signals" | "forbidden";
  };
  roleFocus: {
    title: string;
    primaryAction: string;
    scope: string;
  };
  summary: {
    preparedDeals: number;
    criticalSignals: number;
    blockedReleaseGates: number;
    commandDrafts: number;
    workflowEvents: number;
    documentApprovalCoverage: number;
    averageOpeningReadiness: number | null;
  };
  kpis: OperationalSignalKpi[];
  signals: OperationalSignalCase[];
  events: OperationalSignalEvent[];
  boundaries: {
    liveSourceCallsEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    toolApplyEnabled: false;
    uploadsEnabled: false;
    privatePreviewEnabled: false;
    externalSendingEnabled: false;
    releaseActionsEnabled: false;
    financeActionsEnabled: false;
    bankActionsEnabled: false;
    paymentInitiationEnabled: false;
    productionDeployEnabled: false;
    vpsChangingWorkEnabled: false;
  };
  queryStatus: "not_configured" | "schema_ready" | "forbidden";
  secretsReturned: false;
  privateKeysReturned: false;
};

type EventRow = {
  event_id: string;
  event_type: string;
  actor_role: string | null;
  related_entity_type: string;
  related_entity_id: string;
  payload: JsonRecord;
  occurred_at: Date;
  source: "workflow" | "command";
};

type CountRow = {
  command_drafts: string;
  workflow_events: string;
};

type SignalRow = {
  offer_id: string;
  deal_id: string | null;
  property_case_id: string | null;
  title: string;
  market: string | null;
  city: string | null;
  country: string | null;
  offer_status: string;
  case_status: string | null;
  handoff_status: string | null;
  deal_stage: string | null;
  kyc_aml_status: string | null;
  equity_status: string | null;
  bank_handoff_status: string | null;
  bank_package_status: string | null;
  loan_decision_state: string | null;
  location_score: string | null;
  bankability_score: string | null;
  opening_readiness: string | null;
  target_mrr: string | null;
  target_raise: string | null;
  own_equity: string | null;
  bank_debt: string | null;
  document_links: string;
  approved_document_links: string;
  blocked_release_gates: string;
  ready_release_gates: string;
  project_signals: string;
  crm_signals: string;
  files_signals: string;
  erp_signals: string;
  analytics_signals: string;
  loans_signals: string;
  next_action: string | null;
  updated_at: Date;
};

const allowedRoles: RoleKey[] = ["crays-management", "admin", "deal-manager", "expansion-manager", "finance", "reviewer", "franchise-partner", "studio-manager"];

function boundedLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return 12;
  return Math.min(Math.max(Math.trunc(value ?? 12), 3), 24);
}

function asNumber(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function labelize(value: string) {
  return value.replaceAll("_", " ").replaceAll(".", " ");
}

function roleFocus(role: RoleKey): OperationalSignalsReadModel["roleFocus"] {
  if (role === "crays-management" || role === "admin") {
    return {
      title: "Portfolio operating signals",
      primaryAction: "Review blocked gates and stale execution signals",
      scope: "All prepared deal cases in the active test portfolio",
    };
  }

  if (role === "finance") {
    return {
      title: "Finance and bank readiness signals",
      primaryAction: "Resolve bank package and finance review blockers",
      scope: "Prepared deals with bank, finance and evidence pressure",
    };
  }

  if (role === "expansion-manager") {
    return {
      title: "Property and evidence signals",
      primaryAction: "Clear property supply and location evidence blockers",
      scope: "Prepared deals with owner/property dependencies",
    };
  }

  if (role === "franchise-partner" || role === "studio-manager") {
    return {
      title: "Opening continuation signals",
      primaryAction: "Track opening handoff and studio launch blockers",
      scope: "Opening and studio continuation cases",
    };
  }

  if (role === "reviewer") {
    return {
      title: "Review and release-gate signals",
      primaryAction: "Review redactions, room readiness and apply gates",
      scope: "Cases waiting on controlled review",
    };
  }

  return {
    title: "Prepared deal operating signals",
    primaryAction: "Open the most blocked prepared deal",
    scope: "Deal Manager prepared deal work",
  };
}

function boundaries(): OperationalSignalsReadModel["boundaries"] {
  return {
    liveSourceCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    uploadsEnabled: false,
    privatePreviewEnabled: false,
    externalSendingEnabled: false,
    releaseActionsEnabled: false,
    financeActionsEnabled: false,
    bankActionsEnabled: false,
    paymentInitiationEnabled: false,
    productionDeployEnabled: false,
    vpsChangingWorkEnabled: false,
  };
}

function emptyReadModel(query: OperationalSignalQuery, allowed: boolean, queryStatus: OperationalSignalsReadModel["queryStatus"]): OperationalSignalsReadModel {
  return {
    access: {
      role: query.role,
      allowed,
      level: allowed ? "internal_operational_signals" : "forbidden",
    },
    roleFocus: roleFocus(query.role),
    summary: {
      preparedDeals: 0,
      criticalSignals: 0,
      blockedReleaseGates: 0,
      commandDrafts: 0,
      workflowEvents: 0,
      documentApprovalCoverage: 0,
      averageOpeningReadiness: null,
    },
    kpis: [],
    signals: [],
    events: [],
    boundaries: boundaries(),
    queryStatus,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

const moduleLabels: Record<SignalModuleKey, string> = {
  dashboard: "Dashboard",
  crm: "CRM",
  project: "Project",
  erp: "ERP",
  files: "Files",
  analytics: "Analytics",
  loans: "Loans",
  operations: "Operations",
};

function asNullableNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function ownerRoleFor(role: RoleKey) {
  if (role === "crays-management") return "CRAYS Management";
  if (role === "admin") return "Admin";
  if (role === "expansion-manager") return "Expansion Manager";
  if (role === "finance") return "Finance";
  if (role === "reviewer") return "Reviewer";
  if (role === "franchise-partner") return "Franchise Partner";
  if (role === "studio-manager") return "Studio Manager";
  return "Deal Manager";
}

function primaryModuleFor(role: RoleKey): SignalModuleKey {
  if (role === "expansion-manager") return "crm";
  if (role === "finance") return "loans";
  if (role === "reviewer") return "files";
  if (role === "franchise-partner") return "project";
  if (role === "studio-manager") return "operations";
  if (role === "crays-management" || role === "admin") return "analytics";
  return "dashboard";
}

function priorityFromSignal(row: SignalRow): OperationalSignalCase["priority"] {
  const blocked = asNumber(row.blocked_release_gates);
  const bankability = asNullableNumber(row.bankability_score);
  const location = asNullableNumber(row.location_score);
  if (blocked > 0) return "critical";
  if ((bankability !== null && bankability < 72) || (location !== null && location < 72)) return "high";
  return "medium";
}

function stateFor(role: RoleKey, row: SignalRow) {
  if (role === "expansion-manager") return row.handoff_status ? `property ${labelize(row.handoff_status)}` : labelize(row.case_status ?? row.offer_status);
  if (role === "finance") return row.bank_package_status ? `bank package ${labelize(row.bank_package_status)}` : labelize(row.loan_decision_state ?? row.offer_status);
  if (role === "reviewer") return asNumber(row.blocked_release_gates) > 0 ? "release gate review" : "review-ready package";
  if (role === "franchise-partner" || role === "studio-manager") return row.handoff_status ? `opening ${labelize(row.handoff_status)}` : "opening handoff";
  if (role === "crays-management" || role === "admin") return `portfolio ${labelize(row.offer_status)}`;
  return labelize(row.deal_stage ?? row.case_status ?? row.offer_status);
}

function blockerFor(role: RoleKey, row: SignalRow) {
  const blocked = asNumber(row.blocked_release_gates);
  if (blocked > 0) return `${blocked} release gates blocked.`;
  if (role === "finance" && row.bank_package_status !== "ready") return "Bank package is not ready.";
  if (role === "finance" && row.loan_decision_state !== "approved") return "Loan decision is not approved.";
  if (role === "expansion-manager" && row.handoff_status !== "ready") return "Owner handoff is not ready.";
  if ((role === "franchise-partner" || role === "studio-manager") && asNullableNumber(row.opening_readiness) !== null && Number(row.opening_readiness) < 70) {
    return "Opening readiness needs handoff detail.";
  }
  return "No blocker in this read model.";
}

function nextActionFor(role: RoleKey, row: SignalRow) {
  const explicit = text(row.next_action);
  if (explicit) return explicit;
  if (role === "finance") return "Resolve bank package blockers";
  if (role === "expansion-manager") return "Review property fit";
  if (role === "reviewer") return "Review release gates";
  if (role === "franchise-partner" || role === "studio-manager") return "Review opening handoff";
  if (role === "crays-management" || role === "admin") return "Inspect portfolio blocker";
  return "Review prepared deal";
}

function caseHref(role: RoleKey, row: SignalRow) {
  const params = new URLSearchParams({
    role,
    case: row.offer_id,
    view: "case",
  });
  if (row.deal_id) params.set("deal", row.deal_id);
  if (row.property_case_id) params.set("propertyCase", row.property_case_id);
  return `/dashboard?${params.toString()}`;
}

function moduleHref(role: RoleKey, row: SignalRow, moduleKey: SignalModuleKey) {
  if (moduleKey === "dashboard") return caseHref(role, row);

  const viewByModule: Record<Exclude<SignalModuleKey, "dashboard">, string> = {
    crm: "timeline",
    project: "board",
    erp: "finance-summary",
    files: "vault",
    analytics: "scorecards",
    loans: "package-readiness",
    operations: "handoff",
  };
  const recordByModule: Record<Exclude<SignalModuleKey, "dashboard">, string> = {
    crm: "opportunities",
    project: "all",
    erp: "all",
    files: "all",
    analytics: "all",
    loans: "all",
    operations: "opening",
  };
  const params = new URLSearchParams({
    role,
    case: row.offer_id,
    view: viewByModule[moduleKey],
    record: recordByModule[moduleKey],
  });
  if (row.deal_id) params.set("deal", row.deal_id);
  if (row.property_case_id) params.set("propertyCase", row.property_case_id);
  return `/${moduleKey}?${params.toString()}`;
}

function marketFor(row: SignalRow) {
  return row.market ?? ([row.city, row.country].filter(Boolean).join(", ") || "Prepared market");
}

function signalFromRow(role: RoleKey, row: SignalRow): OperationalSignalCase {
  const primaryModule = primaryModuleFor(role);
  const moduleSignals =
    asNumber(row.project_signals) +
    asNumber(row.crm_signals) +
    asNumber(row.files_signals) +
    asNumber(row.erp_signals) +
    asNumber(row.analytics_signals) +
    asNumber(row.loans_signals);

  return {
    id: `${role}:${row.offer_id}`,
    preparedOfferId: row.offer_id,
    dealId: row.deal_id,
    propertyCaseId: row.property_case_id,
    title: row.title,
    market: marketFor(row),
    ownerRole: ownerRoleFor(role),
    priority: priorityFromSignal(row),
    state: stateFor(role, row),
    blocker: blockerFor(role, row),
    nextAction: nextActionFor(role, row),
    latestEventAt: row.updated_at.toISOString(),
    kpis: {
      location: asNullableNumber(row.location_score),
      bankability: asNullableNumber(row.bankability_score),
      openingReadiness: asNullableNumber(row.opening_readiness),
      targetMRR: asNullableNumber(row.target_mrr),
      investment: asNullableNumber(row.target_raise),
      approvedDocuments: asNumber(row.approved_document_links),
      documents: asNumber(row.document_links),
      blockedGates: asNumber(row.blocked_release_gates),
      commandDrafts: 0,
      workflowEvents: moduleSignals,
    },
    links: {
      caseHref: caseHref(role, row),
      primaryModuleHref: moduleHref(role, row, primaryModule),
      primaryModuleLabel: moduleLabels[primaryModule],
    },
  };
}

function eventFromRow(row: EventRow): OperationalSignalEvent {
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  return {
    id: `${row.source}:${row.event_id}`,
    source: row.source,
    label: text(payload.label) ?? text(payload.title) ?? text(payload.subject) ?? labelize(row.event_type),
    eventType: row.event_type,
    actorRole: row.actor_role,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    occurredAt: row.occurred_at.toISOString(),
  };
}

function summaryFromSignals(signals: OperationalSignalCase[], counts: CountRow): OperationalSignalsReadModel["summary"] {
  const documents = signals.reduce((total, signal) => total + signal.kpis.documents, 0);
  const approved = signals.reduce((total, signal) => total + signal.kpis.approvedDocuments, 0);
  return {
    preparedDeals: signals.length,
    criticalSignals: signals.filter((signal) => signal.priority === "critical").length,
    blockedReleaseGates: signals.reduce((total, signal) => total + signal.kpis.blockedGates, 0),
    commandDrafts: asNumber(counts.command_drafts),
    workflowEvents: asNumber(counts.workflow_events),
    documentApprovalCoverage: documents === 0 ? 0 : Math.round((approved / documents) * 100),
    averageOpeningReadiness: null,
  };
}

function buildKpis(summary: OperationalSignalsReadModel["summary"]): OperationalSignalKpi[] {
  return [
    {
      key: "critical-signals",
      label: "Critical signals",
      value: String(summary.criticalSignals),
      context: "Cases with blocked release gates",
      tone: summary.criticalSignals > 0 ? "rose" : "green",
    },
    {
      key: "blocked-gates",
      label: "Blocked gates",
      value: String(summary.blockedReleaseGates),
      context: "Release/apply stays closed",
      tone: summary.blockedReleaseGates > 0 ? "rose" : "green",
    },
    {
      key: "command-drafts",
      label: "Command drafts",
      value: String(summary.commandDrafts),
      context: "Persisted guarded Core drafts",
      tone: "blue",
    },
    {
      key: "document-coverage",
      label: "Document coverage",
      value: `${summary.documentApprovalCoverage}%`,
      context: "Approved document metadata",
      tone: summary.documentApprovalCoverage >= 75 ? "green" : "amber",
    },
    {
      key: "workflow-events",
      label: "Workflow events",
      value: String(summary.workflowEvents),
      context: "Core event backbone",
      tone: "ink",
    },
  ];
}

async function getSignalRows(seedBatchId: string, limit: number): Promise<SignalRow[]> {
  const pool = getCorePgPool();
  const prefetchLimit = Math.max(limit * 2, 24);
  const result = await pool.query<SignalRow>(
    `
      with bounded_offers as (
        select *
        from crays_core.prepared_offers
        where metadata -> '__seed' ->> 'seed_batch_id' = $1
        order by coalesce(nullif(metrics_snapshot ->> 'bankabilityScore', '')::numeric, 0) desc,
          updated_at desc
        limit $2
      )
      select
        bounded_offers.offer_id,
        deals.deal_id,
        property_cases.case_id as property_case_id,
        bounded_offers.title,
        bounded_offers.market,
        properties.city,
        properties.country,
        bounded_offers.status as offer_status,
        property_cases.status as case_status,
        property_cases.handoff_status,
        deals.stage as deal_stage,
        deals.kyc_aml_status,
        deals.equity_status,
        deals.bank_handoff_status,
        bank_packages.status as bank_package_status,
        loan_cases.decision_state as loan_decision_state,
        nullif(location_analyses.score_snapshot ->> 'siteScore', '') as location_score,
        nullif(bounded_offers.metrics_snapshot ->> 'bankabilityScore', '') as bankability_score,
        nullif(bounded_offers.metrics_snapshot ->> 'openingReadiness', '') as opening_readiness,
        nullif(bounded_offers.metrics_snapshot ->> 'targetMRR', '') as target_mrr,
        nullif(bounded_offers.metrics_snapshot ->> 'targetRaise', '') as target_raise,
        nullif(bounded_offers.metrics_snapshot ->> 'ownEquity', '') as own_equity,
        nullif(bounded_offers.metrics_snapshot ->> 'bankDebt', '') as bank_debt,
        coalesce(document_counts.document_links, 0)::text as document_links,
        coalesce(document_counts.approved_document_links, 0)::text as approved_document_links,
        coalesce(gate_counts.blocked_release_gates, 0)::text as blocked_release_gates,
        coalesce(gate_counts.ready_release_gates, 0)::text as ready_release_gates,
        coalesce(external_counts.project_signals, 0)::text as project_signals,
        coalesce(external_counts.crm_signals, 0)::text as crm_signals,
        coalesce(external_counts.files_signals, 0)::text as files_signals,
        coalesce(external_counts.erp_signals, 0)::text as erp_signals,
        coalesce(external_counts.analytics_signals, 0)::text as analytics_signals,
        coalesce(external_counts.loans_signals, 0)::text as loans_signals,
        coalesce(property_cases.review_summary ->> 'nextAction', deals.required_actions ->> 0, 'Review prepared deal') as next_action,
        bounded_offers.updated_at
      from bounded_offers
      left join crays_core.property_cases on property_cases.case_id = bounded_offers.property_case_id
      left join crays_core.properties on properties.property_id = property_cases.property_id
      left join crays_core.location_analyses on location_analyses.analysis_id = bounded_offers.location_analysis_id
      left join crays_core.deals on deals.prepared_offer_id = bounded_offers.offer_id
      left join crays_core.bank_packages on bank_packages.deal_id = deals.deal_id
      left join crays_core.loan_cases on loan_cases.bank_package_id = bank_packages.package_id
      left join lateral (
        select
          count(*)::int as document_links,
          count(*) filter (where status = 'approved')::int as approved_document_links
        from crays_core.document_package_links
        where
          (package_type = 'prepared-offer' and package_id = bounded_offers.offer_id)
          or (deals.deal_id is not null and package_type = 'deal' and package_id = deals.deal_id)
          or (property_cases.case_id is not null and package_type = 'property-case' and package_id = property_cases.case_id)
      ) document_counts on true
      left join lateral (
        select
          count(*) filter (where gate_status = 'blocked')::int as blocked_release_gates,
          count(*) filter (where gate_status = 'ready_for_review')::int as ready_release_gates
        from crays_core.evidence_release_gates
        where
          (related_entity_type = 'prepared-offer' and related_entity_id = bounded_offers.offer_id)
          or (property_cases.case_id is not null and related_entity_type = 'property-case' and related_entity_id = property_cases.case_id)
      ) gate_counts on true
      left join lateral (
        select
          count(*) filter (where external_system = 'project')::int as project_signals,
          count(*) filter (where external_system = 'crm')::int as crm_signals,
          count(*) filter (where external_system = 'files')::int as files_signals,
          count(*) filter (where external_system = 'erp')::int as erp_signals,
          count(*) filter (where external_system = 'analytics')::int as analytics_signals,
          count(*) filter (where external_system = 'loans')::int as loans_signals
        from crays_core.external_record_maps
        where
          (crays_entity_type = 'prepared-offer' and crays_entity_id = bounded_offers.offer_id)
          or (deals.deal_id is not null and crays_entity_type = 'deal' and crays_entity_id = deals.deal_id)
      ) external_counts on true
      order by coalesce(gate_counts.blocked_release_gates, 0) desc,
        coalesce(nullif(bounded_offers.metrics_snapshot ->> 'bankabilityScore', '')::numeric, 0) desc,
        bounded_offers.updated_at desc
      limit $3
    `,
    [seedBatchId, prefetchLimit, limit],
  );
  return result.rows;
}

async function getCounts(): Promise<CountRow> {
  const pool = getCorePgPool();
  const result = await pool.query<CountRow>(
    `
      select
        (select count(*)::text from crays_core.core_command_requests) as command_drafts,
        (select count(*)::text from crays_core.workflow_events) as workflow_events
    `,
  );
  return result.rows[0] ?? { command_drafts: "0", workflow_events: "0" };
}

async function getEvents(limit: number) {
  const pool = getCorePgPool();
  const [workflowResult, commandResult] = await Promise.all([
    pool.query<EventRow>(
      `
        select
          event_id,
          event_type,
          role_key as actor_role,
          related_entity_type,
          related_entity_id,
          payload,
          occurred_at,
          'workflow'::text as source
        from crays_core.workflow_events
        order by occurred_at desc, id desc
        limit $1
      `,
      [limit],
    ),
    pool.query<EventRow>(
      `
        select
          core_command_events.event_id,
          core_command_events.event_type,
          core_command_events.actor_role,
          core_command_requests.entity_type as related_entity_type,
          coalesce(core_command_requests.entity_scope ->> 'preparedOfferId', core_command_requests.entity_id, core_command_requests.command_id) as related_entity_id,
          core_command_events.payload_summary as payload,
          core_command_events.occurred_at,
          'command'::text as source
        from crays_core.core_command_events
        join crays_core.core_command_requests on core_command_requests.command_id = core_command_events.command_id
        order by core_command_events.occurred_at desc, core_command_events.id desc
        limit $1
      `,
      [limit],
    ),
  ]);

  return [...workflowResult.rows, ...commandResult.rows]
    .sort((a, b) => b.occurred_at.getTime() - a.occurred_at.getTime())
    .slice(0, limit)
    .map(eventFromRow);
}

export async function getOperationalSignalsReadModel(query: OperationalSignalQuery): Promise<OperationalSignalsReadModel> {
  const allowed = allowedRoles.includes(query.role);
  if (!allowed) return emptyReadModel(query, false, "forbidden");

  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured) return emptyReadModel(query, true, "not_configured");

  const limit = boundedLimit(query.limit);
  const seedBatchId = query.seedBatchId ?? defaultSeedBatchId;
  const [signalRows, counts, events] = await Promise.all([getSignalRows(seedBatchId, limit), getCounts(), getEvents(limit)]);
  const signals = signalRows.map((row) => signalFromRow(query.role, row));
  const summary = summaryFromSignals(signals, counts);

  return {
    access: {
      role: query.role,
      allowed: true,
      level: "internal_operational_signals",
    },
    roleFocus: roleFocus(query.role),
    summary,
    kpis: buildKpis(summary),
    signals,
    events,
    boundaries: boundaries(),
    queryStatus: "schema_ready",
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
