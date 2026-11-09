import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_MEMBER_PAYMENT_RECOVERY === "APPLY_MEMBER_PAYMENT_RECOVERY_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-member-payment-recovery-20260712-v1";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_MEMBER_PAYMENT_RECOVERY=APPLY_MEMBER_PAYMENT_RECOVERY_SOURCE_SLICE to apply Member Payment Recovery source records.");
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
  studioId: "studio_berlin_mitte",
  studioName: "Berlin Mitte Studio",
  sourceWritesEnabled: false,
  syncApplyEnabled: false,
  targetApplyEnabled: false,
  paymentInitiationEnabled: false,
  financePostingEnabled: false,
  accountingExportsEnabled: false,
  externalSendingEnabled: false,
  liveAiEnabled: false,
};

function record(family, externalId, label, fields, options = {}) {
  return {
    family,
    externalId,
    label,
    craysEntityType: options.craysEntityType ?? "financial-model",
    craysEntityId: options.craysEntityId ?? `member_payment_recovery_${slug(externalId)}`,
    owner: options.owner ?? "Finance",
    status: options.status ?? fields.recoveryStatus ?? fields.reviewStatus ?? "review",
    priority: options.priority ?? fields.priority ?? "medium",
    syncStatus: options.syncStatus ?? (["critical", "high"].includes(fields.priority) ? "conflict" : "synced"),
    dueDate: options.dueDate ?? fields.dueDate ?? "2026-07-15",
    fields: { ...baseFields, ...fields },
  };
}

const paymentRecoveryCases = [
  record("payment-recovery-cases", "recovery_felix_hartmann_2026_07", "Felix Hartmann failed payment recovery", {
    memberId: "member_app_member_1002",
    memberName: "Felix Hartmann",
    invoiceNumber: "INV-BM-202607-1002",
    paymentRecordId: "member_app_payment_member_1002_2026_07",
    supportTicket: "Failed payment recovery call",
    amountGross: 48.79,
    currency: "EUR",
    paymentStatus: "failed_payment",
    failureReason: "insufficient funds",
    recoveryStatus: "contact_ready",
    priority: "critical",
    dueDate: "2026-07-13",
    nextAction: "Confirm member contact preference and stage recovery review before any retry is considered.",
  }),
  record("payment-recovery-cases", "recovery_jonas_krueger_2026_07", "Jonas Krueger student plan recovery", {
    memberId: "member_app_member_1010",
    memberName: "Jonas Krueger",
    invoiceNumber: "INV-BM-202607-1010",
    paymentRecordId: "member_app_payment_member_1010_2026_07",
    supportTicket: "Student plan payment failure",
    amountGross: 39.9,
    currency: "EUR",
    paymentStatus: "failed_payment",
    failureReason: "insufficient funds",
    recoveryStatus: "support_owner_needed",
    priority: "high",
    dueDate: "2026-07-14",
    nextAction: "Route student-plan recovery to Support and Finance for member-safe follow-up.",
  }),
  record("payment-recovery-cases", "recovery_camila_ferreira_2026_07", "Camila Ferreira past-due payment recovery", {
    memberId: "member_app_member_1005",
    memberName: "Camila Ferreira",
    invoiceNumber: "INV-BM-202607-1005",
    paymentRecordId: "member_app_payment_member_1005_2026_07",
    linkedRefundCase: "member_app_refund_1005_late_cancel",
    amountGross: 48.79,
    currency: "EUR",
    paymentStatus: "past_due",
    failureReason: "mandate requires update",
    recoveryStatus: "refund_context_needed",
    priority: "high",
    dueDate: "2026-07-14",
    nextAction: "Resolve refund context before any payment recovery communication is drafted.",
  }),
  record("payment-recovery-cases", "recovery_ben_adler_2026_07", "Ben Adler mandate update recovery", {
    memberId: "member_app_member_1024",
    memberName: "Ben Adler",
    invoiceNumber: "INV-BM-202607-1024",
    paymentRecordId: "member_app_payment_member_1024_2026_07",
    supportTicket: "Payment method update request",
    amountGross: 48.79,
    currency: "EUR",
    paymentStatus: "past_due",
    failureReason: "mandate requires update",
    recoveryStatus: "member_update_needed",
    priority: "high",
    dueDate: "2026-07-15",
    nextAction: "Prepare payment method update task; external message sending remains closed.",
  }),
  record("payment-recovery-cases", "recovery_alina_richter_2026_07", "Alina Richter chargeback recovery", {
    memberId: "member_app_member_1017",
    memberName: "Alina Richter",
    invoiceNumber: "INV-BM-202607-1017",
    paymentRecordId: "member_app_payment_member_1017_2026_07",
    linkedRefundCase: "member_app_refund_1017_disputed_debit",
    amountGross: 48.79,
    currency: "EUR",
    paymentStatus: "chargeback_review",
    failureReason: "member disputed July debit",
    recoveryStatus: "evidence_review",
    priority: "critical",
    dueDate: "2026-07-13",
    nextAction: "Review chargeback evidence and member timeline before any finance posting is considered.",
  }),
];

const refundReviews = [
  record("refund-review-cases", "refund_camila_ferreira_late_cancel", "Camila Ferreira late-cancellation refund review", {
    memberId: "member_app_member_1005",
    memberName: "Camila Ferreira",
    refundRecordId: "member_app_refund_1005_late_cancel",
    amountGross: 12.5,
    currency: "EUR",
    reviewStatus: "needs_policy_review",
    priority: "high",
    dueDate: "2026-07-14",
    nextAction: "Confirm goodwill policy and class credit before refund approval is drafted.",
  }),
  record("refund-review-cases", "refund_alina_richter_chargeback", "Alina Richter chargeback provisional credit review", {
    memberId: "member_app_member_1017",
    memberName: "Alina Richter",
    refundRecordId: "member_app_refund_1017_disputed_debit",
    amountGross: 48.79,
    currency: "EUR",
    reviewStatus: "evidence_required",
    priority: "critical",
    dueDate: "2026-07-13",
    nextAction: "Attach dispute evidence before finance posting or ledger export is allowed.",
  }),
  record("refund-review-cases", "refund_tobias_meier_contract", "Tobias Meier cancellation settlement refund", {
    memberId: "member_app_member_1012",
    memberName: "Tobias Meier",
    refundRecordId: "member_app_refund_1012_cancelled_contract",
    amountGross: 48.79,
    currency: "EUR",
    reviewStatus: "approved_record_only",
    priority: "medium",
    dueDate: "2026-07-16",
    nextAction: "Keep approved refund in member finance history; posting/export gates remain closed.",
  }, { syncStatus: "synced" }),
];

const cancellationSettlements = [
  record("cancellation-settlements", "settlement_tobias_meier_cancelled_contract", "Tobias Meier cancellation settlement", {
    memberId: "member_app_member_1012",
    memberName: "Tobias Meier",
    cancellationRecordId: "member_app_cancel_1012",
    settlementStatus: "processed_record_only",
    amountGross: 48.79,
    currency: "EUR",
    priority: "medium",
    dueDate: "2026-07-16",
    nextAction: "Confirm member is excluded from active billing and access entitlement cohorts.",
  }, { status: "processed", syncStatus: "synced" }),
  record("cancellation-settlements", "settlement_amira_saleh_pause", "Amira Saleh medical pause settlement", {
    memberId: "member_app_member_1003",
    memberName: "Amira Saleh",
    cancellationRecordId: "member_app_cancel_1003_pause",
    settlementStatus: "pause_review",
    amountGross: 0,
    currency: "EUR",
    priority: "high",
    dueDate: "2026-07-17",
    nextAction: "Review pause end date before billing resumes.",
  }),
  record("cancellation-settlements", "settlement_katharina_wolf_pause", "Katharina Wolf family leave pause settlement", {
    memberId: "member_app_member_1015",
    memberName: "Katharina Wolf",
    cancellationRecordId: "member_app_cancel_1015_pause",
    settlementStatus: "pause_review",
    amountGross: 0,
    currency: "EUR",
    priority: "medium",
    dueDate: "2026-07-18",
    nextAction: "Confirm pause end date with Studio Manager before billing resumes.",
  }),
];

const communicationPreflights = [
  ["Felix Hartmann", "member_app_member_1002", "payment_reminder", "payment_reminder_allowed", "Use in-app task draft; external send remains closed."],
  ["Jonas Krueger", "member_app_member_1010", "payment_reminder", "payment_reminder_allowed", "Prepare student-plan recovery script for Support review."],
  ["Camila Ferreira", "member_app_member_1005", "refund_context", "payment_reminder_allowed", "Resolve refund context before payment reminder copy is drafted."],
  ["Ben Adler", "member_app_member_1024", "payment_method_update", "payment_reminder_allowed", "Prepare payment method update task without sending externally."],
  ["Alina Richter", "member_app_member_1017", "chargeback_evidence", "manual_review_required", "Do not send; Finance and Reviewer must classify dispute evidence first."],
  ["Tobias Meier", "member_app_member_1012", "cancellation_settlement", "consent_revoked", "No outbound communication; keep record for finance history only."],
].map(([memberName, memberId, communicationType, consentStatus, nextAction]) =>
  record("member-communication-preflights", `preflight_${slug(memberName)}_${communicationType}`, `${memberName} ${communicationType.replaceAll("_", " ")} preflight`, {
    memberId,
    memberName,
    communicationType,
    consentStatus,
    externalSendingEnabled: false,
    priority: consentStatus === "manual_review_required" ? "critical" : consentStatus === "consent_revoked" ? "high" : "medium",
    dueDate: "2026-07-15",
    nextAction,
  }, { syncStatus: consentStatus === "payment_reminder_allowed" ? "synced" : "conflict" }),
);

const ledgerPreviewEvents = [
  ["ledger_felix_failed_debit", "Felix Hartmann failed debit ledger preview", "failed_debit", "member_app_member_1002", "Felix Hartmann", 48.79, "not_posted", "Keep as recovery preview; no finance posting or export."],
  ["ledger_jonas_failed_debit", "Jonas Krueger failed debit ledger preview", "failed_debit", "member_app_member_1010", "Jonas Krueger", 39.9, "not_posted", "Keep as recovery preview; no finance posting or export."],
  ["ledger_camila_past_due", "Camila Ferreira past-due ledger preview", "past_due_invoice", "member_app_member_1005", "Camila Ferreira", 48.79, "not_posted", "Link refund context before posting review."],
  ["ledger_ben_past_due", "Ben Adler past-due ledger preview", "past_due_invoice", "member_app_member_1024", "Ben Adler", 48.79, "not_posted", "Await payment method update."],
  ["ledger_alina_chargeback", "Alina Richter chargeback ledger preview", "chargeback_hold", "member_app_member_1017", "Alina Richter", 48.79, "not_posted", "Hold until dispute evidence is reviewed."],
  ["ledger_camila_refund", "Camila Ferreira refund ledger preview", "refund_review", "member_app_member_1005", "Camila Ferreira", 12.5, "not_posted", "Review goodwill policy before refund approval."],
  ["ledger_tobias_refund", "Tobias Meier refund ledger preview", "refund_history", "member_app_member_1012", "Tobias Meier", 48.79, "not_posted", "Retain as settlement history."],
  ["ledger_amira_pause", "Amira Saleh pause ledger preview", "billing_pause", "member_app_member_1003", "Amira Saleh", 0, "not_posted", "Review billing resume date."],
].map(([externalId, label, eventType, memberId, memberName, amountGross, ledgerStatus, nextAction]) =>
  record("recovery-ledger-events", externalId, label, {
    eventType,
    memberId,
    memberName,
    amountGross,
    currency: "EUR",
    ledgerStatus,
    priority: eventType === "chargeback_hold" ? "critical" : "medium",
    dueDate: "2026-07-15",
    nextAction,
  }, { status: ledgerStatus, syncStatus: eventType === "chargeback_hold" ? "conflict" : "synced" }),
);

const records = [...paymentRecoveryCases, ...refundReviews, ...cancellationSettlements, ...communicationPreflights, ...ledgerPreviewEvents];

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
  const connectionId = "core_source_erp_member_payment_recovery";
  const systemKey = "erp-engine";
  const groupedRecords = grouped();
  const jobId = `sync_job_${digest(["member-payment-recovery", generatedAt, records.length], 28)}`;

  await client.query(
    `
      insert into crays_core.integration_connections (
        connection_id, module_key, system_key, connection_name, owner_role, status,
        connection_mode, secret_reference_status, connection_health, metadata, updated_at
      )
      values ($1, 'erp', $2, 'Member payment recovery source slice', 'finance', 'active', 'sync_read_model', 'configured_reference', 'healthy', $3::jsonb, now())
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
        payload_summary, scheduled_at, started_at, finished_at, updated_at
      )
      values ($1, $2, 'read_sync', 'read', 'succeeded', 1, $3::jsonb, now(), now(), now(), now())
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
