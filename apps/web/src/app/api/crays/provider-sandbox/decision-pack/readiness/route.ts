import { NextResponse } from "next/server";
import { getProviderSandboxDecisionPack } from "@/lib/provider-sandbox-pilot-readiness-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getProviderSandboxDecisionPack(role);
  const status = contract.access.allowed ? 200 : 403;

  return NextResponse.json(
    {
      status: contract.status,
      contract,
      sandboxExecutionApproved: false,
      liveProviderCallsPerformed: false,
    },
    { status },
  );
}
