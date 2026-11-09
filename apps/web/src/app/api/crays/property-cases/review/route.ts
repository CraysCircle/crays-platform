import { getPropertyCaseReviewReadModel } from "@/db/property-case-review-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getPropertyCaseReviewReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      note: readModel.access.allowed
        ? "This endpoint returns scoped CRAYS property-case review rows for Deal Manager, Expansion Manager and internal review. It does not upload files, call providers or send messages."
        : "Property-case review requires Deal Manager, Expansion Manager or internal review scope.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
