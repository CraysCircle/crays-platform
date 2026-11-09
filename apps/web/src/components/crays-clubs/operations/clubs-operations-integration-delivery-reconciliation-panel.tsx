"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT,
  type ClubsOperationsPublicInquiryQueueItem,
  type ClubsOperationsPublicInquiryQueueProjection,
} from "@/lib/member-commerce/clubs-operations-public-inquiry-queue-contract";
import styles from "./clubs-operations-integration-delivery-reconciliation-panel.module.css";

type LastSafeStatus = Readonly<{
  inquiry: "queued" | "empty";
  reconciliation: "reconciled" | "not_reported";
  provider: "provider_not_bound";
}>;

type PanelState =
  | { kind: "loading"; lastSafeStatus: LastSafeStatus | null }
  | { kind: "authentication_required"; lastSafeStatus: LastSafeStatus | null }
  | { kind: "ready"; lastSafeStatus: LastSafeStatus; truncated: boolean }
  | { kind: "empty"; lastSafeStatus: LastSafeStatus }
  | { kind: "failed"; lastSafeStatus: LastSafeStatus | null };

type DeliveryState =
  | "queued"
  | "retry"
  | "reconcile_required"
  | "reconciled"
  | "failed";

const PROJECTION_KEYS = [
  "schema",
  "version",
  "status",
  "items",
  "truncated",
  "destination",
  "containsPersonalData",
  "providerDeliveryClaimed",
] as const;

const DELIVERY_STATES: readonly Readonly<{
  state: DeliveryState;
  label: string;
  description: string;
}>[] = [
  {
    state: "queued",
    label: "Queued",
    description: "A durable CRAYS Team outbox handoff is reported.",
  },
  {
    state: "retry",
    label: "Retry",
    description: "Shown only after an authorized read reports a safe retry state.",
  },
  {
    state: "reconcile_required",
    label: "Reconcile required",
    description: "Shown only when the outcome is explicitly uncertain.",
  },
  {
    state: "reconciled",
    label: "Reconciled",
    description: "Internal inquiry, receipt, and outbox evidence agree.",
  },
  {
    state: "failed",
    label: "Failed",
    description: "Shown only after a terminal integration failure is reported.",
  },
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  return (
    actual.length === required.length &&
    required.every((key, index) => actual[index] === key)
  );
}

function isSafeItem(value: unknown): value is ClubsOperationsPublicInquiryQueueItem {
  if (
    !isObject(value) ||
    !hasExactKeys(
      value,
      CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.projectionFields,
    )
  ) {
    return false;
  }
  return (
    typeof value.publicReference === "string" &&
    /^CRAYS-INQUIRY-[0-9a-f-]{36}$/i.test(value.publicReference) &&
    (value.inquiryType === "golf_tourism" || value.inquiryType === "mice_event") &&
    typeof value.receivedAt === "string" &&
    Number.isFinite(Date.parse(value.receivedAt)) &&
    value.confirmationStatus === "received" &&
    value.teamQueueStatus === "queued" &&
    value.reconciliationStatus === "reconciled" &&
    value.providerDeliveryState === "provider_not_bound" &&
    value.providerDeliveryClaimed === false
  );
}

function parseProjection(
  value: unknown,
): ClubsOperationsPublicInquiryQueueProjection | null {
  if (!isObject(value) || !hasExactKeys(value, PROJECTION_KEYS)) return null;
  if (
    value.schema !== CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.schema ||
    value.version !== CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.version ||
    (value.status !== "ready" && value.status !== "empty") ||
    !Array.isArray(value.items) ||
    value.items.length > CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.maximumItems ||
    !value.items.every(isSafeItem) ||
    typeof value.truncated !== "boolean" ||
    value.destination !== "CRAYS_TEAM" ||
    value.containsPersonalData !== false ||
    value.providerDeliveryClaimed !== false ||
    (value.status === "ready" && value.items.length === 0) ||
    (value.status === "empty" && value.items.length !== 0)
  ) {
    return null;
  }
  return value as ClubsOperationsPublicInquiryQueueProjection;
}

function activeDeliveryStates(state: PanelState): ReadonlySet<DeliveryState> {
  if (state.kind !== "ready") return new Set<DeliveryState>();
  return new Set<DeliveryState>(["queued", "reconciled"]);
}

function LastSafeStatusView({ status }: { status: LastSafeStatus | null }) {
  return (
    <div className={styles.lastSafe} aria-label="Last safe integration status">
      <span>Last safe status</span>
      {status ? (
        <strong>
          {status.inquiry} · {status.reconciliation} · {status.provider}
        </strong>
      ) : (
        <strong>Not established</strong>
      )}
    </div>
  );
}

export function ClubsOperationsIntegrationDeliveryReconciliationPanel() {
  const lastSafeRef = useRef<LastSafeStatus | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<PanelState>({
    kind: "loading",
    lastSafeStatus: null,
  });

  const load = useCallback(async (showLoading = true) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    if (showLoading) {
      setState({ kind: "loading", lastSafeStatus: lastSafeRef.current });
    }

    try {
      const response = await fetch(
        CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.endpoint,
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
          signal: controller.signal,
        },
      );

      if (response.status === 401 || response.status === 403) {
        setState({
          kind: "authentication_required",
          lastSafeStatus: lastSafeRef.current,
        });
        return;
      }

      const projection = parseProjection(await response.json().catch(() => null));
      if (!response.ok || !projection) {
        setState({ kind: "failed", lastSafeStatus: lastSafeRef.current });
        return;
      }

      const lastSafeStatus: LastSafeStatus =
        projection.status === "ready"
          ? {
              inquiry: "queued",
              reconciliation: "reconciled",
              provider: "provider_not_bound",
            }
          : {
              inquiry: "empty",
              reconciliation: "not_reported",
              provider: "provider_not_bound",
            };
      lastSafeRef.current = lastSafeStatus;
      setState(
        projection.status === "ready"
          ? { kind: "ready", lastSafeStatus, truncated: projection.truncated }
          : { kind: "empty", lastSafeStatus },
      );
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setState({ kind: "failed", lastSafeStatus: lastSafeRef.current });
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(false), 0);
    return () => {
      window.clearTimeout(initialLoad);
      controllerRef.current?.abort();
    };
  }, [load]);

  const activeStates = activeDeliveryStates(state);

  return (
    <section
      className={styles.root}
      aria-labelledby="clubs-operations-delivery-reconciliation-title"
      aria-busy={state.kind === "loading"}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>CRAYS Clubs · Delivery control</p>
          <h2 id="clubs-operations-delivery-reconciliation-title">
            Integration delivery &amp; reconciliation
          </h2>
          <p className={styles.intro}>
            Read-only operational truth from the durable public-inquiry projection.
          </p>
        </div>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void load()}
          disabled={state.kind === "loading"}
        >
          {state.kind === "loading" ? "Refreshing…" : "Refresh safely"}
        </button>
      </header>

      <div className={styles.providerBoundary}>
        <div>
          <span>CRM provider</span>
          <strong>Provider setup pending</strong>
        </div>
        <code>provider_not_bound</code>
        <p>No external delivery or acknowledgement is claimed.</p>
      </div>

      {state.kind === "loading" ? (
        <div className={styles.message} role="status" aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          <div>
            <strong>Reading the latest safe state</strong>
            <p>The previous safe state remains visible until this read completes.</p>
          </div>
        </div>
      ) : null}

      {state.kind === "authentication_required" ? (
        <div className={styles.message} role="status" aria-live="polite">
          <span className={styles.neutralDot} aria-hidden="true" />
          <div>
            <strong>Operations authentication required</strong>
            <p>Complete the authorized sign-in, then refresh this read-only panel.</p>
          </div>
        </div>
      ) : null}

      {state.kind === "empty" ? (
        <div className={styles.message} role="status" aria-live="polite">
          <span className={styles.neutralDot} aria-hidden="true" />
          <div>
            <strong>No inquiry delivery state is currently reported</strong>
            <p>No retry, reconciliation requirement, failure, or provider outcome is inferred.</p>
          </div>
        </div>
      ) : null}

      {state.kind === "failed" ? (
        <div className={styles.errorMessage} role="alert">
          <div>
            <strong>Status read failed</strong>
            <p>The last safe status is retained. No delivery failure is inferred.</p>
          </div>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => void load()}
          >
            Retry read
          </button>
        </div>
      ) : null}

      <ol className={styles.stateRail} aria-label="Delivery and reconciliation states">
        {DELIVERY_STATES.map((entry) => {
          const active = activeStates.has(entry.state);
          return (
            <li
              key={entry.state}
              className={active ? styles.activeState : styles.inactiveState}
            >
              <span className={styles.stateDot} aria-hidden="true" />
              <div>
                <strong>{entry.label}</strong>
                <span>{active ? "Reported" : "Not reported"}</span>
                <p>{entry.description}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <footer className={styles.footer}>
        <LastSafeStatusView status={state.lastSafeStatus} />
        <div className={styles.nextAction}>
          <span>Safe next action</span>
          <strong>
            {state.kind === "failed"
              ? "Retry the read; do not replay delivery."
              : "Refresh after the next internal reconciliation cycle."}
          </strong>
          {state.kind === "ready" && state.truncated ? (
            <p>This remains an intentionally bounded status view.</p>
          ) : null}
        </div>
      </footer>
    </section>
  );
}
