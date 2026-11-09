import { getSourceEndpointReview } from "@/lib/source-smoke-evidence-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getSourceEndpointReview("crm", role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: false,
      note: "CRM endpoint review evidence only. The route does not call source systems at runtime, return payload bodies, expose source UI, execute writes, upload files or send externally.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
