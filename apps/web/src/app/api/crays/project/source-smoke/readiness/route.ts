import { getModuleSourceSmokeFoundation } from "@/lib/module-source-smoke-foundation";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getModuleSourceSmokeFoundation("project", role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: false,
      note: "Project source-smoke foundation only. It does not call source APIs, return source rows, execute writes, expose source UI, upload files or send externally.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
