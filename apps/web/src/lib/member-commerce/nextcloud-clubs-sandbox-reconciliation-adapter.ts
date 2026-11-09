import "server-only";

import { createHash } from "node:crypto";

import {
  NEXTCLOUD_CLUBS_SANDBOX_RECONCILIATION_CONTRACT,
  type NextcloudClubsManualMailReconciliationPlan,
  type NextcloudClubsManualMailSnapshot,
  type NextcloudClubsSandboxConfiguration,
  type NextcloudClubsSandboxReadiness,
} from "./nextcloud-clubs-sandbox-reconciliation-contract";

const SHA256 = /^[a-f0-9]{64}$/;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonical(nested)}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new Error("NEXTCLOUD_CLUBS_SANDBOX_CANONICAL_VALUE_INVALID");
  }
  return serialized;
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function readiness(
  status: NextcloudClubsSandboxReadiness["status"],
): NextcloudClubsSandboxReadiness {
  return Object.freeze({
    schema: NEXTCLOUD_CLUBS_SANDBOX_RECONCILIATION_CONTRACT.schema,
    version: NEXTCLOUD_CLUBS_SANDBOX_RECONCILIATION_CONTRACT.version,
    status,
    sendMode: "human_nextcloud_mail" as const,
    automaticDispatchAllowed: false as const,
    providerCallPerformed: false as const,
    databaseWritePerformed: false as const,
    productionApplied: false as const,
  });
}

export function readNextcloudClubsSandboxReadiness(
  configuration?: NextcloudClubsSandboxConfiguration,
): NextcloudClubsSandboxReadiness {
  if (!configuration) return readiness("provider_not_bound");
  if (
    configuration.environment !== "TEST" ||
    configuration.sandbox !== true ||
    configuration.livemode !== false ||
    configuration.production !== false
  ) {
    throw new Error("NEXTCLOUD_CLUBS_SANDBOX_CONFIGURATION_FORBIDDEN");
  }
  if (!configuration.mailboxAuthorityConfigured) {
    return readiness("provider_not_bound");
  }
  if (
    !configuration.nextcloudMailEntryConfigured ||
    !configuration.humanOperatorBindingConfigured
  ) {
    return readiness("configuration_incomplete");
  }
  return readiness("sandbox_ready_manual_only");
}

function plan(
  snapshot: NextcloudClubsManualMailSnapshot,
  values: Omit<
    NextcloudClubsManualMailReconciliationPlan,
    | "retryAllowed"
    | "automaticDispatchAllowed"
    | "providerCallAuthorizedByPlan"
    | "providerCallPerformed"
    | "databaseWriteAuthorizedByPlan"
    | "databaseWritePerformed"
    | "productionApplied"
    | "evidenceSha256"
  >,
): NextcloudClubsManualMailReconciliationPlan {
  return Object.freeze({
    ...values,
    retryAllowed: false as const,
    automaticDispatchAllowed: false as const,
    providerCallAuthorizedByPlan: false as const,
    providerCallPerformed: false as const,
    databaseWriteAuthorizedByPlan: false as const,
    databaseWritePerformed: false as const,
    productionApplied: false as const,
    evidenceSha256: digest(snapshot),
  });
}

function hasExactHash(value: string | null): value is string {
  return value !== null && SHA256.test(value);
}

function hasAnyEvidence(snapshot: NextcloudClubsManualMailSnapshot): boolean {
  return [
    snapshot.providerMessageReferenceSha256,
    snapshot.providerAcknowledgementSha256,
    snapshot.providerReadbackSha256,
    snapshot.actionReceiptSha256,
  ].some((value) => value !== null);
}

export function planNextcloudClubsManualMailReconciliation(
  readinessProjection: NextcloudClubsSandboxReadiness,
  snapshot: NextcloudClubsManualMailSnapshot,
): NextcloudClubsManualMailReconciliationPlan {
  if (readinessProjection.status !== "sandbox_ready_manual_only") {
    return plan(snapshot, {
      queueState: snapshot.intentState === "absent" ? "empty" : "manual_action_required",
      lastSafeAcknowledgementState: "none",
      allowedOperatorAction: "bind_provider",
      guidance: "provider_binding_required",
      reconciliationRequired: false,
      deliveryClaimed: false,
    });
  }

  if (snapshot.intentState === "absent") {
    if (snapshot.confirmationState !== "none" || hasAnyEvidence(snapshot)) {
      throw new Error("NEXTCLOUD_CLUBS_SANDBOX_ORPHAN_CONFIRMATION_EVIDENCE");
    }
    return plan(snapshot, {
      queueState: "empty",
      lastSafeAcknowledgementState: "none",
      allowedOperatorAction: "none",
      guidance: "no_work_queued",
      reconciliationRequired: false,
      deliveryClaimed: false,
    });
  }

  if (["expired", "cancelled", "failed"].includes(snapshot.intentState)) {
    return plan(snapshot, {
      queueState: "failed",
      lastSafeAcknowledgementState: "none",
      allowedOperatorAction: "review_failure",
      guidance: "terminal_manual_review_required",
      reconciliationRequired: false,
      deliveryClaimed: false,
    });
  }

  if (
    snapshot.intentState === "conflict" ||
    ["conflict", "unknown", "failed"].includes(snapshot.confirmationState)
  ) {
    return plan(snapshot, {
      queueState: "reconcile_required",
      lastSafeAcknowledgementState: "unknown_outcome",
      allowedOperatorAction: "reconcile_provider_state",
      guidance: "unknown_outcome_reconcile_before_retry",
      reconciliationRequired: true,
      deliveryClaimed: false,
    });
  }

  if (snapshot.confirmationState === "none") {
    if (hasAnyEvidence(snapshot)) {
      throw new Error("NEXTCLOUD_CLUBS_SANDBOX_UNCONFIRMED_EVIDENCE_FORBIDDEN");
    }
    return plan(snapshot, {
      queueState: "manual_action_required",
      lastSafeAcknowledgementState: "none",
      allowedOperatorAction: "open_nextcloud_mail",
      guidance: "manual_nextcloud_confirmation_required",
      reconciliationRequired: false,
      deliveryClaimed: false,
    });
  }

  const ackPresent =
    hasExactHash(snapshot.providerMessageReferenceSha256) &&
    hasExactHash(snapshot.providerAcknowledgementSha256) &&
    hasExactHash(snapshot.actionReceiptSha256);
  if (!ackPresent) {
    return plan(snapshot, {
      queueState: "reconcile_required",
      lastSafeAcknowledgementState: "unknown_outcome",
      allowedOperatorAction: "reconcile_provider_state",
      guidance: "unknown_outcome_reconcile_before_retry",
      reconciliationRequired: true,
      deliveryClaimed: false,
    });
  }

  if (
    snapshot.confirmationState !== "matched" ||
    !hasExactHash(snapshot.providerReadbackSha256)
  ) {
    return plan(snapshot, {
      queueState: "reconcile_required",
      lastSafeAcknowledgementState: "ack_pending_readback",
      allowedOperatorAction: "reconcile_provider_state",
      guidance: "ack_requires_provider_readback",
      reconciliationRequired: true,
      deliveryClaimed: false,
    });
  }

  return plan(snapshot, {
    queueState: "reconciled",
    lastSafeAcknowledgementState: "ack_readback_verified",
    allowedOperatorAction: "none",
    guidance: "durable_ack_readback_reconciled",
    reconciliationRequired: false,
    deliveryClaimed: true,
  });
}
