import "server-only";

import type { CommerceProviderRuntimeRegistry } from
  "./server-bound-vendure-adapter";
import type { HistoricalOrderSnapshotProvider } from
  "./historical-order-snapshot-recovery";
import {
  VendureHistoricalOrderSnapshotProvider,
} from "./vendure-historical-order-snapshot-provider";

const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/;
const ENVIRONMENT_NAME = /^[A-Z][A-Z0-9_]{1,127}$/;

export interface HistoricalOrderProviderRuntimeRegistry {
  vendureAdminApiUrlForDeploymentCell(deploymentCellId: string): Promise<string>;
  serviceBearerForDeploymentCell(deploymentCellId: string): Promise<string>;
}

function registry(source: string | undefined, code: string) {
  if (!source?.trim()) throw new Error(`${code}_UNCONFIGURED`);
  let value: unknown;
  try { value = JSON.parse(source); } catch { throw new Error(`${code}_INVALID`); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${code}_INVALID`);
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length < 1 || entries.length > 1_000) throw new Error(`${code}_INVALID`);
  const result: Record<string, string> = {};
  for (const [key, item] of entries) {
    if (!REFERENCE.test(key) || typeof item !== "string" || !item.trim()) {
      throw new Error(`${code}_INVALID`);
    }
    result[key] = item.trim();
  }
  return Object.freeze(result);
}

export function createEnvironmentHistoricalOrderProviderRuntimeRegistry(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): HistoricalOrderProviderRuntimeRegistry {
  const urls = registry(
    environment.CRAYS_COMMERCE_ADMIN_DEPLOYMENT_CELL_REGISTRY_JSON,
    "HISTORICAL_ORDER_ADMIN_CELL_REGISTRY",
  );
  const bearerReferences = registry(
    environment.CRAYS_COMMERCE_ADMIN_SERVICE_BEARER_REGISTRY_JSON,
    "HISTORICAL_ORDER_SERVICE_BEARER_REGISTRY",
  );
  if (Object.values(bearerReferences).some((name) => !ENVIRONMENT_NAME.test(name))) {
    throw new Error("HISTORICAL_ORDER_SERVICE_BEARER_REGISTRY_INVALID");
  }
  return Object.freeze({
    async vendureAdminApiUrlForDeploymentCell(deploymentCellId: string) {
      if (!REFERENCE.test(deploymentCellId) || !urls[deploymentCellId]) {
        throw new Error("HISTORICAL_ORDER_ADMIN_CELL_UNRESOLVED");
      }
      return urls[deploymentCellId];
    },
    async serviceBearerForDeploymentCell(deploymentCellId: string) {
      const environmentName = REFERENCE.test(deploymentCellId)
        ? bearerReferences[deploymentCellId] : undefined;
      const value = environmentName ? environment[environmentName] : undefined;
      if (!value?.trim()) throw new Error("HISTORICAL_ORDER_SERVICE_BEARER_UNRESOLVED");
      return value.trim();
    },
  });
}

export class ServerBoundHistoricalOrderSnapshotProvider
implements HistoricalOrderSnapshotProvider {
  constructor(
    private readonly registry: HistoricalOrderProviderRuntimeRegistry,
    private readonly commerceRegistry: Pick<CommerceProviderRuntimeRegistry, "secretValue">,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async readExactReceipt(input: Parameters<HistoricalOrderSnapshotProvider["readExactReceipt"]>[0]) {
    const [adminApiUrl, bearerToken, channelToken] = await Promise.all([
      this.registry.vendureAdminApiUrlForDeploymentCell(input.deploymentCellId),
      this.registry.serviceBearerForDeploymentCell(input.deploymentCellId),
      this.commerceRegistry.secretValue(input.channelTokenSecretRef),
    ]);
    return new VendureHistoricalOrderSnapshotProvider({
      adminApiUrl, bearerToken, channelToken,
    }, this.fetchImpl).readExactReceipt(input);
  }
}
