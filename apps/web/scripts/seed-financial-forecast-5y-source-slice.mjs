import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_FINANCIAL_FORECAST_5Y === "APPLY_FINANCIAL_FORECAST_5Y_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-financial-forecast-5y-rotkreuzplatz-20260712-v1";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_FINANCIAL_FORECAST_5Y=APPLY_FINANCIAL_FORECAST_5Y_SOURCE_SLICE to apply 5-year forecast source records.");
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

const projectBasis = 282_000;
const annualRentAndServiceCharges = (3_700 + 1_200) * 12;
const annualDebtService = 135_008.19675401016;

const baseline = {
  "Worst-Case": {
    cap: 1_050,
    year4NetGrowthPerMonth: 9,
    year5NetGrowthPerMonth: 7,
    marginLift: 0.004,
    years: {
      2027: { activeMembersEnd: 650, revenue: 261_140.67096909063, ebitda: 90_289.8340948581, result: -44_718.362659152044, netCashflow: 23_281.637340847945, cumulativeCash: 23_281.63734084795 },
      2028: { activeMembersEnd: 655.52458240146, revenue: 377_172.2740499364, ebitda: 207_192.02463674452, result: 72_183.82788273437, netCashflow: 72_183.82788273437, cumulativeCash: 95_465.46522358233 },
      2029: { activeMembersEnd: 639.128513609525, revenue: 373_611.5181982238, ebitda: 205_624.08561025004, result: 70_615.88885623988, netCashflow: 70_615.88885623988, cumulativeCash: 166_081.3540798222, cashBreakEvenMembers: 530.0396891143986 },
    },
  },
  "Mid-Case": {
    cap: 1_250,
    year4NetGrowthPerMonth: 13,
    year5NetGrowthPerMonth: 10,
    marginLift: 0.006,
    years: {
      2027: { activeMembersEnd: 850, revenue: 342_648.80876100855, ebitda: 169_444.4244080344, result: 34_436.227654024246, netCashflow: 102_436.22765402426, cumulativeCash: 102_436.22765402426 },
      2028: { activeMembersEnd: 878.8201819590688, revenue: 504_932.66228815657, ebitda: 331_263.33166458603, result: 196_255.1349105759, netCashflow: 196_255.1349105759, cumulativeCash: 298_691.36256460013 },
      2029: { activeMembersEnd: 858.1691639035483, revenue: 506_591.79581030144, ebitda: 334_764.557706279, result: 199_756.36095226885, netCashflow: 199_756.36095226885, cumulativeCash: 498_447.723516869, cashBreakEvenMembers: 536.7567804678487 },
    },
  },
  "Best-Case": {
    cap: 1_400,
    year4NetGrowthPerMonth: 15,
    year5NetGrowthPerMonth: 12,
    marginLift: 0.007,
    years: {
      2027: { activeMembersEnd: 950, revenue: 400_509.7630933751, ebitda: 221_854.64368405388, result: 86_846.44693004373, netCashflow: 154_846.44693004372, cumulativeCash: 154_846.44693004375 },
      2028: { activeMembersEnd: 981.5533762868381, revenue: 569_802.7166382986, ebitda: 390_480.26319536765, result: 255_472.0664413575, netCashflow: 255_472.0664413575, cumulativeCash: 410_318.51337140123 },
      2029: { activeMembersEnd: 996.0465952362222, revenue: 583_197.0298181134, ebitda: 405_377.8155821154, result: 270_369.6188281053, netCashflow: 270_369.6188281053, cumulativeCash: 680_688.1321995064, cashBreakEvenMembers: 547.2387308942311 },
    },
  },
};

function extendYears() {
  return Object.entries(baseline).flatMap(([scenario, scenarioData]) => {
    const years = { ...scenarioData.years };
    for (const year of [2030, 2031]) {
      const previous = years[year - 1];
      const yearIndex = year - 2029;
      const netGrowth = year === 2030 ? scenarioData.year4NetGrowthPerMonth : scenarioData.year5NetGrowthPerMonth;
      const activeMembersEnd = Math.min(scenarioData.cap, previous.activeMembersEnd + netGrowth * 12);
      const revenuePerEndMemberY3 = scenarioData.years[2029].revenue / scenarioData.years[2029].activeMembersEnd;
      const revenue = activeMembersEnd * revenuePerEndMemberY3 * (1 + 0.015) ** yearIndex;
      const y3Margin = scenarioData.years[2029].result / scenarioData.years[2029].revenue;
      const resultMargin = Math.min(0.49, y3Margin + scenarioData.marginLift * yearIndex);
      const result = revenue * resultMargin;
      const ebitda = result + annualDebtService;
      const netCashflow = result;
      const cumulativeCash = previous.cumulativeCash + netCashflow;
      const cashBreakEvenMembers = (scenarioData.years[2029].cashBreakEvenMembers ?? 540) * (1 + 0.012 * yearIndex);
      years[year] = { activeMembersEnd, revenue, ebitda, result, netCashflow, cumulativeCash, cashBreakEvenMembers };
    }

    return Object.entries(years).map(([year, values]) => {
      const numericYear = Number(year);
      const resultMargin = values.result / values.revenue;
      const rentRatio = annualRentAndServiceCharges / values.revenue;
      const enterpriseValue = values.result * 6;
      const roic = values.result / projectBasis;
      const paybackYears = values.result > 0 ? projectBasis / values.result : null;
      return {
        scenario,
        year: numericYear,
        sourceType: numericYear <= 2029 ? "workbook_3_year_source" : "forecast_extension",
        activeMembersEnd: values.activeMembersEnd,
        revenue: values.revenue,
        ebitdaBeforeLeasingAndFinancing: values.ebitda,
        resultAfterMonthlyCosts: values.result,
        netCashflow: values.netCashflow,
        cumulativeCash: values.cumulativeCash,
        cashBreakEvenMembers: values.cashBreakEvenMembers ?? null,
        resultMargin,
        rentRatio,
        enterpriseValue,
        roic,
        paybackYears,
      };
    });
  });
}

const annualForecasts = extendYears();

const forecastMetrics = [
  ["activeMembersEnd", "Active members end of year", "members", "Franchise Partner"],
  ["revenue", "Net revenue", "EUR", "Franchise Partner"],
  ["ebitdaBeforeLeasingAndFinancing", "EBITDA before leasing and financing", "EUR", "Bank Partner"],
  ["resultAfterMonthlyCosts", "Result after monthly costs", "EUR", "Bank Partner"],
  ["netCashflow", "Net cashflow", "EUR", "Bank Partner"],
  ["cumulativeCash", "Cumulative cash", "EUR", "Bank Partner"],
  ["cashBreakEvenMembers", "Cash break-even members", "members", "Bank Partner"],
  ["resultMargin", "Result margin", "percent", "Franchise Partner"],
  ["rentRatio", "Rent ratio", "percent", "Real Estate Partner"],
  ["enterpriseValue", "Enterprise value at 6x result", "EUR", "Franchise Partner"],
  ["roic", "Return on invested capital", "percent", "Bank Partner"],
  ["paybackYears", "Payback time", "years", "Franchise Partner"],
];

const baseFields = {
  moduleKey: "analytics",
  seedBatch,
  sourceWorkbook: "Crays_Rotkreuzplatz_Muc_3yr_plan_financial_forecast.xlsx",
  sourceAsOf: "2026-07-12",
  sourceWritesEnabled: false,
  syncApplyEnabled: false,
  targetApplyEnabled: false,
  reportPublicationEnabled: false,
  externalSendingEnabled: false,
  bankSendEnabled: false,
  paymentInitiationEnabled: false,
  financePostingEnabled: false,
  forecastBasis: "Year 1-3 from workbook source tables; Year 4-5 from explicit CRAYS forecast extension assumptions.",
  locationIntelligenceInputStatus: "pending_block_45_review",
};

function record(family, label, options = {}) {
  const externalId = options.externalId ?? `financial_forecast_5y_${slug(family)}_${digest(label, 10)}`;
  return {
    family,
    label,
    externalId,
    craysEntityType: "financial-model",
    craysEntityId: options.craysEntityId ?? `financial_model_rotkreuzplatz_5y_${slug(label)}_${digest([family, label], 8)}`,
    syncStatus: options.syncStatus ?? "synced",
    owner: options.owner ?? "Finance",
    role: options.role ?? "finance",
    status: options.status ?? "ready",
    priority: options.priority ?? "medium",
    fields: { ...baseFields, ...options.fields },
  };
}

const records = [
  record("forecast-assumptions", "5-year forecast operating assumptions", {
    externalId: "financial_forecast_5y_assumptions",
    craysEntityId: "financial_model_rotkreuzplatz_5y_assumptions",
    priority: "high",
    fields: {
      projectBasis,
      annualRentAndServiceCharges,
      annualDebtService,
      annualArpmUplift: 0.015,
      annualCashBreakEvenInflation: 0.012,
      scenarioMemberCaps: Object.fromEntries(Object.entries(baseline).map(([scenario, data]) => [scenario, data.cap])),
      nextAction: "Review Year 4-5 assumptions before stakeholder package release.",
      primaryAudience: "Finance",
    },
  }),
  ...annualForecasts.map((forecast) =>
    record("annual-forecast", `${forecast.scenario} ${forecast.year} annual forecast`, {
      externalId: `financial_forecast_5y_annual_${slug(forecast.scenario)}_${forecast.year}`,
      craysEntityId: `financial_model_rotkreuzplatz_5y_annual_${slug(forecast.scenario)}_${forecast.year}`,
      priority: forecast.scenario === "Mid-Case" ? "high" : "medium",
      status: forecast.sourceType === "forecast_extension" ? "review" : "ready",
      fields: {
        ...forecast,
        primaryAudience: "Finance",
        sourceSheet: forecast.sourceType === "workbook_3_year_source" ? "Szenarien / BWA Szenarien" : "Forecast extension",
        nextAction: forecast.sourceType === "forecast_extension" ? "Review extension assumptions before package use." : "Use workbook-backed baseline for Year 1-3 comparison.",
      },
    }),
  ),
  ...annualForecasts.flatMap((forecast) =>
    forecastMetrics.map(([metricKey, metricLabel, unit, audience]) =>
      record("forecast-kpis", `${forecast.scenario} ${forecast.year} ${metricLabel}`, {
        externalId: `financial_forecast_5y_kpi_${slug(forecast.scenario)}_${forecast.year}_${metricKey}`,
        craysEntityId: `financial_model_rotkreuzplatz_5y_kpi_${slug(forecast.scenario)}_${forecast.year}_${metricKey}`,
        owner: audience === "Real Estate Partner" ? "Real Estate" : "Finance",
        role: audience === "Real Estate Partner" ? "landlord" : audience === "Bank Partner" ? "bank-partner" : "finance",
        priority: forecast.scenario === "Mid-Case" && forecast.year >= 2030 ? "high" : "medium",
        status: forecast.year >= 2030 ? "review" : "ready",
        fields: {
          scenario: forecast.scenario,
          forecastYear: forecast.year,
          metricKey,
          metricLabel,
          value: forecast[metricKey],
          unit,
          primaryAudience: audience,
          sourceType: forecast.sourceType,
          sourceSheet: forecast.sourceType === "workbook_3_year_source" ? "Szenarien / BWA Szenarien" : "Forecast extension",
          nextAction: forecast.year >= 2030 ? "Review 5-year forecast sensitivity before external release." : "Compare workbook baseline against extended forecast.",
        },
      }),
    ),
  ),
  ...[
    ["Franchise Partner", "5-year partner return view", ["Active members end of year", "Net revenue", "Payback time", "Enterprise value at 6x result"], "Review partner decision economics; release remains gated."],
    ["Bank Partner", "5-year bank debt capacity view", ["EBITDA before leasing and financing", "Result after monthly costs", "Cumulative cash", "Cash break-even members"], "Review lender conditions; bank send remains closed."],
    ["Real Estate Partner", "5-year rent sustainability view", ["Rent ratio", "Net revenue", "Active members end of year"], "Review lease sustainability; owner release remains closed."],
    ["CRAYS Management", "5-year portfolio planning view", ["Return on invested capital", "Cumulative cash", "Result margin"], "Review management scenario before board reporting."],
    ["Candidate", "5-year candidate offer preflight", ["Payback time", "Net revenue", "Result margin"], "Candidate release remains blocked until reviewed package approval."],
  ].map(([audience, label, metrics, nextAction]) =>
    record("stakeholder-forecast-views", label, {
      externalId: `financial_forecast_5y_role_${slug(audience)}`,
      craysEntityId: `financial_model_rotkreuzplatz_5y_role_${slug(audience)}`,
      owner: audience,
      role: audience === "Bank Partner" ? "bank-partner" : audience === "Real Estate Partner" ? "landlord" : audience === "Franchise Partner" ? "franchise-partner" : "finance",
      status: audience === "Candidate" ? "release_blocked" : "ready",
      syncStatus: audience === "Candidate" ? "conflict" : "synced",
      fields: { audience, visibleMetrics: metrics, hiddenUntilRelease: ["Detailed workbook rows", "Internal review notes", "Unapproved evidence packages"], nextAction, primaryAudience: audience },
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
      values ($1, 'analytics', 'financial-forecast-source', 'Financial 5-year forecast source snapshot', 'finance', 'active',
        'sync_read_model', 'not_required', 'healthy', $2::jsonb, now())
      on conflict (connection_id) do update set
        status = excluded.status,
        connection_health = excluded.connection_health,
        metadata = excluded.metadata,
        updated_at = now()
    `,
    ["core_source_financial_forecast_5y", json({ generatedAt, seedBatch, records: records.length, families: [...new Set(records.map((record) => record.family))], closedGates: baseFields })],
  );

  await client.query(
    `
      insert into crays_core.sync_jobs (
        job_id, connection_id, job_type, direction, status, attempt_count,
        crays_entity_type, crays_entity_id, payload_summary,
        scheduled_at, started_at, finished_at, updated_at
      )
      values ($1, 'core_source_financial_forecast_5y', 'read_sync', 'read', 'succeeded', 1, 'financial-model', 'financial_model_rotkreuzplatz_5y_assumptions', $2::jsonb, now(), now(), now(), now())
      on conflict (job_id) do update set
        status = excluded.status,
        attempt_count = crays_core.sync_jobs.attempt_count + 1,
        payload_summary = excluded.payload_summary,
        finished_at = now(),
        updated_at = now()
    `,
    [`sync_job_${digest(["financial-forecast-5y", seedBatch, generatedAt, records.length], 28)}`, json({ generatedAt, seedBatch, recordsSeen: records.length, sourceWritesEnabled: false })],
  );

  for (const item of records) {
    await client.query(
      `
        insert into crays_core.external_record_maps (
          map_id, crays_entity_type, crays_entity_id, external_system, external_entity_type, external_entity_id,
          sync_direction, sync_status, last_synced_at, metadata, updated_at
        )
        values ($1, $2, $3, 'financial-forecast-5y', $4, $5, 'read', $6, now(), $7::jsonb, now())
        on conflict (external_system, external_entity_type, external_entity_id) do update set
          crays_entity_type = excluded.crays_entity_type,
          crays_entity_id = excluded.crays_entity_id,
          sync_status = excluded.sync_status,
          last_synced_at = excluded.last_synced_at,
          metadata = excluded.metadata,
          updated_at = now()
      `,
      [
        `source_map_${digest(["financial-forecast-5y", item.family, item.externalId], 28)}`,
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
        where external_system = 'financial-forecast-5y'
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
