export function domainDevWritesEnabled(env: Record<string, string | undefined> = process.env) {
  return env.CRAYS_ENABLE_DEV_DOMAIN_WRITES === "true";
}

export function assertDomainDevWriteAllowed(request: Request, env: Record<string, string | undefined> = process.env, confirmation = "create-domain-record") {
  if (!domainDevWritesEnabled(env)) {
    return {
      allowed: false as const,
      response: Response.json(
        {
          status: "blocked",
          writeEnabled: false,
          reason: "Domain write routes are disabled unless CRAYS_ENABLE_DEV_DOMAIN_WRITES=true.",
          liveBusinessRecordReturned: false,
          secretsReturned: false,
          privateKeysReturned: false,
        },
        { status: 403 },
      ),
    };
  }

  if (request.headers.get("x-crays-dev-confirm") !== confirmation) {
    return {
      allowed: false as const,
      response: Response.json(
        {
          status: "blocked",
          writeEnabled: true,
          reason: `Missing x-crays-dev-confirm=${confirmation} header.`,
          liveBusinessRecordReturned: false,
          secretsReturned: false,
          privateKeysReturned: false,
        },
        { status: 403 },
      ),
    };
  }

  return { allowed: true as const };
}
