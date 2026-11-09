import { getCandidatePreparedOfferReadModel } from "@/db/candidate-prepared-offer-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getCandidatePreparedOfferReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      note: readModel.access.allowed
        ? "This endpoint returns only Candidate-visible prepared offers after explicit CRAYS release. Unreleased internal review records are not returned."
        : "Candidate-visible prepared offers require a Candidate, Guest or review role.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
