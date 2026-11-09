import {
  buildPilotCloseoutReleaseDecisionReadiness,
  emptyPilotCloseoutReleaseDecisionReadiness,
  pilotCloseoutReleaseDecisionAccessForRole,
  type PilotCloseoutReleaseDecisionReadiness,
} from "@/lib/pilot-closeout-release-decision-contract";
import type { RoleKey } from "@/lib/roles";
import { getCrossRoleAuditPilotReadiness } from "./pilot-cross-role-audit-repository";

export async function getPilotCloseoutReleaseDecisionReadiness(role: RoleKey): Promise<PilotCloseoutReleaseDecisionReadiness> {
  const access = pilotCloseoutReleaseDecisionAccessForRole(role);
  const shell = emptyPilotCloseoutReleaseDecisionReadiness(role);

  if (!access.allowed) {
    return shell;
  }

  const crossRole = await getCrossRoleAuditPilotReadiness("deal-manager");

  return buildPilotCloseoutReleaseDecisionReadiness(role, { crossRole });
}
