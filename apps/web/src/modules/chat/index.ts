import type { ModuleAdapterContract } from "../common/adapter";

export const chatAdapterContract: ModuleAdapterContract = {
  module: "chat",
  label: "Chat",
  sourceEngine: "communication-engine",
  capabilities: ["read", "write", "event", "communication"],
  integrationModes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
  entities: [
    { name: "Conversation", description: "Scoped thread linked to a deal, studio, member, document or project." },
    { name: "Message", description: "Internal, shared or external message with delivery state." },
    { name: "Participant", description: "Role-scoped person or organization participating in a conversation." },
  ],
  scopes: [
    { role: "deal-manager", grants: ["conversation:read", "conversation:write", "internal-note:write"] },
    { role: "franchise-partner", grants: ["own-conversation:read", "own-conversation:reply"] },
    { role: "gym-member", grants: ["own-support-thread:read", "own-support-thread:reply"] },
  ],
  integrationBoundary: "Communication channels use CRAYS permissions before messages or attachments are exposed.",
};
