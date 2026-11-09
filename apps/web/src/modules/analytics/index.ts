import type { ModuleAdapterContract } from "../common/adapter";

export const analyticsAdapterContract: ModuleAdapterContract = {
  module: "analytics",
  label: "Analytics",
  sourceEngine: "analytics-engine",
  capabilities: ["read", "event"],
  integrationModes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface"],
  entities: [
    { name: "KpiSnapshot", description: "Role-scoped metric snapshot for dashboards." },
    { name: "Report", description: "Reusable analytical view with defined audience." },
    { name: "Alert", description: "Threshold or workflow signal requiring action." },
  ],
  scopes: [
    { role: "crays-management", grants: ["portfolio-kpi:read", "risk:read"] },
    { role: "franchise-partner", grants: ["own-studio-kpi:read"] },
    { role: "bank-partner", grants: ["approved-credit-monitoring:read"] },
  ],
  integrationBoundary: "Analytics consumes CRAYS read models and events, not direct module tables.",
};
