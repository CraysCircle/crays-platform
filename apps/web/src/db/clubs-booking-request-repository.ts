import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";

type MemberCommand =
  | { type: "submit"; holdId: string }
  | { type: "cancel"; requestId: string; expectedVersion: number; reason: string };

type TeamCommand = {
  type: "begin_review" | "accept" | "reject";
  requestId: string;
  expectedVersion: number;
  reason: string;
};

type Command = MemberCommand | TeamCommand;
type BookingRequestStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "cancelled";

export type BookingRequestReceipt = {
  receiptId: string;
  commandRequestId: string;
  outcome: "applied" | "conflict" | "denied" | "invalid" | "noop";
  reason: string | null;
  bookingRequestId: string | null;
  previousVersion: number | null;
  resultingVersion: number | null;
  resultingStatus: BookingRequestStatus | null;
  replayed: boolean;
};

type RequestRow = {
  booking_request_id: string;
  account_id: string;
  property_id: string;
  unit_id: string;
  quote_snapshot_id: string;
  reservation_hold_id: string;
  status: BookingRequestStatus;
  version: number;
};

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function reference() {
  return `BR-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function validateIdentifier(value: string, label: string) {
  if (!/^[A-Za-z0-9:_.-]{3,180}$/.test(value)) {
    throw new Error(`${label} is invalid.`);
  }
}

function validateCommand(command: Command) {
  if (command.type === "submit") validateIdentifier(command.holdId, "Hold");
  else {
    validateIdentifier(command.requestId, "Booking Request");
    if (!Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 1) {
      throw new Error("Expected Booking Request version is invalid.");
    }
    if (command.reason.trim().length < 3 || command.reason.trim().length > 500) {
      throw new Error("A concise decision reason is required.");
    }
  }
}

async function transaction<T>(run: (client: PoolClient) => Promise<T>) {
  const client = await getCorePgPool().connect();
  try {
    await client.query("begin");
    const value = await run(client);
    await client.query("commit");
    return value;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function appendReceipt(
  client: PoolClient,
  input: Omit<BookingRequestReceipt, "receiptId" | "replayed">,
) {
  const receiptId = id("clubs_booking_request_receipt");
  await client.query(
    `insert into crays_core.clubs_booking_request_command_receipts
      (booking_request_command_receipt_id,booking_request_command_request_id,
       outcome,reason,booking_request_id,previous_version,resulting_version,
       resulting_status)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      receiptId,
      input.commandRequestId,
      input.outcome,
      input.reason,
      input.bookingRequestId,
      input.previousVersion,
      input.resultingVersion,
      input.resultingStatus,
    ],
  );
  return { ...input, receiptId, replayed: false } satisfies BookingRequestReceipt;
}

async function appendEvent(
  client: PoolClient,
  input: {
    bookingRequestId: string;
    eventType: "submitted" | "review_started" | "accepted" | "rejected" | "cancelled";
    actorAccountId: string;
    actorType: string;
    fromStatus: BookingRequestStatus | null;
    toStatus: BookingRequestStatus;
    fromVersion: number | null;
    toVersion: number;
    reason: string | null;
    correlationId: string;
  },
) {
  await client.query(
    `insert into crays_core.clubs_booking_request_events
      (booking_request_event_id,booking_request_id,event_type,actor_account_id,
       actor_type,from_status,to_status,from_version,to_version,reason,
       correlation_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      id("clubs_booking_request_event"),
      input.bookingRequestId,
      input.eventType,
      input.actorAccountId,
      input.actorType,
      input.fromStatus,
      input.toStatus,
      input.fromVersion,
      input.toVersion,
      input.reason,
      input.correlationId,
    ],
  );
}

async function teamAuthorized(
  client: PoolClient,
  input: {
    accountId: string;
    tenantSessionId: string;
    organizationId: string;
    roleKey: string;
    propertyId: string;
  },
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
             join crays_core.role_assignments role
               on role.assignment_id=scope.role_assignment_id
              and role.status='active'
             join crays_core.franchise_operator_tenants operator
               on operator.partner_tenant_id=scope.partner_tenant_id
              and operator.organization_id=$3
              and operator.status='active'
             where scope.account_id=$1 and scope.property_id=$5
               and scope.status='active' and scope.valid_from<=now()
               and (scope.valid_until is null or scope.valid_until>now())
               and scope.capabilities @> '["clubs.holiday.reservation.operate"]'::jsonb
           )
         )
         or (
           $4 in ('crays-management','admin')
           and exists (
             select 1
             from crays_core.organization_memberships membership
             join crays_core.role_assignments role
               on role.account_id=membership.account_id
              and role.organization_id=membership.organization_id
              and role.role_key=membership.role_key and role.status='active'
             where membership.account_id=$1
               and membership.organization_id=$3
               and membership.role_key=$4 and membership.status='active'
           )
         )
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

export async function executeBookingRequestCommand(input: {
  accountId: string;
  actorType: "member" | "holiday-manager" | "crays-management" | "admin";
  idempotencyKey: string;
  correlationId: string;
  command: Command;
  tenantSessionId?: string;
  organizationId?: string;
  roleKey?: string;
}): Promise<BookingRequestReceipt> {
  validateCommand(input.command);
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(input.idempotencyKey)) {
    throw new Error("A strong idempotency key is required.");
  }
  const payloadSha256 = hash(input.command);
  return transaction(async (client) => {
    const commandRequestId = id("clubs_booking_request_command");
    const requestTarget =
      input.command.type === "submit" ? null : input.command.requestId;
    const expectedVersion =
      input.command.type === "submit" ? null : input.command.expectedVersion;
    const inserted = await client.query(
      `insert into crays_core.clubs_booking_request_command_requests
        (booking_request_command_request_id,idempotency_key,correlation_id,
         actor_account_id,actor_type,booking_request_id,command_type,
         expected_version,payload_sha256)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (actor_account_id,idempotency_key) do nothing
       returning booking_request_command_request_id`,
      [
        commandRequestId,
        input.idempotencyKey,
        input.correlationId,
        input.accountId,
        input.actorType,
        requestTarget,
        input.command.type,
        expectedVersion,
        payloadSha256,
      ],
    );
    if ((inserted.rowCount ?? 0) === 0) {
      const replay = await client.query<{
        booking_request_command_request_id: string;
        payload_sha256: string;
        booking_request_command_receipt_id: string;
        outcome: BookingRequestReceipt["outcome"];
        reason: string | null;
        booking_request_id: string | null;
        previous_version: number | null;
        resulting_version: number | null;
        resulting_status: BookingRequestStatus | null;
      }>(
        `select request.booking_request_command_request_id,request.payload_sha256,
           receipt.booking_request_command_receipt_id,receipt.outcome,
           receipt.reason,receipt.booking_request_id,receipt.previous_version,
           receipt.resulting_version,receipt.resulting_status
         from crays_core.clubs_booking_request_command_requests request
         join lateral (
           select * from crays_core.clubs_booking_request_command_receipts
           where booking_request_command_request_id=request.booking_request_command_request_id
           order by occurred_at desc limit 1
         ) receipt on true
         where request.actor_account_id=$1 and request.idempotency_key=$2`,
        [input.accountId, input.idempotencyKey],
      );
      const row = replay.rows[0];
      if (!row || row.payload_sha256 !== payloadSha256) {
        throw new ClubsIdempotencyReplayConflictError();
      }
      return {
        receiptId: row.booking_request_command_receipt_id,
        commandRequestId: row.booking_request_command_request_id,
        outcome: row.outcome,
        reason: row.reason,
        bookingRequestId: row.booking_request_id,
        previousVersion: row.previous_version,
        resultingVersion: row.resulting_version,
        resultingStatus: row.resulting_status,
        replayed: true,
      };
    }

    if (input.command.type === "submit") {
      if (input.actorType !== "member") {
        await client.query(
          `update crays_core.clubs_booking_request_command_requests
           set status='denied',completed_at=now()
           where booking_request_command_request_id=$1`,
          [commandRequestId],
        );
        return appendReceipt(client, {
          commandRequestId,
          outcome: "denied",
          reason: "member_submission_required",
          bookingRequestId: null,
          previousVersion: null,
          resultingVersion: null,
          resultingStatus: null,
        });
      }
      const hold = await client.query<{
        reservation_hold_id: string;
        property_id: string;
        unit_id: string;
        quote_snapshot_id: string;
      }>(
        `select hold.reservation_hold_id,hold.property_id,hold.unit_id,
           hold.quote_snapshot_id
         from crays_core.clubs_reservation_holds hold
         join crays_core.clubs_quote_snapshots quote
           on quote.quote_snapshot_id=hold.quote_snapshot_id
          and quote.account_id=hold.account_id
         join crays_core.clubs_quote_acceptances acceptance
           on acceptance.quote_snapshot_id=quote.quote_snapshot_id
          and acceptance.reservation_hold_id=hold.reservation_hold_id
          and acceptance.account_id=hold.account_id
         where hold.reservation_hold_id=$1 and hold.account_id=$2
           and hold.status='active' and hold.expires_at>now()
         for update of hold`,
        [input.command.holdId, input.accountId],
      );
      const source = hold.rows[0];
      if (!source) {
        await client.query(
          `update crays_core.clubs_booking_request_command_requests
           set status='conflict',completed_at=now()
           where booking_request_command_request_id=$1`,
          [commandRequestId],
        );
        return appendReceipt(client, {
          commandRequestId,
          outcome: "conflict",
          reason: "own_active_quoted_hold_required",
          bookingRequestId: null,
          previousVersion: null,
          resultingVersion: null,
          resultingStatus: null,
        });
      }
      const duplicate = await client.query<{ booking_request_id: string }>(
        `select booking_request_id from crays_core.clubs_booking_requests
         where reservation_hold_id=$1`,
        [source.reservation_hold_id],
      );
      if (duplicate.rows[0]) {
        await client.query(
          `update crays_core.clubs_booking_request_command_requests
           set status='conflict',completed_at=now()
           where booking_request_command_request_id=$1`,
          [commandRequestId],
        );
        return appendReceipt(client, {
          commandRequestId,
          outcome: "conflict",
          reason: "hold_already_has_booking_request",
          bookingRequestId: duplicate.rows[0].booking_request_id,
          previousVersion: null,
          resultingVersion: null,
          resultingStatus: null,
        });
      }
      const bookingRequestId = id("clubs_booking_request");
      await client.query(
        `insert into crays_core.clubs_booking_requests
          (booking_request_id,public_reference,account_id,property_id,unit_id,
           quote_snapshot_id,reservation_hold_id)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [
          bookingRequestId,
          reference(),
          input.accountId,
          source.property_id,
          source.unit_id,
          source.quote_snapshot_id,
          source.reservation_hold_id,
        ],
      );
      await client.query(
        `update crays_core.clubs_booking_request_command_requests
         set booking_request_id=$2,status='applied',completed_at=now()
         where booking_request_command_request_id=$1`,
        [commandRequestId, bookingRequestId],
      );
      await appendEvent(client, {
        bookingRequestId,
        eventType: "submitted",
        actorAccountId: input.accountId,
        actorType: input.actorType,
        fromStatus: null,
        toStatus: "submitted",
        fromVersion: null,
        toVersion: 1,
        reason: null,
        correlationId: input.correlationId,
      });
      return appendReceipt(client, {
        commandRequestId,
        outcome: "applied",
        reason: null,
        bookingRequestId,
        previousVersion: null,
        resultingVersion: 1,
        resultingStatus: "submitted",
      });
    }

    const request = await client.query<RequestRow>(
      `select booking_request_id,account_id,property_id,unit_id,
         quote_snapshot_id,reservation_hold_id,status,version
       from crays_core.clubs_booking_requests
       where booking_request_id=$1 for update`,
      [input.command.requestId],
    );
    const current = request.rows[0];
    const memberCancel = input.command.type === "cancel" && input.actorType === "member";
    const authorized = current && (
      (memberCancel && current.account_id === input.accountId)
      || (
        input.command.type !== "cancel"
        && input.actorType !== "member"
        && input.tenantSessionId
        && input.organizationId
        && input.roleKey
        && await teamAuthorized(client, {
          accountId: input.accountId,
          tenantSessionId: input.tenantSessionId,
          organizationId: input.organizationId,
          roleKey: input.roleKey,
          propertyId: current.property_id,
        })
      )
    );
    if (!current || !authorized) {
      await client.query(
        `update crays_core.clubs_booking_request_command_requests
         set status='denied',completed_at=now()
         where booking_request_command_request_id=$1`,
        [commandRequestId],
      );
      return appendReceipt(client, {
        commandRequestId,
        outcome: "denied",
        reason: "own_request_or_authorized_property_scope_required",
        bookingRequestId: null,
        previousVersion: null,
        resultingVersion: null,
        resultingStatus: null,
      });
    }
    if (current.version !== input.command.expectedVersion) {
      await client.query(
        `update crays_core.clubs_booking_request_command_requests
         set status='conflict',completed_at=now()
         where booking_request_command_request_id=$1`,
        [commandRequestId],
      );
      return appendReceipt(client, {
        commandRequestId,
        outcome: "conflict",
        reason: "booking_request_version_conflict",
        bookingRequestId: current.booking_request_id,
        previousVersion: current.version,
        resultingVersion: current.version,
        resultingStatus: current.status,
      });
    }

    const transition =
      input.command.type === "cancel"
        ? {
            allowed: ["submitted", "under_review"].includes(current.status),
            status: "cancelled" as const,
            event: "cancelled" as const,
          }
        : input.command.type === "begin_review"
          ? {
              allowed: current.status === "submitted",
              status: "under_review" as const,
              event: "review_started" as const,
            }
          : input.command.type === "accept"
            ? {
                allowed: ["submitted", "under_review"].includes(current.status),
                status: "accepted" as const,
                event: "accepted" as const,
              }
            : {
                allowed: ["submitted", "under_review"].includes(current.status),
                status: "rejected" as const,
                event: "rejected" as const,
              };
    if (!transition.allowed) {
      await client.query(
        `update crays_core.clubs_booking_request_command_requests
         set status='noop',completed_at=now()
         where booking_request_command_request_id=$1`,
        [commandRequestId],
      );
      return appendReceipt(client, {
        commandRequestId,
        outcome: "noop",
        reason: `transition_not_allowed_from_${current.status}`,
        bookingRequestId: current.booking_request_id,
        previousVersion: current.version,
        resultingVersion: current.version,
        resultingStatus: current.status,
      });
    }
    const resultingVersion = current.version + 1;
    const updated = await client.query(
      `update crays_core.clubs_booking_requests
       set status=$2,version=$3,updated_at=now(),
         review_started_at=case when $2='under_review' then now() else review_started_at end,
         decided_at=case when $2 in ('accepted','rejected') then now() else decided_at end,
         cancelled_at=case when $2='cancelled' then now() else cancelled_at end,
         decision_reason=case when $2<>'under_review' then $4 else decision_reason end,
         decided_by_account_id=case when $2 in ('accepted','rejected') then $5 else decided_by_account_id end
       where booking_request_id=$1 and version=$6`,
      [
        current.booking_request_id,
        transition.status,
        resultingVersion,
        input.command.reason,
        input.actorType === "member" ? null : input.accountId,
        current.version,
      ],
    );
    if ((updated.rowCount ?? 0) !== 1) {
      throw new Error("Booking Request changed concurrently; command rolled back.");
    }
    await client.query(
      `update crays_core.clubs_booking_request_command_requests
       set status='applied',completed_at=now()
       where booking_request_command_request_id=$1`,
      [commandRequestId],
    );
    await appendEvent(client, {
      bookingRequestId: current.booking_request_id,
      eventType: transition.event,
      actorAccountId: input.accountId,
      actorType: input.actorType,
      fromStatus: current.status,
      toStatus: transition.status,
      fromVersion: current.version,
      toVersion: resultingVersion,
      reason: input.command.reason,
      correlationId: input.correlationId,
    });
    return appendReceipt(client, {
      commandRequestId,
      outcome: "applied",
      reason: null,
      bookingRequestId: current.booking_request_id,
      previousVersion: current.version,
      resultingVersion,
      resultingStatus: transition.status,
    });
  });
}

export async function readOwnBookingRequests(accountId: string) {
  const result = await getCorePgPool().query<{
    booking_request_id: string;
    public_reference: string;
    property_id: string;
    unit_id: string;
    quote_snapshot_id: string;
    reservation_hold_id: string;
    status: BookingRequestStatus;
    version: number;
    submitted_at: Date;
    updated_at: Date;
    hold_status: string;
    hold_expires_at: Date;
    hold_is_expired: boolean;
    currency: string;
    total_minor: string;
  }>(
    `select request.booking_request_id,request.public_reference,
       request.property_id,request.unit_id,request.quote_snapshot_id,
       request.reservation_hold_id,request.status,request.version,
       request.submitted_at,request.updated_at,hold.status hold_status,
       hold.expires_at hold_expires_at,(hold.expires_at<=now()) hold_is_expired,
       quote.currency,quote.total_minor
     from crays_core.clubs_booking_requests request
     join crays_core.clubs_reservation_holds hold
       on hold.reservation_hold_id=request.reservation_hold_id
     join crays_core.clubs_quote_snapshots quote
       on quote.quote_snapshot_id=request.quote_snapshot_id
     where request.account_id=$1
     order by request.updated_at desc
     limit 50`,
    [accountId],
  );
  return result.rows.map((row) => ({
    bookingRequestId: row.booking_request_id,
    publicReference: row.public_reference,
    propertyId: row.property_id,
    unitId: row.unit_id,
    quoteId: row.quote_snapshot_id,
    holdId: row.reservation_hold_id,
    status: row.status,
    version: row.version,
    submittedAt: row.submitted_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    holdStatus: row.hold_status,
    holdExpiresAt: row.hold_expires_at.toISOString(),
    holdIsExpired: row.hold_is_expired,
    currency: row.currency,
    totalMinor: row.total_minor,
    reservationStatus: null,
    bookingStatus: null,
    paymentStatus: null,
  }));
}

export async function readTeamBookingRequestQueue(input: {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: string;
  focus?: { requestId: string; version: number } | null;
}) {
  const result = await getCorePgPool().query<{
    booking_request_id: string;
    public_reference: string;
    property_id: string;
    unit_id: string;
    status: BookingRequestStatus;
    version: number;
    submitted_at: Date;
    hold_status: string;
    hold_expires_at: Date;
    hold_is_expired: boolean;
    currency: string;
    total_minor: string;
  }>(
     `with authorized_properties as (
       select distinct property.property_id
       from crays_core.tenant_sessions session
       join crays_core.partner_role_scopes scope
         on scope.account_id=session.account_id
         and scope.role_key='holiday-manager'
         and scope.vertical_root='clubs'
         and scope.relationship_type='clubs-franchise-partner'
         and scope.status='active'
         and scope.valid_from<=now()
         and (scope.valid_until is null or scope.valid_until>now())
         and scope.capabilities @> '["clubs.holiday.reservation.operate"]'::jsonb
       join crays_core.role_assignments role_assignment
         on role_assignment.assignment_id=scope.role_assignment_id
        and role_assignment.organization_id=session.organization_id
        and role_assignment.account_id=session.account_id
        and role_assignment.role_key=session.role_key
        and role_assignment.status='active'
       join crays_core.clubs_properties property
         on property.property_id=scope.property_id
        and property.partner_tenant_id=scope.partner_tenant_id
        and property.operator_legal_entity_id=scope.operator_legal_entity_id
        and property.lifecycle not in ('suspended','archived')
       join crays_core.stores store
         on store.store_id=property.store_id and store.vertical_root='clubs'
       join crays_core.store_operator_assignments assignment
         on assignment.store_id=store.store_id
        and assignment.partner_tenant_id=scope.partner_tenant_id
        and assignment.operator_legal_entity_id=scope.operator_legal_entity_id
        and assignment.status='active'
        and assignment.valid_from<=now()
        and (assignment.valid_until is null or assignment.valid_until>now())
       where session.session_id=$2 and session.account_id=$1
         and session.organization_id=$3 and session.role_key='holiday-manager'
         and session.status='active' and session.expires_at>now()
         and $4='holiday-manager'
       union
       select property.property_id
       from crays_core.tenant_sessions session
       join crays_core.organization_memberships membership
         on membership.account_id=session.account_id
        and membership.organization_id=session.organization_id
        and membership.role_key=session.role_key
        and membership.status='active'
       join crays_core.role_assignments role_assignment
         on role_assignment.account_id=membership.account_id
        and role_assignment.organization_id=membership.organization_id
        and role_assignment.role_key=membership.role_key
        and role_assignment.status='active'
       join crays_core.clubs_properties property
         on property.lifecycle not in ('suspended','archived')
       join crays_core.stores store
         on store.store_id=property.store_id and store.vertical_root='clubs'
       join crays_core.store_operator_assignments assignment
         on assignment.store_id=store.store_id
        and assignment.partner_tenant_id=property.partner_tenant_id
        and assignment.operator_legal_entity_id=property.operator_legal_entity_id
        and assignment.vertical_root='clubs'
        and assignment.status='active'
        and assignment.valid_from<=now()
        and (assignment.valid_until is null or assignment.valid_until>now())
       join crays_core.franchise_operator_tenants operator
         on operator.partner_tenant_id=assignment.partner_tenant_id
        and operator.status='active'
       where session.session_id=$2 and session.account_id=$1
         and session.organization_id=$3 and session.role_key=$4
         and session.status='active' and session.expires_at>now()
         and $4 in ('crays-management','admin')
         and operator.organization_id=session.organization_id
     ), queue_items as (
     select request.booking_request_id,request.public_reference,
       request.property_id,request.unit_id,request.status,request.version,
       request.submitted_at,hold.status hold_status,
       hold.expires_at hold_expires_at,(hold.expires_at<=now()) hold_is_expired,
       quote.currency,quote.total_minor
      from crays_core.clubs_booking_requests request
      join authorized_properties scope on scope.property_id=request.property_id
      join crays_core.clubs_units unit
        on unit.unit_id=request.unit_id and unit.property_id=request.property_id
       and unit.lifecycle not in ('suspended','archived')
      join crays_core.clubs_reservation_holds hold
       on hold.reservation_hold_id=request.reservation_hold_id
     join crays_core.clubs_quote_snapshots quote
       on quote.quote_snapshot_id=request.quote_snapshot_id
     where request.status in ('submitted','under_review')
     ), ranked_items as (
       select queue_items.*,row_number() over(order by
         case status when 'submitted' then 0 else 1 end,
         submitted_at,booking_request_id) queue_rank
       from queue_items
     )
     select booking_request_id,public_reference,property_id,unit_id,status,
       version,submitted_at,hold_status,hold_expires_at,hold_is_expired,
       currency,total_minor
     from ranked_items
      where queue_rank<=100 or booking_request_id=$5
      order by queue_rank`,
    [
      input.accountId,
      input.tenantSessionId,
      input.organizationId,
      input.roleKey,
      input.focus?.requestId ?? "",
    ],
  );
  return result.rows.map((row) => ({
    bookingRequestId: row.booking_request_id,
    publicReference: row.public_reference,
    propertyId: row.property_id,
    unitId: row.unit_id,
    status: row.status,
    version: row.version,
    submittedAt: row.submitted_at.toISOString(),
    holdStatus: row.hold_status,
    holdExpiresAt: row.hold_expires_at.toISOString(),
    holdIsExpired: row.hold_is_expired,
    currency: row.currency,
    totalMinor: row.total_minor,
    nextActions:
      row.status === "submitted"
        ? ["begin_review", "accept", "reject"]
        : ["accept", "reject"],
    reservationStatus: null,
    bookingStatus: null,
    paymentStatus: null,
  }));
}
