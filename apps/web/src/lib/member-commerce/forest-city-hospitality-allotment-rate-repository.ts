import { createHash, randomUUID } from "node:crypto";

export type HotelAllotmentRatePool = {
  connect(): Promise<{
    query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<{ rows: Row[] }>;
    release(): void;
  }>;
};

export type HotelAllotmentRateDayInput = {
  stayDate: string;
  purchasedQuantity: number;
  currency: string;
  unitAmountMinor: number;
  sourceLineReference: string;
  sourceLineSha256: string;
  taxPolicySha256: string;
};

export type PersistHotelAllotmentRateDaysInput = {
  tenantId: string;
  franchiseProjectId: string;
  propertyId: string;
  storeId: string;
  legalEntityId: string;
  commercialAssignmentId: string;
  sourceReceiptId: string;
  sourceManifestBindingId: string;
  roomTypeId: string;
  days: HotelAllotmentRateDayInput[];
};

export type HotelAllotmentOffer = {
  sourceReceiptId: string;
  sourceManifestBindingId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  roomsQuantity: number;
  currency: string;
  totalAmountMinor: number;
  nights: Array<{
    allotmentRateDayId: string;
    stayDate: string;
    unitAmountMinor: number;
    availableQuantity: number;
  }>;
};

type ExistingDayRow = { allotment_rate_day_id: string; record_sha256: string };
type OfferRow = {
  allotment_rate_day_id: string;
  stay_date: string | Date;
  currency: string;
  unit_amount_minor: string | number;
  purchased_quantity: string | number;
  committed_quantity: string | number;
};

const shaPattern = /^[0-9a-f]{64}$/;

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

function normalizeDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))) {
    throw new Error(`invalid stay date: ${value}`);
  }
  return value;
}

function enumerateStayDates(checkIn: string, checkOut: string): string[] {
  const start = Date.parse(`${normalizeDate(checkIn)}T00:00:00.000Z`);
  const end = Date.parse(`${normalizeDate(checkOut)}T00:00:00.000Z`);
  if (end <= start) throw new Error("checkOut must be after checkIn");
  const result: string[] = [];
  for (let cursor = start; cursor < end; cursor += 86_400_000) result.push(new Date(cursor).toISOString().slice(0, 10));
  return result;
}

function normalizeDay(day: HotelAllotmentRateDayInput) {
  const currency = day.currency.trim().toUpperCase();
  if (!Number.isInteger(day.purchasedQuantity) || day.purchasedQuantity <= 0) throw new Error("purchasedQuantity must be positive");
  if (!Number.isSafeInteger(day.unitAmountMinor) || day.unitAmountMinor < 0) throw new Error("unitAmountMinor must be non-negative");
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("currency must be a three-letter ISO code");
  if (!shaPattern.test(day.sourceLineSha256) || !shaPattern.test(day.taxPolicySha256)) throw new Error("source and tax hashes must be lowercase SHA-256");
  return { ...day, stayDate: normalizeDate(day.stayDate), currency };
}

export async function persistHotelAllotmentRateDays(
  pool: HotelAllotmentRatePool,
  input: PersistHotelAllotmentRateDaysInput,
): Promise<{ inserted: number; replayed: number }> {
  if (input.days.length === 0) throw new Error("at least one source-backed allotment day is required");
  const normalizedDays = input.days.map(normalizeDay).sort((a, b) => a.stayDate.localeCompare(b.stayDate));
  if (new Set(normalizedDays.map((day) => day.stayDate)).size !== normalizedDays.length) throw new Error("stay dates must be unique");
  const client = await pool.connect();
  let inserted = 0;
  let replayed = 0;
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [input.tenantId]);
    const source = await client.query<{ receipt_id: string }>(
      `SELECT r.receipt_id
         FROM crays_core.clubs_hotel_room_source_receipts r
         JOIN crays_core.clubs_hotel_room_source_manifest_bindings b ON b.receipt_id = r.receipt_id
        WHERE r.receipt_id = $1 AND b.binding_id = $2 AND b.room_type_id = $3
          AND r.tenant_id = $4 AND r.property_id = $5 AND r.store_id = $6
          AND r.legal_entity_id = $7 AND r.commercial_assignment_id = $8
          AND r.source_kind = 'CRAYS_PURCHASED_ALLOTMENT'
          AND r.source_authority = 'crays-allotment-contract'
          AND r.persisted_record = true AND r.synthetic_source = false
        FOR SHARE`,
      [input.sourceReceiptId, input.sourceManifestBindingId, input.roomTypeId, input.tenantId, input.propertyId, input.storeId, input.legalEntityId, input.commercialAssignmentId],
    );
    if (!source.rows[0]) throw new Error("allotment ingestion denied: exact non-synthetic room source binding not found");

    for (const day of normalizedDays) {
      const recordSha256 = sha256({
        tenantId: input.tenantId,
        franchiseProjectId: input.franchiseProjectId,
        propertyId: input.propertyId,
        storeId: input.storeId,
        legalEntityId: input.legalEntityId,
        commercialAssignmentId: input.commercialAssignmentId,
        sourceReceiptId: input.sourceReceiptId,
        sourceManifestBindingId: input.sourceManifestBindingId,
        roomTypeId: input.roomTypeId,
        ...day,
      });
      const existing = await client.query<ExistingDayRow>(
        `SELECT allotment_rate_day_id, record_sha256
           FROM crays_core.clubs_hotel_room_allotment_rate_days
          WHERE tenant_id = $1 AND source_receipt_id = $2
            AND source_manifest_binding_id = $3 AND stay_date = $4::date
          FOR UPDATE`,
        [input.tenantId, input.sourceReceiptId, input.sourceManifestBindingId, day.stayDate],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].record_sha256 !== recordSha256) throw new Error(`allotment source replay conflict for ${day.stayDate}`);
        replayed += 1;
        continue;
      }
      await client.query(
        `INSERT INTO crays_core.clubs_hotel_room_allotment_rate_days (
           allotment_rate_day_id, tenant_id, franchise_project_id, property_id,
           store_id, legal_entity_id, commercial_assignment_id, source_receipt_id,
           source_manifest_binding_id, room_type_id, stay_date, purchased_quantity,
           currency, unit_amount_minor, source_line_reference, source_line_sha256,
           tax_policy_sha256, record_sha256, persisted_record, synthetic_source
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12,$13,$14,$15,$16,$17,$18,true,false)`,
        [randomUUID(), input.tenantId, input.franchiseProjectId, input.propertyId, input.storeId, input.legalEntityId, input.commercialAssignmentId, input.sourceReceiptId, input.sourceManifestBindingId, input.roomTypeId, day.stayDate, day.purchasedQuantity, day.currency, day.unitAmountMinor, day.sourceLineReference, day.sourceLineSha256, day.taxPolicySha256, recordSha256],
      );
      inserted += 1;
    }
    await client.query("COMMIT");
    return { inserted, replayed };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function readHotelAllotmentOffer(
  pool: HotelAllotmentRatePool,
  input: {
    tenantId: string;
    sourceReceiptId: string;
    sourceManifestBindingId: string;
    roomTypeId: string;
    checkIn: string;
    checkOut: string;
    roomsQuantity: number;
  },
): Promise<HotelAllotmentOffer | null> {
  if (!Number.isInteger(input.roomsQuantity) || input.roomsQuantity <= 0) throw new Error("roomsQuantity must be positive");
  const expectedDates = enumerateStayDates(input.checkIn, input.checkOut);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [input.tenantId]);
    const result = await client.query<OfferRow>(
      `SELECT d.allotment_rate_day_id, d.stay_date, d.currency, d.unit_amount_minor,
              d.purchased_quantity,
              COALESCE(sum(a.allocated_quantity) FILTER (
                WHERE a.allocation_status = 'converted'
                   OR (a.allocation_status = 'held' AND a.expires_at > clock_timestamp())
              ), 0) AS committed_quantity
         FROM crays_core.clubs_hotel_room_allotment_rate_days d
         LEFT JOIN crays_core.clubs_hotel_booking_inventory_hold_allocations a
           ON a.tenant_id = d.tenant_id
          AND a.allotment_rate_day_id = d.allotment_rate_day_id
        WHERE d.tenant_id = $1 AND d.source_receipt_id = $2
          AND d.source_manifest_binding_id = $3 AND d.room_type_id = $4
          AND d.stay_date >= $5::date AND d.stay_date < $6::date
          AND d.persisted_record = true AND d.synthetic_source = false
        GROUP BY d.allotment_rate_day_id
        ORDER BY d.stay_date`,
      [input.tenantId, input.sourceReceiptId, input.sourceManifestBindingId, input.roomTypeId, input.checkIn, input.checkOut],
    );
    const rows = result.rows;
    const actualDates = rows.map((row) => new Date(row.stay_date).toISOString().slice(0, 10));
    if (actualDates.length !== expectedDates.length || actualDates.some((date, index) => date !== expectedDates[index])) {
      await client.query("COMMIT");
      return null;
    }
    const currencies = new Set(rows.map((row) => row.currency));
    if (currencies.size !== 1) throw new Error("allotment offer spans multiple currencies");
    const nights = rows.map((row) => ({
      allotmentRateDayId: row.allotment_rate_day_id,
      stayDate: new Date(row.stay_date).toISOString().slice(0, 10),
      unitAmountMinor: Number(row.unit_amount_minor),
      availableQuantity: Number(row.purchased_quantity) - Number(row.committed_quantity),
    }));
    if (nights.some((night) => night.availableQuantity < input.roomsQuantity)) {
      await client.query("COMMIT");
      return null;
    }
    const offer: HotelAllotmentOffer = {
      sourceReceiptId: input.sourceReceiptId,
      sourceManifestBindingId: input.sourceManifestBindingId,
      roomTypeId: input.roomTypeId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      roomsQuantity: input.roomsQuantity,
      currency: rows[0].currency,
      totalAmountMinor: nights.reduce((sum, night) => sum + night.unitAmountMinor * input.roomsQuantity, 0),
      nights,
    };
    await client.query("COMMIT");
    return offer;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
