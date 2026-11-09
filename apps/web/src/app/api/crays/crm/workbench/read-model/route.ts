import { persistSourceSnapshot } from "@/db/source-sync-repository";
import { getCrmOperationalSourceSlice } from "@/lib/crm-operational-source-adapter";
import { safeLocalEngineError } from "@/lib/local-engine-runtime";
import { attachLiveSourceSections, getSourceFaithfulWorkbench } from "@/lib/source-faithful-product-contract";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const baseReadModel = getSourceFaithfulWorkbench("crm", role);
  const allowed = baseReadModel.access.allowed;

  if (!allowed) {
    return Response.json(
      {
        status: "forbidden",
        readModel: baseReadModel,
        liveBusinessRecordReturned: false,
        note: "CRM CRAYS-native workbench access is forbidden for this role.",
      },
      { status: 403 },
    );
  }

  try {
    const source = await getCrmOperationalSourceSlice({ limit: Number(url.searchParams.get("limit") ?? 40) });
    const coreSync = await persistSourceSnapshot({
      moduleKey: "crm",
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
      note: "CRM workbench is backed by live relationship source records and CRAYS guarded command state.",
    });
  } catch (error) {
    return Response.json({
      status: "ready",
      sourceRecordStatus: "source_unavailable",
      readModel: baseReadModel,
      liveBusinessRecordReturned: false,
      error: safeLocalEngineError(error),
      note: "CRM workbench is available, but the live relationship source is unavailable right now.",
    });
  }
}
