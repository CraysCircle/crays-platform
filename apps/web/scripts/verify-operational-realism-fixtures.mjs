import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const connectionString = process.env.CRAYS_DATABASE_URL;
const crmSeedBatch = "crays-operational-realism-20260713-v1";
const projectSeedBatch = "crays-opening-project-20260713-v1";

const requiredFiles = [
  "src/db/crm-operational-read-model-repository.ts",
  "src/app/api/crays/crm/operational/read-model/route.ts",
  "src/components/crm-operational-workspace-page.tsx",
  "scripts/seed-operational-realism-fixtures.mjs",
];

const minimums = {
  companies: 2_000,
  people: 5_000,
  leads: 10_000,
  opportunities: 5_000,
};

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

async function main() {
  const fs = await import("node:fs");
  const missing = requiredFiles.filter((file) => !fs.existsSync(new URL(`../${file}`, import.meta.url)));
  if (missing.length) {
    throw new Error(`Missing operational realism files: ${missing.join(", ")}`);
  }

  const counts = await pool.query(
    `
      select external_entity_type as family, count(*)::int as count
      from crays_core.external_record_maps
      where external_system = 'crm-operational-fixture'
        and metadata ->> 'seedBatch' = $1
      group by external_entity_type
      order by external_entity_type
    `,
    [crmSeedBatch],
  );
  const byFamily = Object.fromEntries(counts.rows.map((row) => [row.family, Number(row.count)]));
  const failures = Object.entries(minimums).filter(([family, min]) => (byFamily[family] ?? 0) < min);
  if (failures.length) {
    throw new Error(`CRM operational fixture below minimums: ${failures.map(([family, min]) => `${family}<${min}`).join(", ")}`);
  }

  const projectCount = await pool.query(
    `
      select count(distinct metadata #>> '{row,fields,projectId}')::int as active_projects,
             count(*)::int as rows
      from crays_core.external_record_maps
      where external_system = 'opening-project-engine'
        and metadata ->> 'seedBatch' = $1
    `,
    [projectSeedBatch],
  );
  const activeProjects = Number(projectCount.rows[0]?.active_projects ?? 0);
  if (activeProjects < 30) {
    throw new Error(`Opening Project fixture expected at least 30 active projects, got ${activeProjects}.`);
  }

  return {
    status: "ok",
    target: getRedactedDatabaseTarget(connectionString),
    crmSeedBatch,
    projectSeedBatch,
    crmCounts: byFamily,
    openingProjects: activeProjects,
    openingProjectRows: Number(projectCount.rows[0]?.rows ?? 0),
  };
}

try {
  console.log(JSON.stringify(await main(), null, 2));
} finally {
  await pool.end();
}
