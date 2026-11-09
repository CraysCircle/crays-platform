import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { lockClubsInventoryRange } from "@/db/clubs-availability-lock-repository";
import { getCorePgPool } from "@/db/client";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";

type CreateHoldCommand = {
  type: "create";
  quoteId: string;
  ttlMinutes: number;
};

type RefreshHoldCommand = {
  type: "refresh";
  holdId: string;
  expectedVersion: number;
  ttlMinutes: number;
};

type ReleaseHoldCommand = {
  type: "release";
  holdId: string;
  expectedVersion: number;
};

export type ReservationHoldCommand =
  | CreateHoldCommand
  | RefreshHoldCommand
  | ReleaseHoldCommand;

export type ReservationHoldReceipt = {
  receiptId: string;
  requestId: string;
  outcome: "applied" | "conflict" | "denied" | "invalid" | "noop";
  replayed: boolean;
  reason: string | null;
  holdId: string | null;
  previousVersion: number | null;
  resultingVersion: number | null;
  resultingStatus: "active" | "released" | "expired" | "converted" | null;
  expiresAt: string | null;
  capacityDelta: number;
};

type HoldRow = {
  reservation_hold_id: string;
  account_id: string;
  property_id: string;
  unit_id: string;
  inventory_calendar_id: string;
  arrival_date: string;
  departure_date: string;
  reserved_capacity: number;
  status: "active" | "released" | "expired" | "converted";
  version: number;
  expires_at: Date;
  maximum_expires_at: Date;
};

const MAXIMUM_HOLD_LIFETIME_MINUTES = 30;

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function validateIdentifier(value: string, label: string) {
  if (!/^[A-Za-z0-9:_.-]{3,180}$/.test(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function validateCommand(command: ReservationHoldCommand) {
  if (command.type === "create") {
    validateIdentifier(command.quoteId, "Quote");
  } else {
    validateIdentifier(command.holdId, "Hold");
    if (!Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 1) {
      throw new Error("Expected Hold version is invalid.");
    }
  }
  if (
    command.type !== "release"
    && (!Number.isSafeInteger(command.ttlMinutes)
      || command.ttlMinutes < 2
      || command.ttlMinutes > 20)
  ) {
    throw new Error("Hold TTL must be between 2 and 20 minutes.");
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

async function resolveAcceptableQuote(
  client: PoolClient,
  input: { accountId: string; quoteId: string },
) {
  const result = await client.query<{
    inventory_calendar_id: string;
    property_id: string;
    unit_id: string;
    arrival_date: string;
    departure_date: string;
    requested_capacity: number;
    pricing_snapshot_sha256: string;
    seller_snapshot: Record<string, unknown>;
  }>(
    `select calendar.inventory_calendar_id,quote.property_id,quote.unit_id,
       quote.arrival_date::text,quote.departure_date::text,
       quote.requested_capacity,quote.pricing_snapshot_sha256,
       quote.seller_snapshot
     from crays_core.crays_accounts account
     join crays_core.clubs_quote_snapshots quote
       on quote.quote_snapshot_id=$2
      and quote.account_id=account.account_id
      and quote.expires_at>now()
     join crays_core.clubs_properties property
       on property.property_id=quote.property_id
      and property.lifecycle='published'
     join crays_core.clubs_units unit
       on unit.unit_id=quote.unit_id
      and unit.property_id=property.property_id
      and unit.lifecycle='published'
     join crays_core.clubs_inventory_calendars calendar
       on calendar.unit_id=unit.unit_id
      and calendar.property_id=property.property_id
      and calendar.lifecycle='active'
     join crays_core.store_operator_assignments assignment
       on assignment.store_id=property.store_id
      and assignment.partner_tenant_id=property.partner_tenant_id
      and assignment.operator_legal_entity_id=property.operator_legal_entity_id
      and assignment.vertical_root='clubs'
      and assignment.status='active'
      and assignment.valid_from<=now()
      and (assignment.valid_until is null or assignment.valid_until>now())
     where account.account_id=$1
       and account.status='active'
       and not exists (
         select 1 from crays_core.clubs_quote_acceptances acceptance
         where acceptance.quote_snapshot_id=quote.quote_snapshot_id
       )
     limit 1`,
    [input.accountId, input.quoteId],
  );
  return result.rows[0] ?? null;
}

async function appendEvent(
  client: PoolClient,
  input: {
    holdId: string;
    eventType: "created" | "refreshed" | "released" | "expired";
    actorType: "member" | "expiry-worker" | "booking-core";
    actorAccountId: string | null;
    fromStatus: HoldRow["status"] | null;
    toStatus: HoldRow["status"];
    fromVersion: number | null;
    toVersion: number;
    capacityDelta: number;
    correlationId: string;
  },
) {
  await client.query(
    `insert into crays_core.clubs_reservation_hold_events
      (reservation_hold_event_id,reservation_hold_id,event_type,actor_type,
       actor_account_id,from_status,to_status,from_version,to_version,
       capacity_delta,correlation_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      id("clubs_hold_event"),
      input.holdId,
      input.eventType,
      input.actorType,
      input.actorAccountId,
      input.fromStatus,
      input.toStatus,
      input.fromVersion,
      input.toVersion,
      input.capacityDelta,
      input.correlationId,
    ],
  );
}

async function appendReceipt(
  client: PoolClient,
  input: Omit<ReservationHoldReceipt, "receiptId" | "replayed">,
) {
  const receiptId = id("clubs_hold_receipt");
  await client.query(
    `insert into crays_core.clubs_reservation_hold_command_receipts
      (reservation_hold_command_receipt_id,reservation_hold_command_request_id,
       outcome,reason,reservation_hold_id,previous_version,resulting_version,
       resulting_status,expires_at,capacity_delta)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      receiptId,
      input.requestId,
      input.outcome,
      input.reason,
      input.holdId,
      input.previousVersion,
      input.resultingVersion,
      input.resultingStatus,
      input.expiresAt,
      input.capacityDelta,
    ],
  );
  return { ...input, receiptId, replayed: false } satisfies ReservationHoldReceipt;
}

async function lockHold(
  client: PoolClient,
  holdId: string,
  accountId?: string,
) {
  const result = await client.query<HoldRow>(
    `select reservation_hold_id,account_id,property_id,unit_id,
       inventory_calendar_id,arrival_date::text,departure_date::text,
       reserved_capacity,status,version,expires_at,maximum_expires_at
     from crays_core.clubs_reservation_holds
     where reservation_hold_id=$1
       and ($2::text is null or account_id=$2)
     for update`,
    [holdId, accountId ?? null],
  );
  return result.rows[0] ?? null;
}

async function mutateHeldCapacity(
  client: PoolClient,
  hold: Pick<
    HoldRow,
    | "inventory_calendar_id"
    | "property_id"
    | "unit_id"
    | "arrival_date"
    | "departure_date"
    | "reserved_capacity"
  >,
  direction: "increment" | "decrement",
) {
  const lock = await lockClubsInventoryRange(client, {
    inventoryCalendarId: hold.inventory_calendar_id,
    propertyId: hold.property_id,
    unitId: hold.unit_id,
    arrivalDate: hold.arrival_date,
    departureDate: hold.departure_date,
    requestedCapacity: hold.reserved_capacity,
  });
  const expectedNights = Math.round(
    (Date.parse(`${hold.departure_date}T00:00:00.000Z`)
      - Date.parse(`${hold.arrival_date}T00:00:00.000Z`))
      / 86_400_000,
  );
  if (lock.days.length !== expectedNights + 1) {
    throw new Error("Inventory range is incomplete; Hold capacity mutation failed closed.");
  }
  if (direction === "increment" && !lock.available) {
    return { applied: false as const, reason: lock.reason };
  }
  for (const day of lock.days.slice(0, -1)) {
    const updated = await client.query(
      direction === "increment"
        ? `update crays_core.clubs_inventory_days
           set held_capacity=held_capacity+$2,version=version+1,updated_at=now()
           where inventory_day_id=$1
             and held_capacity+booked_capacity+$2<=total_capacity`
        : `update crays_core.clubs_inventory_days
           set held_capacity=held_capacity-$2,version=version+1,updated_at=now()
           where inventory_day_id=$1 and held_capacity>=$2`,
      [day.inventoryDayId, hold.reserved_capacity],
    );
    if ((updated.rowCount ?? 0) !== 1) {
      throw new Error("Inventory capacity changed concurrently; Hold mutation rolled back.");
    }
  }
  return { applied: true as const, reason: null };
}

async function expireLockedHold(
  client: PoolClient,
  hold: HoldRow,
  actorType: "expiry-worker" | "booking-core",
  correlationId: string,
) {
  const capacity = await mutateHeldCapacity(client, hold, "decrement");
  if (!capacity.applied) throw new Error("Expired Hold capacity could not be released.");
  const resultingVersion = hold.version + 1;
  const updated = await client.query(
    `update crays_core.clubs_reservation_holds
     set status='expired',version=$2,expired_at=now(),updated_at=now()
     where reservation_hold_id=$1 and status='active' and version=$3`,
    [hold.reservation_hold_id, resultingVersion, hold.version],
  );
  if ((updated.rowCount ?? 0) !== 1) {
    throw new Error("Expired Hold changed concurrently; worker transaction rolled back.");
  }
  await appendEvent(client, {
    holdId: hold.reservation_hold_id,
    eventType: "expired",
    actorType,
    actorAccountId: null,
    fromStatus: "active",
    toStatus: "expired",
    fromVersion: hold.version,
    toVersion: resultingVersion,
    capacityDelta: -hold.reserved_capacity,
    correlationId,
  });
  return resultingVersion;
}

export async function executeReservationHoldCommand(input: {
  accountId: string;
  idempotencyKey: string;
  correlationId: string;
  command: ReservationHoldCommand;
}): Promise<ReservationHoldReceipt> {
  validateCommand(input.command);
  if (!/^[A-Za-z0-9:_.-]{16,200}$/.test(input.idempotencyKey)) {
    throw new Error("A strong idempotency key is required.");
  }
  const payloadSha256 = hash(input.command);
  return transaction(async (client) => {
    const requestId = id("clubs_hold_command");
    const commandHoldId =
      input.command.type === "create" ? null : input.command.holdId;
    const expectedVersion =
      input.command.type === "create" ? null : input.command.expectedVersion;
    const inserted = await client.query(
      `insert into crays_core.clubs_reservation_hold_command_requests
        (reservation_hold_command_request_id,idempotency_key,correlation_id,
         actor_account_id,reservation_hold_id,command_type,expected_version,
         payload_sha256)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (actor_account_id,idempotency_key) do nothing
       returning reservation_hold_command_request_id`,
      [
        requestId,
        input.idempotencyKey,
        input.correlationId,
        input.accountId,
        commandHoldId,
        input.command.type,
        expectedVersion,
        payloadSha256,
      ],
    );
    if ((inserted.rowCount ?? 0) === 0) {
      const replay = await client.query<{
        reservation_hold_command_request_id: string;
        payload_sha256: string;
        reservation_hold_command_receipt_id: string;
        outcome: ReservationHoldReceipt["outcome"];
        reason: string | null;
        reservation_hold_id: string | null;
        previous_version: number | null;
        resulting_version: number | null;
        resulting_status: ReservationHoldReceipt["resultingStatus"];
        expires_at: Date | null;
        capacity_delta: number;
      }>(
        `select request.reservation_hold_command_request_id,request.payload_sha256,
           receipt.reservation_hold_command_receipt_id,receipt.outcome,receipt.reason,
           receipt.reservation_hold_id,receipt.previous_version,
           receipt.resulting_version,receipt.resulting_status,receipt.expires_at,
           receipt.capacity_delta
         from crays_core.clubs_reservation_hold_command_requests request
         join lateral (
           select * from crays_core.clubs_reservation_hold_command_receipts
           where reservation_hold_command_request_id=request.reservation_hold_command_request_id
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
        receiptId: row.reservation_hold_command_receipt_id,
        requestId: row.reservation_hold_command_request_id,
        outcome: row.outcome,
        replayed: true,
        reason: row.reason,
        holdId: row.reservation_hold_id,
        previousVersion: row.previous_version,
        resultingVersion: row.resulting_version,
        resultingStatus: row.resulting_status,
        expiresAt: row.expires_at?.toISOString() ?? null,
        capacityDelta: row.capacity_delta,
      };
    }

    if (input.command.type === "create") {
      const quote = await resolveAcceptableQuote(client, {
        accountId: input.accountId,
        quoteId: input.command.quoteId,
      });
      if (!quote) {
        await client.query(
          `update crays_core.clubs_reservation_hold_command_requests
           set status='denied',completed_at=now()
           where reservation_hold_command_request_id=$1`,
          [requestId],
        );
        return appendReceipt(client, {
          requestId,
          outcome: "denied",
          reason: "own_active_unaccepted_quote_and_published_unit_required",
          holdId: null,
          previousVersion: null,
          resultingVersion: null,
          resultingStatus: null,
          expiresAt: null,
          capacityDelta: 0,
        });
      }
      await client.query("savepoint hold_create_apply");
      const capacity = await mutateHeldCapacity(
        client,
        {
          inventory_calendar_id: quote.inventory_calendar_id,
          property_id: quote.property_id,
          unit_id: quote.unit_id,
          arrival_date: quote.arrival_date,
          departure_date: quote.departure_date,
          reserved_capacity: quote.requested_capacity,
        },
        "increment",
      );
      if (!capacity.applied) {
        await client.query(
          `update crays_core.clubs_reservation_hold_command_requests
           set status='conflict',completed_at=now()
           where reservation_hold_command_request_id=$1`,
          [requestId],
        );
        return appendReceipt(client, {
          requestId,
          outcome: "conflict",
          reason: capacity.reason,
          holdId: null,
          previousVersion: null,
          resultingVersion: null,
          resultingStatus: null,
          expiresAt: null,
          capacityDelta: 0,
        });
      }
      const duplicate = await client.query<{ reservation_hold_id: string }>(
        `select reservation_hold_id
         from crays_core.clubs_reservation_holds
         where account_id=$1 and inventory_calendar_id=$2
           and arrival_date=$3 and departure_date=$4 and status='active'
         for update`,
        [
          input.accountId,
          quote.inventory_calendar_id,
          quote.arrival_date,
          quote.departure_date,
        ],
      );
      if (duplicate.rows[0]) {
        await client.query("rollback to savepoint hold_create_apply");
        await client.query(
          `update crays_core.clubs_reservation_hold_command_requests
           set status='conflict',completed_at=now()
           where reservation_hold_command_request_id=$1`,
          [requestId],
        );
        return appendReceipt(client, {
          requestId,
          outcome: "conflict",
          reason: "active_hold_already_exists_for_stay",
          holdId: duplicate.rows[0].reservation_hold_id,
          previousVersion: null,
          resultingVersion: null,
          resultingStatus: "active",
          expiresAt: null,
          capacityDelta: 0,
        });
      }
      const holdId = id("clubs_hold");
      const expiresAt = new Date(Date.now() + input.command.ttlMinutes * 60_000);
      const maximumExpiresAt = new Date(
        Date.now() + MAXIMUM_HOLD_LIFETIME_MINUTES * 60_000,
      );
      await client.query(
        `insert into crays_core.clubs_reservation_holds
          (reservation_hold_id,account_id,property_id,unit_id,
           inventory_calendar_id,arrival_date,departure_date,reserved_capacity,
           expires_at,maximum_expires_at,quote_snapshot_id)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          holdId,
          input.accountId,
          quote.property_id,
          quote.unit_id,
          quote.inventory_calendar_id,
          quote.arrival_date,
          quote.departure_date,
          quote.requested_capacity,
          expiresAt,
          maximumExpiresAt,
          input.command.quoteId,
        ],
      );
      await client.query(
        `insert into crays_core.clubs_quote_acceptances
          (quote_acceptance_id,quote_snapshot_id,reservation_hold_id,account_id,
           accepted_pricing_sha256,accepted_seller_sha256,correlation_id)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [
          id("clubs_quote_acceptance"),
          input.command.quoteId,
          holdId,
          input.accountId,
          quote.pricing_snapshot_sha256,
          hash(quote.seller_snapshot),
          `${input.correlationId}:quote-accepted`,
        ],
      );
      await client.query(
        `update crays_core.clubs_reservation_hold_command_requests
         set reservation_hold_id=$2,status='applied',completed_at=now()
         where reservation_hold_command_request_id=$1`,
        [requestId, holdId],
      );
      await appendEvent(client, {
        holdId,
        eventType: "created",
        actorType: "member",
        actorAccountId: input.accountId,
        fromStatus: null,
        toStatus: "active",
        fromVersion: null,
        toVersion: 1,
        capacityDelta: quote.requested_capacity,
        correlationId: input.correlationId,
      });
      return appendReceipt(client, {
        requestId,
        outcome: "applied",
        reason: null,
        holdId,
        previousVersion: null,
        resultingVersion: 1,
        resultingStatus: "active",
        expiresAt: expiresAt.toISOString(),
        capacityDelta: quote.requested_capacity,
      });
    }

    const hold = await lockHold(client, input.command.holdId, input.accountId);
    if (!hold) {
      await client.query(
        `update crays_core.clubs_reservation_hold_command_requests
         set status='denied',completed_at=now()
         where reservation_hold_command_request_id=$1`,
        [requestId],
      );
      return appendReceipt(client, {
        requestId,
        outcome: "denied",
        reason: "own_hold_required",
        holdId: null,
        previousVersion: null,
        resultingVersion: null,
        resultingStatus: null,
        expiresAt: null,
        capacityDelta: 0,
      });
    }
    if (hold.version !== input.command.expectedVersion) {
      await client.query(
        `update crays_core.clubs_reservation_hold_command_requests
         set status='conflict',completed_at=now()
         where reservation_hold_command_request_id=$1`,
        [requestId],
      );
      return appendReceipt(client, {
        requestId,
        outcome: "conflict",
        reason: "hold_version_conflict",
        holdId: hold.reservation_hold_id,
        previousVersion: hold.version,
        resultingVersion: hold.version,
        resultingStatus: hold.status,
        expiresAt: hold.expires_at.toISOString(),
        capacityDelta: 0,
      });
    }
    if (hold.status !== "active") {
      await client.query(
        `update crays_core.clubs_reservation_hold_command_requests
         set status='noop',completed_at=now()
         where reservation_hold_command_request_id=$1`,
        [requestId],
      );
      return appendReceipt(client, {
        requestId,
        outcome: "noop",
        reason: `hold_already_${hold.status}`,
        holdId: hold.reservation_hold_id,
        previousVersion: hold.version,
        resultingVersion: hold.version,
        resultingStatus: hold.status,
        expiresAt: hold.expires_at.toISOString(),
        capacityDelta: 0,
      });
    }
    if (hold.expires_at.getTime() <= Date.now()) {
      const resultingVersion = await expireLockedHold(
        client,
        hold,
        "booking-core",
        `${input.correlationId}:opportunistic-expiry`,
      );
      await client.query(
        `update crays_core.clubs_reservation_hold_command_requests
         set status='conflict',completed_at=now()
         where reservation_hold_command_request_id=$1`,
        [requestId],
      );
      return appendReceipt(client, {
        requestId,
        outcome: "conflict",
        reason: "hold_expired",
        holdId: hold.reservation_hold_id,
        previousVersion: hold.version,
        resultingVersion,
        resultingStatus: "expired",
        expiresAt: hold.expires_at.toISOString(),
        capacityDelta: -hold.reserved_capacity,
      });
    }

    if (input.command.type === "refresh") {
      const requestedExpiry = new Date(
        Date.now() + input.command.ttlMinutes * 60_000,
      );
      const expiresAt = new Date(
        Math.min(requestedExpiry.getTime(), hold.maximum_expires_at.getTime()),
      );
      if (expiresAt.getTime() <= Date.now()) {
        throw new Error("The Hold maximum lifetime has elapsed.");
      }
      const resultingVersion = hold.version + 1;
      const updated = await client.query(
        `update crays_core.clubs_reservation_holds
         set expires_at=$2,version=$3,updated_at=now()
         where reservation_hold_id=$1 and status='active' and version=$4`,
        [hold.reservation_hold_id, expiresAt, resultingVersion, hold.version],
      );
      if ((updated.rowCount ?? 0) !== 1) {
        throw new Error("Hold changed concurrently; refresh transaction rolled back.");
      }
      await client.query(
        `update crays_core.clubs_reservation_hold_command_requests
         set status='applied',completed_at=now()
         where reservation_hold_command_request_id=$1`,
        [requestId],
      );
      await appendEvent(client, {
        holdId: hold.reservation_hold_id,
        eventType: "refreshed",
        actorType: "member",
        actorAccountId: input.accountId,
        fromStatus: "active",
        toStatus: "active",
        fromVersion: hold.version,
        toVersion: resultingVersion,
        capacityDelta: 0,
        correlationId: input.correlationId,
      });
      return appendReceipt(client, {
        requestId,
        outcome: "applied",
        reason: null,
        holdId: hold.reservation_hold_id,
        previousVersion: hold.version,
        resultingVersion,
        resultingStatus: "active",
        expiresAt: expiresAt.toISOString(),
        capacityDelta: 0,
      });
    }

    const capacity = await mutateHeldCapacity(client, hold, "decrement");
    if (!capacity.applied) throw new Error("Hold capacity release failed closed.");
    const resultingVersion = hold.version + 1;
    const updated = await client.query(
      `update crays_core.clubs_reservation_holds
       set status='released',version=$2,released_at=now(),updated_at=now()
       where reservation_hold_id=$1 and status='active' and version=$3`,
      [hold.reservation_hold_id, resultingVersion, hold.version],
    );
    if ((updated.rowCount ?? 0) !== 1) {
      throw new Error("Hold changed concurrently; release transaction rolled back.");
    }
    await client.query(
      `update crays_core.clubs_reservation_hold_command_requests
       set status='applied',completed_at=now()
       where reservation_hold_command_request_id=$1`,
      [requestId],
    );
    await appendEvent(client, {
      holdId: hold.reservation_hold_id,
      eventType: "released",
      actorType: "member",
      actorAccountId: input.accountId,
      fromStatus: "active",
      toStatus: "released",
      fromVersion: hold.version,
      toVersion: resultingVersion,
      capacityDelta: -hold.reserved_capacity,
      correlationId: input.correlationId,
    });
    return appendReceipt(client, {
      requestId,
      outcome: "applied",
      reason: null,
      holdId: hold.reservation_hold_id,
      previousVersion: hold.version,
      resultingVersion,
      resultingStatus: "released",
      expiresAt: hold.expires_at.toISOString(),
      capacityDelta: -hold.reserved_capacity,
    });
  });
}

export async function readOwnReservationHolds(accountId: string) {
  const result = await getCorePgPool().query<HoldRow>(
    `select reservation_hold_id,account_id,property_id,unit_id,
       inventory_calendar_id,arrival_date::text,departure_date::text,
       reserved_capacity,status,version,expires_at,maximum_expires_at
     from crays_core.clubs_reservation_holds
     where account_id=$1
     order by updated_at desc
     limit 50`,
    [accountId],
  );
  return result.rows.map((row) => ({
    holdId: row.reservation_hold_id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    arrivalDate: row.arrival_date,
    departureDate: row.departure_date,
    reservedCapacity: row.reserved_capacity,
    status: row.status,
    version: row.version,
    expiresAt: row.expires_at.toISOString(),
    maximumExpiresAt: row.maximum_expires_at.toISOString(),
  }));
}

export async function expireReservationHoldsBatch(limit = 25) {
  const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const expiredHoldIds: string[] = [];
  for (let index = 0; index < boundedLimit; index += 1) {
    const expired = await transaction(async (client) => {
      const candidate = await client.query<HoldRow>(
        `select reservation_hold_id,account_id,property_id,unit_id,
           inventory_calendar_id,arrival_date::text,departure_date::text,
           reserved_capacity,status,version,expires_at,maximum_expires_at
         from crays_core.clubs_reservation_holds
         where status='active' and expires_at<=now()
         order by expires_at,reservation_hold_id
         for update skip locked
         limit 1`,
      );
      const hold = candidate.rows[0];
      if (!hold) return null;
      await expireLockedHold(
        client,
        hold,
        "expiry-worker",
        `clubs-hold-expiry:${hold.reservation_hold_id}:v${hold.version + 1}`,
      );
      return hold.reservation_hold_id;
    });
    if (!expired) break;
    expiredHoldIds.push(expired);
  }
  return {
    status: "completed" as const,
    expiredCount: expiredHoldIds.length,
    expiredHoldIds,
    workerRecovery: "transactional-skip-locked" as const,
  };
}
