import { getResourceContractReadModel } from "@/lib/resources/contract-read-model";
import { resolveCraysRouteRole } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const { role, context } = await resolveCraysRouteRole(request);
  const readModel = getResourceContractReadModel(role);

  return Response.json(
    {
      status: readModel.access.allowed ? "ready" : "forbidden",
      serverAuthority: context.authoritySource,
      reviewPersona: context.reviewPersona,
      tenantId: context.tenantId,
      readModel,
      vendorRequestsFromBrowserEnabled: false,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      toolApplyEnabled: false,
      targetApplyEnabled: false,
      destructiveApplyEnabled: false,
      externalSendingEnabled: false,
      releaseEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
