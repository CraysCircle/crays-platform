"use client";

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck2,
  ChevronDown,
  CircleUserRound,
  Clock3,
  Compass,
  FileCheck2,
  MapPin,
  Minus,
  Plus,
  Presentation,
  SearchCheck,
  ShieldCheck,
  UsersRound,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ClubsPublicShell } from "../public/clubs-public-shell";
import {
  portfolioCompaniesCopy,
  portfolioLocales,
  type PortfolioLocale,
} from "./portfolio-companies-content";
import {
  portfolioCompaniesMedia,
  type PortfolioMediaKey,
} from "./portfolio-companies-media-registry";
import styles from "./portfolio-companies-page.module.css";

type Props = { locale: PortfolioLocale };

type StateCopy = {
  factsConfirmed: string;
  noEvidence: string;
  unavailable: string;
  viewSchedule: string;
  hideSchedule: string;
  discussFormat: string;
  workspace: string;
  meetingRooms: string;
  productionStudio: string;
  communitySessions: string;
  localGuidance: string;
  profileTitle: string;
  profileBody: string;
  profileAction: string;
  seeParticipation: string;
  heroTitleLines?: readonly string[];
  heroSteps: readonly string[];
  settings: readonly string[];
  settingLabel?: string;
  evidenceBodies?: readonly string[];
  routeLabels?: readonly string[];
  storyMeta?: readonly string[];
  verifiedTitle: string;
  verifiedBody: string;
  controlTitle: string;
  controlBody: string;
  manageVisibility: string;
  published: string;
  pending: string;
  private: string;
  recordStatuses?: readonly string[];
  mobileRecordTitle?: string;
  mobileRecordLead?: string;
};

const stateCopy: Record<PortfolioLocale, StateCopy> = {
  en: {
    factsConfirmed: "Example format",
    noEvidence: "No evidence yet",
    unavailable: "Company detail unavailable",
    viewSchedule: "View example formats",
    hideSchedule: "Show less",
    discussFormat: "Discuss a format",
    workspace: "Workspaces",
    meetingRooms: "Meeting rooms",
    productionStudio: "Production studio",
    communitySessions: "Community sessions",
    localGuidance: "Local guidance",
    profileTitle: "Company profile preview",
    profileBody:
      "A profile becomes available only after identity, facts and publication consent are confirmed.",
    profileAction: "Profile unavailable",
    seeParticipation: "See how participation works",
    heroTitleLines: ["A working network,", "grounded in", "Forest City."],
    heroSteps: ["Purpose", "People", "Place", "Working context"],
    settings: [
      "Quiet",
      "Collaborative",
      "Creative",
      "Mixed",
      "Indoor",
      "Outdoor",
      "Hybrid",
      "Flexible",
    ],
    settingLabel: "Desired setting",
    evidenceBodies: [
      "Required before publication.",
      "Reviewed only with your company.",
      "Agreed before a format is presented.",
      "Nothing is shared without consent.",
    ],
    routeLabels: [
      "Context",
      "Stories",
      "Ways to take part",
      "Programme & people",
      "What we provide",
      "Company record",
      "Start a conversation",
    ],
    storyMeta: [
      "Preview · Focused format",
      "Preview · Weekly format",
      "Preview · Sprint format",
      "Preview · Extended format",
    ],
    verifiedTitle: "Verification required",
    verifiedBody: "This preview does not confirm any company or participant.",
    controlTitle: "You control what we share",
    controlBody: "Choose what appears in your approved company profile.",
    manageVisibility: "Manage visibility",
    published: "Published",
    pending: "Pending review",
    private: "Not shared",
    recordStatuses: [
      "Not published",
      "Not published",
      "Company detail unavailable",
      "Company detail unavailable",
      "Not published",
      "No record yet",
    ],
    mobileRecordTitle: "Company record preview",
    mobileRecordLead:
      "Preview only. No participation outcome or publication is confirmed here.",
  },
  de: {
    factsConfirmed: "Beispielformat",
    noEvidence: "Noch keine Nachweise",
    unavailable: "Unternehmensdetail nicht verfügbar",
    viewSchedule: "Beispielformate anzeigen",
    hideSchedule: "Weniger anzeigen",
    discussFormat: "Format besprechen",
    workspace: "Arbeitsplätze",
    meetingRooms: "Besprechungsräume",
    productionStudio: "Produktionsstudio",
    communitySessions: "Community-Sessions",
    localGuidance: "Lokale Orientierung",
    profileTitle: "Vorschau des Unternehmensprofils",
    profileBody:
      "Der externe Profillink erscheint erst nach Bestätigung von Identität, Fakten und Publikationsfreigabe.",
    profileAction: "Profil nicht verfügbar",
    published: "Veröffentlicht",
    pending: "In Prüfung",
    private: "Nicht geteilt",
    seeParticipation: "So funktioniert die Teilnahme",
    heroSteps: ["Zweck", "Menschen", "Ort", "Arbeitskontext"],
    settings: [
      "Ruhig",
      "Kollaborativ",
      "Kreativ",
      "Gemischt",
      "Innen",
      "Außen",
      "Hybrid",
      "Flexibel",
    ],
    verifiedTitle: "Bestätigung erforderlich",
    verifiedBody:
      "Diese Vorschau bestätigt weder ein Unternehmen noch eine Teilnahme.",
    controlTitle: "Sie bestimmen, was wir teilen",
    controlBody:
      "Wählen Sie, was im freigegebenen Unternehmensprofil erscheint.",
    manageVisibility: "Sichtbarkeit verwalten",
  },
  es: {
    factsConfirmed: "Formato de ejemplo",
    noEvidence: "Aún no hay pruebas",
    unavailable: "Detalle de empresa no disponible",
    viewSchedule: "Ver formatos de ejemplo",
    hideSchedule: "Mostrar menos",
    discussFormat: "Hablar del formato",
    workspace: "Espacios de trabajo",
    meetingRooms: "Salas de reunión",
    productionStudio: "Estudio de producción",
    communitySessions: "Sesiones de comunidad",
    localGuidance: "Orientación local",
    profileTitle: "Vista previa del perfil de empresa",
    profileBody:
      "El enlace externo aparece solo tras confirmar identidad, hechos y permiso de publicación.",
    profileAction: "Perfil no disponible",
    published: "Publicado",
    pending: "En revisión",
    private: "No compartido",
    seeParticipation: "Ver cómo funciona la participación",
    heroSteps: ["Propósito", "Personas", "Lugar", "Contexto de trabajo"],
    settings: [
      "Tranquilo",
      "Colaborativo",
      "Creativo",
      "Mixto",
      "Interior",
      "Exterior",
      "Híbrido",
      "Flexible",
    ],
    verifiedTitle: "Verificación necesaria",
    verifiedBody:
      "Esta vista previa no confirma ninguna empresa ni participación.",
    controlTitle: "Tú controlas lo que compartimos",
    controlBody: "Elige qué aparece en el perfil aprobado.",
    manageVisibility: "Gestionar visibilidad",
  },
  ca: {
    factsConfirmed: "Format d’exemple",
    noEvidence: "Encara no hi ha proves",
    unavailable: "Detall d’empresa no disponible",
    viewSchedule: "Veure formats d’exemple",
    hideSchedule: "Mostra’n menys",
    discussFormat: "Parlar del format",
    workspace: "Espais de treball",
    meetingRooms: "Sales de reunió",
    productionStudio: "Estudi de producció",
    communitySessions: "Sessions de comunitat",
    localGuidance: "Orientació local",
    profileTitle: "Vista prèvia del perfil d’empresa",
    profileBody:
      "L’enllaç extern apareix només després de confirmar identitat, fets i permís de publicació.",
    profileAction: "Perfil no disponible",
    published: "Publicat",
    pending: "En revisió",
    private: "No compartit",
    seeParticipation: "Veure com funciona la participació",
    heroSteps: ["Propòsit", "Persones", "Lloc", "Context de treball"],
    settings: [
      "Tranquil",
      "Col·laboratiu",
      "Creatiu",
      "Mixt",
      "Interior",
      "Exterior",
      "Híbrid",
      "Flexible",
    ],
    verifiedTitle: "Verificació necessària",
    verifiedBody:
      "Aquesta vista prèvia no confirma cap empresa ni participació.",
    controlTitle: "Tu controles què compartim",
    controlBody: "Tria què apareix al perfil aprovat.",
    manageVisibility: "Gestionar visibilitat",
  },
  fr: {
    factsConfirmed: "Format d’exemple",
    noEvidence: "Aucune preuve pour le moment",
    unavailable: "Détail d’entreprise indisponible",
    viewSchedule: "Voir les formats d’exemple",
    hideSchedule: "Afficher moins",
    discussFormat: "Discuter d’un format",
    workspace: "Espaces de travail",
    meetingRooms: "Salles de réunion",
    productionStudio: "Studio de production",
    communitySessions: "Sessions communautaires",
    localGuidance: "Orientation locale",
    profileTitle: "Aperçu du profil d’entreprise",
    profileBody:
      "Le lien externe apparaît uniquement après confirmation de l’identité, des faits et du consentement de publication.",
    profileAction: "Profil indisponible",
    published: "Publié",
    pending: "En cours d’examen",
    private: "Non partagé",
    seeParticipation: "Voir comment fonctionne la participation",
    heroSteps: ["Objectif", "Personnes", "Lieu", "Contexte de travail"],
    settings: [
      "Calme",
      "Collaboratif",
      "Créatif",
      "Mixte",
      "Intérieur",
      "Extérieur",
      "Hybride",
      "Flexible",
    ],
    verifiedTitle: "Vérification requise",
    verifiedBody: "Cet aperçu ne confirme aucune entreprise ni participation.",
    controlTitle: "Vous contrôlez ce que nous partageons",
    controlBody: "Choisissez ce qui apparaît dans le profil approuvé.",
    manageVisibility: "Gérer la visibilité",
  },
  pt: {
    factsConfirmed: "Formato de exemplo",
    noEvidence: "Ainda sem provas",
    unavailable: "Detalhe da empresa indisponível",
    viewSchedule: "Ver formatos de exemplo",
    hideSchedule: "Mostrar menos",
    discussFormat: "Conversar sobre o formato",
    workspace: "Espaços de trabalho",
    meetingRooms: "Salas de reunião",
    productionStudio: "Estúdio de produção",
    communitySessions: "Sessões de comunidade",
    localGuidance: "Orientação local",
    profileTitle: "Pré-visualização do perfil da empresa",
    profileBody:
      "A ligação externa surge apenas após confirmação da identidade, dos factos e do consentimento de publicação.",
    profileAction: "Perfil indisponível",
    published: "Publicado",
    pending: "Em análise",
    private: "Não partilhado",
    seeParticipation: "Ver como funciona a participação",
    heroSteps: ["Objetivo", "Pessoas", "Lugar", "Contexto de trabalho"],
    settings: [
      "Calmo",
      "Colaborativo",
      "Criativo",
      "Misto",
      "Interior",
      "Exterior",
      "Híbrido",
      "Flexível",
    ],
    verifiedTitle: "Verificação necessária",
    verifiedBody:
      "Esta pré-visualização não confirma empresa nem participação.",
    controlTitle: "Controla o que partilhamos",
    controlBody: "Escolha o que aparece no perfil aprovado.",
    manageVisibility: "Gerir visibilidade",
  },
  it: {
    factsConfirmed: "Formato di esempio",
    noEvidence: "Nessuna prova al momento",
    unavailable: "Dettaglio aziendale non disponibile",
    viewSchedule: "Vedi i formati di esempio",
    hideSchedule: "Mostra meno",
    discussFormat: "Parla del formato",
    workspace: "Spazi di lavoro",
    meetingRooms: "Sale riunioni",
    productionStudio: "Studio di produzione",
    communitySessions: "Sessioni di comunità",
    localGuidance: "Orientamento locale",
    profileTitle: "Anteprima del profilo aziendale",
    profileBody:
      "Il link esterno appare solo dopo la conferma di identità, fatti e consenso alla pubblicazione.",
    profileAction: "Profilo non disponibile",
    published: "Pubblicato",
    pending: "In revisione",
    private: "Non condiviso",
    seeParticipation: "Scopri come funziona la partecipazione",
    heroSteps: ["Scopo", "Persone", "Luogo", "Contesto di lavoro"],
    settings: [
      "Tranquillo",
      "Collaborativo",
      "Creativo",
      "Misto",
      "Interno",
      "Esterno",
      "Ibrido",
      "Flessibile",
    ],
    verifiedTitle: "Verifica necessaria",
    verifiedBody:
      "Questa anteprima non conferma alcuna azienda o partecipazione.",
    controlTitle: "Controlli ciò che condividiamo",
    controlBody: "Scegli cosa appare nel profilo approvato.",
    manageVisibility: "Gestisci visibilità",
  },
};

const evidenceIcons: readonly LucideIcon[] = [
  CircleUserRound,
  SearchCheck,
  CalendarCheck2,
  ShieldCheck,
];
const storyMedia: readonly PortfolioMediaKey[] = [
  "focusedContext",
  "workingWeek",
  "hostedContext",
  "teamRhythm",
];
const participationIcons: readonly LucideIcon[] = [
  Presentation,
  BriefcaseBusiness,
  UsersRound,
  Clock3,
];
const provisionIcons: readonly LucideIcon[] = [
  BriefcaseBusiness,
  UsersRound,
  Video,
  Presentation,
  Compass,
];

function Media({
  mediaKey,
  className,
  alt,
  priority = false,
  sizes,
}: {
  mediaKey: PortfolioMediaKey;
  className: string;
  alt?: string;
  priority?: boolean;
  sizes: string;
}) {
  const media = portfolioCompaniesMedia[mediaKey];

  return (
    <figure className={className}>
      <Image
        src={media.src}
        alt={alt ?? media.altRole}
        fill
        priority={priority}
        unoptimized={media.src.startsWith(
          "/__crays-clubs/portfolio-companies/",
        )}
        sizes={sizes}
        style={{ objectPosition: media.objectPosition }}
      />
    </figure>
  );
}

function ResponsiveHeroMedia() {
  const desktop = portfolioCompaniesMedia.hero;
  const mobile = portfolioCompaniesMedia.mobileHero;
  const { props: desktopProps } = getImageProps({
    src: desktop.src,
    alt: "Forest City waterfront and palm-lined working context.",
    fill: true,
    loading: "eager",
    unoptimized: true,
    sizes: "100vw",
    style: { objectFit: "cover", objectPosition: desktop.objectPosition },
  });
  const { props: mobileProps } = getImageProps({
    src: mobile.src,
    alt: "Forest City waterfront and palm-lined working context.",
    fill: true,
    unoptimized: true,
    sizes: "100vw",
    style: { objectFit: "cover", objectPosition: mobile.objectPosition },
  });

  return (
    <picture className={styles.heroMedia}>
      <source
        media="(max-width: 679px)"
        srcSet={mobileProps.srcSet ?? mobileProps.src}
        sizes={mobileProps.sizes}
      />
      <img {...desktopProps} alt={desktopProps.alt} fetchPriority="high" />
    </picture>
  );
}

export function PortfolioCompaniesPage({ locale }: Props) {
  const c = portfolioCompaniesCopy[locale];
  const state = stateCopy[locale];
  const [patternIndex, setPatternIndex] = useState(1);
  const [teamSize, setTeamSize] = useState(20);
  const [setting, setSetting] = useState<number | null>(null);
  const [programmeOpen, setProgrammeOpen] = useState(false);

  const tier = useMemo(() => {
    if (patternIndex === 0 && teamSize <= 6) return 0;
    if (patternIndex === 2 || teamSize >= 16) return 2;
    return 1;
  }, [patternIndex, teamSize]);

  const contactHref = `/${locale}/contact`;
  const visibleProgramme = programmeOpen
    ? c.programme.items
    : c.programme.items.slice(0, 5);
  const settings = state.settings;
  const evidenceBodies =
    state.evidenceBodies ?? c.record.items.map((item) => item.body);
  const routeLabels = state.routeLabels ?? [
    c.mapper.eyebrow,
    c.companies.eyebrow,
    c.reasons.eyebrow,
    c.programme.eyebrow,
    c.provision.eyebrow,
    c.record.eyebrow,
    c.closing.eyebrow,
  ];
  const provisionLabels = [
    state.workspace,
    state.meetingRooms,
    state.productionStudio,
    state.communitySessions,
    state.localGuidance,
  ];

  return (
    <ClubsPublicShell availableLocales={portfolioLocales} locale={locale}>
      <main id="portfolio-main" className={styles.page}>
        <section className={styles.hero} aria-labelledby="portfolio-hero-title">
          <ResponsiveHeroMedia />
          <div className={styles.heroShade} />
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>{c.hero.eyebrow}</p>
            <h1 id="portfolio-hero-title">
              {state.heroTitleLines
                ? state.heroTitleLines.map((line) => (
                    <span key={line}>{line}</span>
                  ))
                : c.hero.title}
            </h1>
            <p className={styles.heroLead}>{c.hero.lead}</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href={contactHref}>
                {c.hero.cta}
                <ArrowRight aria-hidden="true" size={17} />
              </Link>
              <a className={styles.secondaryButton} href="#participation">
                {state.seeParticipation}
                <ArrowRight aria-hidden="true" size={17} />
              </a>
            </div>
          </div>
          <ol className={styles.heroEquation} aria-label={c.hero.contextLabel}>
            {state.heroSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section
          className={styles.evidenceRail}
          aria-labelledby="evidence-title"
        >
          <h2 id="evidence-title" className={styles.srOnly}>
            {c.evidence.label}
          </h2>
          <ol>
            {c.evidence.states.map((item, index) => {
              const Icon = evidenceIcons[index] ?? FileCheck2;
              return (
                <li key={item}>
                  <span className={styles.evidenceIcon}>
                    <Icon aria-hidden="true" size={21} />
                  </span>
                  <div>
                    <strong>{item}</strong>
                    <small>{evidenceBodies[index]}</small>
                  </div>
                  {index < c.evidence.states.length - 1 && (
                    <ArrowRight
                      className={styles.evidenceConnector}
                      aria-hidden="true"
                      size={18}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <div className={styles.atlasFrame}>
          <nav className={styles.routeRail} aria-label={c.hero.contextLabel}>
            <a href="#working-context">
              <span>01</span>
              {routeLabels[0]}
            </a>
            <a href="#company-stories">
              <span>02</span>
              {routeLabels[1]}
            </a>
            <a href="#participation">
              <span>03</span>
              {routeLabels[2]}
            </a>
            <a href="#programme">
              <span>04</span>
              {routeLabels[3]}
            </a>
            <a href="#provision">
              <span>05</span>
              {routeLabels[4]}
            </a>
            <a href="#company-record">
              <span>06</span>
              {routeLabels[5]}
            </a>
            <a href="#company-contact">
              <span>07</span>
              {routeLabels[6]}
            </a>
          </nav>

          <div className={styles.atlasContent}>
            <section
              id="working-context"
              className={styles.mapperSection}
              aria-labelledby="mapper-title"
            >
              <header className={styles.sectionHeader}>
                <p className={styles.eyebrow}>{c.mapper.eyebrow}</p>
                <h2 id="mapper-title">{c.mapper.title}</h2>
                <p>{c.mapper.lead}</p>
              </header>

              <div className={styles.mapperGrid}>
                <div className={styles.mapperControls}>
                  <fieldset>
                    <legend>{c.mapper.patternLabel}</legend>
                    <div className={styles.segmentedControl}>
                      {c.mapper.patterns.map((pattern, index) => (
                        <button
                          key={pattern}
                          type="button"
                          aria-pressed={patternIndex === index}
                          onClick={() => setPatternIndex(index)}
                        >
                          {pattern}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend>{c.mapper.sizeLabel}</legend>
                    <div className={styles.stepper}>
                      <button
                        type="button"
                        aria-label={`Decrease ${c.mapper.sizeLabel}`}
                        onClick={() =>
                          setTeamSize((value) => Math.max(1, value - 1))
                        }
                      >
                        <Minus aria-hidden="true" size={16} />
                      </button>
                      <output aria-live="polite">{teamSize}</output>
                      <button
                        type="button"
                        aria-label={`Increase ${c.mapper.sizeLabel}`}
                        onClick={() =>
                          setTeamSize((value) => Math.min(40, value + 1))
                        }
                      >
                        <Plus aria-hidden="true" size={16} />
                      </button>
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend>{state.settingLabel ?? c.hero.contextLabel}</legend>
                    <div className={styles.settingChips}>
                      {settings.map((item, index) => (
                        <button
                          key={item}
                          type="button"
                          aria-pressed={setting === index}
                          onClick={() => setSetting(index)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>

                <div
                  className={styles.mapperResult}
                  role="status"
                  aria-live="polite"
                >
                  <span>{c.mapper.resultLabel}</span>
                  {c.mapper.tiers.map((item, index) => (
                    <article key={item.title} data-active={tier === index}>
                      <div className={styles.resultIcon}>
                        <BadgeCheck aria-hidden="true" size={20} />
                      </div>
                      <div className={styles.resultCopy}>
                        <strong>{item.title}</strong>
                        <p>{item.body}</p>
                      </div>
                      {tier === index && (
                        <ArrowRight aria-hidden="true" size={18} />
                      )}
                    </article>
                  ))}
                  <small>
                    {c.mapper.patterns[patternIndex]} · {settings[setting ?? 0]}{" "}
                    · {teamSize}
                  </small>
                </div>
              </div>
            </section>

            <section
              id="company-stories"
              className={styles.storySection}
              aria-labelledby="stories-title"
            >
              <header className={styles.sectionHeader}>
                <p className={styles.eyebrow}>{c.companies.eyebrow}</p>
                <h2 id="stories-title">{c.companies.title}</h2>
                <p>{c.companies.lead}</p>
              </header>

              <div className={styles.storyList}>
                {c.companies.items.map((item, index) => {
                  const status =
                    index < 2
                      ? state.factsConfirmed
                      : index === 2
                        ? state.noEvidence
                        : state.unavailable;
                  return (
                    <article
                      key={item.title}
                      data-state={
                        index < 2
                          ? "example"
                          : index === 2
                            ? "empty"
                            : "unavailable"
                      }
                    >
                      <span className={styles.storyIndex}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <Media
                        mediaKey={storyMedia[index]}
                        className={styles.storyMedia}
                        sizes="(max-width: 820px) 36vw, 30vw"
                      />
                      <div className={styles.storyCopy}>
                        <span className={styles.status}>{status}</span>
                        <h3>{item.title}</h3>
                        {state.storyMeta?.[index] && (
                          <small className={styles.storyMeta}>
                            {state.storyMeta[index]}
                          </small>
                        )}
                        <p>{item.body}</p>
                      </div>
                      <ArrowRight aria-hidden="true" size={19} />
                    </article>
                  );
                })}
              </div>
            </section>

            <section
              id="participation"
              className={styles.participationSection}
              aria-labelledby="participation-title"
            >
              <header className={styles.sectionHeader}>
                <p className={styles.eyebrow}>{c.reasons.eyebrow}</p>
                <h2 id="participation-title">{c.reasons.title}</h2>
                <p>{c.reasons.lead}</p>
              </header>

              <div className={styles.participationGrid}>
                {c.reasons.items.map((item, index) => {
                  const Icon = participationIcons[index] ?? BriefcaseBusiness;
                  return (
                    <article key={item.title}>
                      <div>
                        <span>0{index + 1}</span>
                        <Icon aria-hidden="true" size={21} />
                        <h3>{item.title}</h3>
                        <p>{item.body}</p>
                        <Link href={contactHref}>
                          {state.discussFormat}
                          <ArrowRight aria-hidden="true" size={16} />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section
              id="programme"
              className={styles.programmeSection}
              aria-labelledby="programme-title"
            >
              <header>
                <p className={styles.eyebrow}>{c.programme.eyebrow}</p>
                <h2 id="programme-title">{c.programme.title}</h2>
                <p>{c.programme.lead}</p>
              </header>
              <ol className={styles.programmeList}>
                {visibleProgramme.map((item, index) => (
                  <li key={item.title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                    <MapPin aria-hidden="true" size={17} />
                  </li>
                ))}
              </ol>
              <button
                type="button"
                className={styles.programmeToggle}
                aria-expanded={programmeOpen}
                onClick={() => setProgrammeOpen((value) => !value)}
              >
                {programmeOpen ? state.hideSchedule : state.viewSchedule}
                <ChevronDown
                  aria-hidden="true"
                  size={17}
                  data-open={programmeOpen}
                />
              </button>
            </section>

            <section
              id="provision"
              className={styles.provisionSection}
              aria-labelledby="provision-title"
            >
              <header className={styles.sectionHeader}>
                <p className={styles.eyebrow}>{c.provision.eyebrow}</p>
                <h2 id="provision-title">{c.provision.title}</h2>
                <p>{c.provision.lead}</p>
              </header>
              <Media
                mediaKey="provisionPanorama"
                className={styles.provisionMedia}
                sizes="(max-width: 820px) 100vw, 85vw"
              />
              <div className={styles.provisionGrid}>
                {provisionLabels.map((label, index) => {
                  const Icon = provisionIcons[index] ?? Compass;
                  return (
                    <article key={label}>
                      <Icon aria-hidden="true" size={22} />
                      <h3>{label}</h3>
                      <p>{c.provision.items[index]?.body}</p>
                    </article>
                  );
                })}
              </div>
            </section>

            <section
              id="company-record"
              className={styles.recordSection}
              aria-labelledby="record-title"
            >
              <header className={styles.sectionHeader}>
                <p className={styles.eyebrow}>{c.record.eyebrow}</p>
                <h2 id="record-title">
                  <span className={styles.desktopRecordCopy}>
                    {c.record.title}
                  </span>
                  <span className={styles.mobileRecordCopy}>
                    {state.mobileRecordTitle ?? c.record.title}
                  </span>
                </h2>
                <p>
                  <span className={styles.desktopRecordCopy}>
                    {c.record.lead}
                  </span>
                  <span className={styles.mobileRecordCopy}>
                    {state.mobileRecordLead ?? c.record.lead}
                  </span>
                </p>
              </header>
              <div className={styles.recordGrid}>
                <div
                  className={styles.recordTable}
                  role="table"
                  aria-label={c.record.title}
                >
                  {c.record.items.slice(0, 6).map((item, index) => (
                    <div role="row" key={item.title}>
                      <strong role="cell">{item.title}</strong>
                      <span role="cell">
                        {state.recordStatuses?.[index] ?? state.private}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={styles.verificationStack}>
                  <aside className={styles.verifiedCard}>
                    <BadgeCheck aria-hidden="true" size={21} />
                    <h3>{state.verifiedTitle}</h3>
                    <p>{state.verifiedBody}</p>
                  </aside>
                  <aside className={styles.controlCard}>
                    <ShieldCheck aria-hidden="true" size={21} />
                    <h3>{state.controlTitle}</h3>
                    <p>{state.controlBody}</p>
                    <button type="button" disabled>
                      {state.manageVisibility}
                      <ArrowRight aria-hidden="true" size={15} />
                    </button>
                  </aside>
                </div>
              </div>
            </section>

            <section
              id="company-contact"
              className={styles.contactSection}
              aria-labelledby="contact-title"
            >
              <div>
                <p className={styles.eyebrow}>{c.closing.eyebrow}</p>
                <h2 id="contact-title">{c.closing.title}</h2>
                <p>{c.closing.body}</p>
                <Link className={styles.primaryButton} href={contactHref}>
                  {c.closing.primary}
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              </div>
              <aside className={styles.profileHandoff}>
                <FileCheck2 aria-hidden="true" size={21} />
                <h3>{state.profileTitle}</h3>
                <p>{state.profileBody}</p>
                <button type="button" disabled>
                  {state.profileAction}
                  <ArrowUpRight aria-hidden="true" size={15} />
                </button>
              </aside>
            </section>
          </div>
        </div>
      </main>
    </ClubsPublicShell>
  );
}
