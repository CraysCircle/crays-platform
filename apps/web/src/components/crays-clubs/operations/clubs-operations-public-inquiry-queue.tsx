"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT,
  type ClubsOperationsPublicInquiryQueueItem,
  type ClubsOperationsPublicInquiryQueueProjection,
} from "@/lib/member-commerce/clubs-operations-public-inquiry-queue-contract";
import styles from "./clubs-operations-public-inquiry-queue.module.css";

type QueueUiState =
  | { kind: "loading" }
  | { kind: "authentication_required" }
  | { kind: "empty" }
  | {
      kind: "ready";
      projection: ClubsOperationsPublicInquiryQueueProjection;
    }
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
  return (
    actual.length === expected.length &&
    [...expected].sort().every((key, index) => actual[index] === key)
  );
}

function isQueueItem(value: unknown): value is ClubsOperationsPublicInquiryQueueItem {
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

export function parseClubsOperationsPublicInquiryQueueProjection(
  value: unknown,
): ClubsOperationsPublicInquiryQueueProjection | null {
  if (!isObject(value) || !hasExactKeys(value, PROJECTION_KEYS)) return null;
  if (
    value.schema !== CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.schema ||
    value.version !== CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.version ||
    (value.status !== "ready" && value.status !== "empty") ||
    !Array.isArray(value.items) ||
    value.items.length > CLUBS_OPERATIONS_PUBLIC_INQUIRY_QUEUE_CONTRACT.maximumItems ||
    !value.items.every(isQueueItem) ||
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

function formatReceivedAt(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function inquiryLabel(item: ClubsOperationsPublicInquiryQueueItem): string {
  return item.inquiryType === "golf_tourism" ? "Golf tourism" : "MICE / event";
}

function QueueCard({ item }: { item: ClubsOperationsPublicInquiryQueueItem }) {
  return (
    <article className={styles.card} aria-label={`${inquiryLabel(item)} inquiry`}>
      <header className={styles.cardHeader}>
        <div>
          <p className={styles.cardKicker}>Public inquiry</p>
          <h3>{inquiryLabel(item)}</h3>
        </div>
        <time dateTime={item.receivedAt}>{formatReceivedAt(item.receivedAt)}</time>
      </header>

      <p className={styles.reference}>
        <span>Public reference</span>
        <strong>{item.publicReference}</strong>
      </p>

      <dl className={styles.statusGrid}>
        <div>
          <dt>Confirmation</dt>
          <dd><span className={styles.readyDot} aria-hidden="true" />Received</dd>
        </div>
        <div>
          <dt>Team queue</dt>
          <dd><span className={styles.readyDot} aria-hidden="true" />Queued</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd><span className={styles.readyDot} aria-hidden="true" />Reconciled</dd>
        </div>
        <div>
          <dt>CRM provider</dt>
          <dd><span className={styles.pendingDot} aria-hidden="true" />Setup pending</dd>
        </div>
      </dl>

      <p className={styles.providerBoundary}>
        Internal CRAYS Team receipt is confirmed. No external CRM delivery is claimed.
      </p>
    </article>
  );
}

export function ClubsOperationsPublicInquiryQueue() {
  const [state, setState] = useState<QueueUiState>({ kind: "loading" });
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
      const projection = parseClubsOperationsPublicInquiryQueueProjection(
        await response.json().catch(() => null),
      );
      if (!response.ok || !projection) {
        setState({ kind: "unavailable" });
        return;
      }
      setState(
        projection.status === "empty"
          ? { kind: "empty" }
          : { kind: "ready", projection },
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
    const initialLoad = window.setTimeout(() => void load(false), 0);
    return () => {
      window.clearTimeout(initialLoad);
      controllerRef.current?.abort();
    };
  }, [load]);

  return (
    <section
      className={styles.root}
      aria-labelledby="clubs-operations-public-inquiry-title"
      aria-busy={state.kind === "loading"}
    >
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>CRAYS Clubs · Operations</p>
          <h2 id="clubs-operations-public-inquiry-title">Public inquiry queue</h2>
          <p className={styles.intro}>
            Durable Golf Tourism and MICE inquiries received by the CRAYS Team.
          </p>
        </div>
        <button
          type="button"
          className={styles.retryButton}
          onClick={() => void load()}
          disabled={state.kind === "loading"}
        >
          {state.kind === "loading" ? "Reading queue…" : "Retry read"}
        </button>
      </header>

      <div className={styles.boundary} aria-label="Delivery authority boundary">
        <strong>Internal receipt only.</strong>
        <span>Provider setup is pending; no external CRM delivery success is shown.</span>
      </div>

      {state.kind === "loading" ? (
        <div className={styles.statePanel} role="status" aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          <div><strong>Reading the inquiry queue</strong><p>Checking durable CRAYS Team receipts.</p></div>
        </div>
      ) : null}

      {state.kind === "authentication_required" ? (
        <div className={styles.statePanel} role="status" aria-live="polite">
          <span className={styles.lockIcon} aria-hidden="true">●</span>
          <div>
            <strong>Operations authentication required</strong>
            <p>Sign in with an authorized CRAYS Operations account, then retry the read.</p>
          </div>
        </div>
      ) : null}

      {state.kind === "empty" ? (
        <div className={styles.statePanel} role="status" aria-live="polite">
          <span className={styles.emptyIcon} aria-hidden="true">✓</span>
          <div><strong>Queue is clear</strong><p>No received public inquiries are waiting in this bounded view.</p></div>
        </div>
      ) : null}

      {state.kind === "unavailable" ? (
        <div className={styles.errorPanel} role="alert">
          <div><strong>Inquiry queue temporarily unavailable</strong><p>No outcome or provider delivery is assumed.</p></div>
          <button type="button" className={styles.retryButton} onClick={() => void load()}>
            Retry read
          </button>
        </div>
      ) : null}

      {state.kind === "ready" ? (
        <>
          <ul className={styles.cards} aria-label="Received public inquiries">
            {state.projection.items.map((item) => (
              <li key={item.publicReference}><QueueCard item={item} /></li>
            ))}
          </ul>
          {state.projection.truncated ? (
            <p className={styles.truncated} role="status">
              Additional inquiries are available. This presentation remains intentionally bounded; retry to read the current queue.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
