import { getPreparedOfferReleaseReadiness } from "@/db/prepared-offer-release-readiness-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const offerId = url.searchParams.get("offerId") ?? undefined;
  const readModel = await getPreparedOfferReleaseReadiness(role, offerId);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      note: readModel.access.allowed
        ? "This endpoint returns scoped CRAYS prepared-offer Candidate release readiness only. It does not release Candidate data or public teasers."
        : "Candidate release readiness stays with Deal Manager until an explicit release exists.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
