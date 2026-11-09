import "server-only";

import type { CommerceProviderRuntimeRegistry } from
  "./server-bound-vendure-adapter";
import type { HistoricalOrderProviderRuntimeRegistry } from
  "./server-bound-historical-order-snapshot-provider";
import type { PartnerOrderSnapshotProvider } from
  "./partner-vendure-admin-order-snapshot";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export class PartnerOrderSnapshotProviderError extends Error {
  constructor(
    readonly outcome: "not_found" | "rejected" | "unknown",
    readonly code: string,
  ) {
    super(code);
    this.name = "PartnerOrderSnapshotProviderError";
  }
}

function exactAdminUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new PartnerOrderSnapshotProviderError(
      "rejected", "PARTNER_ORDER_SNAPSHOT_PROVIDER_URL_INVALID",
    );
  }
  let url: URL;
  try { url = new URL(value); } catch {
    throw new PartnerOrderSnapshotProviderError(
      "rejected", "PARTNER_ORDER_SNAPSHOT_PROVIDER_URL_INVALID",
    );
  }
  const localHttp = url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (
    url.username || url.password || url.search || url.hash ||
    (url.protocol !== "https:" && !localHttp)
  ) {
    throw new PartnerOrderSnapshotProviderError(
      "rejected", "PARTNER_ORDER_SNAPSHOT_PROVIDER_URL_INVALID",
    );
  }
  return url.toString();
}

export class ServerBoundPartnerOrderSnapshotProvider
implements PartnerOrderSnapshotProvider {
  constructor(
    private readonly adminRegistry: HistoricalOrderProviderRuntimeRegistry,
    private readonly secretRegistry: Pick<
      CommerceProviderRuntimeRegistry, "secretValue"
    >,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async readExact(input: Parameters<PartnerOrderSnapshotProvider["readExact"]>[0]) {
    if (Object.values(input).some((value) => !ID.test(value))) {
      throw new PartnerOrderSnapshotProviderError(
        "rejected", "PARTNER_ORDER_SNAPSHOT_PROVIDER_INPUT_INVALID",
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
      throw new PartnerOrderSnapshotProviderError(
        "rejected", "PARTNER_ORDER_SNAPSHOT_PROVIDER_SCOPE_UNRESOLVED",
      );
    }
    if (bearerToken.trim().length < 32 || channelToken.trim().length < 8) {
      throw new PartnerOrderSnapshotProviderError(
        "rejected", "PARTNER_ORDER_SNAPSHOT_PROVIDER_CREDENTIAL_UNRESOLVED",
      );
    }
    let response: Response;
    try {
      response = await this.fetchImpl(exactAdminUrl(adminApiUrl), {
        method: "POST",
        cache: "no-store",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${bearerToken.trim()}`,
          "content-type": "application/json",
          "vendure-token": channelToken.trim(),
        },
        body: JSON.stringify({
          operationName: "CraysPartnerAdminOrderSnapshotRead",
          query: `query CraysPartnerAdminOrderSnapshotRead($orderCode: String!) {
            orders(options: {
              filter: { code: { eq: $orderCode } }, take: 2
            }) {
              totalItems
              items {
                id code
                channels { id seller { id } }
                customFields {
                  craysContextId craysPersonReferenceSha256 craysVerticalRoot
                  craysPartnerTenantId craysOperatorLegalEntityId craysStoreId
                  craysStoreOperatorAssignmentId craysOrderSellerSnapshotId
                  craysOrderSellerSnapshotSha256 craysDataClass
                }
              }
            }
          }`,
          variables: { orderCode: input.orderCode },
        }),
        signal: AbortSignal.timeout(8_000),
      });
    } catch (error) {
      if (error instanceof PartnerOrderSnapshotProviderError) throw error;
      throw new PartnerOrderSnapshotProviderError(
        "unknown", "PARTNER_ORDER_SNAPSHOT_PROVIDER_OUTCOME_UNKNOWN",
      );
    }
    if (!response.ok) {
      throw new PartnerOrderSnapshotProviderError(
        response.status >= 500 ? "unknown" : "rejected",
        `PARTNER_ORDER_SNAPSHOT_PROVIDER_HTTP_${response.status}`,
      );
    }
    let payload: unknown;
    try { payload = JSON.parse(await response.text()); } catch {
      throw new PartnerOrderSnapshotProviderError(
        "unknown", "PARTNER_ORDER_SNAPSHOT_PROVIDER_RESPONSE_INVALID",
      );
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new PartnerOrderSnapshotProviderError(
        "unknown", "PARTNER_ORDER_SNAPSHOT_PROVIDER_RESPONSE_INVALID",
      );
    }
    const envelope = payload as {
      data?: { orders?: { totalItems?: unknown; items?: unknown } };
      errors?: unknown;
    };
    if (
      envelope.errors !== undefined &&
      (!Array.isArray(envelope.errors) || envelope.errors.length > 0)
    ) {
      throw new PartnerOrderSnapshotProviderError(
        Array.isArray(envelope.errors) ? "rejected" : "unknown",
        "PARTNER_ORDER_SNAPSHOT_PROVIDER_QUERY_REJECTED",
      );
    }
    const orders = envelope.data?.orders;
    if (
      !orders || !Number.isSafeInteger(orders.totalItems) ||
      !Array.isArray(orders.items)
    ) {
      throw new PartnerOrderSnapshotProviderError(
        "unknown", "PARTNER_ORDER_SNAPSHOT_PROVIDER_RESPONSE_INVALID",
      );
    }
    if (orders.totalItems === 0 && orders.items.length === 0) {
      throw new PartnerOrderSnapshotProviderError(
        "not_found", "PARTNER_ORDER_SNAPSHOT_PROVIDER_NOT_FOUND",
      );
    }
    if (orders.totalItems !== 1 || orders.items.length !== 1) {
      throw new PartnerOrderSnapshotProviderError(
        "unknown", "PARTNER_ORDER_SNAPSHOT_PROVIDER_AMBIGUOUS",
      );
    }
    const item = orders.items[0] as Record<string, unknown>;
    if (
      !item || typeof item !== "object" || Array.isArray(item) ||
      Object.keys(item).sort().join("|") !==
        "channels|code|customFields|id" ||
      !Array.isArray(item.channels)
    ) {
      throw new PartnerOrderSnapshotProviderError(
        "unknown", "PARTNER_ORDER_SNAPSHOT_PROVIDER_RESPONSE_INVALID",
      );
    }
    const channels = item.channels.map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new PartnerOrderSnapshotProviderError(
          "unknown", "PARTNER_ORDER_SNAPSHOT_PROVIDER_RESPONSE_INVALID",
        );
      }
      const channel = entry as Record<string, unknown>;
      const seller = channel.seller as Record<string, unknown> | null;
      if (
        Object.keys(channel).sort().join("|") !== "id|seller" ||
        !seller || typeof seller !== "object" || Array.isArray(seller) ||
        Object.keys(seller).join("|") !== "id" ||
        !ID.test(String(channel.id)) || !ID.test(String(seller.id))
      ) {
        throw new PartnerOrderSnapshotProviderError(
          "unknown", "PARTNER_ORDER_SNAPSHOT_PROVIDER_RESPONSE_INVALID",
        );
      }
      return Object.freeze({
        channelId: String(channel.id),
        sellerId: String(seller.id),
      });
    });
    return Object.freeze({
      providerOrderId: item.id,
      orderCode: item.code,
      channels: Object.freeze(channels),
      customFields: item.customFields,
    });
  }
}
