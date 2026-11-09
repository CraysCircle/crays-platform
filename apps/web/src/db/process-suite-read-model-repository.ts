import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import { getManagementGateReviewReadModel, type ManagementGateReviewItem } from "./management-gate-review-read-model-repository";
import { getStakeholderRoomControlReadModel } from "./stakeholder-room-control-read-model-repository";
import { getStudioOperationsWorkbenchReadModel } from "./studio-operations-workbench-read-model-repository";
import { getSyncPerformanceReadModel, type SyncPerformanceReadModel } from "./sync-performance-read-model-repository";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type ProcessSuiteAccessLevel = "process_suite" | "scoped_process_suite" | "forbidden";
type ProcessSuiteState = "ready" | "attention" | "blocked";

type SourceMapRow = {
  map_id: string;
  external_system: string;
  external_entity_type: string;
  crays_entity_type: string;
  crays_entity_id: string;
  sync_status: string;
  last_synced_at: Date | null;
  metadata: JsonRecord | null;
};

export type ProcessSuiteSourceRecord = {
  recordKey: string;
  moduleKey: string;
  moduleLabel: string;
  sourceFamily: string;
  label: string;
  status: string;
  ownerRole: string;
  nextAction: string;
  highlights: string[];
  sourceBacked: true;
  freshness: string;
};

export type ProcessSuiteStep = {
  stepKey: string;
  label: string;
  moduleKey: string;
  moduleLabel: string;
  ownerRole: string;
  state: ProcessSuiteState;
  href: string;
  sourceRecordCount: number;
  commandDrafts: number;
  blockedRooms: number;
  evidence: ProcessSuiteSourceRecord[];
  blocker: string;
  nextAction: string;
};

export type ProcessSuite = {
  suiteKey: string;
  label: string;
  journeySegment: string;
  ownerRole: string;
  consumingRoles: string[];
  state: ProcessSuiteState;
  completionPercent: number;
  sourceBacked: boolean;
  sourceRecords: number;
  commandDrafts: number;
  blockedRooms: number;
  blockedStages: number;
  modules: string[];
  currentDecision: string;
  nextAction: string;
  steps: ProcessSuiteStep[];
};

export type ProcessSuiteReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: ProcessSuiteAccessLevel;
    reason: string;
  };
  anchorCase: {
    tenant: string;
    preparedOffer: string;
    candidate: string;
    candidateOrganization: string;
    property: string;
    owner: string;
    bank: string;
    studio: string;
  };
  summary: {
    suites: number;
    stages: number;
    sourceRecords: number;
    modulesCovered: number;
    sourceBackedSuites: number;
    commandDrafts: number;
    applyBlockedCommands: number;
    blockedStages: number;
    blockedRooms: number;
    missingSourceRecords: number;
  };
  suites: ProcessSuite[];
  moduleCoverage: Array<{
    moduleKey: string;
    label: string;
    sourceMaps: number;
    missingRecords: number;
    localityConfidence: string;
    nextAction: string;
  }>;
  boundaries: {
    sourceReadsEnabled: true;
    coreCommandDraftsEnabled: true;
    stakeholderRoomPreflightEnabled: true;
    memberAppReadsEnabled: true;
    targetApplyEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    destructiveApplyEnabled: false;
    uploadsEnabled: false;
    externalSendingEnabled: false;
    publicReleaseEnabled: false;
    paymentInitiationEnabled: false;
    bankActionsEnabled: false;
    liveAiEnabled: false;
    productionDeployEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const internalRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedRoles: RoleKey[] = ["deal-manager", "expansion-manager", "finance", "studio-manager", "hr", "franchise-partner"];

const anchorCase = {
  tenant: "CRAYS Golden Studio Tenant",
  preparedOffer: "Prepared Franchise Deal - Munich Schwabing",
  candidate: "Johannes Adler",
  candidateOrganization: "Adler Fitness Beteiligungs GmbH",
  property: "Leopoldstrasse 87 Studio Lease",
  owner: "Schwabing Atrium Immobilien GmbH",
  bank: "Isar Commercial Finance AG",
  studio: "Berlin Mitte Studio",
};

const moduleLabels: Record<string, string> = {
  analytics: "Analytics",
  crm: "CRM",
  erp: "ERP",
  files: "Files",
  hr: "HR",
  learning: "Learning",
  loans: "Loans",
  operations: "Operations",
  project: "Project",
  support: "Support",
  sync: "Sync",
};

const moduleRoutes: Record<string, string> = {
  analytics: "/analytics?role=crays-management&view=portfolio",
  crm: "/crm?role=deal-manager&view=records&record=opportunities",
  erp: "/erp?role=finance&view=budget-review&record=budgets",
  files: "/files?role=reviewer&view=package-builder&record=packages",
  hr: "/hr?role=hr",
  learning: "/learning?role=franchise-partner",
  loans: "/loans?role=finance&view=package-readiness&record=packages",
  operations: "/operations?role=studio-manager",
  project: "/project?role=expansion-manager&view=work-items",
  support: "/support?role=reviewer",
  sync: "/sync?role=admin",
};

function accessForRole(role: RoleKey): ProcessSuiteReadModel["access"] {
  if (internalRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "process_suite",
      reason: "Role can inspect the full A-Z operating process with source-backed records, command drafts and closed release/apply boundaries.",
    };
  }

  if (scopedRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "scoped_process_suite",
      reason: "Role can inspect the A-Z process suite without raw source payloads, secrets or external release/apply controls.",
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "A-Z process suites require internal or scoped operating access.",
  };
}

function boundaries(): ProcessSuiteReadModel["boundaries"] {
  return {
    sourceReadsEnabled: true,
    coreCommandDraftsEnabled: true,
    stakeholderRoomPreflightEnabled: true,
    memberAppReadsEnabled: true,
    targetApplyEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    destructiveApplyEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    paymentInitiationEnabled: false,
    bankActionsEnabled: false,
    liveAiEnabled: false,
    productionDeployEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberText(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value.toLocaleString("en-US");
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function jsonObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function moduleKeyFromRow(row: SourceMapRow) {
  const metadataModule = text(row.metadata?.moduleKey);
  if (metadataModule) return metadataModule;
  if (row.external_system.startsWith("crm")) return "crm";
  if (row.external_system.startsWith("erp")) return "erp";
  if (row.external_system.includes("-")) return row.external_system.split("-")[0];
  return row.external_system;
}

function highlightPairs(fields: JsonRecord) {
  const keys = [
    "candidateOrganization",
    "company",
    "bank",
    "owner",
    "amount",
    "requestedAmount",
    "documents",
    "approvedDocuments",
    "evidenceCoverage",
    "activeMembers",
    "checkinsToday",
    "paymentExceptions",
    "blockedConditions",
    "location",
    "role",
    "dueDate",
    "appointmentDate",
    "priority",
  ];

  return keys
    .flatMap((key) => {
      const value = numberText(fields[key]);
      if (!value) return [];
      if (key === "company" && value.toLowerCase().includes("dev company")) return [];
      return `${titleCase(key)}: ${value}`;
    })
    .slice(0, 4);
}

function recordFromSourceRow(row: SourceMapRow): ProcessSuiteSourceRecord {
  const moduleKey = moduleKeyFromRow(row);
  const metadata = jsonObject(row.metadata);
  const sourceRow = jsonObject(metadata.row);
  const fields = jsonObject(sourceRow.fields);
  const label = text(sourceRow.label) ?? titleCase(row.external_entity_type);
  const status = text(sourceRow.status) ?? row.sync_status;
  const ownerRole = text(sourceRow.owner) ?? text(fields.owner) ?? "CRAYS";
  const nextAction = text(fields.nextAction) ?? (status === "synced" ? "Use current source projection for the next decision." : "Review source projection status.");
  const sourceFamily = text(metadata.sectionLabel) ?? titleCase(row.external_entity_type);
  const freshness = row.last_synced_at ? row.last_synced_at.toISOString() : "Current Core projection";

  return {
    recordKey: row.map_id,
    moduleKey,
    moduleLabel: moduleLabels[moduleKey] ?? titleCase(moduleKey),
    sourceFamily,
    label,
    status,
    ownerRole,
    nextAction,
    highlights: highlightPairs(fields),
    sourceBacked: true,
    freshness,
  };
}

async function getSourceRecords() {
  const result = await getCorePgPool().query<SourceMapRow>(
    `
      select
        map_id,
        external_system,
        external_entity_type,
        crays_entity_type,
        crays_entity_id,
        sync_status,
        last_synced_at,
        metadata
      from crays_core.external_record_maps
      where
        metadata ->> 'goldenTenant' = 'true'
        or (
          external_system = 'crm-engine'
          and (
            metadata -> 'row' ->> 'label' ilike any($1::text[])
            or metadata -> 'row' -> 'fields' ->> 'company' = any($2::text[])
            or metadata -> 'row' -> 'fields' ->> 'pointOfContact' = any($3::text[])
          )
        )
        or (
          external_system = 'erp-engine'
          and (
            metadata -> 'row' ->> 'label' ilike any($4::text[])
            or metadata -> 'row' ->> 'label' in ('CRAYS-CC-SCHWABING', 'CRAYS-CUST-SCHWABING', 'CRAYS-SUP-EQUIPMENT', 'CRAYS-SUP-CLEANING')
          )
        )
      order by updated_at desc, map_id asc
      limit 120
    `,
    [
      ["%Adler%", "%Berlin Mitte%", "%Schwabing%", "%Bank Package%", "%Studio Franchise%", "%Studio Operations%"],
      ["Adler Fitness Beteiligungs GmbH", "RheinBank Commercial Finance AG", "CRAYS Studio Operations GmbH"],
      ["Johannes Adler", "Sarah Neumann", "Clara Hoffmann"],
      ["%SCHWABING%", "%EQUIPMENT%", "%CLEANING%"],
    ],
  );

  return result.rows.map(recordFromSourceRow);
}

function operationRecords(operations: Awaited<ReturnType<typeof getStudioOperationsWorkbenchReadModel>>): ProcessSuiteSourceRecord[] {
  if (!operations.access.allowed) return [];

  const memberRecords = operations.memberExceptions.map((item) => ({
    recordKey: `operations-member-${item.memberId}`,
    moduleKey: "operations",
    moduleLabel: "Operations",
    sourceFamily: "Member App profiles",
    label: `${item.label} member recovery`,
    status: item.status,
    ownerRole: "Studio Manager",
    nextAction: item.nextAction,
    highlights: [
      `Payment status: ${titleCase(item.paymentStatus)}`,
      `Payment method: ${titleCase(item.paymentMethodStatus)}`,
      `Service risk: ${titleCase(item.serviceRisk)}`,
      `Bookings this month: ${item.bookingsThisMonth}`,
    ],
    sourceBacked: true,
    freshness: operations.studio?.generatedAt ?? "Current Member App projection",
  })) satisfies ProcessSuiteSourceRecord[];

  const supportNames = ["Marco Schmidt", "Julia Santos", "Priya Nair"];
  const supportRecords = operations.supportRequests.map((item, index) => ({
    recordKey: `operations-support-${item.requestId}`,
    moduleKey: "operations",
    moduleLabel: "Operations",
    sourceFamily: "Member App support requests",
    label: `${supportNames[index] ?? "Member"} ${item.label}`,
    status: item.status,
    ownerRole: "Studio Manager",
    nextAction: item.nextAction,
    highlights: [`Priority: ${titleCase(item.priority)}`, `Request status: ${titleCase(item.status)}`],
    sourceBacked: true,
    freshness: operations.studio?.generatedAt ?? "Current Member App projection",
  })) satisfies ProcessSuiteSourceRecord[];

  return [...memberRecords, ...supportRecords];
}

function syncProjectionRecords(sync: SyncPerformanceReadModel): ProcessSuiteSourceRecord[] {
  return [
    {
      recordKey: "sync-core-projection-health",
      moduleKey: "sync",
      moduleLabel: "Sync",
      sourceFamily: "Core source-map projection",
      label: "Core source-map freshness and coverage",
      status: sync.summary.missingRecords > 0 ? "blocked" : sync.summary.conflicts > 0 ? "attention" : "ready",
      ownerRole: "Admin",
      nextAction:
        sync.summary.missingRecords > 0
          ? "Add missing realistic source records or review source filters."
          : "Use current Core projection for the A-Z process suite and keep apply controls closed.",
      highlights: [
        `Source maps: ${sync.summary.sourceMaps}`,
        `Missing records: ${sync.summary.missingRecords}`,
        `Fresh modules: ${sync.summary.freshModules}`,
        `Conflicts: ${sync.summary.conflicts}`,
      ],
      sourceBacked: true,
      freshness: "Current Sync Performance read model",
    },
  ];
}

function recordMatches(record: ProcessSuiteSourceRecord, terms: string[]) {
  const searchable = [record.label, record.moduleKey, record.sourceFamily, record.status, record.ownerRole, record.nextAction, ...record.highlights].join(" ").toLowerCase();
  return terms.some((term) => searchable.includes(term.toLowerCase()));
}

function recordsFor(records: ProcessSuiteSourceRecord[], moduleKeys: string[], terms: string[], limit = 6) {
  return records.filter((record) => moduleKeys.includes(record.moduleKey) && recordMatches(record, terms)).slice(0, limit);
}

function commandDraftsFor(commands: ManagementGateReviewItem[], moduleLabelsToMatch: string[]) {
  return commands.filter((item) => moduleLabelsToMatch.includes(item.moduleLabel));
}

function stateFromEvidence(input: { records: ProcessSuiteSourceRecord[]; commands: ManagementGateReviewItem[]; blockedRooms?: number }) {
  const hasBlockedRecords = input.records.some((record) => /blocked|critical|failed|past due|missing/i.test(`${record.status} ${record.nextAction} ${record.highlights.join(" ")}`));
  if (hasBlockedRecords || (input.blockedRooms ?? 0) > 0) return "blocked" satisfies ProcessSuiteState;
  if (input.commands.length > 0 || input.records.some((record) => /review|attention|draft|scheduled/i.test(record.status))) return "attention" satisfies ProcessSuiteState;
  return "ready" satisfies ProcessSuiteState;
}

function firstBlocker(records: ProcessSuiteSourceRecord[], blockedRooms: number | undefined, fallback: string) {
  if (blockedRooms && blockedRooms > 0) return `${blockedRooms} stakeholder room${blockedRooms === 1 ? "" : "s"} still blocked for release review.`;
  const blocked = records.find((record) => /blocked|critical|failed|missing|past due/i.test(`${record.status} ${record.nextAction} ${record.highlights.join(" ")}`));
  return blocked ? `${blocked.label}: ${blocked.nextAction}` : fallback;
}

function firstNextAction(records: ProcessSuiteSourceRecord[], fallback: string) {
  return records.find((record) => record.nextAction)?.nextAction ?? fallback;
}

function step(input: {
  stepKey: string;
  label: string;
  moduleKey: string;
  ownerRole: string;
  records: ProcessSuiteSourceRecord[];
  commands?: ManagementGateReviewItem[];
  blockedRooms?: number;
  blockerFallback: string;
  nextFallback: string;
}): ProcessSuiteStep {
  const commands = input.commands ?? [];
  const state = stateFromEvidence({ records: input.records, commands, blockedRooms: input.blockedRooms });

  return {
    stepKey: input.stepKey,
    label: input.label,
    moduleKey: input.moduleKey,
    moduleLabel: moduleLabels[input.moduleKey] ?? titleCase(input.moduleKey),
    ownerRole: input.ownerRole,
    state,
    href: moduleRoutes[input.moduleKey] ?? "/dashboard?role=crays-management",
    sourceRecordCount: input.records.length,
    commandDrafts: commands.length,
    blockedRooms: input.blockedRooms ?? 0,
    evidence: input.records,
    blocker: firstBlocker(input.records, input.blockedRooms, input.blockerFallback),
    nextAction: firstNextAction(input.records, input.nextFallback),
  };
}

function suite(input: {
  suiteKey: string;
  label: string;
  journeySegment: string;
  ownerRole: string;
  consumingRoles: string[];
  currentDecision: string;
  steps: ProcessSuiteStep[];
}): ProcessSuite {
  const totalSteps = input.steps.length || 1;
  const readySteps = input.steps.filter((item) => item.state === "ready").length;
  const attentionSteps = input.steps.filter((item) => item.state === "attention").length;
  const blockedStages = input.steps.filter((item) => item.state === "blocked").length;
  const state: ProcessSuiteState = blockedStages > 0 ? "blocked" : attentionSteps > 0 ? "attention" : "ready";
  const modules = Array.from(new Set(input.steps.map((item) => item.moduleLabel)));
  const sourceRecords = input.steps.reduce((total, item) => total + item.sourceRecordCount, 0);
  const commandDrafts = input.steps.reduce((total, item) => total + item.commandDrafts, 0);
  const blockedRooms = input.steps.reduce((total, item) => total + item.blockedRooms, 0);
  const firstBlocked = input.steps.find((item) => item.state === "blocked") ?? input.steps.find((item) => item.state === "attention") ?? input.steps[0];

  return {
    suiteKey: input.suiteKey,
    label: input.label,
    journeySegment: input.journeySegment,
    ownerRole: input.ownerRole,
    consumingRoles: input.consumingRoles,
    state,
    completionPercent: Math.round(((readySteps + attentionSteps * 0.5) / totalSteps) * 100),
    sourceBacked: input.steps.every((item) => item.sourceRecordCount > 0 || item.commandDrafts > 0 || item.blockedRooms > 0),
    sourceRecords,
    commandDrafts,
    blockedRooms,
    blockedStages,
    modules,
    currentDecision: input.currentDecision,
    nextAction: firstBlocked?.nextAction ?? "Review the suite.",
    steps: input.steps,
  };
}

function buildSuites(input: {
  records: ProcessSuiteSourceRecord[];
  commands: ManagementGateReviewItem[];
  blockedRooms: number;
}): ProcessSuite[] {
  const { records, commands, blockedRooms } = input;

  const crmRecords = recordsFor(records, ["crm"], ["Adler", "Berlin Mitte", "Bank Package", "Studio Franchise"], 6);
  const candidateFiles = recordsFor(records, ["files"], ["Candidate Release Pack", "Candidate Memo", "Bank room metadata", "Finance Evidence"], 5);
  const loanRecords = recordsFor(records, ["loans"], ["Isar", "Working Capital", "Lease assignment", "Opening budget"], 6);
  const financeKpis = recordsFor(records, ["analytics"], ["Financing Readiness", "Portfolio Snapshot", "Owner release"], 5);

  const projectRecords = recordsFor(records, ["project"], ["Leopoldstrasse", "Berlin Mitte", "lease redline", "permit", "owner consent", "handoff"], 6);
  const openingFiles = recordsFor(records, ["files"], ["Lease Redline", "Opening Budget", "Candidate Memo"], 4);
  const erpRecords = recordsFor(records, ["erp"], ["SCHWABING", "EQUIPMENT", "CLEANING"], 4);
  const staffingRecords = recordsFor(records, ["hr", "learning"], ["Berlin Mitte", "opening", "partner onboarding", "Daniel Krause", "trainer rota"], 8);

  const operationsRecords = recordsFor(records, ["operations"], ["payment", "recovery", "booking", "training", "Marco", "Julia", "Priya", "Noah"], 8);
  const supportRecords = recordsFor(records, ["support"], ["Julia", "payment", "Bank package", "Schwabing", "redaction"], 5);
  const studioKpis = recordsFor(records, ["analytics"], ["Member Health", "paymentExceptions", "Berlin Mitte"], 4);
  const capacityRecords = recordsFor(records, ["hr", "learning"], ["trainer", "Daniel Krause", "operations training", "rota"], 5);
  const syncRecords = recordsFor(records, ["sync"], ["Core source-map", "Source maps", "Missing records"], 2);

  return [
    suite({
      suiteKey: "candidate_to_bank_readiness",
      label: "Candidate-to-bank readiness",
      journeySegment: "Candidate Intent -> Evidence -> Bank Package Readiness",
      ownerRole: "Deal Manager",
      consumingRoles: ["Finance", "Reviewer", "Bank Partner", "CRAYS Management"],
      currentDecision: "Can Johannes Adler and Adler Fitness Beteiligungs GmbH move from internal deal review to bank package review without leaking internal records?",
      steps: [
        step({
          stepKey: "crm-intake",
          label: "Candidate and opportunity intake",
          moduleKey: "crm",
          ownerRole: "Deal Manager",
          records: crmRecords,
          commands: commandDraftsFor(commands, ["CRM"]),
          blockerFallback: "CRM source records are ready for the next review.",
          nextFallback: "Review candidate opportunity and follow-up tasks.",
        }),
        step({
          stepKey: "document-evidence",
          label: "Evidence package and room preflight",
          moduleKey: "files",
          ownerRole: "Reviewer",
          records: candidateFiles,
          commands: commandDraftsFor(commands, ["Files"]),
          blockedRooms,
          blockerFallback: "Document evidence is ready for internal reviewer sign-off.",
          nextFallback: "Review room redactions and approved document metadata.",
        }),
        step({
          stepKey: "bank-package",
          label: "Bank package and conditions",
          moduleKey: "loans",
          ownerRole: "Finance",
          records: loanRecords,
          commands: commandDraftsFor(commands, ["Loans"]),
          blockerFallback: "Bank package has no blocking condition in the current projection.",
          nextFallback: "Complete evidence redaction review before any bank-facing release.",
        }),
        step({
          stepKey: "finance-readout",
          label: "Portfolio and finance readout",
          moduleKey: "analytics",
          ownerRole: "CRAYS Management",
          records: financeKpis,
          blockerFallback: "Management readout is decision-ready.",
          nextFallback: "Review financing readiness and portfolio risk signals.",
        }),
        step({
          stepKey: "sync-readiness",
          label: "Source freshness and command policy",
          moduleKey: "sync",
          ownerRole: "Admin",
          records: syncRecords,
          commands: commandDraftsFor(commands, ["Sync"]),
          blockerFallback: "Core sync projection is ready for process-suite decisions.",
          nextFallback: "Use current Core projection and keep source/sync apply controls closed.",
        }),
      ],
    }),
    suite({
      suiteKey: "opening_handoff_to_studio_launch",
      label: "Opening handoff to studio launch",
      journeySegment: "Property Supply -> Opening Project -> HR/Learning Handoff",
      ownerRole: "Expansion Manager",
      consumingRoles: ["Finance", "Franchise Partner", "Studio Manager", "CRAYS HR", "Reviewer"],
      currentDecision: "Can Leopoldstrasse 87 move from owner/lease work into a launchable studio operating plan?",
      steps: [
        step({
          stepKey: "property-owner-dependency",
          label: "Lease, owner and property dependency",
          moduleKey: "project",
          ownerRole: "Expansion Manager",
          records: projectRecords,
          commands: commandDraftsFor(commands, ["Project"]),
          blockerFallback: "Property dependencies are ready for handoff.",
          nextFallback: "Resolve owner consent and lease redline review.",
        }),
        step({
          stepKey: "budget-procurement",
          label: "Opening budget and procurement",
          moduleKey: "erp",
          ownerRole: "Finance",
          records: [...openingFiles, ...erpRecords].slice(0, 8),
          commands: commandDraftsFor(commands, ["ERP"]),
          blockerFallback: "Opening budget and procurement records are available.",
          nextFallback: "Link approved opening budget to bank package and procurement queue.",
        }),
        step({
          stepKey: "staffing-training",
          label: "Staffing and launch training",
          moduleKey: "hr",
          ownerRole: "CRAYS HR",
          records: staffingRecords,
          blockerFallback: "Launch staffing is ready for Studio Manager review.",
          nextFallback: "Confirm opening staffing roster and trainer onboarding plan.",
        }),
        step({
          stepKey: "partner-handoff",
          label: "Partner handoff readiness",
          moduleKey: "learning",
          ownerRole: "Franchise Partner",
          records: recordsFor(records, ["learning"], ["Partner Onboarding", "finance handoff", "Owner room"], 4),
          blockerFallback: "Partner handoff learning path is available.",
          nextFallback: "Complete finance handoff module before room release.",
        }),
      ],
    }),
    suite({
      suiteKey: "studio_operations_recovery",
      label: "Studio operations recovery",
      journeySegment: "Member App Signal -> Support Recovery -> Management KPI",
      ownerRole: "Studio Manager",
      consumingRoles: ["Support", "Finance", "CRAYS Management", "CRAYS HR", "Learning"],
      currentDecision: "Can Berlin Mitte act on member payment, booking, trainer and support exceptions from the Member App bridge?",
      steps: [
        step({
          stepKey: "member-exception-triage",
          label: "Member exception triage",
          moduleKey: "operations",
          ownerRole: "Studio Manager",
          records: operationsRecords,
          commands: commandDraftsFor(commands, ["Operations"]),
          blockerFallback: "Member App exceptions are available for review.",
          nextFallback: "Prioritize payment recovery and service-risk records.",
        }),
        step({
          stepKey: "support-recovery",
          label: "Support and payment recovery",
          moduleKey: "support",
          ownerRole: "Support",
          records: supportRecords,
          blockerFallback: "Support recovery records are ready for service review.",
          nextFallback: "Coordinate payment recovery before member-facing reply.",
        }),
        step({
          stepKey: "staff-capacity",
          label: "Trainer and staffing capacity",
          moduleKey: "hr",
          ownerRole: "CRAYS HR",
          records: capacityRecords,
          blockerFallback: "Trainer capacity records are ready.",
          nextFallback: "Fill Daniel Krause morning capacity before schedule expansion.",
        }),
        step({
          stepKey: "studio-kpi-review",
          label: "Studio KPI and management review",
          moduleKey: "analytics",
          ownerRole: "CRAYS Management",
          records: studioKpis,
          blockerFallback: "Studio KPI snapshot is ready.",
          nextFallback: "Review member recovery queue and payment exceptions.",
        }),
      ],
    }),
  ];
}

function uniqueRecordCount(suites: ProcessSuite[]) {
  const keys = new Set<string>();
  suites.forEach((suiteItem) => suiteItem.steps.forEach((stepItem) => stepItem.evidence.forEach((record) => keys.add(record.recordKey))));
  return keys.size;
}

function emptyReadModel(role: RoleKey, queryStatus: ProcessSuiteReadModel["queryStatus"]): ProcessSuiteReadModel {
  const access = accessForRole(role);
  return {
    access,
    anchorCase,
    summary: {
      suites: 0,
      stages: 0,
      sourceRecords: 0,
      modulesCovered: 0,
      sourceBackedSuites: 0,
      commandDrafts: 0,
      applyBlockedCommands: 0,
      blockedStages: 0,
      blockedRooms: 0,
      missingSourceRecords: 0,
    },
    suites: [],
    moduleCoverage: [],
    boundaries: boundaries(),
    queryStatus,
  };
}

export async function getProcessSuiteReadModel(role: RoleKey): Promise<ProcessSuiteReadModel> {
  const access = accessForRole(role);
  if (!access.allowed) return emptyReadModel(role, "forbidden");

  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured) return emptyReadModel(role, "not_configured");

  const [sourceRecords, commandQueue, rooms, operations, sync] = await Promise.all([
    getSourceRecords(),
    getManagementGateReviewReadModel("reviewer"),
    getStakeholderRoomControlReadModel({ role: "reviewer" }),
    getStudioOperationsWorkbenchReadModel("studio-manager"),
    getSyncPerformanceReadModel("admin"),
  ]);

  const records = [...sourceRecords, ...operationRecords(operations), ...syncProjectionRecords(sync)];
  const suites = buildSuites({
    records,
    commands: commandQueue.queue,
    blockedRooms: rooms.summary.blockedRooms,
  });
  const moduleSet = new Set<string>();
  suites.forEach((suiteItem) => suiteItem.steps.forEach((stepItem) => moduleSet.add(stepItem.moduleKey)));

  return {
    access,
    anchorCase,
    summary: {
      suites: suites.length,
      stages: suites.reduce((total, item) => total + item.steps.length, 0),
      sourceRecords: uniqueRecordCount(suites),
      modulesCovered: moduleSet.size,
      sourceBackedSuites: suites.filter((item) => item.sourceBacked).length,
      commandDrafts: commandQueue.summary.total,
      applyBlockedCommands: commandQueue.summary.applyBlocked,
      blockedStages: suites.reduce((total, item) => total + item.blockedStages, 0),
      blockedRooms: rooms.summary.blockedRooms,
      missingSourceRecords: sync.summary.missingRecords,
    },
    suites,
    moduleCoverage: sync.modules.map((module) => ({
      moduleKey: module.moduleKey,
      label: module.label,
      sourceMaps: module.sourceMaps,
      missingRecords: module.missingRecords,
      localityConfidence: module.localityConfidence,
      nextAction: module.nextAction,
    })),
    boundaries: boundaries(),
    queryStatus: "schema_ready",
  };
}
