import type { ModuleAdapterContract } from "../common/adapter";

export const projectAdapterContract: ModuleAdapterContract = {
  module: "project",
  label: "Project",
  sourceEngine: "project-engine",
  capabilities: ["read", "write", "event", "file", "communication"],
  integrationModes: [
    "api-bff-adapter",
    "sync-read-model",
    "webhook-event-adapter",
    "source-faithful-surface",
    "source-component-wrapper",
    "transitional-embed",
  ],
  entities: [
    { name: "Project", description: "Opening, build-out and handover project." },
    { name: "WorkItem", description: "Scoped work item with owner, due date and stakeholder visibility." },
    { name: "Page", description: "Project knowledge page or decision note." },
  ],
  scopes: [
    { role: "deal-manager", grants: ["project:read", "project:write", "work-item:assign"] },
    { role: "franchise-partner", grants: ["own-project:read", "own-work-item:write"] },
    { role: "vendor", grants: ["assigned-work-item:read", "assigned-work-item:update"] },
  ],
  integrationBoundary: "Project data is adapted into CRAYS opening workflows without exposing implementation names.",
};
