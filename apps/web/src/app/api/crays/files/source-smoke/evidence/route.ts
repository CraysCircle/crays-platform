import { getSourceSmokeEvidence } from "@/lib/source-smoke-evidence-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getSourceSmokeEvidence("files", role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: false,
      note: "Files source-smoke evidence is metadata-only. No runtime source call, binary download, preview, upload, public release, source UI or external sending is enabled.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
