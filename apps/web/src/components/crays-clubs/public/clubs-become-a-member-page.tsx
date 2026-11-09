"use client";

import Image from "next/image";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck,
  Check,
  House,
  MapPin,
} from "lucide-react";

import {
  becomeMemberCopy,
  type BecomeMemberLocale,
} from "../journeys-phase8/become-a-member-copy";
import styles from "./clubs-become-a-member-page.module.css";
import { ClubsPublicShell } from "./clubs-public-shell";

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

  return (
    <ClubsPublicShell locale={locale} headerTone="navy" availableLocales={["en","de","es","ca","fr","pt","it"]}>
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
                <a className={styles.primaryButton} href={`/${locale}/ambassadors`}>{ui.applyAmbassador}<ArrowRight aria-hidden="true" size={18} /></a>
                <a className={styles.secondaryButton} href={`/${locale}/apply-directly`}>{ui.applyDirect}<ArrowRight aria-hidden="true" size={18} /></a>
              </div>
            </div>
          </div>
        </section>
        <ul className={styles.signalRail} aria-label={ui.membershipSignals}>
          {copy.hero.signals.map((signal) => <li key={signal}>{signal}</li>)}
        </ul>

        <section className={`${styles.section} ${styles.idea}`} aria-labelledby="membership-idea-title">
          <div className={styles.ideaMedia} aria-label={ui.flexibleMoments}>
            {[media.heroTiles[1]].map((src, index) => (
              <EditorialImage alt={ui.flexibleMomentAlt} className={index === 0 ? styles.ideaMain : styles.ideaSmall} key={src} sizes="(max-width: 760px) 100vw, 44vw" src={src} />
            ))}
          </div>
          <div className={styles.ideaCopy}>
            <p className={styles.kicker}>{copy.idea.title}</p>
            <h2 id="membership-idea-title">{copy.idea.lead}</h2>
            <div className={styles.proseColumns}>
              {copy.idea.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.access}`} aria-labelledby="access-map-title">
          <div className={styles.centerHeading}>
            <p className={styles.kicker}>{copy.access.title}</p>
            <h2 id="access-map-title">{copy.access.lead}</h2>
          </div>
          <div className={styles.accessGrid}>
            {copy.access.items.map((item, index) => (
              <article className={styles.accessCard} key={item.title}>
                <EditorialImage
                  alt={ui.accessMomentAlt}
                  className={styles.accessImage}
                  sizes="(max-width: 760px) 29vw, 20vw"
                  src={index === 0 ? media.heroTiles[0] : media.access[index] ?? media.access[0]}
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
          <div className={styles.livingInner}>
            <EditorialImage alt={ui.workReadyAlt} className={styles.livingPhoto} sizes="(max-width: 760px) 100vw, 48vw" src={media.living} />
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

        <div className={styles.memberMoments} aria-label={ui.heroCollage}>
          {[...media.idea, media.heroTiles[2]].map((src) => (
            <EditorialImage alt={ui.heroMomentAlt} className={styles.momentPhoto} key={src} sizes="(max-width: 760px) 100vw, 50vw" src={src} />
          ))}
        </div>

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
            <a className={styles.creatorButton} href={`/${locale}/ambassadors`}>{ui.applyAmbassador}<ArrowRight aria-hidden="true" size={18} /></a>
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
            <a className={styles.primaryButton} href={`/${locale}/ambassadors`}>{ui.applyAmbassador}<ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} /></a>
          </div>
        </section>
      </main>
    </ClubsPublicShell>
  );
}





