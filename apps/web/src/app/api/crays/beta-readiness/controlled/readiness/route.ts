import { getControlledBetaReadiness } from "@/db/controlled-beta-readiness-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getControlledBetaReadiness(role);

  return Response.json(
    {
      status: readModel.status,
      readModel,
      betaApproved: false,
      betaLaunched: false,
      productionDeployPerformed: false,
      externalActionsPerformed: false,
      openedExactGates: 0,
      toolApplyEnabled: false,
      externalSendingEnabled: false,
      candidateReleaseEnabled: false,
      bankReleaseEnabled: false,
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
