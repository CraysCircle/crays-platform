import type { RoleKey } from "./roles";

const internalPreparedDealAssemblyRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance"];
const scopedPreparedDealAssemblyRoles: RoleKey[] = ["franchise-candidate"];

type PreparedDealAssemblyAccessLevel = "internal_prepared_deal_control" | "release_gated_candidate_shell" | "forbidden";

export type PreparedDealAssemblyAccess = {
  allowed: boolean;
  level: PreparedDealAssemblyAccessLevel;
  reason: string;
};

export type PreparedDealAssemblyBoundary = {
  coreDevPilotDataAllowed: true;
  benchmarkKpiReadsEnabled: true;
  coreReadModelsEnabled: true;
  coreCommandModelsEnabled: true;
  internalPackageReadModelEnabled: true;
  packageRecordWritesEnabled: false;
  commandApplyEnabled: false;
  liveExternalReadsEnabled: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  toolApplyEnabled: false;
  uploadsEnabled: false;
  ownerSubmissionWritesEnabled: false;
  externalSendingEnabled: false;
  candidateDealRoomEnabled: false;
  candidateReleaseEnabled: false;
  publicReleaseEnabled: false;
  ownerReleaseEnabled: false;
  bankReleaseEnabled: false;
  bankPackageCreationEnabled: false;
  bankSendEnabled: false;
  paymentInitiationEnabled: false;
  financeWritesEnabled: false;
  accountingExportEnabled: false;
  regulatedChecksStarted: false;
  liveAiCallsEnabled: false;
  productionDeployEnabled: false;
  vpsChangingWorkEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type PreparedDealAssemblyBenchmark = {
  seedBatchId: string;
  preparedDeals: number;
  propertyChecks: number;
  locationReadyProperties: number;
  rentReadyProperties: number;
  economicsReadyDeals: number;
  cleanupAvailable: boolean;
};

export type PreparedDealAssemblyLane = {
  key: string;
  label: string;
  status: "ready" | "pending" | "blocked";
  current: string;
  requiredFor: string;
};

export type PreparedDealAssemblyRecord = {
  caseId: string;
  propertyId: string;
  preparedOfferId: string | null;
  title: string;
  offerTitle: string | null;
  market: string | null;
  city: string | null;
  country: string | null;
  caseStatus: string;
  handoffStatus: string;
  offerStatus: string | null;
  candidateReleaseState: string | null;
  publicTeaserEnabled: boolean;
  partnerHandoffStatus: string | null;
  latestEventAt: string | null;
  counts: {
    locationAnalyses: number;
    reviewedLocationAnalyses: number;
    evidencePackages: number;
    releasableEvidencePackages: number;
    documentLinks: number;
    approvedDocumentLinks: number;
    rentPotentialModels: number;
    dealEconomicsModels: number;
    financialModels: number;
    workflowEvents: number;
    projectSignals: number;
    crmSignals: number;
    filesSignals: number;
    erpSignals: number;
    analyticsSignals: number;
    loansSignals: number;
    releaseGates: number;
    blockedReleaseGates: number;
  };
  assemblyLanes: PreparedDealAssemblyLane[];
  nextBestRoleAction: string;
};

export type PreparedDealAssemblyReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: PreparedDealAssemblyAccess;
  blockRange: "Blocks 631-640";
  journeySegment: "Deal Economics -> Candidate Intent";
  ownerRoles: RoleKey[];
  consumingRoles: RoleKey[];
  summary: {
    assemblyPackages: number;
    preparedOffers: number;
    evidencePackages: number;
    releasableEvidencePackages: number;
    documentLinks: number;
    approvedDocumentLinks: number;
    rentPotentialModels: number;
    dealEconomicsModels: number;
    financialModels: number;
    projectSignals: number;
    crmSignals: number;
    workflowEvents: number;
    benchmarkPreparedDeals: number;
    benchmarkRentReadyProperties: number;
    benchmarkEconomicsReadyDeals: number;
    visibleSurfaces: number;
    preservedFunctions: number;
    commandModels: number;
    applyReady: 0;
    openSideEffectGates: 0;
    realCoreRecordsReturned: boolean;
    benchmarkKpisReturned: boolean;
    candidateVisibleRecords: 0;
    bankVisibleRecords: 0;
  };
  benchmark: PreparedDealAssemblyBenchmark;
  records: PreparedDealAssemblyRecord[];
  visibleSurfaces: Array<{
    surface: string;
    roleUse: string;
    dataSource: string;
  }>;
  preservedFunctions: Array<{
    key: string;
    label: string;
    state: "represented" | "deferred_until_exact_gate";
  }>;
  commandModelRoadmap: Array<{
    commandType: string;
    firstSurface: string;
    gate: "core_draft_only" | "blocked_until_exact_gate";
  }>;
  gates: Array<{
    key: string;
    label: string;
    state: "closed" | "read_only" | "core_draft_only";
  }>;
  nextBlockInputs: Array<{
    blockRange: string;
    requiredInput: string;
  }>;
  boundaries: PreparedDealAssemblyBoundary;
  liveBusinessRecordsReturned: boolean;
  packageRecordsWritten: false;
  commandRecordsWritten: false;
};

export function preparedDealAssemblyAccessForRole(role: RoleKey): PreparedDealAssemblyAccess {
  if (internalPreparedDealAssemblyRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_prepared_deal_control",
      reason: "Role can assemble internal prepared deal context from CRAYS Core Dev/Pilot records before any candidate, public or bank release.",
    };
  }

  if (scopedPreparedDealAssemblyRoles.includes(role)) {
    return {
      allowed: true,
      level: "release_gated_candidate_shell",
      reason: "Role can see only the release-gated candidate shell; no internal prepared deal package records are returned.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Prepared Deal Assembly requires internal deal control scope or a release-gated candidate shell.",
  };
}

export function preparedDealAssemblyBoundary(): PreparedDealAssemblyBoundary {
  return {
    coreDevPilotDataAllowed: true,
    benchmarkKpiReadsEnabled: true,
    coreReadModelsEnabled: true,
    coreCommandModelsEnabled: true,
    internalPackageReadModelEnabled: true,
    packageRecordWritesEnabled: false,
    commandApplyEnabled: false,
    liveExternalReadsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    uploadsEnabled: false,
    ownerSubmissionWritesEnabled: false,
    externalSendingEnabled: false,
    candidateDealRoomEnabled: false,
    candidateReleaseEnabled: false,
    publicReleaseEnabled: false,
    ownerReleaseEnabled: false,
    bankReleaseEnabled: false,
    bankPackageCreationEnabled: false,
    bankSendEnabled: false,
    paymentInitiationEnabled: false,
    financeWritesEnabled: false,
    accountingExportEnabled: false,
    regulatedChecksStarted: false,
    liveAiCallsEnabled: false,
    productionDeployEnabled: false,
    vpsChangingWorkEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function emptyBenchmark(): PreparedDealAssemblyBenchmark {
  return {
    seedBatchId: "crays-benchmark-20260710-v1",
    preparedDeals: 0,
    propertyChecks: 0,
    locationReadyProperties: 0,
    rentReadyProperties: 0,
    economicsReadyDeals: 0,
    cleanupAvailable: false,
  };
}

function visibleSurfaces(): PreparedDealAssemblyReadiness["visibleSurfaces"] {
  return [
    {
      surface: "CRM",
      roleUse: "Deal Manager sees owner, candidate, prepared offer, activity and relationship context in one assembly queue.",
      dataSource: "Property case, prepared offer and workflow activity read models.",
    },
    {
      surface: "Files",
      roleUse: "Evidence, package sections, document approvals and release review stay attached to the same prepared deal.",
      dataSource: "Evidence package and document link read models.",
    },
    {
      surface: "Analytics",
      roleUse: "Location, rent, economics and benchmark KPI gaps are visible before release review.",
      dataSource: "Location, benchmark and economics readiness read models.",
    },
    {
      surface: "ERP",
      roleUse: "Finance sees assumptions and current financial-model gaps without executing accounting or finance writes.",
      dataSource: "Deal economics and financial-model readiness counts.",
    },
    {
      surface: "Project",
      roleUse: "Opening handoff signals and future work-item commands are prepared without applying to tool work items.",
      dataSource: "CRAYS Core mapping and command-model readiness.",
    },
    {
      surface: "Settings",
      roleUse: "Admin and reviewers inspect role scope, gates, QA and side-effect boundaries.",
      dataSource: "Pilot workflow readiness contract.",
    },
  ];
}

function preservedFunctions(): PreparedDealAssemblyReadiness["preservedFunctions"] {
  return [
    { key: "internal-package-checklist", label: "Internal prepared deal checklist and package readiness", state: "represented" },
    { key: "record-context", label: "Property, owner, prepared offer and activity context", state: "represented" },
    { key: "document-evidence-linkage", label: "Document, evidence and approval linkage", state: "represented" },
    { key: "project-handoff-signals", label: "Opening project handoff signals and task command intent", state: "represented" },
    { key: "finance-assumption-review", label: "Finance assumption and economics review state", state: "represented" },
    { key: "candidate-deal-room-release", label: "Candidate deal room and external package release", state: "deferred_until_exact_gate" },
    { key: "bank-package-release", label: "Bank package creation and lender release", state: "deferred_until_exact_gate" },
  ];
}

function commandModelRoadmap(): PreparedDealAssemblyReadiness["commandModelRoadmap"] {
  return [
    { commandType: "files.package.metadata_link", firstSurface: "Files", gate: "core_draft_only" },
    { commandType: "project.work_item.create_or_update", firstSurface: "Project", gate: "core_draft_only" },
    { commandType: "crm.activity.log_or_task", firstSurface: "CRM", gate: "core_draft_only" },
    { commandType: "erp.finance_summary.stage", firstSurface: "ERP", gate: "core_draft_only" },
    { commandType: "candidate_deal_room_release", firstSurface: "Sites", gate: "blocked_until_exact_gate" },
    { commandType: "bank_package_create_or_release", firstSurface: "Loans", gate: "blocked_until_exact_gate" },
  ];
}

function gates(): PreparedDealAssemblyReadiness["gates"] {
  return [
    { key: "core-read", label: "Core Dev/Pilot read models", state: "read_only" },
    { key: "benchmark-read", label: "Benchmark KPI reads", state: "read_only" },
    { key: "core-command-draft", label: "Core command draft model", state: "core_draft_only" },
    { key: "package-write", label: "Prepared package record writes", state: "closed" },
    { key: "candidate-release", label: "Candidate/Public release", state: "closed" },
    { key: "bank-release", label: "Bank package creation and release", state: "closed" },
    { key: "tool-apply", label: "Tool apply and sync writes", state: "closed" },
  ];
}

function nextBlockInputs(): PreparedDealAssemblyReadiness["nextBlockInputs"] {
  return [
    {
      blockRange: "641-650",
      requiredInput: "Candidate Deal Room must consume only reviewed and explicitly released package sections.",
    },
    {
      blockRange: "651-660",
      requiredInput: "Candidate questions, intent and checklist actions must become scoped CRAYS Core commands before any regulated checks.",
    },
  ];
}

export function buildPreparedDealAssemblyLanes(record: Pick<PreparedDealAssemblyRecord, "caseStatus" | "handoffStatus" | "offerStatus" | "candidateReleaseState" | "counts">): PreparedDealAssemblyLane[] {
  const propertyReady = record.caseStatus === "handoff_ready" && record.handoffStatus === "ready";
  const offerReady = record.offerStatus === "review" || record.offerStatus === "released" || record.offerStatus === "reserved";
  const evidenceReady = record.counts.evidencePackages > 0 && record.counts.approvedDocumentLinks > 0;
  const economicsPending = record.counts.rentPotentialModels === 0 || record.counts.dealEconomicsModels === 0 || record.counts.financialModels === 0;
  const toolSignalsReady = record.counts.projectSignals > 0 && record.counts.crmSignals > 0;
  const releaseClosed = record.candidateReleaseState === "not_released" || record.candidateReleaseState === null;

  return [
    {
      key: "property-offer-context",
      label: "Property and offer context",
      status: propertyReady && offerReady ? "ready" : "pending",
      current: `case ${record.caseStatus}, handoff ${record.handoffStatus}, offer ${record.offerStatus ?? "none"}`,
      requiredFor: "Internal prepared package assembly",
    },
    {
      key: "evidence-documents",
      label: "Evidence and documents",
      status: evidenceReady ? "ready" : "pending",
      current: `${record.counts.evidencePackages} evidence packages, ${record.counts.approvedDocumentLinks}/${record.counts.documentLinks} approved documents`,
      requiredFor: "Package review and release decision",
    },
    {
      key: "economics-finance",
      label: "Economics and finance",
      status: economicsPending ? "pending" : "ready",
      current: `${record.counts.rentPotentialModels} rent, ${record.counts.dealEconomicsModels} economics, ${record.counts.financialModels} financial models`,
      requiredFor: "Candidate and bank package readiness",
    },
    {
      key: "tool-signals",
      label: "Project and CRM signals",
      status: toolSignalsReady ? "ready" : "pending",
      current: `${record.counts.projectSignals} Project signals, ${record.counts.crmSignals} CRM signals`,
      requiredFor: "Opening handoff and deal activity continuity",
    },
    {
      key: "release-boundary",
      label: "Release boundary",
      status: releaseClosed ? "blocked" : "pending",
      current: releaseClosed ? "Candidate, Public and Bank release closed" : "Release review changed but still requires exact gate",
      requiredFor: "Candidate Deal Room and Bank Evidence Package",
    },
  ];
}

function nextBestRoleAction(record: PreparedDealAssemblyRecord) {
  const firstGap = record.assemblyLanes.find((lane) => lane.status !== "ready");

  if (!firstGap) {
    return "Prepare internal release review while keeping Candidate and Bank release closed.";
  }

  if (firstGap.key === "release-boundary") {
    return "Hold Candidate, Public and Bank release until an exact release gate is opened.";
  }

  return `Resolve ${firstGap.label.toLowerCase()} before release-facing work.`;
}

export function emptyPreparedDealAssemblyReadiness(role: RoleKey): PreparedDealAssemblyReadiness {
  const access = preparedDealAssemblyAccessForRole(role);
  const surfaceList = access.allowed ? visibleSurfaces() : [];
  const functionList = access.allowed ? preservedFunctions() : [];
  const commandList = access.allowed ? commandModelRoadmap() : [];

  return {
    status: access.allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 631-640",
    journeySegment: "Deal Economics -> Candidate Intent",
    ownerRoles: ["deal-manager"],
    consumingRoles: ["expansion-manager", "finance", "reviewer", "crays-management", "franchise-candidate"],
    summary: {
      assemblyPackages: 0,
      preparedOffers: 0,
      evidencePackages: 0,
      releasableEvidencePackages: 0,
      documentLinks: 0,
      approvedDocumentLinks: 0,
      rentPotentialModels: 0,
      dealEconomicsModels: 0,
      financialModels: 0,
      projectSignals: 0,
      crmSignals: 0,
      workflowEvents: 0,
      benchmarkPreparedDeals: 0,
      benchmarkRentReadyProperties: 0,
      benchmarkEconomicsReadyDeals: 0,
      visibleSurfaces: surfaceList.length,
      preservedFunctions: functionList.length,
      commandModels: commandList.length,
      applyReady: 0,
      openSideEffectGates: 0,
      realCoreRecordsReturned: false,
      benchmarkKpisReturned: false,
      candidateVisibleRecords: 0,
      bankVisibleRecords: 0,
    },
    benchmark: emptyBenchmark(),
    records: [],
    visibleSurfaces: surfaceList,
    preservedFunctions: functionList,
    commandModelRoadmap: commandList,
    gates: access.allowed ? gates() : [],
    nextBlockInputs: access.allowed ? nextBlockInputs() : [],
    boundaries: preparedDealAssemblyBoundary(),
    liveBusinessRecordsReturned: false,
    packageRecordsWritten: false,
    commandRecordsWritten: false,
  };
}

export function completePreparedDealAssemblyRecord(record: Omit<PreparedDealAssemblyRecord, "assemblyLanes" | "nextBestRoleAction">): PreparedDealAssemblyRecord {
  const draftRecord: PreparedDealAssemblyRecord = {
    ...record,
    assemblyLanes: [],
    nextBestRoleAction: "Review prepared deal assembly.",
  };
  const assemblyLanes = buildPreparedDealAssemblyLanes(draftRecord);

  return {
    ...draftRecord,
    assemblyLanes,
    nextBestRoleAction: nextBestRoleAction({ ...draftRecord, assemblyLanes }),
  };
}

export function buildPreparedDealAssemblyReadiness(
  role: RoleKey,
  records: PreparedDealAssemblyRecord[],
  benchmark: PreparedDealAssemblyBenchmark,
): PreparedDealAssemblyReadiness {
  const base = emptyPreparedDealAssemblyReadiness(role);
  const benchmarkKpisReturned = benchmark.preparedDeals > 0 || benchmark.rentReadyProperties > 0 || benchmark.economicsReadyDeals > 0;

  return {
    ...base,
    benchmark,
    records,
    summary: {
      ...base.summary,
      assemblyPackages: records.length,
      preparedOffers: records.filter((record) => record.preparedOfferId).length,
      evidencePackages: records.reduce((total, record) => total + record.counts.evidencePackages, 0),
      releasableEvidencePackages: records.reduce((total, record) => total + record.counts.releasableEvidencePackages, 0),
      documentLinks: records.reduce((total, record) => total + record.counts.documentLinks, 0),
      approvedDocumentLinks: records.reduce((total, record) => total + record.counts.approvedDocumentLinks, 0),
      rentPotentialModels: records.reduce((total, record) => total + record.counts.rentPotentialModels, 0),
      dealEconomicsModels: records.reduce((total, record) => total + record.counts.dealEconomicsModels, 0),
      financialModels: records.reduce((total, record) => total + record.counts.financialModels, 0),
      projectSignals: records.reduce((total, record) => total + record.counts.projectSignals, 0),
      crmSignals: records.reduce((total, record) => total + record.counts.crmSignals, 0),
      workflowEvents: records.reduce((total, record) => total + record.counts.workflowEvents, 0),
      benchmarkPreparedDeals: benchmark.preparedDeals,
      benchmarkRentReadyProperties: benchmark.rentReadyProperties,
      benchmarkEconomicsReadyDeals: benchmark.economicsReadyDeals,
      realCoreRecordsReturned: records.length > 0,
      benchmarkKpisReturned,
    },
    liveBusinessRecordsReturned: records.length > 0,
  };
}
