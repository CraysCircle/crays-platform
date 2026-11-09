import { NextResponse } from "next/server";
import { getLocationIntelligenceAdapterDecision } from "@/lib/location-intelligence-adapter-decision-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getLocationIntelligenceAdapterDecision(role);
  const status = contract.access.allowed ? 200 : 403;

  return NextResponse.json(
    {
      status: contract.status,
      contract,
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
