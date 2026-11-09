import { getExternalPreflightReadModel } from "@/db/external-preflight-read-model-repository";
import { resolveCraysRouteRole } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const { role, context } = await resolveCraysRouteRole(request);
  const readModel = await getExternalPreflightReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "release_blocked",
      serverAuthority: context.authoritySource,
      reviewPersona: context.reviewPersona,
      tenantId: context.tenantId,
      readModel,
      internalPreflightReadsEnabled: readModel.boundaries.internalPreflightReadsEnabled,
      externalPreviewReleased: false,
      publicReleaseEnabled: false,
      candidateReleaseEnabled: false,
      partnerReleaseEnabled: false,
      bankReleaseEnabled: false,
      ownerReleaseEnabled: false,
      memberExternalSendingEnabled: false,
      externalSendingEnabled: false,
      uploadsEnabled: false,
      privatePreviewEnabled: false,
      fileBodyAccessEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      toolApplyEnabled: false,
      targetApplyEnabled: false,
      bankActionsEnabled: false,
      paymentInitiationEnabled: false,
      financePostingEnabled: false,
      liveAiEnabled: false,
      productionDeployEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: readModel.access.allowed
        ? "External Preflight prepares visibility, redaction and prerequisite proof only. No external room, preview, release, send, upload, bank, payment, finance posting, source write or apply action was executed."
        : "No external preflight is released for this role.",
    },
    { status: readModel.access.allowed ? 200 : 423 },
  );
}
