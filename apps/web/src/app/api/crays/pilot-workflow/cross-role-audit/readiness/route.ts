import { getCrossRoleAuditPilotReadiness } from "@/db/pilot-cross-role-audit-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getCrossRoleAuditPilotReadiness(role);

  return Response.json(
    {
      status: readModel.status,
      readModel,
      liveBusinessRecordsReturned: false,
      visibilityExpanded: false,
      externalActionsPerformed: false,
      candidateReleaseEnabled: false,
      bankReleaseEnabled: false,
      publicReleaseEnabled: false,
      externalSendingEnabled: false,
      toolApplyEnabled: false,
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
