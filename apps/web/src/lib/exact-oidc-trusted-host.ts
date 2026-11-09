import "server-only";

export type ExactOidcTrustedHostContext = Readonly<{
  host: string;
  application: "b2b" | "coffee" | "gym" | "clubs";
  verticalRoot: "coffee" | "gym" | "clubs" | null;
}>;

type HeaderReader = Readonly<{ get(name: string): string | null }>;
type Environment = Readonly<Record<string, string | undefined>>;

const HOST = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?(?::[0-9]{1,5})?$/;

function normalizeSingleHost(value: string | null): string | null {
  if (!value || value.includes(",")) return null;
  const candidate = value.trim().toLowerCase().replace(/\.$/, "");
  if (!HOST.test(candidate)) return null;
  const separator = candidate.lastIndexOf(":");
  const withoutPort = separator > -1 && candidate.indexOf(":") === separator
    ? candidate.slice(0, separator)
    : candidate;
  return withoutPort || null;
}

function previewHosts(value: string | undefined) {
  return new Set((value ?? "")
    .split(",")
    .map((host) => normalizeSingleHost(host))
    .filter((host): host is string => Boolean(host)));
}

function mappedHost(host: string, env: Environment): ExactOidcTrustedHostContext | null {
  if (host === "crays.pro" || host === "www.crays.pro") {
    return Object.freeze({ host, application: "b2b", verticalRoot: null });
  }
  if (host === "crays.coffee" || host === "www.crays.coffee") {
    return Object.freeze({ host, application: "coffee", verticalRoot: "coffee" });
  }
  if (host === "craysgym.com" || host === "www.craysgym.com") {
    return Object.freeze({ host, application: "gym", verticalRoot: "gym" });
  }
  if (host === "craysclub.com" || host === "www.craysclub.com") {
    return Object.freeze({ host, application: "clubs", verticalRoot: "clubs" });
  }
  if (env.VERCEL_ENV !== "preview") return null;
  const previewMappings = [
    ["CRAYS_B2B_PREVIEW_HOSTS", "b2b", null],
    ["CRAYS_COFFEE_PREVIEW_HOSTS", "coffee", "coffee"],
    ["CRAYS_GYM_PREVIEW_HOSTS", "gym", "gym"],
    ["CRAYS_CLUBS_PREVIEW_HOSTS", "clubs", "clubs"],
  ] as const;
  for (const [key, application, verticalRoot] of previewMappings) {
    if (previewHosts(env[key]).has(host)) {
      return Object.freeze({ host, application, verticalRoot });
    }
  }
  return null;
}

export function resolveExactOidcTrustedHost(
  headers: HeaderReader,
  env: Environment = process.env,
): ExactOidcTrustedHostContext | null {
  const direct = normalizeSingleHost(headers.get("host"));
  const forwardedRaw = headers.get("x-forwarded-host");
  const forwarded = forwardedRaw === null ? null : normalizeSingleHost(forwardedRaw);
  if (forwardedRaw !== null && !forwarded) return null;
  if (direct && forwarded && direct !== forwarded) return null;
  const host = forwarded ?? direct;
  return host ? mappedHost(host, env) : null;
}
