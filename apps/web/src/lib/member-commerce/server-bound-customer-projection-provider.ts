import "server-only";

import type { CommerceProviderRuntimeRegistry } from "./server-bound-vendure-adapter";
import type { HistoricalOrderProviderRuntimeRegistry } from
  "./server-bound-historical-order-snapshot-provider";
import { VendureCustomerProjectionProvider } from "./vendure-customer-projection-provider";

export class ServerBoundCustomerProjectionProvider {
  constructor(
    private readonly runtimeRegistry: HistoricalOrderProviderRuntimeRegistry,
    private readonly secretRegistry: Pick<CommerceProviderRuntimeRegistry, "secretValue">,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async ensureProjection(input: Parameters<VendureCustomerProjectionProvider["ensureProjection"]>[0] &
    Readonly<{ channelTokenSecretRef: string }>) {
    const [adminApiUrl, bearerToken, channelToken] = await Promise.all([
      this.runtimeRegistry.vendureAdminApiUrlForDeploymentCell(input.deploymentCellId),
      this.runtimeRegistry.serviceBearerForDeploymentCell(input.deploymentCellId),
      this.secretRegistry.secretValue(input.channelTokenSecretRef),
    ]);
    const { channelTokenSecretRef: _secretRef, ...providerInput } = input;
    void _secretRef;
    return new VendureCustomerProjectionProvider({
      adminApiUrl, bearerToken, channelToken,
    }, this.fetchImpl).ensureProjection(providerInput);
  }

  async disableProjection(input: Parameters<VendureCustomerProjectionProvider["disableProjection"]>[0] &
    Readonly<{ channelTokenSecretRef: string }>) {
    const [adminApiUrl, bearerToken, channelToken] = await Promise.all([
      this.runtimeRegistry.vendureAdminApiUrlForDeploymentCell(input.deploymentCellId),
      this.runtimeRegistry.serviceBearerForDeploymentCell(input.deploymentCellId),
      this.secretRegistry.secretValue(input.channelTokenSecretRef),
    ]);
    const { channelTokenSecretRef: _secretRef, ...providerInput } = input;
    void _secretRef;
    return new VendureCustomerProjectionProvider({ adminApiUrl, bearerToken, channelToken },
      this.fetchImpl).disableProjection(providerInput);
  }

  async updateProjectionEmail(input: Parameters<VendureCustomerProjectionProvider["updateProjectionEmail"]>[0] &
    Readonly<{ channelTokenSecretRef: string }>) {
    const [adminApiUrl, bearerToken, channelToken] = await Promise.all([
      this.runtimeRegistry.vendureAdminApiUrlForDeploymentCell(input.deploymentCellId),
      this.runtimeRegistry.serviceBearerForDeploymentCell(input.deploymentCellId),
      this.secretRegistry.secretValue(input.channelTokenSecretRef),
    ]);
    const { channelTokenSecretRef: _secretRef, ...providerInput } = input;
    void _secretRef;
    return new VendureCustomerProjectionProvider({ adminApiUrl, bearerToken, channelToken },
      this.fetchImpl).updateProjectionEmail(providerInput);
  }

  async reenableProjection(input: Parameters<VendureCustomerProjectionProvider["reenableProjection"]>[0] &
    Readonly<{ channelTokenSecretRef: string }>) {
    const [adminApiUrl, bearerToken, channelToken] = await Promise.all([
      this.runtimeRegistry.vendureAdminApiUrlForDeploymentCell(input.deploymentCellId),
      this.runtimeRegistry.serviceBearerForDeploymentCell(input.deploymentCellId),
      this.secretRegistry.secretValue(input.channelTokenSecretRef),
    ]);
    const { channelTokenSecretRef: _secretRef, ...providerInput } = input;
    void _secretRef;
    return new VendureCustomerProjectionProvider({ adminApiUrl, bearerToken, channelToken },
      this.fetchImpl).reenableProjection(providerInput);
  }
}
