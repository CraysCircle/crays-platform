import { getControlledBetaCurrentReadModel } from "@/db/controlled-beta-current-read-model-repository";
import { resolveCraysRouteRole } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const { role, context } = await resolveCraysRouteRole(request);
  const readModel = await getControlledBetaCurrentReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? readModel.queryStatus === "schema_ready" ? "ready" : "partial" : "release_blocked",
      serverAuthority: context.authoritySource,
      reviewPersona: context.reviewPersona,
      tenantId: context.tenantId,
      readModel,
      betaLaunchEnabled: false,
      productionDeployEnabled: false,
      releaseEnabled: false,
      externalSendingEnabled: false,
      bankSendEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      toolApplyEnabled: false,
      targetApplyEnabled: false,
      destructiveApplyEnabled: false,
      uploadsEnabled: false,
      privatePreviewEnabled: false,
      liveAiEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: readModel.access.allowed
        ? "Controlled Beta Readiness is an evidence-backed decision surface only. It does not launch beta, deploy, release, send, upload, pay, post finance, open apply gates or expose secrets."
        : "Controlled Beta Readiness is internal beta-control scope only.",
    },
    { status: readModel.access.allowed ? 200 : 423 },
  );
}
