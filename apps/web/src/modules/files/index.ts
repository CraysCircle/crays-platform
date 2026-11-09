import type { ModuleAdapterContract } from "../common/adapter";

export const filesAdapterContract: ModuleAdapterContract = {
  module: "files",
  label: "Files",
  sourceEngine: "file-engine",
  capabilities: ["read", "write", "event", "file"],
  integrationModes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
  entities: [
    { name: "Document", description: "Vault document with grants, status and related entity." },
    { name: "Version", description: "Immutable document version metadata." },
    { name: "Package", description: "Controlled bundle for bank, partner or project review." },
  ],
  scopes: [
    { role: "deal-manager", grants: ["document:read", "package:prepare"] },
    { role: "bank-partner", grants: ["bank-package:read"] },
    { role: "franchise-partner", grants: ["own-document:read", "own-document:upload"] },
  ],
  integrationBoundary: "Files are always checked against the CRAYS document access matrix.",
};
