import type { ExactOidcBindingDecision } from "@/lib/exact-oidc-core-binding-preflight";

const unavailableReasons = new Set<ExactOidcBindingDecision["reason"]>([
  "CURRENT_CORE_AUTHORITY_UNAVAILABLE",
  "BINDING_READ_UNAVAILABLE",
]);

export type ExactOidcAlignmentHttpProjection = Readonly<{
  httpStatus: 200 | 401 | 403 | 503;
  body: Readonly<{
    status: ExactOidcBindingDecision["status"];
    reason: ExactOidcBindingDecision["reason"];
  }>;
  headers: Readonly<{
    "cache-control": "no-store, max-age=0";
    "x-content-type-options": "nosniff";
  }>;
}>;

export function projectExactOidcAlignmentDecision(
  decision: ExactOidcBindingDecision,
): ExactOidcAlignmentHttpProjection {
  const httpStatus = decision.status === "READY_FOR_SERVER_ALIGNMENT"
    ? 200
    : decision.reason === "INVALID_SESSION_PROVENANCE"
      ? 401
      : unavailableReasons.has(decision.reason)
        ? 503
        : 403;

  return Object.freeze({
    httpStatus,
    body: Object.freeze({ status: decision.status, reason: decision.reason }),
    headers: Object.freeze({
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
    }),
  });
}
