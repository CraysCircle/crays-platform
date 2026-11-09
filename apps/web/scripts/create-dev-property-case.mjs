import pg from "pg";
import { loadLocalEnv } from "./env-loader.mjs";

const { Pool } = pg;

loadLocalEnv();

const confirmation = "CREATE_PROPERTY_CASE";
const writeEnabled = process.env.CRAYS_ENABLE_DEV_DOMAIN_WRITES === "true";
const confirmed = process.env.CONFIRM_CRAYS_DEV_DOMAIN_WRITE === confirmation;
const connectionString = process.env.CRAYS_DATABASE_URL;

const ids = {
  propertyId: "property_dev_workday1_block11",
  caseId: "property_case_dev_workday1_block11",
  eventId: "event_dev_workday1_block11_property_case",
};

const metadata = {
  source: "core_pilot_fixture",
  idempotencyKey: "workday1-block11-property-case",
  purpose: "location_pilot_readiness_verification",
  testDataQuality: "golden_realistic",
};

if (!writeEnabled || !confirmed) {
  console.error(
    JSON.stringify(
      {
        status: "blocked",
        writeEnabled,
        confirmed,
        required: {
          CRAYS_ENABLE_DEV_DOMAIN_WRITES: "true",
          CONFIRM_CRAYS_DEV_DOMAIN_WRITE: confirmation,
        },
        liveBusinessRecordReturned: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required before creating a dev property case.");
  process.exit(1);
}

function shouldUseSsl() {
  if (process.env.CRAYS_DATABASE_SSL === "disable") return false;
  if (process.env.CRAYS_DATABASE_SSL === "require") return true;

  try {
    const host = new URL(connectionString).hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return true;
  }
}

const pool = new Pool({
  connectionString,
  ssl: shouldUseSsl() ? { rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : false,
  max: 1,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

async function countRows(client, tableName) {
  const result = await client.query(`select count(*)::int as row_count from crays_core.${tableName}`);
  return Number(result.rows[0]?.row_count ?? 0);
}

try {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const propertyResult = await client.query(
      `
        insert into crays_core.properties (
          property_id, title, address_summary, city, country, property_type, intake_source, status, metadata
        )
        values ($1, 'Invalidenstrasse 118 Studio Lease', 'Invalidenstrasse 118, 10115 Berlin, Germany', 'Berlin', 'Germany', 'commercial', 'internal_review', 'submitted', $2::jsonb)
        on conflict (property_id) do nothing
      `,
      [ids.propertyId, JSON.stringify(metadata)],
    );

    const caseResult = await client.query(
      `
        insert into crays_core.property_cases (
          case_id, property_id, owner_role, status, current_phase, handoff_required, handoff_status, review_summary, metadata
        )
        values ($1, $2, 'expansion-manager', 'intake', 'owner_intake', true, 'not_ready', $3::jsonb, $4::jsonb)
        on conflict (case_id) do nothing
      `,
      [
        ids.caseId,
        ids.propertyId,
        JSON.stringify({
          reviewState: "location_review_created",
          owner: "Expansion Manager",
          handoff: "not_ready",
          property: "Invalidenstrasse 118 Studio Lease",
        }),
        JSON.stringify(metadata),
      ],
    );

    const eventResult = await client.query(
      `
        insert into crays_core.workflow_events (
          event_id, event_type, related_entity_type, related_entity_id, role_key, visibility_roles, event_status, payload
        )
        values ($1, 'property_case.review_created', 'property-case', $2, 'expansion-manager', $3::jsonb, 'recorded', $4::jsonb)
        on conflict (event_id) do nothing
      `,
      [
        ids.eventId,
        ids.caseId,
        JSON.stringify(["expansion-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify(metadata),
      ],
    );

    const rowCounts = {
      properties: await countRows(client, "properties"),
      propertyCases: await countRows(client, "property_cases"),
      workflowEvents: await countRows(client, "workflow_events"),
    };

    await client.query("commit");

    const created = propertyResult.rowCount + caseResult.rowCount + eventResult.rowCount;

    console.log(
      JSON.stringify(
        {
          status: created > 0 ? "created" : "already_exists",
          entityType: "property-case",
          ids,
          insertedRows: {
            properties: propertyResult.rowCount,
            propertyCases: caseResult.rowCount,
            workflowEvents: eventResult.rowCount,
          },
          rowCounts,
          expectedReadinessChange: "properties and workflow-events should report ready_with_records",
          liveBusinessRecordReturned: false,
          secretsReturned: false,
          privateKeysReturned: false,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  console.error("Dev property case creation failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}
