import type { ModuleAdapterContract } from "../common/adapter";

export const supportAdapterContract: ModuleAdapterContract = {
  module: "support",
  label: "Support",
  sourceEngine: "support-engine",
  capabilities: ["read", "write", "event", "communication"],
  integrationModes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
  entities: [
    { name: "Ticket", description: "Support request with SLA, owner and visibility." },
    { name: "ServiceRecovery", description: "Recovery workflow for member, partner or stakeholder issues." },
    { name: "KnowledgeItem", description: "Approved answer or operational guidance." },
  ],
  scopes: [
    { role: "franchise-partner", grants: ["own-ticket:read", "own-ticket:create"] },
    { role: "studio-manager", grants: ["studio-ticket:read", "studio-ticket:update"] },
    { role: "gym-member", grants: ["own-support-ticket:read", "own-support-ticket:create"] },
  ],
  integrationBoundary: "Support uses the communication layer and document grants for every attachment.",
};
