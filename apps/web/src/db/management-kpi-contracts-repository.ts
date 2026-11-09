import { getAnalyticsManagementKpiReadModel } from "./analytics-management-kpi-read-model-repository";
import type { RoleKey } from "@/lib/roles";

export async function getManagementKpiContractsReadModel(role: RoleKey) {
  const analytics = await getAnalyticsManagementKpiReadModel(role);
  return {
    access: analytics.access,
    status: analytics.queryStatus === "schema_ready" ? "ready" : analytics.queryStatus,
    summary: analytics.summary,
    contracts: analytics.kpis.map((kpi) => ({
      key: kpi.key,
      label: kpi.label,
      value: kpi.value,
      status: kpi.status,
      ownerRole: kpi.ownerRole,
      source: kpi.source,
      drillKey: kpi.drillKey,
      definition: kpi.context,
      safeNextAction: analytics.drilldowns[kpi.drillKey]?.[0]?.nextAction ?? "Open the scoped KPI drilldown.",
    })),
    moduleHealth: analytics.moduleHealth,
    controls: analytics.controls,
    publicationBoundary: {
      reportPublicationEnabled: analytics.boundaries.reportPublicationEnabled,
      externalSendingEnabled: analytics.boundaries.externalSendingEnabled,
      candidateReleaseEnabled: analytics.boundaries.candidateReleaseEnabled,
      financePostingEnabled: analytics.boundaries.financePostingEnabled,
    },
    boundaries: analytics.boundaries,
    note:
      "Block 107: Management KPIs are explicit contracts with owner, source, drilldown and gate state. Reports cannot publish externally from this surface.",
  };
}
