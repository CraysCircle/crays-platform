import {
  buildCandidateEvidenceIntentPilotReadiness,
  candidateEvidenceIntentPilotAccessForRole,
  emptyCandidateEvidenceIntentPilotReadiness,
  type CandidateEvidenceIntentPilotReadiness,
} from "@/lib/pilot-candidate-evidence-intent-contract";
import type { RoleKey } from "@/lib/roles";
import { getCandidateDealRoomReadiness } from "./candidate-deal-room-readiness-repository";
import { getCandidateEvidenceReadModel } from "./candidate-evidence-read-model-repository";
import { getCandidateIntentReviewReadModel } from "./candidate-intent-repository";
import { getCoreCommandPersistenceReadiness } from "./core-command-persistence-readiness-repository";
import { getCandidateDealRoomPilotReadiness } from "./pilot-candidate-deal-room-repository";

export async function getCandidateEvidenceIntentPilotReadiness(role: RoleKey): Promise<CandidateEvidenceIntentPilotReadiness> {
  const access = candidateEvidenceIntentPilotAccessForRole(role);
  const shell = emptyCandidateEvidenceIntentPilotReadiness(role);

  if (!access.allowed) {
    return shell;
  }

  const [candidateRoom, candidateEvidence, coreCommandStore, candidateDealRoomPilot, intentReview] = await Promise.all([
    getCandidateDealRoomReadiness("franchise-candidate"),
    getCandidateEvidenceReadModel("franchise-candidate"),
    getCoreCommandPersistenceReadiness(),
    access.level === "internal_evidence_intent_control" ? getCandidateDealRoomPilotReadiness("deal-manager") : getCandidateDealRoomPilotReadiness("franchise-candidate"),
    access.level === "internal_evidence_intent_control" ? getCandidateIntentReviewReadModel("deal-manager") : Promise.resolve(null),
  ]);

  return buildCandidateEvidenceIntentPilotReadiness(role, {
    internalAssemblyPackages: access.level === "internal_evidence_intent_control" ? candidateDealRoomPilot.summary.internalAssemblyPackages : 0,
    candidateVisiblePackages: 0,
    releasedOffers: candidateRoom.summary.releasedOffers,
    evidenceOffers: candidateEvidence.summary.offers,
    evidencePackages: candidateEvidence.summary.evidencePackages,
    approvedDocumentLinks: candidateEvidence.summary.approvedDocumentLinks,
    intentRecords: intentReview?.summary.total ?? 0,
    purchaseIntents: intentReview?.summary.purchase ?? 0,
    financingIntents: intentReview?.summary.financing ?? 0,
    questionThreads: candidateRoom.summary.threads,
    messages: candidateRoom.summary.messages,
    communicationReady: candidateRoom.boundaries.communicationPersistenceReady,
    intentPersistenceReady: candidateRoom.boundaries.intentPersistenceReady,
    coreCommandStoreReady: coreCommandStore.migrationApplied,
    liveBusinessRecordsReturned: access.level === "internal_evidence_intent_control" && candidateDealRoomPilot.liveBusinessRecordsReturned,
  });
}
