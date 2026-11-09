import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";

type AvailabilityLockInput = {
  inventoryCalendarId: string;
  propertyId: string;
  unitId: string;
  arrivalDate: string;
  departureDate: string;
  requestedCapacity: number;
};

export type LockedInventoryDay = {
  inventoryDayId: string;
  date: string;
  availabilityState: "open" | "closed";
  totalCapacity: number;
  heldCapacity: number;
  bookedCapacity: number;
  remainingCapacity: number;
  minimumStayNights: number | null;
  maximumStayNights: number | null;
  arrivalAllowed: boolean;
  departureAllowed: boolean;
  version: number;
};

export type AvailabilityLockDecision =
  | {
      available: true;
      reason: "available";
      inventoryCalendarId: string;
      nights: number;
      minimumRemainingCapacity: number;
      days: LockedInventoryDay[];
    }
  | {
      available: false;
      reason:
        | "calendar_not_active"
        | "inventory_gap"
        | "closed"
        | "capacity_exhausted"
        | "arrival_not_allowed"
        | "departure_not_allowed"
        | "minimum_stay_not_met"
        | "maximum_stay_exceeded";
      inventoryCalendarId: string;
      nights: number;
      minimumRemainingCapacity: number | null;
      days: LockedInventoryDay[];
    };

export type AvailabilityCheckReceipt = {
  receiptId: string;
  requestId: string;
  outcome: "available" | "unavailable" | "denied" | "invalid";
  reason: string | null;
  calendarId: string | null;
  lockedNightCount: number;
  minimumRemainingCapacity: number | null;
  inventorySnapshotSha256: string | null;
  replayed: boolean;
};

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function nightsBetween(arrivalDate: string, departureDate: string) {
  return Math.round(
    (Date.parse(`${departureDate}T00:00:00.000Z`)
      - Date.parse(`${arrivalDate}T00:00:00.000Z`))
      / 86_400_000,
  );
}

function validateRange(input: {
  arrivalDate: string;
  departureDate: string;
  requestedCapacity: number;
}) {
  if (!isIsoDate(input.arrivalDate) || !isIsoDate(input.departureDate)) {
    throw new Error("Arrival and departure must be real ISO calendar dates.");
  }
  const nights = nightsBetween(input.arrivalDate, input.departureDate);
  if (nights < 1 || nights > 365) {
    throw new Error("Availability checks support stays from 1 to 365 nights.");
  }
  if (
    !Number.isSafeInteger(input.requestedCapacity)
    || input.requestedCapacity < 1
    || input.requestedCapacity > 10_000
  ) {
    throw new Error("Requested capacity must be between 1 and 10,000.");
  }
  return nights;
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

/**
 * Acquires a transaction-scoped advisory lock and then row-locks the complete
 * date range in ascending order. Every future hold/booking capacity mutation
 * must call this primitive inside the same PostgreSQL transaction.
 */
export async function lockClubsInventoryRange(
  client: PoolClient,
  input: AvailabilityLockInput,
): Promise<AvailabilityLockDecision> {
  const nights = validateRange(input);
  await client.query(
    "select pg_advisory_xact_lock(hashtextextended($1, 0))",
    [`clubs-inventory:${input.inventoryCalendarId}`],
  );
  const calendar = await client.query<{ inventory_calendar_id: string }>(
    `select calendar.inventory_calendar_id
     from crays_core.clubs_inventory_calendars calendar
     where calendar.inventory_calendar_id=$1
       and calendar.property_id=$2
       and calendar.unit_id=$3
       and calendar.lifecycle='active'
     for update`,
    [input.inventoryCalendarId, input.propertyId, input.unitId],
  );
  if (!calendar.rows[0]) {
    return {
      available: false,
      reason: "calendar_not_active",
      inventoryCalendarId: input.inventoryCalendarId,
      nights,
      minimumRemainingCapacity: null,
      days: [],
    };
  }

  const result = await client.query<{
    inventory_day_id: string;
    local_date: string;
    availability_state: "open" | "closed";
    total_capacity: number;
    held_capacity: number;
    booked_capacity: number;
    minimum_stay_nights: number | null;
    maximum_stay_nights: number | null;
    arrival_allowed: boolean;
    departure_allowed: boolean;
    version: number;
  }>(
    `select day.inventory_day_id,day.local_date::text,day.availability_state,
       day.total_capacity,day.held_capacity,day.booked_capacity,
       day.minimum_stay_nights,day.maximum_stay_nights,
       day.arrival_allowed,day.departure_allowed,day.version
     from crays_core.clubs_inventory_days day
     where day.inventory_calendar_id=$1
       and day.unit_id=$2
       and day.local_date between $3::date and $4::date
     order by day.local_date asc
     for update of day`,
    [
      input.inventoryCalendarId,
      input.unitId,
      input.arrivalDate,
      input.departureDate,
    ],
  );
  const days = result.rows.map((row) => ({
    inventoryDayId: row.inventory_day_id,
    date: row.local_date,
    availabilityState: row.availability_state,
    totalCapacity: row.total_capacity,
    heldCapacity: row.held_capacity,
    bookedCapacity: row.booked_capacity,
    remainingCapacity:
      row.total_capacity - row.held_capacity - row.booked_capacity,
    minimumStayNights: row.minimum_stay_nights,
    maximumStayNights: row.maximum_stay_nights,
    arrivalAllowed: row.arrival_allowed,
    departureAllowed: row.departure_allowed,
    version: row.version,
  })) satisfies LockedInventoryDay[];
  const expectedDates = Array.from({ length: nights + 1 }, (_, index) => {
    const date = new Date(`${input.arrivalDate}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
  if (
    days.length !== expectedDates.length
    || days.some((day, index) => day.date !== expectedDates[index])
  ) {
    return {
      available: false,
      reason: "inventory_gap",
      inventoryCalendarId: input.inventoryCalendarId,
      nights,
      minimumRemainingCapacity: null,
      days,
    };
  }

  const stayDays = days.slice(0, -1);
  const minimumRemainingCapacity = Math.min(
    ...stayDays.map((day) => day.remainingCapacity),
  );
  if (!days[0].arrivalAllowed) {
    return {
      available: false,
      reason: "arrival_not_allowed",
      inventoryCalendarId: input.inventoryCalendarId,
      nights,
      minimumRemainingCapacity,
      days,
    };
  }
  if (!days.at(-1)?.departureAllowed) {
    return {
      available: false,
      reason: "departure_not_allowed",
      inventoryCalendarId: input.inventoryCalendarId,
      nights,
      minimumRemainingCapacity,
      days,
    };
  }
  if (stayDays.some((day) => day.availabilityState !== "open")) {
    return {
      available: false,
      reason: "closed",
      inventoryCalendarId: input.inventoryCalendarId,
      nights,
      minimumRemainingCapacity,
      days,
    };
  }
  if (minimumRemainingCapacity < input.requestedCapacity) {
    return {
      available: false,
      reason: "capacity_exhausted",
      inventoryCalendarId: input.inventoryCalendarId,
      nights,
      minimumRemainingCapacity,
      days,
    };
  }
  const arrivalDay = days[0];
  if (
    arrivalDay.minimumStayNights !== null
    && nights < arrivalDay.minimumStayNights
  ) {
    return {
      available: false,
      reason: "minimum_stay_not_met",
      inventoryCalendarId: input.inventoryCalendarId,
      nights,
      minimumRemainingCapacity,
      days,
    };
  }
  if (
    arrivalDay.maximumStayNights !== null
    && nights > arrivalDay.maximumStayNights
  ) {
    return {
      available: false,
      reason: "maximum_stay_exceeded",
      inventoryCalendarId: input.inventoryCalendarId,
      nights,
      minimumRemainingCapacity,
      days,
    };
  }
  return {
    available: true,
    reason: "available",
    inventoryCalendarId: input.inventoryCalendarId,
    nights,
    minimumRemainingCapacity,
    days,
  };
}

async function authorizedCalendar(
  client: PoolClient,
  input: {
    accountId: string;
    tenantSessionId: string;
    organizationId: string;
    roleKey: string;
    propertyId: string;
    unitId: string;
  },
) {
  const result = await client.query<{ inventory_calendar_id: string }>(
    `select calendar.inventory_calendar_id
     from crays_core.clubs_inventory_calendars calendar
     join crays_core.clubs_units unit
       on unit.unit_id=calendar.unit_id
      and unit.property_id=calendar.property_id
     join crays_core.clubs_properties property
       on property.property_id=calendar.property_id
     join crays_core.franchise_operator_tenants operator
       on operator.partner_tenant_id=property.partner_tenant_id
      and operator.organization_id=$3
      and operator.status='active'
     where calendar.property_id=$5
       and calendar.unit_id=$6
       and calendar.lifecycle='active'
       and exists (
         select 1 from crays_core.tenant_sessions session
         where session.session_id=$2
           and session.account_id=$1
           and session.organization_id=$3
           and session.role_key=$4
           and session.status='active'
           and session.expires_at>now()
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
             where scope.account_id=$1
               and scope.property_id=$5
               and scope.status='active'
               and scope.valid_from<=now()
               and (scope.valid_until is null or scope.valid_until>now())
               and scope.capabilities @> '["clubs.holiday.property.operate"]'::jsonb
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
              and role.role_key=membership.role_key
              and role.status='active'
             where membership.account_id=$1
               and membership.organization_id=$3
               and membership.role_key=$4
               and membership.status='active'
           )
         )
       )`,
    [
      input.accountId,
      input.tenantSessionId,
      input.organizationId,
      input.roleKey,
      input.propertyId,
      input.unitId,
    ],
  );
  return result.rows[0]?.inventory_calendar_id ?? null;
}

async function appendReceipt(
  client: PoolClient,
  input: Omit<AvailabilityCheckReceipt, "receiptId" | "replayed">,
) {
  const receiptId = id("clubs_availability_check_receipt");
  await client.query(
    `insert into crays_core.clubs_availability_check_receipts
      (availability_check_receipt_id,availability_check_request_id,outcome,
       reason,inventory_calendar_id,locked_night_count,
       minimum_remaining_capacity,inventory_snapshot_sha256)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      receiptId,
      input.requestId,
      input.outcome,
      input.reason,
      input.calendarId,
      input.lockedNightCount,
      input.minimumRemainingCapacity,
      input.inventorySnapshotSha256,
    ],
  );
  return { ...input, receiptId, replayed: false } satisfies AvailabilityCheckReceipt;
}

export async function checkClubsAvailability(input: {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: string;
  propertyId: string;
  unitId: string;
  arrivalDate: string;
  departureDate: string;
  requestedCapacity: number;
  idempotencyKey: string;
  correlationId: string;
}): Promise<AvailabilityCheckReceipt> {
  validateRange(input);
  const payloadSha256 = hash({
    propertyId: input.propertyId,
    unitId: input.unitId,
    arrivalDate: input.arrivalDate,
    departureDate: input.departureDate,
    requestedCapacity: input.requestedCapacity,
  });
  return transaction(async (client) => {
    const requestId = id("clubs_availability_check");
    const inserted = await client.query(
      `insert into crays_core.clubs_availability_check_requests
        (availability_check_request_id,idempotency_key,correlation_id,
         actor_account_id,tenant_session_id,organization_id,role_key,
         property_id,unit_id,arrival_date,departure_date,requested_capacity,
         payload_sha256)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (actor_account_id,idempotency_key) do nothing
       returning availability_check_request_id`,
      [
        requestId,
        input.idempotencyKey,
        input.correlationId,
        input.accountId,
        input.tenantSessionId,
        input.organizationId,
        input.roleKey,
        input.propertyId,
        input.unitId,
        input.arrivalDate,
        input.departureDate,
        input.requestedCapacity,
        payloadSha256,
      ],
    );
    if ((inserted.rowCount ?? 0) === 0) {
      const replay = await client.query<{
        availability_check_request_id: string;
        payload_sha256: string;
        availability_check_receipt_id: string;
        outcome: AvailabilityCheckReceipt["outcome"];
        reason: string | null;
        inventory_calendar_id: string | null;
        locked_night_count: number;
        minimum_remaining_capacity: number | null;
        inventory_snapshot_sha256: string | null;
      }>(
        `select request.availability_check_request_id,request.payload_sha256,
           receipt.availability_check_receipt_id,receipt.outcome,receipt.reason,
           receipt.inventory_calendar_id,receipt.locked_night_count,
           receipt.minimum_remaining_capacity,receipt.inventory_snapshot_sha256
         from crays_core.clubs_availability_check_requests request
         join lateral (
           select * from crays_core.clubs_availability_check_receipts
           where availability_check_request_id=request.availability_check_request_id
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
        receiptId: row.availability_check_receipt_id,
        requestId: row.availability_check_request_id,
        outcome: row.outcome,
        reason: row.reason,
        calendarId: row.inventory_calendar_id,
        lockedNightCount: row.locked_night_count,
        minimumRemainingCapacity: row.minimum_remaining_capacity,
        inventorySnapshotSha256: row.inventory_snapshot_sha256,
        replayed: true,
      };
    }

    const calendarId = await authorizedCalendar(client, input);
    if (!calendarId) {
      await client.query(
        `update crays_core.clubs_availability_check_requests
         set status='denied',completed_at=now()
         where availability_check_request_id=$1`,
        [requestId],
      );
      return appendReceipt(client, {
        requestId,
        outcome: "denied",
        reason: "active_calendar_and_unit_scope_required",
        calendarId: null,
        lockedNightCount: 0,
        minimumRemainingCapacity: null,
        inventorySnapshotSha256: null,
      });
    }
    const decision = await lockClubsInventoryRange(client, {
      inventoryCalendarId: calendarId,
      propertyId: input.propertyId,
      unitId: input.unitId,
      arrivalDate: input.arrivalDate,
      departureDate: input.departureDate,
      requestedCapacity: input.requestedCapacity,
    });
    const inventorySnapshotSha256 = hash(
      decision.days.map((day) => ({
        id: day.inventoryDayId,
        date: day.date,
        state: day.availabilityState,
        total: day.totalCapacity,
        held: day.heldCapacity,
        booked: day.bookedCapacity,
        version: day.version,
      })),
    );
    const outcome = decision.available ? "available" : "unavailable";
    await client.query(
      `update crays_core.clubs_availability_check_requests
       set status=$2,completed_at=now()
       where availability_check_request_id=$1`,
      [requestId, outcome],
    );
    return appendReceipt(client, {
      requestId,
      outcome,
      reason: decision.reason,
      calendarId,
      lockedNightCount: decision.nights,
      minimumRemainingCapacity: decision.minimumRemainingCapacity,
      inventorySnapshotSha256,
    });
  });
}
