"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import styles from "./clubs-member-payment-activity-panel.module.css";

const PAYMENT_STATUS_ROOT = "/api/crays/clubs/sandbox/payments" as const;
const RECONCILIATION_STATUS_ENDPOINT =
  "/api/crays/clubs/sandbox/payments/operations-inbox" as const;
const PAYMENT_ID_PATTERN = /^cclubpay_[a-f0-9]{40}$/;
const MAX_PAYMENT_REFERENCES = 8;

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

type PaymentActivityStatus =
  | "no_payments"
  | "setup_pending"
  | "processing"
  | "reconcile_required"
  | "paid_confirmation"
  | "failed"
  | "refund_pending"
  | "refunded";

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

type SafeReconciliationEnvelope = Readonly<{
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

type ActivityItem = Readonly<{
  slotKey: string;
  domain: "Membership fee" | "Stay payment" | "Payment activity";
  status: PaymentActivityStatus;
  detail: string;
  updatedAt: string | null;
  reconcileRequired: boolean;
}>;

type ActivityViewState =
  | { kind: "loading" }
  | {
      kind: "display";
      summaryStatus: PaymentActivityStatus;
      items: readonly ActivityItem[];
      checkedAt: string;
    };

type StatusCopy = Readonly<{
  label: PaymentActivityStatus;
  title: string;
  detail: string;
  tone: "neutral" | "positive" | "attention";
}>;

type NormalizedPaymentReferences = Readonly<{
  paymentIds: readonly string[];
  hadInput: boolean;
  inputConflict: boolean;
}>;

export type ClubsMemberPaymentActivityPanelProps = Readonly<{
  paymentIds?: readonly string[] | null;
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

const RECONCILIATION_KEYS = [
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

function normalizePaymentReferences(
  input: readonly string[] | null | undefined,
): NormalizedPaymentReferences {
  if (!Array.isArray(input) || input.length === 0) {
    return { paymentIds: [], hadInput: false, inputConflict: false };
  }
  const unique = new Set<string>();
  let inputConflict = false;
  for (const value of input) {
    if (typeof value !== "string" || !PAYMENT_ID_PATTERN.test(value)) {
      inputConflict = true;
      continue;
    }
    if (unique.has(value)) continue;
    if (unique.size >= MAX_PAYMENT_REFERENCES) {
      inputConflict = true;
      continue;
    }
    unique.add(value);
  }
  return {
    paymentIds: [...unique],
    hadInput: true,
    inputConflict,
  };
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

function parseReconciliationEnvelope(
  value: unknown,
): SafeReconciliationEnvelope | null {
  if (!isRecord(value) || !hasExactKeys(value, RECONCILIATION_KEYS)) {
    return null;
  }
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
  return value as SafeReconciliationEnvelope;
}

async function readPayment(
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

async function reconciliationRequired(signal: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(RECONCILIATION_STATUS_ENDPOINT, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
      signal,
    });
    const envelope = parseReconciliationEnvelope(
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

function serverStatus(
  paymentState: ServerPaymentState,
  needsReconciliation: boolean,
): PaymentActivityStatus {
  if (
    paymentState === "PREPARED" ||
    paymentState === "REQUIRES_PAYMENT_METHOD"
  ) {
    return "setup_pending";
  }
  if (
    paymentState === "REQUIRES_ACTION" ||
    paymentState === "PROCESSING" ||
    paymentState === "AUTHORIZED"
  ) {
    return "processing";
  }
  if (paymentState === "SUCCEEDED") return "paid_confirmation";
  if (paymentState === "REFUNDED") {
    return needsReconciliation ? "refund_pending" : "refunded";
  }
  return "failed";
}

function toActivityItem(
  result: PaymentReadResult,
  index: number,
  needsReconciliation: boolean,
): ActivityItem {
  if (result.kind === "ready") {
    const status = serverStatus(
      result.payment.payment_state,
      needsReconciliation,
    );
    return {
      slotKey: `activity-${index}-${result.payment.updated_at}`,
      domain:
        result.payment.payment_kind === "MEMBERSHIP"
          ? "Membership fee"
          : "Stay payment",
      status,
      detail: copyFor(status).detail,
      updatedAt: result.payment.updated_at,
      reconcileRequired:
        needsReconciliation &&
        status !== "setup_pending" &&
        status !== "refund_pending",
    };
  }
  if (result.kind === "authentication_required") {
    return {
      slotKey: `activity-${index}-authentication`,
      domain: "Payment activity",
      status: "setup_pending",
      detail:
        "An authenticated CRAYS Clubs member session is required to read this activity.",
      updatedAt: null,
      reconcileRequired: false,
    };
  }
  if (result.kind === "not_found") {
    return {
      slotKey: `activity-${index}-not-found`,
      domain: "Payment activity",
      status: "setup_pending",
      detail:
        "No server-authorized payment record is available for this activity slot.",
      updatedAt: null,
      reconcileRequired: false,
    };
  }
  return {
    slotKey: `activity-${index}-unavailable`,
    domain: "Payment activity",
    status: "reconcile_required",
    detail:
      "The current server result cannot be trusted yet. Refresh this read-only view later.",
    updatedAt: null,
    reconcileRequired: true,
  };
}

function summaryStatus(
  items: readonly ActivityItem[],
  needsReconciliation: boolean,
): PaymentActivityStatus {
  if (needsReconciliation || items.some((item) => item.status === "reconcile_required")) {
    return "reconcile_required";
  }
  const priority: readonly PaymentActivityStatus[] = [
    "processing",
    "refund_pending",
    "refunded",
    "paid_confirmation",
    "failed",
    "setup_pending",
  ];
  return (
    priority.find((status) => items.some((item) => item.status === status)) ??
    "setup_pending"
  );
}

function copyFor(status: PaymentActivityStatus): StatusCopy {
  switch (status) {
    case "no_payments":
      return {
        label: status,
        title: "No payment activity to show",
        detail:
          "No server-issued payment references are available in this view.",
        tone: "neutral",
      };
    case "setup_pending":
      return {
        label: status,
        title: "Payment setup is pending",
        detail:
          "A complete server-authorized payment record is not ready. No payment can be started here.",
        tone: "neutral",
      };
    case "processing":
      return {
        label: status,
        title: "Payment activity is processing",
        detail:
          "The server reports an in-progress state. Refresh before taking another action elsewhere.",
        tone: "neutral",
      };
    case "reconcile_required":
      return {
        label: status,
        title: "Payment activity needs reconciliation",
        detail:
          "One or more current outcomes cannot be trusted yet. This panel never repeats a payment.",
        tone: "attention",
      };
    case "paid_confirmation":
      return {
        label: status,
        title: "Payment confirmation received",
        detail:
          "The payment ledger reports confirmation received. Hotel booking, stay and provider fulfilment remain separate authorities.",
        tone: "positive",
      };
    case "failed":
      return {
        label: status,
        title: "Payment did not complete",
        detail:
          "The server reports a failed or cancelled payment state. No completed payment is assumed.",
        tone: "attention",
      };
    case "refund_pending":
      return {
        label: status,
        title: "Refund reconciliation is pending",
        detail:
          "A refunded server state was received while the reconciliation view is not yet authoritative.",
        tone: "attention",
      };
    case "refunded":
      return {
        label: status,
        title: "Refund state received",
        detail:
          "The server reports refunded and the reconciliation read is available. External settlement remains separate.",
        tone: "positive",
      };
  }
}

function formatServerTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function checkedAt(): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export function ClubsMemberPaymentActivityPanel({
  paymentIds = null,
}: ClubsMemberPaymentActivityPanelProps) {
  const headingId = useId();
  const controllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<ActivityViewState>({ kind: "loading" });

  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ kind: "loading" });
    try {
      const normalized = normalizePaymentReferences(paymentIds);
      if (normalized.paymentIds.length === 0) {
        setState({
          kind: "display",
          summaryStatus: normalized.hadInput ? "setup_pending" : "no_payments",
          items: [],
          checkedAt: checkedAt(),
        });
        return;
      }
      const [needsReconciliation, results] = await Promise.all([
        reconciliationRequired(controller.signal),
        Promise.all(
          normalized.paymentIds.map((paymentId) =>
            readPayment(paymentId, controller.signal),
          ),
        ),
      ]);
      const items = results.map((result, index) =>
        toActivityItem(result, index, needsReconciliation),
      );
      setState({
        kind: "display",
        summaryStatus: summaryStatus(
          items,
          needsReconciliation || normalized.inputConflict,
        ),
        items,
        checkedAt: checkedAt(),
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setState({
          kind: "display",
          summaryStatus: "reconcile_required",
          items: [],
          checkedAt: checkedAt(),
        });
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [paymentIds]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(initialLoad);
      controllerRef.current?.abort();
    };
  }, [load]);

  const display = state.kind === "display" ? state : null;
  const status = display?.summaryStatus ?? "setup_pending";
  const summary = copyFor(status);
  const toneClass =
    summary.tone === "positive"
      ? styles.statusPositive
      : summary.tone === "attention"
        ? styles.statusAttention
        : styles.statusNeutral;

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>CRAYS Clubs · Member payments</p>
          <h2 className={styles.heading} id={headingId}>
            Payment activity &amp; receipts
          </h2>
        </div>
        <button
          className={styles.refreshButton}
          type="button"
          onClick={() => void load()}
          disabled={state.kind === "loading"}
        >
          {state.kind === "loading" ? "Refreshing…" : "Refresh activity"}
        </button>
      </header>

      <div className={styles.summary} aria-live="polite">
        <span className={`${styles.statusPill} ${toneClass}`}>
          {summary.label}
        </span>
        <div>
          <h3 className={styles.summaryTitle}>{summary.title}</h3>
          <p className={styles.summaryDetail}>
            {state.kind === "loading"
              ? "Reading current server activity without starting or repeating a payment."
              : summary.detail}
          </p>
        </div>
      </div>

      {state.kind === "loading" ? (
        <div className={styles.loadingList} aria-hidden="true">
          <span />
          <span />
        </div>
      ) : state.items.length === 0 ? (
        <div className={styles.emptyState}>
          <p>{summary.detail}</p>
          <span>No payment identifiers or amounts are displayed.</span>
        </div>
      ) : (
        <ol className={styles.activityList}>
          {state.items.map((item) => {
            const itemCopy = copyFor(item.status);
            const itemToneClass =
              itemCopy.tone === "positive"
                ? styles.statusPositive
                : itemCopy.tone === "attention"
                  ? styles.statusAttention
                  : styles.statusNeutral;
            return (
              <li className={styles.activityItem} key={item.slotKey}>
                <div className={styles.itemTopline}>
                  <div>
                    <p className={styles.domain}>{item.domain}</p>
                    <h3 className={styles.itemTitle}>{itemCopy.title}</h3>
                  </div>
                  <span className={`${styles.statusPill} ${itemToneClass}`}>
                    {item.status}
                  </span>
                </div>
                <p className={styles.itemDetail}>{item.detail}</p>
                <div className={styles.itemMeta}>
                  <span>
                    {item.updatedAt
                      ? `Server updated ${formatServerTime(item.updatedAt)}`
                      : "Server update unavailable"}
                  </span>
                  {item.reconcileRequired ? (
                    <span className={styles.reconcileFlag}>
                      reconcile_required
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <footer className={styles.footer}>
        <span>Read-only: no payment or refund is started from this panel.</span>
        <span>
          Payment confirmation never confirms a booking or provider fulfilment.
        </span>
        {display ? <span>Last checked {display.checkedAt}</span> : null}
      </footer>
    </section>
  );
}
