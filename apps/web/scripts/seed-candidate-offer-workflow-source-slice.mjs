import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_CANDIDATE_OFFER_WORKFLOW === "APPLY_CANDIDATE_OFFER_WORKFLOW_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-candidate-offer-workflow-20260713-v1";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_CANDIDATE_OFFER_WORKFLOW=APPLY_CANDIDATE_OFFER_WORKFLOW_SOURCE_SLICE to apply Candidate Offer workflow source records.");
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
  moduleKey: "crm",
  seedBatch,
  sourceAsOf: "2026-07-13",
  offerId: "prepared_franchise_deal_munich_rotkreuzplatz_schneider_fitness",
  dealId: "deal_case_munich_rotkreuzplatz_schneider_fitness",
  propertyCaseId: "property_case_gudrunstrasse_3_rotkreuzplatz",
  candidateAccountId: "acct_lea_schneider_candidate",
  candidateOrganizationId: "org_schneider_fitness_beteiligungs",
  candidateName: "Lea Schneider",
  candidateCompany: "Schneider Fitness Beteiligungs GmbH",
  siteName: "Gudrunstrasse 3 Studio Lease",
  address: "Gudrunstrasse 3, 80634 Munich",
  city: "Munich",
  district: "Rotkreuzplatz",
  landlordCompany: "Keller & Brandt Real Estate GmbH",
  bankPartner: "Isar Commercial Finance AG",
  packageId: "bank_package_munich_rotkreuzplatz_schneider_fitness",
  sourceDatasets: [
    "crm-engine",
    "financial-workbook",
    "financial-forecast-5y",
    "location-intelligence",
    "bank-package-engine",
    "real-estate-decision-engine",
    "files-engine",
  ],
  candidateReleaseEnabled: false,
  publicReleaseEnabled: false,
  candidateSendEnabled: false,
  candidatePortalSubmissionEnabled: false,
  uploadsEnabled: false,
  externalSendingEnabled: false,
  bankSendEnabled: false,
  leaseSigningEnabled: false,
  financePostingEnabled: false,
  accountingExportsEnabled: false,
  paymentInitiationEnabled: false,
  sourceWritesEnabled: false,
  syncApplyEnabled: false,
  targetApplyEnabled: false,
  liveAiEnabled: false,
};

function craysEntityTypeForFamily(family) {
  if (family === "offer-summary") return "prepared-offer";
  if (family === "candidate-intent") return "candidate-intent";
  if (family === "financial-decision") return "financial-model";
  if (family === "location-decision") return "location-analysis";
  if (family === "bank-package-readiness") return "bank-package";
  if (family === "real-estate-readiness") return "property-case";
  if (family === "evidence-package") return "document";
  if (family === "candidate-redactions") return "evidence-package";
  if (family === "offer-review-actions") return "deal";
  return "prepared-offer";
}

function record(family, externalId, label, fields, options = {}) {
  return {
    family,
    externalId,
    label,
    craysEntityType: options.craysEntityType ?? craysEntityTypeForFamily(family),
    craysEntityId: options.craysEntityId ?? `${craysEntityTypeForFamily(family).replaceAll("-", "_")}_${slug(externalId)}`,
    owner: options.owner ?? fields.ownerRole ?? "Deal Manager",
    status: options.status ?? fields.status ?? "review",
    priority: options.priority ?? fields.priority ?? "medium",
    syncStatus: options.syncStatus ?? (fields.status === "blocked" || fields.priority === "critical" ? "conflict" : "synced"),
    dueDate: options.dueDate ?? fields.dueDate ?? "2026-07-24",
    fields: { ...baseFields, ...fields },
  };
}

const records = [
  record("offer-summary", "candidate_offer_scope_munich_rotkreuzplatz", "Munich Rotkreuzplatz candidate offer scope", {
    status: "attention",
    priority: "high",
    ownerRole: "Deal Manager",
    audience: "Franchise Candidate",
    readinessScore: 76,
    offerStage: "internal_offer_review",
    candidateSafePreview: true,
    currentState: "Candidate offer package is assembled internally from financial, location, bank, real estate and document evidence.",
    nextAction: "Resolve redactions and candidate-safe evidence before offer release can be requested.",
    href: "/crm?role=deal-manager&view=candidate-offer",
  }),
  record("offer-summary", "candidate_scoped_preview", "Lea Schneider scoped candidate preview", {
    status: "release_blocked",
    priority: "high",
    ownerRole: "Deal Manager",
    audience: "Franchise Candidate",
    visibleForCandidate: true,
    currentState: "Candidate can inspect scoped offer readiness only; no release, submission or external sending is open.",
    nextAction: "Keep candidate preview release-gated until Reviewer clears hidden sections.",
    href: "/crm?role=franchise-candidate&view=candidate-offer",
  }),
  record("offer-summary", "candidate_audience_scope", "Candidate offer audience scope", {
    status: "review_ready",
    priority: "medium",
    ownerRole: "Reviewer",
    audience: "Reviewer",
    visibleForCandidate: ["site summary", "investment basis", "monthly rent", "forecast KPIs", "package readiness", "candidate next steps"],
    hiddenForCandidate: ["internal finance workpapers", "bank workpapers", "landlord private contact", "member-level data", "internal review notes", "raw redaction workpapers"],
    currentState: "Candidate offer scope is defined, but release remains closed.",
    nextAction: "Confirm redaction matrix before any candidate-facing offer package is shared.",
    href: "/dashboard?role=reviewer&view=rooms",
  }),

  ...[
    ["Candidate qualification", "candidate_qualification", 0.84, "score", "ready", "Lea Schneider has relevant studio leadership and financing preparation progress."],
    ["Purchase intent readiness", "purchase_intent_readiness", 0.72, "score", "attention", "Candidate intent is credible but final acknowledgement remains internal-review only."],
    ["Equity proof progress", "equity_proof_progress", 40200, "EUR", "attention", "Candidate own-equity proof is defined but not fully reviewed."],
    ["Financing intent readiness", "financing_intent_readiness", 0.68, "score", "attention", "Financing intent depends on bank package and source-of-funds review."],
    ["Candidate onboarding blockers", "candidate_onboarding_blockers", 3, "count", "blocked", "Three candidate onboarding dependencies remain before release review."],
  ].map(([label, key, value, unit, status, context]) =>
    record("candidate-intent", `candidate_intent_${key}`, label, {
      status,
      priority: status === "blocked" ? "critical" : status === "attention" ? "high" : "medium",
      ownerRole: "Deal Manager",
      audience: "Franchise Candidate",
      metricKey: key,
      value,
      unit,
      context,
      nextAction: status === "ready" ? "Keep candidate intent evidence in offer package." : "Resolve candidate intent dependency before offer release review.",
      href: "/crm?role=deal-manager&view=candidate-offer&record=intent",
    }),
  ),

  ...[
    ["Mid-Case active members Year 3", "mid_case_active_members_year3", 858, "members", "ready", "Forecasted active member base supports candidate investment decision."],
    ["Mid-Case monthly recurring revenue Month 36", "mid_case_mrr_month36", 41775, "EUR", "ready", "MRR is sourced from the financial workbook and candidate-safe forecast package."],
    ["Mid-Case Year-3 result", "mid_case_year3_result", 199756, "EUR", "ready", "Year-3 result supports payback and financing decision."],
    ["Payback time", "payback_years", 1.4, "years", "ready", "Payback timing is candidate-safe and linked to Financial Workbook assumptions."],
    ["Candidate equity requirement", "candidate_equity_requirement", 40200, "EUR", "attention", "Equity requirement is clear but proof remains under review."],
    ["Downside cashflow buffer", "downside_cashflow_buffer", 166081, "EUR", "ready", "Worst-Case cumulative cashflow gives candidate a downside planning anchor."],
    ["Internal sensitivity worksheet", "internal_sensitivity_worksheet", null, null, "blocked", "Internal sensitivity workpapers are not candidate-visible and need redaction before release review."],
  ].map(([label, key, value, unit, status, context]) =>
    record("financial-decision", `financial_decision_${key}`, label, {
      status,
      priority: status === "blocked" ? "critical" : status === "attention" ? "high" : "medium",
      ownerRole: "CRAYS Finance",
      audience: status === "blocked" ? "Reviewer" : "Franchise Candidate",
      metricKey: key,
      value,
      unit,
      context,
      nextAction: status === "ready" ? "Keep financial metric in candidate offer." : "Resolve financial evidence before candidate release review.",
      href: "/analytics?role=finance&view=financial-model",
    }),
  ),

  ...[
    ["Locality confidence", "locality_confidence", 0.82, "score", "ready", "Location confidence supports candidate site selection narrative."],
    ["Mid-Case member potential", "mid_case_member_potential", 1250, "members", "ready", "Catchment potential exceeds Mid-Case membership target."],
    ["Rent ratio Year 5", "year5_rent_ratio", 0.0853, "percent", "ready", "Rent ratio supports sustainable long-run unit economics."],
    ["Competition pressure note", "competition_pressure_note", 0.31, "score", "attention", "Competition context needs a candidate-safe explanation."],
    ["Transit access evidence", "transit_access_evidence", 0.86, "score", "ready", "Transit access supports member acquisition assumptions."],
  ].map(([label, key, value, unit, status, context]) =>
    record("location-decision", `location_decision_${key}`, label, {
      status,
      priority: status === "attention" ? "high" : "medium",
      ownerRole: "Expansion Manager",
      audience: "Franchise Candidate",
      metricKey: key,
      value,
      unit,
      context,
      nextAction: status === "attention" ? "Add candidate-safe competition explanation before offer release review." : "Keep location metric in candidate offer.",
      href: "/analytics?role=deal-manager&view=location-intelligence",
    }),
  ),

  ...[
    ["Bank package readiness", "bank_package_readiness", 0.82, "score", "attention", "Bank package is assembled internally but lender release is closed."],
    ["Requested debt", "requested_debt", 241800, "EUR", "ready", "Debt requirement is candidate-safe at package summary level."],
    ["Loan condition blockers", "loan_condition_blockers", 3, "count", "attention", "Open conditions must be summarized without bank workpaper detail."],
    ["Source-of-funds status", "source_of_funds_status", null, null, "review", "Source-of-funds review is internal and not candidate-visible in detail."],
    ["Bank workpaper redaction", "bank_workpaper_redaction", null, null, "blocked", "Bank workpapers must remain hidden from candidate offer package."],
  ].map(([label, key, value, unit, status, context]) =>
    record("bank-package-readiness", `bank_package_${key}`, label, {
      status,
      priority: status === "blocked" ? "critical" : status === "attention" || status === "review" ? "high" : "medium",
      ownerRole: "CRAYS Finance",
      audience: status === "blocked" ? "Reviewer" : "Franchise Candidate",
      metricKey: key,
      value,
      unit,
      context,
      nextAction: status === "ready" ? "Keep bank package summary in candidate offer." : "Resolve bank package dependency before candidate release review.",
      href: "/loans?role=finance&view=bank-package",
    }),
  ),

  ...[
    ["Lease decision readiness", "lease_decision_readiness", 0.78, "score", "attention", "Lease decision is assembled but owner release and lease signing remain closed."],
    ["Monthly base rent", "monthly_base_rent", 4158, "EUR", "ready", "Monthly rent is candidate-safe and linked to lease economics."],
    ["Rent per square meter", "rent_per_sqm", 11, "EUR_per_sqm", "ready", "Rent basis supports candidate financial plan."],
    ["Landlord guarantee dependency", "landlord_guarantee_dependency", null, null, "blocked", "Guarantee term sheet remains internal until reviewer clears redactions."],
    ["Owner contact redaction", "owner_contact_redaction", null, null, "required", "Landlord private contact details must stay hidden from candidate offer package."],
  ].map(([label, key, value, unit, status, context]) =>
    record("real-estate-readiness", `real_estate_${key}`, label, {
      status,
      priority: status === "blocked" ? "critical" : status === "attention" || status === "required" ? "high" : "medium",
      ownerRole: "Expansion Manager",
      audience: status === "blocked" || status === "required" ? "Reviewer" : "Franchise Candidate",
      metricKey: key,
      value,
      unit,
      context,
      nextAction: status === "ready" ? "Keep lease metric in candidate offer." : "Resolve lease/redaction dependency before candidate release review.",
      href: "/project?role=expansion-manager&view=real-estate-decision",
    }),
  ),

  ...[
    ["Candidate offer executive brief", "candidate_offer_executive_brief", "review_ready", "Reviewer", "Offer brief is assembled but not released."],
    ["Financial KPI appendix", "financial_kpi_appendix", "attention", "CRAYS Finance", "Financial KPI appendix needs redaction of internal sensitivity notes."],
    ["Location narrative page", "location_narrative_page", "ready", "Expansion Manager", "Location narrative is candidate-safe after competition note is finalized."],
    ["Bank package summary page", "bank_package_summary_page", "review", "CRAYS Finance", "Bank summary is candidate-safe only at package status level."],
    ["Real estate decision summary", "real_estate_decision_summary", "attention", "Expansion Manager", "Lease summary requires guarantee and owner-contact redactions."],
    ["Candidate next-steps checklist", "candidate_next_steps_checklist", "ready", "Deal Manager", "Candidate next steps are ready as internal draft, not sent."],
  ].map(([label, key, status, ownerRole, context]) =>
    record("evidence-package", `candidate_evidence_${key}`, label, {
      status,
      priority: ["attention", "review"].includes(status) ? "high" : "medium",
      ownerRole,
      audience: "Franchise Candidate",
      sourceSystem: "files-engine",
      context,
      nextAction: status === "ready" || status === "review_ready" ? "Keep evidence linked to candidate offer package." : "Resolve document package issue before candidate release review.",
      href: "/files?role=deal-manager&view=package-builder&record=packages",
    }),
  ),

  ...[
    ["Internal finance workpapers", "internal_finance_workpapers", "blocked", "Internal finance workpapers are excluded from candidate package."],
    ["Bank workpapers", "bank_workpapers", "blocked", "Bank workpapers are excluded from candidate package."],
    ["Landlord private contact", "landlord_private_contact", "required", "Landlord private contact fields must be hidden from candidate view."],
    ["Member-level data", "member_level_data", "ready", "Member-level rows are not part of the candidate offer package."],
  ].map(([label, key, status, context]) =>
    record("candidate-redactions", `candidate_redaction_${key}`, label, {
      status,
      priority: status === "blocked" ? "critical" : status === "required" ? "high" : "medium",
      ownerRole: "Reviewer",
      audience: "Reviewer",
      context,
      nextAction: status === "ready" ? "Keep redaction rule in candidate release preflight." : "Resolve redaction before candidate offer release can be requested.",
      href: "/dashboard?role=reviewer&view=rooms",
    }),
  ),

  ...[
    ["Candidate offer release review", "candidate_offer_release_review", "blocked", "Deal Manager", "Offer package cannot be released until finance, bank, lease and redaction dependencies are clear."],
    ["Finance appendix review", "finance_appendix_review", "attention", "CRAYS Finance", "Finance appendix needs candidate-safe wording and sensitivity removal."],
    ["Location narrative review", "location_narrative_review", "attention", "Expansion Manager", "Location narrative needs competition context."],
    ["Reviewer redaction preflight", "reviewer_redaction_preflight", "blocked", "Reviewer", "Reviewer must confirm hidden sections and audience scope."],
    ["Candidate next-step call prep", "candidate_next_step_call_prep", "ready", "Deal Manager", "Deal Manager can prepare internal call notes; no external message is sent."],
  ].map(([label, key, status, ownerRole, context]) =>
    record("offer-review-actions", `review_action_${key}`, label, {
      status,
      priority: status === "blocked" ? "critical" : status === "attention" ? "high" : "medium",
      ownerRole,
      audience: "CRAYS Management",
      taskKey: key,
      context,
      nextAction: "Stage guarded CRM candidate-offer review task; candidate release, send, upload and apply remain closed.",
      href: "/dashboard?role=deal-manager&view=actions",
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
  return `map_${digest({ moduleKey: "crm", sectionKey: item.family, rowId: item.externalId }, 30)}`;
}

function row(item) {
  return {
    id: item.externalId,
    label: item.label,
    status: item.status,
    owner: item.owner,
    modifiedAt: generatedAt,
    role: "deal-manager",
    dueDate: item.dueDate,
    priority: item.priority,
    fields: item.fields,
  };
}

async function persist(client) {
  const connectionId = "core_source_candidate_offer_workflow";
  const systemKey = "candidate-offer-engine";
  const groupedRecords = grouped();
  const jobId = `sync_job_${digest(["candidate-offer-workflow", generatedAt, records.length], 28)}`;

  await client.query(
    `
      insert into crays_core.integration_connections (
        connection_id, module_key, system_key, connection_name, owner_role, status,
        connection_mode, secret_reference_status, connection_health, metadata, updated_at
      )
      values ($1, 'crm', $2, 'Candidate Offer workflow source slice', 'admin', 'active', 'sync_read_model', 'configured_reference', 'healthy', $3::jsonb, now())
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
      values ($1, $2, 'read_sync', 'read', 'succeeded', 1, 'prepared-offer', 'prepared_franchise_deal_munich_rotkreuzplatz_schneider_fitness', $3::jsonb, now(), now(), now(), now())
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
          moduleKey: "crm",
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
      candidateReleaseEnabled: false,
      publicReleaseEnabled: false,
      candidateSendEnabled: false,
      candidatePortalSubmissionEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
      bankSendEnabled: false,
      leaseSigningEnabled: false,
      financePostingEnabled: false,
      accountingExportsEnabled: false,
      paymentInitiationEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
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
