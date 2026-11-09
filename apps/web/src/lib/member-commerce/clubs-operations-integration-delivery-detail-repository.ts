import "server-only";

import { getCorePgPool } from "@/db/client";
import { CLUBS_OPERATIONS_INTEGRATION_DELIVERY_STATUS_CONTRACT } from "./clubs-operations-integration-delivery-status-contract";
import {
  CLUBS_OPERATIONS_INTEGRATION_DELIVERY_DETAIL_CONTRACT,
  type ClubsOperationsIntegrationDeliveryDetailActor,
  type ClubsOperationsIntegrationDeliveryDetailAcknowledgementState,
  type ClubsOperationsIntegrationDeliveryDetailGuidance,
  type ClubsOperationsIntegrationDeliveryDetailLane,
  type ClubsOperationsIntegrationDeliveryDetailNextAction,
  type ClubsOperationsIntegrationDeliveryDetailProjection,
  type ClubsOperationsIntegrationDeliveryDetailState,
} from "./clubs-operations-integration-delivery-detail-contract";

type Row = Record<string, unknown>;

export interface ClubsOperationsIntegrationDeliveryDetailSqlClient {
  query<ResultRow extends Row = Row>(
    statement: string,
    values?: readonly unknown[],
  ): Promise<{ rows: ResultRow[]; rowCount?: number | null }>;
  release?(): void;
}

export interface ClubsOperationsIntegrationDeliveryDetailSqlPool {
  connect(): Promise<ClubsOperationsIntegrationDeliveryDetailSqlClient>;
}

type DetailRow = Readonly<{
  configured: unknown;
  source_state: unknown;
  queued_at: unknown;
  lease_expires_at: unknown;
  retry_eligible_at: unknown;
  acknowledged_at: unknown;
  reconciled_at: unknown;
  trusted_retry_present: unknown;
  acknowledge_present: unknown;
  readback_present: unknown;
  reconcile_required: unknown;
  failed: unknown;
  manual_action_required: unknown;
}>;

export class ClubsOperationsIntegrationDeliveryDetailAuthorityError extends Error {
  constructor() {
    super("CCLUB_OPERATIONS_INTEGRATION_DELIVERY_DETAIL_AUTHORITY_REQUIRED");
    this.name = "ClubsOperationsIntegrationDeliveryDetailAuthorityError";
  }
}

export class ClubsOperationsIntegrationDeliveryDetailUnavailableError extends Error {
  constructor() {
    super("CCLUB_OPERATIONS_INTEGRATION_DELIVERY_DETAIL_UNAVAILABLE");
    this.name = "ClubsOperationsIntegrationDeliveryDetailUnavailableError";
  }
}

function assertActor(actor: ClubsOperationsIntegrationDeliveryDetailActor): void {
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
    throw new ClubsOperationsIntegrationDeliveryDetailAuthorityError();
  }
}

export function parseClubsOperationsIntegrationDeliveryDetailLane(
  value: string,
): ClubsOperationsIntegrationDeliveryDetailLane | null {
  return CLUBS_OPERATIONS_INTEGRATION_DELIVERY_DETAIL_CONTRACT.lanes.includes(
    value as ClubsOperationsIntegrationDeliveryDetailLane,
  )
    ? (value as ClubsOperationsIntegrationDeliveryDetailLane)
    : null;
}

function requiredBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new ClubsOperationsIntegrationDeliveryDetailUnavailableError();
  }
  return value;
}

function optionalState(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length < 1 || value.length > 80) {
    throw new ClubsOperationsIntegrationDeliveryDetailUnavailableError();
  }
  return value;
}

function optionalInstant(value: unknown): string | null {
  if (value === null) return null;
  const instant = value instanceof Date ? value : new Date(String(value));
  if (!Number.isFinite(instant.getTime())) {
    throw new ClubsOperationsIntegrationDeliveryDetailUnavailableError();
  }
  return instant.toISOString();
}

function latestInstant(values: readonly (string | null)[]): string | null {
  return values.reduce<string | null>((latest, value) => {
    if (!value) return latest;
    if (!latest || Date.parse(value) > Date.parse(latest)) return value;
    return latest;
  }, null);
}

function queuedState(lane: ClubsOperationsIntegrationDeliveryDetailLane, state: string | null) {
  if (!state) return false;
  if (lane === "vendure") return state === "PENDING";
  if (lane === "nextcloud") {
    return ["preflighted", "launch_issued", "launch_redeemed", "opened"].includes(
      state,
    );
  }
  return state === "PENDING";
}

function leasedState(state: string | null): boolean {
  return state === "CLAIMED" || state === "LEASED";
}

function retryState(state: string | null): boolean {
  return state === "FAILED_RETRYABLE" || state === "RETRY";
}

function projectDetail(
  lane: ClubsOperationsIntegrationDeliveryDetailLane,
  row: DetailRow | undefined,
): ClubsOperationsIntegrationDeliveryDetailProjection {
  if (!row) throw new ClubsOperationsIntegrationDeliveryDetailUnavailableError();
  const configured = requiredBoolean(row.configured);
  const sourceState = optionalState(row.source_state);
  const trustedRetryPresent = requiredBoolean(row.trusted_retry_present);
  const acknowledgePresent = requiredBoolean(row.acknowledge_present);
  const readbackPresent = requiredBoolean(row.readback_present);
  const explicitReconciliation = requiredBoolean(row.reconcile_required);
  const failed = requiredBoolean(row.failed);
  const manualActionRequired = requiredBoolean(row.manual_action_required);
  const queued = queuedState(lane, sourceState);
  const leased = leasedState(sourceState);
  const retry = retryState(sourceState);
  const retryWithoutEvidence = retry && !trustedRetryPresent;
  const acknowledgementWithoutReadback = acknowledgePresent && !readbackPresent;
  const reconciliationRequired =
    explicitReconciliation || retryWithoutEvidence || acknowledgementWithoutReadback;

  let currentState: ClubsOperationsIntegrationDeliveryDetailState;
  if (reconciliationRequired) currentState = "reconcile_required";
  else if (failed) currentState = "failed";
  else if (manualActionRequired) currentState = "manual_action_required";
  else if (leased) currentState = "leased";
  else if (retry) currentState = "retry";
  else if (readbackPresent) currentState = "reconciled";
  else if (acknowledgePresent) currentState = "acknowledged_pending_readback";
  else if (queued) currentState = "queued";
  else currentState = "empty";

  let acknowledgementState: ClubsOperationsIntegrationDeliveryDetailAcknowledgementState;
  if (readbackPresent) acknowledgementState = "ack_readback_verified";
  else if (acknowledgePresent) acknowledgementState = "ack_present";
  else if (explicitReconciliation) acknowledgementState = "unknown_outcome";
  else if (trustedRetryPresent) acknowledgementState = "confirmed_not_applied";
  else acknowledgementState = "none";

  let nextAction: ClubsOperationsIntegrationDeliveryDetailNextAction;
  let guidance: ClubsOperationsIntegrationDeliveryDetailGuidance;
  if (reconciliationRequired) {
    nextAction = "reconcile_provider_state";
    guidance = acknowledgementWithoutReadback
      ? "ack_requires_provider_readback"
      : "unknown_outcome_reconcile_before_retry";
  } else if (failed) {
    nextAction = "review_failure";
    guidance = "terminal_manual_review_required";
  } else if (manualActionRequired) {
    nextAction = "open_nextcloud_mail";
    guidance = "manual_nextcloud_confirmation_required";
  } else if (leased) {
    nextAction = "wait_for_active_lease";
    guidance = "active_lease_must_complete";
  } else if (retry) {
    nextAction = "retry_with_confirmed_not_applied_evidence";
    guidance = "retry_requires_exact_fenced_receipt";
  } else if (readbackPresent) {
    nextAction = "none";
    guidance = "durable_ack_readback_reconciled";
  } else if (!configured) {
    nextAction = "bind_provider";
    guidance = "provider_binding_required";
  } else if (queued) {
    nextAction = "dispatch_when_authorized";
    guidance = "initial_dispatch_safe_when_authorized";
  } else {
    nextAction = "none";
    guidance = "no_work_queued";
  }

  const queuedAt = optionalInstant(row.queued_at);
  const leaseExpiresAt = optionalInstant(row.lease_expires_at);
  const retryEligibleAt = optionalInstant(row.retry_eligible_at);
  const acknowledgedAt = optionalInstant(row.acknowledged_at);
  const reconciledAt = optionalInstant(row.reconciled_at);
  const lastSafeTransitionAt = latestInstant([
    queuedAt,
    retryEligibleAt,
    acknowledgedAt,
    reconciledAt,
  ]);

  return Object.freeze({
    schema: CLUBS_OPERATIONS_INTEGRATION_DELIVERY_DETAIL_CONTRACT.schema,
    version: CLUBS_OPERATIONS_INTEGRATION_DELIVERY_DETAIL_CONTRACT.version,
    lane,
    configurationState: configured ? "configured" : "provider_not_bound",
    currentState,
    acknowledgementState,
    transitions: Object.freeze({
      queuedAt,
      leaseExpiresAt,
      retryEligibleAt,
      acknowledgedAt,
      reconciledAt,
      lastSafeTransitionAt,
    }),
    retryAllowed: retry && trustedRetryPresent && !reconciliationRequired,
    reconciliationRequired,
    deliveryClaimed: readbackPresent,
    automaticDispatchAllowed: false,
    dispatchMode: lane === "nextcloud" ? "human_nextcloud_mail" : null,
    nextAction,
    guidance,
    containsPersonalData: false,
    exposesIdentifiers: false,
    exposesHashes: false,
    exposesCounts: false,
    exposesProviderObjects: false,
  });
}

const VENDURE_DETAIL_SQL = `
with current_item as (
  select o.outbox_event_id,o.delivery_state source_state,o.created_at queued_at,
         null::timestamptz lease_expires_at,null::timestamptz retry_eligible_at,
         o.delivered_at acknowledged_at
    from crays_core.checkout_order_transition_outbox o
   where o.tenant_id=$1
   order by o.created_at desc,o.outbox_event_id desc limit 1
), evidence as (
  select
    exists(select 1 from crays_core.checkout_vendure_order_dispatch_receipts r where r.tenant_id=$1) configured,
    exists(select 1 from current_item c join crays_core.vendure_order_reconciliation_resolution_receipts r on r.tenant_id=$1 and r.outbox_event_id=c.outbox_event_id where c.source_state='FAILED_RETRYABLE' and r.observation_outcome='PROVEN_NOT_DELIVERED' and r.target_delivery_state='FAILED_RETRYABLE') trusted_retry_present,
    exists(select 1 from current_item c join crays_core.checkout_vendure_order_dispatch_receipts r on r.tenant_id=$1 and r.outbox_event_id=c.outbox_event_id where r.outcome='DELIVERED') acknowledge_present,
    exists(select 1 from current_item c join crays_core.vendure_order_reconciliation_resolution_receipts r on r.tenant_id=$1 and r.outbox_event_id=c.outbox_event_id where r.observation_outcome='PROVEN_DELIVERED' and r.target_delivery_state='DELIVERED') readback_present,
    exists(select 1 from current_item c where c.source_state='UNKNOWN_RECONCILIATION_REQUIRED') reconcile_required
)
select e.configured,c.source_state,c.queued_at,c.lease_expires_at,c.retry_eligible_at,
       c.acknowledged_at,
       case when e.readback_present then c.acknowledged_at else null end reconciled_at,
       e.trusted_retry_present,e.acknowledge_present,e.readback_present,
       e.reconcile_required,false failed,false manual_action_required
  from evidence e left join current_item c on true
/* cclub-integration-detail:vendure:tenant-read-only */`;

const ERP_DETAIL_SQL = `
with current_item as (
  select o."id",o."tenant_id",o."state" source_state,o."created_at" queued_at,
         o."lease_until" lease_expires_at,o."next_attempt_at" retry_eligible_at,
         o."attempt_count",o."lease_id",o."lease_version"
    from "CraysClubErpDispatchOutbox" o
   where o."tenant_id"::text=$1 and o."source_event_kind"='BOOKING_REVENUE_ALLOCATION_READY'
   order by o."created_at" desc,o."id" desc limit 1
), current_receipt as (
  select r.* from current_item c
  join "CraysClubErpDispatchAuditReceipt" r
    on r."tenant_id"=c."tenant_id" and r."outbox_id"=c."id"
   and r."attempt_number"=c."attempt_count" and r."lease_version"=c."lease_version"
   order by r."observed_at" desc,r."provider_receipt_id" desc limit 1
)
select exists(select 1 from "CraysClubErpDispatchAuditReceipt" r where r."tenant_id"::text=$1) configured,
       c.source_state,c.queued_at,c.lease_expires_at,c.retry_eligible_at,
       case when r."normalized_kind"='ACCEPTED' then r."observed_at" else null end acknowledged_at,
       case when r."normalized_kind"='ACCEPTED' and r."provider_receipt_sha256"~'^[0-9a-f]{64}$' and r."response_sha256"~'^[0-9a-f]{64}$' and r."external_document_reference_sha256"~'^[0-9a-f]{64}$' then r."observed_at" else null end reconciled_at,
       coalesce(r."normalized_kind"='RETRYABLE_ERROR' and r."provider_receipt_sha256"~'^[0-9a-f]{64}$',false) trusted_retry_present,
       coalesce(r."normalized_kind"='ACCEPTED' and r."provider_receipt_sha256"~'^[0-9a-f]{64}$',false) acknowledge_present,
       coalesce(r."normalized_kind"='ACCEPTED' and r."provider_receipt_sha256"~'^[0-9a-f]{64}$' and r."request_sha256"~'^[0-9a-f]{64}$' and r."response_sha256"~'^[0-9a-f]{64}$' and r."external_document_reference_sha256"~'^[0-9a-f]{64}$',false) readback_present,
       coalesce((c.source_state='LEASED' and c.lease_expires_at<=now()) or (c.source_state='RETRY' and coalesce(r."normalized_kind",'')<>'RETRYABLE_ERROR') or (c.source_state='ACKNOWLEDGED' and coalesce(r."normalized_kind",'')<>'ACCEPTED'),false) reconcile_required,
       coalesce(c.source_state in ('REJECTED','DEAD_LETTER'),false) failed,
       false manual_action_required
  from (select 1) seed left join current_item c on true left join current_receipt r on true
/* cclub-integration-detail:erp:tenant-read-only */`;

const TWENTY_DETAIL_SQL = `
with current_item as (
  select o.* from crays_core.cclub_hotel_twenty_summary_outbox o
   where o.tenant_key=$1 order by o.created_at desc,o.id desc limit 1
), current_receipt as (
  select r.* from current_item c join crays_core.cclub_hotel_twenty_summary_delivery_receipt r
    on r.outbox_id=c.id and r.summary_sha256=c.summary_sha256 limit 1
)
select exists(select 1 from crays_core.cclub_hotel_twenty_summary_delivery_receipt r join crays_core.cclub_hotel_twenty_summary_outbox o on o.id=r.outbox_id where o.tenant_key=$1) configured,
       c.state source_state,c.created_at queued_at,c.lease_expires_at,
       c.next_attempt_at retry_eligible_at,r.acknowledged_at,null::timestamptz reconciled_at,
       coalesce(c.state='RETRY' and c.last_failure_code~'^CONFIRMED_NOT_APPLIED:[0-9a-f]{64}$',false) trusted_retry_present,
       coalesce(c.state='ACKNOWLEDGED' and r.id is not null,false) acknowledge_present,
       false readback_present,
       coalesce((c.state='LEASED' and c.lease_expires_at<=now()) or (c.state='RETRY' and coalesce(c.last_failure_code,'')!~'^CONFIRMED_NOT_APPLIED:[0-9a-f]{64}$'),false) reconcile_required,
       coalesce(c.state='DEAD',false) failed,false manual_action_required
  from (select 1) seed left join current_item c on true left join current_receipt r on true
/* cclub-integration-detail:twenty-crm:tenant-read-only */`;

const NEXTCLOUD_DETAIL_SQL = `
with current_item as (
  select i.* from crays_integration.mail_compose_intents i
   where i.crays_tenant_id=$1 order by i.created_at desc,i.mail_compose_intent_id desc limit 1
), current_confirmation as (
  select c.* from current_item i join crays_integration.mail_compose_send_confirmations c
    on c.mail_compose_intent_id=i.mail_compose_intent_id limit 1
)
select exists(select 1 from crays_integration.mailbox_authority_bindings b where b.crays_tenant_id=$1 and b.lifecycle_state='active') configured,
       i.state source_state,i.created_at queued_at,null::timestamptz lease_expires_at,
       null::timestamptz retry_eligible_at,c.confirmed_at acknowledged_at,
       case when c.correlation_state='matched' and c.action_receipt_id is not null then c.confirmed_at else null end reconciled_at,
       false trusted_retry_present,
       coalesce(c.provider_message_ref_sha256~'^[0-9a-f]{64}$',false) acknowledge_present,
       coalesce(c.correlation_state='matched' and c.provider_message_ref_sha256~'^[0-9a-f]{64}$' and c.action_receipt_id is not null,false) readback_present,
       coalesce(i.state='conflict' or c.correlation_state in ('conflict','unknown'),false) reconcile_required,
       coalesce(i.state in ('expired','cancelled','failed') or c.correlation_state='failed',false) failed,
       coalesce(i.state in ('preflighted','launch_issued','launch_redeemed','opened') and c.mail_compose_send_confirmation_id is null,false) manual_action_required
  from (select 1) seed left join current_item i on true left join current_confirmation c on true
/* cclub-integration-detail:nextcloud:human-only-tenant-read-only */`;

const PLANE_DETAIL_SQL = `
with current_item as (
  select o.* from crays_core.cclub_hotel_plane_exception_work_outbox o
   where o.tenant_key=$1 order by o.created_at desc,o.id desc limit 1
), current_receipt as (
  select r.* from current_item c join crays_core.cclub_hotel_plane_exception_work_receipt r
    on r.outbox_id=c.id and r.payload_sha256=c.payload_sha256 limit 1
), current_readback as (
  select s.* from current_receipt r join crays_core.cclub_hotel_plane_status_observation s
    on s.work_receipt_id=r.id order by s.observed_at desc,s.id desc limit 1
)
select exists(select 1 from crays_core.cclub_hotel_plane_exception_work_receipt r join crays_core.cclub_hotel_plane_exception_work_outbox o on o.id=r.outbox_id where o.tenant_key=$1) configured,
       c.state source_state,c.created_at queued_at,c.lease_expires_at,
       c.next_attempt_at retry_eligible_at,r.acknowledged_at,s.observed_at reconciled_at,
       coalesce(c.state='RETRY' and c.last_failure_code~'^CONFIRMED_NOT_APPLIED:[0-9a-f]{64}$',false) trusted_retry_present,
       coalesce(c.state='ACKNOWLEDGED' and r.id is not null,false) acknowledge_present,
       coalesce(c.state='ACKNOWLEDGED' and r.id is not null and s.verified_event_receipt_sha256~'^[0-9a-f]{64}$',false) readback_present,
       coalesce((c.state='LEASED' and c.lease_expires_at<=now()) or (c.state='RETRY' and coalesce(c.last_failure_code,'')!~'^CONFIRMED_NOT_APPLIED:[0-9a-f]{64}$'),false) reconcile_required,
       coalesce(c.state='DEAD',false) failed,false manual_action_required
  from (select 1) seed left join current_item c on true left join current_receipt r on true left join current_readback s on true
/* cclub-integration-detail:plane:tenant-read-only */`;

const DETAIL_SQL: Readonly<
  Record<ClubsOperationsIntegrationDeliveryDetailLane, string>
> = Object.freeze({
  vendure: VENDURE_DETAIL_SQL,
  erp: ERP_DETAIL_SQL,
  twenty_crm: TWENTY_DETAIL_SQL,
  nextcloud: NEXTCLOUD_DETAIL_SQL,
  plane: PLANE_DETAIL_SQL,
});

export async function readClubsOperationsIntegrationDeliveryDetailWithClient(
  client: ClubsOperationsIntegrationDeliveryDetailSqlClient,
  actor: ClubsOperationsIntegrationDeliveryDetailActor,
  lane: ClubsOperationsIntegrationDeliveryDetailLane,
): Promise<ClubsOperationsIntegrationDeliveryDetailProjection> {
  assertActor(actor);
  const result = await client.query<DetailRow>(DETAIL_SQL[lane], [actor.organizationId]);
  return projectDetail(lane, result.rows[0]);
}

export async function readClubsOperationsIntegrationDeliveryDetailWithPool(
  pool: ClubsOperationsIntegrationDeliveryDetailSqlPool,
  actor: ClubsOperationsIntegrationDeliveryDetailActor,
  lane: ClubsOperationsIntegrationDeliveryDetailLane,
): Promise<ClubsOperationsIntegrationDeliveryDetailProjection> {
  assertActor(actor);
  const client = await pool.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    await client.query(
      "select set_config('crays.app_role', 'core_service', true), set_config('crays.tenant_id', $1, true), set_config('app.tenant_id', $1, true) /* cclub-integration-detail:tenant-read-only */",
      [actor.organizationId],
    );
    const projection = await readClubsOperationsIntegrationDeliveryDetailWithClient(
      client,
      actor,
      lane,
    );
    await client.query("rollback");
    return projection;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    if (error instanceof ClubsOperationsIntegrationDeliveryDetailAuthorityError) {
      throw error;
    }
    throw new ClubsOperationsIntegrationDeliveryDetailUnavailableError();
  } finally {
    client.release?.();
  }
}

export async function readClubsOperationsIntegrationDeliveryDetail(
  actor: ClubsOperationsIntegrationDeliveryDetailActor,
  lane: ClubsOperationsIntegrationDeliveryDetailLane,
): Promise<ClubsOperationsIntegrationDeliveryDetailProjection> {
  return readClubsOperationsIntegrationDeliveryDetailWithPool(
    getCorePgPool(),
    actor,
    lane,
  );
}
