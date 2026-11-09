import {
  buildPreparedDealAssemblyReadiness,
  completePreparedDealAssemblyRecord,
  emptyPreparedDealAssemblyReadiness,
  preparedDealAssemblyAccessForRole,
  type PreparedDealAssemblyBenchmark,
  type PreparedDealAssemblyReadiness,
  type PreparedDealAssemblyRecord,
} from "@/lib/pilot-prepared-deal-assembly-contract";
import type { RoleKey } from "@/lib/roles";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const defaultSeedBatchId = "crays-benchmark-20260710-v1";

type BenchmarkRow = {
  prepared_deals: number;
  property_checks: number;
  location_ready_properties: number;
  rent_ready_properties: number;
  economics_ready_deals: number;
};

type PreparedDealAssemblyRow = {
  case_id: string;
  property_id: string;
  title: string;
  city: string | null;
  country: string | null;
  case_status: string;
  handoff_status: string;
  prepared_offer_id: string | null;
  offer_title: string | null;
  market: string | null;
  offer_status: string | null;
  candidate_release_state: string | null;
  public_teaser_enabled: boolean | null;
  partner_handoff_status: string | null;
  location_analyses: number;
  reviewed_location_analyses: number;
  evidence_packages: number;
  releasable_evidence_packages: number;
  document_links: number;
  approved_document_links: number;
  rent_potential_models: number;
  deal_economics_models: number;
  financial_models: number;
  workflow_events: number;
  project_signals: number;
  crm_signals: number;
  files_signals: number;
  erp_signals: number;
  analytics_signals: number;
  loans_signals: number;
  release_gates: number;
  blocked_release_gates: number;
  latest_event_at: Date | null;
};

function mapBenchmark(row: BenchmarkRow | undefined, seedBatchId: string): PreparedDealAssemblyBenchmark {
  return {
    seedBatchId,
    preparedDeals: row?.prepared_deals ?? 0,
    propertyChecks: row?.property_checks ?? 0,
    locationReadyProperties: row?.location_ready_properties ?? 0,
    rentReadyProperties: row?.rent_ready_properties ?? 0,
    economicsReadyDeals: row?.economics_ready_deals ?? 0,
    cleanupAvailable: Boolean(row && row.prepared_deals > 0),
  };
}

function mapAssemblyRecord(row: PreparedDealAssemblyRow): PreparedDealAssemblyRecord {
  return completePreparedDealAssemblyRecord({
    caseId: row.case_id,
    propertyId: row.property_id,
    preparedOfferId: row.prepared_offer_id,
    title: row.title,
    offerTitle: row.offer_title,
    market: row.market,
    city: row.city,
    country: row.country,
    caseStatus: row.case_status,
    handoffStatus: row.handoff_status,
    offerStatus: row.offer_status,
    candidateReleaseState: row.candidate_release_state,
    publicTeaserEnabled: row.public_teaser_enabled ?? false,
    partnerHandoffStatus: row.partner_handoff_status,
    latestEventAt: row.latest_event_at?.toISOString() ?? null,
    counts: {
      locationAnalyses: row.location_analyses,
      reviewedLocationAnalyses: row.reviewed_location_analyses,
      evidencePackages: row.evidence_packages,
      releasableEvidencePackages: row.releasable_evidence_packages,
      documentLinks: row.document_links,
      approvedDocumentLinks: row.approved_document_links,
      rentPotentialModels: row.rent_potential_models,
      dealEconomicsModels: row.deal_economics_models,
      financialModels: row.financial_models,
      workflowEvents: row.workflow_events,
      projectSignals: row.project_signals,
      crmSignals: row.crm_signals,
      filesSignals: row.files_signals,
      erpSignals: row.erp_signals,
      analyticsSignals: row.analytics_signals,
      loansSignals: row.loans_signals,
      releaseGates: row.release_gates,
      blockedReleaseGates: row.blocked_release_gates,
    },
  });
}

export async function getPreparedDealAssemblyReadiness(
  role: RoleKey,
  seedBatchId = defaultSeedBatchId,
): Promise<PreparedDealAssemblyReadiness> {
  const access = preparedDealAssemblyAccessForRole(role);
  const shell = emptyPreparedDealAssemblyReadiness(role);
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured || !access.allowed || access.level === "release_gated_candidate_shell") {
    return shell;
  }

  const pool = getCorePgPool();
  const [benchmarkResult, assemblyResult] = await Promise.all([
    pool.query<BenchmarkRow>(
      `
        select
          (select count(*)::int from crays_core.prepared_offers where metadata -> '__seed' ->> 'seed_batch_id' = $1) as prepared_deals,
          (select count(*)::int from crays_core.property_cases where metadata -> '__seed' ->> 'seed_batch_id' = $1) as property_checks,
          (select count(distinct property_case_id)::int from crays_core.location_evidence_runs where request_summary -> '__seed' ->> 'seed_batch_id' = $1) as location_ready_properties,
          (select count(distinct property_case_id)::int from crays_core.rent_potential_models where rent_range_summary -> '__seed' ->> 'seed_batch_id' = $1) as rent_ready_properties,
          (select count(distinct prepared_offer_id)::int from crays_core.deal_economics_models where capex_summary -> '__seed' ->> 'seed_batch_id' = $1) as economics_ready_deals
      `,
      [seedBatchId],
    ),
    pool.query<PreparedDealAssemblyRow>(
      `
        select
          property_cases.case_id,
          properties.property_id,
          properties.title,
          properties.city,
          properties.country,
          property_cases.status as case_status,
          property_cases.handoff_status,
          prepared_offer.offer_id as prepared_offer_id,
          prepared_offer.title as offer_title,
          prepared_offer.market,
          prepared_offer.status as offer_status,
          prepared_offer.candidate_release_state,
          prepared_offer.public_teaser_enabled,
          prepared_offer.partner_handoff_status,
          (
            select count(*)::int
            from crays_core.location_analyses
            where location_analyses.property_case_id = property_cases.case_id
          ) as location_analyses,
          (
            select count(*)::int
            from crays_core.location_analyses
            where location_analyses.property_case_id = property_cases.case_id
              and location_analyses.status in ('review', 'approved', 'released')
          ) as reviewed_location_analyses,
          (
            select count(*)::int
            from crays_core.evidence_packages
            where (
              evidence_packages.related_entity_type = 'property-case'
              and evidence_packages.related_entity_id = property_cases.case_id
            )
            or (
              evidence_packages.related_entity_type = 'prepared-offer'
              and evidence_packages.related_entity_id = prepared_offer.offer_id
            )
            or evidence_packages.package_id = prepared_offer.evidence_package_id
          ) as evidence_packages,
          (
            select count(*)::int
            from crays_core.evidence_packages
            where evidence_packages.release_state in ('candidate_released', 'bank_released', 'owner_released')
              and (
                (
                  evidence_packages.related_entity_type = 'property-case'
                  and evidence_packages.related_entity_id = property_cases.case_id
                )
                or (
                  evidence_packages.related_entity_type = 'prepared-offer'
                  and evidence_packages.related_entity_id = prepared_offer.offer_id
                )
                or evidence_packages.package_id = prepared_offer.evidence_package_id
              )
          ) as releasable_evidence_packages,
          (
            select count(*)::int
            from crays_core.document_package_links
            where (
              document_package_links.package_type = 'property-case'
              and document_package_links.package_id = property_cases.case_id
            )
            or (
              document_package_links.package_type = 'prepared-offer'
              and document_package_links.package_id = prepared_offer.offer_id
            )
          ) as document_links,
          (
            select count(*)::int
            from crays_core.document_package_links
            where document_package_links.status = 'approved'
              and (
                (
                  document_package_links.package_type = 'property-case'
                  and document_package_links.package_id = property_cases.case_id
                )
                or (
                  document_package_links.package_type = 'prepared-offer'
                  and document_package_links.package_id = prepared_offer.offer_id
                )
              )
          ) as approved_document_links,
          (
            select count(*)::int
            from crays_core.rent_potential_models
            where rent_potential_models.property_case_id = property_cases.case_id
              or rent_potential_models.prepared_offer_id = prepared_offer.offer_id
          ) as rent_potential_models,
          (
            select count(*)::int
            from crays_core.deal_economics_models
            where deal_economics_models.property_case_id = property_cases.case_id
              or deal_economics_models.prepared_offer_id = prepared_offer.offer_id
          ) as deal_economics_models,
          (
            select count(*)::int
            from crays_core.financial_models
            where financial_models.prepared_offer_id = prepared_offer.offer_id
          ) as financial_models,
          (
            select count(*)::int
            from crays_core.workflow_events
            where (
              workflow_events.related_entity_type = 'property-case'
              and workflow_events.related_entity_id = property_cases.case_id
            )
            or (
              workflow_events.related_entity_type = 'prepared-offer'
              and workflow_events.related_entity_id = prepared_offer.offer_id
            )
          ) as workflow_events,
          (
            select count(*)::int
            from crays_core.external_record_maps
            where external_record_maps.external_system = 'project'
              and (
                (
                  external_record_maps.crays_entity_type = 'property-case'
                  and external_record_maps.crays_entity_id = property_cases.case_id
                )
                or (
                  external_record_maps.crays_entity_type = 'prepared-offer'
                  and external_record_maps.crays_entity_id = prepared_offer.offer_id
                )
              )
          ) as project_signals,
          (
            select count(*)::int
            from crays_core.external_record_maps
            where external_record_maps.external_system = 'crm'
              and (
                (
                  external_record_maps.crays_entity_type = 'property-case'
                  and external_record_maps.crays_entity_id = property_cases.case_id
                )
                or (
                  external_record_maps.crays_entity_type = 'prepared-offer'
                  and external_record_maps.crays_entity_id = prepared_offer.offer_id
                )
              )
          ) as crm_signals,
          (
            select count(*)::int
            from crays_core.external_record_maps
            where external_record_maps.external_system = 'files'
              and external_record_maps.crays_entity_type = 'prepared-offer'
              and external_record_maps.crays_entity_id = prepared_offer.offer_id
          ) as files_signals,
          (
            select count(*)::int
            from crays_core.external_record_maps
            where external_record_maps.external_system = 'erp'
              and external_record_maps.crays_entity_type = 'prepared-offer'
              and external_record_maps.crays_entity_id = prepared_offer.offer_id
          ) as erp_signals,
          (
            select count(*)::int
            from crays_core.external_record_maps
            where external_record_maps.external_system = 'analytics'
              and external_record_maps.crays_entity_type = 'prepared-offer'
              and external_record_maps.crays_entity_id = prepared_offer.offer_id
          ) as analytics_signals,
          (
            select count(*)::int
            from crays_core.external_record_maps
            where external_record_maps.external_system = 'loans'
              and external_record_maps.crays_entity_type = 'prepared-offer'
              and external_record_maps.crays_entity_id = prepared_offer.offer_id
          ) as loans_signals,
          (
            select count(*)::int
            from crays_core.evidence_release_gates
            where (
              evidence_release_gates.related_entity_type = 'property-case'
              and evidence_release_gates.related_entity_id = property_cases.case_id
            )
            or (
              evidence_release_gates.related_entity_type = 'prepared-offer'
              and evidence_release_gates.related_entity_id = prepared_offer.offer_id
            )
          ) as release_gates,
          (
            select count(*)::int
            from crays_core.evidence_release_gates
            where evidence_release_gates.gate_status = 'blocked'
              and (
                (
                  evidence_release_gates.related_entity_type = 'property-case'
                  and evidence_release_gates.related_entity_id = property_cases.case_id
                )
                or (
                  evidence_release_gates.related_entity_type = 'prepared-offer'
                  and evidence_release_gates.related_entity_id = prepared_offer.offer_id
                )
              )
          ) as blocked_release_gates,
          (
            select max(occurred_at)
            from crays_core.workflow_events
            where (
              workflow_events.related_entity_type = 'property-case'
              and workflow_events.related_entity_id = property_cases.case_id
            )
            or (
              workflow_events.related_entity_type = 'prepared-offer'
              and workflow_events.related_entity_id = prepared_offer.offer_id
            )
          ) as latest_event_at
        from crays_core.property_cases
        join crays_core.properties on properties.property_id = property_cases.property_id
        left join lateral (
          select *
          from crays_core.prepared_offers
          where prepared_offers.property_case_id = property_cases.case_id
          order by prepared_offers.updated_at desc
          limit 1
        ) prepared_offer on true
        where property_cases.owner_role = 'expansion-manager'
          and property_cases.status = 'handoff_ready'
          and coalesce(property_cases.metadata -> '__seed' ->> 'seed_batch_id', '') <> $1
        order by property_cases.updated_at desc
        limit 5
      `,
      [seedBatchId],
    ),
  ]);

  const benchmark = mapBenchmark(benchmarkResult.rows[0], seedBatchId);
  const records = assemblyResult.rows.map(mapAssemblyRecord);

  return buildPreparedDealAssemblyReadiness(role, records, benchmark);
}
