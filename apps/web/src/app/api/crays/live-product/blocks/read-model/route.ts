import { getLiveProductBlocksReadModel } from "@/lib/live-product-blocks";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getLiveProductBlocksReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      note: readModel.access.allowed
        ? "Live-product matrix with role scope, engine preservation, CRAYS orchestration and closed gates."
        : "Live-product matrix is internal.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
