import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";
import type { SourceWorkbenchSection } from "@/lib/source-faithful-product-contract";

export type SourceSyncModule = "crm" | "project" | "erp" | "files" | "loans";

export type SourceSyncInput = {
  moduleKey: SourceSyncModule;
  role: RoleKey;
  ownerRole: RoleKey;
  sourceConnection: string;
  generatedAt: string;
  sections: SourceWorkbenchSection[];
  capabilities?: Record<string, unknown>;
};

export type SourceSyncResult = {
  status: "persisted" | "not_configured" | "core_unavailable" | "skipped";
  moduleKey: SourceSyncModule;
  connectionId: string;
  jobId?: string;
  mapsWritten: number;
  rowsSeen: number;
  sectionsSeen: number;
  error?: { code: string; message: string };
  boundaries: {
    coreWritesEnabled: boolean;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    toolApplyEnabled: false;
    externalSendingEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
};

export type SourceSnapshotReadModel = {
  status: "ready" | "not_configured" | "not_found" | "core_unavailable";
  moduleKey: SourceSyncModule;
  connectionId: string;
  sourceConnection: "snapshot";
  generatedAt: string | null;
  sections: SourceWorkbenchSection[];
  capabilities: Record<string, unknown>;
  diagnostics: {
    snapshotFallback: true;
    rowsSeen: number;
    sectionsSeen: number;
    warning?: string;
  };
};

type SourceMapTarget = {
  craysEntityType:
    | "prepared-offer"
    | "deal"
    | "property"
    | "property-case"
    | "location-analysis"
    | "evidence-package"
    | "financial-model"
    | "bank-package"
    | "loan-case"
    | "document"
    | "conversation"
    | "message"
    | "candidate-intent"
    | "organization"
    | "account";
  craysEntityId: string;
};

function digest(value: unknown, length = 24) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, length);
}

function safeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function connectionId(moduleKey: SourceSyncModule) {
  return `core_source_${moduleKey}`;
}

function systemKey(moduleKey: SourceSyncModule) {
  return `${moduleKey}-engine`;
}

function ownerForModule(moduleKey: SourceSyncModule): RoleKey {
  if (moduleKey === "erp" || moduleKey === "loans") return "finance";
  if (moduleKey === "files") return "reviewer";
  return "admin";
}

function entityTarget(moduleKey: SourceSyncModule, sectionKey: string, rowId: string): SourceMapTarget {
  const normalizedSection = safeKey(sectionKey);
  const normalizedId = digest(`${moduleKey}:${normalizedSection}:${rowId}`, 18);
  if (moduleKey === "crm") {
    if (normalizedSection === "companies") return { craysEntityType: "organization", craysEntityId: `crm_org_${normalizedId}` };
    if (normalizedSection === "people") return { craysEntityType: "account", craysEntityId: `crm_account_${normalizedId}` };
    if (normalizedSection === "leads") return { craysEntityType: "candidate-intent", craysEntityId: `crm_lead_${normalizedId}` };
    if (normalizedSection === "emails" || normalizedSection === "notes" || normalizedSection === "activities") return { craysEntityType: "message", craysEntityId: `crm_message_${normalizedId}` };
    if (normalizedSection === "calendar-events") return { craysEntityType: "conversation", craysEntityId: `crm_calendar_${normalizedId}` };
    if (normalizedSection === "tasks") return { craysEntityType: "message", craysEntityId: `crm_task_${normalizedId}` };
    return { craysEntityType: "deal", craysEntityId: `crm_deal_${normalizedId}` };
  }
  if (moduleKey === "project") {
    return { craysEntityType: "property-case", craysEntityId: `project_case_${normalizedId}` };
  }
  if (moduleKey === "erp") {
    if (normalizedSection === "customers" || normalizedSection === "suppliers") {
      return { craysEntityType: "organization", craysEntityId: `backoffice_org_${normalizedId}` };
    }
    if (normalizedSection === "employees" || normalizedSection === "job-applicants") {
      return { craysEntityType: "account", craysEntityId: `backoffice_account_${normalizedId}` };
    }
    if (normalizedSection === "communications") {
      return { craysEntityType: "conversation", craysEntityId: `backoffice_thread_${normalizedId}` };
    }
    if (["projects", "tasks", "maintenance", "issues", "quality-inspections", "assets"].includes(normalizedSection)) {
      return { craysEntityType: "property-case", craysEntityId: `studio_ops_${normalizedId}` };
    }
    return { craysEntityType: "financial-model", craysEntityId: `finance_model_${normalizedId}` };
  }
  if (moduleKey === "files") {
    if (normalizedSection === "packages") return { craysEntityType: "evidence-package", craysEntityId: `files_package_${normalizedId}` };
    if (normalizedSection === "release-preflights") return { craysEntityType: "evidence-package", craysEntityId: `files_preflight_${normalizedId}` };
    if (normalizedSection === "room-access") return { craysEntityType: "account", craysEntityId: `files_access_${normalizedId}` };
    if (normalizedSection === "package-tasks") return { craysEntityType: "property-case", craysEntityId: `files_task_${normalizedId}` };
    return { craysEntityType: "document", craysEntityId: `files_document_${normalizedId}` };
  }
  if (normalizedSection === "loan-products") {
    return { craysEntityType: "bank-package", craysEntityId: `loan_product_${normalizedId}` };
  }
  return { craysEntityType: "loan-case", craysEntityId: `loan_case_${normalizedId}` };
}

function fieldSummary(row: SourceWorkbenchSection["rows"][number]) {
  return {
    id: row.id,
    label: row.label,
    status: row.status,
    owner: row.owner,
    modifiedAt: row.modifiedAt ?? null,
    fields: row.fields,
    fieldKeys: Object.keys(row.fields).sort(),
    sourceDigest: digest({ id: row.id, label: row.label, status: row.status, modifiedAt: row.modifiedAt, fields: row.fields }, 32),
  };
}

function rowsFromSections(sections: SourceWorkbenchSection[]) {
  return sections.flatMap((section) =>
    section.rows.map((row) => ({
      sectionKey: section.key,
      sectionLabel: section.label,
      row,
    })),
  );
}

function safeError(error: unknown) {
  if (error instanceof Error) {
    if (/row-level security|permission denied|violates row-level security/i.test(error.message)) {
      return { code: "CORE_RLS_BLOCKED", message: "Core database policy blocked the adapter write." };
    }
    return { code: "CORE_WRITE_FAILED", message: "Core database could not persist the source snapshot." };
  }
  return { code: "CORE_WRITE_FAILED", message: "Core database could not persist the source snapshot." };
}

async function withCoreTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin");
    await client.query("select set_config('crays.app_role', 'core_service', true)");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function persistSourceSnapshot(input: SourceSyncInput): Promise<SourceSyncResult> {
  const rows = rowsFromSections(input.sections);
  const runtime = getCoreDatabaseRuntimeState();
  const connection = connectionId(input.moduleKey);
  const boundaries = {
    coreWritesEnabled: runtime.configured,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    toolApplyEnabled: false,
    externalSendingEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  } as const;

  if (!runtime.configured) {
    return {
      status: "not_configured",
      moduleKey: input.moduleKey,
      connectionId: connection,
      mapsWritten: 0,
      rowsSeen: rows.length,
      sectionsSeen: input.sections.length,
      boundaries,
    };
  }

  if (!rows.length) {
    return {
      status: "skipped",
      moduleKey: input.moduleKey,
      connectionId: connection,
      mapsWritten: 0,
      rowsSeen: 0,
      sectionsSeen: input.sections.length,
      boundaries,
    };
  }

  try {
    const jobId = `sync_job_${digest({ moduleKey: input.moduleKey, generatedAt: input.generatedAt, rows: rows.length }, 28)}`;
    const eventId = `workflow_event_${randomUUID()}`;
    const mapsWritten = await withCoreTransaction(async (client) => {
      await client.query(
        `
          insert into crays_core.integration_connections (
            connection_id, module_key, system_key, connection_name, owner_role, status,
            connection_mode, secret_reference_status, connection_health, metadata, updated_at
          )
          values ($1, $2, $3, $4, $5, 'active', 'sync_read_model', $6, $7, $8::jsonb, now())
          on conflict (connection_id) do update set
            status = excluded.status,
            connection_mode = excluded.connection_mode,
            secret_reference_status = excluded.secret_reference_status,
            connection_health = excluded.connection_health,
            metadata = excluded.metadata,
            updated_at = now()
        `,
        [
          connection,
          input.moduleKey,
          systemKey(input.moduleKey),
          `${input.moduleKey.toUpperCase()} source read model`,
          ownerForModule(input.moduleKey),
          input.capabilities ? "configured_reference" : "not_required",
          input.sourceConnection === "unavailable" ? "failed" : input.sourceConnection.includes("partial") ? "degraded" : "healthy",
          JSON.stringify({
            sourceConnection: input.sourceConnection,
            generatedAt: input.generatedAt,
            sections: input.sections.map((section) => ({ key: section.key, count: section.count })),
            capabilities: input.capabilities ?? {},
          }),
        ],
      );

      await client.query(
        `
          insert into crays_core.sync_jobs (
            job_id, connection_id, job_type, direction, status, attempt_count,
            payload_summary, scheduled_at, started_at, finished_at, updated_at
          )
          values ($1, $2, 'read_sync', 'read', 'succeeded', 1, $3::jsonb, now(), now(), now(), now())
          on conflict (job_id) do update set
            status = excluded.status,
            attempt_count = crays_core.sync_jobs.attempt_count + 1,
            payload_summary = excluded.payload_summary,
            started_at = excluded.started_at,
            finished_at = excluded.finished_at,
            updated_at = now()
        `,
        [
          jobId,
          connection,
          JSON.stringify({
            moduleKey: input.moduleKey,
            rowsSeen: rows.length,
            sectionsSeen: input.sections.length,
            actorRole: input.role,
            sourceConnection: input.sourceConnection,
          }),
        ],
      );

      let written = 0;
      for (const item of rows) {
        const target = entityTarget(input.moduleKey, item.sectionKey, item.row.id);
        const mapId = `map_${digest({ moduleKey: input.moduleKey, sectionKey: item.sectionKey, rowId: item.row.id }, 30)}`;
        const result = await client.query(
          `
            insert into crays_core.external_record_maps (
              map_id, crays_entity_type, crays_entity_id, external_system, external_entity_type,
              external_entity_id, sync_direction, sync_status, last_synced_at, metadata, updated_at
            )
            values ($1, $2, $3, $4, $5, $6, 'read', 'synced', now(), $7::jsonb, now())
            on conflict (external_system, external_entity_type, external_entity_id) do update set
              crays_entity_type = excluded.crays_entity_type,
              crays_entity_id = excluded.crays_entity_id,
              sync_status = 'synced',
              last_synced_at = now(),
              metadata = excluded.metadata,
              updated_at = now()
          `,
          [
            mapId,
            target.craysEntityType,
            target.craysEntityId,
            systemKey(input.moduleKey),
            item.sectionKey,
            item.row.id,
            JSON.stringify({
              moduleKey: input.moduleKey,
              sectionKey: item.sectionKey,
              sectionLabel: item.sectionLabel,
              syncJobId: jobId,
              snapshotGeneratedAt: input.generatedAt,
              row: fieldSummary(item.row),
            }),
          ],
        );
        written += result.rowCount ?? 0;
      }

      await client.query(
        `
          insert into crays_core.workflow_events (
            event_id, event_type, related_entity_type, related_entity_id, role_key,
            visibility_roles, event_status, payload, occurred_at
          )
          values ($1, 'source.snapshot.persisted', 'sync-job', $2, $3, $4::jsonb, 'recorded', $5::jsonb, now())
        `,
        [
          eventId,
          jobId,
          input.role,
          JSON.stringify(["admin", "crays-management", "reviewer", input.ownerRole]),
          JSON.stringify({
            moduleKey: input.moduleKey,
            connectionId: connection,
            rowsSeen: rows.length,
            mapsWritten: written,
            sourceConnection: input.sourceConnection,
          }),
        ],
      );

      return written;
    });

    return {
      status: "persisted",
      moduleKey: input.moduleKey,
      connectionId: connection,
      jobId,
      mapsWritten,
      rowsSeen: rows.length,
      sectionsSeen: input.sections.length,
      boundaries,
    };
  } catch (error) {
    return {
      status: "core_unavailable",
      moduleKey: input.moduleKey,
      connectionId: connection,
      mapsWritten: 0,
      rowsSeen: rows.length,
      sectionsSeen: input.sections.length,
      error: safeError(error),
      boundaries,
    };
  }
}

function rowFromSnapshotMetadata(metadata: Record<string, unknown>): SourceWorkbenchSection["rows"][number] | null {
  const row = metadata.row && typeof metadata.row === "object" && !Array.isArray(metadata.row) ? (metadata.row as Record<string, unknown>) : null;
  if (!row) return null;
  const id = typeof row.id === "string" && row.id.trim() ? row.id : null;
  const label = typeof row.label === "string" && row.label.trim() ? row.label : null;
  if (!id || !label) return null;
  const fields = row.fields && typeof row.fields === "object" && !Array.isArray(row.fields) ? (row.fields as Record<string, unknown>) : {};

  return {
    id,
    label,
    status: typeof row.status === "string" && row.status.trim() ? row.status : "synced",
    owner: typeof row.owner === "string" && row.owner.trim() ? row.owner : "Operations",
    modifiedAt: typeof row.modifiedAt === "string" && row.modifiedAt.trim() ? row.modifiedAt : undefined,
    fields: Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null ? value : String(value),
      ]),
    ),
  };
}

export async function getLatestPersistedSourceSnapshot(input: {
  moduleKey: SourceSyncModule;
  sectionKeys?: Set<string> | null;
}): Promise<SourceSnapshotReadModel> {
  const runtime = getCoreDatabaseRuntimeState();
  const connection = connectionId(input.moduleKey);
  if (!runtime.configured) {
    return {
      status: "not_configured",
      moduleKey: input.moduleKey,
      connectionId: connection,
      sourceConnection: "snapshot",
      generatedAt: null,
      sections: [],
      capabilities: {},
      diagnostics: { snapshotFallback: true, rowsSeen: 0, sectionsSeen: 0, warning: "Core database is not configured." },
    };
  }

  try {
    const result = await getCorePgPool().query<{
      external_entity_type: string;
      metadata: Record<string, unknown>;
      last_synced_at: Date | null;
    }>(
      `
        select external_entity_type, metadata, last_synced_at
        from crays_core.external_record_maps
        where external_system = $1
          and sync_status in ('synced', 'conflict')
          and metadata ->> 'moduleKey' = $2
          and ($3::text[] is null or external_entity_type = any($3::text[]))
        order by last_synced_at desc nulls last, updated_at desc
        limit 500
      `,
      [
        systemKey(input.moduleKey),
        input.moduleKey,
        input.sectionKeys && input.sectionKeys.size ? Array.from(input.sectionKeys) : null,
      ],
    );

    const rowsBySection = new Map<string, SourceWorkbenchSection["rows"]>();
    const labelsBySection = new Map<string, string>();
    let generatedAt: string | null = null;
    for (const row of result.rows) {
      const metadata = row.metadata ?? {};
      const sectionKey = row.external_entity_type;
      const sourceRow = rowFromSnapshotMetadata(metadata);
      if (!sourceRow) continue;
      const currentRows = rowsBySection.get(sectionKey) ?? [];
      currentRows.push(sourceRow);
      rowsBySection.set(sectionKey, currentRows);
      const sectionLabel = typeof metadata.sectionLabel === "string" && metadata.sectionLabel.trim() ? metadata.sectionLabel : sectionKey;
      labelsBySection.set(sectionKey, sectionLabel);
      if (!generatedAt && typeof metadata.snapshotGeneratedAt === "string") generatedAt = metadata.snapshotGeneratedAt;
      if (!generatedAt && row.last_synced_at) generatedAt = row.last_synced_at.toISOString();
    }

    const sections = Array.from(rowsBySection.entries()).map(([key, rows]) => ({
      key,
      label: labelsBySection.get(key) ?? key,
      count: rows.length,
      rows,
    }));

    if (!sections.length) {
      return {
        status: "not_found",
        moduleKey: input.moduleKey,
        connectionId: connection,
        sourceConnection: "snapshot",
        generatedAt,
        sections: [],
        capabilities: {},
        diagnostics: {
          snapshotFallback: true,
          rowsSeen: 0,
          sectionsSeen: 0,
          warning: "No row-level source snapshot is persisted yet.",
        },
      };
    }

    return {
      status: "ready",
      moduleKey: input.moduleKey,
      connectionId: connection,
      sourceConnection: "snapshot",
      generatedAt,
      sections,
      capabilities: {
        liveReads: false,
        snapshotFallback: true,
        sourceWrites: false,
      },
      diagnostics: {
        snapshotFallback: true,
        rowsSeen: sections.reduce((total, section) => total + section.rows.length, 0),
        sectionsSeen: sections.length,
      },
    };
  } catch {
    return {
      status: "core_unavailable",
      moduleKey: input.moduleKey,
      connectionId: connection,
      sourceConnection: "snapshot",
      generatedAt: null,
      sections: [],
      capabilities: {},
      diagnostics: { snapshotFallback: true, rowsSeen: 0, sectionsSeen: 0, warning: "Core snapshot fallback is unavailable." },
    };
  }
}
