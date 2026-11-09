import type { ModuleAdapterContract } from "../common/adapter";

export const syncAdapterContract: ModuleAdapterContract = {
  module: "sync",
  label: "Sync",
  sourceEngine: "sync-engine",
  capabilities: ["read", "write", "event"],
  integrationModes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface"],
  entities: [
    { name: "ExternalRecordMap", description: "Mapping between CRAYS core records and module records." },
    { name: "SyncJob", description: "Controlled synchronization job with status and error state." },
    { name: "OutboxEvent", description: "Durable event waiting for processing or delivery." },
  ],
  scopes: [
    { role: "admin", grants: ["sync:read", "sync:write", "mapping:resolve"] },
    { role: "finance", grants: ["finance-sync:read"] },
    { role: "reviewer", grants: ["sync-audit:read"] },
  ],
  integrationBoundary: "Sync never bypasses CRAYS permissions or direct-write guardrails.",
};
