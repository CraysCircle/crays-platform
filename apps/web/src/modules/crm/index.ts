import type { ModuleAdapterContract } from "../common/adapter";

export const crmAdapterContract: ModuleAdapterContract = {
  module: "crm",
  label: "CRM",
  sourceEngine: "crm-engine",
  capabilities: ["read", "write", "event", "communication"],
  integrationModes: [
    "api-bff-adapter",
    "sync-read-model",
    "webhook-event-adapter",
    "source-faithful-surface",
    "source-component-wrapper",
    "transitional-embed",
  ],
  entities: [
    { name: "Company", description: "Organizations such as partners, landlords, banks and vendors." },
    { name: "Person", description: "Stakeholders connected to deals, studios and workflows." },
    { name: "Opportunity", description: "Candidate, expansion and commercial pipeline records." },
  ],
  scopes: [
    { role: "deal-manager", grants: ["pipeline:read", "pipeline:write", "conversation:shared"] },
    { role: "expansion-manager", grants: ["location-pipeline:read", "location-pipeline:write"] },
    { role: "reviewer", grants: ["pipeline:review"] },
  ],
  integrationBoundary: "CRM records enter CRAYS through the core account, organization and event layer.",
};
