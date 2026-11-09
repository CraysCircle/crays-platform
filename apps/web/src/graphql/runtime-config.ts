export const CRAYS_GRAPHQL_API_VERSION = "2026-07-17";
export const CRAYS_GRAPHQL_ENDPOINT = "/api/graphql";

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export type CraysGraphQLRuntimeConfig = ReturnType<typeof getCraysGraphQLRuntimeConfig>;

export function getCraysGraphQLRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === "production";
  const enabled = !production || env.CRAYS_GRAPHQL_ENABLED === "true";
  const persistedOperationsRequired = production || env.CRAYS_GRAPHQL_REQUIRE_PERSISTED === "true";

  return {
    apiVersion: CRAYS_GRAPHQL_API_VERSION,
    graphIdentity: "crays-pro-core",
    endpoint: CRAYS_GRAPHQL_ENDPOINT,
    enabled,
    mode: production ? "production" : "development",
    introspectionEnabled: !production && env.CRAYS_GRAPHQL_INTROSPECTION !== "false",
    persistedOperationsRequired,
    maximumDepth: positiveInteger(env.CRAYS_GRAPHQL_MAX_DEPTH, 8),
    maximumTokens: positiveInteger(env.CRAYS_GRAPHQL_MAX_TOKENS, 1_500),
    maximumCost: positiveInteger(env.CRAYS_GRAPHQL_MAX_COST, 5_000),
    cacheBackend: env.CRAYS_REDIS_URL ? "redis-configured-not-connected" : "disabled",
    eventTransport: env.CRAYS_KAFKA_BROKERS ? "kafka-configured-not-connected" : "postgres-outbox-local",
    telemetryBackend: env.CRAYS_GRAPHQL_OTLP_ENDPOINT ? "otlp-configured-not-connected" : "disabled",
    federationStatus: "MODULAR_MONOLITH" as const,
  };
}
