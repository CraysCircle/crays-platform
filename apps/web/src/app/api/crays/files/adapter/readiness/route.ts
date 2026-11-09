import { getFilesAdapterReadiness } from "@/db/files-adapter-readiness-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getFilesAdapterReadiness(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: readModel.liveBusinessRecordsReturned,
      note: readModel.access.allowed
        ? "This endpoint returns Files metadata bridge readiness only. It does not upload files, preview private files, release public files, create external share links, expose source UI, call source APIs or send messages."
        : "Files adapter readiness requires internal document metadata scope or an approved release-gated shell.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
