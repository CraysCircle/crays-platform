import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_STUDIO_OPERATIONS_RECOVERY === "APPLY_STUDIO_OPERATIONS_RECOVERY_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-studio-operations-recovery-20260712-v1";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_STUDIO_OPERATIONS_RECOVERY=APPLY_STUDIO_OPERATIONS_RECOVERY_SOURCE_SLICE to apply Studio Operations Recovery source records.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  max: Number.parseInt(process.env.CRAYS_DATABASE_POOL_MAX ?? "5", 10),
  ssl:
    process.env.CRAYS_DATABASE_SSL === "require"
      ? { rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined,
  options: "-c crays.app_role=core_service",
});

function digest(value, length = 24) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, length);
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

const baseFields = {
  moduleKey: "operations",
  seedBatch,
  sourceAsOf: "2026-07-12",
  studioId: "studio_berlin_mitte",
  studioName: "Berlin Mitte Studio",
  memberAppApiWritesEnabled: false,
  sourceWritesEnabled: false,
  syncApplyEnabled: false,
  targetApplyEnabled: false,
  paymentInitiationEnabled: false,
  financePostingEnabled: false,
  externalSendingEnabled: false,
  uploadsEnabled: false,
  liveAiEnabled: false,
};

function craysEntityTypeForFamily(family) {
  if (family === "class-capacity-impacts") return "training";
  if (family === "trainer-follow-ups") return "employee";
  if (family === "support-handoffs") return "support-ticket";
  if (family === "finance-handoffs") return "financial-model";
  return "member";
}

function record(family, externalId, label, fields, options = {}) {
  return {
    family,
    externalId,
    label,
    craysEntityType: options.craysEntityType ?? craysEntityTypeForFamily(family),
    craysEntityId: options.craysEntityId ?? `studio_operations_${slug(externalId)}`,
    owner: options.owner ?? fields.ownerRole ?? "Studio Manager",
    status: options.status ?? fields.workflowStatus ?? fields.status ?? "review",
    priority: options.priority ?? fields.priority ?? "medium",
    syncStatus: options.syncStatus ?? (["critical", "high"].includes(fields.priority) ? "conflict" : "synced"),
    dueDate: options.dueDate ?? fields.dueDate ?? "2026-07-13",
    fields: { ...baseFields, ...fields },
  };
}

const recoveryTasks = [
  record("studio-recovery-tasks", "task_felix_hartmann_access_recovery", "Felix Hartmann access recovery", {
    memberId: "member_app_member_1002",
    memberName: "Felix Hartmann",
    linkedFinanceRecordId: "payment-recovery-cases:recovery_felix_hartmann_2026_07",
    linkedMemberRecordId: "member_app_profile_member_1002",
    workflowStatus: "contact_ready",
    priority: "critical",
    impactArea: "member access",
    ownerRole: "Studio Manager",
    dueTime: "2026-07-13T09:00:00+02:00",
    currentState: "Active member with failed July payment and rehab return plan; access should not be changed before member-safe review.",
    nextAction: "Confirm contact preference, review access entitlement and stage recovery action for Finance handoff.",
    commandType: "member_recovery",
    entityId: "member_app_member_1002",
  }),
  record("studio-recovery-tasks", "task_jonas_krueger_student_recovery", "Jonas Krueger student recovery", {
    memberId: "member_app_member_1010",
    memberName: "Jonas Krueger",
    linkedFinanceRecordId: "payment-recovery-cases:recovery_jonas_krueger_2026_07",
    linkedMemberRecordId: "member_app_profile_member_1010",
    workflowStatus: "support_owner_needed",
    priority: "high",
    impactArea: "support recovery",
    ownerRole: "Support",
    dueTime: "2026-07-13T13:00:00+02:00",
    currentState: "Student plan payment failed and support owner is not assigned yet.",
    nextAction: "Assign Support owner and keep member access under daily review until Finance classifies recovery.",
    commandType: "member_recovery",
    entityId: "member_app_member_1010",
  }),
  record("studio-recovery-tasks", "task_camila_ferreira_refund_capacity", "Camila Ferreira refund and capacity review", {
    memberId: "member_app_member_1005",
    memberName: "Camila Ferreira",
    linkedFinanceRecordId: "refund-review-cases:refund_camila_ferreira_late_cancel",
    linkedMemberRecordId: "member_app_booking_member_1005_1",
    workflowStatus: "refund_context_needed",
    priority: "high",
    impactArea: "class capacity",
    ownerRole: "Studio Manager",
    dueTime: "2026-07-13T15:00:00+02:00",
    currentState: "Late cancellation and past-due payment affect both refund review and class capacity planning.",
    nextAction: "Resolve late-cancellation policy and update class capacity before Finance reviews refund.",
    commandType: "booking_follow_up",
    entityId: "member_booking_member_1005_1",
  }),
  record("studio-recovery-tasks", "task_ben_adler_payment_method", "Ben Adler payment method update", {
    memberId: "member_app_member_1024",
    memberName: "Ben Adler",
    linkedFinanceRecordId: "payment-recovery-cases:recovery_ben_adler_2026_07",
    linkedMemberRecordId: "member_app_payment_method_member_1024",
    workflowStatus: "member_update_needed",
    priority: "high",
    impactArea: "payment method",
    ownerRole: "Studio Manager",
    dueTime: "2026-07-14T10:00:00+02:00",
    currentState: "Past-due July invoice needs payment method update before the next billing cycle.",
    nextAction: "Prepare in-app payment method update task; no external message is sent from this workflow.",
    commandType: "member_recovery",
    entityId: "member_app_member_1024",
  }),
  record("studio-recovery-tasks", "task_alina_richter_chargeback_evidence", "Alina Richter chargeback evidence review", {
    memberId: "member_app_member_1017",
    memberName: "Alina Richter",
    linkedFinanceRecordId: "refund-review-cases:refund_alina_richter_chargeback",
    linkedMemberRecordId: "member_app_payment_member_1017_2026_07",
    workflowStatus: "evidence_required",
    priority: "critical",
    impactArea: "chargeback evidence",
    ownerRole: "Reviewer",
    dueTime: "2026-07-13T11:00:00+02:00",
    currentState: "Chargeback review needs member timeline and service evidence before any Finance follow-up.",
    nextAction: "Collect support timeline and access history for reviewer classification.",
    commandType: "support_escalation",
    entityId: "member_app_support_1017",
  }),
  record("studio-recovery-tasks", "task_amira_saleh_pause_resume", "Amira Saleh pause resume review", {
    memberId: "member_app_member_1003",
    memberName: "Amira Saleh",
    linkedFinanceRecordId: "cancellation-settlements:settlement_amira_saleh_pause",
    linkedMemberRecordId: "member_app_cancel_1003_pause",
    workflowStatus: "pause_review",
    priority: "medium",
    impactArea: "access entitlement",
    ownerRole: "Studio Manager",
    dueTime: "2026-07-15T12:00:00+02:00",
    currentState: "Medical pause needs end-date confirmation before billing and access entitlement resume.",
    nextAction: "Confirm pause end date and training plan restart with member care owner.",
    commandType: "training_plan_update",
    entityId: "member_training_plan_member_1003",
  }, { syncStatus: "synced" }),
];

const accessChecks = [
  record("access-impact-checks", "access_felix_hartmann", "Felix Hartmann access entitlement check", {
    memberId: "member_app_member_1002",
    memberName: "Felix Hartmann",
    workflowStatus: "manual_review",
    priority: "critical",
    impactArea: "front desk access",
    ownerRole: "Studio Manager",
    currentState: "Failed payment, active rehab plan and recent check-ins require manual access review.",
    nextAction: "Keep access review in the operations queue and avoid automated access changes.",
    commandType: "member_recovery",
    entityId: "member_app_member_1002",
    dueTime: "2026-07-13T09:15:00+02:00",
  }),
  record("access-impact-checks", "access_tobias_meier_cancelled", "Tobias Meier cancelled-member access check", {
    memberId: "member_app_member_1012",
    memberName: "Tobias Meier",
    linkedFinanceRecordId: "cancellation-settlements:settlement_tobias_meier_cancelled_contract",
    workflowStatus: "access_block_confirmed",
    priority: "medium",
    impactArea: "front desk access",
    ownerRole: "Studio Manager",
    currentState: "Cancelled contract must stay outside active access and billing cohorts.",
    nextAction: "Confirm no active bookings remain before day close.",
    commandType: "member_recovery",
    entityId: "member_app_member_1012",
    dueTime: "2026-07-13T18:00:00+02:00",
  }, { syncStatus: "synced" }),
  record("access-impact-checks", "access_katharina_wolf_pause", "Katharina Wolf family leave access review", {
    memberId: "member_app_member_1015",
    memberName: "Katharina Wolf",
    linkedFinanceRecordId: "cancellation-settlements:settlement_katharina_wolf_pause",
    workflowStatus: "pause_review",
    priority: "medium",
    impactArea: "access entitlement",
    ownerRole: "Studio Manager",
    currentState: "Family leave pause should keep billing and access entitlement aligned.",
    nextAction: "Confirm pause end date before the next billing cycle.",
    commandType: "training_plan_update",
    entityId: "member_training_plan_member_1015",
    dueTime: "2026-07-15T09:30:00+02:00",
  }, { syncStatus: "synced" }),
  record("access-impact-checks", "access_alina_richter_chargeback", "Alina Richter chargeback access review", {
    memberId: "member_app_member_1017",
    memberName: "Alina Richter",
    linkedFinanceRecordId: "payment-recovery-cases:recovery_alina_richter_2026_07",
    workflowStatus: "evidence_required",
    priority: "critical",
    impactArea: "front desk access",
    ownerRole: "Reviewer",
    currentState: "Chargeback review is open; access changes need reviewer classification.",
    nextAction: "Review member timeline before any access or finance status change.",
    commandType: "support_escalation",
    entityId: "member_app_support_1017",
    dueTime: "2026-07-13T11:30:00+02:00",
  }),
];

const classCapacityImpacts = [
  record("class-capacity-impacts", "capacity_camila_mobility_flow", "Mobility Flow late-cancellation capacity", {
    memberId: "member_app_member_1005",
    memberName: "Camila Ferreira",
    bookingId: "member_booking_member_1005_1",
    workflowStatus: "capacity_review",
    priority: "high",
    impactArea: "class waitlist",
    ownerRole: "Studio Manager",
    currentState: "Late cancellation affects refund review and one waitlist seat.",
    nextAction: "Review class seat release and refund context together.",
    commandType: "booking_follow_up",
    entityId: "member_booking_member_1005_1",
    dueTime: "2026-07-13T16:00:00+02:00",
  }),
  record("class-capacity-impacts", "capacity_strength_foundations_evening", "Strength Foundations evening capacity", {
    memberId: "member_app_member_1001",
    memberName: "Laura Neumann",
    bookingId: "member_booking_member_1001_0",
    workflowStatus: "stable",
    priority: "medium",
    impactArea: "class capacity",
    ownerRole: "Studio Manager",
    currentState: "Confirmed high-demand class with waitlist pressure below threshold.",
    nextAction: "Keep class confirmed and monitor check-in flow.",
    commandType: "booking_follow_up",
    entityId: "member_booking_member_1001_0",
    dueTime: "2026-07-13T17:00:00+02:00",
  }, { syncStatus: "synced" }),
  record("class-capacity-impacts", "capacity_mobility_flow_waitlist", "Mobility Flow morning waitlist", {
    memberId: "member_app_member_1011",
    memberName: "Fatima El Amrani",
    bookingId: "member_booking_member_1011_1",
    workflowStatus: "waitlist_review",
    priority: "medium",
    impactArea: "class waitlist",
    ownerRole: "Studio Manager",
    currentState: "Morning class has a small waitlist and one member support case nearby.",
    nextAction: "Keep waitlist visible in operations until trainer load is confirmed.",
    commandType: "booking_follow_up",
    entityId: "member_booking_member_1011_1",
    dueTime: "2026-07-14T07:00:00+02:00",
  }, { syncStatus: "synced" }),
  record("class-capacity-impacts", "capacity_julia_santos_legacy_support", "Support recovery class-credit check", {
    memberId: "member_app_member_legacy_0006",
    memberName: "Julia Santos",
    bookingId: "member_app_booking_legacy_0006",
    workflowStatus: "policy_review",
    priority: "medium",
    impactArea: "class credit",
    ownerRole: "Support",
    currentState: "Legacy support record contains late cancellation refund review from the Member App bridge.",
    nextAction: "Match class-credit policy with refund review before member follow-up.",
    commandType: "booking_follow_up",
    entityId: "member_app_booking_legacy_0006",
    dueTime: "2026-07-14T12:00:00+02:00",
  }, { syncStatus: "synced" }),
];

const supportHandoffs = [
  record("support-handoffs", "support_felix_payment_call", "Felix Hartmann recovery support call", {
    memberId: "member_app_member_1002",
    memberName: "Felix Hartmann",
    supportTicketId: "member_app_support_1002",
    workflowStatus: "open",
    priority: "critical",
    impactArea: "support queue",
    ownerRole: "Support",
    currentState: "Failed payment support call is open and must be coordinated with access review.",
    nextAction: "Stage support handoff so Finance and Studio Manager see the same recovery state.",
    commandType: "support_escalation",
    entityId: "member_app_support_1002",
    dueTime: "2026-07-13T10:00:00+02:00",
  }),
  record("support-handoffs", "support_ben_payment_method", "Ben Adler payment method support handoff", {
    memberId: "member_app_member_1024",
    memberName: "Ben Adler",
    supportTicketId: "member_app_support_1024",
    workflowStatus: "open",
    priority: "high",
    impactArea: "support queue",
    ownerRole: "Support",
    currentState: "Member requested payment method update and needs in-app task follow-up.",
    nextAction: "Stage support owner handoff; external sending remains closed.",
    commandType: "support_escalation",
    entityId: "member_app_support_1024",
    dueTime: "2026-07-14T10:30:00+02:00",
  }),
  record("support-handoffs", "support_alina_chargeback", "Alina Richter chargeback support timeline", {
    memberId: "member_app_member_1017",
    memberName: "Alina Richter",
    supportTicketId: "member_app_support_1017",
    workflowStatus: "review",
    priority: "critical",
    impactArea: "chargeback evidence",
    ownerRole: "Reviewer",
    currentState: "Support timeline and access evidence are needed for chargeback classification.",
    nextAction: "Collect support timeline before Finance posts any review decision.",
    commandType: "support_escalation",
    entityId: "member_app_support_1017",
    dueTime: "2026-07-13T11:45:00+02:00",
  }),
  record("support-handoffs", "support_amira_training_resume", "Amira Saleh training resume support handoff", {
    memberId: "member_app_member_1003",
    memberName: "Amira Saleh",
    supportTicketId: "member_app_support_1003",
    workflowStatus: "open",
    priority: "medium",
    impactArea: "training plan",
    ownerRole: "Support",
    currentState: "Member pause includes training plan restart after medical leave.",
    nextAction: "Coordinate restart plan with Studio Manager before access and billing resume.",
    commandType: "training_plan_update",
    entityId: "member_training_plan_member_1003",
    dueTime: "2026-07-15T12:30:00+02:00",
  }, { syncStatus: "synced" }),
  record("support-handoffs", "support_katharina_pause_end", "Katharina Wolf pause end-date support handoff", {
    memberId: "member_app_member_1015",
    memberName: "Katharina Wolf",
    supportTicketId: "member_app_support_1015",
    workflowStatus: "open",
    priority: "medium",
    impactArea: "member care",
    ownerRole: "Support",
    currentState: "Family leave pause needs a confirmed end date before billing resume.",
    nextAction: "Confirm pause end date and hand off to Studio Manager.",
    commandType: "training_plan_update",
    entityId: "member_training_plan_member_1015",
    dueTime: "2026-07-15T13:00:00+02:00",
  }, { syncStatus: "synced" }),
];

const trainerFollowUps = [
  record("trainer-follow-ups", "trainer_clara_rehab_load", "Clara Hoffmann rehab capacity review", {
    trainerId: "trainer_clara_hoffmann",
    trainerName: "Clara Hoffmann",
    workflowStatus: "capacity_review",
    priority: "high",
    impactArea: "trainer capacity",
    ownerRole: "Studio Manager",
    currentState: "Rehab-return members Felix Hartmann and Alina Richter need supervised plan review while evening capacity is tight.",
    nextAction: "Rebalance rehab plan slots and stage trainer capacity review.",
    commandType: "trainer_capacity_review",
    entityId: "trainer_clara_hoffmann",
    dueTime: "2026-07-13T14:00:00+02:00",
  }),
  record("trainer-follow-ups", "trainer_daniel_mobility_load", "Daniel Krause mobility capacity review", {
    trainerId: "trainer_daniel_krause",
    trainerName: "Daniel Krause",
    workflowStatus: "stable",
    priority: "medium",
    impactArea: "trainer capacity",
    ownerRole: "Studio Manager",
    currentState: "Morning mobility block has enough capacity if Camila Ferreira late-cancellation seat is released.",
    nextAction: "Confirm morning load after class-capacity review.",
    commandType: "trainer_capacity_review",
    entityId: "trainer_daniel_krause",
    dueTime: "2026-07-14T07:15:00+02:00",
  }, { syncStatus: "synced" }),
  record("trainer-follow-ups", "trainer_mira_trial_conversion", "Mira Lang trial conversion capacity", {
    trainerId: "trainer_mira_lang",
    trainerName: "Mira Lang",
    workflowStatus: "open_capacity",
    priority: "medium",
    impactArea: "trial conversion",
    ownerRole: "Studio Manager",
    currentState: "Trial members Simon Berger and Ibrahim Yilmaz can be moved into intro sessions without affecting peak capacity.",
    nextAction: "Use open trainer capacity for trial conversion follow-up.",
    commandType: "trainer_capacity_review",
    entityId: "trainer_mira_lang",
    dueTime: "2026-07-14T16:00:00+02:00",
  }, { syncStatus: "synced" }),
];

const financeHandoffs = [
  record("finance-handoffs", "finance_failed_payment_daily_review", "Daily failed-payment finance handoff", {
    memberId: "member_app_member_1002",
    memberName: "Felix Hartmann",
    workflowStatus: "finance_review_ready",
    priority: "critical",
    impactArea: "finance handoff",
    ownerRole: "Finance",
    currentState: "Five recovery cases are visible in Finance; Studio Manager needs access and support context added before review.",
    nextAction: "Stage operations note for Finance without initiating payment or posting.",
    commandType: "member_recovery",
    entityId: "member_app_member_1002",
    dueTime: "2026-07-13T12:00:00+02:00",
  }),
  record("finance-handoffs", "finance_refund_policy_review", "Refund policy finance handoff", {
    memberId: "member_app_member_1005",
    memberName: "Camila Ferreira",
    workflowStatus: "refund_policy_review",
    priority: "high",
    impactArea: "finance handoff",
    ownerRole: "Finance",
    currentState: "Late-cancellation refund decision depends on class capacity and goodwill policy.",
    nextAction: "Attach capacity and support facts to the Finance review queue.",
    commandType: "booking_follow_up",
    entityId: "member_booking_member_1005_1",
    dueTime: "2026-07-13T16:30:00+02:00",
  }),
];

const records = [...recoveryTasks, ...accessChecks, ...classCapacityImpacts, ...supportHandoffs, ...trainerFollowUps, ...financeHandoffs];

function grouped() {
  return records.reduce((acc, item) => {
    acc[item.family] ??= [];
    acc[item.family].push(item);
    return acc;
  }, {});
}

function sectionLabel(family) {
  return family
    .split("-")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapId(item) {
  return `map_${digest({ moduleKey: "operations", sectionKey: item.family, rowId: item.externalId }, 30)}`;
}

function row(item) {
  return {
    id: item.externalId,
    label: item.label,
    status: item.status,
    owner: item.owner,
    modifiedAt: generatedAt,
    role: "studio-manager",
    dueDate: item.dueDate,
    priority: item.priority,
    fields: item.fields,
  };
}

async function persist(client) {
  const connectionId = "core_source_operations_studio_recovery";
  const systemKey = "operations-engine";
  const groupedRecords = grouped();
  const jobId = `sync_job_${digest(["studio-operations-recovery", generatedAt, records.length], 28)}`;

  await client.query(
    `
      insert into crays_core.integration_connections (
        connection_id, module_key, system_key, connection_name, owner_role, status,
        connection_mode, secret_reference_status, connection_health, metadata, updated_at
      )
      values ($1, 'operations', $2, 'Studio operations recovery source slice', 'admin', 'active', 'sync_read_model', 'not_required', 'healthy', $3::jsonb, now())
      on conflict (connection_id) do update set
        status = excluded.status,
        connection_mode = excluded.connection_mode,
        secret_reference_status = excluded.secret_reference_status,
        connection_health = excluded.connection_health,
        metadata = excluded.metadata,
        updated_at = now()
    `,
    [
      connectionId,
      systemKey,
      JSON.stringify({
        ...baseFields,
        generatedAt,
        rowsSeen: records.length,
        families: Object.keys(groupedRecords).sort(),
      }),
    ],
  );

  await client.query(
    `
      insert into crays_core.sync_jobs (
        job_id, connection_id, job_type, direction, status, attempt_count,
        crays_entity_type, crays_entity_id, payload_summary, scheduled_at, started_at, finished_at, updated_at
      )
      values ($1, $2, 'read_sync', 'read', 'succeeded', 1, 'studio', 'studio_berlin_mitte', $3::jsonb, now(), now(), now(), now())
      on conflict (job_id) do update set
        status = excluded.status,
        attempt_count = crays_core.sync_jobs.attempt_count + 1,
        payload_summary = excluded.payload_summary,
        started_at = excluded.started_at,
        finished_at = excluded.finished_at,
        updated_at = now()
    `,
    [
      jobId,
      connectionId,
      JSON.stringify({
        ...baseFields,
        generatedAt,
        rowsSeen: records.length,
        families: Object.keys(groupedRecords).sort(),
      }),
    ],
  );

  let written = 0;
  for (const item of records) {
    const sourceRow = row(item);
    const result = await client.query(
      `
        insert into crays_core.external_record_maps (
          map_id, crays_entity_type, crays_entity_id, external_system, external_entity_type,
          external_entity_id, sync_direction, sync_status, last_synced_at, metadata, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, 'read', $7, now(), $8::jsonb, now())
        on conflict (external_system, external_entity_type, external_entity_id) do update set
          crays_entity_type = excluded.crays_entity_type,
          crays_entity_id = excluded.crays_entity_id,
          sync_status = excluded.sync_status,
          last_synced_at = excluded.last_synced_at,
          metadata = excluded.metadata,
          updated_at = now()
      `,
      [
        mapId(item),
        item.craysEntityType,
        item.craysEntityId,
        systemKey,
        item.family,
        item.externalId,
        item.syncStatus,
        JSON.stringify({
          moduleKey: "operations",
          seedBatch,
          sectionKey: item.family,
          sectionLabel: sectionLabel(item.family),
          syncJobId: jobId,
          snapshotGeneratedAt: generatedAt,
          row: sourceRow,
          sourceDigest: digest(sourceRow, 32),
        }),
      ],
    );
    written += result.rowCount ?? 0;
  }

  return { connectionId, systemKey, rowsSeen: records.length, mapsWritten: written };
}

function dryRunSummary() {
  return {
    status: "dry_run",
    apply,
    seedBatch,
    records: records.length,
    target: getRedactedDatabaseTarget(connectionString),
    families: Object.fromEntries(Object.entries(grouped()).map(([family, items]) => [family, items.length])),
    conflicts: records.filter((item) => item.syncStatus === "conflict").length,
    closedGates: {
      memberAppApiWritesEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      externalSendingEnabled: false,
    },
  };
}

async function main() {
  if (!apply) {
    console.log(JSON.stringify(dryRunSummary(), null, 2));
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await persist(client);
    await client.query("commit");
    console.log(JSON.stringify({ ...dryRunSummary(), status: "applied", seedBatch, ...result }, null, 2));
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (error) => {
  await pool.end().catch(() => {});
  console.error(JSON.stringify({ status: "failed", message: error instanceof Error ? error.message : "Unknown seed failure." }, null, 2));
  process.exit(1);
});
