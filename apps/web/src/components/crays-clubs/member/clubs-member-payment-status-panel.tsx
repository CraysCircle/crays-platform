"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import styles from "./clubs-member-payment-status-panel.module.css";

const PAYMENT_STATUS_ROOT = "/api/crays/clubs/sandbox/payments" as const;
const RECONCILE_STATUS_ENDPOINT =
  "/api/crays/clubs/sandbox/payments/operations-inbox" as const;
const PAYMENT_ID = /^cclubpay_[a-f0-9]{40}$/;

type ServerPaymentState =
  | "PREPARED"
  | "REQUIRES_PAYMENT_METHOD"
  | "REQUIRES_ACTION"
  | "PROCESSING"
  | "AUTHORIZED"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED"
  | "REFUNDED";

type MemberPaymentStatus =
  | "payment_setup_pending"
  | "ready_to_pay"
  | "processing"
  | "reconcile_required"
  | "paid-confirmation-received"
  | "failed"
  | "refund-pending";

type SafePaymentRow = Readonly<{
  payment_id: string;
  payment_kind: "MEMBERSHIP" | "STAY";
  subject_reference: string;
  amount_minor: string | number;
  currency: string;
  payment_state: ServerPaymentState;
  stripe_payment_intent_id: string | null;
  allocation_plan_sha256: string;
  created_at: string;
  updated_at: string;
}>;

type SafeReconcileEnvelope = Readonly<{
  state: string;
  signatureSecretsExposed: false;
  piiExposed: false;
  livemode: false;
  sourceOnly: boolean;
  persisted: boolean;
  providerSuccessClaimed: false;
  items: readonly unknown[];
}>;

type PaymentReadResult =
  | { kind: "ready"; payment: SafePaymentRow }
  | { kind: "authentication_required" }
  | { kind: "not_found" }
  | { kind: "unavailable" };

type ViewState =
  | { kind: "loading" }
  | {
      kind: "display";
      status: MemberPaymentStatus;
      serverAuthorized: boolean;
      reconcileRequired: boolean;
      detailOverride?: string;
      checkedAt: string;
    };

type StatusCopy = Readonly<{
  title: string;
  detail: string;
  tone: "neutral" | "positive" | "attention";
}>;

export type ClubsMemberPaymentStatusPanelProps = Readonly<{
  paymentId?: string | null;
}>;

const PAYMENT_KEYS = [
  "payment_id",
  "payment_kind",
  "subject_reference",
  "amount_minor",
  "currency",
  "payment_state",
  "stripe_payment_intent_id",
  "allocation_plan_sha256",
  "created_at",
  "updated_at",
] as const;

const RECONCILE_KEYS = [
  "state",
  "signatureSecretsExposed",
  "piiExposed",
  "livemode",
  "sourceOnly",
  "persisted",
  "providerSuccessClaimed",
  "items",
] as const;

const SERVER_PAYMENT_STATES = new Set<ServerPaymentState>([
  "PREPARED",
  "REQUIRES_PAYMENT_METHOD",
  "REQUIRES_ACTION",
  "PROCESSING",
  "AUTHORIZED",
  "SUCCEEDED",
  "FAILED",
  "CANCELED",
  "REFUNDED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    sortedExpected.every((key, index) => actual[index] === key)
  );
}

function parsePaymentEnvelope(
  value: unknown,
  expectedPaymentId: string,
): SafePaymentRow | null {
  if (!isRecord(value) || !hasExactKeys(value, ["status", "payment"])) {
    return null;
  }
  if (value.status !== "ready" || !isRecord(value.payment)) return null;
  const payment = value.payment;
  if (!hasExactKeys(payment, PAYMENT_KEYS)) return null;
  if (
    payment.payment_id !== expectedPaymentId ||
    (payment.payment_kind !== "MEMBERSHIP" && payment.payment_kind !== "STAY") ||
    typeof payment.subject_reference !== "string" ||
    payment.subject_reference.length < 3 ||
    (typeof payment.amount_minor !== "string" &&
      typeof payment.amount_minor !== "number") ||
    !/^[A-Z]{3}$/.test(String(payment.currency)) ||
    !SERVER_PAYMENT_STATES.has(payment.payment_state as ServerPaymentState) ||
    (payment.stripe_payment_intent_id !== null &&
      typeof payment.stripe_payment_intent_id !== "string") ||
    !/^[a-f0-9]{64}$/.test(String(payment.allocation_plan_sha256)) ||
    typeof payment.created_at !== "string" ||
    typeof payment.updated_at !== "string" ||
    !Number.isFinite(Date.parse(payment.created_at)) ||
    !Number.isFinite(Date.parse(payment.updated_at))
  ) {
    return null;
  }
  return payment as SafePaymentRow;
}

function parseReconcileEnvelope(value: unknown): SafeReconcileEnvelope | null {
  if (!isRecord(value) || !hasExactKeys(value, RECONCILE_KEYS)) return null;
  if (
    typeof value.state !== "string" ||
    value.signatureSecretsExposed !== false ||
    value.piiExposed !== false ||
    value.livemode !== false ||
    typeof value.sourceOnly !== "boolean" ||
    typeof value.persisted !== "boolean" ||
    value.providerSuccessClaimed !== false ||
    !Array.isArray(value.items)
  ) {
    return null;
  }
  return value as SafeReconcileEnvelope;
}

async function readPaymentStatus(
  paymentId: string,
  signal: AbortSignal,
): Promise<PaymentReadResult> {
  try {
    const response = await fetch(
      `${PAYMENT_STATUS_ROOT}/${encodeURIComponent(paymentId)}`,
      {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        headers: { accept: "application/json" },
        signal,
      },
    );
    if (response.status === 401 || response.status === 403) {
      return { kind: "authentication_required" };
    }
    if (response.status === 404) return { kind: "not_found" };
    const payment = parsePaymentEnvelope(
      await response.json().catch(() => null),
      paymentId,
    );
    if (!response.ok || !payment) return { kind: "unavailable" };
    return { kind: "ready", payment };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { kind: "unavailable" };
  }
}

async function readReconcileRequired(signal: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(RECONCILE_STATUS_ENDPOINT, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
      signal,
    });
    const envelope = parseReconcileEnvelope(
      await response.json().catch(() => null),
    );
    return !(
      response.ok &&
      envelope?.persisted === true &&
      envelope.sourceOnly === false
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return true;
  }
}

function memberStatus(paymentState: ServerPaymentState): MemberPaymentStatus {
  if (
    paymentState === "PREPARED" ||
    paymentState === "REQUIRES_PAYMENT_METHOD"
  ) {
    return "ready_to_pay";
  }
  if (
    paymentState === "REQUIRES_ACTION" ||
    paymentState === "PROCESSING" ||
    paymentState === "AUTHORIZED"
  ) {
    return "processing";
  }
  if (paymentState === "SUCCEEDED") return "paid-confirmation-received";
  if (paymentState === "REFUNDED") return "refund-pending";
  return "failed";
}

function copyFor(status: MemberPaymentStatus): StatusCopy {
  switch (status) {
    case "ready_to_pay":
      return {
        title: "Payment is ready on the server",
        detail:
          "The server-authorized payment record is ready for the separate secure payment surface. This panel cannot submit payment.",
        tone: "positive",
      };
    case "processing":
      return {
        title: "Payment is processing",
        detail:
          "A payment state is in progress. Refresh this read-only panel before taking another action.",
        tone: "neutral",
      };
    case "reconcile_required":
      return {
        title: "Payment status needs reconciliation",
        detail:
          "The current outcome cannot be trusted yet. Retry the status read; no payment action is repeated here.",
        tone: "attention",
      };
    case "paid-confirmation-received":
      return {
        title: "Payment confirmation received",
        detail:
          "The payment ledger received confirmation. This does not confirm the hotel booking, stay or provider fulfilment.",
        tone: "positive",
      };
    case "failed":
      return {
        title: "Payment did not complete",
        detail:
          "No completed payment is assumed. Refresh for the latest server state before trying the separate payment flow again.",
        tone: "attention",
      };
    case "refund-pending":
      return {
        title: "Refund reconciliation pending",
        detail:
          "A refunded payment state was received. Member-facing finalization remains pending reconciliation.",
        tone: "attention",
      };
    case "payment_setup_pending":
    default:
      return {
        title: "Payment setup is pending",
        detail:
          "The exact server authority and TEST bindings are not ready. No payment can be started from this panel.",
        tone: "neutral",
      };
  }
}

function checkedAt(): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export function ClubsMemberPaymentStatusPanel({
  paymentId = null,
}: ClubsMemberPaymentStatusPanelProps) {
  const headingId = useId();
  const controllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ kind: "loading" });
    try {
      const reconcilePromise = readReconcileRequired(controller.signal);
      if (!paymentId || !PAYMENT_ID.test(paymentId)) {
        await reconcilePromise;
        setState({
          kind: "display",
          status: "payment_setup_pending",
          serverAuthorized: false,
          reconcileRequired: false,
          checkedAt: checkedAt(),
        });
        return;
      }
      const [result, reconcileRequired] = await Promise.all([
        readPaymentStatus(paymentId, controller.signal),
        reconcilePromise,
      ]);
      if (result.kind === "authentication_required") {
        setState({
          kind: "display",
          status: "payment_setup_pending",
          serverAuthorized: false,
          reconcileRequired: false,
          detailOverride:
            "An authenticated CRAYS Clubs member session is required to read this payment.",
          checkedAt: checkedAt(),
        });
        return;
      }
      if (result.kind === "not_found") {
        setState({
          kind: "display",
          status: "payment_setup_pending",
          serverAuthorized: false,
          reconcileRequired: false,
          checkedAt: checkedAt(),
        });
        return;
      }
      if (result.kind === "unavailable") {
        setState({
          kind: "display",
          status: "reconcile_required",
          serverAuthorized: false,
          reconcileRequired: true,
          checkedAt: checkedAt(),
        });
        return;
      }
      setState({
        kind: "display",
        status: memberStatus(result.payment.payment_state),
        serverAuthorized: true,
        reconcileRequired,
        checkedAt: checkedAt(),
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setState({
          kind: "display",
          status: "reconcile_required",
          serverAuthorized: false,
          reconcileRequired: true,
          checkedAt: checkedAt(),
        });
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [paymentId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(initialLoad);
      controllerRef.current?.abort();
    };
  }, [load]);

  const display =
    state.kind === "display" ? state : null;
  const effectiveStatus =
    display?.status === "ready_to_pay" && display.serverAuthorized !== true
      ? "payment_setup_pending"
      : (display?.status ?? "payment_setup_pending");
  const copy = copyFor(effectiveStatus);
  const toneClass =
    copy.tone === "positive"
      ? styles.statusPositive
      : copy.tone === "attention"
        ? styles.statusAttention
        : styles.statusNeutral;

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>CRAYS Clubs · Member payment</p>
          <h2 className={styles.heading} id={headingId}>Payment status</h2>
        </div>
        <button
          className={styles.refreshButton}
          disabled={state.kind === "loading"}
          onClick={() => void load()}
          type="button"
        >
          {state.kind === "loading" ? "Checking…" : "Refresh status"}
        </button>
      </header>

      <div className={styles.testBoundary}>
        <strong>livemode=false</strong>
        <span>Read-only status and reconciliation GETs</span>
        <span>No payment submission</span>
      </div>

      <div
        className={`${styles.status} ${toneClass}`}
        aria-atomic="true"
        aria-live="polite"
        role={effectiveStatus === "failed" ? "alert" : "status"}
      >
        <p className={styles.statusCode}>
          {state.kind === "loading" ? "status_read_in_progress" : effectiveStatus}
        </p>
        <h3>{state.kind === "loading" ? "Checking payment status" : copy.title}</h3>
        <p>
          {state.kind === "loading"
            ? "Reading current server state without starting or repeating a payment."
            : (display?.detailOverride ?? copy.detail)}
        </p>
        {display?.reconcileRequired &&
        effectiveStatus !== "reconcile_required" &&
        effectiveStatus !== "payment_setup_pending" &&
        effectiveStatus !== "ready_to_pay" ? (
          <span className={styles.reconcileFlag}>reconcile_required</span>
        ) : null}
      </div>

      <footer className={styles.footer}>
        <span>Booking confirmation remains a separate server authority.</span>
        {display ? <span>Last checked {display.checkedAt}</span> : null}
      </footer>
    </section>
  );
}
