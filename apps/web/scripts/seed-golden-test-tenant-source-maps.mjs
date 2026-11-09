import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_GOLDEN_TENANT === "APPLY_GOLDEN_TENANT_SOURCE_MAPS";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const tenantLabel = "CRAYS Golden Studio Tenant";
const anchorCase = {
  preparedOffer: "Prepared Franchise Deal - Munich Schwabing",
  candidate: "Johannes Adler",
  candidateOrganization: "Adler Fitness Beteiligungs GmbH",
  property: "Leopoldstrasse 87 Studio Lease",
  owner: "Schwabing Atrium Immobilien GmbH",
  bank: "Isar Commercial Finance AG",
  studio: "Berlin Mitte Studio",
};

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_GOLDEN_TENANT=APPLY_GOLDEN_TENANT_SOURCE_MAPS to apply the Golden Test Tenant source-map seed.");
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

function safeKey(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function record(moduleKey, sectionKey, sectionLabel, label, options = {}) {
  const id = options.id ?? `${moduleKey}_${safeKey(sectionKey)}_${digest(label, 10)}`;
  return {
    moduleKey,
    sectionKey,
    sectionLabel,
    externalId: id,
    label,
    status: options.status ?? "synced",
    owner: options.owner ?? "Operations",
    craysEntityType: options.craysEntityType ?? "property-case",
    craysEntityId: options.craysEntityId ?? `${moduleKey}_${safeKey(label)}_${digest([moduleKey, sectionKey, label], 8)}`,
    fields: {
      tenant: tenantLabel,
      preparedOffer: anchorCase.preparedOffer,
      candidate: anchorCase.candidate,
      property: anchorCase.property,
      ...options.fields,
    },
  };
}

const moduleSeeds = [
  {
    moduleKey: "project",
    ownerRole: "admin",
    connectionName: "Project golden tenant source projection",
    records: [
      record("project", "opening-projects", "Opening projects", "Leopoldstrasse 87 Fit-Out Plan", {
        status: "active",
        craysEntityType: "property-case",
        craysEntityId: "golden_project_leopoldstrasse_fitout",
        owner: "Expansion Manager",
        fields: { city: "Munich", milestone: "Permit package review", nextAction: "Confirm landlord redline scope", dueDate: "2026-07-20" },
      }),
      record("project", "opening-projects", "Opening projects", "Berlin Mitte Studio Ramp-Up", {
        status: "active",
        craysEntityType: "property-case",
        craysEntityId: "golden_project_berlin_mitte_rampup",
        owner: "Studio Manager",
        fields: { city: "Berlin", milestone: "Trainer onboarding", nextAction: "Publish opening week rota", dueDate: "2026-07-24" },
      }),
      record("project", "work-items", "Work items", "Munich Schwabing lease redline review", {
        status: "blocked",
        craysEntityType: "property-case",
        craysEntityId: "golden_project_munich_lease_redline",
        owner: "Reviewer",
        fields: { blocker: "Owner redaction approval", nextAction: "Review lease redline with Schwabing Atrium Immobilien GmbH", priority: "critical" },
      }),
      record("project", "work-items", "Work items", "Isar financing package handoff", {
        status: "review",
        craysEntityType: "bank-package",
        craysEntityId: "golden_project_isar_financing_handoff",
        owner: "Finance",
        fields: { bank: anchorCase.bank, nextAction: "Attach approved evidence index", priority: "high" },
      }),
      record("project", "milestones", "Milestones", "Berlin Mitte opening permit appointment", {
        status: "scheduled",
        owner: "Expansion Manager",
        fields: { city: "Berlin", appointmentDate: "2026-07-28", nextAction: "Confirm appointment documents" },
      }),
      record("project", "dependencies", "Dependencies", "Schwabing owner consent dependency", {
        status: "blocked",
        owner: "Reviewer",
        fields: { dependencyOwner: anchorCase.owner, nextAction: "Resolve owner room release lock", priority: "critical" },
      }),
    ],
  },
  {
    moduleKey: "files",
    ownerRole: "reviewer",
    connectionName: "Files golden tenant metadata projection",
    records: [
      record("files", "document-packages", "Document packages", "Munich Schwabing Candidate Release Pack", {
        status: "review",
        craysEntityType: "document",
        craysEntityId: "golden_doc_munich_candidate_release_pack",
        owner: "Reviewer",
        fields: { packageType: "Candidate room", documents: 13, approvedDocuments: 6, nextAction: "Review economics redaction" },
      }),
      record("files", "document-packages", "Document packages", "Isar Finance Evidence Index", {
        status: "review",
        craysEntityType: "document",
        craysEntityId: "golden_doc_isar_finance_evidence_index",
        owner: "Finance",
        fields: { packageType: "Bank room", documents: 6, approvedDocuments: 4, nextAction: "Confirm banking evidence redaction" },
      }),
      record("files", "documents", "Documents", "Leopoldstrasse 87 Lease Redline", {
        status: "blocked",
        craysEntityType: "document",
        craysEntityId: "golden_doc_leopoldstrasse_lease_redline",
        owner: "Expansion Manager",
        fields: { documentType: "Lease", owner: anchorCase.owner, nextAction: "Resolve owner-only negotiation notes" },
      }),
      record("files", "documents", "Documents", "Adler Fitness Candidate Memo", {
        status: "approved",
        craysEntityType: "document",
        craysEntityId: "golden_doc_adler_candidate_memo",
        owner: "Deal Manager",
        fields: { documentType: "Candidate memo", candidateOrganization: anchorCase.candidateOrganization, nextAction: "Keep candidate memo in release pack" },
      }),
      record("files", "documents", "Documents", "Berlin Mitte Opening Budget", {
        status: "approved",
        craysEntityType: "document",
        craysEntityId: "golden_doc_berlin_opening_budget",
        owner: "Finance",
        fields: { documentType: "Budget", amount: "EUR 425000", nextAction: "Link to bank package" },
      }),
      record("files", "grants", "Document grants", "Bank room metadata grant review", {
        status: "review",
        craysEntityType: "document",
        craysEntityId: "golden_doc_bank_room_grant_review",
        owner: "Reviewer",
        fields: { audience: "Bank Partner", nextAction: "Confirm excluded candidate private contact details" },
      }),
    ],
  },
  {
    moduleKey: "loans",
    ownerRole: "finance",
    connectionName: "Loans golden tenant source projection",
    records: [
      record("loans", "bank-packages", "Bank packages", "Isar Commercial Finance Munich Package", {
        status: "review",
        craysEntityType: "bank-package",
        craysEntityId: "golden_bank_package_isar_munich",
        owner: "Finance",
        fields: { bank: anchorCase.bank, requestedAmount: "EUR 350000", nextAction: "Complete evidence redaction review" },
      }),
      record("loans", "loan-cases", "Loan cases", "Adler Fitness Working Capital Case", {
        status: "blocked",
        craysEntityType: "loan-case",
        craysEntityId: "golden_loan_case_adler_working_capital",
        owner: "Finance",
        fields: { borrower: anchorCase.candidateOrganization, amount: "EUR 180000", blocker: "Bank room release locked" },
      }),
      record("loans", "conditions", "Conditions", "Lease assignment evidence condition", {
        status: "blocked",
        craysEntityType: "loan-case",
        craysEntityId: "golden_loan_condition_lease_assignment",
        owner: "Reviewer",
        fields: { conditionOwner: anchorCase.owner, nextAction: "Attach approved lease redline" },
      }),
      record("loans", "conditions", "Conditions", "Opening budget validation condition", {
        status: "review",
        craysEntityType: "loan-case",
        craysEntityId: "golden_loan_condition_opening_budget",
        owner: "Finance",
        fields: { amount: "EUR 425000", nextAction: "Tie budget to bank package checklist" },
      }),
      record("loans", "covenants", "Covenants", "Berlin Mitte DSCR monitoring covenant", {
        status: "draft",
        craysEntityType: "loan-case",
        craysEntityId: "golden_loan_covenant_berlin_dscr",
        owner: "Finance",
        fields: { covenant: "Minimum DSCR 1.35x", firstReview: "2026-10-31", nextAction: "Keep covenant draft internal" },
      }),
      record("loans", "handoff-events", "Handoff events", "Isar package reviewer assignment", {
        status: "scheduled",
        craysEntityType: "bank-package",
        craysEntityId: "golden_bank_package_isar_reviewer_assignment",
        owner: "Finance",
        fields: { assignee: "Sarah Neumann", nextAction: "Wait for release-gated bank room approval" },
      }),
    ],
  },
  {
    moduleKey: "analytics",
    ownerRole: "crays-management",
    connectionName: "Analytics golden tenant KPI projection",
    records: [
      record("analytics", "portfolio-kpis", "Portfolio KPIs", "Munich Schwabing Portfolio Snapshot", {
        status: "critical",
        craysEntityType: "financial-model",
        craysEntityId: "golden_analytics_munich_portfolio_snapshot",
        owner: "CRAYS Management",
        fields: { locationScore: 78, bankability: 94, documentCoverage: "6/13", nextAction: "Complete site visit" },
      }),
      record("analytics", "studio-kpis", "Studio KPIs", "Berlin Mitte Member Health Snapshot", {
        status: "attention",
        craysEntityType: "financial-model",
        craysEntityId: "golden_analytics_berlin_member_health",
        owner: "Studio Manager",
        fields: { activeMembers: 1248, checkinsToday: 312, paymentExceptions: 3, nextAction: "Review member recovery queue" },
      }),
      record("analytics", "finance-kpis", "Finance KPIs", "Isar Financing Readiness Snapshot", {
        status: "blocked",
        craysEntityType: "financial-model",
        craysEntityId: "golden_analytics_isar_finance_readiness",
        owner: "Finance",
        fields: { bank: anchorCase.bank, blockedConditions: 2, evidenceCoverage: "4/6", nextAction: "Finish redaction review" },
      }),
      record("analytics", "risk-events", "Risk events", "Owner release lock risk", {
        status: "critical",
        craysEntityType: "evidence-package",
        craysEntityId: "golden_analytics_owner_release_lock",
        owner: "Reviewer",
        fields: { owner: anchorCase.owner, risk: "Owner room release locked", nextAction: "Review document grants" },
      }),
    ],
  },
  {
    moduleKey: "hr",
    ownerRole: "admin",
    connectionName: "HR golden tenant staffing projection",
    records: [
      record("hr", "employees", "Employees", "Clara Hoffmann", {
        status: "active",
        craysEntityType: "account",
        craysEntityId: "golden_hr_clara_hoffmann",
        owner: "CRAYS HR",
        fields: { role: "Studio Operations Lead", location: "Berlin Mitte", nextAction: "Confirm opening staffing roster" },
      }),
      record("hr", "employees", "Employees", "Jonas Richter", {
        status: "active",
        craysEntityType: "account",
        craysEntityId: "golden_hr_jonas_richter",
        owner: "CRAYS HR",
        fields: { role: "Head Coach", location: "Berlin Mitte", nextAction: "Approve trainer onboarding plan" },
      }),
      record("hr", "shifts", "Shifts", "Berlin Mitte opening week trainer rota", {
        status: "review",
        craysEntityType: "property-case",
        craysEntityId: "golden_hr_berlin_trainer_rota",
        owner: "Studio Manager",
        fields: { trainersScheduled: 7, openShifts: 2, nextAction: "Fill Daniel Krause morning capacity" },
      }),
      record("hr", "hiring", "Hiring", "Munich Schwabing assistant manager shortlist", {
        status: "review",
        craysEntityType: "account",
        craysEntityId: "golden_hr_munich_assistant_manager_shortlist",
        owner: "CRAYS HR",
        fields: { candidates: 3, nextAction: "Schedule second interviews after lease approval" },
      }),
    ],
  },
  {
    moduleKey: "support",
    ownerRole: "reviewer",
    connectionName: "Support golden tenant service projection",
    records: [
      record("support", "tickets", "Tickets", "Julia Santos payment recovery follow-up", {
        status: "blocked",
        craysEntityType: "support-ticket",
        craysEntityId: "golden_support_julia_payment_recovery",
        owner: "Support",
        fields: { member: "Julia Santos", priority: "high", nextAction: "Coordinate with Finance before member reply" },
      }),
      record("support", "tickets", "Tickets", "Mobility Session late cancellation", {
        status: "blocked",
        craysEntityType: "support-ticket",
        craysEntityId: "golden_support_mobility_late_cancel",
        owner: "Studio Manager",
        fields: { classLabel: "Mobility Session", member: "Julia Santos", nextAction: "Review late cancellation" },
      }),
      record("support", "threads", "Support threads", "Schwabing owner redaction question", {
        status: "review",
        craysEntityType: "conversation",
        craysEntityId: "golden_support_schwabing_redaction_thread",
        owner: "Reviewer",
        fields: { owner: anchorCase.owner, nextAction: "Keep owner-only notes excluded from Candidate room" },
      }),
      record("support", "service-levels", "Service levels", "Bank package review SLA", {
        status: "attention",
        craysEntityType: "conversation",
        craysEntityId: "golden_support_bank_package_sla",
        owner: "Finance",
        fields: { bank: anchorCase.bank, targetHours: 48, nextAction: "Confirm reviewer assignment" },
      }),
    ],
  },
  {
    moduleKey: "learning",
    ownerRole: "admin",
    connectionName: "Learning golden tenant training projection",
    records: [
      record("learning", "training-paths", "Training paths", "Adler Fitness Partner Onboarding", {
        status: "active",
        craysEntityType: "training",
        craysEntityId: "golden_learning_adler_partner_onboarding",
        owner: "Franchise Partner",
        fields: { candidate: anchorCase.candidate, modulesComplete: 4, modulesTotal: 7, nextAction: "Complete finance handoff module" },
      }),
      record("learning", "training-events", "Training events", "Berlin Mitte opening week operations training", {
        status: "scheduled",
        craysEntityType: "training",
        craysEntityId: "golden_learning_berlin_operations_training",
        owner: "Studio Manager",
        fields: { date: "2026-07-29", attendees: 9, nextAction: "Confirm trainer availability" },
      }),
      record("learning", "certifications", "Certifications", "Daniel Krause recovery training certification", {
        status: "review",
        craysEntityType: "training",
        craysEntityId: "golden_learning_coach_b_recovery_cert",
        owner: "CRAYS HR",
        fields: { trainer: "Daniel Krause", certification: "Recovery Training", nextAction: "Approve before schedule expansion" },
      }),
      record("learning", "knowledge-base", "Knowledge base", "Owner room redaction playbook", {
        status: "approved",
        craysEntityType: "document",
        craysEntityId: "golden_learning_owner_redaction_playbook",
        owner: "Reviewer",
        fields: { audience: "Reviewer", nextAction: "Use for Schwabing owner release review" },
      }),
    ],
  },
];

function connectionId(moduleKey) {
  return `core_source_${moduleKey}_golden_tenant`;
}

function systemKey(moduleKey) {
  return `${moduleKey}-golden-tenant`;
}

function mapId(record) {
  return `golden_map_${digest([record.moduleKey, record.sectionKey, record.externalId], 30)}`;
}

function rowMetadata(item, jobId) {
  return {
    moduleKey: item.moduleKey,
    sectionKey: item.sectionKey,
    sectionLabel: item.sectionLabel,
    syncJobId: jobId,
    snapshotGeneratedAt: generatedAt,
    goldenTenant: true,
    tenant: tenantLabel,
    anchorCase,
    row: {
      id: item.externalId,
      label: item.label,
      status: item.status,
      owner: item.owner,
      modifiedAt: generatedAt,
      fields: item.fields,
      fieldKeys: Object.keys(item.fields).sort(),
      sourceDigest: digest({ id: item.externalId, label: item.label, status: item.status, fields: item.fields }, 32),
    },
  };
}

async function persistModule(client, seed) {
  const connection = connectionId(seed.moduleKey);
  const jobId = `sync_job_${digest(["golden-tenant", seed.moduleKey, generatedAt, seed.records.length], 28)}`;

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
      seed.moduleKey,
      systemKey(seed.moduleKey),
      seed.connectionName,
      seed.ownerRole,
      JSON.stringify({
        generatedAt,
        tenant: tenantLabel,
        recordsSeen: seed.records.length,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
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
        moduleKey: seed.moduleKey,
        tenant: tenantLabel,
        rowsSeen: seed.records.length,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
      }),
    ],
  );

  let mapsWritten = 0;
  for (const item of seed.records) {
    const result = await client.query(
      `
        insert into crays_core.external_record_maps (
          map_id, crays_entity_type, crays_entity_id, external_system, external_entity_type,
          external_entity_id, sync_direction, sync_status, last_synced_at, metadata, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, 'read', 'synced', now(), $7::jsonb, now())
        on conflict (external_system, external_entity_type, external_entity_id) do update set
          crays_entity_type = excluded.crays_entity_type,
          crays_entity_id = excluded.crays_entity_id,
          sync_status = 'synced',
          last_synced_at = now(),
          metadata = excluded.metadata,
          updated_at = now()
      `,
      [
        mapId(item),
        item.craysEntityType,
        item.craysEntityId,
        systemKey(seed.moduleKey),
        item.sectionKey,
        item.externalId,
        JSON.stringify(rowMetadata(item, jobId)),
      ],
    );
    mapsWritten += result.rowCount ?? 0;
  }

  await client.query(
    `
      insert into crays_core.workflow_events (
        event_id, event_type, related_entity_type, related_entity_id, role_key,
        visibility_roles, event_status, payload, occurred_at
      )
      values ($1, 'golden_tenant.source_snapshot.persisted', 'sync-job', $2, 'admin', $3::jsonb, 'recorded', $4::jsonb, now())
    `,
    [
      `workflow_event_${randomUUID()}`,
      jobId,
      JSON.stringify(["admin", "crays-management", "reviewer", seed.ownerRole]),
      JSON.stringify({
        moduleKey: seed.moduleKey,
        tenant: tenantLabel,
        connectionId: connection,
        rowsSeen: seed.records.length,
        mapsWritten,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
      }),
    ],
  );

  return {
    moduleKey: seed.moduleKey,
    connectionId: connection,
    jobId,
    recordsSeen: seed.records.length,
    mapsWritten,
  };
}

async function main() {
  const plannedRecords = moduleSeeds.reduce((total, seed) => total + seed.records.length, 0);
  const plan = {
    mode: apply ? "apply" : "dry-run",
    target: getRedactedDatabaseTarget(connectionString),
    tenant: tenantLabel,
    generatedAt,
    modules: moduleSeeds.map((seed) => ({
      moduleKey: seed.moduleKey,
      connectionId: connectionId(seed.moduleKey),
      records: seed.records.length,
      families: Array.from(new Set(seed.records.map((item) => item.sectionKey))),
    })),
    plannedRecords,
    boundaries: {
      coreWritesEnabled: apply,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      toolApplyEnabled: false,
      uploadsEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      paymentInitiationEnabled: false,
      bankActionsEnabled: false,
      liveAiEnabled: false,
      productionDeployEnabled: false,
    },
  };

  if (!apply) {
    console.log(JSON.stringify(plan, null, 2));
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('crays.app_role', 'core_service', true)");
    const results = [];
    for (const seed of moduleSeeds) {
      results.push(await persistModule(client, seed));
    }
    await client.query("commit");
    console.log(JSON.stringify({ ...plan, results }, null, 2));
  } catch (error) {
    await client.query("rollback");
    console.error(
      JSON.stringify(
        {
          status: "failed",
          message: error instanceof Error ? error.message : "Golden Test Tenant seed failed.",
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
