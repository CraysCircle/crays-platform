import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const appRoot = resolve(import.meta.dirname, "..");
const patterns = [
  "mustermann",
  "untitled person",
  "untitled company",
  "lorem ipsum",
  "foobar",
  "dummy data",
];
const regexPatterns = [
  "owner organization [0-9]+",
  "bank partner [0-9]+",
  "benchmark property -",
  "franchise candidate [0-9]+",
  "member 0[0-9]+",
];

function loadEnv() {
  for (const filename of [".env.local", ".env"]) {
    const filePath = resolve(appRoot, filename);
    if (!existsSync(filePath)) continue;
    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  }
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function poolConfig() {
  const connectionString = process.env.CRAYS_DATABASE_URL;
  if (!connectionString) throw new Error("CRAYS_DATABASE_URL is required.");
  return {
    connectionString,
    ssl: process.env.CRAYS_DATABASE_SSL === "disable" ? undefined : { rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
    options: "-c crays.app_role=core_service",
    max: 2,
  };
}

async function main() {
  loadEnv();
  const pool = new pg.Pool(poolConfig());
  try {
    const columns = await pool.query(`
      select table_name, column_name, data_type
      from information_schema.columns
      where table_schema = 'crays_core'
        and data_type in ('text', 'character varying', 'character', 'json', 'jsonb')
      order by table_name, ordinal_position
    `);

    const findings = [];
    for (const column of columns.rows) {
      const tableName = quoteIdentifier(column.table_name);
      const columnName = quoteIdentifier(column.column_name);
      const result = await pool.query(
        `
          select pattern, count(*)::int hits
          from crays_core.${tableName}
          cross join unnest($1::text[]) as pattern
          where position(lower(pattern) in lower(coalesce(${columnName}::text, ''))) > 0
          group by pattern
          order by pattern
        `,
        [patterns],
      );
      for (const row of result.rows) findings.push({ pattern: row.pattern, matchType: "substring", table: column.table_name, column: column.column_name, dataType: column.data_type, hits: row.hits });
      const regexResult = await pool.query(
        `
          select pattern, count(*)::int hits
          from crays_core.${tableName}
          cross join unnest($1::text[]) as pattern
          where coalesce(${columnName}::text, '') ~* pattern
          group by pattern
          order by pattern
        `,
        [regexPatterns],
      );
      for (const row of regexResult.rows) findings.push({ pattern: row.pattern, matchType: "regex", table: column.table_name, column: column.column_name, dataType: column.data_type, hits: row.hits });
    }

    const baseTables = await pool.query(`
      select table_name
      from information_schema.tables
      where table_schema = 'crays_core' and table_type = 'BASE TABLE'
      order by table_name
    `);
    const tableCounts = [];
    for (const row of baseTables.rows) {
      const result = await pool.query(`select count(*)::int records from crays_core.${quoteIdentifier(row.table_name)}`);
      tableCounts.push({ table: row.table_name, records: result.rows[0]?.records ?? 0 });
    }

    const immutableFindings = findings.filter((finding) => finding.table === "core_command_requests" || finding.table === "core_command_events");
    const activeFindings = findings.filter((finding) => !immutableFindings.includes(finding));

    console.log(JSON.stringify({
      status: activeFindings.length === 0 ? (immutableFindings.length === 0 ? "clean" : "clean_active_dataset") : "attention",
      schema: "crays_core",
      columnsChecked: columns.rows.length,
      patternsChecked: patterns.length + regexPatterns.length,
      totalHits: findings.reduce((total, finding) => total + finding.hits, 0),
      activeHits: activeFindings.reduce((total, finding) => total + finding.hits, 0),
      immutableHistoryHits: immutableFindings.reduce((total, finding) => total + finding.hits, 0),
      activeFindings,
      immutableFindings,
      tableCounts,
      boundaries: {
        readOnly: true,
        dataWritesPerformed: false,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        toolApplyEnabled: false,
        externalSendingEnabled: false,
        secretsReturned: false,
      },
    }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Golden operating dataset audit failed.");
  process.exit(1);
});
