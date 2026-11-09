import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import type { KdsDatabase } from "@/store-operations/kds";

import type {
  CommerceMemberContext,
  CommerceSessionStore,
} from "./commerce-session-store";
import {
  resolveServerCommerceContext,
  type CommerceVerticalRoot,
  type ServerCommerceContext,
} from "./server-commerce-context-resolver";
import {
  VendureHttpAdapter,
  type CraysCommerceAdapter,
  type VendureConfig,
  type VendureCommerceContext,
  type VendureCommercePurpose,
} from "./vendure-http-adapter";

export interface CommerceProviderRuntimeRegistry {
  vendureShopApiUrlForDeploymentCell(
    deploymentCellId: string,
  ): Promise<string>;
  secretValue(secretReference: string): Promise<string>;
}

function exactShopApiUrl(value: string): string {
  const url = new URL(value);
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
    throw new Error("COMMERCE_DEPLOYMENT_CELL_URL_INVALID");
  }
  return url.toString();
}

export type ServerBoundVendureAdapter = Readonly<{
  adapter: CraysCommerceAdapter;
  context: ServerCommerceContext;
}>;

export async function createServerBoundVendureAdapter(
  database: KdsDatabase,
  registry: CommerceProviderRuntimeRegistry,
  input: Readonly<{
    verticalRoot: CommerceVerticalRoot;
    storeId: string;
    expectedAssignmentVersion?: number;
    memberContext?: CommerceMemberContext;
    sessionStore?: CommerceSessionStore;
    now?: Date;
    issueCommerceContext: (
      context: ServerCommerceContext,
      channelToken: string,
      purpose: VendureCommercePurpose,
    ) => Promise<VendureCommerceContext> | VendureCommerceContext;
  }>,
): Promise<ServerBoundVendureAdapter> {
  const context = await resolveServerCommerceContext(database, {
    verticalRoot: input.verticalRoot,
    storeId: input.storeId,
    expectedAssignmentVersion: input.expectedAssignmentVersion,
    now: input.now,
  });
  const [shopApiUrl, channelToken] = await Promise.all([
    registry.vendureShopApiUrlForDeploymentCell(
      context.vendure.deploymentCellId,
    ),
    registry.secretValue(context.vendure.channelTokenSecretRef),
  ]);
  if (!channelToken.trim()) {
    throw new Error("COMMERCE_CHANNEL_CREDENTIAL_UNRESOLVED");
  }
  const expectedTokenSha256 = context.vendure.channelTokenSha256;
  const actualTokenSha256 = createHash("sha256")
    .update(channelToken, "utf8")
    .digest("hex");
  if (
    !expectedTokenSha256 ||
    expectedTokenSha256.length !== actualTokenSha256.length ||
    !timingSafeEqual(
      Buffer.from(expectedTokenSha256, "utf8"),
      Buffer.from(actualTokenSha256, "utf8"),
    )
  ) {
    throw new Error("COMMERCE_CHANNEL_CREDENTIAL_SCOPE_MISMATCH");
  }
  const config: VendureConfig = {
    shopApiUrl: exactShopApiUrl(shopApiUrl),
    channelToken,
    adapterKey: null,
    timeoutMs: 8_000,
    commerceContext: (purpose) =>
      input.issueCommerceContext(context, channelToken, purpose),
  };
  return {
    adapter: new VendureHttpAdapter(
      config,
      input.memberContext ?? null,
      input.sessionStore ?? null,
    ),
    context,
  };
}

