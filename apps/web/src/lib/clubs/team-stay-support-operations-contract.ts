export const CLUBS_TEAM_STAY_SUPPORT_OPERATIONS_CONTRACT = {
  schema: "crays.clubs.team-stay-support-operations.v1",
  version: "1.0.0",
  endpoint: "/api/crays/clubs/team/stay-support",
  method: "GET",
  cache: "no-store",
  actions: {
    schema: "crays.clubs.team-stay-support-command.v1",
    endpoint: "/api/crays/clubs/team/stay-support/actions",
    method: "POST",
    receiptReconciliation: {
      endpoint: "/api/crays/clubs/team/stay-support/actions",
      method: "GET",
      idempotencyKeyRequired: true,
    },
    queueReconciliation: {
      endpoint: "/api/crays/clubs/team/stay-support",
      method: "GET",
      publicReferenceQuery: "reference",
    },
  },
  authorities: {
    booking: false,
    payment: false,
    provider: false,
    production: false,
  },
} as const;

export type TeamStaySupportReconcileState =
  | "team_attention_required"
  | "team_work_in_progress"
  | "resolved"
  | "closed"
  | "reconcile_required";

export type TeamStaySupportRecord = {
  publicSupportReference: string;
  category: string;
  status: string;
  version: number;
  openedAt: string;
  updatedAt: string;
  reconcileState: TeamStaySupportReconcileState;
  nextActions: TeamStaySupportNextAction[];
};

export type TeamStaySupportNextActionType =
  | "acknowledge"
  | "mark_in_progress"
  | "resolve"
  | "close";

export type TeamStaySupportNextAction = {
  type: TeamStaySupportNextActionType;
  endpoint: typeof CLUBS_TEAM_STAY_SUPPORT_OPERATIONS_CONTRACT.actions.endpoint;
  method: typeof CLUBS_TEAM_STAY_SUPPORT_OPERATIONS_CONTRACT.actions.method;
  publicSupportReference: string;
  expectedVersion: number;
};

export type TeamStaySupportRepositoryRecord = Omit<
  TeamStaySupportRecord,
  "reconcileState" | "nextActions"
>;

export function teamStaySupportNextActionTypes(
  status: string,
): TeamStaySupportNextActionType[] {
  switch (status) {
    case "open":
    case "awaiting_team":
      return ["acknowledge"];
    case "acknowledged":
      return ["mark_in_progress", "resolve"];
    case "in_progress":
      return ["resolve"];
    case "resolved":
      return ["close"];
    case "closed":
    default:
      return [];
  }
}

export function teamStaySupportNextActions(
  record: TeamStaySupportRepositoryRecord,
): TeamStaySupportNextAction[] {
  return teamStaySupportNextActionTypes(record.status).map((type) => ({
    type,
    endpoint: CLUBS_TEAM_STAY_SUPPORT_OPERATIONS_CONTRACT.actions.endpoint,
    method: CLUBS_TEAM_STAY_SUPPORT_OPERATIONS_CONTRACT.actions.method,
    publicSupportReference: record.publicSupportReference,
    expectedVersion: record.version,
  }));
}

export function teamStaySupportReconcileState(
  status: string,
): TeamStaySupportReconcileState {
  switch (status) {
    case "open":
    case "awaiting_team":
      return "team_attention_required";
    case "acknowledged":
    case "in_progress":
      return "team_work_in_progress";
    case "resolved":
      return "resolved";
    case "closed":
      return "closed";
    default:
      return "reconcile_required";
  }
}

export function projectSafeTeamStaySupportRecord(
  record: TeamStaySupportRepositoryRecord,
): TeamStaySupportRecord {
  return {
    publicSupportReference: record.publicSupportReference,
    category: record.category,
    status: record.status,
    version: record.version,
    openedAt: record.openedAt,
    updatedAt: record.updatedAt,
    reconcileState: teamStaySupportReconcileState(record.status),
    nextActions: teamStaySupportNextActions(record),
  };
}

export function clubsTeamStaySupportEnvelope(
  status: string,
  extra: Record<string, unknown> = {},
) {
  return {
    schema: CLUBS_TEAM_STAY_SUPPORT_OPERATIONS_CONTRACT.schema,
    version: CLUBS_TEAM_STAY_SUPPORT_OPERATIONS_CONTRACT.version,
    status,
    ...extra,
    bookingAuthority: false,
    paymentAuthority: false,
    providerAuthority: false,
    productionAuthority: false,
  };
}
