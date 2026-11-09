import pg from "pg";
import { loadLocalEnv } from "./env-loader.mjs";

const { Pool } = pg;

loadLocalEnv();

const confirmation = "TRANSITION_PROPERTY_CASE_ANALYSIS";
const writeEnabled = process.env.CRAYS_ENABLE_DEV_DOMAIN_WRITES === "true";
const confirmed = process.env.CONFIRM_CRAYS_DEV_DOMAIN_WRITE === confirmation;
const connectionString = process.env.CRAYS_DATABASE_URL;

const caseId = process.env.CRAYS_DEV_PROPERTY_CASE_ID || "property_case_dev_workday1_block11";
const eventId = `event_${caseId}_start_analysis`;
const targetStatus = "analysis";
const targetPhase = "property_analysis";

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
        fileUploadEnabled: false,
        providerCallsEnabled: false,
        externalSendingEnabled: false,
        publicReleaseEnabled: false,
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
  console.error("CRAYS_DATABASE_URL is required before transitioning a dev property case.");
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

try {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const currentResult = await client.query(
      `
        select case_id, property_id, status, current_phase, owner_role
        from crays_core.property_cases
        where case_id = $1
        for update
      `,
      [caseId],
    );
    const current = currentResult.rows[0];

    if (!current) {
      throw new Error("Dev property case was not found.");
    }

    if (current.owner_role !== "expansion-manager") {
      throw new Error("Only Expansion-owned property cases can enter analysis through this dev workflow.");
    }

    const alreadyTransitioned = current.status === targetStatus && current.current_phase === targetPhase;
    const propertyCaseResult = alreadyTransitioned
      ? { rowCount: 0 }
      : await client.query(
          `
            update crays_core.property_cases
            set status = $2,
                current_phase = $3,
                review_summary = review_summary || $4::jsonb,
                updated_at = now()
            where case_id = $1
          `,
          [
            caseId,
            targetStatus,
            targetPhase,
            JSON.stringify({
              analysisStarted: true,
              startedByRole: "expansion-manager",
              source: "confirmed_dev_workflow",
            }),
          ],
        );

    const propertyResult = alreadyTransitioned
      ? { rowCount: 0 }
      : await client.query(
          `
            update crays_core.properties
            set status = 'screening',
                metadata = metadata || $2::jsonb,
                updated_at = now()
            where property_id = $1
          `,
          [
            current.property_id,
            JSON.stringify({
              propertyCaseStatus: targetStatus,
              analysisStartedByRole: "expansion-manager",
            }),
          ],
        );

    const eventResult = await client.query(
      `
        insert into crays_core.workflow_events (
          event_id, event_type, related_entity_type, related_entity_id, role_key, visibility_roles, event_status, payload
        )
        values ($1, 'property_case.analysis_started', 'property-case', $2, 'expansion-manager', $3::jsonb, 'recorded', $4::jsonb)
        on conflict (event_id) do nothing
      `,
      [
        eventId,
        caseId,
        JSON.stringify(["expansion-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({
          transition: "start_analysis",
          fromStatus: current.status,
          toStatus: targetStatus,
          fromPhase: current.current_phase,
          toPhase: targetPhase,
        }),
      ],
    );

    await client.query("commit");

    console.log(
      JSON.stringify(
        {
          status: alreadyTransitioned ? "already_transitioned" : "transitioned",
          caseId,
          eventId,
          fromStatus: current.status,
          toStatus: targetStatus,
          fromPhase: current.current_phase,
          toPhase: targetPhase,
          updatedRows: {
            propertyCases: propertyCaseResult.rowCount,
            properties: propertyResult.rowCount,
            workflowEvents: eventResult.rowCount,
          },
          liveBusinessRecordReturned: true,
          fileUploadEnabled: false,
          providerCallsEnabled: false,
          externalSendingEnabled: false,
          publicReleaseEnabled: false,
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
  console.error("Dev property-case transition failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}
