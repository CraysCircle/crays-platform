import {
  issueSignedCoreCommerceConsequenceReceipt,
  type CoreCommerceConsequenceSource,
} from "./core-commerce-consequence-receipt";

type FetchLike = typeof fetch;
type Persisted = ReturnType<
  typeof import("./core-commerce-consequence-receipt")["prepareCoreCommerceConsequencePersistence"]
>;

export type CoreCommerceDeliveryClaim = Readonly<{
  deliveryId: string;
  tenantId: string;
  attemptCount: number;
  leaseOwner: string;
  leaseExpiresAt: string;
  persisted: Persisted;
}>;

export type CoreCommerceDeliveryRepository = Readonly<{
  claim(input: Readonly<{tenantId: string; workerId: string; now: Date; leaseSeconds?: number}>): Promise<CoreCommerceDeliveryClaim | null>;
  complete(input: Readonly<{tenantId: string; deliveryId: string; workerId: string; receiptSha256: string; now: Date}>): Promise<"DELIVERED">;
  fail(input: Readonly<{tenantId: string; deliveryId: string; workerId: string; errorCode: string; retryable: boolean; now: Date; maxAttempts?: number}>): Promise<"PENDING" | "QUARANTINED">;
}>;

export type CoreCommerceVendureBinding = Readonly<{
  endpoint: string;
  serviceIdentity: string;
  signingKeyId: string;
  signingSecret: string;
}>;

export type CoreCommerceVendureDispatchResult = Readonly<{
  state: "RECORDED" | "RETRYABLE" | "PERMANENT" | "UNKNOWN";
  errorCode: string | null;
}>;

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,99}$/;

function exactEndpoint(raw: string): string {
  const url = new URL(raw);
  if (url.username || url.password || url.search || url.hash ||
      url.pathname !== "/internal/crays/core-commerce-consequences") {
    throw new Error("CORE_COMMERCE_VENDURE_ENDPOINT_INVALID");
  }
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error("CORE_COMMERCE_VENDURE_ENDPOINT_INSECURE");
  }
  return url.toString();
}

export class CoreCommerceVendureDeliveryAdapter {
  constructor(private readonly fetcher: FetchLike = fetch) {}

  async dispatch(
    signed: ReturnType<typeof issueSignedCoreCommerceConsequenceReceipt>,
    binding: CoreCommerceVendureBinding,
  ): Promise<CoreCommerceVendureDispatchResult> {
    const endpoint = exactEndpoint(binding.endpoint);
    if (!ID.test(binding.serviceIdentity)) {
      throw new Error("CORE_COMMERCE_SERVICE_IDENTITY_INVALID");
    }
    let response: Response;
    try {
      response = await this.fetcher(endpoint, {
        method: "POST",
        redirect: "error",
        headers: {
          "content-type": "application/json",
          "x-crays-service-identity": binding.serviceIdentity,
        },
        body: JSON.stringify({receipt: signed.receipt, signature: signed.signature}),
      });
    } catch {
      return {state: "UNKNOWN", errorCode: "VENDURE_TRANSPORT_UNKNOWN"};
    }
    if (!response.ok) {
      if (response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500) {
        return {state: "RETRYABLE", errorCode: `VENDURE_HTTP_${response.status}`};
      }
      return {state: "PERMANENT", errorCode: `VENDURE_HTTP_${response.status}`};
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return {state: "UNKNOWN", errorCode: "VENDURE_RESPONSE_UNREADABLE"};
    }
    const result = body as Record<string, unknown>;
    if (
      result.status !== "RECORDED" ||
      result.sourceReceiptId !== signed.receipt.sourceReceiptId ||
      result.sourceRecordSha256 !== signed.receipt.sourceRecordSha256 ||
      typeof result.eventId !== "string" || !result.eventId ||
      !["RETURN_TRANSITIONED", "PARTNER_FEE_RECORDED"].includes(String(result.eventType)) ||
      result.state !== "PENDING"
    ) return {state: "UNKNOWN", errorCode: "VENDURE_RECEIPT_SCOPE_MISMATCH"};
    return {state: "RECORDED", errorCode: null};
  }
}

export class CoreCommerceConsequenceDeliveryCycle {
  constructor(
    private readonly repository: CoreCommerceDeliveryRepository,
    private readonly adapter: CoreCommerceVendureDeliveryAdapter,
    private readonly binding: CoreCommerceVendureBinding,
  ) {}

  async runOnce(input: Readonly<{
    tenantId: string;
    workerId: string;
    now?: Date;
  }>): Promise<Readonly<{
    deliveryId: string;
    state: "DELIVERED" | "RETRY_SCHEDULED" | "QUARANTINED";
    errorCode: string | null;
  }> | null> {
    const now = input.now ?? new Date();
    const claimed = await this.repository.claim({
      tenantId: input.tenantId,
      workerId: input.workerId,
      now,
      leaseSeconds: 30,
    });
    if (!claimed) return null;
    let signed: ReturnType<typeof issueSignedCoreCommerceConsequenceReceipt>;
    try {
      signed = issueSignedCoreCommerceConsequenceReceipt({
        persisted: claimed.persisted,
        signingKeyId: this.binding.signingKeyId,
        signingSecret: this.binding.signingSecret,
        issuedAt: now.toISOString(),
      });
    } catch {
      await this.repository.fail({
        tenantId: claimed.tenantId,
        deliveryId: claimed.deliveryId,
        workerId: claimed.leaseOwner,
        errorCode: "CORE_SIGNING_CONFIG_DENIED",
        retryable: false,
        now,
      });
      return {deliveryId: claimed.deliveryId, state: "QUARANTINED", errorCode: "CORE_SIGNING_CONFIG_DENIED"};
    }
    const result = await this.adapter.dispatch(signed, this.binding);
    if (result.state === "RECORDED") {
      await this.repository.complete({
        tenantId: claimed.tenantId,
        deliveryId: claimed.deliveryId,
        workerId: claimed.leaseOwner,
        receiptSha256: signed.receiptSha256,
        now,
      });
      return {deliveryId: claimed.deliveryId, state: "DELIVERED", errorCode: null};
    }
    const state = await this.repository.fail({
      tenantId: claimed.tenantId,
      deliveryId: claimed.deliveryId,
      workerId: claimed.leaseOwner,
      errorCode: result.errorCode ?? "VENDURE_DELIVERY_FAILED",
      retryable: result.state !== "PERMANENT",
      now,
      maxAttempts: 8,
    });
    return {
      deliveryId: claimed.deliveryId,
      state: state === "PENDING" ? "RETRY_SCHEDULED" : "QUARANTINED",
      errorCode: result.errorCode,
    };
  }
}

export type {CoreCommerceConsequenceSource};
