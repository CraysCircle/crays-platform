export const CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT = {
  schema: "crays.clubs.team-stay-support-command.v1",
  version: "1.0.0",
  endpoint: "/api/crays/clubs/team/stay-support/actions",
  reconciliationEndpoint: "/api/crays/clubs/team/stay-support",
  methods: ["GET", "POST"],
  cache: "no-store",
  commands: ["acknowledge", "mark_in_progress", "resolve", "close"],
  authentication: {
    actorAuthority: "active_clubs_team_tenant_role_property_binding",
    allowedRoles: ["holiday-manager", "crays-management", "admin"],
    requiredAssurance: ["aal2", "aal3"],
  },
  mutationSecurity: {
    sameOrigin: true,
    jsonOnly: true,
    expectedVersionRequired: true,
    strongIdempotencyKeyRequired: true,
    identicalReplay: 200,
    payloadOrVersionOrStateDrift: 409,
    unknownOutcome: "GET_receipt_then_queue_with_same_key_before_retry",
    appendOnlyReceipt: true,
    forcedRowLevelSecurity: true,
    publicDatabasePrivileges: false,
  },
  deniedAuthorities: {
    bookingAuthority: false,
    paymentAuthority: false,
    providerAuthority: false,
    productionAuthority: false,
  },
} as const;

export type TeamStaySupportCommandType =
  (typeof CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT.commands)[number];

export type TeamStaySupportCommand = Readonly<{
  type: TeamStaySupportCommandType;
  publicSupportReference: string;
  expectedVersion: number;
}>;

export type TeamStaySupportCommandAuthority = Readonly<{
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  roleKey: "holiday-manager" | "crays-management" | "admin";
  assuranceLevel: "aal2" | "aal3";
}>;

export type TeamStaySupportCommandResult = Readonly<{
  schema: typeof CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT.schema;
  version: typeof CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT.version;
  status: "persisted";
  command: TeamStaySupportCommandType;
  publicSupportReference: string;
  supportStatus: "acknowledged" | "in_progress" | "resolved" | "closed";
  supportVersion: number;
  updatedAt: string;
  recordedAt: string;
  reconcileState: "team_stay_support_command_receipt_persisted";
  bookingAuthority: false;
  paymentAuthority: false;
  providerAuthority: false;
  productionAuthority: false;
}>;

export function resolveTeamStaySupportCommandTransition(
  command: TeamStaySupportCommandType,
  currentStatus: string,
): TeamStaySupportCommandResult["supportStatus"] {
  if (
    command === "acknowledge" &&
    ["open", "awaiting_team"].includes(currentStatus)
  ) {
    return "acknowledged";
  }
  if (command === "mark_in_progress" && currentStatus === "acknowledged") {
    return "in_progress";
  }
  if (
    command === "resolve" &&
    ["acknowledged", "in_progress"].includes(currentStatus)
  ) {
    return "resolved";
  }
  if (command === "close" && currentStatus === "resolved") {
    return "closed";
  }
  throw new Error("invalid_team_stay_support_transition");
}

export function teamStaySupportCommandDeniedAuthorities() {
  return {
    ...CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT.deniedAuthorities,
  };
}

export function unavailableTeamStaySupportCommand(status: string) {
  return {
    schema: CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT.schema,
    version: CLUBS_TEAM_STAY_SUPPORT_COMMAND_CONTRACT.version,
    status,
    ...teamStaySupportCommandDeniedAuthorities(),
  };
}
