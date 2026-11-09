import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getCorePgPool } from "@/db/client";
import {
  CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT,
  type ClubsTeamPropertyAdmissionActor,
  type ClubsTeamPropertyAdmissionCommand,
} from "@/lib/clubs/team-property-admission-contract";

export type ClubsTeamPropertyAdmissionClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
};

export type ClubsTeamPropertyAdmissionPool = {
  connect(): Promise<ClubsTeamPropertyAdmissionClient & { release(): void }>;
};

type ScopeRow = {
  property_id: "property-clubs-forest-city-marina";
  store_id: string;
  tenant_id: string;
  operator_legal_entity_id: string;
  assignment_id: string;
  assignment_version: number | string;
  admission_policy_version: string;
};

type ReplayRow = ScopeRow & {
  command_type: ClubsTeamPropertyAdmissionCommand["type"];
  request_sha256: string;
  response_payload: Record<string, unknown>;
};

type GrantRow = {
  grant_id: string;
  grant_version: number | string;
  valid_from: string | Date;
  valid_until: string | Date | null;
};

export class ClubsTeamPropertyAdmissionValidationError extends Error {
  constructor() {
    super("Clubs team Property Admission validation failed");
    this.name = "ClubsTeamPropertyAdmissionValidationError";
  }
}

export class ClubsTeamPropertyAdmissionAuthorityError extends Error {
  constructor() {
    super("Clubs team Property Admission authority denied");
    this.name = "ClubsTeamPropertyAdmissionAuthorityError";
  }
}

export class ClubsTeamPropertyAdmissionScopeNotReadyError extends Error {
  constructor() {
    super("Forest City commercial Property scope is not ready");
    this.name = "ClubsTeamPropertyAdmissionScopeNotReadyError";
  }
}

export class ClubsTeamPropertyAdmissionMembershipRequiredError extends Error {
  constructor() {
    super("Confirmed Clubs Membership is required");
    this.name = "ClubsTeamPropertyAdmissionMembershipRequiredError";
  }
}

export class ClubsTeamPropertyAdmissionNotFoundError extends Error {
  constructor() {
    super("Clubs Property Admission Grant not found");
    this.name = "ClubsTeamPropertyAdmissionNotFoundError";
  }
}

export class ClubsTeamPropertyAdmissionReplayConflictError extends Error {
  constructor() {
    super("Clubs Property Admission replay conflict");
    this.name = "ClubsTeamPropertyAdmissionReplayConflictError";
  }
}

export class ClubsTeamPropertyAdmissionStateConflictError extends Error {
  constructor() {
    super("Clubs Property Admission state conflict");
    this.name = "ClubsTeamPropertyAdmissionStateConflictError";
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function iso(value: string | Date | null) {
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new ClubsTeamPropertyAdmissionValidationError();
  }
  return date.toISOString();
}

function validateActor(actor: ClubsTeamPropertyAdmissionActor, now: Date) {
  const authenticatedAt = new Date(actor.authenticatedAt);
  const ageMs = now.getTime() - authenticatedAt.getTime();
  if (
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.accountId) ||
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.organizationId) ||
    !CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT.allowedRoles.includes(actor.role) ||
    !CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT.assurance.allowed.includes(
      actor.assuranceLevel,
    ) ||
    actor.authoritySource !== "auth0-crays-session" ||
    !Number.isFinite(authenticatedAt.getTime()) ||
    ageMs < -5_000 ||
    ageMs >
      CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT.assurance.maximumAgeSeconds * 1_000
  ) {
    throw new ClubsTeamPropertyAdmissionAuthorityError();
  }
}

function validateIdempotencyKey(idempotencyKey: string) {
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(idempotencyKey)) {
    throw new ClubsTeamPropertyAdmissionValidationError();
  }
}

function validateCommand(
  command: ClubsTeamPropertyAdmissionCommand,
  now: Date,
) {
  if (
    command.propertyId !== "property-clubs-forest-city-marina" ||
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(command.memberAccountId)
  ) {
    throw new ClubsTeamPropertyAdmissionValidationError();
  }
  if (command.type === "grant_access") {
    if (
      command.expectedGrantVersion !== 0 ||
      command.reasonCode !== "membership_and_marina_access_approved"
    ) {
      throw new ClubsTeamPropertyAdmissionValidationError();
    }
    if (command.validUntil !== null) {
      const until = new Date(command.validUntil);
      const duration = until.getTime() - now.getTime();
      if (
        !Number.isFinite(until.getTime()) ||
        duration <= 0 ||
        duration > 366 * 86_400_000
      ) {
        throw new ClubsTeamPropertyAdmissionValidationError();
      }
    }
    return;
  }
  if (
    !/^clubs-property-admission_[0-9a-f-]{36}$/.test(command.grantId) ||
    !Number.isInteger(command.expectedGrantVersion) ||
    command.expectedGrantVersion < 1 ||
    command.reasonCode !== "marina_access_revoked"
  ) {
    throw new ClubsTeamPropertyAdmissionValidationError();
  }
}

async function assertActorAuthority(
  client: ClubsTeamPropertyAdmissionClient,
  actor: ClubsTeamPropertyAdmissionActor,
) {
  const result = await client.query<{ allowed: boolean }>(
    `select true allowed
       from crays_core.crays_accounts account
       join crays_core.organization_memberships membership
         on membership.account_id=account.account_id
        and membership.organization_id=$2
        and membership.role_key=$3
        and membership.status='active'
       join crays_core.role_assignments assignment
         on assignment.account_id=account.account_id
        and assignment.organization_id=membership.organization_id
        and assignment.role_key=membership.role_key
        and assignment.status='active'
        and assignment.nostr_binding_status in ('verified','system_attested')
       join crays_core.organizations organization
         on organization.organization_id=membership.organization_id
        and organization.organization_type='crays'
        and organization.status='active'
      where account.account_id=$1 and account.status='active'
      limit 1`,
    [actor.accountId, actor.organizationId, actor.role],
  );
  if (!result.rows[0]?.allowed) {
    throw new ClubsTeamPropertyAdmissionAuthorityError();
  }
}

async function resolveScope(
  client: ClubsTeamPropertyAdmissionClient,
  propertyId: "property-clubs-forest-city-marina",
  now: Date,
) {
  const result = await client.query<ScopeRow>(
    `select property.property_id,property.store_id,
            assignment.partner_tenant_id tenant_id,
            assignment.operator_legal_entity_id,
            assignment.assignment_id,
            assignment.version assignment_version,
            property.admission_policy_version
       from crays_core.clubs_properties property
       join crays_core.stores store
         on store.store_id=property.store_id
        and store.vertical_root='clubs' and store.status='active'
       join crays_core.store_operator_assignments assignment
         on assignment.store_id=store.store_id
        and assignment.vertical_root='clubs' and assignment.status='active'
        and assignment.valid_from<=$2::timestamptz
        and (assignment.valid_until is null or assignment.valid_until>$2::timestamptz)
       join crays_core.franchise_operator_tenants tenant
         on tenant.partner_tenant_id=assignment.partner_tenant_id
        and tenant.status='active'
       join crays_core.operator_legal_entities legal
         on legal.legal_entity_id=assignment.operator_legal_entity_id
        and legal.partner_tenant_id=assignment.partner_tenant_id
        and legal.status='active'
      where property.property_id=$1
        and property.lifecycle='published'
        and property.access_mode='property_admission_required'
      order by assignment.version desc
      limit 2`,
    [propertyId, now.toISOString()],
  );
  if (result.rows.length !== 1) {
    throw new ClubsTeamPropertyAdmissionScopeNotReadyError();
  }
  return result.rows[0]!;
}

async function assertMembership(
  client: ClubsTeamPropertyAdmissionClient,
  memberAccountId: string,
  now: Date,
) {
  const result = await client.query<{ membership_id: string }>(
    `select membership.membership_id
       from crays_core.clubs_member_memberships membership
       join crays_core.crays_accounts account
         on account.account_id=membership.account_id and account.status='active'
      where membership.account_id=$1
        and membership.program_key='crays-clubs-membership'
        and membership.status='confirmed'
        and membership.decision_authority_role='CRAYS_TEAM'
        and membership.valid_from<=$2::timestamptz
        and (membership.valid_until is null or membership.valid_until>$2::timestamptz)
      limit 2`,
    [memberAccountId, now.toISOString()],
  );
  if (result.rows.length !== 1) {
    throw new ClubsTeamPropertyAdmissionMembershipRequiredError();
  }
  return result.rows[0]!.membership_id;
}

function requestSha256(
  actor: ClubsTeamPropertyAdmissionActor,
  command: ClubsTeamPropertyAdmissionCommand,
) {
  return sha256(
    JSON.stringify({
      schema: CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT.schema,
      version: CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT.version,
      actor: {
        accountId: actor.accountId,
        organizationId: actor.organizationId,
        role: actor.role,
      },
      command,
    }),
  );
}

async function activeGrants(
  client: ClubsTeamPropertyAdmissionClient,
  scope: ScopeRow,
  memberAccountId: string,
  now: Date,
) {
  return client.query<GrantRow>(
    `with latest as (
       select distinct on (candidate.grant_id) candidate.*
         from crays_core.clubs_property_admission_grants candidate
        where candidate.tenant_id=$1 and candidate.property_id=$2
          and candidate.account_id=$3 and candidate.store_id=$4
          and candidate.operator_legal_entity_id=$5
          and candidate.assignment_id=$6 and candidate.assignment_version=$7
          and candidate.policy_version=$8
        order by candidate.grant_id,candidate.grant_version desc
     )
     select candidate.grant_id,candidate.grant_version,
            candidate.valid_from,candidate.valid_until
       from latest candidate
      where candidate.valid_from<=$9::timestamptz
        and (candidate.valid_until is null or candidate.valid_until>$9::timestamptz)
        and exists (
          select 1 from crays_core.clubs_property_admission_grant_events event
           where event.grant_id=candidate.grant_id
             and event.grant_version=candidate.grant_version
             and event.event_type='GRANTED'
             and event.effective_at<=$9::timestamptz
        )
        and not exists (
          select 1 from crays_core.clubs_property_admission_grant_events event
           where event.grant_id=candidate.grant_id
             and event.grant_version=candidate.grant_version
             and event.event_type='REVOKED'
             and event.effective_at<=$9::timestamptz
        )
      order by candidate.grant_id
      limit 2`,
    [
      scope.tenant_id,
      scope.property_id,
      memberAccountId,
      scope.store_id,
      scope.operator_legal_entity_id,
      scope.assignment_id,
      Number(scope.assignment_version),
      scope.admission_policy_version,
      now.toISOString(),
    ],
  );
}

export async function executeClubsTeamPropertyAdmissionWithClient(
  client: ClubsTeamPropertyAdmissionClient,
  actor: ClubsTeamPropertyAdmissionActor,
  idempotencyKey: string,
  command: ClubsTeamPropertyAdmissionCommand,
  now = new Date(),
) {
  validateActor(actor, now);
  validateIdempotencyKey(idempotencyKey);
  validateCommand(command, now);
  await assertActorAuthority(client, actor);
  const scope = await resolveScope(client, command.propertyId, now);
  await client.query(
    `select set_config('crays.app_role','core_service',true),
            set_config('crays.tenant_id',$1,true)`,
    [scope.tenant_id],
  );
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    `clubs-property-admission:${command.propertyId}:${command.memberAccountId}`,
  ]);
  const membershipId = await assertMembership(
    client,
    command.memberAccountId,
    now,
  );
  const requestHash = requestSha256(actor, command);
  const replay = await client.query<ReplayRow>(
    `select receipt.command_type,receipt.request_sha256,
            receipt.response_payload,receipt.property_id,receipt.store_id,
            receipt.tenant_id,receipt.operator_legal_entity_id,
            receipt.assignment_id,receipt.assignment_version,
            property.admission_policy_version
       from crays_core.clubs_property_admission_command_receipts receipt
       join crays_core.clubs_properties property
         on property.property_id=receipt.property_id
      where receipt.actor_account_id=$1 and receipt.idempotency_key=$2
      limit 1`,
    [actor.accountId, idempotencyKey],
  );
  if (replay.rows[0]) {
    const prior = replay.rows[0];
    if (
      prior.command_type !== command.type ||
      prior.request_sha256 !== requestHash ||
      prior.property_id !== scope.property_id ||
      prior.store_id !== scope.store_id ||
      prior.tenant_id !== scope.tenant_id ||
      prior.operator_legal_entity_id !== scope.operator_legal_entity_id ||
      prior.assignment_id !== scope.assignment_id ||
      Number(prior.assignment_version) !== Number(scope.assignment_version) ||
      prior.admission_policy_version !== scope.admission_policy_version
    ) {
      throw new ClubsTeamPropertyAdmissionReplayConflictError();
    }
    return prior.response_payload;
  }

  const current = await activeGrants(
    client,
    scope,
    command.memberAccountId,
    now,
  );
  if (current.rows.length > 1) {
    throw new ClubsTeamPropertyAdmissionAuthorityError();
  }

  let grant: GrantRow;
  let eventId: string;
  if (command.type === "grant_access") {
    if (current.rows.length !== 0) {
      throw new ClubsTeamPropertyAdmissionStateConflictError();
    }
    const grantId = `clubs-property-admission_${randomUUID()}`;
    const validFrom = now.toISOString();
    const validUntil = command.validUntil
      ? new Date(command.validUntil).toISOString()
      : null;
    await client.query(
      `insert into crays_core.clubs_property_admission_grants
        (grant_id,grant_version,tenant_id,property_id,account_id,store_id,
         operator_legal_entity_id,assignment_id,assignment_version,
         valid_from,valid_until,policy_version,grant_sha256)
       select $1,1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
              crays_core.cpa38_grant_sha(
                $1,1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,null
              )`,
      [
        grantId,
        scope.tenant_id,
        scope.property_id,
        command.memberAccountId,
        scope.store_id,
        scope.operator_legal_entity_id,
        scope.assignment_id,
        Number(scope.assignment_version),
        validFrom,
        validUntil,
        scope.admission_policy_version,
      ],
    );
    eventId = `clubs-property-admission-event_${randomUUID()}`;
    await client.query(
      `insert into crays_core.clubs_property_admission_grant_events
        (event_id,grant_id,grant_version,tenant_id,property_id,account_id,
         store_id,operator_legal_entity_id,event_type,effective_at,
         policy_version,event_sha256)
       select $1,$2,1,$3,$4,$5,$6,$7,'GRANTED',$8,$9,
              crays_core.cpa38_event_sha(
                $1,$2,1,$3,$4,$5,$6,$7,'GRANTED',$8,$9
              )`,
      [
        eventId,
        grantId,
        scope.tenant_id,
        scope.property_id,
        command.memberAccountId,
        scope.store_id,
        scope.operator_legal_entity_id,
        validFrom,
        scope.admission_policy_version,
      ],
    );
    grant = {
      grant_id: grantId,
      grant_version: 1,
      valid_from: validFrom,
      valid_until: validUntil,
    };
  } else {
    const currentGrant = current.rows[0];
    if (
      !currentGrant ||
      currentGrant.grant_id !== command.grantId ||
      Number(currentGrant.grant_version) !== command.expectedGrantVersion
    ) {
      throw new ClubsTeamPropertyAdmissionNotFoundError();
    }
    eventId = `clubs-property-admission-event_${randomUUID()}`;
    await client.query(
      `insert into crays_core.clubs_property_admission_grant_events
        (event_id,grant_id,grant_version,tenant_id,property_id,account_id,
         store_id,operator_legal_entity_id,event_type,effective_at,
         policy_version,event_sha256)
       select $1,$2,$3,$4,$5,$6,$7,$8,'REVOKED',$9,$10,
              crays_core.cpa38_event_sha(
                $1,$2,$3,$4,$5,$6,$7,$8,'REVOKED',$9,$10
              )`,
      [
        eventId,
        currentGrant.grant_id,
        Number(currentGrant.grant_version),
        scope.tenant_id,
        scope.property_id,
        command.memberAccountId,
        scope.store_id,
        scope.operator_legal_entity_id,
        now.toISOString(),
        scope.admission_policy_version,
      ],
    );
    grant = currentGrant;
  }

  const commandReceiptId = `clubs-property-admission-command_${randomUUID()}`;
  const response = {
    schema: CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT.schema,
    version: CLUBS_TEAM_PROPERTY_ADMISSION_CONTRACT.version,
    status: "persisted" as const,
    outcome:
      command.type === "grant_access"
        ? ("property_access_granted" as const)
        : ("property_access_revoked" as const),
    commandReceiptId,
    propertyId: scope.property_id,
    memberAccountId: command.memberAccountId,
    membershipId,
    grantId: grant.grant_id,
    grantVersion: Number(grant.grant_version),
    validFrom: iso(grant.valid_from),
    validUntil: iso(grant.valid_until),
    effectiveAt: now.toISOString(),
    propertyAccess: command.type === "grant_access",
    availabilityAuthority: false,
    quoteAuthority: false,
    bookingAuthority: false,
    paymentAuthority: false,
  };
  const commandHash = sha256(
    JSON.stringify({
      commandReceiptId,
      actor,
      scope,
      command,
      response,
      requestSha256: requestHash,
    }),
  );
  await client.query(
    `insert into crays_core.clubs_property_admission_command_receipts
      (command_receipt_id,actor_account_id,actor_organization_id,actor_role,
       member_account_id,property_id,tenant_id,store_id,
       operator_legal_entity_id,assignment_id,assignment_version,
       command_type,grant_id,grant_version,valid_from,valid_until,
       effective_at,reason_code,idempotency_key,request_sha256,
       response_payload,assurance_level,authenticated_at,executed_at,
       command_sha256)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
             $17,$18,$19,$20,$21::jsonb,$22,$23,$24,$25)`,
    [
      commandReceiptId,
      actor.accountId,
      actor.organizationId,
      actor.role,
      command.memberAccountId,
      scope.property_id,
      scope.tenant_id,
      scope.store_id,
      scope.operator_legal_entity_id,
      scope.assignment_id,
      Number(scope.assignment_version),
      command.type,
      grant.grant_id,
      Number(grant.grant_version),
      iso(grant.valid_from),
      iso(grant.valid_until),
      now.toISOString(),
      command.reasonCode,
      idempotencyKey,
      requestHash,
      JSON.stringify(response),
      actor.assuranceLevel,
      actor.authenticatedAt,
      now.toISOString(),
      commandHash,
    ],
  );
  return response;
}

export async function executeClubsTeamPropertyAdmissionWithPool(
  pool: ClubsTeamPropertyAdmissionPool,
  actor: ClubsTeamPropertyAdmissionActor,
  idempotencyKey: string,
  command: ClubsTeamPropertyAdmissionCommand,
  now = new Date(),
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await executeClubsTeamPropertyAdmissionWithClient(
      client,
      actor,
      idempotencyKey,
      command,
      now,
    );
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function executeClubsTeamPropertyAdmission(
  actor: ClubsTeamPropertyAdmissionActor,
  idempotencyKey: string,
  command: ClubsTeamPropertyAdmissionCommand,
) {
  return executeClubsTeamPropertyAdmissionWithPool(
    getCorePgPool(),
    actor,
    idempotencyKey,
    command,
  );
}
