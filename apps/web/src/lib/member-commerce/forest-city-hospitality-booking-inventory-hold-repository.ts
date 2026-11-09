import { createHash, randomUUID } from "node:crypto";

type QueryResult<Row> = { rows: Row[] };

export type HotelBookingHoldPool = {
  connect(): Promise<{
    query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
    release(): void;
  }>;
};

export type HotelBookingAccessPolicy =
  | "public-no-membership"
  | "membership-team-active-grant";

export type CreateHotelBookingInventoryHoldInput = {
  tenantId: string;
  franchiseProjectId: string;
  propertyId: string;
  storeId: string;
  legalEntityId: string;
  commercialAssignmentId: string;
  sourceReceiptId: string;
  sourceManifestBindingId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  roomsQuantity: number;
  adults: number;
  children: number;
  currency: string;
  unitAmountMinor: number;
  accessPolicy: HotelBookingAccessPolicy;
  memberId?: string | null;
  admissionGrantId?: string | null;
  idempotencyKey: string;
  holdExpiresAt: string;
};

export type HotelBookingInventoryHold = {
  holdId: string;
  tenantId: string;
  propertyId: string;
  roomTypeId: string;
  sourceReceiptId: string;
  sourceManifestBindingId: string;
  status: "held-pending-payment";
  currency: string;
  unitAmountMinor: number;
  totalAmountMinor: number;
  expiresAt: string;
  replayed: boolean;
};

type SourceBindingRow = {
  receipt_id: string;
  binding_id: string;
  room_type_id: string;
};

type HoldRow = {
  hold_id: string;
  tenant_id: string;
  property_id: string;
  room_type_id: string;
  source_receipt_id: string;
  source_manifest_binding_id: string;
  hold_status: "held-pending-payment";
  currency: string;
  unit_amount_minor: string | number;
  total_amount_minor: string | number;
  expires_at: string | Date;
  request_sha256: string;
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function dateOnlyToUtcMs(value: string): number {
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid date: ${value}`);
  return parsed;
}

function normalizeInput(input: CreateHotelBookingInventoryHoldInput) {
  const nights = (dateOnlyToUtcMs(input.checkOut) - dateOnlyToUtcMs(input.checkIn)) / 86_400_000;
  if (!Number.isInteger(nights) || nights <= 0) throw new Error("checkOut must be after checkIn");
  if (!Number.isInteger(input.roomsQuantity) || input.roomsQuantity <= 0) throw new Error("roomsQuantity must be positive");
  if (!Number.isInteger(input.adults) || input.adults <= 0) throw new Error("adults must be positive");
  if (!Number.isInteger(input.children) || input.children < 0) throw new Error("children must be non-negative");
  if (!Number.isSafeInteger(input.unitAmountMinor) || input.unitAmountMinor < 0) throw new Error("unitAmountMinor must be a non-negative safe integer");

  const currency = input.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("currency must be a three-letter ISO code");

  const memberId = input.memberId ?? null;
  const admissionGrantId = input.admissionGrantId ?? null;
  if (input.accessPolicy === "public-no-membership" && (memberId || admissionGrantId)) {
    throw new Error("public booking holds must not claim membership or grant lineage");
  }
  if (input.accessPolicy === "membership-team-active-grant" && (!memberId || !admissionGrantId)) {
    throw new Error("restricted booking holds require confirmed member and active-grant lineage");
  }

  const expiresAtMs = Date.parse(input.holdExpiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) throw new Error("holdExpiresAt must be in the future");

  const normalized = {
    ...input,
    tenantId: input.tenantId.trim(),
    propertyId: input.propertyId.trim(),
    currency,
    memberId,
    admissionGrantId,
    totalAmountMinor: input.unitAmountMinor * input.roomsQuantity * nights,
  };
  return { normalized, requestSha256: sha256(normalized) };
}

function mapHold(row: HoldRow, replayed: boolean): HotelBookingInventoryHold {
  return {
    holdId: row.hold_id,
    tenantId: row.tenant_id,
    propertyId: row.property_id,
    roomTypeId: row.room_type_id,
    sourceReceiptId: row.source_receipt_id,
    sourceManifestBindingId: row.source_manifest_binding_id,
    status: row.hold_status,
    currency: row.currency,
    unitAmountMinor: Number(row.unit_amount_minor),
    totalAmountMinor: Number(row.total_amount_minor),
    expiresAt: new Date(row.expires_at).toISOString(),
    replayed,
  };
}

export async function createHotelBookingInventoryHold(
  pool: HotelBookingHoldPool,
  input: CreateHotelBookingInventoryHoldInput,
): Promise<HotelBookingInventoryHold> {
  const { normalized, requestSha256 } = normalizeInput(input);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [normalized.tenantId]);

    const replay = await client.query<HoldRow>(
      `SELECT hold_id, tenant_id, property_id, room_type_id, source_receipt_id,
              source_manifest_binding_id, hold_status, currency, unit_amount_minor,
              total_amount_minor, expires_at, request_sha256
         FROM crays_core.clubs_hotel_booking_inventory_holds
        WHERE tenant_id = $1 AND idempotency_key = $2
        FOR UPDATE`,
      [normalized.tenantId, normalized.idempotencyKey],
    );
    if (replay.rows[0]) {
      if (replay.rows[0].request_sha256 !== requestSha256) {
        throw new Error("booking hold idempotency key was already used for a different request");
      }
      await client.query("COMMIT");
      return mapHold(replay.rows[0], true);
    }

    const source = await client.query<SourceBindingRow>(
      `SELECT r.receipt_id, b.binding_id, b.room_type_id
         FROM crays_core.clubs_hotel_room_source_receipts r
         JOIN crays_core.clubs_hotel_room_source_manifest_bindings b
           ON b.receipt_id = r.receipt_id
        WHERE r.receipt_id = $1
          AND b.binding_id = $2
          AND b.room_type_id = $3
          AND r.tenant_id = $4
          AND r.property_id = $5
          AND r.store_id = $6
          AND r.legal_entity_id = $7
          AND r.commercial_assignment_id = $8
          AND r.source_kind = 'CRAYS_PURCHASED_ALLOTMENT'
          AND r.source_authority = 'crays-allotment-contract'
          AND r.persisted_record = true
          AND r.synthetic_source = false
          AND r.valid_from <= clock_timestamp()
          AND (r.valid_until IS NULL OR r.valid_until > clock_timestamp())
        FOR SHARE`,
      [
        normalized.sourceReceiptId,
        normalized.sourceManifestBindingId,
        normalized.roomTypeId,
        normalized.tenantId,
        normalized.propertyId,
        normalized.storeId,
        normalized.legalEntityId,
        normalized.commercialAssignmentId,
      ],
    );
    if (!source.rows[0]) {
      throw new Error("booking hold denied: no exact active non-synthetic room source binding");
    }

    const holdId = randomUUID();
    const eventId = randomUUID();
    const inserted = await client.query<HoldRow>(
      `INSERT INTO crays_core.clubs_hotel_booking_inventory_holds (
         hold_id, tenant_id, franchise_project_id, property_id, store_id,
         legal_entity_id, commercial_assignment_id, source_receipt_id,
         source_manifest_binding_id, room_type_id, check_in, check_out,
         rooms_quantity, adults, children, currency, unit_amount_minor,
         total_amount_minor, access_policy, member_id, admission_grant_id,
         idempotency_key, request_sha256, hold_status, expires_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
         $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
         'held-pending-payment', $24
       )
       RETURNING hold_id, tenant_id, property_id, room_type_id, source_receipt_id,
                 source_manifest_binding_id, hold_status, currency, unit_amount_minor,
                 total_amount_minor, expires_at, request_sha256`,
      [
        holdId,
        normalized.tenantId,
        normalized.franchiseProjectId,
        normalized.propertyId,
        normalized.storeId,
        normalized.legalEntityId,
        normalized.commercialAssignmentId,
        normalized.sourceReceiptId,
        normalized.sourceManifestBindingId,
        normalized.roomTypeId,
        normalized.checkIn,
        normalized.checkOut,
        normalized.roomsQuantity,
        normalized.adults,
        normalized.children,
        normalized.currency,
        normalized.unitAmountMinor,
        normalized.totalAmountMinor,
        normalized.accessPolicy,
        normalized.memberId,
        normalized.admissionGrantId,
        normalized.idempotencyKey,
        requestSha256,
        normalized.holdExpiresAt,
      ],
    );

    await client.query(
      `INSERT INTO crays_core.clubs_hotel_booking_inventory_hold_events (
         event_id, tenant_id, hold_id, sequence_no, event_type,
         from_status, to_status, evidence_sha256, event_payload
       ) VALUES ($1, $2, $3, 1, 'hold-created', NULL, 'held-pending-payment', $4, $5::jsonb)`,
      [
        eventId,
        normalized.tenantId,
        holdId,
        requestSha256,
        JSON.stringify({
          sourceReceiptId: normalized.sourceReceiptId,
          sourceManifestBindingId: normalized.sourceManifestBindingId,
          expiresAt: normalized.holdExpiresAt,
        }),
      ],
    );
    await client.query("COMMIT");
    return mapHold(inserted.rows[0], false);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
