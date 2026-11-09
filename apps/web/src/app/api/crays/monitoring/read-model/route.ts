import { getMonitoringReadModel } from "@/db/monitoring-read-model-repository";
import { resolveCraysRouteRole } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const { role, context } = await resolveCraysRouteRole(request);
  const readModel = await getMonitoringReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? readModel.queryStatus === "schema_ready" ? "ready" : "not_configured" : "release_blocked",
      serverAuthority: context.authoritySource,
      reviewPersona: context.reviewPersona,
      tenantId: context.tenantId,
      readModel,
      runtimeReadsEnabled: readModel.boundaries.runtimeReadsEnabled,
      sourceHealthReadsEnabled: readModel.boundaries.sourceHealthReadsEnabled,
      commandHealthReadsEnabled: readModel.boundaries.commandHealthReadsEnabled,
      retryExecutionEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      toolApplyEnabled: false,
      targetApplyEnabled: false,
      destructiveApplyEnabled: false,
      externalSendingEnabled: false,
      releaseEnabled: false,
      bankActionsEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      uploadsEnabled: false,
      liveAiEnabled: false,
      productionDeployEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: readModel.access.allowed
        ? "Monitoring reads runtime, source-health, sync-job, identity and command-gate projections. Retry, apply, send, release, payment, finance posting, upload, live AI and deployment actions remain disabled."
        : "Monitoring is internal operating control only.",
    },
    { status: readModel.access.allowed ? 200 : 423 },
  );
}
