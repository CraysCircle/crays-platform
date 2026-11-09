import type { ModuleKey } from "./modules";
import type { PermissionKey, PermissionScope } from "./permissions";
import type { RoleKey } from "./roles";

export type CommunicationChannel =
  | "internal-chat"
  | "external-chat"
  | "email"
  | "whatsapp"
  | "sms"
  | "in-app"
  | "push";

export type ConversationType =
  | "internal-note"
  | "shared-comment"
  | "external-message"
  | "bank-question"
  | "candidate-reply"
  | "partner-opening"
  | "property-question"
  | "supplier-rfi"
  | "member-service"
  | "support-message"
  | "system-notification";

export type CommunicationVisibility = "internal" | "shared" | "external";

export type CommunicationRelatedEntityType =
  | "candidate"
  | "deal"
  | "bank-package"
  | "loan"
  | "property"
  | "lease"
  | "project"
  | "studio"
  | "member"
  | "document"
  | "task"
  | "support-ticket";

export type CommunicationDeliveryStatus =
  | "draft"
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "received"
  | "opted_out";

export type Conversation = {
  id: string;
  title: string;
  type: ConversationType;
  relatedEntityType: CommunicationRelatedEntityType;
  relatedEntityId: string;
  visibilityRoles: RoleKey[];
  status: "open" | "waiting" | "review" | "closed";
};

export type ConversationParticipant = {
  id: string;
  conversationId: string;
  role: RoleKey;
  accountId?: string;
  organizationId?: string;
  displayName: string;
  visibility: CommunicationVisibility;
};

export type Message = {
  id: string;
  conversationId: string;
  channel: CommunicationChannel;
  senderRole: RoleKey;
  body: string;
  visibility: CommunicationVisibility;
  deliveryStatus: CommunicationDeliveryStatus;
  relatedDocumentIds: string[];
  createdAt: string;
};

export type CommunicationConsent = {
  subjectId: string;
  channel: CommunicationChannel;
  status: "not_required" | "pending" | "granted" | "revoked";
  source: "contract" | "account-setting" | "support-request" | "manual-review";
  updatedAt: string;
};

export type CommunicationAdapterKey =
  | "internal-messages"
  | "shared-portal-thread"
  | "mail-adapter"
  | "external-messaging-adapter"
  | "sms-adapter"
  | "in-app-adapter"
  | "push-adapter";

export type CommunicationAdapterContract = {
  key: CommunicationAdapterKey;
  label: string;
  channels: CommunicationChannel[];
  direction: "inbound" | "outbound" | "bidirectional";
  requiredPermission: PermissionKey;
  requiredScope: PermissionScope;
  consentRequired: boolean;
  webhookRequired: boolean;
  status:
    | "contract_ready"
    | "blocked_until_provider"
    | "blocked_until_consent_policy"
    | "blocked_until_member_app";
  producesEvents: string[];
  guardrails: string[];
};

export type CommunicationRouteContract = {
  id: string;
  title: string;
  type: ConversationType;
  primaryModule: ModuleKey;
  relatedEntityTypes: CommunicationRelatedEntityType[];
  participantRoles: RoleKey[];
  allowedChannels: CommunicationChannel[];
  defaultVisibility: CommunicationVisibility;
  requiredPermission: PermissionKey;
  requiredScope: PermissionScope;
  documentPolicy: "no-attachments" | "secure-links-only" | "document-vault-check";
  eventTypes: string[];
  status: "contract_ready" | "blocked_until_persistence" | "blocked_until_provider";
};

export type RoleCommunicationPolicy = {
  role: RoleKey;
  canStartTypes: ConversationType[];
  canReplyTypes: ConversationType[];
  allowedChannels: CommunicationChannel[];
  visibleVisibilities: CommunicationVisibility[];
  canWriteInternalNotes: boolean;
  canSendExternalMessages: boolean;
  canInviteExternalParticipants: boolean;
};

export type CommunicationDashboardSignalContract = {
  id: string;
  label: string;
  sourceTypes: ConversationType[];
  visibilityRoles: RoleKey[];
  sourceModules: ModuleKey[];
  refreshPolicy: "event-driven" | "hourly" | "manual-review";
};

export type CommunicationContract = {
  status: "contract_ready";
  liveConversationsReturned: false;
  liveMessagesReturned: false;
  liveProviderConnectionsReturned: false;
  adapters: CommunicationAdapterContract[];
  routes: CommunicationRouteContract[];
  rolePolicies: RoleCommunicationPolicy[];
  dashboardSignals: CommunicationDashboardSignalContract[];
  guardrails: string[];
};

export const communicationAdapterContracts: CommunicationAdapterContract[] = [
  {
    key: "internal-messages",
    label: "internal messages",
    channels: ["internal-chat", "in-app"],
    direction: "bidirectional",
    requiredPermission: "communication:create",
    requiredScope: "organization",
    consentRequired: false,
    webhookRequired: false,
    status: "contract_ready",
    producesEvents: ["message.created", "participant.added", "message.failed"],
    guardrails: ["Internal notes remain internal unless a separate shared comment is created."],
  },
  {
    key: "shared-portal-thread",
    label: "shared portal thread",
    channels: ["external-chat", "in-app"],
    direction: "bidirectional",
    requiredPermission: "communication:create",
    requiredScope: "deal",
    consentRequired: false,
    webhookRequired: false,
    status: "contract_ready",
    producesEvents: ["thread.opened", "reply.received", "thread.waiting"],
    guardrails: ["External participants only see explicitly shared thread content."],
  },
  {
    key: "mail-adapter",
    label: "mail adapter",
    channels: ["email"],
    direction: "bidirectional",
    requiredPermission: "communication:configure",
    requiredScope: "organization",
    consentRequired: true,
    webhookRequired: true,
    status: "blocked_until_provider",
    producesEvents: ["message.sent", "message.received", "message.delivery_failed"],
    guardrails: ["Sensitive documents should be linked through CRAYS instead of attached directly."],
  },
  {
    key: "external-messaging-adapter",
    label: "external messaging adapter",
    channels: ["whatsapp"],
    direction: "bidirectional",
    requiredPermission: "communication:configure",
    requiredScope: "organization",
    consentRequired: true,
    webhookRequired: true,
    status: "blocked_until_consent_policy",
    producesEvents: ["message.sent", "message.received", "consent.revoked", "message.delivery_failed"],
    guardrails: ["Consent, opt-out and sensitive-data policy must be approved before live sending."],
  },
  {
    key: "sms-adapter",
    label: "sms adapter",
    channels: ["sms"],
    direction: "bidirectional",
    requiredPermission: "communication:configure",
    requiredScope: "organization",
    consentRequired: true,
    webhookRequired: true,
    status: "blocked_until_consent_policy",
    producesEvents: ["message.sent", "message.received", "consent.revoked", "message.delivery_failed"],
    guardrails: ["Use short external messages for status, reminders and secure links only."],
  },
  {
    key: "in-app-adapter",
    label: "in-app adapter",
    channels: ["in-app"],
    direction: "bidirectional",
    requiredPermission: "communication:create",
    requiredScope: "own",
    consentRequired: false,
    webhookRequired: false,
    status: "contract_ready",
    producesEvents: ["notification.created", "reply.received", "thread.read"],
    guardrails: ["The active CRAYS account and role scope decide what in-app content is visible."],
  },
  {
    key: "push-adapter",
    label: "push adapter",
    channels: ["push"],
    direction: "outbound",
    requiredPermission: "communication:configure",
    requiredScope: "organization",
    consentRequired: true,
    webhookRequired: true,
    status: "blocked_until_member_app",
    producesEvents: ["notification.sent", "notification.delivered", "notification.failed"],
    guardrails: ["Push content must be short, scoped and linked back to CRAYS for sensitive details."],
  },
];

export const communicationRouteContracts: CommunicationRouteContract[] = [
  {
    id: "candidate-deal-thread",
    title: "Candidate deal thread",
    type: "candidate-reply",
    primaryModule: "crm",
    relatedEntityTypes: ["candidate", "deal", "document"],
    participantRoles: ["franchise-candidate", "deal-manager", "finance", "reviewer", "crays-management"],
    allowedChannels: ["external-chat", "in-app", "email"],
    defaultVisibility: "shared",
    requiredPermission: "communication:create",
    requiredScope: "deal",
    documentPolicy: "document-vault-check",
    eventTypes: ["candidate.question_received", "candidate.reply_sent", "document.requested"],
    status: "blocked_until_persistence",
  },
  {
    id: "bank-package-questions",
    title: "Bank package questions",
    type: "bank-question",
    primaryModule: "loans",
    relatedEntityTypes: ["bank-package", "loan", "document"],
    participantRoles: ["bank-partner", "deal-manager", "finance", "reviewer", "crays-management"],
    allowedChannels: ["external-chat", "in-app", "email"],
    defaultVisibility: "shared",
    requiredPermission: "communication:create",
    requiredScope: "deal",
    documentPolicy: "secure-links-only",
    eventTypes: ["bank_question.opened", "bank_question.answered", "bank_question.overdue"],
    status: "blocked_until_persistence",
  },
  {
    id: "opening-project-room",
    title: "Opening project room",
    type: "partner-opening",
    primaryModule: "project",
    relatedEntityTypes: ["project", "task", "studio", "document"],
    participantRoles: ["deal-manager", "franchise-partner", "expansion-manager", "vendor", "landlord", "reviewer"],
    allowedChannels: ["internal-chat", "external-chat", "in-app", "email"],
    defaultVisibility: "shared",
    requiredPermission: "communication:create",
    requiredScope: "project",
    documentPolicy: "document-vault-check",
    eventTypes: ["opening.reply_received", "opening.rfi_created", "opening.blocker_escalated"],
    status: "blocked_until_persistence",
  },
  {
    id: "property-lease-room",
    title: "Property and lease room",
    type: "property-question",
    primaryModule: "project",
    relatedEntityTypes: ["property", "lease", "project", "document"],
    participantRoles: ["expansion-manager", "deal-manager", "landlord", "reviewer", "crays-management"],
    allowedChannels: ["external-chat", "in-app", "email"],
    defaultVisibility: "shared",
    requiredPermission: "communication:create",
    requiredScope: "project",
    documentPolicy: "secure-links-only",
    eventTypes: ["lease.question_received", "lease.redline_requested", "property.handover_waiting"],
    status: "blocked_until_persistence",
  },
  {
    id: "supplier-rfi-thread",
    title: "Supplier RFI thread",
    type: "supplier-rfi",
    primaryModule: "project",
    relatedEntityTypes: ["project", "task", "document"],
    participantRoles: ["deal-manager", "franchise-partner", "vendor", "reviewer", "crays-management"],
    allowedChannels: ["external-chat", "in-app", "email"],
    defaultVisibility: "shared",
    requiredPermission: "communication:create",
    requiredScope: "project",
    documentPolicy: "document-vault-check",
    eventTypes: ["supplier.rfi_created", "supplier.answer_received", "supplier.delivery_risk"],
    status: "blocked_until_persistence",
  },
  {
    id: "studio-support-thread",
    title: "Studio support thread",
    type: "support-message",
    primaryModule: "support",
    relatedEntityTypes: ["studio", "support-ticket", "document"],
    participantRoles: ["franchise-partner", "studio-manager", "crays-management", "reviewer"],
    allowedChannels: ["external-chat", "in-app", "email", "whatsapp"],
    defaultVisibility: "shared",
    requiredPermission: "communication:create",
    requiredScope: "studio",
    documentPolicy: "document-vault-check",
    eventTypes: ["support.message_received", "support.sla_risk", "support.resolved"],
    status: "blocked_until_persistence",
  },
  {
    id: "member-service-thread",
    title: "Member service thread",
    type: "member-service",
    primaryModule: "operations",
    relatedEntityTypes: ["member", "support-ticket", "studio", "document"],
    participantRoles: ["gym-member", "studio-manager", "franchise-partner", "crays-management"],
    allowedChannels: ["in-app", "push", "email", "whatsapp"],
    defaultVisibility: "external",
    requiredPermission: "communication:create",
    requiredScope: "member",
    documentPolicy: "secure-links-only",
    eventTypes: ["member.message_received", "member.payment_question", "member.support_resolved"],
    status: "blocked_until_persistence",
  },
  {
    id: "finance-review-thread",
    title: "Finance review thread",
    type: "internal-note",
    primaryModule: "erp",
    relatedEntityTypes: ["studio", "deal", "document"],
    participantRoles: ["finance", "deal-manager", "reviewer", "crays-management"],
    allowedChannels: ["internal-chat", "in-app"],
    defaultVisibility: "internal",
    requiredPermission: "communication:create",
    requiredScope: "organization",
    documentPolicy: "document-vault-check",
    eventTypes: ["finance.review_requested", "finance.review_completed", "finance.exception_raised"],
    status: "blocked_until_persistence",
  },
  {
    id: "hr-private-thread",
    title: "HR private thread",
    type: "internal-note",
    primaryModule: "hr",
    relatedEntityTypes: ["studio", "document", "task"],
    participantRoles: ["hr", "studio-manager", "reviewer", "crays-management"],
    allowedChannels: ["internal-chat", "in-app"],
    defaultVisibility: "internal",
    requiredPermission: "communication:create",
    requiredScope: "organization",
    documentPolicy: "document-vault-check",
    eventTypes: ["hr.question_received", "hr.review_requested", "hr.certification_needed"],
    status: "blocked_until_persistence",
  },
];

export const roleCommunicationPolicies: RoleCommunicationPolicy[] = [
  {
    role: "crays-management",
    canStartTypes: [
      "internal-note",
      "shared-comment",
      "external-message",
      "bank-question",
      "partner-opening",
      "property-question",
      "supplier-rfi",
      "support-message",
    ],
    canReplyTypes: [
      "internal-note",
      "shared-comment",
      "external-message",
      "bank-question",
      "candidate-reply",
      "partner-opening",
      "property-question",
      "supplier-rfi",
      "support-message",
      "member-service",
    ],
    allowedChannels: ["internal-chat", "external-chat", "email", "whatsapp", "sms", "in-app", "push"],
    visibleVisibilities: ["internal", "shared", "external"],
    canWriteInternalNotes: true,
    canSendExternalMessages: true,
    canInviteExternalParticipants: true,
  },
  {
    role: "admin",
    canStartTypes: ["internal-note", "system-notification"],
    canReplyTypes: ["internal-note", "system-notification"],
    allowedChannels: ["internal-chat", "in-app", "push"],
    visibleVisibilities: ["internal", "shared"],
    canWriteInternalNotes: true,
    canSendExternalMessages: false,
    canInviteExternalParticipants: false,
  },
  {
    role: "deal-manager",
    canStartTypes: [
      "internal-note",
      "shared-comment",
      "external-message",
      "bank-question",
      "candidate-reply",
      "partner-opening",
      "property-question",
      "supplier-rfi",
    ],
    canReplyTypes: [
      "internal-note",
      "shared-comment",
      "external-message",
      "bank-question",
      "candidate-reply",
      "partner-opening",
      "property-question",
      "supplier-rfi",
      "support-message",
    ],
    allowedChannels: ["internal-chat", "external-chat", "email", "whatsapp", "sms", "in-app"],
    visibleVisibilities: ["internal", "shared", "external"],
    canWriteInternalNotes: true,
    canSendExternalMessages: true,
    canInviteExternalParticipants: true,
  },
  {
    role: "expansion-manager",
    canStartTypes: ["internal-note", "property-question", "supplier-rfi", "partner-opening"],
    canReplyTypes: ["internal-note", "property-question", "supplier-rfi", "partner-opening"],
    allowedChannels: ["internal-chat", "external-chat", "email", "in-app"],
    visibleVisibilities: ["internal", "shared", "external"],
    canWriteInternalNotes: true,
    canSendExternalMessages: true,
    canInviteExternalParticipants: true,
  },
  {
    role: "finance",
    canStartTypes: ["internal-note", "bank-question", "shared-comment"],
    canReplyTypes: ["internal-note", "bank-question", "candidate-reply", "shared-comment", "support-message"],
    allowedChannels: ["internal-chat", "external-chat", "email", "in-app"],
    visibleVisibilities: ["internal", "shared", "external"],
    canWriteInternalNotes: true,
    canSendExternalMessages: true,
    canInviteExternalParticipants: false,
  },
  {
    role: "hr",
    canStartTypes: ["internal-note", "shared-comment", "system-notification"],
    canReplyTypes: ["internal-note", "shared-comment", "support-message"],
    allowedChannels: ["internal-chat", "in-app", "email"],
    visibleVisibilities: ["internal", "shared"],
    canWriteInternalNotes: true,
    canSendExternalMessages: false,
    canInviteExternalParticipants: false,
  },
  {
    role: "franchise-candidate",
    canStartTypes: ["candidate-reply"],
    canReplyTypes: ["candidate-reply", "bank-question", "shared-comment"],
    allowedChannels: ["external-chat", "email", "in-app"],
    visibleVisibilities: ["shared", "external"],
    canWriteInternalNotes: false,
    canSendExternalMessages: true,
    canInviteExternalParticipants: false,
  },
  {
    role: "franchise-partner",
    canStartTypes: ["partner-opening", "support-message", "member-service", "supplier-rfi"],
    canReplyTypes: ["partner-opening", "support-message", "member-service", "property-question", "supplier-rfi"],
    allowedChannels: ["external-chat", "email", "whatsapp", "in-app", "push"],
    visibleVisibilities: ["shared", "external"],
    canWriteInternalNotes: false,
    canSendExternalMessages: true,
    canInviteExternalParticipants: false,
  },
  {
    role: "studio-manager",
    canStartTypes: ["support-message", "member-service", "shared-comment"],
    canReplyTypes: ["support-message", "member-service", "shared-comment"],
    allowedChannels: ["external-chat", "email", "whatsapp", "in-app", "push"],
    visibleVisibilities: ["shared", "external"],
    canWriteInternalNotes: false,
    canSendExternalMessages: true,
    canInviteExternalParticipants: false,
  },
  {
    role: "bank-partner",
    canStartTypes: ["bank-question"],
    canReplyTypes: ["bank-question", "shared-comment"],
    allowedChannels: ["external-chat", "email", "in-app"],
    visibleVisibilities: ["shared", "external"],
    canWriteInternalNotes: false,
    canSendExternalMessages: true,
    canInviteExternalParticipants: false,
  },
  {
    role: "investor",
    canStartTypes: [],
    canReplyTypes: ["shared-comment"],
    allowedChannels: ["external-chat", "email", "in-app"],
    visibleVisibilities: ["shared", "external"],
    canWriteInternalNotes: false,
    canSendExternalMessages: false,
    canInviteExternalParticipants: false,
  },
  {
    role: "landlord",
    canStartTypes: ["property-question"],
    canReplyTypes: ["property-question", "shared-comment"],
    allowedChannels: ["external-chat", "email", "in-app"],
    visibleVisibilities: ["shared", "external"],
    canWriteInternalNotes: false,
    canSendExternalMessages: true,
    canInviteExternalParticipants: false,
  },
  {
    role: "vendor",
    canStartTypes: ["supplier-rfi"],
    canReplyTypes: ["supplier-rfi", "shared-comment"],
    allowedChannels: ["external-chat", "email", "in-app"],
    visibleVisibilities: ["shared", "external"],
    canWriteInternalNotes: false,
    canSendExternalMessages: true,
    canInviteExternalParticipants: false,
  },
  {
    role: "reviewer",
    canStartTypes: ["internal-note", "shared-comment"],
    canReplyTypes: ["internal-note", "shared-comment", "bank-question", "candidate-reply", "partner-opening"],
    allowedChannels: ["internal-chat", "external-chat", "email", "in-app"],
    visibleVisibilities: ["internal", "shared"],
    canWriteInternalNotes: true,
    canSendExternalMessages: false,
    canInviteExternalParticipants: false,
  },
  {
    role: "gym-member",
    canStartTypes: ["member-service"],
    canReplyTypes: ["member-service", "support-message"],
    allowedChannels: ["in-app", "push", "email", "whatsapp"],
    visibleVisibilities: ["external"],
    canWriteInternalNotes: false,
    canSendExternalMessages: true,
    canInviteExternalParticipants: false,
  },
  {
    role: "guest",
    canStartTypes: [],
    canReplyTypes: [],
    allowedChannels: ["in-app"],
    visibleVisibilities: ["external"],
    canWriteInternalNotes: false,
    canSendExternalMessages: false,
    canInviteExternalParticipants: false,
  },
];

export const communicationDashboardSignals: CommunicationDashboardSignalContract[] = [
  {
    id: "signal-candidate-unanswered",
    label: "Unanswered candidate questions",
    sourceTypes: ["candidate-reply"],
    visibilityRoles: ["deal-manager", "crays-management", "reviewer"],
    sourceModules: ["crm", "loans", "chat"],
    refreshPolicy: "event-driven",
  },
  {
    id: "signal-bank-question-open",
    label: "Open bank questions",
    sourceTypes: ["bank-question"],
    visibilityRoles: ["deal-manager", "finance", "bank-partner", "crays-management"],
    sourceModules: ["loans", "files", "chat"],
    refreshPolicy: "event-driven",
  },
  {
    id: "signal-message-delivery-failed",
    label: "Delivery failures",
    sourceTypes: ["external-message", "support-message", "member-service"],
    visibilityRoles: ["deal-manager", "franchise-partner", "studio-manager", "crays-management"],
    sourceModules: ["chat", "support", "operations"],
    refreshPolicy: "event-driven",
  },
  {
    id: "signal-project-stakeholder-waiting",
    label: "Stakeholder waiting",
    sourceTypes: ["partner-opening", "property-question", "supplier-rfi"],
    visibilityRoles: ["deal-manager", "franchise-partner", "expansion-manager", "crays-management"],
    sourceModules: ["project", "chat"],
    refreshPolicy: "event-driven",
  },
  {
    id: "signal-member-service-risk",
    label: "Member service risk",
    sourceTypes: ["member-service", "support-message"],
    visibilityRoles: ["franchise-partner", "studio-manager", "crays-management", "reviewer"],
    sourceModules: ["operations", "support", "chat"],
    refreshPolicy: "hourly",
  },
  {
    id: "signal-consent-missing",
    label: "Consent missing",
    sourceTypes: ["external-message", "member-service", "support-message"],
    visibilityRoles: ["admin", "crays-management", "deal-manager", "studio-manager"],
    sourceModules: ["settings", "chat", "support"],
    refreshPolicy: "manual-review",
  },
];

export const communicationGuardrails = [
  "Internal notes must never become external messages by accident.",
  "Attachments use the same document access checks as the vault.",
  "External channels require consent and opt-out handling where required.",
  "Sensitive documents should use secure portal links instead of raw external attachments.",
  "Every live outbound message must pass CRAYS role, scope, consent and document checks.",
  "Every inbound provider webhook must be verified before creating a CRAYS event.",
  "Communication state feeds workflow events, dashboard signals and audit trails.",
];

export function communicationPolicyForRole(role: RoleKey) {
  return roleCommunicationPolicies.find((policy) => policy.role === role)!;
}

export function communicationRoutesForRole(role: RoleKey) {
  return communicationRouteContracts.filter((route) => route.participantRoles.includes(role));
}

export function communicationAdaptersForRole(role: RoleKey) {
  const policy = communicationPolicyForRole(role);
  return communicationAdapterContracts.filter((adapter) =>
    adapter.channels.some((channel) => policy.allowedChannels.includes(channel)),
  );
}

export function getCommunicationContract(): CommunicationContract {
  return {
    status: "contract_ready",
    liveConversationsReturned: false,
    liveMessagesReturned: false,
    liveProviderConnectionsReturned: false,
    adapters: communicationAdapterContracts,
    routes: communicationRouteContracts,
    rolePolicies: roleCommunicationPolicies,
    dashboardSignals: communicationDashboardSignals,
    guardrails: communicationGuardrails,
  };
}
