import { getCoreDomainReadModelContract, getCoreDomainRolePreview } from "@/lib/core-domain-contracts";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getCoreDomainReadModelContract("partner-web");

  return Response.json({
    role,
    contract,
    rolePreview: getCoreDomainRolePreview(contract, role),
    liveBusinessDataReturned: false,
    note: "This is the CRAYS partner-web contract for Banking Partner and Real Estate Partner surfaces. It returns rules only, not live partner, property, candidate or bank data.",
  });
}
