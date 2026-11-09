import type { ClubsSandboxPaymentKindV2 } from "./clubs-stripe-sandbox-team-go-verifier-v2";

export type ClubsSandboxInboxStateV2 =
  | "TEAM_GO_REQUIRED"
  | "PERSISTENT_BINDING_REQUIRED"
  | "PROVIDER_BLOCKED"
  | "IDEMPOTENCY_CONFLICT"
  | "REPLAY_SOURCE_ONLY"
  | "UNKNOWN_OUTCOME"
  | "WEBHOOK_SIGNATURE_REJECTED"
  | "WEBHOOK_UNBOUND";

export type ClubsSandboxInboxEntryV2 = Readonly<{
  eventFingerprint: string;
  paymentKind: ClubsSandboxPaymentKindV2;
  state: ClubsSandboxInboxStateV2;
  occurredAt: string;
  livemode: false;
}>;

export type ClubsSandboxInboxProjectionV2 = Readonly<{
  livemode: false;
  sourceOnly: true;
  persisted: false;
  providerSuccessClaimed: false;
  items: ReadonlyArray<Readonly<{
    eventFingerprint: string;
    paymentKind: ClubsSandboxPaymentKindV2;
    state: ClubsSandboxInboxStateV2;
    severity: "BLOCKED" | "REVIEW" | "INFO";
    occurredAt: string;
    providerSuccessClaimed: false;
  }>>;
}>;

function severityFor(state: ClubsSandboxInboxStateV2): "BLOCKED" | "REVIEW" | "INFO" {
  if (
    state === "TEAM_GO_REQUIRED"
    || state === "PERSISTENT_BINDING_REQUIRED"
    || state === "PROVIDER_BLOCKED"
    || state === "UNKNOWN_OUTCOME"
    || state === "WEBHOOK_UNBOUND"
  ) return "BLOCKED";
  if (state === "REPLAY_SOURCE_ONLY") return "INFO";
  return "REVIEW";
}

/**
 * Public operations projection: deliberately excludes subjects, member IDs,
 * emails, provider object IDs, signatures, idempotency keys and raw payloads.
 */
export function projectClubsSandboxOperationsInboxV2(
  entries: ReadonlyArray<ClubsSandboxInboxEntryV2>,
): ClubsSandboxInboxProjectionV2 {
  const items = entries
    .filter((entry) => entry.livemode === false && /^[a-f0-9]{64}$/.test(entry.eventFingerprint))
    .map((entry) => Object.freeze({
      eventFingerprint: entry.eventFingerprint,
      paymentKind: entry.paymentKind,
      state: entry.state,
      severity: severityFor(entry.state),
      occurredAt: entry.occurredAt,
      providerSuccessClaimed: false as const,
    }))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  return Object.freeze({
    livemode: false,
    sourceOnly: true,
    persisted: false,
    providerSuccessClaimed: false,
    items: Object.freeze(items),
  });
}
