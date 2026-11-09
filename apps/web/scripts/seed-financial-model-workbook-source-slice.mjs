import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_FINANCIAL_WORKBOOK_SOURCE === "APPLY_FINANCIAL_WORKBOOK_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-financial-workbook-rotkreuzplatz-20260712-v1";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_FINANCIAL_WORKBOOK_SOURCE=APPLY_FINANCIAL_WORKBOOK_SOURCE_SLICE to apply financial workbook source records.");
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

function json(value) {
  return JSON.stringify(value);
}

const sourceWorkbook = {
  fileName: "Crays_Rotkreuzplatz_Muc_3yr_plan_financial_forecast.xlsx",
  workbookVersion: "3-year planning workbook",
  sourceAsOf: "2026-07-12",
  sourceUse: "Finance source snapshot for prepared franchise deal, lender review, lease decision and partner decision support.",
  forecastPeriod: "2027-01 through 2029-12",
  property: "Gudrunstrasse 3 Studio Lease",
  location: "Munich Rotkreuzplatz / Neuhausen",
  preparedDeal: "Prepared Franchise Deal - Munich Rotkreuzplatz",
  franchisePartner: "Brandt Fitness Muenchen GmbH",
  franchiseLead: "Lukas Brandt",
  bankPartner: "Isar Commercial Finance AG",
  realEstatePartner: "Hirschgarten Immobilien GmbH",
};

const baseFields = {
  moduleKey: "analytics",
  seedBatch,
  workbookFile: sourceWorkbook.fileName,
  workbookVersion: sourceWorkbook.workbookVersion,
  sourceAsOf: sourceWorkbook.sourceAsOf,
  sourceWritesEnabled: false,
  syncApplyEnabled: false,
  targetApplyEnabled: false,
  reportPublicationEnabled: false,
  externalSendingEnabled: false,
  bankSendEnabled: false,
  paymentInitiationEnabled: false,
  financePostingEnabled: false,
  sourceUse: sourceWorkbook.sourceUse,
};

function record(family, label, options = {}) {
  const externalId = options.externalId ?? `financial_workbook_${slug(family)}_${digest(label, 10)}`;
  return {
    family,
    label,
    externalId,
    craysEntityType: "financial-model",
    craysEntityId: options.craysEntityId ?? `financial_model_rotkreuzplatz_${slug(label)}_${digest([family, label], 8)}`,
    syncStatus: options.syncStatus ?? "synced",
    owner: options.owner ?? "Finance",
    role: options.role ?? "finance",
    status: options.status ?? "ready",
    dueDate: options.dueDate ?? "2026-07-19",
    priority: options.priority ?? "medium",
    fields: { ...baseFields, ...options.fields },
  };
}

const siteAssumptions = [
  ["site-address", "Site address", "Gudrunstrasse 3, 80634 Munich / Rotkreuzplatz / Neuhausen", "text", "Project Fact Sheet", "B4", "Real Estate Partner"],
  ["club-space", "Club space", 378, "sqm", "Project Fact Sheet", "B5", "Real Estate Partner"],
  ["base-rent", "Base rent", 3700, "EUR per month", "Project Fact Sheet", "B6", "Real Estate Partner"],
  ["service-charges", "Service charges", 1200, "EUR per month", "Project Fact Sheet", "B7", "Real Estate Partner"],
  ["fitout", "Fit-out budget", 250, "EUR per sqm", "Project Fact Sheet", "B8", "Finance"],
  ["reserve-buffer", "Reserve buffer months 1-5", 60, "EUR per sqm", "Project Fact Sheet", "B9", "Finance"],
  ["broker-fee", "Broker fee", 12000, "EUR one-time", "Project Fact Sheet", "B10", "Finance"],
  ["asset-purchase-base", "Asset purchase base value", 150000, "EUR", "Project Fact Sheet", "B11", "Bank Partner"],
  ["equity-committed", "Equity committed", 50000, "EUR", "Project Fact Sheet", "B12", "Bank Partner"],
  ["bank-loan", "Bank loan", 150000, "EUR", "Project Fact Sheet", "B13", "Bank Partner"],
  ["loan-rate", "Loan interest rate", 0.055, "p.a.", "Project Fact Sheet", "B15", "Bank Partner"],
  ["loan-term", "Loan term", 72, "months", "Project Fact Sheet", "B16", "Bank Partner"],
  ["asset-payment-term", "Asset payment term", 36, "months", "Project Fact Sheet", "B17", "Bank Partner"],
  ["equipment-lease", "Equipment lease", 3500, "EUR per month", "Project Fact Sheet", "B18", "Finance"],
  ["forecast-start", "Forecast start", "2027-01-01", "month", "Project Fact Sheet", "B20", "Finance"],
  ["base-arpm", "Base ARPM net membership", 47.64, "EUR per member per month", "Project Fact Sheet", "B21", "Franchise Partner"],
  ["addon-revenue-base", "Add-on revenue base", 1, "EUR per average member per month", "Project Fact Sheet", "B23", "Franchise Partner"],
  ["platform-fee", "Payment and platform fee", 0.025, "percent of revenue", "Project Fact Sheet", "B25", "Finance"],
  ["member-software-low", "Member software low tier", 249, "EUR per month", "Project Fact Sheet", "B26", "Franchise Partner"],
  ["member-software-mid", "Member software mid tier", 329, "EUR per month", "Project Fact Sheet", "B27", "Franchise Partner"],
  ["member-software-high", "Member software high tier", 429, "EUR per month", "Project Fact Sheet", "B28", "Franchise Partner"],
  ["service-costs", "Operating services", 750, "EUR per month", "Project Fact Sheet", "B29", "Finance"],
  ["electricity", "Electricity", 650, "EUR per month", "Project Fact Sheet", "B32", "Finance"],
  ["maintenance", "Maintenance reserve", 500, "EUR per month", "Project Fact Sheet", "B35", "Finance"],
  ["visitor-frequency", "Visit frequency", 6, "visits per member per month", "Project Fact Sheet", "B37", "Franchise Partner"],
  ["project-basis", "Economic project basis", 282000, "EUR", "Project Fact Sheet", "B60", "Bank Partner"],
  ["cash-reserve", "Additional cash reserve", 68000, "EUR", "Project Fact Sheet", "B58", "Bank Partner"],
  ["cash-break-even-mid-month-12", "Cash break-even mid case month 12", 544.45, "members", "Project Fact Sheet", "B63", "Franchise Partner"],
];

const scenarioAssumptions = [
  ["Worst-Case", 220, 350, 650, 0.033, 47.63725490196079, 0.5, 1500, 1000, 700, 500],
  ["Mid-Case", 300, 450, 850, 0.025, 47.63725490196079, 1, 1500, 1000, 700, 500],
  ["Best-Case", 350, 550, 950, 0.018, 47.63725490196079, 1.5, 1800, 1300, 1000, 800],
];

const scenarioHeaders = [
  "openingMembers",
  "targetMembersMonth3",
  "targetMembersEndYear1",
  "monthlyChurnRate",
  "netMembershipArpm",
  "addonRevenuePerMember",
  "marketingMonth1To3",
  "marketingMonth4To12",
  "marketingYear2",
  "marketingYear3",
];

const kpiRows = [
  ["active-members-end-y3", "Active members end of year 3", "members", 639, 858, 996, "Franchise Partner", "operating"],
  ["new-members-per-month", "New members per month", "members", 31, 35, 34, "Franchise Partner", "sales"],
  ["cancellations-per-month", "Cancellations per month", "members", 19, 19, 16, "Franchise Partner", "retention"],
  ["net-member-growth-per-month", "Net member growth per month", "members", 12, 16, 18, "Franchise Partner", "retention"],
  ["monthly-churn-rate", "Monthly churn rate", "percent", 0.033, 0.025, 0.018, "Franchise Partner", "retention"],
  ["average-membership-duration", "Average membership duration", "months", 30, 40, 56, "Franchise Partner", "retention"],
  ["visits-per-member", "Visit frequency per member", "visits per month", 6, 6, 6, "Franchise Partner", "operations"],
  ["members-per-square-meter", "Members per square metre", "members per sqm", 2, 2, 3, "Real Estate Partner", "real-estate"],
  ["mrr-month-36", "Monthly recurring revenue month 36", "EUR", 30793, 41775, 48916, "Franchise Partner", "revenue"],
  ["net-revenue-year-3", "Net revenue year 3", "EUR", 373612, 506592, 583197, "Franchise Partner", "revenue"],
  ["average-revenue-per-member-net", "Average revenue per member net", "EUR", 48, 48, 48, "Franchise Partner", "revenue"],
  ["addon-revenue-per-member-net", "Add-on revenue per member net", "EUR", 1, 1, 2, "Franchise Partner", "revenue"],
  ["result-after-monthly-costs-y3", "Result after monthly costs year 3", "EUR", 70616, 199756, 270370, "Bank Partner", "profitability"],
  ["result-margin-y3", "Result margin year 3", "percent", 0.189, 0.394, 0.464, "Bank Partner", "profitability"],
  ["result-per-member", "Result per member", "EUR", 110, 233, 271, "Franchise Partner", "profitability"],
  ["result-per-square-meter", "Result per square metre", "EUR per sqm", 187, 528, 715, "Real Estate Partner", "real-estate"],
  ["cumulative-cashflow-end-y3", "Cumulative cashflow end of year 3", "EUR", 166081, 498448, 680688, "Bank Partner", "cashflow"],
  ["cash-break-even-members-last-year", "Cash break-even members average last year", "members", 530, 537, 547, "Bank Partner", "cashflow"],
  ["leads-per-month", "Leads per month", "leads", 154, 173, 168, "Franchise Partner", "sales"],
  ["lead-to-member-conversion", "Lead to member conversion", "percent", 0.2, 0.2, 0.2, "Franchise Partner", "sales"],
  ["customer-acquisition-cost", "Customer acquisition cost", "EUR", 25, 22, 32, "Franchise Partner", "sales"],
  ["customer-lifetime-value", "Customer lifetime value", "EUR", 1459, 1945, 2730, "Franchise Partner", "sales"],
  ["ltv-cac-ratio", "LTV/CAC ratio", "x", 57.8, 87, 85.3, "Franchise Partner", "sales"],
  ["sales-cost-per-close", "Sales cost per close", "EUR", 25, 22, 32, "Franchise Partner", "sales"],
  ["revenue-per-square-meter-y3", "Revenue per square metre year 3", "EUR per sqm", 988, 1340, 1543, "Real Estate Partner", "real-estate"],
  ["capex-per-square-meter", "CapEx per square metre", "EUR per sqm", 746, 746, 746, "Real Estate Partner", "real-estate"],
  ["rent-per-square-meter", "Rent per square metre", "EUR per sqm", 11, 11, 11, "Real Estate Partner", "real-estate"],
  ["rent-ratio-y3", "Rent ratio year 3", "percent", 0.133, 0.098, 0.085, "Real Estate Partner", "real-estate"],
  ["space-utilization-vs-target", "Space utilization vs 2.0 members per sqm", "percent", 0.845, 1.135, 1.318, "Real Estate Partner", "real-estate"],
  ["peak-hour-utilization", "Peak-hour utilization", "percent", 0.8, 0.8, 0.8, "Studio Manager", "operations"],
  ["revenue-per-training-area", "Revenue per training area", "EUR per sqm", 988, 1340, 1543, "Real Estate Partner", "real-estate"],
  ["revenue-per-employee", "Revenue per employee", "status", "automated studio", "automated studio", "automated studio", "Franchise Partner", "operations"],
  ["total-investment-project-basis", "Total investment / project basis", "EUR", 282000, 282000, 282000, "Bank Partner", "capital"],
  ["investment-per-member", "Investment per member", "EUR", 441, 329, 283, "Bank Partner", "capital"],
  ["roic", "Return on invested capital", "percent", 0.25, 0.708, 0.959, "Bank Partner", "capital"],
  ["payback-years", "Payback time", "years", 4, 1.4, 1, "Bank Partner", "capital"],
  ["equity-ratio", "Equity ratio", "percent", 0.143, 0.143, 0.143, "Bank Partner", "capital"],
  ["debt-equity-ratio", "Debt/equity ratio", "x", 6, 6, 6, "Bank Partner", "capital"],
  ["enterprise-value", "Enterprise value at 6x year-3 result", "EUR", 423695, 1198538, 1622218, "Franchise Partner", "valuation"],
  ["enterprise-value-per-member", "Enterprise value per member", "EUR", 663, 1397, 1629, "Franchise Partner", "valuation"],
];

const bwaScenarios = [
  ["Worst-Case", 639.128513609525, 1011924.4632172508, 503105.9443418527, "2027-03-01", 2, 98081.35407982221, "2027-09-01", 8, 166081.3540798222, 166081.3540798222, 530.0396891143986],
  ["Mid-Case", 858.1691639035483, 1354173.2668594664, 835472.3137788994, "2027-01-01", 0, 430447.723516869, "2027-05-01", 4, 498447.723516869, 498447.723516869, 536.7567804678487],
  ["Best-Case", 996.0465952362222, 1553509.509549787, 1017712.7224615369, "2027-01-01", 0, 612688.1321995065, "2027-04-01", 3, 680688.1321995065, 680688.1321995064, 547.2387308942311],
];

const stakeholderViews = [
  {
    audience: "Franchise Partner",
    label: "Franchise partner investment decision view",
    visibleMetrics: ["Active members end of year 3", "Net revenue year 3", "Customer acquisition cost", "Customer lifetime value", "Payback time", "Enterprise value per member"],
    hiddenMetrics: ["Internal finance notes", "Unreleased lender conditions", "Private member records"],
    nextAction: "Review franchise partner decision package before any external release.",
  },
  {
    audience: "Bank Partner",
    label: "Bank credit review view",
    visibleMetrics: ["Total investment / project basis", "Equity ratio", "Debt/equity ratio", "Cash break-even members average last year", "Cumulative cashflow end of year 3", "Result after monthly costs year 3"],
    hiddenMetrics: ["Member-level personal data", "Candidate private notes", "Unapproved room documents"],
    nextAction: "Prepare lender package conditions; bank send remains closed.",
  },
  {
    audience: "Real Estate Partner",
    label: "Real estate lease decision view",
    visibleMetrics: ["Rent per square metre", "Rent ratio year 3", "Revenue per square metre year 3", "Members per square metre", "Space utilization vs 2.0 members per sqm"],
    hiddenMetrics: ["Bank debt detail", "Private candidate finance notes", "Member-level data"],
    nextAction: "Review lease decision evidence; owner release remains closed.",
  },
  {
    audience: "Candidate",
    label: "Candidate offer preflight view",
    visibleMetrics: ["Net revenue year 3", "Result margin year 3", "Payback time", "Customer acquisition cost", "LTV/CAC ratio"],
    hiddenMetrics: ["Internal lender workpapers", "Unapproved source records", "Private finance notes"],
    nextAction: "Candidate room is release-gated until package review passes.",
  },
  {
    audience: "Guest",
    label: "Guest teaser metrics preflight",
    visibleMetrics: ["Market-size teaser", "Studio concept economics summary", "No internal records"],
    hiddenMetrics: ["Exact workbook rows", "Candidate data", "Bank package", "Owner package", "Member data"],
    nextAction: "Guest surface receives no internal financial model records before release approval.",
  },
];

const records = [
  record("workbook-metadata", "Rotkreuzplatz financial planning workbook", {
    externalId: "financial_workbook_rotkreuzplatz_metadata",
    craysEntityId: "financial_model_rotkreuzplatz_workbook",
    owner: "Finance",
    status: "ready",
    priority: "high",
    fields: {
      ...sourceWorkbook,
      sheetsVerified: [
        "Project Fact Sheet",
        "KPIs Crays",
        "BWA Szenarien",
        "Consolidated Cashflow",
        "Crays Revenue",
        "Expenses Operational",
        "Expenses Staff",
        "One Time Cost",
        "Financing Leasing",
        "Sources Checks",
        "Crays Summary",
      ],
      formulasDetected: 2464,
      nextAction: "Convert workbook assumptions into role-scoped financial model records.",
    },
  }),
  ...siteAssumptions.map(([key, label, value, unit, sheet, cell, audience]) =>
    record("site-assumptions", `${label} - ${sourceWorkbook.location}`, {
      externalId: `financial_workbook_site_${key}`,
      craysEntityId: `financial_model_rotkreuzplatz_site_${key}`,
      owner: audience === "Real Estate Partner" ? "Real Estate" : "Finance",
      role: audience === "Real Estate Partner" ? "landlord" : "finance",
      status: "ready",
      fields: { key, label, value, unit, sourceSheet: sheet, sourceCell: cell, primaryAudience: audience, scenario: "Shared", nextAction: "Review source assumption before package release." },
    }),
  ),
  ...scenarioAssumptions.flatMap(([scenario, ...values]) =>
    scenarioHeaders.map((key, index) =>
      record("scenario-assumptions", `${scenario} ${key}`, {
        externalId: `financial_workbook_assumption_${slug(scenario)}_${key}`,
        craysEntityId: `financial_model_rotkreuzplatz_assumption_${slug(scenario)}_${key}`,
        status: "ready",
        fields: {
          scenario,
          key,
          label: key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase()),
          value: values[index],
          unit: key.includes("Rate") ? "percent" : key.includes("marketing") ? "EUR per month" : "members",
          sourceSheet: "Project Fact Sheet",
          primaryAudience: "Franchise Partner",
          nextAction: "Compare scenario assumption against source-backed forecast.",
        },
      }),
    ),
  ),
  ...kpiRows.flatMap(([key, label, unit, worst, mid, best, audience, category], kpiIndex) =>
    [
      ["Worst-Case", worst],
      ["Mid-Case", mid],
      ["Best-Case", best],
    ].map(([scenario, value]) =>
      record("kpi-matrix", `${label} - ${scenario}`, {
        externalId: `financial_workbook_kpi_${key}_${slug(scenario)}`,
        craysEntityId: `financial_model_rotkreuzplatz_kpi_${key}_${slug(scenario)}`,
        owner: audience === "Bank Partner" ? "Finance" : audience === "Real Estate Partner" ? "Real Estate" : "Finance",
        role: audience === "Real Estate Partner" ? "landlord" : "finance",
        priority: scenario === "Mid-Case" ? "high" : "medium",
        fields: {
          metricKey: key,
          metricNumber: kpiIndex + 1,
          metricLabel: label,
          value,
          unit,
          scenario,
          category,
          primaryAudience: audience,
          sourceSheet: "KPIs Crays",
          sourceRow: kpiIndex + 3,
          sourceColumn: scenario === "Worst-Case" ? "B" : scenario === "Mid-Case" ? "C" : "D",
          nextAction: "Use this KPI in the role-scoped decision package.",
        },
      }),
    ),
  ),
  ...bwaScenarios.map(([scenario, membersDec2029, revenue3Years, ebitda3Years, ebitdaPositiveFrom, ebitdaLossMonths, result3Years, resultPositiveFrom, resultLossMonths, netCashflow3Years, cumulativeLiquidityEnd, cashBep]) =>
    record("bwa-scenario-summary", `${scenario} BWA scenario summary`, {
      externalId: `financial_workbook_bwa_${slug(scenario)}`,
      craysEntityId: `financial_model_rotkreuzplatz_bwa_${slug(scenario)}`,
      owner: "Finance",
      status: scenario === "Mid-Case" ? "decision_base" : "scenario",
      priority: scenario === "Mid-Case" ? "high" : "medium",
      fields: {
        scenario,
        membersDec2029,
        revenue3Years,
        ebitdaBeforeLeasingAndFinancing3Years: ebitda3Years,
        ebitdaPositiveFrom,
        ebitdaLossMonths,
        resultAfterAllMonthlyCosts3Years: result3Years,
        resultPositiveFrom,
        resultLossMonths,
        netCashflow3Years,
        cumulativeLiquidityEnd,
        cashBreakEvenMembersAverageLastYear: cashBep,
        sourceSheet: "BWA Szenarien",
        primaryAudience: "Bank Partner",
        nextAction: "Use BWA scenario summary in finance and lender review.",
      },
    }),
  ),
  ...stakeholderViews.map((view) =>
    record("stakeholder-finance-views", view.label, {
      externalId: `financial_workbook_role_view_${slug(view.audience)}`,
      craysEntityId: `financial_model_rotkreuzplatz_role_view_${slug(view.audience)}`,
      owner: view.audience,
      role: view.audience === "Bank Partner" ? "bank-partner" : view.audience === "Real Estate Partner" ? "landlord" : view.audience === "Franchise Partner" ? "franchise-partner" : "finance",
      status: view.audience === "Guest" || view.audience === "Candidate" ? "release_blocked" : "ready",
      priority: view.audience === "Franchise Partner" || view.audience === "Bank Partner" ? "high" : "medium",
      syncStatus: view.audience === "Guest" || view.audience === "Candidate" ? "conflict" : "synced",
      fields: { ...view, sourceSheet: "Role metric access design", scenario: "Mid-Case", nextAction: view.nextAction },
    }),
  ),
];

async function persist(client) {
  await client.query(
    `
      insert into crays_core.integration_connections (
        connection_id, module_key, system_key, connection_name, owner_role, status,
        connection_mode, secret_reference_status, connection_health, metadata, updated_at
      )
      values ($1, 'analytics', 'financial-model-source', 'Financial workbook source snapshot', 'finance', 'active',
        'sync_read_model', 'not_required', 'healthy', $2::jsonb, now())
      on conflict (connection_id) do update set
        status = excluded.status,
        connection_health = excluded.connection_health,
        metadata = excluded.metadata,
        updated_at = now()
    `,
    [
      "core_source_financial_workbook",
      json({
        generatedAt,
        seedBatch,
        sourceWorkbook,
        sourceWritesEnabled: false,
        reportPublicationEnabled: false,
        externalSendingEnabled: false,
        families: [...new Set(records.map((record) => record.family))],
        records: records.length,
      }),
    ],
  );

  await client.query(
    `
      insert into crays_core.sync_jobs (
        job_id, connection_id, job_type, direction, status, attempt_count,
        crays_entity_type, crays_entity_id, payload_summary,
        scheduled_at, started_at, finished_at, updated_at
      )
      values ($1, 'core_source_financial_workbook', 'read_sync', 'read', 'succeeded', 1, 'financial-model', 'financial_model_rotkreuzplatz_workbook', $2::jsonb, now(), now(), now(), now())
      on conflict (job_id) do update set
        status = excluded.status,
        attempt_count = crays_core.sync_jobs.attempt_count + 1,
        payload_summary = excluded.payload_summary,
        finished_at = now(),
        updated_at = now()
    `,
    [
      `sync_job_${digest(["financial-workbook", seedBatch, generatedAt, records.length], 28)}`,
      json({ generatedAt, seedBatch, recordsSeen: records.length, sourceWritesEnabled: false, reportPublicationEnabled: false }),
    ],
  );

  for (const item of records) {
    await client.query(
      `
        insert into crays_core.external_record_maps (
          map_id, crays_entity_type, crays_entity_id, external_system, external_entity_type, external_entity_id,
          sync_direction, sync_status, last_synced_at, metadata, updated_at
        )
        values ($1, $2, $3, 'financial-workbook', $4, $5, 'read', $6, now(), $7::jsonb, now())
        on conflict (external_system, external_entity_type, external_entity_id) do update set
          crays_entity_type = excluded.crays_entity_type,
          crays_entity_id = excluded.crays_entity_id,
          sync_status = excluded.sync_status,
          last_synced_at = excluded.last_synced_at,
          metadata = excluded.metadata,
          updated_at = now()
      `,
      [
        `source_map_${digest(["financial-workbook", item.family, item.externalId], 28)}`,
        item.craysEntityType,
        item.craysEntityId,
        item.family,
        item.externalId,
        item.syncStatus,
        json({
          label: item.label,
          family: item.family,
          owner: item.owner,
          role: item.role,
          status: item.status,
          dueDate: item.dueDate,
          priority: item.priority,
          generatedAt,
          sourceDigest: digest({ family: item.family, label: item.label, fields: item.fields }, 32),
          fields: item.fields,
        }),
      ],
    );
  }
}

async function main() {
  console.log(JSON.stringify({ target: getRedactedDatabaseTarget(connectionString), apply, records: records.length, seedBatch }, null, 2));
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          status: "dry_run",
          families: records.reduce((acc, record) => ({ ...acc, [record.family]: (acc[record.family] ?? 0) + 1 }), {}),
          conflicts: records.filter((record) => record.syncStatus === "conflict").length,
          closedGates: {
            sourceWritesEnabled: false,
            syncApplyEnabled: false,
            targetApplyEnabled: false,
            reportPublicationEnabled: false,
            externalSendingEnabled: false,
            bankSendEnabled: false,
            paymentInitiationEnabled: false,
            financePostingEnabled: false,
          },
        },
        null,
        2,
      ),
    );
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await persist(client);
    await client.query("commit");
    const counts = await client.query(
      `
        select
          count(*)::int as records,
          count(*) filter (where sync_status = 'conflict')::int as conflicts,
          count(distinct external_entity_type)::int as families
        from crays_core.external_record_maps
        where external_system = 'financial-workbook'
      `,
    );
    console.log(JSON.stringify({ status: "seeded", counts: counts.rows[0] }, null, 2));
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
