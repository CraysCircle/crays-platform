import {
  buildControlledBetaReadiness,
  controlledBetaReadinessAccessForRole,
  emptyControlledBetaReadiness,
  type ControlledBetaReadiness,
} from "@/lib/controlled-beta-readiness-contract";
import type { RoleKey } from "@/lib/roles";
import { getPilotCloseoutReleaseDecisionReadiness } from "./pilot-closeout-release-decision-repository";

export async function getControlledBetaReadiness(role: RoleKey): Promise<ControlledBetaReadiness> {
  const access = controlledBetaReadinessAccessForRole(role);
  const shell = emptyControlledBetaReadiness(role);

  if (!access.allowed) {
    return shell;
  }

  const closeout = await getPilotCloseoutReleaseDecisionReadiness("admin");
  return buildControlledBetaReadiness(role, { closeout });
}
