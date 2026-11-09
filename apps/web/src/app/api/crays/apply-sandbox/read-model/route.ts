import { getApplySandboxReadModel } from "@/db/apply-sandbox-read-model-repository";
import { resolveCraysRouteRole } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const { role, context } = await resolveCraysRouteRole(request);
  const readModel = await getApplySandboxReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "release_blocked",
      serverAuthority: context.authoritySource,
      reviewPersona: context.reviewPersona,
      tenantId: context.tenantId,
      readModel,
      coreCommandReadsEnabled: readModel.boundaries.coreCommandReadsEnabled,
      dryRunSimulationEnabled: readModel.boundaries.dryRunSimulationEnabled,
      targetApplyEnabled: false,
      sourceApplyEnabled: false,
      syncApplyEnabled: false,
      toolApplyEnabled: false,
      destructiveApplyEnabled: false,
      externalSendingEnabled: false,
      publicReleaseEnabled: false,
      candidateReleaseEnabled: false,
      bankActionsEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      uploadsEnabled: false,
      privatePreviewEnabled: false,
      liveAiEnabled: false,
      productionDeployEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: readModel.access.allowed
        ? "Apply Sandbox is design and dry-run simulation only. It reads Core command drafts and closed gates; no source, sync, tool, target or destructive apply is executed."
        : "Apply Sandbox is internal/scoped command governance only.",
    },
    { status: readModel.access.allowed ? 200 : 423 },
  );
}
