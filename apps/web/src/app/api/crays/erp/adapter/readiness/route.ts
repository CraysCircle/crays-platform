import { getErpFinanceAdapterReadiness } from "@/db/erp-finance-adapter-readiness-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getErpFinanceAdapterReadiness(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: readModel.liveBusinessRecordsReturned,
      note: readModel.access.allowed
        ? "This endpoint returns ERP / Finance adapter readiness only. It does not create invoices, execute payments, export accounting data, send bank packages, expose source UI, call source APIs, upload files or send messages."
        : "ERP / Finance adapter readiness requires internal finance scope or an approved future scoped finance shell.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
