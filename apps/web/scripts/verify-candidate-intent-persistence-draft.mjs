import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationId = "0004_candidate_intent_persistence";
const sqlPath = resolve(process.cwd(), "database", "migrations", `${migrationId}.sql`);
const migrationSql = readFileSync(sqlPath, "utf8");

const expectedTables = ["candidate_intents", "candidate_intent_events"];

const missingCreateStatements = expectedTables.filter(
  (tableName) => !migrationSql.includes(`create table if not exists crays_core.${tableName}`),
);
const missingRlsEnable = expectedTables.filter(
  (tableName) => !migrationSql.includes(`alter table crays_core.${tableName} enable row level security`),
);
const missingRlsForce = expectedTables.filter(
  (tableName) => !migrationSql.includes(`alter table crays_core.${tableName} force row level security`),
);
const forbiddenFragments = ["private_key", "nsec", "access_token", "refresh_token", "client_secret"];
const forbiddenMatches = forbiddenFragments.filter((fragment) => migrationSql.toLowerCase().includes(fragment));

const ready = missingCreateStatements.length === 0 && missingRlsEnable.length === 0 && missingRlsForce.length === 0 && forbiddenMatches.length === 0;

console.log(
  JSON.stringify(
    {
      migrationId,
      sqlPath,
      expectedTables: expectedTables.length,
      missingCreateStatements,
      missingRlsEnable,
      missingRlsForce,
      forbiddenMatches,
      ready,
      databaseConnectionOpened: false,
    },
    null,
    2,
  ),
);

if (!ready) {
  process.exitCode = 1;
}
