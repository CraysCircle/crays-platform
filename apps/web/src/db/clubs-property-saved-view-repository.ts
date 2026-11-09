import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import type {
  ClubsPropertyLifecycle,
  ClubsPropertyRecordType,
  ClubsPropertyViewMode,
} from "@/lib/clubs/property-collection-query";

type SaveClubsPropertyViewInput = {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: string;
  idempotencyKey: string;
  correlationId: string;
  expectedVersion: number;
  name: string;
  search: string;
  lifecycle: ClubsPropertyLifecycle | null;
  recordType: ClubsPropertyRecordType;
  viewMode: ClubsPropertyViewMode;
  pageSize: number;
};

type ArchiveClubsPropertyViewInput = Pick<
  SaveClubsPropertyViewInput,
  | "accountId"
  | "tenantSessionId"
  | "organizationId"
  | "roleKey"
  | "idempotencyKey"
  | "correlationId"
  | "expectedVersion"
> & {
  savedViewId: string;
};

type SavedViewCommandReceipt = {
  receiptId: string;
  commandRequestId: string;
  outcome: "applied" | "conflict" | "denied" | "invalid";
  replayed: boolean;
  reason: string | null;
  savedViewId: string | null;
  previousVersion: number | null;
  resultingVersion: number | null;
};

export class ClubsPropertySavedViewReplayConflictError extends Error {
  constructor() {
    super("Clubs Property saved-view replay conflict");
    this.name = "ClubsPropertySavedViewReplayConflictError";
  }
}

async function assertAuthorizedScope(
  client: PoolClient,
  input: Pick<
    SaveClubsPropertyViewInput,
    "accountId" | "tenantSessionId" | "organizationId" | "roleKey"
  >,
) {
  const result = await client.query(
    `select 1
     from crays_core.organization_memberships membership
     join crays_core.role_assignments assignment
       on assignment.account_id=membership.account_id
      and assignment.organization_id=membership.organization_id
      and assignment.role_key=membership.role_key
      and assignment.status='active'
     where membership.account_id=$1
       and membership.organization_id=$2
       and membership.role_key=$3
       and membership.status='active'
       and $3 in ('holiday-manager','crays-management','admin')
       and exists (
         select 1 from crays_core.tenant_sessions session
         where session.session_id=$4
           and session.account_id=$1
           and session.organization_id=$2
           and session.role_key=$3
           and session.status='active'
           and session.expires_at>now()
       )
     limit 1`,
    [
      input.accountId,
      input.organizationId,
      input.roleKey,
      input.tenantSessionId,
    ],
  );
  return Boolean(result.rows[0]);
}

function identifier(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function payloadHash(value: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function beginCommand(
  client: PoolClient,
  input: Pick<
    SaveClubsPropertyViewInput,
    | "accountId"
    | "tenantSessionId"
    | "organizationId"
    | "roleKey"
    | "idempotencyKey"
    | "correlationId"
    | "expectedVersion"
  >,
  commandType: "save" | "archive",
  savedViewId: string | null,
  hash: string,
) {
  const commandRequestId = identifier("clubs_property_saved_view_command");
  const inserted = await client.query(
    `insert into crays_core.clubs_property_saved_view_command_requests (
       saved_view_command_request_id,idempotency_key,correlation_id,
       actor_account_id,tenant_session_id,organization_id,role_key,
       command_type,saved_view_id,expected_version,payload_sha256
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict (actor_account_id,idempotency_key) do nothing
     returning saved_view_command_request_id`,
    [
      commandRequestId,
      input.idempotencyKey,
      input.correlationId,
      input.accountId,
      input.tenantSessionId,
      input.organizationId,
      input.roleKey,
      commandType,
      savedViewId,
      input.expectedVersion,
      hash,
    ],
  );
  if ((inserted.rowCount ?? 0) > 0) {
    return { commandRequestId, replay: null };
  }
  const replay = await client.query<{
    saved_view_command_request_id: string;
    command_type: string;
    payload_sha256: string;
    tenant_session_id: string;
    organization_id: string;
    role_key: string;
    saved_view_command_receipt_id: string;
    outcome: SavedViewCommandReceipt["outcome"];
    reason: string | null;
    saved_view_id: string | null;
    previous_version: number | null;
    resulting_version: number | null;
  }>(
    `select request.saved_view_command_request_id,request.command_type,
       request.payload_sha256,request.tenant_session_id,request.organization_id,
       request.role_key,receipt.saved_view_command_receipt_id,receipt.outcome,
       receipt.reason,
       receipt.saved_view_id,receipt.previous_version,receipt.resulting_version
     from crays_core.clubs_property_saved_view_command_requests request
     join crays_core.clubs_property_saved_view_command_receipts receipt
       on receipt.saved_view_command_request_id=request.saved_view_command_request_id
     where request.actor_account_id=$1 and request.idempotency_key=$2`,
    [input.accountId, input.idempotencyKey],
  );
  const existing = replay.rows[0];
  if (
    !existing
    || existing.command_type !== commandType
    || existing.payload_sha256 !== hash
    || existing.tenant_session_id !== input.tenantSessionId
    || existing.organization_id !== input.organizationId
    || existing.role_key !== input.roleKey
  ) {
    throw new ClubsPropertySavedViewReplayConflictError();
  }
  return {
    commandRequestId: existing.saved_view_command_request_id,
    replay: {
      receiptId: existing.saved_view_command_receipt_id,
      commandRequestId: existing.saved_view_command_request_id,
      outcome: existing.outcome,
      replayed: true,
      reason: existing.reason,
      savedViewId: existing.saved_view_id,
      previousVersion: existing.previous_version,
      resultingVersion: existing.resulting_version,
    } satisfies SavedViewCommandReceipt,
  };
}

async function appendReceipt(
  client: PoolClient,
  input: {
    commandRequestId: string;
    outcome: SavedViewCommandReceipt["outcome"];
    reason?: string;
    savedViewId: string | null;
    previousVersion: number | null;
    resultingVersion: number | null;
  },
) {
  const receiptId = identifier("clubs_property_saved_view_receipt");
  await client.query(
    `update crays_core.clubs_property_saved_view_command_requests
     set status=$2,saved_view_id=coalesce($3,saved_view_id),completed_at=now()
     where saved_view_command_request_id=$1`,
    [input.commandRequestId, input.outcome, input.savedViewId],
  );
  await client.query(
    `insert into crays_core.clubs_property_saved_view_command_receipts (
       saved_view_command_receipt_id,saved_view_command_request_id,outcome,
       reason,saved_view_id,previous_version,resulting_version
     ) values ($1,$2,$3,$4,$5,$6,$7)`,
    [
      receiptId,
      input.commandRequestId,
      input.outcome,
      input.reason ?? null,
      input.savedViewId,
      input.previousVersion,
      input.resultingVersion,
    ],
  );
  return {
    receiptId,
    commandRequestId: input.commandRequestId,
    outcome: input.outcome,
    replayed: false,
    reason: input.reason ?? null,
    savedViewId: input.savedViewId,
    previousVersion: input.previousVersion,
    resultingVersion: input.resultingVersion,
  } satisfies SavedViewCommandReceipt;
}

export async function saveClubsPropertyView(input: SaveClubsPropertyViewInput) {
  const pool = getCorePgPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const normalized = {
      name: input.name.trim(),
      search: input.search.trim(),
      lifecycle: input.lifecycle,
      recordType: input.recordType,
      viewMode: input.viewMode,
      pageSize: input.pageSize,
      expectedVersion: input.expectedVersion,
    };
    const command = await beginCommand(
      client,
      input,
      "save",
      null,
      payloadHash(normalized),
    );
    if (command.replay) {
      await client.query("commit");
      return command.replay;
    }
    if (!(await assertAuthorizedScope(client, input))) {
      const denied = await appendReceipt(client, {
        commandRequestId: command.commandRequestId,
        outcome: "denied",
        reason: "active_tenant_session_and_role_required",
        savedViewId: null,
        previousVersion: null,
        resultingVersion: null,
      });
      await client.query("commit");
      return denied;
    }
    const existing = await client.query<{
      saved_view_id: string;
      version: number;
    }>(
      `select saved_view_id,version
       from crays_core.clubs_property_saved_views
       where owner_account_id=$1 and organization_id=$2 and name=$3
       for update`,
      [input.accountId, input.organizationId, normalized.name],
    );
    const current = existing.rows[0];
    const previousVersion = current?.version ?? 0;
    if (previousVersion !== input.expectedVersion) {
      const conflict = await appendReceipt(client, {
        commandRequestId: command.commandRequestId,
        outcome: "conflict",
        reason: "saved_view_version_conflict",
        savedViewId: current?.saved_view_id ?? null,
        previousVersion,
        resultingVersion: null,
      });
      await client.query("commit");
      return conflict;
    }
    const savedViewId = current?.saved_view_id ?? identifier("clubs_property_view");
    const result = await client.query<{ saved_view_id: string; version: number }>(
      `insert into crays_core.clubs_property_saved_views (
         saved_view_id,owner_account_id,organization_id,role_key,name,
         search_text,lifecycle_filter,record_type_filter,view_mode,page_size
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (owner_account_id,organization_id,name)
       do update set
         search_text=excluded.search_text,
         lifecycle_filter=excluded.lifecycle_filter,
         record_type_filter=excluded.record_type_filter,
         view_mode=excluded.view_mode,
         page_size=excluded.page_size,
         role_key=excluded.role_key,
         status='active',
         version=crays_core.clubs_property_saved_views.version+1,
         updated_at=now()
       where crays_core.clubs_property_saved_views.version=$11
       returning saved_view_id,version`,
      [
        savedViewId,
        input.accountId,
        input.organizationId,
        input.roleKey,
        normalized.name,
        normalized.search,
        normalized.lifecycle,
        normalized.recordType,
        normalized.viewMode,
        normalized.pageSize,
        input.expectedVersion,
      ],
    );
    const row = result.rows[0];
    if (!row) {
      const conflict = await appendReceipt(client, {
        commandRequestId: command.commandRequestId,
        outcome: "conflict",
        reason: "saved_view_concurrent_update",
        savedViewId: current?.saved_view_id ?? null,
        previousVersion,
        resultingVersion: null,
      });
      await client.query("commit");
      return conflict;
    }
    await client.query(
      `insert into crays_core.audit_events (
         audit_id,actor_account_id,action,target_type,target_id,outcome,risk_level,metadata
       ) values ($1,$2,'clubs.property.saved-view.persisted','clubs-property-saved-view',$3,'changed','standard',$4::jsonb)`,
      [
        `audit-${randomUUID()}`,
        input.accountId,
        row.saved_view_id,
        JSON.stringify({
          organizationId: input.organizationId,
          roleKey: input.roleKey,
          viewMode: input.viewMode,
          version: row.version,
        }),
      ],
    );
    const receipt = await appendReceipt(client, {
      commandRequestId: command.commandRequestId,
      outcome: "applied",
      savedViewId: row.saved_view_id,
      previousVersion,
      resultingVersion: row.version,
    });
    await client.query("commit");
    return receipt;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function archiveClubsPropertyView(
  input: ArchiveClubsPropertyViewInput,
) {
  const pool = getCorePgPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const command = await beginCommand(
      client,
      input,
      "archive",
      input.savedViewId,
      payloadHash({
        savedViewId: input.savedViewId,
        expectedVersion: input.expectedVersion,
      }),
    );
    if (command.replay) {
      await client.query("commit");
      return command.replay;
    }
    if (!(await assertAuthorizedScope(client, input))) {
      const denied = await appendReceipt(client, {
        commandRequestId: command.commandRequestId,
        outcome: "denied",
        reason: "active_tenant_session_and_role_required",
        savedViewId: input.savedViewId,
        previousVersion: null,
        resultingVersion: null,
      });
      await client.query("commit");
      return denied;
    }
    const existing = await client.query<{ version: number; status: string }>(
      `select version,status from crays_core.clubs_property_saved_views
       where saved_view_id=$1 and owner_account_id=$2 and organization_id=$3
       for update`,
      [input.savedViewId, input.accountId, input.organizationId],
    );
    const current = existing.rows[0];
    if (
      !current
      || current.status !== "active"
      || current.version !== input.expectedVersion
    ) {
      const conflict = await appendReceipt(client, {
        commandRequestId: command.commandRequestId,
        outcome: "conflict",
        reason: current ? "saved_view_version_conflict" : "saved_view_not_found",
        savedViewId: input.savedViewId,
        previousVersion: current?.version ?? null,
        resultingVersion: null,
      });
      await client.query("commit");
      return conflict;
    }
    const result = await client.query<{ version: number }>(
      `update crays_core.clubs_property_saved_views
       set status='archived',version=version+1,updated_at=now()
       where saved_view_id=$1 and owner_account_id=$2 and organization_id=$3
         and status='active' and version=$4
       returning version`,
      [
        input.savedViewId,
        input.accountId,
        input.organizationId,
        input.expectedVersion,
      ],
    );
    const row = result.rows[0];
    if (!row) {
      const conflict = await appendReceipt(client, {
        commandRequestId: command.commandRequestId,
        outcome: "conflict",
        reason: "saved_view_concurrent_update",
        savedViewId: input.savedViewId,
        previousVersion: current.version,
        resultingVersion: null,
      });
      await client.query("commit");
      return conflict;
    }
    await client.query(
      `insert into crays_core.audit_events (
         audit_id,actor_account_id,action,target_type,target_id,outcome,risk_level,metadata
       ) values ($1,$2,'clubs.property.saved-view.archived','clubs-property-saved-view',$3,'changed','standard',$4::jsonb)`,
      [
        `audit-${randomUUID()}`,
        input.accountId,
        input.savedViewId,
        JSON.stringify({
          organizationId: input.organizationId,
          roleKey: input.roleKey,
          version: row.version,
        }),
      ],
    );
    const receipt = await appendReceipt(client, {
      commandRequestId: command.commandRequestId,
      outcome: "applied",
      savedViewId: input.savedViewId,
      previousVersion: current.version,
      resultingVersion: row.version,
    });
    await client.query("commit");
    return receipt;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
