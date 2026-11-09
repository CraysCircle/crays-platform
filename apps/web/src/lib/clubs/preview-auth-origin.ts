type ClubsPreviewAuthOriginInput = Readonly<{
  requestUrl: string;
  requestHost?: string | null;
  vercelEnvironment?: string;
  configuredBaseUrl?: string;
  allowedPreviewHosts?: string;
}>;

function normalizeHost(value: string | null | undefined) {
  return value?.split(",")[0]?.trim().toLowerCase().replace(/\.$/, "").split(":")[0] ?? "";
}

function originForConfiguredPreview(
  configuredBaseUrl: string | undefined,
  allowedHosts: ReadonlySet<string>,
) {
  if (!configuredBaseUrl) return null;
  try {
    const configured = new URL(configuredBaseUrl);
    if (configured.protocol !== "https:" || !allowedHosts.has(normalizeHost(configured.hostname))) {
      return null;
    }
    return configured.origin;
  } catch {
    return null;
  }
}

/**
 * Keeps the Auth0 transaction cookie and callback on one explicitly admitted
 * Clubs Preview origin. Only the login start may redirect: redirecting an
 * in-flight callback would discard the host-bound transaction cookie.
 */
export function canonicalClubsPreviewAuthStartUrl(
  input: ClubsPreviewAuthOriginInput,
) {
  if (input.vercelEnvironment !== "preview") return null;

  const allowedHosts = new Set(
    (input.allowedPreviewHosts ?? "")
      .split(",")
      .map((host) => normalizeHost(host))
      .filter(Boolean),
  );
  if (allowedHosts.size === 0) return null;

  let request: URL;
  try {
    request = new URL(input.requestUrl);
  } catch {
    return null;
  }

  const requestHost = normalizeHost(input.requestHost ?? request.hostname);
  if (!allowedHosts.has(requestHost)) return null;
  if (request.pathname !== "/auth/login") return null;

  const canonicalOrigin = originForConfiguredPreview(
    input.configuredBaseUrl,
    allowedHosts,
  );
  if (!canonicalOrigin || request.origin === canonicalOrigin) return null;

  const target = new URL(request.pathname + request.search, canonicalOrigin);
  return target;
}
