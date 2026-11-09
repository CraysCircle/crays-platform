import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";
import {
  decideClubsLifecycleTransition,
  type ClubsPropertyCommandType,
  type ClubsRecordLifecycle,
} from "@/lib/clubs/property-command-contract";

type CommandInput = {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: string;
  propertyId: string;
  targetId: string;
  commandType: ClubsPropertyCommandType;
  expectedVersion: number;
  idempotencyKey: string;
  correlationId: string;
  canonicalName?: string;
  canonicalCode?: string;
};

type CommandReceipt = {
  receiptId: string;
  commandRequestId: string;
  outcome: "applied" | "replayed" | "conflict" | "denied" | "invalid";
  targetId: string;
  previousVersion: number | null;
  resultingVersion: number | null;
  resultingLifecycle: ClubsRecordLifecycle | null;
};

function identifier(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function payloadHash(input: CommandInput) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        commandType: input.commandType,
        propertyId: input.propertyId,
        targetId: input.targetId,
        expectedVersion: input.expectedVersion,
        canonicalName: input.canonicalName ?? null,
        canonicalCode: input.canonicalCode ?? null,
      }),
    )
    .digest("hex");
}

async function transaction<T>(run: (client: PoolClient) => Promise<T>) {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin");
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function appendReceipt(
  client: PoolClient,
  input: {
    commandRequestId: string;
    outcome: CommandReceipt["outcome"];
    reason?: string;
    targetType: "property" | "unit";
    targetId: string;
    previousVersion: number | null;
    resultingVersion: number | null;
    resultingLifecycle: ClubsRecordLifecycle | null;
  },
) {
  const receiptId = identifier("clubs_property_receipt");
  await client.query(
    `insert into crays_core.clubs_property_command_receipts
      (receipt_id,command_request_id,outcome,reason,target_type,target_id,
       previous_version,resulting_version,resulting_lifecycle)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      receiptId,
      input.commandRequestId,
      input.outcome,
      input.reason ?? null,
      input.targetType,
      input.targetId,
      input.previousVersion,
      input.resultingVersion,
      input.resultingLifecycle,
    ],
  );
  return {
    receiptId,
    commandRequestId: input.commandRequestId,
    outcome: input.outcome,
    targetId: input.targetId,
    previousVersion: input.previousVersion,
    resultingVersion: input.resultingVersion,
    resultingLifecycle: input.resultingLifecycle,
  } satisfies CommandReceipt;
}

async function authorized(
  client: PoolClient,
  input: CommandInput,
) {
  const result = await client.query<{ allowed: boolean }>(
    `select (
       exists (
         select 1
         from crays_core.clubs_properties property
         join crays_core.franchise_operator_tenants operator
           on operator.partner_tenant_id=property.partner_tenant_id
          and operator.organization_id=$3
          and operator.status='active'
         where property.property_id=$5
       )
       and (
         (
           $4='holiday-manager'
           and exists (
             select 1
             from crays_core.partner_role_scopes scope
             join crays_core.organization_memberships membership
               on membership.account_id=scope.account_id
              and membership.organization_id=$3
              and membership.role_key='holiday-manager'
              and membership.status='active'
             join crays_core.role_assignments assignment
               on assignment.assignment_id=scope.role_assignment_id
              and assignment.account_id=scope.account_id
              and assignment.organization_id=$3
              and assignment.role_key='holiday-manager'
              and assignment.status='active'
             where scope.account_id=$1
               and scope.property_id=$5
               and scope.status='active'
               and scope.valid_from<=now()
               and (scope.valid_until is null or scope.valid_until>now())
               and scope.capabilities @> '["clubs.holiday.property.operate"]'::jsonb
           )
         )
         or
         (
           $4 in ('crays-management','admin')
           and exists (
             select 1
             from crays_core.organization_memberships membership
             join crays_core.role_assignments assignment
               on assignment.account_id=membership.account_id
              and assignment.organization_id=membership.organization_id
              and assignment.role_key=$4
              and assignment.status='active'
             where membership.account_id=$1
               and membership.organization_id=$3
               and membership.role_key=$4
               and membership.status='active'
           )
         )
       )
       and exists (
         select 1 from crays_core.tenant_sessions session
         where session.session_id=$2
           and session.account_id=$1
           and session.organization_id=$3
           and session.role_key=$4
           and session.status='active'
           and session.expires_at>now()
       )
     ) allowed`,
    [
      input.accountId,
      input.tenantSessionId,
      input.organizationId,
      input.roleKey,
      input.propertyId,
    ],
  );
  return result.rows[0]?.allowed === true;
}

export async function executeClubsPropertyCommand(
  input: CommandInput,
): Promise<CommandReceipt> {
  const targetType =
    input.commandType.includes("property") ? "property" : "unit";
  const hash = payloadHash(input);

  return transaction(async (client) => {
    const commandRequestId = identifier("clubs_property_command");
    const inserted = await client.query(
      `insert into crays_core.clubs_property_command_requests
        (command_request_id,idempotency_key,correlation_id,actor_account_id,
         tenant_session_id,role_key,organization_id,property_id,target_type,
         target_id,command_type,expected_version,payload_hash)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (actor_account_id,idempotency_key) do nothing
       returning command_request_id`,
      [
        commandRequestId,
        input.idempotencyKey,
        input.correlationId,
        input.accountId,
        input.tenantSessionId,
        input.roleKey,
        input.organizationId,
        input.propertyId,
        targetType,
        input.targetId,
        input.commandType,
        input.expectedVersion,
        hash,
      ],
    );

    if ((inserted.rowCount ?? 0) === 0) {
      const replay = await client.query<{
        command_request_id: string;
        command_type: string;
        payload_hash: string;
        receipt_id: string;
        outcome: CommandReceipt["outcome"];
        target_id: string;
        previous_version: number | null;
        resulting_version: number | null;
        resulting_lifecycle: ClubsRecordLifecycle | null;
      }>(
        `select request.command_request_id,request.command_type,request.payload_hash,
           receipt.receipt_id,receipt.outcome,receipt.target_id,
           receipt.previous_version,receipt.resulting_version,
           receipt.resulting_lifecycle
         from crays_core.clubs_property_command_requests request
         join lateral (
           select * from crays_core.clubs_property_command_receipts
           where command_request_id=request.command_request_id
           order by occurred_at desc limit 1
         ) receipt on true
         where request.actor_account_id=$1 and request.idempotency_key=$2`,
        [input.accountId, input.idempotencyKey],
      );
      const existing = replay.rows[0];
      if (
        !existing
        || existing.command_type !== input.commandType
        || existing.payload_hash !== hash
      ) {
        throw new ClubsIdempotencyReplayConflictError();
      }
      return {
        receiptId: existing.receipt_id,
        commandRequestId: existing.command_request_id,
        outcome: "replayed",
        targetId: existing.target_id,
        previousVersion: existing.previous_version,
        resultingVersion: existing.resulting_version,
        resultingLifecycle: existing.resulting_lifecycle,
      };
    }

    if (!(await authorized(client, input))) {
      await client.query(
        `update crays_core.clubs_property_command_requests
         set status='denied',completed_at=now() where command_request_id=$1`,
        [commandRequestId],
      );
      return appendReceipt(client, {
        commandRequestId,
        outcome: "denied",
        reason: "active_property_scope_and_capability_required",
        targetType,
        targetId: input.targetId,
        previousVersion: null,
        resultingVersion: null,
        resultingLifecycle: null,
      });
    }

    if (input.commandType === "create_unit") {
      const property = await client.query<{
        version: number;
        partner_tenant_id: string;
        operator_legal_entity_id: string;
      }>(
        `select version,partner_tenant_id,operator_legal_entity_id
         from crays_core.clubs_properties
         where property_id=$1 for update`,
        [input.propertyId],
      );
      const current = property.rows[0];
      if (!current || current.version !== input.expectedVersion) {
        await client.query(
          `update crays_core.clubs_property_command_requests
           set status='conflict',completed_at=now() where command_request_id=$1`,
          [commandRequestId],
        );
        return appendReceipt(client, {
          commandRequestId,
          outcome: "conflict",
          reason: "property_version_conflict",
          targetType: "unit",
          targetId: input.targetId,
          previousVersion: current?.version ?? null,
          resultingVersion: null,
          resultingLifecycle: null,
        });
      }
      if (!input.canonicalName || !input.canonicalCode) {
        throw new Error("Unit name and canonical code are required.");
      }
      await client.query(
        `insert into crays_core.clubs_units
          (unit_id,property_id,partner_tenant_id,operator_legal_entity_id,
           canonical_code,created_by_account_id)
         values ($1,$2,$3,$4,$5,$6)`,
        [
          input.targetId,
          input.propertyId,
          current.partner_tenant_id,
          current.operator_legal_entity_id,
          input.canonicalCode,
          input.accountId,
        ],
      );
      await client.query(
        `insert into crays_core.clubs_unit_versions
          (unit_version_id,unit_id,version,canonical_name,lifecycle,
           change_reason,created_by_account_id)
         values ($1,$2,1,$3,'draft','Unit created through governed command',$4)`,
        [
          identifier("clubs_unit_version"),
          input.targetId,
          input.canonicalName,
          input.accountId,
        ],
      );
      await client.query(
        `update crays_core.clubs_property_command_requests
         set status='applied',completed_at=now() where command_request_id=$1`,
        [commandRequestId],
      );
      await client.query(
        `insert into crays_core.clubs_property_audit_events
          (audit_event_id,command_request_id,actor_account_id,role_key,
           organization_id,property_id,target_type,target_id,event_type,
           after_version,after_lifecycle)
         values ($1,$2,$3,$4,$5,$6,'unit',$7,'unit.created',1,'draft')`,
        [
          identifier("clubs_property_audit"),
          commandRequestId,
          input.accountId,
          input.roleKey,
          input.organizationId,
          input.propertyId,
          input.targetId,
        ],
      );
      return appendReceipt(client, {
        commandRequestId,
        outcome: "applied",
        targetType: "unit",
        targetId: input.targetId,
        previousVersion: null,
        resultingVersion: 1,
        resultingLifecycle: "draft",
      });
    }

    const isProperty = targetType === "property";
    const rootTable = isProperty ? "clubs_properties" : "clubs_units";
    const idColumn = isProperty ? "property_id" : "unit_id";
    const versionsTable = isProperty
      ? "clubs_property_versions"
      : "clubs_unit_versions";
    const versionIdColumn = isProperty
      ? "property_version_id"
      : "unit_version_id";
    const currentResult = await client.query<{
      version: number;
      lifecycle: ClubsRecordLifecycle;
      canonical_name: string;
    }>(
      `select root.version,root.lifecycle,version_record.canonical_name
       from crays_core.${rootTable} root
       join crays_core.${versionsTable} version_record
         on version_record.${idColumn}=root.${idColumn}
        and version_record.version=root.version
       where root.${idColumn}=$1
         ${isProperty ? "" : "and root.property_id=$2"}
       for update of root`,
      isProperty ? [input.targetId] : [input.targetId, input.propertyId],
    );
    const current = currentResult.rows[0];
    if (!current || current.version !== input.expectedVersion) {
      await client.query(
        `update crays_core.clubs_property_command_requests
         set status='conflict',completed_at=now() where command_request_id=$1`,
        [commandRequestId],
      );
      return appendReceipt(client, {
        commandRequestId,
        outcome: "conflict",
        reason: "target_version_conflict",
        targetType,
        targetId: input.targetId,
        previousVersion: current?.version ?? null,
        resultingVersion: null,
        resultingLifecycle: current?.lifecycle ?? null,
      });
    }
    const decision = decideClubsLifecycleTransition(
      input.commandType,
      current.lifecycle,
    );
    if (!decision.allowed) {
      await client.query(
        `update crays_core.clubs_property_command_requests
         set status='invalid',completed_at=now() where command_request_id=$1`,
        [commandRequestId],
      );
      return appendReceipt(client, {
        commandRequestId,
        outcome: "invalid",
        reason: decision.reason,
        targetType,
        targetId: input.targetId,
        previousVersion: current.version,
        resultingVersion: null,
        resultingLifecycle: current.lifecycle,
      });
    }
    const resultingVersion = current.version + 1;
    const canonicalName =
      input.commandType === "edit_property" || input.commandType === "edit_unit"
        ? input.canonicalName?.trim()
        : current.canonical_name;
    if (!canonicalName) throw new Error("A canonical name is required.");
    await client.query(
      `update crays_core.${rootTable}
       set version=$2,lifecycle=$3,updated_at=now()
       where ${idColumn}=$1 and version=$4`,
      [input.targetId, resultingVersion, decision.target, current.version],
    );
    await client.query(
      `insert into crays_core.${versionsTable}
        (${versionIdColumn},${idColumn},version,canonical_name,lifecycle,
         change_reason,created_by_account_id)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        identifier(isProperty ? "clubs_property_version" : "clubs_unit_version"),
        input.targetId,
        resultingVersion,
        canonicalName,
        decision.target,
        input.commandType,
        input.accountId,
      ],
    );
    await client.query(
      `update crays_core.clubs_property_command_requests
       set status='applied',completed_at=now() where command_request_id=$1`,
      [commandRequestId],
    );
    await client.query(
      `insert into crays_core.clubs_property_audit_events
        (audit_event_id,command_request_id,actor_account_id,role_key,
         organization_id,property_id,target_type,target_id,event_type,
         before_version,after_version,before_lifecycle,after_lifecycle)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        identifier("clubs_property_audit"),
        commandRequestId,
        input.accountId,
        input.roleKey,
        input.organizationId,
        input.propertyId,
        targetType,
        input.targetId,
        input.commandType,
        current.version,
        resultingVersion,
        current.lifecycle,
        decision.target,
      ],
    );
    return appendReceipt(client, {
      commandRequestId,
      outcome: "applied",
      targetType,
      targetId: input.targetId,
      previousVersion: current.version,
      resultingVersion,
      resultingLifecycle: decision.target,
    });
  });
}
