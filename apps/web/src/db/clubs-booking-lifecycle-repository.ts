import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { lockClubsInventoryRange } from "@/db/clubs-availability-lock-repository";
import { getCorePgPool } from "@/db/client";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";

type ConfirmCommand = {
  type: "confirm_request";
  requestId: string;
  expectedVersion: number;
};
type BookingCommand = {
  type: "cancel_booking";
  bookingId: string;
  expectedVersion: number;
  reason: string;
} | {
  type: "mark_no_show";
  bookingId: string;
  expectedVersion: number;
  expectedStayVersion: number;
  reason: string;
};
type StayCommand = {
  type: "mark_ready" | "check_in" | "check_out";
  stayId: string;
  expectedVersion: number;
  reason: string;
};
type GuestCommand =
  | {
      type: "assign_guest";
      bookingId: string;
      expectedVersion: number;
      guestReference: string;
      displayLabel: string;
      guestAccountId?: string;
    }
  | {
      type: "remove_guest";
      guestId: string;
      expectedVersion: number;
      reason: string;
    };
type ChangeCommand =
  | {
      type: "submit_change";
      bookingId: string;
      expectedVersion: number;
      changeType: "dates" | "guest_assignment" | "cancellation" | "other";
      requestedChange: Record<string, unknown>;
    }
  | {
      type: "cancel_change";
      changeRequestId: string;
      expectedVersion: number;
      reason: string;
    }
  | {
      type: "begin_change_review" | "approve_change" | "reject_change";
      changeRequestId: string;
      expectedVersion: number;
      reason: string;
    };

export type BookingLifecycleCommand =
  | ConfirmCommand
  | BookingCommand
  | StayCommand
  | GuestCommand
  | ChangeCommand;

type Outcome = "applied" | "conflict" | "denied" | "invalid" | "noop";
export type BookingLifecycleReceipt = {
  receiptId: string;
  requestId: string;
  outcome: Outcome;
  reason: string | null;
  aggregateType: "reservation" | "booking" | "stay" | "guest" | "change_request" | null;
  aggregateId: string | null;
  previousVersion: number | null;
  resultingVersion: number | null;
  resultingStatus: string | null;
  replayed: boolean;
};

type ConfirmationRow = {
  booking_request_id: string;
  request_version: number;
  request_status: string;
  account_id: string;
  property_id: string;
  unit_id: string;
  quote_snapshot_id: string;
  reservation_hold_id: string;
  hold_version: number;
  hold_status: string;
  expires_at: Date;
  inventory_calendar_id: string;
  arrival_date: string;
  departure_date: string;
  reserved_capacity: number;
  seller_snapshot: Record<string, unknown>;
  pricing_snapshot_sha256: string;
};

type CapacityLedgerDay = {
  inventoryDayId: string;
  localDate: string;
};

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function publicReference(prefix: string) {
  return `${prefix}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function identifier(value: string, label: string) {
  if (!/^[A-Za-z0-9:_.-]{3,180}$/.test(value)) throw new Error(`${label} is invalid.`);
}

function expectedVersion(value: number) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("Expected version is invalid.");
}

function reason(value: string) {
  if (value.trim().length < 3 || value.trim().length > 500) {
    throw new Error("A concise operational reason is required.");
  }
}

function validateCommand(command: BookingLifecycleCommand) {
  if ("expectedVersion" in command) expectedVersion(command.expectedVersion);
  if ("expectedStayVersion" in command) expectedVersion(command.expectedStayVersion);
  if ("reason" in command) reason(command.reason);
  if ("requestId" in command) identifier(command.requestId, "Booking Request");
  if ("bookingId" in command) identifier(command.bookingId, "Booking");
  if ("stayId" in command) identifier(command.stayId, "Stay");
  if ("guestId" in command) identifier(command.guestId, "Guest");
  if ("changeRequestId" in command) identifier(command.changeRequestId, "Change Request");
  if (command.type === "assign_guest") {
    identifier(command.guestReference, "Guest reference");
    if (command.guestAccountId) identifier(command.guestAccountId, "Guest account");
    if (command.displayLabel.trim().length < 2 || command.displayLabel.trim().length > 120) {
      throw new Error("Guest display label is invalid.");
    }
  }
  if (command.type === "submit_change") {
    const serialized = JSON.stringify(command.requestedChange);
    if (serialized === "{}" || serialized.length > 8_000) {
      throw new Error("Requested change must be a bounded non-empty object.");
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
  if (!input.tenantSessionId || !input.organizationId || !input.roleKey) return false;
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
            and property.lifecycle not in ('suspended','archived')
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
    [input.accountId, input.tenantSessionId, input.organizationId, input.roleKey, input.propertyId],
  );
  return result.rows[0]?.allowed === true;
}

async function appendReceipt(
  client: PoolClient,
  input: Omit<BookingLifecycleReceipt, "receiptId" | "replayed">,
) {
  const receiptId = id("clubs_booking_lifecycle_receipt");
  await client.query(
    `insert into crays_core.clubs_booking_lifecycle_command_receipts
      (booking_lifecycle_command_receipt_id,booking_lifecycle_command_request_id,
       outcome,reason,aggregate_type,aggregate_id,previous_version,
       resulting_version,resulting_status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      receiptId, input.requestId, input.outcome, input.reason,
      input.aggregateType, input.aggregateId, input.previousVersion,
      input.resultingVersion, input.resultingStatus,
    ],
  );
  return { ...input, receiptId, replayed: false } satisfies BookingLifecycleReceipt;
}

async function appendEvent(
  client: PoolClient,
  input: {
    aggregateType: Exclude<BookingLifecycleReceipt["aggregateType"], null>;
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
    `insert into crays_core.clubs_booking_lifecycle_events
      (booking_lifecycle_event_id,aggregate_type,aggregate_id,event_type,
       actor_account_id,actor_type,from_status,to_status,from_version,to_version,
       reason,correlation_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      id("clubs_booking_lifecycle_event"), input.aggregateType, input.aggregateId,
      input.eventType, input.actorAccountId, input.actorType, input.fromStatus,
      input.toStatus, input.fromVersion, input.toVersion, input.reason ?? null,
      input.correlationId,
    ],
  );
}

async function complete(
  client: PoolClient,
  requestId: string,
  receipt: Omit<BookingLifecycleReceipt, "receiptId" | "requestId" | "replayed">,
) {
  await client.query(
    `update crays_core.clubs_booking_lifecycle_command_requests
     set status=$2,completed_at=now()
     where booking_lifecycle_command_request_id=$1`,
    [requestId, receipt.outcome],
  );
  return appendReceipt(client, { requestId, ...receipt });
}

async function convertHeldCapacity(client: PoolClient, row: ConfirmationRow) {
  const lock = await lockClubsInventoryRange(client, {
    inventoryCalendarId: row.inventory_calendar_id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    arrivalDate: row.arrival_date,
    departureDate: row.departure_date,
    requestedCapacity: row.reserved_capacity,
  });
  if (lock.days.length !== lock.nights + 1) {
    throw new Error("Inventory range is incomplete; confirmation failed closed.");
  }
  for (const day of lock.days.slice(0, -1)) {
    const updated = await client.query(
      `update crays_core.clubs_inventory_days
       set held_capacity=held_capacity-$2,booked_capacity=booked_capacity+$2,
           version=version+1,updated_at=now()
       where inventory_day_id=$1 and held_capacity>=$2`,
      [day.inventoryDayId, row.reserved_capacity],
    );
    if ((updated.rowCount ?? 0) !== 1) {
      throw new Error("Held capacity changed concurrently; confirmation rolled back.");
    }
  }
  return lock.days.slice(0, -1).map((day) => ({
    inventoryDayId: day.inventoryDayId,
    localDate: day.date,
  })) satisfies CapacityLedgerDay[];
}

async function appendCapacityLedgerMovements(
  client: PoolClient,
  input: {
    movementType: "allocate" | "release";
    bookingId: string;
    reservationId: string;
    inventoryCalendarId: string;
    propertyId: string;
    unitId: string;
    capacityUnits: number;
    requestId: string;
    receiptId: string;
    correlationId: string;
    days: CapacityLedgerDay[];
  },
) {
  for (const day of input.days) {
    await client.query(
      `insert into crays_core.clubs_booking_capacity_ledger
        (booking_capacity_ledger_id,booking_id,reservation_id,
         inventory_calendar_id,inventory_day_id,property_id,unit_id,local_date,
         movement_type,capacity_units,booking_lifecycle_command_request_id,
         booking_lifecycle_command_receipt_id,correlation_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        id("clubs_booking_capacity_ledger"), input.bookingId, input.reservationId,
        input.inventoryCalendarId, day.inventoryDayId, input.propertyId,
        input.unitId, day.localDate, input.movementType, input.capacityUnits,
        input.requestId, input.receiptId, input.correlationId,
      ],
    );
  }
}

async function releaseBookedCapacity(
  client: PoolClient,
  input: {
    inventoryCalendarId: string;
    propertyId: string;
    unitId: string;
    arrivalDate: string;
    departureDate: string;
    reservedCapacity: number;
    bookingId: string;
    reservationId: string;
  },
) {
  const lock = await lockClubsInventoryRange(client, {
    inventoryCalendarId: input.inventoryCalendarId,
    propertyId: input.propertyId,
    unitId: input.unitId,
    arrivalDate: input.arrivalDate,
    departureDate: input.departureDate,
    requestedCapacity: input.reservedCapacity,
  });
  if (lock.days.length !== lock.nights + 1) {
    throw new Error("Inventory range is incomplete; release failed closed.");
  }
  const stayDays = lock.days.slice(0, -1);
  const allocation = await client.query<{
    inventory_day_id: string;
    local_date: string;
    inventory_calendar_id: string;
    property_id: string;
    unit_id: string;
    capacity_units: number;
    release_id: string | null;
  }>(
    `select allocation.inventory_day_id,allocation.local_date::text,
       allocation.inventory_calendar_id,allocation.property_id,allocation.unit_id,
       allocation.capacity_units,release.booking_capacity_ledger_id release_id
     from crays_core.clubs_booking_capacity_ledger allocation
     left join crays_core.clubs_booking_capacity_ledger release
       on release.booking_id=allocation.booking_id
      and release.inventory_day_id=allocation.inventory_day_id
      and release.movement_type='release'
     where allocation.booking_id=$1 and allocation.reservation_id=$2
       and allocation.movement_type='allocate'
       and allocation.local_date >= $3::date
       and allocation.local_date < $4::date
     order by allocation.local_date asc
     for update of allocation`,
    [input.bookingId, input.reservationId, input.arrivalDate, input.departureDate],
  );
  const ownershipMatches = allocation.rows.length === stayDays.length
    && allocation.rows.every((owned, index) => {
      const day = stayDays[index];
      return owned.inventory_day_id === day.inventoryDayId
        && owned.local_date === day.date
        && owned.inventory_calendar_id === input.inventoryCalendarId
        && owned.property_id === input.propertyId
        && owned.unit_id === input.unitId
        && owned.capacity_units === input.reservedCapacity
        && owned.release_id === null;
    });
  if (!ownershipMatches) {
    return {
      released: false as const,
      reason: "booking_capacity_allocation_reconciliation_required" as const,
      days: [] as CapacityLedgerDay[],
    };
  }
  const dayReconciliation = await client.query<{
    inventory_day_id: string;
    stored_booked_capacity: number;
    ledger_outstanding_capacity: number;
    reconciliation_status: "matched" | "conflict";
  }>(
    `select inventory_day_id,stored_booked_capacity,
       ledger_outstanding_capacity,reconciliation_status
     from crays_core.clubs_booking_capacity_day_reconciliation
     where inventory_day_id=any($1::text[])
     order by local_date asc`,
    [stayDays.map((day) => day.inventoryDayId)],
  );
  if (
    dayReconciliation.rows.length !== stayDays.length
    || dayReconciliation.rows.some((day, index) =>
      day.inventory_day_id !== stayDays[index].inventoryDayId
      || day.reconciliation_status !== "matched"
      || day.stored_booked_capacity !== stayDays[index].bookedCapacity
      || day.ledger_outstanding_capacity !== stayDays[index].bookedCapacity)
  ) {
    return {
      released: false as const,
      reason: "booking_capacity_aggregate_reconciliation_required" as const,
      days: [] as CapacityLedgerDay[],
    };
  }
  for (const day of stayDays) {
    const updated = await client.query(
      `update crays_core.clubs_inventory_days
       set booked_capacity=booked_capacity-$2,version=version+1,updated_at=now()
       where inventory_day_id=$1 and booked_capacity>=$2`,
      [day.inventoryDayId, input.reservedCapacity],
    );
    if ((updated.rowCount ?? 0) !== 1) {
      throw new Error("Booked capacity changed concurrently; release rolled back.");
    }
  }
  return {
    released: true as const,
    reason: null,
    days: stayDays.map((day) => ({
      inventoryDayId: day.inventoryDayId,
      localDate: day.date,
    })) satisfies CapacityLedgerDay[],
  };
}

async function confirmRequest(
  client: PoolClient,
  input: {
    accountId: string;
    actorType: string;
    tenantSessionId?: string;
    organizationId?: string;
    roleKey?: string;
    command: ConfirmCommand;
    requestId: string;
    correlationId: string;
  },
) {
  const result = await client.query<ConfirmationRow>(
    `select request.booking_request_id,request.version request_version,
       request.status request_status,request.account_id,request.property_id,
       request.unit_id,request.quote_snapshot_id,request.reservation_hold_id,
       hold.version hold_version,hold.status hold_status,hold.expires_at,
       hold.inventory_calendar_id,hold.arrival_date::text,hold.departure_date::text,
       hold.reserved_capacity,quote.seller_snapshot,quote.pricing_snapshot_sha256
     from crays_core.clubs_booking_requests request
     join crays_core.clubs_reservation_holds hold
       on hold.reservation_hold_id=request.reservation_hold_id
     join crays_core.clubs_quote_snapshots quote
       on quote.quote_snapshot_id=request.quote_snapshot_id
     where request.booking_request_id=$1
     for update of request,hold`,
    [input.command.requestId],
  );
  const row = result.rows[0];
  if (
    !row
    || !(await authorizedProperty(client, {
      accountId: input.accountId,
      tenantSessionId: input.tenantSessionId,
      organizationId: input.organizationId,
      roleKey: input.roleKey,
      propertyId: row.property_id,
    }))
  ) {
    return complete(client, input.requestId, {
      outcome: "denied", reason: "authorized_accepted_request_required",
      aggregateType: null, aggregateId: null, previousVersion: null,
      resultingVersion: null, resultingStatus: null,
    });
  }
  if (row.request_version !== input.command.expectedVersion) {
    return complete(client, input.requestId, {
      outcome: "conflict", reason: "booking_request_version_conflict",
      aggregateType: "booking", aggregateId: row.booking_request_id,
      previousVersion: row.request_version, resultingVersion: row.request_version,
      resultingStatus: row.request_status,
    });
  }
  if (row.request_status !== "accepted") {
    return complete(client, input.requestId, {
      outcome: "noop", reason: `request_not_confirmable_from_${row.request_status}`,
      aggregateType: "booking", aggregateId: row.booking_request_id,
      previousVersion: row.request_version, resultingVersion: row.request_version,
      resultingStatus: row.request_status,
    });
  }
  if (row.hold_status !== "active" || row.expires_at.getTime() <= Date.now()) {
    return complete(client, input.requestId, {
      outcome: "conflict", reason: "active_unexpired_hold_required",
      aggregateType: "booking", aggregateId: row.booking_request_id,
      previousVersion: row.request_version, resultingVersion: row.request_version,
      resultingStatus: row.request_status,
    });
  }

  const reservationId = id("clubs_reservation");
  const bookingId = id("clubs_booking");
  const stayId = id("clubs_stay");
  const allocatedDays = await convertHeldCapacity(client, row);
  const reservationReference = publicReference("RSV");
  const bookingReference = publicReference("BK");
  await client.query(
    `insert into crays_core.clubs_reservations
      (reservation_id,public_reference,booking_request_id,quote_snapshot_id,
       reservation_hold_id,account_id,property_id,unit_id,arrival_date,
       departure_date,reserved_capacity,seller_snapshot,pricing_snapshot_sha256)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      reservationId, reservationReference, row.booking_request_id,
      row.quote_snapshot_id, row.reservation_hold_id, row.account_id,
      row.property_id, row.unit_id, row.arrival_date, row.departure_date,
      row.reserved_capacity, row.seller_snapshot, row.pricing_snapshot_sha256,
    ],
  );
  await client.query(
    `insert into crays_core.clubs_bookings
      (booking_id,public_reference,reservation_id,account_id,property_id,unit_id)
     values ($1,$2,$3,$4,$5,$6)`,
    [bookingId, bookingReference, reservationId, row.account_id, row.property_id, row.unit_id],
  );
  await client.query(
    `insert into crays_core.clubs_stays
      (stay_id,booking_id,reservation_id,property_id,unit_id)
     values ($1,$2,$3,$4,$5)`,
    [stayId, bookingId, reservationId, row.property_id, row.unit_id],
  );
  await client.query(
    `insert into crays_core.clubs_booking_guests
      (booking_guest_id,booking_id,guest_role,account_id,guest_reference,display_label)
     values ($1,$2,'primary',$3,$4,'Primary booker')`,
    [id("clubs_booking_guest"), bookingId, row.account_id, `account:${row.account_id}`],
  );
  const holdVersion = row.hold_version + 1;
  const requestVersion = row.request_version + 1;
  await client.query(
    `update crays_core.clubs_reservation_holds
     set status='converted',version=$2,converted_at=now(),updated_at=now()
     where reservation_hold_id=$1 and status='active' and version=$3`,
    [row.reservation_hold_id, holdVersion, row.hold_version],
  );
  await client.query(
    `update crays_core.clubs_booking_requests
     set version=$2,updated_at=now()
     where booking_request_id=$1 and version=$3`,
    [row.booking_request_id, requestVersion, row.request_version],
  );
  await client.query(
    `insert into crays_core.clubs_reservation_hold_events
      (reservation_hold_event_id,reservation_hold_id,event_type,actor_type,
       actor_account_id,from_status,to_status,from_version,to_version,
       capacity_delta,correlation_id)
     values ($1,$2,'converted','booking-core',$3,'active','converted',$4,$5,$6,$7)`,
    [
      id("clubs_hold_event"), row.reservation_hold_id, input.accountId,
      row.hold_version, holdVersion, -row.reserved_capacity,
      `${input.correlationId}:hold-converted`,
    ],
  );
  for (const event of [
    { aggregateType: "reservation" as const, aggregateId: reservationId, eventType: "confirmed", status: "confirmed" },
    { aggregateType: "booking" as const, aggregateId: bookingId, eventType: "confirmed", status: "confirmed" },
    { aggregateType: "stay" as const, aggregateId: stayId, eventType: "created", status: "not_started" },
  ]) {
    await appendEvent(client, {
      ...event, actorAccountId: input.accountId, actorType: input.actorType,
      fromStatus: null, toStatus: event.status, fromVersion: null, toVersion: 1,
      correlationId: input.correlationId,
    });
  }
  const receipt = await complete(client, input.requestId, {
    outcome: "applied", reason: null, aggregateType: "booking",
    aggregateId: bookingId, previousVersion: null, resultingVersion: 1,
    resultingStatus: "confirmed",
  });
  await appendCapacityLedgerMovements(client, {
    movementType: "allocate", bookingId, reservationId,
    inventoryCalendarId: row.inventory_calendar_id,
    propertyId: row.property_id, unitId: row.unit_id,
    capacityUnits: row.reserved_capacity, requestId: input.requestId,
    receiptId: receipt.receiptId, correlationId: input.correlationId,
    days: allocatedDays,
  });
  return receipt;
}

async function bookingTerminalCommand(
  client: PoolClient,
  input: {
    accountId: string;
    actorType: string;
    tenantSessionId?: string;
    organizationId?: string;
    roleKey?: string;
    command: BookingCommand;
    requestId: string;
    correlationId: string;
    evaluationAt?: Date;
  },
) {
  const result = await client.query<{
    booking_id: string; booking_status: string; booking_version: number;
    reservation_id: string; reservation_status: string; reservation_version: number;
    stay_id: string; stay_status: string; stay_version: number;
    property_id: string; unit_id: string;
    arrival_date: string; departure_date: string; reserved_capacity: number;
    inventory_calendar_id: string; hold_status: string;
    store_timezone: string; local_business_date: string;
  }>(
    `select booking.booking_id,booking.status booking_status,
       booking.version booking_version,reservation.reservation_id,
       reservation.status reservation_status,reservation.version reservation_version,
       stay.stay_id,stay.status stay_status,stay.version stay_version,
       booking.property_id,booking.unit_id,
       reservation.arrival_date::text,reservation.departure_date::text,
       reservation.reserved_capacity,hold.inventory_calendar_id,hold.status hold_status,
       store.timezone store_timezone,
       ($2::timestamptz at time zone store.timezone)::date::text local_business_date
     from crays_core.clubs_bookings booking
     join crays_core.clubs_reservations reservation
       on reservation.reservation_id=booking.reservation_id
     join crays_core.clubs_stays stay on stay.booking_id=booking.booking_id
     join crays_core.clubs_reservation_holds hold
       on hold.reservation_hold_id=reservation.reservation_hold_id
     join crays_core.clubs_properties property
       on property.property_id=booking.property_id
      and property.lifecycle not in ('suspended','archived')
     join crays_core.stores store
       on store.store_id=property.store_id and store.vertical_root='clubs'
     where booking.booking_id=$1
     for update of booking,reservation,stay`,
     [input.command.bookingId, (input.evaluationAt ?? new Date()).toISOString()],
  );
  const row = result.rows[0];
  if (
    !row
    || !(await authorizedProperty(client, {
      accountId: input.accountId, tenantSessionId: input.tenantSessionId,
      organizationId: input.organizationId, roleKey: input.roleKey,
      propertyId: row.property_id,
    }))
  ) {
    return complete(client, input.requestId, {
      outcome: "denied", reason: "authorized_booking_required",
      aggregateType: null, aggregateId: null, previousVersion: null,
      resultingVersion: null, resultingStatus: null,
    });
  }
  if (row.booking_version !== input.command.expectedVersion) {
    return complete(client, input.requestId, {
      outcome: "conflict", reason: "booking_version_conflict",
      aggregateType: "booking", aggregateId: row.booking_id,
      previousVersion: row.booking_version, resultingVersion: row.booking_version,
      resultingStatus: row.booking_status,
    });
  }
  if (input.command.type === "mark_no_show" && row.stay_version !== input.command.expectedStayVersion) {
    return complete(client, input.requestId, {
      outcome: "conflict", reason: "stay_version_conflict",
      aggregateType: "stay", aggregateId: row.stay_id,
      previousVersion: row.stay_version, resultingVersion: row.stay_version,
      resultingStatus: row.stay_status,
    });
  }
  if (!["confirmed", "change_requested"].includes(row.booking_status)) {
    return complete(client, input.requestId, {
      outcome: "noop", reason: `booking_not_terminal_from_${row.booking_status}`,
      aggregateType: "booking", aggregateId: row.booking_id,
      previousVersion: row.booking_version, resultingVersion: row.booking_version,
      resultingStatus: row.booking_status,
    });
  }
  if (
    input.command.type === "mark_no_show"
    && (
      !["not_started", "ready_for_check_in"].includes(row.stay_status)
      || row.reservation_status !== "confirmed"
      || row.hold_status !== "converted"
      || row.arrival_date >= row.local_business_date
    )
  ) {
    return complete(client, input.requestId, {
      outcome: "invalid", reason: "confirmed_converted_overdue_arrival_required_for_no_show",
      aggregateType: "stay", aggregateId: row.stay_id,
      previousVersion: row.stay_version, resultingVersion: row.stay_version,
      resultingStatus: row.stay_status,
    });
  }
  const releasedCapacity = await releaseBookedCapacity(client, {
    inventoryCalendarId: row.inventory_calendar_id, propertyId: row.property_id,
    unitId: row.unit_id, arrivalDate: row.arrival_date,
    departureDate: row.departure_date, reservedCapacity: row.reserved_capacity,
    bookingId: row.booking_id, reservationId: row.reservation_id,
  });
  if (!releasedCapacity.released) {
    return complete(client, input.requestId, {
      outcome: "invalid", reason: releasedCapacity.reason,
      aggregateType: "booking", aggregateId: row.booking_id,
      previousVersion: row.booking_version, resultingVersion: row.booking_version,
      resultingStatus: row.booking_status,
    });
  }
  const status = input.command.type === "mark_no_show" ? "no_show" : "cancelled";
  const bookingVersion = row.booking_version + 1;
  const bookingUpdate = await client.query(
    `update crays_core.clubs_bookings
     set status=$2,version=$3,updated_at=now(),
       cancelled_at=case when $2='cancelled' then now() else cancelled_at end,
       no_show_at=case when $2='no_show' then now() else no_show_at end
     where booking_id=$1 and version=$4 and status=$5`,
    [row.booking_id, status, bookingVersion, row.booking_version, row.booking_status],
  );
  if ((bookingUpdate.rowCount ?? 0) !== 1) throw new Error("Booking changed during terminal command; transaction rolled back.");
  const reservationUpdate = await client.query(
    `update crays_core.clubs_reservations
     set status=$2,version=version+1,updated_at=now(),
       cancelled_at=case when $2='cancelled' then now() else cancelled_at end,
       no_show_at=case when $2='no_show' then now() else no_show_at end
     where reservation_id=$1 and version=$3 and status=$4`,
    [row.reservation_id, status, row.reservation_version, row.reservation_status],
  );
  if ((reservationUpdate.rowCount ?? 0) !== 1) throw new Error("Reservation changed during terminal command; transaction rolled back.");
  const stayUpdate = await client.query(
    `update crays_core.clubs_stays
     set status=$2,version=version+1,updated_at=now(),
       no_show_at=case when $2='no_show' then now() else no_show_at end
     where stay_id=$1 and version=$3 and status=$4`,
    [row.stay_id, status, row.stay_version, row.stay_status],
  );
  if ((stayUpdate.rowCount ?? 0) !== 1) throw new Error("Stay changed during terminal command; transaction rolled back.");
  for (const event of [
    { aggregateType: "booking" as const, aggregateId: row.booking_id, fromVersion: row.booking_version, toVersion: bookingVersion, fromStatus: row.booking_status },
    { aggregateType: "reservation" as const, aggregateId: row.reservation_id, fromVersion: row.reservation_version, toVersion: row.reservation_version + 1, fromStatus: row.reservation_status },
    { aggregateType: "stay" as const, aggregateId: row.stay_id, fromVersion: row.stay_version, toVersion: row.stay_version + 1, fromStatus: row.stay_status },
  ]) {
    await appendEvent(client, {
      ...event, eventType: status, actorAccountId: input.accountId,
      actorType: input.actorType, toStatus: status, reason: input.command.reason,
      correlationId: input.correlationId,
    });
  }
  const receipt = await complete(client, input.requestId, {
    outcome: "applied", reason: null, aggregateType: "booking",
    aggregateId: row.booking_id, previousVersion: row.booking_version,
    resultingVersion: bookingVersion, resultingStatus: status,
  });
  await appendCapacityLedgerMovements(client, {
    movementType: "release", bookingId: row.booking_id,
    reservationId: row.reservation_id,
    inventoryCalendarId: row.inventory_calendar_id,
    propertyId: row.property_id, unitId: row.unit_id,
    capacityUnits: row.reserved_capacity, requestId: input.requestId,
    receiptId: receipt.receiptId, correlationId: input.correlationId,
    days: releasedCapacity.days,
  });
  return receipt;
}

async function stayCommand(
  client: PoolClient,
  input: {
    accountId: string; actorType: string; tenantSessionId?: string;
    organizationId?: string; roleKey?: string; command: StayCommand;
    requestId: string; correlationId: string;
  },
) {
  const result = await client.query<{
    stay_id: string; stay_status: string; stay_version: number; booking_id: string;
    booking_status: string; booking_version: number; reservation_id: string;
    reservation_version: number; property_id: string;
  }>(
    `select stay.stay_id,stay.status stay_status,stay.version stay_version,
       booking.booking_id,booking.status booking_status,
       booking.version booking_version,reservation.reservation_id,
       reservation.version reservation_version,stay.property_id
     from crays_core.clubs_stays stay
     join crays_core.clubs_bookings booking on booking.booking_id=stay.booking_id
     join crays_core.clubs_reservations reservation
       on reservation.reservation_id=stay.reservation_id
     where stay.stay_id=$1 for update of stay,booking,reservation`,
    [input.command.stayId],
  );
  const row = result.rows[0];
  if (
    !row
    || !(await authorizedProperty(client, {
      accountId: input.accountId, tenantSessionId: input.tenantSessionId,
      organizationId: input.organizationId, roleKey: input.roleKey,
      propertyId: row.property_id,
    }))
  ) {
    return complete(client, input.requestId, {
      outcome: "denied", reason: "authorized_stay_required",
      aggregateType: null, aggregateId: null, previousVersion: null,
      resultingVersion: null, resultingStatus: null,
    });
  }
  if (row.stay_version !== input.command.expectedVersion) {
    return complete(client, input.requestId, {
      outcome: "conflict", reason: "stay_version_conflict",
      aggregateType: "stay", aggregateId: row.stay_id,
      previousVersion: row.stay_version, resultingVersion: row.stay_version,
      resultingStatus: row.stay_status,
    });
  }
  const transition = input.command.type === "mark_ready"
    ? { from: "not_started", to: "ready_for_check_in" }
    : input.command.type === "check_in"
      ? { from: "ready_for_check_in", to: "checked_in" }
      : { from: "checked_in", to: "checked_out" };
  if (row.stay_status !== transition.from) {
    return complete(client, input.requestId, {
      outcome: "noop", reason: `stay_transition_not_allowed_from_${row.stay_status}`,
      aggregateType: "stay", aggregateId: row.stay_id,
      previousVersion: row.stay_version, resultingVersion: row.stay_version,
      resultingStatus: row.stay_status,
    });
  }
  const resultingVersion = row.stay_version + 1;
  await client.query(
    `update crays_core.clubs_stays
     set status=$2,version=$3,updated_at=now(),
       ready_at=case when $2='ready_for_check_in' then now() else ready_at end,
       checked_in_at=case when $2='checked_in' then now() else checked_in_at end,
       checked_out_at=case when $2='checked_out' then now() else checked_out_at end
     where stay_id=$1 and version=$4`,
    [row.stay_id, transition.to, resultingVersion, row.stay_version],
  );
  if (transition.to === "checked_in") {
    await client.query(
      `update crays_core.clubs_bookings
       set status='in_stay',version=version+1,updated_at=now()
       where booking_id=$1 and status='confirmed'`,
      [row.booking_id],
    );
  } else if (transition.to === "checked_out") {
    await client.query(
      `update crays_core.clubs_bookings
       set status='completed',version=version+1,completed_at=now(),updated_at=now()
       where booking_id=$1 and status='in_stay'`,
      [row.booking_id],
    );
    await client.query(
      `update crays_core.clubs_reservations
       set status='completed',version=version+1,completed_at=now(),updated_at=now()
       where reservation_id=$1 and status='confirmed'`,
      [row.reservation_id],
    );
  }
  await appendEvent(client, {
    aggregateType: "stay", aggregateId: row.stay_id,
    eventType: input.command.type, actorAccountId: input.accountId,
    actorType: input.actorType, fromStatus: row.stay_status,
    toStatus: transition.to, fromVersion: row.stay_version,
    toVersion: resultingVersion, reason: input.command.reason,
    correlationId: input.correlationId,
  });
  return complete(client, input.requestId, {
    outcome: "applied", reason: null, aggregateType: "stay",
    aggregateId: row.stay_id, previousVersion: row.stay_version,
    resultingVersion, resultingStatus: transition.to,
  });
}

async function guestCommand(
  client: PoolClient,
  input: {
    accountId: string; actorType: string; tenantSessionId?: string;
    organizationId?: string; roleKey?: string; command: GuestCommand;
    requestId: string; correlationId: string;
  },
) {
  if (input.command.type === "assign_guest") {
    const result = await client.query<{
      booking_id: string; version: number; status: string; property_id: string;
      guest_count: number;
    }>(
      `select booking.booking_id,booking.version,booking.status,booking.property_id,
         quote.guest_count
       from crays_core.clubs_bookings booking
       join crays_core.clubs_reservations reservation
         on reservation.reservation_id=booking.reservation_id
       join crays_core.clubs_quote_snapshots quote
         on quote.quote_snapshot_id=reservation.quote_snapshot_id
       where booking.booking_id=$1
       for update of booking`,
      [input.command.bookingId],
    );
    const row = result.rows[0];
    if (
      !row
      || !(await authorizedProperty(client, {
        accountId: input.accountId, tenantSessionId: input.tenantSessionId,
        organizationId: input.organizationId, roleKey: input.roleKey,
        propertyId: row.property_id,
      }))
    ) {
      return complete(client, input.requestId, {
        outcome: "denied", reason: "authorized_booking_required",
        aggregateType: null, aggregateId: null, previousVersion: null,
        resultingVersion: null, resultingStatus: null,
      });
    }
    const guestCount = await client.query<{ assigned_count: number }>(
      `select count(*)::int assigned_count
       from crays_core.clubs_booking_guests
       where booking_id=$1 and status='assigned'`,
      [row.booking_id],
    );
    const assignedCount = guestCount.rows[0]?.assigned_count ?? 0;
    if (row.version !== input.command.expectedVersion) {
      return complete(client, input.requestId, {
        outcome: "conflict", reason: "booking_version_conflict",
        aggregateType: "booking", aggregateId: row.booking_id,
        previousVersion: row.version, resultingVersion: row.version,
        resultingStatus: row.status,
      });
    }
    if (!["confirmed", "change_requested"].includes(row.status) || assignedCount >= row.guest_count) {
      return complete(client, input.requestId, {
        outcome: "conflict", reason: assignedCount >= row.guest_count
          ? "quoted_guest_capacity_reached" : `guest_assignment_not_allowed_from_${row.status}`,
        aggregateType: "booking", aggregateId: row.booking_id,
        previousVersion: row.version, resultingVersion: row.version,
        resultingStatus: row.status,
      });
    }
    const guestId = id("clubs_booking_guest");
    await client.query(
      `insert into crays_core.clubs_booking_guests
        (booking_guest_id,booking_id,guest_role,account_id,guest_reference,display_label)
       values ($1,$2,'additional',$3,$4,$5)`,
      [
        guestId, row.booking_id, input.command.guestAccountId ?? null,
        input.command.guestReference, input.command.displayLabel.trim(),
      ],
    );
    await client.query(
      `update crays_core.clubs_bookings set version=version+1,updated_at=now()
       where booking_id=$1 and version=$2`,
      [row.booking_id, row.version],
    );
    await appendEvent(client, {
      aggregateType: "guest", aggregateId: guestId, eventType: "assigned",
      actorAccountId: input.accountId, actorType: input.actorType,
      fromStatus: null, toStatus: "assigned", fromVersion: null, toVersion: 1,
      correlationId: input.correlationId,
    });
    return complete(client, input.requestId, {
      outcome: "applied", reason: null, aggregateType: "guest",
      aggregateId: guestId, previousVersion: null, resultingVersion: 1,
      resultingStatus: "assigned",
    });
  }
  const result = await client.query<{
    booking_guest_id: string; guest_role: string; status: string; version: number;
    booking_id: string; booking_version: number; property_id: string;
  }>(
    `select guest.booking_guest_id,guest.guest_role,guest.status,guest.version,
       booking.booking_id,booking.version booking_version,booking.property_id
     from crays_core.clubs_booking_guests guest
     join crays_core.clubs_bookings booking on booking.booking_id=guest.booking_id
     where guest.booking_guest_id=$1 for update of guest,booking`,
    [input.command.guestId],
  );
  const row = result.rows[0];
  if (
    !row
    || !(await authorizedProperty(client, {
      accountId: input.accountId, tenantSessionId: input.tenantSessionId,
      organizationId: input.organizationId, roleKey: input.roleKey,
      propertyId: row.property_id,
    }))
  ) {
    return complete(client, input.requestId, {
      outcome: "denied", reason: "authorized_guest_required",
      aggregateType: null, aggregateId: null, previousVersion: null,
      resultingVersion: null, resultingStatus: null,
    });
  }
  if (row.version !== input.command.expectedVersion) {
    return complete(client, input.requestId, {
      outcome: "conflict", reason: "guest_version_conflict",
      aggregateType: "guest", aggregateId: row.booking_guest_id,
      previousVersion: row.version, resultingVersion: row.version,
      resultingStatus: row.status,
    });
  }
  if (row.guest_role === "primary" || row.status !== "assigned") {
    return complete(client, input.requestId, {
      outcome: "noop", reason: row.guest_role === "primary"
        ? "primary_guest_cannot_be_removed" : "guest_already_removed",
      aggregateType: "guest", aggregateId: row.booking_guest_id,
      previousVersion: row.version, resultingVersion: row.version,
      resultingStatus: row.status,
    });
  }
  await client.query(
    `update crays_core.clubs_booking_guests
     set status='removed',version=version+1,removed_at=now(),updated_at=now()
     where booking_guest_id=$1 and version=$2`,
    [row.booking_guest_id, row.version],
  );
  await client.query(
    `update crays_core.clubs_bookings set version=version+1,updated_at=now()
     where booking_id=$1 and version=$2`,
    [row.booking_id, row.booking_version],
  );
  await appendEvent(client, {
    aggregateType: "guest", aggregateId: row.booking_guest_id,
    eventType: "removed", actorAccountId: input.accountId,
    actorType: input.actorType, fromStatus: "assigned", toStatus: "removed",
    fromVersion: row.version, toVersion: row.version + 1,
    reason: input.command.reason, correlationId: input.correlationId,
  });
  return complete(client, input.requestId, {
    outcome: "applied", reason: null, aggregateType: "guest",
    aggregateId: row.booking_guest_id, previousVersion: row.version,
    resultingVersion: row.version + 1, resultingStatus: "removed",
  });
}

async function changeCommand(
  client: PoolClient,
  input: {
    accountId: string; actorType: string; tenantSessionId?: string;
    organizationId?: string; roleKey?: string; command: ChangeCommand;
    requestId: string; correlationId: string;
  },
) {
  if (input.command.type === "submit_change") {
    const result = await client.query<{
      booking_id: string; account_id: string; property_id: string;
      status: string; version: number;
    }>(
      `select booking_id,account_id,property_id,status,version
       from crays_core.clubs_bookings where booking_id=$1 for update`,
      [input.command.bookingId],
    );
    const row = result.rows[0];
    if (!row || row.account_id !== input.accountId) {
      return complete(client, input.requestId, {
        outcome: "denied", reason: "own_booking_required",
        aggregateType: null, aggregateId: null, previousVersion: null,
        resultingVersion: null, resultingStatus: null,
      });
    }
    if (row.version !== input.command.expectedVersion) {
      return complete(client, input.requestId, {
        outcome: "conflict", reason: "booking_version_conflict",
        aggregateType: "booking", aggregateId: row.booking_id,
        previousVersion: row.version, resultingVersion: row.version,
        resultingStatus: row.status,
      });
    }
    if (row.status !== "confirmed") {
      return complete(client, input.requestId, {
        outcome: "noop", reason: `change_not_allowed_from_${row.status}`,
        aggregateType: "booking", aggregateId: row.booking_id,
        previousVersion: row.version, resultingVersion: row.version,
        resultingStatus: row.status,
      });
    }
    const changeId = id("clubs_booking_change");
    await client.query(
      `insert into crays_core.clubs_booking_change_requests
        (booking_change_request_id,booking_id,requested_by_account_id,
         change_type,requested_change)
       values ($1,$2,$3,$4,$5)`,
      [
        changeId, row.booking_id, input.accountId,
        input.command.changeType, input.command.requestedChange,
      ],
    );
    await client.query(
      `update crays_core.clubs_bookings
       set status='change_requested',version=version+1,updated_at=now()
       where booking_id=$1 and version=$2`,
      [row.booking_id, row.version],
    );
    await appendEvent(client, {
      aggregateType: "change_request", aggregateId: changeId,
      eventType: "submitted", actorAccountId: input.accountId,
      actorType: input.actorType, fromStatus: null, toStatus: "submitted",
      fromVersion: null, toVersion: 1, correlationId: input.correlationId,
    });
    return complete(client, input.requestId, {
      outcome: "applied", reason: null, aggregateType: "change_request",
      aggregateId: changeId, previousVersion: null, resultingVersion: 1,
      resultingStatus: "submitted",
    });
  }
  const result = await client.query<{
    booking_change_request_id: string; booking_id: string; requested_by_account_id: string;
    status: string; version: number; booking_version: number; property_id: string;
  }>(
    `select change.booking_change_request_id,change.booking_id,
       change.requested_by_account_id,change.status,change.version,
       booking.version booking_version,booking.property_id
     from crays_core.clubs_booking_change_requests change
     join crays_core.clubs_bookings booking on booking.booking_id=change.booking_id
     where change.booking_change_request_id=$1 for update of change,booking`,
    [input.command.changeRequestId],
  );
  const row = result.rows[0];
  const isMemberCancel =
    input.command.type === "cancel_change" && row?.requested_by_account_id === input.accountId;
  const isTeam =
    row
    && input.command.type !== "cancel_change"
    && await authorizedProperty(client, {
      accountId: input.accountId, tenantSessionId: input.tenantSessionId,
      organizationId: input.organizationId, roleKey: input.roleKey,
      propertyId: row.property_id,
    });
  if (!row || (!isMemberCancel && !isTeam)) {
    return complete(client, input.requestId, {
      outcome: "denied", reason: "authorized_change_request_required",
      aggregateType: null, aggregateId: null, previousVersion: null,
      resultingVersion: null, resultingStatus: null,
    });
  }
  if (row.version !== input.command.expectedVersion) {
    return complete(client, input.requestId, {
      outcome: "conflict", reason: "change_request_version_conflict",
      aggregateType: "change_request", aggregateId: row.booking_change_request_id,
      previousVersion: row.version, resultingVersion: row.version,
      resultingStatus: row.status,
    });
  }
  const transition = input.command.type === "cancel_change"
    ? { allowed: ["submitted", "under_review"].includes(row.status), status: "cancelled" }
    : input.command.type === "begin_change_review"
      ? { allowed: row.status === "submitted", status: "under_review" }
      : input.command.type === "approve_change"
        ? { allowed: ["submitted", "under_review"].includes(row.status), status: "approved" }
        : { allowed: ["submitted", "under_review"].includes(row.status), status: "rejected" };
  if (!transition.allowed) {
    return complete(client, input.requestId, {
      outcome: "noop", reason: `change_transition_not_allowed_from_${row.status}`,
      aggregateType: "change_request", aggregateId: row.booking_change_request_id,
      previousVersion: row.version, resultingVersion: row.version,
      resultingStatus: row.status,
    });
  }
  const resultingVersion = row.version + 1;
  await client.query(
    `update crays_core.clubs_booking_change_requests
     set status=$2,version=$3,updated_at=now(),
       decided_at=case when $2 in ('approved','rejected') then now() else decided_at end,
       decided_by_account_id=case when $2 in ('approved','rejected') then $4 else decided_by_account_id end,
       decision_reason=case when $2<>'under_review' then $5 else decision_reason end
     where booking_change_request_id=$1 and version=$6`,
    [
      row.booking_change_request_id, transition.status, resultingVersion,
      isTeam ? input.accountId : null, input.command.reason, row.version,
    ],
  );
  if (["cancelled", "rejected"].includes(transition.status)) {
    await client.query(
      `update crays_core.clubs_bookings
       set status='confirmed',version=version+1,updated_at=now()
       where booking_id=$1 and status='change_requested'`,
      [row.booking_id],
    );
  }
  await appendEvent(client, {
    aggregateType: "change_request", aggregateId: row.booking_change_request_id,
    eventType: transition.status, actorAccountId: input.accountId,
    actorType: input.actorType, fromStatus: row.status,
    toStatus: transition.status, fromVersion: row.version,
    toVersion: resultingVersion, reason: input.command.reason,
    correlationId: input.correlationId,
  });
  return complete(client, input.requestId, {
    outcome: "applied",
    reason: transition.status === "approved"
      ? "approved_as_preflight_only_booking_details_not_applied" : null,
    aggregateType: "change_request", aggregateId: row.booking_change_request_id,
    previousVersion: row.version, resultingVersion,
    resultingStatus: transition.status,
  });
}

export async function executeBookingLifecycleCommand(input: {
  accountId: string;
  actorType: "member" | "holiday-manager" | "crays-management" | "admin";
  idempotencyKey: string;
  correlationId: string;
  command: BookingLifecycleCommand;
  tenantSessionId?: string;
  organizationId?: string;
  roleKey?: string;
  evaluationAt?: Date;
}, transactionClient?: PoolClient): Promise<BookingLifecycleReceipt> {
  validateCommand(input.command);
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(input.idempotencyKey)) {
    throw new Error("A strong idempotency key is required.");
  }
  const payloadSha256 = hash(input.command);
  const run = async (client: PoolClient) => {
    const requestId = id("clubs_booking_lifecycle_command");
    const targetId =
      "requestId" in input.command ? input.command.requestId
        : "bookingId" in input.command ? input.command.bookingId
          : "stayId" in input.command ? input.command.stayId
            : "guestId" in input.command ? input.command.guestId
              : input.command.changeRequestId;
    const inserted = await client.query(
      `insert into crays_core.clubs_booking_lifecycle_command_requests
        (booking_lifecycle_command_request_id,idempotency_key,correlation_id,
         actor_account_id,actor_type,command_type,target_id,expected_version,payload_sha256)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (actor_account_id,idempotency_key) do nothing
       returning booking_lifecycle_command_request_id`,
      [
        requestId, input.idempotencyKey, input.correlationId, input.accountId,
        input.actorType, input.command.type, targetId,
        "expectedVersion" in input.command ? input.command.expectedVersion : null,
        payloadSha256,
      ],
    );
    if ((inserted.rowCount ?? 0) === 0) {
      const replay = await client.query<{
        booking_lifecycle_command_request_id: string; payload_sha256: string;
        booking_lifecycle_command_receipt_id: string; outcome: Outcome;
        reason: string | null; aggregate_type: BookingLifecycleReceipt["aggregateType"];
        aggregate_id: string | null; previous_version: number | null;
        resulting_version: number | null; resulting_status: string | null;
      }>(
        `select request.booking_lifecycle_command_request_id,request.payload_sha256,
           receipt.booking_lifecycle_command_receipt_id,receipt.outcome,
           receipt.reason,receipt.aggregate_type,receipt.aggregate_id,
           receipt.previous_version,receipt.resulting_version,receipt.resulting_status
         from crays_core.clubs_booking_lifecycle_command_requests request
         join lateral (
           select * from crays_core.clubs_booking_lifecycle_command_receipts
           where booking_lifecycle_command_request_id=request.booking_lifecycle_command_request_id
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
        receiptId: row.booking_lifecycle_command_receipt_id,
        requestId: row.booking_lifecycle_command_request_id,
        outcome: row.outcome, reason: row.reason,
        aggregateType: row.aggregate_type, aggregateId: row.aggregate_id,
        previousVersion: row.previous_version, resultingVersion: row.resulting_version,
        resultingStatus: row.resulting_status, replayed: true,
      };
    }
    const common = { ...input, requestId };
    if (input.command.type === "confirm_request") {
      return confirmRequest(client, { ...common, command: input.command });
    }
    if (input.command.type === "cancel_booking" || input.command.type === "mark_no_show") {
      return bookingTerminalCommand(client, { ...common, command: input.command });
    }
    if (["mark_ready", "check_in", "check_out"].includes(input.command.type)) {
      return stayCommand(client, { ...common, command: input.command as StayCommand });
    }
    if (input.command.type === "assign_guest" || input.command.type === "remove_guest") {
      return guestCommand(client, { ...common, command: input.command });
    }
    return changeCommand(client, {
      ...common,
      command: input.command as ChangeCommand,
    });
  };
  return transactionClient ? run(transactionClient) : transaction(run);
}

export async function readOwnBookings(accountId: string) {
  const pool = getCorePgPool();
  const result = await pool.query<{
    booking_id: string; public_reference: string; status: string; version: number;
    property_id: string; unit_id: string; arrival_date: string; departure_date: string;
    reservation_status: string; stay_id: string; stay_status: string; stay_version: number;
    currency: string; total_minor: string; guest_count: number; assigned_guest_count: number;
  }>(
    `select booking.booking_id,booking.public_reference,booking.status,booking.version,
       booking.property_id,booking.unit_id,reservation.arrival_date::text,
       reservation.departure_date::text,reservation.status reservation_status,
       stay.stay_id,stay.status stay_status,stay.version stay_version,
       quote.currency,quote.total_minor,quote.guest_count,
       count(guest.booking_guest_id) filter (where guest.status='assigned')::int assigned_guest_count
     from crays_core.clubs_bookings booking
     join crays_core.clubs_reservations reservation on reservation.reservation_id=booking.reservation_id
     join crays_core.clubs_stays stay on stay.booking_id=booking.booking_id
     join crays_core.clubs_quote_snapshots quote on quote.quote_snapshot_id=reservation.quote_snapshot_id
     left join crays_core.clubs_booking_guests guest on guest.booking_id=booking.booking_id
     where booking.account_id=$1
     group by booking.booking_id,reservation.reservation_id,stay.stay_id,quote.quote_snapshot_id
     order by booking.updated_at desc limit 50`,
    [accountId],
  );
  const bookingIds = result.rows.map((row) => row.booking_id);
  const changeResult = bookingIds.length
    ? await pool.query<{
        booking_change_request_id: string;
        booking_id: string;
        change_type: "dates" | "guest_assignment" | "cancellation" | "other";
        status: "submitted" | "under_review" | "approved" | "rejected" | "cancelled";
        version: number;
        updated_at: Date;
        decided_at: Date | null;
      }>(
        `select change.booking_change_request_id,change.booking_id,
           change.change_type,change.status,change.version,change.updated_at,
           change.decided_at
         from crays_core.clubs_booking_change_requests change
         join crays_core.clubs_bookings booking
           on booking.booking_id=change.booking_id
         where booking.account_id=$1
           and change.requested_by_account_id=$1
           and change.booking_id=any($2::text[])
         order by change.updated_at desc,change.booking_change_request_id`,
        [accountId, bookingIds],
      )
    : { rows: [] };
  const changesByBooking = new Map<string, typeof changeResult.rows>();
  for (const change of changeResult.rows) {
    const changes = changesByBooking.get(change.booking_id) ?? [];
    changes.push(change);
    changesByBooking.set(change.booking_id, changes);
  }
  return result.rows.map((row) => ({
    bookingId: row.booking_id, publicReference: row.public_reference,
    status: row.status, version: row.version, propertyId: row.property_id,
    unitId: row.unit_id, arrivalDate: row.arrival_date,
    departureDate: row.departure_date, reservationStatus: row.reservation_status,
    stayId: row.stay_id, stayStatus: row.stay_status, stayVersion: row.stay_version,
    currency: row.currency, totalMinor: row.total_minor, guestCount: row.guest_count,
    assignedGuestCount: row.assigned_guest_count, paymentStatus: null,
    changeRequests: (changesByBooking.get(row.booking_id) ?? []).map((change) => ({
      changeRequestId: change.booking_change_request_id,
      changeType: change.change_type,
      status: change.status,
      version: change.version,
      updatedAt: change.updated_at.toISOString(),
      decidedAt: change.decided_at?.toISOString() ?? null,
    })),
  }));
}

export async function readTeamBookingChangeRequestQueue(input: {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: string;
}, database: Pick<PoolClient, "query"> = getCorePgPool()) {
  const result = await database.query<{
    booking_change_request_id: string;
    booking_reference: string;
    change_type: "dates" | "guest_assignment" | "cancellation" | "other";
    status: "submitted" | "under_review" | "approved" | "rejected" | "cancelled";
    version: number;
    updated_at: Date;
    decided_at: Date | null;
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
     )
     select change.booking_change_request_id,booking.public_reference booking_reference,
       change.change_type,change.status,change.version,change.updated_at,change.decided_at
     from crays_core.clubs_booking_change_requests change
     join crays_core.clubs_bookings booking on booking.booking_id=change.booking_id
     join authorized_properties scope on scope.property_id=booking.property_id
     order by
       case change.status when 'submitted' then 0 when 'under_review' then 1 else 2 end,
       change.updated_at desc,change.booking_change_request_id
     limit 100`,
    [input.accountId, input.tenantSessionId, input.organizationId, input.roleKey],
  );
  return result.rows.map((row) => ({
    changeRequestId: row.booking_change_request_id,
    bookingReference: row.booking_reference,
    changeType: row.change_type,
    status: row.status,
    version: row.version,
    updatedAt: row.updated_at.toISOString(),
    decidedAt: row.decided_at?.toISOString() ?? null,
  }));
}

export async function readTeamBookingLifecycleQueue(input: {
  accountId: string; tenantSessionId: string; organizationId: string; roleKey: string;
  focus?: { kind: "arrival" | "departure" | "in_house"; bookingId: string; stayVersion: number } | null;
  evaluationAt?: Date;
}, database: Pick<PoolClient, "query"> = getCorePgPool()) {
  const result = await database.query<{
    request_id: string | null; request_reference: string | null;
    request_version: number | null; booking_id: string | null;
    booking_reference: string | null; booking_status: string | null;
    booking_version: number | null; reservation_status: string | null;
    stay_id: string | null; stay_status: string | null; stay_version: number | null;
    property_id: string; unit_id: string; arrival_date: string;
    departure_date: string; currency: string; total_minor: string;
    hold_status: string; hold_expires_at: Date; hold_is_expired: boolean;
    focus_eligible: boolean; no_show_eligible: boolean;
  }>(
     `with authorized_properties as (
       select distinct property.property_id,store.timezone
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
       select property.property_id,store.timezone
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
     select request.booking_request_id request_id,
       request.public_reference request_reference,request.version request_version,
       booking.booking_id,booking.public_reference booking_reference,
       booking.status booking_status,booking.version booking_version,
       reservation.status reservation_status,hold.status hold_status,
       hold.expires_at hold_expires_at,(hold.expires_at<=now()) hold_is_expired,
       stay.stay_id,
       stay.status stay_status,stay.version stay_version,
       request.property_id,request.unit_id,hold.arrival_date::text,
        hold.departure_date::text,quote.currency,quote.total_minor,scope.timezone
      from crays_core.clubs_booking_requests request
      join authorized_properties scope on scope.property_id=request.property_id
      join crays_core.clubs_units unit
        on unit.unit_id=request.unit_id and unit.property_id=request.property_id
       and unit.lifecycle not in ('suspended','archived')
     join crays_core.clubs_reservation_holds hold on hold.reservation_hold_id=request.reservation_hold_id
     join crays_core.clubs_quote_snapshots quote on quote.quote_snapshot_id=request.quote_snapshot_id
     left join crays_core.clubs_reservations reservation on reservation.booking_request_id=request.booking_request_id
     left join crays_core.clubs_bookings booking on booking.reservation_id=reservation.reservation_id
     left join crays_core.clubs_stays stay on stay.booking_id=booking.booking_id
     where request.status='accepted'
       and (
         booking.booking_id is null
         or booking.status not in ('cancelled','no_show','completed')
         or (
           booking.status='cancelled'
           and booking.updated_at>=now()-interval '24 hours'
         )
       )
      ), eligible_items as (
         select queue_items.*,
           booking_status in ('confirmed','change_requested')
             and reservation_status='confirmed'
             and hold_status='converted'
             and stay_status in ('not_started','ready_for_check_in')
             and arrival_date::date<($7::timestamptz at time zone timezone)::date no_show_eligible,
           case
             when $6='arrival'
               then booking_status in ('confirmed','change_requested')
                and stay_status in ('not_started','ready_for_check_in')
                and arrival_date::date<=($7::timestamptz at time zone timezone)::date
            when $6='departure'
              then booking_status='in_stay' and stay_status='checked_in'
               and departure_date::date=(now() at time zone timezone)::date
            when $6='in_house'
              then booking_status='in_stay' and stay_status='checked_in'
            else false
          end focus_eligible
        from queue_items
      ), ranked_items as (
        select queue_items.*,row_number() over(order by
         case when booking_id is null then 0
           when stay_status='ready_for_check_in' then 1
           when stay_status='checked_in' then 2 else 3 end,
         arrival_date,request_id) queue_rank
        from eligible_items queue_items
     )
     select request_id,request_reference,request_version,booking_id,
       booking_reference,booking_status,booking_version,reservation_status,
       stay_id,stay_status,stay_version,property_id,unit_id,arrival_date,
       departure_date,currency,total_minor,hold_status,hold_expires_at,
       hold_is_expired,focus_eligible,no_show_eligible
     from ranked_items
      where queue_rank<=100 or (booking_id=$5 and focus_eligible)
      order by queue_rank`,
    [
      input.accountId,
      input.tenantSessionId,
      input.organizationId,
      input.roleKey,
      input.focus?.bookingId ?? "",
      input.focus?.kind ?? "",
      (input.evaluationAt ?? new Date()).toISOString(),
    ],
  );
  return result.rows.map((row) => ({
    requestId: row.request_id, requestReference: row.request_reference,
    requestVersion: row.request_version, bookingId: row.booking_id,
    bookingReference: row.booking_reference, bookingStatus: row.booking_status,
    bookingVersion: row.booking_version, reservationStatus: row.reservation_status,
    stayId: row.stay_id, stayStatus: row.stay_status, stayVersion: row.stay_version,
    propertyId: row.property_id, unitId: row.unit_id,
    arrivalDate: row.arrival_date, departureDate: row.departure_date,
    currency: row.currency, totalMinor: row.total_minor,
    holdStatus: row.hold_status,
    holdExpiresAt: row.hold_expires_at.toISOString(),
    holdIsExpired: row.hold_is_expired,
    paymentStatus: null,
    focusEligible: row.focus_eligible,
    noShowEligible: row.no_show_eligible,
  }));
}
