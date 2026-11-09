import "server-only";

import { createHash } from "node:crypto";
import {
  STRIPE_CONNECT_API_VERSION,
  StripeConnectProviderError,
  verifyStripeConnectWebhook,
  type VerifiedStripeConnectEvent,
} from "./stripe-connect-direct-charge-provider";
import {
  assertClubsStripeSandboxMetadata,
  mapClubsStripePaymentState,
  type ClubsStripePaymentState,
  type ClubsStripeSandboxPaymentAuthority,
} from "./clubs-stripe-sandbox-contract";
import {
  CRAYS_PRO_SANDBOX_STRIPE_ACCOUNT_ID,
} from "./clubs-stripe-trusted-stay-adapter-contract";
import type {
  ClubsStripePriceReadbackV1,
  ClubsStripeProductReadbackV1,
} from "./clubs-stripe-price-binding-v1";

const STRIPE_API_ORIGIN = "https://api.stripe.com";
const MAX_RESPONSE_BYTES = 1_048_576;
const DEFAULT_TIMEOUT_MS = 15_000;

type FetchLike = typeof fetch;
type StripePath = "/v1/products" | "/v1/prices" | "/v1/payment_intents" | "/v1/transfers" | "/v1/refunds";

export type ClubsStripeProviderOptions = Readonly<{
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}>;

export type ClubsStripePaymentIntentReceipt = Readonly<{
  paymentIntentId: string;
  connectedAccountId: string;
  state: ClubsStripePaymentState;
  amountMinor: number;
  applicationFeeAmountMinor: number;
  currency: string;
  clientSecret: string | null;
  livemode: false;
  providerRequestId: string | null;
  providerResponseSha256: string;
}>;

export type ClubsStripeTransferReceipt = Readonly<{
  transferId: string;
  destinationConnectedAccountId: string;
  amountMinor: number;
  currency: string;
  transferGroup: string;
  livemode: false;
  providerRequestId: string | null;
  providerResponseSha256: string;
}>;

export type ClubsStripeRefundReceipt = Readonly<{
  refundId: string;
  paymentIntentId: string;
  amountMinor: number;
  currency: string;
  state: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELED";
  livemode: false;
  providerRequestId: string | null;
  providerResponseSha256: string;
}>;

export type ClubsStripeConnectedAccountReadback = Readonly<{
  id: string;
  merchantCardPaymentsStatus: string | null;
  recipientStripeTransfersStatus: string | null;
  providerResponseSha256: string;
  livemode: false;
}>;

export type ClubsStripeSandboxSetupReadback = Readonly<{
  platformAccountId: typeof CRAYS_PRO_SANDBOX_STRIPE_ACCOUNT_ID;
  platformAccountReadbackSha256: string;
  product: ClubsStripeProductReadbackV1;
  price: ClubsStripePriceReadbackV1;
  productProviderResponseSha256: string;
  priceProviderResponseSha256: string;
  connectedAccounts: Readonly<{
    operatorOrFranchise: ClubsStripeConnectedAccountReadback;
    ambassador: ClubsStripeConnectedAccountReadback;
    software: ClubsStripeConnectedAccountReadback;
    globalConceptTestOnly: ClubsStripeConnectedAccountReadback;
  }>;
  providerReadbackSha256: string;
  livemode: false;
}>;

function invalid(message: string): never {
  throw new StripeConnectProviderError("invalid_request", message, false);
}

function assertTestKey(value: string): void {
  if (!/^(rk|sk)_test_[^\s]{8,}$/.test(value) || value.length > 256) {
    invalid("A Stripe test-mode platform key is required.");
  }
}

function assertAccount(value: string): void {
  if (!/^acct_[A-Za-z0-9]{8,}$/.test(value)) invalid("Stripe connected account id is malformed.");
}

function assertOpaque(name: string, value: string, maxLength = 255): void {
  if (!value || value.length > maxLength || !/^[A-Za-z0-9._:-]+$/.test(value)) invalid(`${name} is malformed.`);
}

function assertAmount(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) invalid(`${name} must be a positive safe integer.`);
}

function sha256(value: string | Uint8Array): string {
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

function booleanField(value: Record<string, unknown>, key: string): boolean {
  if (typeof value[key] !== "boolean") {
    throw new StripeConnectProviderError("provider_protocol_error", `Stripe response is missing ${key}.`, true);
  }
  return value[key] as boolean;
}

function stringMetadata(value: unknown): Readonly<Record<string, string>> {
  const metadata = record(value);
  const normalized: Record<string, string> = {};
  for (const [key, entry] of Object.entries(metadata)) {
    if (typeof entry !== "string") {
      throw new StripeConnectProviderError("provider_protocol_error", "Stripe metadata is malformed.", true);
    }
    normalized[key] = entry;
  }
  return Object.freeze(normalized);
}

function setMetadata(form: URLSearchParams, metadata: Readonly<Record<string, string>>): void {
  assertClubsStripeSandboxMetadata(metadata);
  for (const [key, value] of Object.entries(metadata)) {
    assertOpaque(`metadata.${key}`, key);
    assertOpaque(`metadata.${key}`, value);
    form.set(`metadata[${key}]`, value);
  }
}

async function postStripeTestForm(input: Readonly<{
  platformTestKey: string;
  path: StripePath;
  connectedAccountId: string | null;
  idempotencyKey: string;
  form: URLSearchParams;
  options?: ClubsStripeProviderOptions;
}>): Promise<{ body: Record<string, unknown>; rawBody: string; requestId: string | null }> {
  assertTestKey(input.platformTestKey);
  assertOpaque("idempotencyKey", input.idempotencyKey);
  if (input.connectedAccountId) assertAccount(input.connectedAccountId);
  const controller = new AbortController();
  const timeoutMs = input.options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 60_000) invalid("Stripe timeout is invalid.");
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await (input.options?.fetchImpl ?? fetch)(`${STRIPE_API_ORIGIN}${input.path}`, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${input.platformTestKey}`,
        "content-type": "application/x-www-form-urlencoded",
        "idempotency-key": input.idempotencyKey,
        "stripe-version": STRIPE_CONNECT_API_VERSION,
        ...(input.connectedAccountId ? { "stripe-account": input.connectedAccountId } : {}),
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
  const rawBody = await response.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_RESPONSE_BYTES) {
    throw new StripeConnectProviderError("provider_protocol_error", "Stripe response exceeded the size limit.", true, requestId);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new StripeConnectProviderError("provider_protocol_error", "Stripe returned invalid JSON.", true, requestId);
  }
  const body = record(parsed);
  if (!response.ok) {
    const retryable = response.status === 409 || response.status === 429 || response.status >= 500;
    throw new StripeConnectProviderError("provider_rejected", `Stripe rejected the request with HTTP ${response.status}.`, retryable, requestId);
  }
  if (body.livemode !== false) {
    throw new StripeConnectProviderError("provider_protocol_error", "Stripe response is not test-mode scoped.", false, requestId);
  }
  return { body, rawBody, requestId };
}

async function getStripeTestJson(input: Readonly<{
  platformTestKey: string;
  path: string;
  requireLivemodeFalse: boolean;
  includeConfiguration?: "merchant" | "recipient";
}>): Promise<{ body: Record<string, unknown>; rawBody: string; requestId: string | null }> {
  assertTestKey(input.platformTestKey);
  if (
    (!input.path.startsWith("/v1/") && !input.path.startsWith("/v2/")) ||
    input.path.includes("?") ||
    input.path.includes("..")
  ) {
    invalid("Stripe read path is invalid.");
  }
  const url = new URL(input.path, STRIPE_API_ORIGIN);
  if (input.includeConfiguration) {
    if (!input.path.startsWith("/v2/core/accounts/")) {
      invalid("Stripe include configuration is invalid for this read path.");
    }
    url.searchParams.set(
      "include[0]",
      `configuration.${input.includeConfiguration}`,
    );
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${input.platformTestKey}`,
        "stripe-version": STRIPE_CONNECT_API_VERSION,
      },
    });
  } catch (error) {
    throw new StripeConnectProviderError(
      "provider_unavailable",
      error instanceof Error && error.name === "AbortError"
        ? "Stripe readback timed out."
        : "Stripe readback failed before a response.",
      true,
    );
  } finally {
    clearTimeout(timeout);
  }
  const requestId = response.headers.get("request-id");
  const rawBody = await response.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_RESPONSE_BYTES) {
    throw new StripeConnectProviderError(
      "provider_protocol_error",
      "Stripe readback exceeded the size limit.",
      true,
      requestId,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new StripeConnectProviderError(
      "provider_protocol_error",
      "Stripe returned invalid readback JSON.",
      true,
      requestId,
    );
  }
  const body = record(parsed);
  if (!response.ok) {
    const retryable = response.status === 409 || response.status === 429 || response.status >= 500;
    throw new StripeConnectProviderError(
      "provider_rejected",
      `Stripe rejected the readback with HTTP ${response.status}.`,
      retryable,
      requestId,
    );
  }
  if (input.requireLivemodeFalse && body.livemode !== false) {
    throw new StripeConnectProviderError(
      "provider_protocol_error",
      "Stripe readback is not test-mode scoped.",
      false,
      requestId,
    );
  }
  return { body, rawBody, requestId };
}

function connectedAccountReadback(
  provider: { body: Record<string, unknown>; rawBody: string },
  requiredConfiguration: "merchant" | "recipient",
): ClubsStripeConnectedAccountReadback {
  if (
    provider.body.object !== "v2.core.account" ||
    provider.body.livemode !== false ||
    !Array.isArray(provider.body.applied_configurations) ||
    !provider.body.applied_configurations.includes(requiredConfiguration)
  ) {
    throw new StripeConnectProviderError(
      "provider_protocol_error",
      "Stripe Account v2 readback is missing the required test configuration.",
      false,
    );
  }
  const configuration = record(provider.body.configuration);
  const selected = record(configuration[requiredConfiguration]);
  const capabilities = record(selected.capabilities);
  let merchantCardPaymentsStatus: string | null = null;
  let recipientStripeTransfersStatus: string | null = null;
  if (requiredConfiguration === "merchant") {
    merchantCardPaymentsStatus = stringField(
      record(capabilities.card_payments),
      "status",
    );
  } else {
    const stripeBalance = record(capabilities.stripe_balance);
    recipientStripeTransfersStatus = stringField(
      record(stripeBalance.stripe_transfers),
      "status",
    );
  }
  return Object.freeze({
    id: stringField(provider.body, "id"),
    merchantCardPaymentsStatus,
    recipientStripeTransfersStatus,
    providerResponseSha256: sha256(provider.rawBody),
    livemode: false,
  });
}

export async function readClubsStripeSandboxSetupReadback(input: Readonly<{
  platformTestKey: string;
  stripeProductId: string;
  stripePriceId: string;
  operatorConnectedAccountId: string;
  ambassadorConnectedAccountId: string;
  softwareConnectedAccountId: string;
  globalConceptTestConnectedAccountId: string;
}>): Promise<ClubsStripeSandboxSetupReadback> {
  if (!/^prod_[A-Za-z0-9]{8,}$/.test(input.stripeProductId)) invalid("Stripe Product id is malformed.");
  if (!/^price_[A-Za-z0-9]{8,}$/.test(input.stripePriceId)) invalid("Stripe Price id is malformed.");
  const accountIds = [
    input.operatorConnectedAccountId,
    input.ambassadorConnectedAccountId,
    input.softwareConnectedAccountId,
    input.globalConceptTestConnectedAccountId,
  ];
  accountIds.forEach(assertAccount);
  if (new Set(accountIds).size !== accountIds.length) invalid("Stripe connected-account role bindings must be distinct.");

  const platform = await getStripeTestJson({
    platformTestKey: input.platformTestKey,
    path: "/v1/account",
    requireLivemodeFalse: false,
  });
  if (stringField(platform.body, "id") !== CRAYS_PRO_SANDBOX_STRIPE_ACCOUNT_ID) {
    throw new StripeConnectProviderError(
      "provider_protocol_error",
      "Stripe test credential is not scoped to Crays Pro Sandbox.",
      false,
      platform.requestId,
    );
  }
  const [
    productProvider,
    priceProvider,
    operatorProvider,
    ambassadorProvider,
    softwareProvider,
    globalConceptProvider,
  ] = await Promise.all([
    getStripeTestJson({
      platformTestKey: input.platformTestKey,
      path: `/v1/products/${input.stripeProductId}`,
      requireLivemodeFalse: true,
    }),
    getStripeTestJson({
      platformTestKey: input.platformTestKey,
      path: `/v1/prices/${input.stripePriceId}`,
      requireLivemodeFalse: true,
    }),
    getStripeTestJson({
      platformTestKey: input.platformTestKey,
      path: `/v2/core/accounts/${input.operatorConnectedAccountId}`,
      requireLivemodeFalse: true,
      includeConfiguration: "merchant",
    }),
    getStripeTestJson({
      platformTestKey: input.platformTestKey,
      path: `/v2/core/accounts/${input.ambassadorConnectedAccountId}`,
      requireLivemodeFalse: true,
      includeConfiguration: "recipient",
    }),
    getStripeTestJson({
      platformTestKey: input.platformTestKey,
      path: `/v2/core/accounts/${input.softwareConnectedAccountId}`,
      requireLivemodeFalse: true,
      includeConfiguration: "recipient",
    }),
    getStripeTestJson({
      platformTestKey: input.platformTestKey,
      path: `/v2/core/accounts/${input.globalConceptTestConnectedAccountId}`,
      requireLivemodeFalse: true,
      includeConfiguration: "recipient",
    }),
  ]);
  const productTaxCode = productProvider.body.tax_code;
  if (typeof productTaxCode !== "string" || productTaxCode.length === 0) {
    throw new StripeConnectProviderError("provider_protocol_error", "Stripe Product tax_code is missing.", false);
  }
  const priceType = stringField(priceProvider.body, "type");
  const priceTaxBehavior = stringField(priceProvider.body, "tax_behavior");
  if (
    (priceType !== "one_time" && priceType !== "recurring") ||
    !["exclusive", "inclusive", "unspecified"].includes(priceTaxBehavior)
  ) {
    throw new StripeConnectProviderError("provider_protocol_error", "Stripe Price type or tax behavior is invalid.", false);
  }
  const priceProduct =
    typeof priceProvider.body.product === "string"
      ? priceProvider.body.product
      : stringField(record(priceProvider.body.product), "id");
  const unitAmount =
    priceProvider.body.unit_amount === null
      ? null
      : integerField(priceProvider.body, "unit_amount");
  const recurring =
    priceProvider.body.recurring === null
      ? null
      : (() => {
          const value = record(priceProvider.body.recurring);
          const interval = stringField(value, "interval");
          const intervalCount = integerField(value, "interval_count");
          if (!["day", "week", "month", "year"].includes(interval)) {
            throw new StripeConnectProviderError("provider_protocol_error", "Stripe recurring interval is invalid.", false);
          }
          return Object.freeze({
            interval: interval as "day" | "week" | "month" | "year",
            intervalCount,
          });
        })();
  const connectedAccounts = Object.freeze({
    operatorOrFranchise: connectedAccountReadback(operatorProvider, "merchant"),
    ambassador: connectedAccountReadback(ambassadorProvider, "recipient"),
    software: connectedAccountReadback(softwareProvider, "recipient"),
    globalConceptTestOnly: connectedAccountReadback(globalConceptProvider, "recipient"),
  });
  const product = Object.freeze({
    id: stringField(productProvider.body, "id"),
    active: booleanField(productProvider.body, "active"),
    livemode: false as const,
    taxCode: productTaxCode,
    metadata: stringMetadata(productProvider.body.metadata),
  });
  const price = Object.freeze({
    id: stringField(priceProvider.body, "id"),
    productId: priceProduct,
    active: booleanField(priceProvider.body, "active"),
    livemode: false as const,
    type: priceType as "one_time" | "recurring",
    recurring,
    unitAmountMinor: unitAmount,
    currency: stringField(priceProvider.body, "currency").toUpperCase(),
    taxBehavior: priceTaxBehavior as "exclusive" | "inclusive" | "unspecified",
    metadata: stringMetadata(priceProvider.body.metadata),
  });
  const providerHashes = Object.freeze({
    platform: sha256(platform.rawBody),
    product: sha256(productProvider.rawBody),
    price: sha256(priceProvider.rawBody),
    operator: connectedAccounts.operatorOrFranchise.providerResponseSha256,
    ambassador: connectedAccounts.ambassador.providerResponseSha256,
    software: connectedAccounts.software.providerResponseSha256,
    globalConcept: connectedAccounts.globalConceptTestOnly.providerResponseSha256,
  });
  return Object.freeze({
    platformAccountId: CRAYS_PRO_SANDBOX_STRIPE_ACCOUNT_ID,
    platformAccountReadbackSha256: providerHashes.platform,
    product,
    price,
    productProviderResponseSha256: providerHashes.product,
    priceProviderResponseSha256: providerHashes.price,
    connectedAccounts,
    providerReadbackSha256: sha256(JSON.stringify(providerHashes)),
    livemode: false,
  });
}

export async function createClubsStripeSandboxPaymentIntent(input: Readonly<{
  platformTestKey: string;
  authority: ClubsStripeSandboxPaymentAuthority;
  customerId?: string;
}>, options: ClubsStripeProviderOptions = {}): Promise<ClubsStripePaymentIntentReceipt> {
  if (input.authority.livemode !== false) invalid("Clubs Stripe authority must be test-mode scoped.");
  assertClubsStripeSandboxMetadata(input.authority.metadata);
  assertAccount(input.authority.operatorConnectedAccountId);
  assertAmount("amountMinor", input.authority.amountMinor);
  assertAmount("applicationFeeAmountMinor", input.authority.applicationFeeAmountMinor);
  if (input.authority.applicationFeeAmountMinor >= input.authority.amountMinor) invalid("Application fee must be lower than the gross payment.");
  const form = new URLSearchParams({
    amount: String(input.authority.amountMinor),
    currency: input.authority.currency.toLowerCase(),
    application_fee_amount: String(input.authority.applicationFeeAmountMinor),
    "automatic_payment_methods[enabled]": "true",
  });
  if (input.customerId) {
    if (!/^cus_[A-Za-z0-9]{8,}$/.test(input.customerId)) invalid("Stripe customer id is malformed.");
    form.set("customer", input.customerId);
  }
  setMetadata(form, input.authority.metadata);
  form.set("metadata[crays_allocation_plan_sha256]", input.authority.allocationPlanSha256);
  const provider = await postStripeTestForm({
    platformTestKey: input.platformTestKey,
    path: "/v1/payment_intents",
    connectedAccountId: input.authority.operatorConnectedAccountId,
    idempotencyKey: input.authority.idempotencyKey,
    form,
    options,
  });
  const paymentIntentId = stringField(provider.body, "id");
  const amountMinor = integerField(provider.body, "amount");
  const applicationFeeAmountMinor = integerField(provider.body, "application_fee_amount");
  const currency = stringField(provider.body, "currency");
  if (
    !paymentIntentId.startsWith("pi_") ||
    amountMinor !== input.authority.amountMinor ||
    applicationFeeAmountMinor !== input.authority.applicationFeeAmountMinor ||
    currency !== input.authority.currency.toLowerCase()
  ) {
    throw new StripeConnectProviderError("provider_protocol_error", "Stripe PaymentIntent echo mismatches the Clubs authority.", true, provider.requestId);
  }
  return Object.freeze({
    paymentIntentId,
    connectedAccountId: input.authority.operatorConnectedAccountId,
    state: mapClubsStripePaymentState(stringField(provider.body, "status")),
    amountMinor,
    applicationFeeAmountMinor,
    currency,
    clientSecret: typeof provider.body.client_secret === "string" ? provider.body.client_secret : null,
    livemode: false,
    providerRequestId: provider.requestId,
    providerResponseSha256: sha256(provider.rawBody),
  });
}

export async function createClubsStripeSandboxTransfer(input: Readonly<{
  platformTestKey: string;
  authority: ClubsStripeSandboxPaymentAuthority;
  beneficiaryKind: "ambassador" | "software" | "global_concept";
  idempotencyKey: string;
}>, options: ClubsStripeProviderOptions = {}): Promise<ClubsStripeTransferReceipt> {
  const line = input.authority.allocation.find((candidate) => candidate.beneficiaryKind === input.beneficiaryKind);
  if (!line || input.authority.livemode !== false) invalid("Clubs transfer authority is invalid.");
  const transferGroup = `cclub_${input.authority.paymentId}`;
  const form = new URLSearchParams({
    amount: String(line.amountMinor),
    currency: input.authority.currency.toLowerCase(),
    destination: line.destinationConnectedAccountId,
    transfer_group: transferGroup,
  });
  setMetadata(form, input.authority.metadata);
  form.set("metadata[crays_beneficiary_kind]", input.beneficiaryKind);
  form.set("metadata[crays_allocation_plan_sha256]", input.authority.allocationPlanSha256);
  const provider = await postStripeTestForm({
    platformTestKey: input.platformTestKey,
    path: "/v1/transfers",
    connectedAccountId: null,
    idempotencyKey: input.idempotencyKey,
    form,
    options,
  });
  const transferId = stringField(provider.body, "id");
  const destinationConnectedAccountId = stringField(provider.body, "destination");
  const amountMinor = integerField(provider.body, "amount");
  const currency = stringField(provider.body, "currency");
  const returnedGroup = stringField(provider.body, "transfer_group");
  if (
    !transferId.startsWith("tr_") || destinationConnectedAccountId !== line.destinationConnectedAccountId ||
    amountMinor !== line.amountMinor || currency !== input.authority.currency.toLowerCase() || returnedGroup !== transferGroup
  ) {
    throw new StripeConnectProviderError("provider_protocol_error", "Stripe Transfer echo mismatches the Clubs authority.", true, provider.requestId);
  }
  return Object.freeze({
    transferId,
    destinationConnectedAccountId,
    amountMinor,
    currency,
    transferGroup,
    livemode: false,
    providerRequestId: provider.requestId,
    providerResponseSha256: sha256(provider.rawBody),
  });
}

export async function createClubsStripeSandboxRefund(input: Readonly<{
  platformTestKey: string;
  authority: ClubsStripeSandboxPaymentAuthority;
  paymentIntentId: string;
  amountMinor: number;
  reason: "requested_by_customer" | "duplicate" | "fraudulent";
  idempotencyKey: string;
}>, options: ClubsStripeProviderOptions = {}): Promise<ClubsStripeRefundReceipt> {
  if (!/^pi_[A-Za-z0-9]{8,}$/.test(input.paymentIntentId)) invalid("Stripe PaymentIntent id is malformed.");
  assertAmount("refundAmountMinor", input.amountMinor);
  if (input.authority.livemode !== false || input.amountMinor > input.authority.amountMinor) invalid("Clubs refund authority is invalid.");
  const form = new URLSearchParams({
    payment_intent: input.paymentIntentId,
    amount: String(input.amountMinor),
    reason: input.reason,
  });
  setMetadata(form, input.authority.metadata);
  form.set("metadata[crays_allocation_plan_sha256]", input.authority.allocationPlanSha256);
  const provider = await postStripeTestForm({
    platformTestKey: input.platformTestKey,
    path: "/v1/refunds",
    connectedAccountId: input.authority.operatorConnectedAccountId,
    idempotencyKey: input.idempotencyKey,
    form,
    options,
  });
  const refundId = stringField(provider.body, "id");
  const paymentIntentId = stringField(provider.body, "payment_intent");
  const amountMinor = integerField(provider.body, "amount");
  const currency = stringField(provider.body, "currency");
  const status = stringField(provider.body, "status");
  const states = { pending: "PENDING", succeeded: "SUCCEEDED", failed: "FAILED", canceled: "CANCELED" } as const;
  const state = states[status as keyof typeof states];
  if (!refundId.startsWith("re_") || paymentIntentId !== input.paymentIntentId || amountMinor !== input.amountMinor || !state) {
    throw new StripeConnectProviderError("provider_protocol_error", "Stripe Refund echo mismatches the Clubs authority.", true, provider.requestId);
  }
  return Object.freeze({
    refundId,
    paymentIntentId,
    amountMinor,
    currency,
    state,
    livemode: false,
    providerRequestId: provider.requestId,
    providerResponseSha256: sha256(provider.rawBody),
  });
}

export function verifyClubsStripeSandboxWebhook(input: Readonly<{
  rawBody: string | Uint8Array;
  signatureHeader: string;
  webhookSecret: string;
  nowEpochSeconds?: number;
}>): VerifiedStripeConnectEvent {
  const event = verifyStripeConnectWebhook({
    ...input,
    expectedLivemode: false,
    toleranceSeconds: 300,
  });
  const metadata = event.object.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) invalid("Stripe event has no Clubs metadata.");
  const normalized = Object.fromEntries(Object.entries(metadata).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  assertClubsStripeSandboxMetadata(normalized);
  return event;
}
