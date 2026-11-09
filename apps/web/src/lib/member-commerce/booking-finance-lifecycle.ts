import { createHash, randomUUID } from "node:crypto";

export const BOOKING_FINANCE_STATE_VERSION = 1;
export const ERP_SEMANTIC_MAPPING_VERSION = "CCLUB_ERP_SEMANTIC_V1";

export type BookingFinanceEventKind =
  | "PAYMENT_AUTHORIZED"
  | "PAYMENT_CAPTURED"
  | "PAYMENT_FAILED"
  | "PAYMENT_CANCELLED"
  | "REFUND_REQUESTED"
  | "REFUND_SUCCEEDED"
  | "REFUND_FAILED"
  | "DISPUTE_OPENED"
  | "DISPUTE_WON"
  | "DISPUTE_LOST"
  | "CHARGEBACK_DEBITED"
  | "CHARGEBACK_REVERSED"
  | "PROVIDER_FEE_ASSESSED"
  | "PAYOUT_PAID"
  | "PAYOUT_FAILED"
  | "RECONCILIATION_MATCHED"
  | "RECONCILIATION_VARIANCE"
  | "RECONCILIATION_RESOLVED";

export type BookingFinanceEvent = Readonly<{
  id: string;
  tenantId: string;
  projectKey: string;
  franchiseKey: string;
  locationKey: string;
  bookingId: string;
  bookingVersion: number;
  eventKind: BookingFinanceEventKind;
  sourceKind: "INTERNAL" | "VENDURE" | "PAYMENT_PROVIDER" | "ERP" | "BANK";
  sourceEventId: string;
  providerReference?: string;
  currency: string;
  amountMinor: bigint;
  payloadHash: string;
  effectiveAt: Date;
}>;

export type BookingFinanceState = Readonly<{
  paymentState:
    | "PENDING"
    | "AUTHORIZED"
    | "CAPTURED"
    | "FAILED"
    | "CANCELLED"
    | "PARTIALLY_REFUNDED"
    | "REFUNDED"
    | "CHARGEBACK";
  refundState: "NONE" | "REQUESTED" | "PARTIAL" | "COMPLETE" | "FAILED";
  disputeState: "NONE" | "OPEN" | "WON" | "LOST";
  chargebackState: "NONE" | "DEBITED" | "PARTIALLY_REVERSED" | "REVERSED";
  reconciliationState: "NOT_STARTED" | "PENDING" | "MATCHED" | "VARIANCE" | "RESOLVED";
  currency: string;
  authorizedMinor: bigint;
  capturedMinor: bigint;
  refundedMinor: bigint;
  chargebackDebitedMinor: bigint;
  chargebackReversedMinor: bigint;
  providerFeeMinor: bigint;
  aggregateVersion: number;
  lastEventId?: string;
}>;

export const initialBookingFinanceState = (currency: string): BookingFinanceState => ({
  paymentState: "PENDING",
  refundState: "NONE",
  disputeState: "NONE",
  chargebackState: "NONE",
  reconciliationState: "NOT_STARTED",
  currency,
  authorizedMinor: 0n,
  capturedMinor: 0n,
  refundedMinor: 0n,
  chargebackDebitedMinor: 0n,
  chargebackReversedMinor: 0n,
  providerFeeMinor: 0n,
  aggregateVersion: 0,
});

function transitionError(event: BookingFinanceEvent, reason: string): never {
  throw new Error(`BOOKING_FINANCE_TRANSITION_REJECTED:${event.eventKind}:${reason}`);
}

function requireCurrency(state: BookingFinanceState, event: BookingFinanceEvent): void {
  if (!/^[A-Z]{3}$/.test(event.currency)) transitionError(event, "INVALID_CURRENCY");
  if (state.currency !== event.currency) transitionError(event, "CURRENCY_MISMATCH");
  if (event.amountMinor < 0n) transitionError(event, "NEGATIVE_AMOUNT");
}

export function reduceBookingFinanceState(
  current: BookingFinanceState,
  event: BookingFinanceEvent,
): BookingFinanceState {
  requireCurrency(current, event);
  let next: BookingFinanceState = { ...current };

  switch (event.eventKind) {
    case "PAYMENT_AUTHORIZED":
      if (current.paymentState !== "PENDING") transitionError(event, "PAYMENT_NOT_PENDING");
      next = { ...next, paymentState: "AUTHORIZED", authorizedMinor: event.amountMinor };
      break;
    case "PAYMENT_CAPTURED":
      if (!(["PENDING", "AUTHORIZED"] as const).includes(current.paymentState as "PENDING" | "AUTHORIZED")) {
        transitionError(event, "PAYMENT_NOT_CAPTURABLE");
      }
      if (current.authorizedMinor > 0n && event.amountMinor > current.authorizedMinor) {
        transitionError(event, "CAPTURE_EXCEEDS_AUTHORIZATION");
      }
      next = {
        ...next,
        paymentState: "CAPTURED",
        capturedMinor: event.amountMinor,
        reconciliationState: "PENDING",
      };
      break;
    case "PAYMENT_FAILED":
      if (!(["PENDING", "AUTHORIZED"] as const).includes(current.paymentState as "PENDING" | "AUTHORIZED")) {
        transitionError(event, "PAYMENT_NOT_FAILABLE");
      }
      next = { ...next, paymentState: "FAILED" };
      break;
    case "PAYMENT_CANCELLED":
      if (!(["PENDING", "AUTHORIZED"] as const).includes(current.paymentState as "PENDING" | "AUTHORIZED")) {
        transitionError(event, "PAYMENT_NOT_CANCELLABLE");
      }
      next = { ...next, paymentState: "CANCELLED" };
      break;
    case "REFUND_REQUESTED": {
      const refundable = current.capturedMinor - current.refundedMinor;
      if (event.amountMinor === 0n || event.amountMinor > refundable) transitionError(event, "INVALID_REFUND_REQUEST");
      if (!(["CAPTURED", "PARTIALLY_REFUNDED"] as const).includes(
        current.paymentState as "CAPTURED" | "PARTIALLY_REFUNDED",
      )) transitionError(event, "PAYMENT_NOT_REFUNDABLE");
      next = { ...next, refundState: "REQUESTED" };
      break;
    }
    case "REFUND_SUCCEEDED": {
      if (current.refundState !== "REQUESTED") transitionError(event, "REFUND_NOT_REQUESTED");
      const refundedMinor = current.refundedMinor + event.amountMinor;
      if (event.amountMinor === 0n || refundedMinor > current.capturedMinor) {
        transitionError(event, "REFUND_EXCEEDS_CAPTURE");
      }
      const complete = refundedMinor === current.capturedMinor;
      next = {
        ...next,
        refundedMinor,
        refundState: complete ? "COMPLETE" : "PARTIAL",
        paymentState: complete ? "REFUNDED" : "PARTIALLY_REFUNDED",
        reconciliationState: "PENDING",
      };
      break;
    }
    case "REFUND_FAILED":
      if (current.refundState !== "REQUESTED") transitionError(event, "REFUND_NOT_REQUESTED");
      next = { ...next, refundState: "FAILED" };
      break;
    case "DISPUTE_OPENED":
      if (!(["CAPTURED", "PARTIALLY_REFUNDED"] as const).includes(
        current.paymentState as "CAPTURED" | "PARTIALLY_REFUNDED",
      )) transitionError(event, "PAYMENT_NOT_DISPUTABLE");
      if (current.disputeState !== "NONE") transitionError(event, "DISPUTE_ALREADY_EXISTS");
      next = { ...next, disputeState: "OPEN", reconciliationState: "PENDING" };
      break;
    case "DISPUTE_WON":
      if (current.disputeState !== "OPEN") transitionError(event, "DISPUTE_NOT_OPEN");
      next = { ...next, disputeState: "WON", reconciliationState: "PENDING" };
      break;
    case "DISPUTE_LOST":
      if (current.disputeState !== "OPEN") transitionError(event, "DISPUTE_NOT_OPEN");
      next = { ...next, disputeState: "LOST", reconciliationState: "PENDING" };
      break;
    case "CHARGEBACK_DEBITED": {
      const exposed = current.capturedMinor - current.refundedMinor - current.chargebackDebitedMinor;
      if (event.amountMinor === 0n || event.amountMinor > exposed) transitionError(event, "CHARGEBACK_EXCEEDS_EXPOSURE");
      next = {
        ...next,
        paymentState: "CHARGEBACK",
        chargebackState: "DEBITED",
        chargebackDebitedMinor: current.chargebackDebitedMinor + event.amountMinor,
        reconciliationState: "PENDING",
      };
      break;
    }
    case "CHARGEBACK_REVERSED": {
      const reversible = current.chargebackDebitedMinor - current.chargebackReversedMinor;
      if (event.amountMinor === 0n || event.amountMinor > reversible) {
        transitionError(event, "REVERSAL_EXCEEDS_CHARGEBACK");
      }
      const chargebackReversedMinor = current.chargebackReversedMinor + event.amountMinor;
      next = {
        ...next,
        chargebackReversedMinor,
        chargebackState:
          chargebackReversedMinor === current.chargebackDebitedMinor ? "REVERSED" : "PARTIALLY_REVERSED",
        paymentState:
          chargebackReversedMinor === current.chargebackDebitedMinor
            ? current.refundedMinor > 0n
              ? "PARTIALLY_REFUNDED"
              : "CAPTURED"
            : "CHARGEBACK",
        reconciliationState: "PENDING",
      };
      break;
    }
    case "PROVIDER_FEE_ASSESSED":
      next = { ...next, providerFeeMinor: current.providerFeeMinor + event.amountMinor, reconciliationState: "PENDING" };
      break;
    case "PAYOUT_PAID":
    case "PAYOUT_FAILED":
      next = { ...next, reconciliationState: "PENDING" };
      break;
    case "RECONCILIATION_MATCHED":
      next = { ...next, reconciliationState: "MATCHED" };
      break;
    case "RECONCILIATION_VARIANCE":
      next = { ...next, reconciliationState: "VARIANCE" };
      break;
    case "RECONCILIATION_RESOLVED":
      if (current.reconciliationState !== "VARIANCE") transitionError(event, "NO_VARIANCE_TO_RESOLVE");
      next = { ...next, reconciliationState: "RESOLVED" };
      break;
  }

  return { ...next, aggregateVersion: current.aggregateVersion + 1, lastEventId: event.id };
}

export type RevenueAllocationPosting = Readonly<{
  kind:
    | "MARKETING_CONTRIBUTION"
    | "PERSONAL_TECHNOLOGY_RIGHT"
    | "GLOBAL_CONCEPT_RIGHT"
    | "OPERATING_REMAINDER";
  amountMinor: bigint;
  beneficiaryState: "RESOLVED" | "UNRESOLVED";
  beneficiaryKind?: string;
  beneficiaryReference?: string;
}>;

export type ErpAccountRole =
  | "PAYMENT_PROVIDER_CLEARING"
  | "BOOKING_REVENUE_CLEARING"
  | "BOOKING_REFUND_CLEARING"
  | "MARKETING_CONTRIBUTION_PAYABLE"
  | "AMBASSADOR_MARKETING_PAYABLE"
  | "PERSONAL_TECHNOLOGY_RIGHT_PAYABLE"
  | "GLOBAL_CONCEPT_RIGHT_PAYABLE"
  | "FRANCHISE_OPERATING_PAYABLE"
  | "PROVIDER_FEE_EXPENSE"
  | "CHARGEBACK_LOSS"
  | "CHARGEBACK_RECOVERY_RECEIVABLE"
  | "PAYOUT_CLEARING";

export type ErpJournalLineDraft = Readonly<{
  id: string;
  lineNumber: number;
  accountRole: ErpAccountRole;
  beneficiaryKind?: string;
  beneficiaryReference?: string;
  debitMinor: bigint;
  creditMinor: bigint;
}>;

export type ErpPostingDraft = Readonly<{
  id: string;
  postingKind: "PAYMENT_CAPTURE" | "REFUND" | "PROVIDER_FEE" | "CHARGEBACK_DEBIT" | "CHARGEBACK_REVERSAL" | "PAYOUT";
  semanticMappingVersion: typeof ERP_SEMANTIC_MAPPING_VERSION;
  lines: readonly ErpJournalLineDraft[];
  payloadHash: string;
}>;

function payableRole(allocation: RevenueAllocationPosting): ErpAccountRole {
  if (allocation.kind === "MARKETING_CONTRIBUTION") {
    return allocation.beneficiaryKind === "AMBASSADOR"
      ? "AMBASSADOR_MARKETING_PAYABLE"
      : "MARKETING_CONTRIBUTION_PAYABLE";
  }
  if (allocation.kind === "PERSONAL_TECHNOLOGY_RIGHT") return "PERSONAL_TECHNOLOGY_RIGHT_PAYABLE";
  if (allocation.kind === "GLOBAL_CONCEPT_RIGHT") return "GLOBAL_CONCEPT_RIGHT_PAYABLE";
  return "FRANCHISE_OPERATING_PAYABLE";
}

function assertBalanced(lines: readonly ErpJournalLineDraft[]): void {
  const debit = lines.reduce((sum, line) => sum + line.debitMinor, 0n);
  const credit = lines.reduce((sum, line) => sum + line.creditMinor, 0n);
  if (lines.length < 2 || debit === 0n || debit !== credit) {
    throw new Error("ERP_POSTING_NOT_BALANCED");
  }
}

function postingHash(event: BookingFinanceEvent, lines: readonly ErpJournalLineDraft[]): string {
  const material = JSON.stringify({
    version: ERP_SEMANTIC_MAPPING_VERSION,
    eventId: event.id,
    eventKind: event.eventKind,
    currency: event.currency,
    lines: lines.map((line) => ({
      lineNumber: line.lineNumber,
      accountRole: line.accountRole,
      beneficiaryKind: line.beneficiaryKind,
      beneficiaryReference: line.beneficiaryReference,
      debitMinor: line.debitMinor.toString(),
      creditMinor: line.creditMinor.toString(),
    })),
  });
  return createHash("sha256").update(material).digest("hex");
}

export function buildCaptureErpPosting(
  event: BookingFinanceEvent,
  allocations: readonly RevenueAllocationPosting[],
): ErpPostingDraft {
  if (event.eventKind !== "PAYMENT_CAPTURED") throw new Error("ERP_CAPTURE_EVENT_REQUIRED");
  if (allocations.length !== 4) throw new Error("ERP_CAPTURE_REQUIRES_FOUR_ALLOCATIONS");
  if (allocations.some((allocation) => allocation.beneficiaryState !== "RESOLVED")) {
    throw new Error("ERP_CAPTURE_BENEFICIARY_UNRESOLVED");
  }
  const allocationTotal = allocations.reduce((sum, allocation) => sum + allocation.amountMinor, 0n);
  if (allocationTotal !== event.amountMinor) throw new Error("ERP_CAPTURE_ALLOCATION_MISMATCH");

  const lines: ErpJournalLineDraft[] = [
    {
      id: randomUUID(),
      lineNumber: 1,
      accountRole: "PAYMENT_PROVIDER_CLEARING",
      debitMinor: event.amountMinor,
      creditMinor: 0n,
    },
    {
      id: randomUUID(),
      lineNumber: 2,
      accountRole: "BOOKING_REVENUE_CLEARING",
      debitMinor: 0n,
      creditMinor: event.amountMinor,
    },
    {
      id: randomUUID(),
      lineNumber: 3,
      accountRole: "BOOKING_REVENUE_CLEARING",
      debitMinor: event.amountMinor,
      creditMinor: 0n,
    },
    ...allocations.map((allocation, index) => ({
      id: randomUUID(),
      lineNumber: index + 4,
      accountRole: payableRole(allocation),
      beneficiaryKind: allocation.beneficiaryKind,
      beneficiaryReference: allocation.beneficiaryReference,
      debitMinor: 0n,
      creditMinor: allocation.amountMinor,
    })),
  ];
  assertBalanced(lines);
  return {
    id: randomUUID(),
    postingKind: "PAYMENT_CAPTURE",
    semanticMappingVersion: ERP_SEMANTIC_MAPPING_VERSION,
    lines,
    payloadHash: postingHash(event, lines),
  };
}

export function buildSimpleErpPosting(event: BookingFinanceEvent): ErpPostingDraft {
  let postingKind: ErpPostingDraft["postingKind"];
  let debitRole: ErpAccountRole;
  let creditRole: ErpAccountRole;

  switch (event.eventKind) {
    case "REFUND_SUCCEEDED":
      postingKind = "REFUND";
      debitRole = "BOOKING_REFUND_CLEARING";
      creditRole = "PAYMENT_PROVIDER_CLEARING";
      break;
    case "PROVIDER_FEE_ASSESSED":
      postingKind = "PROVIDER_FEE";
      debitRole = "PROVIDER_FEE_EXPENSE";
      creditRole = "PAYMENT_PROVIDER_CLEARING";
      break;
    case "CHARGEBACK_DEBITED":
      postingKind = "CHARGEBACK_DEBIT";
      debitRole = "CHARGEBACK_LOSS";
      creditRole = "PAYMENT_PROVIDER_CLEARING";
      break;
    case "CHARGEBACK_REVERSED":
      postingKind = "CHARGEBACK_REVERSAL";
      debitRole = "PAYMENT_PROVIDER_CLEARING";
      creditRole = "CHARGEBACK_RECOVERY_RECEIVABLE";
      break;
    case "PAYOUT_PAID":
      postingKind = "PAYOUT";
      debitRole = "PAYOUT_CLEARING";
      creditRole = "PAYMENT_PROVIDER_CLEARING";
      break;
    default:
      throw new Error(`ERP_POSTING_UNSUPPORTED_EVENT:${event.eventKind}`);
  }

  if (event.amountMinor <= 0n) throw new Error("ERP_POSTING_AMOUNT_REQUIRED");
  const lines: readonly ErpJournalLineDraft[] = [
    { id: randomUUID(), lineNumber: 1, accountRole: debitRole, debitMinor: event.amountMinor, creditMinor: 0n },
    { id: randomUUID(), lineNumber: 2, accountRole: creditRole, debitMinor: 0n, creditMinor: event.amountMinor },
  ];
  assertBalanced(lines);
  return {
    id: randomUUID(),
    postingKind,
    semanticMappingVersion: ERP_SEMANTIC_MAPPING_VERSION,
    lines,
    payloadHash: postingHash(event, lines),
  };
}
