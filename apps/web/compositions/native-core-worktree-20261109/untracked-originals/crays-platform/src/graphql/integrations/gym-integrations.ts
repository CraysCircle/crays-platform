import { GraphQLError } from "graphql";

import { getDocumentsApprovalsReadModel } from "@/db/documents-approvals-signatures-repository";
import { captureMailDraftSandbox, getMailOperatingSystemReadModel } from "@/db/mail-operating-system-repository";
import type { RoleKey } from "@/lib/roles";
import type { CraysGraphQLContext } from "../context";

const integrationRoles = new Set<RoleKey>([
  "crays-management", "admin", "deal-manager", "expansion-manager", "finance", "hr",
  "franchise-partner", "studio-manager", "bank-partner", "landlord", "vendor", "reviewer",
]);

function actor(context: CraysGraphQLContext) {
  return context.route.session.account?.id ?? `review:${context.route.role}`;
}

function opaque(kind: string, rawId: string) {
  return Buffer.from(JSON.stringify({ kind, id: rawId }), "utf8").toString("base64url");
}

export async function getGymIntegrationHub(context: CraysGraphQLContext) {
  const role = context.route.role;
  const [documents, mail] = await Promise.all([
    getDocumentsApprovalsReadModel({ tenantId: context.route.tenantId, role }),
    getMailOperatingSystemReadModel({ tenantId: context.route.tenantId, role }),
  ]);

  const documentNodes = documents.documents.map((document) => ({
      id: opaque("document", String(document.documentId)),
      title: String(document.title),
      documentType: String(document.documentType),
      lifecycleState: String(document.lifecycleState),
      versionHash: document.contentSha256 ? String(document.contentSha256) : null,
      approvalSteps: Number(document.approvalSteps),
      approvedSteps: Number(document.approvedSteps),
      envelopeCount: Number(document.envelopeCount),
      requiredSignatureLevel: String(document.requiredSignatureLevel),
    }));
  const mailNodes = mail.threads.map((thread) => ({
      id: opaque("mail-thread", String(thread.threadId)),
      subject: String(thread.subject),
      state: String(thread.state),
      messageCount: Number(thread.messageCount),
      unreadCount: Number(thread.unreadCount),
      hasAttachments: Boolean(thread.hasAttachments),
      lastMessageAt: thread.lastMessageAt ? new Date(String(thread.lastMessageAt)).toISOString() : null,
    }));
  const connection = <T extends { id: string }>(nodes: T[]) => ({
    edges: nodes.map((node) => ({ cursor: node.id, node })),
    pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: nodes[0]?.id ?? null, endCursor: nodes.at(-1)?.id ?? null },
    totalCount: nodes.length,
  });
  return {
    documents: connection(documentNodes),
    mailThreads: connection(mailNodes),
    documentSignatureAdapter: { provider: "documenso", domain: "DOCUMENT_SIGNATURE", inboundModes: ["SIGNED_WEBHOOK", "POLL", "BACKFILL"], outboundCommands: ["REGISTER_UPLOAD", "CREATE_ENVELOPE", "CANCEL_ENVELOPE"], externalEffectsEnabled: false },
    mailAdapter: { provider: "roundcube", domain: "MAIL", inboundModes: ["POLL", "BACKFILL", "DELIVERY_RECEIPT"], outboundCommands: ["CREATE_DRAFT", "APPROVE_SEND", "SEND"], externalEffectsEnabled: false },
    boundaries: {
      graphqlBinaryTransferAllowed: false,
      signedObjectUrlRequired: true,
      uploadRegistrationRequired: true,
      malwareScanRequired: true,
      externalSendEnabled: false,
      realUploadEnabled: false,
      signatureDispatchEnabled: false,
      providerSecretsReturned: false,
    },
  };
}

export async function captureGymMailDraft(input: {
  mailAccountId: string;
  threadId?: string | null;
  idempotencyKey: string;
  to: string[];
  cc?: string[] | null;
  subject: string;
  bodyText: string;
}, context: CraysGraphQLContext) {
  if (!integrationRoles.has(context.route.role)) {
    throw new GraphQLError("This role cannot capture mail drafts.", { extensions: { code: "FORBIDDEN" } });
  }
  const result = await captureMailDraftSandbox({
    tenantId: context.route.tenantId,
    actorAccountId: actor(context),
    role: context.route.role,
    mailAccountId: input.mailAccountId,
    ...(input.threadId ? { threadId: input.threadId } : {}),
    idempotencyKey: input.idempotencyKey,
    to: input.to,
    cc: input.cc ?? [],
    subject: input.subject,
    bodyText: input.bodyText,
  });
  return {
    status: result.status,
    draftId: opaque("mail-draft", result.draftId),
    threadId: result.threadId ? opaque("mail-thread", result.threadId) : null,
    externalSendPerformed: result.externalSendPerformed,
    errors: [],
  };
}
