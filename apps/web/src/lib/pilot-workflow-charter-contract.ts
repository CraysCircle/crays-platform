import type { RoleKey } from "./roles";

const internalPilotRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "expansion-manager", "finance"];
const scopedPilotRoles: RoleKey[] = ["franchise-candidate", "bank-partner", "franchise-partner", "studio-manager", "landlord"];

type PilotWorkflowAccessLevel = "internal_pilot_workflow_control" | "scoped_pilot_workflow_shell" | "forbidden";

type PilotWorkflowAccess = {
  allowed: boolean;
  level: PilotWorkflowAccessLevel;
  reason: string;
};

type PilotWorkflowBoundary = {
  coreDevPilotDataAllowed: true;
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
  bankPackageCreationEnabled: false;
  bankSendEnabled: false;
  paymentInitiationEnabled: false;
  financeWritesEnabled: false;
  regulatedChecksStarted: false;
  productionDeployEnabled: false;
  vpsChangingWorkEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

export type PilotWorkflowPhase = {
  key: string;
  blockRange: string;
  label: string;
  ownerRole: RoleKey;
  consumingRoles: RoleKey[];
  coreObjects: string[];
  moduleSurfaces: string[];
  visibleOutcome: string;
  preservedFunction: string;
  gatePosture: string;
};

export type PilotWorkflowCharterContract = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: PilotWorkflowAccess;
  blockRange: "Blocks 601-610";
  sourceOfTruth: "docs/CRAYS_CONTROLLED_DEV_WRITE_MODELS_BLOCKS_501_600_2026_07_10.md";
  northStar: "Property Owner Fit -> Property Supply -> Location Evidence -> Deal Economics -> Candidate Intent -> Bank Package Readiness -> Opening Handoff";
  summary: {
    phases: number;
    owningRoles: number;
    moduleSurfaces: number;
    coreObjectFamilies: number;
    qaEvidenceItems: number;
    applyReady: 0;
    exactGateRequired: true;
  };
  phases: PilotWorkflowPhase[];
  roleMap: Array<{
    role: RoleKey;
    owns: string;
    consumes: string;
    visibilityRule: string;
  }>;
  qaEvidenceModel: Array<{
    key: string;
    label: string;
    requiredProof: string;
  }>;
  nextBlockInputs: Array<{
    blockRange: string;
    requiredInput: string;
    readinessState: "chartered" | "blocked_until_exact_gate";
  }>;
  boundaries: PilotWorkflowBoundary;
  liveBusinessRecordsReturned: false;
  commandRecordsWritten: false;
};

function accessForRole(role: RoleKey): PilotWorkflowAccess {
  if (internalPilotRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_pilot_workflow_control",
      reason: "Role can review the full pilot workflow charter, gate model and QA evidence requirements.",
    };
  }

  if (scopedPilotRoles.includes(role)) {
    return {
      allowed: true,
      level: "scoped_pilot_workflow_shell",
      reason: "Role can review the scoped pilot workflow shell without unreleased records or side effects.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Pilot workflow charter access requires internal pilot ownership or a scoped pilot audience role.",
  };
}

function phases(): PilotWorkflowPhase[] {
  return [
    {
      key: "pilot-charter",
      blockRange: "601-610",
      label: "Pilot Workflow Charter",
      ownerRole: "admin",
      consumingRoles: ["crays-management", "deal-manager", "expansion-manager", "finance", "reviewer"],
      coreObjects: ["pilot scope", "role gate matrix", "QA evidence model"],
      moduleSurfaces: ["Settings", "Dashboard", "Sync"],
      visibleOutcome: "One reviewed journey, record scope, gate map and QA model before workflow build.",
      preservedFunction: "Release planning, approval matrix and operational command center.",
      gatePosture: "No production or public release approval.",
    },
    {
      key: "owner-property-check",
      blockRange: "611-620",
      label: "Owner Property Check Flow",
      ownerRole: "expansion-manager",
      consumingRoles: ["deal-manager", "finance", "reviewer", "landlord"],
      coreObjects: ["property case", "owner profile", "property fit gates"],
      moduleSurfaces: ["CRM", "Real Estate", "Files", "Analytics"],
      visibleOutcome: "Owner or internal property check is traceable in CRAYS Core Dev/Pilot scope.",
      preservedFunction: "Property intake, qualification, notes, tasks, documents and review state.",
      gatePosture: "Owner submission writes and uploads remain closed without exact approval.",
    },
    {
      key: "location-rent-economics",
      blockRange: "621-630",
      label: "Location, Rent and Deal Economics",
      ownerRole: "finance",
      consumingRoles: ["expansion-manager", "deal-manager", "crays-management", "reviewer"],
      coreObjects: ["location evidence", "rent potential", "deal economics", "benchmark KPI"],
      moduleSurfaces: ["Analytics", "ERP", "CRM", "Files"],
      visibleOutcome: "Property, evidence, rent potential and deal economics are reviewed from Core records.",
      preservedFunction: "KPI scoring, finance assumptions, reports and evidence-linked analysis.",
      gatePosture: "Live external reads and finance writes remain closed.",
    },
    {
      key: "prepared-deal-assembly",
      blockRange: "631-640",
      label: "Prepared Deal Assembly",
      ownerRole: "deal-manager",
      consumingRoles: ["finance", "expansion-manager", "reviewer", "crays-management"],
      coreObjects: ["prepared offer", "evidence package", "document package", "project signal"],
      moduleSurfaces: ["CRM", "Files", "Project", "ERP", "Analytics"],
      visibleOutcome: "Internal package joins property, evidence, economics, files, project and CRM signals.",
      preservedFunction: "Package sections, approvals, record links, work items and review workflow.",
      gatePosture: "Candidate and public release remain closed.",
    },
    {
      key: "candidate-deal-room",
      blockRange: "641-650",
      label: "Candidate Deal Room Pilot",
      ownerRole: "deal-manager",
      consumingRoles: ["franchise-candidate", "reviewer", "finance"],
      coreObjects: ["candidate deal room", "released evidence shell", "candidate question thread"],
      moduleSurfaces: ["Candidate Portal", "CRM", "Files", "Chat"],
      visibleOutcome: "Candidate sees only release-gated package, evidence, economics, questions and status.",
      preservedFunction: "Deal room browsing, communication, files, timeline and intent context.",
      gatePosture: "Regulated checks and external sending remain closed.",
    },
    {
      key: "candidate-evidence-intent",
      blockRange: "651-660",
      label: "Candidate Evidence and Intent",
      ownerRole: "deal-manager",
      consumingRoles: ["franchise-candidate", "finance", "reviewer"],
      coreObjects: ["candidate intent", "candidate checklist", "communication event", "core command"],
      moduleSurfaces: ["Candidate Portal", "CRM", "Files", "Loans"],
      visibleOutcome: "Candidate questions, intent and checklist actions become controlled Core command intent.",
      preservedFunction: "Tasks, notes, activities, checklist state and intent workflow.",
      gatePosture: "Bank workflow start remains closed without exact approval.",
    },
    {
      key: "bank-evidence-package",
      blockRange: "661-670",
      label: "Bank Evidence / Financing Package",
      ownerRole: "finance",
      consumingRoles: ["bank-partner", "deal-manager", "reviewer"],
      coreObjects: ["bank package shell", "evidence classification", "loan checklist", "condition status"],
      moduleSurfaces: ["Loans", "Files", "ERP", "Bank Partner Portal"],
      visibleOutcome: "Bank Partner receives a release-gated pilot shell with evidence and checklist status.",
      preservedFunction: "Loan cases, conditions, covenants, package evidence and lender handoff readiness.",
      gatePosture: "Bank send, payment and lender release remain closed.",
    },
    {
      key: "opening-handoff",
      blockRange: "671-680",
      label: "Franchise Partner Opening Handoff",
      ownerRole: "franchise-partner",
      consumingRoles: ["deal-manager", "studio-manager", "finance", "reviewer"],
      coreObjects: ["opening project", "milestone", "document checklist", "contact map"],
      moduleSurfaces: ["Project", "Files", "Operations", "ERP", "Support"],
      visibleOutcome: "Approved internal candidate state feeds opening tasks, milestones, files and contacts.",
      preservedFunction: "Projects, boards, timelines, dependencies, files, contacts and support queues.",
      gatePosture: "Tool/source apply remains closed without exact approval.",
    },
    {
      key: "dashboards-audit",
      blockRange: "681-690",
      label: "Cross-role Dashboards and Audit",
      ownerRole: "crays-management",
      consumingRoles: ["deal-manager", "expansion-manager", "finance", "bank-partner", "franchise-candidate", "franchise-partner"],
      coreObjects: ["workflow event", "KPI snapshot", "audit event", "gate state"],
      moduleSurfaces: ["Dashboard", "Analytics", "CRM", "Project", "Loans"],
      visibleOutcome: "Every role sees one scoped Core truth through dashboards, events, KPIs and blockers.",
      preservedFunction: "Scorecards, reports, alerts, history, activity timelines and audit trails.",
      gatePosture: "Unreviewed visibility expansion remains closed.",
    },
    {
      key: "pilot-closeout",
      blockRange: "691-700",
      label: "Pilot Closeout / Release Decision",
      ownerRole: "reviewer",
      consumingRoles: ["admin", "crays-management", "deal-manager", "finance"],
      coreObjects: ["pilot evidence report", "QA result", "gate review", "release decision"],
      moduleSurfaces: ["Settings", "Analytics", "Dashboard", "Files"],
      visibleOutcome: "Full pilot evidence, QA, audit and gate review decide what can move toward beta.",
      preservedFunction: "Approval workflow, release checklist, audit package and management reporting.",
      gatePosture: "No automatic production approval.",
    },
  ];
}

function roleMap(): PilotWorkflowCharterContract["roleMap"] {
  return [
    {
      role: "expansion-manager",
      owns: "Owner property check, property supply and property-case review before deal attachment.",
      consumes: "Location evidence, rent potential, deal readiness and owner handoff status.",
      visibilityRule: "Owner and property data only within assigned property/deal scope.",
    },
    {
      role: "deal-manager",
      owns: "Prepared deal execution, Candidate communication, intent review and opening handoff coordination.",
      consumes: "Property, evidence, finance, files, CRM, Project and Candidate status.",
      visibilityRule: "Candidate and deal data only after role-scoped release gates.",
    },
    {
      role: "finance",
      owns: "Deal economics, bank package checklist, finance evidence and payout readiness inputs.",
      consumes: "Property, package, candidate gate, loan condition and KPI status.",
      visibilityRule: "Finance and bank package fields stay internal until explicit release.",
    },
    {
      role: "franchise-candidate",
      owns: "Own questions, own intent and own gated checklist acknowledgements.",
      consumes: "Only released deal room evidence and own status.",
      visibilityRule: "No bank, owner private or unreleased internal records.",
    },
    {
      role: "bank-partner",
      owns: "Released lender package review and condition feedback after approval gates.",
      consumes: "Only reviewed package, KYC/equity-ready state and lender-visible evidence.",
      visibilityRule: "No pre-KYC browsing or unreviewed candidate/deal data.",
    },
    {
      role: "franchise-partner",
      owns: "Own opening handoff tasks, milestones, documents and operating readiness.",
      consumes: "Only own approved studio/opening scope.",
      visibilityRule: "No cross-partner or unreleased candidate scope.",
    },
  ];
}

function qaEvidenceModel(): PilotWorkflowCharterContract["qaEvidenceModel"] {
  return [
    {
      key: "contract-route",
      label: "Contract route",
      requiredProof: "Readiness route returns role-scoped charter, boundaries and zero live records.",
    },
    {
      key: "settings-panel",
      label: "Settings visibility",
      requiredProof: "Settings/Data Sync shows Pilot Workflow charter with phase, role, gate and QA evidence state.",
    },
    {
      key: "contract-verifier",
      label: "Contract verifier",
      requiredProof: "Route is covered for internal, scoped and forbidden roles.",
    },
    {
      key: "localhost-smoke",
      label: "Localhost smoke",
      requiredProof: "Localhost renders the charter and preserves explicit role state after reload.",
    },
    {
      key: "gate-audit",
      label: "Gate audit",
      requiredProof: "All high-risk gates stay false until exact approval.",
    },
  ];
}

function nextBlockInputs(): PilotWorkflowCharterContract["nextBlockInputs"] {
  return [
    {
      blockRange: "611-620",
      requiredInput: "Property case scope, owner/internal entry mode, review roles and owner submission gate posture.",
      readinessState: "chartered",
    },
    {
      blockRange: "621-630",
      requiredInput: "Location evidence, rent potential, deal economics and benchmark KPI read-model requirements.",
      readinessState: "chartered",
    },
    {
      blockRange: "631-640",
      requiredInput: "Prepared package sections, evidence/doc/project/CRM signal map and release-state checks.",
      readinessState: "chartered",
    },
    {
      blockRange: "641-700",
      requiredInput: "Candidate, Bank, Partner, dashboard and closeout gates before external visibility expands.",
      readinessState: "blocked_until_exact_gate",
    },
  ];
}

const boundaries = (): PilotWorkflowBoundary => ({
  coreDevPilotDataAllowed: true,
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
  bankPackageCreationEnabled: false,
  bankSendEnabled: false,
  paymentInitiationEnabled: false,
  financeWritesEnabled: false,
  regulatedChecksStarted: false,
  productionDeployEnabled: false,
  vpsChangingWorkEnabled: false,
  secretsReturned: false,
  privateKeysReturned: false,
});

export function getPilotWorkflowCharterContract(role: RoleKey): PilotWorkflowCharterContract {
  const access = accessForRole(role);
  const phaseList = access.allowed ? phases() : [];
  const roleCount = new Set(phaseList.flatMap((phase) => [phase.ownerRole, ...phase.consumingRoles])).size;
  const moduleSurfaceCount = new Set(phaseList.flatMap((phase) => phase.moduleSurfaces)).size;
  const coreObjectCount = new Set(phaseList.flatMap((phase) => phase.coreObjects)).size;
  const qa = access.allowed ? qaEvidenceModel() : [];

  return {
    status: access.allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 601-610",
    sourceOfTruth: "docs/CRAYS_CONTROLLED_DEV_WRITE_MODELS_BLOCKS_501_600_2026_07_10.md",
    northStar: "Property Owner Fit -> Property Supply -> Location Evidence -> Deal Economics -> Candidate Intent -> Bank Package Readiness -> Opening Handoff",
    summary: {
      phases: phaseList.length,
      owningRoles: roleCount,
      moduleSurfaces: moduleSurfaceCount,
      coreObjectFamilies: coreObjectCount,
      qaEvidenceItems: qa.length,
      applyReady: 0,
      exactGateRequired: true,
    },
    phases: phaseList,
    roleMap: access.allowed ? roleMap() : [],
    qaEvidenceModel: qa,
    nextBlockInputs: access.allowed ? nextBlockInputs() : [],
    boundaries: boundaries(),
    liveBusinessRecordsReturned: false,
    commandRecordsWritten: false,
  };
}
