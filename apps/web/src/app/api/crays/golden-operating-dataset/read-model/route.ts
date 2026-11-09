import { getGoldenOperatingDatasetReadModel } from "@/db/golden-operating-dataset-read-model-repository";
import { resolveCraysRouteRole } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const { role, context } = await resolveCraysRouteRole(request);
  const readModel = await getGoldenOperatingDatasetReadModel(role);
  return Response.json({ status: readModel.access.allowed ? "ready" : "forbidden", serverAuthority: context.authoritySource, reviewPersona: context.reviewPersona, tenantId: context.tenantId, readModel, sourceWritesEnabled: false, syncApplyEnabled: false, toolApplyEnabled: false, targetApplyEnabled: false, destructiveApplyEnabled: false, releaseEnabled: false, externalSendingEnabled: false, secretsReturned: false }, { status: readModel.access.allowed ? 200 : 423 });
}
