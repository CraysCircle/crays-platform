export const gymEventCatalog = {
  "Membership.Activated.v1": { owner: "Member", aggregate: "membership", retentionDays: 365 },
  "Membership.Changed.v1": { owner: "Member", aggregate: "membership", retentionDays: 365 },
  "Opportunity.Changed.v1": { owner: "Franchise", aggregate: "opportunity", retentionDays: 365 },
  "WorkItem.Changed.v1": { owner: "Project", aggregate: "work-item", retentionDays: 180 },
  "Invoice.Changed.v1": { owner: "ERP/Finance", aggregate: "invoice", retentionDays: 3650 },
  "Document.Changed.v1": { owner: "Documents", aggregate: "document", retentionDays: 3650 },
  "Approval.Changed.v1": { owner: "Documents", aggregate: "approval", retentionDays: 3650 },
  "Signature.Changed.v1": { owner: "Documents", aggregate: "signature", retentionDays: 3650 },
  "Communication.Changed.v1": { owner: "Communication", aggregate: "communication", retentionDays: 180 },
  "StudioOperation.Changed.v1": { owner: "Studio Operations", aggregate: "studio-operation", retentionDays: 365 },
  "Relationship.Changed.v1": { owner: "CRM", aggregate: "relationship", retentionDays: 365 },
  "MetricObservation.Changed.v1": { owner: "Analytics", aggregate: "metric-observation", retentionDays: 365 },
} as const;

export type GymEventType = keyof typeof gymEventCatalog;

const resourceEventType: Record<string, GymEventType> = {
  "crm-companies": "Relationship.Changed.v1",
  "crm-opportunities": "Opportunity.Changed.v1",
  "project-work-items": "WorkItem.Changed.v1",
  "erp-documents": "Invoice.Changed.v1",
  "files-documents": "Document.Changed.v1",
  "analytics-reports": "MetricObservation.Changed.v1",
  "operations-records": "StudioOperation.Changed.v1",
  "chat-threads": "Communication.Changed.v1",
};

export function gymEventContractForResource(resource: string) {
  const eventType = resourceEventType[resource];
  if (!eventType) throw new Error(`UNSUPPORTED_GYM_EVENT_RESOURCE:${resource}`);
  return { eventType, ...gymEventCatalog[eventType] };
}

export function assertDataMinimizedEventPayload(payload: Record<string, unknown>) {
  const forbidden = new Set(["email", "phone", "body", "name", "title", "address", "token", "secret", "password"]);
  for (const key of Object.keys(payload)) {
    if (forbidden.has(key.toLocaleLowerCase())) throw new Error(`Personal or secret field is prohibited in an outbox payload: ${key}`);
  }
}
