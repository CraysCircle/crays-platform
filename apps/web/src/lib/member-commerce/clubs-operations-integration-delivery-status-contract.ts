import type { RoleKey } from "@/lib/roles";

export const CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT = Object.freeze({
  schema: "crays.clubs.operations-integration-delivery-status.v1",
  version: "1.1.0",
  endpoint: "/api/crays/clubs/team/integration-delivery-status",
  method: "GET",
  cache: "no-store",
  destination: "CRAYS_TEAM",
  allowedRoles: ["crays-management", "reviewer", "admin"],
  assurance: Object.freeze({ allowed: ["aal2", "aal3"] }),
  states: Object.freeze([
    "queued",
    "retry",
    "reconcile_required",
    "reconciled",
    "failed",
  ]),
  providerStates: Object.freeze([
    "provider_not_bound",
    "queued",
    "delivered",
    "reconciled",
  ]),
  providerClaimEvidenceRequired: true,
  lanes: Object.freeze([
    "vendure",
    "erp",
    "twenty_crm",
    "nextcloud",
    "plane",
  ]),
  configurationStates: Object.freeze(["configured", "provider_not_bound"]),
  queueStates: Object.freeze([
    "empty",
    "queued",
    "leased",
    "retry",
    "manual_action_required",
    "reconcile_required",
    "reconciled",
    "failed",
  ]),
  acknowledgementStates: Object.freeze([
    "none",
    "confirmed_not_applied",
    "unknown_outcome",
    "ack_pending_readback",
    "ack_readback_verified",
  ]),
  operatorActions: Object.freeze([
    "bind_provider",
    "dispatch_when_authorized",
    "wait_for_active_lease",
    "retry_with_confirmed_not_applied_evidence",
    "reconcile_provider_state",
    "open_nextcloud_mail",
    "review_failure",
    "none",
  ]),
  guidance: Object.freeze([
    "provider_binding_required",
    "initial_dispatch_safe_when_authorized",
    "active_lease_must_complete",
    "retry_requires_exact_fenced_receipt",
    "unknown_outcome_reconcile_before_retry",
    "manual_nextcloud_confirmation_required",
    "ack_requires_provider_readback",
    "terminal_manual_review_required",
    "durable_ack_readback_reconciled",
    "no_work_queued",
  ]),
  containsPersonalData: false,
  exposesIdentifiers: false,
  exposesCounts: false,
  writesDatabase: false,
  callsProvider: false,
} as const);

export type ClubsOperationsIntegrationDeliveryStatusRole = Extract<
  RoleKey,
  "crays-management" | "reviewer" | "admin"
>;

export type ClubsOperationsIntegrationDeliveryStatusActor = Readonly<{
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  role: ClubsOperationsIntegrationDeliveryStatusRole;
  assuranceLevel: "aal2" | "aal3";
}>;

export type ClubsOperationsIntegrationProviderState =
  (typeof CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.providerStates)[number];

export type ClubsOperationsIntegrationLaneId =
  (typeof CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.lanes)[number];

export type ClubsOperationsIntegrationConfigurationState =
  (typeof CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.configurationStates)[number];

export type ClubsOperationsIntegrationQueueState =
  (typeof CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.queueStates)[number];

export type ClubsOperationsIntegrationAcknowledgementState =
  (typeof CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.acknowledgementStates)[number];

export type ClubsOperationsIntegrationOperatorAction =
  (typeof CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.operatorActions)[number];

export type ClubsOperationsIntegrationGuidance =
  (typeof CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.guidance)[number];

export type ClubsOperationsIntegrationLaneProjection = Readonly<{
  lane: ClubsOperationsIntegrationLaneId;
  configurationState: ClubsOperationsIntegrationConfigurationState;
  queueState: ClubsOperationsIntegrationQueueState;
  lastSafeAcknowledgementState: ClubsOperationsIntegrationAcknowledgementState;
  allowedOperatorAction: ClubsOperationsIntegrationOperatorAction;
  guidance: ClubsOperationsIntegrationGuidance;
  retryAllowed: boolean;
  reconciliationRequired: boolean;
  deliveryClaimed: boolean;
  automaticDispatchAllowed: boolean;
}>;

export type ClubsOperationsIntegrationDeliveryStateProjection = Readonly<{
  queued: boolean;
  retry: boolean;
  reconcileRequired: boolean;
  reconciled: boolean;
  failed: boolean;
}>;

export type ClubsOperationsIntegrationDeliveryStatusProjection = Readonly<{
  schema: typeof CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.schema;
  version: typeof CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.version;
  status: "ready" | "empty" | "reconcile_required";
  destination: "CRAYS_TEAM";
  states: ClubsOperationsIntegrationDeliveryStateProjection;
  providerDeliveryState: ClubsOperationsIntegrationProviderState;
  providerDeliveryClaimed: boolean;
  lanes: Readonly<
    Record<
      ClubsOperationsIntegrationLaneId,
      ClubsOperationsIntegrationLaneProjection
    >
  >;
  lastSafeStatus:
    | "empty"
    | "queued"
    | "retry"
    | "reconcile_required"
    | "reconciled"
    | "failed";
  containsPersonalData: false;
  exposesIdentifiers: false;
  exposesCounts: false;
}>;
