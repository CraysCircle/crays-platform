import { getPackageReadinessExpansionContract } from "@/lib/package-readiness-expansion-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getPackageReadinessExpansionContract(role);

  return Response.json(
    {
      status: contract.access.allowed ? "ready" : "forbidden",
      contract,
      liveBusinessRecordReturned: false,
      note: "Package readiness expansion only. It does not create packages, release lender packages, upload files, call providers or return live package records.",
    },
    { status: contract.access.allowed ? 200 : 403 },
  );
}
