import type { ModuleAdapterContract } from "../common/adapter";

export const settingsAdapterContract: ModuleAdapterContract = {
  module: "settings",
  label: "Settings",
  sourceEngine: "settings-engine",
  capabilities: ["read", "write", "event"],
  integrationModes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface"],
  entities: [
    { name: "User", description: "Global CRAYS user and identity mapping." },
    { name: "RoleAssignment", description: "Role, organization, entity and feature access grant." },
    { name: "IntegrationConfig", description: "Admin-controlled integration setting without secrets in UI." },
  ],
  scopes: [
    { role: "admin", grants: ["settings:read", "settings:write"] },
    { role: "crays-management", grants: ["settings:read", "audit:read"] },
    { role: "reviewer", grants: ["access-review:read", "access-review:comment"] },
  ],
  integrationBoundary: "Global settings own CRAYS permissions and translate module-specific configuration.",
};
