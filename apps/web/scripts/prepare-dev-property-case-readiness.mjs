import pg from "pg";
import { loadLocalEnv } from "./env-loader.mjs";

const { Pool } = pg;

loadLocalEnv();

const confirmation = "PREPARE_PROPERTY_CASE_READINESS";
const writeEnabled = process.env.CRAYS_ENABLE_DEV_DOMAIN_WRITES === "true";
const confirmed = process.env.CONFIRM_CRAYS_DEV_DOMAIN_WRITE === confirmation;
const connectionString = process.env.CRAYS_DATABASE_URL;

const caseId = process.env.CRAYS_DEV_PROPERTY_CASE_ID || "property_case_dev_workday1_block11";
const ids = {
  locationAnalysisId: `location_analysis_${caseId}_readiness`,
  evidencePackageId: `evidence_package_${caseId}_readiness`,
  leaseDocumentLinkId: `document_link_${caseId}_property_lease`,
  constructionDocumentLinkId: `document_link_${caseId}_construction`,
  eventId: `event_${caseId}_readiness_prepared`,
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
  console.error("CRAYS_DATABASE_URL is required before preparing dev property-case readiness.");
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
        ) as document_links,
        (
          select count(*)::int
          from crays_core.document_package_links
          where package_type = 'property-case'
            and package_id = $1
            and status = 'approved'
        ) as approved_document_links,
        (
          select count(*)::int
          from crays_core.workflow_events
          where related_entity_type = 'property-case'
            and related_entity_id = $1
        ) as workflow_events
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
        select case_id, status, current_phase, owner_role
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
      throw new Error("Only Expansion-owned property cases can receive readiness records through this dev workflow.");
    }

    if (!["analysis", "review", "handoff_ready"].includes(current.status)) {
      throw new Error("Property case must be in analysis before readiness records are prepared.");
    }

    const locationResult = await client.query(
      `
        insert into crays_core.location_analyses (
          analysis_id, property_case_id, analysis_type, status, score_snapshot, kpi_snapshot, source_summary
        )
        values ($1, $2, 'location_intelligence', 'review', $3::jsonb, $4::jsonb, $5::jsonb)
        on conflict (analysis_id) do nothing
      `,
      [
        ids.locationAnalysisId,
        caseId,
        JSON.stringify({
          readiness: "review_ready",
          providerCallPerformed: false,
        }),
        JSON.stringify({
          catchment: "internal_review_pending",
          competition: "internal_review_pending",
          transport: "internal_review_pending",
        }),
        JSON.stringify({
          source: "confirmed_dev_readiness_record",
          providerPayloadStored: false,
          providerCallPerformed: false,
        }),
      ],
    );

    const evidenceResult = await client.query(
      `
        insert into crays_core.evidence_packages (
          package_id, related_entity_type, related_entity_id, owner_role, release_state, visibility_roles, summary
        )
        values ($1, 'property-case', $2, 'expansion-manager', 'internal', $3::jsonb, $4::jsonb)
        on conflict (package_id) do nothing
      `,
      [
        ids.evidencePackageId,
        caseId,
        JSON.stringify(["expansion-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({
          readiness: "internal_review_ready",
          candidateReleased: false,
          bankReleased: false,
          ownerReleased: false,
          publicReleased: false,
        }),
      ],
    );

    const leaseDocumentResult = await client.query(
      `
        insert into crays_core.document_package_links (
          link_id, package_type, package_id, document_ref_type, document_ref_id, document_group, visibility_roles, status, required_for, metadata
        )
        values ($1, 'property-case', $2, 'internal_readiness_record', 'property_lease_readiness', 'property-lease', $3::jsonb, 'approved', 'property_case_review', $4::jsonb)
        on conflict (link_id) do nothing
      `,
      [
        ids.leaseDocumentLinkId,
        caseId,
        JSON.stringify(["expansion-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({
          binaryFileStored: false,
          uploadPerformed: false,
          purpose: "lease readiness marker",
        }),
      ],
    );

    const constructionDocumentResult = await client.query(
      `
        insert into crays_core.document_package_links (
          link_id, package_type, package_id, document_ref_type, document_ref_id, document_group, visibility_roles, status, required_for, metadata
        )
        values ($1, 'property-case', $2, 'internal_readiness_record', 'construction_readiness', 'construction', $3::jsonb, 'approved', 'property_case_review', $4::jsonb)
        on conflict (link_id) do nothing
      `,
      [
        ids.constructionDocumentLinkId,
        caseId,
        JSON.stringify(["expansion-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({
          binaryFileStored: false,
          uploadPerformed: false,
          purpose: "construction readiness marker",
        }),
      ],
    );

    const caseUpdateResult = await client.query(
      `
        update crays_core.property_cases
        set review_summary = review_summary || $2::jsonb,
            updated_at = now()
        where case_id = $1
          and not (
            review_summary @> '{"locationEvidenceReady": true}'::jsonb
            and review_summary @> '{"evidencePackageReady": true}'::jsonb
            and review_summary @> '{"documentReadinessReady": true}'::jsonb
          )
      `,
      [
        caseId,
        JSON.stringify({
          locationEvidenceReady: true,
          evidencePackageReady: true,
          documentReadinessReady: true,
          readinessPreparedByRole: "expansion-manager",
        }),
      ],
    );

    const eventResult = await client.query(
      `
        insert into crays_core.workflow_events (
          event_id, event_type, related_entity_type, related_entity_id, role_key, visibility_roles, event_status, payload
        )
        values ($1, 'property_case.readiness_prepared', 'property-case', $2, 'expansion-manager', $3::jsonb, 'recorded', $4::jsonb)
        on conflict (event_id) do nothing
      `,
      [
        ids.eventId,
        caseId,
        JSON.stringify(["expansion-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({
          readiness: "prepared",
          fileUploadEnabled: false,
          providerCallsEnabled: false,
          externalSendingEnabled: false,
          publicReleaseEnabled: false,
        }),
      ],
    );

    const counts = await readinessCounts(client);
    await client.query("commit");

    const insertedRows = {
      locationAnalyses: locationResult.rowCount,
      evidencePackages: evidenceResult.rowCount,
      documentPackageLinks: leaseDocumentResult.rowCount + constructionDocumentResult.rowCount,
      workflowEvents: eventResult.rowCount,
    };
    const insertedTotal = Object.values(insertedRows).reduce((sum, value) => sum + value, 0);

    console.log(
      JSON.stringify(
        {
          status: insertedTotal > 0 ? "prepared" : "already_prepared",
          caseId,
          ids,
          insertedRows,
          updatedRows: {
            propertyCases: caseUpdateResult.rowCount,
          },
          counts,
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
  console.error("Dev property-case readiness preparation failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}
