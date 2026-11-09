import { getCrossToolObjectIdentityReadModel } from "@/db/cross-tool-object-identity-read-model-repository";
import { resolveCraysRouteRole } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const { role, context } = await resolveCraysRouteRole(request);
  const readModel = await getCrossToolObjectIdentityReadModel(role);
  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      serverAuthority: context.authoritySource,
      reviewPersona: context.reviewPersona,
      tenantId: context.tenantId,
      readModel,
      sourceReadsEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      toolApplyEnabled: false,
      targetApplyEnabled: false,
      destructiveApplyEnabled: false,
      releaseEnabled: false,
      externalSendingEnabled: false,
      uploadsEnabled: false,
      financePostingEnabled: false,
      bankActionsEnabled: false,
      paymentInitiationEnabled: false,
      liveAiEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    { status: readModel.access.allowed ? 200 : 423 },
  );
}
