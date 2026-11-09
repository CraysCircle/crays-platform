"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  ClubsMemberBookingClientError,
  createClubsMemberBookingClient,
  createClubsMemberBookingIdempotencyKey,
  sanitizeClubsMemberBookingReturnTo,
  type ClubsMemberBookingApiResult,
  type ClubsMemberBookingEligibilityPayload,
  type ClubsMemberBookingHold,
  type ClubsMemberBookingPropertyId,
  type ClubsMemberBookingQuote,
  type ClubsMemberBookingReconcileScope,
  type ClubsMemberBookingRequest,
  type ClubsMemberBookingStayUnit,
} from "@/lib/clubs/member-booking-client";
import styles from "./clubs-member-booking-action-panel.module.css";

export type ClubsMemberBookingSearchIntent = Readonly<{
  arrivalDate: string;
  departureDate: string;
  guestCount: number;
  requestedCapacity: number;
  returnTo: string;
}>;

export type ClubsMemberBookingActionPanelProps = Readonly<{
  propertyId: ClubsMemberBookingPropertyId;
  stayUnit: ClubsMemberBookingStayUnit;
  searchIntent: ClubsMemberBookingSearchIntent;
}>;

type PanelPhase =
  | Readonly<{ kind: "ready" }>
  | Readonly<{ kind: "signed_out"; loginHref: string }>
  | Readonly<{ kind: "eligibility_blocked"; reason: string }>
  | Readonly<{ kind: "offer_unavailable"; reason: string }>
  | Readonly<{ kind: "offer_ready"; unitId: string; ratePlanId: string }>
  | Readonly<{
      kind: "quote_issued";
      quoteId: string;
      unitId: string;
      expiresAt: string;
    }>
  | Readonly<{
      kind: "hold_active";
      quoteId: string;
      holdId: string;
      unitId: string;
      expiresAt: string;
    }>
  | Readonly<{ kind: "request_submitted"; holdId: string }>
  | Readonly<{
      kind: "reconcile_required";
      scope: ClubsMemberBookingReconcileScope;
      quoteId?: string;
      holdId?: string;
      unitId?: string;
    }>
  | Readonly<{ kind: "team_review_pending"; holdId: string }>
  | Readonly<{ kind: "failed"; reason: string }>;

type PanelCopy = Readonly<{
  eyebrow: string;
  title: string;
  detail: string;
  tone: "neutral" | "attention" | "positive";
}>;

export type ClubsMemberBookingExpiryState = Readonly<{
  kind: "active" | "expiring" | "expired" | "invalid";
  remainingMs: number;
}>;

// BEGIN:CLUBS_MEMBER_BOOKING_EXPIRY_HELPERS
export const CLUBS_MEMBER_BOOKING_EXPIRING_WINDOW_MS = 5 * 60 * 1_000;

export function resolveClubsMemberBookingExpiry(
  expiresAt: string,
  nowMs: number,
): ClubsMemberBookingExpiryState {
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs) || !Number.isFinite(nowMs)) {
    return { kind: "invalid", remainingMs: 0 };
  }
  const remainingMs = Math.max(0, expiresAtMs - nowMs);
  if (remainingMs === 0) return { kind: "expired", remainingMs };
  return {
    kind:
      remainingMs <= CLUBS_MEMBER_BOOKING_EXPIRING_WINDOW_MS
        ? "expiring"
        : "active",
    remainingMs,
  };
}

export function formatClubsMemberBookingRemainingTime(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
// END:CLUBS_MEMBER_BOOKING_EXPIRY_HELPERS

const signedOutStatuses = new Set([
  "authentication_required",
  "invalid_session",
  "invalid_session_provenance",
  "signed_out",
  "tenant_session_required",
]);

function safeLoginHref(
  propertyId: ClubsMemberBookingPropertyId,
  returnTo: string,
) {
  try {
    const safeReturnTo = sanitizeClubsMemberBookingReturnTo(
      propertyId,
      returnTo,
    );
    return `/auth/login?returnTo=${encodeURIComponent(safeReturnTo)}`;
  } catch {
    return "/auth/login";
  }
}

function isSignedOut(
  result: ClubsMemberBookingApiResult<ClubsMemberBookingEligibilityPayload>,
) {
  const authentication = (
    result.data as ClubsMemberBookingEligibilityPayload & {
      authentication?: { status?: unknown };
    }
  ).authentication;
  return (
    result.httpStatus === 401 ||
    signedOutStatuses.has(result.status) ||
    authentication?.status === "signed_out"
  );
}

function isSignedOutResult(result: {
  httpStatus: number;
  status: string;
  data: unknown;
}) {
  return result.httpStatus === 401 || signedOutStatuses.has(result.status);
}

function findCurrentQuote(
  quotes: readonly ClubsMemberBookingQuote[] | undefined,
  propertyId: ClubsMemberBookingPropertyId,
  unitId: string,
  searchIntent: ClubsMemberBookingSearchIntent,
) {
  return quotes?.find(
    (quote) =>
      quote.propertyId === propertyId &&
      quote.unitId === unitId &&
      quote.arrivalDate === searchIntent.arrivalDate &&
      quote.departureDate === searchIntent.departureDate &&
      quote.guestCount === searchIntent.guestCount &&
      quote.requestedCapacity === searchIntent.requestedCapacity &&
      (quote.status === "active" || quote.status === "accepted"),
  );
}

function findCurrentHold(
  holds: readonly ClubsMemberBookingHold[] | undefined,
  propertyId: ClubsMemberBookingPropertyId,
  unitId: string,
  searchIntent: ClubsMemberBookingSearchIntent,
) {
  return holds?.find(
    (hold) =>
      hold.propertyId === propertyId &&
      hold.unitId === unitId &&
      hold.arrivalDate === searchIntent.arrivalDate &&
      hold.departureDate === searchIntent.departureDate &&
      hold.status === "active" &&
      Number.isFinite(Date.parse(hold.expiresAt)) &&
      Date.parse(hold.expiresAt) > Date.now(),
  );
}

function findCurrentRequest(
  requests: readonly ClubsMemberBookingRequest[] | undefined,
  holdId: string,
) {
  return requests?.find((request) => request.holdId === holdId);
}

function copyForPhase(
  phase: PanelPhase,
  expiry: ClubsMemberBookingExpiryState | null,
): PanelCopy {
  switch (phase.kind) {
    case "signed_out":
      return {
        eyebrow: "Sign in required",
        title: "Continue with your CRAYS account",
        detail:
          "Sign in to resolve the canonical stay offer and continue this request.",
        tone: "attention",
      };
    case "eligibility_blocked":
      return {
        eyebrow: "Eligibility blocked",
        title: "This stay cannot continue yet",
        detail: phase.reason,
        tone: "attention",
      };
    case "offer_unavailable":
      return {
        eyebrow: "Offer unavailable",
        title: "No canonical offer is ready for this search",
        detail: phase.reason,
        tone: "attention",
      };
    case "offer_ready":
      return {
        eyebrow: "Offer available",
        title: "Your stay can be quoted",
        detail:
          "The property, stay unit and rate plan were resolved on the server.",
        tone: "neutral",
      };
    case "quote_issued":
      if (expiry?.kind === "expired") {
        return {
          eyebrow: "Quote expired",
          title: "Request a new server quote",
          detail:
            "The server-issued quote expiry time has elapsed. No hold was created automatically.",
          tone: "attention",
        };
      }
      if (expiry?.kind === "expiring") {
        return {
          eyebrow: "Quote expiring",
          title: "Secure this offer before it expires",
          detail:
            "The countdown uses the expiry time returned with the server quote.",
          tone: "attention",
        };
      }
      return {
        eyebrow: "Quote issued",
        title: "Secure this offer with a short hold",
        detail:
          "The quote is stored on the server. No payment has been requested.",
        tone: "positive",
      };
    case "hold_active":
      if (expiry?.kind === "expired") {
        return {
          eyebrow: "Hold expired",
          title: "This hold can no longer be submitted",
          detail:
            "The server-issued hold expiry time has elapsed. No request was submitted automatically.",
          tone: "attention",
        };
      }
      return {
        eyebrow: "Hold active",
        title: "Submit your booking request",
        detail:
          "Availability is held temporarily while the Team reviews the request.",
        tone: "positive",
      };
    case "request_submitted":
      return {
        eyebrow: "Request submitted",
        title: "Your request reached CRAYS Team",
        detail:
          "Check the current server status. Submission is not a booking or payment confirmation.",
        tone: "positive",
      };
    case "reconcile_required":
      return {
        eyebrow: "Reconcile required",
        title: "We need to verify the server state",
        detail:
          "The write outcome is not safe to assume. Reconciliation only reads the current state.",
        tone: "attention",
      };
    case "team_review_pending":
      return {
        eyebrow: "Team review pending",
        title: "CRAYS Team is reviewing your request",
        detail:
          "Any acceptance remains an internal booking step, never a payment or provider success claim.",
        tone: "neutral",
      };
    case "failed":
      return {
        eyebrow: "Action unavailable",
        title: "This step stopped safely",
        detail: phase.reason,
        tone: "attention",
      };
    case "ready":
    default:
      return {
        eyebrow: "Member booking",
        title: "Check your stay eligibility",
        detail:
          "We will verify access and resolve the stay offer from canonical server data.",
        tone: "neutral",
      };
  }
}

type ProgressStep = Readonly<{
  label: "Quote" | "Hold" | "Booking request";
  detail: string;
  state: "attention" | "complete" | "current" | "waiting";
}>;

function progressForPhase(
  phase: PanelPhase,
  expiry: ClubsMemberBookingExpiryState | null,
): readonly ProgressStep[] {
  const quoteComplete =
    phase.kind === "hold_active" ||
    phase.kind === "request_submitted" ||
    phase.kind === "team_review_pending" ||
    (phase.kind === "reconcile_required" && phase.scope !== "quotes");
  const holdComplete =
    phase.kind === "request_submitted" ||
    phase.kind === "team_review_pending" ||
    (phase.kind === "reconcile_required" &&
      phase.scope === "booking-requests");
  const quoteDetail =
    phase.kind === "quote_issued"
      ? expiry?.kind === "expired"
        ? "Expired"
        : expiry?.kind === "expiring"
          ? "Expiring"
          : "Issued"
      : phase.kind === "reconcile_required" && phase.scope === "quotes"
        ? "Reconciliation required"
        : quoteComplete
          ? "Complete"
          : "Waiting";
  const holdDetail =
    phase.kind === "hold_active"
      ? expiry?.kind === "expired"
        ? "Expired"
        : "Active"
      : phase.kind === "reconcile_required" && phase.scope === "holds"
        ? "Reconciliation required"
        : holdComplete
          ? "Complete"
          : "Waiting";
  const requestDetail =
    phase.kind === "request_submitted"
      ? "Submitted · countdown stopped"
      : phase.kind === "team_review_pending"
        ? "Team review · countdown stopped"
        : phase.kind === "reconcile_required" &&
            phase.scope === "booking-requests"
          ? "Reconciliation required · countdown stopped"
          : "Waiting";
  return [
    {
      label: "Quote",
      detail: quoteDetail,
      state:
        quoteDetail === "Expired" || quoteDetail === "Reconciliation required"
          ? "attention"
          : quoteDetail === "Complete"
            ? "complete"
            : phase.kind === "quote_issued"
              ? "current"
              : "waiting",
    },
    {
      label: "Hold",
      detail: holdDetail,
      state:
        holdDetail === "Expired" || holdDetail === "Reconciliation required"
          ? "attention"
          : holdDetail === "Complete"
            ? "complete"
            : phase.kind === "hold_active"
              ? "current"
              : "waiting",
    },
    {
      label: "Booking request",
      detail: requestDetail,
      state:
        requestDetail.startsWith("Reconciliation")
          ? "attention"
          : phase.kind === "request_submitted" ||
              phase.kind === "team_review_pending"
            ? "complete"
            : "waiting",
    },
  ];
}

function propertyName(propertyId: ClubsMemberBookingPropertyId) {
  return propertyId === "property-clubs-forest-city-golf"
    ? "Forest City Golf Hotel"
    : "Forest City Marina Hotel";
}

export function ClubsMemberBookingActionPanel({
  propertyId,
  stayUnit,
  searchIntent,
}: ClubsMemberBookingActionPanelProps) {
  const headingId = useId();
  const client = useMemo(() => createClubsMemberBookingClient(), []);
  const [phase, setPhase] = useState<PanelPhase>({ kind: "ready" });
  const [busy, setBusy] = useState(false);
  const [clockNowMs, setClockNowMs] = useState(() => Date.now());
  const activeExpiresAt =
    phase.kind === "quote_issued" || phase.kind === "hold_active"
      ? phase.expiresAt
      : null;
  const expiry = activeExpiresAt
    ? resolveClubsMemberBookingExpiry(activeExpiresAt, clockNowMs)
    : null;
  const copy = copyForPhase(phase, expiry);
  const progress = progressForPhase(phase, expiry);

  useEffect(() => {
    if (!activeExpiresAt) return;
    const timer = window.setInterval(() => setClockNowMs(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [activeExpiresAt]);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      const reason =
        error instanceof ClubsMemberBookingClientError
          ? "The booking contract rejected this request. Review the stay details and try again."
          : "The booking service is temporarily unavailable. No success state was assumed.";
      setPhase({ kind: "failed", reason });
    } finally {
      setBusy(false);
    }
  }

  function showQuoteIssued(
    quoteId: string,
    unitId: string,
    expiresAt: string | null,
  ) {
    const nowMs = Date.now();
    if (
      !expiresAt ||
      resolveClubsMemberBookingExpiry(expiresAt, nowMs).kind === "invalid"
    ) {
      setPhase({ kind: "reconcile_required", scope: "quotes", unitId });
      return;
    }
    setClockNowMs(nowMs);
    setPhase({ kind: "quote_issued", quoteId, unitId, expiresAt });
  }

  function showHoldActive(
    quoteId: string,
    holdId: string,
    unitId: string,
    expiresAt: string | null,
  ) {
    const nowMs = Date.now();
    if (
      !expiresAt ||
      resolveClubsMemberBookingExpiry(expiresAt, nowMs).kind === "invalid"
    ) {
      setPhase({
        kind: "reconcile_required",
        scope: "holds",
        quoteId,
        unitId,
      });
      return;
    }
    setClockNowMs(nowMs);
    setPhase({ kind: "hold_active", quoteId, holdId, unitId, expiresAt });
  }

  function startAgain() {
    setPhase({ kind: "ready" });
  }

  function applyRequestStatus(request: ClubsMemberBookingRequest | undefined) {
    if (!request) return false;
    if (request.status === "submitted") {
      setPhase({ kind: "request_submitted", holdId: request.holdId });
      return true;
    }
    if (request.status === "under_review" || request.status === "accepted") {
      setPhase({ kind: "team_review_pending", holdId: request.holdId });
      return true;
    }
    setPhase({
      kind: "eligibility_blocked",
      reason:
        request.status === "rejected"
          ? "CRAYS Team did not accept this request."
          : "This booking request is no longer active.",
    });
    return true;
  }

  function checkEligibility() {
    return run(async () => {
      const eligibility = await client.readEligibility(propertyId);
      if (isSignedOut(eligibility)) {
        setPhase({
          kind: "signed_out",
          loginHref: safeLoginHref(
            propertyId,
            searchIntent.returnTo,
          ),
        });
        return;
      }
      if (
        !eligibility.ok ||
        eligibility.status !== "ready" ||
        eligibility.data.propertyId !== propertyId ||
        !eligibility.data.allowedStayUnits?.includes(stayUnit)
      ) {
        setPhase({
          kind: "eligibility_blocked",
          reason:
            "Access or stay-unit eligibility has not been confirmed by the server.",
        });
        return;
      }

      const offer = await client.resolveStayStep4Offer({
        propertyId,
        stayUnit,
        ...searchIntent,
      });
      if (isSignedOutResult(offer)) {
        setPhase({
          kind: "signed_out",
          loginHref: safeLoginHref(
            propertyId,
            searchIntent.returnTo,
          ),
        });
        return;
      }
      if (
        !offer.ok ||
        offer.status !== "offer_ready" ||
        offer.data.propertyId !== propertyId ||
        offer.data.stayUnit !== stayUnit ||
        !offer.data.unitId ||
        !offer.data.ratePlanId
      ) {
        setPhase({
          kind: "offer_unavailable",
          reason:
            "The canonical unit, rate plan or dated availability is not ready for this search.",
        });
        return;
      }
      setPhase({
        kind: "offer_ready",
        unitId: offer.data.unitId,
        ratePlanId: offer.data.ratePlanId,
      });
    });
  }

  function issueQuote(offer: Extract<PanelPhase, { kind: "offer_ready" }>) {
    return run(async () => {
      const result = await client.issueQuote(
        {
          propertyId,
          unitId: offer.unitId,
          ratePlanId: offer.ratePlanId,
          arrivalDate: searchIntent.arrivalDate,
          departureDate: searchIntent.departureDate,
          guestCount: searchIntent.guestCount,
          requestedCapacity: searchIntent.requestedCapacity,
        },
        createClubsMemberBookingIdempotencyKey("quote"),
      );
      const receipt = result.response?.data.receipt;
      if (
        result.kind === "completed" &&
        receipt?.outcome === "issued" &&
        receipt.quoteId
      ) {
        showQuoteIssued(receipt.quoteId, offer.unitId, receipt.expiresAt);
        return;
      }
      const reconciled = findCurrentQuote(
        result.reconciliation?.data.quotes,
        propertyId,
        offer.unitId,
        searchIntent,
      );
      if (reconciled) {
        showQuoteIssued(
          reconciled.quoteId,
          reconciled.unitId,
          reconciled.expiresAt,
        );
        return;
      }
      if (result.kind === "conflict" || result.kind === "unknown_outcome") {
        setPhase({
          kind: "reconcile_required",
          scope: "quotes",
          unitId: offer.unitId,
        });
        return;
      }
      setPhase({
        kind: "offer_unavailable",
        reason: "The server did not issue a quote for this stay.",
      });
    });
  }

  function createHold(quote: Extract<PanelPhase, { kind: "quote_issued" }>) {
    return run(async () => {
      const result = await client.createHold(
        { quoteId: quote.quoteId },
        createClubsMemberBookingIdempotencyKey("hold"),
      );
      const receipt = result.response?.data.receipt;
      if (
        result.kind === "completed" &&
        receipt?.outcome === "applied" &&
        receipt.resultingStatus === "active" &&
        receipt.holdId
      ) {
        showHoldActive(
          quote.quoteId,
          receipt.holdId,
          quote.unitId,
          receipt.expiresAt,
        );
        return;
      }
      const reconciled = findCurrentHold(
        result.reconciliation?.data.holds,
        propertyId,
        quote.unitId,
        searchIntent,
      );
      if (reconciled) {
        showHoldActive(
          quote.quoteId,
          reconciled.holdId,
          quote.unitId,
          reconciled.expiresAt,
        );
        return;
      }
      if (result.kind === "conflict" || result.kind === "unknown_outcome") {
        setPhase({
          kind: "reconcile_required",
          scope: "holds",
          quoteId: quote.quoteId,
          unitId: quote.unitId,
        });
        return;
      }
      setPhase({
        kind: "offer_unavailable",
        reason: "The server could not place an active hold on this quote.",
      });
    });
  }

  function submitRequest(hold: Extract<PanelPhase, { kind: "hold_active" }>) {
    return run(async () => {
      const result = await client.submitBookingRequest(
        { holdId: hold.holdId },
        createClubsMemberBookingIdempotencyKey("booking-request"),
      );
      const receipt = result.response?.data.receipt;
      if (
        result.kind === "completed" &&
        receipt?.outcome === "applied" &&
        (receipt.resultingStatus === "submitted" ||
          receipt.resultingStatus === "under_review")
      ) {
        setPhase(
          receipt.resultingStatus === "under_review"
            ? { kind: "team_review_pending", holdId: hold.holdId }
            : { kind: "request_submitted", holdId: hold.holdId },
        );
        return;
      }
      const reconciled = findCurrentRequest(
        result.reconciliation?.data.requests,
        hold.holdId,
      );
      if (applyRequestStatus(reconciled)) return;
      if (result.kind === "conflict" || result.kind === "unknown_outcome") {
        setPhase({
          kind: "reconcile_required",
          scope: "booking-requests",
          holdId: hold.holdId,
        });
        return;
      }
      setPhase({
        kind: "failed",
        reason: "The server did not submit this booking request.",
      });
    });
  }

  function reconcile(
    state: Extract<PanelPhase, { kind: "reconcile_required" }>,
  ) {
    return run(async () => {
      const result = await client.reconcile(state.scope);
      if (!result.ok) {
        setPhase(state);
        return;
      }
      if (state.scope === "quotes" && state.unitId) {
        const quote = findCurrentQuote(
          "quotes" in result.data ? result.data.quotes : undefined,
          propertyId,
          state.unitId,
          searchIntent,
        );
        if (quote) {
          showQuoteIssued(quote.quoteId, quote.unitId, quote.expiresAt);
          return;
        }
      }
      if (
        state.scope === "holds" &&
        state.quoteId &&
        state.unitId
      ) {
        const hold = findCurrentHold(
          "holds" in result.data ? result.data.holds : undefined,
          propertyId,
          state.unitId,
          searchIntent,
        );
        if (hold) {
          showHoldActive(
            state.quoteId,
            hold.holdId,
            state.unitId,
            hold.expiresAt,
          );
          return;
        }
      }
      if (state.scope === "booking-requests" && state.holdId) {
        const request = findCurrentRequest(
          "requests" in result.data ? result.data.requests : undefined,
          state.holdId,
        );
        if (applyRequestStatus(request)) return;
      }
      setPhase(state);
    });
  }

  function refreshRequest(holdId: string) {
    return run(async () => {
      const result = await client.readBookingRequests();
      if (isSignedOutResult(result)) {
        setPhase({
          kind: "signed_out",
          loginHref: safeLoginHref(
            propertyId,
            searchIntent.returnTo,
          ),
        });
        return;
      }
      const request = findCurrentRequest(result.data.requests, holdId);
      if (!result.ok || !applyRequestStatus(request)) {
        setPhase({
          kind: "reconcile_required",
          scope: "booking-requests",
          holdId,
        });
      }
    });
  }

  const action = (() => {
    if (phase.kind === "signed_out") {
      return (
        <a className={styles.primaryAction} href={phase.loginHref}>
          Sign in to continue
        </a>
      );
    }
    if (phase.kind === "offer_ready") {
      return (
        <button
          className={styles.primaryAction}
          disabled={busy}
          onClick={() => void issueQuote(phase)}
          type="button"
        >
          {busy ? "Issuing quote…" : "Issue quote"}
        </button>
      );
    }
    if (
      (phase.kind === "quote_issued" || phase.kind === "hold_active") &&
      expiry?.kind === "expired"
    ) {
      return (
        <button
          className={styles.secondaryAction}
          disabled={busy}
          onClick={startAgain}
          type="button"
        >
          Start again
        </button>
      );
    }
    if (phase.kind === "quote_issued") {
      return (
        <button
          className={styles.primaryAction}
          disabled={busy}
          onClick={() => void createHold(phase)}
          type="button"
        >
          {busy ? "Creating hold…" : "Hold this stay"}
        </button>
      );
    }
    if (phase.kind === "hold_active") {
      return (
        <button
          className={styles.primaryAction}
          disabled={busy}
          onClick={() => void submitRequest(phase)}
          type="button"
        >
          {busy ? "Submitting…" : "Submit booking request"}
        </button>
      );
    }
    if (phase.kind === "reconcile_required") {
      return (
        <button
          className={styles.primaryAction}
          disabled={busy}
          onClick={() => void reconcile(phase)}
          type="button"
        >
          {busy ? "Reconciling…" : "Reconcile status"}
        </button>
      );
    }
    if (
      phase.kind === "request_submitted" ||
      phase.kind === "team_review_pending"
    ) {
      return (
        <button
          className={styles.secondaryAction}
          disabled={busy}
          onClick={() => void refreshRequest(phase.holdId)}
          type="button"
        >
          {busy ? "Checking…" : "Check review status"}
        </button>
      );
    }
    return (
      <button
        className={styles.primaryAction}
        disabled={busy}
        onClick={() => void checkEligibility()}
        type="button"
      >
        {busy ? "Checking…" : "Check eligibility"}
      </button>
    );
  })();

  const statusClassName = `${styles.status} ${
    copy.tone === "positive"
      ? styles.statusPositive
      : copy.tone === "attention"
        ? styles.statusAttention
        : styles.statusNeutral
  }`;
  const expiryLabel =
    phase.kind === "quote_issued"
      ? "Quote"
      : phase.kind === "hold_active"
        ? "Hold"
        : null;

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <header className={styles.header}>
        <p className={styles.kicker}>CRAYS Clubs · Stay request</p>
        <h2 className={styles.heading} id={headingId}>
          {propertyName(propertyId)}
        </h2>
        <dl className={styles.intent} aria-label="Selected stay">
          <div>
            <dt>Stay</dt>
            <dd>{stayUnit}</dd>
          </div>
          <div>
            <dt>Arrival</dt>
            <dd>{searchIntent.arrivalDate}</dd>
          </div>
          <div>
            <dt>Departure</dt>
            <dd>{searchIntent.departureDate}</dd>
          </div>
          <div>
            <dt>Guests</dt>
            <dd>{searchIntent.guestCount}</dd>
          </div>
        </dl>
      </header>

      <div
        className={statusClassName}
        aria-atomic="true"
        aria-live="polite"
        role={
          phase.kind === "failed" ||
          phase.kind === "eligibility_blocked" ||
          phase.kind === "offer_unavailable" ||
          expiry?.kind === "expired"
            ? "alert"
            : "status"
        }
      >
        <p className={styles.statusEyebrow}>{copy.eyebrow}</p>
        <h3 className={styles.statusTitle}>{copy.title}</h3>
        <p className={styles.statusDetail}>{copy.detail}</p>
      </div>

      <ol className={styles.progress} aria-label="Booking request progress">
        {progress.map((item, index) => (
          <li className={styles.progressItem} data-state={item.state} key={item.label}>
            <span aria-hidden="true">{index + 1}</span>
            <div>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </div>
          </li>
        ))}
      </ol>

      {activeExpiresAt && expiry && expiryLabel ? (
        <p
          className={styles.expiryTimer}
          role="timer"
          aria-label={`${expiryLabel} ${
            expiry.kind === "expired"
              ? "expired"
              : `expires in ${formatClubsMemberBookingRemainingTime(expiry.remainingMs)}`
          }`}
        >
          <span>{expiryLabel} expiry</span>
          <time dateTime={activeExpiresAt}>
            {expiry.kind === "expired"
              ? "Expired"
              : formatClubsMemberBookingRemainingTime(expiry.remainingMs)}
          </time>
        </p>
      ) : null}

      <div className={styles.actions}>{action}</div>

      {(phase.kind === "quote_issued" || phase.kind === "hold_active") &&
      expiry?.kind === "expired" ? (
        <p className={styles.resetNote}>
          Start again only resets this local panel. Eligibility and a new quote
          must be requested from the server.
        </p>
      ) : null}

      <p className={styles.boundaryNote}>
        This panel creates a booking request only. It never confirms payment,
        provider fulfilment or a production booking.
      </p>
    </section>
  );
}
