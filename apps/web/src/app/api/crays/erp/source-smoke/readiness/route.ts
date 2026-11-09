import { getModuleSourceSmokeFoundation } from "@/lib/module-source-smoke-foundation";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getModuleSourceSmokeFoundation("erp", role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: false,
      note: "ERP source-smoke foundation only. It does not call source APIs, return finance rows, execute finance writes, export accounting data, upload files or send externally.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
