import { getCommunicationPersistenceReadiness } from "@/db/communication-persistence-readiness-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const readiness = await getCommunicationPersistenceReadiness();

  return Response.json({
    status: readiness.migrationApplied ? "ready" : readiness.migrationDraftReady ? "draft_ready" : "incomplete",
    readiness,
    migrationApplyRequired: !readiness.migrationApplied,
    liveConversationsReturned: false,
    liveMessagesReturned: false,
    externalSendingEnabled: false,
    providerConnectionsEnabled: false,
    writeRoutesEnabled: false,
    secretsReturned: false,
    privateKeysReturned: false,
    note: "This endpoint checks the CRAYS communication persistence draft and schema readiness. It returns no conversations, messages, provider payloads or outbound sending capability.",
  });
}
