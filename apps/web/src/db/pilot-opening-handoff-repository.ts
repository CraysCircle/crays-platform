import {
  buildOpeningHandoffPilotReadiness,
  emptyOpeningHandoffPilotReadiness,
  openingHandoffPilotAccessForRole,
  type OpeningHandoffPilotReadiness,
} from "@/lib/pilot-opening-handoff-contract";
import type { RoleKey } from "@/lib/roles";
import { getCoreCommandPersistenceReadiness } from "./core-command-persistence-readiness-repository";
import { getRealProjectNativeOperabilityReadModel } from "./project-native-read-model-repository";

export async function getOpeningHandoffPilotReadiness(role: RoleKey): Promise<OpeningHandoffPilotReadiness> {
  const access = openingHandoffPilotAccessForRole(role);
  const shell = emptyOpeningHandoffPilotReadiness(role);

  if (!access.allowed) {
    return shell;
  }

  const [project, coreCommandStore] = await Promise.all([
    getRealProjectNativeOperabilityReadModel(role),
    getCoreCommandPersistenceReadiness(),
  ]);

  return buildOpeningHandoffPilotReadiness(role, {
    project,
    coreCommandStoreReady: coreCommandStore.migrationApplied,
  });
}
