import { persistSourceSnapshot } from "@/db/source-sync-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { getLendingSourceReadSlice, getLendingSourceRuntimeState } from "@/lib/loans-operational-source-adapter";
import { OperationalSourceError, safeSourceError } from "@/lib/operational-source-client";
import { attachLiveSourceSections, getSourceFaithfulWorkbench } from "@/lib/source-faithful-product-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const role = context.role;
  const baseReadModel = getSourceFaithfulWorkbench("loans", role);
  if (!baseReadModel.access.allowed) {
    return Response.json(
      {
        status: "forbidden",
        serverAuthority: context.authoritySource,
        tenantId: context.tenantId,
        role,
        reviewPersona: context.reviewPersona,
        readModel: baseReadModel,
        liveBusinessRecordReturned: false,
        note: "Loans workbench access is forbidden for this role.",
      },
      { status: 403 },
    );
  }

  try {
    const source = await getLendingSourceReadSlice(Number(url.searchParams.get("limit") ?? 20));
    const coreSync = await persistSourceSnapshot({
      moduleKey: "loans",
      role,
      ownerRole: "finance",
      sourceConnection: source.source.connection,
      generatedAt: source.generatedAt,
      sections: source.sections,
      capabilities: source.capabilities,
    });
    const readModel = attachLiveSourceSections(baseReadModel, source);

    return Response.json({
      status: "ready",
      serverAuthority: context.authoritySource,
      tenantId: context.tenantId,
      role,
      reviewPersona: context.reviewPersona,
      readModel,
      coreSync,
      liveBusinessRecordReturned: true,
      note: "Loans workbench is backed by live finance source records and CRAYS guarded command state. Lender release, regulated checks, provider calls and external sending remain disabled.",
    });
  } catch (error) {
    const unavailable = error instanceof OperationalSourceError ? safeSourceError(error) : safeSourceError(error);
    return Response.json({
      status: "ready",
      sourceRecordStatus: "source_unavailable",
      serverAuthority: context.authoritySource,
      tenantId: context.tenantId,
      role,
      reviewPersona: context.reviewPersona,
      source: getLendingSourceRuntimeState(),
      readModel: baseReadModel,
      liveBusinessRecordReturned: false,
      error: unavailable,
      note: "Loans workbench is available, but the live finance source is unavailable or not configured right now.",
    });
  }
}
