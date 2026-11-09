import { getSourceFaithfulReadiness } from "@/lib/source-faithful-product-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getSourceFaithfulReadiness(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: false,
      note: "Aggregate module coverage with governed action boundaries. Further connected actions require product review.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
