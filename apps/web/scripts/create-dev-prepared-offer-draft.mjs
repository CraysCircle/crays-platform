import pg from "pg";
import { loadLocalEnv } from "./env-loader.mjs";

const { Pool } = pg;

loadLocalEnv();

const confirmation = "CREATE_PREPARED_OFFER_DRAFT";
const writeEnabled = process.env.CRAYS_ENABLE_DEV_DOMAIN_WRITES === "true";
const confirmed = process.env.CONFIRM_CRAYS_DEV_DOMAIN_WRITE === confirmation;
const connectionString = process.env.CRAYS_DATABASE_URL;

const caseId = process.env.CRAYS_DEV_PROPERTY_CASE_ID || "property_case_dev_workday1_block11";
const offerId = process.env.CRAYS_DEV_PREPARED_OFFER_ID || `prepared_offer_${caseId}_draft`;
const eventId = `event_${offerId}_created`;

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
        candidateReleaseEnabled: false,
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
  console.error("CRAYS_DATABASE_URL is required before creating a dev prepared-offer draft.");
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

async function countRows(client) {
  const result = await client.query(
    `
      select
        (select count(*)::int from crays_core.prepared_offers) as prepared_offers,
        (select count(*)::int from crays_core.workflow_events where related_entity_type = 'prepared-offer') as prepared_offer_events
    `,
  );

  return result.rows[0];
}

try {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const sourceResult = await client.query(
      `
        select
          property_cases.case_id,
          property_cases.status,
          property_cases.current_phase,
          property_cases.handoff_status,
          properties.title,
          properties.city,
          properties.country,
          (
            select analysis_id
            from crays_core.location_analyses
            where property_case_id = property_cases.case_id
              and status in ('review', 'approved', 'released')
            order by updated_at desc
            limit 1
          ) as location_analysis_id,
          (
            select package_id
            from crays_core.evidence_packages
            where related_entity_type = 'property-case'
              and related_entity_id = property_cases.case_id
            order by updated_at desc
            limit 1
          ) as evidence_package_id
        from crays_core.property_cases
        join crays_core.properties on properties.property_id = property_cases.property_id
        where property_cases.case_id = $1
        for update
      `,
      [caseId],
    );
    const source = sourceResult.rows[0];

    if (!source) {
      throw new Error("Dev property case was not found.");
    }

    if (source.status !== "handoff_ready" || source.handoff_status !== "ready") {
      throw new Error("Prepared-offer draft requires a handoff-ready property case.");
    }

    if (!source.location_analysis_id || !source.evidence_package_id) {
      throw new Error("Prepared-offer draft requires location analysis and evidence package readiness.");
    }

    const offerResult = await client.query(
      `
        insert into crays_core.prepared_offers (
          offer_id, property_case_id, location_analysis_id, evidence_package_id, title, market, owner_role,
          status, candidate_release_state, public_teaser_enabled, partner_handoff_status, metrics_snapshot, metadata
        )
        values ($1, $2, $3, $4, $5, $6, 'deal-manager', 'draft', 'not_released', false, 'pending', $7::jsonb, $8::jsonb)
        on conflict (offer_id) do nothing
      `,
      [
        offerId,
        caseId,
        source.location_analysis_id,
        source.evidence_package_id,
        `CRAYS Dev Prepared Offer - ${source.title}`,
        [source.city, source.country].filter(Boolean).join(", ") || "Market pending",
        JSON.stringify({
          source: "property_case_handoff_ready",
          candidateSafe: false,
          publicTeaser: false,
        }),
        JSON.stringify({
          sourcePropertyCaseId: caseId,
          createdFromHandoffReady: true,
          candidateReleaseEnabled: false,
          publicReleaseEnabled: false,
        }),
      ],
    );

    const eventResult = await client.query(
      `
        insert into crays_core.workflow_events (
          event_id, event_type, related_entity_type, related_entity_id, role_key, visibility_roles, event_status, payload
        )
        values ($1, 'prepared_offer.draft_created', 'prepared-offer', $2, 'deal-manager', $3::jsonb, 'recorded', $4::jsonb)
        on conflict (event_id) do nothing
      `,
      [
        eventId,
        offerId,
        JSON.stringify(["deal-manager", "expansion-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({
          sourcePropertyCaseId: caseId,
          candidateReleaseState: "not_released",
          publicTeaserEnabled: false,
        }),
      ],
    );

    const counts = await countRows(client);
    await client.query("commit");

    console.log(
      JSON.stringify(
        {
          status: offerResult.rowCount + eventResult.rowCount > 0 ? "created" : "already_exists",
          caseId,
          offerId,
          eventId,
          insertedRows: {
            preparedOffers: offerResult.rowCount,
            workflowEvents: eventResult.rowCount,
          },
          counts,
          liveBusinessRecordReturned: true,
          fileUploadEnabled: false,
          providerCallsEnabled: false,
          externalSendingEnabled: false,
          publicReleaseEnabled: false,
          candidateReleaseEnabled: false,
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
  console.error("Dev prepared-offer draft creation failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}
