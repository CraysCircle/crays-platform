import { getStakeholderInteractionLoopsReadModel } from "@/db/stakeholder-interaction-loops-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const model = await getStakeholderInteractionLoopsReadModel(context.role);
  return Response.json({ block: 105, role: context.role, tenantId: context.tenantId, serverAuthority: context.authoritySource, ...model }, { status: model.access.allowed ? 200 : 423 });
}
