import {
  buildOwnerPropertyCheckReadiness,
  emptyOwnerPropertyCheckReadiness,
  ownerPropertyCheckAccessForRole,
  type OwnerPropertyCheckPilotReadiness,
  type OwnerPropertyCheckPilotRecord,
} from "@/lib/pilot-owner-property-check-contract";
import type { RoleKey } from "@/lib/roles";
import { getPropertyCaseAnalysisReadiness, getPropertyCaseReviewReadModel } from "./property-case-review-repository";

function nextBestRoleAction(record: OwnerPropertyCheckPilotRecord) {
  if (record.caseStatus === "handoff_ready" && record.handoffStatus === "ready") {
    return "Prepare location, rent and economics review";
  }

  const blockingGate = record.gates.find((gate) => gate.status !== "ready");
  if (blockingGate) {
    return `Resolve ${blockingGate.label.toLowerCase()}`;
  }

  return "Review property-case handoff";
}

export async function getOwnerPropertyCheckPilotReadiness(role: RoleKey): Promise<OwnerPropertyCheckPilotReadiness> {
  const access = ownerPropertyCheckAccessForRole(role);
  const shell = emptyOwnerPropertyCheckReadiness(role);

  if (!access.allowed || access.level === "owner_scoped_property_shell") {
    return shell;
  }

  const review = await getPropertyCaseReviewReadModel(role);

  if (!review.access.allowed || review.records.length === 0) {
    return shell;
  }

  const records = await Promise.all(
    review.records.slice(0, 5).map(async (record): Promise<OwnerPropertyCheckPilotRecord> => {
      const analysis = await getPropertyCaseAnalysisReadiness(role, record.caseId);
      const counts = analysis.counts;
      const pilotRecord: OwnerPropertyCheckPilotRecord = {
        caseId: record.caseId,
        propertyId: record.propertyId,
        title: record.title,
        city: record.city,
        country: record.country,
        propertyStatus: record.propertyStatus,
        caseStatus: record.caseStatus,
        currentPhase: record.currentPhase,
        handoffStatus: record.handoffStatus,
        latestEventAt: record.latestEventAt,
        eventCount: record.eventCount,
        counts: {
          locationAnalyses: counts.locationAnalyses,
          reviewedLocationAnalyses: counts.reviewedLocationAnalyses,
          evidencePackages: counts.evidencePackages,
          documentLinks: counts.documentLinks,
          approvedDocumentLinks: counts.approvedDocumentLinks,
          workflowEvents: counts.workflowEvents,
        },
        gates: analysis.gates,
        nextBestRoleAction: "Review property-case handoff",
      };

      return {
        ...pilotRecord,
        nextBestRoleAction: nextBestRoleAction(pilotRecord),
      };
    }),
  );

  return buildOwnerPropertyCheckReadiness(role, records);
}
