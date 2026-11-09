import { getLocalhostAdapterCoverageReadModel } from "@/db/localhost-adapter-coverage-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getLocalhostAdapterCoverageReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      note: readModel.access.allowed
        ? "This endpoint verifies Localhost surface coverage against Core read models, command history, source maps and adapter readiness. It returns no secrets and performs no external sending, bank send, payment initiation, public release, production deploy or destructive source apply."
        : "Localhost adapter coverage is internal-only.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
