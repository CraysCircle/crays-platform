import { getCoreDomainReadModelContract, getCoreDomainRolePreview } from "@/lib/core-domain-contracts";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getCoreDomainReadModelContract("bank-packages");

  return Response.json({
    role,
    contract,
    rolePreview: getCoreDomainRolePreview(contract, role),
    liveBusinessDataReturned: false,
    note: "This is the CRAYS bank-package and loan-case read-model contract. No live bank, candidate or financing records are returned.",
  });
}
