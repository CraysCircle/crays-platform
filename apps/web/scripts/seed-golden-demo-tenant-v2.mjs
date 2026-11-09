import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_GOLDEN_DEMO_V2 === "APPLY_GOLDEN_DEMO_TENANT_V2";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const tenant = "CRAYS Golden Demo Tenant v2";
const benchmarkAnchor = {
  retentionReference: "HFA 2025 benchmark: 66.4% annual member retention",
  kpiFamilies: ["active members", "visit frequency", "class attendance", "MRR", "ARPM", "churn", "payment exceptions"],
  sourceUse: "Internal realistic test-data calibration only; no external data is copied into customer records.",
};

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_GOLDEN_DEMO_V2=APPLY_GOLDEN_DEMO_TENANT_V2 to apply Golden Demo Tenant v2.");
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

function record(moduleKey, family, label, options) {
  const externalId = options.externalId ?? `${moduleKey}_demo_v2_${slug(family)}_${digest(label, 10)}`;
  return {
    moduleKey,
    family,
    label,
    externalId,
    craysEntityType: options.craysEntityType,
    craysEntityId: options.craysEntityId ?? `${moduleKey}_demo_v2_${slug(label)}_${digest([moduleKey, family, label], 8)}`,
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
  finance: "Mara Stein",
  project: "Jonas Richter",
  studio: "Clara Hoffmann",
  support: "Ben Krüger",
  reviewer: "Nora Weiss",
  coach: "Milan Petrovic",
  member1: "Anna Becker",
  member2: "Marco Schmidt",
  member3: "Julia Santos",
  member4: "Priya Nair",
};

const companies = {
  candidate: "Adler Fitness Beteiligungs GmbH",
  candidate2: "Demir Health Ventures GmbH",
  owner: "Keller Urban Properties GmbH",
  bank: "RheinMain Commercial Finance AG",
  supplier: "Nordlicht Fit-Out Services GmbH",
  landlord: "Schwabing Atrium Immobilien GmbH",
  studio: "CRAYS Studio Operations GmbH",
};

const baseFields = {
  tenant,
  anchorProcess: "Candidate-to-bank readiness -> Opening handoff -> Studio operations recovery",
  sourceWritesEnabled: false,
  syncApplyEnabled: false,
  externalExecutionEnabled: false,
};

const records = [
  record("crm", "companies", companies.candidate, {
    craysEntityType: "organization",
    owner: "Deal Manager",
    role: "deal-manager",
    status: "qualified",
    nextAction: "Confirm candidate evidence package before bank review.",
    dueState: "due_this_week",
    dueDate: "2026-07-16",
    priority: "high",
    fields: { segment: "franchise-candidate", city: "Munich", annualRevenueEur: 1_850_000, employees: 18, primaryContact: people.candidate },
  }),
  record("crm", "companies", companies.candidate2, {
    craysEntityType: "organization",
    owner: "Deal Manager",
    role: "deal-manager",
    status: "screening",
    nextAction: "Complete qualification call and owner fit review.",
    dueState: "due_next_week",
    dueDate: "2026-07-22",
    fields: { segment: "franchise-candidate", city: "Cologne", annualRevenueEur: 980_000, employees: 11, primaryContact: people.candidate2 },
  }),
  record("crm", "people", people.owner, {
    craysEntityType: "account",
    owner: "Expansion Manager",
    role: "expansion-manager",
    status: "active",
    nextAction: "Approve owner-visible lease redaction notes.",
    dueState: "overdue",
    dueDate: "2026-07-11",
    priority: "critical",
    fields: { company: companies.owner, jobTitle: "Managing Director", city: "Berlin", stakeholderType: "property-owner" },
  }),
  record("crm", "people", people.bank, {
    craysEntityType: "account",
    owner: "Finance",
    role: "finance",
    status: "review",
    nextAction: "Confirm bank package evidence index after redaction.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "high",
    fields: { company: companies.bank, jobTitle: "Commercial Banking Manager", city: "Frankfurt", stakeholderType: "bank-partner" },
  }),
  record("crm", "opportunities", "Munich Schwabing franchise package", {
    craysEntityType: "deal",
    owner: "Deal Manager",
    role: "deal-manager",
    status: "deal_readiness",
    nextAction: "Resolve owner room release lock before bank-facing package.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "critical",
    fields: { candidate: people.candidate, organization: companies.candidate, targetInvestmentEur: 1_500_000, ownEquityEur: 287_000, bankDebtEur: 350_000 },
  }),
  record("project", "opening-projects", "Munich Schwabing fit-out readiness", {
    craysEntityType: "property-case",
    owner: "Project Manager",
    role: "deal-manager",
    status: "blocked",
    nextAction: "Clear landlord redline and permit package before launch schedule.",
    dueState: "due_this_week",
    dueDate: "2026-07-18",
    priority: "critical",
    syncStatus: "conflict",
    fields: { property: "Leopoldstrasse 87 Studio Lease", city: "Munich", milestone: "Permit package review", blocker: "Owner redaction pending" },
  }),
  record("project", "work-items", "Berlin Mitte opening week staff rota", {
    craysEntityType: "property-case",
    owner: "Studio Manager",
    role: "studio-manager",
    status: "review",
    nextAction: "Fill two open trainer shifts and publish opening week roster.",
    dueState: "due_this_week",
    dueDate: "2026-07-17",
    fields: { studio: "Berlin Mitte Studio", openShifts: 2, trainersScheduled: 7, affectedClasses: 4 },
  }),
  record("project", "dependencies", "Bank evidence redaction dependency", {
    craysEntityType: "bank-package",
    owner: "Reviewer",
    role: "reviewer",
    status: "blocked",
    nextAction: "Approve evidence redaction before bank room package review.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "critical",
    syncStatus: "conflict",
    fields: { package: "RheinMain Munich Bank Package", blockedDocuments: 2, reviewer: people.reviewer },
  }),
  record("erp", "invoices", "Berlin Mitte opening equipment invoice", {
    craysEntityType: "financial-model",
    owner: "Finance",
    role: "finance",
    status: "review",
    nextAction: "Match equipment invoice against opening budget.",
    dueState: "due_this_week",
    dueDate: "2026-07-19",
    priority: "high",
    fields: { supplier: companies.supplier, invoiceNo: "NF-2026-0712", amountEur: 82_450, costCenter: "Berlin Mitte Opening" },
  }),
  record("erp", "payment-exceptions", `${people.member2} failed membership payment`, {
    craysEntityType: "financial-model",
    owner: "Finance",
    role: "finance",
    status: "blocked",
    nextAction: "Coordinate payment recovery before member retention risk escalates.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "high",
    syncStatus: "conflict",
    fields: { member: people.member2, studio: "Berlin Mitte Studio", amountEur: 89, exceptionType: "failed_payment", retryDate: "2026-07-13" },
  }),
  record("erp", "budgets", "Munich Schwabing opening budget v2", {
    craysEntityType: "financial-model",
    owner: "Finance",
    role: "finance",
    status: "draft",
    nextAction: "Review construction contingency and bank debt assumptions.",
    dueState: "due_next_week",
    dueDate: "2026-07-23",
    fields: { targetInvestmentEur: 1_500_000, contingencyPct: 12, projectedMrrEur: 139_000, arpmEur: 111 },
  }),
  record("files", "documents", "Leopoldstrasse lease redaction memo", {
    craysEntityType: "document",
    owner: "Reviewer",
    role: "reviewer",
    status: "blocked",
    nextAction: "Remove owner-only negotiation notes before candidate room review.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "critical",
    fields: { documentType: "lease-redaction", property: "Leopoldstrasse 87 Studio Lease", audience: "Candidate room", grants: ["Reviewer", "Expansion Manager"] },
  }),
  record("files", "packages", "RheinMain bank evidence package", {
    craysEntityType: "evidence-package",
    owner: "Finance",
    role: "finance",
    status: "review",
    nextAction: "Confirm document metadata and bank package evidence order.",
    dueState: "due_this_week",
    dueDate: "2026-07-18",
    fields: { bank: companies.bank, documents: 6, approvedDocuments: 4, missingMetadata: 0, releaseState: "blocked" },
  }),
  record("files", "grants", "Owner room document grant review", {
    craysEntityType: "document",
    owner: "Reviewer",
    role: "reviewer",
    status: "review",
    nextAction: "Confirm owner room visibility before any release decision.",
    dueState: "due_this_week",
    dueDate: "2026-07-16",
    fields: { room: "Owner room", documents: 11, shared: 0, blockedReason: "release review required" },
  }),
  record("loans", "bank-packages", "RheinMain Munich bank package", {
    craysEntityType: "bank-package",
    owner: "Finance",
    role: "finance",
    status: "blocked",
    nextAction: "Finish redaction review and reviewer sign-off before bank package release.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "critical",
    fields: { bank: companies.bank, requestedAmountEur: 350_000, dscr: 1.42, conditionsOpen: 2, sendEnabled: false },
  }),
  record("loans", "conditions", "Source-of-funds checklist condition", {
    craysEntityType: "loan-case",
    owner: "Finance",
    role: "finance",
    status: "review",
    nextAction: "Confirm candidate equity proof with reviewer.",
    dueState: "due_this_week",
    dueDate: "2026-07-17",
    fields: { borrower: companies.candidate, ownEquityEur: 287_000, evidenceStatus: "review" },
  }),
  record("analytics", "studio-kpis", "Berlin Mitte engagement snapshot", {
    craysEntityType: "financial-model",
    owner: "CRAYS Management",
    role: "crays-management",
    status: "attention",
    nextAction: "Review payment recovery and class utilization before weekly management review.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "high",
    fields: { activeMembers: 1248, checkinsToday: 312, classUtilizationPct: 78, retentionModelPct: 73, paymentExceptions: 3, supportRequestsOpen: 6 },
  }),
  record("analytics", "portfolio-kpis", "Munich Schwabing bank readiness delta", {
    craysEntityType: "financial-model",
    owner: "CRAYS Management",
    role: "crays-management",
    status: "blocked",
    nextAction: "Drill into owner release lock and evidence redaction blockers.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "critical",
    fields: { locationScore: 78, bankabilityScore: 94, blockedGates: 3, evidenceCoverage: "6/13", commandDrafts: 5 },
  }),
  record("operations", "studios", "Berlin Mitte Studio", {
    craysEntityType: "studio",
    owner: "Studio Manager",
    role: "studio-manager",
    status: "open",
    nextAction: "Work payment and support recovery queue before evening classes.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "high",
    fields: { activeMembers: 1248, trialMembers: 1, checkinsToday: 312, classesToday: 18, trainersOnShift: 7, occupancyPct: 74 },
  }),
  record("operations", "members", people.member3, {
    craysEntityType: "member",
    owner: "Support",
    role: "studio-manager",
    status: "high_risk",
    nextAction: "Resolve payment exception and late cancellation support case.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "critical",
    syncStatus: "conflict",
    fields: { studio: "Berlin Mitte Studio", membershipStatus: "active", paymentStatus: "past_due", bookingsThisMonth: 2, serviceRisk: "high" },
  }),
  record("operations", "bookings", "Mobility Session waitlist pressure", {
    craysEntityType: "training",
    owner: "Studio Manager",
    role: "studio-manager",
    status: "attention",
    nextAction: "Review class capacity and trainer availability.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    fields: { classLabel: "Mobility Session", waitlist: 6, capacity: 18, trainer: people.coach },
  }),
  record("hr", "employees", people.studio, {
    craysEntityType: "employee",
    owner: "CRAYS HR",
    role: "hr",
    status: "active",
    nextAction: "Confirm opening handoff responsibilities for Berlin Mitte.",
    dueState: "due_this_week",
    dueDate: "2026-07-18",
    fields: { jobTitle: "Studio Operations Lead", studio: "Berlin Mitte Studio", contractStatus: "active", onboardingCompletePct: 92 },
  }),
  record("hr", "shifts", "Berlin Mitte evening trainer coverage", {
    craysEntityType: "employee",
    owner: "Studio Manager",
    role: "studio-manager",
    status: "attention",
    nextAction: "Fill Daniel Krause open capacity before class schedule is confirmed.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    fields: { trainersScheduled: 7, openCapacity: 2, overbookedTrainers: 1, affectedClasses: 3 },
  }),
  record("learning", "training-paths", "Partner finance handoff module", {
    craysEntityType: "training",
    owner: "Franchise Partner",
    role: "franchise-partner",
    status: "in_progress",
    nextAction: "Complete finance handoff module before bank package review.",
    dueState: "due_this_week",
    dueDate: "2026-07-19",
    fields: { learner: people.candidate, modulesComplete: 4, modulesTotal: 7, certificationRequired: true },
  }),
  record("learning", "certifications", `${people.coach} recovery training certification`, {
    craysEntityType: "training",
    owner: "CRAYS HR",
    role: "hr",
    status: "review",
    nextAction: "Approve recovery training certification before adding extra PT slots.",
    dueState: "due_next_week",
    dueDate: "2026-07-24",
    fields: { trainer: people.coach, certification: "Recovery Training", practicalAssessment: "passed", reviewer: people.studio },
  }),
  record("support", "tickets", `${people.member3} payment recovery case`, {
    craysEntityType: "support-ticket",
    owner: "Support",
    role: "studio-manager",
    status: "blocked",
    nextAction: "Coordinate with Finance and save member reply draft for review.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    priority: "critical",
    syncStatus: "conflict",
    fields: { member: people.member3, topic: "payment recovery", paymentExceptionEur: 89, channel: "in-app", consentStatus: "active" },
  }),
  record("support", "tickets", "Bank package question thread", {
    craysEntityType: "conversation",
    owner: "Finance",
    role: "finance",
    status: "review",
    nextAction: "Reviewer must approve wording before bank-facing question is shared.",
    dueState: "due_today",
    dueDate: "2026-07-12",
    fields: { bank: companies.bank, threadStatus: "waiting", linkedDocuments: 1, externalSendEnabled: false },
  }),
];

const moduleOwnerRole = {
  crm: "admin",
  project: "admin",
  erp: "finance",
  files: "reviewer",
  loans: "finance",
  analytics: "crays-management",
  operations: "admin",
  hr: "admin",
  learning: "admin",
  support: "reviewer",
};

function connectionId(moduleKey) {
  return `core_source_${moduleKey}_golden_demo_v2`;
}

function systemKey(moduleKey) {
  return `${moduleKey}-golden-demo-v2`;
}

function mapId(item) {
  return `golden_demo_v2_${digest([item.moduleKey, item.family, item.externalId], 30)}`;
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
    acc[item.moduleKey] ??= [];
    acc[item.moduleKey].push(item);
    return acc;
  }, {});
}

async function ensureEntityScope(client) {
  await client.query(`
    alter table crays_core.external_record_maps
      drop constraint if exists external_record_maps_crays_type_check,
      add constraint external_record_maps_crays_type_check
      check (crays_entity_type in ('prepared-offer', 'deal', 'property', 'property-case', 'location-analysis', 'evidence-package', 'financial-model', 'bank-package', 'loan-case', 'document', 'conversation', 'message', 'candidate-intent', 'organization', 'account', 'studio', 'member', 'employee', 'training', 'support-ticket'))
  `);
}

async function persistModule(client, moduleKey, items) {
  const connection = connectionId(moduleKey);
  const system = systemKey(moduleKey);
  const ownerRole = moduleOwnerRole[moduleKey] ?? "admin";
  const jobId = `sync_job_${digest(["golden-demo-v2", moduleKey, generatedAt, items.length], 28)}`;

  await client.query(
    `
      insert into crays_core.integration_connections (
        connection_id, module_key, system_key, connection_name, owner_role, status,
        connection_mode, secret_reference_status, connection_health, metadata, updated_at
      )
      values ($1, $2, $3, $4, $5, 'active', 'sync_read_model', 'not_required', 'healthy', $6::jsonb, now())
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
      moduleKey,
      system,
      `${moduleKey.toUpperCase()} Golden Demo Tenant v2 source projection`,
      ownerRole,
      JSON.stringify({
        ...baseFields,
        generatedAt,
        benchmarkAnchor,
        recordsSeen: items.length,
        families: [...new Set(items.map((item) => item.family))].sort(),
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
        moduleKey,
        rowsSeen: items.length,
        sourceConnection: "core_demo_projection",
      }),
    ],
  );

  let written = 0;
  for (const item of items) {
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
          moduleKey,
          family: item.family,
          benchmarkAnchor,
          row: currentProof(item),
          sourceDigest: digest(currentProof(item), 32),
        }),
      ],
    );
    written += result.rowCount ?? 0;
  }

  return { moduleKey, connection, system, rowsSeen: items.length, mapsWritten: written };
}

function dryRunSummary() {
  const modules = Object.entries(grouped()).map(([moduleKey, items]) => ({
    moduleKey,
    records: items.length,
    families: [...new Set(items.map((item) => item.family))].sort(),
    blockedOrAttention: items.filter((item) => ["blocked", "attention", "review"].includes(item.status)).length,
    conflicts: items.filter((item) => item.syncStatus === "conflict").length,
  }));
  return {
    status: "dry_run",
    apply,
    tenant,
    records: records.length,
    modules,
    benchmarkAnchor,
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
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await ensureEntityScope(client);
    const result = [];
    for (const [moduleKey, items] of Object.entries(grouped())) {
      result.push(await persistModule(client, moduleKey, items));
    }
    await client.query("commit");

    const counts = await client.query(
      `
        select
          regexp_replace(external_system, '-golden-demo-v2$', '') as module_key,
          count(*)::int as maps,
          count(*) filter (where sync_status = 'conflict')::int as conflicts
        from crays_core.external_record_maps
        where external_system like '%-golden-demo-v2'
        group by 1
        order by 1
      `,
    );

    console.log(
      JSON.stringify(
        {
          status: "applied",
          tenant,
          records: records.length,
          modules: result,
          persistedCounts: counts.rows,
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
