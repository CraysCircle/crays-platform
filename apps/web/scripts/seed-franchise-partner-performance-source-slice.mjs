import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_FRANCHISE_PARTNER_PERFORMANCE === "APPLY_FRANCHISE_PARTNER_PERFORMANCE_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-franchise-partner-performance-20260712-v1";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_FRANCHISE_PARTNER_PERFORMANCE=APPLY_FRANCHISE_PARTNER_PERFORMANCE_SOURCE_SLICE to apply Franchise Partner Performance source records.");
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
  sourceAsOf: "2026-07-12",
  partnerId: "partner_vogt_fitness_betriebs_gmbh",
  partnerName: "Marlene Vogt",
  companyName: "Vogt Fitness Betriebs GmbH",
  franchisePartnerId: "franchise_partner_vogt_fitness",
  sourceWritesEnabled: false,
  syncApplyEnabled: false,
  targetApplyEnabled: false,
  paymentInitiationEnabled: false,
  financePostingEnabled: false,
  accountingExportsEnabled: false,
  externalSendingEnabled: false,
  liveAiEnabled: false,
};

function craysEntityTypeForFamily(family) {
  if (family === "partner-portfolio-snapshots") return "studio";
  if (family === "member-growth-metrics") return "member";
  if (family === "payment-quality-metrics") return "financial-model";
  if (family === "operations-recovery-metrics") return "studio";
  if (family === "support-experience-metrics") return "support-ticket";
  if (family === "partner-review-actions") return "prepared-offer";
  return "financial-model";
}

function record(family, externalId, label, fields, options = {}) {
  return {
    family,
    externalId,
    label,
    craysEntityType: options.craysEntityType ?? craysEntityTypeForFamily(family),
    craysEntityId: options.craysEntityId ?? `franchise_partner_performance_${slug(externalId)}`,
    owner: options.owner ?? fields.ownerRole ?? "Franchise Partner",
    status: options.status ?? fields.status ?? "review",
    priority: options.priority ?? fields.priority ?? "medium",
    syncStatus: options.syncStatus ?? (["critical", "high"].includes(fields.priority) || fields.status === "blocked" ? "conflict" : "synced"),
    dueDate: options.dueDate ?? fields.dueDate ?? "2026-07-15",
    fields: { ...baseFields, ...fields },
  };
}

const portfolioSnapshots = [
  record("partner-portfolio-snapshots", "portfolio_berlin_mitte_operating", "Berlin Mitte operating studio performance", {
    studioId: "studio_berlin_mitte",
    studioName: "Berlin Mitte Studio",
    lifecycleStage: "operating",
    month: "2026-07",
    activeMembers: 1248,
    mrrNet: 59904,
    checkinsToday: 312,
    paymentExceptions: 11,
    supportOpen: 6,
    trainerCapacityUtilization: 0.84,
    status: "attention",
    priority: "high",
    ownerRole: "Franchise Partner",
    sourceDatasets: ["member-app", "erp-engine", "operations-engine"],
    currentState: "Operating studio is above member plan, but payment exceptions and recovery tasks require owner attention.",
    nextAction: "Review member recovery, support handoff and payment quality before the weekly partner review.",
    href: "/operations?role=franchise-partner",
  }),
  record("partner-portfolio-snapshots", "portfolio_munich_rotkreuzplatz_opening", "Munich Rotkreuzplatz opening performance plan", {
    studioId: "studio_munich_rotkreuzplatz",
    studioName: "Munich Rotkreuzplatz Studio",
    lifecycleStage: "opening_project",
    month: "2026-07",
    activeMembers: 0,
    forecastYear3MembersMidCase: 858,
    forecastYear3RevenueNetMidCase: 506592,
    openingReadiness: 0.68,
    status: "attention",
    priority: "high",
    ownerRole: "Franchise Partner",
    sourceDatasets: ["financial-workbook", "financial-forecast-5y", "location-intelligence", "project"],
    currentState: "Opening case is financially attractive but still depends on lease, fit-out and pre-sales readiness.",
    nextAction: "Review forecast variance, opening blockers and partner decision package.",
    href: "/analytics?role=franchise-partner",
  }),
  record("partner-portfolio-snapshots", "portfolio_munich_schwabing_prepared_deal", "Munich Schwabing prepared deal performance plan", {
    studioId: "studio_munich_schwabing",
    studioName: "Munich Schwabing Studio",
    lifecycleStage: "prepared_deal",
    month: "2026-07",
    activeMembers: 0,
    forecastYear3MembersMidCase: 858,
    forecastYear3RevenueNetMidCase: 506592,
    partnerDecisionStatus: "bank_package_review",
    status: "blocked",
    priority: "critical",
    ownerRole: "Franchise Partner",
    sourceDatasets: ["crm", "files", "loans", "financial-workbook"],
    currentState: "Prepared deal needs bank-package and evidence review before partner signing decision.",
    nextAction: "Open partner decision package and review the blocked bank evidence conditions.",
    href: "/loans?role=franchise-partner",
  }),
];

const performanceMetrics = [
  ["active_members_vs_plan", "Active members vs plan", "Berlin Mitte Studio", 1248, "members", 1180, 0.058, "ready", "medium", "Member base is ahead of the July plan."],
  ["monthly_recurring_revenue_net", "Monthly recurring revenue net", "Berlin Mitte Studio", 59904, "EUR", 56640, 0.058, "ready", "medium", "Recurring revenue tracks above the operating plan."],
  ["checkins_today", "Check-ins today", "Berlin Mitte Studio", 312, "visits", 295, 0.058, "ready", "medium", "Daily check-ins support utilization and member engagement."],
  ["visit_frequency", "Visit frequency per member", "Berlin Mitte Studio", 6.1, "visits_per_month", 6, 0.017, "ready", "medium", "Visit frequency is in target range."],
  ["monthly_churn_rate", "Monthly churn rate", "Berlin Mitte Studio", 0.024, "percent", 0.025, -0.001, "ready", "medium", "Churn is slightly better than Mid-Case benchmark."],
  ["payment_exception_rate", "Payment exception rate", "Berlin Mitte Studio", 0.0088, "percent", 0.004, 0.0048, "attention", "high", "Payment exception rate is above internal partner threshold."],
  ["support_open_rate", "Open support cases per 1,000 members", "Berlin Mitte Studio", 4.8, "cases_per_1000_members", 3.5, 1.3, "attention", "high", "Support load needs daily owner review."],
  ["trainer_capacity_utilization", "Trainer capacity utilization", "Berlin Mitte Studio", 0.84, "percent", 0.78, 0.06, "attention", "medium", "Trainer load is high but still workable."],
  ["year3_member_plan_mid_case", "Year 3 active member plan", "Munich Rotkreuzplatz Studio", 858, "members", 858, 0, "ready", "medium", "Forecast matches the current Mid-Case plan."],
  ["year3_revenue_plan_mid_case", "Year 3 net revenue plan", "Munich Rotkreuzplatz Studio", 506592, "EUR", 506592, 0, "ready", "medium", "Revenue plan matches the current Mid-Case forecast."],
  ["year3_result_margin_mid_case", "Year 3 result margin", "Munich Rotkreuzplatz Studio", 0.394, "percent", 0.32, 0.074, "ready", "medium", "Projected margin is above the internal partner decision hurdle."],
  ["payback_years_mid_case", "Payback period Mid-Case", "Munich Rotkreuzplatz Studio", 1.4, "years", 2.0, -0.6, "ready", "medium", "Projected payback is inside partner target range."],
].map(([externalId, label, studioName, value, unit, benchmarkValue, benchmarkDelta, status, priority, currentState]) =>
  record("partner-performance-metrics", `metric_${externalId}`, label, {
    studioName,
    metricKey: externalId,
    metricLabel: label,
    value,
    unit,
    benchmarkValue,
    benchmarkDelta,
    status,
    priority,
    ownerRole: "Franchise Partner",
    sourceDatasets: ["member-app", "financial-workbook", "financial-forecast-5y"],
    currentState,
    nextAction: status === "attention" ? "Open the exception detail and stage a partner performance review." : "Keep metric in weekly partner review.",
    href: "/analytics?role=franchise-partner",
  }),
);

const memberGrowthMetrics = [
  ["member_growth_july", "Net member growth July", 18, "members", 16, "ready", "medium", "Net growth is ahead of Mid-Case plan."],
  ["new_members_monthly", "New members monthly", 36, "members", 35, "ready", "medium", "New member acquisition is on plan."],
  ["cancelled_members_monthly", "Cancellations monthly", 18, "members", 19, "ready", "medium", "Cancellation volume is slightly better than Mid-Case plan."],
  ["trial_conversion", "Trial conversion", 0.22, "percent", 0.2, "ready", "medium", "Trial conversion is above the base conversion benchmark."],
  ["paused_members", "Paused members", 2, "members", 8, "ready", "medium", "Pause volume is low and manageable."],
  ["high_risk_members", "High-risk member cases", 7, "members", 4, "attention", "high", "Member risk is concentrated in payment and support recovery cases."],
].map(([externalId, label, value, unit, benchmarkValue, status, priority, currentState]) =>
  record("member-growth-metrics", externalId, label, {
    studioId: "studio_berlin_mitte",
    studioName: "Berlin Mitte Studio",
    metricKey: externalId,
    metricLabel: label,
    value,
    unit,
    benchmarkValue,
    status,
    priority,
    ownerRole: "Franchise Partner",
    sourceDatasets: ["member-app"],
    currentState,
    nextAction: status === "attention" ? "Review high-risk member cases with Studio Manager." : "Keep member growth in the weekly partner review.",
    href: "/operations?role=franchise-partner",
  }),
);

const paymentQualityMetrics = [
  ["failed_payments", "Failed payments", 4, "records", 2, "attention", "high", "Failed payments need owner visibility before revenue forecast is reviewed."],
  ["chargebacks", "Chargeback cases", 1, "records", 0, "blocked", "critical", "Chargeback evidence must be reviewed before the partner performance pack is considered clean."],
  ["refunds_under_review", "Refunds under review", 3, "records", 1, "attention", "high", "Refund review volume is above target and affects partner trust metrics."],
  ["payment_amount_at_risk", "Payment amount at risk", 531.41, "EUR", 180, "attention", "high", "Amount at risk is concentrated in a small number of member cases."],
  ["payment_method_updates", "Payment method updates needed", 3, "records", 1, "attention", "medium", "Payment method follow-up can reduce future failed-payment volume."],
  ["ledger_events_review_only", "Ledger preview events", 8, "records", 0, "attention", "medium", "Ledger events remain review-only until finance posting is approved."],
].map(([externalId, label, value, unit, benchmarkValue, status, priority, currentState]) =>
  record("payment-quality-metrics", externalId, label, {
    studioId: "studio_berlin_mitte",
    studioName: "Berlin Mitte Studio",
    metricKey: externalId,
    metricLabel: label,
    value,
    unit,
    benchmarkValue,
    status,
    priority,
    ownerRole: "Finance",
    sourceDatasets: ["erp-engine", "member-app"],
    currentState,
    nextAction: status === "blocked" ? "Review chargeback evidence with Finance and Reviewer." : "Review recovery queue before partner performance sign-off.",
    href: "/erp?role=franchise-partner&view=payment-recovery",
  }),
);

const operationsRecoveryMetrics = [
  ["operations_recovery_tasks", "Open studio recovery tasks", 6, "records", 3, "attention", "high", "Studio Manager has six recovery tasks that affect partner performance."],
  ["access_impact_checks", "Access impact checks", 4, "records", 1, "blocked", "critical", "Access entitlement checks need classification before weekly partner review."],
  ["class_capacity_impacts", "Class capacity impacts", 4, "records", 2, "attention", "high", "Capacity impacts are tied to late cancellations and refunds."],
  ["support_handoffs", "Support handoffs", 5, "records", 2, "attention", "high", "Support handoffs must be reconciled with recovery and member care."],
  ["trainer_follow_ups", "Trainer follow-ups", 3, "records", 2, "attention", "medium", "Trainer capacity needs weekly balancing for member experience."],
  ["finance_handoffs", "Finance handoffs", 2, "records", 1, "attention", "high", "Finance handoff depends on operations facts before recovery review."],
].map(([externalId, label, value, unit, benchmarkValue, status, priority, currentState]) =>
  record("operations-recovery-metrics", externalId, label, {
    studioId: "studio_berlin_mitte",
    studioName: "Berlin Mitte Studio",
    metricKey: externalId,
    metricLabel: label,
    value,
    unit,
    benchmarkValue,
    status,
    priority,
    ownerRole: "Studio Manager",
    sourceDatasets: ["operations-engine", "member-app", "erp-engine"],
    currentState,
    nextAction: status === "blocked" ? "Open Operations Recovery and stage owner review." : "Review Operations Recovery before partner weekly review.",
    href: "/operations?role=franchise-partner",
  }),
);

const supportExperienceMetrics = [
  ["open_support_requests", "Open support requests", 6, "records", 4, "attention", "high", "Support load is elevated against the partner service target."],
  ["payment_related_support", "Payment-related support", 4, "records", 1, "attention", "high", "Payment support cases drive partner-visible member trust risk."],
  ["training_plan_support", "Training plan support", 2, "records", 2, "ready", "medium", "Training plan support volume is normal."],
  ["consent_preflight_exceptions", "Communication preflight exceptions", 2, "records", 0, "blocked", "critical", "Outbound communication cannot proceed for restricted member cases."],
].map(([externalId, label, value, unit, benchmarkValue, status, priority, currentState]) =>
  record("support-experience-metrics", externalId, label, {
    studioId: "studio_berlin_mitte",
    studioName: "Berlin Mitte Studio",
    metricKey: externalId,
    metricLabel: label,
    value,
    unit,
    benchmarkValue,
    status,
    priority,
    ownerRole: "Support",
    sourceDatasets: ["member-app", "operations-engine", "erp-engine"],
    currentState,
    nextAction: status === "blocked" ? "Review communication preflight and support timeline before outreach." : "Keep support experience in partner review.",
    href: "/support?role=franchise-partner&view=member-recovery",
  }),
);

const reviewActions = [
  ["partner_weekly_performance_review", "Weekly partner performance review", "Franchise Partner", "attention", "high", "Review member growth, payment quality and operations recovery in one partner meeting.", "/dashboard?role=franchise-partner&view=work-queue"],
  ["partner_chargeback_review", "Chargeback owner review", "Reviewer", "blocked", "critical", "Classify Alina Richter chargeback evidence before partner pack is marked clean.", "/erp?role=franchise-partner&view=payment-recovery"],
  ["partner_access_exception_review", "Access exception owner review", "Studio Manager", "blocked", "critical", "Review access entitlement checks before weekly performance sign-off.", "/operations?role=franchise-partner"],
  ["partner_opening_forecast_review", "Opening forecast variance review", "Franchise Partner", "attention", "high", "Compare Rotkreuzplatz forecast plan with operating Berlin Mitte performance.", "/analytics?role=franchise-partner"],
  ["partner_support_recovery_review", "Support recovery review", "Support", "attention", "high", "Close payment-related support handoffs before performance package is shared internally.", "/support?role=franchise-partner&view=member-recovery"],
].map(([externalId, label, ownerRole, status, priority, currentState, href]) =>
  record("partner-review-actions", externalId, label, {
    studioId: "studio_berlin_mitte",
    studioName: "Berlin Mitte Studio",
    metricKey: externalId,
    metricLabel: label,
    value: status,
    unit: "workflow",
    benchmarkValue: "weekly_review_ready",
    status,
    priority,
    ownerRole,
    sourceDatasets: ["franchise-performance", "member-app", "erp-engine", "operations-engine"],
    currentState,
    nextAction: "Stage a partner performance review command; no external release or source apply is executed.",
    href,
  }),
);

const records = [
  ...portfolioSnapshots,
  ...performanceMetrics,
  ...memberGrowthMetrics,
  ...paymentQualityMetrics,
  ...operationsRecoveryMetrics,
  ...supportExperienceMetrics,
  ...reviewActions,
];

function grouped() {
  return records.reduce((acc, item) => {
    acc[item.family] ??= [];
    acc[item.family].push(item);
    return acc;
  }, {});
}

function sectionLabel(family) {
  return family
    .split("-")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapId(item) {
  return `map_${digest({ moduleKey: "analytics", sectionKey: item.family, rowId: item.externalId }, 30)}`;
}

function row(item) {
  return {
    id: item.externalId,
    label: item.label,
    status: item.status,
    owner: item.owner,
    modifiedAt: generatedAt,
    role: "franchise-partner",
    dueDate: item.dueDate,
    priority: item.priority,
    fields: item.fields,
  };
}

async function persist(client) {
  const connectionId = "core_source_franchise_partner_performance";
  const systemKey = "franchise-performance";
  const groupedRecords = grouped();
  const jobId = `sync_job_${digest(["franchise-partner-performance", generatedAt, records.length], 28)}`;

  await client.query(
    `
      insert into crays_core.integration_connections (
        connection_id, module_key, system_key, connection_name, owner_role, status,
        connection_mode, secret_reference_status, connection_health, metadata, updated_at
      )
      values ($1, 'analytics', $2, 'Franchise partner performance source slice', 'admin', 'active', 'sync_read_model', 'not_required', 'healthy', $3::jsonb, now())
      on conflict (connection_id) do update set
        status = excluded.status,
        connection_mode = excluded.connection_mode,
        secret_reference_status = excluded.secret_reference_status,
        connection_health = excluded.connection_health,
        metadata = excluded.metadata,
        updated_at = now()
    `,
    [
      connectionId,
      systemKey,
      JSON.stringify({
        ...baseFields,
        generatedAt,
        rowsSeen: records.length,
        families: Object.keys(groupedRecords).sort(),
      }),
    ],
  );

  await client.query(
    `
      insert into crays_core.sync_jobs (
        job_id, connection_id, job_type, direction, status, attempt_count,
        crays_entity_type, crays_entity_id, payload_summary, scheduled_at, started_at, finished_at, updated_at
      )
      values ($1, $2, 'read_sync', 'read', 'succeeded', 1, 'organization', 'partner_vogt_fitness_betriebs_gmbh', $3::jsonb, now(), now(), now(), now())
      on conflict (job_id) do update set
        status = excluded.status,
        attempt_count = crays_core.sync_jobs.attempt_count + 1,
        payload_summary = excluded.payload_summary,
        started_at = excluded.started_at,
        finished_at = excluded.finished_at,
        updated_at = now()
    `,
    [
      jobId,
      connectionId,
      JSON.stringify({
        ...baseFields,
        generatedAt,
        rowsSeen: records.length,
        families: Object.keys(groupedRecords).sort(),
      }),
    ],
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
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      accountingExportsEnabled: false,
      externalSendingEnabled: false,
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
