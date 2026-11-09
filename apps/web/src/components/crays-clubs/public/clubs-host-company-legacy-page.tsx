"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  BedDouble,
  BriefcaseBusiness,
  Building2,
  CalendarRange,
  ClipboardCheck,
  FileCheck2,
  Handshake,
  ImageIcon,
  LockKeyhole,
  MessageSquareText,
  Mic2,
  Plus,
  Presentation,
  ShieldCheck,
  UtensilsCrossed,
  UsersRound,
  Wifi,
} from "lucide-react";
import { ClubsPublicShell } from "./clubs-public-shell";
import {
  hostCompanyCopy,
  hostCompanyWorkflowCopy,
  type HostCompanyLocale,
} from "./host-company-copy";
import {
  hostCompanyClosingMedia,
  hostCompanyFacilityMedia,
  hostCompanyFormatMedia,
  hostCompanyHeroMedia,
  hostCompanyProgramMedia,
  hostCompanyProofMedia,
  type HostCompanyMediaAsset,
} from "./clubs-host-company-media";
import styles from "./clubs-host-company-page.module.css";

type ClubsHostCompanyPageProps = {
  locale: HostCompanyLocale;
};

type CopyRecord = Record<string, unknown>;

const hostCompanyLocales: HostCompanyLocale[] = ["en", "de", "es", "ca", "fr", "pt", "it"];

const benefitIcons = [
  Building2,
  CalendarRange,
  ClipboardCheck,
  ShieldCheck,
  BriefcaseBusiness,
  Wifi,
  Presentation,
  BedDouble,
  UtensilsCrossed,
  Activity,
  Mic2,
  UsersRound,
] as const;

const proofIcons = [FileCheck2, Handshake, ShieldCheck, MessageSquareText, ImageIcon] as const;
const programIcons = [UtensilsCrossed, MessageSquareText, Activity, ClipboardCheck] as const;
const programMedia = hostCompanyProgramMedia[0];

const uiCopy: Record<
  HostCompanyLocale,
  {
    benefits: string;
    ways: string;
    waysCount: string;
    evidenceCount: string;
    gate: string;
    format: string;
    inquiry: string;
    servicesCount: string;
    socialTitle: string;
    socialBody: string;
    approval: string;
    states: string;
    statesCount: string;
    faq: string;
    close: string;
    guardrail: string;
    related: string;
  }
> = {
  en: {
    benefits: "What you get",
    ways: "Twelve ways we can make hosting simpler and more effective.",
    waysCount: "12 ways",
    evidenceCount: "Five evidence lanes",
    gate: "Evidence gate",
    format: "Format",
    inquiry: "Ask about this format",
    servicesCount: "11 service roles",
    socialTitle: "What are people saying about Forest City?",
    socialBody: "Verified company and participant feedback belongs here only after the real format has happened and publication is approved.",
    approval: "Your approval opens this space.",
    states: "Inquiry states",
    statesCount: "7 clear states",
    faq: "Common questions",
    close: "Start the conversation",
    guardrail: "Request only. No availability or commitment is created here.",
    related: "Continue exploring",
  },
  de: {
    benefits: "Was ihr bekommt",
    ways: "Zwölf Wege, wie wir Hosting einfacher und wirkungsvoller gestalten können.",
    waysCount: "12 Wege",
    evidenceCount: "Fünf Nachweisfelder",
    gate: "Nachweisgrenze",
    format: "Format",
    inquiry: "Dieses Format anfragen",
    servicesCount: "11 Leistungsrollen",
    socialTitle: "Was sagen Menschen über Forest City?",
    socialBody: "Verifiziertes Feedback von Unternehmen und Teilnehmenden erscheint hier erst nach einem real durchgeführten Format und erteilter Freigabe.",
    approval: "Erst deine Freigabe öffnet diesen Bereich.",
    states: "Anfragestatus",
    statesCount: "7 klare Status",
    faq: "Häufige Fragen",
    close: "Gespräch starten",
    guardrail: "Nur Anfrage. Hier entsteht keine Verfügbarkeit oder Zusage.",
    related: "Weiter entdecken",
  },
  es: {
    benefits: "Lo que obtienes",
    ways: "Doce maneras de hacer que organizar sea más sencillo y eficaz.",
    waysCount: "12 maneras",
    evidenceCount: "Cinco vías de prueba",
    gate: "Control de evidencia",
    format: "Formato",
    inquiry: "Consultar este formato",
    servicesCount: "11 funciones de servicio",
    socialTitle: "¿Qué dice la gente sobre Forest City?",
    socialBody: "Los comentarios verificados solo aparecen aquí después de realizarse el formato y aprobarse su publicación.",
    approval: "Tu aprobación abre este espacio.",
    states: "Estados de consulta",
    statesCount: "7 estados claros",
    faq: "Preguntas frecuentes",
    close: "Iniciar la conversación",
    guardrail: "Solo consulta. Aquí no se crea disponibilidad ni compromiso.",
    related: "Seguir explorando",
  },
  ca: {
    benefits: "Què obtens",
    ways: "Dotze maneres de fer que organitzar sigui més senzill i eficaç.",
    waysCount: "12 maneres",
    evidenceCount: "Cinc vies de prova",
    gate: "Control d’evidència",
    format: "Format",
    inquiry: "Consulta aquest format",
    servicesCount: "11 funcions de servei",
    socialTitle: "Què diu la gent sobre Forest City?",
    socialBody: "Els comentaris verificats només apareixen aquí després de realitzar-se el format i aprovar-ne la publicació.",
    approval: "La teva aprovació obre aquest espai.",
    states: "Estats de consulta",
    statesCount: "7 estats clars",
    faq: "Preguntes freqüents",
    close: "Inicia la conversa",
    guardrail: "Només consulta. Aquí no es crea disponibilitat ni compromís.",
    related: "Continua explorant",
  },
  fr: {
    benefits: "Ce que vous obtenez",
    ways: "Douze façons de rendre l’accueil plus simple et plus efficace.",
    waysCount: "12 façons",
    evidenceCount: "Cinq voies de preuve",
    gate: "Contrôle des preuves",
    format: "Format",
    inquiry: "Demander ce format",
    servicesCount: "11 rôles de service",
    socialTitle: "Que dit-on de Forest City ?",
    socialBody: "Les retours vérifiés n’apparaissent ici qu’après la réalisation du format et l’autorisation de publication.",
    approval: "Votre accord ouvre cet espace.",
    states: "États de la demande",
    statesCount: "7 états clairs",
    faq: "Questions fréquentes",
    close: "Démarrer la conversation",
    guardrail: "Demande uniquement. Aucune disponibilité ni aucun engagement n’est créé ici.",
    related: "Poursuivre l’exploration",
  },
  pt: {
    benefits: "O que recebe",
    ways: "Doze formas de tornar o acolhimento mais simples e eficaz.",
    waysCount: "12 formas",
    evidenceCount: "Cinco vias de prova",
    gate: "Controlo de evidência",
    format: "Formato",
    inquiry: "Consultar este formato",
    servicesCount: "11 funções de serviço",
    socialTitle: "O que dizem sobre Forest City?",
    socialBody: "O feedback verificado só aparece aqui depois de o formato acontecer e a publicação ser aprovada.",
    approval: "A sua aprovação abre este espaço.",
    states: "Estados do pedido",
    statesCount: "7 estados claros",
    faq: "Perguntas frequentes",
    close: "Iniciar a conversa",
    guardrail: "Apenas pedido. Aqui não é criada disponibilidade nem compromisso.",
    related: "Continuar a explorar",
  },
  it: {
    benefits: "Cosa ottenete",
    ways: "Dodici modi per rendere l’ospitalità più semplice ed efficace.",
    waysCount: "12 modi",
    evidenceCount: "Cinque percorsi di prova",
    gate: "Verifica delle prove",
    format: "Formato",
    inquiry: "Chiedi di questo formato",
    servicesCount: "11 ruoli di servizio",
    socialTitle: "Cosa dicono le persone di Forest City?",
    socialBody: "I feedback verificati compaiono qui solo dopo lo svolgimento del formato e l’approvazione della pubblicazione.",
    approval: "La tua approvazione apre questo spazio.",
    states: "Stati della richiesta",
    statesCount: "7 stati chiari",
    faq: "Domande frequenti",
    close: "Avvia la conversazione",
    guardrail: "Solo richiesta. Qui non viene creata disponibilità né alcun impegno.",
    related: "Continua a esplorare",
  },
};

function entries(value: unknown): CopyRecord[] {
  return Array.isArray(value) ? (value as CopyRecord[]) : [];
}

function readString(entry: CopyRecord, key: string): string {
  const value = entry[key];
  return typeof value === "string" ? value : "";
}

function readList(entry: CopyRecord, key: string): string[] {
  const value = entry[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function SafeMedia({
  asset,
  className = "",
  eager = false,
  sizes = "100vw",
}: {
  asset: HostCompanyMediaAsset;
  className?: string;
  eager?: boolean;
  sizes?: string;
}) {
  return (
    <figure className={`${styles.media} ${className}`} data-media-id={asset.id}>
      <Image
        src={asset.src}
        alt={asset.alt}
        fill
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager && asset.section === "hero" ? "high" : "auto"}
        sizes={sizes}
        style={{ objectPosition: asset.crop }}
      />
    </figure>
  );
}

function SectionFlag({ number, label }: { number: string; label: string }) {
  return (
    <div className={styles.sectionFlag}>
      <span>{number}</span>
      <p>{label}</p>
    </div>
  );
}

function MobileChapterSummary({
  number,
  label,
  title,
  count,
  expanded,
  onToggle,
}: {
  number: string;
  label: string;
  title: string;
  count: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.mobileChapterSummary}
      aria-expanded={expanded}
      onClick={onToggle}
    >
      <SectionFlag number={number} label={label} />
      <h2>{title}</h2>
      <span>{count}</span>
      <Plus aria-hidden="true" />
    </button>
  );
}

function ResponsiveChapter({
  number,
  label,
  title,
  count,
  children,
}: {
  number: string;
  label: string;
  title: string;
  count: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.mobileChapter} data-open={expanded ? "true" : "false"}>
      <MobileChapterSummary
        number={number}
        label={label}
        title={title}
        count={count}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
      {children}
    </div>
  );
}

function ResponsiveFormatPanel({
  format,
  inquiryHref,
  inquiryLabel,
}: {
  format: CopyRecord;
  inquiryHref: string;
  inquiryLabel: string;
}) {
  const panelRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 679px)");
    const syncPanelState = () => {
      if (panelRef.current) panelRef.current.open = !mobileQuery.matches;
    };

    syncPanelState();
    mobileQuery.addEventListener("change", syncPanelState);
    return () => mobileQuery.removeEventListener("change", syncPanelState);
  }, []);

  return (
    <details ref={panelRef} className={styles.formatPanel}>
      <summary>
        <div>
          <small>{readString(format, "duration")}</small>
          <h3>{readString(format, "title")}</h3>
        </div>
        <ArrowRight aria-hidden="true" />
      </summary>
      <div className={styles.formatDetail}>
        <p>{readString(format, "intro")}</p>
        <p>{readString(format, "fit")}</p>
        <ol>
          {readList(format, "sequence").map((step) => <li key={step}>{step}</li>)}
        </ol>
        <small>{readString(format, "boundary")}</small>
        <Link href={inquiryHref}>{inquiryLabel}<ArrowRight aria-hidden="true" /></Link>
      </div>
    </details>
  );
}

export function ClubsHostCompanyLegacyPage({ locale }: ClubsHostCompanyPageProps) {
  const copy = hostCompanyCopy[locale];
  const workflow = hostCompanyWorkflowCopy[locale];
  const ui = uiCopy[locale];
  const benefits = entries(copy.benefits);
  const proofLanes = entries(copy.proofLanes);
  const formats = entries(copy.formats);
  const program = entries(copy.program);
  const facilities = entries(copy.facilities);
  const operatorChecks = entries(copy.process);
  const faqs = entries(copy.faqs);
  const benefitEntries = benefits;
  const inquiryHref = `/${locale}/contact#host-company-inquiry`;

  return (
    <ClubsPublicShell availableLocales={hostCompanyLocales} locale={locale}>
      <main className={styles.page} id="host-company-main">
        <section className={styles.hero} aria-labelledby="host-company-title">
          <div className={styles.heroCollage} aria-label="Forest City places and company-hosting context">
            {hostCompanyHeroMedia.map((asset, index) => (
              <SafeMedia
                key={asset.id}
                asset={asset}
                className={styles[`heroTile${index + 1}`]}
                eager={index === 4 || index === 8}
                sizes={index < 4 ? "(max-width: 679px) 100vw, 34vw" : "(max-width: 679px) 1px, 22vw"}
              />
            ))}
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <h1 id="host-company-title">{copy.title}</h1>
            <p className={styles.lede}>{copy.heroBody}</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href={inquiryHref}>
                {copy.primaryCta}<ArrowRight aria-hidden="true" />
              </Link>
              <a className={styles.secondaryAction} href="#company-formats">{copy.secondaryCta}</a>
            </div>
            <p className={styles.guardrail}><LockKeyhole aria-hidden="true" />{ui.guardrail}</p>
          </div>
        </section>

        <section className={styles.benefits} aria-labelledby="benefits-title">
          <ResponsiveChapter number="01" label={ui.benefits} title={ui.ways} count={ui.waysCount}>
            <header className={styles.lightSectionHeader}>
              <SectionFlag number="01" label={ui.benefits} />
              <div>
                <h2 id="benefits-title">{ui.ways}</h2>
                <p>{copy.benefitIntro}</p>
              </div>
              <span className={styles.sectionCount}>{ui.waysCount}</span>
            </header>
            <div className={styles.benefitGrid}>
              {benefitEntries.map((item, index) => {
                const Icon = benefitIcons[index];
                return (
                  <article className={styles.benefitItem} key={`${readString(item, "title")}-${index}`}>
                    <Icon aria-hidden="true" />
                    <div>
                      <h3>{readString(item, "title")}</h3>
                      <p>{readString(item, "text")}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </ResponsiveChapter>
        </section>

        <section className={styles.proofSection} aria-labelledby="proof-title">
          <ResponsiveChapter number="02" label={copy.proofEyebrow} title={copy.proofTitle} count={ui.evidenceCount}>
            <div className={styles.proofIntro}>
              <SectionFlag number="02" label={copy.proofEyebrow} />
              <h2 id="proof-title">{copy.proofTitle}</h2>
              <p>{copy.proofBody}</p>
              <strong><LockKeyhole aria-hidden="true" />{copy.proofStatus}</strong>
            </div>
            <div className={styles.proofGrid}>
              <p className={styles.proofGridLabel}>{ui.evidenceCount}</p>
              {proofLanes.map((item, index) => {
                const Icon = proofIcons[index];
                return (
                  <article className={styles.proofCard} key={`${readString(item, "title")}-${index}`}>
                    <Icon aria-hidden="true" />
                    <h3>{readString(item, "title")}</h3>
                    <p>{readString(item, "question")}</p>
                    <details>
                      <summary>{ui.gate}<Plus aria-hidden="true" /></summary>
                      <p>{readString(item, "answer")}</p>
                      <small>{readString(item, "gate")}</small>
                    </details>
                  </article>
                );
              })}
            </div>
          </ResponsiveChapter>
        </section>

        <section className={styles.formats} id="company-formats" aria-labelledby="formats-title">
          <header className={styles.lightSectionHeader}>
            <SectionFlag number="03" label={copy.formatsEyebrow} />
            <div>
              <h2 id="formats-title">{copy.formatsTitle}</h2>
              <p>{copy.formatsBody}</p>
            </div>
            <span className={styles.sectionCount}>{formats.length}</span>
          </header>
          <div className={styles.formatStage}>
            <div className={styles.formatMediaStack} aria-hidden="true">
              {hostCompanyFormatMedia.map((asset) => (
                <SafeMedia key={asset.id} asset={asset} className={styles.formatMedia} sizes="(max-width: 679px) 1px, 44vw" />
              ))}
            </div>
            <div className={styles.formatCopyStack}>
              {formats.map((format, index) => (
                <ResponsiveFormatPanel
                  key={`${readString(format, "title")}-${index}`}
                  format={format}
                  inquiryHref={inquiryHref}
                  inquiryLabel={ui.inquiry}
                />
              ))}
            </div>
          </div>
        </section>

        <section className={styles.programSection} aria-labelledby="program-title">
          {programMedia ? (
            <SafeMedia
              asset={programMedia}
              className={styles.programMedia}
              sizes="(max-width: 679px) 100vw, 50vw"
            />
          ) : null}
          <ResponsiveChapter number="04" label={copy.programEyebrow} title={copy.programTitle} count={`${program.length}`}>
            <header className={styles.blueSectionHeader}>
              <SectionFlag number="04" label={copy.programEyebrow} />
              <div>
                <h2 id="program-title">{copy.programTitle}</h2>
                <p>{copy.programBody}</p>
              </div>
              <span className={styles.sectionCount}>{program.length}</span>
            </header>
            <div className={styles.programGrid}>
              {program.map((item, index) => {
                const Icon = programIcons[index];
                return (
                  <article className={styles.programCard} key={`${readString(item, "title")}-${index}`}>
                    <Icon className={styles.programIcon} aria-hidden="true" />
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h3>{readString(item, "title")}</h3>
                    <p>{readString(item, "text")}</p>
                  </article>
                );
              })}
            </div>
          </ResponsiveChapter>
        </section>

        <section className={styles.facilities} aria-labelledby="facilities-title">
          <ResponsiveChapter number="05" label={copy.facilitiesEyebrow} title={copy.facilitiesTitle} count={ui.servicesCount}>
            <header className={styles.lightSectionHeader}>
              <SectionFlag number="05" label={copy.facilitiesEyebrow} />
              <div>
                <h2 id="facilities-title">{copy.facilitiesTitle}</h2>
                <p>{copy.facilitiesBody}</p>
              </div>
              <span className={styles.sectionCount}>{ui.servicesCount}</span>
            </header>
            <div className={styles.facilityGrid}>
              {facilities.map((item, index) => (
                <article className={styles.facilityCard} key={`${readString(item, "title")}-${index}`}>
                  <SafeMedia asset={hostCompanyFacilityMedia[index]} className={styles.facilityMedia} sizes="(max-width: 679px) 48vw, 20vw" />
                  <div>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h3>{readString(item, "title")}</h3>
                    <p>{readString(item, "text")}</p>
                    <strong>{readString(item, "state")}</strong>
                  </div>
                </article>
              ))}
            </div>
          </ResponsiveChapter>
        </section>

        <section className={styles.socialProof} aria-labelledby="social-proof-title">
          <SafeMedia asset={hostCompanyProofMedia} className={styles.socialProofMedia} sizes="100vw" />
          <div className={styles.socialProofCopy}>
            <SectionFlag number="06" label={copy.proofEyebrow} />
            <h2 id="social-proof-title">{ui.socialTitle}</h2>
            <p>{ui.socialBody}</p>
          </div>
          <div className={styles.socialProofGate}>
            <LockKeyhole aria-hidden="true" />
            <strong>{copy.proofStatus}</strong>
            <p>{ui.approval}</p>
          </div>
        </section>

        <section className={styles.workflow} aria-labelledby="workflow-title">
          <ResponsiveChapter number="07" label={ui.states} title={copy.processTitle} count={ui.statesCount}>
            <header className={styles.workflowHeader}>
              <SectionFlag number="07" label={ui.states} />
              <div>
                <h2 id="workflow-title">{copy.processTitle}</h2>
                <p>{copy.processBody}</p>
              </div>
              <span className={styles.sectionCount}>{ui.statesCount}</span>
            </header>
            <details className={styles.operatorDisclosure}>
              <summary>{copy.processEyebrow}<Plus aria-hidden="true" /></summary>
              <div className={styles.operatorChecks}>
                {operatorChecks.map((item, index) => (
                  <article key={`${readString(item, "title")}-${index}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{readString(item, "title")}</h3>
                      <p>{readString(item, "text")}</p>
                    </div>
                  </article>
                ))}
              </div>
            </details>
            <ol className={styles.stateChain} aria-label={ui.states}>
              {workflow.map((stage, index) => (
                <li className={styles.state} key={stage.status}>
                  <span>{index + 1}</span>
                  <small>{stage.label}</small>
                  <h3>{stage.title}</h3>
                  <p>{stage.body}</p>
                </li>
              ))}
            </ol>
          </ResponsiveChapter>
        </section>

        <section className={styles.faq} aria-labelledby="faq-title">
          <ResponsiveChapter number="08" label={ui.faq} title={copy.faqTitle} count={`${faqs.length}`}>
            <div className={styles.faqHeading}>
              <SectionFlag number="08" label={ui.faq} />
              <h2 id="faq-title">{copy.faqTitle}</h2>
            </div>
            <div className={styles.faqList}>
              {faqs.map((item, index) => (
                <details key={`${readString(item, "question")}-${index}`}>
                  <summary>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {readString(item, "question")}
                    <Plus aria-hidden="true" />
                  </summary>
                  <p>{readString(item, "answer")}</p>
                </details>
              ))}
            </div>
          </ResponsiveChapter>
        </section>

        <section className={styles.closing} aria-labelledby="closing-title">
          <SafeMedia asset={hostCompanyClosingMedia} className={styles.closingMedia} sizes="100vw" />
          <div className={styles.closingCopy}>
            <SectionFlag number="09" label={ui.close} />
            <p className={styles.eyebrow}>{copy.ctaEyebrow}</p>
            <h2 id="closing-title">{copy.ctaTitle}</h2>
            <p>{copy.ctaBody}</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href={inquiryHref}>
                {copy.ctaButton}<ArrowRight aria-hidden="true" />
              </Link>
              <a className={styles.secondaryAction} href="#company-formats">{copy.secondaryCta}</a>
            </div>
            <small><LockKeyhole aria-hidden="true" />{ui.guardrail}</small>
          </div>
        </section>
      </main>
    </ClubsPublicShell>
  );
}

