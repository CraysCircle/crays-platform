import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_EVIDENCE_PACKAGES === "APPLY_EVIDENCE_PACKAGES_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-evidence-packages-20260713-v1";

if (!connectionString) { console.error("CRAYS_DATABASE_URL is required."); process.exit(1); }
if (apply && !confirm) { console.error("Set CONFIRM_CRAYS_EVIDENCE_PACKAGES=APPLY_EVIDENCE_PACKAGES_SOURCE_SLICE to apply Evidence Packages source records."); process.exit(1); }

const pool = new Pool({ connectionString, max: 3, ssl: process.env.CRAYS_DATABASE_SSL === "require" ? { rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined, options: "-c crays.app_role=core_service" });
const digest = (value, length = 24) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, length);
const slug = (value) => String(value).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);

const boundaries = { uploadEnabled: false, privatePreviewEnabled: false, fileBodyAccessEnabled: false, packageReleaseEnabled: false, externalSendingEnabled: false, bankSendEnabled: false, sourceWritesEnabled: false, syncApplyEnabled: false, toolApplyEnabled: false, financePostingEnabled: false, liveAiEnabled: false };
const deal = { preparedOfferId: "prepared_franchise_deal_munich_rotkreuzplatz_schneider_fitness", propertyCaseId: "property_case_gudrunstrasse_3_rotkreuzplatz", dealId: "deal_munich_rotkreuzplatz_schneider_fitness", studioId: "studio_munich_rotkreuzplatz", studioName: "Munich Rotkreuzplatz", candidateName: "Lea Schneider", partnerCompany: "Schneider Fitness Beteiligungs GmbH", bankPartner: "Isar Commercial Finance AG" };

const packageDefinitions = [
  { key: "candidate", label: "Lea Schneider candidate decision package", audience: "Franchise Candidate", owner: "Deal Manager", status: "blocked", dueDate: "2026-07-16", context: "Candidate-safe investment, location, financing and checklist evidence for the Munich Rotkreuzplatz decision.", sourceSystems: ["candidate-offer-engine", "financial-workbook", "financial-forecast-5y", "location-intelligence"], sections: [["offer", "Offer and investment summary", "ready"], ["location", "Location demand proof", "ready"], ["financing", "Financing readiness summary", "attention"]] },
  { key: "partner", label: "Schneider Fitness partner investment package", audience: "Franchise Partner", owner: "Deal Manager", status: "blocked", dueDate: "2026-07-16", context: "Partner decision evidence covering investment, operating proof, bank/lease conditions and opening readiness.", sourceSystems: ["franchise-partner-decision-engine", "candidate-offer-engine", "opening-project-engine"], sections: [["investment", "Investment case", "ready"], ["conditions", "Bank and lease conditions", "blocked"], ["opening", "Opening readiness", "attention"]] },
  { key: "bank", label: "Munich Rotkreuzplatz credit evidence package", audience: "Bank Partner", owner: "CRAYS Finance", status: "blocked", dueDate: "2026-07-15", context: "Credit evidence for Isar Commercial Finance with finance, forecast, location, lease and proof-of-funds metadata.", sourceSystems: ["bank-package-engine", "financial-workbook", "financial-forecast-5y", "real-estate-decision-engine"], sections: [["credit", "Credit metrics", "ready"], ["funds", "Equity and proof of funds", "attention"], ["lease", "Lease and location appendix", "blocked"]] },
  { key: "real-estate", label: "Gudrunstrasse 3 lease decision package", audience: "Real Estate Partner", owner: "Expansion Manager", status: "blocked", dueDate: "2026-07-15", context: "Lease economics, demand, fit-out and property evidence without candidate, bank or internal finance workpapers.", sourceSystems: ["real-estate-decision-engine", "location-intelligence", "financial-workbook"], sections: [["property", "Property evidence", "ready"], ["economics", "Lease economics", "attention"], ["fitout", "Fit-out and handover", "blocked"]] },
  { key: "finance", label: "Munich Rotkreuzplatz finance review package", audience: "CRAYS Finance", owner: "CRAYS Finance", status: "attention", dueDate: "2026-07-15", context: "Internal finance evidence joining workbook, forecast, ledger preview, bank conditions and opening cash impacts.", sourceSystems: ["financial-workbook", "financial-forecast-5y", "erp-engine", "bank-package-engine", "opening-project-engine"], sections: [["model", "Financial model and forecast", "ready"], ["ledger", "Ledger and payment evidence", "attention"], ["cash", "Opening cash impacts", "attention"]] },
  { key: "opening", label: "Munich Rotkreuzplatz opening launch package", audience: "Franchise Partner", owner: "Deal Manager", status: "blocked", dueDate: "2026-07-17", context: "Permits, construction, equipment, staffing, training and launch evidence for the owned Opening Project.", sourceSystems: ["opening-project-engine", "franchise-partner-decision-engine", "financial-forecast-5y"], sections: [["permits", "Permits and property handover", "blocked"], ["build", "Construction and equipment", "attention"], ["people", "Staff, training and launch", "attention"]] },
  { key: "support", label: "Felix Hartmann support recovery evidence package", audience: "Studio Manager", owner: "Studio Manager", status: "blocked", dueDate: "2026-07-14", context: "Member-safe case, payment, access, SLA and recovery evidence for the Berlin Mitte support escalation.", sourceSystems: ["support-recovery-engine", "member-app", "erp-engine", "operations-engine"], sections: [["case", "Case and SLA evidence", "blocked"], ["payment", "Payment recovery context", "attention"], ["access", "Access recovery decision", "attention"]] },
];

function entityType(family) { return ["evidence-item", "evidence-version", "package-section"].includes(family) ? "document" : "evidence-package"; }
function record(family, externalId, label, fields) {
  return { family, externalId, label, craysEntityType: entityType(family), craysEntityId: `${family.replaceAll("-", "_")}_${slug(externalId)}`, status: fields.status, owner: fields.ownerRole, dueDate: fields.dueDate, syncStatus: ["blocked", "required"].includes(fields.status) ? "conflict" : "synced", fields: { ...deal, moduleKey: "files", seedBatch, ...boundaries, ...fields } };
}

const records = [];
for (const pkg of packageDefinitions) {
  const packageId = `evidence_package_${pkg.key.replaceAll("-", "_")}`;
  records.push(record("package-summary", packageId, pkg.label, { packageId, packageKey: pkg.key, audience: pkg.audience, ownerRole: pkg.owner, status: pkg.status, priority: pkg.status === "blocked" ? "critical" : "high", dueDate: pkg.dueDate, value: pkg.sections.length, unit: "sections", context: pkg.context, currentState: `Package is assembled from ${pkg.sourceSystems.length} verified source families; release remains closed.`, nextAction: "Review section, redaction, approval and release-preflight blockers.", sourceSystems: pkg.sourceSystems, releaseState: "release_blocked" }));
  for (const [sectionKey, sectionLabel, status] of pkg.sections) records.push(record("package-section", `${packageId}_${sectionKey}`, sectionLabel, { packageId, packageKey: pkg.key, sectionKey, audience: pkg.audience, ownerRole: status === "blocked" ? "Reviewer" : pkg.owner, status, priority: status === "blocked" ? "critical" : status === "attention" ? "high" : "medium", dueDate: pkg.dueDate, value: status, unit: "state", context: `${sectionLabel} belongs to ${pkg.label} and is sourced from ${pkg.sourceSystems.join(", ")}.`, currentState: status === "ready" ? "Required source metadata is linked." : status === "blocked" ? "A required evidence or redaction decision is unresolved." : "Evidence review is in progress.", nextAction: status === "ready" ? "Keep section in package review." : "Resolve the section blocker before release preflight.", sourceSystems: pkg.sourceSystems }));
  records.push(record("redaction-rule", `${packageId}_redaction`, `${pkg.audience} package redaction rule`, { packageId, packageKey: pkg.key, audience: pkg.audience, ownerRole: "Reviewer", status: "required", priority: "critical", dueDate: pkg.dueDate, value: "required", unit: "state", context: pkg.key === "support" ? "Internal notes and unrelated member data remain hidden from the support evidence scope." : `Restricted person, finance, bank and owner workpapers outside ${pkg.audience} scope remain hidden.`, currentState: "Redaction rule is defined and awaits package-specific reviewer confirmation.", nextAction: "Confirm visible and hidden fields before any release decision.", redactionReason: "Audience scope and least-privilege evidence access." }));
  records.push(record("approval-step", `${packageId}_approval`, `${pkg.label} approval review`, { packageId, packageKey: pkg.key, audience: pkg.audience, ownerRole: pkg.key === "finance" ? "CRAYS Finance" : "Reviewer", status: "waiting_review", priority: "high", dueDate: pkg.dueDate, value: "waiting_review", unit: "state", context: "Approval records package completeness and audience scope without releasing it.", currentState: "Approval is waiting for section and redaction evidence.", nextAction: "Stage an internal visibility review command after blockers are inspected." }));
  records.push(record("release-preflight", `${packageId}_preflight`, `${pkg.label} release preflight`, { packageId, packageKey: pkg.key, audience: pkg.audience, ownerRole: "Reviewer", status: "blocked", priority: "critical", dueDate: pkg.dueDate, value: false, unit: "boolean", context: "Release preflight proves package scope, missing evidence, redactions and approvals while release/send remain disabled.", currentState: "Release, external send and private preview are closed.", nextAction: "Review blockers and keep release closed until an exact future gate decision.", releaseGate: `OPEN_DEV_${pkg.key.replaceAll("-", "_").toUpperCase()}_PACKAGE_RELEASE` }));
}

const evidenceItems = [
  ["candidate_financial_summary", "Candidate financial summary", "candidate", "ready", "CRAYS Finance", "financial-workbook"],
  ["candidate_location_summary", "Rotkreuzplatz demand summary", "candidate", "ready", "Expansion Manager", "location-intelligence"],
  ["partner_agreement_checklist", "Franchise agreement readiness checklist", "partner", "attention", "Deal Manager", "franchise-partner-decision-engine"],
  ["bank_equity_proof", "Lea Schneider equity proof metadata", "bank", "attention", "CRAYS Finance", "bank-package-engine"],
  ["bank_lease_appendix", "Gudrunstrasse 3 bank lease appendix", "bank", "blocked", "Expansion Manager", "real-estate-decision-engine"],
  ["property_floor_plan", "Gudrunstrasse 3 reviewed floor plan", "real-estate", "ready", "Expansion Manager", "real-estate-decision-engine"],
  ["property_handover_protocol", "Gudrunstrasse 3 handover protocol", "real-estate", "blocked", "Expansion Manager", "opening-project-engine"],
  ["finance_forecast_bridge", "Five-year forecast and ledger bridge", "finance", "attention", "CRAYS Finance", "financial-forecast-5y"],
  ["opening_permit_evidence", "Munich Rotkreuzplatz permit clearance evidence", "opening", "blocked", "Deal Manager", "opening-project-engine"],
  ["opening_equipment_schedule", "Opening equipment delivery schedule", "opening", "attention", "Studio Manager", "opening-project-engine"],
  ["support_sepa_return", "Felix Hartmann SEPA return metadata", "support", "attention", "CRAYS Finance", "erp-engine"],
  ["support_access_audit", "Felix Hartmann access recovery audit", "support", "blocked", "Studio Manager", "operations-engine"],
];
for (const [id, label, packageKey, status, ownerRole, sourceSystem] of evidenceItems) {
  const pkg = packageDefinitions.find((item) => item.key === packageKey);
  records.push(record("evidence-item", id, label, { packageId: `evidence_package_${packageKey.replaceAll("-", "_")}`, packageKey, audience: pkg.audience, ownerRole, status, priority: status === "blocked" ? "critical" : "high", dueDate: pkg.dueDate, value: status, unit: "state", context: `${label} is linked by metadata to ${sourceSystem}; no file body or private preview is returned.`, currentState: status === "ready" ? "Evidence metadata is reviewed." : status === "blocked" ? "Evidence is missing or fails package scope review." : "Evidence metadata needs reviewer confirmation.", nextAction: status === "ready" ? "Keep evidence linked to the package." : "Resolve evidence metadata before approval.", sourceSystem, fileBodyReturned: false }));
}

for (const pkg of packageDefinitions) {
  records.push(record("evidence-version", `${pkg.key}_package_version_1`, `${pkg.label} version 1`, {
    packageId: `evidence_package_${pkg.key.replaceAll("-", "_")}`,
    packageKey: pkg.key,
    audience: pkg.audience,
    ownerRole: pkg.owner,
    status: "ready",
    priority: "medium",
    dueDate: pkg.dueDate,
    value: 1,
    unit: "version",
    context: `Version 1 captures the current metadata-only assembly state for ${pkg.label}; no file body or private preview is stored.`,
    currentState: "Version metadata is immutable and linked to the current package review.",
    nextAction: "Compare the version metadata with current evidence and retain release closure.",
    versionNumber: 1,
    versionState: "review_snapshot",
    fileBodyReturned: false,
  }));
}

for (const [id, label, packageKey, ownerRole] of [
  ["candidate_visibility_review", "Review candidate-safe package visibility", "candidate", "Reviewer"],
  ["partner_condition_review", "Review partner condition evidence", "partner", "Deal Manager"],
  ["bank_evidence_review", "Review bank evidence completeness", "bank", "CRAYS Finance"],
  ["property_redaction_review", "Review property package redactions", "real-estate", "Expansion Manager"],
  ["finance_package_review", "Review finance evidence bridge", "finance", "CRAYS Finance"],
  ["opening_package_review", "Review opening package blockers", "opening", "Deal Manager"],
  ["support_evidence_review", "Review support recovery evidence", "support", "Studio Manager"],
]) records.push(record("review-action", id, label, { packageId: `evidence_package_${packageKey.replaceAll("-", "_")}`, packageKey, audience: packageDefinitions.find((item) => item.key === packageKey).audience, ownerRole, status: "attention", priority: "high", dueDate: "2026-07-15", value: "attention", unit: "state", context: "Internal review command records the next evidence decision without applying or releasing the package.", currentState: "Review action is ready to stage as a guarded Core command draft.", nextAction: "Stage visibility review; package apply and release remain closed." }));

function grouped() { return records.reduce((acc, item) => { acc[item.family] ??= []; acc[item.family].push(item); return acc; }, {}); }
function mapId(item) { return `map_${digest({ system: "evidence-packages-engine", family: item.family, id: item.externalId }, 30)}`; }
function proof(item) { return { id: item.externalId, label: item.label, status: item.status, owner: item.owner, dueDate: item.dueDate, fields: item.fields }; }

async function persist(client) {
  const connection = "core_source_evidence_packages"; const system = "evidence-packages-engine"; const groups = grouped(); const jobId = `sync_job_${digest([seedBatch, generatedAt, records.length], 28)}`;
  await client.query(`insert into crays_core.integration_connections (connection_id,module_key,system_key,connection_name,owner_role,status,connection_mode,secret_reference_status,connection_health,metadata,updated_at) values ($1,'files',$2,'Evidence Packages workflow source slice','reviewer','active','sync_read_model','configured_reference','healthy',$3::jsonb,now()) on conflict (connection_id) do update set status=excluded.status,connection_mode=excluded.connection_mode,secret_reference_status=excluded.secret_reference_status,connection_health=excluded.connection_health,metadata=excluded.metadata,updated_at=now()`, [connection, system, JSON.stringify({ moduleKey: "files", seedBatch, generatedAt, rowsSeen: records.length, families: Object.keys(groups).sort(), ...boundaries })]);
  await client.query(`insert into crays_core.sync_jobs (job_id,connection_id,job_type,direction,status,attempt_count,payload_summary,scheduled_at,started_at,finished_at,updated_at) values ($1,$2,'read_sync','read','succeeded',1,$3::jsonb,now(),now(),now(),now()) on conflict (job_id) do update set status=excluded.status,attempt_count=crays_core.sync_jobs.attempt_count+1,payload_summary=excluded.payload_summary,started_at=excluded.started_at,finished_at=excluded.finished_at,updated_at=now()`, [jobId, connection, JSON.stringify({ moduleKey: "files", seedBatch, generatedAt, rowsSeen: records.length, families: Object.keys(groups).sort(), ...boundaries })]);
  let written = 0;
  for (const item of records) { const row = proof(item); const result = await client.query(`insert into crays_core.external_record_maps (map_id,crays_entity_type,crays_entity_id,external_system,external_entity_type,external_entity_id,sync_direction,sync_status,last_synced_at,metadata,updated_at) values ($1,$2,$3,$4,$5,$6,'read',$7,now(),$8::jsonb,now()) on conflict (external_system,external_entity_type,external_entity_id) do update set crays_entity_type=excluded.crays_entity_type,crays_entity_id=excluded.crays_entity_id,sync_status=excluded.sync_status,last_synced_at=excluded.last_synced_at,metadata=excluded.metadata,updated_at=now()`, [mapId(item), item.craysEntityType, item.craysEntityId, system, item.family, item.externalId, item.syncStatus, JSON.stringify({ moduleKey: "files", sectionKey: item.family, seedBatch, syncJobId: jobId, snapshotGeneratedAt: generatedAt, row, sourceDigest: digest(row, 32) })]); written += result.rowCount ?? 0; }
  return { connection, system, rowsSeen: records.length, mapsWritten: written };
}

function summary(status = "dry_run") { const groups = grouped(); return { status, apply, seedBatch, records: records.length, families: Object.entries(groups).map(([family, items]) => ({ family, records: items.length, conflicts: items.filter((item) => item.syncStatus === "conflict").length })), conflicts: records.filter((item) => item.syncStatus === "conflict").length, target: getRedactedDatabaseTarget(connectionString), gates: { ...boundaries, destructiveResetEnabled: false } }; }
async function main() { if (!apply) { console.log(JSON.stringify(summary(), null, 2)); return; } const client = await pool.connect(); try { await client.query("begin"); const result = await persist(client); await client.query("commit"); console.log(JSON.stringify({ ...summary("applied"), ...result }, null, 2)); } catch (error) { await client.query("rollback").catch(() => {}); throw error; } finally { client.release(); await pool.end(); } }
main().catch(async (error) => { await pool.end().catch(() => {}); console.error(JSON.stringify({ status: "failed", message: error instanceof Error ? error.message : "Unknown Evidence Packages seed failure." }, null, 2)); process.exit(1); });
