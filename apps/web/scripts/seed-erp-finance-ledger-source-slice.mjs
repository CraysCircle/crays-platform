import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_ERP_FINANCE_LEDGER === "APPLY_ERP_FINANCE_LEDGER_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-erp-finance-ledger-20260712-v1";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_ERP_FINANCE_LEDGER=APPLY_ERP_FINANCE_LEDGER_SOURCE_SLICE to apply ERP Finance Ledger source records.");
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
  moduleKey: "erp",
  seedBatch,
  sourceAsOf: "2026-07-12",
  ledgerPeriod: "2026-07",
  studioId: "studio_berlin_mitte",
  studioName: "Berlin Mitte Studio",
  partnerId: "partner_vogt_fitness_betriebs_gmbh",
  partnerName: "Marlene Vogt",
  companyName: "Vogt Fitness Betriebs GmbH",
  sourceDatasets: ["member-app", "erp-engine", "franchise-performance"],
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
  if (family === "invoice-ledger-lines") return "member";
  if (family === "refund-liability-previews") return "member";
  if (family === "chargeback-reserve-previews") return "member";
  if (family === "cancellation-revenue-adjustments") return "member";
  if (family === "partner-finance-summaries") return "organization";
  return "financial-model";
}

function record(family, externalId, label, fields, options = {}) {
  return {
    family,
    externalId,
    label,
    craysEntityType: options.craysEntityType ?? craysEntityTypeForFamily(family),
    craysEntityId: options.craysEntityId ?? `erp_finance_ledger_${slug(externalId)}`,
    owner: options.owner ?? fields.ownerRole ?? "CRAYS Finance",
    status: options.status ?? fields.status ?? "review",
    priority: options.priority ?? fields.priority ?? "medium",
    syncStatus: options.syncStatus ?? (["critical", "high"].includes(fields.priority) || fields.status === "blocked" ? "conflict" : "synced"),
    dueDate: options.dueDate ?? fields.dueDate ?? "2026-07-15",
    fields: { ...baseFields, ...fields },
  };
}

const revenueLedgerPreviews = [
  record("monthly-revenue-ledger-previews", "revenue_membership_mrr_2026_07", "Berlin Mitte membership revenue preview", {
    status: "review_ready",
    priority: "medium",
    ownerRole: "CRAYS Finance",
    amountNet: 59904,
    amountGross: 71285.76,
    currency: "EUR",
    invoiceCount: 1248,
    metricSource: "Active member contracts and July billing cohort",
    benchmarkContext: "MRR is 5.8% above the July operating plan.",
    nextAction: "Review July membership revenue before it is used in partner performance reporting.",
    href: "/analytics?role=finance&view=franchise-performance",
  }),
  record("monthly-revenue-ledger-previews", "revenue_addon_services_2026_07", "Berlin Mitte add-on service revenue preview", {
    status: "variance_review",
    priority: "medium",
    ownerRole: "CRAYS Finance",
    amountNet: 1840,
    amountGross: 2189.6,
    currency: "EUR",
    invoiceCount: 218,
    metricSource: "Training add-ons, towel service and late cancellation fees",
    benchmarkContext: "Add-on revenue is below the Mid-Case run-rate and needs partner context.",
    nextAction: "Compare add-on revenue against visit frequency and support cases.",
    href: "/operations?role=finance",
  }),
  record("monthly-revenue-ledger-previews", "revenue_late_cancel_fees_2026_07", "Late cancellation fee revenue preview", {
    status: "policy_review",
    priority: "high",
    ownerRole: "CRAYS Finance",
    amountNet: 342.5,
    amountGross: 407.58,
    currency: "EUR",
    invoiceCount: 37,
    metricSource: "Class cancellation and no-show events",
    benchmarkContext: "Fee volume is above partner comfort range and affects member experience.",
    nextAction: "Review fee exceptions before partner reporting is marked clean.",
    href: "/operations?role=finance&view=members&record=cancellations",
  }),
  record("monthly-revenue-ledger-previews", "revenue_recovery_hold_2026_07", "Revenue hold for failed payments and chargebacks", {
    status: "blocked",
    priority: "critical",
    ownerRole: "CRAYS Finance",
    amountNet: 531.41,
    amountGross: 632.38,
    currency: "EUR",
    invoiceCount: 11,
    metricSource: "Failed payments, refunds and chargeback reserve",
    benchmarkContext: "Amount at risk is above the weekly partner threshold.",
    nextAction: "Resolve payment recovery and chargeback evidence before revenue hold is cleared.",
    href: "/erp?role=finance&view=payment-recovery",
  }),
  record("monthly-revenue-ledger-previews", "revenue_partner_reporting_pack_2026_07", "Partner reporting finance pack preview", {
    status: "attention",
    priority: "high",
    ownerRole: "CRAYS Finance",
    amountNet: 61744,
    amountGross: 73475.36,
    currency: "EUR",
    invoiceCount: 1466,
    metricSource: "Membership, add-ons, recovery hold and refund liabilities",
    benchmarkContext: "Pack is usable for internal partner review after blocked ledger rows are classified.",
    nextAction: "Stage finance review command after chargeback and refund rows are classified.",
    href: "/analytics?role=finance&view=franchise-performance",
  }),
];

const invoiceLedgerLines = [
  ["felix_hartmann", "Felix Hartmann July membership invoice", "member_app_member_1002", "Felix Hartmann", "INV-BM-202607-1002", 48.79, "failed_payment", "critical", "Review recovery status before ledger classification."],
  ["jonas_krueger", "Jonas Krueger student membership invoice", "member_app_member_1010", "Jonas Krueger", "INV-BM-202607-1010", 39.9, "failed_payment", "high", "Route student-plan recovery to Finance and Support."],
  ["camila_ferreira", "Camila Ferreira July membership invoice", "member_app_member_1005", "Camila Ferreira", "INV-BM-202607-1005", 48.79, "past_due", "high", "Resolve refund context before finance classification."],
  ["ben_adler", "Ben Adler July membership invoice", "member_app_member_1024", "Ben Adler", "INV-BM-202607-1024", 48.79, "past_due", "high", "Review mandate update before recovery communication."],
  ["alina_richter", "Alina Richter disputed membership invoice", "member_app_member_1017", "Alina Richter", "INV-BM-202607-1017", 48.79, "chargeback_review", "critical", "Keep on reserve until chargeback evidence is reviewed."],
  ["mira_schulte", "Mira Schulte July membership invoice", "member_app_member_1008", "Mira Schulte", "INV-BM-202607-1008", 48.79, "settled", "medium", "Keep settled invoice in partner reporting cohort."],
  ["noah_keller", "Noah Keller July membership invoice", "member_app_member_1014", "Noah Keller", "INV-BM-202607-1014", 48.79, "settled", "medium", "Keep settled invoice in partner reporting cohort."],
  ["emilia_hoffmann", "Emilia Hoffmann July membership invoice", "member_app_member_1021", "Emilia Hoffmann", "INV-BM-202607-1021", 48.79, "settled", "medium", "Keep settled invoice in partner reporting cohort."],
].map(([externalId, label, memberId, memberName, invoiceNumber, amountGross, status, priority, nextAction]) =>
  record("invoice-ledger-lines", `invoice_${externalId}_2026_07`, label, {
    memberId,
    memberName,
    invoiceNumber,
    status,
    priority,
    amountGross,
    amountNet: Number((amountGross / 1.19).toFixed(2)),
    currency: "EUR",
    revenueCategory: "membership",
    dueDate: "2026-07-05",
    paymentRecordId: `member_app_payment_${memberId.replace("member_app_", "")}_2026_07`,
    nextAction,
    href: "/erp?role=finance&view=payment-recovery",
  }, { syncStatus: ["failed_payment", "past_due", "chargeback_review"].includes(status) ? "conflict" : "synced" }),
);

const settlementPreviews = [
  record("payment-settlement-previews", "settlement_successful_card_batch_2026_07_05", "Successful card settlement batch July 5", {
    status: "matched",
    priority: "medium",
    ownerRole: "CRAYS Finance",
    settlementReference: "SET-BM-20260705-CARD",
    amountGross: 21784.61,
    amountNet: 18306.39,
    currency: "EUR",
    transactionCount: 447,
    nextAction: "Keep matched settlement in July finance review; no accounting export is executed.",
    href: "/erp?role=finance&view=finance-ledger",
  }),
  record("payment-settlement-previews", "settlement_successful_debit_batch_2026_07_06", "Successful debit settlement batch July 6", {
    status: "matched",
    priority: "medium",
    ownerRole: "CRAYS Finance",
    settlementReference: "SET-BM-20260706-DEBIT",
    amountGross: 49108.73,
    amountNet: 41267.84,
    currency: "EUR",
    transactionCount: 1007,
    nextAction: "Keep matched settlement in July finance review; no payment execution is available.",
    href: "/erp?role=finance&view=finance-ledger",
  }),
  record("payment-settlement-previews", "settlement_failed_payment_aging_2026_07", "Failed payment aging settlement preview", {
    status: "attention",
    priority: "high",
    ownerRole: "CRAYS Finance",
    settlementReference: "AGING-BM-202607",
    amountGross: 235.06,
    amountNet: 197.52,
    currency: "EUR",
    transactionCount: 5,
    nextAction: "Review failed-payment aging before partner performance reporting.",
    href: "/erp?role=finance&view=payment-recovery",
  }),
  record("payment-settlement-previews", "settlement_refund_liability_2026_07", "Refund liability settlement preview", {
    status: "attention",
    priority: "high",
    ownerRole: "CRAYS Finance",
    settlementReference: "REF-LIABILITY-BM-202607",
    amountGross: 110.08,
    amountNet: 92.5,
    currency: "EUR",
    transactionCount: 3,
    nextAction: "Classify refund liability before finance review command is staged.",
    href: "/erp?role=finance&view=payment-recovery",
  }),
  record("payment-settlement-previews", "settlement_chargeback_hold_2026_07", "Chargeback hold settlement preview", {
    status: "blocked",
    priority: "critical",
    ownerRole: "CRAYS Finance",
    settlementReference: "CB-HOLD-BM-202607",
    amountGross: 48.79,
    amountNet: 41,
    currency: "EUR",
    transactionCount: 1,
    nextAction: "Resolve chargeback evidence before hold can leave review status.",
    href: "/erp?role=finance&view=payment-recovery",
  }),
];

const refundLiabilityPreviews = [
  ["camila_ferreira_late_cancel", "Camila Ferreira late-cancellation refund liability", "member_app_member_1005", "Camila Ferreira", 12.5, "needs_policy_review", "high", "Confirm goodwill policy and class credit before refund approval is drafted."],
  ["alina_richter_chargeback", "Alina Richter chargeback provisional credit liability", "member_app_member_1017", "Alina Richter", 48.79, "evidence_required", "critical", "Attach dispute evidence before liability can be reclassified."],
  ["tobias_meier_contract", "Tobias Meier cancellation refund liability", "member_app_member_1012", "Tobias Meier", 48.79, "approved_record_only", "medium", "Keep approved liability in finance history; posting remains closed."],
  ["leonie_wagner_double_charge", "Leonie Wagner duplicate payment review", "member_app_member_1027", "Leonie Wagner", 48.79, "duplicate_check", "high", "Compare duplicate payment evidence before refund liability is confirmed."],
  ["david_stein_late_fee", "David Stein late-fee goodwill review", "member_app_member_1031", "David Stein", 9.9, "policy_review", "medium", "Review goodwill threshold and member support history."],
].map(([externalId, label, memberId, memberName, amountGross, status, priority, nextAction]) =>
  record("refund-liability-previews", `refund_${externalId}`, label, {
    memberId,
    memberName,
    refundRecordId: `member_app_refund_${externalId}`,
    status,
    priority,
    amountGross,
    amountNet: Number((amountGross / 1.19).toFixed(2)),
    currency: "EUR",
    dueDate: priority === "critical" ? "2026-07-13" : "2026-07-16",
    nextAction,
    href: "/erp?role=finance&view=payment-recovery",
  }, { syncStatus: ["critical", "high"].includes(priority) ? "conflict" : "synced" }),
);

const chargebackReservePreviews = [
  ["alina_richter_disputed_debit", "Alina Richter disputed debit reserve", "member_app_member_1017", "Alina Richter", 48.79, "blocked", "critical", "Reserve stays blocked until member timeline and payment evidence are reviewed."],
  ["felix_hartmann_failed_debit_reserve", "Felix Hartmann failed debit reserve", "member_app_member_1002", "Felix Hartmann", 48.79, "attention", "high", "Reserve remains open while recovery contact is prepared."],
  ["camila_ferreira_past_due_reserve", "Camila Ferreira past-due reserve", "member_app_member_1005", "Camila Ferreira", 48.79, "attention", "high", "Reserve remains open until refund context is resolved."],
].map(([externalId, label, memberId, memberName, amountGross, status, priority, nextAction]) =>
  record("chargeback-reserve-previews", `reserve_${externalId}`, label, {
    memberId,
    memberName,
    status,
    priority,
    amountGross,
    amountNet: Number((amountGross / 1.19).toFixed(2)),
    currency: "EUR",
    reserveReason: status === "blocked" ? "disputed debit" : "payment recovery exposure",
    dueDate: "2026-07-13",
    nextAction,
    href: "/erp?role=finance&view=payment-recovery",
  }, { syncStatus: "conflict" }),
);

const cancellationAdjustments = [
  ["tobias_meier_cancelled_contract", "Tobias Meier contract cancellation adjustment", "member_app_member_1012", "Tobias Meier", -48.79, "processed_record_only", "medium", "Confirm member is excluded from active billing and access entitlement cohorts."],
  ["amira_saleh_medical_pause", "Amira Saleh medical pause billing adjustment", "member_app_member_1003", "Amira Saleh", 0, "pause_review", "high", "Review pause end date before billing resumes."],
  ["katharina_wolf_family_leave", "Katharina Wolf family leave pause adjustment", "member_app_member_1015", "Katharina Wolf", 0, "pause_review", "medium", "Confirm pause end date with Studio Manager before billing resumes."],
  ["matteo_rossi_upgrade_credit", "Matteo Rossi plan upgrade credit adjustment", "member_app_member_1034", "Matteo Rossi", -7.5, "credit_review", "medium", "Match plan upgrade credit against member contract change."],
].map(([externalId, label, memberId, memberName, amountGross, status, priority, nextAction]) =>
  record("cancellation-revenue-adjustments", `adjustment_${externalId}`, label, {
    memberId,
    memberName,
    status,
    priority,
    amountGross,
    amountNet: Number((amountGross / 1.19).toFixed(2)),
    currency: "EUR",
    dueDate: "2026-07-17",
    nextAction,
    href: "/operations?role=finance&view=members&record=cancellations",
  }, { syncStatus: ["pause_review", "credit_review"].includes(status) ? "conflict" : "synced" }),
);

const partnerFinanceSummaries = [
  record("partner-finance-summaries", "partner_revenue_quality_berlin_mitte_2026_07", "Vogt Fitness Berlin Mitte revenue quality", {
    status: "attention",
    priority: "high",
    ownerRole: "CRAYS Finance",
    amountNet: 61744,
    amountGross: 73475.36,
    currency: "EUR",
    activeMembers: 1248,
    paymentExceptionRate: 0.0088,
    memberRevenuePerMember: 48,
    partnerVisible: true,
    currentState: "Revenue is ahead of plan, but payment exception and refund rows require classification.",
    nextAction: "Review partner finance pack with payment-quality exceptions attached.",
    href: "/analytics?role=franchise-partner&view=franchise-performance",
  }),
  record("partner-finance-summaries", "partner_cash_risk_berlin_mitte_2026_07", "Vogt Fitness Berlin Mitte cash-risk summary", {
    status: "blocked",
    priority: "critical",
    ownerRole: "CRAYS Finance",
    amountGross: 531.41,
    amountNet: 446.56,
    currency: "EUR",
    affectedRows: 11,
    partnerVisible: true,
    currentState: "Cash risk is concentrated in failed payments, refund liabilities and one chargeback reserve.",
    nextAction: "Classify cash-risk rows before partner reporting is marked clean.",
    href: "/erp?role=franchise-partner&view=payment-recovery",
  }),
  record("partner-finance-summaries", "partner_forecast_bridge_rotkreuzplatz_2026_07", "Rotkreuzplatz forecast-to-ledger bridge", {
    status: "review_ready",
    priority: "medium",
    ownerRole: "CRAYS Finance",
    amountNet: 506592,
    currency: "EUR",
    forecastYear: 3,
    forecastCase: "Mid-Case",
    activeMembersYear3: 858,
    partnerVisible: true,
    currentState: "Operating Berlin Mitte member economics are linked to the Rotkreuzplatz planning case.",
    nextAction: "Use the bridge in candidate and partner decision review; publication remains closed.",
    href: "/analytics?role=finance&view=forecast-5y",
  }),
  record("partner-finance-summaries", "partner_bank_pack_finance_boundary_2026_07", "Bank package finance boundary summary", {
    status: "attention",
    priority: "high",
    ownerRole: "CRAYS Finance",
    amountNet: 282000,
    currency: "EUR",
    financingBase: "Project investment basis",
    partnerVisible: true,
    currentState: "Bank pack has finance evidence, but sends and releases remain closed.",
    nextAction: "Prepare bank-package finance evidence for internal review only.",
    href: "/loans?role=finance&view=bank-package",
  }),
];

const ledgerReviewActions = [
  ["ledger_review_revenue_quality", "Revenue quality finance review", "attention", "high", "Review July revenue quality before partner performance pack sign-off.", "monthly-revenue-ledger-previews"],
  ["ledger_review_cash_risk", "Cash-risk finance review", "blocked", "critical", "Classify failed payments, refund liabilities and reserves before reporting is marked clean.", "partner-finance-summaries"],
  ["ledger_review_refund_liability", "Refund liability finance review", "attention", "high", "Check refund liabilities against support history and member contracts.", "refund-liability-previews"],
  ["ledger_review_partner_reporting", "Partner reporting finance review", "attention", "high", "Stage internal finance review for the partner reporting pack.", "partner-finance-summaries"],
  ["ledger_review_bank_boundary", "Bank package finance boundary review", "attention", "high", "Check finance evidence scope before any bank package review continues.", "partner-finance-summaries"],
].map(([externalId, label, status, priority, nextAction, sourceFamily]) =>
  record("ledger-review-actions", externalId, label, {
    status,
    priority,
    ownerRole: "CRAYS Finance",
    sourceFamily,
    partnerVisible: true,
    amountGross: sourceFamily === "partner-finance-summaries" ? 531.41 : null,
    currency: "EUR",
    dueDate: priority === "critical" ? "2026-07-13" : "2026-07-15",
    nextAction,
    href: "/dashboard?role=finance&view=actions",
  }),
);

const records = [
  ...revenueLedgerPreviews,
  ...invoiceLedgerLines,
  ...settlementPreviews,
  ...refundLiabilityPreviews,
  ...chargebackReservePreviews,
  ...cancellationAdjustments,
  ...partnerFinanceSummaries,
  ...ledgerReviewActions,
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
  return `map_${digest({ moduleKey: "erp", sectionKey: item.family, rowId: item.externalId }, 30)}`;
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
  const connectionId = "core_source_erp_finance_ledger";
  const systemKey = "erp-engine";
  const groupedRecords = grouped();
  const jobId = `sync_job_${digest(["erp-finance-ledger", generatedAt, records.length], 28)}`;

  await client.query(
    `
      insert into crays_core.integration_connections (
        connection_id, module_key, system_key, connection_name, owner_role, status,
        connection_mode, secret_reference_status, connection_health, metadata, updated_at
      )
      values ($1, 'erp', $2, 'ERP finance ledger source slice', 'finance', 'active', 'sync_read_model', 'configured_reference', 'healthy', $3::jsonb, now())
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
      values ($1, $2, 'read_sync', 'read', 'succeeded', 1, 'financial-model', 'erp_finance_ledger_berlin_mitte_2026_07', $3::jsonb, now(), now(), now(), now())
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
          moduleKey: "erp",
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
