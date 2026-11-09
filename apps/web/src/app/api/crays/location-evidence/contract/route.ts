import { getCoreDomainReadModelContract, getCoreDomainRolePreview } from "@/lib/core-domain-contracts";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getCoreDomainReadModelContract("location-evidence");

  return Response.json({
    role,
    contract,
    rolePreview: getCoreDomainRolePreview(contract, role),
    liveBusinessDataReturned: false,
    note: "This is the CRAYS location-evidence read-model contract. No live provider payloads, keys or location records are returned.",
  });
}
