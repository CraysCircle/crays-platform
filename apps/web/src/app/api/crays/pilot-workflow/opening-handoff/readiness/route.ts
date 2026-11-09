import { getOpeningHandoffPilotReadiness } from "@/db/pilot-opening-handoff-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getOpeningHandoffPilotReadiness(role);

  return Response.json(
    {
      status: readModel.status,
      readModel,
      liveBusinessRecordsReturned: readModel.liveBusinessRecordsReturned,
      workItemsWritten: false,
      operationsTasksWritten: false,
      externalNotificationsSent: false,
      toolApplyEnabled: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      fileUploadEnabled: false,
      externalSendingEnabled: false,
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
