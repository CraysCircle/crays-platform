import { NextResponse } from "next/server";
import { getLocationIntelligenceNoCallScaffold } from "@/lib/provider-evidence-program-readiness-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const scaffold = getLocationIntelligenceNoCallScaffold(role);
  const status = scaffold.access.allowed ? 200 : 403;

  return NextResponse.json(
    {
      status: scaffold.status,
      scaffold,
      liveProviderCallsPerformed: false,
      liveProviderPayloadsReturned: false,
      liveBusinessRecordsReturned: false,
      liveOwnerPrivateDataReturned: false,
      liveCandidateDataReturned: false,
      liveBankDataReturned: false,
    },
    { status },
  );
}
