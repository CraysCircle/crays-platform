import type { ModuleAdapterContract } from "../common/adapter";

export const learningAdapterContract: ModuleAdapterContract = {
  module: "learning",
  label: "Learning",
  sourceEngine: "learning-engine",
  capabilities: ["read", "write", "event"],
  integrationModes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
  entities: [
    { name: "Course", description: "Learning path, lesson or operating playbook." },
    { name: "Progress", description: "Role-scoped learner progress and completion state." },
    { name: "Certification", description: "Compliance or operational readiness certificate." },
  ],
  scopes: [
    { role: "hr", grants: ["learning:manage", "progress:read"] },
    { role: "franchise-partner", grants: ["own-learning:read", "own-learning:complete"] },
    { role: "studio-manager", grants: ["studio-learning:read", "studio-learning:complete"] },
  ],
  integrationBoundary: "Learning records map to CRAYS roles, studios and readiness events.",
};
