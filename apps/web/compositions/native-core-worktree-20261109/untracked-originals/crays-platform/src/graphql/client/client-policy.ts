export const graphClientPolicy = {
  normalizedCache: {
    identity: "__typename:id",
    tenantPartitionRequired: true,
    connectionMerge: "cursor-only",
    invalidateFromCommittedEvent: true,
  },
  retry: {
    queries: "bounded-exponential-jitter",
    mutations: "idempotency-key-required",
    forbiddenAndValidation: "never",
    maximumAttempts: 3,
  },
  offline: {
    reads: "last-authorized-snapshot-with-stale-marker",
    mutations: "queue-only-with-explicit-user-review",
    externalEffects: "never-queue",
  },
  optimisticUpdates: {
    allowed: false,
    reason: "Server-authoritative versions, field policy and audit receipts win.",
  },
  mobile: {
    pagination: "opaque-cursor",
    errors: "typed-code-with-safe-message",
    reconnect: "resume-durable-event-id-then-refetch",
  },
} as const;
