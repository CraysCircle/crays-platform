import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();
const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_SUPPORT_RECOVERY === "APPLY_SUPPORT_RECOVERY_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-support-recovery-20260713-v1";
const systemKey = "support-recovery-engine";
const connectionId = "core_source_support_recovery";
if (!connectionString) { console.error("CRAYS_DATABASE_URL is required."); process.exit(1); }
if (apply && !confirm) { console.error("Set CONFIRM_CRAYS_SUPPORT_RECOVERY=APPLY_SUPPORT_RECOVERY_SOURCE_SLICE to apply Support Recovery source records."); process.exit(1); }

const pool = new Pool({ connectionString, max: Number.parseInt(process.env.CRAYS_DATABASE_POOL_MAX ?? "5", 10), ssl: process.env.CRAYS_DATABASE_SSL === "require" ? { rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined, options: "-c crays.app_role=core_service" });
const digest = (value, length = 24) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, length);
const slug = (value) => String(value).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
const baseFields = {
  moduleKey: "support", seedBatch, sourceAsOf: "2026-07-13", studioId: "studio_berlin_mitte", studioName: "Berlin Mitte Studio",
  partnerOrganizationId: "org_vogt_fitness_betriebs", partnerCompany: "Vogt Fitness Betriebs GmbH",
  sourceDatasets: ["member-app", "erp-engine", "operations-engine", "opening-project-engine"],
  externalSendingEnabled: false, refundExecutionEnabled: false, paymentInitiationEnabled: false, financePostingEnabled: false,
  uploadsEnabled: false, privatePreviewEnabled: false, sourceWritesEnabled: false, syncApplyEnabled: false, toolApplyEnabled: false,
  stakeholderReleaseEnabled: false, liveAiEnabled: false,
};

function record(family, externalId, label, fields) {
  const status = fields.status ?? "attention";
  const priority = fields.priority ?? "medium";
  return { family, externalId, label, craysEntityType: family === "evidence-link" ? "document" : family === "payment-context" ? "financial-model" : "support-ticket", craysEntityId: `${family === "evidence-link" ? "document" : family === "payment-context" ? "financial_model" : "support_ticket"}_${slug(externalId)}`, owner: fields.ownerRole ?? "Studio Manager", status, priority, dueDate: fields.dueDate ?? "2026-07-15", syncStatus: status === "breached" || status === "blocked" || priority === "critical" ? "conflict" : "synced", fields: { ...baseFields, ...fields } };
}

const cases = [
  ["SUP-201", "Felix Hartmann access blocked after SEPA return", "Felix Hartmann", "member_felix_hartmann", "access_and_payment", "Studio Manager", "breached", "critical", "2026-07-13", "Restore safe access only after Finance confirms the recovery state."],
  ["SUP-202", "Julia Santos late cancellation refund review", "Julia Santos", "member_julia_santos", "refund_request", "CRAYS Finance", "attention", "high", "2026-07-14", "Review attendance evidence and refund eligibility without executing a refund."],
  ["SUP-203", "Daniel Krause chargeback evidence request", "Daniel Krause", "member_daniel_krause", "billing_dispute", "CRAYS Finance", "blocked", "critical", "2026-07-13", "Complete chargeback evidence metadata and assign the finance reviewer."],
  ["SUP-204", "Clara Hoffmann mobile access reset", "Clara Hoffmann", "member_clara_hoffmann", "access_problem", "Studio Manager", "attention", "high", "2026-07-13", "Validate identity metadata and stage an internal access recovery task."],
  ["SUP-205", "Mira Lang trainer session complaint", "Mira Lang", "member_mira_lang", "trainer_complaint", "Studio Manager", "attention", "medium", "2026-07-15", "Assign the service review to the studio manager and preserve internal notes."],
  ["SUP-206", "Marco Schmidt failed payment follow-up", "Marco Schmidt", "member_marco_schmidt", "payment_issue", "Studio Manager", "attention", "high", "2026-07-14", "Coordinate member contact preflight with Finance; do not send externally."],
  ["SUP-207", "Laura Neumann class waitlist issue", "Laura Neumann", "member_laura_neumann", "booking_issue", "Studio Manager", "attention", "medium", "2026-07-15", "Review class capacity and waitlist position before response drafting."],
  ["SUP-208", "Sophie Weber frozen contract clarification", "Sophie Weber", "member_sophie_weber", "contract_question", "Studio Manager", "attention", "medium", "2026-07-16", "Review contract and freeze metadata before preparing a scoped answer."],
  ["SUP-209", "Lukas Berger duplicate invoice concern", "Lukas Berger", "member_lukas_berger", "invoice_question", "CRAYS Finance", "attention", "high", "2026-07-14", "Compare invoice and settlement records and stage a finance review."],
  ["SUP-210", "Anna Richter course no-show dispute", "Anna Richter", "member_anna_richter", "booking_dispute", "Studio Manager", "attention", "medium", "2026-07-16", "Review check-in and booking evidence before recovery decision."],
];
const supportCases = cases.map(([identifier, label, memberName, memberId, caseType, ownerRole, status, priority, dueDate, nextAction]) => record("support-case", identifier.toLowerCase(), label, { caseId: `case_${identifier.toLowerCase()}`, identifier, memberName, memberId, caseType, value: "open", unit: "state", status, priority, ownerRole, audience: ownerRole === "CRAYS Finance" ? "Finance" : "Studio Manager", dueDate, openedAt: "2026-07-12T09:00:00Z", slaDueAt: `${dueDate}T16:00:00Z`, context: `${label} is linked to the member, studio and originating operational record.`, currentState: status === "breached" ? "SLA breached and escalation required." : status === "blocked" ? "Recovery is blocked by missing evidence." : "Case is assigned and awaiting the next safe action.", nextAction }));

const slaData = [
  ["felix_first_response", "Felix Hartmann first-response SLA", "SUP-201", -3, "breached", "critical", "Studio Manager"],
  ["daniel_evidence_sla", "Daniel Krause evidence SLA", "SUP-203", 2, "blocked", "critical", "CRAYS Finance"],
  ["clara_access_sla", "Clara Hoffmann access recovery SLA", "SUP-204", 4, "attention", "high", "Studio Manager"],
  ["julia_refund_sla", "Julia Santos refund review SLA", "SUP-202", 8, "attention", "high", "CRAYS Finance"],
  ["marco_contact_sla", "Marco Schmidt contact preflight SLA", "SUP-206", 12, "attention", "high", "Studio Manager"],
  ["laura_booking_sla", "Laura Neumann booking resolution SLA", "SUP-207", 20, "ready", "medium", "Studio Manager"],
];
const slaEvents = slaData.map(([id, label, caseId, hoursRemaining, status, priority, ownerRole]) => record("sla-event", id, label, { caseId, metricKey: id, value: hoursRemaining, unit: "hours", status, priority, ownerRole, audience: "CRAYS Management", context: `${label} exposes the remaining or breached resolution window.`, currentState: hoursRemaining < 0 ? `${Math.abs(hoursRemaining)} hours breached.` : `${hoursRemaining} hours remaining.`, nextAction: status === "breached" || status === "blocked" ? "Escalate the owner and stage a recovery review." : "Keep the assigned recovery action within SLA." }));

const memberData = [
  ["felix_member_context", "Felix Hartmann membership and access context", "SUP-201", "member_felix_hartmann", "active", "access_restricted"],
  ["julia_member_context", "Julia Santos booking and attendance context", "SUP-202", "member_julia_santos", "active", "booking_review"],
  ["daniel_member_context", "Daniel Krause contract and consent context", "SUP-203", "member_daniel_krause", "active", "finance_review"],
  ["clara_member_context", "Clara Hoffmann identity and access context", "SUP-204", "member_clara_hoffmann", "active", "identity_review"],
  ["mira_member_context", "Mira Lang training and service context", "SUP-205", "member_mira_lang", "active", "service_review"],
];
const memberContexts = memberData.map(([id, label, caseId, memberId, membershipStatus, recoveryState]) => record("member-context", id, label, { caseId, memberId, value: membershipStatus, unit: "state", status: "attention", priority: "medium", ownerRole: "Studio Manager", audience: "Studio Manager", membershipStatus, recoveryState, context: `${label} keeps the support case tied to the correct member scope.`, currentState: `Membership is ${membershipStatus}; recovery state is ${recoveryState}.`, nextAction: "Use scoped member facts for recovery; do not expose unrelated member data." }));

const paymentData = [
  ["felix_sepa_return", "Felix Hartmann SEPA return context", "SUP-201", "member_felix_hartmann", 89.9, "blocked", "critical"],
  ["julia_refund_review", "Julia Santos refund amount review", "SUP-202", "member_julia_santos", 19.9, "attention", "high"],
  ["daniel_chargeback", "Daniel Krause chargeback amount", "SUP-203", "member_daniel_krause", 99.9, "blocked", "critical"],
  ["marco_failed_payment", "Marco Schmidt failed payment amount", "SUP-206", "member_marco_schmidt", 79.9, "attention", "high"],
];
const paymentContexts = paymentData.map(([id, label, caseId, memberId, amount, status, priority]) => record("payment-context", id, label, { caseId, memberId, paymentEventId: `payment_${id}`, value: amount, unit: "EUR", status, priority, ownerRole: "CRAYS Finance", audience: "Finance", context: `${label} links the support case to payment recovery and ledger preview records.`, currentState: status === "blocked" ? "Finance evidence is incomplete." : "Payment review is assigned.", nextAction: "Review payment evidence and ledger preview; no refund or payment is executed." }));

const evidenceData = [
  ["felix_access_evidence", "Felix Hartmann access and SEPA evidence", "SUP-201", "review", "Studio Manager"],
  ["julia_attendance_evidence", "Julia Santos attendance evidence", "SUP-202", "ready", "Studio Manager"],
  ["daniel_chargeback_evidence", "Daniel Krause chargeback evidence", "SUP-203", "blocked", "CRAYS Finance"],
];
const evidenceLinks = evidenceData.map(([id, label, caseId, status, ownerRole]) => record("evidence-link", id, label, { caseId, evidencePackageId: `support_evidence_${caseId.toLowerCase()}`, value: status, unit: "state", status: status === "ready" ? "ready" : status, priority: status === "blocked" ? "critical" : "high", ownerRole, audience: "Reviewer", context: `${label} exposes evidence metadata without file body or private preview.`, currentState: status === "ready" ? "Evidence metadata approved." : "Evidence review remains open.", nextAction: "Review in Files; upload and private preview remain closed." }));

const actionData = [
  ["felix_access_recovery", "Felix Hartmann access recovery", "SUP-201", "Studio Manager", "blocked", "critical"],
  ["julia_refund_decision", "Julia Santos refund eligibility review", "SUP-202", "CRAYS Finance", "attention", "high"],
  ["daniel_chargeback_recovery", "Daniel Krause chargeback recovery", "SUP-203", "CRAYS Finance", "blocked", "critical"],
  ["clara_access_reset", "Clara Hoffmann access reset review", "SUP-204", "Studio Manager", "attention", "high"],
  ["marco_payment_contact", "Marco Schmidt payment contact preflight", "SUP-206", "Studio Manager", "attention", "high"],
];
const recoveryActions = actionData.map(([id, label, caseId, ownerRole, status, priority]) => record("recovery-action", id, label, { caseId, value: "review", unit: "state", status, priority, ownerRole, audience: ownerRole === "CRAYS Finance" ? "Finance" : "Studio Manager", context: `${label} is the next internal recovery action.`, currentState: status === "blocked" ? "Action is blocked until evidence or finance review is complete." : "Action is ready for guarded command staging.", nextAction: "Stage a guarded support escalation command; no message, refund, payment or apply is executed." }));

const records = [...supportCases, ...slaEvents, ...memberContexts, ...paymentContexts, ...evidenceLinks, ...recoveryActions];
const grouped = () => records.reduce((result, item) => { (result[item.family] ??= []).push(item); return result; }, {});
const mapId = (item) => `src_${digest([systemKey, item.family, item.externalId], 32)}`;
const row = (item) => ({ id: item.externalId, label: item.label, family: item.family, owner: item.owner, status: item.status, priority: item.priority, dueDate: item.dueDate, fields: item.fields });

async function persist(client) {
  const families = Object.keys(grouped()).sort(); const jobId = `sync_job_${digest([systemKey, generatedAt, records.length], 28)}`; const metadata = JSON.stringify({ ...baseFields, generatedAt, rowsSeen: records.length, families });
  await client.query(`insert into crays_core.integration_connections (connection_id,module_key,system_key,connection_name,owner_role,status,connection_mode,secret_reference_status,connection_health,metadata,updated_at) values ($1,'support',$2,'Support Recovery source slice','admin','active','sync_read_model','configured_reference','healthy',$3::jsonb,now()) on conflict (connection_id) do update set status=excluded.status,connection_mode=excluded.connection_mode,connection_health=excluded.connection_health,metadata=excluded.metadata,updated_at=now()`, [connectionId, systemKey, metadata]);
  await client.query(`insert into crays_core.sync_jobs (job_id,connection_id,job_type,direction,status,attempt_count,crays_entity_type,crays_entity_id,payload_summary,scheduled_at,started_at,finished_at,updated_at) values ($1,$2,'read_sync','read','succeeded',1,'support-ticket','support_recovery_berlin_mitte',$3::jsonb,now(),now(),now(),now()) on conflict (job_id) do update set status=excluded.status,attempt_count=crays_core.sync_jobs.attempt_count+1,payload_summary=excluded.payload_summary,started_at=excluded.started_at,finished_at=excluded.finished_at,updated_at=now()`, [jobId, connectionId, metadata]);
  let written = 0;
  for (const item of records) { const sourceRow = row(item); const result = await client.query(`insert into crays_core.external_record_maps (map_id,crays_entity_type,crays_entity_id,external_system,external_entity_type,external_entity_id,sync_direction,sync_status,last_synced_at,metadata,updated_at) values ($1,$2,$3,$4,$5,$6,'read',$7,now(),$8::jsonb,now()) on conflict (external_system,external_entity_type,external_entity_id) do update set crays_entity_type=excluded.crays_entity_type,crays_entity_id=excluded.crays_entity_id,sync_status=excluded.sync_status,last_synced_at=excluded.last_synced_at,metadata=excluded.metadata,updated_at=now()`, [mapId(item), item.craysEntityType, item.craysEntityId, systemKey, item.family, item.externalId, item.syncStatus, JSON.stringify({ moduleKey: "support", seedBatch, sectionKey: item.family, syncJobId: jobId, snapshotGeneratedAt: generatedAt, row: sourceRow, sourceDigest: digest(sourceRow, 32) })]); written += result.rowCount ?? 0; }
  return { connectionId, systemKey, rowsSeen: records.length, mapsWritten: written };
}
function summary() { return { status: apply ? "apply_requested" : "dry_run", seedBatch, records: records.length, target: getRedactedDatabaseTarget(connectionString), families: Object.fromEntries(Object.entries(grouped()).map(([family, items]) => [family, items.length])), conflicts: records.filter((item) => item.syncStatus === "conflict").length, closedGates: { externalSendingEnabled: false, refundExecutionEnabled: false, paymentInitiationEnabled: false, financePostingEnabled: false, uploadsEnabled: false, privatePreviewEnabled: false, sourceWritesEnabled: false, syncApplyEnabled: false, toolApplyEnabled: false, stakeholderReleaseEnabled: false, liveAiEnabled: false } }; }
async function main() { if (!apply) { console.log(JSON.stringify(summary(), null, 2)); await pool.end(); return; } const client = await pool.connect(); try { await client.query("begin"); const result = await persist(client); await client.query("commit"); console.log(JSON.stringify({ ...summary(), status: "applied", ...result }, null, 2)); } catch (error) { await client.query("rollback").catch(() => {}); throw error; } finally { client.release(); await pool.end(); } }
main().catch(async (error) => { console.error(error instanceof Error ? error.message : String(error)); await pool.end().catch(() => {}); process.exit(1); });
