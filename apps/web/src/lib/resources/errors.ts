export type CraysResourceErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid_query"
  | "validation_failed"
  | "conflict"
  | "rate_limited"
  | "source_unavailable"
  | "partial_data"
  | "operation_gated"
  | "unexpected";

export type CraysResourceError = {
  code: CraysResourceErrorCode;
  safeMessage: string;
  correlationId: string;
  retryAfterSeconds?: number;
  fieldErrors?: Array<{ field: string; message: string }>;
};

export function createResourceError(
  code: CraysResourceErrorCode,
  safeMessage: string,
  options: {
    correlationId?: string;
    retryAfterSeconds?: number;
    fieldErrors?: Array<{ field: string; message: string }>;
  } = {},
): CraysResourceError {
  return {
    code,
    safeMessage,
    correlationId: options.correlationId ?? `crays_${Date.now().toString(36)}`,
    retryAfterSeconds: options.retryAfterSeconds,
    fieldErrors: options.fieldErrors,
  };
}

export function statusForResourceError(code: CraysResourceErrorCode) {
  if (code === "unauthenticated") return 401;
  if (code === "forbidden" || code === "operation_gated") return 403;
  if (code === "not_found") return 404;
  if (code === "invalid_query" || code === "validation_failed") return 422;
  if (code === "conflict") return 409;
  if (code === "rate_limited") return 429;
  if (code === "source_unavailable") return 503;
  if (code === "partial_data") return 206;
  return 500;
}
