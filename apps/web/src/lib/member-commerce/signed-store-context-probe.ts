import "server-only";

import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import type { RoleKey } from "@/lib/roles";
import type { KdsDatabase } from "@/store-operations/kds";
import {
  getCoffeePublicStoreDirectory,
  issueCoffeePublicCommerceContext,
} from "@/store-operations/coffee-public-context-authority";
import {
  authorizePartnerVendureAdmin,
} from "./partner-vendure-admin-authorization";
import {
  loadPartnerVendureAdminGrants,
} from "./partner-vendure-admin-grant-repository";

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

type SignedStoreContextClaims = Readonly<{
  version?: unknown;
  requestId?: unknown;
  actorReference?: unknown;
  verticalRoot?: unknown;
  deploymentCellId?: unknown;
  operatorTenantId?: unknown;
  operatorLegalEntityId?: unknown;
  storeId?: unknown;
  storeOperatorAssignmentId?: unknown;
  assignmentVersion?: unknown;
  bindingId?: unknown;
  bindingVersion?: unknown;
  vendureSellerId?: unknown;
  vendureChannelId?: unknown;
  vendureChannelTokenSha256?: unknown;
  primaryVendureStockLocationId?: unknown;
  expiresAtEpochSeconds?: unknown;
  sellerSnapshot?: Readonly<{
    sellerLegalName?: unknown;
    sellerTaxRegistrationRef?: unknown;
  }>;
  commerceAdmission?: Readonly<{
    decision?: unknown;
    purpose?: unknown;
  }>;
}>;

function decodeSignedStoreContextClaims(encodedContext: string) {
  try {
    if (
      encodedContext.length < 20 || encodedContext.length > 12_000 ||
      !BASE64URL.test(encodedContext)
    ) {
      throw new Error("invalid envelope encoding");
    }
    const bytes = Buffer.from(encodedContext, "base64url");
    if (bytes.toString("base64url") !== encodedContext) {
      throw new Error("non-canonical envelope encoding");
    }
    const decoded = JSON.parse(bytes.toString("utf8")) as unknown;
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
      throw new Error("invalid envelope shape");
    }
    return decoded as SignedStoreContextClaims;
  } catch {
    throw new Error("SIGNED_STORE_CONTEXT_SCOPE_MISMATCH");
  }
}

function signaturesMatch(actual: string, expected: string) {
  const actualBytes = Buffer.from(actual, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes);
}

export class SignedStoreContextProviderError extends Error {
  constructor(readonly outcome: "rejected" | "unknown", readonly code: string) {
    super(code);
    this.name = "SignedStoreContextProviderError";
  }
}

function exactShopApiUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SignedStoreContextProviderError(
      "rejected", "SIGNED_STORE_CONTEXT_PROVIDER_URL_INVALID",
    );
  }
  const localHttp = url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (
    url.username || url.password || url.search || url.hash ||
    (url.protocol !== "https:" && !localHttp)
  ) {
    throw new SignedStoreContextProviderError(
      "rejected", "SIGNED_STORE_CONTEXT_PROVIDER_URL_INVALID",
    );
  }
  return url.toString();
}

export class VendureSignedStoreContextProvider {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  async probe(input: Readonly<{
    shopApiUrl: string;
    channelToken: string;
    encodedContext: string;
    signature: string;
  }>): Promise<Readonly<{ providerAccepted: true }>> {
    if (
      input.channelToken.length < 3 || input.channelToken.length > 300 ||
      input.encodedContext.length < 20 || input.encodedContext.length > 12_000 ||
      input.signature.length < 20 || input.signature.length > 300
    ) {
      throw new SignedStoreContextProviderError(
        "rejected", "SIGNED_STORE_CONTEXT_PROVIDER_INPUT_INVALID",
      );
    }
    let response: Response;
    try {
      response = await this.fetchImpl(exactShopApiUrl(input.shopApiUrl), {
        method: "POST",
        cache: "no-store",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "vendure-token": input.channelToken,
          "x-crays-commerce-context": input.encodedContext,
          "x-crays-commerce-context-signature": input.signature,
        },
        body: JSON.stringify({
          operationName: "CraysSignedStoreContextProbe",
          query: "query CraysSignedStoreContextProbe { __typename }",
        }),
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new SignedStoreContextProviderError(
        "unknown", "SIGNED_STORE_CONTEXT_PROVIDER_OUTCOME_UNKNOWN",
      );
    }
    if (!response.ok) {
      throw new SignedStoreContextProviderError(
        response.status >= 500 ? "unknown" : "rejected",
        `SIGNED_STORE_CONTEXT_PROVIDER_HTTP_${response.status}`,
      );
    }
    let payload: unknown;
    try {
      payload = JSON.parse(await response.text());
    } catch {
      throw new SignedStoreContextProviderError(
        "unknown", "SIGNED_STORE_CONTEXT_PROVIDER_RESPONSE_INVALID",
      );
    }
    const envelope = payload as {
      data?: { __typename?: unknown };
      errors?: unknown[];
    };
    if (
      !payload || typeof payload !== "object" || Array.isArray(payload) ||
      envelope.errors?.length || envelope.data?.__typename !== "Query"
    ) {
      throw new SignedStoreContextProviderError(
        "unknown", "SIGNED_STORE_CONTEXT_PROVIDER_RESPONSE_INVALID",
      );
    }
    return Object.freeze({ providerAccepted: true as const });
  }
}

export type SignedStoreContextExecutionDependencies = Readonly<{
  database: KdsDatabase;
  channelTokenForBinding: (bindingId: string) => string;
  signingSecret: () => string;
  shopApiUrlForDeploymentCell: (deploymentCellId: string) => Promise<string>;
  provider?: Pick<VendureSignedStoreContextProvider, "probe">;
  getDirectory?: typeof getCoffeePublicStoreDirectory;
  issueContext?: typeof issueCoffeePublicCommerceContext;
  loadGrants?: typeof loadPartnerVendureAdminGrants;
  authorize?: typeof authorizePartnerVendureAdmin;
  requestId?: () => string;
}>;

export async function executeSignedStoreContextProbe(
  dependencies: SignedStoreContextExecutionDependencies,
  input: Readonly<{
    accountId: string;
    organizationId: string;
    effectiveRole: RoleKey;
    verticalRoot: "coffee";
    storeId: string;
    expectedAssignmentVersion?: number;
  }>,
) {
  if (
    !ID.test(input.accountId) || !ID.test(input.organizationId) ||
    !ID.test(input.storeId) || input.verticalRoot !== "coffee"
  ) {
    throw new Error("SIGNED_STORE_CONTEXT_INPUT_INVALID");
  }
  const loadGrants = dependencies.loadGrants ?? loadPartnerVendureAdminGrants;
  const authorize = dependencies.authorize ?? authorizePartnerVendureAdmin;
  const snapshot = await loadGrants(dependencies.database, {
    accountId: input.accountId,
    organizationId: input.organizationId,
    effectiveRole: input.effectiveRole,
    verticalRoot: input.verticalRoot,
    storeId: input.storeId,
    expectedAssignmentVersion: input.expectedAssignmentVersion,
  });
  const decision = authorize({
    action: "catalog.read",
    grants: snapshot.grants,
    context: snapshot.context,
    now: new Date(snapshot.authorityNow),
  });
  if (decision.decision !== "ALLOW" || decision.scope.kind !== "partner_store") {
    throw new Error("SIGNED_STORE_CONTEXT_AUTHORIZATION_DENIED");
  }
  const directory = await (dependencies.getDirectory ??
    getCoffeePublicStoreDirectory)(
      dependencies.database, new Date(snapshot.authorityNow),
    );
  const candidates = directory.stores.filter((store) => store.id === input.storeId);
  if (candidates.length !== 1) {
    throw new Error("SIGNED_STORE_CONTEXT_STORE_NOT_AVAILABLE");
  }
  const selectedStore = candidates[0];
  const requestId = (dependencies.requestId ?? randomUUID)();
  const signingSecret = dependencies.signingSecret();
  const issued = await (dependencies.issueContext ??
    issueCoffeePublicCommerceContext)(dependencies.database, {
      storeSlug: selectedStore.slug,
      purpose: "public-catalog",
      actorReference: input.accountId,
      requestId,
      channelTokenForBinding: dependencies.channelTokenForBinding,
      signingSecret,
      now: new Date(snapshot.authorityNow),
    });
  const claims = decodeSignedStoreContextClaims(issued.encodedContext);
  const issuedExpiryEpochSeconds = Date.parse(issued.expiresAt) / 1_000;
  const channelTokenSha256 = createHash("sha256")
    .update(issued.channelToken, "utf8")
    .digest("hex");
  const expectedSignature = createHmac("sha256", signingSecret)
    .update(issued.encodedContext, "utf8")
    .digest("base64url");
  if (
    issued.store.id !== snapshot.context.storeId ||
    issued.store.sellerLegalName !== snapshot.context.operatorLegalName ||
    issued.commerceAdmission.decision !== "ADMIT" ||
    claims.version !== 2 ||
    claims.requestId !== requestId ||
    claims.actorReference !== input.accountId ||
    claims.verticalRoot !== snapshot.context.verticalRoot ||
    claims.deploymentCellId !== snapshot.context.vendure.deploymentCellId ||
    claims.operatorTenantId !== snapshot.context.partnerTenantId ||
    claims.operatorLegalEntityId !== snapshot.context.operatorLegalEntityId ||
    claims.storeId !== snapshot.context.storeId ||
    claims.storeOperatorAssignmentId !==
      snapshot.context.storeOperatorAssignmentId ||
    claims.assignmentVersion !==
      snapshot.context.storeOperatorAssignmentVersion ||
    claims.bindingId !== snapshot.context.providerBindingId ||
    claims.bindingVersion !== snapshot.context.providerBindingVersion ||
    claims.vendureSellerId !== snapshot.context.vendure.sellerId ||
    claims.vendureChannelId !== snapshot.context.vendure.channelId ||
    claims.vendureChannelTokenSha256 !== channelTokenSha256 ||
    typeof claims.primaryVendureStockLocationId !== "string" ||
    !snapshot.context.vendure.stockLocationIds.includes(
      claims.primaryVendureStockLocationId,
    ) ||
    claims.sellerSnapshot?.sellerLegalName !==
      snapshot.context.operatorLegalName ||
    (snapshot.context.taxRegistrationRef !== null &&
      claims.sellerSnapshot?.sellerTaxRegistrationRef !==
        snapshot.context.taxRegistrationRef) ||
    claims.commerceAdmission?.decision !== "ADMIT" ||
    claims.commerceAdmission?.purpose !== "public-catalog" ||
    !Number.isSafeInteger(issuedExpiryEpochSeconds) ||
    claims.expiresAtEpochSeconds !== issuedExpiryEpochSeconds ||
    !signaturesMatch(issued.signature, expectedSignature)
  ) {
    throw new Error("SIGNED_STORE_CONTEXT_SCOPE_MISMATCH");
  }
  const shopApiUrl = await dependencies.shopApiUrlForDeploymentCell(
    snapshot.context.vendure.deploymentCellId,
  );
  const provider = dependencies.provider ?? new VendureSignedStoreContextProvider();
  await provider.probe({
    shopApiUrl,
    channelToken: issued.channelToken,
    encodedContext: issued.encodedContext,
    signature: issued.signature,
  });
  return Object.freeze({
    state: "ready" as const,
    verticalRoot: snapshot.context.verticalRoot,
    storeId: snapshot.context.storeId,
    storeOperatorAssignmentVersion:
      snapshot.context.storeOperatorAssignmentVersion,
    sellerLegalName: snapshot.context.operatorLegalName,
    merchantOfRecord: snapshot.context.operatorLegalName,
    contextFingerprint: snapshot.context.contextFingerprint,
    providerBoundary: "SIGNED_CONTEXT_ACCEPTED" as const,
    expiresAt: issued.expiresAt,
  });
}
