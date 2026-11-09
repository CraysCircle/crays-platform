import { getCoreCommandHistoryReadModel, type CoreCommandHistoryRecord } from "./core-command-history-read-model-repository";
import { getCoreDatabaseRuntimeState, getCorePgPool } from "./client";
import { communicationPolicyForRole } from "@/lib/communication";
import type { RoleKey } from "@/lib/roles";

type JsonRecord = Record<string, unknown>;
type ConversationVisibility = "internal" | "shared" | "external";

export type CaseCommunicationWorkbenchQuery = {
  role: RoleKey;
  preparedOfferId?: string | null;
  dealId?: string | null;
  propertyCaseId?: string | null;
  limit?: number;
};

export type CaseCommunicationMessage = {
  messageId: string;
  conversationId: string;
  senderRole: string;
  channel: string;
  messageType: string;
  body: string;
  visibility: ConversationVisibility;
  deliveryStatus: string;
  reviewStatus: string;
  relatedDocumentIds: string[];
  createdAt: string;
};

export type CaseCommunicationParticipant = {
  participantId: string;
  conversationId: string;
  role: string;
  participantType: string;
  visibilityLevel: ConversationVisibility;
  canReply: boolean;
  canInvite: boolean;
  status: string;
};

export type CaseCommunicationConversation = {
  conversationId: string;
  title: string;
  conversationType: string;
  relatedEntityType: string;
  relatedEntityId: string;
  status: string;
  visibilityRoles: string[];
  lastMessageAt: string | null;
  priority: string;
  unread: number;
  participants: CaseCommunicationParticipant[];
  messages: CaseCommunicationMessage[];
  nextAction: string;
};

export type CaseCommunicationConsent = {
  consentId: string;
  channel: string;
  status: string;
  purpose: string;
  updatedAt: string;
};

export type CaseCommunicationWorkbenchReadModel = {
  access: {
    role: RoleKey;
    allowed: boolean;
    level: "case_communication" | "forbidden";
  };
  case: {
    preparedOfferId: string;
    dealId: string | null;
    propertyCaseId: string | null;
    bankPackageId: string | null;
    loanCaseId: string | null;
    title: string;
    status: string;
  } | null;
  summary: {
    conversations: number;
    messages: number;
    internalMessages: number;
    sharedMessages: number;
    externalMessages: number;
    needsReview: number;
    waitingThreads: number;
    activeConsents: number;
    pendingConsents: number;
    commandDrafts: number;
  };
  conversations: CaseCommunicationConversation[];
  consents: CaseCommunicationConsent[];
  commandHistory: CoreCommandHistoryRecord[];
  availableActions: {
    canStageReplyDraft: boolean;
    canWriteInternalNote: boolean;
    externalSendRequiresReview: boolean;
    providerConnectionRequired: boolean;
  };
  boundaries: {
    providerConnectionsEnabled: false;
    externalSendingEnabled: false;
    sourceWritesEnabled: false;
    syncWritesEnabled: false;
    uploadEnabled: false;
    releaseEnabled: false;
    paymentInitiationEnabled: false;
  };
  queryStatus: "not_configured" | "schema_ready" | "not_found" | "forbidden";
  secretsReturned: false;
  privateKeysReturned: false;
};

type CaseRow = {
  offer_id: string;
  deal_id: string | null;
  property_case_id: string | null;
  bank_package_id: string | null;
  loan_case_id: string | null;
  title: string;
  offer_status: string;
};

type ConversationRow = {
  conversation_id: string;
  title: string;
  conversation_type: string;
  related_entity_type: string;
  related_entity_id: string;
  visibility_roles: unknown;
  status: string;
  metadata: JsonRecord;
  last_message_at: Date | null;
};

type ParticipantRow = {
  participant_id: string;
  conversation_id: string;
  role_key: string;
  participant_type: string;
  visibility_level: ConversationVisibility;
  can_reply: boolean;
  can_invite: boolean;
  status: string;
};

type MessageRow = {
  message_id: string;
  conversation_id: string;
  sender_role: string;
  channel: string;
  message_type: string;
  body: string;
  visibility: ConversationVisibility;
  delivery_status: string;
  review_status: string;
  related_document_ids: unknown;
  created_at: Date;
};

type ConsentRow = {
  consent_id: string;
  channel: string;
  status: string;
  purpose: string;
  updated_at: Date;
};

const allowedRoles: RoleKey[] = [
  "crays-management",
  "admin",
  "deal-manager",
  "expansion-manager",
  "finance",
  "hr",
  "franchise-candidate",
  "franchise-partner",
  "studio-manager",
  "bank-partner",
  "landlord",
  "vendor",
  "reviewer",
  "gym-member",
];

function boundedLimit(limit: number | undefined) {
  if (!Number.isFinite(limit)) return 8;
  return Math.min(Math.max(Math.trunc(limit ?? 8), 1), 20);
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function jsonObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function textArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function iso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function boundaries(): CaseCommunicationWorkbenchReadModel["boundaries"] {
  return {
    providerConnectionsEnabled: false,
    externalSendingEnabled: false,
    sourceWritesEnabled: false,
    syncWritesEnabled: false,
    uploadEnabled: false,
    releaseEnabled: false,
    paymentInitiationEnabled: false,
  };
}

function emptyReadModel(
  query: CaseCommunicationWorkbenchQuery,
  allowed: boolean,
  status: CaseCommunicationWorkbenchReadModel["queryStatus"],
): CaseCommunicationWorkbenchReadModel {
  const policy = communicationPolicyForRole(query.role);
  return {
    access: {
      role: query.role,
      allowed,
      level: allowed ? "case_communication" : "forbidden",
    },
    case: null,
    summary: {
      conversations: 0,
      messages: 0,
      internalMessages: 0,
      sharedMessages: 0,
      externalMessages: 0,
      needsReview: 0,
      waitingThreads: 0,
      activeConsents: 0,
      pendingConsents: 0,
      commandDrafts: 0,
    },
    conversations: [],
    consents: [],
    commandHistory: [],
    availableActions: {
      canStageReplyDraft: allowed && policy.canReplyTypes.length > 0,
      canWriteInternalNote: allowed && policy.canWriteInternalNotes,
      externalSendRequiresReview: true,
      providerConnectionRequired: true,
    },
    boundaries: boundaries(),
    queryStatus: status,
    secretsReturned: false,
    privateKeysReturned: false,
  };
}

async function getCaseRow(query: CaseCommunicationWorkbenchQuery) {
  const pool = getCorePgPool();
  const result = await pool.query<CaseRow>(
    `
      select
        prepared_offers.offer_id,
        deals.deal_id,
        property_cases.case_id as property_case_id,
        bank_packages.package_id as bank_package_id,
        loan_cases.loan_case_id,
        prepared_offers.title,
        prepared_offers.status as offer_status
      from crays_core.prepared_offers
      left join crays_core.property_cases on property_cases.case_id = prepared_offers.property_case_id
      left join crays_core.deals on deals.prepared_offer_id = prepared_offers.offer_id
      left join crays_core.bank_packages on bank_packages.deal_id = deals.deal_id
      left join crays_core.loan_cases on loan_cases.bank_package_id = bank_packages.package_id
      left join crays_core.conversations on conversations.prepared_offer_id = prepared_offers.offer_id
      where ($1::text is null or prepared_offers.offer_id = $1)
        and ($2::text is null or deals.deal_id = $2)
        and ($3::text is null or property_cases.case_id = $3)
      group by
        prepared_offers.offer_id,
        prepared_offers.title,
        prepared_offers.status,
        prepared_offers.updated_at,
        deals.deal_id,
        property_cases.case_id,
        bank_packages.package_id,
        loan_cases.loan_case_id
      order by
        case when $1::text is not null and prepared_offers.offer_id = $1 then 0 else 1 end,
        max(conversations.last_message_at) desc nulls last,
        prepared_offers.updated_at desc
      limit 1
    `,
    [query.preparedOfferId ?? null, query.dealId ?? null, query.propertyCaseId ?? null],
  );
  return result.rows[0] ?? null;
}

async function getConversationRows(row: CaseRow, role: RoleKey, limit: number) {
  const pool = getCorePgPool();
  const result = await pool.query<ConversationRow>(
    `
      select conversation_id, title, conversation_type, related_entity_type, related_entity_id,
        visibility_roles, status, metadata, last_message_at
      from crays_core.conversations
      where prepared_offer_id = $1
        and visibility_roles ? $2
      order by last_message_at desc nulls last, id desc
      limit $3
    `,
    [row.offer_id, role, limit],
  );
  return result.rows.map((conversation) => ({
    ...conversation,
    metadata: jsonObject(conversation.metadata),
  }));
}

async function getParticipantRows(conversationIds: string[]) {
  if (conversationIds.length === 0) return [];
  const pool = getCorePgPool();
  const result = await pool.query<ParticipantRow>(
    `
      select participant_id, conversation_id, role_key, participant_type, visibility_level, can_reply, can_invite, status
      from crays_core.conversation_participants
      where conversation_id = any($1::text[])
      order by
        case participant_type when 'internal' then 0 when 'candidate' then 1 when 'bank' then 2 when 'partner' then 3 else 4 end,
        id
    `,
    [conversationIds],
  );
  return result.rows;
}

async function getMessageRows(conversationIds: string[], visibleVisibilities: ConversationVisibility[]) {
  if (conversationIds.length === 0) return [];
  const pool = getCorePgPool();
  const result = await pool.query<MessageRow>(
    `
      select message_id, conversation_id, sender_role, channel, message_type, body, visibility,
        delivery_status, review_status, related_document_ids, created_at
      from crays_core.messages
      where conversation_id = any($1::text[])
        and visibility = any($2::text[])
        and deleted_at is null
      order by created_at asc, id asc
    `,
    [conversationIds, visibleVisibilities],
  );
  return result.rows;
}

async function getConsentRows(preparedOfferId: string, internalVisibility: boolean) {
  if (!internalVisibility) return [];
  const pool = getCorePgPool();
  const result = await pool.query<ConsentRow>(
    `
      select consent_id, channel, status, purpose, updated_at
      from crays_core.communication_consents
      where metadata ->> 'preparedOfferId' = $1
      order by case status when 'pending' then 0 when 'active' then 1 else 2 end, updated_at desc
    `,
    [preparedOfferId],
  );
  return result.rows;
}

function nextActionFor(conversation: ConversationRow, messages: CaseCommunicationMessage[]) {
  if (messages.some((message) => message.reviewStatus === "needs_review")) return "Review the draft reply before sharing.";
  if (conversation.status === "pending") return "Assign the next owner and answer the open question.";
  if (messages.some((message) => message.deliveryStatus === "failed" || message.deliveryStatus === "blocked")) return "Resolve delivery issue.";
  return "Continue the thread from the case workspace.";
}

function buildConversations(
  conversationRows: ConversationRow[],
  participantRows: ParticipantRow[],
  messageRows: MessageRow[],
): CaseCommunicationConversation[] {
  return conversationRows.map((conversation) => {
    const participants = participantRows
      .filter((participant) => participant.conversation_id === conversation.conversation_id)
      .map((participant) => ({
        participantId: participant.participant_id,
        conversationId: participant.conversation_id,
        role: participant.role_key,
        participantType: participant.participant_type,
        visibilityLevel: participant.visibility_level,
        canReply: participant.can_reply,
        canInvite: participant.can_invite,
        status: participant.status,
      }));
    const messages = messageRows
      .filter((message) => message.conversation_id === conversation.conversation_id)
      .map((message) => ({
        messageId: message.message_id,
        conversationId: message.conversation_id,
        senderRole: message.sender_role,
        channel: message.channel,
        messageType: message.message_type,
        body: message.body,
        visibility: message.visibility,
        deliveryStatus: message.delivery_status,
        reviewStatus: message.review_status,
        relatedDocumentIds: textArray(message.related_document_ids),
        createdAt: message.created_at.toISOString(),
      }));
    return {
      conversationId: conversation.conversation_id,
      title: conversation.title,
      conversationType: conversation.conversation_type,
      relatedEntityType: conversation.related_entity_type,
      relatedEntityId: conversation.related_entity_id,
      status: conversation.status,
      visibilityRoles: textArray(conversation.visibility_roles),
      lastMessageAt: iso(conversation.last_message_at),
      priority: text(conversation.metadata.priority) ?? "normal",
      unread: messages.filter((message) => message.deliveryStatus === "not_sent" || message.reviewStatus === "needs_review").length,
      participants,
      messages,
      nextAction: nextActionFor(conversation, messages),
    };
  });
}

export async function getCaseCommunicationWorkbenchReadModel(
  query: CaseCommunicationWorkbenchQuery,
): Promise<CaseCommunicationWorkbenchReadModel> {
  const allowed = allowedRoles.includes(query.role);
  if (!allowed) return emptyReadModel(query, false, "forbidden");

  const runtime = getCoreDatabaseRuntimeState();
  if (!runtime.configured) return emptyReadModel(query, true, "not_configured");

  const row = await getCaseRow(query);
  if (!row) return emptyReadModel(query, true, "not_found");

  const policy = communicationPolicyForRole(query.role);
  const limit = boundedLimit(query.limit);
  const visibleVisibilities = policy.visibleVisibilities as ConversationVisibility[];
  const conversationRows = await getConversationRows(row, query.role, limit);
  const conversationIds = conversationRows.map((conversation) => conversation.conversation_id);
  const [participantRows, messageRows, consentRows, commandHistory] = await Promise.all([
    getParticipantRows(conversationIds),
    getMessageRows(conversationIds, visibleVisibilities),
    getConsentRows(row.offer_id, visibleVisibilities.includes("internal")),
    getCoreCommandHistoryReadModel({ role: query.role, preparedOfferId: row.offer_id, limit: 8 }),
  ]);
  const conversations = buildConversations(conversationRows, participantRows, messageRows);
  const messages = conversations.flatMap((conversation) => conversation.messages);

  return {
    access: {
      role: query.role,
      allowed: true,
      level: "case_communication",
    },
    case: {
      preparedOfferId: row.offer_id,
      dealId: row.deal_id,
      propertyCaseId: row.property_case_id,
      bankPackageId: row.bank_package_id,
      loanCaseId: row.loan_case_id,
      title: row.title,
      status: row.offer_status,
    },
    summary: {
      conversations: conversations.length,
      messages: messages.length,
      internalMessages: messages.filter((message) => message.visibility === "internal").length,
      sharedMessages: messages.filter((message) => message.visibility === "shared").length,
      externalMessages: messages.filter((message) => message.visibility === "external").length,
      needsReview: messages.filter((message) => message.reviewStatus === "needs_review").length,
      waitingThreads: conversations.filter((conversation) => conversation.status === "pending").length,
      activeConsents: consentRows.filter((consent) => consent.status === "active").length,
      pendingConsents: consentRows.filter((consent) => consent.status === "pending").length,
      commandDrafts: commandHistory.records.filter((record) => record.moduleKey === "crm").length,
    },
    conversations,
    consents: consentRows.map((consent) => ({
      consentId: consent.consent_id,
      channel: consent.channel,
      status: consent.status,
      purpose: consent.purpose,
      updatedAt: consent.updated_at.toISOString(),
    })),
    commandHistory: commandHistory.records.filter((record) => record.moduleKey === "crm"),
    availableActions: {
      canStageReplyDraft: policy.canReplyTypes.length > 0,
      canWriteInternalNote: policy.canWriteInternalNotes,
      externalSendRequiresReview: true,
      providerConnectionRequired: true,
    },
    boundaries: boundaries(),
    queryStatus: "schema_ready",
    secretsReturned: false,
    privateKeysReturned: false,
  };
}
