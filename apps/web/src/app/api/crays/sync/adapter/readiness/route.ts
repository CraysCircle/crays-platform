import { getSyncAdapterReadiness } from "@/db/sync-adapter-readiness-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getSyncAdapterReadiness(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordReturned: readModel.liveBusinessRecordsReturned,
      note: readModel.access.allowed
        ? "This endpoint returns Sync readiness and aggregate mapping scaffolding only. It does not execute sync writes, destructive reconciliation, retries, source writes, provider calls, uploads, control actions or external sending."
        : "Sync readiness requires internal platform, review or scoped module-readiness access.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
