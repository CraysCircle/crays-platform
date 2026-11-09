import { getModuleSettingsParity } from "@/lib/source-faithful-product-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getModuleSettingsParity("crm", role);

  return Response.json(
    {
      status: contract.access.allowed ? "ready" : "forbidden",
      contract,
      liveBusinessRecordReturned: false,
      note: "CRM settings parity map only. Settings writes, source writes, workflow automation, provider calls and external sending remain disabled.",
    },
    { status: contract.access.allowed ? 200 : 403 },
  );
}
