import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JourneyKey = "rotkreuzplatz" | "schwabing" | "berlin-operations" | "benchmark-portfolio";
type Row = { journey_key: JourneyKey; module_key: string; external_system: string; records: string; identities: string; conflicts: string; latest_at: Date | null };
type ProofRow = { key: JourneyKey; matches: string };

export type GoldenDatasetRecord = {
  id: string;
  journeyKey: JourneyKey;
  journeyLabel: string;
  moduleKey: string;
  sourceSystem: string;
  records: number;
  identities: number;
  conflicts: number;
  status: "ready" | "attention";
  owner: string;
  context: string;
  nextAction: string;
  href: string;
  lastObservedAt: string | null;
};

export type GoldenOperatingDatasetReadModel = {
  access: { role: RoleKey; allowed: boolean; reason: string };
  summary: { records: number; sourceMaps: number; identities: number; conflicts: number; journeys: number; modules: number; activePlaceholderHits: number; immutableHistoryHits: number };
  journeys: Array<{ key: JourneyKey; label: string; anchor: string; owner: string; sourceMaps: number; sourceFamilies: number; conflicts: number; identityMatches: number; status: "ready" | "attention"; href: string }>;
  records: GoldenDatasetRecord[];
  controls: { journeys: Array<{ key: string; label: string; rows: number }>; modules: Array<{ key: string; label: string; rows: number }>; statuses: Array<{ key: string; label: string; rows: number }> };
  boundaries: { coreReadsEnabled: true; externalSourceWritesEnabled: false; syncApplyEnabled: false; toolApplyEnabled: false; targetApplyEnabled: false; destructiveApplyEnabled: false; externalSendingEnabled: false; releaseEnabled: false; secretsReturned: false };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const internalRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const journeyDefinitions: Record<JourneyKey, { label: string; anchor: string; owner: string; context: string; href: string }> = {
  rotkreuzplatz: { label: "Munich Rotkreuzplatz master case", anchor: "Lea Schneider · Schneider Fitness Beteiligungs GmbH · Gudrunstrasse 3", owner: "Deal Manager", context: "Candidate offer, partner decision, bank, lease, opening, forecast and evidence package journey.", href: "/crm?role=deal-manager&view=candidate-offer" },
  schwabing: { label: "Munich Schwabing benchmark case", anchor: "Johannes Adler · Adler Fitness Beteiligungs GmbH · Leopoldstrasse 87", owner: "Deal Manager", context: "Candidate-to-bank benchmark with CRM, Files, Loans, Finance, Project and learning evidence.", href: "/dashboard?role=crays-management&view=process-suites" },
  "berlin-operations": { label: "Berlin Mitte operating studio", anchor: "Berlin Mitte Studio · members · payments · support · staffing", owner: "Studio Manager", context: "Live operating journey across Member App, payment recovery, support, staffing and management KPIs.", href: "/operations?role=studio-manager" },
  "benchmark-portfolio": { label: "International benchmark portfolio", anchor: "50 prepared deals · properties · finance · bank packages", owner: "CRAYS Management", context: "Comparable market, property, economics and finance objects across the benchmark portfolio.", href: "/analytics?role=crays-management" },
};
const boundaries = (): GoldenOperatingDatasetReadModel["boundaries"] => ({ coreReadsEnabled: true, externalSourceWritesEnabled: false, syncApplyEnabled: false, toolApplyEnabled: false, targetApplyEnabled: false, destructiveApplyEnabled: false, externalSendingEnabled: false, releaseEnabled: false, secretsReturned: false });
const title = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const moduleHref = (moduleKey: string, role: RoleKey) => moduleKey === "sync" ? `/sync?role=${role}` : `/${moduleKey}?role=${role}`;

function empty(role: RoleKey, queryStatus: GoldenOperatingDatasetReadModel["queryStatus"]): GoldenOperatingDatasetReadModel {
  return { access: { role, allowed: internalRoles.includes(role), reason: internalRoles.includes(role) ? "Role can inspect the internal operating dataset and its Core lineage." : "The Golden Operating Dataset is internal-only." }, summary: { records: 0, sourceMaps: 0, identities: 0, conflicts: 0, journeys: 0, modules: 0, activePlaceholderHits: 0, immutableHistoryHits: 0 }, journeys: [], records: [], controls: { journeys: [], modules: [], statuses: [] }, boundaries: boundaries(), queryStatus };
}

function options(records: GoldenDatasetRecord[], selector: (record: GoldenDatasetRecord) => string, label: (value: string) => string = title) {
  const counts = new Map<string, number>();
  for (const record of records) counts.set(selector(record), (counts.get(selector(record)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => ({ key, label: label(key), rows }));
}

export async function getGoldenOperatingDatasetReadModel(role: RoleKey): Promise<GoldenOperatingDatasetReadModel> {
  const runtime = getCoreDatabaseRuntimeState();
  if (!internalRoles.includes(role)) return empty(role, runtime.configured ? "forbidden" : "not_configured");
  if (!runtime.configured) return empty(role, "not_configured");

  const rows = await getCorePgPool().query<Row>(`
    with classified as (
      select
        case
          when lower(coalesce(metadata::text, '') || ' ' || crays_entity_id) ~ 'rotkreuz|gudrunstrasse|schneider[_ -]fitness|lea schneider' then 'rotkreuzplatz'
          when lower(coalesce(metadata::text, '') || ' ' || crays_entity_id) ~ 'schwabing|adler[_ -]fitness|johannes adler' then 'schwabing'
          when external_system = 'member-app' or lower(coalesce(metadata::text, '') || ' ' || crays_entity_id) like '%berlin mitte%' then 'berlin-operations'
          else 'benchmark-portfolio'
        end as journey_key,
        case when external_system = 'member-app' then 'operations' else coalesce(metadata->>'moduleKey', metadata->'fields'->>'moduleKey', external_system) end as module_key,
        external_system, crays_entity_id, sync_status, last_synced_at
      from crays_core.external_record_maps
    )
    select journey_key, module_key, external_system, count(*)::text records, count(distinct crays_entity_id)::text identities,
      count(*) filter (where sync_status = 'conflict')::text conflicts, max(last_synced_at) latest_at
    from classified group by journey_key, module_key, external_system order by journey_key, module_key, external_system
  `);
  const proof = await getCorePgPool().query<ProofRow>(`
    select 'rotkreuzplatz' key, count(*)::text matches from crays_core.external_record_maps where lower(metadata::text) ~ 'lea schneider|schneider fitness'
    union all select 'schwabing', count(*)::text from crays_core.external_record_maps where lower(metadata::text) ~ 'johannes adler|adler fitness'
    union all select 'berlin-operations', count(*)::text from crays_core.external_record_maps where external_system = 'member-app' or lower(metadata::text) like '%berlin mitte%'
    union all select 'benchmark-portfolio', count(*)::text from crays_core.prepared_offers where offer_id like 'bench_crays_benchmark_%'
  `);
  const legacyPlaceholderNeedle = ["muster", "mann"].join("");
  const quality = await getCorePgPool().query<{ active_hits: string; immutable_hits: string }>(`
    select
      ((select count(*) from crays_core.crays_accounts where lower(coalesce(display_name, '') || ' ' || coalesce(primary_contact, '')) like $1)
       + (select count(*) from crays_core.organizations where lower(name) like $1)
       + (select count(*) from crays_core.external_record_maps where lower(crays_entity_id || ' ' || metadata::text) like $1))::text active_hits,
      (select count(*) from crays_core.core_command_requests where lower(coalesce(idempotency_key, '') || ' ' || coalesce(input_payload::text, '')) like $1)::text immutable_hits
  `, [`%${legacyPlaceholderNeedle}%`]);
  const proofMap = new Map(proof.rows.map((row) => [row.key, Number(row.matches)]));
  const records = rows.rows.map<GoldenDatasetRecord>((row) => {
    const definition = journeyDefinitions[row.journey_key];
    const conflicts = Number(row.conflicts);
    return { id: `${row.journey_key}:${row.module_key}:${row.external_system}`, journeyKey: row.journey_key, journeyLabel: definition.label, moduleKey: row.module_key, sourceSystem: row.external_system, records: Number(row.records), identities: Number(row.identities), conflicts, status: conflicts > 0 ? "attention" : "ready", owner: definition.owner, context: definition.context, nextAction: conflicts > 0 ? "Open Data Health and review classified conflicts without applying changes." : "Use this source-backed slice in the connected operating workflow.", href: moduleHref(row.module_key, role), lastObservedAt: row.latest_at?.toISOString() ?? null };
  });
  const journeys = (Object.keys(journeyDefinitions) as JourneyKey[]).map((key) => {
    const definition = journeyDefinitions[key]; const scoped = records.filter((record) => record.journeyKey === key); const conflicts = scoped.reduce((total, record) => total + record.conflicts, 0);
    return { key, label: definition.label, anchor: definition.anchor, owner: definition.owner, sourceMaps: scoped.reduce((total, record) => total + record.records, 0), sourceFamilies: scoped.length, conflicts, identityMatches: proofMap.get(key) ?? 0, status: conflicts > 0 ? "attention" as const : "ready" as const, href: definition.href };
  });
  const qualityRow = quality.rows[0];
  return { access: { role, allowed: true, reason: "Role can inspect the full internal Golden Operating Dataset, realistic identities and Core source lineage." }, summary: { records: records.length, sourceMaps: records.reduce((total, record) => total + record.records, 0), identities: records.reduce((total, record) => total + record.identities, 0), conflicts: records.reduce((total, record) => total + record.conflicts, 0), journeys: journeys.length, modules: new Set(records.map((record) => record.moduleKey)).size, activePlaceholderHits: Number(qualityRow?.active_hits ?? 0), immutableHistoryHits: Number(qualityRow?.immutable_hits ?? 0) }, journeys, records, controls: { journeys: options(records, (record) => record.journeyKey, (key) => journeyDefinitions[key as JourneyKey].label), modules: options(records, (record) => record.moduleKey), statuses: options(records, (record) => record.status) }, boundaries: boundaries(), queryStatus: "schema_ready" };
}
