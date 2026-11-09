import "server-only";

/** Extra public-read origin is server configuration, never an incoming Host or forwarded header. */
export function getVerifiedClubsPublicReleaseOrigin(env: Record<string, string | undefined> = process.env) {
  const platformHost = env.VERCEL_URL;
  if (env.VERCEL === "1" && env.VERCEL_ENV === "production" && platformHost) {
    if (!/^crays-franchise-[a-z0-9]+-enochroot\.vercel\.app$/.test(platformHost)) {
      throw new Error("UNADMITTED_CLUBS_RELEASE_DEPLOYMENT");
    }
    // This one platform-provided hostname is admitted, not other matching deployments.
    return `https://${platformHost}`;
  }
  const local = env.CRAYS_CLUBS_LOCAL_PUBLIC_RELEASE_ORIGIN;
  if (local !== undefined) {
    if (env.VERCEL !== undefined || !["http://127.0.0.1:18895", "http://localhost:18895", "http://127.0.0.1:18790", "http://localhost:18790", "http://127.0.0.1:18925", "http://localhost:18925", "http://127.0.0.1:18926", "http://localhost:18926"].includes(local)) {
      throw new Error("UNADMITTED_CLUBS_LOCAL_RELEASE_ORIGIN");
    }
    if (["http://127.0.0.1:18925", "http://localhost:18925"].includes(local) && env.NODE_ENV !== "development") {
      throw new Error("CLUBS_QA_ORIGIN_REQUIRES_DEVELOPMENT_RUNTIME");
    }
    return local;
  }
  return undefined;
}
