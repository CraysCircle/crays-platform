import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import { ClubsIdempotencyReplayConflictError } from "@/lib/clubs/command-errors";

export type ClubsAvailabilityRuleInput = {
  priority: number;
  startsOn: string;
  endsOn: string;
  weekdaysBitmask: number;
  availabilityState: "open" | "closed";
  capacityOverride: number | null;
  minimumStayNights: number | null;
  maximumStayNights: number | null;
  arrivalAllowed: boolean;
  departureAllowed: boolean;
};

export type ClubsInventoryCommandInput = {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: string;
  propertyId: string;
  unitId: string;
  idempotencyKey: string;
  correlationId: string;
  expectedCalendarVersion: number;
  defaultCapacity: number;
  projectedFrom: string;
  projectedUntil: string;
  changeReason: string;
  rules: ClubsAvailabilityRuleInput[];
};

export type ClubsInventoryCommandReceipt = {
  receiptId: string;
  commandRequestId: string;
  outcome: "applied" | "conflict" | "denied" | "invalid";
  replayed: boolean;
  reason: string | null;
  calendarId: string | null;
  ruleSetVersionId: string | null;
  resultingCalendarVersion: number | null;
  projectedDayCount: number;
  projectionSha256: string | null;
};

export type ClubsInventoryReadModel = {
  status: "ready" | "empty";
  unit: {
    unitId: string;
    propertyId: string;
    name: string;
    code: string;
  };
  calendar: null | {
    calendarId: string;
    timezone: string;
    capacityModel: "exclusive_unit" | "sellable_count";
    defaultCapacity: number;
    lifecycle: string;
    version: number;
  };
  days: Array<{
    date: string;
    availabilityState: "open" | "closed";
    totalCapacity: number;
    heldCapacity: number;
    bookedCapacity: number;
    availableCapacity: number;
    minimumStayNights: number | null;
    maximumStayNights: number | null;
    arrivalAllowed: boolean;
    departureAllowed: boolean;
    version: number;
  }>;
};

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function sha256(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function dateDistance(from: string, until: string) {
  return Math.round(
    (Date.parse(`${until}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`))
      / 86_400_000,
  );
}

function validIanaTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
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

async function resolveAuthorizedUnit(
  client: PoolClient,
  input: Pick<
    ClubsInventoryCommandInput,
    "accountId" | "tenantSessionId" | "organizationId" | "roleKey" | "propertyId" | "unitId"
  >,
) {
  const result = await client.query<{
    unit_id: string;
    timezone: string;
    allowed: boolean;
  }>(
    `select unit.unit_id,store.timezone,
       (
         operator.status='active'
         and assignment.status='active'
         and assignment.valid_from<=now()
         and (assignment.valid_until is null or assignment.valid_until>now())
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
         )
       ) allowed
     from crays_core.clubs_units unit
     join crays_core.clubs_properties property
       on property.property_id=unit.property_id
      and property.property_id=$5
     join crays_core.stores store on store.store_id=property.store_id
     join crays_core.franchise_operator_tenants operator
       on operator.partner_tenant_id=property.partner_tenant_id
      and operator.organization_id=$3
     join crays_core.store_operator_assignments assignment
       on assignment.store_id=store.store_id
      and assignment.partner_tenant_id=property.partner_tenant_id
      and assignment.operator_legal_entity_id=property.operator_legal_entity_id
      and assignment.vertical_root='clubs'
     where unit.unit_id=$6`,
    [
      input.accountId,
      input.tenantSessionId,
      input.organizationId,
      input.roleKey,
      input.propertyId,
      input.unitId,
    ],
  );
  return result.rows[0] ?? null;
}

async function appendReceipt(
  client: PoolClient,
  input: Omit<ClubsInventoryCommandReceipt, "receiptId" | "replayed">,
) {
  const receiptId = id("clubs_inventory_receipt");
  await client.query(
    `insert into crays_core.clubs_inventory_command_receipts
      (inventory_command_receipt_id,inventory_command_request_id,outcome,reason,
       inventory_calendar_id,availability_rule_set_version_id,
       resulting_calendar_version,projected_day_count,projection_sha256)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      receiptId,
      input.commandRequestId,
      input.outcome,
      input.reason,
      input.calendarId,
      input.ruleSetVersionId,
      input.resultingCalendarVersion,
      input.projectedDayCount,
      input.projectionSha256,
    ],
  );
  return { ...input, receiptId, replayed: false } satisfies ClubsInventoryCommandReceipt;
}

function validateCommand(input: ClubsInventoryCommandInput) {
  if (!isIsoDate(input.projectedFrom) || !isIsoDate(input.projectedUntil)) {
    throw new Error("Projection dates must be real ISO calendar dates.");
  }
  const span = dateDistance(input.projectedFrom, input.projectedUntil);
  if (span < 0 || span > 729) throw new Error("Projection range must contain 1 to 730 days.");
  if (!Number.isSafeInteger(input.expectedCalendarVersion) || input.expectedCalendarVersion < 0) {
    throw new Error("Expected calendar version must be a non-negative integer.");
  }
  if (!Number.isSafeInteger(input.defaultCapacity) || input.defaultCapacity < 1 || input.defaultCapacity > 10_000) {
    throw new Error("Default capacity must be between 1 and 10,000.");
  }
  if (!input.rules.length || input.rules.length > 100) {
    throw new Error("One to 100 availability rules are required.");
  }
  for (const rule of input.rules) {
    if (
      !isIsoDate(rule.startsOn)
      || !isIsoDate(rule.endsOn)
      || rule.startsOn > rule.endsOn
      || !Number.isSafeInteger(rule.priority)
      || rule.priority < -10_000
      || rule.priority > 10_000
      || !Number.isSafeInteger(rule.weekdaysBitmask)
      || rule.weekdaysBitmask < 1
      || rule.weekdaysBitmask > 127
    ) {
      throw new Error("Availability rule dates, priority or weekday selection are invalid.");
    }
    if (
      rule.capacityOverride !== null
      && (!Number.isSafeInteger(rule.capacityOverride)
        || rule.capacityOverride < 0
        || rule.capacityOverride > 10_000)
    ) {
      throw new Error("Rule capacity must be between 0 and 10,000.");
    }
    if (rule.availabilityState === "closed" && (rule.capacityOverride ?? 0) !== 0) {
      throw new Error("Closed rules cannot carry sellable capacity.");
    }
    if (
      rule.minimumStayNights !== null
      && (!Number.isSafeInteger(rule.minimumStayNights)
        || rule.minimumStayNights < 1
        || rule.minimumStayNights > 3650)
    ) {
      throw new Error("Minimum stay is invalid.");
    }
    if (
      rule.maximumStayNights !== null
      && (!Number.isSafeInteger(rule.maximumStayNights)
        || rule.maximumStayNights < 1
        || rule.maximumStayNights > 3650)
    ) {
      throw new Error("Maximum stay is invalid.");
    }
    if (
      rule.minimumStayNights !== null
      && rule.maximumStayNights !== null
      && rule.maximumStayNights < rule.minimumStayNights
    ) {
      throw new Error("Maximum stay cannot be shorter than minimum stay.");
    }
  }
}

export async function publishAndProjectClubsAvailability(
  input: ClubsInventoryCommandInput,
): Promise<ClubsInventoryCommandReceipt> {
  validateCommand(input);
  const payloadSha256 = sha256({
    propertyId: input.propertyId,
    unitId: input.unitId,
    expectedCalendarVersion: input.expectedCalendarVersion,
    defaultCapacity: input.defaultCapacity,
    projectedFrom: input.projectedFrom,
    projectedUntil: input.projectedUntil,
    changeReason: input.changeReason,
    rules: input.rules,
  });

  return transaction(async (client) => {
    const commandRequestId = id("clubs_inventory_command");
    const inserted = await client.query(
      `insert into crays_core.clubs_inventory_command_requests
        (inventory_command_request_id,idempotency_key,correlation_id,
         actor_account_id,tenant_session_id,organization_id,role_key,
         property_id,unit_id,command_type,payload_sha256)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'publish_and_project',$10)
       on conflict (actor_account_id,idempotency_key) do nothing
       returning inventory_command_request_id`,
      [
        commandRequestId,
        input.idempotencyKey,
        input.correlationId,
        input.accountId,
        input.tenantSessionId,
        input.organizationId,
        input.roleKey,
        input.propertyId,
        input.unitId,
        payloadSha256,
      ],
    );

    if ((inserted.rowCount ?? 0) === 0) {
      const replay = await client.query<{
        inventory_command_request_id: string;
        payload_sha256: string;
        inventory_command_receipt_id: string;
        outcome: ClubsInventoryCommandReceipt["outcome"];
        reason: string | null;
        inventory_calendar_id: string | null;
        availability_rule_set_version_id: string | null;
        resulting_calendar_version: number | null;
        projected_day_count: number;
        projection_sha256: string | null;
      }>(
        `select request.inventory_command_request_id,request.payload_sha256,
           receipt.inventory_command_receipt_id,receipt.outcome,receipt.reason,
           receipt.inventory_calendar_id,receipt.availability_rule_set_version_id,
           receipt.resulting_calendar_version,receipt.projected_day_count,
           receipt.projection_sha256
         from crays_core.clubs_inventory_command_requests request
         join lateral (
           select * from crays_core.clubs_inventory_command_receipts
           where inventory_command_request_id=request.inventory_command_request_id
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
        receiptId: row.inventory_command_receipt_id,
        commandRequestId: row.inventory_command_request_id,
        outcome: row.outcome,
        replayed: true,
        reason: row.reason,
        calendarId: row.inventory_calendar_id,
        ruleSetVersionId: row.availability_rule_set_version_id,
        resultingCalendarVersion: row.resulting_calendar_version,
        projectedDayCount: row.projected_day_count,
        projectionSha256: row.projection_sha256,
      };
    }

    const authorizedUnit = await resolveAuthorizedUnit(client, input);
    if (!authorizedUnit?.allowed) {
      await client.query(
        `update crays_core.clubs_inventory_command_requests
         set status='denied',completed_at=now()
         where inventory_command_request_id=$1`,
        [commandRequestId],
      );
      return appendReceipt(client, {
        commandRequestId,
        outcome: "denied",
        reason: "active_unit_scope_and_property_operate_capability_required",
        calendarId: null,
        ruleSetVersionId: null,
        resultingCalendarVersion: null,
        projectedDayCount: 0,
        projectionSha256: null,
      });
    }
    if (!validIanaTimezone(authorizedUnit.timezone)) {
      await client.query(
        `update crays_core.clubs_inventory_command_requests
         set status='invalid',completed_at=now()
         where inventory_command_request_id=$1`,
        [commandRequestId],
      );
      return appendReceipt(client, {
        commandRequestId,
        outcome: "invalid",
        reason: "authoritative_store_timezone_is_not_iana",
        calendarId: null,
        ruleSetVersionId: null,
        resultingCalendarVersion: null,
        projectedDayCount: 0,
        projectionSha256: null,
      });
    }

    const currentCalendar = await client.query<{
      inventory_calendar_id: string;
      version: number;
    }>(
      `select inventory_calendar_id,version
       from crays_core.clubs_inventory_calendars
       where unit_id=$1 for update`,
      [input.unitId],
    );
    const current = currentCalendar.rows[0];
    if (
      (!current && input.expectedCalendarVersion !== 0)
      || (current && current.version !== input.expectedCalendarVersion)
    ) {
      await client.query(
        `update crays_core.clubs_inventory_command_requests
         set status='conflict',completed_at=now()
         where inventory_command_request_id=$1`,
        [commandRequestId],
      );
      return appendReceipt(client, {
        commandRequestId,
        outcome: "conflict",
        reason: "inventory_calendar_version_conflict",
        calendarId: current?.inventory_calendar_id ?? null,
        ruleSetVersionId: null,
        resultingCalendarVersion: current?.version ?? null,
        projectedDayCount: 0,
        projectionSha256: null,
      });
    }

    const calendarId = current?.inventory_calendar_id ?? id("clubs_inventory_calendar");
    const resultingCalendarVersion = current ? current.version + 1 : 1;
    await client.query("savepoint inventory_apply");
    if (current) {
      await client.query(
        `update crays_core.clubs_inventory_calendars
         set timezone=$2,default_capacity=$3,version=$4,updated_at=now()
         where inventory_calendar_id=$1 and version=$5`,
        [
          calendarId,
          authorizedUnit.timezone,
          input.defaultCapacity,
          resultingCalendarVersion,
          current.version,
        ],
      );
    } else {
      await client.query(
        `insert into crays_core.clubs_inventory_calendars
          (inventory_calendar_id,unit_id,property_id,timezone,default_capacity)
         values ($1,$2,$3,$4,$5)`,
        [
          calendarId,
          input.unitId,
          input.propertyId,
          authorizedUnit.timezone,
          input.defaultCapacity,
        ],
      );
    }

    const currentRuleSet = await client.query<{
      availability_rule_set_id: string;
      current_version: number;
    }>(
      `select availability_rule_set_id,current_version
       from crays_core.clubs_availability_rule_sets
       where inventory_calendar_id=$1 and rule_set_key='primary'
       for update`,
      [calendarId],
    );
    const existingRuleSet = currentRuleSet.rows[0];
    const ruleSetId =
      existingRuleSet?.availability_rule_set_id ?? id("clubs_availability_ruleset");
    const ruleSetVersion = existingRuleSet ? existingRuleSet.current_version + 1 : 1;
    if (existingRuleSet) {
      await client.query(
        `update crays_core.clubs_availability_rule_sets
         set lifecycle='published',current_version=$2,updated_at=now()
         where availability_rule_set_id=$1`,
        [ruleSetId, ruleSetVersion],
      );
    } else {
      await client.query(
        `insert into crays_core.clubs_availability_rule_sets
          (availability_rule_set_id,inventory_calendar_id,rule_set_key,lifecycle,current_version)
         values ($1,$2,'primary','published',1)`,
        [ruleSetId, calendarId],
      );
    }

    const ruleSetVersionId = id("clubs_availability_ruleset_version");
    await client.query(
      `insert into crays_core.clubs_availability_rule_set_versions
        (availability_rule_set_version_id,availability_rule_set_id,version,
         valid_from,valid_until,change_reason,created_by_account_id)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        ruleSetVersionId,
        ruleSetId,
        ruleSetVersion,
        input.projectedFrom,
        input.projectedUntil,
        input.changeReason,
        input.accountId,
      ],
    );
    for (const [index, rule] of input.rules.entries()) {
      await client.query(
        `insert into crays_core.clubs_availability_rules
          (availability_rule_id,availability_rule_set_version_id,priority,
           starts_on,ends_on,weekdays_bitmask,availability_state,
           capacity_override,minimum_stay_nights,maximum_stay_nights,
           arrival_allowed,departure_allowed)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          `${ruleSetVersionId}:rule:${String(index + 1).padStart(3, "0")}`,
          ruleSetVersionId,
          rule.priority,
          rule.startsOn,
          rule.endsOn,
          rule.weekdaysBitmask,
          rule.availabilityState,
          rule.capacityOverride,
          rule.minimumStayNights,
          rule.maximumStayNights,
          rule.arrivalAllowed,
          rule.departureAllowed,
        ],
      );
    }

    const resolved = await client.query<{
      local_date: string;
      availability_state: "open" | "closed";
      total_capacity: number;
      minimum_stay_nights: number | null;
      maximum_stay_nights: number | null;
      arrival_allowed: boolean;
      departure_allowed: boolean;
    }>(
      `select
         day.local_date::text,
         coalesce(rule.availability_state,'open') availability_state,
         case
           when coalesce(rule.availability_state,'open')='closed' then 0
           else coalesce(rule.capacity_override,$4)
         end total_capacity,
         rule.minimum_stay_nights,
         rule.maximum_stay_nights,
         coalesce(rule.arrival_allowed,true) arrival_allowed,
         coalesce(rule.departure_allowed,true) departure_allowed
       from generate_series($1::date,$2::date,interval '1 day') day(local_date)
       left join lateral (
         select availability_state,capacity_override,minimum_stay_nights,
           maximum_stay_nights,arrival_allowed,departure_allowed
         from crays_core.clubs_availability_rules
         where availability_rule_set_version_id=$3
           and day.local_date::date between starts_on and ends_on
           and (weekdays_bitmask & (1 << extract(dow from day.local_date)::int)) <> 0
         order by priority desc,availability_rule_id asc
         limit 1
       ) rule on true
       order by day.local_date`,
      [
        input.projectedFrom,
        input.projectedUntil,
        ruleSetVersionId,
        input.defaultCapacity,
      ],
    );

    const existingDays = await client.query<{
      local_date: string;
      held_capacity: number;
      booked_capacity: number;
      version: number;
    }>(
      `select local_date::text,held_capacity,booked_capacity,version
       from crays_core.clubs_inventory_days
       where inventory_calendar_id=$1 and local_date between $2 and $3
       for update`,
      [calendarId, input.projectedFrom, input.projectedUntil],
    );
    const existingByDate = new Map(existingDays.rows.map((row) => [row.local_date, row]));
    const unsafe = resolved.rows.find((row) => {
      const existing = existingByDate.get(row.local_date);
      return existing
        ? existing.held_capacity + existing.booked_capacity > row.total_capacity
        : false;
    });
    if (unsafe) {
      await client.query("rollback to savepoint inventory_apply");
      await client.query(
        `update crays_core.clubs_inventory_command_requests
         set status='conflict',completed_at=now()
         where inventory_command_request_id=$1`,
        [commandRequestId],
      );
      return appendReceipt(client, {
        commandRequestId,
        outcome: "conflict",
        reason: `projected_capacity_below_committed_capacity:${unsafe.local_date}`,
        calendarId: current?.inventory_calendar_id ?? null,
        ruleSetVersionId: null,
        resultingCalendarVersion: current?.version ?? null,
        projectedDayCount: 0,
        projectionSha256: null,
      });
    }

    for (const row of resolved.rows) {
      const existing = existingByDate.get(row.local_date);
      await client.query(
        `insert into crays_core.clubs_inventory_days
          (inventory_day_id,inventory_calendar_id,unit_id,local_date,timezone,
           source_rule_set_version_id,availability_state,total_capacity,
           minimum_stay_nights,maximum_stay_nights,arrival_allowed,
           departure_allowed,version)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,1)
         on conflict (inventory_calendar_id,local_date) do update
         set source_rule_set_version_id=excluded.source_rule_set_version_id,
             availability_state=excluded.availability_state,
             total_capacity=excluded.total_capacity,
             minimum_stay_nights=excluded.minimum_stay_nights,
             maximum_stay_nights=excluded.maximum_stay_nights,
             arrival_allowed=excluded.arrival_allowed,
             departure_allowed=excluded.departure_allowed,
             timezone=excluded.timezone,
             version=clubs_inventory_days.version+1,
             updated_at=now()`,
        [
          existing ? `${calendarId}:${row.local_date}` : id("clubs_inventory_day"),
          calendarId,
          input.unitId,
          row.local_date,
          authorizedUnit.timezone,
          ruleSetVersionId,
          row.availability_state,
          row.total_capacity,
          row.minimum_stay_nights,
          row.maximum_stay_nights,
          row.arrival_allowed,
          row.departure_allowed,
        ],
      );
    }
    const projectionSha256 = sha256(
      resolved.rows.map((row) => ({
        date: row.local_date,
        state: row.availability_state,
        capacity: row.total_capacity,
        minimumStay: row.minimum_stay_nights,
        maximumStay: row.maximum_stay_nights,
        arrival: row.arrival_allowed,
        departure: row.departure_allowed,
      })),
    );
    await client.query(
      `insert into crays_core.clubs_inventory_projection_receipts
        (inventory_projection_receipt_id,inventory_calendar_id,
         source_rule_set_version_id,projected_from,projected_until,
         projected_day_count,projection_sha256,actor_account_id,correlation_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id("clubs_inventory_projection"),
        calendarId,
        ruleSetVersionId,
        input.projectedFrom,
        input.projectedUntil,
        resolved.rows.length,
        projectionSha256,
        input.accountId,
        input.correlationId,
      ],
    );
    await client.query(
      `update crays_core.clubs_inventory_command_requests
       set status='applied',completed_at=now()
       where inventory_command_request_id=$1`,
      [commandRequestId],
    );
    return appendReceipt(client, {
      commandRequestId,
      outcome: "applied",
      reason: null,
      calendarId,
      ruleSetVersionId,
      resultingCalendarVersion,
      projectedDayCount: resolved.rows.length,
      projectionSha256,
    });
  });
}

export async function getClubsInventoryReadModel(input: {
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: string;
  propertyId: string;
  unitId: string;
  from: string;
  until: string;
}): Promise<ClubsInventoryReadModel | null> {
  if (!isIsoDate(input.from) || !isIsoDate(input.until) || dateDistance(input.from, input.until) < 0 || dateDistance(input.from, input.until) > 92) {
    throw new Error("Inventory read range must contain 1 to 93 days.");
  }
  return transaction(async (client) => {
    const authorized = await resolveAuthorizedUnit(client, input);
    if (!authorized?.allowed) return null;
    const unit = await client.query<{
      unit_id: string;
      property_id: string;
      canonical_code: string;
      canonical_name: string;
    }>(
      `select unit.unit_id,unit.property_id,unit.canonical_code,version.canonical_name
       from crays_core.clubs_units unit
       join crays_core.clubs_unit_versions version
         on version.unit_id=unit.unit_id and version.version=unit.version
       where unit.unit_id=$1 and unit.property_id=$2`,
      [input.unitId, input.propertyId],
    );
    const calendar = await client.query<{
      inventory_calendar_id: string;
      timezone: string;
      capacity_model: "exclusive_unit" | "sellable_count";
      default_capacity: number;
      lifecycle: string;
      version: number;
    }>(
      `select inventory_calendar_id,timezone,capacity_model,default_capacity,
         lifecycle,version
       from crays_core.clubs_inventory_calendars
       where unit_id=$1`,
      [input.unitId],
    );
    const unitRow = unit.rows[0];
    if (!unitRow) return null;
    const calendarRow = calendar.rows[0];
    if (!calendarRow) {
      return {
        status: "empty",
        unit: {
          unitId: unitRow.unit_id,
          propertyId: unitRow.property_id,
          name: unitRow.canonical_name,
          code: unitRow.canonical_code,
        },
        calendar: null,
        days: [],
      };
    }
    const days = await client.query<{
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
      `select local_date::text,availability_state,total_capacity,held_capacity,
         booked_capacity,minimum_stay_nights,maximum_stay_nights,
         arrival_allowed,departure_allowed,version
       from crays_core.clubs_inventory_days
       where inventory_calendar_id=$1 and local_date between $2 and $3
       order by local_date`,
      [calendarRow.inventory_calendar_id, input.from, input.until],
    );
    return {
      status: "ready",
      unit: {
        unitId: unitRow.unit_id,
        propertyId: unitRow.property_id,
        name: unitRow.canonical_name,
        code: unitRow.canonical_code,
      },
      calendar: {
        calendarId: calendarRow.inventory_calendar_id,
        timezone: calendarRow.timezone,
        capacityModel: calendarRow.capacity_model,
        defaultCapacity: calendarRow.default_capacity,
        lifecycle: calendarRow.lifecycle,
        version: calendarRow.version,
      },
      days: days.rows.map((row) => ({
        date: row.local_date,
        availabilityState: row.availability_state,
        totalCapacity: row.total_capacity,
        heldCapacity: row.held_capacity,
        bookedCapacity: row.booked_capacity,
        availableCapacity:
          row.total_capacity - row.held_capacity - row.booked_capacity,
        minimumStayNights: row.minimum_stay_nights,
        maximumStayNights: row.maximum_stay_nights,
        arrivalAllowed: row.arrival_allowed,
        departureAllowed: row.departure_allowed,
        version: row.version,
      })),
    };
  });
}
