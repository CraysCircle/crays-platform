import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const STRIPE_CONNECT_API_VERSION = "2026-07-29.dahlia" as const;
const STRIPE_API_ORIGIN = "https://api.stripe.com";
const MAX_RESPONSE_BYTES = 1_048_576;
const DEFAULT_TIMEOUT_MS = 15_000;

export class StripeConnectProviderError extends Error {
  constructor(
    readonly code: "invalid_request" | "provider_rejected" | "provider_unavailable" | "provider_protocol_error" | "webhook_signature_invalid",
    message: string,
    readonly retryable: boolean,
    readonly providerRequestId: string | null = null,
  ) {
    super(message);
    this.name = "StripeConnectProviderError";
  }
}

type FetchLike = typeof fetch;

export type StripeDirectPaymentIntentRequest = {
  platformSecretKey: string;
  connectedAccountId: string;
  amountMinor: number;
  applicationFeeAmountMinor: number;
  currency: string;
  tenantId: string;
  projectId: string;
  bookingId: string;
  allocationPlanDigest: string;
  idempotencyKey: string;
};

export type StripeDirectPaymentIntentReceipt = {
  paymentIntentId: string;
  connectedAccountId: string;
  status: string;
  amountMinor: number;
  applicationFeeAmountMinor: number;
  currency: string;
  livemode: boolean;
  providerRequestId: string | null;
  providerResponseDigest: string;
  clientSecret: string | null;
};

export type StripePlatformTransferRequest = {
  platformSecretKey: string;
  destinationConnectedAccountId: string;
  amountMinor: number;
  currency: string;
  transferGroup: string;
  tenantId: string;
  projectId: string;
  bookingId: string;
  beneficiaryKind: "ambassador_or_marketing" | "technology_software" | "global_concept";
  allocationPlanDigest: string;
  idempotencyKey: string;
};

export type StripePlatformTransferReceipt = {
  transferId: string;
  destinationConnectedAccountId: string;
  amountMinor: number;
  currency: string;
  transferGroup: string;
  livemode: boolean;
  providerRequestId: string | null;
  providerResponseDigest: string;
};

export type VerifiedStripeConnectEvent = {
  id: string;
  type: string;
  created: number;
  livemode: boolean;
  connectedAccountId: string;
  object: Readonly<Record<string, unknown>>;
  rawBodyDigest: string;
};

function invalid(message: string): never {
  throw new StripeConnectProviderError("invalid_request", message, false);
}

function assertSecretKey(value: string): void {
  if (!/^(rk|sk)_(test|live)_[^\s]{8,}$/.test(value) || value.length > 256) invalid("Stripe platform key is malformed.");
}

function assertAccount(value: string): void {
  if (!/^acct_[A-Za-z0-9]{8,}$/.test(value)) invalid("Stripe connected account id is malformed.");
}

function assertAmount(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) invalid(`${name} must be a positive safe integer.`);
}

function currency(value: string): string {
  const normalized = value.toLowerCase();
  if (!/^[a-z]{3}$/.test(normalized)) invalid("Currency must be a three-letter code.");
  return normalized;
}

function assertOpaque(name: string, value: string, maxLength = 200): void {
  if (!value || value.length > maxLength || !/^[A-Za-z0-9._:-]+$/.test(value)) invalid(`${name} is malformed.`);
}

function digest(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new StripeConnectProviderError("provider_protocol_error", "Stripe returned a non-object response.", true);
  }
  return value as Record<string, unknown>;
}

function stringField(value: Record<string, unknown>, key: string): string {
  if (typeof value[key] !== "string" || value[key] === "") {
    throw new StripeConnectProviderError("provider_protocol_error", `Stripe response is missing ${key}.`, true);
  }
  return value[key] as string;
}

function integerField(value: Record<string, unknown>, key: string): number {
  if (!Number.isSafeInteger(value[key])) {
    throw new StripeConnectProviderError("provider_protocol_error", `Stripe response is missing ${key}.`, true);
  }
  return value[key] as number;
}

async function postForm(input: {
  platformSecretKey: string;
  path: "/v1/payment_intents" | "/v1/transfers";
  stripeAccount: string | null;
  idempotencyKey: string;
  form: URLSearchParams;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): Promise<{ body: Record<string, unknown>; raw: string; requestId: string | null }> {
  assertSecretKey(input.platformSecretKey);
  assertOpaque("idempotencyKey", input.idempotencyKey, 255);
  if (input.stripeAccount) assertAccount(input.stripeAccount);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await (input.fetchImpl ?? fetch)(`${STRIPE_API_ORIGIN}${input.path}`, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${input.platformSecretKey}`,
        "content-type": "application/x-www-form-urlencoded",
        "idempotency-key": input.idempotencyKey,
        "stripe-version": STRIPE_CONNECT_API_VERSION,
        ...(input.stripeAccount ? { "stripe-account": input.stripeAccount } : {}),
      },
      body: input.form,
    });
  } catch (error) {
    throw new StripeConnectProviderError(
      "provider_unavailable",
      error instanceof Error && error.name === "AbortError" ? "Stripe request timed out." : "Stripe request failed before a response.",
      true,
    );
  } finally {
    clearTimeout(timeout);
  }

  const requestId = response.headers.get("request-id");
  const advertisedLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(advertisedLength) && advertisedLength > MAX_RESPONSE_BYTES) {
    throw new StripeConnectProviderError("provider_protocol_error", "Stripe response exceeded the size limit.", true, requestId);
  }
  const raw = await response.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_RESPONSE_BYTES) {
    throw new StripeConnectProviderError("provider_protocol_error", "Stripe response exceeded the size limit.", true, requestId);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new StripeConnectProviderError("provider_protocol_error", "Stripe returned invalid JSON.", true, requestId);
  }
  const body = record(parsed);
  if (!response.ok) {
    const retryable = response.status === 409 || response.status === 429 || response.status >= 500;
    throw new StripeConnectProviderError("provider_rejected", `Stripe rejected the request with HTTP ${response.status}.`, retryable, requestId);
  }
  return { body, raw, requestId };
}

function metadata(form: URLSearchParams, values: Record<string, string>): void {
  for (const [key, value] of Object.entries(values)) {
    assertOpaque(`metadata.${key}`, value);
    form.set(`metadata[${key}]`, value);
  }
}

export async function createStripeConnectDirectPaymentIntent(
  request: StripeDirectPaymentIntentRequest,
  options: { fetchImpl?: FetchLike; timeoutMs?: number } = {},
): Promise<StripeDirectPaymentIntentReceipt> {
  assertAccount(request.connectedAccountId);
  assertAmount("amountMinor", request.amountMinor);
  assertAmount("applicationFeeAmountMinor", request.applicationFeeAmountMinor);
  if (request.applicationFeeAmountMinor >= request.amountMinor) invalid("Application fee must be lower than booking gross.");
  const normalizedCurrency = currency(request.currency);
  assertOpaque("tenantId", request.tenantId);
  assertOpaque("projectId", request.projectId);
  assertOpaque("bookingId", request.bookingId);
  assertOpaque("allocationPlanDigest", request.allocationPlanDigest);

  const form = new URLSearchParams({
    amount: String(request.amountMinor),
    currency: normalizedCurrency,
    application_fee_amount: String(request.applicationFeeAmountMinor),
    "automatic_payment_methods[enabled]": "true",
  });
  metadata(form, {
    crays_tenant_id: request.tenantId,
    crays_project_id: request.projectId,
    crays_booking_id: request.bookingId,
    crays_allocation_plan_digest: request.allocationPlanDigest,
  });

  const provider = await postForm({
    platformSecretKey: request.platformSecretKey,
    path: "/v1/payment_intents",
    stripeAccount: request.connectedAccountId,
    idempotencyKey: request.idempotencyKey,
    form,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
  });
  const id = stringField(provider.body, "id");
  const amount = integerField(provider.body, "amount");
  const fee = integerField(provider.body, "application_fee_amount");
  const returnedCurrency = stringField(provider.body, "currency");
  if (!id.startsWith("pi_") || amount !== request.amountMinor || fee !== request.applicationFeeAmountMinor || returnedCurrency !== normalizedCurrency) {
    throw new StripeConnectProviderError("provider_protocol_error", "Stripe PaymentIntent echo does not match the allocation.", true, provider.requestId);
  }
  return {
    paymentIntentId: id,
    connectedAccountId: request.connectedAccountId,
    status: stringField(provider.body, "status"),
    amountMinor: amount,
    applicationFeeAmountMinor: fee,
    currency: normalizedCurrency,
    livemode: provider.body.livemode === true,
    providerRequestId: provider.requestId,
    providerResponseDigest: digest(provider.raw),
    clientSecret: typeof provider.body.client_secret === "string" ? provider.body.client_secret : null,
  };
}

export async function createStripePlatformTransfer(
  request: StripePlatformTransferRequest,
  options: { fetchImpl?: FetchLike; timeoutMs?: number } = {},
): Promise<StripePlatformTransferReceipt> {
  assertAccount(request.destinationConnectedAccountId);
  assertAmount("amountMinor", request.amountMinor);
  const normalizedCurrency = currency(request.currency);
  assertOpaque("transferGroup", request.transferGroup);
  assertOpaque("tenantId", request.tenantId);
  assertOpaque("projectId", request.projectId);
  assertOpaque("bookingId", request.bookingId);
  assertOpaque("allocationPlanDigest", request.allocationPlanDigest);

  const form = new URLSearchParams({
    amount: String(request.amountMinor),
    currency: normalizedCurrency,
    destination: request.destinationConnectedAccountId,
    transfer_group: request.transferGroup,
  });
  metadata(form, {
    crays_tenant_id: request.tenantId,
    crays_project_id: request.projectId,
    crays_booking_id: request.bookingId,
    crays_beneficiary_kind: request.beneficiaryKind,
    crays_allocation_plan_digest: request.allocationPlanDigest,
  });

  const provider = await postForm({
    platformSecretKey: request.platformSecretKey,
    path: "/v1/transfers",
    stripeAccount: null,
    idempotencyKey: request.idempotencyKey,
    form,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
  });
  const id = stringField(provider.body, "id");
  const amount = integerField(provider.body, "amount");
  const destination = stringField(provider.body, "destination");
  const returnedCurrency = stringField(provider.body, "currency");
  const group = stringField(provider.body, "transfer_group");
  if (!id.startsWith("tr_") || amount !== request.amountMinor || destination !== request.destinationConnectedAccountId || returnedCurrency !== normalizedCurrency || group !== request.transferGroup) {
    throw new StripeConnectProviderError("provider_protocol_error", "Stripe Transfer echo does not match the split command.", true, provider.requestId);
  }
  return {
    transferId: id,
    destinationConnectedAccountId: destination,
    amountMinor: amount,
    currency: normalizedCurrency,
    transferGroup: group,
    livemode: provider.body.livemode === true,
    providerRequestId: provider.requestId,
    providerResponseDigest: digest(provider.raw),
  };
}

function signatureParts(header: string): { timestamp: number; signatures: string[] } {
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.trim().split("=", 2);
    if (key === "t" && /^\d+$/.test(value ?? "")) timestamp = Number(value);
    if (key === "v1" && /^[a-f0-9]{64}$/.test(value ?? "")) signatures.push(value);
  }
  if (!Number.isSafeInteger(timestamp) || signatures.length === 0) {
    throw new StripeConnectProviderError("webhook_signature_invalid", "Stripe signature header is malformed.", false);
  }
  return { timestamp: timestamp as number, signatures };
}

export function verifyStripeConnectWebhook(input: {
  rawBody: string | Uint8Array;
  signatureHeader: string;
  webhookSecret: string;
  expectedLivemode: boolean;
  nowEpochSeconds?: number;
  toleranceSeconds?: number;
}): VerifiedStripeConnectEvent {
  if (!/^whsec_[^\s]{8,}$/.test(input.webhookSecret)) invalid("Stripe webhook secret is malformed.");
  const raw = typeof input.rawBody === "string" ? Buffer.from(input.rawBody, "utf8") : Buffer.from(input.rawBody);
  if (raw.byteLength === 0 || raw.byteLength > MAX_RESPONSE_BYTES) {
    throw new StripeConnectProviderError("webhook_signature_invalid", "Stripe webhook body size is invalid.", false);
  }
  const parsed = signatureParts(input.signatureHeader);
  const now = input.nowEpochSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = input.toleranceSeconds ?? 300;
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(tolerance) || tolerance < 0 || Math.abs(now - parsed.timestamp) > tolerance) {
    throw new StripeConnectProviderError("webhook_signature_invalid", "Stripe webhook timestamp is outside tolerance.", false);
  }

  const payload = Buffer.concat([Buffer.from(`${parsed.timestamp}.`, "utf8"), raw]);
  const expected = createHmac("sha256", input.webhookSecret).update(payload).digest();
  const valid = parsed.signatures.some((candidateHex) => {
    const candidate = Buffer.from(candidateHex, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
  if (!valid) throw new StripeConnectProviderError("webhook_signature_invalid", "Stripe webhook signature is invalid.", false);

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw.toString("utf8"));
  } catch {
    throw new StripeConnectProviderError("webhook_signature_invalid", "Stripe webhook body is invalid JSON.", false);
  }
  const event = record(decoded);
  const id = stringField(event, "id");
  const type = stringField(event, "type");
  const account = stringField(event, "account");
  const created = integerField(event, "created");
  if (!id.startsWith("evt_") || !type.includes(".") || !account.startsWith("acct_") || event.livemode !== input.expectedLivemode) {
    throw new StripeConnectProviderError("webhook_signature_invalid", "Stripe Connect event authority does not match.", false);
  }
  return {
    id,
    type,
    created,
    livemode: event.livemode === true,
    connectedAccountId: account,
    object: record(record(event.data).object),
    rawBodyDigest: digest(raw),
  };
}
