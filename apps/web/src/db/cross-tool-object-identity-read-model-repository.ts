import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type AccessLevel = "global_identity_proof" | "module_identity_links" | "forbidden";
type ClusterKind = "case-spine" | "cross-source" | "module-coverage";
type IdentityStatus = "linked" | "attention" | "blocked";

type SourceLink = {
  moduleKey: string;
  sourceSystem: string;
  entityType: string;
  entityId: string;
  syncStatus: string;
  label: string;
  lastObservedAt: string | null;
};

type TimelineEvent = {
  source: "workflow" | "evidence" | "command";
  eventType: string;
  eventStatus: string;
  actorRole: string | null;
  occurredAt: string | null;
  summary: string;
};

type CrossSourceRow = {
  entity_type: string;
  entity_id: string;
  label: string | null;
  modules: string[];
  source_systems: string[];
  source_links: SourceLink[];
  source_link_count: string;
  conflicts: string;
  latest_at: Date | null;
};

type CaseSpineRow = {
  prepared_offer_id: string;
  prepared_offer_title: string;
  prepared_offer_status: string;
  partner_handoff_status: string | null;
  deal_id: string | null;
  deal_stage: string | null;
  deal_status: string | null;
  property_case_id: string | null;
  property_case_status: string | null;
  property_phase: string | null;
  property_id: string | null;
  property_title: string | null;
  address_summary: string | null;
  city: string | null;
  country: string | null;
  source_links: SourceLink[] | null;
  source_link_count: string;
  conflicts: string;
  latest_at: Date | null;
};

type ModuleCoverageRow = {
  module_key: string;
  source_systems: string[];
  entity_types: string[];
  source_links: SourceLink[];
  source_link_count: string;
  core_objects: string;
  conflicts: string;
  latest_at: Date | null;
};

type TimelineRow = {
  object_key: string;
  events: TimelineEvent[];
};

type CommandSummaryRow = {
  commands: string;
  latest_command_id: string | null;
  latest_created_at: Date | null;
};

export type ObjectIdentityCluster = {
  id: string;
  kind: ClusterKind;
  label: string;
  objectType: string;
  primaryCoreId: string;
  coreIds: Array<{ type: string; id: string; label: string }>;
  owner: string;
  scope: string;
  status: IdentityStatus;
  modules: string[];
  sourceSystems: string[];
  sourceLinkCount: number;
  conflicts: number;
  latestObservedAt: string | null;
  currentState: string;
  blocker: string;
  nextAction: string;
  href: string;
  sourceLinks: SourceLink[];
  timeline: TimelineEvent[];
};

export type CrossToolObjectIdentityReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
    canStageIdentityReview: boolean;
    modules: string[] | null;
  };
  summary: {
    clusters: number;
    caseSpines: number;
    crossSourceObjects: number;
    moduleCoverageClusters: number;
    sourceLinks: number;
    coreObjects: number;
    sourceSystems: number;
    modules: number;
    conflicts: number;
    timelineEvents: number;
    commandDrafts: number;
    latestCommandId: string | null;
  };
  clusters: ObjectIdentityCluster[];
  controls: {
    kinds: Array<{ key: string; label: string; rows: number }>;
    modules: Array<{ key: string; label: string; rows: number }>;
    statuses: Array<{ key: string; label: string; rows: number }>;
  };
  actions: {
    stageIdentityReviewAllowed: boolean;
    commandRoute: "/api/crays/core-command/sync-preview";
    confirmationHeader: "stage-sync-preview-command";
    applyGate: "OPEN_DEV_SYNC_APPLY";
  };
  boundaries: {
    coreReadsEnabled: true;
    sourceReadsEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    destructiveApplyEnabled: false;
    toolApplyEnabled: false;
    targetApplyEnabled: false;
    externalSendingEnabled: false;
    uploadsEnabled: false;
    privatePreviewEnabled: false;
    financePostingEnabled: false;
    bankActionsEnabled: false;
    paymentInitiationEnabled: false;
    releaseEnabled: false;
    liveAiEnabled: false;
    productionDeployEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const globalRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedModulesByRole: Partial<Record<RoleKey, string[]>> = {
  "deal-manager": ["crm", "project", "files", "analytics", "loans", "sync"],
  finance: ["erp", "loans", "files", "analytics", "sync"],
  "studio-manager": ["operations", "support", "files", "project", "sync"],
  "expansion-manager": ["crm", "project", "files", "analytics", "sync"],
};
const reviewDraftRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "finance", "studio-manager"];

const moduleLabels: Record<string, string> = {
  analytics: "Analytics",
  crm: "CRM",
  erp: "ERP",
  files: "Files",
  learning: "Learning",
  loans: "Loans",
  operations: "Operations",
  project: "Project",
  support: "Support",
  sync: "Sync",
};

const title = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const moduleLabel = (value: string) => moduleLabels[value] ?? title(value);
const asNumber = (value: unknown) => Number(value ?? 0);
const iso = (value: Date | null | undefined) => value ? value.toISOString() : null;
const cleanLabel = (value: string | null | undefined, fallback: string) => (value?.trim() || fallback).replace(/\u00c2?\u00b7/g, "-");
const moduleHref = (moduleKey: string, role: RoleKey) => moduleKey === "sync" ? `/sync?role=${role}` : `/${moduleKey}?role=${role}`;

function accessFor(role: RoleKey): CrossToolObjectIdentityReadModel["access"] {
  if (globalRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "global_identity_proof",
      reason: "Role can inspect global Core object identity, source links, timelines and guarded identity-review drafts.",
      canStageIdentityReview: reviewDraftRoles.includes(role),
      modules: null,
    };
  }

  const modules = scopedModulesByRole[role];
  if (modules) {
    return {
      role,
      allowed: true,
      level: "module_identity_links",
      reason: "Role can inspect scoped object identity links for the modules it operates.",
      canStageIdentityReview: reviewDraftRoles.includes(role),
      modules,
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Cross-tool object identity is an internal operating control surface.",
    canStageIdentityReview: false,
    modules: [],
  };
}

function boundaries(): CrossToolObjectIdentityReadModel["boundaries"] {
  return {
    coreReadsEnabled: true,
    sourceReadsEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    destructiveApplyEnabled: false,
    toolApplyEnabled: false,
    targetApplyEnabled: false,
    externalSendingEnabled: false,
    uploadsEnabled: false,
    privatePreviewEnabled: false,
    financePostingEnabled: false,
    bankActionsEnabled: false,
    paymentInitiationEnabled: false,
    releaseEnabled: false,
    liveAiEnabled: false,
    productionDeployEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function empty(role: RoleKey, access: CrossToolObjectIdentityReadModel["access"], queryStatus: CrossToolObjectIdentityReadModel["queryStatus"]): CrossToolObjectIdentityReadModel {
  return {
    access,
    summary: {
      clusters: 0,
      caseSpines: 0,
      crossSourceObjects: 0,
      moduleCoverageClusters: 0,
      sourceLinks: 0,
      coreObjects: 0,
      sourceSystems: 0,
      modules: 0,
      conflicts: 0,
      timelineEvents: 0,
      commandDrafts: 0,
      latestCommandId: null,
    },
    clusters: [],
    controls: { kinds: [], modules: [], statuses: [] },
    actions: {
      stageIdentityReviewAllowed: access.canStageIdentityReview,
      commandRoute: "/api/crays/core-command/sync-preview",
      confirmationHeader: "stage-sync-preview-command",
      applyGate: "OPEN_DEV_SYNC_APPLY",
    },
    boundaries: boundaries(),
    queryStatus,
  };
}

function options(records: ObjectIdentityCluster[], selector: (record: ObjectIdentityCluster) => string) {
  const counts = new Map<string, number>();
  for (const record of records) counts.set(selector(record), (counts.get(selector(record)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => ({ key, label: title(key), rows }));
}

function statusFrom(conflicts: number, sourceLinks: number): IdentityStatus {
  if (sourceLinks === 0) return "blocked";
  return conflicts > 0 ? "attention" : "linked";
}

function sourceLinks(value: SourceLink[] | null | undefined): SourceLink[] {
  return (value ?? []).map((link) => ({
    moduleKey: link.moduleKey,
    sourceSystem: link.sourceSystem,
    entityType: link.entityType,
    entityId: link.entityId,
    syncStatus: link.syncStatus,
    label: cleanLabel(link.label, link.entityId),
    lastObservedAt: link.lastObservedAt,
  }));
}

function clusterHref(cluster: { modules: string[] }, role: RoleKey) {
  const primaryModule = cluster.modules[0] ?? "sync";
  return moduleHref(primaryModule, role);
}

async function crossSourceObjects(): Promise<CrossSourceRow[]> {
  return (await getCorePgPool().query<CrossSourceRow>(`
    with source_links as (
      select
        coalesce(nullif(crays_entity_type, ''), 'unknown') as entity_type,
        crays_entity_id as entity_id,
        case when external_system = 'member-app' then 'operations' else coalesce(metadata->>'moduleKey', metadata->'fields'->>'moduleKey', metadata->'row'->'fields'->>'moduleKey', external_system) end as module_key,
        external_system,
        external_entity_type,
        external_entity_id,
        sync_status,
        last_synced_at,
        coalesce(metadata->>'label', metadata->'fields'->>'label', metadata->'row'->'fields'->>'label', metadata->>'title', metadata->'fields'->>'title', external_entity_id) as label
      from crays_core.external_record_maps
      where crays_entity_id is not null and btrim(crays_entity_id) <> ''
    ),
    grouped as (
      select
        entity_type,
        entity_id,
        max(label) as label,
        array_agg(distinct module_key order by module_key) as modules,
        array_agg(distinct external_system order by external_system) as source_systems,
        jsonb_agg(jsonb_build_object(
          'moduleKey', module_key,
          'sourceSystem', external_system,
          'entityType', external_entity_type,
          'entityId', external_entity_id,
          'syncStatus', sync_status,
          'label', label,
          'lastObservedAt', case when last_synced_at is null then null else to_char(last_synced_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end
        ) order by module_key, external_system, external_entity_type, external_entity_id) as source_links,
        count(*)::text as source_link_count,
        count(*) filter (where sync_status = 'conflict')::text as conflicts,
        max(last_synced_at) as latest_at
      from source_links
      group by entity_type, entity_id
      having count(distinct external_system) > 1 or count(distinct module_key) > 1
    )
    select * from grouped
    order by source_link_count desc, entity_type, entity_id
    limit 50
  `)).rows;
}

async function caseSpines(): Promise<CaseSpineRow[]> {
  return (await getCorePgPool().query<CaseSpineRow>(`
    with source_links as (
      select
        crays_entity_id,
        case when external_system = 'member-app' then 'operations' else coalesce(metadata->>'moduleKey', metadata->'fields'->>'moduleKey', metadata->'row'->'fields'->>'moduleKey', external_system) end as module_key,
        external_system,
        external_entity_type,
        external_entity_id,
        sync_status,
        last_synced_at,
        coalesce(metadata->>'label', metadata->'fields'->>'label', metadata->'row'->'fields'->>'label', metadata->>'title', metadata->'fields'->>'title', external_entity_id) as label,
        metadata::text as metadata_text
      from crays_core.external_record_maps
    )
    select
      po.offer_id as prepared_offer_id,
      po.title as prepared_offer_title,
      po.status as prepared_offer_status,
      po.partner_handoff_status,
      d.deal_id,
      d.stage as deal_stage,
      d.status as deal_status,
      pc.case_id as property_case_id,
      pc.status as property_case_status,
      pc.current_phase as property_phase,
      p.property_id,
      p.title as property_title,
      p.address_summary,
      p.city,
      p.country,
      coalesce(links.source_links, '[]'::jsonb) as source_links,
      coalesce(links.source_link_count, '0') as source_link_count,
      coalesce(links.conflicts, '0') as conflicts,
      links.latest_at
    from crays_core.prepared_offers po
    left join crays_core.deals d on d.prepared_offer_id = po.offer_id
    left join crays_core.property_cases pc on pc.case_id = po.property_case_id
    left join crays_core.properties p on p.property_id = pc.property_id
    left join lateral (
      select
        jsonb_agg(jsonb_build_object(
          'moduleKey', source_links.module_key,
          'sourceSystem', source_links.external_system,
          'entityType', source_links.external_entity_type,
          'entityId', source_links.external_entity_id,
          'syncStatus', source_links.sync_status,
          'label', source_links.label,
          'lastObservedAt', case when source_links.last_synced_at is null then null else to_char(source_links.last_synced_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end
        ) order by source_links.module_key, source_links.external_system, source_links.external_entity_type, source_links.external_entity_id) as source_links,
        count(*)::text as source_link_count,
        count(*) filter (where source_links.sync_status = 'conflict')::text as conflicts,
        max(source_links.last_synced_at) as latest_at
      from source_links
      where source_links.crays_entity_id in (po.offer_id, d.deal_id, pc.case_id, p.property_id)
        or source_links.metadata_text like '%' || po.offer_id || '%'
        or (d.deal_id is not null and source_links.metadata_text like '%' || d.deal_id || '%')
        or (pc.case_id is not null and source_links.metadata_text like '%' || pc.case_id || '%')
    ) links on true
    order by po.updated_at desc, po.offer_id
    limit 30
  `)).rows;
}

async function moduleCoverage(): Promise<ModuleCoverageRow[]> {
  return (await getCorePgPool().query<ModuleCoverageRow>(`
    with source_links as (
      select
        case when external_system = 'member-app' then 'operations' else coalesce(metadata->>'moduleKey', metadata->'fields'->>'moduleKey', metadata->'row'->'fields'->>'moduleKey', external_system) end as module_key,
        external_system,
        external_entity_type,
        external_entity_id,
        crays_entity_id,
        sync_status,
        last_synced_at,
        coalesce(metadata->>'label', metadata->'fields'->>'label', metadata->'row'->'fields'->>'label', metadata->>'title', metadata->'fields'->>'title', external_entity_id) as label
      from crays_core.external_record_maps
      where crays_entity_id is not null and btrim(crays_entity_id) <> ''
    ),
    ranked as (
      select
        *,
        row_number() over (partition by module_key order by case when sync_status='conflict' then 0 else 1 end, last_synced_at desc nulls last, external_system, external_entity_type) as sample_rank
      from source_links
    )
    select
      module_key,
      array_agg(distinct external_system order by external_system) as source_systems,
      array_agg(distinct external_entity_type order by external_entity_type) as entity_types,
      jsonb_agg(jsonb_build_object(
        'moduleKey', module_key,
        'sourceSystem', external_system,
        'entityType', external_entity_type,
        'entityId', external_entity_id,
        'syncStatus', sync_status,
        'label', label,
        'lastObservedAt', case when last_synced_at is null then null else to_char(last_synced_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end
      ) order by sample_rank) filter (where sample_rank <= 8) as source_links,
      count(*)::text as source_link_count,
      count(distinct crays_entity_id)::text as core_objects,
      count(*) filter (where sync_status = 'conflict')::text as conflicts,
      max(last_synced_at) as latest_at
    from ranked
    group by module_key
    order by count(*) desc, module_key
  `)).rows;
}

async function timelineByObject(objectKeys: Array<{ key: string; ids: string[] }>): Promise<Map<string, TimelineEvent[]>> {
  const ids = [...new Set(objectKeys.flatMap((item) => item.ids).filter(Boolean))];
  if (!ids.length) return new Map();
  const rows = (await getCorePgPool().query<TimelineRow>(`
    with wanted as (
      select unnest($1::text[]) as object_id
    ),
    events as (
      select 'workflow' as source, event_type, event_status, related_entity_type, related_entity_id, role_key as actor_role, occurred_at,
        coalesce(payload->>'title', payload->>'label', payload->>'summary', payload->>'nextAction', event_type) as summary
      from crays_core.workflow_events
      where related_entity_id = any($1::text[])
      union all
      select 'evidence' as source, event_type, event_status, related_entity_type, related_entity_id, actor_role, occurred_at,
        coalesce(payload_summary->>'title', payload_summary->>'label', payload_summary->>'summary', evidence_class, event_type) as summary
      from crays_core.evidence_audit_events
      where related_entity_id = any($1::text[])
      union all
      select 'command' as source, command_key as event_type, command_status as event_status, entity_type as related_entity_type, entity_id as related_entity_id, actor_role, created_at as occurred_at,
        coalesce(input_payload->>'title', input_payload->>'label', input_payload->>'summary', command_key) as summary
      from crays_core.core_command_requests
      where entity_id = any($1::text[])
    ),
    ranked as (
      select wanted.object_id, events.*,
        row_number() over (partition by wanted.object_id order by events.occurred_at desc nulls last, events.event_type) as event_rank
      from wanted
      join events on events.related_entity_id = wanted.object_id
    )
    select
      object_id as object_key,
      jsonb_agg(jsonb_build_object(
        'source', source,
        'eventType', event_type,
        'eventStatus', event_status,
        'actorRole', actor_role,
        'occurredAt', case when occurred_at is null then null else to_char(occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
        'summary', summary
      ) order by occurred_at desc nulls last) filter (where event_rank <= 8) as events
    from ranked
    group by object_id
  `, [ids])).rows;

  const byId = new Map(rows.map((row) => [row.object_key, row.events ?? []]));
  const byCluster = new Map<string, TimelineEvent[]>();
  for (const item of objectKeys) {
    const combined = item.ids.flatMap((id) => byId.get(id) ?? []);
    byCluster.set(item.key, combined.slice(0, 8));
  }
  return byCluster;
}

async function commandSummary() {
  return (await getCorePgPool().query<CommandSummaryRow>(`
    select
      count(*)::text as commands,
      (array_agg(command_id order by created_at desc, id desc))[1] as latest_command_id,
      (array_agg(created_at order by created_at desc, id desc))[1] as latest_created_at
    from crays_core.core_command_requests
    where command_key = 'sync.mapping.preview_refresh'
  `)).rows[0];
}

function buildCrossSourceCluster(row: CrossSourceRow, role: RoleKey, timeline: TimelineEvent[]): ObjectIdentityCluster {
  const links = sourceLinks(row.source_links);
  const conflicts = asNumber(row.conflicts);
  const status = statusFrom(conflicts, asNumber(row.source_link_count));
  const modules = row.modules ?? [];
  return {
    id: `cross-source:${row.entity_type}:${row.entity_id}`,
    kind: "cross-source",
    label: cleanLabel(row.label, `${title(row.entity_type)} ${row.entity_id}`),
    objectType: row.entity_type,
    primaryCoreId: row.entity_id,
    coreIds: [{ type: row.entity_type, id: row.entity_id, label: "Core identity" }],
    owner: row.entity_type === "deal" ? "Deal Manager" : "Data Governance",
    scope: `${modules.map(moduleLabel).join(", ")} source identity`,
    status,
    modules,
    sourceSystems: row.source_systems ?? [],
    sourceLinkCount: asNumber(row.source_link_count),
    conflicts,
    latestObservedAt: iso(row.latest_at),
    currentState: `${asNumber(row.source_link_count)} source links share one Core ${title(row.entity_type)} identity across ${modules.length} module${modules.length === 1 ? "" : "s"}.`,
    blocker: conflicts > 0 ? "Mapped source links include governed attention conflicts." : "No identity blocker in this cluster.",
    nextAction: conflicts > 0 ? "Stage an identity review draft before any future sync apply." : "Use the shared Core identity for cross-module drilldown.",
    href: clusterHref({ modules }, role),
    sourceLinks: links,
    timeline,
  };
}

function buildCaseSpineCluster(row: CaseSpineRow, role: RoleKey, timeline: TimelineEvent[]): ObjectIdentityCluster {
  const links = sourceLinks(row.source_links);
  const modules = [...new Set(links.map((link) => link.moduleKey))].sort();
  const sourceSystems = [...new Set(links.map((link) => link.sourceSystem))].sort();
  const conflicts = asNumber(row.conflicts);
  const status = statusFrom(conflicts, asNumber(row.source_link_count));
  const coreIds = [
    { type: "prepared-offer", id: row.prepared_offer_id, label: "Prepared offer" },
    row.deal_id ? { type: "deal", id: row.deal_id, label: "Deal" } : null,
    row.property_case_id ? { type: "property-case", id: row.property_case_id, label: "Property case" } : null,
    row.property_id ? { type: "property", id: row.property_id, label: "Property" } : null,
  ].filter((item): item is { type: string; id: string; label: string } => Boolean(item));
  const params = new URLSearchParams({ role, view: "case", case: row.prepared_offer_id });
  if (row.deal_id) params.set("deal", row.deal_id);
  if (row.property_case_id) params.set("propertyCase", row.property_case_id);

  return {
    id: `case-spine:${row.prepared_offer_id}`,
    kind: "case-spine",
    label: cleanLabel(row.prepared_offer_title, row.prepared_offer_id),
    objectType: "prepared-deal-spine",
    primaryCoreId: row.prepared_offer_id,
    coreIds,
    owner: "Deal Manager",
    scope: [row.city, row.country].filter(Boolean).join(", ") || "Prepared deal",
    status,
    modules,
    sourceSystems,
    sourceLinkCount: asNumber(row.source_link_count),
    conflicts,
    latestObservedAt: iso(row.latest_at),
    currentState: `${title(row.prepared_offer_status)} offer, ${title(row.deal_stage ?? "deal pending")} deal, ${title(row.property_phase ?? "property phase pending")} property phase.`,
    blocker: conflicts > 0 ? "Case spine contains governed source-link conflicts." : asNumber(row.source_link_count) === 0 ? "No direct source links were found for this spine." : "No identity blocker in this case spine.",
    nextAction: conflicts > 0 ? "Review the linked source identities and timeline before downstream release work." : "Open the case workspace with preserved offer, deal and property URL state.",
    href: `/dashboard?${params.toString()}`,
    sourceLinks: links,
    timeline,
  };
}

function buildModuleCoverageCluster(row: ModuleCoverageRow, role: RoleKey, timeline: TimelineEvent[]): ObjectIdentityCluster {
  const links = sourceLinks(row.source_links);
  const moduleKey = row.module_key;
  const conflicts = asNumber(row.conflicts);
  const status = statusFrom(conflicts, asNumber(row.source_link_count));
  const entityTypes = row.entity_types ?? [];
  return {
    id: `module-coverage:${moduleKey}`,
    kind: "module-coverage",
    label: `${moduleLabel(moduleKey)} object identity coverage`,
    objectType: "module-identity-coverage",
    primaryCoreId: `module:${moduleKey}`,
    coreIds: [{ type: "module", id: moduleKey, label: `${moduleLabel(moduleKey)} module` }],
    owner: moduleKey === "erp" || moduleKey === "loans" ? "CRAYS Finance" : moduleKey === "operations" || moduleKey === "support" ? "Studio Manager" : "Data Governance",
    scope: `${entityTypes.slice(0, 4).map(title).join(", ")}${entityTypes.length > 4 ? ` and ${entityTypes.length - 4} more` : ""}`,
    status,
    modules: [moduleKey],
    sourceSystems: row.source_systems ?? [],
    sourceLinkCount: asNumber(row.source_link_count),
    conflicts,
    latestObservedAt: iso(row.latest_at),
    currentState: `${asNumber(row.core_objects)} Core objects mapped through ${asNumber(row.source_link_count)} source links across ${entityTypes.length} object families.`,
    blocker: conflicts > 0 ? "Module coverage includes governed attention conflicts." : "No missing Core identity in this module coverage cluster.",
    nextAction: conflicts > 0 ? "Open scoped Data Health and stage identity review if the owner confirms the classification." : "Use this module coverage for safe cross-tool navigation.",
    href: moduleHref(moduleKey, role),
    sourceLinks: links,
    timeline,
  };
}

function scopeClusters(clusters: ObjectIdentityCluster[], access: CrossToolObjectIdentityReadModel["access"]) {
  if (!access.modules) return clusters;
  return clusters.filter((cluster) => cluster.modules.some((module) => access.modules?.includes(module)));
}

export async function getCrossToolObjectIdentityReadModel(role: RoleKey): Promise<CrossToolObjectIdentityReadModel> {
  const access = accessFor(role);
  const runtime = getCoreDatabaseRuntimeState();
  if (!access.allowed) return empty(role, access, runtime.configured ? "forbidden" : "not_configured");
  if (!runtime.configured) return empty(role, access, "not_configured");

  const [crossRows, caseRows, moduleRows, commandRow] = await Promise.all([
    crossSourceObjects(),
    caseSpines(),
    moduleCoverage(),
    commandSummary(),
  ]);
  const timelineKeys = [
    ...crossRows.map((row) => ({ key: `cross-source:${row.entity_type}:${row.entity_id}`, ids: [row.entity_id] })),
    ...caseRows.map((row) => ({ key: `case-spine:${row.prepared_offer_id}`, ids: [row.prepared_offer_id, row.deal_id, row.property_case_id, row.property_id].filter((id): id is string => Boolean(id)) })),
    ...moduleRows.map((row) => ({ key: `module-coverage:${row.module_key}`, ids: row.source_links?.slice(0, 8).map((link) => link.entityId) ?? [] })),
  ];
  const timelines = await timelineByObject(timelineKeys);

  const clusters = scopeClusters([
    ...caseRows.map((row) => buildCaseSpineCluster(row, role, timelines.get(`case-spine:${row.prepared_offer_id}`) ?? [])),
    ...crossRows.map((row) => buildCrossSourceCluster(row, role, timelines.get(`cross-source:${row.entity_type}:${row.entity_id}`) ?? [])),
    ...moduleRows.map((row) => buildModuleCoverageCluster(row, role, timelines.get(`module-coverage:${row.module_key}`) ?? [])),
  ], access);

  const sourceSystems = new Set(clusters.flatMap((cluster) => cluster.sourceSystems));
  const modules = new Set(clusters.flatMap((cluster) => cluster.modules));
  const coreObjects = new Set(clusters.flatMap((cluster) => cluster.coreIds.map((item) => `${item.type}:${item.id}`)));

  return {
    access,
    summary: {
      clusters: clusters.length,
      caseSpines: clusters.filter((cluster) => cluster.kind === "case-spine").length,
      crossSourceObjects: clusters.filter((cluster) => cluster.kind === "cross-source").length,
      moduleCoverageClusters: clusters.filter((cluster) => cluster.kind === "module-coverage").length,
      sourceLinks: clusters.reduce((sum, cluster) => sum + cluster.sourceLinkCount, 0),
      coreObjects: coreObjects.size,
      sourceSystems: sourceSystems.size,
      modules: modules.size,
      conflicts: clusters.reduce((sum, cluster) => sum + cluster.conflicts, 0),
      timelineEvents: clusters.reduce((sum, cluster) => sum + cluster.timeline.length, 0),
      commandDrafts: asNumber(commandRow?.commands),
      latestCommandId: commandRow?.latest_command_id ?? null,
    },
    clusters,
    controls: {
      kinds: options(clusters, (cluster) => cluster.kind),
      modules: options(clusters.flatMap((cluster) => cluster.modules.map((module) => ({ ...cluster, modules: [module] }))), (cluster) => cluster.modules[0] ?? "unknown"),
      statuses: options(clusters, (cluster) => cluster.status),
    },
    actions: {
      stageIdentityReviewAllowed: access.canStageIdentityReview,
      commandRoute: "/api/crays/core-command/sync-preview",
      confirmationHeader: "stage-sync-preview-command",
      applyGate: "OPEN_DEV_SYNC_APPLY",
    },
    boundaries: boundaries(),
    queryStatus: "schema_ready",
  };
}
