import type { RoleKey } from "@/lib/roles";

export const CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT = Object.freeze({
  schema: "crays.clubs.operations-public-inquiry-queue.v1",
  version: "1.0.0",
  endpoint: "/api/crays/clubs/team/public-inquiries",
  method: "GET",
  cache: "no-store",
  destination: "CRAYS_TEAM",
  maximumItems: 25,
  allowedRoles: ["crays-management", "reviewer", "admin"],
  assurance: Object.freeze({ allowed: ["aal2", "aal3"] }),
  projectionFields: Object.freeze([
    "publicReference",
    "inquiryType",
    "receivedAt",
    "confirmationStatus",
    "teamQueueStatus",
    "reconciliationStatus",
    "providerDeliveryState",
    "providerDeliveryClaimed",
  ]),
  excludedPersonalFields: Object.freeze([
    "contactName",
    "contactEmail",
    "organizationName",
    "countryOrRegion",
    "preferredStartDate",
    "preferredEndDate",
    "participantCount",
    "message",
  ]),
  stateSemantics: Object.freeze({
    received: "durable inquiry and command receipt exist",
    queued: "durable CRAYS Team outbox row exists",
    reconciled: "inquiry, receipt, and outbox evidence agree",
    provider_not_bound: "no external CRM provider delivery is asserted",
  }),
  providerDeliveryClaimed: false,
  containsPersonalData: false,
  exposesInternalIdentifiers: false,
  exposesCounts: false,
} as const);

export type ClubsOperationsPublicInquiryQueueRole = Extract<
  RoleKey,
  "crays-management" | "reviewer" | "admin"
>;

export type ClubsOperationsPublicInquiryQueueActor = Readonly<{
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  role: ClubsOperationsPublicInquiryQueueRole;
  assuranceLevel: "aal2" | "aal3";
}>;

export type ClubsOperationsPublicInquiryQueueItem = Readonly<{
  publicReference: string;
  inquiryType: "golf_tourism" | "mice_event";
  receivedAt: string;
  confirmationStatus: "received";
  teamQueueStatus: "queued";
  reconciliationStatus: "reconciled";
  providerDeliveryState: "provider_not_bound";
  providerDeliveryClaimed: false;
}>;

export type ClubsOperationsPublicInquiryQueueProjection = Readonly<{
  schema: typeof CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.schema;
  version: typeof CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.version;
  status: "ready" | "empty";
  items: readonly ClubsOperationsPublicInquiryQueueItem[];
  truncated: boolean;
  destination: "CRAYS_TEAM";
  containsPersonalData: false;
  providerDeliveryClaimed: false;
}>;
