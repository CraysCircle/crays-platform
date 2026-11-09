import {
  formatFranchisePartnerDecisionValue,
  getFranchisePartnerDecisionReadModel,
} from "./franchise-partner-decision-read-model-repository";
import {
  getFranchisePartnerPerformanceReadModel,
} from "./franchise-partner-performance-read-model-repository";
import { getBankPackageReadiness, type BankPackagePrerequisiteStatus } from "./bank-package-readiness-repository";
import { formatRealEstateDecisionValue, getRealEstateDecisionReadModel } from "./real-estate-decision-read-model-repository";
import type { RoleKey } from "@/lib/roles";

export type StakeholderPortalKey = "franchise-partner" | "bank-partner" | "landlord";
export type StakeholderPortalStatus = "ready" | "attention" | "blocked" | "gated" | "locked";
export type StakeholderPortalTab = "overview" | "work" | "documents" | "finance" | "messages";

export type StakeholderPortalAccessLevel =
  | "relationship_scope"
  | "internal_review_scope"
  | "stakeholder_account_required"
  | "relationship_forbidden";

export type StakeholderPortalMetric = {
  key: string;
  label: string;
  value: string | number;
  detail: string;
};

export type StakeholderPortalItem = {
  key: string;
  label: string;
  owner: string;
  status: StakeholderPortalStatus;
  current: string;
  nextAction: string;
  gate?: string;
  href?: string;
};

export type StakeholderPortalRecord = {
  key: string;
  label: string;
  family: string;
  status: StakeholderPortalStatus;
  owner: string;
  value: string;
  context: string;
  nextAction: string;
};

export type StakeholderPortalAction = {
  key: string;
  label: string;
  status: "available" | "gated" | "locked";
  reason: string;
  gate?: string;
  href?: string;
};

export type StakeholderPortalReadModel = {
  configured: true;
  portal: StakeholderPortalKey;
  role: RoleKey;
  label: string;
  eyebrow: string;
  basePath: string;
  access: {
    allowed: boolean;
    level: StakeholderPortalAccessLevel;
    reason: string;
    relationshipScoped: boolean;
    tenantScoped: boolean;
  };
  relationship: {
    title: string;
    partyName: string;
    partyType: string;
    companyName: string;
    siteName: string;
    address: string;
    journey: string;
  };
  summary: {
    records: number;
    tasks: number;
    documents: number;
    actions: number;
    blockers: number;
    attention: number;
    ready: number;
    freshnessMinutes: number | null;
  };
  metrics: StakeholderPortalMetric[];
  tasks: StakeholderPortalItem[];
  documents: StakeholderPortalItem[];
  finance: StakeholderPortalItem[];
  messages: StakeholderPortalItem[];
  records: StakeholderPortalRecord[];
  actions: StakeholderPortalAction[];
  sourceNotes: string[];
  boundaries: {
    relationshipScopeRequired: true;
    publicDtoOnly: true;
    internalFieldsReturned: false;
    privateStakeholderDataReturned: false;
    liveBankDataReturned: false;
    documentBodiesReturned: false;
    fileUploadEnabled: false;
    privatePreviewEnabled: false;
    providerCallsEnabled: false;
    externalSendingEnabled: false;
    partnerSendEnabled: false;
    bankSendEnabled: false;
    ownerSendEnabled: false;
    stakeholderReleaseEnabled: false;
    paymentInitiationEnabled: false;
    financePostingEnabled: false;
    leaseSigningEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
    nativeAdapterWritesEnabled: false;
  };
  queryStatus: "ready" | "account_required" | "forbidden";
};

const internalReviewRoles: RoleKey[] = ["admin", "crays-management", "reviewer"];

const portalConfig: Record<
  StakeholderPortalKey,
  {
    label: string;
    eyebrow: string;
    basePath: string;
    partyType: string;
    exactRoles: RoleKey[];
    reviewRoles: RoleKey[];
    forbiddenReason: string;
  }
> = {
  "franchise-partner": {
    label: "Franchise Partner Portal",
    eyebrow: "Partner workspace",
    basePath: "/franchise/partner",
    partyType: "Franchise partner",
    exactRoles: ["franchise-partner"],
    reviewRoles: ["deal-manager", "finance", "expansion-manager", ...internalReviewRoles],
    forbiddenReason: "Franchise Partner Portal requires a mapped partner relationship or internal review scope.",
  },
  "bank-partner": {
    label: "Bank Partner Portal",
    eyebrow: "Funding workspace",
    basePath: "/funding-partner-bank/portal",
    partyType: "Financing partner",
    exactRoles: ["bank-partner"],
    reviewRoles: ["finance", "deal-manager", ...internalReviewRoles],
    forbiddenReason: "Bank Partner Portal requires a mapped financing relationship or internal review scope.",
  },
  landlord: {
    label: "Landlord Portal",
    eyebrow: "Property owner workspace",
    basePath: "/real-estate/portal",
    partyType: "Property owner",
    exactRoles: ["landlord"],
    reviewRoles: ["expansion-manager", "deal-manager", ...internalReviewRoles],
    forbiddenReason: "Landlord Portal requires a mapped property-owner relationship or internal review scope.",
  },
};

export function parseStakeholderPortal(value: string | null | undefined): StakeholderPortalKey {
  if (value === "bank-partner") return "bank-partner";
  if (value === "landlord") return "landlord";
  return "franchise-partner";
}

function boundaries(): StakeholderPortalReadModel["boundaries"] {
  return {
    relationshipScopeRequired: true,
    publicDtoOnly: true,
    internalFieldsReturned: false,
    privateStakeholderDataReturned: false,
    liveBankDataReturned: false,
    documentBodiesReturned: false,
    fileUploadEnabled: false,
    privatePreviewEnabled: false,
    providerCallsEnabled: false,
    externalSendingEnabled: false,
    partnerSendEnabled: false,
    bankSendEnabled: false,
    ownerSendEnabled: false,
    stakeholderReleaseEnabled: false,
    paymentInitiationEnabled: false,
    financePostingEnabled: false,
    leaseSigningEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    targetApplyEnabled: false,
    nativeAdapterWritesEnabled: false,
  };
}

function accessFor(role: RoleKey, portal: StakeholderPortalKey): StakeholderPortalReadModel["access"] {
  const config = portalConfig[portal];
  if (config.exactRoles.includes(role)) {
    return {
      allowed: true,
      level: "relationship_scope",
      reason: `${config.label} is opened with the stakeholder relationship scope for ${role}.`,
      relationshipScoped: true,
      tenantScoped: true,
    };
  }
  if (config.reviewRoles.includes(role)) {
    return {
      allowed: true,
      level: "internal_review_scope",
      reason: `${role} can inspect the ${config.label} as an internal review scope without opening external effects.`,
      relationshipScoped: true,
      tenantScoped: true,
    };
  }
  if (role === "guest") {
    return {
      allowed: false,
      level: "stakeholder_account_required",
      reason: "Stakeholder Portal access requires a mapped CRAYS account and relationship scope.",
      relationshipScoped: false,
      tenantScoped: false,
    };
  }
  return {
    allowed: false,
    level: "relationship_forbidden",
    reason: config.forbiddenReason,
    relationshipScoped: false,
    tenantScoped: false,
  };
}

function emptyReadModel(role: RoleKey, portal: StakeholderPortalKey): StakeholderPortalReadModel {
  const config = portalConfig[portal];
  const access = accessFor(role, portal);
  const queryStatus = access.allowed ? "ready" : access.level === "stakeholder_account_required" ? "account_required" : "forbidden";
  return {
    configured: true,
    portal,
    role,
    label: config.label,
    eyebrow: config.eyebrow,
    basePath: config.basePath,
    access,
    relationship: {
      title: config.label,
      partyName: access.allowed ? config.label.replace(" Portal", "") : "Stakeholder account required",
      partyType: config.partyType,
      companyName: "Relationship scope required",
      siteName: "No scoped site selected",
      address: "No scoped address returned",
      journey: "Account mapping -> relationship scope -> reviewed data -> safe next action",
    },
    summary: { records: 0, tasks: 0, documents: 0, actions: 0, blockers: 0, attention: 0, ready: 0, freshnessMinutes: null },
    metrics: [],
    tasks: [],
    documents: [],
    finance: [],
    messages: [],
    records: [],
    actions: [],
    sourceNotes: ["Stakeholder Portal access is relationship-scoped.", "All external side-effect gates remain closed."],
    boundaries: boundaries(),
    queryStatus,
  };
}

function statusFrom(value: string): StakeholderPortalStatus {
  const normalized = value.toLowerCase();
  if (normalized.includes("blocked") || normalized.includes("critical") || normalized.includes("release_required")) return "blocked";
  if (normalized.includes("attention") || normalized.includes("review") || normalized.includes("pending") || normalized.includes("required")) return "attention";
  if (normalized.includes("gated")) return "gated";
  if (normalized.includes("locked")) return "locked";
  return "ready";
}

function statusFromBank(value: BankPackagePrerequisiteStatus): StakeholderPortalStatus {
  if (value === "ready") return "ready";
  if (value === "decision_required" || value === "pending") return "attention";
  return "blocked";
}

function countStatuses(items: Array<{ status: StakeholderPortalStatus }>) {
  return {
    blockers: items.filter((item) => item.status === "blocked" || item.status === "locked").length,
    attention: items.filter((item) => item.status === "attention" || item.status === "gated").length,
    ready: items.filter((item) => item.status === "ready").length,
  };
}

function money(value: number | null | undefined) {
  return value ? `EUR ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "not released";
}

function recordValue(value: string | number | boolean | null, unit: string | null, formatter: (value: string | number | boolean | null, unit: string | null) => string) {
  return formatter(value, unit);
}

function action(
  key: string,
  label: string,
  status: StakeholderPortalAction["status"],
  reason: string,
  gate?: string,
  href?: string,
): StakeholderPortalAction {
  return { key, label, status, reason, gate, href };
}

async function buildFranchisePartnerPortal(role: RoleKey): Promise<StakeholderPortalReadModel> {
  const model = emptyReadModel(role, "franchise-partner");
  if (!model.access.allowed) return model;

  const [decision, performance] = await Promise.all([
    getFranchisePartnerDecisionReadModel(role),
    getFranchisePartnerPerformanceReadModel(role),
  ]);
  const tasks: StakeholderPortalItem[] = [
    ...decision.decisionCards.map((card) => ({
      key: `decision-${card.key}`,
      label: card.label,
      owner: "Deal Manager",
      status: statusFrom(card.status),
      current: `${card.value} - ${card.context}`,
      nextAction: "Review partner-safe decision evidence before any release or send.",
      href: `${model.basePath}?tab=work`,
    })),
    ...performance.decisionCards.slice(0, 4).map((card) => ({
      key: `performance-${card.key}`,
      label: card.label,
      owner: "Franchise Partner",
      status: statusFrom(card.status),
      current: `${card.value} - ${card.context}`,
      nextAction: "Review studio performance and recovery tasks in the partner workspace.",
      href: `${model.basePath}?tab=work`,
    })),
  ];
  const documents: StakeholderPortalItem[] = [
    {
      key: "evidence-package",
      label: "Partner evidence package",
      owner: "Reviewer",
      status: decision.summary.evidencePackage > 0 ? "attention" : "blocked",
      current: `${decision.summary.evidencePackage} partner-visible evidence records; partner release remains closed.`,
      nextAction: "Review document gates and redactions before any partner room release.",
      gate: "OPEN_DEV_PARTNER_ROOM_RELEASE",
    },
    {
      key: "opening-handoff",
      label: "Opening handoff pack",
      owner: "Deal Manager",
      status: decision.summary.openingReadiness > 0 ? "attention" : "blocked",
      current: `${decision.summary.openingReadiness} opening readiness records.`,
      nextAction: "Keep launch checklist scoped to partner-safe fields.",
    },
  ];
  const finance: StakeholderPortalItem[] = [
    {
      key: "investment-fit",
      label: "Investment fit",
      owner: "CRAYS Finance",
      status: decision.summary.investmentFit > 0 ? "attention" : "blocked",
      current: `Year 3 result ${money(decision.summary.year3Result)}; equity ${money(decision.summary.equityRequirement)}.`,
      nextAction: "Review partner-safe finance summary; finance posting and exports remain closed.",
    },
    {
      key: "bank-lease",
      label: "Bank and lease conditions",
      owner: "CRAYS Finance",
      status: decision.summary.bankAndLeaseConditions > 0 ? "attention" : "blocked",
      current: `${decision.summary.bankAndLeaseConditions} bank/lease condition records.`,
      nextAction: "Resolve bank/lease blockers before partner decision release.",
      gate: "OPEN_DEV_PARTNER_DECISION_RELEASE",
    },
  ];
  const records: StakeholderPortalRecord[] = [
    ...decision.records.slice(0, 8).map((record) => ({
      key: `decision-${record.id}`,
      label: record.label,
      family: record.family,
      status: statusFrom(`${record.status} ${record.priority}`),
      owner: record.owner,
      value: recordValue(record.value, record.unit, formatFranchisePartnerDecisionValue),
      context: record.context,
      nextAction: record.nextAction,
    })),
    ...performance.records.slice(0, 6).map((record) => ({
      key: `performance-${record.id}`,
      label: record.label,
      family: record.family,
      status: statusFrom(`${record.status} ${record.priority}`),
      owner: record.ownerRole,
      value: recordValue(record.value, record.unit, formatFranchisePartnerPerformanceValue),
      context: record.currentState,
      nextAction: record.nextAction,
    })),
  ];
  const allItems = [...tasks, ...documents, ...finance];
  const statusCounts = countStatuses(allItems);

  return {
    ...model,
    relationship: {
      title: "Partner decision and operating workspace",
      partyName: decision.decisionContext.partnerName,
      partyType: "Franchise partner",
      companyName: decision.decisionContext.partnerCompany,
      siteName: decision.decisionContext.siteName,
      address: decision.decisionContext.address,
      journey: decision.decisionContext.journey,
    },
    summary: {
      records: decision.summary.records + performance.summary.records,
      tasks: tasks.length,
      documents: documents.length,
      actions: 4,
      blockers: statusCounts.blockers + decision.summary.blockers + performance.summary.blockedRows,
      attention: statusCounts.attention + decision.summary.attention + performance.summary.attentionRows,
      ready: statusCounts.ready,
      freshnessMinutes: decision.summary.freshnessMinutes ?? performance.summary.freshnessMinutes,
    },
    metrics: [
      { key: "readiness", label: "Decision readiness", value: `${decision.summary.readinessScore}%`, detail: "Partner decision package" },
      { key: "records", label: "Scoped records", value: decision.summary.records + performance.summary.records, detail: "Decision + performance" },
      { key: "year3", label: "Year 3 result", value: money(decision.summary.year3Result), detail: "Partner-safe finance summary" },
      { key: "blockers", label: "Blockers", value: decision.summary.blockers + performance.summary.blockedRows, detail: "Need review before release" },
    ],
    tasks,
    documents,
    finance,
    messages: [
      {
        key: "partner-messages",
        label: "Partner message thread",
        owner: "Deal Manager",
        status: "gated",
        current: "External sending is closed; message drafts require a specific send gate.",
        nextAction: "Use internal review actions until partner-send is opened.",
        gate: "OPEN_DEV_PARTNER_SEND",
      },
    ],
    records,
    actions: [
      action("open-work", "Review partner work", "available", "Open the partner-safe decision and operating work list.", undefined, `${model.basePath}?tab=work`),
      action("open-documents", "Review partner document gates", "available", "Open scoped evidence and redaction gates.", undefined, `${model.basePath}?tab=documents`),
      action("stage-partner-release", "Stage partner release", "gated", "Partner release remains closed until review policy is opened.", "OPEN_DEV_PARTNER_DECISION_RELEASE"),
      action("send-partner-message", "Send partner message", "gated", "External partner sending remains closed.", "OPEN_DEV_PARTNER_SEND"),
    ],
    sourceNotes: [
      "Partner data is composed from CRAYS partner decision and performance read models.",
      "Partner records are relationship-scoped and redacted before portal rendering.",
      "No native Twenty, Plane, Frappe or source-system write is exposed.",
    ],
  };
}

function formatFranchisePartnerPerformanceValue(value: string | number | boolean | null, unit: string | null) {
  if (value === null) return "not available";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value.replaceAll("_", " ");
  if (unit === "EUR") return money(value);
  if (unit === "percent") return `${Math.round(value * 100)}%`;
  if (unit === "score") return `${Math.round(value * (value <= 1 ? 100 : 1))}/100`;
  return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

async function buildBankPartnerPortal(role: RoleKey): Promise<StakeholderPortalReadModel> {
  const model = emptyReadModel(role, "bank-partner");
  if (!model.access.allowed) return model;

  const [bank, decision] = await Promise.all([getBankPackageReadiness(role), getFranchisePartnerDecisionReadModel("bank-partner")]);
  const tasks: StakeholderPortalItem[] = bank.prerequisites.map((item) => ({
    key: item.key,
    label: item.label,
    owner: item.ownerRole,
    status: statusFromBank(item.status),
    current: item.current,
    nextAction: item.requiredFor,
    gate: item.status === "ready" ? undefined : "OPEN_DEV_BANK_PACKAGE_RELEASE",
  }));
  const finance: StakeholderPortalItem[] = [
    ...tasks.filter((item) => ["candidate-consent", "kyc-aml", "equity-check", "source-of-funds"].includes(item.key)),
    {
      key: "bank-send",
      label: "Bank send",
      owner: "CRAYS Finance",
      status: "gated",
      current: "Bank send remains closed even when package metadata is ready.",
      nextAction: "Prepare internal readiness only; do not send lender files.",
      gate: "OPEN_DEV_BANK_SEND",
    },
  ];
  const documents: StakeholderPortalItem[] = [
    {
      key: "bank-package-documents",
      label: "Bank package document set",
      owner: "CRAYS Finance",
      status: bank.summary.documentPackageLinks > 0 ? "attention" : "blocked",
      current: `${bank.summary.documentPackageLinks} document package links; file bodies are not returned.`,
      nextAction: "Complete internal package review before lender release.",
      gate: "OPEN_DEV_BANK_PACKAGE_RELEASE",
    },
    {
      key: "decision-evidence",
      label: "Bank-relevant decision evidence",
      owner: "Deal Manager",
      status: decision.summary.bankAndLeaseConditions > 0 ? "attention" : "blocked",
      current: `${decision.summary.bankAndLeaseConditions} bank/lease condition records visible to bank scope.`,
      nextAction: "Resolve conditions before any bank handoff.",
    },
  ];
  const records: StakeholderPortalRecord[] = decision.records.slice(0, 10).map((record) => ({
    key: record.id,
    label: record.label,
    family: record.family,
    status: statusFrom(`${record.status} ${record.priority}`),
    owner: record.owner,
    value: recordValue(record.value, record.unit, formatFranchisePartnerDecisionValue),
    context: record.context,
    nextAction: record.nextAction,
  }));
  const allItems = [...tasks, ...documents, ...finance];
  const statusCounts = countStatuses(allItems);

  return {
    ...model,
    relationship: {
      title: "Bank package readiness workspace",
      partyName: "Financing partner account",
      partyType: "Bank / financing partner",
      companyName: "Scoped funding relationship",
      siteName: decision.decisionContext.siteName,
      address: decision.decisionContext.address,
      journey: "Candidate consent -> regulated checks -> bank package documents -> lender release review -> gated bank send",
    },
    summary: {
      records: records.length + bank.prerequisites.length,
      tasks: tasks.length,
      documents: documents.length,
      actions: 4,
      blockers: statusCounts.blockers,
      attention: statusCounts.attention,
      ready: statusCounts.ready,
      freshnessMinutes: decision.summary.freshnessMinutes,
    },
    metrics: [
      { key: "packages", label: "Released packages", value: bank.summary.bankPackages, detail: "Hidden for bank scope until release" },
      { key: "prerequisites", label: "Ready prerequisites", value: `${bank.summary.readyPrerequisites}/${bank.prerequisites.length}`, detail: "Bank handoff path" },
      { key: "conditions", label: "Bank/lease conditions", value: decision.summary.bankAndLeaseConditions, detail: "Bank-visible decision scope" },
      { key: "provider", label: "Provider calls", value: bank.boundaries.providerCallsEnabled ? "enabled" : "closed", detail: "No live bank provider calls" },
    ],
    tasks,
    documents,
    finance,
    messages: [
      {
        key: "bank-thread",
        label: "Bank partner thread",
        owner: "CRAYS Finance",
        status: "gated",
        current: "External lender messages are closed.",
        nextAction: "Use internal readiness review until bank-send is opened.",
        gate: "OPEN_DEV_BANK_SEND",
      },
    ],
    records,
    actions: [
      action("open-conditions", "Review bank conditions", "available", "Open bank readiness tasks.", undefined, `${model.basePath}?tab=finance`),
      action("open-documents", "Review bank document gates", "available", "Open package document gates without file bodies.", undefined, `${model.basePath}?tab=documents`),
      action("release-bank-package", "Release bank package", "gated", "Lender release remains closed.", "OPEN_DEV_BANK_PACKAGE_RELEASE"),
      action("send-bank-package", "Send bank package", "gated", "Bank send remains closed.", "OPEN_DEV_BANK_SEND"),
    ],
    sourceNotes: [
      "Bank Portal is composed from CRAYS bank package readiness and bank-scoped partner decision data.",
      "Bank scope does not return live bank records, provider payloads, Candidate private data or file bodies.",
      "No lender send, payment or finance posting is enabled.",
    ],
  };
}

async function buildLandlordPortal(role: RoleKey): Promise<StakeholderPortalReadModel> {
  const model = emptyReadModel(role, "landlord");
  if (!model.access.allowed) return model;

  const realEstate = await getRealEstateDecisionReadModel(role);
  const tasks: StakeholderPortalItem[] = realEstate.decisionCards.map((card) => ({
    key: card.key,
    label: card.label,
    owner: "Expansion Manager",
    status: statusFrom(card.status),
    current: `${card.value} - ${card.context}`,
    nextAction: "Review owner-safe lease evidence before any release, send or signing.",
    href: `${model.basePath}?tab=work`,
  }));
  const documents: StakeholderPortalItem[] = [
    {
      key: "property-evidence",
      label: "Property evidence",
      owner: "Expansion Manager",
      status: realEstate.summary.propertyEvidence > 0 ? "attention" : "blocked",
      current: `${realEstate.summary.propertyEvidence} property evidence records; file bodies and uploads remain closed.`,
      nextAction: "Review owner-safe property records and missing evidence.",
      gate: "OPEN_DEV_OWNER_ROOM_RELEASE",
    },
    {
      key: "release-redactions",
      label: "Release redactions",
      owner: "Reviewer",
      status: realEstate.summary.redactions > 0 ? "attention" : "ready",
      current: `${realEstate.summary.redactions} internal redaction records are kept out of landlord scope.`,
      nextAction: "Keep candidate, bank and internal finance material out of owner scope.",
    },
  ];
  const finance: StakeholderPortalItem[] = [
    {
      key: "lease-economics",
      label: "Lease economics",
      owner: "Expansion Manager",
      status: realEstate.summary.leaseEconomics > 0 ? "attention" : "blocked",
      current: `Monthly base rent ${money(realEstate.summary.monthlyBaseRent)}; rent per sqm ${realEstate.summary.rentPerSquareMeter ?? "not released"}.`,
      nextAction: "Review rent fit without opening lease signing or payments.",
    },
    {
      key: "lease-signing",
      label: "Lease signing",
      owner: "CRAYS Management",
      status: "gated",
      current: "Lease signing and owner sends remain closed.",
      nextAction: "Resolve review blockers before signing can be considered.",
      gate: "OPEN_DEV_LEASE_SIGNING",
    },
  ];
  const records: StakeholderPortalRecord[] = realEstate.records.slice(0, 12).map((record) => ({
    key: record.id,
    label: record.label,
    family: record.family,
    status: statusFrom(`${record.status} ${record.priority}`),
    owner: record.owner,
    value: recordValue(record.value, record.unit, formatRealEstateDecisionValue),
    context: record.context,
    nextAction: record.nextAction,
  }));
  const allItems = [...tasks, ...documents, ...finance];
  const statusCounts = countStatuses(allItems);

  return {
    ...model,
    relationship: {
      title: "Property owner decision workspace",
      partyName: realEstate.decisionContext.landlordContact,
      partyType: "Property owner",
      companyName: realEstate.decisionContext.landlordCompany,
      siteName: realEstate.decisionContext.siteName,
      address: realEstate.decisionContext.address,
      journey: realEstate.decisionContext.journey,
    },
    summary: {
      records: realEstate.summary.records,
      tasks: tasks.length,
      documents: documents.length,
      actions: 4,
      blockers: statusCounts.blockers + realEstate.summary.blockers,
      attention: statusCounts.attention + realEstate.summary.attention,
      ready: statusCounts.ready,
      freshnessMinutes: realEstate.summary.freshnessMinutes,
    },
    metrics: [
      { key: "readiness", label: "Lease readiness", value: `${realEstate.summary.readinessScore}%`, detail: "Owner-safe decision state" },
      { key: "rent", label: "Monthly rent", value: money(realEstate.summary.monthlyBaseRent), detail: "Lease economics summary" },
      { key: "location", label: "Location fit records", value: realEstate.summary.locationFit, detail: "Reviewed location evidence" },
      { key: "blockers", label: "Blockers", value: realEstate.summary.blockers, detail: "Before owner release/signing" },
    ],
    tasks,
    documents,
    finance,
    messages: [
      {
        key: "owner-thread",
        label: "Owner message thread",
        owner: "Expansion Manager",
        status: "gated",
        current: "Owner sends are closed until an exact owner-send gate is opened.",
        nextAction: "Use internal review and safe property tasks.",
        gate: "OPEN_DEV_OWNER_SEND",
      },
    ],
    records,
    actions: [
      action("open-work", "Review lease work", "available", "Open owner-safe lease and property tasks.", undefined, `${model.basePath}?tab=work`),
      action("open-documents", "Review property evidence", "available", "Open property evidence gates without file bodies.", undefined, `${model.basePath}?tab=documents`),
      action("release-owner-room", "Release owner room", "gated", "Owner room release remains closed.", "OPEN_DEV_OWNER_ROOM_RELEASE"),
      action("sign-lease", "Sign lease", "gated", "Lease signing remains closed.", "OPEN_DEV_LEASE_SIGNING"),
    ],
    sourceNotes: [
      "Landlord Portal is composed from CRAYS Real Estate Decision scoped records.",
      "Candidate, bank and internal finance details are redacted before owner scope.",
      "No upload, owner send, lease signing, payment or source write is enabled.",
    ],
  };
}

export async function getStakeholderPortalReadModel(portal: StakeholderPortalKey, role: RoleKey): Promise<StakeholderPortalReadModel> {
  if (portal === "bank-partner") return buildBankPartnerPortal(role);
  if (portal === "landlord") return buildLandlordPortal(role);
  return buildFranchisePartnerPortal(role);
}
