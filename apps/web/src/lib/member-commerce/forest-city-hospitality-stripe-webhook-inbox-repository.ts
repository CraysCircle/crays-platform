import { createHash } from "node:crypto";

import { verifyStripeConnectWebhook } from "./stripe-connect-direct-charge-provider";

export type HotelStripeWebhookPool = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    parameters?: readonly unknown[],
  ): Promise<{ rows: T[]; rowCount?: number }>;
};

type StripeVerificationInput = Parameters<typeof verifyStripeConnectWebhook>[0];

type SupportedEventType =
  | "checkout.session.completed"
  | "checkout.session.async_payment_succeeded"
  | "checkout.session.async_payment_failed"
  | "payment_intent.requires_action"
  | "payment_intent.processing"
  | "payment_intent.amount_capturable_updated"
  | "payment_intent.succeeded"
  | "payment_intent.payment_failed"
  | "payment_intent.canceled";

type ApplicationDisposition =
  | "APPLIED_CURRENT"
  | "IGNORED_STALE"
  | "PENDING_PREDECESSOR"
  | "REJECTED_CONFLICT";

type EventContract = {
  rank: number;
  state:
    | "REQUIRES_ACTION"
    | "PROCESSING"
    | "CHECKOUT_COMPLETED"
    | "CAPTURABLE"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELED"
    | "ASYNC_SUCCEEDED"
    | "ASYNC_FAILED";
  asynchronousOutcome: boolean;
};

const EVENT_CONTRACTS: Record<SupportedEventType, EventContract> = {
  "payment_intent.requires_action": { rank: 100, state: "REQUIRES_ACTION", asynchronousOutcome: false },
  "payment_intent.processing": { rank: 200, state: "PROCESSING", asynchronousOutcome: false },
  "checkout.session.completed": { rank: 300, state: "CHECKOUT_COMPLETED", asynchronousOutcome: false },
  "payment_intent.amount_capturable_updated": { rank: 400, state: "CAPTURABLE", asynchronousOutcome: false },
  "payment_intent.succeeded": { rank: 500, state: "SUCCEEDED", asynchronousOutcome: false },
  "payment_intent.payment_failed": { rank: 500, state: "FAILED", asynchronousOutcome: false },
  "payment_intent.canceled": { rank: 500, state: "CANCELED", asynchronousOutcome: false },
  "checkout.session.async_payment_succeeded": { rank: 600, state: "ASYNC_SUCCEEDED", asynchronousOutcome: true },
  "checkout.session.async_payment_failed": { rank: 600, state: "ASYNC_FAILED", asynchronousOutcome: true },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;

export type RecordHotelStripeWebhookInput = {
  pool: HotelStripeWebhookPool;
  tenantId: string;
  webhookReceiptId: string;
  applicationReceiptId: string;
  rawBody: string;
  stripeSignatureHeader: string;
  verificationInput: StripeVerificationInput;
  observedAt: string;
};

export type RecordHotelStripeWebhookResult = {
  webhookReceiptId: string;
  applicationReceiptId: string;
  checkoutCommandId: string;
  stripeEventId: string;
  stripeEventType: SupportedEventType;
  disposition: ApplicationDisposition | "IDEMPOTENT_REPLAY";
  derivedPaymentState: EventContract["state"];
  rawBodySha256: string;
  eventPayloadSha256: string;
  providerMutationPerformed: false;
  formalApplied: false;
};

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function bodyEquals(value: unknown, rawBody: string): boolean {
  if (typeof value === "string") return value === rawBody;
  if (value instanceof Uint8Array) {
    return Buffer.from(value).equals(Buffer.from(rawBody, "utf8"));
  }
  return false;
}

function verificationInputContainsExactValue(input: StripeVerificationInput, expected: string): boolean {
  return Object.values(input as Record<string, unknown>).some((value) => bodyEquals(value, expected));
}

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Stripe event ${key} must be a non-empty string`);
  }
  return value;
}

function optionalProviderId(value: unknown, prefix: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !value.startsWith(prefix)) {
    throw new Error(`Stripe provider id must start with ${prefix}`);
  }
  return value;
}

function parseSupportedEvent(rawBody: string): {
  eventId: string;
  eventType: SupportedEventType;
  connectedAccountId: string;
  livemode: boolean;
  stripeCreatedAt: string;
  paymentIntentId: string | null;
  checkoutSessionId: string | null;
  checkoutCommandId: string;
  holdId: string;
  sellerSnapshotSha256: string;
  requestSha256: string;
  payloadSha256: string;
} {
  const payload = objectRecord(JSON.parse(rawBody), "Stripe event");
  const eventId = requiredString(payload, "id");
  const eventType = requiredString(payload, "type") as SupportedEventType;
  if (!(eventType in EVENT_CONTRACTS)) throw new Error(`unsupported Stripe event type: ${eventType}`);
  const connectedAccountId = requiredString(payload, "account");
  if (!/^acct_[A-Za-z0-9]{8,}$/.test(connectedAccountId)) throw new Error("invalid Stripe connected account");
  if (typeof payload.livemode !== "boolean") throw new Error("Stripe event livemode must be boolean");
  if (typeof payload.created !== "number" || !Number.isSafeInteger(payload.created) || payload.created <= 0) {
    throw new Error("Stripe event created must be a positive integer");
  }

  const data = objectRecord(payload.data, "Stripe event data");
  const object = objectRecord(data.object, "Stripe event object");
  const metadata = objectRecord(object.metadata, "Stripe event object metadata");
  const checkoutCommandId = requiredString(metadata, "crays_checkout_command_id");
  const holdId = requiredString(metadata, "crays_hold_id");
  const sellerSnapshotSha256 = requiredString(metadata, "crays_seller_snapshot_sha256");
  const requestSha256 = requiredString(metadata, "crays_request_sha256");
  if (!UUID.test(checkoutCommandId) || !UUID.test(holdId)) throw new Error("invalid CRAYS Stripe metadata UUID");
  if (!SHA256.test(sellerSnapshotSha256) || !SHA256.test(requestSha256)) throw new Error("invalid CRAYS Stripe metadata hash");

  const objectKind = requiredString(object, "object");
  const paymentIntentId = objectKind === "payment_intent"
    ? optionalProviderId(object.id, "pi_")
    : optionalProviderId(object.payment_intent, "pi_");
  const checkoutSessionId = objectKind === "checkout.session"
    ? optionalProviderId(object.id, "cs_")
    : null;
  if (paymentIntentId === null && checkoutSessionId === null) {
    throw new Error("Stripe event does not identify a PaymentIntent or Checkout Session");
  }

  return {
    eventId,
    eventType,
    connectedAccountId,
    livemode: payload.livemode,
    stripeCreatedAt: new Date(payload.created * 1000).toISOString(),
    paymentIntentId,
    checkoutSessionId,
    checkoutCommandId,
    holdId,
    sellerSnapshotSha256,
    requestSha256,
    payloadSha256: sha256(canonicalJson(payload)),
  };
}

function compareEventTuple(
  incomingCreatedAt: string,
  incomingRank: number,
  priorCreatedAt: string,
  priorRank: number,
): number {
  const incomingTime = Date.parse(incomingCreatedAt);
  const priorTime = Date.parse(priorCreatedAt);
  if (incomingTime !== priorTime) return incomingTime > priorTime ? 1 : -1;
  if (incomingRank !== priorRank) return incomingRank > priorRank ? 1 : -1;
  return 0;
}

export async function verifyAndRecordHotelStripeWebhook(
  input: RecordHotelStripeWebhookInput,
): Promise<RecordHotelStripeWebhookResult> {
  if (input.tenantId.trim().length === 0) {
    throw new Error("tenantId must be non-empty");
  }
  if (![input.webhookReceiptId, input.applicationReceiptId].every((value) => UUID.test(value))) {
    throw new Error("receipt ids must be UUIDs");
  }
  if (input.rawBody.length === 0 || input.stripeSignatureHeader.length === 0) {
    throw new Error("raw Stripe body and signature header are required");
  }
  if (!verificationInputContainsExactValue(input.verificationInput, input.rawBody)) {
    throw new Error("verification input does not contain the exact persisted raw body");
  }
  if (!verificationInputContainsExactValue(input.verificationInput, input.stripeSignatureHeader)) {
    throw new Error("verification input does not contain the exact hashed Stripe signature header");
  }

  const verifiedEvent = verifyStripeConnectWebhook(input.verificationInput);
  const event = parseSupportedEvent(input.rawBody);
  const contract = EVENT_CONTRACTS[event.eventType];
  const rawBodySha256 = sha256(input.rawBody);
  const signatureHeaderSha256 = sha256(input.stripeSignatureHeader);
  const verificationReceiptSha256 = sha256(canonicalJson({
    adapter: "verifyStripeConnectWebhook",
    eventId: event.eventId,
    rawBodySha256,
    signatureHeaderSha256,
    verifiedEvent,
  }));

  const replay = await input.pool.query<{
    webhook_receipt_id: string;
    checkout_command_id: string;
    raw_body_sha256: string;
    event_payload_sha256: string;
  }>(
    `SELECT webhook_receipt_id, checkout_command_id, raw_body_sha256, event_payload_sha256
       FROM crays_core.clubs_hotel_stripe_webhook_inbox
      WHERE tenant_id = $1 AND stripe_connected_account_id = $2 AND stripe_event_id = $3`,
    [input.tenantId, event.connectedAccountId, event.eventId],
  );

  if (replay.rows[0]) {
    if (
      replay.rows[0].checkout_command_id !== event.checkoutCommandId
      || replay.rows[0].raw_body_sha256 !== rawBodySha256
      || replay.rows[0].event_payload_sha256 !== event.payloadSha256
    ) {
      throw new Error("conflicting Stripe event replay");
    }
    return {
      webhookReceiptId: replay.rows[0].webhook_receipt_id,
      applicationReceiptId: input.applicationReceiptId,
      checkoutCommandId: event.checkoutCommandId,
      stripeEventId: event.eventId,
      stripeEventType: event.eventType,
      disposition: "IDEMPOTENT_REPLAY",
      derivedPaymentState: contract.state,
      rawBodySha256,
      eventPayloadSha256: event.payloadSha256,
      providerMutationPerformed: false,
      formalApplied: false,
    };
  }

  const prior = await input.pool.query<{
    application_receipt_id: string;
    stripe_created_at: string;
    event_rank: number;
    event_payload_sha256: string;
  }>(
    `SELECT application_receipt_id, stripe_created_at, event_rank, event_payload_sha256
       FROM crays_core.clubs_hotel_stripe_webhook_application_receipts
      WHERE tenant_id = $1 AND checkout_command_id = $2 AND disposition = 'APPLIED_CURRENT'
      ORDER BY stripe_created_at DESC, event_rank DESC, decided_at DESC
      LIMIT 1`,
    [input.tenantId, event.checkoutCommandId],
  );

  const predecessor = contract.asynchronousOutcome
    ? await input.pool.query<{ present: boolean }>(
        `SELECT true AS present
           FROM crays_core.clubs_hotel_stripe_webhook_inbox
          WHERE tenant_id = $1 AND checkout_command_id = $2 AND stripe_event_type = 'checkout.session.completed'
          LIMIT 1`,
        [input.tenantId, event.checkoutCommandId],
      )
    : { rows: [{ present: true }] };

  const priorRow = prior.rows[0] ?? null;
  let disposition: ApplicationDisposition;
  if (contract.asynchronousOutcome && !predecessor.rows[0]?.present) {
    disposition = "PENDING_PREDECESSOR";
  } else if (priorRow === null) {
    disposition = "APPLIED_CURRENT";
  } else {
    const comparison = compareEventTuple(event.stripeCreatedAt, contract.rank, priorRow.stripe_created_at, priorRow.event_rank);
    disposition = comparison > 0
      ? "APPLIED_CURRENT"
      : comparison < 0
        ? "IGNORED_STALE"
        : priorRow.event_payload_sha256 === event.payloadSha256
          ? "IGNORED_STALE"
          : "REJECTED_CONFLICT";
  }

  const decisionSha256 = sha256(canonicalJson({
    checkoutCommandId: event.checkoutCommandId,
    disposition,
    eventPayloadSha256: event.payloadSha256,
    eventRank: contract.rank,
    priorApplicationReceiptId: priorRow?.application_receipt_id ?? null,
    priorEventPayloadSha256: priorRow?.event_payload_sha256 ?? null,
    stripeCreatedAt: event.stripeCreatedAt,
  }));

  await input.pool.query("BEGIN");
  try {
    await input.pool.query(
      `INSERT INTO crays_core.clubs_hotel_stripe_webhook_inbox (
         webhook_receipt_id, tenant_id, checkout_command_id, stripe_event_id, stripe_event_type,
         stripe_connected_account_id, stripe_livemode, stripe_created_at, payment_intent_id,
         checkout_session_id, metadata_checkout_command_id, metadata_hold_id,
         metadata_seller_snapshot_sha256, metadata_request_sha256, raw_body, raw_body_sha256,
         stripe_signature_header_sha256, signature_verification_receipt_sha256,
         event_payload_sha256, signature_verified, observed_at,
         provider_mutation_performed, formal_applied
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,true,$20,false,false
       )`,
      [input.webhookReceiptId,input.tenantId,event.checkoutCommandId,event.eventId,event.eventType,
       event.connectedAccountId,event.livemode,event.stripeCreatedAt,event.paymentIntentId,
       event.checkoutSessionId,event.checkoutCommandId,event.holdId,event.sellerSnapshotSha256,
       event.requestSha256,input.rawBody,rawBodySha256,signatureHeaderSha256,
       verificationReceiptSha256,event.payloadSha256,input.observedAt],
    );
    await input.pool.query(
      `INSERT INTO crays_core.clubs_hotel_stripe_webhook_application_receipts (
         application_receipt_id, tenant_id, webhook_receipt_id, checkout_command_id,
         application_attempt_no, prior_application_receipt_id, stripe_created_at, event_rank,
         event_payload_sha256, prior_stripe_created_at, prior_event_rank,
         prior_event_payload_sha256, disposition, derived_payment_state, decision_sha256,
         decided_at, provider_mutation_performed, formal_applied
       ) VALUES ($1,$2,$3,$4,1,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,false,false)`,
      [input.applicationReceiptId,input.tenantId,input.webhookReceiptId,event.checkoutCommandId,
       priorRow?.application_receipt_id ?? null,event.stripeCreatedAt,contract.rank,event.payloadSha256,
       priorRow?.stripe_created_at ?? null,priorRow?.event_rank ?? null,
       priorRow?.event_payload_sha256 ?? null,disposition,contract.state,decisionSha256,input.observedAt],
    );
    await input.pool.query("COMMIT");
  } catch (error) {
    await input.pool.query("ROLLBACK");
    throw error;
  }

  return {
    webhookReceiptId: input.webhookReceiptId,
    applicationReceiptId: input.applicationReceiptId,
    checkoutCommandId: event.checkoutCommandId,
    stripeEventId: event.eventId,
    stripeEventType: event.eventType,
    disposition,
    derivedPaymentState: contract.state,
    rawBodySha256,
    eventPayloadSha256: event.payloadSha256,
    providerMutationPerformed: false,
    formalApplied: false,
  };
}
