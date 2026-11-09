import type { ModuleAdapterContract } from "../common/adapter";

export const sitesAdapterContract: ModuleAdapterContract = {
  module: "sites",
  label: "Sites",
  sourceEngine: "site-engine",
  capabilities: ["read", "write", "event"],
  integrationModes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface"],
  entities: [
    { name: "Page", description: "Public or portal page backed by approved CRAYS data." },
    { name: "FormSubmission", description: "Lead, request or access flow submitted from a web surface." },
    { name: "ContentBlock", description: "Approved content unit with audience and status." },
  ],
  scopes: [
    { role: "deal-manager", grants: ["candidate-site:read", "lead:review"] },
    { role: "expansion-manager", grants: ["location-site:read", "location-lead:review"] },
    { role: "reviewer", grants: ["site-content:review"] },
  ],
  integrationBoundary: "Sites publish only approved data and route submissions into CRAYS workflows.",
};
