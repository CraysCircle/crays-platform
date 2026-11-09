import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_ROLE_METRIC_ACCESS === "APPLY_ROLE_METRIC_ACCESS_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-role-metric-access-20260712-v1";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_ROLE_METRIC_ACCESS=APPLY_ROLE_METRIC_ACCESS_SOURCE_SLICE to apply Role Metric Access source records.");
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
  policyOwner: "CRAYS Management",
  financeOwner: "CRAYS Finance",
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
};

const metrics = [
  { key: "active-members-year-3", label: "Active members end of Year 3", category: "Financial Forecast", sourceDataset: "financial-workbook", sourceFamily: "kpi-matrix", value: 858, unit: "members", owner: "Finance", defaultVisibility: "scoped" },
  { key: "active-members-year-5", label: "Active members end of Year 5", category: "Financial Forecast", sourceDataset: "financial-forecast-5y", sourceFamily: "forecast-kpis", value: 1_099, unit: "members", owner: "Finance", defaultVisibility: "scoped" },
  { key: "mid-case-year-5-revenue", label: "Mid-Case Year-5 revenue", category: "Financial Forecast", sourceDataset: "financial-forecast-5y", sourceFamily: "forecast-kpis", value: 689_755, unit: "EUR", owner: "Finance", defaultVisibility: "scoped" },
  { key: "year-3-result-margin", label: "Year-3 result margin", category: "Financial Forecast", sourceDataset: "financial-workbook", sourceFamily: "kpi-matrix", value: 0.394, unit: "percent", owner: "Finance", defaultVisibility: "scoped" },
  { key: "cash-break-even-members", label: "Cash break-even members", category: "Bank Credit", sourceDataset: "financial-workbook", sourceFamily: "kpi-matrix", value: 537, unit: "members", owner: "Finance", defaultVisibility: "scoped" },
  { key: "total-project-investment", label: "Total project investment", category: "Bank Credit", sourceDataset: "financial-workbook", sourceFamily: "site-assumptions", value: 282_000, unit: "EUR", owner: "Finance", defaultVisibility: "scoped" },
  { key: "payback-years", label: "Payback time", category: "Partner Economics", sourceDataset: "financial-forecast-5y", sourceFamily: "forecast-kpis", value: 1.2, unit: "years", owner: "Finance", defaultVisibility: "scoped" },
  { key: "enterprise-value", label: "Enterprise value at 6x result", category: "Partner Economics", sourceDataset: "financial-forecast-5y", sourceFamily: "forecast-kpis", value: 1_398_294, unit: "EUR", owner: "CRAYS Management", defaultVisibility: "scoped" },
  { key: "mid-case-year-5-rent-ratio", label: "Mid-Case Year-5 rent ratio", category: "Real Estate", sourceDataset: "location-intelligence", sourceFamily: "rent-potential-link", value: 0.0853, unit: "percent", owner: "Expansion Manager", defaultVisibility: "scoped" },
  { key: "rent-per-sqm", label: "Net rent per square meter", category: "Real Estate", sourceDataset: "location-intelligence", sourceFamily: "rent-potential-link", value: 11, unit: "EUR/sqm", owner: "Expansion Manager", defaultVisibility: "scoped" },
  { key: "member-potential-mid-case", label: "Mid-Case location-backed member potential", category: "Location Intelligence", sourceDataset: "location-intelligence", sourceFamily: "member-potential", value: 1_250, unit: "members", owner: "Expansion Manager", defaultVisibility: "scoped" },
  { key: "catchment-strength", label: "Transit catchment member potential", category: "Location Intelligence", sourceDataset: "location-intelligence", sourceFamily: "catchment-bands", value: 1_438, unit: "members", owner: "Expansion Manager", defaultVisibility: "scoped" },
  { key: "competition-pressure", label: "Average competition pressure", category: "Location Intelligence", sourceDataset: "location-intelligence", sourceFamily: "competition-pressure", value: 0.29, unit: "score", owner: "Expansion Manager", defaultVisibility: "scoped" },
  { key: "locality-confidence", label: "Locality confidence", category: "Location Intelligence", sourceDataset: "location-intelligence", sourceFamily: "forecast-impact-links", value: 0.82, unit: "score", owner: "CRAYS Management", defaultVisibility: "scoped" },
  { key: "current-active-members", label: "Current active members", category: "Member Operations", sourceDataset: "member-app", sourceFamily: "studio", value: 1_248, unit: "members", owner: "Studio Manager", defaultVisibility: "scoped" },
  { key: "checkins-today", label: "Check-ins today", category: "Member Operations", sourceDataset: "member-app", sourceFamily: "studio", value: 312, unit: "check-ins", owner: "Studio Manager", defaultVisibility: "scoped" },
  { key: "payment-exceptions", label: "Open payment exceptions", category: "Member Payments", sourceDataset: "member-app", sourceFamily: "support-requests", value: 3, unit: "exceptions", owner: "Finance", defaultVisibility: "restricted" },
  { key: "open-support-requests", label: "Open support requests", category: "Member Support", sourceDataset: "member-app", sourceFamily: "support-requests", value: 6, unit: "requests", owner: "Studio Manager", defaultVisibility: "restricted" },
  { key: "trainer-shift-capacity", label: "Trainers on shift", category: "Studio Operations", sourceDataset: "member-app", sourceFamily: "trainer-schedules", value: 7, unit: "trainers", owner: "Studio Manager", defaultVisibility: "scoped" },
  { key: "stakeholder-release-blockers", label: "Stakeholder release blockers", category: "Package Preflight", sourceDataset: "files-workflow", sourceFamily: "release-preflights", value: 4, unit: "blockers", owner: "Reviewer", defaultVisibility: "internal" },
  { key: "bank-send-status", label: "Bank send status", category: "Package Preflight", sourceDataset: "loans", sourceFamily: "bank-package", value: "blocked", unit: "status", owner: "Finance", defaultVisibility: "internal" },
  { key: "candidate-release-status", label: "Candidate release status", category: "Package Preflight", sourceDataset: "files-workflow", sourceFamily: "release-preflights", value: "blocked", unit: "status", owner: "Reviewer", defaultVisibility: "internal" },
];

const rolePolicy = {
  "crays-management": { label: "CRAYS Management", defaultAccess: "full", package: "Management cockpit" },
  finance: { label: "CRAYS Finance", defaultAccess: "full_finance", package: "Finance control" },
  "deal-manager": { label: "Deal Manager", defaultAccess: "deal_scoped", package: "Prepared deal control" },
  "franchise-partner": { label: "Franchise Partner", defaultAccess: "partner_scoped", package: "Partner decision package" },
  "bank-partner": { label: "Bank Partner", defaultAccess: "bank_scoped", package: "Bank credit package" },
  landlord: { label: "Real Estate Partner", defaultAccess: "real_estate_scoped", package: "Lease decision package" },
  reviewer: { label: "Reviewer", defaultAccess: "review_full", package: "Evidence review" },
  "studio-manager": { label: "Studio Manager", defaultAccess: "studio_scoped", package: "Studio operating view" },
  "franchise-candidate": { label: "Franchise Candidate", defaultAccess: "release_blocked", package: "Candidate offer preflight" },
  guest: { label: "Guest", defaultAccess: "release_blocked", package: "Public discovery" },
};

function visibilityFor(roleKey, metric) {
  if (roleKey === "crays-management" || roleKey === "reviewer") return "full";
  if (roleKey === "finance") {
    if (["Member Operations", "Member Support", "Studio Operations"].includes(metric.category)) return "aggregate";
    return "full";
  }
  if (roleKey === "deal-manager") {
    if (["Member Payments"].includes(metric.category)) return "aggregate";
    if (["Package Preflight", "Financial Forecast", "Partner Economics", "Location Intelligence", "Real Estate", "Bank Credit"].includes(metric.category)) return "scoped";
    return "hidden";
  }
  if (roleKey === "franchise-partner") {
    if (["Financial Forecast", "Partner Economics", "Location Intelligence", "Member Operations", "Studio Operations", "Member Support"].includes(metric.category)) return "scoped";
    if (metric.category === "Member Payments") return "aggregate";
    return "hidden";
  }
  if (roleKey === "bank-partner") {
    if (["Bank Credit", "Financial Forecast", "Real Estate", "Location Intelligence"].includes(metric.category)) return "scoped";
    if (metric.key === "payment-exceptions") return "aggregate";
    return "hidden";
  }
  if (roleKey === "landlord") {
    if (["Real Estate", "Location Intelligence"].includes(metric.category)) return "scoped";
    if (metric.key === "mid-case-year-5-revenue") return "aggregate";
    return "hidden";
  }
  if (roleKey === "studio-manager") {
    if (["Member Operations", "Member Support", "Studio Operations"].includes(metric.category)) return "full";
    if (metric.category === "Member Payments") return "aggregate";
    return "hidden";
  }
  if (roleKey === "franchise-candidate") {
    if (["Financial Forecast", "Partner Economics", "Location Intelligence", "Real Estate"].includes(metric.category)) return "release_blocked";
    return "hidden";
  }
  if (roleKey === "guest") return "hidden";
  return "hidden";
}

function reasonFor(visibility, role, metric) {
  if (visibility === "full") return `${role.label} can inspect the full ${metric.category} metric and source lineage.`;
  if (visibility === "aggregate") return `${role.label} can inspect aggregate ${metric.category} values without member-level or internal workpaper detail.`;
  if (visibility === "scoped") return `${role.label} can inspect reviewed, role-scoped ${metric.category} metrics for the active prepared deal.`;
  if (visibility === "release_blocked") return `${role.label} needs a reviewed stakeholder package before this metric can be shown.`;
  return `${role.label} does not need this metric for the current workflow.`;
}

function hrefFor(metric, roleKey) {
  const role = encodeURIComponent(roleKey);
  if (metric.sourceDataset === "financial-workbook") return `/analytics?role=${role}&view=financial-model&record=${metric.sourceFamily}`;
  if (metric.sourceDataset === "financial-forecast-5y") return `/analytics?role=${role}&view=financial-forecast&record=${metric.sourceFamily}`;
  if (metric.sourceDataset === "location-intelligence") return `/analytics?role=${role}&view=location-intelligence&record=${metric.sourceFamily}`;
  if (metric.sourceDataset === "member-app") return `/operations?role=${role}&view=members&record=${metric.sourceFamily}`;
  if (metric.sourceDataset === "files-workflow") return `/dashboard?role=${role}&view=rooms`;
  if (metric.sourceDataset === "loans") return `/loans?role=${role}&view=bank-package`;
  return `/analytics?role=${role}&view=role-metric-access`;
}

function record(family, label, options = {}) {
  const externalId = options.externalId ?? `role_metric_access_${slug(family)}_${digest(label, 10)}`;
  return {
    family,
    label,
    externalId,
    craysEntityType: options.craysEntityType ?? "evidence-package",
    craysEntityId: options.craysEntityId ?? `role_metric_access_${slug(label)}_${digest([family, label], 8)}`,
    syncStatus: options.syncStatus ?? "synced",
    owner: options.owner ?? "CRAYS Management",
    role: options.role ?? "crays-management",
    status: options.status ?? "ready",
    priority: options.priority ?? "medium",
    fields: { ...baseFields, ...options.fields },
  };
}

const records = [
  ...metrics.map((metric) =>
    record("metric-catalog", metric.label, {
      externalId: `role_metric_catalog_${metric.key}`,
      craysEntityType: metric.sourceDataset === "member-app" ? "member" : metric.sourceDataset === "location-intelligence" ? "location-analysis" : "financial-model",
      craysEntityId: `metric_catalog_${metric.key}`,
      owner: metric.owner,
      role: metric.owner === "Studio Manager" ? "studio-manager" : metric.owner === "Expansion Manager" ? "expansion-manager" : metric.owner === "Reviewer" ? "reviewer" : "finance",
      priority: ["Bank Credit", "Partner Economics", "Real Estate", "Location Intelligence"].includes(metric.category) ? "high" : "medium",
      fields: {
        metricKey: metric.key,
        metricLabel: metric.label,
        category: metric.category,
        sourceDataset: metric.sourceDataset,
        sourceFamily: metric.sourceFamily,
        value: metric.value,
        unit: metric.unit,
        owner: metric.owner,
        defaultVisibility: metric.defaultVisibility,
        nextAction: "Use this metric through role-scoped policy rows; do not publish unreleased stakeholder views.",
      },
    }),
  ),
  ...Object.entries(rolePolicy).flatMap(([roleKey, role]) =>
    metrics.map((metric) => {
      const visibility = visibilityFor(roleKey, metric);
      return record("role-visibility", `${role.label} / ${metric.label}`, {
        externalId: `role_metric_visibility_${roleKey}_${metric.key}`,
        craysEntityType: "evidence-package",
        craysEntityId: `role_metric_visibility_${roleKey}_${metric.key}`,
        owner: role.label,
        role: roleKey,
        status: visibility === "release_blocked" ? "release_blocked" : visibility === "hidden" ? "hidden" : "ready",
        syncStatus: visibility === "release_blocked" ? "conflict" : "synced",
        priority: visibility === "release_blocked" ? "high" : visibility === "hidden" ? "low" : "medium",
        fields: {
          roleKey,
          roleLabel: role.label,
          rolePackage: role.package,
          metricKey: metric.key,
          metricLabel: metric.label,
          category: metric.category,
          sourceDataset: metric.sourceDataset,
          sourceFamily: metric.sourceFamily,
          value: metric.value,
          unit: metric.unit,
          visibility,
          accessReason: reasonFor(visibility, role, metric),
          href: hrefFor(metric, roleKey),
          primaryAudience: role.label,
          nextAction: visibility === "release_blocked" ? "Resolve package preflight before showing this metric externally." : visibility === "hidden" ? "Keep hidden for this role." : "Expose only this role-scoped metric grain in the workflow.",
        },
      });
    }),
  ),
  ...[
    { key: "management-cockpit", label: "Management cockpit metric package", roles: ["CRAYS Management", "Finance", "Reviewer"], metrics: ["mid-case-year-5-revenue", "locality-confidence", "payment-exceptions", "stakeholder-release-blockers"], status: "ready" },
    { key: "partner-decision", label: "Franchise partner decision metric package", roles: ["Franchise Partner", "Deal Manager", "CRAYS Management"], metrics: ["active-members-year-5", "payback-years", "member-potential-mid-case", "current-active-members"], status: "ready" },
    { key: "bank-credit", label: "Bank credit metric package", roles: ["Bank Partner", "Finance", "Reviewer"], metrics: ["mid-case-year-5-revenue", "cash-break-even-members", "total-project-investment", "locality-confidence"], status: "ready" },
    { key: "lease-decision", label: "Real estate lease metric package", roles: ["Real Estate Partner", "Expansion Manager", "Reviewer"], metrics: ["mid-case-year-5-rent-ratio", "rent-per-sqm", "catchment-strength", "locality-confidence"], status: "ready" },
    { key: "candidate-offer-preflight", label: "Candidate offer metric package preflight", roles: ["Franchise Candidate", "Deal Manager", "Reviewer"], metrics: ["active-members-year-5", "payback-years", "member-potential-mid-case"], status: "release_blocked" },
  ].map((pkg) =>
    record("stakeholder-metric-packages", pkg.label, {
      externalId: `role_metric_package_${pkg.key}`,
      craysEntityType: "evidence-package",
      craysEntityId: `role_metric_package_${pkg.key}`,
      status: pkg.status,
      syncStatus: pkg.status === "release_blocked" ? "conflict" : "synced",
      priority: pkg.status === "release_blocked" ? "high" : "medium",
      fields: {
        packageKey: pkg.key,
        roles: pkg.roles,
        metrics: pkg.metrics,
        status: pkg.status,
        primaryAudience: pkg.roles[0],
        nextAction: pkg.status === "release_blocked" ? "Resolve redaction and release preflight before external offer publication." : "Use this package as the visible metric bundle for the role workflow.",
      },
    }),
  ),
  ...[
    ["No member PII in external packages", "Member-level payment, support and booking records are replaced by aggregate counts outside internal studio and finance roles."],
    ["No internal workpapers in stakeholder rooms", "Raw review notes, command IDs, unreleased source diagnostics and internal blockers stay inside reviewer/admin contexts."],
    ["No forecast guarantee language", "Best-Case and forecast-extension records must be labelled as assumptions or sensitivities before external release."],
    ["No bank-send side effect", "Bank Partner can review scoped package metrics, but bank send remains blocked."],
  ].map(([label, rule]) =>
    record("redaction-rules", label, {
      externalId: `role_metric_redaction_${slug(label)}`,
      craysEntityType: "evidence-package",
      craysEntityId: `role_metric_redaction_${slug(label)}`,
      owner: "Reviewer",
      role: "reviewer",
      priority: "high",
      fields: {
        rule,
        primaryAudience: "Reviewer",
        nextAction: "Apply this redaction rule in stakeholder-package preflight.",
      },
    }),
  ),
  ...[
    ["Review Candidate offer KPI release", "Candidate metrics are release-blocked until role package preflight and redactions pass.", "franchise-candidate"],
    ["Review Bank credit metric package", "Bank metrics are scoped to credit evidence and exclude member-level PII.", "bank-partner"],
    ["Review Real Estate lease metric package", "Lease metrics expose rent fit and catchment only, not internal financing workpapers.", "landlord"],
  ].map(([label, nextAction, roleKey]) =>
    record("visibility-review-actions", label, {
      externalId: `role_metric_review_action_${slug(label)}`,
      craysEntityType: "evidence-package",
      craysEntityId: `role_metric_review_action_${slug(label)}`,
      owner: "Reviewer",
      role: "reviewer",
      priority: "high",
      fields: {
        roleKey,
        primaryAudience: rolePolicy[roleKey].label,
        nextAction,
        commandScope: "role-metric-visibility-review",
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
      values ($1, 'analytics', 'role-metric-access-source', 'Role Metric Access source snapshot', 'crays-management', 'active',
        'sync_read_model', 'not_required', 'healthy', $2::jsonb, now())
      on conflict (connection_id) do update set
        status = excluded.status,
        connection_health = excluded.connection_health,
        metadata = excluded.metadata,
        updated_at = now()
    `,
    ["core_source_role_metric_access", json({ generatedAt, seedBatch, records: records.length, families: [...new Set(records.map((record) => record.family))] })],
  );

  await client.query(
    `
      insert into crays_core.sync_jobs (
        job_id, connection_id, job_type, direction, status, attempt_count,
        crays_entity_type, crays_entity_id, payload_summary,
        scheduled_at, started_at, finished_at, updated_at
      )
      values ($1, 'core_source_role_metric_access', 'analytics_refresh', 'read', 'succeeded', 1, 'evidence-package', 'role_metric_access_policy', $2::jsonb, now(), now(), now(), now())
      on conflict (job_id) do update set
        status = excluded.status,
        attempt_count = crays_core.sync_jobs.attempt_count + 1,
        payload_summary = excluded.payload_summary,
        finished_at = now(),
        updated_at = now()
    `,
    [`sync_job_${digest(["role-metric-access", seedBatch, generatedAt, records.length], 28)}`, json({ generatedAt, seedBatch, recordsSeen: records.length, sourceWritesEnabled: false })],
  );

  for (const item of records) {
    await client.query(
      `
        insert into crays_core.external_record_maps (
          map_id, crays_entity_type, crays_entity_id, external_system, external_entity_type, external_entity_id,
          sync_direction, sync_status, last_synced_at, metadata, updated_at
        )
        values ($1, $2, $3, 'role-metric-access', $4, $5, 'read', $6, now(), $7::jsonb, now())
        on conflict (external_system, external_entity_type, external_entity_id) do update set
          crays_entity_type = excluded.crays_entity_type,
          crays_entity_id = excluded.crays_entity_id,
          sync_status = excluded.sync_status,
          last_synced_at = excluded.last_synced_at,
          metadata = excluded.metadata,
          updated_at = now()
      `,
      [
        `source_map_${digest(["role-metric-access", item.family, item.externalId], 28)}`,
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
          visibilityRows: records.filter((record) => record.family === "role-visibility").length,
          closedGates: {
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
        where external_system = 'role-metric-access'
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
