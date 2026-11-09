import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";

type CreateOffering = {
  type: "create_offering";
  propertyId: string;
  serviceCode: string;
  serviceType: "add_on" | "hospitality_service" | "access_pass";
  displayName: string;
  fulfillmentMode: "scheduled" | "on_request" | "entitlement";
  chargeMode: "included" | "commerce";
  commerceProductReference?: string;
  commerceVariantReference?: string;
};
type TransitionOffering = {
  type: "transition_offering";
  offeringId: string;
  expectedVersion: number;
  lifecycle: "published" | "suspended" | "archived";
  reason: string;
};
type RequestService = {
  type: "request_service";
  bookingId: string;
  offeringId: string;
  quantity: number;
  requestedFor?: string;
  requestNote?: string;
  guestId?: string;
};
type SelectionTransition = {
  type: "cancel_service" | "confirm_service" | "fulfil_service";
  selectionId: string;
  expectedVersion: number;
  reason: string;
};
type IssueEntitlement = {
  type: "issue_entitlement";
  bookingId: string;
  selectionId?: string;
  accountId?: string;
  guestId?: string;
  validFrom: string;
  validUntil: string;
};
type EntitlementTransition = {
  type:
    | "activate_entitlement"
    | "suspend_entitlement"
    | "revoke_entitlement"
    | "consume_entitlement";
  entitlementId: string;
  expectedVersion: number;
  reason: string;
};
export type ClubsServiceCommand =
  | CreateOffering
  | TransitionOffering
  | RequestService
  | SelectionTransition
  | IssueEntitlement
  | EntitlementTransition;

type Outcome = "applied" | "conflict" | "denied" | "invalid" | "noop";
export type ClubsServiceReceipt = {
  receiptId: string;
  requestId: string;
  outcome: Outcome;
  reason: string | null;
  aggregateType: "offering" | "selection" | "entitlement" | null;
  aggregateId: string | null;
  previousVersion: number | null;
  resultingVersion: number | null;
  resultingStatus: string | null;
  replayed: boolean;
};

export type ClubsServiceCommandInput = {
  accountId: string;
  actorType: "member" | "holiday-manager" | "crays-management" | "admin";
  idempotencyKey: string;
  correlationId: string;
  command: ClubsServiceCommand;
  tenantSessionId?: string;
  organizationId?: string;
  roleKey?: string;
};

type ClubsServiceQueryable = Pick<PoolClient, "query">;

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function reference(prefix: string) {
  return `${prefix}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function identifier(value: string, label: string) {
  if (!/^[A-Za-z0-9:_.-]{3,180}$/.test(value))
    throw new Error(`${label} is invalid.`);
}

function validate(command: ClubsServiceCommand) {
  if ("bookingId" in command) identifier(command.bookingId, "Booking");
  if ("propertyId" in command) identifier(command.propertyId, "Property");
  if ("offeringId" in command) identifier(command.offeringId, "Offering");
  if ("offeringId" in command) identifier(command.offeringId, "Offering");
  if ("selectionId" in command && command.selectionId) {
    identifier(command.selectionId, "Service selection");
  }
  if ("entitlementId" in command)
    identifier(command.entitlementId, "Entitlement");
  if (
    "expectedVersion" in command &&
    (!Number.isSafeInteger(command.expectedVersion) ||
      command.expectedVersion < 1)
  )
    throw new Error("Expected version is invalid.");
  if (
    "reason" in command &&
    (command.reason.trim().length < 3 || command.reason.trim().length > 500)
  )
    throw new Error("A concise operational reason is required.");
  if (command.type === "request_service") {
    if (
      !Number.isSafeInteger(command.quantity) ||
      command.quantity < 1 ||
      command.quantity > 1000
    ) {
      throw new Error("Service quantity is invalid.");
    }
    if (command.guestId) identifier(command.guestId, "Guest");
    if (command.requestNote && command.requestNote.trim().length > 500) {
      throw new Error("Service request note is too long.");
    }
    if (
      command.requestedFor &&
      !Number.isFinite(Date.parse(command.requestedFor))
    ) {
      throw new Error("Requested service time is invalid.");
    }
  }
  if (command.type === "create_offering") {
    if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(command.serviceCode)) {
      throw new Error("Service code must be an uppercase stable code.");
    }
    if (
      command.displayName.trim().length < 2 ||
      command.displayName.trim().length > 120
    ) {
      throw new Error("Service display name is invalid.");
    }
    if (
      command.chargeMode === "commerce" &&
      (!command.commerceProductReference || !command.commerceVariantReference)
    ) {
      throw new Error(
        "Commerce offerings require exact product and variant references.",
      );
    }
    if (
      command.serviceType === "access_pass" &&
      command.fulfillmentMode !== "entitlement"
    ) {
      throw new Error("Access pass offerings require entitlement fulfillment.");
    }
  }
  if (command.type === "issue_entitlement") {
    if ((command.accountId ? 1 : 0) + (command.guestId ? 1 : 0) !== 1) {
      throw new Error("Exactly one entitlement subject is required.");
    }
    if (command.accountId) identifier(command.accountId, "Account");
    if (command.guestId) identifier(command.guestId, "Guest");
    const from = Date.parse(command.validFrom);
    const until = Date.parse(command.validUntil);
    if (!Number.isFinite(from) || !Number.isFinite(until) || until <= from) {
      throw new Error("Entitlement validity is invalid.");
    }
  }
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

async function authorizedProperty(
  client: PoolClient,
  input: {
    accountId: string;
    tenantSessionId?: string;
    organizationId?: string;
    roleKey?: string;
    propertyId: string;
  },
) {
  if (!input.tenantSessionId || !input.organizationId || !input.roleKey)
    return false;
  const result = await client.query<{ allowed: boolean }>(
    `select (
       exists (
         select 1 from crays_core.tenant_sessions session
         where session.session_id=$2 and session.account_id=$1
           and session.organization_id=$3 and session.role_key=$4
           and session.status='active' and session.expires_at>now()
       )
       and exists (
         select 1
         from crays_core.clubs_properties property
         join crays_core.franchise_operator_tenants operator
           on operator.partner_tenant_id=property.partner_tenant_id
          and operator.organization_id=$3
          and operator.status='active'
         where property.property_id=$5
       )
       and (
         ($4='holiday-manager' and exists (
           select 1 from crays_core.partner_role_scopes scope
           where scope.account_id=$1 and scope.property_id=$5
             and scope.status='active' and scope.valid_from<=now()
             and (scope.valid_until is null or scope.valid_until>now())
             and scope.capabilities @> '["clubs.holiday.reservation.operate"]'::jsonb
         ))
         or $4 in ('crays-management','admin')
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

async function appendReceipt(
  client: PoolClient,
  input: Omit<ClubsServiceReceipt, "receiptId" | "replayed">,
) {
  const receiptId = id("clubs_service_receipt");
  await client.query(
    `insert into crays_core.clubs_service_command_receipts
      (service_command_receipt_id,service_command_request_id,outcome,reason,
       aggregate_type,aggregate_id,previous_version,resulting_version,resulting_status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      receiptId,
      input.requestId,
      input.outcome,
      input.reason,
      input.aggregateType,
      input.aggregateId,
      input.previousVersion,
      input.resultingVersion,
      input.resultingStatus,
    ],
  );
  return { ...input, receiptId, replayed: false } satisfies ClubsServiceReceipt;
}

async function finish(
  client: PoolClient,
  requestId: string,
  receipt: Omit<ClubsServiceReceipt, "receiptId" | "requestId" | "replayed">,
) {
  await client.query(
    `update crays_core.clubs_service_command_requests
     set status=$2,completed_at=now() where service_command_request_id=$1`,
    [requestId, receipt.outcome],
  );
  return appendReceipt(client, { requestId, ...receipt });
}

async function appendEvent(
  client: PoolClient,
  input: {
    aggregateType: "offering" | "selection" | "entitlement";
    aggregateId: string;
    eventType: string;
    actorAccountId: string;
    actorType: string;
    fromStatus: string | null;
    toStatus: string;
    fromVersion: number | null;
    toVersion: number;
    reason?: string | null;
    correlationId: string;
  },
) {
  await client.query(
    `insert into crays_core.clubs_service_events
      (service_event_id,aggregate_type,aggregate_id,event_type,actor_account_id,
       actor_type,from_status,to_status,from_version,to_version,reason,correlation_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      id("clubs_service_event"),
      input.aggregateType,
      input.aggregateId,
      input.eventType,
      input.actorAccountId,
      input.actorType,
      input.fromStatus,
      input.toStatus,
      input.fromVersion,
      input.toVersion,
      input.reason ?? null,
      input.correlationId,
    ],
  );
}

async function offeringCommand(
  client: PoolClient,
  input: {
    accountId: string;
    actorType: string;
    tenantSessionId?: string;
    organizationId?: string;
    roleKey?: string;
    command: CreateOffering | TransitionOffering;
    requestId: string;
    correlationId: string;
  },
) {
  if (input.command.type === "create_offering") {
    if (
      !(await authorizedProperty(client, {
        accountId: input.accountId,
        tenantSessionId: input.tenantSessionId,
        organizationId: input.organizationId,
        roleKey: input.roleKey,
        propertyId: input.command.propertyId,
      }))
    ) {
      return finish(client, input.requestId, {
        outcome: "denied",
        reason: "authorized_property_required",
        aggregateType: null,
        aggregateId: null,
        previousVersion: null,
        resultingVersion: null,
        resultingStatus: null,
      });
    }
    const offeringId = id("clubs_service_offering");
    const inserted = await client.query(
      `insert into crays_core.clubs_service_offerings
        (service_offering_id,property_id,service_code,service_type,display_name,
         fulfillment_mode,charge_mode,commerce_product_reference,
         commerce_variant_reference)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (property_id,service_code) do nothing
       returning service_offering_id`,
      [
        offeringId,
        input.command.propertyId,
        input.command.serviceCode,
        input.command.serviceType,
        input.command.displayName.trim(),
        input.command.fulfillmentMode,
        input.command.chargeMode,
        input.command.commerceProductReference ?? null,
        input.command.commerceVariantReference ?? null,
      ],
    );
    if ((inserted.rowCount ?? 0) !== 1) {
      return finish(client, input.requestId, {
        outcome: "conflict",
        reason: "service_code_already_exists_for_property",
        aggregateType: null,
        aggregateId: null,
        previousVersion: null,
        resultingVersion: null,
        resultingStatus: null,
      });
    }
    await appendEvent(client, {
      aggregateType: "offering",
      aggregateId: offeringId,
      eventType: "created",
      actorAccountId: input.accountId,
      actorType: input.actorType,
      fromStatus: null,
      toStatus: "draft",
      fromVersion: null,
      toVersion: 1,
      correlationId: input.correlationId,
    });
    return finish(client, input.requestId, {
      outcome: "applied",
      reason: null,
      aggregateType: "offering",
      aggregateId: offeringId,
      previousVersion: null,
      resultingVersion: 1,
      resultingStatus: "draft",
    });
  }
  const result = await client.query<{
    service_offering_id: string;
    property_id: string;
    lifecycle: string;
    version: number;
    charge_mode: string;
    commerce_product_reference: string | null;
    commerce_variant_reference: string | null;
  }>(
    `select service_offering_id,property_id,lifecycle,version,charge_mode,
       commerce_product_reference,commerce_variant_reference
     from crays_core.clubs_service_offerings
     where service_offering_id=$1 for update`,
    [input.command.offeringId],
  );
  const row = result.rows[0];
  if (
    !row ||
    !(await authorizedProperty(client, {
      accountId: input.accountId,
      tenantSessionId: input.tenantSessionId,
      organizationId: input.organizationId,
      roleKey: input.roleKey,
      propertyId: row.property_id,
    }))
  ) {
    return finish(client, input.requestId, {
      outcome: "denied",
      reason: "authorized_offering_required",
      aggregateType: null,
      aggregateId: null,
      previousVersion: null,
      resultingVersion: null,
      resultingStatus: null,
    });
  }
  if (row.version !== input.command.expectedVersion) {
    return finish(client, input.requestId, {
      outcome: "conflict",
      reason: "service_offering_version_conflict",
      aggregateType: "offering",
      aggregateId: row.service_offering_id,
      previousVersion: row.version,
      resultingVersion: row.version,
      resultingStatus: row.lifecycle,
    });
  }
  if (
    input.command.lifecycle === "published" &&
    row.charge_mode === "commerce" &&
    (!row.commerce_product_reference || !row.commerce_variant_reference)
  ) {
    return finish(client, input.requestId, {
      outcome: "invalid",
      reason: "exact_commerce_mapping_required_for_publication",
      aggregateType: "offering",
      aggregateId: row.service_offering_id,
      previousVersion: row.version,
      resultingVersion: row.version,
      resultingStatus: row.lifecycle,
    });
  }
  const allowed =
    (input.command.lifecycle === "published" &&
      ["draft", "suspended"].includes(row.lifecycle)) ||
    (input.command.lifecycle === "suspended" &&
      row.lifecycle === "published") ||
    (input.command.lifecycle === "archived" &&
      ["draft", "suspended"].includes(row.lifecycle));
  if (!allowed) {
    return finish(client, input.requestId, {
      outcome: "noop",
      reason: `offering_transition_not_allowed_from_${row.lifecycle}`,
      aggregateType: "offering",
      aggregateId: row.service_offering_id,
      previousVersion: row.version,
      resultingVersion: row.version,
      resultingStatus: row.lifecycle,
    });
  }
  const resultingVersion = row.version + 1;
  await client.query(
    `update crays_core.clubs_service_offerings
     set lifecycle=$2,version=$3,updated_at=now()
     where service_offering_id=$1 and version=$4`,
    [
      row.service_offering_id,
      input.command.lifecycle,
      resultingVersion,
      row.version,
    ],
  );
  await appendEvent(client, {
    aggregateType: "offering",
    aggregateId: row.service_offering_id,
    eventType: input.command.lifecycle,
    actorAccountId: input.accountId,
    actorType: input.actorType,
    fromStatus: row.lifecycle,
    toStatus: input.command.lifecycle,
    fromVersion: row.version,
    toVersion: resultingVersion,
    reason: input.command.reason,
    correlationId: input.correlationId,
  });
  return finish(client, input.requestId, {
    outcome: "applied",
    reason: null,
    aggregateType: "offering",
    aggregateId: row.service_offering_id,
    previousVersion: row.version,
    resultingVersion,
    resultingStatus: input.command.lifecycle,
  });
}

async function requestService(
  client: PoolClient,
  input: {
    accountId: string;
    actorType: string;
    command: RequestService;
    requestId: string;
    correlationId: string;
  },
) {
  const result = await client.query<{
    booking_id: string;
    booking_status: string;
    property_id: string;
    service_offering_id: string;
    service_code: string;
    service_type: string;
    display_name: string;
    fulfillment_mode: string;
    charge_mode: string;
    commerce_product_reference: string | null;
    commerce_variant_reference: string | null;
    offering_version: number;
  }>(
    `select booking.booking_id,booking.status booking_status,booking.property_id,
       offering.service_offering_id,offering.service_code,offering.service_type,
       offering.display_name,offering.fulfillment_mode,offering.charge_mode,
       offering.commerce_product_reference,offering.commerce_variant_reference,
       offering.version offering_version
     from crays_core.clubs_bookings booking
     join crays_core.clubs_service_offerings offering
       on offering.service_offering_id=$3
      and offering.property_id=booking.property_id
      and offering.lifecycle='published'
     where booking.booking_id=$2 and booking.account_id=$1
     for update of booking`,
    [input.accountId, input.command.bookingId, input.command.offeringId],
  );
  const row = result.rows[0];
  if (
    !row ||
    !["confirmed", "change_requested", "in_stay"].includes(row.booking_status)
  ) {
    return finish(client, input.requestId, {
      outcome: "denied",
      reason: "own_active_booking_and_published_offering_required",
      aggregateType: null,
      aggregateId: null,
      previousVersion: null,
      resultingVersion: null,
      resultingStatus: null,
    });
  }
  if (input.command.guestId) {
    const guest = await client.query(
      `select 1 from crays_core.clubs_booking_guests
       where booking_guest_id=$1 and booking_id=$2 and status='assigned'`,
      [input.command.guestId, row.booking_id],
    );
    if (!guest.rows[0]) {
      return finish(client, input.requestId, {
        outcome: "denied",
        reason: "assigned_booking_guest_required",
        aggregateType: null,
        aggregateId: null,
        previousVersion: null,
        resultingVersion: null,
        resultingStatus: null,
      });
    }
  }
  const snapshot = {
    offeringId: row.service_offering_id,
    version: row.offering_version,
    code: row.service_code,
    type: row.service_type,
    name: row.display_name,
    fulfillmentMode: row.fulfillment_mode,
    chargeMode: row.charge_mode,
    commerceProductReference: row.commerce_product_reference,
    commerceVariantReference: row.commerce_variant_reference,
  };
  const selectionId = id("clubs_service_selection");
  await client.query(
    `insert into crays_core.clubs_booking_service_selections
      (booking_service_selection_id,public_reference,booking_id,
       service_offering_id,requested_by_account_id,guest_id,quantity,
       requested_for,request_note,offering_snapshot,offering_snapshot_sha256)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      selectionId,
      reference("SVC"),
      row.booking_id,
      row.service_offering_id,
      input.accountId,
      input.command.guestId ?? null,
      input.command.quantity,
      input.command.requestedFor ? new Date(input.command.requestedFor) : null,
      input.command.requestNote?.trim() || null,
      snapshot,
      hash(snapshot),
    ],
  );
  await appendEvent(client, {
    aggregateType: "selection",
    aggregateId: selectionId,
    eventType: "requested",
    actorAccountId: input.accountId,
    actorType: input.actorType,
    fromStatus: null,
    toStatus: "requested",
    fromVersion: null,
    toVersion: 1,
    correlationId: input.correlationId,
  });
  return finish(client, input.requestId, {
    outcome: "applied",
    reason: null,
    aggregateType: "selection",
    aggregateId: selectionId,
    previousVersion: null,
    resultingVersion: 1,
    resultingStatus: "requested",
  });
}

async function selectionTransition(
  client: PoolClient,
  input: {
    accountId: string;
    actorType: string;
    tenantSessionId?: string;
    organizationId?: string;
    roleKey?: string;
    command: SelectionTransition;
    requestId: string;
    correlationId: string;
  },
) {
  const result = await client.query<{
    booking_service_selection_id: string;
    status: string;
    version: number;
    requested_by_account_id: string;
    property_id: string;
    charge_mode: string;
  }>(
    `select selection.booking_service_selection_id,selection.status,
       selection.version,selection.requested_by_account_id,booking.property_id,
       offering.charge_mode
     from crays_core.clubs_booking_service_selections selection
     join crays_core.clubs_bookings booking on booking.booking_id=selection.booking_id
     join crays_core.clubs_service_offerings offering
       on offering.service_offering_id=selection.service_offering_id
     where selection.booking_service_selection_id=$1
     for update of selection`,
    [input.command.selectionId],
  );
  const row = result.rows[0];
  const memberCancel =
    input.command.type === "cancel_service" &&
    row?.requested_by_account_id === input.accountId;
  const teamAllowed =
    row &&
    input.command.type !== "cancel_service" &&
    (await authorizedProperty(client, {
      accountId: input.accountId,
      tenantSessionId: input.tenantSessionId,
      organizationId: input.organizationId,
      roleKey: input.roleKey,
      propertyId: row.property_id,
    }));
  if (!row || (!memberCancel && !teamAllowed)) {
    return finish(client, input.requestId, {
      outcome: "denied",
      reason: "authorized_service_selection_required",
      aggregateType: null,
      aggregateId: null,
      previousVersion: null,
      resultingVersion: null,
      resultingStatus: null,
    });
  }
  if (row.version !== input.command.expectedVersion) {
    return finish(client, input.requestId, {
      outcome: "conflict",
      reason: "service_selection_version_conflict",
      aggregateType: "selection",
      aggregateId: row.booking_service_selection_id,
      previousVersion: row.version,
      resultingVersion: row.version,
      resultingStatus: row.status,
    });
  }
  if (
    input.command.type === "confirm_service" &&
    row.charge_mode === "commerce"
  ) {
    return finish(client, input.requestId, {
      outcome: "conflict",
      reason: "commerce_confirmation_owned_by_stage7",
      aggregateType: "selection",
      aggregateId: row.booking_service_selection_id,
      previousVersion: row.version,
      resultingVersion: row.version,
      resultingStatus: row.status,
    });
  }
  const transition =
    input.command.type === "cancel_service"
      ? {
          allowed: ["requested", "confirmed"].includes(row.status),
          status: "cancelled",
        }
      : input.command.type === "confirm_service"
        ? { allowed: row.status === "requested", status: "confirmed" }
        : { allowed: row.status === "confirmed", status: "fulfilled" };
  if (!transition.allowed) {
    return finish(client, input.requestId, {
      outcome: "noop",
      reason: `service_transition_not_allowed_from_${row.status}`,
      aggregateType: "selection",
      aggregateId: row.booking_service_selection_id,
      previousVersion: row.version,
      resultingVersion: row.version,
      resultingStatus: row.status,
    });
  }
  const resultingVersion = row.version + 1;
  await client.query(
    `update crays_core.clubs_booking_service_selections
     set status=$2,version=$3,updated_at=now(),
       confirmed_at=case when $2='confirmed' then now() else confirmed_at end,
       fulfilled_at=case when $2='fulfilled' then now() else fulfilled_at end,
       cancelled_at=case when $2='cancelled' then now() else cancelled_at end
     where booking_service_selection_id=$1 and version=$4`,
    [
      row.booking_service_selection_id,
      transition.status,
      resultingVersion,
      row.version,
    ],
  );
  await appendEvent(client, {
    aggregateType: "selection",
    aggregateId: row.booking_service_selection_id,
    eventType: transition.status,
    actorAccountId: input.accountId,
    actorType: input.actorType,
    fromStatus: row.status,
    toStatus: transition.status,
    fromVersion: row.version,
    toVersion: resultingVersion,
    reason: input.command.reason,
    correlationId: input.correlationId,
  });
  return finish(client, input.requestId, {
    outcome: "applied",
    reason: null,
    aggregateType: "selection",
    aggregateId: row.booking_service_selection_id,
    previousVersion: row.version,
    resultingVersion,
    resultingStatus: transition.status,
  });
}

async function issueEntitlement(
  client: PoolClient,
  input: {
    accountId: string;
    actorType: string;
    tenantSessionId?: string;
    organizationId?: string;
    roleKey?: string;
    command: IssueEntitlement;
    requestId: string;
    correlationId: string;
  },
) {
  const result = await client.query<{
    booking_id: string;
    account_id: string;
    property_id: string;
    booking_status: string;
    arrival_date: string;
    departure_date: string;
    selection_status: string | null;
    service_code: string | null;
    fulfillment_mode: string | null;
  }>(
    `select booking.booking_id,booking.account_id,booking.property_id,
       booking.status booking_status,reservation.arrival_date::text,
       reservation.departure_date::text,selection.status selection_status,
       offering.service_code,offering.fulfillment_mode
     from crays_core.clubs_bookings booking
     join crays_core.clubs_reservations reservation
       on reservation.reservation_id=booking.reservation_id
     left join crays_core.clubs_booking_service_selections selection
       on selection.booking_service_selection_id=$2
      and selection.booking_id=booking.booking_id
     left join crays_core.clubs_service_offerings offering
       on offering.service_offering_id=selection.service_offering_id
     where booking.booking_id=$1 for update of booking`,
    [input.command.bookingId, input.command.selectionId ?? null],
  );
  const row = result.rows[0];
  if (
    !row ||
    !(await authorizedProperty(client, {
      accountId: input.accountId,
      tenantSessionId: input.tenantSessionId,
      organizationId: input.organizationId,
      roleKey: input.roleKey,
      propertyId: row.property_id,
    }))
  ) {
    return finish(client, input.requestId, {
      outcome: "denied",
      reason: "authorized_booking_required",
      aggregateType: null,
      aggregateId: null,
      previousVersion: null,
      resultingVersion: null,
      resultingStatus: null,
    });
  }
  if (
    !["confirmed", "change_requested", "in_stay"].includes(row.booking_status)
  ) {
    return finish(client, input.requestId, {
      outcome: "conflict",
      reason: `entitlement_not_allowed_from_${row.booking_status}`,
      aggregateType: null,
      aggregateId: null,
      previousVersion: null,
      resultingVersion: null,
      resultingStatus: row.booking_status,
    });
  }
  if (
    input.command.selectionId &&
    !["confirmed", "fulfilled"].includes(row.selection_status ?? "")
  ) {
    return finish(client, input.requestId, {
      outcome: "conflict",
      reason: "confirmed_service_selection_required",
      aggregateType: null,
      aggregateId: null,
      previousVersion: null,
      resultingVersion: null,
      resultingStatus: row.selection_status,
    });
  }
  if (input.command.selectionId && row.fulfillment_mode !== "entitlement") {
    return finish(client, input.requestId, {
      outcome: "invalid",
      reason: "service_offering_does_not_issue_access",
      aggregateType: null,
      aggregateId: null,
      previousVersion: null,
      resultingVersion: null,
      resultingStatus: row.selection_status,
    });
  }
  const from = Date.parse(input.command.validFrom);
  const until = Date.parse(input.command.validUntil);
  const stayFrom = Date.parse(`${row.arrival_date}T00:00:00.000Z`) - 86_400_000;
  const stayUntil =
    Date.parse(`${row.departure_date}T00:00:00.000Z`) + 86_400_000;
  if (from < stayFrom || until > stayUntil) {
    return finish(client, input.requestId, {
      outcome: "invalid",
      reason: "entitlement_validity_outside_bounded_stay_window",
      aggregateType: null,
      aggregateId: null,
      previousVersion: null,
      resultingVersion: null,
      resultingStatus: null,
    });
  }
  if (input.command.accountId && input.command.accountId !== row.account_id) {
    return finish(client, input.requestId, {
      outcome: "denied",
      reason: "booking_account_required",
      aggregateType: null,
      aggregateId: null,
      previousVersion: null,
      resultingVersion: null,
      resultingStatus: null,
    });
  }
  if (input.command.guestId) {
    const guest = await client.query(
      `select 1 from crays_core.clubs_booking_guests
       where booking_guest_id=$1 and booking_id=$2 and status='assigned'`,
      [input.command.guestId, row.booking_id],
    );
    if (!guest.rows[0]) {
      return finish(client, input.requestId, {
        outcome: "denied",
        reason: "assigned_booking_guest_required",
        aggregateType: null,
        aggregateId: null,
        previousVersion: null,
        resultingVersion: null,
        resultingStatus: null,
      });
    }
  }
  const entitlementId = id("clubs_access_entitlement");
  const scopeKey = input.command.selectionId
    ? `service:${row.service_code}`
    : `stay:${row.property_id}`;
  await client.query(
    `insert into crays_core.clubs_access_entitlements
      (access_entitlement_id,public_reference,booking_id,
       booking_service_selection_id,account_id,guest_id,property_id,scope_key,
       valid_from,valid_until)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      entitlementId,
      reference("ACC"),
      row.booking_id,
      input.command.selectionId ?? null,
      input.command.accountId ?? null,
      input.command.guestId ?? null,
      row.property_id,
      scopeKey,
      new Date(input.command.validFrom),
      new Date(input.command.validUntil),
    ],
  );
  await appendEvent(client, {
    aggregateType: "entitlement",
    aggregateId: entitlementId,
    eventType: "issued",
    actorAccountId: input.accountId,
    actorType: input.actorType,
    fromStatus: null,
    toStatus: "pending",
    fromVersion: null,
    toVersion: 1,
    correlationId: input.correlationId,
  });
  return finish(client, input.requestId, {
    outcome: "applied",
    reason: null,
    aggregateType: "entitlement",
    aggregateId: entitlementId,
    previousVersion: null,
    resultingVersion: 1,
    resultingStatus: "pending",
  });
}

async function entitlementTransition(
  client: PoolClient,
  input: {
    accountId: string;
    actorType: string;
    tenantSessionId?: string;
    organizationId?: string;
    roleKey?: string;
    command: EntitlementTransition;
    requestId: string;
    correlationId: string;
  },
) {
  const result = await client.query<{
    access_entitlement_id: string;
    status: string;
    version: number;
    property_id: string;
    valid_from: Date;
    valid_until: Date;
    stay_status: string;
  }>(
    `select entitlement.access_entitlement_id,entitlement.status,
       entitlement.version,entitlement.property_id,entitlement.valid_from,
       entitlement.valid_until,stay.status stay_status
     from crays_core.clubs_access_entitlements entitlement
     join crays_core.clubs_stays stay on stay.booking_id=entitlement.booking_id
     where entitlement.access_entitlement_id=$1 for update of entitlement`,
    [input.command.entitlementId],
  );
  const row = result.rows[0];
  if (
    !row ||
    !(await authorizedProperty(client, {
      accountId: input.accountId,
      tenantSessionId: input.tenantSessionId,
      organizationId: input.organizationId,
      roleKey: input.roleKey,
      propertyId: row.property_id,
    }))
  ) {
    return finish(client, input.requestId, {
      outcome: "denied",
      reason: "authorized_entitlement_required",
      aggregateType: null,
      aggregateId: null,
      previousVersion: null,
      resultingVersion: null,
      resultingStatus: null,
    });
  }
  if (row.version !== input.command.expectedVersion) {
    return finish(client, input.requestId, {
      outcome: "conflict",
      reason: "entitlement_version_conflict",
      aggregateType: "entitlement",
      aggregateId: row.access_entitlement_id,
      previousVersion: row.version,
      resultingVersion: row.version,
      resultingStatus: row.status,
    });
  }
  if (
    input.command.type === "activate_entitlement" &&
    (!["ready_for_check_in", "checked_in"].includes(row.stay_status) ||
      row.valid_from.getTime() > Date.now() ||
      row.valid_until.getTime() <= Date.now())
  ) {
    return finish(client, input.requestId, {
      outcome: "conflict",
      reason: "stay_and_validity_not_ready_for_activation",
      aggregateType: "entitlement",
      aggregateId: row.access_entitlement_id,
      previousVersion: row.version,
      resultingVersion: row.version,
      resultingStatus: row.status,
    });
  }
  const transition =
    input.command.type === "activate_entitlement"
      ? {
          allowed: ["pending", "suspended"].includes(row.status),
          status: "active",
        }
      : input.command.type === "suspend_entitlement"
        ? { allowed: row.status === "active", status: "suspended" }
        : input.command.type === "revoke_entitlement"
          ? {
              allowed: ["pending", "active", "suspended"].includes(row.status),
              status: "revoked",
            }
          : { allowed: row.status === "active", status: "consumed" };
  if (!transition.allowed) {
    return finish(client, input.requestId, {
      outcome: "noop",
      reason: `entitlement_transition_not_allowed_from_${row.status}`,
      aggregateType: "entitlement",
      aggregateId: row.access_entitlement_id,
      previousVersion: row.version,
      resultingVersion: row.version,
      resultingStatus: row.status,
    });
  }
  const resultingVersion = row.version + 1;
  await client.query(
    `update crays_core.clubs_access_entitlements
     set status=$2,version=$3,updated_at=now(),
       activated_at=case when $2='active' then now() else activated_at end,
       consumed_at=case when $2='consumed' then now() else consumed_at end,
       revoked_at=case when $2='revoked' then now() else revoked_at end
     where access_entitlement_id=$1 and version=$4`,
    [
      row.access_entitlement_id,
      transition.status,
      resultingVersion,
      row.version,
    ],
  );
  await appendEvent(client, {
    aggregateType: "entitlement",
    aggregateId: row.access_entitlement_id,
    eventType: transition.status,
    actorAccountId: input.accountId,
    actorType: input.actorType,
    fromStatus: row.status,
    toStatus: transition.status,
    fromVersion: row.version,
    toVersion: resultingVersion,
    reason: input.command.reason,
    correlationId: input.correlationId,
  });
  return finish(client, input.requestId, {
    outcome: "applied",
    reason: null,
    aggregateType: "entitlement",
    aggregateId: row.access_entitlement_id,
    previousVersion: row.version,
    resultingVersion,
    resultingStatus: transition.status,
  });
}

function validateServiceCommandInput(input: ClubsServiceCommandInput) {
  validate(input.command);
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(input.idempotencyKey)) {
    throw new Error("A strong idempotency key is required.");
  }
}

export async function executeClubsServiceCommand(
  input: ClubsServiceCommandInput,
): Promise<ClubsServiceReceipt> {
  validateServiceCommandInput(input);
  return transaction((client) =>
    executeClubsServiceCommandWithClient(client, input),
  );
}

export async function executeClubsServiceCommandWithClient(
  client: PoolClient,
  input: ClubsServiceCommandInput,
): Promise<ClubsServiceReceipt> {
  validateServiceCommandInput(input);
  const payloadSha256 = hash(input.command);
  const requestId = id("clubs_service_command");
  const targetId =
    "propertyId" in input.command
      ? input.command.propertyId
      : "offeringId" in input.command
        ? input.command.offeringId
        : "bookingId" in input.command
          ? input.command.bookingId
          : "selectionId" in input.command
            ? input.command.selectionId
            : input.command.entitlementId;
  const inserted = await client.query(
    `insert into crays_core.clubs_service_command_requests
        (service_command_request_id,idempotency_key,correlation_id,
         actor_account_id,actor_type,command_type,target_id,expected_version,payload_sha256)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (actor_account_id,idempotency_key) do nothing
       returning service_command_request_id`,
    [
      requestId,
      input.idempotencyKey,
      input.correlationId,
      input.accountId,
      input.actorType,
      input.command.type,
      targetId,
      "expectedVersion" in input.command ? input.command.expectedVersion : null,
      payloadSha256,
    ],
  );
  if ((inserted.rowCount ?? 0) === 0) {
    const replay = await client.query<{
      service_command_request_id: string;
      payload_sha256: string;
      service_command_receipt_id: string;
      outcome: Outcome;
      reason: string | null;
      aggregate_type: ClubsServiceReceipt["aggregateType"];
      aggregate_id: string | null;
      previous_version: number | null;
      resulting_version: number | null;
      resulting_status: string | null;
    }>(
      `select request.service_command_request_id,request.payload_sha256,
           receipt.service_command_receipt_id,receipt.outcome,receipt.reason,
           receipt.aggregate_type,receipt.aggregate_id,receipt.previous_version,
           receipt.resulting_version,receipt.resulting_status
         from crays_core.clubs_service_command_requests request
         join lateral (
           select * from crays_core.clubs_service_command_receipts
           where service_command_request_id=request.service_command_request_id
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
      receiptId: row.service_command_receipt_id,
      requestId: row.service_command_request_id,
      outcome: row.outcome,
      reason: row.reason,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      previousVersion: row.previous_version,
      resultingVersion: row.resulting_version,
      resultingStatus: row.resulting_status,
      replayed: true,
    };
  }
  const common = { ...input, requestId };
  if (
    input.command.type === "create_offering" ||
    input.command.type === "transition_offering"
  ) {
    return offeringCommand(client, { ...common, command: input.command });
  }
  if (input.command.type === "request_service") {
    return requestService(client, { ...common, command: input.command });
  }
  if (
    ["cancel_service", "confirm_service", "fulfil_service"].includes(
      input.command.type,
    )
  ) {
    return selectionTransition(client, {
      ...common,
      command: input.command as SelectionTransition,
    });
  }
  if (input.command.type === "issue_entitlement") {
    return issueEntitlement(client, { ...common, command: input.command });
  }
  return entitlementTransition(client, {
    ...common,
    command: input.command as EntitlementTransition,
  });
}

export async function readTeamServiceOfferings(input: {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: string;
}) {
  const result = await getCorePgPool().query<{
    service_offering_id: string;
    property_id: string;
    service_code: string;
    service_type: string;
    display_name: string;
    fulfillment_mode: string;
    charge_mode: string;
    commerce_product_reference: string | null;
    commerce_variant_reference: string | null;
    lifecycle: string;
    version: number;
  }>(
    `select offering.service_offering_id,offering.property_id,
       offering.service_code,offering.service_type,offering.display_name,
       offering.fulfillment_mode,offering.charge_mode,
       offering.commerce_product_reference,offering.commerce_variant_reference,
       offering.lifecycle,offering.version
     from crays_core.clubs_service_offerings offering
     join crays_core.clubs_properties property on property.property_id=offering.property_id
     join crays_core.franchise_operator_tenants operator
       on operator.partner_tenant_id=property.partner_tenant_id
       and operator.status='active'
     where exists (
       select 1 from crays_core.tenant_sessions session
       where session.session_id=$2 and session.account_id=$1
         and session.organization_id=$3 and session.role_key=$4
         and session.status='active' and session.expires_at>now()
     )
     and (
       ($4='holiday-manager' and operator.organization_id=$3 and exists (
         select 1 from crays_core.partner_role_scopes scope
         where scope.account_id=$1 and scope.property_id=offering.property_id
           and scope.status='active' and scope.valid_from<=now()
           and (scope.valid_until is null or scope.valid_until>now())
           and scope.capabilities @> '["clubs.holiday.reservation.operate"]'::jsonb
       ))
       or ($4 in ('crays-management','admin') and exists (
         select 1
         from crays_core.organization_memberships membership
         join crays_core.role_assignments role_assignment
           on role_assignment.account_id=membership.account_id
          and role_assignment.organization_id=membership.organization_id
          and role_assignment.role_key=membership.role_key
          and role_assignment.status='active'
         where membership.account_id=$1
           and membership.organization_id=$3
           and membership.role_key=$4
           and membership.status='active'
       ))
     )
     order by offering.display_name,offering.service_offering_id limit 200`,
    [
      input.accountId,
      input.tenantSessionId,
      input.organizationId,
      input.roleKey,
    ],
  );
  return result.rows.map((row) => ({
    offeringId: row.service_offering_id,
    propertyId: row.property_id,
    serviceCode: row.service_code,
    serviceType: row.service_type,
    displayName: row.display_name,
    fulfillmentMode: row.fulfillment_mode,
    chargeMode: row.charge_mode,
    commerceProductReference: row.commerce_product_reference,
    commerceVariantReference: row.commerce_variant_reference,
    lifecycle: row.lifecycle,
    version: row.version,
  }));
}

export async function readOwnServicesAndEntitlementsWithQueryable(
  queryable: ClubsServiceQueryable,
  accountId: string,
) {
  const availableOfferings = await queryable.query<{
    booking_id: string;
    booking_reference: string;
    property_id: string;
    service_offering_id: string;
    service_code: string;
    service_type: string;
    display_name: string;
    fulfillment_mode: string;
    charge_mode: string;
    version: number;
  }>(
    `select booking.booking_id,booking.public_reference booking_reference,
       booking.property_id,offering.service_offering_id,offering.service_code,
       offering.service_type,offering.display_name,offering.fulfillment_mode,
       offering.charge_mode,offering.version
     from crays_core.clubs_bookings booking
     join crays_core.clubs_service_offerings offering
       on offering.property_id=booking.property_id
      and offering.lifecycle='published'
     where booking.account_id=$1
       and booking.status in ('confirmed','change_requested','in_stay')
     order by booking.confirmed_at desc,offering.display_name,
       offering.service_offering_id limit 200`,
    [accountId],
  );
  const services = await queryable.query<{
    booking_service_selection_id: string;
    public_reference: string;
    booking_id: string;
    booking_reference: string;
    display_name: string;
    service_type: string;
    charge_mode: string;
    quantity: number;
    status: string;
    version: number;
    requested_for: Date | null;
  }>(
    `select selection.booking_service_selection_id,selection.public_reference,
       selection.booking_id,booking.public_reference booking_reference,
       offering.display_name,offering.service_type,offering.charge_mode,
       selection.quantity,selection.status,selection.version,selection.requested_for
     from crays_core.clubs_booking_service_selections selection
     join crays_core.clubs_bookings booking on booking.booking_id=selection.booking_id
     join crays_core.clubs_service_offerings offering
       on offering.service_offering_id=selection.service_offering_id
     where booking.account_id=$1 order by selection.updated_at desc limit 100`,
    [accountId],
  );
  const entitlements = await queryable.query<{
    access_entitlement_id: string;
    public_reference: string;
    booking_id: string;
    scope_key: string;
    status: string;
    version: number;
    valid_from: Date;
    valid_until: Date;
  }>(
    `select entitlement.access_entitlement_id,entitlement.public_reference,
       entitlement.booking_id,entitlement.scope_key,entitlement.status,
       entitlement.version,entitlement.valid_from,entitlement.valid_until
     from crays_core.clubs_access_entitlements entitlement
     join crays_core.clubs_bookings booking on booking.booking_id=entitlement.booking_id
     where booking.account_id=$1 order by entitlement.updated_at desc limit 100`,
    [accountId],
  );
  return {
    availableOfferings: availableOfferings.rows.map((row) => ({
      bookingId: row.booking_id,
      bookingReference: row.booking_reference,
      propertyId: row.property_id,
      offeringId: row.service_offering_id,
      serviceCode: row.service_code,
      serviceType: row.service_type,
      displayName: row.display_name,
      fulfillmentMode: row.fulfillment_mode,
      chargeMode: row.charge_mode,
      version: row.version,
      price: null,
      paymentAuthority: false,
    })),
    services: services.rows.map((row) => ({
      selectionId: row.booking_service_selection_id,
      publicReference: row.public_reference,
      bookingId: row.booking_id,
      bookingReference: row.booking_reference,
      displayName: row.display_name,
      serviceType: row.service_type,
      chargeMode: row.charge_mode,
      quantity: row.quantity,
      status: row.status,
      version: row.version,
      requestedFor: row.requested_for?.toISOString() ?? null,
      paymentStatus: null,
    })),
    entitlements: entitlements.rows.map((row) => ({
      entitlementId: row.access_entitlement_id,
      publicReference: row.public_reference,
      bookingId: row.booking_id,
      scopeKey: row.scope_key,
      status: row.status,
      version: row.version,
      validFrom: row.valid_from.toISOString(),
      validUntil: row.valid_until.toISOString(),
      providerCredential: null,
    })),
  };
}

export async function readOwnServicesAndEntitlements(accountId: string) {
  return readOwnServicesAndEntitlementsWithQueryable(
    getCorePgPool(),
    accountId,
  );
}

export async function readTeamServiceQueue(input: {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: string;
  focus?: {
    kind: "service" | "entitlement";
    recordId: string;
    version: number;
  } | null;
}) {
  const result = await getCorePgPool().query<{
    selection_id: string | null;
    selection_reference: string | null;
    selection_status: string | null;
    selection_version: number | null;
    display_name: string | null;
    service_type: string | null;
    charge_mode: string | null;
    quantity: number | null;
    booking_id: string;
    booking_reference: string;
    booking_account_id: string;
    property_id: string;
    stay_status: string;
    arrival_date: string;
    departure_date: string;
    entitlement_id: string | null;
    entitlement_reference: string | null;
    entitlement_status: string | null;
    entitlement_version: number | null;
    scope_key: string | null;
    valid_from: Date | null;
    valid_until: Date | null;
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
         on true
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
     )
     , base_bookings as (
       select booking.booking_id,booking.public_reference booking_reference,
         booking.account_id booking_account_id,booking.property_id,
         booking.updated_at booking_updated_at,
         reservation.arrival_date::text arrival_date,
         reservation.departure_date::text departure_date,stay.status stay_status
       from crays_core.clubs_bookings booking
       join authorized_properties scope on scope.property_id=booking.property_id
       join crays_core.clubs_reservations reservation
         on reservation.reservation_id=booking.reservation_id
        join crays_core.clubs_stays stay on stay.booking_id=booking.booking_id
        join crays_core.clubs_units unit
          on unit.unit_id=booking.unit_id and unit.property_id=booking.property_id
         and unit.lifecycle not in ('suspended','archived')
       where booking.status in ('confirmed','change_requested','in_stay')
     ), work_items as (
       select selection.booking_service_selection_id selection_id,
         selection.public_reference selection_reference,
         selection.status selection_status,selection.version selection_version,
         offering.display_name,offering.service_type,offering.charge_mode,
         selection.quantity,booking.booking_id,booking.booking_reference,
         booking.booking_account_id,booking.property_id,booking.arrival_date,
         booking.departure_date,booking.stay_status,
         null::text entitlement_id,null::text entitlement_reference,
         null::text entitlement_status,null::integer entitlement_version,
         null::text scope_key,null::timestamptz valid_from,null::timestamptz valid_until,
         case when selection.status='requested' then 0 else 2 end priority,
         booking.booking_updated_at
       from base_bookings booking
       join crays_core.clubs_booking_service_selections selection
         on selection.booking_id=booking.booking_id
        and selection.status in ('requested','confirmed','fulfilled')
       join crays_core.clubs_service_offerings offering
         on offering.service_offering_id=selection.service_offering_id
       union all
       select null::text selection_id,null::text selection_reference,
         null::text selection_status,null::integer selection_version,
         null::text display_name,null::text service_type,null::text charge_mode,
         null::integer quantity,booking.booking_id,booking.booking_reference,
         booking.booking_account_id,booking.property_id,booking.arrival_date,
         booking.departure_date,booking.stay_status,
         entitlement.access_entitlement_id entitlement_id,
         entitlement.public_reference entitlement_reference,
         entitlement.status entitlement_status,entitlement.version entitlement_version,
         entitlement.scope_key,entitlement.valid_from,entitlement.valid_until,
         case when entitlement.status='pending' then 1 else 2 end priority,
         booking.booking_updated_at
       from base_bookings booking
       join crays_core.clubs_access_entitlements entitlement
         on entitlement.booking_id=booking.booking_id
        and entitlement.status in ('pending','active','suspended')
      ), ranked_items as (
        select work_items.*,row_number() over(order by priority,booking_updated_at desc,
          case when selection_id is not null then 0 else 1 end,
          coalesce(selection_id,entitlement_id)) queue_rank
        from work_items
      )
      select selection_id,selection_reference,selection_status,selection_version,
       display_name,service_type,charge_mode,quantity,booking_id,
       booking_reference,booking_account_id,property_id,arrival_date,
       departure_date,stay_status,entitlement_id,entitlement_reference,
       entitlement_status,entitlement_version,scope_key,valid_from,valid_until
      from ranked_items
      where queue_rank<=150
        or ($5='service' and selection_id=$6 and selection_status='requested')
        or ($5='entitlement' and entitlement_id=$6 and entitlement_status='pending'
          and valid_from<=now() and valid_until>now())
      order by queue_rank`,
    [
      input.accountId,
      input.tenantSessionId,
      input.organizationId,
      input.roleKey,
      input.focus?.kind ?? "",
      input.focus?.recordId ?? "",
    ],
  );
  return result.rows.map((row) => ({
    selectionId: row.selection_id,
    selectionReference: row.selection_reference,
    selectionStatus: row.selection_status,
    selectionVersion: row.selection_version,
    displayName: row.display_name,
    serviceType: row.service_type,
    chargeMode: row.charge_mode,
    quantity: row.quantity,
    bookingId: row.booking_id,
    bookingReference: row.booking_reference,
    bookingAccountId: row.booking_account_id,
    propertyId: row.property_id,
    stayStatus: row.stay_status,
    arrivalDate: row.arrival_date,
    departureDate: row.departure_date,
    entitlementId: row.entitlement_id,
    entitlementReference: row.entitlement_reference,
    entitlementStatus: row.entitlement_status,
    entitlementVersion: row.entitlement_version,
    scopeKey: row.scope_key,
    validFrom: row.valid_from?.toISOString() ?? null,
    validUntil: row.valid_until?.toISOString() ?? null,
    paymentStatus: null,
    providerCredential: null,
  }));
}
