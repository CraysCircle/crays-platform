import {
  buildLocationRentEconomicsReadiness,
  buildLocationRentEconomicsReviewLanes,
  emptyLocationRentEconomicsReadiness,
  locationRentEconomicsAccessForRole,
  type LocationRentEconomicsBenchmark,
  type LocationRentEconomicsPilotReadiness,
  type LocationRentEconomicsPilotRecord,
} from "@/lib/pilot-location-rent-economics-contract";
import type { RoleKey } from "@/lib/roles";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";

const defaultSeedBatchId = "crays-benchmark-20260710-v1";

type BenchmarkRow = {
  prepared_deals: number;
  property_checks: number;
  location_ready_properties: number;
  rent_ready_properties: number;
  economics_ready_deals: number;
  rent_potential_models: number;
  deal_economics_models: number;
};

type PilotCaseRow = {
  case_id: string;
  property_id: string;
  title: string;
  city: string | null;
  country: string | null;
  property_status: string;
  case_status: string;
  current_phase: string;
  handoff_status: string;
  prepared_offer_id: string | null;
  offer_title: string | null;
  market: string | null;
  offer_status: string | null;
  candidate_release_state: string | null;
  public_teaser_enabled: boolean | null;
  partner_handoff_status: string | null;
  latest_location_status: string | null;
  location_score: string | null;
  prepared_offers: number;
  location_analyses: number;
  reviewed_location_analyses: number;
  rent_potential_models: number;
  deal_economics_models: number;
  financial_models: number;
  evidence_packages: number;
  document_links: number;
  approved_document_links: number;
  workflow_events: number;
  latest_event_at: Date | null;
};

function asNullableNumber(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nextBestRoleAction(record: Pick<LocationRentEconomicsPilotRecord, "counts" | "reviewLanes">) {
  if (record.counts.reviewedLocationAnalyses === 0) {
    return "Resolve location evidence review before economics work.";
  }

  if (record.counts.rentPotentialModels === 0 || record.counts.dealEconomicsModels === 0) {
    return "Review benchmark rent and deal economics assumptions for the pilot case.";
  }

  if (record.counts.financialModels === 0) {
    return "Review finance assumptions before internal package assembly.";
  }

  const blockingLane = record.reviewLanes.find((lane) => lane.status !== "ready");
  if (blockingLane) {
    return `Resolve ${blockingLane.label.toLowerCase()} before release decisions.`;
  }

  return "Prepare internal package assembly.";
}

function mapBenchmark(row: BenchmarkRow | undefined, seedBatchId: string): LocationRentEconomicsBenchmark {
  return {
    seedBatchId,
    preparedDeals: row?.prepared_deals ?? 0,
    propertyChecks: row?.property_checks ?? 0,
    locationReadyProperties: row?.location_ready_properties ?? 0,
    rentReadyProperties: row?.rent_ready_properties ?? 0,
    economicsReadyDeals: row?.economics_ready_deals ?? 0,
    rentPotentialModels: row?.rent_potential_models ?? 0,
    dealEconomicsModels: row?.deal_economics_models ?? 0,
    cleanupAvailable: Boolean(row && row.prepared_deals > 0),
  };
}

function mapPilotRecord(row: PilotCaseRow, benchmark: LocationRentEconomicsBenchmark): LocationRentEconomicsPilotRecord {
  const counts = {
    preparedOffers: row.prepared_offers,
    locationAnalyses: row.location_analyses,
    reviewedLocationAnalyses: row.reviewed_location_analyses,
    rentPotentialModels: row.rent_potential_models,
    dealEconomicsModels: row.deal_economics_models,
    financialModels: row.financial_models,
    evidencePackages: row.evidence_packages,
    documentLinks: row.document_links,
    approvedDocumentLinks: row.approved_document_links,
    workflowEvents: row.workflow_events,
  };
  const draftRecord = {
    caseId: row.case_id,
    propertyId: row.property_id,
    preparedOfferId: row.prepared_offer_id,
    title: row.title,
    offerTitle: row.offer_title,
    market: row.market,
    city: row.city,
    country: row.country,
    propertyStatus: row.property_status,
    caseStatus: row.case_status,
    currentPhase: row.current_phase,
    handoffStatus: row.handoff_status,
    offerStatus: row.offer_status,
    candidateReleaseState: row.candidate_release_state,
    publicTeaserEnabled: row.public_teaser_enabled ?? false,
    partnerHandoffStatus: row.partner_handoff_status,
    latestLocationStatus: row.latest_location_status,
    locationScore: asNullableNumber(row.location_score),
    latestEventAt: row.latest_event_at?.toISOString() ?? null,
    counts,
    reviewLanes: [],
    nextBestRoleAction: "Review location, rent and economics readiness.",
  };
  const reviewLanes = buildLocationRentEconomicsReviewLanes(draftRecord, benchmark);

  return {
    ...draftRecord,
    reviewLanes,
    nextBestRoleAction: nextBestRoleAction({ counts, reviewLanes }),
  };
}

export async function getLocationRentEconomicsPilotReadiness(
  role: RoleKey,
  seedBatchId = defaultSeedBatchId,
): Promise<LocationRentEconomicsPilotReadiness> {
  const access = locationRentEconomicsAccessForRole(role);
  const shell = emptyLocationRentEconomicsReadiness(role);
  const runtime = getCoreDatabaseRuntimeState();

  if (!runtime.configured || !access.allowed || access.level === "owner_scoped_economics_shell") {
    return shell;
  }

  const pool = getCorePgPool();
  const [benchmarkResult, caseResult] = await Promise.all([
    pool.query<BenchmarkRow>(
      `
        select
          (select count(*)::int from crays_core.prepared_offers where metadata -> '__seed' ->> 'seed_batch_id' = $1) as prepared_deals,
          (select count(*)::int from crays_core.property_cases where metadata -> '__seed' ->> 'seed_batch_id' = $1) as property_checks,
          (select count(distinct property_case_id)::int from crays_core.location_evidence_runs where request_summary -> '__seed' ->> 'seed_batch_id' = $1) as location_ready_properties,
          (select count(distinct property_case_id)::int from crays_core.rent_potential_models where rent_range_summary -> '__seed' ->> 'seed_batch_id' = $1) as rent_ready_properties,
          (select count(distinct prepared_offer_id)::int from crays_core.deal_economics_models where capex_summary -> '__seed' ->> 'seed_batch_id' = $1) as economics_ready_deals,
          (select count(*)::int from crays_core.rent_potential_models where rent_range_summary -> '__seed' ->> 'seed_batch_id' = $1) as rent_potential_models,
          (select count(*)::int from crays_core.deal_economics_models where capex_summary -> '__seed' ->> 'seed_batch_id' = $1) as deal_economics_models
      `,
      [seedBatchId],
    ),
    pool.query<PilotCaseRow>(
      `
        select
          property_cases.case_id,
          properties.property_id,
          properties.title,
          properties.city,
          properties.country,
          properties.status as property_status,
          property_cases.status as case_status,
          property_cases.current_phase,
          property_cases.handoff_status,
          prepared_offer.offer_id as prepared_offer_id,
          prepared_offer.title as offer_title,
          prepared_offer.market,
          prepared_offer.status as offer_status,
          prepared_offer.candidate_release_state,
          prepared_offer.public_teaser_enabled,
          prepared_offer.partner_handoff_status,
          latest_location.status as latest_location_status,
          nullif(latest_location.score_snapshot ->> 'siteScore', '') as location_score,
          (
            select count(*)::int
            from crays_core.prepared_offers
            where prepared_offers.property_case_id = property_cases.case_id
          ) as prepared_offers,
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
            from crays_core.rent_potential_models
            where rent_potential_models.property_case_id = property_cases.case_id
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
        left join lateral (
          select status, score_snapshot, updated_at, reviewed_at
          from crays_core.location_analyses
          where location_analyses.property_case_id = property_cases.case_id
          order by reviewed_at desc nulls last, updated_at desc
          limit 1
        ) latest_location on true
        where property_cases.owner_role = 'expansion-manager'
          and coalesce(property_cases.metadata -> '__seed' ->> 'seed_batch_id', '') <> $1
        order by property_cases.updated_at desc
        limit 5
      `,
      [seedBatchId],
    ),
  ]);

  const benchmark = mapBenchmark(benchmarkResult.rows[0], seedBatchId);
  const records = caseResult.rows.map((row) => mapPilotRecord(row, benchmark));

  return buildLocationRentEconomicsReadiness(role, records, benchmark);
}
