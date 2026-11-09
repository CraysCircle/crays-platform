import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PreparationTicketState } from "./state-machine";

export type KdsQueryResult<Row> = { rows: Row[] };
export type KdsQuery = <Row = Record<string, unknown>>(
  text: string,
  values?: readonly unknown[],
) => Promise<KdsQueryResult<Row>>;
export type KdsDatabase = {
  query: KdsQuery;
  transaction: <T>(effect: (database: { query: KdsQuery }) => Promise<T>) => Promise<T>;
};

export type KdsRole = "coffee_store_manager" | "barista";
export type KdsAction =
  | "accept"
  | "start"
  | "ready"
  | "collected"
  | "reject"
  | "remake"
  | "requeue";

export type KdsPrincipal = Readonly<{
  tenantId: string;
  operatorId: string;
  legalEntityId: string;
  storeId: string;
  stationId: string | null;
  deviceId: string;
  deviceSessionId: string;
  actorAssignmentId: string;
  accountId: string;
  role: KdsRole;
}>;

export type KdsQueueTicket = Readonly<{
  preparationTicketId: string;
  stationTicketId: string;
  orderId: string;
  stationId: string;
  stationName: string;
  stationType: string;
  state: PreparationTicketState;
  stationState: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  immutableOrderInput: unknown;
}>;

export type KdsQueueReadModel = Readonly<{
  scope: Pick<KdsPrincipal, "tenantId" | "operatorId" | "legalEntityId" | "storeId">;
  device: Pick<KdsPrincipal, "deviceId" | "stationId" | "role">;
  storeStatus: string;
  freshness: string;
  acknowledgedCursor: { eventId: string; occurredAt: string } | null;
  nextCursor: { eventId: string; occurredAt: string } | null;
  tickets: readonly KdsQueueTicket[];
}>;

type PrincipalRow = {
  tenant_id: string;
  operator_id: string;
  legal_entity_id: string;
  store_id: string;
  station_id: string | null;
  device_id: string;
  device_session_id: string;
  actor_assignment_id: string;
  account_id: string;
  role: KdsRole;
};

const actionTargets: Readonly<
  Record<KdsAction, readonly PreparationTicketState[]>
> = {
  accept: ["queued"],
  start: ["accepted"],
  ready: ["preparing"],
  collected: ["ready"],
  reject: ["queued", "accepted"],
  remake: ["preparing", "ready"],
  requeue: ["remake_required"],
};

const actionState: Readonly<Record<KdsAction, PreparationTicketState>> = {
  accept: "accepted",
  start: "preparing",
  ready: "ready",
  collected: "collected",
  reject: "rejected",
  remake: "remake_required",
  requeue: "queued",
};

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function payloadHash(payload: unknown) {
  return hash(JSON.stringify(payload));
}

function principalFromRow(row: PrincipalRow): KdsPrincipal {
  return {
    tenantId: row.tenant_id,
    operatorId: row.operator_id,
    legalEntityId: row.legal_entity_id,
    storeId: row.store_id,
    stationId: row.station_id,
    deviceId: row.device_id,
    deviceSessionId: row.device_session_id,
    actorAssignmentId: row.actor_assignment_id,
    accountId: row.account_id,
    role: row.role,
  };
}

function scopeValues(principal: KdsPrincipal) {
  return [
    principal.tenantId,
    principal.operatorId,
    principal.legalEntityId,
    principal.storeId,
  ] as const;
}

export async function startKdsDeviceSession(
  database: KdsDatabase,
  input: Readonly<{
    tenantId: string;
    accountId: string;
    deviceCredential: string;
    ttlMinutes?: number;
    now?: Date;
  }>,
) {
  if (input.deviceCredential.length < 24) {
    throw new Error("KDS device credential is invalid.");
  }
  const now = input.now ?? new Date();
  const ttlMinutes = Math.min(Math.max(input.ttlMinutes ?? 480, 5), 720);
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000);
  const credentialFingerprint = hash(input.deviceCredential);

  return database.transaction(async (tx) => {
    const matches = await tx.query<{
      tenant_id: string;
      operator_id: string;
      legal_entity_id: string;
      store_id: string;
      station_id: string | null;
      device_id: string;
      actor_assignment_id: string;
      account_id: string;
      role: KdsRole;
    }>(
      `select d.tenant_id,d.operator_id,d.legal_entity_id,d.store_id,d.station_id,d.device_id,
              a.actor_assignment_id,a.account_id,a.role
       from crays_store_operations.store_devices d
       join crays_store_operations.stores s
         on s.tenant_id=d.tenant_id and s.operator_id=d.operator_id
        and s.legal_entity_id=d.legal_entity_id and s.store_id=d.store_id
       join crays_store_operations.stations st
         on st.tenant_id=d.tenant_id and st.operator_id=d.operator_id
        and st.legal_entity_id=d.legal_entity_id and st.store_id=d.store_id
        and st.station_id=d.station_id
       join crays_store_operations.kds_actor_assignments a
         on a.tenant_id=d.tenant_id and a.operator_id=d.operator_id
        and a.legal_entity_id=d.legal_entity_id and a.store_id=d.store_id
        and a.account_id=$2 and (a.station_id is null or a.station_id=d.station_id)
       where d.tenant_id=$1 and d.credential_fingerprint=$3 and d.status='active'
         and d.credential_expires_at > $4
         and s.status in ('active','paused') and st.status in ('active','paused')
         and a.status='active'
         and a.valid_from <= $4 and (a.valid_until is null or a.valid_until > $4)
       order by case a.role when 'barista' then 0 else 1 end, a.actor_assignment_id
       limit 1
       for share of d,st,a`,
      [input.tenantId, input.accountId, credentialFingerprint, now.toISOString()],
    );
    if (matches.rows.length !== 1) {
      throw new Error("KDS device or Store assignment is denied.");
    }

    const match = matches.rows[0];
    const rawSessionToken = randomBytes(32).toString("base64url");
    const deviceSessionId = randomUUID();
    await tx.query(
      `insert into crays_store_operations.kds_device_sessions
       (device_session_id,session_token_hash,tenant_id,operator_id,legal_entity_id,store_id,
        station_id,device_id,actor_assignment_id,account_id,issued_at,expires_at,last_seen_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$11)`,
      [
        deviceSessionId,
        hash(rawSessionToken),
        match.tenant_id,
        match.operator_id,
        match.legal_entity_id,
        match.store_id,
        match.station_id,
        match.device_id,
        match.actor_assignment_id,
        match.account_id,
        now.toISOString(),
        expiresAt.toISOString(),
      ],
    );
    return {
      rawSessionToken,
      expiresAt: expiresAt.toISOString(),
      principal: {
        tenantId: match.tenant_id,
        operatorId: match.operator_id,
        legalEntityId: match.legal_entity_id,
        storeId: match.store_id,
        stationId: match.station_id,
        deviceId: match.device_id,
        deviceSessionId,
        actorAssignmentId: match.actor_assignment_id,
        accountId: match.account_id,
        role: match.role,
      } satisfies KdsPrincipal,
    };
  });
}

export async function resolveKdsPrincipal(
  query: KdsQuery,
  input: Readonly<{
    tenantId: string;
    accountId: string;
    rawSessionToken: string;
    now?: Date;
  }>,
) {
  const now = input.now ?? new Date();
  const result = await query<PrincipalRow>(
    `select ds.tenant_id,ds.operator_id,ds.legal_entity_id,ds.store_id,ds.station_id,
            ds.device_id,ds.device_session_id,ds.actor_assignment_id,ds.account_id,a.role
     from crays_store_operations.kds_device_sessions ds
     join crays_store_operations.store_devices d
       on d.tenant_id=ds.tenant_id and d.operator_id=ds.operator_id
      and d.legal_entity_id=ds.legal_entity_id and d.store_id=ds.store_id
      and d.device_id=ds.device_id
     join crays_store_operations.kds_actor_assignments a
       on a.tenant_id=ds.tenant_id and a.operator_id=ds.operator_id
      and a.legal_entity_id=ds.legal_entity_id and a.store_id=ds.store_id
      and a.actor_assignment_id=ds.actor_assignment_id and a.account_id=ds.account_id
     join crays_store_operations.stores s
       on s.tenant_id=ds.tenant_id and s.operator_id=ds.operator_id
      and s.legal_entity_id=ds.legal_entity_id and s.store_id=ds.store_id
     join crays_store_operations.stations st
       on st.tenant_id=ds.tenant_id and st.operator_id=ds.operator_id
      and st.legal_entity_id=ds.legal_entity_id and st.store_id=ds.store_id
      and st.station_id=ds.station_id
     where ds.tenant_id=$1 and ds.account_id=$2 and ds.session_token_hash=$3
       and ds.revoked_at is null and ds.expires_at > $4
       and d.status='active' and a.status='active'
       and a.valid_from <= $4 and (a.valid_until is null or a.valid_until > $4)
       and s.status in ('active','paused') and st.status in ('active','paused')`,
    [input.tenantId, input.accountId, hash(input.rawSessionToken), now.toISOString()],
  );
  if (result.rows.length !== 1) {
    throw new Error("KDS session is expired, revoked or outside the active Store assignment.");
  }
  const principal = principalFromRow(result.rows[0]);
  await query(
    `update crays_store_operations.kds_device_sessions
     set last_seen_at=$2,version=version+1
     where device_session_id=$1`,
    [principal.deviceSessionId, now.toISOString()],
  );
  return principal;
}

export async function getKdsQueue(
  query: KdsQuery,
  principal: KdsPrincipal,
  now: Date = new Date(),
): Promise<KdsQueueReadModel> {
  const scope = scopeValues(principal);
  const tickets = await query<{
    preparation_ticket_id: string;
    station_ticket_id: string;
    order_id: string;
    station_id: string;
    station_name: string;
    station_type: string;
    state: PreparationTicketState;
    station_state: string;
    version: string;
    created_at: string | Date;
    updated_at: string | Date;
    immutable_payload: unknown;
  }>(
    `select p.preparation_ticket_id,st.station_ticket_id,p.order_id,st.station_id,
            s.display_name as station_name,s.station_type,p.state,st.state as station_state,
            p.version::text,p.created_at,p.updated_at,i.immutable_payload
     from crays_store_operations.preparation_tickets p
     join crays_store_operations.station_tickets st
       on st.tenant_id=p.tenant_id and st.operator_id=p.operator_id
      and st.legal_entity_id=p.legal_entity_id and st.store_id=p.store_id
      and st.preparation_ticket_id=p.preparation_ticket_id
     join crays_store_operations.stations s
       on s.tenant_id=st.tenant_id and s.operator_id=st.operator_id
      and s.legal_entity_id=st.legal_entity_id and s.store_id=st.store_id
      and s.station_id=st.station_id
     left join crays_store_operations.order_routing_commands r
       on r.tenant_id=p.tenant_id and r.operator_id=p.operator_id
      and r.legal_entity_id=p.legal_entity_id and r.store_id=p.store_id
      and r.preparation_ticket_id=p.preparation_ticket_id and r.state='applied'
     left join crays_store_operations.order_input_snapshots i
       on i.tenant_id=r.tenant_id and i.operator_id=r.operator_id
      and i.legal_entity_id=r.legal_entity_id and i.store_id=r.store_id
      and i.order_input_snapshot_id=r.order_input_snapshot_id
     where p.tenant_id=$1 and p.operator_id=$2 and p.legal_entity_id=$3 and p.store_id=$4
       and ($5::text is null or st.station_id=$5)
       and p.state not in ('collected','rejected','cancelled')
       and s.status in ('active','paused')
     order by p.created_at,st.sequence_number,p.preparation_ticket_id`,
    [...scope, principal.stationId],
  );
  const cursor = await query<{
    event_id: string;
    occurred_at: string | Date;
  }>(
    `select event_id,occurred_at from crays_store_operations.outbox
     where tenant_id=$1 and operator_id=$2 and legal_entity_id=$3 and store_id=$4
       and aggregate_type='preparation_ticket'
     order by occurred_at desc,event_id desc limit 1`,
    scope,
  );
  const acknowledged = await query<{
    last_event_id: string | null;
    last_event_occurred_at: string | Date | null;
  }>(
    `select last_event_id,last_event_occurred_at
     from crays_store_operations.kds_device_cursors
     where tenant_id=$1 and operator_id=$2 and legal_entity_id=$3 and store_id=$4
       and device_id=$5`,
    [...scope, principal.deviceId],
  );
  const store = await query<{ status: string }>(
    `select status from crays_store_operations.stores
     where tenant_id=$1 and operator_id=$2 and legal_entity_id=$3 and store_id=$4`,
    scope,
  );
  const toIso = (value: string | Date) =>
    value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  const cursorRow = cursor.rows[0];
  const acknowledgedRow = acknowledged.rows[0];

  return {
    scope: {
      tenantId: principal.tenantId,
      operatorId: principal.operatorId,
      legalEntityId: principal.legalEntityId,
      storeId: principal.storeId,
    },
    device: {
      deviceId: principal.deviceId,
      stationId: principal.stationId,
      role: principal.role,
    },
    storeStatus: store.rows[0]?.status ?? "unknown",
    freshness: now.toISOString(),
    acknowledgedCursor:
      acknowledgedRow?.last_event_id && acknowledgedRow.last_event_occurred_at
        ? {
            eventId: acknowledgedRow.last_event_id,
            occurredAt: toIso(acknowledgedRow.last_event_occurred_at),
          }
        : null,
    nextCursor: cursorRow
      ? { eventId: cursorRow.event_id, occurredAt: toIso(cursorRow.occurred_at) }
      : null,
    tickets: tickets.rows.map((row) => ({
      preparationTicketId: row.preparation_ticket_id,
      stationTicketId: row.station_ticket_id,
      orderId: row.order_id,
      stationId: row.station_id,
      stationName: row.station_name,
      stationType: row.station_type,
      state: row.state,
      stationState: row.station_state,
      version: Number(row.version),
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
      immutableOrderInput: row.immutable_payload,
    })),
  };
}

export async function acknowledgeKdsCursor(
  database: KdsDatabase,
  principal: KdsPrincipal,
  cursor: Readonly<{ eventId: string; occurredAt: string }>,
) {
  const scope = scopeValues(principal);
  return database.transaction(async (tx) => {
    const authoritative = await tx.query<{ event_id: string }>(
      `select event_id from crays_store_operations.outbox
       where event_id=$1 and tenant_id=$2 and operator_id=$3
         and legal_entity_id=$4 and store_id=$5 and occurred_at=$6`,
      [cursor.eventId, ...scope, cursor.occurredAt],
    );
    if (authoritative.rows.length !== 1) {
      throw new Error("KDS reconnect cursor is not authoritative for this Store.");
    }
    await tx.query(
      `insert into crays_store_operations.kds_device_cursors
       (cursor_id,tenant_id,operator_id,legal_entity_id,store_id,station_id,device_id,
        last_event_id,last_event_occurred_at,last_acknowledged_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
       on conflict (tenant_id,operator_id,legal_entity_id,store_id,device_id)
       do update set last_event_id=excluded.last_event_id,
         last_event_occurred_at=excluded.last_event_occurred_at,
         last_acknowledged_at=now(),version=kds_device_cursors.version+1`,
      [
        `cursor:${principal.deviceId}`,
        ...scope,
        principal.stationId,
        principal.deviceId,
        cursor.eventId,
        cursor.occurredAt,
      ],
    );
    return cursor;
  });
}

export async function executeKdsTicketCommand(
  database: KdsDatabase,
  principal: KdsPrincipal,
  input: Readonly<{
    action: KdsAction;
    preparationTicketId: string;
    stationTicketId: string;
    expectedVersion: number;
    idempotencyKey: string;
    reason?: string;
  }>,
) {
  if (!input.idempotencyKey.trim() || input.expectedVersion < 1) {
    throw new Error("KDS command requires idempotency key and positive expected version.");
  }
  if (
    (input.action === "reject" || input.action === "remake") &&
    (input.reason?.trim().length ?? 0) < 3
  ) {
    throw new Error(`${input.action} requires an operational reason.`);
  }
  const targetState = actionState[input.action];
  const scope = scopeValues(principal);

  return database.transaction(async (tx) => {
    const replay = await tx.query<{
      command_id: string;
      aggregate_id: string;
      status: string;
      resulting_version: string | null;
      safe_result: Record<string, unknown>;
    }>(
      `select command_id,aggregate_id,status,resulting_version::text,safe_result
       from crays_store_operations.command_receipts
       where tenant_id=$1 and idempotency_key=$2`,
      [principal.tenantId, input.idempotencyKey],
    );
    if (replay.rows.length === 1) {
      if (replay.rows[0].aggregate_id !== input.preparationTicketId) {
        throw new Error("KDS idempotency key is already bound to another ticket.");
      }
      return {
        replay: true,
        commandId: replay.rows[0].command_id,
        status: replay.rows[0].status,
        version: Number(replay.rows[0].resulting_version ?? input.expectedVersion),
        state: replay.rows[0].safe_result.state,
      };
    }

    const ticket = await tx.query<{
      state: PreparationTicketState;
      version: string;
      station_id: string;
    }>(
      `select p.state,p.version::text,st.station_id
       from crays_store_operations.preparation_tickets p
       join crays_store_operations.station_tickets st
         on st.tenant_id=p.tenant_id and st.operator_id=p.operator_id
        and st.legal_entity_id=p.legal_entity_id and st.store_id=p.store_id
        and st.preparation_ticket_id=p.preparation_ticket_id
       where p.tenant_id=$1 and p.operator_id=$2 and p.legal_entity_id=$3 and p.store_id=$4
         and p.preparation_ticket_id=$5 and st.station_ticket_id=$6
         and ($7::text is null or st.station_id=$7)
       for update of p,st`,
      [...scope, input.preparationTicketId, input.stationTicketId, principal.stationId],
    );
    if (ticket.rows.length !== 1) {
      throw new Error("KDS ticket is denied for this Store, station or device.");
    }
    const current = ticket.rows[0];
    const commandId = randomUUID();
    const correlationId = randomUUID();
    if (
      Number(current.version) !== input.expectedVersion ||
      !actionTargets[input.action].includes(current.state)
    ) {
      const safeResult = {
        state: current.state,
        version: Number(current.version),
        recovery: "refresh_queue",
      };
      await tx.query(
        `insert into crays_store_operations.command_receipts
         (command_id,idempotency_key,tenant_id,operator_id,legal_entity_id,store_id,
          aggregate_type,aggregate_id,command_type,expected_version,resulting_version,
          status,correlation_id,actor_id,safe_result)
         values ($1,$2,$3,$4,$5,$6,'preparation_ticket',$7,$8,$9,$10,'conflict',$11,$12,$13::jsonb)`,
        [
          commandId,
          input.idempotencyKey,
          ...scope,
          input.preparationTicketId,
          `kds_${input.action}`,
          input.expectedVersion,
          Number(current.version),
          correlationId,
          principal.accountId,
          JSON.stringify(safeResult),
        ],
      );
      return {
        replay: false,
        commandId,
        status: "conflict" as const,
        version: Number(current.version),
        state: current.state,
      };
    }

    const timestamp =
      targetState === "accepted"
        ? ",accepted_at=now()"
        : targetState === "preparing"
          ? ",preparation_started_at=now()"
          : targetState === "ready"
            ? ",ready_at=now()"
            : targetState === "collected"
              ? ",collected_at=now()"
              : "";
    const terminalReason =
      targetState === "rejected" || targetState === "remake_required"
        ? input.reason?.trim()
        : null;
    const updated = await tx.query<{ version: string }>(
      `update crays_store_operations.preparation_tickets
       set state=$1,version=version+1,updated_at=now(),terminal_reason=$2${timestamp}
       where tenant_id=$3 and operator_id=$4 and legal_entity_id=$5 and store_id=$6
         and preparation_ticket_id=$7 and version=$8 and state=$9
       returning version::text`,
      [
        targetState,
        terminalReason,
        ...scope,
        input.preparationTicketId,
        input.expectedVersion,
        current.state,
      ],
    );
    if (updated.rows.length !== 1) {
      throw new Error("KDS ticket changed during the command transaction.");
    }

    const stationState =
      targetState === "rejected"
        ? "cancelled"
        : targetState === "remake_required" || targetState === "queued"
          ? "queued"
          : targetState === "collected"
            ? "ready"
            : targetState;
    await tx.query(
      `update crays_store_operations.station_tickets
       set state=$1,version=version+1,updated_at=now()
       where tenant_id=$2 and operator_id=$3 and legal_entity_id=$4 and store_id=$5
         and preparation_ticket_id=$6`,
      [stationState, ...scope, input.preparationTicketId],
    );

    const version = Number(updated.rows[0].version);
    const safeResult = { state: targetState, version };
    await tx.query(
      `insert into crays_store_operations.command_receipts
       (command_id,idempotency_key,tenant_id,operator_id,legal_entity_id,store_id,
        aggregate_type,aggregate_id,command_type,expected_version,resulting_version,
        status,correlation_id,actor_id,safe_result)
       values ($1,$2,$3,$4,$5,$6,'preparation_ticket',$7,$8,$9,$10,'applied',$11,$12,$13::jsonb)`,
      [
        commandId,
        input.idempotencyKey,
        ...scope,
        input.preparationTicketId,
        `kds_${input.action}`,
        input.expectedVersion,
        version,
        correlationId,
        principal.accountId,
        JSON.stringify(safeResult),
      ],
    );
    await tx.query(
      `insert into crays_store_operations.ticket_transitions
       (transition_id,tenant_id,operator_id,legal_entity_id,store_id,
        preparation_ticket_id,from_state,to_state,command_id,actor_id,reason)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        `transition:${commandId}`,
        ...scope,
        input.preparationTicketId,
        current.state,
        targetState,
        commandId,
        principal.accountId,
        terminalReason,
      ],
    );
    const eventId = randomUUID();
    const eventPayload = {
      preparationTicketId: input.preparationTicketId,
      stationTicketId: input.stationTicketId,
      action: input.action,
      fromState: current.state,
      toState: targetState,
      version,
      deviceId: principal.deviceId,
    };
    await tx.query(
      `insert into crays_store_operations.outbox
       (event_id,tenant_id,operator_id,legal_entity_id,store_id,aggregate_type,
        aggregate_id,event_type,schema_version,correlation_id,causation_id,
        idempotency_key,payload,payload_hash)
       values ($1,$2,$3,$4,$5,'preparation_ticket',$6,'KdsTicketCommandApplied',1,
        $7,$8,$9,$10::jsonb,$11)`,
      [
        eventId,
        ...scope,
        input.preparationTicketId,
        correlationId,
        commandId,
        input.idempotencyKey,
        JSON.stringify(eventPayload),
        payloadHash(eventPayload),
      ],
    );
    return {
      replay: false,
      commandId,
      status: "applied" as const,
      version,
      state: targetState,
      eventId,
    };
  });
}

export async function registerKdsDevice(
  database: KdsDatabase,
  principal: KdsPrincipal,
  input: Readonly<{ stationId: string; idempotencyKey: string }>,
) {
  if (principal.role !== "coffee_store_manager" || !input.idempotencyKey.trim()) {
    throw new Error("Only a Coffee Store Manager may register a device idempotently.");
  }
  const scope = scopeValues(principal);
  return database.transaction(async (tx) => {
    const replay = await tx.query<{
      aggregate_id: string;
      safe_result: { credentialRecoverable?: boolean };
    }>(
      `select aggregate_id,safe_result from crays_store_operations.command_receipts
       where tenant_id=$1 and idempotency_key=$2`,
      [principal.tenantId, input.idempotencyKey],
    );
    if (replay.rows.length === 1) {
      return {
        replay: true,
        deviceId: replay.rows[0].aggregate_id,
        rawCredential: null,
        credentialRecoverable: false,
      };
    }
    const station = await tx.query<{ station_id: string }>(
      `select station_id from crays_store_operations.stations
       where tenant_id=$1 and operator_id=$2 and legal_entity_id=$3 and store_id=$4
         and station_id=$5 and status='active'
       for share`,
      [...scope, input.stationId],
    );
    if (station.rows.length !== 1) {
      throw new Error("KDS station is denied or inactive for this Store.");
    }
    const deviceId = randomUUID();
    const rawCredential = randomBytes(32).toString("base64url");
    await tx.query(
      `insert into crays_store_operations.store_devices
       (device_id,tenant_id,operator_id,legal_entity_id,store_id,station_id,
        credential_fingerprint,status)
       values ($1,$2,$3,$4,$5,$6,$7,'active')`,
      [deviceId, ...scope, input.stationId, hash(rawCredential)],
    );
    const commandId = randomUUID();
    const correlationId = randomUUID();
    const safeResult = {
      deviceId,
      stationId: input.stationId,
      status: "active",
      credentialRecoverable: false,
    };
    await tx.query(
      `insert into crays_store_operations.command_receipts
       (command_id,idempotency_key,tenant_id,operator_id,legal_entity_id,store_id,
        aggregate_type,aggregate_id,command_type,resulting_version,status,
        correlation_id,actor_id,safe_result)
       values ($1,$2,$3,$4,$5,$6,'device',$7,'kds_register',1,'applied',
        $8,$9,$10::jsonb)`,
      [
        commandId,
        input.idempotencyKey,
        ...scope,
        deviceId,
        correlationId,
        principal.accountId,
        JSON.stringify(safeResult),
      ],
    );
    const eventId = randomUUID();
    await tx.query(
      `insert into crays_store_operations.outbox
       (event_id,tenant_id,operator_id,legal_entity_id,store_id,aggregate_type,
        aggregate_id,event_type,schema_version,correlation_id,causation_id,
        idempotency_key,payload,payload_hash)
       values ($1,$2,$3,$4,$5,'device',$6,'KdsDeviceRegistered',1,$7,$8,$9,$10::jsonb,$11)`,
      [
        eventId,
        ...scope,
        deviceId,
        correlationId,
        commandId,
        input.idempotencyKey,
        JSON.stringify(safeResult),
        payloadHash(safeResult),
      ],
    );
    return {
      replay: false,
      deviceId,
      rawCredential,
      credentialRecoverable: false,
    };
  });
}

export async function revokeKdsDeviceSession(
  query: KdsQuery,
  principal: KdsPrincipal,
  reason = "device signed out",
) {
  await query(
    `update crays_store_operations.kds_device_sessions
     set revoked_at=now(),revoke_reason=$2,version=version+1
     where device_session_id=$1 and revoked_at is null`,
    [principal.deviceSessionId, reason],
  );
}

export async function rotateKdsDeviceCredential(
  database: KdsDatabase,
  principal: KdsPrincipal,
) {
  if (principal.role !== "coffee_store_manager") {
    throw new Error("Only a Coffee Store Manager may rotate a device credential.");
  }
  const nextCredential = randomBytes(32).toString("base64url");
  const scope = scopeValues(principal);
  return database.transaction(async (tx) => {
    const update = await tx.query<{ version: string }>(
      `update crays_store_operations.store_devices
       set credential_fingerprint=$1,credential_version=credential_version+1,
           rotated_at=now(),version=version+1
       where tenant_id=$2 and operator_id=$3 and legal_entity_id=$4 and store_id=$5
         and device_id=$6 and status='active'
       returning version::text`,
      [hash(nextCredential), ...scope, principal.deviceId],
    );
    if (update.rows.length !== 1) throw new Error("Active KDS device was not found.");
    await tx.query(
      `update crays_store_operations.kds_device_sessions
       set revoked_at=now(),revoke_reason='credential rotated',version=version+1
       where tenant_id=$1 and operator_id=$2 and legal_entity_id=$3 and store_id=$4
         and device_id=$5 and revoked_at is null`,
      [...scope, principal.deviceId],
    );
    return {
      deviceId: principal.deviceId,
      version: Number(update.rows[0].version),
      rawCredential: nextCredential,
      credentialRecoverable: false,
    };
  });
}

export async function revokeKdsDevice(
  database: KdsDatabase,
  principal: KdsPrincipal,
  reason: string,
) {
  if (principal.role !== "coffee_store_manager" || reason.trim().length < 3) {
    throw new Error("Only a Coffee Store Manager may revoke a device with a reason.");
  }
  const scope = scopeValues(principal);
  return database.transaction(async (tx) => {
    const update = await tx.query<{ version: string }>(
      `update crays_store_operations.store_devices
       set status='revoked',revoked_at=now(),revoke_reason=$1,version=version+1
       where tenant_id=$2 and operator_id=$3 and legal_entity_id=$4 and store_id=$5
         and device_id=$6 and status='active'
       returning version::text`,
      [reason.trim(), ...scope, principal.deviceId],
    );
    if (update.rows.length !== 1) throw new Error("Active KDS device was not found.");
    await tx.query(
      `update crays_store_operations.kds_device_sessions
       set revoked_at=now(),revoke_reason=$1,version=version+1
       where tenant_id=$2 and operator_id=$3 and legal_entity_id=$4 and store_id=$5
         and device_id=$6 and revoked_at is null`,
      [reason.trim(), ...scope, principal.deviceId],
    );
    return { deviceId: principal.deviceId, version: Number(update.rows[0].version) };
  });
}
