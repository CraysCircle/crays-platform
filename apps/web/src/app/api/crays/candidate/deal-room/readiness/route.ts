import { getCandidateDealRoomReadiness } from "@/db/candidate-deal-room-readiness-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getCandidateDealRoomReadiness(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: readModel.liveDealRoomRecordsReturned,
      note: readModel.access.allowed
        ? "This endpoint returns Candidate Deal Room readiness only. It does not release offers, return unreleased detail, start KYC/AML, create bank packages or send messages."
        : "Candidate Deal Room readiness requires Candidate, Deal Manager or review scope.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
