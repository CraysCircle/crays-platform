import { getAdapterAuditContract } from "@/lib/adapter-audit-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getAdapterAuditContract(role);

  return Response.json(
    {
      status: contract.access.allowed ? "ready" : "forbidden",
      contract,
      liveBusinessRecordReturned: false,
      note: "Adapter audit scaffold only. It does not write audit events, execute source calls, run retries, reconcile data or perform control actions.",
    },
    { status: contract.access.allowed ? 200 : 403 },
  );
}
