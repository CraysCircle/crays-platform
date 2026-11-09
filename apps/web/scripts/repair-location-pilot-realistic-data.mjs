import { Pool } from "pg";
import { loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_LOCATION_PILOT_REPAIR === "APPLY_LOCATION_PILOT_REALISTIC_DATA";
const connectionString = process.env.CRAYS_DATABASE_URL;

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_LOCATION_PILOT_REPAIR=APPLY_LOCATION_PILOT_REALISTIC_DATA to apply the Location Pilot realistic-data repair.");
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

const repair = {
  propertyId: "property_dev_workday1_block11",
  propertyCaseId: "property_case_dev_workday1_block11",
  preparedOfferId: "prepared_offer_property_case_dev_workday1_block11_draft",
  propertyTitle: "Invalidenstrasse 118 Studio Lease",
  addressSummary: "Invalidenstrasse 118, 10115 Berlin, Germany",
  city: "Berlin",
  country: "Germany",
  offerTitle: "Prepared Franchise Deal - Berlin Invalidenstrasse",
  market: "Berlin Mitte",
};

async function currentState(client) {
  const result = await client.query(
    `
      select
        properties.property_id,
        properties.title as property_title,
        properties.address_summary,
        properties.city,
        properties.country,
        property_cases.case_id,
        property_cases.current_phase,
        property_cases.handoff_status,
        prepared_offers.offer_id,
        prepared_offers.title as offer_title,
        prepared_offers.market
      from crays_core.properties
      join crays_core.property_cases on property_cases.property_id = properties.property_id
      left join crays_core.prepared_offers on prepared_offers.property_case_id = property_cases.case_id
      where properties.property_id = $1
    `,
    [repair.propertyId],
  );
  return result.rows;
}

async function applyRepair(client) {
  await client.query("begin");
  try {
    await client.query("select set_config('crays.app_role', 'core_service', true)");
    await client.query(
      `
        update crays_core.properties
        set
          title = $2,
          address_summary = $3,
          city = $4,
          country = $5,
          metadata = metadata || $6::jsonb,
          updated_at = now()
        where property_id = $1
      `,
      [
        repair.propertyId,
        repair.propertyTitle,
        repair.addressSummary,
        repair.city,
        repair.country,
        JSON.stringify({
          displayAddress: repair.addressSummary,
          district: "Mitte",
          areaSqm: 940,
          rentPerSqm: 34,
          fitScore: 82,
          testDataQuality: "golden_realistic",
          scenario: "Berlin Mitte owner intake and location evidence review",
          externalProviderCallsEnabled: false,
          ownerSubmissionWritesEnabled: false,
        }),
      ],
    );

    await client.query(
      `
        update crays_core.property_cases
        set
          metadata = metadata || $2::jsonb,
          updated_at = now()
        where case_id = $1
      `,
      [
        repair.propertyCaseId,
        JSON.stringify({
          title: "Berlin Invalidenstrasse property review",
          testDataQuality: "golden_realistic",
          scenario: "Location evidence reviewed before rent and economics model completion",
          externalProviderCallsEnabled: false,
          ownerSubmissionWritesEnabled: false,
        }),
      ],
    );

    await client.query(
      `
        update crays_core.prepared_offers
        set
          title = $2,
          market = $3,
          metadata = metadata || $4::jsonb,
          updated_at = now()
        where offer_id = $1
      `,
      [
        repair.preparedOfferId,
        repair.offerTitle,
        repair.market,
        JSON.stringify({
          testDataQuality: "golden_realistic",
          propertyTitle: repair.propertyTitle,
          candidateReleaseEnabled: false,
          bankReleaseEnabled: false,
        }),
      ],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

try {
  const client = await pool.connect();
  try {
    const before = await currentState(client);
    if (!before.length) {
      console.error(`Location pilot property not found: ${repair.propertyId}`);
      process.exitCode = 1;
    } else if (apply) {
      await applyRepair(client);
      const after = await currentState(client);
      console.log(
        JSON.stringify(
          {
            status: "applied",
            repairedRecords: after.length,
            before,
            after,
            gates: {
              liveExternalReadsEnabled: false,
              ownerSubmissionWritesEnabled: false,
              candidateReleaseEnabled: false,
              bankReleaseEnabled: false,
              sourceWritesEnabled: false,
              syncApplyEnabled: false,
            },
          },
          null,
          2,
        ),
      );
    } else {
      console.log(
        JSON.stringify(
          {
            status: "dry_run",
            wouldRepair: repair,
            current: before,
            applyCommand:
              "CONFIRM_CRAYS_LOCATION_PILOT_REPAIR=APPLY_LOCATION_PILOT_REALISTIC_DATA npm.cmd run core:repair:location-pilot-realistic-data:apply",
          },
          null,
          2,
        ),
      );
    }
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
