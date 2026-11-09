import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type RoomAudience = "candidate" | "owner" | "bank" | "partner";
type DocumentLifecycleStatus = "approved" | "required" | "missing" | "blocked";
type RoomPreflightStatus = "review_ready" | "attention" | "blocked";

export type DocumentLifecycleQuery = {
  role: RoleKey;
  preparedOfferId?: string | null;
  dealId?: string | null;
  propertyCaseId?: string | null;
};

export type DocumentLifecycleItem = {
  key: string;
  linkId: string | null;
  label: string;
  packageType: string | null;
  packageId: string | null;
  documentGroup: string;
  documentRefType: string | null;
  documentRefId: string | null;
  requiredFor: string;
  status: DocumentLifecycleStatus;
  sourceStatus: string | null;
  visibilityRoles: string[];
  roomScopes: RoomAudience[];
  versionLabel: string;
  grantSummary: string;
  redactionState: string;
  blocker: string;
  nextAction: string;
  updatedAt: string | null;
};

export type DocumentRequirement = {
  key: string;
  label: string;
  room: RoomAudience;
  requiredFor: string;
  ownerRole: string;
  status: DocumentLifecycleStatus;
  matchedDocumentKeys: string[];
  blocker: string;
  nextAction: string;
};

export type DocumentRoomPreflight = {
  room: RoomAudience;
  label: string;
  targetAudience: "candidate" | "owner" | "bank" | "internal";
  status: RoomPreflightStatus;
  documents: number;
  approvedDocuments: number;
  missingDocuments: number;
  blockedGates: number;
  redactions: string[];
  visibleSections: string[];
  hiddenSections: string[];
  releaseGate: string;
  releaseEnabled: false;
  nextAction: string;
};

export type DocumentLifecycleReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: "internal_document_lifecycle" | "forbidden";
  };
  query: {
    preparedOfferId: string | null;
    dealId: string | null;
    propertyCaseId: string | null;
  };
  case: {
    preparedOfferId: string;
    dealId: string | null;
    propertyCaseId: string | null;
    bankPackageId: string | null;
    loanCaseId: string | null;
    title: string;
    status: string;
    updatedAt: string;
  } | null;
  summary: {
    requiredDocuments: number;
    approvedDocuments: number;
    missingDocuments: number;
    blockedDocuments: number;
    roomPreflights: number;
    roomReadyForReview: number;
    releaseGatesBlocked: number;
    redactionItems: number;
  };
  requirements: DocumentRequirement[];
  documents: DocumentLifecycleItem[];
  roomPreflights: DocumentRoomPreflight[];
  boundaries: {
    liveSourceCallsEnabled: false;
    documentBodiesReturned: false;
    binaryUploadsEnabled: false;
    privatePreviewEnabled: false;
    publicFileReleaseEnabled: false;
    roomReleaseEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    toolApplyEnabled: false;
    externalSendingEnabled: false;
    financeActionsEnabled: false;
    bankActionsEnabled: false;
    paymentInitiationEnabled: false;
    productionDeployEnabled: false;
    vpsChangingWorkEnabled: false;
  };
  queryStatus: "not_configured" | "schema_ready" | "not_found" | "forbidden";
  secretsReturned: false;
  privateKeysReturned: false;
};

type CaseRow = {
  offer_id: string;
  deal_id: string | null;
  property_case_id: string | null;
  bank_package_id: string | null;
  loan_case_id: string | null;
  title: string;
  offer_status: string;
  updated_at: Date;
};

type DocumentRow = {
  link_id: string;
  package_type: string;
  package_id: string;
  document_ref_type: string;
  document_ref_id: string;
  document_group: string;
  visibility_roles: unknown;
  status: string;
  required_for: string | null;
  metadata: JsonRecord;
  updated_at: Date;
};

type GateRow = {
  gate_id: string;
  related_entity_type: string;
  related_entity_id: string;
  evidence_class: string;
  target_audience: "candidate" | "owner" | "bank" | "internal";
  gate_status: string;
  redaction_summary: JsonRecord;
  release_summary: JsonRecord;
};

type RequirementSpec = {
  key: string;
  label: string;
  room: RoomAudience;
  requiredFor: string;
  ownerRole: string;
  groupHints: string[];
};

const allowedRoles: RoleKey[] = [
  "crays-management",
  "admin",
  "deal-manager",
  "expansion-manager",
  "finance",
  "reviewer",
  "franchise-partner",
  "studio-manager",
];

const requirementSpecs: RequirementSpec[] = [
  {
    key: "candidate-case-memo",
    label: "Candidate case memo",
    room: "candidate",
    requiredFor: "candidate",
    ownerRole: "Deal Manager",
    groupHints: ["case memo", "model", "legal"],
  },
  {
    key: "owner-property-file",
    label: "Owner property file",
    room: "owner",
    requiredFor: "landlord",
    ownerRole: "Expansion Manager",
    groupHints: ["real estate", "case file"],
  },
  {
    key: "bank-approval-package",
    label: "Bank approval package",
    room: "bank",
    requiredFor: "bank approval",
    ownerRole: "Finance",
    groupHints: ["case file", "approval"],
  },
  {
    key: "partner-approval-file",
    label: "Partner approval file",
    room: "partner",
    requiredFor: "partner approval",
    ownerRole: "Reviewer",
    groupHints: ["case file", "approval"],
  },
  {
    key: "closing-file-set",
    label: "Closing file set",
    room: "partner",
    requiredFor: "closing",
    ownerRole: "Deal Manager",
    groupHints: ["case file", "legal"],
  },
  {
    key: "internal-approval-note",
    label: "Internal approval note",
    room: "partner",
    requiredFor: "admin",
    ownerRole: "Admin",
    groupHints: ["approval"],
  },
];

function boundaries(): DocumentLifecycleReadModel["boundaries"] {
  return {
    liveSourceCallsEnabled: false,
    documentBodiesReturned: false,
    binaryUploadsEnabled: false,
    privatePreviewEnabled: false,
    publicFileReleaseEnabled: false,
    roomReleaseEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    externalSendingEnabled: false,
    financeActionsEnabled: false,
    bankActionsEnabled: false,
    paymentInitiationEnabled: false,
    productionDeployEnabled: false,
    vpsChangingWorkEnabled: false,
  };
}

function emptyReadModel(
  query: DocumentLifecycleQuery,
  allowed: boolean,
  queryStatus: DocumentLifecycleReadModel["queryStatus"],
): DocumentLifecycleReadModel {
  return {
    access: {
      role: query.role,
      allowed,
      level: allowed ? "internal_document_lifecycle" : "forbidden",
    },
    query: {
      preparedOfferId: query.preparedOfferId ?? null,
      dealId: query.dealId ?? null,
      propertyCaseId: query.propertyCaseId ?? null,
    },
    case: null,
    summary: {
      requiredDocuments: 0,
      approvedDocuments: 0,
      missingDocuments: 0,
      blockedDocuments: 0,
      roomPreflights: 0,
      roomReadyForReview: 0,
      releaseGatesBlocked: 0,
      redactionItems: 0,
    },
    requirements: [],
    documents: [],
    roomPreflights: [],
    boundaries: boundaries(),
    queryStatus,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function jsonObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function textArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function titleize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function versionLabel(metadata: JsonRecord) {
  return text(metadata.version) ?? text(metadata.versionLabel) ?? "metadata-only";
}

function documentLabel(row: DocumentRow) {
  const metadataTitle = text(jsonObject(row.metadata).title);
  if (metadataTitle) return metadataTitle;
  return titleize(row.document_group);
}

function releaseAudienceForRoom(room: RoomAudience): GateRow["target_audience"] {
  if (room === "owner") return "owner";
  if (room === "bank") return "bank";
  if (room === "candidate") return "candidate";
  return "internal";
}

function releaseGateForRoom(room: RoomAudience) {
  if (room === "owner") return "OWNER_ROOM_RELEASE_CLOSED";
  if (room === "bank") return "BANK_ROOM_RELEASE_CLOSED";
  if (room === "candidate") return "CANDIDATE_ROOM_RELEASE_CLOSED";
  return "PARTNER_ROOM_RELEASE_CLOSED";
}

function roomScopesFor(row: Pick<DocumentRow, "required_for" | "visibility_roles">): RoomAudience[] {
  const requiredFor = normalized(row.required_for);
  const visibilityRoles = textArray(row.visibility_roles);
  const rooms = new Set<RoomAudience>();

  if (requiredFor.includes("candidate") || visibilityRoles.includes("franchise-candidate")) rooms.add("candidate");
  if (requiredFor.includes("landlord") || visibilityRoles.includes("landlord")) rooms.add("owner");
  if (requiredFor.includes("bank") || visibilityRoles.includes("bank-partner")) rooms.add("bank");
  if (requiredFor.includes("partner") || requiredFor.includes("closing") || requiredFor.includes("admin") || visibilityRoles.includes("franchise-partner")) rooms.add("partner");

  if (rooms.size === 0) rooms.add("partner");
  return Array.from(rooms);
}

function lifecycleStatus(status: string): DocumentLifecycleStatus {
  if (status === "approved") return "approved";
  if (status === "rejected" || status === "revoked") return "blocked";
  return "required";
}

function grantSummary(roles: string[]) {
  if (roles.length === 0) return "No room grant.";
  return `${roles.length} role grant${roles.length === 1 ? "" : "s"}`;
}

function redactionState(rooms: RoomAudience[], gates: GateRow[]) {
  const audiences = rooms.map(releaseAudienceForRoom);
  const matchingGates = gates.filter((gate) => audiences.includes(gate.target_audience));
  if (matchingGates.some((gate) => Object.keys(jsonObject(gate.redaction_summary)).length > 0)) return "Redaction summary present";
  if (rooms.some((room) => room !== "partner")) return "Metadata only";
  return "Internal scope";
}

function nextActionForStatus(status: DocumentLifecycleStatus) {
  if (status === "approved") return "Review grants and room eligibility.";
  if (status === "blocked") return "Resolve rejected or revoked document link.";
  if (status === "missing") return "Create required document metadata.";
  return "Approve required document metadata.";
}

function blockerForStatus(status: DocumentLifecycleStatus) {
  if (status === "approved") return "No document blocker.";
  if (status === "blocked") return "Document link is rejected or revoked.";
  if (status === "missing") return "Required document metadata is missing.";
  return "Required document is not approved.";
}

function documentFromRow(row: DocumentRow, gates: GateRow[]): DocumentLifecycleItem {
  const status = lifecycleStatus(row.status);
  const visibilityRoles = textArray(row.visibility_roles);
  const rooms = roomScopesFor(row);
  return {
    key: row.link_id,
    linkId: row.link_id,
    label: documentLabel(row),
    packageType: row.package_type,
    packageId: row.package_id,
    documentGroup: row.document_group,
    documentRefType: row.document_ref_type,
    documentRefId: row.document_ref_id,
    requiredFor: row.required_for ?? "case evidence",
    status,
    sourceStatus: row.status,
    visibilityRoles,
    roomScopes: rooms,
    versionLabel: versionLabel(jsonObject(row.metadata)),
    grantSummary: grantSummary(visibilityRoles),
    redactionState: redactionState(rooms, gates),
    blocker: blockerForStatus(status),
    nextAction: nextActionForStatus(status),
    updatedAt: row.updated_at.toISOString(),
  };
}

function requirementFromSpec(spec: RequirementSpec, documents: DocumentLifecycleItem[]): DocumentRequirement {
  const matches = documents.filter((document) => {
    const requiredForMatches = normalized(document.requiredFor).includes(spec.requiredFor);
    const groupMatches = spec.groupHints.some((hint) => normalized(document.documentGroup).includes(hint));
    return document.roomScopes.includes(spec.room) && requiredForMatches && groupMatches;
  });
  const hasApproved = matches.some((document) => document.status === "approved");
  const hasBlocked = matches.some((document) => document.status === "blocked");
  const status: DocumentLifecycleStatus = hasApproved ? "approved" : hasBlocked ? "blocked" : matches.length > 0 ? "required" : "missing";

  return {
    key: spec.key,
    label: spec.label,
    room: spec.room,
    requiredFor: spec.requiredFor,
    ownerRole: spec.ownerRole,
    status,
    matchedDocumentKeys: matches.map((document) => document.key),
    blocker: blockerForStatus(status),
    nextAction: nextActionForStatus(status),
  };
}

function redactionLabels(gates: GateRow[]) {
  const labels = new Set<string>();
  for (const gate of gates) {
    const summary = jsonObject(gate.redaction_summary);
    const explicitItems = Array.isArray(summary.items) ? summary.items : [];
    for (const item of explicitItems) {
      if (typeof item === "string" && item.trim()) labels.add(item.trim());
    }
    if (labels.size === 0 && Object.keys(summary).length > 0) labels.add(`${titleize(gate.evidence_class)} redaction review`);
  }
  return Array.from(labels);
}

function roomPreflight(room: RoomAudience, requirements: DocumentRequirement[], documents: DocumentLifecycleItem[], gates: GateRow[]): DocumentRoomPreflight {
  const targetAudience = releaseAudienceForRoom(room);
  const roomRequirements = requirements.filter((requirement) => requirement.room === room);
  const roomDocuments = documents.filter((document) => document.roomScopes.includes(room));
  const approvedDocuments = roomDocuments.filter((document) => document.status === "approved").length;
  const missingDocuments = roomRequirements.filter((requirement) => requirement.status === "missing").length;
  const unapprovedRequirements = roomRequirements.filter((requirement) => requirement.status !== "approved").length;
  const roomGates = gates.filter((gate) => gate.target_audience === targetAudience);
  const blockedGates = roomGates.filter((gate) => gate.gate_status === "blocked").length;
  const visibleSections = Array.from(new Set(roomDocuments.filter((document) => document.status === "approved").map((document) => document.label)));
  const hiddenSections = Array.from(
    new Set([
      ...roomRequirements.filter((requirement) => requirement.status !== "approved").map((requirement) => requirement.label),
      ...roomDocuments.filter((document) => document.status !== "approved").map((document) => document.label),
    ]),
  );
  const status: RoomPreflightStatus = missingDocuments > 0 || blockedGates > 0 ? "blocked" : unapprovedRequirements > 0 ? "attention" : "review_ready";

  return {
    room,
    label: `${titleize(room)} room`,
    targetAudience,
    status,
    documents: roomDocuments.length,
    approvedDocuments,
    missingDocuments,
    blockedGates,
    redactions: redactionLabels(roomGates),
    visibleSections,
    hiddenSections,
    releaseGate: releaseGateForRoom(room),
    releaseEnabled: false,
    nextAction:
      status === "review_ready"
        ? "Review release preflight without releasing."
        : missingDocuments > 0
          ? "Complete missing document metadata."
          : blockedGates > 0
            ? "Resolve blocked release gates."
            : "Review document grants and redactions.",
  };
}

async function getCaseRow(query: DocumentLifecycleQuery) {
  const pool = getCorePgPool();
  const result = await pool.query<CaseRow>(
    `
      select
        prepared_offers.offer_id,
        deals.deal_id,
        property_cases.case_id as property_case_id,
        bank_packages.package_id as bank_package_id,
        loan_cases.loan_case_id,
        prepared_offers.title,
        prepared_offers.status as offer_status,
        prepared_offers.updated_at
      from crays_core.prepared_offers
      left join crays_core.property_cases on property_cases.case_id = prepared_offers.property_case_id
      left join crays_core.deals on deals.prepared_offer_id = prepared_offers.offer_id
      left join crays_core.bank_packages on bank_packages.deal_id = deals.deal_id
      left join crays_core.loan_cases on loan_cases.bank_package_id = bank_packages.package_id
      where ($1::text is null or prepared_offers.offer_id = $1)
        and ($2::text is null or deals.deal_id = $2)
        and ($3::text is null or property_cases.case_id = $3)
      order by
        case when $1::text is not null and prepared_offers.offer_id = $1 then 0 else 1 end,
        prepared_offers.updated_at desc
      limit 1
    `,
    [query.preparedOfferId ?? null, query.dealId ?? null, query.propertyCaseId ?? null],
  );
  return result.rows[0] ?? null;
}

async function getDocumentRows(row: CaseRow) {
  const pool = getCorePgPool();
  const result = await pool.query<DocumentRow>(
    `
      select
        link_id,
        package_type,
        package_id,
        document_ref_type,
        document_ref_id,
        document_group,
        visibility_roles,
        status,
        required_for,
        metadata,
        updated_at
      from crays_core.document_package_links
      where (package_type = 'prepared-offer' and package_id = $1)
        or ($2::text is not null and package_type = 'deal' and package_id = $2)
        or ($3::text is not null and package_type = 'property-case' and package_id = $3)
        or ($4::text is not null and package_type = 'bank-package' and package_id = $4)
        or ($5::text is not null and package_type = 'loan-case' and package_id = $5)
      order by
        case status when 'required' then 0 when 'rejected' then 1 when 'approved' then 2 else 3 end,
        updated_at desc,
        id desc
    `,
    [row.offer_id, row.deal_id, row.property_case_id, row.bank_package_id, row.loan_case_id],
  );
  return result.rows;
}

async function getGateRows(row: CaseRow) {
  const pool = getCorePgPool();
  const result = await pool.query<GateRow>(
    `
      select
        gate_id,
        related_entity_type,
        related_entity_id,
        evidence_class,
        target_audience,
        gate_status,
        redaction_summary,
        release_summary
      from crays_core.evidence_release_gates
      where (related_entity_type = 'prepared-offer' and related_entity_id = $1)
        or ($2::text is not null and related_entity_type = 'deal' and related_entity_id = $2)
        or ($3::text is not null and related_entity_type = 'property-case' and related_entity_id = $3)
        or ($4::text is not null and related_entity_type = 'bank-package' and related_entity_id = $4)
        or ($5::text is not null and related_entity_type = 'loan-case' and related_entity_id = $5)
      order by
        case gate_status when 'blocked' then 0 when 'ready_for_review' then 1 when 'approved' then 2 else 3 end,
        id desc
    `,
    [row.offer_id, row.deal_id, row.property_case_id, row.bank_package_id, row.loan_case_id],
  );
  return result.rows.map((gate) => ({
    ...gate,
    redaction_summary: jsonObject(gate.redaction_summary),
    release_summary: jsonObject(gate.release_summary),
  }));
}

export async function getDocumentLifecycleReadModel(query: DocumentLifecycleQuery): Promise<DocumentLifecycleReadModel> {
  const allowed = allowedRoles.includes(query.role);
  if (!allowed) return emptyReadModel(query, false, "forbidden");

  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured) return emptyReadModel(query, true, "not_configured");

  const row = await getCaseRow(query);
  if (!row) return emptyReadModel(query, true, "not_found");

  const [documentRows, gates] = await Promise.all([getDocumentRows(row), getGateRows(row)]);
  const documents = documentRows.map((document) => documentFromRow(document, gates));
  const requirements = requirementSpecs.map((spec) => requirementFromSpec(spec, documents));
  const roomPreflights = (["candidate", "owner", "bank", "partner"] as RoomAudience[]).map((room) =>
    roomPreflight(room, requirements, documents, gates),
  );
  const blockedDocuments = documents.filter((document) => document.status === "blocked").length + requirements.filter((requirement) => requirement.status === "missing").length;
  const redactionItems = roomPreflights.reduce((total, room) => total + room.redactions.length, 0);

  return {
    access: {
      role: query.role,
      allowed: true,
      level: "internal_document_lifecycle",
    },
    query: {
      preparedOfferId: query.preparedOfferId ?? null,
      dealId: query.dealId ?? null,
      propertyCaseId: query.propertyCaseId ?? null,
    },
    case: {
      preparedOfferId: row.offer_id,
      dealId: row.deal_id,
      propertyCaseId: row.property_case_id,
      bankPackageId: row.bank_package_id,
      loanCaseId: row.loan_case_id,
      title: row.title,
      status: row.offer_status,
      updatedAt: row.updated_at.toISOString(),
    },
    summary: {
      requiredDocuments: requirements.length,
      approvedDocuments: requirements.filter((requirement) => requirement.status === "approved").length,
      missingDocuments: requirements.filter((requirement) => requirement.status === "missing").length,
      blockedDocuments,
      roomPreflights: roomPreflights.length,
      roomReadyForReview: roomPreflights.filter((room) => room.status === "review_ready").length,
      releaseGatesBlocked: roomPreflights.reduce((total, room) => total + room.blockedGates, 0),
      redactionItems,
    },
    requirements,
    documents,
    roomPreflights,
    boundaries: boundaries(),
    queryStatus: "schema_ready",
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
