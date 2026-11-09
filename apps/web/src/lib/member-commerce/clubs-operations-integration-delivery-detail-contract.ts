import "server-only";

import type {
  ClubsOperationsIntegrationDeliveryStatusActor,
  ClubsOperationsIntegrationLaneId,
} from "./clubs-operations-integration-delivery-status-contract";

export const CLUBS_OPERATIONS_INTEGRATION_DELIVERY_DETAIL_CONTRACT = Object.freeze({
  schema: "crays.clubs.operations-integration-delivery-detail.v1",
  version: "1.0.0",
  endpointTemplate:
    "/api/crays/clubs/team/integration-delivery-status/{lane}/detail",
  method: "GET",
  cache: "no-store",
  lanes: Object.freeze([
    "vendure",
    "erp",
    "twenty_crm",
    "nextcloud",
    "plane",
  ]),
  states: Object.freeze([
    "empty",
    "queued",
    "leased",
    "retry",
    "manual_action_required",
    "reconcile_required",
    "acknowledged_pending_readback",
    "reconciled",
    "failed",
  ]),
  acknowledgementStates: Object.freeze([
    "none",
    "confirmed_not_applied",
    "unknown_outcome",
    "ack_present",
    "ack_readback_verified",
  ]),
  nextActions: Object.freeze([
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
  exposesHashes: false,
  exposesCounts: false,
  exposesProviderObjects: false,
  writesDatabase: false,
  callsProvider: false,
} as const);

export type ClubsOperationsIntegrationDeliveryDetailActor =
  ClubsOperationsIntegrationDeliveryStatusActor;

export type ClubsOperationsIntegrationDeliveryDetailLane =
  ClubsOperationsIntegrationLaneId;

export type ClubsOperationsIntegrationDeliveryDetailState =
  (typeof CLUBS_OPERATIONS_INTEGRATION_DELIVERY_DETAIL_CONTRACT.states)[number];

export type ClubsOperationsIntegrationDeliveryDetailAcknowledgementState =
  (typeof CLUBS_OPERATIONS_INTEGRATION_DELIVERY_DETAIL_CONTRACT.acknowledgementStates)[number];

export type ClubsOperationsIntegrationDeliveryDetailNextAction =
  (typeof CLUBS_OPERATIONS_INTEGRATION_DELIVERY_DETAIL_CONTRACT.nextActions)[number];

export type ClubsOperationsIntegrationDeliveryDetailGuidance =
  (typeof CLUBS_OPERATIONS_INTEGRATION_DELIVERY_DETAIL_CONTRACT.guidance)[number];

export type ClubsOperationsIntegrationDeliveryDetailProjection = Readonly<{
  schema: typeof CLUBS_OPERATIONS_INTEGRATION_DELIVERY_DETAIL_CONTRACT.schema;
  version: typeof CLUBS_OPERATIONS_INTEGRATION_DELIVERY_DETAIL_CONTRACT.version;
  lane: ClubsOperationsIntegrationDeliveryDetailLane;
  configurationState: "configured" | "provider_not_bound";
  currentState: ClubsOperationsIntegrationDeliveryDetailState;
  acknowledgementState: ClubsOperationsIntegrationDeliveryDetailAcknowledgementState;
  transitions: Readonly<{
    queuedAt: string | null;
    leaseExpiresAt: string | null;
    retryEligibleAt: string | null;
    acknowledgedAt: string | null;
    reconciledAt: string | null;
    lastSafeTransitionAt: string | null;
  }>;
  retryAllowed: boolean;
  reconciliationRequired: boolean;
  deliveryClaimed: boolean;
  automaticDispatchAllowed: false;
  dispatchMode: "human_nextcloud_mail" | null;
  nextAction: ClubsOperationsIntegrationDeliveryDetailNextAction;
  guidance: ClubsOperationsIntegrationDeliveryDetailGuidance;
  containsPersonalData: false;
  exposesIdentifiers: false;
  exposesHashes: false;
  exposesCounts: false;
  exposesProviderObjects: false;
}>;
