import { getAdapterBidirectionalPolicyReadModel } from "./adapter-bidirectional-policy-read-model-repository";
import { getLocalhostAdapterCoverageReadModel } from "./localhost-adapter-coverage-read-model-repository";
import { getLocationRentEconomicsPilotReadiness } from "./pilot-location-rent-economics-repository";
import { getProcessSuiteReadModel } from "./process-suite-read-model-repository";
import { getResilienceRecoveryReadModel } from "./resilience-recovery-read-model-repository";
import { getStakeholderRoomControlReadModel } from "./stakeholder-room-control-read-model-repository";
import { getSyncPerformanceReadModel } from "./sync-performance-read-model-repository";
import type { RoleKey } from "@/lib/roles";

type AcceptanceAccessLevel = "pilot_acceptance" | "forbidden";
type AcceptanceState = "passed" | "attention" | "blocked";

export type PilotAcceptanceCriterion = {
  key: string;
  label: string;
  ownerRole: string;
  state: AcceptanceState;
  evidence: string;
  nextAction: string;
};

export type PilotAcceptanceReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AcceptanceAccessLevel;
    reason: string;
  };
  decision: {
    internalPilotDemoReady: boolean;
    externalReleaseReady: false;
    decisionLabel: string;
    releaseBlockers: string[];
  };
  locationIntelligence: {
    property: string;
    preparedOffer: string;
    market: string;
    reviewedLocationAnalyses: number;
    locationAnalyses: number;
    locationScore: number | null;
    rentPotentialModels: number;
    dealEconomicsModels: number;
    financialModels: number;
    benchmarkLocationReadyProperties: number;
    benchmarkRentReadyProperties: number;
    benchmarkEconomicsReadyDeals: number;
    nextAction: string;
  };
  summary: {
    criteria: number;
    passed: number;
    attention: number;
    blocked: number;
    sourceMaps: number;
    missingSourceRecords: number;
    processSuites: number;
    processStages: number;
    evidenceRecords: number;
    commandDrafts: number;
    rollbackAvailable: number;
    idempotencyCollisions: number;
    blockedRooms: number;
    sourceConflicts: number;
    openSideEffectGates: number;
    adapterSurfaces: number;
    integrationConnections: number;
    externalRecordMaps: number;
    syncJobs: number;
  };
  criteria: PilotAcceptanceCriterion[];
  routeProof: Array<{
    route: string;
    proof: string;
    state: AcceptanceState;
  }>;
  boundaries: {
    productionDeployEnabled: false;
    publicReleaseEnabled: false;
    candidateReleaseEnabled: false;
    ownerReleaseEnabled: false;
    bankReleaseEnabled: false;
    uploadsEnabled: false;
    externalSendingEnabled: false;
    bankActionsEnabled: false;
    paymentInitiationEnabled: false;
    financePostingEnabled: false;
    targetApplyEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    liveExternalReadsEnabled: false;
    liveAiEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "ready" | "forbidden";
};

const allowedRoles: RoleKey[] = [
  "admin",
  "crays-management",
  "reviewer",
  "deal-manager",
  "expansion-manager",
  "finance",
  "hr",
  "franchise-partner",
  "studio-manager",
];

function accessForRole(role: RoleKey): PilotAcceptanceReadModel["access"] {
  if (allowedRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "pilot_acceptance",
      reason: "Role can inspect final internal pilot acceptance, Location Intelligence readiness and closed release/apply boundaries.",
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "Pilot acceptance closeout requires Admin, Reviewer or CRAYS Management access.",
  };
}

function boundaries(): PilotAcceptanceReadModel["boundaries"] {
  return {
    productionDeployEnabled: false,
    publicReleaseEnabled: false,
    candidateReleaseEnabled: false,
    ownerReleaseEnabled: false,
    bankReleaseEnabled: false,
    uploadsEnabled: false,
    externalSendingEnabled: false,
    bankActionsEnabled: false,
    paymentInitiationEnabled: false,
    financePostingEnabled: false,
    targetApplyEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    liveExternalReadsEnabled: false,
    liveAiEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function criterion(input: PilotAcceptanceCriterion): PilotAcceptanceCriterion {
  return input;
}

function emptyReadModel(role: RoleKey): PilotAcceptanceReadModel {
  return {
    access: accessForRole(role),
    decision: {
      internalPilotDemoReady: false,
      externalReleaseReady: false,
      decisionLabel: "Forbidden",
      releaseBlockers: [],
    },
    locationIntelligence: {
      property: "Not visible",
      preparedOffer: "Not visible",
      market: "Not visible",
      reviewedLocationAnalyses: 0,
      locationAnalyses: 0,
      locationScore: null,
      rentPotentialModels: 0,
      dealEconomicsModels: 0,
      financialModels: 0,
      benchmarkLocationReadyProperties: 0,
      benchmarkRentReadyProperties: 0,
      benchmarkEconomicsReadyDeals: 0,
      nextAction: "Access required.",
    },
    summary: {
      criteria: 0,
      passed: 0,
      attention: 0,
      blocked: 0,
      sourceMaps: 0,
      missingSourceRecords: 0,
      processSuites: 0,
      processStages: 0,
      evidenceRecords: 0,
      commandDrafts: 0,
      rollbackAvailable: 0,
      idempotencyCollisions: 0,
      blockedRooms: 0,
      sourceConflicts: 0,
      openSideEffectGates: 0,
      adapterSurfaces: 0,
      integrationConnections: 0,
      externalRecordMaps: 0,
      syncJobs: 0,
    },
    criteria: [],
    routeProof: [],
    boundaries: boundaries(),
    queryStatus: "forbidden",
  };
}

export async function getPilotAcceptanceReadModel(role: RoleKey): Promise<PilotAcceptanceReadModel> {
  const access = accessForRole(role);
  if (!access.allowed) return emptyReadModel(role);

  // These read models fan out into their own Core queries. Keep the closeout
  // orchestration sequential so one dashboard request cannot exhaust the
  // deliberately small local database pool.
  const processSuites = await getProcessSuiteReadModel("crays-management");
  const recovery = await getResilienceRecoveryReadModel("admin");
  const location = await getLocationRentEconomicsPilotReadiness("expansion-manager");
  const sync = await getSyncPerformanceReadModel("admin");
  const adapterPolicy = await getAdapterBidirectionalPolicyReadModel("admin");
  const rooms = await getStakeholderRoomControlReadModel({ role: "reviewer" });
  const coverage = await getLocalhostAdapterCoverageReadModel("admin");

  const locationRecord = location.records[0];
  const locationHasReviewedEvidence = location.summary.reviewedLocationAnalyses > 0;
  const economicsIncomplete = location.summary.rentPotentialModels === 0 || location.summary.dealEconomicsModels === 0 || location.summary.financialModels === 0;
  const missingSourceRecords = sync.summary.missingRecords;
  const sideEffectsClosed =
    !adapterPolicy.boundaries.targetApplyEnabled &&
    !adapterPolicy.boundaries.sourceWritesEnabled &&
    !adapterPolicy.boundaries.syncApplyEnabled &&
    !adapterPolicy.boundaries.externalSendingEnabled &&
    recovery.summary.openSideEffectGates === 0;

  const criteria = [
    criterion({
      key: "golden-source-data",
      label: "Realistic synchronized test data",
      ownerRole: "Admin",
      state: missingSourceRecords === 0 && sync.summary.sourceMaps >= 309 ? "passed" : "blocked",
      evidence: `${sync.summary.sourceMaps} source maps, ${missingSourceRecords} missing records, ${coverage.coreSync.integrationConnections} integration connections.`,
      nextAction: missingSourceRecords === 0 ? "Keep Golden Tenant data as the demo baseline." : "Add missing realistic records before demo.",
    }),
    criterion({
      key: "process-suites",
      label: "A-Z process suite coverage",
      ownerRole: "CRAYS Management",
      state: processSuites.summary.sourceBackedSuites === processSuites.summary.suites && processSuites.summary.modulesCovered === 11 ? "passed" : "attention",
      evidence: `${processSuites.summary.suites} suites, ${processSuites.summary.stages} stages, ${processSuites.summary.sourceRecords} evidence records across ${processSuites.summary.modulesCovered} modules.`,
      nextAction: "Use process suites as the internal demo spine.",
    }),
    criterion({
      key: "command-recovery",
      label: "Command history, rollback and idempotency",
      ownerRole: "Reviewer",
      state: recovery.summary.idempotencyCollisions === 0 && recovery.summary.rollbackAvailable === recovery.summary.commandDrafts ? "passed" : "blocked",
      evidence: `${recovery.summary.commandDrafts} commands, ${recovery.summary.rollbackAvailable} rollback plans, ${recovery.summary.idempotencyCollisions} idempotency collisions.`,
      nextAction: "Keep Apply Queue review-only until exact approval exists.",
    }),
    criterion({
      key: "location-intelligence",
      label: "Location Intelligence evidence",
      ownerRole: "Expansion Manager",
      state: locationHasReviewedEvidence && !economicsIncomplete ? "passed" : locationHasReviewedEvidence ? "attention" : "blocked",
      evidence: `${location.summary.reviewedLocationAnalyses}/${location.summary.locationAnalyses} reviewed location analyses; ${location.summary.rentPotentialModels} rent models, ${location.summary.dealEconomicsModels} economics models, ${location.summary.financialModels} financial models.`,
      nextAction: locationRecord?.nextBestRoleAction ?? "Review location evidence and economics readiness.",
    }),
    criterion({
      key: "stakeholder-preflight",
      label: "Stakeholder release preflight",
      ownerRole: "Reviewer",
      state: rooms.summary.blockedRooms > 0 ? "blocked" : "passed",
      evidence: `${rooms.summary.rooms} rooms, ${rooms.summary.blockedRooms} blocked rooms, ${rooms.summary.redactions} redactions, ${rooms.summary.approvedDocuments}/${rooms.summary.documents} approved document metadata records.`,
      nextAction: rooms.summary.blockedRooms > 0 ? "Do not release external rooms; resolve redactions first." : "Keep room release gated until explicit approval.",
    }),
    criterion({
      key: "source-conflict-recovery",
      label: "Source conflict visibility",
      ownerRole: "Studio Manager",
      state: sync.summary.conflicts > 0 ? "attention" : "passed",
      evidence: `${sync.summary.conflicts} source-map conflicts surfaced; ${sync.summary.highConfidenceModules} high-confidence modules.`,
      nextAction: sync.summary.conflicts > 0 ? "Classify Member App conflicts before any sync-apply path is discussed." : "Use current source projection for first decisions.",
    }),
    criterion({
      key: "adapter-truth",
      label: "Verified adapter and Core sync status",
      ownerRole: "Admin",
      state: coverage.coreSync.externalRecordMaps >= 309 ? "passed" : "attention",
      evidence: `${coverage.summary.totalSurfaces} surfaces, ${coverage.coreSync.externalRecordMaps} external record maps, ${coverage.coreSync.syncJobs} sync jobs; ${coverage.summary.contractOnly} contract-only surfaces remain explicit.`,
      nextAction: "Do not claim every adapter is live; show verified live/Core/contract-only status.",
    }),
    criterion({
      key: "closed-gates",
      label: "Closed irreversible gates",
      ownerRole: "Admin",
      state: sideEffectsClosed ? "passed" : "blocked",
      evidence: `${recovery.summary.openSideEffectGates} open side-effect gates; target apply, source writes, sync apply and external sending closed.`,
      nextAction: "Require exact user approval for any future gated action.",
    }),
  ];

  const releaseBlockers = [
    rooms.summary.blockedRooms > 0 ? `${rooms.summary.blockedRooms} stakeholder rooms are still blocked.` : null,
    sync.summary.conflicts > 0 ? `${sync.summary.conflicts} source-map conflicts need classification.` : null,
    economicsIncomplete ? "Rent, deal economics and financial models are not complete for the current Location Intelligence pilot case." : null,
  ].filter((item): item is string => Boolean(item));

  const passed = criteria.filter((item) => item.state === "passed").length;
  const attention = criteria.filter((item) => item.state === "attention").length;
  const blocked = criteria.filter((item) => item.state === "blocked").length;
  const internalPilotDemoReady = passed >= 5 && missingSourceRecords === 0 && sideEffectsClosed;

  return {
    access,
    decision: {
      internalPilotDemoReady,
      externalReleaseReady: false,
      decisionLabel: internalPilotDemoReady ? "Internal pilot demo-ready; external release blocked" : "Internal pilot not ready",
      releaseBlockers,
    },
    locationIntelligence: {
      property: locationRecord?.title ?? "No visible location case",
      preparedOffer: locationRecord?.offerTitle ?? "No visible prepared offer",
      market: locationRecord?.market ?? "Market pending",
      reviewedLocationAnalyses: location.summary.reviewedLocationAnalyses,
      locationAnalyses: location.summary.locationAnalyses,
      locationScore: locationRecord?.locationScore ?? null,
      rentPotentialModels: location.summary.rentPotentialModels,
      dealEconomicsModels: location.summary.dealEconomicsModels,
      financialModels: location.summary.financialModels,
      benchmarkLocationReadyProperties: location.summary.benchmarkLocationReadyProperties,
      benchmarkRentReadyProperties: location.summary.benchmarkRentReadyProperties,
      benchmarkEconomicsReadyDeals: location.summary.benchmarkEconomicsReadyDeals,
      nextAction: locationRecord?.nextBestRoleAction ?? "Review location, rent and economics readiness.",
    },
    summary: {
      criteria: criteria.length,
      passed,
      attention,
      blocked,
      sourceMaps: sync.summary.sourceMaps,
      missingSourceRecords,
      processSuites: processSuites.summary.suites,
      processStages: processSuites.summary.stages,
      evidenceRecords: processSuites.summary.sourceRecords,
      commandDrafts: recovery.summary.commandDrafts,
      rollbackAvailable: recovery.summary.rollbackAvailable,
      idempotencyCollisions: recovery.summary.idempotencyCollisions,
      blockedRooms: rooms.summary.blockedRooms,
      sourceConflicts: sync.summary.conflicts,
      openSideEffectGates: recovery.summary.openSideEffectGates,
      adapterSurfaces: coverage.summary.totalSurfaces,
      integrationConnections: coverage.coreSync.integrationConnections,
      externalRecordMaps: coverage.coreSync.externalRecordMaps,
      syncJobs: coverage.coreSync.syncJobs,
    },
    criteria,
    routeProof: [
      { route: "/dashboard?role=crays-management&view=process-suites", proof: `${processSuites.summary.suites} source-backed process suites`, state: "passed" },
      { route: "/sync?role=admin", proof: `${sync.summary.sourceMaps} maps, ${recovery.summary.openSideEffectGates} open side-effect gates`, state: sync.summary.conflicts > 0 ? "attention" : "passed" },
      { route: "/dashboard?role=reviewer&view=rooms", proof: `${rooms.summary.blockedRooms} blocked stakeholder rooms`, state: rooms.summary.blockedRooms > 0 ? "blocked" : "passed" },
      { route: "/api/crays/pilot-workflow/location-rent-economics/readiness?role=expansion-manager", proof: `${location.summary.reviewedLocationAnalyses}/${location.summary.locationAnalyses} reviewed Location Intelligence analyses`, state: locationHasReviewedEvidence ? "attention" : "blocked" },
    ],
    boundaries: boundaries(),
    queryStatus: "ready",
  };
}
