import { getOperatingPlatformPrototypeReadiness } from "@/db/operating-platform-prototype-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getOperatingPlatformPrototypeReadiness(role);

  return Response.json(
    {
      status: readModel.status,
      readModel,
      liveActionsExecuted: false,
      productionDeployPerformed: false,
      externalActionsPerformed: false,
      toolApplyEnabled: false,
      fileUploadEnabled: false,
      externalSendingEnabled: false,
      candidateReleaseEnabled: false,
      bankReleaseEnabled: false,
      paymentInitiationEnabled: false,
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
