import { NextResponse } from "next/server";
import { getProviderEvidenceArchitecture } from "@/lib/provider-evidence-architecture-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getProviderEvidenceArchitecture(role);
  const status = readModel.access.allowed ? 200 : 403;

  return NextResponse.json(
    {
      status: readModel.status,
      readModel,
      liveProviderCallsPerformed: false,
      liveSourceRecordsReturned: false,
      liveBusinessRecordsReturned: false,
      liveOwnerPrivateDataReturned: false,
      liveCandidateDataReturned: false,
      liveBankDataReturned: false,
    },
    { status },
  );
}
