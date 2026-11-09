import { createHash, randomUUID } from "node:crypto";

export type HotelMemberSafeReadPool = {
  connect(): Promise<{
    query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<{ rows: Row[] }>;
    release(): void;
  }>;
};

export type HotelMemberSafeLifecycle = Readonly<{
  holdId: string;
  bookingId: string | null;
  propertyId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  roomsQuantity: number;
  adults: number;
  children: number;
  currency: string;
  totalAmountMinor: number;
  paymentState:
    | "NOT_STARTED" | "PAYMENT_STARTED" | "ACTION_REQUIRED" | "PAYMENT_METHOD_UPDATE_AVAILABLE"
    | "PAYMENT_NOT_COMPLETED" | "PAYMENT_PROCESSING" | "PAYMENT_CONFIRMED"
    | "PAYMENT_RECEIVED_REVIEW" | "REFUND_IN_PROGRESS";
  bookingState:
    | "ROOM_HELD" | "ROOM_HOLD_ENDED" | "CONFIRMATION_IN_PROGRESS"
    | "CONFIRMATION_NEEDS_ASSISTANCE" | "BOOKING_NOT_CONFIRMED"
    | "BOOKING_CONFIRMED" | "BOOKING_CANCELED" | "STATUS_PENDING";
  nextSafeAction:
    | "NONE" | "COMPLETE_PAYMENT_ACTION" | "CHOOSE_ANOTHER_PAYMENT_METHOD"
    | "WAIT_FOR_PAYMENT" | "WAIT_FOR_CONFIRMATION" | "WAIT_FOR_REFUND" | "CONTACT_SUPPORT";
  memberMessageCode: string;
  canRetryPayment: boolean;
  awaitingReservationConfirmation: boolean;
  roomHoldExpiresAt: string;
  retryAvailableAt: string | null;
  retryExpiresAt: string | null;
  stateObservedAt: string;
}>;

type SafeRow = {
  hold_id: string; booking_id: string | null; property_id: string; room_type_id: string;
  check_in: string; check_out: string; rooms_quantity: number | string; adults: number | string;
  children: number | string; currency: string; total_amount_minor: number | string;
  payment_state: HotelMemberSafeLifecycle["paymentState"];
  booking_state: HotelMemberSafeLifecycle["bookingState"];
  next_safe_action: HotelMemberSafeLifecycle["nextSafeAction"];
  member_message_code: string; can_retry_payment: boolean; awaiting_reservation_confirmation: boolean;
  room_hold_expires_at: string | Date; retry_available_at: string | Date | null;
  retry_expires_at: string | Date | null; state_observed_at: string | Date;
};

const SHA = /^[0-9a-f]{64}$/;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
const sha256 = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
const timestamp = (value: string, field: string) => {
  const date = new Date(value); if (!Number.isFinite(date.getTime())) throw new Error(`${field} is invalid`); return date.toISOString();
};

async function transaction<T>(pool: HotelMemberSafeReadPool, tenantId: string, readOnly: boolean,
  body: (db: Awaited<ReturnType<HotelMemberSafeReadPool["connect"]>>) => Promise<T>): Promise<T> {
  const db = await pool.connect();
  try {
    await db.query(readOnly ? "BEGIN READ ONLY" : "BEGIN");
    await db.query("SELECT set_config('app.tenant_id',$1,true)", [tenantId]);
    const result = await body(db); await db.query("COMMIT"); return result;
  } catch (error) { await db.query("ROLLBACK"); throw error; }
  finally { db.release(); }
}

const isoOrNull = (value: string | Date | null) => value === null ? null : new Date(value).toISOString();

export async function readOwnHotelBookingLifecycles(
  pool: HotelMemberSafeReadPool,
  input: Readonly<{ tenantId: string; viewerSubjectId: string }>,
): Promise<readonly HotelMemberSafeLifecycle[]> {
  if (!input.tenantId.trim() || input.viewerSubjectId.trim().length < 8) throw new Error("HOTEL_MEMBER_SAFE_READ_SCOPE_REQUIRED");
  return transaction(pool, input.tenantId, true, async (db) => {
    const rows = (await db.query<SafeRow>(
      `SELECT hold_id,booking_id,property_id,room_type_id,check_in,check_out,rooms_quantity,
              adults,children,currency,total_amount_minor,payment_state,booking_state,next_safe_action,
              member_message_code,can_retry_payment,awaiting_reservation_confirmation,
              room_hold_expires_at,retry_available_at,retry_expires_at,state_observed_at
         FROM crays_core.clubs_hotel_member_safe_lifecycle_read_model
        WHERE tenant_id=$1 AND viewer_subject_id=$2
        ORDER BY check_in DESC,hold_id`,
      [input.tenantId,input.viewerSubjectId],
    )).rows;
    return Object.freeze(rows.map((row) => Object.freeze({
      holdId: row.hold_id, bookingId: row.booking_id, propertyId: row.property_id,
      roomTypeId: row.room_type_id, checkIn: String(row.check_in), checkOut: String(row.check_out),
      roomsQuantity: Number(row.rooms_quantity), adults: Number(row.adults), children: Number(row.children),
      currency: row.currency, totalAmountMinor: Number(row.total_amount_minor), paymentState: row.payment_state,
      bookingState: row.booking_state, nextSafeAction: row.next_safe_action,
      memberMessageCode: row.member_message_code, canRetryPayment: row.can_retry_payment,
      awaitingReservationConfirmation: row.awaiting_reservation_confirmation,
      roomHoldExpiresAt: new Date(row.room_hold_expires_at).toISOString(),
      retryAvailableAt: isoOrNull(row.retry_available_at), retryExpiresAt: isoOrNull(row.retry_expires_at),
      stateObservedAt: new Date(row.state_observed_at).toISOString(),
    })));
  });
}

export async function persistPublicHotelBookingReadGrant(
  pool: HotelMemberSafeReadPool,
  input: Readonly<{
    tenantId: string; holdId: string; viewerSubjectId: string;
    viewerSubjectKind: "AUTHENTICATED_ACCOUNT" | "OPAQUE_BOOKING_ACCESS_SUBJECT";
    holdRequestSha256: string; authenticationBindingReceiptSha256: string;
    validFrom: string; expiresAt: string;
  }>,
): Promise<Readonly<{ readGrantId: string; grantSha256: string; replayed: boolean }>> {
  if (!input.tenantId.trim() || input.viewerSubjectId.trim().length < 8) throw new Error("PUBLIC_HOTEL_READ_GRANT_SCOPE_REQUIRED");
  if (!SHA.test(input.holdRequestSha256) || !SHA.test(input.authenticationBindingReceiptSha256)) throw new Error("PUBLIC_HOTEL_READ_GRANT_EVIDENCE_INVALID");
  const validFrom = timestamp(input.validFrom, "validFrom"), expiresAt = timestamp(input.expiresAt, "expiresAt");
  if (expiresAt <= validFrom) throw new Error("PUBLIC_HOTEL_READ_GRANT_WINDOW_INVALID");
  const grantSha256 = sha256({ ...input, validFrom, expiresAt });
  return transaction(pool, input.tenantId, false, async (db) => {
    const prior = (await db.query<{ read_grant_id: string; grant_sha256: string }>(
      `SELECT read_grant_id,grant_sha256 FROM crays_core.clubs_hotel_public_booking_read_grants
        WHERE tenant_id=$1 AND hold_id=$2 AND viewer_subject_id=$3 FOR UPDATE`,
      [input.tenantId,input.holdId,input.viewerSubjectId],
    )).rows[0];
    if (prior) {
      if (prior.grant_sha256 !== grantSha256) throw new Error("PUBLIC_HOTEL_READ_GRANT_REPLAY_CONFLICT");
      return { readGrantId: prior.read_grant_id, grantSha256, replayed: true };
    }
    const readGrantId = randomUUID();
    await db.query(
      `INSERT INTO crays_core.clubs_hotel_public_booking_read_grants
       (read_grant_id,tenant_id,hold_id,viewer_subject_id,viewer_subject_kind,hold_request_sha256,
        authentication_binding_receipt_sha256,grant_sha256,valid_from,expires_at,persisted_record,
        synthetic_source,provider_mutation_performed,formal_applied,created_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz,$10::timestamptz,true,false,false,false,$9::timestamptz)`,
      [readGrantId,input.tenantId,input.holdId,input.viewerSubjectId,input.viewerSubjectKind,
        input.holdRequestSha256,input.authenticationBindingReceiptSha256,grantSha256,validFrom,expiresAt],
    );
    return { readGrantId, grantSha256, replayed: false };
  });
}

export async function revokePublicHotelBookingReadGrant(
  pool: HotelMemberSafeReadPool,
  input: Readonly<{
    tenantId: string; readGrantId: string;
    reason: "SUBJECT_REQUEST" | "SECURITY_ROTATION" | "BOOKING_TERMINAL" | "ACCESS_REPLACED";
    revocationEvidenceSha256: string; revokedAt: string;
  }>,
): Promise<Readonly<{ readGrantRevocationId: string; replayed: boolean }>> {
  if (!input.tenantId.trim() || !SHA.test(input.revocationEvidenceSha256)) throw new Error("PUBLIC_HOTEL_READ_REVOCATION_INVALID");
  const revokedAt = timestamp(input.revokedAt, "revokedAt");
  return transaction(pool, input.tenantId, false, async (db) => {
    const prior = (await db.query<{ read_grant_revocation_id: string; revocation_reason: string; revocation_evidence_sha256: string }>(
      `SELECT read_grant_revocation_id,revocation_reason,revocation_evidence_sha256
         FROM crays_core.clubs_hotel_public_booking_read_grant_revocations
        WHERE tenant_id=$1 AND read_grant_id=$2 FOR UPDATE`, [input.tenantId,input.readGrantId],
    )).rows[0];
    if (prior) {
      if (prior.revocation_reason !== input.reason || prior.revocation_evidence_sha256 !== input.revocationEvidenceSha256) throw new Error("PUBLIC_HOTEL_READ_REVOCATION_REPLAY_CONFLICT");
      return { readGrantRevocationId: prior.read_grant_revocation_id, replayed: true };
    }
    const readGrantRevocationId = randomUUID();
    await db.query(
      `INSERT INTO crays_core.clubs_hotel_public_booking_read_grant_revocations
       (read_grant_revocation_id,tenant_id,read_grant_id,revocation_reason,revocation_evidence_sha256,
        revoked_at,persisted_record,synthetic_source,provider_mutation_performed,formal_applied)
       VALUES($1,$2,$3,$4,$5,$6::timestamptz,true,false,false,false)`,
      [readGrantRevocationId,input.tenantId,input.readGrantId,input.reason,input.revocationEvidenceSha256,revokedAt],
    );
    return { readGrantRevocationId, replayed: false };
  });
}
