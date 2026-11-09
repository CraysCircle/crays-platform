import { getStakeholderPortalReadModel, parseStakeholderPortal } from "@/db/stakeholder-portal-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const url = new URL(request.url);
  const portal = parseStakeholderPortal(url.searchParams.get("portal"));
  const readModel = await getStakeholderPortalReadModel(portal, context.role);
  const httpStatus = readModel.access.allowed ? 200 : readModel.access.level === "stakeholder_account_required" ? 423 : 403;

  return Response.json(
    {
      status: readModel.queryStatus,
      serverAuthority: context.authoritySource,
      tenantId: context.tenantId,
      role: context.role,
      portal,
      reviewPersona: context.reviewPersona,
      readModel,
      boundaries: readModel.boundaries,
      note: readModel.access.allowed
        ? "Stakeholder Portal returns relationship-scoped CRAYS DTO/read-model data, safe tasks, gates and next actions only. External sends, bank sends, payments, finance posting, uploads, releases and adapter writes remain closed."
        : "Stakeholder Portal requires a mapped stakeholder relationship or internal review scope.",
    },
    { status: httpStatus },
  );
}
