import { NextResponse } from "next/server";
import { getEvidenceWorkflowReadiness } from "@/lib/provider-evidence-program-readiness-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = getEvidenceWorkflowReadiness(role);
  const status = readModel.access.allowed ? 200 : 403;

  return NextResponse.json(
    {
      status: readModel.status,
      readModel,
      ownerSubmissionWritePerformed: false,
      liveBusinessRecordsReturned: false,
    },
    { status },
  );
}
