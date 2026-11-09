export const BLOCK199_MICROSOFT_OIDC_CONNECTION = "microsoft-aal2";
export const BLOCK199_MICROSOFT_OIDC_ISSUER =
  "https://login.microsoftonline.com/7d13f735-660c-4ffc-872d-b064aaed5a2e/v2.0";
export const BLOCK199_FEDERATED_AMR_CLAIM =
  "https://www.craysclub.com/claims/federated_amr";
export const BLOCK199_FEDERATED_AUTH_TIME_CLAIM =
  "https://www.craysclub.com/claims/federated_auth_time";
export const BLOCK199_FEDERATED_ISSUER_CLAIM =
  "https://www.craysclub.com/claims/federated_issuer";
export const BLOCK199_FEDERATED_CONNECTION_CLAIM =
  "https://www.craysclub.com/claims/federated_connection";

function normalizeIssuer(value: unknown) {
  return typeof value === "string"
    ? value.trim().replace(/\/+$/, "").toLowerCase()
    : "";
}

function authenticationMethods(value: unknown) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return values
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function authenticationTime(value: unknown) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

/**
 * Reads only Auth0-signed custom claims copied from a validated upstream
 * Microsoft OIDC ID token. Enrollment state alone is never assurance.
 */
export function block199FederatedMicrosoftAssurance(input: {
  tokenClaims: Record<string, unknown> | null | undefined;
  expectedIssuer: string | null | undefined;
}) {
  const claims = input.tokenClaims;
  const expectedIssuer = normalizeIssuer(input.expectedIssuer);
  if (!claims || !expectedIssuer) return null;
  if (
    claims[BLOCK199_FEDERATED_CONNECTION_CLAIM]
      !== BLOCK199_MICROSOFT_OIDC_CONNECTION
  ) return null;
  if (
    normalizeIssuer(claims[BLOCK199_FEDERATED_ISSUER_CLAIM])
      !== expectedIssuer
  ) return null;
  const methods = authenticationMethods(claims[BLOCK199_FEDERATED_AMR_CLAIM]);
  const authenticatedAtSeconds = authenticationTime(
    claims[BLOCK199_FEDERATED_AUTH_TIME_CLAIM],
  );
  if (!methods.includes("mfa") || authenticatedAtSeconds === null) return null;
  return { methods, authenticatedAtSeconds } as const;
}
