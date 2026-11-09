import pg from "pg";
import { loadLocalEnv } from "./env-loader.mjs";

const { Pool } = pg;

loadLocalEnv();

const confirmation = "TRANSITION_PROPERTY_CASE_REVIEW";
const writeEnabled = process.env.CRAYS_ENABLE_DEV_DOMAIN_WRITES === "true";
const confirmed = process.env.CONFIRM_CRAYS_DEV_DOMAIN_WRITE === confirmation;
const connectionString = process.env.CRAYS_DATABASE_URL;

const caseId = process.env.CRAYS_DEV_PROPERTY_CASE_ID || "property_case_dev_workday1_block11";
const eventId = `event_${caseId}_start_review`;
const targetStatus = "review";
const targetPhase = "property_review";

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
  console.error("CRAYS_DATABASE_URL is required before transitioning a dev property case to review.");
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

async function readinessCounts(client) {
  const result = await client.query(
    `
      select
        (
          select count(*)::int
          from crays_core.location_analyses
          where property_case_id = $1
        ) as location_analyses,
        (
          select count(*)::int
          from crays_core.location_analyses
          where property_case_id = $1
            and status in ('review', 'approved', 'released')
        ) as reviewed_location_analyses,
        (
          select count(*)::int
          from crays_core.evidence_packages
          where related_entity_type = 'property-case'
            and related_entity_id = $1
        ) as evidence_packages,
        (
          select count(*)::int
          from crays_core.document_package_links
          where package_type = 'property-case'
            and package_id = $1
            and status = 'approved'
        ) as approved_document_links
    `,
    [caseId],
  );

  return result.rows[0];
}

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
      throw new Error("Only Expansion-owned property cases can enter review through this dev workflow.");
    }

    const readiness = await readinessCounts(client);
    const readinessReady =
      readiness.reviewed_location_analyses > 0 && readiness.evidence_packages > 0 && readiness.approved_document_links > 0;

    if (!readinessReady) {
      throw new Error("Readiness records must exist before a dev property case can enter review.");
    }

    const alreadyTransitioned = current.status === targetStatus && current.current_phase === targetPhase;

    if (!alreadyTransitioned && (current.status !== "analysis" || current.current_phase !== "property_analysis")) {
      throw new Error("Dev property case must be in analysis before review transition.");
    }

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
              analysisReadinessComplete: true,
              reviewStarted: true,
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
            set metadata = metadata || $2::jsonb,
                updated_at = now()
            where property_id = $1
          `,
          [
            current.property_id,
            JSON.stringify({
              propertyCaseStatus: targetStatus,
              reviewStartedByRole: "expansion-manager",
            }),
          ],
        );

    const eventResult = await client.query(
      `
        insert into crays_core.workflow_events (
          event_id, event_type, related_entity_type, related_entity_id, role_key, visibility_roles, event_status, payload
        )
        values ($1, 'property_case.review_started', 'property-case', $2, 'expansion-manager', $3::jsonb, 'recorded', $4::jsonb)
        on conflict (event_id) do nothing
      `,
      [
        eventId,
        caseId,
        JSON.stringify(["expansion-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({
          transition: "start_review",
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
          readiness,
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
  console.error("Dev property-case review transition failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}
