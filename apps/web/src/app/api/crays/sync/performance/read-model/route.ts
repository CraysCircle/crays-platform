import { getSyncPerformanceReadModel } from "@/db/sync-performance-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getSyncPerformanceReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      sourceReadsEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      destructiveReconciliationEnabled: false,
      retryExecutionEnabled: false,
      mappingOverrideEnabled: false,
      externalSendingEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: readModel.access.allowed
        ? "Sync performance returns Core-only freshness, locality and adapter diagnostics. It does not call sources, apply sync writes, retry jobs, override maps or send externally."
        : "Sync performance diagnostics require internal or scoped operating access.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
