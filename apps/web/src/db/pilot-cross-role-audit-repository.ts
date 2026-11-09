import {
  buildCrossRoleAuditPilotReadiness,
  crossRoleAuditPilotAccessForRole,
  emptyCrossRoleAuditPilotReadiness,
  type CrossRoleAuditPilotReadiness,
} from "@/lib/pilot-cross-role-audit-contract";
import type { RoleKey } from "@/lib/roles";
import { getBankEvidenceFinancingPilotReadiness } from "./pilot-bank-evidence-financing-repository";
import { getCandidateDealRoomPilotReadiness } from "./pilot-candidate-deal-room-repository";
import { getCandidateEvidenceIntentPilotReadiness } from "./pilot-candidate-evidence-intent-repository";
import { getLocationRentEconomicsPilotReadiness } from "./pilot-location-rent-economics-repository";
import { getOpeningHandoffPilotReadiness } from "./pilot-opening-handoff-repository";
import { getOwnerPropertyCheckPilotReadiness } from "./pilot-owner-property-check-repository";
import { getPreparedDealAssemblyReadiness } from "./pilot-prepared-deal-assembly-repository";

export async function getCrossRoleAuditPilotReadiness(role: RoleKey): Promise<CrossRoleAuditPilotReadiness> {
  const access = crossRoleAuditPilotAccessForRole(role);
  const shell = emptyCrossRoleAuditPilotReadiness(role);

  if (!access.allowed) {
    return shell;
  }

  const internal = access.level === "internal_pilot_control_tower";
  const [owner, economics, assembly, candidateRoom, candidateIntent, bank, opening] = await Promise.all([
    getOwnerPropertyCheckPilotReadiness(internal ? "deal-manager" : role),
    getLocationRentEconomicsPilotReadiness(internal ? "deal-manager" : role),
    getPreparedDealAssemblyReadiness(internal ? "deal-manager" : role),
    getCandidateDealRoomPilotReadiness(role === "franchise-candidate" ? "franchise-candidate" : "deal-manager"),
    getCandidateEvidenceIntentPilotReadiness(role === "franchise-candidate" ? "franchise-candidate" : "deal-manager"),
    getBankEvidenceFinancingPilotReadiness(role === "bank-partner" ? "bank-partner" : "finance"),
    getOpeningHandoffPilotReadiness(role === "franchise-partner" ? "franchise-partner" : "deal-manager"),
  ]);

  return buildCrossRoleAuditPilotReadiness(role, {
    ownerReadyGates: owner.gates.filter((gate) => gate.state === "read_only" || gate.state === "core_draft_only").length,
    economicsReadyGates: economics.summary.reviewedLocationAnalyses + economics.summary.rentPotentialModels + economics.summary.dealEconomicsModels,
    assemblyInternalPackages: assembly.summary.assemblyPackages,
    candidateVisiblePackages: candidateRoom.summary.candidateVisiblePackages,
    candidateActionModels: candidateIntent.summary.actionModels,
    bankReadyGates: bank.summary.readyGates,
    openingHandoffItems: opening.summary.openingHandoffItems,
    openingBlockedItems: opening.summary.blockedItems,
  });
}
