import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => readFileSync(join(root, ...parts), "utf8");
const up = read("database", "migrations", "0136_openclaw_governance_authority_foundation.sql");
const down = read("database", "migrations", "0136_openclaw_governance_authority_foundation.down.sql");
const contract = read("..", "docs", "architecture", "CRAYS_OPENCLAW_OCA_001_GOVERNANCE_NORTH_STAR_AND_CONTINUITY_CONTRACT_2026_08_02.md");
const failures = [];
let assertions = 0;
const check = (name, value) => { assertions += 1; if (!value) failures.push(name); };
const has = (group, source, token) => check(`${group}:${token}`, source.includes(token));
const matches = (group, source, pattern) => check(`${group}:${pattern}`, pattern.test(source));
const rejects = (group, source, pattern) => check(`${group}:forbidden:${pattern}`, !pattern.test(source));

const tables = [
  "oca_governance_actor_assignment_versions","oca_programme_manifest_versions","oca_source_fingerprints","oca_decision_versions",
  "oca_scope_change_versions","oca_governance_command_roots","oca_governance_command_receipt_versions",
];
const views = ["oca_programme_board_read_model","oca_source_drift_read_model","oca_decision_register_read_model","oca_scope_change_queue_read_model"];
const commands = ["ProposeScopeChange","ApproveScopeChange","RejectScopeChange","RecordDecision","SupersedeDecision","AcknowledgeSourceDrift","ReconcileGovernanceCommand"];
for (const table of tables) {
  matches("tenant-first", up, new RegExp(`create table crays_core\\.${table}\\(\\s*tenant_id text not null`, "i"));
  has("forced-rls-inventory", up, `'${table}'`);
  matches("down", down, new RegExp(`drop table if exists crays_core\\.${table};`, "i"));
}
for (const view of views) {
  matches("security-view", up, new RegExp(`create view crays_core\\.${view} with\\(security_invoker=true,security_barrier=true\\)`, "i"));
  has("view-revoke", up, `revoke all on crays_core.${view} from public`);
  has("view-down", down, `drop view if exists crays_core.${view}`);
}
for (const command of commands) has("command", up, `'${command}'`);
for (const authority of ["query_authority","processing_authority","disclosure_authority","command_authority"]) {
  has("contract-authority", contract, authority); has("data-authority", up, `'${authority}'`);
}
for (const vertical of ["coffee","retail","gym","clubs"]) has("four-vertical", up, `'${vertical}'`);
for (const token of [
  "before update or delete","OCA_GOVERNANCE_IMMUTABLE_RECORD","enable row level security","force row level security",
  "current_setting(''crays.app_role'',true)=''core_service'","tenant_id=current_setting(''crays.tenant_id'',true)",
  "current_setting(''crays.actor_role'',true)","idempotency_key_sha256","canonical_payload_sha256","expected_record_version",
  "current_setting('crays.actor_id',true)","approved_by_actor_id=current_setting('crays.actor_id',true)",
  "owner_actor_id=current_setting('crays.actor_id',true)","requested_by_actor_id=current_setting('crays.actor_id',true)",
  "actor_id=current_setting('crays.actor_id',true)",
  "expected_record_sha256","unknown_outcome","business_completion_state","reconciliation_required","next_safe_action",
  "OCA_SCOPE_CHANGE_ACCEPTED_DECISION_REQUIRED","OCA_SCOPE_CHANGE_EFFECTIVE_MANIFEST_REQUIRED",
]) has("authority-receipt", up, token);
has("rollback-guard", down, "OCA002_ROLLBACK_BLOCKED_ACTIVE_GOVERNANCE_RECORDS");
rejects("no-network", up, /https?:\/\/|fetch\s*\(|curl\s|invoke-webrequest/i);
rejects("no-provider", up, /whatsapp|telegram|nextcloud|erpnext|vendure|model_provider/i);
rejects("append-only-update", up, /^\s*update\s+crays_core\./im);
rejects("append-only-delete", up, /^\s*delete\s+from\s+crays_core\./im);
rejects("no-public-grant", up, /grant\s+(?:all|select|insert|update|delete).*\s+to\s+public/i);

console.log(JSON.stringify({schema:"crays.openclaw.oca002-governance-data-source-verification.v1",status:failures.length?"FAIL":"PASS_FOR_SOURCE_VERIFICATION_ONLY",assertions,tables:tables.length,views:views.length,commands:commands.length,forcedRlsRequired:true,appendOnlyRequired:true,databaseRuntimeProved:false,externalCalls:0,productionAuthorized:false,failures},null,2));
if(failures.length)process.exit(1);
