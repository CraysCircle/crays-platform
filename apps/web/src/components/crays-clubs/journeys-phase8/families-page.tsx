import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Baby,
  BookOpen,
  Car,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Compass,
  Handshake,
  Hammer,
  HeartPulse,
  House,
  Laptop,
  Leaf,
  LockKeyhole,
  MessageCircleQuestion,
  PawPrint,
  Search,
  ShieldCheck,
  UtensilsCrossed,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { ClubsPublicShell } from "../public/clubs-public-shell";
import {
  CRAYS_FAMILY_LOCALES,
  familiesCopy,
  type CraysFamilyLocale,
} from "./families-copy";
import {
  getFamiliesMedia,
  type FamiliesMediaKey,
} from "./families-media";
import styles from "./families-page.module.css";
import { FamiliesScreenOne } from "./families-screen1";

type FamiliesPageProps = { locale: CraysFamilyLocale };
type MediaFigureProps = {
  className?: string;
  mediaKey: FamiliesMediaKey;
  priority?: boolean;
  sizes: string;
};

const proofIcons = [MessageCircleQuestion, Search, ShieldCheck] as const;
const mealIcons = [UserRound, Clock3, UsersRound, Leaf, HeartPulse, CircleDollarSign] as const;
const activityIcons = [Compass, Handshake, Hammer] as const;
const mealMediaKeys = [
  "mealProvider",
  "mealTimes",
  "mealPortions",
  "mealAllergens",
  "mealNeeds",
  "mealCosts",
] as const satisfies readonly FamiliesMediaKey[];
const dayStoryKeys = [
  "dayQuietFocus",
  "dayFamilyMovement",
  "dayLearningCircle",
] as const satisfies readonly FamiliesMediaKey[];
const processMediaKeys = [
  "processOnline",
  "processCampus",
  "processSession",
  "processOpportunity",
] as const satisfies readonly FamiliesMediaKey[];
const activityMediaKeys = [
  "activityExplore",
  "community",
  "activityCreate",
] as const satisfies readonly FamiliesMediaKey[];
const facilityIcons = [
  House,
  UtensilsCrossed,
  Car,
  UsersRound,
  BookOpen,
  Hammer,
  HeartPulse,
  Laptop,
  Activity,
  Baby,
  ShieldCheck,
  PawPrint,
] as const;

const referenceCopy = {
  hero: {
    eyebrow: "Family compass",
    title: "Bring the whole family question.",
    lead: "A clear route through accommodation, meals, learning questions and daily life around Forest City.",
    primaryCta: "Start with what matters",
    secondaryCta: "Ask CRAYS",
    boundary: "No booking, school place, childcare or availability promise.",
  },
  proof: [
    { title: "ASK", text: "Bring your question." },
    { title: "VERIFY", text: "We gather facts, not promises." },
    { title: "CONSENT", text: "You decide what’s shared." },
  ],
  proofTitle: "Ask, verify and consent",
  meals: ["Provider", "Times", "Portions", "Allergens", "Needs", "Costs"],
  mealsTitle: "Family service questions",
  day: [
    "Morning",
    "Nourish",
    "Focus",
    "Active",
    "Connect",
    "Project",
    "Family",
    "Wind-down",
    "Weekend",
    "Screen-light",
    "Local flow",
  ],
  dayBoundary: "Illustrative rhythm — not a timetable.",
  dayTitle: "A day, in rhythm.",
  dayMoments: "Family day moments",
  dropoff: {
    title: "Drop-off and unattended-time questions",
    answer: "Any drop-off or unattended time is not confirmed. Evidence is still needed.",
    checks: [
      "Who is accountable?",
      "Where does it take place?",
      "Who can drop off and collect?",
      "What identification is required?",
      "What safety and supervision standards apply?",
      "What happens in an emergency?",
    ],
  },
  process: ["Idea", "Review", "Owner", "Release"],
  processTitle: "From question to published information.",
  processIntro: "Four clear checks before any family information goes live.",
  processDescriptions: [
    "Share the family question.",
    "We check available evidence.",
    "A named source confirms.",
    "Only approved details go live.",
  ],
  activities: ["Explore", "Connect", "Create"],
  activitiesTitle: "Explore. Connect. Create.",
  community: [
    { title: "Accommodation", status: "owner" },
    { title: "Meals", status: "owner" },
    { title: "Community access", status: "owner" },
    { title: "Learning support", status: "pending" },
  ],
  facilities: [
    { title: "Accommodation", status: "confirm" },
    { title: "Meals", status: "owner" },
    { title: "Transport", status: "pending" },
    { title: "Community access", status: "owner" },
    { title: "Learning support", status: "pending" },
    { title: "Household support", status: "pending" },
    { title: "Health access", status: "pending" },
    { title: "Workspaces", status: "pending" },
    { title: "Wellness & fitness", status: "pending" },
    { title: "Child services", status: "pending" },
    { title: "Emergency support", status: "pending" },
    { title: "Pet support", status: "pending" },
  ],
  facilitiesTitle: "Family service status matrix",
  proofLock: {
    title: "Stories are locked until evidence is approved.",
    text: "We do not publish any story until all three are confirmed.",
    requirements: [
      "Full consent to publish",
      "Approved evidence",
      "Right to edit or withdraw",
    ],
  },
  finale: "Questions today. Clarity before decisions.",
} as const;

const statusLabels: Record<
  CraysFamilyLocale,
  {
    evidencePending: string;
    confirmFirst: string;
    notConfirmed: string;
    notPublished: string;
    ownerRequired: string;
    releaseRequired: string;
    verify: string;
  }
> = {
  en: {
    evidencePending: "Evidence pending",
    confirmFirst: "Confirm first",
    notConfirmed: "Not confirmed",
    notPublished: "Not published",
    ownerRequired: "Owner required",
    releaseRequired: "Release required",
    verify: "Verify first",
  },
  de: {
    evidencePending: "Nachweis ausstehend",
    confirmFirst: "Zuerst bestätigen",
    notConfirmed: "Nicht bestätigt",
    notPublished: "Nicht veröffentlicht",
    ownerRequired: "Verantwortung klären",
    releaseRequired: "Freigabe erforderlich",
    verify: "Zuerst prüfen",
  },
  es: {
    evidencePending: "Evidencia pendiente",
    confirmFirst: "Confirmar primero",
    notConfirmed: "No confirmado",
    notPublished: "No publicado",
    ownerRequired: "Responsable requerido",
    releaseRequired: "Publicación requerida",
    verify: "Verificar primero",
  },
  ca: {
    evidencePending: "Evidència pendent",
    confirmFirst: "Confirma primer",
    notConfirmed: "No confirmat",
    notPublished: "No publicat",
    ownerRequired: "Responsable requerit",
    releaseRequired: "Publicació requerida",
    verify: "Verifica primer",
  },
  fr: {
    evidencePending: "Preuve en attente",
    confirmFirst: "Confirmer d’abord",
    notConfirmed: "Non confirmé",
    notPublished: "Non publié",
    ownerRequired: "Responsable requis",
    releaseRequired: "Publication requise",
    verify: "À vérifier",
  },
  pt: {
    evidencePending: "Prova pendente",
    confirmFirst: "Confirmar primeiro",
    notConfirmed: "Não confirmado",
    notPublished: "Não publicado",
    ownerRequired: "Responsável necessário",
    releaseRequired: "Publicação necessária",
    verify: "Verificar primeiro",
  },
  it: {
    evidencePending: "Prova in attesa",
    confirmFirst: "Confermare prima",
    notConfirmed: "Non confermato",
    notPublished: "Non pubblicato",
    ownerRequired: "Responsabile richiesto",
    releaseRequired: "Pubblicazione richiesta",
    verify: "Verificare prima",
  },
};

function MediaFigure({
  className = "",
  mediaKey,
  priority = false,
  sizes,
}: MediaFigureProps) {
  const media = getFamiliesMedia(mediaKey);
  const style = {
    "--families-crop-desktop": media.desktopCrop,
    "--families-crop-mobile": media.mobileCrop,
  } as CSSProperties;

  return (
    <figure
      className={`${styles.mediaFigure} ${className}`}
      data-media-key={mediaKey}
      data-media-rights={media.rights}
      style={style}
    >
      <Image
        alt={media.altRole}
        fetchPriority={priority ? "high" : undefined}
        fill
        loading={priority ? "eager" : "lazy"}
        sizes={sizes}
        src={media.src}
        unoptimized
      />
    </figure>
  );
}

function TruthLine({ children }: { children: ReactNode }) {
  return (
    <div className={styles.truthLine}>
      <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.6} />
      <p>{children}</p>
    </div>
  );
}

function SectionMarker({ index, label }: { index: string; label: string }) {
  return (
    <div className={styles.sectionMarker}>
      <span>{index}</span>
      <i aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function FamiliesPage({ locale }: FamiliesPageProps) {
  if (locale === "en") {
    return <ClubsPublicShell availableLocales={CRAYS_FAMILY_LOCALES} locale={locale}><FamiliesScreenOne /></ClubsPublicShell>;
  }
  const copy = familiesCopy[locale];
  const labels = statusLabels[locale];
  const renderedCopy = ["en"].includes(locale) ? referenceCopy : {
    hero: {
      eyebrow: copy.hero.eyebrow,
      title: copy.hero.title,
      lead: copy.hero.lead,
      primaryCta: copy.hero.primaryCta,
      secondaryCta: copy.hero.secondaryCta,
      boundary: copy.hero.boundary,
    },
    proof: copy.proof.items.map(({ title, text }) => ({ title, text })),
    proofTitle: copy.proof.title,
    meals: copy.meals.items.map(({ title }) => title),
    mealsTitle: copy.meals.title,
    day: copy.day.items.map(({ title }) => title),
    dayBoundary: copy.day.boundary,
    dayTitle: copy.day.title,
    dayMoments: copy.day.eyebrow,
    dropoff: {
      title: copy.dropoff.title,
      answer: copy.dropoff.answer,
      checks: copy.dropoff.checks,
    },
    process: copy.events.items.map(({ title }) => title),
    processTitle: copy.events.title,
    processIntro: copy.events.intro,
    processDescriptions: copy.events.items.map(({ text }) => text),
    activities: copy.familyActivities.items.map(({ title }) => title),
    activitiesTitle: copy.familyActivities.title,
    community: [
      { title: copy.facilities.items[0].title, status: "owner" },
      { title: copy.facilities.items[1].title, status: "owner" },
      { title: copy.facilities.items[4].title, status: "owner" },
      { title: copy.facilities.items[11].title, status: "pending" },
    ],
    facilities: copy.facilities.items.map(({ title }, index) => ({
      title,
      status: index === 0 ? "confirm" : index < 4 ? "owner" : "pending",
    })),
    facilitiesTitle: copy.facilities.title,
    proofLock: {
      title: copy.socialProof.statusTitle,
      text: copy.socialProof.statusText,
      requirements: copy.socialProof.requirements,
    },
    finale: copy.socialProof.title,
  };

  return (
    <ClubsPublicShell
      availableLocales={CRAYS_FAMILY_LOCALES}
      locale={locale}
    >
      <main className={styles.page} id="families-main">
        <section className={styles.hero}>
          <div className={styles.heroPanel}>
            <SectionMarker index="1" label={renderedCopy.hero.eyebrow} />
            <h1>{renderedCopy.hero.title}</h1>
            <p className={styles.heroLead}>{renderedCopy.hero.lead}</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href="#family-proof">
                <span>{renderedCopy.hero.primaryCta}</span>
                <ArrowDown aria-hidden="true" size={17} strokeWidth={1.7} />
              </a>
              <Link className={styles.secondaryAction} href={`/${locale}/contact`}>
                <span>{renderedCopy.hero.secondaryCta}</span>
                <ArrowRight aria-hidden="true" size={17} strokeWidth={1.7} />
              </Link>
            </div>
            <TruthLine>{renderedCopy.hero.boundary}</TruthLine>
          </div>

          <MediaFigure
            className={styles.heroMedia}
            mediaKey="hero"
            priority
            sizes="(max-width: 679px) 100vw, 60vw"
          />
        </section>

        <section aria-labelledby="proof-title" className={styles.proof} id="family-proof">
          <div className={styles.proofPanel}>
            <SectionMarker index="2" label="" />
            <h2 className={styles.visuallyHidden} id="proof-title">{renderedCopy.proofTitle}</h2>
            <ol className={styles.proofSteps}>
              {renderedCopy.proof.map((item, index) => {
                const Icon = proofIcons[index];
                return (
                  <li key={item.title}>
                    <Icon aria-hidden="true" size={24} strokeWidth={1.35} />
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
          <MediaFigure
            className={styles.proofMedia}
            mediaKey="proof"
            sizes="(max-width: 679px) 100vw, 58vw"
          />
        </section>

        <section aria-labelledby="meals-title" className={styles.meals}>
          <SectionMarker index="3" label="" />
          <h2 className={styles.visuallyHidden} id="meals-title">{renderedCopy.mealsTitle}</h2>
          <div className={styles.mealGrid}>
            {renderedCopy.meals.map((item, index) => {
              const Icon = mealIcons[index];
              const ownerRequired = index < renderedCopy.meals.length - 1;
              return (
                <article key={item}>
                  <MediaFigure
                    className={styles.mealMedia}
                    mediaKey={mealMediaKeys[index]}
                    sizes="(max-width: 679px) 50vw, (max-width: 820px) 33vw, 17vw"
                  />
                  <div className={styles.mealMeta}>
                    <Icon aria-hidden="true" size={31} strokeWidth={1.3} />
                    <h3>{item}</h3>
                    <span
                      aria-label={ownerRequired ? labels.ownerRequired : labels.notPublished}
                      className={ownerRequired ? styles.ownerCheck : styles.pending}
                      role="img"
                    >
                      {ownerRequired ? <Check aria-hidden="true" size={10} strokeWidth={2.4} /> : null}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="day-title" className={styles.day}>
          <MediaFigure className={styles.dayMedia} mediaKey="day" priority sizes="100vw" />
          <div className={styles.dayShade} />
          <div className={styles.dayContent}>
            <SectionMarker index="4" label="" />
            <h2 id="day-title">{renderedCopy.dayTitle}</h2>
            <p className={styles.dayBoundary}>{renderedCopy.dayBoundary}</p>
            <ol className={styles.dayRail}>
              {renderedCopy.day.map((item, index) => (
                <li key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{item}</h3>
                </li>
              ))}
            </ol>
            <div className={styles.dayStories} aria-label={renderedCopy.dayMoments}>
              {dayStoryKeys.map((mediaKey) => (
                <MediaFigure
                  className={styles.dayStoryMedia}
                  key={mediaKey}
                  mediaKey={mediaKey}
                  sizes="(max-width: 679px) 88vw, (max-width: 1199px) 30vw, 25vw"
                />
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="dropoff-title" className={styles.dropoff}>
          <div className={styles.dropoffLead}>
            <SectionMarker index="5" label="" />
            <h2 className={styles.visuallyHidden} id="dropoff-title">{renderedCopy.dropoff.title}</h2>
            <strong>
              <LockKeyhole aria-hidden="true" size={20} strokeWidth={1.7} />
              {labels.notConfirmed}
            </strong>
            <p>{renderedCopy.dropoff.answer}</p>
          </div>
          <div className={styles.dropoffChecks}>
            {renderedCopy.dropoff.checks.map((check, index) => (
              <details key={check}>
                <summary>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <b>{check}</b>
                  <ChevronDown aria-hidden="true" size={18} strokeWidth={1.5} />
                </summary>
                <p>{copy.dropoff.status}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="events-title" className={styles.events}>
          <SectionMarker index="6" label="" />
          <h2 className={styles.eventsTitle} id="events-title">{renderedCopy.processTitle}</h2>
          <p className={styles.eventsIntro}>{renderedCopy.processIntro}</p>
          <ol className={styles.eventSteps}>
            {renderedCopy.process.map((item, index) => {
              return (
                <li key={item}>
                  <MediaFigure
                    className={styles.eventMedia}
                    mediaKey={processMediaKeys[index]}
                    sizes="(max-width: 679px) 100vw, (max-width: 820px) 50vw, 25vw"
                  />
                  <div className={styles.eventLabel}>
                    <h3>{item}</h3>
                    <p>{renderedCopy.processDescriptions[index]}</p>
                  </div>
                  {index < renderedCopy.process.length - 1 ? (
                    <ArrowRight className={styles.eventArrow} aria-hidden="true" size={24} strokeWidth={1.25} />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="experience-title" className={styles.experience}>
          <div className={styles.experienceHead}>
            <SectionMarker index="7" label="" />
            <h2 className={styles.experienceTitle} id="experience-title">{renderedCopy.activitiesTitle}</h2>
            <div className={styles.activityRail}>
              {renderedCopy.activities.map((item, index) => {
                const Icon = activityIcons[index];
                return (
                  <article key={item}>
                    <MediaFigure
                      className={styles.activityMedia}
                      mediaKey={activityMediaKeys[index]}
                      sizes="(max-width: 679px) 100vw, 33vw"
                    />
                    <div className={styles.activityShade} />
                    <div className={styles.activityLabel}>
                      <Icon aria-hidden="true" size={23} strokeWidth={1.4} />
                      <h3>{item}</h3>
                      <ArrowRight aria-hidden="true" size={20} strokeWidth={1.5} />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          <div className={styles.experienceDetail}>
            <MediaFigure
              className={styles.familyHomeMedia}
              mediaKey="familyHome"
              sizes="(max-width: 679px) 100vw, 54vw"
            />
            <div className={styles.experiencePanel}>
              <ul className={styles.communityList}>
                {renderedCopy.community.map((item) => (
                  <li key={item.title}>
                    <span className={item.status === "owner" ? styles.owner : styles.pending} aria-hidden="true" />
                    <p>{item.title}</p>
                    <b>{item.status === "owner" ? labels.ownerRequired : labels.notPublished}</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="facilities-title" className={styles.facilities}>
          <SectionMarker index="8" label="" />
          <h2 className={styles.visuallyHidden} id="facilities-title">{renderedCopy.facilitiesTitle}</h2>
          <div className={styles.facilityGrid}>
            {renderedCopy.facilities.map((item, index) => {
              const Icon = facilityIcons[index];
              const statusLabel = item.status === "owner"
                ? labels.ownerRequired
                : item.status === "confirm"
                  ? labels.confirmFirst
                  : labels.notPublished;
              return (
                <article key={item.title}>
                  <Icon aria-hidden="true" size={27} strokeWidth={1.3} />
                  <h3>{item.title}</h3>
                  <span className={styles.visuallyHidden}>{statusLabel}</span>
                  <span className={styles[item.status]} aria-hidden="true" />
                </article>
              );
            })}
          </div>
          <div className={styles.statusLegend}>
            <span><i className={styles.owner} />{labels.ownerRequired}</span>
            <span><i className={styles.pending} />{labels.notPublished}</span>
            <span><i className={styles.confirm} />{labels.confirmFirst}</span>
          </div>
        </section>

        <section aria-labelledby="social-title" className={styles.socialProof}>
          <div className={styles.socialLock}>
            <LockKeyhole aria-hidden="true" size={44} strokeWidth={1.15} />
            <p>{renderedCopy.proofLock.title}</p>
          </div>
          <div className={styles.socialCopy}>
            <SectionMarker index="9" label="" />
            <h2 id="social-title">{renderedCopy.proofLock.text}</h2>
            <ul>
              {renderedCopy.proofLock.requirements.map((requirement) => (
                <li key={requirement}>
                  <Check aria-hidden="true" size={16} strokeWidth={1.7} />
                  <span>{requirement}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="finale-title" className={styles.finale}>
          <MediaFigure className={styles.finaleMedia} mediaKey="finale" sizes="100vw" />
          <div className={styles.finaleShade} />
          <div className={styles.finalePanel}>
            <SectionMarker index="10" label="" />
            <h2 id="finale-title">{renderedCopy.finale}</h2>
            <div className={styles.finaleActions}>
              <a className={styles.primaryAction} href="#family-proof">
                <span>{renderedCopy.hero.primaryCta}</span>
                <ArrowDown aria-hidden="true" size={17} strokeWidth={1.7} />
              </a>
              <Link className={styles.secondaryAction} href={`/${locale}/contact`}>
                <span>{renderedCopy.hero.secondaryCta}</span>
                <ArrowRight aria-hidden="true" size={17} strokeWidth={1.7} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </ClubsPublicShell>
  );
}
