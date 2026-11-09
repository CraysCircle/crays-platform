import "server-only";

import { getCorePgPool } from "@/db/client";
import {
  CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT,
  type ClubsOperationsIntegrationDeliveryStatusActor,
  type ClubsOperationsIntegrationDeliveryStatusProjection,
  type ClubsOperationsIntegrationGuidance,
  type ClubsOperationsIntegrationLaneId,
  type ClubsOperationsIntegrationLaneProjection,
  type ClubsOperationsIntegrationOperatorAction,
  type ClubsOperationsIntegrationProviderState,
} from "./clubs-operations-integration-delivery-status-contract";

type Row = Record<string, unknown>;

export interface ClubsOperationsIntegrationDeliveryStatusSqlClient {
  query<ResultRow extends Row = Row>(
    statement: string,
    values?: readonly unknown[],
  ): Promise<{ rows: ResultRow[]; rowCount?: number | null }>;
  release?(): void;
}

export interface ClubsOperationsIntegrationDeliveryStatusSqlPool {
  connect(): Promise<ClubsOperationsIntegrationDeliveryStatusSqlClient>;
}

type DeliveryStatusRow = Readonly<{
  has_queued: unknown;
  has_retry: unknown;
  has_reconcile_required: unknown;
  has_reconciled: unknown;
  has_failed: unknown;
  provider_delivery_state: unknown;
  provider_delivery_claimed: unknown;
  [key: string]: unknown;
}>;

export class ClubsOperationsIntegrationDeliveryStatusAuthorityError extends Error {
  constructor() {
    super("CCLUB_OPERATIONS_INTEGRATION_DELIVERY_STATUS_AUTHORITY_REQUIRED");
    this.name = "ClubsOperationsIntegrationDeliveryStatusAuthorityError";
  }
}

export class ClubsOperationsIntegrationDeliveryStatusUnavailableError extends Error {
  constructor() {
    super("CCLUB_OPERATIONS_INTEGRATION_DELIVERY_STATUS_UNAVAILABLE");
    this.name = "ClubsOperationsIntegrationDeliveryStatusUnavailableError";
  }
}

function assertActor(actor: ClubsOperationsIntegrationDeliveryStatusActor): void {
  if (
    !actor.accountId ||
    !actor.tenantSessionId ||
    !actor.organizationId ||
    !CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.allowedRoles.includes(
      actor.role,
    ) ||
    !CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.assurance.allowed.includes(
      actor.assuranceLevel,
    )
  ) {
    throw new ClubsOperationsIntegrationDeliveryStatusAuthorityError();
  }
}

function requiredBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new ClubsOperationsIntegrationDeliveryStatusUnavailableError();
  }
  return value;
}

function providerState(value: unknown): ClubsOperationsIntegrationProviderState {
  if (
    typeof value !== "string" ||
    !CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.providerStates.includes(
      value as ClubsOperationsIntegrationProviderState,
    )
  ) {
    throw new ClubsOperationsIntegrationDeliveryStatusUnavailableError();
  }
  return value as ClubsOperationsIntegrationProviderState;
}

function optionalBoolean(row: DeliveryStatusRow, key: string): boolean {
  const value = row[key];
  if (value === undefined) return false;
  return requiredBoolean(value);
}

function laneProjection(
  row: DeliveryStatusRow,
  lane: ClubsOperationsIntegrationLaneId,
): ClubsOperationsIntegrationLaneProjection {
  const configured = optionalBoolean(row, `${lane}_configured`);
  const queued = optionalBoolean(row, `${lane}_queued`);
  const leased = optionalBoolean(row, `${lane}_leased`);
  const retry = optionalBoolean(row, `${lane}_retry`);
  const confirmedNotApplied = optionalBoolean(
    row,
    `${lane}_confirmed_not_applied`,
  );
  const acknowledged = optionalBoolean(row, `${lane}_acknowledged`);
  const readbackVerified = optionalBoolean(row, `${lane}_readback_verified`);
  const reconciled = optionalBoolean(row, `${lane}_reconciled`);
  const failed = optionalBoolean(row, `${lane}_failed`);
  const explicitReconciliation = optionalBoolean(
    row,
    `${lane}_reconcile_required`,
  );
  const retryWithoutEvidence = retry && !confirmedNotApplied;
  const acknowledgementWithoutReadback = acknowledged && !readbackVerified;
  const reconciliationRequired =
    explicitReconciliation ||
    retryWithoutEvidence ||
    acknowledgementWithoutReadback;

  const queueState = reconciliationRequired
    ? "reconcile_required"
    : failed
      ? "failed"
      : leased
        ? "leased"
        : retry
          ? "retry"
          : reconciled && readbackVerified
            ? "reconciled"
            : queued && lane === "nextcloud"
              ? "manual_action_required"
              : queued
                ? "queued"
                : "empty";
  const lastSafeAcknowledgementState = readbackVerified
    ? "ack_readback_verified"
    : acknowledged
      ? "ack_pending_readback"
      : explicitReconciliation
        ? "unknown_outcome"
        : confirmedNotApplied
          ? "confirmed_not_applied"
          : "none";

  let allowedOperatorAction: ClubsOperationsIntegrationOperatorAction;
  let guidance: ClubsOperationsIntegrationGuidance;
  if (reconciliationRequired) {
    allowedOperatorAction = "reconcile_provider_state";
    guidance = acknowledgementWithoutReadback
      ? "ack_requires_provider_readback"
      : "unknown_outcome_reconcile_before_retry";
  } else if (failed) {
    allowedOperatorAction = "review_failure";
    guidance = "terminal_manual_review_required";
  } else if (leased) {
    allowedOperatorAction = "wait_for_active_lease";
    guidance = "active_lease_must_complete";
  } else if (retry) {
    allowedOperatorAction = "retry_with_confirmed_not_applied_evidence";
    guidance = "retry_requires_exact_fenced_receipt";
  } else if (reconciled && readbackVerified) {
    allowedOperatorAction = "none";
    guidance = "durable_ack_readback_reconciled";
  } else if (!configured) {
    allowedOperatorAction = "bind_provider";
    guidance = "provider_binding_required";
  } else if (queued && lane === "nextcloud") {
    allowedOperatorAction = "open_nextcloud_mail";
    guidance = "manual_nextcloud_confirmation_required";
  } else if (queued) {
    allowedOperatorAction = "dispatch_when_authorized";
    guidance = "initial_dispatch_safe_when_authorized";
  } else {
    allowedOperatorAction = "none";
    guidance = "no_work_queued";
  }

  return Object.freeze({
    lane,
    configurationState: configured ? "configured" : "provider_not_bound",
    queueState,
    lastSafeAcknowledgementState,
    allowedOperatorAction,
    guidance,
    retryAllowed: retry && confirmedNotApplied && !reconciliationRequired,
    reconciliationRequired,
    deliveryClaimed: readbackVerified,
    automaticDispatchAllowed: false,
  });
}

function projectRow(
  row: DeliveryStatusRow | undefined,
): ClubsOperationsIntegrationDeliveryStatusProjection {
  if (!row) throw new ClubsOperationsIntegrationDeliveryStatusUnavailableError();
  const states = Object.freeze({
    queued: requiredBoolean(row.has_queued),
    retry: requiredBoolean(row.has_retry),
    reconcileRequired: requiredBoolean(row.has_reconcile_required),
    reconciled: requiredBoolean(row.has_reconciled),
    failed: requiredBoolean(row.has_failed),
  });
  const providerDeliveryState = providerState(row.provider_delivery_state);
  const providerDeliveryClaimed = requiredBoolean(row.provider_delivery_claimed);

  if (
    (providerDeliveryState === "provider_not_bound" ||
      providerDeliveryState === "queued") &&
    providerDeliveryClaimed
  ) {
    throw new ClubsOperationsIntegrationDeliveryStatusUnavailableError();
  }
  if (
    (providerDeliveryState === "delivered" ||
      providerDeliveryState === "reconciled") &&
    !providerDeliveryClaimed
  ) {
    throw new ClubsOperationsIntegrationDeliveryStatusUnavailableError();
  }
  if (states.reconciled && !states.queued) {
    throw new ClubsOperationsIntegrationDeliveryStatusUnavailableError();
  }

  const lastSafeStatus = states.reconcileRequired
    ? "reconcile_required"
    : states.failed
      ? "failed"
      : states.retry
        ? "retry"
        : states.reconciled
          ? "reconciled"
          : states.queued
            ? "queued"
            : "empty";
  const status = states.reconcileRequired
    ? "reconcile_required"
    : states.queued
      ? "ready"
      : "empty";
  const lanes = Object.freeze({
    vendure: laneProjection(row, "vendure"),
    erp: laneProjection(row, "erp"),
    twenty_crm: laneProjection(row, "twenty_crm"),
    nextcloud: laneProjection(row, "nextcloud"),
    plane: laneProjection(row, "plane"),
  });

  return Object.freeze({
    schema: CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.schema,
    version: CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT.version,
    status,
    destination: "CRAYS_TEAM" as const,
    states,
    providerDeliveryState,
    providerDeliveryClaimed,
    lanes,
    lastSafeStatus,
    containsPersonalData: false as const,
    exposesIdentifiers: false as const,
    exposesCounts: false as const,
  });
}

export async function readClubsOperationsIntegrationDeliveryStatusWithClient(
  client: ClubsOperationsIntegrationDeliveryStatusSqlClient,
  actor: ClubsOperationsIntegrationDeliveryStatusActor,
): Promise<ClubsOperationsIntegrationDeliveryStatusProjection> {
  assertActor(actor);
  const result = await client.query<DeliveryStatusRow>(
    `with complete_chain as (
       select i.inquiry_id,o.outbox_id
         from crays_core.clubs_public_inquiries i
         join crays_core.clubs_public_inquiry_crm_outbox o
           on o.inquiry_id=i.inquiry_id
          and o.payload_sha256=i.payload_sha256
          and o.destination='CRAYS_TEAM'
         join crays_core.clubs_public_inquiry_command_receipts r
           on r.inquiry_id=i.inquiry_id
          and r.outbox_id=o.outbox_id
          and r.public_reference=i.public_reference
          and r.payload_sha256=i.payload_sha256
          and r.outcome='persisted'
      ), latest_delivery_event as (
       select distinct on (e.outbox_id) e.outbox_id,e.delivery_state
         from crays_core.clubs_public_inquiry_crm_delivery_events e
        order by e.outbox_id,e.sequence desc
      ), structural_anomaly as (
       select 1
         from crays_core.clubs_public_inquiries i
         left join complete_chain c on c.inquiry_id=i.inquiry_id
        where c.inquiry_id is null
       union all
       select 1
         from crays_core.clubs_public_inquiry_crm_outbox o
         left join complete_chain c on c.outbox_id=o.outbox_id
        where c.outbox_id is null
       union all
       select 1
         from crays_core.clubs_public_inquiry_command_receipts r
         left join complete_chain c
           on c.inquiry_id=r.inquiry_id and c.outbox_id=r.outbox_id
        where c.inquiry_id is null
      ), vendure_lane as (
       select
         exists(
           select 1 from crays_core.checkout_vendure_order_dispatch_receipts r
            where r.tenant_id=$1 and r.outcome='DELIVERED'
         ) configured,
         exists(
           select 1 from crays_core.checkout_order_transition_outbox o
            where o.tenant_id=$1 and o.delivery_state='PENDING'
         ) queued,
         exists(
           select 1 from crays_core.checkout_order_transition_outbox o
            where o.tenant_id=$1 and o.delivery_state='CLAIMED'
         ) leased,
         exists(
           select 1 from crays_core.checkout_order_transition_outbox o
            where o.tenant_id=$1 and o.delivery_state='FAILED_RETRYABLE'
         ) retry,
         exists(
           select 1 from crays_core.vendure_order_reconciliation_resolution_receipts r
            where r.tenant_id=$1
              and r.observation_outcome='PROVEN_NOT_DELIVERED'
              and r.target_delivery_state='FAILED_RETRYABLE'
         ) confirmed_not_applied,
         exists(
           select 1 from crays_core.checkout_order_transition_outbox o
            where o.tenant_id=$1
              and o.delivery_state='UNKNOWN_RECONCILIATION_REQUIRED'
         ) reconcile_required,
         exists(
           select 1 from crays_core.checkout_vendure_order_dispatch_receipts r
            where r.tenant_id=$1 and r.outcome='DELIVERED'
         ) acknowledged,
         exists(
           select 1
             from crays_core.vendure_order_reconciliation_resolution_receipts r
            where r.tenant_id=$1
              and r.observation_outcome='PROVEN_DELIVERED'
              and r.target_delivery_state='DELIVERED'
         ) readback_verified,
         exists(
           select 1
             from crays_core.vendure_order_reconciliation_resolution_receipts r
            where r.tenant_id=$1
              and r.observation_outcome='PROVEN_DELIVERED'
              and r.target_delivery_state='DELIVERED'
         ) reconciled,
         false failed
      ), erp_lane as (
       select
         exists(
           select 1 from "CraysClubErpDispatchAuditReceipt" r
            where r."tenant_id"::text=$1
         ) configured,
         exists(
           select 1 from "CraysClubErpDispatchOutbox" o
            where o."tenant_id"::text=$1 and o."state"='PENDING'
         ) queued,
         exists(
           select 1 from "CraysClubErpDispatchOutbox" o
            where o."tenant_id"::text=$1 and o."state"='LEASED'
              and o."lease_until">now()
         ) leased,
         exists(
           select 1 from "CraysClubErpDispatchOutbox" o
            where o."tenant_id"::text=$1 and o."state"='RETRY'
         ) retry,
         exists(
           select 1
             from "CraysClubErpDispatchOutbox" o
             join "CraysClubErpDispatchAuditReceipt" r
               on r."tenant_id"=o."tenant_id" and r."outbox_id"=o."id"
              and r."attempt_number"=o."attempt_count"
              and r."lease_id"=o."lease_id"
              and r."lease_version"=o."lease_version"
            where o."tenant_id"::text=$1 and o."state"='RETRY'
              and r."normalized_kind"='RETRYABLE_ERROR'
              and r."provider_receipt_sha256"~'^[0-9a-f]{64}$'
         ) confirmed_not_applied,
         exists(
           select 1 from "CraysClubErpDispatchOutbox" o
            where o."tenant_id"::text=$1 and (
              (o."state"='LEASED' and o."lease_until"<=now())
              or (o."state"='RETRY' and not exists(
                select 1 from "CraysClubErpDispatchAuditReceipt" r
                 where r."tenant_id"=o."tenant_id" and r."outbox_id"=o."id"
                   and r."attempt_number"=o."attempt_count"
                   and r."lease_version"=o."lease_version"
                   and r."normalized_kind"='RETRYABLE_ERROR'
              ))
              or (o."state"='ACKNOWLEDGED' and not exists(
                select 1 from "CraysClubErpDispatchAuditReceipt" r
                 where r."tenant_id"=o."tenant_id" and r."outbox_id"=o."id"
                   and r."attempt_number"=o."attempt_count"
                   and r."lease_version"=o."lease_version"
                   and r."normalized_kind"='ACCEPTED'
                   and r."provider_receipt_sha256"~'^[0-9a-f]{64}$'
                   and r."response_sha256"~'^[0-9a-f]{64}$'
                   and r."external_document_reference_sha256"~'^[0-9a-f]{64}$'
              ))
            )
         ) reconcile_required,
         exists(
           select 1
             from "CraysClubErpDispatchOutbox" o
             join "CraysClubErpDispatchAuditReceipt" r
               on r."tenant_id"=o."tenant_id" and r."outbox_id"=o."id"
              and r."attempt_number"=o."attempt_count"
              and r."lease_version"=o."lease_version"
            where o."tenant_id"::text=$1 and o."state"='ACKNOWLEDGED'
              and r."normalized_kind"='ACCEPTED'
              and r."provider_receipt_sha256"~'^[0-9a-f]{64}$'
         ) acknowledged,
         exists(
           select 1
             from "CraysClubErpDispatchOutbox" o
             join "CraysClubErpDispatchAuditReceipt" r
               on r."tenant_id"=o."tenant_id" and r."outbox_id"=o."id"
              and r."attempt_number"=o."attempt_count"
              and r."lease_version"=o."lease_version"
            where o."tenant_id"::text=$1 and o."state"='ACKNOWLEDGED'
              and r."normalized_kind"='ACCEPTED'
              and r."provider_receipt_sha256"~'^[0-9a-f]{64}$'
              and r."request_sha256"~'^[0-9a-f]{64}$'
              and r."response_sha256"~'^[0-9a-f]{64}$'
              and r."external_document_reference_sha256"~'^[0-9a-f]{64}$'
         ) readback_verified,
         exists(
           select 1
             from "CraysClubErpDispatchOutbox" o
             join "CraysClubErpDispatchAuditReceipt" r
               on r."tenant_id"=o."tenant_id" and r."outbox_id"=o."id"
              and r."attempt_number"=o."attempt_count"
              and r."lease_version"=o."lease_version"
            where o."tenant_id"::text=$1 and o."state"='ACKNOWLEDGED'
              and r."normalized_kind"='ACCEPTED'
              and r."external_document_reference_sha256"~'^[0-9a-f]{64}$'
         ) reconciled,
         exists(
           select 1 from "CraysClubErpDispatchOutbox" o
            where o."tenant_id"::text=$1 and o."state" in ('REJECTED','DEAD_LETTER')
         ) failed
      ), twenty_crm_lane as (
       select
         exists(
           select 1
             from crays_core.cclub_hotel_twenty_summary_delivery_receipt r
             join crays_core.cclub_hotel_twenty_summary_outbox o on o.id=r.outbox_id
            where o.tenant_key=$1
         ) configured,
         exists(select 1 from crays_core.cclub_hotel_twenty_summary_outbox o where o.tenant_key=$1 and o.state='PENDING') queued,
         exists(select 1 from crays_core.cclub_hotel_twenty_summary_outbox o where o.tenant_key=$1 and o.state='LEASED' and o.lease_expires_at>now()) leased,
         exists(select 1 from crays_core.cclub_hotel_twenty_summary_outbox o where o.tenant_key=$1 and o.state='RETRY') retry,
         exists(
           select 1 from crays_core.cclub_hotel_twenty_summary_outbox o
            where o.tenant_key=$1 and o.state='RETRY'
              and o.last_failure_code~'^CONFIRMED_NOT_APPLIED:[0-9a-f]{64}$'
         ) confirmed_not_applied,
         exists(
           select 1 from crays_core.cclub_hotel_twenty_summary_outbox o
            where o.tenant_key=$1 and (
              (o.state='LEASED' and o.lease_expires_at<=now())
              or (o.state='RETRY' and coalesce(o.last_failure_code,'')!~'^CONFIRMED_NOT_APPLIED:[0-9a-f]{64}$')
            )
         ) reconcile_required,
         exists(
           select 1
             from crays_core.cclub_hotel_twenty_summary_outbox o
             join crays_core.cclub_hotel_twenty_summary_delivery_receipt r
               on r.outbox_id=o.id and r.summary_sha256=o.summary_sha256
            where o.tenant_key=$1 and o.state='ACKNOWLEDGED'
         ) acknowledged,
         false readback_verified,
         false reconciled,
         exists(select 1 from crays_core.cclub_hotel_twenty_summary_outbox o where o.tenant_key=$1 and o.state='DEAD') failed
      ), nextcloud_lane as (
       select
         exists(
           select 1 from crays_integration.mailbox_authority_bindings b
            where b.crays_tenant_id=$1 and b.lifecycle_state='active'
         ) configured,
         exists(
           select 1 from crays_integration.mail_compose_intents i
            where i.crays_tenant_id=$1
              and i.state in ('preflighted','launch_issued','launch_redeemed','opened')
              and not exists(
                select 1 from crays_integration.mail_compose_send_confirmations c
                 where c.mail_compose_intent_id=i.mail_compose_intent_id
              )
         ) queued,
         false leased,
         false retry,
         false confirmed_not_applied,
         exists(
           select 1
             from crays_integration.mail_compose_intents i
             left join crays_integration.mail_compose_send_confirmations c
               on c.mail_compose_intent_id=i.mail_compose_intent_id
            where i.crays_tenant_id=$1
              and (i.state='conflict' or c.correlation_state in ('conflict','unknown'))
         ) reconcile_required,
         exists(
           select 1
             from crays_integration.mail_compose_intents i
             join crays_integration.mail_compose_send_confirmations c
               on c.mail_compose_intent_id=i.mail_compose_intent_id
            where i.crays_tenant_id=$1
              and c.provider_message_ref_sha256~'^[0-9a-f]{64}$'
         ) acknowledged,
         exists(
           select 1
             from crays_integration.mail_compose_intents i
             join crays_integration.mail_compose_send_confirmations c
               on c.mail_compose_intent_id=i.mail_compose_intent_id
            where i.crays_tenant_id=$1 and c.correlation_state='matched'
              and c.provider_message_ref_sha256~'^[0-9a-f]{64}$'
              and c.action_receipt_id is not null
         ) readback_verified,
         exists(
           select 1
             from crays_integration.mail_compose_intents i
             join crays_integration.mail_compose_send_confirmations c
               on c.mail_compose_intent_id=i.mail_compose_intent_id
            where i.crays_tenant_id=$1 and c.correlation_state='matched'
              and c.action_receipt_id is not null
         ) reconciled,
         exists(
           select 1
             from crays_integration.mail_compose_intents i
             left join crays_integration.mail_compose_send_confirmations c
               on c.mail_compose_intent_id=i.mail_compose_intent_id
            where i.crays_tenant_id=$1
              and (i.state in ('expired','cancelled','failed') or c.correlation_state='failed')
         ) failed
      ), plane_lane as (
       select
         exists(
           select 1
             from crays_core.cclub_hotel_plane_exception_work_receipt r
             join crays_core.cclub_hotel_plane_exception_work_outbox o on o.id=r.outbox_id
            where o.tenant_key=$1
         ) configured,
         exists(select 1 from crays_core.cclub_hotel_plane_exception_work_outbox o where o.tenant_key=$1 and o.state='PENDING') queued,
         exists(select 1 from crays_core.cclub_hotel_plane_exception_work_outbox o where o.tenant_key=$1 and o.state='LEASED' and o.lease_expires_at>now()) leased,
         exists(select 1 from crays_core.cclub_hotel_plane_exception_work_outbox o where o.tenant_key=$1 and o.state='RETRY') retry,
         exists(
           select 1 from crays_core.cclub_hotel_plane_exception_work_outbox o
            where o.tenant_key=$1 and o.state='RETRY'
              and o.last_failure_code~'^CONFIRMED_NOT_APPLIED:[0-9a-f]{64}$'
         ) confirmed_not_applied,
         exists(
           select 1 from crays_core.cclub_hotel_plane_exception_work_outbox o
            where o.tenant_key=$1 and (
              (o.state='LEASED' and o.lease_expires_at<=now())
              or (o.state='RETRY' and coalesce(o.last_failure_code,'')!~'^CONFIRMED_NOT_APPLIED:[0-9a-f]{64}$')
            )
         ) reconcile_required,
         exists(
           select 1
             from crays_core.cclub_hotel_plane_exception_work_outbox o
             join crays_core.cclub_hotel_plane_exception_work_receipt r
               on r.outbox_id=o.id and r.payload_sha256=o.payload_sha256
            where o.tenant_key=$1 and o.state='ACKNOWLEDGED'
         ) acknowledged,
         exists(
           select 1
             from crays_core.cclub_hotel_plane_exception_work_outbox o
             join crays_core.cclub_hotel_plane_exception_work_receipt r
               on r.outbox_id=o.id and r.payload_sha256=o.payload_sha256
             join crays_core.cclub_hotel_plane_status_observation s on s.work_receipt_id=r.id
            where o.tenant_key=$1 and o.state='ACKNOWLEDGED'
              and s.verified_event_receipt_sha256~'^[0-9a-f]{64}$'
         ) readback_verified,
         exists(
           select 1
             from crays_core.cclub_hotel_plane_exception_work_outbox o
             join crays_core.cclub_hotel_plane_exception_work_receipt r
               on r.outbox_id=o.id and r.payload_sha256=o.payload_sha256
             join crays_core.cclub_hotel_plane_status_observation s on s.work_receipt_id=r.id
            where o.tenant_key=$1 and o.state='ACKNOWLEDGED'
         ) reconciled,
         exists(select 1 from crays_core.cclub_hotel_plane_exception_work_outbox o where o.tenant_key=$1 and o.state='DEAD') failed
      )
     select exists(select 1 from complete_chain) has_queued,
            false has_retry,
            exists(select 1 from structural_anomaly) has_reconcile_required,
            exists(select 1 from complete_chain) has_reconciled,
            false has_failed,
            case
              when exists(select 1 from latest_delivery_event where delivery_state='reconciled') then 'reconciled'
              when exists(select 1 from latest_delivery_event where delivery_state='delivered') then 'delivered'
              when exists(select 1 from latest_delivery_event where delivery_state='queued') then 'queued'
              else 'provider_not_bound'
            end provider_delivery_state,
            exists(
              select 1 from latest_delivery_event
               where delivery_state in ('delivered','reconciled')
            ) provider_delivery_claimed,
            v.configured vendure_configured,v.queued vendure_queued,
            v.leased vendure_leased,v.retry vendure_retry,
            v.confirmed_not_applied vendure_confirmed_not_applied,
            v.reconcile_required vendure_reconcile_required,
            v.acknowledged vendure_acknowledged,
            v.readback_verified vendure_readback_verified,
            v.reconciled vendure_reconciled,v.failed vendure_failed,
            e.configured erp_configured,e.queued erp_queued,
            e.leased erp_leased,e.retry erp_retry,
            e.confirmed_not_applied erp_confirmed_not_applied,
            e.reconcile_required erp_reconcile_required,
            e.acknowledged erp_acknowledged,
            e.readback_verified erp_readback_verified,
            e.reconciled erp_reconciled,e.failed erp_failed,
            t.configured twenty_crm_configured,t.queued twenty_crm_queued,
            t.leased twenty_crm_leased,t.retry twenty_crm_retry,
            t.confirmed_not_applied twenty_crm_confirmed_not_applied,
            t.reconcile_required twenty_crm_reconcile_required,
            t.acknowledged twenty_crm_acknowledged,
            t.readback_verified twenty_crm_readback_verified,
            t.reconciled twenty_crm_reconciled,t.failed twenty_crm_failed,
            n.configured nextcloud_configured,n.queued nextcloud_queued,
            n.leased nextcloud_leased,n.retry nextcloud_retry,
            n.confirmed_not_applied nextcloud_confirmed_not_applied,
            n.reconcile_required nextcloud_reconcile_required,
            n.acknowledged nextcloud_acknowledged,
            n.readback_verified nextcloud_readback_verified,
            n.reconciled nextcloud_reconciled,n.failed nextcloud_failed,
            p.configured plane_configured,p.queued plane_queued,
            p.leased plane_leased,p.retry plane_retry,
            p.confirmed_not_applied plane_confirmed_not_applied,
            p.reconcile_required plane_reconcile_required,
            p.acknowledged plane_acknowledged,
            p.readback_verified plane_readback_verified,
            p.reconciled plane_reconciled,p.failed plane_failed
       from vendure_lane v
       cross join erp_lane e
       cross join twenty_crm_lane t
       cross join nextcloud_lane n
       cross join plane_lane p
     /* cclub-operations-integration-delivery-status:read-only */`,
    [actor.organizationId],
  );
  return projectRow(result.rows[0]);
}

export async function readClubsOperationsIntegrationDeliveryStatusWithPool(
  pool: ClubsOperationsIntegrationDeliveryStatusSqlPool,
  actor: ClubsOperationsIntegrationDeliveryStatusActor,
): Promise<ClubsOperationsIntegrationDeliveryStatusProjection> {
  assertActor(actor);
  const client = await pool.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    await client.query(
      "select set_config('crays.app_role', 'core_service', true), set_config('crays.tenant_id', $1, true), set_config('app.tenant_id', $1, true) /* cclub-operations-integration-delivery-status:tenant-scoped-read-only */",
      [actor.organizationId],
    );
    const projection = await readClubsOperationsIntegrationDeliveryStatusWithClient(
      client,
      actor,
    );
    await client.query("rollback");
    return projection;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    if (error instanceof ClubsOperationsIntegrationDeliveryStatusAuthorityError) {
      throw error;
    }
    throw new ClubsOperationsIntegrationDeliveryStatusUnavailableError();
  } finally {
    client.release?.();
  }
}

export async function readClubsOperationsIntegrationDeliveryStatus(
  actor: ClubsOperationsIntegrationDeliveryStatusActor,
): Promise<ClubsOperationsIntegrationDeliveryStatusProjection> {
  return readClubsOperationsIntegrationDeliveryStatusWithPool(
    getCorePgPool(),
    actor,
  );
}
