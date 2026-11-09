export const BLOCK199_SESSION_LIMITS = {
  auth0CookieAbsoluteSeconds: 7 * 24 * 60 * 60,
  auth0CookieInactivitySeconds: 24 * 60 * 60,
  craysTenantMaximumSeconds: 8 * 60 * 60,
  privilegedReauthenticationSeconds: 5 * 60,
  ownerPerspectiveSeconds: 24 * 60 * 60,
  nostrBrowserProofSeconds: 24 * 60 * 60,
} as const;

export type Block199Surface =
  | "public-browse"
  | "sign-in"
  | "recovery"
  | "protected-read"
  | "protected-mutation"
  | "privileged-operation";

export type Block199AccessInput = {
  surface: Block199Surface;
  providerState: "valid" | "invalid" | "unavailable";
  coreState: "healthy" | "unavailable";
  rateLimitState: "healthy" | "limited" | "unavailable";
  accountState: "active" | "review" | "blocked" | "missing";
  tenantSessionState: "active" | "revoked" | "expired" | "missing";
  accountSecurityVersionMatches: boolean;
  providerAccountAligned: boolean;
  nostrBindingVerified: boolean;
  assuranceLevel: "aal1" | "aal2" | "aal3";
  strongAuthenticationRequired?: boolean;
  authenticatedAt: Date | null;
  now?: Date;
};

export type Block199AccessDecision = {
  allowed: boolean;
  mode: "public" | "normal" | "step-up-required" | "manual-review" | "fail-closed";
  reason:
    | "public-surface"
    | "authentication-ready"
    | "recovery-manual-review"
    | "active-session"
    | "rate-limited"
    | "identity-rate-limit-unavailable"
    | "identity-provider-unavailable"
    | "identity-provider-invalid"
    | "core-unavailable"
    | "account-inactive"
    | "tenant-session-inactive"
    | "revocation-version-mismatch"
    | "provider-account-mismatch"
    | "nostr-binding-required"
    | "aal2-required"
    | "fresh-authentication-required";
};

function denied(reason: Block199AccessDecision["reason"], mode: Block199AccessDecision["mode"] = "fail-closed"): Block199AccessDecision {
  return { allowed: false, mode, reason };
}

export function decideBlock199Access(input: Block199AccessInput): Block199AccessDecision {
  if (input.surface === "public-browse") return { allowed: true, mode: "public", reason: "public-surface" };
  if (input.rateLimitState === "limited") return denied("rate-limited");
  if (input.rateLimitState === "unavailable") return denied("identity-rate-limit-unavailable");
  if (input.providerState === "unavailable") return denied("identity-provider-unavailable");
  if (input.providerState !== "valid") return denied("identity-provider-invalid");

  if (input.surface === "sign-in") return { allowed: true, mode: "normal", reason: "authentication-ready" };
  if (input.coreState === "unavailable") return denied("core-unavailable");

  if (input.surface === "recovery") {
    return { allowed: false, mode: "manual-review", reason: "recovery-manual-review" };
  }

  if (input.accountState !== "active") return denied("account-inactive");
  if (input.tenantSessionState !== "active") return denied("tenant-session-inactive");
  if (!input.accountSecurityVersionMatches) return denied("revocation-version-mismatch");
  if (!input.providerAccountAligned) return denied("provider-account-mismatch");
  if (!input.nostrBindingVerified) return denied("nostr-binding-required");

  if (input.strongAuthenticationRequired && input.assuranceLevel === "aal1") {
    return denied("aal2-required", "step-up-required");
  }

  if (input.surface === "privileged-operation") {
    if (input.assuranceLevel === "aal1") return denied("aal2-required", "step-up-required");
    const now = input.now ?? new Date();
    const ageMs = input.authenticatedAt ? now.getTime() - input.authenticatedAt.getTime() : Number.POSITIVE_INFINITY;
    if (ageMs < 0 || ageMs > BLOCK199_SESSION_LIMITS.privilegedReauthenticationSeconds * 1000) {
      return denied("fresh-authentication-required", "step-up-required");
    }
  }

  return { allowed: true, mode: "normal", reason: "active-session" };
}

export type Block199FactorEvidence = {
  tenantConfigured: boolean;
  branded: boolean;
  successPassed: boolean;
  denialPassed: boolean;
  recoveryPassed: boolean;
  supportedBrowserPassed: boolean;
  unsupportedBrowserPassed: boolean;
};

export function mayExposeStrongFactor(evidence: Block199FactorEvidence) {
  return Object.values(evidence).every(Boolean);
}

const sensitiveLogKeys = /^(authorization|cookie|password|secret|token|private[_-]?key|nsec|ncryptsec|assertion|credential|challenge)$/i;
const sensitiveLogValue = /\b(?:nsec1|ncryptsec1|bearer\s+[a-z0-9._~-]+)|(?:eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,})/i;

function redactValue(value: unknown): unknown {
  if (typeof value === "string") return sensitiveLogValue.test(value) ? "[REDACTED]" : value;
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      sensitiveLogKeys.test(key) ? "[REDACTED]" : redactValue(nested),
    ]));
  }
  return value;
}

export function redactBlock199Observability(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      sensitiveLogKeys.test(key) ? "[REDACTED]" : redactValue(value),
    ]),
  );
}
