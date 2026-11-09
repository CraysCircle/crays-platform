import {
  candidateDealPackageSections,
  type CandidateDealPackageSection,
  type CandidateDealPackageSectionKey,
} from "@/lib/candidate-deal-package-contract";
import { getCandidateIntentContract } from "@/lib/candidate-intent-contract";
import type { RoleKey } from "@/lib/roles";
import { getCandidateEvidenceReadModel } from "./candidate-evidence-read-model-repository";
import { getCandidateIntentPersistenceReadiness } from "./candidate-intent-persistence-readiness-repository";
import { getCandidatePreparedOfferReadModel } from "./candidate-prepared-offer-read-model-repository";
import { getCandidateThreadReadModel } from "./candidate-thread-read-model-repository";
import { getCoreDatabaseRuntimeState } from "./client";
import { getCommunicationPersistenceReadiness } from "./communication-persistence-readiness-repository";

const candidateDealRoomRoles: RoleKey[] = ["franchise-candidate", "deal-manager", "reviewer", "crays-management", "admin"];

export type CandidateDealRoomSectionStatus = "available" | "release_required" | "intent_required" | "regulated_gate_locked";

export type CandidateDealRoomSectionReadiness = {
  key: CandidateDealPackageSectionKey;
  label: string;
  visibleBeforeKyc: boolean;
  candidateAccess: CandidateDealPackageSection["candidateAccess"];
  ownerRole: RoleKey;
  status: CandidateDealRoomSectionStatus;
  current: string;
};

export type CandidateDealRoomReadinessReadModel = {
  configured: boolean;
  role: RoleKey;
  access: {
    allowed: boolean;
    reason: string;
  };
  summary: {
    releasedOffers: number;
    evidenceOffers: number;
    evidencePackages: number;
    approvedDocumentLinks: number;
    threads: number;
    messages: number;
    sections: number;
    availableSections: number;
    releaseRequiredSections: number;
    regulatedLockedSections: number;
  };
  sections: CandidateDealRoomSectionReadiness[];
  readinessGates: Array<{
    key: string;
    label: string;
    ready: boolean;
    current: string;
    requiredFor: string;
  }>;
  boundaries: {
    accountScopeRequired: true;
    preparedOfferReleaseRequired: true;
    evidenceReleaseRequired: true;
    communicationPersistenceReady: boolean;
    intentPersistenceReady: boolean;
    purchaseIntentWriteEnabled: false;
    financingIntentWriteEnabled: false;
    kycAmlStarted: false;
    equityCheckStarted: false;
    bankPackageCreated: false;
    fileUploadEnabled: false;
    providerCallsEnabled: false;
    externalSendingEnabled: false;
    publicReleaseEnabled: false;
  };
  liveDealRoomRecordsReturned: boolean;
  releasedOffersReturned: boolean;
  evidenceRecordsReturned: boolean;
  documentLinksReturned: boolean;
  liveThreadsReturned: false;
  liveMessagesReturned: false;
  candidatePrivateDataReturned: false;
  bankDataReturned: false;
  fileUploadEnabled: false;
  providerCallsEnabled: false;
  externalSendingEnabled: false;
  publicReleaseEnabled: false;
  secretsReturned: false;
  privateKeysReturned: false;
};

function accessForRole(role: RoleKey) {
  if (candidateDealRoomRoles.includes(role)) {
    return {
      allowed: true,
      reason: "Role can read Candidate Deal Room readiness after Candidate-visible release gates.",
    };
  }

  return {
    allowed: false,
    reason: "Candidate Deal Room readiness requires Candidate, Deal Manager or review scope.",
  };
}

function sectionStatus(section: CandidateDealPackageSection, releasedOffers: number, intentReady: boolean): CandidateDealRoomSectionStatus {
  if (section.candidateAccess === "regulated_gate") return "regulated_gate_locked";
  if (section.candidateAccess === "intent_required") return releasedOffers > 0 && intentReady ? "intent_required" : "release_required";
  return releasedOffers > 0 ? "available" : "release_required";
}

function statusCurrent(status: CandidateDealRoomSectionStatus) {
  if (status === "available") return "Candidate-visible";
  if (status === "intent_required") return "Intent gate pending";
  if (status === "regulated_gate_locked") return "Regulated gate locked";
  return "Release required";
}

function buildSections(releasedOffers: number, intentReady: boolean) {
  return candidateDealPackageSections.map((section) => {
    const status = sectionStatus(section, releasedOffers, intentReady);
    return {
      key: section.key,
      label: section.label,
      visibleBeforeKyc: section.visibleBeforeKyc,
      candidateAccess: section.candidateAccess,
      ownerRole: section.ownerRole,
      status,
      current: statusCurrent(status),
    };
  });
}

function emptySummary(): CandidateDealRoomReadinessReadModel["summary"] {
  return {
    releasedOffers: 0,
    evidenceOffers: 0,
    evidencePackages: 0,
    approvedDocumentLinks: 0,
    threads: 0,
    messages: 0,
    sections: 0,
    availableSections: 0,
    releaseRequiredSections: 0,
    regulatedLockedSections: 0,
  };
}

function summarizeSections(
  base: Omit<CandidateDealRoomReadinessReadModel["summary"], "sections" | "availableSections" | "releaseRequiredSections" | "regulatedLockedSections">,
  sections: CandidateDealRoomSectionReadiness[],
): CandidateDealRoomReadinessReadModel["summary"] {
  return {
    ...base,
    sections: sections.length,
    availableSections: sections.filter((section) => section.status === "available").length,
    releaseRequiredSections: sections.filter((section) => section.status === "release_required").length,
    regulatedLockedSections: sections.filter((section) => section.status === "regulated_gate_locked").length,
  };
}

export async function getCandidateDealRoomReadiness(role: RoleKey): Promise<CandidateDealRoomReadinessReadModel> {
  const runtime = getCoreDatabaseRuntimeState();
  const access = accessForRole(role);
  const communicationReadiness = await getCommunicationPersistenceReadiness();
  const intentReadiness = await getCandidateIntentPersistenceReadiness();
  const intentContract = getCandidateIntentContract(role);

  if (!access.allowed) {
    return {
      configured: runtime.configured,
      role,
      access,
      summary: emptySummary(),
      sections: [],
      readinessGates: [],
      boundaries: {
        accountScopeRequired: true,
        preparedOfferReleaseRequired: true,
        evidenceReleaseRequired: true,
        communicationPersistenceReady: communicationReadiness.migrationApplied,
        intentPersistenceReady: intentReadiness.migrationApplied,
        purchaseIntentWriteEnabled: false,
        financingIntentWriteEnabled: false,
        kycAmlStarted: false,
        equityCheckStarted: false,
        bankPackageCreated: false,
        fileUploadEnabled: false,
        providerCallsEnabled: false,
        externalSendingEnabled: false,
        publicReleaseEnabled: false,
      },
      liveDealRoomRecordsReturned: false,
      releasedOffersReturned: false,
      evidenceRecordsReturned: false,
      documentLinksReturned: false,
      liveThreadsReturned: false,
      liveMessagesReturned: false,
      candidatePrivateDataReturned: false,
      bankDataReturned: false,
      fileUploadEnabled: false,
      providerCallsEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    };
  }

  const [preparedOffers, evidence, threads] = await Promise.all([
    getCandidatePreparedOfferReadModel("franchise-candidate"),
    getCandidateEvidenceReadModel("franchise-candidate"),
    getCandidateThreadReadModel("franchise-candidate"),
  ]);
  const sections = buildSections(preparedOffers.summary.total, intentReadiness.migrationApplied);
  const summary = summarizeSections(
    {
      releasedOffers: preparedOffers.summary.total,
      evidenceOffers: evidence.summary.offers,
      evidencePackages: evidence.summary.evidencePackages,
      approvedDocumentLinks: evidence.summary.approvedDocumentLinks,
      threads: threads.summary.threads,
      messages: threads.summary.messages,
    },
    sections,
  );

  return {
    configured: runtime.configured && preparedOffers.configured && evidence.configured && threads.configured,
    role,
    access,
    summary,
    sections,
    readinessGates: [
      {
        key: "account-scope",
        label: "Candidate account scope",
        ready: false,
        current: "Account mapping required for deal detail.",
        requiredFor: "Offer summary, evidence, documents and messages.",
      },
      {
        key: "offer-release",
        label: "Prepared offer release",
        ready: preparedOffers.summary.total > 0,
        current: preparedOffers.summary.total > 0 ? "Released offer records available." : "No released offer records.",
        requiredFor: "Candidate Deal Room sections before KYC.",
      },
      {
        key: "evidence-release",
        label: "Evidence release",
        ready: evidence.summary.evidencePackages > 0 || evidence.summary.approvedDocumentLinks > 0,
        current: `${evidence.summary.evidencePackages} evidence packages, ${evidence.summary.approvedDocumentLinks} approved document links.`,
        requiredFor: "Evidence and document previews.",
      },
      {
        key: "communication-persistence",
        label: "Communication persistence",
        ready: communicationReadiness.migrationApplied,
        current: communicationReadiness.migrationApplied ? "Schema ready, no live messages returned." : "Schema not applied.",
        requiredFor: "Deal Manager thread scope.",
      },
      {
        key: "intent-persistence",
        label: "Intent persistence",
        ready: intentReadiness.migrationApplied,
        current: intentReadiness.migrationApplied ? "Schema ready, writes still gated." : "Schema not applied.",
        requiredFor: "Purchase or financing intent records.",
      },
    ],
    boundaries: {
      accountScopeRequired: true,
      preparedOfferReleaseRequired: true,
      evidenceReleaseRequired: true,
      communicationPersistenceReady: communicationReadiness.migrationApplied,
      intentPersistenceReady: intentReadiness.migrationApplied,
      purchaseIntentWriteEnabled: intentContract.boundary.purchaseIntentWriteEnabled,
      financingIntentWriteEnabled: intentContract.boundary.financingIntentWriteEnabled,
      kycAmlStarted: intentContract.currentState.kycAmlStarted,
      equityCheckStarted: intentContract.currentState.equityCheckStarted,
      bankPackageCreated: intentContract.currentState.bankPackageCreated,
      fileUploadEnabled: false,
      providerCallsEnabled: false,
      externalSendingEnabled: intentContract.boundary.externalSendingEnabled,
      publicReleaseEnabled: false,
    },
    liveDealRoomRecordsReturned: preparedOffers.liveCandidateVisibleRecordsReturned || evidence.liveCandidateVisibleRecordsReturned || threads.liveThreadsReturned,
    releasedOffersReturned: preparedOffers.liveCandidateVisibleRecordsReturned,
    evidenceRecordsReturned: evidence.evidenceRecordsReturned,
    documentLinksReturned: evidence.documentLinksReturned,
    liveThreadsReturned: false,
    liveMessagesReturned: false,
    candidatePrivateDataReturned: false,
    bankDataReturned: false,
    fileUploadEnabled: false,
    providerCallsEnabled: false,
    externalSendingEnabled: false,
    publicReleaseEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
