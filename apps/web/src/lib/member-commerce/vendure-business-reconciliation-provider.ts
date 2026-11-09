import "server-only";

import type { CommerceProviderRuntimeRegistry } from
  "./server-bound-vendure-adapter";
import type { HistoricalOrderProviderRuntimeRegistry } from
  "./server-bound-historical-order-snapshot-provider";

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const HASH = /^[a-f0-9]{64}$/;
const DELIVERY_STATES = [
  "PENDING", "ACKNOWLEDGED", "QUARANTINED", "UNKNOWN", "RECONCILED",
] as const;
const BUSINESS_STATES = [
  "PROVIDER_DELIVERY_PENDING",
  "PENDING_RECONCILIATION",
  "OUTCOME_UNKNOWN",
  "ACTION_REQUIRED",
  "RECONCILIATION_CONFLICT",
  "RECONCILED",
] as const;
const ATTENTION_STATES = [
  "UNACKNOWLEDGED", "ACKNOWLEDGED", "ESCALATED", "RESOLVED",
] as const;

type DeliveryState = (typeof DELIVERY_STATES)[number];
type BusinessState = (typeof BUSINESS_STATES)[number];
type AttentionState = (typeof ATTENTION_STATES)[number];

export type VendureBusinessReconciliationItem = Readonly<{
  eventReference: string;
  eventType: string;
  aggregateType: string;
  aggregateReference: string;
  deliveryState: DeliveryState;
  attemptCount: number;
  businessState: BusinessState;
  businessComplete: boolean;
  providerAcknowledgement: null | Readonly<{
    receiptSha256: string;
    receivedAt: string;
  }>;
  latestObservation: null | Readonly<{
    providerState: "OBSERVED" | "NOT_FOUND" | "UNKNOWN" |
      "LEGACY_UNSPECIFIED";
    reconciliationState: "MATCHED" | "MISSING" | "MISMATCH" | "UNKNOWN";
    receiptSha256: string;
    observedAt: string;
  }>;
  attention: null | Readonly<{
    ownerRole: "PARTNER_ACCOUNTANT" | "ERP_INTEGRATION_OPERATOR";
    state: AttentionState;
    requiredInformation: string;
    slaSeconds: number;
    dueAt: string;
    expiresAt: string;
    escalationAt: string;
    escalationOwnerRole: "PARTNER_FINANCE_MANAGER" | "ERP_PLATFORM_OWNER";
    nextSafeAction: string;
  }>;
}>;

export class VendureBusinessReconciliationProviderError extends Error {
  constructor(
    readonly outcome: "rejected" | "unknown",
    readonly code: string,
  ) {
    super(code);
    this.name = "VendureBusinessReconciliationProviderError";
  }
}

function exactAdminApiUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new VendureBusinessReconciliationProviderError(
      "rejected", "VENDURE_RECONCILIATION_PROVIDER_URL_INVALID",
    );
  }
  const localHttp = url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (
    url.username || url.password || url.search || url.hash ||
    (url.protocol !== "https:" && !localHttp)
  ) {
    throw new VendureBusinessReconciliationProviderError(
      "rejected", "VENDURE_RECONCILIATION_PROVIDER_URL_INVALID",
    );
  }
  return url.toString();
}

function exactDate(value: unknown): string {
  if (typeof value !== "string") {
    throw new VendureBusinessReconciliationProviderError(
      "unknown", "VENDURE_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
    );
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new VendureBusinessReconciliationProviderError(
      "unknown", "VENDURE_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
    );
  }
  return date.toISOString();
}

function exactReference(value: unknown): string {
  if (typeof value !== "string" || !REFERENCE.test(value)) {
    throw new VendureBusinessReconciliationProviderError(
      "unknown", "VENDURE_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
    );
  }
  return value;
}

function exactText(value: unknown): string {
  if (
    typeof value !== "string" || value.trim() !== value ||
    value.length < 1 || value.length > 200
  ) {
    throw new VendureBusinessReconciliationProviderError(
      "unknown", "VENDURE_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
    );
  }
  return value;
}

function exactHash(value: unknown): string {
  if (typeof value !== "string" || !HASH.test(value)) {
    throw new VendureBusinessReconciliationProviderError(
      "unknown", "VENDURE_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
    );
  }
  return value;
}

function exactEnum<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): T[number] {
  if (
    typeof value !== "string" ||
    !allowed.includes(value as T[number])
  ) {
    throw new VendureBusinessReconciliationProviderError(
      "unknown", "VENDURE_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
    );
  }
  return value as T[number];
}

function exactItem(value: unknown): VendureBusinessReconciliationItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new VendureBusinessReconciliationProviderError(
      "unknown", "VENDURE_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
    );
  }
  const item = value as Record<string, unknown>;
  const deliveryState = exactEnum(item.deliveryState, DELIVERY_STATES);
  const businessState = exactEnum(item.businessState, BUSINESS_STATES);
  if (
    typeof item.businessComplete !== "boolean" ||
    item.businessComplete !== (businessState === "RECONCILED") ||
    (item.businessComplete && deliveryState !== "RECONCILED") ||
    !Number.isSafeInteger(item.attemptCount) || Number(item.attemptCount) < 0
  ) {
    throw new VendureBusinessReconciliationProviderError(
      "unknown", "VENDURE_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
    );
  }
  const acknowledgement = item.providerAcknowledgement;
  const observation = item.latestObservation;
  const attention = item.attention;
  const parsedAcknowledgement = acknowledgement === null
    ? null
    : (() => {
      if (
        !acknowledgement || typeof acknowledgement !== "object" ||
        Array.isArray(acknowledgement)
      ) {
        throw new VendureBusinessReconciliationProviderError(
          "unknown", "VENDURE_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
        );
      }
      const record = acknowledgement as Record<string, unknown>;
      return Object.freeze({
        receiptSha256: exactHash(record.receiptSha256),
        receivedAt: exactDate(record.receivedAt),
      });
    })();
  const parsedObservation = observation === null
    ? null
    : (() => {
      if (!observation || typeof observation !== "object" || Array.isArray(observation)) {
        throw new VendureBusinessReconciliationProviderError(
          "unknown", "VENDURE_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
        );
      }
      const record = observation as Record<string, unknown>;
      return Object.freeze({
        providerState: exactEnum(record.providerState, [
          "OBSERVED", "NOT_FOUND", "UNKNOWN", "LEGACY_UNSPECIFIED",
        ] as const),
        reconciliationState: exactEnum(record.reconciliationState, [
          "MATCHED", "MISSING", "MISMATCH", "UNKNOWN",
        ] as const),
        receiptSha256: exactHash(record.receiptSha256),
        observedAt: exactDate(record.observedAt),
      });
    })();
  const parsedAttention = attention === null
    ? null
    : (() => {
      if (!attention || typeof attention !== "object" || Array.isArray(attention)) {
        throw new VendureBusinessReconciliationProviderError(
          "unknown", "VENDURE_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
        );
      }
      const record = attention as Record<string, unknown>;
      if (
        !Number.isSafeInteger(record.slaSeconds) ||
        Number(record.slaSeconds) < 1
      ) {
        throw new VendureBusinessReconciliationProviderError(
          "unknown", "VENDURE_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
        );
      }
      return Object.freeze({
        ownerRole: exactEnum(record.ownerRole, [
          "PARTNER_ACCOUNTANT", "ERP_INTEGRATION_OPERATOR",
        ] as const),
        state: exactEnum(record.state, ATTENTION_STATES),
        requiredInformation: exactText(record.requiredInformation),
        slaSeconds: Number(record.slaSeconds),
        dueAt: exactDate(record.dueAt),
        expiresAt: exactDate(record.expiresAt),
        escalationAt: exactDate(record.escalationAt),
        escalationOwnerRole: exactEnum(record.escalationOwnerRole, [
          "PARTNER_FINANCE_MANAGER", "ERP_PLATFORM_OWNER",
        ] as const),
        nextSafeAction: exactText(record.nextSafeAction),
      });
    })();
  if (
    item.businessComplete &&
    (!parsedObservation ||
      parsedObservation.providerState !== "OBSERVED" ||
      parsedObservation.reconciliationState !== "MATCHED" ||
      (parsedAttention !== null && parsedAttention.state !== "RESOLVED"))
  ) {
    throw new VendureBusinessReconciliationProviderError(
      "unknown", "VENDURE_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
    );
  }
  return Object.freeze({
    eventReference: exactReference(item.eventReference),
    eventType: exactText(item.eventType),
    aggregateType: exactText(item.aggregateType),
    aggregateReference: exactReference(item.aggregateReference),
    deliveryState,
    attemptCount: Number(item.attemptCount),
    businessState,
    businessComplete: item.businessComplete,
    providerAcknowledgement: parsedAcknowledgement,
    latestObservation: parsedObservation,
    attention: parsedAttention,
  });
}

const operation = Object.freeze({
  operationName: "CraysPartnerBusinessReconciliationRead",
  query: `query CraysPartnerBusinessReconciliationRead($take: Int!) {
    activeChannel { id }
    craysCommerceBusinessReconciliations(take: $take) {
      eventReference eventType aggregateType aggregateReference
      deliveryState attemptCount businessState businessComplete
      providerAcknowledgement { receiptSha256 receivedAt }
      latestObservation {
        providerState reconciliationState receiptSha256 observedAt
      }
      attention {
        ownerRole state requiredInformation slaSeconds dueAt expiresAt
        escalationAt escalationOwnerRole nextSafeAction
      }
    }
  }`,
});

export class ServerBoundVendureBusinessReconciliationProvider {
  constructor(
    private readonly adminRegistry: HistoricalOrderProviderRuntimeRegistry,
    private readonly secretRegistry: Pick<
      CommerceProviderRuntimeRegistry, "secretValue"
    >,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async read(input: Readonly<{
    deploymentCellId: string;
    channelTokenSecretRef: string;
    expectedChannelId: string;
    take: number;
  }>): Promise<readonly VendureBusinessReconciliationItem[]> {
    if (
      !REFERENCE.test(input.deploymentCellId) ||
      !REFERENCE.test(input.channelTokenSecretRef) ||
      !REFERENCE.test(input.expectedChannelId) ||
      !Number.isSafeInteger(input.take) || input.take < 1 || input.take > 50
    ) {
      throw new VendureBusinessReconciliationProviderError(
        "rejected", "VENDURE_RECONCILIATION_PROVIDER_INPUT_INVALID",
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
      throw new VendureBusinessReconciliationProviderError(
        "rejected", "VENDURE_RECONCILIATION_PROVIDER_SCOPE_UNRESOLVED",
      );
    }
    if (bearerToken.trim().length < 32 || channelToken.trim().length < 8) {
      throw new VendureBusinessReconciliationProviderError(
        "rejected", "VENDURE_RECONCILIATION_PROVIDER_CREDENTIAL_UNRESOLVED",
      );
    }
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
          variables: { take: input.take },
        }),
        signal: AbortSignal.timeout(8_000),
      });
    } catch (error) {
      if (error instanceof VendureBusinessReconciliationProviderError) {
        throw error;
      }
      throw new VendureBusinessReconciliationProviderError(
        "unknown", "VENDURE_RECONCILIATION_PROVIDER_OUTCOME_UNKNOWN",
      );
    }
    if (!response.ok) {
      throw new VendureBusinessReconciliationProviderError(
        response.status >= 500 ? "unknown" : "rejected",
        `VENDURE_RECONCILIATION_PROVIDER_HTTP_${response.status}`,
      );
    }
    let payload: unknown;
    try {
      payload = JSON.parse(await response.text());
    } catch {
      throw new VendureBusinessReconciliationProviderError(
        "unknown", "VENDURE_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
      );
    }
    const envelope = payload as {
      data?: {
        activeChannel?: { id?: unknown };
        craysCommerceBusinessReconciliations?: unknown;
      };
      errors?: unknown[];
    };
    const items = envelope.data?.craysCommerceBusinessReconciliations;
    const activeChannelId = envelope.data?.activeChannel?.id;
    if (
      !payload || typeof payload !== "object" || Array.isArray(payload) ||
      envelope.errors?.length || !Array.isArray(items) ||
      items.length > input.take ||
      typeof activeChannelId !== "string" || !REFERENCE.test(activeChannelId)
    ) {
      throw new VendureBusinessReconciliationProviderError(
        "unknown", "VENDURE_RECONCILIATION_PROVIDER_RESPONSE_INVALID",
      );
    }
    if (activeChannelId !== input.expectedChannelId) {
      throw new VendureBusinessReconciliationProviderError(
        "rejected", "VENDURE_RECONCILIATION_PROVIDER_CHANNEL_MISMATCH",
      );
    }
    return Object.freeze(items.map(exactItem));
  }
}
