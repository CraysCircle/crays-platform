import type { ModuleAdapterContract } from "../common/adapter";

export const hrAdapterContract: ModuleAdapterContract = {
  module: "hr",
  label: "HR",
  sourceEngine: "hr-engine",
  capabilities: ["read", "write", "event", "file"],
  integrationModes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
  entities: [
    { name: "PersonRecord", description: "Workforce record with restricted visibility." },
    { name: "TrainingAssignment", description: "Required training or certification state." },
    { name: "ReadinessCheck", description: "Launch or operating readiness item." },
  ],
  scopes: [
    { role: "hr", grants: ["people:read", "people:write", "training:assign"] },
    { role: "studio-manager", grants: ["local-training:read"] },
    { role: "reviewer", grants: ["people-compliance:review"] },
  ],
  integrationBoundary: "People data stays restricted and is never mixed into deal views by default.",
};
