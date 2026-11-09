import type { ModuleAdapterContract } from "../common/adapter";

export const operationsAdapterContract: ModuleAdapterContract = {
  module: "operations",
  label: "Operations",
  sourceEngine: "operations-engine",
  capabilities: ["read", "write", "event", "communication"],
  integrationModes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
  entities: [
    { name: "Studio", description: "Operating location with readiness, access and service state." },
    { name: "OperationalTask", description: "Studio task for handover, service, cleaning or maintenance." },
    { name: "CheckInEvent", description: "Member access event feeding studio dashboards." },
  ],
  scopes: [
    { role: "franchise-partner", grants: ["own-studio:read", "own-studio-task:write"] },
    { role: "studio-manager", grants: ["studio-operation:read", "studio-operation:write"] },
    { role: "vendor", grants: ["assigned-service-task:read", "assigned-service-task:update"] },
  ],
  integrationBoundary: "Operations data is studio-scoped and feeds dashboards through CRAYS events.",
};
