import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import { executeClubsPropertyCommand } from "@/db/clubs-property-command-repository";
import type { ClubsPropertyCommandType } from "@/lib/clubs/property-command-contract";

export type ClubsPropertyBatchItemInput = {
  propertyId: string;
  targetId: string;
  expectedVersion: number;
  canonicalName?: string;
  canonicalCode?: string;
};

type Authority = {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: string;
};

export class ClubsPropertyExportReplayConflictError extends Error {
  constructor() {
    super("Clubs Property export replay conflict");
    this.name = "ClubsPropertyExportReplayConflictError";
  }
}

export class ClubsPropertyBatchStepUpRequiredError extends Error {
  constructor() {
    super("Clubs Property batch step-up required");
    this.name = "ClubsPropertyBatchStepUpRequiredError";
  }
}

export class ClubsPropertyBatchScopeError extends Error {
  constructor() {
    super("Clubs Property batch scope denied");
    this.name = "ClubsPropertyBatchScopeError";
  }
}

export class ClubsPropertyBatchReplayConflictError extends Error {
  constructor() {
    super("Clubs Property batch replay conflict");
    this.name = "ClubsPropertyBatchReplayConflictError";
  }
}

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function previewRequestSha256(input: {
  commandType: ClubsPropertyCommandType;
  items: ClubsPropertyBatchItemInput[];
  operationKind?: "bulk_command" | "csv_import";
  sourceFilename?: string;
  sourceSha256?: string;
}) {
  return createHash("sha256").update(JSON.stringify({
    commandType: input.commandType,
    operationKind: input.operationKind ?? "bulk_command",
    sourceFilename: input.sourceFilename ?? null,
    sourceSha256: input.sourceSha256 ?? null,
    items: input.items.map((item) => ({
      propertyId: item.propertyId,
      targetId: item.targetId,
      expectedVersion: item.expectedVersion,
      canonicalName: item.canonicalName ?? null,
      canonicalCode: item.canonicalCode ?? null,
    })),
  })).digest("hex");
}

async function targetState(
  client: PoolClient,
  authority: Authority,
  commandType: ClubsPropertyCommandType,
  item: ClubsPropertyBatchItemInput,
) {
  const targetType = commandType.includes("property") ? "property" : "unit";
  const root = targetType === "property" ? "clubs_properties" : "clubs_units";
  const idColumn = targetType === "property" ? "property_id" : "unit_id";
  const result = await client.query<{ version: number; property_id: string }>(
    `select target.version,
       ${targetType === "property" ? "target.property_id" : "target.property_id"} property_id
     from crays_core.${root} target
     join crays_core.clubs_properties property
       on property.property_id=${targetType === "property" ? "target.property_id" : "target.property_id"}
     join crays_core.franchise_operator_tenants operator
       on operator.partner_tenant_id=property.partner_tenant_id
      and operator.organization_id=$2
      and operator.status='active'
     where target.${idColumn}=$3
       and property.property_id=$4
       and (
         (
           $5='holiday-manager'
           and exists (
             select 1
             from crays_core.partner_role_scopes scope
             join crays_core.organization_memberships membership
               on membership.account_id=scope.account_id
              and membership.organization_id=$2
              and membership.role_key='holiday-manager'
              and membership.status='active'
             join crays_core.role_assignments assignment
               on assignment.assignment_id=scope.role_assignment_id
              and assignment.organization_id=$2
              and assignment.status='active'
             where scope.account_id=$1
               and scope.property_id=property.property_id
               and scope.status='active'
               and scope.capabilities @> '["clubs.holiday.property.operate"]'::jsonb
           )
         )
         or (
           $5 in ('crays-management','admin')
           and exists (
             select 1
             from crays_core.organization_memberships membership
             join crays_core.role_assignments assignment
               on assignment.account_id=membership.account_id
              and assignment.organization_id=membership.organization_id
              and assignment.role_key=$5
              and assignment.status='active'
             where membership.account_id=$1
               and membership.organization_id=$2
               and membership.role_key=$5
               and membership.status='active'
           )
         )
       )
     limit 1`,
    [
      authority.accountId,
      authority.organizationId,
      item.targetId,
      item.propertyId,
      authority.roleKey,
    ],
  );
  return result.rows[0] ?? null;
}

export async function previewClubsPropertyBatch(input: Authority & {
  commandType: ClubsPropertyCommandType;
  idempotencyKey: string;
  items: ClubsPropertyBatchItemInput[];
  operationKind?: "bulk_command" | "csv_import";
  sourceFilename?: string;
  sourceSha256?: string;
}) {
  const requestSha256 = previewRequestSha256(input);
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin");
    const replay = await client.query<{
      batch_id: string;
      status: string;
      organization_id: string;
      tenant_session_id: string;
      role_key: string;
      operation_kind: string;
      command_type: string;
      request_sha256: string | null;
    }>(
      `select batch_id,status,organization_id,tenant_session_id,role_key,
         operation_kind,command_type,authorized_scope->>'requestSha256' request_sha256
       from crays_core.clubs_property_operation_batches
       where actor_account_id=$1 and idempotency_key=$2`,
      [input.accountId, input.idempotencyKey],
    );
    if (replay.rows[0]) {
      const existing = replay.rows[0];
      if (
        existing.organization_id !== input.organizationId
        || existing.tenant_session_id !== input.tenantSessionId
        || existing.role_key !== input.roleKey
        || existing.operation_kind !== (input.operationKind ?? "bulk_command")
        || existing.command_type !== input.commandType
        || existing.request_sha256 !== requestSha256
      ) {
        throw new ClubsPropertyBatchReplayConflictError();
      }
      await client.query("commit");
      return {
        status: "replayed" as const,
        batchId: existing.batch_id,
        batchStatus: existing.status,
      };
    }
    const batchId = id("clubs_property_batch");
    await client.query(
      `insert into crays_core.clubs_property_operation_batches (
         batch_id,organization_id,actor_account_id,tenant_session_id,role_key,
         operation_kind,command_type,idempotency_key,source_filename,
         source_sha256,authorized_scope,requested_count
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)`,
      [
        batchId,
        input.organizationId,
        input.accountId,
        input.tenantSessionId,
        input.roleKey,
        input.operationKind ?? "bulk_command",
        input.commandType,
        input.idempotencyKey,
        input.sourceFilename ?? null,
        input.sourceSha256 ?? null,
        JSON.stringify({
          organizationId: input.organizationId,
          roleKey: input.roleKey,
          authority: "crays-core",
          requestSha256,
        }),
        input.items.length,
      ],
    );

    let validCount = 0;
    for (const [index, item] of input.items.entries()) {
      const state = await targetState(client, input, input.commandType, item);
      const validationStatus = !state
        ? "denied"
        : state.version !== item.expectedVersion
          ? "conflict"
          : "valid";
      if (validationStatus === "valid") validCount += 1;
      await client.query(
        `insert into crays_core.clubs_property_operation_batch_items (
           batch_item_id,batch_id,item_ordinal,property_id,target_type,target_id,
           expected_version,normalized_payload,validation_status,reason_code
         ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`,
        [
          id("clubs_property_batch_item"),
          batchId,
          index + 1,
          state?.property_id ?? null,
          input.commandType.includes("property") ? "property" : "unit",
          item.targetId,
          item.expectedVersion,
          JSON.stringify({
            canonicalName: item.canonicalName ?? null,
            canonicalCode: item.canonicalCode ?? null,
          }),
          validationStatus,
          validationStatus === "denied"
            ? "outside_authorized_scope"
            : validationStatus === "conflict"
              ? "expected_version_conflict"
              : null,
        ],
      );
    }
    const status = validCount > 0 ? "preview_ready" : "preview_failed";
    await client.query(
      `update crays_core.clubs_property_operation_batches
       set status=$2,valid_count=$3,failed_count=$4,previewed_at=now(),
         completed_at=case when $2='preview_failed' then now() else null end
       where batch_id=$1`,
      [batchId, status, validCount, input.items.length - validCount],
    );
    await client.query("commit");
    return {
      status: "previewed" as const,
      batchId,
      batchStatus: status,
      requestedCount: input.items.length,
      validCount,
      failedCount: input.items.length - validCount,
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function applyClubsPropertyBatch(input: Authority & {
  batchId: string;
  assuranceLevel: "aal1" | "aal2" | "aal3";
}) {
  const pool = getCorePgPool();
  const batch = await pool.query<{
    command_type: ClubsPropertyCommandType;
    status: string;
  }>(
    `update crays_core.clubs_property_operation_batches
     set status='applying',tenant_session_id=$5
     where batch_id=$1 and actor_account_id=$2 and organization_id=$3
       and role_key=$4 and status in ('preview_ready','applying')
       and ($6<>'aal1' or command_type !~ '^(publish|suspend|archive)_')
     returning command_type,status`,
    [
      input.batchId,
      input.accountId,
      input.organizationId,
      input.roleKey,
      input.tenantSessionId,
      input.assuranceLevel,
    ],
  );
  const batchRow = batch.rows[0];
  if (!batchRow) {
    const completed = await pool.query<{
      status: string;
      applied_count: number;
      failed_count: number;
      skipped_count: number;
      command_type: ClubsPropertyCommandType;
    }>(
      `select status,applied_count,failed_count,skipped_count,command_type
       from crays_core.clubs_property_operation_batches
       where batch_id=$1 and actor_account_id=$2 and organization_id=$3`,
      [input.batchId, input.accountId, input.organizationId],
    );
    if (
      completed.rows[0]
      && input.assuranceLevel === "aal1"
      && /^(publish|suspend|archive)_/.test(completed.rows[0].command_type)
    ) {
      throw new ClubsPropertyBatchStepUpRequiredError();
    }
    if (completed.rows[0]) {
      const completedRow = completed.rows[0];
      return {
        status: "replayed" as const,
        batchStatus: completedRow.status,
        applied_count: completedRow.applied_count,
        failed_count: completedRow.failed_count,
        skipped_count: completedRow.skipped_count,
      };
    }
    throw new ClubsPropertyBatchScopeError();
  }
  const items = await pool.query<{
    batch_item_id: string;
    item_ordinal: number;
    property_id: string;
    target_id: string;
    expected_version: number;
    normalized_payload: {
      canonicalName?: string | null;
      canonicalCode?: string | null;
    };
  }>(
    `select batch_item_id,item_ordinal,property_id,target_id,expected_version,
       normalized_payload
     from crays_core.clubs_property_operation_batch_items
     where batch_id=$1 and validation_status='valid'
       and apply_status='not_requested'
     order by item_ordinal`,
    [input.batchId],
  );
  for (const item of items.rows) {
    try {
      const receipt = await executeClubsPropertyCommand({
        ...input,
        propertyId: item.property_id,
        targetId: item.target_id,
        commandType: batchRow.command_type,
        expectedVersion: item.expected_version,
        canonicalName: item.normalized_payload.canonicalName ?? undefined,
        canonicalCode: item.normalized_payload.canonicalCode ?? undefined,
        idempotencyKey: `${input.batchId}:${item.item_ordinal}`,
        correlationId: `${input.batchId}:${item.item_ordinal}`,
      });
      await pool.query(
        `update crays_core.clubs_property_operation_batch_items
         set apply_status=$2,reason_code=$3,command_receipt_id=$4,completed_at=now()
         where batch_item_id=$1 and apply_status='not_requested'`,
        [
          item.batch_item_id,
          receipt.outcome === "applied" || receipt.outcome === "replayed"
            ? "applied"
            : "failed",
          receipt.outcome,
          receipt.receiptId,
        ],
      );
    } catch {
      await pool.query(
        `update crays_core.clubs_property_operation_batch_items
         set apply_status='failed',reason_code='command_failed',completed_at=now()
         where batch_item_id=$1 and apply_status='not_requested'`,
        [item.batch_item_id],
      );
    }
  }
  const counts = await pool.query<{
    applied_count: number;
    failed_count: number;
    skipped_count: number;
  }>(
    `select
       count(*) filter (where apply_status='applied')::int applied_count,
       count(*) filter (where apply_status='failed')::int failed_count,
       count(*) filter (where validation_status<>'valid' or apply_status='skipped')::int skipped_count
     from crays_core.clubs_property_operation_batch_items where batch_id=$1`,
    [input.batchId],
  );
  const summary = counts.rows[0] ?? {
    applied_count: 0,
    failed_count: 0,
    skipped_count: 0,
  };
  const status =
    summary.applied_count > 0 && (summary.failed_count > 0 || summary.skipped_count > 0)
      ? "partially_succeeded"
      : summary.applied_count > 0
        ? "succeeded"
        : "failed";
  await pool.query(
    `update crays_core.clubs_property_operation_batches
     set status=$2,applied_count=$3,failed_count=$4,skipped_count=$5,
       applied_at=coalesce(applied_at,now()),completed_at=now()
     where batch_id=$1`,
    [
      input.batchId,
      status,
      summary.applied_count,
      summary.failed_count,
      summary.skipped_count,
    ],
  );
  return { status, ...summary };
}

export async function exportAuthorizedClubsPropertyCsv(
  input: Authority & { idempotencyKey: string },
) {
  const pool = getCorePgPool();
  const rows = await pool.query<{
    record_type: string;
    record_id: string;
    property_id: string;
    name: string;
    code: string;
    lifecycle: string;
    version: number;
    updated_at: Date;
  }>(
    `with authorized_properties as (
       select distinct property.property_id
       from crays_core.clubs_properties property
       join crays_core.franchise_operator_tenants operator
         on operator.partner_tenant_id=property.partner_tenant_id
        and operator.organization_id=$2
        and operator.status='active'
       where (
         $3 in ('crays-management','admin')
         or exists (
           select 1
           from crays_core.partner_role_scopes scope
           join crays_core.role_assignments assignment
             on assignment.assignment_id=scope.role_assignment_id
            and assignment.organization_id=$2
            and assignment.status='active'
           where scope.account_id=$1 and scope.property_id=property.property_id
             and scope.role_key='holiday-manager' and scope.status='active'
             and scope.valid_from<=now()
             and (scope.valid_until is null or scope.valid_until>now())
             and scope.capabilities @> '["clubs.holiday.property.operate"]'::jsonb
         )
       )
       and exists (
         select 1 from crays_core.tenant_sessions session
         where session.session_id=$4
           and session.account_id=$1
           and session.organization_id=$2
           and session.role_key=$3
           and session.status='active'
           and session.expires_at>now()
       )
     ), records as (
       select 'property'::text record_type,p.property_id record_id,p.property_id,
         version.canonical_name name,coalesce(p.public_slug,p.property_id) code,
         p.lifecycle,p.version,p.updated_at
       from crays_core.clubs_properties p
       join authorized_properties scope on scope.property_id=p.property_id
       join crays_core.clubs_property_versions version
         on version.property_id=p.property_id and version.version=p.version
       union all
       select 'unit'::text,u.unit_id,u.property_id,version.canonical_name,
         u.canonical_code,u.lifecycle,u.version,u.updated_at
       from crays_core.clubs_units u
       join authorized_properties scope on scope.property_id=u.property_id
       join crays_core.clubs_unit_versions version
         on version.unit_id=u.unit_id and version.version=u.version
     )
     select * from records order by record_type,property_id,record_id
     limit 10000`,
    [
      input.accountId,
      input.organizationId,
      input.roleKey,
      input.tenantSessionId,
    ],
  );
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const header = [
    "record_type",
    "record_id",
    "property_id",
    "name",
    "code",
    "lifecycle",
    "version",
    "updated_at",
  ];
  const csv = [
    header.join(","),
    ...rows.rows.map((row) => [
      row.record_type,
      row.record_id,
      row.property_id,
      row.name,
      row.code,
      row.lifecycle,
      row.version,
      row.updated_at.toISOString(),
    ].map(escape).join(",")),
  ].join("\r\n");
  const contentSha256 = createHash("sha256").update(csv).digest("hex");
  const batchId = id("clubs_property_batch");
  const client = await pool.connect();
  try {
    await client.query("begin");
    const inserted = await client.query(
      `insert into crays_core.clubs_property_operation_batches (
         batch_id,organization_id,actor_account_id,tenant_session_id,role_key,
         operation_kind,idempotency_key,authorized_scope,requested_count,
         valid_count,applied_count,status,previewed_at,applied_at,completed_at
       ) values ($1,$2,$3,$4,$5,'csv_export',$6,$7::jsonb,$8,$8,$8,'succeeded',now(),now(),now())
       on conflict (actor_account_id,idempotency_key) do nothing
       returning batch_id`,
      [
        batchId,
        input.organizationId,
        input.accountId,
        input.tenantSessionId,
        input.roleKey,
        input.idempotencyKey,
        JSON.stringify({ organizationId: input.organizationId, roleKey: input.roleKey }),
        rows.rows.length,
      ],
    );
    if ((inserted.rowCount ?? 0) === 0) {
      const replay = await client.query<{
        batch_id: string;
        organization_id: string;
        tenant_session_id: string;
        role_key: string;
        operation_kind: string;
        row_count: number;
        content_sha256: string;
      }>(
        `select batch.batch_id,batch.organization_id,batch.tenant_session_id,
           batch.role_key,batch.operation_kind,receipt.row_count,
           receipt.content_sha256
         from crays_core.clubs_property_operation_batches batch
         join crays_core.clubs_property_export_receipts receipt
           on receipt.batch_id=batch.batch_id
         where batch.actor_account_id=$1 and batch.idempotency_key=$2`,
        [input.accountId, input.idempotencyKey],
      );
      const existing = replay.rows[0];
      if (
        !existing
        || existing.organization_id !== input.organizationId
        || existing.tenant_session_id !== input.tenantSessionId
        || existing.role_key !== input.roleKey
        || existing.operation_kind !== "csv_export"
        || existing.row_count !== rows.rows.length
        || existing.content_sha256 !== contentSha256
      ) {
        throw new ClubsPropertyExportReplayConflictError();
      }
      await client.query("commit");
      return {
        csv,
        contentSha256,
        rowCount: rows.rows.length,
        batchId: existing.batch_id,
        outcome: "replayed" as const,
      };
    }
    await client.query(
      `insert into crays_core.clubs_property_export_receipts (
         export_receipt_id,batch_id,organization_id,actor_account_id,format,
         field_manifest,row_count,content_sha256
       ) values ($1,$2,$3,$4,'csv',$5::jsonb,$6,$7)`,
      [
        id("clubs_property_export_receipt"),
        batchId,
        input.organizationId,
        input.accountId,
        JSON.stringify(header),
        rows.rows.length,
        contentSha256,
      ],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  return {
    csv,
    contentSha256,
    rowCount: rows.rows.length,
    batchId,
    outcome: "applied" as const,
  };
}
