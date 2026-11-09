import {
  bankEvidenceFinancingPilotAccessForRole,
  buildBankEvidenceFinancingPilotReadiness,
  emptyBankEvidenceFinancingPilotReadiness,
  type BankEvidenceFinancingPilotReadiness,
} from "@/lib/pilot-bank-evidence-financing-contract";
import type { RoleKey } from "@/lib/roles";
import { getBankPackageReadiness } from "./bank-package-readiness-repository";
import { getCoreCommandPersistenceReadiness } from "./core-command-persistence-readiness-repository";

export async function getBankEvidenceFinancingPilotReadiness(role: RoleKey): Promise<BankEvidenceFinancingPilotReadiness> {
  const access = bankEvidenceFinancingPilotAccessForRole(role);
  const shell = emptyBankEvidenceFinancingPilotReadiness(role);

  if (!access.allowed) {
    return shell;
  }

  const [bankReadiness, coreCommandStore] = await Promise.all([
    getBankPackageReadiness(role),
    getCoreCommandPersistenceReadiness(),
  ]);
  const internalCountsReturned = bankReadiness.bankPartnerScope.internalCountsReturned;

  return buildBankEvidenceFinancingPilotReadiness(role, {
    bankPackages: internalCountsReturned ? bankReadiness.summary.bankPackages : 0,
    loanCases: internalCountsReturned ? bankReadiness.summary.loanCases : 0,
    financialModels: internalCountsReturned ? bankReadiness.summary.financialModels : 0,
    documentPackageLinks: internalCountsReturned ? bankReadiness.summary.documentPackageLinks : 0,
    candidateIntents: internalCountsReturned ? bankReadiness.summary.candidateIntents : 0,
    releasedOffers: internalCountsReturned ? bankReadiness.summary.releasedOffers : 0,
    readyPrerequisites: internalCountsReturned ? bankReadiness.summary.readyPrerequisites : 0,
    blockedPrerequisites: internalCountsReturned ? bankReadiness.summary.blockedPrerequisites : 0,
    decisionRequiredPrerequisites: internalCountsReturned ? bankReadiness.summary.decisionRequiredPrerequisites : 0,
    prerequisites: internalCountsReturned ? bankReadiness.prerequisites.length : 0,
    coreCommandStoreReady: coreCommandStore.migrationApplied,
    internalCountsReturned,
  });
}
