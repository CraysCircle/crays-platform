"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./clubs-operations-payment-status-panel.module.css";

const STATUS_ENDPOINT =
  "/api/crays/clubs/sandbox/payments/operations-inbox" as const;

const MISSING_SETUP = Object.freeze([
  {
    code: "canonical_authority",
    title: "Canonical stay authority",
    detail: "Accepted quote, active hold and exact Team GO must agree.",
  },
  {
    code: "owner_price_authority",
    title: "Owner price authority",
    detail: "Exact TEST amount, currency and tax treatment must be approved.",
  },
  {
    code: "clubs_test_catalog",
    title: "Clubs TEST catalog",
    detail: "The Clubs-only Product and quote-bound Price are not bound yet.",
  },
  {
    code: "beneficiary_accounts",
    title: "Four TEST account bindings",
    detail: "Operator, Ambassador, Software and Global Concept remain unbound.",
  },
  {
    code: "webhook_reconciliation",
    title: "Webhook and reconciliation",
    detail: "The Clubs-only TEST webhook and durable reconciliation are pending.",
  },
] as const);

type SafePendingPayload = Readonly<{
  state: "PERSISTENT_INBOX_UNAVAILABLE";
  signatureSecretsExposed: false;
  piiExposed: false;
  livemode: false;
  sourceOnly: true;
  persisted: false;
  providerSuccessClaimed: false;
  items: readonly unknown[];
}>;

type ViewState =
  | { kind: "loading" }
  | { kind: "pending"; retryAfter: number | null }
  | { kind: "unavailable" };

const SAFE_KEYS = [
  "state",
  "signatureSecretsExposed",
  "piiExposed",
  "livemode",
  "sourceOnly",
  "persisted",
  "providerSuccessClaimed",
  "items",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseSafePending(value: unknown): SafePendingPayload | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value).sort();
  const expected = [...SAFE_KEYS].sort();
  if (
    keys.length !== expected.length ||
    !expected.every((key, index) => keys[index] === key) ||
    value.state !== "PERSISTENT_INBOX_UNAVAILABLE" ||
    value.signatureSecretsExposed !== false ||
    value.piiExposed !== false ||
    value.livemode !== false ||
    value.sourceOnly !== true ||
    value.persisted !== false ||
    value.providerSuccessClaimed !== false ||
    !Array.isArray(value.items)
  ) {
    return null;
  }
  return value as SafePendingPayload;
}

function safeRetryAfter(value: string | null): number | null {
  if (!value || !/^\d{1,3}$/.test(value)) return null;
  const seconds = Number(value);
  return seconds >= 0 && seconds <= 300 ? seconds : null;
}

export function ClubsOperationsPaymentStatusPanel() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ kind: "loading" });
    try {
      const response = await fetch(STATUS_ENDPOINT, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      const payload = parseSafePending(
        await response.json().catch(() => null),
      );
      if (!payload || response.status !== 503) {
        setState({ kind: "unavailable" });
        return;
      }
      setState({
        kind: "pending",
        retryAfter: safeRetryAfter(response.headers.get("retry-after")),
      });
      setLastChecked(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()),
      );
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setState({ kind: "unavailable" });
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(initialLoad);
      controllerRef.current?.abort();
    };
  }, [load]);

  return (
    <section
      className={styles.root}
      aria-labelledby="clubs-payment-status-title"
      aria-busy={state.kind === "loading"}
    >
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>CRAYS Clubs · Operations</p>
          <div className={styles.titleRow}>
            <h2 id="clubs-payment-status-title">Payment setup</h2>
            <span className={styles.pendingPill}>payment_setup_pending</span>
          </div>
          <p className={styles.intro}>
            Read-only TEST readiness. This panel never creates a payment or
            calls a provider.
          </p>
        </div>
        <button
          type="button"
          className={styles.refreshButton}
          disabled={state.kind === "loading"}
          onClick={() => void load()}
        >
          {state.kind === "loading" ? "Refreshing…" : "Retry / refresh"}
        </button>
      </header>

      <div className={styles.boundary} aria-label="Payment safety boundary">
        <span>TEST boundary</span>
        <strong>livemode=false</strong>
        <span>Read-only status API</span>
        <span>No provider call from this panel</span>
      </div>

      <div className={styles.status} role="status" aria-live="polite">
        <span
          className={state.kind === "loading" ? styles.spinner : styles.dot}
          aria-hidden="true"
        />
        <div>
          <strong>
            {state.kind === "loading"
              ? "Reading payment setup status"
              : state.kind === "pending"
                ? "Setup remains pending"
                : "Status read temporarily unavailable"}
          </strong>
          <p>
            {state.kind === "pending"
              ? `Persistent inbox unavailable. Retry${
                  state.retryAfter === null
                    ? ""
                    : ` after ${state.retryAfter} seconds`
                }.${lastChecked ? ` Last checked ${lastChecked}.` : ""}`
              : "No setup, payment or provider outcome is inferred."}
          </p>
        </div>
      </div>

      <div className={styles.missingSetup}>
        <div>
          <p className={styles.eyebrow}>missing_setup</p>
          <h3>Required before payment preparation</h3>
        </div>
        <ul className={styles.categoryGrid}>
          {MISSING_SETUP.map((category) => (
            <li key={category.code}>
              <span>{category.code}</span>
              <strong>{category.title}</strong>
              <p>{category.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
