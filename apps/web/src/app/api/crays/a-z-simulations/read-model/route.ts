import { getAzSimulationReadModel } from "@/db/az-simulation-read-model-repository";
import { resolveCraysRouteRole } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const { role, context } = await resolveCraysRouteRole(request);
  const readModel = await getAzSimulationReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "release_blocked",
      serverAuthority: context.authoritySource,
      reviewPersona: context.reviewPersona,
      tenantId: context.tenantId,
      readModel,
      coreReadsEnabled: readModel.boundaries.coreReadsEnabled,
      sourceReadsEnabled: readModel.boundaries.sourceReadsEnabled,
      coreCommandDraftsEnabled: readModel.boundaries.coreCommandDraftsEnabled,
      targetApplyEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      destructiveApplyEnabled: false,
      toolApplyEnabled: false,
      uploadsEnabled: false,
      privatePreviewEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      candidateReleaseEnabled: false,
      bankActionsEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      liveAiEnabled: false,
      productionDeployEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: readModel.access.allowed
        ? "A-Z simulations compose existing Core read models, source maps, process suites, identity links and timeline evidence only. They do not execute apply, release, send, upload, bank, payment, finance posting, live AI or deployment actions."
        : "A-Z simulations are internal/scoped operating review only and are release-blocked for this role.",
    },
    { status: readModel.access.allowed ? 200 : 423 },
  );
}
