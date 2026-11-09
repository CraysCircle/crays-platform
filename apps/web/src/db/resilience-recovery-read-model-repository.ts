import { getAdapterBidirectionalPolicyReadModel } from "./adapter-bidirectional-policy-read-model-repository";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import { getManagementGateReviewReadModel } from "./management-gate-review-read-model-repository";
import { getProcessSuiteReadModel } from "./process-suite-read-model-repository";
import { getStakeholderRoomControlReadModel } from "./stakeholder-room-control-read-model-repository";
import { getSyncPerformanceReadModel } from "./sync-performance-read-model-repository";
import type { RoleKey } from "@/lib/roles";

type RecoveryAccessLevel = "resilience_recovery" | "forbidden";
type RecoveryState = "ready" | "attention" | "blocked";

type CommandSafetyRow = {
  total: string;
  unique_keys: string;
  idempotency_collisions: string;
  rollback_available: string;
  apply_blocked: string;
  modules: string;
  validation_ready: string;
  dry_run_ready: string;
  command_events: string;
  previews: string;
  gate_reviews: string;
};

export type ResilienceRecoveryEvidence = {
  label: string;
  value: string | number;
  source: string;
  status: RecoveryState;
};

export type ResilienceRecoveryLane = {
  laneKey: string;
  label: string;
  ownerRole: string;
  state: RecoveryState;
  current: string;
  recoveryPolicy: string;
  nextAction: string;
  evidence: ResilienceRecoveryEvidence[];
};

export type ResilienceRecoveryReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: RecoveryAccessLevel;
    reason: string;
  };
  summary: {
    lanes: number;
    ready: number;
    attention: number;
    blocked: number;
    commandDrafts: number;
    applyBlockedCommands: number;
    rollbackAvailable: number;
    idempotencyCollisions: number;
    commandEvents: number;
    sourceMaps: number;
    missingSourceRecords: number;
    sourceConflicts: number;
    blockedRooms: number;
    redactions: number;
    openSideEffectGates: number;
  };
  lanes: ResilienceRecoveryLane[];
  exposureReview: Array<{
    surface: string;
    audience: string;
    visible: string;
    hidden: string;
    state: RecoveryState;
    nextAction: string;
  }>;
  processBackbone: Array<{
    suite: string;
    state: string;
    sourceRecords: number;
    blockedStages: number;
    nextAction: string;
  }>;
  boundaries: {
    targetApplyEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    destructiveApplyEnabled: false;
    uploadsEnabled: false;
    privatePreviewEnabled: false;
    externalSendingEnabled: false;
    publicReleaseEnabled: false;
    paymentInitiationEnabled: false;
    bankActionsEnabled: false;
    financePostingEnabled: false;
    liveAiEnabled: false;
    productionDeployEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const allowedRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];

function numberFrom(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function accessForRole(role: RoleKey): ResilienceRecoveryReadModel["access"] {
  if (allowedRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "resilience_recovery",
      reason: "Role can inspect cross-module recovery posture, redaction state, idempotency, rollback and closed side-effect boundaries.",
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Resilience and recovery review requires Admin, Reviewer or CRAYS Management access.",
  };
}

function boundaries(): ResilienceRecoveryReadModel["boundaries"] {
  return {
    targetApplyEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    destructiveApplyEnabled: false,
    uploadsEnabled: false,
    privatePreviewEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    paymentInitiationEnabled: false,
    bankActionsEnabled: false,
    financePostingEnabled: false,
    liveAiEnabled: false,
    productionDeployEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function stateFor(condition: { blocked?: boolean; attention?: boolean }): RecoveryState {
  if (condition.blocked) return "blocked";
  if (condition.attention) return "attention";
  return "ready";
}

async function commandSafetyStats() {
  const result = await getCorePgPool().query<CommandSafetyRow>(`
    select
      count(*)::text as total,
      count(distinct command_key || ':' || idempotency_key)::text as unique_keys,
      (count(*) - count(distinct command_key || ':' || idempotency_key))::text as idempotency_collisions,
      count(*) filter (where rollback_summary <> '{}'::jsonb)::text as rollback_available,
      count(*) filter (where target_apply_status = 'blocked' or command_status = 'apply_blocked')::text as apply_blocked,
      count(distinct module_key)::text as modules,
      count(*) filter (where validation_status in ('valid', 'needs_review'))::text as validation_ready,
      count(*) filter (where dry_run_status in ('ready', 'not_required'))::text as dry_run_ready,
      (select count(*)::text from crays_core.core_command_events) as command_events,
      (select count(*)::text from crays_core.core_command_previews) as previews,
      (select count(*)::text from crays_core.core_command_apply_gate_reviews) as gate_reviews
    from crays_core.core_command_requests
  `);

  return result.rows[0] ?? {
    total: "0",
    unique_keys: "0",
    idempotency_collisions: "0",
    rollback_available: "0",
    apply_blocked: "0",
    modules: "0",
    validation_ready: "0",
    dry_run_ready: "0",
    command_events: "0",
    previews: "0",
    gate_reviews: "0",
  };
}

function lane(input: ResilienceRecoveryLane): ResilienceRecoveryLane {
  return input;
}

function emptyReadModel(role: RoleKey, queryStatus: ResilienceRecoveryReadModel["queryStatus"]): ResilienceRecoveryReadModel {
  return {
    access: accessForRole(role),
    summary: {
      lanes: 0,
      ready: 0,
      attention: 0,
      blocked: 0,
      commandDrafts: 0,
      applyBlockedCommands: 0,
      rollbackAvailable: 0,
      idempotencyCollisions: 0,
      commandEvents: 0,
      sourceMaps: 0,
      missingSourceRecords: 0,
      sourceConflicts: 0,
      blockedRooms: 0,
      redactions: 0,
      openSideEffectGates: 0,
    },
    lanes: [],
    exposureReview: [],
    processBackbone: [],
    boundaries: boundaries(),
    queryStatus,
  };
}

export async function getResilienceRecoveryReadModel(role: RoleKey): Promise<ResilienceRecoveryReadModel> {
  const access = accessForRole(role);
  if (!access.allowed) return emptyReadModel(role, "forbidden");

  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured) return emptyReadModel(role, "not_configured");

  const [commandStats, commandQueue, rooms, sync, adapterPolicy, processSuites] = await Promise.all([
    commandSafetyStats(),
    getManagementGateReviewReadModel("reviewer"),
    getStakeholderRoomControlReadModel({ role: "reviewer" }),
    getSyncPerformanceReadModel("admin"),
    getAdapterBidirectionalPolicyReadModel("admin"),
    getProcessSuiteReadModel("crays-management"),
  ]);

  const commandDrafts = numberFrom(commandStats.total);
  const rollbackAvailable = numberFrom(commandStats.rollback_available);
  const applyBlocked = numberFrom(commandStats.apply_blocked);
  const idempotencyCollisions = numberFrom(commandStats.idempotency_collisions);
  const sourceConflicts = sync.summary.conflicts;
  const missingSourceRecords = sync.summary.missingRecords;
  const blockedRooms = rooms.summary.blockedRooms;
  const redactions = rooms.summary.redactions;

  const lanes = [
    lane({
      laneKey: "command-recovery",
      label: "Command recovery and rollback",
      ownerRole: "Reviewer",
      state: stateFor({ attention: commandDrafts > 0 }),
      current: `${commandDrafts} command drafts across ${commandStats.modules} modules; ${applyBlocked} remain apply-blocked.`,
      recoveryPolicy: "Every command can be superseded or cancelled before any future apply path is opened.",
      nextAction: "Review the queue by owner, object, preflight and rollback before any approval discussion.",
      evidence: [
        { label: "Command drafts", value: commandDrafts, source: "Core Command Queue", status: commandDrafts > 0 ? "attention" : "ready" },
        { label: "Apply blocked", value: applyBlocked, source: "Core Command Queue", status: "ready" },
        { label: "Rollback available", value: rollbackAvailable, source: "Core Command Queue", status: rollbackAvailable === commandDrafts ? "ready" : "attention" },
        { label: "Command events", value: numberFrom(commandStats.command_events), source: "Core Audit", status: "ready" },
      ],
    }),
    lane({
      laneKey: "idempotency-safety",
      label: "Idempotency and retry safety",
      ownerRole: "Admin",
      state: stateFor({ blocked: idempotencyCollisions > 0 }),
      current:
        idempotencyCollisions > 0
          ? `${idempotencyCollisions} idempotency collision${idempotencyCollisions === 1 ? "" : "s"} need review.`
          : `${commandStats.unique_keys} unique command idempotency keys protect ${commandDrafts} command drafts.`,
      recoveryPolicy: "Retries must resolve to the same command key and idempotency key; duplicate collisions must block review.",
      nextAction: idempotencyCollisions > 0 ? "Stop review and resolve the duplicate command key." : "Keep idempotent retry policy active for all staged commands.",
      evidence: [
        { label: "Unique keys", value: numberFrom(commandStats.unique_keys), source: "Core Command Persistence", status: "ready" },
        { label: "Collisions", value: idempotencyCollisions, source: "Core Command Persistence", status: idempotencyCollisions > 0 ? "blocked" : "ready" },
        { label: "Previews", value: numberFrom(commandStats.previews), source: "Core Command Previews", status: "ready" },
        { label: "Gate reviews", value: numberFrom(commandStats.gate_reviews), source: "Core Gate Reviews", status: "ready" },
      ],
    }),
    lane({
      laneKey: "source-freshness-recovery",
      label: "Source freshness and conflict recovery",
      ownerRole: "Admin",
      state: stateFor({ blocked: missingSourceRecords > 0, attention: sourceConflicts > 0 }),
      current: `${sync.summary.sourceMaps} source maps, ${missingSourceRecords} missing records and ${sourceConflicts} conflict${sourceConflicts === 1 ? "" : "s"}.`,
      recoveryPolicy: "Missing records block process readiness; conflicts stay visible until classified and resolved.",
      nextAction:
        missingSourceRecords > 0
          ? "Add missing realistic source records or review source filters."
          : sourceConflicts > 0
            ? "Classify Member App source-map conflicts before any sync-apply workflow is considered."
            : "Use current Core projection for the next role decision.",
      evidence: [
        { label: "Source maps", value: sync.summary.sourceMaps, source: "Sync Performance", status: "ready" },
        { label: "Missing records", value: missingSourceRecords, source: "Sync Performance", status: missingSourceRecords > 0 ? "blocked" : "ready" },
        { label: "Conflicts", value: sourceConflicts, source: "Sync Performance", status: sourceConflicts > 0 ? "attention" : "ready" },
        { label: "High-confidence modules", value: sync.summary.highConfidenceModules, source: "Sync Performance", status: "ready" },
      ],
    }),
    lane({
      laneKey: "stakeholder-redaction-recovery",
      label: "Stakeholder redaction and exposure recovery",
      ownerRole: "Reviewer",
      state: stateFor({ blocked: blockedRooms > 0 }),
      current: `${rooms.summary.rooms} stakeholder rooms, ${blockedRooms} blocked room${blockedRooms === 1 ? "" : "s"} and ${redactions} redaction rule${redactions === 1 ? "" : "s"}.`,
      recoveryPolicy: "External stakeholders see only approved metadata; internal notes, private source mapping and unapproved records stay hidden.",
      nextAction: blockedRooms > 0 ? "Resolve room redactions and excluded-record reviews before any release gate is discussed." : "Keep room preflight ready for reviewer sign-off.",
      evidence: [
        { label: "Rooms", value: rooms.summary.rooms, source: "Stakeholder Room Preflight", status: "ready" },
        { label: "Blocked rooms", value: blockedRooms, source: "Stakeholder Room Preflight", status: blockedRooms > 0 ? "blocked" : "ready" },
        { label: "Redactions", value: redactions, source: "Stakeholder Room Preflight", status: redactions > 0 ? "attention" : "ready" },
        { label: "Approved documents", value: `${rooms.summary.approvedDocuments}/${rooms.summary.documents}`, source: "Files Metadata", status: "attention" },
      ],
    }),
    lane({
      laneKey: "side-effect-boundary",
      label: "Closed side-effect boundary",
      ownerRole: "Admin",
      state: "ready",
      current: "All high-risk side-effect controls remain closed in the verified local prototype.",
      recoveryPolicy: "No release, send, upload, payment, bank action, source write, sync apply, target apply, live AI or deployment can be launched from this surface.",
      nextAction: "Keep closed controls visible in recovery review and require exact user approval for any future gated action.",
      evidence: [
        { label: "Target apply", value: adapterPolicy.boundaries.targetApplyEnabled ? "Open" : "Closed", source: "Adapter Policy", status: "ready" },
        { label: "Source writes", value: adapterPolicy.boundaries.sourceWritesEnabled ? "Open" : "Closed", source: "Adapter Policy", status: "ready" },
        { label: "Sync apply", value: adapterPolicy.boundaries.syncApplyEnabled ? "Open" : "Closed", source: "Adapter Policy", status: "ready" },
        { label: "External sending", value: adapterPolicy.boundaries.externalSendingEnabled ? "Open" : "Closed", source: "Adapter Policy", status: "ready" },
      ],
    }),
  ];

  const exposureReview = rooms.rooms.map((room) => {
    const state: RecoveryState = room.status === "blocked" ? "blocked" : room.status === "attention" ? "attention" : "ready";

    return {
      surface: room.label,
      audience: room.audienceProfile.partyName,
      visible: room.includedRecords.slice(0, 3).join("; "),
      hidden: room.excludedRecords.slice(0, 3).join("; "),
      state,
      nextAction: room.nextAction,
    };
  });

  const processBackbone = processSuites.suites.map((suite) => ({
    suite: suite.label,
    state: suite.state,
    sourceRecords: suite.sourceRecords,
    blockedStages: suite.blockedStages,
    nextAction: suite.nextAction,
  }));

  return {
    access,
    summary: {
      lanes: lanes.length,
      ready: lanes.filter((item) => item.state === "ready").length,
      attention: lanes.filter((item) => item.state === "attention").length,
      blocked: lanes.filter((item) => item.state === "blocked").length,
      commandDrafts,
      applyBlockedCommands: commandQueue.summary.applyBlocked,
      rollbackAvailable,
      idempotencyCollisions,
      commandEvents: numberFrom(commandStats.command_events),
      sourceMaps: sync.summary.sourceMaps,
      missingSourceRecords,
      sourceConflicts,
      blockedRooms,
      redactions,
      openSideEffectGates: 0,
    },
    lanes,
    exposureReview,
    processBackbone,
    boundaries: boundaries(),
    queryStatus: "schema_ready",
  };
}
