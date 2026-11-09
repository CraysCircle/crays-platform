import { getB2cMemberDatabaseReadModel } from "./b2c-member-database-read-model-repository";
import { getBankPackageReadiness } from "./bank-package-readiness-repository";
import { getCandidateDealRoomReadiness } from "./candidate-deal-room-readiness-repository";
import { getEvidencePackagesReadModel } from "./evidence-packages-read-model-repository";
import { getFranchisePartnerDecisionReadModel } from "./franchise-partner-decision-read-model-repository";
import { getRoleScopeAuditReadModel } from "./role-scope-audit-read-model-repository";
import { getSupportRecoveryReadModel } from "./support-recovery-read-model-repository";
import type { RoleKey } from "@/lib/roles";

type AccessLevel = "external_preflight_control" | "external_preflight_scope" | "release_blocked";
type PreflightStatus = "ready" | "review_required" | "blocked";
type AudienceKey = "candidate" | "partner" | "bank" | "real-estate" | "member" | "guest";

export type ExternalPreflightRoom = {
  key: AudienceKey;
  label: string;
  audienceRole: RoleKey;
  ownerRole: string;
  status: PreflightStatus;
  visibilityScore: number;
  sourceRecords: number;
  packageRecords: number;
  permissionChecks: number;
  blockedChecks: number;
  redactedChecks: number;
  releaseGate: string;
  visibleFields: string[];
  redactedFields: string[];
  missingPrerequisites: string[];
  linkedObjects: Array<{ label: string; type: string; id: string }>;
  currentState: string;
  nextAction: string;
  href: string;
};

export type ExternalPreflightReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: AccessLevel;
    reason: string;
    canStagePreflightReview: boolean;
    visibleAudiences: AudienceKey[] | null;
  };
  summary: {
    rooms: number;
    readyRooms: number;
    reviewRequiredRooms: number;
    blockedRooms: number;
    sourceRecords: number;
    packageRecords: number;
    permissionChecks: number;
    blockedChecks: number;
    redactedChecks: number;
    missingPrerequisites: number;
  };
  rooms: ExternalPreflightRoom[];
  controls: {
    audiences: Array<{ key: string; label: string; rows: number }>;
    statuses: Array<{ key: string; label: string; rows: number }>;
    owners: Array<{ key: string; label: string; rows: number }>;
  };
  actions: {
    stagePreflightReviewAllowed: boolean;
    commandRoute: "/api/crays/core-command/sync-preview";
    confirmationHeader: "stage-sync-preview-command";
    applyGate: "OPEN_DEV_SYNC_APPLY";
  };
  boundaries: {
    internalPreflightReadsEnabled: true;
    externalPreviewReleased: false;
    publicReleaseEnabled: false;
    candidateReleaseEnabled: false;
    partnerReleaseEnabled: false;
    bankReleaseEnabled: false;
    ownerReleaseEnabled: false;
    memberExternalSendingEnabled: false;
    externalSendingEnabled: false;
    uploadsEnabled: false;
    privatePreviewEnabled: false;
    fileBodyAccessEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    toolApplyEnabled: false;
    targetApplyEnabled: false;
    bankActionsEnabled: false;
    paymentInitiationEnabled: false;
    financePostingEnabled: false;
    liveAiEnabled: false;
    productionDeployEnabled: false;
    secretsReturned: false;
    privateKeysReturned: false;
  };
  queryStatus: "schema_ready" | "forbidden";
};

const governanceRoles: RoleKey[] = ["admin", "crays-management", "reviewer", "deal-manager", "finance", "expansion-manager", "studio-manager"];

function boundaries(): ExternalPreflightReadModel["boundaries"] {
  return {
    internalPreflightReadsEnabled: true,
    externalPreviewReleased: false,
    publicReleaseEnabled: false,
    candidateReleaseEnabled: false,
    partnerReleaseEnabled: false,
    bankReleaseEnabled: false,
    ownerReleaseEnabled: false,
    memberExternalSendingEnabled: false,
    externalSendingEnabled: false,
    uploadsEnabled: false,
    privatePreviewEnabled: false,
    fileBodyAccessEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    toolApplyEnabled: false,
    targetApplyEnabled: false,
    bankActionsEnabled: false,
    paymentInitiationEnabled: false,
    financePostingEnabled: false,
    liveAiEnabled: false,
    productionDeployEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

function accessForRole(role: RoleKey): ExternalPreflightReadModel["access"] {
  if (governanceRoles.includes(role)) {
    return {
      role,
      allowed: true,
      level: "external_preflight_control",
      reason: "Role can review all release-gated external preflight rooms without publishing or sending them.",
      canStagePreflightReview: ["admin", "crays-management", "reviewer", "deal-manager", "finance", "studio-manager"].includes(role),
      visibleAudiences: null,
    };
  }

  if (role === "franchise-candidate") {
    return { role, allowed: true, level: "external_preflight_scope", reason: "Candidate can inspect candidate preflight readiness only; no release is executed.", canStagePreflightReview: false, visibleAudiences: ["candidate"] };
  }
  if (role === "franchise-partner") {
    return { role, allowed: true, level: "external_preflight_scope", reason: "Partner can inspect partner and opening preflight readiness only; no release is executed.", canStagePreflightReview: false, visibleAudiences: ["partner"] };
  }
  if (role === "bank-partner") {
    return { role, allowed: true, level: "external_preflight_scope", reason: "Bank Partner can inspect bank preflight readiness only; bank send remains closed.", canStagePreflightReview: false, visibleAudiences: ["bank"] };
  }
  if (role === "landlord") {
    return { role, allowed: true, level: "external_preflight_scope", reason: "Real estate stakeholder can inspect owner/property preflight readiness only; owner release remains closed.", canStagePreflightReview: false, visibleAudiences: ["real-estate"] };
  }
  if (role === "gym-member") {
    return { role, allowed: true, level: "external_preflight_scope", reason: "Member can inspect member-safe preflight readiness only; external sending and payment actions remain closed.", canStagePreflightReview: false, visibleAudiences: ["member"] };
  }

  return { role, allowed: false, level: "release_blocked", reason: "No external preflight is released for this role.", canStagePreflightReview: false, visibleAudiences: [] };
}

function title(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function optionRows<T>(items: T[], selector: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, rows]) => ({ key, label: title(key), rows }));
}

function statusFrom(input: { blockers: number; missing: number; redactions: number }): PreflightStatus {
  if (input.blockers > 0 || input.missing > 0) return "blocked";
  if (input.redactions > 0) return "review_required";
  return "ready";
}

function score(input: { sourceRecords: number; blockers: number; missing: number; redactions: number }) {
  const base = input.sourceRecords > 0 ? 82 : 45;
  return Math.max(0, Math.min(100, base - input.blockers * 8 - input.missing * 10 - input.redactions * 2));
}

function scopeRows(audit: Awaited<ReturnType<typeof getRoleScopeAuditReadModel>>, role: RoleKey) {
  return audit.rows.filter((row) => row.role === role);
}

function room(input: {
  key: AudienceKey;
  label: string;
  audienceRole: RoleKey;
  ownerRole: string;
  sourceRecords: number;
  packageRecords: number;
  auditRows: ReturnType<typeof scopeRows>;
  missingPrerequisites: string[];
  releaseGate: string;
  visibleFields: string[];
  redactedFields: string[];
  linkedObjects: ExternalPreflightRoom["linkedObjects"];
  currentState: string;
  nextAction: string;
  href: string;
}): ExternalPreflightRoom {
  const blockedChecks = input.auditRows.filter((row) => row.status === "blocked").length;
  const redactedChecks = input.auditRows.filter((row) => row.status === "redacted").length;
  const status = statusFrom({ blockers: blockedChecks, missing: input.missingPrerequisites.length, redactions: redactedChecks });

  return {
    key: input.key,
    label: input.label,
    audienceRole: input.audienceRole,
    ownerRole: input.ownerRole,
    status,
    visibilityScore: score({ sourceRecords: input.sourceRecords + input.packageRecords, blockers: blockedChecks, missing: input.missingPrerequisites.length, redactions: redactedChecks }),
    sourceRecords: input.sourceRecords,
    packageRecords: input.packageRecords,
    permissionChecks: input.auditRows.length,
    blockedChecks,
    redactedChecks,
    releaseGate: input.releaseGate,
    visibleFields: input.visibleFields,
    redactedFields: input.redactedFields,
    missingPrerequisites: input.missingPrerequisites,
    linkedObjects: input.linkedObjects,
    currentState: input.currentState,
    nextAction: input.nextAction,
    href: input.href,
  };
}

export async function getExternalPreflightReadModel(role: RoleKey): Promise<ExternalPreflightReadModel> {
  const access = accessForRole(role);
  if (!access.allowed) {
    return {
      access,
      summary: { rooms: 0, readyRooms: 0, reviewRequiredRooms: 0, blockedRooms: 0, sourceRecords: 0, packageRecords: 0, permissionChecks: 0, blockedChecks: 0, redactedChecks: 0, missingPrerequisites: 0 },
      rooms: [],
      controls: { audiences: [], statuses: [], owners: [] },
      actions: { stagePreflightReviewAllowed: false, commandRoute: "/api/crays/core-command/sync-preview", confirmationHeader: "stage-sync-preview-command", applyGate: "OPEN_DEV_SYNC_APPLY" },
      boundaries: boundaries(),
      queryStatus: "forbidden",
    };
  }

  const [evidenceInternal, evidenceCandidate, evidencePartner, evidenceBank, evidenceRealEstate, candidateDealRoom, bankReadiness, partnerDecision, memberData, supportMember, roleAudit] = await Promise.all([
    getEvidencePackagesReadModel("reviewer"),
    getEvidencePackagesReadModel("franchise-candidate"),
    getEvidencePackagesReadModel("franchise-partner"),
    getEvidencePackagesReadModel("bank-partner"),
    getEvidencePackagesReadModel("landlord"),
    getCandidateDealRoomReadiness("franchise-candidate"),
    getBankPackageReadiness("bank-partner"),
    getFranchisePartnerDecisionReadModel("franchise-partner"),
    getB2cMemberDatabaseReadModel("gym-member"),
    getSupportRecoveryReadModel("gym-member"),
    getRoleScopeAuditReadModel("admin"),
  ]);

  const rooms = [
    room({
      key: "candidate",
      label: "Candidate Deal Room preflight",
      audienceRole: "franchise-candidate",
      ownerRole: "Deal Manager",
      sourceRecords: candidateDealRoom.summary.sections + candidateDealRoom.summary.evidencePackages + candidateDealRoom.summary.approvedDocumentLinks,
      packageRecords: evidenceCandidate.summary.records,
      auditRows: scopeRows(roleAudit, "franchise-candidate"),
      missingPrerequisites: candidateDealRoom.summary.releaseRequiredSections > 0 ? ["Prepared offer release is still required.", "Evidence release is still required."] : [],
      releaseGate: "OPEN_CANDIDATE_DEAL_ROOM_RELEASE",
      visibleFields: ["Released offer summary", "Evidence package status", "Deal Room sections", "Intent readiness"],
      redactedFields: ["Internal scoring", "Raw source IDs", "Bank-only conditions", "Unreleased document body"],
      linkedObjects: [{ label: "Candidate Deal Room", type: "candidate-deal-room", id: "candidate_deal_room_preflight" }],
      currentState: `${candidateDealRoom.summary.sections} candidate sections are preflighted; ${candidateDealRoom.summary.releaseRequiredSections} still require release.`,
      nextAction: "Resolve candidate release prerequisites and keep Candidate release closed.",
      href: "/pre-packed-deals/candidate",
    }),
    room({
      key: "partner",
      label: "Franchise Partner decision preflight",
      audienceRole: "franchise-partner",
      ownerRole: "Deal Manager",
      sourceRecords: partnerDecision.summary.records,
      packageRecords: evidencePartner.summary.records,
      auditRows: scopeRows(roleAudit, "franchise-partner"),
      missingPrerequisites: partnerDecision.summary.blockers > 0 ? [`${partnerDecision.summary.blockers} partner decision blockers remain.`] : [],
      releaseGate: "OPEN_FRANCHISE_PARTNER_DECISION_RELEASE",
      visibleFields: ["Investment summary", "Opening readiness", "Package status", "Partner-safe KPIs"],
      redactedFields: ["Candidate private notes", "Bank-only conditions", "Internal reviewer comments", "Raw source IDs"],
      linkedObjects: [{ label: partnerDecision.decisionContext.partnerCompany, type: "partner-decision", id: partnerDecision.decisionContext.decisionId }],
      currentState: `${partnerDecision.summary.records} partner-scoped decision records are ready for preflight review.`,
      nextAction: "Review partner redactions and keep Partner release closed.",
      href: "/analytics?role=franchise-partner&view=partner-decision",
    }),
    room({
      key: "bank",
      label: "Bank package preflight",
      audienceRole: "bank-partner",
      ownerRole: "Finance",
      sourceRecords:
        bankReadiness.summary.bankPackages +
        bankReadiness.summary.loanCases +
        bankReadiness.summary.financialModels +
        bankReadiness.summary.documentPackageLinks +
        bankReadiness.summary.candidateIntents,
      packageRecords: evidenceBank.summary.records,
      auditRows: scopeRows(roleAudit, "bank-partner"),
      missingPrerequisites: bankReadiness.summary.blockedPrerequisites > 0 ? [`${bankReadiness.summary.blockedPrerequisites} bank package prerequisites are blocked.`] : [],
      releaseGate: "OPEN_BANK_PACKAGE_RELEASE",
      visibleFields: ["Package checklist", "Condition status", "Evidence metadata", "Redaction state"],
      redactedFields: ["Candidate PII beyond release scope", "Internal financing notes", "Source-of-funds documents", "Unreleased file body"],
      linkedObjects: [{ label: "Bank package readiness", type: "bank-package", id: "bank_package_preflight" }],
      currentState: `${bankReadiness.summary.bankPackages} bank packages and ${bankReadiness.summary.loanCases} loan cases are checked with bank send closed.`,
      nextAction: "Resolve blocked bank sections; do not send to bank.",
      href: "/loans?role=bank-partner&view=package-readiness&record=packages",
    }),
    room({
      key: "real-estate",
      label: "Owner and real-estate preflight",
      audienceRole: "landlord",
      ownerRole: "Expansion Manager",
      sourceRecords: evidenceRealEstate.summary.records,
      packageRecords: evidenceRealEstate.summary.packages,
      auditRows: scopeRows(roleAudit, "landlord"),
      missingPrerequisites: evidenceRealEstate.summary.blockers > 0 ? [`${evidenceRealEstate.summary.blockers} property package blockers remain.`] : [],
      releaseGate: "OPEN_OWNER_PROPERTY_RELEASE",
      visibleFields: ["Lease decision status", "Property package metadata", "Owner action status", "Handover readiness"],
      redactedFields: ["Candidate economics", "Bank package conditions", "Internal location scoring", "Raw source IDs"],
      linkedObjects: [{ label: evidenceInternal.context.propertyCaseId, type: "property-case", id: evidenceInternal.context.propertyCaseId }],
      currentState: `${evidenceRealEstate.summary.records} owner/property records are available as metadata-only preflight.`,
      nextAction: "Review owner-safe redactions and keep owner release closed.",
      href: "/project?role=landlord&view=real-estate-decision",
    }),
    room({
      key: "member",
      label: "Member support and payment preflight",
      audienceRole: "gym-member",
      ownerRole: "Studio Manager",
      sourceRecords: memberData.summary.records + supportMember.summary.records,
      packageRecords: 0,
      auditRows: scopeRows(roleAudit, "gym-member"),
      missingPrerequisites: supportMember.summary.blockers > 0 ? [`${supportMember.summary.blockers} member support blockers remain.`] : [],
      releaseGate: "OPEN_MEMBER_COMMUNICATION_RELEASE",
      visibleFields: ["Own support status", "Own membership status", "Safe payment state", "Next studio action"],
      redactedFields: ["Other members", "Internal recovery notes", "Payment instrument references", "Finance posting detail"],
      linkedObjects: [{ label: supportMember.supportContext.studioName, type: "studio", id: supportMember.supportContext.studioId }],
      currentState: `${supportMember.summary.records} member-safe support records and ${memberData.summary.records} member database records are preflighted.`,
      nextAction: "Keep member external sending and payment actions closed until approved communication policy exists.",
      href: "/support?role=gym-member",
    }),
    room({
      key: "guest",
      label: "Guest public discovery boundary",
      audienceRole: "guest",
      ownerRole: "CRAYS Management",
      sourceRecords: 0,
      packageRecords: 0,
      auditRows: scopeRows(roleAudit, "guest"),
      missingPrerequisites: ["No public/candidate release has been approved."],
      releaseGate: "OPEN_PUBLIC_DISCOVERY_RELEASE",
      visibleFields: ["Public teaser only", "No account data", "No internal package state"],
      redactedFields: ["All Core object detail", "Source records", "Private package metadata", "Command controls"],
      linkedObjects: [{ label: "Public discovery shell", type: "public-surface", id: "guest_discovery_boundary" }],
      currentState: "Guest remains release-blocked from internal preflight records.",
      nextAction: "Keep Guest as a public boundary until an explicit public release decision exists.",
      href: "/pre-packed-deals",
    }),
  ];

  const visibleRooms = access.visibleAudiences ? rooms.filter((item) => access.visibleAudiences?.includes(item.key)) : rooms;

  return {
    access,
    summary: {
      rooms: visibleRooms.length,
      readyRooms: visibleRooms.filter((item) => item.status === "ready").length,
      reviewRequiredRooms: visibleRooms.filter((item) => item.status === "review_required").length,
      blockedRooms: visibleRooms.filter((item) => item.status === "blocked").length,
      sourceRecords: visibleRooms.reduce((total, item) => total + item.sourceRecords, 0),
      packageRecords: visibleRooms.reduce((total, item) => total + item.packageRecords, 0),
      permissionChecks: visibleRooms.reduce((total, item) => total + item.permissionChecks, 0),
      blockedChecks: visibleRooms.reduce((total, item) => total + item.blockedChecks, 0),
      redactedChecks: visibleRooms.reduce((total, item) => total + item.redactedChecks, 0),
      missingPrerequisites: visibleRooms.reduce((total, item) => total + item.missingPrerequisites.length, 0),
    },
    rooms: visibleRooms,
    controls: {
      audiences: optionRows(visibleRooms, (item) => item.key),
      statuses: optionRows(visibleRooms, (item) => item.status),
      owners: optionRows(visibleRooms, (item) => item.ownerRole),
    },
    actions: { stagePreflightReviewAllowed: access.canStagePreflightReview, commandRoute: "/api/crays/core-command/sync-preview", confirmationHeader: "stage-sync-preview-command", applyGate: "OPEN_DEV_SYNC_APPLY" },
    boundaries: boundaries(),
    queryStatus: "schema_ready",
  };
}
