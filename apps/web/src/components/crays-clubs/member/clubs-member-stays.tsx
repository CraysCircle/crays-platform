"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CLUBS_MEMBER_STAYS_RETURN_TO,
  createClubsMemberStaysClient,
  type ClubsMemberStayRecord,
  type ClubsMemberStayState,
  type ClubsMemberStaysReadResult,
} from "@/lib/clubs/member-stays-client";
import styles from "./clubs-member-stays.module.css";

export type ClubsMemberStaysProps = Readonly<{
  returnTo?: string;
}>;

type ViewState = { kind: "loading" } | ClubsMemberStaysReadResult;

const stateLabels: Record<ClubsMemberStayState, string> = {
  submitted: "Submitted",
  in_review: "In Team review",
  accepted: "Accepted",
  confirmed_internal: "Confirmed internally",
  rejected: "Rejected",
  cancelled: "Cancelled",
  released: "Released or expired",
  reconcile_required: "Reconciliation required",
};

const lifecycleLabels: Record<string, string> = {
  submitted: "Submitted",
  in_review: "In review",
  under_review: "In review",
  accepted: "Accepted",
  rejected: "Rejected",
  cancelled: "Cancelled",
  active: "Active",
  expired: "Expired",
  released: "Released",
  converted: "Converted",
  confirmed: "Confirmed internally",
  change_requested: "Change requested",
  in_stay: "In stay",
  completed: "Completed",
  no_show: "No-show",
  not_started: "Not started",
  ready_for_check_in: "Ready for check-in",
  checked_in: "Checked in",
  checked_out: "Checked out",
  not_available: "Not available",
  reconcile_required: "Reconcile first",
};

const stayUnitLabels = {
  night: "Night",
  week: "Week",
  month: "Month",
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function labelFor(value: string) {
  return lifecycleLabels[value] ?? "Reconcile first";
}

function recordKey(record: ClubsMemberStayRecord) {
  return `${record.publicReference}:${record.bookingReference ?? "request"}`;
}

function statusTone(state: ClubsMemberStayState) {
  if (state === "confirmed_internal" || state === "accepted") return "positive";
  if (
    state === "rejected" ||
    state === "cancelled" ||
    state === "released" ||
    state === "reconcile_required"
  ) {
    return "attention";
  }
  return "neutral";
}

function StaysBoundaryNote() {
  return (
    <p className={styles.boundaryNote}>
      This view reports CRAYS Clubs request and internal stay lifecycle only. It
      does not confirm payment, a hotel provider, or a production reservation.
    </p>
  );
}

export function ClubsMemberStays({
  returnTo = CLUBS_MEMBER_STAYS_RETURN_TO,
}: ClubsMemberStaysProps) {
  const [viewState, setViewState] = useState<ViewState>({ kind: "loading" });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const readCurrent = useCallback(
    (signal?: AbortSignal) =>
      createClubsMemberStaysClient().read({ returnTo, signal }),
    [returnTo],
  );

  useEffect(() => {
    const controller = new AbortController();
    void readCurrent(controller.signal).then((next) => {
      if (!controller.signal.aborted) setViewState(next);
    });
    return () => controller.abort();
  }, [readCurrent]);

  const refresh = useCallback(() => {
    setViewState({ kind: "loading" });
    void readCurrent().then(setViewState);
  }, [readCurrent]);
  const records = useMemo(
    () =>
      viewState.kind === "ready" || viewState.kind === "reconcile_required"
        ? viewState.records
        : [],
    [viewState],
  );
  const selected = useMemo(
    () =>
      records.find((record) => recordKey(record) === selectedKey) ??
      records[0] ??
      null,
    [records, selectedKey],
  );

  if (viewState.kind === "loading") {
    return (
      <section className={styles.panel} aria-labelledby="member-stays-heading">
        <header className={styles.header}>
          <p className={styles.kicker}>Member account</p>
          <h2 className={styles.heading} id="member-stays-heading">
            My stays &amp; booking requests
          </h2>
        </header>
        <div className={styles.stateCard} role="status" aria-live="polite">
          <span className={styles.loadingMark} aria-hidden="true" />
          <div>
            <strong>Loading your booking timeline</strong>
            <p>Reading the latest request and internal stay status.</p>
          </div>
        </div>
        <StaysBoundaryNote />
      </section>
    );
  }

  if (viewState.kind === "signed_out") {
    return (
      <section className={styles.panel} aria-labelledby="member-stays-heading">
        <header className={styles.header}>
          <p className={styles.kicker}>Member account</p>
          <h2 className={styles.heading} id="member-stays-heading">
            My stays &amp; booking requests
          </h2>
        </header>
        <div className={styles.stateCard} role="status">
          <div>
            <strong>Sign in to see your stays</strong>
            <p>Your booking requests are available only in your member account.</p>
          </div>
          <a className={styles.primaryAction} href={viewState.loginHref}>
            Sign in
          </a>
        </div>
        <StaysBoundaryNote />
      </section>
    );
  }

  if (viewState.kind === "ready" && records.length === 0) {
    return (
      <section className={styles.panel} aria-labelledby="member-stays-heading">
        <header className={styles.header}>
          <p className={styles.kicker}>Member account</p>
          <h2 className={styles.heading} id="member-stays-heading">
            My stays &amp; booking requests
          </h2>
        </header>
        <div className={styles.stateCard} role="status">
          <div>
            <strong>No booking requests yet</strong>
            <p>Your submitted requests and confirmed internal stays will appear here.</p>
          </div>
          <button className={styles.secondaryAction} type="button" onClick={refresh}>
            Refresh
          </button>
        </div>
        <StaysBoundaryNote />
      </section>
    );
  }

  if (viewState.kind === "reconcile_required" && records.length === 0) {
    return (
      <section className={styles.panel} aria-labelledby="member-stays-heading">
        <header className={styles.header}>
          <p className={styles.kicker}>Member account</p>
          <h2 className={styles.heading} id="member-stays-heading">
            My stays &amp; booking requests
          </h2>
        </header>
        <div className={`${styles.stateCard} ${styles.stateAttention}`} role="alert">
          <div>
            <strong>Reconciliation required</strong>
            <p>
              The latest status could not be read safely. Refresh before relying on
              this booking timeline.
            </p>
          </div>
          <button className={styles.secondaryAction} type="button" onClick={refresh}>
            Refresh status
          </button>
        </div>
        <StaysBoundaryNote />
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="member-stays-heading">
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Member account</p>
          <h2 className={styles.heading} id="member-stays-heading">
            My stays &amp; booking requests
          </h2>
        </div>
        <button className={styles.secondaryAction} type="button" onClick={refresh}>
          Refresh
        </button>
      </header>

      {viewState.kind === "reconcile_required" ? (
        <div className={styles.reconcileBanner} role="alert">
          <strong>Reconciliation required</strong>
          <span>
            One or more lifecycle records could not be correlated safely. No success
            state has been inferred.
          </span>
        </div>
      ) : null}

      <div className={styles.workspace}>
        <nav className={styles.listPanel} aria-label="Booking requests">
          <p className={styles.listHeading}>{records.length} request{records.length === 1 ? "" : "s"}</p>
          <ul className={styles.recordList}>
            {records.map((record) => {
              const key = recordKey(record);
              const isSelected = selected ? recordKey(selected) === key : false;
              return (
                <li key={key}>
                  <button
                    className={styles.recordButton}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedKey(key)}
                  >
                    <span className={styles.recordTopline}>
                      <strong>{record.propertyLabel}</strong>
                      <span data-tone={statusTone(record.state)}>
                        {stateLabels[record.state]}
                      </span>
                    </span>
                    <span className={styles.reference}>{record.publicReference}</span>
                    <span className={styles.recordDates}>
                      <time dateTime={record.arrivalDate}>{formatDate(record.arrivalDate)}</time>
                      <span aria-hidden="true">→</span>
                      <time dateTime={record.departureDate}>{formatDate(record.departureDate)}</time>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {selected ? (
          <article className={styles.detail} aria-live="polite">
            <header className={styles.detailHeader}>
              <div>
                <p className={styles.statusEyebrow}>Booking request</p>
                <h3>{selected.publicReference}</h3>
              </div>
              <span className={styles.statusPill} data-tone={statusTone(selected.state)}>
                {stateLabels[selected.state]}
              </span>
            </header>

            <dl className={styles.tripFacts}>
              <div>
                <dt>Property</dt>
                <dd>{selected.propertyLabel}</dd>
              </div>
              <div>
                <dt>Stay unit</dt>
                <dd>{stayUnitLabels[selected.stayUnit]}</dd>
              </div>
              <div>
                <dt>Arrival</dt>
                <dd><time dateTime={selected.arrivalDate}>{formatDate(selected.arrivalDate)}</time></dd>
              </div>
              <div>
                <dt>Departure</dt>
                <dd><time dateTime={selected.departureDate}>{formatDate(selected.departureDate)}</time></dd>
              </div>
              <div>
                <dt>Guests</dt>
                <dd>{selected.adults} adult{selected.adults === 1 ? "" : "s"}</dd>
              </div>
              <div>
                <dt>Requested capacity</dt>
                <dd>{selected.requestedCapacity ?? "Reconcile first"}</dd>
              </div>
            </dl>

            <section className={styles.lifecycle} aria-labelledby="booking-lifecycle-heading">
              <h4 id="booking-lifecycle-heading">Lifecycle</h4>
              <dl>
                <div><dt>Request</dt><dd>{labelFor(selected.requestLifecycle)}</dd></div>
                <div><dt>Quote</dt><dd>{labelFor(selected.quoteLifecycle)}</dd></div>
                <div><dt>Hold</dt><dd>{labelFor(selected.holdLifecycle)}</dd></div>
                <div><dt>Booking</dt><dd>{labelFor(selected.bookingLifecycle)}</dd></div>
                <div><dt>Reservation</dt><dd>{labelFor(selected.reservationLifecycle)}</dd></div>
                <div><dt>Stay</dt><dd>{labelFor(selected.stayLifecycle)}</dd></div>
              </dl>
            </section>

            <section className={styles.expiry} aria-labelledby="booking-expiry-heading">
              <div>
                <p className={styles.statusEyebrow} id="booking-expiry-heading">Hold &amp; expiry</p>
                <strong>{labelFor(selected.expiryStatus)}</strong>
              </div>
              {selected.holdExpiresAt ? (
                <time dateTime={selected.holdExpiresAt}>
                  {formatTimestamp(selected.holdExpiresAt)}
                </time>
              ) : (
                <span>No active expiry</span>
              )}
            </section>

            {selected.bookingReference ? (
              <p className={styles.bookingReference}>
                Internal booking reference <strong>{selected.bookingReference}</strong>
              </p>
            ) : null}
          </article>
        ) : null}
      </div>

      <StaysBoundaryNote />
    </section>
  );
}
