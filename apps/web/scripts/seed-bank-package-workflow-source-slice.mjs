import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_BANK_PACKAGE_WORKFLOW === "APPLY_BANK_PACKAGE_WORKFLOW_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-bank-package-workflow-20260713-v1";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_BANK_PACKAGE_WORKFLOW=APPLY_BANK_PACKAGE_WORKFLOW_SOURCE_SLICE to apply Bank Package workflow source records.");
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
  moduleKey: "loans",
  seedBatch,
  sourceAsOf: "2026-07-13",
  packageId: "bank_package_munich_rotkreuzplatz_schneider_fitness",
  loanCaseId: "loan_case_munich_rotkreuzplatz_schneider_fitness",
  preparedOfferId: "prepared_franchise_deal_munich_rotkreuzplatz_schneider_fitness",
  propertyCaseId: "property_case_gudrunstrasse_3_rotkreuzplatz",
  candidateName: "Lea Schneider",
  candidateCompany: "Schneider Fitness Beteiligungs GmbH",
  bankPartner: "Isar Commercial Finance AG",
  realEstatePartner: "Keller & Brandt Real Estate GmbH",
  siteName: "Gudrunstrasse 3 Studio Lease",
  city: "Munich",
  district: "Rotkreuzplatz",
  sourceDatasets: ["financial-workbook", "financial-forecast-5y", "location-intelligence", "files-engine", "erp-engine", "loans"],
  bankSendEnabled: false,
  lenderReleaseEnabled: false,
  packagePublicationEnabled: false,
  financePostingEnabled: false,
  accountingExportsEnabled: false,
  paymentInitiationEnabled: false,
  sourceWritesEnabled: false,
  syncApplyEnabled: false,
  targetApplyEnabled: false,
  uploadsEnabled: false,
  externalSendingEnabled: false,
  liveAiEnabled: false,
};

function craysEntityTypeForFamily(family) {
  if (family === "bank-package-summary") return "bank-package";
  if (family === "credit-decision-metrics") return "financial-model";
  if (family === "financial-model-evidence") return "financial-model";
  if (family === "location-evidence") return "location-analysis";
  if (family === "files-evidence") return "document";
  if (family === "loan-conditions") return "loan-case";
  if (family === "redaction-preflight") return "evidence-package";
  if (family === "bank-review-actions") return "bank-package";
  return "bank-package";
}

function record(family, externalId, label, fields, options = {}) {
  return {
    family,
    externalId,
    label,
    craysEntityType: options.craysEntityType ?? craysEntityTypeForFamily(family),
    craysEntityId: options.craysEntityId ?? `${craysEntityTypeForFamily(family).replaceAll("-", "_")}_${slug(externalId)}`,
    owner: options.owner ?? fields.ownerRole ?? "CRAYS Finance",
    status: options.status ?? fields.status ?? "review",
    priority: options.priority ?? fields.priority ?? "medium",
    syncStatus: options.syncStatus ?? (fields.status === "blocked" || fields.priority === "critical" ? "conflict" : "synced"),
    dueDate: options.dueDate ?? fields.dueDate ?? "2026-07-20",
    fields: { ...baseFields, ...fields },
  };
}

const records = [
  record("bank-package-summary", "package_scope_munich_rotkreuzplatz_credit", "Munich Rotkreuzplatz bank credit package scope", {
    status: "attention",
    priority: "high",
    ownerRole: "CRAYS Finance",
    audience: "Bank Partner",
    packageStatus: "internal_review",
    readinessScore: 82,
    requestedLoanAmount: 241800,
    equityAmount: 40200,
    totalInvestment: 282000,
    currency: "EUR",
    currentState: "Bank package is assembled for internal credit review; lender release and bank send remain closed.",
    nextAction: "Review missing redactions and finance evidence before lender release can be requested.",
    href: "/loans?role=finance&view=bank-package",
  }),
  record("bank-package-summary", "package_audience_munich_rotkreuzplatz_credit", "Bank package stakeholder audience map", {
    status: "review_ready",
    priority: "medium",
    ownerRole: "Reviewer",
    audience: "Reviewer",
    visibleForBank: ["loan amount", "equity proof state", "forecast base metrics", "location evidence", "document checklist", "conditions"],
    hiddenForBank: ["internal margin sensitivity", "member-level payment rows", "candidate private notes", "owner contact details"],
    currentState: "Audience scope is defined but release review is still closed.",
    nextAction: "Confirm redaction matrix before any bank-facing room can be opened.",
    href: "/dashboard?role=reviewer&view=rooms",
  }),
  record("bank-package-summary", "package_bank_partner_preview", "Isar Commercial Finance scoped package preview", {
    status: "release_blocked",
    priority: "high",
    ownerRole: "CRAYS Finance",
    audience: "Bank Partner",
    visibleForBank: true,
    packageStatus: "release_blocked",
    currentState: "Bank partner can inspect scoped package readiness metrics only; no document room or send is open.",
    nextAction: "Keep bank preview in read-only package state until Finance and Reviewer clear release gates.",
    href: "/loans?role=bank-partner&view=bank-package",
  }),

  ...[
    ["Requested debt", "requested_debt", 241800, "EUR", "ready", "Bank Partner", "Requested bank debt equals 85.7% of project basis after equity contribution."],
    ["Equity contribution", "equity_contribution", 40200, "EUR", "attention", "Bank Partner", "Equity contribution is defined; proof-of-funds evidence is still conditionally reviewed."],
    ["Total project investment", "total_project_investment", 282000, "EUR", "ready", "Bank Partner", "Project basis matches Financial Model and opening budget evidence."],
    ["Mid-Case Year-3 net revenue", "mid_case_year3_net_revenue", 506592, "EUR", "ready", "Bank Partner", "Revenue is sourced from the financial workbook and compared to CRAYS operating benchmark assumptions."],
    ["Mid-Case Year-3 result", "mid_case_year3_result", 199756, "EUR", "ready", "Bank Partner", "Year-3 result supports payback and debt service review."],
    ["Debt service coverage estimate", "dscr_estimate", 2.41, "ratio", "ready", "Bank Partner", "Debt service coverage estimate is above the internal package threshold."],
    ["Cash break-even members", "cash_break_even_members", 537, "members", "ready", "Bank Partner", "Break-even member count is below Mid-Case year-3 member forecast."],
    ["Payback time", "payback_years", 1.4, "years", "ready", "Franchise Partner", "Payback time uses Year-3 result and project investment basis."],
  ].map(([label, key, value, unit, status, audience, context]) =>
    record("credit-decision-metrics", `credit_metric_${key}`, label, {
      status,
      priority: status === "attention" ? "high" : "medium",
      ownerRole: "CRAYS Finance",
      audience,
      metricKey: key,
      value,
      unit,
      context,
      nextAction: status === "attention" ? "Attach reviewed proof before package can leave internal review." : "Keep metric in bank package evidence pack.",
      href: "/analytics?role=finance&view=financial-model",
    }),
  ),

  ...[
    ["Financial workbook Mid-Case KPI set", "financial_workbook_mid_case_kpis", "ready", "The Mid-Case KPI table is linked to package decisions and stakeholder metric access.", "financial-workbook"],
    ["5-year forecast credit extension", "forecast_5y_credit_extension", "ready", "Year-4 and Year-5 forecast rows extend the bankable planning view beyond the 3-year workbook.", "financial-forecast-5y"],
    ["Benchmark comparison sheet", "benchmark_comparison", "review_ready", "CRAYS KPI assumptions are compared with internal operating benchmark ranges.", "financial-workbook"],
    ["Worst/Mid/Best sensitivity deck", "scenario_sensitivity", "ready", "Sensitivity rows show downside and upside on members, revenue, margin, ROIC and payback.", "financial-forecast-5y"],
    ["Partner economics summary", "partner_economics_summary", "attention", "Franchise Partner economics are ready for internal package review but not externally released.", "financial-workbook"],
    ["Finance ledger quality bridge", "erp_ledger_quality_bridge", "blocked", "ERP Finance Ledger flags EUR 531.41 at risk before package can be marked clean.", "erp-engine"],
  ].map(([label, key, status, context, sourceSystem]) =>
    record("financial-model-evidence", `finance_evidence_${key}`, label, {
      status,
      priority: status === "blocked" ? "critical" : status === "attention" ? "high" : "medium",
      ownerRole: "CRAYS Finance",
      audience: "Bank Partner",
      sourceSystem,
      context,
      nextAction: status === "blocked" ? "Resolve finance ledger quality bridge before lender review." : "Keep evidence linked to package preflight.",
      href: sourceSystem === "erp-engine" ? "/erp?role=finance&view=finance-ledger" : "/analytics?role=finance&view=financial-model",
    }),
  ),

  ...[
    ["Mid-Case validated member potential", "mid_case_member_potential", 1250, "members", "ready", "Validated catchment potential supports year-5 active member forecast."],
    ["Locality confidence", "locality_confidence", 0.82, "score", "ready", "Location confidence links catchment, accessibility, competition and rent fit."],
    ["Year-5 rent ratio", "year5_rent_ratio", 0.0853, "percent", "ready", "Rent ratio is inside the bank package lease comfort band."],
    ["Transit catchment depth", "transit_catchment_depth", 1390, "members", "ready", "Transit-accessible member pool supports a robust demand floor."],
    ["Competition pressure", "competition_pressure", 0.31, "score", "attention", "Competition pressure is manageable but needs differentiation note in the package."],
    ["Site access evidence", "site_access_evidence", 0.86, "score", "ready", "Accessibility evidence supports commuting and neighborhood demand assumptions."],
  ].map(([label, key, value, unit, status, context]) =>
    record("location-evidence", `location_evidence_${key}`, label, {
      status,
      priority: status === "attention" ? "high" : "medium",
      ownerRole: "Expansion Manager",
      audience: "Bank Partner",
      metricKey: key,
      value,
      unit,
      context,
      nextAction: status === "attention" ? "Attach competition differentiation note before bank review." : "Keep location evidence linked to package.",
      href: "/analytics?role=finance&view=location-intelligence",
    }),
  ),

  ...[
    ["Bank affordability worksheet v6", "bank_affordability_worksheet_v6", "blocked", "Finance", "Internal margin sensitivity must be redacted before bank room preview."],
    ["Credit package executive brief", "credit_package_executive_brief", "approved", "Reviewer", "Executive credit brief is approved for internal package review."],
    ["Lease appendix redaction copy", "lease_appendix_redaction_copy", "required", "Expansion Manager", "Owner contact and negotiation notes must be redacted before bank package release."],
    ["Franchise agreement finance schedule", "franchise_agreement_finance_schedule", "review", "Reviewer", "Agreement finance schedule needs reviewer sign-off before lender review."],
    ["Opening budget evidence package", "opening_budget_evidence_package", "approved", "Finance", "Project investment basis is supported by opening budget evidence."],
    ["Equipment supplier confirmation", "equipment_supplier_confirmation", "approved", "Procurement", "Equipment quote and delivery confirmation are linked to opening CapEx."],
    ["Insurance evidence request", "insurance_evidence_request", "required", "Finance", "Insurance evidence is requested but not approved for lender package."],
    ["Bank room document grant", "bank_room_document_grant", "blocked", "Finance", "Bank room grant remains blocked until redactions and release gate pass."],
  ].map(([label, key, status, ownerRole, context]) =>
    record("files-evidence", `files_evidence_${key}`, label, {
      status,
      priority: ["blocked", "required"].includes(status) ? "high" : "medium",
      ownerRole,
      audience: "Bank Partner",
      sourceSystem: "files-engine",
      context,
      nextAction: ["blocked", "required"].includes(status) ? "Resolve document evidence before bank package can be released." : "Keep document evidence in package.",
      href: "/files?role=finance&view=packages&record=bank",
    }),
  ),

  ...[
    ["Proof of own equity", "proof_of_own_equity", "conditional", "Lea Schneider must provide reviewed own-equity proof for EUR 40,200."],
    ["Lease term condition", "lease_term_condition", "ready", "Lease term and break options are acceptable for the credit package."],
    ["Insurance condition", "insurance_condition", "required", "Business interruption and liability policy evidence is still required."],
    ["Source of funds condition", "source_of_funds_condition", "review", "Source-of-funds review is open but not externally sent."],
    ["Debt reserve condition", "debt_reserve_condition", "ready", "Reserve amount is included in opening liquidity plan."],
    ["Franchise agreement condition", "franchise_agreement_condition", "attention", "Agreement schedule requires final reviewer sign-off."],
    ["Opening budget condition", "opening_budget_condition", "ready", "Opening budget evidence matches total project investment basis."],
  ].map(([label, key, status, context]) =>
    record("loan-conditions", `loan_condition_${key}`, label, {
      status,
      priority: ["conditional", "required", "review", "attention"].includes(status) ? "high" : "medium",
      ownerRole: "CRAYS Finance",
      audience: "Bank Partner",
      conditionKey: key,
      context,
      nextAction: status === "ready" ? "Keep condition in bank package." : "Stage condition review before lender package release.",
      href: "/loans?role=finance&view=conditions",
    }),
  ),

  ...[
    ["Member-level finance rows redaction", "member_level_finance_rows", "ready", "Member-level payment and refund rows are aggregated before bank view."],
    ["Internal margin sensitivity redaction", "internal_margin_sensitivity", "blocked", "Internal scenario margin notes are not bank-visible until Finance approves redaction."],
    ["Candidate private notes redaction", "candidate_private_notes", "ready", "Candidate notes are excluded from bank package scope."],
    ["Owner contact details redaction", "owner_contact_details", "required", "Owner contact details must be removed from lease appendix before bank room release."],
  ].map(([label, key, status, context]) =>
    record("redaction-preflight", `redaction_${key}`, label, {
      status,
      priority: status === "blocked" ? "critical" : status === "required" ? "high" : "medium",
      ownerRole: status === "required" ? "Expansion Manager" : "Reviewer",
      audience: "Reviewer",
      context,
      nextAction: status === "ready" ? "Keep redaction rule in package preflight." : "Resolve redaction before bank package release.",
      href: "/dashboard?role=reviewer&view=rooms",
    }),
  ),

  ...[
    ["Finance package review", "finance_package_review", "blocked", "CRAYS Finance", "Classify ledger quality bridge and document blockers before the package can advance."],
    ["Reviewer release preflight", "reviewer_release_preflight", "blocked", "Reviewer", "Confirm audience, redactions, evidence and hidden sections before any release."],
    ["Bank partner question log", "bank_partner_question_log", "attention", "CRAYS Finance", "CRAYS can prepare questions internally; no external message is sent."],
    ["Condition owner assignment", "condition_owner_assignment", "attention", "CRAYS Finance", "Assign Finance and Expansion owners to unresolved conditions."],
    ["Package readiness sign-off", "package_readiness_signoff", "blocked", "CRAYS Management", "Management sign-off is blocked until finance and redaction work is complete."],
  ].map(([label, key, status, ownerRole, context]) =>
    record("bank-review-actions", `review_action_${key}`, label, {
      status,
      priority: status === "blocked" ? "critical" : "high",
      ownerRole,
      audience: "CRAYS Management",
      checklistItemKey: key,
      context,
      nextAction: "Stage guarded bank-package review command; bank send and lender release remain closed.",
      href: "/dashboard?role=finance&view=actions",
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
  return family
    .split("-")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapId(item) {
  return `map_${digest({ moduleKey: "loans", sectionKey: item.family, rowId: item.externalId }, 30)}`;
}

function row(item) {
  return {
    id: item.externalId,
    label: item.label,
    status: item.status,
    owner: item.owner,
    modifiedAt: generatedAt,
    role: "finance",
    dueDate: item.dueDate,
    priority: item.priority,
    fields: item.fields,
  };
}

async function persist(client) {
  const connectionId = "core_source_bank_package_workflow";
  const systemKey = "bank-package-engine";
  const groupedRecords = grouped();
  const jobId = `sync_job_${digest(["bank-package-workflow", generatedAt, records.length], 28)}`;

  await client.query(
    `
      insert into crays_core.integration_connections (
        connection_id, module_key, system_key, connection_name, owner_role, status,
        connection_mode, secret_reference_status, connection_health, metadata, updated_at
      )
      values ($1, 'loans', $2, 'Bank package workflow source slice', 'finance', 'active', 'sync_read_model', 'configured_reference', 'healthy', $3::jsonb, now())
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
      values ($1, $2, 'read_sync', 'read', 'succeeded', 1, 'bank-package', 'bank_package_munich_rotkreuzplatz_schneider_fitness', $3::jsonb, now(), now(), now(), now())
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
          moduleKey: "loans",
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
      bankSendEnabled: false,
      lenderReleaseEnabled: false,
      packagePublicationEnabled: false,
      financePostingEnabled: false,
      accountingExportsEnabled: false,
      paymentInitiationEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
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
