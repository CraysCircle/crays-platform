import "server-only";

import { createEnvironmentCommerceProviderRuntimeRegistry } from
  "./environment-commerce-provider-runtime-registry";
import {
  createEnvironmentHistoricalOrderProviderRuntimeRegistry,
} from "./server-bound-historical-order-snapshot-provider";
import {
  ServerBoundVendureBusinessReconciliationProvider,
  VendureBusinessReconciliationProviderError,
} from "./vendure-business-reconciliation-provider";

export function createLazyEnvironmentVendureBusinessReconciliationProvider(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  fetchImpl: typeof fetch = fetch,
): Pick<ServerBoundVendureBusinessReconciliationProvider, "read"> {
  return Object.freeze({
    async read(
      input: Parameters<ServerBoundVendureBusinessReconciliationProvider["read"]>[0],
    ) {
      let provider: ServerBoundVendureBusinessReconciliationProvider;
      try {
        provider = new ServerBoundVendureBusinessReconciliationProvider(
          createEnvironmentHistoricalOrderProviderRuntimeRegistry(environment),
          createEnvironmentCommerceProviderRuntimeRegistry(environment),
          fetchImpl,
        );
      } catch {
        throw new VendureBusinessReconciliationProviderError(
          "rejected", "VENDURE_RECONCILIATION_PROVIDER_SCOPE_UNRESOLVED",
        );
      }
      return provider.read(input);
    },
  });
}
