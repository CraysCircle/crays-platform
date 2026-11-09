import { getCrmAdapterReadiness } from "@/db/crm-adapter-readiness-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getCrmAdapterReadiness(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: readModel.liveBusinessRecordsReturned,
      note: readModel.access.allowed
        ? "This endpoint returns CRM adapter readiness only. It does not create CRM records, write pipeline data, expose source UI, call source APIs, upload files or send messages."
        : "CRM adapter readiness requires internal CRM review scope.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
