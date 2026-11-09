import { getOwnerPropertyCheckPilotReadiness } from "@/db/pilot-owner-property-check-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getOwnerPropertyCheckPilotReadiness(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      readModel,
      liveBusinessRecordsReturned: readModel.liveBusinessRecordsReturned,
      commandRecordsWritten: readModel.commandRecordsWritten,
      sourceWritesEnabled: readModel.boundaries.sourceWritesEnabled,
      syncWritesEnabled: readModel.boundaries.syncWritesEnabled,
      toolApplyEnabled: readModel.boundaries.toolApplyEnabled,
      note: readModel.access.allowed
        ? "This endpoint returns owner property-check pilot readiness from CRAYS Core read models only. It does not submit owner data, upload files, apply tool writes, call live enrichment or release records."
        : "Owner property-check pilot readiness requires internal property workflow scope or owner-scoped property access.",
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
