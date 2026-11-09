import { getMultiCompanyTenantizationReadiness } from "@/db/multi-company-tenantization-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const readModel = await getMultiCompanyTenantizationReadiness(role);

  return Response.json(
    {
      status: readModel.status,
      readModel,
      fitYesCommercialPilotApproved: false,
      productionTenantCreated: false,
      tenantWritesPerformed: false,
      externalActionsPerformed: false,
      billingActionsEnabled: false,
      exportExecutionEnabled: false,
      retentionDeleteExecutionEnabled: false,
    },
    { status: readModel.access.allowed ? 200 : 403 },
  );
}
