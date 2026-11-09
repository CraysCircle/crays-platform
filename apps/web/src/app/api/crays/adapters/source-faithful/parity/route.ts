import { getProjectCrmParityContract } from "@/lib/source-faithful-product-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getProjectCrmParityContract(role);

  return Response.json(
    {
      status: contract.access.allowed ? "ready" : "forbidden",
      contract,
      liveBusinessRecordReturned: false,
      note: "Project and CRM AI/settings parity contract only. No live AI call, source write, provider call, upload, external send or source UI exposure is enabled.",
    },
    { status: contract.access.allowed ? 200 : 403 },
  );
}
