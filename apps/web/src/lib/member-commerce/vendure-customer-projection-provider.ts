import "server-only";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const VENDURE_PROVIDER_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const HASH = /^[a-f0-9]{64}$/;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class CustomerProjectionProviderError extends Error {
  constructor(readonly outcome: "rejected" | "unknown", readonly code: string) {
    super(code);
    this.name = "CustomerProjectionProviderError";
  }
}

export type CustomerProjectionProviderReceipt = Readonly<{
  actionReceiptId: string;
  vendureCustomerId: string;
  vendureUserId: string;
  externalIdentifierSha256: string;
  emailSnapshotSha256: string;
  providerVersion: string;
  state: "APPLIED";
}>;

function exactUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch {
    throw new CustomerProjectionProviderError("rejected", "CUSTOMER_PROJECTION_PROVIDER_URL_INVALID");
  }
  const localHttp = url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== "https:" && !localHttp)) {
    throw new CustomerProjectionProviderError("rejected", "CUSTOMER_PROJECTION_PROVIDER_URL_INVALID");
  }
  return url.toString();
}

export class VendureCustomerProjectionProvider {
  private readonly adminApiUrl: string;
  private readonly bearerToken: string;
  private readonly channelToken: string;
  private readonly timeoutMs: number;

  constructor(config: Readonly<{
    adminApiUrl: string;
    bearerToken: string;
    channelToken: string;
    timeoutMs?: number;
  }>, private readonly fetchImpl: FetchLike = fetch) {
    if (config.bearerToken.trim().length < 32 || config.channelToken.trim().length < 8) {
      throw new CustomerProjectionProviderError(
        "rejected", "CUSTOMER_PROJECTION_PROVIDER_CREDENTIAL_INVALID",
      );
    }
    this.adminApiUrl = exactUrl(config.adminApiUrl);
    this.bearerToken = config.bearerToken.trim();
    this.channelToken = config.channelToken.trim();
    this.timeoutMs = Math.min(Math.max(config.timeoutMs ?? 8_000, 250), 30_000);
  }

  async ensureProjection(input: Readonly<{
    idempotencyKey: string;
    bindingId: string;
    bindingVersion: number;
    deploymentCellId: string;
    vendureChannelId: string;
    verticalRoot: "coffee" | "retail" | "gym" | "clubs";
    externalAuthStrategy: string;
    externalIdentifier: string;
    emailAddress: string;
    firstName: string;
    lastName: string;
    profileSha256: string;
    sourceVersion: string;
  }>): Promise<CustomerProjectionProviderReceipt> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.adminApiUrl, {
        method: "POST", cache: "no-store",
        headers: {
          accept: "application/json", "content-type": "application/json",
          authorization: `Bearer ${this.bearerToken}`,
          "vendure-token": this.channelToken,
        },
        body: JSON.stringify({
          query: `mutation CraysEnsureCustomerProjection($input: CraysEnsureCustomerProjectionInput!) {
            craysEnsureCustomerProjection(input: $input) {
              providerAcknowledgementId vendureCustomerId vendureUserId
              externalIdentifierSha256 emailSnapshotSha256 providerVersion state
            }
          }`,
          variables: { input: {
            customerBindingIntentId: input.idempotencyKey,
            bindingId: input.bindingId, bindingVersion: input.bindingVersion,
            deploymentCellId: input.deploymentCellId,
            vendureChannelId: input.vendureChannelId, verticalRoot: input.verticalRoot,
            externalAuthStrategy: input.externalAuthStrategy,
            externalIdentifier: input.externalIdentifier,
            emailAddress: input.emailAddress, firstName: input.firstName,
            lastName: input.lastName, emailVerified: true,
            profileSha256: input.profileSha256, sourceVersion: input.sourceVersion,
          } },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new CustomerProjectionProviderError(
        "unknown", "CUSTOMER_PROJECTION_PROVIDER_OUTCOME_UNKNOWN",
      );
    }
    if (!response.ok) {
      throw new CustomerProjectionProviderError(
        response.status >= 500 ? "unknown" : "rejected",
        `CUSTOMER_PROJECTION_PROVIDER_HTTP_${response.status}`,
      );
    }
    let payload: unknown;
    try { payload = JSON.parse(await response.text()); } catch {
      throw new CustomerProjectionProviderError(
        "unknown", "CUSTOMER_PROJECTION_PROVIDER_RESPONSE_INVALID",
      );
    }
    const envelope = payload as {
      data?: { craysEnsureCustomerProjection?: Record<string, unknown> };
      errors?: unknown[];
    };
    if (envelope.errors?.length) {
      throw new CustomerProjectionProviderError(
        "rejected", "CUSTOMER_PROJECTION_PROVIDER_MUTATION_REJECTED",
      );
    }
    const value = envelope.data?.craysEnsureCustomerProjection;
    if (!value || value.state !== "APPLIED" ||
      !ID.test(String(value.providerAcknowledgementId ?? "")) ||
      !VENDURE_PROVIDER_ID.test(String(value.vendureCustomerId ?? "")) ||
      !VENDURE_PROVIDER_ID.test(String(value.vendureUserId ?? "")) ||
      !HASH.test(String(value.externalIdentifierSha256 ?? "")) ||
      !HASH.test(String(value.emailSnapshotSha256 ?? "")) ||
      !ID.test(String(value.providerVersion ?? ""))) {
      throw new CustomerProjectionProviderError(
        "unknown", "CUSTOMER_PROJECTION_PROVIDER_RESPONSE_INVALID",
      );
    }
    return Object.freeze({
      actionReceiptId: String(value.providerAcknowledgementId),
      vendureCustomerId: String(value.vendureCustomerId),
      vendureUserId: String(value.vendureUserId),
      externalIdentifierSha256: String(value.externalIdentifierSha256),
      emailSnapshotSha256: String(value.emailSnapshotSha256),
      providerVersion: String(value.providerVersion), state: "APPLIED" as const,
    });
  }

  async disableProjection(input: Readonly<{
    idempotencyKey: string; bindingId: string; bindingVersion: number;
    deploymentCellId: string; vendureChannelId: string;
    verticalRoot: "coffee" | "retail" | "gym" | "clubs";
    externalAuthStrategy: string; externalIdentifier: string;
    projectionId: string; expectedProjectionVersion: number;
  }>): Promise<Readonly<{
    actionReceiptId: string; vendureCustomerId: string; vendureUserId: string;
    providerVersion: string; state: "APPLIED";
  }>> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.adminApiUrl, {
        method: "POST", cache: "no-store",
        headers: { accept: "application/json", "content-type": "application/json",
          authorization: `Bearer ${this.bearerToken}`, "vendure-token": this.channelToken },
        body: JSON.stringify({
          query: `mutation CraysDisableCustomerProjection($input: CraysDisableCustomerProjectionInput!) {
            craysDisableCustomerProjection(input: $input) {
              providerAcknowledgementId vendureCustomerId vendureUserId providerVersion state
            }
          }`,
          variables: { input: {
            customerBindingIntentId: input.idempotencyKey,
            bindingId: input.bindingId, bindingVersion: input.bindingVersion,
            deploymentCellId: input.deploymentCellId,
            vendureChannelId: input.vendureChannelId, verticalRoot: input.verticalRoot,
            externalAuthStrategy: input.externalAuthStrategy,
            externalIdentifier: input.externalIdentifier,
            vendureCustomerBindingId: input.projectionId,
            expectedBindingVersion: input.expectedProjectionVersion,
          } },
        }), signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new CustomerProjectionProviderError("unknown", "CUSTOMER_PROJECTION_PROVIDER_OUTCOME_UNKNOWN");
    }
    if (!response.ok) throw new CustomerProjectionProviderError(
      response.status >= 500 ? "unknown" : "rejected",
      `CUSTOMER_PROJECTION_PROVIDER_HTTP_${response.status}`,
    );
    let payload: unknown;
    try { payload = JSON.parse(await response.text()); } catch {
      throw new CustomerProjectionProviderError("unknown", "CUSTOMER_PROJECTION_PROVIDER_RESPONSE_INVALID");
    }
    const envelope = payload as { data?: { craysDisableCustomerProjection?: Record<string, unknown> };
      errors?: unknown[] };
    if (envelope.errors?.length) throw new CustomerProjectionProviderError(
      "rejected", "CUSTOMER_PROJECTION_PROVIDER_MUTATION_REJECTED",
    );
    const value = envelope.data?.craysDisableCustomerProjection;
    if (!value || value.state !== "APPLIED" ||
        !ID.test(String(value.providerAcknowledgementId ?? "")) ||
        !VENDURE_PROVIDER_ID.test(String(value.vendureCustomerId ?? "")) ||
        !VENDURE_PROVIDER_ID.test(String(value.vendureUserId ?? "")) ||
        !ID.test(String(value.providerVersion ?? ""))) {
      throw new CustomerProjectionProviderError("unknown", "CUSTOMER_PROJECTION_PROVIDER_RESPONSE_INVALID");
    }
    return Object.freeze({ actionReceiptId: String(value.providerAcknowledgementId),
      vendureCustomerId: String(value.vendureCustomerId),
      vendureUserId: String(value.vendureUserId),
      providerVersion: String(value.providerVersion), state: "APPLIED" as const });
  }

  async updateProjectionEmail(input: Readonly<{
    idempotencyKey: string; bindingId: string; bindingVersion: number;
    deploymentCellId: string; vendureChannelId: string;
    verticalRoot: "coffee" | "retail" | "gym" | "clubs";
    externalAuthStrategy: string; externalIdentifier: string;
    projectionId: string; expectedProjectionVersion: number;
    vendureCustomerId: string; vendureUserId: string;
    emailAddress: string; sourceVersion: string;
  }>): Promise<CustomerProjectionProviderReceipt> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.adminApiUrl, {
        method: "POST", cache: "no-store",
        headers: { accept: "application/json", "content-type": "application/json",
          authorization: `Bearer ${this.bearerToken}`, "vendure-token": this.channelToken },
        body: JSON.stringify({ query:
          `mutation CraysUpdateCustomerProjectionEmail($input: CraysUpdateCustomerProjectionEmailInput!) {
            craysUpdateCustomerProjectionEmail(input: $input) {
              providerAcknowledgementId vendureCustomerId vendureUserId
              externalIdentifierSha256 emailSnapshotSha256 providerVersion state
            }
          }`, variables: { input: {
            customerBindingIntentId: input.idempotencyKey,
            bindingId: input.bindingId, bindingVersion: input.bindingVersion,
            deploymentCellId: input.deploymentCellId,
            vendureChannelId: input.vendureChannelId, verticalRoot: input.verticalRoot,
            externalAuthStrategy: input.externalAuthStrategy,
            externalIdentifier: input.externalIdentifier,
            vendureCustomerBindingId: input.projectionId,
            expectedBindingVersion: input.expectedProjectionVersion,
            vendureCustomerId: input.vendureCustomerId,
            vendureUserId: input.vendureUserId,
            emailAddress: input.emailAddress, emailVerified: true,
            sourceVersion: input.sourceVersion,
          } } }), signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch { throw new CustomerProjectionProviderError(
      "unknown", "CUSTOMER_PROJECTION_PROVIDER_OUTCOME_UNKNOWN"); }
    if (!response.ok) throw new CustomerProjectionProviderError(
      response.status >= 500 ? "unknown" : "rejected",
      `CUSTOMER_PROJECTION_PROVIDER_HTTP_${response.status}`);
    let payload: unknown;
    try { payload = JSON.parse(await response.text()); } catch {
      throw new CustomerProjectionProviderError("unknown", "CUSTOMER_PROJECTION_PROVIDER_RESPONSE_INVALID");
    }
    const envelope = payload as { data?: {
      craysUpdateCustomerProjectionEmail?: Record<string, unknown> }; errors?: unknown[] };
    if (envelope.errors?.length) throw new CustomerProjectionProviderError(
      "rejected", "CUSTOMER_PROJECTION_PROVIDER_MUTATION_REJECTED");
    const value = envelope.data?.craysUpdateCustomerProjectionEmail;
    if (!value || value.state !== "APPLIED" ||
        !ID.test(String(value.providerAcknowledgementId ?? "")) ||
        !VENDURE_PROVIDER_ID.test(String(value.vendureCustomerId ?? "")) ||
        !VENDURE_PROVIDER_ID.test(String(value.vendureUserId ?? "")) ||
        !HASH.test(String(value.externalIdentifierSha256 ?? "")) ||
        !HASH.test(String(value.emailSnapshotSha256 ?? "")) ||
        !ID.test(String(value.providerVersion ?? ""))) {
      throw new CustomerProjectionProviderError("unknown", "CUSTOMER_PROJECTION_PROVIDER_RESPONSE_INVALID");
    }
    return Object.freeze({ actionReceiptId: String(value.providerAcknowledgementId),
      vendureCustomerId: String(value.vendureCustomerId),
      vendureUserId: String(value.vendureUserId),
      externalIdentifierSha256: String(value.externalIdentifierSha256),
      emailSnapshotSha256: String(value.emailSnapshotSha256),
      providerVersion: String(value.providerVersion), state: "APPLIED" as const });
  }

  async reenableProjection(input: Readonly<{
    idempotencyKey: string; bindingId: string; bindingVersion: number;
    deploymentCellId: string; vendureChannelId: string;
    verticalRoot: "coffee" | "retail" | "gym" | "clubs";
    projectionId: string; expectedProjectionVersion: number;
    vendureCustomerId: string; vendureUserId: string;
  }>) {
    let response: Response;
    try {
      response = await this.fetchImpl(this.adminApiUrl, {
        method: "POST", cache: "no-store",
        headers: { accept: "application/json", "content-type": "application/json",
          authorization: `Bearer ${this.bearerToken}`, "vendure-token": this.channelToken },
        body: JSON.stringify({ query:
          `mutation CraysReenableCustomerProjection($input: CraysReenableCustomerProjectionInput!) {
            craysReenableCustomerProjection(input: $input) {
              providerAcknowledgementId vendureCustomerId vendureUserId providerVersion state
            }
          }`, variables: { input: {
            customerBindingIntentId: input.idempotencyKey,
            bindingId: input.bindingId, bindingVersion: input.bindingVersion,
            deploymentCellId: input.deploymentCellId,
            vendureChannelId: input.vendureChannelId, verticalRoot: input.verticalRoot,
            vendureCustomerBindingId: input.projectionId,
            expectedBindingVersion: input.expectedProjectionVersion,
            vendureCustomerId: input.vendureCustomerId, vendureUserId: input.vendureUserId,
          } } }), signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch { throw new CustomerProjectionProviderError(
      "unknown", "CUSTOMER_PROJECTION_PROVIDER_OUTCOME_UNKNOWN"); }
    if (!response.ok) throw new CustomerProjectionProviderError(
      response.status >= 500 ? "unknown" : "rejected",
      `CUSTOMER_PROJECTION_PROVIDER_HTTP_${response.status}`);
    let payload: unknown;
    try { payload = JSON.parse(await response.text()); } catch {
      throw new CustomerProjectionProviderError("unknown", "CUSTOMER_PROJECTION_PROVIDER_RESPONSE_INVALID");
    }
    const envelope = payload as { data?: { craysReenableCustomerProjection?: Record<string, unknown> };
      errors?: unknown[] };
    if (envelope.errors?.length) throw new CustomerProjectionProviderError(
      "rejected", "CUSTOMER_PROJECTION_PROVIDER_MUTATION_REJECTED");
    const value = envelope.data?.craysReenableCustomerProjection;
    if (!value || value.state !== "APPLIED" ||
        !ID.test(String(value.providerAcknowledgementId ?? "")) ||
        !VENDURE_PROVIDER_ID.test(String(value.vendureCustomerId ?? "")) ||
        !VENDURE_PROVIDER_ID.test(String(value.vendureUserId ?? "")) ||
        !ID.test(String(value.providerVersion ?? ""))) {
      throw new CustomerProjectionProviderError("unknown", "CUSTOMER_PROJECTION_PROVIDER_RESPONSE_INVALID");
    }
    return Object.freeze({ actionReceiptId: String(value.providerAcknowledgementId),
      vendureCustomerId: String(value.vendureCustomerId),
      vendureUserId: String(value.vendureUserId),
      providerVersion: String(value.providerVersion), state: "APPLIED" as const });
  }
}
