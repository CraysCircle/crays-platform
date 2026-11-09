import {
  buildCandidateDealRoomPilotReadiness,
  candidateDealRoomPilotAccessForRole,
  emptyCandidateDealRoomPilotReadiness,
  type CandidateDealRoomPilotReadiness,
} from "@/lib/pilot-candidate-deal-room-contract";
import type { RoleKey } from "@/lib/roles";
import { getCandidateDealRoomReadiness } from "./candidate-deal-room-readiness-repository";
import { getPreparedDealAssemblyReadiness } from "./pilot-prepared-deal-assembly-repository";

export async function getCandidateDealRoomPilotReadiness(role: RoleKey): Promise<CandidateDealRoomPilotReadiness> {
  const access = candidateDealRoomPilotAccessForRole(role);
  const shell = emptyCandidateDealRoomPilotReadiness(role);

  if (!access.allowed) {
    return shell;
  }

  const [candidateRoom, assembly] = await Promise.all([
    getCandidateDealRoomReadiness("franchise-candidate"),
    access.level === "internal_candidate_room_control" ? getPreparedDealAssemblyReadiness("deal-manager") : Promise.resolve(null),
  ]);

  return buildCandidateDealRoomPilotReadiness(role, {
    internalAssemblyPackages: assembly?.summary.assemblyPackages ?? 0,
    releasedOffers: candidateRoom.summary.releasedOffers,
    sections: candidateRoom.summary.sections,
    releaseRequiredSections: candidateRoom.summary.releaseRequiredSections,
    regulatedLockedSections: candidateRoom.summary.regulatedLockedSections,
    readinessGates: candidateRoom.readinessGates.length,
    readyGates: candidateRoom.readinessGates.filter((gate) => gate.ready).length,
    messages: candidateRoom.summary.messages,
    threads: candidateRoom.summary.threads,
    intentPersistenceReady: candidateRoom.boundaries.intentPersistenceReady,
    liveBusinessRecordsReturned: Boolean(assembly?.liveBusinessRecordsReturned),
  });
}
