import { createHash, randomUUID } from "node:crypto";

export type SourceBackedBookingPool = {
  connect(): Promise<{
    query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<{ rows: Row[] }>;
    release(): void;
  }>;
};

export type SourceBackedBookingHoldInput = {
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
  accessPolicy: "public-no-membership" | "membership-team-active-grant";
  memberId?: string | null;
  admissionGrantId?: string | null;
  accessDecisionReceiptId?: string | null;
  idempotencyKey: string;
  holdExpiresAt: string;
};

export type SourceBackedBookingHold = {
  holdId: string;
  status: "held-pending-payment";
  sourceReceiptId: string;
  sourceManifestBindingId: string;
  currency: string;
  totalAmountMinor: number;
  pricingBreakdownSha256: string;
  checkIn: string;
  checkOut: string;
  roomsQuantity: number;
  expiresAt: string;
  replayed: boolean;
};

type RateDayRow = {
  allotment_rate_day_id: string;
  stay_date: string | Date;
  currency: string;
  unit_amount_minor: string | number;
  purchased_quantity: string | number;
};

type CapacityRow = { allotment_rate_day_id: string; committed_quantity: string | number };
type HoldRow = {
  hold_id: string;
  source_receipt_id: string;
  source_manifest_binding_id: string;
  hold_status: "held-pending-payment";
  currency: string;
  total_amount_minor: string | number;
  pricing_breakdown_sha256: string;
  check_in: string | Date;
  check_out: string | Date;
  rooms_quantity: string | number;
  expires_at: string | Date;
  request_sha256: string;
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function dateOnly(value: string | Date): string {
  const candidate = value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || !Number.isFinite(Date.parse(`${candidate}T00:00:00.000Z`))) {
    throw new Error(`invalid date: ${String(value)}`);
  }
  return candidate;
}

function enumerateDates(checkIn: string, checkOut: string): string[] {
  const start = Date.parse(`${dateOnly(checkIn)}T00:00:00.000Z`);
  const end = Date.parse(`${dateOnly(checkOut)}T00:00:00.000Z`);
  if (end <= start) throw new Error("checkOut must be after checkIn");
  const dates: string[] = [];
  for (let cursor = start; cursor < end; cursor += 86_400_000) dates.push(new Date(cursor).toISOString().slice(0, 10));
  return dates;
}

function normalizeInput(input: SourceBackedBookingHoldInput) {
  const dates = enumerateDates(input.checkIn, input.checkOut);
  if (!Number.isInteger(input.roomsQuantity) || input.roomsQuantity <= 0) throw new Error("roomsQuantity must be positive");
  if (!Number.isInteger(input.adults) || input.adults <= 0) throw new Error("adults must be positive");
  if (!Number.isInteger(input.children) || input.children < 0) throw new Error("children must be non-negative");
  const memberId = input.memberId ?? null;
  const admissionGrantId = input.admissionGrantId ?? null;
  const accessDecisionReceiptId = input.accessDecisionReceiptId ?? null;
  if (input.accessPolicy === "public-no-membership" && (memberId || admissionGrantId || accessDecisionReceiptId)) {
    throw new Error("public booking must not claim restricted access lineage");
  }
  if (input.accessPolicy === "membership-team-active-grant" && (!memberId || !admissionGrantId || !accessDecisionReceiptId)) {
    throw new Error("restricted booking requires member, exact active grant and fresh access decision receipt");
  }
  const expiry = Date.parse(input.holdExpiresAt);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) throw new Error("holdExpiresAt must be in the future");
  const normalized = { ...input, memberId, admissionGrantId, accessDecisionReceiptId, checkIn: dates[0], checkOut: input.checkOut.slice(0, 10) };
  return { normalized, dates, requestSha256: sha256(normalized) };
}

function mapHold(row: HoldRow, replayed: boolean): SourceBackedBookingHold {
  return {
    holdId: row.hold_id,
    status: row.hold_status,
    sourceReceiptId: row.source_receipt_id,
    sourceManifestBindingId: row.source_manifest_binding_id,
    currency: row.currency,
    totalAmountMinor: Number(row.total_amount_minor),
    pricingBreakdownSha256: row.pricing_breakdown_sha256,
    checkIn: dateOnly(row.check_in),
    checkOut: dateOnly(row.check_out),
    roomsQuantity: Number(row.rooms_quantity),
    expiresAt: new Date(row.expires_at).toISOString(),
    replayed,
  };
}

export async function createSourceBackedHotelBookingHold(
  pool: SourceBackedBookingPool,
  input: SourceBackedBookingHoldInput,
): Promise<SourceBackedBookingHold> {
  const { normalized, dates, requestSha256 } = normalizeInput(input);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [normalized.tenantId]);
    const replay = await client.query<HoldRow>(
      `SELECT hold_id, source_receipt_id, source_manifest_binding_id, hold_status,
              currency, total_amount_minor, pricing_breakdown_sha256, check_in,
              check_out, rooms_quantity, expires_at, request_sha256
         FROM crays_core.clubs_hotel_booking_inventory_holds
        WHERE tenant_id = $1 AND idempotency_key = $2
        FOR UPDATE`,
      [normalized.tenantId, normalized.idempotencyKey],
    );
    if (replay.rows[0]) {
      if (replay.rows[0].request_sha256 !== requestSha256) throw new Error("booking hold idempotency conflict");
      await client.query("COMMIT");
      return mapHold(replay.rows[0], true);
    }

    if (normalized.accessPolicy === "membership-team-active-grant") {
      const access = await client.query<{ access_decision_receipt_id: string }>(
        `SELECT access_decision_receipt_id
           FROM crays_core.clubs_hotel_booking_access_decision_receipts
          WHERE access_decision_receipt_id = $1 AND tenant_id = $2
            AND property_id = $3 AND member_id = $4 AND admission_grant_id = $5
            AND required_role = 'CRAYS_TEAM' AND membership_status = 'confirmed'
            AND grant_status = 'active' AND decision = 'allow'
            AND persisted_record = true AND synthetic_source = false
            AND evaluated_at <= clock_timestamp() AND expires_at > clock_timestamp()
          FOR SHARE`,
        [normalized.accessDecisionReceiptId, normalized.tenantId, normalized.propertyId, normalized.memberId, normalized.admissionGrantId],
      );
      if (!access.rows[0]) throw new Error("restricted booking denied: fresh confirmed-membership CRAYS_TEAM active-grant receipt not found");
    }

    const rateResult = await client.query<RateDayRow>(
      `SELECT d.allotment_rate_day_id, d.stay_date, d.currency,
              d.unit_amount_minor, d.purchased_quantity
         FROM crays_core.clubs_hotel_room_allotment_rate_days d
         JOIN crays_core.clubs_hotel_room_source_receipts r
           ON r.receipt_id = d.source_receipt_id AND r.tenant_id = d.tenant_id
        WHERE d.tenant_id = $1 AND d.source_receipt_id = $2
          AND d.source_manifest_binding_id = $3 AND d.room_type_id = $4
          AND d.stay_date >= $5::date AND d.stay_date < $6::date
          AND d.persisted_record = true AND d.synthetic_source = false
          AND r.source_kind = 'CRAYS_PURCHASED_ALLOTMENT'
          AND r.source_authority = 'crays-allotment-contract'
          AND r.persisted_record = true AND r.synthetic_source = false
          AND r.valid_from <= clock_timestamp()
          AND (r.valid_until IS NULL OR r.valid_until > clock_timestamp())
        ORDER BY d.stay_date
        FOR UPDATE OF d`,
      [normalized.tenantId, normalized.sourceReceiptId, normalized.sourceManifestBindingId, normalized.roomTypeId, normalized.checkIn, normalized.checkOut],
    );
    const rateDays = rateResult.rows;
    const actualDates = rateDays.map((row) => dateOnly(row.stay_date));
    if (actualDates.length !== dates.length || actualDates.some((date, index) => date !== dates[index])) {
      throw new Error("booking hold denied: complete source-backed date range is unavailable");
    }
    const currencies = new Set(rateDays.map((row) => row.currency));
    if (currencies.size !== 1) throw new Error("booking hold denied: source rates span multiple currencies");

    const capacity = await client.query<CapacityRow>(
      `SELECT allotment_rate_day_id,
              COALESCE(sum(allocated_quantity) FILTER (
                WHERE allocation_status = 'converted'
                   OR (allocation_status = 'held' AND expires_at > clock_timestamp())
              ), 0) AS committed_quantity
         FROM crays_core.clubs_hotel_booking_inventory_hold_allocations
        WHERE tenant_id = $1 AND allotment_rate_day_id = ANY($2::uuid[])
        GROUP BY allotment_rate_day_id`,
      [normalized.tenantId, rateDays.map((row) => row.allotment_rate_day_id)],
    );
    const committed = new Map(capacity.rows.map((row) => [row.allotment_rate_day_id, Number(row.committed_quantity)]));
    if (rateDays.some((row) => Number(row.purchased_quantity) - (committed.get(row.allotment_rate_day_id) ?? 0) < normalized.roomsQuantity)) {
      throw new Error("booking hold denied: purchased allotment capacity is insufficient");
    }

    const pricingBreakdown = rateDays.map((row) => ({
      allotmentRateDayId: row.allotment_rate_day_id,
      stayDate: dateOnly(row.stay_date),
      unitAmountMinor: Number(row.unit_amount_minor),
      quantity: normalized.roomsQuantity,
    }));
    const pricingBreakdownSha256 = sha256(pricingBreakdown);
    const totalAmountMinor = pricingBreakdown.reduce((total, day) => total + day.unitAmountMinor * day.quantity, 0);
    const currency = rateDays[0].currency;
    const holdId = randomUUID();
    const inserted = await client.query<HoldRow>(
      `INSERT INTO crays_core.clubs_hotel_booking_inventory_holds (
         hold_id, tenant_id, franchise_project_id, property_id, store_id,
         legal_entity_id, commercial_assignment_id, source_receipt_id,
         source_manifest_binding_id, room_type_id, check_in, check_out,
         rooms_quantity, adults, children, currency, unit_amount_minor,
         total_amount_minor, pricing_breakdown_sha256, pricing_source,
         access_policy, member_id, admission_grant_id, access_decision_receipt_id,
         idempotency_key, request_sha256, hold_status, expires_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12::date,$13,$14,$15,$16,
                 NULL,$17,$18,'source-allotment-rate-days',$19,$20,$21,$22,$23,$24,
                 'held-pending-payment',$25)
       RETURNING hold_id, source_receipt_id, source_manifest_binding_id, hold_status,
                 currency, total_amount_minor, pricing_breakdown_sha256, check_in,
                 check_out, rooms_quantity, expires_at, request_sha256`,
      [holdId, normalized.tenantId, normalized.franchiseProjectId, normalized.propertyId, normalized.storeId, normalized.legalEntityId, normalized.commercialAssignmentId, normalized.sourceReceiptId, normalized.sourceManifestBindingId, normalized.roomTypeId, normalized.checkIn, normalized.checkOut, normalized.roomsQuantity, normalized.adults, normalized.children, currency, totalAmountMinor, pricingBreakdownSha256, normalized.accessPolicy, normalized.memberId, normalized.admissionGrantId, normalized.accessDecisionReceiptId, normalized.idempotencyKey, requestSha256, normalized.holdExpiresAt],
    );

    for (const day of rateDays) {
      await client.query(
        `INSERT INTO crays_core.clubs_hotel_booking_inventory_hold_allocations (
           allocation_id, tenant_id, hold_id, allotment_rate_day_id, stay_date,
           allocated_quantity, allocation_status, expires_at
         ) VALUES ($1,$2,$3,$4,$5::date,$6,'held',$7)`,
        [randomUUID(), normalized.tenantId, holdId, day.allotment_rate_day_id, dateOnly(day.stay_date), normalized.roomsQuantity, normalized.holdExpiresAt],
      );
    }
    await client.query(
      `INSERT INTO crays_core.clubs_hotel_booking_inventory_hold_events (
         event_id, tenant_id, hold_id, sequence_no, event_type, from_status,
         to_status, evidence_sha256, event_payload
       ) VALUES ($1,$2,$3,1,'source-backed-hold-created',NULL,'held-pending-payment',$4,$5::jsonb)`,
      [randomUUID(), normalized.tenantId, holdId, pricingBreakdownSha256, JSON.stringify({ pricingBreakdown, sourceReceiptId: normalized.sourceReceiptId })],
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
