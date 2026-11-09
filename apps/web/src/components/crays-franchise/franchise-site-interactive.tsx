"use client";

import {
  ArrowRight,
  Building2,
  Check,
  Handshake,
  Landmark,
  Menu,
  Store,
  TrendingUp,
  Wrench,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import styles from "./franchise-site.module.css";

const previewRoot = "/crays-franchise";

type StakeholderSlide = {
  readonly title: string;
  readonly headline: string;
  readonly copy: string;
  readonly href: string;
  readonly cta: string;
  readonly secondaryHref: string | null;
  readonly secondary: string | null;
  readonly image: string;
  readonly alt: string;
  readonly objectPosition: string;
};

function Action({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link className={styles.action} href={href}>
      {children}
      <ArrowRight size={18} />
    </Link>
  );
}

export function LegacyHeader() {
  const [open, setOpen] = useState(false);
  const links = [
    ["CONCEPTS", "concepts"],
    ["PROPERTY OWNERS", "/real-estate"],
    ["FRANCHISE PARTNERS", "/franchise/deals"],
    ["FUNDING PARTNERS", "/funding-partner-bank"],
    ["INVESTORS", "/investor"],
    ["VENDORS", "/vendor"],
  ];

  return (
    <header className={styles.header}>
      <Link
        href={previewRoot}
        className={styles.brand}
        aria-label="CRAYS Franchise home"
      >
        <Image
          src="/assets/crays-logo-white.svg"
          width={142}
          height={36}
          alt="CRAYS"
          priority
        />
      </Link>
      <div className={styles.headerActions}>
        <Link className={styles.headerLogin} href="/portal">
          LOG IN
          <Image src="/assets/icon-login.svg" width={18} height={18} alt="" />
        </Link>
        <Link
          className={styles.headerPrimary}
          href="/account/create/continue/real-estate"
        >
          SUBMIT PROPERTY
          <Image src="/assets/icon-member.svg" width={21} height={9} alt="" />
        </Link>
        <span className={styles.b2bLabel}>B2B</span>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-label="Open navigation"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open ? (
        <div className={styles.mobileMenu}>
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href.startsWith("/") ? href : `${previewRoot}/${href}`}
              onClick={() => setOpen(false)}
            >
              {label}
              <ArrowRight />
            </Link>
          ))}
          <Link href="/portal">
            SHARED LOGIN &amp; PORTAL
            <ArrowRight />
          </Link>
        </div>
      ) : null}
    </header>
  );
}

export function StakeholderSlider({
  slides,
}: {
  slides: readonly StakeholderSlide[];
}) {
  const [active, setActive] = useState(0);
  const slide = slides[active];
  const previousSlide = slides[(active - 1 + slides.length) % slides.length];
  const nextSlide = slides[(active + 1) % slides.length];
  const activeMatchRole =
    active === 0
      ? "property"
      : active === 1
        ? "franchise"
        : active === 2 || active === 3
          ? "finance"
          : "delivery";
  const select = (index: number) =>
    setActive((index + slides.length) % slides.length);

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(index);
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

    let nextIndex = index;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + slides.length) % slides.length;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % slides.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = slides.length - 1;
    event.preventDefault();
    if (nextIndex !== index) select(nextIndex);
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`[data-slider-index="${nextIndex}"]`)
      ?.focus();
  };

  return (
    <section
      id="stakeholders"
      className={`${styles.stakeholderSlider} ${styles.stakeholderStageV2}`}
      aria-labelledby="stakeholder-slider-title"
      aria-roledescription="carousel"
    >
      <div className={styles.stakeholderMatchIntro}>
        <div className={styles.stakeholderMatchCopy}>
          <p className={styles.eyebrow}>CHOOSE YOUR CRAYS ROUTE</p>
          <h2 id="stakeholder-slider-title">
            <button
              type="button"
              className={styles.stakeholderProperty}
              onClick={() => select(0)}
              aria-current={active === 0 ? "true" : undefined}
              aria-controls="stakeholder-slide"
            >
              <small>PROPERTY OWNERS &amp; BROKERS</small>
              <strong>BRING THE PLACE.</strong>
            </button>
            <button
              type="button"
              className={styles.stakeholderFranchise}
              onClick={() => select(1)}
              aria-current={active === 1 ? "true" : undefined}
              aria-controls="stakeholder-slide"
            >
              <small>FRANCHISE PARTNERS</small>
              <strong>RUN THE BUSINESS.</strong>
            </button>
            <button
              type="button"
              className={styles.stakeholderFinance}
              onClick={() => select(2)}
              aria-current={active === 2 || active === 3 ? "true" : undefined}
              aria-controls="stakeholder-slide"
            >
              <small>FINANCING PARTNERS</small>
              <strong>FUND THE GROWTH.</strong>
            </button>
            <button
              type="button"
              className={styles.stakeholderDelivery}
              onClick={() => select(4)}
              aria-current={active === 4 ? "true" : undefined}
              aria-controls="stakeholder-slide"
            >
              <small>VENDORS &amp; DELIVERY PARTNERS</small>
              <strong>DELIVER THE OPENING.</strong>
            </button>
          </h2>
          <p className={styles.stakeholderMatchStatement}>
            We combine Targomo location intelligence with available commercial
            properties to automatically create a complete franchise business
            case. Every opportunity includes a financial model, business plan
            and concept visualization, and is instantly connected with the
            right construction partners, suppliers, fit-out specialists and
            funding partners.
          </p>
          <p className={styles.stakeholderMatchTruth}>
            Matching prepares the conversation; every relationship, funding
            decision, work package and opening remains independently approved.
          </p>
        </div>
        <div
          className={styles.stakeholderMatchMap}
          data-active-role={activeMatchRole}
          aria-label="Four stakeholder groups connected through the CRAYS matching ecosystem"
        >
          <div className={styles.stakeholderMatchOrbit} aria-hidden="true" />
          <span className={`${styles.stakeholderMatchConnector} ${styles.stakeholderMatchConnectorProperty}`} aria-hidden="true" />
          <span className={`${styles.stakeholderMatchConnector} ${styles.stakeholderMatchConnectorFranchise}`} aria-hidden="true" />
          <span className={`${styles.stakeholderMatchConnector} ${styles.stakeholderMatchConnectorFinance}`} aria-hidden="true" />
          <span className={`${styles.stakeholderMatchConnector} ${styles.stakeholderMatchConnectorDelivery}`} aria-hidden="true" />
          <div className={styles.stakeholderMatchOutcomeTop} aria-hidden="true">
            <Handshake />
            <span>PERFECT MATCH</span>
          </div>
          <div className={styles.stakeholderMatchOutcomeBottom} aria-hidden="true">
            <TrendingUp />
            <span>STRONGER TOGETHER</span>
          </div>
          <button type="button" onClick={() => select(0)} aria-current={active === 0 ? "true" : undefined} className={`${styles.stakeholderMatchNode} ${styles.stakeholderMatchNodeProperty} ${active === 0 ? styles.stakeholderMatchNodeActive : ""}`}>
            <span className={styles.stakeholderMatchNodeNumber}>01</span>
            <Building2 aria-hidden="true" />
            <p>PROPERTY OWNERS</p>
            <strong>BRING THE PLACE.</strong>
          </button>
          <button type="button" onClick={() => select(1)} aria-current={active === 1 ? "true" : undefined} className={`${styles.stakeholderMatchNode} ${styles.stakeholderMatchNodeFranchise} ${active === 1 ? styles.stakeholderMatchNodeActive : ""}`}>
            <span className={styles.stakeholderMatchNodeNumber}>02</span>
            <Store aria-hidden="true" />
            <p>FRANCHISE PARTNERS</p>
            <strong>RUN THE BUSINESS.</strong>
          </button>
          <div className={styles.stakeholderMatchCore}>
            <Image src="/assets/crays-logo.svg" width={150} height={42} alt="CRAYS" />
            <span>MATCHING ECOSYSTEM</span>
          </div>
          <button type="button" onClick={() => select(2)} aria-current={active === 2 || active === 3 ? "true" : undefined} className={`${styles.stakeholderMatchNode} ${styles.stakeholderMatchNodeFinance} ${active === 2 || active === 3 ? styles.stakeholderMatchNodeActive : ""}`}>
            <span className={styles.stakeholderMatchNodeNumber}>03</span>
            <Landmark aria-hidden="true" />
            <p>FINANCING PARTNERS</p>
            <strong>FUND THE GROWTH.</strong>
          </button>
          <button type="button" onClick={() => select(4)} aria-current={active === 4 ? "true" : undefined} className={`${styles.stakeholderMatchNode} ${styles.stakeholderMatchNodeDelivery} ${active === 4 ? styles.stakeholderMatchNodeActive : ""}`}>
            <span className={styles.stakeholderMatchNodeNumber}>04</span>
            <Wrench aria-hidden="true" />
            <p>VENDORS &amp; DELIVERY</p>
            <strong>DELIVER THE OPENING.</strong>
          </button>
        </div>
      </div>
      <div
        id="stakeholder-slide"
        className={styles.sliderStage}
        role="group"
        aria-roledescription="slide"
        aria-label={`${active + 1} of ${slides.length}: ${slide.title}`}
      >
        <div key={`media-${slide.image}`} className={styles.sliderMedia}>
          <Image
            key={slide.image}
            src={slide.image}
            fill
            sizes="(max-width: 900px) 100vw, 58vw"
            alt={slide.alt}
            style={{ objectPosition: slide.objectPosition }}
          />
          <span aria-hidden="true">
            {String(active + 1).padStart(2, "0")} /{" "}
            {String(slides.length).padStart(2, "0")}
          </span>
        </div>
        <article key={`copy-${slide.headline}`} className={styles.sliderCopy}>
          <p className={styles.sliderRole}>{slide.title}</p>
          <h3>{slide.headline}</h3>
          <p className={styles.sliderDescription}>{slide.copy}</p>
          <div className={styles.sliderActions}>
            <Action href={slide.href}>{slide.cta}</Action>
            {slide.secondaryHref && slide.secondary ? (
              <Link
                className={styles.approvedTextLink}
                href={slide.secondaryHref}
              >
                {slide.secondary}
                <ArrowRight />
              </Link>
            ) : null}
          </div>
          <div
            className={styles.sliderControls}
            aria-label="Stakeholder slider controls"
          >
            <div
              className={styles.sliderDots}
              role="group"
              aria-label="Choose stakeholder"
            >
              {slides.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  className={`${styles.sliderDot} ${
                    index === active ? styles.sliderDotActive : ""
                  }`}
                  onClick={() => select(index)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  aria-label={`${item.title}, slide ${index + 1} of ${slides.length}`}
                  aria-current={index === active ? "true" : undefined}
                  aria-controls="stakeholder-slide"
                  tabIndex={index === active ? 0 : -1}
                  data-slider-index={index}
                />
              ))}
            </div>
            <div className={styles.sliderNavRow}>
              <button
                className={styles.sliderNav}
                type="button"
                onClick={() => select(active - 1)}
                aria-label={`Previous stakeholder: ${previousSlide.title}`}
                aria-controls="stakeholder-slide"
              >
                <ArrowRight
                  className={styles.sliderPreviousIcon}
                  aria-hidden="true"
                />
              </button>
              <button
                className={styles.sliderNav}
                type="button"
                onClick={() => select(active + 1)}
                aria-label={`Next stakeholder: ${nextSlide.title}`}
                aria-controls="stakeholder-slide"
              >
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>
        </article>
      </div>
      <p
        className={styles.sliderStatus}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Showing {slide.title}, slide {active + 1} of {slides.length}
      </p>
    </section>
  );
}

export type FranchiseFeatureSlide = {
  readonly eyebrow: string;
  readonly title: string;
  readonly copy: string;
  readonly detail?: string;
  readonly href: string;
  readonly cta: string;
  readonly image: string;
  readonly alt: string;
  readonly objectPosition?: string;
};

type FranchiseFeatureNavigation = {
  readonly eyebrow: string;
  readonly title: string;
  readonly copy: string;
  readonly href: string;
  readonly cta: string;
  readonly items: readonly string[];
};

export function FranchiseFeatureSlider({
  id,
  label,
  slides,
  light = false,
  navigation,
}: {
  id: string;
  label: string;
  slides: readonly FranchiseFeatureSlide[];
  light?: boolean;
  navigation?: FranchiseFeatureNavigation;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const dragRef = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });
  const programmaticTargetRef = useRef<number | null>(null);
  const programmaticTimerRef = useRef<number | null>(null);

  const goTo = (index: number) => {
    const next = (index + slides.length) % slides.length;
    programmaticTargetRef.current = next;
    if (programmaticTimerRef.current) window.clearTimeout(programmaticTimerRef.current);
    setActive(next);
    const rail = railRef.current;
    const card = rail?.children[next] as HTMLElement | undefined;
    if (!rail || !card) return;
    const usesWideComposition = rail.clientWidth >= 900;
    const previousSlidePeek = usesWideComposition
      ? Math.min(320, Math.max(260, rail.clientWidth * 0.28))
      : (rail.clientWidth - card.clientWidth) / 2;
    rail.scrollTo({
      left: next === 0 ? 0 : card.offsetLeft - previousSlidePeek,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const syncActiveSlide = () => {
    const rail = railRef.current;
    if (!rail) return;
    const railBounds = rail.getBoundingClientRect();
    const railAnchor = railBounds.left + rail.clientWidth * (rail.clientWidth >= 900 ? 0.69 : 0.5);
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    Array.from(rail.children).forEach((card, index) => {
      const bounds = card.getBoundingClientRect();
      const cardAnchor = bounds.left + bounds.width / 2;
      const distance = Math.abs(cardAnchor - railAnchor);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });

    setActive(nearest);
  };

  const handleSliderScroll = () => {
    const pendingTarget = programmaticTargetRef.current;
    if (pendingTarget === null) {
      syncActiveSlide();
      return;
    }

    if (programmaticTimerRef.current) window.clearTimeout(programmaticTimerRef.current);
    programmaticTimerRef.current = window.setTimeout(() => {
      setActive(pendingTarget);
      programmaticTargetRef.current = null;
      programmaticTimerRef.current = null;
    }, 180);
  };

  const slider = (
    <div className={styles.featureSliderBody}>
      <div
        ref={railRef}
        id={id}
        className={styles.featureSliderRail}
        onScroll={handleSliderScroll}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse" || event.button !== 0) return;
          const target = event.target as Element;
          if (target.closest("a, button")) return;
          programmaticTargetRef.current = null;
          if (programmaticTimerRef.current) {
            window.clearTimeout(programmaticTimerRef.current);
            programmaticTimerRef.current = null;
          }
          dragRef.current = {
            active: true,
            moved: false,
            startX: event.clientX,
            scrollLeft: event.currentTarget.scrollLeft,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragRef.current.active) return;
          const delta = event.clientX - dragRef.current.startX;
          if (Math.abs(delta) > 5) dragRef.current.moved = true;
          event.currentTarget.scrollLeft = dragRef.current.scrollLeft - delta;
        }}
        onPointerUp={(event) => {
          if (!dragRef.current.active) return;
          dragRef.current.active = false;
          event.currentTarget.releasePointerCapture(event.pointerId);
          syncActiveSlide();
        }}
        onPointerCancel={() => {
          dragRef.current.active = false;
        }}
        onClickCapture={(event) => {
          if (!dragRef.current.moved) return;
          event.preventDefault();
          event.stopPropagation();
          dragRef.current.moved = false;
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            goTo(active + (event.key === "ArrowRight" ? 1 : -1));
          }
          if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            goTo(event.key === "Home" ? 0 : slides.length - 1);
          }
        }}
        tabIndex={0}
      >
        {slides.map((slide, index) => (
          <article
            key={slide.title}
            className={`${styles.featureSlide} ${index === active ? styles.featureSlideActive : ""}`}
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}
            aria-current={index === active ? "true" : undefined}
            onClick={() => {
              if (!dragRef.current.moved && index !== active) goTo(index);
            }}
          >
            <div className={styles.featureSlideMedia}>
              <Image
                src={slide.image}
                fill
                sizes="(max-width: 700px) 86vw, (max-width: 1100px) 62vw, 46vw"
                alt={slide.alt}
                style={{ objectPosition: slide.objectPosition ?? "50% 50%" }}
              />
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className={styles.featureSlideCopy}>
              <p>{slide.eyebrow}</p>
              <h3>{slide.title}</h3>
              <p>{slide.copy}</p>
              {slide.detail ? <small>{slide.detail}</small> : null}
              <Link href={slide.href}>
                {slide.cta}
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className={styles.featureSliderControls}>
        <div className={styles.featureSliderNav}>
          <button type="button" onClick={() => goTo(active - 1)} aria-label="Previous slide" aria-controls={id}>
            <ArrowRight aria-hidden="true" />
          </button>
          <button type="button" onClick={() => goTo(active + 1)} aria-label="Next slide" aria-controls={id}>
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
        <div className={styles.featureSliderDots} aria-label="Choose slide">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Show ${slide.title}`}
              aria-current={index === active ? "true" : undefined}
              className={index === active ? styles.featureSliderDotActive : ""}
            />
          ))}
        </div>
        <p aria-live="polite">{String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</p>
      </div>
    </div>
  );

  return (
    <div
      className={`${styles.featureSlider} ${light ? styles.featureSliderLight : ""} ${navigation ? styles.featureSliderWithNavigation : ""}`}
      aria-roledescription="carousel"
      aria-label={label}
    >
      {navigation ? (
        <aside className={styles.featureSliderSide} aria-labelledby={`${id}-title`}>
          <p>{navigation.eyebrow}</p>
          <h2 id={`${id}-title`}>{navigation.title}</h2>
          <p>{navigation.copy}</p>
          <nav aria-label={`${label} sections`}>
            {slides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                onClick={() => goTo(index)}
                onKeyDown={(event) => {
                  if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  let next = index;
                  if (event.key === "ArrowUp") next = (index - 1 + slides.length) % slides.length;
                  if (event.key === "ArrowDown") next = (index + 1) % slides.length;
                  if (event.key === "Home") next = 0;
                  if (event.key === "End") next = slides.length - 1;
                  goTo(next);
                  event.currentTarget.parentElement
                    ?.querySelector<HTMLButtonElement>(`[data-feature-navigation="${next}"]`)
                    ?.focus();
                }}
                aria-controls={id}
                aria-current={index === active ? "true" : undefined}
                data-feature-navigation={index}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{navigation.items[index] ?? slide.title}</strong>
              </button>
            ))}
          </nav>
          <Link className={styles.featureSliderSideAction} href={navigation.href}>
            {navigation.cta}
            <ArrowRight aria-hidden="true" />
          </Link>
        </aside>
      ) : null}
      {slider}
    </div>
  );
}

export function PropertyForm() {
  const [done, setDone] = useState(false);

  return (
    <section className={styles.formSection}>
      <div>
        <p className={styles.eyebrow}>PROPERTY INTRODUCTION</p>
        <h1>INTRODUCE THE SPACE.</h1>
        <p>
          Share the first facts needed for a fit conversation. In this local
          preview, nothing is transmitted or stored.
        </p>
      </div>
      {done ? (
        <div className={styles.confirmation}>
          <Check />
          <h2>YOUR PREVIEW IS COMPLETE.</h2>
          <p>
            No information has been sent. Continue to secure CRAYS onboarding
            when you are ready to create a real property relationship.
          </p>
          <Action href="/account/create/continue/real-estate">
            CONTINUE SECURELY
          </Action>
        </div>
      ) : (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            setDone(true);
          }}
        >
          <label>
            PROPERTY LOCATION
            <input
              required
              name="location"
              placeholder="City, address or asset reference"
            />
          </label>
          <div className={styles.formRow}>
            <label>
              APPROX. SIZE
              <input required name="size" placeholder="m²" inputMode="numeric" />
            </label>
            <label>
              CURRENT USE
              <select required defaultValue="">
                <option value="" disabled>
                  Select
                </option>
                <option>Retail</option>
                <option>Office</option>
                <option>Hospitality</option>
                <option>Leisure</option>
                <option>Vacant</option>
                <option>Other</option>
              </select>
            </label>
          </div>
          <label>
            WHAT SHOULD CRAYS KNOW?
            <textarea
              name="note"
              placeholder="Access, frontage, ceiling height, timing or other context"
            />
          </label>
          <button type="submit">
            REVIEW MY INTRODUCTION
            <ArrowRight />
          </button>
          <small>
            Prototype only — no upload, transmission or automated property
            score.
          </small>
        </form>
      )}
    </section>
  );
}
