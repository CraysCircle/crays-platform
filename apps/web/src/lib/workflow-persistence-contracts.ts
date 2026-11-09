import { communicationRoutesForRole } from "./communication";
import { getDocumentAccessForRole, type DocumentGroupKey } from "./document-vault";
import type { RoleKey } from "./roles";
import { getEventKpiContract } from "./event-kpi";

export type WorkflowPersistenceContractKey = "document-evidence" | "workflow-events" | "communication";

export type PersistenceEntityLink = {
  entityType: string;
  tableName: string;
  allowedDocumentGroups?: DocumentGroupKey[];
  requiredGate: string;
};

export type PersistenceTableContract = {
  tableName: string;
  status: "implemented" | "drafted" | "planned";
  purpose: string;
  storesSecrets: false;
  storesPrivateKeys: false;
  liveRecordsReturned: false;
};

export type WorkflowPersistenceContract = {
  key: WorkflowPersistenceContractKey;
  label: string;
  status: "contract_ready";
  tables: PersistenceTableContract[];
  entityLinks: PersistenceEntityLink[];
  requiredEvents: string[];
  guardrails: string[];
};

export const documentEvidencePersistenceContract: WorkflowPersistenceContract = {
  key: "document-evidence",
  label: "Document And Evidence Persistence",
  status: "contract_ready",
  tables: [
    {
      tableName: "crays_core.document_package_links",
      status: "implemented",
      purpose: "Links document metadata references to prepared offers, deals, property cases, bank packages, loan cases and opening projects.",
      storesSecrets: false,
      storesPrivateKeys: false,
      liveRecordsReturned: false,
    },
    {
      tableName: "crays_core.evidence_packages",
      status: "implemented",
      purpose: "Groups released and internal evidence summaries for candidates, owners, banks and CRAYS reviewers.",
      storesSecrets: false,
      storesPrivateKeys: false,
      liveRecordsReturned: false,
    },
  ],
  entityLinks: [
    {
      entityType: "prepared-offer",
      tableName: "crays_core.prepared_offers",
      allowedDocumentGroups: ["public-franchise-proof", "property-lease", "construction"],
      requiredGate: "Candidate release state controls whether summary or detail documents are visible.",
    },
    {
      entityType: "deal",
      tableName: "crays_core.deals",
      allowedDocumentGroups: ["candidate-profile", "kyc-aml", "bank-package", "support-attachments"],
      requiredGate: "Deal scope and candidate ownership are required before candidate documents are visible.",
    },
    {
      entityType: "property-case",
      tableName: "crays_core.property_cases",
      allowedDocumentGroups: ["property-lease", "construction"],
      requiredGate: "Expansion review and explicit handoff decide Deal Manager and Candidate visibility.",
    },
    {
      entityType: "bank-package",
      tableName: "crays_core.bank_packages",
      allowedDocumentGroups: ["bank-package", "property-lease", "studio-finance"],
      requiredGate: "KYC, equity check, CRAYS deal review and package release are required before bank visibility.",
    },
    {
      entityType: "loan-case",
      tableName: "crays_core.loan_cases",
      allowedDocumentGroups: ["bank-package", "studio-finance"],
      requiredGate: "Bank partner role scope and released package state are required.",
    },
  ],
  requiredEvents: ["document.linked", "document.requested", "document.approved", "document.released", "document.revoked"],
  guardrails: [
    "Document package links store metadata and references only, not binary files.",
    "Every document access decision must evaluate role, organization, entity scope and release state.",
    "Communication attachments must reuse the same document access checks.",
    "Bank-visible documents require KYC, equity check, CRAYS review and package release.",
    "No live document records or files are returned by this contract.",
  ],
};

export const workflowEventPersistenceContract: WorkflowPersistenceContract = {
  key: "workflow-events",
  label: "Workflow Event Persistence",
  status: "contract_ready",
  tables: [
    {
      tableName: "crays_core.workflow_events",
      status: "implemented",
      purpose: "Stores business workflow events that feed dashboards, audit context, notifications and read models.",
      storesSecrets: false,
      storesPrivateKeys: false,
      liveRecordsReturned: false,
    },
  ],
  entityLinks: [
    { entityType: "prepared-offer", tableName: "crays_core.prepared_offers", requiredGate: "Event visibility follows candidate release state." },
    { entityType: "deal", tableName: "crays_core.deals", requiredGate: "Event visibility follows deal role scope." },
    { entityType: "property-case", tableName: "crays_core.property_cases", requiredGate: "Event visibility follows Expansion-to-Deal handoff." },
    { entityType: "bank-package", tableName: "crays_core.bank_packages", requiredGate: "Event visibility follows bank package release state." },
    { entityType: "document", tableName: "crays_core.document_package_links", requiredGate: "Event visibility follows document access." },
    { entityType: "sync-job", tableName: "crays_core.sync_jobs", requiredGate: "Event visibility is internal unless explicitly surfaced as adapter health." },
  ],
  requiredEvents: getEventKpiContract().workflowEvents.map((event) => event.type),
  guardrails: [
    "Workflow events are business signals, not a replacement for audit events.",
    "Every dashboard signal must be traceable to source event IDs before production.",
    "External adapter errors become workflow events only after webhook/source verification.",
    "No live workflow events or KPI values are returned by this contract.",
  ],
};

export const communicationPersistenceContract: WorkflowPersistenceContract = {
  key: "communication",
  label: "Communication Persistence",
  status: "contract_ready",
  tables: [
    {
      tableName: "crays_core.conversations",
      status: "implemented",
      purpose: "Stores scoped thread headers linked to deal, bank package, property, lease, project, studio, member, document or support objects.",
      storesSecrets: false,
      storesPrivateKeys: false,
      liveRecordsReturned: false,
    },
    {
      tableName: "crays_core.conversation_participants",
      status: "implemented",
      purpose: "Stores role, account, organization and visibility scope for every thread participant.",
      storesSecrets: false,
      storesPrivateKeys: false,
      liveRecordsReturned: false,
    },
    {
      tableName: "crays_core.messages",
      status: "implemented",
      purpose: "Stores message metadata, body classification, visibility and document references. External provider payloads stay behind adapters.",
      storesSecrets: false,
      storesPrivateKeys: false,
      liveRecordsReturned: false,
    },
    {
      tableName: "crays_core.communication_consents",
      status: "implemented",
      purpose: "Stores consent and revocation state for external channels.",
      storesSecrets: false,
      storesPrivateKeys: false,
      liveRecordsReturned: false,
    },
    {
      tableName: "crays_core.communication_events",
      status: "implemented",
      purpose: "Stores delivery, failure, consent and participant events normalized from communication adapters.",
      storesSecrets: false,
      storesPrivateKeys: false,
      liveRecordsReturned: false,
    },
  ],
  entityLinks: [
    { entityType: "deal", tableName: "crays_core.deals", requiredGate: "Candidate and Deal Manager threads require active deal scope." },
    { entityType: "bank-package", tableName: "crays_core.bank_packages", requiredGate: "Bank questions require released bank package scope." },
    { entityType: "property-case", tableName: "crays_core.property_cases", requiredGate: "Property and lease threads follow Expansion-to-Deal handoff." },
    { entityType: "loan-case", tableName: "crays_core.loan_cases", requiredGate: "Loan-case threads require bank partner role scope." },
    { entityType: "document", tableName: "crays_core.document_package_links", requiredGate: "Attachments require document package access." },
  ],
  requiredEvents: [
    "conversation.opened",
    "message.created",
    "message.shared",
    "message.delivery_failed",
    "bank_question.opened",
    "bank_question.answered",
    "participant.added",
    "consent.revoked",
  ],
  guardrails: [
    "Internal notes, shared comments and external messages must remain separate records or explicit visibility states.",
    "No external message sending is enabled by this contract.",
    "Attachments use document package access checks.",
    "External channels require consent and opt-out handling where required.",
    "No live conversations, messages or provider connections are returned by this contract.",
  ],
};

export const workflowPersistenceContracts: Record<WorkflowPersistenceContractKey, WorkflowPersistenceContract> = {
  "document-evidence": documentEvidencePersistenceContract,
  "workflow-events": workflowEventPersistenceContract,
  communication: communicationPersistenceContract,
};

export function getWorkflowPersistenceContract(key: WorkflowPersistenceContractKey) {
  return workflowPersistenceContracts[key];
}

export function getDocumentPersistenceRolePreview(role: RoleKey) {
  return documentEvidencePersistenceContract.entityLinks.map((link) => ({
    entityType: link.entityType,
    tableName: link.tableName,
    access:
      link.allowedDocumentGroups?.map((group) => ({
        group,
        accessLevel: getDocumentAccessForRole(group, role),
      })) ?? [],
    requiredGate: link.requiredGate,
  }));
}

export function getCommunicationPersistenceRolePreview(role: RoleKey) {
  return communicationRoutesForRole(role).map((route) => ({
    id: route.id,
    title: route.title,
    type: route.type,
    relatedEntityTypes: route.relatedEntityTypes,
    documentPolicy: route.documentPolicy,
    status: route.status,
  }));
}
