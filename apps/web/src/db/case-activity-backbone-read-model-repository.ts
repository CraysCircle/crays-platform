import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;

export type CaseActivityBackboneQuery = {
  role: RoleKey;
  preparedOfferId?: string | null;
  dealId?: string | null;
  propertyCaseId?: string | null;
  limit?: number;
};

export type CaseActivityDocument = {
  linkId: string;
  packageType: string;
  packageId: string;
  documentGroup: string;
  documentRefType: string;
  documentRefId: string;
  status: string;
  requiredFor: string | null;
  visibilityRoles: string[];
  versionLabel: string;
  updatedAt: string;
};

export type CaseActivityEvent = {
  eventId: string;
  eventType: string;
  eventStatus: string;
  source: "workflow" | "command" | "communication" | "source";
  actorRole: string | null;
  relatedEntityType: string;
  relatedEntityId: string;
  label: string;
  occurredAt: string;
};

export type CaseActivityKpi = {
  key: string;
  label: string;
  value: string;
  unit: string;
  period: string;
  source: "prepared_offer_metrics" | "property_case_kpi" | "derived_counts";
  dataStatus: "available" | "derived" | "missing";
};

export type CaseActivityBackboneReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: "internal_case_activity" | "forbidden";
  };
  query: {
    preparedOfferId: string | null;
    dealId: string | null;
    propertyCaseId: string | null;
    limit: number;
  };
  case: {
    preparedOfferId: string;
    dealId: string | null;
    propertyCaseId: string | null;
    title: string;
    status: string;
    updatedAt: string;
  } | null;
  summary: {
    documents: number;
    approvedDocuments: number;
    workflowEvents: number;
    commandEvents: number;
    communicationEvents: number;
    sourceEvents: number;
    kpis: number;
    latestEventAt: string | null;
  };
  documents: CaseActivityDocument[];
  events: CaseActivityEvent[];
  kpis: CaseActivityKpi[];
  boundaries: {
    liveSourceCallsEnabled: false;
    documentBodiesReturned: false;
    binaryUploadsEnabled: false;
    privatePreviewEnabled: false;
    publicFileReleaseEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    toolApplyEnabled: false;
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
  property_case_id: string | null;
  title: string;
  offer_status: string;
  metrics_snapshot: JsonRecord;
  property_kpi_snapshot: JsonRecord | null;
  updated_at: Date;
};

type DocumentRow = {
  link_id: string;
  package_type: string;
  package_id: string;
  document_ref_type: string;
  document_ref_id: string;
  document_group: string;
  visibility_roles: unknown;
  status: string;
  required_for: string | null;
  metadata: JsonRecord;
  updated_at: Date;
};

type WorkflowEventRow = {
  event_id: string;
  event_type: string;
  event_status: string;
  role_key: string | null;
  related_entity_type: string;
  related_entity_id: string;
  payload: JsonRecord;
  occurred_at: Date;
};

type CommandEventRow = {
  event_id: string;
  event_type: string;
  event_status: string;
  actor_role: string | null;
  related_entity_type: string;
  related_entity_id: string;
  payload_summary: JsonRecord;
  occurred_at: Date;
};

type CommunicationEventRow = {
  event_id: string;
  event_type: string;
  event_status: string;
  channel: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  payload_summary: JsonRecord;
  occurred_at: Date;
};

type SourceEventRow = {
  map_id: string;
  crays_entity_type: string;
  crays_entity_id: string;
  external_system: string;
  external_entity_type: string;
  sync_status: string;
  sync_direction: string;
  last_synced_at: Date | null;
  updated_at: Date;
};

type CountRow = {
  approved_documents: string;
  workflow_events: string;
  command_events: string;
  communication_events: string;
  source_events: string;
};

const allowedRoles: RoleKey[] = [
  "crays-management",
  "admin",
  "deal-manager",
  "expansion-manager",
  "finance",
  "reviewer",
  "franchise-partner",
  "studio-manager",
];

function boundedLimit(limit: number | undefined) {
  if (!Number.isFinite(limit)) return 12;
  return Math.min(Math.max(Math.trunc(limit ?? 12), 1), 30);
}

function asNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function jsonObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function textArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function labelize(value: string) {
  return value.replaceAll("_", " ").replaceAll(".", " ");
}

function boundaries(): CaseActivityBackboneReadModel["boundaries"] {
  return {
    liveSourceCallsEnabled: false,
    documentBodiesReturned: false,
    binaryUploadsEnabled: false,
    privatePreviewEnabled: false,
    publicFileReleaseEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    externalSendingEnabled: false,
    financeActionsEnabled: false,
    bankActionsEnabled: false,
    paymentInitiationEnabled: false,
    releaseActionsEnabled: false,
    productionDeployEnabled: false,
    vpsChangingWorkEnabled: false,
  };
}

function emptyReadModel(
  query: CaseActivityBackboneQuery,
  allowed: boolean,
  queryStatus: CaseActivityBackboneReadModel["queryStatus"],
): CaseActivityBackboneReadModel {
  return {
    access: {
      role: query.role,
      allowed,
      level: allowed ? "internal_case_activity" : "forbidden",
    },
    query: {
      preparedOfferId: query.preparedOfferId ?? null,
      dealId: query.dealId ?? null,
      propertyCaseId: query.propertyCaseId ?? null,
      limit: boundedLimit(query.limit),
    },
    case: null,
    summary: {
      documents: 0,
      approvedDocuments: 0,
      workflowEvents: 0,
      commandEvents: 0,
      communicationEvents: 0,
      sourceEvents: 0,
      kpis: 0,
      latestEventAt: null,
    },
    documents: [],
    events: [],
    kpis: [],
    boundaries: boundaries(),
    queryStatus,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function versionLabel(metadata: JsonRecord) {
  return text(metadata.version) ?? text(metadata.versionLabel) ?? "metadata-only";
}

function documentFromRow(row: DocumentRow): CaseActivityDocument {
  return {
    linkId: row.link_id,
    packageType: row.package_type,
    packageId: row.package_id,
    documentGroup: row.document_group,
    documentRefType: row.document_ref_type,
    documentRefId: row.document_ref_id,
    status: row.status,
    requiredFor: row.required_for,
    visibilityRoles: textArray(row.visibility_roles),
    versionLabel: versionLabel(jsonObject(row.metadata)),
    updatedAt: row.updated_at.toISOString(),
  };
}

function workflowEventFromRow(row: WorkflowEventRow): CaseActivityEvent {
  const payload = jsonObject(row.payload);
  return {
    eventId: row.event_id,
    eventType: row.event_type,
    eventStatus: row.event_status,
    source: "workflow",
    actorRole: row.role_key,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    label: text(payload.label) ?? text(payload.title) ?? labelize(row.event_type),
    occurredAt: row.occurred_at.toISOString(),
  };
}

function commandEventFromRow(row: CommandEventRow): CaseActivityEvent {
  const payload = jsonObject(row.payload_summary);
  return {
    eventId: row.event_id,
    eventType: row.event_type,
    eventStatus: row.event_status,
    source: "command",
    actorRole: row.actor_role,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    label: text(payload.label) ?? text(payload.title) ?? text(payload.subject) ?? labelize(row.event_type),
    occurredAt: row.occurred_at.toISOString(),
  };
}

function communicationEventFromRow(row: CommunicationEventRow): CaseActivityEvent {
  const payload = jsonObject(row.payload_summary);
  return {
    eventId: row.event_id,
    eventType: row.event_type,
    eventStatus: row.event_status,
    source: "communication",
    actorRole: text(payload.senderRole),
    relatedEntityType: row.related_entity_type ?? "conversation",
    relatedEntityId: row.related_entity_id ?? text(payload.conversationId) ?? "conversation",
    label: text(payload.label) ?? `${labelize(row.event_type)}${row.channel ? ` via ${labelize(row.channel)}` : ""}`,
    occurredAt: row.occurred_at.toISOString(),
  };
}

function sourceEventFromRow(row: SourceEventRow): CaseActivityEvent {
  return {
    eventId: `source_map_${row.map_id}`,
    eventType: "source.record_mapped",
    eventStatus: row.sync_status,
    source: "source",
    actorRole: "system",
    relatedEntityType: row.crays_entity_type,
    relatedEntityId: row.crays_entity_id,
    label: `${row.external_system.toUpperCase()} ${labelize(row.external_entity_type)} mapped for ${labelize(row.crays_entity_type)}`,
    occurredAt: (row.last_synced_at ?? row.updated_at).toISOString(),
  };
}

function kpisFromCase(row: CaseRow, documents: CaseActivityDocument[], counts: CountRow): CaseActivityKpi[] {
  const metrics = jsonObject(row.metrics_snapshot);
  const propertyKpis = jsonObject(row.property_kpi_snapshot);
  const preparedMetrics: CaseActivityKpi[] = [
    ["bankabilityScore", "Bankability score", "%"],
    ["openingReadiness", "Opening readiness", "%"],
    ["targetMRR", "Target MRR", "EUR"],
    ["targetRaise", "Target raise", "EUR"],
    ["ownEquity", "Own equity", "EUR"],
    ["bankDebt", "Bank debt", "EUR"],
  ].map(([key, label, unit]) => {
    const value = asNumber(metrics[key]);
    return {
      key,
      label,
      value: value === null ? "n/a" : String(Math.round(value)),
      unit,
      period: "Current prepared offer",
      source: "prepared_offer_metrics",
      dataStatus: value === null ? "missing" : "available",
    };
  });

  const propertyMetricValue = asNumber(propertyKpis.siteScore) ?? asNumber(propertyKpis.locationScore);
  const derived: CaseActivityKpi[] = [
    {
      key: "propertyLocationScore",
      label: "Property location score",
      value: propertyMetricValue === null ? "n/a" : String(Math.round(propertyMetricValue)),
      unit: "%",
      period: "Current property case",
      source: "property_case_kpi",
      dataStatus: propertyMetricValue === null ? "missing" : "available",
    },
    {
      key: "documentApprovalCoverage",
      label: "Document approval coverage",
      value: documents.length === 0 ? "0" : String(Math.round((Number(counts.approved_documents) / documents.length) * 100)),
      unit: "%",
      period: "Current case document links",
      source: "derived_counts",
      dataStatus: "derived",
    },
    {
      key: "caseActivityEvents",
      label: "Case activity events",
      value: String(Number(counts.workflow_events) + Number(counts.command_events) + Number(counts.communication_events) + Number(counts.source_events)),
      unit: "events",
      period: "Current case",
      source: "derived_counts",
      dataStatus: "derived",
    },
  ];

  return [...preparedMetrics, ...derived];
}

async function getCaseRow(query: CaseActivityBackboneQuery) {
  const pool = getCorePgPool();
  const result = await pool.query<CaseRow>(
    `
      select
        prepared_offers.offer_id,
        deals.deal_id,
        property_cases.case_id as property_case_id,
        prepared_offers.title,
        prepared_offers.status as offer_status,
        prepared_offers.metrics_snapshot,
        location_analyses.kpi_snapshot as property_kpi_snapshot,
        prepared_offers.updated_at
      from crays_core.prepared_offers
      left join crays_core.property_cases on property_cases.case_id = prepared_offers.property_case_id
      left join crays_core.location_analyses on location_analyses.analysis_id = prepared_offers.location_analysis_id
      left join crays_core.deals on deals.prepared_offer_id = prepared_offers.offer_id
      where ($1::text is null or prepared_offers.offer_id = $1)
        and ($2::text is null or deals.deal_id = $2)
        and ($3::text is null or property_cases.case_id = $3)
      order by
        case when $1::text is not null and prepared_offers.offer_id = $1 then 0 else 1 end,
        prepared_offers.updated_at desc
      limit 1
    `,
    [query.preparedOfferId ?? null, query.dealId ?? null, query.propertyCaseId ?? null],
  );
  return result.rows[0] ?? null;
}

async function getDocuments(row: CaseRow, limit: number) {
  const pool = getCorePgPool();
  const result = await pool.query<DocumentRow>(
    `
      select
        link_id,
        package_type,
        package_id,
        document_ref_type,
        document_ref_id,
        document_group,
        visibility_roles,
        status,
        required_for,
        metadata,
        updated_at
      from crays_core.document_package_links
      where (package_type = 'prepared-offer' and package_id = $1)
        or ($2::text is not null and package_type = 'deal' and package_id = $2)
        or ($3::text is not null and package_type = 'property-case' and package_id = $3)
      order by
        case status when 'approved' then 0 when 'required' then 1 when 'linked' then 2 else 3 end,
        updated_at desc,
        id desc
      limit $4
    `,
    [row.offer_id, row.deal_id, row.property_case_id, limit],
  );
  return result.rows.map(documentFromRow);
}

async function getWorkflowEvents(row: CaseRow, limit: number) {
  const pool = getCorePgPool();
  const result = await pool.query<WorkflowEventRow>(
    `
      select
        event_id,
        event_type,
        event_status,
        role_key,
        related_entity_type,
        related_entity_id,
        payload,
        occurred_at
      from crays_core.workflow_events
      where (related_entity_type = 'prepared-offer' and related_entity_id = $1)
        or ($2::text is not null and related_entity_type = 'deal' and related_entity_id = $2)
        or ($3::text is not null and related_entity_type = 'property-case' and related_entity_id = $3)
      order by occurred_at desc, id desc
      limit $4
    `,
    [row.offer_id, row.deal_id, row.property_case_id, limit],
  );
  return result.rows.map(workflowEventFromRow);
}

async function getCommandEvents(row: CaseRow, limit: number) {
  const pool = getCorePgPool();
  const result = await pool.query<CommandEventRow>(
    `
      select
        core_command_events.event_id,
        core_command_events.event_type,
        core_command_events.event_status,
        core_command_events.actor_role,
        core_command_requests.entity_type as related_entity_type,
        coalesce(
          core_command_requests.entity_id,
          core_command_requests.entity_scope ->> 'preparedOfferId',
          core_command_requests.entity_scope ->> 'dealId',
          core_command_requests.entity_scope ->> 'propertyCaseId',
          core_command_requests.command_id
        ) as related_entity_id,
        core_command_events.payload_summary,
        core_command_events.occurred_at
      from crays_core.core_command_events
      join crays_core.core_command_requests on core_command_requests.command_id = core_command_events.command_id
      where core_command_requests.entity_scope ->> 'preparedOfferId' = $1
        or core_command_requests.entity_id = $1
        or ($2::text is not null and (core_command_requests.entity_scope ->> 'dealId' = $2 or core_command_requests.entity_id = $2))
        or ($3::text is not null and (core_command_requests.entity_scope ->> 'propertyCaseId' = $3 or core_command_requests.entity_id = $3))
      order by core_command_events.occurred_at desc, core_command_events.id desc
      limit $4
    `,
    [row.offer_id, row.deal_id, row.property_case_id, limit],
  );
  return result.rows.map(commandEventFromRow);
}

async function getCommunicationEvents(row: CaseRow, limit: number) {
  const pool = getCorePgPool();
  const result = await pool.query<CommunicationEventRow>(
    `
      select
        communication_events.event_id,
        communication_events.event_type,
        communication_events.event_status,
        communication_events.channel,
        communication_events.related_entity_type,
        communication_events.related_entity_id,
        communication_events.payload_summary,
        communication_events.occurred_at
      from crays_core.communication_events
      join crays_core.conversations on conversations.conversation_id = communication_events.conversation_id
      where conversations.prepared_offer_id = $1
        or ($2::text is not null and conversations.deal_id = $2)
        or ($3::text is not null and conversations.property_case_id = $3)
      order by communication_events.occurred_at desc, communication_events.id desc
      limit $4
    `,
    [row.offer_id, row.deal_id, row.property_case_id, limit],
  );
  return result.rows.map(communicationEventFromRow);
}

async function getSourceEvents(row: CaseRow, limit: number) {
  const pool = getCorePgPool();
  const result = await pool.query<SourceEventRow>(
    `
      select
        map_id,
        crays_entity_type,
        crays_entity_id,
        external_system,
        external_entity_type,
        sync_status,
        sync_direction,
        last_synced_at,
        updated_at
      from crays_core.external_record_maps
      where crays_entity_id = any($1::text[])
      order by coalesce(last_synced_at, updated_at) desc, id desc
      limit $2
    `,
    [[row.offer_id, row.deal_id, row.property_case_id].filter(Boolean), limit],
  );
  return result.rows.map(sourceEventFromRow);
}

async function getCounts(row: CaseRow): Promise<CountRow> {
  const pool = getCorePgPool();
  const result = await pool.query<CountRow>(
    `
      select
        (
          select count(*)::text
          from crays_core.document_package_links
          where status = 'approved'
            and (
              (package_type = 'prepared-offer' and package_id = $1)
              or ($2::text is not null and package_type = 'deal' and package_id = $2)
              or ($3::text is not null and package_type = 'property-case' and package_id = $3)
            )
        ) as approved_documents,
        (
          select count(*)::text
          from crays_core.workflow_events
          where (related_entity_type = 'prepared-offer' and related_entity_id = $1)
            or ($2::text is not null and related_entity_type = 'deal' and related_entity_id = $2)
            or ($3::text is not null and related_entity_type = 'property-case' and related_entity_id = $3)
        ) as workflow_events,
        (
          select count(*)::text
          from crays_core.core_command_events
          join crays_core.core_command_requests on core_command_requests.command_id = core_command_events.command_id
          where core_command_requests.entity_scope ->> 'preparedOfferId' = $1
            or core_command_requests.entity_id = $1
            or ($2::text is not null and (core_command_requests.entity_scope ->> 'dealId' = $2 or core_command_requests.entity_id = $2))
            or ($3::text is not null and (core_command_requests.entity_scope ->> 'propertyCaseId' = $3 or core_command_requests.entity_id = $3))
        ) as command_events,
        (
          select count(*)::text
          from crays_core.communication_events
          join crays_core.conversations on conversations.conversation_id = communication_events.conversation_id
          where conversations.prepared_offer_id = $1
            or ($2::text is not null and conversations.deal_id = $2)
            or ($3::text is not null and conversations.property_case_id = $3)
        ) as communication_events,
        (
          select count(*)::text
          from crays_core.external_record_maps
          where crays_entity_id = any(array_remove(array[$1, $2, $3], null))
        ) as source_events
    `,
    [row.offer_id, row.deal_id, row.property_case_id],
  );
  return result.rows[0] ?? { approved_documents: "0", workflow_events: "0", command_events: "0", communication_events: "0", source_events: "0" };
}

export async function getCaseActivityBackboneReadModel(query: CaseActivityBackboneQuery): Promise<CaseActivityBackboneReadModel> {
  const allowed = allowedRoles.includes(query.role);
  if (!allowed) return emptyReadModel(query, false, "forbidden");

  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured) return emptyReadModel(query, true, "not_configured");

  const row = await getCaseRow(query);
  if (!row) return emptyReadModel(query, true, "not_found");

  const limit = boundedLimit(query.limit);
  const [documents, workflowEvents, commandEvents, communicationEvents, sourceEvents, counts] = await Promise.all([
    getDocuments(row, limit),
    getWorkflowEvents(row, limit),
    getCommandEvents(row, limit),
    getCommunicationEvents(row, limit),
    getSourceEvents(row, limit),
    getCounts(row),
  ]);
  const events = [...workflowEvents, ...commandEvents, ...communicationEvents, ...sourceEvents]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);
  const kpis = kpisFromCase(row, documents, counts);

  return {
    access: {
      role: query.role,
      allowed: true,
      level: "internal_case_activity",
    },
    query: {
      preparedOfferId: query.preparedOfferId ?? null,
      dealId: query.dealId ?? null,
      propertyCaseId: query.propertyCaseId ?? null,
      limit,
    },
    case: {
      preparedOfferId: row.offer_id,
      dealId: row.deal_id,
      propertyCaseId: row.property_case_id,
      title: row.title,
      status: row.offer_status,
      updatedAt: row.updated_at.toISOString(),
    },
    summary: {
      documents: documents.length,
      approvedDocuments: Number(counts.approved_documents),
      workflowEvents: Number(counts.workflow_events),
      commandEvents: Number(counts.command_events),
      communicationEvents: Number(counts.communication_events),
      sourceEvents: Number(counts.source_events),
      kpis: kpis.length,
      latestEventAt: events[0]?.occurredAt ?? iso(row.updated_at),
    },
    documents,
    events,
    kpis,
    boundaries: boundaries(),
    queryStatus: "schema_ready",
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
