import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_LOCATION_INTELLIGENCE === "APPLY_LOCATION_INTELLIGENCE_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-location-intelligence-rotkreuzplatz-20260712-v1";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_LOCATION_INTELLIGENCE=APPLY_LOCATION_INTELLIGENCE_SOURCE_SLICE to apply Location Intelligence source records.");
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

const baseFields = {
  moduleKey: "analytics",
  seedBatch,
  sourceAsOf: "2026-07-12",
  siteId: "property_gudrunstrasse_3_munich_rotkreuzplatz",
  siteName: "Gudrunstrasse 3 Studio Lease",
  preparedOfferId: "prepared_offer_munich_rotkreuzplatz_brandt_fitness",
  propertyCaseId: "property_case_gudrunstrasse_3_rotkreuzplatz",
  partnerCompany: "Brandt Fitness Muenchen GmbH",
  franchisePartner: "Lukas Brandt",
  realEstatePartner: "Hirschgarten Immobilien GmbH",
  bankPartner: "Isar Commercial Finance AG",
  sourceWritesEnabled: false,
  syncApplyEnabled: false,
  targetApplyEnabled: false,
  liveExternalReadEnabled: false,
  reportPublicationEnabled: false,
  externalSendingEnabled: false,
  bankSendEnabled: false,
  candidateReleaseEnabled: false,
  ownerReleaseEnabled: false,
  paymentInitiationEnabled: false,
  financePostingEnabled: false,
  forecastSource: "3-year workbook baseline plus 5-year forecast extension",
};

function record(family, label, options = {}) {
  const externalId = options.externalId ?? `location_intelligence_${slug(family)}_${digest(label, 10)}`;
  return {
    family,
    label,
    externalId,
    craysEntityType: options.craysEntityType ?? "location-analysis",
    craysEntityId: options.craysEntityId ?? `location_analysis_rotkreuzplatz_${slug(label)}_${digest([family, label], 8)}`,
    syncStatus: options.syncStatus ?? "synced",
    owner: options.owner ?? "Expansion Manager",
    role: options.role ?? "expansion-manager",
    status: options.status ?? "ready",
    priority: options.priority ?? "medium",
    fields: { ...baseFields, ...options.fields },
  };
}

const catchmentBands = [
  { mode: "Walk", minutes: 5, population: 9_850, targetAdults: 2_950, memberPotential: 198, conversionBase: 0.067, confidence: 0.82 },
  { mode: "Walk", minutes: 10, population: 28_400, targetAdults: 8_620, memberPotential: 512, conversionBase: 0.059, confidence: 0.86 },
  { mode: "Walk", minutes: 15, population: 51_800, targetAdults: 15_750, memberPotential: 785, conversionBase: 0.05, confidence: 0.83 },
  { mode: "Bike", minutes: 5, population: 31_200, targetAdults: 9_310, memberPotential: 480, conversionBase: 0.052, confidence: 0.78 },
  { mode: "Bike", minutes: 10, population: 86_500, targetAdults: 25_980, memberPotential: 1_115, conversionBase: 0.043, confidence: 0.8 },
  { mode: "Bike", minutes: 15, population: 148_900, targetAdults: 44_100, memberPotential: 1_620, conversionBase: 0.037, confidence: 0.76 },
  { mode: "Transit", minutes: 10, population: 74_800, targetAdults: 22_350, memberPotential: 910, conversionBase: 0.041, confidence: 0.81 },
  { mode: "Transit", minutes: 15, population: 164_000, targetAdults: 48_700, memberPotential: 1_438, conversionBase: 0.03, confidence: 0.79 },
  { mode: "Transit", minutes: 20, population: 238_000, targetAdults: 71_200, memberPotential: 1_690, conversionBase: 0.024, confidence: 0.72 },
];

const competitors = [
  { name: "Neuhausen Athletic Club", format: "Premium full-service gym", distanceMeters: 340, pressure: 0.42, cannibalizationRisk: "medium", note: "Strong brand awareness, limited small-group training capacity." },
  { name: "Nymphenburg Fitness Loft", format: "Boutique strength studio", distanceMeters: 780, pressure: 0.36, cannibalizationRisk: "low", note: "Higher price point and narrower programming." },
  { name: "Donnersberger Functional Studio", format: "Functional training", distanceMeters: 920, pressure: 0.31, cannibalizationRisk: "medium", note: "Overlap on evening classes, smaller catchment." },
  { name: "Olympiapark Health Club", format: "Large club", distanceMeters: 1_650, pressure: 0.28, cannibalizationRisk: "low", note: "Car-oriented destination; limited walk overlap." },
  { name: "Rotkreuzplatz EMS Lounge", format: "Micro-studio", distanceMeters: 210, pressure: 0.22, cannibalizationRisk: "low", note: "Different training model; relevant for price anchoring only." },
  { name: "Arnulfpark Training House", format: "Corporate wellness studio", distanceMeters: 1_220, pressure: 0.24, cannibalizationRisk: "medium", note: "Office worker overlap during lunch hours." },
  { name: "Hirschgarten Cross Training", format: "Class-led studio", distanceMeters: 1_410, pressure: 0.3, cannibalizationRisk: "medium", note: "Comparable community positioning; weaker transit access." },
  { name: "Schwanthalerhoehe Health Studio", format: "Budget fitness", distanceMeters: 1_870, pressure: 0.18, cannibalizationRisk: "low", note: "Price-sensitive segment, limited direct overlap with planned offer." },
];

const demographicSegments = [
  { segment: "Young professionals 25-39", populationShare: 0.31, fitnessAffinity: 0.72, purchasingPowerIndex: 116, conversionSignal: "high" },
  { segment: "Urban families 30-49", populationShare: 0.27, fitnessAffinity: 0.55, purchasingPowerIndex: 121, conversionSignal: "medium" },
  { segment: "Students and early career", populationShare: 0.12, fitnessAffinity: 0.68, purchasingPowerIndex: 88, conversionSignal: "medium" },
  { segment: "Established professionals 40-59", populationShare: 0.19, fitnessAffinity: 0.46, purchasingPowerIndex: 129, conversionSignal: "medium" },
  { segment: "Health-oriented seniors", populationShare: 0.11, fitnessAffinity: 0.34, purchasingPowerIndex: 105, conversionSignal: "selective" },
];

const accessibilitySignals = [
  { signal: "Public transport access", score: 88, evidence: "Subway, tram and bus nodes within the primary catchment.", status: "ready" },
  { signal: "Pedestrian visibility", score: 79, evidence: "Strong neighbourhood footfall and clear approach routes from Rotkreuzplatz.", status: "ready" },
  { signal: "Bike accessibility", score: 84, evidence: "Bikeable access covers Nymphenburg edge, Hirschgarten and Arnulfpark corridors.", status: "ready" },
  { signal: "Car and parking friction", score: 54, evidence: "Urban parking pressure limits car-led acquisition.", status: "attention" },
  { signal: "Evening peak capacity fit", score: 76, evidence: "Peak demand can fit the planned training floor if class cadence is controlled.", status: "ready" },
];

const memberPotentialScenarios = [
  { scenario: "Worst-Case", year5Members: 807, validatedPotential: 1_050, captureRate: 0.077, preSalesTarget: 180, status: "attention", nextAction: "Stress-test acquisition ramp and parking friction before external release." },
  { scenario: "Mid-Case", year5Members: 1_099, validatedPotential: 1_250, captureRate: 0.088, preSalesTarget: 260, status: "ready", nextAction: "Use Mid-Case as management baseline and link to partner decision package." },
  { scenario: "Best-Case", year5Members: 1_271, validatedPotential: 1_400, captureRate: 0.091, preSalesTarget: 320, status: "ready", nextAction: "Keep Best-Case as upside sensitivity; do not present as guaranteed outcome." },
];

const rentAndEconomics = [
  { metric: "Net rent per sqm", value: 11, unit: "EUR/sqm", audience: "Real Estate Partner", status: "ready", nextAction: "Confirm lease benchmark against local studio alternatives." },
  { metric: "Annual rent and service charges", value: 58_800, unit: "EUR", audience: "Finance", status: "ready", nextAction: "Keep linked to 5-year rent ratio and cash break-even records." },
  { metric: "Mid-Case Year-3 rent ratio", value: 0.1161, unit: "percent", audience: "Bank Partner", status: "ready", nextAction: "Use with Year-3 workbook baseline for credit review." },
  { metric: "Mid-Case Year-5 rent ratio", value: 0.0853, unit: "percent", audience: "Real Estate Partner", status: "ready", nextAction: "Use for lease sustainability conversation after room preflight." },
  { metric: "Cash break-even members", value: 537, unit: "members", audience: "Bank Partner", status: "ready", nextAction: "Compare against catchment-backed member potential before debt conditions." },
  { metric: "Forecast confidence adjustment", value: 0.82, unit: "score", audience: "CRAYS Management", status: "attention", nextAction: "Review live-provider-ready input completeness before release." },
];

const forecastImpacts = [
  { scenario: "Worst-Case", metric: "Member potential headroom", value: 243, unit: "members", audience: "Franchise Partner", status: "attention", nextAction: "Validate acquisition plan if parking friction persists." },
  { scenario: "Mid-Case", metric: "Member potential headroom", value: 151, unit: "members", audience: "Franchise Partner", status: "ready", nextAction: "Approve as partner baseline once evidence package review is complete." },
  { scenario: "Best-Case", metric: "Member potential headroom", value: 129, unit: "members", audience: "Franchise Partner", status: "ready", nextAction: "Use only as upside sensitivity in candidate package." },
  { scenario: "Mid-Case", metric: "Year-5 revenue supported by catchment", value: 689_755, unit: "EUR", audience: "Bank Partner", status: "ready", nextAction: "Connect forecast revenue to bank credit package conditions." },
  { scenario: "Mid-Case", metric: "Presale months to cash break-even", value: 24, unit: "months", audience: "Finance", status: "attention", nextAction: "Confirm marketing spend and ramp sequence before package release." },
  { scenario: "Mid-Case", metric: "Locality confidence", value: 0.82, unit: "score", audience: "CRAYS Management", status: "ready", nextAction: "Keep monitoring input freshness through Sync Health." },
];

const stakeholderViews = [
  { audience: "CRAYS Management", label: "Management location decision view", metrics: ["Locality confidence", "Catchment quality", "Competition pressure", "Forecast impact"], status: "ready", syncStatus: "synced", nextAction: "Approve evidence sufficiency for the management decision workflow." },
  { audience: "Franchise Partner", label: "Partner location investment view", metrics: ["Member potential", "Payback impact", "Presale target", "Competition pressure"], status: "ready", syncStatus: "synced", nextAction: "Use only in the partner decision workflow after package preflight." },
  { audience: "Bank Partner", label: "Bank location credit support view", metrics: ["Catchment-backed revenue", "Cash break-even members", "Rent ratio", "Locality confidence"], status: "ready", syncStatus: "synced", nextAction: "Attach to the bank package review workflow; bank send remains closed." },
  { audience: "Real Estate Partner", label: "Real estate lease sustainability view", metrics: ["Rent ratio", "Catchment quality", "Access score", "Opening fit"], status: "ready", syncStatus: "synced", nextAction: "Use in lease decision workflow after redaction review." },
  { audience: "Reviewer", label: "Evidence reviewer location workpaper", metrics: ["Input lineage", "Confidence gaps", "Redaction status", "Release blocker"], status: "attention", syncStatus: "synced", nextAction: "Resolve parking friction note and candidate visibility before release." },
  { audience: "Candidate", label: "Candidate location offer preflight", metrics: ["Site score", "Demand summary", "Deal economics"], status: "release_blocked", syncStatus: "conflict", nextAction: "Candidate release remains blocked until stakeholder package approval." },
];

const records = [
  record("site-inputs", "Gudrunstrasse 3 Studio Lease source input", {
    externalId: "location_site_input_gudrunstrasse_3_rotkreuzplatz",
    craysEntityType: "property",
    craysEntityId: "property_gudrunstrasse_3_munich_rotkreuzplatz",
    owner: "Expansion Manager",
    role: "expansion-manager",
    priority: "high",
    fields: {
      address: "Gudrunstrasse 3, 80634 Munich",
      district: "Neuhausen-Nymphenburg",
      neighbourhood: "Rotkreuzplatz",
      latitude: 48.1532,
      longitude: 11.5334,
      grossAreaSqm: 379.4,
      trainingAreaSqm: 378,
      monthlyNetRent: 3_700,
      monthlyServiceCharges: 1_200,
      leaseStatus: "term sheet under review",
      nextAction: "Confirm lease evidence package before external stakeholder release.",
      primaryAudience: "CRAYS Management",
    },
  }),
  record("site-inputs", "Neuhausen local operating context", {
    externalId: "location_site_input_neuhausen_operating_context",
    craysEntityType: "property-case",
    craysEntityId: "property_case_gudrunstrasse_3_rotkreuzplatz",
    owner: "Expansion Manager",
    priority: "high",
    fields: {
      context: "Dense residential and office-adjacent neighbourhood with strong public-transport reach and evening training demand.",
      mainNeighbourhoods: ["Neuhausen", "Rotkreuzplatz", "Nymphenburg edge", "Donnersbergerstrasse corridor", "Hirschgarten"],
      primaryRisk: "Car access and parking friction during evening peak.",
      nextAction: "Classify parking friction and link mitigation to opening marketing plan.",
      primaryAudience: "CRAYS Management",
    },
  }),
  ...catchmentBands.map((band) =>
    record("catchment-bands", `${band.mode} ${band.minutes} minute catchment`, {
      externalId: `location_catchment_${slug(band.mode)}_${band.minutes}m`,
      priority: band.memberPotential >= 900 ? "high" : "medium",
      fields: {
        mode: band.mode,
        minutes: band.minutes,
        population: band.population,
        targetAdults: band.targetAdults,
        memberPotential: band.memberPotential,
        conversionBase: band.conversionBase,
        confidence: band.confidence,
        primaryAudience: band.mode === "Transit" ? "Bank Partner" : "Franchise Partner",
        nextAction: "Use catchment band as source-backed input for member forecast sensitivity.",
      },
    }),
  ),
  ...memberPotentialScenarios.map((scenario) =>
    record("member-potential", `${scenario.scenario} location-backed member potential`, {
      externalId: `location_member_potential_${slug(scenario.scenario)}`,
      priority: scenario.scenario === "Mid-Case" ? "high" : "medium",
      status: scenario.status,
      fields: {
        scenario: scenario.scenario,
        year5Members: scenario.year5Members,
        validatedPotential: scenario.validatedPotential,
        captureRate: scenario.captureRate,
        preSalesTarget: scenario.preSalesTarget,
        primaryAudience: "Franchise Partner",
        nextAction: scenario.nextAction,
      },
    }),
  ),
  ...competitors.map((competitor) =>
    record("competition-pressure", `${competitor.name} competition signal`, {
      externalId: `location_competition_${slug(competitor.name)}`,
      priority: competitor.pressure >= 0.35 ? "high" : "medium",
      status: competitor.cannibalizationRisk === "medium" ? "attention" : "ready",
      fields: {
        competitorName: competitor.name,
        competitorFormat: competitor.format,
        distanceMeters: competitor.distanceMeters,
        pressure: competitor.pressure,
        cannibalizationRisk: competitor.cannibalizationRisk,
        evidenceNote: competitor.note,
        primaryAudience: "CRAYS Management",
        nextAction: competitor.pressure >= 0.35 ? "Review local differentiation before partner package release." : "Keep as supporting competition context.",
      },
    }),
  ),
  ...demographicSegments.map((segment) =>
    record("demographic-fit", `${segment.segment} demand signal`, {
      externalId: `location_demographic_fit_${slug(segment.segment)}`,
      fields: {
        segment: segment.segment,
        populationShare: segment.populationShare,
        fitnessAffinity: segment.fitnessAffinity,
        purchasingPowerIndex: segment.purchasingPowerIndex,
        conversionSignal: segment.conversionSignal,
        primaryAudience: "Franchise Partner",
        nextAction: "Use demographic fit as acquisition plan input, not as guaranteed conversion.",
      },
    }),
  ),
  ...accessibilitySignals.map((signal) =>
    record("accessibility", `${signal.signal} score`, {
      externalId: `location_accessibility_${slug(signal.signal)}`,
      status: signal.status,
      priority: signal.status === "attention" ? "high" : "medium",
      fields: {
        signal: signal.signal,
        score: signal.score,
        evidence: signal.evidence,
        primaryAudience: signal.signal.includes("parking") ? "Real Estate Partner" : "CRAYS Management",
        nextAction: signal.status === "attention" ? "Link mitigation action to opening project before release." : "Use as supporting access evidence.",
      },
    }),
  ),
  ...rentAndEconomics.map((metric) =>
    record("rent-potential-link", `${metric.metric} location economics`, {
      externalId: `location_rent_potential_${slug(metric.metric)}`,
      owner: metric.audience === "Real Estate Partner" ? "Real Estate" : "Finance",
      role: metric.audience === "Real Estate Partner" ? "landlord" : metric.audience === "Bank Partner" ? "bank-partner" : "finance",
      status: metric.status,
      priority: ["Mid-Case Year-5 rent ratio", "Cash break-even members"].includes(metric.metric) ? "high" : "medium",
      fields: {
        metric: metric.metric,
        value: metric.value,
        unit: metric.unit,
        primaryAudience: metric.audience,
        connectedForecast: "financial_forecast_5y_mid_case_2031",
        nextAction: metric.nextAction,
      },
    }),
  ),
  ...forecastImpacts.map((impact) =>
    record("forecast-impact-links", `${impact.scenario} ${impact.metric}`, {
      externalId: `location_forecast_impact_${slug(impact.scenario)}_${slug(impact.metric)}`,
      owner: impact.audience === "Bank Partner" ? "Finance" : "CRAYS Management",
      role: impact.audience === "Bank Partner" ? "bank-partner" : impact.audience === "Franchise Partner" ? "franchise-partner" : "crays-management",
      status: impact.status,
      priority: impact.status === "attention" ? "high" : "medium",
      fields: {
        scenario: impact.scenario,
        metric: impact.metric,
        value: impact.value,
        unit: impact.unit,
        primaryAudience: impact.audience,
        connectedForecast: "financial_forecast_5y",
        nextAction: impact.nextAction,
      },
    }),
  ),
  ...stakeholderViews.map((view) =>
    record("stakeholder-location-views", view.label, {
      externalId: `location_stakeholder_view_${slug(view.audience)}`,
      craysEntityType: "evidence-package",
      craysEntityId: `evidence_package_location_${slug(view.audience)}`,
      owner: view.audience,
      role: view.audience === "Bank Partner" ? "bank-partner" : view.audience === "Real Estate Partner" ? "landlord" : view.audience === "Franchise Partner" ? "franchise-partner" : view.audience === "Reviewer" ? "reviewer" : "crays-management",
      status: view.status,
      syncStatus: view.syncStatus,
      priority: view.status === "release_blocked" ? "high" : "medium",
      fields: {
        audience: view.audience,
        visibleMetrics: view.metrics,
        hiddenUntilRelease: ["Internal review notes", "Raw source diagnostics", "Unapproved stakeholder package"],
        primaryAudience: view.audience,
        nextAction: view.nextAction,
      },
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
      values ($1, 'analytics', 'location-intelligence-source', 'Location Intelligence source snapshot', 'crays-management', 'active',
        'sync_read_model', 'configured_reference', 'healthy', $2::jsonb, now())
      on conflict (connection_id) do update set
        status = excluded.status,
        connection_health = excluded.connection_health,
        metadata = excluded.metadata,
        updated_at = now()
    `,
    [
      "core_source_location_intelligence",
      json({
        generatedAt,
        seedBatch,
        records: records.length,
        families: [...new Set(records.map((record) => record.family))],
        liveExternalReadEnabled: false,
        sourceWritesEnabled: false,
        externalReleaseEnabled: false,
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
      values ($1, 'core_source_location_intelligence', 'analytics_refresh', 'read', 'succeeded', 1, 'location-analysis', 'location_analysis_rotkreuzplatz_summary', $2::jsonb, now(), now(), now(), now())
      on conflict (job_id) do update set
        status = excluded.status,
        attempt_count = crays_core.sync_jobs.attempt_count + 1,
        payload_summary = excluded.payload_summary,
        finished_at = now(),
        updated_at = now()
    `,
    [`sync_job_${digest(["location-intelligence", seedBatch, generatedAt, records.length], 28)}`, json({ generatedAt, seedBatch, recordsSeen: records.length, liveExternalReadEnabled: false })],
  );

  for (const item of records) {
    await client.query(
      `
        insert into crays_core.external_record_maps (
          map_id, crays_entity_type, crays_entity_id, external_system, external_entity_type, external_entity_id,
          sync_direction, sync_status, last_synced_at, metadata, updated_at
        )
        values ($1, $2, $3, 'location-intelligence', $4, $5, 'read', $6, now(), $7::jsonb, now())
        on conflict (external_system, external_entity_type, external_entity_id) do update set
          crays_entity_type = excluded.crays_entity_type,
          crays_entity_id = excluded.crays_entity_id,
          sync_status = excluded.sync_status,
          last_synced_at = excluded.last_synced_at,
          metadata = excluded.metadata,
          updated_at = now()
      `,
      [
        `source_map_${digest(["location-intelligence", item.family, item.externalId], 28)}`,
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
            liveExternalReadEnabled: false,
            sourceWritesEnabled: false,
            syncApplyEnabled: false,
            targetApplyEnabled: false,
            reportPublicationEnabled: false,
            externalSendingEnabled: false,
            bankSendEnabled: false,
            candidateReleaseEnabled: false,
            ownerReleaseEnabled: false,
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
        where external_system = 'location-intelligence'
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
