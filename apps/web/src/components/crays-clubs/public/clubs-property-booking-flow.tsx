"use client";

import Link from "next/link";
import { addStayCalendarMonths, parseStayDay, resolveStayCalendarMonths } from "@/lib/member-commerce/clubs-calendar-month-stay";
import { CalendarDays, Info, Minus, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ClubsMemberBookingActionPanel } from "@/components/crays-clubs/member/clubs-member-booking-action-panel";
import {
  clubsMemberAuthCopy,
  loadingClubsMemberAuthSession,
  readClubsMemberAuthSession,
  type BookingIntent,
  type ClubsMemberAuthSession,
} from "./clubs-property-detail-contract";
import styles from "./clubs-property-booking-flow.module.css";

import { readRecommendation, type RecommendationView } from "./clubs-hotel-recommendation-client";

type BookingStep = "dates" | "guests" | "services" | "request";
type StayUnit = "night" | "week" | "month";

export type PropertyEligibilityView = {
  accessCopy: string;
  allowedStayUnits: StayUnit[];
  loading: boolean;
  loginHref: string | null;
  propertyAccess: boolean;
  propertyId: string;
  retryable: boolean;
  separationCopy: string;
  status:
    | "loading"
    | "public_access"
    | "signed_out"
    | "identity_binding_required"
    | "membership_required"
    | "property_scope_not_ready"
    | "property_admission_required"
    | "property_access_admitted"
    | "not_found"
    | "temporarily_unavailable";
};

type BookingRateView = {
  allowedStayUnits: StayUnit[];
  fromUsdMinor: Partial<Record<StayUnit, number>>;
  membershipRequired: boolean;
  propertyAdmissionRequired: boolean;
  qualifier: string;
  ready: boolean;
};

type ClubsPropertyBookingFlowProps = {
  authReturnTo: string;
  initialStayUnit: StayUnit;
  intent: BookingIntent;
  eligibility: PropertyEligibilityView;
  open: boolean;
  onEligibilityRefresh: () => void;
  propertyTitle: string;
  rate: BookingRateView;
  onClose: () => void;
};

const steps = [
  { id: "dates", label: "Dates" },
  { id: "guests", label: "Guests" },
  { id: "services", label: "Services" },
  { id: "request", label: "Request" },
] as const;

const durations = [3, 5, 7, 10, 14, 21, 28] as const;

const usdFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  style: "currency",
});

function stayUnitLabel(stayUnit: StayUnit) {
  return stayUnit === "night"
    ? "Night"
    : stayUnit === "week"
      ? "Week"
      : "Month";
}

function formatIntentDate(value: string) {
  if (!value) return "Not selected";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Not selected";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function calculateCheckout(checkIn: string, nights: number, stayUnit: StayUnit, months = 1) {
  if (!checkIn) return "";
  try {
    if (stayUnit === "month") return addStayCalendarMonths(checkIn, months);
    const parsed = parseStayDay(checkIn);
    parsed.setUTCDate(parsed.getUTCDate() + (stayUnit === "week" ? 7 : nights));
    return parsed.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function ClubsPropertyBookingFlow({
  authReturnTo,
  eligibility,
  initialStayUnit,
  intent,
  onEligibilityRefresh,
  open,
  propertyTitle,
  rate,
  onClose,
}: ClubsPropertyBookingFlowProps) {
  const [step, setStep] = useState<BookingStep>("dates");
  const [checkIn, setCheckIn] = useState(intent.checkIn);
  const [nights, setNights] = useState(
    durations.includes(intent.nights as (typeof durations)[number])
      ? intent.nights
      : 7,
  );
  const [stayUnit, setStayUnit] = useState<StayUnit>(initialStayUnit);
  const [guests, setGuests] = useState(intent.guests);
  const [children, setChildren] = useState(intent.children);
  const [pets, setPets] = useState(intent.pets);
  const [memberSession, setMemberSession] = useState<ClubsMemberAuthSession>(
    loadingClubsMemberAuthSession,
  );
  const [provisioning, setProvisioning] = useState(false);
  const [recommendation, setRecommendation] = useState<RecommendationView>({ status: "checking", ambassadorName: null });
  const [recommendationRefresh, setRecommendationRefresh] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const resolvedStayUnit = rate.allowedStayUnits.includes(stayUnit)
    ? stayUnit
    : rate.allowedStayUnits.includes(initialStayUnit)
      ? initialStayUnit
      : (rate.allowedStayUnits[0] ?? initialStayUnit);
  const calendarMonthPeriods = useMemo(() => {
    try {
      return resolveStayCalendarMonths(intent.checkIn, intent.checkOut);
    } catch {
      return 1;
    }
  }, [intent.checkIn, intent.checkOut]);
  const calculatedCheckout = useMemo(
    () => calculateCheckout(checkIn, nights, resolvedStayUnit, calendarMonthPeriods),
    [checkIn, nights, resolvedStayUnit, calendarMonthPeriods],
  );
  const requestedCheckout = calculatedCheckout;
  const guestSummary = `${guests} ${guests === 1 ? "guest" : "guests"} · ${children} ${children === 1 ? "child" : "children"} · ${pets} ${pets === 1 ? "pet request" : "pet requests"}`;
  const currentIndex = steps.findIndex((item) => item.id === step);
  const displayUsdMinor = rate.fromUsdMinor[resolvedStayUnit];
  const monthlyOnly =
    rate.allowedStayUnits.length === 1 && rate.allowedStayUnits[0] === "month";
  const publicAmountHidden =
    eligibility.propertyId === "property-clubs-forest-city-golf";
  const rateText =
    rate.ready && typeof displayUsdMinor === "number"
      ? publicAmountHidden
        ? "Rate available after stay review"
        : `From ${usdFormatter.format(displayUsdMinor / 100)} / ${resolvedStayUnit}`
      : "Rate currently unavailable";
  const memberBookingPropertyId =
    eligibility.propertyId === "property-clubs-forest-city-golf" ||
    eligibility.propertyId === "property-clubs-forest-city-marina"
      ? eligibility.propertyId
      : null;
  const memberBookingStayUnit =
    eligibility.allowedStayUnits.includes(resolvedStayUnit) &&
    rate.allowedStayUnits.includes(resolvedStayUnit)
      ? resolvedStayUnit
      : null;
  const memberBookingAccessAdmitted = Boolean(
    memberBookingPropertyId &&
      memberBookingStayUnit &&
      recommendation.status === "approved" &&
      eligibility.propertyAccess &&
      (memberBookingPropertyId === "property-clubs-forest-city-golf"
        ? eligibility.status === "public_access" &&
          !rate.membershipRequired &&
          !rate.propertyAdmissionRequired
        : eligibility.status === "property_access_admitted" &&
          memberBookingStayUnit === "month" &&
          rate.membershipRequired &&
          rate.propertyAdmissionRequired &&
          eligibility.allowedStayUnits.length === 1 &&
          eligibility.allowedStayUnits[0] === "month"),
  );
  const memberBookingDeparture = calculateCheckout(
    checkIn,
    nights,
    memberBookingStayUnit ?? resolvedStayUnit,
    calendarMonthPeriods,
  );
  const memberBookingRequestedCapacity = guests + children;
  const memberBookingSearchReady =
    memberBookingAccessAdmitted &&
    Boolean(memberBookingPropertyId) &&
    Boolean(memberBookingStayUnit) &&
    Boolean(checkIn) &&
    Boolean(memberBookingDeparture) &&
    Number.isSafeInteger(guests) &&
    guests >= 1 &&
    guests <= 100 &&
    Number.isSafeInteger(memberBookingRequestedCapacity) &&
    memberBookingRequestedCapacity >= guests &&
    memberBookingRequestedCapacity <= 100;

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
        ),
      ).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.setTimeout(() => previousFocusRef.current?.focus(), 0);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open || step !== "request") return;
    const controller = new AbortController();
    void readClubsMemberAuthSession(authReturnTo, controller.signal).then(
      (session) => {
        if (!controller.signal.aborted) setMemberSession(session);
      },
    );
    return () => controller.abort();
  }, [authReturnTo, open, step]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void readRecommendation(controller.signal).then((view) => {
      if (!controller.signal.aborted) setRecommendation(view);
    });
    return () => controller.abort();
  }, [open, step, memberSession.status, recommendationRefresh]);

  const retryMemberSession = async () => {
    setMemberSession({ ...loadingClubsMemberAuthSession });
    setMemberSession(await readClubsMemberAuthSession(authReturnTo));
  };

  const provisionGuestAccount = async () => {
    if (
      provisioning ||
      memberSession.status !== "identity_binding_required" ||
      memberSession.provisioningHref !== "/api/crays/auth/provider/account"
    )
      return;
    setProvisioning(true);
    try {
      await fetch(memberSession.provisioningHref, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: "clubs" }),
      });
      setMemberSession(await readClubsMemberAuthSession(authReturnTo));
      onEligibilityRefresh();
    } catch {
      setMemberSession({
        ...loadingClubsMemberAuthSession,
        status: "temporarily_unavailable",
      });
    } finally {
      setProvisioning(false);
    }
  };

  if (!open) return null;

  const selectStep = (next: BookingStep) => {
    if (next === "request")
      setMemberSession({ ...loadingClubsMemberAuthSession });
    setStep(next);
  };

  const moveStep = (offset: number) => {
    const next =
      steps[Math.min(steps.length - 1, Math.max(0, currentIndex + offset))];
    selectStep(next.id);
  };

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        aria-describedby="booking-orientation-note"
        aria-labelledby="booking-flow-title"
        aria-modal="true"
        className={styles.dialog}
        ref={panelRef}
        role="dialog"
      >
        <header className={styles.dialogHeader}>
          <div>
            <p>CRAYS BOOKING</p>
            <h2 id="booking-flow-title">{propertyTitle}</h2>
          </div>
          <button
            aria-label="Close booking steps"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            <X aria-hidden="true" size={22} />
          </button>
        </header>

        <div className={styles.dialogBody}>
          <div className={styles.flowColumn}>
            <nav aria-label="Booking steps" className={styles.stepper}>
              {steps.map((item, index) => (
                <button
                  aria-current={step === item.id ? "step" : undefined}
                  className={step === item.id ? styles.stepActive : ""}
                  key={item.id}
                  onClick={() => selectStep(item.id)}
                  type="button"
                >
                  <span>Step {index + 1}</span>
                  <strong>{item.label}</strong>
                </button>
              ))}
            </nav>

            <p
              className={styles.orientationNote}
              id="booking-orientation-note"
              role="status"
            >
              {eligibility.accessCopy} {eligibility.separationCopy}
              {eligibility.status === "signed_out" && eligibility.loginHref ? (
                <>
                  {" "}
                  <a href={eligibility.loginHref}>Sign in</a>
                </>
              ) : null}
            </p>

            <section className={styles.recommendationPanel} aria-label="Personal invitation" aria-live="polite">
              <strong>Your personal invitation</strong>
              <p>Crays is an invitation-led community. Before booking, your named Ambassador’s personal recommendation must be approved by the Crays team in the Crays system.</p>
              <p>{recommendation.status === "checking" ? "Checking your recommendation…" : recommendation.status === "approved" ? `Recommendation approved · Ambassador: ${recommendation.ambassadorName}. Membership, property access and booking approval are checked separately.` : recommendation.status === "unavailable" ? "We cannot verify your recommendation right now. Booking remains unavailable until it can be verified." : "An approved personal recommendation is required before you can book."}</p>
              {recommendation.status !== "approved" ? <Link href="/en/ambassadors">Find your Ambassador</Link> : null}
              <button type="button" onClick={() => { setRecommendation({ status: "checking", ambassadorName: null }); setRecommendationRefresh(value => value + 1); }}>Check recommendation again</button>
            </section>

            {step === "dates" ? (
              <section
                className={styles.stepPanel}
                aria-labelledby="dates-step-title"
              >
                <h3 id="dates-step-title">Select arrival and duration</h3>
                <div className={styles.fieldGrid}>
                  <label>
                    CHECK-IN INTENT
                    <span>
                      <CalendarDays aria-hidden="true" size={18} />
                      <input
                        onChange={(event) => setCheckIn(event.target.value)}
                        type="date"
                        value={checkIn}
                      />
                    </span>
                  </label>
                  {monthlyOnly ? (
                    <label>
                      STAY INTENT
                      <select disabled value="month">
                        <option value="month">Monthly stay only</option>
                      </select>
                    </label>
                  ) : (
                    <label>
                      DURATION INTENT (NIGHTS)
                      <select
                        onChange={(event) =>
                          setNights(Number(event.target.value))
                        }
                        value={nights}
                      >
                        {durations.map((duration) => (
                          <option key={duration} value={duration}>
                            {duration} nights
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                <fieldset className={styles.rateUnitGroup}>
                  <legend>PROVISIONAL RATE VIEW</legend>
                  <div>
                    {rate.allowedStayUnits.map((unit) => (
                      <button
                        aria-pressed={resolvedStayUnit === unit}
                        key={unit}
                        onClick={() => setStayUnit(unit)}
                        type="button"
                      >
                        {stayUnitLabel(unit)}
                      </button>
                    ))}
                    {rate.allowedStayUnits.length === 0 ? (
                      <button disabled type="button">
                        Rate unavailable
                      </button>
                    ) : null}
                  </div>
                  <p>
                    <strong>{rateText}</strong>
                    <span>{rate.qualifier}</span>
                  </p>
                </fieldset>
                <div className={styles.infoPanel}>
                  <Info aria-hidden="true" size={18} />
                  <p>
                    {monthlyOnly
                      ? "Monthly stays only. Arrival remains visitor intent; exact duration and checkout require separate availability confirmation."
                      : `These dates are your search intent only. Availability has not yet been confirmed.${
                          calculatedCheckout
                            ? ` Calculated checkout: ${formatIntentDate(calculatedCheckout)}.`
                            : " Select a check-in date to calculate checkout."
                        }`}
                  </p>
                </div>
              </section>
            ) : null}

            {step === "guests" ? (
              <section
                className={styles.stepPanel}
                aria-labelledby="guests-step-title"
              >
                <h3 id="guests-step-title">Guests and pets</h3>
                <p className={styles.stepLead}>
                  Guest capacity and pet requests have not yet been confirmed.
                </p>
                {[
                  {
                    label: "Adults",
                    helper: "Visitor intent",
                    value: guests,
                    setValue: setGuests,
                    minimum: 1,
                  },
                  {
                    label: "Children",
                    helper: "Visitor intent",
                    value: children,
                    setValue: setChildren,
                    minimum: 0,
                  },
                  {
                    label: "Pets",
                    helper: "Pet request intent only",
                    value: pets,
                    setValue: setPets,
                    minimum: 0,
                  },
                ].map((row) => (
                  <div className={styles.counterRow} key={row.label}>
                    <div>
                      <strong>{row.label}</strong>
                      <span>{row.helper}</span>
                    </div>
                    <div>
                      <button
                        aria-label={`Decrease ${row.label}`}
                        disabled={row.value <= row.minimum}
                        onClick={() =>
                          row.setValue(Math.max(row.minimum, row.value - 1))
                        }
                        type="button"
                      >
                        <Minus aria-hidden="true" size={16} />
                      </button>
                      <output aria-live="polite">{row.value}</output>
                      <button
                        aria-label={`Increase ${row.label}`}
                        onClick={() => row.setValue(row.value + 1)}
                        type="button"
                      >
                        <Plus aria-hidden="true" size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            ) : null}

            {step === "services" ? (
              <section
                className={styles.stepPanel}
                aria-labelledby="services-step-title"
              >
                <h3 id="services-step-title">Services</h3>
                <div className={styles.unavailablePanel} role="status">
                  <strong>Services are not available yet.</strong>
                  <p>
                    A property-specific service catalogue and service pricing
                    are not available yet.
                  </p>
                  <button
                    aria-describedby="services-step-title"
                    disabled
                    type="button"
                  >
                    Service selection unavailable
                  </button>
                </div>
              </section>
            ) : null}

            {step === "request" ? (
              <section
                className={styles.stepPanel}
                aria-labelledby="request-step-title"
              >
                <h3 id="request-step-title">Request this property</h3>
                <p className={styles.stepLead}>
                  Continue through a canonical quote, temporary hold and CRAYS
                  Team booking review. No personal details or payment data are
                  collected here.
                </p>
                <section
                  aria-label="CRAYS guest account"
                  aria-live="polite"
                  className={styles.memberAccess}
                >
                  <p>CRAYS GUEST ACCOUNT</p>
                  <strong>{clubsMemberAuthCopy[memberSession.status]}</strong>
                  {memberSession.status === "signed_out" &&
                  memberSession.loginHref &&
                  memberSession.signupHref ? (
                    <div>
                      <a href={memberSession.loginHref}>Sign in</a>
                      <a href={memberSession.signupHref}>Create account</a>
                    </div>
                  ) : null}
                  {memberSession.status === "identity_binding_required" &&
                  memberSession.provisioningHref ? (
                    <button
                      disabled={provisioning}
                      onClick={() => void provisionGuestAccount()}
                      type="button"
                    >
                      {provisioning
                        ? "Completing guest account..."
                        : "Complete guest account"}
                    </button>
                  ) : null}
                  {memberSession.status === "ready" ? (
                    <div>
                      <span>
                        {memberSession.account?.displayName ||
                          memberSession.account?.name ||
                          "CRAYS guest"}
                      </span>
                      <Link href="/en/account">Account</Link>
                      {memberSession.logoutHref ? (
                        <a href={memberSession.logoutHref}>Log out</a>
                      ) : null}
                    </div>
                  ) : null}
                  {memberSession.status === "provider_session_unreadable" ||
                  memberSession.status === "core_unavailable" ||
                  memberSession.status === "temporarily_unavailable" ? (
                    <button
                      onClick={() => void retryMemberSession()}
                      type="button"
                    >
                      Try again
                    </button>
                  ) : null}
                  <span>
                    Signing in does not confirm your recommendation, membership, property access,
                    availability or a stay.
                  </span>
                </section>
                {memberBookingSearchReady &&
                memberBookingPropertyId &&
                memberBookingStayUnit ? (
                  <ClubsMemberBookingActionPanel
                    key={`${memberBookingPropertyId}:${memberBookingStayUnit}:${checkIn}:${memberBookingDeparture}:${guests}:${memberBookingRequestedCapacity}`}
                    propertyId={memberBookingPropertyId}
                    searchIntent={{
                      arrivalDate: checkIn,
                      departureDate: memberBookingDeparture,
                      guestCount: guests,
                      requestedCapacity: memberBookingRequestedCapacity,
                      returnTo: authReturnTo,
                    }}
                    stayUnit={memberBookingStayUnit}
                  />
                ) : (
                  <div className={styles.unavailablePanel} role="status">
                    <strong>Booking actions are not available yet.</strong>
                    <p>
                      {memberBookingPropertyId ===
                      "property-clubs-forest-city-marina"
                        ? "An approved personal recommendation, confirmed membership, active Marina admission, a monthly stay and valid search details are required."
                        : "An approved personal recommendation, server-admitted property access and valid stay details are required."}
                    </p>
                  </div>
                )}
              </section>
            ) : null}

            <footer className={styles.flowActions}>
              <button
                onClick={currentIndex === 0 ? onClose : () => moveStep(-1)}
                type="button"
              >
                {currentIndex === 0 ? "Cancel" : "Back"}
              </button>
              {step !== "request" ? (
                <button
                  className={styles.primaryAction}
                  onClick={() => moveStep(1)}
                  type="button"
                >
                  Continue
                </button>
              ) : null}
            </footer>
          </div>

          <aside className={styles.summary} aria-label="Booking summary">
            <h3>Booking summary</h3>
            <dl>
              <div>
                <dt>Property</dt>
                <dd>{propertyTitle}</dd>
              </div>
              <div>
                <dt>Check-in intent</dt>
                <dd>{formatIntentDate(checkIn)}</dd>
              </div>
              <div>
                <dt>Checkout calculation</dt>
                <dd>
                  {monthlyOnly
                    ? "Monthly stay intent"
                    : formatIntentDate(requestedCheckout)}
                </dd>
              </div>
              <div>
                <dt>Guests</dt>
                <dd>{guestSummary}</dd>
              </div>
              <div>
                <dt>Availability</dt>
                <dd>Availability has not yet been confirmed.</dd>
              </div>
              <div>
                <dt>Rate</dt>
                <dd>{rateText}</dd>
              </div>
              <div>
                <dt>Selected services</dt>
                <dd>Services are not available yet.</dd>
              </div>
              <div>
                <dt>Service pricing</dt>
                <dd>Service pricing unavailable</dd>
              </div>
              <div>
                <dt>CRAYS care</dt>
                <dd>CRAYS care fee not available</dd>
              </div>
              <div>
                <dt>Taxes and fees</dt>
                <dd>Taxes and fees not available</dd>
              </div>
              <div className={styles.totalRow}>
                <dt>Total</dt>
                <dd>Total estimate unavailable</dd>
              </div>
              <div>
                <dt>Deposit</dt>
                <dd>Deposit information unavailable</dd>
              </div>
              <div>
                <dt>Security hold</dt>
                <dd>Security hold information unavailable</dd>
              </div>
            </dl>
            <p>
              {rate.qualifier} {eligibility.accessCopy}{" "}
              {eligibility.separationCopy} Booking requests continue through
              the canonical quote and hold actions in Step 4. A provisional
              from-rate is not a final quote. Total, deposit, payment and
              confirmation remain unavailable in this summary.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
