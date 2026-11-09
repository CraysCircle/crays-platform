import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_OPENING_PROJECT === "APPLY_OPENING_PROJECT_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-opening-project-20260713-v1";
const systemKey = "opening-project-engine";
const connectionId = "core_source_opening_project";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}
if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_OPENING_PROJECT=APPLY_OPENING_PROJECT_SOURCE_SLICE to apply Opening Project source records.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  max: Number.parseInt(process.env.CRAYS_DATABASE_POOL_MAX ?? "5", 10),
  ssl: process.env.CRAYS_DATABASE_SSL === "require" ? { rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined,
  options: "-c crays.app_role=core_service",
});

const digest = (value, length = 24) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, length);
const slug = (value) => String(value).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);

const baseFields = {
  moduleKey: "project",
  seedBatch,
  sourceAsOf: "2026-07-13",
  projectId: "opening_project_munich_rotkreuzplatz_2026",
  decisionId: "partner_decision_munich_rotkreuzplatz_schneider_fitness",
  dealId: "deal_case_munich_rotkreuzplatz_schneider_fitness",
  propertyCaseId: "property_case_gudrunstrasse_3_rotkreuzplatz",
  partnerOrganizationId: "org_schneider_fitness_beteiligungs",
  partnerName: "Lea Schneider",
  partnerCompany: "Schneider Fitness Beteiligungs GmbH",
  studioId: "studio_munich_rotkreuzplatz_opening",
  studioName: "Munich Rotkreuzplatz Studio",
  siteName: "Gudrunstrasse 3 Studio Lease",
  address: "Gudrunstrasse 3, 80634 Munich",
  targetOpeningDate: "2026-10-01",
  projectApplyEnabled: false,
  sourceWritesEnabled: false,
  syncApplyEnabled: false,
  uploadsEnabled: false,
  privatePreviewEnabled: false,
  externalSendingEnabled: false,
  stakeholderReleaseEnabled: false,
  financePostingEnabled: false,
  paymentInitiationEnabled: false,
  bankSendEnabled: false,
  liveAiEnabled: false,
};

const entityTypeForFamily = (family) => family === "evidence-link" ? "document" : family === "forecast-impact" ? "financial-model" : "deal";

function record(family, externalId, label, fields) {
  const status = fields.status ?? "attention";
  const priority = fields.priority ?? "medium";
  return {
    family,
    externalId,
    label,
    craysEntityType: entityTypeForFamily(family),
    craysEntityId: `${entityTypeForFamily(family).replaceAll("-", "_")}_${slug(externalId)}`,
    owner: fields.ownerRole ?? "Deal Manager",
    status,
    priority,
    dueDate: fields.dueDate ?? "2026-09-30",
    syncStatus: status === "blocked" || priority === "critical" ? "conflict" : "synced",
    fields: { ...baseFields, ...fields },
  };
}

const summaryRecords = [
  record("project-summary", "opening_readiness", "Munich Rotkreuzplatz opening readiness", { metricKey: "opening_readiness", value: 68, unit: "score", status: "attention", priority: "high", ownerRole: "Deal Manager", audience: "Franchise Partner", context: "The accepted partner decision is converted into an executable opening plan.", currentState: "Schedule is viable but permit, fit-out and staffing dependencies remain open.", nextAction: "Resolve the critical path before confirming the opening baseline.", dueDate: "2026-07-20" }),
  record("project-summary", "target_opening", "Target opening date", { metricKey: "target_opening_date", value: "2026-10-01", unit: "date", status: "attention", priority: "high", ownerRole: "Operations", audience: "Franchise Partner", context: "Opening date is linked to lease, construction, equipment, staffing and training dependencies.", currentState: "The date remains achievable with twelve days of schedule contingency.", nextAction: "Review critical dependencies and preserve the contingency window.", dueDate: "2026-07-20" }),
  record("project-summary", "critical_path", "Opening critical path", { metricKey: "critical_path_items", value: 5, unit: "records", status: "blocked", priority: "critical", ownerRole: "Deal Manager", audience: "Reviewer", context: "Five dependencies can move the opening date or increase pre-opening cash use.", currentState: "Permit confirmation and electrical fit-out sign-off are the leading blockers.", nextAction: "Stage an internal critical-path review.", dueDate: "2026-07-17" }),
];

const milestoneData = [
  ["lease_handover", "Lease handover complete", "2026-07-18", "Expansion Manager", "ready", "medium", 100],
  ["permit_clearance", "Permit clearance", "2026-07-24", "Expansion Manager", "blocked", "critical", 55],
  ["construction_start", "Construction start", "2026-07-27", "Fit-out Lead", "attention", "high", 25],
  ["fit_out_complete", "Fit-out complete", "2026-09-04", "Fit-out Lead", "attention", "high", 10],
  ["equipment_installed", "Equipment installed", "2026-09-11", "Operations", "attention", "high", 15],
  ["staff_roster_ready", "Staff roster ready", "2026-09-08", "Studio Manager", "attention", "high", 35],
  ["partner_training_complete", "Partner training complete", "2026-09-15", "Learning Lead", "attention", "medium", 20],
  ["presales_launch", "Pre-sales launch", "2026-08-17", "Growth Lead", "attention", "medium", 30],
  ["operational_readiness", "Operational readiness review", "2026-09-22", "Operations", "attention", "high", 5],
  ["studio_opening", "Studio opening", "2026-10-01", "Franchise Partner", "attention", "high", 0],
];
const milestones = milestoneData.map(([id, label, dueDate, ownerRole, status, priority, progress]) => record("milestone", id, label, { metricKey: id, value: progress, unit: "percent", status, priority, ownerRole, audience: "Franchise Partner", dueDate, context: `${label} is part of the approved opening baseline.`, currentState: `${progress}% complete.`, nextAction: status === "ready" ? "Keep milestone evidence current." : `Complete the next dependency before ${dueDate}.` }));

const workItemData = [
  ["OPN-101", "Confirm municipal permit evidence", "2026-07-17", "Expansion Manager", "blocked", "critical", "permit_clearance"],
  ["OPN-102", "Approve electrical fit-out drawing", "2026-07-20", "Fit-out Lead", "blocked", "critical", "construction_start"],
  ["OPN-103", "Lock construction sequence", "2026-07-22", "Fit-out Lead", "attention", "high", "construction_start"],
  ["OPN-104", "Confirm equipment delivery slots", "2026-08-07", "Operations", "attention", "high", "equipment_installed"],
  ["OPN-105", "Approve equipment floor plan", "2026-08-03", "Studio Manager", "attention", "high", "equipment_installed"],
  ["OPN-106", "Hire studio manager", "2026-08-05", "Franchise Partner", "attention", "high", "staff_roster_ready"],
  ["OPN-107", "Complete trainer recruitment shortlist", "2026-08-14", "Studio Manager", "attention", "medium", "staff_roster_ready"],
  ["OPN-108", "Book partner academy sessions", "2026-08-10", "Learning Lead", "attention", "medium", "partner_training_complete"],
  ["OPN-109", "Approve pre-sales launch plan", "2026-08-08", "Growth Lead", "attention", "high", "presales_launch"],
  ["OPN-110", "Configure member access readiness", "2026-09-10", "Operations", "attention", "medium", "operational_readiness"],
  ["OPN-111", "Run finance opening cash review", "2026-08-21", "CRAYS Finance", "attention", "high", "fit_out_complete"],
  ["OPN-112", "Run final opening readiness review", "2026-09-22", "Deal Manager", "attention", "high", "studio_opening"],
];
const workItems = workItemData.map(([identifier, label, dueDate, ownerRole, status, priority, milestoneId]) => record("work-item", identifier.toLowerCase(), label, { identifier, metricKey: identifier.toLowerCase(), value: "open", unit: "state", status, priority, ownerRole, audience: ownerRole === "CRAYS Finance" ? "Finance" : "Franchise Partner", dueDate, milestoneId, context: `${label} is an owned work item in the opening project.`, currentState: status === "blocked" ? "Blocked by an unresolved predecessor or evidence requirement." : "Ready for owner review and guarded command staging.", nextAction: "Review the task, dependency and evidence before staging the Project command draft." }));

const dependencyData = [
  ["permit_to_construction", "Permit clearance blocks construction start", "permit_clearance", "construction_start", 9, "blocked", "critical"],
  ["electrical_to_fitout", "Electrical drawing blocks fit-out sequence", "OPN-102", "fit_out_complete", 6, "blocked", "critical"],
  ["fitout_to_equipment", "Fit-out completion gates equipment installation", "fit_out_complete", "equipment_installed", 4, "attention", "high"],
  ["manager_to_roster", "Studio manager hire gates staff roster", "OPN-106", "staff_roster_ready", 3, "attention", "high"],
  ["training_to_readiness", "Partner training gates operational readiness", "partner_training_complete", "operational_readiness", 2, "attention", "medium"],
  ["readiness_to_opening", "Operational review gates studio opening", "operational_readiness", "studio_opening", 0, "attention", "high"],
];
const dependencies = dependencyData.map(([id, label, predecessorId, successorId, delayDays, status, priority]) => record("dependency", id, label, { metricKey: id, value: delayDays, unit: "days", status, priority, ownerRole: "Deal Manager", audience: "Reviewer", predecessorId, successorId, context: `${label}; current modeled schedule impact is ${delayDays} days.`, currentState: status === "blocked" ? "Critical predecessor is unresolved." : "Dependency is monitored in the opening baseline.", nextAction: "Resolve predecessor or record an approved schedule mitigation." }));

const evidenceData = [
  ["permit_pack", "Municipal permit evidence pack", "permit_clearance", "review", "Expansion Manager"],
  ["lease_handover_pack", "Lease handover evidence", "lease_handover", "ready", "Expansion Manager"],
  ["fitout_drawings", "Fit-out drawing set", "construction_start", "review", "Fit-out Lead"],
  ["equipment_schedule", "Equipment delivery schedule", "equipment_installed", "review", "Operations"],
  ["training_plan", "Partner training plan", "partner_training_complete", "review", "Learning Lead"],
];
const evidenceLinks = evidenceData.map(([id, label, linkedObjectId, status, ownerRole]) => record("evidence-link", id, label, { metricKey: id, value: status, unit: "state", status: status === "ready" ? "ready" : "attention", priority: status === "ready" ? "medium" : "high", ownerRole, audience: "Reviewer", linkedObjectId, filePackageId: `opening_${id}`, context: `${label} supports a project milestone without exposing file bodies.`, currentState: status === "ready" ? "Approved evidence metadata is linked." : "Evidence metadata is linked and awaits review.", nextAction: "Review evidence metadata in Files; upload and private preview remain closed." }));

const impactData = [
  ["permit_delay_cash", "Permit delay cash impact", 18300, "EUR", "blocked", "critical", "A nine-day permit delay increases pre-opening cash use."],
  ["fitout_delay_opening", "Fit-out delay opening impact", 6, "days", "attention", "high", "Electrical approval can move the fit-out completion date by six days."],
  ["equipment_delay_presales", "Equipment delay pre-sales impact", 4200, "EUR", "attention", "high", "A late equipment install reduces modeled pre-opening conversion value."],
  ["opening_contingency", "Opening schedule contingency", 12, "days", "attention", "medium", "Twelve days of remaining schedule contingency protect the October opening target."],
];
const forecastImpacts = impactData.map(([id, label, value, unit, status, priority, context]) => record("forecast-impact", id, label, { metricKey: id, value, unit, status, priority, ownerRole: "CRAYS Finance", audience: "Finance", context, currentState: context, nextAction: "Review the modeled impact with the linked dependency; finance posting remains closed." }));

const actionData = [
  ["critical_path_review", "Critical path review", "Deal Manager", "blocked", "critical", "Review permit and electrical blockers."],
  ["permit_evidence_review", "Permit evidence review", "Expansion Manager", "blocked", "critical", "Confirm permit metadata and owner."],
  ["fitout_sequence_review", "Fit-out sequence review", "Fit-out Lead", "attention", "high", "Confirm construction sequencing and dependencies."],
  ["partner_staffing_review", "Partner staffing review", "Franchise Partner", "attention", "high", "Confirm studio manager and trainer hiring plan."],
  ["opening_baseline_review", "Opening baseline review", "Operations", "attention", "high", "Confirm the schedule baseline and remaining contingency."],
];
const reviewActions = actionData.map(([id, label, ownerRole, status, priority, context]) => record("opening-review-actions", id, label, { metricKey: id, value: "review", unit: "state", status, priority, ownerRole, audience: ownerRole === "Franchise Partner" ? "Franchise Partner" : "Reviewer", context, currentState: context, nextAction: "Stage a guarded Project work-item command draft; no Project apply or external action is executed." }));

const records = [...summaryRecords, ...milestones, ...workItems, ...dependencies, ...evidenceLinks, ...forecastImpacts, ...reviewActions];
const grouped = () => records.reduce((result, item) => { (result[item.family] ??= []).push(item); return result; }, {});
const mapId = (item) => `src_${digest([systemKey, item.family, item.externalId], 32)}`;
const sourceRow = (item) => ({ id: item.externalId, label: item.label, family: item.family, owner: item.owner, status: item.status, priority: item.priority, dueDate: item.dueDate, fields: item.fields });

async function persist(client) {
  const families = Object.keys(grouped()).sort();
  const jobId = `sync_job_${digest([systemKey, generatedAt, records.length], 28)}`;
  const metadata = JSON.stringify({ ...baseFields, generatedAt, rowsSeen: records.length, families });
  await client.query(`insert into crays_core.integration_connections (connection_id,module_key,system_key,connection_name,owner_role,status,connection_mode,secret_reference_status,connection_health,metadata,updated_at) values ($1,'project',$2,'Opening Project source slice','admin','active','sync_read_model','configured_reference','healthy',$3::jsonb,now()) on conflict (connection_id) do update set status=excluded.status,connection_mode=excluded.connection_mode,connection_health=excluded.connection_health,metadata=excluded.metadata,updated_at=now()`, [connectionId, systemKey, metadata]);
  await client.query(`insert into crays_core.sync_jobs (job_id,connection_id,job_type,direction,status,attempt_count,crays_entity_type,crays_entity_id,payload_summary,scheduled_at,started_at,finished_at,updated_at) values ($1,$2,'read_sync','read','succeeded',1,'project',$3,$4::jsonb,now(),now(),now(),now()) on conflict (job_id) do update set status=excluded.status,attempt_count=crays_core.sync_jobs.attempt_count+1,payload_summary=excluded.payload_summary,started_at=excluded.started_at,finished_at=excluded.finished_at,updated_at=now()`, [jobId, connectionId, baseFields.projectId, metadata]);
  let written = 0;
  for (const item of records) {
    const row = sourceRow(item);
    const result = await client.query(`insert into crays_core.external_record_maps (map_id,crays_entity_type,crays_entity_id,external_system,external_entity_type,external_entity_id,sync_direction,sync_status,last_synced_at,metadata,updated_at) values ($1,$2,$3,$4,$5,$6,'read',$7,now(),$8::jsonb,now()) on conflict (external_system,external_entity_type,external_entity_id) do update set crays_entity_type=excluded.crays_entity_type,crays_entity_id=excluded.crays_entity_id,sync_status=excluded.sync_status,last_synced_at=excluded.last_synced_at,metadata=excluded.metadata,updated_at=now()`, [mapId(item), item.craysEntityType, item.craysEntityId, systemKey, item.family, item.externalId, item.syncStatus, JSON.stringify({ moduleKey: "project", seedBatch, sectionKey: item.family, syncJobId: jobId, snapshotGeneratedAt: generatedAt, row, sourceDigest: digest(row, 32) })]);
    written += result.rowCount ?? 0;
  }
  return { connectionId, systemKey, rowsSeen: records.length, mapsWritten: written };
}

function summary() {
  return { status: apply ? "apply_requested" : "dry_run", seedBatch, records: records.length, target: getRedactedDatabaseTarget(connectionString), families: Object.fromEntries(Object.entries(grouped()).map(([family, items]) => [family, items.length])), conflicts: records.filter((item) => item.syncStatus === "conflict").length, closedGates: { projectApplyEnabled: false, sourceWritesEnabled: false, syncApplyEnabled: false, uploadsEnabled: false, privatePreviewEnabled: false, externalSendingEnabled: false, stakeholderReleaseEnabled: false, financePostingEnabled: false, paymentInitiationEnabled: false, bankSendEnabled: false, liveAiEnabled: false } };
}

async function main() {
  if (!apply) { console.log(JSON.stringify(summary(), null, 2)); await pool.end(); return; }
  const client = await pool.connect();
  try { await client.query("begin"); const result = await persist(client); await client.query("commit"); console.log(JSON.stringify({ ...summary(), status: "applied", ...result }, null, 2)); }
  catch (error) { await client.query("rollback").catch(() => {}); throw error; }
  finally { client.release(); await pool.end(); }
}

main().catch(async (error) => { console.error(error instanceof Error ? error.message : String(error)); await pool.end().catch(() => {}); process.exit(1); });
