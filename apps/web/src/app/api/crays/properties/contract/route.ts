import { getCoreDomainReadModelContract, getCoreDomainRolePreview } from "@/lib/core-domain-contracts";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getCoreDomainReadModelContract("properties");

  return Response.json({
    role,
    contract,
    rolePreview: getCoreDomainRolePreview(contract, role),
    liveBusinessDataReturned: false,
    note: "This is the CRAYS property and property-case read-model contract. No live owner, property or candidate data are returned.",
  });
}
