import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_B2C_MEMBER_DATABASE === "APPLY_B2C_MEMBER_DATABASE_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-b2c-member-database-berlin-mitte-20260712-v1";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_B2C_MEMBER_DATABASE=APPLY_B2C_MEMBER_DATABASE_SOURCE_SLICE to apply B2C Member Database source records.");
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

function json(value) {
  return JSON.stringify(value);
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
  liveAiEnabled: false,
};

const members = [
  ["member_1001", "Laura Neumann", "active", "Plus Monthly", "paid", "verified", "low", 16, 7, "Strength foundation", "2025-09-14"],
  ["member_1002", "Felix Hartmann", "active", "Flex Monthly", "failed_payment", "review_required", "high", 4, 2, "Rehab return", "2026-02-03"],
  ["member_1003", "Amira Saleh", "paused", "Plus Monthly", "paid", "verified", "medium", 0, 0, "Mobility reset", "2025-12-18"],
  ["member_1004", "Moritz Klein", "active", "Annual Paid", "paid", "verified", "low", 12, 6, "Hypertrophy plan", "2025-07-01"],
  ["member_1005", "Camila Ferreira", "active", "Flex Monthly", "past_due", "expires_soon", "high", 5, 2, "Starter plan", "2026-04-09"],
  ["member_1006", "Simon Berger", "trial", "Trial", "not_due", "missing", "medium", 2, 1, "Intro plan", "2026-07-05"],
  ["member_1007", "Miriam Hoffmann", "active", "Plus Monthly", "paid", "verified", "low", 14, 5, "Running strength", "2025-11-22"],
  ["member_1008", "Leon Ayhan", "active", "Flex Monthly", "paid", "verified", "low", 8, 3, "Back care", "2026-01-13"],
  ["member_1009", "Sofia Rossi", "active", "Plus Monthly", "paid", "verified", "medium", 7, 3, "Mobility strength", "2026-03-02"],
  ["member_1010", "Jonas Krueger", "active", "Student Monthly", "failed_payment", "expired", "high", 3, 1, "Beginner strength", "2026-05-17"],
  ["member_1011", "Fatima El Amrani", "active", "Plus Monthly", "paid", "verified", "low", 18, 8, "Performance plan", "2025-10-05"],
  ["member_1012", "Tobias Meier", "cancelled", "Flex Monthly", "refunded", "revoked", "medium", 0, 0, "Closed plan", "2025-08-28"],
  ["member_1013", "Lea Schuster", "active", "Annual Paid", "paid", "verified", "low", 11, 4, "Yoga strength", "2025-06-11"],
  ["member_1014", "Omar Haddad", "active", "Plus Monthly", "paid", "verified", "low", 9, 4, "Functional strength", "2026-02-21"],
  ["member_1015", "Katharina Wolf", "paused", "Flex Monthly", "paid", "verified", "medium", 1, 0, "Postpartum return", "2025-12-02"],
  ["member_1016", "Daniel Novak", "active", "Plus Monthly", "paid", "verified", "low", 10, 5, "Powerlifting basics", "2026-01-29"],
  ["member_1017", "Alina Richter", "active", "Flex Monthly", "chargeback_review", "review_required", "high", 6, 2, "Mobility starter", "2026-04-26"],
  ["member_1018", "Mateo Garcia", "active", "Student Monthly", "paid", "verified", "low", 13, 6, "Athletic conditioning", "2025-09-30"],
  ["member_1019", "Nadine Keller", "active", "Plus Monthly", "paid", "verified", "low", 15, 7, "Strength and posture", "2025-11-08"],
  ["member_1020", "Viktor Petrov", "active", "Flex Monthly", "paid", "verified", "medium", 4, 2, "Shoulder stability", "2026-06-12"],
  ["member_1021", "Hannah Brandt", "active", "Plus Monthly", "paid", "verified", "low", 17, 8, "Endurance strength", "2025-07-20"],
  ["member_1022", "Ibrahim Yilmaz", "trial", "Trial", "not_due", "missing", "medium", 1, 1, "Intro mobility", "2026-07-08"],
  ["member_1023", "Clara Schneider", "active", "Annual Paid", "paid", "verified", "low", 12, 6, "Core stability", "2025-05-16"],
  ["member_1024", "Ben Adler", "active", "Flex Monthly", "past_due", "review_required", "high", 2, 1, "Strength restart", "2026-05-30"],
];

const paymentAmounts = {
  "Plus Monthly": 58.31,
  "Flex Monthly": 48.79,
  "Student Monthly": 39.9,
  "Annual Paid": 529.0,
  Trial: 0,
};

function memberRecord(member) {
  const [id, memberName, membershipStatus, planName, paymentStatus, paymentMethodStatus, serviceRisk, visitsLast30Days, bookingsThisMonth, trainingPlan, joinedAt] = member;
  return {
    memberId: id,
    memberName,
    membershipStatus,
    planName,
    paymentStatus,
    paymentMethodStatus,
    serviceRisk,
    visitsLast30Days: Number(visitsLast30Days),
    bookingsThisMonth: Number(bookingsThisMonth),
    trainingPlan,
    joinedAt,
    monthlyAmount: paymentAmounts[planName],
  };
}

function mapRecord({ type, id, sourceType, sourceId, status, label, fields }) {
  return {
    mapId: `source_map_${digest(["member-app", sourceType, sourceId], 28)}`,
    craysEntityType: type,
    craysEntityId: id,
    externalSystem: "member-app",
    externalEntityType: sourceType,
    externalEntityId: sourceId,
    status,
    metadata: {
      label,
      sourceType,
      generatedAt,
      sourceDigest: digest({ sourceType, sourceId, status, fields }, 32),
      fields: { ...baseFields, ...fields },
    },
  };
}

const memberRecords = members.map(memberRecord);
const activeMembers = memberRecords.filter((member) => member.membershipStatus === "active").length;
const pausedMembers = memberRecords.filter((member) => member.membershipStatus === "paused").length;
const trialMembers = memberRecords.filter((member) => member.membershipStatus === "trial").length;
const failedPaymentMembers = memberRecords.filter((member) => ["failed_payment", "past_due", "chargeback_review"].includes(member.paymentStatus));

const records = [
  mapRecord({
    type: "studio",
    id: "studio_berlin_mitte",
    sourceType: "studio",
    sourceId: "member_app_studio_berlin_mitte",
    status: "synced",
    label: "Berlin Mitte Studio member database",
    fields: {
      studioStatus: "open",
      membersActive: 1248,
      visibleMemberSample: memberRecords.length,
      checkinsToday: 312,
      classesToday: 18,
      trainersOnShift: 7,
      openSupportRequests: 6,
      paymentExceptions: failedPaymentMembers.length,
      nextAction: "Use member database as the source for operations, finance and analytics workflows.",
    },
  }),
  ...memberRecords.map((member) =>
    mapRecord({
      type: "member",
      id: `member_app_${member.memberId}`,
      sourceType: "member_profile",
      sourceId: `member_app_profile_${member.memberId}`,
      status: failedPaymentMembers.some((item) => item.memberId === member.memberId) ? "conflict" : "synced",
      label: member.memberName,
      fields: {
        ...member,
        consentStatus: member.membershipStatus === "cancelled" ? "revoked" : "active",
        nextAction: member.serviceRisk === "high" ? "Review member recovery and payment/support state." : "Keep member in normal operating cohort.",
      },
    }),
  ),
  ...memberRecords.map((member) =>
    mapRecord({
      type: "member",
      id: `member_contract_${member.memberId}`,
      sourceType: "membership_contract",
      sourceId: `member_app_contract_${member.memberId}`,
      status: member.membershipStatus === "cancelled" ? "conflict" : "synced",
      label: `${member.memberName} ${member.planName} contract`,
      fields: {
        memberId: `member_app_${member.memberId}`,
        memberName: member.memberName,
        contractNumber: `BM-${member.memberId.replace("member_", "")}-2026`,
        planName: member.planName,
        membershipStatus: member.membershipStatus,
        startDate: member.joinedAt,
        minimumTermMonths: member.planName === "Annual Paid" ? 12 : 1,
        monthlyAmount: member.monthlyAmount,
        nextBillingDate: member.membershipStatus === "cancelled" ? null : "2026-08-01",
        nextAction: member.membershipStatus === "cancelled" ? "Keep cancelled contract out of active billing." : "Use contract for billing and access entitlement checks.",
      },
    }),
  ),
  ...memberRecords.map((member) =>
    mapRecord({
      type: "member",
      id: `member_payment_method_${member.memberId}`,
      sourceType: "payment_method",
      sourceId: `member_app_payment_method_${member.memberId}`,
      status: ["expired", "missing", "review_required"].includes(member.paymentMethodStatus) ? "conflict" : "synced",
      label: `${member.memberName} payment method`,
      fields: {
        memberId: `member_app_${member.memberId}`,
        memberName: member.memberName,
        paymentMethodStatus: member.paymentMethodStatus,
        methodType: member.planName === "Annual Paid" ? "bank transfer mandate" : "card mandate",
        last4: ["verified", "expires_soon"].includes(member.paymentMethodStatus) ? String(4100 + Number(member.memberId.slice(-2))).slice(-4) : null,
        nextAction: ["expired", "missing", "review_required"].includes(member.paymentMethodStatus) ? "Request payment method update before next billing run." : "Payment method is usable for the next billing cycle.",
      },
    }),
  ),
  ...memberRecords
    .filter((member) => member.planName !== "Trial")
    .flatMap((member) =>
      ["2026-06", "2026-07"].map((period) =>
        mapRecord({
          type: "member",
          id: `member_invoice_${member.memberId}_${period}`,
          sourceType: "invoice",
          sourceId: `member_app_invoice_${member.memberId}_${period}`,
          status: member.paymentStatus === "past_due" && period === "2026-07" ? "conflict" : "synced",
          label: `${member.memberName} ${period} membership invoice`,
          fields: {
            memberId: `member_app_${member.memberId}`,
            memberName: member.memberName,
            period,
            invoiceNumber: `INV-BM-${period.replace("-", "")}-${member.memberId.slice(-4)}`,
            amountNet: Number((member.monthlyAmount / 1.19).toFixed(2)),
            amountGross: member.monthlyAmount,
            taxRate: 0.19,
            invoiceStatus: member.paymentStatus === "past_due" && period === "2026-07" ? "past_due" : member.membershipStatus === "cancelled" ? "credited" : "issued",
            nextAction: "Use invoice in Finance and payment exception workflows.",
          },
        }),
      ),
    ),
  ...memberRecords
    .filter((member) => member.planName !== "Trial")
    .map((member) =>
      mapRecord({
        type: "member",
        id: `member_payment_${member.memberId}_2026_07`,
        sourceType: member.paymentStatus === "failed_payment" || member.paymentStatus === "past_due" ? "failed_payment" : member.paymentStatus === "chargeback_review" ? "chargeback" : "member_payment",
        sourceId: `member_app_payment_${member.memberId}_2026_07`,
        status: ["failed_payment", "past_due", "chargeback_review"].includes(member.paymentStatus) ? "conflict" : "synced",
        label: `${member.memberName} July membership payment`,
        fields: {
          memberId: `member_app_${member.memberId}`,
          memberName: member.memberName,
          period: "2026-07",
          amountGross: member.monthlyAmount,
          paymentStatus: member.paymentStatus,
          paymentAttemptedAt: "2026-07-01T08:15:00+02:00",
          failureReason: member.paymentStatus === "failed_payment" ? "insufficient funds" : member.paymentStatus === "past_due" ? "mandate requires update" : member.paymentStatus === "chargeback_review" ? "member disputed July debit" : null,
          nextAction: ["failed_payment", "past_due", "chargeback_review"].includes(member.paymentStatus) ? "Open payment recovery task and avoid duplicate payment initiation." : "Reconcile as successful membership payment.",
        },
      }),
    ),
  ...[
    ["refund_1005_late_cancel", "member_1005", "Camila Ferreira", 12.5, "late cancellation goodwill", "review"],
    ["refund_1012_cancelled_contract", "member_1012", "Tobias Meier", 48.79, "contract cancellation settlement", "approved"],
    ["refund_1017_disputed_debit", "member_1017", "Alina Richter", 48.79, "chargeback provisional credit", "review"],
  ].map(([id, memberId, memberName, amountGross, reason, refundStatus]) =>
    mapRecord({
      type: "member",
      id: `member_app_${id}`,
      sourceType: "refund_case",
      sourceId: `member_app_${id}`,
      status: refundStatus === "review" ? "conflict" : "synced",
      label: `${memberName} refund case`,
      fields: {
        memberId: `member_app_${memberId}`,
        memberName,
        amountGross: Number(amountGross),
        reason,
        refundStatus,
        nextAction: refundStatus === "review" ? "Review refund evidence before finance posting." : "Keep refund record in member finance history.",
      },
    }),
  ),
  ...[
    ["cancel_1012", "member_1012", "Tobias Meier", "contract cancellation", "processed"],
    ["cancel_1003_pause", "member_1003", "Amira Saleh", "medical pause", "active_pause"],
    ["cancel_1015_pause", "member_1015", "Katharina Wolf", "family leave pause", "active_pause"],
  ].map(([id, memberId, memberName, reason, cancellationStatus]) =>
    mapRecord({
      type: "member",
      id: `member_app_${id}`,
      sourceType: "cancellation",
      sourceId: `member_app_${id}`,
      status: cancellationStatus === "processed" ? "synced" : "conflict",
      label: `${memberName} ${reason}`,
      fields: {
        memberId: `member_app_${memberId}`,
        memberName,
        reason,
        cancellationStatus,
        nextAction: cancellationStatus === "processed" ? "Keep member out of active billing." : "Review pause end date before billing resumes.",
      },
    }),
  ),
  ...memberRecords.slice(0, 18).flatMap((member, index) =>
    [0, 1].map((offset) =>
      mapRecord({
        type: "training",
        id: `member_booking_${member.memberId}_${offset}`,
        sourceType: "course_booking",
        sourceId: `member_app_booking_${member.memberId}_${offset}`,
        status: member.memberId === "member_1005" && offset === 1 ? "conflict" : "synced",
        label: `${member.memberName} ${offset === 0 ? "Strength Foundations" : "Mobility Flow"} booking`,
        fields: {
          memberId: `member_app_${member.memberId}`,
          memberName: member.memberName,
          classLabel: offset === 0 ? "Strength Foundations" : "Mobility Flow",
          bookingStatus: member.memberId === "member_1005" && offset === 1 ? "cancelled_late" : index % 5 === 0 && offset === 1 ? "waitlist" : "confirmed",
          bookingTime: offset === 0 ? "2026-07-13T17:30:00+02:00" : "2026-07-14T07:30:00+02:00",
          nextAction: member.memberId === "member_1005" && offset === 1 ? "Review late cancellation refund eligibility." : "Use booking in capacity and attendance workflows.",
        },
      }),
    ),
  ),
  ...memberRecords.slice(0, 20).map((member, index) =>
    mapRecord({
      type: "training",
      id: `member_checkin_${member.memberId}_2026_07_${String(index + 1).padStart(2, "0")}`,
      sourceType: "check_in",
      sourceId: `member_app_checkin_${member.memberId}_2026_07_${String(index + 1).padStart(2, "0")}`,
      status: member.membershipStatus === "cancelled" ? "conflict" : "synced",
      label: `${member.memberName} check-in`,
      fields: {
        memberId: `member_app_${member.memberId}`,
        memberName: member.memberName,
        checkInAt: `2026-07-${String(1 + (index % 10)).padStart(2, "0")}T${String(7 + (index % 12)).padStart(2, "0")}:15:00+02:00`,
        accessStatus: member.membershipStatus === "cancelled" ? "blocked" : "granted",
        nextAction: member.membershipStatus === "cancelled" ? "Investigate cancelled member access attempt." : "Use check-in for utilization and engagement reporting.",
      },
    }),
  ),
  ...memberRecords.slice(0, 12).map((member) =>
    mapRecord({
      type: "training",
      id: `member_training_plan_${member.memberId}`,
      sourceType: "training_plan",
      sourceId: `member_app_training_plan_${member.memberId}`,
      status: member.serviceRisk === "high" ? "conflict" : "synced",
      label: `${member.memberName} ${member.trainingPlan}`,
      fields: {
        memberId: `member_app_${member.memberId}`,
        memberName: member.memberName,
        trainingPlan: member.trainingPlan,
        planStatus: member.serviceRisk === "high" ? "review_due" : "active",
        coachOwner: member.memberId.endsWith("2") || member.memberId.endsWith("7") ? "Clara Hoffmann" : "Daniel Krause",
        nextAction: member.serviceRisk === "high" ? "Review training plan together with support and payment status." : "Keep plan active in coaching workflow.",
      },
    }),
  ),
  ...[
    ["support_1002", "member_1002", "Felix Hartmann", "Failed payment recovery call", "payment", "high", "open"],
    ["support_1005", "member_1005", "Camila Ferreira", "Late cancellation refund review", "refund", "medium", "review"],
    ["support_1003", "member_1003", "Amira Saleh", "Training plan update after pause", "training", "low", "open"],
    ["support_1010", "member_1010", "Jonas Krueger", "Student plan payment failure", "payment", "high", "open"],
    ["support_1017", "member_1017", "Alina Richter", "Chargeback clarification", "payment", "high", "review"],
    ["support_1024", "member_1024", "Ben Adler", "Payment method update request", "payment", "high", "open"],
    ["support_1020", "member_1020", "Viktor Petrov", "Shoulder plan adjustment", "training", "medium", "open"],
    ["support_1015", "member_1015", "Katharina Wolf", "Pause end date confirmation", "contract", "medium", "open"],
  ].map(([id, memberId, memberName, topic, supportType, priority, supportStatus]) =>
    mapRecord({
      type: "support-ticket",
      id: `member_app_${id}`,
      sourceType: "support_request",
      sourceId: `member_app_${id}`,
      status: priority === "high" ? "conflict" : "synced",
      label: topic,
      fields: {
        memberId: `member_app_${memberId}`,
        memberName,
        topic,
        supportType,
        priority,
        supportStatus,
        nextAction: priority === "high" ? "Escalate to Studio Manager and Finance before next billing run." : "Keep in support queue.",
      },
    }),
  ),
  ...memberRecords.map((member) =>
    mapRecord({
      type: "member",
      id: `member_consent_${member.memberId}`,
      sourceType: "consent_record",
      sourceId: `member_app_consent_${member.memberId}`,
      status: member.membershipStatus === "cancelled" ? "conflict" : "synced",
      label: `${member.memberName} consent record`,
      fields: {
        memberId: `member_app_${member.memberId}`,
        memberName: member.memberName,
        marketingConsent: member.membershipStatus !== "cancelled" && Number(member.memberId.slice(-2)) % 3 !== 0,
        healthDataConsent: member.membershipStatus !== "cancelled",
        paymentReminderConsent: member.membershipStatus !== "cancelled",
        consentStatus: member.membershipStatus === "cancelled" ? "revoked" : "active",
        nextAction: member.membershipStatus === "cancelled" ? "Respect revoked consents in all outbound workflows." : "Use consent in member communication preflight.",
      },
    }),
  ),
];

async function persist(client) {
  await client.query(
    `
      insert into crays_core.integration_connections (
        connection_id, module_key, system_key, connection_name, owner_role, status,
        connection_mode, secret_reference_status, connection_health, metadata, updated_at
      )
      values ($1, 'operations', 'member-database-source', 'B2C Member Database source snapshot', 'admin', 'active',
        'sync_read_model', 'not_required', 'healthy', $2::jsonb, now())
      on conflict (connection_id) do update set
        status = excluded.status,
        connection_health = excluded.connection_health,
        metadata = excluded.metadata,
        updated_at = now()
    `,
    [
      "core_source_b2c_member_database",
      json({
        generatedAt,
        seedBatch,
        records: records.length,
        activeMembers,
        pausedMembers,
        trialMembers,
        paymentExceptions: failedPaymentMembers.length,
        sourceWritesEnabled: false,
      }),
    ],
  );

  await client.query(
    `
      insert into crays_core.sync_jobs (
        job_id, connection_id, job_type, direction, status, attempt_count,
        crays_entity_type, crays_entity_id, payload_summary,
        scheduled_at, started_at, finished_at, updated_at
      )
      values ($1, 'core_source_b2c_member_database', 'read_sync', 'read', 'succeeded', 1, 'studio', 'studio_berlin_mitte', $2::jsonb, now(), now(), now(), now())
      on conflict (job_id) do update set
        status = excluded.status,
        attempt_count = crays_core.sync_jobs.attempt_count + 1,
        payload_summary = excluded.payload_summary,
        finished_at = now(),
        updated_at = now()
    `,
    [`sync_job_${digest(["b2c-member-database", seedBatch, generatedAt, records.length], 28)}`, json({ generatedAt, seedBatch, recordsSeen: records.length, sourceWritesEnabled: false })],
  );

  for (const record of records) {
    await client.query(
      `
        insert into crays_core.external_record_maps (
          map_id, crays_entity_type, crays_entity_id, external_system, external_entity_type, external_entity_id,
          sync_direction, sync_status, last_synced_at, metadata, updated_at
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
      [record.mapId, record.craysEntityType, record.craysEntityId, record.externalSystem, record.externalEntityType, record.externalEntityId, record.status, json(record.metadata)],
    );
  }
}

async function main() {
  console.log(JSON.stringify({ target: getRedactedDatabaseTarget(connectionString), apply, records: records.length, seedBatch }, null, 2));
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          status: "dry_run",
          families: records.reduce((acc, record) => ({ ...acc, [record.externalEntityType]: (acc[record.externalEntityType] ?? 0) + 1 }), {}),
          conflicts: records.filter((record) => record.status === "conflict").length,
          closedGates: {
            memberAppApiWritesEnabled: false,
            sourceWritesEnabled: false,
            syncApplyEnabled: false,
            targetApplyEnabled: false,
            paymentInitiationEnabled: false,
            financePostingEnabled: false,
            externalSendingEnabled: false,
          },
        },
        null,
        2,
      ),
    );
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await persist(client);
    await client.query("commit");
    const counts = await client.query(
      `
        select
          count(*)::int as records,
          count(*) filter (where sync_status = 'conflict')::int as conflicts,
          count(distinct external_entity_type)::int as families
        from crays_core.external_record_maps
        where external_system = 'member-app'
      `,
    );
    console.log(JSON.stringify({ status: "seeded", counts: counts.rows[0] }, null, 2));
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
