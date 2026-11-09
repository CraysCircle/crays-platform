import { getCrossToolObjectIdentityReadModel, type ObjectIdentityCluster } from "./cross-tool-object-identity-read-model-repository";
import { getProcessSuiteReadModel, type ProcessSuite, type ProcessSuiteStep } from "./process-suite-read-model-repository";
import { getSyncDataHealthReadModel } from "./sync-data-health-read-model-repository";
import type { RoleKey } from "@/lib/roles";

type SimulationAccessLevel = "simulation_control" | "scoped_simulation" | "forbidden";
type SimulationState = "ready" | "attention" | "blocked";

export type AzSimulationStep = {
  stepKey: string;
  label: string;
  moduleKey: string;
  moduleLabel: string;
  ownerRole: string;
  state: SimulationState;
  href: string;
  sourceRecordCount: number;
  commandDrafts: number;
  blocker: string;
  nextAction: string;
};

export type AzSimulation = {
  simulationKey: string;
  label: string;
  journeySegment: string;
  ownerRole: string;
  consumingRoles: string[];
  state: SimulationState;
  completionPercent: number;
  sharedCoreObject: {
    label: string;
    type: string;
    id: string;
    href: string;
  };
  sourceLinkCount: number;
  conflicts: number;
  timelineEvents: number;
  modules: string[];
  selectedRolePath: string[];
  runbookFocus: string;
  currentDecision: string;
  nextAction: string;
  steps: AzSimulationStep[];
  evidence: Array<{
    label: string;
    moduleKey: string;
    status: string;
    sourceFamily: string;
    nextAction: string;
  }>;
};

export type AzSimulationReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: SimulationAccessLevel;
    reason: string;
    canStageSimulationReview: boolean;
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
    simulations: number;
    steps: number;
    sourceRecords: number;
    modulesCovered: number;
    sharedCoreObjects: number;
    sourceLinks: number;
    timelineEvents: number;
    conflicts: number;
    commandDrafts: number;
    blockedSteps: number;
    dataHealthIssues: number;
  };
  simulations: AzSimulation[];
  controls: {
    modules: Array<{ key: string; label: string; rows: number }>;
    states: Array<{ key: string; label: string; rows: number }>;
    owners: Array<{ key: string; label: string; rows: number }>;
  };
  actions: {
    stageSimulationReviewAllowed: boolean;
    commandRoute: "/api/crays/core-command/sync-preview";
    confirmationHeader: "stage-sync-preview-command";
    applyGate: "OPEN_DEV_SYNC_APPLY";
  };
  boundaries: {
    coreReadsEnabled: true;
    sourceReadsEnabled: true;
    coreCommandDraftsEnabled: true;
    targetApplyEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    destructiveApplyEnabled: false;
    toolApplyEnabled: false;
    uploadsEnabled: false;
    privatePreviewEnabled: false;
    externalSendingEnabled: false;
    publicReleaseEnabled: false;
    candidateReleaseEnabled: false;
    bankActionsEnabled: false;
    paymentInitiationEnabled: false;
    financePostingEnabled: false;
    liveAiEnabled: false;
    productionDeployEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "not_configured" | "forbidden";
};

const fullAccessRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];
const scopedRoles: RoleKey[] = ["deal-manager", "expansion-manager", "finance", "studio-manager", "franchise-partner"];
const reviewDraftRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "finance", "studio-manager"];

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

function title(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function boundaries(): AzSimulationReadModel["boundaries"] {
  return {
    coreReadsEnabled: true,
    sourceReadsEnabled: true,
    coreCommandDraftsEnabled: true,
    targetApplyEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    destructiveApplyEnabled: false,
    toolApplyEnabled: false,
    uploadsEnabled: false,
    privatePreviewEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    candidateReleaseEnabled: false,
    bankActionsEnabled: false,
    paymentInitiationEnabled: false,
    financePostingEnabled: false,
    liveAiEnabled: false,
    productionDeployEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function accessForRole(role: RoleKey): AzSimulationReadModel["access"] {
  if (fullAccessRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "simulation_control",
      reason: "Role can run internal A-Z simulations across shared Core objects, source records, timelines and guarded review drafts.",
      canStageSimulationReview: reviewDraftRoles.includes(role),
    };
  }

  if (scopedRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "scoped_simulation",
      reason: "Role can inspect scoped simulation steps without external release, raw secrets, apply controls or unscoped records.",
      canStageSimulationReview: reviewDraftRoles.includes(role),
    };
  }

  return {
    role,
    allowed: false,
    level: "forbidden",
    reason: "A-Z simulations require an internal or scoped operating role.",
    canStageSimulationReview: false,
  };
}

function emptyReadModel(role: RoleKey, queryStatus: AzSimulationReadModel["queryStatus"]): AzSimulationReadModel {
  const access = accessForRole(role);
  return {
    access,
    anchorCase: {
      tenant: "CRAYS Golden Studio Tenant",
      preparedOffer: "No simulation anchor available",
      candidate: "No candidate anchor available",
      candidateOrganization: "No candidate organization available",
      property: "No property anchor available",
      owner: "No owner anchor available",
      bank: "No bank anchor available",
      studio: "No studio anchor available",
    },
    summary: {
      simulations: 0,
      steps: 0,
      sourceRecords: 0,
      modulesCovered: 0,
      sharedCoreObjects: 0,
      sourceLinks: 0,
      timelineEvents: 0,
      conflicts: 0,
      commandDrafts: 0,
      blockedSteps: 0,
      dataHealthIssues: 0,
    },
    simulations: [],
    controls: { modules: [], states: [], owners: [] },
    actions: {
      stageSimulationReviewAllowed: access.canStageSimulationReview,
      commandRoute: "/api/crays/core-command/sync-preview",
      confirmationHeader: "stage-sync-preview-command",
      applyGate: "OPEN_DEV_SYNC_APPLY",
    },
    boundaries: boundaries(),
    queryStatus,
  };
}

function selectSuite(suites: ProcessSuite[], key: string) {
  return suites.find((suite) => suite.suiteKey === key) ?? suites[0];
}

function selectCluster(clusters: ObjectIdentityCluster[], terms: string[], fallbackIndex = 0) {
  const match = clusters.find((cluster) => {
    const haystack = [cluster.label, cluster.objectType, cluster.primaryCoreId, ...cluster.modules, ...cluster.sourceSystems].join(" ").toLowerCase();
    return terms.some((term) => haystack.includes(term.toLowerCase()));
  });

  return match ?? clusters[fallbackIndex] ?? clusters[0];
}

function stepsFromSuite(steps: ProcessSuiteStep[], allowedModules: string[] | null): AzSimulationStep[] {
  return steps
    .filter((step) => !allowedModules || allowedModules.includes(step.moduleKey))
    .map((step) => ({
      stepKey: step.stepKey,
      label: step.label,
      moduleKey: step.moduleKey,
      moduleLabel: step.moduleLabel,
      ownerRole: step.ownerRole,
      state: step.state,
      href: step.href,
      sourceRecordCount: step.sourceRecordCount,
      commandDrafts: step.commandDrafts,
      blocker: step.blocker,
      nextAction: step.nextAction,
    }));
}

function evidenceFromSteps(steps: ProcessSuiteStep[], limit = 6): AzSimulation["evidence"] {
  return steps
    .flatMap((step) =>
      step.evidence.map((record) => ({
        label: record.label,
        moduleKey: record.moduleKey,
        status: record.status,
        sourceFamily: record.sourceFamily,
        nextAction: record.nextAction,
      })),
    )
    .slice(0, limit);
}

function stateFromSteps(steps: AzSimulationStep[]): SimulationState {
  if (steps.some((step) => step.state === "blocked")) return "blocked";
  if (steps.some((step) => step.state === "attention")) return "attention";
  return "ready";
}

function simulation(input: {
  simulationKey: string;
  label: string;
  journeySegment: string;
  ownerRole: string;
  consumingRoles: string[];
  selectedRolePath: string[];
  runbookFocus: string;
  currentDecision: string;
  sourceSuite: ProcessSuite;
  steps: AzSimulationStep[];
  sourceSteps: ProcessSuiteStep[];
  cluster: ObjectIdentityCluster;
}): AzSimulation {
  const modules = Array.from(new Set(input.steps.map((step) => step.moduleLabel)));
  const state = stateFromSteps(input.steps);
  const blockedSteps = input.steps.filter((step) => step.state === "blocked").length;
  const attentionSteps = input.steps.filter((step) => step.state === "attention").length;
  const totalSteps = input.steps.length || 1;
  const completionPercent = Math.round(((input.steps.length - blockedSteps + attentionSteps * 0.5) / totalSteps) * 100);
  const selectedStep = input.steps.find((step) => step.state === "blocked") ?? input.steps.find((step) => step.state === "attention") ?? input.steps[0];

  return {
    simulationKey: input.simulationKey,
    label: input.label,
    journeySegment: input.journeySegment,
    ownerRole: input.ownerRole,
    consumingRoles: input.consumingRoles,
    state,
    completionPercent,
    sharedCoreObject: {
      label: input.cluster.label,
      type: input.cluster.objectType,
      id: input.cluster.primaryCoreId,
      href: input.cluster.href,
    },
    sourceLinkCount: input.cluster.sourceLinkCount,
    conflicts: input.cluster.conflicts,
    timelineEvents: input.cluster.timeline.length,
    modules,
    selectedRolePath: input.selectedRolePath,
    runbookFocus: input.runbookFocus,
    currentDecision: input.currentDecision,
    nextAction: selectedStep?.nextAction ?? input.sourceSuite.nextAction,
    steps: input.steps,
    evidence: evidenceFromSteps(input.sourceSteps),
  };
}

function optionRows<T>(items: T[], selector: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, rows]) => ({ key, label: title(moduleLabels[key] ?? key), rows }));
}

function roleModules(role: RoleKey): string[] | null {
  if (["admin", "crays-management", "reviewer"].includes(role)) return null;
  if (role === "finance") return ["analytics", "erp", "files", "loans", "sync"];
  if (role === "deal-manager") return ["analytics", "crm", "files", "loans", "project", "sync"];
  if (role === "expansion-manager") return ["analytics", "crm", "files", "project", "sync"];
  if (role === "studio-manager") return ["analytics", "files", "hr", "learning", "operations", "project", "support", "sync"];
  if (role === "franchise-partner") return ["analytics", "communication", "erp", "learning", "operations"];
  return [];
}

export async function getAzSimulationReadModel(role: RoleKey): Promise<AzSimulationReadModel> {
  const access = accessForRole(role);
  if (!access.allowed) return emptyReadModel(role, "forbidden");

  const scopedIdentityRole = role === "franchise-partner" ? "studio-manager" : role;
  const [processSuites, identity, dataHealth] = await Promise.all([
    getProcessSuiteReadModel(role),
    getCrossToolObjectIdentityReadModel(scopedIdentityRole),
    getSyncDataHealthReadModel(role === "franchise-partner" ? "studio-manager" : role),
  ]);

  if (processSuites.queryStatus !== "schema_ready" || identity.queryStatus !== "schema_ready") {
    return emptyReadModel(role, processSuites.queryStatus === "forbidden" || identity.queryStatus === "forbidden" ? "forbidden" : "not_configured");
  }

  const allowedModules = roleModules(role);
  const candidateSuite = selectSuite(processSuites.suites, "candidate_to_bank_readiness");
  const openingSuite = selectSuite(processSuites.suites, "opening_handoff_to_studio_launch");
  const operationsSuite = selectSuite(processSuites.suites, "studio_operations_recovery");
  const dealCluster = selectCluster(identity.clusters, ["prepared franchise deal", "prepared-offer", "deal"], 0);
  const propertyCluster = selectCluster(identity.clusters, ["property", "lease", "property-case"], 1);
  const bankCluster = selectCluster(identity.clusters, ["bank", "loan", "package"], 2);
  const operationsCluster = selectCluster(identity.clusters, ["operations", "member", "studio"], 3);

  const simulations = [
    simulation({
      simulationKey: "franchise-deal",
      label: "Franchise deal A-Z simulation",
      journeySegment: "Property Owner Fit -> Location Evidence -> Deal Economics -> Candidate Intent",
      ownerRole: "Deal Manager",
      consumingRoles: ["Expansion Manager", "Finance", "Reviewer", "Franchise Candidate"],
      selectedRolePath: ["Deal Manager", "Expansion Manager", "Finance", "Reviewer"],
      runbookFocus: "Can the internal team move from intake to reviewed candidate-ready decision without breaking release gates?",
      currentDecision: candidateSuite.currentDecision,
      sourceSuite: candidateSuite,
      steps: stepsFromSuite(candidateSuite.steps.filter((step) => ["crm", "files", "analytics", "sync"].includes(step.moduleKey)), allowedModules),
      sourceSteps: candidateSuite.steps,
      cluster: dealCluster,
    }),
    simulation({
      simulationKey: "studio-opening",
      label: "Studio opening simulation",
      journeySegment: "Opening Handoff -> Lease/Permit -> Procurement -> Staffing -> Launch",
      ownerRole: "Expansion Manager",
      consumingRoles: ["Studio Manager", "Finance", "HR", "Franchise Partner"],
      selectedRolePath: ["Expansion Manager", "Finance", "HR", "Studio Manager", "Franchise Partner"],
      runbookFocus: "Can the opening project handoff surface every lease, budget, training and partner dependency with one shared object spine?",
      currentDecision: openingSuite.currentDecision,
      sourceSuite: openingSuite,
      steps: stepsFromSuite(openingSuite.steps, allowedModules),
      sourceSteps: openingSuite.steps,
      cluster: propertyCluster,
    }),
    simulation({
      simulationKey: "member-payment-recovery",
      label: "Member and payment recovery simulation",
      journeySegment: "Studio Operations -> Member Exception -> Payment Recovery -> Support Closeout",
      ownerRole: "Studio Manager",
      consumingRoles: ["Franchise Partner", "Finance", "Support", "Reviewer"],
      selectedRolePath: ["Studio Manager", "Support", "Finance", "Franchise Partner"],
      runbookFocus: "Can studio operations recover member/payment issues without exposing external sends, refunds or finance posting?",
      currentDecision: operationsSuite.currentDecision,
      sourceSuite: operationsSuite,
      steps: stepsFromSuite(operationsSuite.steps, allowedModules),
      sourceSteps: operationsSuite.steps,
      cluster: operationsCluster,
    }),
    simulation({
      simulationKey: "bank-package",
      label: "Bank package simulation",
      journeySegment: "Prepared Offer -> Evidence Package -> Financing Conditions -> Bank Preflight",
      ownerRole: "Finance",
      consumingRoles: ["Deal Manager", "Reviewer", "Bank Partner"],
      selectedRolePath: ["Finance", "Deal Manager", "Reviewer", "Bank Partner"],
      runbookFocus: "Can Finance prove package readiness and redactions while bank send, payment and lender release stay closed?",
      currentDecision: "Review bank package evidence, conditions and financing readiness before any lender-visible release gate.",
      sourceSuite: candidateSuite,
      steps: stepsFromSuite(candidateSuite.steps.filter((step) => ["files", "loans", "analytics", "sync"].includes(step.moduleKey)), allowedModules),
      sourceSteps: candidateSuite.steps,
      cluster: bankCluster,
    }),
    simulation({
      simulationKey: "real-estate-decision",
      label: "Real estate decision simulation",
      journeySegment: "Property Supply -> Owner Evidence -> Lease Dependency -> Opening Handoff",
      ownerRole: "Expansion Manager",
      consumingRoles: ["Deal Manager", "Reviewer", "Landlord", "Finance"],
      selectedRolePath: ["Expansion Manager", "Deal Manager", "Reviewer", "Finance"],
      runbookFocus: "Can property and owner decisions stay tied to the same Core object before any owner/candidate/partner release?",
      currentDecision: "Resolve owner and lease dependency blockers before external real-estate visibility is prepared.",
      sourceSuite: openingSuite,
      steps: stepsFromSuite(openingSuite.steps.filter((step) => ["project", "files", "erp", "sync"].includes(step.moduleKey)), allowedModules),
      sourceSteps: openingSuite.steps,
      cluster: propertyCluster,
    }),
  ].filter((item) => item.steps.length > 0);

  const modules = new Set(simulations.flatMap((item) => item.steps.map((step) => step.moduleKey)));
  const sharedCoreObjects = new Set(simulations.map((item) => item.sharedCoreObject.id));
  const sourceRecords = simulations.reduce((total, item) => total + item.steps.reduce((stepTotal, step) => stepTotal + step.sourceRecordCount, 0), 0);

  return {
    access,
    anchorCase: processSuites.anchorCase,
    summary: {
      simulations: simulations.length,
      steps: simulations.reduce((total, item) => total + item.steps.length, 0),
      sourceRecords,
      modulesCovered: modules.size,
      sharedCoreObjects: sharedCoreObjects.size,
      sourceLinks: simulations.reduce((total, item) => total + item.sourceLinkCount, 0),
      timelineEvents: simulations.reduce((total, item) => total + item.timelineEvents, 0),
      conflicts: simulations.reduce((total, item) => total + item.conflicts, 0),
      commandDrafts: simulations.reduce((total, item) => total + item.steps.reduce((stepTotal, step) => stepTotal + step.commandDrafts, 0), 0),
      blockedSteps: simulations.reduce((total, item) => total + item.steps.filter((step) => step.state === "blocked").length, 0),
      dataHealthIssues: dataHealth.summary.conflicts + dataHealth.summary.failedJobs + dataHealth.summary.blockedJobs + dataHealth.summary.staleRecords + dataHealth.summary.missingIdentity,
    },
    simulations,
    controls: {
      modules: optionRows(simulations.flatMap((item) => item.steps), (step) => step.moduleKey),
      states: optionRows(simulations, (item) => item.state),
      owners: optionRows(simulations, (item) => item.ownerRole),
    },
    actions: {
      stageSimulationReviewAllowed: access.canStageSimulationReview,
      commandRoute: "/api/crays/core-command/sync-preview",
      confirmationHeader: "stage-sync-preview-command",
      applyGate: "OPEN_DEV_SYNC_APPLY",
    },
    boundaries: boundaries(),
    queryStatus: "schema_ready",
  };
}
