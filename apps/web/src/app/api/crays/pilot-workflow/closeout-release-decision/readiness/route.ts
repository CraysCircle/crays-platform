import { getPilotCloseoutReleaseDecisionReadiness } from "@/db/pilot-closeout-release-decision-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getPilotCloseoutReleaseDecisionReadiness(role);

  return Response.json(
    {
      status: readModel.status,
      readModel,
      liveBusinessRecordsReturned: false,
      betaApproved: false,
      productionDeployPerformed: false,
      externalActionsPerformed: false,
      candidateReleaseEnabled: false,
      bankReleaseEnabled: false,
      publicReleaseEnabled: false,
      toolApplyEnabled: false,
      externalSendingEnabled: false,
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
