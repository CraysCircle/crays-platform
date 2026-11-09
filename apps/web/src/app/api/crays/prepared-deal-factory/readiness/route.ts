import { NextResponse } from "next/server";
import { getPreparedDealFactoryReadiness } from "@/lib/prepared-deal-factory-readiness-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getPreparedDealFactoryReadiness(role);
  const status = readModel.access.allowed ? 200 : 403;

  return NextResponse.json(
    {
      status: readModel.status,
      readModel,
      liveBusinessRecordReturned: false,
      liveProviderPayloadsReturned: false,
      liveCandidateDataReturned: false,
      liveBankDataReturned: false,
    },
    { status },
  );
}
