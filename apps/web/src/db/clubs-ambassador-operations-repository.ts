import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getCorePgPool } from "@/db/client";
import {
  CLUBS_AMBASSADOR_OPERATIONS_CONTRACT,
  CLUBS_FOUNDER_CORE_BOOTSTRAP_PROFILES,
  reconcileClubsFounderCoreBootstrapStatus,
  type ClubsFounderCoreBootstrapSignals,
  type ClubsAmbassadorOperationsActor,
  type ClubsAmbassadorOperationsCommand,
  type ClubsAmbassadorOperationalRole,
} from "@/lib/clubs/ambassador-operations-contract";

export type ClubsAmbassadorOperationsClient = {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
};

export type ClubsAmbassadorOperationsPool = {
  connect(): Promise<ClubsAmbassadorOperationsClient & { release(): void }>;
};

type RegistryRow = {
  registry_event_id: string;
  ambassador_profile_id: string;
  organization_id: string;
  event_version: number;
  event_type: "created" | "edited" | "deactivated";
  status?: "active" | "inactive";
  display_name: string;
  region_label: string;
  operational_roles: ClubsAmbassadorOperationalRole[];
  reviewer_binding_id: string | null;
  reviewer_binding_state?: "not_bound" | "ready" | "revoked" | "not_ready" | "expired";
  review_authority_derived?: false;
  occurred_at: string | Date;
};

type AssignmentRow = {
  assignment_event_id: string | null;
  application_id: string;
  application_status: string;
  application_version: number;
  submitted_at: string | Date;
  assignment_version: number | null;
  assignment_status: "assigned" | "unassigned" | null;
  ambassador_profile_id: string | null;
  reviewer_binding_id: string | null;
  review_authority_derived: false | null;
  team_go_authority_derived: false | null;
  membership_authority_derived: false | null;
  admission_authority_derived: false | null;
  occurred_at: string | Date | null;
};

type ReplayRow = {
  command_type: ClubsAmbassadorOperationsCommand["type"];
  request_sha256: string;
  response_payload: Record<string, unknown>;
};

type ApplicationRow = {
  application_id: string;
  status: string;
  version: number;
};

type AuditRow = {
  ledger: "registry" | "assignment";
  event_id: string;
  subject_id: string;
  event_type: string;
  actor_account_id: string;
  actor_role: "crays-management" | "admin";
  reason_code: string;
  occurred_at: string | Date;
};

type FounderCoreBootstrapRow = {
  public_ambassador_slug: string;
  display_name: string;
  pre_registration_ready: boolean;
  real_login_bound: boolean;
  activation_pass: boolean;
  full_active: boolean;
  account_active: boolean;
};

export class ClubsAmbassadorOperationsValidationError extends Error {
  constructor() {
    super("Clubs Ambassador Operations validation failed");
    this.name = "ClubsAmbassadorOperationsValidationError";
  }
}

export class ClubsAmbassadorOperationsAuthorityError extends Error {
  constructor() {
    super("Clubs Ambassador Operations authority denied");
    this.name = "ClubsAmbassadorOperationsAuthorityError";
  }
}

export class ClubsAmbassadorOperationsNotFoundError extends Error {
  constructor() {
    super("Clubs Ambassador Operations record not found");
    this.name = "ClubsAmbassadorOperationsNotFoundError";
  }
}

export class ClubsAmbassadorOperationsReplayConflictError extends Error {
  constructor() {
    super("Clubs Ambassador Operations idempotency replay conflict");
    this.name = "ClubsAmbassadorOperationsReplayConflictError";
  }
}

export class ClubsAmbassadorOperationsStateConflictError extends Error {
  constructor() {
    super("Clubs Ambassador Operations state conflict");
    this.name = "ClubsAmbassadorOperationsStateConflictError";
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function iso(value: string | Date | null) {
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new ClubsAmbassadorOperationsValidationError();
  }
  return date.toISOString();
}

function validateActor(actor: ClubsAmbassadorOperationsActor, now: Date) {
  if (
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.accountId) ||
    !/^[A-Za-z0-9:_.-]{3,180}$/.test(actor.organizationId) ||
    !CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.allowedActorRoles.includes(actor.role) ||
    !CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.assurance.allowed.includes(
      actor.assuranceLevel,
    ) ||
    actor.authoritySource !== "auth0-crays-session"
  ) {
    throw new ClubsAmbassadorOperationsAuthorityError();
  }
  const authenticatedAt = new Date(actor.authenticatedAt);
  const ageMs = now.getTime() - authenticatedAt.getTime();
  if (
    !Number.isFinite(authenticatedAt.getTime()) ||
    ageMs < -5_000 ||
    ageMs >
      CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.assurance.maximumAgeSeconds * 1_000
  ) {
    throw new ClubsAmbassadorOperationsAuthorityError();
  }
}

function validateIdempotencyKey(value: string) {
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(value)) {
    throw new ClubsAmbassadorOperationsValidationError();
  }
}

function validateProfileId(value: string) {
  if (!/^ambassador_profile_[a-z0-9_-]{3,100}$/.test(value)) {
    throw new ClubsAmbassadorOperationsValidationError();
  }
}

function validateRegistryDetails(
  command: Extract<
    ClubsAmbassadorOperationsCommand,
    { type: "create_ambassador" | "edit_ambassador" }
  >,
) {
  const roles = [...new Set(command.operationalRoles)];
  if (
    command.displayName.trim().length < 2 ||
    command.displayName.trim().length > 120 ||
    command.regionLabel.trim().length < 2 ||
    command.regionLabel.trim().length > 120 ||
    roles.length !== command.operationalRoles.length ||
    roles.length < 1 ||
    roles.length > 4 ||
    roles.some(
      (role) =>
        !CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.operationalRoles.includes(role),
    ) ||
    (command.reviewerBindingId !== null &&
      !/^clubs-direct-membership-reviewer-binding_[0-9a-f-]{36}$/.test(
        command.reviewerBindingId,
      ))
  ) {
    throw new ClubsAmbassadorOperationsValidationError();
  }
}

function validateCommand(command: ClubsAmbassadorOperationsCommand) {
  if ("ambassadorProfileId" in command && command.ambassadorProfileId) {
    validateProfileId(command.ambassadorProfileId);
  }
  if (command.type === "create_ambassador" || command.type === "edit_ambassador") {
    validateRegistryDetails(command);
  }
  if (
    "expectedVersion" in command &&
    (!Number.isInteger(command.expectedVersion) || command.expectedVersion < 1)
  ) {
    throw new ClubsAmbassadorOperationsValidationError();
  }
  if ("applicationId" in command) {
    if (
      !/^clubs-booking-membership-application_[0-9a-f-]{36}$/.test(
        command.applicationId,
      ) ||
      !Number.isInteger(command.expectedAssignmentVersion) ||
      command.expectedAssignmentVersion < 0
    ) {
      throw new ClubsAmbassadorOperationsValidationError();
    }
  }
}

async function setCoreServiceRole(client: ClubsAmbassadorOperationsClient) {
  await client.query("select set_config('crays.app_role','core_service',true)");
}

async function assertActorAuthority(
  client: ClubsAmbassadorOperationsClient,
  actor: ClubsAmbassadorOperationsActor,
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
    throw new ClubsAmbassadorOperationsAuthorityError();
  }
}

async function readRegistry(
  client: ClubsAmbassadorOperationsClient,
  actor: ClubsAmbassadorOperationsActor,
) {
  const result = await client.query<RegistryRow>(
    `select registry_event_id,ambassador_profile_id,organization_id,event_version,
            status,display_name,region_label,operational_roles,reviewer_binding_id,
            reviewer_binding_state,review_authority_derived,occurred_at
       from crays_core.clubs_ambassador_registry_current
      where organization_id=$1
      order by case status when 'active' then 1 else 2 end,display_name
      limit 200`,
    [actor.organizationId],
  );
  return result.rows.map((row) => ({
    ambassadorProfileId: row.ambassador_profile_id,
    organizationId: row.organization_id,
    version: row.event_version,
    status: row.status ?? "inactive",
    displayName: row.display_name,
    regionLabel: row.region_label,
    operationalRoles: row.operational_roles,
    reviewerBindingId: row.reviewer_binding_id,
    reviewerBindingState: row.reviewer_binding_state ?? "not_bound",
    reviewAuthorityDerived: false as const,
    updatedAt: iso(row.occurred_at)!,
  }));
}

async function readApplications(
  client: ClubsAmbassadorOperationsClient,
  actor: ClubsAmbassadorOperationsActor,
) {
  const result = await client.query<AssignmentRow>(
    `select assignment.assignment_event_id,application.application_id,
            application.status application_status,application.version application_version,
            application.submitted_at,assignment.assignment_version,
            assignment.status assignment_status,assignment.ambassador_profile_id,
            assignment.reviewer_binding_id,assignment.review_authority_derived,
            assignment.team_go_authority_derived,
            assignment.membership_authority_derived,
            assignment.admission_authority_derived,assignment.occurred_at
       from crays_core.clubs_booking_membership_direct_applications application
       left join crays_core.clubs_application_assignments_current assignment
         on assignment.application_id=application.application_id
        and assignment.organization_id=$1
      where application.status not in (
        'approved_for_membership_payment','declined','withdrawn'
      )
      order by application.submitted_at desc
      limit 200`,
    [actor.organizationId],
  );
  return result.rows.map((row) => ({
    applicationId: row.application_id,
    applicationStatus: row.application_status,
    applicationVersion: row.application_version,
    submittedAt: iso(row.submitted_at)!,
    assignmentVersion: row.assignment_version ?? 0,
    assignmentStatus: row.assignment_status ?? ("unassigned" as const),
    ambassadorProfileId: row.ambassador_profile_id,
    reviewerBindingId: row.reviewer_binding_id,
    reviewAuthorityDerived: false as const,
    teamGoAuthorityDerived: false as const,
    membershipAuthorityDerived: false as const,
    admissionAuthorityDerived: false as const,
    assignedAt: iso(row.occurred_at),
  }));
}

async function readAudit(
  client: ClubsAmbassadorOperationsClient,
  actor: ClubsAmbassadorOperationsActor,
) {
  const result = await client.query<AuditRow>(
    `select * from (
       select 'registry'::text ledger,registry_event_id event_id,
              ambassador_profile_id subject_id,event_type,actor_account_id,
              actor_role,reason_code,occurred_at
         from crays_core.clubs_ambassador_registry_events
        where organization_id=$1
       union all
       select 'assignment'::text ledger,assignment_event_id event_id,
              application_id subject_id,event_type,actor_account_id,
              actor_role,reason_code,occurred_at
         from crays_core.clubs_application_assignment_events
        where organization_id=$1
     ) audit
     order by occurred_at desc
     limit 200`,
    [actor.organizationId],
  );
  return result.rows.map((row) => ({
    ledger: row.ledger,
    eventId: row.event_id,
    subjectId: row.subject_id,
    eventType: row.event_type,
    actorAccountId: row.actor_account_id,
    actorRole: row.actor_role,
    reasonCode: row.reason_code,
    occurredAt: iso(row.occurred_at)!,
  }));
}

async function readFounderCoreBootstrap(
  client: ClubsAmbassadorOperationsClient,
  actor: ClubsAmbassadorOperationsActor,
) {
  const slugs = CLUBS_FOUNDER_CORE_BOOTSTRAP_PROFILES.map(
    (profile) => profile.publicAmbassadorSlug,
  );
  const displayNames = CLUBS_FOUNDER_CORE_BOOTSTRAP_PROFILES.map(
    (profile) => profile.displayName,
  );
  const result = await client.query<FounderCoreBootstrapRow>(
    `with founder_core as (
       select profile.public_ambassador_slug,profile.display_name,profile.ordinal
         from unnest($2::text[],$3::text[]) with ordinality
           as profile(public_ambassador_slug,display_name,ordinal)
     )
     select founder.public_ambassador_slug,founder.display_name,
            (prereg.pre_registration_event_id is not null) pre_registration_ready,
            (binding.account_binding_receipt_id is not null) real_login_bound,
            (activation.activation_pass_receipt_id is not null) activation_pass,
            (issue.entitlement_issue_receipt_id is not null
              and account.account_id is not null
              and session.session_id is not null
              and membership.account_id is not null
              and assignment.account_id is not null
              and organization.organization_id is not null
              and registry.ambassador_profile_id is not null) full_active,
            (account.account_id is not null) account_active
       from founder_core founder
       left join crays_core.clubs_ambassador_pre_registrations_current prereg
         on prereg.public_ambassador_slug=founder.public_ambassador_slug
        and prereg.organization_id=$1
        and prereg.lifecycle_state='pre_registered'
       left join crays_core.clubs_ambassador_activation_pass_receipts activation
         on activation.pre_registration_event_id=prereg.pre_registration_event_id
        and activation.public_ambassador_slug=founder.public_ambassador_slug
        and activation.result='activation_match_passed'
        and activation.exact_match=true
        and activation.b2c_rejected=true
       left join crays_core.clubs_ambassador_entitlement_issue_receipts issue
         on issue.activation_pass_receipt_id=activation.activation_pass_receipt_id
        and issue.public_ambassador_slug=founder.public_ambassador_slug
        and issue.entitlement_key='CLUBS_SAAS_FULL_ACCESS'
        and issue.exact_active_account_binding=true
        and issue.exact_subject_binding=true
        and issue.account_active_at_issue=true
        and issue.entitlement_active=true
       left join crays_core.clubs_ambassador_b2b_entitlement_account_receipts binding
         on binding.entitlement_issue_receipt_id=issue.entitlement_issue_receipt_id
        and binding.activation_pass_receipt_id=activation.activation_pass_receipt_id
        and binding.public_ambassador_slug=founder.public_ambassador_slug
        and binding.organization_id=$1
        and binding.entitlement_key='CLUBS_SAAS_FULL_ACCESS'
        and binding.exact_activation_pass_binding=true
        and binding.exact_subject_binding=true
        and binding.exact_active_account_binding=true
        and binding.exact_active_tenant_binding=true
        and binding.b2c_rejected=true
        and binding.account_active=true
        and binding.entitlement_active=true
       left join crays_core.crays_accounts account
         on account.account_id=binding.account_id
        and account.status='active'
       left join crays_core.tenant_sessions session
         on session.session_id=binding.tenant_session_id
        and session.account_id=binding.account_id
        and session.organization_id=binding.organization_id
        and session.status='active'
        and session.expires_at>now()
        and session.account_security_version=account.security_version
       left join crays_core.organization_memberships membership
         on membership.account_id=binding.account_id
        and membership.organization_id=binding.organization_id
        and membership.role_key=session.role_key
        and membership.status='active'
       left join crays_core.role_assignments assignment
         on assignment.account_id=membership.account_id
        and assignment.organization_id=membership.organization_id
        and assignment.role_key=membership.role_key
        and assignment.status='active'
        and assignment.nostr_binding_status in ('verified','system_attested')
       left join crays_core.organizations organization
         on organization.organization_id=binding.organization_id
        and organization.organization_type='crays'
        and organization.status='active'
       left join crays_core.clubs_ambassador_registry_current registry
         on registry.ambassador_profile_id=binding.ambassador_profile_id
        and registry.organization_id=binding.organization_id
        and registry.status='active'
      order by founder.ordinal`,
    [actor.organizationId, slugs, displayNames],
  );
  return reconcileClubsFounderCoreBootstrapStatus(
    result.rows.map(
      (row): ClubsFounderCoreBootstrapSignals => ({
        publicAmbassadorSlug:
          row.public_ambassador_slug as ClubsFounderCoreBootstrapSignals["publicAmbassadorSlug"],
        displayName: row.display_name,
        preRegistrationReady: row.pre_registration_ready,
        realLoginBound: row.real_login_bound,
        activationPass: row.activation_pass,
        fullActive: row.full_active,
        accountActive: row.account_active,
      }),
    ),
  );
}

export async function readClubsAmbassadorOperationsWithClient(
  client: ClubsAmbassadorOperationsClient,
  actor: ClubsAmbassadorOperationsActor,
  now = new Date(),
) {
  validateActor(actor, now);
  await assertActorAuthority(client, actor);
  const [registry, founderCoreBootstrap, applications, audit] = await Promise.all([
    readRegistry(client, actor),
    readFounderCoreBootstrap(client, actor),
    readApplications(client, actor),
    readAudit(client, actor),
  ]);
  return {
    schema: CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.schema,
    version: CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.version,
    status: "ready" as const,
    registry,
    founderCoreBootstrap,
    applications,
    audit,
    authorities: {
      registryAdministration: true as const,
      assignmentAdministration: true as const,
      reviewDerived: false as const,
      teamGoDerived: false as const,
      membershipDerived: false as const,
      propertyAdmissionDerived: false as const,
      bookingDerived: false as const,
      paymentDerived: false as const,
    },
  };
}

function requestSha256(
  actor: ClubsAmbassadorOperationsActor,
  command: ClubsAmbassadorOperationsCommand,
) {
  return sha256(
    JSON.stringify({
      schema: CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.schema,
      version: CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.version,
      actor: {
        accountId: actor.accountId,
        organizationId: actor.organizationId,
        role: actor.role,
      },
      command,
    }),
  );
}

async function readReplay(
  client: ClubsAmbassadorOperationsClient,
  actor: ClubsAmbassadorOperationsActor,
  idempotencyKey: string,
) {
  const result = await client.query<ReplayRow>(
    `select command_type,request_sha256,response_payload
       from crays_core.clubs_ambassador_registry_events
      where actor_account_id=$1 and idempotency_key=$2
      union all
     select command_type,request_sha256,response_payload
       from crays_core.clubs_application_assignment_events
      where actor_account_id=$1 and idempotency_key=$2`,
    [actor.accountId, idempotencyKey],
  );
  if (result.rows.length > 1) {
    throw new ClubsAmbassadorOperationsReplayConflictError();
  }
  return result.rows[0] ?? null;
}

async function assertReviewerBindingReady(
  client: ClubsAmbassadorOperationsClient,
  profileId: string,
  bindingId: string | null,
  now: Date,
) {
  if (!bindingId) return;
  const result = await client.query<{ ready: boolean }>(
    `select true ready
       from crays_core.clubs_direct_membership_application_reviewer_bindings binding
       left join crays_core.clubs_direct_membership_application_reviewer_binding_revocations revocation
         on revocation.binding_id=binding.binding_id
      where binding.binding_id=$1
        and binding.reviewer_profile_id=$2
        and binding.valid_from<=$3
        and (binding.expires_at is null or binding.expires_at>$3)
        and revocation.binding_id is null`,
    [bindingId, profileId, now.toISOString()],
  );
  if (!result.rows[0]?.ready) {
    throw new ClubsAmbassadorOperationsStateConflictError();
  }
}

async function executeRegistryCommand(
  client: ClubsAmbassadorOperationsClient,
  actor: ClubsAmbassadorOperationsActor,
  idempotencyKey: string,
  command: Extract<
    ClubsAmbassadorOperationsCommand,
    {
      type:
        | "create_ambassador"
        | "edit_ambassador"
        | "deactivate_ambassador";
    }
  >,
  requestHash: string,
  now: Date,
) {
  const profileId =
    command.type === "create_ambassador"
      ? command.ambassadorProfileId ?? `ambassador_profile_${randomUUID()}`
      : command.ambassadorProfileId;
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    `clubs-ambassador-registry:${profileId}`,
  ]);
  const priorResult = await client.query<RegistryRow>(
    `select registry_event_id,ambassador_profile_id,organization_id,event_version,
            event_type,display_name,region_label,operational_roles,
            reviewer_binding_id,occurred_at
       from crays_core.clubs_ambassador_registry_events
      where ambassador_profile_id=$1
      order by event_version desc
      limit 1
      for update`,
    [profileId],
  );
  const prior = priorResult.rows[0] ?? null;
  if (command.type === "create_ambassador" && prior) {
    throw new ClubsAmbassadorOperationsStateConflictError();
  }
  if (command.type !== "create_ambassador") {
    if (!prior) throw new ClubsAmbassadorOperationsNotFoundError();
    if (
      prior.organization_id !== actor.organizationId ||
      prior.event_type === "deactivated" ||
      prior.event_version !== command.expectedVersion
    ) {
      throw new ClubsAmbassadorOperationsStateConflictError();
    }
  }

  const version = (prior?.event_version ?? 0) + 1;
  const eventType =
    command.type === "create_ambassador"
      ? "created"
      : command.type === "edit_ambassador"
        ? "edited"
        : "deactivated";
  const details =
    command.type === "deactivate_ambassador"
      ? prior!
      : {
          display_name: command.displayName.trim(),
          region_label: command.regionLabel.trim(),
          operational_roles: [...command.operationalRoles].sort(),
          reviewer_binding_id: command.reviewerBindingId,
        };
  await assertReviewerBindingReady(
    client,
    profileId,
    details.reviewer_binding_id,
    now,
  );
  const eventId = `clubs-ambassador-registry-event_${randomUUID()}`;
  const responseBase = {
    schema: CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.schema,
    version: CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.version,
    status: "persisted" as const,
    eventId,
    eventType,
    ambassadorProfileId: profileId,
    registryVersion: version,
    registryStatus: eventType === "deactivated" ? "inactive" : "active",
    reviewerBindingId: details.reviewer_binding_id,
    reviewAuthorityDerived: false as const,
    teamGoAuthorityDerived: false as const,
    membershipAuthorityDerived: false as const,
    admissionAuthorityDerived: false as const,
    beneficiaryOrPayoutAuthorityDerived: false as const,
  };
  const responseSha256 = sha256(JSON.stringify(responseBase));
  const response = { ...responseBase, responseSha256 };
  await client.query(
    `insert into crays_core.clubs_ambassador_registry_events
      (registry_event_id,ambassador_profile_id,organization_id,event_version,
       event_type,display_name,region_label,operational_roles,reviewer_binding_id,
       previous_event_id,actor_account_id,actor_organization_id,actor_role,
       assurance_level,authenticated_at,idempotency_key,command_type,reason_code,
       request_sha256,response_sha256,response_payload,occurred_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$3,$12,$13,$14,$15,$16,$17,
             $18,$19,$20::jsonb,$21)`,
    [
      eventId,
      profileId,
      actor.organizationId,
      version,
      eventType,
      details.display_name,
      details.region_label,
      details.operational_roles,
      details.reviewer_binding_id,
      prior?.registry_event_id ?? null,
      actor.accountId,
      actor.role,
      actor.assuranceLevel,
      actor.authenticatedAt,
      idempotencyKey,
      command.type,
      command.reasonCode,
      requestHash,
      responseSha256,
      JSON.stringify(response),
      now.toISOString(),
    ],
  );
  return response;
}

async function executeAssignmentCommand(
  client: ClubsAmbassadorOperationsClient,
  actor: ClubsAmbassadorOperationsActor,
  idempotencyKey: string,
  command: Extract<
    ClubsAmbassadorOperationsCommand,
    { type: "assign_application" | "unassign_application" }
  >,
  requestHash: string,
  now: Date,
) {
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    `clubs-application-assignment:${command.applicationId}`,
  ]);
  const applicationResult = await client.query<ApplicationRow>(
    `select application_id,status,version
       from crays_core.clubs_booking_membership_direct_applications
      where application_id=$1
      limit 1
      for share`,
    [command.applicationId],
  );
  const application = applicationResult.rows[0];
  if (!application) throw new ClubsAmbassadorOperationsNotFoundError();
  if (
    ["approved_for_membership_payment", "declined", "withdrawn"].includes(
      application.status,
    )
  ) {
    throw new ClubsAmbassadorOperationsStateConflictError();
  }
  const priorResult = await client.query<{
    assignment_event_id: string;
    assignment_version: number;
    ambassador_profile_id: string | null;
  }>(
    `select assignment_event_id,assignment_version,ambassador_profile_id
       from crays_core.clubs_application_assignment_events
      where application_id=$1
      order by assignment_version desc
      limit 1
      for update`,
    [command.applicationId],
  );
  const prior = priorResult.rows[0] ?? null;
  if ((prior?.assignment_version ?? 0) !== command.expectedAssignmentVersion) {
    throw new ClubsAmbassadorOperationsStateConflictError();
  }

  let profileId: string | null = null;
  let reviewerBindingId: string | null = null;
  let eventType: "assigned" | "reassigned" | "unassigned";
  if (command.type === "assign_application") {
    const registryResult = await client.query<RegistryRow>(
      `select registry_event_id,ambassador_profile_id,organization_id,event_version,
              event_type,display_name,region_label,operational_roles,
              reviewer_binding_id,occurred_at
         from crays_core.clubs_ambassador_registry_events
        where ambassador_profile_id=$1
        order by event_version desc
        limit 1
        for share`,
      [command.ambassadorProfileId],
    );
    const registry = registryResult.rows[0];
    if (
      !registry ||
      registry.organization_id !== actor.organizationId ||
      registry.event_type === "deactivated" ||
      prior?.ambassador_profile_id === command.ambassadorProfileId
    ) {
      throw new ClubsAmbassadorOperationsStateConflictError();
    }
    profileId = registry.ambassador_profile_id;
    reviewerBindingId = registry.reviewer_binding_id;
    eventType = prior?.ambassador_profile_id ? "reassigned" : "assigned";
    const requiredReason =
      eventType === "reassigned"
        ? "operations_reassignment"
        : "operations_assignment";
    if (command.reasonCode !== requiredReason) {
      throw new ClubsAmbassadorOperationsValidationError();
    }
  } else {
    if (!prior?.ambassador_profile_id) {
      throw new ClubsAmbassadorOperationsStateConflictError();
    }
    eventType = "unassigned";
  }

  const assignmentVersion = (prior?.assignment_version ?? 0) + 1;
  const eventId = `clubs-application-assignment-event_${randomUUID()}`;
  const responseBase = {
    schema: CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.schema,
    version: CLUBS_AMBASSADOR_OPERATIONS_CONTRACT.version,
    status: "persisted" as const,
    eventId,
    eventType,
    applicationId: command.applicationId,
    applicationVersionObserved: application.version,
    assignmentVersion,
    ambassadorProfileId: profileId,
    reviewerBindingId,
    reviewAuthorityDerived: false as const,
    teamGoAuthorityDerived: false as const,
    membershipAuthorityDerived: false as const,
    admissionAuthorityDerived: false as const,
    bookingAuthorityDerived: false as const,
    paymentAuthorityDerived: false as const,
  };
  const responseSha256 = sha256(JSON.stringify(responseBase));
  const response = { ...responseBase, responseSha256 };
  await client.query(
    `insert into crays_core.clubs_application_assignment_events
      (assignment_event_id,application_id,organization_id,assignment_version,
       event_type,ambassador_profile_id,reviewer_binding_id,
       application_version_observed,previous_event_id,actor_account_id,
       actor_organization_id,actor_role,assurance_level,authenticated_at,
       idempotency_key,command_type,reason_code,request_sha256,response_sha256,
       response_payload,occurred_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$3,$11,$12,$13,$14,$15,$16,
             $17,$18,$19::jsonb,$20)`,
    [
      eventId,
      command.applicationId,
      actor.organizationId,
      assignmentVersion,
      eventType,
      profileId,
      reviewerBindingId,
      application.version,
      prior?.assignment_event_id ?? null,
      actor.accountId,
      actor.role,
      actor.assuranceLevel,
      actor.authenticatedAt,
      idempotencyKey,
      command.type,
      command.reasonCode,
      requestHash,
      responseSha256,
      JSON.stringify(response),
      now.toISOString(),
    ],
  );
  return response;
}

export async function executeClubsAmbassadorOperationsWithClient(
  client: ClubsAmbassadorOperationsClient,
  actor: ClubsAmbassadorOperationsActor,
  idempotencyKey: string,
  command: ClubsAmbassadorOperationsCommand,
  now = new Date(),
) {
  validateActor(actor, now);
  validateIdempotencyKey(idempotencyKey);
  validateCommand(command);
  await assertActorAuthority(client, actor);
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    `clubs-ambassador-operations-idempotency:${actor.accountId}:${idempotencyKey}`,
  ]);
  const requestHash = requestSha256(actor, command);
  const replay = await readReplay(client, actor, idempotencyKey);
  if (replay) {
    if (
      replay.command_type !== command.type ||
      replay.request_sha256 !== requestHash
    ) {
      throw new ClubsAmbassadorOperationsReplayConflictError();
    }
    return replay.response_payload;
  }
  if (
    command.type === "create_ambassador" ||
    command.type === "edit_ambassador" ||
    command.type === "deactivate_ambassador"
  ) {
    return executeRegistryCommand(
      client,
      actor,
      idempotencyKey,
      command,
      requestHash,
      now,
    );
  }
  return executeAssignmentCommand(
    client,
    actor,
    idempotencyKey,
    command,
    requestHash,
    now,
  );
}

async function withTransaction<T>(
  pool: ClubsAmbassadorOperationsPool,
  operation: (client: ClubsAmbassadorOperationsClient) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setCoreServiceRole(client);
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

export async function readClubsAmbassadorOperationsWithPool(
  pool: ClubsAmbassadorOperationsPool,
  actor: ClubsAmbassadorOperationsActor,
) {
  return withTransaction(pool, (client) =>
    readClubsAmbassadorOperationsWithClient(client, actor),
  );
}

export async function executeClubsAmbassadorOperationsWithPool(
  pool: ClubsAmbassadorOperationsPool,
  actor: ClubsAmbassadorOperationsActor,
  idempotencyKey: string,
  command: ClubsAmbassadorOperationsCommand,
) {
  return withTransaction(pool, (client) =>
    executeClubsAmbassadorOperationsWithClient(
      client,
      actor,
      idempotencyKey,
      command,
    ),
  );
}

export async function readClubsAmbassadorOperations(
  actor: ClubsAmbassadorOperationsActor,
) {
  return readClubsAmbassadorOperationsWithPool(getCorePgPool(), actor);
}

export async function executeClubsAmbassadorOperations(
  actor: ClubsAmbassadorOperationsActor,
  idempotencyKey: string,
  command: ClubsAmbassadorOperationsCommand,
) {
  return executeClubsAmbassadorOperationsWithPool(
    getCorePgPool(),
    actor,
    idempotencyKey,
    command,
  );
}
