import {
  BookingRevenueLedgerRepository,
  createBookingRevenuePlan,
  type BookingRevenuePlan,
  type BookingRevenueTransactionRunner,
} from "./booking-revenue-ledger";

export type FinalHotelBookingRevenueSource = {
  tenantId: string;
  bookingId: string;
  providerConfirmationReceiptId: string;
  franchiseProjectId: string;
  propertyId: string;
  legalEntityId: string;
  commercialAssignmentId: string;
  currency: string;
  totalAmountMinor: bigint;
  providerConfirmedAt: Date;
  confirmedAmbassador?: { ambassadorId: string; attributionReceiptId: string };
};

export type HotelRevenueSourceQuery = {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
};

function requireText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty`);
  return normalized;
}

export function createFinalHotelBookingRevenuePlan(source: FinalHotelBookingRevenueSource): BookingRevenuePlan {
  return createBookingRevenuePlan({
    tenantId: requireText(source.tenantId, "tenantId"),
    projectKey: requireText(source.franchiseProjectId, "franchiseProjectId"),
    franchiseKey: `${requireText(source.legalEntityId, "legalEntityId")}:${requireText(source.commercialAssignmentId, "commercialAssignmentId")}`,
    locationKey: requireText(source.propertyId, "propertyId"),
    bookingId: requireText(source.bookingId, "bookingId"),
    bookingVersion: 1,
    sourceEventId: requireText(source.providerConfirmationReceiptId, "providerConfirmationReceiptId"),
    currency: source.currency,
    grossAmountMinor: source.totalAmountMinor,
    recordedAt: source.providerConfirmedAt,
    confirmedAmbassador: source.confirmedAmbassador
      ? {
          state: "CONFIRMED",
          ambassadorId: requireText(source.confirmedAmbassador.ambassadorId, "ambassadorId"),
          evidenceReference: requireText(source.confirmedAmbassador.attributionReceiptId, "attributionReceiptId"),
        }
      : undefined,
    operatingBeneficiary: {
      kind: "FRANCHISE_OPERATOR_LEGAL_ENTITY",
      reference: source.legalEntityId,
      evidenceReference: source.commercialAssignmentId,
    },
  });
}

export async function loadFinalHotelBookingRevenueSource(
  db: HotelRevenueSourceQuery,
  input: { tenantId: string; bookingId: string },
): Promise<FinalHotelBookingRevenueSource> {
  const booking = await db.query<{
    tenant_id: string;
    booking_id: string;
    provider_confirmation_receipt_id: string;
    franchise_project_id: string;
    property_id: string;
    legal_entity_id: string;
    commercial_assignment_id: string;
    currency: string;
    total_amount_minor: string | number;
    provider_confirmed_at: string | Date;
  }>(
    `SELECT tenant_id, booking_id, provider_confirmation_receipt_id,
            franchise_project_id, property_id, legal_entity_id,
            commercial_assignment_id, currency, total_amount_minor,
            provider_confirmed_at
       FROM crays_core.clubs_hotel_final_bookings
      WHERE tenant_id=$1 AND booking_id=$2 AND booking_status='provider-confirmed'`,
    [input.tenantId, input.bookingId],
  );
  if (booking.rows.length !== 1) throw new Error("exact provider-confirmed final booking not found");
  const row = booking.rows[0];
  const attribution = await db.query<{ attribution_receipt_id: string; ambassador_id: string }>(
    `SELECT attribution_receipt_id, ambassador_id
       FROM crays_core.clubs_hotel_booking_ambassador_attribution_receipts
      WHERE tenant_id=$1 AND booking_id=$2
        AND ambassador_status='confirmed' AND attribution_status='confirmed'
        AND decision_authority_kind='CRAYS_TEAM'
        AND persisted_record=true AND synthetic_source=false
      LIMIT 2`,
    [input.tenantId, input.bookingId],
  );
  if (attribution.rows.length > 1) throw new Error("confirmed Ambassador attribution is ambiguous");
  const confirmed = attribution.rows[0];
  return {
    tenantId: row.tenant_id,
    bookingId: row.booking_id,
    providerConfirmationReceiptId: row.provider_confirmation_receipt_id,
    franchiseProjectId: row.franchise_project_id,
    propertyId: row.property_id,
    legalEntityId: row.legal_entity_id,
    commercialAssignmentId: row.commercial_assignment_id,
    currency: row.currency,
    totalAmountMinor: BigInt(row.total_amount_minor),
    providerConfirmedAt: new Date(row.provider_confirmed_at),
    confirmedAmbassador: confirmed
      ? { ambassadorId: confirmed.ambassador_id, attributionReceiptId: confirmed.attribution_receipt_id }
      : undefined,
  };
}

export async function recordFinalHotelBookingRevenue(
  database: BookingRevenueTransactionRunner,
  source: FinalHotelBookingRevenueSource,
): Promise<{ plan: BookingRevenuePlan; dispatchPrepared: boolean }> {
  const plan = createFinalHotelBookingRevenuePlan(source);
  const result = await new BookingRevenueLedgerRepository(database).record(plan);
  return { plan, dispatchPrepared: result.dispatchPrepared };
}
