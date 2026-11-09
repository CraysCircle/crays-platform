import { getCommunicationPersistenceReadiness } from "@/db/communication-persistence-readiness-repository";
import { getCommunicationPersistenceRolePreview, getWorkflowPersistenceContract } from "@/lib/workflow-persistence-contracts";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const contract = getWorkflowPersistenceContract("communication");
  const readiness = await getCommunicationPersistenceReadiness();

  return Response.json({
    role,
    contract,
    rolePreview: getCommunicationPersistenceRolePreview(role),
    schemaVersion: "0003_communication_persistence",
    migrationDraftReady: true,
    migrationApplied: readiness.migrationApplied,
    liveConversationsReturned: false,
    liveMessagesReturned: false,
    externalSendingEnabled: false,
    providerConnectionsEnabled: false,
    writeRoutesEnabled: false,
    note: "This is the CRAYS communication persistence contract. No live conversations, messages, provider connections or outbound sending are enabled.",
  });
}
