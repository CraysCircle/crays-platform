import {createHash} from "node:crypto";

import type {createHotelBookingCancellationAuthority} from "./hotel-booking-cancellation-authority-contract";
import type {acceptAuthenticatedHotelPmsCancellationConfirmation} from "./hotel-booking-cancellation-provider-saga-repository";

export const HOTEL_STRIPE_REFUND_SAGA_VERSION =
  "cclub.phase9.hotel-stripe-refund-saga.v1" as const;
export const HOTEL_STRIPE_API_VERSION = "2026-07-29.dahlia" as const;
type CancellationAuthority = ReturnType<typeof createHotelBookingCancellationAuthority>;
type PmsCancellationConfirmation = ReturnType<
  typeof acceptAuthenticatedHotelPmsCancellationConfirmation
>;
const SHA256 = /^[a-f0-9]{64}$/;
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const instant = (value: string, code: string) => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(code);
  return parsed;
};

export type HotelRefundSagaDb = Readonly<{
  query<T = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<Readonly<{rows: T[]}>>;
  release(): void;
}>;
export type HotelRefundSagaPool = Readonly<{
  connect(): Promise<HotelRefundSagaDb>;
}>;

export type PrepareHotelStripeRefundCommandInput = Readonly<{
  refundCommandId: string;
  idempotencyKey: string;
  authority: CancellationAuthority;
  pmsCancellation: PmsCancellationConfirmation;
  paymentEvidence: Readonly<{
    paymentEvidenceReceiptId: string;
    tenantId: string;
    projectId: string;
    siteId: string;
    propertyId: string;
    finalBookingReceiptId: string;
    stripeApiVersion: typeof HOTEL_STRIPE_API_VERSION;
    stripeEnvironment: "test" | "live";
    stripeAccountMode: "platform" | "connected";
    stripeAccountId: string;
    checkoutSessionId: string;
    stripeCustomerId: string;
    paymentIntentId: string;
    chargeId: string;
    currency: string;
    amountMinor: number;
    paymentStatus: "paid";
    signatureVerified: true;
    providerEventId: string;
    eventPayloadSha256: string;
  }>;
  availableAt: string;
  createdAt: string;
}>;

export function prepareHotelStripeRefundCommand(
  input: PrepareHotelStripeRefundCommandInput,
) {
  const {authority, pmsCancellation: pms, paymentEvidence: payment} = input;
  if (!input.refundCommandId.trim() || !input.idempotencyKey.trim()) {
    throw new Error("HOTEL_STRIPE_REFUND_COMMAND_REFERENCE_REQUIRED");
  }
  if (
    authority.refundableAmountMinor < 1 ||
    authority.stripeRefundStatus !== "not-authorized" ||
    authority.externalActionPerformed ||
    !SHA256.test(authority.authoritySha256)
  ) {
    throw new Error("HOTEL_STRIPE_REFUND_AUTHORITY_INVALID");
  }
  if (
    !pms.providerCancellationConfirmed ||
    pms.providerStatus !== "canceled" ||
    pms.tenantId !== authority.scope.tenantId ||
    !SHA256.test(pms.confirmationSha256)
  ) {
    throw new Error("HOTEL_STRIPE_REFUND_PMS_CANCELLATION_INVALID");
  }
  if (
    payment.paymentEvidenceReceiptId !== authority.paymentEvidenceReceiptId ||
    payment.tenantId !== authority.scope.tenantId ||
    payment.projectId !== authority.scope.projectId ||
    payment.siteId !== authority.scope.siteId ||
    payment.propertyId !== authority.scope.propertyId ||
    payment.finalBookingReceiptId !== authority.scope.finalBookingReceiptId ||
    payment.stripeApiVersion !== HOTEL_STRIPE_API_VERSION ||
    payment.paymentStatus !== "paid" ||
    payment.signatureVerified !== true ||
    !SHA256.test(payment.eventPayloadSha256)
  ) {
    throw new Error("HOTEL_STRIPE_REFUND_PAYMENT_EVIDENCE_INVALID");
  }
  if (
    !payment.stripeAccountId.trim() ||
    !payment.checkoutSessionId.trim() ||
    !payment.stripeCustomerId.trim() ||
    !payment.paymentIntentId.trim() ||
    !payment.chargeId.trim() ||
    !payment.providerEventId.trim() ||
    !/^[a-z]{3}$/.test(payment.currency) ||
    payment.currency !== authority.currency.toLowerCase() ||
    !Number.isSafeInteger(payment.amountMinor) ||
    payment.amountMinor !== authority.paidAmountMinor
  ) {
    throw new Error("HOTEL_STRIPE_REFUND_PAYMENT_SCOPE_MISMATCH");
  }
  const createdAt = instant(input.createdAt, "HOTEL_STRIPE_REFUND_CREATED_AT_INVALID");
  const availableAt = instant(input.availableAt, "HOTEL_STRIPE_REFUND_AVAILABLE_AT_INVALID");
  if (availableAt < createdAt) throw new Error("HOTEL_STRIPE_REFUND_TIMELINE_INVALID");
  const requestPayload = Object.freeze({
    payment_intent: payment.paymentIntentId,
    amount: authority.refundableAmountMinor,
    reason: "requested_by_customer" as const,
    metadata: Object.freeze({
      crays_domain: "hotel-booking" as const,
      crays_final_booking_receipt_id: authority.scope.finalBookingReceiptId,
      crays_cancellation_authority_id: authority.cancellationAuthorityId,
      crays_pms_cancellation_confirmation_id: pms.confirmationReceiptId,
    }),
  });
  const requestSha256 = digest({
    stripeAccountId: payment.stripeAccountId,
    stripeApiVersion: HOTEL_STRIPE_API_VERSION,
    idempotencyKey: input.idempotencyKey,
    requestPayload,
    authoritySha256: authority.authoritySha256,
    pmsConfirmationSha256: pms.confirmationSha256,
    paymentEventPayloadSha256: payment.eventPayloadSha256,
  });
  return Object.freeze({
    contractVersion: HOTEL_STRIPE_REFUND_SAGA_VERSION,
    refundCommandId: input.refundCommandId,
    cancellationAuthorityId: authority.cancellationAuthorityId,
    pmsCancellationConfirmationReceiptId: pms.confirmationReceiptId,
    tenantId: authority.scope.tenantId,
    projectId: authority.scope.projectId,
    siteId: authority.scope.siteId,
    propertyId: authority.scope.propertyId,
    paymentEvidenceReceiptId: payment.paymentEvidenceReceiptId,
    stripeApiVersion: HOTEL_STRIPE_API_VERSION,
    stripeEnvironment: payment.stripeEnvironment,
    stripeAccountMode: payment.stripeAccountMode,
    stripeAccountId: payment.stripeAccountId,
    checkoutSessionId: payment.checkoutSessionId,
    stripeCustomerId: payment.stripeCustomerId,
    paymentIntentId: payment.paymentIntentId,
    chargeId: payment.chargeId,
    currency: payment.currency,
    paidAmountMinor: payment.amountMinor,
    refundAmountMinor: authority.refundableAmountMinor,
    idempotencyKey: input.idempotencyKey,
    method: "POST" as const,
    path: "/v1/refunds" as const,
    requestPayload,
    requestSha256,
    commandState: "queued" as const,
    attemptCount: 0,
    availableAt: input.availableAt,
    createdAt: input.createdAt,
    stripeCallPerformed: false as const,
    inventoryReleaseAuthorized: false as const,
    revenueReversalAuthorized: false as const,
    formalActionAuthorized: false as const,
  });
}

export type LeasedHotelStripeRefundCommand = Readonly<{
  refundCommandId: string;
  tenantId: string;
  stripeAccountId: string;
  paymentIntentId: string;
  chargeId: string;
  amountMinor: number;
  currency: string;
  requestSha256: string;
  commandState: "leased";
  attemptCount: number;
  leaseToken: string;
  leaseOwnerHash: string;
  leaseExpiresAt: string;
}>;

export function acceptSignedHotelStripeRefundEvent(
  command: ReturnType<typeof prepareHotelStripeRefundCommand>,
  input: Readonly<{
    refundProviderReceiptId: string;
    providerEventId: string;
    providerRefundId: string;
    stripeAccountId: string;
    paymentIntentId: string;
    chargeId: string;
    amountMinor: number;
    currency: string;
    providerStatus: "pending" | "requires_action" | "succeeded" | "failed" | "canceled";
    signatureVerified: boolean;
    eventPayloadSha256: string;
    eventCreatedAt: string;
    receivedAt: string;
  }>,
) {
  if (
    !input.refundProviderReceiptId.trim() ||
    !input.providerEventId.trim() ||
    !input.providerRefundId.trim() ||
    !input.signatureVerified ||
    !SHA256.test(input.eventPayloadSha256)
  ) throw new Error("HOTEL_STRIPE_REFUND_EVENT_AUTH_INVALID");
  if (
    input.stripeAccountId !== command.stripeAccountId ||
    input.paymentIntentId !== command.paymentIntentId ||
    input.chargeId !== command.chargeId ||
    input.amountMinor !== command.refundAmountMinor ||
    input.currency !== command.currency
  ) throw new Error("HOTEL_STRIPE_REFUND_EVENT_SCOPE_MISMATCH");
  const eventCreatedAt = instant(input.eventCreatedAt, "HOTEL_STRIPE_REFUND_EVENT_TIME_INVALID");
  const receivedAt = instant(input.receivedAt, "HOTEL_STRIPE_REFUND_EVENT_TIME_INVALID");
  if (receivedAt < eventCreatedAt || receivedAt - eventCreatedAt > 300_000) {
    throw new Error("HOTEL_STRIPE_REFUND_EVENT_REPLAY_WINDOW_INVALID");
  }
  const nextState = {
    pending: "provider-pending",
    requires_action: "provider-action-required",
    succeeded: "succeeded",
    failed: "failed",
    canceled: "canceled",
  } as const;
  const body = Object.freeze({
    ...input,
    refundCommandId: command.refundCommandId,
    tenantId: command.tenantId,
    signatureVerified: true as const,
    nextCommandState: nextState[input.providerStatus],
  });
  return Object.freeze({
    ...body,
    providerReceiptSha256: digest(body),
    refundSucceeded: input.providerStatus === "succeeded",
    inventoryReleaseAuthorized: false as const,
    revenueReversalAuthorized: false as const,
    externalActionPerformedByThisFunction: false as const,
    formalActionAuthorized: false as const,
  });
}

async function transaction<T>(pool: HotelRefundSagaPool, tenantId: string, work: (db: HotelRefundSagaDb) => Promise<T>) {
  const db = await pool.connect();
  try {
    await db.query("begin");
    await db.query("select set_config('crays.app_role','integration_service',true),set_config('crays.tenant_id',$1,true)", [tenantId]);
    const result = await work(db); await db.query("commit"); return result;
  } catch (error) {
    await db.query("rollback").catch(() => undefined); throw error;
  } finally { db.release(); }
}

export function persistHotelStripeRefundCommand(pool: HotelRefundSagaPool, input: PrepareHotelStripeRefundCommandInput) {
  const command = prepareHotelStripeRefundCommand(input);
  return transaction(pool, command.tenantId, async (db) => {
    const prior = (await db.query<Readonly<{refund_command_id:string;request_sha256:string}>>(
      `select refund_command_id,request_sha256 from crays_integration.clubs_hotel_stripe_refund_commands
        where stripe_account_id=$1 and idempotency_key=$2`,
      [command.stripeAccountId, command.idempotencyKey])).rows[0];
    if (prior) {
      if (prior.refund_command_id!==command.refundCommandId || prior.request_sha256!==command.requestSha256)
        throw new Error("HOTEL_STRIPE_REFUND_REPLAY_CONFLICT");
      return Object.freeze({refundCommandId:prior.refund_command_id,replayed:true as const});
    }
    await db.query(
      `insert into crays_integration.clubs_hotel_stripe_refund_commands
       (refund_command_id,cancellation_authority_id,pms_cancellation_confirmation_receipt_id,
        tenant_id,project_id,site_id,property_id,payment_evidence_receipt_id,stripe_api_version,
        stripe_environment,stripe_account_mode,stripe_account_id,checkout_session_id,stripe_customer_id,
        payment_intent_id,charge_id,currency,paid_amount_minor,refund_amount_minor,idempotency_key,
        request_sha256,command_state,attempt_count,available_at,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'queued',0,$22,$23,$23)`,
      [command.refundCommandId,command.cancellationAuthorityId,command.pmsCancellationConfirmationReceiptId,
        command.tenantId,command.projectId,command.siteId,command.propertyId,command.paymentEvidenceReceiptId,
        command.stripeApiVersion,command.stripeEnvironment,command.stripeAccountMode,command.stripeAccountId,
        command.checkoutSessionId,command.stripeCustomerId,command.paymentIntentId,command.chargeId,
        command.currency,command.paidAmountMinor,command.refundAmountMinor,command.idempotencyKey,
        command.requestSha256,command.availableAt,command.createdAt]);
    return Object.freeze({refundCommandId:command.refundCommandId,requestSha256:command.requestSha256,replayed:false as const});
  });
}

export function leaseHotelStripeRefundCommand(pool: HotelRefundSagaPool, input: Readonly<{
  tenantId:string;leaseToken:string;leaseOwnerHash:string;leasedAt:string;leaseExpiresAt:string;
}>) {
  if (!input.tenantId.trim() || !input.leaseToken.trim() || !SHA256.test(input.leaseOwnerHash))
    throw new Error("HOTEL_STRIPE_REFUND_LEASE_INPUT_INVALID");
  const leasedAt=instant(input.leasedAt,"HOTEL_STRIPE_REFUND_LEASE_TIME_INVALID");
  const expiresAt=instant(input.leaseExpiresAt,"HOTEL_STRIPE_REFUND_LEASE_TIME_INVALID");
  if(expiresAt<=leasedAt||expiresAt-leasedAt>300_000)throw new Error("HOTEL_STRIPE_REFUND_LEASE_WINDOW_INVALID");
  return transaction(pool,input.tenantId,async(db)=>{
    await db.query(`update crays_integration.clubs_hotel_stripe_refund_commands
      set command_state='queued',lease_token=null,lease_owner_hash=null,lease_expires_at=null,available_at=$2,updated_at=$2
      where tenant_id=$1 and command_state='leased' and lease_expires_at <= $2`,[input.tenantId,input.leasedAt]);
    const row=(await db.query<Readonly<{refund_command_id:string;tenant_id:string;stripe_account_id:string;
      payment_intent_id:string;charge_id:string;refund_amount_minor:string|number;currency:string;
      request_sha256:string;attempt_count:number}>>(`with candidate as (
        select refund_command_id from crays_integration.clubs_hotel_stripe_refund_commands
        where tenant_id=$1 and command_state='queued' and available_at <= $2
        order by available_at,refund_command_id for update skip locked limit 1)
      update crays_integration.clubs_hotel_stripe_refund_commands c
      set command_state='leased',attempt_count=c.attempt_count+1,lease_token=$3,lease_owner_hash=$4,
        lease_expires_at=$5,updated_at=$2 from candidate where c.refund_command_id=candidate.refund_command_id
      returning c.refund_command_id,c.tenant_id,c.stripe_account_id,c.payment_intent_id,c.charge_id,
        c.refund_amount_minor,c.currency,c.request_sha256,c.attempt_count`,
      [input.tenantId,input.leasedAt,input.leaseToken,input.leaseOwnerHash,input.leaseExpiresAt])).rows[0];
    return row?Object.freeze({refundCommandId:row.refund_command_id,tenantId:row.tenant_id,
      stripeAccountId:row.stripe_account_id,paymentIntentId:row.payment_intent_id,chargeId:row.charge_id,
      amountMinor:Number(row.refund_amount_minor),currency:row.currency,requestSha256:row.request_sha256,
      commandState:"leased" as const,attemptCount:Number(row.attempt_count),leaseToken:input.leaseToken,
      leaseOwnerHash:input.leaseOwnerHash,leaseExpiresAt:input.leaseExpiresAt}):null;
  });
}

export function persistSignedHotelStripeRefundEvent(
  pool:HotelRefundSagaPool,
  command:ReturnType<typeof prepareHotelStripeRefundCommand>,
  input:Parameters<typeof acceptSignedHotelStripeRefundEvent>[1],
) {
  const receipt=acceptSignedHotelStripeRefundEvent(command,input);
  return transaction(pool,command.tenantId,async(db)=>{
    await db.query(`insert into crays_integration.clubs_hotel_stripe_refund_provider_receipts
      (refund_provider_receipt_id,refund_command_id,tenant_id,provider_event_id,provider_refund_id,
       stripe_account_id,payment_intent_id,charge_id,amount_minor,currency,provider_status,
       signature_verified,event_payload_sha256,event_created_at,received_at,created_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,$12,$13,$14,$14)`,
      [receipt.refundProviderReceiptId,receipt.refundCommandId,receipt.tenantId,receipt.providerEventId,
        receipt.providerRefundId,receipt.stripeAccountId,receipt.paymentIntentId,receipt.chargeId,
        receipt.amountMinor,receipt.currency,receipt.providerStatus,receipt.eventPayloadSha256,
        receipt.eventCreatedAt,receipt.receivedAt]);
    const updated=await db.query(`update crays_integration.clubs_hotel_stripe_refund_commands
      set command_state=$3,lease_token=null,lease_owner_hash=null,lease_expires_at=null,updated_at=$4
      where refund_command_id=$1 and tenant_id=$2 and command_state in ('queued','leased','provider-pending','provider-action-required')
      returning refund_command_id`,[command.refundCommandId,command.tenantId,receipt.nextCommandState,receipt.receivedAt]);
    if(updated.rows.length!==1)throw new Error("HOTEL_STRIPE_REFUND_EVENT_UPDATE_CONFLICT");
    return receipt;
  });
}
