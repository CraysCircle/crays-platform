"use client";

import { useCallback, useEffect, useState } from "react";
import { CLUBS_TEAM_BOOKING_OPERATIONS_CONTRACT } from "@/lib/clubs/team-booking-operations-contract";
import styles from "./clubs-ambassador-operations.module.css";

type PendingAction = "begin_review" | "accept" | "reject";

type SafeEnvelope = {
  schema: "crays.clubs.team-booking-operations-ui.v1";
  version: "1.0.0";
  status: string;
  paymentAuthority: false;
  providerAuthority: false;
  productionAuthority: false;
  marinaEligibilityInferred: false;
};

type PendingRequest = {
  bookingRequestId: string;
  propertyId: string;
  unitId: string;
  version: number;
  publicReference: string;
  status: "submitted" | "under_review";
  submittedAt: string;
  holdStatus: string;
  holdExpiresAt: string;
  holdIsExpired: boolean;
  currency: string;
  totalMinor: string;
  acceptReady: boolean;
  acceptBlockedReason: string | null;
  nextActions: PendingAction[];
  confirmReady: false;
  reconcileState: "request_pending";
  paymentStatus: null;
  providerAuthority: false;
  productionAuthority: false;
  marinaEligibilityInferred: false;
};

type LifecycleRecord = {
  requestId: string | null;
  requestVersion: number | null;
  bookingId: string | null;
  bookingVersion: number | null;
  stayId: string | null;
  stayVersion: number | null;
  propertyId: string;
  unitId: string;
  requestReference: string | null;
  bookingReference: string | null;
  requestStatus: "accepted";
  bookingStatus: string | null;
  reservationStatus: string | null;
  stayStatus: string | null;
  arrivalDate: string;
  departureDate: string;
  holdStatus: string;
  holdExpiresAt: string;
  holdIsExpired: boolean;
  currency: string;
  totalMinor: string;
  nextActions: Array<"confirm_request">;
  confirmReady: boolean;
  confirmBlockedReason: string | null;
  reconcileState:
    | "request_accepted_ready_for_internal_confirmation"
    | "request_accepted_confirmation_blocked"
    | "booking_confirmed_internal_no_payment";
  confirmationScope: "internal_clubs_lifecycle_only";
  providerConfirmed: false;
  paymentStatus: null;
  providerAuthority: false;
  productionAuthority: false;
  marinaEligibilityInferred: false;
};

type PendingEnvelope = SafeEnvelope & {
  queue: "pending_requests";
  requests: PendingRequest[];
};

type LifecycleEnvelope = SafeEnvelope & {
  queue: "accepted_requests_and_booking_lifecycle";
  records: LifecycleRecord[];
};

type QueueSnapshot = {
  pending: PendingRequest[];
  lifecycle: LifecycleRecord[];
};

type CommandContext =
  | {
      endpoint: "pending";
      action: PendingAction;
      requestId: string;
      expectedVersion: number;
    }
  | {
      endpoint: "lifecycle";
      action: "confirm_request";
      requestId: string;
      expectedVersion: number;
    };

function idempotencyKey(action: CommandContext["action"]) {
  return `clubs-team-booking:${action}:${crypto.randomUUID()}`;
}

function dateTime(value: string) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function dateOnly(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(parsed);
}

function quote(currency: string, totalMinor: string) {
  const minor = Number(totalMinor);
  if (!/^[A-Z]{3}$/.test(currency) || !Number.isSafeInteger(minor)) {
    return "Quote unavailable";
  }
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(minor / 100);
  } catch {
    return "Quote unavailable";
  }
}

function isSafeEnvelope(value: unknown): value is SafeEnvelope {
  if (!value || typeof value !== "object") return false;
  const envelope = value as Partial<SafeEnvelope>;
  return (
    envelope.schema === "crays.clubs.team-booking-operations-ui.v1" &&
    envelope.version === "1.0.0" &&
    envelope.paymentAuthority === false &&
    envelope.providerAuthority === false &&
    envelope.productionAuthority === false &&
    envelope.marinaEligibilityInferred === false
  );
}

function safeStatus(status: string, httpStatus: number) {
  if (httpStatus === 401) return "Authentication or tenant session required.";
  if (httpStatus === 403) {
    return status === "step_up_required"
      ? "Strong authentication required."
      : "Action not permitted.";
  }
  if (httpStatus === 409) return "State changed. Queue reconciled.";
  if (httpStatus === 415) return "JSON request required.";
  if (httpStatus === 400) return "Request validation failed.";
  if (httpStatus === 503) {
    return status === "unknown_outcome"
      ? "Outcome is unknown. Queue reconciled before retry."
      : "Booking operations temporarily unavailable.";
  }
  return "Booking operation failed.";
}

function reflected(command: CommandContext, snapshot: QueueSnapshot) {
  if (command.action === "begin_review") {
    return snapshot.pending.some(
      (item) =>
        item.bookingRequestId === command.requestId &&
        item.status === "under_review",
    );
  }
  if (command.action === "accept") {
    return (
      !snapshot.pending.some(
        (item) => item.bookingRequestId === command.requestId,
      ) &&
      snapshot.lifecycle.some((item) => item.requestId === command.requestId)
    );
  }
  if (command.action === "reject") {
    return !snapshot.pending.some(
      (item) => item.bookingRequestId === command.requestId,
    );
  }
  return snapshot.lifecycle.some(
    (item) =>
      item.requestId === command.requestId &&
      item.reconcileState === "booking_confirmed_internal_no_payment",
  );
}

export function ClubsOperationsTeamBookingQueue() {
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [lifecycle, setLifecycle] = useState<LifecycleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<QueueSnapshot> => {
    const [pendingResponse, lifecycleResponse] = await Promise.all([
      fetch(CLUBS_TEAM_BOOKING_OPERATIONS_CONTRACT.endpoints.pendingRequests, {
        cache: "no-store",
        credentials: "same-origin",
      }),
      fetch(CLUBS_TEAM_BOOKING_OPERATIONS_CONTRACT.endpoints.lifecycle, {
        cache: "no-store",
        credentials: "same-origin",
      }),
    ]);
    const pendingPayload = (await pendingResponse.json().catch(() => null)) as
      | PendingEnvelope
      | SafeEnvelope
      | null;
    const lifecyclePayload = (await lifecycleResponse.json().catch(() => null)) as
      | LifecycleEnvelope
      | SafeEnvelope
      | null;
    if (
      !pendingResponse.ok ||
      !lifecycleResponse.ok ||
      !isSafeEnvelope(pendingPayload) ||
      !isSafeEnvelope(lifecyclePayload) ||
      pendingPayload.status !== "ready" ||
      lifecyclePayload.status !== "ready" ||
      !("requests" in pendingPayload) ||
      !("records" in lifecyclePayload)
    ) {
      const failedResponse = pendingResponse.ok
        ? lifecycleResponse
        : pendingResponse;
      const failedPayload = pendingResponse.ok
        ? lifecyclePayload
        : pendingPayload;
      throw new Error(
        safeStatus(failedPayload?.status ?? "temporarily_unavailable", failedResponse.status),
      );
    }
    const snapshot = {
      pending: pendingPayload.requests,
      lifecycle: lifecyclePayload.records,
    };
    setPending(snapshot.pending);
    setLifecycle(snapshot.lifecycle);
    return snapshot;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Booking operations temporarily unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  async function postCommand(
    endpoint: string,
    key: string,
    payloadBytes: string,
  ) {
    return fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        "idempotency-key": key,
      },
      body: payloadBytes,
    });
  }

  async function execute(command: CommandContext) {
    setBusy(true);
    setNotice(null);
    setError(null);
    const endpoint =
      command.endpoint === "pending"
        ? CLUBS_TEAM_BOOKING_OPERATIONS_CONTRACT.endpoints.pendingRequests
        : CLUBS_TEAM_BOOKING_OPERATIONS_CONTRACT.endpoints.lifecycle;
    const payload =
      command.endpoint === "pending"
        ? {
            type: command.action,
            requestId: command.requestId,
            expectedVersion: command.expectedVersion,
            reason: `operations_${command.action}`,
          }
        : {
            type: "confirm_request" as const,
            requestId: command.requestId,
            expectedVersion: command.expectedVersion,
          };
    const payloadBytes = JSON.stringify(payload);
    const key = idempotencyKey(command.action);
    try {
      let response = await postCommand(endpoint, key, payloadBytes);
      let result = (await response.json().catch(() => null)) as SafeEnvelope | null;
      if (!isSafeEnvelope(result)) {
        throw new Error("Booking operation returned an invalid safety envelope.");
      }
      if (response.ok) {
        await refresh();
        setNotice(
          command.action === "confirm_request"
            ? "Internal booking confirmation reconciled. Payment and provider state remain separate."
            : "Booking request reconciled.",
        );
        return;
      }
      if (response.status === 409) {
        await refresh();
        setError(safeStatus(result.status, response.status));
        return;
      }
      if (response.status === 503 && result.status === "unknown_outcome") {
        let snapshot = await refresh();
        if (reflected(command, snapshot)) {
          setNotice("Command outcome reconciled from current state.");
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2_000));
        response = await postCommand(endpoint, key, payloadBytes);
        result = (await response.json().catch(() => null)) as SafeEnvelope | null;
        if (!isSafeEnvelope(result)) {
          throw new Error("Booking operation returned an invalid safety envelope.");
        }
        snapshot = await refresh();
        if (response.ok || reflected(command, snapshot)) {
          setNotice("Command outcome reconciled from current state.");
          return;
        }
      }
      setError(safeStatus(result.status, response.status));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Booking operations temporarily unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel} aria-label="Team booking operations queue">
      <div className={styles.panelHeading}>
        <div>
          <p className={styles.kicker}>Internal booking reconciliation</p>
          <h2>Team booking queue</h2>
        </div>
        <button
          className={styles.secondaryButton}
          disabled={loading || busy}
          onClick={() => void load()}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p>
        Pending → review → accept → ready → internal confirmation. External
        settlement and provider control planes remain separate; this queue
        records only internal Clubs lifecycle state.
      </p>
      {notice ? <p className={styles.success}>{notice}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.grid}>
        <div>
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.kicker}>Pending requests</p>
              <h3>Review and accept</h3>
            </div>
            <span className={styles.count}>{pending.length}</span>
          </div>
          <div className={styles.cards}>
            {pending.map((request) => (
              <article className={styles.card} key={request.bookingRequestId}>
                <div className={styles.cardTitle}>
                  <div>
                    <h3>{request.publicReference}</h3>
                    <p>{dateTime(request.submittedAt)}</p>
                  </div>
                  <span className={styles.inactive}>
                    {request.status.replaceAll("_", " ")}
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>Hold</dt>
                    <dd>
                      {request.holdStatus} · {request.holdIsExpired ? "expired" : "active until"} {dateTime(request.holdExpiresAt)}
                    </dd>
                  </div>
                  <div>
                    <dt>Quote</dt>
                    <dd>{quote(request.currency, request.totalMinor)}</dd>
                  </div>
                  <div>
                    <dt>Accept readiness</dt>
                    <dd>
                      {request.acceptReady
                        ? "ready"
                        : (request.acceptBlockedReason ?? "blocked").replaceAll("_", " ")}
                    </dd>
                  </div>
                </dl>
                <div className={styles.actions}>
                  {request.nextActions.includes("begin_review") ? (
                    <button
                      className={styles.secondaryButton}
                      disabled={busy}
                      onClick={() =>
                        void execute({
                          endpoint: "pending",
                          action: "begin_review",
                          requestId: request.bookingRequestId,
                          expectedVersion: request.version,
                        })
                      }
                    >
                      Begin review
                    </button>
                  ) : null}
                  {request.nextActions.includes("accept") ? (
                    <button
                      className={styles.primaryButton}
                      disabled={busy || !request.acceptReady}
                      onClick={() =>
                        void execute({
                          endpoint: "pending",
                          action: "accept",
                          requestId: request.bookingRequestId,
                          expectedVersion: request.version,
                        })
                      }
                    >
                      Accept
                    </button>
                  ) : null}
                  {request.nextActions.includes("reject") ? (
                    <button
                      className={styles.dangerButton}
                      disabled={busy}
                      onClick={() =>
                        void execute({
                          endpoint: "pending",
                          action: "reject",
                          requestId: request.bookingRequestId,
                          expectedVersion: request.version,
                        })
                      }
                    >
                      Reject
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
            {!loading && pending.length === 0 ? (
              <p className={styles.empty}>No pending booking requests.</p>
            ) : null}
          </div>
        </div>

        <div>
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.kicker}>Accepted lifecycle</p>
              <h3>Confirm and reconcile</h3>
            </div>
            <span className={styles.count}>{lifecycle.length}</span>
          </div>
          <div className={styles.cards}>
            {lifecycle.map((record) => (
              <article
                className={styles.card}
                key={record.bookingId ?? record.requestId ?? record.requestReference ?? "lifecycle"}
              >
                <div className={styles.cardTitle}>
                  <div>
                    <h3>{record.bookingReference ?? record.requestReference}</h3>
                    <p>
                      {dateOnly(record.arrivalDate)} → {dateOnly(record.departureDate)}
                    </p>
                  </div>
                  <span
                    className={
                      record.reconcileState === "booking_confirmed_internal_no_payment"
                        ? styles.active
                        : styles.inactive
                    }
                  >
                    {record.reconcileState === "booking_confirmed_internal_no_payment"
                      ? "Confirmed internally"
                      : record.confirmReady
                        ? "Ready"
                        : "Pending"}
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>Request</dt>
                    <dd>{record.requestStatus}</dd>
                  </div>
                  <div>
                    <dt>Booking / reservation / stay</dt>
                    <dd>
                      {[record.bookingStatus, record.reservationStatus, record.stayStatus]
                        .filter(Boolean)
                        .join(" · ") || "not created"}
                    </dd>
                  </div>
                  <div>
                    <dt>Hold</dt>
                    <dd>
                      {record.holdStatus} · {record.holdIsExpired ? "expired" : "valid until"} {dateTime(record.holdExpiresAt)}
                    </dd>
                  </div>
                  <div>
                    <dt>Quote</dt>
                    <dd>{quote(record.currency, record.totalMinor)}</dd>
                  </div>
                  <div>
                    <dt>Confirmation</dt>
                    <dd>
                      {record.confirmReady
                        ? "ready"
                        : (record.confirmBlockedReason ?? "pending").replaceAll("_", " ")}
                    </dd>
                  </div>
                </dl>
                {record.confirmReady &&
                record.nextActions.includes("confirm_request") &&
                record.requestId &&
                record.requestVersion ? (
                  <div className={styles.actions}>
                    <button
                      className={styles.primaryButton}
                      disabled={busy}
                      onClick={() =>
                        void execute({
                          endpoint: "lifecycle",
                          action: "confirm_request",
                          requestId: record.requestId!,
                          expectedVersion: record.requestVersion!,
                        })
                      }
                    >
                      Confirm internally
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
            {!loading && lifecycle.length === 0 ? (
              <p className={styles.empty}>No accepted booking requests.</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
