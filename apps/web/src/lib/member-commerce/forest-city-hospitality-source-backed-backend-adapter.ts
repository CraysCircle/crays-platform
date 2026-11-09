import {
  createSourceBackedHotelBookingHold,
  type SourceBackedBookingHold,
  type SourceBackedBookingPool,
} from "./forest-city-hospitality-source-backed-booking-orchestrator";

export type HotelBackendScope = {
  tenantId: string;
  franchiseProjectId: string;
  propertyId: string;
  storeId: string;
  legalEntityId: string;
  commercialAssignmentId: string;
  sourceReceiptId: string;
  accessMode: "open" | "property_admission_required";
};

export type HotelAvailabilitySearch = {
  checkIn: string;
  checkOut: string;
  roomsQuantity: number;
  adults: number;
  children: number;
};

export type SourceBackedHotelAvailability = {
  sourceStatus: "ready" | "source-unavailable";
  propertyId: string;
  checkIn: string;
  checkOut: string;
  roomsQuantity: number;
  reservationGate: "public-no-membership" | "membership-team-active-grant";
  rooms: Array<{
    roomTypeId: string;
    sourceManifestBindingId: string;
    currency: string;
    totalAmountMinor: number;
    availableQuantity: number;
    nights: Array<{ stayDate: string; unitAmountMinor: number; availableQuantity: number }>;
  }>;
};

type AvailabilityRow = {
  source_manifest_binding_id: string;
  room_type_id: string;
  stay_date: string | Date;
  currency: string;
  unit_amount_minor: string | number;
  purchased_quantity: string | number;
  committed_quantity: string | number;
};

function dateOnly(value: string | Date): string {
  const result = value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(`${result}T00:00:00.000Z`))) throw new Error("invalid booking date");
  return result;
}

function stayDates(checkIn: string, checkOut: string): string[] {
  const start = Date.parse(`${dateOnly(checkIn)}T00:00:00.000Z`);
  const end = Date.parse(`${dateOnly(checkOut)}T00:00:00.000Z`);
  if (end <= start) throw new Error("checkOut must be after checkIn");
  const dates: string[] = [];
  for (let cursor = start; cursor < end; cursor += 86_400_000) dates.push(new Date(cursor).toISOString().slice(0, 10));
  return dates;
}

function validateSearch(search: HotelAvailabilitySearch) {
  const dates = stayDates(search.checkIn, search.checkOut);
  if (!Number.isInteger(search.roomsQuantity) || search.roomsQuantity <= 0) throw new Error("roomsQuantity must be positive");
  if (!Number.isInteger(search.adults) || search.adults <= 0) throw new Error("adults must be positive");
  if (!Number.isInteger(search.children) || search.children < 0) throw new Error("children must be non-negative");
  return dates;
}

export async function readSourceBackedHotelAvailability(
  pool: SourceBackedBookingPool,
  scope: HotelBackendScope,
  search: HotelAvailabilitySearch,
): Promise<SourceBackedHotelAvailability> {
  const expectedDates = validateSearch(search);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [scope.tenantId]);
    const result = await client.query<AvailabilityRow>(
      `SELECT b.binding_id source_manifest_binding_id, b.room_type_id, d.stay_date,
              d.currency, d.unit_amount_minor, d.purchased_quantity,
              COALESCE(sum(a.allocated_quantity) FILTER (
                WHERE a.allocation_status IN ('payment-confirmed','converted')
                   OR (a.allocation_status='held' AND a.expires_at>clock_timestamp())
              ),0) committed_quantity
         FROM crays_core.clubs_hotel_room_source_receipts r
         JOIN crays_core.clubs_hotel_room_source_manifest_bindings b ON b.receipt_id=r.receipt_id
         JOIN crays_core.clubs_hotel_room_allotment_rate_days d
           ON d.tenant_id=r.tenant_id AND d.source_receipt_id=r.receipt_id
          AND d.source_manifest_binding_id=b.binding_id AND d.room_type_id=b.room_type_id
         LEFT JOIN crays_core.clubs_hotel_booking_inventory_hold_allocations a
           ON a.tenant_id=d.tenant_id AND a.allotment_rate_day_id=d.allotment_rate_day_id
        WHERE r.tenant_id=$1 AND r.receipt_id=$2 AND r.property_id=$3
          AND r.store_id=$4 AND r.legal_entity_id=$5 AND r.commercial_assignment_id=$6
          AND r.source_kind='CRAYS_PURCHASED_ALLOTMENT'
          AND r.source_authority='crays-allotment-contract'
          AND r.persisted_record=true AND r.synthetic_source=false
          AND r.valid_from<=clock_timestamp() AND (r.valid_until IS NULL OR r.valid_until>clock_timestamp())
          AND d.persisted_record=true AND d.synthetic_source=false
          AND d.stay_date>=$7::date AND d.stay_date<$8::date
        GROUP BY b.binding_id,b.room_type_id,d.allotment_rate_day_id
        ORDER BY b.room_type_id,d.stay_date`,
      [scope.tenantId, scope.sourceReceiptId, scope.propertyId, scope.storeId, scope.legalEntityId, scope.commercialAssignmentId, search.checkIn, search.checkOut],
    );
    const grouped = new Map<string, AvailabilityRow[]>();
    for (const row of result.rows) grouped.set(row.room_type_id, [...(grouped.get(row.room_type_id) ?? []), row]);
    const rooms: SourceBackedHotelAvailability["rooms"] = [];
    for (const [roomTypeId, rows] of grouped) {
      const dates = rows.map((row) => dateOnly(row.stay_date));
      if (dates.length !== expectedDates.length || dates.some((date, index) => date !== expectedDates[index])) continue;
      const currencies = new Set(rows.map((row) => row.currency));
      const bindings = new Set(rows.map((row) => row.source_manifest_binding_id));
      if (currencies.size !== 1 || bindings.size !== 1) continue;
      const nights = rows.map((row) => ({ stayDate: dateOnly(row.stay_date), unitAmountMinor: Number(row.unit_amount_minor), availableQuantity: Number(row.purchased_quantity) - Number(row.committed_quantity) }));
      const availableQuantity = Math.min(...nights.map((night) => night.availableQuantity));
      if (availableQuantity < search.roomsQuantity) continue;
      rooms.push({ roomTypeId, sourceManifestBindingId: rows[0].source_manifest_binding_id, currency: rows[0].currency, totalAmountMinor: nights.reduce((total, night) => total + night.unitAmountMinor * search.roomsQuantity, 0), availableQuantity, nights });
    }
    await client.query("COMMIT");
    return {
      sourceStatus: rooms.length > 0 ? "ready" : "source-unavailable",
      propertyId: scope.propertyId,
      checkIn: dateOnly(search.checkIn),
      checkOut: dateOnly(search.checkOut),
      roomsQuantity: search.roomsQuantity,
      reservationGate: scope.accessMode === "open" ? "public-no-membership" : "membership-team-active-grant",
      rooms,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createSourceBackedHotelHoldFromTrustedScope(
  pool: SourceBackedBookingPool,
  scope: HotelBackendScope,
  input: HotelAvailabilitySearch & {
    roomTypeId: string;
    sourceManifestBindingId: string;
    idempotencyKey: string;
    holdExpiresAt: string;
    memberId?: string | null;
    admissionGrantId?: string | null;
    accessDecisionReceiptId?: string | null;
  },
): Promise<SourceBackedBookingHold> {
  validateSearch(input);
  const restricted = scope.accessMode === "property_admission_required";
  if (restricted && (!input.memberId || !input.admissionGrantId || !input.accessDecisionReceiptId)) throw new Error("restricted property requires confirmed membership, exact active grant and CRAYS_TEAM receipt");
  return createSourceBackedHotelBookingHold(pool, {
    tenantId: scope.tenantId,
    franchiseProjectId: scope.franchiseProjectId,
    propertyId: scope.propertyId,
    storeId: scope.storeId,
    legalEntityId: scope.legalEntityId,
    commercialAssignmentId: scope.commercialAssignmentId,
    sourceReceiptId: scope.sourceReceiptId,
    sourceManifestBindingId: input.sourceManifestBindingId,
    roomTypeId: input.roomTypeId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    roomsQuantity: input.roomsQuantity,
    adults: input.adults,
    children: input.children,
    accessPolicy: restricted ? "membership-team-active-grant" : "public-no-membership",
    memberId: restricted ? input.memberId : null,
    admissionGrantId: restricted ? input.admissionGrantId : null,
    accessDecisionReceiptId: restricted ? input.accessDecisionReceiptId : null,
    idempotencyKey: input.idempotencyKey,
    holdExpiresAt: input.holdExpiresAt,
  });
}
