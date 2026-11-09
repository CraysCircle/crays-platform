import { getPreparedDealAssemblyReadiness } from "@/db/pilot-prepared-deal-assembly-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const seedBatchId = url.searchParams.get("seedBatchId") ?? undefined;
  const readModel = await getPreparedDealAssemblyReadiness(role, seedBatchId);

  return Response.json(
    {
      status: readModel.status,
      readModel,
      liveBusinessRecordsReturned: readModel.liveBusinessRecordsReturned,
      liveExternalReadsEnabled: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      toolApplyEnabled: false,
      packageRecordsWritten: false,
      commandRecordsWritten: false,
      candidateReleaseEnabled: false,
      bankReleaseEnabled: false,
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
