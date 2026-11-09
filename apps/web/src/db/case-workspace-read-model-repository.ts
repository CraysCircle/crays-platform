import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type CaseWorkspaceStatus = "ready" | "active" | "waiting" | "blocked";
type CaseWorkspaceModuleKey = "crm" | "project" | "erp" | "files" | "analytics" | "loans" | "operations";

export type CaseWorkspaceQuery = {
  role: RoleKey;
  preparedOfferId?: string | null;
  dealId?: string | null;
  propertyCaseId?: string | null;
};

export type CaseWorkspaceSection = {
  key: "property" | "evidence" | "economics" | "candidate" | "bank" | "files" | "opening";
  label: string;
  ownerRole: string;
  moduleKey: CaseWorkspaceModuleKey;
  objectId: string | null;
  state: string;
  status: CaseWorkspaceStatus;
  recentChange: string;
  blocker: string;
  nextAction: string;
};

export type CaseWorkspaceReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: "internal_case_workspace" | "forbidden";
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
    status: string;
    nextAction: string;
    updatedAt: string;
    scores: {
      location: number | null;
      bankability: number | null;
      openingReadiness: number | null;
      targetMRR: number | null;
      targetRaise: number | null;
      ownEquity: number | null;
      bankDebt: number | null;
    };
  } | null;
  summary: {
    sections: number;
    readySections: number;
    blockedSections: number;
    moduleDeepLinks: number;
    commandDrafts: number;
    latestCommandId: string | null;
  };
  sections: CaseWorkspaceSection[];
  moduleDeepLinks: Array<{
    moduleKey: CaseWorkspaceModuleKey;
    moduleLabel: "CRM" | "Project" | "ERP" | "Files" | "Analytics" | "Loans" | "Operations";
    href: string;
    purpose: string;
    objectId: string | null;
  }>;
  activity: {
    persistedCommandDrafts: number;
    latestCommandId: string | null;
    latestCreatedAt: string | null;
  };
  boundaries: {
    liveSourceCallsEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    toolApplyEnabled: false;
    uploadsEnabled: false;
    externalSendingEnabled: false;
    financeActionsEnabled: false;
    bankActionsEnabled: false;
    paymentInitiationEnabled: false;
    releaseActionsEnabled: false;
    productionDeployEnabled: false;
    vpsChangingWorkEnabled: false;
  };
  queryStatus: "not_configured" | "schema_ready" | "not_found" | "forbidden";
  secretsReturned: false;
  privateKeysReturned: false;
};

type CaseRow = {
  offer_id: string;
  deal_id: string | null;
  case_id: string | null;
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
  next_action: string | null;
  updated_at: Date;
};

type CountRow = {
  evidence_packages: string;
  location_runs: string;
  property_supply_records: string;
  rent_models: string;
  deal_economics_models: string;
  banking_snapshots: string;
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
};

type CommandActivityRow = {
  command_drafts: string;
  latest_command_id: string | null;
  latest_created_at: Date | null;
};

const allowedCaseWorkspaceRoles: RoleKey[] = [
  "crays-management",
  "admin",
  "deal-manager",
  "expansion-manager",
  "finance",
  "reviewer",
  "franchise-partner",
  "studio-manager",
];

const moduleLabels: Record<CaseWorkspaceModuleKey, CaseWorkspaceReadModel["moduleDeepLinks"][number]["moduleLabel"]> = {
  crm: "CRM",
  project: "Project",
  erp: "ERP",
  files: "Files",
  analytics: "Analytics",
  loans: "Loans",
  operations: "Operations",
};

function boundaries(): CaseWorkspaceReadModel["boundaries"] {
  return {
    liveSourceCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
    financeActionsEnabled: false,
    bankActionsEnabled: false,
    paymentInitiationEnabled: false,
    releaseActionsEnabled: false,
    productionDeployEnabled: false,
    vpsChangingWorkEnabled: false,
  };
}

function emptyReadModel(query: CaseWorkspaceQuery, allowed: boolean, queryStatus: CaseWorkspaceReadModel["queryStatus"]): CaseWorkspaceReadModel {
  return {
    access: {
      role: query.role,
      allowed,
      level: allowed ? "internal_case_workspace" : "forbidden",
    },
    query: {
      preparedOfferId: query.preparedOfferId ?? null,
      dealId: query.dealId ?? null,
      propertyCaseId: query.propertyCaseId ?? null,
    },
    case: null,
    summary: {
      sections: 0,
      readySections: 0,
      blockedSections: 0,
      moduleDeepLinks: 0,
      commandDrafts: 0,
      latestCommandId: null,
    },
    sections: [],
    moduleDeepLinks: [],
    activity: {
      persistedCommandDrafts: 0,
      latestCommandId: null,
      latestCreatedAt: null,
    },
    boundaries: boundaries(),
    queryStatus,
    secretsReturned: false,
    privateKeysReturned: false,
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

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function titleCase(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Pending";
}

function statusFrom(hasBlocker: boolean, ready: boolean, active = true): CaseWorkspaceStatus {
  if (hasBlocker) return "blocked";
  if (ready) return "ready";
  return active ? "active" : "waiting";
}

function buildModuleDeepLinks(role: RoleKey, preparedOfferId: string, row: CaseRow): CaseWorkspaceReadModel["moduleDeepLinks"] {
  const specs: Array<{
    moduleKey: CaseWorkspaceModuleKey;
    view: string;
    record: string;
    purpose: string;
    objectId: string | null;
  }> = [
    { moduleKey: "crm", view: "timeline", record: "opportunities", purpose: "Relationship, candidate and stakeholder timeline", objectId: row.deal_id },
    { moduleKey: "project", view: "board", record: "all", purpose: "Opening work items and handoff tasks", objectId: row.deal_id },
    { moduleKey: "erp", view: "finance-summary", record: "all", purpose: "Economics, budgets and finance review", objectId: row.deal_id },
    { moduleKey: "files", view: "vault", record: "all", purpose: "Evidence packages, documents and grants", objectId: preparedOfferId },
    { moduleKey: "analytics", view: "scorecards", record: "all", purpose: "Evidence scores, risk and KPI drill-down", objectId: preparedOfferId },
    { moduleKey: "loans", view: "package-readiness", record: "all", purpose: "Bank package, conditions and readiness blockers", objectId: row.deal_id },
    { moduleKey: "operations", view: "handoff", record: "opening", purpose: "Opening handoff, studio launch tasks and support escalation", objectId: row.deal_id },
  ];

  return specs.map((spec) => {
    const params = new URLSearchParams({
      role,
      case: preparedOfferId,
      view: spec.view,
      record: spec.record,
    });
    if (row.deal_id) params.set("deal", row.deal_id);
    if (row.case_id) params.set("propertyCase", row.case_id);
    return {
      moduleKey: spec.moduleKey,
      moduleLabel: moduleLabels[spec.moduleKey],
      href: `/${spec.moduleKey}?${params.toString()}`,
      purpose: spec.purpose,
      objectId: spec.objectId,
    };
  });
}

function buildSections(row: CaseRow, counts: CountRow): CaseWorkspaceSection[] {
  const approvedDocuments = asNumber(counts.approved_document_links);
  const documents = asNumber(counts.document_links);
  const blockedGates = asNumber(counts.blocked_release_gates);
  const locationScore = asNullableNumber(row.location_score);
  const bankabilityScore = asNullableNumber(row.bankability_score);
  const openingReadiness = asNullableNumber(row.opening_readiness);
  const economicsReady = asNumber(counts.rent_models) > 0 && asNumber(counts.deal_economics_models) > 0;
  const filesReady = documents > 0 && approvedDocuments >= documents;
  const bankReady = row.bank_package_status === "ready" || row.loan_decision_state === "approved";

  return [
    {
      key: "property",
      label: "Property",
      ownerRole: "Expansion Manager",
      moduleKey: "crm",
      objectId: row.case_id,
      state: locationScore === null ? `${titleCase(row.case_status)} property case` : `${locationScore}% location score`,
      status: statusFrom(!row.case_id, row.handoff_status === "ready"),
      recentChange: `${asNumber(counts.property_supply_records)} property records, ${asNumber(counts.location_runs)} location runs`,
      blocker: row.case_id ? "No active property blocker recorded." : "No property case is attached.",
      nextAction: row.handoff_status === "ready" ? "Confirm owner handoff evidence." : "Review owner facts and property fit.",
    },
    {
      key: "evidence",
      label: "Evidence",
      ownerRole: "Deal Manager",
      moduleKey: "files",
      objectId: row.offer_id,
      state: `${asNumber(counts.evidence_packages)} packages, ${blockedGates} blocked gates`,
      status: statusFrom(blockedGates > 0, asNumber(counts.evidence_packages) > 0 && blockedGates === 0),
      recentChange: `${asNumber(counts.ready_release_gates)} gates ready for review`,
      blocker: blockedGates > 0 ? "Release gates still blocked." : "No blocked evidence gate in this read model.",
      nextAction: blockedGates > 0 ? "Resolve blocked evidence gates." : "Review package completeness.",
    },
    {
      key: "economics",
      label: "Economics",
      ownerRole: "Finance",
      moduleKey: "erp",
      objectId: row.deal_id ?? row.offer_id,
      state: bankabilityScore === null ? "Bankability pending" : `${bankabilityScore}% bankability`,
      status: statusFrom(!economicsReady, economicsReady),
      recentChange: `${asNumber(counts.rent_models)} rent models, ${asNumber(counts.deal_economics_models)} economics models`,
      blocker: economicsReady ? "No economics blocker in this read model." : "Rent and deal economics models are incomplete.",
      nextAction: economicsReady ? "Review finance assumptions and bank debt mix." : "Complete rent potential and deal economics.",
    },
    {
      key: "candidate",
      label: "Candidate",
      ownerRole: "Deal Manager",
      moduleKey: "crm",
      objectId: row.deal_id,
      state: `${titleCase(row.deal_stage)} deal, ${titleCase(row.kyc_aml_status)} identity state`,
      status: statusFrom(row.kyc_aml_status !== "passed", row.kyc_aml_status === "passed" && row.equity_status === "confirmed"),
      recentChange: `Equity ${titleCase(row.equity_status)}`,
      blocker: row.kyc_aml_status === "passed" ? "No candidate blocker in this read model." : "Candidate identity or equity evidence is not cleared.",
      nextAction: "Review candidate intent and release readiness.",
    },
    {
      key: "bank",
      label: "Bank",
      ownerRole: "Finance",
      moduleKey: "loans",
      objectId: row.deal_id,
      state: `${titleCase(row.bank_package_status)} package, ${titleCase(row.loan_decision_state)} loan state`,
      status: statusFrom(!bankReady, bankReady),
      recentChange: `${asNumber(counts.banking_snapshots)} banking evidence snapshots`,
      blocker: bankReady ? "No bank blocker in this read model." : "Bank package or loan decision is not ready.",
      nextAction: "Review bank checklist and conditions.",
    },
    {
      key: "files",
      label: "Files",
      ownerRole: "Deal Manager",
      moduleKey: "files",
      objectId: row.offer_id,
      state: `${approvedDocuments}/${documents} approved documents`,
      status: statusFrom(documents > 0 && approvedDocuments < documents, filesReady, documents > 0),
      recentChange: `${asNumber(counts.files_signals)} Files module signals`,
      blocker: filesReady ? "No file blocker in this read model." : "Document approvals are incomplete.",
      nextAction: "Review evidence package and document grants.",
    },
    {
      key: "opening",
      label: "Opening",
      ownerRole: "Franchise Partner",
      moduleKey: "project",
      objectId: row.deal_id,
      state: openingReadiness === null ? "Opening readiness pending" : `${openingReadiness}% opening readiness`,
      status: statusFrom(openingReadiness === null || openingReadiness < 70, openingReadiness !== null && openingReadiness >= 85),
      recentChange: `${asNumber(counts.project_signals)} Project signals`,
      blocker: openingReadiness !== null && openingReadiness >= 70 ? "No opening blocker in this read model." : "Opening readiness needs project handoff detail.",
      nextAction: "Prepare opening handoff tasks.",
    },
  ];
}

async function getCounts(offerId: string, dealId: string | null, propertyCaseId: string | null) {
  const pool = getCorePgPool();
  const result = await pool.query<CountRow>(
    `
      select
        (
          select count(*)::text
          from crays_core.evidence_packages
          where (related_entity_type = 'prepared-offer' and related_entity_id = $1)
            or ($2::text is not null and related_entity_type = 'deal' and related_entity_id = $2)
            or ($3::text is not null and related_entity_type = 'property-case' and related_entity_id = $3)
        ) as evidence_packages,
        (select count(*)::text from crays_core.location_evidence_runs where property_case_id = $3) as location_runs,
        (select count(*)::text from crays_core.property_supply_records where property_case_id = $3) as property_supply_records,
        (select count(*)::text from crays_core.rent_potential_models where property_case_id = $3) as rent_models,
        (select count(*)::text from crays_core.deal_economics_models where prepared_offer_id = $1) as deal_economics_models,
        (select count(*)::text from crays_core.banking_evidence_snapshots where prepared_offer_id = $1) as banking_snapshots,
        (
          select count(*)::text
          from crays_core.document_package_links
          where (package_type = 'prepared-offer' and package_id = $1)
            or ($2::text is not null and package_type = 'deal' and package_id = $2)
        ) as document_links,
        (
          select count(*)::text
          from crays_core.document_package_links
          where status = 'approved'
            and (
              (package_type = 'prepared-offer' and package_id = $1)
              or ($2::text is not null and package_type = 'deal' and package_id = $2)
            )
        ) as approved_document_links,
        (
          select count(*)::text
          from crays_core.evidence_release_gates
          where gate_status = 'blocked'
            and (
              (related_entity_type = 'prepared-offer' and related_entity_id = $1)
              or ($3::text is not null and related_entity_type = 'property-case' and related_entity_id = $3)
            )
        ) as blocked_release_gates,
        (
          select count(*)::text
          from crays_core.evidence_release_gates
          where gate_status = 'ready_for_review'
            and (
              (related_entity_type = 'prepared-offer' and related_entity_id = $1)
              or ($3::text is not null and related_entity_type = 'property-case' and related_entity_id = $3)
            )
        ) as ready_release_gates,
        (select count(*)::text from crays_core.external_record_maps where external_system = 'project' and (crays_entity_id = $1 or crays_entity_id = $2 or crays_entity_id = $3)) as project_signals,
        (select count(*)::text from crays_core.external_record_maps where external_system = 'crm' and (crays_entity_id = $1 or crays_entity_id = $2 or crays_entity_id = $3)) as crm_signals,
        (select count(*)::text from crays_core.external_record_maps where external_system = 'files' and (crays_entity_id = $1 or crays_entity_id = $2 or crays_entity_id = $3)) as files_signals,
        (select count(*)::text from crays_core.external_record_maps where external_system = 'erp' and (crays_entity_id = $1 or crays_entity_id = $2 or crays_entity_id = $3)) as erp_signals,
        (select count(*)::text from crays_core.external_record_maps where external_system = 'analytics' and (crays_entity_id = $1 or crays_entity_id = $2 or crays_entity_id = $3)) as analytics_signals,
        (select count(*)::text from crays_core.external_record_maps where external_system = 'loans' and (crays_entity_id = $1 or crays_entity_id = $2 or crays_entity_id = $3)) as loans_signals
    `,
    [offerId, dealId, propertyCaseId],
  );

  return result.rows[0];
}

async function getCommandActivity(offerId: string, dealId: string | null, propertyCaseId: string | null) {
  const pool = getCorePgPool();
  const result = await pool.query<CommandActivityRow>(
    `
      select
        count(*)::text as command_drafts,
        (array_agg(command_id order by created_at desc, id desc))[1] as latest_command_id,
        (array_agg(created_at order by created_at desc, id desc))[1] as latest_created_at
      from crays_core.core_command_requests
      where entity_scope ->> 'preparedOfferId' = $1
        or entity_id = $1
        or ($2::text is not null and (entity_scope ->> 'dealId' = $2 or entity_id = $2))
        or ($3::text is not null and (entity_scope ->> 'propertyCaseId' = $3 or entity_id = $3))
    `,
    [offerId, dealId, propertyCaseId],
  );

  return result.rows[0];
}

export async function getCaseWorkspaceReadModel(query: CaseWorkspaceQuery): Promise<CaseWorkspaceReadModel> {
  const allowed = allowedCaseWorkspaceRoles.includes(query.role);
  if (!allowed) return emptyReadModel(query, false, "forbidden");

  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured) return emptyReadModel(query, true, "not_configured");

  const pool = getCorePgPool();
  const caseResult = await pool.query<CaseRow>(
    `
      select
        prepared_offers.offer_id,
        deals.deal_id,
        property_cases.case_id,
        prepared_offers.title,
        prepared_offers.market,
        properties.city,
        properties.country,
        prepared_offers.status as offer_status,
        property_cases.status as case_status,
        property_cases.handoff_status,
        deals.stage as deal_stage,
        deals.kyc_aml_status,
        deals.equity_status,
        deals.bank_handoff_status,
        bank_packages.status as bank_package_status,
        loan_cases.decision_state as loan_decision_state,
        nullif(location_analyses.score_snapshot ->> 'siteScore', '') as location_score,
        nullif(prepared_offers.metrics_snapshot ->> 'bankabilityScore', '') as bankability_score,
        nullif(prepared_offers.metrics_snapshot ->> 'openingReadiness', '') as opening_readiness,
        nullif(prepared_offers.metrics_snapshot ->> 'targetMRR', '') as target_mrr,
        nullif(prepared_offers.metrics_snapshot ->> 'targetRaise', '') as target_raise,
        nullif(prepared_offers.metrics_snapshot ->> 'ownEquity', '') as own_equity,
        nullif(prepared_offers.metrics_snapshot ->> 'bankDebt', '') as bank_debt,
        coalesce(property_cases.review_summary ->> 'nextAction', deals.required_actions ->> 0, 'Review prepared deal') as next_action,
        prepared_offers.updated_at
      from crays_core.prepared_offers
      left join crays_core.property_cases on property_cases.case_id = prepared_offers.property_case_id
      left join crays_core.properties on properties.property_id = property_cases.property_id
      left join crays_core.location_analyses on location_analyses.analysis_id = prepared_offers.location_analysis_id
      left join crays_core.deals on deals.prepared_offer_id = prepared_offers.offer_id
      left join crays_core.bank_packages on bank_packages.deal_id = deals.deal_id
      left join crays_core.loan_cases on loan_cases.bank_package_id = bank_packages.package_id
      where ($1::text is null or prepared_offers.offer_id = $1)
        and ($2::text is null or deals.deal_id = $2)
        and ($3::text is null or property_cases.case_id = $3)
      order by
        case when $1::text is not null and prepared_offers.offer_id = $1 then 0 else 1 end,
        coalesce(nullif(prepared_offers.metrics_snapshot ->> 'bankabilityScore', '')::numeric, 0) desc,
        prepared_offers.updated_at desc
      limit 1
    `,
    [query.preparedOfferId ?? null, query.dealId ?? null, query.propertyCaseId ?? null],
  );

  const row = caseResult.rows[0];
  if (!row) return emptyReadModel(query, true, "not_found");

  const [counts, commandActivity] = await Promise.all([getCounts(row.offer_id, row.deal_id, row.case_id), getCommandActivity(row.offer_id, row.deal_id, row.case_id)]);
  const sections = buildSections(row, counts);
  const moduleDeepLinks = buildModuleDeepLinks(query.role, row.offer_id, row);
  const readySections = sections.filter((section) => section.status === "ready").length;
  const blockedSections = sections.filter((section) => section.status === "blocked").length;
  const persistedCommandDrafts = asNumber(commandActivity.command_drafts);
  const latestCommandId = commandActivity.latest_command_id;

  return {
    access: {
      role: query.role,
      allowed: true,
      level: "internal_case_workspace",
    },
    query: {
      preparedOfferId: query.preparedOfferId ?? null,
      dealId: query.dealId ?? null,
      propertyCaseId: query.propertyCaseId ?? null,
    },
    case: {
      preparedOfferId: row.offer_id,
      dealId: row.deal_id,
      propertyCaseId: row.case_id,
      title: row.title,
      market: row.market ?? ([row.city, row.country].filter(Boolean).join(", ") || "Market pending"),
      city: row.city,
      country: row.country,
      status: row.offer_status,
      nextAction: row.next_action ?? "Review prepared deal",
      updatedAt: row.updated_at.toISOString(),
      scores: {
        location: asNullableNumber(row.location_score),
        bankability: asNullableNumber(row.bankability_score),
        openingReadiness: asNullableNumber(row.opening_readiness),
        targetMRR: asNullableNumber(row.target_mrr),
        targetRaise: asNullableNumber(row.target_raise),
        ownEquity: asNullableNumber(row.own_equity),
        bankDebt: asNullableNumber(row.bank_debt),
      },
    },
    summary: {
      sections: sections.length,
      readySections,
      blockedSections,
      moduleDeepLinks: moduleDeepLinks.length,
      commandDrafts: persistedCommandDrafts,
      latestCommandId,
    },
    sections,
    moduleDeepLinks,
    activity: {
      persistedCommandDrafts,
      latestCommandId,
      latestCreatedAt: iso(commandActivity.latest_created_at),
    },
    boundaries: boundaries(),
    queryStatus: "schema_ready",
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
