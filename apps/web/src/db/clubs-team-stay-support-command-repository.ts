import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getCorePgPool } from "@/db/client";
import {
  CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT,
  resolveTeamStaySupportCommandTransition,
  teamStaySupportCommandDeniedAuthorities,
  type TeamStaySupportCommand,
  type TeamStaySupportCommandAuthority,
  type TeamStaySupportCommandResult,
} from "@/lib/clubs/team-stay-support-command-contract";

export type TeamStaySupportCommandClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
};

type TeamStaySupportCommandPool = {
  connect(): Promise<TeamStaySupportCommandClient & { release(): void }>;
};

type TargetRow = {
  public_reference: string;
  property_id: string;
  status: string;
  version: number;
};

type ReplayRow = {
  property_id: string;
  actor_role: TeamStaySupportCommandAuthority["roleKey"];
  command_type: TeamStaySupportCommand["type"];
  request_sha256: string;
  response_payload: TeamStaySupportCommandResult;
};

export class TeamStaySupportCommandAuthorityError extends Error {
  constructor() {
    super("Team Stay Support command authority denied");
    this.name = "TeamStaySupportCommandAuthorityError";
  }
}

export class TeamStaySupportCommandNotFoundError extends Error {
  constructor() {
    super("Team Stay Support command target not found");
    this.name = "TeamStaySupportCommandNotFoundError";
  }
}

export class TeamStaySupportCommandConflictError extends Error {
  constructor() {
    super("Team Stay Support command conflict");
    this.name = "TeamStaySupportCommandConflictError";
  }
}

export class TeamStaySupportCommandValidationError extends Error {
  constructor() {
    super("Team Stay Support command invalid");
    this.name = "TeamStaySupportCommandValidationError";
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validateAuthority(authority: TeamStaySupportCommandAuthority) {
  if (
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(authority.accountId) ||
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(authority.tenantSessionId) ||
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(authority.organizationId) ||
    !CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT.authentication.allowedRoles.includes(
      authority.roleKey,
    ) ||
    !CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT.authentication.requiredAssurance.includes(
      authority.assuranceLevel,
    )
  ) {
    throw new TeamStaySupportCommandAuthorityError();
  }
}

function validateIdempotencyKey(value: string) {
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(value)) {
    throw new TeamStaySupportCommandValidationError();
  }
}

function validateCommand(command: TeamStaySupportCommand) {
  if (
    !CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT.commands.includes(command.type) ||
    !/^SUP-[A-F0-9]{12}$/.test(command.publicSupportReference) ||
    !Number.isInteger(command.expectedVersion) ||
    command.expectedVersion < 1
  ) {
    throw new TeamStaySupportCommandValidationError();
  }
}

async function setCoreTenantRole(
  client: TeamStaySupportCommandClient,
  organizationId: string,
) {
  await client.query(
    "select set_config('crays.app_role','core_service',true), set_config('crays.tenant_id',$1,true)",
    [organizationId],
  );
}

async function propertyIsAuthorized(
  client: TeamStaySupportCommandClient,
  authority: TeamStaySupportCommandAuthority,
  propertyId: string,
) {
  const result = await client.query<{ allowed: boolean }>(
    `select (
       exists (
         select 1 from crays_core.tenant_sessions session
         where session.session_id=$2 and session.account_id=$1
           and session.organization_id=$3 and session.role_key=$4
           and session.status='active' and session.expires_at>now()
       )
       and (
         ($4='holiday-manager' and exists (
           select 1
           from crays_core.partner_role_scopes scope
           join crays_core.role_assignments role
             on role.assignment_id=scope.role_assignment_id
            and role.organization_id=$3
            and role.account_id=$1
            and role.role_key=$4
            and role.status='active'
           join crays_core.clubs_properties property
             on property.property_id=scope.property_id
            and property.partner_tenant_id=scope.partner_tenant_id
            and property.operator_legal_entity_id=scope.operator_legal_entity_id
           join crays_core.stores store
             on store.store_id=property.store_id and store.vertical_root='clubs'
           join crays_core.store_operator_assignments assignment
             on assignment.store_id=store.store_id
            and assignment.partner_tenant_id=scope.partner_tenant_id
            and assignment.operator_legal_entity_id=scope.operator_legal_entity_id
            and assignment.status='active'
            and assignment.valid_from<=now()
            and (assignment.valid_until is null or assignment.valid_until>now())
           where scope.account_id=$1 and scope.property_id=$5
             and scope.role_key='holiday-manager'
             and scope.vertical_root='clubs'
             and scope.relationship_type='clubs-franchise-partner'
             and scope.status='active' and scope.valid_from<=now()
             and (scope.valid_until is null or scope.valid_until>now())
             and scope.capabilities @> '["clubs.holiday.reservation.operate"]'::jsonb
         ))
         or ($4 in ('crays-management','admin') and exists (
           select 1
           from crays_core.organization_memberships membership
           join crays_core.role_assignments role
             on role.account_id=membership.account_id
            and role.organization_id=membership.organization_id
            and role.role_key=membership.role_key and role.status='active'
           join crays_core.franchise_operator_tenants operator
             on operator.organization_id=membership.organization_id
            and operator.status='active'
           join crays_core.clubs_properties property
             on property.property_id=$5
            and property.partner_tenant_id=operator.partner_tenant_id
           join crays_core.stores store
             on store.store_id=property.store_id and store.vertical_root='clubs'
           join crays_core.store_operator_assignments assignment
             on assignment.store_id=store.store_id
            and assignment.partner_tenant_id=property.partner_tenant_id
            and assignment.operator_legal_entity_id=property.operator_legal_entity_id
            and assignment.status='active'
            and assignment.valid_from<=now()
            and (assignment.valid_until is null or assignment.valid_until>now())
           where membership.account_id=$1 and membership.organization_id=$3
             and membership.role_key=$4 and membership.status='active'
         ))
       )
     ) allowed`,
    [
      authority.accountId,
      authority.tenantSessionId,
      authority.organizationId,
      authority.roleKey,
      propertyId,
    ],
  );
  return result.rows[0]?.allowed === true;
}

function requestSha256(
  authority: TeamStaySupportCommandAuthority,
  idempotencyKey: string,
  command: TeamStaySupportCommand,
) {
  return sha256(
    JSON.stringify({
      schema: CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT.schema,
      actorAccountId: authority.accountId,
      organizationId: authority.organizationId,
      roleKey: authority.roleKey,
      idempotencyKey,
      command,
    }),
  );
}

async function findReplay(
  client: TeamStaySupportCommandClient,
  authority: TeamStaySupportCommandAuthority,
  idempotencyKey: string,
) {
  return client.query<ReplayRow>(
    `select property_id,actor_role,command_type,request_sha256,response_payload
       from crays_core.clubs_team_stay_support_command_receipts
      where organization_id=$1 and actor_account_id=$2
        and idempotency_key=$3
      limit 2`,
    [
      authority.organizationId,
      authority.accountId,
      idempotencyKey,
    ],
  );
}

async function resolveTargetForUpdate(
  client: TeamStaySupportCommandClient,
  command: TeamStaySupportCommand,
) {
  const result = await client.query<TargetRow>(
    `select support.public_reference,support.property_id,
            support.status,support.version
       from crays_core.clubs_member_support_cases support
      where support.public_reference=$1 and support.property_id is not null
      limit 2
      for update of support`,
    [command.publicSupportReference],
  );
  if (result.rows.length !== 1) {
    throw new TeamStaySupportCommandNotFoundError();
  }
  return result.rows[0];
}

export async function executeTeamStaySupportCommandWithClient(
  client: TeamStaySupportCommandClient,
  authority: TeamStaySupportCommandAuthority,
  idempotencyKey: string,
  command: TeamStaySupportCommand,
  now = new Date(),
): Promise<TeamStaySupportCommandResult> {
  validateAuthority(authority);
  validateIdempotencyKey(idempotencyKey);
  validateCommand(command);
  await setCoreTenantRole(client, authority.organizationId);
  const requestHash = requestSha256(authority, idempotencyKey, command);
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    `clubs-team-stay-support:${authority.organizationId}:${command.publicSupportReference}`,
  ]);

  const replay = await findReplay(client, authority, idempotencyKey);
  if (replay.rows.length > 1) {
    throw new TeamStaySupportCommandConflictError();
  }
  if (replay.rows[0]) {
    if (
      replay.rows[0].command_type !== command.type ||
      replay.rows[0].actor_role !== authority.roleKey ||
      replay.rows[0].request_sha256 !== requestHash
    ) {
      throw new TeamStaySupportCommandConflictError();
    }
    if (
      !(await propertyIsAuthorized(client, authority, replay.rows[0].property_id))
    ) {
      throw new TeamStaySupportCommandNotFoundError();
    }
    return replay.rows[0].response_payload;
  }

  const target = await resolveTargetForUpdate(client, command);
  if (!(await propertyIsAuthorized(client, authority, target.property_id))) {
    throw new TeamStaySupportCommandNotFoundError();
  }
  if (target.version !== command.expectedVersion) {
    throw new TeamStaySupportCommandConflictError();
  }
  let supportStatusAfter;
  try {
    supportStatusAfter = resolveTeamStaySupportCommandTransition(
      command.type,
      target.status,
    );
  } catch {
    throw new TeamStaySupportCommandConflictError();
  }

  const supportVersionAfter = target.version + 1;
  const recordedAt = now.toISOString();
  const response: TeamStaySupportCommandResult = {
    schema: CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT.schema,
    version: CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT.version,
    status: "persisted",
    command: command.type,
    publicSupportReference: target.public_reference,
    supportStatus: supportStatusAfter,
    supportVersion: supportVersionAfter,
    updatedAt: recordedAt,
    recordedAt,
    reconcileState: "team_stay_support_command_receipt_persisted",
    ...teamStaySupportCommandDeniedAuthorities(),
  };
  const receiptId = `clubs-team-stay-support-command_${randomUUID()}`;
  const receiptHash = sha256(
    JSON.stringify({
      receiptId,
      requestHash,
      propertyId: target.property_id,
      response,
      recordedAt,
    }),
  );

  const update = await client.query(
    `update crays_core.clubs_member_support_cases
        set status=$2,version=$3,updated_at=$4
      where public_reference=$1 and property_id=$5
        and status=$6 and version=$7`,
    [
      target.public_reference,
      supportStatusAfter,
      supportVersionAfter,
      recordedAt,
      target.property_id,
      target.status,
      target.version,
    ],
  );
  if (update.rowCount !== 1) {
    throw new TeamStaySupportCommandConflictError();
  }

  await client.query(
    `insert into crays_core.clubs_team_stay_support_command_receipts (
       organization_id,command_receipt_id,public_support_reference,
       property_id,actor_account_id,actor_role,tenant_session_id,command_type,
       support_status_before,support_status_after,support_version_before,
       support_version_after,idempotency_key,request_sha256,response_payload,
       recorded_at,command_receipt_sha256
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,
       $16,$17)`,
    [
      authority.organizationId,
      receiptId,
      target.public_reference,
      target.property_id,
      authority.accountId,
      authority.roleKey,
      authority.tenantSessionId,
      command.type,
      target.status,
      supportStatusAfter,
      target.version,
      supportVersionAfter,
      idempotencyKey,
      requestHash,
      JSON.stringify(response),
      recordedAt,
      receiptHash,
    ],
  );
  return response;
}

export async function reconcileTeamStaySupportCommandWithClient(
  client: TeamStaySupportCommandClient,
  authority: TeamStaySupportCommandAuthority,
  idempotencyKey: string,
): Promise<TeamStaySupportCommandResult> {
  validateAuthority(authority);
  validateIdempotencyKey(idempotencyKey);
  await setCoreTenantRole(client, authority.organizationId);
  const replay = await findReplay(client, authority, idempotencyKey);
  if (replay.rows.length === 0) {
    throw new TeamStaySupportCommandNotFoundError();
  }
  if (replay.rows.length !== 1) {
    throw new TeamStaySupportCommandConflictError();
  }
  if (!(await propertyIsAuthorized(client, authority, replay.rows[0].property_id))) {
    throw new TeamStaySupportCommandNotFoundError();
  }
  return replay.rows[0].response_payload;
}

async function inTransaction<Result>(
  pool: TeamStaySupportCommandPool,
  readOnly: boolean,
  operation: (client: TeamStaySupportCommandClient) => Promise<Result>,
) {
  const client = await pool.connect();
  try {
    await client.query(readOnly ? "begin read only" : "begin");
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function executeTeamStaySupportCommand(
  authority: TeamStaySupportCommandAuthority,
  idempotencyKey: string,
  command: TeamStaySupportCommand,
) {
  return inTransaction(getCorePgPool(), false, (client) =>
    executeTeamStaySupportCommandWithClient(
      client,
      authority,
      idempotencyKey,
      command,
    ),
  );
}

export async function reconcileTeamStaySupportCommand(
  authority: TeamStaySupportCommandAuthority,
  idempotencyKey: string,
) {
  return inTransaction(getCorePgPool(), true, (client) =>
    reconcileTeamStaySupportCommandWithClient(client, authority, idempotencyKey),
  );
}

export const teamStaySupportCommandRepositoryTestApi = {
  requestSha256,
  validateAuthority,
  validateCommand,
};
