export const CLUBS_QLO_BOOKING_OPERATIONS_SCHEMA =
  "crays.clubs.qlo-booking-operations.v1" as const;

export const CLUBS_QLO_BOOKING_OPERATIONS_CONTRACT = Object.freeze({
  schema: CLUBS_QLO_BOOKING_OPERATIONS_SCHEMA,
  version: "1.0.0",
  cache: "no-store",
  runtime: "nodejs",
  endpoint: "/api/crays/clubs/team/qlo/booking-operations",
  canonicalCommands: {
    bookingRequests: "/api/crays/clubs/team/booking-requests",
    bookingLifecycle: "/api/crays/clubs/team/booking-lifecycle",
  },
  roles: ["holiday-manager", "crays-management", "admin"],
  actionAssurance: {
    begin_review: "aal1",
    accept: "aal2",
    reject: "aal2",
    confirm_request: "aal2",
    cancel_booking: "aal2",
    begin_change_review: "aal2",
    approve_change: "aal2",
    reject_change: "aal2",
  },
  reconciliation: {
    conflictStatus: 409,
    unknownOutcomeStatus: 503,
    reconcileBeforeRetry: true,
    retryWithSameIdempotencyKeyOnly: true,
    blindRetryAllowed: false,
  },
  authoritySeparation: {
    paymentAuthority: false,
    refundAuthority: false,
    providerAuthority: false,
    productionAuthority: false,
    marinaEligibilityInferred: false,
  },
} as const);

export type ClubsQloBookingOperationKind =
  | "booking_request"
  | "booking_lifecycle"
  | "booking_change_request";

export type ClubsQloBookingActionName =
  | "begin_review"
  | "accept"
  | "reject"
  | "confirm_request"
  | "cancel_booking"
  | "begin_change_review"
  | "approve_change"
  | "reject_change";

export type ClubsQloBookingAssurance = "aal1" | "aal2" | "aal3";

type SafeCommandTransport = Readonly<Record<string, string | number>>;

export type ClubsQloBookingAction = Readonly<{
  action: ClubsQloBookingActionName;
  endpoint: string;
  method: "POST";
  transport: SafeCommandTransport;
  requiredInput: readonly ("reason")[];
  ready: boolean;
  blockedReason: "step_up_required" | null;
  minimumAssurance: "aal1" | "aal2";
  idempotency: Readonly<{
    header: "Idempotency-Key";
    strongKeyRequired: true;
  }>;
  reconciliation: Readonly<{
    endpoint: string;
    onStatuses: readonly [409, 503];
    beforeRetry: true;
    blindRetryAllowed: false;
    retryWithSameIdempotencyKeyOnly: true;
  }>;
}>;

type AuthorityFlags = Readonly<{
  paymentAuthority: false;
  refundAuthority: false;
  providerAuthority: false;
  productionAuthority: false;
  marinaEligibilityInferred: false;
}>;

export type ClubsQloBookingOperation = AuthorityFlags &
  Readonly<{
    kind: ClubsQloBookingOperationKind;
    operationReference: string;
    publicReference: string;
    propertyId: string | null;
    stayUnit: string | null;
    status: string;
    version: number;
    occurredAt: string;
    reconcileState: string;
    nextActions: readonly ClubsQloBookingAction[];
    hold: Readonly<{
      status: string;
      expiresAt: string | null;
      expired: boolean;
    }> | null;
    stay: Readonly<{
      arrivalDate: string;
      departureDate: string;
      reservationStatus: string | null;
      stayStatus: string | null;
    }> | null;
    change: Readonly<{
      type: "dates" | "guest_assignment" | "cancellation" | "other";
      decidedAt: string | null;
    }> | null;
  }>;

const authorityFlags = Object.freeze({
  paymentAuthority: false as const,
  refundAuthority: false as const,
  providerAuthority: false as const,
  productionAuthority: false as const,
  marinaEligibilityInferred: false as const,
});

function assuranceRank(assurance: ClubsQloBookingAssurance) {
  return assurance === "aal3" ? 3 : assurance === "aal2" ? 2 : 1;
}

function actionReconcileEndpoint(
  kind: ClubsQloBookingOperationKind,
  operationReference: string,
) {
  return `${CLUBS_QLO_BOOKING_OPERATIONS_CONTRACT.endpoint}?kind=${kind}&reference=${encodeURIComponent(operationReference)}`;
}

function projectAction(input: {
  action: ClubsQloBookingActionName;
  kind: ClubsQloBookingOperationKind;
  operationReference: string;
  assurance: ClubsQloBookingAssurance;
  transport: SafeCommandTransport;
}): ClubsQloBookingAction {
  const lifecycleAction = [
    "confirm_request",
    "cancel_booking",
    "begin_change_review",
    "approve_change",
    "reject_change",
  ].includes(input.action);
  const endpoint = lifecycleAction
    ? CLUBS_QLO_BOOKING_OPERATIONS_CONTRACT.canonicalCommands.bookingLifecycle
    : CLUBS_QLO_BOOKING_OPERATIONS_CONTRACT.canonicalCommands.bookingRequests;
  const minimumAssurance = input.action === "begin_review" ? "aal1" : "aal2";
  const ready = assuranceRank(input.assurance) >= assuranceRank(minimumAssurance);
  const requiredInput = input.action === "confirm_request"
    ? [] as const
    : ["reason"] as const;

  return Object.freeze({
    action: input.action,
    endpoint,
    method: "POST" as const,
    transport: Object.freeze({ type: input.action, ...input.transport }),
    requiredInput,
    ready,
    blockedReason: ready ? null : "step_up_required" as const,
    minimumAssurance,
    idempotency: Object.freeze({
      header: "Idempotency-Key" as const,
      strongKeyRequired: true as const,
    }),
    reconciliation: Object.freeze({
      endpoint: actionReconcileEndpoint(input.kind, input.operationReference),
      onStatuses: [409, 503] as const,
      beforeRetry: true as const,
      blindRetryAllowed: false as const,
      retryWithSameIdempotencyKeyOnly: true as const,
    }),
  });
}

type RequestProjectionInput = Readonly<{
  bookingRequestId: string;
  publicReference: string;
  propertyId: string;
  unitId: string;
  status: string;
  version: number;
  submittedAt: string;
  holdStatus: string;
  holdExpiresAt: string;
  holdIsExpired: boolean;
  reconcileState: string;
  nextActions: readonly string[];
}>;

export function projectQloBookingRequest(
  row: RequestProjectionInput,
  assurance: ClubsQloBookingAssurance,
): ClubsQloBookingOperation | null {
  if (!row.publicReference || !row.bookingRequestId || row.version < 1) return null;
  const kind = "booking_request" as const;
  const operationReference = `request:${row.publicReference}`;
  const allowed = new Set<ClubsQloBookingActionName>([
    "begin_review",
    "accept",
    "reject",
  ]);
  const nextActions = row.nextActions
    .filter((action): action is ClubsQloBookingActionName =>
      allowed.has(action as ClubsQloBookingActionName),
    )
    .map((action) => projectAction({
      action,
      kind,
      operationReference,
      assurance,
      transport: {
        requestId: row.bookingRequestId,
        expectedVersion: row.version,
      },
    }));

  return Object.freeze({
    ...authorityFlags,
    kind,
    operationReference,
    publicReference: row.publicReference,
    propertyId: row.propertyId,
    stayUnit: row.unitId,
    status: row.status,
    version: row.version,
    occurredAt: row.submittedAt,
    reconcileState: row.reconcileState,
    nextActions,
    hold: Object.freeze({
      status: row.holdStatus,
      expiresAt: row.holdExpiresAt,
      expired: row.holdIsExpired,
    }),
    stay: null,
    change: null,
  });
}

type LifecycleProjectionInput = Readonly<{
  requestId: string | null;
  requestReference: string | null;
  requestVersion: number | null;
  bookingId: string | null;
  bookingReference: string | null;
  bookingStatus: string | null;
  bookingVersion: number | null;
  propertyId: string;
  unitId: string;
  arrivalDate: string;
  departureDate: string;
  reservationStatus: string | null;
  stayStatus: string | null;
  holdStatus: string;
  holdExpiresAt: string;
  holdIsExpired: boolean;
  reconcileState: string;
  nextActions: readonly string[];
}>;

export function projectQloBookingLifecycle(
  row: LifecycleProjectionInput,
  assurance: ClubsQloBookingAssurance,
): ClubsQloBookingOperation | null {
  const publicReference = row.bookingReference ?? row.requestReference;
  const version = row.bookingVersion ?? row.requestVersion;
  if (!publicReference || !version || version < 1) return null;
  const kind = "booking_lifecycle" as const;
  const operationReference = `lifecycle:${publicReference}`;
  const nextActions = row.nextActions.flatMap((rawAction) => {
    if (rawAction === "confirm_request" && row.requestId && row.requestVersion) {
      return [projectAction({
        action: rawAction,
        kind,
        operationReference,
        assurance,
        transport: {
          requestId: row.requestId,
          expectedVersion: row.requestVersion,
        },
      })];
    }
    if (rawAction === "cancel_booking" && row.bookingId && row.bookingVersion) {
      return [projectAction({
        action: rawAction,
        kind,
        operationReference,
        assurance,
        transport: {
          bookingId: row.bookingId,
          expectedVersion: row.bookingVersion,
        },
      })];
    }
    return [];
  });

  return Object.freeze({
    ...authorityFlags,
    kind,
    operationReference,
    publicReference,
    propertyId: row.propertyId,
    stayUnit: row.unitId,
    status: row.bookingStatus ?? "accepted",
    version,
    occurredAt: row.arrivalDate,
    reconcileState: row.reconcileState,
    nextActions,
    hold: Object.freeze({
      status: row.holdStatus,
      expiresAt: row.holdExpiresAt,
      expired: row.holdIsExpired,
    }),
    stay: Object.freeze({
      arrivalDate: row.arrivalDate,
      departureDate: row.departureDate,
      reservationStatus: row.reservationStatus,
      stayStatus: row.stayStatus,
    }),
    change: null,
  });
}

type ChangeProjectionInput = Readonly<{
  changeRequestId: string;
  bookingReference: string;
  changeType: "dates" | "guest_assignment" | "cancellation" | "other";
  status: "submitted" | "under_review" | "approved" | "rejected" | "cancelled";
  version: number;
  updatedAt: string;
  decidedAt: string | null;
  reconcileState: string;
  nextActions: readonly string[];
}>;

export function projectQloBookingChangeRequest(
  row: ChangeProjectionInput,
  assurance: ClubsQloBookingAssurance,
): ClubsQloBookingOperation | null {
  if (!row.bookingReference || !row.changeRequestId || row.version < 1) return null;
  const kind = "booking_change_request" as const;
  const operationReference =
    `change:${row.bookingReference}:${row.changeType}:${row.updatedAt}`;
  const allowed = new Set<ClubsQloBookingActionName>([
    "begin_change_review",
    "approve_change",
    "reject_change",
  ]);
  const nextActions = row.nextActions
    .filter((action): action is ClubsQloBookingActionName =>
      allowed.has(action as ClubsQloBookingActionName),
    )
    .map((action) => projectAction({
      action,
      kind,
      operationReference,
      assurance,
      transport: {
        changeRequestId: row.changeRequestId,
        expectedVersion: row.version,
      },
    }));

  return Object.freeze({
    ...authorityFlags,
    kind,
    operationReference,
    publicReference: row.bookingReference,
    propertyId: null,
    stayUnit: null,
    status: row.status,
    version: row.version,
    occurredAt: row.updatedAt,
    reconcileState: row.reconcileState,
    nextActions,
    hold: null,
    stay: null,
    change: Object.freeze({
      type: row.changeType,
      decidedAt: row.decidedAt,
    }),
  });
}

export function clubsQloBookingOperationsEnvelope(
  status: string,
  extra: Record<string, unknown> = {},
) {
  return {
    schema: CLUBS_QLO_BOOKING_OPERATIONS_SCHEMA,
    version: CLUBS_QLO_BOOKING_OPERATIONS_CONTRACT.version,
    ...extra,
    status,
    ...authorityFlags,
  };
}
