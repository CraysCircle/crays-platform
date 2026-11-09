import { getSourceSmokeEvidenceDashboard } from "@/lib/source-smoke-evidence-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getSourceSmokeEvidenceDashboard(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: false,
      note: "Aggregate source evidence for bounded read-only inspection. No runtime source call, source row, write, upload, provider call, control action, release or external sending is enabled.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
