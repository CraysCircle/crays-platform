import { getEventKpiContract } from "@/lib/event-kpi";
import { getWorkflowPersistenceContract } from "@/lib/workflow-persistence-contracts";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getWorkflowPersistenceContract("workflow-events");
  const eventKpi = getEventKpiContract();

  return Response.json({
    role,
    contract,
    rolePreview: {
      workflowEventContracts: eventKpi.workflowEvents.filter((event) => event.visibilityRoles.includes(role)).length,
      kpiContracts: eventKpi.kpis.filter((kpi) => kpi.visibilityRoles.includes(role)).length,
      widgetContracts: eventKpi.widgets.filter((widget) => widget.roleVisibility.includes(role)).length,
    },
    liveEventsReturned: false,
    liveKpisReturned: false,
    note: "This is the CRAYS workflow-event persistence contract. No live workflow events, audit events or KPI values are returned.",
  });
}
