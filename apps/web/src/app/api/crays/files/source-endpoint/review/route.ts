import { getSourceEndpointReview } from "@/lib/source-smoke-evidence-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getSourceEndpointReview("files", role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: false,
      note: "Files endpoint review evidence is metadata-only. The route does not call binary sources at runtime, download files, preview files, upload files, release files publicly or send externally.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
