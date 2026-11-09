import { getEventKpiContract } from "@/lib/event-kpi";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getEventKpiContract();

  return Response.json({
    role,
    contract,
    rolePreview: {
      workflowEvents: contract.workflowEvents.filter((event) => event.visibilityRoles.includes(role)).length,
      kpis: contract.kpis.filter((kpi) => kpi.visibilityRoles.includes(role)).length,
      widgets: contract.widgets.filter((widget) => widget.roleVisibility.includes(role)).length,
    },
    note: "This is the CRAYS event and KPI contract. No live workflow events or KPI values are returned.",
  });
}
