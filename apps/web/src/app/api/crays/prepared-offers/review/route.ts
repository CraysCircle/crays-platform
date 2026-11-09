import { getPreparedOfferReviewReadModel } from "@/db/prepared-offer-review-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getPreparedOfferReviewReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      note: readModel.access.allowed
        ? "This endpoint returns scoped CRAYS prepared-offer draft review rows for internal Deal Manager review."
        : "Prepared-offer drafts stay with Deal Manager until a reviewed release exists.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
