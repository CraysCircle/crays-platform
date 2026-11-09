import type { RoleKey } from "./roles";

const internalLocationEconomicsRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "expansion-manager", "deal-manager", "finance"];
const scopedLocationEconomicsRoles: RoleKey[] = ["landlord"];

type LocationRentEconomicsAccessLevel = "internal_location_economics_control" | "owner_scoped_economics_shell" | "forbidden";

export type LocationRentEconomicsAccess = {
  allowed: boolean;
  level: LocationRentEconomicsAccessLevel;
  reason: string;
};

export type LocationRentEconomicsBoundary = {
  coreDevPilotDataAllowed: true;
  benchmarkKpiReadsEnabled: true;
  coreReadModelsEnabled: true;
  coreCommandModelsEnabled: true;
  commandApplyEnabled: false;
  liveExternalReadsEnabled: false;
  sourceWritesEnabled: false;
  syncWritesEnabled: false;
  toolApplyEnabled: false;
  uploadsEnabled: false;
  ownerSubmissionWritesEnabled: false;
  externalSendingEnabled: false;
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

export type LocationRentEconomicsBenchmark = {
  seedBatchId: string;
  preparedDeals: number;
  propertyChecks: number;
  locationReadyProperties: number;
  rentReadyProperties: number;
  economicsReadyDeals: number;
  rentPotentialModels: number;
  dealEconomicsModels: number;
  cleanupAvailable: boolean;
};

export type LocationRentEconomicsReviewLane = {
  key: string;
  label: string;
  status: "ready" | "pending" | "blocked";
  current: string;
  requiredFor: string;
};

export type LocationRentEconomicsPilotRecord = {
  caseId: string;
  propertyId: string;
  preparedOfferId: string | null;
  title: string;
  offerTitle: string | null;
  market: string | null;
  city: string | null;
  country: string | null;
  propertyStatus: string;
  caseStatus: string;
  currentPhase: string;
  handoffStatus: string;
  offerStatus: string | null;
  candidateReleaseState: string | null;
  publicTeaserEnabled: boolean;
  partnerHandoffStatus: string | null;
  latestLocationStatus: string | null;
  locationScore: number | null;
  latestEventAt: string | null;
  counts: {
    preparedOffers: number;
    locationAnalyses: number;
    reviewedLocationAnalyses: number;
    rentPotentialModels: number;
    dealEconomicsModels: number;
    financialModels: number;
    evidencePackages: number;
    documentLinks: number;
    approvedDocumentLinks: number;
    workflowEvents: number;
  };
  reviewLanes: LocationRentEconomicsReviewLane[];
  nextBestRoleAction: string;
};

export type LocationRentEconomicsPilotReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: LocationRentEconomicsAccess;
  blockRange: "Blocks 621-630";
  journeySegment: "Location Evidence -> Deal Economics";
  ownerRoles: RoleKey[];
  consumingRoles: RoleKey[];
  summary: {
    pilotCases: number;
    preparedOffers: number;
    locationAnalyses: number;
    reviewedLocationAnalyses: number;
    rentPotentialModels: number;
    dealEconomicsModels: number;
    financialModels: number;
    benchmarkPreparedDeals: number;
    benchmarkPropertyChecks: number;
    benchmarkLocationReadyProperties: number;
    benchmarkRentReadyProperties: number;
    benchmarkEconomicsReadyDeals: number;
    benchmarkRentPotentialModels: number;
    benchmarkDealEconomicsModels: number;
    visibleSurfaces: number;
    preservedFunctions: number;
    commandModels: number;
    applyReady: 0;
    openSideEffectGates: 0;
    realCoreRecordsReturned: boolean;
    benchmarkKpisReturned: boolean;
  };
  benchmark: LocationRentEconomicsBenchmark;
  records: LocationRentEconomicsPilotRecord[];
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
  boundaries: LocationRentEconomicsBoundary;
  liveBusinessRecordsReturned: boolean;
  financeWritesPerformed: false;
  commandRecordsWritten: false;
};

export function locationRentEconomicsAccessForRole(role: RoleKey): LocationRentEconomicsAccess {
  if (internalLocationEconomicsRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_location_economics_control",
      reason: "Role can review location evidence, rent potential, benchmark KPIs and deal economics from CRAYS Core Dev/Pilot records.",
    };
  }

  if (scopedLocationEconomicsRoles.includes(role)) {
    return {
      allowed: true,
      level: "owner_scoped_economics_shell",
      reason: "Role can see the owner-facing economics shell without unreleased private model records.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Location, rent and economics pilot access requires internal review scope or owner-scoped property access.",
  };
}

export function locationRentEconomicsBoundary(): LocationRentEconomicsBoundary {
  return {
    coreDevPilotDataAllowed: true,
    benchmarkKpiReadsEnabled: true,
    coreReadModelsEnabled: true,
    coreCommandModelsEnabled: true,
    commandApplyEnabled: false,
    liveExternalReadsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    uploadsEnabled: false,
    ownerSubmissionWritesEnabled: false,
    externalSendingEnabled: false,
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

function emptyBenchmark(): LocationRentEconomicsBenchmark {
  return {
    seedBatchId: "crays-benchmark-20260710-v1",
    preparedDeals: 0,
    propertyChecks: 0,
    locationReadyProperties: 0,
    rentReadyProperties: 0,
    economicsReadyDeals: 0,
    rentPotentialModels: 0,
    dealEconomicsModels: 0,
    cleanupAvailable: false,
  };
}

function visibleSurfaces(): LocationRentEconomicsPilotReadiness["visibleSurfaces"] {
  return [
    {
      surface: "Analytics",
      roleUse: "Review location score, rent readiness, economics readiness, benchmark KPIs and blockers.",
      dataSource: "Location, rent potential, deal economics and benchmark read models.",
    },
    {
      surface: "ERP",
      roleUse: "Finance reviews assumptions, budget inputs and finance blockers without executing writes.",
      dataSource: "Deal economics and financial-model readiness counts.",
    },
    {
      surface: "CRM",
      roleUse: "Expansion and Deal Managers keep property, owner, prepared offer and activity context together.",
      dataSource: "Property case, prepared offer and workflow event read models.",
    },
    {
      surface: "Files",
      roleUse: "Evidence and document links remain attached to the same property and deal package.",
      dataSource: "Evidence package and document link counts.",
    },
    {
      surface: "Settings",
      roleUse: "Admin and reviewers inspect gates, role scope and QA evidence for the pilot slice.",
      dataSource: "Pilot workflow readiness contract.",
    },
  ];
}

function preservedFunctions(): LocationRentEconomicsPilotReadiness["preservedFunctions"] {
  return [
    { key: "location-score-review", label: "Location score and catchment evidence review", state: "represented" },
    { key: "rent-range-sensitivity", label: "Rent range, sensitivity and market context review", state: "represented" },
    { key: "deal-economics-scenarios", label: "Deal economics scenarios and prepared deal score", state: "represented" },
    { key: "finance-assumption-review", label: "Finance assumption review before package assembly", state: "represented" },
    { key: "live-location-refresh", label: "Live location refresh and external enrichment", state: "deferred_until_exact_gate" },
    { key: "finance-execution", label: "Finance writes, accounting export, bank send and payments", state: "deferred_until_exact_gate" },
  ];
}

function commandModelRoadmap(): LocationRentEconomicsPilotReadiness["commandModelRoadmap"] {
  return [
    { commandType: "location_review_note", firstSurface: "Analytics", gate: "core_draft_only" },
    { commandType: "rent_assumption_review", firstSurface: "Analytics", gate: "core_draft_only" },
    { commandType: "deal_economics_review_task", firstSurface: "ERP", gate: "core_draft_only" },
    { commandType: "finance_assumption_apply", firstSurface: "ERP", gate: "blocked_until_exact_gate" },
  ];
}

function gates(): LocationRentEconomicsPilotReadiness["gates"] {
  return [
    { key: "core-read", label: "Core Dev/Pilot read models", state: "read_only" },
    { key: "benchmark-read", label: "Benchmark KPI reads", state: "read_only" },
    { key: "core-command-draft", label: "Core command draft model", state: "core_draft_only" },
    { key: "live-external-read", label: "Live external reads", state: "closed" },
    { key: "finance-write", label: "Finance writes and accounting export", state: "closed" },
    { key: "candidate-bank-release", label: "Candidate/Public/Bank release", state: "closed" },
  ];
}

function nextBlockInputs(): LocationRentEconomicsPilotReadiness["nextBlockInputs"] {
  return [
    {
      blockRange: "631-640",
      requiredInput: "Assemble the reviewed property, evidence, economics, documents, Project and CRM signals into an internal prepared deal package.",
    },
    {
      blockRange: "641-650",
      requiredInput: "Keep Candidate Deal Room visibility release-gated until a prepared package is explicitly reviewed.",
    },
  ];
}

export function buildLocationRentEconomicsReviewLanes(
  record: Pick<LocationRentEconomicsPilotRecord, "counts" | "offerStatus" | "candidateReleaseState">,
  benchmark: LocationRentEconomicsBenchmark,
): LocationRentEconomicsReviewLane[] {
  const locationReady = record.counts.reviewedLocationAnalyses > 0;
  const rentReady = record.counts.rentPotentialModels > 0;
  const economicsReady = record.counts.dealEconomicsModels > 0;
  const financeReady = record.counts.financialModels > 0;
  const releaseClosed = record.candidateReleaseState === "not_released" || record.candidateReleaseState === null;

  return [
    {
      key: "location-evidence",
      label: "Location evidence",
      status: locationReady ? "ready" : record.counts.locationAnalyses > 0 ? "pending" : "blocked",
      current: `${record.counts.reviewedLocationAnalyses} reviewed of ${record.counts.locationAnalyses}`,
      requiredFor: "Rent potential and deal economics review",
    },
    {
      key: "rent-potential",
      label: "Rent potential",
      status: rentReady ? "ready" : benchmark.rentReadyProperties > 0 ? "pending" : "blocked",
      current: `${record.counts.rentPotentialModels} current-case models, ${benchmark.rentReadyProperties} benchmark-ready properties`,
      requiredFor: "Prepared deal economics",
    },
    {
      key: "deal-economics",
      label: "Deal economics",
      status: economicsReady ? "ready" : benchmark.economicsReadyDeals > 0 ? "pending" : "blocked",
      current: `${record.counts.dealEconomicsModels} current-case models, ${benchmark.economicsReadyDeals} benchmark-ready deals`,
      requiredFor: "Internal prepared package assembly",
    },
    {
      key: "finance-review",
      label: "Finance review",
      status: financeReady ? "ready" : record.offerStatus === "review" ? "pending" : "blocked",
      current: `${record.counts.financialModels} financial models, offer ${record.offerStatus ?? "none"}`,
      requiredFor: "Bank package readiness",
    },
    {
      key: "release-boundary",
      label: "Release boundary",
      status: releaseClosed ? "blocked" : "ready",
      current: releaseClosed ? "Candidate, Public and Bank release closed" : "Release state already changed",
      requiredFor: "Explicit future release decision",
    },
  ];
}

export function emptyLocationRentEconomicsReadiness(role: RoleKey): LocationRentEconomicsPilotReadiness {
  const access = locationRentEconomicsAccessForRole(role);
  const surfaceList = access.allowed ? visibleSurfaces() : [];
  const functionList = access.allowed ? preservedFunctions() : [];
  const commandList = access.allowed ? commandModelRoadmap() : [];

  return {
    status: access.allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 621-630",
    journeySegment: "Location Evidence -> Deal Economics",
    ownerRoles: ["expansion-manager", "finance"],
    consumingRoles: ["deal-manager", "reviewer", "crays-management", "landlord"],
    summary: {
      pilotCases: 0,
      preparedOffers: 0,
      locationAnalyses: 0,
      reviewedLocationAnalyses: 0,
      rentPotentialModels: 0,
      dealEconomicsModels: 0,
      financialModels: 0,
      benchmarkPreparedDeals: 0,
      benchmarkPropertyChecks: 0,
      benchmarkLocationReadyProperties: 0,
      benchmarkRentReadyProperties: 0,
      benchmarkEconomicsReadyDeals: 0,
      benchmarkRentPotentialModels: 0,
      benchmarkDealEconomicsModels: 0,
      visibleSurfaces: surfaceList.length,
      preservedFunctions: functionList.length,
      commandModels: commandList.length,
      applyReady: 0,
      openSideEffectGates: 0,
      realCoreRecordsReturned: false,
      benchmarkKpisReturned: false,
    },
    benchmark: emptyBenchmark(),
    records: [],
    visibleSurfaces: surfaceList,
    preservedFunctions: functionList,
    commandModelRoadmap: commandList,
    gates: access.allowed ? gates() : [],
    nextBlockInputs: access.allowed ? nextBlockInputs() : [],
    boundaries: locationRentEconomicsBoundary(),
    liveBusinessRecordsReturned: false,
    financeWritesPerformed: false,
    commandRecordsWritten: false,
  };
}

export function buildLocationRentEconomicsReadiness(
  role: RoleKey,
  records: LocationRentEconomicsPilotRecord[],
  benchmark: LocationRentEconomicsBenchmark,
): LocationRentEconomicsPilotReadiness {
  const base = emptyLocationRentEconomicsReadiness(role);
  const benchmarkKpisReturned = benchmark.preparedDeals > 0 || benchmark.rentPotentialModels > 0 || benchmark.dealEconomicsModels > 0;

  return {
    ...base,
    benchmark,
    records,
    summary: {
      ...base.summary,
      pilotCases: records.length,
      preparedOffers: records.reduce((total, record) => total + record.counts.preparedOffers, 0),
      locationAnalyses: records.reduce((total, record) => total + record.counts.locationAnalyses, 0),
      reviewedLocationAnalyses: records.reduce((total, record) => total + record.counts.reviewedLocationAnalyses, 0),
      rentPotentialModels: records.reduce((total, record) => total + record.counts.rentPotentialModels, 0),
      dealEconomicsModels: records.reduce((total, record) => total + record.counts.dealEconomicsModels, 0),
      financialModels: records.reduce((total, record) => total + record.counts.financialModels, 0),
      benchmarkPreparedDeals: benchmark.preparedDeals,
      benchmarkPropertyChecks: benchmark.propertyChecks,
      benchmarkLocationReadyProperties: benchmark.locationReadyProperties,
      benchmarkRentReadyProperties: benchmark.rentReadyProperties,
      benchmarkEconomicsReadyDeals: benchmark.economicsReadyDeals,
      benchmarkRentPotentialModels: benchmark.rentPotentialModels,
      benchmarkDealEconomicsModels: benchmark.dealEconomicsModels,
      realCoreRecordsReturned: records.length > 0,
      benchmarkKpisReturned,
    },
    liveBusinessRecordsReturned: records.length > 0,
  };
}
