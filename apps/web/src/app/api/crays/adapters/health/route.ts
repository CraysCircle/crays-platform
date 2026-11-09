import { getAdapterHealthReadiness } from "@/db/adapter-health-readiness-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getAdapterHealthReadiness(role);
  const ready =
    readModel.access.allowed &&
    readModel.summary.moduleCount > 0 &&
    readModel.summary.schemaReadyModules === readModel.summary.moduleCount &&
    readModel.modules.every((module) => module.coreDbConfigured && module.dataTablesReady);
  const status = !readModel.access.allowed ? "forbidden" : ready ? "ready" : "incomplete";

  return Response.json(
    {
      status,
      readModel,
      liveBusinessRecordReturned: false,
      note: readModel.access.allowed
        ? "This endpoint returns adapter health readiness only. It does not return secrets, environment values, provider logs, source UI, live source records or control actions, and it does not execute writes, sync jobs, reconciliation, retries, uploads, provider calls or external sending."
        : "Adapter health requires internal platform, review or scoped module-readiness access.",
    },
    { status: !readModel.access.allowed ? 403 : ready ? 200 : 503 },
  );
}
