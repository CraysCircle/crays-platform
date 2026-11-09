import type { RoleKey } from "@/lib/roles";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const defaultSeedBatchId = "crays-benchmark-20260710-v1";

const allowedRoles: RoleKey[] = [
  "crays-management",
  "admin",
  "deal-manager",
  "expansion-manager",
  "finance",
  "franchise-candidate",
  "franchise-partner",
  "studio-manager",
  "bank-partner",
  "landlord",
  "reviewer",
];

export type RealProductJourneyStep = {
  key: string;
  label: string;
  owner: string;
  ready: number;
  waiting: number;
  blocked: number;
  primaryAction: string;
};

export type RealProductCase = {
  offerId: string;
  dealId: string | null;
  propertyCaseId: string | null;
  title: string;
  market: string;
  city: string | null;
  country: string | null;
  status: string;
  caseStatus: string | null;
  handoffStatus: string | null;
  dealStage: string | null;
  kycAmlStatus: string | null;
  equityStatus: string | null;
  bankHandoffStatus: string | null;
  bankPackageStatus: string | null;
  loanDecisionState: string | null;
  scores: {
    location: number | null;
    bankability: number | null;
    openingReadiness: number | null;
    targetMRR: number | null;
    targetRaise: number | null;
    ownEquity: number | null;
    bankDebt: number | null;
  };
  evidence: {
    packages: number;
    locationRuns: number;
    propertySupplyRecords: number;
    rentModels: number;
    dealEconomicsModels: number;
    bankingSnapshots: number;
    documents: number;
    approvedDocuments: number;
    blockedReleaseGates: number;
    readyReleaseGates: number;
  };
  toolSignals: {
    project: number;
    crm: number;
    files: number;
    erp: number;
    analytics: number;
    loans: number;
  };
  nextAction: string;
  updatedAt: string;
};

export type RealProductReadModel = {
  configured: boolean;
  seedBatchId: string;
  role: RoleKey;
  access: {
    allowed: boolean;
    reason: string;
  };
  roleFocus: {
    title: string;
    summary: string;
    primaryView: string;
    primaryAction: string;
  };
  summary: {
    preparedDeals: number;
    propertyChecks: number;
    handoffReadyProperties: number;
    activeDeals: number;
    candidateIntents: number;
    bankPackages: number;
    bankReadyPackages: number;
    locationReadyProperties: number;
    rentReadyProperties: number;
    economicsReadyDeals: number;
    candidateClearedDeals: number;
    releaseReadyDeals: number;
    evidenceRecords: number;
    blockedReleaseGates: number;
    toolReadMaps: number;
  };
  journey: RealProductJourneyStep[];
  cases: RealProductCase[];
  dashboards: Array<{
    key: string;
    label: string;
    value: string;
    context: string;
    tone: "green" | "amber" | "rose" | "blue" | "ink";
  }>;
  dataFoundation: {
    realDevDatabase: boolean;
    seedRowsVerified: boolean;
    cleanupAvailable: boolean;
    readModelSource: string;
  };
  boundaries: {
    liveSourceCallsEnabled: false;
    sourceWritesEnabled: false;
    ownerUploadsEnabled: false;
    candidateReleaseEnabled: false;
    bankSendEnabled: false;
    paymentInitiationEnabled: false;
    externalSendingEnabled: false;
    productionDeployEnabled: false;
  };
  secretsReturned: false;
  privateKeysReturned: false;
};

type SummaryRow = {
  prepared_deals: string;
  property_checks: string;
  handoff_ready_properties: string;
  active_deals: string;
  candidate_intents: string;
  bank_packages: string;
  bank_ready_packages: string;
  location_ready_properties: string;
  rent_ready_properties: string;
  economics_ready_deals: string;
  candidate_cleared_deals: string;
  release_ready_deals: string;
  location_evidence_runs: string;
  property_supply_records: string;
  rent_potential_models: string;
  deal_economics_models: string;
  banking_evidence_snapshots: string;
  evidence_release_gates: string;
  blocked_release_gates: string;
  tool_read_maps: string;
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
  next_action: string | null;
  updated_at: Date;
};

function accessForRole(role: RoleKey): RealProductReadModel["access"] {
  if (allowedRoles.includes(role)) {
    return {
      allowed: true,
      reason: "Role can read the internal CRAYS real-product development workbench.",
    };
  }

  return {
    allowed: false,
    reason: "This workbench requires an internal, bank, owner, candidate or partner role.",
  };
}

function roleFocus(role: RoleKey): RealProductReadModel["roleFocus"] {
  if (role === "expansion-manager" || role === "landlord") {
    return {
      title: "Property check cockpit",
      summary: "Review owner intake, location fit, rent potential and handoff readiness before Deal Manager package work.",
      primaryView: "Owner property checks",
      primaryAction: "Review next property check",
    };
  }

  if (role === "finance" || role === "bank-partner") {
    return {
      title: "Bank evidence cockpit",
      summary: "Inspect finance readiness, file coverage, evidence gates and blocked bank-release dependencies.",
      primaryView: "Bank package readiness",
      primaryAction: "Resolve bank evidence blockers",
    };
  }

  if (role === "franchise-candidate") {
    return {
      title: "Candidate evidence cockpit",
      summary: "Track prepared deal detail, diligence requirements, financing path and release boundaries.",
      primaryView: "Candidate deal room",
      primaryAction: "Review candidate-ready package status",
    };
  }

  if (role === "franchise-partner") {
    return {
      title: "Partner handoff cockpit",
      summary: "Follow opening readiness, handoff state, project dependencies and operating launch evidence.",
      primaryView: "Opening handoff",
      primaryAction: "Clear handoff tasks",
    };
  }

  if (role === "studio-manager") {
    return {
      title: "Studio launch cockpit",
      summary: "Review launch readiness, Operations handoff tasks, service blockers and local studio continuation.",
      primaryView: "Studio continuation",
      primaryAction: "Review launch blockers",
    };
  }

  return {
    title: "Deal operating cockpit",
    summary: "Work the active franchise deal from property evidence through bank readiness, opening handoff and command review.",
    primaryView: "Prepared deal workbench",
    primaryAction: "Review highest-priority deal",
  };
}

function emptySummary(): RealProductReadModel["summary"] {
  return {
    preparedDeals: 0,
    propertyChecks: 0,
    handoffReadyProperties: 0,
    activeDeals: 0,
    candidateIntents: 0,
    bankPackages: 0,
    bankReadyPackages: 0,
    locationReadyProperties: 0,
    rentReadyProperties: 0,
    economicsReadyDeals: 0,
    candidateClearedDeals: 0,
    releaseReadyDeals: 0,
    evidenceRecords: 0,
    blockedReleaseGates: 0,
    toolReadMaps: 0,
  };
}

function boundaries(): RealProductReadModel["boundaries"] {
  return {
    liveSourceCallsEnabled: false,
    sourceWritesEnabled: false,
    ownerUploadsEnabled: false,
    candidateReleaseEnabled: false,
    bankSendEnabled: false,
    paymentInitiationEnabled: false,
    externalSendingEnabled: false,
    productionDeployEnabled: false,
  };
}

function emptyReadModel(role: RoleKey, configured: boolean, seedBatchId: string, access = accessForRole(role)): RealProductReadModel {
  return {
    configured,
    seedBatchId,
    role,
    access,
    roleFocus: roleFocus(role),
    summary: emptySummary(),
    journey: [],
    cases: [],
    dashboards: [],
    dataFoundation: {
      realDevDatabase: configured,
      seedRowsVerified: false,
      cleanupAvailable: false,
      readModelSource: "crays_core",
    },
    boundaries: boundaries(),
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

export async function getRealProductReadModel(role: RoleKey, seedBatchId = defaultSeedBatchId): Promise<RealProductReadModel> {
  const runtime = getCoreDatabaseRuntimeState();
  const access = accessForRole(role);

  if (!runtime.configured || !access.allowed) {
    return emptyReadModel(role, runtime.configured, seedBatchId, access);
  }

  const pool = getCorePgPool();
  const [summaryResult, casesResult] = await Promise.all([
    pool.query<SummaryRow>(
      `
        select
          (select count(*)::text from crays_core.prepared_offers where metadata -> '__seed' ->> 'seed_batch_id' = $1) as prepared_deals,
          (select count(*)::text from crays_core.property_cases where metadata -> '__seed' ->> 'seed_batch_id' = $1) as property_checks,
          (select count(*)::text from crays_core.property_cases where metadata -> '__seed' ->> 'seed_batch_id' = $1 and handoff_status = 'ready') as handoff_ready_properties,
          (select count(*)::text from crays_core.deals where metadata -> '__seed' ->> 'seed_batch_id' = $1 and status = 'active') as active_deals,
          (select count(*)::text from crays_core.candidate_intents where metadata -> '__seed' ->> 'seed_batch_id' = $1) as candidate_intents,
          (select count(*)::text from crays_core.bank_packages where metadata -> '__seed' ->> 'seed_batch_id' = $1) as bank_packages,
          (select count(*)::text from crays_core.bank_packages where metadata -> '__seed' ->> 'seed_batch_id' = $1 and status = 'ready') as bank_ready_packages,
          (select count(distinct property_case_id)::text from crays_core.location_evidence_runs where request_summary -> '__seed' ->> 'seed_batch_id' = $1) as location_ready_properties,
          (select count(distinct property_case_id)::text from crays_core.rent_potential_models where rent_range_summary -> '__seed' ->> 'seed_batch_id' = $1) as rent_ready_properties,
          (select count(distinct prepared_offer_id)::text from crays_core.deal_economics_models where capex_summary -> '__seed' ->> 'seed_batch_id' = $1) as economics_ready_deals,
          (select count(*)::text from crays_core.deals where metadata -> '__seed' ->> 'seed_batch_id' = $1 and kyc_aml_status = 'passed') as candidate_cleared_deals,
          (
            select count(distinct offer_id)::text
            from crays_core.prepared_offers
            where metadata -> '__seed' ->> 'seed_batch_id' = $1
              and not exists (
                select 1
                from crays_core.evidence_release_gates
                where release_summary -> '__seed' ->> 'seed_batch_id' = $1
                  and related_entity_id = prepared_offers.offer_id
                  and gate_status = 'blocked'
              )
          ) as release_ready_deals,
          (select count(*)::text from crays_core.location_evidence_runs where request_summary -> '__seed' ->> 'seed_batch_id' = $1) as location_evidence_runs,
          (select count(*)::text from crays_core.property_supply_records where rent_area_summary -> '__seed' ->> 'seed_batch_id' = $1) as property_supply_records,
          (select count(*)::text from crays_core.rent_potential_models where rent_range_summary -> '__seed' ->> 'seed_batch_id' = $1) as rent_potential_models,
          (select count(*)::text from crays_core.deal_economics_models where capex_summary -> '__seed' ->> 'seed_batch_id' = $1) as deal_economics_models,
          (select count(*)::text from crays_core.banking_evidence_snapshots where package_checklist_summary -> '__seed' ->> 'seed_batch_id' = $1) as banking_evidence_snapshots,
          (select count(*)::text from crays_core.evidence_release_gates where release_summary -> '__seed' ->> 'seed_batch_id' = $1) as evidence_release_gates,
          (select count(*)::text from crays_core.evidence_release_gates where release_summary -> '__seed' ->> 'seed_batch_id' = $1 and gate_status = 'blocked') as blocked_release_gates,
          (select count(*)::text from crays_core.external_record_maps where metadata -> '__seed' ->> 'seed_batch_id' = $1) as tool_read_maps
      `,
      [seedBatchId],
    ),
    pool.query<CaseRow>(
      `
        with evidence_counts as (
          select
            related_entity_type,
            related_entity_id,
            count(*)::int as evidence_packages
          from crays_core.evidence_packages
          where summary -> '__seed' ->> 'seed_batch_id' = $1
          group by related_entity_type, related_entity_id
        ),
        document_counts as (
          select
            package_type,
            package_id,
            count(*)::int as document_links,
            count(*) filter (where status = 'approved')::int as approved_document_links
          from crays_core.document_package_links
          where metadata -> '__seed' ->> 'seed_batch_id' = $1
          group by package_type, package_id
        ),
        external_counts as (
          select
            crays_entity_type,
            crays_entity_id,
            count(*) filter (where external_system = 'project')::int as project_signals,
            count(*) filter (where external_system = 'crm')::int as crm_signals,
            count(*) filter (where external_system = 'files')::int as files_signals,
            count(*) filter (where external_system = 'erp')::int as erp_signals,
            count(*) filter (where external_system = 'analytics')::int as analytics_signals,
            count(*) filter (where external_system = 'loans')::int as loans_signals
          from crays_core.external_record_maps
          where metadata -> '__seed' ->> 'seed_batch_id' = $1
          group by crays_entity_type, crays_entity_id
        ),
        gate_counts as (
          select
            related_entity_type,
            related_entity_id,
            count(*) filter (where gate_status = 'blocked')::int as blocked_release_gates,
            count(*) filter (where gate_status = 'ready_for_review')::int as ready_release_gates
          from crays_core.evidence_release_gates
          where release_summary -> '__seed' ->> 'seed_batch_id' = $1
          group by related_entity_type, related_entity_id
        ),
        location_runs as (
          select property_case_id, count(*)::int as location_runs
          from crays_core.location_evidence_runs
          where request_summary -> '__seed' ->> 'seed_batch_id' = $1
          group by property_case_id
        ),
        property_supply as (
          select property_case_id, count(*)::int as property_supply_records
          from crays_core.property_supply_records
          where rent_area_summary -> '__seed' ->> 'seed_batch_id' = $1
          group by property_case_id
        ),
        rent_models as (
          select property_case_id, count(*)::int as rent_models
          from crays_core.rent_potential_models
          where rent_range_summary -> '__seed' ->> 'seed_batch_id' = $1
          group by property_case_id
        ),
        deal_models as (
          select prepared_offer_id, count(*)::int as deal_economics_models
          from crays_core.deal_economics_models
          where capex_summary -> '__seed' ->> 'seed_batch_id' = $1
          group by prepared_offer_id
        ),
        banking_snapshots as (
          select prepared_offer_id, count(*)::int as banking_snapshots
          from crays_core.banking_evidence_snapshots
          where package_checklist_summary -> '__seed' ->> 'seed_batch_id' = $1
          group by prepared_offer_id
        )
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
          coalesce(offer_evidence.evidence_packages, 0) + coalesce(property_evidence.evidence_packages, 0) as evidence_packages,
          coalesce(location_runs.location_runs, 0) as location_runs,
          coalesce(property_supply.property_supply_records, 0) as property_supply_records,
          coalesce(rent_models.rent_models, 0) as rent_models,
          coalesce(deal_models.deal_economics_models, 0) as deal_economics_models,
          coalesce(banking_snapshots.banking_snapshots, 0) as banking_snapshots,
          coalesce(deal_docs.document_links, offer_docs.document_links, 0) as document_links,
          coalesce(deal_docs.approved_document_links, offer_docs.approved_document_links, 0) as approved_document_links,
          coalesce(offer_gates.blocked_release_gates, 0) + coalesce(property_gates.blocked_release_gates, 0) as blocked_release_gates,
          coalesce(offer_gates.ready_release_gates, 0) + coalesce(property_gates.ready_release_gates, 0) as ready_release_gates,
          coalesce(deal_external.project_signals, offer_external.project_signals, 0) as project_signals,
          coalesce(deal_external.crm_signals, offer_external.crm_signals, 0) as crm_signals,
          coalesce(deal_external.files_signals, offer_external.files_signals, 0) as files_signals,
          coalesce(deal_external.erp_signals, offer_external.erp_signals, 0) as erp_signals,
          coalesce(deal_external.analytics_signals, offer_external.analytics_signals, 0) as analytics_signals,
          coalesce(deal_external.loans_signals, offer_external.loans_signals, 0) as loans_signals,
          coalesce(property_cases.review_summary ->> 'nextAction', deals.required_actions ->> 0, 'Review prepared deal') as next_action,
          prepared_offers.updated_at
        from crays_core.prepared_offers
        left join crays_core.property_cases on property_cases.case_id = prepared_offers.property_case_id
        left join crays_core.properties on properties.property_id = property_cases.property_id
        left join crays_core.location_analyses on location_analyses.analysis_id = prepared_offers.location_analysis_id
        left join crays_core.deals on deals.prepared_offer_id = prepared_offers.offer_id
        left join crays_core.bank_packages on bank_packages.deal_id = deals.deal_id
        left join crays_core.loan_cases on loan_cases.bank_package_id = bank_packages.package_id
        left join evidence_counts offer_evidence on offer_evidence.related_entity_type = 'prepared-offer' and offer_evidence.related_entity_id = prepared_offers.offer_id
        left join evidence_counts property_evidence on property_evidence.related_entity_type = 'property-case' and property_evidence.related_entity_id = property_cases.case_id
        left join document_counts offer_docs on offer_docs.package_type = 'prepared-offer' and offer_docs.package_id = prepared_offers.offer_id
        left join document_counts deal_docs on deal_docs.package_type = 'deal' and deal_docs.package_id = deals.deal_id
        left join external_counts offer_external on offer_external.crays_entity_type = 'prepared-offer' and offer_external.crays_entity_id = prepared_offers.offer_id
        left join external_counts deal_external on deal_external.crays_entity_type = 'deal' and deal_external.crays_entity_id = deals.deal_id
        left join gate_counts offer_gates on offer_gates.related_entity_type = 'prepared-offer' and offer_gates.related_entity_id = prepared_offers.offer_id
        left join gate_counts property_gates on property_gates.related_entity_type = 'property-case' and property_gates.related_entity_id = property_cases.case_id
        left join location_runs on location_runs.property_case_id = property_cases.case_id
        left join property_supply on property_supply.property_case_id = property_cases.case_id
        left join rent_models on rent_models.property_case_id = property_cases.case_id
        left join deal_models on deal_models.prepared_offer_id = prepared_offers.offer_id
        left join banking_snapshots on banking_snapshots.prepared_offer_id = prepared_offers.offer_id
        where prepared_offers.metadata -> '__seed' ->> 'seed_batch_id' = $1
        order by coalesce(nullif(prepared_offers.metrics_snapshot ->> 'bankabilityScore', '')::numeric, 0) desc,
          prepared_offers.updated_at desc
        limit 18
      `,
      [seedBatchId],
    ),
  ]);

  const summaryRow = summaryResult.rows[0];
  const summary = mapSummary(summaryRow);
  const cases = casesResult.rows.map(mapCase);

  return {
    configured: true,
    seedBatchId,
    role,
    access,
    roleFocus: roleFocus(role),
    summary,
    journey: buildJourney(summary),
    cases,
    dashboards: buildDashboards(summary),
    dataFoundation: {
      realDevDatabase: true,
      seedRowsVerified: summary.preparedDeals > 0 && cases.length > 0,
      cleanupAvailable: true,
      readModelSource: "crays_core Neon Dev",
    },
    boundaries: boundaries(),
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function mapSummary(row: SummaryRow | undefined): RealProductReadModel["summary"] {
  const evidenceRecords =
    asNumber(row?.location_evidence_runs) +
    asNumber(row?.property_supply_records) +
    asNumber(row?.rent_potential_models) +
    asNumber(row?.deal_economics_models) +
    asNumber(row?.banking_evidence_snapshots) +
    asNumber(row?.evidence_release_gates);

  return {
    preparedDeals: asNumber(row?.prepared_deals),
    propertyChecks: asNumber(row?.property_checks),
    handoffReadyProperties: asNumber(row?.handoff_ready_properties),
    activeDeals: asNumber(row?.active_deals),
    candidateIntents: asNumber(row?.candidate_intents),
    bankPackages: asNumber(row?.bank_packages),
    bankReadyPackages: asNumber(row?.bank_ready_packages),
    locationReadyProperties: asNumber(row?.location_ready_properties),
    rentReadyProperties: asNumber(row?.rent_ready_properties),
    economicsReadyDeals: asNumber(row?.economics_ready_deals),
    candidateClearedDeals: asNumber(row?.candidate_cleared_deals),
    releaseReadyDeals: asNumber(row?.release_ready_deals),
    evidenceRecords,
    blockedReleaseGates: asNumber(row?.blocked_release_gates),
    toolReadMaps: asNumber(row?.tool_read_maps),
  };
}

function mapCase(row: CaseRow): RealProductCase {
  return {
    offerId: row.offer_id,
    dealId: row.deal_id,
    propertyCaseId: row.case_id,
    title: row.title,
    market: row.market ?? ([row.city, row.country].filter(Boolean).join(", ") || "Market pending"),
    city: row.city,
    country: row.country,
    status: row.offer_status,
    caseStatus: row.case_status,
    handoffStatus: row.handoff_status,
    dealStage: row.deal_stage,
    kycAmlStatus: row.kyc_aml_status,
    equityStatus: row.equity_status,
    bankHandoffStatus: row.bank_handoff_status,
    bankPackageStatus: row.bank_package_status,
    loanDecisionState: row.loan_decision_state,
    scores: {
      location: asNullableNumber(row.location_score),
      bankability: asNullableNumber(row.bankability_score),
      openingReadiness: asNullableNumber(row.opening_readiness),
      targetMRR: asNullableNumber(row.target_mrr),
      targetRaise: asNullableNumber(row.target_raise),
      ownEquity: asNullableNumber(row.own_equity),
      bankDebt: asNullableNumber(row.bank_debt),
    },
    evidence: {
      packages: asNumber(row.evidence_packages),
      locationRuns: asNumber(row.location_runs),
      propertySupplyRecords: asNumber(row.property_supply_records),
      rentModels: asNumber(row.rent_models),
      dealEconomicsModels: asNumber(row.deal_economics_models),
      bankingSnapshots: asNumber(row.banking_snapshots),
      documents: asNumber(row.document_links),
      approvedDocuments: asNumber(row.approved_document_links),
      blockedReleaseGates: asNumber(row.blocked_release_gates),
      readyReleaseGates: asNumber(row.ready_release_gates),
    },
    toolSignals: {
      project: asNumber(row.project_signals),
      crm: asNumber(row.crm_signals),
      files: asNumber(row.files_signals),
      erp: asNumber(row.erp_signals),
      analytics: asNumber(row.analytics_signals),
      loans: asNumber(row.loans_signals),
    },
    nextAction: row.next_action ?? "Review prepared deal",
    updatedAt: row.updated_at.toISOString(),
  };
}

function buildJourney(summary: RealProductReadModel["summary"]): RealProductJourneyStep[] {
  const ownerReady = summary.handoffReadyProperties;
  const locationReady = summary.locationReadyProperties;
  const rentReady = summary.rentReadyProperties;
  const dealReady = summary.economicsReadyDeals;
  const candidateReady = summary.candidateClearedDeals;
  const bankReady = summary.bankReadyPackages;
  const releaseReady = summary.releaseReadyDeals;

  return [
    {
      key: "owner-property-check",
      label: "Owner Property Check",
      owner: "Expansion",
      ready: ownerReady,
      waiting: Math.max(0, summary.propertyChecks - ownerReady),
      blocked: 0,
      primaryAction: "Review property facts, location fit and owner handoff state.",
    },
    {
      key: "location-intelligence",
      label: "Location Intelligence",
      owner: "Expansion",
      ready: locationReady,
      waiting: Math.max(0, summary.propertyChecks - locationReady),
      blocked: 0,
      primaryAction: "Inspect score, catchment evidence and source confidence.",
    },
    {
      key: "rent-potential",
      label: "Rent Potential",
      owner: "Expansion",
      ready: rentReady,
      waiting: Math.max(0, summary.propertyChecks - rentReady),
      blocked: 0,
      primaryAction: "Check rent range, lease fit and market context.",
    },
    {
      key: "prepared-deal",
      label: "Prepared Franchise Deal",
      owner: "Deal Manager",
      ready: dealReady,
      waiting: Math.max(0, summary.preparedDeals - dealReady),
      blocked: 0,
      primaryAction: "Combine property, evidence and economics into one package.",
    },
    {
      key: "candidate-evidence",
      label: "Candidate Evidence",
      owner: "Deal Manager",
      ready: candidateReady,
      waiting: Math.max(0, summary.candidateIntents - candidateReady),
      blocked: 0,
      primaryAction: "Confirm candidate-safe status before any release.",
    },
    {
      key: "bank-evidence",
      label: "Bank Evidence",
      owner: "Finance",
      ready: bankReady,
      waiting: Math.max(0, summary.bankPackages - bankReady),
      blocked: Math.max(0, summary.bankPackages - bankReady),
      primaryAction: "Resolve finance review and bank package blockers.",
    },
    {
      key: "controlled-release",
      label: "Controlled Release Gate",
      owner: "Reviewer",
      ready: releaseReady,
      waiting: Math.max(0, summary.preparedDeals - releaseReady),
      blocked: summary.blockedReleaseGates,
      primaryAction: "Approve release gates only after redaction and review.",
    },
  ];
}

function buildDashboards(summary: RealProductReadModel["summary"]): RealProductReadModel["dashboards"] {
  return [
    {
      key: "prepared-deals",
      label: "Prepared deals",
      value: String(summary.preparedDeals),
      context: `${summary.activeDeals} active deal records`,
      tone: "green",
    },
    {
      key: "property-checks",
      label: "Property checks",
      value: String(summary.propertyChecks),
      context: `${summary.handoffReadyProperties} handoff ready`,
      tone: "blue",
    },
    {
      key: "evidence-records",
      label: "Evidence records",
      value: String(summary.evidenceRecords),
      context: "location, rent, economics and banking",
      tone: "ink",
    },
    {
      key: "blocked-gates",
      label: "Blocked gates",
      value: String(summary.blockedReleaseGates),
      context: "no external release",
      tone: summary.blockedReleaseGates > 0 ? "rose" : "green",
    },
    {
      key: "tool-maps",
      label: "Module read maps",
      value: String(summary.toolReadMaps),
      context: "Project, CRM, Files, ERP, Analytics, Loans",
      tone: "amber",
    },
  ];
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
