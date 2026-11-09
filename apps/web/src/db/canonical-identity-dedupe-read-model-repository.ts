import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type ClusterRow = {
  cluster_type: "company-canonical" | "person-canonical" | "address-collision" | "lead-opportunity-match";
  identity_key: string;
  label: string | null;
  family_count: string;
  core_entity_count: string;
  companies: string;
  people: string;
  leads: string;
  opportunities: string;
  addresses: string;
  sample_labels: string[] | null;
  latest_at: Date | null;
};

export type CanonicalIdentityCluster = {
  id: string;
  type: ClusterRow["cluster_type"];
  label: string;
  status: "linked" | "review" | "blocked";
  priority: "low" | "medium" | "high";
  familyCount: number;
  coreEntityCount: number;
  companies: number;
  people: number;
  leads: number;
  opportunities: number;
  addresses: number;
  sampleLabels: string[];
  latestObservedAt: string | null;
  currentState: string;
  nextAction: string;
};

export type CanonicalIdentityDedupeReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: "identity_governance" | "crm_identity_review" | "forbidden";
    reason: string;
    canStageDedupeReview: boolean;
  };
  summary: {
    clusters: number;
    canonicalCompanies: number;
    canonicalPeople: number;
    addressCollisions: number;
    leadOpportunityMatches: number;
    reviewCandidates: number;
    blockedCandidates: number;
    representedCoreEntities: number;
    freshnessMinutes: number | null;
  };
  clusters: CanonicalIdentityCluster[];
  actions: {
    stageDedupeReviewAllowed: boolean;
    commandRoute: "/api/crays/core-command/sync-preview";
    confirmationHeader: "stage-sync-preview-command";
    applyGate: "OPEN_DEV_SYNC_APPLY";
    sourceMergeEnabled: false;
    sourceWritesEnabled: false;
    destructiveApplyEnabled: false;
  };
  boundaries: {
    sourceNativeIdsReturned: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    destructiveMergeEnabled: false;
    targetApplyEnabled: false;
    externalSendingEnabled: false;
    liveAiEnabled: false;
  };
  provenance: {
    sourceSystem: "twenty";
    projectionSource: "crays-core";
    schemaStatus: "requires-discovery";
    note: string;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const governanceRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const crmReviewRoles: RoleKey[] = ["deal-manager", "expansion-manager"];

function accessFor(role: RoleKey): CanonicalIdentityDedupeReadModel["access"] {
  if (governanceRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "identity_governance",
      reason: "Role can inspect cross-family CRM identity clusters and stage guarded dedupe review drafts.",
      canStageDedupeReview: true,
    };
  }

  if (crmReviewRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "crm_identity_review",
      reason: "Role can inspect CRM identity clusters for operating review; destructive merge and source writes remain closed.",
      canStageDedupeReview: false,
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Canonical identity and dedupe review is internal-only.",
    canStageDedupeReview: false,
  };
}

function empty(role: RoleKey, access: CanonicalIdentityDedupeReadModel["access"], queryStatus: CanonicalIdentityDedupeReadModel["queryStatus"]): CanonicalIdentityDedupeReadModel {
  return {
    access,
    summary: {
      clusters: 0,
      canonicalCompanies: 0,
      canonicalPeople: 0,
      addressCollisions: 0,
      leadOpportunityMatches: 0,
      reviewCandidates: 0,
      blockedCandidates: 0,
      representedCoreEntities: 0,
      freshnessMinutes: null,
    },
    clusters: [],
    actions: {
      stageDedupeReviewAllowed: access.canStageDedupeReview,
      commandRoute: "/api/crays/core-command/sync-preview",
      confirmationHeader: "stage-sync-preview-command",
      applyGate: "OPEN_DEV_SYNC_APPLY",
      sourceMergeEnabled: false,
      sourceWritesEnabled: false,
      destructiveApplyEnabled: false,
    },
    boundaries: {
      sourceNativeIdsReturned: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      destructiveMergeEnabled: false,
      targetApplyEnabled: false,
      externalSendingEnabled: false,
      liveAiEnabled: false,
    },
    provenance: {
      sourceSystem: "twenty",
      projectionSource: "crays-core",
      schemaStatus: "requires-discovery",
      note: "Identity clusters are computed from CRAYS Core projections. Twenty native IDs and source merge actions are intentionally absent.",
    },
    queryStatus,
  };
}

const number = (value: unknown) => Number(value ?? 0);
const title = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function minutesSince(value: Date | null) {
  return value ? Math.max(0, Math.round((Date.now() - value.getTime()) / 60_000)) : null;
}

function statusFor(row: ClusterRow): CanonicalIdentityCluster["status"] {
  if (row.cluster_type === "address-collision" && number(row.core_entity_count) > 1) return "blocked";
  if (row.cluster_type === "person-canonical" && number(row.people) > 1) return "review";
  if (row.cluster_type === "lead-opportunity-match" && number(row.leads) > 0 && number(row.opportunities) > 0) return "linked";
  if (number(row.family_count) > 2) return "review";
  return "linked";
}

function nextAction(row: ClusterRow, status: CanonicalIdentityCluster["status"]) {
  if (status === "blocked") return "Review address collision in a CRAYS dedupe draft; do not merge source records.";
  if (status === "review") return "Confirm whether linked records represent the same real-world entity before staging any dedupe recommendation.";
  if (row.cluster_type === "lead-opportunity-match") return "Use the linked lead/opportunity/company chain for operating context; no source write is opened.";
  return "Keep this canonical cluster as identity evidence and monitor freshness.";
}

async function readClusters(limit: number): Promise<ClusterRow[]> {
  const result = await getCorePgPool().query<ClusterRow>(
    `
      with crm as (
        select
          external_entity_type as family,
          crays_entity_id,
          last_synced_at,
          nullif(btrim(metadata #>> '{row,label}'), '') as label,
          nullif(btrim(metadata #>> '{row,fields,company}'), '') as company,
          nullif(btrim(metadata #>> '{row,fields,email}'), '') as email,
          nullif(btrim(metadata #>> '{row,fields,address}'), '') as address,
          nullif(btrim(metadata #>> '{row,fields,city}'), '') as city
        from crays_core.external_record_maps
        where external_system = 'crm-operational-fixture'
          and external_entity_type in ('companies','people','leads','opportunities')
      ),
      normalized as (
        select
          family,
          crays_entity_id,
          last_synced_at,
          label,
          lower(regexp_replace(coalesce(company, case when family='companies' then label end, ''), '[^a-zA-Z0-9]+', '', 'g')) as company_key,
          lower(regexp_replace(coalesce(email, ''), '\\s+', '', 'g')) as email_key,
          lower(regexp_replace(coalesce(address, '') || '|' || coalesce(city, ''), '[^a-zA-Z0-9|]+', '', 'g')) as address_key,
          coalesce(company, case when family='companies' then label end, label, 'Unlabeled CRM identity') as company_label,
          coalesce(email, label, 'Unlabeled CRM person') as person_label,
          coalesce(address || ', ' || city, address, city, label, 'Unlabeled CRM address') as address_label
        from crm
      ),
      company_clusters as (
        select
          'company-canonical'::text as cluster_type,
          company_key as identity_key,
          max(company_label) as label,
          count(distinct family)::text as family_count,
          count(distinct crays_entity_id)::text as core_entity_count,
          count(*) filter(where family='companies')::text as companies,
          count(*) filter(where family='people')::text as people,
          count(*) filter(where family='leads')::text as leads,
          count(*) filter(where family='opportunities')::text as opportunities,
          count(distinct nullif(address_key, '|'))::text as addresses,
          array_remove(array_agg(distinct label order by label), null)[1:5] as sample_labels,
          max(last_synced_at) as latest_at
        from normalized
        where company_key <> ''
        group by company_key
        having count(distinct crays_entity_id) >= 3
      ),
      person_clusters as (
        select
          'person-canonical'::text as cluster_type,
          email_key as identity_key,
          max(person_label) as label,
          count(distinct family)::text as family_count,
          count(distinct crays_entity_id)::text as core_entity_count,
          count(*) filter(where family='companies')::text as companies,
          count(*) filter(where family='people')::text as people,
          count(*) filter(where family='leads')::text as leads,
          count(*) filter(where family='opportunities')::text as opportunities,
          count(distinct nullif(address_key, '|'))::text as addresses,
          array_remove(array_agg(distinct label order by label), null)[1:5] as sample_labels,
          max(last_synced_at) as latest_at
        from normalized
        where email_key <> ''
        group by email_key
        having count(distinct crays_entity_id) >= 1
      ),
      address_clusters as (
        select
          'address-collision'::text as cluster_type,
          address_key as identity_key,
          max(address_label) as label,
          count(distinct family)::text as family_count,
          count(distinct crays_entity_id)::text as core_entity_count,
          count(*) filter(where family='companies')::text as companies,
          count(*) filter(where family='people')::text as people,
          count(*) filter(where family='leads')::text as leads,
          count(*) filter(where family='opportunities')::text as opportunities,
          count(distinct address_key)::text as addresses,
          array_remove(array_agg(distinct label order by label), null)[1:5] as sample_labels,
          max(last_synced_at) as latest_at
        from normalized
        where address_key <> '|'
        group by address_key
        having count(distinct crays_entity_id) > 1
      ),
      lead_opportunity_clusters as (
        select
          'lead-opportunity-match'::text as cluster_type,
          company_key as identity_key,
          max(company_label) as label,
          count(distinct family)::text as family_count,
          count(distinct crays_entity_id)::text as core_entity_count,
          count(*) filter(where family='companies')::text as companies,
          count(*) filter(where family='people')::text as people,
          count(*) filter(where family='leads')::text as leads,
          count(*) filter(where family='opportunities')::text as opportunities,
          count(distinct nullif(address_key, '|'))::text as addresses,
          array_remove(array_agg(distinct label order by label), null)[1:5] as sample_labels,
          max(last_synced_at) as latest_at
        from normalized
        where company_key <> ''
        group by company_key
        having count(*) filter(where family='leads') > 0 and count(*) filter(where family='opportunities') > 0
      )
      select *
      from (
        select * from address_clusters
        union all select * from company_clusters
        union all select * from person_clusters
        union all select * from lead_opportunity_clusters
      ) clusters
      order by
        case cluster_type when 'address-collision' then 1 when 'lead-opportunity-match' then 2 when 'company-canonical' then 3 else 4 end,
        core_entity_count::int desc,
        latest_at desc nulls last
      limit $1
    `,
    [limit],
  );
  return result.rows;
}

export async function getCanonicalIdentityDedupeReadModel(role: RoleKey, limit = 80): Promise<CanonicalIdentityDedupeReadModel> {
  const access = accessFor(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");
  if (!runtime.configured) return empty(role, access, "not_configured");

  const rows = await readClusters(Math.min(Math.max(Math.trunc(limit), 10), 200));
  const clusters: CanonicalIdentityCluster[] = rows.map((row) => {
    const status = statusFor(row);
    return {
      id: `${row.cluster_type}:${row.identity_key}`,
      type: row.cluster_type,
      label: row.label ?? title(row.cluster_type),
      status,
      priority: status === "blocked" ? "high" : status === "review" ? "medium" : "low",
      familyCount: number(row.family_count),
      coreEntityCount: number(row.core_entity_count),
      companies: number(row.companies),
      people: number(row.people),
      leads: number(row.leads),
      opportunities: number(row.opportunities),
      addresses: number(row.addresses),
      sampleLabels: row.sample_labels ?? [],
      latestObservedAt: row.latest_at?.toISOString() ?? null,
      currentState: `${number(row.core_entity_count)} canonical Core records across ${number(row.family_count)} CRM families.`,
      nextAction: nextAction(row, status),
    };
  });

  const latest = Math.max(...clusters.map((cluster) => (cluster.latestObservedAt ? Date.parse(cluster.latestObservedAt) : 0)), 0);
  const model = empty(role, access, "schema_ready");
  return {
    ...model,
    summary: {
      clusters: clusters.length,
      canonicalCompanies: clusters.filter((cluster) => cluster.type === "company-canonical").length,
      canonicalPeople: clusters.filter((cluster) => cluster.type === "person-canonical").length,
      addressCollisions: clusters.filter((cluster) => cluster.type === "address-collision").length,
      leadOpportunityMatches: clusters.filter((cluster) => cluster.type === "lead-opportunity-match").length,
      reviewCandidates: clusters.filter((cluster) => cluster.status === "review").length,
      blockedCandidates: clusters.filter((cluster) => cluster.status === "blocked").length,
      representedCoreEntities: clusters.reduce((sum, cluster) => sum + cluster.coreEntityCount, 0),
      freshnessMinutes: latest ? minutesSince(new Date(latest)) : null,
    },
    clusters,
  };
}
