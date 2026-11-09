import "server-only";

import type { HistoricalOrderSnapshotProvider } from
  "./historical-order-snapshot-recovery";

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type VendureHistoricalOrderSnapshotProviderConfig = Readonly<{
  adminApiUrl: string;
  bearerToken: string;
  channelToken: string;
  timeoutMs?: number;
}>;

export class HistoricalOrderSnapshotProviderError extends Error {
  constructor(readonly outcome: "rejected" | "unknown", readonly code: string) {
    super(code);
    this.name = "HistoricalOrderSnapshotProviderError";
  }
}

export function isHistoricalOrderSnapshotProviderError(
  error: unknown,
  expectedOutcome?: "rejected" | "unknown",
): error is HistoricalOrderSnapshotProviderError {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as Record<string, unknown>;
  const outcome = candidate.outcome;
  const code = candidate.code;
  return candidate.name === "HistoricalOrderSnapshotProviderError" &&
    (outcome === "rejected" || outcome === "unknown") &&
    (expectedOutcome === undefined || outcome === expectedOutcome) &&
    typeof code === "string" &&
    /^[A-Z][A-Z0-9_]{2,199}$/.test(code) &&
    candidate.message === code;
}

const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;

function exactUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new HistoricalOrderSnapshotProviderError(
      "rejected", "HISTORICAL_ORDER_PROVIDER_URL_INVALID",
    );
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HistoricalOrderSnapshotProviderError(
      "rejected", "HISTORICAL_ORDER_PROVIDER_URL_INVALID",
    );
  }
  const localHttp = url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (
    url.username || url.password || url.search || url.hash ||
    (url.protocol !== "https:" && !localHttp)
  ) {
    throw new HistoricalOrderSnapshotProviderError(
      "rejected", "HISTORICAL_ORDER_PROVIDER_URL_INVALID",
    );
  }
  return url.toString();
}

export class VendureHistoricalOrderSnapshotProvider
implements HistoricalOrderSnapshotProvider {
  private readonly config: Required<VendureHistoricalOrderSnapshotProviderConfig>;

  constructor(config: VendureHistoricalOrderSnapshotProviderConfig,
    private readonly fetchImpl: FetchLike = fetch) {
    if (
      typeof config.bearerToken !== "string" ||
      typeof config.channelToken !== "string" ||
      config.bearerToken.trim().length < 32 ||
      config.channelToken.trim().length < 8
    ) {
      throw new HistoricalOrderSnapshotProviderError(
        "rejected", "HISTORICAL_ORDER_PROVIDER_CREDENTIAL_INVALID",
      );
    }
    const timeoutMs = config.timeoutMs ?? 8_000;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
      throw new HistoricalOrderSnapshotProviderError(
        "rejected", "HISTORICAL_ORDER_PROVIDER_TIMEOUT_INVALID",
      );
    }
    this.config = {
      adminApiUrl: exactUrl(config.adminApiUrl),
      bearerToken: config.bearerToken.trim(),
      channelToken: config.channelToken.trim(),
      timeoutMs: Math.min(Math.max(timeoutMs, 250), 30_000),
    };
  }

  async readExactReceipt(input: Readonly<{
    deploymentCellId: string;
    vendureChannelId: string;
    channelTokenSecretRef: string;
    vendureCustomerId: string;
    vendureUserId: string;
    orderCode: string;
  }>): Promise<unknown> {
    if (Object.values(input).some(
      (value) => typeof value !== "string" || !REFERENCE.test(value),
    )) {
      throw new HistoricalOrderSnapshotProviderError(
        "rejected", "HISTORICAL_ORDER_PROVIDER_INPUT_INVALID",
      );
    }
    let response: Response;
    try {
      response = await this.fetchImpl(this.config.adminApiUrl, {
        method: "POST",
        cache: "no-store",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: `Bearer ${this.config.bearerToken}`,
          "vendure-token": this.config.channelToken,
        },
        body: JSON.stringify({
          query: `query CraysHistoricalOrderSellerSnapshotReceipt(
            $input: CraysHistoricalOrderSellerSnapshotReceiptInput!
          ) {
            craysHistoricalOrderSellerSnapshotReceipt(input: $input) {
              version deploymentCellId verticalRoot partnerTenantId
              operatorLegalEntityId storeId vendureCustomerId vendureUserId
              orderCode providerOrderId snapshotId snapshotSha256 commandId
              commandState eventId eventType
            }
          }`,
          variables: { input: {
            deploymentCellId: input.deploymentCellId,
            vendureChannelId: input.vendureChannelId,
            vendureCustomerId: input.vendureCustomerId,
            vendureUserId: input.vendureUserId,
            orderCode: input.orderCode,
          } },
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch {
      throw new HistoricalOrderSnapshotProviderError(
        "unknown", "HISTORICAL_ORDER_PROVIDER_OUTCOME_UNKNOWN",
      );
    }
    if (!response.ok) {
      throw new HistoricalOrderSnapshotProviderError(
        response.status >= 500 ? "unknown" : "rejected",
        `HISTORICAL_ORDER_PROVIDER_HTTP_${response.status}`,
      );
    }
    let payload: unknown;
    try {
      payload = JSON.parse(await response.text());
    } catch {
      throw new HistoricalOrderSnapshotProviderError(
        "unknown", "HISTORICAL_ORDER_PROVIDER_RESPONSE_INVALID",
      );
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new HistoricalOrderSnapshotProviderError(
        "unknown", "HISTORICAL_ORDER_PROVIDER_RESPONSE_INVALID",
      );
    }
    const envelope = payload as {
      data?: { craysHistoricalOrderSellerSnapshotReceipt?: unknown };
      errors?: unknown[];
    };
    if (envelope.errors !== undefined && !Array.isArray(envelope.errors)) {
      throw new HistoricalOrderSnapshotProviderError(
        "unknown", "HISTORICAL_ORDER_PROVIDER_RESPONSE_INVALID",
      );
    }
    if (envelope.errors && envelope.errors.length > 0) {
      throw new HistoricalOrderSnapshotProviderError(
        "rejected", "HISTORICAL_ORDER_PROVIDER_QUERY_REJECTED",
      );
    }
    if (!envelope.data || typeof envelope.data !== "object" || Array.isArray(envelope.data)) {
      throw new HistoricalOrderSnapshotProviderError(
        "unknown", "HISTORICAL_ORDER_PROVIDER_RESPONSE_INVALID",
      );
    }
    const receipt = envelope.data.craysHistoricalOrderSellerSnapshotReceipt;
    if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
      throw new HistoricalOrderSnapshotProviderError(
        "unknown", "HISTORICAL_ORDER_PROVIDER_RESPONSE_INVALID",
      );
    }
    return receipt;
  }
}
