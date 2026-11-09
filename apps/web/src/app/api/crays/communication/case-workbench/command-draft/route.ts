import { createHash, randomUUID } from "node:crypto";
import { getCaseCommunicationWorkbenchReadModel } from "@/db/case-communication-workbench-read-model-repository";
import { stageCrmActivityCommand } from "@/db/core-command-write-repository";
import { assertCoreCommandWriteAllowed } from "@/lib/core-command-write-guard";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function idempotencyKey(parts: string[]) {
  const hash = createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 24);
  return `case_comm_${hash}`;
}

export async function POST(request: Request) {
  const guard = assertCoreCommandWriteAllowed(request, process.env, "stage-case-communication-command");
  if (!guard.allowed) return guard.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
    const preparedOfferId = cleanText(body.preparedOfferId ?? body.case);
    const dealId = cleanText(body.dealId ?? body.deal) || null;
    const propertyCaseId = cleanText(body.propertyCaseId ?? body.propertyCase) || null;
    const conversationId = cleanText(body.conversationId);
    const subject = cleanText(body.subject, "Draft case reply for review");
    const messageBody = cleanText(body.body, "Draft reply requires review before any external sharing.");
    const draftKind = cleanText(body.draftKind, "reply");
    const dedupe = cleanText(body.clientDraftId, randomUUID());

    const readModel = await getCaseCommunicationWorkbenchReadModel({ role, preparedOfferId, dealId, propertyCaseId, limit: 20 });
    const conversation = readModel.conversations.find((item) => item.conversationId === conversationId) ?? readModel.conversations[0];

    if (!readModel.access.allowed || !readModel.case || !conversation) {
      return Response.json({ status: "not_found", error: "No case conversation is available for this role.", secretsReturned: false, privateKeysReturned: false }, { status: 404 });
    }

    if (!readModel.availableActions.canStageReplyDraft) {
      return Response.json({ status: "forbidden", error: "This role cannot stage a communication draft.", secretsReturned: false, privateKeysReturned: false }, { status: 403 });
    }

    const result = await stageCrmActivityCommand({
      idempotencyKey: idempotencyKey([readModel.case.preparedOfferId, conversation.conversationId, role, draftKind, dedupe]),
      actorRole: role as "deal-manager" | "expansion-manager" | "reviewer" | "admin" | "crays-management",
      commandType: "activity",
      action: "log_activity",
      subject,
      body: [
        `Conversation: ${conversation.title}`,
        `Visibility: ${draftKind === "internal-note" ? "internal" : "shared review"}`,
        messageBody,
      ].join("\n"),
      status: draftKind === "internal-note" ? "internal_note_drafted" : "reply_review_drafted",
      priority: conversation.priority === "high" ? "High" : "Medium",
      preparedOfferId: readModel.case.preparedOfferId,
      dealId: readModel.case.dealId,
      propertyCaseId: readModel.case.propertyCaseId,
      activityId: conversation.conversationId,
    });

    return Response.json({
      status: result.created ? "created" : "idempotent_existing",
      writeEnabled: true,
      conversation: {
        conversationId: conversation.conversationId,
        title: conversation.title,
      },
      result,
      externalSendingEnabled: false,
      providerConnectionsEnabled: false,
      sourceWritesEnabled: false,
      syncWritesEnabled: false,
      uploadEnabled: false,
      releaseEnabled: false,
      paymentInitiationEnabled: false,
      secretsReturned: false,
      privateKeysReturned: false,
    });
  } catch (error) {
    return Response.json(
      {
        status: "invalid",
        error: error instanceof Error ? error.message : "Invalid communication draft request.",
        externalSendingEnabled: false,
        providerConnectionsEnabled: false,
        sourceWritesEnabled: false,
        syncWritesEnabled: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      { status: 400 },
    );
  }
}
