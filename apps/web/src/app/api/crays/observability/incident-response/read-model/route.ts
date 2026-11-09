import { getObservabilityIncidentResponseReadModel } from "@/db/observability-incident-response-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const model = await getObservabilityIncidentResponseReadModel(context.role);
  return Response.json({ block: 108, role: context.role, tenantId: context.tenantId, serverAuthority: context.authoritySource, ...model }, { status: model.access.allowed ? 200 : 423 });
}
