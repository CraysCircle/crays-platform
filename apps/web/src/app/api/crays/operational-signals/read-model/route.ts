import { NextResponse } from "next/server";
import { getOperationalSignalsReadModel } from "@/db/operational-signals-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;


export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "12", 10);
  const readModel = await getOperationalSignalsReadModel({
    role,
    seedBatchId: url.searchParams.get("seedBatchId") ?? undefined,
    limit: Number.isFinite(limit) ? limit : 12,
  });

  if (!readModel.access.allowed) {
    return NextResponse.json(
      {
        status: "forbidden",
        readModel,
        note: "Operational signals require an internal role. No portfolio signals, event metadata or KPI snapshots are returned for this role.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    status: "ready",
    readModel,
    liveSourceCallsEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    toolApplyEnabled: false,
    uploadsEnabled: false,
    privatePreviewEnabled: false,
    externalSendingEnabled: false,
    releaseActionsEnabled: false,
    financeActionsEnabled: false,
    bankActionsEnabled: false,
    paymentInitiationEnabled: false,
    productionDeployEnabled: false,
    vpsChangingWorkEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
    note: "Operational signals return bounded CRAYS Core signal, event and KPI metadata only. No live provider call, upload, release, send, finance action, bank action, payment, sync apply or target apply is enabled.",
  });
}
