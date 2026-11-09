import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export interface ClubsTokenClaims {
  alg: string;
  iss: string;
  aud: string | readonly string[];
  sub: string;
  tenantId: string;
  exp: number;
  iat: number;
  authTime: number;
  aal: "AAL1" | "AAL2";
}

export interface ClubsTokenPolicy {
  issuer: string;
  audience: string;
  tenantId: string;
  nowEpochSeconds: number;
  maxClockSkewSeconds: number;
  maxPrivilegedAuthAgeSeconds: number;
  privileged: boolean;
}

export function validateClubsTokenClaims(claims: ClubsTokenClaims, policy: ClubsTokenPolicy): readonly string[] {
  const failures: string[] = [];
  if (!['RS256', 'ES256'].includes(claims.alg)) failures.push("TOKEN_ALGORITHM_DENIED");
  if (claims.iss !== policy.issuer || !claims.iss.startsWith("https://")) failures.push("TOKEN_ISSUER_MISMATCH");
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(policy.audience)) failures.push("TOKEN_AUDIENCE_MISMATCH");
  if (!claims.sub.trim()) failures.push("TOKEN_SUBJECT_MISSING");
  if (claims.tenantId !== policy.tenantId) failures.push("TOKEN_TENANT_MISMATCH");
  if (claims.exp <= policy.nowEpochSeconds - policy.maxClockSkewSeconds) failures.push("TOKEN_EXPIRED");
  if (claims.iat > policy.nowEpochSeconds + policy.maxClockSkewSeconds) failures.push("TOKEN_ISSUED_IN_FUTURE");
  if (policy.privileged) {
    if (claims.aal !== "AAL2") failures.push("TOKEN_AAL2_REQUIRED");
    if (policy.nowEpochSeconds - claims.authTime > policy.maxPrivilegedAuthAgeSeconds) {
      failures.push("TOKEN_FRESH_AUTH_REQUIRED");
    }
  }
  return failures;
}

export interface SessionCookiePolicy {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
  hostOnly: boolean;
  path: string;
  maxAgeSeconds: number;
}

export function validateSessionCookiePolicy(cookie: SessionCookiePolicy): readonly string[] {
  const failures: string[] = [];
  if (!cookie.name.startsWith("__Host-")) failures.push("COOKIE_HOST_PREFIX_REQUIRED");
  if (!cookie.httpOnly) failures.push("COOKIE_HTTP_ONLY_REQUIRED");
  if (!cookie.secure) failures.push("COOKIE_SECURE_REQUIRED");
  if (!cookie.hostOnly) failures.push("COOKIE_HOST_ONLY_REQUIRED");
  if (cookie.path !== "/") failures.push("COOKIE_ROOT_PATH_REQUIRED");
  if (!['Strict', 'Lax'].includes(cookie.sameSite)) failures.push("COOKIE_SAME_SITE_DENIED");
  if (!Number.isInteger(cookie.maxAgeSeconds) || cookie.maxAgeSeconds < 60 || cookie.maxAgeSeconds > 28_800) {
    failures.push("COOKIE_LIFETIME_INVALID");
  }
  return failures;
}

export function normalizeSafeReturnTo(value: string | null | undefined, fallback = "/en"): string {
  if (!value) return fallback;
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { throw new Error("OPEN_REDIRECT_TARGET_INVALID"); }
  if (
    !decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\") ||
    /[\u0000-\u001f]/.test(decoded) || /^\/[^/]*@/.test(decoded)
  ) throw new Error("OPEN_REDIRECT_TARGET_INVALID");
  const url = new URL(decoded, "https://clubs.invalid");
  if (url.origin !== "https://clubs.invalid") throw new Error("OPEN_REDIRECT_TARGET_INVALID");
  return `${url.pathname}${url.search}${url.hash}`;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function validateCsrf(input: {
  method: string;
  requestOrigin: string | null;
  expectedOrigin: string;
  cookieToken: string | null;
  headerToken: string | null;
}): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(input.method.toUpperCase())) return true;
  if (input.requestOrigin !== input.expectedOrigin) return false;
  if (!input.cookieToken || !input.headerToken || !/^[A-Za-z0-9_-]{32,256}$/.test(input.cookieToken)) return false;
  return safeEqual(input.cookieToken, input.headerToken);
}

export function corsResponse(origin: string | null, allowedOrigins: readonly string[]): Readonly<Record<string, string>> {
  if (!origin || !allowedOrigins.includes(origin)) return Object.freeze({});
  return Object.freeze({
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  });
}

export function validateCsp(policy: Readonly<Record<string, readonly string[]>>): readonly string[] {
  const failures: string[] = [];
  const values = Object.values(policy).flat();
  if (!policy["default-src"]?.includes("'self'")) failures.push("CSP_DEFAULT_SELF_REQUIRED");
  if (!policy["object-src"]?.includes("'none'")) failures.push("CSP_OBJECT_NONE_REQUIRED");
  if (!policy["base-uri"]?.includes("'none'")) failures.push("CSP_BASE_URI_NONE_REQUIRED");
  if (!policy["frame-ancestors"]?.includes("'none'")) failures.push("CSP_FRAME_ANCESTORS_NONE_REQUIRED");
  if (!policy["form-action"]?.includes("'self'")) failures.push("CSP_FORM_ACTION_SELF_REQUIRED");
  if (values.includes("'unsafe-eval'") || values.includes("'unsafe-inline'")) failures.push("CSP_UNSAFE_SOURCE_DENIED");
  return failures;
}

export class SignedWebhookReplayHarness {
  readonly #events = new Map<string, string>();
  readonly #secret: string;
  readonly #toleranceSeconds: number;

  constructor(secret: string, toleranceSeconds = 300) {
    if (secret.length < 24) throw new Error("WEBHOOK_SECRET_TOO_SHORT");
    this.#secret = secret;
    this.#toleranceSeconds = toleranceSeconds;
  }

  sign(rawBody: string, timestamp: number): string {
    return createHmac("sha256", this.#secret).update(`${timestamp}.${rawBody}`).digest("hex");
  }

  verifyAndRecord(input: {
    eventId: string;
    rawBody: string;
    timestamp: number;
    signature: string;
    nowEpochSeconds: number;
  }): "ACCEPTED" | "EXACT_REPLAY" {
    if (Math.abs(input.nowEpochSeconds - input.timestamp) > this.#toleranceSeconds) {
      throw new Error("WEBHOOK_TIMESTAMP_OUTSIDE_TOLERANCE");
    }
    const expected = this.sign(input.rawBody, input.timestamp);
    if (!/^[0-9a-f]{64}$/.test(input.signature) || !safeEqual(expected, input.signature)) {
      throw new Error("WEBHOOK_SIGNATURE_INVALID");
    }
    const payloadSha256 = createHash("sha256").update(input.rawBody).digest("hex");
    const prior = this.#events.get(input.eventId);
    if (prior) {
      if (prior !== payloadSha256) throw new Error("WEBHOOK_REPLAY_CONFLICT");
      return "EXACT_REPLAY";
    }
    this.#events.set(input.eventId, payloadSha256);
    return "ACCEPTED";
  }

  get acceptedEventCount(): number { return this.#events.size; }
}

export class TenantRateLimitHarness {
  readonly #windows = new Map<string, { startsAt: number; count: number }>();
  constructor(readonly limit: number, readonly windowSeconds: number) {
    if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowSeconds) || windowSeconds < 1) {
      throw new Error("RATE_LIMIT_POLICY_INVALID");
    }
  }

  consume(input: { tenantId: string; subjectId: string; routeClass: string; ipDigest: string; nowEpochSeconds: number }):
    | { allowed: true; remaining: number }
    | { allowed: false; status: 429; retryAfterSeconds: number; code: "RATE_LIMITED" } {
    const key = createHash("sha256").update(`${input.tenantId}\u0000${input.subjectId}\u0000${input.routeClass}\u0000${input.ipDigest}`).digest("hex");
    const startsAt = Math.floor(input.nowEpochSeconds / this.windowSeconds) * this.windowSeconds;
    const current = this.#windows.get(key);
    const bucket = !current || current.startsAt !== startsAt ? { startsAt, count: 0 } : current;
    if (bucket.count >= this.limit) {
      return { allowed: false, status: 429, retryAfterSeconds: startsAt + this.windowSeconds - input.nowEpochSeconds, code: "RATE_LIMITED" };
    }
    bucket.count += 1;
    this.#windows.set(key, bucket);
    return { allowed: true, remaining: this.limit - bucket.count };
  }
}
