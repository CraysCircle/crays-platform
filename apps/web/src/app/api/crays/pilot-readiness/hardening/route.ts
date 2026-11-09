import { NextResponse } from "next/server";
import { getPilotReadinessHardening } from "@/lib/provider-evidence-program-readiness-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getPilotReadinessHardening(role);
  const status = contract.access.allowed ? 200 : 403;

  return NextResponse.json(
    {
      status: contract.status,
      contract,
      liveProviderReadApproved: false,
      productionDeployPerformed: false,
      liveBusinessRecordsReturned: false,
    },
    { status },
  );
}
