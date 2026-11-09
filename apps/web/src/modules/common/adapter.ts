import type { ModuleKey } from "@/lib/modules";
import type { RoleKey } from "@/lib/roles";
import type { IntegrationMode, SourceEngineKey } from "./integration-modes";

export type AdapterCapability = "read" | "write" | "event" | "file" | "communication";

export type AdapterEntity = {
  name: string;
  description: string;
};

export type AdapterScope = {
  role: RoleKey;
  grants: string[];
};

export type ModuleAdapterContract = {
  module: ModuleKey;
  label: string;
  sourceEngine: SourceEngineKey;
  capabilities: AdapterCapability[];
  integrationModes: IntegrationMode[];
  entities: AdapterEntity[];
  scopes: AdapterScope[];
  integrationBoundary: string;
};

export type ExternalRecordMap = {
  id: string;
  module: ModuleKey;
  craysEntityType: string;
  craysEntityId: string;
  externalEntityType: string;
  externalEntityId: string;
  syncStatus: "linked" | "pending" | "conflict" | "archived";
  updatedAt: string;
};

export type SyncJob = {
  id: string;
  module: ModuleKey;
  direction: "inbound" | "outbound" | "bidirectional";
  status: "queued" | "running" | "succeeded" | "failed" | "blocked";
  startedAt?: string;
  finishedAt?: string;
  errorCode?: string;
};

export type OutboxEvent = {
  id: string;
  module: ModuleKey;
  eventType: string;
  entityType: string;
  entityId: string;
  status: "pending" | "published" | "failed";
  createdAt: string;
};

export const adapterGuardrails = [
  "UI components use CRAYS module contracts, not direct service URLs.",
  "Adapters translate external records into CRAYS-native labels and permissions.",
  "Every write path must pass role, organization, entity and document scope checks.",
  "Events feed dashboards and audit trails before they are used for automation.",
  "Direct source component reuse needs a license, build, routing, styling and branding review first.",
  "Embeds are temporary bridges and must never be the final module architecture.",
];
