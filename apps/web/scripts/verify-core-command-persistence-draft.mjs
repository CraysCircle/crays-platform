import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationId = "0006_core_command_persistence";
const sqlPath = resolve(process.cwd(), "database", "migrations", `${migrationId}.sql`);
const migrationSql = readFileSync(sqlPath, "utf8");

const expectedTables = [
  "core_command_requests",
  "core_command_previews",
  "core_command_events",
  "core_command_apply_gate_reviews",
];

const missingCreateStatements = expectedTables.filter(
  (tableName) => !migrationSql.includes(`create table if not exists crays_core.${tableName}`),
);
const missingRlsEnable = expectedTables.filter(
  (tableName) => !migrationSql.includes(`alter table crays_core.${tableName} enable row level security`),
);
const missingRlsForce = expectedTables.filter(
  (tableName) => !migrationSql.includes(`alter table crays_core.${tableName} force row level security`),
);
const requiredClosedGateFragments = [
  "source_write_enabled boolean not null default false",
  "sync_write_enabled boolean not null default false",
  "tool_apply_enabled boolean not null default false",
  "upload_enabled boolean not null default false",
  "external_send_enabled boolean not null default false",
  "finance_action_enabled boolean not null default false",
  "bank_action_enabled boolean not null default false",
  "release_action_enabled boolean not null default false",
  "target_apply_enabled boolean not null default false",
];
const missingClosedGateFragments = requiredClosedGateFragments.filter((fragment) => !migrationSql.includes(fragment));
const forbiddenFragments = ["private_key", "nsec", "access_token", "refresh_token", "client_secret"];
const forbiddenMatches = forbiddenFragments.filter((fragment) => migrationSql.toLowerCase().includes(fragment));

const ready =
  missingCreateStatements.length === 0 &&
  missingRlsEnable.length === 0 &&
  missingRlsForce.length === 0 &&
  missingClosedGateFragments.length === 0 &&
  forbiddenMatches.length === 0;

console.log(
  JSON.stringify(
    {
      migrationId,
      sqlPath,
      expectedTables: expectedTables.length,
      missingCreateStatements,
      missingRlsEnable,
      missingRlsForce,
      missingClosedGateFragments,
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
