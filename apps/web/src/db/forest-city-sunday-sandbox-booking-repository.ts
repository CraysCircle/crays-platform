import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import {
  FOREST_CITY_MARINA_PROPERTY_ID,
  FOREST_CITY_SUNDAY_SANDBOX_BOUNDARY,
  FOREST_CITY_SUNDAY_SANDBOX_SCENARIO,
  calculateForestCitySundaySandboxQuote,
  forestCitySundaySandboxRequestSha256,
  validateForestCitySundaySandboxHoldEvidence,
  validateForestCitySundaySandboxStay,
  type ForestCitySundaySandboxHoldEvidence,
  type ForestCitySundaySandboxPropertyId,
  type ForestCitySundaySandboxStayUnit,
} from "@/lib/member-commerce/forest-city-sunday-sandbox-booking-contract";

type CommandType =
  | "issue_quote"
  | "create_hold"
  | "submit_booking_request"
  | "confirm_booking"
  | "release_hold"
  | "cancel_booking";

type StayInput = {
  accountId: string;
  propertyId: ForestCitySundaySandboxPropertyId;
  stayUnit: ForestCitySundaySandboxStayUnit;
  checkIn: string;
  checkOut: string;
  quantity?: number;
};

type CommandInput = { idempotencyKey: string };
type GuestPayload = {
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  adults: number;
  dependentMinors: number;
};

const idempotencyNamespace =
  "crays.clubs.forest-city-sunday-sandbox-booking.command.v1";
const strongIdempotencyKey = /^[A-Za-z0-9:_.-]{16,200}$/;

export class ForestCitySundaySandboxRepositoryError extends Error {
  constructor(
    readonly code:
      | "SANDBOX_IDEMPOTENCY_KEY_INVALID"
      | "SANDBOX_IDEMPOTENCY_CONFLICT"
      | "SANDBOX_QUOTE_NOT_ACTIVE"
      | "SANDBOX_HOLD_NOT_ACTIVE"
      | "SANDBOX_BOOKING_REQUEST_NOT_ACTIVE"
      | "SANDBOX_BOOKING_NOT_ACTIVE"
      | "SANDBOX_PARTY_GO_NOT_VALID"
      | "SANDBOX_MEMBERSHIP_NOT_VALID"
      | "SANDBOX_PROPERTY_ADMISSION_NOT_VALID"
      | "SANDBOX_NO_AVAILABILITY",
  ) {
    super(code.toLowerCase());
    this.name = "ForestCitySundaySandboxRepositoryError";
  }
}

function idempotencySha256(key: string) {
  if (!strongIdempotencyKey.test(key)) {
    throw new ForestCitySundaySandboxRepositoryError(
      "SANDBOX_IDEMPOTENCY_KEY_INVALID",
    );
  }
  return createHash("sha256")
    .update(`${idempotencyNamespace}\n${key}`, "utf8")
    .digest("hex");
}

function sandboxEnvelope<T extends Record<string, unknown>>(payload: T) {
  return { ...FOREST_CITY_SUNDAY_SANDBOX_BOUNDARY, ...payload } as const;
}

async function insertEvent(
  client: PoolClient,
  input: {
    aggregateType: "quote" | "hold" | "booking_request" | "booking";
    aggregateId: string;
    eventType:
      | "QUOTE_ISSUED"
      | "HOLD_CREATED"
      | "HOLD_RELEASED"
      | "BOOKING_REQUEST_SUBMITTED"
      | "BOOKING_CONFIRMED"
      | "BOOKING_CANCELLED";
    actorAccountId: string;
    payload: Record<string, unknown>;
  },
) {
  const eventId = `fc-sunday-event_${randomUUID()}`;
  const eventSha256 = forestCitySundaySandboxRequestSha256({
    eventId,
    ...input,
  });
  await client.query(
    `insert into crays_core.clubs_fc_sunday_sandbox_events(
       event_id,scenario_key,aggregate_type,aggregate_id,event_type,
       actor_account_id,event_payload,event_sha256
     ) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
    [
      eventId,
      FOREST_CITY_SUNDAY_SANDBOX_SCENARIO,
      input.aggregateType,
      input.aggregateId,
      input.eventType,
      input.actorAccountId,
      JSON.stringify(input.payload),
      eventSha256,
    ],
  );
}

async function runCommand<T extends Record<string, unknown>>(
  commandType: CommandType,
  commandInput: CommandInput,
  request: Record<string, unknown>,
  run: (client: PoolClient) => Promise<T>,
) {
  const idempotency = idempotencySha256(commandInput.idempotencyKey);
  const requestSha256 = forestCitySundaySandboxRequestSha256(request);
  const pool = getCorePgPool();
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("begin isolation level serializable");
    transactionOpen = true;
    await client.query(
      "select set_config('crays.app_role','core_service',true)",
    );
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
      `${commandType}:${idempotency}`,
    ]);

    const replay = await client.query<{
      request_sha256: string;
      response_payload: T;
    }>(
      `select request_sha256,response_payload
         from crays_core.clubs_fc_sunday_sandbox_command_receipts
        where scenario_key=$1 and command_type=$2 and idempotency_sha256=$3`,
      [FOREST_CITY_SUNDAY_SANDBOX_SCENARIO, commandType, idempotency],
    );
    if (replay.rows[0]) {
      if (replay.rows[0].request_sha256 !== requestSha256) {
        throw new ForestCitySundaySandboxRepositoryError(
          "SANDBOX_IDEMPOTENCY_CONFLICT",
        );
      }
      await client.query("commit");
      transactionOpen = false;
      return replay.rows[0].response_payload;
    }

    const response = await run(client);
    await client.query(
      `insert into crays_core.clubs_fc_sunday_sandbox_command_receipts(
         command_receipt_id,scenario_key,command_type,idempotency_sha256,
         request_sha256,response_payload
       ) values ($1,$2,$3,$4,$5,$6::jsonb)`,
      [
        `fc-sunday-command_${randomUUID()}`,
        FOREST_CITY_SUNDAY_SANDBOX_SCENARIO,
        commandType,
        idempotency,
        requestSha256,
        JSON.stringify(response),
      ],
    );
    await client.query("commit");
    transactionOpen = false;
    return response;
  } catch (error) {
    if (transactionOpen) await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function availabilityWithClient(client: PoolClient, input: StayInput) {
  const stay = validateForestCitySundaySandboxStay(input);
  const result = await client.query<{
    capacity_units: number;
    active_hold_units: number;
    confirmed_booking_units: number;
  }>(
    `select o.capacity_units,
       coalesce((select sum(h.quantity)::int
         from crays_core.clubs_fc_sunday_sandbox_holds h
        where h.scenario_key=o.scenario_key and h.property_id=o.property_id
          and h.status='held' and h.expires_at>clock_timestamp()
          and h.check_in<$4::date and h.check_out>$3::date),0)::int active_hold_units,
       coalesce((select sum(b.quantity)::int
         from crays_core.clubs_fc_sunday_sandbox_bookings b
        where b.scenario_key=o.scenario_key and b.property_id=o.property_id
          and b.status='confirmed'
          and b.check_in<$4::date and b.check_out>$3::date),0)::int confirmed_booking_units
     from crays_core.clubs_fc_sunday_sandbox_offers o
     where o.scenario_key=$1 and o.property_id=$2 and o.stay_unit=$5`,
    [
      FOREST_CITY_SUNDAY_SANDBOX_SCENARIO,
      input.propertyId,
      input.checkIn,
      input.checkOut,
      input.stayUnit,
    ],
  );
  const row = result.rows[0];
  if (!row) {
    throw new ForestCitySundaySandboxRepositoryError("SANDBOX_NO_AVAILABILITY");
  }
  const availableUnits = Math.max(
    0,
    row.capacity_units - row.active_hold_units - row.confirmed_booking_units,
  );
  return sandboxEnvelope({
    propertyId: input.propertyId,
    stayUnit: input.stayUnit,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights: stay.nights,
    capacityUnits: row.capacity_units,
    activeHoldUnits: row.active_hold_units,
    confirmedBookingUnits: row.confirmed_booking_units,
    availableUnits,
    quoteAuthority: false,
    bookingAuthority: false,
  });
}

async function assertPartyGo(
  client: PoolClient,
  input: {
    partyGoReceiptId: string;
    accountId: string;
    propertyId: ForestCitySundaySandboxPropertyId;
    stayUnit: ForestCitySundaySandboxStayUnit;
  },
) {
  const result = await client.query(
    `select 1
       from crays_core.clubs_booking_membership_party_go_receipts g
       join crays_core.clubs_booking_membership_application_handoffs h
         on h.handoff_id=g.handoff_id
      where g.party_go_receipt_id=$1 and h.account_id=$2
        and h.property_id=$3 and h.stay_unit=$4
        and g.outcome='approved_for_membership_payment'
        and h.state='approved_for_membership_payment'`,
    [input.partyGoReceiptId, input.accountId, input.propertyId, input.stayUnit],
  );
  if (result.rowCount !== 1) {
    throw new ForestCitySundaySandboxRepositoryError(
      "SANDBOX_PARTY_GO_NOT_VALID",
    );
  }
}

async function assertMarinaEvidence(
  client: PoolClient,
  input: {
    accountId: string;
    membershipId: string;
    admissionGrantId: string;
  },
) {
  const membership = await client.query(
    `select 1 from crays_core.clubs_member_memberships
      where membership_id=$1 and account_id=$2 and status='confirmed'
        and valid_from<=clock_timestamp()
        and (valid_until is null or valid_until>clock_timestamp())`,
    [input.membershipId, input.accountId],
  );
  if (membership.rowCount !== 1) {
    throw new ForestCitySundaySandboxRepositoryError(
      "SANDBOX_MEMBERSHIP_NOT_VALID",
    );
  }

  const admission = await client.query(
    `select 1
       from crays_core.clubs_property_admission_grants g
      where g.grant_id=$1 and g.account_id=$2 and g.property_id=$3
        and g.valid_from<=clock_timestamp()
        and (g.valid_until is null or g.valid_until>clock_timestamp())
        and exists (
          select 1 from crays_core.clubs_property_admission_grant_events e
           where e.grant_id=g.grant_id and e.grant_version=g.grant_version
             and e.event_type='GRANTED' and e.effective_at<=clock_timestamp()
        )
        and not exists (
          select 1 from crays_core.clubs_property_admission_grant_events e
           where e.grant_id=g.grant_id and e.grant_version=g.grant_version
             and e.event_type='REVOKED' and e.effective_at<=clock_timestamp()
        )
      order by g.grant_version desc limit 1`,
    [input.admissionGrantId, input.accountId, FOREST_CITY_MARINA_PROPERTY_ID],
  );
  if (admission.rowCount !== 1) {
    throw new ForestCitySundaySandboxRepositoryError(
      "SANDBOX_PROPERTY_ADMISSION_NOT_VALID",
    );
  }
}

export async function readForestCitySundaySandboxAvailability(
  input: StayInput,
) {
  const client = await getCorePgPool().connect();
  try {
    await client.query(
      "select set_config('crays.app_role','core_service',false)",
    );
    return await availabilityWithClient(client, input);
  } finally {
    client.release();
  }
}

export async function issueForestCitySundaySandboxQuote(
  input: StayInput & CommandInput,
) {
  const amounts = calculateForestCitySundaySandboxQuote(input);
  return runCommand("issue_quote", input, input, async (client) => {
    const quoteId = `fc-sunday-quote_${randomUUID()}`;
    const inserted = await client.query<{ expires_at: string }>(
      `insert into crays_core.clubs_fc_sunday_sandbox_quotes(
         quote_id,scenario_key,account_id,offer_id,property_id,stay_unit,
         check_in,check_out,nights,unit_count,quantity,currency,
         unit_amount_minor,total_minor,request_sha256,expires_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
                 transaction_timestamp()+interval '30 minutes')
       returning expires_at::text`,
      [
        quoteId,
        FOREST_CITY_SUNDAY_SANDBOX_SCENARIO,
        input.accountId,
        amounts.offer.offerId,
        input.propertyId,
        input.stayUnit,
        input.checkIn,
        input.checkOut,
        amounts.nights,
        amounts.unitCount,
        amounts.quantity,
        amounts.currency,
        amounts.offer.unitAmountMinor,
        amounts.totalMinor,
        forestCitySundaySandboxRequestSha256(input),
      ],
    );
    const response = sandboxEnvelope({
      quoteId,
      accountId: input.accountId,
      propertyId: input.propertyId,
      stayUnit: input.stayUnit,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      quantity: amounts.quantity,
      currency: amounts.currency,
      unitAmountMinor: amounts.offer.unitAmountMinor,
      totalMinor: amounts.totalMinor,
      status: "issued",
      expiresAt: inserted.rows[0]!.expires_at,
      reservesInventory: false,
    });
    await insertEvent(client, {
      aggregateType: "quote",
      aggregateId: quoteId,
      eventType: "QUOTE_ISSUED",
      actorAccountId: input.accountId,
      payload: response,
    });
    return response;
  });
}

export async function createForestCitySundaySandboxHold(
  input: {
    accountId: string;
    quoteId: string;
  } & ForestCitySundaySandboxHoldEvidence &
    CommandInput,
) {
  return runCommand("create_hold", input, input, async (client) => {
    const quoteResult = await client.query<{
      property_id: ForestCitySundaySandboxPropertyId;
      stay_unit: ForestCitySundaySandboxStayUnit;
      check_in: string;
      check_out: string;
      quantity: number;
    }>(
      `select property_id,stay_unit,check_in::text,check_out::text,quantity
         from crays_core.clubs_fc_sunday_sandbox_quotes
        where quote_id=$1 and account_id=$2 and status='issued'
          and expires_at>clock_timestamp() for update`,
      [input.quoteId, input.accountId],
    );
    const quote = quoteResult.rows[0];
    if (!quote) {
      throw new ForestCitySundaySandboxRepositoryError(
        "SANDBOX_QUOTE_NOT_ACTIVE",
      );
    }
    const evidence = validateForestCitySundaySandboxHoldEvidence(
      quote.property_id,
      input,
    );
    await assertPartyGo(client, {
      partyGoReceiptId: evidence.partyGoReceiptId,
      accountId: input.accountId,
      propertyId: quote.property_id,
      stayUnit: quote.stay_unit,
    });
    if (quote.property_id === FOREST_CITY_MARINA_PROPERTY_ID) {
      await assertMarinaEvidence(client, {
        accountId: input.accountId,
        membershipId: evidence.membershipId!,
        admissionGrantId: evidence.admissionGrantId!,
      });
    }

    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
      `${FOREST_CITY_SUNDAY_SANDBOX_SCENARIO}:${quote.property_id}`,
    ]);
    const availability = await availabilityWithClient(client, {
      accountId: input.accountId,
      propertyId: quote.property_id,
      stayUnit: quote.stay_unit,
      checkIn: quote.check_in,
      checkOut: quote.check_out,
    });
    if (availability.availableUnits < quote.quantity) {
      throw new ForestCitySundaySandboxRepositoryError(
        "SANDBOX_NO_AVAILABILITY",
      );
    }

    const holdId = `fc-sunday-hold_${randomUUID()}`;
    const inserted = await client.query<{ expires_at: string }>(
      `insert into crays_core.clubs_fc_sunday_sandbox_holds(
         hold_id,scenario_key,quote_id,account_id,property_id,stay_unit,
         check_in,check_out,quantity,party_go_receipt_id,membership_id,
         admission_grant_id,expires_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
                 transaction_timestamp()+interval '15 minutes')
       returning expires_at::text`,
      [
        holdId,
        FOREST_CITY_SUNDAY_SANDBOX_SCENARIO,
        input.quoteId,
        input.accountId,
        quote.property_id,
        quote.stay_unit,
        quote.check_in,
        quote.check_out,
        quote.quantity,
        evidence.partyGoReceiptId,
        evidence.membershipId,
        evidence.admissionGrantId,
      ],
    );
    await client.query(
      `update crays_core.clubs_fc_sunday_sandbox_quotes
          set status='held' where quote_id=$1`,
      [input.quoteId],
    );
    const response = sandboxEnvelope({
      holdId,
      quoteId: input.quoteId,
      accountId: input.accountId,
      propertyId: quote.property_id,
      stayUnit: quote.stay_unit,
      checkIn: quote.check_in,
      checkOut: quote.check_out,
      quantity: quote.quantity,
      status: "held",
      expiresAt: inserted.rows[0]!.expires_at,
      providerReservationCreated: false,
    });
    await insertEvent(client, {
      aggregateType: "hold",
      aggregateId: holdId,
      eventType: "HOLD_CREATED",
      actorAccountId: input.accountId,
      payload: response,
    });
    return response;
  });
}

function validateGuestPayload(guest: GuestPayload) {
  if (
    guest.guestName.trim().length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.guestEmail.trim()) ||
    !Number.isInteger(guest.adults) ||
    guest.adults < 1 ||
    guest.adults > 20 ||
    !Number.isInteger(guest.dependentMinors) ||
    guest.dependentMinors < 0 ||
    guest.dependentMinors > 20
  ) {
    throw new TypeError("invalid_sandbox_guest_payload");
  }
  return {
    guestName: guest.guestName.trim(),
    guestEmail: guest.guestEmail.trim().toLowerCase(),
    guestPhone: guest.guestPhone?.trim() || null,
    adults: guest.adults,
    dependentMinors: guest.dependentMinors,
  };
}

export async function submitForestCitySundaySandboxBookingRequest(
  input: {
    accountId: string;
    holdId: string;
    guest: GuestPayload;
  } & CommandInput,
) {
  const guest = validateGuestPayload(input.guest);
  return runCommand(
    "submit_booking_request",
    input,
    { ...input, guest },
    async (client) => {
      const held = await client.query<{
        quote_id: string;
        property_id: ForestCitySundaySandboxPropertyId;
      }>(
        `select quote_id,property_id
           from crays_core.clubs_fc_sunday_sandbox_holds
          where hold_id=$1 and account_id=$2 and status='held'
            and expires_at>clock_timestamp() for update`,
        [input.holdId, input.accountId],
      );
      const hold = held.rows[0];
      if (!hold) {
        throw new ForestCitySundaySandboxRepositoryError(
          "SANDBOX_HOLD_NOT_ACTIVE",
        );
      }
      const bookingRequestId = `fc-sunday-request_${randomUUID()}`;
      await client.query(
        `insert into crays_core.clubs_fc_sunday_sandbox_booking_requests(
           booking_request_id,scenario_key,hold_id,quote_id,account_id,
           property_id,guest_payload
         ) values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [
          bookingRequestId,
          FOREST_CITY_SUNDAY_SANDBOX_SCENARIO,
          input.holdId,
          hold.quote_id,
          input.accountId,
          hold.property_id,
          JSON.stringify(guest),
        ],
      );
      const response = sandboxEnvelope({
        bookingRequestId,
        holdId: input.holdId,
        quoteId: hold.quote_id,
        accountId: input.accountId,
        propertyId: hold.property_id,
        status: "submitted",
        bookingCreated: false,
      });
      await insertEvent(client, {
        aggregateType: "booking_request",
        aggregateId: bookingRequestId,
        eventType: "BOOKING_REQUEST_SUBMITTED",
        actorAccountId: input.accountId,
        payload: response,
      });
      return response;
    },
  );
}

export async function confirmForestCitySundaySandboxBooking(
  input: {
    bookingRequestId: string;
    actorAccountId: string;
  } & CommandInput,
) {
  return runCommand("confirm_booking", input, input, async (client) => {
    const requested = await client.query<{
      hold_id: string;
      quote_id: string;
      account_id: string;
      property_id: ForestCitySundaySandboxPropertyId;
      check_in: string;
      check_out: string;
      quantity: number;
    }>(
      `select r.hold_id,r.quote_id,r.account_id,r.property_id,
              h.check_in::text,h.check_out::text,h.quantity
         from crays_core.clubs_fc_sunday_sandbox_booking_requests r
         join crays_core.clubs_fc_sunday_sandbox_holds h on h.hold_id=r.hold_id
        where r.booking_request_id=$1 and r.status='submitted'
          and h.status='held' and h.expires_at>clock_timestamp()
        for update of r,h`,
      [input.bookingRequestId],
    );
    const request = requested.rows[0];
    if (!request) {
      throw new ForestCitySundaySandboxRepositoryError(
        "SANDBOX_BOOKING_REQUEST_NOT_ACTIVE",
      );
    }
    const bookingId = `fc-sunday-booking_${randomUUID()}`;
    await client.query(
      `insert into crays_core.clubs_fc_sunday_sandbox_bookings(
         booking_id,scenario_key,booking_request_id,hold_id,quote_id,
         account_id,property_id,check_in,check_out,quantity
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        bookingId,
        FOREST_CITY_SUNDAY_SANDBOX_SCENARIO,
        input.bookingRequestId,
        request.hold_id,
        request.quote_id,
        request.account_id,
        request.property_id,
        request.check_in,
        request.check_out,
        request.quantity,
      ],
    );
    await client.query(
      `update crays_core.clubs_fc_sunday_sandbox_holds
          set status='converted',updated_at=transaction_timestamp()
        where hold_id=$1`,
      [request.hold_id],
    );
    await client.query(
      `update crays_core.clubs_fc_sunday_sandbox_booking_requests
          set status='accepted',updated_at=transaction_timestamp()
        where booking_request_id=$1`,
      [input.bookingRequestId],
    );
    const response = sandboxEnvelope({
      bookingId,
      bookingRequestId: input.bookingRequestId,
      holdId: request.hold_id,
      quoteId: request.quote_id,
      accountId: request.account_id,
      propertyId: request.property_id,
      checkIn: request.check_in,
      checkOut: request.check_out,
      quantity: request.quantity,
      status: "confirmed",
      providerConfirmationId: null,
      paymentReferenceId: null,
    });
    await insertEvent(client, {
      aggregateType: "booking",
      aggregateId: bookingId,
      eventType: "BOOKING_CONFIRMED",
      actorAccountId: input.actorAccountId,
      payload: response,
    });
    return response;
  });
}

export async function releaseForestCitySundaySandboxHold(
  input: { holdId: string; accountId: string } & CommandInput,
) {
  return runCommand("release_hold", input, input, async (client) => {
    const released = await client.query<{ quote_id: string }>(
      `update crays_core.clubs_fc_sunday_sandbox_holds
          set status='released',updated_at=transaction_timestamp()
        where hold_id=$1 and account_id=$2 and status='held'
      returning quote_id`,
      [input.holdId, input.accountId],
    );
    if (!released.rows[0]) {
      throw new ForestCitySundaySandboxRepositoryError(
        "SANDBOX_HOLD_NOT_ACTIVE",
      );
    }
    const response = sandboxEnvelope({
      holdId: input.holdId,
      quoteId: released.rows[0].quote_id,
      status: "released",
    });
    await insertEvent(client, {
      aggregateType: "hold",
      aggregateId: input.holdId,
      eventType: "HOLD_RELEASED",
      actorAccountId: input.accountId,
      payload: response,
    });
    return response;
  });
}

export async function cancelForestCitySundaySandboxBooking(
  input: { bookingId: string; actorAccountId: string } & CommandInput,
) {
  return runCommand("cancel_booking", input, input, async (client) => {
    const cancelled = await client.query<{ booking_request_id: string }>(
      `update crays_core.clubs_fc_sunday_sandbox_bookings
          set status='cancelled',updated_at=transaction_timestamp()
        where booking_id=$1 and status='confirmed'
      returning booking_request_id`,
      [input.bookingId],
    );
    if (!cancelled.rows[0]) {
      throw new ForestCitySundaySandboxRepositoryError(
        "SANDBOX_BOOKING_NOT_ACTIVE",
      );
    }
    await client.query(
      `update crays_core.clubs_fc_sunday_sandbox_booking_requests
          set status='cancelled',updated_at=transaction_timestamp()
        where booking_request_id=$1`,
      [cancelled.rows[0].booking_request_id],
    );
    const response = sandboxEnvelope({
      bookingId: input.bookingId,
      bookingRequestId: cancelled.rows[0].booking_request_id,
      status: "cancelled",
    });
    await insertEvent(client, {
      aggregateType: "booking",
      aggregateId: input.bookingId,
      eventType: "BOOKING_CANCELLED",
      actorAccountId: input.actorAccountId,
      payload: response,
    });
    return response;
  });
}

export interface ForestCitySundaySandboxBookingPort {
  readAvailability: typeof readForestCitySundaySandboxAvailability;
  issueQuote: typeof issueForestCitySundaySandboxQuote;
  createHold: typeof createForestCitySundaySandboxHold;
  submitBookingRequest: typeof submitForestCitySundaySandboxBookingRequest;
  confirmBooking: typeof confirmForestCitySundaySandboxBooking;
  releaseHold: typeof releaseForestCitySundaySandboxHold;
  cancelBooking: typeof cancelForestCitySundaySandboxBooking;
}

export const forestCitySundaySandboxBookingRepository = {
  readAvailability: readForestCitySundaySandboxAvailability,
  issueQuote: issueForestCitySundaySandboxQuote,
  createHold: createForestCitySundaySandboxHold,
  submitBookingRequest: submitForestCitySundaySandboxBookingRequest,
  confirmBooking: confirmForestCitySundaySandboxBooking,
  releaseHold: releaseForestCitySundaySandboxHold,
  cancelBooking: cancelForestCitySundaySandboxBooking,
} satisfies ForestCitySundaySandboxBookingPort;
