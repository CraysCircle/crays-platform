export const CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT = {
  schema: "crays.clubs.team-service-request-operations.v1",
  version: "1.0.0",
  endpoint: "/api/crays/clubs/team/services",
  method: "GET",
  cache: "no-store",
  projection: {
    query: "projection",
    value: "member_service_requests",
    publicReferenceQuery: "reference",
    reconcileAt:
      "/api/crays/clubs/team/services?projection=member_service_requests",
  },
  actions: {
    endpoint:
      "/api/crays/clubs/team/services?projection=member_service_requests",
    method: "POST",
    commands: ["confirm_service", "fulfil_service"],
    expectedVersionRequired: true,
    strongIdempotencyKeyRequired: true,
    identicalReplay: 200,
    driftOrVersionOrStateConflict: 409,
    unknownOutcome: 503,
    reconcileWithGetBeforeSameKeyRetry: true,
    receipt: {
      persistenceVersion: 1,
      persistedResponseRequired: true,
      identicalReplayUsesPersistedResponse: true,
      transactionBindings: [
        "app_role",
        "actor_account_id",
        "tenant_session_id",
        "organization_id",
        "role_key",
        "property_id",
      ],
    },
  },
  authorities: {
    booking: false,
    payment: false,
    provider: false,
    production: false,
  },
} as const;

export type TeamServiceRequestReconcileState =
  | "team_attention_required"
  | "team_work_in_progress"
  | "resolved"
  | "closed"
  | "reconcile_required";

export type TeamServiceRequestRepositoryRecord = {
  publicServiceReference: string;
  category: string;
  status: string;
  version: number;
  requestedAt: string;
  updatedAt: string;
};

export type TeamServiceRequestRecord = TeamServiceRequestRepositoryRecord & {
  reconcileState: TeamServiceRequestReconcileState;
  nextActions: TeamServiceRequestNextAction[];
};

export type TeamServiceRequestActionType =
  | "confirm_service"
  | "fulfil_service";

export type TeamServiceRequestNextAction = {
  type: TeamServiceRequestActionType;
  endpoint: typeof CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.actions.endpoint;
  method: typeof CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.actions.method;
  publicServiceReference: string;
  expectedVersion: number;
};

export type TeamServiceRequestPersistedCommandResponse = {
  schema: typeof CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.schema;
  version: typeof CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.version;
  status:
    | "applied"
    | "denied"
    | "invalid"
    | "version_or_state_conflict";
  action: TeamServiceRequestActionType;
  publicServiceReference: string;
  serviceStatus: string | null;
  serviceVersion: number | null;
  reconcileAt: string;
  bookingAuthority: false;
  paymentAuthority: false;
  providerAuthority: false;
  productionAuthority: false;
};

const persistedCommandResponseKeys = [
  "action",
  "bookingAuthority",
  "paymentAuthority",
  "productionAuthority",
  "providerAuthority",
  "publicServiceReference",
  "reconcileAt",
  "schema",
  "serviceStatus",
  "serviceVersion",
  "status",
  "version",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseTeamServiceRequestPersistedCommandResponse(
  value: unknown,
  expected: {
    action: TeamServiceRequestActionType;
    publicServiceReference: string;
  },
): TeamServiceRequestPersistedCommandResponse {
  if (!isRecord(value)) throw new Error("Persisted response is unavailable.");
  const keys = Object.keys(value).sort();
  if (
    keys.length !== persistedCommandResponseKeys.length ||
    keys.some((key, index) => key !== persistedCommandResponseKeys[index])
  ) {
    throw new Error("Persisted response projection is invalid.");
  }
  if (
    value.schema !== CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.schema ||
    value.version !== CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.version ||
    ![
      "applied",
      "denied",
      "invalid",
      "version_or_state_conflict",
    ].includes(String(value.status)) ||
    value.action !== expected.action ||
    value.publicServiceReference !== expected.publicServiceReference ||
    value.reconcileAt !==
      teamServiceRequestReconcileUrl(expected.publicServiceReference) ||
    !(
      value.serviceStatus === null || typeof value.serviceStatus === "string"
    ) ||
    !(
      value.serviceVersion === null ||
      (Number.isSafeInteger(value.serviceVersion) &&
        Number(value.serviceVersion) >= 1)
    ) ||
    value.bookingAuthority !== false ||
    value.paymentAuthority !== false ||
    value.providerAuthority !== false ||
    value.productionAuthority !== false
  ) {
    throw new Error("Persisted response does not match the command authority.");
  }
  return value as TeamServiceRequestPersistedCommandResponse;
}

export function teamServiceRequestNextActionTypes(
  status: string,
): TeamServiceRequestActionType[] {
  switch (status) {
    case "requested":
      return ["confirm_service"];
    case "confirmed":
      return ["fulfil_service"];
    default:
      return [];
  }
}

export function teamServiceRequestNextActions(
  record: TeamServiceRequestRepositoryRecord,
): TeamServiceRequestNextAction[] {
  return teamServiceRequestNextActionTypes(record.status).map((type) => ({
    type,
    endpoint: CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.actions.endpoint,
    method: CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.actions.method,
    publicServiceReference: record.publicServiceReference,
    expectedVersion: record.version,
  }));
}

export function teamServiceRequestReconcileState(
  status: string,
): TeamServiceRequestReconcileState {
  switch (status) {
    case "requested":
      return "team_attention_required";
    case "confirmed":
      return "team_work_in_progress";
    case "fulfilled":
      return "resolved";
    case "cancelled":
      return "closed";
    default:
      return "reconcile_required";
  }
}

export function projectSafeTeamServiceRequest(
  record: TeamServiceRequestRepositoryRecord,
): TeamServiceRequestRecord {
  return {
    publicServiceReference: record.publicServiceReference,
    category: record.category,
    status: record.status,
    version: record.version,
    requestedAt: record.requestedAt,
    updatedAt: record.updatedAt,
    reconcileState: teamServiceRequestReconcileState(record.status),
    nextActions: teamServiceRequestNextActions(record),
  };
}

export function teamServiceRequestReconcileUrl(
  publicServiceReference: string,
) {
  return `${CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.projection.reconcileAt}&reference=${encodeURIComponent(publicServiceReference)}`;
}

export function clubsTeamServiceRequestEnvelope(
  status: string,
  extra: Record<string, unknown> = {},
) {
  return {
    schema: CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.schema,
    version: CLUBS_TEAM_SERVICE_REQUEST_OPERATIONS_CONTRACT.version,
    status,
    ...extra,
    bookingAuthority: false,
    paymentAuthority: false,
    providerAuthority: false,
    productionAuthority: false,
  };
}
