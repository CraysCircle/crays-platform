import { getModuleSourceSmokeFoundation } from "@/lib/module-source-smoke-foundation";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getModuleSourceSmokeFoundation("files", role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: false,
      note: "Files source-smoke foundation only. It does not download binaries, preview files, upload files, release files publicly or expose external share links.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
