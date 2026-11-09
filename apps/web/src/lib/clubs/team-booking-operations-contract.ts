export const CLUBS_TEAM_BOOKING_OPERATIONS_SCHEMA =
  "crays.clubs.team-booking-operations-ui.v1" as const;

export const CLUBS_TEAM_BOOKING_OPERATIONS_CONTRACT = Object.freeze({
  schema: CLUBS_TEAM_BOOKING_OPERATIONS_SCHEMA,
  version: "1.0.0",
  cache: "no-store",
  runtime: "nodejs",
  endpoints: {
    pendingRequests: "/api/crays/clubs/team/booking-requests",
    lifecycle: "/api/crays/clubs/team/booking-lifecycle",
  },
  commands: {
    pendingRequests: ["begin_review", "accept", "reject"],
    lifecycle: [
      "confirm_request",
      "cancel_booking",
      "begin_change_review",
      "approve_change",
      "reject_change",
    ],
  },
  authoritySeparation: {
    paymentAuthority: false,
    refundAuthority: false,
    providerAuthority: false,
    productionAuthority: false,
    marinaEligibilityInferred: false,
    internalConfirmationIsProviderConfirmation: false,
  },
  idempotency: {
    header: "Idempotency-Key",
    minimumLength: 16,
    maximumLength: 200,
    payloadDriftStatus: 409,
    unknownOutcomeStatus: 503,
    reconcileBeforeRetry: true,
  },
} as const);

const strongIdempotencyKey = /^[A-Za-z0-9:_.-]{16,200}$/;

export function isStrongTeamBookingOperationsIdempotencyKey(value: string) {
  return strongIdempotencyKey.test(value);
}

export function clubsTeamBookingOperationsEnvelope(
  status: string,
  extra: Record<string, unknown> = {},
) {
  return {
    schema: CLUBS_TEAM_BOOKING_OPERATIONS_SCHEMA,
    version: CLUBS_TEAM_BOOKING_OPERATIONS_CONTRACT.version,
    ...extra,
    status,
    paymentAuthority: false as const,
    refundAuthority: false as const,
    providerAuthority: false as const,
    productionAuthority: false as const,
    marinaEligibilityInferred: false as const,
  };
}

type PendingRequestProjectionInput = Readonly<{
  status: string;
  holdStatus: string;
  holdIsExpired: boolean;
  [key: string]: unknown;
}>;

export function projectSafeTeamBookingRequest<
  T extends PendingRequestProjectionInput,
>(row: T) {
  const pending = row.status === "submitted" || row.status === "under_review";
  const acceptBlockedReason =
    row.holdStatus !== "active"
      ? "active_hold_required"
      : row.holdIsExpired
        ? "unexpired_hold_required"
        : null;
  const acceptReady = pending && acceptBlockedReason === null;
  const nextActions = !pending
    ? []
    : acceptReady
      ? row.status === "submitted"
        ? ["begin_review", "accept", "reject"]
        : ["accept", "reject"]
      : ["reject"];

  return Object.freeze({
    ...row,
    nextActions,
    acceptReady,
    acceptBlockedReason,
    confirmReady: false as const,
    reconcileState: "request_pending" as const,
    paymentStatus: null,
    paymentAuthority: false as const,
    refundAuthority: false as const,
    providerAuthority: false as const,
    productionAuthority: false as const,
    marinaEligibilityInferred: false as const,
  });
}

type LifecycleProjectionInput = Readonly<{
  requestId: string | null;
  bookingId: string | null;
  bookingStatus: string | null;
  holdStatus: string;
  holdIsExpired: boolean;
  [key: string]: unknown;
}>;

export function projectSafeTeamBookingLifecycle<
  T extends LifecycleProjectionInput,
>(row: T) {
  const confirmBlockedReason = row.bookingId
    ? row.bookingStatus === "cancelled"
      ? "booking_cancelled"
      : "already_confirmed"
    : !row.requestId
      ? "accepted_request_required"
      : row.holdStatus !== "active"
        ? "active_hold_required"
        : row.holdIsExpired
          ? "unexpired_hold_required"
          : null;
  const confirmReady = confirmBlockedReason === null;
  const cancellationReady = Boolean(
    row.bookingId
      && row.bookingStatus
      && ["confirmed", "change_requested"].includes(row.bookingStatus),
  );
  const cancellationBlockedReason = cancellationReady
    ? null
    : !row.bookingId
      ? "confirmed_booking_required"
      : row.bookingStatus === "cancelled"
        ? "already_cancelled"
        : "booking_not_cancellable";
  const reconcileState = row.bookingStatus === "cancelled"
    ? "booking_cancelled_internal_no_payment"
    : row.bookingId
      ? row.bookingStatus === "change_requested"
        ? "booking_change_requested_internal_no_payment"
        : "booking_confirmed_internal_no_payment"
    : confirmReady
      ? "request_accepted_ready_for_internal_confirmation"
      : "request_accepted_confirmation_blocked";
  const nextActions = confirmReady
    ? ["confirm_request"] as const
    : cancellationReady
      ? ["cancel_booking"] as const
      : [] as const;

  return Object.freeze({
    ...row,
    requestStatus: "accepted" as const,
    nextActions,
    confirmReady,
    confirmBlockedReason,
    cancellationReady,
    cancellationBlockedReason,
    reconcileState,
    confirmationScope: "internal_clubs_lifecycle_only" as const,
    cancellationScope: "internal_clubs_lifecycle_only" as const,
    providerConfirmed: false as const,
    paymentStatus: null,
    paymentAuthority: false as const,
    refundAuthority: false as const,
    providerAuthority: false as const,
    productionAuthority: false as const,
    marinaEligibilityInferred: false as const,
  });
}

type ChangeRequestProjectionInput = Readonly<{
  changeRequestId: string;
  bookingReference: string;
  changeType: "dates" | "guest_assignment" | "cancellation" | "other";
  status: "submitted" | "under_review" | "approved" | "rejected" | "cancelled";
  version: number;
  updatedAt: string;
  decidedAt: string | null;
}>;

export function projectSafeTeamBookingChangeRequest(
  row: ChangeRequestProjectionInput,
) {
  const nextActions = row.status === "submitted"
    ? ["begin_change_review", "approve_change", "reject_change"] as const
    : row.status === "under_review"
      ? ["approve_change", "reject_change"] as const
      : [] as const;
  const reconcileState = row.status === "submitted"
    ? "change_request_submitted"
    : row.status === "under_review"
      ? "change_request_under_review"
      : row.status === "approved"
        ? "change_request_approved_preflight_only"
        : row.status === "rejected"
          ? "change_request_rejected"
          : "change_request_cancelled_by_member";

  return Object.freeze({
    changeRequestId: row.changeRequestId,
    bookingReference: row.bookingReference,
    changeType: row.changeType,
    status: row.status,
    version: row.version,
    updatedAt: row.updatedAt,
    decidedAt: row.decidedAt,
    nextActions,
    reconcileState,
    paymentAuthority: false as const,
    refundAuthority: false as const,
    providerAuthority: false as const,
    productionAuthority: false as const,
    marinaEligibilityInferred: false as const,
  });
}
