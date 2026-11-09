import { allModuleBffContracts } from "@/lib/module-bff";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contracts = allModuleBffContracts(role);

  return Response.json({
    role,
    liveDataReturned: false,
    modules: contracts,
    note: "These are CRAYS module BFF contracts. Live module reads and writes are added after identity, scope and adapter checks are wired.",
  });
}
