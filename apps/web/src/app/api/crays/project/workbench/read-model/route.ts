import { persistSourceSnapshot } from "@/db/source-sync-repository";
import { getProjectOperationalSourceSlice } from "@/lib/project-operational-source-adapter";
import { safeLocalEngineError } from "@/lib/local-engine-runtime";
import { attachLiveSourceSections, getSourceFaithfulWorkbench } from "@/lib/source-faithful-product-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const baseReadModel = getSourceFaithfulWorkbench("project", role);

  if (!baseReadModel.access.allowed) {
    return Response.json(
      {
        status: "forbidden",
        readModel: baseReadModel,
        liveBusinessRecordReturned: false,
        note: "Project workbench access is forbidden for this role.",
      },
      { status: 403 },
    );
  }

  try {
    const source = await getProjectOperationalSourceSlice({ limit: Number(url.searchParams.get("limit") ?? 25) });
    const coreSync = await persistSourceSnapshot({
      moduleKey: "project",
      role,
      ownerRole: "admin",
      sourceConnection: source.source.connection,
      generatedAt: source.generatedAt,
      sections: source.sections,
      capabilities: source.capabilities,
    });
    const readModel = attachLiveSourceSections(baseReadModel, source);

    return Response.json({
      status: "ready",
      readModel,
      coreSync,
      liveBusinessRecordReturned: true,
      note: "Project workbench is backed by live delivery source records and CRAYS guarded command state.",
    });
  } catch (error) {
    return Response.json({
      status: "ready",
      sourceRecordStatus: "source_unavailable",
      readModel: baseReadModel,
      liveBusinessRecordReturned: false,
      error: safeLocalEngineError(error),
      note: "Project workbench is available, but the live delivery source is unavailable or not configured right now.",
    });
  }
}
