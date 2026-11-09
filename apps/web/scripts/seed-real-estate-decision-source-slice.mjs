import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_REAL_ESTATE_DECISION === "APPLY_REAL_ESTATE_DECISION_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-real-estate-decision-20260713-v1";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_REAL_ESTATE_DECISION=APPLY_REAL_ESTATE_DECISION_SOURCE_SLICE to apply Real Estate Decision source records.");
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

function digest(value, length = 24) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, length);
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

const baseFields = {
  moduleKey: "project",
  seedBatch,
  sourceAsOf: "2026-07-13",
  decisionId: "real_estate_decision_munich_rotkreuzplatz_schneider_fitness",
  propertyCaseId: "property_case_gudrunstrasse_3_rotkreuzplatz",
  preparedOfferId: "prepared_franchise_deal_munich_rotkreuzplatz_schneider_fitness",
  dealId: "deal_case_munich_rotkreuzplatz_schneider_fitness",
  siteName: "Gudrunstrasse 3 Studio Lease",
  address: "Gudrunstrasse 3, 80634 Munich",
  city: "Munich",
  district: "Rotkreuzplatz",
  landlordCompany: "Keller & Brandt Real Estate GmbH",
  landlordContact: "Tobias Keller",
  candidateName: "Lea Schneider",
  candidateCompany: "Schneider Fitness Beteiligungs GmbH",
  sourceDatasets: ["project", "files-engine", "location-intelligence", "financial-workbook", "financial-forecast-5y", "bank-package-engine"],
  landlordReleaseEnabled: false,
  ownerSendEnabled: false,
  leaseSigningEnabled: false,
  packagePublicationEnabled: false,
  uploadsEnabled: false,
  externalSendingEnabled: false,
  sourceWritesEnabled: false,
  syncApplyEnabled: false,
  targetApplyEnabled: false,
  financePostingEnabled: false,
  paymentInitiationEnabled: false,
  liveAiEnabled: false,
};

function entityTypeForFamily(family) {
  if (family === "lease-decision-summary") return "property-case";
  if (family === "lease-economics") return "property-case";
  if (family === "location-fit") return "location-analysis";
  if (family === "property-evidence") return "document";
  if (family === "financial-fit") return "financial-model";
  if (family === "release-redactions") return "evidence-package";
  if (family === "real-estate-review-actions") return "property-case";
  return "property-case";
}

function record(family, externalId, label, fields, options = {}) {
  return {
    family,
    externalId,
    label,
    craysEntityType: options.craysEntityType ?? entityTypeForFamily(family),
    craysEntityId: options.craysEntityId ?? `${entityTypeForFamily(family).replaceAll("-", "_")}_${slug(externalId)}`,
    owner: options.owner ?? fields.ownerRole ?? "Expansion Manager",
    status: options.status ?? fields.status ?? "review",
    priority: options.priority ?? fields.priority ?? "medium",
    syncStatus: options.syncStatus ?? (fields.status === "blocked" || fields.priority === "critical" ? "conflict" : "synced"),
    dueDate: options.dueDate ?? fields.dueDate ?? "2026-07-22",
    fields: { ...baseFields, ...fields },
  };
}

const records = [
  record("lease-decision-summary", "decision_scope_munich_rotkreuzplatz", "Munich Rotkreuzplatz lease decision scope", {
    status: "attention",
    priority: "high",
    audience: "Real Estate Partner",
    readinessScore: 78,
    leaseDecisionState: "internal_review",
    currentState: "Location fit, financial plan and bank package are assembled for internal lease decision review.",
    nextAction: "Resolve redactions and lease appendix evidence before partner-facing decision package can be prepared.",
    href: "/project?role=expansion-manager&view=real-estate-decision",
  }),
  record("lease-decision-summary", "landlord_scoped_preview", "Keller & Brandt scoped lease preview", {
    status: "release_blocked",
    priority: "high",
    audience: "Real Estate Partner",
    visibleForLandlord: true,
    currentState: "Real Estate Partner can inspect scoped lease fit only after review; no release or send is open.",
    nextAction: "Keep partner preview release-gated until Reviewer clears hidden sections.",
    href: "/project?role=landlord&view=real-estate-decision",
  }),
  record("lease-decision-summary", "decision_audience_map", "Real estate stakeholder audience map", {
    status: "review_ready",
    priority: "medium",
    ownerRole: "Reviewer",
    audience: "Reviewer",
    visibleForLandlord: ["site address", "lease terms", "fit-out schedule", "rent ratio", "operator company", "evidence checklist"],
    hiddenForLandlord: ["candidate private notes", "member-level payments", "bank workpapers", "internal finance sensitivity", "unreleased support incidents"],
    currentState: "Audience scope is defined, but release remains closed.",
    nextAction: "Confirm redaction matrix before any partner-facing package is shared.",
    href: "/dashboard?role=reviewer&view=rooms",
  }),

  ...[
    ["Monthly base rent", "monthly_base_rent", 4158, "EUR", "ready", "Lease rent basis uses EUR 11 per sqm for 378 sqm."],
    ["Rent per square meter", "rent_per_sqm", 11, "EUR_per_sqm", "ready", "Rent per square meter matches the current lease draft."],
    ["Year-3 rent ratio", "year3_rent_ratio", 0.098, "percent", "ready", "Mid-Case year-3 rent ratio stays below internal comfort threshold."],
    ["Year-5 rent ratio", "year5_rent_ratio", 0.0853, "percent", "ready", "Forecast year-5 rent ratio supports long-run lease sustainability."],
    ["Fit-out investment per square meter", "fitout_capex_per_sqm", 746, "EUR_per_sqm", "attention", "Fit-out investment is benchmarked but supplier evidence must stay linked."],
    ["Deposit and guarantee requirement", "deposit_guarantee", 24948, "EUR", "attention", "Six-month security package is planned but guarantee wording needs legal review."],
    ["Break option alignment", "break_option_alignment", 0.72, "score", "blocked", "Lease break option does not yet align with debt payback and opening timeline."],
  ].map(([label, key, value, unit, status, context]) =>
    record("lease-economics", `lease_metric_${key}`, label, {
      status,
      priority: status === "blocked" ? "critical" : status === "attention" ? "high" : "medium",
      audience: "Real Estate Partner",
      metricKey: key,
      value,
      unit,
      context,
      nextAction: status === "ready" ? "Keep lease metric in decision package." : "Resolve lease economics item before partner-facing decision review.",
      href: "/project?role=expansion-manager&view=real-estate-decision",
    }),
  ),

  ...[
    ["Locality confidence", "locality_confidence", 0.82, "score", "ready", "Catchment, accessibility and competition evidence support this site."],
    ["Mid-Case member potential", "mid_case_member_potential", 1250, "members", "ready", "Validated member potential supports the rent-to-revenue profile."],
    ["Transit catchment depth", "transit_catchment_depth", 1390, "members", "ready", "Transit catchment supports daytime and after-work demand."],
    ["Competition pressure", "competition_pressure", 0.31, "score", "attention", "Competition pressure requires a differentiation note before partner release."],
    ["Peak-hour access score", "peak_hour_access", 0.86, "score", "ready", "Peak-hour access supports the opening schedule and member capacity plan."],
    ["Residential density fit", "residential_density_fit", 0.79, "score", "ready", "Local residential density supports recurring gym visits."],
  ].map(([label, key, value, unit, status, context]) =>
    record("location-fit", `location_fit_${key}`, label, {
      status,
      priority: status === "attention" ? "high" : "medium",
      ownerRole: "Expansion Manager",
      audience: "Real Estate Partner",
      metricKey: key,
      value,
      unit,
      context,
      nextAction: status === "attention" ? "Attach location differentiation note before partner review." : "Keep location metric in lease decision package.",
      href: "/analytics?role=expansion-manager&view=location-intelligence",
    }),
  ),

  ...[
    ["Lease draft v4", "lease_draft_v4", "review", "Lease term, indexation and break option language need final legal review."],
    ["Floor plan and usable area confirmation", "floor_plan_usable_area", "approved", "378 sqm usable area is confirmed for the financial plan."],
    ["Building permit status note", "building_permit_status", "attention", "Permit assumptions are plausible but not yet partner-ready."],
    ["Technical fit-out checklist", "technical_fitout_checklist", "ready", "Electrical, ventilation and access assumptions are linked to opening project tasks."],
    ["Landlord guarantee term sheet", "landlord_guarantee_term_sheet", "blocked", "Guarantee wording must be reviewed before any partner-facing package."],
    ["Neighborhood frontage photos", "frontage_photos", "approved", "Frontage evidence supports site visibility assessment."],
    ["Ownership registry extract", "ownership_registry_extract", "required", "Current owner record must be attached before release review."],
  ].map(([label, key, status, context]) =>
    record("property-evidence", `property_evidence_${key}`, label, {
      status,
      priority: status === "blocked" ? "critical" : status === "required" || status === "attention" ? "high" : "medium",
      ownerRole: status === "blocked" ? "Reviewer" : "Expansion Manager",
      audience: "Real Estate Partner",
      sourceSystem: "files-engine",
      context,
      nextAction: status === "approved" || status === "ready" ? "Keep evidence linked to lease decision package." : "Resolve evidence item before Real Estate Partner release can be prepared.",
      href: "/files?role=expansion-manager&view=packages&record=real-estate",
    }),
  ),

  ...[
    ["Mid-Case Year-3 revenue", "mid_case_year3_revenue", 506592, "EUR", "ready", "Financial plan supports the rent ratio and operating affordability narrative."],
    ["Mid-Case Year-5 revenue", "mid_case_year5_revenue", 689755, "EUR", "ready", "Five-year forecast supports long-run lease viability."],
    ["Cash break-even members", "cash_break_even_members", 537, "members", "ready", "Break-even membership is below location potential and year-3 plan."],
    ["Payback time", "payback_years", 1.4, "years", "ready", "Payback time supports partner confidence in fit-out commitment."],
    ["Bank package readiness", "bank_package_readiness", 0.82, "score", "attention", "Bank package is assembled but release and send gates remain closed."],
    ["Ledger quality bridge", "ledger_quality_bridge", 531.41, "EUR", "blocked", "Open ERP finance ledger quality item must be resolved before lease package sign-off."],
  ].map(([label, key, value, unit, status, context]) =>
    record("financial-fit", `financial_fit_${key}`, label, {
      status,
      priority: status === "blocked" ? "critical" : status === "attention" ? "high" : "medium",
      ownerRole: "CRAYS Finance",
      audience: "Real Estate Partner",
      metricKey: key,
      value,
      unit,
      context,
      nextAction: status === "ready" ? "Keep financial metric in decision package." : "Resolve finance package dependency before partner decision review.",
      href: status === "attention" ? "/loans?role=finance&view=bank-package" : "/analytics?role=finance&view=financial-model",
    }),
  ),

  ...[
    ["Candidate private notes redaction", "candidate_private_notes", "ready", "Candidate notes remain hidden from Real Estate Partner package."],
    ["Bank workpaper redaction", "bank_workpapers", "ready", "Bank package workpapers are not included in real estate partner view."],
    ["Internal finance sensitivity redaction", "internal_finance_sensitivity", "blocked", "Internal rent sensitivity notes need redaction before any partner release."],
    ["Landlord contact routing", "landlord_contact_routing", "required", "Partner communication must route through Expansion; direct external send remains closed."],
  ].map(([label, key, status, context]) =>
    record("release-redactions", `redaction_${key}`, label, {
      status,
      priority: status === "blocked" ? "critical" : status === "required" ? "high" : "medium",
      ownerRole: "Reviewer",
      audience: "Reviewer",
      context,
      nextAction: status === "ready" ? "Keep redaction in release preflight." : "Resolve redaction before Real Estate Partner release can be prepared.",
      href: "/dashboard?role=reviewer&view=rooms",
    }),
  ),

  ...[
    ["Lease economics review", "lease_economics_review", "blocked", "Expansion Manager", "Resolve break option, guarantee language and evidence blockers before partner review."],
    ["Finance fit review", "finance_fit_review", "blocked", "CRAYS Finance", "Classify bank package and ledger quality dependencies before lease decision sign-off."],
    ["Reviewer release preflight", "reviewer_release_preflight", "blocked", "Reviewer", "Confirm audience, hidden sections and redactions before any partner-facing release."],
    ["Landlord question set", "landlord_question_set", "attention", "Expansion Manager", "Prepare partner questions internally; no external message is sent."],
    ["Decision package sign-off", "decision_package_signoff", "blocked", "CRAYS Management", "Management sign-off is blocked until lease, finance and redaction items are clear."],
  ].map(([label, key, status, ownerRole, context]) =>
    record("real-estate-review-actions", `review_action_${key}`, label, {
      status,
      priority: status === "blocked" ? "critical" : "high",
      ownerRole,
      audience: "CRAYS Management",
      workItemKey: key,
      context,
      nextAction: "Stage guarded Real Estate Decision review command; release, send, upload and apply remain closed.",
      href: "/dashboard?role=expansion-manager&view=actions",
    }),
  ),
];

function grouped() {
  return records.reduce((acc, item) => {
    acc[item.family] ??= [];
    acc[item.family].push(item);
    return acc;
  }, {});
}

function sectionLabel(family) {
  return family.split("-").map((part) => part.slice(0, 1).toUpperCase() + part.slice(1)).join(" ");
}

function mapId(item) {
  return `map_${digest({ moduleKey: "project", sectionKey: item.family, rowId: item.externalId }, 30)}`;
}

function row(item) {
  return {
    id: item.externalId,
    label: item.label,
    status: item.status,
    owner: item.owner,
    modifiedAt: generatedAt,
    role: "expansion-manager",
    dueDate: item.dueDate,
    priority: item.priority,
    fields: item.fields,
  };
}

async function persist(client) {
  const connectionId = "core_source_real_estate_decision";
  const systemKey = "real-estate-decision-engine";
  const groupedRecords = grouped();
  const jobId = `sync_job_${digest(["real-estate-decision", generatedAt, records.length], 28)}`;

  await client.query(
    `
      insert into crays_core.integration_connections (
        connection_id, module_key, system_key, connection_name, owner_role, status,
        connection_mode, secret_reference_status, connection_health, metadata, updated_at
      )
      values ($1, 'project', $2, 'Real Estate Decision source slice', 'admin', 'active', 'sync_read_model', 'configured_reference', 'healthy', $3::jsonb, now())
      on conflict (connection_id) do update set
        status = excluded.status,
        connection_mode = excluded.connection_mode,
        secret_reference_status = excluded.secret_reference_status,
        connection_health = excluded.connection_health,
        metadata = excluded.metadata,
        updated_at = now()
    `,
    [connectionId, systemKey, JSON.stringify({ ...baseFields, generatedAt, rowsSeen: records.length, families: Object.keys(groupedRecords).sort() })],
  );

  await client.query(
    `
      insert into crays_core.sync_jobs (
        job_id, connection_id, job_type, direction, status, attempt_count,
        crays_entity_type, crays_entity_id, payload_summary, scheduled_at, started_at, finished_at, updated_at
      )
      values ($1, $2, 'read_sync', 'read', 'succeeded', 1, 'property-case', 'property_case_gudrunstrasse_3_rotkreuzplatz', $3::jsonb, now(), now(), now(), now())
      on conflict (job_id) do update set
        status = excluded.status,
        attempt_count = crays_core.sync_jobs.attempt_count + 1,
        payload_summary = excluded.payload_summary,
        started_at = excluded.started_at,
        finished_at = excluded.finished_at,
        updated_at = now()
    `,
    [jobId, connectionId, JSON.stringify({ ...baseFields, generatedAt, rowsSeen: records.length, families: Object.keys(groupedRecords).sort() })],
  );

  let written = 0;
  for (const item of records) {
    const sourceRow = row(item);
    const result = await client.query(
      `
        insert into crays_core.external_record_maps (
          map_id, crays_entity_type, crays_entity_id, external_system, external_entity_type,
          external_entity_id, sync_direction, sync_status, last_synced_at, metadata, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, 'read', $7, now(), $8::jsonb, now())
        on conflict (external_system, external_entity_type, external_entity_id) do update set
          crays_entity_type = excluded.crays_entity_type,
          crays_entity_id = excluded.crays_entity_id,
          sync_status = excluded.sync_status,
          last_synced_at = excluded.last_synced_at,
          metadata = excluded.metadata,
          updated_at = now()
      `,
      [
        mapId(item),
        item.craysEntityType,
        item.craysEntityId,
        systemKey,
        item.family,
        item.externalId,
        item.syncStatus,
        JSON.stringify({
          moduleKey: "project",
          seedBatch,
          sectionKey: item.family,
          sectionLabel: sectionLabel(item.family),
          syncJobId: jobId,
          snapshotGeneratedAt: generatedAt,
          row: sourceRow,
          sourceDigest: digest(sourceRow, 32),
        }),
      ],
    );
    written += result.rowCount ?? 0;
  }

  return { connectionId, systemKey, rowsSeen: records.length, mapsWritten: written };
}

function dryRunSummary() {
  return {
    status: "dry_run",
    apply,
    seedBatch,
    records: records.length,
    target: getRedactedDatabaseTarget(connectionString),
    families: Object.fromEntries(Object.entries(grouped()).map(([family, items]) => [family, items.length])),
    conflicts: records.filter((item) => item.syncStatus === "conflict").length,
    closedGates: {
      landlordReleaseEnabled: false,
      ownerSendEnabled: false,
      leaseSigningEnabled: false,
      packagePublicationEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      financePostingEnabled: false,
      paymentInitiationEnabled: false,
      liveAiEnabled: false,
    },
  };
}

async function main() {
  if (!apply) {
    console.log(JSON.stringify(dryRunSummary(), null, 2));
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await persist(client);
    await client.query("commit");
    console.log(JSON.stringify({ ...dryRunSummary(), status: "applied", seedBatch, ...result }, null, 2));
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (error) => {
  await pool.end().catch(() => {});
  console.error(JSON.stringify({ status: "failed", message: error instanceof Error ? error.message : "Unknown seed failure." }, null, 2));
  process.exit(1);
});
