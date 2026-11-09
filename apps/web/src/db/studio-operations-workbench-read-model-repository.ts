import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type StudioOperationsStatus = "ready" | "attention" | "blocked";
type StudioOperationsPriority = "critical" | "high" | "normal";
type StudioOperationsAccessLevel = "studio_operations" | "oversight" | "external_service_shell" | "forbidden";

export type StudioOperationsCommandHistoryItem = {
  commandId: string;
  label: string;
  actorRole: string;
  commandStatus: string;
  targetApplyStatus: "blocked" | "not_configured";
  applyGate: string;
  preflight: string;
  createdAt: string;
};

export type StudioOperationsAction = {
  key: string;
  label: string;
  commandType: "member_recovery" | "booking_follow_up" | "trainer_capacity_review" | "support_escalation" | "training_plan_update" | "studio_day_close";
  entityId: string | null;
  ownerRole: string;
  priority: StudioOperationsPriority;
  status: StudioOperationsStatus;
  current: string;
  nextAction: string;
};

export type StudioOperationsMemberException = {
  memberId: string;
  label: string;
  membershipStatus: string;
  paymentStatus: string;
  paymentMethodStatus: string;
  bookingsThisMonth: number;
  trainingPlan: string;
  serviceRisk: string;
  status: StudioOperationsStatus;
  nextAction: string;
};

export type StudioOperationsBooking = {
  bookingId: string;
  memberId: string;
  label: string;
  status: string;
  time: string;
  priority: StudioOperationsPriority;
  nextAction: string;
};

export type StudioOperationsTrainerSchedule = {
  trainerId: string;
  label: string;
  status: string;
  sessionsToday: number;
  priority: StudioOperationsPriority;
  nextAction: string;
};

export type StudioOperationsSupportRequest = {
  requestId: string;
  label: string;
  priority: StudioOperationsPriority;
  status: string;
  nextAction: string;
};

export type StudioOperationsWorkbenchReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: StudioOperationsAccessLevel;
    canViewMemberRows: boolean;
    canViewPaymentExceptions: boolean;
    canStageOperationalDraft: boolean;
  };
  studio: {
    studioId: string;
    label: string;
    studioStatus: string;
    generatedAt: string | null;
    syncStatus: string;
    connectionHealth: string;
  } | null;
  summary: {
    membersActive: number;
    trialMembers: number;
    pausedMembers: number;
    checkinsToday: number;
    classesToday: number;
    trainersOnShift: number;
    openSupportRequests: number;
    paymentExceptions: number;
    bookingsToday: number;
    waitlistBookings: number;
    lateCancellations: number;
    overbookedTrainers: number;
    highRiskMembers: number;
    commandDrafts: number;
    latestCommandId: string | null;
  };
  nextAction: {
    label: string;
    status: StudioOperationsStatus;
    priority: StudioOperationsPriority;
    copy: string;
    actionKey: string | null;
  };
  actions: StudioOperationsAction[];
  memberExceptions: StudioOperationsMemberException[];
  bookings: StudioOperationsBooking[];
  trainerSchedules: StudioOperationsTrainerSchedule[];
  supportRequests: StudioOperationsSupportRequest[];
  history: StudioOperationsCommandHistoryItem[];
  sourceHealth: {
    status: "ready" | "not_configured" | "not_found" | "forbidden" | "core_unavailable";
    records: number;
    conflicts: number;
    families: string[];
    integrationConnection: string | null;
    syncJobs: number;
  };
  boundaries: {
    memberAppApiWritesEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    toolApplyEnabled: false;
    paymentInitiationEnabled: false;
    financeWritesEnabled: false;
    externalSendingEnabled: false;
    uploadsEnabled: false;
    liveAiEnabled: false;
    productionDeployEnabled: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "not_found" | "forbidden" | "core_unavailable";
  secretsReturned: false;
  privateKeysReturned: false;
};

type SourceMapRow = {
  crays_entity_type: string;
  crays_entity_id: string;
  external_entity_type: string;
  external_entity_id: string;
  sync_status: string;
  last_synced_at: Date | null;
  metadata: Record<string, unknown> | null;
};

type ConnectionRow = {
  connection_id: string;
  connection_health: string;
  status: string;
  metadata: Record<string, unknown> | null;
  updated_at: Date | null;
};

type CommandHistoryRow = {
  command_id: string;
  actor_role: string;
  command_status: string;
  validation_status: string;
  dry_run_status: string;
  target_apply_status: "blocked" | "not_configured";
  apply_gate: string;
  input_payload: Record<string, unknown> | null;
  created_at: Date;
};

const internalRoles: RoleKey[] = ["studio-manager", "franchise-partner", "finance", "deal-manager", "hr", "reviewer", "crays-management", "admin"];
const commandRoles: RoleKey[] = ["studio-manager", "franchise-partner", "finance", "crays-management", "admin"];

function accessForRole(role: RoleKey): StudioOperationsWorkbenchReadModel["access"] {
  if (role === "vendor") {
    return {
      role,
      allowed: true,
      level: "external_service_shell",
      canViewMemberRows: false,
      canViewPaymentExceptions: false,
      canStageOperationalDraft: false,
    };
  }

  if (!internalRoles.includes(role)) {
    return {
      role,
      allowed: false,
      level: "forbidden",
      canViewMemberRows: false,
      canViewPaymentExceptions: false,
      canStageOperationalDraft: false,
    };
  }

  const oversight = role === "admin" || role === "crays-management" || role === "reviewer";
  return {
    role,
    allowed: true,
    level: oversight ? "oversight" : "studio_operations",
    canViewMemberRows: role !== "deal-manager",
    canViewPaymentExceptions: ["studio-manager", "franchise-partner", "finance", "crays-management", "admin", "reviewer"].includes(role),
    canStageOperationalDraft: commandRoles.includes(role),
  };
}

function boundaries(): StudioOperationsWorkbenchReadModel["boundaries"] {
  return {
    memberAppApiWritesEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    paymentInitiationEnabled: false,
    financeWritesEnabled: false,
    externalSendingEnabled: false,
    uploadsEnabled: false,
    liveAiEnabled: false,
    productionDeployEnabled: false,
  };
}

function sourceHealthStatus(queryStatus: StudioOperationsWorkbenchReadModel["queryStatus"]): StudioOperationsWorkbenchReadModel["sourceHealth"]["status"] {
  return queryStatus === "schema_ready" ? "ready" : queryStatus;
}

function emptyReadModel(role: RoleKey, queryStatus: StudioOperationsWorkbenchReadModel["queryStatus"]): StudioOperationsWorkbenchReadModel {
  return {
    access: accessForRole(role),
    studio: null,
    summary: {
      membersActive: 0,
      trialMembers: 0,
      pausedMembers: 0,
      checkinsToday: 0,
      classesToday: 0,
      trainersOnShift: 0,
      openSupportRequests: 0,
      paymentExceptions: 0,
      bookingsToday: 0,
      waitlistBookings: 0,
      lateCancellations: 0,
      overbookedTrainers: 0,
      highRiskMembers: 0,
      commandDrafts: 0,
      latestCommandId: null,
    },
    nextAction: {
      label: "Open studio operations",
      status: "blocked",
      priority: "normal",
      copy: queryStatus === "not_configured" ? "Core database is not configured." : "No studio operations source records are available yet.",
      actionKey: null,
    },
    actions: [],
    memberExceptions: [],
    bookings: [],
    trainerSchedules: [],
    supportRequests: [],
    history: [],
    sourceHealth: {
      status: sourceHealthStatus(queryStatus),
      records: 0,
      conflicts: 0,
      families: [],
      integrationConnection: null,
      syncJobs: 0,
    },
    boundaries: boundaries(),
    queryStatus,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function fields(row: SourceMapRow) {
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const value = metadata.fields;
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function label(row: SourceMapRow, fallback: string) {
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return typeof metadata.label === "string" && metadata.label.trim() ? metadata.label.trim() : fallback;
}

function text(value: unknown, fallback = "not recorded") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function words(value: string) {
  return value.replaceAll("_", " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function statusFromRisk(value: string): StudioOperationsStatus {
  if (["high", "failed_payment", "past_due", "missing", "review_required", "overbooked", "cancelled_late"].includes(value)) return "blocked";
  if (["medium", "waitlist", "expires_soon", "review", "open_capacity", "trial", "paused"].includes(value)) return "attention";
  return "ready";
}

function priorityFromStatus(status: StudioOperationsStatus): StudioOperationsPriority {
  if (status === "blocked") return "critical";
  if (status === "attention") return "high";
  return "normal";
}

function memberException(row: SourceMapRow): StudioOperationsMemberException | null {
  const field = fields(row);
  const membershipStatus = text(field.membershipStatus, "unknown");
  const paymentStatus = text(field.paymentStatus, "unknown");
  const paymentMethodStatus = text(field.paymentMethodStatus, "unknown");
  const serviceRisk = text(field.serviceRisk, "low");
  const status = [paymentStatus, paymentMethodStatus, serviceRisk, membershipStatus].map(statusFromRisk).find((item) => item === "blocked") ?? statusFromRisk(serviceRisk);
  if (status === "ready") return null;
  const isPayment = paymentStatus === "failed_payment" || paymentStatus === "past_due" || paymentMethodStatus === "review_required" || paymentMethodStatus === "missing";
  return {
    memberId: row.crays_entity_id,
    label: label(row, row.crays_entity_id),
    membershipStatus,
    paymentStatus,
    paymentMethodStatus,
    bookingsThisMonth: numberValue(field.bookingsThisMonth),
    trainingPlan: text(field.trainingPlan, "not assigned"),
    serviceRisk,
    status,
    nextAction: isPayment ? "Start payment recovery review" : "Review member service risk",
  };
}

function booking(row: SourceMapRow): StudioOperationsBooking {
  const field = fields(row);
  const bookingStatus = text(field.bookingStatus, "unknown");
  const status = statusFromRisk(bookingStatus);
  return {
    bookingId: row.crays_entity_id,
    memberId: text(field.memberId, "member"),
    label: text(field.classLabel, label(row, row.crays_entity_id)),
    status: bookingStatus,
    time: text(field.bookingTime, "not scheduled"),
    priority: priorityFromStatus(status),
    nextAction: bookingStatus === "cancelled_late" ? "Review late cancellation" : bookingStatus === "waitlist" ? "Review capacity" : "Keep booking confirmed",
  };
}

function trainerSchedule(row: SourceMapRow): StudioOperationsTrainerSchedule {
  const field = fields(row);
  const trainerStatus = text(field.trainerStatus, "unknown");
  const status = statusFromRisk(trainerStatus);
  return {
    trainerId: row.crays_entity_id,
    label: text(field.trainerLabel, label(row, row.crays_entity_id)),
    status: trainerStatus,
    sessionsToday: numberValue(field.sessionsToday),
    priority: priorityFromStatus(status),
    nextAction: trainerStatus === "overbooked" ? "Rebalance trainer schedule" : trainerStatus === "open_capacity" ? "Fill open trainer capacity" : "Keep trainer load stable",
  };
}

function supportRequest(row: SourceMapRow): StudioOperationsSupportRequest {
  const field = fields(row);
  const priority = text(field.priority, "normal") as StudioOperationsPriority;
  return {
    requestId: row.crays_entity_id,
    label: text(field.topic, label(row, row.crays_entity_id)),
    priority: priority === "critical" || priority === "high" || priority === "normal" ? priority : "normal",
    status: text(field.supportStatus, "open"),
    nextAction: priority === "high" ? "Escalate support request" : "Work support queue",
  };
}

function actionFromMember(item: StudioOperationsMemberException): StudioOperationsAction {
  const isPayment = item.paymentStatus === "failed_payment" || item.paymentStatus === "past_due" || item.paymentMethodStatus === "review_required" || item.paymentMethodStatus === "missing";
  const status = item.status;
  return {
    key: `member:${item.memberId}`,
    label: isPayment ? `Payment recovery - ${item.label}` : `Member care review - ${item.label}`,
    commandType: "member_recovery",
    entityId: item.memberId,
    ownerRole: isPayment ? "Finance" : "Studio Manager",
    priority: priorityFromStatus(status),
    status,
    current: `${words(item.membershipStatus)} member, payment ${words(item.paymentStatus)}, service risk ${words(item.serviceRisk)}.`,
    nextAction: item.nextAction,
  };
}

function actionFromBooking(item: StudioOperationsBooking): StudioOperationsAction {
  const status = item.status === "confirmed" ? "ready" : statusFromRisk(item.status);
  return {
    key: `booking:${item.bookingId}`,
    label: `Booking follow-up - ${item.label}`,
    commandType: "booking_follow_up",
    entityId: item.bookingId,
    ownerRole: "Studio Manager",
    priority: priorityFromStatus(status),
    status,
    current: `${item.label} is ${words(item.status)} at ${item.time}.`,
    nextAction: item.nextAction,
  };
}

function actionFromTrainer(item: StudioOperationsTrainerSchedule): StudioOperationsAction {
  const status = statusFromRisk(item.status);
  return {
    key: `trainer:${item.trainerId}`,
    label: `Trainer capacity - ${item.label}`,
    commandType: "trainer_capacity_review",
    entityId: item.trainerId,
    ownerRole: "Studio Manager",
    priority: priorityFromStatus(status),
    status,
    current: `${item.label} has ${item.sessionsToday} sessions today and status ${words(item.status)}.`,
    nextAction: item.nextAction,
  };
}

function actionFromSupport(item: StudioOperationsSupportRequest): StudioOperationsAction {
  const status: StudioOperationsStatus = item.priority === "critical" || item.priority === "high" ? "blocked" : "attention";
  return {
    key: `support:${item.requestId}`,
    label: `Support escalation - ${item.label}`,
    commandType: "support_escalation",
    entityId: item.requestId,
    ownerRole: "Support",
    priority: item.priority,
    status,
    current: `${item.label} is ${words(item.status)} with ${item.priority} priority.`,
    nextAction: item.nextAction,
  };
}

function orderActions(actions: StudioOperationsAction[]) {
  const rank: Record<StudioOperationsStatus, number> = { blocked: 0, attention: 1, ready: 2 };
  const priorityRank: Record<StudioOperationsPriority, number> = { critical: 0, high: 1, normal: 2 };
  return [...actions].sort((left, right) => rank[left.status] - rank[right.status] || priorityRank[left.priority] - priorityRank[right.priority] || left.label.localeCompare(right.label));
}

function historyFromRows(rows: CommandHistoryRow[]): StudioOperationsCommandHistoryItem[] {
  return rows.map((row) => ({
    commandId: row.command_id,
    label: text(row.input_payload?.title, row.command_id),
    actorRole: row.actor_role,
    commandStatus: row.command_status,
    targetApplyStatus: row.target_apply_status,
    applyGate: row.apply_gate,
    preflight: row.validation_status === "valid" ? "validated; action waits for operations apply approval" : row.validation_status,
    createdAt: row.created_at.toISOString(),
  }));
}

function nextAction(actions: StudioOperationsAction[], history: StudioOperationsCommandHistoryItem[]): StudioOperationsWorkbenchReadModel["nextAction"] {
  const first = actions[0] ?? null;
  if (!first) {
    return {
      label: history.length ? "Review staged operations actions" : "Studio operations are stable",
      status: "ready",
      priority: "normal",
      copy: history.length ? "Recent action drafts are stored and visible after refresh." : "No blocking member, booking, trainer or support exception is visible.",
      actionKey: null,
    };
  }
  return {
    label: first.label,
    status: first.status,
    priority: first.priority,
    copy: first.nextAction,
    actionKey: first.key,
  };
}

export async function getStudioOperationsWorkbenchReadModel(role: RoleKey): Promise<StudioOperationsWorkbenchReadModel> {
  const access = accessForRole(role);
  if (!access.allowed) {
    return { ...emptyReadModel(role, "forbidden"), access };
  }

  if (access.level === "external_service_shell") {
    return {
      ...emptyReadModel(role, "schema_ready"),
      access,
      nextAction: {
        label: "Service work scope required",
        status: "blocked",
        priority: "normal",
        copy: "Vendor service work is only visible after a scoped maintenance assignment.",
        actionKey: null,
      },
    };
  }

  if (!getCoreDatabaseRuntimeState().configured) {
    return { ...emptyReadModel(role, "not_configured"), access };
  }

  try {
    const [sourceResult, connectionResult, syncResult, historyResult] = await Promise.all([
      getCorePgPool().query<SourceMapRow>(
        `
          select crays_entity_type, crays_entity_id, external_entity_type, external_entity_id,
                 sync_status, last_synced_at, metadata
          from crays_core.external_record_maps
          where external_system = 'member-app'
          order by external_entity_type, external_entity_id
        `,
      ),
      getCorePgPool().query<ConnectionRow>(
        `
          select connection_id, connection_health, status, metadata, updated_at
          from crays_core.integration_connections
          where connection_id = 'core_source_member_app'
          limit 1
        `,
      ),
      getCorePgPool().query<{ jobs: string }>(
        `
          select count(*)::text as jobs
          from crays_core.sync_jobs
          where connection_id = 'core_source_member_app'
        `,
      ),
      getCorePgPool().query<CommandHistoryRow>(
        `
          select command_id, actor_role, command_status, validation_status, dry_run_status,
                 target_apply_status, apply_gate, input_payload, created_at
          from crays_core.core_command_requests
          where module_key = 'operations'
            and command_key = 'operations.studio_action.stage'
          order by created_at desc
          limit 10
        `,
      ),
    ]);

    const rows = sourceResult.rows;
    if (!rows.length) {
      return { ...emptyReadModel(role, "not_found"), access };
    }

    const studioRow = rows.find((row) => row.external_entity_type === "studio") ?? null;
    const studioFields = studioRow ? fields(studioRow) : {};
    const members = rows.filter((row) => row.external_entity_type === "member_profile");
    const memberExceptions = access.canViewMemberRows ? members.map(memberException).filter((item): item is StudioOperationsMemberException => Boolean(item)) : [];
    const bookings = rows.filter((row) => row.external_entity_type === "course_booking").map(booking);
    const trainerSchedules = rows.filter((row) => row.external_entity_type === "trainer_schedule").map(trainerSchedule);
    const supportRequests = rows.filter((row) => row.external_entity_type === "support_request").map(supportRequest);
    const history = historyFromRows(historyResult.rows);
    const actions = orderActions([
      ...memberExceptions.map(actionFromMember),
      ...bookings.filter((item) => item.status !== "confirmed").map(actionFromBooking),
      ...trainerSchedules.filter((item) => item.status !== "booked").map(actionFromTrainer),
      ...supportRequests.map(actionFromSupport),
    ]);
    const paymentExceptions = memberExceptions.filter((item) => item.paymentStatus === "failed_payment" || item.paymentStatus === "past_due" || item.paymentMethodStatus !== "verified").length;
    const activeMembersFromRows = members.filter((row) => text(fields(row).membershipStatus) === "active").length;

    return {
      access,
      studio: studioRow
        ? {
            studioId: studioRow.crays_entity_id,
            label: label(studioRow, studioRow.crays_entity_id),
            studioStatus: text(studioFields.studioStatus, "open"),
            generatedAt: text(studioRow.metadata?.generatedAt, studioRow.last_synced_at?.toISOString() ?? ""),
            syncStatus: studioRow.sync_status,
            connectionHealth: connectionResult.rows[0]?.connection_health ?? "unknown",
          }
        : null,
      summary: {
        membersActive: numberValue(studioFields.membersActive, activeMembersFromRows),
        trialMembers: members.filter((row) => text(fields(row).membershipStatus) === "trial").length,
        pausedMembers: members.filter((row) => text(fields(row).membershipStatus) === "paused").length,
        checkinsToday: numberValue(studioFields.checkinsToday),
        classesToday: numberValue(studioFields.classesToday, bookings.length),
        trainersOnShift: numberValue(studioFields.trainersOnShift, trainerSchedules.length),
        openSupportRequests: numberValue(studioFields.openSupportRequests, supportRequests.length),
        paymentExceptions: access.canViewPaymentExceptions ? paymentExceptions : 0,
        bookingsToday: bookings.filter((item) => item.time.includes("today")).length,
        waitlistBookings: bookings.filter((item) => item.status === "waitlist").length,
        lateCancellations: bookings.filter((item) => item.status === "cancelled_late").length,
        overbookedTrainers: trainerSchedules.filter((item) => item.status === "overbooked").length,
        highRiskMembers: memberExceptions.filter((item) => item.serviceRisk === "high").length,
        commandDrafts: history.length,
        latestCommandId: history[0]?.commandId ?? null,
      },
      nextAction: nextAction(actions, history),
      actions,
      memberExceptions,
      bookings,
      trainerSchedules,
      supportRequests,
      history,
      sourceHealth: {
        status: "ready",
        records: rows.length,
        conflicts: rows.filter((row) => row.sync_status === "conflict").length,
        families: Array.from(new Set(rows.map((row) => row.external_entity_type))).sort(),
        integrationConnection: connectionResult.rows[0]?.connection_id ?? null,
        syncJobs: numberValue(syncResult.rows[0]?.jobs),
      },
      boundaries: boundaries(),
      queryStatus: "schema_ready",
      secretsReturned: false,
      privateKeysReturned: false,
    };
  } catch {
    return { ...emptyReadModel(role, "core_unavailable"), access };
  }
}
