"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT,
  type ClubsOperationsPublicInquiryQueueItem,
  type ClubsOperationsPublicInquiryQueueProjection,
} from "@/lib/member-commerce/clubs-operations-public-inquiry-queue-contract";
import styles from "./clubs-operations-integration-status-panel.module.css";

type IntegrationStatusState =
  | { kind: "loading" }
  | { kind: "authentication_required" }
  | { kind: "empty" }
  | { kind: "ready"; queued: boolean; reconciled: boolean; truncated: boolean }
  | { kind: "unavailable" };

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

function isSafeQueueItem(
  value: unknown,
): value is ClubsOperationsPublicInquiryQueueItem {
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
    !value.items.every(isSafeQueueItem) ||
    typeof value.truncated !== "boolean" ||
    value.destination !== "CRAYS_TEAM" ||
    value.containsPersonalData !== false ||
    value.providerDeliveryClaimed !== false ||
    (value.status === "empty" && value.items.length !== 0) ||
    (value.status === "ready" && value.items.length === 0)
  ) {
    return null;
  }
  return value as ClubsOperationsPublicInquiryQueueProjection;
}

export function ClubsOperationsIntegrationStatusPanel() {
  const [state, setState] = useState<IntegrationStatusState>({ kind: "loading" });
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async (showLoading = true) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    if (showLoading) setState({ kind: "loading" });

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
        setState({ kind: "authentication_required" });
        return;
      }

      const projection = parseProjection(await response.json().catch(() => null));
      if (!response.ok || !projection) {
        setState({ kind: "unavailable" });
        return;
      }

      if (projection.status === "empty") {
        setState({ kind: "empty" });
        return;
      }

      setState({
        kind: "ready",
        queued: projection.items.some((item) => item.teamQueueStatus === "queued"),
        reconciled: projection.items.some(
          (item) => item.reconciliationStatus === "reconciled",
        ),
        truncated: projection.truncated,
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setState({ kind: "unavailable" });
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

  const readyState = state.kind === "ready" ? state : null;

  return (
    <section
      className={styles.root}
      aria-labelledby="clubs-operations-integration-status-title"
      aria-busy={state.kind === "loading"}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>CRAYS Clubs · Integration status</p>
          <h2 id="clubs-operations-integration-status-title">
            Public inquiry handoff
          </h2>
          <p className={styles.intro}>
            A safe operational view of the durable CRAYS Team queue and its CRM boundary.
          </p>
        </div>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void load()}
          disabled={state.kind === "loading"}
        >
          {state.kind === "loading" ? "Refreshing…" : "Refresh status"}
        </button>
      </header>

      {state.kind === "loading" ? (
        <div className={styles.message} role="status" aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          <div>
            <strong>Reading durable inquiry status</strong>
            <p>No provider outcome is assumed while the read is in progress.</p>
          </div>
        </div>
      ) : null}

      {state.kind === "authentication_required" ? (
        <div className={styles.message} role="status" aria-live="polite">
          <span className={styles.neutralDot} aria-hidden="true" />
          <div>
            <strong>Operations authentication required</strong>
            <p>Complete the authorized Operations sign-in, then refresh this read-only view.</p>
          </div>
        </div>
      ) : null}

      {state.kind === "empty" ? (
        <div className={styles.message} role="status" aria-live="polite">
          <span className={styles.readyDot} aria-hidden="true" />
          <div>
            <strong>No inquiry state is currently visible</strong>
            <p>Refresh to check the bounded CRAYS Team projection again.</p>
          </div>
        </div>
      ) : null}

      {state.kind === "unavailable" ? (
        <div className={styles.errorMessage} role="alert">
          <div>
            <strong>Integration status temporarily unavailable</strong>
            <p>No queue, reconciliation, or provider outcome is inferred.</p>
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

      {readyState ? (
        <>
          <dl className={styles.statusGrid} aria-label="Inquiry integration status">
            <div className={styles.statusCard}>
              <dt>Inquiry intake</dt>
              <dd>
                <span className={styles.readyDot} aria-hidden="true" />
                {readyState.queued ? "Queued" : "Received"}
              </dd>
              <dd className={styles.detail}>The CRAYS Team handoff is durably present.</dd>
            </div>
            <div className={styles.statusCard}>
              <dt>Reconciliation</dt>
              <dd>
                <span className={styles.readyDot} aria-hidden="true" />
                {readyState.reconciled ? "Reconciled" : "Pending"}
              </dd>
              <dd className={styles.detail}>
                Internal inquiry, receipt, and outbox evidence agree.
              </dd>
            </div>
            <div className={`${styles.statusCard} ${styles.providerCard}`}>
              <dt>CRM provider</dt>
              <dd>
                <span className={styles.pendingDot} aria-hidden="true" />
                Provider setup pending
              </dd>
              <dd className={styles.providerCode}>
                <code>provider_not_bound</code>
              </dd>
              <dd className={styles.detail}>No external CRM delivery is claimed.</dd>
            </div>
          </dl>

          <aside className={styles.nextAction} aria-label="Safe next action">
            <div>
              <span className={styles.nextActionLabel}>Safe next action</span>
              <strong>Refresh after the next internal reconciliation cycle.</strong>
              <p>External CRM activation requires separate Owner approval.</p>
            </div>
            {readyState.truncated ? (
              <span className={styles.boundedBadge}>Bounded view</span>
            ) : null}
          </aside>
        </>
      ) : null}
    </section>
  );
}
