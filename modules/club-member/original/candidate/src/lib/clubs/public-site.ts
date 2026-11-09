export const CLUBS_LOCALES = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;

export type ClubsLocale = (typeof CLUBS_LOCALES)[number];

export const CLUBS_PUBLIC_RUNTIME_CONTRACT = Object.freeze({
  applicationContext: "clubs",
  canonicalHost: "www.craysclub.com",
  canonicalProject: "crays-franchise",
  graphqlEndpoint: "/api/graphql",
  graphqlMode: "persisted-operations-only",
  identityAuthority: "CRAYS Core via shared Auth0/BFF context",
  legacyDeploymentAuthority: "migration-source-only",
  vertical: "clubs",
});

export function isClubsLocale(value: string): value is ClubsLocale {
  return CLUBS_LOCALES.includes(value as ClubsLocale);
}

export function clubsPath(locale: ClubsLocale, path = ""): string {
  const suffix = path ? `/${path.replace(/^\/+/, "")}` : "";
  return `/${locale}${suffix}`;
}

export function clubsCanonicalUrl(locale: ClubsLocale, path = ""): string {
  const normalizedPath = path.replace(/^\/+|\/+$/g, "");
  const origin = `https://${CLUBS_PUBLIC_RUNTIME_CONTRACT.canonicalHost}`;

  if (locale === "en" && normalizedPath === "") {
    return `${origin}/`;
  }

  return `${origin}${clubsPath(locale, normalizedPath)}`;
}

export function isPermittedClubsPublicHost(hostHeader: string | null): boolean {
  const host = (hostHeader ?? "").split(":", 1)[0].trim().toLowerCase();
  if (host === "craysclub.com" || host === "www.craysclub.com") return true;

  if (process.env.NODE_ENV !== "production" && process.env.CRAYS_CLUBS_LOCAL_PREVIEW === "true") {
    if (host === "127.0.0.1" || host === "localhost") return true;
  }

  const exactVercelPreviewHost =
    process.env.VERCEL_ENV === "preview"
      ? (process.env.VERCEL_URL ?? "").trim().toLowerCase()
      : "";
  if (exactVercelPreviewHost && host === exactVercelPreviewHost) return true;

  const previewHosts = (process.env.CRAYS_CLUBS_PREVIEW_HOSTS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return previewHosts.includes(host);
}
