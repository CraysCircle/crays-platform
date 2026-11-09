import "server-only";

import type { KdsDatabase } from "@/store-operations/kds";

import {
  NextcloudProductMediaDerivativeAdapter,
  VendureProductMediaPublicationAdapter,
} from "./product-media-provider-adapter";
import {
  resolveServerCommerceContext,
  type CommerceVerticalRoot,
  type ServerCommerceContext,
} from "./server-commerce-context-resolver";

export interface ProductMediaProviderRuntimeRegistry {
  nextcloudForHostSession(hostSessionBindingId: string): Promise<Readonly<{
    webdavBaseUrl: string;
    username: string;
    appPassword: string;
    maxBytes: number;
  }>>;
  vendureAdminForDeploymentCell(deploymentCellId: string): Promise<Readonly<{
    adminApiUrl: string;
    bearerToken: string;
  }>>;
  channelToken(secretReference: string): Promise<string>;
}

export type ServerBoundProductMediaProviders = Readonly<{
  context: ServerCommerceContext;
  nextcloud: NextcloudProductMediaDerivativeAdapter;
  vendure: VendureProductMediaPublicationAdapter;
}>;

function exactMatch(actual: string, expected: string, code: string) {
  if (!expected.trim() || actual !== expected.trim()) throw new Error(code);
}

export async function createServerBoundProductMediaProviders(
  database: KdsDatabase,
  registry: ProductMediaProviderRuntimeRegistry,
  input: Readonly<{
    verticalRoot: CommerceVerticalRoot;
    storeId: string;
    expectedAssignmentVersion: number;
    expectedPartnerTenantId: string;
    expectedOperatorLegalEntityId: string;
    expectedVendureSellerId: string;
    expectedVendureChannelId: string;
    nextcloudHostSessionBindingId: string;
    now?: Date;
  }>,
): Promise<ServerBoundProductMediaProviders> {
  const context = await resolveServerCommerceContext(database, {
    verticalRoot: input.verticalRoot,
    storeId: input.storeId,
    expectedAssignmentVersion: input.expectedAssignmentVersion,
    now: input.now,
  });
  exactMatch(context.partnerTenantId, input.expectedPartnerTenantId,
    "PRODUCT_MEDIA_PARTNER_SCOPE_MISMATCH");
  exactMatch(context.operatorLegalEntityId, input.expectedOperatorLegalEntityId,
    "PRODUCT_MEDIA_LEGAL_ENTITY_SCOPE_MISMATCH");
  exactMatch(context.vendure.sellerId, input.expectedVendureSellerId,
    "PRODUCT_MEDIA_SELLER_SCOPE_MISMATCH");
  exactMatch(context.vendure.channelId, input.expectedVendureChannelId,
    "PRODUCT_MEDIA_CHANNEL_SCOPE_MISMATCH");
  if (!input.nextcloudHostSessionBindingId.trim()) {
    throw new Error("PRODUCT_MEDIA_NEXTCLOUD_HOST_SESSION_REQUIRED");
  }

  const [nextcloud, vendure, channelToken] = await Promise.all([
    registry.nextcloudForHostSession(input.nextcloudHostSessionBindingId),
    registry.vendureAdminForDeploymentCell(context.vendure.deploymentCellId),
    registry.channelToken(context.vendure.channelTokenSecretRef),
  ]);
  if (!channelToken.trim()) {
    throw new Error("PRODUCT_MEDIA_CHANNEL_CREDENTIAL_UNRESOLVED");
  }
  return Object.freeze({
    context,
    nextcloud: new NextcloudProductMediaDerivativeAdapter(nextcloud),
    vendure: new VendureProductMediaPublicationAdapter({
      ...vendure,
      channelToken,
    }),
  });
}
