import { getCandidateEvidenceReadModel } from "@/db/candidate-evidence-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getCandidateEvidenceReadModel(role, context.session.account?.id ?? null);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      note: readModel.access.allowed
        ? "This endpoint returns only Candidate-visible evidence and document links after explicit offer and evidence release."
        : "Candidate evidence requires account-scoped Candidate or review access.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
