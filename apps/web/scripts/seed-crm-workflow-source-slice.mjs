import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_CRM_WORKFLOW_SOURCE === "APPLY_CRM_WORKFLOW_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-crm-workflow-20260712-v1";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_CRM_WORKFLOW_SOURCE=APPLY_CRM_WORKFLOW_SOURCE_SLICE to apply CRM workflow source records.");
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

function record(family, label, options) {
  const externalId = options.externalId ?? `crm_workflow_${slug(family)}_${digest(label, 10)}`;
  return {
    family,
    label,
    externalId,
    craysEntityType: options.craysEntityType,
    craysEntityId: options.craysEntityId ?? `crm_workflow_${slug(label)}_${digest([family, label], 8)}`,
    syncStatus: options.syncStatus ?? "synced",
    owner: options.owner,
    role: options.role,
    status: options.status,
    nextAction: options.nextAction,
    dueState: options.dueState,
    dueDate: options.dueDate,
    priority: options.priority ?? "medium",
    fields: options.fields ?? {},
  };
}

const people = {
  candidate: "Johannes Adler",
  candidate2: "Aylin Demir",
  owner: "Lara Keller",
  bank: "Sarah Neumann",
  studio: "Clara Hoffmann",
  finance: "Mara Stein",
};

const companies = {
  candidate: "Adler Fitness Beteiligungs GmbH",
  candidate2: "Demir Health Ventures GmbH",
  owner: "Keller Urban Properties GmbH",
  bank: "RheinMain Commercial Finance AG",
  studio: "CRAYS Studio Operations GmbH",
};

const baseFields = {
  moduleKey: "crm",
  seedBatch,
  sourceWritesEnabled: false,
  syncApplyEnabled: false,
  targetApplyEnabled: false,
  externalSendingEnabled: false,
  sourceUse: "CRM workflow source-map projection for localhost demo processes.",
};

const records = [
  record("leads", "Munich Schwabing franchise lead - Johannes Adler", {
    craysEntityType: "candidate-intent",
    owner: "Deal Manager",
    role: "deal-manager",
    status: "qualified",
    nextAction: "Confirm candidate evidence package and move opportunity to bank readiness review.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "critical",
    fields: {
      person: people.candidate,
      company: companies.candidate,
      city: "Munich",
      sourceChannel: "Candidate portal",
      targetInvestmentEur: 1_500_000,
      ownEquityEur: 287_000,
    },
  }),
  record("leads", "Cologne Ehrenfeld expansion lead - Aylin Demir", {
    craysEntityType: "candidate-intent",
    owner: "Deal Manager",
    role: "deal-manager",
    status: "screening",
    nextAction: "Complete qualification call and attach owner fit checklist.",
    dueState: "due_next_week",
    dueDate: "2026-07-22",
    fields: {
      person: people.candidate2,
      company: companies.candidate2,
      city: "Cologne",
      sourceChannel: "Partner referral",
      targetInvestmentEur: 920_000,
      ownEquityEur: 185_000,
    },
  }),
  record("leads", "Berlin owner introduction - Lara Keller", {
    craysEntityType: "account",
    owner: "Expansion Manager",
    role: "expansion-manager",
    status: "review",
    nextAction: "Classify property owner fit and request floor-plan redactions.",
    dueState: "due_this_week",
    dueDate: "2026-07-16",
    priority: "high",
    fields: {
      person: people.owner,
      company: companies.owner,
      city: "Berlin",
      stakeholderType: "property-owner",
      property: "Invalidenstrasse 118 Studio Lease",
    },
  }),
  record("leads", "RheinMain financing contact - Sarah Neumann", {
    craysEntityType: "account",
    owner: "Finance",
    role: "finance",
    status: "active",
    nextAction: "Confirm bank package question thread after reviewer wording approval.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "high",
    fields: {
      person: people.bank,
      company: companies.bank,
      city: "Frankfurt",
      stakeholderType: "bank-partner",
      requestedDebtEur: 350_000,
    },
  }),
  record("notes", "Candidate qualification note - Johannes Adler", {
    craysEntityType: "message",
    owner: "Deal Manager",
    role: "deal-manager",
    status: "reviewed",
    nextAction: "Convert qualification note into task before bank evidence review.",
    dueState: "done",
    dueDate: "2026-07-12",
    fields: {
      relatedRecord: "Munich Schwabing franchise package",
      audience: "Internal deal review",
      noteType: "qualification",
      summary: "Candidate equity, location preference and opening timeline reviewed.",
    },
  }),
  record("notes", "Owner redaction note - Lara Keller", {
    craysEntityType: "message",
    owner: "Reviewer",
    role: "reviewer",
    status: "blocked",
    nextAction: "Approve owner-only redaction note before candidate room package review.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "critical",
    syncStatus: "conflict",
    fields: {
      relatedRecord: "Leopoldstrasse 87 Studio Lease",
      audience: "Owner room",
      noteType: "redaction",
      summary: "Negotiation-only clauses must stay internal before release review.",
    },
  }),
  record("notes", "Bank package review note - Sarah Neumann", {
    craysEntityType: "message",
    owner: "Finance",
    role: "finance",
    status: "review",
    nextAction: "Attach reviewer-approved wording to bank package question thread.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "high",
    fields: {
      relatedRecord: "RheinMain Munich bank package",
      audience: "Finance and reviewer",
      noteType: "bank-readiness",
      summary: "Open questions focus on equity proof and lease redaction evidence order.",
    },
  }),
  record("notes", "Opening handoff note - Clara Hoffmann", {
    craysEntityType: "message",
    owner: "Studio Manager",
    role: "studio-manager",
    status: "active",
    nextAction: "Align staffing handoff with opening week project queue.",
    dueState: "due_this_week",
    dueDate: "2026-07-17",
    fields: {
      relatedRecord: "Berlin Mitte Studio",
      audience: "Studio operations",
      noteType: "handoff",
      summary: "Trainer capacity and support recovery queues need owner confirmation.",
    },
  }),
  record("files", "Candidate intent questionnaire metadata", {
    craysEntityType: "document",
    owner: "Deal Manager",
    role: "deal-manager",
    status: "ready",
    nextAction: "Link questionnaire metadata to candidate evidence checklist.",
    dueState: "due_this_week",
    dueDate: "2026-07-16",
    fields: {
      relatedRecord: people.candidate,
      package: "Candidate evidence package",
      documentType: "intent-questionnaire",
      visibility: "Internal until candidate room release",
    },
  }),
  record("files", "Lease redaction memo metadata", {
    craysEntityType: "document",
    owner: "Reviewer",
    role: "reviewer",
    status: "blocked",
    nextAction: "Remove owner-only negotiation notes before candidate package release review.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "critical",
    syncStatus: "conflict",
    fields: {
      relatedRecord: "Leopoldstrasse 87 Studio Lease",
      package: "Candidate room package",
      documentType: "lease-redaction",
      visibility: "Reviewer only",
    },
  }),
  record("files", "Bank evidence index metadata", {
    craysEntityType: "document",
    owner: "Finance",
    role: "finance",
    status: "review",
    nextAction: "Confirm evidence ordering before bank package review.",
    dueState: "due_this_week",
    dueDate: "2026-07-18",
    fields: {
      relatedRecord: companies.bank,
      package: "RheinMain bank evidence package",
      documentType: "evidence-index",
      approvedDocuments: 4,
      documents: 6,
    },
  }),
  record("files", "Opening handoff checklist metadata", {
    craysEntityType: "document",
    owner: "Project Manager",
    role: "deal-manager",
    status: "active",
    nextAction: "Connect checklist to Project opening handoff queue.",
    dueState: "due_this_week",
    dueDate: "2026-07-19",
    fields: {
      relatedRecord: "Berlin Mitte Studio",
      package: "Opening handoff",
      documentType: "checklist",
      completedItems: 12,
      totalItems: 17,
    },
  }),
  record("emails", "Johannes Adler candidate follow-up thread", {
    craysEntityType: "conversation",
    owner: "Deal Manager",
    role: "deal-manager",
    status: "waiting",
    nextAction: "Save reply draft after evidence package checklist is confirmed.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "high",
    fields: {
      participant: people.candidate,
      company: companies.candidate,
      channel: "email",
      visibility: "Internal draft until send approval",
      messages: 4,
    },
  }),
  record("emails", "Sarah Neumann bank package question", {
    craysEntityType: "conversation",
    owner: "Finance",
    role: "finance",
    status: "review",
    nextAction: "Reviewer must approve wording before any bank-facing message.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "critical",
    fields: {
      participant: people.bank,
      company: companies.bank,
      channel: "email",
      visibility: "Internal review",
      messages: 2,
    },
  }),
  record("emails", "Lara Keller lease redaction reply", {
    craysEntityType: "conversation",
    owner: "Expansion Manager",
    role: "expansion-manager",
    status: "needs_reply",
    nextAction: "Confirm owner-visible document scope before room review.",
    dueState: "due_this_week",
    dueDate: "2026-07-15",
    fields: {
      participant: people.owner,
      company: companies.owner,
      channel: "email",
      visibility: "Internal reply draft",
      messages: 3,
    },
  }),
  record("calendar-events", "Candidate qualification call - Johannes Adler", {
    craysEntityType: "deal",
    owner: "Deal Manager",
    role: "deal-manager",
    status: "scheduled",
    nextAction: "Prepare meeting brief from candidate, company and opportunity records.",
    dueState: "due_this_week",
    dueDate: "2026-07-15",
    fields: {
      attendee: people.candidate,
      company: companies.candidate,
      eventType: "qualification-call",
      startTime: "2026-07-15T09:00:00+02:00",
      durationMinutes: 45,
    },
  }),
  record("calendar-events", "Bank package review - RheinMain", {
    craysEntityType: "bank-package",
    owner: "Finance",
    role: "finance",
    status: "scheduled",
    nextAction: "Review redaction status before the finance prep meeting.",
    dueState: "due_this_week",
    dueDate: "2026-07-17",
    fields: {
      attendee: people.bank,
      company: companies.bank,
      eventType: "bank-package-review",
      startTime: "2026-07-17T11:00:00+02:00",
      durationMinutes: 60,
    },
  }),
  record("calendar-events", "Owner lease review - Keller Urban Properties", {
    craysEntityType: "property-case",
    owner: "Expansion Manager",
    role: "expansion-manager",
    status: "scheduled",
    nextAction: "Prepare lease redaction agenda and property evidence checklist.",
    dueState: "due_next_week",
    dueDate: "2026-07-21",
    fields: {
      attendee: people.owner,
      company: companies.owner,
      eventType: "owner-review",
      startTime: "2026-07-21T14:00:00+02:00",
      durationMinutes: 50,
    },
  }),
  record("activities", "Lead captured from candidate portal", {
    craysEntityType: "candidate-intent",
    owner: "Deal Manager",
    role: "deal-manager",
    status: "done",
    nextAction: "Continue qualification in CRM opportunity workflow.",
    dueState: "done",
    dueDate: "2026-07-10",
    fields: {
      relatedRecord: people.candidate,
      activityType: "lead-capture",
      sourceChannel: "Candidate portal",
      outcome: "Lead qualified for review",
    },
  }),
  record("activities", "Qualification call completed", {
    craysEntityType: "deal",
    owner: "Deal Manager",
    role: "deal-manager",
    status: "done",
    nextAction: "Stage follow-up task for bank evidence readiness.",
    dueState: "done",
    dueDate: "2026-07-11",
    fields: {
      relatedRecord: "Munich Schwabing franchise package",
      activityType: "call",
      outcome: "Candidate equity and launch horizon confirmed",
    },
  }),
  record("activities", "Owner evidence request logged", {
    craysEntityType: "property-case",
    owner: "Expansion Manager",
    role: "expansion-manager",
    status: "active",
    nextAction: "Wait for redacted floor plan and lease appendix metadata.",
    dueState: "due_this_week",
    dueDate: "2026-07-16",
    fields: {
      relatedRecord: "Leopoldstrasse 87 Studio Lease",
      activityType: "owner-request",
      outcome: "Evidence request opened",
    },
  }),
  record("activities", "Bank package review staged", {
    craysEntityType: "bank-package",
    owner: "Finance",
    role: "finance",
    status: "review",
    nextAction: "Resolve reviewer wording before bank-facing message.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "critical",
    fields: {
      relatedRecord: "RheinMain Munich bank package",
      activityType: "review-stage",
      outcome: "External send remains blocked",
    },
  }),
  record("activities", "Opening handoff readiness updated", {
    craysEntityType: "studio",
    owner: "Studio Manager",
    role: "studio-manager",
    status: "attention",
    nextAction: "Confirm staff rota and support recovery ownership.",
    dueState: "due_this_week",
    dueDate: "2026-07-18",
    fields: {
      relatedRecord: "Berlin Mitte Studio",
      activityType: "handoff-update",
      outcome: "Operations follow-up required",
    },
  }),
];

function connectionId() {
  return "core_source_crm_workflow_20260712";
}

function systemKey() {
  return "crm-workflow-demo-v1";
}

function mapId(item) {
  return `crm_workflow_${digest([item.family, item.externalId], 30)}`;
}

function currentProof(item) {
  return {
    label: item.label,
    status: item.status,
    owner: item.owner,
    role: item.role,
    nextAction: item.nextAction,
    dueState: item.dueState,
    dueDate: item.dueDate,
    priority: item.priority,
    fields: item.fields,
  };
}

function grouped() {
  return records.reduce((acc, item) => {
    acc[item.family] ??= [];
    acc[item.family].push(item);
    return acc;
  }, {});
}

async function persist(client) {
  const connection = connectionId();
  const system = systemKey();
  const jobId = `sync_job_${digest(["crm-workflow-source-slice", generatedAt, records.length], 28)}`;

  await client.query(
    `
      insert into crays_core.integration_connections (
        connection_id, module_key, system_key, connection_name, owner_role, status,
        connection_mode, secret_reference_status, connection_health, metadata, updated_at
      )
      values ($1, 'crm', $2, 'CRM workflow process source slice', 'admin', 'active', 'sync_read_model', 'not_required', 'healthy', $3::jsonb, now())
      on conflict (connection_id) do update set
        status = excluded.status,
        connection_mode = excluded.connection_mode,
        secret_reference_status = excluded.secret_reference_status,
        connection_health = excluded.connection_health,
        metadata = excluded.metadata,
        updated_at = now()
    `,
    [
      connection,
      system,
      JSON.stringify({
        ...baseFields,
        generatedAt,
        rowsSeen: records.length,
        families: Object.keys(grouped()).sort(),
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
      connection,
      JSON.stringify({
        ...baseFields,
        generatedAt,
        rowsSeen: records.length,
        families: Object.keys(grouped()).sort(),
      }),
    ],
  );

  let written = 0;
  for (const item of records) {
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
        system,
        item.family,
        item.externalId,
        item.syncStatus,
        JSON.stringify({
          ...baseFields,
          generatedAt,
          family: item.family,
          row: currentProof(item),
          sourceDigest: digest(currentProof(item), 32),
        }),
      ],
    );
    written += result.rowCount ?? 0;
  }

  return { connection, system, rowsSeen: records.length, mapsWritten: written };
}

function dryRunSummary() {
  const families = Object.entries(grouped()).map(([family, items]) => ({
    family,
    records: items.length,
    blockedOrReview: items.filter((item) => ["blocked", "review", "attention", "waiting", "needs_reply"].includes(item.status)).length,
    conflicts: items.filter((item) => item.syncStatus === "conflict").length,
  }));

  return {
    status: "dry_run",
    apply,
    seedBatch,
    records: records.length,
    families,
    target: getRedactedDatabaseTarget(connectionString),
    gates: {
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      externalSendingEnabled: false,
      destructiveResetEnabled: false,
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
    console.log(
      JSON.stringify(
        {
          status: "applied",
          seedBatch,
          ...result,
          records: records.length,
          gates: dryRunSummary().gates,
        },
        null,
        2,
      ),
    );
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
  console.error(
    JSON.stringify(
      {
        status: "failed",
        message: error instanceof Error ? error.message : "Unknown CRM workflow source seed failure.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
