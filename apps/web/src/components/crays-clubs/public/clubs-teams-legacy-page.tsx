"use client";

/* eslint-disable @next/next/no-img-element -- Native image loading keeps the approved multi-image editorial mosaic reliable in the shared runtime. */

import { useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BedDouble,
  BookOpen,
  Boxes,
  Brain,
  BriefcaseBusiness,
  Building2,
  Camera,
  Check,
  ChevronRight,
  Code2,
  Compass,
  Dumbbell,
  Handshake,
  HeartPulse,
  LineChart,
  Megaphone,
  Network,
  Palette,
  Presentation,
  ShieldCheck,
  Users,
  Utensils,
  Wifi,
  type LucideIcon,
} from "lucide-react";

import {
  getTeamsContent,
  teamsFrames,
  type TeamsLocale,
} from "./clubs-teams-copy";
import styles from "./clubs-teams-page.module.css";
import { ClubsPublicShell } from "./clubs-public-shell";

type Props = { locale: TeamsLocale };

type TeamsMedia = {
  alt: string;
  src: string;
};

const AVAILABLE_LOCALES = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;

const inquiryLabels: Record<TeamsLocale, {
  consent: string;
  continue: string;
  email: string;
  evidenceLess: string;
  evidenceMore: string;
  name: string;
  purpose: string;
  ready: string;
  size: string;
  submit: string;
}> = {
  en: {
    consent: "I understand this creates a local inquiry preview only. It is not a booking and no availability is promised.",
    continue: "Continue to the contact desk",
    email: "Work email",
    evidenceLess: "Show less evidence",
    evidenceMore: "Show more evidence",
    name: "Your name",
    purpose: "What does the team need to decide, create or understand?",
    ready: "The inquiry is complete. Nothing was sent or reserved.",
    size: "Approximate team size",
    submit: "Validate inquiry",
  },
  de: {
    consent: "Ich verstehe, dass dies nur eine lokale Anfragevorschau erstellt. Es ist keine Buchung und verspricht keine Verfügbarkeit.",
    continue: "Weiter zur Kontaktstelle",
    email: "Geschäftliche E-Mail",
    evidenceLess: "Weniger Nachweise zeigen",
    evidenceMore: "Mehr Nachweise zeigen",
    name: "Ihr Name",
    purpose: "Was muss das Team entscheiden, entwickeln oder verstehen?",
    ready: "Die Anfrage ist vollständig. Es wurde nichts gesendet oder reserviert.",
    size: "Ungefähre Teamgröße",
    submit: "Anfrage prüfen",
  },
  es: {
    consent: "Entiendo que esto solo crea una vista previa local de la consulta. No es una reserva ni promete disponibilidad.",
    continue: "Continuar al equipo de contacto",
    email: "Correo de trabajo",
    evidenceLess: "Mostrar menos evidencias",
    evidenceMore: "Mostrar más evidencias",
    name: "Tu nombre",
    purpose: "¿Qué necesita decidir, crear o comprender el equipo?",
    ready: "La consulta está completa. No se ha enviado ni reservado nada.",
    size: "Tamaño aproximado del equipo",
    submit: "Validar consulta",
  },
  ca: {
    consent: "Entenc que això només crea una vista prèvia local de la consulta. No és una reserva ni promet disponibilitat.",
    continue: "Continua amb l'equip de contacte",
    email: "Correu de feina",
    evidenceLess: "Mostra menys evidències",
    evidenceMore: "Mostra més evidències",
    name: "El teu nom",
    purpose: "Què necessita decidir, crear o comprendre l'equip?",
    ready: "La consulta està completa. No s'ha enviat ni reservat res.",
    size: "Mida aproximada de l'equip",
    submit: "Validar consulta",
  },
  fr: {
    consent: "Je comprends que ceci crée uniquement un aperçu local de la demande. Ce n'est pas une réservation et aucune disponibilité n'est promise.",
    continue: "Continuer vers l'équipe de contact",
    email: "E-mail professionnel",
    evidenceLess: "Afficher moins d'éléments",
    evidenceMore: "Afficher plus d'éléments",
    name: "Votre nom",
    purpose: "Que doit décider, créer ou comprendre l'équipe ?",
    ready: "La demande est complète. Rien n'a été envoyé ni réservé.",
    size: "Taille approximative de l'équipe",
    submit: "Valider la demande",
  },
  pt: {
    consent: "Compreendo que isto cria apenas uma pré-visualização local do pedido. Não é uma reserva nem promete disponibilidade.",
    continue: "Continuar para a equipa de contacto",
    email: "E-mail de trabalho",
    evidenceLess: "Mostrar menos evidências",
    evidenceMore: "Mostrar mais evidências",
    name: "O seu nome",
    purpose: "O que a equipa precisa de decidir, criar ou compreender?",
    ready: "O pedido está completo. Nada foi enviado ou reservado.",
    size: "Tamanho aproximado da equipa",
    submit: "Validar pedido",
  },
  it: {
    consent: "Comprendo che questo crea solo un'anteprima locale della richiesta. Non è una prenotazione e non promette disponibilità.",
    continue: "Continua con il team di contatto",
    email: "E-mail di lavoro",
    evidenceLess: "Mostra meno evidenze",
    evidenceMore: "Mostra più evidenze",
    name: "Il tuo nome",
    purpose: "Che cosa deve decidere, creare o comprendere il team?",
    ready: "La richiesta è completa. Nulla è stato inviato o prenotato.",
    size: "Dimensione approssimativa del team",
    submit: "Valida richiesta",
  },
};

const heroMedia: readonly TeamsMedia[] = [
  {
    alt: "A focused collaborative working session",
    src: "/__crays-clubs/teams/option1/hero-01.webp",
  },
  {
    alt: "People working around a shared table",
    src: "/__crays-clubs/teams/option1/hero-02.webp",
  },
  {
    alt: "A group gathered around a board table",
    src: "/__crays-clubs/teams/option1/hero-03.webp",
  },
  {
    alt: "A social gathering in a hospitality setting",
    src: "/__crays-clubs/teams/option1/hero-04.webp",
  },
  {
    alt: "A partnership conversation",
    src: "/__crays-clubs/teams/option1/hero-05.webp",
  },
] as const;

const storyMedia: readonly TeamsMedia[] = [
  {
    alt: "A work and travel moment",
    src: "/__crays-clubs/teams/option1/story-01.webp",
  },
  {
    alt: "A community lifestyle moment",
    src: "/__crays-clubs/teams/option1/story-02.webp",
  },
  {
    alt: "A hospitality work moment",
    src: "/__crays-clubs/teams/option1/story-03.webp",
  },
  {
    alt: "A group portrait in a professional setting",
    src: "/__crays-clubs/teams/option1/story-04.webp",
  },
] as const;

const methodMedia: readonly TeamsMedia[] = [
  {
    alt: "A work and learning moment",
    src: "/__crays-clubs/teams/option1/method-learn.webp",
  },
  {
    alt: "A relationship and community moment",
    src: "/__crays-clubs/teams/option1/method-network.webp",
  },
  {
    alt: "A focused work moment",
    src: "/__crays-clubs/teams/option1/method-build.webp",
  },
  {
    alt: "A community workshop",
    src: "/__crays-clubs/teams/option1/method-demo.webp",
  },
] as const;

const facilityMedia: readonly TeamsMedia[] = [
  {
    alt: "CRAYS coworking environment",
    src: "/__crays-clubs/teams/option1/facility-lead.webp",
  },
  {
    alt: "CRAYS community coworking environment",
    src: "/__crays-clubs/teams/option1/facility-01.webp",
  },
  {
    alt: "CRAYS community gym",
    src: "/__crays-clubs/teams/option1/facility-02.webp",
  },
  {
    alt: "CRAYS healthy meal setting",
    src: "/__crays-clubs/teams/option1/facility-03.webp",
  },
  {
    alt: "CRAYS lounge atmosphere",
    src: "/__crays-clubs/teams/option1/facility-04.webp",
  },
] as const;

const evidenceMedia: readonly TeamsMedia[] = [
  {
    alt: "Forest City community event at sunset",
    src: "/__crays-clubs/teams/option1/evidence-lead.webp",
  },
  {
    alt: "Forest City work environment",
    src: "/__crays-clubs/teams/option1/evidence-01.webp",
  },
  {
    alt: "CRAYS work lounge",
    src: "/__crays-clubs/teams/option1/evidence-02.webp",
  },
  {
    alt: "Forest City beach skyline",
    src: "/__crays-clubs/teams/option1/evidence-03.webp",
  },
  {
    alt: "CRAYS hospitality lounge",
    src: "/__crays-clubs/teams/option1/evidence-04.webp",
  },
] as const;

const methodIcons: readonly LucideIcon[] = [BookOpen, Network, Boxes, Presentation];
const benefitIcons: readonly LucideIcon[] = [
  BedDouble,
  Utensils,
  Dumbbell,
  BookOpen,
  BriefcaseBusiness,
  Presentation,
  Building2,
  Users,
  Wifi,
  Camera,
] as const;
const expertiseIcons: readonly LucideIcon[] = [
  Compass,
  BriefcaseBusiness,
  Code2,
  Palette,
  LineChart,
  Megaphone,
  Network,
  Users,
] as const;
const facilityIcons: readonly LucideIcon[] = [
  BedDouble,
  Utensils,
  Dumbbell,
  Presentation,
  Users,
  Building2,
  Camera,
  Brain,
  HeartPulse,
  Handshake,
  Wifi,
] as const;

function Photo({
  asset,
  priority = false,
  sizes,
}: {
  asset: TeamsMedia;
  priority?: boolean;
  sizes: string;
}) {
  return (
    <img
      alt={asset.alt}
      data-crays-photo-treatment="warm-editorial"
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      loading="eager"
      sizes={sizes}
      src={asset.src}
      style={{ height: "100%", inset: 0, position: "absolute", width: "100%" }}
    />
  );
}

function ExpertiseCard({ item, index }: { item: readonly [string, string]; index: number }) {
  const Icon = expertiseIcons[index % expertiseIcons.length];
  return (
    <article className={styles.expertiseCard}>
      <span className={styles.domainIcon} aria-hidden="true"><Icon size={24} strokeWidth={1.45} /></span>
      <span className={styles.domainIndex}>{String(index + 1).padStart(2, "0")}</span>
      <h3>{item[0]}</h3>
      <p>{item[1]}</p>
    </article>
  );
}

function EvidenceCard({ item, index, status }: { item: readonly [string, string]; index: number; status: string }) {
  const asset = evidenceMedia[index];
  return (
    <article className={styles.evidenceCard}>
      <h3 className={styles.visuallyHidden}>{item[0]}</h3>
      <figure className={styles.evidenceMedia}>
        <Photo asset={asset} sizes="(max-width: 760px) 100vw, 34vw" />
      </figure>
      <div className={styles.evidenceCopy}>
        <strong><ShieldCheck aria-hidden="true" size={15} strokeWidth={1.6} />{status}</strong>
      </div>
    </article>
  );
}

export function ClubsTeamsLegacyPage({ locale }: Props) {
  const frame = teamsFrames[locale];
  const {
    benefits,
    expertiseSlots,
    facilities,
    methods,
    proofLanes,
    socialProof,
  } = getTeamsContent(locale);
  const inquiry = inquiryLabels[locale];
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [expertiseOpen, setExpertiseOpen] = useState(false);
  const [inquiryReady, setInquiryReady] = useState(false);
  const inquiryPanelRef = useRef<HTMLDetailsElement>(null);

  function handleInquirySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInquiryReady(true);
  }

  function openInquiry() {
    const panel = inquiryPanelRef.current;
    if (!panel) return;

    panel.open = true;
    panel.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
    panel.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });
  }

  return (
    <ClubsPublicShell
      availableLocales={AVAILABLE_LOCALES}
      headerTone="navy"
      locale={locale}
    >
      <main className={styles.main} id="teams-main">
        <section className={styles.hero} aria-labelledby="teams-title">
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{frame.heroEyebrow}</p>
              <h1 id="teams-title">{frame.heroTitle}</h1>
              <p className={styles.heroLead}>{frame.heroBody}</p>
              <div className={styles.heroActions}>
                <button className={styles.primaryAction} onClick={openInquiry} type="button">
                  {frame.contact}<ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
                </button>
                <a className={styles.secondaryAction} href="#team-stories">
                  {frame.explore}<ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
                </a>
              </div>
            </div>

            <div className={styles.heroMosaic}>
              {heroMedia.map((asset, index) => (
                <figure className={`${styles.heroTile} ${styles[`heroTile${index + 1}`]}`} key={asset.src}>
                  <Photo
                    asset={asset}
                    priority
                    sizes="(max-width: 900px) 48vw, 28vw"
                  />
                </figure>
              ))}
            </div>
          </div>

          <ul className={styles.purposeRail} aria-label={frame.benefitsTitle}>
            {benefits.slice(0, 10).map(([title], index) => {
              const Icon = benefitIcons[index];
              return <li key={title}><Icon aria-hidden="true" size={14} strokeWidth={1.6} />{title}</li>;
            })}
          </ul>
        </section>

        <section className={styles.stories} id="team-stories" aria-labelledby="proof-title">
          <h2 className={styles.visuallyHidden} id="proof-title">{frame.proofTitle}</h2>

          <div className={styles.storyList}>
            {proofLanes.slice(0, 4).map((lane, index) => (
              <article className={styles.storyCard} key={lane.number}>
                <figure className={styles.storyMedia}>
                  <Photo asset={storyMedia[index]} sizes="(max-width: 760px) 100vw, 52vw" />
                </figure>
                <div className={styles.storyCopy}>
                  <span className={styles.storyIndex}>{lane.number}</span>
                  <p className={styles.storyType}>{lane.title}</p>
                  <h3>{lane.question}</h3>
                  <p>{lane.answer}</p>
                  <div className={styles.truthTags}>
                    <span>{frame.contact}</span>
                    <span>{frame.blockedLabel}</span>
                  </div>
                  <details className={styles.proofGate}>
                    <summary>{frame.blockedLabel}<ChevronRight aria-hidden="true" size={17} /></summary>
                    <p>{lane.gate}</p>
                  </details>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.method} aria-labelledby="method-title">
          <h2 className={styles.visuallyHidden} id="method-title">{frame.methodTitle}</h2>

          <div className={styles.methodGrid}>
            {methods.map((item, index) => {
              const Icon = methodIcons[index];
              return (
                <article className={styles.methodCard} key={item.step}>
                  <figure className={styles.methodMedia}>
                    <Photo asset={methodMedia[index]} sizes="(max-width: 760px) 100vw, 48vw" />
                  </figure>
                  <div className={styles.methodCopy}>
                    <span className={styles.methodIcon} aria-hidden="true"><Icon size={27} strokeWidth={1.45} /></span>
                    <span className={styles.methodIndex}>{String(index + 1).padStart(2, "0")}</span>
                    <h3>{item.step}</h3>
                    <strong>{item.line}</strong>
                    <p>{item.body}</p>
                    <ul>
                      {item.details.slice(0, 2).map((detail) => (
                        <li key={detail}><Check aria-hidden="true" size={15} strokeWidth={1.8} />{detail}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.expertise} aria-labelledby="expertise-title">
          <header className={styles.compactLeadRow}>
            <div>
              <p className={styles.eyebrow}>{frame.expertiseEyebrow}</p>
              <h2 id="expertise-title">{frame.expertiseTitle}</h2>
            </div>
            <button
              aria-controls="expertise-more"
              aria-expanded={expertiseOpen}
              onClick={() => setExpertiseOpen((open) => !open)}
              type="button"
            >
              {frame.showAll}<ArrowRight aria-hidden="true" className={expertiseOpen ? styles.openArrow : undefined} size={18} />
            </button>
          </header>

          <div className={styles.expertiseGrid}>
            {expertiseSlots.slice(0, 6).map((item, index) => (
              <ExpertiseCard index={index} item={item} key={item[0]} />
            ))}
          </div>

          <div className={styles.expertiseGrid} hidden={!expertiseOpen} id="expertise-more">
            {expertiseSlots.slice(6).map((item, index) => (
              <ExpertiseCard index={index + 6} item={item} key={item[0]} />
            ))}
          </div>
        </section>

        <section className={styles.facilities} aria-labelledby="facilities-title">
          <header className={styles.compactLead}>
            <p className={styles.eyebrow}>{frame.facilitiesEyebrow}</p>
            <h2 id="facilities-title">{frame.facilitiesTitle}</h2>
          </header>

          <div className={styles.facilityComposition}>
            <figure className={styles.facilityLeadMedia}>
              <Photo asset={facilityMedia[0]} sizes="(max-width: 760px) 100vw, 92vw" />
            </figure>
            <div className={styles.facilityBottom}>
              <ul className={styles.facilityList}>
                {facilities.slice(0, 10).map((item, index) => {
                  const Icon = facilityIcons[index];
                  return (
                    <li key={item[0]}>
                      <Icon aria-hidden="true" size={18} strokeWidth={1.55} />
                      <span><strong>{item[0]}</strong><small>{item[2]}</small></span>
                    </li>
                  );
                })}
              </ul>
              <div className={styles.facilityMosaic}>
                {facilityMedia.slice(1).map((asset) => (
                  <figure className={styles.facilityMedia} key={asset.src}>
                    <Photo asset={asset} sizes="(max-width: 760px) 1px, 24vw" />
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.evidence} aria-labelledby="evidence-title">
          <header className={styles.compactLeadRow}>
            <div>
              <p className={styles.eyebrow}>{frame.voicesEyebrow}</p>
              <h2 id="evidence-title">{frame.voicesTitle}</h2>
            </div>
            <button
              aria-controls="evidence-more"
              aria-expanded={evidenceOpen}
              onClick={() => setEvidenceOpen((open) => !open)}
              type="button"
            >
              {evidenceOpen ? inquiry.evidenceLess : inquiry.evidenceMore}<ArrowRight aria-hidden="true" className={evidenceOpen ? styles.openArrow : undefined} size={16} />
            </button>
          </header>

          <div className={styles.evidenceGrid}>
            {socialProof.map((item, index) => (
              <EvidenceCard index={index} item={item} key={item[0]} status={frame.blockedLabel} />
            ))}
          </div>

          <ol className={styles.evidenceExpanded} hidden={!evidenceOpen} id="evidence-more">
            {socialProof.map((item, index) => (
              <li key={item[0]}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item[0]}</strong><small>{item[1]}</small></li>
            ))}
          </ol>
        </section>

        <section className={styles.closing} aria-labelledby="teams-closing-title">
          <div>
            <p className={styles.eyebrow}>{frame.closingEyebrow}</p>
            <h2 id="teams-closing-title">{frame.closingTitle}</h2>
          </div>
          <div className={styles.closingActions}>
            <details className={styles.closingInquiry} id="teams-inquiry" ref={inquiryPanelRef}>
              <summary>{frame.closingCta}<ArrowRight aria-hidden="true" size={19} /></summary>
              <form onInput={() => setInquiryReady(false)} onSubmit={handleInquirySubmit}>
                <div className={styles.inquiryPair}>
                  <label>
                    <span>{inquiry.name}</span>
                    <input autoComplete="name" name="name" required type="text" />
                  </label>
                  <label>
                    <span>{inquiry.email}</span>
                    <input autoComplete="email" name="email" required type="email" />
                  </label>
                </div>
                <label>
                  <span>{inquiry.size}</span>
                  <input inputMode="numeric" min="1" name="team_size" type="number" />
                </label>
                <label>
                  <span>{inquiry.purpose}</span>
                  <textarea minLength={20} name="purpose" required rows={4} />
                </label>
                <label className={styles.inquiryConsent}>
                  <input name="scope_acknowledgement" required type="checkbox" />
                  <span>{inquiry.consent}</span>
                </label>
                <button type="submit">{inquiry.submit}<ArrowRight aria-hidden="true" size={18} /></button>
                {inquiryReady ? (
                  <p className={styles.inquiryReady} role="status">
                    {inquiry.ready} <a href="mailto:info@craysclub.com?subject=CRAYS%20Teams%20inquiry">{inquiry.continue}<ArrowRight aria-hidden="true" size={16} /></a>
                  </p>
                ) : null}
              </form>
            </details>
            <a className={styles.closingSecondary} href="#team-stories">{frame.explore}<ArrowRight aria-hidden="true" size={18} /></a>
          </div>
        </section>
      </main>
    </ClubsPublicShell>
  );
}
