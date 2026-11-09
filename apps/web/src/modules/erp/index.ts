import type { ModuleAdapterContract } from "../common/adapter";

export const erpAdapterContract: ModuleAdapterContract = {
  module: "erp",
  label: "ERP",
  sourceEngine: "erp-engine",
  capabilities: ["read", "write", "event", "file"],
  integrationModes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
  entities: [
    { name: "Invoice", description: "Payable, receivable and franchise fee basis records." },
    { name: "Budget", description: "Opening, studio and operating budget records." },
    { name: "LedgerEntry", description: "Role-scoped finance and accounting events." },
  ],
  scopes: [
    { role: "finance", grants: ["finance:read", "finance:write", "export:accounting"] },
    { role: "franchise-partner", grants: ["own-studio-finance:read"] },
    { role: "reviewer", grants: ["finance:review"] },
  ],
  integrationBoundary: "ERP data is exposed through CRAYS finance scopes and never as raw back-office screens.",
};
