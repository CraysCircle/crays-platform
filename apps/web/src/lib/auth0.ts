import {
  Auth0Client,
  filterDefaultIdTokenClaims,
} from "@auth0/nextjs-auth0/server";
import { createHash } from "node:crypto";
import {
  revokeTenantSession,
  tenantSessionCookieName,
} from "@/db/identity-tenant-lifecycle-repository";
import { normalizeOidcIssuer } from "@/lib/exact-oidc-identity";
import { exactOidcSessionAuthority } from "@/lib/exact-oidc-core-binding-preflight";
import { decodeJwt } from "jose";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { BLOCK199_SESSION_LIMITS } from "@/lib/block199-strong-auth-policy";
import {
  BLOCK199_FEDERATED_AMR_CLAIM,
  BLOCK199_FEDERATED_AUTH_TIME_CLAIM,
  BLOCK199_FEDERATED_CONNECTION_CLAIM,
  BLOCK199_FEDERATED_ISSUER_CLAIM,
  BLOCK199_MICROSOFT_OIDC_CONNECTION,
  BLOCK199_MICROSOFT_OIDC_ISSUER,
  block199FederatedMicrosoftAssurance,
} from "@/lib/block199-federated-auth";
import { canonicalClubsPreviewAuthStartUrl } from "@/lib/clubs/preview-auth-origin";
import { sanitizeClubsReturnTo } from "@/lib/clubs/member-auth-contract";

type Auth0Application = "b2b" | "coffee" | "gym" | "clubs";
type Auth0ClientProfile = Auth0Application | "clubs-b2b";

export type ExactB2bServerSessionFailureBoundary =
  | "sdk_read_error"
  | "sdk_session_missing"
  | "exact_input_missing"
  | "issuer_mismatch"
  | "subject_mismatch"
  | "email_verified_missing"
  | "email_verified_false"
  | "email_invalid"
  | "auth_time_invalid"
  | "provenance_invalid";

export type ExactB2bSdkSessionExceptionClass =
  | "SessionDomainMismatchError"
  | "SdkError"
  | "UnknownAuth0Error";

export type ExactB2bServerSessionProofRead =
  | Readonly<{
      status: "ready";
      proofInput: Readonly<{
        issuerSha256: string;
        clientIdSha256: string;
        subjectSha256: string;
        verifiedEmailSha256: string;
        emailVerified: true;
        authenticatedAt: string;
        authoritySource: "exact_b2b_session";
      }>;
    }>
  | Readonly<{
      status: "unavailable";
      failureBoundary: ExactB2bServerSessionFailureBoundary;
      exceptionClass?: ExactB2bSdkSessionExceptionClass;
    }>;

export type ExactOidcServerSessionRead =
  | Readonly<{ status: "signed_out" }>
  | Readonly<{ status: "invalid_session_provenance" }>
  | Readonly<{
      status: "ready";
      validatedIssuer: string;
      validatedSubject: string;
      serverConfiguredClientId: string;
      providerProfile: Readonly<{
        name: string | null;
        email: string | null;
        emailVerified: boolean;
      }>;
    }>;

function envValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

function normalizeHost(value: string | null | undefined) {
  return (
    value
      ?.split(",")[0]
      ?.trim()
      .toLowerCase()
      .replace(/\.$/, "")
      .split(":")[0] ?? ""
  );
}

function isExplicitClubsPreviewHost(host: string) {
  if (process.env.VERCEL_ENV !== "preview" || !host) return false;
  const allowedHosts = (process.env.CRAYS_CLUBS_PREVIEW_HOSTS ?? "")
    .split(",")
    .map((value) => normalizeHost(value))
    .filter(Boolean);
  return allowedHosts.includes(host);
}

function isExplicitClubsLocalAuthHost(host: string) {
  if (process.env.NODE_ENV === "production" || !host) return false;
  if (host !== "127.0.0.1" && host !== "localhost") return false;
  const allowedHosts = (process.env.CRAYS_CLUBS_LOCAL_AUTH_HOSTS ?? "")
    .split(",")
    .map((value) => normalizeHost(value))
    .filter(Boolean);
  return allowedHosts.includes(host);
}

function isExplicitClubsB2bPreviewHost(host: string) {
  if (!host) return false;
  const localPreview =
    process.env.NODE_ENV !== "production" &&
    (host === "localhost" || host === "127.0.0.1");
  if (process.env.VERCEL_ENV !== "preview" && !localPreview) return false;
  const allowedHosts = (process.env.CRAYS_CLUBS_B2B_PREVIEW_HOSTS ?? "")
    .split(",")
    .map((value) => normalizeHost(value))
    .filter(Boolean);
  return allowedHosts.includes(host);
}

function applicationForClientProfile(
  profile: Auth0ClientProfile,
): Auth0Application {
  return profile === "clubs-b2b" ? "b2b" : profile;
}

function clientProfileForHost(
  host: string | null | undefined,
): Auth0ClientProfile {
  const normalized = normalizeHost(host);
  if (normalized === "crays.coffee" || normalized === "www.crays.coffee")
    return "coffee";
  if (normalized === "craysgym.com" || normalized === "www.craysgym.com")
    return "gym";
  const clubsB2cHost =
    normalized === "craysclub.com" ||
    normalized === "www.craysclub.com" ||
    isExplicitClubsPreviewHost(normalized) ||
    isExplicitClubsLocalAuthHost(normalized);
  const clubsB2bHost = isExplicitClubsB2bPreviewHost(normalized);
  if (clubsB2cHost && clubsB2bHost) {
    throw new Error("Overlapping Clubs B2C and B2B Auth0 host binding");
  }
  if (clubsB2cHost) return "clubs";
  if (clubsB2bHost) return "clubs-b2b";
  return "b2b";
}

function clientProfileForOrigin(origin: string | undefined): Auth0ClientProfile {
  if (!origin) return "b2b";
  try {
    return clientProfileForHost(new URL(origin).hostname);
  } catch {
    return "b2b";
  }
}

function applicationConfig(profile: Auth0ClientProfile) {
  if (profile === "coffee") {
    return {
      appBaseUrl:
        envValue("AUTH0_COFFEE_BASE_URL") ?? "https://www.crays.coffee",
      domain: envValue("AUTH0_DOMAIN", "AUTH0_ISSUER_BASE_URL"),
      clientId: envValue("AUTH0_COFFEE_CLIENT_ID"),
      clientSecret: envValue("AUTH0_COFFEE_CLIENT_SECRET"),
      secret: envValue("AUTH0_COFFEE_SECRET"),
    };
  }

  if (profile === "gym") {
    return {
      appBaseUrl: envValue("AUTH0_GYM_BASE_URL") ?? "https://www.craysgym.com",
      domain: envValue("AUTH0_DOMAIN", "AUTH0_ISSUER_BASE_URL"),
      clientId: envValue("AUTH0_GYM_CLIENT_ID", "AUTH0_CLIENT_ID"),
      clientSecret: envValue("AUTH0_GYM_CLIENT_SECRET", "AUTH0_CLIENT_SECRET"),
      secret: envValue("AUTH0_GYM_SECRET", "AUTH0_SECRET"),
    };
  }

  if (profile === "clubs") {
    return {
      appBaseUrl:
        envValue("AUTH0_CLUBS_BASE_URL") ?? "https://www.craysclub.com",
      domain: envValue(
        "AUTH0_CLUBS_DOMAIN",
        "AUTH0_DOMAIN",
        "AUTH0_ISSUER_BASE_URL",
      ),
      clientId: envValue("AUTH0_CLUBS_CLIENT_ID"),
      clientSecret: envValue("AUTH0_CLUBS_CLIENT_SECRET"),
      secret: envValue("AUTH0_CLUBS_SECRET"),
    };
  }

  if (profile === "clubs-b2b") {
    return {
      appBaseUrl: envValue("AUTH0_CLUBS_B2B_BASE_URL"),
      domain: envValue("AUTH0_CLUBS_B2B_DOMAIN"),
      clientId: envValue("AUTH0_CLUBS_B2B_CLIENT_ID"),
      clientSecret: envValue("AUTH0_CLUBS_B2B_CLIENT_SECRET"),
      secret: envValue("AUTH0_CLUBS_B2B_SECRET"),
    };
  }

  return {
    appBaseUrl: envValue("APP_BASE_URL", "AUTH0_BASE_URL"),
    domain: envValue("AUTH0_DOMAIN", "AUTH0_ISSUER_BASE_URL"),
    clientId: envValue("AUTH0_CLIENT_ID"),
    clientSecret: envValue("AUTH0_CLIENT_SECRET"),
    secret: envValue("AUTH0_SECRET"),
  };
}

function safeCallbackError(error: unknown) {
  const candidate = error as {
    name?: unknown;
    code?: unknown;
    cause?: { name?: unknown; code?: unknown };
  };

  return {
    errorType:
      typeof candidate?.name === "string"
        ? candidate.name
        : "UnknownAuth0Error",
    errorCode:
      typeof candidate?.code === "string" ? candidate.code : "unknown_error",
    causeType:
      typeof candidate?.cause?.name === "string"
        ? candidate.cause.name
        : undefined,
    causeCode:
      typeof candidate?.cause?.code === "string"
        ? candidate.cause.code
        : undefined,
  };
}

function runtimeConfigState(
  profile: Auth0ClientProfile,
  requestOrigin?: string,
) {
  const application = applicationForClientProfile(profile);
  const config = applicationConfig(profile);
  const configuredBaseUrl = config.appBaseUrl;
  let baseUrlMatchesRequestOrigin = true;
  if (requestOrigin && configuredBaseUrl) {
    try {
      baseUrlMatchesRequestOrigin =
        new URL(configuredBaseUrl).origin === new URL(requestOrigin).origin;
    } catch {
      baseUrlMatchesRequestOrigin = false;
    }
  }
  return {
    application,
    appBaseUrlConfigured: Boolean(configuredBaseUrl),
    baseUrlMatchesRequestOrigin,
    domainConfigured: Boolean(config.domain),
    clientIdConfigured: Boolean(config.clientId),
    clientSecretConfigured: Boolean(config.clientSecret),
    secretConfigured: Boolean(config.secret),
    audienceConfigured: Boolean(
      profile === "clubs"
        ? envValue("AUTH0_CLUBS_AUDIENCE", "AUTH0_AUDIENCE")
        : profile === "clubs-b2b"
          ? envValue("AUTH0_CLUBS_B2B_AUDIENCE")
          : envValue("AUTH0_AUDIENCE"),
    ),
  };
}

export function getAuth0RuntimeConfigState(requestOrigin?: string) {
  return runtimeConfigState(clientProfileForOrigin(requestOrigin), requestOrigin);
}

function requestOriginFor(request: Request | NextRequest) {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const directHost = request.headers.get("host")?.split(",")[0]?.trim();
  let parsed: URL | null = null;
  try {
    parsed = new URL(request.url);
  } catch {
    parsed = null;
  }
  const host = forwardedHost || directHost || parsed?.host;
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProtocol || parsed?.protocol.replace(":", "") || "https";
  return host ? `${protocol}://${host}` : undefined;
}

export function getAuth0RuntimeConfigStateForRequest(
  request: Request | NextRequest,
) {
  return runtimeConfigState(
    clientProfileForRequest(request),
    requestOriginFor(request),
  );
}

function sanitizeClubsB2bReturnTo(
  value: string | undefined,
  fallback = "/en/clubs/operations",
) {
  if (!value) return fallback;
  try {
    const base = new URL("https://clubs-b2b.invalid");
    const parsed = new URL(value, base);
    if (
      parsed.origin !== base.origin ||
      parsed.username ||
      parsed.password ||
      parsed.hash ||
      parsed.pathname !== "/en/clubs/operations"
    ) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}

function createAuth0Client(profile: Auth0ClientProfile) {
  const application = applicationForClientProfile(profile);
  const config = applicationConfig(profile);
  return new Auth0Client({
    domain: config.domain,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    appBaseUrl: config.appBaseUrl,
    secret: config.secret,
    signInReturnToPath:
      profile === "clubs-b2b"
        ? "/en/clubs/operations"
        : application === "clubs"
        ? "/en/account"
        : application === "coffee"
          ? "/coffee/account"
          : "/account/continue",
    // Keep concurrent login attempts isolated. Auth0's SDK suffixes each
    // transaction cookie with its state value, preventing one tab or abandoned
    // authorization attempt from invalidating another callback transaction.
    enableParallelTransactions: true,
    beforeSessionSaved: async (session, idToken) => {
      // The SDK passes the already validated ID token to this hook. Some Auth0
      // standard assurance claims are not copied onto `session.user` before the
      // hook runs, so read those claims from the validated token payload and
      // persist only the assurance values and exact validated issuer required
      // by server-side owner and canonical OIDC identity gates. The issuer is
      // part of identity; subject alone is never a CRAYS merge key.
      const tokenClaims = idToken
        ? (() => {
            try {
              return decodeJwt(idToken);
            } catch {
              return null;
            }
          })()
        : null;
      const rawAuthenticationMethods = session.user.amr ?? tokenClaims?.amr;
      const rawAuthenticationContextClass =
        session.user.acr ?? tokenClaims?.acr;
      const rawAuthenticatedAtSeconds =
        session.user.auth_time ?? tokenClaims?.auth_time;
      const exactIssuer = normalizeOidcIssuer(tokenClaims?.iss);
      const authenticationMethods = Array.isArray(rawAuthenticationMethods)
        ? rawAuthenticationMethods.filter(
            (method): method is string => typeof method === "string",
          )
        : undefined;
      const authenticationContextClass =
        typeof rawAuthenticationContextClass === "string"
          ? rawAuthenticationContextClass
          : undefined;
      const authenticatedAtSeconds =
        typeof rawAuthenticatedAtSeconds === "number" &&
        Number.isFinite(rawAuthenticatedAtSeconds)
          ? rawAuthenticatedAtSeconds
          : undefined;
      const federatedMicrosoftAssurance =
        block199FederatedMicrosoftAssurance({
          tokenClaims,
          expectedIssuer: BLOCK199_MICROSOFT_OIDC_ISSUER,
        });
      const validatedFederatedMicrosoftClaims =
        federatedMicrosoftAssurance
          ? {
              [BLOCK199_FEDERATED_CONNECTION_CLAIM]:
                BLOCK199_MICROSOFT_OIDC_CONNECTION,
              [BLOCK199_FEDERATED_ISSUER_CLAIM]:
                BLOCK199_MICROSOFT_OIDC_ISSUER,
              [BLOCK199_FEDERATED_AMR_CLAIM]:
                federatedMicrosoftAssurance.methods,
              [BLOCK199_FEDERATED_AUTH_TIME_CLAIM]:
                federatedMicrosoftAssurance.authenticatedAtSeconds,
            }
          : {};

      return {
        ...session,
        user: {
          ...filterDefaultIdTokenClaims(session.user),
          ...(authenticationMethods ? { amr: authenticationMethods } : {}),
          ...(authenticationContextClass
            ? { acr: authenticationContextClass }
            : {}),
          ...(authenticatedAtSeconds !== undefined
            ? { auth_time: authenticatedAtSeconds }
            : {}),
          iss: exactIssuer,
          ...validatedFederatedMicrosoftClaims,
        },
      };
    },
    onCallback: async (error, context) => {
      if (error) {
        // Intentionally log only stable error classifications. Callback URLs,
        // authorization codes, state, cookies, tokens and user data are excluded.
        console.error("AUTH0_CALLBACK_FAILED", safeCallbackError(error));
        return new NextResponse(
          "Authentication could not be completed. Please start again.",
          {
            status: 500,
          },
        );
      }

      const fallbackReturnTo =
        profile === "clubs-b2b"
          ? "/en/clubs/operations"
          : application === "clubs"
            ? "/en/account"
            : "/account/continue";
      const baseUrl = context.appBaseUrl ?? config.appBaseUrl;
      if (!baseUrl) {
        console.error("AUTH0_CALLBACK_FAILED", {
          errorType: "InvalidConfigurationError",
          errorCode: "missing_app_base_url",
        });
        return new NextResponse(
          "Authentication could not be completed. Please start again.",
          {
            status: 500,
          },
        );
      }

      const returnTo =
        profile === "clubs-b2b"
          ? sanitizeClubsB2bReturnTo(context.returnTo, fallbackReturnTo)
          : application === "clubs"
          ? sanitizeClubsReturnTo(context.returnTo, fallbackReturnTo)
          : context.returnTo || fallbackReturnTo;

      return NextResponse.redirect(new URL(returnTo, baseUrl));
    },
    session: {
      rolling: true,
      absoluteDuration: BLOCK199_SESSION_LIMITS.auth0CookieAbsoluteSeconds,
      inactivityDuration: BLOCK199_SESSION_LIMITS.auth0CookieInactivitySeconds,
    },
    logoutStrategy: "oidc",
    includeIdTokenHintInOIDCLogoutUrl: true,
    enableAccessTokenEndpoint: false,
    authorizationParameters: {
      scope:
        (profile === "clubs-b2b"
          ? envValue("AUTH0_CLUBS_B2B_SCOPE")
          : application === "clubs"
          ? envValue("AUTH0_CLUBS_SCOPE", "AUTH0_SCOPE")
          : envValue("AUTH0_SCOPE")) ?? "openid profile email offline_access",
      audience:
        profile === "clubs-b2b"
          ? envValue("AUTH0_CLUBS_B2B_AUDIENCE")
        : application === "clubs"
          ? envValue("AUTH0_CLUBS_AUDIENCE", "AUTH0_AUDIENCE")
          : envValue("AUTH0_AUDIENCE"),
      ...(profile === "clubs-b2b"
        ? {
            connection: BLOCK199_MICROSOFT_OIDC_CONNECTION,
            max_age:
              BLOCK199_SESSION_LIMITS.privilegedReauthenticationSeconds,
          }
        : {}),
    },
  });
}

type Auth0ClientInstance = ReturnType<typeof createAuth0Client>;

const auth0Clients = new Map<Auth0ClientProfile, Auth0ClientInstance>();

function clientForProfile(profile: Auth0ClientProfile) {
  const existing = auth0Clients.get(profile);
  if (existing) return existing;

  // Instantiate only the client selected by the trusted request host. Eagerly
  // constructing every CRAYS profile makes unrelated, intentionally absent
  // credentials emit Auth0 configuration errors on public Clubs requests.
  const client = createAuth0Client(profile);
  auth0Clients.set(profile, client);
  return client;
}

function clientForRequest(request: Request | NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  let host = forwardedHost ?? request.headers.get("host");
  if (!host) {
    try {
      host = new URL(request.url).host;
    } catch {
      host = null;
    }
  }
  return clientForProfile(clientProfileForHost(host));
}

function clientProfileForRequest(
  request: Request | NextRequest,
): Auth0ClientProfile {
  const forwardedHost = request.headers.get("x-forwarded-host");
  let host = forwardedHost ?? request.headers.get("host");
  if (!host) {
    try {
      host = new URL(request.url).host;
    } catch {
      host = null;
    }
  }
  return clientProfileForHost(host);
}

function applicationForRequest(
  request: Request | NextRequest,
): Auth0Application {
  return applicationForClientProfile(clientProfileForRequest(request));
}

async function clientProfileForRequestContext() {
  const requestHeaders = await headers();
  return clientProfileForHost(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
  );
}

function sanitizeClubsAuthNavigation(request: Request | NextRequest) {
  if (applicationForRequest(request) !== "clubs") return null;
  const url = new URL(request.url);
  if (url.pathname !== "/auth/login" && url.pathname !== "/auth/logout")
    return null;
  const rawReturnTo = url.searchParams.get("returnTo");
  if (rawReturnTo === null) return null;
  const safeReturnTo = sanitizeClubsReturnTo(
    rawReturnTo,
    url.pathname === "/auth/logout" ? "/en" : "/en/account",
  );
  if (safeReturnTo === rawReturnTo) return null;
  url.searchParams.set("returnTo", safeReturnTo);
  return NextResponse.redirect(url, 307);
}

function isExactClubsLogoutRequest(request: Request | NextRequest) {
  return (
    applicationForRequest(request) === "clubs" &&
    new URL(request.url).pathname === "/auth/logout"
  );
}

const clubsLogoutReturnCookieName = "crays_clubs_logout_return_v1";

function clubsLogoutReturnCookieOptions() {
  return {
    httpOnly: true,
    secure: new URL(applicationConfig("clubs").appBaseUrl!).protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
  };
}

function completedClubsLogoutNavigation(request: NextRequest) {
  if (applicationForRequest(request) !== "clubs" ||
      new URL(request.url).pathname !== "/") return null;
  const returnPath = request.cookies.get(clubsLogoutReturnCookieName)?.value;
  if (!returnPath) return null;
  const safeReturnPath = sanitizeClubsReturnTo(returnPath, "/en");
  const response = NextResponse.redirect(
    new URL(safeReturnPath, applicationConfig("clubs").appBaseUrl), 307,
  );
  response.cookies.set(clubsLogoutReturnCookieName, "", {
    ...clubsLogoutReturnCookieOptions(), maxAge: 0, expires: new Date(0),
  });
  return response;
}

function clearClubsTenantSessionCookie(response: NextResponse) {
  response.cookies.set(tenantSessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
}

async function revokeClubsTenantSessionForLogout(request: NextRequest) {
  const sessionToken = request.cookies
    .get(tenantSessionCookieName)
    ?.value.trim();
  if (!sessionToken) return true;

  try {
    await revokeTenantSession(sessionToken, null, "user_sign_out");
    return true;
  } catch {
    return false;
  }
}

const AUTH_REQUIRED_PATH_ROOTS = [
  "/analytics",
  "/auth",
  "/chat",
  "/crm",
  "/dashboard",
  "/erp",
  "/files",
  "/hr",
  "/learning",
  "/loans",
  "/operations",
  "/project",
  "/settings",
  "/sites",
  "/support",
  "/sync",
] as const;

type Auth0RuntimeState = ReturnType<
  typeof getAuth0RuntimeConfigStateForRequest
>;

function auth0ProviderConfigured(state: Auth0RuntimeState) {
  return (
    state.appBaseUrlConfigured &&
    state.domainConfigured &&
    state.clientIdConfigured &&
    state.clientSecretConfigured &&
    state.secretConfigured
  );
}

function auth0RuntimeReady(state: Auth0RuntimeState) {
  return auth0ProviderConfigured(state) && state.baseUrlMatchesRequestOrigin;
}

function requiresConfiguredAuth(request: Request | NextRequest) {
  const pathname = new URL(request.url).pathname;
  return (
    pathname.startsWith("/api/crays/auth/") ||
    AUTH_REQUIRED_PATH_ROOTS.some(
      (root) => pathname === root || pathname.startsWith(`${root}/`),
    )
  );
}

export const auth0 = {
  async middleware(request: NextRequest) {
    const completedLogout = completedClubsLogoutNavigation(request);
    if (completedLogout) return completedLogout;
    const runtimeState = getAuth0RuntimeConfigStateForRequest(request);
    if (auth0ProviderConfigured(runtimeState)) {
      const sanitizedNavigation = sanitizeClubsAuthNavigation(request);
      if (sanitizedNavigation) return sanitizedNavigation;

      const requestHost =
        request.headers.get("x-forwarded-host") ?? request.headers.get("host");
      const canonicalPreviewAuthStart = canonicalClubsPreviewAuthStartUrl({
        requestUrl: request.url,
        requestHost,
        vercelEnvironment: process.env.VERCEL_ENV,
        configuredBaseUrl: applicationConfig("clubs").appBaseUrl,
        allowedPreviewHosts: process.env.CRAYS_CLUBS_PREVIEW_HOSTS,
      });
      if (canonicalPreviewAuthStart) {
        return NextResponse.redirect(canonicalPreviewAuthStart, 307);
      }
    }

    if (!auth0RuntimeReady(runtimeState)) {
      if (requiresConfiguredAuth(request)) {
        return new NextResponse(
          "Secure sign-in is not configured for this application.",
          {
            status: 503,
            headers: { "cache-control": "no-store" },
          },
        );
      }
      return NextResponse.next();
    }

    if (isExactClubsLogoutRequest(request)) {
      const tenantSessionRevocationReady =
        await revokeClubsTenantSessionForLogout(request);
      if (!tenantSessionRevocationReady) {
        return new NextResponse(
          "Sign-out could not be completed. Please retry.",
          {
            status: 503,
            headers: { "cache-control": "no-store" },
          },
        );
      }

      // Auth0 requires an absolute post_logout_redirect_uri; preserve the
      // validated Club return path without accepting a caller-selected host.
      const logoutUrl = new URL(request.url);
      const returnPath = sanitizeClubsReturnTo(
        logoutUrl.searchParams.get("returnTo"), "/en",
      );
      logoutUrl.searchParams.set(
        "returnTo",
        applicationConfig("clubs").appBaseUrl!,
      );
      const logoutRequest = new NextRequest(logoutUrl, {
        method: request.method,
        headers: request.headers,
      });
      const response = await clientForRequest(request).middleware(logoutRequest);
      clearClubsTenantSessionCookie(response);
      response.cookies.set(clubsLogoutReturnCookieName, returnPath, {
        ...clubsLogoutReturnCookieOptions(), maxAge: 120,
      });
      return response;
    }

    return clientForRequest(request).middleware(request);
  },
  async getSession(request?: NextRequest) {
    const profile = request
      ? clientProfileForRequest(request)
      : await clientProfileForRequestContext();
    if (!auth0ProviderConfigured(runtimeConfigState(profile))) return null;
    // Route Handlers must use the zero-argument SDK overload so Auth0 reads
    // the current async request cookie store. The request is used only for
    // the server-side application/client selection above.
    return clientForProfile(profile).getSession();
  },
};

function exactB2bUnavailable(
  failureBoundary: ExactB2bServerSessionFailureBoundary,
  exceptionClass?: ExactB2bSdkSessionExceptionClass,
): ExactB2bServerSessionProofRead {
  return Object.freeze({
    status: "unavailable",
    failureBoundary,
    ...(exceptionClass ? { exceptionClass } : {}),
  });
}

function exactB2bSdkSessionExceptionClass(
  error: unknown,
): ExactB2bSdkSessionExceptionClass {
  const name =
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
      ? error.name
      : "";
  if (name === "SessionDomainMismatchError") {
    return "SessionDomainMismatchError";
  }
  if (name === "SdkError") return "SdkError";
  return "UnknownAuth0Error";
}

function normalizedExactB2bVerifiedEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().normalize("NFKC").toLowerCase();
  if (
    normalized.length === 0 ||
    normalized.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export async function getExactB2bServerSessionProofInput(
  request: NextRequest,
): Promise<ExactB2bServerSessionProofRead> {
  const profile = clientProfileForRequest(request);
  if (profile !== "clubs-b2b") {
    return exactB2bUnavailable("exact_input_missing");
  }
  if (!auth0ProviderConfigured(runtimeConfigState(profile))) {
    return exactB2bUnavailable("exact_input_missing");
  }

  const client = clientForProfile(profile);
  let session: Awaited<ReturnType<typeof client.getSession>>;
  try {
    // App Router Route Handlers use the zero-argument SDK overload so the
    // SDK reads the current async request cookies exactly once.
    session = await client.getSession();
  } catch (error) {
    return exactB2bUnavailable(
      "sdk_read_error",
      exactB2bSdkSessionExceptionClass(error),
    );
  }
  if (!session?.user) return exactB2bUnavailable("sdk_session_missing");

  const issuer = session.user.iss;
  const subject = session.user.sub;
  const clientId = applicationConfig(profile).clientId;
  if (
    typeof issuer !== "string" ||
    typeof subject !== "string" ||
    !clientId
  ) {
    return exactB2bUnavailable("exact_input_missing");
  }

  let authority;
  try {
    authority = exactOidcSessionAuthority({
      validatedIssuer: issuer,
      validatedSubject: subject,
      serverConfiguredClientId: clientId,
    });
  } catch {
    return exactB2bUnavailable("provenance_invalid");
  }
  if (issuer !== authority.identity.issuer) {
    return exactB2bUnavailable("issuer_mismatch");
  }
  if (subject !== authority.identity.subject) {
    return exactB2bUnavailable("subject_mismatch");
  }
  if (session.user.email_verified === undefined) {
    return exactB2bUnavailable("email_verified_missing");
  }
  if (session.user.email_verified !== true) {
    return exactB2bUnavailable("email_verified_false");
  }
  const email = normalizedExactB2bVerifiedEmail(session.user.email);
  if (!email) return exactB2bUnavailable("email_invalid");

  const authTime = session.user.auth_time;
  if (
    typeof authTime !== "number" ||
    !Number.isSafeInteger(authTime) ||
    authTime <= 0
  ) {
    return exactB2bUnavailable("auth_time_invalid");
  }
  const authenticatedAt = new Date(authTime * 1_000);
  if (!Number.isFinite(authenticatedAt.getTime())) {
    return exactB2bUnavailable("auth_time_invalid");
  }

  return Object.freeze({
    status: "ready",
    proofInput: Object.freeze({
      issuerSha256: authority.identity.issuerSha256,
      clientIdSha256: authority.clientIdSha256,
      subjectSha256: createHash("sha256")
        .update(authority.identity.subject, "utf8")
        .digest("hex"),
      verifiedEmailSha256: createHash("sha256")
        .update(email, "utf8")
        .digest("hex"),
      emailVerified: true,
      authenticatedAt: authenticatedAt.toISOString(),
      authoritySource: "exact_b2b_session",
    }),
  });
}

export async function getExactOidcServerSessionRead(
  request?: NextRequest,
): Promise<ExactOidcServerSessionRead | null> {
  const profile = request
    ? clientProfileForRequest(request)
    : clientProfileForHost(
        (await headers()).get("x-forwarded-host") ??
          (await headers()).get("host"),
      );
  if (!auth0ProviderConfigured(runtimeConfigState(profile))) return null;
  const client = clientForProfile(profile);
  // Select the application from trusted server-side request context, then
  // read the Auth0 SDK session exactly once from the async cookie store.
  const session = await client.getSession();
  if (!session?.user?.sub) return Object.freeze({ status: "signed_out" });
  const issuer = session?.user?.iss;
  const subject = session.user.sub;
  const clientId = applicationConfig(profile).clientId;
  if (typeof issuer !== "string" || !clientId) {
    return Object.freeze({ status: "invalid_session_provenance" });
  }
  return Object.freeze({
    status: "ready",
    validatedIssuer: issuer,
    validatedSubject: subject,
    serverConfiguredClientId: clientId,
    providerProfile: Object.freeze({
      name: typeof session.user.name === "string" ? session.user.name : null,
      email: typeof session.user.email === "string" ? session.user.email : null,
      emailVerified: session.user.email_verified === true,
    }),
  });
}

export async function getExactOidcServerSessionInput(
  request?: NextRequest,
): Promise<Readonly<{
  validatedIssuer: string;
  validatedSubject: string;
  serverConfiguredClientId: string;
}> | null> {
  const session = await getExactOidcServerSessionRead(request);
  if (!session || session.status !== "ready") return null;
  return Object.freeze({
    validatedIssuer: session.validatedIssuer,
    validatedSubject: session.validatedSubject,
    serverConfiguredClientId: session.serverConfiguredClientId,
  });
}
