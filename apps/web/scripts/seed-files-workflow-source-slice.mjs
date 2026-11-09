import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_FILES_WORKFLOW_SOURCE === "APPLY_FILES_WORKFLOW_SOURCE_SLICE";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const seedBatch = "crays-files-workflow-20260712-v1";

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_FILES_WORKFLOW_SOURCE=APPLY_FILES_WORKFLOW_SOURCE_SLICE to apply Files workflow source records.");
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

const companies = {
  candidate: "Adler Fitness Beteiligungs GmbH",
  studio: "Adler Fitness Muenchen Schwabing GmbH",
  owner: "Keller Urban Properties GmbH",
  bank: "Isar Commercial Finance AG",
  equipment: "Noack Fitness Equipment GmbH",
  services: "UrbanCare Facility Services GmbH",
  franchisor: "CRAYS Operations GmbH",
};

const people = {
  candidate: "Johannes Adler",
  dealLead: "Mara Stein",
  reviewer: "Nina Berger",
  finance: "Leon Fischer",
  expansion: "Clara Hoffmann",
  ownerContact: "Thomas Keller",
  bankContact: "Sabine Krueger",
  partnerSuccess: "Felix Brandt",
};

const baseFields = {
  moduleKey: "files",
  seedBatch,
  uploadEnabled: false,
  privatePreviewEnabled: false,
  roomReleaseEnabled: false,
  externalSendingEnabled: false,
  syncApplyEnabled: false,
  toolApplyEnabled: false,
};

function record(family, label, options) {
  const externalId = options.externalId ?? `files_${slug(family)}_${digest(label, 10)}`;
  return {
    family,
    label,
    externalId,
    craysEntityType: options.craysEntityType ?? "document",
    craysEntityId: options.craysEntityId ?? `files_${slug(label)}_${digest([family, label], 8)}`,
    syncStatus: options.syncStatus ?? "synced",
    owner: options.owner,
    role: options.role ?? "reviewer",
    status: options.status,
    dueDate: options.dueDate,
    priority: options.priority ?? "medium",
    fields: {
      ...options.fields,
      dueDate: options.dueDate ?? null,
      priority: options.priority ?? "medium",
      nextAction: options.fields?.nextAction ?? options.nextAction,
      uploadEnabled: false,
      releaseEnabled: false,
      sendEnabled: false,
    },
  };
}

const records = [
  record("packages", "Munich Schwabing candidate approval package", {
    externalId: "FILES-PKG-MUC-SCHWABING-CANDIDATE",
    craysEntityType: "evidence-package",
    owner: "Deal Manager",
    status: "review",
    dueDate: "2026-07-15",
    priority: "high",
    fields: {
      stakeholderRoom: "Candidate room",
      recipient: `${people.candidate} / ${companies.candidate}`,
      preparedDeal: "Prepared Franchise Deal - Munich Schwabing",
      packageType: "Candidate diligence package",
      documents: 8,
      approvedDocuments: 5,
      blockedItems: 1,
      nextAction: "Confirm candidate-facing redactions before package review.",
    },
  }),
  record("packages", "Munich Schwabing bank credit package", {
    externalId: "FILES-PKG-MUC-SCHWABING-BANK",
    craysEntityType: "bank-package",
    owner: "Finance",
    status: "blocked",
    dueDate: "2026-07-16",
    priority: "critical",
    syncStatus: "conflict",
    fields: {
      stakeholderRoom: "Bank room",
      recipient: companies.bank,
      contact: people.bankContact,
      preparedDeal: "Prepared Franchise Deal - Munich Schwabing",
      packageType: "Bank approval package",
      documents: 11,
      approvedDocuments: 7,
      blockedItems: 2,
      nextAction: "Resolve finance evidence redaction and missing lease appendix.",
    },
  }),
  record("packages", "Munich Schwabing owner lease package", {
    externalId: "FILES-PKG-MUC-SCHWABING-OWNER",
    craysEntityType: "evidence-package",
    owner: "Expansion Manager",
    status: "required",
    dueDate: "2026-07-17",
    fields: {
      stakeholderRoom: "Owner room",
      recipient: companies.owner,
      contact: people.ownerContact,
      property: "Leopoldstrasse 87 Studio Lease",
      packageType: "Lease evidence package",
      documents: 6,
      approvedDocuments: 4,
      blockedItems: 1,
      nextAction: "Attach reviewed handover appendix and hide internal economics.",
    },
  }),
  record("packages", "Munich Schwabing partner opening package", {
    externalId: "FILES-PKG-MUC-SCHWABING-PARTNER",
    craysEntityType: "evidence-package",
    owner: "Reviewer",
    status: "review_ready",
    dueDate: "2026-07-18",
    fields: {
      stakeholderRoom: "Partner room",
      recipient: `${people.candidate} / ${companies.candidate}`,
      preparedDeal: "Prepared Franchise Deal - Munich Schwabing",
      packageType: "Opening handoff package",
      documents: 9,
      approvedDocuments: 9,
      blockedItems: 0,
      nextAction: "Review partner scope before room access is requested.",
    },
  }),
  record("packages", "Berlin Mitte member support recovery package", {
    externalId: "FILES-PKG-BERLIN-MITTE-SUPPORT",
    craysEntityType: "document",
    owner: "Studio Manager",
    status: "review",
    dueDate: "2026-07-14",
    fields: {
      stakeholderRoom: "Internal support room",
      recipient: "Berlin Mitte Studio Operations",
      member: "Julia Santos",
      packageType: "Member support recovery evidence",
      documents: 5,
      approvedDocuments: 3,
      blockedItems: 1,
      nextAction: "Separate member-visible answer from internal payment exception notes.",
    },
  }),
  record("packages", "Noack equipment supplier evidence package", {
    externalId: "FILES-PKG-NOACK-EQUIPMENT",
    craysEntityType: "property-case",
    owner: "Procurement",
    status: "active",
    dueDate: "2026-07-19",
    fields: {
      stakeholderRoom: "Vendor room",
      recipient: companies.equipment,
      preparedDeal: "Prepared Franchise Deal - Munich Schwabing",
      packageType: "Supplier delivery evidence",
      documents: 4,
      approvedDocuments: 3,
      blockedItems: 0,
      nextAction: "Confirm equipment delivery metadata before project handoff.",
    },
  }),
  record("documents", "Executive case brief - Johannes Adler Munich Schwabing", {
    externalId: "FILES-DOC-MUC-EXECUTIVE-BRIEF",
    owner: "Deal Manager",
    status: "approved",
    dueDate: "2026-07-12",
    fields: {
      documentType: "Case memo",
      relatedPackage: "Munich Schwabing candidate approval package",
      visibility: "Candidate, Partner",
      version: "v3",
      redactionState: "Reviewed",
      nextAction: "Keep in candidate package review set.",
    },
  }),
  record("documents", "Leopoldstrasse 87 lease appendix redaction copy", {
    externalId: "FILES-DOC-MUC-LEASE-APPENDIX",
    owner: "Expansion Manager",
    status: "required",
    dueDate: "2026-07-15",
    priority: "high",
    fields: {
      documentType: "Lease appendix",
      relatedPackage: "Munich Schwabing owner lease package",
      visibility: "Owner, Reviewer",
      version: "v2",
      redactionState: "Needs contact redaction",
      nextAction: "Remove internal rent scenario notes before owner review.",
    },
  }),
  record("documents", "Munich Schwabing bank affordability worksheet", {
    externalId: "FILES-DOC-MUC-BANK-AFFORDABILITY",
    owner: "Finance",
    status: "blocked",
    dueDate: "2026-07-16",
    priority: "critical",
    syncStatus: "conflict",
    fields: {
      documentType: "Banking evidence",
      relatedPackage: "Munich Schwabing bank credit package",
      visibility: "Finance, Bank",
      version: "v5",
      redactionState: "Finance review required",
      nextAction: "Hide internal margin sensitivity before bank package review.",
    },
  }),
  record("documents", "Adler Fitness franchise agreement schedule", {
    externalId: "FILES-DOC-MUC-FRANCHISE-AGREEMENT",
    owner: "Reviewer",
    status: "required",
    dueDate: "2026-07-17",
    fields: {
      documentType: "Legal",
      relatedPackage: "Munich Schwabing partner opening package",
      visibility: "Partner, Reviewer",
      version: "v1",
      redactionState: "Metadata only",
      nextAction: "Confirm legal schedule owner before partner package review.",
    },
  }),
  record("documents", "Noack equipment delivery confirmation", {
    externalId: "FILES-DOC-NOACK-DELIVERY-CONFIRMATION",
    owner: "Procurement",
    status: "approved",
    dueDate: "2026-07-13",
    fields: {
      documentType: "Supplier evidence",
      relatedPackage: "Noack equipment supplier evidence package",
      visibility: "Vendor, Project",
      version: "v1",
      redactionState: "Reviewed",
      nextAction: "Link to opening project delivery milestone.",
    },
  }),
  record("documents", "UrbanCare cleaning kickoff quote", {
    externalId: "FILES-DOC-URBANCARE-CLEANING-QUOTE",
    owner: "Procurement",
    status: "review",
    dueDate: "2026-07-18",
    fields: {
      documentType: "Supplier quote",
      relatedPackage: "Munich Schwabing partner opening package",
      visibility: "Partner, Reviewer",
      version: "v2",
      redactionState: "Reviewed",
      nextAction: "Confirm scope against ERP purchase order before approval.",
    },
  }),
  record("documents", "Julia Santos support recovery note", {
    externalId: "FILES-DOC-BERLIN-MEMBER-RECOVERY",
    owner: "Support",
    status: "blocked",
    dueDate: "2026-07-13",
    priority: "critical",
    syncStatus: "conflict",
    fields: {
      documentType: "Support evidence",
      relatedPackage: "Berlin Mitte member support recovery package",
      visibility: "Internal only",
      version: "v1",
      redactionState: "Member data redaction required",
      nextAction: "Remove internal payment exception comment before support answer.",
    },
  }),
  record("documents", "Clara Hoffmann opening staffing approval memo", {
    externalId: "FILES-DOC-MUC-STAFFING-APPROVAL",
    owner: "HR",
    status: "review",
    dueDate: "2026-07-19",
    fields: {
      documentType: "Opening approval",
      relatedPackage: "Munich Schwabing partner opening package",
      visibility: "Internal, Partner",
      version: "v2",
      redactionState: "Reviewer check",
      nextAction: "Tie staffing memo to HR launch coverage and budget review.",
    },
  }),
  record("version-history", "Executive case brief v3 approved by Nina Berger", {
    owner: "Reviewer",
    status: "approved",
    dueDate: "2026-07-12",
    fields: {
      document: "Executive case brief - Johannes Adler Munich Schwabing",
      previousVersion: "v2",
      currentVersion: "v3",
      changedBy: people.reviewer,
      nextAction: "Keep v3 as active candidate package copy.",
    },
  }),
  record("version-history", "Bank affordability worksheet v5 blocked for redaction", {
    owner: "Finance",
    status: "blocked",
    dueDate: "2026-07-16",
    priority: "critical",
    syncStatus: "conflict",
    fields: {
      document: "Munich Schwabing bank affordability worksheet",
      previousVersion: "v4",
      currentVersion: "v5",
      changedBy: people.finance,
      nextAction: "Create redacted v6 before bank room review.",
    },
  }),
  record("version-history", "Lease appendix v2 awaiting owner-room copy", {
    owner: "Expansion Manager",
    status: "required",
    dueDate: "2026-07-15",
    fields: {
      document: "Leopoldstrasse 87 lease appendix redaction copy",
      previousVersion: "v1",
      currentVersion: "v2",
      changedBy: people.expansion,
      nextAction: "Confirm landlord scope before approval.",
    },
  }),
  record("approvals", "Candidate package approval - Johannes Adler", {
    owner: "Deal Manager",
    status: "review",
    dueDate: "2026-07-15",
    priority: "high",
    fields: {
      package: "Munich Schwabing candidate approval package",
      approver: people.dealLead,
      approvalStep: "Candidate visibility",
      decision: "Pending",
      nextAction: "Review candidate redaction checklist.",
    },
  }),
  record("approvals", "Bank package finance approval - Isar Commercial Finance", {
    owner: "Finance",
    status: "blocked",
    dueDate: "2026-07-16",
    priority: "critical",
    syncStatus: "conflict",
    fields: {
      package: "Munich Schwabing bank credit package",
      approver: people.finance,
      approvalStep: "Bank evidence",
      decision: "Blocked",
      nextAction: "Resolve affordability worksheet redaction.",
    },
  }),
  record("approvals", "Owner lease package approval - Keller Urban Properties", {
    owner: "Expansion Manager",
    status: "required",
    dueDate: "2026-07-17",
    fields: {
      package: "Munich Schwabing owner lease package",
      approver: people.expansion,
      approvalStep: "Owner room scope",
      decision: "Waiting",
      nextAction: "Attach reviewed lease appendix.",
    },
  }),
  record("approvals", "Partner opening package approval - Munich Schwabing", {
    owner: "Reviewer",
    status: "review_ready",
    dueDate: "2026-07-18",
    fields: {
      package: "Munich Schwabing partner opening package",
      approver: people.reviewer,
      approvalStep: "Partner handoff",
      decision: "Ready for review",
      nextAction: "Stage package review command before access request.",
    },
  }),
  record("grants", "Candidate room grant - Johannes Adler", {
    owner: "Deal Manager",
    status: "required",
    dueDate: "2026-07-15",
    fields: {
      room: "Candidate room",
      recipient: people.candidate,
      allowedSections: "Case brief, Financial model, Franchise terms",
      hiddenSections: "Internal bank comments, supplier negotiations",
      nextAction: "Confirm redactions before candidate-room access review.",
    },
  }),
  record("grants", "Bank room grant - Isar Commercial Finance", {
    owner: "Finance",
    status: "blocked",
    dueDate: "2026-07-16",
    priority: "critical",
    syncStatus: "conflict",
    fields: {
      room: "Bank room",
      recipient: companies.bank,
      contact: people.bankContact,
      allowedSections: "Bank evidence, KYC, lease summary",
      hiddenSections: "Candidate personal notes, internal pricing sensitivity",
      nextAction: "Resolve blocked bank evidence redaction first.",
    },
  }),
  record("grants", "Owner room grant - Keller Urban Properties", {
    owner: "Expansion Manager",
    status: "required",
    dueDate: "2026-07-17",
    fields: {
      room: "Owner room",
      recipient: companies.owner,
      contact: people.ownerContact,
      allowedSections: "Lease appendix, property handover, insurance certificate",
      hiddenSections: "Candidate finance, internal rent scenarios",
      nextAction: "Attach owner-safe lease appendix copy.",
    },
  }),
  record("grants", "Partner room grant - Munich Schwabing launch", {
    owner: "Reviewer",
    status: "review_ready",
    dueDate: "2026-07-18",
    fields: {
      room: "Partner room",
      recipient: `${people.candidate} / ${companies.candidate}`,
      allowedSections: "Opening checklist, supplier delivery, staffing approval",
      hiddenSections: "Bank conditions, internal support notes",
      nextAction: "Prepare partner package review.",
    },
  }),
  record("redactions", "Bank package margin sensitivity redaction", {
    owner: "Finance",
    status: "blocked",
    dueDate: "2026-07-16",
    priority: "critical",
    syncStatus: "conflict",
    fields: {
      document: "Munich Schwabing bank affordability worksheet",
      affectedRoom: "Bank room",
      redactionType: "Internal economics",
      items: "Margin sensitivity, owner negotiation notes",
      nextAction: "Create redacted bank-copy worksheet and stage review.",
    },
  }),
  record("redactions", "Lease appendix owner contact redaction", {
    owner: "Expansion Manager",
    status: "required",
    dueDate: "2026-07-15",
    fields: {
      document: "Leopoldstrasse 87 lease appendix redaction copy",
      affectedRoom: "Owner room",
      redactionType: "Internal notes",
      items: "Internal rent scenario, candidate financing note",
      nextAction: "Remove internal notes before owner package approval.",
    },
  }),
  record("redactions", "Member support internal note redaction", {
    owner: "Support",
    status: "blocked",
    dueDate: "2026-07-13",
    priority: "critical",
    syncStatus: "conflict",
    fields: {
      document: "Julia Santos support recovery note",
      affectedRoom: "Member support",
      redactionType: "Member service privacy",
      items: "Payment retry history, internal churn note",
      nextAction: "Prepare support-safe answer without internal finance comments.",
    },
  }),
  record("release-preflights", "Candidate room preflight - Johannes Adler", {
    owner: "Deal Manager",
    status: "blocked",
    dueDate: "2026-07-15",
    priority: "high",
    syncStatus: "conflict",
    fields: {
      room: "Candidate room",
      audience: `${people.candidate} / ${companies.candidate}`,
      visibleSections: 5,
      hiddenSections: 3,
      issues: 1,
      gate: "Candidate release closed",
      nextAction: "Resolve candidate package redaction before release review.",
    },
  }),
  record("release-preflights", "Bank room preflight - Isar Commercial Finance", {
    owner: "Finance",
    status: "blocked",
    dueDate: "2026-07-16",
    priority: "critical",
    syncStatus: "conflict",
    fields: {
      room: "Bank room",
      audience: companies.bank,
      visibleSections: 7,
      hiddenSections: 5,
      issues: 2,
      gate: "Bank send closed",
      nextAction: "Resolve finance evidence and lease appendix blockers.",
    },
  }),
  record("release-preflights", "Owner room preflight - Keller Urban Properties", {
    owner: "Expansion Manager",
    status: "blocked",
    dueDate: "2026-07-17",
    fields: {
      room: "Owner room",
      audience: companies.owner,
      visibleSections: 4,
      hiddenSections: 4,
      issues: 1,
      gate: "Owner room release closed",
      nextAction: "Attach owner-safe lease appendix copy.",
    },
  }),
  record("release-preflights", "Partner room preflight - Munich Schwabing launch", {
    owner: "Reviewer",
    status: "review_ready",
    dueDate: "2026-07-18",
    fields: {
      room: "Partner room",
      audience: `${people.candidate} / ${companies.candidate}`,
      visibleSections: 9,
      hiddenSections: 2,
      issues: 0,
      gate: "Partner room release closed",
      nextAction: "Stage package review; release remains closed.",
    },
  }),
  record("room-access", "Candidate room access request - Johannes Adler", {
    owner: "Deal Manager",
    status: "waiting_review",
    dueDate: "2026-07-15",
    fields: {
      room: "Candidate room",
      accessHolder: people.candidate,
      organization: companies.candidate,
      accessScope: "Candidate diligence package",
      nextAction: "Complete preflight before access is requested.",
    },
  }),
  record("room-access", "Bank room access request - Sabine Krueger", {
    owner: "Finance",
    status: "blocked",
    dueDate: "2026-07-16",
    priority: "critical",
    syncStatus: "conflict",
    fields: {
      room: "Bank room",
      accessHolder: people.bankContact,
      organization: companies.bank,
      accessScope: "Bank credit package",
      nextAction: "Bank access cannot be requested until finance redaction passes.",
    },
  }),
  record("package-tasks", "Review candidate-facing financial model redaction", {
    owner: "Deal Manager",
    status: "review",
    dueDate: "2026-07-15",
    priority: "high",
    fields: {
      package: "Munich Schwabing candidate approval package",
      taskType: "Redaction review",
      relatedDocument: "Executive case brief - Johannes Adler Munich Schwabing",
      nextAction: "Confirm the candidate can see revenue ramp without bank comments.",
    },
  }),
  record("package-tasks", "Create redacted bank worksheet v6", {
    owner: "Finance",
    status: "blocked",
    dueDate: "2026-07-16",
    priority: "critical",
    syncStatus: "conflict",
    fields: {
      package: "Munich Schwabing bank credit package",
      taskType: "Document version",
      relatedDocument: "Munich Schwabing bank affordability worksheet",
      nextAction: "Prepare redacted v6 and stage package review command.",
    },
  }),
  record("package-tasks", "Link Noack delivery confirmation to project milestone", {
    owner: "Procurement",
    status: "active",
    dueDate: "2026-07-19",
    fields: {
      package: "Noack equipment supplier evidence package",
      taskType: "Project linkage",
      relatedDocument: "Noack equipment delivery confirmation",
      nextAction: "Connect supplier evidence to opening project delivery milestone.",
    },
  }),
];

function connectionId() {
  return "core_source_files";
}

function systemKey() {
  return "files-engine";
}

function sectionLabel(family) {
  return family
    .split("-")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapId(item) {
  return `map_${digest({ moduleKey: "files", sectionKey: item.family, rowId: item.externalId }, 30)}`;
}

function currentProof(item) {
  return {
    id: item.externalId,
    label: item.label,
    status: item.status,
    owner: item.owner,
    modifiedAt: generatedAt,
    role: item.role,
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
  const groupedRecords = grouped();
  const jobId = `sync_job_${digest(["files-workflow-source-slice", generatedAt, records.length], 28)}`;

  await client.query(
    `
      insert into crays_core.integration_connections (
        connection_id, module_key, system_key, connection_name, owner_role, status,
        connection_mode, secret_reference_status, connection_health, metadata, updated_at
      )
      values ($1, 'files', $2, 'Files package workflow source slice', 'reviewer', 'active', 'sync_read_model', 'configured_reference', 'healthy', $3::jsonb, now())
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
        sourceConnection: "snapshot",
        generatedAt,
        rowsSeen: records.length,
        families: Object.keys(groupedRecords).sort(),
        liveRuntimeAvailable: false,
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
        sourceConnection: "snapshot",
        generatedAt,
        rowsSeen: records.length,
        families: Object.keys(groupedRecords).sort(),
      }),
    ],
  );

  let written = 0;
  for (const item of records) {
    const proof = currentProof(item);
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
          moduleKey: "files",
          sectionKey: item.family,
          sectionLabel: sectionLabel(item.family),
          syncJobId: jobId,
          snapshotGeneratedAt: generatedAt,
          seedBatch,
          row: proof,
          sourceDigest: digest(proof, 32),
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
    attention: items.filter((item) => ["blocked", "review", "required", "waiting_review"].includes(item.status)).length,
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
      uploadEnabled: false,
      privatePreviewEnabled: false,
      roomReleaseEnabled: false,
      externalSendingEnabled: false,
      syncApplyEnabled: false,
      toolApplyEnabled: false,
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
        message: error instanceof Error ? error.message : "Unknown Files workflow source seed failure.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
