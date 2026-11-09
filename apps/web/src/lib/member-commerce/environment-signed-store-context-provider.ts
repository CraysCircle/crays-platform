import "server-only";

import { createEnvironmentCommerceProviderRuntimeRegistry } from
  "./environment-commerce-provider-runtime-registry";
import { SignedStoreContextProviderError } from
  "./signed-store-context-probe";

export function createLazyEnvironmentVendureShopApiUrlResolver(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): (deploymentCellId: string) => Promise<string> {
  return async (deploymentCellId) => {
    try {
      return await createEnvironmentCommerceProviderRuntimeRegistry(environment)
        .vendureShopApiUrlForDeploymentCell(deploymentCellId);
    } catch {
      throw new SignedStoreContextProviderError(
        "rejected", "SIGNED_STORE_CONTEXT_PROVIDER_SCOPE_UNRESOLVED",
      );
    }
  };
}
