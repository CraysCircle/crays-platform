import { getCandidateIntentReviewReadModel } from "@/db/candidate-intent-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getCandidateIntentReviewReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: readModel.liveIntentRecordsReturned,
      note: readModel.access.allowed
        ? "This endpoint returns the CRAYS Candidate intent review read model. It does not start KYC/AML, equity check, bank package creation or external sending."
        : "Candidate intent review requires Deal Manager or review scope.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
