import { getCandidatePortalReadModel } from "./candidate-portal-read-model-repository";
import { getStakeholderPortalReadModel, type StakeholderPortalKey } from "./stakeholder-portal-read-model-repository";
import type { RoleKey } from "@/lib/roles";

const stakeholderPortals: Array<{ key: StakeholderPortalKey; role: RoleKey }> = [
  { key: "franchise-partner", role: "franchise-partner" },
  { key: "bank-partner", role: "bank-partner" },
  { key: "landlord", role: "landlord" },
];

export async function getStakeholderInteractionLoopsReadModel(role: RoleKey) {
  const reviewRole: RoleKey = ["admin", "crays-management", "reviewer"].includes(role) ? role : "reviewer";
  const [candidate, ...stakeholders] = await Promise.all([
    getCandidatePortalReadModel(role === "franchise-candidate" ? "franchise-candidate" : reviewRole),
    ...stakeholderPortals.map((portal) => getStakeholderPortalReadModel(portal.key, portal.role)),
  ]);

  return {
    access: {
      role,
      allowed: ["admin", "crays-management", "reviewer", "deal-manager", "franchise-candidate", "franchise-partner", "bank-partner", "landlord"].includes(role),
      reason: "Stakeholder loops are assembled from candidate-safe and relationship-scoped portal read models.",
    },
    status: "ready",
    summary: {
      candidateTasks: candidate.tasks.length,
      candidateDocuments: candidate.documents.length,
      candidateActions: candidate.actions.length,
      stakeholderPortals: stakeholders.length,
      stakeholderTasks: stakeholders.reduce((sum, portal) => sum + portal.tasks.length, 0),
      stakeholderDocuments: stakeholders.reduce((sum, portal) => sum + portal.documents.length, 0),
      stakeholderMessages: stakeholders.reduce((sum, portal) => sum + portal.messages.length, 0),
      blockers: stakeholders.reduce((sum, portal) => sum + portal.summary.blockers, 0),
    },
    loops: [
      {
        key: "candidate",
        label: "Candidate loop",
        role: "franchise-candidate",
        tasks: candidate.tasks.length,
        documents: candidate.documents.length,
        messages: candidate.summary.messages,
        currentState: candidate.currentState.title,
        nextAction: candidate.currentState.nextSafeAction,
      },
      ...stakeholders.map((portal) => ({
        key: portal.portal,
        label: portal.label,
        role: portal.role,
        tasks: portal.tasks.length,
        documents: portal.documents.length,
        messages: portal.messages.length,
        currentState: portal.relationship.title,
        nextAction: portal.actions.find((action) => action.status !== "locked")?.reason ?? "Continue through scoped portal work.",
      })),
    ],
    boundaries: {
      candidateSelfScopeRequired: candidate.boundaries.candidateSelfScopeRequired,
      relationshipScopeRequired: true,
      internalFieldsReturned: candidate.boundaries.internalFieldsReturned || stakeholders.some((portal) => portal.boundaries.internalFieldsReturned),
      privateStakeholderDataReturned: stakeholders.some((portal) => portal.boundaries.privateStakeholderDataReturned),
      fileUploadEnabled: candidate.boundaries.fileUploadEnabled || stakeholders.some((portal) => portal.boundaries.fileUploadEnabled),
      privatePreviewEnabled: stakeholders.some((portal) => portal.boundaries.privatePreviewEnabled),
      externalSendingEnabled: candidate.boundaries.externalSendingEnabled || stakeholders.some((portal) => portal.boundaries.externalSendingEnabled),
      stakeholderReleaseEnabled: stakeholders.some((portal) => portal.boundaries.stakeholderReleaseEnabled),
      sourceWritesEnabled: candidate.boundaries.sourceWritesEnabled || stakeholders.some((portal) => portal.boundaries.sourceWritesEnabled),
      targetApplyEnabled: candidate.boundaries.targetApplyEnabled || stakeholders.some((portal) => portal.boundaries.targetApplyEnabled),
    },
    note:
      "Block 105: Candidate and stakeholder loops are scoped by role/relationship and expose tasks, documents, messages and gate reasons instead of repeated generic tabs.",
  };
}
