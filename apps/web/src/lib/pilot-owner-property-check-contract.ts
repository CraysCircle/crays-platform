import type { RoleKey } from "./roles";

const internalOwnerPropertyRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "expansion-manager", "deal-manager", "finance"];
const scopedOwnerPropertyRoles: RoleKey[] = ["landlord"];

type OwnerPropertyCheckAccessLevel = "internal_owner_property_control" | "owner_scoped_property_shell" | "forbidden";

export type OwnerPropertyCheckAccess = {
  allowed: boolean;
  level: OwnerPropertyCheckAccessLevel;
  reason: string;
};

export type OwnerPropertyCheckBoundary = {
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

export type OwnerPropertyCheckPilotRecord = {
  caseId: string;
  propertyId: string;
  title: string;
  city: string | null;
  country: string | null;
  propertyStatus: string;
  caseStatus: string;
  currentPhase: string;
  handoffStatus: string;
  latestEventAt: string | null;
  eventCount: number;
  counts: {
    locationAnalyses: number;
    reviewedLocationAnalyses: number;
    evidencePackages: number;
    documentLinks: number;
    approvedDocumentLinks: number;
    workflowEvents: number;
  };
  gates: Array<{
    key: string;
    label: string;
    status: "ready" | "pending" | "blocked";
    current: string;
    requiredFor: string;
  }>;
  nextBestRoleAction: string;
};

export type OwnerPropertyCheckPilotReadiness = {
  status: "ready" | "forbidden";
  role: RoleKey;
  access: OwnerPropertyCheckAccess;
  blockRange: "Blocks 611-620";
  journeySegment: "Property Owner Fit -> Property Supply";
  ownerRole: "expansion-manager";
  consumingRoles: RoleKey[];
  summary: {
    propertyCases: number;
    handoffReady: number;
    locationAnalyses: number;
    reviewedLocationAnalyses: number;
    evidencePackages: number;
    documentLinks: number;
    approvedDocumentLinks: number;
    workflowEvents: number;
    visibleSurfaces: number;
    preservedFunctions: number;
    commandModels: number;
    applyReady: 0;
    openSideEffectGates: 0;
    realCoreRecordsReturned: boolean;
  };
  records: OwnerPropertyCheckPilotRecord[];
  ownerEntryModes: Array<{
    key: string;
    label: string;
    state: "visible" | "blocked_until_exact_gate";
    owner: RoleKey;
    description: string;
  }>;
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
    gate: "draft_only" | "blocked_until_exact_gate";
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
  boundaries: OwnerPropertyCheckBoundary;
  liveBusinessRecordsReturned: boolean;
  commandRecordsWritten: false;
};

export function ownerPropertyCheckAccessForRole(role: RoleKey): OwnerPropertyCheckAccess {
  if (internalOwnerPropertyRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_owner_property_control",
      reason: "Role can review owner property fit, property supply, readiness gates and handoff state from CRAYS Core Dev/Pilot records.",
    };
  }

  if (scopedOwnerPropertyRoles.includes(role)) {
    return {
      allowed: true,
      level: "owner_scoped_property_shell",
      reason: "Role can see the owner-facing property-check shell without unreleased private review records.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Owner property-check pilot access requires internal property workflow scope or owner-scoped property access.",
  };
}

export function ownerPropertyCheckBoundary(): OwnerPropertyCheckBoundary {
  return {
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
  };
}

function ownerEntryModes(): OwnerPropertyCheckPilotReadiness["ownerEntryModes"] {
  return [
    {
      key: "internal-manual-check",
      label: "Internal manual property check",
      state: "visible",
      owner: "expansion-manager",
      description: "Expansion can review the real Core property case, status, events, evidence and handoff readiness.",
    },
    {
      key: "owner-digital-shell",
      label: "Owner digital handoff shell",
      state: "blocked_until_exact_gate",
      owner: "landlord",
      description: "Owner-facing data entry and uploads stay closed until one exact submission gate is opened.",
    },
    {
      key: "property-feed-normalization",
      label: "Property feed normalization",
      state: "blocked_until_exact_gate",
      owner: "expansion-manager",
      description: "External or imported property feed apply remains gated; Core review can still display normalized state.",
    },
  ];
}

function visibleSurfaces(): OwnerPropertyCheckPilotReadiness["visibleSurfaces"] {
  return [
    {
      surface: "CRM",
      roleUse: "Expansion and Deal Managers review owner, company, property-case and activity context.",
      dataSource: "Property-case and analysis readiness read models.",
    },
    {
      surface: "Real Estate",
      roleUse: "Owner-facing public and scoped portal journey explains fit, rent potential and handoff gates.",
      dataSource: "Owner property-check contract and reviewed Core shell.",
    },
    {
      surface: "Files",
      roleUse: "Document package links show readiness and approval state without uploads.",
      dataSource: "Document package link counts.",
    },
    {
      surface: "Analytics",
      roleUse: "Location evidence, rent sensitivity and KPI signals feed the next economics block.",
      dataSource: "Location analysis and benchmark KPI read models.",
    },
    {
      surface: "Settings",
      roleUse: "Admin and reviewers inspect the block contract, gates and QA evidence.",
      dataSource: "Pilot readiness contract.",
    },
  ];
}

function preservedFunctions(): OwnerPropertyCheckPilotReadiness["preservedFunctions"] {
  return [
    { key: "property-intake", label: "Property intake and qualification queue", state: "represented" },
    { key: "owner-company-person-context", label: "Owner, company and person context through shared Core records", state: "represented" },
    { key: "activity-timeline", label: "Workflow events, notes, tasks and status changes", state: "represented" },
    { key: "document-evidence-state", label: "Document links, evidence package and review state", state: "represented" },
    { key: "owner-submission", label: "Owner data submission and file upload", state: "deferred_until_exact_gate" },
    { key: "external-source-enrichment", label: "External property enrichment or live source reads", state: "deferred_until_exact_gate" },
  ];
}

function commandModelRoadmap(): OwnerPropertyCheckPilotReadiness["commandModelRoadmap"] {
  return [
    { commandType: "property_check_note", firstSurface: "CRM", gate: "draft_only" },
    { commandType: "property_check_task", firstSurface: "CRM", gate: "draft_only" },
    { commandType: "owner_submission_request", firstSurface: "Real Estate", gate: "blocked_until_exact_gate" },
    { commandType: "document_review_request", firstSurface: "Files", gate: "blocked_until_exact_gate" },
  ];
}

function gates(): OwnerPropertyCheckPilotReadiness["gates"] {
  return [
    { key: "core-read", label: "Core Dev/Pilot read models", state: "read_only" },
    { key: "core-command-draft", label: "Core command draft model", state: "core_draft_only" },
    { key: "owner-submission-write", label: "Owner submission writes", state: "closed" },
    { key: "owner-upload", label: "Owner uploads", state: "closed" },
    { key: "live-enrichment", label: "Live enrichment reads", state: "closed" },
    { key: "candidate-release", label: "Candidate/Public release", state: "closed" },
    { key: "bank-package", label: "Bank package creation", state: "closed" },
  ];
}

function nextBlockInputs(): OwnerPropertyCheckPilotReadiness["nextBlockInputs"] {
  return [
    {
      blockRange: "621-630",
      requiredInput: "Use the same property case to connect Location Intelligence, Rent Potential and Deal Economics from Core records and benchmark KPIs.",
    },
    {
      blockRange: "631-640",
      requiredInput: "Feed the reviewed property case and evidence counts into prepared deal assembly without Candidate/Public release.",
    },
  ];
}

export function emptyOwnerPropertyCheckReadiness(role: RoleKey): OwnerPropertyCheckPilotReadiness {
  const access = ownerPropertyCheckAccessForRole(role);
  const surfaceList = access.allowed ? visibleSurfaces() : [];
  const functionList = access.allowed ? preservedFunctions() : [];
  const commandList = access.allowed ? commandModelRoadmap() : [];

  return {
    status: access.allowed ? "ready" : "forbidden",
    role,
    access,
    blockRange: "Blocks 611-620",
    journeySegment: "Property Owner Fit -> Property Supply",
    ownerRole: "expansion-manager",
    consumingRoles: ["deal-manager", "finance", "reviewer", "landlord", "crays-management"],
    summary: {
      propertyCases: 0,
      handoffReady: 0,
      locationAnalyses: 0,
      reviewedLocationAnalyses: 0,
      evidencePackages: 0,
      documentLinks: 0,
      approvedDocumentLinks: 0,
      workflowEvents: 0,
      visibleSurfaces: surfaceList.length,
      preservedFunctions: functionList.length,
      commandModels: commandList.length,
      applyReady: 0,
      openSideEffectGates: 0,
      realCoreRecordsReturned: false,
    },
    records: [],
    ownerEntryModes: access.allowed ? ownerEntryModes() : [],
    visibleSurfaces: surfaceList,
    preservedFunctions: functionList,
    commandModelRoadmap: commandList,
    gates: access.allowed ? gates() : [],
    nextBlockInputs: access.allowed ? nextBlockInputs() : [],
    boundaries: ownerPropertyCheckBoundary(),
    liveBusinessRecordsReturned: false,
    commandRecordsWritten: false,
  };
}

export function buildOwnerPropertyCheckReadiness(
  role: RoleKey,
  records: OwnerPropertyCheckPilotRecord[],
): OwnerPropertyCheckPilotReadiness {
  const base = emptyOwnerPropertyCheckReadiness(role);
  const handoffReady = records.filter((record) => record.caseStatus === "handoff_ready" && record.handoffStatus === "ready").length;

  return {
    ...base,
    records,
    summary: {
      ...base.summary,
      propertyCases: records.length,
      handoffReady,
      locationAnalyses: records.reduce((total, record) => total + record.counts.locationAnalyses, 0),
      reviewedLocationAnalyses: records.reduce((total, record) => total + record.counts.reviewedLocationAnalyses, 0),
      evidencePackages: records.reduce((total, record) => total + record.counts.evidencePackages, 0),
      documentLinks: records.reduce((total, record) => total + record.counts.documentLinks, 0),
      approvedDocumentLinks: records.reduce((total, record) => total + record.counts.approvedDocumentLinks, 0),
      workflowEvents: records.reduce((total, record) => total + record.counts.workflowEvents, 0),
      realCoreRecordsReturned: records.length > 0,
    },
    liveBusinessRecordsReturned: records.length > 0,
  };
}
