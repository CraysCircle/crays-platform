import { getVisibleJourneyStagesForRole } from "@/lib/guest-candidate-journey";
import type { RoleKey } from "@/lib/roles";
import { getBankEvidenceFinancingPilotReadiness } from "./pilot-bank-evidence-financing-repository";
import { getCandidateDealRoomPilotReadiness } from "./pilot-candidate-deal-room-repository";
import { getCandidateEvidenceIntentPilotReadiness } from "./pilot-candidate-evidence-intent-repository";
import { getCandidateDealRoomReadiness } from "./candidate-deal-room-readiness-repository";
import { getCandidatePreparedOfferReadModel } from "./candidate-prepared-offer-read-model-repository";
import { getPublicDealPackageReadModel } from "./public-deal-package-read-model-repository";

export type CandidatePortalAccessLevel = "candidate_self_scope" | "review_scope" | "candidate_account_required" | "forbidden";
export type CandidatePortalItemStatus = "ready" | "available" | "blocked" | "locked" | "gated";

export type CandidatePortalTask = {
  key: string;
  label: string;
  owner: string;
  status: CandidatePortalItemStatus;
  current: string;
  nextAction: string;
  safeHref?: string;
};

export type CandidatePortalDocument = {
  key: string;
  label: string;
  status: CandidatePortalItemStatus;
  access: string;
  owner: RoleKey;
  current: string;
};

export type CandidatePortalAction = {
  key: string;
  label: string;
  status: "available" | "gated" | "disabled";
  href?: string;
  gate?: string;
  reason: string;
};

export type CandidatePortalReadModel = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    level: CandidatePortalAccessLevel;
    reason: string;
  };
  candidateScope: {
    selfScoped: boolean;
    candidateAccountMapped: boolean;
    selectedOfferId: string | null;
    horizontalAccessPrevented: true;
  };
  summary: {
    publicDealPackages: number;
    candidateVisibleOffers: number;
    dealRoomSections: number;
    availableSections: number;
    releaseRequiredSections: number;
    regulatedLockedSections: number;
    approvedDocumentLinks: number;
    messages: number;
    readyGates: number;
    totalGates: number;
  };
  currentState: {
    title: string;
    status: "waiting_for_release" | "ready" | "forbidden";
    blocker: string;
    nextSafeAction: string;
  };
  tasks: CandidatePortalTask[];
  documents: CandidatePortalDocument[];
  financeStages: CandidatePortalTask[];
  timeline: CandidatePortalTask[];
  actions: CandidatePortalAction[];
  boundaries: {
    publicDtoOnly: true;
    candidateSelfScopeRequired: true;
    internalFieldsReturned: false;
    candidatePrivateDataReturned: false;
    bankDataReturned: false;
    fileUploadEnabled: false;
    providerCallsEnabled: false;
    externalSendingEnabled: false;
    publicReleaseEnabled: false;
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    targetApplyEnabled: false;
  };
  sourceNotes: string[];
};

const candidatePortalReviewRoles: RoleKey[] = ["reviewer", "crays-management", "admin"];

function accessForRole(role: RoleKey): CandidatePortalReadModel["access"] {
  if (role === "franchise-candidate") {
    return {
      allowed: true,
      level: "candidate_self_scope",
      reason: "Franchise Candidate can open the candidate-safe portal for its own scoped journey.",
    };
  }

  if (candidatePortalReviewRoles.includes(role)) {
    return {
      allowed: true,
      level: "review_scope",
      reason: "Review roles can inspect the candidate-safe portal contract without receiving private candidate or bank data.",
    };
  }

  if (role === "guest") {
    return {
      allowed: false,
      level: "candidate_account_required",
      reason: "Candidate Portal requires a Franchise Candidate role and candidate account scope. Guests remain on public deal discovery.",
    };
  }

  return {
    allowed: false,
    level: "forbidden",
    reason: "Candidate Portal is scoped to Franchise Candidate and review roles only.",
  };
}

function statusFromGate(ready: boolean): CandidatePortalItemStatus {
  return ready ? "ready" : "blocked";
}

function statusFromSection(status: string): CandidatePortalItemStatus {
  if (status === "available") return "available";
  if (status === "regulated_gate_locked") return "locked";
  if (status === "intent_required") return "gated";
  return "blocked";
}

function statusFromStage(status: string): CandidatePortalItemStatus {
  if (status === "contract_ready") return "available";
  if (status.includes("review")) return "gated";
  return "blocked";
}

function buildActions(input: {
  candidateVisibleOffers: number;
  accountMapped: boolean;
  externalSendingEnabled: boolean;
}): CandidatePortalAction[] {
  const canIntent = input.candidateVisibleOffers > 0 && input.accountMapped;

  return [
    {
      key: "open-public-deals",
      label: "Open public deal discovery",
      status: "available",
      href: "/pre-packed-deals",
      reason: "Public discovery is safe and uses released Public DTOs only.",
    },
    {
      key: "review-documents",
      label: "Review document gates",
      status: "available",
      href: "/pre-packed-deals/candidate?tab=documents",
      reason: "Document states can be inspected without exposing file bodies or private previews.",
    },
    {
      key: "purchase-intent",
      label: "Submit purchase intent",
      status: canIntent ? "available" : "gated",
      href: canIntent ? "/pre-packed-deals/candidate?tab=finance" : undefined,
      gate: "CANDIDATE_PREPARED_OFFER_RELEASE_AND_ACCOUNT_SCOPE",
      reason: canIntent
        ? "A released Candidate offer and mapped account are available."
        : "Requires a released Candidate offer and mapped Candidate account. KYC, equity checks and bank package creation stay closed.",
    },
    {
      key: "deal-team-message",
      label: "Send Deal Team question",
      status: input.externalSendingEnabled ? "available" : "gated",
      href: input.externalSendingEnabled ? "/pre-packed-deals/candidate?tab=messages" : undefined,
      gate: "OPEN_DEV_CANDIDATE_EXTERNAL_MESSAGE_SEND",
      reason: input.externalSendingEnabled
        ? "Candidate communication is open for this scoped account."
        : "External sending is closed; the portal can show message readiness only.",
    },
  ];
}

export async function getCandidatePortalReadModel(role: RoleKey): Promise<CandidatePortalReadModel> {
  const access = accessForRole(role);

  if (!access.allowed) {
    return {
      configured: true,
      role,
      access,
      candidateScope: {
        selfScoped: false,
        candidateAccountMapped: false,
        selectedOfferId: null,
        horizontalAccessPrevented: true,
      },
      summary: {
        publicDealPackages: 0,
        candidateVisibleOffers: 0,
        dealRoomSections: 0,
        availableSections: 0,
        releaseRequiredSections: 0,
        regulatedLockedSections: 0,
        approvedDocumentLinks: 0,
        messages: 0,
        readyGates: 0,
        totalGates: 0,
      },
      currentState: {
        title: "Candidate Portal unavailable",
        status: "forbidden",
        blocker: access.reason,
        nextSafeAction: role === "guest" ? "Open public deal discovery." : "Use a Franchise Candidate or review role.",
      },
      tasks: [],
      documents: [],
      financeStages: [],
      timeline: [],
      actions: [
        {
          key: "open-public-deals",
          label: "Open public deal discovery",
          status: "available",
          href: "/pre-packed-deals",
          reason: "Guests can inspect released public deal DTOs only.",
        },
      ],
      boundaries: {
        publicDtoOnly: true,
        candidateSelfScopeRequired: true,
        internalFieldsReturned: false,
        candidatePrivateDataReturned: false,
        bankDataReturned: false,
        fileUploadEnabled: false,
        providerCallsEnabled: false,
        externalSendingEnabled: false,
        publicReleaseEnabled: false,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
      },
      sourceNotes: ["Candidate Portal denied before any candidate, private, bank or internal records are read."],
    };
  }

  const [
    publicPackages,
    preparedOffers,
    dealRoom,
    pilotDealRoom,
    evidenceIntent,
    bankEvidence,
  ] = await Promise.all([
    getPublicDealPackageReadModel("candidate"),
    getCandidatePreparedOfferReadModel("franchise-candidate"),
    getCandidateDealRoomReadiness("franchise-candidate"),
    getCandidateDealRoomPilotReadiness("franchise-candidate"),
    getCandidateEvidenceIntentPilotReadiness("franchise-candidate"),
    getBankEvidenceFinancingPilotReadiness("franchise-candidate"),
  ]);

  const accountMapped = false;
  const readyGates = dealRoom.readinessGates.filter((gate) => gate.ready).length;
  const totalGates = dealRoom.readinessGates.length;
  const selectedOfferId = preparedOffers.records[0]?.offerId ?? null;
  const hasCandidateOffer = preparedOffers.summary.total > 0;

  const tasks: CandidatePortalTask[] = [
    ...dealRoom.readinessGates.map((gate) => ({
      key: gate.key,
      label: gate.label,
      owner: gate.key === "account-scope" ? "Candidate" : "CRAYS",
      status: statusFromGate(gate.ready),
      current: gate.current,
      nextAction: gate.ready ? "Continue to the next visible Candidate Portal section." : gate.requiredFor,
      safeHref: gate.key === "offer-release" ? "/pre-packed-deals" : undefined,
    })),
    ...evidenceIntent.actionModels.map((action) => ({
      key: action.key,
      label: action.label,
      owner: "Candidate / CRAYS",
      status: action.status === "model_ready" ? ("gated" as const) : ("blocked" as const),
      current: action.current,
      nextAction: `${action.current} Gate: ${action.applyGate}.`,
      safeHref: undefined,
    })),
  ];

  const documents: CandidatePortalDocument[] = dealRoom.sections.map((section) => ({
    key: section.key,
    label: section.label,
    status: statusFromSection(section.status),
    access: section.candidateAccess.replaceAll("_", " "),
    owner: section.ownerRole,
    current: section.current,
  }));

  const financeStages: CandidatePortalTask[] = bankEvidence.stages.map((stage) => ({
    key: stage.key,
    label: stage.label,
    owner: "Finance",
    status: statusFromStage(stage.status),
    current: stage.current,
    nextAction: stage.requiredFor || "Continue only after Candidate intent, KYC/equity and CRAYS deal review gates are ready.",
  }));

  const timeline: CandidatePortalTask[] = getVisibleJourneyStagesForRole("franchise-candidate").map((stage) => ({
    key: stage.key,
    label: stage.label,
    owner: stage.primaryRole,
    status: statusFromStage(stage.status),
    current: stage.purpose,
    nextAction: stage.requiredBeforeNext.length
      ? `Requires: ${stage.requiredBeforeNext.join(", ")}.`
      : "No additional prerequisite is defined for this contract stage.",
  }));

  return {
    configured: publicPackages.configured && preparedOffers.configured && dealRoom.configured,
    role,
    access,
    candidateScope: {
      selfScoped: role === "franchise-candidate",
      candidateAccountMapped: accountMapped,
      selectedOfferId,
      horizontalAccessPrevented: true,
    },
    summary: {
      publicDealPackages: publicPackages.summary.total,
      candidateVisibleOffers: preparedOffers.summary.total,
      dealRoomSections: dealRoom.summary.sections,
      availableSections: dealRoom.summary.availableSections + pilotDealRoom.summary.candidateVisiblePackages,
      releaseRequiredSections: dealRoom.summary.releaseRequiredSections,
      regulatedLockedSections: dealRoom.summary.regulatedLockedSections,
      approvedDocumentLinks: dealRoom.summary.approvedDocumentLinks,
      messages: dealRoom.summary.messages,
      readyGates,
      totalGates,
    },
    currentState: {
      title: hasCandidateOffer ? "Candidate Deal Room ready for scoped review" : "Candidate Deal Room waiting for CRAYS release",
      status: hasCandidateOffer ? "ready" : "waiting_for_release",
      blocker: hasCandidateOffer
        ? "Candidate-visible offer records are available."
        : "No released Candidate offer is available for this account scope yet.",
      nextSafeAction: hasCandidateOffer
        ? "Review evidence, documents and financing gates before submitting intent."
        : "Review public deal discovery and wait for CRAYS to release a Candidate-safe package.",
    },
    tasks,
    documents,
    financeStages,
    timeline,
    actions: buildActions({
      candidateVisibleOffers: preparedOffers.summary.total,
      accountMapped,
      externalSendingEnabled: dealRoom.boundaries.externalSendingEnabled,
    }),
    boundaries: {
      publicDtoOnly: true,
      candidateSelfScopeRequired: true,
      internalFieldsReturned: false,
      candidatePrivateDataReturned: false,
      bankDataReturned: false,
      fileUploadEnabled: false,
      providerCallsEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
    },
    sourceNotes: [
      "Public deal inventory comes from PublicDealPackageDTO only.",
      "Candidate deal-room readiness is release-gated and does not return private candidate, bank or internal review data.",
      "Bank package and regulated checks stay locked until Candidate intent, KYC/equity and CRAYS review gates are satisfied.",
    ],
  };
}
