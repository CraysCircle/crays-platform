export function coreCommandWritesEnabled(env: Record<string, string | undefined> = process.env) {
  return env.CRAYS_ENABLE_CORE_COMMAND_WRITES === "true";
}

export function assertCoreCommandWriteAllowed(
  request: Request,
  env: Record<string, string | undefined> = process.env,
  confirmation = "stage-core-command",
) {
  if (!coreCommandWritesEnabled(env)) {
    return {
      allowed: false as const,
      response: Response.json(
        {
          status: "blocked",
          writeEnabled: false,
          reason: "Core command write routes are disabled unless CRAYS_ENABLE_CORE_COMMAND_WRITES=true.",
          toolApplyEnabled: false,
          syncWritesEnabled: false,
          sourceWritesEnabled: false,
          liveCommandRecordsReturned: false,
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
          toolApplyEnabled: false,
          syncWritesEnabled: false,
          sourceWritesEnabled: false,
          liveCommandRecordsReturned: false,
          secretsReturned: false,
          privateKeysReturned: false,
        },
        { status: 403 },
      ),
    };
  }

  return { allowed: true as const };
}
