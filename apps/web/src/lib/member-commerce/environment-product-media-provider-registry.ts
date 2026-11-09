import "server-only";

import { z } from "zod";

import type { ProductMediaProviderRuntimeRegistry } from
  "./server-bound-product-media-provider";

const key = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/);
const secretEnvironmentName = z.string().regex(/^[A-Z][A-Z0-9_]{1,127}$/);
const localOrHttpsUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  const localHttp = url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  return !url.username && !url.password && !url.search && !url.hash &&
    (url.protocol === "https:" || localHttp);
});
const nextcloudEntry = z.object({
  webdavBaseUrl: localOrHttpsUrl,
  usernameSecretRef: key,
  appPasswordSecretRef: key,
  maxBytes: z.number().int().positive().max(50 * 1024 * 1024),
}).strict();
const vendureEntry = z.object({
  adminApiUrl: localOrHttpsUrl,
  bearerSecretRef: key,
}).strict();

function registry<T>(
  source: string | undefined,
  entry: z.ZodType<T>,
  code: string,
): Readonly<Record<string, T>> {
  if (!source?.trim()) throw new Error(`${code}_UNCONFIGURED`);
  let parsed: unknown;
  try { parsed = JSON.parse(source); } catch {
    throw new Error(`${code}_INVALID`);
  }
  const result = z.record(key, entry).safeParse(parsed);
  if (!result.success || Object.keys(result.data).length < 1 ||
      Object.keys(result.data).length > 1_000) {
    throw new Error(`${code}_INVALID`);
  }
  return Object.freeze(result.data);
}

export function createEnvironmentProductMediaProviderRuntimeRegistry(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ProductMediaProviderRuntimeRegistry {
  const nextcloud = registry(
    environment.CRAYS_PRODUCT_MEDIA_NEXTCLOUD_REGISTRY_JSON,
    nextcloudEntry,
    "PRODUCT_MEDIA_NEXTCLOUD_REGISTRY",
  );
  const vendure = registry(
    environment.CRAYS_PRODUCT_MEDIA_VENDURE_REGISTRY_JSON,
    vendureEntry,
    "PRODUCT_MEDIA_VENDURE_REGISTRY",
  );
  const secretReferences = registry(
    environment.CRAYS_COMMERCE_SECRET_REFERENCE_REGISTRY_JSON,
    secretEnvironmentName,
    "COMMERCE_SECRET_REFERENCE_REGISTRY",
  );
  const secret = (reference: string, code: string) => {
    const environmentName = secretReferences[reference];
    const value = environmentName ? environment[environmentName] : undefined;
    if (!value?.trim()) throw new Error(code);
    return value.trim();
  };
  return Object.freeze({
    async nextcloudForHostSession(hostSessionBindingId: string) {
      const value = nextcloud[hostSessionBindingId];
      if (!value) throw new Error("PRODUCT_MEDIA_NEXTCLOUD_SESSION_UNRESOLVED");
      return Object.freeze({
        webdavBaseUrl: value.webdavBaseUrl,
        username: secret(value.usernameSecretRef,
          "PRODUCT_MEDIA_NEXTCLOUD_USERNAME_UNRESOLVED"),
        appPassword: secret(value.appPasswordSecretRef,
          "PRODUCT_MEDIA_NEXTCLOUD_APP_PASSWORD_UNRESOLVED"),
        maxBytes: value.maxBytes,
      });
    },
    async vendureAdminForDeploymentCell(deploymentCellId: string) {
      const value = vendure[deploymentCellId];
      if (!value) throw new Error("PRODUCT_MEDIA_VENDURE_CELL_UNRESOLVED");
      return Object.freeze({
        adminApiUrl: value.adminApiUrl,
        bearerToken: secret(value.bearerSecretRef,
          "PRODUCT_MEDIA_VENDURE_BEARER_UNRESOLVED"),
      });
    },
    async channelToken(secretReference: string) {
      return secret(secretReference,
        "PRODUCT_MEDIA_CHANNEL_CREDENTIAL_UNRESOLVED");
    },
  });
}
