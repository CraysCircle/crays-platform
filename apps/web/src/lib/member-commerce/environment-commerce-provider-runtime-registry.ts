import "server-only";

import type { CommerceProviderRuntimeRegistry } from
  "./server-bound-vendure-adapter";

const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/;
const ENVIRONMENT_NAME = /^[A-Z][A-Z0-9_]{1,127}$/;

function exactRegistry(
  source: string | undefined,
  code: string,
): Readonly<Record<string, string>> {
  if (!source?.trim()) throw new Error(`${code}_UNCONFIGURED`);
  let value: unknown;
  try { value = JSON.parse(source); } catch {
    throw new Error(`${code}_INVALID`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${code}_INVALID`);
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length < 1 || entries.length > 1_000) {
    throw new Error(`${code}_INVALID`);
  }
  const result: Record<string, string> = {};
  for (const [key, item] of entries) {
    if (!REFERENCE.test(key) || typeof item !== "string" || !item.trim()) {
      throw new Error(`${code}_INVALID`);
    }
    result[key] = item.trim();
  }
  return Object.freeze(result);
}

export function createEnvironmentCommerceProviderRuntimeRegistry(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): CommerceProviderRuntimeRegistry {
  const cells = exactRegistry(
    environment.CRAYS_COMMERCE_DEPLOYMENT_CELL_REGISTRY_JSON,
    "COMMERCE_DEPLOYMENT_CELL_REGISTRY",
  );
  const secretReferences = exactRegistry(
    environment.CRAYS_COMMERCE_SECRET_REFERENCE_REGISTRY_JSON,
    "COMMERCE_SECRET_REFERENCE_REGISTRY",
  );
  for (const environmentName of Object.values(secretReferences)) {
    if (!ENVIRONMENT_NAME.test(environmentName)) {
      throw new Error("COMMERCE_SECRET_REFERENCE_REGISTRY_INVALID");
    }
  }
  return Object.freeze({
    async vendureShopApiUrlForDeploymentCell(deploymentCellId: string) {
      if (!REFERENCE.test(deploymentCellId) || !cells[deploymentCellId]) {
        throw new Error("COMMERCE_DEPLOYMENT_CELL_UNRESOLVED");
      }
      return cells[deploymentCellId];
    },
    async secretValue(secretReference: string) {
      const environmentName = REFERENCE.test(secretReference) ?
        secretReferences[secretReference] : undefined;
      const secret = environmentName ? environment[environmentName] : undefined;
      if (!secret?.trim()) {
        throw new Error("COMMERCE_CHANNEL_CREDENTIAL_UNRESOLVED");
      }
      return secret.trim();
    },
  });
}
