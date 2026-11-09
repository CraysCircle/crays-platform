import "server-only";

import type { CommerceProviderRuntimeRegistry } from
  "./server-bound-vendure-adapter";
import type { HistoricalOrderProviderRuntimeRegistry } from
  "./server-bound-historical-order-snapshot-provider";

export type VendureAdminReadAction =
  | "catalog.read"
  | "order.read";

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type Operation = Readonly<{
  operationName: string;
  rootField: "products" | "productVariants" | "orders";
  query: string;
}>;

const operations: Readonly<Record<VendureAdminReadAction, Operation>> = {
  "catalog.read": {
    operationName: "CraysPartnerAdminCatalogRead",
    rootField: "products",
    query: `query CraysPartnerAdminCatalogRead {
      products(options: { take: 1 }) { totalItems }
    }`,
  },
  "order.read": {
    operationName: "CraysPartnerAdminOrderRead",
    rootField: "orders",
    query: `query CraysPartnerAdminOrderRead {
      orders(options: { take: 1 }) { totalItems }
    }`,
  },
};

const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;

export class VendureAdminReadProviderError extends Error {
  constructor(
    readonly outcome: "rejected" | "unknown",
    readonly code: string,
  ) {
    super(code);
    this.name = "VendureAdminReadProviderError";
  }
}

export function isVendureAdminReadProviderError(
  error: unknown,
): error is VendureAdminReadProviderError {
  if (!(error instanceof Error) ||
      error.name !== "VendureAdminReadProviderError") {
    return false;
  }
  const candidate = error as { outcome?: unknown; code?: unknown };
  return (candidate.outcome === "rejected" ||
      candidate.outcome === "unknown") &&
    typeof candidate.code === "string" &&
    candidate.code.length >= 3 &&
    error.message === candidate.code;
}

function exactAdminApiUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new VendureAdminReadProviderError(
      "rejected", "VENDURE_ADMIN_PROVIDER_URL_INVALID",
    );
  }
  const localHttp = url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (
    url.username || url.password || url.search || url.hash ||
    (url.protocol !== "https:" && !localHttp)
  ) {
    throw new VendureAdminReadProviderError(
      "rejected", "VENDURE_ADMIN_PROVIDER_URL_INVALID",
    );
  }
  return url.toString();
}

export type VendureAdminReadProviderResult = Readonly<{
  action: VendureAdminReadAction;
  providerOutcome: "ACKNOWLEDGED";
  itemCount: number;
}>;

export interface VendureAdminReadProvider {
  execute(input: Readonly<{
    action: VendureAdminReadAction;
    deploymentCellId: string;
    channelTokenSecretRef: string;
  }>): Promise<VendureAdminReadProviderResult>;
}

export class ServerBoundVendureAdminReadProvider
implements VendureAdminReadProvider {
  constructor(
    private readonly adminRegistry: HistoricalOrderProviderRuntimeRegistry,
    private readonly secretRegistry: Pick<
      CommerceProviderRuntimeRegistry, "secretValue"
    >,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async execute(input: Readonly<{
    action: VendureAdminReadAction;
    deploymentCellId: string;
    channelTokenSecretRef: string;
  }>): Promise<VendureAdminReadProviderResult> {
    if (
      !operations[input.action] ||
      !REFERENCE.test(input.deploymentCellId) ||
      !REFERENCE.test(input.channelTokenSecretRef)
    ) {
      throw new VendureAdminReadProviderError(
        "rejected", "VENDURE_ADMIN_PROVIDER_INPUT_INVALID",
      );
    }
    let adminApiUrl: string;
    let bearerToken: string;
    let channelToken: string;
    try {
      [adminApiUrl, bearerToken, channelToken] = await Promise.all([
        this.adminRegistry.vendureAdminApiUrlForDeploymentCell(
          input.deploymentCellId,
        ),
        this.adminRegistry.serviceBearerForDeploymentCell(
          input.deploymentCellId,
        ),
        this.secretRegistry.secretValue(input.channelTokenSecretRef),
      ]);
    } catch {
      throw new VendureAdminReadProviderError(
        "rejected", "VENDURE_ADMIN_PROVIDER_SCOPE_UNRESOLVED",
      );
    }
    if (bearerToken.trim().length < 32 || channelToken.trim().length < 8) {
      throw new VendureAdminReadProviderError(
        "rejected", "VENDURE_ADMIN_PROVIDER_CREDENTIAL_UNRESOLVED",
      );
    }
    const operation = operations[input.action];
    let response: Response;
    try {
      response = await this.fetchImpl(exactAdminApiUrl(adminApiUrl), {
        method: "POST",
        cache: "no-store",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${bearerToken.trim()}`,
          "content-type": "application/json",
          "vendure-token": channelToken.trim(),
        },
        body: JSON.stringify({
          operationName: operation.operationName,
          query: operation.query,
          variables: {},
        }),
        signal: AbortSignal.timeout(8_000),
      });
    } catch (error) {
      if (isVendureAdminReadProviderError(error)) throw error;
      throw new VendureAdminReadProviderError(
        "unknown", "VENDURE_ADMIN_PROVIDER_OUTCOME_UNKNOWN",
      );
    }
    if (!response.ok) {
      throw new VendureAdminReadProviderError(
        response.status >= 500 ? "unknown" : "rejected",
        `VENDURE_ADMIN_PROVIDER_HTTP_${response.status}`,
      );
    }
    let payload: unknown;
    try {
      payload = JSON.parse(await response.text());
    } catch {
      throw new VendureAdminReadProviderError(
        "unknown", "VENDURE_ADMIN_PROVIDER_RESPONSE_INVALID",
      );
    }
    const envelope = payload as {
      data?: Record<string, { totalItems?: unknown }>;
      errors?: unknown[];
    };
    const totalItems = envelope.data?.[operation.rootField]?.totalItems;
    if (
      !payload || typeof payload !== "object" || Array.isArray(payload) ||
      envelope.errors?.length || !Number.isSafeInteger(totalItems) ||
      Number(totalItems) < 0
    ) {
      throw new VendureAdminReadProviderError(
        "unknown", "VENDURE_ADMIN_PROVIDER_RESPONSE_INVALID",
      );
    }
    return Object.freeze({
      action: input.action,
      providerOutcome: "ACKNOWLEDGED" as const,
      itemCount: Number(totalItems),
    });
  }
}
