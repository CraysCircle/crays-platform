import { publicAmbassadorLocales, publicAmbassadorPath } from "./public-ambassador-saas-projection";
import type { createSaasPublicAmbassadorRepository } from "./public-ambassador-saas-repository";

type Repository = ReturnType<typeof createSaasPublicAmbassadorRepository>;
const route = "/api/crays/clubs/public/ambassadors";
const allowedOrigins = new Set([
  "https://www.craysclub.com", "https://craysclub.com",
]);

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}) {
  return Response.json(body, { status, headers: {
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders,
  } });
}

/** Public read only. Publication/upload/edit remain authenticated SaaS commands. */
export function createPublicAmbassadorReadHandler(repository: Repository, verifiedReleaseOrigin?: string) {
  const origins = new Set(allowedOrigins);
  if (verifiedReleaseOrigin) {
    const parsed = new URL(verifiedReleaseOrigin);
    const local = ["http://127.0.0.1:18895", "http://localhost:18895", "http://127.0.0.1:18790", "http://localhost:18790", "http://127.0.0.1:18925", "http://localhost:18925", "http://127.0.0.1:18926", "http://localhost:18926"].includes(parsed.origin);
    if (parsed.origin !== verifiedReleaseOrigin || parsed.username || parsed.password || (!local && parsed.protocol !== "https:")) {
      throw new Error("UNVERIFIED_PUBLIC_RELEASE_ORIGIN");
    }
    origins.add(verifiedReleaseOrigin);
  }
  return async function handle(request: Request): Promise<Response> {
    if (request.method !== "GET") return json({ status: "METHOD_NOT_ALLOWED" }, 405, { Allow: "GET" });
    const url = new URL(request.url);
    if (!origins.has(url.origin)) return json({ status: "ORIGIN_NOT_ADMITTED" }, 421);
    if (url.pathname !== route && !url.pathname.startsWith(route + "/")) {
      return json({ status: "NOT_FOUND" }, 404);
    }
    const queryKeys = [...url.searchParams.keys()];
    if (queryKeys.some(key => key !== "locale") || url.searchParams.getAll("locale").length !== 1) {
      return json({ status: "INVALID_QUERY" }, 400);
    }
    const locale = url.searchParams.get("locale")!;
    if (!(publicAmbassadorLocales as readonly string[]).includes(locale)) return json({ status: "INVALID_LOCALE" }, 400);
    const requestedSlug = url.pathname === route ? null : url.pathname.slice(route.length + 1);
    if (requestedSlug !== null) {
      try { publicAmbassadorPath(locale, requestedSlug); }
      catch { return json({ status: "INVALID_SLUG" }, 400); }
    }
    try {
      if (requestedSlug === null) {
        const profiles = await repository.list(locale);
        return json({ schema: "crays.clubs.public-ambassadors.v1", locale, profiles }, 200);
      }
      const profile = await repository.find(locale, requestedSlug);
      return profile
        ? json({ schema: "crays.clubs.public-ambassador.v1", locale, profile }, 200)
        : json({ status: "NOT_FOUND" }, 404);
    } catch {
      return json({ status: "PUBLIC_AMBASSADOR_SOURCE_UNAVAILABLE" }, 503);
    }
  };
}
