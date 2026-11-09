import pg from "pg";
import { loadLocalEnv } from "./env-loader.mjs";

const { Pool } = pg;

loadLocalEnv();

const confirmation = "TRANSITION_PREPARED_OFFER_REVIEW";
const writeEnabled = process.env.CRAYS_ENABLE_DEV_DOMAIN_WRITES === "true";
const confirmed = process.env.CONFIRM_CRAYS_DEV_DOMAIN_WRITE === confirmation;
const connectionString = process.env.CRAYS_DATABASE_URL;

const offerId = process.env.CRAYS_DEV_PREPARED_OFFER_ID || "prepared_offer_property_case_dev_workday1_block11_draft";
const eventId = `event_${offerId}_start_review`;

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
        candidateReleaseEnabled: false,
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
  console.error("CRAYS_DATABASE_URL is required before transitioning a dev prepared offer.");
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
        select offer_id, owner_role, status, candidate_release_state, public_teaser_enabled, location_analysis_id, evidence_package_id
        from crays_core.prepared_offers
        where offer_id = $1
        for update
      `,
      [offerId],
    );
    const current = currentResult.rows[0];

    if (!current) {
      throw new Error("Dev prepared offer was not found.");
    }

    if (current.owner_role !== "deal-manager") {
      throw new Error("Only Deal-owned prepared offers can enter review through this dev workflow.");
    }

    if (!current.location_analysis_id || !current.evidence_package_id) {
      throw new Error("Prepared offer requires linked location analysis and evidence package before review.");
    }

    if (current.candidate_release_state !== "not_released" || current.public_teaser_enabled) {
      throw new Error("Prepared offer review transition cannot run after candidate or public release.");
    }

    const alreadyTransitioned = current.status === "review";

    if (!alreadyTransitioned && current.status !== "draft") {
      throw new Error("Prepared offer must be a draft before review transition.");
    }

    const offerResult = alreadyTransitioned
      ? { rowCount: 0 }
      : await client.query(
          `
            update crays_core.prepared_offers
            set status = 'review',
                metadata = metadata || $2::jsonb,
                updated_at = now()
            where offer_id = $1
          `,
          [
            offerId,
            JSON.stringify({
              internalReviewStarted: true,
              candidateReleaseEnabled: false,
              publicReleaseEnabled: false,
              source: "confirmed_dev_workflow",
            }),
          ],
        );

    const eventResult = await client.query(
      `
        insert into crays_core.workflow_events (
          event_id, event_type, related_entity_type, related_entity_id, role_key, visibility_roles, event_status, payload
        )
        values ($1, 'prepared_offer.review_started', 'prepared-offer', $2, 'deal-manager', $3::jsonb, 'recorded', $4::jsonb)
        on conflict (event_id) do nothing
      `,
      [
        eventId,
        offerId,
        JSON.stringify(["deal-manager", "reviewer", "crays-management", "admin"]),
        JSON.stringify({
          transition: "start_review",
          fromStatus: current.status,
          toStatus: "review",
          candidateReleaseEnabled: false,
          publicReleaseEnabled: false,
        }),
      ],
    );

    await client.query("commit");

    console.log(
      JSON.stringify(
        {
          status: alreadyTransitioned ? "already_transitioned" : "transitioned",
          offerId,
          eventId,
          fromStatus: current.status,
          toStatus: "review",
          updatedRows: {
            preparedOffers: offerResult.rowCount,
            workflowEvents: eventResult.rowCount,
          },
          liveBusinessRecordReturned: true,
          candidateReleaseEnabled: false,
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
  console.error("Dev prepared-offer review transition failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}
