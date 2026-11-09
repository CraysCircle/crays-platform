"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEventHandler,
} from "react";
import {
  Anchor,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleUserRound,
  Coffee,
  Compass,
  DoorOpen,
  Handshake,
  Heart,
  Landmark,
  Layers3,
  MapPin,
  MonitorSmartphone,
  UsersRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  hospitalityCopy,
  hospitalityLocales,
  type HospitalityLocale,
} from "../journeys-phase8/hospitality-copy";
import { ClubsPublicShell } from "./clubs-public-shell";
import {
  hospitalityMediaV1,
  type HospitalityMediaAsset,
} from "./clubs-hospitality-media-v1";
import styles from "./clubs-hospitality-page.module.css";

const proofIcons = [Anchor, Coffee, CircleUserRound, Layers3] as const;
const engineIcons = [
  Building2,
  UsersRound,
  MonitorSmartphone,
  Handshake,
] as const;
const operatorIcons = [WalletCards, UsersRound, BarChart3, Landmark] as const;
const digitalIcons = [
  UsersRound,
  MonitorSmartphone,
  Handshake,
  CalendarDays,
  WalletCards,
  MapPin,
] as const;
const journeyFeatureIcons = [BadgeCheck, Compass, DoorOpen, Heart] as const;

const hostedChapterEnglish = {
  eyebrow: "The hosted chapter",
  title: "One day, beautifully connected.",
  body: "Members move through layered places and moments. People welcome, technology adapts, communities form and every detail feels intentionally effortless.",
  items: [
    {
      label: "01",
      title: "Urban club layer",
      body: "Your day begins with welcome and belonging.",
    },
    {
      label: "02",
      title: "Events and creators",
      body: "Moments that bring people and ideas together.",
    },
    {
      label: "03",
      title: "Travel lifestyle",
      body: "Places that extend the same membership feeling.",
    },
  ],
} as const;

const journeyFeaturesEnglish = [
  [
    "Seamless arrival and recognition",
    "Local orientation and guidance",
    "Smart access to clubs and venues",
    "A first moment that sets the tone",
  ],
  [
    "Warm introductions to people and place",
    "Tables and moments coordinated for you",
    "Shared interests surfaced naturally",
    "Hosted encounters that build rapport",
  ],
  [
    "Context-aware access throughout the day",
    "Workspaces, lounges and services ready",
    "Preferences remembered without friction",
    "Calm human support when it matters",
  ],
  [
    "One clear path across every booking",
    "Tickets, services and retail connected",
    "Secure settlement in the background",
    "Receipts and history kept in one place",
  ],
  [
    "Recognition continues across locations",
    "Recommendations grow more relevant",
    "Invitations follow interests and rhythm",
    "Every return feels personally familiar",
  ],
] as const;

const behindWelcomeEnglish = {
  eyebrow: "Behind the welcome",
  body: "For operators, owners and brand partners, Crays designs for people first. Our digital layer works quietly so every hosted moment feels effortless.",
  guestLabel: "Guest experience",
  operatingLabel: "Operating layer",
  capabilitiesLabel: "Six capabilities that work quietly",
} as const;

const promiseEnglish = {
  eyebrow: "The afterglow",
  body: "When hospitality, community, access, technology and contribution work together, the day feels complete and the connection stays with you.",
} as const;

const capabilitiesEnglish = [
  {
    title: "People",
    body: "Hosts, founders, travelers, creators and local partners.",
  },
  {
    title: "Technology",
    body: "Profiles, bookings, access, payments and AI that work in the background.",
  },
  {
    title: "Participation",
    body: "Partner models that turn engagement into structured value.",
  },
  {
    title: "Booking layer",
    body: "Villas, stays, events and services in one flow.",
  },
  {
    title: "Payments",
    body: "Cards, receipts, tips, subscriptions and direct settlement.",
  },
  {
    title: "Venue layer",
    body: "Context for better hospitality before the guest arrives.",
  },
] as const;

function moveTabFocus(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  current: number,
  count: number,
  idPrefix: string,
  setIndex: (value: number) => void,
) {
  let next = current;

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    next = (current + 1) % count;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    next = (current - 1 + count) % count;
  } else if (event.key === "Home") {
    next = 0;
  } else if (event.key === "End") {
    next = count - 1;
  } else {
    return;
  }

  event.preventDefault();
  setIndex(next);
  document.getElementById(`${idPrefix}-tab-${next}`)?.focus();
}

function Photo({
  asset,
  priority = false,
  sizes,
}: {
  asset: HospitalityMediaAsset;
  priority?: boolean;
  sizes: string;
}) {
  return (
    <span className={styles.photo} data-crays-photo>
      <Image
        alt={asset.alt}
        fill
        priority={priority}
        sizes={sizes}
        src={asset.src}
        style={{ objectPosition: asset.crop }}
      />
    </span>
  );
}

function IconItem({
  Icon,
  label,
  title,
  body,
}: {
  Icon: LucideIcon;
  label?: string;
  title: string;
  body: string;
}) {
  return (
    <article>
      <Icon aria-hidden="true" size={25} strokeWidth={1.55} />
      {label ? <span>{label}</span> : null}
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function ActionLink({
  children,
  href,
  onClick,
  secondary = false,
  external = false,
}: {
  children: string;
  href: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  secondary?: boolean;
  external?: boolean;
}) {
  const className = secondary ? styles.secondaryButton : styles.primaryButton;
  const content = (
    <>
      {children}
      <ArrowRight aria-hidden="true" size={18} strokeWidth={1.7} />
    </>
  );

  if (href.startsWith("http")) {
    return (
      <a
        className={className}
        href={href}
        onClick={onClick}
        rel={external ? "noreferrer noopener" : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <Link className={className} href={href} onClick={onClick}>
      {content}
    </Link>
  );
}

const upper = (value: string) => value.toUpperCase();

export function ClubsHospitalityPage({ locale }: { locale: HospitalityLocale }) {
  const safe = hospitalityLocales.includes(locale) ? locale : "en";
  const copy = hospitalityCopy[safe];
  const [cultureIndex, setCultureIndex] = useState(0);
  const [journeyIndex, setJourneyIndex] = useState(0);
  const [welcomeMode, setWelcomeMode] = useState<"operator" | "digital">(
    "operator",
  );
  const [operatorIndex, setOperatorIndex] = useState(-1);
  const [digitalIndex, setDigitalIndex] = useState(0);
  const [modelOpen, setModelOpen] = useState(false);
  const modelDialogRef = useRef<HTMLDialogElement>(null);
  const cultureMedia = [
    hospitalityMediaV1.cultureHostedDinner,
    hospitalityMediaV1.cultureInterior,
    hospitalityMediaV1.cultureTravel,
  ] as const;
  const journeyMedia = [
    hospitalityMediaV1.journeyArrive,
    hospitalityMediaV1.journeyMeet,
    hospitalityMediaV1.journeyUse,
    hospitalityMediaV1.journeyPay,
    hospitalityMediaV1.journeyReturn,
  ] as const;
  const hostedChapter =
    safe === "en"
      ? hostedChapterEnglish
      : {
          eyebrow: copy.culture.title,
          title: copy.culture.lead,
          body: copy.culture.body,
          items: copy.culture.items,
        };
  const journeyEyebrow =
    safe === "en" ? "A stay in five moments" : copy.guestFlow.title;
  const journeyFeatures =
    safe === "en"
      ? journeyFeaturesEnglish
      : copy.guestFlow.items.map((item) => [
          item.body,
          copy.journey.lead,
          copy.hero.body,
          copy.promise.body,
        ]);
  const behindWelcome =
    safe === "en"
      ? behindWelcomeEnglish
      : {
          eyebrow: copy.operator.title,
          body: copy.operator.body,
          guestLabel: copy.guestFlow.title,
          operatingLabel: copy.digital.title,
          capabilitiesLabel: copy.digital.lead,
        };
  const capabilities = safe === "en" ? capabilitiesEnglish : copy.digital.items;
  const welcomeDisclosures =
    welcomeMode === "operator"
      ? copy.operator.items
      : copy.digital.items.slice(0, 4);
  const welcomeHeading =
    welcomeMode === "operator" ? copy.operator.lead : copy.digital.lead;
  const welcomeBody =
    welcomeMode === "operator" ? behindWelcome.body : copy.digital.body;

  const selectWelcomeMode = (mode: "operator" | "digital") => {
    setWelcomeMode(mode);
    setOperatorIndex(-1);
  };

  useEffect(() => {
    const dialog = modelDialogRef.current;

    if (!dialog) return;
    if (modelOpen && !dialog.open) dialog.showModal();
    if (!modelOpen && dialog.open) dialog.close();
  }, [modelOpen]);

  return (
    <div className={styles.hospitalityFrame}>
    <ClubsPublicShell
      availableLocales={hospitalityLocales}
      headerTone="navy"
      locale={safe}
    >
      <main className={styles.page} id="hospitality-main">
        <section className={styles.hero} aria-labelledby="hospitality-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{upper(copy.hero.eyebrow)}</p>
            <h1 id="hospitality-title">{copy.hero.title}</h1>
            <p className={styles.heroLead}>{copy.hero.body}</p>
            <div className={styles.heroActions}>
              <ActionLink
                external
                href="https://www.craysclub.com/en/brand-as-a-service"
              >
                {copy.hero.alliance}
              </ActionLink>
              <button
                className={styles.secondaryButton}
                onClick={() => setModelOpen(true)}
                type="button"
              >
                {copy.hero.model}
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.7} />
              </button>
            </div>
          <div className={styles.journeyNote}>
            <span aria-hidden="true" />
            <div>
              <strong>{copy.journey.title}</strong>
              <p>{copy.journey.lead}</p>
            </div>
          </div>
          </div>

          <div
            className={styles.heroLedger}
            aria-label="CRAYS Hospitality places"
          >
            <span className={styles.ledgerLine} aria-hidden="true" />
            <figure className={styles.heroSunset}>
              <Photo
                asset={hospitalityMediaV1.heroSunset}
                priority
                sizes="(max-width: 820px) 78vw, 35vw"
              />
            </figure>
            <figure className={styles.heroSuite}>
              <Photo
                asset={hospitalityMediaV1.heroSuite}
                priority
                sizes="(max-width: 820px) 72vw, 31vw"
              />
            </figure>
            <figure className={styles.heroPool}>
              <Photo
                asset={hospitalityMediaV1.heroPool}
                priority
                sizes="(max-width: 820px) 76vw, 32vw"
              />
            </figure>
          </div>


        </section>

        <dialog
          aria-labelledby="hospitality-engine-title"
          className={styles.modelDialog}
          id="hosp-ci-engine"
          onCancel={() => setModelOpen(false)}
          onClose={() => setModelOpen(false)}
          ref={modelDialogRef}
        >
          <button
            aria-label="Close hospitality model"
            autoFocus
            className={styles.modelClose}
            onClick={() => setModelOpen(false)}
            type="button"
          >
            <X aria-hidden="true" size={22} strokeWidth={1.5} />
          </button>
          <div className={styles.modelDialogBody}>
            <header className={styles.modelIntro}>
              <div>
                <p className={styles.eyebrow}>{upper(copy.engine.eyebrow)}</p>
                <h2 id="hospitality-engine-title">{copy.engine.title}</h2>
              </div>
              <p>{copy.engine.body}</p>
            </header>
            <figure className={styles.modelImage}>
              <Photo
                asset={hospitalityMediaV1.engineTower}
                sizes="(max-width: 820px) 100vw, 48vw"
              />
            </figure>
            <div className={styles.modelEngineGrid}>
              {copy.engine.items.map((item, index) => (
                <IconItem
                  Icon={engineIcons[index]}
                  body={item.body}
                  key={item.title}
                  title={item.title}
                />
              ))}
            </div>
            <section className={styles.modelJourney}>
              <header>
                <p className={styles.eyebrow}>{upper(copy.journey.title)}</p>
                <p>{copy.journey.lead}</p>
              </header>
              <div>
                {copy.journey.items.map((item, index) => (
                  <IconItem
                    Icon={proofIcons[index]}
                    body={item.body}
                    key={item.title}
                    label={upper(item.label ?? "")}
                    title={item.title}
                  />
                ))}
              </div>
            </section>
          </div>
        </dialog>

        <section
          className={styles.hostedChapter}
          aria-labelledby="hospitality-culture-title"
        >
          <div className={styles.chapterCopy}>
            <div className={styles.chapterIntro}>
            <p className={styles.eyebrow}>{upper(hostedChapter.eyebrow)}</p>
            <h2 id="hospitality-culture-title">{hostedChapter.title}</h2>
            <p className={styles.chapterLead}>{hostedChapter.body}</p>
            </div>
            <div
              className={styles.chapterIndex}
              role="tablist"
              aria-label={hostedChapter.eyebrow}
            >
              {hostedChapter.items.map((item, index) => {
                const active = cultureIndex === index;

                return (
                  <button
                    aria-controls="hospitality-culture-panel"
                    aria-selected={active}
                    className={active ? styles.activeChapterTab : undefined}
                    id={`culture-tab-${index}`}
                    key={item.title}
                    onClick={() => setCultureIndex(index)}
                    onKeyDown={(event) =>
                      moveTabFocus(
                        event,
                        index,
                        hostedChapter.items.length,
                        "culture",
                        setCultureIndex,
                      )
                    }
                    role="tab"
                    tabIndex={active ? 0 : -1}
                    type="button"
                  >
                    <span className={styles.chapterPreview}><Photo asset={cultureMedia[index]} sizes="(max-width: 760px) 90vw, 40vw" /></span>
                    <span className={styles.chapterTabCopy}>
                      <strong>{item.title}</strong>
                      <span>{item.body}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <figure
            aria-labelledby={`culture-tab-${cultureIndex}`}
            className={styles.chapterImage}
            id="hospitality-culture-panel"
            role="tabpanel"
          >
            <Photo
              asset={cultureMedia[cultureIndex]}
              key={cultureMedia[cultureIndex].id}
              sizes="(max-width: 820px) 100vw, 62vw"
            />
          </figure>
        </section>

        <section
          className={styles.journeyStory}
          aria-labelledby="hospitality-flow-title"
        >
          <header>
            <p className={styles.eyebrow}>{upper(journeyEyebrow)}</p>
            <h2 id="hospitality-flow-title">{copy.guestFlow.lead}</h2>
            <p className={styles.journeySummary}>{copy.guestFlow.body}</p>
            <p className={styles.journeyHint}>{{"en":"Choose a moment to explore.","de":"Wähle einen Moment und entdecke die Details.","fr":"Choisissez un moment pour découvrir les détails.","es":"Elige un momento para descubrir los detalles.","it":"Scegli un momento per scoprirne i dettagli.","pt":"Escolha um momento para explorar os detalhes.","ca":"Tria un moment per descobrir-ne els detalls."}[safe]}</p>
          </header>
          <div
            aria-label={copy.guestFlow.title}
            className={styles.journeyRail}
            role="tablist"
          >
            {copy.guestFlow.items.map((item, index) => {
              const active = journeyIndex === index;

              return (
                <button
                  aria-controls="hospitality-journey-panel"
                  aria-selected={active}
                  className={active ? styles.activeJourneyTab : undefined}
                  id={`journey-tab-${index}`}
                  key={item.title}
                  onClick={() => setJourneyIndex(index)}
                  onKeyDown={(event) =>
                    moveTabFocus(
                      event,
                      index,
                      copy.guestFlow.items.length,
                      "journey",
                      setJourneyIndex,
                    )
                  }
                  role="tab"
                  tabIndex={active ? 0 : -1}
                  type="button"
                >
                  
                  <strong>{item.title}</strong>
                  <ArrowRight aria-hidden="true" size={16} strokeWidth={1.7} />
                </button>
              );
            })}
          </div>
          <div
            aria-labelledby={`journey-tab-${journeyIndex}`}
            className={styles.journeyPanel}
            id="hospitality-journey-panel"
            role="tabpanel"
          >
            <figure className={styles.journeyImage}>
              <Photo
                asset={journeyMedia[journeyIndex]}
                key={journeyMedia[journeyIndex].id}
                sizes="(max-width: 820px) 100vw, 58vw"
              />
            </figure>
            <div className={styles.journeyPanelCopy}>
              {(() => {
                const item = copy.guestFlow.items[journeyIndex];

                return (
                  <>
                    
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                    <ul className={styles.journeyFeatures}>
                      {journeyFeatures[journeyIndex].map((feature, index) => {
                        const Icon = journeyFeatureIcons[index];

                        return (
                          <li key={feature}>
                            <Icon aria-hidden="true" size={23} strokeWidth={1.45} />
                            <span>{feature}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                );
              })()}
            </div>
          </div>
        </section>

        <section
          className={styles.behindWelcome}
          aria-labelledby="hospitality-welcome-title"
        >
          <div
            aria-labelledby={`welcome-mode-tab-${welcomeMode === "operator" ? 0 : 1}`}
            className={styles.welcomePanel}
            id="hospitality-welcome-panel"
            role="tabpanel"
          >
            <div className={styles.welcomeIntro} key={`intro-${welcomeMode}`}>
              <p className={styles.eyebrow}>{upper(behindWelcome.eyebrow)}</p>
              <h2 id="hospitality-welcome-title">{welcomeHeading}</h2>
              <p aria-live="polite">{welcomeBody}</p>
              <div
                aria-label="Hospitality layers"
                className={styles.welcomeModeTabs}
                role="tablist"
              >
                <button
                  aria-controls="hospitality-welcome-panel"
                  aria-selected={welcomeMode === "operator"}
                  className={welcomeMode === "operator" ? styles.activeModeTab : undefined}
                  id="welcome-mode-tab-0"
                  onClick={() => selectWelcomeMode("operator")}
                  onKeyDown={(event) =>
                    moveTabFocus(event, 0, 2, "welcome-mode", (value) =>
                      selectWelcomeMode(value === 0 ? "operator" : "digital"),
                    )
                  }
                  role="tab"
                  tabIndex={welcomeMode === "operator" ? 0 : -1}
                  type="button"
                >
                  {behindWelcome.guestLabel}
                </button>
                <button
                  aria-controls="hospitality-welcome-panel"
                  aria-selected={welcomeMode === "digital"}
                  className={welcomeMode === "digital" ? styles.activeModeTab : undefined}
                  id="welcome-mode-tab-1"
                  onClick={() => selectWelcomeMode("digital")}
                  onKeyDown={(event) =>
                    moveTabFocus(event, 1, 2, "welcome-mode", (value) =>
                      selectWelcomeMode(value === 0 ? "operator" : "digital"),
                    )
                  }
                  role="tab"
                  tabIndex={welcomeMode === "digital" ? 0 : -1}
                  type="button"
                >
                  {behindWelcome.operatingLabel}
                </button>
              </div>
            </div>
            <figure className={styles.welcomeImage}>
              <Photo
                asset={
                  welcomeMode === "operator"
                    ? hospitalityMediaV1.operatorConversation
                    : hospitalityMediaV1.digitalIntelligence
                }
                key={welcomeMode}
                sizes="(max-width: 820px) 100vw, 42vw"
              />
            </figure>
            <div
              aria-label={
                welcomeMode === "operator" ? copy.operator.title : copy.digital.title
              }
              className={styles.welcomeDisclosure}
            >
              {welcomeDisclosures.map((item, index) => {
                const Icon = operatorIcons[index];
                const active = operatorIndex === index;
                const panelId = `welcome-disclosure-panel-${welcomeMode}-${index}`;
                const triggerId = `welcome-disclosure-trigger-${welcomeMode}-${index}`;

                return (
                  <div className={styles.disclosureItem} key={`${welcomeMode}-${item.title}`}>
                    <button
                      aria-controls={panelId}
                      aria-expanded={active}
                      className={active ? styles.activeDisclosure : undefined}
                      id={triggerId}
                      onClick={() => setOperatorIndex(active ? -1 : index)}
                      type="button"
                    >
                      <Icon aria-hidden="true" size={25} strokeWidth={1.45} />
                      <span className={styles.disclosureCopy}>
                        <strong>{item.title}</strong>
                      </span>
                      <ChevronDown aria-hidden="true" size={18} strokeWidth={1.5} />
                    </button>
                    <div
                      className={styles.disclosurePanel}
                      hidden={!active}
                      id={panelId}
                      aria-labelledby={triggerId}
                      role="region"
                    >
                      <p>{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.digitalCapabilities}>
            <p className={styles.capabilityLabel}>
              {upper(behindWelcome.capabilitiesLabel)}
              <ChevronDown aria-hidden="true" size={16} strokeWidth={1.6} />
            </p>
            <div
              aria-label={copy.digital.title}
              className={styles.capabilityTabs}
            >
              {capabilities.map((item, index) => {
                const Icon = digitalIcons[index];
                const active = welcomeMode === "digital" && digitalIndex === index;

                return (
                  <button
                    aria-pressed={active}
                    className={active ? styles.activeCapability : undefined}
                    key={item.title}
                    onClick={() => {
                      selectWelcomeMode("digital");
                      setDigitalIndex(index);
                    }}
                    type="button"
                  >
                    <Icon aria-hidden="true" size={27} strokeWidth={1.45} />
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className={styles.promise}
          aria-labelledby="hospitality-promise-title"
        >
          <Photo asset={hospitalityMediaV1.promiseAfterglow} sizes="100vw" />
          <div>
            <p className={styles.eyebrow}>
              {upper(safe === "en" ? promiseEnglish.eyebrow : copy.promise.title)}
            </p>
            <h2 id="hospitality-promise-title">{copy.promise.lead}</h2>
            <p>{safe === "en" ? promiseEnglish.body : copy.promise.body}</p>
            <nav aria-label={copy.promise.title}>
              <ActionLink external href="https://www.crays.org/new-projects/">
                {safe === "en" ? "Start Hosted Intake" : copy.promise.intake}
              </ActionLink>
              <ActionLink href="https://www.craysclub.com/en/contact" secondary>
                {copy.promise.talk}
              </ActionLink>
            </nav>
          </div>
        </section>
      </main>
    </ClubsPublicShell>
    </div>
  );
}
