import { getAnalyticsManagementKpiReadModel } from "@/db/analytics-management-kpi-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getAnalyticsManagementKpiReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveSourceApplyPerformed: false,
      targetApplyPerformed: false,
      reportPublished: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
