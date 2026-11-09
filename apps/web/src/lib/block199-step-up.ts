export const BLOCK199_AUTH0_STEP_UP_MARKER = "owner-mfa-v1";

function safeLocalReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/auth/provider-account";
  try {
    const parsed = new URL(value, "https://crays.invalid");
    return parsed.origin === "https://crays.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/auth/provider-account";
  } catch {
    return "/auth/provider-account";
  }
}

/**
 * Creates a server-owned Auth0 step-up request. The caller cannot supply an
 * assurance value, external destination or provider connection. Auth0 keeps
 * the already proven B2C identity path, matching the shared Gym login flow.
 */
export function createBlock199StepUpPath(returnTo: string) {
  const params = new URLSearchParams({
    returnTo: safeLocalReturnTo(returnTo),
    "ext-crays-step-up": BLOCK199_AUTH0_STEP_UP_MARKER,
    prompt: "login",
    max_age: "0",
  });
  return `/auth/login?${params.toString()}`;
}
