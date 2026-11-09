import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_FRANCHISE_PARTNER_DECISION === "APPLY_FRANCHISE_PARTNER_DECISION_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-franchise-partner-decision-20260713-v1";
const systemKey = "franchise-partner-decision-engine";
const connectionId = "core_source_franchise_partner_decision";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_FRANCHISE_PARTNER_DECISION=APPLY_FRANCHISE_PARTNER_DECISION_SOURCE_SLICE to apply Franchise Partner Decision source records.");
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
  moduleKey: "analytics",
  seedBatch,
  sourceAsOf: "2026-07-13",
  decisionId: "partner_decision_munich_rotkreuzplatz_schneider_fitness",
  offerId: "prepared_franchise_deal_munich_rotkreuzplatz_schneider_fitness",
  dealId: "deal_case_munich_rotkreuzplatz_schneider_fitness",
  propertyCaseId: "property_case_gudrunstrasse_3_rotkreuzplatz",
  candidateAccountId: "acct_lea_schneider_candidate",
  candidateOrganizationId: "org_schneider_fitness_beteiligungs",
  candidateName: "Lea Schneider",
  candidateCompany: "Schneider Fitness Beteiligungs GmbH",
  partnerCompany: "Schneider Fitness Beteiligungs GmbH",
  benchmarkPartnerName: "Marlene Vogt",
  benchmarkPartnerCompany: "Vogt Fitness Betriebs GmbH",
  benchmarkStudio: "Berlin Mitte Studio",
  siteName: "Gudrunstrasse 3 Studio Lease",
  address: "Gudrunstrasse 3, 80634 Munich",
  city: "Munich",
  district: "Rotkreuzplatz",
  packageId: "partner_decision_package_munich_rotkreuzplatz",
  bankPackageId: "bank_package_munich_rotkreuzplatz_schneider_fitness",
  sourceDatasets: [
    "candidate-offer-engine",
    "financial-workbook",
    "financial-forecast-5y",
    "location-intelligence",
    "bank-package-engine",
    "real-estate-decision-engine",
    "files-engine",
    "franchise-partner-performance",
    "operations-engine",
  ],
  partnerReleaseEnabled: false,
  publicReleaseEnabled: false,
  candidateReleaseEnabled: false,
  partnerSendEnabled: false,
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

function entityTypeForFamily(family) {
  if (family === "partner-decision-summary") return "prepared-offer";
  if (family === "investment-fit") return "financial-model";
  if (family === "operating-proof") return "studio";
  if (family === "bank-and-lease-conditions") return "bank-package";
  if (family === "evidence-package") return "document";
  if (family === "partner-redactions") return "evidence-package";
  if (family === "opening-readiness") return "deal";
  if (family === "partner-review-actions") return "deal";
  return "prepared-offer";
}

function record(family, externalId, label, fields, options = {}) {
  const status = options.status ?? fields.status ?? "attention";
  const priority = options.priority ?? fields.priority ?? "medium";
  return {
    family,
    externalId,
    label,
    craysEntityType: options.craysEntityType ?? entityTypeForFamily(family),
    craysEntityId: options.craysEntityId ?? `${entityTypeForFamily(family).replaceAll("-", "_")}_${slug(externalId)}`,
    owner: options.owner ?? fields.ownerRole ?? "Deal Manager",
    status,
    priority,
    syncStatus: options.syncStatus ?? (status === "blocked" || priority === "critical" ? "conflict" : "synced"),
    dueDate: options.dueDate ?? fields.dueDate ?? "2026-07-27",
    fields: { ...baseFields, ...fields },
  };
}

const records = [
  record("partner-decision-summary", "decision_readiness", "Munich Rotkreuzplatz partner decision readiness", {
    metricKey: "partner_decision_readiness",
    value: 74,
    unit: "score",
    status: "attention",
    priority: "high",
    ownerRole: "Deal Manager",
    audience: "Franchise Partner",
    readinessScore: 74,
    context: "Partner decision package is assembled from candidate offer, finance, bank, lease, files and opening readiness records.",
    currentState: "Partner can review scoped decision material; release and signing remain closed.",
    nextAction: "Resolve finance appendix redactions and lease guarantee condition before partner sign-off review.",
    href: "/analytics?role=franchise-partner&view=partner-decision",
  }),
  record("partner-decision-summary", "partner_offer_scope", "Partner decision audience scope", {
    value: "partner_scoped",
    unit: "state",
    status: "attention",
    priority: "high",
    ownerRole: "Reviewer",
    audience: "Reviewer",
    visibleForPartner: false,
    context: "Reviewer scope defines what a future Franchise Partner package may expose.",
    currentState: "Internal finance workpapers, bank workpapers, owner private contact and member-level data remain out of partner scope.",
    nextAction: "Confirm partner-safe sections before any future release gate is considered.",
    href: "/files?role=reviewer&view=package-builder&record=packages",
  }),
  record("partner-decision-summary", "partner_decision_case", "Lea Schneider partner decision case", {
    value: "review_required",
    unit: "state",
    status: "attention",
    priority: "high",
    ownerRole: "Deal Manager",
    audience: "Franchise Partner",
    visibleForPartner: true,
    context: "Lea Schneider is reviewing the Munich Rotkreuzplatz prepared deal with investment, financing, lease and opening dependencies visible.",
    currentState: "Decision is commercially attractive but still blocked by release review and lease guarantee condition.",
    nextAction: "Review partner decision package with finance and real estate blockers visible.",
    href: "/crm?role=franchise-partner&view=candidate-offer",
  }),
  record("partner-decision-summary", "decision_blockers", "Partner decision blockers", {
    value: 7,
    unit: "records",
    status: "blocked",
    priority: "critical",
    ownerRole: "Reviewer",
    audience: "CRAYS Management",
    visibleForPartner: false,
    context: "Seven blockers must be classified before any partner release or signing decision.",
    currentState: "Blocked by redactions, lease guarantee and bank condition evidence.",
    nextAction: "Open review actions and stage an internal partner decision review command.",
    href: "/dashboard?role=reviewer&view=actions",
  }),

  ...[
    ["equity_requirement", "Equity requirement", 40200, "EUR", "attention", "high", "Equity amount is clear but proof remains under review."],
    ["requested_debt", "Requested debt", 241800, "EUR", "attention", "high", "Debt amount matches the bank package but is not ready for send."],
    ["total_investment", "Total investment", 282000, "EUR", "ready", "medium", "Project basis is aligned with financial workbook."],
    ["year3_result_mid_case", "Year-3 result Mid-Case", 199756, "EUR", "ready", "medium", "Projected result is strong enough for partner decision review."],
    ["payback_mid_case", "Payback Mid-Case", 1.4, "years", "ready", "medium", "Payback is inside partner hurdle range."],
    ["roic_mid_case", "ROIC Mid-Case", 0.708, "percent", "ready", "medium", "Return profile is above partner target range."],
    ["ltv_cac_mid_case", "LTV/CAC Mid-Case", 87, "ratio", "ready", "medium", "Sales efficiency is above internal partner benchmark."],
  ].map(([key, label, value, unit, status, priority, context]) =>
    record("investment-fit", key, label, {
      metricKey: key,
      value,
      unit,
      status,
      priority,
      ownerRole: "CRAYS Finance",
      audience: "Franchise Partner",
      visibleForPartner: true,
      context,
      currentState: context,
      nextAction: status === "attention" ? "Review evidence before partner decision sign-off." : "Keep metric in partner decision package.",
      href: "/analytics?role=franchise-partner&view=financial-model",
    }),
  ),

  ...[
    ["active_members_year3", "Active members Year 3", 858, "members", "ready", "medium", "Forecast member base is above cash break-even."],
    ["mrr_month36", "MRR Month 36", 41775, "EUR", "ready", "medium", "Recurring revenue supports partner economics."],
    ["rent_ratio_year3", "Rent ratio Year 3", 0.098, "percent", "ready", "medium", "Rent burden is below partner ceiling."],
    ["member_churn_mid_case", "Monthly churn Mid-Case", 0.025, "percent", "attention", "high", "Churn remains a monitored operating sensitivity."],
    ["berlin_mitte_payment_quality", "Berlin Mitte payment quality benchmark", 0.0088, "percent", "attention", "high", "Existing partner studio payment exception rate is above target but recoverable."],
    ["support_load_benchmark", "Support load benchmark", 6, "records", "attention", "high", "Support volume is visible for operating proof and staffing review."],
  ].map(([key, label, value, unit, status, priority, context]) =>
    record("operating-proof", key, label, {
      metricKey: key,
      value,
      unit,
      status,
      priority,
      ownerRole: status === "ready" ? "Deal Manager" : "Studio Manager",
      audience: "Franchise Partner",
      visibleForPartner: true,
      context,
      currentState: context,
      nextAction: status === "attention" ? "Review operating proof detail before partner decision meeting." : "Keep operating proof in partner package.",
      href: "/analytics?role=franchise-partner&view=portfolio",
    }),
  ),

  ...[
    ["bank_readiness", "Bank package readiness", 82, "score", "attention", "high", "Bank package is strong but not send-ready."],
    ["bank_conditions", "Open bank conditions", 7, "records", "blocked", "critical", "Bank conditions block partner signing confidence."],
    ["lease_readiness", "Lease decision readiness", 78, "score", "attention", "high", "Lease is commercially aligned but not partner-release-ready."],
    ["monthly_base_rent", "Monthly base rent", 4158, "EUR", "ready", "medium", "Base rent matches the financial workbook."],
    ["lease_guarantee", "Lease guarantee dependency", 1, "records", "blocked", "critical", "Guarantee term sheet must be resolved before partner decision close."],
    ["bank_send_gate", "Bank send gate", false, "boolean", "blocked", "critical", "Bank send remains closed and visible as a condition, not an action."],
  ].map(([key, label, value, unit, status, priority, context]) =>
    record("bank-and-lease-conditions", key, label, {
      metricKey: key,
      value,
      unit,
      status,
      priority,
      ownerRole: status === "blocked" ? "Reviewer" : "CRAYS Finance",
      audience: status === "blocked" ? "Reviewer" : "Franchise Partner",
      visibleForPartner: status !== "blocked" || key === "lease_guarantee",
      context,
      currentState: context,
      nextAction: status === "blocked" ? "Resolve condition before partner sign-off review." : "Keep condition in partner decision package.",
      href: key.includes("lease") ? "/project?role=franchise-partner&view=real-estate-decision" : "/loans?role=franchise-partner&view=bank-package",
    }),
  ),

  ...[
    ["executive_brief", "Partner decision executive brief", "ready", "state", "ready", "medium", "Scoped decision brief can be reviewed internally."],
    ["financial_appendix", "Financial KPI appendix", "review", "state", "attention", "high", "Financial appendix needs final partner redaction check."],
    ["bank_summary", "Bank package summary", "review", "state", "attention", "high", "Bank package summary excludes restricted finance material and send actions."],
    ["location_narrative", "Location narrative", "ready", "state", "ready", "medium", "Location narrative is ready for partner decision review."],
    ["lease_summary", "Lease decision summary", "review", "state", "attention", "high", "Lease summary depends on guarantee classification."],
    ["opening_checklist", "Opening readiness checklist", "review", "state", "attention", "high", "Opening checklist is visible but not release-ready."],
  ].map(([key, label, value, unit, status, priority, context]) =>
    record("evidence-package", key, label, {
      metricKey: key,
      value,
      unit,
      status,
      priority,
      ownerRole: "Reviewer",
      audience: status === "ready" ? "Franchise Partner" : "Reviewer",
      visibleForPartner: status === "ready",
      context,
      currentState: context,
      nextAction: status === "ready" ? "Keep evidence in partner package." : "Review evidence redaction before partner package release.",
      href: "/files?role=franchise-partner&view=package-builder&record=packages",
    }),
  ),

  ...[
    ["internal_finance_workpapers", "Internal finance workpapers", 1, "records", "blocked", "critical", "Restricted finance material must stay out of partner package."],
    ["bank_workpapers", "Bank workpapers", 1, "records", "blocked", "critical", "Restricted bank material must stay internal."],
    ["owner_private_contact", "Owner private contact", 1, "records", "blocked", "critical", "Owner private contact data is not partner package material."],
    ["member_level_data", "Member-level data", 1, "records", "blocked", "critical", "Member-level data remains restricted to operations and finance scopes."],
  ].map(([key, label, value, unit, status, priority, context]) =>
    record("partner-redactions", key, label, {
      metricKey: key,
      value,
      unit,
      status,
      priority,
      ownerRole: "Reviewer",
      audience: "Reviewer",
      visibleForPartner: false,
      hiddenForPartner: true,
      context,
      currentState: context,
      nextAction: "Confirm redaction before any partner release gate is considered.",
      href: "/files?role=reviewer&view=package-builder&record=packages",
    }),
  ),

  ...[
    ["opening_project_readiness", "Opening project readiness", 64, "score", "attention", "high", "Opening plan is credible but requires owner assignments."],
    ["fit_out_milestones", "Fit-out milestones", 8, "records", "attention", "high", "Fit-out dependencies need a partner-aware schedule review."],
    ["training_onboarding", "Partner training onboarding", 6, "records", "attention", "high", "Training path is not yet partner-confirmed."],
    ["operations_launch_plan", "Operations launch plan", 71, "score", "attention", "high", "Operations launch plan needs support and access recovery check."],
    ["staffing_automation_plan", "Staffing and automation plan", "review", "state", "attention", "medium", "Low-staff operating model is planned but not accepted."],
    ["go_live_window", "Go-live window", "2026-10-01", "date", "attention", "medium", "Target launch window depends on lease and bank readiness."],
  ].map(([key, label, value, unit, status, priority, context]) =>
    record("opening-readiness", key, label, {
      metricKey: key,
      value,
      unit,
      status,
      priority,
      ownerRole: "Franchise Partner",
      audience: "Franchise Partner",
      visibleForPartner: true,
      context,
      currentState: context,
      nextAction: "Open opening readiness workflow and assign the next partner-owned action.",
      href: "/project?role=franchise-partner&view=work-items",
    }),
  ),

  ...[
    ["partner_decision_review", "Partner decision review", "Deal Manager", "blocked", "critical", "Resolve release blockers and stage the internal partner decision review.", "/dashboard?role=deal-manager&view=actions"],
    ["equity_proof_review", "Equity proof review", "CRAYS Finance", "attention", "high", "Confirm equity proof evidence before decision meeting.", "/analytics?role=finance&view=financial-model"],
    ["lease_condition_review", "Lease condition review", "Expansion Manager", "blocked", "critical", "Resolve lease guarantee dependency before partner decision close.", "/project?role=expansion-manager&view=real-estate-decision"],
    ["evidence_redaction_review", "Evidence redaction review", "Reviewer", "blocked", "critical", "Confirm partner package redactions before any release gate.", "/files?role=reviewer&view=package-builder&record=packages"],
    ["opening_plan_review", "Opening plan review", "Franchise Partner", "attention", "high", "Confirm opening project readiness and partner onboarding path.", "/project?role=franchise-partner&view=work-items"],
  ].map(([externalId, label, ownerRole, status, priority, context, href]) =>
    record("partner-review-actions", externalId, label, {
      metricKey: externalId,
      value: "review",
      unit: "state",
      status,
      priority,
      ownerRole,
      audience: ownerRole === "Franchise Partner" ? "Franchise Partner" : "Reviewer",
      visibleForPartner: ownerRole === "Franchise Partner",
      context,
      currentState: context,
      nextAction: "Stage a guarded partner decision review command; no partner release, send, upload, source write or apply is executed.",
      href,
    }),
  ),
];

function sectionLabel(family) {
  return family.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function grouped() {
  return records.reduce((acc, item) => {
    acc[item.family] ??= [];
    acc[item.family].push(item);
    return acc;
  }, {});
}

function row(item) {
  return {
    id: item.externalId,
    label: item.label,
    family: item.family,
    owner: item.owner,
    status: item.status,
    priority: item.priority,
    dueDate: item.dueDate,
    fields: item.fields,
  };
}

function mapId(item) {
  return `src_${digest([systemKey, item.family, item.externalId], 32)}`;
}

async function persist(client) {
  const groupedRecords = grouped();
  const jobId = `sync_job_${digest(["franchise-partner-decision", generatedAt, records.length], 28)}`;
  await client.query(
    `
      insert into crays_core.integration_connections (
        connection_id, module_key, system_key, connection_name, owner_role, status,
        connection_mode, secret_reference_status, connection_health, metadata, updated_at
      )
      values ($1, 'analytics', $2, 'Franchise Partner Decision source slice', 'admin', 'active', 'sync_read_model', 'configured_reference', 'healthy', $3::jsonb, now())
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
      values ($1, $2, 'read_sync', 'read', 'succeeded', 1, 'partner-decision', 'partner_decision_munich_rotkreuzplatz_schneider_fitness', $3::jsonb, now(), now(), now(), now())
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
          moduleKey: "analytics",
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
      partnerReleaseEnabled: false,
      publicReleaseEnabled: false,
      candidateReleaseEnabled: false,
      partnerSendEnabled: false,
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
