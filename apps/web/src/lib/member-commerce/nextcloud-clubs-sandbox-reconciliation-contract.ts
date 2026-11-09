import "server-only";

export const NEXTCLOUD_CLUBS_SANDBOX_RECONCILIATION_CONTRACT = Object.freeze({
  schema: "crays.clubs.nextcloud-human-mail-sandbox-reconciliation.v1",
  version: "1.0.0",
  environment: "TEST",
  sandboxOnly: true,
  livemode: false,
  production: false,
  sendMode: "human_nextcloud_mail",
  automaticDispatchAllowed: false,
  readinessStates: Object.freeze([
    "provider_not_bound",
    "configuration_incomplete",
    "sandbox_ready_manual_only",
  ]),
  queueStates: Object.freeze([
    "empty",
    "manual_action_required",
    "reconcile_required",
    "reconciled",
    "failed",
  ]),
  providerCallAuthorizedByPlan: false,
  providerCallPerformed: false,
  databaseWriteAuthorizedByPlan: false,
  databaseWritePerformed: false,
  containsPersonalData: false,
  exposesIdentifiers: false,
  exposesCounts: false,
} as const);

export type NextcloudClubsSandboxReadinessState =
  (typeof NEXTCLOUD_CLUBS_SANDBOX_RECONCILIATION_CONTRACT.readinessStates)[number];

export type NextcloudClubsSandboxConfiguration = Readonly<{
  environment: "TEST";
  sandbox: true;
  livemode: false;
  production: false;
  mailboxAuthorityConfigured: boolean;
  nextcloudMailEntryConfigured: boolean;
  humanOperatorBindingConfigured: boolean;
}>;

export type NextcloudClubsSandboxReadiness = Readonly<{
  schema: typeof NEXTCLOUD_CLUBS_SANDBOX_RECONCILIATION_CONTRACT.schema;
  version: typeof NEXTCLOUD_CLUBS_SANDBOX_RECONCILIATION_CONTRACT.version;
  status: NextcloudClubsSandboxReadinessState;
  sendMode: "human_nextcloud_mail";
  automaticDispatchAllowed: false;
  providerCallPerformed: false;
  databaseWritePerformed: false;
  productionApplied: false;
}>;

export type NextcloudClubsManualMailSnapshot = Readonly<{
  intentState:
    | "absent"
    | "preflighted"
    | "launch_issued"
    | "launch_redeemed"
    | "opened"
    | "expired"
    | "cancelled"
    | "conflict"
    | "failed";
  confirmationState: "none" | "observed" | "matched" | "conflict" | "unknown" | "failed";
  providerMessageReferenceSha256: string | null;
  providerAcknowledgementSha256: string | null;
  providerReadbackSha256: string | null;
  actionReceiptSha256: string | null;
}>;

export type NextcloudClubsManualMailReconciliationPlan = Readonly<{
  queueState:
    (typeof NEXTCLOUD_CLUBS_SANDBOX_RECONCILIATION_CONTRACT.queueStates)[number];
  lastSafeAcknowledgementState:
    | "none"
    | "unknown_outcome"
    | "ack_pending_readback"
    | "ack_readback_verified";
  allowedOperatorAction:
    | "bind_provider"
    | "open_nextcloud_mail"
    | "reconcile_provider_state"
    | "review_failure"
    | "none";
  guidance:
    | "provider_binding_required"
    | "no_work_queued"
    | "manual_nextcloud_confirmation_required"
    | "unknown_outcome_reconcile_before_retry"
    | "ack_requires_provider_readback"
    | "terminal_manual_review_required"
    | "durable_ack_readback_reconciled";
  retryAllowed: false;
  reconciliationRequired: boolean;
  deliveryClaimed: boolean;
  automaticDispatchAllowed: false;
  providerCallAuthorizedByPlan: false;
  providerCallPerformed: false;
  databaseWriteAuthorizedByPlan: false;
  databaseWritePerformed: false;
  productionApplied: false;
  evidenceSha256: string;
}>;
