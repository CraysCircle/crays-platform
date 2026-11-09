import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const connectionString = process.env.CRAYS_DATABASE_URL;

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
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

const connectionId = "core_source_member_app";
const generatedAt = new Date().toISOString();

function digest(value, length = 20) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, length);
}

function json(value) {
  return JSON.stringify(value);
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
      fields,
      sourceDigest: digest({ sourceType, sourceId, status, fields }, 32),
    },
  };
}

const records = [
  mapRecord({
    type: "studio",
    id: "studio_berlin_mitte",
    sourceType: "studio",
    sourceId: "member_app_studio_berlin_mitte",
    status: "synced",
    label: "Berlin Mitte Studio",
    fields: {
      studioStatus: "open",
      membersActive: 1248,
      checkinsToday: 312,
      classesToday: 18,
      trainersOnShift: 7,
      openSupportRequests: 6,
    },
  }),
  ...[
    ["member_0001", "Anna Becker", "active", "paid", "verified", 12, "strength plan", "low"],
    ["member_0002", "Marco Schmidt", "active", "failed_payment", "review_required", 3, "rehab plan", "high"],
    ["member_0003", "Priya Nair", "paused", "paid", "verified", 0, "mobility plan", "medium"],
    ["member_0004", "Elias Weber", "active", "paid", "verified", 8, "hypertrophy plan", "low"],
    ["member_0005", "Julia Santos", "active", "past_due", "expires_soon", 2, "starter plan", "high"],
    ["member_0006", "Noah Fischer", "trial", "not_due", "missing", 1, "intro plan", "medium"],
  ].map(([id, memberName, membershipStatus, paymentStatus, paymentMethodStatus, bookingsThisMonth, trainingPlan, serviceRisk]) =>
    mapRecord({
      type: "member",
      id: `member_app_${id}`,
      sourceType: "member_profile",
      sourceId: `member_app_profile_${id}`,
      status: paymentStatus === "failed_payment" || paymentStatus === "past_due" ? "conflict" : "synced",
      label: memberName,
      fields: {
        studioId: "studio_berlin_mitte",
        memberName,
        membershipStatus,
        paymentStatus,
        paymentMethodStatus,
        bookingsThisMonth: Number(bookingsThisMonth),
        trainingPlan,
        serviceRisk,
        consentStatus: "active",
      },
    }),
  ),
  ...[
    ["booking_001", "member_0001", "Berlin Mitte Strength Foundations", "confirmed", "today 17:30"],
    ["booking_002", "member_0002", "Marco Schmidt PT rehabilitation session", "confirmed", "today 18:00"],
    ["booking_003", "member_0004", "Elias Weber Functional Circuit waitlist", "waitlist", "tomorrow 07:30"],
    ["booking_004", "member_0005", "Julia Santos mobility class late cancellation", "cancelled_late", "yesterday 19:00"],
  ].map(([id, memberId, classLabel, bookingStatus, bookingTime]) =>
    mapRecord({
      type: "training",
      id: `member_app_${id}`,
      sourceType: "course_booking",
      sourceId: `member_app_${id}`,
      status: bookingStatus === "cancelled_late" ? "conflict" : "synced",
      label: classLabel,
      fields: {
        studioId: "studio_berlin_mitte",
        memberId: `member_app_${memberId}`,
        classLabel,
        bookingStatus,
        bookingTime,
      },
    }),
  ),
  ...[
    ["trainer_001", "Clara Hoffmann", "booked", 7],
    ["trainer_002", "Daniel Krause", "open_capacity", 4],
    ["trainer_003", "Mira Lang", "overbooked", 11],
  ].map(([id, trainerLabel, trainerStatus, sessionsToday]) =>
    mapRecord({
      type: "employee",
      id: `member_app_${id}`,
      sourceType: "trainer_schedule",
      sourceId: `member_app_${id}`,
      status: trainerStatus === "overbooked" ? "conflict" : "synced",
      label: trainerLabel,
      fields: {
        studioId: "studio_berlin_mitte",
        trainerLabel,
        trainerStatus,
        sessionsToday: Number(sessionsToday),
      },
    }),
  ),
  ...[
    ["support_001", "Marco Schmidt failed payment follow-up", "high", "open"],
    ["support_002", "Julia Santos late cancellation refund review", "medium", "review"],
    ["support_003", "Priya Nair training plan update request", "low", "open"],
  ].map(([id, topic, priority, supportStatus]) =>
    mapRecord({
      type: "support-ticket",
      id: `member_app_${id}`,
      sourceType: "support_request",
      sourceId: `member_app_${id}`,
      status: priority === "high" ? "conflict" : "synced",
      label: topic,
      fields: {
        studioId: "studio_berlin_mitte",
        topic,
        priority,
        supportStatus,
      },
    }),
  ),
];

async function ensureSourceMapScope(client) {
  await client.query(`
    alter table crays_core.external_record_maps
      drop constraint if exists external_record_maps_crays_type_check,
      add constraint external_record_maps_crays_type_check
      check (crays_entity_type in ('prepared-offer', 'deal', 'property', 'property-case', 'location-analysis', 'evidence-package', 'financial-model', 'bank-package', 'loan-case', 'document', 'conversation', 'message', 'candidate-intent', 'organization', 'account', 'studio', 'member', 'employee', 'training', 'support-ticket'))
  `);
}

async function persist(client) {
  await ensureSourceMapScope(client);
  await client.query(
    `
      insert into crays_core.integration_connections (
        connection_id, module_key, system_key, connection_name, owner_role, status,
        connection_mode, secret_reference_status, connection_health, metadata, updated_at
      )
      values ($1, 'operations', 'member-app-engine', 'Member App operational source read model', 'admin', 'active',
        'sync_read_model', 'not_required', 'healthy', $2::jsonb, now())
      on conflict (connection_id) do update set
        status = excluded.status,
        connection_health = excluded.connection_health,
        metadata = excluded.metadata,
        updated_at = now()
    `,
    [
      connectionId,
      json({
        generatedAt,
        recordFamilies: ["studio", "member profiles", "course bookings", "trainer schedules", "support requests"],
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
      values ($1, $2, 'read_sync', 'read', 'succeeded', 1, 'studio', 'studio_berlin_mitte', $3::jsonb, now(), now(), now(), now())
      on conflict (job_id) do update set
        status = excluded.status,
        attempt_count = crays_core.sync_jobs.attempt_count + 1,
        payload_summary = excluded.payload_summary,
        finished_at = now(),
        updated_at = now()
    `,
    [
      `sync_job_${digest(["member-app", generatedAt, records.length], 28)}`,
      connectionId,
      json({ generatedAt, recordsSeen: records.length, sourceWritesEnabled: false }),
    ],
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
      [
        record.mapId,
        record.craysEntityType,
        record.craysEntityId,
        record.externalSystem,
        record.externalEntityType,
        record.externalEntityId,
        record.status,
        json(record.metadata),
      ],
    );
  }
}

async function main() {
  console.log(JSON.stringify({ target: getRedactedDatabaseTarget(connectionString), apply, records: records.length }, null, 2));
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          status: "dry_run",
          families: [...new Set(records.map((record) => record.externalEntityType))],
          conflictRecords: records.filter((record) => record.status === "conflict").length,
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
