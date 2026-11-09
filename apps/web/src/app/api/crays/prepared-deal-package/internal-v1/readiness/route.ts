import { NextResponse } from "next/server";
import { getPreparedDealInternalPackageV1 } from "@/lib/provider-sandbox-pilot-readiness-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getPreparedDealInternalPackageV1(role);
  const status = readModel.access.allowed ? 200 : 403;

  return NextResponse.json(
    {
      status: readModel.status,
      readModel,
      packageReleased: false,
      liveBusinessRecordsReturned: false,
    },
    { status },
  );
}
