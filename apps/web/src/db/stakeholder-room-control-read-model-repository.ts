import {
  getDocumentLifecycleReadModel,
  type DocumentLifecycleReadModel,
  type DocumentRoomPreflight,
} from "./document-lifecycle-read-model-repository";
import { getCorePgPool } from "./client";
import type { RoleKey } from "@/lib/roles";

type RoomKey = DocumentRoomPreflight["room"];
type RoomControlStatus = "review_ready" | "attention" | "blocked";
type RoomPriority = "critical" | "high" | "medium";

type StakeholderCaseContext = {
  prepared_offer_id: string;
  deal_id: string | null;
  property_case_id: string | null;
  title: string;
  status: string;
  market: string | null;
  updated_at: Date;
  property_title: string | null;
  property_address: string | null;
  property_city: string | null;
  owner_name: string | null;
  candidate_name: string | null;
  candidate_organization_name: string | null;
  deal_manager_name: string | null;
  franchise_partner_name: string | null;
  bank_name: string | null;
  bank_package_id: string | null;
};

export type StakeholderRoomControlQuery = {
  role: RoleKey;
  preparedOfferId?: string | null;
  dealId?: string | null;
  propertyCaseId?: string | null;
};

export type StakeholderRoomControlItem = {
  key: RoomKey;
  label: string;
  audience: string;
  audienceProfile: {
    partyName: string;
    partyType: string;
    relationship: string;
  };
  ownerRole: string;
  status: RoomControlStatus;
  priority: RoomPriority;
  releaseGate: string;
  releaseGateLabel: string;
  reviewStatus: string;
  releaseState: "closed";
  documents: number;
  approvedDocuments: number;
  missingDocuments: number;
  blockedGates: number;
  redactions: string[];
  visibleSections: string[];
  hiddenSections: string[];
  includedRecords: string[];
  excludedRecords: string[];
  blocker: string;
  nextAction: string;
  actionLabel: string;
  links: {
    caseHref: string;
    filesHref: string;
  };
};

export type StakeholderRoomControlReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: "internal_stakeholder_room_control" | "forbidden";
  };
  case: {
    preparedOfferId: string;
    dealId: string | null;
    propertyCaseId: string | null;
    title: string;
    status: string;
    updatedAt: string;
    market: string | null;
    propertyTitle: string | null;
    propertyAddress: string | null;
    ownerName: string | null;
    candidateName: string | null;
    candidateOrganizationName: string | null;
    dealManagerName: string | null;
    franchisePartnerName: string | null;
    bankName: string | null;
    bankPackageId: string | null;
  } | null;
  summary: {
    rooms: number;
    blockedRooms: number;
    reviewReadyRooms: number;
    blockedGates: number;
    redactions: number;
    approvedDocuments: number;
    documents: number;
  };
  rooms: StakeholderRoomControlItem[];
  boundaries: {
    liveSourceCallsEnabled: false;
    documentBodiesReturned: false;
    binaryUploadsEnabled: false;
    privatePreviewEnabled: false;
    roomReleaseEnabled: false;
    externalSendingEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    toolApplyEnabled: false;
    financeActionsEnabled: false;
    bankActionsEnabled: false;
    paymentInitiationEnabled: false;
    productionDeployEnabled: false;
    vpsChangingWorkEnabled: false;
  };
  queryStatus: DocumentLifecycleReadModel["queryStatus"];
  secretsReturned: false;
  privateKeysReturned: false;
};

const audienceLabels: Record<RoomKey, string> = {
  candidate: "Franchise Candidate",
  owner: "Property Owner",
  bank: "Bank Partner",
  partner: "Franchise Partner",
};

const ownerRoles: Record<RoomKey, string> = {
  candidate: "Deal Manager",
  owner: "Expansion Manager",
  bank: "Finance",
  partner: "Franchise Partner",
};

function nonEmpty(value: string | null | undefined, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function humanReleaseGate(room: RoomKey) {
  if (room === "candidate") return "Candidate room release locked";
  if (room === "owner") return "Owner room release locked";
  if (room === "bank") return "Bank room release locked";
  return "Partner room release locked";
}

function reviewStatusFor(room: DocumentRoomPreflight) {
  if (room.blockedGates > 0) return "Release review blocked";
  if (room.missingDocuments > 0) return "Required records missing";
  if (room.status === "attention") return "Visibility review required";
  return "Ready for internal reviewer sign-off";
}

function audienceProfile(room: RoomKey, context: StakeholderCaseContext | null): StakeholderRoomControlItem["audienceProfile"] {
  if (room === "candidate") {
    return {
      partyName: nonEmpty(context?.candidate_name, "Johannes Adler"),
      partyType: "Prospective franchise operator",
      relationship: nonEmpty(context?.candidate_organization_name, "Adler Fitness Beteiligungs GmbH"),
    };
  }
  if (room === "owner") {
    return {
      partyName: nonEmpty(context?.owner_name, "Schwabing Atrium Immobilien GmbH"),
      partyType: "Property owner",
      relationship: nonEmpty(context?.property_title, "Leopoldstrasse 87 Studio Lease"),
    };
  }
  if (room === "bank") {
    return {
      partyName: nonEmpty(context?.bank_name, "Isar Commercial Finance AG"),
      partyType: "Financing partner",
      relationship: context?.bank_package_id ? "Bank package review" : "Financing preflight",
    };
  }
  return {
    partyName: nonEmpty(context?.franchise_partner_name ?? context?.candidate_name, "Johannes Adler"),
    partyType: "Franchise partner",
    relationship: "Opening and handoff preparation",
  };
}

function includedRecords(room: DocumentRoomPreflight, context: StakeholderCaseContext | null) {
  const shared = [
    nonEmpty(context?.title, "Prepared Franchise Deal"),
    `${room.approvedDocuments} approved document metadata record${room.approvedDocuments === 1 ? "" : "s"}`,
  ];
  if (room.room === "candidate") return [...shared, "Candidate-facing offer summary", "Approved economics excerpt"];
  if (room.room === "owner") return [...shared, nonEmpty(context?.property_address, "Property address summary"), "Owner-visible property file"];
  if (room.room === "bank") return [...shared, nonEmpty(context?.bank_name, "Financing partner"), "Bank package checklist"];
  return [...shared, "Opening handoff summary", "Partner onboarding checklist"];
}

function excludedRecords(room: DocumentRoomPreflight) {
  const blocked = [
    "Internal command history",
    "Internal audit notes",
    "Unapproved document metadata",
    "Private source mapping details",
  ];
  if (room.room === "bank") return [...blocked, "Candidate private contact details", "Owner-only lease negotiation notes"];
  if (room.room === "owner") return [...blocked, "Candidate financing details", "Bank package evidence"];
  if (room.room === "candidate") return [...blocked, "Bank conditions", "Owner-only negotiation notes"];
  return [...blocked, "Bank-only financing evidence"];
}

function boundaries(): StakeholderRoomControlReadModel["boundaries"] {
  return {
    liveSourceCallsEnabled: false,
    documentBodiesReturned: false,
    binaryUploadsEnabled: false,
    privatePreviewEnabled: false,
    roomReleaseEnabled: false,
    externalSendingEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    financeActionsEnabled: false,
    bankActionsEnabled: false,
    paymentInitiationEnabled: false,
    productionDeployEnabled: false,
    vpsChangingWorkEnabled: false,
  };
}

function roomStatus(room: DocumentRoomPreflight): RoomControlStatus {
  if (room.blockedGates > 0 || room.missingDocuments > 0) return "blocked";
  return room.status;
}

function roomPriority(status: RoomControlStatus): RoomPriority {
  if (status === "blocked") return "critical";
  if (status === "attention") return "high";
  return "medium";
}

function blockerFor(room: DocumentRoomPreflight) {
  if (room.blockedGates > 0) return `${room.blockedGates} release gates blocked.`;
  if (room.missingDocuments > 0) return `${room.missingDocuments} required documents missing.`;
  if (room.status === "attention") return "Document grants or redactions need review.";
  return "Ready for internal room preflight review.";
}

function caseHref(role: RoleKey, lifecycle: DocumentLifecycleReadModel) {
  const params = new URLSearchParams({
    role,
    view: "case",
    case: lifecycle.case?.preparedOfferId ?? "",
  });
  if (lifecycle.case?.dealId) params.set("deal", lifecycle.case.dealId);
  if (lifecycle.case?.propertyCaseId) params.set("propertyCase", lifecycle.case.propertyCaseId);
  return `/dashboard?${params.toString()}`;
}

function filesHref(role: RoleKey, lifecycle: DocumentLifecycleReadModel) {
  const params = new URLSearchParams({
    role,
    view: "vault",
    record: "all",
    case: lifecycle.case?.preparedOfferId ?? "",
  });
  if (lifecycle.case?.dealId) params.set("deal", lifecycle.case.dealId);
  if (lifecycle.case?.propertyCaseId) params.set("propertyCase", lifecycle.case.propertyCaseId);
  return `/files?${params.toString()}`;
}

function itemFromRoom(
  role: RoleKey,
  lifecycle: DocumentLifecycleReadModel,
  room: DocumentRoomPreflight,
  context: StakeholderCaseContext | null,
): StakeholderRoomControlItem {
  const status = roomStatus(room);
  return {
    key: room.room,
    label: room.label,
    audience: audienceLabels[room.room],
    audienceProfile: audienceProfile(room.room, context),
    ownerRole: ownerRoles[room.room],
    status,
    priority: roomPriority(status),
    releaseGate: room.releaseGate,
    releaseGateLabel: humanReleaseGate(room.room),
    reviewStatus: reviewStatusFor(room),
    releaseState: "closed",
    documents: room.documents,
    approvedDocuments: room.approvedDocuments,
    missingDocuments: room.missingDocuments,
    blockedGates: room.blockedGates,
    redactions: room.redactions,
    visibleSections: room.visibleSections,
    hiddenSections: room.hiddenSections,
    includedRecords: includedRecords(room, context),
    excludedRecords: excludedRecords(room),
    blocker: blockerFor(room),
    nextAction: room.nextAction,
    actionLabel: `Stage ${room.room} room preflight`,
    links: {
      caseHref: caseHref(role, lifecycle),
      filesHref: filesHref(role, lifecycle),
    },
  };
}

async function getStakeholderCaseContext(lifecycle: DocumentLifecycleReadModel): Promise<StakeholderCaseContext | null> {
  if (!lifecycle.case) return null;
  const pool = getCorePgPool();
  const result = await pool.query<StakeholderCaseContext>(
    `
      select
        prepared_offers.offer_id as prepared_offer_id,
        deals.deal_id,
        property_cases.case_id as property_case_id,
        prepared_offers.title,
        prepared_offers.status,
        prepared_offers.market,
        prepared_offers.updated_at,
        properties.title as property_title,
        properties.address_summary as property_address,
        properties.city as property_city,
        owner_organizations.name as owner_name,
        candidate_accounts.display_name as candidate_name,
        candidate_organizations.name as candidate_organization_name,
        deal_manager_accounts.display_name as deal_manager_name,
        franchise_partner_accounts.display_name as franchise_partner_name,
        bank_organizations.name as bank_name,
        bank_packages.package_id as bank_package_id
      from crays_core.prepared_offers
      left join crays_core.property_cases on property_cases.case_id = prepared_offers.property_case_id
      left join crays_core.properties on properties.property_id = property_cases.property_id
      left join crays_core.organizations owner_organizations on owner_organizations.organization_id = properties.owner_organization_id
      left join crays_core.deals on deals.prepared_offer_id = prepared_offers.offer_id
      left join crays_core.crays_accounts candidate_accounts on candidate_accounts.account_id = deals.candidate_account_id
      left join crays_core.organizations candidate_organizations on candidate_organizations.organization_id = deals.organization_id
      left join crays_core.crays_accounts deal_manager_accounts on deal_manager_accounts.account_id = deals.deal_manager_account_id
      left join crays_core.crays_accounts franchise_partner_accounts on franchise_partner_accounts.account_id = deals.franchise_partner_account_id
      left join crays_core.bank_packages on bank_packages.deal_id = deals.deal_id
      left join crays_core.organizations bank_organizations on bank_organizations.organization_id = bank_packages.bank_partner_organization_id
      where prepared_offers.offer_id = $1
      limit 1
    `,
    [lifecycle.case.preparedOfferId],
  );
  return result.rows[0] ?? null;
}

function emptyReadModel(
  query: StakeholderRoomControlQuery,
  allowed: boolean,
  queryStatus: StakeholderRoomControlReadModel["queryStatus"],
): StakeholderRoomControlReadModel {
  return {
    access: {
      role: query.role,
      allowed,
      level: allowed ? "internal_stakeholder_room_control" : "forbidden",
    },
    case: null,
    summary: {
      rooms: 0,
      blockedRooms: 0,
      reviewReadyRooms: 0,
      blockedGates: 0,
      redactions: 0,
      approvedDocuments: 0,
      documents: 0,
    },
    rooms: [],
    boundaries: boundaries(),
    queryStatus,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

export async function getStakeholderRoomControlReadModel(query: StakeholderRoomControlQuery): Promise<StakeholderRoomControlReadModel> {
  const lifecycle = await getDocumentLifecycleReadModel(query);

  if (!lifecycle.access.allowed) return emptyReadModel(query, false, "forbidden");
  if (lifecycle.queryStatus !== "schema_ready" || !lifecycle.case) return emptyReadModel(query, true, lifecycle.queryStatus);

  const context = await getStakeholderCaseContext(lifecycle);
  const rooms = lifecycle.roomPreflights.map((room) => itemFromRoom(query.role, lifecycle, room, context));

  return {
    access: {
      role: query.role,
      allowed: true,
      level: "internal_stakeholder_room_control",
    },
    case: {
      preparedOfferId: lifecycle.case.preparedOfferId,
      dealId: lifecycle.case.dealId,
      propertyCaseId: lifecycle.case.propertyCaseId,
      title: lifecycle.case.title,
      status: lifecycle.case.status,
      updatedAt: lifecycle.case.updatedAt,
      market: context?.market ?? null,
      propertyTitle: context?.property_title ?? null,
      propertyAddress: context?.property_address ?? null,
      ownerName: context?.owner_name ?? null,
      candidateName: context?.candidate_name ?? null,
      candidateOrganizationName: context?.candidate_organization_name ?? null,
      dealManagerName: context?.deal_manager_name ?? null,
      franchisePartnerName: context?.franchise_partner_name ?? null,
      bankName: context?.bank_name ?? null,
      bankPackageId: context?.bank_package_id ?? null,
    },
    summary: {
      rooms: rooms.length,
      blockedRooms: rooms.filter((room) => room.status === "blocked").length,
      reviewReadyRooms: rooms.filter((room) => room.status === "review_ready").length,
      blockedGates: rooms.reduce((total, room) => total + room.blockedGates, 0),
      redactions: rooms.reduce((total, room) => total + room.redactions.length, 0),
      approvedDocuments: rooms.reduce((total, room) => total + room.approvedDocuments, 0),
      documents: rooms.reduce((total, room) => total + room.documents, 0),
    },
    rooms,
    boundaries: boundaries(),
    queryStatus: "schema_ready",
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
