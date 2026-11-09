import "server-only";

export const CLUBS_PAYMENT_MODULE_CONTRACT = Object.freeze({
  schema: "crays.clubs.payment-module.v1",
  version: "1.0.0",
  livemode: false,
} as const);

export type ClubsPaymentModuleKind = "MEMBERSHIP" | "STAY";
export type ClubsPaymentModuleState =
  | "payment_setup_pending"
  | "ready_to_prepare"
  | "prepared"
  | "ready_to_pay"
  | "processing"
  | "reconcile_required"
  | "paid_confirmation_received"
  | "failed"
  | "refund_pending"
  | "refunded";

export type ClubsPaymentModuleNextAction =
  | "authenticate"
  | "complete_payment_setup"
  | "prepare_payment"
  | "refresh_status"
  | "retry_same_command_key"
  | "complete_server_checkout"
  | "wait_for_reconciliation"
  | "contact_support"
  | "none";

export type ClubsPaymentModuleReconciliationInstruction =
  | "authenticate_before_status_read"
  | "setup_required_before_payment"
  | "prepare_with_server_authority"
  | "retry_prepare_with_same_command_key"
  | "complete_payment_on_server_handoff"
  | "refresh_until_provider_receipt"
  | "operations_reconciliation_required"
  | "payment_receipt_balanced"
  | "refund_reconciliation_pending"
  | "refund_receipt_balanced"
  | "support_review_required";

export type ClubsPaymentModuleAmount = Readonly<{
  minor: number;
  currency: string;
}>;

export type ClubsMemberPaymentStatus = Readonly<{
  schema: typeof CLUBS_PAYMENT_MODULE_CONTRACT.schema;
  version: typeof CLUBS_PAYMENT_MODULE_CONTRACT.version;
  status: "ready";
  paymentKind: ClubsPaymentModuleKind;
  state: ClubsPaymentModuleState;
  amount: ClubsPaymentModuleAmount | null;
  recentActivity: readonly Readonly<{
    activityReference: string;
    state: ClubsPaymentModuleState;
    amount: ClubsPaymentModuleAmount;
    updatedAt: string;
  }>[];
  allowedNextActions: readonly ClubsPaymentModuleNextAction[];
  reconciliationInstruction: ClubsPaymentModuleReconciliationInstruction;
  livemode: false;
  providerCalled: boolean;
  providerSuccessClaimed: false;
  paymentSuccessClaimed: false;
  bookingConfirmed: false;
  membershipGranted: false;
}>;

export type ClubsAmbassadorSettlementStatus = Readonly<{
  schema: typeof CLUBS_PAYMENT_MODULE_CONTRACT.schema;
  version: typeof CLUBS_PAYMENT_MODULE_CONTRACT.version;
  status: "ready";
  state: "setup_pending" | "no_activity" | "activity_ready" | "reconcile_required";
  readinessState: string | null;
  totals: readonly Readonly<{
    currency: string;
    amountMinor: number;
  }>[];
  activity: readonly Readonly<{
    activityReference: string;
    amount: ClubsPaymentModuleAmount;
    settlementState: "pending" | "processing" | "settled" | "reconcile_required" | "failed";
    occurredAt: string;
  }>[];
  allowedNextActions: readonly ClubsPaymentModuleNextAction[];
  reconciliationInstruction: ClubsPaymentModuleReconciliationInstruction;
  ownAttributableActivityOnly: true;
  foreignAmbassadorAccess: false;
  providerCalled: false;
  providerSuccessClaimed: false;
  livemode: false;
}>;

export type ClubsFinancePaymentOverview = Readonly<{
  schema: typeof CLUBS_PAYMENT_MODULE_CONTRACT.schema;
  version: typeof CLUBS_PAYMENT_MODULE_CONTRACT.version;
  status: "ready";
  scope: "CLUBS_ONLY";
  paymentSummaries: readonly Readonly<{
    paymentKind: ClubsPaymentModuleKind;
    paymentState: string;
    currency: string;
    count: number;
    amountMinor: number;
  }>[];
  transferStates: readonly Readonly<{ state: string; count: number }>[];
  refundStates: readonly Readonly<{ state: string; count: number }>[];
  reconciliationStates: readonly Readonly<{ state: string; count: number }>[];
  webhookReceipts: number;
  allowedNextActions: readonly ClubsPaymentModuleNextAction[];
  reconciliationInstruction: ClubsPaymentModuleReconciliationInstruction;
  livemode: false;
  providerSuccessClaimed: false;
  productionAuthority: false;
}>;

export function nextActionsForPaymentState(
  state: ClubsPaymentModuleState,
): readonly ClubsPaymentModuleNextAction[] {
  const actions: Record<ClubsPaymentModuleState, readonly ClubsPaymentModuleNextAction[]> = {
    payment_setup_pending: ["complete_payment_setup", "refresh_status"],
    ready_to_prepare: ["prepare_payment", "refresh_status"],
    prepared: ["retry_same_command_key", "refresh_status"],
    ready_to_pay: ["complete_server_checkout", "refresh_status"],
    processing: ["refresh_status"],
    reconcile_required: ["wait_for_reconciliation", "refresh_status"],
    paid_confirmation_received: ["none"],
    failed: ["contact_support", "refresh_status"],
    refund_pending: ["wait_for_reconciliation", "refresh_status"],
    refunded: ["none"],
  };
  return Object.freeze([...actions[state]]);
}

export function reconciliationInstructionForPaymentState(
  state: ClubsPaymentModuleState,
): ClubsPaymentModuleReconciliationInstruction {
  const instructions: Record<
    ClubsPaymentModuleState,
    ClubsPaymentModuleReconciliationInstruction
  > = {
    payment_setup_pending: "setup_required_before_payment",
    ready_to_prepare: "prepare_with_server_authority",
    prepared: "retry_prepare_with_same_command_key",
    ready_to_pay: "complete_payment_on_server_handoff",
    processing: "refresh_until_provider_receipt",
    reconcile_required: "operations_reconciliation_required",
    paid_confirmation_received: "payment_receipt_balanced",
    failed: "support_review_required",
    refund_pending: "refund_reconciliation_pending",
    refunded: "refund_receipt_balanced",
  };
  return instructions[state];
}

export function paymentSetupPendingStatus(
  paymentKind: ClubsPaymentModuleKind,
): ClubsMemberPaymentStatus {
  const state = "payment_setup_pending" as const;
  return Object.freeze({
    schema: CLUBS_PAYMENT_MODULE_CONTRACT.schema,
    version: CLUBS_PAYMENT_MODULE_CONTRACT.version,
    status: "ready",
    paymentKind,
    state,
    amount: null,
    recentActivity: Object.freeze([]),
    allowedNextActions: nextActionsForPaymentState(state),
    reconciliationInstruction: reconciliationInstructionForPaymentState(state),
    livemode: false,
    providerCalled: false,
    providerSuccessClaimed: false,
    paymentSuccessClaimed: false,
    bookingConfirmed: false,
    membershipGranted: false,
  });
}
