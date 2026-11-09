/** Exact deployment binding only; this module grants no account or SaaS role. */
export const AWS_CANONICAL_MEMBER_ORIGIN = "https://member.crays.world";
export const AWS_CANONICAL_MEMBER_HOST = "member.crays.world";

type Environment = Readonly<Record<string, string | undefined>>;

export function awsCanonicalMemberEnabled(env: Environment = process.env): boolean {
  if (env.CRAYS_AWS_MEMBER_ORIGIN === undefined) return false;
  if (
    env.CRAYS_AWS_MEMBER_ORIGIN !== AWS_CANONICAL_MEMBER_ORIGIN ||
    env.NODE_ENV !== "production" ||
    env.AUTH0_CLUBS_BASE_URL !== AWS_CANONICAL_MEMBER_ORIGIN ||
    env.AUTH0_CLUBS_CLIENT_ID !== "gVA7ECS4WDjweQjtjZFbyNoxaVXnH2vl" ||
    env.VERCEL_ENV === "preview"
  ) throw new Error("AWS_CANONICAL_MEMBER_BINDING_INVALID");
  return true;
}

export function awsCanonicalMemberProfile(
  host: string | null | undefined,
  env: Environment = process.env,
): "clubs" | null {
  if (!awsCanonicalMemberEnabled(env)) return null;
  // No port, suffix, comma-list, trailing dot, or forwarded-host fallback here.
  if (host !== AWS_CANONICAL_MEMBER_HOST) {
    throw new Error("AWS_CANONICAL_MEMBER_HOST_NOT_ADMITTED");
  }
  return "clubs";
}

export function awsCanonicalMemberReturnPath(
  legacyFallback: string,
  env: Environment = process.env,
): string {
  return awsCanonicalMemberEnabled(env) ? "/" : legacyFallback;
}
