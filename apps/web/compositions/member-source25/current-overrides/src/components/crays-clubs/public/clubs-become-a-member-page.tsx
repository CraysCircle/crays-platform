"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck,
  Check,
  House,
  MapPin,
  Menu,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  becomeMemberCopy,
  type BecomeMemberLocale,
} from "../journeys-phase8/become-a-member-copy";
import styles from "./clubs-become-a-member-page.module.css";
import homepageStyles from "./clubs-public-homepage.module.css";
import tokens from "./clubs-public-design-tokens.module.css";
import {
  getClubsPublicShellCopy,
  getClubsPublicShellLinkLabels,
} from "./clubs-public-shell";

type Props = { locale: BecomeMemberLocale };

const seoRoot = "/__crays-clubs/assets/crays-seo";
const clubRoot = "/__crays-clubs/assets/crays-club";
const becomeAssetRoot = "/__crays-clubs/assets/become-a-member";

const media = {
  hero: `${clubRoot}/nightlife.webp`,
  heroTiles: [
    `${seoRoot}/become-a-member-crays-lifestyle-event-and-community-moment-03.jpg`,
    `${seoRoot}/become-a-member-crays-lifestyle-event-and-community-moment-08.jpg`,
    `${seoRoot}/become-a-member-crays-real-estate-and-hospitality-setting-02.jpg`,
    `${seoRoot}/become-a-member-crays-lifestyle-event-and-community-moment-11.jpg`,
  ],
  idea: [
    `${seoRoot}/become-a-member-crays-lifestyle-event-and-community-moment-05.jpg`,
    `${seoRoot}/become-a-member-crays-lifestyle-event-and-community-moment-06.jpg`,
    `${seoRoot}/become-a-member-crays-lifestyle-event-and-community-moment-07.jpg`,
  ],
  access: [
    `${seoRoot}/become-a-member-crays-lifestyle-event-and-community-moment-08.jpg`,
    `${seoRoot}/become-a-member-crays-lifestyle-event-and-community-moment-09.jpg`,
    `${seoRoot}/become-a-member-crays-lifestyle-event-and-community-moment-10.jpg`,
    `${seoRoot}/become-a-member-crays-lifestyle-event-and-community-moment-11.jpg`,
  ],
  living: `${clubRoot}/work-hero.jpg`,
  company: `${becomeAssetRoot}/become-company-deck-team.png`,
  responsible: [
    `${becomeAssetRoot}/become-responsible-island.png`,
    `${becomeAssetRoot}/become-responsible-palm.png`,
  ],
  creators: `${becomeAssetRoot}/become-creators-crowd.png`,
  closing: `${clubRoot}/event-arrival.webp`,
} as const;

const livingIcons = [BriefcaseBusiness, House, MapPin, CalendarCheck] as const;

const SOCIAL_LINKS = [
  { label: "GitHub", href: "https://github.com/CraysCircle", icon: "/__crays-clubs/assets/footer-icons/github.svg" },
  { label: "X", href: "https://x.com/CraysCircle", icon: "/__crays-clubs/assets/footer-icons/x.svg" },
  { label: "Open Collective", href: "https://opencollective.com/crays", icon: "/__crays-clubs/assets/footer-icons/opencollective.svg" },
  { label: "Reddit", href: "https://www.reddit.com/r/Crays/", icon: "/__crays-clubs/assets/footer-icons/reddit.svg" },
  { label: "Telegram", href: "https://t.me/craysclub", icon: "/__crays-clubs/assets/footer-icons/telegram.svg" },
  { label: "TikTok", href: "https://www.tiktok.com/@thorbenbiesenbac1", icon: "/__crays-clubs/assets/footer-icons/tiktok.svg" },
  { label: "YouTube", href: "https://www.youtube.com/@CraysCircle", icon: "/__crays-clubs/assets/footer-icons/youtube.svg" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/crays/", icon: "/__crays-clubs/assets/footer-icons/linkedin.svg" },
  { label: "Instagram", href: "https://www.instagram.com/crays_circle/", icon: "/__crays-clubs/assets/footer-icons/instagram.svg" },
  { label: "Nostr / Crays Network", href: "https://www.crays.net", icon: "/__crays-clubs/assets/footer-icons/nostr.webp" },
  { label: "Discord", href: "https://discord.gg/dpYZk8xAvR", icon: "/__crays-clubs/assets/footer-icons/discord.svg" },
] as const;

const shellLocales = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;

const pageUi: Record<BecomeMemberLocale, {
  accessMomentAlt: string;
  applyAmbassador: string;
  applyDirect: string;
  closingAlt: string;
  companyAlt: string;
  creatorAlt: string;
  flexibleMomentAlt: string;
  flexibleMoments: string;
  heroAlt: string;
  heroCollage: string;
  heroMomentAlt: string;
  layerSignals: string;
  membershipSignals: string;
  responsibleCoastAlt: string;
  responsiblePlaces: string;
  sunsetAlt: string;
  workReadyAlt: string;
}> = {
  en: { accessMomentAlt: "Crays lifestyle event and community moment", applyAmbassador: "Apply through an Ambassador", applyDirect: "Apply directly", closingAlt: "Crays members arriving at an event", companyAlt: "Crays team community on the water", creatorAlt: "Crays creator event and community", flexibleMomentAlt: "Flexible Crays living moment", flexibleMoments: "Flexible Crays living moments", heroAlt: "Crays nightlife and club community", heroCollage: "Crays membership moments", heroMomentAlt: "Crays lifestyle and community moment", layerSignals: "Membership layer signals", membershipSignals: "Membership signals", responsibleCoastAlt: "Responsible Crays coastal destination", responsiblePlaces: "Responsible Crays places", sunsetAlt: "Crays tropical sunset", workReadyAlt: "Crays work-ready club" },
  de: { accessMomentAlt: "Crays Lifestyle-, Event- und Community-Moment", applyAmbassador: "Über einen Ambassador bewerben", applyDirect: "Direkt bewerben", closingAlt: "Crays Mitglieder kommen zu einer Veranstaltung", companyAlt: "Crays Team-Community am Wasser", creatorAlt: "Crays Creator-Event und Community", flexibleMomentAlt: "Flexibler Crays Wohnmoment", flexibleMoments: "Flexible Crays Wohnmomente", heroAlt: "Crays Nachtleben und Club-Community", heroCollage: "Momente der Crays Mitgliedschaft", heroMomentAlt: "Crays Lifestyle- und Community-Moment", layerSignals: "Merkmale der Mitgliedschaftsmodelle", membershipSignals: "Merkmale der Mitgliedschaft", responsibleCoastAlt: "Verantwortungsbewusstes Crays Reiseziel an der Küste", responsiblePlaces: "Verantwortungsbewusste Crays Orte", sunsetAlt: "Tropischer Sonnenuntergang bei Crays", workReadyAlt: "Arbeitsbereiter Crays Club" },
  es: { accessMomentAlt: "Momento de estilo de vida, evento y comunidad de Crays", applyAmbassador: "Solicitar mediante un embajador", applyDirect: "Solicitar directamente", closingAlt: "Miembros de Crays llegando a un evento", companyAlt: "Comunidad de equipos de Crays junto al agua", creatorAlt: "Evento de creadores y comunidad de Crays", flexibleMomentAlt: "Momento de vida flexible en Crays", flexibleMoments: "Momentos de vida flexible en Crays", heroAlt: "Vida nocturna y comunidad del club Crays", heroCollage: "Momentos de la membresía Crays", heroMomentAlt: "Momento de estilo de vida y comunidad de Crays", layerSignals: "Características de los niveles de membresía", membershipSignals: "Características de la membresía", responsibleCoastAlt: "Destino costero responsable de Crays", responsiblePlaces: "Lugares responsables de Crays", sunsetAlt: "Atardecer tropical en Crays", workReadyAlt: "Club Crays preparado para trabajar" },
  ca: { accessMomentAlt: "Moment d'estil de vida, esdeveniment i comunitat de Crays", applyAmbassador: "Sol·licita-ho mitjançant un ambaixador", applyDirect: "Sol·licita-ho directament", closingAlt: "Membres de Crays arribant a un esdeveniment", companyAlt: "Comunitat d'equips de Crays al costat de l'aigua", creatorAlt: "Esdeveniment de creadors i comunitat de Crays", flexibleMomentAlt: "Moment de vida flexible a Crays", flexibleMoments: "Moments de vida flexible a Crays", heroAlt: "Vida nocturna i comunitat del club Crays", heroCollage: "Moments de la subscripció Crays", heroMomentAlt: "Moment d'estil de vida i comunitat de Crays", layerSignals: "Característiques dels nivells de subscripció", membershipSignals: "Característiques de la subscripció", responsibleCoastAlt: "Destinació costanera responsable de Crays", responsiblePlaces: "Espais responsables de Crays", sunsetAlt: "Capvespre tropical a Crays", workReadyAlt: "Club Crays preparat per treballar" },
  fr: { accessMomentAlt: "Moment de vie, d'événement et de communauté Crays", applyAmbassador: "Postuler via un ambassadeur", applyDirect: "Postuler directement", closingAlt: "Des membres Crays arrivent à un événement", companyAlt: "Communauté d'équipe Crays au bord de l'eau", creatorAlt: "Événement de créateurs et communauté Crays", flexibleMomentAlt: "Moment de vie flexible chez Crays", flexibleMoments: "Moments de vie flexible chez Crays", heroAlt: "Vie nocturne et communauté du club Crays", heroCollage: "Moments liés à l'adhésion Crays", heroMomentAlt: "Moment de vie et de communauté Crays", layerSignals: "Caractéristiques des niveaux d'adhésion", membershipSignals: "Caractéristiques de l'adhésion", responsibleCoastAlt: "Destination côtière responsable de Crays", responsiblePlaces: "Lieux responsables de Crays", sunsetAlt: "Coucher de soleil tropical chez Crays", workReadyAlt: "Club Crays prêt pour le travail" },
  pt: { accessMomentAlt: "Momento de estilo de vida, evento e comunidade Crays", applyAmbassador: "Candidatar-se através de um embaixador", applyDirect: "Candidatar-se diretamente", closingAlt: "Membros Crays a chegar a um evento", companyAlt: "Comunidade de equipas Crays junto à água", creatorAlt: "Evento de criadores e comunidade Crays", flexibleMomentAlt: "Momento de vida flexível na Crays", flexibleMoments: "Momentos de vida flexível na Crays", heroAlt: "Vida noturna e comunidade do clube Crays", heroCollage: "Momentos da adesão Crays", heroMomentAlt: "Momento de estilo de vida e comunidade Crays", layerSignals: "Características dos níveis de adesão", membershipSignals: "Características da adesão", responsibleCoastAlt: "Destino costeiro responsável da Crays", responsiblePlaces: "Espaços responsáveis da Crays", sunsetAlt: "Pôr do sol tropical na Crays", workReadyAlt: "Clube Crays preparado para trabalhar" },
  it: { accessMomentAlt: "Momento di lifestyle, evento e community Crays", applyAmbassador: "Candidati tramite un ambassador", applyDirect: "Candidati direttamente", closingAlt: "Membri Crays in arrivo a un evento", companyAlt: "Community di team Crays sull'acqua", creatorAlt: "Evento per creator e community Crays", flexibleMomentAlt: "Momento di vita flessibile in Crays", flexibleMoments: "Momenti di vita flessibile in Crays", heroAlt: "Vita notturna e community del club Crays", heroCollage: "Momenti dell'adesione Crays", heroMomentAlt: "Momento di lifestyle e community Crays", layerSignals: "Caratteristiche dei livelli di adesione", membershipSignals: "Caratteristiche dell'adesione", responsibleCoastAlt: "Destinazione costiera responsabile di Crays", responsiblePlaces: "Luoghi responsabili di Crays", sunsetAlt: "Tramonto tropicale in Crays", workReadyAlt: "Club Crays pronto per il lavoro" },
};

function HomepageHeader({ locale }: { locale: BecomeMemberLocale }) {
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
  const mainMenuDetailsRef = useRef<HTMLDetailsElement>(null);
  const mainMenuPanelRef = useRef<HTMLDivElement>(null);
  const mainMenuSummaryRef = useRef<HTMLElement>(null);
  const root = `/${locale}`;
  const siteCopy = getClubsPublicShellCopy(locale);
  const labels = getClubsPublicShellLinkLabels(locale);
  const applyHref = `${root}/become-a-member`;
  const ambassadorHref = `${root}/ambassadors`;
  const marinaInterimHref = `${root}/discover#stay`;
  const golfInterimHref = `${root}/discover#stay`;
  const brandAsAServiceSourceHref = `${root}/brand-as-a-service`;
  const mainMenuId = `clubs-home-${locale}-menu`;

  useEffect(() => {
    if (!isMainMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const menuSummary = mainMenuSummaryRef.current;
    const firstMenuLink = mainMenuPanelRef.current?.querySelector<HTMLElement>("a[href]");
    const focusFrame = window.requestAnimationFrame(() => firstMenuLink?.focus());
    const closeMenu = (event: PointerEvent) => {
      if (!mainMenuDetailsRef.current?.contains(event.target as Node)) setIsMainMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMainMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
      if (document.contains(menuSummary)) menuSummary?.focus();
    };
  }, [isMainMenuOpen]);

  return (
    <header className={homepageStyles.header}>
      <Link href={root} className={homepageStyles.logoLink} aria-label={siteCopy.home}>
        <img src="/brand/crays-logo-dark.svg" alt="CRAYS" className={`${homepageStyles.logo} ${homepageStyles.logoLight}`} />
        <img src="/brand/crays-logo-owner.svg" alt="" aria-hidden="true" className={`${homepageStyles.logo} ${homepageStyles.logoOwner}`} />
      </Link>

      <div className={homepageStyles.headerActions}>
        <Link className={homepageStyles.loginHeader} href={`${root}/account`}>{siteCopy.login}</Link>
        <a className={homepageStyles.associationHeader} href="https://www.crays.org/" target="_blank" rel="noopener noreferrer">
          {siteCopy.associationHeader}
        </a>
        <details className={`${homepageStyles.headerDetail} ${homepageStyles.mainMenuDetail}`} open={isMainMenuOpen} ref={mainMenuDetailsRef}>
          <summary
            aria-controls={mainMenuId}
            aria-expanded={isMainMenuOpen}
            onClick={(event) => {
              event.preventDefault();
              setIsMainMenuOpen((open) => !open);
            }}
            ref={mainMenuSummaryRef}
          >
            <span>{siteCopy.menu}</span><Menu size={28} strokeWidth={1} />
          </summary>
          <div
            aria-label={siteCopy.primaryNav}
            aria-modal="true"
            className={homepageStyles.menuPanel}
            id={mainMenuId}
            onClickCapture={(event) => {
              const target = event.target;
              if (target instanceof Element && target.closest("a[href]")) setIsMainMenuOpen(false);
            }}
            ref={mainMenuPanelRef}
            role="dialog"
          >
            <div className={homepageStyles.menuBrandRail}>
              <img src="/brand/crays-logo-owner.svg" alt="" aria-hidden="true" />
              <div className={homepageStyles.menuApplyCard}>
                <p className={homepageStyles.menuKicker}>{siteCopy.privateMembersClub}</p>
                <h2>{siteCopy.applyTitle}</h2>
                <p>{siteCopy.applyLead}</p>
                <Link href={applyHref} className={homepageStyles.menuApplyLink}>{siteCopy.applyDirect} <ArrowRight size={18} /></Link>
                <Link href={ambassadorHref} className={homepageStyles.menuAmbassadorLink}>{siteCopy.applyAmbassador}</Link>
                <ol className={homepageStyles.menuApplySteps}>
                  {siteCopy.applicationSteps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span>{step}</li>)}
                </ol>
              </div>
            </div>

            <nav className={homepageStyles.menuNavigation} aria-label={siteCopy.primaryNav}>
              <p className={homepageStyles.menuTitle}>{siteCopy.menuTitle}</p>
              <div className={homepageStyles.menuGroups}>
                <section className={homepageStyles.menuGroup}>
                  <p>{siteCopy.explore}</p>
                  <Link href={`${root}/discover`}>{labels.forestCity}</Link>
                  <Link href={`${root}/community-life`}>{labels.communityLife}</Link>
                  <Link href={`${root}/lifestyle`}>{labels.lifestyle}</Link>
                  <Link href={`${root}/hospitality`}>{labels.hospitality}</Link>
                  <Link href={marinaInterimHref}>{labels.marinaHotel}</Link>
                  <Link href={golfInterimHref}>{labels.golfHotel}</Link>
                  <Link href={`${root}/families`}>{labels.families}</Link>
                  <Link href={`${root}/teams`}>{labels.teams}</Link>
                  <Link href={`${root}/experiences`}>{labels.events}</Link>
                </section>

                <section className={homepageStyles.menuGroup}>
                  <p>{siteCopy.buildLearn}</p>
                  <Link href={`${root}/school-jobs`}>{labels.learnForLife}</Link>
                  <Link href={`${root}/host-company`}>{labels.hostCompany}</Link>
                  
                  
                  <Link href={brandAsAServiceSourceHref}>{labels.brandService}</Link>
                </section>

                <section className={homepageStyles.menuGroup}>
                  <p>{siteCopy.connect}</p>
                  <Link href={`${root}/about-us`}>{labels.about}</Link>
                  <Link href={ambassadorHref}>{labels.ambassadors}</Link>
                  <Link href={`${root}/contact`}>{labels.contact}</Link>
                  <a href="https://www.crays.org/" target="_blank" rel="noopener noreferrer">{labels.association}</a>
                  <Link href={`${root}/legal/privacy-policy`}>{siteCopy.privacy}</Link>
                  <Link href={`${root}/legal/terms-and-conditions`}>{siteCopy.terms}</Link>
                  <Link href={`${root}/legal/data-protection`}>{siteCopy.dataProtectionMenu}</Link>
                  <Link href={`${root}/legal/imprint`}>{siteCopy.imprint}</Link>
                </section>
              </div>

              <div className={homepageStyles.menuLanguages} aria-label={siteCopy.languages}>
                <span>{siteCopy.languages}</span>
                {shellLocales.map((code) => (
                  <Link href={`/${code}/become-a-member`} key={code} aria-current={code === locale ? "page" : undefined}>{code.toUpperCase()}</Link>
                ))}
              </div>
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}

function HomepageFooter({ locale }: { locale: BecomeMemberLocale }) {
  const root = `/${locale}`;
  const siteCopy = getClubsPublicShellCopy(locale);
  const labels = getClubsPublicShellLinkLabels(locale);
  const applyHref = `${root}/become-a-member`;
  const ambassadorHref = `${root}/ambassadors`;
  const brandAsAServiceSourceHref = `${root}/brand-as-a-service`;

  return (
    <footer className={homepageStyles.footer} id="site-footer">
      <section className={homepageStyles.footerCta}>
        <p>{siteCopy.footerEyebrow}</p>
        <h2>{siteCopy.footerHeadline}</h2>
        <Link href={applyHref} className={homepageStyles.primaryButton}>{siteCopy.footerCta} <ArrowRight size={19} /></Link>
      </section>
      <div className={homepageStyles.footerMain}>
        <div className={homepageStyles.footerBrand}>
          <img src="/brand/crays-logo-dark.svg" alt="CRAYS" />
          <p>{siteCopy.footerBrand}</p>
        </div>
        <div className={homepageStyles.footerColumn}><strong>{siteCopy.footerGroups[0]}</strong><Link href={`${root}/about-us`}>{labels.about}</Link><Link href="/en/experiences">Experiences</Link><Link href={`${root}/lifestyle`}>{labels.lifestyle}</Link><Link href={`${root}/community-life`}>{labels.communityLife}</Link></div>
        <div className={homepageStyles.footerColumn}><strong>{siteCopy.footerGroups[1]}</strong><Link href={`${root}/become-a-member`}>{siteCopy.footerCta}</Link><Link href={ambassadorHref}>{labels.ambassadors}</Link><Link href={`${root}/families`}>{labels.families}</Link><Link href={`${root}/teams`}>{labels.teams}</Link></div>
        <div className={homepageStyles.footerColumn}><strong>{siteCopy.footerGroups[2]}</strong><Link href={`${root}/hospitality`}>{labels.hospitality}</Link><Link href={`${root}/school-jobs`}>{labels.learnForLife}</Link><Link href={`${root}/host-company`}>{labels.hostCompany}</Link><Link href={`${root}/brand-as-a-service`}>{labels.brandService}</Link></div>
        <div className={homepageStyles.footerColumn}><strong>{siteCopy.footerGroups[3]}</strong><Link href={`${root}/contact`}>{labels.contact}</Link><Link href={`${root}/legal`}>{labels.legal}</Link><a href="https://www.crays.org/" target="_blank" rel="noopener noreferrer">{labels.association}</a><a href="https://www.crays.pro/">{labels.franchise}</a></div>
      </div>
      <div className={homepageStyles.associationLine}><a href="https://www.crays.org/" target="_blank" rel="noopener noreferrer">{siteCopy.associationName}</a><span>{siteCopy.associationLayer}</span></div>
      <div className={homepageStyles.legalLine}>
        <span>{siteCopy.rights}</span>
        <nav className={homepageStyles.socialLinks} aria-label="CRAYS social media">
          {SOCIAL_LINKS.map((social) => (
            <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label}>
              <img src={social.icon} alt="" width="24" height="24" loading="lazy" decoding="async" data-crays-photo-treatment="none" />
            </a>
          ))}
        </nav>
        <div className={homepageStyles.legalLinks}><Link href={`${root}/legal/privacy-policy`}>{siteCopy.privacy}</Link><Link href={`${root}/legal/terms-and-conditions`}>{siteCopy.terms}</Link><Link href={`${root}/legal/data-protection`}>{siteCopy.dataProtection}</Link><Link href={`${root}/legal/imprint`}>{siteCopy.imprint}</Link></div>
      </div>
    </footer>
  );
}

function EditorialImage({
  alt,
  className,
  priority = false,
  sizes,
  src,
}: {
  alt: string;
  className: string;
  priority?: boolean;
  sizes: string;
  src: string;
}) {
  return (
    <div className={className}>
      <Image alt={alt} fill priority={priority} sizes={sizes} src={src} />
    </div>
  );
}

export function ClubsBecomeAMemberPage({ locale }: Props) {
  const copy = becomeMemberCopy[locale];
  const ui = pageUi[locale];
  const membershipApplicationHref = "/en/apply-directly?returnTo=%2Fen%2Faccount%3Fview%3Dmembership";
  const heroTileClasses = [styles.heroTile1, styles.heroTile2, styles.heroTile3, styles.heroTile4];
  const ideaImageClasses = [styles.ideaImage1, styles.ideaImage2, styles.ideaImage3];

  return (
    <div className={`${tokens.theme} ${homepageStyles.page}`}>
      <div
        className={homepageStyles.hero}
        style={{ background: "transparent", inset: "0 0 auto", minHeight: 67, overflow: "visible", pointerEvents: "none", position: "absolute", width: "100%", zIndex: 30 }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <HomepageHeader locale={locale} />
        </div>
      </div>
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="member-hero-title">
          <Image alt={ui.heroAlt} className={styles.backdrop} fill priority sizes="100vw" src={media.hero} />
          <div className={styles.heroWash} />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.kickerLight}>{copy.pageLabel}</p>
              <h1 id="member-hero-title">{copy.hero.title}</h1>
              <p className={styles.heroLead}>{copy.hero.body}</p>
              <div className={styles.heroActions}>
                <a className={styles.primaryButton} href={`/${locale}/ambassadors`}>{ui.applyAmbassador}</a>
                <a className={styles.secondaryButton} href="/en/apply-directly">{ui.applyDirect}</a>
              </div>
              <ul className={styles.signalRail} aria-label={ui.membershipSignals}>
                {copy.hero.signals.map((signal) => <li key={signal}>{signal}</li>)}
              </ul>
            </div>
            <div className={styles.heroCollage} aria-label={ui.heroCollage}>
              {media.heroTiles.map((src, index) => (
                <EditorialImage
                  alt={ui.heroMomentAlt}
                  className={heroTileClasses[index] ?? styles.heroTile1}
                  key={src}
                  priority
                  sizes="(max-width: 760px) 33vw, 15vw"
                  src={src}
                />
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.idea}`} aria-labelledby="membership-idea-title">
          <div className={styles.ideaCopy}>
            <p className={styles.kicker}>{copy.idea.title}</p>
            <h2 id="membership-idea-title">{copy.idea.lead}</h2>
          </div>
          <div className={styles.proseColumns}>
            {copy.idea.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <div className={styles.ideaCollage} aria-label={ui.flexibleMoments}>
            {media.idea.map((src, index) => (
              <EditorialImage
                alt={ui.flexibleMomentAlt}
                className={ideaImageClasses[index] ?? styles.ideaImage1}
                key={src}
                sizes="(max-width: 760px) 30vw, 13vw"
                src={src}
              />
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.access}`} aria-labelledby="access-map-title">
          <div className={styles.centerHeading}>
            <p className={styles.kickerLight}>{copy.access.title}</p>
            <h2 id="access-map-title">{copy.access.lead}</h2>
          </div>
          <div className={styles.accessGrid}>
            {copy.access.items.map((item, index) => (
              <article className={styles.accessCard} key={item.title}>
                <EditorialImage
                  alt={ui.accessMomentAlt}
                  className={styles.accessImage}
                  sizes="(max-width: 760px) 29vw, 20vw"
                  src={media.access[index] ?? media.access[0]}
                />
                <div className={styles.accessCardCopy}>
                  <span>{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.living}`} aria-labelledby="living-system-title">
          <Image alt={ui.workReadyAlt} className={styles.backdrop} fill sizes="100vw" src={media.living} />
          <div className={styles.livingWash} />
          <div className={styles.livingInner}>
            <div className={styles.livingCopy}>
              <p className={styles.kickerLight}>{copy.living.title}</p>
              <h2 id="living-system-title">{copy.living.lead}</h2>
              <p>{copy.living.body}</p>
            </div>
            <div className={styles.livingList}>
              {copy.living.items.map((item, index) => {
                const Icon = livingIcons[index] ?? MapPin;
                return (
                  <article key={item.title}>
                    <Icon aria-hidden="true" size={26} strokeWidth={1.7} />
                    <div>
                      <p>{item.label}</p>
                      <h3>{item.title}</h3>
                      <div>{item.body}</div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.companies}`} aria-labelledby="companies-title">
          <div className={styles.companiesCopy}>
            <p className={styles.kicker}>{copy.companies.title}</p>
            <h2 id="companies-title">{copy.companies.lead}</h2>
            <p className={styles.sectionLead}>{copy.companies.body}</p>
            <div className={styles.companyGrid}>
              {copy.companies.items.map((item) => (
                <article key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
          <div className={styles.companyMedia}>
            <EditorialImage alt={ui.companyAlt} className={styles.companyImage} sizes="(max-width: 760px) 100vw, 35vw" src={media.company} />
            <p>{copy.companies.close}</p>
          </div>
        </section>

        <section className={`${styles.section} ${styles.responsible}`} aria-labelledby="responsible-title">
          <div className={styles.responsibleMedia} aria-label={ui.responsiblePlaces}>
            <EditorialImage alt={ui.responsibleCoastAlt} className={styles.responsibleImage1} sizes="(max-width: 760px) 43vw, 20vw" src={media.responsible[0]} />
            <EditorialImage alt={ui.sunsetAlt} className={styles.responsibleImage2} sizes="(max-width: 760px) 43vw, 20vw" src={media.responsible[1]} />
          </div>
          <div className={styles.responsibleCopy}>
            <p className={styles.kicker}>{copy.responsible.title}</p>
            <h2 id="responsible-title">{copy.responsible.lead}</h2>
            <p className={styles.sectionLead}>{copy.responsible.body}</p>
            <ol className={styles.responsibleList}>
              {copy.responsible.points.map((point) => (
                <li key={point}><Check aria-hidden="true" size={17} strokeWidth={2} /><p>{point}</p></li>
              ))}
            </ol>
          </div>
        </section>

        <section className={`${styles.section} ${styles.creators}`} aria-labelledby="creators-title">
          <Image alt={ui.creatorAlt} className={styles.backdrop} fill sizes="100vw" src={media.creators} />
          <div className={styles.creatorsWash} />
          <div className={styles.creatorsContent}>
            <p className={styles.kickerLight}>{copy.creators.title}</p>
            <h2 id="creators-title">{copy.creators.lead}</h2>
            <p className={styles.creatorLead}>{copy.creators.body}</p>
            <div className={styles.creatorGrid}>
              {copy.creators.items.map((item) => (
                <article key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
              <article className={styles.creatorClose}><h3>{copy.creators.close}</h3></article>
            </div>
            <a className={styles.creatorButton} href={membershipApplicationHref}>{copy.hero.primary}</a>
          </div>
        </section>

        <section className={`${styles.section} ${styles.layers}`} id="membership-layers" aria-labelledby="layers-title">
          <div className={styles.layersHeading}>
            <p className={styles.kicker}>{copy.layers.title}</p>
            <h2 id="layers-title">{copy.layers.lead}</h2>
            <p>{copy.layers.body}</p>
          </div>
          <div className={styles.layerGrid}>
            {copy.layers.items.map((item, index) => (
              <article className={`${styles.layerCard} ${index === 1 ? styles.layerCardFeatured : ""}`} key={item.title}>
                <p>{item.title}</p>
                <strong>{item.price}</strong>
                <span>{item.body}</span>
              </article>
            ))}
          </div>
          <p className={styles.layerNote}>{copy.layers.close}</p>
          <ul className={styles.layerSignals} aria-label={ui.layerSignals}>
            {copy.layers.signals.map((signal) => <li key={signal}>{signal}</li>)}
          </ul>
        </section>

        <section className={styles.closing} aria-labelledby="closing-title">
          <Image alt={ui.closingAlt} className={styles.backdrop} fill sizes="100vw" src={media.closing} />
          <div className={styles.closingWash} />
          <div className={styles.closingCopy}>
            <p className={styles.kickerLight}>{copy.closing.title}</p>
            <h2 id="closing-title">{copy.closing.lead}</h2>
            <p>{copy.closing.body}</p>
            <a className={styles.primaryButton} href={membershipApplicationHref}>{copy.closing.action}<ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} /></a>
          </div>
        </section>
      </main>
      <HomepageFooter locale={locale} />
    </div>
  );
}
