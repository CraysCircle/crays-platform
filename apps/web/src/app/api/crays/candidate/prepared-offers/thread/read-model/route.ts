import { getCandidateThreadReadModel } from "@/db/candidate-thread-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getCandidateThreadReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      note: readModel.access.allowed
        ? "This endpoint returns Candidate thread scope only. Live conversations, messages, provider payloads and external sending are disabled."
        : "Candidate threads require Candidate, Deal Manager or review scope.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
