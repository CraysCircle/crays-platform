import { getCoreDomainReadModelContract, getCoreDomainRolePreview } from "@/lib/core-domain-contracts";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getCoreDomainReadModelContract("prepared-offers");

  return Response.json({
    role,
    contract,
    rolePreview: getCoreDomainRolePreview(contract, role),
    liveBusinessDataReturned: false,
    note: "This is the CRAYS prepared-offer read-model contract. No live deals, candidates, properties or bank records are returned.",
  });
}
