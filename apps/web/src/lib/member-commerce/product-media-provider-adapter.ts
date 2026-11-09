import "server-only";

import { createHash } from "node:crypto";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const VENDURE_GRAPHQL_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const HASH = /^[a-f0-9]{64}$/;
const ALLOWED_MEDIA = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export class ProductMediaProviderError extends Error {
  constructor(
    readonly outcome: "rejected" | "unknown",
    readonly code: string,
  ) {
    super(code);
    this.name = "ProductMediaProviderError";
  }
}

function exactProviderUrl(value: string, code: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ProductMediaProviderError("rejected", code);
  }
  const localHttp =
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" && !localHttp)
  ) {
    throw new ProductMediaProviderError("rejected", code);
  }
  return url.toString();
}

function exactId(value: string, code: string): string {
  const normalized = value.trim();
  if (!ID.test(normalized)) {
    throw new ProductMediaProviderError("rejected", code);
  }
  return normalized;
}

function exactVendureGraphQlId(value: string, code: string): string {
  const normalized = value.trim();
  if (!VENDURE_GRAPHQL_ID.test(normalized)) {
    throw new ProductMediaProviderError("rejected", code);
  }
  return normalized;
}

function exactSha256(value: string, code: string): string {
  const normalized = value.trim().toLowerCase();
  if (!HASH.test(normalized)) {
    throw new ProductMediaProviderError("rejected", code);
  }
  return normalized;
}

function exactDerivativePath(value: string): string {
  if (
    !value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("\0")
  ) {
    throw new ProductMediaProviderError(
      "rejected",
      "PRODUCT_MEDIA_NEXTCLOUD_PATH_INVALID",
    );
  }
  const segments = value.split("/").filter(Boolean);
  let decoded: string[];
  try {
    decoded = segments.map((segment) => decodeURIComponent(segment));
  } catch {
    throw new ProductMediaProviderError(
      "rejected",
      "PRODUCT_MEDIA_NEXTCLOUD_PATH_INVALID",
    );
  }
  if (
    decoded.length < 1 ||
    decoded.some((segment) =>
      segment === "." ||
      segment === ".." ||
      segment.includes("/")
    )
  ) {
    throw new ProductMediaProviderError(
      "rejected",
      "PRODUCT_MEDIA_NEXTCLOUD_PATH_INVALID",
    );
  }
  return decoded.map((segment) => encodeURIComponent(segment)).join("/");
}

export type ProductMediaDerivative = Readonly<{
  bytes: Uint8Array;
  byteLength: number;
  contentType: "image/avif" | "image/jpeg" | "image/png" | "image/webp";
  sha256: string;
  etag: string;
  nextcloudFileId: string;
  nextcloudVersionId: string;
}>;

export class NextcloudProductMediaDerivativeAdapter {
  private readonly webdavBaseUrl: string;
  private readonly authorization: string;
  private readonly timeoutMs: number;
  private readonly maxBytes: number;

  constructor(
    config: Readonly<{
      webdavBaseUrl: string;
      username: string;
      appPassword: string;
      timeoutMs?: number;
      maxBytes?: number;
    }>,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    if (!config.username.trim() || config.appPassword.trim().length < 16) {
      throw new ProductMediaProviderError(
        "rejected",
        "PRODUCT_MEDIA_NEXTCLOUD_CREDENTIAL_INVALID",
      );
    }
    this.webdavBaseUrl = exactProviderUrl(
      config.webdavBaseUrl,
      "PRODUCT_MEDIA_NEXTCLOUD_URL_INVALID",
    );
    this.authorization = `Basic ${Buffer.from(
      `${config.username.trim()}:${config.appPassword.trim()}`,
      "utf8",
    ).toString("base64")}`;
    this.timeoutMs = Math.min(Math.max(config.timeoutMs ?? 8_000, 250), 30_000);
    this.maxBytes = Math.min(
      Math.max(config.maxBytes ?? 20 * 1024 * 1024, 1),
      50 * 1024 * 1024,
    );
  }

  async downloadVerifiedDerivative(input: Readonly<{
    path: string;
    expectedSha256: string;
    expectedBytes: number;
    expectedContentType: ProductMediaDerivative["contentType"];
    nextcloudFileId: string;
    nextcloudVersionId: string;
  }>): Promise<ProductMediaDerivative> {
    const path = exactDerivativePath(input.path);
    const expectedSha256 = exactSha256(
      input.expectedSha256,
      "PRODUCT_MEDIA_DERIVATIVE_CHECKSUM_INVALID",
    );
    const nextcloudFileId = exactId(
      input.nextcloudFileId,
      "PRODUCT_MEDIA_NEXTCLOUD_FILE_ID_INVALID",
    );
    const nextcloudVersionId = exactId(
      input.nextcloudVersionId,
      "PRODUCT_MEDIA_NEXTCLOUD_VERSION_ID_INVALID",
    );
    if (
      !Number.isSafeInteger(input.expectedBytes) ||
      input.expectedBytes < 1 ||
      input.expectedBytes > this.maxBytes ||
      !ALLOWED_MEDIA.has(input.expectedContentType)
    ) {
      throw new ProductMediaProviderError(
        "rejected",
        "PRODUCT_MEDIA_DERIVATIVE_METADATA_INVALID",
      );
    }

    let response: Response;
    try {
      response = await this.fetchImpl(new URL(path, this.webdavBaseUrl), {
        method: "GET",
        cache: "no-store",
        redirect: "manual",
        headers: {
          accept: input.expectedContentType,
          authorization: this.authorization,
          "x-crays-nextcloud-file-id": nextcloudFileId,
          "x-crays-nextcloud-version-id": nextcloudVersionId,
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new ProductMediaProviderError(
        "unknown",
        "PRODUCT_MEDIA_NEXTCLOUD_OUTCOME_UNKNOWN",
      );
    }
    if (response.status !== 200) {
      throw new ProductMediaProviderError(
        response.status >= 500 ? "unknown" : "rejected",
        `PRODUCT_MEDIA_NEXTCLOUD_HTTP_${response.status}`,
      );
    }
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim();
    const contentLength = Number(response.headers.get("content-length") ?? NaN);
    if (
      contentType !== input.expectedContentType ||
      (Number.isFinite(contentLength) && contentLength !== input.expectedBytes)
    ) {
      throw new ProductMediaProviderError(
        "rejected",
        "PRODUCT_MEDIA_DERIVATIVE_METADATA_MISMATCH",
      );
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== input.expectedBytes || sha256 !== expectedSha256) {
      throw new ProductMediaProviderError(
        "rejected",
        "PRODUCT_MEDIA_DERIVATIVE_CONTENT_MISMATCH",
      );
    }
    const etag = response.headers.get("etag")?.trim();
    if (!etag || etag.length > 256) {
      throw new ProductMediaProviderError(
        "unknown",
        "PRODUCT_MEDIA_NEXTCLOUD_ETAG_MISSING",
      );
    }
    return Object.freeze({
      bytes,
      byteLength: bytes.byteLength,
      contentType: input.expectedContentType,
      sha256,
      etag,
      nextcloudFileId,
      nextcloudVersionId,
    });
  }
}

export type ProductMediaPublicationReceipt = Readonly<{
  commandId: string;
  providerAssetId: string;
  providerAssetVersion: string;
  providerCorrelationId: string;
  observedSha256: string;
  vendureSellerId: string;
  vendureChannelId: string;
  outcome: "PUBLISHED";
}>;

export class VendureProductMediaPublicationAdapter {
  private readonly adminApiUrl: string;
  private readonly bearerToken: string;
  private readonly channelToken: string;
  private readonly timeoutMs: number;

  constructor(
    config: Readonly<{
      adminApiUrl: string;
      bearerToken: string;
      channelToken: string;
      timeoutMs?: number;
    }>,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    if (
      config.bearerToken.trim().length < 32 ||
      config.channelToken.trim().length < 8
    ) {
      throw new ProductMediaProviderError(
        "rejected",
        "PRODUCT_MEDIA_VENDURE_CREDENTIAL_INVALID",
      );
    }
    this.adminApiUrl = exactProviderUrl(
      config.adminApiUrl,
      "PRODUCT_MEDIA_VENDURE_URL_INVALID",
    );
    this.bearerToken = config.bearerToken.trim();
    this.channelToken = config.channelToken.trim();
    this.timeoutMs = Math.min(Math.max(config.timeoutMs ?? 8_000, 250), 30_000);
  }

  async publish(input: Readonly<{
    commandId: string;
    idempotencyKey: string;
    artifactId: string;
    artifactVersionId: string;
    rightsApprovalReceiptId: string;
    sellableAssignmentId: string;
    verticalRoot: "coffee" | "retail" | "gym" | "clubs";
    partnerTenantId: string;
    operatorLegalEntityId: string;
    storeId: string;
    vendureSellerId: string;
    vendureChannelId: string;
    filename: string;
    derivative: ProductMediaDerivative;
  }>): Promise<ProductMediaPublicationReceipt> {
    const ids = [
      input.commandId,
      input.idempotencyKey,
      input.artifactId,
      input.artifactVersionId,
      input.rightsApprovalReceiptId,
      input.sellableAssignmentId,
      input.partnerTenantId,
      input.operatorLegalEntityId,
      input.storeId,
    ].map((value) => exactId(value, "PRODUCT_MEDIA_PUBLICATION_INPUT_INVALID"));
    const vendureSellerId = exactVendureGraphQlId(
      input.vendureSellerId,
      "PRODUCT_MEDIA_VENDURE_SELLER_ID_INVALID",
    );
    const vendureChannelId = exactVendureGraphQlId(
      input.vendureChannelId,
      "PRODUCT_MEDIA_VENDURE_CHANNEL_ID_INVALID",
    );
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(input.filename)) {
      throw new ProductMediaProviderError(
        "rejected",
        "PRODUCT_MEDIA_PUBLICATION_FILENAME_INVALID",
      );
    }
    const form = new FormData();
    form.set("operations", JSON.stringify({
      query: `mutation CraysPublishProductMediaAsset(
        $input: CraysProductMediaPublicationInput!,
        $file: Upload!
      ) {
        craysPublishProductMediaAsset(input: $input, file: $file) {
          commandId providerAssetId providerAssetVersion providerCorrelationId
          observedSha256 vendureSellerId vendureChannelId outcome
        }
      }`,
      variables: {
        input: {
          commandId: ids[0],
          idempotencyKey: ids[1],
          artifactId: ids[2],
          artifactVersionId: ids[3],
          rightsApprovalReceiptId: ids[4],
          sellableAssignmentId: ids[5],
          verticalRoot: input.verticalRoot,
          partnerTenantId: ids[6],
          operatorLegalEntityId: ids[7],
          storeId: ids[8],
          vendureSellerId,
          vendureChannelId,
          derivativeSha256: input.derivative.sha256,
          nextcloudFileId: input.derivative.nextcloudFileId,
          nextcloudVersionId: input.derivative.nextcloudVersionId,
        },
        file: null,
      },
    }));
    form.set("map", JSON.stringify({ "0": ["variables.file"] }));
    form.set(
      "0",
      new Blob(
        [Uint8Array.from(input.derivative.bytes).buffer],
        { type: input.derivative.contentType },
      ),
      input.filename,
    );

    let response: Response;
    try {
      response = await this.fetchImpl(this.adminApiUrl, {
        method: "POST",
        cache: "no-store",
        redirect: "manual",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${this.bearerToken}`,
          "vendure-token": this.channelToken,
        },
        body: form,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new ProductMediaProviderError(
        "unknown",
        "PRODUCT_MEDIA_VENDURE_OUTCOME_UNKNOWN",
      );
    }
    if (response.status !== 200) {
      throw new ProductMediaProviderError(
        response.status >= 500 ? "unknown" : "rejected",
        `PRODUCT_MEDIA_VENDURE_HTTP_${response.status}`,
      );
    }
    let payload: unknown;
    try {
      payload = JSON.parse(await response.text());
    } catch {
      throw new ProductMediaProviderError(
        "unknown",
        "PRODUCT_MEDIA_VENDURE_RESPONSE_INVALID",
      );
    }
    const envelope = payload as {
      data?: { craysPublishProductMediaAsset?: Record<string, unknown> };
      errors?: unknown[];
    };
    if (envelope.errors?.length) {
      throw new ProductMediaProviderError(
        "rejected",
        "PRODUCT_MEDIA_VENDURE_MUTATION_REJECTED",
      );
    }
    const value = envelope.data?.craysPublishProductMediaAsset;
    if (
      !value ||
      value.outcome !== "PUBLISHED" ||
      value.commandId !== ids[0] ||
      value.vendureSellerId !== vendureSellerId ||
      value.vendureChannelId !== vendureChannelId ||
      value.observedSha256 !== input.derivative.sha256 ||
      !VENDURE_GRAPHQL_ID.test(String(value.providerAssetId ?? "")) ||
      !ID.test(String(value.providerAssetVersion ?? "")) ||
      !ID.test(String(value.providerCorrelationId ?? ""))
    ) {
      throw new ProductMediaProviderError(
        "unknown",
        "PRODUCT_MEDIA_VENDURE_RECEIPT_MISMATCH",
      );
    }
    return Object.freeze({
      commandId: ids[0],
      providerAssetId: String(value.providerAssetId),
      providerAssetVersion: String(value.providerAssetVersion),
      providerCorrelationId: String(value.providerCorrelationId),
      observedSha256: input.derivative.sha256,
      vendureSellerId,
      vendureChannelId,
      outcome: "PUBLISHED" as const,
    });
  }
}
