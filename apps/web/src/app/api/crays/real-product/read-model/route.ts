import { getRealProductReadModel } from "@/db/real-product-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const seedBatchId = url.searchParams.get("seedBatchId") ?? undefined;
  const readModel = await getRealProductReadModel(role, seedBatchId);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      note: readModel.access.allowed
        ? "Real-product workbench read model from CRAYS Core Dev records. All live calls, writes, uploads, external sending, bank sends and payments are disabled."
        : "Real-product workbench access requires an approved CRAYS role.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
